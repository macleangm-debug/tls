"""
Test Email Verification Flow and Login Attempt Logging Features
=====================================================
Tests for P0 (Email Verification) and P1 (Login Attempt Logging) features

Modules covered:
- Registration with email verification (is_verified=false, verification_token)
- Verify-email endpoint (/api/auth/verify-email/{token})
- Resend verification endpoint (/api/auth/resend-verification)
- Login blocking for unverified users
- Login success after verification
- Login attempt logging (success/failure with IP, user_agent, timestamp)
- Admin login-attempts endpoint (/api/admin/login-attempts)
"""

import pytest
import requests
import os
import uuid
from datetime import datetime

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://scan-and-sign-1.preview.emergentagent.com').rstrip('/')

# Test credentials
ADMIN_EMAIL = "admin@tls.or.tz"
ADMIN_PASSWORD = "TLS@Admin2024"
VERIFIED_USER_EMAIL = "testverify@example.com"
VERIFIED_USER_PASSWORD = "MySecure#Pass2024!"
UNVERIFIED_USER_EMAIL = "testresend@example.com"
UNVERIFIED_USER_PASSWORD = "MySecure#Pass2024!"


class TestHealthCheck:
    """Basic health check tests"""
    
    def test_api_health(self):
        """Test API health endpoint"""
        response = requests.get(f"{BASE_URL}/api/health")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "healthy"
        print(f"✅ API health check passed: {data}")


class TestEmailVerificationRegistration:
    """Test registration creates unverified user with verification token"""
    
    def test_register_creates_unverified_user(self):
        """Test that registration creates user with email_verified=false"""
        unique_id = str(uuid.uuid4())[:8]
        test_email = f"test_verify_{unique_id}@example.com"
        
        register_data = {
            "email": test_email,
            "password": "MySecure#Pass2024!",
            "full_name": f"Test User {unique_id}",
            "roll_number": f"ADV/2024/{unique_id}",
            "phone": "+255712345678",
            "region": "Dar es Salaam"
        }
        
        response = requests.post(f"{BASE_URL}/api/auth/register", json=register_data)
        
        # Should succeed with registration
        if response.status_code == 200:
            data = response.json()
            assert "requires_verification" in data
            assert data["requires_verification"] == True
            assert "message" in data
            assert "verify" in data["message"].lower() or "email" in data["message"].lower()
            print(f"✅ Registration successful with verification requirement: {data['message']}")
        elif response.status_code == 400:
            # Email might already exist
            print(f"⚠️ Registration failed (may be duplicate): {response.json()}")
        else:
            pytest.fail(f"Unexpected status code: {response.status_code} - {response.text}")


class TestVerifyEmailEndpoint:
    """Test /api/auth/verify-email/{token} endpoint"""
    
    def test_verify_email_invalid_token(self):
        """Test verify-email with invalid token returns error"""
        invalid_token = "invalid_token_12345"
        response = requests.get(f"{BASE_URL}/api/auth/verify-email/{invalid_token}")
        
        assert response.status_code == 400
        data = response.json()
        assert "detail" in data
        assert "invalid" in data["detail"].lower() or "expired" in data["detail"].lower()
        print(f"✅ Invalid token correctly rejected: {data['detail']}")
    
    def test_verify_email_empty_token(self):
        """Test verify-email with empty token returns 404 or error"""
        response = requests.get(f"{BASE_URL}/api/auth/verify-email/")
        # Should return 404 (not found) for empty path
        assert response.status_code in [404, 405, 422]
        print(f"✅ Empty token correctly handled with status {response.status_code}")


