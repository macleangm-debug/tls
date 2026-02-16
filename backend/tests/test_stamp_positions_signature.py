"""
Test Suite for Stamp Position and Signature Features:
1. Default stamp position at CENTER of page
2. Per-page stamp positions when stamping All Pages
3. Signature options: Digital (use saved), Sign After Printing (placeholder)
4. Upload signature functionality
5. Backend handles per-page positions when stamping
"""
import pytest
import requests
import json
import base64
import os
from io import BytesIO
from PIL import Image
from datetime import datetime

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
ADVOCATE_EMAIL = "testadvocate@tls.or.tz"
ADVOCATE_PASSWORD = "Test@1234"

@pytest.fixture(scope="module")
def auth_token():
    """Get authentication token for advocate user"""
    response = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": ADVOCATE_EMAIL,
        "password": ADVOCATE_PASSWORD
    })
    if response.status_code != 200:
        pytest.skip(f"Authentication failed: {response.status_code} - {response.text}")
    return response.json()["access_token"]

@pytest.fixture(scope="module")
def auth_headers(auth_token):
    """Headers with auth token"""
    return {"Authorization": f"Bearer {auth_token}"}


class TestSignatureEndpoints:
    """Test signature upload, save, get, and delete endpoints"""
    
    def test_get_signature_initial(self, auth_headers):
        """GET /api/advocate/signature - Get current saved signature (may or may not exist)"""
        response = requests.get(f"{BASE_URL}/api/advocate/signature", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        # Response should have signature_data field (may be null)
        assert "signature_data" in data
        print(f"✓ GET signature endpoint works - has signature: {data.get('signature_data') is not None}")
    
    def test_upload_signature_image(self, auth_headers):
        """POST /api/advocate/signature - Upload signature image file"""
        # Create a simple test signature image (200x100 PNG)
        img = Image.new('RGBA', (200, 100), (255, 255, 255, 0))
        from PIL import ImageDraw
        draw = ImageDraw.Draw(img)
        # Draw a simple signature-like scribble
        draw.line([(20, 50), (60, 30), (100, 60), (150, 40), (180, 50)], fill='black', width=2)
        
        # Save to bytes
        buffer = BytesIO()
        img.save(buffer, format='PNG')
        buffer.seek(0)
        
        # Upload as multipart file
        files = {'file': ('test_signature.png', buffer, 'image/png')}
        response = requests.post(
            f"{BASE_URL}/api/advocate/signature",
            headers=auth_headers,
            files=files
        )
        
        assert response.status_code == 200
        data = response.json()
        assert "signature_data" in data
        assert data.get("source") == "uploaded"
        print(f"✓ Signature image upload works - source: {data.get('source')}")
    
    def test_save_signature_base64(self, auth_headers):
        """POST /api/advocate/signature/save - Save base64 encoded signature"""
        # Create a simple test signature image
        img = Image.new('RGBA', (200, 100), (255, 255, 255, 0))
        from PIL import ImageDraw
        draw = ImageDraw.Draw(img)
        draw.line([(10, 50), (50, 20), (90, 60), (140, 30), (190, 50)], fill='black', width=3)
        
        # Convert to base64
        buffer = BytesIO()
        img.save(buffer, format='PNG')
        sig_base64 = base64.b64encode(buffer.getvalue()).decode()
        
        response = requests.post(
            f"{BASE_URL}/api/advocate/signature/save",
            headers={**auth_headers, "Content-Type": "application/json"},
            json={"signature_data": sig_base64}
        )
        
        assert response.status_code == 200
        data = response.json()
        # Response may have signature_data OR message field depending on implementation
        assert "message" in data or "signature_data" in data
        print(f"✓ Signature base64 save works - response: {data}")
    
    def test_get_saved_signature(self, auth_headers):
        """GET /api/advocate/signature - Verify signature was saved"""
        response = requests.get(f"{BASE_URL}/api/advocate/signature", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert data.get("signature_data") is not None
        print(f"✓ Signature retrieved successfully - source: {data.get('source', 'unknown')}")
    
    def test_delete_signature(self, auth_headers):
        """DELETE /api/advocate/signature - Delete saved signature"""
        response = requests.delete(f"{BASE_URL}/api/advocate/signature", headers=auth_headers)
        assert response.status_code == 200
        print(f"✓ Signature deleted successfully")
    
    def test_verify_signature_deleted(self, auth_headers):
        """GET /api/advocate/signature - Verify signature was deleted"""
        response = requests.get(f"{BASE_URL}/api/advocate/signature", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert data.get("signature_data") is None
        print(f"✓ Verified signature is now deleted")


class TestDocumentStamping:
    """Test document stamping with position and signature options"""
    
    @pytest.fixture(autouse=True)
    def setup_signature(self, auth_headers):
        """Ensure we have a signature for digital signing tests"""
        # Create and save a signature first
        img = Image.new('RGBA', (200, 100), (255, 255, 255, 0))
        from PIL import ImageDraw
        draw = ImageDraw.Draw(img)
        draw.line([(10, 50), (50, 20), (90, 60), (140, 30), (190, 50)], fill='black', width=3)
        
        buffer = BytesIO()
        img.save(buffer, format='PNG')
        sig_base64 = base64.b64encode(buffer.getvalue()).decode()
        
        requests.post(
            f"{BASE_URL}/api/advocate/signature/save",
            headers={**auth_headers, "Content-Type": "application/json"},
            json={"signature_data": sig_base64}
        )
        yield
        # No cleanup needed - signature persists for other tests
    
    def test_stamp_single_page_center_position(self, auth_headers):
        """Test stamping with default CENTER position"""
        # Use the test PDF
        pdf_path = "/tmp/test_multipage.pdf"
        if not os.path.exists(pdf_path):
            pytest.skip("Test PDF not found")
        
        with open(pdf_path, 'rb') as f:
            pdf_content = f.read()
        
        # Position at center of A4 page (612x792 points) - roughly center
        # Note: The frontend calculates center based on preview dimensions
        stamp_position = {
            "page": 1,
            "pages": [1],
            "positions": {
                "1": {"x": 231, "y": 321}  # Roughly center of 612x792
            },
            "width": 150,
            "height": 150
        }
        
        files = {'file': ('test_multipage.pdf', pdf_content, 'application/pdf')}
        data = {
            'stamp_type': 'certification',
            'stamp_position': json.dumps(stamp_position),
            'document_name': 'TEST_Center_Position_Doc',
            'document_type': 'contract',
            'description': 'Test document with center position',
            'recipient_name': 'Test Recipient',
            'recipient_org': 'Test Org',
            'brand_color': '#10B981',
            'show_advocate_name': 'true',
            'show_tls_logo': 'true',
            'layout': 'horizontal',
            'shape': 'rectangle',
            'include_signature': 'true',  # Digital signature
            'show_signature_placeholder': 'false',
            'stamp_size': '100',
            'opacity': '100',
            'transparent_background': 'true'
        }
        
        response = requests.post(
            f"{BASE_URL}/api/documents/stamp",
            headers=auth_headers,
            files=files,
            data=data
        )
        
        assert response.status_code == 200
        result = response.json()
        assert "stamp_id" in result
        assert "stamped_document" in result
        assert result.get("document_name") == "TEST_Center_Position_Doc"
        print(f"✓ Single page stamping at center position works - stamp_id: {result['stamp_id']}")
    
    def test_stamp_multipage_with_per_page_positions(self, auth_headers):
        """Test stamping multiple pages with DIFFERENT positions per page"""
        pdf_path = "/tmp/test_multipage.pdf"
        if not os.path.exists(pdf_path):
            pytest.skip("Test PDF not found")
        
        with open(pdf_path, 'rb') as f:
            pdf_content = f.read()
        
        # Per-page positions - each page has different position
        stamp_position = {
            "page": 1,
            "pages": [1, 2, 3],  # All 3 pages
            "positions": {
                "1": {"x": 50, "y": 50},    # Top-left on page 1
                "2": {"x": 231, "y": 321},  # Center on page 2
                "3": {"x": 400, "y": 600}   # Bottom-right on page 3
            },
            "width": 150,
            "height": 150
        }
        
        files = {'file': ('test_multipage.pdf', pdf_content, 'application/pdf')}
        data = {
            'stamp_type': 'certification',
            'stamp_position': json.dumps(stamp_position),
            'document_name': 'TEST_PerPage_Position_Doc',
            'document_type': 'contract',
            'description': 'Test document with per-page positions',
            'recipient_name': 'Test Recipient PerPage',
            'recipient_org': 'Test Org',
            'brand_color': '#3B82F6',
            'show_advocate_name': 'true',
            'show_tls_logo': 'true',
            'layout': 'horizontal',
            'shape': 'rectangle',
            'include_signature': 'true',
            'show_signature_placeholder': 'false',
            'stamp_size': '100',
            'opacity': '100',
            'transparent_background': 'true'
        }
        
        response = requests.post(
            f"{BASE_URL}/api/documents/stamp",
            headers=auth_headers,
            files=files,
            data=data
        )
        
        assert response.status_code == 200
        result = response.json()
        assert "stamp_id" in result
        assert "stamped_document" in result
        print(f"✓ Multi-page stamping with per-page positions works - stamp_id: {result['stamp_id']}")
    
    def test_stamp_with_signature_placeholder(self, auth_headers):
        """Test stamping with signature placeholder (sign after printing)"""
        pdf_path = "/tmp/test_multipage.pdf"
        if not os.path.exists(pdf_path):
            pytest.skip("Test PDF not found")
        
        with open(pdf_path, 'rb') as f:
            pdf_content = f.read()
        
        stamp_position = {
            "page": 1,
            "pages": [1],
            "positions": {"1": {"x": 200, "y": 300}},
            "width": 150,
            "height": 150
        }
        
        files = {'file': ('test_multipage.pdf', pdf_content, 'application/pdf')}
        data = {
            'stamp_type': 'certification',
            'stamp_position': json.dumps(stamp_position),
            'document_name': 'TEST_Signature_Placeholder_Doc',
            'document_type': 'affidavit',
            'description': 'Test document with signature placeholder',
            'recipient_name': 'Placeholder Test Recipient',
            'recipient_org': '',
            'brand_color': '#F59E0B',
            'show_advocate_name': 'true',
            'show_tls_logo': 'true',
            'layout': 'horizontal',
            'shape': 'rectangle',
            'include_signature': 'false',  # No digital signature
            'show_signature_placeholder': 'true',  # Show placeholder for physical signature
            'stamp_size': '100',
            'opacity': '100',
            'transparent_background': 'true'
        }
        
        response = requests.post(
            f"{BASE_URL}/api/documents/stamp",
            headers=auth_headers,
            files=files,
            data=data
        )
        
        assert response.status_code == 200
        result = response.json()
        assert "stamp_id" in result
        print(f"✓ Stamping with signature placeholder works - stamp_id: {result['stamp_id']}")
    
    def test_stamp_notarization_no_signature(self, auth_headers):
        """Test Notarization stamp type (no signature required)"""
        pdf_path = "/tmp/test_multipage.pdf"
        if not os.path.exists(pdf_path):
            pytest.skip("Test PDF not found")
        
        with open(pdf_path, 'rb') as f:
            pdf_content = f.read()
        
        stamp_position = {
            "page": 1,
            "pages": [1, 2],  # Two pages
            "positions": {
                "1": {"x": 100, "y": 100},
                "2": {"x": 100, "y": 100}
            },
            "width": 150,
            "height": 150
        }
        
        files = {'file': ('test_multipage.pdf', pdf_content, 'application/pdf')}
        data = {
            'stamp_type': 'notarization',  # Notarization - no signature
            'stamp_position': json.dumps(stamp_position),
            'document_name': 'TEST_Notarization_Doc',
            'document_type': 'deed',
            'description': 'Test notarization document',
            'recipient_name': 'Notary Test Recipient',
            'recipient_org': 'Test Bank',
            'brand_color': '#3B82F6',
            'show_advocate_name': 'true',
            'show_tls_logo': 'true',
            'layout': 'horizontal',
            'shape': 'circle',  # Circle shape
            'include_signature': 'false',  # Notarization doesn't require signature
            'show_signature_placeholder': 'false',
            'stamp_size': '100',
            'opacity': '100',
            'transparent_background': 'true'
        }
        
        response = requests.post(
            f"{BASE_URL}/api/documents/stamp",
            headers=auth_headers,
            files=files,
            data=data
        )
        
        assert response.status_code == 200
        result = response.json()
        assert "stamp_id" in result
        print(f"✓ Notarization stamp (no signature) works - stamp_id: {result['stamp_id']}")
    
    def test_stamp_different_shapes(self, auth_headers):
        """Test stamping with different stamp shapes"""
        pdf_path = "/tmp/test_multipage.pdf"
        if not os.path.exists(pdf_path):
            pytest.skip("Test PDF not found")
        
        shapes = ['rectangle', 'circle', 'oval']
        
        for shape in shapes:
            with open(pdf_path, 'rb') as f:
                pdf_content = f.read()
            
            stamp_position = {
                "page": 1,
                "pages": [1],
                "positions": {"1": {"x": 200, "y": 300}},
                "width": 150,
                "height": 150
            }
            
            files = {'file': (f'test_{shape}.pdf', pdf_content, 'application/pdf')}
            data = {
                'stamp_type': 'certification',
                'stamp_position': json.dumps(stamp_position),
                'document_name': f'TEST_Shape_{shape}_Doc',
                'document_type': 'contract',
                'description': f'Test {shape} shape stamp',
                'recipient_name': f'{shape} Test Recipient',
                'recipient_org': '',
                'brand_color': '#10B981',
                'show_advocate_name': 'true',
                'show_tls_logo': 'true',
                'layout': 'horizontal',
                'shape': shape,
                'include_signature': 'false',
                'show_signature_placeholder': 'true',
                'stamp_size': '100',
                'opacity': '100',
                'transparent_background': 'true'
            }
            
            response = requests.post(
                f"{BASE_URL}/api/documents/stamp",
                headers=auth_headers,
                files=files,
                data=data
            )
            
            assert response.status_code == 200
            print(f"✓ Stamp shape '{shape}' works")


class TestVerifyStamp:
    """Test stamp verification"""
    
    def test_verify_created_stamp(self, auth_headers):
        """Verify a stamp that was just created"""
        # First create a stamp
        pdf_path = "/tmp/test_multipage.pdf"
        if not os.path.exists(pdf_path):
            pytest.skip("Test PDF not found")
        
        with open(pdf_path, 'rb') as f:
            pdf_content = f.read()
        
        stamp_position = {
            "page": 1,
            "pages": [1],
            "positions": {"1": {"x": 200, "y": 300}},
            "width": 150,
            "height": 150
        }
        
        files = {'file': ('test.pdf', pdf_content, 'application/pdf')}
        data = {
            'stamp_type': 'certification',
            'stamp_position': json.dumps(stamp_position),
            'document_name': 'TEST_Verify_Doc',
            'document_type': 'contract',
            'description': 'Test verification',
            'recipient_name': 'Verify Test',
            'recipient_org': '',
            'brand_color': '#10B981',
            'show_advocate_name': 'true',
            'show_tls_logo': 'true',
            'layout': 'horizontal',
            'shape': 'rectangle',
            'include_signature': 'false',
            'show_signature_placeholder': 'true',
            'stamp_size': '100',
            'opacity': '100',
            'transparent_background': 'true'
        }
        
        stamp_response = requests.post(
            f"{BASE_URL}/api/documents/stamp",
            headers=auth_headers,
            files=files,
            data=data
        )
        
        assert stamp_response.status_code == 200
        stamp_id = stamp_response.json()["stamp_id"]
        
        # Now verify the stamp - using the correct endpoint
        verify_response = requests.get(f"{BASE_URL}/api/verify/stamp/{stamp_id}")
        assert verify_response.status_code == 200
        verify_data = verify_response.json()
        assert verify_data["valid"] == True
        assert verify_data["stamp_id"] == stamp_id
        print(f"✓ Stamp verification works - stamp_id: {stamp_id}")


class TestStampHistory:
    """Test stamp history retrieval"""
    
    def test_get_stamps_list(self, auth_headers):
        """GET /api/documents/stamps - Get list of stamps"""
        response = requests.get(f"{BASE_URL}/api/documents/stamps", headers=auth_headers)
        assert response.status_code == 200
        stamps = response.json()
        assert isinstance(stamps, list)
        print(f"✓ Stamps history retrieval works - {len(stamps)} stamps found")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
