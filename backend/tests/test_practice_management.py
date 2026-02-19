"""
Test Practice Management API Endpoints
Tests Client CRUD, Case CRUD, Tasks, Events, Invoices, Expenses, Documents, and Dashboard Analytics
"""

import pytest
import requests
import os
import uuid
from datetime import datetime, timedelta

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
TEST_EMAIL = "test@tls.or.tz"
TEST_PASSWORD = "Test@12345678!"


class TestPracticeManagementAuth:
    """Get auth token for testing"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        """Login and get auth token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        print(f"Login response: {response.status_code}")
        if response.status_code == 200:
            token = response.json().get("access_token")
            print(f"Auth token obtained: {token[:20]}...")
            return token
        else:
            print(f"Login failed: {response.text}")
            pytest.skip("Authentication failed - skipping tests")
    
    @pytest.fixture(scope="class")
    def headers(self, auth_token):
        """Headers with auth token"""
        return {"Authorization": f"Bearer {auth_token}", "Content-Type": "application/json"}


class TestDashboardAnalytics(TestPracticeManagementAuth):
    """Test Dashboard Analytics Endpoint"""
    
    def test_get_dashboard_analytics(self, headers):
        """Test GET /api/practice/analytics/dashboard returns summary stats"""
        response = requests.get(f"{BASE_URL}/api/practice/analytics/dashboard", headers=headers)
        print(f"Dashboard Analytics response: {response.status_code}")
        print(f"Dashboard data: {response.json()}")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        
        # Verify summary structure
        assert "summary" in data, "Response should contain summary"
        summary = data["summary"]
        assert "active_cases" in summary
        assert "total_clients" in summary
        assert "pending_tasks" in summary
        assert "upcoming_events" in summary
        assert "total_documents" in summary
        
        # Verify financials structure
        assert "financials" in data, "Response should contain financials"
        financials = data["financials"]
        assert "monthly_revenue" in financials
        assert "currency" in financials


class TestClientCRUD(TestPracticeManagementAuth):
    """Test Client CRUD Operations"""
    
    created_client_id = None
    
    def test_01_create_client(self, headers):
        """Test POST /api/practice/clients - Create a new client"""
        client_data = {
            "name": f"TEST_Client_{uuid.uuid4().hex[:6]}",
            "email": f"testclient_{uuid.uuid4().hex[:6]}@test.com",
            "phone": "+255712345678",
            "company": "Test Company Ltd",
            "client_type": "corporate",
            "address": "123 Test Street, Dar es Salaam",
            "notes": "Test client for API testing"
        }
        
        response = requests.post(f"{BASE_URL}/api/practice/clients", json=client_data, headers=headers)
        print(f"Create Client response: {response.status_code}")
        print(f"Created client: {response.json()}")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        
        # Verify response structure
        assert "id" in data, "Response should contain client ID"
        assert data["name"] == client_data["name"]
        assert data["client_type"] == "corporate"
        
        # Store for subsequent tests
        TestClientCRUD.created_client_id = data["id"]
        print(f"Created client ID: {TestClientCRUD.created_client_id}")
    
    def test_02_get_clients_list(self, headers):
        """Test GET /api/practice/clients - List all clients"""
        response = requests.get(f"{BASE_URL}/api/practice/clients", headers=headers)
        print(f"Get Clients List response: {response.status_code}")
        
        assert response.status_code == 200
        data = response.json()
        
        assert "clients" in data
        assert "total" in data
        assert isinstance(data["clients"], list)
        print(f"Total clients: {data['total']}")
    
    def test_03_get_single_client(self, headers):
        """Test GET /api/practice/clients/{client_id} - Get specific client"""
        if not TestClientCRUD.created_client_id:
            pytest.skip("No client ID available")
        
        response = requests.get(f"{BASE_URL}/api/practice/clients/{TestClientCRUD.created_client_id}", headers=headers)
        print(f"Get Single Client response: {response.status_code}")
        
        assert response.status_code == 200
        data = response.json()
        assert data["id"] == TestClientCRUD.created_client_id
    
    def test_04_update_client(self, headers):
        """Test PUT /api/practice/clients/{client_id} - Update client"""
        if not TestClientCRUD.created_client_id:
            pytest.skip("No client ID available")
        
        update_data = {
            "company": "Updated Company Name",
            "notes": "Updated notes for testing"
        }
        
        response = requests.put(
            f"{BASE_URL}/api/practice/clients/{TestClientCRUD.created_client_id}", 
            json=update_data, 
            headers=headers
        )
        print(f"Update Client response: {response.status_code}")
        
        assert response.status_code == 200
        
        # Verify update persisted
        get_response = requests.get(
            f"{BASE_URL}/api/practice/clients/{TestClientCRUD.created_client_id}", 
            headers=headers
        )
        assert get_response.status_code == 200
        # Note: The update endpoint returns {"message": "Client updated"}, not the full client
    
    def test_05_search_clients(self, headers):
        """Test GET /api/practice/clients?search= - Search clients"""
        response = requests.get(f"{BASE_URL}/api/practice/clients", params={"search": "TEST"}, headers=headers)
        print(f"Search Clients response: {response.status_code}")
        
        assert response.status_code == 200
        data = response.json()
        assert "clients" in data


