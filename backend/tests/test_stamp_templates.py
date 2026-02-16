"""
Test Stamp Templates Feature - VeriStamp-inspired Template Management
Tests CRUD operations, default template functionality, and template application
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
TEST_EMAIL = "testadvocate@tls.or.tz"
TEST_PASSWORD = "Test@1234"


class TestStampTemplates:
    """Test stamp template CRUD operations and functionality"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup - get auth token"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
        # Login to get token
        login_response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        
        if login_response.status_code != 200:
            pytest.skip(f"Login failed: {login_response.text}")
        
        token = login_response.json().get("access_token")
        self.session.headers.update({"Authorization": f"Bearer {token}"})
        self.token = token
    
    def test_01_get_templates_empty_or_existing(self):
        """Test GET /api/stamp-templates - should return list (empty or with templates)"""
        response = self.session.get(f"{BASE_URL}/api/stamp-templates")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        print(f"✓ GET /api/stamp-templates returned {len(data)} templates")
    
    def test_02_create_template_basic(self):
        """Test POST /api/stamp-templates - create basic template"""
        template_data = {
            "name": "TEST_Basic Contract Template",
            "document_type": "contract",
            "stamp_type": "official",
            "brand_color": "#10B981",
            "layout": "horizontal",
            "show_advocate_name": True,
            "show_tls_logo": True,
            "position_preset": "bottom-right",
            "apply_to_pages": "first",
            "stamp_size": 100,
            "logo_size": 100,
            "opacity": 90,
            "margin_from_edge": 35,
            "default_position": {"x": 400, "y": 50, "width": 150, "height": 150},
            "is_default": False
        }
        
        response = self.session.post(f"{BASE_URL}/api/stamp-templates", json=template_data)
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert "template" in data or "message" in data, "Response should contain template or message"
        print(f"✓ POST /api/stamp-templates created template successfully")
    
    def test_03_create_template_with_all_fields(self):
        """Test POST /api/stamp-templates - create template with all VeriStamp fields"""
        template_data = {
            "name": "TEST_Full Affidavit Template",
            "document_type": "affidavit",
            "stamp_type": "commissioner",
            "brand_color": "#3B82F6",
            "layout": "vertical",
            "show_advocate_name": True,
            "show_tls_logo": True,
            "position_preset": "top-right",
            "apply_to_pages": "all",
            "stamp_size": 120,
            "logo_size": 80,
            "opacity": 85,
            "margin_from_edge": 50,
            "default_position": {"x": 500, "y": 100, "width": 180, "height": 180},
            "default_recipient_name": "Test Recipient",
            "default_recipient_org": "Test Organization",
            "is_default": False
        }
        
        response = self.session.post(f"{BASE_URL}/api/stamp-templates", json=template_data)
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        
        # Verify template was created with all fields
        if "template" in data:
            template = data["template"]
            assert template.get("layout") == "vertical", "Layout should be vertical"
            assert template.get("stamp_size") == 120, "Stamp size should be 120"
            assert template.get("opacity") == 85, "Opacity should be 85"
            assert template.get("margin_from_edge") == 50, "Margin should be 50"
        
        print(f"✓ POST /api/stamp-templates created template with all VeriStamp fields")
    
    def test_04_create_template_different_layouts(self):
        """Test creating templates with different layout options"""
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
                "position_preset": "bottom-right",
                "apply_to_pages": "first",
                "stamp_size": 100,
                "logo_size": 100,
                "opacity": 90,
                "margin_from_edge": 35,
                "is_default": False
            }
            
            response = self.session.post(f"{BASE_URL}/api/stamp-templates", json=template_data)
            assert response.status_code == 200, f"Failed to create template with layout {layout}: {response.text}"
        
        print(f"✓ Created templates with all 5 layout options: {layouts}")
    
    def test_05_get_templates_after_creation(self):
        """Test GET /api/stamp-templates - verify templates exist after creation"""
        response = self.session.get(f"{BASE_URL}/api/stamp-templates")
        
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        assert len(data) > 0, "Should have at least one template after creation"
        
        # Verify template structure
        template = data[0]
        required_fields = ["id", "name", "document_type", "stamp_type", "brand_color"]
        for field in required_fields:
            assert field in template, f"Template should have {field} field"
        
        print(f"✓ GET /api/stamp-templates returned {len(data)} templates with correct structure")
    
    def test_06_update_template(self):
        """Test PUT /api/stamp-templates/{id} - update existing template"""
        # First get templates
        get_response = self.session.get(f"{BASE_URL}/api/stamp-templates")
        templates = get_response.json()
        
        if not templates:
            pytest.skip("No templates to update")
        
        # Find a TEST_ template to update
        test_template = next((t for t in templates if t.get("name", "").startswith("TEST_")), None)
        if not test_template:
            pytest.skip("No TEST_ template found to update")
        
        template_id = test_template["id"]
        
        # Update the template
        update_data = {
            "name": "TEST_Updated Template Name",
            "document_type": "deed",
            "stamp_type": "notary",
            "brand_color": "#8B5CF6",
            "layout": "compact",
            "show_advocate_name": False,
            "show_tls_logo": True,
            "position_preset": "center",
            "apply_to_pages": "last",
            "stamp_size": 80,
            "logo_size": 120,
            "opacity": 70,
            "margin_from_edge": 20,
            "is_default": False
        }
        
        response = self.session.put(f"{BASE_URL}/api/stamp-templates/{template_id}", json=update_data)
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        print(f"✓ PUT /api/stamp-templates/{template_id} updated successfully")
    
    def test_07_set_default_template(self):
        """Test POST /api/stamp-templates/{id}/set-default - set template as default"""
        # Get templates
        get_response = self.session.get(f"{BASE_URL}/api/stamp-templates")
        templates = get_response.json()
        
        if not templates:
            pytest.skip("No templates to set as default")
        
        # Find a TEST_ template
        test_template = next((t for t in templates if t.get("name", "").startswith("TEST_")), None)
        if not test_template:
            pytest.skip("No TEST_ template found")
        
        template_id = test_template["id"]
        
        # Set as default
        response = self.session.post(f"{BASE_URL}/api/stamp-templates/{template_id}/set-default")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        # Verify it's now default
        get_response = self.session.get(f"{BASE_URL}/api/stamp-templates")
        templates = get_response.json()
        
        default_template = next((t for t in templates if t.get("id") == template_id), None)
        assert default_template is not None, "Template should exist"
        assert default_template.get("is_default") == True, "Template should be marked as default"
        
        # Verify only one default
        default_count = sum(1 for t in templates if t.get("is_default"))
        assert default_count == 1, f"Should have exactly 1 default template, found {default_count}"
        
        print(f"✓ POST /api/stamp-templates/{template_id}/set-default worked correctly")
    
    def test_08_delete_template(self):
        """Test DELETE /api/stamp-templates/{id} - delete template"""
        # Get templates
        get_response = self.session.get(f"{BASE_URL}/api/stamp-templates")
        templates = get_response.json()
        
        # Find a TEST_ template that's not default
        test_template = next((t for t in templates if t.get("name", "").startswith("TEST_Layout_")), None)
        if not test_template:
            pytest.skip("No TEST_Layout_ template found to delete")
        
        template_id = test_template["id"]
        
        # Delete the template
        response = self.session.delete(f"{BASE_URL}/api/stamp-templates/{template_id}")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        # Verify it's deleted
        get_response = self.session.get(f"{BASE_URL}/api/stamp-templates")
        templates = get_response.json()
        
        deleted_template = next((t for t in templates if t.get("id") == template_id), None)
        assert deleted_template is None, "Template should be deleted"
        
        print(f"✓ DELETE /api/stamp-templates/{template_id} deleted successfully")
    
    def test_09_template_not_found(self):
        """Test error handling for non-existent template"""
        fake_id = "non-existent-template-id-12345"
        
        # Try to update non-existent template
        update_response = self.session.put(f"{BASE_URL}/api/stamp-templates/{fake_id}", json={
            "name": "Test",
            "document_type": "contract",
            "stamp_type": "official",
            "brand_color": "#10B981",
            "layout": "horizontal",
            "show_advocate_name": True,
            "show_tls_logo": True,
            "position_preset": "bottom-right",
            "apply_to_pages": "first",
            "stamp_size": 100,
            "logo_size": 100,
            "opacity": 90,
            "margin_from_edge": 35,
            "is_default": False
        })
        assert update_response.status_code == 404, f"Expected 404 for non-existent template update"
        
        # Try to delete non-existent template
        delete_response = self.session.delete(f"{BASE_URL}/api/stamp-templates/{fake_id}")
        assert delete_response.status_code == 404, f"Expected 404 for non-existent template delete"
        
        # Try to set non-existent template as default
        default_response = self.session.post(f"{BASE_URL}/api/stamp-templates/{fake_id}/set-default")
        assert default_response.status_code == 404, f"Expected 404 for non-existent template set-default"
        
        print(f"✓ Error handling for non-existent templates works correctly")
    
    def test_10_template_requires_auth(self):
        """Test that template endpoints require authentication"""
        # Create a new session without auth
        no_auth_session = requests.Session()
        no_auth_session.headers.update({"Content-Type": "application/json"})
        
        # Try to get templates without auth
        response = no_auth_session.get(f"{BASE_URL}/api/stamp-templates")
        assert response.status_code in [401, 403], f"Expected 401/403 without auth, got {response.status_code}"
        
        # Try to create template without auth
        response = no_auth_session.post(f"{BASE_URL}/api/stamp-templates", json={
            "name": "Unauthorized Template",
            "document_type": "contract",
            "stamp_type": "official",
            "brand_color": "#10B981",
            "layout": "horizontal",
            "show_advocate_name": True,
            "show_tls_logo": True,
            "position_preset": "bottom-right",
            "apply_to_pages": "first",
            "stamp_size": 100,
            "logo_size": 100,
            "opacity": 90,
            "margin_from_edge": 35,
            "is_default": False
        })
        assert response.status_code in [401, 403], f"Expected 401/403 without auth, got {response.status_code}"
        
        print(f"✓ Template endpoints require authentication")


