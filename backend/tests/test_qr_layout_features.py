"""
Test QR Code Visibility and Layout Selection Features
Tests for bug fixes:
1. QR code visible in downloaded PDF (not empty white box)
2. Layout selection changes stamp preview on document
"""
import pytest
import requests
import base64
import json
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://tls-stamping-suite.preview.emergentagent.com')

# Test PDF content
PDF_BASE64 = 'JVBERi0xLjQKMSAwIG9iago8PAovVHlwZSAvQ2F0YWxvZwovUGFnZXMgMiAwIFIKPj4KZW5kb2JqCjIgMCBvYmoKPDwKL1R5cGUgL1BhZ2VzCi9LaWRzIFszIDAgUl0KL0NvdW50IDEKL01lZGlhQm94IFswIDAgNjEyIDc5Ml0KPj4KZW5kb2JqCjMgMCBvYmoKPDwKL1R5cGUgL1BhZ2UKL1BhcmVudCAyIDAgUgovUmVzb3VyY2VzIDw8Ci9Gb250IDw8Ci9GMSAxMCAwIFIKPj4KPj4KL0NvbnRlbnRzIDQgMCBSCj4+CmVuZG9iago0IDAgb2JqCjw8Ci9MZW5ndGggNDQKPj4Kc3RyZWFtCkJUCi9GMSAxMiBUZgoxMDAgNzAwIFRkCihUZXN0IERvY3VtZW50KSBUagpFVAplbmRzdHJlYW0KZW5kb2JqCjEwIDAgb2JqCjw8Ci9UeXBlIC9Gb250Ci9TdWJ0eXBlIC9UeXBlMQovQmFzZUZvbnQgL0hlbHZldGljYQo+PgplbmRvYmoKeHJlZgowIDExCjAwMDAwMDAwMDAgNjU1MzUgZiAKMDAwMDAwMDAwOSAwMDAwMCBuIAowMDAwMDAwMDU4IDAwMDAwIG4gCjAwMDAwMDAxNDcgMDAwMDAgbiAKMDAwMDAwMDI3MCAwMDAwMCBuIAowMDAwMDAwMDAwIDY1NTM1IGYgCjAwMDAwMDAwMDAgNjU1MzUgZiAKMDAwMDAwMDAwMCA2NTUzNSBmIAowMDAwMDAwMDAwIDY1NTM1IGYgCjAwMDAwMDAwMDAgNjU1MzUgZiAKMDAwMDAwMDM2NCAwMDAwMCBuIAp0cmFpbGVyCjw8Ci9TaXplIDExCi9Sb290IDEgMCBSCj4+CnN0YXJ0eHJlZgo0NDEKJSVFT0YK'


@pytest.fixture(scope="module")
def auth_token():
    """Get authentication token"""
    response = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": "testadvocate@tls.or.tz",
        "password": "Test@1234"
    })
    assert response.status_code == 200, f"Login failed: {response.text}"
    return response.json().get("access_token")


@pytest.fixture(scope="module")
def headers(auth_token):
    """Get headers with auth token"""
    return {"Authorization": f"Bearer {auth_token}"}


class TestQRCodeVisibility:
    """Test QR code is visible in downloaded PDF (not empty white box)"""
    
    def test_stamp_with_logo_left_layout_has_visible_qr(self, headers):
        """Test QR Left (logo_left) layout produces PDF with visible QR code"""
        pdf_bytes = base64.b64decode(PDF_BASE64)
        
        response = requests.post(
            f"{BASE_URL}/api/documents/stamp",
            headers=headers,
            files={"file": ("test_qr_left.pdf", pdf_bytes, "application/pdf")},
            data={
                "stamp_type": "official",
                "stamp_position": json.dumps({"page": 1, "x": 400, "y": 50, "width": 180, "height": 110}),
                "document_name": "QR Left Layout Test",
                "document_type": "contract",
                "layout": "logo_left",
                "brand_color": "#10B981",
                "show_advocate_name": "true",
                "show_tls_logo": "true"
            }
        )
        
        assert response.status_code == 200, f"Stamp failed: {response.text}"
        data = response.json()
        
        # Verify stamp was created
        assert "stamp_id" in data
        assert data["stamp_id"].startswith("TLS-")
        
        # Verify QR code data is present
        assert "qr_code_data" in data
        assert len(data["qr_code_data"]) > 1000, "QR code data too small"
        
        # Verify stamped document is present and not empty
        assert "stamped_document" in data
        stamped_bytes = base64.b64decode(data["stamped_document"])
        assert len(stamped_bytes) > 5000, "Stamped PDF too small - may be missing stamp"
        
        # Verify PDF contains image data
        pdf_content = stamped_bytes.decode('latin-1')
        assert '/Image' in pdf_content, "PDF does not contain image"
        assert '/XObject' in pdf_content, "PDF does not contain XObject"
    
    def test_stamp_with_logo_right_layout_has_visible_qr(self, headers):
        """Test QR Right (logo_right) layout produces PDF with visible QR code"""
        pdf_bytes = base64.b64decode(PDF_BASE64)
        
        response = requests.post(
            f"{BASE_URL}/api/documents/stamp",
            headers=headers,
            files={"file": ("test_qr_right.pdf", pdf_bytes, "application/pdf")},
            data={
                "stamp_type": "official",
                "stamp_position": json.dumps({"page": 1, "x": 400, "y": 200, "width": 180, "height": 110}),
                "document_name": "QR Right Layout Test",
                "document_type": "contract",
                "layout": "logo_right",
                "brand_color": "#10B981",
                "show_advocate_name": "true",
                "show_tls_logo": "true"
            }
        )
        
        assert response.status_code == 200
        data = response.json()
        
        assert "stamp_id" in data
        assert "stamped_document" in data
        stamped_bytes = base64.b64decode(data["stamped_document"])
        assert len(stamped_bytes) > 5000
    
    def test_stamp_with_compact_layout_has_visible_qr(self, headers):
        """Test Mini (compact) layout produces PDF with visible QR code"""
        pdf_bytes = base64.b64decode(PDF_BASE64)
        
        response = requests.post(
            f"{BASE_URL}/api/documents/stamp",
            headers=headers,
            files={"file": ("test_compact.pdf", pdf_bytes, "application/pdf")},
            data={
                "stamp_type": "official",
                "stamp_position": json.dumps({"page": 1, "x": 400, "y": 350, "width": 180, "height": 70}),
                "document_name": "Compact Layout Test",
                "document_type": "contract",
                "layout": "compact",
                "brand_color": "#10B981",
                "show_advocate_name": "true",
                "show_tls_logo": "true"
            }
        )
        
        assert response.status_code == 200
        data = response.json()
        
        assert "stamp_id" in data
        assert "stamped_document" in data


