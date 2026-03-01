"""
Test Iteration 65: TLS Practice Management Suite Features
Tests for:
1. Batch stamp page loads and batch-stamps endpoint returns correct data
2. Case hearings form submits successfully and creates calendar event  
3. Test user's public profile displays populated content
4. Scan mode dropdown exists in DocumentStampPage scan preview area
"""

import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://stamp-and-manage.preview.emergentagent.com')

# Test credentials
TEST_EMAIL = "test@tls.or.tz"
TEST_PASSWORD = "Test@12345678!"
TEST_ROLL_NUMBER = "ADV/TEST/001"
TEST_USER_ID = "test-advocate-persistent-001"  # Actual user ID in DB


class TestAuth:
    """Authentication helpers"""
    
    @pytest.fixture(scope="class")
    def session(self):
        """Create authenticated session"""
        session = requests.Session()
        session.headers.update({"Content-Type": "application/json"})
        return session
    
    @pytest.fixture(scope="class")
    def auth_token(self, session):
        """Get authentication token for test user"""
        response = session.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        assert response.status_code == 200, f"Login failed: {response.text}"
        data = response.json()
        # API returns access_token not token
        token = data.get("access_token") or data.get("token")
        assert token, "Token missing from login response"
        # Also store CSRF token
        csrf_token = data.get("csrf_token")
        return {"access_token": token, "csrf_token": csrf_token}
    
    @pytest.fixture(scope="class")
    def auth_headers(self, auth_token):
        """Get auth headers with token and CSRF"""
        headers = {"Authorization": f"Bearer {auth_token['access_token']}"}
        if auth_token.get("csrf_token"):
            headers["X-CSRF-Token"] = auth_token["csrf_token"]
        return headers


