"""
Test file for Iteration 66 - Batch Stamping and Gotenberg Integration

Features tested:
1. Batch stamping API endpoint (/api/documents/batch-stamp)
2. Batch stamps history endpoint (/api/documents/batch-stamps)
3. Admin services status endpoint (/api/admin/services/status)
4. DOCX conversion endpoint with Gotenberg fallback
"""

import pytest
import requests
import os
from io import BytesIO
from reportlab.lib.pagesizes import letter
from reportlab.pdfgen import canvas
import json

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
TEST_ADVOCATE_EMAIL = "test@tls.or.tz"
TEST_ADVOCATE_PASSWORD = "Test@12345678!"
TEST_ADMIN_EMAIL = "admin@tls.or.tz"
TEST_ADMIN_PASSWORD = "TLS@Admin2024"


def create_test_pdf(filename="test_document.pdf", content_text="This is a test document for batch stamping"):
    """Create a simple test PDF file in memory"""
    buffer = BytesIO()
    c = canvas.Canvas(buffer, pagesize=letter)
    c.setFont("Helvetica", 12)
    c.drawString(72, 700, content_text)
    c.drawString(72, 680, f"File: {filename}")
    c.save()
    buffer.seek(0)
    return buffer.read()


@pytest.fixture(scope="module")
def api_client():
    """Shared requests session"""
    session = requests.Session()
    session.headers.update({"Content-Type": "application/json"})
    return session


@pytest.fixture(scope="module")
def advocate_token(api_client):
    """Get authentication token for advocate user"""
    response = api_client.post(
        f"{BASE_URL}/api/auth/login",
        json={"email": TEST_ADVOCATE_EMAIL, "password": TEST_ADVOCATE_PASSWORD}
    )
    if response.status_code == 200:
        return response.json().get("access_token")
    pytest.skip(f"Advocate authentication failed: {response.status_code} - {response.text}")


@pytest.fixture(scope="module")
def admin_token(api_client):
    """Get authentication token for admin user"""
    response = api_client.post(
        f"{BASE_URL}/api/auth/login",
        json={"email": TEST_ADMIN_EMAIL, "password": TEST_ADMIN_PASSWORD}
    )
    if response.status_code == 200:
        return response.json().get("access_token")
    pytest.skip(f"Admin authentication failed: {response.status_code} - {response.text}")


@pytest.fixture(scope="module")
def authenticated_advocate(api_client, advocate_token):
    """Session with advocate auth header"""
    session = requests.Session()
    session.headers.update({
        "Authorization": f"Bearer {advocate_token}",
        "Content-Type": "application/json"
    })
    return session


@pytest.fixture(scope="module")
def authenticated_admin(api_client, admin_token):
    """Session with admin auth header"""
    session = requests.Session()
    session.headers.update({
        "Authorization": f"Bearer {admin_token}",
        "Content-Type": "application/json"
    })
    return session


