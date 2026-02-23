"""
Test Suite for Notifications System
Tests: Notification bell, preferences, CRUD operations
"""

import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://advocate-refactor.preview.emergentagent.com')


class TestNotificationsBackend:
    """Test notification API endpoints"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Login and get tokens for authenticated requests"""
        login_response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={
                "email": "test@tls.or.tz",
                "password": "Test@12345678!"
            }
        )
        assert login_response.status_code == 200, f"Login failed: {login_response.text}"
        
        data = login_response.json()
        self.token = data["access_token"]
        self.csrf_token = data.get("csrf_token", "")
        self.headers = {
            "Authorization": f"Bearer {self.token}",
            "Content-Type": "application/json"
        }
        self.csrf_headers = {
            **self.headers,
            "X-CSRF-Token": self.csrf_token
        }
    
    # ===== GET /api/notifications =====
    def test_get_notifications_success(self):
        """Test GET /api/notifications returns notifications list"""
        response = requests.get(
            f"{BASE_URL}/api/notifications?limit=10",
            headers=self.headers
        )
        assert response.status_code == 200
        
        data = response.json()
        assert "notifications" in data
        assert "unread_count" in data
        assert isinstance(data["notifications"], list)
        assert isinstance(data["unread_count"], int)
    
    def test_get_notifications_with_limit(self):
        """Test GET /api/notifications respects limit parameter"""
        response = requests.get(
            f"{BASE_URL}/api/notifications?limit=5",
            headers=self.headers
        )
        assert response.status_code == 200
        
        data = response.json()
        assert len(data["notifications"]) <= 5
    
    def test_get_notifications_unread_only(self):
        """Test GET /api/notifications with unread_only filter"""
        response = requests.get(
            f"{BASE_URL}/api/notifications?unread_only=true",
            headers=self.headers
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
        response = requests.get(
            f"{BASE_URL}/api/notifications/unread-count",
            headers=self.headers
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
        response = requests.get(
            f"{BASE_URL}/api/notifications/reminder-preferences",
            headers=self.headers
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
        # Get current preferences
        get_response = requests.get(
            f"{BASE_URL}/api/notifications/reminder-preferences",
            headers=self.headers
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
            headers=self.csrf_headers,
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
            headers=self.headers
        )
        assert verify_response.status_code == 200
        verify_data = verify_response.json()
        assert verify_data["preferences"]["in_app_reminders"] == new_prefs["in_app_reminders"]
        
        # Restore original preferences
        requests.put(
            f"{BASE_URL}/api/notifications/reminder-preferences",
            headers=self.csrf_headers,
            json={
                "in_app_reminders": original_prefs["in_app_reminders"],
                "email_reminders": original_prefs["email_reminders"],
                "reminder_times": original_prefs["reminder_times"]
            }
        )
    
    def test_update_reminder_preferences_partial_update(self):
        """Test PUT /api/notifications/reminder-preferences with partial data"""
        response = requests.put(
            f"{BASE_URL}/api/notifications/reminder-preferences",
            headers=self.csrf_headers,
            json={"in_app_tasks": False}  # Only update one field
        )
        assert response.status_code == 200
        
        data = response.json()
        assert data["preferences"]["in_app_tasks"] == False
        
        # Reset
        requests.put(
            f"{BASE_URL}/api/notifications/reminder-preferences",
            headers=self.csrf_headers,
            json={"in_app_tasks": True}
        )
    
    def test_update_reminder_preferences_requires_csrf(self):
        """Test PUT /api/notifications/reminder-preferences requires CSRF token"""
        response = requests.put(
            f"{BASE_URL}/api/notifications/reminder-preferences",
            headers=self.headers,  # Without CSRF token
            json={"in_app_reminders": False}
        )
        assert response.status_code == 403
        assert "CSRF" in response.text
    
    def test_update_reminder_preferences_unauthorized(self):
        """Test PUT /api/notifications/reminder-preferences without auth returns 401"""
        response = requests.put(
            f"{BASE_URL}/api/notifications/reminder-preferences",
            json={"in_app_reminders": False}
        )
        assert response.status_code == 401


class TestNotificationsReminderTiming:
    """Test reminder timing options (15min, 1hr, 1day)"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Login and get tokens"""
        login_response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={
                "email": "test@tls.or.tz",
                "password": "Test@12345678!"
            }
        )
        data = login_response.json()
        self.token = data["access_token"]
        self.csrf_token = data.get("csrf_token", "")
        self.headers = {
            "Authorization": f"Bearer {self.token}",
            "Content-Type": "application/json",
            "X-CSRF-Token": self.csrf_token
        }
    
    def test_set_15min_reminder(self):
        """Test setting 15 minute reminder (15 minutes = 15)"""
        response = requests.put(
            f"{BASE_URL}/api/notifications/reminder-preferences",
            headers=self.headers,
            json={"reminder_times": [15]}
        )
        assert response.status_code == 200
        assert 15 in response.json()["preferences"]["reminder_times"]
    
    def test_set_1hr_reminder(self):
        """Test setting 1 hour reminder (60 minutes)"""
        response = requests.put(
            f"{BASE_URL}/api/notifications/reminder-preferences",
            headers=self.headers,
            json={"reminder_times": [60]}
        )
        assert response.status_code == 200
        assert 60 in response.json()["preferences"]["reminder_times"]
    
    def test_set_1day_reminder(self):
        """Test setting 1 day reminder (1440 minutes)"""
        response = requests.put(
            f"{BASE_URL}/api/notifications/reminder-preferences",
            headers=self.headers,
            json={"reminder_times": [1440]}
        )
        assert response.status_code == 200
        assert 1440 in response.json()["preferences"]["reminder_times"]
    
    def test_set_multiple_reminders(self):
        """Test setting multiple reminder times"""
        reminder_times = [15, 60, 1440]  # 15min, 1hr, 1day
        response = requests.put(
            f"{BASE_URL}/api/notifications/reminder-preferences",
            headers=self.headers,
            json={"reminder_times": reminder_times}
        )
        assert response.status_code == 200
        prefs = response.json()["preferences"]
        assert prefs["reminder_times"] == reminder_times


class TestPracticeManagementTabs:
    """Test Practice Management tabs still work after refactoring"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Login and get tokens"""
        login_response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={
                "email": "test@tls.or.tz",
                "password": "Test@12345678!"
            }
        )
        data = login_response.json()
        self.token = data["access_token"]
        self.headers = {
            "Authorization": f"Bearer {self.token}",
            "Content-Type": "application/json"
        }
    
    def test_dashboard_stats(self):
        """Test Dashboard tab - GET /api/practice/dashboard/stats"""
        response = requests.get(
            f"{BASE_URL}/api/practice/dashboard/stats",
            headers=self.headers
        )
        assert response.status_code == 200
        data = response.json()
        assert "total_clients" in data or "active_cases" in data
    
    def test_clients_list(self):
        """Test Clients tab - GET /api/practice/clients"""
        response = requests.get(
            f"{BASE_URL}/api/practice/clients",
            headers=self.headers
        )
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list) or "clients" in data
    
    def test_cases_list(self):
        """Test Cases tab - GET /api/practice/cases"""
        response = requests.get(
            f"{BASE_URL}/api/practice/cases",
            headers=self.headers
        )
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list) or "cases" in data
    
    def test_documents_list(self):
        """Test Documents tab - GET /api/practice/documents"""
        response = requests.get(
            f"{BASE_URL}/api/practice/documents",
            headers=self.headers
        )
        assert response.status_code == 200
    
    def test_calendar_events(self):
        """Test Calendar tab - GET /api/practice/events"""
        response = requests.get(
            f"{BASE_URL}/api/practice/events",
            headers=self.headers
        )
        assert response.status_code == 200
    
    def test_tasks_list(self):
        """Test Tasks tab - GET /api/practice/tasks"""
        response = requests.get(
            f"{BASE_URL}/api/practice/tasks",
            headers=self.headers
        )
        assert response.status_code == 200


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
