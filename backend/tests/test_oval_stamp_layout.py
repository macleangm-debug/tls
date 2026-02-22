"""
Test Oval Stamp Layout - Iteration 25
Verifies the updated oval stamp matches the reference layout:
- Taller (portrait) orientation: 200x280 backend, 140x195 frontend
- ★ TLS VERIFIED ★ badge at top with white rounded background  
- TLS Logo box with TSL text and 'Tanganyika Law Society'
- QR Code with colored border around white background
- Stamp ID and Date shown below QR
- Advocate Name in white badge
- SCAN TO VERIFY badge at bottom
- Brand color from settings applied to all colored elements
"""

import pytest
import requests
import os
import base64
from io import BytesIO
from PIL import Image

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://case-manager-36.preview.emergentagent.com')

# Test credentials
TEST_EMAIL = "testadvocate@tls.or.tz"
TEST_PASSWORD = "Test@1234"


class TestOvalStampLayout:
    """Test oval stamp portrait orientation and layout"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        """Login and get auth token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        assert response.status_code == 200, f"Login failed: {response.text}"
        data = response.json()
        return data["access_token"]
    
    @pytest.fixture(scope="class")
    def auth_headers(self, auth_token):
        """Headers with auth token"""
        return {"Authorization": f"Bearer {auth_token}"}
    
    def test_health_check(self):
        """Verify backend is healthy"""
        response = requests.get(f"{BASE_URL}/api/health")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "healthy"
        print("✓ Backend health check passed")
    
    def test_login_success(self):
        """Verify login with test credentials"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data
        assert data["user"]["email"] == TEST_EMAIL
        print("✓ Login successful")
    
    def test_oval_template_exists_or_create(self, auth_headers):
        """Check for existing oval template or create one"""
        # Get existing templates
        response = requests.get(f"{BASE_URL}/api/stamp-templates", headers=auth_headers)
        assert response.status_code == 200
        templates = response.json()
        
        oval_template = next((t for t in templates if t.get("shape") == "oval"), None)
        
        if not oval_template:
            # Create oval template
            template_data = {
                "name": "Test Oval Stamp",
                "shape": "oval",
                "stamp_type": "certification",
                "document_type": "contract",
                "brand_color": "#10B981",
                "show_advocate_name": True,
                "show_tls_logo": True,
                "layout": "vertical",
                "is_default": False
            }
            response = requests.post(f"{BASE_URL}/api/stamp-templates", headers=auth_headers, json=template_data)
            assert response.status_code in [200, 201], f"Failed to create oval template: {response.text}"
            oval_template = response.json()
            print("✓ Created new oval stamp template")
        else:
            print(f"✓ Found existing oval template: {oval_template.get('name')}")
        
        return oval_template
    
    def test_stamp_document_with_oval_shape(self, auth_headers):
        """Test stamping a document with oval shape"""
        # Create a test PDF (minimal valid PDF)
        pdf_content = b"""%PDF-1.4
