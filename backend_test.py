import requests
import sys
import json
from datetime import datetime

class TLSAPITester:
    def __init__(self, base_url="https://pdf-positioning-test.preview.emergentagent.com/api"):
        self.base_url = base_url
        self.token = None
        self.admin_token = None
        self.tests_run = 0
        self.tests_passed = 0
        self.test_advocate_id = None
        self.test_order_id = None
        self.test_stamp_id = None

    def run_test(self, name, method, endpoint, expected_status, data=None, headers=None, use_admin=False):
        """Run a single API test"""
        url = f"{self.base_url}/{endpoint}"
        test_headers = {'Content-Type': 'application/json'}
        
        # Add auth token if available
        token_to_use = self.admin_token if use_admin else self.token
        if token_to_use:
            test_headers['Authorization'] = f'Bearer {token_to_use}'
        
        if headers:
            test_headers.update(headers)

        self.tests_run += 1
        print(f"\n🔍 Testing {name}...")
        print(f"   URL: {url}")
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=test_headers)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=test_headers)
            elif method == 'PUT':
                response = requests.put(url, json=data, headers=test_headers)

            success = response.status_code == expected_status
            if success:
                self.tests_passed += 1
                print(f"✅ Passed - Status: {response.status_code}")
                try:
                    return success, response.json()
                except:
                    return success, {}
            else:
                print(f"❌ Failed - Expected {expected_status}, got {response.status_code}")
                try:
                    error_detail = response.json()
                    print(f"   Error: {error_detail}")
                except:
                    print(f"   Response: {response.text}")
                return False, {}

        except Exception as e:
            print(f"❌ Failed - Error: {str(e)}")
            return False, {}

    def test_health_check(self):
        """Test health endpoint"""
        success, response = self.run_test(
            "Health Check",
            "GET",
            "health",
            200
        )
        return success

    def test_admin_login(self):
        """Test admin login"""
        success, response = self.run_test(
            "Admin Login",
            "POST",
            "auth/login",
            200,
            data={"email": "admin@tls.or.tz", "password": "TLS@Admin2024"}
        )
        if success and 'access_token' in response:
            self.admin_token = response['access_token']
            print(f"   Admin token obtained")
            return True
        return False

    def test_advocate_registration(self):
        """Test advocate registration"""
        timestamp = datetime.now().strftime('%H%M%S')
        test_data = {
            "email": f"test_advocate_{timestamp}@example.com",
            "password": "TestPass123!",
            "full_name": f"Test Advocate {timestamp}",
            "roll_number": f"ADV/2024/{timestamp}",
            "phone": f"+255700{timestamp}",
            "region": "Dar es Salaam"
        }
        
        success, response = self.run_test(
            "Advocate Registration",
            "POST",
            "auth/register",
            200,
            data=test_data
        )
        if success and 'access_token' in response:
            self.token = response['access_token']
            print(f"   Advocate token obtained")
            return True
        return False

    def test_get_profile(self):
        """Test getting current user profile"""
        success, response = self.run_test(
            "Get Profile",
            "GET",
            "auth/me",
            200
        )
        if success and 'id' in response:
            self.test_advocate_id = response['id']
            print(f"   Advocate ID: {self.test_advocate_id}")
        return success

    def test_update_profile(self):
        """Test updating profile"""
        success, response = self.run_test(
            "Update Profile",
            "PUT",
            "profile",
            200,
            data={"firm_affiliation": "Test Law Firm"}
        )
        return success

    def test_get_stamp_types(self):
        """Test getting stamp types"""
        success, response = self.run_test(
            "Get Stamp Types",
            "GET",
            "stamp-types",
            200
        )
        return success

    def test_create_stamp_order(self):
        """Test creating a stamp order"""
        success, response = self.run_test(
            "Create Stamp Order",
            "POST",
            "orders",
            200,
            data={
                "stamp_type_id": "advocate_official",
                "quantity": 1,
                "delivery_address": "123 Test Street, Dar es Salaam"
            }
        )
        if success and 'id' in response:
            self.test_order_id = response['id']
            print(f"   Order ID: {self.test_order_id}")
        return success

    def test_get_orders(self):
        """Test getting orders"""
        success, response = self.run_test(
            "Get Orders",
            "GET",
            "orders",
            200
        )
        return success

    def test_create_digital_stamp(self):
        """Test creating a digital stamp"""
        success, response = self.run_test(
            "Create Digital Stamp",
            "POST",
            "digital-stamps",
            200,
            data={
                "stamp_type": "official",
                "document_reference": "Test Document #123"
            }
        )
        if success and 'stamp_id' in response:
            self.test_stamp_id = response['stamp_id']
            print(f"   Stamp ID: {self.test_stamp_id}")
        return success

    def test_get_digital_stamps(self):
        """Test getting digital stamps"""
        success, response = self.run_test(
            "Get Digital Stamps",
            "GET",
            "digital-stamps",
            200
        )
        return success

    def test_verify_stamp(self):
        """Test stamp verification"""
        if not self.test_stamp_id:
            print("⚠️  Skipping stamp verification - no stamp ID available")
            return True
            
        success, response = self.run_test(
            "Verify Stamp",
            "GET",
            f"verify/stamp/{self.test_stamp_id}",
            200
        )
        return success

    def test_verify_advocate(self):
        """Test advocate verification by roll number"""
        success, response = self.run_test(
            "Verify Advocate",
            "GET",
            "verify/advocate/ADV001",  # Using a test roll number
            200
        )
        return success

    def test_admin_stats(self):
        """Test admin statistics"""
        success, response = self.run_test(
            "Admin Statistics",
            "GET",
            "admin/stats",
            200,
            use_admin=True
        )
        return success

    def test_admin_get_advocates(self):
        """Test admin getting all advocates"""
        success, response = self.run_test(
            "Admin Get Advocates",
            "GET",
            "admin/advocates",
            200,
            use_admin=True
        )
        return success

    def test_payment_flow(self):
        """Test payment initiation and confirmation"""
        if not self.test_order_id:
            print("⚠️  Skipping payment test - no order ID available")
            return True

        # Test payment initiation
        success, response = self.run_test(
            "Initiate Payment",
            "POST",
            "payments/initiate",
            200,
            data={
                "order_id": self.test_order_id,
                "payment_method": "mobile_money",
                "provider": "mpesa",
                "phone_number": "+255700123456"
            }
        )
        
        if not success:
            return False

        payment_ref = response.get('payment_ref')
        if not payment_ref:
            print("❌ No payment reference returned")
            return False

        # Test payment confirmation
        success, response = self.run_test(
            "Confirm Payment",
            "POST",
            f"payments/confirm/{payment_ref}",
            200
        )
        return success

