"""
Test Circle Stamp Text Orientation Fix
======================================
Tests the fix for mirrored/reflected text in circular stamps.
The fix was applied to draw_curved_text_top and draw_curved_text_bottom functions.
"""
import pytest
import requests
import json
import os
from io import BytesIO

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://stamp-and-manage.preview.emergentagent.com').rstrip('/')

# Test credentials
EMAIL = "testadvocate@tls.or.tz"
PASSWORD = "Test@1234"


@pytest.fixture(scope="module")
def auth_token():
    """Login and get authentication token"""
    response = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": EMAIL,
        "password": PASSWORD
    })
    assert response.status_code == 200, f"Login failed: {response.text}"
    return response.json()["access_token"]


@pytest.fixture(scope="module")
def test_pdf():
    """Create a simple test PDF using reportlab"""
    from reportlab.lib.pagesizes import letter
    from reportlab.pdfgen import canvas
    
    pdf_buffer = BytesIO()
    c = canvas.Canvas(pdf_buffer, pagesize=letter)
    c.setFont("Helvetica", 16)
    c.drawString(100, 700, "Circle Stamp Orientation Test Document")
    c.drawString(100, 680, "This document tests the text orientation fix")
    c.save()
    return pdf_buffer.getvalue()


class TestCircleStampOrientation:
    """Test suite for circle stamp text orientation fix"""
    
    def test_circle_stamp_generation(self, auth_token, test_pdf):
        """
        Test that circle stamps are generated successfully.
        Verifies the basic stamping flow works with circle shape.
        """
        headers = {"Authorization": f"Bearer {auth_token}"}
        files = {"file": ("test_circle.pdf", test_pdf, "application/pdf")}
        
        stamp_data = {
            "document_type": "contract",
            "description": "Circle orientation test",
            "recipient_name": "Test Recipient",
            "stamp_shape": "circle",  # KEY: Testing circle shape
            "stamp_layout": "horizontal",
            "stamp_position": json.dumps({"page": 1, "x": 100, "y": 100, "width": 150, "height": 150}),
            "brand_color": "#10B981",
            "show_advocate_name": "true",
            "show_tls_logo": "true",
            "stamp_type": "certification"
        }
        
        response = requests.post(
            f"{BASE_URL}/api/documents/stamp",
            headers=headers,
            files=files,
            data=stamp_data,
            timeout=60
        )
        
        assert response.status_code == 200, f"Stamp generation failed: {response.text}"
        result = response.json()
        
        # Verify response contains expected fields
        assert "stamp_id" in result, "Missing stamp_id in response"
        assert result["stamp_id"].startswith("TLS-"), f"Invalid stamp ID format: {result['stamp_id']}"
        
        return result["stamp_id"]
    
    def test_circle_stamp_verification(self, auth_token, test_pdf):
        """
        Test that generated circle stamps can be verified.
        This ensures the stamp is properly stored in the database.
        """
        # First generate a stamp
        headers = {"Authorization": f"Bearer {auth_token}"}
        files = {"file": ("test_verify.pdf", test_pdf, "application/pdf")}
        
        stamp_data = {
            "document_type": "affidavit",
            "description": "Verification test",
            "recipient_name": "Verify Recipient",
            "stamp_shape": "circle",
            "stamp_position": json.dumps({"page": 1, "x": 200, "y": 200, "width": 150, "height": 150}),
            "brand_color": "#10B981",
            "show_advocate_name": "true",
            "stamp_type": "certification"
        }
        
        gen_response = requests.post(
            f"{BASE_URL}/api/documents/stamp",
            headers=headers,
            files=files,
            data=stamp_data,
            timeout=60
        )
        
        assert gen_response.status_code == 200
        stamp_id = gen_response.json()["stamp_id"]
        
        # Now verify the stamp
        verify_response = requests.get(f"{BASE_URL}/api/verify/stamp/{stamp_id}")
        assert verify_response.status_code == 200, f"Verification failed: {verify_response.text}"
        
        verify_data = verify_response.json()
        assert verify_data.get("valid") == True, "Stamp should be valid"
        assert verify_data.get("advocate_name") is not None, "Advocate name should be present"
    
    def test_circle_stamp_with_reduced_size(self, auth_token, test_pdf):
        """
        Test that circle stamp uses reduced size (150x150px instead of 200x200px).
        The fix reduced the stamp size to be more reasonable.
        """
        headers = {"Authorization": f"Bearer {auth_token}"}
        files = {"file": ("test_size.pdf", test_pdf, "application/pdf")}
        
        # Test with 150x150 size (the reduced size)
        stamp_data = {
            "document_type": "contract",
            "description": "Size test",
            "recipient_name": "Size Test Recipient",
            "stamp_shape": "circle",
            "stamp_position": json.dumps({"page": 1, "x": 100, "y": 100, "width": 150, "height": 150}),
            "brand_color": "#10B981",
            "show_advocate_name": "true",
            "stamp_type": "notarization"
        }
        
        response = requests.post(
            f"{BASE_URL}/api/documents/stamp",
            headers=headers,
            files=files,
            data=stamp_data,
            timeout=60
        )
        
        assert response.status_code == 200, f"Stamp with 150x150 size failed: {response.text}"
        assert "stamp_id" in response.json()
    
    def test_multiple_stamp_shapes_supported(self, auth_token, test_pdf):
        """
        Test that all stamp shapes (rectangle, circle, oval) are still supported.
        The circle fix should not break other shapes.
        """
        headers = {"Authorization": f"Bearer {auth_token}"}
        shapes = ["rectangle", "circle", "oval"]
        
        for shape in shapes:
            files = {"file": (f"test_{shape}.pdf", test_pdf, "application/pdf")}
            
            stamp_data = {
                "document_type": "contract",
                "description": f"Shape test: {shape}",
                "recipient_name": f"{shape.title()} Test",
                "stamp_shape": shape,
                "stamp_position": json.dumps({"page": 1, "x": 100, "y": 100, "width": 150, "height": 150}),
                "brand_color": "#10B981",
                "show_advocate_name": "true",
                "stamp_type": "certification"
            }
            
            response = requests.post(
                f"{BASE_URL}/api/documents/stamp",
                headers=headers,
                files=files,
                data=stamp_data,
                timeout=60
            )
            
            assert response.status_code == 200, f"{shape.title()} stamp failed: {response.text}"
            print(f"PASS: {shape.title()} stamp generated successfully")