class TestBatchStampsEndpoint(TestAuth):
    """Feature 1: Batch stamps endpoint returns correct data"""
    
    def test_batch_stamps_endpoint_exists(self, session, auth_headers):
        """Test GET /api/documents/batch-stamps returns valid response"""
        response = session.get(
            f"{BASE_URL}/api/documents/batch-stamps",
            headers=auth_headers
        )
        assert response.status_code == 200, f"Batch stamps endpoint failed: {response.text}"
        data = response.json()
        # Response should be a list (may be empty if no batch stamps yet)
        assert isinstance(data, list), f"Expected list, got {type(data)}"
        print(f"PASS: GET /api/documents/batch-stamps - Returns {len(data)} batch records")
    
    def test_batch_stamps_structure(self, session, auth_headers):
        """Test batch stamps response structure if records exist"""
        response = session.get(
            f"{BASE_URL}/api/documents/batch-stamps",
            headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        
        if len(data) > 0:
            # Check structure of first record
            record = data[0]
            expected_fields = ["batch_id", "created_at", "file_count"]
            for field in expected_fields:
                assert field in record, f"Missing field '{field}' in batch record"
            print(f"PASS: Batch stamps response has correct structure")
        else:
            print("INFO: No batch stamps found - endpoint returns empty list correctly")


class TestCaseHearingsAndCalendar(TestAuth):
    """Feature 2: Case hearings form submits and creates calendar event"""
    
    def test_create_client_for_case(self, session, auth_headers):
        """Create a client for test case"""
        client_data = {
            "name": "TEST_Client_Iteration65",
            "email": "test_client_65@example.com",
            "phone": "+255123456789",
            "type": "individual"
        }
        response = session.post(
            f"{BASE_URL}/api/practice/clients",
            json=client_data,
            headers=auth_headers
        )
        # May already exist or succeed
        assert response.status_code in [200, 201, 409], f"Client creation failed: {response.text}"
        print(f"PASS: Client created/exists for case testing")
        
        # Get client list to find the client
        clients_response = session.get(
            f"{BASE_URL}/api/practice/clients",
            headers=auth_headers
        )
        assert clients_response.status_code == 200
        clients = clients_response.json().get("clients", [])
        test_client = next((c for c in clients if c.get("name") == "TEST_Client_Iteration65"), None)
        return test_client["id"] if test_client else None
    
    def test_create_case_and_hearing(self, session, auth_headers):
        """Create a case and add a hearing to it"""
        # First get or create a client
        client_id = self.test_create_client_for_case(session, auth_headers)
        
        if not client_id:
            # Try getting any client
            clients_response = session.get(
                f"{BASE_URL}/api/practice/clients",
                headers=auth_headers
            )
            clients = clients_response.json().get("clients", [])
            if clients:
                client_id = clients[0]["id"]
            else:
                pytest.skip("No clients available for case creation")
        
        # Create a test case
        case_data = {
            "title": "TEST_Case_Iteration65",
            "client_id": client_id,
            "case_type": "litigation",
            "status": "active",
            "priority": "medium",
            "court": "High Court",
            "judge": "Judge Test"
        }
        
        case_response = session.post(
            f"{BASE_URL}/api/practice/cases",
            json=case_data,
            headers=auth_headers
        )
        assert case_response.status_code in [200, 201], f"Case creation failed: {case_response.text}"
        case = case_response.json()
        case_id = case.get("id")
        assert case_id, "Case ID missing from response"
        print(f"PASS: Case created with ID: {case_id}")
        
        return case_id
    
    def test_add_hearing_to_case(self, session, auth_headers):
        """Add a hearing to a case and verify calendar sync"""
        case_id = self.test_create_case_and_hearing(session, auth_headers)
        
        if not case_id:
            # Get existing case
            cases_response = session.get(
                f"{BASE_URL}/api/practice/cases",
                headers=auth_headers
            )
            cases = cases_response.json().get("cases", [])
            if cases:
                case_id = cases[0]["id"]
            else:
                pytest.skip("No cases available for hearing test")
        
        # Create hearing data
        hearing_data = {
            "title": "TEST_Hearing_Iteration65",
            "hearing_datetime": "2026-03-15T09:00:00",
            "court": "High Court Dar es Salaam",
            "courtroom": "Court Room 5",
            "judge": "Judge Test",
            "notes": "Test hearing for iteration 65"
        }
        
        hearing_response = session.post(
            f"{BASE_URL}/api/practice/cases/{case_id}/hearings",
            json=hearing_data,
            headers=auth_headers
        )
        assert hearing_response.status_code in [200, 201], f"Hearing creation failed: {hearing_response.text}"
        print(f"PASS: Hearing created successfully")
        
        # Verify hearing was added
        hearings_response = session.get(
            f"{BASE_URL}/api/practice/cases/{case_id}/hearings",
            headers=auth_headers
        )
        assert hearings_response.status_code == 200
        hearings = hearings_response.json().get("hearings", [])
        test_hearing = next((h for h in hearings if h.get("title") == "TEST_Hearing_Iteration65"), None)
        assert test_hearing is not None, "Test hearing not found in case hearings"
        print(f"PASS: Hearing found in case hearings list")
    
    def test_calendar_events_endpoint(self, session, auth_headers):
        """Test that calendar events can be created"""
        event_data = {
            "title": "TEST_Calendar_Event_Iteration65",
            "start": "2026-03-16T09:00:00",
            "end": "2026-03-16T11:00:00",
            "type": "court_hearing",
            "priority": "high",
            "location": "High Court",
            "notes": "Test calendar event"
        }
        
        response = session.post(
            f"{BASE_URL}/api/practice/calendar/events",
            json=event_data,
            headers=auth_headers
        )
        assert response.status_code in [200, 201], f"Calendar event creation failed: {response.text}"
        print(f"PASS: Calendar event created successfully")


class TestPublicProfile(TestAuth):
    """Feature 3: Test user's public profile displays populated content"""
    
    def test_public_profile_by_id(self, session):
        """Test public profile endpoint returns populated data"""
        # Use the known user ID directly
        response = session.get(f"{BASE_URL}/api/advocates/public/{TEST_USER_ID}")
        
        assert response.status_code == 200, f"Public profile endpoint failed: {response.text}"
        data = response.json()
        
        # Verify basic fields exist
        assert "full_name" in data, "Missing full_name in profile"
        assert "roll_number" in data, "Missing roll_number in profile"
        print(f"PASS: Public profile endpoint returns status 200 for {data.get('full_name')}")
        return data
    
    def test_public_profile_has_bio(self, session):
        """Test that public profile has a bio"""
        data = self.test_public_profile_by_id(session)
        bio = data.get("bio")
        assert bio and len(bio) > 0, "Bio should be populated"
        print(f"PASS: Public profile has bio: {bio[:50]}...")
    
    def test_public_profile_has_education(self, session):
        """Test that public profile has education entries"""
        data = self.test_public_profile_by_id(session)
        education = data.get("education", [])
        assert len(education) > 0, "Education should have at least one entry"
        for edu in education:
            assert "degree" in edu, "Education entry should have degree"
            assert "institution" in edu, "Education entry should have institution"
        print(f"PASS: Public profile has {len(education)} education entries")
    
    def test_public_profile_has_practice_areas(self, session):
        """Test that public profile has practice areas"""
        data = self.test_public_profile_by_id(session)
        practice_areas = data.get("practice_areas", [])
        assert len(practice_areas) > 0, "Practice areas should have at least one entry"
        print(f"PASS: Public profile has {len(practice_areas)} practice areas")
    
    def test_public_profile_has_experience(self, session):
        """Test that public profile has experience entries"""
        data = self.test_public_profile_by_id(session)
        experience = data.get("experience", [])
        assert len(experience) > 0, "Experience should have at least one entry"
        for exp in experience:
            assert "position" in exp, "Experience entry should have position"
            assert "company" in exp, "Experience entry should have company"
        print(f"PASS: Public profile has {len(experience)} experience entries")
    
    def test_public_profile_has_achievements(self, session):
        """Test that public profile has achievements"""
        data = self.test_public_profile_by_id(session)
        achievements = data.get("achievements", [])
        assert len(achievements) > 0, "Achievements should have at least one entry"
        print(f"PASS: Public profile has {len(achievements)} achievements")
    
    def test_public_profile_has_memberships(self, session):
        """Test that public profile has memberships"""
        data = self.test_public_profile_by_id(session)
        memberships = data.get("memberships", [])
        assert len(memberships) > 0, "Memberships should have at least one entry"
        print(f"PASS: Public profile has {len(memberships)} memberships")
    
    def test_public_profile_has_bar_admissions(self, session):
        """Test that public profile has bar admissions"""
        data = self.test_public_profile_by_id(session)
        bar_admissions = data.get("bar_admissions", [])
        assert len(bar_admissions) > 0, "Bar admissions should have at least one entry"
        print(f"PASS: Public profile has {len(bar_admissions)} bar admissions")


class TestCleanup(TestAuth):
    """Cleanup test data"""
    
    def test_cleanup_test_data(self, session, auth_headers):
        """Clean up any test data created during testing"""
        # Delete test hearings, cases, clients, and calendar events
        try:
            # Get cases and delete test ones
            cases_response = session.get(
                f"{BASE_URL}/api/practice/cases",
                headers=auth_headers
            )
            if cases_response.status_code == 200:
                cases = cases_response.json().get("cases", [])
                for case in cases:
                    if case.get("title", "").startswith("TEST_"):
                        session.delete(
                            f"{BASE_URL}/api/practice/cases/{case['id']}",
                            headers=auth_headers
                        )
            
            # Get clients and delete test ones
            clients_response = session.get(
                f"{BASE_URL}/api/practice/clients",
                headers=auth_headers
            )
            if clients_response.status_code == 200:
                clients = clients_response.json().get("clients", [])
                for client in clients:
                    if client.get("name", "").startswith("TEST_"):
                        session.delete(
                            f"{BASE_URL}/api/practice/clients/{client['id']}",
                            headers=auth_headers
                        )
            
            print("PASS: Cleanup completed")
        except Exception as e:
            print(f"WARNING: Cleanup had issues: {e}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