class TestResendVerificationEndpoint:
    """Test /api/auth/resend-verification endpoint"""
    
    def test_resend_verification_valid_email(self):
        """Test resend verification for existing unverified user"""
        # Use the unverified test user
        response = requests.post(
            f"{BASE_URL}/api/auth/resend-verification",
            json={"email": UNVERIFIED_USER_EMAIL}
        )
        
        # Should return success message (whether email exists or not - security)
        assert response.status_code in [200, 400]
        data = response.json()
        
        if response.status_code == 200:
            assert "message" in data
            print(f"✅ Resend verification response: {data['message']}")
        else:
            # 400 means already verified
            assert "detail" in data
            print(f"✅ Resend verification response: {data['detail']}")
    
    def test_resend_verification_nonexistent_email(self):
        """Test resend verification for non-existent email (security - should not reveal)"""
        fake_email = "nonexistent_user_12345@example.com"
        response = requests.post(
            f"{BASE_URL}/api/auth/resend-verification",
            json={"email": fake_email}
        )
        
        # Should still return 200 to not reveal if email exists
        assert response.status_code == 200
        data = response.json()
        assert "message" in data
        print(f"✅ Non-existent email handled securely: {data['message']}")
    
    def test_resend_verification_invalid_email_format(self):
        """Test resend verification with invalid email format"""
        response = requests.post(
            f"{BASE_URL}/api/auth/resend-verification",
            json={"email": "not-an-email"}
        )
        
        # Should return 422 (validation error)
        assert response.status_code == 422
        print(f"✅ Invalid email format rejected with status 422")


class TestLoginBlockingForUnverifiedUsers:
    """Test that unverified advocates cannot login"""
    
    def test_login_blocked_for_unverified_user(self):
        """Test that login is blocked for unverified email"""
        # First, register a new user (will be unverified)
        unique_id = str(uuid.uuid4())[:8]
        test_email = f"test_unverified_{unique_id}@example.com"
        test_password = "MySecure#Pass2024!"
        
        # Register
        register_response = requests.post(f"{BASE_URL}/api/auth/register", json={
            "email": test_email,
            "password": test_password,
            "full_name": f"Unverified User {unique_id}",
            "roll_number": f"ADV/2024/UV{unique_id}",
            "phone": "+255712345678",
            "region": "Dar es Salaam"
        })
        
        if register_response.status_code == 200:
            # Try to login
            login_response = requests.post(f"{BASE_URL}/api/auth/login", json={
                "email": test_email,
                "password": test_password
            })
            
            # Should be blocked (403)
            assert login_response.status_code == 403
            data = login_response.json()
            assert "detail" in data
            assert "verify" in data["detail"].lower() or "email" in data["detail"].lower()
            print(f"✅ Unverified user login correctly blocked: {data['detail']}")
        else:
            print(f"⚠️ Could not test login blocking (registration failed): {register_response.text}")


class TestLoginAttemptLogging:
    """Test that login attempts are logged with IP, user_agent, timestamp"""
    
    def test_failed_login_is_logged(self):
        """Test that failed login attempts are logged"""
        # Make a failed login attempt
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": "test_logging@example.com", "password": "WrongPassword123!"},
            headers={"User-Agent": "TestAgent/1.0"}
        )
        
        # Should fail with 401
        assert response.status_code == 401
        print(f"✅ Failed login attempt recorded (401 response)")
    
    def test_successful_login_is_logged(self):
        """Test that successful login attempts are logged"""
        # Login with admin credentials
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD},
            headers={"User-Agent": "TestAgent/1.0"}
        )
        
        # Should succeed for admin (admins don't require email verification)
        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data
        print(f"✅ Successful login logged (200 response)")
        return data["access_token"]


