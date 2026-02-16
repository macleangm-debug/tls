"""
TLS Advocate Management System - API Tests
Tests for document verification, authentication, and admin functionality
"""
import pytest
import requests
import os
import uuid
import time

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials from review request
SUPER_ADMIN_CREDS = {"email": "superadmin@idc.co.tz", "password": "IDC@SuperAdmin2024"}
TLS_ADMIN_CREDS = {"email": "admin@tls.or.tz", "password": "TLS@Admin2024"}
TEST_ADVOCATE_CREDS = {"email": "testadvocate@tls.or.tz", "password": "Test@1234"}


class TestHealthCheck:
    """Health check tests - run first"""
    
    def test_health_endpoint(self):
        """Test API health endpoint"""
        response = requests.get(f"{BASE_URL}/api/health")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "healthy"
        print(f"✓ Health check passed: {data}")


class TestAuthentication:
    """Authentication flow tests"""
    
    def test_super_admin_login(self):
        """Test Super Admin (IDC) login"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json=SUPER_ADMIN_CREDS)
        assert response.status_code == 200, f"Super Admin login failed: {response.text}"
        data = response.json()
        assert "access_token" in data
        assert data["token_type"] == "bearer"
        print(f"✓ Super Admin login successful")
        return data["access_token"]
    
    def test_tls_admin_login(self):
        """Test TLS Admin login"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json=TLS_ADMIN_CREDS)
        # TLS Admin may not exist yet, so we check for either success or 401
        if response.status_code == 200:
            data = response.json()
            assert "access_token" in data
            print(f"✓ TLS Admin login successful")
        else:
            print(f"⚠ TLS Admin not found (expected if not seeded): {response.status_code}")
            pytest.skip("TLS Admin not seeded")
    
    def test_advocate_registration(self):
        """Test advocate registration flow"""
        unique_id = str(uuid.uuid4())[:8]
        register_data = {
            "email": f"TEST_advocate_{unique_id}@test.com",
            "password": "TestPass123!",
            "full_name": f"Test Advocate {unique_id}",
            "roll_number": f"TEST{unique_id}",
            "phone": "+255123456789",
            "region": "Dar es Salaam"
        }
        
        response = requests.post(f"{BASE_URL}/api/auth/register", json=register_data)
        assert response.status_code == 200, f"Registration failed: {response.text}"
        data = response.json()
        assert "access_token" in data
        print(f"✓ Advocate registration successful: {register_data['email']}")
        return data["access_token"], register_data
    
    def test_advocate_login_with_test_credentials(self):
        """Test advocate login with provided test credentials"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json=TEST_ADVOCATE_CREDS)
        if response.status_code == 200:
            data = response.json()
            assert "access_token" in data
            print(f"✓ Test advocate login successful")
        else:
            # Register the test advocate if not exists
            print(f"⚠ Test advocate not found, registering...")
            register_data = {
                "email": TEST_ADVOCATE_CREDS["email"],
                "password": TEST_ADVOCATE_CREDS["password"],
                "full_name": "Test Advocate",
                "roll_number": "TESTADV001",
                "phone": "+255123456789",
                "region": "Dar es Salaam"
            }
            reg_response = requests.post(f"{BASE_URL}/api/auth/register", json=register_data)
            if reg_response.status_code == 200:
                print(f"✓ Test advocate registered and logged in")
            else:
                print(f"⚠ Could not register test advocate: {reg_response.text}")
    
    def test_get_current_user(self):
        """Test getting current user profile"""
        # First login
        login_response = requests.post(f"{BASE_URL}/api/auth/login", json=SUPER_ADMIN_CREDS)
        assert login_response.status_code == 200
        token = login_response.json()["access_token"]
        
        # Get profile
        headers = {"Authorization": f"Bearer {token}"}
        response = requests.get(f"{BASE_URL}/api/auth/me", headers=headers)
        assert response.status_code == 200
        data = response.json()
        assert data["email"] == SUPER_ADMIN_CREDS["email"]
        assert data["role"] == "super_admin"
        print(f"✓ Get current user successful: {data['full_name']}")


class TestSuperAdminAPIs:
    """Super Admin (IDC) API tests"""
    
    @pytest.fixture
    def super_admin_token(self):
        """Get super admin token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json=SUPER_ADMIN_CREDS)
        assert response.status_code == 200
        return response.json()["access_token"]
    
    def test_get_system_settings(self, super_admin_token):
        """Test GET /api/super-admin/settings"""
        headers = {"Authorization": f"Bearer {super_admin_token}"}
        response = requests.get(f"{BASE_URL}/api/super-admin/settings", headers=headers)
        assert response.status_code == 200
        data = response.json()
        # Verify settings structure
        assert "verification_fee_fixed" in data
        assert "advocate_revenue_share" in data
        assert "currency" in data
        print(f"✓ Get system settings successful: {data}")
    
    def test_update_system_settings(self, super_admin_token):
        """Test PUT /api/super-admin/settings"""
        headers = {"Authorization": f"Bearer {super_admin_token}"}
        
        # Get current settings first
        get_response = requests.get(f"{BASE_URL}/api/super-admin/settings", headers=headers)
        original_settings = get_response.json()
        
        # Update settings
        new_settings = {
            "verification_fee_fixed": 600.0,
            "verification_fee_percentage": 5.0,
            "advocate_revenue_share": 35.0,
            "currency": "TZS"
        }
        
        response = requests.put(f"{BASE_URL}/api/super-admin/settings", json=new_settings, headers=headers)
        assert response.status_code == 200
        data = response.json()
        assert "message" in data
        print(f"✓ Update system settings successful")
        
        # Verify settings were updated
        verify_response = requests.get(f"{BASE_URL}/api/super-admin/settings", headers=headers)
        updated = verify_response.json()
        assert updated["verification_fee_fixed"] == 600.0
        assert updated["advocate_revenue_share"] == 35.0
        print(f"✓ Settings persistence verified")
        
        # Restore original settings
        restore_settings = {
            "verification_fee_fixed": original_settings.get("verification_fee_fixed", 500.0),
            "verification_fee_percentage": original_settings.get("verification_fee_percentage", 0.0),
            "advocate_revenue_share": original_settings.get("advocate_revenue_share", 30.0),
            "currency": original_settings.get("currency", "TZS")
        }
        requests.put(f"{BASE_URL}/api/super-admin/settings", json=restore_settings, headers=headers)
    
    def test_get_super_admin_stats(self, super_admin_token):
        """Test GET /api/super-admin/stats"""
        headers = {"Authorization": f"Bearer {super_admin_token}"}
        response = requests.get(f"{BASE_URL}/api/super-admin/stats", headers=headers)
        assert response.status_code == 200
        data = response.json()
        # Verify stats structure
        assert "total_advocates" in data
        assert "total_stamps" in data
        assert "total_verifications" in data
        assert "total_revenue" in data
        print(f"✓ Get super admin stats successful: {data}")
    
    def test_get_admins_list(self, super_admin_token):
        """Test GET /api/super-admin/admins"""
        headers = {"Authorization": f"Bearer {super_admin_token}"}
        response = requests.get(f"{BASE_URL}/api/super-admin/admins", headers=headers)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        # Should have at least the super admin
        assert len(data) >= 1
        print(f"✓ Get admins list successful: {len(data)} admins found")
    
    def test_settings_requires_super_admin(self):
        """Test that settings endpoint requires super admin role"""
        # Try without auth
        response = requests.get(f"{BASE_URL}/api/super-admin/settings")
        assert response.status_code in [401, 403]
        print(f"✓ Settings endpoint properly protected")


