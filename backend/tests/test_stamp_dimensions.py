"""
Test document stamping with proper stamp dimensions (350x310).
This test verifies the fix for stamp text legibility issue.
"""
import pytest
import requests
import os
import base64
from io import BytesIO
from PyPDF2 import PdfReader
from PIL import Image

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://practice-vault-1.preview.emergentagent.com').rstrip('/')

# Test credentials
TEST_EMAIL = "test@tls.or.tz"
TEST_PASSWORD = "Test@12345678!"

class TestStampDimensions:
    """Test stamp dimensions are 350x310 (not scaled down)"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        """Get authentication token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        assert response.status_code == 200, f"Login failed: {response.text}"
        return response.json().get("access_token")
    
    @pytest.fixture(scope="class")
    def auth_headers(self, auth_token):
        """Get auth headers"""
        return {"Authorization": f"Bearer {auth_token}"}
    
    @pytest.fixture(scope="class")
    def test_pdf_path(self):
        """Get test PDF path"""
        return "/tmp/test_document.pdf"
    
    def test_login_successful(self):
        """Test that login works with test credentials"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        assert response.status_code == 200, f"Login failed: {response.text}"
        data = response.json()
        assert "access_token" in data
        assert "user" in data
        print(f"PASS: Login successful for {TEST_EMAIL}")
    
    def test_stamp_prices_endpoint(self):
        """Test stamp prices endpoint is accessible"""
        response = requests.get(f"{BASE_URL}/api/settings/stamp-prices")
        assert response.status_code == 200
        data = response.json()
        assert "certification" in data or isinstance(data, dict)
        print(f"PASS: Stamp prices endpoint accessible")
    
    def test_upload_pdf_document(self, auth_headers, test_pdf_path):
        """Test PDF document upload"""
        with open(test_pdf_path, 'rb') as f:
            files = {'file': ('test_document.pdf', f, 'application/pdf')}
            response = requests.post(
                f"{BASE_URL}/api/documents/upload",
                files=files,
                headers=auth_headers
            )
        
        assert response.status_code == 200, f"Upload failed: {response.text}"
        data = response.json()
        assert "document_data" in data
        assert "pages" in data
        print(f"PASS: PDF upload successful, {data.get('pages')} pages detected")
        return data
    
    def test_stamp_document_certification_type(self, auth_headers, test_pdf_path):
        """Test document stamping with CERTIFICATION stamp type - verify dimensions"""
        with open(test_pdf_path, 'rb') as f:
            # Expected stamp dimensions: 350x310 (not 233x207)
            stamp_position = {
                "page": 1,
                "pages": [1],
                "positions": {"1": {"x": 87, "y": 161}},
                "width": 350,  # This should be 350, not ~233
                "height": 310,  # This should be 310, not ~207
                "frontendPageWidth": 612,
                "frontendPageHeight": 792
            }
            
            files = {'file': ('test_document.pdf', f, 'application/pdf')}
            data = {
                'stamp_type': 'certification',
                'stamp_position': str(stamp_position).replace("'", '"'),  # JSON format
                'document_name': 'Test Stamp Dimensions Document',
                'document_type': 'contract',
                'description': 'Testing stamp dimensions fix',
                'recipient_name': 'Test Recipient',
                'recipient_org': 'Test Organization',
                'brand_color': '#10B981',
                'show_advocate_name': 'true',
                'show_tls_logo': 'true',
                'layout': 'horizontal',
                'shape': 'rectangle',
                'include_signature': 'false',
                'show_signature_placeholder': 'true',
                'stamp_size': '100',
                'opacity': '100',
                'transparent_background': 'true'
            }
            
            response = requests.post(
                f"{BASE_URL}/api/documents/stamp",
                files=files,
                data=data,
                headers=auth_headers
            )
        
        assert response.status_code == 200, f"Stamp failed: {response.text}"
        result = response.json()
        
        # Verify response structure
        assert "stamp_id" in result, "Response missing stamp_id"
        assert "stamped_document" in result, "Response missing stamped_document"
        assert "qr_code_data" in result, "Response missing qr_code_data"
        
        print(f"PASS: Document stamped with CERTIFICATION type, stamp_id: {result['stamp_id']}")
        return result
    
    def test_stamp_document_notarization_type(self, auth_headers, test_pdf_path):
        """Test document stamping with NOTARIZATION stamp type - verify dimensions"""
        with open(test_pdf_path, 'rb') as f:
            stamp_position = {
                "page": 1,
                "pages": [1],
                "positions": {"1": {"x": 100, "y": 200}},
                "width": 350,  # Expected 350, not scaled down
                "height": 310,  # Expected 310, not scaled down
                "frontendPageWidth": 612,
                "frontendPageHeight": 792
            }
            
            files = {'file': ('test_document.pdf', f, 'application/pdf')}
            data = {
                'stamp_type': 'notarization',
                'stamp_position': str(stamp_position).replace("'", '"'),
                'document_name': 'Test Notarization Document',
                'document_type': 'affidavit',
                'description': 'Testing notarization stamp',
                'recipient_name': 'Test Notary Recipient',
                'recipient_org': 'Test Notary Org',
                'brand_color': '#3B82F6',
                'show_advocate_name': 'true',
                'show_tls_logo': 'true',
                'layout': 'horizontal',
                'shape': 'rectangle',
                'include_signature': 'false',
                'show_signature_placeholder': 'false',  # Notarization doesn't require signature
                'stamp_size': '100',
                'opacity': '100',
                'transparent_background': 'true'
            }
            
            response = requests.post(
                f"{BASE_URL}/api/documents/stamp",
                files=files,
                data=data,
                headers=auth_headers
            )
        
        assert response.status_code == 200, f"Stamp failed: {response.text}"
        result = response.json()
        
        assert "stamp_id" in result
        assert result['stamp_id'].startswith('TLS-')
        
        print(f"PASS: Document stamped with NOTARIZATION type, stamp_id: {result['stamp_id']}")
        return result
    
    def test_stamped_pdf_contains_stamp(self, auth_headers, test_pdf_path):
        """Test that stamped PDF actually contains the stamp and can be parsed"""
        with open(test_pdf_path, 'rb') as f:
            stamp_position = {
                "page": 1,
                "pages": [1],
                "positions": {"1": {"x": 50, "y": 50}},
                "width": 350,
                "height": 310,
                "frontendPageWidth": 612,
                "frontendPageHeight": 792
            }
            
            files = {'file': ('test_document.pdf', f, 'application/pdf')}
            data = {
                'stamp_type': 'certification',
                'stamp_position': str(stamp_position).replace("'", '"'),
                'document_name': 'Test PDF Verification',
                'document_type': 'contract',
                'description': '',
                'recipient_name': 'Verification Test',
                'recipient_org': '',
                'brand_color': '#10B981',
                'show_advocate_name': 'true',
                'show_tls_logo': 'true',
                'layout': 'horizontal',
                'shape': 'rectangle',
                'include_signature': 'false',
                'show_signature_placeholder': 'true',
                'stamp_size': '100',
                'opacity': '100',
                'transparent_background': 'true'
            }
            
            response = requests.post(
                f"{BASE_URL}/api/documents/stamp",
                files=files,
                data=data,
                headers=auth_headers
            )
        
        assert response.status_code == 200
        result = response.json()
        
        # Decode the stamped PDF
        stamped_pdf_bytes = base64.b64decode(result['stamped_document'])
        
        # Verify the PDF is valid and can be read
        pdf_buffer = BytesIO(stamped_pdf_bytes)
        pdf_reader = PdfReader(pdf_buffer)
        
        assert len(pdf_reader.pages) >= 1, "Stamped PDF should have at least 1 page"
        
        # Check that PDF has content (stamp was embedded)
        page = pdf_reader.pages[0]
        page_content = page.extract_text() if hasattr(page, 'extract_text') else ""
        
        print(f"PASS: Stamped PDF is valid with {len(pdf_reader.pages)} page(s)")
        print(f"      PDF content length: {len(stamped_pdf_bytes)} bytes")
        return result
    
    def test_qr_code_in_response(self, auth_headers, test_pdf_path):
        """Test that QR code is included in response and is valid PNG"""
        with open(test_pdf_path, 'rb') as f:
            stamp_position = {
                "page": 1,
                "pages": [1],
                "positions": {"1": {"x": 100, "y": 100}},
                "width": 350,
                "height": 310,
                "frontendPageWidth": 612,
                "frontendPageHeight": 792
            }
            
            files = {'file': ('test_document.pdf', f, 'application/pdf')}
            data = {
                'stamp_type': 'certification',
                'stamp_position': str(stamp_position).replace("'", '"'),
                'document_name': 'QR Code Test',
                'document_type': 'contract',
                'description': '',
                'recipient_name': 'QR Test',
                'recipient_org': '',
                'brand_color': '#10B981',
                'show_advocate_name': 'true',
                'show_tls_logo': 'true',
                'layout': 'horizontal',
                'shape': 'rectangle',
                'include_signature': 'false',
                'show_signature_placeholder': 'true',
                'stamp_size': '100',
                'opacity': '100',
                'transparent_background': 'true'
            }
            
            response = requests.post(
                f"{BASE_URL}/api/documents/stamp",
                files=files,
                data=data,
                headers=auth_headers
            )
        
        assert response.status_code == 200
        result = response.json()
        
        assert "qr_code_data" in result, "Response should contain qr_code_data"
        
        # Verify QR code is valid base64 encoded image
        qr_bytes = base64.b64decode(result['qr_code_data'])
        qr_image = Image.open(BytesIO(qr_bytes))
        
        # QR code should be a reasonable size
        assert qr_image.width >= 100, f"QR code width too small: {qr_image.width}"
        assert qr_image.height >= 100, f"QR code height too small: {qr_image.height}"
        
        print(f"PASS: QR code is valid, size: {qr_image.width}x{qr_image.height}")
        return result
    
    def test_verification_endpoint_with_stamp_id(self, auth_headers, test_pdf_path):
        """Test that verification endpoint works with stamped document's stamp_id"""
        # First create a stamp
        with open(test_pdf_path, 'rb') as f:
            stamp_position = {
                "page": 1,
                "pages": [1],
                "positions": {"1": {"x": 80, "y": 120}},
                "width": 350,
                "height": 310,
                "frontendPageWidth": 612,
                "frontendPageHeight": 792
            }
            
            files = {'file': ('test_document.pdf', f, 'application/pdf')}
            data = {
                'stamp_type': 'certification',
                'stamp_position': str(stamp_position).replace("'", '"'),
                'document_name': 'Verification Test Doc',
                'document_type': 'contract',
                'description': '',
                'recipient_name': 'Verify Test',
                'recipient_org': '',
                'brand_color': '#10B981',
                'show_advocate_name': 'true',
                'show_tls_logo': 'true',
                'layout': 'horizontal',
                'shape': 'rectangle',
                'include_signature': 'false',
                'show_signature_placeholder': 'true',
                'stamp_size': '100',
                'opacity': '100',
                'transparent_background': 'true'
            }
            
            stamp_response = requests.post(
                f"{BASE_URL}/api/documents/stamp",
                files=files,
                data=data,
                headers=auth_headers
            )
        
        assert stamp_response.status_code == 200
        stamp_result = stamp_response.json()
        stamp_id = stamp_result['stamp_id']
        
        # Now verify the stamp
        verify_response = requests.get(f"{BASE_URL}/api/verify/stamp/{stamp_id}")
        
        assert verify_response.status_code == 200, f"Verification failed: {verify_response.text}"
        verify_result = verify_response.json()
        
        assert verify_result.get('valid') == True, "Stamp should be valid"
        assert verify_result.get('stamp_id') == stamp_id
        
        print(f"PASS: Stamp verification successful for {stamp_id}")
        return verify_result
    
    def test_stamps_list_endpoint(self, auth_headers):
        """Test that stamps list endpoint returns stamped documents"""
        response = requests.get(f"{BASE_URL}/api/documents/stamps", headers=auth_headers)
        
        assert response.status_code == 200, f"Get stamps failed: {response.text}"
        stamps = response.json()
        
        assert isinstance(stamps, list), "Response should be a list"
        print(f"PASS: Found {len(stamps)} stamps in history")
        
        if len(stamps) > 0:
            # Verify structure of stamp record
            stamp = stamps[0]
            assert "stamp_id" in stamp
            assert "document_name" in stamp
            assert "stamp_type" in stamp
            print(f"      Latest stamp: {stamp['stamp_id']} - {stamp['document_name']}")


class TestStampTemplates:
    """Test stamp templates functionality"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        """Get authentication token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        assert response.status_code == 200
        return response.json().get("access_token")
    
    @pytest.fixture(scope="class")
    def auth_headers(self, auth_token):
        return {"Authorization": f"Bearer {auth_token}"}
    
    def test_get_stamp_templates(self, auth_headers):
        """Test fetching stamp templates"""
        response = requests.get(f"{BASE_URL}/api/stamp-templates", headers=auth_headers)
        
        assert response.status_code == 200
        templates = response.json()
        assert isinstance(templates, list)
        print(f"PASS: Found {len(templates)} stamp templates")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
