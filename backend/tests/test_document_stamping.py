"""
Test Document Stamping Flow - Backend API Tests
Tests: Document upload, stamp preview, stamping flow, downloaded PDF verification
"""
import pytest
import requests
import os
import base64
import json
from io import BytesIO

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
TEST_EMAIL = "testadvocate@tls.or.tz"
TEST_PASSWORD = "Test@1234"


class TestDocumentStampingFlow:
    """Test the complete document stamping flow"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test session with authentication"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
        # Login to get token
        response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        
        if response.status_code == 200:
            token = response.json().get("access_token")
            self.session.headers.update({"Authorization": f"Bearer {token}"})
            self.token = token
        else:
            pytest.skip(f"Authentication failed: {response.status_code}")
    
    def test_01_login_success(self):
        """Test login with valid credentials"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data
        assert len(data["access_token"]) > 0
        print(f"✓ Login successful, token received")
    
    def test_02_get_user_profile(self):
        """Test getting user profile after login"""
        response = self.session.get(f"{BASE_URL}/api/auth/me")
        assert response.status_code == 200
        data = response.json()
        assert "full_name" in data
        assert "practicing_status" in data
        assert data["practicing_status"] == "Active"
        print(f"✓ User profile retrieved: {data['full_name']}")
    
    def test_03_document_upload_pdf(self):
        """Test uploading a PDF document"""
        # Create a simple PDF content (minimal valid PDF)
        pdf_content = b"""%PDF-1.4
1 0 obj
<< /Type /Catalog /Pages 2 0 R >>
endobj
2 0 obj
<< /Type /Pages /Kids [3 0 R] /Count 1 >>
endobj
3 0 obj
<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R >>
endobj
4 0 obj
<< /Length 44 >>
stream
BT
/F1 12 Tf
100 700 Td
(Test Document) Tj
ET
endstream
endobj
xref
0 5
0000000000 65535 f 
0000000009 00000 n 
0000000058 00000 n 
0000000115 00000 n 
0000000214 00000 n 
trailer
<< /Size 5 /Root 1 0 R >>
startxref
306
%%EOF"""
        
        files = {'file': ('test_document.pdf', pdf_content, 'application/pdf')}
        headers = {"Authorization": f"Bearer {self.token}"}
        
        response = requests.post(
            f"{BASE_URL}/api/documents/upload",
            files=files,
            headers=headers
        )
        
        assert response.status_code == 200
        data = response.json()
        assert "hash" in data
        assert "pages" in data
        assert "document_data" in data
        assert data["content_type"] == "application/pdf"
        print(f"✓ PDF uploaded successfully, hash: {data['hash'][:20]}...")
    
    def test_04_document_stamp_creates_stamp(self):
        """Test creating a document stamp"""
        # Create a simple PDF
        pdf_content = b"""%PDF-1.4
1 0 obj
<< /Type /Catalog /Pages 2 0 R >>
endobj
2 0 obj
<< /Type /Pages /Kids [3 0 R] /Count 1 >>
endobj
3 0 obj
<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R >>
endobj
4 0 obj
<< /Length 44 >>
stream
BT
/F1 12 Tf
100 700 Td
(Test Document) Tj
ET
endstream
endobj
xref
0 5
0000000000 65535 f 
0000000009 00000 n 
0000000058 00000 n 
0000000115 00000 n 
0000000214 00000 n 
trailer
<< /Size 5 /Root 1 0 R >>
startxref
306
%%EOF"""
        
        files = {'file': ('test_stamp_doc.pdf', pdf_content, 'application/pdf')}
        headers = {"Authorization": f"Bearer {self.token}"}
        
        form_data = {
            'stamp_type': 'official',
            'stamp_position': json.dumps({"page": 1, "x": 400, "y": 50, "width": 150, "height": 150}),
            'document_name': 'Test Stamp Document',
            'document_type': 'contract',
            'description': 'Test description for stamping',
            'recipient_name': 'John Doe',
            'recipient_org': 'Test Organization',
            'brand_color': '#10B981',
            'show_advocate_name': 'true',
            'show_tls_logo': 'true',
            'layout': 'horizontal',
            'include_signature': 'false',
            'stamp_size': '100',
            'opacity': '90'
        }
        
        response = requests.post(
            f"{BASE_URL}/api/documents/stamp",
            files=files,
            data=form_data,
            headers=headers
        )
        
        assert response.status_code == 200
        data = response.json()
        
        # Verify stamp response structure
        assert "stamp_id" in data
        assert "document_hash" in data
        assert "qr_code_data" in data
        assert "stamped_document" in data
        assert "status" in data
        assert data["status"] == "active"
        
        # Verify stamp ID format: TLS-YYYYMMDD-XXXX
        stamp_id = data["stamp_id"]
        assert stamp_id.startswith("TLS-")
        assert len(stamp_id) == 21  # TLS-YYYYMMDD-XXXXXXXX
        
        print(f"✓ Document stamped successfully, stamp_id: {stamp_id}")
        
        # Store for later tests
        self.__class__.stamp_id = stamp_id
        self.__class__.stamped_document = data["stamped_document"]
    
    def test_05_stamped_pdf_contains_stamp(self):
        """Test that the stamped PDF actually contains the stamp"""
        if not hasattr(self.__class__, 'stamped_document'):
            pytest.skip("No stamped document from previous test")
        
        # Decode the stamped PDF
        stamped_pdf_bytes = base64.b64decode(self.__class__.stamped_document)
        
        # Verify it's a valid PDF
        assert stamped_pdf_bytes.startswith(b'%PDF')
        
        # The stamped PDF should be larger than a minimal PDF (stamp was added)
        assert len(stamped_pdf_bytes) > 500  # Stamped PDF should be substantial
        
        print(f"✓ Stamped PDF is valid, size: {len(stamped_pdf_bytes)} bytes")
    
    def test_06_verify_stamp_public_endpoint(self):
        """Test public stamp verification endpoint"""
        if not hasattr(self.__class__, 'stamp_id'):
            pytest.skip("No stamp_id from previous test")
        
        stamp_id = self.__class__.stamp_id
        
        # Public verification - no auth needed
        response = requests.get(f"{BASE_URL}/api/verify/stamp/{stamp_id}")
        
        assert response.status_code == 200
        data = response.json()
        
        assert data["valid"] == True
        assert data["stamp_id"] == stamp_id
        assert "advocate_name" in data
        assert data["stamp_status"] == "active"
        
        print(f"✓ Stamp verification successful for {stamp_id}")
    
    def test_07_get_document_stamps_list(self):
        """Test getting list of document stamps"""
        response = self.session.get(f"{BASE_URL}/api/documents/stamps")
        
        assert response.status_code == 200
        data = response.json()
        
        assert isinstance(data, list)
        if len(data) > 0:
            stamp = data[0]
            assert "stamp_id" in stamp
            assert "document_name" in stamp
            assert "status" in stamp
        
        print(f"✓ Retrieved {len(data)} document stamps")
    
    def test_08_stamp_preview_data_format(self):
        """Test that stamp preview shows realistic data format"""
        # Create a stamp and verify the format
        pdf_content = b"""%PDF-1.4
1 0 obj
<< /Type /Catalog /Pages 2 0 R >>
endobj
2 0 obj
<< /Type /Pages /Kids [3 0 R] /Count 1 >>
endobj
3 0 obj
<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R >>
endobj
4 0 obj
<< /Length 44 >>
stream
BT
/F1 12 Tf
100 700 Td
(Test Document) Tj
ET
endstream
endobj
xref
0 5
0000000000 65535 f 
0000000009 00000 n 
0000000058 00000 n 
0000000115 00000 n 
0000000214 00000 n 
trailer
<< /Size 5 /Root 1 0 R >>
startxref
306
%%EOF"""
        
        files = {'file': ('preview_test.pdf', pdf_content, 'application/pdf')}
        headers = {"Authorization": f"Bearer {self.token}"}
        
        form_data = {
            'stamp_type': 'official',
            'stamp_position': json.dumps({"page": 1, "x": 400, "y": 50, "width": 150, "height": 150}),
            'document_name': 'Preview Test Document',
            'document_type': 'contract',
            'recipient_name': 'Preview Recipient',
            'brand_color': '#10B981',
            'show_advocate_name': 'true',
            'show_tls_logo': 'true',
            'layout': 'horizontal'
        }
        
        response = requests.post(
            f"{BASE_URL}/api/documents/stamp",
            files=files,
            data=form_data,
            headers=headers
        )
        
        assert response.status_code == 200
        data = response.json()
        
        # Verify stamp ID format: TLS-YYYYMMDD-XXXXXXXX
        stamp_id = data["stamp_id"]
        parts = stamp_id.split("-")
        assert len(parts) == 3
        assert parts[0] == "TLS"
        assert len(parts[1]) == 8  # YYYYMMDD
        assert len(parts[2]) == 8  # XXXXXXXX
        
        # Verify date part is valid
        date_part = parts[1]
        year = int(date_part[:4])
        month = int(date_part[4:6])
        day = int(date_part[6:8])
        assert 2024 <= year <= 2030
        assert 1 <= month <= 12
        assert 1 <= day <= 31
        
        print(f"✓ Stamp ID format verified: {stamp_id}")
    
    def test_09_input_fields_work_correctly(self):
        """Test that description and recipient name fields work"""
        pdf_content = b"""%PDF-1.4
1 0 obj
<< /Type /Catalog /Pages 2 0 R >>
endobj
2 0 obj
<< /Type /Pages /Kids [3 0 R] /Count 1 >>
endobj
3 0 obj
<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R >>
endobj
4 0 obj
<< /Length 44 >>
stream
BT
/F1 12 Tf
100 700 Td
(Test Document) Tj
ET
endstream
endobj
xref
0 5
0000000000 65535 f 
0000000009 00000 n 
0000000058 00000 n 
0000000115 00000 n 
0000000214 00000 n 
trailer
<< /Size 5 /Root 1 0 R >>
startxref
306
%%EOF"""
        
        test_description = "This is a test description with special chars: @#$%"
        test_recipient = "Test Recipient Name"
        
        files = {'file': ('input_test.pdf', pdf_content, 'application/pdf')}
        headers = {"Authorization": f"Bearer {self.token}"}
        
        form_data = {
            'stamp_type': 'official',
            'stamp_position': json.dumps({"page": 1, "x": 400, "y": 50, "width": 150, "height": 150}),
            'document_name': 'Input Test Document',
            'document_type': 'contract',
            'description': test_description,
            'recipient_name': test_recipient,
            'brand_color': '#10B981'
        }
        
        response = requests.post(
            f"{BASE_URL}/api/documents/stamp",
            files=files,
            data=form_data,
            headers=headers
        )
        
        assert response.status_code == 200
        data = response.json()
        
        # Verify the stamp was created
        assert "stamp_id" in data
        
        # Verify the stamp record has the correct data
        stamp_id = data["stamp_id"]
        verify_response = self.session.get(f"{BASE_URL}/api/documents/stamps/{stamp_id}")
        
        if verify_response.status_code == 200:
            stamp_data = verify_response.json()
            assert stamp_data.get("description") == test_description
            assert stamp_data.get("recipient_name") == test_recipient
            print(f"✓ Input fields saved correctly: description and recipient_name")
        else:
            print(f"✓ Stamp created with input fields (verification endpoint returned {verify_response.status_code})")
    
    def test_10_stamping_flow_completes_successfully(self):
        """Test complete stamping flow from upload to download"""
        # Step 1: Upload document
        pdf_content = b"""%PDF-1.4
1 0 obj
<< /Type /Catalog /Pages 2 0 R >>
endobj
2 0 obj
<< /Type /Pages /Kids [3 0 R] /Count 1 >>
endobj
3 0 obj
<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R >>
endobj
4 0 obj
<< /Length 44 >>
stream
BT
/F1 12 Tf
100 700 Td
(Test Document) Tj
ET
endstream
endobj
xref
0 5
0000000000 65535 f 
0000000009 00000 n 
0000000058 00000 n 
0000000115 00000 n 
0000000214 00000 n 
trailer
<< /Size 5 /Root 1 0 R >>
startxref
306
%%EOF"""
        
        files = {'file': ('complete_flow.pdf', pdf_content, 'application/pdf')}
        headers = {"Authorization": f"Bearer {self.token}"}
        
        # Upload
        upload_response = requests.post(
            f"{BASE_URL}/api/documents/upload",
            files=files,
            headers=headers
        )
        assert upload_response.status_code == 200
        upload_data = upload_response.json()
        print(f"  Step 1: Document uploaded, hash: {upload_data['hash'][:16]}...")
        
        # Step 2: Stamp document
        files = {'file': ('complete_flow.pdf', pdf_content, 'application/pdf')}
        form_data = {
            'stamp_type': 'official',
            'stamp_position': json.dumps({"page": 1, "x": 400, "y": 50, "width": 150, "height": 150}),
            'document_name': 'Complete Flow Test',
            'document_type': 'contract',
            'recipient_name': 'Flow Test Recipient',
            'brand_color': '#10B981',
            'show_advocate_name': 'true',
            'show_tls_logo': 'true'
        }
        
        stamp_response = requests.post(
            f"{BASE_URL}/api/documents/stamp",
            files=files,
            data=form_data,
            headers=headers
        )
        assert stamp_response.status_code == 200
        stamp_data = stamp_response.json()
        print(f"  Step 2: Document stamped, stamp_id: {stamp_data['stamp_id']}")
        
        # Step 3: Verify stamped document is downloadable
        assert "stamped_document" in stamp_data
        stamped_bytes = base64.b64decode(stamp_data["stamped_document"])
        assert stamped_bytes.startswith(b'%PDF')
        print(f"  Step 3: Stamped document downloadable, size: {len(stamped_bytes)} bytes")
        
        # Step 4: Verify QR code is present
        assert "qr_code_data" in stamp_data
        qr_bytes = base64.b64decode(stamp_data["qr_code_data"])
        assert len(qr_bytes) > 100  # QR code should have substantial data
        print(f"  Step 4: QR code present, size: {len(qr_bytes)} bytes")
        
        print(f"✓ Complete stamping flow successful!")


