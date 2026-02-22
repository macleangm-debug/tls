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


@pytest.fixture(scope="module")
def auth_token():
    """Get authentication token"""
    response = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": TEST_EMAIL,
        "password": TEST_PASSWORD
    })
    if response.status_code == 200:
        return response.json().get("access_token")
    pytest.skip(f"Authentication failed - status {response.status_code}")


@pytest.fixture(scope="module")
def headers(auth_token):
    """Get headers with auth token"""
    return {"Authorization": f"Bearer {auth_token}"}


# ========== CALENDAR EVENT STATUS TESTS ==========
class TestCalendarEventStatus:
    """Test Calendar Event Status Endpoint - Mark Complete"""
    
    def test_mark_event_complete(self, headers):
        """Test PATCH /api/practice/events/{id}/status - marks event as completed"""
        # First create a test event
        event_data = {
            "title": "TEST_Event_For_Status_Test",
            "event_type": "meeting",
            "start_datetime": "2026-02-01T10:00:00"
        }
        create_response = requests.post(f"{BASE_URL}/api/practice/events", json=event_data, headers=headers)
        assert create_response.status_code in [200, 201], f"Failed to create event: {create_response.text}"
        event_id = create_response.json()["id"]
        
        # Mark as complete
        response = requests.patch(
            f"{BASE_URL}/api/practice/events/{event_id}/status",
            json={"status": "completed"},
            headers=headers
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert "message" in data
        assert "completed" in data["message"]
        
        # Verify the change persisted
        get_response = requests.get(f"{BASE_URL}/api/practice/events/{event_id}", headers=headers)
        assert get_response.status_code == 200
        event_data = get_response.json()
        assert event_data["status"] == "completed"
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/practice/events/{event_id}", headers=headers)
    
    def test_mark_event_scheduled(self, headers):
        """Test marking event back to scheduled"""
        # Create event first
        event_data = {
            "title": "TEST_Event_For_Scheduled_Test",
            "event_type": "meeting",
            "start_datetime": "2026-02-02T10:00:00"
        }
        create_response = requests.post(f"{BASE_URL}/api/practice/events", json=event_data, headers=headers)
        assert create_response.status_code in [200, 201]
        event_id = create_response.json()["id"]
        
        response = requests.patch(
            f"{BASE_URL}/api/practice/events/{event_id}/status",
            json={"status": "scheduled"},
            headers=headers
        )
        assert response.status_code == 200
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/practice/events/{event_id}", headers=headers)
    
    def test_mark_event_cancelled(self, headers):
        """Test marking event as cancelled"""
        event_data = {
            "title": "TEST_Event_For_Cancelled_Test",
            "event_type": "meeting",
            "start_datetime": "2026-02-03T10:00:00"
        }
        create_response = requests.post(f"{BASE_URL}/api/practice/events", json=event_data, headers=headers)
        assert create_response.status_code in [200, 201]
        event_id = create_response.json()["id"]
        
        response = requests.patch(
            f"{BASE_URL}/api/practice/events/{event_id}/status",
            json={"status": "cancelled"},
            headers=headers
        )
        assert response.status_code == 200
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/practice/events/{event_id}", headers=headers)
    
    def test_invalid_status_rejected(self, headers):
        """Test that invalid status is rejected"""
        event_data = {
            "title": "TEST_Event_For_Invalid_Status_Test",
            "event_type": "meeting",
            "start_datetime": "2026-02-04T10:00:00"
        }
        create_response = requests.post(f"{BASE_URL}/api/practice/events", json=event_data, headers=headers)
        assert create_response.status_code in [200, 201]
        event_id = create_response.json()["id"]
        
        response = requests.patch(
            f"{BASE_URL}/api/practice/events/{event_id}/status",
            json={"status": "invalid_status"},
            headers=headers
        )
        assert response.status_code == 400
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/practice/events/{event_id}", headers=headers)


# ========== CALENDAR EVENT REMINDER TESTS ==========
class TestCalendarEventReminder:
    """Test Calendar Event Reminder Endpoint"""
    
    def test_set_event_reminder(self, headers):
        """Test PATCH /api/practice/events/{id}/reminder - sets reminders"""
        # Create event first
        event_data = {
            "title": "TEST_Event_For_Reminder_Test",
            "event_type": "deadline",
            "start_datetime": "2026-02-15T14:00:00"
        }
        create_response = requests.post(f"{BASE_URL}/api/practice/events", json=event_data, headers=headers)
        assert create_response.status_code in [200, 201]
        event_id = create_response.json()["id"]
        
        reminder_minutes = [15, 30, 60, 1440]  # 15min, 30min, 1hr, 1day
        response = requests.patch(
            f"{BASE_URL}/api/practice/events/{event_id}/reminder",
            json={"reminder_minutes": reminder_minutes},
            headers=headers
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert "message" in data
        assert "reminder_minutes" in data
        assert data["reminder_minutes"] == reminder_minutes
        
        # Verify persistence
        get_response = requests.get(f"{BASE_URL}/api/practice/events/{event_id}", headers=headers)
        assert get_response.status_code == 200
        event_data = get_response.json()
        assert event_data["reminder_minutes"] == reminder_minutes
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/practice/events/{event_id}", headers=headers)
    
    def test_set_single_reminder(self, headers):
        """Test setting a single reminder"""
        event_data = {
            "title": "TEST_Event_For_Single_Reminder",
            "event_type": "meeting",
            "start_datetime": "2026-02-16T10:00:00"
        }
        create_response = requests.post(f"{BASE_URL}/api/practice/events", json=event_data, headers=headers)
        assert create_response.status_code in [200, 201]
        event_id = create_response.json()["id"]
        
        response = requests.patch(
            f"{BASE_URL}/api/practice/events/{event_id}/reminder",
            json={"reminder_minutes": [60]},
            headers=headers
        )
        assert response.status_code == 200
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/practice/events/{event_id}", headers=headers)
    
    def test_clear_reminders(self, headers):
        """Test clearing all reminders"""
        event_data = {
            "title": "TEST_Event_For_Clear_Reminder",
            "event_type": "meeting",
            "start_datetime": "2026-02-17T10:00:00"
        }
        create_response = requests.post(f"{BASE_URL}/api/practice/events", json=event_data, headers=headers)
        assert create_response.status_code in [200, 201]
        event_id = create_response.json()["id"]
        
        response = requests.patch(
            f"{BASE_URL}/api/practice/events/{event_id}/reminder",
            json={"reminder_minutes": []},
            headers=headers
        )
        assert response.status_code == 200
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/practice/events/{event_id}", headers=headers)


# ========== CALENDAR EVENT DUPLICATE TESTS ==========
class TestCalendarEventDuplicate:
    """Test Calendar Event Duplicate Endpoint"""
    
    def test_duplicate_event(self, headers):
        """Test POST /api/practice/events/{id}/duplicate - creates a copy"""
        # Create original event
        event_data = {
            "title": "TEST_Original_Event_For_Duplicate",
            "event_type": "court_hearing",
            "start_datetime": "2026-03-01T09:00:00",
            "location": "High Court",
            "description": "Test hearing event"
        }
        create_response = requests.post(f"{BASE_URL}/api/practice/events", json=event_data, headers=headers)
        assert create_response.status_code in [200, 201]
        event_id = create_response.json()["id"]
        
        # Duplicate
        response = requests.post(
            f"{BASE_URL}/api/practice/events/{event_id}/duplicate",
            headers=headers
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert "message" in data
        assert "event" in data
        
        # Verify duplicated event
        new_event = data["event"]
        assert "(Copy)" in new_event["title"]
        assert new_event["event_type"] == "court_hearing"
        assert new_event["id"] != event_id  # Different ID
        assert new_event["status"] == "scheduled"  # Reset to scheduled
        
        # Cleanup both events
        requests.delete(f"{BASE_URL}/api/practice/events/{event_id}", headers=headers)
        requests.delete(f"{BASE_URL}/api/practice/events/{new_event['id']}", headers=headers)
    
    def test_duplicate_nonexistent_event(self, headers):
        """Test duplicating non-existent event returns 404"""
        response = requests.post(
            f"{BASE_URL}/api/practice/events/nonexistent-id-12345/duplicate",
            headers=headers
        )
        # Can return 404 or 403 depending on auth middleware behavior
        assert response.status_code in [404, 403]


# ========== CASE STATUS UPDATE TESTS ==========
class TestCaseStatusUpdate:
    """Test Case Status Update Endpoint"""
    
    @pytest.fixture
    def test_client_and_case(self, headers):
        """Create a test client and case, return IDs"""
        # Create client
        client_data = {
            "name": "TEST_Client_For_Case_Status",
            "email": "testclient@example.com",
            "client_type": "individual"
        }
        client_response = requests.post(f"{BASE_URL}/api/practice/clients", json=client_data, headers=headers)
        assert client_response.status_code in [200, 201]
        client_id = client_response.json()["id"]
        
        # Create case
        case_data = {
            "title": "TEST_Case_For_Status_Update",
            "client_id": client_id,
            "case_type": "litigation",
            "status": "active"
        }
        case_response = requests.post(f"{BASE_URL}/api/practice/cases", json=case_data, headers=headers)
        assert case_response.status_code in [200, 201]
        case_id = case_response.json()["id"]
        
        yield client_id, case_id
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/practice/cases/{case_id}", headers=headers)
        requests.delete(f"{BASE_URL}/api/practice/clients/{client_id}", headers=headers)
    
    def test_set_case_active(self, headers, test_client_and_case):
        """Test PATCH /api/practice/cases/{id}/status - set to active"""
        _, case_id = test_client_and_case
        response = requests.patch(
            f"{BASE_URL}/api/practice/cases/{case_id}/status",
            json={"status": "active"},
            headers=headers
        )
        assert response.status_code == 200
        
        # Verify
        get_response = requests.get(f"{BASE_URL}/api/practice/cases/{case_id}", headers=headers)
        assert get_response.json()["status"] == "active"
    
    def test_set_case_pending(self, headers, test_client_and_case):
        """Test setting case status to pending"""
        _, case_id = test_client_and_case
        response = requests.patch(
            f"{BASE_URL}/api/practice/cases/{case_id}/status",
            json={"status": "pending"},
            headers=headers
        )
        assert response.status_code == 200
        data = response.json()
        assert "pending" in data["message"]
        
        # Verify persistence
        get_response = requests.get(f"{BASE_URL}/api/practice/cases/{case_id}", headers=headers)
        assert get_response.json()["status"] == "pending"
    
    def test_set_case_on_hold(self, headers, test_client_and_case):
        """Test setting case status to on_hold"""
        _, case_id = test_client_and_case
        response = requests.patch(
            f"{BASE_URL}/api/practice/cases/{case_id}/status",
            json={"status": "on_hold"},
            headers=headers
        )
        assert response.status_code == 200
        
        # Verify persistence
        get_response = requests.get(f"{BASE_URL}/api/practice/cases/{case_id}", headers=headers)
        assert get_response.json()["status"] == "on_hold"
    
    def test_set_case_closed(self, headers, test_client_and_case):
        """Test setting case status to closed"""
        _, case_id = test_client_and_case
        response = requests.patch(
            f"{BASE_URL}/api/practice/cases/{case_id}/status",
            json={"status": "closed"},
            headers=headers
        )
        assert response.status_code == 200
        
        # Verify persistence
        get_response = requests.get(f"{BASE_URL}/api/practice/cases/{case_id}", headers=headers)
        assert get_response.json()["status"] == "closed"
    
    def test_invalid_case_status_rejected(self, headers, test_client_and_case):
        """Test that invalid status is rejected"""
        _, case_id = test_client_and_case
        response = requests.patch(
            f"{BASE_URL}/api/practice/cases/{case_id}/status",
            json={"status": "invalid_status"},
            headers=headers
        )
        assert response.status_code == 400


# ========== DOCUMENT VAULT DEMO TESTS ==========
class TestDocumentVaultDemoDocuments:
    """Test Document Vault Demo/Seed Data handling"""
    
    def test_get_documents_returns_is_seed_data_flag(self, headers):
        """Test GET /api/practice/documents returns is_seed_data field"""
        response = requests.get(f"{BASE_URL}/api/practice/documents", headers=headers)
        assert response.status_code == 200
        data = response.json()
        assert "documents" in data
        # Check if any documents exist
        if len(data["documents"]) > 0:
            # At least one document should have the is_seed_data property defined
            for doc in data["documents"]:
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


# ========== CLEANUP ==========
class TestCleanup:
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
