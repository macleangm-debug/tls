"""
Notification Preferences API Tests
Tests for the push notification preferences endpoints added in iteration 33.
19 notification types across 7 categories, all default to ON.
"""

import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL').rstrip('/')

# Test credentials from iteration_32.json
TEST_USER_EMAIL = "testadvocate@tls.or.tz"
TEST_USER_PASSWORD = "Test@1234"


@pytest.fixture(scope="module")
def auth_token():
    """Get authentication token for test user"""
    response = requests.post(
        f"{BASE_URL}/api/auth/login",
        json={"email": TEST_USER_EMAIL, "password": TEST_USER_PASSWORD}
    )
    if response.status_code == 200:
        data = response.json()
        return data.get("access_token")
    pytest.skip(f"Authentication failed: {response.status_code} - {response.text}")


@pytest.fixture
def auth_headers(auth_token):
    """Headers with auth token"""
    return {
        "Authorization": f"Bearer {auth_token}",
        "Content-Type": "application/json"
    }


class TestNotificationPreferencesGet:
    """Tests for GET /api/notifications/preferences"""
    
    def test_get_preferences_returns_200(self, auth_headers):
        """GET preferences should return 200 status"""
        response = requests.get(
            f"{BASE_URL}/api/notifications/preferences",
            headers=auth_headers
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
    
    def test_get_preferences_returns_all_19_types(self, auth_headers):
        """GET preferences should return all 19 notification types"""
        response = requests.get(
            f"{BASE_URL}/api/notifications/preferences",
            headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        
        preferences = data.get("preferences", {})
        
        # All 19 expected notification types
        expected_types = [
            # Document stamping (2)
            "stamp_created", "stamp_downloaded",
            # Verification (2)
            "stamp_verified", "verification_failed",
            # Expiry warnings (4)
            "stamp_expiring_30days", "stamp_expiring_7days", "stamp_expiring_1day", "stamp_expired",
            # Account security (3)
            "login_new_device", "password_changed", "profile_updated",
            # Billing (3)
            "subscription_expiring", "payment_received", "payment_failed",
            # System (3)
            "system_maintenance", "new_features", "security_alerts",
            # Offline sync (2)
            "sync_completed", "sync_failed"
        ]
        
        for pref_type in expected_types:
            assert pref_type in preferences, f"Missing preference type: {pref_type}"
    
    def test_get_preferences_all_default_to_on(self, auth_headers):
        """All notification preferences should default to ON (True)"""
        response = requests.get(
            f"{BASE_URL}/api/notifications/preferences",
            headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        
        preferences = data.get("preferences", {})
        
        # All should default to True
        for key, value in preferences.items():
            assert value is True, f"Preference '{key}' should default to True, got {value}"
    
    def test_get_preferences_returns_7_categories(self, auth_headers):
        """GET preferences should return 7 grouped categories"""
        response = requests.get(
            f"{BASE_URL}/api/notifications/preferences",
            headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        
        grouped = data.get("grouped", {})
        
        expected_categories = [
            "document_stamping",
            "verification",
            "expiry_warnings",
            "account_security",
            "billing",
            "system",
            "offline_sync"
        ]
        
        assert len(grouped) == 7, f"Expected 7 categories, got {len(grouped)}"
        for category in expected_categories:
            assert category in grouped, f"Missing category: {category}"
            assert "label" in grouped[category]
            assert "description" in grouped[category]
            assert "preferences" in grouped[category]
    
    def test_get_preferences_requires_auth(self):
        """GET preferences should require authentication"""
        response = requests.get(f"{BASE_URL}/api/notifications/preferences")
        assert response.status_code in [401, 403], f"Expected auth error, got {response.status_code}"


class TestNotificationPreferencesUpdate:
    """Tests for PUT /api/notifications/preferences"""
    
    def test_update_single_preference(self, auth_headers):
        """Should update a single preference"""
        # Disable a preference
        response = requests.put(
            f"{BASE_URL}/api/notifications/preferences",
            headers=auth_headers,
            json={"stamp_created": False}
        )
        assert response.status_code == 200, f"Update failed: {response.text}"
        
        data = response.json()
        assert data.get("success") is True
        assert data.get("preferences", {}).get("stamp_created") is False
        
        # Re-enable it
        response = requests.put(
            f"{BASE_URL}/api/notifications/preferences",
            headers=auth_headers,
            json={"stamp_created": True}
        )
        assert response.status_code == 200
        assert response.json().get("preferences", {}).get("stamp_created") is True
    
    def test_update_multiple_preferences(self, auth_headers):
        """Should update multiple preferences at once"""
        response = requests.put(
            f"{BASE_URL}/api/notifications/preferences",
            headers=auth_headers,
            json={
                "new_features": False,
                "system_maintenance": False,
                "sync_completed": False
            }
        )
        assert response.status_code == 200
        
        data = response.json()
        prefs = data.get("preferences", {})
        assert prefs.get("new_features") is False
        assert prefs.get("system_maintenance") is False
        assert prefs.get("sync_completed") is False
        
        # Reset to defaults after test
        requests.post(
            f"{BASE_URL}/api/notifications/preferences/reset",
            headers=auth_headers
        )
    
    def test_update_preserves_other_preferences(self, auth_headers):
        """Updating one preference should not affect others"""
        # First, get current state
        response = requests.get(
            f"{BASE_URL}/api/notifications/preferences",
            headers=auth_headers
        )
        original_prefs = response.json().get("preferences", {})
        
        # Update single preference
        response = requests.put(
            f"{BASE_URL}/api/notifications/preferences",
            headers=auth_headers,
            json={"payment_failed": False}
        )
        assert response.status_code == 200
        
        updated_prefs = response.json().get("preferences", {})
        
        # Check that payment_failed is updated
        assert updated_prefs.get("payment_failed") is False
        
        # Check that other preferences are unchanged (sample check)
        assert updated_prefs.get("stamp_created") == original_prefs.get("stamp_created", True)
        
        # Reset
        requests.post(
            f"{BASE_URL}/api/notifications/preferences/reset",
            headers=auth_headers
        )
    
    def test_update_requires_auth(self):
        """PUT preferences should require authentication"""
        response = requests.put(
            f"{BASE_URL}/api/notifications/preferences",
            json={"stamp_created": False}
        )
        assert response.status_code in [401, 403]


class TestNotificationPreferencesReset:
    """Tests for POST /api/notifications/preferences/reset"""
    
    def test_reset_restores_defaults(self, auth_headers):
        """Reset should restore all preferences to ON"""
        # Reset
        response = requests.post(
            f"{BASE_URL}/api/notifications/preferences/reset",
            headers=auth_headers
        )
        assert response.status_code == 200
        
        data = response.json()
        assert data.get("success") is True
        assert data.get("message") == "Notification preferences reset to defaults"
        
        # Verify all returned preferences are True (defaults)
        reset_prefs = data.get("preferences", {})
        assert len(reset_prefs) == 19, f"Expected 19 preferences, got {len(reset_prefs)}"
        for key, value in reset_prefs.items():
            assert value is True, f"After reset, '{key}' should be True"
    
    def test_reset_requires_auth(self):
        """Reset endpoint should require authentication"""
        response = requests.post(f"{BASE_URL}/api/notifications/preferences/reset")
        assert response.status_code in [401, 403]


class TestNotificationPreferencesToggleAll:
    """Tests for POST /api/notifications/preferences/toggle-all"""
    
    def test_toggle_all_off(self, auth_headers):
        """Toggle-all should disable all preferences"""
        response = requests.post(
            f"{BASE_URL}/api/notifications/preferences/toggle-all",
            headers={"Authorization": auth_headers["Authorization"]},
            data={"enabled": "false"}
        )
        assert response.status_code == 200, f"Toggle-all failed: {response.text}"
        
        data = response.json()
        assert data.get("success") is True
        
        prefs = data.get("preferences", {})
        for key, value in prefs.items():
            assert value is False, f"After toggle-all off, '{key}' should be False"
        
        # Reset after test
        requests.post(
            f"{BASE_URL}/api/notifications/preferences/reset",
            headers=auth_headers
        )
    
    def test_toggle_all_on(self, auth_headers):
        """Toggle-all should enable all preferences"""
        # First disable all
        requests.post(
            f"{BASE_URL}/api/notifications/preferences/toggle-all",
            headers={"Authorization": auth_headers["Authorization"]},
            data={"enabled": "false"}
        )
        
        # Then enable all
        response = requests.post(
            f"{BASE_URL}/api/notifications/preferences/toggle-all",
            headers={"Authorization": auth_headers["Authorization"]},
            data={"enabled": "true"}
        )
        assert response.status_code == 200
        
        data = response.json()
        assert data.get("success") is True
        
        prefs = data.get("preferences", {})
        for key, value in prefs.items():
            assert value is True, f"After toggle-all on, '{key}' should be True"
    
    def test_toggle_all_requires_auth(self):
        """Toggle-all should require authentication"""
        response = requests.post(
            f"{BASE_URL}/api/notifications/preferences/toggle-all",
            data={"enabled": "false"}
        )
        assert response.status_code in [401, 403]


class TestNotificationCategoryStructure:
    """Tests for category grouping structure"""
    
    def test_document_stamping_category_has_2_preferences(self, auth_headers):
        """Document stamping category should have 2 notification types"""
        response = requests.get(
            f"{BASE_URL}/api/notifications/preferences",
            headers=auth_headers
        )
        grouped = response.json().get("grouped", {})
        
        doc_stamping = grouped.get("document_stamping", {})
        prefs = doc_stamping.get("preferences", {})
        
        assert len(prefs) == 2
        assert "stamp_created" in prefs
        assert "stamp_downloaded" in prefs
    
    def test_verification_category_has_2_preferences(self, auth_headers):
        """Verification category should have 2 notification types"""
        response = requests.get(
            f"{BASE_URL}/api/notifications/preferences",
            headers=auth_headers
        )
        grouped = response.json().get("grouped", {})
        
        verification = grouped.get("verification", {})
        prefs = verification.get("preferences", {})
        
        assert len(prefs) == 2
        assert "stamp_verified" in prefs
        assert "verification_failed" in prefs
    
    def test_expiry_warnings_category_has_4_preferences(self, auth_headers):
        """Expiry warnings category should have 4 notification types"""
        response = requests.get(
            f"{BASE_URL}/api/notifications/preferences",
            headers=auth_headers
        )
        grouped = response.json().get("grouped", {})
        
        expiry = grouped.get("expiry_warnings", {})
        prefs = expiry.get("preferences", {})
        
        assert len(prefs) == 4
        assert "stamp_expiring_30days" in prefs
        assert "stamp_expiring_7days" in prefs
        assert "stamp_expiring_1day" in prefs
        assert "stamp_expired" in prefs
    
    def test_account_security_category_has_3_preferences(self, auth_headers):
        """Account security category should have 3 notification types"""
        response = requests.get(
            f"{BASE_URL}/api/notifications/preferences",
            headers=auth_headers
        )
        grouped = response.json().get("grouped", {})
        
        security = grouped.get("account_security", {})
        prefs = security.get("preferences", {})
        
        assert len(prefs) == 3
        assert "login_new_device" in prefs
        assert "password_changed" in prefs
        assert "profile_updated" in prefs
    
    def test_billing_category_has_3_preferences(self, auth_headers):
        """Billing category should have 3 notification types"""
        response = requests.get(
            f"{BASE_URL}/api/notifications/preferences",
            headers=auth_headers
        )
        grouped = response.json().get("grouped", {})
        
        billing = grouped.get("billing", {})
        prefs = billing.get("preferences", {})
        
        assert len(prefs) == 3
        assert "subscription_expiring" in prefs
        assert "payment_received" in prefs
        assert "payment_failed" in prefs
    
    def test_system_category_has_3_preferences(self, auth_headers):
        """System category should have 3 notification types"""
        response = requests.get(
            f"{BASE_URL}/api/notifications/preferences",
            headers=auth_headers
        )
        grouped = response.json().get("grouped", {})
        
        system = grouped.get("system", {})
        prefs = system.get("preferences", {})
        
        assert len(prefs) == 3
        assert "system_maintenance" in prefs
        assert "new_features" in prefs
        assert "security_alerts" in prefs
    
    def test_offline_sync_category_has_2_preferences(self, auth_headers):
        """Offline sync category should have 2 notification types"""
        response = requests.get(
            f"{BASE_URL}/api/notifications/preferences",
            headers=auth_headers
        )
        grouped = response.json().get("grouped", {})
        
        offline = grouped.get("offline_sync", {})
        prefs = offline.get("preferences", {})
        
        assert len(prefs) == 2
        assert "sync_completed" in prefs
        assert "sync_failed" in prefs


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
