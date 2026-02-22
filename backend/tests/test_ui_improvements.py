"""
Backend tests for TLS UI/UX improvements - Iteration 44
Tests: Seed data endpoint, Cases API (for table/card views), Case status updates

Features tested:
1. Seed data endpoint /api/dev/seed - creates clients, cases, tasks, events, invoices, documents
2. Cases API for table/card view toggle
3. Case action menu - Edit, Set Active/Pending/On Hold/Close, Delete
"""

import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestAuth:
    """Test authentication for protected endpoints"""
    
    @pytest.fixture(scope="class")
    def session(self):
        """Create session with test credentials"""
        session = requests.Session()
        session.headers.update({"Content-Type": "application/json"})
        return session
    
    @pytest.fixture(scope="class")
    def auth_token(self, session):
        """Get authentication token"""
        response = session.post(f"{BASE_URL}/api/auth/login", json={
            "email": "test@tls.or.tz",
            "password": "Test@12345678!"
        })
        if response.status_code == 200:
            data = response.json()
            return {
                "token": data.get("access_token"),
                "csrf_token": data.get("csrf_token")
            }
        pytest.skip(f"Authentication failed: {response.status_code} - {response.text}")
    
    def test_login_success(self, session):
        """Test login returns token and CSRF token"""
        response = session.post(f"{BASE_URL}/api/auth/login", json={
            "email": "test@tls.or.tz",
            "password": "Test@12345678!"
        })
        assert response.status_code == 200, f"Login failed: {response.text}"
        data = response.json()
        assert "access_token" in data, "No access_token in response"
        assert "csrf_token" in data, "No csrf_token in response"
        print(f"Login successful - got access_token and csrf_token")


class TestSeedData:
    """Test seed data endpoint for populating demo data"""
    
    @pytest.fixture(scope="class")
    def session(self):
        session = requests.Session()
        session.headers.update({"Content-Type": "application/json"})
        return session
    
    @pytest.fixture(scope="class")
    def auth_headers(self, session):
        """Get auth headers with token and CSRF"""
        response = session.post(f"{BASE_URL}/api/auth/login", json={
            "email": "test@tls.or.tz",
            "password": "Test@12345678!"
        })
        if response.status_code != 200:
            pytest.skip(f"Authentication failed: {response.status_code}")
        data = response.json()
        return {
            "Authorization": f"Bearer {data['access_token']}",
            "X-CSRF-Token": data.get("csrf_token", ""),
            "Content-Type": "application/json"
        }
    
    def test_seed_endpoint_creates_data(self, session, auth_headers):
        """Test POST /api/dev/seed creates sample data"""
        response = session.post(f"{BASE_URL}/api/dev/seed", headers=auth_headers)
        
        assert response.status_code == 200, f"Seed failed: {response.status_code} - {response.text}"
        data = response.json()
        
        # Verify response structure
        assert data.get("success") is True, "Seed should return success=True"
        assert "created" in data, "Response should include 'created' counts"
        
        created = data["created"]
        
        # Verify all entity types were created
        assert created.get("clients", 0) > 0, "Should create clients"
        assert created.get("cases", 0) > 0, "Should create cases"
        assert created.get("tasks", 0) > 0, "Should create tasks"
        assert created.get("events", 0) > 0, "Should create events"
        assert created.get("invoices", 0) > 0, "Should create invoices"
        assert created.get("documents", 0) > 0, "Should create documents"
        
        print(f"Seed data created: {created}")
    
    def test_seed_idempotent_creates_more(self, session, auth_headers):
        """Test calling seed again adds more data (not idempotent)"""
        # Get initial counts
        clients_res = session.get(f"{BASE_URL}/api/practice/clients", headers=auth_headers)
        initial_clients = len(clients_res.json().get("clients", []))
        
        # Seed again
        response = session.post(f"{BASE_URL}/api/dev/seed", headers=auth_headers)
        assert response.status_code == 200
        
        # Verify more clients were added
        clients_res2 = session.get(f"{BASE_URL}/api/practice/clients", headers=auth_headers)
        new_clients = len(clients_res2.json().get("clients", []))
        
        assert new_clients >= initial_clients, "Seed should add more data each call"
        print(f"Clients count: {initial_clients} -> {new_clients}")


