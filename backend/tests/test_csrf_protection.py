"""
CSRF Protection Tests
Tests CSRF token generation, storage, and validation for TLS Portal
"""

import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')


class TestCSRFProtection:
    """Test CSRF protection middleware and token management"""
    
    @pytest.fixture(scope="class")
    def auth_session(self):
        """Login and get auth token + CSRF token"""
        session = requests.Session()
        
        # Login with test credentials
        login_response = session.post(
            f"{BASE_URL}/api/auth/login",
            json={
                "email": "test@tls.or.tz",
                "password": "Test@12345678!"
            }
        )
        
        if login_response.status_code != 200:
            pytest.skip(f"Login failed: {login_response.status_code} - {login_response.text}")
        
        data = login_response.json()
        access_token = data.get("access_token")
        csrf_token = data.get("csrf_token")
        
        return {
            "session": session,
            "access_token": access_token,
            "csrf_token": csrf_token,
            "user": data.get("user")
        }
    
    # ============ TEST 1: Login returns CSRF token ============
    def test_login_returns_csrf_token(self):
        """Test that login endpoint returns csrf_token in response"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={
                "email": "test@tls.or.tz",
                "password": "Test@12345678!"
            }
        )
        
        assert response.status_code == 200, f"Login failed: {response.text}"
        data = response.json()
        
        # Verify csrf_token is present
        assert "csrf_token" in data, "Response should contain csrf_token"
        assert data["csrf_token"] is not None, "csrf_token should not be None"
        assert len(data["csrf_token"]) > 20, "csrf_token should be a substantial token"
        
        # Verify other expected fields
        assert "access_token" in data, "Response should contain access_token"
        assert "user" in data, "Response should contain user data"
        
        print(f"✅ Login returns csrf_token: {data['csrf_token'][:20]}...")
    
    # ============ TEST 2: POST without CSRF token returns 403 ============
    def test_post_without_csrf_token_returns_403(self, auth_session):
        """Test that POST request WITHOUT X-CSRF-Token header returns 403"""
        access_token = auth_session["access_token"]
        
        # Make PUT request to a protected endpoint WITHOUT CSRF token
        response = requests.put(
            f"{BASE_URL}/api/profile",
            headers={
                "Authorization": f"Bearer {access_token}",
                # No X-CSRF-Token header
            },
            json={
                "full_name": "Test Update"
            }
        )
        
        assert response.status_code == 403, f"Expected 403, got {response.status_code}"
        data = response.json()
        
        # Verify error message
        assert "detail" in data, "Response should contain detail"
        assert "CSRF token missing" in data["detail"], f"Expected 'CSRF token missing', got: {data['detail']}"
        
        print(f"✅ POST without CSRF token returns 403: {data['detail']}")
    
    # ============ TEST 3: POST with invalid CSRF token returns 403 ============
    def test_post_with_invalid_csrf_token_returns_403(self, auth_session):
        """Test that POST request WITH invalid X-CSRF-Token returns 403"""
        access_token = auth_session["access_token"]
        
        # Make PUT request with an invalid/fake CSRF token
        response = requests.put(
            f"{BASE_URL}/api/profile",
            headers={
                "Authorization": f"Bearer {access_token}",
                "X-CSRF-Token": "fake_invalid_csrf_token_12345"
            },
            json={
                "full_name": "Test Update"
            }
        )
        
        assert response.status_code == 403, f"Expected 403, got {response.status_code}"
        data = response.json()
        
        # Verify error message
        assert "detail" in data, "Response should contain detail"
        assert "Invalid CSRF token" in data["detail"], f"Expected 'Invalid CSRF token', got: {data['detail']}"
        
        print(f"✅ POST with invalid CSRF token returns 403: {data['detail']}")
    
    # ============ TEST 4: POST with valid CSRF token succeeds ============
    def test_post_with_valid_csrf_token_succeeds(self, auth_session):
        """Test that POST request WITH valid X-CSRF-Token succeeds"""
        access_token = auth_session["access_token"]
        csrf_token = auth_session["csrf_token"]
        
        # Make PUT request with valid CSRF token to update profile
        response = requests.put(
            f"{BASE_URL}/api/profile",
            headers={
                "Authorization": f"Bearer {access_token}",
                "X-CSRF-Token": csrf_token
            },
            json={
                "full_name": "Test Update Name"
            }
        )
        
        # Should succeed (200 or 201)
        assert response.status_code in [200, 201], f"Expected success, got {response.status_code}: {response.text}"
        
        print(f"✅ POST with valid CSRF token succeeds: status {response.status_code}")
    
    # ============ TEST 5: GET requests work without CSRF token ============
    def test_get_requests_work_without_csrf_token(self, auth_session):
        """Test that GET requests work without CSRF token (safe methods)"""
        access_token = auth_session["access_token"]
        
        # Make GET request WITHOUT CSRF token - should work
        response = requests.get(
            f"{BASE_URL}/api/auth/me",
            headers={
                "Authorization": f"Bearer {access_token}",
                # No X-CSRF-Token header
            }
        )
        
        assert response.status_code == 200, f"GET should succeed without CSRF: {response.status_code} - {response.text}"
        data = response.json()
        
        # Verify user data is returned
        assert "email" in data, "Response should contain user email"
        
        print(f"✅ GET requests work without CSRF token: user email = {data.get('email')}")
    
    # ============ TEST 6: Public login endpoint works without CSRF token ============
    def test_public_login_endpoint_works_without_csrf(self):
        """Test that login (public endpoint) works without CSRF token"""
        # Login is a POST but exempt from CSRF
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={
                "email": "test@tls.or.tz",
                "password": "Test@12345678!"
            },
            headers={
                # No CSRF token - public endpoint
            }
        )
        
        assert response.status_code == 200, f"Login should work without CSRF: {response.status_code}"
        
        print(f"✅ Public login endpoint works without CSRF token")
    
    # ============ TEST 7: Public register endpoint works without CSRF token ============
    def test_public_register_endpoint_works_without_csrf(self):
        """Test that register (public endpoint) works without CSRF token"""
        # Register is a POST but exempt from CSRF - expect 400 (email exists) not 403
        response = requests.post(
            f"{BASE_URL}/api/auth/register",
            json={
                "email": "test@tls.or.tz",
                "password": "Test@12345678!",
                "full_name": "Test User",
                "roll_number": "TZ/123/2024",
                "phone": "+255123456789",
                "region": "Dar es Salaam"
            },
            headers={
                # No CSRF token - public endpoint
            }
        )
        
        # Should NOT be 403 (CSRF blocked) - expect 400 (duplicate) or 200 (success)
        assert response.status_code != 403, f"Register should not require CSRF: {response.status_code} - {response.text}"
        # Should be 400 (email/roll_number exists) since we're using existing credentials
        assert response.status_code == 400, f"Expected 400 (duplicate), got {response.status_code}"
        
        print(f"✅ Public register endpoint works without CSRF token (got 400 = duplicate, not 403)")
    
    # ============ TEST 8: DELETE request without CSRF token returns 403 ============
    def test_delete_request_without_csrf_returns_403(self, auth_session):
        """Test that DELETE request without CSRF token returns 403"""
        access_token = auth_session["access_token"]
        
        # Try DELETE without CSRF token - use a non-existent ID to avoid actual deletion
        response = requests.delete(
            f"{BASE_URL}/api/practice/templates/fake-nonexistent-id",
            headers={
                "Authorization": f"Bearer {access_token}",
                # No X-CSRF-Token
            }
        )
        
        # Should be 403 CSRF error, NOT 404 (not found)
        assert response.status_code == 403, f"Expected 403, got {response.status_code}: {response.text}"
        data = response.json()
        assert "CSRF" in data.get("detail", ""), f"Expected CSRF error: {data}"
        
        print(f"✅ DELETE without CSRF token returns 403")
    
    # ============ TEST 9: PUT request without CSRF token returns 403 ============
    def test_put_request_without_csrf_returns_403(self, auth_session):
        """Test that PUT request without CSRF token returns 403"""
        access_token = auth_session["access_token"]
        
        response = requests.put(
            f"{BASE_URL}/api/profile",
            headers={
                "Authorization": f"Bearer {access_token}",
                # No X-CSRF-Token
            },
            json={"phone": "+255111222333"}
        )
        
        assert response.status_code == 403, f"Expected 403, got {response.status_code}: {response.text}"
        data = response.json()
        assert "CSRF token missing" in data.get("detail", ""), f"Expected CSRF missing error: {data}"
        
        print(f"✅ PUT without CSRF token returns 403")
    
    # ============ TEST 10: Public verify endpoint works without auth/CSRF ============
    def test_public_verify_endpoint_works_without_csrf(self):
        """Test that /api/verify (public) works without auth or CSRF"""
        # Verify is public - try a fake stamp ID
        response = requests.get(
            f"{BASE_URL}/api/verify/TLS-20240101-FAKE1234"
        )
        
        # Should be 404 (stamp not found) or 200 - NOT 403 (CSRF)
        assert response.status_code in [200, 404], f"Verify should be public: {response.status_code}"
        
        print(f"✅ Public verify endpoint works without CSRF (status: {response.status_code})")
    
    # ============ TEST 11: CSRF token is unique per login ============
    def test_csrf_token_unique_per_login(self):
        """Test that each login generates a unique CSRF token"""
        tokens = []
        
        for _ in range(3):
            response = requests.post(
                f"{BASE_URL}/api/auth/login",
                json={
                    "email": "test@tls.or.tz",
                    "password": "Test@12345678!"
                }
            )
            assert response.status_code == 200
            tokens.append(response.json().get("csrf_token"))
        
        # All tokens should be unique
        assert len(set(tokens)) == 3, "Each login should generate a unique CSRF token"
        
        print(f"✅ CSRF tokens are unique per login session")
    
    # ============ TEST 12: PATCH request requires CSRF token ============
    def test_patch_request_requires_csrf(self, auth_session):
        """Test that PATCH request requires CSRF token"""
        access_token = auth_session["access_token"]
        
        # Make PATCH request WITHOUT CSRF token
        response = requests.patch(
            f"{BASE_URL}/api/advocates/me/notification-preferences",
            headers={
                "Authorization": f"Bearer {access_token}",
                # No X-CSRF-Token
            },
            json={"stamp_created": True}
        )
        
        # Should be 403 CSRF error (not 404 or other)
        assert response.status_code == 403, f"Expected 403, got {response.status_code}: {response.text}"
        
        print(f"✅ PATCH request requires CSRF token")


class TestCSRFExemptPaths:
    """Test that CSRF-exempt paths work correctly"""
    
    def test_forgot_password_exempt(self):
        """Test /api/auth/forgot-password is CSRF exempt"""
        response = requests.post(
            f"{BASE_URL}/api/auth/forgot-password",
            json={"email": "nonexistent@test.com"}
        )
        # Should NOT be 403 - expect 200 (email sent message) or 404
        assert response.status_code != 403, f"Forgot password should be CSRF exempt: {response.status_code}"
        print(f"✅ /api/auth/forgot-password is CSRF exempt")
    
    def test_health_endpoint_exempt(self):
        """Test /health is CSRF exempt for OPTIONS/GET"""
        response = requests.get(f"{BASE_URL}/health")
        assert response.status_code in [200, 404], f"Health should be accessible: {response.status_code}"
        print(f"✅ /health endpoint accessible")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
