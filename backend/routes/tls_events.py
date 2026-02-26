"""
TLS Global Events Module
Manages organization-wide events that appear on all advocate calendars.
Examples: AGM, CPD sessions, regulatory deadlines, branch meetings

Features:
- Create/update/cancel TLS-wide events (admin/super admin only)
- Recurrence support (RRULE-based)
- Audience scoping (all/region/role)
- Mandatory event flags
- Acknowledgement scaffolding (Phase 2)
"""

from fastapi import APIRouter, HTTPException, Depends, Query
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from datetime import datetime, timezone, timedelta
from dateutil.rrule import rrulestr, rrule, DAILY, WEEKLY, MONTHLY, YEARLY
from dateutil.parser import parse as parse_date
import uuid

# Create router
tls_events_router = APIRouter(prefix="/api/tls", tags=["TLS Events"])


# =============== PYDANTIC MODELS ===============

class RecurrenceRule(BaseModel):
    enabled: bool = False
    rule: Optional[str] = None  # RRULE string e.g., "FREQ=YEARLY;INTERVAL=1;BYMONTH=6;BYMONTHDAY=15"
    until: Optional[str] = None  # ISO date string
    count: Optional[int] = None  # Alternative to until

class AudienceScope(BaseModel):
    scope: str = "all"  # "all" | "region" | "role"
    regions: List[str] = []  # e.g., ["Dar es Salaam", "Arusha"]
    roles: List[str] = []  # e.g., ["advocate"]

class AttendanceConfig(BaseModel):
    enabled: bool = False
    mode: str = "admin"  # "admin" | "self_attest" | "qr"
    cpd_points: Optional[int] = None
    certificate_enabled: bool = False

class TLSEventCreate(BaseModel):
    title: str
    description: Optional[str] = ""
    event_type: str = "tls_announcement"  # tls_announcement, cpd, agm, holiday, deadline, branch_meeting, other
    priority: str = "medium"  # high, medium, low
    
    start_at: str  # ISO datetime
    end_at: Optional[str] = None  # ISO datetime
    all_day: bool = False
    timezone: str = "Africa/Dar_es_Salaam"
    
    recurrence: Optional[RecurrenceRule] = None
    audience: Optional[AudienceScope] = None
    
    is_mandatory: bool = False
    require_ack: bool = False  # For AGM and notices
    ack_deadline_at: Optional[str] = None  # Optional acknowledgement deadline
    attendance: Optional[AttendanceConfig] = None  # For CPD and AGM
    show_in_sidebar: bool = True
    
    links: List[Dict[str, str]] = []  # [{"label": "Agenda", "url": "..."}]

class TLSEventUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    event_type: Optional[str] = None
    priority: Optional[str] = None
    start_at: Optional[str] = None
    end_at: Optional[str] = None
    all_day: Optional[bool] = None
    timezone: Optional[str] = None
    recurrence: Optional[RecurrenceRule] = None
    audience: Optional[AudienceScope] = None
    is_mandatory: Optional[bool] = None
    require_ack: Optional[bool] = None
    ack_deadline_at: Optional[str] = None
    attendance: Optional[AttendanceConfig] = None
    show_in_sidebar: Optional[bool] = None
    links: Optional[List[Dict[str, str]]] = None

class TLSEventCancel(BaseModel):
    reason: str = Field(..., min_length=5)

class AttendanceMarkRequest(BaseModel):
    advocate_ids: List[str]
    status: str = "attended"  # "attended" | "absent" | "excused"
    reason: Optional[str] = None


# =============== HELPER FUNCTIONS ===============

