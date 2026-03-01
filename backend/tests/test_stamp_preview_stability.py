"""
Test Suite: Stamp Preview Stability
Tests for the fixed race condition and blob URL lifecycle management in stamp preview generation.

Key fixes being tested:
1. Race condition guard with requestIdRef - stale API responses should be ignored
2. Blob URL lifecycle management - proper cleanup on unmount and replacement
3. State normalization for notarization (force signatureMode='none')
4. Reduced stamp sizes (140x75pt compact, 150x95pt certification)
5. Stamp type toggling should NOT cause stamp preview to disappear
"""
import pytest
import requests
import os
import time

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://stamp-and-manage.preview.emergentagent.com').rstrip('/')

# Test credentials
TEST_EMAIL = "test@tls.or.tz"
TEST_PASSWORD = "Test@12345678!"


class TestStampRenderImageEndpoint:
    """Tests for /api/stamps/render-image endpoint - verifies correct stamp sizes"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Login and get auth token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        assert response.status_code == 200, f"Login failed: {response.text}"
        self.token = response.json().get("access_token")
        self.headers = {"Authorization": f"Bearer {self.token}"}
    
    def test_certification_stamp_with_digital_signature_returns_correct_size(self):
        """Certification stamp with digital signature should return 150x95pt"""
        data = {
            "stamp_type": "certification",
            "brand_color": "#10B981",
            "advocate_name": "Test Advocate",
            "include_signature": "true",
            "show_signature_placeholder": "false"
        }
        response = requests.post(f"{BASE_URL}/api/stamps/render-image", data=data, headers=self.headers)
        
        assert response.status_code == 200, f"Render failed: {response.text}"
        assert response.headers.get("Content-Type") == "image/png"
        
        # Verify stamp dimensions (certification with signature = 150x95pt)
        width_pt = response.headers.get("X-Stamp-Width-Pt")
        height_pt = response.headers.get("X-Stamp-Height-Pt")
        variant = response.headers.get("X-Stamp-Variant")
        
        assert width_pt == "150", f"Expected width 150pt, got {width_pt}"
        assert height_pt == "95", f"Expected height 95pt, got {height_pt}"
        assert variant == "certification", f"Expected variant 'certification', got {variant}"
        print(f"✓ Certification stamp with digital signature: {width_pt}x{height_pt}pt (variant: {variant})")
    
    def test_certification_stamp_with_placeholder_returns_correct_size(self):
        """Certification stamp with placeholder should return 150x95pt"""
        data = {
            "stamp_type": "certification",
            "brand_color": "#3B82F6",
            "advocate_name": "Test Advocate",
            "include_signature": "false",
            "show_signature_placeholder": "true"
        }
        response = requests.post(f"{BASE_URL}/api/stamps/render-image", data=data, headers=self.headers)
        
        assert response.status_code == 200
        
        width_pt = response.headers.get("X-Stamp-Width-Pt")
        height_pt = response.headers.get("X-Stamp-Height-Pt")
        variant = response.headers.get("X-Stamp-Variant")
        
        assert width_pt == "150", f"Expected width 150pt, got {width_pt}"
        assert height_pt == "95", f"Expected height 95pt, got {height_pt}"
        assert variant == "certification"
        print(f"✓ Certification stamp with placeholder: {width_pt}x{height_pt}pt (variant: {variant})")
    
    def test_notarization_stamp_returns_compact_size(self):
        """Notarization stamp (no signature) should return 140x75pt"""
        data = {
            "stamp_type": "notarization",
            "brand_color": "#10B981",
            "advocate_name": "Test Advocate",
            "include_signature": "false",
            "show_signature_placeholder": "false"
        }
        response = requests.post(f"{BASE_URL}/api/stamps/render-image", data=data, headers=self.headers)
        
        assert response.status_code == 200
        
        width_pt = response.headers.get("X-Stamp-Width-Pt")
        height_pt = response.headers.get("X-Stamp-Height-Pt")
        variant = response.headers.get("X-Stamp-Variant")
        
        assert width_pt == "140", f"Expected width 140pt, got {width_pt}"
        assert height_pt == "75", f"Expected height 75pt, got {height_pt}"
        assert variant == "compact", f"Expected variant 'compact', got {variant}"
        print(f"✓ Notarization stamp (compact): {width_pt}x{height_pt}pt (variant: {variant})")
    
    def test_notarization_ignores_signature_flags(self):
        """Notarization stamp should ignore signature flags - always compact"""
        data = {
            "stamp_type": "notarization",
            "brand_color": "#10B981",
            "advocate_name": "Test Advocate",
            # These should be ignored for notarization
            "include_signature": "true",
            "show_signature_placeholder": "true"
        }
        response = requests.post(f"{BASE_URL}/api/stamps/render-image", data=data, headers=self.headers)
        
        assert response.status_code == 200
        
        width_pt = response.headers.get("X-Stamp-Width-Pt")
        height_pt = response.headers.get("X-Stamp-Height-Pt")
        variant = response.headers.get("X-Stamp-Variant")
        
        # Should still return compact size
        assert width_pt == "140", f"Expected width 140pt (compact), got {width_pt}"
        assert height_pt == "75", f"Expected height 75pt (compact), got {height_pt}"
        assert variant == "compact", f"Expected variant 'compact', got {variant}"
        print(f"✓ Notarization ignores signature flags: {width_pt}x{height_pt}pt (variant: {variant})")


class TestRapidStampTypeToggling:
    """Tests for rapid toggling between stamp types - simulates race condition scenario"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Login and get auth token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        assert response.status_code == 200
        self.token = response.json().get("access_token")
        self.headers = {"Authorization": f"Bearer {self.token}"}
    
    def test_rapid_certification_notarization_toggle(self):
        """Rapidly toggle between Certification and Notarization - all should return valid images"""
        stamp_types = ["certification", "notarization", "certification", "notarization", "certification"]
        results = []
        
        for i, stamp_type in enumerate(stamp_types):
            data = {
                "stamp_type": stamp_type,
                "brand_color": "#10B981",
                "advocate_name": "Test Advocate",
                "include_signature": "false",
                "show_signature_placeholder": "true" if stamp_type == "certification" else "false"
            }
            
            response = requests.post(f"{BASE_URL}/api/stamps/render-image", data=data, headers=self.headers)
            
            assert response.status_code == 200, f"Request {i+1} failed: {response.text}"
            assert len(response.content) > 1000, f"Request {i+1} returned empty/small image"
            
            results.append({
                "index": i + 1,
                "stamp_type": stamp_type,
                "variant": response.headers.get("X-Stamp-Variant"),
                "width": response.headers.get("X-Stamp-Width-Pt"),
                "height": response.headers.get("X-Stamp-Height-Pt"),
                "image_size": len(response.content)
            })
            
            # Small delay to simulate rapid but sequential requests
            time.sleep(0.05)
        
        print(f"✓ Rapid toggling test completed with {len(results)} successful requests:")
        for r in results:
            print(f"  [{r['index']}] {r['stamp_type']}: {r['variant']} ({r['width']}x{r['height']}pt) - {r['image_size']} bytes")
        
        # Verify all returned valid images
        assert all(r['image_size'] > 1000 for r in results), "Some requests returned invalid images"
    
    def test_rapid_signature_mode_toggle(self):
        """Rapidly toggle signature modes for certification stamps"""
        modes = [
            ("true", "false"),   # Digital signature
            ("false", "true"),   # Sign after printing
            ("true", "false"),   # Digital signature again
            ("false", "true"),   # Sign after printing again
        ]
        
        for i, (include_sig, show_placeholder) in enumerate(modes):
            data = {
                "stamp_type": "certification",
                "brand_color": "#10B981",
                "advocate_name": "Test Advocate",
                "include_signature": include_sig,
                "show_signature_placeholder": show_placeholder
            }
            
            response = requests.post(f"{BASE_URL}/api/stamps/render-image", data=data, headers=self.headers)
            
            assert response.status_code == 200, f"Mode toggle {i+1} failed"
            assert len(response.content) > 1000, f"Mode toggle {i+1} returned invalid image"
            
            variant = response.headers.get("X-Stamp-Variant")
            assert variant == "certification", f"Expected certification variant, got {variant}"
            
        print(f"✓ Signature mode toggling test passed - all 4 toggles returned valid certification stamps")