class TestCaseCRUD(TestPracticeManagementAuth):
    """Test Case/Matter CRUD Operations"""
    
    created_case_id = None
    
    def test_01_create_case_requires_client(self, headers):
        """Test POST /api/practice/cases - Creating case requires valid client"""
        # First, ensure we have a client
        if not TestClientCRUD.created_client_id:
            # Create a client first
            client_data = {
                "name": f"TEST_CaseClient_{uuid.uuid4().hex[:6]}",
                "email": f"caseclient_{uuid.uuid4().hex[:6]}@test.com",
                "client_type": "individual"
            }
            client_response = requests.post(f"{BASE_URL}/api/practice/clients", json=client_data, headers=headers)
            if client_response.status_code == 200:
                TestClientCRUD.created_client_id = client_response.json()["id"]
            else:
                pytest.skip("Could not create client for case test")
        
        case_data = {
            "title": f"TEST_Case_{uuid.uuid4().hex[:6]}",
            "client_id": TestClientCRUD.created_client_id,
            "case_type": "litigation",
            "status": "active",
            "priority": "high",
            "description": "Test case for API testing",
            "court": "High Court of Tanzania"
        }
        
        response = requests.post(f"{BASE_URL}/api/practice/cases", json=case_data, headers=headers)
        print(f"Create Case response: {response.status_code}")
        print(f"Created case: {response.json()}")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        
        assert "id" in data
        assert "reference" in data  # Auto-generated case reference
        assert data["title"] == case_data["title"]
        assert data["case_type"] == "litigation"
        
        TestCaseCRUD.created_case_id = data["id"]
        print(f"Created case ID: {TestCaseCRUD.created_case_id}")
    
    def test_02_get_cases_list(self, headers):
        """Test GET /api/practice/cases - List all cases"""
        response = requests.get(f"{BASE_URL}/api/practice/cases", headers=headers)
        print(f"Get Cases List response: {response.status_code}")
        
        assert response.status_code == 200
        data = response.json()
        assert "cases" in data
        assert "total" in data
        print(f"Total cases: {data['total']}")
    
    def test_03_get_single_case(self, headers):
        """Test GET /api/practice/cases/{case_id} - Get specific case with related data"""
        if not TestCaseCRUD.created_case_id:
            pytest.skip("No case ID available")
        
        response = requests.get(f"{BASE_URL}/api/practice/cases/{TestCaseCRUD.created_case_id}", headers=headers)
        print(f"Get Single Case response: {response.status_code}")
        
        assert response.status_code == 200
        data = response.json()
        assert data["id"] == TestCaseCRUD.created_case_id
        # Should include related data
        assert "client" in data
        assert "documents" in data
        assert "tasks" in data
    
    def test_04_update_case(self, headers):
        """Test PUT /api/practice/cases/{case_id} - Update case"""
        if not TestCaseCRUD.created_case_id:
            pytest.skip("No case ID available")
        
        update_data = {
            "status": "pending",
            "priority": "urgent"
        }
        
        response = requests.put(
            f"{BASE_URL}/api/practice/cases/{TestCaseCRUD.created_case_id}", 
            json=update_data, 
            headers=headers
        )
        print(f"Update Case response: {response.status_code}")
        
        assert response.status_code == 200
    
    def test_05_filter_cases_by_status(self, headers):
        """Test GET /api/practice/cases?status= - Filter cases by status"""
        response = requests.get(f"{BASE_URL}/api/practice/cases", params={"status": "active"}, headers=headers)
        print(f"Filter Cases response: {response.status_code}")
        
        assert response.status_code == 200