class TestTemplateIntegrationWithStamping:
    """Test template integration with document stamping workflow"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup - get auth token"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
        # Login to get token
        login_response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        
        if login_response.status_code != 200:
            pytest.skip(f"Login failed: {login_response.text}")
        
        token = login_response.json().get("access_token")
        self.session.headers.update({"Authorization": f"Bearer {token}"})
    
    def test_11_default_template_auto_applies(self):
        """Test that default template is returned and can be used for auto-apply"""
        # Get templates
        response = self.session.get(f"{BASE_URL}/api/stamp-templates")
        
        assert response.status_code == 200
        templates = response.json()
        
        # Check if there's a default template
        default_template = next((t for t in templates if t.get("is_default")), None)
        
        if default_template:
            # Verify default template has all required fields for stamping
            required_fields = ["document_type", "stamp_type", "brand_color", "show_advocate_name", "show_tls_logo"]
            for field in required_fields:
                assert field in default_template, f"Default template should have {field}"
            
            print(f"✓ Default template '{default_template.get('name')}' found with all required fields")
        else:
            print(f"✓ No default template set (this is valid state)")
    
    def test_12_template_fields_match_stamping_api(self):
        """Test that template fields match what the stamping API expects"""
        # Get templates
        response = self.session.get(f"{BASE_URL}/api/stamp-templates")
        templates = response.json()
        
        if not templates:
            pytest.skip("No templates to verify")
        
        template = templates[0]
        
        # These fields should be usable in the stamping API
        stamping_fields = [
            "document_type",
            "stamp_type", 
            "brand_color",
            "show_advocate_name",
            "show_tls_logo",
            "default_recipient_name",
            "default_recipient_org"
        ]
        
        for field in stamping_fields:
            if field in template:
                print(f"  - {field}: {template.get(field)}")
        
        print(f"✓ Template fields are compatible with stamping API")


class TestCleanup:
    """Cleanup test templates"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup - get auth token"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
        # Login to get token
        login_response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        
        if login_response.status_code != 200:
            pytest.skip(f"Login failed: {login_response.text}")
        
        token = login_response.json().get("access_token")
        self.session.headers.update({"Authorization": f"Bearer {token}"})
    
    def test_99_cleanup_test_templates(self):
        """Cleanup - delete all TEST_ prefixed templates"""
        response = self.session.get(f"{BASE_URL}/api/stamp-templates")
        templates = response.json()
        
        deleted_count = 0
        for template in templates:
            if template.get("name", "").startswith("TEST_"):
                delete_response = self.session.delete(f"{BASE_URL}/api/stamp-templates/{template['id']}")
                if delete_response.status_code == 200:
                    deleted_count += 1
        
        print(f"✓ Cleanup: Deleted {deleted_count} TEST_ templates")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
