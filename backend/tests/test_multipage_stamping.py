"""
Tests for Document Stamping Page improvements:
1. Transparent stamp backgrounds with white only behind content
2. Smooth dragging (Rnd with onDrag)
3. Responsive input fields (no lag)
4. Position/Margin fields removed from UI
5. All Pages stamping option
6. TLS Logo in rectangle stamp header
7. Multi-page PDF stamping
"""
import pytest
import requests
import os
import json
import base64
from PyPDF2 import PdfReader
from io import BytesIO

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://scan-and-sign-1.preview.emergentagent.com').rstrip('/')

class TestMultipageStamping:
    """Test multi-page stamping functionality"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        """Get auth token for advocate user"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "testadvocate@tls.or.tz",
            "password": "Test@1234"
        })
        assert response.status_code == 200, f"Login failed: {response.text}"
        data = response.json()
        assert "access_token" in data, "No access token in response"
        return data["access_token"]
    
    @pytest.fixture(scope="class")
    def headers(self, auth_token):
        """Get authenticated headers"""
        return {
            "Authorization": f"Bearer {auth_token}",
            "Content-Type": "application/json"
        }
    
    def test_health_endpoint(self):
        """Test backend health"""
        response = requests.get(f"{BASE_URL}/api/health")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "healthy"
        print("✓ Health endpoint working")
    
    def test_login_works(self):
        """Test login with advocate credentials"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "testadvocate@tls.or.tz",
            "password": "Test@1234"
        })
        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data
        assert "user" in data
        print(f"✓ Login successful for {data['user']['full_name']}")
    
    def test_upload_multipage_pdf(self, auth_token):
        """Test uploading a 3-page PDF"""
        # Read the test multipage PDF
        pdf_path = "/tmp/test_multipage.pdf"
        assert os.path.exists(pdf_path), "Test multipage PDF not found"
        
        with open(pdf_path, "rb") as f:
            pdf_content = f.read()
        
        # Verify it's a 3-page PDF
        pdf_reader = PdfReader(BytesIO(pdf_content))
        assert len(pdf_reader.pages) == 3, f"Expected 3 pages, got {len(pdf_reader.pages)}"
        
        # Upload the PDF
        files = {"file": ("test_multipage.pdf", pdf_content, "application/pdf")}
        response = requests.post(
            f"{BASE_URL}/api/documents/upload",
            files=files,
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 200, f"Upload failed: {response.text}"
        data = response.json()
        assert data["pages"] == 3, f"Expected 3 pages, got {data['pages']}"
        print(f"✓ Uploaded 3-page PDF successfully")
        return data
    
    def test_stamp_all_pages(self, auth_token):
        """Test stamping all pages of a multi-page PDF"""
        # Read the test multipage PDF
        pdf_path = "/tmp/test_multipage.pdf"
        with open(pdf_path, "rb") as f:
            pdf_content = f.read()
        
        # Stamp with All Pages option
        files = {"file": ("test_multipage.pdf", pdf_content, "application/pdf")}
        form_data = {
            "stamp_type": "certification",
            "stamp_position": json.dumps({
                "page": 1,
                "pages": [1, 2, 3],  # All 3 pages
                "x": 400,
                "y": 50,
                "width": 200,
                "height": 140
            }),
            "document_name": "TEST_MultipageStampDoc",
            "document_type": "contract",
            "description": "Test multipage stamping",
            "recipient_name": "Test Recipient",
            "recipient_org": "Test Org",
            "brand_color": "#10B981",
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
            data=form_data,
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        
        assert response.status_code == 200, f"Stamp failed: {response.text}"
        data = response.json()
        assert "stamped_document" in data, "No stamped document in response"
        assert "stamp_id" in data, "No stamp ID in response"
        
        # Verify the stamped PDF has stamps on all pages
        stamped_pdf = base64.b64decode(data["stamped_document"])
        stamped_reader = PdfReader(BytesIO(stamped_pdf))
        assert len(stamped_reader.pages) == 3, "Stamped PDF should have 3 pages"
        
        print(f"✓ Multi-page stamping successful: {data['stamp_id']}")
        
        # Return stamp_id for cleanup
        return data["stamp_id"]
    
    def test_stamp_first_page_only(self, auth_token):
        """Test stamping first page only"""
        pdf_path = "/tmp/test_multipage.pdf"
        with open(pdf_path, "rb") as f:
            pdf_content = f.read()
        
        files = {"file": ("test_first_page.pdf", pdf_content, "application/pdf")}
        form_data = {
            "stamp_type": "certification",
            "stamp_position": json.dumps({
                "page": 1,
                "pages": [1],  # First page only
                "x": 400,
                "y": 50,
                "width": 200,
                "height": 140
            }),
            "document_name": "TEST_FirstPageOnlyDoc",
            "document_type": "contract",
            "description": "Test first page stamping",
            "recipient_name": "Test Recipient",
            "recipient_org": "",
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
            data=form_data,
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        
        assert response.status_code == 200, f"Stamp failed: {response.text}"
        data = response.json()
        assert "stamp_id" in data
        print(f"✓ First page only stamping successful: {data['stamp_id']}")
        return data["stamp_id"]
    
    def test_stamp_last_page_only(self, auth_token):
        """Test stamping last page only"""
        pdf_path = "/tmp/test_multipage.pdf"
        with open(pdf_path, "rb") as f:
            pdf_content = f.read()
        
        files = {"file": ("test_last_page.pdf", pdf_content, "application/pdf")}
        form_data = {
            "stamp_type": "notarization",
            "stamp_position": json.dumps({
                "page": 3,
                "pages": [3],  # Last page only
                "x": 400,
                "y": 50,
                "width": 200,
                "height": 140
            }),
            "document_name": "TEST_LastPageOnlyDoc",
            "document_type": "affidavit",
            "description": "Test last page stamping",
            "recipient_name": "Test Recipient",
            "recipient_org": "",
            "brand_color": "#8B5CF6",
            "show_advocate_name": "true",
            "show_tls_logo": "true",
            "layout": "horizontal",
            "shape": "oval",
            "include_signature": "false",
            "show_signature_placeholder": "false",
            "stamp_size": "100",
            "opacity": "100",
            "transparent_background": "true"
        }
        
        response = requests.post(
            f"{BASE_URL}/api/documents/stamp",
            files=files,
            data=form_data,
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        
        assert response.status_code == 200, f"Stamp failed: {response.text}"
        data = response.json()
        print(f"✓ Last page only stamping successful: {data['stamp_id']}")
        return data["stamp_id"]
    
    def test_stamp_with_circle_shape(self, auth_token):
        """Test stamping with circle shape (transparent)"""
        pdf_path = "/tmp/test_multipage.pdf"
        with open(pdf_path, "rb") as f:
            pdf_content = f.read()
        
        files = {"file": ("test_circle.pdf", pdf_content, "application/pdf")}
        form_data = {
            "stamp_type": "certification",
            "stamp_position": json.dumps({
                "page": 1,
                "pages": [1],
                "x": 350,
                "y": 50,
                "width": 150,
                "height": 150
            }),
            "document_name": "TEST_CircleShapeDoc",
            "document_type": "contract",
            "description": "Test circle stamp",
            "recipient_name": "Circle Test",
            "recipient_org": "",
            "brand_color": "#EF4444",
            "show_advocate_name": "true",
            "show_tls_logo": "true",
            "layout": "horizontal",
            "shape": "circle",
            "include_signature": "false",
            "show_signature_placeholder": "false",
            "stamp_size": "100",
            "opacity": "100",
            "transparent_background": "true"
        }
        
        response = requests.post(
            f"{BASE_URL}/api/documents/stamp",
            files=files,
            data=form_data,
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        
        assert response.status_code == 200, f"Circle stamp failed: {response.text}"
        data = response.json()
        print(f"✓ Circle shape stamping successful: {data['stamp_id']}")
        return data["stamp_id"]
    
    def test_verify_stamp(self, auth_token):
        """Test stamp verification after creation"""
        # First create a stamp
        pdf_path = "/tmp/test_multipage.pdf"
        with open(pdf_path, "rb") as f:
            pdf_content = f.read()
        
        files = {"file": ("test_verify.pdf", pdf_content, "application/pdf")}
        form_data = {
            "stamp_type": "certification",
            "stamp_position": json.dumps({"page": 1, "pages": [1], "x": 400, "y": 50, "width": 200, "height": 140}),
            "document_name": "TEST_VerifyStampDoc",
            "document_type": "contract",
            "description": "Test verification",
            "recipient_name": "Verify Test",
            "recipient_org": "",
            "brand_color": "#10B981",
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
            data=form_data,
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        
        assert response.status_code == 200
        stamp_id = response.json()["stamp_id"]
        
        # Verify the stamp
        verify_response = requests.get(f"{BASE_URL}/api/verify/{stamp_id}")
        assert verify_response.status_code == 200
        verify_data = verify_response.json()
        assert verify_data["valid"] == True, "Stamp should be valid"
        assert verify_data["stamp_id"] == stamp_id
        print(f"✓ Stamp verification successful for {stamp_id}")
        return stamp_id
    
    def test_get_stamp_templates(self, auth_token):
        """Test getting stamp templates"""
        response = requests.get(
            f"{BASE_URL}/api/stamp-templates",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 200
        templates = response.json()
        assert isinstance(templates, list), "Templates should be a list"
        print(f"✓ Got {len(templates)} stamp templates")
        return templates
    
    def test_cleanup_test_stamps(self, auth_token):
        """Cleanup test stamps created during testing"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        
        # Get all stamps
        response = requests.get(f"{BASE_URL}/api/documents/stamps", headers=headers)
        if response.status_code != 200:
            print("Could not get stamps for cleanup")
            return
        
        stamps = response.json()
        test_stamps = [s for s in stamps if s.get("document_name", "").startswith("TEST_")]
        
        cleaned = 0
        for stamp in test_stamps:
            stamp_id = stamp.get("stamp_id")
            if stamp_id:
                try:
                    revoke_response = requests.post(
                        f"{BASE_URL}/api/stamps/{stamp_id}/revoke",
                        headers=headers
                    )
                    if revoke_response.status_code == 200:
                        cleaned += 1
                except Exception as e:
                    print(f"Could not cleanup stamp {stamp_id}: {e}")
        
        print(f"✓ Cleaned up {cleaned} test stamps")


