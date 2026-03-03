# Backend Routes Module Initialization
# Exports all route modules for registration in server.py

from fastapi import APIRouter

# Import route modules
from routes.auth import auth_router
from routes.verification import verification_router
from routes.profile import profile_router
from routes.orders import orders_router
from routes.membership import membership_router
from routes.notifications import notifications_router
from routes.tls_events import tls_events_router

# Note: The following routers are prepared but routes still live in server.py:
# - documents_router (routes/documents.py)
# - admin_router (routes/admin.py)
# - institutional_router (routes/institutional.py)

__all__ = [
    "auth_router",
    "verification_router", 
    "profile_router",
    "orders_router",
    "membership_router",
    "notifications_router",
    "tls_events_router",
]