class TestCasesAPI:
    """Test cases API for table/card view and actions"""
    
    @pytest.fixture(scope="class")
    def session(self):
        session = requests.Session()
        session.headers.update({"Content-Type": "application/json"})
        return session
    
    @pytest.fixture(scope="class")
    def auth_headers(self, session):
        response = session.post(f"{BASE_URL}/api/auth/login", json={
            "email": "test@tls.or.tz",
            "password": "Test@12345678!"
        })
        if response.status_code != 200:
            pytest.skip(f"Auth failed: {response.status_code}")
        data = response.json()
        return {
            "Authorization": f"Bearer {data['access_token']}",
            "X-CSRF-Token": data.get("csrf_token", ""),
            "Content-Type": "application/json"
        }
    
    def test_get_cases_returns_list(self, session, auth_headers):
        """Test GET /api/practice/cases returns case list for table view"""
        response = session.get(f"{BASE_URL}/api/practice/cases", headers=auth_headers)
        
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        
        assert "cases" in data, "Response should have 'cases' array"
        cases = data["cases"]
        
        if len(cases) > 0:
            case = cases[0]
            # Verify case has fields needed for table view
            assert "id" in case, "Case should have id"
            assert "title" in case, "Case should have title"
            assert "status" in case, "Case should have status"
            assert "priority" in case, "Case should have priority"
            assert "case_type" in case, "Case should have case_type"
            print(f"Found {len(cases)} cases with proper fields for table view")
        else:
            print("No cases found - may need to run seed first")
    
    def test_case_status_update(self, session, auth_headers):
        """Test PUT /api/practice/cases/{id} for status updates (action menu)"""
        # First get a case
        cases_res = session.get(f"{BASE_URL}/api/practice/cases", headers=auth_headers)
        cases = cases_res.json().get("cases", [])
        
        if not cases:
            pytest.skip("No cases available for testing status update")
        
        case_id = cases[0]["id"]
        original_status = cases[0]["status"]
        
        # Test updating to different statuses
        new_status = "on_hold" if original_status != "on_hold" else "active"
        
        response = session.put(
            f"{BASE_URL}/api/practice/cases/{case_id}",
            json={"status": new_status},
            headers=auth_headers
        )
        
        assert response.status_code == 200, f"Status update failed: {response.text}"
        updated_case = response.json()
        assert updated_case.get("status") == new_status, f"Status should be {new_status}"
        print(f"Case status updated: {original_status} -> {new_status}")
        
        # Restore original status
        session.put(
            f"{BASE_URL}/api/practice/cases/{case_id}",
            json={"status": original_status},
            headers=auth_headers
        )
    
    def test_case_crud_operations(self, session, auth_headers):
        """Test Create, Read, Update, Delete for cases (action menu)"""
        # Get a client first (required for case creation)
        clients_res = session.get(f"{BASE_URL}/api/practice/clients", headers=auth_headers)
        clients = clients_res.json().get("clients", [])
        
        if not clients:
            pytest.skip("No clients available for case creation")
        
        client_id = clients[0]["id"]
        
        # CREATE case
        create_payload = {
            "title": "TEST_Case_Action_Menu_Test",
            "client_id": client_id,
            "case_type": "litigation",
            "status": "active",
            "priority": "medium",
            "description": "Test case for action menu testing"
        }
        
        create_res = session.post(
            f"{BASE_URL}/api/practice/cases",
            json=create_payload,
            headers=auth_headers
        )
        assert create_res.status_code in [200, 201], f"Create failed: {create_res.text}"
        created_case = create_res.json()
        case_id = created_case["id"]
        print(f"Created case: {case_id}")
        
        # READ - verify case was created
        read_res = session.get(f"{BASE_URL}/api/practice/cases/{case_id}", headers=auth_headers)
        if read_res.status_code == 200:
            fetched = read_res.json()
            assert fetched["title"] == create_payload["title"]
            print("Case read verification passed")
        
        # UPDATE - test edit functionality
        update_res = session.put(
            f"{BASE_URL}/api/practice/cases/{case_id}",
            json={"title": "TEST_Updated_Case_Title", "priority": "high"},
            headers=auth_headers
        )
        assert update_res.status_code == 200, f"Update failed: {update_res.text}"
        updated = update_res.json()
        assert updated.get("priority") == "high" or updated.get("title") == "TEST_Updated_Case_Title"
        print("Case update (edit) passed")
        
        # Test status changes (action menu options)
        for status in ["pending", "on_hold", "closed", "active"]:
            status_res = session.put(
                f"{BASE_URL}/api/practice/cases/{case_id}",
                json={"status": status},
                headers=auth_headers
            )
            assert status_res.status_code == 200, f"Status change to {status} failed"
            print(f"Status change to '{status}' passed")
        
        # DELETE - test delete functionality
        delete_res = session.delete(f"{BASE_URL}/api/practice/cases/{case_id}", headers=auth_headers)
        assert delete_res.status_code in [200, 204], f"Delete failed: {delete_res.text}"
        print("Case delete passed")
        
        # Verify deletion
        verify_res = session.get(f"{BASE_URL}/api/practice/cases/{case_id}", headers=auth_headers)
        assert verify_res.status_code == 404, "Deleted case should return 404"
        print("Case deletion verification passed")


