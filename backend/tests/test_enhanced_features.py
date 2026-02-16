"""
TLS Enhanced Document Verification System - API Tests
Tests for new features: document metadata, branded QR, earnings dashboard
"""
import pytest
import requests
import os
import uuid
import io

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
TEST_ADVOCATE_CREDS = {"email": "testadvocate@tls.or.tz", "password": "Test@1234"}


def get_advocate_token():
    """Get or create test advocate token"""
    response = requests.post(f"{BASE_URL}/api/auth/login", json=TEST_ADVOCATE_CREDS)
    if response.status_code == 200:
        return response.json()["access_token"]
    
    # Register if not exists
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
        return reg_response.json()["access_token"]
    
    # Try login again after registration
    response = requests.post(f"{BASE_URL}/api/auth/login", json=TEST_ADVOCATE_CREDS)
    return response.json()["access_token"] if response.status_code == 200 else None


class TestDocumentStampWithMetadata:
    """Tests for enhanced document stamping with metadata fields"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        self.token = get_advocate_token()
        assert self.token, "Failed to get advocate token"
        self.headers = {"Authorization": f"Bearer {self.token}"}
    
    def test_document_stamp_with_all_new_fields(self):
        """Test POST /api/documents/stamp with document_type, description, recipient_name, recipient_org"""
        # Create a simple PDF-like content
        pdf_content = b"%PDF-1.4 test document content for stamping"
        
        files = {"file": ("test_contract.pdf", io.BytesIO(pdf_content), "application/pdf")}
        data = {
            "stamp_type": "official",
            "document_name": "Test Contract Agreement",
            "document_type": "contract",
            "description": "Employment contract for testing purposes",
            "recipient_name": "John Doe",
            "recipient_org": "ABC Corporation Ltd",
            "brand_color": "#10B981",
            "show_advocate_name": "true",
            "show_tls_logo": "true",
            "stamp_position": '{"page": 1, "x": 400, "y": 50, "width": 150, "height": 150}'
        }
        
        response = requests.post(
            f"{BASE_URL}/api/documents/stamp",
            files=files,
            data=data,
            headers=self.headers
        )
        
        assert response.status_code == 200, f"Document stamp failed: {response.text}"
        result = response.json()
        
        # Verify response contains expected fields
        assert "stamp_id" in result, "Missing stamp_id in response"
        assert "qr_code_data" in result, "Missing qr_code_data in response"
        assert "stamped_document" in result, "Missing stamped_document in response"
        assert result["stamp_id"].startswith("TLS-"), f"Invalid stamp_id format: {result['stamp_id']}"
        
        print(f"✓ Document stamped successfully with ID: {result['stamp_id']}")
        return result["stamp_id"]
    
    def test_document_stamp_with_different_document_types(self):
        """Test stamping with various document types"""
        document_types = ["contract", "affidavit", "power_of_attorney", "deed", "court_filing", "legal_opinion"]
        
        for doc_type in document_types:
            pdf_content = f"%PDF-1.4 test {doc_type} document".encode()
            files = {"file": (f"test_{doc_type}.pdf", io.BytesIO(pdf_content), "application/pdf")}
            data = {
                "stamp_type": "official",
                "document_type": doc_type,
                "document_name": f"Test {doc_type.replace('_', ' ').title()}",
                "description": f"Test description for {doc_type}",
                "recipient_name": "Test Recipient",
                "recipient_org": "Test Organization"
            }
            
            response = requests.post(
                f"{BASE_URL}/api/documents/stamp",
                files=files,
                data=data,
                headers=self.headers
            )
            
            assert response.status_code == 200, f"Failed for document type {doc_type}: {response.text}"
            print(f"✓ Document type '{doc_type}' stamped successfully")
    
    def test_document_stamp_with_custom_brand_color(self):
        """Test branded QR code generation with custom colors"""
        colors = ["#10B981", "#3B82F6", "#8B5CF6", "#EF4444", "#F59E0B"]
        
        for color in colors:
            pdf_content = b"%PDF-1.4 test branded document"
            files = {"file": ("test_branded.pdf", io.BytesIO(pdf_content), "application/pdf")}
            data = {
                "stamp_type": "official",
                "document_type": "contract",
                "brand_color": color,
                "show_advocate_name": "true",
                "show_tls_logo": "true"
            }
            
            response = requests.post(
                f"{BASE_URL}/api/documents/stamp",
                files=files,
                data=data,
                headers=self.headers
            )
            
            assert response.status_code == 200, f"Failed for brand color {color}: {response.text}"
            result = response.json()
            assert "qr_code_data" in result, "Missing QR code data"
            assert len(result["qr_code_data"]) > 100, "QR code data seems too short"
            print(f"✓ Branded QR with color {color} generated successfully")
    
    def test_document_stamp_branding_options(self):
        """Test branding options (show_advocate_name, show_tls_logo)"""
        branding_combos = [
            ("true", "true"),
            ("true", "false"),
            ("false", "true"),
            ("false", "false")
        ]
        
        for show_name, show_logo in branding_combos:
            pdf_content = b"%PDF-1.4 test branding options"
            files = {"file": ("test_branding.pdf", io.BytesIO(pdf_content), "application/pdf")}
            data = {
                "stamp_type": "official",
                "show_advocate_name": show_name,
                "show_tls_logo": show_logo
            }
            
            response = requests.post(
                f"{BASE_URL}/api/documents/stamp",
                files=files,
                data=data,
                headers=self.headers
            )
            
            assert response.status_code == 200, f"Failed for branding combo ({show_name}, {show_logo})"
            print(f"✓ Branding options (name={show_name}, logo={show_logo}) work correctly")


class TestVerificationWithExtendedFields:
    """Tests for verification endpoint returning extended document info"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        self.token = get_advocate_token()
        assert self.token, "Failed to get advocate token"
        self.headers = {"Authorization": f"Bearer {self.token}"}
    
    def test_verify_stamp_returns_extended_fields(self):
        """Test GET /api/verify/stamp/{stamp_id} returns document_type, recipient info"""
        # First create a stamp with all metadata
        pdf_content = b"%PDF-1.4 test verification document"
        files = {"file": ("verify_test.pdf", io.BytesIO(pdf_content), "application/pdf")}
        data = {
            "stamp_type": "official",
            "document_name": "Verification Test Document",
            "document_type": "affidavit",
            "description": "Test affidavit for verification testing",
            "recipient_name": "Jane Smith",
            "recipient_org": "XYZ Legal Services"
        }
        
        stamp_response = requests.post(
            f"{BASE_URL}/api/documents/stamp",
            files=files,
            data=data,
            headers=self.headers
        )
        
        assert stamp_response.status_code == 200, f"Failed to create stamp: {stamp_response.text}"
        stamp_id = stamp_response.json()["stamp_id"]
        
        # Now verify the stamp (public endpoint - no auth needed)
        verify_response = requests.get(f"{BASE_URL}/api/verify/stamp/{stamp_id}")
        
        assert verify_response.status_code == 200, f"Verification failed: {verify_response.text}"
        result = verify_response.json()
        
        # Check extended fields are returned
        assert result["valid"] == True, "Stamp should be valid"
        assert result["stamp_id"] == stamp_id, "Stamp ID mismatch"
        assert result["document_name"] == "Verification Test Document", "Document name mismatch"
        assert result["document_type"] == "affidavit", f"Document type mismatch: {result.get('document_type')}"
        assert result["description"] == "Test affidavit for verification testing", "Description mismatch"
        assert result["recipient_name"] == "Jane Smith", f"Recipient name mismatch: {result.get('recipient_name')}"
        assert result["recipient_org"] == "XYZ Legal Services", f"Recipient org mismatch: {result.get('recipient_org')}"
        assert "advocate_name" in result, "Missing advocate_name"
        assert "advocate_roll_number" in result, "Missing advocate_roll_number"
        
        print(f"✓ Verification returns all extended fields correctly")
        print(f"  - Document Type: {result['document_type']}")
        print(f"  - Recipient: {result['recipient_name']} ({result['recipient_org']})")
    
    def test_verify_invalid_stamp_id(self):
        """Test verification with invalid stamp ID"""
        response = requests.get(f"{BASE_URL}/api/verify/stamp/INVALID-STAMP-ID")
        
        assert response.status_code == 200, "Should return 200 with valid=false"
        result = response.json()
        assert result["valid"] == False, "Invalid stamp should return valid=false"
        assert "not found" in result["message"].lower() or "fraudulent" in result["message"].lower()
        print(f"✓ Invalid stamp ID handled correctly: {result['message']}")


