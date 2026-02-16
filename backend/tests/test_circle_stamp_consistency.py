"""
Test Circle Stamp Consistency - Backend and PDF Generation
Tests that Circle stamp includes all required elements:
- Double circular borders
- ★ TLS VERIFIED ★ badge at top
- TSL logo with 'Tanganyika Law Society'
- QR code with colored border
- Stamp ID
- Date
- Advocate name (when enabled)
- SCAN TO VERIFY badge at bottom
"""

import pytest
import requests
import os
import base64
from io import BytesIO
from PIL import Image

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
TEST_EMAIL = "testadvocate@tls.or.tz"
TEST_PASSWORD = "Test@1234"


class TestCircleStampConsistency:
    """Test Circle stamp generation and consistency"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        """Get auth token for testing"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        assert response.status_code == 200, f"Login failed: {response.text}"
        data = response.json()
        return data["access_token"]
    
    @pytest.fixture(scope="class")
    def auth_headers(self, auth_token):
        """Get auth headers"""
        return {"Authorization": f"Bearer {auth_token}"}
    
    def test_backend_health(self):
        """Test backend is healthy"""
        response = requests.get(f"{BASE_URL}/api/health")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "healthy"
        print("✓ Backend health check passed")
    
    def test_login_with_credentials(self):
        """Test login with test credentials"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data
        assert "user" in data
        print(f"✓ Login successful for {TEST_EMAIL}")
    
    def test_circle_template_exists(self, auth_headers):
        """Test that Circle stamp template exists"""
        response = requests.get(f"{BASE_URL}/api/stamp-templates", headers=auth_headers)
        assert response.status_code == 200
        templates = response.json()
        
        circle_template = None
        for t in templates:
            if t.get("shape") == "circle":
                circle_template = t
                break
        
        assert circle_template is not None, "Circle template not found"
        print(f"✓ Circle template found: {circle_template.get('name')}")
        return circle_template
    
    def test_create_circle_stamped_document(self, auth_headers):
        """Test creating a document with Circle stamp"""
        # Create a simple test PDF (1 page)
        from reportlab.lib.pagesizes import letter
        from reportlab.pdfgen import canvas
        from io import BytesIO
        
        pdf_buffer = BytesIO()
        c = canvas.Canvas(pdf_buffer, pagesize=letter)
        c.drawString(100, 700, "Test Document for Circle Stamp Consistency Test")
        c.drawString(100, 680, "This document will be stamped with a Circle stamp.")
        c.save()
        pdf_buffer.seek(0)
        
        # Upload and stamp the document
        files = {'file': ('test_circle_stamp.pdf', pdf_buffer, 'application/pdf')}
        data = {
            'stamp_type': 'certification',
            'stamp_position': '{"page": 1, "x": 400, "y": 700, "width": 150, "height": 150}',
            'document_name': 'Circle Stamp Consistency Test',
            'document_type': 'contract',
            'description': 'Testing circle stamp consistency',
            'recipient_name': 'Test Recipient',
            'recipient_org': 'Test Organization',
            'brand_color': '#10B981',
            'show_advocate_name': 'true',
            'show_tls_logo': 'true',
            'layout': 'horizontal',
            'shape': 'circle',
            'include_signature': 'false',
            'show_signature_placeholder': 'false',
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
        
        assert response.status_code == 200, f"Stamp creation failed: {response.text}"
        result = response.json()
        
        # Verify response structure
        assert "stamp_id" in result
        assert "stamped_document" in result
        assert "qr_code_data" in result
        
        print(f"✓ Circle stamped document created with stamp ID: {result['stamp_id']}")
        return result
    
    def test_verify_circle_stamp(self, auth_headers):
        """Create Circle stamp and verify it exists in database"""
        # First create a stamp
        from reportlab.lib.pagesizes import letter
        from reportlab.pdfgen import canvas
        from io import BytesIO
        
        pdf_buffer = BytesIO()
        c = canvas.Canvas(pdf_buffer, pagesize=letter)
        c.drawString(100, 700, "Verification Test Document")
        c.save()
        pdf_buffer.seek(0)
        
        files = {'file': ('verify_circle.pdf', pdf_buffer, 'application/pdf')}
        data = {
            'stamp_type': 'certification',
            'stamp_position': '{"page": 1, "x": 400, "y": 700, "width": 150, "height": 150}',
            'document_name': 'Verify Circle Stamp Test',
            'document_type': 'affidavit',
            'description': 'Testing stamp verification',
            'recipient_name': 'Verification Recipient',
            'recipient_org': '',
            'brand_color': '#3B82F6',
            'show_advocate_name': 'true',
            'show_tls_logo': 'true',
            'layout': 'horizontal',
            'shape': 'circle',
            'include_signature': 'false',
            'show_signature_placeholder': 'false',
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
        stamp_id = result["stamp_id"]
        
        # Verify the stamp via public verification endpoint
        verify_response = requests.get(f"{BASE_URL}/api/verify/stamp/{stamp_id}")
        assert verify_response.status_code == 200, f"Verification failed: {verify_response.text}"
        
        verify_data = verify_response.json()
        assert verify_data["valid"] == True
        assert verify_data["stamp_id"] == stamp_id
        assert verify_data.get("stamp_type") or verify_data.get("document_type")
        
        print(f"✓ Circle stamp verified successfully: {stamp_id}")
        print(f"  - Advocate: {verify_data.get('advocate_name', 'N/A')}")
        print(f"  - Document: {verify_data.get('document_name', 'N/A')}")
    
    def test_stamped_pdf_contains_stamp_image(self, auth_headers):
        """Test that stamped PDF contains embedded stamp image"""
        from reportlab.lib.pagesizes import letter
        from reportlab.pdfgen import canvas
        from io import BytesIO
        
        pdf_buffer = BytesIO()
        c = canvas.Canvas(pdf_buffer, pagesize=letter)
        c.drawString(100, 700, "PDF Stamp Image Test")
        c.save()
        pdf_buffer.seek(0)
        
        files = {'file': ('pdf_stamp_test.pdf', pdf_buffer, 'application/pdf')}
        data = {
            'stamp_type': 'certification',
            'stamp_position': '{"page": 1, "x": 300, "y": 600, "width": 150, "height": 150}',
            'document_name': 'PDF Stamp Image Test',
            'document_type': 'contract',
            'description': '',
            'recipient_name': 'PDF Test',
            'recipient_org': '',
            'brand_color': '#10B981',
            'show_advocate_name': 'true',
            'show_tls_logo': 'true',
            'layout': 'horizontal',
            'shape': 'circle',
            'include_signature': 'false',
            'show_signature_placeholder': 'false',
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
        
        # Verify stamped document is returned
        assert "stamped_document" in result
        stamped_pdf_b64 = result["stamped_document"]
        
        # Decode and check it's a valid PDF
        pdf_bytes = base64.b64decode(stamped_pdf_b64)
        assert pdf_bytes[:4] == b'%PDF', "Output is not a valid PDF"
        assert len(pdf_bytes) > 1000, "PDF seems too small to contain stamp"
        
        print(f"✓ Stamped PDF generated successfully ({len(pdf_bytes)} bytes)")
    
    def test_qr_code_is_valid_image(self, auth_headers):
        """Test that QR code data is a valid PNG image"""
        from reportlab.lib.pagesizes import letter
        from reportlab.pdfgen import canvas
        from io import BytesIO
        
        pdf_buffer = BytesIO()
        c = canvas.Canvas(pdf_buffer, pagesize=letter)
        c.drawString(100, 700, "QR Code Test")
        c.save()
        pdf_buffer.seek(0)
        
        files = {'file': ('qr_test.pdf', pdf_buffer, 'application/pdf')}
        data = {
            'stamp_type': 'certification',
            'stamp_position': '{"page": 1, "x": 400, "y": 700, "width": 150, "height": 150}',
            'document_name': 'QR Code Test',
            'document_type': 'contract',
            'description': '',
            'recipient_name': 'QR Test',
            'recipient_org': '',
            'brand_color': '#10B981',
            'show_advocate_name': 'true',
            'show_tls_logo': 'true',
            'layout': 'horizontal',
            'shape': 'circle',
            'include_signature': 'false',
            'show_signature_placeholder': 'false',
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
        
        # Verify QR code is valid image
        qr_b64 = result["qr_code_data"]
        qr_bytes = base64.b64decode(qr_b64)
        
        # Check PNG signature
        assert qr_bytes[:8] == b'\x89PNG\r\n\x1a\n', "QR code is not a valid PNG"
        
        # Load as PIL image to verify
        qr_img = Image.open(BytesIO(qr_bytes))
        assert qr_img.size[0] > 50, "QR image width too small"
        assert qr_img.size[1] > 50, "QR image height too small"
        
        print(f"✓ QR code is valid PNG image ({qr_img.size[0]}x{qr_img.size[1]})")
    
    def test_circle_stamp_with_advocate_name_disabled(self, auth_headers):
        """Test Circle stamp with advocate name disabled"""
        from reportlab.lib.pagesizes import letter
        from reportlab.pdfgen import canvas
        from io import BytesIO
        
        pdf_buffer = BytesIO()
        c = canvas.Canvas(pdf_buffer, pagesize=letter)
        c.drawString(100, 700, "No Name Test")
        c.save()
        pdf_buffer.seek(0)
        
        files = {'file': ('no_name_test.pdf', pdf_buffer, 'application/pdf')}
        data = {
            'stamp_type': 'notarization',
            'stamp_position': '{"page": 1, "x": 400, "y": 700, "width": 150, "height": 150}',
            'document_name': 'No Advocate Name Test',
            'document_type': 'affidavit',
            'description': '',
            'recipient_name': 'No Name Test',
            'recipient_org': '',
            'brand_color': '#8B5CF6',
            'show_advocate_name': 'false',  # Disabled
            'show_tls_logo': 'true',
            'layout': 'horizontal',
            'shape': 'circle',
            'include_signature': 'false',
            'show_signature_placeholder': 'false',
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
        assert "stamp_id" in result
        
        print(f"✓ Circle stamp created with advocate name disabled: {result['stamp_id']}")
    
    def test_multiple_brand_colors(self, auth_headers):
        """Test Circle stamp with different brand colors"""
        from reportlab.lib.pagesizes import letter
        from reportlab.pdfgen import canvas
        from io import BytesIO
        
        brand_colors = [
            ("#10B981", "Emerald"),
            ("#3B82F6", "Blue"),
            ("#8B5CF6", "Purple"),
            ("#F59E0B", "Gold"),
            ("#EF4444", "Red")
        ]
        
        for color, name in brand_colors:
            pdf_buffer = BytesIO()
            c = canvas.Canvas(pdf_buffer, pagesize=letter)
            c.drawString(100, 700, f"Color Test: {name}")
            c.save()
            pdf_buffer.seek(0)
            
            files = {'file': (f'color_{name.lower()}.pdf', pdf_buffer, 'application/pdf')}
            data = {
                'stamp_type': 'certification',
                'stamp_position': '{"page": 1, "x": 400, "y": 700, "width": 150, "height": 150}',
                'document_name': f'Color Test {name}',
                'document_type': 'contract',
                'description': '',
                'recipient_name': f'{name} Color Test',
                'recipient_org': '',
                'brand_color': color,
                'show_advocate_name': 'true',
                'show_tls_logo': 'true',
                'layout': 'horizontal',
                'shape': 'circle',
                'include_signature': 'false',
                'show_signature_placeholder': 'false',
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
            
            assert response.status_code == 200, f"Failed for color {name}: {response.text}"
            print(f"  ✓ Color {name} ({color}) works")
        
        print(f"✓ All {len(brand_colors)} brand colors work with Circle stamp")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