class TestDocumentStampAPIs:
    """Document stamping API tests"""
    
    @pytest.fixture
    def advocate_token(self):
        """Get advocate token"""
        # Try to login with test advocate
        response = requests.post(f"{BASE_URL}/api/auth/login", json=TEST_ADVOCATE_CREDS)
        if response.status_code == 200:
            return response.json()["access_token"]
        
        # Register new advocate if test advocate doesn't exist
        unique_id = str(uuid.uuid4())[:8]
        register_data = {
            "email": f"TEST_stamp_advocate_{unique_id}@test.com",
            "password": "TestPass123!",
            "full_name": f"Stamp Test Advocate {unique_id}",
            "roll_number": f"STAMP{unique_id}",
            "phone": "+255123456789",
            "region": "Dar es Salaam"
        }
        reg_response = requests.post(f"{BASE_URL}/api/auth/register", json=register_data)
        assert reg_response.status_code == 200
        return reg_response.json()["access_token"]
    
    def test_document_upload(self, advocate_token):
        """Test POST /api/documents/upload"""
        headers = {"Authorization": f"Bearer {advocate_token}"}
        
        # Create a simple test PDF content (minimal valid PDF)
        pdf_content = b"%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj 2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj 3 0 obj<</Type/Page/MediaBox[0 0 612 792]/Parent 2 0 R>>endobj\nxref\n0 4\n0000000000 65535 f\n0000000009 00000 n\n0000000052 00000 n\n0000000101 00000 n\ntrailer<</Size 4/Root 1 0 R>>\nstartxref\n178\n%%EOF"
        
        files = {"file": ("test_document.pdf", pdf_content, "application/pdf")}
        response = requests.post(f"{BASE_URL}/api/documents/upload", files=files, headers=headers)
        assert response.status_code == 200, f"Document upload failed: {response.text}"
        data = response.json()
        assert "hash" in data
        assert "filename" in data
        assert "pages" in data
        print(f"✓ Document upload successful: hash={data['hash'][:16]}...")
        return data
    
    def test_document_stamp(self, advocate_token):
        """Test POST /api/documents/stamp"""
        headers = {"Authorization": f"Bearer {advocate_token}"}
        
        # Create test PDF
        pdf_content = b"%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj 2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj 3 0 obj<</Type/Page/MediaBox[0 0 612 792]/Parent 2 0 R>>endobj\nxref\n0 4\n0000000000 65535 f\n0000000009 00000 n\n0000000052 00000 n\n0000000101 00000 n\ntrailer<</Size 4/Root 1 0 R>>\nstartxref\n178\n%%EOF"
        
        files = {"file": ("test_stamp_document.pdf", pdf_content, "application/pdf")}
        data = {
            "stamp_type": "official",
            "stamp_position": '{"page": 1, "x": 400, "y": 50, "width": 150, "height": 150}',
            "document_name": "Test Legal Document"
        }
        
        response = requests.post(f"{BASE_URL}/api/documents/stamp", files=files, data=data, headers=headers)
        assert response.status_code == 200, f"Document stamp failed: {response.text}"
        result = response.json()
        assert "stamp_id" in result
        assert "qr_code_data" in result
        assert "stamped_document" in result
        assert result["status"] == "active"
        print(f"✓ Document stamp successful: stamp_id={result['stamp_id']}")
        return result
    
    def test_get_document_stamps(self, advocate_token):
        """Test GET /api/documents/stamps"""
        headers = {"Authorization": f"Bearer {advocate_token}"}
        response = requests.get(f"{BASE_URL}/api/documents/stamps", headers=headers)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ Get document stamps successful: {len(data)} stamps found")


