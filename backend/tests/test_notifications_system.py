"""
Test Suite for Notifications System
Tests: Notification bell, preferences, CRUD operations
"""

import pytest
import requests
import os
import time

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://advocate-refactor.preview.emergentagent.com')

# Global session data - login once
_session_data = {}


def get_auth_session():
    """Get or create auth session (login only once)"""
    global _session_data
    
    if not _session_data:
        # Login once
        login_response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={
                "email": "test@tls.or.tz",
                "password": "Test@12345678!"
            }
        )
        
        if login_response.status_code != 200:
            pytest.skip(f"Login failed: {login_response.text}")
        
        data = login_response.json()
        _session_data = {
            "token": data["access_token"],
            "csrf_token": data.get("csrf_token", ""),
            "headers": {
                "Authorization": f"Bearer {data['access_token']}",
                "Content-Type": "application/json"
            },
            "csrf_headers": {
                "Authorization": f"Bearer {data['access_token']}",
                "Content-Type": "application/json",
                "X-CSRF-Token": data.get("csrf_token", "")
            }
        }
    
    return _session_data


class TestNotificationsBackend:
    """Test notification API endpoints"""
    
    # ===== GET /api/notifications =====
    def test_get_notifications_success(self):
        """Test GET /api/notifications returns notifications list"""
        session = get_auth_session()
        response = requests.get(
            f"{BASE_URL}/api/notifications?limit=10",
            headers=session["headers"]
        )
        assert response.status_code == 200
        
        data = response.json()
        assert "notifications" in data
        assert "unread_count" in data
        assert isinstance(data["notifications"], list)
        assert isinstance(data["unread_count"], int)
    
    def test_get_notifications_with_limit(self):
        """Test GET /api/notifications respects limit parameter"""
        session = get_auth_session()
        response = requests.get(
            f"{BASE_URL}/api/notifications?limit=5",
            headers=session["headers"]
        )
        assert response.status_code == 200
        
        data = response.json()
        assert len(data["notifications"]) <= 5
    
    def test_get_notifications_unread_only(self):
        """Test GET /api/notifications with unread_only filter"""
        session = get_auth_session()
        response = requests.get(
            f"{BASE_URL}/api/notifications?unread_only=true",
            headers=session["headers"]
        )
        assert response.status_code == 200
        
        data = response.json()
        assert "notifications" in data
    
    def test_get_notifications_unauthorized(self):
        """Test GET /api/notifications without auth returns 401"""
        response = requests.get(f"{BASE_URL}/api/notifications")
        assert response.status_code == 401
    
    # ===== GET /api/notifications/unread-count =====
    def test_get_unread_count_success(self):
        """Test GET /api/notifications/unread-count returns count"""
        session = get_auth_session()
        response = requests.get(
            f"{BASE_URL}/api/notifications/unread-count",
            headers=session["headers"]
        )
        assert response.status_code == 200
        
        data = response.json()
        assert "unread_count" in data
        assert isinstance(data["unread_count"], int)
        assert data["unread_count"] >= 0
    
    def test_get_unread_count_unauthorized(self):
        """Test GET /api/notifications/unread-count without auth returns 401"""
        response = requests.get(f"{BASE_URL}/api/notifications/unread-count")
        assert response.status_code == 401
    
    # ===== GET /api/notifications/reminder-preferences =====
    def test_get_reminder_preferences_success(self):
        """Test GET /api/notifications/reminder-preferences returns user preferences"""
        session = get_auth_session()
        response = requests.get(
            f"{BASE_URL}/api/notifications/reminder-preferences",
            headers=session["headers"]
        )
        assert response.status_code == 200
        
        data = response.json()
        assert "preferences" in data
        
        prefs = data["preferences"]
        # Check all expected preference fields exist
        expected_fields = [
            "in_app_reminders", "in_app_calendar", "in_app_tasks", "in_app_system",
            "email_reminders", "email_calendar", "email_tasks", "email_system",
            "reminder_times"
        ]
        for field in expected_fields:
            assert field in prefs, f"Missing field: {field}"
        
        # Validate types
        assert isinstance(prefs["in_app_reminders"], bool)
        assert isinstance(prefs["email_reminders"], bool)
        assert isinstance(prefs["reminder_times"], list)
    
    def test_get_reminder_preferences_unauthorized(self):
        """Test GET /api/notifications/reminder-preferences without auth returns 401"""
        response = requests.get(f"{BASE_URL}/api/notifications/reminder-preferences")
        assert response.status_code == 401
    
    # ===== PUT /api/notifications/reminder-preferences =====
    def test_update_reminder_preferences_success(self):
        """Test PUT /api/notifications/reminder-preferences updates preferences"""
        session = get_auth_session()
        
        # Get current preferences
        get_response = requests.get(
            f"{BASE_URL}/api/notifications/reminder-preferences",
            headers=session["headers"]
        )
        original_prefs = get_response.json()["preferences"]
        
        # Update preferences
        new_prefs = {
            "in_app_reminders": not original_prefs["in_app_reminders"],
            "email_reminders": not original_prefs["email_reminders"],
            "reminder_times": [15, 30]  # Change reminder times
        }
        
        response = requests.put(
            f"{BASE_URL}/api/notifications/reminder-preferences",
            headers=session["csrf_headers"],
            json=new_prefs
        )
        assert response.status_code == 200
        
        data = response.json()
        assert "message" in data
        assert "preferences" in data
        assert data["preferences"]["in_app_reminders"] == new_prefs["in_app_reminders"]
        assert data["preferences"]["email_reminders"] == new_prefs["email_reminders"]
        assert data["preferences"]["reminder_times"] == new_prefs["reminder_times"]
        
        # Verify persistence with GET
        verify_response = requests.get(
            f"{BASE_URL}/api/notifications/reminder-preferences",
            headers=session["headers"]
        )
        assert verify_response.status_code == 200
        verify_data = verify_response.json()
        assert verify_data["preferences"]["in_app_reminders"] == new_prefs["in_app_reminders"]
        
        # Restore original preferences
        requests.put(
            f"{BASE_URL}/api/notifications/reminder-preferences",
            headers=session["csrf_headers"],
            json={
                "in_app_reminders": original_prefs["in_app_reminders"],
                "email_reminders": original_prefs["email_reminders"],
                "reminder_times": original_prefs["reminder_times"]
            }
        )
    
    def test_update_reminder_preferences_partial_update(self):
        """Test PUT /api/notifications/reminder-preferences with partial data"""
        session = get_auth_session()
        
        response = requests.put(
            f"{BASE_URL}/api/notifications/reminder-preferences",
            headers=session["csrf_headers"],
            json={"in_app_tasks": False}  # Only update one field
        )
        assert response.status_code == 200
        
        data = response.json()
        assert data["preferences"]["in_app_tasks"] == False
        
        # Reset
        requests.put(
            f"{BASE_URL}/api/notifications/reminder-preferences",
            headers=session["csrf_headers"],
            json={"in_app_tasks": True}
        )
    
    def test_update_reminder_preferences_requires_csrf(self):
        """Test PUT /api/notifications/reminder-preferences requires CSRF token"""
        session = get_auth_session()
        
        response = requests.put(
            f"{BASE_URL}/api/notifications/reminder-preferences",
            headers=session["headers"],  # Without CSRF token
            json={"in_app_reminders": False}
        )
        assert response.status_code == 403
        assert "CSRF" in response.text


