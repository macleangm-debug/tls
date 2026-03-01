"""
Test Document Stamping Flow - Image to PDF Conversion Fix
Tests the critical fix where frontend sends processed PDF (from fileData.document_data) 
instead of original file to /api/documents/stamp endpoint.
"""
import pytest
import requests
import os
import base64

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://stamp-and-manage.preview.emergentagent.com').rstrip('/')

# Test credentials
TEST_EMAIL = "test@tls.or.tz"
TEST_PASSWORD = "Test@12345678!"


class TestDocumentStampingFlow:
    """Tests for document upload, conversion, and stamping flow"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Login and get auth token before each test"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        assert response.status_code == 200, f"Login failed: {response.text}"
        self.token = response.json().get("access_token")
        self.headers = {"Authorization": f"Bearer {self.token}"}
    
    def test_upload_image_converts_to_pdf(self):
        """Test that uploading an image file converts it to PDF"""
        # Create a small test PNG image
        from PIL import Image
        import io
        
        img = Image.new('RGB', (100, 100), color='white')
        img_buffer = io.BytesIO()
        img.save(img_buffer, format='PNG')
        img_buffer.seek(0)
        
        # Upload image
        files = {'file': ('test_image.png', img_buffer, 'image/png')}
        response = requests.post(f"{BASE_URL}/api/documents/upload", 
                                files=files, 
                                headers=self.headers)
        
        assert response.status_code == 200, f"Upload failed: {response.text}"
        data = response.json()
        
        # Verify conversion happened
        assert data.get("converted") == True, "Image should be converted to PDF"
        assert data.get("content_type") == "application/pdf", "Content type should be PDF"
        assert "document_data" in data, "Should return document_data (base64 PDF)"
        assert data.get("pages") >= 1, "Should have at least 1 page"
        
        # Verify document_data is valid base64 PDF
        pdf_data = base64.b64decode(data["document_data"])
        assert pdf_data.startswith(b'%PDF'), "document_data should be a valid PDF"
        
        print(f"SUCCESS: Image converted to PDF, {data['pages']} page(s)")
        return data
    
    def test_stamp_with_converted_pdf(self):
        """Test stamping using the converted PDF from document_data"""
        # First upload an image to get the converted PDF
        from PIL import Image
        import io
        
        img = Image.new('RGB', (200, 200), color='blue')
        img_buffer = io.BytesIO()
        img.save(img_buffer, format='PNG')
        img_buffer.seek(0)
        
        # Upload
        files = {'file': ('stamp_test.png', img_buffer, 'image/png')}
        upload_response = requests.post(f"{BASE_URL}/api/documents/upload", 
                                       files=files, 
                                       headers=self.headers)
        assert upload_response.status_code == 200
        upload_data = upload_response.json()
        
        # Get the converted PDF from document_data
        pdf_bytes = base64.b64decode(upload_data["document_data"])
        
        # Now stamp using the converted PDF (this is the critical fix)
        stamp_files = {
            'file': ('stamp_test.pdf', pdf_bytes, 'application/pdf')
        }
        stamp_data = {
            'stamp_type': 'certification',
            'stamp_position': '{"page": 1, "x": 100, "y": 100, "width": 150, "height": 150}',
            'document_name': 'Test Stamped Document',
            'document_type': 'contract',
            'recipient_name': 'Test Recipient',
            'brand_color': '#10B981',
            'include_signature': 'false',
            'show_signature_placeholder': 'true'
        }
        
        stamp_response = requests.post(f"{BASE_URL}/api/documents/stamp",
                                      files=stamp_files,
                                      data=stamp_data,
                                      headers=self.headers)
        
        assert stamp_response.status_code == 200, f"Stamp failed: {stamp_response.text}"
        result = stamp_response.json()
        
        # Verify stamp result
        assert "stamp_id" in result, "Should return stamp_id"
        assert result["stamp_id"].startswith("TLS-"), "Stamp ID should start with TLS-"
        assert "stamped_document" in result, "Should return stamped document"
        assert "qr_code_data" in result, "Should return QR code"
        assert result["status"] == "active", "Stamp status should be active"
        
        # Verify the stamped document is a valid PDF
        stamped_pdf = base64.b64decode(result["stamped_document"])
        assert stamped_pdf.startswith(b'%PDF'), "Stamped document should be a valid PDF"
        
        print(f"SUCCESS: Document stamped with ID {result['stamp_id']}")
        return result
    
    def test_stamp_with_notarization_type(self):
        """Test stamping with notarization type (no signature)"""
        # Create test PDF
        from reportlab.pdfgen import canvas
        import io
        
        pdf_buffer = io.BytesIO()
        c = canvas.Canvas(pdf_buffer)
        c.drawString(100, 750, "Notarization Test Document")
        c.save()
        pdf_buffer.seek(0)
        
        files = {'file': ('notary_test.pdf', pdf_buffer.read(), 'application/pdf')}
        data = {
            'stamp_type': 'notarization',
            'stamp_position': '{"page": 1, "x": 200, "y": 200}',
            'document_name': 'Notarization Test',
            'document_type': 'affidavit',
            'recipient_name': 'Notary Client',
            'brand_color': '#3B82F6',
            'include_signature': 'false',
            'show_signature_placeholder': 'false'
        }
        
        response = requests.post(f"{BASE_URL}/api/documents/stamp",
                                files=files,
                                data=data,
                                headers=self.headers)
        
        assert response.status_code == 200, f"Notarization stamp failed: {response.text}"
        result = response.json()
        assert "stamp_id" in result
        assert result["stamp_id"].startswith("TLS-")
        
        print(f"SUCCESS: Notarization stamp created: {result['stamp_id']}")
    
    def test_upload_pdf_directly(self):
        """Test uploading a PDF directly (no conversion needed)"""
        from reportlab.pdfgen import canvas
        import io
        
        pdf_buffer = io.BytesIO()
        c = canvas.Canvas(pdf_buffer)
        c.drawString(100, 750, "Direct PDF Upload Test")
        c.save()
        pdf_buffer.seek(0)
        
        files = {'file': ('direct_upload.pdf', pdf_buffer.read(), 'application/pdf')}
        response = requests.post(f"{BASE_URL}/api/documents/upload",
                                files=files,
                                headers=self.headers)
        
        assert response.status_code == 200
        data = response.json()
        
        # PDF should not be converted
        assert data.get("converted") == False or data.get("converted") is None, "PDF should not need conversion"
        assert data.get("content_type") == "application/pdf"
        assert "document_data" in data
        
        print(f"SUCCESS: PDF uploaded directly, {data.get('pages', 1)} page(s)")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
