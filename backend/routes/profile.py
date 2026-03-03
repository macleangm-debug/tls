"""
Profile Routes - Advocate profile management
"""
from fastapi import APIRouter, HTTPException, Depends, UploadFile, File, Form, Request
from typing import List, Optional
from datetime import datetime, timezone
import base64
import logging

logger = logging.getLogger(__name__)

profile_router = APIRouter(tags=["Profile"])


def get_profile_dependencies():
    """Import dependencies from main server module at runtime"""
    from server import (
        db, get_current_user, csrf_protect,
        AdvocateProfile, AdvocateUpdate, calculate_achievements
    )
    return {
        "db": db,
        "get_current_user": get_current_user,
        "csrf_protect": csrf_protect,
        "AdvocateProfile": AdvocateProfile,
        "AdvocateUpdate": AdvocateUpdate,
        "calculate_achievements": calculate_achievements
    }


@profile_router.put("/profile")
async def update_profile(data: dict, user: dict = Depends(lambda: get_profile_dependencies()["get_current_user"])):
    """Update advocate profile"""
    deps = get_profile_dependencies()
    db = deps["db"]
    AdvocateProfile = deps["AdvocateProfile"]
    
    update_data = {k: v for k, v in data.items() if v is not None}
    if not update_data:
        raise HTTPException(status_code=400, detail="No data to update")
    
    update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    await db.advocates.update_one({"id": user["id"]}, {"$set": update_data})
    
    updated = await db.advocates.find_one({"id": user["id"]}, {"_id": 0, "password_hash": 0})
    return AdvocateProfile(**updated)


@profile_router.get("/profile/{advocate_id}")
async def get_advocate_profile(advocate_id: str):
    """Get advocate profile by ID"""
    deps = get_profile_dependencies()
    db = deps["db"]
    AdvocateProfile = deps["AdvocateProfile"]
    
    advocate = await db.advocates.find_one({"id": advocate_id}, {"_id": 0, "password_hash": 0})
    if not advocate:
        raise HTTPException(status_code=404, detail="Advocate not found")
    return AdvocateProfile(**advocate)


@profile_router.get("/advocates/public/{advocate_id}")
async def get_public_advocate_profile(advocate_id: str):
    """Get public profile of an advocate (for public viewing)"""
    deps = get_profile_dependencies()
    db = deps["db"]
    calculate_achievements = deps["calculate_achievements"]
    
    advocate = await db.advocates.find_one(
        {"id": advocate_id},
        {"_id": 0, "password_hash": 0}
    )
    if not advocate:
        raise HTTPException(status_code=404, detail="Advocate not found")
    
    # Check if profile is public
    if not advocate.get("public_profile_enabled", True):
        raise HTTPException(status_code=403, detail="This advocate's profile is private")
    
    # Get public profile data
    public_profile = advocate.get("public_profile", {})
    
    # Get stamp statistics
    stamps = await db.document_stamps.find({"advocate_id": advocate_id}, {"verification_count": 1}).to_list(None)
    stamp_count = len(stamps)
    total_verifications = sum(s.get("verification_count", 0) for s in stamps)
    
    # Calculate profile completion
    completion_fields = ["bio", "practice_areas", "education", "experience", "profile_photo", "location"]
    filled = sum(1 for f in completion_fields if public_profile.get(f))
    profile_completion = int((filled / len(completion_fields)) * 100)
    
    # Calculate percentile rank
    all_advocates = await db.advocates.find({"status": {"$ne": "suspended"}}).to_list(None)
    advocate_verifications = []
    for adv in all_advocates:
        adv_stamps = await db.document_stamps.find({"advocate_id": adv["id"]}, {"verification_count": 1}).to_list(None)
        adv_total = sum(s.get("verification_count", 0) for s in adv_stamps)
        advocate_verifications.append({"id": adv["id"], "verifications": adv_total})
    
    advocate_verifications.sort(key=lambda x: x["verifications"], reverse=True)
    
    rank = 1
    for i, adv in enumerate(advocate_verifications):
        if adv["id"] == advocate_id:
            rank = i + 1
            break
    
    total_advocates = len(advocate_verifications)
    percentile_rank = int((rank / total_advocates) * 100) if total_advocates > 0 else 100
    
    # Get earned achievements
    achievements = calculate_achievements(stamp_count, total_verifications, profile_completion, percentile_rank)
    earned_achievements = [a for a in achievements if a["earned"]]
    
    return {
        "id": advocate["id"],
        "full_name": advocate.get("full_name"),
        "email": advocate.get("email") if public_profile.get("show_email", False) else None,
        "phone": advocate.get("phone") if public_profile.get("show_phone", False) else None,
        "show_email": public_profile.get("show_email", False),
        "show_phone": public_profile.get("show_phone", False),
        "title": public_profile.get("title", "Advocate of the High Court"),
        "bio": public_profile.get("bio"),
        "profile_photo": public_profile.get("profile_photo"),
        "location": public_profile.get("location"),
        "firm_name": public_profile.get("firm_name"),
        "website": public_profile.get("website"),
        "practice_areas": public_profile.get("practice_areas", []),
        "languages": public_profile.get("languages", []),
        "experience_years": public_profile.get("experience_years"),
        "education": public_profile.get("education", []),
        "experience": public_profile.get("experience", []),
        "achievements_list": public_profile.get("achievements", []),
        "memberships": public_profile.get("memberships", []),
        "publications": public_profile.get("publications", []),
        "bar_admissions": public_profile.get("bar_admissions", []),
        "roll_number": advocate.get("roll_number"),
        "tls_member_number": advocate.get("tls_member_number"),
        "court_jurisdiction": advocate.get("court_jurisdiction"),
        "admission_year": advocate.get("admission_year"),
        "verified": advocate.get("verified", False),
        "practicing_status": advocate.get("practicing_status", "Active"),
        "stats": {
            "stamps_issued": stamp_count,
            "verifications": total_verifications,
            "profile_completion": profile_completion,
            "rank": rank,
            "total_advocates": total_advocates
        },
        "achievements": earned_achievements
    }


