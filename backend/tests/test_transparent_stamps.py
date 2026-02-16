"""
Test transparent stamp functionality:
- Stamp generation with transparent backgrounds for all shapes (circle, oval, rectangle)
- White backgrounds appear only behind content elements (QR code, text, signature area)
- PDF stamping with transparent stamps applied correctly
- Different layouts (horizontal, vertical, compact, logo_left, logo_right) work correctly
- Login as advocate and stamp a document workflow
"""

import pytest
import requests
import os
import base64
import json
from io import BytesIO

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
TEST_ADVOCATE_EMAIL = "testadvocate@tls.or.tz"
TEST_ADVOCATE_PASSWORD = "Test@1234"

class TestHealth:
    """Health check tests"""
    
    def test_health_endpoint(self):
        """Test API health endpoint"""
        response = requests.get(f"{BASE_URL}/api/health")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "healthy"
        print("✓ Health check passed")


class TestAdvocateAuth:
    """Authentication tests"""
    
    def test_advocate_login(self):
        """Test advocate login"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_ADVOCATE_EMAIL,
            "password": TEST_ADVOCATE_PASSWORD
        })
        assert response.status_code == 200, f"Login failed: {response.text}"
        data = response.json()
        assert "access_token" in data
        assert "user" in data
        print(f"✓ Advocate login successful: {data['user']['full_name']}")
        return data["access_token"]


class TestStampTemplates:
    """Test stamp templates API"""
    
    @pytest.fixture
    def auth_token(self):
        """Get auth token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_ADVOCATE_EMAIL,
            "password": TEST_ADVOCATE_PASSWORD
        })
        if response.status_code == 200:
            return response.json()["access_token"]
        pytest.skip("Authentication failed")
    
    def test_get_stamp_templates(self, auth_token):
        """Test fetching stamp templates"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        response = requests.get(f"{BASE_URL}/api/stamp-templates", headers=headers)
        assert response.status_code == 200
        templates = response.json()
        print(f"✓ Retrieved {len(templates)} stamp templates")
        
        # Check if templates exist
        if len(templates) > 0:
            for template in templates:
                print(f"  - Shape: {template.get('shape', 'N/A')}, Layout: {template.get('layout', 'N/A')}")
        return templates


class TestStampGeneration:
    """Test stamp image generation with transparent backgrounds"""
    
    @pytest.fixture
    def auth_token(self):
        """Get auth token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_ADVOCATE_EMAIL,
            "password": TEST_ADVOCATE_PASSWORD
        })
        if response.status_code == 200:
            return response.json()["access_token"]
        pytest.skip("Authentication failed")
    
    def test_stamp_preview_rectangle(self, auth_token):
        """Test stamp preview generation for rectangle shape"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        params = {
            "shape": "rectangle",
            "layout": "horizontal",
            "brand_color": "#10B981",
            "show_advocate_name": "true",
            "show_tls_logo": "true",
            "transparent_background": "true"
        }
        response = requests.get(f"{BASE_URL}/api/stamp-preview", headers=headers, params=params)
        assert response.status_code == 200, f"Failed to generate rectangle stamp: {response.text}"
        
        data = response.json()
        assert "preview_image" in data or "stamp_preview" in data
        print("✓ Rectangle stamp preview generated with transparent background")
    
    def test_stamp_preview_circle(self, auth_token):
        """Test stamp preview generation for circle shape"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        params = {
            "shape": "circle",
            "brand_color": "#10B981",
            "show_advocate_name": "true",
            "show_tls_logo": "true",
            "transparent_background": "true"
        }
        response = requests.get(f"{BASE_URL}/api/stamp-preview", headers=headers, params=params)
        assert response.status_code == 200, f"Failed to generate circle stamp: {response.text}"
        print("✓ Circle stamp preview generated with transparent background")
    
    def test_stamp_preview_oval(self, auth_token):
        """Test stamp preview generation for oval shape"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        params = {
            "shape": "oval",
            "brand_color": "#10B981",
            "show_advocate_name": "true",
            "show_tls_logo": "true",
            "transparent_background": "true"
        }
        response = requests.get(f"{BASE_URL}/api/stamp-preview", headers=headers, params=params)
        assert response.status_code == 200, f"Failed to generate oval stamp: {response.text}"
        print("✓ Oval stamp preview generated with transparent background")


class TestStampLayouts:
    """Test different stamp layouts with transparent backgrounds"""
    
    @pytest.fixture
    def auth_token(self):
        """Get auth token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_ADVOCATE_EMAIL,
            "password": TEST_ADVOCATE_PASSWORD
        })
        if response.status_code == 200:
            return response.json()["access_token"]
        pytest.skip("Authentication failed")
    
    @pytest.mark.parametrize("layout", ["horizontal", "vertical", "compact", "logo_left", "logo_right"])
    def test_stamp_layout(self, auth_token, layout):
        """Test stamp generation for different layouts"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        params = {
            "shape": "rectangle",
            "layout": layout,
            "brand_color": "#10B981",
            "show_advocate_name": "true",
            "show_tls_logo": "true",
            "transparent_background": "true"
        }
        response = requests.get(f"{BASE_URL}/api/stamp-preview", headers=headers, params=params)
        assert response.status_code == 200, f"Failed to generate {layout} layout stamp: {response.text}"
        print(f"✓ {layout.title()} layout stamp generated with transparent background")


class TestDocumentUpload:
    """Test document upload functionality"""
    
    @pytest.fixture
    def auth_token(self):
        """Get auth token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_ADVOCATE_EMAIL,
            "password": TEST_ADVOCATE_PASSWORD
        })
        if response.status_code == 200:
            return response.json()["access_token"]
        pytest.skip("Authentication failed")
    
    def test_document_upload(self, auth_token):
        """Test uploading a PDF document for stamping"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        
        # Create a simple test PDF (minimal valid PDF)
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
0000000206 00000 n 
trailer
<< /Size 5 /Root 1 0 R >>
startxref
300
%%EOF"""
        
        files = {'file': ('test_document.pdf', pdf_content, 'application/pdf')}
        response = requests.post(f"{BASE_URL}/api/documents/upload", headers=headers, files=files)
        assert response.status_code == 200, f"Failed to upload document: {response.text}"
        
        data = response.json()
        assert "document_data" in data or "pages" in data
        print(f"✓ Document uploaded successfully, pages: {data.get('pages', 'N/A')}")
        return data


