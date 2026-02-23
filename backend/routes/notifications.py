"""
Notifications Module for TLS Advocate Portal
Handles in-app notifications, email notifications, and reminder scheduling
"""

from fastapi import APIRouter, HTTPException, Depends, BackgroundTasks
from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime, timezone, timedelta
from bson import ObjectId
import asyncio
import logging

logger = logging.getLogger(__name__)

# Create router
notifications_router = APIRouter(prefix="/api/notifications", tags=["Notifications"])

# =============== PYDANTIC MODELS ===============

class NotificationCreate(BaseModel):
    title: str
    message: str
    type: str = "info"  # info, warning, success, error, reminder
    link: Optional[str] = None  # URL to navigate to when clicked
    event_id: Optional[str] = None  # Related event ID for reminders
    expires_at: Optional[str] = None  # When notification should auto-expire

class NotificationPreferences(BaseModel):
    # In-app notifications
    in_app_reminders: bool = True
    in_app_calendar: bool = True
    in_app_tasks: bool = True
    in_app_system: bool = True
    
    # Email notifications
    email_reminders: bool = True
    email_calendar: bool = True
    email_tasks: bool = True
    email_system: bool = False
    
    # Reminder timing (minutes before event)
    reminder_times: List[int] = [15, 60, 1440]  # 15min, 1hr, 1day

class NotificationPreferencesUpdate(BaseModel):
    in_app_reminders: Optional[bool] = None
    in_app_calendar: Optional[bool] = None
    in_app_tasks: Optional[bool] = None
    in_app_system: Optional[bool] = None
    email_reminders: Optional[bool] = None
    email_calendar: Optional[bool] = None
    email_tasks: Optional[bool] = None
    email_system: Optional[bool] = None
    reminder_times: Optional[List[int]] = None


# =============== HELPER FUNCTIONS ===============

def get_default_notification_preferences():
    """Return default notification preferences"""
    return {
        "in_app_reminders": True,
        "in_app_calendar": True,
        "in_app_tasks": True,
        "in_app_system": True,
        "email_reminders": True,
        "email_calendar": True,
        "email_tasks": True,
        "email_system": False,
        "reminder_times": [15, 60, 1440]  # 15min, 1hr, 1day
    }


def generate_reminder_email_html(event_title: str, event_time: str, event_type: str, minutes_until: int, advocate_name: str) -> str:
    """Generate HTML email for event reminder"""
    time_text = f"{minutes_until} minutes" if minutes_until < 60 else f"{minutes_until // 60} hour{'s' if minutes_until >= 120 else ''}"
    if minutes_until >= 1440:
        time_text = f"{minutes_until // 1440} day{'s' if minutes_until >= 2880 else ''}"
    
    event_type_colors = {
        "court_hearing": "#EF4444",
        "meeting": "#3B82F6", 
        "deadline": "#F59E0B",
        "reminder": "#8B5CF6",
        "appointment": "#10B981"
    }
    color = event_type_colors.get(event_type, "#3B82F6")
    
    return f"""
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="margin: 0; padding: 0; background-color: #0a0d14; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif;">
        <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #0a0d14; padding: 40px 20px;">
            <tr>
                <td align="center">
                    <table width="600" cellpadding="0" cellspacing="0" style="background-color: #1a1f2e; border-radius: 16px; overflow: hidden;">
                        <!-- Header -->
                        <tr>
                            <td style="background: linear-gradient(135deg, {color}22, {color}11); padding: 30px; text-align: center; border-bottom: 1px solid rgba(255,255,255,0.1);">
                                <div style="width: 60px; height: 60px; background-color: {color}33; border-radius: 12px; margin: 0 auto 15px; display: flex; align-items: center; justify-content: center;">
                                    <span style="font-size: 28px;">🔔</span>
                                </div>
                                <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: 600;">Event Reminder</h1>
                                <p style="color: rgba(255,255,255,0.6); margin: 8px 0 0; font-size: 14px;">Starting in {time_text}</p>
                            </td>
                        </tr>
                        
                        <!-- Content -->
                        <tr>
                            <td style="padding: 30px;">
                                <p style="color: rgba(255,255,255,0.7); margin: 0 0 20px; font-size: 16px;">
                                    Hello {advocate_name},
                                </p>
                                
                                <div style="background-color: rgba(255,255,255,0.05); border-radius: 12px; padding: 20px; border-left: 4px solid {color};">
                                    <h2 style="color: #ffffff; margin: 0 0 10px; font-size: 20px;">{event_title}</h2>
                                    <p style="color: rgba(255,255,255,0.6); margin: 0; font-size: 14px;">
                                        <span style="display: inline-block; background-color: {color}22; color: {color}; padding: 4px 10px; border-radius: 20px; font-size: 12px; text-transform: capitalize;">
                                            {event_type.replace('_', ' ')}
                                        </span>
                                    </p>
                                    <p style="color: rgba(255,255,255,0.8); margin: 15px 0 0; font-size: 16px;">
                                        📅 {event_time}
                                    </p>
                                </div>
                                
                                <p style="color: rgba(255,255,255,0.5); margin: 25px 0 0; font-size: 14px; text-align: center;">
                                    Log in to your TLS Portal to view event details
                                </p>
                            </td>
                        </tr>
                        
                        <!-- Footer -->
                        <tr>
                            <td style="padding: 20px 30px; background-color: rgba(0,0,0,0.2); text-align: center;">
                                <p style="color: rgba(255,255,255,0.4); margin: 0; font-size: 12px;">
                                    Tanganyika Law Society Portal<br>
                                    You can manage your notification preferences in your account settings.
                                </p>
                            </td>
                        </tr>
                    </table>
                </td>
            </tr>
        </table>
    </body>
    </html>
    """


