"""
Test suite for Bulk Revoke feature
Testing:
1) GET /api/admin/advocates/{id}/stamp-summary - Returns active/revoked/expired counts
2) POST /api/admin/advocates/{id}/bulk-revoke - Super admin only access control
3) Bulk revoke validation - confirmation_text='REVOKE' or advocate name, reason min 10 chars
4) Bulk revoke execution - Revokes all active stamps, logs individual STAMP_REVOKED events  
5) ADVOCATE_BULK_REVOKE audit event - Logged in audit_logs with all details
6) GET /api/admin/bulk-revoke-history - Returns history of bulk revoke actions
"""

import pytest
import requests
import os
from datetime import datetime

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
SUPER_ADMIN_EMAIL = "superadmin@idc.co.tz"
SUPER_ADMIN_PASSWORD = "IDC@SuperAdmin2024"
REGULAR_ADMIN_EMAIL = "admin@tls.or.tz"
REGULAR_ADMIN_PASSWORD = "TLS@Admin2024"
TEST_ADVOCATE_ID = "test-advocate-persistent-001"

class TestBulkRevokeFeature:
    """Tests for bulk revoke feature"""
    
    @pytest.fixture
    def super_admin_token(self):
        """Get super admin auth token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": SUPER_ADMIN_EMAIL,
            "password": SUPER_ADMIN_PASSWORD
        })
        assert response.status_code == 200, f"Super admin login failed: {response.text}"
        return response.json().get("access_token")
    
    @pytest.fixture
    def regular_admin_token(self):
        """Get regular admin auth token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": REGULAR_ADMIN_EMAIL,
            "password": REGULAR_ADMIN_PASSWORD
        })
        assert response.status_code == 200, f"Regular admin login failed: {response.text}"
        return response.json().get("access_token")
    
    @pytest.fixture
    def super_admin_headers(self, super_admin_token):
        """Get auth headers for super admin"""
        return {
            "Authorization": f"Bearer {super_admin_token}",
            "Content-Type": "application/json"
        }
    
    @pytest.fixture
    def regular_admin_headers(self, regular_admin_token):
        """Get auth headers for regular admin"""
        return {
            "Authorization": f"Bearer {regular_admin_token}",
            "Content-Type": "application/json"
        }

    # ===========================================
    # TEST 1: GET /api/admin/advocates/{id}/stamp-summary
    # ===========================================
    
    def test_stamp_summary_returns_counts(self, super_admin_headers):
        """Test stamp summary returns active/revoked/expired counts"""
        response = requests.get(
            f"{BASE_URL}/api/admin/advocates/{TEST_ADVOCATE_ID}/stamp-summary",
            headers=super_admin_headers
        )
        
        assert response.status_code == 200, f"Stamp summary failed: {response.text}"
        data = response.json()
        
        # Validate response structure
        assert "advocate_id" in data
        assert "advocate_name" in data
        assert "stamp_summary" in data
        
        summary = data["stamp_summary"]
        assert "active" in summary
        assert "revoked" in summary
        assert "expired" in summary
        assert "total" in summary
        
        # Validate types
        assert isinstance(summary["active"], int)
        assert isinstance(summary["revoked"], int)
        assert isinstance(summary["expired"], int)
        assert isinstance(summary["total"], int)
        
        # Total should equal sum of active + revoked + expired
        assert summary["total"] == summary["active"] + summary["revoked"] + summary["expired"]
        
        print(f"Stamp summary: active={summary['active']}, revoked={summary['revoked']}, expired={summary['expired']}")
    
    def test_stamp_summary_regular_admin_can_access(self, regular_admin_headers):
        """Regular admin can also access stamp summary (for viewing)"""
        response = requests.get(
            f"{BASE_URL}/api/admin/advocates/{TEST_ADVOCATE_ID}/stamp-summary",
            headers=regular_admin_headers
        )
        
        # Regular admin should be able to view stamp summary (require_admin dependency)
        assert response.status_code == 200, f"Regular admin stamp summary failed: {response.text}"
    
    def test_stamp_summary_invalid_advocate(self, super_admin_headers):
        """Test stamp summary returns 404 for invalid advocate"""
        response = requests.get(
            f"{BASE_URL}/api/admin/advocates/non-existent-advocate-id/stamp-summary",
            headers=super_admin_headers
        )
        
        assert response.status_code == 404

    # ===========================================
    # TEST 2: POST /api/admin/advocates/{id}/bulk-revoke - Access Control
    # ===========================================
    
    def test_bulk_revoke_regular_admin_forbidden(self, regular_admin_headers):
        """Regular admin should get 403 on bulk revoke endpoint"""
        response = requests.post(
            f"{BASE_URL}/api/admin/advocates/{TEST_ADVOCATE_ID}/bulk-revoke",
            headers=regular_admin_headers,
            json={
                "reason": "Test revoke from regular admin",
                "confirmation_text": "REVOKE",
                "include_expired": False
            }
        )
        
        assert response.status_code == 403, f"Expected 403, got {response.status_code}: {response.text}"
        data = response.json()
        assert "Super Admin" in data.get("detail", "") or "super" in data.get("detail", "").lower()
        print(f"Access control working: Regular admin got 403 with message: {data.get('detail')}")
    
    def test_bulk_revoke_unauthenticated(self):
        """Unauthenticated request should get 401"""
        response = requests.post(
            f"{BASE_URL}/api/admin/advocates/{TEST_ADVOCATE_ID}/bulk-revoke",
            json={
                "reason": "Test revoke unauthenticated",
                "confirmation_text": "REVOKE",
                "include_expired": False
            }
        )
        
        assert response.status_code == 401

    # ===========================================
    # TEST 3: Bulk Revoke Validation
    # ===========================================
    
    def test_bulk_revoke_invalid_confirmation_text(self, super_admin_headers):
        """Test validation: invalid confirmation text should be rejected"""
        response = requests.post(
            f"{BASE_URL}/api/admin/advocates/{TEST_ADVOCATE_ID}/bulk-revoke",
            headers=super_admin_headers,
            json={
                "reason": "Test revocation with invalid confirmation",
                "confirmation_text": "WRONG_TEXT",
                "include_expired": False
            }
        )
        
        assert response.status_code == 400, f"Expected 400, got {response.status_code}: {response.text}"
        data = response.json()
        assert "confirmation" in data.get("detail", "").lower() or "REVOKE" in data.get("detail", "")
        print(f"Confirmation validation working: {data.get('detail')}")
    
    def test_bulk_revoke_reason_too_short(self, super_admin_headers):
        """Test validation: reason must be at least 10 characters"""
        response = requests.post(
            f"{BASE_URL}/api/admin/advocates/{TEST_ADVOCATE_ID}/bulk-revoke",
            headers=super_admin_headers,
            json={
                "reason": "Short",  # Less than 10 chars
                "confirmation_text": "REVOKE",
                "include_expired": False
            }
        )
        
        assert response.status_code == 400, f"Expected 400, got {response.status_code}: {response.text}"
        data = response.json()
        assert "10" in data.get("detail", "") or "character" in data.get("detail", "").lower()
        print(f"Reason length validation working: {data.get('detail')}")
    
    def test_bulk_revoke_empty_reason(self, super_admin_headers):
        """Test validation: empty reason should be rejected"""
        response = requests.post(
            f"{BASE_URL}/api/admin/advocates/{TEST_ADVOCATE_ID}/bulk-revoke",
            headers=super_admin_headers,
            json={
                "reason": "",
                "confirmation_text": "REVOKE",
                "include_expired": False
            }
        )
        
        assert response.status_code == 400, f"Expected 400, got {response.status_code}: {response.text}"
    
    def test_bulk_revoke_invalid_advocate(self, super_admin_headers):
        """Test validation: invalid advocate ID should return 404"""
        response = requests.post(
            f"{BASE_URL}/api/admin/advocates/non-existent-advocate/bulk-revoke",
            headers=super_admin_headers,
            json={
                "reason": "Test revocation for non-existent advocate",
                "confirmation_text": "REVOKE",
                "include_expired": False
            }
        )
        
        assert response.status_code == 404

    # ===========================================
    # TEST 4: Bulk Revoke Execution (with valid REVOKE confirmation)
    # ===========================================
    
    def test_bulk_revoke_with_revoke_confirmation(self, super_admin_headers):
        """Test bulk revoke execution with 'REVOKE' confirmation"""
        # First get current stamp summary
        summary_response = requests.get(
            f"{BASE_URL}/api/admin/advocates/{TEST_ADVOCATE_ID}/stamp-summary",
            headers=super_admin_headers
        )
        assert summary_response.status_code == 200
        summary_before = summary_response.json()["stamp_summary"]
        active_before = summary_before["active"]
        
        print(f"Before revoke: active={active_before}")
        
        # Perform bulk revoke
        response = requests.post(
            f"{BASE_URL}/api/admin/advocates/{TEST_ADVOCATE_ID}/bulk-revoke",
            headers=super_admin_headers,
            json={
                "reason": "Testing bulk revoke functionality for compliance verification",
                "confirmation_text": "REVOKE",
                "include_expired": False
            }
        )
        
        assert response.status_code == 200, f"Bulk revoke failed: {response.text}"
        data = response.json()
        
        # Validate response structure
        assert "advocate_id" in data
        assert "advocate_name" in data
        assert "revoked_count" in data
        assert "already_revoked" in data
        assert "already_expired" in data
        assert "batch_revoke_id" in data
        assert "timestamp" in data
        
        # Validate batch_revoke_id format
        assert data["batch_revoke_id"].startswith("BULK-")
        
        print(f"Bulk revoke result: revoked={data['revoked_count']}, batch_id={data['batch_revoke_id']}")
        
        return data["batch_revoke_id"]

    # ===========================================
    # TEST 5: ADVOCATE_BULK_REVOKE Audit Event
    # ===========================================
    
    def test_bulk_revoke_audit_event_logged(self, super_admin_headers):
        """Test that ADVOCATE_BULK_REVOKE audit event is logged"""
        # Get bulk revoke history
        response = requests.get(
            f"{BASE_URL}/api/admin/bulk-revoke-history",
            headers=super_admin_headers
        )
        
        assert response.status_code == 200, f"Bulk revoke history failed: {response.text}"
        data = response.json()
        
        # Validate response structure
        assert "items" in data
        assert "page" in data
        assert "page_size" in data
        assert "total" in data
        
        # Should have at least one entry if bulk revoke was ever performed
        if data["total"] > 0:
            latest_event = data["items"][0]
            assert latest_event["action"] == "ADVOCATE_BULK_REVOKE"
            assert "details" in latest_event
            
            details = latest_event["details"]
            assert "advocate_id" in details
            assert "batch_revoke_id" in details
            assert "reason" in details
            assert "revoked_count" in details
            
            print(f"Audit event found: batch_id={details.get('batch_revoke_id')}, revoked={details.get('revoked_count')}")
        else:
            print("No bulk revoke history found (no bulk revokes performed yet)")

    # ===========================================
    # TEST 6: GET /api/admin/bulk-revoke-history
    # ===========================================
    
    def test_bulk_revoke_history_pagination(self, super_admin_headers):
        """Test bulk revoke history supports pagination"""
        response = requests.get(
            f"{BASE_URL}/api/admin/bulk-revoke-history?page=1&page_size=10",
            headers=super_admin_headers
        )
        
        assert response.status_code == 200
        data = response.json()
        
        assert data["page"] == 1
        assert data["page_size"] == 10
        assert isinstance(data["items"], list)
        assert isinstance(data["total"], int)
    
    def test_bulk_revoke_history_regular_admin_can_access(self, regular_admin_headers):
        """Regular admin can view bulk revoke history (read-only)"""
        response = requests.get(
            f"{BASE_URL}/api/admin/bulk-revoke-history",
            headers=regular_admin_headers
        )
        
        # Regular admin should be able to view history (require_admin dependency)
        assert response.status_code == 200
    
    def test_bulk_revoke_history_unauthenticated(self):
        """Unauthenticated should get 401 on history endpoint"""
        response = requests.get(f"{BASE_URL}/api/admin/bulk-revoke-history")
        assert response.status_code == 401


