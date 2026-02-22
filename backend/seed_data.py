"""
Seed Data Module for TLS Practice Management
Populates database with realistic sample data for demonstration
"""

from fastapi import APIRouter, HTTPException, Depends
from datetime import datetime, timezone, timedelta
import uuid
import secrets
import random

seed_router = APIRouter(prefix="/api/dev", tags=["Development"])

# Sample data pools
TANZANIAN_FIRST_NAMES = ["John", "Mary", "Joseph", "Grace", "Emmanuel", "Fatuma", "Hassan", "Amina", "Peter", "Sarah", 
                          "Michael", "Happiness", "David", "Neema", "James", "Zainab", "William", "Rehema", "Robert", "Agnes"]
TANZANIAN_LAST_NAMES = ["Mwangi", "Kimani", "Ochieng", "Mbeki", "Nyerere", "Masai", "Kilimanjaro", "Serengeti", 
                         "Moshi", "Arusha", "Dodoma", "Mbeya", "Tanga", "Mwanza", "Bukoba", "Kigoma", "Morogoro", "Iringa"]
COMPANY_NAMES = ["Tanzania Holdings Ltd", "East African Trading Co", "Kilimanjaro Investments", "Safari Tours Ltd",
                 "Dar es Salaam Properties", "Serengeti Mining Corp", "Lake Victoria Exports", "Zanzibar Spices Ltd",
                 "Pemba Fishing Co", "Bagamoyo Construction", "Mikumi Agro Industries", "Ruaha Energy Ltd"]
COURT_NAMES = ["High Court of Tanzania - Commercial Division", "High Court of Tanzania - Land Division", 
               "Resident Magistrates Court - Kinondoni", "District Court - Ilala", "Court of Appeal of Tanzania",
               "Employment and Labour Court", "Tax Revenue Appeals Tribunal"]
JUDGES = ["Hon. Justice F.K. Mutungi", "Hon. Justice P.M. Kente", "Hon. Justice S.A. Wambura", "Hon. Justice J.K. Masanja",
          "Hon. Justice B.R. Luanda", "Hon. Judge M.K. Mgonya", "Hon. Judge A.S. Mwaipopo"]

CASE_TYPES = ["litigation", "corporate", "family", "property", "criminal", "employment", "tax"]
CASE_STATUSES = ["active", "pending", "closed", "on_hold"]
PRIORITIES = ["low", "medium", "high", "urgent"]

TASK_TITLES = [
    "Review contract draft", "File court documents", "Prepare witness statements", "Schedule client meeting",
    "Research case law", "Draft legal opinion", "Prepare closing arguments", "Review evidence bundle",
    "Update case file", "Prepare settlement proposal", "File motion for discovery", "Review opposing counsel response",
    "Prepare cross-examination questions", "Draft appeal brief", "Review lease agreement", "Conduct due diligence",
    "Prepare incorporation documents", "File annual returns", "Review employment contracts", "Draft non-disclosure agreement"
]

EVENT_TYPES = ["court_hearing", "meeting", "deadline", "reminder", "appointment"]
LOCATIONS = ["High Court Building, Dar es Salaam", "Law Chambers, Ocean Road", "Client Office, Masaki", 
             "Online - Zoom Meeting", "Conference Room A", "Mediation Center, Kinondoni"]

DOCUMENT_FOLDERS = ["Contracts", "Court Filings", "Correspondence", "Evidence", "Legal Opinions", "Corporate"]
DOCUMENT_DESCRIPTIONS = [
    "Signed agreement between parties", "Court submission for hearing", "Letter to opposing counsel",
    "Evidence exhibit for case", "Legal opinion on matter", "Corporate resolution document"
]


def generate_tanzanian_phone():
    """Generate realistic Tanzanian phone number"""
    prefixes = ["0741", "0742", "0743", "0744", "0745", "0754", "0755", "0756", "0765", "0766", "0767", "0784", "0785", "0786"]
    return f"{random.choice(prefixes)}{random.randint(100000, 999999)}"


