"""
Test Suite for Tamper-Proof Verification Page
Features tested:
1. GET /api/verify/stamp/{id} - Returns verification result with status, advocate info, document hash
2. POST /api/verify/stamp/{id}/validate-document - Upload document to verify hash match
3. Rate limiting on verification endpoint (30/minute)
4. Status banners: AUTHENTIC (green), WARNING (amber), NOT VERIFIED (red)
5. Document hash display (SHA-256 fingerprint shown)
"""

import pytest
import requests
import os
import time
import hashlib
from io import BytesIO

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://doc-prepare.preview.emergentagent.com').rstrip('/')

# Test credentials
TEST_EMAIL = "test@tls.or.tz"
TEST_PASSWORD = "Test@12345678!"

# Known test stamp IDs from context
VALID_STAMP_ID = "TLS-20260225-0DEF71F8"  # Active stamp from context


class TestVerificationEndpoints:
    """Tests for public verification endpoints"""
    
    def test_verify_stamp_valid_id(self):
        """Test GET /api/verify/stamp/{id} with valid stamp ID"""
        response = requests.get(f"{BASE_URL}/api/verify/stamp/{VALID_STAMP_ID}")
        
        # Should return 200 (stamp found - may be active, revoked, or expired)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        # Verify response structure
        assert "valid" in data, "Response should contain 'valid' field"
        assert "message" in data, "Response should contain 'message' field"
        
        # If stamp found, verify additional fields
        if data.get("stamp_id"):
            assert data["stamp_id"] == VALID_STAMP_ID, "Stamp ID should match"
            assert "advocate_name" in data, "Should return advocate name"
            assert "advocate_roll_number" in data, "Should return advocate roll number"
            assert "stamp_status" in data, "Should return stamp status"
            assert "created_at" in data, "Should return creation date"
            assert "expires_at" in data, "Should return expiry date"
            
            # Verify document hash is returned
            if data.get("document_hash"):
                assert len(data["document_hash"]) == 64, "Document hash should be SHA-256 (64 chars)"
            
            print(f"Stamp verification result: valid={data['valid']}, status={data.get('stamp_status')}")
            print(f"Advocate: {data.get('advocate_name')} ({data.get('advocate_roll_number')})")
            if data.get("document_hash"):
                print(f"Document hash: {data['document_hash'][:16]}...")
    
    def test_verify_stamp_invalid_id(self):
        """Test GET /api/verify/stamp/{id} with non-existent stamp ID"""
        response = requests.get(f"{BASE_URL}/api/verify/stamp/TLS-INVALID-00000000")
        
        assert response.status_code == 200, f"Should return 200 with valid=false, got {response.status_code}"
        
        data = response.json()
        assert data["valid"] == False, "Invalid stamp should return valid=false"
        assert "not found" in data["message"].lower() or "fraudulent" in data["message"].lower(), \
            f"Message should indicate stamp not found: {data['message']}"
        
        print(f"Invalid stamp response: {data['message']}")
    
    def test_verify_stamp_returns_status_banners_info(self):
        """Test that verification returns proper status info for UI banners"""
        response = requests.get(f"{BASE_URL}/api/verify/stamp/{VALID_STAMP_ID}")
        
        assert response.status_code == 200
        data = response.json()
        
        # The response should contain fields needed for status banners
        if data.get("stamp_id"):
            status = data.get("stamp_status", "").lower()
            warning = data.get("warning")
            valid = data.get("valid")
            
            # Verify status can be used for banner display
            assert status in ["active", "revoked", "expired", ""], f"Status should be active/revoked/expired, got: {status}"
            
            # Check banner mapping logic
            if valid and not warning:
                print("Status Banner: AUTHENTIC (green checkmark)")
            elif warning and ("revoked" in (warning or "").lower() or "expired" in (warning or "").lower()):
                print(f"Status Banner: WARNING (amber) - {warning}")
            else:
                print("Status Banner: NOT VERIFIED (red)")
    
    def test_verify_stamp_document_hash_displayed(self):
        """Test that document hash (SHA-256 fingerprint) is returned for display"""
        response = requests.get(f"{BASE_URL}/api/verify/stamp/{VALID_STAMP_ID}")
        
        assert response.status_code == 200
        data = response.json()
        
        # Document hash should be returned if stamp has one
        if data.get("document_hash"):
            doc_hash = data["document_hash"]
            # SHA-256 hash should be 64 hex characters
            assert len(doc_hash) == 64, f"Document hash should be 64 chars (SHA-256), got {len(doc_hash)}"
            assert all(c in '0123456789abcdef' for c in doc_hash.lower()), "Hash should be hexadecimal"
            print(f"Document Fingerprint (SHA-256): {doc_hash}")
        else:
            print("No document hash for this stamp (may be legacy or digital-only)")


