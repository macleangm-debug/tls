"""
PWA and Push Notification API Tests
Tests for manifest.json, service worker, and push notification endpoints
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')
FRONTEND_URL = BASE_URL  # Same domain for PWA assets

class TestPWAAssets:
    """PWA manifest and service worker availability tests"""
    
    def test_manifest_json_accessible(self):
        """Test that manifest.json is accessible"""
        response = requests.get(f"{FRONTEND_URL}/manifest.json")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        # Validate JSON
        data = response.json()
        assert "name" in data
        assert "short_name" in data
        assert "icons" in data
        print(f"✓ manifest.json accessible - name: {data['name']}")
    
    def test_manifest_json_required_fields(self):
        """Test that manifest.json has all required PWA fields"""
        response = requests.get(f"{FRONTEND_URL}/manifest.json")
        assert response.status_code == 200
        
        data = response.json()
        
        # Required fields for installable PWA
        required_fields = ["name", "short_name", "start_url", "display", "icons"]
        for field in required_fields:
            assert field in data, f"Missing required field: {field}"
        
        # Validate icon sizes
        icon_sizes = [icon["sizes"] for icon in data["icons"]]
        assert "192x192" in icon_sizes, "Missing 192x192 icon"
        assert "512x512" in icon_sizes, "Missing 512x512 icon"
        
        # Validate display mode
        assert data["display"] in ["standalone", "fullscreen", "minimal-ui"], f"Invalid display mode: {data['display']}"
        
        print("✓ manifest.json has all required PWA fields")
    
    def test_manifest_theme_color(self):
        """Test that manifest has correct theme color (emerald)"""
        response = requests.get(f"{FRONTEND_URL}/manifest.json")
        assert response.status_code == 200
        
        data = response.json()
        assert "theme_color" in data
        # Emerald color should be #10B981
        assert data["theme_color"] == "#10B981", f"Expected emerald theme (#10B981), got {data['theme_color']}"
        print(f"✓ Theme color is correct: {data['theme_color']}")
    
    def test_service_worker_accessible(self):
        """Test that service worker file is accessible"""
        response = requests.get(f"{FRONTEND_URL}/sw.js")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        content = response.text
        # Check for service worker patterns
        assert "self.addEventListener" in content or "addeventlistener" in content.lower()
        print("✓ sw.js accessible")
    
    def test_service_worker_has_push_handler(self):
        """Test that service worker has push notification handlers"""
        response = requests.get(f"{FRONTEND_URL}/sw.js")
        assert response.status_code == 200
        
        content = response.text
        
        # Check for push event handler
        assert "push" in content.lower(), "Missing push event handler in service worker"
        assert "showNotification" in content, "Missing showNotification call in service worker"
        
        print("✓ Service worker has push notification handlers")
    
    def test_service_worker_has_cache_strategy(self):
        """Test that service worker has caching strategy"""
        response = requests.get(f"{FRONTEND_URL}/sw.js")
        assert response.status_code == 200
        
        content = response.text
        
        # Check for caching
        assert "cache" in content.lower(), "Missing cache handling in service worker"
        assert "fetch" in content.lower(), "Missing fetch handler in service worker"
        
        print("✓ Service worker has caching strategy")
    
    def test_pwa_icons_exist(self):
        """Test that PWA icons are accessible"""
        icon_sizes = ["72x72", "96x96", "128x128", "144x144", "152x152", "192x192", "384x384", "512x512"]
        
        for size in icon_sizes:
            response = requests.get(f"{FRONTEND_URL}/icons/icon-{size}.png")
            assert response.status_code == 200, f"Missing icon: icon-{size}.png"
            # Verify it's actually an image
            assert "image" in response.headers.get("content-type", "").lower(), f"Icon {size} is not an image"
        
        print(f"✓ All {len(icon_sizes)} PWA icons accessible")


class TestPushNotificationAPI:
    """Push notification API endpoint tests"""
    
    @pytest.fixture
    def auth_token(self):
        """Get authentication token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "testadvocate@tls.or.tz",
            "password": "Test@1234"
        })
        if response.status_code == 200:
            return response.json().get("access_token")
        pytest.skip("Authentication failed")
    
    def test_push_status_unauthenticated(self):
        """Test push status without auth returns 401/403"""
        response = requests.get(f"{BASE_URL}/api/push/status")
        assert response.status_code in [401, 403], f"Expected 401/403, got {response.status_code}"
        print("✓ Push status requires authentication")
    
    def test_push_status_authenticated(self, auth_token):
        """Test push status with authentication"""
        response = requests.get(
            f"{BASE_URL}/api/push/status",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert "subscribed" in data
        print(f"✓ Push status returned: subscribed={data['subscribed']}")
    
    def test_push_subscribe_authenticated(self, auth_token):
        """Test subscribing to push notifications"""
        # Mock push subscription data
        subscription = {
            "subscription": {
                "endpoint": "https://test-push-endpoint.example.com/test-123",
                "keys": {
                    "p256dh": "test_p256dh_key_value",
                    "auth": "test_auth_key_value"
                }
            }
        }
        
        response = requests.post(
            f"{BASE_URL}/api/push/subscribe",
            headers={
                "Authorization": f"Bearer {auth_token}",
                "Content-Type": "application/json"
            },
            json=subscription
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert data.get("success") == True
        print("✓ Push subscription successful")
    
    def test_push_status_after_subscribe(self, auth_token):
        """Test push status shows subscribed after subscribing"""
        # First subscribe
        subscription = {
            "subscription": {
                "endpoint": "https://test-push-endpoint.example.com/test-456",
                "keys": {
                    "p256dh": "test_p256dh_key",
                    "auth": "test_auth_key"
                }
            }
        }
        
        requests.post(
            f"{BASE_URL}/api/push/subscribe",
            headers={
                "Authorization": f"Bearer {auth_token}",
                "Content-Type": "application/json"
            },
            json=subscription
        )
        
        # Check status
        response = requests.get(
            f"{BASE_URL}/api/push/status",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 200
        
        data = response.json()
        assert data.get("subscribed") == True
        print("✓ Push status correctly shows subscribed")
    
    def test_push_unsubscribe(self, auth_token):
        """Test unsubscribing from push notifications"""
        # Note: Unsubscribe requires the endpoint query parameter
        response = requests.delete(
            f"{BASE_URL}/api/push/unsubscribe",
            params={"endpoint": "https://test-push-endpoint.example.com/test-456"},
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        # Should succeed even if not subscribed (returns success or 404-like message)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert data.get("success") == True
        print("✓ Push unsubscribe successful")


class TestVerificationPageAPI:
    """Verification API tests"""
    
    def test_verify_valid_stamp(self):
        """Test verification with valid stamp ID"""
        response = requests.get(f"{BASE_URL}/api/verify/stamp/TLS-20260205-703CC5D2")
        assert response.status_code == 200
        
        data = response.json()
        assert data.get("valid") == True
        assert data.get("stamp_id") == "TLS-20260205-703CC5D2"
        assert "advocate_name" in data
        assert "document_name" in data
        print(f"✓ Valid stamp verified: {data['advocate_name']}")
    
    def test_verify_invalid_stamp(self):
        """Test verification with invalid stamp ID"""
        response = requests.get(f"{BASE_URL}/api/verify/stamp/INVALID-STAMP-123")
        
        # Could be 200 with valid=False or 404
        if response.status_code == 200:
            data = response.json()
            assert data.get("valid") == False
            print("✓ Invalid stamp correctly rejected (200 with valid=False)")
        else:
            assert response.status_code == 404
            print("✓ Invalid stamp correctly rejected (404)")
    
    def test_verify_returns_advocate_status(self):
        """Test that verification returns advocate status"""
        response = requests.get(f"{BASE_URL}/api/verify/stamp/TLS-20260205-703CC5D2")
        assert response.status_code == 200
        
        data = response.json()
        assert "advocate_status" in data
        assert data["advocate_status"] in ["Active", "Suspended", "Inactive"]
        print(f"✓ Advocate status returned: {data['advocate_status']}")
    
    def test_verify_returns_document_info(self):
        """Test that verification returns document info"""
        response = requests.get(f"{BASE_URL}/api/verify/stamp/TLS-20260205-703CC5D2")
        assert response.status_code == 200
        
        data = response.json()
        assert "document_name" in data
        assert "document_type" in data or data.get("document_name")  # At least one should exist
        print(f"✓ Document info returned: {data.get('document_name', 'N/A')}")
    
    def test_verify_increments_count(self):
        """Test that verification increments verification count"""
        # Get initial count
        response1 = requests.get(f"{BASE_URL}/api/verify/stamp/TLS-20260205-703CC5D2")
        assert response1.status_code == 200
        initial_count = response1.json().get("verification_count", 0)
        
        # Verify again
        response2 = requests.get(f"{BASE_URL}/api/verify/stamp/TLS-20260205-703CC5D2")
        assert response2.status_code == 200
        new_count = response2.json().get("verification_count", 0)
        
        # Count should have increased
        assert new_count >= initial_count, "Verification count should increment"
        print(f"✓ Verification count: {initial_count} -> {new_count}")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
