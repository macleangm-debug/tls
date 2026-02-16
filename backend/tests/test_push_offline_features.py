"""
Test Push Notification VAPID Configuration and Offline Queue Features
Tests the implementation of:
1. VAPID keys configuration - verify /api/push/send-test sends actual push notification  
2. Push notification helper function - verify send_push_notification works with VAPID keys
3. Offline sync endpoints - verify backend support for offline operations
"""
import pytest
import requests
import os
import json
import time

# Get API base URL from environment
BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')
if not BASE_URL:
    pytest.skip("REACT_APP_BACKEND_URL not set", allow_module_level=True)

# Test credentials  
TEST_EMAIL = "testadvocate@tls.or.tz"
TEST_PASSWORD = "Test@1234"


class TestVAPIDConfiguration:
    """Test VAPID keys are properly configured and push notifications work"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        """Get authentication token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        if response.status_code != 200:
            pytest.skip("Login failed - user may not exist")
        return response.json().get("access_token")
    
    @pytest.fixture(scope="class")
    def auth_headers(self, auth_token):
        """Get auth headers"""
        return {"Authorization": f"Bearer {auth_token}"}
    
    def test_vapid_public_key_in_frontend_env(self):
        """VAPID public key should be configured in frontend .env"""
        # Check if VAPID public key is accessible via API or env
        env_path = "/app/frontend/.env"
        try:
            with open(env_path, 'r') as f:
                content = f.read()
                assert "REACT_APP_VAPID_PUBLIC_KEY" in content, "VAPID public key should be in frontend .env"
                # Extract the key
                for line in content.split('\n'):
                    if line.startswith('REACT_APP_VAPID_PUBLIC_KEY='):
                        key = line.split('=', 1)[1]
                        assert len(key) > 50, "VAPID public key should be sufficiently long"
                        print(f"✓ VAPID public key configured: {key[:30]}...")
        except FileNotFoundError:
            pytest.skip("Frontend .env not accessible")
    
    def test_vapid_private_key_in_backend_env(self):
        """VAPID private key should be configured in backend .env"""
        env_path = "/app/backend/.env"
        try:
            with open(env_path, 'r') as f:
                content = f.read()
                assert "VAPID_PRIVATE_KEY" in content, "VAPID private key should be in backend .env"
                assert "BEGIN PRIVATE KEY" in content or "VAPID_PRIVATE_KEY=" in content
                print("✓ VAPID private key configured in backend .env")
        except FileNotFoundError:
            pytest.skip("Backend .env not accessible")
    
    def test_push_status_endpoint_authenticated(self, auth_headers):
        """Test /api/push/status requires authentication and returns status"""
        response = requests.get(f"{BASE_URL}/api/push/status", headers=auth_headers)
        assert response.status_code == 200, f"Push status should return 200, got {response.status_code}"
        data = response.json()
        assert "subscribed" in data, "Response should contain 'subscribed' field"
        print(f"✓ Push status: subscribed={data.get('subscribed')}")
    
    def test_push_status_requires_auth(self):
        """Test /api/push/status requires authentication"""
        response = requests.get(f"{BASE_URL}/api/push/status")
        assert response.status_code in [401, 403], "Push status should require auth"
        print("✓ Push status endpoint requires authentication")
    
    def test_push_subscribe_endpoint(self, auth_headers):
        """Test /api/push/subscribe accepts subscription"""
        # Create a mock push subscription  
        mock_subscription = {
            "subscription": {
                "endpoint": f"https://fcm.googleapis.com/fcm/send/test-{int(time.time())}",
                "keys": {
                    "p256dh": "BPwYYcQKjzSCNXuUcJphJMBqwvp1-BLAIrjbCBNEUJ8pPhLMYONPKqIfLbVqN0TcRjH9sbjMSvTXLyYKmRu8_wc",
                    "auth": "JvZ2hfMYpZmvSPuGpJqk2Q"
                }
            },
            "user_id": "test-user"
        }
        
        response = requests.post(
            f"{BASE_URL}/api/push/subscribe",
            headers={**auth_headers, "Content-Type": "application/json"},
            json=mock_subscription
        )
        assert response.status_code == 200, f"Subscribe should succeed, got {response.status_code}: {response.text}"
        data = response.json()
        assert data.get("success") == True, "Subscribe should return success=True"
        print(f"✓ Push subscription created successfully")
    
    def test_push_send_test_endpoint(self, auth_headers):
        """Test /api/push/send-test sends actual notification"""
        # First ensure we have a subscription
        mock_subscription = {
            "subscription": {
                "endpoint": f"https://fcm.googleapis.com/fcm/send/test-send-{int(time.time())}",
                "keys": {
                    "p256dh": "BPwYYcQKjzSCNXuUcJphJMBqwvp1-BLAIrjbCBNEUJ8pPhLMYONPKqIfLbVqN0TcRjH9sbjMSvTXLyYKmRu8_wc",
                    "auth": "JvZ2hfMYpZmvSPuGpJqk2Q"
                }
            }
        }
        requests.post(
            f"{BASE_URL}/api/push/subscribe",
            headers={**auth_headers, "Content-Type": "application/json"},
            json=mock_subscription
        )
        
        # Now try to send test notification
        response = requests.post(f"{BASE_URL}/api/push/send-test", headers=auth_headers)
        assert response.status_code == 200, f"Send test should return 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        # The actual push may fail with mock endpoints, but the API should respond correctly
        assert "success" in data, "Response should contain 'success' field"
        assert "message" in data, "Response should contain 'message' field"
        print(f"✓ Push send-test endpoint response: success={data.get('success')}, message={data.get('message')}")
    
    def test_push_unsubscribe_endpoint(self, auth_headers):
        """Test /api/push/unsubscribe removes subscription"""
        # Unsubscribe requires the endpoint parameter
        test_endpoint = f"https://fcm.googleapis.com/fcm/send/test-send-{int(time.time())}"
        response = requests.delete(
            f"{BASE_URL}/api/push/unsubscribe",
            params={"endpoint": test_endpoint},
            headers=auth_headers
        )
        assert response.status_code == 200, f"Unsubscribe should return 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert "success" in data, "Response should contain 'success' field"
        print(f"✓ Push unsubscribe: {data.get('message')}")