class TestClientsAPI:
    """Test clients API for dropdown visibility testing"""
    
    @pytest.fixture(scope="class")
    def session(self):
        session = requests.Session()
        session.headers.update({"Content-Type": "application/json"})
        return session
    
    @pytest.fixture(scope="class") 
    def auth_headers(self, session):
        response = session.post(f"{BASE_URL}/api/auth/login", json={
            "email": "test@tls.or.tz",
            "password": "Test@12345678!"
        })
        if response.status_code != 200:
            pytest.skip(f"Auth failed: {response.status_code}")
        data = response.json()
        return {
            "Authorization": f"Bearer {data['access_token']}",
            "X-CSRF-Token": data.get("csrf_token", ""),
            "Content-Type": "application/json"
        }
    
    def test_create_client_with_types(self, session, auth_headers):
        """Test creating clients with different types (individual, corporate, government)"""
        client_types = ["individual", "corporate", "government"]
        
        for ctype in client_types:
            payload = {
                "name": f"TEST_Client_{ctype}_{os.urandom(4).hex()}",
                "email": f"test_{ctype}@example.com",
                "phone": "+255741234567",
                "client_type": ctype,
                "address": "Test Address, Dar es Salaam"
            }
            
            if ctype == "corporate":
                payload["company"] = "Test Company Ltd"
            
            response = session.post(
                f"{BASE_URL}/api/practice/clients",
                json=payload,
                headers=auth_headers
            )
            
            assert response.status_code in [200, 201], f"Create {ctype} client failed: {response.text}"
            created = response.json()
            assert created.get("client_type") == ctype, f"Client type should be {ctype}"
            print(f"Created {ctype} client successfully")
            
            # Clean up
            session.delete(f"{BASE_URL}/api/practice/clients/{created['id']}", headers=auth_headers)


