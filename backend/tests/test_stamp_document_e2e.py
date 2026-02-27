"""
E2E Document Stamping Tests - TLS Digital Stamping Platform

Tests:
1. PDF upload and document preparation
2. Stamp rendering (render-image endpoint)
3. Document stamping (stamp endpoint)
4. Stamp type switching (certification vs notarization)
5. Multi-page scan document preparation

Test credentials: test@tls.or.tz / Test@12345678!
"""

import pytest
import requests
import os
import io
from reportlab.pdfgen import canvas
from reportlab.lib.pagesizes import letter

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://doc-prepare.preview.emergentagent.com').rstrip('/')

# Test credentials
TEST_EMAIL = "test@tls.or.tz"
TEST_PASSWORD = "Test@12345678!"


def create_test_pdf(filename="test_document.pdf"):
    """Create a simple test PDF for upload testing"""
    buffer = io.BytesIO()
    c = canvas.Canvas(buffer, pagesize=letter)
    width, height = letter
    
    c.setFont("Helvetica-Bold", 24)
    c.drawString(100, height - 100, "TEST AGREEMENT")
    c.setFont("Helvetica", 12)
    c.drawString(100, height - 150, "Date: February 27, 2026")
    c.drawString(100, height - 170, "Recipient: John Doe")
    c.drawString(100, height - 190, "Agreement No: AGR-2026-001")
    c.drawString(100, height - 250, "This is a test document for TLS Digital Stamping.")
    c.save()
    
    buffer.seek(0)
    return buffer.read()


@pytest.fixture(scope="module")
def auth_token():
    """Get authentication token for API requests"""
    response = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": TEST_EMAIL,
        "password": TEST_PASSWORD
    })
    
    if response.status_code != 200:
        pytest.skip(f"Login failed: {response.status_code} - {response.text}")
    
    data = response.json()
    return data.get("access_token")


@pytest.fixture
def auth_headers(auth_token):
    """Return headers with auth token"""
    return {"Authorization": f"Bearer {auth_token}"}


class TestDocumentUpload:
    """Test document upload functionality"""
    
    def test_upload_pdf_document(self, auth_headers):
        """Test uploading a PDF document"""
        pdf_data = create_test_pdf()
        
        files = {"file": ("test_document.pdf", pdf_data, "application/pdf")}
        response = requests.post(
            f"{BASE_URL}/api/documents/upload",
            files=files,
            headers=auth_headers
        )
        
        assert response.status_code == 200, f"Upload failed: {response.text}"
        data = response.json()
        
        assert "document_data" in data, "Response missing document_data"
        assert "pages" in data, "Response missing pages count"
        assert data["pages"] >= 1, "Document should have at least 1 page"
        print(f"PDF uploaded: {data['pages']} pages")
    
    def test_upload_image_converts_to_pdf(self, auth_headers):
        """Test that image upload converts to PDF"""
        # Create a simple PNG image (1x1 white pixel)
        from PIL import Image
        import io
        
        img = Image.new('RGB', (100, 100), color='white')
        img_buffer = io.BytesIO()
        img.save(img_buffer, format='PNG')
        img_buffer.seek(0)
        
        files = {"file": ("test_image.png", img_buffer.read(), "image/png")}
        response = requests.post(
            f"{BASE_URL}/api/documents/upload",
            files=files,
            headers=auth_headers
        )
        
        assert response.status_code == 200, f"Image upload failed: {response.text}"
        data = response.json()
        
        assert "document_data" in data, "Response missing document_data"
        assert data.get("converted") is True, "Image should be converted to PDF"
        print("Image uploaded and converted to PDF")