1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj
2 0 obj << /Type /Pages /Kids [3 0 R] /Count 1 >> endobj
3 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R >> endobj
4 0 obj << /Length 44 >> stream
BT /F1 12 Tf 100 700 Td (Test Document) Tj ET
endstream endobj
xref
0 5
0000000000 65535 f 
0000000009 00000 n 
0000000058 00000 n 
0000000115 00000 n 
0000000214 00000 n 
trailer << /Size 5 /Root 1 0 R >>
startxref
306
%%EOF"""
        
        files = {"file": ("test_oval.pdf", pdf_content, "application/pdf")}
        data = {
            "stamp_type": "certification",
            "stamp_position": '{"page": 1, "pages": [1], "positions": {"1": {"x": 50, "y": 50}}, "width": 140, "height": 195}',
            "document_name": "Oval Test Document",
            "document_type": "contract",
            "description": "Testing oval stamp layout",
            "recipient_name": "Test Recipient",
            "recipient_org": "Test Organization",
            "brand_color": "#10B981",
            "show_advocate_name": "true",
            "show_tls_logo": "true",
            "layout": "vertical",
            "shape": "oval",
            "include_signature": "false",
            "show_signature_placeholder": "false",
            "stamp_size": "100",
            "opacity": "100",
            "transparent_background": "true"
        }
        
        response = requests.post(f"{BASE_URL}/api/documents/stamp", 
                                headers=auth_headers, 
                                files=files, 
                                data=data)
        
        assert response.status_code == 200, f"Stamping failed: {response.text}"
        result = response.json()
        
        # Verify response contains expected fields
        assert "stamp_id" in result, "Response missing stamp_id"
        assert "stamped_document" in result, "Response missing stamped_document"
        assert "qr_code_data" in result, "Response missing qr_code_data"
        
        print(f"✓ Document stamped with oval shape, stamp_id: {result['stamp_id']}")
        return result
    
    def test_verify_oval_stamp(self, auth_headers):
        """Test stamp verification after creating oval stamp"""
        # First create a stamp
        result = self.test_stamp_document_with_oval_shape(auth_headers)
        stamp_id = result["stamp_id"]
        
        # Verify the stamp
        response = requests.get(f"{BASE_URL}/api/verify/{stamp_id}")
        assert response.status_code == 200, f"Verification failed: {response.text}"
        
        verification = response.json()
        assert verification.get("valid") == True, "Stamp should be valid"
        assert verification.get("stamp_id") == stamp_id
        
        print(f"✓ Stamp verification successful for {stamp_id}")
        return verification
    
    def test_oval_stamp_dimensions_in_code(self):
        """
        Verify oval stamp dimensions are configured correctly in backend code
        Backend should be: width=200*scale, height=280*scale (portrait orientation)
        """
        import re
        
        # Read server.py to check dimensions
        server_path = "/app/backend/server.py"
        with open(server_path, 'r') as f:
            content = f.read()
        
        # Check for oval shape dimensions - taller than wide (portrait)
        assert 'shape == "oval"' in content, "Oval shape condition not found"
        
        # Check portrait orientation - height > width
        width_match = re.search(r'if shape == "oval".*?width = int\((\d+) \* scale\)', content, re.DOTALL)
        height_match = re.search(r'if shape == "oval".*?height = int\((\d+) \* scale\)', content, re.DOTALL)
        
        assert width_match, "Width configuration not found for oval"
        assert height_match, "Height configuration not found for oval"
        
        width_val = int(width_match.group(1))
        height_val = int(height_match.group(1))
        
        assert height_val > width_val, f"Oval should be portrait (height {height_val} > width {width_val})"
        assert width_val == 200, f"Expected width 200, got {width_val}"
        assert height_val == 280, f"Expected height 280, got {height_val}"
        
        print(f"✓ Backend oval dimensions correct: {width_val}x{height_val} (portrait)")
    
    def test_oval_stamp_elements_in_backend_code(self):
        """Verify all required elements are present in backend oval stamp generation"""
        with open("/app/backend/server.py", 'r') as f:
            content = f.read()
        
        # Find the oval stamp section
        oval_section_start = content.find('if shape == "oval":')
        oval_section_end = content.find('# ============ RECTANGLE', oval_section_start)
        oval_code = content[oval_section_start:oval_section_end]
        
        # Check for all required elements
        required_elements = [
            ('★ TLS VERIFIED ★', 'TLS VERIFIED badge at top'),
            ('outer oval border', 'Outer oval border'),
            ('Inner decorative oval', 'Inner decorative oval border'),
            ('TLS Logo box', 'TLS Logo box'),
            ('TSL', 'TSL text in logo'),
            ('Tanganyika', 'Tanganyika text'),
            ('Law Society', 'Law Society text'),
            ('QR Code with border', 'QR Code with border'),
            ('stamp_id', 'Stamp ID display'),
            ('current_date', 'Date display'),
            ('Advocate Name badge', 'Advocate Name badge'),
            ('SCAN TO VERIFY', 'SCAN TO VERIFY badge at bottom'),
            ('rgb_color', 'Brand color usage'),
            ('content_bg', 'White background for badges')
        ]
        
        for element, description in required_elements:
            assert element.lower() in oval_code.lower(), f"Missing element: {description}"
            print(f"✓ Found: {description}")
        
        print("✓ All required oval stamp elements found in backend code")
    
    def test_frontend_oval_preview_dimensions(self):
        """Verify frontend uses correct oval dimensions"""
        with open("/app/frontend/src/pages/DocumentStampPage.jsx", 'r') as f:
            content = f.read()
        
        # Check for fixedSizes.oval
        assert "oval: { width: 140, height: 195 }" in content, \
            "Frontend oval dimensions should be 140x195 (portrait)"
        
        print("✓ Frontend oval dimensions correct: 140x195 (portrait)")
    
    def test_frontend_oval_preview_elements(self):
        """Verify frontend oval preview has all required elements"""
        with open("/app/frontend/src/pages/DocumentStampPage.jsx", 'r') as f:
            content = f.read()
        
        # Find the oval stamp preview section
        oval_start = content.find('if (stampShape === "oval")')
        oval_end = content.find('// HORIZONTAL LAYOUT', oval_start) if oval_start != -1 else -1
        
        if oval_start == -1 or oval_end == -1:
            pytest.fail("Could not find oval stamp preview section in frontend")
        
        oval_code = content[oval_start:oval_end]
        
        # Check required frontend elements
        frontend_elements = [
            ('★ TLS VERIFIED ★', 'TLS VERIFIED badge at top'),
            ('Outer oval border', 'Outer oval border'),
            ('Inner oval border', 'Inner oval border'),
            ('TSL', 'TSL text in logo'),
            ('Tanganyika', 'Tanganyika text'),
            ('Law Society', 'Law Society text'),
            ('borderColor: brandColor', 'QR border with brand color'),
            ('previewStampId', 'Stamp ID'),
            ('previewDate', 'Date'),
            ('user?.full_name', 'Advocate name'),
            ('SCAN TO VERIFY', 'SCAN TO VERIFY badge at bottom')
        ]
        
        for element, description in frontend_elements:
            assert element in oval_code, f"Frontend missing: {description}"
            print(f"✓ Frontend has: {description}")
        
        print("✓ All required oval stamp elements found in frontend preview")


class TestOvalStampIntegration:
    """Integration tests for oval stamp end-to-end"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        """Login and get auth token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        if response.status_code != 200:
            pytest.skip(f"Login failed: {response.text}")
        return response.json()["access_token"]
    
    @pytest.fixture(scope="class")
    def auth_headers(self, auth_token):
        return {"Authorization": f"Bearer {auth_token}"}
    
    def test_oval_stamp_brand_color_applied(self, auth_headers):
        """Verify brand color is properly passed and applied"""
        test_colors = ["#10B981", "#3B82F6", "#8B5CF6"]
        
        for color in test_colors:
            pdf_content = b"""%PDF-1.4
1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj
2 0 obj << /Type /Pages /Kids [3 0 R] /Count 1 >> endobj
3 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] >> endobj
xref
0 4
0000000000 65535 f 
0000000009 00000 n 
0000000058 00000 n 
0000000115 00000 n 
trailer << /Size 4 /Root 1 0 R >>
startxref
182
%%EOF"""
            
            files = {"file": ("test_color.pdf", pdf_content, "application/pdf")}
            data = {
                "stamp_type": "notarization",
                "stamp_position": '{"page": 1, "pages": [1], "positions": {"1": {"x": 50, "y": 50}}, "width": 140, "height": 195}',
                "document_name": f"Color Test {color}",
                "document_type": "affidavit",
                "recipient_name": "Color Test",
                "brand_color": color,
                "show_advocate_name": "true",
                "shape": "oval",
                "layout": "vertical"
            }
            
            response = requests.post(f"{BASE_URL}/api/documents/stamp",
                                    headers=auth_headers,
                                    files=files,
                                    data=data)
            
            assert response.status_code == 200, f"Stamp with color {color} failed: {response.text}"
            print(f"✓ Oval stamp with brand color {color} created successfully")
    
    def test_oval_stamp_qr_code_scannable(self, auth_headers):
        """Verify the QR code in stamped document is present"""
        pdf_content = b"""%PDF-1.4
1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj
2 0 obj << /Type /Pages /Kids [3 0 R] /Count 1 >> endobj
3 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] >> endobj
xref
0 4
0000000000 65535 f 
0000000009 00000 n 
0000000058 00000 n 
0000000115 00000 n 
trailer << /Size 4 /Root 1 0 R >>
startxref
182
%%EOF"""
        
        files = {"file": ("test_qr.pdf", pdf_content, "application/pdf")}
        data = {
            "stamp_type": "certification",
            "stamp_position": '{"page": 1, "pages": [1], "positions": {"1": {"x": 100, "y": 100}}, "width": 140, "height": 195}',
            "document_name": "QR Code Test",
            "document_type": "contract",
            "recipient_name": "QR Test",
            "brand_color": "#10B981",
            "show_advocate_name": "true",
            "shape": "oval"
        }
        
        response = requests.post(f"{BASE_URL}/api/documents/stamp",
                                headers=auth_headers,
                                files=files,
                                data=data)
        
        assert response.status_code == 200
        result = response.json()
        
        # Verify QR code data is present
        assert "qr_code_data" in result, "QR code data missing from response"
        assert len(result["qr_code_data"]) > 100, "QR code data seems too small"
        
        # Try to decode QR code as image
        try:
            qr_bytes = base64.b64decode(result["qr_code_data"])
            qr_image = Image.open(BytesIO(qr_bytes))
            assert qr_image.size[0] > 0 and qr_image.size[1] > 0, "QR image has invalid dimensions"
            print(f"✓ QR code image decoded: {qr_image.size[0]}x{qr_image.size[1]}")
        except Exception as e:
            pytest.fail(f"Failed to decode QR code image: {e}")
        
        print(f"✓ Oval stamp QR code is present and decodable")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
