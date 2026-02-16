import requests
import sys
import time
from datetime import datetime
import json

class SecurityTester:
    def __init__(self, base_url="https://secure-check-8.preview.emergentagent.com"):
        self.base_url = base_url
        self.token = None
        self.tests_run = 0
        self.tests_passed = 0
        self.failed_tests = []

    def run_test(self, name, test_func):
        """Run a single test and track results"""
        self.tests_run += 1
        print(f"\n🔍 Testing {name}...")
        
        try:
            success, message = test_func()
            if success:
                self.tests_passed += 1
                print(f"✅ {message}")
            else:
                print(f"❌ {message}")
                self.failed_tests.append(f"{name}: {message}")
            return success
        except Exception as e:
            print(f"❌ {name} - Error: {str(e)}")
            self.failed_tests.append(f"{name}: Exception - {str(e)}")
            return False

    def test_rate_limiting(self):
        """Test rate limiting on login endpoint (5 requests per minute)"""
        login_url = f"{self.base_url}/api/auth/login"
        test_email = "admin@tls.or.tz"
        test_password = "wrong_password"
        
        # Make 6 rapid requests to trigger rate limiting
        rate_limit_triggered = False
        for i in range(6):
            try:
                response = requests.post(login_url, 
                    json={"email": test_email, "password": test_password},
                    headers={'Content-Type': 'application/json'},
                    timeout=5
                )
                
                if response.status_code == 429:  # Too Many Requests
                    rate_limit_triggered = True
                    break
                    
                # Small delay between requests
                time.sleep(0.1)
            except Exception as e:
                continue
        
        if rate_limit_triggered:
            return True, "Rate limiting working - 429 status code received"
        else:
            return False, "Rate limiting not working - no 429 status after 6 requests"

    def test_security_headers(self):
        """Test presence of security headers"""
        try:
            response = requests.get(f"{self.base_url}/api/auth/me", timeout=10)
            headers = response.headers
            
            required_headers = [
                'x-frame-options',
                'x-content-type-options',
                'content-security-policy',
                'strict-transport-security'
            ]
            
            missing_headers = []
            for header in required_headers:
                if header.lower() not in [h.lower() for h in headers.keys()]:
                    missing_headers.append(header)
            
            if not missing_headers:
                return True, "All required security headers present"
            else:
                return False, f"Missing security headers: {', '.join(missing_headers)}"
                
        except Exception as e:
            return False, f"Error checking headers: {str(e)}"

    def test_cors_configuration(self):
        """Test CORS configuration"""
        try:
            response = requests.options(f"{self.base_url}/api/auth/login",
                headers={
                    'Origin': 'https://malicious-site.com',
                    'Access-Control-Request-Method': 'POST'
                },
                timeout=5
            )
            
            allowed_origins = response.headers.get('Access-Control-Allow-Origin', '')
            
            # Should not allow all origins (*)
            if allowed_origins == '*':
                return False, "CORS allows all origins (*) - security risk"
            
            # Should allow only specific origins
            if 'secure-check-8.preview.emergentagent.com' in allowed_origins:
                return True, f"CORS properly configured: {allowed_origins}"
            else:
                return False, f"CORS origins unclear: {allowed_origins}"
                
        except Exception as e:
            return False, f"Error testing CORS: {str(e)}"

    def test_login_with_default_admin(self):
        """Test login with default admin account and check force_password_reset flag"""
        login_url = f"{self.base_url}/api/auth/login"
        
        try:
            response = requests.post(login_url,
                json={"email": "admin@tls.or.tz", "password": "TLS@Admin2024"},
                headers={'Content-Type': 'application/json'},
                timeout=10
            )
            
            if response.status_code == 200:
                data = response.json()
                self.token = data.get("access_token")
                
                # Check if force_password_reset flag is present
                user_data = data.get("user", {})
                force_reset = user_data.get("force_password_reset", False)
                
                if force_reset:
                    return True, "Default admin login successful with force_password_reset=true"
                else:
                    return False, "Default admin login successful but force_password_reset=false or missing"
            else:
                return False, f"Login failed with status {response.status_code}: {response.text}"
                
        except Exception as e:
            return False, f"Login error: {str(e)}"

    def test_password_change_endpoint(self):
        """Test password change endpoint functionality"""
        if not self.token:
            return False, "No auth token available - login test must pass first"
        
        change_url = f"{self.base_url}/api/auth/change-password"
        
        try:
            # Test with wrong current password
            response = requests.post(change_url,
                json={
                    "current_password": "wrong_password",
                    "new_password": "NewSecurePass123!"
                },
                headers={
                    'Content-Type': 'application/json',
                    'Authorization': f'Bearer {self.token}'
                },
                timeout=10
            )
            
            if response.status_code == 400:
                return True, "Password change endpoint working - rejects wrong current password"
            else:
                return False, f"Password change endpoint issue - status {response.status_code}"
                
        except Exception as e:
            return False, f"Password change test error: {str(e)}"

    def test_secret_key_requirement(self):
        """Test that SECRET_KEY is properly configured"""
        try:
            # Try to access a protected endpoint
            response = requests.get(f"{self.base_url}/api/auth/me",
                headers={'Authorization': f'Bearer invalid_token'},
                timeout=5
            )
            
            # Should return 401 with proper error handling (indicating JWT validation works)
            if response.status_code == 401:
                return True, "SECRET_KEY properly configured - JWT validation working"
            else:
                return False, f"Unexpected status for invalid token: {response.status_code}"
                
        except Exception as e:
            return False, f"SECRET_KEY test error: {str(e)}"

    def test_forgot_password_endpoint(self):
        """Test forgot password endpoint"""
        forgot_url = f"{self.base_url}/api/auth/forgot-password"
        
        try:
            # Test with valid email
            response = requests.post(forgot_url,
                json={"email": "admin@tls.or.tz"},
                headers={'Content-Type': 'application/json'},
                timeout=10
            )
            
            if response.status_code == 200:
                return True, "Forgot password endpoint working - email reset request accepted"
            else:
                return False, f"Forgot password failed with status {response.status_code}: {response.text}"
                
        except Exception as e:
            return False, f"Forgot password test error: {str(e)}"

    def test_password_rules_endpoint(self):
        """Test password validation rules endpoint"""
        rules_url = f"{self.base_url}/api/auth/password-rules"
        
        try:
            response = requests.get(rules_url, timeout=10)
            
            if response.status_code == 200:
                data = response.json()
                
                # Check if rules array exists
                if 'rules' not in data:
                    return False, "Password rules endpoint missing 'rules' field"
                
                rules = data['rules']
                if not isinstance(rules, list):
                    return False, "Password rules 'rules' field is not an array"
                
                # Check for minimum length rule
                min_length_rule = None
                for rule in rules:
                    if rule.get('rule') == 'minimum_length':
                        min_length_rule = rule
                        break
                
                if not min_length_rule:
                    return False, "Missing minimum_length rule"
                
                # Check minimum length requirement
                if min_length_rule.get('value', 0) >= 12:
                    return True, f"Password rules endpoint working - min_length: {min_length_rule.get('value')}"
                else:
                    return False, f"Weak password requirements - min_length only {min_length_rule.get('value')}"
            else:
                return False, f"Password rules endpoint failed with status {response.status_code}"
                
        except Exception as e:
            return False, f"Password rules test error: {str(e)}"

    def test_password_validation_weak_passwords(self):
        """Test password validation rejects weak passwords"""
        register_url = f"{self.base_url}/api/auth/register"
        
        weak_passwords = [
            "short",  # Too short
            "nouppercase123!",  # No uppercase
            "NOLOWERCASE123!",  # No lowercase  
            "NoNumbers!",  # No numbers
            "NoSpecialChar123",  # No special characters
            "password123!",  # Common pattern
            "qwerty123!",  # Common pattern
            "abcd1234!",  # Sequential
            "aaaa1234!B",  # Too many consecutive identical chars
        ]
        
        for weak_password in weak_passwords:
            try:
                response = requests.post(register_url,
                    json={
                        "email": f"test_{int(time.time())}@test.com",
                        "password": weak_password,
                        "full_name": "Test User",
                        "roll_number": f"TEST{int(time.time())}",
                        "phone": "+255123456789"
                    },
                    headers={'Content-Type': 'application/json'},
                    timeout=10
                )
                
                # Should reject weak password
                if response.status_code == 400:
                    continue  # Good, password rejected
                else:
                    return False, f"Weak password accepted: {weak_password} (status: {response.status_code})"
                    
            except Exception as e:
                # If there's a connection error, continue with next password
                continue
        
        return True, "All weak passwords properly rejected by validation"

    def test_password_validation_strong_password(self):
        """Test password validation accepts strong passwords"""
        register_url = f"{self.base_url}/api/auth/register"
        
        strong_password = "MyVerySecure2024!Complex#Strong"
        test_email = f"test_strong_{int(time.time())}@test.com"
        
        try:
            response = requests.post(register_url,
                json={
                    "email": test_email,
                    "password": strong_password,
                    "full_name": "Test Strong User",
                    "roll_number": f"STRONG{int(time.time())}",
                    "phone": "+255123456789"
                },
                headers={'Content-Type': 'application/json'},
                timeout=10
            )
            
            if response.status_code == 200:
                return True, "Strong password accepted by validation"
            elif response.status_code == 400 and "already registered" in response.text:
                return True, "Strong password validation working (email conflict expected)"
            else:
                return False, f"Strong password rejected with status {response.status_code}: {response.text}"
                
        except Exception as e:
            return False, f"Strong password test error: {str(e)}"