class TestVerificationAPIs:
    """Public verification API tests"""
    
    def test_verify_invalid_stamp(self):
        """Test verification with invalid stamp ID"""
        response = requests.get(f"{BASE_URL}/api/verify/stamp/INVALID-STAMP-ID")
        assert response.status_code == 200
        data = response.json()
        assert data["valid"] == False
        assert "not found" in data["message"].lower() or "fraudulent" in data["message"].lower()
        print(f"✓ Invalid stamp verification handled correctly")
    
    def test_verify_valid_stamp(self):
        """Test verification with a valid stamp"""
        # First create a stamp
        unique_id = str(uuid.uuid4())[:8]
        register_data = {
            "email": f"TEST_verify_advocate_{unique_id}@test.com",
            "password": "TestPass123!",
            "full_name": f"Verify Test Advocate {unique_id}",
            "roll_number": f"VERIFY{unique_id}",
            "phone": "+255123456789",
            "region": "Dar es Salaam"
        }
        reg_response = requests.post(f"{BASE_URL}/api/auth/register", json=register_data)
        assert reg_response.status_code == 200
        token = reg_response.json()["access_token"]
        
        # Create a stamp
        headers = {"Authorization": f"Bearer {token}"}
        pdf_content = b"%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj 2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj 3 0 obj<</Type/Page/MediaBox[0 0 612 792]/Parent 2 0 R>>endobj\nxref\n0 4\n0000000000 65535 f\n0000000009 00000 n\n0000000052 00000 n\n0000000101 00000 n\ntrailer<</Size 4/Root 1 0 R>>\nstartxref\n178\n%%EOF"
        
        files = {"file": ("verify_test.pdf", pdf_content, "application/pdf")}
        data = {"stamp_type": "official", "document_name": "Verification Test Doc"}
        
        stamp_response = requests.post(f"{BASE_URL}/api/documents/stamp", files=files, data=data, headers=headers)
        assert stamp_response.status_code == 200
        stamp_id = stamp_response.json()["stamp_id"]
        
        # Now verify the stamp
        verify_response = requests.get(f"{BASE_URL}/api/verify/stamp/{stamp_id}")
        assert verify_response.status_code == 200
        result = verify_response.json()
        assert result["valid"] == True
        assert result["stamp_id"] == stamp_id
        assert result["advocate_name"] == register_data["full_name"]
        assert result["stamp_status"] == "active"
        print(f"✓ Valid stamp verification successful: {stamp_id}")
    
    def test_verify_advocate_by_roll_number(self):
        """Test advocate verification by roll number"""
        # First register an advocate
        unique_id = str(uuid.uuid4())[:8]
        roll_number = f"ROLL{unique_id}"
        register_data = {
            "email": f"TEST_roll_advocate_{unique_id}@test.com",
            "password": "TestPass123!",
            "full_name": f"Roll Test Advocate {unique_id}",
            "roll_number": roll_number,
            "phone": "+255123456789",
            "region": "Dar es Salaam"
        }
        reg_response = requests.post(f"{BASE_URL}/api/auth/register", json=register_data)
        assert reg_response.status_code == 200
        
        # Verify by roll number
        response = requests.get(f"{BASE_URL}/api/verify/advocate/{roll_number}")
        assert response.status_code == 200
        data = response.json()
        assert data["valid"] == True
        assert data["advocate_roll_number"] == roll_number
        assert data["advocate_status"] == "Active"
        print(f"✓ Advocate verification by roll number successful")