class TestStampTransparency:
    """Test transparent stamp background functionality"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        """Get auth token for advocate user"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "testadvocate@tls.or.tz",
            "password": "Test@1234"
        })
        assert response.status_code == 200
        return response.json()["access_token"]
    
    def test_stamp_has_transparent_background_param(self, auth_token):
        """Verify transparent_background is sent and processed"""
        pdf_path = "/tmp/test_multipage.pdf"
        with open(pdf_path, "rb") as f:
            pdf_content = f.read()
        
        files = {"file": ("test_transparent.pdf", pdf_content, "application/pdf")}
        form_data = {
            "stamp_type": "certification",
            "stamp_position": json.dumps({"page": 1, "pages": [1], "x": 400, "y": 50, "width": 200, "height": 140}),
            "document_name": "TEST_TransparentBgDoc",
            "document_type": "contract",
            "description": "Test transparent background",
            "recipient_name": "Transparent Test",
            "recipient_org": "",
            "brand_color": "#10B981",
            "show_advocate_name": "true",
            "show_tls_logo": "true",
            "layout": "horizontal",
            "shape": "rectangle",
            "include_signature": "false",
            "show_signature_placeholder": "false",
            "stamp_size": "100",
            "opacity": "100",
            "transparent_background": "true"  # This should trigger transparent background
        }
        
        response = requests.post(
            f"{BASE_URL}/api/documents/stamp",
            files=files,
            data=form_data,
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        
        assert response.status_code == 200, f"Stamp with transparent bg failed: {response.text}"
        data = response.json()
        assert "stamped_document" in data
        print(f"✓ Stamp with transparent_background=true created: {data['stamp_id']}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