# =============== NOTIFICATION ROUTES ===============

def setup_notification_routes(db, get_current_user, send_email_func=None):
    """Setup notification routes with database and auth dependencies"""
    
    @notifications_router.get("")
    async def get_notifications(
        unread_only: bool = False,
        limit: int = 50,
        user: dict = Depends(get_current_user)
    ):
        """Get user's notifications"""
        query = {"user_id": user["id"]}
        if unread_only:
            query["read"] = False
        
        notifications = await db.notifications.find(query, {"_id": 0}).sort("created_at", -1).limit(limit).to_list(length=limit)
        
        # Get unread count
        unread_count = await db.notifications.count_documents({"user_id": user["id"], "read": False})
        
        return {
            "notifications": notifications,
            "unread_count": unread_count
        }
    
    @notifications_router.get("/unread-count")
    async def get_unread_count(user: dict = Depends(get_current_user)):
        """Get count of unread notifications"""
        count = await db.notifications.count_documents({"user_id": user["id"], "read": False})
        return {"unread_count": count}
    
    @notifications_router.post("/mark-read/{notification_id}")
    async def mark_notification_read(notification_id: str, user: dict = Depends(get_current_user)):
        """Mark a notification as read"""
        result = await db.notifications.update_one(
            {"id": notification_id, "user_id": user["id"]},
            {"$set": {"read": True, "read_at": datetime.now(timezone.utc).isoformat()}}
        )
        if result.matched_count == 0:
            raise HTTPException(status_code=404, detail="Notification not found")
        return {"message": "Notification marked as read"}
    
    @notifications_router.post("/mark-all-read")
    async def mark_all_notifications_read(user: dict = Depends(get_current_user)):
        """Mark all notifications as read"""
        await db.notifications.update_many(
            {"user_id": user["id"], "read": False},
            {"$set": {"read": True, "read_at": datetime.now(timezone.utc).isoformat()}}
        )
        return {"message": "All notifications marked as read"}
    
    @notifications_router.delete("/{notification_id}")
    async def delete_notification(notification_id: str, user: dict = Depends(get_current_user)):
        """Delete a notification"""
        result = await db.notifications.delete_one({"id": notification_id, "user_id": user["id"]})
        if result.deleted_count == 0:
            raise HTTPException(status_code=404, detail="Notification not found")
        return {"message": "Notification deleted"}
    
    @notifications_router.delete("/clear-all")
    async def clear_all_notifications(user: dict = Depends(get_current_user)):
        """Clear all notifications for user"""
        await db.notifications.delete_many({"user_id": user["id"]})
        return {"message": "All notifications cleared"}
    
    @notifications_router.get("/preferences")
    async def get_notification_preferences(user: dict = Depends(get_current_user)):
        """Get user's notification preferences"""
        advocate = await db.advocates.find_one({"id": user["id"]}, {"_id": 0, "reminder_preferences": 1})
        preferences = advocate.get("reminder_preferences") if advocate else None
        
        if not preferences:
            preferences = get_default_notification_preferences()
        
        return {"preferences": preferences}
    
    @notifications_router.put("/preferences")
    async def update_notification_preferences(
        preferences: NotificationPreferencesUpdate,
        user: dict = Depends(get_current_user)
    ):
        """Update user's notification preferences"""
        # Get current preferences or defaults
        advocate = await db.advocates.find_one({"id": user["id"]}, {"_id": 0, "reminder_preferences": 1})
        current_prefs = advocate.get("reminder_preferences") if advocate else get_default_notification_preferences()
        
        # Update only provided fields
        update_data = preferences.model_dump(exclude_unset=True)
        current_prefs.update(update_data)
        
        await db.advocates.update_one(
            {"id": user["id"]},
            {"$set": {"reminder_preferences": current_prefs, "updated_at": datetime.now(timezone.utc).isoformat()}}
        )
        
        return {"message": "Preferences updated", "preferences": current_prefs}
    
    # =============== INTERNAL NOTIFICATION FUNCTIONS ===============
    
    async def create_notification(
        user_id: str,
        title: str,
        message: str,
        notification_type: str = "info",
        link: Optional[str] = None,
        event_id: Optional[str] = None
    ):
        """Create a new in-app notification"""
        notification = {
            "id": str(ObjectId()),
            "user_id": user_id,
            "title": title,
            "message": message,
            "type": notification_type,
            "link": link,
            "event_id": event_id,
            "read": False,
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        await db.notifications.insert_one(notification)
        return notification
    
    async def send_reminder_notification(
        user_id: str,
        event: dict,
        minutes_until: int,
        send_email: bool = True,
        send_in_app: bool = True
    ):
        """Send reminder notification for an event (both in-app and email)"""
        # Get user preferences
        advocate = await db.advocates.find_one({"id": user_id}, {"_id": 0, "email": 1, "full_name": 1, "reminder_preferences": 1})
        if not advocate:
            return
        
        preferences = advocate.get("reminder_preferences", get_default_notification_preferences())
        
        # Format time text
        if minutes_until < 60:
            time_text = f"{minutes_until} minutes"
        elif minutes_until < 1440:
            time_text = f"{minutes_until // 60} hour{'s' if minutes_until >= 120 else ''}"
        else:
            time_text = f"{minutes_until // 1440} day{'s' if minutes_until >= 2880 else ''}"
        
        # Send in-app notification
        if send_in_app and preferences.get("in_app_reminders", True):
            await create_notification(
                user_id=user_id,
                title=f"Reminder: {event['title']}",
                message=f"Starting in {time_text}",
                notification_type="reminder",
                link=f"/practice?tab=calendar",
                event_id=event.get("id")
            )
        
        # Send email notification
        if send_email and preferences.get("email_reminders", True) and send_email_func:
            try:
                event_time = datetime.fromisoformat(event["start_datetime"].replace("Z", "+00:00"))
                formatted_time = event_time.strftime("%A, %B %d, %Y at %I:%M %p")
                
                html_content = generate_reminder_email_html(
                    event_title=event["title"],
                    event_time=formatted_time,
                    event_type=event.get("event_type", "event"),
                    minutes_until=minutes_until,
                    advocate_name=advocate.get("full_name", "Advocate")
                )
                
                await send_email_func(
                    to_email=advocate["email"],
                    subject=f"Reminder: {event['title']} - Starting in {time_text}",
                    html_content=html_content
                )
                logger.info(f"Sent reminder email to {advocate['email']} for event {event['id']}")
            except Exception as e:
                logger.error(f"Failed to send reminder email: {e}")
    
    async def check_and_send_reminders():
        """Check for upcoming events and send reminders"""
        now = datetime.now(timezone.utc)
        
        # Get all events in the next 24 hours
        tomorrow = now + timedelta(days=1)
        
        events = await db.events.find({
            "start_datetime": {
                "$gte": now.isoformat(),
                "$lte": tomorrow.isoformat()
            },
            "status": {"$ne": "cancelled"}
        }).to_list(length=1000)
        
        for event in events:
            event_time = datetime.fromisoformat(event["start_datetime"].replace("Z", "+00:00"))
            minutes_until = int((event_time - now).total_seconds() / 60)
            
            # Get reminder times for this event
            reminder_minutes = event.get("reminder_minutes", [15, 60, 1440])
            
            for reminder_time in reminder_minutes:
                # Check if we should send a reminder (within 5 minute window)
                if abs(minutes_until - reminder_time) <= 5:
                    # Check if we already sent this reminder
                    reminder_key = f"{event['id']}_{reminder_time}"
                    existing = await db.sent_reminders.find_one({"reminder_key": reminder_key})
                    
                    if not existing:
                        # Send reminder
                        await send_reminder_notification(
                            user_id=event["advocate_id"],
                            event=event,
                            minutes_until=minutes_until
                        )
                        
                        # Mark as sent
                        await db.sent_reminders.insert_one({
                            "reminder_key": reminder_key,
                            "event_id": event["id"],
                            "reminder_minutes": reminder_time,
                            "sent_at": now.isoformat()
                        })
    
    # Attach helper functions to router for external access
    notifications_router.create_notification = create_notification
    notifications_router.send_reminder_notification = send_reminder_notification
    notifications_router.check_and_send_reminders = check_and_send_reminders
    
    return notifications_router
