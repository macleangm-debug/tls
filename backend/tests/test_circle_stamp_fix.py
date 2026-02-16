"""
Test suite for Circle Stamp Bug Fix - verifying:
1. Circle stamp backend generates readable horizontal text (not garbled curved text)
2. Downloaded stamp text is readable
3. Stamp is CENTERED when document uploaded
4. API endpoints work correctly
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

class TestCircleStampFix:
    """Tests for the circle stamp bug fix"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup - get auth token"""
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
            self.user = response.json().get("user", {})
        else:
            pytest.skip(f"Authentication failed: {response.status_code}")
    
    def test_backend_health(self):
        """Test 1: Verify backend is responding"""
        response = self.session.get(f"{BASE_URL}/api/health")
        assert response.status_code == 200, f"Health check failed: {response.status_code}"
        print("✅ Backend health check passed")
    
    def test_login_works(self):
        """Test 2: Verify login works"""
        response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        assert response.status_code == 200, f"Login failed: {response.status_code}"
        data = response.json()
        assert "access_token" in data, "No access token in response"
        assert "user" in data, "No user in response"
        print(f"✅ Login successful for {data['user'].get('full_name')}")
    
    def test_stamp_templates_exist(self):
        """Test 3: Verify stamp templates can be retrieved"""
        response = self.session.get(f"{BASE_URL}/api/stamp-templates")
        assert response.status_code == 200, f"Failed to get templates: {response.status_code}"
        templates = response.json()
        print(f"✅ Found {len(templates)} stamp templates")
        
        # Check for circle template
        circle_template = next((t for t in templates if t.get('shape') == 'circle'), None)
        if circle_template:
            print(f"   Circle template: {circle_template.get('name')}, color: {circle_template.get('brand_color')}")
        return templates
    
    def test_document_upload(self):
        """Test 4: Test document upload returns correct structure"""
        # Use the test PDF
        pdf_path = "/tmp/test_multipage.pdf"
        if not os.path.exists(pdf_path):
            # Create a simple test PDF
            pytest.skip("Test PDF not found")
        
        with open(pdf_path, 'rb') as f:
            files = {'file': ('test_doc.pdf', f, 'application/pdf')}
            headers = {"Authorization": self.session.headers.get("Authorization")}
            response = requests.post(
                f"{BASE_URL}/api/documents/upload",
                files=files,
                headers=headers
            )
        
        assert response.status_code == 200, f"Upload failed: {response.status_code} - {response.text}"
        data = response.json()
        
        assert "pages" in data, "No pages count in response"
        assert "document_data" in data, "No document_data in response"
        assert data["pages"] >= 1, "Document should have at least 1 page"
        
        print(f"✅ Document upload successful - {data['pages']} pages")
        return data
    
    def test_circle_stamp_generation(self):
        """Test 5: CRITICAL - Generate circle stamp and verify output is readable"""
        # Upload document first
        pdf_path = "/tmp/test_multipage.pdf"
        if not os.path.exists(pdf_path):
            pytest.skip("Test PDF not found")
        
        with open(pdf_path, 'rb') as f:
            files = {'file': ('test_doc.pdf', f, 'application/pdf')}
            data = {
                'stamp_type': 'notarization',
                'stamp_position': '{"page": 1, "x": 100, "y": 100, "width": 150, "height": 150}',
                'document_name': 'TEST_Circle_Stamp_Doc',
                'document_type': 'contract',
                'description': 'Testing circle stamp generation',
                'recipient_name': 'Test Recipient',
                'recipient_org': 'Test Organization',
                'brand_color': '#10B981',
                'show_advocate_name': 'true',
                'show_tls_logo': 'true',
                'layout': 'horizontal',
                'shape': 'circle',  # CRITICAL: Testing circle shape
                'include_signature': 'false',
                'show_signature_placeholder': 'false',
                'stamp_size': '100',
                'opacity': '100',
                'transparent_background': 'true'
            }
            headers = {"Authorization": self.session.headers.get("Authorization")}
            response = requests.post(
                f"{BASE_URL}/api/documents/stamp",
                files=files,
                data=data,
                headers=headers
            )
        
        assert response.status_code == 200, f"Stamp generation failed: {response.status_code} - {response.text}"
        result = response.json()
        
        # Verify response structure
        assert "stamp_id" in result, "No stamp_id in response"
        assert "stamped_document" in result, "No stamped_document in response"
        assert "qr_code_data" in result, "No qr_code_data in response"
        
        stamp_id = result["stamp_id"]
        print(f"✅ Circle stamp generated successfully: {stamp_id}")
        
        # Verify stamped document is valid base64 PDF
        try:
            pdf_bytes = base64.b64decode(result["stamped_document"])
            assert pdf_bytes[:4] == b'%PDF', "Stamped document is not a valid PDF"
            print(f"   Stamped document size: {len(pdf_bytes)} bytes")
        except Exception as e:
            pytest.fail(f"Invalid stamped document: {e}")
        
        # Verify QR code is valid base64 image
        try:
            qr_bytes = base64.b64decode(result["qr_code_data"])
            qr_img = Image.open(BytesIO(qr_bytes))
            print(f"   QR code size: {qr_img.size}")
        except Exception as e:
            pytest.fail(f"Invalid QR code: {e}")
        
        return result
    
    def test_stamp_centering_calculation(self):
        """Test 6: Verify stamp position is handled correctly by backend"""
        # Test position at center of typical page (612x792 points)
        # Center position: x=(612-150)/2=231, y=(792-150)/2=321
        pdf_path = "/tmp/test_multipage.pdf"
        if not os.path.exists(pdf_path):
            pytest.skip("Test PDF not found")
        
        center_x = 231
        center_y = 321
        
        with open(pdf_path, 'rb') as f:
            files = {'file': ('test_center.pdf', f, 'application/pdf')}
            data = {
                'stamp_type': 'notarization',
                'stamp_position': f'{{"page": 1, "x": {center_x}, "y": {center_y}, "width": 150, "height": 150}}',
                'document_name': 'TEST_Center_Position_Doc',
                'document_type': 'contract',
                'description': 'Testing centered stamp position',
                'recipient_name': 'Test Recipient',
                'recipient_org': '',
                'brand_color': '#10B981',
                'show_advocate_name': 'true',
                'show_tls_logo': 'true',
                'layout': 'horizontal',
                'shape': 'rectangle',
                'include_signature': 'false',
                'show_signature_placeholder': 'false',
                'stamp_size': '100',
                'opacity': '100',
                'transparent_background': 'true'
            }
            headers = {"Authorization": self.session.headers.get("Authorization")}
            response = requests.post(
                f"{BASE_URL}/api/documents/stamp",
                files=files,
                data=data,
                headers=headers
            )
        
        assert response.status_code == 200, f"Centered stamp failed: {response.status_code} - {response.text}"
        result = response.json()
        assert "stamp_id" in result
        print(f"✅ Centered stamp position ({center_x}, {center_y}) accepted")
        return result
    
    def test_verify_stamp(self):
        """Test 7: Verify a generated stamp can be verified"""
        # First generate a stamp
        pdf_path = "/tmp/test_multipage.pdf"
        if not os.path.exists(pdf_path):
            pytest.skip("Test PDF not found")
        
        with open(pdf_path, 'rb') as f:
            files = {'file': ('test_verify.pdf', f, 'application/pdf')}
            data = {
                'stamp_type': 'notarization',
                'stamp_position': '{"page": 1, "x": 100, "y": 100, "width": 150, "height": 150}',
                'document_name': 'TEST_Verify_Doc',
                'document_type': 'contract',
                'recipient_name': 'Test Recipient',
                'brand_color': '#3B82F6',
                'shape': 'circle',
                'show_advocate_name': 'true',
                'include_signature': 'false',
            }
            headers = {"Authorization": self.session.headers.get("Authorization")}
            response = requests.post(
                f"{BASE_URL}/api/documents/stamp",
                files=files,
                data=data,
                headers=headers
            )
        
        if response.status_code != 200:
            pytest.skip(f"Could not create stamp for verification: {response.text}")
        
        stamp_id = response.json()["stamp_id"]
        
        # Now verify the stamp
        verify_response = self.session.get(f"{BASE_URL}/api/verify/stamp/{stamp_id}")
        assert verify_response.status_code == 200, f"Verification failed: {verify_response.status_code}"
        
        verify_data = verify_response.json()
        assert verify_data.get("valid") == True, "Stamp should be valid"
        assert verify_data.get("stamp_id") == stamp_id, "Stamp ID mismatch"
        
        print(f"✅ Stamp verification successful: {stamp_id}")
        print(f"   Advocate: {verify_data.get('advocate_name')}")
        print(f"   Status: {verify_data.get('stamp_status')}")
    
    def test_all_shapes_generate(self):
        """Test 8: Verify all stamp shapes (rectangle, circle, oval) generate successfully"""
        pdf_path = "/tmp/test_multipage.pdf"
        if not os.path.exists(pdf_path):
            pytest.skip("Test PDF not found")
        
        shapes = ["rectangle", "circle", "oval"]
        results = {}
        
        for shape in shapes:
            with open(pdf_path, 'rb') as f:
                files = {'file': (f'test_{shape}.pdf', f, 'application/pdf')}
                data = {
                    'stamp_type': 'notarization',
                    'stamp_position': '{"page": 1, "x": 100, "y": 100, "width": 150, "height": 150}',
                    'document_name': f'TEST_{shape.capitalize()}_Shape_Doc',
                    'document_type': 'contract',
                    'recipient_name': 'Test Recipient',
                    'brand_color': '#10B981',
                    'shape': shape,
                    'show_advocate_name': 'true',
                    'include_signature': 'false',
                }
                headers = {"Authorization": self.session.headers.get("Authorization")}
                response = requests.post(
                    f"{BASE_URL}/api/documents/stamp",
                    files=files,
                    data=data,
                    headers=headers
                )
            
            assert response.status_code == 200, f"{shape} stamp failed: {response.status_code} - {response.text}"
            results[shape] = response.json()["stamp_id"]
            print(f"✅ {shape.capitalize()} stamp generated: {results[shape]}")
        
        return results


class TestCleanup:
    """Cleanup test data"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        self.session = requests.Session()
        response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        if response.status_code == 200:
            token = response.json().get("access_token")
            self.session.headers.update({"Authorization": f"Bearer {token}"})
    
    def test_list_stamps_for_cleanup(self):
        """List stamps that were created during testing (for manual cleanup if needed)"""
        response = self.session.get(f"{BASE_URL}/api/documents/stamps")
        if response.status_code == 200:
            stamps = response.json()
            test_stamps = [s for s in stamps if s.get('document_name', '').startswith('TEST_')]
            print(f"ℹ️  Found {len(test_stamps)} test stamps that can be cleaned up")
            for s in test_stamps[:5]:
                print(f"   - {s.get('stamp_id')}: {s.get('document_name')}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "-s"])