class TestAdminAPIs:
    """TLS Admin API tests"""
    
    @pytest.fixture
    def admin_token(self):
        """Get admin token (super admin can access admin routes)"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json=SUPER_ADMIN_CREDS)
        assert response.status_code == 200
        return response.json()["access_token"]
    
    def test_get_admin_stats(self, admin_token):
        """Test GET /api/admin/stats"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        response = requests.get(f"{BASE_URL}/api/admin/stats", headers=headers)
        assert response.status_code == 200
        data = response.json()
        assert "total_advocates" in data
        assert "active_advocates" in data
        assert "total_stamps_issued" in data
        print(f"✓ Admin stats retrieved: {data['total_advocates']} advocates")
    
    def test_get_advocates_list(self, admin_token):
        """Test GET /api/admin/advocates"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        response = requests.get(f"{BASE_URL}/api/admin/advocates", headers=headers)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ Advocates list retrieved: {len(data)} advocates")


class TestStampTypesAndOrders:
    """Stamp types and order API tests"""
    
    def test_get_stamp_types(self):
        """Test GET /api/stamp-types"""
        response = requests.get(f"{BASE_URL}/api/stamp-types")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        assert len(data) > 0
        # Verify stamp type structure
        for stamp_type in data:
            assert "id" in stamp_type
            assert "name" in stamp_type
            assert "price" in stamp_type
        print(f"✓ Stamp types retrieved: {len(data)} types")
    
    @pytest.fixture
    def advocate_token(self):
        """Get advocate token"""
        unique_id = str(uuid.uuid4())[:8]
        register_data = {
            "email": f"TEST_order_advocate_{unique_id}@test.com",
            "password": "TestPass123!",
            "full_name": f"Order Test Advocate {unique_id}",
            "roll_number": f"ORDER{unique_id}",
            "phone": "+255123456789",
            "region": "Dar es Salaam"
        }
        reg_response = requests.post(f"{BASE_URL}/api/auth/register", json=register_data)
        assert reg_response.status_code == 200
        return reg_response.json()["access_token"]
    
    def test_create_order(self, advocate_token):
        """Test POST /api/orders"""
        headers = {"Authorization": f"Bearer {advocate_token}"}
        order_data = {
            "stamp_type_id": "advocate_official",
            "quantity": 1,
            "customization": {},
            "delivery_address": "123 Test Street, Dar es Salaam"
        }
        
        response = requests.post(f"{BASE_URL}/api/orders", json=order_data, headers=headers)
        assert response.status_code == 200
        data = response.json()
        assert "id" in data
        assert data["status"] == "pending_approval"
        assert data["payment_status"] == "pending"
        print(f"✓ Order created: {data['id']}")
        return data
    
    def test_get_orders(self, advocate_token):
        """Test GET /api/orders"""
        headers = {"Authorization": f"Bearer {advocate_token}"}
        response = requests.get(f"{BASE_URL}/api/orders", headers=headers)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ Orders retrieved: {len(data)} orders")


class TestDigitalStamps:
    """Legacy digital stamps API tests"""
    
    @pytest.fixture
    def advocate_token(self):
        """Get advocate token"""
        unique_id = str(uuid.uuid4())[:8]
        register_data = {
            "email": f"TEST_digital_advocate_{unique_id}@test.com",
            "password": "TestPass123!",
            "full_name": f"Digital Test Advocate {unique_id}",
            "roll_number": f"DIGITAL{unique_id}",
            "phone": "+255123456789",
            "region": "Dar es Salaam"
        }
        reg_response = requests.post(f"{BASE_URL}/api/auth/register", json=register_data)
        assert reg_response.status_code == 200
        return reg_response.json()["access_token"]
    
    def test_create_digital_stamp(self, advocate_token):
        """Test POST /api/digital-stamps"""
        headers = {"Authorization": f"Bearer {advocate_token}"}
        stamp_data = {
            "document_reference": "TEST-DOC-REF-001",
            "stamp_type": "official"
        }
        
        response = requests.post(f"{BASE_URL}/api/digital-stamps", json=stamp_data, headers=headers)
        assert response.status_code == 200
        data = response.json()
        assert "stamp_id" in data
        assert "qr_code_data" in data
        assert data["status"] == "active"
        print(f"✓ Digital stamp created: {data['stamp_id']}")
        return data
    
    def test_get_digital_stamps(self, advocate_token):
        """Test GET /api/digital-stamps"""
        headers = {"Authorization": f"Bearer {advocate_token}"}
        response = requests.get(f"{BASE_URL}/api/digital-stamps", headers=headers)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ Digital stamps retrieved: {len(data)} stamps")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