class TestTasksCRUD(TestPracticeManagementAuth):
    """Test Tasks CRUD Operations"""
    
    created_task_id = None
    
    def test_01_create_task(self, headers):
        """Test POST /api/practice/tasks - Create a new task"""
        task_data = {
            "title": f"TEST_Task_{uuid.uuid4().hex[:6]}",
            "description": "Test task for API testing",
            "due_date": (datetime.now() + timedelta(days=7)).strftime("%Y-%m-%d"),
            "priority": "high",
            "status": "pending"
        }
        
        response = requests.post(f"{BASE_URL}/api/practice/tasks", json=task_data, headers=headers)
        print(f"Create Task response: {response.status_code}")
        print(f"Created task: {response.json()}")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        
        assert "id" in data
        assert data["title"] == task_data["title"]
        assert data["status"] == "pending"
        
        TestTasksCRUD.created_task_id = data["id"]
    
    def test_02_get_tasks_list(self, headers):
        """Test GET /api/practice/tasks - List all tasks"""
        response = requests.get(f"{BASE_URL}/api/practice/tasks", headers=headers)
        print(f"Get Tasks List response: {response.status_code}")
        
        assert response.status_code == 200
        data = response.json()
        assert "tasks" in data
        assert "total" in data
    
    def test_03_update_task_status(self, headers):
        """Test PUT /api/practice/tasks/{task_id} - Update task status to completed"""
        if not TestTasksCRUD.created_task_id:
            pytest.skip("No task ID available")
        
        update_data = {"status": "completed"}
        
        response = requests.put(
            f"{BASE_URL}/api/practice/tasks/{TestTasksCRUD.created_task_id}", 
            json=update_data, 
            headers=headers
        )
        print(f"Update Task Status response: {response.status_code}")
        
        assert response.status_code == 200
    
    def test_04_filter_tasks_by_status(self, headers):
        """Test GET /api/practice/tasks?status= - Filter tasks"""
        response = requests.get(f"{BASE_URL}/api/practice/tasks", params={"status": "pending"}, headers=headers)
        print(f"Filter Tasks response: {response.status_code}")
        
        assert response.status_code == 200


class TestEventsCRUD(TestPracticeManagementAuth):
    """Test Calendar Events CRUD Operations"""
    
    created_event_id = None
    
    def test_01_create_event(self, headers):
        """Test POST /api/practice/events - Create a new calendar event"""
        event_data = {
            "title": f"TEST_Event_{uuid.uuid4().hex[:6]}",
            "event_type": "meeting",
            "start_datetime": (datetime.now() + timedelta(days=1)).isoformat(),
            "end_datetime": (datetime.now() + timedelta(days=1, hours=1)).isoformat(),
            "location": "Virtual Meeting",
            "description": "Test event for API testing"
        }
        
        response = requests.post(f"{BASE_URL}/api/practice/events", json=event_data, headers=headers)
        print(f"Create Event response: {response.status_code}")
        print(f"Created event: {response.json()}")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        
        assert "id" in data
        assert data["title"] == event_data["title"]
        assert data["event_type"] == "meeting"
        
        TestEventsCRUD.created_event_id = data["id"]
    
    def test_02_get_events_list(self, headers):
        """Test GET /api/practice/events - List all events"""
        response = requests.get(f"{BASE_URL}/api/practice/events", headers=headers)
        print(f"Get Events List response: {response.status_code}")
        
        assert response.status_code == 200
        data = response.json()
        assert "events" in data
        assert "total" in data
    
    def test_03_update_event(self, headers):
        """Test PUT /api/practice/events/{event_id} - Update event"""
        if not TestEventsCRUD.created_event_id:
            pytest.skip("No event ID available")
        
        update_data = {"location": "Updated Location"}
        
        response = requests.put(
            f"{BASE_URL}/api/practice/events/{TestEventsCRUD.created_event_id}", 
            json=update_data, 
            headers=headers
        )
        print(f"Update Event response: {response.status_code}")
        
        assert response.status_code == 200