class TestDocumentTemplates:
    """Test document generation with wider modal (max-w-2xl)"""
    
    @pytest.fixture(scope="class")
    def session(self):
        session = requests.Session()
        session.headers.update({"Content-Type": "application/json"})
        return session
    
    @pytest.fixture(scope="class")
    def auth_headers(self, session):
        response = session.post(f"{BASE_URL}/api/auth/login", json={
            "email": "test@tls.or.tz",
            "password": "Test@12345678!"
        })
        if response.status_code != 200:
            pytest.skip(f"Auth failed: {response.status_code}")
        data = response.json()
        return {
            "Authorization": f"Bearer {data['access_token']}",
            "X-CSRF-Token": data.get("csrf_token", ""),
            "Content-Type": "application/json"
        }
    
    def test_list_templates(self, session, auth_headers):
        """Test GET /api/templates/list returns available templates"""
        response = session.get(f"{BASE_URL}/api/templates/list", headers=auth_headers)
        
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        
        assert "templates" in data, "Response should have templates list"
        templates = data["templates"]
        assert len(templates) > 0, "Should have at least one template"
        
        # Verify template structure
        template = templates[0]
        assert "id" in template
        assert "name" in template
        assert "placeholders" in template
        
        print(f"Found {len(templates)} templates available for generation")
    
    def test_generate_document_with_qr_stamp(self, session, auth_headers):
        """Test document generation with QR stamp (unified design)"""
        payload = {
            "template_id": "power_of_attorney",
            "data": {
                "client_name": "Test Client",
                "client_address": "123 Test Street, Dar es Salaam",
                "client_id_number": "12345678",
                "matter_description": "Test Matter",
                "witness_name_1": "Witness One",
                "witness_name_2": "Witness Two"
            },
            "include_qr_stamp": True,
            "include_signature": True,
            "save_to_vault": False
        }
        
        response = session.post(
            f"{BASE_URL}/api/templates/generate",
            json=payload,
            headers=auth_headers
        )
        
        assert response.status_code == 200, f"Generate failed: {response.text}"
        assert response.headers.get("content-type") == "application/pdf"
        
        # Check custom headers
        doc_id = response.headers.get("X-Document-Id")
        verification_id = response.headers.get("X-Verification-Id")
        
        assert doc_id is not None, "Should return X-Document-Id header"
        assert verification_id is not None, "Should return X-Verification-Id header"
        
        # Verify PDF content
        content = response.content
        assert content[:4] == b'%PDF', "Response should be a valid PDF"
        assert len(content) > 1000, "PDF should have substantial content"
        
        print(f"Generated PDF with QR stamp - Doc ID: {doc_id}, Verification ID: {verification_id}")


class TestCleanup:
    """Clean up test data after tests"""
    
    @pytest.fixture(scope="class")
    def session(self):
        session = requests.Session()
        session.headers.update({"Content-Type": "application/json"})
        return session
    
    @pytest.fixture(scope="class")
    def auth_headers(self, session):
        response = session.post(f"{BASE_URL}/api/auth/login", json={
            "email": "test@tls.or.tz",
            "password": "Test@12345678!"
        })
        if response.status_code != 200:
            pytest.skip("Auth failed")
        data = response.json()
        return {
            "Authorization": f"Bearer {data['access_token']}",
            "X-CSRF-Token": data.get("csrf_token", ""),
            "Content-Type": "application/json"
        }
    
    def test_cleanup_test_cases(self, session, auth_headers):
        """Clean up TEST_ prefixed cases"""
        response = session.get(f"{BASE_URL}/api/practice/cases", headers=auth_headers)
        if response.status_code == 200:
            cases = response.json().get("cases", [])
            for case in cases:
                if case.get("title", "").startswith("TEST_"):
                    session.delete(f"{BASE_URL}/api/practice/cases/{case['id']}", headers=auth_headers)
                    print(f"Cleaned up test case: {case['title']}")
    
    def test_cleanup_test_clients(self, session, auth_headers):
        """Clean up TEST_ prefixed clients"""
        response = session.get(f"{BASE_URL}/api/practice/clients", headers=auth_headers)
        if response.status_code == 200:
            clients = response.json().get("clients", [])
            for client in clients:
                if client.get("name", "").startswith("TEST_"):
                    session.delete(f"{BASE_URL}/api/practice/clients/{client['id']}", headers=auth_headers)
                    print(f"Cleaned up test client: {client['name']}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