def generate_tanzanian_email(first_name, last_name):
    """Generate realistic email from name"""
    domains = ["gmail.com", "yahoo.com", "hotmail.com", "outlook.com", "mail.co.tz"]
    return f"{first_name.lower()}.{last_name.lower()}@{random.choice(domains)}"


def generate_address():
    """Generate realistic Tanzanian address"""
    areas = ["Masaki", "Oyster Bay", "Msasani", "Kinondoni", "Kariakoo", "Ilala", "Temeke", "Mbezi Beach", "Mikocheni", "Sinza"]
    streets = ["Ali Hassan Mwinyi Road", "Ocean Road", "Samora Avenue", "Morogoro Road", "Bagamoyo Road", "Kawawa Road"]
    return f"{random.randint(1, 999)} {random.choice(streets)}, {random.choice(areas)}, Dar es Salaam"


def create_seed_routes(db, get_current_user):
    """Factory function to create seed routes with database dependency"""
    
    @seed_router.post("/seed")
    async def seed_database(user: dict = Depends(get_current_user)):
        """Populate database with comprehensive sample data for the logged-in advocate"""
        advocate_id = user["id"]
        advocate_name = user.get("full_name", "Test Advocate")
        now = datetime.now(timezone.utc)
        
        created_data = {
            "clients": [],
            "cases": [],
            "tasks": [],
            "events": [],
            "invoices": [],
            "documents": []
        }
        
        # Create 15 clients with varied types
        clients_to_create = []
        for i in range(15):
            first_name = random.choice(TANZANIAN_FIRST_NAMES)
            last_name = random.choice(TANZANIAN_LAST_NAMES)
            
            if i < 5:  # Individual clients
                client_type = "individual"
                name = f"{first_name} {last_name}"
                company = None
            elif i < 12:  # Corporate clients
                client_type = "corporate"
                company = random.choice(COMPANY_NAMES)
                name = company
            else:  # Government clients
                client_type = "government"
                name = random.choice(["Ministry of Trade", "Tanzania Revenue Authority", "Ministry of Lands", "EWURA"])
                company = name
            
            client = {
                "id": str(uuid.uuid4()),
                "advocate_id": advocate_id,
                "name": name,
                "email": generate_tanzanian_email(first_name, last_name) if client_type == "individual" else f"info@{name.lower().replace(' ', '')[:10]}.co.tz",
                "phone": generate_tanzanian_phone(),
                "address": generate_address(),
                "company": company,
                "client_type": client_type,
                "notes": f"Referred by {'colleague' if random.random() > 0.5 else 'previous client'}. Regular client since {2020 + random.randint(0, 5)}.",
                "tags": random.sample(["VIP", "Long-term", "New", "Referred", "Corporate", "Government"], k=random.randint(1, 3)),
                "created_at": (now - timedelta(days=random.randint(30, 365))).isoformat(),
                "updated_at": now.isoformat()
            }
            clients_to_create.append(client)
        
        if clients_to_create:
            await db.clients.insert_many(clients_to_create)
            created_data["clients"] = [c["id"] for c in clients_to_create]
        
        # Create 12 cases linked to clients
        cases_to_create = []
        case_titles = [
            "Land Dispute - Masaki Plot 45/B", "Employment Termination Claim", "Contract Breach - Supply Agreement",
            "Criminal Defense - Fraud Charges", "Corporate Merger Advisory", "Family Estate Distribution",
            "Tax Assessment Appeal", "Intellectual Property Infringement", "Construction Contract Dispute",
            "Maritime Cargo Claim", "Banking Fraud Investigation", "Real Estate Transaction"
        ]
        
        for i, title in enumerate(case_titles):
            client = random.choice(clients_to_create)
            case_type = random.choice(CASE_TYPES)
            status = random.choices(CASE_STATUSES, weights=[50, 25, 20, 5])[0]  # More active cases
            
            start_date = now - timedelta(days=random.randint(7, 180))
            expected_end = start_date + timedelta(days=random.randint(60, 365))
            
            case = {
                "id": str(uuid.uuid4()),
                "advocate_id": advocate_id,
                "reference": f"CASE-{start_date.strftime('%Y%m')}-{secrets.token_hex(3).upper()}",
                "title": title,
                "case_number": f"HC/{random.randint(100, 999)}/{start_date.year}" if random.random() > 0.3 else None,
                "client_id": client["id"],
                "case_type": case_type,
                "court": random.choice(COURT_NAMES) if case_type in ["litigation", "criminal", "employment", "tax"] else None,
                "judge": random.choice(JUDGES) if random.random() > 0.4 else None,
                "opposing_party": f"{random.choice(TANZANIAN_FIRST_NAMES)} {random.choice(TANZANIAN_LAST_NAMES)}" if case_type != "corporate" else None,
                "opposing_counsel": f"Adv. {random.choice(TANZANIAN_FIRST_NAMES)} {random.choice(TANZANIAN_LAST_NAMES)}" if random.random() > 0.5 else None,
                "description": f"Legal matter concerning {case_type} issues. Client seeks representation for {title.lower()}.",
                "status": status,
                "priority": random.choice(PRIORITIES),
                "start_date": start_date.isoformat(),
                "expected_end_date": expected_end.isoformat() if status == "active" else None,
                "billing_type": random.choice(["hourly", "fixed", "contingency", "pro_bono"]),
                "hourly_rate": random.choice([150000, 200000, 250000, 300000]) if random.random() > 0.3 else None,
                "fixed_fee": random.choice([500000, 1000000, 2000000, 5000000]) if random.random() > 0.5 else None,
                "total_billed": random.randint(0, 5000000),
                "total_paid": random.randint(0, 3000000),
                "created_at": start_date.isoformat(),
                "updated_at": now.isoformat()
            }
            cases_to_create.append(case)
        
        if cases_to_create:
            await db.cases.insert_many(cases_to_create)
            created_data["cases"] = [c["id"] for c in cases_to_create]
        
        # Create 20 tasks linked to cases
        tasks_to_create = []
        for i in range(20):
            case = random.choice(cases_to_create) if cases_to_create else None
            client = random.choice(clients_to_create)
            due_date = now + timedelta(days=random.randint(-7, 30))  # Some overdue
            
            status = "completed" if due_date < now and random.random() > 0.4 else random.choice(["pending", "in_progress"])
            if due_date < now and status != "completed":
                status = "pending"  # Overdue tasks
            
            task = {
                "id": str(uuid.uuid4()),
                "advocate_id": advocate_id,
                "title": random.choice(TASK_TITLES),
                "description": f"Task related to {case['title'] if case else 'general practice'}",
                "due_date": due_date.isoformat(),
                "priority": random.choice(PRIORITIES),
                "status": status,
                "client_id": client["id"],
                "case_id": case["id"] if case else None,
                "tags": random.sample(["Urgent", "Important", "Follow-up", "Research", "Filing", "Review"], k=random.randint(1, 2)),
                "checklist": [
                    {"text": "Initial review", "completed": status == "completed" or random.random() > 0.5},
                    {"text": "Draft document", "completed": status == "completed" or random.random() > 0.7},
                    {"text": "Final review", "completed": status == "completed"}
                ] if random.random() > 0.5 else [],
                "created_at": (now - timedelta(days=random.randint(1, 30))).isoformat(),
                "updated_at": now.isoformat()
            }
            tasks_to_create.append(task)
        
        if tasks_to_create:
            await db.tasks.insert_many(tasks_to_create)
            created_data["tasks"] = [t["id"] for t in tasks_to_create]
        
        # Create 15 events (calendar items)
        events_to_create = []
        event_titles = [
            "Court Hearing - Case Review", "Client Consultation Meeting", "Filing Deadline",
            "Mediation Session", "Expert Witness Meeting", "Case Strategy Review",
            "Contract Signing", "Deposition Session", "Settlement Conference",
            "Annual License Renewal", "Bar Association Meeting", "Client Update Call",
            "Document Review Session", "Site Visit - Property Inspection", "Trial Preparation"
        ]
        
        for i, title in enumerate(event_titles):
            case = random.choice(cases_to_create) if cases_to_create and random.random() > 0.3 else None
            client = random.choice(clients_to_create) if random.random() > 0.3 else None
            event_type = random.choice(EVENT_TYPES)
            
            # Mix of past, today, and future events
            if i < 3:
                start_datetime = now - timedelta(days=random.randint(1, 14))  # Past events
            elif i < 5:
                start_datetime = now + timedelta(hours=random.randint(1, 8))  # Today
            else:
                start_datetime = now + timedelta(days=random.randint(1, 30))  # Future events
            
            end_datetime = start_datetime + timedelta(hours=random.randint(1, 3))
            
            event = {
                "id": str(uuid.uuid4()),
                "advocate_id": advocate_id,
                "title": title,
                "event_type": event_type,
                "start_datetime": start_datetime.isoformat(),
                "end_datetime": end_datetime.isoformat(),
                "all_day": random.random() > 0.9,
                "location": random.choice(LOCATIONS) if event_type in ["court_hearing", "meeting", "appointment"] else None,
                "description": f"{title} - Please prepare relevant documents.",
                "client_id": client["id"] if client else None,
                "case_id": case["id"] if case else None,
                "reminder_minutes": [30, 1440],  # 30 mins and 1 day before
                "recurring": None,
                "color": random.choice(["#3B82F6", "#10B981", "#F59E0B", "#EF4444", "#8B5CF6"]),
                "created_at": (now - timedelta(days=random.randint(1, 14))).isoformat(),
                "updated_at": now.isoformat()
            }
            events_to_create.append(event)
        
        if events_to_create:
            await db.events.insert_many(events_to_create)
            created_data["events"] = [e["id"] for e in events_to_create]
        
        # Create 10 invoices
        invoices_to_create = []
        invoice_items_pool = [
            {"description": "Legal consultation (2 hours)", "quantity": 2, "unit_price": 150000, "tax_rate": 18},
            {"description": "Court appearance", "quantity": 1, "unit_price": 500000, "tax_rate": 18},
            {"description": "Document drafting", "quantity": 1, "unit_price": 300000, "tax_rate": 18},
            {"description": "Legal research", "quantity": 3, "unit_price": 100000, "tax_rate": 18},
            {"description": "Filing fees (reimbursement)", "quantity": 1, "unit_price": 50000, "tax_rate": 0},
            {"description": "Witness preparation", "quantity": 2, "unit_price": 200000, "tax_rate": 18},
            {"description": "Contract review", "quantity": 1, "unit_price": 400000, "tax_rate": 18},
            {"description": "Mediation session", "quantity": 1, "unit_price": 750000, "tax_rate": 18},
        ]
        
        for i in range(10):
            client = random.choice(clients_to_create)
            # Try to find cases for this client, otherwise pick any case
            client_cases = [c for c in cases_to_create if c["client_id"] == client["id"]]
            if client_cases and random.random() > 0.3:
                case = random.choice(client_cases)
            elif cases_to_create:
                case = random.choice(cases_to_create)
            else:
                case = None
            
            items = random.sample(invoice_items_pool, k=random.randint(1, 4))
            subtotal = sum(item["quantity"] * item["unit_price"] for item in items)
            tax_total = sum(item["quantity"] * item["unit_price"] * (item["tax_rate"] / 100) for item in items)
            discount_percent = random.choice([0, 0, 0, 5, 10])
            discount_amount = subtotal * (discount_percent / 100)
            total = subtotal + tax_total - discount_amount
            
            created_date = now - timedelta(days=random.randint(1, 60))
            due_date = created_date + timedelta(days=30)
            
            # Determine status based on dates
            if i < 3:
                status = "paid"
                payment_date = (due_date - timedelta(days=random.randint(0, 15))).isoformat()
            elif i < 5:
                status = "sent"
                payment_date = None
            elif i < 7:
                status = "overdue" if due_date < now else "sent"
                payment_date = None
            else:
                status = "draft"
                payment_date = None
            
            invoice = {
                "id": str(uuid.uuid4()),
                "advocate_id": advocate_id,
                "invoice_number": f"INV-{created_date.strftime('%Y%m%d')}-{secrets.token_hex(2).upper()}",
                "client_id": client["id"],
                "case_id": case["id"] if case else None,
                "items": items,
                "subtotal": subtotal,
                "tax_total": tax_total,
                "discount_percent": discount_percent,
                "discount_amount": discount_amount,
                "total": total,
                "currency": "TZS",
                "due_date": due_date.isoformat(),
                "notes": "Payment due within 30 days. Bank transfer preferred.",
                "payment_terms": "Net 30",
                "status": status,
                "payment_date": payment_date,
                "payment_method": "bank_transfer" if status == "paid" else None,
                "created_at": created_date.isoformat(),
                "updated_at": now.isoformat()
            }
            invoices_to_create.append(invoice)
        
        if invoices_to_create:
            await db.invoices.insert_many(invoices_to_create)
            created_data["invoices"] = [inv["id"] for inv in invoices_to_create]
        
        # Create sample document metadata (without actual file data for demo)
        documents_to_create = []
        document_names = [
            "Contract Agreement - Land Sale.pdf", "Court Summons.pdf", "Legal Opinion - Tax Matter.pdf",
            "Witness Statement - J. Mwangi.pdf", "Power of Attorney.pdf", "Settlement Agreement.pdf",
            "Employment Contract.pdf", "Board Resolution.pdf", "Lease Agreement.pdf", "Evidence Bundle.pdf",
            "Appeal Brief.pdf", "Demand Letter.pdf"
        ]
        
        for i, name in enumerate(document_names):
            case = random.choice(cases_to_create) if cases_to_create and random.random() > 0.3 else None
            client = random.choice(clients_to_create) if random.random() > 0.3 else None
            
            doc = {
                "id": str(uuid.uuid4()),
                "advocate_id": advocate_id,
                "name": name,
                "original_filename": name,
                "description": random.choice(DOCUMENT_DESCRIPTIONS),
                "folder": random.choice(DOCUMENT_FOLDERS),
                "tags": random.sample(["Important", "Client Copy", "Original", "Draft", "Final", "Signed"], k=random.randint(1, 2)),
                "client_id": client["id"] if client else None,
                "case_id": case["id"] if case else None,
                "file_type": "application/pdf",
                "file_size": random.randint(50000, 2000000),  # 50KB to 2MB
                "file_hash": secrets.token_hex(32),
                "file_data": None,  # No actual file data for demo
                "is_seed_data": True,  # Mark as seed data
                "created_at": (now - timedelta(days=random.randint(1, 90))).isoformat(),
                "updated_at": now.isoformat()
            }
            documents_to_create.append(doc)
        
        if documents_to_create:
            await db.vault_documents.insert_many(documents_to_create)
            created_data["documents"] = [d["id"] for d in documents_to_create]
        
        return {
            "success": True,
            "message": "Database seeded successfully with comprehensive sample data",
            "created": {
                "clients": len(created_data["clients"]),
                "cases": len(created_data["cases"]),
                "tasks": len(created_data["tasks"]),
                "events": len(created_data["events"]),
                "invoices": len(created_data["invoices"]),
                "documents": len(created_data["documents"])
            }
        }
    
    @seed_router.delete("/seed")
    async def clear_seed_data(user: dict = Depends(get_current_user)):
        """Clear all data for the logged-in advocate (for testing purposes)"""
        advocate_id = user["id"]
        
        # Delete all data for this advocate
        deleted = {
            "clients": (await db.clients.delete_many({"advocate_id": advocate_id})).deleted_count,
            "cases": (await db.cases.delete_many({"advocate_id": advocate_id})).deleted_count,
            "tasks": (await db.tasks.delete_many({"advocate_id": advocate_id})).deleted_count,
            "events": (await db.events.delete_many({"advocate_id": advocate_id})).deleted_count,
            "invoices": (await db.invoices.delete_many({"advocate_id": advocate_id})).deleted_count,
            "documents": (await db.vault_documents.delete_many({"advocate_id": advocate_id})).deleted_count,
        }
        
        return {
            "success": True,
            "message": "All advocate data cleared",
            "deleted": deleted
        }
    
    return seed_router
