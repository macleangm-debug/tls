"""
Practice Management Module for TLS Advocate Portal
Includes: Document Vault, Clients, Cases, Calendar, Tasks, Invoicing, Analytics
"""

from fastapi import APIRouter, HTTPException, Depends, Query, UploadFile, File, Form
from pydantic import BaseModel, Field, EmailStr
from typing import List, Optional, Dict, Any
from datetime import datetime, timezone, timedelta
from bson import ObjectId
import uuid
import os
import base64
import hashlib

# Create router
practice_router = APIRouter(prefix="/api/practice", tags=["Practice Management"])

# =============== PYDANTIC MODELS ===============

# Document Vault Models
class DocumentCreate(BaseModel):
    name: str
    description: Optional[str] = ""
    folder: Optional[str] = "General"
    tags: List[str] = []
    client_id: Optional[str] = None
    case_id: Optional[str] = None

class DocumentUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    folder: Optional[str] = None
    tags: Optional[List[str]] = None
    client_id: Optional[str] = None
    case_id: Optional[str] = None

class FolderCreate(BaseModel):
    name: str
    parent_folder: Optional[str] = None
    color: Optional[str] = "#3B82F6"

# Client Models
class ClientCreate(BaseModel):
    name: str
    email: Optional[str] = None
    phone: Optional[str] = None
    address: Optional[str] = None
    company: Optional[str] = None
    client_type: str = "individual"  # individual, corporate, government
    notes: Optional[str] = ""
    tags: List[str] = []

class ClientUpdate(BaseModel):
    name: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    address: Optional[str] = None
    company: Optional[str] = None
    client_type: Optional[str] = None
    notes: Optional[str] = None
    tags: Optional[List[str]] = None

# Case/Matter Models
class CaseCreate(BaseModel):
    title: str
    case_number: Optional[str] = None
    client_id: str
    case_type: str  # litigation, corporate, family, property, criminal, other
    court: Optional[str] = None
    judge: Optional[str] = None
    opposing_party: Optional[str] = None
    opposing_counsel: Optional[str] = None
    description: Optional[str] = ""
    status: str = "active"  # active, pending, closed, on_hold
    priority: str = "medium"  # low, medium, high, urgent
    start_date: Optional[str] = None
    expected_end_date: Optional[str] = None
    billing_type: str = "hourly"  # hourly, fixed, contingency, pro_bono
    hourly_rate: Optional[float] = None
    fixed_fee: Optional[float] = None

class CaseUpdate(BaseModel):
    title: Optional[str] = None
    case_number: Optional[str] = None
    client_id: Optional[str] = None
    case_type: Optional[str] = None
    court: Optional[str] = None
    judge: Optional[str] = None
    opposing_party: Optional[str] = None
    opposing_counsel: Optional[str] = None
    description: Optional[str] = None
    status: Optional[str] = None
    priority: Optional[str] = None
    start_date: Optional[str] = None
    expected_end_date: Optional[str] = None
    billing_type: Optional[str] = None
    hourly_rate: Optional[float] = None
    fixed_fee: Optional[float] = None

# Calendar/Event Models
class EventCreate(BaseModel):
    title: str
    event_type: str  # court_hearing, meeting, deadline, reminder, appointment
    start_datetime: str
    end_datetime: Optional[str] = None
    all_day: bool = False
    location: Optional[str] = None
    description: Optional[str] = ""
    client_id: Optional[str] = None
    case_id: Optional[str] = None
    reminder_minutes: List[int] = [30, 1440]  # 30 mins, 1 day before
    recurring: Optional[str] = None  # daily, weekly, monthly, yearly
    color: Optional[str] = "#3B82F6"

class EventUpdate(BaseModel):
    title: Optional[str] = None
    event_type: Optional[str] = None
    start_datetime: Optional[str] = None
    end_datetime: Optional[str] = None
    all_day: Optional[bool] = None
    location: Optional[str] = None
    description: Optional[str] = None
    client_id: Optional[str] = None
    case_id: Optional[str] = None
    reminder_minutes: Optional[List[int]] = None
    recurring: Optional[str] = None
    color: Optional[str] = None
    status: Optional[str] = None  # scheduled, completed, cancelled

class EventStatusUpdate(BaseModel):
    status: str  # scheduled, completed, cancelled

class EventReminderUpdate(BaseModel):
    reminder_minutes: List[int]  # e.g., [15, 30, 60, 1440] for 15min, 30min, 1hr, 1day

class CaseStatusUpdate(BaseModel):
    status: str  # active, pending, closed, on_hold

# Task Models
class TaskCreate(BaseModel):
    title: str
    description: Optional[str] = ""
    due_date: Optional[str] = None
    priority: str = "medium"  # low, medium, high, urgent
    status: str = "pending"  # pending, in_progress, completed, cancelled
    client_id: Optional[str] = None
    case_id: Optional[str] = None
    tags: List[str] = []
    checklist: List[Dict[str, Any]] = []  # [{text: "", completed: false}]

class TaskUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    due_date: Optional[str] = None
    priority: Optional[str] = None
    status: Optional[str] = None
    client_id: Optional[str] = None
    case_id: Optional[str] = None
    tags: Optional[List[str]] = None
    checklist: Optional[List[Dict[str, Any]]] = None

# Invoice Models
class InvoiceItemCreate(BaseModel):
    description: str
    quantity: float = 1
    unit_price: float
    tax_rate: float = 0

class InvoiceCreate(BaseModel):
    client_id: str
    case_id: Optional[str] = None
    items: List[InvoiceItemCreate]
    due_date: str
    notes: Optional[str] = ""
    payment_terms: Optional[str] = "Net 30"
    discount_percent: float = 0

class InvoiceUpdate(BaseModel):
    status: Optional[str] = None  # draft, sent, paid, overdue, cancelled
    payment_date: Optional[str] = None
    payment_method: Optional[str] = None
    notes: Optional[str] = None

# Expense Models
class ExpenseCreate(BaseModel):
    description: str
    amount: float
    category: str  # filing_fees, travel, printing, communication, other
    date: str
    case_id: Optional[str] = None
    client_id: Optional[str] = None
    receipt_url: Optional[str] = None
    billable: bool = True
    notes: Optional[str] = ""

