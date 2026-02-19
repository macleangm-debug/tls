"""
Document Templates API Tests
Tests for the legal document template generation feature
- Template listing (10 document types)
- Template preview with placeholder filling
- PDF generation with QR stamps
- Document history tracking
"""

import pytest
import requests
import os
import json

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
TEST_EMAIL = "test@tls.or.tz"
TEST_PASSWORD = "Test@12345678!"

# Expected templates
EXPECTED_TEMPLATES = [
    "power_of_attorney",
    "affidavit",
    "legal_notice",
    "service_agreement",
    "court_filing",
    "demand_letter",
    "witness_statement",
    "sale_agreement",
    "lease_agreement",
    "will_testament"
]


@pytest.fixture(scope="module")
def auth_token():
    """Get authentication token for testing"""
    response = requests.post(
        f"{BASE_URL}/api/auth/login",
        json={"email": TEST_EMAIL, "password": TEST_PASSWORD},
        headers={"Content-Type": "application/json"}
    )
    if response.status_code != 200:
        pytest.skip(f"Authentication failed: {response.text}")
    return response.json().get("access_token")


@pytest.fixture(scope="module")
def headers(auth_token):
    """Headers with authentication"""
    return {
        "Authorization": f"Bearer {auth_token}",
        "Content-Type": "application/json"
    }


class TestTemplatesList:
    """Tests for /api/templates/list endpoint"""
    
    def test_list_templates_returns_10_templates(self, headers):
        """GET /api/templates/list returns all 10 document templates"""
        response = requests.get(f"{BASE_URL}/api/templates/list", headers=headers)
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert "templates" in data, "Response should have 'templates' key"
        
        templates = data["templates"]
        assert len(templates) == 10, f"Expected 10 templates, got {len(templates)}"
        
        # Verify all expected templates are present
        template_ids = [t["id"] for t in templates]
        for expected_id in EXPECTED_TEMPLATES:
            assert expected_id in template_ids, f"Missing template: {expected_id}"
    
    def test_template_has_required_fields(self, headers):
        """Each template should have id, name, category, description, placeholders"""
        response = requests.get(f"{BASE_URL}/api/templates/list", headers=headers)
        
        assert response.status_code == 200
        
        templates = response.json()["templates"]
        for template in templates:
            assert "id" in template, f"Template missing 'id'"
            assert "name" in template, f"Template missing 'name'"
            assert "category" in template, f"Template missing 'category'"
            assert "description" in template, f"Template missing 'description'"
            assert "placeholders" in template, f"Template missing 'placeholders'"
            assert isinstance(template["placeholders"], list), "Placeholders should be a list"
    
    def test_power_of_attorney_template_details(self, headers):
        """Power of Attorney template should have correct placeholders"""
        response = requests.get(f"{BASE_URL}/api/templates/list", headers=headers)
        
        templates = response.json()["templates"]
        poa = next((t for t in templates if t["id"] == "power_of_attorney"), None)
        
        assert poa is not None, "Power of Attorney template not found"
        assert poa["name"] == "Power of Attorney (Wakala)"
        assert poa["category"] == "authorization"
        assert "client_name" in poa["placeholders"]
        assert "advocate_name" in poa["placeholders"]
        assert "roll_number" in poa["placeholders"]