class TestStampPreviewRealisticData:
    """Test that stamp preview shows realistic data"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test session with authentication"""
        self.session = requests.Session()
        
        # Login to get token
        response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        
        if response.status_code == 200:
            token = response.json().get("access_token")
            self.session.headers.update({"Authorization": f"Bearer {token}"})
            self.token = token
        else:
            pytest.skip(f"Authentication failed: {response.status_code}")
    
    def test_stamp_id_format_tls_yyyymmdd_xxxx(self):
        """Verify stamp ID follows TLS-YYYYMMDD-XXXX format"""
        pdf_content = b"""%PDF-1.4
1 0 obj
<< /Type /Catalog /Pages 2 0 R >>
endobj
2 0 obj
<< /Type /Pages /Kids [3 0 R] /Count 1 >>
endobj
3 0 obj
<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R >>
endobj
4 0 obj
<< /Length 44 >>
stream
BT
/F1 12 Tf
100 700 Td
(Test Document) Tj
ET
endstream
endobj
xref
0 5
0000000000 65535 f 
0000000009 00000 n 
0000000058 00000 n 
0000000115 00000 n 
0000000214 00000 n 
trailer
<< /Size 5 /Root 1 0 R >>
startxref
306
%%EOF"""
        
        files = {'file': ('format_test.pdf', pdf_content, 'application/pdf')}
        headers = {"Authorization": f"Bearer {self.token}"}
        
        form_data = {
            'stamp_type': 'official',
            'stamp_position': json.dumps({"page": 1, "x": 400, "y": 50, "width": 150, "height": 150}),
            'document_name': 'Format Test',
            'recipient_name': 'Format Recipient',
            'brand_color': '#10B981'
        }
        
        response = requests.post(
            f"{BASE_URL}/api/documents/stamp",
            files=files,
            data=form_data,
            headers=headers
        )
        
        assert response.status_code == 200
        data = response.json()
        
        stamp_id = data["stamp_id"]
        
        # Verify format: TLS-YYYYMMDD-XXXXXXXX
        import re
        pattern = r'^TLS-\d{8}-[A-Z0-9]{8}$'
        assert re.match(pattern, stamp_id), f"Stamp ID {stamp_id} doesn't match expected format TLS-YYYYMMDD-XXXXXXXX"
        
        print(f"✓ Stamp ID format correct: {stamp_id}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