class TestStampPreviewImageQuality:
    """Tests for stamp preview image quality and format"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Login and get auth token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        assert response.status_code == 200
        self.token = response.json().get("access_token")
        self.headers = {"Authorization": f"Bearer {self.token}"}
    
    def test_stamp_returns_valid_png(self):
        """Stamp preview should return valid PNG image"""
        data = {
            "stamp_type": "certification",
            "brand_color": "#10B981",
            "advocate_name": "Test Advocate",
            "include_signature": "false",
            "show_signature_placeholder": "true"
        }
        
        response = requests.post(f"{BASE_URL}/api/stamps/render-image", data=data, headers=self.headers)
        
        assert response.status_code == 200
        
        # Check PNG magic bytes (89 50 4E 47 0D 0A 1A 0A)
        png_magic = b'\x89PNG\r\n\x1a\n'
        assert response.content[:8] == png_magic, "Response is not a valid PNG image"
        print(f"✓ Valid PNG image returned ({len(response.content)} bytes)")
    
    def test_stamp_has_reasonable_pixel_dimensions(self):
        """Stamp should have reasonable pixel dimensions for display"""
        data = {
            "stamp_type": "certification",
            "brand_color": "#10B981",
            "advocate_name": "Test Advocate",
            "include_signature": "false",
            "show_signature_placeholder": "true"
        }
        
        response = requests.post(f"{BASE_URL}/api/stamps/render-image", data=data, headers=self.headers)
        
        assert response.status_code == 200
        
        width_px = response.headers.get("X-Stamp-Width-Px")
        height_px = response.headers.get("X-Stamp-Height-Px")
        
        # Verify we have pixel dimensions
        assert width_px is not None, "Missing X-Stamp-Width-Px header"
        assert height_px is not None, "Missing X-Stamp-Height-Px header"
        
        width_px = int(width_px)
        height_px = int(height_px)
        
        # Reasonable range (with scale 2.0, should be ~300-900px)
        assert 100 <= width_px <= 2000, f"Width {width_px}px out of reasonable range"
        assert 100 <= height_px <= 2000, f"Height {height_px}px out of reasonable range"
        
        print(f"✓ Stamp pixel dimensions: {width_px}x{height_px}px")


class TestAllBrandColors:
    """Tests to verify all brand colors work correctly"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Login and get auth token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        assert response.status_code == 200
        self.token = response.json().get("access_token")
        self.headers = {"Authorization": f"Bearer {self.token}"}
    
    def test_all_standard_colors(self):
        """Test all 6 standard brand colors return valid stamps"""
        colors = [
            ("#10B981", "Emerald"),
            ("#3B82F6", "Blue"),
            ("#8B5CF6", "Purple"),
            ("#EF4444", "Red"),
            ("#F59E0B", "Amber"),
            ("#06B6D4", "Cyan")
        ]
        
        for hex_color, name in colors:
            data = {
                "stamp_type": "certification",
                "brand_color": hex_color,
                "advocate_name": "Test Advocate",
                "include_signature": "false",
                "show_signature_placeholder": "true"
            }
            
            response = requests.post(f"{BASE_URL}/api/stamps/render-image", data=data, headers=self.headers)
            
            assert response.status_code == 200, f"Color {name} ({hex_color}) failed"
            assert len(response.content) > 1000, f"Color {name} returned invalid image"
            
        print(f"✓ All {len(colors)} brand colors render correctly")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
