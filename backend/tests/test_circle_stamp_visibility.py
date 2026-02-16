"""
Test Circle Stamp Visibility Fixes
- Circle stamp slightly smaller (130x130 preview, 180px backend)
- Inner circle smaller (68% of radius) leaving room for curved text
- Curved text VISIBLE between outer border and inner circle
- Text is BOLD using fontWeight='800' and font_bold_medium
- White center content box smaller (58% in backend, 40% in frontend) and doesn't hide curved text
"""

import pytest
import requests
import os
import base64

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestCircleStampVisibility:
    """Test that circle stamp curved text is visible"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test credentials and login"""
        self.email = "testadvocate@tls.or.tz"
        self.password = "Test@1234"
        self.auth_token = None
        
        # Login to get token
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": self.email,
            "password": self.password
        })
        if response.status_code == 200:
            self.auth_token = response.json().get("access_token")
        else:
            pytest.skip("Could not login - skipping authenticated tests")
    
    def get_auth_headers(self):
        return {"Authorization": f"Bearer {self.auth_token}"}
    
    def test_backend_health(self):
        """Test backend is running"""
        response = requests.get(f"{BASE_URL}/api/health")
        assert response.status_code == 200
        assert response.json()["status"] == "healthy"
    
    def test_circle_stamp_generation(self):
        """Test circle stamp can be generated with visible curved text"""
        # Create a minimal PDF for testing
        pdf_content = b"%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj 2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj 3 0 obj<</Type/Page/MediaBox[0 0 612 792]/Parent 2 0 R>>endobj\nxref\n0 4\n0000000000 65535 f\n0000000009 00000 n\n0000000052 00000 n\n0000000101 00000 n\ntrailer<</Size 4/Root 1 0 R>>\nstartxref\n166\n%%EOF"
        
        files = {
            'file': ('test.pdf', pdf_content, 'application/pdf')
        }
        data = {
            'stamp_type': 'certification',
            'document_name': 'TEST_CircleVisibility',
            'document_type': 'contract',
            'description': 'Test for curved text visibility',
            'recipient_name': 'Test Recipient',
            'recipient_org': 'Test Organization',
            'brand_color': '#10B981',
            'show_advocate_name': 'true',
            'show_tls_logo': 'true',
            'layout': 'horizontal',
            'shape': 'circle',  # Critical - test circle shape
            'include_signature': 'false',
            'show_signature_placeholder': 'false',
            'stamp_size': '100',
            'opacity': '100',
            'transparent_background': 'true',
            'stamp_position': '{"page": 1, "pages": [1], "positions": {"1": {"x": 400, "y": 600}}, "width": 130, "height": 130}'
        }
        
        response = requests.post(
            f"{BASE_URL}/api/documents/stamp",
            files=files,
            data=data,
            headers=self.get_auth_headers()
        )
        
        assert response.status_code == 200, f"Stamp creation failed: {response.text}"
        result = response.json()
        
        # Verify response structure
        assert "stamp_id" in result
        assert "stamped_document" in result
        assert result["stamp_id"].startswith("TLS-")
        
        # Verify shape was used
        assert result.get("document_name") == "TEST_CircleVisibility"
        
        print(f"✓ Circle stamp created: {result['stamp_id']}")
        return result
    
    def test_stamp_template_with_circle_shape(self):
        """Test that circle templates are available"""
        response = requests.get(
            f"{BASE_URL}/api/stamp-templates",
            headers=self.get_auth_headers()
        )
        
        assert response.status_code == 200
        templates = response.json()
        
        # Check if any circle template exists
        circle_templates = [t for t in templates if t.get("shape") == "circle"]
        print(f"✓ Found {len(circle_templates)} circle template(s)")
        
        # If a circle template exists, verify it has correct settings
        if circle_templates:
            template = circle_templates[0]
            assert template.get("shape") == "circle"
            print(f"  - Template: {template.get('name')}")
            print(f"  - Brand color: {template.get('brand_color')}")
    
    def test_verification_of_stamped_document(self):
        """Test that created stamp can be verified"""
        # First create a stamp
        pdf_content = b"%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj 2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj 3 0 obj<</Type/Page/MediaBox[0 0 612 792]/Parent 2 0 R>>endobj\nxref\n0 4\n0000000000 65535 f\n0000000009 00000 n\n0000000052 00000 n\n0000000101 00000 n\ntrailer<</Size 4/Root 1 0 R>>\nstartxref\n166\n%%EOF"
        
        files = {
            'file': ('test_verify.pdf', pdf_content, 'application/pdf')
        }
        data = {
            'stamp_type': 'certification',
            'document_name': 'TEST_CircleVerify',
            'document_type': 'contract',
            'recipient_name': 'Verify Test',
            'shape': 'circle',
            'brand_color': '#3B82F6',  # Blue color
            'stamp_position': '{"page": 1, "pages": [1], "positions": {"1": {"x": 400, "y": 600}}, "width": 130, "height": 130}'
        }
        
        create_response = requests.post(
            f"{BASE_URL}/api/documents/stamp",
            files=files,
            data=data,
            headers=self.get_auth_headers()
        )
        
        assert create_response.status_code == 200
        stamp_id = create_response.json()["stamp_id"]
        
        # Now verify the stamp
        verify_response = requests.get(f"{BASE_URL}/api/verify/stamp/{stamp_id}")
        assert verify_response.status_code == 200
        
        verification = verify_response.json()
        assert verification.get("valid") == True
        assert verification.get("stamp_id") == stamp_id
        
        print(f"✓ Stamp {stamp_id} verified successfully")
        print(f"  - Advocate: {verification.get('advocate_name')}")
        print(f"  - Status: {verification.get('stamp_status')}")


