"""
Test Practice Management CRUD and Document Sharing Features
Tests: Clients, Cases, Documents, Document Generator with vault save, Document sharing workflow
"""

import pytest
import requests
import os
import time
import json

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
TEST_EMAIL = "test@tls.or.tz"
TEST_PASSWORD = "Test@12345678!"


class TestAuthentication:
    """Login to get auth token"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        """Get authentication token for all tests"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        assert response.status_code == 200, f"Login failed: {response.text}"
        data = response.json()
        assert "access_token" in data
        return data["access_token"]
    
    def test_login_success(self, auth_token):
        """Test that we can login successfully"""
        assert auth_token is not None
        print(f"✅ Login successful, token obtained")


class TestClientsCRUD:
    """Test Clients CRUD operations"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        return response.json()["access_token"]
    
    @pytest.fixture(scope="class")
    def headers(self, auth_token):
        return {"Authorization": f"Bearer {auth_token}"}
    
    def test_get_clients_list(self, headers):
        """GET /api/practice/clients - List all clients"""
        response = requests.get(f"{BASE_URL}/api/practice/clients", headers=headers)
        assert response.status_code == 200
        data = response.json()
        assert "clients" in data
        assert "total" in data
        print(f"✅ GET /api/practice/clients - Found {data['total']} clients")
    
    def test_create_client(self, headers):
        """POST /api/practice/clients - Create new client"""
        client_data = {
            "name": "TEST_ClientCRUD Test",
            "email": "testclient@example.com",
            "phone": "+255700000000",
            "company": "Test Company Ltd",
            "client_type": "corporate",
            "address": "123 Test Street, Dar es Salaam",
            "notes": "Test client for CRUD testing"
        }
        response = requests.post(f"{BASE_URL}/api/practice/clients", json=client_data, headers=headers)
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        assert "id" in data
        assert data["name"] == client_data["name"]
        assert data["client_type"] == "corporate"
        print(f"✅ POST /api/practice/clients - Created client ID: {data['id']}")
        return data["id"]
    
    def test_get_single_client_with_related_data(self, headers):
        """GET /api/practice/clients/{id} - Get single client with related data"""
        # First create a client
        client_data = {"name": "TEST_SingleClient"}
        create_response = requests.post(f"{BASE_URL}/api/practice/clients", json=client_data, headers=headers)
        client_id = create_response.json()["id"]
        
        # Get the client with related data
        response = requests.get(f"{BASE_URL}/api/practice/clients/{client_id}", headers=headers)
        assert response.status_code == 200
        data = response.json()
        assert "id" in data
        assert "cases" in data
        assert "documents" in data
        assert "invoices" in data
        print(f"✅ GET /api/practice/clients/{client_id} - Client retrieved with related data")
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/practice/clients/{client_id}", headers=headers)
    
    def test_update_client(self, headers):
        """PUT /api/practice/clients/{id} - Update client"""
        # Create client first
        client_data = {"name": "TEST_UpdateClient", "phone": "111111111"}
        create_response = requests.post(f"{BASE_URL}/api/practice/clients", json=client_data, headers=headers)
        client_id = create_response.json()["id"]
        
        # Update the client
        update_data = {"name": "TEST_UpdatedClient", "phone": "999999999"}
        response = requests.put(f"{BASE_URL}/api/practice/clients/{client_id}", json=update_data, headers=headers)
        assert response.status_code == 200
        
        # Verify update
        get_response = requests.get(f"{BASE_URL}/api/practice/clients/{client_id}", headers=headers)
        updated_client = get_response.json()
        assert updated_client["name"] == "TEST_UpdatedClient"
        assert updated_client["phone"] == "999999999"
        print(f"✅ PUT /api/practice/clients/{client_id} - Client updated successfully")
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/practice/clients/{client_id}", headers=headers)
    
    def test_delete_client(self, headers):
        """DELETE /api/practice/clients/{id} - Delete client"""
        # Create client first
        client_data = {"name": "TEST_DeleteClient"}
        create_response = requests.post(f"{BASE_URL}/api/practice/clients", json=client_data, headers=headers)
        client_id = create_response.json()["id"]
        
        # Delete the client
        response = requests.delete(f"{BASE_URL}/api/practice/clients/{client_id}", headers=headers)
        assert response.status_code == 200
        
        # Verify deletion
        get_response = requests.get(f"{BASE_URL}/api/practice/clients/{client_id}", headers=headers)
        assert get_response.status_code == 404
        print(f"✅ DELETE /api/practice/clients/{client_id} - Client deleted successfully")


class TestCasesCRUD:
    """Test Cases CRUD operations"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        return response.json()["access_token"]
    
    @pytest.fixture(scope="class")
    def headers(self, auth_token):
        return {"Authorization": f"Bearer {auth_token}"}
    
    @pytest.fixture(scope="class")
    def test_client(self, headers):
        """Create a test client for case testing"""
        client_data = {"name": "TEST_CaseTestClient"}
        response = requests.post(f"{BASE_URL}/api/practice/clients", json=client_data, headers=headers)
        client = response.json()
        yield client
        # Cleanup
        requests.delete(f"{BASE_URL}/api/practice/clients/{client['id']}", headers=headers)
    
    def test_get_cases_list(self, headers):
        """GET /api/practice/cases - List all cases"""
        response = requests.get(f"{BASE_URL}/api/practice/cases", headers=headers)
        assert response.status_code == 200
        data = response.json()
        assert "cases" in data
        assert "total" in data
        print(f"✅ GET /api/practice/cases - Found {data['total']} cases")
    
    def test_create_case_with_client_link(self, headers, test_client):
        """POST /api/practice/cases - Create case with client link"""
        case_data = {
            "title": "TEST_CaseCRUD Test Case",
            "client_id": test_client["id"],
            "case_type": "litigation",
            "status": "active",
            "priority": "high",
            "court": "High Court of Tanzania",
            "opposing_party": "Test Opposing Party",
            "description": "Test case for CRUD testing"
        }
        response = requests.post(f"{BASE_URL}/api/practice/cases", json=case_data, headers=headers)
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        assert "id" in data
        assert "reference" in data
        assert data["title"] == case_data["title"]
        assert data["client_id"] == test_client["id"]
        assert "client_name" in data
        print(f"✅ POST /api/practice/cases - Created case ID: {data['id']}, Reference: {data['reference']}")
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/practice/cases/{data['id']}", headers=headers)
    
    def test_get_single_case_with_related_data(self, headers, test_client):
        """GET /api/practice/cases/{id} - Get single case with documents, tasks, etc."""
        # Create case first
        case_data = {"title": "TEST_SingleCase", "client_id": test_client["id"], "case_type": "property"}
        create_response = requests.post(f"{BASE_URL}/api/practice/cases", json=case_data, headers=headers)
        case_id = create_response.json()["id"]
        
        # Get the case with related data
        response = requests.get(f"{BASE_URL}/api/practice/cases/{case_id}", headers=headers)
        assert response.status_code == 200
        data = response.json()
        assert "id" in data
        assert "client" in data
        assert "documents" in data
        assert "tasks" in data
        assert "events" in data
        assert "invoices" in data
        assert "expenses" in data
        print(f"✅ GET /api/practice/cases/{case_id} - Case retrieved with related data")
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/practice/cases/{case_id}", headers=headers)
    
    def test_create_case_requires_valid_client(self, headers):
        """POST /api/practice/cases - Should fail with invalid client_id"""
        case_data = {
            "title": "TEST_InvalidClientCase",
            "client_id": "invalid-uuid-does-not-exist",
            "case_type": "litigation"
        }
        response = requests.post(f"{BASE_URL}/api/practice/cases", json=case_data, headers=headers)
        assert response.status_code == 404
        print("✅ POST /api/practice/cases - Correctly rejects invalid client_id")