class TestEarningsDashboard:
    """Tests for advocate earnings dashboard API"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        self.token = get_advocate_token()
        assert self.token, "Failed to get advocate token"
        self.headers = {"Authorization": f"Bearer {self.token}"}
    
    def test_earnings_summary_endpoint(self):
        """Test GET /api/earnings/summary returns earnings data"""
        response = requests.get(
            f"{BASE_URL}/api/earnings/summary",
            headers=self.headers
        )
        
        assert response.status_code == 200, f"Earnings summary failed: {response.text}"
        result = response.json()
        
        # Check expected fields
        assert "total_earnings" in result, "Missing total_earnings"
        assert "monthly_earnings" in result, "Missing monthly_earnings"
        assert "total_verifications" in result, "Missing total_verifications"
        
        # Values should be numbers
        assert isinstance(result["total_earnings"], (int, float)), "total_earnings should be numeric"
        assert isinstance(result["monthly_earnings"], (int, float)), "monthly_earnings should be numeric"
        assert isinstance(result["total_verifications"], (int, float)), "total_verifications should be numeric"
        
        print(f"✓ Earnings summary returned successfully:")
        print(f"  - Total Earnings: {result['total_earnings']} TZS")
        print(f"  - Monthly Earnings: {result['monthly_earnings']} TZS")
        print(f"  - Total Verifications: {result['total_verifications']}")
    
    def test_earnings_requires_authentication(self):
        """Test earnings endpoint requires authentication"""
        response = requests.get(f"{BASE_URL}/api/earnings/summary")
        
        assert response.status_code in [401, 403], f"Should require auth, got: {response.status_code}"
        print(f"✓ Earnings endpoint properly requires authentication")


class TestDocumentStampsList:
    """Tests for document stamps list endpoint"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        self.token = get_advocate_token()
        assert self.token, "Failed to get advocate token"
        self.headers = {"Authorization": f"Bearer {self.token}"}
    
    def test_get_document_stamps_list(self):
        """Test GET /api/documents/stamps returns list with new fields"""
        response = requests.get(
            f"{BASE_URL}/api/documents/stamps",
            headers=self.headers
        )
        
        assert response.status_code == 200, f"Failed to get stamps list: {response.text}"
        stamps = response.json()
        
        assert isinstance(stamps, list), "Response should be a list"
        print(f"✓ Retrieved {len(stamps)} document stamps")
        
        # If there are stamps, check they have the new fields
        if stamps:
            stamp = stamps[0]
            expected_fields = ["stamp_id", "document_name", "status", "created_at"]
            for field in expected_fields:
                assert field in stamp, f"Missing field: {field}"
            print(f"✓ Stamps contain expected fields")


class TestStampTypes:
    """Tests for stamp types endpoint"""
    
    def test_get_stamp_types(self):
        """Test GET /api/stamp-types returns available stamp types"""
        response = requests.get(f"{BASE_URL}/api/stamp-types")
        
        assert response.status_code == 200, f"Failed to get stamp types: {response.text}"
        types = response.json()
        
        assert isinstance(types, list), "Response should be a list"
        assert len(types) > 0, "Should have at least one stamp type"
        
        # Check structure
        for st in types:
            assert "id" in st, "Missing id"
            assert "name" in st, "Missing name"
            assert "price" in st, "Missing price"
        
        print(f"✓ Retrieved {len(types)} stamp types")
        for st in types:
            print(f"  - {st['name']}: {st['price']} {st.get('currency', 'TZS')}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