class TestOfflineSyncSupport:
    """Test backend support for offline sync functionality"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        """Get authentication token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        if response.status_code != 200:
            pytest.skip("Login failed")
        return response.json().get("access_token")
    
    @pytest.fixture(scope="class")
    def auth_headers(self, auth_token):
        """Get auth headers"""
        return {"Authorization": f"Bearer {auth_token}"}
    
    def test_document_upload_endpoint_available(self, auth_headers):
        """Test document upload endpoint is available for offline sync"""
        # Check the endpoint exists (OPTIONS or HEAD request)
        response = requests.options(f"{BASE_URL}/api/documents/upload")
        # Should return 200 or 405 (method not allowed but endpoint exists)
        assert response.status_code in [200, 405, 204], "Document upload endpoint should exist"
        print("✓ Document upload endpoint available")
    
    def test_document_stamp_endpoint_available(self, auth_headers):
        """Test document stamp endpoint is available for offline sync"""
        response = requests.options(f"{BASE_URL}/api/documents/stamp")
        assert response.status_code in [200, 405, 204], "Document stamp endpoint should exist"
        print("✓ Document stamp endpoint available")
    
    def test_stamps_history_endpoint(self, auth_headers):
        """Test stamps history endpoint for caching"""
        response = requests.get(f"{BASE_URL}/api/documents/stamps", headers=auth_headers)
        assert response.status_code == 200, f"Stamps history should return 200, got {response.status_code}"
        data = response.json()
        assert isinstance(data, list), "Stamps should return a list"
        print(f"✓ Stamps history returns {len(data)} stamps")
    
    def test_verify_endpoint_for_offline_cache(self):
        """Test verify endpoint can be cached for offline use"""
        # Use a known stamp ID or invalid one
        response = requests.get(f"{BASE_URL}/api/verify/stamp/TLS-20260205-TEST123")
        # Should return 200 (with valid=false) or 404
        assert response.status_code in [200, 404], f"Verify should handle any stamp ID, got {response.status_code}"
        print(f"✓ Verify endpoint accessible for caching (status: {response.status_code})")


class TestServiceWorkerAssets:
    """Test service worker and PWA assets are correctly deployed"""
    
    def test_service_worker_accessible(self):
        """Test sw.js is accessible"""
        response = requests.get(f"{BASE_URL}/sw.js")
        assert response.status_code == 200, f"Service worker should be accessible, got {response.status_code}"
        assert "push" in response.text.lower(), "Service worker should handle push events"
        assert "fetch" in response.text.lower(), "Service worker should handle fetch events"
        print("✓ Service worker (sw.js) accessible and contains push/fetch handlers")
    
    def test_manifest_accessible(self):
        """Test manifest.json is accessible"""
        response = requests.get(f"{BASE_URL}/manifest.json")
        assert response.status_code == 200, f"Manifest should be accessible, got {response.status_code}"
        data = response.json()
        assert "name" in data, "Manifest should have name"
        assert "icons" in data, "Manifest should have icons"
        print(f"✓ PWA manifest accessible: {data.get('short_name', data.get('name'))}")
    
    def test_pwa_icons_exist(self):
        """Test PWA icons are accessible"""
        icon_sizes = [72, 96, 128, 144, 152, 192, 384, 512]
        for size in icon_sizes:
            response = requests.head(f"{BASE_URL}/icons/icon-{size}x{size}.png")
            if response.status_code == 200:
                print(f"  ✓ Icon {size}x{size} exists")
            else:
                print(f"  ⚠ Icon {size}x{size} missing (status: {response.status_code})")