def expand_recurrence(event: dict, from_date: datetime, to_date: datetime) -> List[dict]:
    """
    Expand a recurring event into individual occurrences within the date range.
    Returns a list of event instances.
    """
    recurrence = event.get("recurrence", {})
    if not recurrence or not recurrence.get("enabled") or not recurrence.get("rule"):
        # Not recurring, return single instance
        event_start = parse_date(event["start_at"])
        if from_date <= event_start <= to_date:
            return [create_occurrence_instance(event, event["start_at"], event.get("end_at"))]
        return []
    
    try:
        # Parse the RRULE
        rule_str = recurrence["rule"]
        dtstart = parse_date(event["start_at"])
        
        # Build rrule with dtstart
        rr = rrulestr(rule_str, dtstart=dtstart)
        
        # Apply until/count limits
        until_date = None
        if recurrence.get("until"):
            until_date = parse_date(recurrence["until"])
        
        count = recurrence.get("count")
        
        # Generate occurrences within range
        occurrences = []
        occurrence_count = 0
        max_occurrences = count if count else 100  # Safety limit
        
        for dt in rr:
            # Check bounds
            if until_date and dt > until_date:
                break
            if occurrence_count >= max_occurrences:
                break
            if dt > to_date:
                break
            if dt >= from_date:
                # Calculate end time offset
                end_at = None
                if event.get("end_at"):
                    original_start = parse_date(event["start_at"])
                    original_end = parse_date(event["end_at"])
                    duration = original_end - original_start
                    end_at = (dt + duration).isoformat()
                
                occurrences.append(create_occurrence_instance(
                    event, 
                    dt.isoformat(), 
                    end_at,
                    occurrence_id=f"TLS-OCC-{event['id']}-{dt.strftime('%Y%m%d')}"
                ))
            occurrence_count += 1
        
        return occurrences
    except Exception as e:
        # If RRULE parsing fails, return single instance
        print(f"RRULE expansion error: {e}")
        return [create_occurrence_instance(event, event["start_at"], event.get("end_at"))]


def create_occurrence_instance(event: dict, start_at: str, end_at: str, occurrence_id: str = None) -> dict:
    """Create a calendar-ready occurrence instance from a TLS event."""
    return {
        "id": occurrence_id or f"TLS-{event['id']}",
        "title": event["title"],
        "start": start_at,
        "end": end_at,
        "allDay": event.get("all_day", False),
        "source": "tls",
        "readonly": True,
        "series_id": event.get("series_id"),
        "is_recurring_instance": event.get("recurrence", {}).get("enabled", False),
        "extendedProps": {
            "source": "tls",
            "readonly": True,
            "event_type": event.get("event_type", "tls_announcement"),
            "priority": event.get("priority", "medium"),
            "is_mandatory": event.get("is_mandatory", False),
            "require_ack": event.get("require_ack", False),
            "description": event.get("description", ""),
            "links": event.get("links", []),
            "status": event.get("status", "scheduled"),
            "original_event_id": event["id"]
        }
    }


def check_audience_match(event: dict, user: dict) -> bool:
    """Check if a user matches the audience scope of a TLS event."""
    audience = event.get("audience", {})
    scope = audience.get("scope", "all")
    
    if scope == "all":
        return True
    
    if scope == "region":
        user_region = user.get("location", "").strip()
        event_regions = audience.get("regions", [])
        # Match if user region is in event regions (case-insensitive)
        if not event_regions:
            return True
        return any(user_region.lower() == r.lower() for r in event_regions)
    
    if scope == "role":
        user_role = user.get("role", "").strip()
        event_roles = audience.get("roles", [])
        if not event_roles:
            return True
        return user_role.lower() in [r.lower() for r in event_roles]
    
    return True


# =============== ROUTE FACTORY ===============