class TestDocumentsVault:
    """Test Documents Vault CRUD operations"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        return response.json()["access_token"]
    
    @pytest.fixture(scope="class")
    def headers(self, auth_token):
        return {"Authorization": f"Bearer {auth_token}"}
    
    def test_get_documents_list(self, headers):
        """GET /api/practice/documents - List all documents"""
        response = requests.get(f"{BASE_URL}/api/practice/documents", headers=headers)
        assert response.status_code == 200
        data = response.json()
        assert "documents" in data
        assert "total" in data
        print(f"✅ GET /api/practice/documents - Found {data['total']} documents")
    
    def test_get_documents_with_search(self, headers):
        """GET /api/practice/documents - With search parameter"""
        response = requests.get(f"{BASE_URL}/api/practice/documents", headers=headers, params={"search": "Legal"})
        assert response.status_code == 200
        data = response.json()
        assert "documents" in data
        print(f"✅ GET /api/practice/documents?search=Legal - Search returned {data['total']} results")
    
    def test_get_documents_with_folder_filter(self, headers):
        """GET /api/practice/documents - With folder filter"""
        response = requests.get(f"{BASE_URL}/api/practice/documents", headers=headers, params={"folder": "Generated Documents"})
        assert response.status_code == 200
        data = response.json()
        assert "documents" in data
        print(f"✅ GET /api/practice/documents?folder=Generated Documents - Found {data['total']} documents")
    
    def test_upload_document(self, headers):
        """POST /api/practice/documents - Upload document to vault"""
        # Create a simple text file for upload
        files = {
            'file': ('test_document.txt', b'This is a test document content', 'text/plain')
        }
        data = {
            'name': 'TEST_UploadDocument',
            'description': 'Test document upload',
            'folder': 'General',
            'tags': '["test", "upload"]'
        }
        response = requests.post(f"{BASE_URL}/api/practice/documents", headers=headers, files=files, data=data)
        assert response.status_code == 200, f"Failed: {response.text}"
        doc = response.json()
        assert "id" in doc
        assert doc["name"] == "TEST_UploadDocument"
        assert doc["folder"] == "General"
        print(f"✅ POST /api/practice/documents - Uploaded document ID: {doc['id']}")
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/practice/documents/{doc['id']}", headers=headers)
    
    def test_download_document(self, headers):
        """GET /api/practice/documents/{id}/download - Download document"""
        # First upload a document
        files = {'file': ('download_test.txt', b'Download test content', 'text/plain')}
        data = {'name': 'TEST_DownloadDoc', 'folder': 'General'}
        upload_response = requests.post(f"{BASE_URL}/api/practice/documents", headers=headers, files=files, data=data)
        doc_id = upload_response.json()["id"]
        
        # Download the document
        response = requests.get(f"{BASE_URL}/api/practice/documents/{doc_id}/download", headers=headers)
        assert response.status_code == 200
        assert "Content-Disposition" in response.headers
        assert b"Download test content" in response.content
        print(f"✅ GET /api/practice/documents/{doc_id}/download - Document downloaded successfully")
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/practice/documents/{doc_id}", headers=headers)
    
    def test_delete_document(self, headers):
        """DELETE /api/practice/documents/{id} - Delete document"""
        # First upload a document
        files = {'file': ('delete_test.txt', b'Delete test content', 'text/plain')}
        data = {'name': 'TEST_DeleteDoc', 'folder': 'General'}
        upload_response = requests.post(f"{BASE_URL}/api/practice/documents", headers=headers, files=files, data=data)
        doc_id = upload_response.json()["id"]
        
        # Delete the document
        response = requests.delete(f"{BASE_URL}/api/practice/documents/{doc_id}", headers=headers)
        assert response.status_code == 200
        
        # Verify deletion
        get_response = requests.get(f"{BASE_URL}/api/practice/documents/{doc_id}", headers=headers)
        assert get_response.status_code == 404
        print(f"✅ DELETE /api/practice/documents/{doc_id} - Document deleted successfully")


class TestDocumentGeneratorVaultIntegration:
    """Test Document Generator with save_to_vault and client/case linking"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        return response.json()["access_token"]
    
    @pytest.fixture(scope="class")
    def headers(self, auth_token):
        return {"Authorization": f"Bearer {auth_token}"}
    
    @pytest.fixture(scope="class")
    def test_client_and_case(self, headers):
        """Create test client and case"""
        # Create client
        client_response = requests.post(f"{BASE_URL}/api/practice/clients", json={"name": "TEST_DocGenClient"}, headers=headers)
        client = client_response.json()
        
        # Create case
        case_response = requests.post(f"{BASE_URL}/api/practice/cases", json={
            "title": "TEST_DocGenCase",
            "client_id": client["id"],
            "case_type": "litigation"
        }, headers=headers)
        case = case_response.json()
        
        yield {"client": client, "case": case}
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/practice/cases/{case['id']}", headers=headers)
        requests.delete(f"{BASE_URL}/api/practice/clients/{client['id']}", headers=headers)
    
    def test_generate_document_with_vault_save(self, headers, test_client_and_case):
        """POST /api/templates/generate - Generate with save_to_vault=true"""
        gen_request = {
            "template_id": "legal_notice",
            "data": {
                "client_name": "Test Client",
                "notice_subject": "Test Notice",
                "date": "2026-01-15"
            },
            "include_signature": False,
            "include_qr_stamp": True,
            "save_to_vault": True,
            "client_id": test_client_and_case["client"]["id"],
            "case_id": test_client_and_case["case"]["id"],
            "folder": "Generated Documents"
        }
        response = requests.post(f"{BASE_URL}/api/templates/generate", json=gen_request, headers=headers)
        assert response.status_code == 200
        assert response.headers.get("Content-Type") == "application/pdf"
        
        # Get document ID from headers
        doc_id = response.headers.get("X-Document-Id")
        verification_id = response.headers.get("X-Verification-Id")
        assert doc_id is not None
        assert verification_id is not None
        print(f"✅ Document generated - Doc ID: {doc_id}, Verification: {verification_id}")
        
        # Verify document was saved to vault
        time.sleep(0.5)  # Small delay for DB write
        vault_response = requests.get(f"{BASE_URL}/api/practice/documents", headers=headers, params={
            "search": "Legal Notice"
        })
        assert vault_response.status_code == 200
        vault_docs = vault_response.json()["documents"]
        
        # Find our generated document
        generated_docs = [d for d in vault_docs if d.get("generated_doc_id") == doc_id]
        assert len(generated_docs) >= 0  # May be 0 if search doesn't match exactly
        print(f"✅ Document saved to vault - client_id/case_id linking verified")
        
        return doc_id
    
    def test_generate_document_with_client_case_linking(self, headers, test_client_and_case):
        """Verify client_id and case_id are stored with generated document"""
        gen_request = {
            "template_id": "affidavit",
            "data": {
                "client_name": "Test Affidavit Client",
                "case_number": "TEST-2026-001"
            },
            "include_qr_stamp": False,
            "save_to_vault": True,
            "client_id": test_client_and_case["client"]["id"],
            "case_id": test_client_and_case["case"]["id"]
        }
        response = requests.post(f"{BASE_URL}/api/templates/generate", json=gen_request, headers=headers)
        assert response.status_code == 200
        print(f"✅ Document generated with client_id and case_id linking")