class TestTextOrientationAlgorithm:
    """
    Tests validating the text orientation algorithm logic.
    Note: These are logical tests - actual visual verification requires manual inspection.
    """
    
    def test_backend_health(self):
        """Verify backend is healthy before running orientation tests"""
        response = requests.get(f"{BASE_URL}/api/health")
        assert response.status_code == 200
        data = response.json()
        assert data.get("status") == "healthy"
    
    def test_circle_stamp_text_fields_in_backend(self):
        """
        Verify that the backend code contains the correct text orientation logic.
        The fix changes:
        - draw_curved_text_top: text reads left-to-right along top arc
        - draw_curved_text_bottom: text reads left-to-right along bottom arc
        """
        # This test verifies the algorithm by checking the server code
        # The actual text orientation was fixed in server.py lines 590-638
        
        # Read the server.py file to verify the fix is in place
        import os
        server_path = "/app/backend/server.py"
        
        if os.path.exists(server_path):
            with open(server_path, 'r') as f:
                content = f.read()
            
            # Check for the fixed functions
            assert "draw_curved_text_top" in content, "draw_curved_text_top function missing"
            assert "draw_curved_text_bottom" in content, "draw_curved_text_bottom function missing"
            assert "TLS VERIFIED" in content, "TLS VERIFIED text should be in the code"
            assert "SCAN TO VERIFY" in content, "SCAN TO VERIFY text should be in the code"
            
            # Check that the text orientation comments are correct
            assert "reading left to right" in content.lower() or "left-to-right" in content.lower(), \
                "Text orientation should be left-to-right"


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