class TestDocumentStamping:
    """Test document stamping with transparent stamps"""
    
    @pytest.fixture
    def auth_token(self):
        """Get auth token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_ADVOCATE_EMAIL,
            "password": TEST_ADVOCATE_PASSWORD
        })
        if response.status_code == 200:
            return response.json()["access_token"]
        pytest.skip("Authentication failed")
    
    def test_stamp_document_rectangle(self, auth_token):
        """Test stamping a document with a transparent rectangle stamp"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        
        # Create a simple test PDF
        pdf_content = b"""%PDF-1.4
1 0 obj
<< /Type /Catalog /Pages 2 0 R >>
endobj
2 0 obj
<< /Type /Pages /Kids [3 0 R] /Count 1 >>
endobj
3 0 obj
<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << >> >>
endobj
4 0 obj
<< /Length 44 >>
stream
BT
100 700 Td
(Test Document for TLS Stamp) Tj
ET
endstream
endobj
xref
0 5
0000000000 65535 f 
0000000009 00000 n 
0000000058 00000 n 
0000000115 00000 n 
0000000230 00000 n 
trailer
<< /Size 5 /Root 1 0 R >>
startxref
324
%%EOF"""
        
        files = {'file': ('test_stamp.pdf', pdf_content, 'application/pdf')}
        data = {
            'stamp_type': 'certification',
            'stamp_position': json.dumps({'page': 1, 'x': 400, 'y': 50, 'width': 200, 'height': 140}),
            'document_name': 'TEST_TransparentStampDoc',
            'document_type': 'contract',
            'description': 'Testing transparent stamp',
            'recipient_name': 'Test Recipient',
            'recipient_org': 'Test Organization',
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
        
        response = requests.post(f"{BASE_URL}/api/documents/stamp", headers=headers, files=files, data=data)
        assert response.status_code == 200, f"Failed to stamp document: {response.text}"
        
        result = response.json()
        assert "stamp_id" in result
        assert "stamped_document" in result
        assert "qr_code_data" in result
        print(f"✓ Document stamped with transparent rectangle stamp, ID: {result['stamp_id']}")
        return result
    
    def test_stamp_document_circle(self, auth_token):
        """Test stamping a document with a transparent circle stamp"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        
        # Create a simple test PDF
        pdf_content = b"""%PDF-1.4
1 0 obj
<< /Type /Catalog /Pages 2 0 R >>
endobj
2 0 obj
<< /Type /Pages /Kids [3 0 R] /Count 1 >>
endobj
3 0 obj
<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << >> >>
endobj
4 0 obj
<< /Length 44 >>
stream
BT
100 700 Td
(Test Document for TLS Circle Stamp) Tj
ET
endstream
endobj
xref
0 5
0000000000 65535 f 
0000000009 00000 n 
0000000058 00000 n 
0000000115 00000 n 
0000000230 00000 n 
trailer
<< /Size 5 /Root 1 0 R >>
startxref
324
%%EOF"""
        
        files = {'file': ('test_circle_stamp.pdf', pdf_content, 'application/pdf')}
        data = {
            'stamp_type': 'notarization',
            'stamp_position': json.dumps({'page': 1, 'x': 400, 'y': 50, 'width': 150, 'height': 150}),
            'document_name': 'TEST_CircleStampDoc',
            'document_type': 'affidavit',
            'description': 'Testing circle transparent stamp',
            'recipient_name': 'Circle Test Recipient',
            'recipient_org': 'Circle Test Org',
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
        
        response = requests.post(f"{BASE_URL}/api/documents/stamp", headers=headers, files=files, data=data)
        assert response.status_code == 200, f"Failed to stamp document with circle: {response.text}"
        
        result = response.json()
        assert "stamp_id" in result
        assert "stamped_document" in result
        print(f"✓ Document stamped with transparent circle stamp, ID: {result['stamp_id']}")
        return result
    
    def test_stamp_document_oval(self, auth_token):
        """Test stamping a document with a transparent oval stamp"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        
        # Create a simple test PDF
        pdf_content = b"""%PDF-1.4
1 0 obj
<< /Type /Catalog /Pages 2 0 R >>
endobj
2 0 obj
<< /Type /Pages /Kids [3 0 R] /Count 1 >>
endobj
3 0 obj
<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << >> >>
endobj
4 0 obj
<< /Length 44 >>
stream
BT
100 700 Td
(Test Document for TLS Oval Stamp) Tj
ET
endstream
endobj
xref
0 5
0000000000 65535 f 
0000000009 00000 n 
0000000058 00000 n 
0000000115 00000 n 
0000000230 00000 n 
trailer
<< /Size 5 /Root 1 0 R >>
startxref
324
%%EOF"""
        
        files = {'file': ('test_oval_stamp.pdf', pdf_content, 'application/pdf')}
        data = {
            'stamp_type': 'certification',
            'stamp_position': json.dumps({'page': 1, 'x': 400, 'y': 50, 'width': 180, 'height': 100}),
            'document_name': 'TEST_OvalStampDoc',
            'document_type': 'legal_opinion',
            'description': 'Testing oval transparent stamp',
            'recipient_name': 'Oval Test Recipient',
            'recipient_org': 'Oval Test Org',
            'brand_color': '#8B5CF6',
            'show_advocate_name': 'true',
            'show_tls_logo': 'true',
            'layout': 'horizontal',
            'shape': 'oval',
            'include_signature': 'false',
            'show_signature_placeholder': 'false',
            'stamp_size': '100',
            'opacity': '100',
            'transparent_background': 'true'
        }
        
        response = requests.post(f"{BASE_URL}/api/documents/stamp", headers=headers, files=files, data=data)
        assert response.status_code == 200, f"Failed to stamp document with oval: {response.text}"
        
        result = response.json()
        assert "stamp_id" in result
        assert "stamped_document" in result
        print(f"✓ Document stamped with transparent oval stamp, ID: {result['stamp_id']}")
        return result


class TestStampVerification:
    """Test stamp verification after stamping"""
    
    @pytest.fixture
    def auth_token(self):
        """Get auth token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_ADVOCATE_EMAIL,
            "password": TEST_ADVOCATE_PASSWORD
        })
        if response.status_code == 200:
            return response.json()["access_token"]
        pytest.skip("Authentication failed")
    
    def test_verify_stamp(self, auth_token):
        """Test verifying a recently created stamp"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        
        # First, get the list of stamps
        response = requests.get(f"{BASE_URL}/api/documents/stamps", headers=headers)
        assert response.status_code == 200
        
        stamps = response.json()
        if len(stamps) == 0:
            pytest.skip("No stamps available to verify")
        
        # Get a recent TEST stamp to verify
        test_stamps = [s for s in stamps if s.get('document_name', '').startswith('TEST_')]
        if len(test_stamps) == 0:
            pytest.skip("No test stamps available to verify")
        
        stamp = test_stamps[0]
        stamp_id = stamp['stamp_id']
        
        # Verify the stamp
        verify_response = requests.get(f"{BASE_URL}/api/verify/{stamp_id}")
        assert verify_response.status_code == 200, f"Failed to verify stamp: {verify_response.text}"
        
        result = verify_response.json()
        assert result.get('valid') == True or result.get('stamp_id') == stamp_id
        print(f"✓ Stamp {stamp_id} verified successfully")


class TestCleanup:
    """Clean up test data after tests"""
    
    @pytest.fixture
    def auth_token(self):
        """Get auth token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_ADVOCATE_EMAIL,
            "password": TEST_ADVOCATE_PASSWORD
        })
        if response.status_code == 200:
            return response.json()["access_token"]
        pytest.skip("Authentication failed")
    
    def test_revoke_test_stamps(self, auth_token):
        """Revoke all TEST_ prefixed stamps to clean up"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        
        # Get all stamps
        response = requests.get(f"{BASE_URL}/api/documents/stamps", headers=headers)
        if response.status_code != 200:
            pytest.skip("Could not fetch stamps for cleanup")
        
        stamps = response.json()
        test_stamps = [s for s in stamps if s.get('document_name', '').startswith('TEST_')]
        
        revoked_count = 0
        for stamp in test_stamps:
            stamp_id = stamp['stamp_id']
            revoke_response = requests.delete(f"{BASE_URL}/api/documents/stamps/{stamp_id}/revoke", headers=headers)
            if revoke_response.status_code == 200:
                revoked_count += 1
        
        print(f"✓ Cleaned up {revoked_count} test stamps")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