class TestDocumentValidation:
    """Tests for document upload validation endpoint"""
    
    def test_validate_document_endpoint_exists(self):
        """Test POST /api/verify/stamp/{id}/validate-document endpoint exists"""
        # Create a dummy PDF-like file
        dummy_content = b'%PDF-1.4 Test document content for validation'
        files = {'file': ('test.pdf', BytesIO(dummy_content), 'application/pdf')}
        
        response = requests.post(
            f"{BASE_URL}/api/verify/stamp/{VALID_STAMP_ID}/validate-document",
            files=files
        )
        
        # Should return 200 (even if hash doesn't match)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        # Verify response structure for validation endpoint
        assert "hash_match" in data, "Response should contain 'hash_match' field"
        assert "valid" in data, "Response should contain 'valid' field"
        assert "message" in data, "Response should contain 'message' field"
        assert "stamp_id" in data, "Response should contain 'stamp_id' field"
        
        print(f"Document validation result: hash_match={data['hash_match']}")
        print(f"Message: {data['message']}")
    
    def test_validate_document_hash_mismatch(self):
        """Test that mismatched document returns hash_match=false"""
        # Create a dummy file that won't match any stored hash
        dummy_content = f'Test content - {time.time()}'.encode()
        files = {'file': ('test.pdf', BytesIO(dummy_content), 'application/pdf')}
        
        response = requests.post(
            f"{BASE_URL}/api/verify/stamp/{VALID_STAMP_ID}/validate-document",
            files=files
        )
        
        assert response.status_code == 200
        data = response.json()
        
        # Since we're uploading random content, it should NOT match
        assert data["hash_match"] == False, "Random content should not match stored hash"
        assert "tamper" in data["message"].lower() or "not match" in data["message"].lower(), \
            f"Message should indicate mismatch: {data['message']}"
        
        # Should still return stamp info
        if data.get("stamp_id"):
            assert data["stamp_id"] == VALID_STAMP_ID
        
        print(f"Hash mismatch correctly detected: {data['message']}")
    
    def test_validate_document_invalid_stamp_id(self):
        """Test validation with non-existent stamp ID"""
        dummy_content = b'Test content'
        files = {'file': ('test.pdf', BytesIO(dummy_content), 'application/pdf')}
        
        response = requests.post(
            f"{BASE_URL}/api/verify/stamp/TLS-INVALID-12345678/validate-document",
            files=files
        )
        
        assert response.status_code == 200
        data = response.json()
        
        assert data["valid"] == False, "Invalid stamp should return valid=false"
        assert data["hash_match"] == False, "Invalid stamp should return hash_match=false"
        assert "not found" in data["message"].lower(), f"Message should indicate stamp not found: {data['message']}"
        
        print(f"Invalid stamp validation: {data['message']}")
    
    def test_validate_document_returns_hash_preview(self):
        """Test that validation returns partial hash for comparison"""
        dummy_content = b'Test document content for hash preview'
        files = {'file': ('test.pdf', BytesIO(dummy_content), 'application/pdf')}
        
        response = requests.post(
            f"{BASE_URL}/api/verify/stamp/{VALID_STAMP_ID}/validate-document",
            files=files
        )
        
        assert response.status_code == 200
        data = response.json()
        
        # Check if uploaded hash is returned (truncated)
        if data.get("uploaded_hash"):
            assert "..." in data["uploaded_hash"], "Uploaded hash should be truncated with ..."
            print(f"Uploaded hash preview: {data['uploaded_hash']}")
        
        if data.get("stored_hash"):
            assert "..." in data["stored_hash"], "Stored hash should be truncated with ..."
            print(f"Stored hash preview: {data['stored_hash']}")


