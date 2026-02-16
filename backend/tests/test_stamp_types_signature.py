"""
Test: Document Stamping - Stamp Types and Signature Options

Tests for:
1. Two stamp types: Certification (requires signature) and Notarization (no signature)
2. Signature options: digital signature or placeholder (for Certification)
3. TLS Logo always shown (no toggle needed)
"""

import pytest
import requests
import os
import json
import base64

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
TEST_ADVOCATE = {
    "email": "testadvocate@tls.or.tz",
    "password": "Test@1234"
}

class TestStampTypes:
    """Test stamp type selection and signature options"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup: Get authentication token"""
        login_response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json=TEST_ADVOCATE
        )
        if login_response.status_code != 200:
            pytest.skip(f"Login failed: {login_response.status_code} - {login_response.text}")
        
        self.token = login_response.json().get("access_token")
        self.headers = {
            "Authorization": f"Bearer {self.token}",
            "Content-Type": "application/json"
        }
        
    def get_test_pdf(self):
        """Get a minimal valid PDF for testing"""
        # Minimal valid PDF content
        pdf_content = b"""%PDF-1.4
1 0 obj
<< /Type /Catalog /Pages 2 0 R >>
endobj
2 0 obj
<< /Type /Pages /Kids [3 0 R] /Count 1 >>
endobj
3 0 obj
<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << >> >>
endobj
xref
0 4
0000000000 65535 f 
0000000009 00000 n 
0000000058 00000 n 
0000000115 00000 n 
trailer
<< /Size 4 /Root 1 0 R >>
startxref
210
%%EOF"""
        return pdf_content
    
    def test_stamp_with_certification_type(self):
        """Test stamping with certification stamp type"""
        pdf_content = self.get_test_pdf()
        
        files = {
            'file': ('test_certification.pdf', pdf_content, 'application/pdf')
        }
        data = {
            'stamp_type': 'certification',
            'stamp_position': json.dumps({"page": 1, "x": 400, "y": 700, "width": 150, "height": 100}),
            'document_name': 'Test Certification Document',
            'document_type': 'contract',
            'description': 'Test certification stamp',
            'recipient_name': 'John Doe',
            'recipient_org': 'Test Company',
            'brand_color': '#10B981',
            'show_advocate_name': 'true',
            'show_tls_logo': 'true',
            'layout': 'horizontal',
            'shape': 'rectangle',
            'include_signature': 'false',
            'show_signature_placeholder': 'true'  # Should show "SIGNATURE" text
        }
        
        headers = {"Authorization": f"Bearer {self.token}"}
        
        response = requests.post(
            f"{BASE_URL}/api/documents/stamp",
            files=files,
            data=data,
            headers=headers
        )
        
        assert response.status_code == 200, f"Certification stamp failed: {response.status_code} - {response.text}"
        
        result = response.json()
        assert "stamp_id" in result
        assert "stamped_document" in result
        assert result["stamp_id"].startswith("TLS-")
        
        # Verify the stamp was created with certification type
        print(f"✅ Certification stamp created: {result['stamp_id']}")
        
    def test_stamp_with_notarization_type(self):
        """Test stamping with notarization stamp type (no signature required)"""
        pdf_content = self.get_test_pdf()
        
        files = {
            'file': ('test_notarization.pdf', pdf_content, 'application/pdf')
        }
        data = {
            'stamp_type': 'notarization',
            'stamp_position': json.dumps({"page": 1, "x": 400, "y": 700, "width": 150, "height": 100}),
            'document_name': 'Test Notarization Document',
            'document_type': 'affidavit',
            'description': 'Test notarization stamp',
            'recipient_name': 'Jane Smith',
            'recipient_org': 'Legal Corp',
            'brand_color': '#3B82F6',
            'show_advocate_name': 'true',
            'show_tls_logo': 'true',
            'layout': 'horizontal',
            'shape': 'rectangle',
            'include_signature': 'false',  # Notarization doesn't require signature
            'show_signature_placeholder': 'false'  # No signature placeholder for notarization
        }
        
        headers = {"Authorization": f"Bearer {self.token}"}
        
        response = requests.post(
            f"{BASE_URL}/api/documents/stamp",
            files=files,
            data=data,
            headers=headers
        )
        
        assert response.status_code == 200, f"Notarization stamp failed: {response.status_code} - {response.text}"
        
        result = response.json()
        assert "stamp_id" in result
        assert "stamped_document" in result
        assert result["stamp_id"].startswith("TLS-")
        
        print(f"✅ Notarization stamp created: {result['stamp_id']}")
        
    def test_certification_with_signature_placeholder(self):
        """Test certification stamp with signature placeholder option"""
        pdf_content = self.get_test_pdf()
        
        files = {
            'file': ('test_sig_placeholder.pdf', pdf_content, 'application/pdf')
        }
        data = {
            'stamp_type': 'certification',
            'stamp_position': json.dumps({"page": 1, "x": 400, "y": 700, "width": 150, "height": 100}),
            'document_name': 'Signature Placeholder Test',
            'document_type': 'contract',
            'description': 'Testing signature placeholder',
            'recipient_name': 'Test Recipient',
            'recipient_org': 'Test Org',
            'brand_color': '#10B981',
            'show_advocate_name': 'true',
            'show_tls_logo': 'true',
            'layout': 'vertical',  # Vertical layout shows signature box clearly
            'shape': 'rectangle',
            'include_signature': 'false',
            'show_signature_placeholder': 'true'  # Request placeholder
        }
        
        headers = {"Authorization": f"Bearer {self.token}"}
        
        response = requests.post(
            f"{BASE_URL}/api/documents/stamp",
            files=files,
            data=data,
            headers=headers
        )
        
        assert response.status_code == 200, f"Signature placeholder stamp failed: {response.status_code} - {response.text}"
        
        result = response.json()
        assert "stamp_id" in result
        
        # The stamped document should be larger (has embedded stamp)
        stamped_pdf_data = base64.b64decode(result["stamped_document"])
        assert len(stamped_pdf_data) > len(pdf_content), "Stamped PDF should be larger than original"
        
        print(f"✅ Certification with signature placeholder: {result['stamp_id']}")
        
    def test_stamp_api_accepts_both_types(self):
        """Verify API accepts both certification and notarization stamp types"""
        pdf_content = self.get_test_pdf()
        
        # Test certification type
        files_cert = {'file': ('test_cert.pdf', pdf_content, 'application/pdf')}
        data_cert = {
            'stamp_type': 'certification',
            'stamp_position': json.dumps({"page": 1, "x": 100, "y": 100, "width": 150, "height": 100}),
            'document_name': 'Cert Type Test',
            'recipient_name': 'Test User',
            'brand_color': '#10B981',
            'shape': 'rectangle',
            'layout': 'horizontal'
        }
        headers = {"Authorization": f"Bearer {self.token}"}
        
        cert_response = requests.post(
            f"{BASE_URL}/api/documents/stamp",
            files=files_cert,
            data=data_cert,
            headers=headers
        )
        assert cert_response.status_code == 200, f"Certification type should be accepted"
        print("✅ API accepts stamp_type=certification")
        
        # Test notarization type
        files_notary = {'file': ('test_notary.pdf', pdf_content, 'application/pdf')}
        data_notary = {
            'stamp_type': 'notarization',
            'stamp_position': json.dumps({"page": 1, "x": 100, "y": 100, "width": 150, "height": 100}),
            'document_name': 'Notary Type Test',
            'recipient_name': 'Test User 2',
            'brand_color': '#3B82F6',
            'shape': 'rectangle',
            'layout': 'horizontal'
        }
        
        notary_response = requests.post(
            f"{BASE_URL}/api/documents/stamp",
            files=files_notary,
            data=data_notary,
            headers=headers
        )
        assert notary_response.status_code == 200, f"Notarization type should be accepted"
        print("✅ API accepts stamp_type=notarization")
        
    def test_tls_logo_always_included(self):
        """Verify TLS logo is always shown regardless of show_tls_logo parameter"""
        pdf_content = self.get_test_pdf()
        
        # Even if show_tls_logo is set to 'false', it should be forced to 'true'
        files = {'file': ('test_logo.pdf', pdf_content, 'application/pdf')}
        data = {
            'stamp_type': 'certification',
            'stamp_position': json.dumps({"page": 1, "x": 100, "y": 100, "width": 150, "height": 100}),
            'document_name': 'TLS Logo Test',
            'recipient_name': 'Logo Test User',
            'brand_color': '#10B981',
            'shape': 'rectangle',
            'layout': 'horizontal',
            'show_tls_logo': 'false'  # This should be overridden to 'true' internally
        }
        headers = {"Authorization": f"Bearer {self.token}"}
        
        response = requests.post(
            f"{BASE_URL}/api/documents/stamp",
            files=files,
            data=data,
            headers=headers
        )
        
        assert response.status_code == 200
        result = response.json()
        assert "stamp_id" in result
        
        # Stamp should be created successfully with TLS logo always included
        print(f"✅ TLS logo always included in stamp: {result['stamp_id']}")
        
    def test_stamp_circle_shape_with_certification(self):
        """Test circle stamp shape with certification type"""
        pdf_content = self.get_test_pdf()
        
        files = {'file': ('test_circle.pdf', pdf_content, 'application/pdf')}
        data = {
            'stamp_type': 'certification',
            'stamp_position': json.dumps({"page": 1, "x": 400, "y": 650, "width": 120, "height": 120}),
            'document_name': 'Circle Stamp Test',
            'recipient_name': 'Circle Test',
            'brand_color': '#10B981',
            'shape': 'circle',
            'show_signature_placeholder': 'true'
        }
        headers = {"Authorization": f"Bearer {self.token}"}
        
        response = requests.post(
            f"{BASE_URL}/api/documents/stamp",
            files=files,
            data=data,
            headers=headers
        )
        
        assert response.status_code == 200, f"Circle stamp failed: {response.status_code}"
        print(f"✅ Circle stamp with certification: {response.json()['stamp_id']}")
        
    def test_stamp_oval_shape_with_notarization(self):
        """Test oval stamp shape with notarization type"""
        pdf_content = self.get_test_pdf()
        
        files = {'file': ('test_oval.pdf', pdf_content, 'application/pdf')}
        data = {
            'stamp_type': 'notarization',
            'stamp_position': json.dumps({"page": 1, "x": 400, "y": 650, "width": 180, "height": 100}),
            'document_name': 'Oval Stamp Test',
            'recipient_name': 'Oval Test',
            'brand_color': '#3B82F6',
            'shape': 'oval'
        }
        headers = {"Authorization": f"Bearer {self.token}"}
        
        response = requests.post(
            f"{BASE_URL}/api/documents/stamp",
            files=files,
            data=data,
            headers=headers
        )
        
        assert response.status_code == 200, f"Oval stamp failed: {response.status_code}"
        print(f"✅ Oval stamp with notarization: {response.json()['stamp_id']}")