class TestBatchStampingEndpoint:
    """Test batch stamping API functionality"""
    
    def test_batch_stamp_requires_authentication(self, api_client):
        """Test that batch stamp endpoint requires authentication"""
        pdf_content = create_test_pdf("unauth_test.pdf")
        
        response = requests.post(
            f"{BASE_URL}/api/documents/batch-stamp",
            files=[("files", ("test.pdf", pdf_content, "application/pdf"))],
            data={"recipient_name": "Test Recipient"}
        )
        
        # Should return 401 without auth
        assert response.status_code in [401, 403], f"Expected 401/403 without auth, got {response.status_code}"
        print("✓ Batch stamp endpoint requires authentication")
    
    def test_batch_stamp_with_single_pdf(self, authenticated_advocate, advocate_token):
        """Test batch stamping with a single PDF file"""
        pdf_content = create_test_pdf("single_batch_test.pdf", "Single file batch stamp test")
        
        response = requests.post(
            f"{BASE_URL}/api/documents/batch-stamp",
            headers={"Authorization": f"Bearer {advocate_token}"},
            files=[("files", ("single_test.pdf", pdf_content, "application/pdf"))],
            data={
                "recipient_name": "Test Recipient Single",
                "document_type": "contract",
                "stamp_type": "certification",
                "anchor": "bottom_right",
                "page_mode": "first",
                "border_color": "#10B981"
            }
        )
        
        # Check response
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text[:500]}"
        
        # Should return a ZIP file
        assert "application/zip" in response.headers.get("Content-Type", ""), "Response should be a ZIP file"
        
        # Check custom headers
        assert "X-Batch-ID" in response.headers, "Missing X-Batch-ID header"
        assert "X-Total-Files" in response.headers, "Missing X-Total-Files header"
        assert response.headers.get("X-Total-Files") == "1", f"Expected 1 file, got {response.headers.get('X-Total-Files')}"
        
        # Verify ZIP content is valid
        assert len(response.content) > 100, "ZIP file seems too small"
        
        print(f"✓ Batch stamp single file successful - Batch ID: {response.headers.get('X-Batch-ID')}")
        print(f"  Success count: {response.headers.get('X-Success-Count')}/{response.headers.get('X-Total-Files')}")
    
    def test_batch_stamp_with_multiple_pdfs(self, advocate_token):
        """Test batch stamping with multiple PDF files"""
        pdf_files = [
            ("files", (f"batch_test_{i}.pdf", create_test_pdf(f"batch_test_{i}.pdf", f"Document {i} content"), "application/pdf"))
            for i in range(3)
        ]
        
        response = requests.post(
            f"{BASE_URL}/api/documents/batch-stamp",
            headers={"Authorization": f"Bearer {advocate_token}"},
            files=pdf_files,
            data={
                "recipient_name": "Multi-File Test Recipient",
                "document_type": "affidavit",
                "stamp_type": "notarization",
                "anchor": "bottom_center",
                "page_mode": "all",
                "border_color": "#3B82F6"
            }
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text[:500]}"
        assert "application/zip" in response.headers.get("Content-Type", "")
        
        total = int(response.headers.get("X-Total-Files", 0))
        success = int(response.headers.get("X-Success-Count", 0))
        
        assert total == 3, f"Expected 3 total files, got {total}"
        assert success >= 1, f"Expected at least 1 success, got {success}"
        
        print(f"✓ Batch stamp multiple files successful - {success}/{total} stamped")
    
    def test_batch_stamp_rejects_non_pdf(self, advocate_token):
        """Test that batch stamp rejects non-PDF files"""
        response = requests.post(
            f"{BASE_URL}/api/documents/batch-stamp",
            headers={"Authorization": f"Bearer {advocate_token}"},
            files=[("files", ("test.txt", b"This is a text file", "text/plain"))],
            data={"recipient_name": "Test"}
        )
        
        assert response.status_code == 400, f"Expected 400 for non-PDF, got {response.status_code}"
        print("✓ Batch stamp correctly rejects non-PDF files")
    
    def test_batch_stamp_validates_file_count_limit(self, advocate_token):
        """Test that batch stamp enforces file count limit (max 25)"""
        # Create 26 PDF files
        pdf_files = [
            ("files", (f"limit_test_{i}.pdf", create_test_pdf(f"limit_test_{i}.pdf"), "application/pdf"))
            for i in range(26)
        ]
        
        response = requests.post(
            f"{BASE_URL}/api/documents/batch-stamp",
            headers={"Authorization": f"Bearer {advocate_token}"},
            files=pdf_files,
            data={"recipient_name": "Limit Test"}
        )
        
        assert response.status_code == 400, f"Expected 400 for exceeding limit, got {response.status_code}"
        assert "25" in response.text or "Maximum" in response.text, "Error should mention file limit"
        print("✓ Batch stamp correctly enforces 25 file limit")


class TestBatchStampsHistoryEndpoint:
    """Test batch stamps history API"""
    
    def test_get_batch_stamps_history(self, authenticated_advocate):
        """Test getting batch stamps history"""
        response = authenticated_advocate.get(f"{BASE_URL}/api/documents/batch-stamps")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        
        print(f"✓ Batch stamps history retrieved - {len(data)} records found")
        
        if len(data) > 0:
            # Verify structure of batch record
            batch = data[0]
            print(f"  Sample batch: {batch.get('batch_id', 'N/A')} - {batch.get('file_count', 0)} files")
    
    def test_batch_stamps_requires_auth(self):
        """Test that batch stamps history requires authentication"""
        response = requests.get(f"{BASE_URL}/api/documents/batch-stamps")
        
        assert response.status_code in [401, 403], f"Expected 401/403, got {response.status_code}"
        print("✓ Batch stamps history requires authentication")