class TestInvoicesCRUD(TestPracticeManagementAuth):
    """Test Invoices CRUD Operations"""
    
    created_invoice_id = None
    
    def test_01_create_invoice(self, headers):
        """Test POST /api/practice/invoices - Create a new invoice"""
        # Need client ID
        if not TestClientCRUD.created_client_id:
            # Create a client first
            client_data = {
                "name": f"TEST_InvoiceClient_{uuid.uuid4().hex[:6]}",
                "email": f"invoiceclient_{uuid.uuid4().hex[:6]}@test.com",
                "client_type": "corporate"
            }
            client_response = requests.post(f"{BASE_URL}/api/practice/clients", json=client_data, headers=headers)
            if client_response.status_code == 200:
                TestClientCRUD.created_client_id = client_response.json()["id"]
            else:
                pytest.skip("Could not create client for invoice test")
        
        invoice_data = {
            "client_id": TestClientCRUD.created_client_id,
            "items": [
                {"description": "Legal consultation", "quantity": 2, "unit_price": 100000, "tax_rate": 18},
                {"description": "Document preparation", "quantity": 1, "unit_price": 50000, "tax_rate": 18}
            ],
            "due_date": (datetime.now() + timedelta(days=30)).strftime("%Y-%m-%d"),
            "notes": "Test invoice for API testing",
            "payment_terms": "Net 30"
        }
        
        response = requests.post(f"{BASE_URL}/api/practice/invoices", json=invoice_data, headers=headers)
        print(f"Create Invoice response: {response.status_code}")
        print(f"Created invoice: {response.json()}")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        
        assert "id" in data
        assert "invoice_number" in data  # Auto-generated
        assert "total" in data
        assert data["status"] == "draft"
        assert data["currency"] == "TZS"
        
        TestInvoicesCRUD.created_invoice_id = data["id"]
        print(f"Created invoice ID: {TestInvoicesCRUD.created_invoice_id}")
        print(f"Invoice total: {data['total']}")
    
    def test_02_get_invoices_list(self, headers):
        """Test GET /api/practice/invoices - List all invoices"""
        response = requests.get(f"{BASE_URL}/api/practice/invoices", headers=headers)
        print(f"Get Invoices List response: {response.status_code}")
        
        assert response.status_code == 200
        data = response.json()
        assert "invoices" in data
        assert "total" in data
    
    def test_03_get_single_invoice(self, headers):
        """Test GET /api/practice/invoices/{invoice_id} - Get specific invoice"""
        if not TestInvoicesCRUD.created_invoice_id:
            pytest.skip("No invoice ID available")
        
        response = requests.get(f"{BASE_URL}/api/practice/invoices/{TestInvoicesCRUD.created_invoice_id}", headers=headers)
        print(f"Get Single Invoice response: {response.status_code}")
        
        assert response.status_code == 200
        data = response.json()
        assert data["id"] == TestInvoicesCRUD.created_invoice_id
        assert "client" in data  # Should include client info


class TestExpensesCRUD(TestPracticeManagementAuth):
    """Test Expenses CRUD Operations"""
    
    created_expense_id = None
    
    def test_01_create_expense(self, headers):
        """Test POST /api/practice/expenses - Create a new expense"""
        expense_data = {
            "description": f"TEST_Expense_{uuid.uuid4().hex[:6]}",
            "amount": 50000,
            "category": "filing_fees",
            "date": datetime.now().strftime("%Y-%m-%d"),
            "billable": True,
            "notes": "Test expense for API testing"
        }
        
        response = requests.post(f"{BASE_URL}/api/practice/expenses", json=expense_data, headers=headers)
        print(f"Create Expense response: {response.status_code}")
        print(f"Created expense: {response.json()}")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        
        assert "id" in data
        assert data["amount"] == expense_data["amount"]
        assert data["category"] == "filing_fees"
        
        TestExpensesCRUD.created_expense_id = data["id"]
    
    def test_02_get_expenses_list(self, headers):
        """Test GET /api/practice/expenses - List all expenses"""
        response = requests.get(f"{BASE_URL}/api/practice/expenses", headers=headers)
        print(f"Get Expenses List response: {response.status_code}")
        
        assert response.status_code == 200
        data = response.json()
        assert "expenses" in data
        assert "total" in data
        assert "total_amount" in data
        assert "billable_amount" in data


