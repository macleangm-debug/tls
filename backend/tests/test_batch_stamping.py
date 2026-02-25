"""
Test Batch Stamping Feature for TLS Advocates
- Tests batch upload, validation, processing, and ZIP generation
- Tests unique stamp_id, QR code, and SHA256 hash binding for each document
- Tests anchor-based positioning and page modes
"""
import pytest
import requests
import os
import io
import zipfile
import csv

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
TEST_EMAIL = "test@tls.or.tz"
TEST_PASSWORD = "Test@12345678!"


class TestBatchStamping:
    """Batch stamping API endpoint tests"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        """Get authentication token for test user"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": TEST_EMAIL, "password": TEST_PASSWORD}
        )
        assert response.status_code == 200, f"Login failed: {response.text}"
        return response.json()["access_token"]
    
    @pytest.fixture(scope="class")
    def headers(self, auth_token):
        """Get auth headers"""
        return {"Authorization": f"Bearer {auth_token}"}
    
    @pytest.fixture
    def sample_pdf(self):
        """Create a minimal valid PDF for testing"""
        # Minimal PDF content
        pdf_content = b"""%PDF-1.4
1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj
2 0 obj << /Type /Pages /Kids [3 0 R] /Count 1 >> endobj
3 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << >> >> endobj
xref
0 4
0000000000 65535 f 
0000000009 00000 n 
0000000058 00000 n 
0000000115 00000 n 
trailer << /Size 4 /Root 1 0 R >>
startxref
210
%%EOF"""
        return pdf_content
    
    @pytest.fixture
    def sample_pdf_2(self):
        """Create a second valid PDF for batch testing"""
        pdf_content = b"""%PDF-1.4
1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj
2 0 obj << /Type /Pages /Kids [3 0 R] /Count 1 >> endobj
3 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << >> >> endobj
xref
0 4
0000000000 65535 f 
0000000009 00000 n 
0000000058 00000 n 
0000000115 00000 n 
trailer << /Size 4 /Root 1 0 R >>
startxref
210
%%EOF"""
        return pdf_content
    
    # ===== LOGIN AND AUTH TESTS =====
    
    def test_login_success(self):
        """Test that login works with valid credentials"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": TEST_EMAIL, "password": TEST_PASSWORD}
        )
        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data
        assert data["user"]["practicing_status"] == "Active"
        print(f"✓ Login successful for {TEST_EMAIL}")
    
    # ===== BATCH STAMPING API TESTS =====
    
    def test_batch_stamp_single_file(self, headers, sample_pdf):
        """Test batch stamping with a single PDF file"""
        files = [
            ('files', ('test_document.pdf', io.BytesIO(sample_pdf), 'application/pdf'))
        ]
        data = {
            'anchor': 'bottom_right',
            'offset_x_pt': '12',
            'offset_y_pt': '12',
            'page_mode': 'first',
            'document_type': 'contract',
            'recipient_name': 'Test Recipient',
            'recipient_org': 'Test Organization',
            'description': 'Test batch stamping',
            'border_color': '#10B981',
            'stamp_type': 'certification'
        }
        
        response = requests.post(
            f"{BASE_URL}/api/documents/batch-stamp",
            headers=headers,
            files=files,
            data=data
        )
        
        assert response.status_code == 200, f"Batch stamp failed: {response.text}"
        assert response.headers.get('Content-Type') == 'application/zip'
        
        # Verify headers
        assert 'X-Batch-ID' in response.headers
        assert response.headers.get('X-Total-Files') == '1'
        assert response.headers.get('X-Success-Count') == '1'
        assert response.headers.get('X-Failed-Count') == '0'
        
        print(f"✓ Single file batch stamping successful - Batch ID: {response.headers.get('X-Batch-ID')}")
    
    def test_batch_stamp_multiple_files(self, headers, sample_pdf, sample_pdf_2):
        """Test batch stamping with multiple PDF files"""
        files = [
            ('files', ('document1.pdf', io.BytesIO(sample_pdf), 'application/pdf')),
            ('files', ('document2.pdf', io.BytesIO(sample_pdf_2), 'application/pdf'))
        ]
        data = {
            'anchor': 'bottom_right',
            'offset_x_pt': '12',
            'offset_y_pt': '12',
            'page_mode': 'first',
            'document_type': 'contract',
            'recipient_name': 'Multi-Doc Recipient',
            'recipient_org': 'Test Corp',
            'description': 'Multi-file batch test',
            'border_color': '#3B82F6',
            'stamp_type': 'certification'
        }
        
        response = requests.post(
            f"{BASE_URL}/api/documents/batch-stamp",
            headers=headers,
            files=files,
            data=data
        )
        
        assert response.status_code == 200
        assert response.headers.get('X-Total-Files') == '2'
        assert response.headers.get('X-Success-Count') == '2'
        
        print(f"✓ Multiple files batch stamping successful - {response.headers.get('X-Success-Count')}/2 documents stamped")
    
    def test_batch_stamp_zip_contents(self, headers, sample_pdf, sample_pdf_2):
        """Test that batch stamp returns valid ZIP with stamped PDFs and CSV summary"""
        files = [
            ('files', ('contract_a.pdf', io.BytesIO(sample_pdf), 'application/pdf')),
            ('files', ('contract_b.pdf', io.BytesIO(sample_pdf_2), 'application/pdf'))
        ]
        data = {
            'anchor': 'bottom_right',
            'offset_x_pt': '12',
            'offset_y_pt': '12',
            'page_mode': 'first',
            'document_type': 'contract',
            'recipient_name': 'ZIP Test Recipient',
            'recipient_org': '',
            'description': '',
            'border_color': '#10B981',
            'stamp_type': 'certification'
        }
        
        response = requests.post(
            f"{BASE_URL}/api/documents/batch-stamp",
            headers=headers,
            files=files,
            data=data
        )
        
        assert response.status_code == 200
        
        # Parse ZIP file
        zip_buffer = io.BytesIO(response.content)
        with zipfile.ZipFile(zip_buffer, 'r') as zf:
            file_list = zf.namelist()
            
            # Check for stamped PDFs
            stamped_pdfs = [f for f in file_list if f.endswith('_stamped.pdf')]
            assert len(stamped_pdfs) == 2, f"Expected 2 stamped PDFs, found {len(stamped_pdfs)}"
            
            # Check for summary CSV
            csv_files = [f for f in file_list if f.endswith('.csv')]
            assert len(csv_files) == 1, f"Expected 1 CSV summary, found {len(csv_files)}"
            
            # Parse CSV and verify contents
            csv_content = zf.read(csv_files[0]).decode('utf-8')
            lines = csv_content.strip().split('\n')
            assert len(lines) >= 3, f"Expected header + 2 data rows, got {len(lines)} lines"
            
            # Check CSV header
            header = lines[0]
            assert 'stamp_id' in header
            assert 'doc_hash' in header
            assert 'status' in header
            
            # Check each result row has unique stamp_id and OK status
            stamp_ids = set()
            for line in lines[1:]:
                parts = line.split(',')
                if len(parts) >= 2:
                    stamp_id = parts[1]  # stamp_id column
                    if stamp_id and stamp_id.startswith('TLS-'):
                        stamp_ids.add(stamp_id)
            
            assert len(stamp_ids) == 2, f"Expected 2 unique stamp_ids, found {len(stamp_ids)}"
        
        print(f"✓ ZIP contents verified: {len(stamped_pdfs)} PDFs + CSV summary with unique stamp_ids")
    
    def test_batch_stamp_csv_has_correct_fields(self, headers, sample_pdf):
        """Test that summary CSV contains required fields: stamp_id, doc_hash, status=OK"""
        files = [
            ('files', ('csv_test.pdf', io.BytesIO(sample_pdf), 'application/pdf'))
        ]
        data = {
            'anchor': 'bottom_right',
            'offset_x_pt': '12',
            'offset_y_pt': '12',
            'page_mode': 'first',
            'document_type': 'contract',
            'recipient_name': 'CSV Field Test',
            'recipient_org': '',
            'description': '',
            'border_color': '#10B981',
            'stamp_type': 'certification'
        }
        
        response = requests.post(
            f"{BASE_URL}/api/documents/batch-stamp",
            headers=headers,
            files=files,
            data=data
        )
        
        assert response.status_code == 200
        
        zip_buffer = io.BytesIO(response.content)
        with zipfile.ZipFile(zip_buffer, 'r') as zf:
            csv_files = [f for f in zf.namelist() if f.endswith('.csv')]
            csv_content = zf.read(csv_files[0]).decode('utf-8')
            lines = csv_content.strip().split('\n')
            
            # Parse header and data
            header = lines[0].split(',')
            data_row = lines[1].split(',')
            
            # Create dict from header and data
            row_dict = dict(zip(header, data_row))
            
            # Verify required fields
            assert 'stamp_id' in row_dict, "stamp_id field missing"
            assert row_dict['stamp_id'].startswith('TLS-'), f"Invalid stamp_id format: {row_dict['stamp_id']}"
            
            assert 'doc_hash' in row_dict, "doc_hash field missing"
            assert len(row_dict['doc_hash']) == 64, f"doc_hash should be SHA256 (64 chars), got {len(row_dict['doc_hash'])}"
            
            assert 'status' in row_dict, "status field missing"
            assert row_dict['status'] == 'OK', f"Expected status=OK, got {row_dict['status']}"
        
        print(f"✓ CSV fields verified: stamp_id={row_dict['stamp_id']}, doc_hash length=64, status=OK")
    
    # ===== POSITION ANCHOR TESTS =====
    
    def test_batch_stamp_different_anchors(self, headers, sample_pdf):
        """Test batch stamping with different anchor positions"""
        anchors = ['bottom_right', 'bottom_left', 'top_right', 'top_left', 'center']
        
        for anchor in anchors:
            files = [
                ('files', (f'anchor_{anchor}.pdf', io.BytesIO(sample_pdf), 'application/pdf'))
            ]
            data = {
                'anchor': anchor,
                'offset_x_pt': '12',
                'offset_y_pt': '12',
                'page_mode': 'first',
                'document_type': 'contract',
                'recipient_name': f'Anchor Test {anchor}',
                'recipient_org': '',
                'description': '',
                'border_color': '#10B981',
                'stamp_type': 'certification'
            }
            
            response = requests.post(
                f"{BASE_URL}/api/documents/batch-stamp",
                headers=headers,
                files=files,
                data=data
            )
            
            assert response.status_code == 200, f"Anchor {anchor} failed: {response.text}"
        
        print(f"✓ All anchor positions tested successfully: {', '.join(anchors)}")
    
    def test_batch_stamp_page_mode_all(self, headers, sample_pdf):
        """Test batch stamping with page_mode='all'"""
        files = [
            ('files', ('all_pages_test.pdf', io.BytesIO(sample_pdf), 'application/pdf'))
        ]
        data = {
            'anchor': 'bottom_right',
            'offset_x_pt': '12',
            'offset_y_pt': '12',
            'page_mode': 'all',  # Stamp all pages
            'document_type': 'contract',
            'recipient_name': 'All Pages Test',
            'recipient_org': '',
            'description': '',
            'border_color': '#10B981',
            'stamp_type': 'certification'
        }
        
        response = requests.post(
            f"{BASE_URL}/api/documents/batch-stamp",
            headers=headers,
            files=files,
            data=data
        )
        
        assert response.status_code == 200
        print("✓ Page mode 'all' test passed")
    
    # ===== ERROR HANDLING TESTS =====
    
    def test_batch_stamp_reject_non_pdf(self, headers):
        """Test that non-PDF files are rejected"""
        # Create a fake text file
        text_content = b"This is not a PDF"
        files = [
            ('files', ('document.txt', io.BytesIO(text_content), 'text/plain'))
        ]
        data = {
            'anchor': 'bottom_right',
            'offset_x_pt': '12',
            'offset_y_pt': '12',
            'page_mode': 'first',
            'document_type': 'contract',
            'recipient_name': 'Test',
            'recipient_org': '',
            'description': '',
            'border_color': '#10B981',
            'stamp_type': 'certification'
        }
        
        response = requests.post(
            f"{BASE_URL}/api/documents/batch-stamp",
            headers=headers,
            files=files,
            data=data
        )
        
        assert response.status_code == 400
        assert "PDF" in response.json()["detail"] or "pdf" in response.json()["detail"].lower()
        print("✓ Non-PDF file correctly rejected")
    
    def test_batch_stamp_no_files(self, headers):
        """Test that request without files is rejected"""
        data = {
            'anchor': 'bottom_right',
            'offset_x_pt': '12',
            'offset_y_pt': '12',
            'page_mode': 'first',
            'document_type': 'contract',
            'recipient_name': 'Test',
            'recipient_org': '',
            'description': '',
            'border_color': '#10B981',
            'stamp_type': 'certification'
        }
        
        response = requests.post(
            f"{BASE_URL}/api/documents/batch-stamp",
            headers=headers,
            data=data
        )
        
        # Should fail - either 400 (no files) or 422 (validation error)
        assert response.status_code in [400, 422]
        print("✓ Request without files correctly rejected")
    
    def test_batch_stamp_requires_auth(self, sample_pdf):
        """Test that batch stamping requires authentication"""
        files = [
            ('files', ('test.pdf', io.BytesIO(sample_pdf), 'application/pdf'))
        ]
        data = {
            'anchor': 'bottom_right',
            'offset_x_pt': '12',
            'offset_y_pt': '12',
            'page_mode': 'first',
            'document_type': 'contract',
            'recipient_name': 'Test',
            'recipient_org': '',
            'description': '',
            'border_color': '#10B981',
            'stamp_type': 'certification'
        }
        
        response = requests.post(
            f"{BASE_URL}/api/documents/batch-stamp",
            files=files,
            data=data
        )
        
        assert response.status_code == 401
        print("✓ Authentication correctly required for batch stamping")
    
    # ===== BATCH HISTORY API TEST =====
    
    def test_get_batch_history(self, headers):
        """Test retrieving batch stamping history"""
        response = requests.get(
            f"{BASE_URL}/api/documents/batch-stamps",
            headers=headers
        )
        
        assert response.status_code == 200
        batches = response.json()
        assert isinstance(batches, list)
        
        if len(batches) > 0:
            batch = batches[0]
            assert 'batch_id' in batch
            assert 'file_count' in batch
            assert 'success_count' in batch
            assert 'failed_count' in batch
            assert 'created_at' in batch
        
        print(f"✓ Batch history retrieved: {len(batches)} batches found")


# Run tests
if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