def main():
    print("🚀 Starting TLS API Testing...")
    print("=" * 50)
    
    tester = TLSAPITester()
    
    # Test sequence
    tests = [
        ("Health Check", tester.test_health_check),
        ("Admin Login", tester.test_admin_login),
        ("Advocate Registration", tester.test_advocate_registration),
        ("Get Profile", tester.test_get_profile),
        ("Update Profile", tester.test_update_profile),
        ("Get Stamp Types", tester.test_get_stamp_types),
        ("Create Stamp Order", tester.test_create_stamp_order),
        ("Get Orders", tester.test_get_orders),
        ("Create Digital Stamp", tester.test_create_digital_stamp),
        ("Get Digital Stamps", tester.test_get_digital_stamps),
        ("Verify Stamp", tester.test_verify_stamp),
        ("Verify Advocate", tester.test_verify_advocate),
        ("Admin Statistics", tester.test_admin_stats),
        ("Admin Get Advocates", tester.test_admin_get_advocates),
        ("Payment Flow", tester.test_payment_flow),
    ]
    
    failed_tests = []
    
    for test_name, test_func in tests:
        try:
            if not test_func():
                failed_tests.append(test_name)
        except Exception as e:
            print(f"❌ {test_name} - Exception: {str(e)}")
            failed_tests.append(test_name)
    
    # Print results
    print("\n" + "=" * 50)
    print("📊 TEST RESULTS")
    print("=" * 50)
    print(f"Tests run: {tester.tests_run}")
    print(f"Tests passed: {tester.tests_passed}")
    print(f"Tests failed: {len(failed_tests)}")
    print(f"Success rate: {(tester.tests_passed/tester.tests_run*100):.1f}%" if tester.tests_run > 0 else "0%")
    
    if failed_tests:
        print(f"\n❌ Failed tests:")
        for test in failed_tests:
            print(f"   - {test}")
    else:
        print(f"\n✅ All tests passed!")
    
    return 0 if len(failed_tests) == 0 else 1

if __name__ == "__main__":
    sys.exit(main())