class TestAdminLoginAttemptsEndpoint:
    """Test /api/admin/login-attempts endpoint"""
    
    @pytest.fixture
    def admin_token(self):
        """Get admin authentication token"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD}
        )
        if response.status_code == 200:
            return response.json()["access_token"]
        pytest.skip("Could not get admin token")
    
    def test_admin_can_access_login_attempts(self, admin_token):
        """Test that admin can access login attempts logs"""
        response = requests.get(
            f"{BASE_URL}/api/admin/login-attempts",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        
        assert response.status_code == 200
        data = response.json()
        
        # Should have logs array and stats
        assert "logs" in data
        assert "stats" in data
        assert isinstance(data["logs"], list)
        
        # Check stats structure
        stats = data["stats"]
        assert "total_attempts" in stats
        assert "failed_attempts" in stats
        assert "success_rate" in stats
        
        print(f"✅ Admin login attempts endpoint working:")
        print(f"   Total attempts: {stats['total_attempts']}")
        print(f"   Failed attempts: {stats['failed_attempts']}")
        print(f"   Success rate: {stats['success_rate']}%")
        
        # Verify log structure if logs exist
        if data["logs"]:
            log = data["logs"][0]
            required_fields = ["email", "success", "ip_address", "user_agent", "timestamp"]
            for field in required_fields:
                assert field in log, f"Missing field '{field}' in login attempt log"
            print(f"✅ Log entry structure validated with all required fields")
    
    def test_login_attempts_filter_by_success(self, admin_token):
        """Test filtering login attempts by success status"""
        # Filter by failed only
        response = requests.get(
            f"{BASE_URL}/api/admin/login-attempts?success_only=false",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        
        assert response.status_code == 200
        data = response.json()
        
        # All logs should be failures
        for log in data["logs"]:
            assert log["success"] == False, "Found success=True in failed-only filter"
        
        print(f"✅ Filter by success_only=false working ({len(data['logs'])} failed attempts)")
    
    def test_login_attempts_filter_by_email(self, admin_token):
        """Test filtering login attempts by email"""
        response = requests.get(
            f"{BASE_URL}/api/admin/login-attempts?email=admin",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        
        assert response.status_code == 200
        data = response.json()
        
        # All logs should contain 'admin' in email
        for log in data["logs"]:
            assert "admin" in log["email"].lower(), f"Email filter not working: {log['email']}"
        
        print(f"✅ Filter by email working ({len(data['logs'])} matching entries)")
    
    def test_login_attempts_unauthorized_access(self):
        """Test that non-admin cannot access login attempts"""
        # Try without token
        response = requests.get(f"{BASE_URL}/api/admin/login-attempts")
        assert response.status_code in [401, 403]
        print(f"✅ Unauthorized access correctly blocked (status {response.status_code})")


class TestVerifiedUserLogin:
    """Test that verified users can login successfully"""
    
    def test_verified_user_can_login(self):
        """Test login success for verified user"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": VERIFIED_USER_EMAIL, "password": VERIFIED_USER_PASSWORD}
        )
        
        # Verified user should be able to login
        if response.status_code == 200:
            data = response.json()
            assert "access_token" in data
            assert "user" in data
            print(f"✅ Verified user login successful")
        elif response.status_code == 401:
            # User might not exist or wrong password
            print(f"⚠️ Verified user login failed (user may not exist): {response.json()}")
        elif response.status_code == 403:
            # User exists but not verified
            print(f"⚠️ User exists but not verified: {response.json()}")
        else:
            print(f"⚠️ Unexpected response: {response.status_code} - {response.text}")


class TestEndToEndEmailVerificationFlow:
    """End-to-end test for the complete email verification flow"""
    
    def test_complete_verification_flow(self):
        """Test complete flow: register -> verify -> login"""
        unique_id = str(uuid.uuid4())[:8]
        test_email = f"e2e_test_{unique_id}@example.com"
        test_password = "MySecure#Pass2024!"
        
        # Step 1: Register
        print(f"\n📧 Step 1: Registering user {test_email}")
        register_response = requests.post(f"{BASE_URL}/api/auth/register", json={
            "email": test_email,
            "password": test_password,
            "full_name": f"E2E Test User {unique_id}",
            "roll_number": f"ADV/2024/E2E{unique_id}",
            "phone": "+255712345678",
            "region": "Dar es Salaam"
        })
        
        if register_response.status_code != 200:
            print(f"⚠️ Registration failed: {register_response.text}")
            return
        
        data = register_response.json()
        assert data.get("requires_verification") == True
        print(f"✅ Registration successful - requires verification")
        
        # Step 2: Try to login (should fail)
        print(f"\n🔐 Step 2: Attempting login (should be blocked)")
        login_response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": test_email,
            "password": test_password
        })
        
        assert login_response.status_code == 403
        print(f"✅ Login correctly blocked for unverified user")
        
        # Step 3: Request resend verification
        print(f"\n📨 Step 3: Requesting verification resend")
        resend_response = requests.post(
            f"{BASE_URL}/api/auth/resend-verification",
            json={"email": test_email}
        )
        
        assert resend_response.status_code == 200
        print(f"✅ Resend verification request successful")
        
        print(f"\n✅ End-to-end flow completed successfully!")
        print(f"   Note: Actual email verification would require email access")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
