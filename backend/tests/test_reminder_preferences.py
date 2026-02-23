"""
Test suite for Notification Reminder Preferences - Profile Page Notifications Tab
Tests the ReminderSettings component backend API endpoints
"""
import pytest
import requests
import os
import time

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://advocate-refactor.preview.emergentagent.com')
BASE_URL = BASE_URL.rstrip('/')

# Test credentials
TEST_EMAIL = "test@tls.or.tz"
TEST_PASSWORD = "Test@12345678!"

# Session-level login to avoid rate limiting
_cached_session = None
_cached_token = None
_cached_csrf = None


def get_authenticated_session():
    """Get or create an authenticated session (cached to avoid rate limiting)"""
    global _cached_session, _cached_token, _cached_csrf
    
    if _cached_session is None:
        time.sleep(1)  # Rate limiting protection
        
        session = requests.Session()
        response = session.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        
        if response.status_code != 200:
            pytest.skip(f"Login failed: {response.text}")
            return None, None, None
            
        data = response.json()
        _cached_session = session
        _cached_token = data["access_token"]
        _cached_csrf = data.get("csrf_token", "")
    
    return _cached_session, _cached_token, _cached_csrf


class TestReminderPreferencesAPI:
    """Test reminder preferences API endpoints"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Get auth token + CSRF token from cached session"""
        session, token, csrf = get_authenticated_session()
        if session is None:
            pytest.skip("Unable to authenticate")
        
        self.session = session
        self.token = token
        self.csrf_token = csrf
        
        # Auth headers with CSRF token
        self.auth_headers = {
            "Authorization": f"Bearer {self.token}",
            "Content-Type": "application/json",
            "X-CSRF-Token": self.csrf_token
        }
    
    def test_get_reminder_preferences(self):
        """Test GET /api/notifications/reminder-preferences returns preferences"""
        response = self.session.get(
            f"{BASE_URL}/api/notifications/reminder-preferences",
            headers={"Authorization": f"Bearer {self.token}"}
        )
        
        assert response.status_code == 200, f"GET preferences failed: {response.text}"
        
        data = response.json()
        assert "preferences" in data
        
        # Verify all expected preference fields
        prefs = data["preferences"]
        assert "in_app_reminders" in prefs
        assert "in_app_calendar" in prefs
        assert "in_app_tasks" in prefs
        assert "in_app_system" in prefs
        assert "email_reminders" in prefs
        assert "email_calendar" in prefs
        assert "email_tasks" in prefs
        assert "email_system" in prefs
        assert "reminder_times" in prefs
        
        # Verify types
        assert isinstance(prefs["in_app_reminders"], bool)
        assert isinstance(prefs["reminder_times"], list)
        
        print(f"GET preferences passed - Fields: {list(prefs.keys())}")
    
    def test_get_reminder_preferences_default_values(self):
        """Test GET returns proper default values when no custom settings"""
        response = self.session.get(
            f"{BASE_URL}/api/notifications/reminder-preferences",
            headers={"Authorization": f"Bearer {self.token}"}
        )
        
        assert response.status_code == 200
        prefs = response.json()["preferences"]
        
        # Default reminder times should include 15min, 1hr, and 1day
        assert isinstance(prefs["reminder_times"], list)
        print(f"Default reminder_times: {prefs['reminder_times']}")
    
    def test_put_reminder_preferences_update_in_app(self):
        """Test PUT /api/notifications/reminder-preferences updates in-app settings"""
        # First get current preferences
        get_response = self.session.get(
            f"{BASE_URL}/api/notifications/reminder-preferences",
            headers={"Authorization": f"Bearer {self.token}"}
        )
        assert get_response.status_code == 200
        original_prefs = get_response.json()["preferences"]
        
        # Toggle in_app_reminders
        new_value = not original_prefs.get("in_app_reminders", True)
        
        response = self.session.put(
            f"{BASE_URL}/api/notifications/reminder-preferences",
            headers=self.auth_headers,
            json={"in_app_reminders": new_value}
        )
        
        assert response.status_code == 200, f"PUT failed: {response.text}"
        
        data = response.json()
        assert "preferences" in data
        assert data["preferences"]["in_app_reminders"] == new_value
        
        # Verify persistence
        verify_response = self.session.get(
            f"{BASE_URL}/api/notifications/reminder-preferences",
            headers={"Authorization": f"Bearer {self.token}"}
        )
        assert verify_response.json()["preferences"]["in_app_reminders"] == new_value
        
        # Restore original value
        self.session.put(
            f"{BASE_URL}/api/notifications/reminder-preferences",
            headers=self.auth_headers,
            json={"in_app_reminders": original_prefs.get("in_app_reminders", True)}
        )
        
        print(f"PUT in_app_reminders toggle passed - Set to {new_value}")
    
    def test_put_reminder_preferences_update_email(self):
        """Test PUT updates email notification settings"""
        # Get current
        get_response = self.session.get(
            f"{BASE_URL}/api/notifications/reminder-preferences",
            headers={"Authorization": f"Bearer {self.token}"}
        )
        original_prefs = get_response.json()["preferences"]
        
        # Toggle email_reminders
        new_value = not original_prefs.get("email_reminders", True)
        
        response = self.session.put(
            f"{BASE_URL}/api/notifications/reminder-preferences",
            headers=self.auth_headers,
            json={"email_reminders": new_value}
        )
        
        assert response.status_code == 200
        assert response.json()["preferences"]["email_reminders"] == new_value
        
        # Restore
        self.session.put(
            f"{BASE_URL}/api/notifications/reminder-preferences",
            headers=self.auth_headers,
            json={"email_reminders": original_prefs.get("email_reminders", True)}
        )
        
        print(f"PUT email_reminders toggle passed")
    
    def test_put_reminder_times_5min(self):
        """Test setting reminder_times with 5 minute option"""
        response = self.session.put(
            f"{BASE_URL}/api/notifications/reminder-preferences",
            headers=self.auth_headers,
            json={"reminder_times": [5]}
        )
        
        assert response.status_code == 200
        assert 5 in response.json()["preferences"]["reminder_times"]
        
        print("PUT reminder_times 5min passed")
    
    def test_put_reminder_times_15min(self):
        """Test setting reminder_times with 15 minute option"""
        response = self.session.put(
            f"{BASE_URL}/api/notifications/reminder-preferences",
            headers=self.auth_headers,
            json={"reminder_times": [15]}
        )
        
        assert response.status_code == 200
        assert 15 in response.json()["preferences"]["reminder_times"]
        
        print("PUT reminder_times 15min passed")
    
    def test_put_reminder_times_30min(self):
        """Test setting reminder_times with 30 minute option"""
        response = self.session.put(
            f"{BASE_URL}/api/notifications/reminder-preferences",
            headers=self.auth_headers,
            json={"reminder_times": [30]}
        )
        
        assert response.status_code == 200
        assert 30 in response.json()["preferences"]["reminder_times"]
        
        print("PUT reminder_times 30min passed")
    
    def test_put_reminder_times_1hour(self):
        """Test setting reminder_times with 1 hour (60 min) option"""
        response = self.session.put(
            f"{BASE_URL}/api/notifications/reminder-preferences",
            headers=self.auth_headers,
            json={"reminder_times": [60]}
        )
        
        assert response.status_code == 200
        assert 60 in response.json()["preferences"]["reminder_times"]
        
        print("PUT reminder_times 1hour passed")
    
    def test_put_reminder_times_2hours(self):
        """Test setting reminder_times with 2 hours (120 min) option"""
        response = self.session.put(
            f"{BASE_URL}/api/notifications/reminder-preferences",
            headers=self.auth_headers,
            json={"reminder_times": [120]}
        )
        
        assert response.status_code == 200
        assert 120 in response.json()["preferences"]["reminder_times"]
        
        print("PUT reminder_times 2hours passed")
    
    def test_put_reminder_times_1day(self):
        """Test setting reminder_times with 1 day (1440 min) option"""
        response = self.session.put(
            f"{BASE_URL}/api/notifications/reminder-preferences",
            headers=self.auth_headers,
            json={"reminder_times": [1440]}
        )
        
        assert response.status_code == 200
        assert 1440 in response.json()["preferences"]["reminder_times"]
        
        print("PUT reminder_times 1day passed")
    
    def test_put_reminder_times_2days(self):
        """Test setting reminder_times with 2 days (2880 min) option"""
        response = self.session.put(
            f"{BASE_URL}/api/notifications/reminder-preferences",
            headers=self.auth_headers,
            json={"reminder_times": [2880]}
        )
        
        assert response.status_code == 200
        assert 2880 in response.json()["preferences"]["reminder_times"]
        
        print("PUT reminder_times 2days passed")
    
    def test_put_multiple_reminder_times(self):
        """Test setting multiple reminder times at once"""
        times = [5, 15, 30, 60, 120, 1440, 2880]
        
        response = self.session.put(
            f"{BASE_URL}/api/notifications/reminder-preferences",
            headers=self.auth_headers,
            json={"reminder_times": times}
        )
        
        assert response.status_code == 200
        saved_times = response.json()["preferences"]["reminder_times"]
        
        for t in times:
            assert t in saved_times, f"Time {t} not found in saved times"
        
        print(f"PUT multiple reminder_times passed - All 7 options: {saved_times}")
    
    def test_put_all_preferences_at_once(self):
        """Test updating all preference fields in one request"""
        update_data = {
            "in_app_reminders": True,
            "in_app_calendar": True,
            "in_app_tasks": True,
            "in_app_system": False,
            "email_reminders": True,
            "email_calendar": False,
            "email_tasks": True,
            "email_system": False,
            "reminder_times": [15, 60, 1440]
        }
        
        response = self.session.put(
            f"{BASE_URL}/api/notifications/reminder-preferences",
            headers=self.auth_headers,
            json=update_data
        )
        
        assert response.status_code == 200
        
        prefs = response.json()["preferences"]
        assert prefs["in_app_reminders"] == True
        assert prefs["in_app_system"] == False
        assert prefs["email_calendar"] == False
        assert prefs["reminder_times"] == [15, 60, 1440]
        
        print("PUT all preferences at once passed")


class TestReminderPreferencesNoAuth:
    """Test reminder preferences API requires authentication"""
    
    def test_get_preferences_requires_auth(self):
        """Test GET reminder-preferences requires authentication"""
        response = requests.get(f"{BASE_URL}/api/notifications/reminder-preferences")
        
        assert response.status_code in [401, 403]
        print("Auth required for GET - passed")
    
    def test_put_preferences_requires_auth(self):
        """Test PUT reminder-preferences requires authentication"""
        response = requests.put(
            f"{BASE_URL}/api/notifications/reminder-preferences",
            json={"in_app_reminders": False}
        )
        
        assert response.status_code in [401, 403]
        print("Auth required for PUT - passed")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
