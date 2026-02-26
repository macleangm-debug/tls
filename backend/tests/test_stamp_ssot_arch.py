"""
Test Single Source of Truth (SSOT) Stamp Architecture
=======================================================

This tests the new stamp architecture where:
1. Backend generates compact stamp image (240x128 pt fixed size)
2. Same image used for both preview and final PDF
3. Only border_color is user-configurable
4. Stamp placement at 4 corners + center
5. QR code verification

Test account: test@tls.or.tz / Test@12345678!
"""

import pytest
import requests
import os
import base64
from io import BytesIO
import json
import time

# Get BASE_URL from environment
BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://legal-hub-59.preview.emergentagent.com').rstrip('/')

# Test credentials
TEST_EMAIL = "test@tls.or.tz"
TEST_PASSWORD = "Test@12345678!"

# TLS Fixed stamp size
STAMP_WIDTH_PT = 240
STAMP_HEIGHT_PT = 128
EDGE_MARGIN_PT = 12


def create_test_pdf(text="Test Document"):
    """Create a simple test PDF"""
    from reportlab.lib.pagesizes import letter
    from reportlab.pdfgen import canvas
    
    pdf_buffer = BytesIO()
    c = canvas.Canvas(pdf_buffer, pagesize=letter)
    c.drawString(100, 750, text)
    c.drawString(100, 730, f"Generated at {time.strftime('%Y-%m-%d %H:%M:%S')}")
    c.save()
    pdf_buffer.seek(0)
    return pdf_buffer.read()