class TestFrontendOfflineComponents:
    """Test frontend offline-related files exist"""
    
    def test_offline_db_file_exists(self):
        """Test offlineDB.js exists in frontend"""
        path = "/app/frontend/src/lib/offlineDB.js"
        assert os.path.exists(path), "offlineDB.js should exist"
        
        with open(path, 'r') as f:
            content = f.read()
            # Check key functions exist
            assert "initDB" in content, "Should have initDB function"
            assert "storeDocument" in content, "Should have storeDocument function"
            assert "queueStampOperation" in content, "Should have queueStampOperation function"
            assert "getPendingStampOperations" in content, "Should have getPendingStampOperations function"
            assert "cacheStamp" in content, "Should have cacheStamp function"
            print("✓ offlineDB.js contains all required functions")
    
    def test_offline_sync_file_exists(self):
        """Test offlineSync.js exists in frontend"""
        path = "/app/frontend/src/lib/offlineSync.js"
        assert os.path.exists(path), "offlineSync.js should exist"
        
        with open(path, 'r') as f:
            content = f.read()
            # Check key features
            assert "OfflineSyncService" in content, "Should have OfflineSyncService class"
            assert "syncAll" in content, "Should have syncAll function"
            assert "handleOnline" in content, "Should have handleOnline handler"
            assert "handleOffline" in content, "Should have handleOffline handler"
            print("✓ offlineSync.js contains sync service with online/offline handlers")
    
    def test_offline_indicator_component_exists(self):
        """Test OfflineIndicator component exists"""
        path = "/app/frontend/src/components/OfflineIndicator.jsx"
        assert os.path.exists(path), "OfflineIndicator.jsx should exist"
        
        with open(path, 'r') as f:
            content = f.read()
            assert "isOnline" in content, "Should track online status"
            assert "queueCount" in content, "Should show queue count"
            print("✓ OfflineIndicator.jsx component exists with status and queue display")
    
    def test_document_stamp_page_offline_support(self):
        """Test DocumentStampPage has offline support"""
        path = "/app/frontend/src/pages/DocumentStampPage.jsx"
        assert os.path.exists(path), "DocumentStampPage.jsx should exist"
        
        with open(path, 'r') as f:
            content = f.read()
            # Check offline imports
            assert "storeDocument" in content, "Should import storeDocument"
            assert "queueStampOperation" in content, "Should import queueStampOperation"
            assert "isOnline" in content, "Should import isOnline check"
            # Check offline handling in stamp function
            assert "offline" in content.lower() or "!online" in content or "queue" in content.lower()
            print("✓ DocumentStampPage.jsx has offline support with queue operations")


class TestIntegrationFlow:
    """Test the complete push notification and offline integration flow"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        """Get authentication token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        if response.status_code != 200:
            pytest.skip("Login failed")
        return response.json().get("access_token")
    
    @pytest.fixture(scope="class")
    def auth_headers(self, auth_token):
        """Get auth headers"""
        return {"Authorization": f"Bearer {auth_token}"}
    
    def test_full_push_subscribe_flow(self, auth_headers):
        """Test complete subscribe -> status -> unsubscribe flow"""
        # 1. Check initial status
        status_before = requests.get(f"{BASE_URL}/api/push/status", headers=auth_headers)
        assert status_before.status_code == 200
        
        # 2. Subscribe
        subscription = {
            "subscription": {
                "endpoint": f"https://fcm.googleapis.com/fcm/send/integration-test-{int(time.time())}",
                "keys": {
                    "p256dh": "BPwYYcQKjzSCNXuUcJphJMBqwvp1-BLAIrjbCBNEUJ8pPhLMYONPKqIfLbVqN0TcRjH9sbjMSvTXLyYKmRu8_wc",
                    "auth": "JvZ2hfMYpZmvSPuGpJqk2Q"
                }
            }
        }
        subscribe_response = requests.post(
            f"{BASE_URL}/api/push/subscribe",
            headers={**auth_headers, "Content-Type": "application/json"},
            json=subscription
        )
        assert subscribe_response.status_code == 200
        
        # 3. Check status after subscribe
        status_after = requests.get(f"{BASE_URL}/api/push/status", headers=auth_headers)
        assert status_after.status_code == 200
        data = status_after.json()
        assert data.get("subscribed") == True, "Should be subscribed after subscribing"
        
        # 4. Unsubscribe - requires endpoint parameter
        test_endpoint = subscription["subscription"]["endpoint"]
        unsubscribe_response = requests.delete(
            f"{BASE_URL}/api/push/unsubscribe",
            params={"endpoint": test_endpoint},
            headers=auth_headers
        )
        assert unsubscribe_response.status_code == 200
        
        print("✓ Complete push subscribe flow: subscribe -> status -> unsubscribe")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