@profile_router.get("/advocate/stats")
async def get_advocate_stats(user: dict = Depends(lambda: get_profile_dependencies()["get_current_user"])):
    """Get statistics for the logged-in advocate"""
    deps = get_profile_dependencies()
    db = deps["db"]
    
    advocate_id = user["id"]
    
    # Get stamps
    stamps = await db.document_stamps.find({"advocate_id": advocate_id}, {"_id": 0}).to_list(None)
    digital_stamps = await db.digital_stamps.find({"advocate_id": advocate_id}, {"_id": 0}).to_list(None)
    
    # Calculate stats
    total_stamps = len(stamps) + len(digital_stamps)
    active_stamps = len([s for s in stamps if s.get("status") == "active"])
    total_verifications = sum(s.get("verification_count", 0) for s in stamps)
    total_verifications += sum(s.get("used_count", 0) for s in digital_stamps)
    
    # Get orders
    orders = await db.stamp_orders.find({"advocate_id": advocate_id}, {"_id": 0}).to_list(None)
    physical_orders = await db.physical_orders.find({"advocate_id": advocate_id}, {"_id": 0}).to_list(None)
    
    # Get earnings
    total_earnings = user.get("total_earnings", 0)
    
    # Monthly stats
    now = datetime.now(timezone.utc)
    month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    monthly_stamps = len([s for s in stamps if datetime.fromisoformat(s["created_at"]) >= month_start])
    monthly_verifications = await db.verification_transactions.count_documents({
        "advocate_id": advocate_id,
        "verified_at": {"$gte": month_start.isoformat()}
    })
    
    return {
        "total_stamps": total_stamps,
        "active_stamps": active_stamps,
        "total_verifications": total_verifications,
        "total_orders": len(orders) + len(physical_orders),
        "total_earnings": total_earnings,
        "monthly_stamps": monthly_stamps,
        "monthly_verifications": monthly_verifications,
        "document_stamps": len(stamps),
        "digital_stamps": len(digital_stamps)
    }


@profile_router.get("/advocates/directory")
async def get_advocates_directory(
    search: Optional[str] = None,
    region: Optional[str] = None,
    practice_area: Optional[str] = None,
    page: int = 1,
    limit: int = 20
):
    """Public advocate directory with search and filters"""
    deps = get_profile_dependencies()
    db = deps["db"]
    
    # Build query
    query = {
        "status": {"$ne": "suspended"},
        "public_profile_enabled": {"$ne": False}
    }
    
    if search:
        query["$or"] = [
            {"full_name": {"$regex": search, "$options": "i"}},
            {"roll_number": {"$regex": search, "$options": "i"}},
            {"public_profile.firm_name": {"$regex": search, "$options": "i"}}
        ]
    
    if region:
        query["region"] = region
    
    if practice_area:
        query["public_profile.practice_areas"] = practice_area
    
    # Get total count
    total = await db.advocates.count_documents(query)
    
    # Get paginated results
    skip = (page - 1) * limit
    advocates = await db.advocates.find(
        query,
        {"_id": 0, "password_hash": 0, "email": 0, "phone": 0}
    ).skip(skip).limit(limit).to_list(limit)
    
    # Format results
    results = []
    for adv in advocates:
        public_profile = adv.get("public_profile", {})
        results.append({
            "id": adv["id"],
            "full_name": adv.get("full_name"),
            "roll_number": adv.get("roll_number"),
            "tls_member_number": adv.get("tls_member_number"),
            "region": adv.get("region"),
            "court_jurisdiction": adv.get("court_jurisdiction"),
            "verified": adv.get("verified", False),
            "practicing_status": adv.get("practicing_status", "Active"),
            "title": public_profile.get("title"),
            "bio": public_profile.get("bio", "")[:150] + "..." if public_profile.get("bio") and len(public_profile.get("bio", "")) > 150 else public_profile.get("bio"),
            "profile_photo": public_profile.get("profile_photo"),
            "location": public_profile.get("location"),
            "firm_name": public_profile.get("firm_name"),
            "practice_areas": public_profile.get("practice_areas", [])[:5],
            "experience_years": public_profile.get("experience_years")
        })
    
    return {
        "advocates": results,
        "total": total,
        "page": page,
        "limit": limit,
        "pages": (total + limit - 1) // limit
    }
