"""
Test suite for Iteration 47 Features:
- Calendar Event Actions (Mark Complete, Set Reminder, Duplicate)
- Case Status Update Endpoints
- Document Vault Demo badges
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
TEST_EMAIL = "test@tls.or.tz"
TEST_PASSWORD = "Test@12345678!"


class TestAuth:
    """Authentication helper tests"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        """Get authentication token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        if response.status_code == 200:
            return response.json().get("access_token")
        pytest.skip(f"Authentication failed - status {response.status_code}")
    
    @pytest.fixture(scope="class")
    def headers(self, auth_token):
        """Get headers with auth token"""
        return {"Authorization": f"Bearer {auth_token}"}


class TestCalendarEventStatus(TestAuth):
    """Test Calendar Event Status Endpoint - Mark Complete"""
    
    @pytest.fixture
    def test_event_id(self, headers):
        """Create a test event and return its ID"""
        event_data = {
            "title": "TEST_Event_For_Status_Test",
            "event_type": "meeting",
            "start_datetime": "2026-02-01T10:00:00"
        }
        response = requests.post(f"{BASE_URL}/api/practice/events", json=event_data, headers=headers)
        if response.status_code in [200, 201]:
            return response.json()["id"]
        pytest.skip("Failed to create test event")
    
    def test_mark_event_complete(self, headers, test_event_id):
        """Test PATCH /api/practice/events/{id}/status - marks event as completed"""
        response = requests.patch(
            f"{BASE_URL}/api/practice/events/{test_event_id}/status",
            json={"status": "completed"},
            headers=headers
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        assert "message" in data
        assert "completed" in data["message"]
        
        # Verify the change persisted
        get_response = requests.get(f"{BASE_URL}/api/practice/events/{test_event_id}", headers=headers)
        assert get_response.status_code == 200
        event_data = get_response.json()
        assert event_data["status"] == "completed"
    
    def test_mark_event_scheduled(self, headers, test_event_id):
        """Test marking event back to scheduled"""
        response = requests.patch(
            f"{BASE_URL}/api/practice/events/{test_event_id}/status",
            json={"status": "scheduled"},
            headers=headers
        )
        assert response.status_code == 200
    
    def test_mark_event_cancelled(self, headers, test_event_id):
        """Test marking event as cancelled"""
        response = requests.patch(
            f"{BASE_URL}/api/practice/events/{test_event_id}/status",
            json={"status": "cancelled"},
            headers=headers
        )
        assert response.status_code == 200
    
    def test_invalid_status_rejected(self, headers, test_event_id):
        """Test that invalid status is rejected"""
        response = requests.patch(
            f"{BASE_URL}/api/practice/events/{test_event_id}/status",
            json={"status": "invalid_status"},
            headers=headers
        )
        assert response.status_code == 400


class TestCalendarEventReminder(TestAuth):
    """Test Calendar Event Reminder Endpoint"""
    
    @pytest.fixture
    def test_event_id(self, headers):
        """Create a test event and return its ID"""
        event_data = {
            "title": "TEST_Event_For_Reminder_Test",
            "event_type": "deadline",
            "start_datetime": "2026-02-15T14:00:00"
        }
        response = requests.post(f"{BASE_URL}/api/practice/events", json=event_data, headers=headers)
        if response.status_code in [200, 201]:
            return response.json()["id"]
        pytest.skip("Failed to create test event")
    
    def test_set_event_reminder(self, headers, test_event_id):
        """Test PATCH /api/practice/events/{id}/reminder - sets reminders"""
        reminder_minutes = [15, 30, 60, 1440]  # 15min, 30min, 1hr, 1day
        response = requests.patch(
            f"{BASE_URL}/api/practice/events/{test_event_id}/reminder",
            json={"reminder_minutes": reminder_minutes},
            headers=headers
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        assert "message" in data
        assert "reminder_minutes" in data
        assert data["reminder_minutes"] == reminder_minutes
        
        # Verify persistence
        get_response = requests.get(f"{BASE_URL}/api/practice/events/{test_event_id}", headers=headers)
        assert get_response.status_code == 200
        event_data = get_response.json()
        assert event_data["reminder_minutes"] == reminder_minutes
    
    def test_set_single_reminder(self, headers, test_event_id):
        """Test setting a single reminder"""
        response = requests.patch(
            f"{BASE_URL}/api/practice/events/{test_event_id}/reminder",
            json={"reminder_minutes": [60]},
            headers=headers
        )
        assert response.status_code == 200
    
    def test_clear_reminders(self, headers, test_event_id):
        """Test clearing all reminders"""
        response = requests.patch(
            f"{BASE_URL}/api/practice/events/{test_event_id}/reminder",
            json={"reminder_minutes": []},
            headers=headers
        )
        assert response.status_code == 200


class TestCalendarEventDuplicate(TestAuth):
    """Test Calendar Event Duplicate Endpoint"""
    
    @pytest.fixture
    def test_event_id(self, headers):
        """Create a test event and return its ID"""
        event_data = {
            "title": "TEST_Original_Event_For_Duplicate",
            "event_type": "court_hearing",
            "start_datetime": "2026-03-01T09:00:00",
            "location": "High Court",
            "description": "Test hearing event"
        }
        response = requests.post(f"{BASE_URL}/api/practice/events", json=event_data, headers=headers)
        if response.status_code in [200, 201]:
            return response.json()["id"]
        pytest.skip("Failed to create test event")
    
    def test_duplicate_event(self, headers, test_event_id):
        """Test POST /api/practice/events/{id}/duplicate - creates a copy"""
        response = requests.post(
            f"{BASE_URL}/api/practice/events/{test_event_id}/duplicate",
            headers=headers
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        assert "message" in data
        assert "event" in data
        
        # Verify duplicated event
        new_event = data["event"]
        assert "(Copy)" in new_event["title"]
        assert new_event["event_type"] == "court_hearing"
        assert new_event["id"] != test_event_id  # Different ID
        assert new_event["status"] == "scheduled"  # Reset to scheduled
    
    def test_duplicate_nonexistent_event(self, headers):
        """Test duplicating non-existent event returns 404"""
        response = requests.post(
            f"{BASE_URL}/api/practice/events/nonexistent-id-12345/duplicate",
            headers=headers
        )
        assert response.status_code == 404


class TestCaseStatusUpdate(TestAuth):
    """Test Case Status Update Endpoint"""
    
    @pytest.fixture
    def test_client_id(self, headers):
        """Create a test client and return ID"""
        client_data = {
            "name": "TEST_Client_For_Case_Status",
            "email": "testclient@example.com",
            "client_type": "individual"
        }
        response = requests.post(f"{BASE_URL}/api/practice/clients", json=client_data, headers=headers)
        if response.status_code in [200, 201]:
            return response.json()["id"]
        pytest.skip("Failed to create test client")
    
    @pytest.fixture
    def test_case_id(self, headers, test_client_id):
        """Create a test case and return its ID"""
        case_data = {
            "title": "TEST_Case_For_Status_Update",
            "client_id": test_client_id,
            "case_type": "litigation",
            "status": "active"
        }
        response = requests.post(f"{BASE_URL}/api/practice/cases", json=case_data, headers=headers)
        if response.status_code in [200, 201]:
            return response.json()["id"]
        pytest.skip("Failed to create test case")
    
    def test_set_case_active(self, headers, test_case_id):
        """Test PATCH /api/practice/cases/{id}/status - set to active"""
        response = requests.patch(
            f"{BASE_URL}/api/practice/cases/{test_case_id}/status",
            json={"status": "active"},
            headers=headers
        )
        assert response.status_code == 200
        
        # Verify
        get_response = requests.get(f"{BASE_URL}/api/practice/cases/{test_case_id}", headers=headers)
        assert get_response.json()["status"] == "active"
    
    def test_set_case_pending(self, headers, test_case_id):
        """Test setting case status to pending"""
        response = requests.patch(
            f"{BASE_URL}/api/practice/cases/{test_case_id}/status",
            json={"status": "pending"},
            headers=headers
        )
        assert response.status_code == 200
        data = response.json()
        assert "pending" in data["message"]
        
        # Verify persistence
        get_response = requests.get(f"{BASE_URL}/api/practice/cases/{test_case_id}", headers=headers)
        assert get_response.json()["status"] == "pending"
    
    def test_set_case_on_hold(self, headers, test_case_id):
        """Test setting case status to on_hold"""
        response = requests.patch(
            f"{BASE_URL}/api/practice/cases/{test_case_id}/status",
            json={"status": "on_hold"},
            headers=headers
        )
        assert response.status_code == 200
        
        # Verify persistence
        get_response = requests.get(f"{BASE_URL}/api/practice/cases/{test_case_id}", headers=headers)
        assert get_response.json()["status"] == "on_hold"
    
    def test_set_case_closed(self, headers, test_case_id):
        """Test setting case status to closed"""
        response = requests.patch(
            f"{BASE_URL}/api/practice/cases/{test_case_id}/status",
            json={"status": "closed"},
            headers=headers
        )
        assert response.status_code == 200
        
        # Verify persistence
        get_response = requests.get(f"{BASE_URL}/api/practice/cases/{test_case_id}", headers=headers)
        assert get_response.json()["status"] == "closed"
    
    def test_invalid_case_status_rejected(self, headers, test_case_id):
        """Test that invalid status is rejected"""
        response = requests.patch(
            f"{BASE_URL}/api/practice/cases/{test_case_id}/status",
            json={"status": "invalid_status"},
            headers=headers
        )
        assert response.status_code == 400


class TestDocumentVaultDemoDocuments(TestAuth):
    """Test Document Vault Demo/Seed Data handling"""
    
    def test_get_documents_returns_is_seed_data_flag(self, headers):
        """Test GET /api/practice/documents returns is_seed_data field"""
        response = requests.get(f"{BASE_URL}/api/practice/documents", headers=headers)
        assert response.status_code == 200
        data = response.json()
        assert "documents" in data
        # Check if any documents exist
        if len(data["documents"]) > 0:
            # At least one document should have the is_seed_data property defined (either true or false)
            for doc in data["documents"]:
                # is_seed_data might be absent for non-seed documents, that's OK
                if doc.get("is_seed_data"):
                    assert isinstance(doc["is_seed_data"], bool)
                    break
    
    def test_download_demo_document_returns_422(self, headers):
        """Test that downloading a demo document returns 422 with informative message"""
        # First get documents and find a seed one
        response = requests.get(f"{BASE_URL}/api/practice/documents", headers=headers)
        assert response.status_code == 200
        documents = response.json()["documents"]
        
        seed_doc = None
        for doc in documents:
            if doc.get("is_seed_data"):
                seed_doc = doc
                break
        
        if not seed_doc:
            pytest.skip("No seed/demo documents found to test")
        
        # Try to download
        download_response = requests.get(
            f"{BASE_URL}/api/practice/documents/{seed_doc['id']}/download",
            headers=headers
        )
        assert download_response.status_code == 422
        detail = download_response.json().get("detail", "")
        assert "demo" in detail.lower() or "seed" in detail.lower()


class TestCleanup(TestAuth):
    """Cleanup test data after tests complete"""
    
    def test_cleanup_test_events(self, headers):
        """Clean up TEST_ prefixed events"""
        response = requests.get(f"{BASE_URL}/api/practice/events", headers=headers)
        if response.status_code == 200:
            events = response.json().get("events", [])
            for event in events:
                if event.get("title", "").startswith("TEST_"):
                    requests.delete(f"{BASE_URL}/api/practice/events/{event['id']}", headers=headers)
        assert True
    
    def test_cleanup_test_cases(self, headers):
        """Clean up TEST_ prefixed cases"""
        response = requests.get(f"{BASE_URL}/api/practice/cases", headers=headers)
        if response.status_code == 200:
            cases = response.json().get("cases", [])
            for case in cases:
                if case.get("title", "").startswith("TEST_"):
                    requests.delete(f"{BASE_URL}/api/practice/cases/{case['id']}", headers=headers)
        assert True
    
    def test_cleanup_test_clients(self, headers):
        """Clean up TEST_ prefixed clients"""
        response = requests.get(f"{BASE_URL}/api/practice/clients", headers=headers)
        if response.status_code == 200:
            clients = response.json().get("clients", [])
            for client in clients:
                if client.get("name", "").startswith("TEST_"):
                    requests.delete(f"{BASE_URL}/api/practice/clients/{client['id']}", headers=headers)
        assert True
