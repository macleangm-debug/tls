"""
Test suite for My Stamps page - Stamp Editor functionality
Tests: stamp templates CRUD, shape support, signature, address fields
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestStampTemplates:
    """Stamp template CRUD tests"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Login and get auth token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "testadvocate@tls.or.tz",
            "password": "Test@1234"
        })
        assert response.status_code == 200, f"Login failed: {response.text}"
        self.token = response.json()["access_token"]
        self.headers = {"Authorization": f"Bearer {self.token}"}
        
        # Clean up any existing test stamps
        templates = requests.get(f"{BASE_URL}/api/stamp-templates", headers=self.headers).json()
        for t in templates:
            if t.get("name", "").startswith("TEST_"):
                requests.delete(f"{BASE_URL}/api/stamp-templates/{t['id']}", headers=self.headers)
    
    def test_get_stamp_templates(self):
        """Test GET /api/stamp-templates returns list"""
        response = requests.get(f"{BASE_URL}/api/stamp-templates", headers=self.headers)
        assert response.status_code == 200
        assert isinstance(response.json(), list)
        print("PASS: GET /api/stamp-templates returns list")
    
    def test_create_rectangle_stamp(self):
        """Test creating a rectangle stamp template"""
        payload = {
            "name": "TEST_Rectangle Stamp",
            "shape": "rectangle",
            "brand_color": "#3B82F6",
            "layout": "horizontal",
            "document_type": "contract",
            "stamp_type": "official",
            "show_advocate_name": True,
            "show_tls_logo": True
        }
        response = requests.post(f"{BASE_URL}/api/stamp-templates", json=payload, headers=self.headers)
        assert response.status_code == 200, f"Create failed: {response.text}"
        
        data = response.json()
        assert "template" in data
        assert data["template"]["shape"] == "rectangle"
        assert data["template"]["brand_color"] == "#3B82F6"
        print("PASS: Rectangle stamp created with shape field")
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/stamp-templates/{data['template']['id']}", headers=self.headers)
    
    def test_create_circle_stamp_with_address(self):
        """Test creating a circle stamp with address field"""
        payload = {
            "name": "TEST_Circle Stamp",
            "shape": "circle",
            "brand_color": "#F59E0B",
            "layout": "horizontal",
            "document_type": "contract",
            "stamp_type": "official",
            "advocate_address": "Dar es Salaam, Tanzania"
        }
        response = requests.post(f"{BASE_URL}/api/stamp-templates", json=payload, headers=self.headers)
        assert response.status_code == 200, f"Create failed: {response.text}"
        
        data = response.json()
        assert data["template"]["shape"] == "circle"
        assert data["template"]["advocate_address"] == "Dar es Salaam, Tanzania"
        print("PASS: Circle stamp created with address field")
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/stamp-templates/{data['template']['id']}", headers=self.headers)
    
    def test_create_oval_stamp(self):
        """Test creating an oval stamp template"""
        payload = {
            "name": "TEST_Oval Stamp",
            "shape": "oval",
            "brand_color": "#8B5CF6",
            "layout": "horizontal",
            "document_type": "affidavit",
            "stamp_type": "commissioner"
        }
        response = requests.post(f"{BASE_URL}/api/stamp-templates", json=payload, headers=self.headers)
        assert response.status_code == 200, f"Create failed: {response.text}"
        
        data = response.json()
        assert data["template"]["shape"] == "oval"
        print("PASS: Oval stamp created")
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/stamp-templates/{data['template']['id']}", headers=self.headers)
    
    def test_update_stamp_template(self):
        """Test updating a stamp template"""
        # Create first
        create_payload = {
            "name": "TEST_Update Stamp",
            "shape": "rectangle",
            "brand_color": "#10B981",
            "layout": "horizontal"
        }
        create_response = requests.post(f"{BASE_URL}/api/stamp-templates", json=create_payload, headers=self.headers)
        assert create_response.status_code == 200
        template_id = create_response.json()["template"]["id"]
        
        # Update
        update_payload = {
            "name": "TEST_Updated Stamp",
            "shape": "rectangle",
            "brand_color": "#EF4444",
            "layout": "vertical"
        }
        update_response = requests.put(f"{BASE_URL}/api/stamp-templates/{template_id}", json=update_payload, headers=self.headers)
        assert update_response.status_code == 200
        print("PASS: Stamp template updated")
        
        # Verify update
        templates = requests.get(f"{BASE_URL}/api/stamp-templates", headers=self.headers).json()
        updated = next((t for t in templates if t["id"] == template_id), None)
        assert updated is not None
        assert updated["brand_color"] == "#EF4444"
        assert updated["layout"] == "vertical"
        print("PASS: Update verified via GET")
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/stamp-templates/{template_id}", headers=self.headers)
    
    def test_delete_stamp_template(self):
        """Test deleting a stamp template"""
        # Create first
        create_payload = {
            "name": "TEST_Delete Stamp",
            "shape": "rectangle",
            "brand_color": "#10B981"
        }
        create_response = requests.post(f"{BASE_URL}/api/stamp-templates", json=create_payload, headers=self.headers)
        assert create_response.status_code == 200
        template_id = create_response.json()["template"]["id"]
        
        # Delete
        delete_response = requests.delete(f"{BASE_URL}/api/stamp-templates/{template_id}", headers=self.headers)
        assert delete_response.status_code == 200
        print("PASS: Stamp template deleted")
        
        # Verify deletion
        templates = requests.get(f"{BASE_URL}/api/stamp-templates", headers=self.headers).json()
        deleted = next((t for t in templates if t["id"] == template_id), None)
        assert deleted is None
        print("PASS: Deletion verified - template not found")
    
    def test_max_3_templates_limit(self):
        """Test that maximum 3 templates are allowed"""
        # Create 3 templates
        template_ids = []
        for i, shape in enumerate(["rectangle", "circle", "oval"]):
            payload = {
                "name": f"TEST_Limit_{shape}",
                "shape": shape,
                "brand_color": "#10B981"
            }
            response = requests.post(f"{BASE_URL}/api/stamp-templates", json=payload, headers=self.headers)
            if response.status_code == 200:
                template_ids.append(response.json()["template"]["id"])
        
        # Try to create 4th template
        payload = {
            "name": "TEST_Fourth",
            "shape": "rectangle",
            "brand_color": "#10B981"
        }
        response = requests.post(f"{BASE_URL}/api/stamp-templates", json=payload, headers=self.headers)
        assert response.status_code == 400
        assert "Maximum 3" in response.json().get("detail", "")
        print("PASS: Maximum 3 templates limit enforced")
        
        # Cleanup
        for tid in template_ids:
            requests.delete(f"{BASE_URL}/api/stamp-templates/{tid}", headers=self.headers)
    
    def test_all_5_rectangle_layouts(self):
        """Test all 5 rectangle layout options"""
        layouts = ["horizontal", "vertical", "compact", "logo_left", "logo_right"]
        
        for layout in layouts:
            payload = {
                "name": f"TEST_Layout_{layout}",
                "shape": "rectangle",
                "brand_color": "#10B981",
                "layout": layout
            }
            response = requests.post(f"{BASE_URL}/api/stamp-templates", json=payload, headers=self.headers)
            assert response.status_code == 200, f"Failed for layout {layout}: {response.text}"
            
            template_id = response.json()["template"]["id"]
            assert response.json()["template"]["layout"] == layout
            print(f"PASS: Layout '{layout}' created successfully")
            
            # Cleanup
            requests.delete(f"{BASE_URL}/api/stamp-templates/{template_id}", headers=self.headers)


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
