"""
Calendar Events API Testing Module
Tests for Practice Management Calendar/Events endpoints

Features tested:
- GET /api/practice/events - Get all events
- POST /api/practice/events - Create event
- GET /api/practice/events/{id} - Get specific event
- PUT /api/practice/events/{id} - Update event
- DELETE /api/practice/events/{id} - Delete event
- POST /api/practice/events/{id}/complete - Mark event complete with outcome
- POST /api/practice/events/{id}/cancel - Cancel event with reason
- POST /api/practice/events/{id}/reschedule - Reschedule event
- POST /api/practice/events/{id}/convert-to-task - Convert event to task
- PATCH /api/practice/events/{id}/move - Drag-drop move event
"""

import pytest
import requests
import os
from datetime import datetime, timedelta

# Get API URL from environment
BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
TEST_EMAIL = "test@tls.or.tz"
TEST_PASSWORD = "Test@12345678!"


class TestCalendarEvents:
    """Test suite for Calendar Events API"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        """Get authentication token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        assert response.status_code == 200, f"Login failed: {response.text}"
        data = response.json()
        return data.get("access_token")
    
    @pytest.fixture(scope="class")
    def headers(self, auth_token):
        """Headers with authentication"""
        return {
            "Authorization": f"Bearer {auth_token}",
            "Content-Type": "application/json"
        }
    
    @pytest.fixture(scope="class")
    def test_event_id(self, headers):
        """Create a test event for use in other tests"""
        tomorrow = (datetime.now() + timedelta(days=1)).strftime("%Y-%m-%dT10:00")
        tomorrow_end = (datetime.now() + timedelta(days=1)).strftime("%Y-%m-%dT11:00")
        
        event_data = {
            "title": "TEST_Event_Calendar_Testing",
            "event_type": "meeting",
            "start_datetime": tomorrow,
            "end_datetime": tomorrow_end,
            "location": "Test Location",
            "description": "Test event for calendar testing",
            "priority": "high"
        }
        
        response = requests.post(f"{BASE_URL}/api/practice/events", json=event_data, headers=headers)
        assert response.status_code == 200, f"Failed to create test event: {response.text}"
        data = response.json()
        yield data["id"]
        
        # Cleanup - delete the test event
        requests.delete(f"{BASE_URL}/api/practice/events/{data['id']}", headers=headers)
    
    # ===== GET EVENTS =====
    def test_get_events_list(self, headers):
        """Test GET /api/practice/events returns list of events"""
        response = requests.get(f"{BASE_URL}/api/practice/events", headers=headers)
        assert response.status_code == 200
        
        data = response.json()
        assert "events" in data
        assert "total" in data
        assert isinstance(data["events"], list)
        print(f"✓ GET events - Found {data['total']} events")
    
    # ===== CREATE EVENT =====
    def test_create_event_meeting(self, headers):
        """Test POST /api/practice/events - Create meeting event"""
        tomorrow = (datetime.now() + timedelta(days=2)).strftime("%Y-%m-%dT14:00")
        
        event_data = {
            "title": "TEST_Meeting_Client_Consultation",
            "event_type": "meeting",
            "start_datetime": tomorrow,
            "end_datetime": (datetime.now() + timedelta(days=2)).strftime("%Y-%m-%dT15:00"),
            "location": "Office",
            "description": "Client consultation meeting",
            "priority": "medium"
        }
        
        response = requests.post(f"{BASE_URL}/api/practice/events", json=event_data, headers=headers)
        assert response.status_code == 200
        
        data = response.json()
        assert data["title"] == "TEST_Meeting_Client_Consultation"
        assert data["event_type"] == "meeting"
        assert data["status"] == "scheduled"
        assert "id" in data
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/practice/events/{data['id']}", headers=headers)
        print(f"✓ Created meeting event with ID: {data['id']}")
    
    def test_create_event_court_hearing(self, headers):
        """Test creating court hearing event type"""
        next_week = (datetime.now() + timedelta(days=7)).strftime("%Y-%m-%dT09:00")
        
        event_data = {
            "title": "TEST_Court_Hearing_Case123",
            "event_type": "court_hearing",
            "start_datetime": next_week,
            "court": "High Court DSM",
            "location": "Court Room 5",
            "priority": "high"
        }
        
        response = requests.post(f"{BASE_URL}/api/practice/events", json=event_data, headers=headers)
        assert response.status_code == 200
        
        data = response.json()
        assert data["event_type"] == "court_hearing"
        assert data["court"] == "High Court DSM"
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/practice/events/{data['id']}", headers=headers)
        print(f"✓ Created court hearing event")
    
    def test_create_event_deadline(self, headers):
        """Test creating deadline event type"""
        in_3_days = (datetime.now() + timedelta(days=3)).strftime("%Y-%m-%dT17:00")
        
        event_data = {
            "title": "TEST_Deadline_Filing_Submission",
            "event_type": "deadline",
            "start_datetime": in_3_days,
            "description": "Submit court filing documents",
            "priority": "high"
        }
        
        response = requests.post(f"{BASE_URL}/api/practice/events", json=event_data, headers=headers)
        assert response.status_code == 200
        
        data = response.json()
        assert data["event_type"] == "deadline"
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/practice/events/{data['id']}", headers=headers)
        print(f"✓ Created deadline event")
    
    # ===== MARK COMPLETE =====
    def test_mark_event_complete(self, headers, test_event_id):
        """Test POST /api/practice/events/{id}/complete - Mark event as completed"""
        complete_data = {
            "outcome": "Meeting concluded successfully. Client agreed to terms."
        }
        
        response = requests.post(
            f"{BASE_URL}/api/practice/events/{test_event_id}/complete",
            json=complete_data,
            headers=headers
        )
        assert response.status_code == 200
        
        data = response.json()
        assert "message" in data
        assert "completed_at" in data
        
        # Verify the event is now marked as completed
        get_response = requests.get(f"{BASE_URL}/api/practice/events/{test_event_id}", headers=headers)
        event_data = get_response.json()
        assert event_data["status"] == "completed"
        assert event_data["outcome"] == "Meeting concluded successfully. Client agreed to terms."
        
        print(f"✓ Event marked as completed with outcome")
    
    # ===== CANCEL EVENT =====
    def test_cancel_event_with_reason(self, headers):
        """Test POST /api/practice/events/{id}/cancel - Cancel event with reason"""
        # Create an event to cancel
        tomorrow = (datetime.now() + timedelta(days=1)).strftime("%Y-%m-%dT15:00")
        event_data = {
            "title": "TEST_Event_To_Cancel",
            "event_type": "meeting",
            "start_datetime": tomorrow,
            "priority": "medium"
        }
        
        create_response = requests.post(f"{BASE_URL}/api/practice/events", json=event_data, headers=headers)
        assert create_response.status_code == 200
        event_id = create_response.json()["id"]
        
        # Cancel the event
        cancel_data = {
            "reason": "Client requested postponement due to illness"
        }
        
        response = requests.post(
            f"{BASE_URL}/api/practice/events/{event_id}/cancel",
            json=cancel_data,
            headers=headers
        )
        assert response.status_code == 200
        
        data = response.json()
        assert "message" in data
        
        # Verify the event is cancelled
        get_response = requests.get(f"{BASE_URL}/api/practice/events/{event_id}", headers=headers)
        event_data = get_response.json()
        assert event_data["status"] == "cancelled"
        assert event_data["cancel_reason"] == "Client requested postponement due to illness"
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/practice/events/{event_id}", headers=headers)
        print(f"✓ Event cancelled with reason")
    
    def test_cancel_event_requires_reason(self, headers):
        """Test that cancel requires a valid reason (min 5 characters)"""
        # Create an event
        tomorrow = (datetime.now() + timedelta(days=1)).strftime("%Y-%m-%dT16:00")
        event_data = {
            "title": "TEST_Event_Cancel_Validation",
            "event_type": "meeting",
            "start_datetime": tomorrow
        }
        
        create_response = requests.post(f"{BASE_URL}/api/practice/events", json=event_data, headers=headers)
        event_id = create_response.json()["id"]
        
        # Try to cancel with short reason
        cancel_data = {"reason": "No"}  # Too short
        
        response = requests.post(
            f"{BASE_URL}/api/practice/events/{event_id}/cancel",
            json=cancel_data,
            headers=headers
        )
        assert response.status_code == 400
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/practice/events/{event_id}", headers=headers)
        print(f"✓ Cancel validation - short reason rejected")
    
    # ===== RESCHEDULE EVENT =====
    def test_reschedule_event(self, headers):
        """Test POST /api/practice/events/{id}/reschedule - Reschedule event"""
        # Create an event to reschedule
        tomorrow = (datetime.now() + timedelta(days=1)).strftime("%Y-%m-%dT10:00")
        event_data = {
            "title": "TEST_Event_To_Reschedule",
            "event_type": "court_hearing",
            "start_datetime": tomorrow,
            "priority": "high"
        }
        
        create_response = requests.post(f"{BASE_URL}/api/practice/events", json=event_data, headers=headers)
        event_id = create_response.json()["id"]
        
        # Reschedule to next week
        new_date = (datetime.now() + timedelta(days=7)).strftime("%Y-%m-%dT14:00")
        new_end = (datetime.now() + timedelta(days=7)).strftime("%Y-%m-%dT15:00")
        
        reschedule_data = {
            "new_start_datetime": new_date,
            "new_end_datetime": new_end,
            "reason": "Judge availability conflict"
        }
        
        response = requests.post(
            f"{BASE_URL}/api/practice/events/{event_id}/reschedule",
            json=reschedule_data,
            headers=headers
        )
        assert response.status_code == 200
        
        data = response.json()
        assert "original" in data
        assert "new" in data
        
        # Verify the event was rescheduled
        get_response = requests.get(f"{BASE_URL}/api/practice/events/{event_id}", headers=headers)
        event_data = get_response.json()
        assert event_data["status"] == "rescheduled"
        assert event_data["start_datetime"] == new_date
        assert event_data["reschedule_reason"] == "Judge availability conflict"
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/practice/events/{event_id}", headers=headers)
        print(f"✓ Event rescheduled successfully")
    
    # ===== CONVERT TO TASK =====
    def test_convert_event_to_task(self, headers):
        """Test POST /api/practice/events/{id}/convert-to-task - Create follow-up task"""
        # Create an event
        tomorrow = (datetime.now() + timedelta(days=1)).strftime("%Y-%m-%dT11:00")
        event_data = {
            "title": "TEST_Event_Convert_To_Task",
            "event_type": "meeting",
            "start_datetime": tomorrow
        }
        
        create_response = requests.post(f"{BASE_URL}/api/practice/events", json=event_data, headers=headers)
        event_id = create_response.json()["id"]
        
        # Convert to task
        task_data = {
            "task_title": "Follow up on meeting outcomes",
            "due_date": (datetime.now() + timedelta(days=3)).strftime("%Y-%m-%d"),
            "priority": "high"
        }
        
        response = requests.post(
            f"{BASE_URL}/api/practice/events/{event_id}/convert-to-task",
            json=task_data,
            headers=headers
        )
        assert response.status_code == 200
        
        data = response.json()
        assert "task" in data
        assert data["task"]["title"] == "Follow up on meeting outcomes"
        assert data["task"]["priority"] == "high"
        assert data["task"]["source_event_id"] == event_id
        
        # Cleanup - delete task and event
        task_id = data["task"]["id"]
        requests.delete(f"{BASE_URL}/api/practice/tasks/{task_id}", headers=headers)
        requests.delete(f"{BASE_URL}/api/practice/events/{event_id}", headers=headers)
        print(f"✓ Event converted to follow-up task")
    
    # ===== DRAG-DROP MOVE =====
    def test_move_event_drag_drop(self, headers):
        """Test PATCH /api/practice/events/{id}/move - Drag-drop event move"""
        # Create an event
        tomorrow = (datetime.now() + timedelta(days=1)).strftime("%Y-%m-%dT09:00")
        event_data = {
            "title": "TEST_Event_Drag_Drop",
            "event_type": "appointment",
            "start_datetime": tomorrow
        }
        
        create_response = requests.post(f"{BASE_URL}/api/practice/events", json=event_data, headers=headers)
        event_id = create_response.json()["id"]
        
        # Move to a different time
        new_start = (datetime.now() + timedelta(days=2)).strftime("%Y-%m-%dT14:00:00")
        new_end = (datetime.now() + timedelta(days=2)).strftime("%Y-%m-%dT15:00:00")
        
        response = requests.patch(
            f"{BASE_URL}/api/practice/events/{event_id}/move?new_start={new_start}&new_end={new_end}",
            json={},
            headers=headers
        )
        assert response.status_code == 200
        
        data = response.json()
        assert "message" in data
        assert data["new_start"] == new_start
        
        # Verify the event was moved
        get_response = requests.get(f"{BASE_URL}/api/practice/events/{event_id}", headers=headers)
        event_data = get_response.json()
        assert event_data["start_datetime"] == new_start
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/practice/events/{event_id}", headers=headers)
        print(f"✓ Event moved via drag-drop")
    
    # ===== UPDATE AND DELETE =====
    def test_update_event(self, headers):
        """Test PUT /api/practice/events/{id} - Update event details"""
        # Create an event
        tomorrow = (datetime.now() + timedelta(days=1)).strftime("%Y-%m-%dT13:00")
        event_data = {
            "title": "TEST_Event_Update",
            "event_type": "meeting",
            "start_datetime": tomorrow
        }
        
        create_response = requests.post(f"{BASE_URL}/api/practice/events", json=event_data, headers=headers)
        event_id = create_response.json()["id"]
        
        # Update the event
        update_data = {
            "title": "TEST_Event_Updated_Title",
            "location": "Conference Room A",
            "priority": "high",
            "description": "Updated description"
        }
        
        response = requests.put(
            f"{BASE_URL}/api/practice/events/{event_id}",
            json=update_data,
            headers=headers
        )
        assert response.status_code == 200
        
        # Verify the update
        get_response = requests.get(f"{BASE_URL}/api/practice/events/{event_id}", headers=headers)
        event_data = get_response.json()
        assert event_data["title"] == "TEST_Event_Updated_Title"
        assert event_data["location"] == "Conference Room A"
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/practice/events/{event_id}", headers=headers)
        print(f"✓ Event updated successfully")
    
    def test_delete_event(self, headers):
        """Test DELETE /api/practice/events/{id} - Delete event"""
        # Create an event to delete
        tomorrow = (datetime.now() + timedelta(days=1)).strftime("%Y-%m-%dT17:00")
        event_data = {
            "title": "TEST_Event_To_Delete",
            "event_type": "reminder",
            "start_datetime": tomorrow
        }
        
        create_response = requests.post(f"{BASE_URL}/api/practice/events", json=event_data, headers=headers)
        event_id = create_response.json()["id"]
        
        # Delete the event
        response = requests.delete(f"{BASE_URL}/api/practice/events/{event_id}", headers=headers)
        assert response.status_code == 200
        
        # Verify deletion
        get_response = requests.get(f"{BASE_URL}/api/practice/events/{event_id}", headers=headers)
        assert get_response.status_code == 404
        
        print(f"✓ Event deleted successfully")
    
    # ===== EVENT TYPE COLORS VALIDATION =====
    def test_event_types_created_correctly(self, headers):
        """Test that all event types are created with correct properties"""
        event_types = ["meeting", "court_hearing", "deadline", "reminder", "appointment"]
        created_events = []
        
        for event_type in event_types:
            tomorrow = (datetime.now() + timedelta(days=1)).strftime("%Y-%m-%dT10:00")
            event_data = {
                "title": f"TEST_Event_Type_{event_type}",
                "event_type": event_type,
                "start_datetime": tomorrow,
                "priority": "medium"
            }
            
            response = requests.post(f"{BASE_URL}/api/practice/events", json=event_data, headers=headers)
            assert response.status_code == 200
            
            data = response.json()
            assert data["event_type"] == event_type
            assert data["status"] == "scheduled"
            created_events.append(data["id"])
        
        # Cleanup
        for event_id in created_events:
            requests.delete(f"{BASE_URL}/api/practice/events/{event_id}", headers=headers)
        
        print(f"✓ All event types ({len(event_types)}) created correctly")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