class TestStampRendering:
    """Test stamp rendering endpoint"""
    
    def test_render_certification_stamp(self, auth_headers):
        """Test rendering a certification stamp"""
        form_data = {
            "stamp_type": "certification",
            "brand_color": "#10B981",
            "advocate_name": "Test Advocate",
            "include_signature": "false",
            "show_signature_placeholder": "true"
        }
        
        response = requests.post(
            f"{BASE_URL}/api/stamps/render-image",
            data=form_data,
            headers=auth_headers
        )
        
        assert response.status_code == 200, f"Render failed: {response.text}"
        assert response.headers.get("content-type") == "image/png", "Should return PNG image"
        
        # Check dimensions from headers
        width_pt = response.headers.get("x-stamp-width-pt")
        height_pt = response.headers.get("x-stamp-height-pt")
        
        assert width_pt is not None, "Missing x-stamp-width-pt header"
        assert height_pt is not None, "Missing x-stamp-height-pt header"
        
        print(f"Certification stamp rendered: {width_pt}x{height_pt}pt")
    
    def test_render_notarization_stamp(self, auth_headers):
        """Test rendering a notarization stamp (no signature)"""
        form_data = {
            "stamp_type": "notarization",
            "brand_color": "#3B82F6",
            "advocate_name": "Test Advocate",
            "include_signature": "false",
            "show_signature_placeholder": "false"
        }
        
        response = requests.post(
            f"{BASE_URL}/api/stamps/render-image",
            data=form_data,
            headers=auth_headers
        )
        
        assert response.status_code == 200, f"Render failed: {response.text}"
        assert response.headers.get("content-type") == "image/png"
        
        width_pt = response.headers.get("x-stamp-width-pt")
        height_pt = response.headers.get("x-stamp-height-pt")
        
        print(f"Notarization stamp rendered: {width_pt}x{height_pt}pt")


class TestDocumentStamping:
    """Test complete document stamping flow"""
    
    def test_stamp_pdf_certification(self, auth_headers):
        """Test stamping a PDF with certification stamp"""
        pdf_data = create_test_pdf()
        
        # Build stamp position data
        stamp_position = {
            "page": 1,
            "pages": [1],
            "positions": {"1": {"x": 400, "y": 700}},
            "stamp_width_pt": 150,
            "stamp_height_pt": 95,
            "edge_margin_pt": 12,
            "page_width_pt": 612,
            "page_height_pt": 792,
            "scale": 1.5,
            "stamp_version": "tls_standard_v1"
        }
        
        files = {"file": ("test_document.pdf", pdf_data, "application/pdf")}
        data = {
            "stamp_type": "certification",
            "stamp_position": str(stamp_position).replace("'", '"'),
            "document_name": "Test Agreement",
            "document_type": "contract",
            "description": "Test stamping",
            "recipient_name": "Jane Doe",
            "recipient_org": "",
            "brand_color": "#10B981",
            "show_advocate_name": "true",
            "show_tls_logo": "true",
            "layout": "horizontal",
            "shape": "rectangle",
            "include_signature": "false",
            "show_signature_placeholder": "true",
            "stamp_size": "100",
            "opacity": "100",
            "transparent_background": "true"
        }
        
        response = requests.post(
            f"{BASE_URL}/api/documents/stamp",
            files=files,
            data=data,
            headers=auth_headers
        )
        
        assert response.status_code == 200, f"Stamp failed: {response.text}"
        result = response.json()
        
        assert "stamp_id" in result, "Response missing stamp_id"
        assert "stamped_document" in result, "Response missing stamped_document"
        assert result["stamp_id"].startswith("TLS-"), "Stamp ID should start with TLS-"
        
        print(f"Document stamped successfully: {result['stamp_id']}")
        return result["stamp_id"]
    
    def test_stamp_pdf_notarization(self, auth_headers):
        """Test stamping a PDF with notarization stamp"""
        pdf_data = create_test_pdf()
        
        stamp_position = {
            "page": 1,
            "pages": [1],
            "positions": {"1": {"x": 400, "y": 700}},
            "stamp_width_pt": 140,
            "stamp_height_pt": 75,
            "edge_margin_pt": 12,
            "page_width_pt": 612,
            "page_height_pt": 792,
            "scale": 1.5,
            "stamp_version": "tls_standard_v1"
        }
        
        files = {"file": ("test_document.pdf", pdf_data, "application/pdf")}
        data = {
            "stamp_type": "notarization",
            "stamp_position": str(stamp_position).replace("'", '"'),
            "document_name": "Notarized Document",
            "document_type": "affidavit",
            "description": "Notarization test",
            "recipient_name": "John Smith",
            "recipient_org": "ABC Corp",
            "brand_color": "#3B82F6",
            "show_advocate_name": "true",
            "show_tls_logo": "true",
            "layout": "horizontal",
            "shape": "rectangle",
            "include_signature": "false",
            "show_signature_placeholder": "false",
            "stamp_size": "100",
            "opacity": "100",
            "transparent_background": "true"
        }
        
        response = requests.post(
            f"{BASE_URL}/api/documents/stamp",
            files=files,
            data=data,
            headers=auth_headers
        )
        
        assert response.status_code == 200, f"Stamp failed: {response.text}"
        result = response.json()
        
        assert "stamp_id" in result
        print(f"Notarization stamp created: {result['stamp_id']}")