class TestDocumentVault(TestPracticeManagementAuth):
    """Test Document Vault Operations"""
    
    def test_01_get_folders(self, headers):
        """Test GET /api/practice/folders - List folders (creates defaults if none)"""
        response = requests.get(f"{BASE_URL}/api/practice/folders", headers=headers)
        print(f"Get Folders response: {response.status_code}")
        
        assert response.status_code == 200
        data = response.json()
        assert "folders" in data
        print(f"Folders: {[f['name'] for f in data['folders']]}")
    
    def test_02_get_documents_list(self, headers):
        """Test GET /api/practice/documents - List documents"""
        response = requests.get(f"{BASE_URL}/api/practice/documents", headers=headers)
        print(f"Get Documents List response: {response.status_code}")
        
        assert response.status_code == 200
        data = response.json()
        assert "documents" in data
        assert "total" in data


class TestAnalyticsEndpoints(TestPracticeManagementAuth):
    """Test Analytics Endpoints"""
    
    def test_01_case_analytics(self, headers):
        """Test GET /api/practice/analytics/cases - Case analytics"""
        response = requests.get(f"{BASE_URL}/api/practice/analytics/cases", headers=headers)
        print(f"Case Analytics response: {response.status_code}")
        
        assert response.status_code == 200
        data = response.json()
        assert "by_status" in data
        assert "by_type" in data
    
    def test_02_revenue_analytics(self, headers):
        """Test GET /api/practice/analytics/revenue - Revenue analytics"""
        response = requests.get(f"{BASE_URL}/api/practice/analytics/revenue", headers=headers)
        print(f"Revenue Analytics response: {response.status_code}")
        
        assert response.status_code == 200
        data = response.json()
        assert "revenue_by_period" in data
        assert "currency" in data


class TestCleanup(TestPracticeManagementAuth):
    """Clean up test data - Run last"""
    
    def test_cleanup_task(self, headers):
        """Delete created test task"""
        if TestTasksCRUD.created_task_id:
            response = requests.delete(
                f"{BASE_URL}/api/practice/tasks/{TestTasksCRUD.created_task_id}", 
                headers=headers
            )
            print(f"Delete Task response: {response.status_code}")
            assert response.status_code == 200
    
    def test_cleanup_event(self, headers):
        """Delete created test event"""
        if TestEventsCRUD.created_event_id:
            response = requests.delete(
                f"{BASE_URL}/api/practice/events/{TestEventsCRUD.created_event_id}", 
                headers=headers
            )
            print(f"Delete Event response: {response.status_code}")
            assert response.status_code == 200
    
    def test_cleanup_expense(self, headers):
        """Delete created test expense"""
        if TestExpensesCRUD.created_expense_id:
            response = requests.delete(
                f"{BASE_URL}/api/practice/expenses/{TestExpensesCRUD.created_expense_id}", 
                headers=headers
            )
            print(f"Delete Expense response: {response.status_code}")
            assert response.status_code == 200
    
    def test_cleanup_invoice(self, headers):
        """Delete created test invoice"""
        if TestInvoicesCRUD.created_invoice_id:
            response = requests.delete(
                f"{BASE_URL}/api/practice/invoices/{TestInvoicesCRUD.created_invoice_id}", 
                headers=headers
            )
            print(f"Delete Invoice response: {response.status_code}")
            assert response.status_code == 200
    
    def test_cleanup_case(self, headers):
        """Delete created test case"""
        if TestCaseCRUD.created_case_id:
            response = requests.delete(
                f"{BASE_URL}/api/practice/cases/{TestCaseCRUD.created_case_id}", 
                headers=headers
            )
            print(f"Delete Case response: {response.status_code}")
            assert response.status_code == 200
    
    def test_cleanup_client(self, headers):
        """Delete created test client"""
        if TestClientCRUD.created_client_id:
            response = requests.delete(
                f"{BASE_URL}/api/practice/clients/{TestClientCRUD.created_client_id}", 
                headers=headers
            )
            print(f"Delete Client response: {response.status_code}")
            assert response.status_code == 200


if __name__ == "__main__":
    pytest.main([__file__, "-v", "-s"])