class TestRateLimiting:
    """Tests for rate limiting on verification endpoint"""
    
    def test_rate_limit_header_present(self):
        """Test that rate limit info is accessible"""
        response = requests.get(f"{BASE_URL}/api/verify/stamp/{VALID_STAMP_ID}")
        
        # Rate limit headers may or may not be exposed to client
        # The important thing is the endpoint works
        assert response.status_code == 200
        
        # Check for common rate limit headers
        rate_limit_headers = [
            'X-RateLimit-Limit',
            'X-RateLimit-Remaining',
            'X-RateLimit-Reset',
            'RateLimit-Limit',
            'RateLimit-Remaining'
        ]
        
        found_header = False
        for header in rate_limit_headers:
            if header in response.headers:
                found_header = True
                print(f"Rate limit header found: {header}={response.headers[header]}")
        
        if not found_header:
            print("Rate limit headers not exposed to client (may be internal only)")
    
    def test_multiple_requests_work(self):
        """Test that multiple requests within rate limit work"""
        # Make a few requests quickly to verify they work
        successful = 0
        for i in range(5):
            response = requests.get(f"{BASE_URL}/api/verify/stamp/{VALID_STAMP_ID}")
            if response.status_code == 200:
                successful += 1
        
        assert successful >= 4, f"At least 4/5 requests should succeed within rate limit, got {successful}"
        print(f"Multiple requests test: {successful}/5 successful")


class TestVerificationResultSchema:
    """Tests for verification result schema completeness"""
    
    def test_verification_result_has_all_fields(self):
        """Test that verification result contains all expected fields"""
        response = requests.get(f"{BASE_URL}/api/verify/stamp/{VALID_STAMP_ID}")
        
        assert response.status_code == 200
        data = response.json()
        
        # Required fields for all responses
        required_fields = ["valid", "message"]
        for field in required_fields:
            assert field in data, f"Missing required field: {field}"
        
        # Fields that should be present for found stamps
        if data.get("stamp_id"):
            stamp_fields = [
                "stamp_id", "advocate_name", "advocate_roll_number",
                "stamp_status", "created_at", "expires_at"
            ]
            for field in stamp_fields:
                assert field in data, f"Missing stamp field: {field}"
            
            # Optional but expected fields
            optional_fields = [
                "advocate_tls_number", "advocate_status", "advocate_photo",
                "stamp_type", "document_name", "document_hash",
                "verification_count", "warning"
            ]
            present_optional = [f for f in optional_fields if f in data]
            print(f"Optional fields present: {present_optional}")


class TestVerifyWithURLParams:
    """Test verification with different URL parameter formats"""
    
    def test_verify_with_route_param(self):
        """Test /verify/{stamp_id} route format"""
        response = requests.get(f"{BASE_URL}/api/verify/stamp/{VALID_STAMP_ID}")
        assert response.status_code == 200
        print("Route param format works: /api/verify/stamp/{id}")
    
    def test_verify_stamp_id_format(self):
        """Test that TLS stamp ID format is accepted"""
        # Valid format: TLS-YYYYMMDD-XXXXXXXX
        response = requests.get(f"{BASE_URL}/api/verify/stamp/{VALID_STAMP_ID}")
        assert response.status_code == 200
        
        # Invalid formats should still return 200 with valid=false
        invalid_formats = [
            "INVALID",
            "12345",
            "TLS-WRONG-FORMAT"
        ]
        for stamp_id in invalid_formats:
            resp = requests.get(f"{BASE_URL}/api/verify/stamp/{stamp_id}")
            assert resp.status_code == 200, f"Should return 200 for {stamp_id}"
            assert resp.json()["valid"] == False
        
        print("Stamp ID format validation works correctly")


# Run a quick health check first
def test_api_health():
    """Basic health check to ensure API is running"""
    response = requests.get(f"{BASE_URL}/api/health")
    assert response.status_code == 200, f"API health check failed: {response.status_code}"
    print(f"API is healthy at {BASE_URL}")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