class TestAdminServicesStatusEndpoint:
    """Test admin services status endpoint"""
    
    def test_services_status_requires_admin(self, authenticated_advocate):
        """Test that services status requires admin role"""
        response = authenticated_advocate.get(f"{BASE_URL}/api/admin/services/status")
        
        # Advocate should get 403 (not admin)
        assert response.status_code == 403, f"Expected 403 for non-admin, got {response.status_code}"
        print("✓ Services status correctly requires admin role")
    
    def test_services_status_with_admin(self, authenticated_admin):
        """Test services status with admin credentials"""
        response = authenticated_admin.get(f"{BASE_URL}/api/admin/services/status")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "services" in data, "Response should contain 'services' key"
        assert "timestamp" in data, "Response should contain 'timestamp'"
        
        services = data["services"]
        
        # Check Gotenberg service status structure
        assert "gotenberg" in services, "Should include gotenberg service status"
        gotenberg = services["gotenberg"]
        assert "configured" in gotenberg, "Gotenberg status should have 'configured' field"
        assert "healthy" in gotenberg, "Gotenberg status should have 'healthy' field"
        
        # Check MongoDB status
        assert "mongodb" in services, "Should include mongodb service status"
        mongodb = services["mongodb"]
        assert mongodb.get("healthy") == True, "MongoDB should be healthy"
        
        print(f"✓ Services status retrieved successfully")
        print(f"  Gotenberg: configured={gotenberg.get('configured')}, healthy={gotenberg.get('healthy')}")
        print(f"  MongoDB: healthy={mongodb.get('healthy')}")
        
        # Note: Gotenberg may not be deployed, so we just verify the status is reported correctly
        if not gotenberg.get("configured"):
            print("  Note: Gotenberg is not configured (expected in this environment)")
    
    def test_services_status_returns_timestamp(self, authenticated_admin):
        """Test that services status returns valid timestamp"""
        response = authenticated_admin.get(f"{BASE_URL}/api/admin/services/status")
        
        assert response.status_code == 200
        data = response.json()
        
        timestamp = data.get("timestamp")
        assert timestamp is not None, "Should have timestamp"
        assert "T" in timestamp, "Timestamp should be ISO format"
        print(f"✓ Services status timestamp: {timestamp}")


class TestDocxConversionWithFallback:
    """Test DOCX conversion endpoint (with Gotenberg fallback)"""
    
    def test_prepare_document_with_pdf(self, advocate_token):
        """Test prepare-document endpoint with PDF file"""
        pdf_content = create_test_pdf("prepare_test.pdf", "Prepare document test")
        
        response = requests.post(
            f"{BASE_URL}/api/documents/prepare-document",
            headers={"Authorization": f"Bearer {advocate_token}"},
            files=[("file", ("test_prepare.pdf", pdf_content, "application/pdf"))]
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text[:500]}"
        
        data = response.json()
        assert "hash" in data, "Response should include document hash"
        assert "pages" in data, "Response should include page count"
        assert data.get("converted") == False, "PDF should not be converted"
        
        print(f"✓ PDF prepare-document successful - {data.get('pages')} page(s), hash: {data.get('hash', '')[:16]}...")
    
    def test_prepare_document_endpoint_exists(self, advocate_token):
        """Test that prepare-document endpoint is accessible"""
        # Just verify the endpoint exists and requires a file
        response = requests.post(
            f"{BASE_URL}/api/documents/prepare-document",
            headers={"Authorization": f"Bearer {advocate_token}"},
            data={}  # No file - should get validation error
        )
        
        # Should get 422 (validation error) or 400, not 404
        assert response.status_code in [400, 422], f"Expected 400/422, got {response.status_code}"
        print("✓ Prepare-document endpoint exists and validates input")


class TestHealthAndBasicEndpoints:
    """Test basic health and API endpoints"""
    
    def test_api_health(self):
        """Test API health endpoint"""
        response = requests.get(f"{BASE_URL}/api/health")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        assert data.get("status") == "healthy", f"Expected healthy status, got {data.get('status')}"
        print(f"✓ API health check passed - {data.get('timestamp')}")
    
    def test_authentication_works(self, api_client):
        """Test that authentication is working"""
        response = api_client.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": TEST_ADVOCATE_EMAIL, "password": TEST_ADVOCATE_PASSWORD}
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        assert "access_token" in data, "Should return access_token"
        assert "user" in data, "Should return user info"
        print(f"✓ Authentication working - User: {data['user'].get('full_name')}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
