"""
Test Auth Module - Testing the refactored auth routes from backend/routes/auth.py
Tests: login, logout, /auth/me, password-rules, forgot-password
Credentials: test@tls.or.tz / Test@12345678!
"""

import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestAuthLogin:
    """Authentication login endpoint tests"""
    
    def test_login_valid_credentials(self):
        """Test login with valid advocate credentials"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "test@tls.or.tz",
            "password": "Test@12345678!"
        })
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "access_token" in data, "Response should contain access_token"
        assert "user" in data, "Response should contain user data"
        assert "csrf_token" in data, "Response should contain csrf_token"
        assert data["user"]["email"] == "test@tls.or.tz"
        assert data["token_type"] == "bearer"
        
    def test_login_invalid_credentials(self):
        """Test login with invalid credentials returns 401"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "test@tls.or.tz",
            "password": "WrongPassword123!"
        })
        
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        
        data = response.json()
        assert "detail" in data
        assert data["detail"] == "Invalid credentials"
        
    def test_login_nonexistent_user(self):
        """Test login with non-existent user returns 401"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "nonexistent@tls.or.tz",
            "password": "SomePassword123!"
        })
        
        assert response.status_code == 401
        
        data = response.json()
        assert data["detail"] == "Invalid credentials"
        
    def test_login_admin_credentials(self):
        """Test login with admin credentials"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@tls.or.tz",
            "password": "TLS@Admin2024"
        })
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "access_token" in data
        assert data["user"]["email"] == "admin@tls.or.tz"


class TestAuthMe:
    """Test /auth/me endpoint"""
    
    @pytest.fixture
    def auth_token(self):
        """Get authentication token for tests"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "test@tls.or.tz",
            "password": "Test@12345678!"
        })
        if response.status_code == 200:
            return response.json().get("access_token")
        pytest.skip("Authentication failed")
        
    def test_get_current_user_with_token(self, auth_token):
        """Test /auth/me returns user data when authenticated"""
        response = requests.get(
            f"{BASE_URL}/api/auth/me",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert "email" in data
        assert data["email"] == "test@tls.or.tz"
        assert "id" in data
        assert "full_name" in data
        assert "role" in data
        # Verify sensitive fields are excluded
        assert "password_hash" not in data
        assert "_id" not in data
        
    def test_get_current_user_without_token(self):
        """Test /auth/me returns 401 without authentication"""
        response = requests.get(f"{BASE_URL}/api/auth/me")
        
        assert response.status_code == 401
        
    def test_get_current_user_invalid_token(self):
        """Test /auth/me returns 401 with invalid token"""
        response = requests.get(
            f"{BASE_URL}/api/auth/me",
            headers={"Authorization": "Bearer invalid_token_here"}
        )
        
        assert response.status_code == 401


class TestAuthLogout:
    """Test /auth/logout endpoint"""
    
    def test_logout_clears_session(self):
        """Test logout clears session and cookie"""
        # First login
        login_response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "test@tls.or.tz",
            "password": "Test@12345678!"
        })
        
        assert login_response.status_code == 200
        
        # Logout with cookies from login
        session = requests.Session()
        login_result = session.post(f"{BASE_URL}/api/auth/login", json={
            "email": "test@tls.or.tz",
            "password": "Test@12345678!"
        })
        
        assert login_result.status_code == 200
        
        # Now logout
        logout_response = session.post(f"{BASE_URL}/api/auth/logout")
        
        assert logout_response.status_code == 200
        
        data = logout_response.json()
        assert data["message"] == "Logged out successfully"
        
    def test_me_after_logout(self):
        """Verify /auth/me fails after logout"""
        session = requests.Session()
        
        # Login
        login_result = session.post(f"{BASE_URL}/api/auth/login", json={
            "email": "test@tls.or.tz",
            "password": "Test@12345678!"
        })
        
        assert login_result.status_code == 200
        
        # Logout
        logout_result = session.post(f"{BASE_URL}/api/auth/logout")
        assert logout_result.status_code == 200
        
        # Try to access /me after logout (cookie should be cleared)
        me_response = session.get(f"{BASE_URL}/api/auth/me")
        
        assert me_response.status_code == 401, "Should be unauthorized after logout"


class TestPasswordRules:
    """Test /auth/password-rules endpoint"""
    
    def test_get_password_rules(self):
        """Test password-rules returns validation rules"""
        response = requests.get(f"{BASE_URL}/api/auth/password-rules")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert "rules" in data
        
        rules = data["rules"]
        assert len(rules) >= 6, "Should have at least 6 password rules"
        
        # Check specific rules exist
        rule_names = [r["rule"] for r in rules]
        assert "minimum_length" in rule_names
        assert "uppercase" in rule_names
        assert "lowercase" in rule_names
        assert "number" in rule_names
        assert "special" in rule_names
        
    def test_password_rules_structure(self):
        """Test password-rules has correct structure"""
        response = requests.get(f"{BASE_URL}/api/auth/password-rules")
        
        data = response.json()
        rules = data["rules"]
        
        for rule in rules:
            assert "rule" in rule, f"Rule missing 'rule' field: {rule}"
            assert "description" in rule, f"Rule missing 'description' field: {rule}"
            

class TestForgotPassword:
    """Test /auth/forgot-password endpoint"""
    
    def test_forgot_password_existing_email(self):
        """Test forgot-password with existing email returns success"""
        response = requests.post(f"{BASE_URL}/api/auth/forgot-password", json={
            "email": "test@tls.or.tz"
        })
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "message" in data
        # Message should be generic to prevent email enumeration
        assert "email" in data["message"].lower() or "account" in data["message"].lower()
        
    def test_forgot_password_nonexistent_email(self):
        """Test forgot-password with non-existent email (should still return 200 for security)"""
        response = requests.post(f"{BASE_URL}/api/auth/forgot-password", json={
            "email": "nonexistent@tls.or.tz"
        })
        
        # Should return 200 to prevent email enumeration attacks
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert "message" in data


class TestAuthEndpointAvailability:
    """Test all auth endpoints are available and routed correctly"""
    
    def test_login_endpoint_exists(self):
        """Verify POST /api/auth/login endpoint exists"""
        response = requests.options(f"{BASE_URL}/api/auth/login")
        # OPTIONS returns 200 or the POST should not return 404
        post_response = requests.post(f"{BASE_URL}/api/auth/login", json={})
        assert post_response.status_code != 404, "Login endpoint should exist"
        
    def test_logout_endpoint_exists(self):
        """Verify POST /api/auth/logout endpoint exists"""
        response = requests.post(f"{BASE_URL}/api/auth/logout")
        assert response.status_code != 404, "Logout endpoint should exist"
        
    def test_me_endpoint_exists(self):
        """Verify GET /api/auth/me endpoint exists"""
        response = requests.get(f"{BASE_URL}/api/auth/me")
        assert response.status_code != 404, "Me endpoint should exist"
        
    def test_password_rules_endpoint_exists(self):
        """Verify GET /api/auth/password-rules endpoint exists"""
        response = requests.get(f"{BASE_URL}/api/auth/password-rules")
        assert response.status_code != 404, "Password-rules endpoint should exist"
        
    def test_forgot_password_endpoint_exists(self):
        """Verify POST /api/auth/forgot-password endpoint exists"""
        response = requests.post(f"{BASE_URL}/api/auth/forgot-password", json={
            "email": "test@test.com"
        })
        assert response.status_code != 404, "Forgot-password endpoint should exist"


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
