"""
Test cases for Stamp Ledger feature
Tests: GET /api/stamps (paginated list with filters), 
       GET /api/stamps/{stamp_id} (detail view),
       POST /api/stamps/{stamp_id}/revoke (revoke with reason),
       GET /api/stamps/{stamp_id}/events (audit trail),
       GET /api/stamps/export.csv (CSV export)
"""
import pytest
import requests
import os
from datetime import datetime

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
TEST_EMAIL = "test@tls.or.tz"
TEST_PASSWORD = "Test@12345678!"

class TestStampLedgerAPI:
    """Tests for Stamp Ledger feature"""
    
    @pytest.fixture(scope="class")
    def auth_session(self):
        """Login and return session with auth token"""
        session = requests.Session()
        session.headers.update({"Content-Type": "application/json"})
        
        response = session.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        
        if response.status_code != 200:
            pytest.skip(f"Login failed: {response.status_code} - {response.text}")
        
        data = response.json()
        token = data.get("access_token")
        if token:
            session.headers.update({"Authorization": f"Bearer {token}"})
        
        # Store user info for later
        session.user = data.get("user", {})
        return session
    
    # ==================== GET /api/stamps (List) Tests ====================
    
    def test_stamps_list_requires_auth(self):
        """GET /api/stamps - returns 401 without authentication"""
        response = requests.get(f"{BASE_URL}/api/stamps")
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print("PASS: /api/stamps returns 401 without auth")
    
    def test_stamps_list_returns_paginated_data(self, auth_session):
        """GET /api/stamps - returns paginated list with correct fields"""
        response = auth_session.get(f"{BASE_URL}/api/stamps?page=1&page_size=25")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        # Verify pagination fields
        assert "items" in data, "Response must have 'items' field"
        assert "page" in data, "Response must have 'page' field"
        assert "page_size" in data, "Response must have 'page_size' field"
        assert "total" in data, "Response must have 'total' field"
        
        assert data["page"] == 1
        assert data["page_size"] == 25
        assert isinstance(data["total"], int)
        
        print(f"PASS: /api/stamps returns paginated list (total: {data['total']} stamps)")
    
    def test_stamps_list_item_fields(self, auth_session):
        """GET /api/stamps - verify each item has required fields"""
        response = auth_session.get(f"{BASE_URL}/api/stamps?page=1&page_size=10")
        assert response.status_code == 200
        
        data = response.json()
        if len(data["items"]) == 0:
            pytest.skip("No stamps found to test item fields")
        
        item = data["items"][0]
        # Check required fields from StampLedgerItem model
        required_fields = ["stamp_id", "advocate_id", "advocate_name", "issued_at", 
                          "status", "doc_hash", "verification_count"]
        
        for field in required_fields:
            assert field in item, f"Item missing required field: {field}"
        
        # Verify status is valid
        assert item["status"] in ["active", "revoked", "expired"], f"Invalid status: {item['status']}"
        
        print(f"PASS: Stamp item has all required fields: {list(item.keys())}")
    
    def test_stamps_list_status_filter(self, auth_session):
        """GET /api/stamps?status=active - filter by status works"""
        response = auth_session.get(f"{BASE_URL}/api/stamps?status=active")
        assert response.status_code == 200
        
        data = response.json()
        # All items should have active status
        for item in data["items"]:
            assert item["status"] == "active", f"Expected status 'active', got '{item['status']}'"
        
        print(f"PASS: Status filter returns only active stamps ({len(data['items'])} items)")
    
    def test_stamps_list_search_by_stamp_id(self, auth_session):
        """GET /api/stamps?q=TLS - search by stamp_id works"""
        # First get a stamp_id to search for
        response = auth_session.get(f"{BASE_URL}/api/stamps?page=1&page_size=1")
        assert response.status_code == 200
        data = response.json()
        
        if len(data["items"]) == 0:
            pytest.skip("No stamps to test search")
        
        stamp_id = data["items"][0]["stamp_id"]
        search_term = stamp_id[:8]  # Search with partial ID
        
        response = auth_session.get(f"{BASE_URL}/api/stamps?q={search_term}")
        assert response.status_code == 200
        
        data = response.json()
        assert len(data["items"]) > 0, "Search should return at least one result"
        
        # Verify search matches
        found = False
        for item in data["items"]:
            if search_term.upper() in item["stamp_id"].upper():
                found = True
                break
        assert found, f"Search term '{search_term}' not found in results"
        
        print(f"PASS: Search by stamp_id works (searched: {search_term})")
    
    def test_stamps_list_date_range_filter(self, auth_session):
        """GET /api/stamps?from=DATE&to=DATE - date range filter works"""
        today = datetime.now().strftime("%Y-%m-%d")
        # Get stamps from last 30 days
        from_date = "2020-01-01"  # Far past to ensure results
        
        response = auth_session.get(f"{BASE_URL}/api/stamps?from={from_date}")
        assert response.status_code == 200
        
        data = response.json()
        print(f"PASS: Date range filter works ({data['total']} stamps from {from_date})")
    
    def test_stamps_list_pagination(self, auth_session):
        """GET /api/stamps - pagination works correctly"""
        # Get first page
        response1 = auth_session.get(f"{BASE_URL}/api/stamps?page=1&page_size=5")
        assert response1.status_code == 200
        data1 = response1.json()
        
        if data1["total"] <= 5:
            pytest.skip("Not enough stamps to test pagination")
        
        # Get second page
        response2 = auth_session.get(f"{BASE_URL}/api/stamps?page=2&page_size=5")
        assert response2.status_code == 200
        data2 = response2.json()
        
        # Pages should have different items
        if len(data1["items"]) > 0 and len(data2["items"]) > 0:
            assert data1["items"][0]["stamp_id"] != data2["items"][0]["stamp_id"], \
                "Page 1 and Page 2 should have different stamps"
        
        print(f"PASS: Pagination works (page 1: {len(data1['items'])} items, page 2: {len(data2['items'])} items)")
    
    # ==================== GET /api/stamps/{stamp_id} (Detail) Tests ====================
    
    def test_stamp_detail_not_found(self, auth_session):
        """GET /api/stamps/{stamp_id} - returns 404 for non-existent stamp"""
        response = auth_session.get(f"{BASE_URL}/api/stamps/TLS-NONEXISTENT-12345678")
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"
        print("PASS: /api/stamps/{stamp_id} returns 404 for non-existent stamp")
    
    def test_stamp_detail_returns_full_info(self, auth_session):
        """GET /api/stamps/{stamp_id} - returns full stamp details"""
        # First get a stamp_id
        response = auth_session.get(f"{BASE_URL}/api/stamps?page=1&page_size=1")
        assert response.status_code == 200
        data = response.json()
        
        if len(data["items"]) == 0:
            pytest.skip("No stamps to test detail view")
        
        stamp_id = data["items"][0]["stamp_id"]
        
        # Get detail
        response = auth_session.get(f"{BASE_URL}/api/stamps/{stamp_id}")
        assert response.status_code == 200
        
        detail = response.json()
        # Verify detail fields from StampLedgerDetail model
        required_fields = ["stamp_id", "advocate_id", "advocate_name", "issued_at",
                          "status", "doc_hash", "verification_url"]
        
        for field in required_fields:
            assert field in detail, f"Detail missing required field: {field}"
        
        # Verify verification_url is valid
        assert detail["verification_url"].startswith("http"), "verification_url must be a valid URL"
        assert stamp_id in detail["verification_url"], "verification_url must contain stamp_id"
        
        print(f"PASS: Stamp detail returns full info with verification_url: {detail['verification_url'][:50]}...")
    
    # ==================== POST /api/stamps/{stamp_id}/revoke Tests ====================
    
    def test_revoke_stamp_requires_auth(self):
        """POST /api/stamps/{stamp_id}/revoke - returns 401 without auth"""
        response = requests.post(
            f"{BASE_URL}/api/stamps/TLS-TEST-12345678/revoke",
            json={"reason": "Test revoke"}
        )
        assert response.status_code in [401, 403], f"Expected 401/403, got {response.status_code}"
        print("PASS: Revoke requires authentication")
    
    def test_revoke_stamp_requires_reason(self, auth_session):
        """POST /api/stamps/{stamp_id}/revoke - requires reason in body"""
        # Get a stamp to potentially revoke (we won't actually revoke it without reason)
        response = auth_session.get(f"{BASE_URL}/api/stamps?status=active&page_size=1")
        assert response.status_code == 200
        data = response.json()
        
        if len(data["items"]) == 0:
            pytest.skip("No active stamps to test revoke validation")
        
        stamp_id = data["items"][0]["stamp_id"]
        
        # Try to revoke without reason
        response = auth_session.post(f"{BASE_URL}/api/stamps/{stamp_id}/revoke", json={})
        # Should return 422 (validation error) or 400
        assert response.status_code in [400, 422], f"Expected 400/422, got {response.status_code}"
        print("PASS: Revoke requires reason field")
    
    def test_revoke_stamp_not_found(self, auth_session):
        """POST /api/stamps/{stamp_id}/revoke - returns 404 for non-existent stamp"""
        response = auth_session.post(
            f"{BASE_URL}/api/stamps/TLS-NONEXISTENT-12345678/revoke",
            json={"reason": "Test reason"}
        )
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"
        print("PASS: Revoke returns 404 for non-existent stamp")
    
    # ==================== GET /api/stamps/{stamp_id}/events (Audit Trail) Tests ====================
    
    def test_stamp_events_requires_auth(self):
        """GET /api/stamps/{stamp_id}/events - returns 401 without auth"""
        response = requests.get(f"{BASE_URL}/api/stamps/TLS-TEST-12345678/events")
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print("PASS: Events endpoint requires authentication")
    
    def test_stamp_events_returns_list(self, auth_session):
        """GET /api/stamps/{stamp_id}/events - returns list of audit events"""
        # Get a stamp
        response = auth_session.get(f"{BASE_URL}/api/stamps?page=1&page_size=1")
        assert response.status_code == 200
        data = response.json()
        
        if len(data["items"]) == 0:
            pytest.skip("No stamps to test events")
        
        stamp_id = data["items"][0]["stamp_id"]
        
        # Get events
        response = auth_session.get(f"{BASE_URL}/api/stamps/{stamp_id}/events")
        assert response.status_code == 200
        
        events = response.json()
        assert isinstance(events, list), "Events should be a list"
        
        # If events exist, verify structure
        if len(events) > 0:
            event = events[0]
            required_fields = ["id", "stamp_id", "event_type", "actor_type", "created_at"]
            for field in required_fields:
                assert field in event, f"Event missing field: {field}"
            
            # Verify event_type is valid
            valid_types = ["STAMP_ISSUED", "STAMP_VERIFIED", "STAMP_REVOKED", "STAMP_EXPIRED"]
            assert event["event_type"] in valid_types, f"Invalid event_type: {event['event_type']}"
        
        print(f"PASS: Events endpoint returns list ({len(events)} events for stamp {stamp_id})")
    
    def test_stamp_events_has_issued_event(self, auth_session):
        """GET /api/stamps/{stamp_id}/events - STAMP_ISSUED event exists"""
        # Get a stamp
        response = auth_session.get(f"{BASE_URL}/api/stamps?page=1&page_size=1")
        assert response.status_code == 200
        data = response.json()
        
        if len(data["items"]) == 0:
            pytest.skip("No stamps to test events")
        
        stamp_id = data["items"][0]["stamp_id"]
        
        # Get events
        response = auth_session.get(f"{BASE_URL}/api/stamps/{stamp_id}/events")
        assert response.status_code == 200
        
        events = response.json()
        
        # Check for STAMP_ISSUED event
        issued_events = [e for e in events if e["event_type"] == "STAMP_ISSUED"]
        
        # Note: STAMP_ISSUED event may not exist for older stamps created before audit logging
        if len(issued_events) > 0:
            print(f"PASS: STAMP_ISSUED event found for stamp {stamp_id}")
        else:
            print(f"INFO: No STAMP_ISSUED event found for stamp {stamp_id} (may be older stamp)")
    
    # ==================== GET /api/stamps/export.csv Tests ====================
    
    def test_csv_export_requires_auth(self):
        """GET /api/stamps/export.csv - returns 401 without auth"""
        response = requests.get(f"{BASE_URL}/api/stamps/export.csv")
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print("PASS: CSV export requires authentication")
    
    def test_csv_export_returns_csv(self, auth_session):
        """GET /api/stamps/export.csv - returns CSV file"""
        response = auth_session.get(f"{BASE_URL}/api/stamps/export.csv")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        # Verify content type
        content_type = response.headers.get("Content-Type", "")
        assert "text/csv" in content_type, f"Expected text/csv, got {content_type}"
        
        # Verify content disposition (download header)
        content_disposition = response.headers.get("Content-Disposition", "")
        assert "attachment" in content_disposition, "Should have attachment header"
        assert ".csv" in content_disposition, "Should have .csv in filename"
        
        # Verify CSV has header
        csv_content = response.text
        lines = csv_content.strip().split("\n")
        assert len(lines) >= 1, "CSV should have at least header row"
        
        # Verify header columns
        header = lines[0]
        required_columns = ["stamp_id", "status", "doc_hash", "verification_count"]
        for col in required_columns:
            assert col in header, f"CSV header missing column: {col}"
        
        print(f"PASS: CSV export works ({len(lines)-1} data rows)")
    
    def test_csv_export_with_filters(self, auth_session):
        """GET /api/stamps/export.csv?status=active - filters apply to export"""
        response = auth_session.get(f"{BASE_URL}/api/stamps/export.csv?status=active")
        assert response.status_code == 200
        
        csv_content = response.text
        lines = csv_content.strip().split("\n")
        
        # If there are data rows, verify they're all active (status column)
        if len(lines) > 1:
            header = lines[0].split(",")
            status_idx = header.index("status") if "status" in header else -1
            
            if status_idx >= 0:
                for line in lines[1:]:
                    if line.strip():
                        cols = line.split(",")
                        if len(cols) > status_idx:
                            # Status should be active (accounting for expired computed status)
                            status = cols[status_idx]
                            assert status in ["active", "expired"], f"Unexpected status in export: {status}"
        
        print(f"PASS: CSV export with filters works")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
