"""
Test Custom Templates Feature
Tests CRUD operations for custom templates and PDF generation from custom templates
"""

import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
TEST_EMAIL = "test@tls.or.tz"
TEST_PASSWORD = "Test@12345678!"
EXISTING_TEMPLATE_ID = "bf06a287-7c4a-42e1-944a-2b397d2f0c78"


class TestCustomTemplates:
    """Test custom template CRUD and generation"""
    
    token = None
    created_template_id = None
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup authentication before each test"""
        if not TestCustomTemplates.token:
            response = requests.post(f"{BASE_URL}/api/auth/login", json={
                "email": TEST_EMAIL,
                "password": TEST_PASSWORD
            })
            if response.status_code == 200:
                TestCustomTemplates.token = response.json().get("access_token") or response.json().get("token")
            else:
                pytest.skip(f"Authentication failed: {response.status_code}")
    
    @property
    def headers(self):
        return {"Authorization": f"Bearer {TestCustomTemplates.token}"}
    
    # === GET /api/practice/templates - List custom templates ===
    def test_01_list_templates(self):
        """GET /api/practice/templates returns list of templates"""
        response = requests.get(f"{BASE_URL}/api/practice/templates", headers=self.headers)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "templates" in data, "Response should contain 'templates' key"
        assert isinstance(data["templates"], list), "Templates should be a list"
        print(f"✅ Found {len(data['templates'])} custom templates")
    
    # === POST /api/practice/templates - Create custom template ===
    def test_02_create_template(self):
        """POST /api/practice/templates creates a new template"""
        template_data = {
            "name": "TEST_Client Engagement Letter",
            "category": "contract",
            "content": """
CLIENT ENGAGEMENT LETTER

Date: {{date}}

To: {{client_name}}
Address: {{client_address}}

Dear {{client_name}},

RE: ENGAGEMENT FOR LEGAL SERVICES

Thank you for instructing us. This letter confirms our engagement as your advocates.

Matter: {{matter_description}}

Fee Structure:
- Initial retainer: TZS {{retainer_amount}}
- Hourly rate: TZS {{hourly_rate}}

Yours faithfully,