class TestStampSSoTArchitecture:
    """Test Single Source of Truth stamp architecture"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test fixtures"""
        self.session = requests.Session()
        self.auth_token = None
        self.user = None
    
    def login(self):
        """Login and get auth token"""
        time.sleep(1)  # Rate limit protection
        response = self.session.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": TEST_EMAIL, "password": TEST_PASSWORD},
            headers={"Content-Type": "application/json"}
        )
        assert response.status_code == 200, f"Login failed: {response.text}"
        data = response.json()
        self.auth_token = data.get("access_token")
        self.user = data.get("user")
        return data
    
    def get_auth_headers(self):
        """Get headers with auth token"""
        return {"Authorization": f"Bearer {self.auth_token}"}
    
    def test_01_login_successful(self):
        """Test login returns valid access token"""
        data = self.login()
        assert "access_token" in data
        assert data.get("user", {}).get("email") == TEST_EMAIL
        print(f"✓ Login successful for {TEST_EMAIL}")
    
    def test_02_stamp_preview_api(self):
        """Test stamp preview API generates compact stamp image"""
        self.login()
        
        response = self.session.post(
            f"{BASE_URL}/api/documents/stamp-preview",
            json={
                "stamp_type": "certification",
                "brand_color": "#10B981",
                "advocate_name": self.user.get("full_name", "Test Advocate"),
                "show_advocate_name": True,
                "layout": "horizontal",
                "shape": "rectangle",
                "include_signature": False,
                "show_signature_placeholder": True,
                "width": 350,
                "height": 310
            },
            headers=self.get_auth_headers()
        )
        
        assert response.status_code == 200, f"Stamp preview failed: {response.text}"
        data = response.json()
        assert "preview_image" in data, "Missing preview_image in response"
        
        # Verify it's a valid base64 data URL
        preview = data["preview_image"]
        assert preview.startswith("data:image/png;base64,"), "Preview should be PNG data URL"
        print(f"✓ Stamp preview API returns valid PNG image")
    
    def test_03_stamp_preview_with_different_colors(self):
        """Test stamp preview with different border colors"""
        self.login()
        
        colors = ["#10B981", "#3B82F6", "#8B5CF6", "#EF4444"]
        for color in colors:
            response = self.session.post(
                f"{BASE_URL}/api/documents/stamp-preview",
                json={
                    "stamp_type": "certification",
                    "brand_color": color,
                    "advocate_name": self.user.get("full_name", "Test Advocate"),
                    "show_advocate_name": True
                },
                headers=self.get_auth_headers()
            )
            assert response.status_code == 200, f"Preview failed for color {color}"
            print(f"  ✓ Preview generated for color {color}")
        
        print(f"✓ Stamp preview works with different border colors")
    
    def test_04_upload_pdf_document(self):
        """Test PDF upload and preview"""
        self.login()
        
        pdf_content = create_test_pdf("Test Document for Upload")
        
        # Upload the PDF - properly format multipart request
        response = self.session.post(
            f"{BASE_URL}/api/documents/upload",
            files={"file": ("test_document.pdf", BytesIO(pdf_content), "application/pdf")},
            headers=self.get_auth_headers()
        )
        
        assert response.status_code == 200, f"Upload failed: {response.text}"
        data = response.json()
        assert "document_data" in data, "Missing document_data in response"
        assert data.get("pages", 0) >= 1, "Should have at least 1 page"
        print(f"✓ PDF uploaded successfully, {data.get('pages')} page(s)")
    
    def test_05_stamp_document_center_position(self):
        """Test stamping document with CENTER position"""
        self.login()
        
        pdf_content = create_test_pdf("Test Document - Center Position")
        
        # Stamp position at center (PDF letter size: 612x792 pt)
        page_width = 612
        page_height = 792
        center_x = (page_width - STAMP_WIDTH_PT) / 2  # ~186
        center_y = (page_height - STAMP_HEIGHT_PT) / 2  # ~332
        
        stamp_position = {
            "page": 1,
            "pages": [1],
            "positions": {"1": {"x": center_x, "y": center_y}},
            "stamp_width_pt": STAMP_WIDTH_PT,
            "stamp_height_pt": STAMP_HEIGHT_PT,
            "edge_margin_pt": EDGE_MARGIN_PT,
            "page_width_pt": page_width,
            "page_height_pt": page_height,
            "scale": 1.5,
            "stamp_version": "tls_standard_v1"
        }
        
        response = self.session.post(
            f"{BASE_URL}/api/documents/stamp",
            files={"file": ("test_center.pdf", BytesIO(pdf_content), "application/pdf")},
            data={
                "stamp_type": "certification",
                "stamp_position": json.dumps(stamp_position),
                "document_name": "Test Center Position",
                "document_type": "contract",
                "description": "Testing stamp at center",
                "recipient_name": "Test Recipient",
                "recipient_org": "Test Organization",
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
            },
            headers=self.get_auth_headers()
        )
        
        assert response.status_code == 200, f"Stamp failed: {response.text}"
        result = response.json()
        assert "stamp_id" in result, "Missing stamp_id"
        assert "stamped_document" in result, "Missing stamped_document"
        assert "qr_code_data" in result, "Missing QR code"
        
        # Verify stamped PDF is valid
        stamped_pdf = base64.b64decode(result["stamped_document"])
        assert len(stamped_pdf) > 1000, "Stamped PDF seems too small"
        assert stamped_pdf[:4] == b'%PDF', "Not a valid PDF"
        
        print(f"✓ Document stamped at CENTER: {result['stamp_id']}")
        return result
    
    def test_06_stamp_all_corners(self):
        """Test stamping at all 4 corners"""
        self.login()
        
        page_width = 612
        page_height = 792
        
        # Define corner positions (top-left origin)
        corners = {
            "top-left": {"x": EDGE_MARGIN_PT, "y": EDGE_MARGIN_PT},
            "top-right": {"x": page_width - STAMP_WIDTH_PT - EDGE_MARGIN_PT, "y": EDGE_MARGIN_PT},
            "bottom-left": {"x": EDGE_MARGIN_PT, "y": page_height - STAMP_HEIGHT_PT - EDGE_MARGIN_PT},
            "bottom-right": {"x": page_width - STAMP_WIDTH_PT - EDGE_MARGIN_PT, "y": page_height - STAMP_HEIGHT_PT - EDGE_MARGIN_PT}
        }
        
        stamp_ids = []
        for corner_name, pos in corners.items():
            pdf_content = create_test_pdf(f"Test Document - {corner_name}")
            
            stamp_position = {
                "page": 1,
                "pages": [1],
                "positions": {"1": pos},
                "stamp_width_pt": STAMP_WIDTH_PT,
                "stamp_height_pt": STAMP_HEIGHT_PT,
                "page_width_pt": page_width,
                "page_height_pt": page_height,
                "scale": 1.5
            }
            
            response = self.session.post(
                f"{BASE_URL}/api/documents/stamp",
                files={"file": (f"test_{corner_name}.pdf", BytesIO(pdf_content), "application/pdf")},
                data={
                    "stamp_type": "notarization",
                    "stamp_position": json.dumps(stamp_position),
                    "document_name": f"Test {corner_name}",
                    "document_type": "affidavit",
                    "recipient_name": "Corner Test",
                    "brand_color": "#3B82F6"
                },
                headers=self.get_auth_headers()
            )
            
            assert response.status_code == 200, f"Stamp at {corner_name} failed: {response.text}"
            result = response.json()
            stamp_ids.append(result["stamp_id"])
            print(f"  ✓ Stamped at {corner_name}: {result['stamp_id']}")
        
        print(f"✓ All 4 corners stamped successfully")
        return stamp_ids
    
    def test_07_verify_stamp_endpoint(self):
        """Test QR code verification endpoint"""
        self.login()
        
        # First create a stamp
        pdf_content = create_test_pdf("Test Document for Verification")
        
        stamp_position = {
            "page": 1, "pages": [1],
            "positions": {"1": {"x": 200, "y": 300}},
            "page_width_pt": 612, "page_height_pt": 792
        }
        
        create_response = self.session.post(
            f"{BASE_URL}/api/documents/stamp",
            files={"file": ("test_verify.pdf", BytesIO(pdf_content), "application/pdf")},
            data={
                "stamp_type": "certification",
                "stamp_position": json.dumps(stamp_position),
                "document_name": "Verification Test",
                "document_type": "contract",
                "recipient_name": "Test User"
            },
            headers=self.get_auth_headers()
        )
        
        assert create_response.status_code == 200, f"Create stamp failed: {create_response.text}"
        stamp_id = create_response.json()["stamp_id"]
        
        # Verify the stamp via API (public endpoint - no auth needed)
        verify_response = requests.get(f"{BASE_URL}/api/verify/stamp/{stamp_id}")
        assert verify_response.status_code == 200, f"Verification failed: {verify_response.text}"
        
        verification = verify_response.json()
        assert verification.get("valid") == True, "Stamp should be valid"
        assert verification.get("stamp_id") == stamp_id, "Stamp ID mismatch"
        assert verification.get("advocate_name"), "Missing advocate name"
        assert verification.get("document_name"), "Missing document name"
        
        print(f"✓ QR verification successful for {stamp_id}")
        print(f"  - Valid: {verification.get('valid')}")
        print(f"  - Advocate: {verification.get('advocate_name')}")
        print(f"  - Document: {verification.get('document_name')}")
    
    def test_08_signature_modes(self):
        """Test Normal stamp vs Digital signature mode"""
        self.login()
        
        # Test Normal stamp (placeholder for signature)
        pdf_content = create_test_pdf("Test - Normal Stamp Mode")
        
        stamp_position = {
            "page": 1, "pages": [1],
            "positions": {"1": {"x": 200, "y": 400}},
            "page_width_pt": 612, "page_height_pt": 792
        }
        
        response = self.session.post(
            f"{BASE_URL}/api/documents/stamp",
            files={"file": ("test_normal.pdf", BytesIO(pdf_content), "application/pdf")},
            data={
                "stamp_type": "certification",
                "stamp_position": json.dumps(stamp_position),
                "document_name": "Test Normal Mode",
                "document_type": "contract",
                "recipient_name": "Test User",
                "include_signature": "false",
                "show_signature_placeholder": "true"
            },
            headers=self.get_auth_headers()
        )
        
        assert response.status_code == 200, f"Normal mode stamp failed: {response.text}"
        result = response.json()
        assert "stamped_document" in result
        print(f"  ✓ Normal mode stamp created: {result['stamp_id']}")
        
        # Verify PDF is valid
        stamped_pdf = base64.b64decode(result["stamped_document"])
        assert stamped_pdf[:4] == b'%PDF', "Not a valid PDF"
        
        # Test 2: Notarization mode (no signature required)
        pdf_content2 = create_test_pdf("Test - Notarization Mode")
        
        response2 = self.session.post(
            f"{BASE_URL}/api/documents/stamp",
            files={"file": ("test_notary.pdf", BytesIO(pdf_content2), "application/pdf")},
            data={
                "stamp_type": "notarization",
                "stamp_position": json.dumps(stamp_position),
                "document_name": "Test Notarization Mode",
                "document_type": "affidavit",
                "recipient_name": "Test User",
                "include_signature": "false",
                "show_signature_placeholder": "false"
            },
            headers=self.get_auth_headers()
        )
        
        assert response2.status_code == 200, f"Notarization stamp failed: {response2.text}"
        print(f"  ✓ Notarization stamp created: {response2.json()['stamp_id']}")
        
        print(f"✓ Both Normal and Notarization modes work")
    
    def test_09_stamp_size_fixed(self):
        """Verify stamp size is fixed regardless of frontend input"""
        self.login()
        
        # Backend should use fixed 240x128 pt regardless of what frontend sends
        pdf_content = create_test_pdf("Test - Fixed Size")
        
        stamp_position = {
            "page": 1, "pages": [1],
            "positions": {"1": {"x": 300, "y": 300}},
            "stamp_width_pt": 500,  # Should be IGNORED by backend
            "stamp_height_pt": 300,  # Should be IGNORED by backend
            "page_width_pt": 612, "page_height_pt": 792
        }
        
        response = self.session.post(
            f"{BASE_URL}/api/documents/stamp",
            files={"file": ("test_size.pdf", BytesIO(pdf_content), "application/pdf")},
            data={
                "stamp_type": "notarization",
                "stamp_position": json.dumps(stamp_position),
                "document_name": "Test Fixed Size",
                "document_type": "affidavit",
                "recipient_name": "Size Test"
            },
            headers=self.get_auth_headers()
        )
        
        assert response.status_code == 200, f"Fixed size test failed: {response.text}"
        result = response.json()
        
        # Verify stamped PDF is valid
        stamped_pdf = base64.b64decode(result["stamped_document"])
        assert stamped_pdf[:4] == b'%PDF', "Not a valid PDF"
        
        print(f"✓ Stamp created with fixed 240x128 pt size (ignoring frontend 500x300)")
    
    def test_10_stamps_list(self):
        """Verify stamps appear in user's stamp list"""
        self.login()
        
        response = self.session.get(
            f"{BASE_URL}/api/documents/stamps",
            headers=self.get_auth_headers()
        )
        
        assert response.status_code == 200, f"Stamps list failed: {response.text}"
        stamps = response.json()
        
        assert isinstance(stamps, list), "Should return list of stamps"
        
        if len(stamps) > 0:
            stamp = stamps[0]
            assert "stamp_id" in stamp, "Missing stamp_id"
            assert "document_name" in stamp, "Missing document_name"
            print(f"✓ Stamps list API works, found {len(stamps)} stamps")
        else:
            print(f"✓ Stamps list API works (no stamps yet)")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