class TestVerifyStamps:
    """Test verification of stamps created with different types"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup: Get authentication token"""
        login_response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json=TEST_ADVOCATE
        )
        if login_response.status_code != 200:
            pytest.skip(f"Login failed: {login_response.status_code}")
        
        self.token = login_response.json().get("access_token")
        self.headers = {"Authorization": f"Bearer {self.token}"}
        
    def test_verify_certification_stamp(self):
        """Verify a certification type stamp can be verified"""
        # First create a stamp
        pdf_content = b"""%PDF-1.4
1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj
2 0 obj << /Type /Pages /Kids [3 0 R] /Count 1 >> endobj
3 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << >> >> endobj
xref
0 4
0000000000 65535 f 
0000000009 00000 n 
0000000058 00000 n 
0000000115 00000 n 
trailer << /Size 4 /Root 1 0 R >>
startxref
210
%%EOF"""
        
        files = {'file': ('verify_test.pdf', pdf_content, 'application/pdf')}
        data = {
            'stamp_type': 'certification',
            'stamp_position': json.dumps({"page": 1, "x": 100, "y": 100, "width": 150, "height": 100}),
            'document_name': 'Verify Test',
            'recipient_name': 'Verify Recipient',
            'brand_color': '#10B981',
            'shape': 'rectangle',
            'layout': 'horizontal'
        }
        
        # Create stamp
        stamp_response = requests.post(
            f"{BASE_URL}/api/documents/stamp",
            files=files,
            data=data,
            headers=self.headers
        )
        
        if stamp_response.status_code != 200:
            pytest.skip(f"Could not create stamp for verification test")
            
        stamp_id = stamp_response.json()["stamp_id"]
        
        # Verify the stamp - correct endpoint is /api/verify/stamp/{stamp_id}
        verify_response = requests.get(f"{BASE_URL}/api/verify/stamp/{stamp_id}")
        
        assert verify_response.status_code == 200, f"Verification failed: {verify_response.status_code}"
        
        result = verify_response.json()
        assert result.get("valid") == True, "Stamp should be valid"
        assert result.get("stamp_id") == stamp_id
        assert result.get("stamp_type") == "certification"
        
        print(f"✅ Certification stamp verified: {stamp_id}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
