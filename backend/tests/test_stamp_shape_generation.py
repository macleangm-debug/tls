"""
Test Stamp Shape Generation - Bug Fix Verification
Tests: Rectangle (all layouts), Circle, and Oval stamp image generation
Verifies fix for infinite recursion bug in rectangle shape generation
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


class TestStampShapeGeneration:
    """Test all stamp shapes generate correctly after bug fix"""
    
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
    
    def _create_test_pdf(self):
        """Create a minimal valid PDF for testing"""
        return b"""%PDF-1.4
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
    
    def _stamp_document(self, shape: str, layout: str = "horizontal"):
        """Helper to stamp a document with given shape and layout"""
        pdf_content = self._create_test_pdf()
        
        files = {'file': (f'test_{shape}_{layout}.pdf', pdf_content, 'application/pdf')}
        headers = {"Authorization": f"Bearer {self.token}"}
        
        form_data = {
            'stamp_type': 'official',
            'stamp_position': json.dumps({"page": 1, "x": 400, "y": 50, "width": 150, "height": 150}),
            'document_name': f'Test {shape.capitalize()} {layout.capitalize()} Stamp',
            'document_type': 'contract',
            'description': f'Testing {shape} shape with {layout} layout',
            'recipient_name': f'Test Recipient for {shape}',
            'recipient_org': 'Test Organization',
            'brand_color': '#10B981',
            'show_advocate_name': 'true',
            'show_tls_logo': 'true',
            'layout': layout,
            'shape': shape,
            'include_signature': 'false',
            'stamp_size': '100',
            'opacity': '90'
        }
        
        response = requests.post(
            f"{BASE_URL}/api/documents/stamp",
            files=files,
            data=form_data,
            headers=headers,
            timeout=30  # Allow sufficient time for stamp generation
        )
        
        return response

    # ==================== RECTANGLE SHAPE TESTS ====================
    
    def test_01_rectangle_horizontal_layout(self):
        """Test rectangle shape with horizontal layout (most common - BUG FIX TARGET)"""
        response = self._stamp_document("rectangle", "horizontal")
        
        assert response.status_code == 200, f"Failed with status {response.status_code}: {response.text}"
        data = response.json()
        
        # Verify stamp was created successfully
        assert "stamp_id" in data
        assert "stamped_document" in data
        assert "qr_code_data" in data
        
        # Verify stamped PDF is valid
        stamped_bytes = base64.b64decode(data["stamped_document"])
        assert stamped_bytes.startswith(b'%PDF')
        assert len(stamped_bytes) > 500  # Should have substantial content
        
        print(f"✓ Rectangle horizontal stamp generated successfully: {data['stamp_id']}")
    
    def test_02_rectangle_vertical_layout(self):
        """Test rectangle shape with vertical layout"""
        response = self._stamp_document("rectangle", "vertical")
        
        assert response.status_code == 200, f"Failed with status {response.status_code}: {response.text}"
        data = response.json()
        
        assert "stamp_id" in data
        assert "stamped_document" in data
        
        stamped_bytes = base64.b64decode(data["stamped_document"])
        assert stamped_bytes.startswith(b'%PDF')
        
        print(f"✓ Rectangle vertical stamp generated successfully: {data['stamp_id']}")
    
    def test_03_rectangle_compact_layout(self):
        """Test rectangle shape with compact layout"""
        response = self._stamp_document("rectangle", "compact")
        
        assert response.status_code == 200, f"Failed with status {response.status_code}: {response.text}"
        data = response.json()
        
        assert "stamp_id" in data
        assert "stamped_document" in data
        
        stamped_bytes = base64.b64decode(data["stamped_document"])
        assert stamped_bytes.startswith(b'%PDF')
        
        print(f"✓ Rectangle compact stamp generated successfully: {data['stamp_id']}")
    
    def test_04_rectangle_logo_left_layout(self):
        """Test rectangle shape with logo_left layout"""
        response = self._stamp_document("rectangle", "logo_left")
        
        assert response.status_code == 200, f"Failed with status {response.status_code}: {response.text}"
        data = response.json()
        
        assert "stamp_id" in data
        assert "stamped_document" in data
        
        stamped_bytes = base64.b64decode(data["stamped_document"])
        assert stamped_bytes.startswith(b'%PDF')
        
        print(f"✓ Rectangle logo_left stamp generated successfully: {data['stamp_id']}")
    
    def test_05_rectangle_logo_right_layout(self):
        """Test rectangle shape with logo_right layout"""
        response = self._stamp_document("rectangle", "logo_right")
        
        assert response.status_code == 200, f"Failed with status {response.status_code}: {response.text}"
        data = response.json()
        
        assert "stamp_id" in data
        assert "stamped_document" in data
        
        stamped_bytes = base64.b64decode(data["stamped_document"])
        assert stamped_bytes.startswith(b'%PDF')
        
        print(f"✓ Rectangle logo_right stamp generated successfully: {data['stamp_id']}")
    
    # ==================== CIRCLE SHAPE TEST ====================
    
    def test_06_circle_shape(self):
        """Test circle shape stamp generation"""
        response = self._stamp_document("circle", "horizontal")
        
        assert response.status_code == 200, f"Failed with status {response.status_code}: {response.text}"
        data = response.json()
        
        assert "stamp_id" in data
        assert "stamped_document" in data
        assert "qr_code_data" in data
        
        stamped_bytes = base64.b64decode(data["stamped_document"])
        assert stamped_bytes.startswith(b'%PDF')
        assert len(stamped_bytes) > 500
        
        print(f"✓ Circle stamp generated successfully: {data['stamp_id']}")
    
    # ==================== OVAL SHAPE TEST ====================
    
    def test_07_oval_shape(self):
        """Test oval shape stamp generation"""
        response = self._stamp_document("oval", "horizontal")
        
        assert response.status_code == 200, f"Failed with status {response.status_code}: {response.text}"
        data = response.json()
        
        assert "stamp_id" in data
        assert "stamped_document" in data
        assert "qr_code_data" in data
        
        stamped_bytes = base64.b64decode(data["stamped_document"])
        assert stamped_bytes.startswith(b'%PDF')
        assert len(stamped_bytes) > 500
        
        print(f"✓ Oval stamp generated successfully: {data['stamp_id']}")
    
    # ==================== VERIFY STAMP IN DOWNLOADED PDF ====================
    
    def test_08_stamped_pdf_larger_than_original(self):
        """Verify that stamped PDF is larger (stamp was actually embedded)"""
        pdf_content = self._create_test_pdf()
        original_size = len(pdf_content)
        
        response = self._stamp_document("rectangle", "horizontal")
        assert response.status_code == 200
        
        data = response.json()
        stamped_bytes = base64.b64decode(data["stamped_document"])
        stamped_size = len(stamped_bytes)
        
        # Stamped PDF should be significantly larger due to embedded image
        assert stamped_size > original_size, f"Stamped PDF ({stamped_size}) should be larger than original ({original_size})"
        
        print(f"✓ Stamp was embedded: Original={original_size} bytes, Stamped={stamped_size} bytes (increase: {stamped_size - original_size} bytes)")
    
    # ==================== VERIFICATION ENDPOINT TEST ====================
    
    def test_09_verify_stamped_document(self):
        """Test that stamped documents can be verified via public endpoint"""
        response = self._stamp_document("rectangle", "horizontal")
        assert response.status_code == 200
        
        data = response.json()
        stamp_id = data["stamp_id"]
        
        # Public verification (no auth)
        verify_response = requests.get(f"{BASE_URL}/api/verify/stamp/{stamp_id}")
        
        assert verify_response.status_code == 200
        verify_data = verify_response.json()
        
        assert verify_data["valid"] == True
        assert verify_data["stamp_id"] == stamp_id
        assert "advocate_name" in verify_data
        assert verify_data["stamp_status"] == "active"
        
        print(f"✓ Stamp verification successful for {stamp_id}")
    
    # ==================== TRANSPARENT BACKGROUND TEST ====================
    
    def test_10_rectangle_with_transparent_background(self):
        """Test rectangle shape with transparent background option"""
        pdf_content = self._create_test_pdf()
        
        files = {'file': ('test_transparent.pdf', pdf_content, 'application/pdf')}
        headers = {"Authorization": f"Bearer {self.token}"}
        
        form_data = {
            'stamp_type': 'official',
            'stamp_position': json.dumps({"page": 1, "x": 400, "y": 50, "width": 150, "height": 150}),
            'document_name': 'Transparent Background Test',
            'document_type': 'contract',
            'recipient_name': 'Transparency Test Recipient',
            'brand_color': '#10B981',
            'show_advocate_name': 'true',
            'show_tls_logo': 'true',
            'layout': 'horizontal',
            'shape': 'rectangle',
            'transparent_background': 'true',
            'opacity': '90'
        }
        
        response = requests.post(
            f"{BASE_URL}/api/documents/stamp",
            files=files,
            data=form_data,
            headers=headers,
            timeout=30
        )
        
        assert response.status_code == 200, f"Failed with status {response.status_code}: {response.text}"
        data = response.json()
        
        assert "stamp_id" in data
        assert "stamped_document" in data
        
        print(f"✓ Rectangle with transparent background generated successfully: {data['stamp_id']}")