class ExpenseUpdate(BaseModel):
    description: Optional[str] = None
    amount: Optional[float] = None
    category: Optional[str] = None
    date: Optional[str] = None
    case_id: Optional[str] = None
    client_id: Optional[str] = None
    receipt_url: Optional[str] = None
    billable: Optional[bool] = None
    notes: Optional[str] = None
    reimbursed: Optional[bool] = None

# Message Models
class MessageCreate(BaseModel):
    recipient_id: str  # client_id or advocate_id
    recipient_type: str  # client, advocate
    subject: str
    content: str
    case_id: Optional[str] = None
    attachments: List[str] = []  # document IDs

# Template Models
class TemplateCreate(BaseModel):
    name: str
    category: str  # contract, affidavit, power_of_attorney, letter, court_filing, other
    content: str  # HTML or markdown content with placeholders
    placeholders: List[str] = []  # List of placeholder names like {{client_name}}
    description: Optional[str] = ""
    is_public: bool = False

class TemplateUpdate(BaseModel):
    name: Optional[str] = None
    category: Optional[str] = None
    content: Optional[str] = None
    placeholders: Optional[List[str]] = None
    description: Optional[str] = None
    is_public: Optional[bool] = None


# =============== HELPER FUNCTIONS ===============

def generate_invoice_number(advocate_id: str) -> str:
    """Generate unique invoice number"""
    timestamp = datetime.now().strftime("%Y%m%d")
    random_suffix = uuid.uuid4().hex[:4].upper()
    return f"INV-{timestamp}-{random_suffix}"

def generate_case_reference(advocate_id: str) -> str:
    """Generate unique case reference"""
    timestamp = datetime.now().strftime("%Y%m")
    random_suffix = uuid.uuid4().hex[:6].upper()
    return f"CASE-{timestamp}-{random_suffix}"


# =============== ROUTE FACTORY ===============