def create_tls_events_routes(db, get_current_user, require_admin, require_super_admin):
    """Create TLS events routes with database and auth dependencies."""
    
    # =============== ADMIN ENDPOINTS ===============
    
    @tls_events_router.get("/events")
    async def get_tls_events(
        from_date: Optional[str] = Query(None, alias="from"),
        to_date: Optional[str] = Query(None, alias="to"),
        status: Optional[str] = None,
        event_type: Optional[str] = None,
        user: dict = Depends(get_current_user)
    ):
        """
        Get TLS global events.
        - Admins see all events
        - Advocates see events matching their audience scope
        """
        query = {}
        
        if status:
            query["status"] = status
        else:
            query["status"] = {"$ne": "cancelled"}  # Default: exclude cancelled
        
        if event_type:
            query["event_type"] = event_type
        
        events = await db.tls_global_events.find(query, {"_id": 0}).sort("start_at", 1).to_list(500)
        
        # Filter by audience if user is not admin
        is_admin = user.get("role") in ["admin", "super_admin"]
        if not is_admin:
            events = [e for e in events if check_audience_match(e, user)]
        
        # Expand recurrence if date range provided
        if from_date and to_date:
            try:
                from_dt = parse_date(from_date)
                to_dt = parse_date(to_date)
                expanded = []
                for event in events:
                    expanded.extend(expand_recurrence(event, from_dt, to_dt))
                return {"events": expanded, "total": len(expanded), "expanded": True}
            except Exception as e:
                print(f"Date parsing error: {e}")
        
        return {"events": events, "total": len(events), "expanded": False}
    
    @tls_events_router.post("/events")
    async def create_tls_event(data: TLSEventCreate, user: dict = Depends(require_admin)):
        """Create a new TLS-wide event. Requires admin or super_admin role."""
        now = datetime.now(timezone.utc).isoformat()
        
        event_id = str(uuid.uuid4())
        series_id = f"TLS-SERIES-{event_id}" if data.recurrence and data.recurrence.enabled else None
        
        event = {
            "id": event_id,
            "title": data.title,
            "description": data.description or "",
            "event_type": data.event_type,
            "priority": data.priority,
            "start_at": data.start_at,
            "end_at": data.end_at,
            "all_day": data.all_day,
            "timezone": data.timezone,
            "recurrence": data.recurrence.dict() if data.recurrence else {"enabled": False},
            "series_id": series_id,
            "audience": data.audience.dict() if data.audience else {"scope": "all", "regions": [], "roles": []},
            "status": "scheduled",
            "is_mandatory": data.is_mandatory,
            "require_ack": data.require_ack,
            "ack_deadline_at": data.ack_deadline_at,
            "attendance": data.attendance.dict() if data.attendance else {"enabled": False, "mode": "admin", "cpd_points": None, "certificate_enabled": False},
            "show_in_sidebar": data.show_in_sidebar,
            "is_read_only": True,
            "links": data.links,
            "created_by": user["id"],
            "created_at": now,
            "updated_at": now
        }
        
        # Auto-enable features based on event type
        if data.event_type in ["agm", "tls_announcement"] and not data.require_ack:
            # Default to require_ack for AGM and notices
            event["require_ack"] = True
        
        if data.event_type in ["cpd", "agm"]:
            # Default to attendance enabled for CPD and AGM
            if not data.attendance or not data.attendance.enabled:
                event["attendance"] = {"enabled": True, "mode": "admin", "cpd_points": data.attendance.cpd_points if data.attendance else None, "certificate_enabled": False}
        
        await db.tls_global_events.insert_one(event)
        event.pop("_id", None)
        
        # Log system event
        await db.system_events.insert_one({
            "event_type": "TLS_EVENT_CREATED",
            "event_id": event_id,
            "title": data.title,
            "created_by": user["id"],
            "created_by_email": user.get("email"),
            "audience_scope": event["audience"]["scope"],
            "is_mandatory": data.is_mandatory,
            "is_recurring": data.recurrence.enabled if data.recurrence else False,
            "timestamp": now
        })
        
        return {"message": "TLS event created", "event": event}
    
    @tls_events_router.get("/events/{event_id}")
    async def get_tls_event(event_id: str, user: dict = Depends(get_current_user)):
        """Get a specific TLS event."""
        event = await db.tls_global_events.find_one({"id": event_id}, {"_id": 0})
        if not event:
            raise HTTPException(status_code=404, detail="TLS event not found")
        
        # Check audience access for non-admins
        is_admin = user.get("role") in ["admin", "super_admin"]
        if not is_admin and not check_audience_match(event, user):
            raise HTTPException(status_code=403, detail="You do not have access to this event")
        
        return event
    
    @tls_events_router.patch("/events/{event_id}")
    async def update_tls_event(event_id: str, data: TLSEventUpdate, user: dict = Depends(require_admin)):
        """Update a TLS event. Requires admin role."""
        event = await db.tls_global_events.find_one({"id": event_id})
        if not event:
            raise HTTPException(status_code=404, detail="TLS event not found")
        
        now = datetime.now(timezone.utc).isoformat()
        update_data = {"updated_at": now}
        
        # Build update from provided fields
        update_dict = data.dict(exclude_unset=True)
        for key, value in update_dict.items():
            if value is not None:
                if key == "recurrence" and value:
                    update_data["recurrence"] = value
                    # Update series_id if enabling recurrence
                    if value.get("enabled") and not event.get("series_id"):
                        update_data["series_id"] = f"TLS-SERIES-{event_id}"
                elif key == "audience" and value:
                    update_data["audience"] = value
                else:
                    update_data[key] = value
        
        await db.tls_global_events.update_one(
            {"id": event_id},
            {"$set": update_data}
        )
        
        # Log system event
        await db.system_events.insert_one({
            "event_type": "TLS_EVENT_UPDATED",
            "event_id": event_id,
            "updated_by": user["id"],
            "updated_by_email": user.get("email"),
            "changes": list(update_data.keys()),
            "timestamp": now
        })
        
        updated_event = await db.tls_global_events.find_one({"id": event_id}, {"_id": 0})
        return {"message": "TLS event updated", "event": updated_event}
    
    @tls_events_router.post("/events/{event_id}/cancel")
    async def cancel_tls_event(event_id: str, data: TLSEventCancel, user: dict = Depends(require_admin)):
        """Cancel a TLS event. Requires admin role."""
        event = await db.tls_global_events.find_one({"id": event_id})
        if not event:
            raise HTTPException(status_code=404, detail="TLS event not found")
        
        if event.get("status") == "cancelled":
            raise HTTPException(status_code=400, detail="Event is already cancelled")
        
        now = datetime.now(timezone.utc).isoformat()
        
        await db.tls_global_events.update_one(
            {"id": event_id},
            {"$set": {
                "status": "cancelled",
                "cancelled_at": now,
                "cancelled_by": user["id"],
                "cancel_reason": data.reason,
                "updated_at": now
            }}
        )
        
        # Log system event
        await db.system_events.insert_one({
            "event_type": "TLS_EVENT_CANCELLED",
            "event_id": event_id,
            "title": event.get("title"),
            "cancelled_by": user["id"],
            "cancelled_by_email": user.get("email"),
            "reason": data.reason,
            "timestamp": now
        })
        
        return {"message": "TLS event cancelled", "reason": data.reason}
    
    @tls_events_router.delete("/events/{event_id}")
    async def delete_tls_event(event_id: str, user: dict = Depends(require_super_admin)):
        """
        Permanently delete a TLS event. Requires super_admin role.
        Note: Prefer cancel over delete for audit trail.
        """
        event = await db.tls_global_events.find_one({"id": event_id})
        if not event:
            raise HTTPException(status_code=404, detail="TLS event not found")
        
        await db.tls_global_events.delete_one({"id": event_id})
        
        now = datetime.now(timezone.utc).isoformat()
        await db.system_events.insert_one({
            "event_type": "TLS_EVENT_DELETED",
            "event_id": event_id,
            "title": event.get("title"),
            "deleted_by": user["id"],
            "deleted_by_email": user.get("email"),
            "timestamp": now
        })
        
        return {"message": "TLS event permanently deleted"}
    
    # =============== ACKNOWLEDGEMENT (Phase 2 Scaffold) ===============
    
    @tls_events_router.post("/events/{event_id}/ack")
    async def acknowledge_tls_event(event_id: str, user: dict = Depends(get_current_user)):
        """
        Acknowledge a TLS event (Phase 2 scaffold).
        Currently returns success but doesn't require acknowledgement.
        """
        event = await db.tls_global_events.find_one({"id": event_id}, {"_id": 0})
        if not event:
            raise HTTPException(status_code=404, detail="TLS event not found")
        
        # Phase 2: Check if acknowledgement is required
        if not event.get("require_ack", False):
            return {"message": "Acknowledgement not required for this event", "acknowledged": False}
        
        now = datetime.now(timezone.utc).isoformat()
        
        # Check if already acknowledged
        existing = await db.tls_event_ack.find_one({
            "event_id": event_id,
            "advocate_id": user["id"]
        })
        
        if existing:
            return {"message": "Already acknowledged", "acknowledged_at": existing.get("acknowledged_at")}
        
        # Record acknowledgement
        ack_record = {
            "id": str(uuid.uuid4()),
            "event_id": event_id,
            "advocate_id": user["id"],
            "advocate_email": user.get("email"),
            "acknowledged_at": now
        }
        
        await db.tls_event_ack.insert_one(ack_record)
        ack_record.pop("_id", None)
        
        # Log system event
        await db.system_events.insert_one({
            "event_type": "TLS_EVENT_ACKNOWLEDGED",
            "event_id": event_id,
            "advocate_id": user["id"],
            "advocate_email": user.get("email"),
            "timestamp": now
        })
        
        return {"message": "Event acknowledged", "acknowledged_at": now}
    
    @tls_events_router.get("/events/{event_id}/ack-status")
    async def get_ack_status(event_id: str, user: dict = Depends(get_current_user)):
        """Get acknowledgement status for a TLS event."""
        event = await db.tls_global_events.find_one({"id": event_id}, {"_id": 0})
        if not event:
            raise HTTPException(status_code=404, detail="TLS event not found")
        
        # Check if user has acknowledged
        ack = await db.tls_event_ack.find_one({
            "event_id": event_id,
            "advocate_id": user["id"]
        }, {"_id": 0})
        
        return {
            "event_id": event_id,
            "require_ack": event.get("require_ack", False),
            "acknowledged": ack is not None,
            "acknowledged_at": ack.get("acknowledged_at") if ack else None
        }
    
    # Admin: Get all acknowledgements for an event
    @tls_events_router.get("/events/{event_id}/acknowledgements")
    async def get_event_acknowledgements(
        event_id: str, 
        user: dict = Depends(require_admin)
    ):
        """Get all acknowledgements for a TLS event (admin only)."""
        event = await db.tls_global_events.find_one({"id": event_id}, {"_id": 0})
        if not event:
            raise HTTPException(status_code=404, detail="TLS event not found")
        
        acks = await db.tls_event_ack.find(
            {"event_id": event_id},
            {"_id": 0}
        ).sort("acknowledged_at", -1).to_list(1000)
        
        return {
            "event_id": event_id,
            "event_title": event.get("title"),
            "require_ack": event.get("require_ack", False),
            "acknowledgements": acks,
            "total": len(acks)
        }
    
    # =============== ATTENDANCE ENDPOINTS ===============
    
    @tls_events_router.get("/events/{event_id}/attendance")
    async def get_event_attendance(
        event_id: str,
        status: Optional[str] = None,
        user: dict = Depends(require_admin)
    ):
        """Get attendance records for a TLS event (admin only)."""
        event = await db.tls_global_events.find_one({"id": event_id}, {"_id": 0})
        if not event:
            raise HTTPException(status_code=404, detail="TLS event not found")
        
        query = {"event_id": event_id}
        if status:
            query["status"] = status
        
        attendance_records = await db.tls_event_attendance.find(
            query, {"_id": 0}
        ).sort("updated_at", -1).to_list(1000)
        
        # Get advocate details for each record
        advocate_ids = [r["advocate_id"] for r in attendance_records]
        advocates = await db.users.find(
            {"id": {"$in": advocate_ids}},
            {"_id": 0, "id": 1, "full_name": 1, "email": 1, "roll_number": 1, "location": 1}
        ).to_list(1000)
        advocate_map = {a["id"]: a for a in advocates}
        
        # Merge advocate info
        for record in attendance_records:
            advocate = advocate_map.get(record["advocate_id"], {})
            record["advocate_name"] = advocate.get("full_name", "Unknown")
            record["advocate_email"] = advocate.get("email", "")
            record["advocate_roll"] = advocate.get("roll_number", "")
            record["advocate_region"] = advocate.get("location", "")
        
        # Count by status
        status_counts = {
            "registered": len([r for r in attendance_records if r.get("status") == "registered"]),
            "attended": len([r for r in attendance_records if r.get("status") == "attended"]),
            "absent": len([r for r in attendance_records if r.get("status") == "absent"]),
            "excused": len([r for r in attendance_records if r.get("status") == "excused"])
        }
        
        return {
            "event_id": event_id,
            "event_title": event.get("title"),
            "attendance_enabled": event.get("attendance", {}).get("enabled", False),
            "attendance_mode": event.get("attendance", {}).get("mode", "admin"),
            "cpd_points": event.get("attendance", {}).get("cpd_points"),
            "records": attendance_records,
            "total": len(attendance_records),
            "counts": status_counts
        }
    
    @tls_events_router.post("/events/{event_id}/attendance/mark")
    async def mark_attendance(
        event_id: str,
        data: AttendanceMarkRequest,
        user: dict = Depends(require_admin)
    ):
        """Bulk mark attendance for advocates (admin only)."""
        event = await db.tls_global_events.find_one({"id": event_id}, {"_id": 0})
        if not event:
            raise HTTPException(status_code=404, detail="TLS event not found")
        
        if not event.get("attendance", {}).get("enabled", False):
            raise HTTPException(status_code=400, detail="Attendance tracking not enabled for this event")
        
        if data.status not in ["registered", "attended", "absent", "excused"]:
            raise HTTPException(status_code=400, detail="Invalid status")
        
        now = datetime.now(timezone.utc).isoformat()
        marked_count = 0
        
        for advocate_id in data.advocate_ids:
            # Upsert attendance record
            existing = await db.tls_event_attendance.find_one({
                "event_id": event_id,
                "advocate_id": advocate_id
            })
            
            if existing:
                await db.tls_event_attendance.update_one(
                    {"event_id": event_id, "advocate_id": advocate_id},
                    {"$set": {
                        "status": data.status,
                        "marked_by": user["id"],
                        "marked_at": now,
                        "reason": data.reason,
                        "updated_at": now
                    }}
                )
            else:
                await db.tls_event_attendance.insert_one({
                    "id": str(uuid.uuid4()),
                    "event_id": event_id,
                    "advocate_id": advocate_id,
                    "status": data.status,
                    "check_in_at": now if data.status == "attended" else None,
                    "marked_by": user["id"],
                    "marked_at": now,
                    "reason": data.reason,
                    "proof": {"method": "admin_mark", "token": None},
                    "created_at": now,
                    "updated_at": now
                })
            marked_count += 1
        
        # Log system event
        await db.system_events.insert_one({
            "event_type": "TLS_EVENT_ATTENDANCE_MARKED",
            "event_id": event_id,
            "marked_by": user["id"],
            "marked_by_email": user.get("email"),
            "advocate_count": marked_count,
            "status": data.status,
            "timestamp": now
        })
        
        return {
            "message": f"Marked {marked_count} advocates as {data.status}",
            "marked_count": marked_count,
            "status": data.status
        }
    
    @tls_events_router.post("/events/{event_id}/register")
    async def register_for_event(event_id: str, user: dict = Depends(get_current_user)):
        """Register for a TLS event (advocate action)."""
        event = await db.tls_global_events.find_one({"id": event_id}, {"_id": 0})
        if not event:
            raise HTTPException(status_code=404, detail="TLS event not found")
        
        if not event.get("attendance", {}).get("enabled", False):
            raise HTTPException(status_code=400, detail="Registration not available for this event")
        
        # Check if already registered
        existing = await db.tls_event_attendance.find_one({
            "event_id": event_id,
            "advocate_id": user["id"]
        })
        
        if existing:
            return {"message": "Already registered", "status": existing.get("status"), "registered_at": existing.get("created_at")}
        
        now = datetime.now(timezone.utc).isoformat()
        
        await db.tls_event_attendance.insert_one({
            "id": str(uuid.uuid4()),
            "event_id": event_id,
            "advocate_id": user["id"],
            "status": "registered",
            "check_in_at": None,
            "proof": {"method": "self_register", "token": None},
            "created_at": now,
            "updated_at": now
        })
        
        # Log system event
        await db.system_events.insert_one({
            "event_type": "TLS_EVENT_REGISTERED",
            "event_id": event_id,
            "advocate_id": user["id"],
            "advocate_email": user.get("email"),
            "timestamp": now
        })
        
        return {"message": "Registered successfully", "status": "registered", "registered_at": now}
    
    @tls_events_router.get("/events/{event_id}/my-attendance")
    async def get_my_attendance(event_id: str, user: dict = Depends(get_current_user)):
        """Get current user's attendance status for a TLS event."""
        event = await db.tls_global_events.find_one({"id": event_id}, {"_id": 0})
        if not event:
            raise HTTPException(status_code=404, detail="TLS event not found")
        
        attendance = await db.tls_event_attendance.find_one({
            "event_id": event_id,
            "advocate_id": user["id"]
        }, {"_id": 0})
        
        return {
            "event_id": event_id,
            "attendance_enabled": event.get("attendance", {}).get("enabled", False),
            "attendance_mode": event.get("attendance", {}).get("mode", "admin"),
            "cpd_points": event.get("attendance", {}).get("cpd_points"),
            "registered": attendance is not None,
            "status": attendance.get("status") if attendance else None,
            "check_in_at": attendance.get("check_in_at") if attendance else None,
            "registered_at": attendance.get("created_at") if attendance else None
        }
    
    @tls_events_router.get("/events/{event_id}/attendance/export")
    async def export_attendance_csv(event_id: str, user: dict = Depends(require_admin)):
        """Export attendance records as CSV (admin only)."""
        from fastapi.responses import StreamingResponse
        import io
        import csv
        
        event = await db.tls_global_events.find_one({"id": event_id}, {"_id": 0})
        if not event:
            raise HTTPException(status_code=404, detail="TLS event not found")
        
        records = await db.tls_event_attendance.find(
            {"event_id": event_id}, {"_id": 0}
        ).to_list(5000)
        
        # Get advocate details
        advocate_ids = [r["advocate_id"] for r in records]
        advocates = await db.users.find(
            {"id": {"$in": advocate_ids}},
            {"_id": 0, "id": 1, "full_name": 1, "email": 1, "roll_number": 1, "location": 1, "phone": 1}
        ).to_list(5000)
        advocate_map = {a["id"]: a for a in advocates}
        
        # Create CSV
        output = io.StringIO()
        writer = csv.writer(output)
        writer.writerow(["Roll Number", "Full Name", "Email", "Phone", "Region", "Status", "Check-in Time", "Registered At"])
        
        for record in records:
            advocate = advocate_map.get(record["advocate_id"], {})
            writer.writerow([
                advocate.get("roll_number", ""),
                advocate.get("full_name", "Unknown"),
                advocate.get("email", ""),
                advocate.get("phone", ""),
                advocate.get("location", ""),
                record.get("status", ""),
                record.get("check_in_at", ""),
                record.get("created_at", "")
            ])
        
        output.seek(0)
        filename = f"attendance_{event_id[:8]}_{datetime.now().strftime('%Y%m%d')}.csv"
        
        return StreamingResponse(
            iter([output.getvalue()]),
            media_type="text/csv",
            headers={"Content-Disposition": f"attachment; filename={filename}"}
        )
    
    return tls_events_router