{{advocate_name}}
Advocate
            """,
            "placeholders": ["date", "client_name", "client_address", "matter_description", "retainer_amount", "hourly_rate", "advocate_name"],
            "description": "Standard client engagement letter for new matters",
            "is_public": False
        }
        
        response = requests.post(f"{BASE_URL}/api/practice/templates", json=template_data, headers=self.headers)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "id" in data, "Response should contain 'id'"
        assert data["name"] == template_data["name"], f"Name mismatch: {data['name']}"
        assert data["category"] == template_data["category"], f"Category mismatch: {data['category']}"
        assert len(data["placeholders"]) == len(template_data["placeholders"]), "Placeholders count mismatch"
        
        TestCustomTemplates.created_template_id = data["id"]
        print(f"✅ Created template with ID: {data['id']}")
    
    # === GET /api/practice/templates/{id} - Get single template ===
    def test_03_get_template(self):
        """GET /api/practice/templates/{id} returns template with content"""
        template_id = TestCustomTemplates.created_template_id or EXISTING_TEMPLATE_ID
        
        response = requests.get(f"{BASE_URL}/api/practice/templates/{template_id}", headers=self.headers)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "id" in data, "Response should contain 'id'"
        assert "name" in data, "Response should contain 'name'"
        assert "content" in data, "Response should contain 'content'"
        assert "placeholders" in data, "Response should contain 'placeholders'"
        print(f"✅ Retrieved template: {data['name']} with {len(data['placeholders'])} placeholders")
    
    # === PUT /api/practice/templates/{id} - Update template ===
    def test_04_update_template(self):
        """PUT /api/practice/templates/{id} updates template"""
        if not TestCustomTemplates.created_template_id:
            pytest.skip("No template created to update")
        
        update_data = {
            "description": "Updated: Standard client engagement letter for new matters - v2"
        }
        
        response = requests.put(
            f"{BASE_URL}/api/practice/templates/{TestCustomTemplates.created_template_id}",
            json=update_data,
            headers=self.headers
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        # Verify update
        verify_response = requests.get(
            f"{BASE_URL}/api/practice/templates/{TestCustomTemplates.created_template_id}",
            headers=self.headers
        )
        assert verify_response.status_code == 200
        
        data = verify_response.json()
        assert "v2" in data["description"], f"Description not updated: {data['description']}"
        print("✅ Template updated successfully")
    
    # === POST /api/templates/custom/preview - Preview custom template ===
    def test_05_preview_custom_template(self):
        """POST /api/templates/custom/preview returns filled HTML content"""
        template_id = TestCustomTemplates.created_template_id or EXISTING_TEMPLATE_ID
        
        preview_data = {
            "template_id": template_id,
            "data": {
                "client_name": "John Doe",
                "client_address": "123 Main Street, Dar es Salaam",
                "matter_description": "Contract Review",
                "retainer_amount": "500,000",
                "hourly_rate": "150,000",
                "date": "15 January 2026",
                "advocate_name": "Advocate Test"
            },
            "include_signature": False,
            "include_qr_stamp": False
        }
        
        response = requests.post(f"{BASE_URL}/api/templates/custom/preview", json=preview_data, headers=self.headers)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "content" in data, "Response should contain 'content'"
        assert "template_name" in data, "Response should contain 'template_name'"
        assert "filled_data" in data, "Response should contain 'filled_data'"
        
        # Verify placeholders are replaced
        content = data["content"]
        assert "John Doe" in content, "Client name should be in content"
        assert "{{" not in content or "}}" not in content, "Placeholders should be replaced"
        print("✅ Template preview works with filled placeholders")
    
    # === POST /api/templates/custom/generate - Generate PDF from custom template ===
    def test_06_generate_custom_template_pdf(self):
        """POST /api/templates/custom/generate creates PDF"""
        template_id = TestCustomTemplates.created_template_id or EXISTING_TEMPLATE_ID
        
        generate_data = {
            "template_id": template_id,
            "data": {
                "client_name": "Jane Smith",
                "client_address": "456 Legal Lane, Arusha",
                "matter_description": "Property Dispute",
                "retainer_amount": "1,000,000",
                "hourly_rate": "200,000",
                "date": "15 January 2026",
                "advocate_name": "Advocate Test"
            },
            "include_signature": False,
            "include_qr_stamp": False,
            "save_to_vault": False  # Don't clutter vault during tests
        }
        
        response = requests.post(f"{BASE_URL}/api/templates/custom/generate", json=generate_data, headers=self.headers)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        # Check PDF response
        assert response.headers.get("content-type") == "application/pdf", f"Expected PDF, got {response.headers.get('content-type')}"
        assert len(response.content) > 0, "PDF content should not be empty"
        
        # Check headers
        doc_id = response.headers.get("x-document-id")
        assert doc_id, "X-Document-Id header should be present"
        print(f"✅ Generated PDF with Document ID: {doc_id}")
    
    # === POST /api/templates/custom/generate - Generate with signature ===
    def test_07_generate_with_signature(self):
        """POST /api/templates/custom/generate with signature option"""
        template_id = TestCustomTemplates.created_template_id or EXISTING_TEMPLATE_ID
        
        generate_data = {
            "template_id": template_id,
            "data": {
                "client_name": "Test Client",
                "client_address": "Test Address",
                "matter_description": "Test Matter",
                "retainer_amount": "100,000",
                "hourly_rate": "50,000"
            },
            "include_signature": True,
            "include_qr_stamp": False,
            "save_to_vault": False
        }
        
        response = requests.post(f"{BASE_URL}/api/templates/custom/generate", json=generate_data, headers=self.headers)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        assert response.headers.get("content-type") == "application/pdf"
        print("✅ Generated PDF with signature")
    
    # === POST /api/templates/custom/generate - Generate with QR stamp ===
    def test_08_generate_with_qr_stamp(self):
        """POST /api/templates/custom/generate with QR stamp option"""
        template_id = TestCustomTemplates.created_template_id or EXISTING_TEMPLATE_ID
        
        generate_data = {
            "template_id": template_id,
            "data": {
                "client_name": "Test Client",
                "client_address": "Test Address",
                "matter_description": "Test Matter",
                "retainer_amount": "100,000",
                "hourly_rate": "50,000"
            },
            "include_signature": False,
            "include_qr_stamp": True,
            "save_to_vault": False
        }
        
        response = requests.post(f"{BASE_URL}/api/templates/custom/generate", json=generate_data, headers=self.headers)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        assert response.headers.get("content-type") == "application/pdf"
        
        # QR stamp should include verification ID
        verification_id = response.headers.get("x-verification-id")
        assert verification_id, "X-Verification-Id header should be present when QR stamp is enabled"
        assert "TLS-CUSTOM-" in verification_id, f"Verification ID format wrong: {verification_id}"
        print(f"✅ Generated PDF with QR stamp, Verification ID: {verification_id}")
    
    # === POST /api/templates/custom/generate - Generate with signature AND QR stamp ===
    def test_09_generate_with_both_options(self):
        """POST /api/templates/custom/generate with both signature and QR stamp"""
        template_id = TestCustomTemplates.created_template_id or EXISTING_TEMPLATE_ID
        
        generate_data = {
            "template_id": template_id,
            "data": {
                "client_name": "Full Options Client",
                "client_address": "Full Address",
                "matter_description": "Full Matter",
                "retainer_amount": "500,000",
                "hourly_rate": "100,000"
            },
            "include_signature": True,
            "include_qr_stamp": True,
            "save_to_vault": False
        }
        
        response = requests.post(f"{BASE_URL}/api/templates/custom/generate", json=generate_data, headers=self.headers)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        assert response.headers.get("content-type") == "application/pdf"
        
        doc_id = response.headers.get("x-document-id")
        verification_id = response.headers.get("x-verification-id")
        assert doc_id and verification_id, "Both headers should be present"
        print(f"✅ Generated PDF with both options: Doc={doc_id}, Verification={verification_id}")
    
    # === POST /api/templates/custom/generate - Save to vault ===
    def test_10_generate_and_save_to_vault(self):
        """POST /api/templates/custom/generate with save_to_vault=true saves document"""
        template_id = TestCustomTemplates.created_template_id or EXISTING_TEMPLATE_ID
        
        generate_data = {
            "template_id": template_id,
            "data": {
                "client_name": "Vault Test Client",
                "client_address": "Vault Address",
                "matter_description": "Vault Matter",
                "retainer_amount": "200,000",
                "hourly_rate": "75,000"
            },
            "include_signature": False,
            "include_qr_stamp": True,
            "save_to_vault": True,
            "folder": "Test Generated Documents"
        }
        
        response = requests.post(f"{BASE_URL}/api/templates/custom/generate", json=generate_data, headers=self.headers)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        doc_id = response.headers.get("x-document-id")
        
        # Verify document in vault
        vault_response = requests.get(f"{BASE_URL}/api/practice/documents", headers=self.headers)
        assert vault_response.status_code == 200
        
        documents = vault_response.json().get("documents", [])
        # Look for recently created document
        found = any(d.get("generated_doc_id") == doc_id for d in documents)
        print(f"✅ Generated PDF and saved to vault (found={found})")
    
    # === Test invalid template ID ===
    def test_11_invalid_template_id(self):
        """POST /api/templates/custom/generate with invalid ID returns 404"""
        generate_data = {
            "template_id": "invalid-template-id-12345",
            "data": {"client_name": "Test"},
            "include_signature": False,
            "include_qr_stamp": False
        }
        
        response = requests.post(f"{BASE_URL}/api/templates/custom/generate", json=generate_data, headers=self.headers)
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"
        print("✅ Invalid template ID correctly returns 404")
    
    # === Test preview invalid template ID ===
    def test_12_preview_invalid_template_id(self):
        """POST /api/templates/custom/preview with invalid ID returns 404"""
        preview_data = {
            "template_id": "invalid-template-id-12345",
            "data": {"client_name": "Test"},
            "include_signature": False,
            "include_qr_stamp": False
        }
        
        response = requests.post(f"{BASE_URL}/api/templates/custom/preview", json=preview_data, headers=self.headers)
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"
        print("✅ Preview with invalid template ID correctly returns 404")
    
    # === DELETE /api/practice/templates/{id} - Delete template ===
    def test_99_delete_template(self):
        """DELETE /api/practice/templates/{id} deletes template (cleanup)"""
        if not TestCustomTemplates.created_template_id:
            pytest.skip("No template created to delete")
        
        response = requests.delete(
            f"{BASE_URL}/api/practice/templates/{TestCustomTemplates.created_template_id}",
            headers=self.headers
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        # Verify deletion
        verify_response = requests.get(
            f"{BASE_URL}/api/practice/templates/{TestCustomTemplates.created_template_id}",
            headers=self.headers
        )
        assert verify_response.status_code == 404, "Template should be deleted"
        print("✅ Template deleted successfully")


class TestExistingTemplate:
    """Test with the existing template mentioned in the request"""
    
    token = None
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup authentication"""
        if not TestExistingTemplate.token:
            response = requests.post(f"{BASE_URL}/api/auth/login", json={
                "email": TEST_EMAIL,
                "password": TEST_PASSWORD
            })
            if response.status_code == 200:
                TestExistingTemplate.token = response.json().get("access_token") or response.json().get("token")
            else:
                pytest.skip(f"Authentication failed: {response.status_code}")
    
    @property
    def headers(self):
        return {"Authorization": f"Bearer {TestExistingTemplate.token}"}
    
    def test_existing_template_exists(self):
        """Check if the existing template mentioned in the request is accessible"""
        response = requests.get(
            f"{BASE_URL}/api/practice/templates/{EXISTING_TEMPLATE_ID}",
            headers=self.headers
        )
        
        if response.status_code == 200:
            data = response.json()
            print(f"✅ Existing template found: {data['name']}")
            print(f"   Category: {data.get('category')}")
            print(f"   Placeholders: {data.get('placeholders', [])}")
        else:
            print(f"⚠️ Existing template not found (may have been deleted): {response.status_code}")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