class TestTemplatePreview:
    """Tests for /api/templates/preview endpoint"""
    
    def test_preview_fills_placeholders(self, headers):
        """POST /api/templates/preview returns HTML with filled placeholders"""
        payload = {
            "template_id": "affidavit",
            "data": {
                "client_name": "TEST_John Smith",
                "client_address": "123 Test Street, Dar es Salaam",
                "client_id_number": "TZ-TEST-123456",
                "client_occupation": "Engineer",
                "case_number": "TEST-CASE-2026",
                "court_name": "High Court of Tanzania",
                "affidavit_content": "<li>Test content statement 1</li>",
                "commissioner_name": "Commissioner Test"
            },
            "include_signature": False,
            "include_qr_stamp": False
        }
        
        response = requests.post(
            f"{BASE_URL}/api/templates/preview",
            headers=headers,
            json=payload
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "content" in data, "Response should have 'content'"
        assert "template_name" in data, "Response should have 'template_name'"
        assert "filled_data" in data, "Response should have 'filled_data'"
        
        # Verify placeholders are filled
        content = data["content"]
        assert "TEST_John Smith" in content, "Client name not filled in preview"
        assert "TEST-CASE-2026" in content, "Case number not filled in preview"
    
    def test_preview_with_invalid_template_returns_404(self, headers):
        """POST /api/templates/preview with invalid template_id returns 404"""
        payload = {
            "template_id": "invalid_template_xyz",
            "data": {},
            "include_signature": False,
            "include_qr_stamp": False
        }
        
        response = requests.post(
            f"{BASE_URL}/api/templates/preview",
            headers=headers,
            json=payload
        )
        
        assert response.status_code == 404, f"Expected 404 for invalid template"
    
    def test_preview_missing_placeholders_uses_blanks(self, headers):
        """Preview with missing data fills blanks for unfilled placeholders"""
        payload = {
            "template_id": "legal_notice",
            "data": {
                "client_name": "TEST_Client Only"
                # Missing many other required fields
            },
            "include_signature": False,
            "include_qr_stamp": False
        }
        
        response = requests.post(
            f"{BASE_URL}/api/templates/preview",
            headers=headers,
            json=payload
        )
        
        assert response.status_code == 200
        content = response.json()["content"]
        # Should have blank lines for unfilled placeholders
        assert "_______________" in content, "Unfilled placeholders should show as blanks"


class TestTemplateGenerate:
    """Tests for /api/templates/generate endpoint (PDF generation)"""
    
    def test_generate_pdf_returns_binary_content(self, headers):
        """POST /api/templates/generate returns PDF binary"""
        payload = {
            "template_id": "power_of_attorney",
            "data": {
                "client_name": "TEST_Generator Jane Doe",
                "client_address": "789 Test Boulevard",
                "client_id_number": "TZ-TEST-789012",
                "matter_description": "Test property matter for PDF generation",
                "witness_name_1": "TEST_Witness A",
                "witness_name_2": "TEST_Witness B"
            },
            "include_signature": False,
            "include_qr_stamp": True
        }
        
        # Use non-json content type for binary response
        response = requests.post(
            f"{BASE_URL}/api/templates/generate",
            headers=headers,
            json=payload
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text[:500] if response.text else 'No content'}"
        assert response.headers.get("content-type") == "application/pdf", "Content-Type should be application/pdf"
        
        # Verify content-disposition header
        content_disposition = response.headers.get("content-disposition", "")
        assert "attachment" in content_disposition, "Should be downloadable attachment"
        assert "power_of_attorney" in content_disposition, "Filename should contain template name"
        
        # Verify it's actually PDF content (starts with %PDF)
        assert response.content[:4] == b"%PDF", "Response should be valid PDF"
    
    def test_generate_pdf_with_signature(self, headers):
        """POST /api/templates/generate with signature option"""
        payload = {
            "template_id": "service_agreement",
            "data": {
                "client_name": "TEST_Signature Client",
                "client_address": "456 Signature Street",
                "client_id_number": "TZ-SIG-123",
                "matter_description": "Test matter with signature",
                "fee_structure": "Hourly rate: TZS 50,000",
                "retainer_amount": "500000"
            },
            "include_signature": True,  # Include digital signature
            "include_qr_stamp": True
        }
        
        response = requests.post(
            f"{BASE_URL}/api/templates/generate",
            headers=headers,
            json=payload
        )
        
        assert response.status_code == 200
        assert response.content[:4] == b"%PDF", "Should be valid PDF with signature"
    
    def test_generate_all_template_types(self, headers):
        """Test PDF generation for all 10 template types"""
        test_data = {
            "power_of_attorney": {"client_name": "TEST_POA Client", "matter_description": "Test matter"},
            "affidavit": {"client_name": "TEST_Aff Client", "case_number": "TEST-CASE-001"},
            "legal_notice": {"client_name": "TEST_LN Client", "notice_subject": "Test Notice"},
            "service_agreement": {"client_name": "TEST_SA Client", "fee_structure": "Fixed fee"},
            "court_filing": {"plaintiff_name": "TEST_Plaintiff", "defendant_name": "TEST_Defendant"},
            "demand_letter": {"client_name": "TEST_DL Client", "debt_amount": "100000"},
            "witness_statement": {"witness_name": "TEST_Witness", "case_number": "WS-TEST-001"},
            "sale_agreement": {"seller_name": "TEST_Seller", "buyer_name": "TEST_Buyer", "sale_price": "50000000"},
            "lease_agreement": {"landlord_name": "TEST_Landlord", "tenant_name": "TEST_Tenant", "monthly_rent": "500000"},
            "will_testament": {"testator_name": "TEST_Testator", "executor_name": "TEST_Executor"}
        }
        
        for template_id, data in test_data.items():
            payload = {
                "template_id": template_id,
                "data": data,
                "include_signature": False,
                "include_qr_stamp": False
            }
            
            response = requests.post(
                f"{BASE_URL}/api/templates/generate",
                headers=headers,
                json=payload
            )
            
            assert response.status_code == 200, f"Failed to generate {template_id}: {response.status_code}"
            assert response.content[:4] == b"%PDF", f"{template_id} did not return valid PDF"


class TestTemplateHistory:
    """Tests for /api/templates/history endpoint"""
    
    def test_history_returns_generated_documents(self, headers):
        """GET /api/templates/history returns list of generated documents"""
        # First generate a document to ensure there's history
        generate_payload = {
            "template_id": "demand_letter",
            "data": {
                "client_name": "TEST_History Client",
                "debt_amount": "250000",
                "debtor_name": "TEST_Debtor",
                "debt_description": "Outstanding payment for services"
            },
            "include_signature": False,
            "include_qr_stamp": True
        }
        
        gen_response = requests.post(
            f"{BASE_URL}/api/templates/generate",
            headers=headers,
            json=generate_payload
        )
        assert gen_response.status_code == 200, "Document generation failed"
        
        # Now check history
        response = requests.get(f"{BASE_URL}/api/templates/history", headers=headers)
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert "documents" in data, "Response should have 'documents' key"
        assert "total" in data, "Response should have 'total' key"
        assert len(data["documents"]) > 0, "Should have at least one document in history"
        
        # Verify document structure
        doc = data["documents"][0]
        assert "id" in doc, "Document should have id"
        assert "template_id" in doc, "Document should have template_id"
        assert "template_name" in doc, "Document should have template_name"
        assert "generated_at" in doc, "Document should have generated_at"
        assert "data" in doc, "Document should have data"
    
    def test_history_with_limit_parameter(self, headers):
        """GET /api/templates/history respects limit parameter"""
        response = requests.get(
            f"{BASE_URL}/api/templates/history",
            headers=headers,
            params={"limit": 5}
        )
        
        assert response.status_code == 200
        data = response.json()
        assert len(data["documents"]) <= 5, "Should respect limit parameter"


class TestSpecificTemplate:
    """Tests for /api/templates/{template_id} endpoint"""
    
    def test_get_specific_template(self, headers):
        """GET /api/templates/{template_id} returns template details"""
        response = requests.get(
            f"{BASE_URL}/api/templates/affidavit",
            headers=headers
        )
        
        assert response.status_code == 200
        
        data = response.json()
        assert data["id"] == "affidavit"
        assert data["name"] == "Affidavit (Kiapo)"
        assert "content_preview" in data, "Should include content preview"
        assert "placeholders" in data, "Should include placeholders"
    
    def test_get_nonexistent_template_returns_404(self, headers):
        """GET /api/templates/{invalid} returns 404"""
        response = requests.get(
            f"{BASE_URL}/api/templates/nonexistent_template",
            headers=headers
        )
        
        assert response.status_code == 404


class TestTemplateCategories:
    """Tests for template categories"""
    
    def test_templates_have_valid_categories(self, headers):
        """All templates should have valid category values"""
        valid_categories = ["authorization", "sworn_statement", "notice", "contract", "court", "estate"]
        
        response = requests.get(f"{BASE_URL}/api/templates/list", headers=headers)
        templates = response.json()["templates"]
        
        for template in templates:
            assert template["category"] in valid_categories, \
                f"Template {template['id']} has invalid category: {template['category']}"


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
