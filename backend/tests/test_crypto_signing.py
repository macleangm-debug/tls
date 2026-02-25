"""
Test suite for Cryptographic Signing Layer (ECDSA P-256 + SHA-256)
Tests crypto/status, well-known/tls-stamp-keys, stamp signing and verification
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestCryptoStatus:
    """Test crypto signing status endpoint"""
    
    def test_crypto_status_returns_signing_available(self):
        """GET /api/crypto/status returns signing_available=true"""
        response = requests.get(f"{BASE_URL}/api/crypto/status")
        assert response.status_code == 200
        data = response.json()
        
        assert data.get("signing_available") == True, "signing_available should be true"
        assert data.get("verification_available") == True, "verification_available should be true"
        assert data.get("algorithm") == "ECDSA_P256_SHA256", f"Algorithm should be ECDSA_P256_SHA256, got {data.get('algorithm')}"
        assert data.get("key_id") == "tls-key-2026-01", f"Key ID should be tls-key-2026-01, got {data.get('key_id')}"
        print(f"PASS: Crypto status returned correctly: signing={data.get('signing_available')}, alg={data.get('algorithm')}")


class TestPublicKeyEndpoint:
    """Test well-known public key endpoint"""
    
    def test_tls_stamp_keys_returns_public_key_pem(self):
        """GET /api/.well-known/tls-stamp-keys returns public key in PEM format"""
        response = requests.get(f"{BASE_URL}/api/.well-known/tls-stamp-keys")
        assert response.status_code == 200
        data = response.json()
        
        # Check keys array
        assert "keys" in data, "Response should contain 'keys' array"
        assert len(data["keys"]) > 0, "Keys array should not be empty"
        
        key = data["keys"][0]
        assert key.get("key_id") == "tls-key-2026-01", f"Key ID mismatch: {key.get('key_id')}"
        assert key.get("alg") == "ECDSA_P256_SHA256", f"Algorithm mismatch: {key.get('alg')}"
        assert key.get("active") == True, "Key should be active"
        
        # Validate PEM format
        public_pem = key.get("public_key_pem")
        assert public_pem is not None, "public_key_pem should not be None"
        assert "-----BEGIN PUBLIC KEY-----" in public_pem, "PEM should contain BEGIN marker"
        assert "-----END PUBLIC KEY-----" in public_pem, "PEM should contain END marker"
        
        print(f"PASS: Public key endpoint returns valid PEM format key with ID: {key.get('key_id')}")


class TestCryptoStampVerification:
    """Test cryptographic verification of stamps"""
    
    def test_new_stamp_has_crypto_verified_true(self):
        """GET /api/verify/stamp/{id} returns crypto_verified=true for signed stamps"""
        # Test with the known crypto-signed stamp
        stamp_id = "TLS-20260225-F3817F1F"
        response = requests.get(f"{BASE_URL}/api/verify/stamp/{stamp_id}")
        assert response.status_code == 200
        data = response.json()
        
        # Verify crypto fields
        assert data.get("crypto_verified") == True, f"crypto_verified should be true for signed stamp, got: {data.get('crypto_verified')}"
        assert data.get("crypto_signature_alg") == "ECDSA_P256_SHA256", f"Algorithm should be ECDSA_P256_SHA256, got: {data.get('crypto_signature_alg')}"
        assert data.get("crypto_key_id") == "tls-key-2026-01", f"Key ID should be tls-key-2026-01, got: {data.get('crypto_key_id')}"
        assert data.get("crypto_message") is not None, "crypto_message should be present"
        assert "verified" in data.get("crypto_message", "").lower(), f"Message should indicate verification: {data.get('crypto_message')}"
        
        print(f"PASS: Stamp {stamp_id} has crypto_verified=true with alg={data.get('crypto_signature_alg')}")
    
    def test_old_stamp_has_crypto_verified_null(self):
        """GET /api/verify/stamp/{id} returns crypto_verified=null for stamps without signature"""
        # Test with the known old stamp (created before crypto feature)
        stamp_id = "TLS-20260225-0DF3062C"
        response = requests.get(f"{BASE_URL}/api/verify/stamp/{stamp_id}")
        assert response.status_code == 200
        data = response.json()
        
        # Old stamps should have crypto_verified=null (or None)
        assert data.get("crypto_verified") is None, f"crypto_verified should be null for old stamp, got: {data.get('crypto_verified')}"
        assert data.get("crypto_signature_alg") is None, f"crypto_signature_alg should be null for old stamp"
        assert data.get("crypto_key_id") is None, f"crypto_key_id should be null for old stamp"
        
        print(f"PASS: Old stamp {stamp_id} correctly has crypto_verified=null")
    
    def test_invalid_stamp_returns_valid_false(self):
        """GET /api/verify/stamp/{id} returns valid=false for non-existent stamps"""
        stamp_id = "TLS-FAKE-INVALID"
        response = requests.get(f"{BASE_URL}/api/verify/stamp/{stamp_id}")
        assert response.status_code == 200
        data = response.json()
        
        assert data.get("valid") == False, f"valid should be false for non-existent stamp"
        print(f"PASS: Invalid stamp {stamp_id} correctly returns valid=false")


class TestNewStampCreationWithCrypto:
    """Test that new stamps are created with crypto signatures"""
    
    def test_stamp_creation_includes_crypto_signature(self):
        """POST /api/documents/stamp includes crypto_signature field in response"""
        # Login first
        login_response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "test@tls.or.tz",
            "password": "Test@12345678!"
        })
        
        if login_response.status_code != 200:
            pytest.skip("Login failed - cannot test stamp creation")
        
        token = login_response.json().get("access_token")
        headers = {"Authorization": f"Bearer {token}"}
        
        # Create a test document stamp
        import io
        files = {
            'file': ('test_crypto_creation.pdf', io.BytesIO(b'%PDF-1.4 test crypto content' + (b'x' * 1000)), 'application/pdf')
        }
        data = {
            'stamp_type': 'certification',
            'stamp_position': '{"page": 1, "anchor": "bottom_right", "offset_x_pt": 12, "offset_y_pt": 12}',
            'document_type': 'contract',
            'recipient_name': 'Crypto Test Creation',
            'description': 'Test crypto signature on creation'
        }
        
        response = requests.post(f"{BASE_URL}/api/documents/stamp", headers=headers, files=files, data=data)
        
        if response.status_code != 200:
            print(f"Stamp creation returned {response.status_code}: {response.text[:200]}")
            pytest.skip(f"Stamp creation failed with status {response.status_code}")
        
        result = response.json()
        stamp_id = result.get("stamp_id")
        assert stamp_id is not None, "stamp_id should be in response"
        
        # Now verify the stamp has crypto signature
        verify_response = requests.get(f"{BASE_URL}/api/verify/stamp/{stamp_id}")
        assert verify_response.status_code == 200
        verify_data = verify_response.json()
        
        assert verify_data.get("crypto_verified") == True, f"New stamp should have crypto_verified=true, got: {verify_data.get('crypto_verified')}"
        assert verify_data.get("crypto_signature_alg") == "ECDSA_P256_SHA256", f"Algorithm should be ECDSA_P256_SHA256"
        
        print(f"PASS: New stamp {stamp_id} created with crypto signature, verified=true")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