class TestNotificationsReminderTiming:
    """Test reminder timing options (15min, 1hr, 1day)"""
    
    def test_set_15min_reminder(self):
        """Test setting 15 minute reminder (15 minutes = 15)"""
        session = get_auth_session()
        
        response = requests.put(
            f"{BASE_URL}/api/notifications/reminder-preferences",
            headers=session["csrf_headers"],
            json={"reminder_times": [15]}
        )
        assert response.status_code == 200
        assert 15 in response.json()["preferences"]["reminder_times"]
    
    def test_set_1hr_reminder(self):
        """Test setting 1 hour reminder (60 minutes)"""
        session = get_auth_session()
        
        response = requests.put(
            f"{BASE_URL}/api/notifications/reminder-preferences",
            headers=session["csrf_headers"],
            json={"reminder_times": [60]}
        )
        assert response.status_code == 200
        assert 60 in response.json()["preferences"]["reminder_times"]
    
    def test_set_1day_reminder(self):
        """Test setting 1 day reminder (1440 minutes)"""
        session = get_auth_session()
        
        response = requests.put(
            f"{BASE_URL}/api/notifications/reminder-preferences",
            headers=session["csrf_headers"],
            json={"reminder_times": [1440]}
        )
        assert response.status_code == 200
        assert 1440 in response.json()["preferences"]["reminder_times"]
    
    def test_set_multiple_reminders(self):
        """Test setting multiple reminder times"""
        session = get_auth_session()
        
        reminder_times = [15, 60, 1440]  # 15min, 1hr, 1day
        response = requests.put(
            f"{BASE_URL}/api/notifications/reminder-preferences",
            headers=session["csrf_headers"],
            json={"reminder_times": reminder_times}
        )
        assert response.status_code == 200
        prefs = response.json()["preferences"]
        assert prefs["reminder_times"] == reminder_times


class TestPracticeManagementTabs:
    """Test Practice Management tabs still work after refactoring"""
    
    def test_dashboard_stats(self):
        """Test Dashboard tab - GET /api/advocate/stats"""
        session = get_auth_session()
        
        # Use /api/advocate/stats instead of /api/practice/dashboard/stats
        response = requests.get(
            f"{BASE_URL}/api/advocate/stats",
            headers=session["headers"]
        )
        assert response.status_code == 200
        data = response.json()
        # Check we get stats back
        assert "stamp_count" in data or "profile_completion" in data
    
    def test_clients_list(self):
        """Test Clients tab - GET /api/practice/clients"""
        session = get_auth_session()
        
        response = requests.get(
            f"{BASE_URL}/api/practice/clients",
            headers=session["headers"]
        )
        assert response.status_code == 200
        data = response.json()
        # Response is a dict with 'clients' array
        assert "clients" in data or isinstance(data, list)
    
    def test_cases_list(self):
        """Test Cases tab - GET /api/practice/cases"""
        session = get_auth_session()
        
        response = requests.get(
            f"{BASE_URL}/api/practice/cases",
            headers=session["headers"]
        )
        assert response.status_code == 200
        data = response.json()
        # Response is a dict with 'cases' array
        assert "cases" in data or isinstance(data, list)
    
    def test_documents_list(self):
        """Test Documents tab - GET /api/practice/documents"""
        session = get_auth_session()
        
        response = requests.get(
            f"{BASE_URL}/api/practice/documents",
            headers=session["headers"]
        )
        assert response.status_code == 200
    
    def test_calendar_events(self):
        """Test Calendar tab - GET /api/practice/events"""
        session = get_auth_session()
        
        response = requests.get(
            f"{BASE_URL}/api/practice/events",
            headers=session["headers"]
        )
        assert response.status_code == 200
    
    def test_tasks_list(self):
        """Test Tasks tab - GET /api/practice/tasks"""
        session = get_auth_session()
        
        response = requests.get(
            f"{BASE_URL}/api/practice/tasks",
            headers=session["headers"]
        )
        assert response.status_code == 200


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