def create_practice_routes(db, get_current_user):
    """Factory function to create routes with database dependency"""
    
    # ===================== DOCUMENT VAULT =====================
    
    @practice_router.get("/documents")
    async def get_documents(
        folder: Optional[str] = None,
        client_id: Optional[str] = None,
        case_id: Optional[str] = None,
        search: Optional[str] = None,
        user: dict = Depends(get_current_user)
    ):
        """Get all documents for the advocate"""
        query = {"advocate_id": user["id"]}
        if folder:
            query["folder"] = folder
        if client_id:
            query["client_id"] = client_id
        if case_id:
            query["case_id"] = case_id
        if search:
            query["$or"] = [
                {"name": {"$regex": search, "$options": "i"}},
                {"description": {"$regex": search, "$options": "i"}},
                {"tags": {"$in": [search]}}
            ]
        
        documents = await db.vault_documents.find(query, {"_id": 0}).sort("updated_at", -1).to_list(500)
        return {"documents": documents, "total": len(documents)}
    
    @practice_router.post("/documents")
    async def create_document(
        file: UploadFile = File(...),
        name: str = Form(...),
        description: str = Form(""),
        folder: str = Form("General"),
        tags: str = Form("[]"),
        client_id: str = Form(None),
        case_id: str = Form(None),
        user: dict = Depends(get_current_user)
    ):
        """Upload a document to the vault"""
        import json as json_module
        
        # Read file content
        content = await file.read()
        file_size = len(content)
        
        # Check file size (max 50MB)
        if file_size > 50 * 1024 * 1024:
            raise HTTPException(status_code=400, detail="File too large. Maximum size is 50MB")
        
        # Generate file hash for deduplication
        file_hash = hashlib.sha256(content).hexdigest()
        
        # Store file (base64 encoded for simplicity - in production use cloud storage)
        file_data = base64.b64encode(content).decode('utf-8')
        
        now = datetime.now(timezone.utc).isoformat()
        doc_id = str(uuid.uuid4())
        
        document = {
            "id": doc_id,
            "advocate_id": user["id"],
            "name": name,
            "original_filename": file.filename,
            "description": description,
            "folder": folder,
            "tags": json_module.loads(tags) if tags else [],
            "client_id": client_id if client_id and client_id != "null" else None,
            "case_id": case_id if case_id and case_id != "null" else None,
            "file_type": file.content_type,
            "file_size": file_size,
            "file_hash": file_hash,
            "file_data": file_data,
            "created_at": now,
            "updated_at": now
        }
        
        await db.vault_documents.insert_one(document)
        
        # Return without file_data and _id for response
        document.pop("file_data")
        document.pop("_id", None)
        return document
    
    @practice_router.get("/documents/{doc_id}")
    async def get_document(doc_id: str, user: dict = Depends(get_current_user)):
        """Get a specific document"""
        document = await db.vault_documents.find_one(
            {"id": doc_id, "advocate_id": user["id"]},
            {"_id": 0}
        )
        if not document:
            raise HTTPException(status_code=404, detail="Document not found")
        return document
    
    @practice_router.get("/documents/{doc_id}/download")
    async def download_document(doc_id: str, user: dict = Depends(get_current_user)):
        """Download a document"""
        from fastapi.responses import Response
        
        document = await db.vault_documents.find_one(
            {"id": doc_id, "advocate_id": user["id"]}
        )
        if not document:
            raise HTTPException(status_code=404, detail="Document not found")
        
        # Check if this is seed data without actual file content
        if not document.get("file_data"):
            raise HTTPException(
                status_code=422, 
                detail="This is demo document. Actual file content is not available for seed data documents. Upload a real document to test downloads."
            )
        
        file_data = base64.b64decode(document["file_data"])
        return Response(
            content=file_data,
            media_type=document["file_type"],
            headers={"Content-Disposition": f"attachment; filename={document['original_filename']}"}
        )
    
    @practice_router.put("/documents/{doc_id}")
    async def update_document(doc_id: str, data: DocumentUpdate, user: dict = Depends(get_current_user)):
        """Update document metadata"""
        update_data = {k: v for k, v in data.dict().items() if v is not None}
        update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
        
        result = await db.vault_documents.update_one(
            {"id": doc_id, "advocate_id": user["id"]},
            {"$set": update_data}
        )
        if result.modified_count == 0:
            raise HTTPException(status_code=404, detail="Document not found")
        
        return {"message": "Document updated"}
    
    @practice_router.delete("/documents/{doc_id}")
    async def delete_document(doc_id: str, user: dict = Depends(get_current_user)):
        """Delete a document"""
        result = await db.vault_documents.delete_one({"id": doc_id, "advocate_id": user["id"]})
        if result.deleted_count == 0:
            raise HTTPException(status_code=404, detail="Document not found")
        return {"message": "Document deleted"}
    
    @practice_router.get("/folders")
    async def get_folders(user: dict = Depends(get_current_user)):
        """Get all folders for the advocate"""
        folders = await db.vault_folders.find(
            {"advocate_id": user["id"]},
            {"_id": 0}
        ).sort("name", 1).to_list(100)
        
        # Add default folders if none exist
        if not folders:
            default_folders = [
                {"name": "General", "color": "#6B7280"},
                {"name": "Contracts", "color": "#3B82F6"},
                {"name": "Court Filings", "color": "#EF4444"},
                {"name": "Correspondence", "color": "#10B981"},
                {"name": "Evidence", "color": "#F59E0B"}
            ]
            for f in default_folders:
                folder = {
                    "id": str(uuid.uuid4()),
                    "advocate_id": user["id"],
                    "name": f["name"],
                    "color": f["color"],
                    "parent_folder": None,
                    "created_at": datetime.now(timezone.utc).isoformat()
                }
                await db.vault_folders.insert_one(folder)
                folders.append({k: v for k, v in folder.items() if k != "_id"})
        
        return {"folders": folders}
    
    @practice_router.post("/folders")
    async def create_folder(data: FolderCreate, user: dict = Depends(get_current_user)):
        """Create a new folder"""
        folder = {
            "id": str(uuid.uuid4()),
            "advocate_id": user["id"],
            "name": data.name,
            "color": data.color,
            "parent_folder": data.parent_folder,
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        await db.vault_folders.insert_one(folder)
        folder.pop("_id", None)
        return folder
    
    # ===================== CLIENT MANAGEMENT =====================
    
    @practice_router.get("/clients")
    async def get_clients(
        search: Optional[str] = None,
        client_type: Optional[str] = None,
        user: dict = Depends(get_current_user)
    ):
        """Get all clients for the advocate"""
        query = {"advocate_id": user["id"]}
        if client_type:
            query["client_type"] = client_type
        if search:
            query["$or"] = [
                {"name": {"$regex": search, "$options": "i"}},
                {"email": {"$regex": search, "$options": "i"}},
                {"company": {"$regex": search, "$options": "i"}}
            ]
        
        clients = await db.clients.find(query, {"_id": 0}).sort("name", 1).to_list(500)
        return {"clients": clients, "total": len(clients)}
    
    @practice_router.post("/clients")
    async def create_client(data: ClientCreate, user: dict = Depends(get_current_user)):
        """Create a new client"""
        now = datetime.now(timezone.utc).isoformat()
        client = {
            "id": str(uuid.uuid4()),
            "advocate_id": user["id"],
            **data.dict(),
            "created_at": now,
            "updated_at": now
        }
        await db.clients.insert_one(client)
        client.pop("_id", None)
        return client
    
    @practice_router.get("/clients/{client_id}")
    async def get_client(client_id: str, user: dict = Depends(get_current_user)):
        """Get a specific client with related data"""
        client = await db.clients.find_one(
            {"id": client_id, "advocate_id": user["id"]},
            {"_id": 0}
        )
        if not client:
            raise HTTPException(status_code=404, detail="Client not found")
        
        # Get related cases
        cases = await db.cases.find(
            {"client_id": client_id, "advocate_id": user["id"]},
            {"_id": 0}
        ).to_list(100)
        
        # Get related documents
        documents = await db.vault_documents.find(
            {"client_id": client_id, "advocate_id": user["id"]},
            {"_id": 0, "file_data": 0}
        ).to_list(100)
        
        # Get related invoices
        invoices = await db.invoices.find(
            {"client_id": client_id, "advocate_id": user["id"]},
            {"_id": 0}
        ).to_list(100)
        
        client["cases"] = cases
        client["documents"] = documents
        client["invoices"] = invoices
        
        return client
    
    @practice_router.put("/clients/{client_id}")
    async def update_client(client_id: str, data: ClientUpdate, user: dict = Depends(get_current_user)):
        """Update a client"""
        update_data = {k: v for k, v in data.dict().items() if v is not None}
        update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
        
        result = await db.clients.update_one(
            {"id": client_id, "advocate_id": user["id"]},
            {"$set": update_data}
        )
        if result.modified_count == 0:
            raise HTTPException(status_code=404, detail="Client not found")
        
        return {"message": "Client updated"}
    
    @practice_router.delete("/clients/{client_id}")
    async def delete_client(client_id: str, user: dict = Depends(get_current_user)):
        """Delete a client"""
        result = await db.clients.delete_one({"id": client_id, "advocate_id": user["id"]})
        if result.deleted_count == 0:
            raise HTTPException(status_code=404, detail="Client not found")
        return {"message": "Client deleted"}
    
    # ===================== CASE MANAGEMENT =====================
    
    @practice_router.get("/cases")
    async def get_cases(
        status: Optional[str] = None,
        client_id: Optional[str] = None,
        case_type: Optional[str] = None,
        priority: Optional[str] = None,
        search: Optional[str] = None,
        user: dict = Depends(get_current_user)
    ):
        """Get all cases for the advocate"""
        query = {"advocate_id": user["id"]}
        if status:
            query["status"] = status
        if client_id:
            query["client_id"] = client_id
        if case_type:
            query["case_type"] = case_type
        if priority:
            query["priority"] = priority
        if search:
            query["$or"] = [
                {"title": {"$regex": search, "$options": "i"}},
                {"case_number": {"$regex": search, "$options": "i"}},
                {"description": {"$regex": search, "$options": "i"}}
            ]
        
        cases = await db.cases.find(query, {"_id": 0}).sort("updated_at", -1).to_list(500)
        
        # Enrich with client names
        for case in cases:
            if case.get("client_id"):
                client = await db.clients.find_one({"id": case["client_id"]}, {"name": 1})
                case["client_name"] = client["name"] if client else "Unknown"
        
        return {"cases": cases, "total": len(cases)}
    
    @practice_router.post("/cases")
    async def create_case(data: CaseCreate, user: dict = Depends(get_current_user)):
        """Create a new case"""
        # Verify client exists
        client = await db.clients.find_one({"id": data.client_id, "advocate_id": user["id"]})
        if not client:
            raise HTTPException(status_code=404, detail="Client not found")
        
        now = datetime.now(timezone.utc).isoformat()
        case = {
            "id": str(uuid.uuid4()),
            "advocate_id": user["id"],
            "reference": generate_case_reference(user["id"]),
            **data.dict(),
            "total_billed": 0,
            "total_paid": 0,
            "created_at": now,
            "updated_at": now
        }
        await db.cases.insert_one(case)
        case.pop("_id", None)
        case["client_name"] = client["name"]
        return case
    
    @practice_router.get("/cases/{case_id}")
    async def get_case(case_id: str, user: dict = Depends(get_current_user)):
        """Get a specific case with all related data"""
        case = await db.cases.find_one(
            {"id": case_id, "advocate_id": user["id"]},
            {"_id": 0}
        )
        if not case:
            raise HTTPException(status_code=404, detail="Case not found")
        
        # Get client info
        client = await db.clients.find_one({"id": case["client_id"]}, {"_id": 0})
        case["client"] = client
        
        # Get related documents
        documents = await db.vault_documents.find(
            {"case_id": case_id, "advocate_id": user["id"]},
            {"_id": 0, "file_data": 0}
        ).to_list(100)
        case["documents"] = documents
        
        # Get related tasks
        tasks = await db.tasks.find(
            {"case_id": case_id, "advocate_id": user["id"]},
            {"_id": 0}
        ).to_list(100)
        case["tasks"] = tasks
        
        # Get related events
        events = await db.events.find(
            {"case_id": case_id, "advocate_id": user["id"]},
            {"_id": 0}
        ).to_list(100)
        case["events"] = events
        
        # Get related invoices
        invoices = await db.invoices.find(
            {"case_id": case_id, "advocate_id": user["id"]},
            {"_id": 0}
        ).to_list(100)
        case["invoices"] = invoices
        
        # Get related expenses
        expenses = await db.expenses.find(
            {"case_id": case_id, "advocate_id": user["id"]},
            {"_id": 0}
        ).to_list(100)
        case["expenses"] = expenses
        
        return case
    
    @practice_router.put("/cases/{case_id}")
    async def update_case(case_id: str, data: CaseUpdate, user: dict = Depends(get_current_user)):
        """Update a case"""
        update_data = {k: v for k, v in data.dict().items() if v is not None}
        update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
        
        result = await db.cases.update_one(
            {"id": case_id, "advocate_id": user["id"]},
            {"$set": update_data}
        )
        if result.modified_count == 0:
            raise HTTPException(status_code=404, detail="Case not found")
        
        return {"message": "Case updated"}
    
    @practice_router.delete("/cases/{case_id}")
    async def delete_case(case_id: str, user: dict = Depends(get_current_user)):
        """Delete a case"""
        result = await db.cases.delete_one({"id": case_id, "advocate_id": user["id"]})
        if result.deleted_count == 0:
            raise HTTPException(status_code=404, detail="Case not found")
        return {"message": "Case deleted"}
    
    @practice_router.patch("/cases/{case_id}/status")
    async def update_case_status(case_id: str, data: CaseStatusUpdate, user: dict = Depends(get_current_user)):
        """Update case status (active, pending, closed, on_hold)"""
        valid_statuses = ["active", "pending", "closed", "on_hold"]
        if data.status not in valid_statuses:
            raise HTTPException(status_code=400, detail=f"Status must be one of: {', '.join(valid_statuses)}")
        
        result = await db.cases.update_one(
            {"id": case_id, "advocate_id": user["id"]},
            {"$set": {"status": data.status, "updated_at": datetime.now(timezone.utc).isoformat()}}
        )
        if result.modified_count == 0:
            raise HTTPException(status_code=404, detail="Case not found")
        
        return {"message": f"Case status updated to {data.status}"}
    
    # ===================== CALENDAR & EVENTS =====================
    
    @practice_router.get("/events")
    async def get_events(
        start_date: Optional[str] = None,
        end_date: Optional[str] = None,
        event_type: Optional[str] = None,
        client_id: Optional[str] = None,
        case_id: Optional[str] = None,
        user: dict = Depends(get_current_user)
    ):
        """Get all events for the advocate"""
        query = {"advocate_id": user["id"]}
        
        if start_date and end_date:
            query["start_datetime"] = {"$gte": start_date, "$lte": end_date}
        elif start_date:
            query["start_datetime"] = {"$gte": start_date}
        elif end_date:
            query["start_datetime"] = {"$lte": end_date}
        
        if event_type:
            query["event_type"] = event_type
        if client_id:
            query["client_id"] = client_id
        if case_id:
            query["case_id"] = case_id
        
        events = await db.events.find(query, {"_id": 0}).sort("start_datetime", 1).to_list(500)
        return {"events": events, "total": len(events)}
    
    @practice_router.post("/events")
    async def create_event(data: EventCreate, user: dict = Depends(get_current_user)):
        """Create a new event"""
        now = datetime.now(timezone.utc).isoformat()
        event = {
            "id": str(uuid.uuid4()),
            "advocate_id": user["id"],
            **data.dict(),
            "created_at": now,
            "updated_at": now
        }
        await db.events.insert_one(event)
        event.pop("_id", None)
        return event
    
    @practice_router.get("/events/{event_id}")
    async def get_event(event_id: str, user: dict = Depends(get_current_user)):
        """Get a specific event"""
        event = await db.events.find_one(
            {"id": event_id, "advocate_id": user["id"]},
            {"_id": 0}
        )
        if not event:
            raise HTTPException(status_code=404, detail="Event not found")
        return event
    
    @practice_router.put("/events/{event_id}")
    async def update_event(event_id: str, data: EventUpdate, user: dict = Depends(get_current_user)):
        """Update an event"""
        update_data = {k: v for k, v in data.dict().items() if v is not None}
        update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
        
        result = await db.events.update_one(
            {"id": event_id, "advocate_id": user["id"]},
            {"$set": update_data}
        )
        if result.modified_count == 0:
            raise HTTPException(status_code=404, detail="Event not found")
        
        return {"message": "Event updated"}
    
    @practice_router.delete("/events/{event_id}")
    async def delete_event(event_id: str, user: dict = Depends(get_current_user)):
        """Delete an event"""
        result = await db.events.delete_one({"id": event_id, "advocate_id": user["id"]})
        if result.deleted_count == 0:
            raise HTTPException(status_code=404, detail="Event not found")
        return {"message": "Event deleted"}
    
    @practice_router.patch("/events/{event_id}/status")
    async def update_event_status(event_id: str, data: EventStatusUpdate, user: dict = Depends(get_current_user)):
        """Mark event as complete, cancelled, or scheduled"""
        valid_statuses = ["scheduled", "completed", "cancelled"]
        if data.status not in valid_statuses:
            raise HTTPException(status_code=400, detail=f"Status must be one of: {', '.join(valid_statuses)}")
        
        result = await db.events.update_one(
            {"id": event_id, "advocate_id": user["id"]},
            {"$set": {"status": data.status, "updated_at": datetime.now(timezone.utc).isoformat()}}
        )
        if result.modified_count == 0:
            raise HTTPException(status_code=404, detail="Event not found")
        
        return {"message": f"Event marked as {data.status}"}
    
    @practice_router.patch("/events/{event_id}/reminder")
    async def update_event_reminder(event_id: str, data: EventReminderUpdate, user: dict = Depends(get_current_user)):
        """Set or update event reminders"""
        result = await db.events.update_one(
            {"id": event_id, "advocate_id": user["id"]},
            {"$set": {"reminder_minutes": data.reminder_minutes, "updated_at": datetime.now(timezone.utc).isoformat()}}
        )
        if result.modified_count == 0:
            raise HTTPException(status_code=404, detail="Event not found")
        
        return {"message": "Event reminders updated", "reminder_minutes": data.reminder_minutes}
    
    @practice_router.post("/events/{event_id}/duplicate")
    async def duplicate_event(event_id: str, user: dict = Depends(get_current_user)):
        """Duplicate an existing event"""
        event = await db.events.find_one({"id": event_id, "advocate_id": user["id"]}, {"_id": 0})
        if not event:
            raise HTTPException(status_code=404, detail="Event not found")
        
        # Create a new event based on the original
        new_event = {
            **event,
            "id": str(uuid.uuid4()),
            "title": f"{event['title']} (Copy)",
            "status": "scheduled",
            "created_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat()
        }
        
        await db.events.insert_one(new_event)
        del new_event["_id"] if "_id" in new_event else None
        
        return {"message": "Event duplicated", "event": new_event}
    
    @practice_router.get("/events/upcoming/reminders")
    async def get_upcoming_reminders(user: dict = Depends(get_current_user)):
        """Get events with upcoming reminders"""
        now = datetime.now(timezone.utc)
        # Get events in the next 7 days
        end_date = (now + timedelta(days=7)).isoformat()
        
        events = await db.events.find(
            {
                "advocate_id": user["id"],
                "start_datetime": {"$gte": now.isoformat(), "$lte": end_date}
            },
            {"_id": 0}
        ).sort("start_datetime", 1).to_list(50)
        
        return {"reminders": events}
    
    # ===================== TASK MANAGEMENT =====================
    
    @practice_router.get("/tasks")
    async def get_tasks(
        status: Optional[str] = None,
        priority: Optional[str] = None,
        client_id: Optional[str] = None,
        case_id: Optional[str] = None,
        due_before: Optional[str] = None,
        user: dict = Depends(get_current_user)
    ):
        """Get all tasks for the advocate"""
        query = {"advocate_id": user["id"]}
        if status:
            query["status"] = status
        if priority:
            query["priority"] = priority
        if client_id:
            query["client_id"] = client_id
        if case_id:
            query["case_id"] = case_id
        if due_before:
            query["due_date"] = {"$lte": due_before}
        
        tasks = await db.tasks.find(query, {"_id": 0}).sort("due_date", 1).to_list(500)
        return {"tasks": tasks, "total": len(tasks)}
    
    @practice_router.post("/tasks")
    async def create_task(data: TaskCreate, user: dict = Depends(get_current_user)):
        """Create a new task"""
        now = datetime.now(timezone.utc).isoformat()
        task = {
            "id": str(uuid.uuid4()),
            "advocate_id": user["id"],
            **data.dict(),
            "created_at": now,
            "updated_at": now
        }
        await db.tasks.insert_one(task)
        task.pop("_id", None)
        return task
    
    @practice_router.get("/tasks/{task_id}")
    async def get_task(task_id: str, user: dict = Depends(get_current_user)):
        """Get a specific task"""
        task = await db.tasks.find_one(
            {"id": task_id, "advocate_id": user["id"]},
            {"_id": 0}
        )
        if not task:
            raise HTTPException(status_code=404, detail="Task not found")
        return task
    
    @practice_router.put("/tasks/{task_id}")
    async def update_task(task_id: str, data: TaskUpdate, user: dict = Depends(get_current_user)):
        """Update a task"""
        update_data = {k: v for k, v in data.dict().items() if v is not None}
        update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
        
        result = await db.tasks.update_one(
            {"id": task_id, "advocate_id": user["id"]},
            {"$set": update_data}
        )
        if result.modified_count == 0:
            raise HTTPException(status_code=404, detail="Task not found")
        
        return {"message": "Task updated"}
    
    @practice_router.delete("/tasks/{task_id}")
    async def delete_task(task_id: str, user: dict = Depends(get_current_user)):
        """Delete a task"""
        result = await db.tasks.delete_one({"id": task_id, "advocate_id": user["id"]})
        if result.deleted_count == 0:
            raise HTTPException(status_code=404, detail="Task not found")
        return {"message": "Task deleted"}
    
    # ===================== INVOICING =====================
    
    @practice_router.get("/invoices")
    async def get_invoices(
        status: Optional[str] = None,
        client_id: Optional[str] = None,
        case_id: Optional[str] = None,
        user: dict = Depends(get_current_user)
    ):
        """Get all invoices for the advocate"""
        query = {"advocate_id": user["id"]}
        if status:
            query["status"] = status
        if client_id:
            query["client_id"] = client_id
        if case_id:
            query["case_id"] = case_id
        
        invoices = await db.invoices.find(query, {"_id": 0}).sort("created_at", -1).to_list(500)
        
        # Enrich with client names
        for invoice in invoices:
            client = await db.clients.find_one({"id": invoice["client_id"]}, {"name": 1})
            invoice["client_name"] = client["name"] if client else "Unknown"
        
        return {"invoices": invoices, "total": len(invoices)}
    
    @practice_router.post("/invoices")
    async def create_invoice(data: InvoiceCreate, user: dict = Depends(get_current_user)):
        """Create a new invoice"""
        # Verify client exists
        client = await db.clients.find_one({"id": data.client_id, "advocate_id": user["id"]})
        if not client:
            raise HTTPException(status_code=404, detail="Client not found")
        
        # Calculate totals
        subtotal = sum(item.quantity * item.unit_price for item in data.items)
        tax_total = sum(item.quantity * item.unit_price * (item.tax_rate / 100) for item in data.items)
        discount_amount = subtotal * (data.discount_percent / 100)
        total = subtotal + tax_total - discount_amount
        
        now = datetime.now(timezone.utc).isoformat()
        invoice = {
            "id": str(uuid.uuid4()),
            "advocate_id": user["id"],
            "invoice_number": generate_invoice_number(user["id"]),
            "client_id": data.client_id,
            "case_id": data.case_id,
            "items": [item.dict() for item in data.items],
            "subtotal": subtotal,
            "tax_total": tax_total,
            "discount_percent": data.discount_percent,
            "discount_amount": discount_amount,
            "total": total,
            "currency": "TZS",
            "due_date": data.due_date,
            "notes": data.notes,
            "payment_terms": data.payment_terms,
            "status": "draft",
            "created_at": now,
            "updated_at": now
        }
        await db.invoices.insert_one(invoice)
        invoice.pop("_id", None)
        invoice["client_name"] = client["name"]
        return invoice
    
    @practice_router.get("/invoices/{invoice_id}")
    async def get_invoice(invoice_id: str, user: dict = Depends(get_current_user)):
        """Get a specific invoice"""
        invoice = await db.invoices.find_one(
            {"id": invoice_id, "advocate_id": user["id"]},
            {"_id": 0}
        )
        if not invoice:
            raise HTTPException(status_code=404, detail="Invoice not found")
        
        # Get client info
        client = await db.clients.find_one({"id": invoice["client_id"]}, {"_id": 0})
        invoice["client"] = client
        
        # Get case info if linked
        if invoice.get("case_id"):
            case = await db.cases.find_one({"id": invoice["case_id"]}, {"_id": 0, "title": 1, "reference": 1})
            invoice["case"] = case
        
        return invoice
    
    @practice_router.put("/invoices/{invoice_id}")
    async def update_invoice(invoice_id: str, data: InvoiceUpdate, user: dict = Depends(get_current_user)):
        """Update an invoice"""
        update_data = {k: v for k, v in data.dict().items() if v is not None}
        update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
        
        result = await db.invoices.update_one(
            {"id": invoice_id, "advocate_id": user["id"]},
            {"$set": update_data}
        )
        if result.modified_count == 0:
            raise HTTPException(status_code=404, detail="Invoice not found")
        
        return {"message": "Invoice updated"}
    
    @practice_router.post("/invoices/{invoice_id}/send")
    async def send_invoice(invoice_id: str, user: dict = Depends(get_current_user)):
        """Mark invoice as sent"""
        result = await db.invoices.update_one(
            {"id": invoice_id, "advocate_id": user["id"]},
            {"$set": {"status": "sent", "sent_at": datetime.now(timezone.utc).isoformat()}}
        )
        if result.modified_count == 0:
            raise HTTPException(status_code=404, detail="Invoice not found")
        return {"message": "Invoice marked as sent"}
    
    @practice_router.post("/invoices/{invoice_id}/pay")
    async def mark_invoice_paid(
        invoice_id: str,
        payment_method: str = "bank_transfer",
        user: dict = Depends(get_current_user)
    ):
        """Mark invoice as paid"""
        now = datetime.now(timezone.utc).isoformat()
        result = await db.invoices.update_one(
            {"id": invoice_id, "advocate_id": user["id"]},
            {"$set": {
                "status": "paid",
                "payment_date": now,
                "payment_method": payment_method,
                "updated_at": now
            }}
        )
        if result.modified_count == 0:
            raise HTTPException(status_code=404, detail="Invoice not found")
        return {"message": "Invoice marked as paid"}
    
    @practice_router.delete("/invoices/{invoice_id}")
    async def delete_invoice(invoice_id: str, user: dict = Depends(get_current_user)):
        """Delete an invoice"""
        result = await db.invoices.delete_one({"id": invoice_id, "advocate_id": user["id"]})
        if result.deleted_count == 0:
            raise HTTPException(status_code=404, detail="Invoice not found")
        return {"message": "Invoice deleted"}
    
    # ===================== EXPENSES =====================
    
    @practice_router.get("/expenses")
    async def get_expenses(
        category: Optional[str] = None,
        client_id: Optional[str] = None,
        case_id: Optional[str] = None,
        billable: Optional[bool] = None,
        start_date: Optional[str] = None,
        end_date: Optional[str] = None,
        user: dict = Depends(get_current_user)
    ):
        """Get all expenses for the advocate"""
        query = {"advocate_id": user["id"]}
        if category:
            query["category"] = category
        if client_id:
            query["client_id"] = client_id
        if case_id:
            query["case_id"] = case_id
        if billable is not None:
            query["billable"] = billable
        if start_date and end_date:
            query["date"] = {"$gte": start_date, "$lte": end_date}
        
        expenses = await db.expenses.find(query, {"_id": 0}).sort("date", -1).to_list(500)
        
        # Calculate totals
        total_amount = sum(e["amount"] for e in expenses)
        billable_amount = sum(e["amount"] for e in expenses if e.get("billable", True))
        
        return {
            "expenses": expenses,
            "total": len(expenses),
            "total_amount": total_amount,
            "billable_amount": billable_amount
        }
    
    @practice_router.post("/expenses")
    async def create_expense(data: ExpenseCreate, user: dict = Depends(get_current_user)):
        """Create a new expense"""
        now = datetime.now(timezone.utc).isoformat()
        expense = {
            "id": str(uuid.uuid4()),
            "advocate_id": user["id"],
            **data.dict(),
            "reimbursed": False,
            "created_at": now,
            "updated_at": now
        }
        await db.expenses.insert_one(expense)
        expense.pop("_id", None)
        return expense
    
    @practice_router.put("/expenses/{expense_id}")
    async def update_expense(expense_id: str, data: ExpenseUpdate, user: dict = Depends(get_current_user)):
        """Update an expense"""
        update_data = {k: v for k, v in data.dict().items() if v is not None}
        update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
        
        result = await db.expenses.update_one(
            {"id": expense_id, "advocate_id": user["id"]},
            {"$set": update_data}
        )
        if result.modified_count == 0:
            raise HTTPException(status_code=404, detail="Expense not found")
        
        return {"message": "Expense updated"}
    
    @practice_router.delete("/expenses/{expense_id}")
    async def delete_expense(expense_id: str, user: dict = Depends(get_current_user)):
        """Delete an expense"""
        result = await db.expenses.delete_one({"id": expense_id, "advocate_id": user["id"]})
        if result.deleted_count == 0:
            raise HTTPException(status_code=404, detail="Expense not found")
        return {"message": "Expense deleted"}
    
    # ===================== TEMPLATES =====================
    
    @practice_router.get("/templates")
    async def get_templates(
        category: Optional[str] = None,
        user: dict = Depends(get_current_user)
    ):
        """Get all templates (user's own + public)"""
        query = {
            "$or": [
                {"advocate_id": user["id"]},
                {"is_public": True}
            ]
        }
        if category:
            query["category"] = category
        
        templates = await db.templates.find(query, {"_id": 0, "content": 0}).sort("name", 1).to_list(100)
        return {"templates": templates}
    
    @practice_router.post("/templates")
    async def create_template(data: TemplateCreate, user: dict = Depends(get_current_user)):
        """Create a new template"""
        now = datetime.now(timezone.utc).isoformat()
        template = {
            "id": str(uuid.uuid4()),
            "advocate_id": user["id"],
            **data.dict(),
            "created_at": now,
            "updated_at": now
        }
        await db.templates.insert_one(template)
        template.pop("_id", None)
        return template
    
    @practice_router.get("/templates/{template_id}")
    async def get_template(template_id: str, user: dict = Depends(get_current_user)):
        """Get a specific template"""
        template = await db.templates.find_one(
            {
                "id": template_id,
                "$or": [{"advocate_id": user["id"]}, {"is_public": True}]
            },
            {"_id": 0}
        )
        if not template:
            raise HTTPException(status_code=404, detail="Template not found")
        return template
    
    @practice_router.put("/templates/{template_id}")
    async def update_template(template_id: str, data: TemplateUpdate, user: dict = Depends(get_current_user)):
        """Update a template (only own templates)"""
        update_data = {k: v for k, v in data.dict().items() if v is not None}
        update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
        
        result = await db.templates.update_one(
            {"id": template_id, "advocate_id": user["id"]},
            {"$set": update_data}
        )
        if result.modified_count == 0:
            raise HTTPException(status_code=404, detail="Template not found or not owned by you")
        
        return {"message": "Template updated"}
    
    @practice_router.delete("/templates/{template_id}")
    async def delete_template(template_id: str, user: dict = Depends(get_current_user)):
        """Delete a template (only own templates)"""
        result = await db.templates.delete_one({"id": template_id, "advocate_id": user["id"]})
        if result.deleted_count == 0:
            raise HTTPException(status_code=404, detail="Template not found or not owned by you")
        return {"message": "Template deleted"}
    
    # ===================== MESSAGES =====================
    
    @practice_router.get("/messages")
    async def get_messages(
        folder: str = "inbox",  # inbox, sent, archived
        user: dict = Depends(get_current_user)
    ):
        """Get messages for the advocate"""
        if folder == "inbox":
            query = {"recipient_id": user["id"], "archived": {"$ne": True}}
        elif folder == "sent":
            query = {"sender_id": user["id"]}
        else:  # archived
            query = {"recipient_id": user["id"], "archived": True}
        
        messages = await db.messages.find(query, {"_id": 0}).sort("created_at", -1).to_list(100)
        return {"messages": messages, "total": len(messages)}
    
    @practice_router.post("/messages")
    async def send_message(data: MessageCreate, user: dict = Depends(get_current_user)):
        """Send a message"""
        now = datetime.now(timezone.utc).isoformat()
        message = {
            "id": str(uuid.uuid4()),
            "sender_id": user["id"],
            "sender_name": user.get("full_name", "Unknown"),
            "sender_type": "advocate",
            "recipient_id": data.recipient_id,
            "recipient_type": data.recipient_type,
            "subject": data.subject,
            "content": data.content,
            "case_id": data.case_id,
            "attachments": data.attachments,
            "read": False,
            "archived": False,
            "created_at": now
        }
        await db.messages.insert_one(message)
        message.pop("_id", None)
        return message
    
    @practice_router.put("/messages/{message_id}/read")
    async def mark_message_read(message_id: str, user: dict = Depends(get_current_user)):
        """Mark a message as read"""
        await db.messages.update_one(
            {"id": message_id, "recipient_id": user["id"]},
            {"$set": {"read": True}}
        )
        return {"message": "Message marked as read"}
    
    @practice_router.put("/messages/{message_id}/archive")
    async def archive_message(message_id: str, user: dict = Depends(get_current_user)):
        """Archive a message"""
        await db.messages.update_one(
            {"id": message_id, "recipient_id": user["id"]},
            {"$set": {"archived": True}}
        )
        return {"message": "Message archived"}
    
    # ===================== ANALYTICS & DASHBOARD =====================
    
    @practice_router.get("/analytics/dashboard")
    async def get_dashboard_analytics(user: dict = Depends(get_current_user)):
        """Get dashboard analytics for the advocate"""
        now = datetime.now(timezone.utc)
        month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        
        # Count active cases
        active_cases = await db.cases.count_documents({
            "advocate_id": user["id"],
            "status": "active"
        })
        
        # Count total clients
        total_clients = await db.clients.count_documents({"advocate_id": user["id"]})
        
        # Count pending tasks
        pending_tasks = await db.tasks.count_documents({
            "advocate_id": user["id"],
            "status": {"$in": ["pending", "in_progress"]}
        })
        
        # Count overdue tasks
        overdue_tasks = await db.tasks.count_documents({
            "advocate_id": user["id"],
            "status": {"$in": ["pending", "in_progress"]},
            "due_date": {"$lt": now.isoformat()}
        })
        
        # Count upcoming events (next 7 days)
        week_end = (now + timedelta(days=7)).isoformat()
        upcoming_events = await db.events.count_documents({
            "advocate_id": user["id"],
            "start_datetime": {"$gte": now.isoformat(), "$lte": week_end}
        })
        
        # Invoice totals
        invoice_pipeline = [
            {"$match": {"advocate_id": user["id"]}},
            {"$group": {
                "_id": "$status",
                "total": {"$sum": "$total"},
                "count": {"$sum": 1}
            }}
        ]
        invoice_stats = await db.invoices.aggregate(invoice_pipeline).to_list(10)
        invoice_by_status = {stat["_id"]: {"total": stat["total"], "count": stat["count"]} for stat in invoice_stats}
        
        # Monthly revenue
        monthly_invoices = await db.invoices.find({
            "advocate_id": user["id"],
            "status": "paid",
            "payment_date": {"$gte": month_start.isoformat()}
        }, {"total": 1}).to_list(1000)
        monthly_revenue = sum(inv["total"] for inv in monthly_invoices)
        
        # Documents count
        total_documents = await db.vault_documents.count_documents({"advocate_id": user["id"]})
        
        # Stamps issued this month
        stamps_this_month = await db.document_stamps.count_documents({
            "advocate_id": user["id"],
            "created_at": {"$gte": month_start.isoformat()}
        })
        
        return {
            "summary": {
                "active_cases": active_cases,
                "total_clients": total_clients,
                "pending_tasks": pending_tasks,
                "overdue_tasks": overdue_tasks,
                "upcoming_events": upcoming_events,
                "total_documents": total_documents,
                "stamps_this_month": stamps_this_month
            },
            "financials": {
                "monthly_revenue": monthly_revenue,
                "pending_invoices": invoice_by_status.get("sent", {}).get("total", 0),
                "pending_count": invoice_by_status.get("sent", {}).get("count", 0),
                "paid_total": invoice_by_status.get("paid", {}).get("total", 0),
                "currency": "TZS"
            }
        }
    
    @practice_router.get("/analytics/cases")
    async def get_case_analytics(user: dict = Depends(get_current_user)):
        """Get case analytics"""
        # Cases by status
        status_pipeline = [
            {"$match": {"advocate_id": user["id"]}},
            {"$group": {"_id": "$status", "count": {"$sum": 1}}}
        ]
        by_status = await db.cases.aggregate(status_pipeline).to_list(10)
        
        # Cases by type
        type_pipeline = [
            {"$match": {"advocate_id": user["id"]}},
            {"$group": {"_id": "$case_type", "count": {"$sum": 1}}}
        ]
        by_type = await db.cases.aggregate(type_pipeline).to_list(10)
        
        return {
            "by_status": {stat["_id"]: stat["count"] for stat in by_status},
            "by_type": {stat["_id"]: stat["count"] for stat in by_type}
        }
    
    @practice_router.get("/analytics/revenue")
    async def get_revenue_analytics(
        period: str = "monthly",  # monthly, quarterly, yearly
        user: dict = Depends(get_current_user)
    ):
        """Get revenue analytics"""
        now = datetime.now(timezone.utc)
        
        if period == "monthly":
            # Last 12 months
            start_date = (now - timedelta(days=365)).isoformat()
            group_format = "%Y-%m"
        elif period == "quarterly":
            start_date = (now - timedelta(days=730)).isoformat()
            group_format = "%Y-Q"
        else:
            start_date = (now - timedelta(days=1825)).isoformat()
            group_format = "%Y"
        
        # Get paid invoices
        invoices = await db.invoices.find({
            "advocate_id": user["id"],
            "status": "paid",
            "payment_date": {"$gte": start_date}
        }, {"total": 1, "payment_date": 1, "_id": 0}).to_list(1000)
        
        # Group by period
        revenue_by_period = {}
        for inv in invoices:
            if inv.get("payment_date"):
                date = datetime.fromisoformat(inv["payment_date"].replace("Z", "+00:00"))
                if period == "monthly":
                    key = date.strftime("%Y-%m")
                elif period == "quarterly":
                    quarter = (date.month - 1) // 3 + 1
                    key = f"{date.year}-Q{quarter}"
                else:
                    key = str(date.year)
                revenue_by_period[key] = revenue_by_period.get(key, 0) + inv["total"]
        
        return {"revenue_by_period": revenue_by_period, "currency": "TZS"}
    
    return practice_router