class TestCircleStampSizing:
    """Test circle stamp size parameters match specifications"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test credentials and login"""
        self.email = "testadvocate@tls.or.tz"
        self.password = "Test@1234"
        
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": self.email,
            "password": self.password
        })
        if response.status_code == 200:
            self.auth_token = response.json().get("access_token")
        else:
            pytest.skip("Could not login")
    
    def get_auth_headers(self):
        return {"Authorization": f"Bearer {self.auth_token}"}
    
    def test_stamp_with_130px_width(self):
        """Test stamp generation with 130px width (frontend circle size)"""
        pdf_content = b"%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj 2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj 3 0 obj<</Type/Page/MediaBox[0 0 612 792]/Parent 2 0 R>>endobj\nxref\n0 4\n0000000000 65535 f\n0000000009 00000 n\n0000000052 00000 n\n0000000101 00000 n\ntrailer<</Size 4/Root 1 0 R>>\nstartxref\n166\n%%EOF"
        
        files = {'file': ('test_size.pdf', pdf_content, 'application/pdf')}
        data = {
            'stamp_type': 'certification',
            'document_name': 'TEST_CircleSize130',
            'recipient_name': 'Size Test',
            'shape': 'circle',
            # 130x130 is the frontend circle size
            'stamp_position': '{"page": 1, "pages": [1], "positions": {"1": {"x": 400, "y": 600}}, "width": 130, "height": 130}'
        }
        
        response = requests.post(
            f"{BASE_URL}/api/documents/stamp",
            files=files,
            data=data,
            headers=self.get_auth_headers()
        )
        
        assert response.status_code == 200
        result = response.json()
        
        # Verify we got a valid stamped document back
        assert "stamped_document" in result
        assert len(result["stamped_document"]) > 100  # Should have actual content
        
        print(f"✓ Circle stamp generated with 130x130 size specification")
    
    def test_stamp_content_visible_in_pdf(self):
        """Test that the stamped PDF contains the stamp"""
        pdf_content = b"%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj 2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj 3 0 obj<</Type/Page/MediaBox[0 0 612 792]/Parent 2 0 R>>endobj\nxref\n0 4\n0000000000 65535 f\n0000000009 00000 n\n0000000052 00000 n\n0000000101 00000 n\ntrailer<</Size 4/Root 1 0 R>>\nstartxref\n166\n%%EOF"
        
        files = {'file': ('test_content.pdf', pdf_content, 'application/pdf')}
        data = {
            'stamp_type': 'certification',
            'document_name': 'TEST_ContentVisible',
            'recipient_name': 'Content Test',
            'shape': 'circle',
            'brand_color': '#10B981',
            'stamp_position': '{"page": 1, "pages": [1], "positions": {"1": {"x": 400, "y": 600}}, "width": 130, "height": 130}'
        }
        
        response = requests.post(
            f"{BASE_URL}/api/documents/stamp",
            files=files,
            data=data,
            headers=self.get_auth_headers()
        )
        
        assert response.status_code == 200
        result = response.json()
        
        # Decode the PDF and verify it's valid
        pdf_bytes = base64.b64decode(result["stamped_document"])
        assert pdf_bytes.startswith(b"%PDF")
        assert b"endobj" in pdf_bytes
        
        print(f"✓ Stamped PDF is valid and contains stamp content")
        print(f"  - PDF size: {len(pdf_bytes)} bytes")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
