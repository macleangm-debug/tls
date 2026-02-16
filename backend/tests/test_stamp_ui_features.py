"""
Backend API Tests for TLS Advocate Stamp Settings and Document Stamping Features
Tests: Signature size controls, color picker, confirmation modal, branded stamp generation
"""
import pytest
import requests
import os
import base64
from io import BytesIO

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
TEST_ADVOCATE = {
    "email": "testadvocate@tls.or.tz",
    "password": "Test@1234"
}


class TestAuthentication:
    """Authentication tests"""
    
    def test_login_success(self):
        """Test advocate login"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json=TEST_ADVOCATE)
        assert response.status_code == 200, f"Login failed: {response.text}"
        data = response.json()
        assert "access_token" in data
        print(f"✓ Login successful, token received")
        return data["access_token"]


class TestStampTemplates:
    """Stamp template CRUD tests"""
    
    @pytest.fixture
    def auth_token(self):
        """Get auth token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json=TEST_ADVOCATE)
        if response.status_code == 200:
            return response.json()["access_token"]
        pytest.skip("Authentication failed")
    
    @pytest.fixture
    def auth_headers(self, auth_token):
        """Get auth headers"""
        return {"Authorization": f"Bearer {auth_token}"}
    
    def test_get_templates(self, auth_headers):
        """Test fetching stamp templates"""
        response = requests.get(f"{BASE_URL}/api/stamp-templates", headers=auth_headers)
        assert response.status_code == 200
        templates = response.json()
        assert isinstance(templates, list)
        print(f"✓ Found {len(templates)} templates")
        return templates
    
    def test_create_template_with_all_layouts(self, auth_headers):
        """Test creating templates with all 5 layout options"""
        layouts = ["horizontal", "vertical", "compact", "logo_left", "logo_right"]
        
        for layout in layouts:
            template_data = {
                "name": f"TEST_Layout_{layout}",
                "document_type": "contract",
                "stamp_type": "official",
                "brand_color": "#10B981",
                "layout": layout,
                "show_advocate_name": True,
                "show_tls_logo": True,
                "include_signature": False,
                "position_preset": "bottom-right",
                "apply_to_pages": "first",
                "stamp_size": 100,
                "logo_size": 100,
                "opacity": 90,
                "margin_from_edge": 35,
                "is_default": False
            }
            
            response = requests.post(f"{BASE_URL}/api/stamp-templates", 
                                   json=template_data, headers=auth_headers)
            assert response.status_code == 200, f"Failed to create template with layout {layout}: {response.text}"
            data = response.json()
            created = data.get("template", data)  # Handle wrapped response
            assert created["layout"] == layout
            print(f"✓ Created template with layout: {layout}")
            
            # Clean up - delete the test template
            template_id = created["id"]
            delete_response = requests.delete(f"{BASE_URL}/api/stamp-templates/{template_id}", 
                                            headers=auth_headers)
            assert delete_response.status_code == 200
    
    def test_template_with_signature_settings(self, auth_headers):
        """Test template with signature settings"""
        template_data = {
            "name": "TEST_Signature_Template",
            "document_type": "affidavit",
            "stamp_type": "commissioner",
            "brand_color": "#3B82F6",
            "layout": "vertical",
            "show_advocate_name": True,
            "show_tls_logo": True,
            "include_signature": True,  # Include signature
            "position_preset": "bottom-left",
            "apply_to_pages": "last",
            "stamp_size": 120,
            "opacity": 85,
            "is_default": False
        }
        
        response = requests.post(f"{BASE_URL}/api/stamp-templates", 
                               json=template_data, headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        created = data.get("template", data)  # Handle wrapped response
        assert created["include_signature"] == True
        print(f"✓ Created template with signature settings")
        
        # Clean up
        requests.delete(f"{BASE_URL}/api/stamp-templates/{created['id']}", headers=auth_headers)
    
    def test_template_with_custom_color(self, auth_headers):
        """Test template with custom hex color"""
        custom_colors = ["#FF5733", "#C70039", "#900C3F", "#581845"]
        
        for color in custom_colors:
            template_data = {
                "name": f"TEST_Color_{color}",
                "document_type": "contract",
                "stamp_type": "official",
                "brand_color": color,
                "layout": "horizontal",
                "show_advocate_name": True,
                "show_tls_logo": True,
                "stamp_size": 100,
                "opacity": 90,
                "is_default": False
            }
            
            response = requests.post(f"{BASE_URL}/api/stamp-templates", 
                                   json=template_data, headers=auth_headers)
            assert response.status_code == 200
            data = response.json()
            created = data.get("template", data)  # Handle wrapped response
            assert created["brand_color"] == color
            print(f"✓ Created template with custom color: {color}")
            
            # Clean up
            requests.delete(f"{BASE_URL}/api/stamp-templates/{created['id']}", headers=auth_headers)


class TestDocumentStamping:
    """Document stamping API tests"""
    
    @pytest.fixture
    def auth_token(self):
        """Get auth token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json=TEST_ADVOCATE)
        if response.status_code == 200:
            return response.json()["access_token"]
        pytest.skip("Authentication failed")
    
    @pytest.fixture
    def auth_headers(self, auth_token):
        """Get auth headers"""
        return {"Authorization": f"Bearer {auth_token}"}
    
    @pytest.fixture
    def sample_pdf(self):
        """Create a simple test PDF"""
        from reportlab.lib.pagesizes import letter
        from reportlab.pdfgen import canvas
        
        buffer = BytesIO()
        c = canvas.Canvas(buffer, pagesize=letter)
        c.drawString(100, 750, 'Test Legal Document')
        c.drawString(100, 700, 'This is a sample document for API testing.')
        c.save()
        buffer.seek(0)
        return buffer.getvalue()
    
    def test_document_upload(self, auth_headers, sample_pdf):
        """Test document upload endpoint"""
        files = {'file': ('test_doc.pdf', sample_pdf, 'application/pdf')}
        response = requests.post(f"{BASE_URL}/api/documents/upload", 
                               files=files, headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert "hash" in data
        assert "pages" in data
        assert data["pages"] >= 1
        print(f"✓ Document uploaded, hash: {data['hash'][:20]}...")
    
    def test_stamp_document_with_branding(self, auth_headers, sample_pdf):
        """Test stamping document with branding options"""
        files = {'file': ('test_branded.pdf', sample_pdf, 'application/pdf')}
        form_data = {
            'stamp_type': 'official',
            'stamp_position': '{"page": 1, "x": 400, "y": 50, "width": 150, "height": 150}',
            'document_name': 'TEST_Branded_Document',
            'document_type': 'contract',
            'recipient_name': 'Test Recipient',
            'recipient_org': 'Test Organization',
            'brand_color': '#10B981',
            'show_advocate_name': 'true',
            'show_tls_logo': 'true',
            'layout': 'horizontal',
            'include_signature': 'false',
            'stamp_size': '100',
            'opacity': '90'
        }
        
        response = requests.post(f"{BASE_URL}/api/documents/stamp", 
                               files=files, data=form_data, headers=auth_headers)
        assert response.status_code == 200, f"Stamp failed: {response.text}"
        data = response.json()
        
        # Verify response contains expected fields
        assert "stamp_id" in data
        assert data["stamp_id"].startswith("TLS-")
        assert "stamped_document" in data
        assert "document_hash" in data
        print(f"✓ Document stamped with ID: {data['stamp_id']}")
        
        # Verify stamped document is valid base64
        try:
            stamped_pdf = base64.b64decode(data["stamped_document"])
            assert len(stamped_pdf) > len(sample_pdf)  # Stamped should be larger
            print(f"✓ Stamped PDF size: {len(stamped_pdf)} bytes (original: {len(sample_pdf)} bytes)")
        except Exception as e:
            pytest.fail(f"Failed to decode stamped document: {e}")
        
        return data["stamp_id"]
    
    def test_stamp_with_different_layouts(self, auth_headers, sample_pdf):
        """Test stamping with all layout options"""
        layouts = ["horizontal", "vertical", "compact", "logo_left", "logo_right"]
        
        for layout in layouts:
            files = {'file': ('test_layout.pdf', sample_pdf, 'application/pdf')}
            form_data = {
                'stamp_type': 'official',
                'stamp_position': '{"page": 1, "x": 400, "y": 50, "width": 150, "height": 150}',
                'document_name': f'TEST_Layout_{layout}',
                'document_type': 'contract',
                'recipient_name': 'Test Recipient',
                'brand_color': '#10B981',
                'layout': layout,
                'stamp_size': '100',
                'opacity': '90'
            }
            
            response = requests.post(f"{BASE_URL}/api/documents/stamp", 
                                   files=files, data=form_data, headers=auth_headers)
            assert response.status_code == 200, f"Stamp with layout {layout} failed: {response.text}"
            data = response.json()
            assert "stamp_id" in data
            print(f"✓ Stamped document with layout: {layout}, ID: {data['stamp_id']}")
    
    def test_stamp_with_signature(self, auth_headers, sample_pdf):
        """Test stamping with signature included"""
        files = {'file': ('test_signature.pdf', sample_pdf, 'application/pdf')}
        form_data = {
            'stamp_type': 'commissioner',
            'stamp_position': '{"page": 1, "x": 400, "y": 50, "width": 150, "height": 150}',
            'document_name': 'TEST_With_Signature',
            'document_type': 'affidavit',
            'recipient_name': 'Test Recipient',
            'brand_color': '#3B82F6',
            'layout': 'vertical',
            'include_signature': 'true',  # Include signature
            'stamp_size': '120',
            'opacity': '85'
        }
        
        response = requests.post(f"{BASE_URL}/api/documents/stamp", 
                               files=files, data=form_data, headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert "stamp_id" in data
        print(f"✓ Stamped document with signature, ID: {data['stamp_id']}")


class TestSignatureManagement:
    """Signature upload and management tests"""
    
    @pytest.fixture
    def auth_token(self):
        """Get auth token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json=TEST_ADVOCATE)
        if response.status_code == 200:
            return response.json()["access_token"]
        pytest.skip("Authentication failed")
    
    @pytest.fixture
    def auth_headers(self, auth_token):
        """Get auth headers"""
        return {"Authorization": f"Bearer {auth_token}"}
    
    def test_get_signature(self, auth_headers):
        """Test fetching saved signature"""
        response = requests.get(f"{BASE_URL}/api/advocate/signature", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        if data.get("signature_data"):
            print(f"✓ Signature found (length: {len(data['signature_data'])} chars)")
        else:
            print("✓ No signature saved yet")


class TestStampVerification:
    """Stamp verification tests"""
    
    @pytest.fixture
    def auth_token(self):
        """Get auth token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json=TEST_ADVOCATE)
        if response.status_code == 200:
            return response.json()["access_token"]
        pytest.skip("Authentication failed")
    
    @pytest.fixture
    def auth_headers(self, auth_token):
        """Get auth headers"""
        return {"Authorization": f"Bearer {auth_token}"}
    
    def test_get_document_stamps(self, auth_headers):
        """Test fetching document stamps"""
        response = requests.get(f"{BASE_URL}/api/documents/stamps", headers=auth_headers)
        assert response.status_code == 200
        stamps = response.json()
        assert isinstance(stamps, list)
        print(f"✓ Found {len(stamps)} document stamps")
        
        if stamps:
            # Verify stamp structure
            stamp = stamps[0]
            assert "stamp_id" in stamp
            assert "advocate_name" in stamp
            assert "document_name" in stamp
            print(f"✓ Latest stamp: {stamp['stamp_id']}")
    
    def test_verify_stamp_public(self, auth_headers):
        """Test public stamp verification"""
        # First get a stamp ID
        response = requests.get(f"{BASE_URL}/api/documents/stamps", headers=auth_headers)
        if response.status_code == 200 and response.json():
            stamp_id = response.json()[0]["stamp_id"]
            
            # Verify the stamp (public endpoint - no auth needed)
            verify_response = requests.get(f"{BASE_URL}/api/verify/stamp/{stamp_id}")
            assert verify_response.status_code == 200
            data = verify_response.json()
            assert "valid" in data
            assert "stamp_id" in data
            assert "advocate_name" in data
            print(f"✓ Stamp {stamp_id} verification: valid={data['valid']}")
        else:
            print("⚠ No stamps to verify")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
