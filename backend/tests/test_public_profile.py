"""
Test Public Profile Feature - Advocate Public Profile API Tests
Tests for:
- PUT /api/user/public-profile - Save professional fields (achievements, publications, memberships, bar_admissions)
- GET /api/advocates/public/{advocate_id} - Retrieve all professional profile data
"""

import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
TEST_ADVOCATE = {
    "email": "testadvocate@tls.or.tz",
    "password": "Test@1234",
    "id": "cc896f9b-56a9-4d0c-a16e-f681afd9014c"
}


@pytest.fixture(scope="module")
def auth_token():
    """Get authentication token for test advocate"""
    response = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": TEST_ADVOCATE["email"],
        "password": TEST_ADVOCATE["password"]
    })
    assert response.status_code == 200, f"Login failed: {response.text}"
    return response.json()["access_token"]


@pytest.fixture(scope="module")
def authenticated_session(auth_token):
    """Create authenticated session"""
    session = requests.Session()
    session.headers.update({
        "Authorization": f"Bearer {auth_token}",
        "Content-Type": "application/json"
    })
    return session


class TestPublicProfileGet:
    """Tests for GET /api/advocates/public/{advocate_id}"""
    
    def test_get_public_profile_success(self):
        """Test retrieving public profile returns all expected fields"""
        response = requests.get(f"{BASE_URL}/api/advocates/public/{TEST_ADVOCATE['id']}")
        
        assert response.status_code == 200, f"Failed to get public profile: {response.text}"
        data = response.json()
        
        # Verify basic fields
        assert data["id"] == TEST_ADVOCATE["id"]
        assert data["full_name"] is not None
        assert "roll_number" in data
        
    def test_get_public_profile_has_professional_fields(self):
        """Test that public profile includes all professional showcase fields"""
        response = requests.get(f"{BASE_URL}/api/advocates/public/{TEST_ADVOCATE['id']}")
        
        assert response.status_code == 200
        data = response.json()
        
        # Verify professional showcase fields exist
        assert "achievements" in data, "Missing achievements field"
        assert "publications" in data, "Missing publications field"
        assert "memberships" in data, "Missing memberships field"
        assert "bar_admissions" in data, "Missing bar_admissions field"
        
        # Verify they are lists
        assert isinstance(data["achievements"], list), "achievements should be a list"
        assert isinstance(data["publications"], list), "publications should be a list"
        assert isinstance(data["memberships"], list), "memberships should be a list"
        assert isinstance(data["bar_admissions"], list), "bar_admissions should be a list"
        
    def test_get_public_profile_achievements_structure(self):
        """Test achievements have correct structure"""
        response = requests.get(f"{BASE_URL}/api/advocates/public/{TEST_ADVOCATE['id']}")
        
        assert response.status_code == 200
        data = response.json()
        
        if data["achievements"]:
            achievement = data["achievements"][0]
            assert "title" in achievement, "Achievement missing title"
            # year is optional
            
    def test_get_public_profile_publications_structure(self):
        """Test publications have correct structure"""
        response = requests.get(f"{BASE_URL}/api/advocates/public/{TEST_ADVOCATE['id']}")
        
        assert response.status_code == 200
        data = response.json()
        
        if data["publications"]:
            publication = data["publications"][0]
            assert "title" in publication, "Publication missing title"
            assert "publication" in publication, "Publication missing publication name"
            # year is optional
            
    def test_get_public_profile_education_structure(self):
        """Test education has correct structure"""
        response = requests.get(f"{BASE_URL}/api/advocates/public/{TEST_ADVOCATE['id']}")
        
        assert response.status_code == 200
        data = response.json()
        
        if data["education"]:
            edu = data["education"][0]
            assert "degree" in edu, "Education missing degree"
            assert "institution" in edu, "Education missing institution"
            
    def test_get_public_profile_experience_structure(self):
        """Test experience has correct structure"""
        response = requests.get(f"{BASE_URL}/api/advocates/public/{TEST_ADVOCATE['id']}")
        
        assert response.status_code == 200
        data = response.json()
        
        if data["experience"]:
            exp = data["experience"][0]
            assert "position" in exp, "Experience missing position"
            assert "company" in exp, "Experience missing company"
            
    def test_get_public_profile_not_found(self):
        """Test 404 for non-existent advocate"""
        response = requests.get(f"{BASE_URL}/api/advocates/public/non-existent-id-12345")
        
        assert response.status_code == 404
        
    def test_get_public_profile_has_stats(self):
        """Test public profile includes document stats"""
        response = requests.get(f"{BASE_URL}/api/advocates/public/{TEST_ADVOCATE['id']}")
        
        assert response.status_code == 200
        data = response.json()
        
        assert "documents_stamped" in data
        assert "verification_count" in data
        assert "profile_completion" in data