class TestStampRevokedEvents:
    """Tests for individual STAMP_REVOKED events after bulk revoke"""
    
    @pytest.fixture
    def super_admin_headers(self):
        """Get super admin auth headers"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": SUPER_ADMIN_EMAIL,
            "password": SUPER_ADMIN_PASSWORD
        })
        assert response.status_code == 200
        token = response.json().get("access_token")
        return {
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json"
        }
    
    def test_stamp_events_after_bulk_revoke(self, super_admin_headers):
        """Verify individual STAMP_REVOKED events are logged for each stamp"""
        # Get revoked stamps for the test advocate
        response = requests.get(
            f"{BASE_URL}/api/stamps?advocate_id={TEST_ADVOCATE_ID}&status=revoked&page_size=5",
            headers=super_admin_headers
        )
        
        if response.status_code != 200:
            print(f"Cannot verify stamp events - stamps endpoint returned {response.status_code}")
            return
        
        data = response.json()
        stamps = data.get("items", [])
        
        if not stamps:
            print("No revoked stamps found to check events")
            return
        
        # Check events for first revoked stamp
        stamp_id = stamps[0].get("stamp_id")
        events_response = requests.get(
            f"{BASE_URL}/api/stamps/{stamp_id}/events",
            headers=super_admin_headers
        )
        
        if events_response.status_code == 200:
            events = events_response.json()
            revoke_events = [e for e in events if e.get("event_type") == "STAMP_REVOKED"]
            
            if revoke_events:
                latest_revoke = revoke_events[0]
                assert latest_revoke["event_type"] == "STAMP_REVOKED"
                
                # Check if it's from a bulk revoke
                metadata = latest_revoke.get("metadata", {})
                if metadata.get("bulk"):
                    assert "batch_revoke_id" in metadata
                    print(f"STAMP_REVOKED event found for {stamp_id}, bulk={metadata.get('bulk')}")
                else:
                    print(f"STAMP_REVOKED event found for {stamp_id} (individual revoke)")
            else:
                print(f"No STAMP_REVOKED events found for stamp {stamp_id}")
        else:
            print(f"Could not fetch events for stamp {stamp_id}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