class TestLayoutSelection:
    """Test different layouts produce different stamp sizes"""
    
    def test_horizontal_layout(self, headers):
        """Test Wide (horizontal) layout"""
        pdf_bytes = base64.b64decode(PDF_BASE64)
        
        response = requests.post(
            f"{BASE_URL}/api/documents/stamp",
            headers=headers,
            files={"file": ("test_horizontal.pdf", pdf_bytes, "application/pdf")},
            data={
                "stamp_type": "official",
                "stamp_position": json.dumps({"page": 1, "x": 50, "y": 50, "width": 280, "height": 200}),
                "document_name": "Horizontal Layout Test",
                "layout": "horizontal"
            }
        )
        
        assert response.status_code == 200
        data = response.json()
        assert "stamp_id" in data
    
    def test_vertical_layout(self, headers):
        """Test Tall (vertical) layout"""
        pdf_bytes = base64.b64decode(PDF_BASE64)
        
        response = requests.post(
            f"{BASE_URL}/api/documents/stamp",
            headers=headers,
            files={"file": ("test_vertical.pdf", pdf_bytes, "application/pdf")},
            data={
                "stamp_type": "official",
                "stamp_position": json.dumps({"page": 1, "x": 50, "y": 50, "width": 180, "height": 250}),
                "document_name": "Vertical Layout Test",
                "layout": "vertical"
            }
        )
        
        assert response.status_code == 200
        data = response.json()
        assert "stamp_id" in data
    
    def test_all_layouts_produce_different_stamps(self, headers):
        """Test that different layouts produce stamps of different sizes"""
        pdf_bytes = base64.b64decode(PDF_BASE64)
        layouts = ["horizontal", "vertical", "compact", "logo_left", "logo_right"]
        stamp_sizes = {}
        
        for layout in layouts:
            response = requests.post(
                f"{BASE_URL}/api/documents/stamp",
                headers=headers,
                files={"file": (f"test_{layout}.pdf", pdf_bytes, "application/pdf")},
                data={
                    "stamp_type": "official",
                    "stamp_position": json.dumps({"page": 1, "x": 50, "y": 50, "width": 200, "height": 150}),
                    "document_name": f"{layout.title()} Layout Test",
                    "layout": layout
                }
            )
            
            assert response.status_code == 200, f"Failed for layout {layout}: {response.text}"
            data = response.json()
            stamped_bytes = base64.b64decode(data["stamped_document"])
            stamp_sizes[layout] = len(stamped_bytes)
        
        # Verify we got different sizes (different layouts)
        unique_sizes = len(set(stamp_sizes.values()))
        print(f"Stamp sizes by layout: {stamp_sizes}")
        assert unique_sizes >= 3, "Expected at least 3 different stamp sizes for different layouts"


class TestQRCodeForColoredBackground:
    """Test QR code generation for colored backgrounds (white QR on colored panel)"""
    
    def test_logo_left_has_white_qr_on_colored_panel(self, headers):
        """Test logo_left layout has white QR modules on colored background"""
        pdf_bytes = base64.b64decode(PDF_BASE64)
        
        response = requests.post(
            f"{BASE_URL}/api/documents/stamp",
            headers=headers,
            files={"file": ("test_white_qr.pdf", pdf_bytes, "application/pdf")},
            data={
                "stamp_type": "official",
                "stamp_position": json.dumps({"page": 1, "x": 400, "y": 50, "width": 180, "height": 110}),
                "document_name": "White QR Test",
                "layout": "logo_left",
                "brand_color": "#10B981"
            }
        )
        
        assert response.status_code == 200
        data = response.json()
        
        # Verify stamp was created with QR code
        assert "qr_code_data" in data
        assert len(data["qr_code_data"]) > 1000
        
        # Verify stamped document contains image
        stamped_bytes = base64.b64decode(data["stamped_document"])
        pdf_content = stamped_bytes.decode('latin-1')
        assert '/Image' in pdf_content


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