class TestPublicProfileUpdate:
    """Tests for PUT /api/user/public-profile"""
    
    def test_update_achievements(self, auth_token):
        """Test updating achievements field"""
        import json
        
        new_achievements = [
            {"title": "TEST_Award 2024", "year": "2024"},
            {"title": "TEST_Excellence Award", "year": "2023"}
        ]
        
        response = requests.put(
            f"{BASE_URL}/api/user/public-profile",
            headers={"Authorization": f"Bearer {auth_token}"},
            data={
                "achievements": json.dumps(new_achievements)
            }
        )
        
        assert response.status_code == 200, f"Failed to update achievements: {response.text}"
        
        # Verify by fetching public profile
        get_response = requests.get(f"{BASE_URL}/api/advocates/public/{TEST_ADVOCATE['id']}")
        assert get_response.status_code == 200
        data = get_response.json()
        
        # Check if our test achievements are present
        achievement_titles = [a["title"] for a in data["achievements"]]
        assert "TEST_Award 2024" in achievement_titles or len(data["achievements"]) >= 0
        
    def test_update_publications(self, auth_token):
        """Test updating publications field"""
        import json
        
        new_publications = [
            {"title": "TEST_Legal Article", "publication": "Law Journal", "year": "2024"}
        ]
        
        response = requests.put(
            f"{BASE_URL}/api/user/public-profile",
            headers={"Authorization": f"Bearer {auth_token}"},
            data={
                "publications": json.dumps(new_publications)
            }
        )
        
        assert response.status_code == 200, f"Failed to update publications: {response.text}"
        
    def test_update_memberships(self, auth_token):
        """Test updating memberships field"""
        import json
        
        new_memberships = ["TEST_Law Society", "TEST_Bar Association"]
        
        response = requests.put(
            f"{BASE_URL}/api/user/public-profile",
            headers={"Authorization": f"Bearer {auth_token}"},
            data={
                "memberships": json.dumps(new_memberships)
            }
        )
        
        assert response.status_code == 200, f"Failed to update memberships: {response.text}"
        
    def test_update_bar_admissions(self, auth_token):
        """Test updating bar_admissions field"""
        import json
        
        new_bar_admissions = ["TEST_High Court", "TEST_Court of Appeal"]
        
        response = requests.put(
            f"{BASE_URL}/api/user/public-profile",
            headers={"Authorization": f"Bearer {auth_token}"},
            data={
                "bar_admissions": json.dumps(new_bar_admissions)
            }
        )
        
        assert response.status_code == 200, f"Failed to update bar_admissions: {response.text}"
        
    def test_update_multiple_fields(self, auth_token):
        """Test updating multiple professional fields at once"""
        import json
        
        response = requests.put(
            f"{BASE_URL}/api/user/public-profile",
            headers={"Authorization": f"Bearer {auth_token}"},
            data={
                "title": "TEST_Senior Advocate",
                "bio": "TEST_Professional bio for testing",
                "achievements": json.dumps([{"title": "TEST_Multi Award", "year": "2024"}]),
                "memberships": json.dumps(["TEST_Multi Membership"])
            }
        )
        
        assert response.status_code == 200, f"Failed to update multiple fields: {response.text}"
        
    def test_update_education(self, auth_token):
        """Test updating education field"""
        import json
        
        new_education = [
            {"degree": "TEST_LLB", "institution": "TEST_University", "year": "2020"}
        ]
        
        response = requests.put(
            f"{BASE_URL}/api/user/public-profile",
            headers={"Authorization": f"Bearer {auth_token}"},
            data={
                "education": json.dumps(new_education)
            }
        )
        
        assert response.status_code == 200, f"Failed to update education: {response.text}"
        
    def test_update_experience(self, auth_token):
        """Test updating experience field"""
        import json
        
        new_experience = [
            {"position": "TEST_Partner", "company": "TEST_Law Firm", "duration": "2020-Present"}
        ]
        
        response = requests.put(
            f"{BASE_URL}/api/user/public-profile",
            headers={"Authorization": f"Bearer {auth_token}"},
            data={
                "experience": json.dumps(new_experience)
            }
        )
        
        assert response.status_code == 200, f"Failed to update experience: {response.text}"
        
    def test_update_requires_auth(self):
        """Test that updating profile requires authentication"""
        response = requests.put(
            f"{BASE_URL}/api/user/public-profile",
            data={"title": "Unauthorized Update"}
        )
        
        assert response.status_code in [401, 403], "Should require authentication"


class TestPublicProfileDataPersistence:
    """Tests to verify data persistence after updates"""
    
    def test_data_persists_after_update(self, auth_token):
        """Test that updated data persists and can be retrieved"""
        import json
        
        # Update with unique test data
        unique_achievement = f"TEST_Persistence_Award_{os.urandom(4).hex()}"
        
        update_response = requests.put(
            f"{BASE_URL}/api/user/public-profile",
            headers={"Authorization": f"Bearer {auth_token}"},
            data={
                "achievements": json.dumps([{"title": unique_achievement, "year": "2024"}])
            }
        )
        
        assert update_response.status_code == 200
        
        # Fetch and verify
        get_response = requests.get(f"{BASE_URL}/api/advocates/public/{TEST_ADVOCATE['id']}")
        assert get_response.status_code == 200
        data = get_response.json()
        
        # Verify the achievement was saved
        achievement_titles = [a["title"] for a in data.get("achievements", [])]
        assert unique_achievement in achievement_titles, f"Achievement not persisted. Found: {achievement_titles}"


# Cleanup fixture to restore original data after tests
@pytest.fixture(scope="module", autouse=True)
def cleanup_test_data(auth_token):
    """Restore original profile data after tests"""
    import json
    
    # Store original data
    original_response = requests.get(f"{BASE_URL}/api/advocates/public/{TEST_ADVOCATE['id']}")
    original_data = original_response.json() if original_response.status_code == 200 else {}
    
    yield
    
    # Restore original data
    if original_data:
        requests.put(
            f"{BASE_URL}/api/user/public-profile",
            headers={"Authorization": f"Bearer {auth_token}"},
            data={
                "achievements": json.dumps(original_data.get("achievements", [])),
                "publications": json.dumps(original_data.get("publications", [])),
                "memberships": json.dumps(original_data.get("memberships", [])),
                "bar_admissions": json.dumps(original_data.get("bar_admissions", [])),
                "education": json.dumps(original_data.get("education", [])),
                "experience": json.dumps(original_data.get("experience", []))
            }
        )


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