class TestDocumentPrepareScan:
    """Test multi-page scan document preparation (CamScanner-style)"""
    
    def test_prepare_single_image(self, auth_headers):
        """Test preparing a single scanned image into PDF"""
        from PIL import Image
        import io
        
        # Create a test image (simulating a scanned document)
        img = Image.new('RGB', (800, 1000), color='white')
        img_buffer = io.BytesIO()
        img.save(img_buffer, format='JPEG')
        img_buffer.seek(0)
        
        files = [("files", ("scan1.jpg", img_buffer.read(), "image/jpeg"))]
        data = {
            "scan_mode": "document",
            "auto_crop": "true",
            "dpi": "150",
            "source": "scan"
        }
        
        response = requests.post(
            f"{BASE_URL}/api/documents/prepare",
            files=files,
            data=data,
            headers=auth_headers
        )
        
        assert response.status_code == 200, f"Prepare failed: {response.status_code}"
        assert response.headers.get("content-type") == "application/pdf"
        
        # Check headers for scan metadata
        pages = response.headers.get("x-prepared-pages")
        auto_cropped = response.headers.get("x-auto-crop")
        
        print(f"Scan prepared: {pages} pages, auto-crop={auto_cropped}")


class TestStampVerification:
    """Test stamp verification endpoint"""
    
    def test_verify_valid_stamp(self, auth_headers):
        """Test verifying a valid stamp"""
        # First create a stamp
        pdf_data = create_test_pdf()
        
        stamp_position = {
            "page": 1,
            "pages": [1],
            "positions": {"1": {"x": 400, "y": 700}},
            "stamp_width_pt": 150,
            "stamp_height_pt": 95,
            "edge_margin_pt": 12,
            "page_width_pt": 612,
            "page_height_pt": 792,
            "scale": 1.5,
            "stamp_version": "tls_standard_v1"
        }
        
        files = {"file": ("test_document.pdf", pdf_data, "application/pdf")}
        data = {
            "stamp_type": "certification",
            "stamp_position": str(stamp_position).replace("'", '"'),
            "document_name": "Verification Test",
            "document_type": "contract",
            "recipient_name": "Test Recipient",
            "brand_color": "#10B981",
            "show_advocate_name": "true",
            "show_tls_logo": "true",
            "layout": "horizontal",
            "shape": "rectangle",
            "include_signature": "false",
            "show_signature_placeholder": "true",
            "transparent_background": "true"
        }
        
        stamp_response = requests.post(
            f"{BASE_URL}/api/documents/stamp",
            files=files,
            data=data,
            headers=auth_headers
        )
        
        assert stamp_response.status_code == 200
        stamp_id = stamp_response.json()["stamp_id"]
        
        # Now verify the stamp
        verify_response = requests.get(f"{BASE_URL}/api/verify/{stamp_id}")
        
        assert verify_response.status_code == 200
        verify_data = verify_response.json()
        
        assert verify_data.get("valid") is True, "Stamp should be valid"
        assert verify_data.get("stamp_id") == stamp_id
        
        print(f"Stamp {stamp_id} verified successfully")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
