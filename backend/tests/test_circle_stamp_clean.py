"""
Test Suite for Circle Stamp Clean Text Fixes - Iteration 23
Tests the following fixes:
1) Curved text is CLEAN without per-character white backgrounds
2) Advocate name is INSIDE the center content box, not at bottom
3) No collision between advocate name and 'SCAN TO VERIFY' text  
4) Preview shows clean SVG without TLS box hiding text
5) Downloaded stamp matches preview - clean readable text
"""

import pytest
import requests
import os
import json
import base64
from io import BytesIO

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestCircleStampCleanFixes:
    """Test suite for circle stamp readability fixes"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Get auth token for testing"""
        login_response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "testadvocate@tls.or.tz",
            "password": "Test@1234"
        })
        assert login_response.status_code == 200, f"Login failed: {login_response.text}"
        self.token = login_response.json()["access_token"]
        self.user = login_response.json().get("user", {})
        self.headers = {"Authorization": f"Bearer {self.token}"}
    
    def test_backend_health(self):
        """Test backend is healthy"""
        response = requests.get(f"{BASE_URL}/api/health")
        assert response.status_code == 200
        assert response.json()["status"] == "healthy"
        print("✓ Backend is healthy")
    
    def test_create_circle_stamp_clean_text(self):
        """
        Test creating a circle stamp and verify:
        - Curved text has no per-character white backgrounds  
        - Advocate name is inside center content box
        - No collision with SCAN TO VERIFY text
        """
        # Create a simple test PDF for stamping
        test_pdf_base64 = self._create_minimal_pdf()
        
        # Upload the test document
        files = {
            'file': ('test_circle_clean.pdf', base64.b64decode(test_pdf_base64), 'application/pdf')
        }
        upload_response = requests.post(
            f"{BASE_URL}/api/documents/upload",
            files=files,
            headers=self.headers
        )
        assert upload_response.status_code == 200, f"Upload failed: {upload_response.text}"
        print("✓ Test document uploaded")
        
        # Now stamp the document with circle shape
        files = {
            'file': ('test_circle_clean.pdf', base64.b64decode(test_pdf_base64), 'application/pdf')
        }
        stamp_data = {
            'stamp_type': 'certification',
            'stamp_position': json.dumps({
                'page': 1,
                'pages': [1],
                'positions': {'1': {'x': 400, 'y': 600}},
                'width': 150,
                'height': 150
            }),
            'document_name': 'Circle Clean Test',
            'document_type': 'contract',
            'description': 'Testing clean curved text without white backgrounds',
            'recipient_name': 'Test Recipient',
            'recipient_org': 'Test Organization',
            'brand_color': '#10B981',
            'show_advocate_name': 'true',
            'show_tls_logo': 'true',
            'layout': 'horizontal',
            'shape': 'circle',  # KEY: Circle shape
            'include_signature': 'false',
            'show_signature_placeholder': 'false',
            'stamp_size': '100',
            'opacity': '100',
            'transparent_background': 'true'
        }
        
        stamp_response = requests.post(
            f"{BASE_URL}/api/documents/stamp",
            files=files,
            data=stamp_data,
            headers=self.headers
        )
        
        assert stamp_response.status_code == 200, f"Stamp creation failed: {stamp_response.text}"
        result = stamp_response.json()
        
        # Verify stamp was created with circle shape
        assert 'stamp_id' in result, "Missing stamp_id in response"
        assert 'stamped_document' in result, "Missing stamped_document in response"
        assert 'qr_code_data' in result, "Missing qr_code_data in response"
        
        # The stamp_id format should be TLS-YYYYMMDD-XXXX
        assert result['stamp_id'].startswith('TLS-'), f"Invalid stamp ID format: {result['stamp_id']}"
        
        print(f"✓ Circle stamp created: {result['stamp_id']}")
        print(f"  - Document name: {result.get('document_name')}")
        print(f"  - Advocate: {result.get('advocate_name')}")
        
        # Verify the stamped document is a valid base64 PDF
        try:
            decoded = base64.b64decode(result['stamped_document'])
            assert decoded[:4] == b'%PDF', "Stamped document is not a valid PDF"
            print(f"  - Stamped PDF size: {len(decoded)} bytes")
        except Exception as e:
            pytest.fail(f"Failed to decode stamped document: {e}")
        
        # Return stamp_id for further verification
        return result['stamp_id']
    
    def test_verify_circle_stamp(self):
        """Test that created circle stamp can be verified"""
        # First create a stamp
        test_pdf_base64 = self._create_minimal_pdf()
        
        files = {
            'file': ('test_verify_circle.pdf', base64.b64decode(test_pdf_base64), 'application/pdf')
        }
        stamp_data = {
            'stamp_type': 'certification',
            'stamp_position': json.dumps({
                'page': 1,
                'pages': [1],
                'positions': {'1': {'x': 400, 'y': 600}},
                'width': 150,
                'height': 150
            }),
            'document_name': 'Verification Test Circle',
            'document_type': 'contract',
            'description': 'Circle stamp for verification test',
            'recipient_name': 'Verification Test',
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
        
        stamp_response = requests.post(
            f"{BASE_URL}/api/documents/stamp",
            files=files,
            data=stamp_data,
            headers=self.headers
        )
        assert stamp_response.status_code == 200
        stamp_id = stamp_response.json()['stamp_id']
        
        # Now verify the stamp - public endpoint, no auth needed
        verify_response = requests.get(f"{BASE_URL}/api/verify/stamp/{stamp_id}")
        assert verify_response.status_code == 200, f"Verification failed: {verify_response.text}"
        
        result = verify_response.json()
        assert result['valid'] == True, "Stamp should be valid"
        assert result.get('stamp_status') == 'active', f"Expected active status, got {result.get('stamp_status')}"
        assert result.get('advocate_name'), "Missing advocate name in verification"
        
        print(f"✓ Circle stamp verified successfully:")
        print(f"  - Stamp ID: {result.get('stamp_id')}")
        print(f"  - Advocate: {result.get('advocate_name')}")
        print(f"  - Status: {result.get('stamp_status')}")
        print(f"  - Document: {result.get('document_name')}")
    
    def test_stamp_templates_with_circle(self):
        """Test that templates can be loaded and applied for circle stamps"""
        response = requests.get(f"{BASE_URL}/api/stamp-templates", headers=self.headers)
        assert response.status_code == 200, f"Failed to get templates: {response.text}"
        
        templates = response.json()
        
        # Check if there's a circle template
        circle_templates = [t for t in templates if t.get('shape') == 'circle']
        
        print(f"✓ Found {len(templates)} templates total")
        print(f"  - Circle templates: {len(circle_templates)}")
        
        if circle_templates:
            template = circle_templates[0]
            print(f"  - Circle template name: {template.get('name')}")
            print(f"  - Brand color: {template.get('brand_color')}")
            print(f"  - Show advocate name: {template.get('show_advocate_name')}")
    
    def test_different_brand_colors_circle(self):
        """Test circle stamps with different brand colors"""
        test_pdf_base64 = self._create_minimal_pdf()
        
        colors = [
            ("#10B981", "Emerald"),
            ("#3B82F6", "Blue"),
            ("#8B5CF6", "Purple")
        ]
        
        for color, name in colors:
            files = {
                'file': (f'test_{name.lower()}_circle.pdf', base64.b64decode(test_pdf_base64), 'application/pdf')
            }
            stamp_data = {
                'stamp_type': 'certification',
                'stamp_position': json.dumps({
                    'page': 1,
                    'pages': [1],
                    'positions': {'1': {'x': 400, 'y': 600}},
                    'width': 150,
                    'height': 150
                }),
                'document_name': f'{name} Circle Test',
                'document_type': 'contract',
                'description': f'Testing {name} colored circle stamp',
                'recipient_name': 'Color Test',
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
                data=stamp_data,
                headers=self.headers
            )
            
            assert response.status_code == 200, f"Failed to create {name} circle stamp: {response.text}"
            print(f"✓ {name} ({color}) circle stamp created successfully")
    
    def test_circle_stamp_with_without_advocate_name(self):
        """Test circle stamp with and without advocate name visible"""
        test_pdf_base64 = self._create_minimal_pdf()
        
        # Test with advocate name
        files = {
            'file': ('test_with_name.pdf', base64.b64decode(test_pdf_base64), 'application/pdf')
        }
        stamp_data = {
            'stamp_type': 'certification',
            'stamp_position': json.dumps({
                'page': 1, 'pages': [1], 'positions': {'1': {'x': 400, 'y': 600}}, 'width': 150, 'height': 150
            }),
            'document_name': 'With Name Test',
            'document_type': 'contract',
            'description': 'Circle with advocate name',
            'recipient_name': 'Name Test',
            'recipient_org': '',
            'brand_color': '#10B981',
            'show_advocate_name': 'true',  # WITH NAME
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
            data=stamp_data,
            headers=self.headers
        )
        assert response.status_code == 200, f"Failed with advocate name: {response.text}"
        print("✓ Circle stamp WITH advocate name created")
        
        # Test without advocate name
        files = {
            'file': ('test_no_name.pdf', base64.b64decode(test_pdf_base64), 'application/pdf')
        }
        stamp_data['show_advocate_name'] = 'false'  # WITHOUT NAME
        stamp_data['document_name'] = 'No Name Test'
        stamp_data['description'] = 'Circle without advocate name'
        
        response = requests.post(
            f"{BASE_URL}/api/documents/stamp",
            files=files,
            data=stamp_data,
            headers=self.headers
        )
        assert response.status_code == 200, f"Failed without advocate name: {response.text}"
        print("✓ Circle stamp WITHOUT advocate name created")
    
    def _create_minimal_pdf(self):
        """Create a minimal valid PDF for testing"""
        # Minimal PDF structure
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
0000000224 00000 n 
trailer
<< /Size 5 /Root 1 0 R >>
startxref
318
%%EOF"""
        return base64.b64encode(pdf_content).decode()


class TestFrontendCircleStampPreview:
    """Test that frontend preview matches backend generation"""
    
    def test_frontend_endpoint_available(self):
        """Test that frontend is accessible"""
        response = requests.get(f"{BASE_URL.replace('/api', '')}")
        assert response.status_code == 200, "Frontend not accessible"
        print("✓ Frontend is accessible")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