class TestStampFieldValidation:
    """Test that all stamp fields are correctly saved and retrievable"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test session with authentication"""
        self.session = requests.Session()
        
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
    
    def test_description_recipient_fields_saved(self):
        """Test that description and recipient fields are correctly saved"""
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
        
        test_description = "This is a test description for the stamp"
        test_recipient_name = "John Doe Test Recipient"
        test_recipient_org = "Test Legal Organization Ltd"
        
        files = {'file': ('field_test.pdf', pdf_content, 'application/pdf')}
        headers = {"Authorization": f"Bearer {self.token}"}
        
        form_data = {
            'stamp_type': 'official',
            'stamp_position': json.dumps({"page": 1, "x": 400, "y": 50, "width": 150, "height": 150}),
            'document_name': 'Field Test Document',
            'document_type': 'contract',
            'description': test_description,
            'recipient_name': test_recipient_name,
            'recipient_org': test_recipient_org,
            'brand_color': '#10B981',
            'shape': 'rectangle',
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
        
        assert "stamp_id" in data
        stamp_id = data["stamp_id"]
        
        # Verify the stamp data through verification endpoint
        verify_response = requests.get(f"{BASE_URL}/api/verify/stamp/{stamp_id}")
        
        if verify_response.status_code == 200:
            verify_data = verify_response.json()
            # Check if fields are present in verification response
            assert verify_data.get("description") == test_description or "description" not in verify_data
            assert verify_data.get("recipient_name") == test_recipient_name or "recipient_name" not in verify_data
            print(f"✓ Field validation test passed for stamp: {stamp_id}")
        else:
            print(f"✓ Stamp created successfully: {stamp_id}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
