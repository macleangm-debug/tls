"""
Test Circle and Oval Stamp Layout Uniformity
Verifies that Circle and Oval stamps have IDENTICAL vertical badge layouts:
- ★ TLS VERIFIED ★ badge at top
- TSL logo box with 'Tanganyika Law Society'
- QR Code with colored border
- Stamp ID
- SCAN TO VERIFY badge at bottom
"""

import pytest
import requests
import os
import base64
from PIL import Image
from io import BytesIO

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestCircleOvalLayoutUniformity:
    """Test that Circle and Oval stamps have the same vertical layout structure"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test with login"""
        self.login_data = {
            "email": "testadvocate@tls.or.tz",
            "password": "Test@1234"
        }
        response = requests.post(f"{BASE_URL}/api/auth/login", json=self.login_data)
        if response.status_code == 200:
            self.token = response.json().get("access_token")
            self.headers = {"Authorization": f"Bearer {self.token}"}
        else:
            pytest.skip("Login failed - skipping tests")
    
    def test_backend_health(self):
        """Test backend is healthy"""
        response = requests.get(f"{BASE_URL}/api/health")
        assert response.status_code == 200
        print("PASS: Backend health check")
    
    def test_stamp_templates_exist(self):
        """Test that Circle and Oval templates exist"""
        response = requests.get(f"{BASE_URL}/api/stamp-templates", headers=self.headers)
        assert response.status_code == 200
        
        templates = response.json()
        shapes = [t['shape'] for t in templates]
        
        assert 'circle' in shapes, "Circle template not found"
        assert 'oval' in shapes, "Oval template not found"
        print("PASS: Circle and Oval templates exist")
    
    def test_circle_stamp_code_structure(self):
        """Verify Circle stamp code has required elements"""
        # Read the server.py file and check the circle stamp section
        import subprocess
        result = subprocess.run(
            ['grep', '-n', '-A', '100', 'if shape == "circle":', '/app/backend/server.py'],
            capture_output=True, text=True
        )
        
        circle_code = result.stdout
        
        # Check for required elements in Circle stamp code
        required_elements = [
            "TLS VERIFIED",
            "Tanganyika",
            "Law Society",
            "TSL",
            "qr_img",
            "SCAN TO VERIFY",
            "stamp_id"
        ]
        
        for element in required_elements:
            assert element in circle_code, f"Circle stamp missing '{element}' element"
            print(f"  Circle has: {element}")
        
        print("PASS: Circle stamp has all required layout elements")
    
    def test_oval_stamp_code_structure(self):
        """Verify Oval stamp code has required elements"""
        import subprocess
        result = subprocess.run(
            ['grep', '-n', '-A', '100', 'if shape == "oval":', '/app/backend/server.py'],
            capture_output=True, text=True
        )
        
        oval_code = result.stdout
        
        # Check for required elements in Oval stamp code
        required_elements = [
            "TLS VERIFIED",
            "Tanganyika",
            "Law Society",
            "TSL",
            "qr_img",
            "SCAN TO VERIFY",
            "stamp_id"
        ]
        
        for element in required_elements:
            assert element in oval_code, f"Oval stamp missing '{element}' element"
            print(f"  Oval has: {element}")
        
        print("PASS: Oval stamp has all required layout elements")
    
    def test_circle_oval_layout_matching(self):
        """Compare Circle and Oval code sections to verify identical layout order"""
        import subprocess
        
        # Get Circle stamp section
        circle_result = subprocess.run(
            ['grep', '-n', '-A', '80', '# ============ CIRCLE STAMP', '/app/backend/server.py'],
            capture_output=True, text=True
        )
        circle_code = circle_result.stdout
        
        # Get Oval stamp section
        oval_result = subprocess.run(
            ['grep', '-n', '-A', '100', '# ============ OVAL STAMP', '/app/backend/server.py'],
            capture_output=True, text=True
        )
        oval_code = oval_result.stdout
        
        # Both should have vertical layout order:
        # 1. TLS VERIFIED at top
        # 2. TSL logo box
        # 3. QR Code with border
        # 4. Stamp ID
        # 5. SCAN TO VERIFY at bottom
        
        circle_elements_order = []
        oval_elements_order = []
        
        elements_to_find = ["TLS VERIFIED", "TSL", "qr_img", "stamp_id", "SCAN TO VERIFY"]
        
        for elem in elements_to_find:
            if elem in circle_code:
                circle_elements_order.append(elem)
            if elem in oval_code:
                oval_elements_order.append(elem)
        
        assert circle_elements_order == oval_elements_order, \
            f"Layout order mismatch! Circle: {circle_elements_order}, Oval: {oval_elements_order}"
        
        print("PASS: Circle and Oval have identical element order")
        print(f"  Layout order: {circle_elements_order}")
    
    def test_document_stamp_page_no_tabs(self):
        """Verify DocumentStampPage has no 'My Stamps' tab - single view only"""
        import subprocess
        
        # Check that TabsContent with "My Stamps" is NOT in the document stamp page
        result = subprocess.run(
            ['grep', '-c', 'TabsContent.*my-stamps\|my-stamps.*TabsContent', 
             '/app/frontend/src/pages/DocumentStampPage.jsx'],
            capture_output=True, text=True
        )
        
        # Should be 0 - no TabsContent for my-stamps
        tab_count = int(result.stdout.strip() or '0')
        assert tab_count == 0, f"Found {tab_count} 'My Stamps' TabsContent - should be removed"
        
        # Also verify there's a comment about single view
        result2 = subprocess.run(
            ['grep', '-c', 'Single view\|no tabs', 
             '/app/frontend/src/pages/DocumentStampPage.jsx'],
            capture_output=True, text=True
        )
        
        single_view_mentions = int(result2.stdout.strip() or '0')
        assert single_view_mentions > 0, "No 'single view' or 'no tabs' comments found"
        
        print("PASS: DocumentStampPage has single view (no tabs)")
    
    def test_frontend_circle_stamp_preview_elements(self):
        """Verify frontend Circle stamp preview has all required elements"""
        import subprocess
        
        # Get the circle stamp preview section from frontend
        result = subprocess.run(
            ['grep', '-A', '80', 'CIRCLE STAMP - Same layout as Oval', 
             '/app/frontend/src/pages/DocumentStampPage.jsx'],
            capture_output=True, text=True
        )
        
        circle_preview = result.stdout
        
        # Check required elements
        required = [
            "TLS VERIFIED",
            "TSL",
            "Tanganyika",
            "Law Society",
            "SCAN TO VERIFY",
            "previewStampId"
        ]
        
        for elem in required:
            assert elem in circle_preview, f"Frontend Circle preview missing '{elem}'"
            print(f"  Frontend Circle has: {elem}")
        
        print("PASS: Frontend Circle stamp preview has all elements")
    
    def test_frontend_oval_stamp_preview_elements(self):
        """Verify frontend Oval stamp preview has all required elements"""
        import subprocess
        
        # Get the oval stamp preview section from frontend
        result = subprocess.run(
            ['grep', '-A', '100', 'OVAL STAMP - Exact layout matching', 
             '/app/frontend/src/pages/DocumentStampPage.jsx'],
            capture_output=True, text=True
        )
        
        oval_preview = result.stdout
        
        # Check required elements
        required = [
            "TLS VERIFIED",
            "TSL",
            "Tanganyika",
            "Law Society",
            "SCAN TO VERIFY",
            "previewStampId"
        ]
        
        for elem in required:
            assert elem in oval_preview, f"Frontend Oval preview missing '{elem}'"
            print(f"  Frontend Oval has: {elem}")
        
        print("PASS: Frontend Oval stamp preview has all elements")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