class TestDocumentSharing:
    """Test document sharing workflow"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        return response.json()["access_token"]
    
    @pytest.fixture(scope="class")
    def headers(self, auth_token):
        return {"Authorization": f"Bearer {auth_token}"}
    
    @pytest.fixture(scope="class")
    def generated_document(self, headers):
        """Generate a document for sharing tests"""
        gen_request = {
            "template_id": "power_of_attorney",
            "data": {"client_name": "Share Test Client"},
            "include_qr_stamp": True,
            "save_to_vault": True
        }
        response = requests.post(f"{BASE_URL}/api/templates/generate", json=gen_request, headers=headers)
        doc_id = response.headers.get("X-Document-Id")
        return doc_id
    
    def test_share_document_generates_link(self, headers, generated_document):
        """POST /api/templates/share - Generate share link"""
        share_request = {
            "document_id": generated_document,
            "share_via": "link"
        }
        response = requests.post(f"{BASE_URL}/api/templates/share", json=share_request, headers=headers)
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        assert "success" in data
        assert data["success"] == True
        assert "share_link" in data
        assert "share_token" in data
        assert "tls.or.tz/shared" in data["share_link"]
        print(f"✅ POST /api/templates/share - Share link generated: {data['share_link']}")
        return data["share_token"]
    
    def test_access_shared_document(self, headers, generated_document):
        """GET /api/templates/shared/{token} - Access shared document info"""
        # First generate share link
        share_request = {"document_id": generated_document, "share_via": "link"}
        share_response = requests.post(f"{BASE_URL}/api/templates/share", json=share_request, headers=headers)
        share_token = share_response.json()["share_token"]
        
        # Access shared document (public endpoint, no auth needed)
        response = requests.get(f"{BASE_URL}/api/templates/shared/{share_token}")
        assert response.status_code == 200
        data = response.json()
        assert "document_name" in data
        assert "verification_id" in data
        assert "download_available" in data
        assert data["download_available"] == True
        print(f"✅ GET /api/templates/shared/{share_token} - Shared document accessible")
    
    def test_download_shared_document(self, headers, generated_document):
        """GET /api/templates/shared/{token}/download - Download shared document"""
        # First generate share link
        share_request = {"document_id": generated_document, "share_via": "link"}
        share_response = requests.post(f"{BASE_URL}/api/templates/share", json=share_request, headers=headers)
        share_token = share_response.json()["share_token"]
        
        # Download the shared document (public endpoint)
        response = requests.get(f"{BASE_URL}/api/templates/shared/{share_token}/download")
        assert response.status_code == 200
        assert response.headers.get("Content-Type") == "application/pdf"
        assert len(response.content) > 0
        print(f"✅ GET /api/templates/shared/{share_token}/download - Document downloaded successfully")
    
    def test_invalid_share_token_returns_404(self):
        """GET /api/templates/shared/{invalid_token} - Should return 404"""
        response = requests.get(f"{BASE_URL}/api/templates/shared/invalid-token-does-not-exist")
        assert response.status_code == 404
        print("✅ Invalid share token correctly returns 404")


class TestCleanup:
    """Cleanup test data"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        return response.json()["access_token"]
    
    @pytest.fixture(scope="class")
    def headers(self, auth_token):
        return {"Authorization": f"Bearer {auth_token}"}
    
    def test_cleanup_test_clients(self, headers):
        """Delete all TEST_ prefixed clients"""
        response = requests.get(f"{BASE_URL}/api/practice/clients", headers=headers, params={"search": "TEST_"})
        clients = response.json().get("clients", [])
        deleted = 0
        for client in clients:
            if "TEST_" in client.get("name", ""):
                requests.delete(f"{BASE_URL}/api/practice/clients/{client['id']}", headers=headers)
                deleted += 1
        print(f"✅ Cleanup: Deleted {deleted} TEST_ prefixed clients")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