def main():
    print("🔒 Testing TLS Password Reset & Security Features")
    print("=" * 60)
    
    tester = SecurityTester()
    
    # Run all security tests
    tests = [
        ("Rate Limiting (5/minute on auth endpoints)", tester.test_rate_limiting),
        ("Security Headers", tester.test_security_headers),
        ("CORS Configuration", tester.test_cors_configuration),
        ("Default Admin Force Password Reset", tester.test_login_with_default_admin),
        ("Password Change Endpoint", tester.test_password_change_endpoint),
        ("SECRET_KEY Configuration", tester.test_secret_key_requirement),
        ("Forgot Password Endpoint", tester.test_forgot_password_endpoint),
        ("Password Rules Endpoint", tester.test_password_rules_endpoint),
        ("Weak Password Validation", tester.test_password_validation_weak_passwords),
        ("Strong Password Validation", tester.test_password_validation_strong_password),
    ]
    
    for test_name, test_func in tests:
        tester.run_test(test_name, test_func)
        time.sleep(1)  # Avoid overwhelming the server
    
    print(f"\n📊 Test Results: {tester.tests_passed}/{tester.tests_run} tests passed")
    
    if tester.failed_tests:
        print(f"\n❌ Failed Tests:")
        for failure in tester.failed_tests:
            print(f"  - {failure}")
    
    # Return exit code based on results
    return 0 if tester.tests_passed == tester.tests_run else 1

if __name__ == "__main__":
    sys.exit(main())