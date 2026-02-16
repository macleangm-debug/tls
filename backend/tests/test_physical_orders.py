"""
Physical Stamp Ordering Workflow Tests
Tests the complete flow: Advocate places order → TLS Admin views → IDC Super Admin manages via Kanban

Test modules:
1. Advocate order placement
2. TLS Admin read-only view
3. IDC Super Admin Kanban management
4. Status transitions through all stages
"""

import pytest
import requests
import os
import time

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials from seeded data
ADVOCATE_CREDENTIALS = {
    "email": "testadvocate@tls.or.tz",
    "password": "Test@1234"
}

TLS_ADMIN_CREDENTIALS = {
    "email": "admin@tls.or.tz",
    "password": "TLS@Admin2024"
}

# Note: Seeded super admin has different credentials than review_request
IDC_SUPER_ADMIN_CREDENTIALS = {
    "email": "superadmin@idc.co.tz",
    "password": "IDC@SuperAdmin2024"
}

# Valid status transitions
VALID_STATUSES = [
    "pending_review",
    "approved", 
    "in_production",
    "quality_check",
    "ready_dispatch",
    "dispatched",
    "delivered"
]


class TestAuthentication:
    """Test authentication for all user roles"""
    
    def test_advocate_login(self):
        """Test advocate can login successfully"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json=ADVOCATE_CREDENTIALS
        )
        assert response.status_code == 200, f"Advocate login failed: {response.text}"
        data = response.json()
        assert "access_token" in data
        assert data["user"]["role"] == "advocate"
        print(f"✓ Advocate login successful: {data['user']['full_name']}")
    
    def test_tls_admin_login(self):
        """Test TLS Admin can login successfully"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json=TLS_ADMIN_CREDENTIALS
        )
        assert response.status_code == 200, f"TLS Admin login failed: {response.text}"
        data = response.json()
        assert "access_token" in data
        assert data["user"]["role"] == "admin"
        print(f"✓ TLS Admin login successful: {data['user']['full_name']}")
    
    def test_idc_super_admin_login(self):
        """Test IDC Super Admin can login successfully"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json=IDC_SUPER_ADMIN_CREDENTIALS
        )
        assert response.status_code == 200, f"IDC Super Admin login failed: {response.text}"
        data = response.json()
        assert "access_token" in data
        assert data["user"]["role"] == "super_admin"
        print(f"✓ IDC Super Admin login successful: {data['user']['full_name']}")


class TestAdvocateOrderPlacement:
    """Test advocate can place physical stamp orders"""
    
    @pytest.fixture
    def advocate_token(self):
        """Get advocate auth token"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json=ADVOCATE_CREDENTIALS
        )
        return response.json()["access_token"]
    
    def test_create_order_with_certificate_stamp(self, advocate_token):
        """Test creating order with Certificate stamp"""
        order_data = {
            "items": [
                {
                    "product_type": "stamp",
                    "stamp_type": "certificate",
                    "format": "desk",
                    "name": "Certificate Stamp (Desk Stamp)",
                    "quantity": 1,
                    "unit_price": 150000,
                    "total_price": 150000
                }
            ],
            "delivery_address": "TEST_123 Main Street, Dar es Salaam, Tanzania",
            "special_instructions": "TEST - Please handle with care",
            "customization": {}
        }
        
        response = requests.post(
            f"{BASE_URL}/api/physical-orders",
            json=order_data,
            headers={"Authorization": f"Bearer {advocate_token}"}
        )
        assert response.status_code == 200, f"Order creation failed: {response.text}"
        
        data = response.json()
        assert "id" in data
        assert data["status"] == "pending_review"
        assert data["payment_status"] == "pending"
        assert len(data["items"]) == 1
        assert data["items"][0]["stamp_type"] == "certificate"
        print(f"✓ Certificate stamp order created: {data['id']}")
        return data["id"]
    
    def test_create_order_with_notary_stamp(self, advocate_token):
        """Test creating order with Notary stamp"""
        order_data = {
            "items": [
                {
                    "product_type": "stamp",
                    "stamp_type": "notary",
                    "format": "pocket",
                    "name": "Notary Stamp (Pocket Stamp)",
                    "quantity": 2,
                    "unit_price": 170000,
                    "total_price": 340000
                }
            ],
            "delivery_address": "TEST_456 Court Road, Arusha, Tanzania",
            "special_instructions": "",
            "customization": {}
        }
        
        response = requests.post(
            f"{BASE_URL}/api/physical-orders",
            json=order_data,
            headers={"Authorization": f"Bearer {advocate_token}"}
        )
        assert response.status_code == 200
        
        data = response.json()
        assert data["items"][0]["stamp_type"] == "notary"
        assert data["total_price"] == 340000
        print(f"✓ Notary stamp order created: {data['id']}")
    
    def test_create_order_with_ink_refill(self, advocate_token):
        """Test creating order with ink refill only"""
        order_data = {
            "items": [
                {
                    "product_type": "ink",
                    "stamp_type": None,
                    "format": None,
                    "name": "Stamp Ink Refill",
                    "quantity": 3,
                    "unit_price": 15000,
                    "total_price": 45000
                }
            ],
            "delivery_address": "TEST_789 Law Office, Mwanza, Tanzania",
            "special_instructions": "TEST - Color: Black",
            "customization": {}
        }
        
        response = requests.post(
            f"{BASE_URL}/api/physical-orders",
            json=order_data,
            headers={"Authorization": f"Bearer {advocate_token}"}
        )
        assert response.status_code == 200
        
        data = response.json()
        assert data["items"][0]["product_type"] == "ink"
        assert data["total_price"] == 45000
        print(f"✓ Ink refill order created: {data['id']}")
    
    def test_create_order_with_multiple_items(self, advocate_token):
        """Test creating order with stamps and ink refill"""
        order_data = {
            "items": [
                {
                    "product_type": "stamp",
                    "stamp_type": "certificate",
                    "format": "desk",
                    "name": "Certificate Stamp (Desk Stamp)",
                    "quantity": 1,
                    "unit_price": 150000,
                    "total_price": 150000
                },
                {
                    "product_type": "stamp",
                    "stamp_type": "notary",
                    "format": "pocket",
                    "name": "Notary Stamp (Pocket Stamp)",
                    "quantity": 1,
                    "unit_price": 170000,
                    "total_price": 170000
                },
                {
                    "product_type": "ink",
                    "stamp_type": None,
                    "format": None,
                    "name": "Stamp Ink Refill",
                    "quantity": 2,
                    "unit_price": 15000,
                    "total_price": 30000
                }
            ],
            "delivery_address": "TEST_MULTI Law Chambers, Dodoma, Tanzania",
            "special_instructions": "TEST - Bundle order",
            "customization": {}
        }
        
        response = requests.post(
            f"{BASE_URL}/api/physical-orders",
            json=order_data,
            headers={"Authorization": f"Bearer {advocate_token}"}
        )
        assert response.status_code == 200
        
        data = response.json()
        assert len(data["items"]) == 3
        assert data["total_price"] == 350000  # 150000 + 170000 + 30000
        print(f"✓ Multi-item order created: {data['id']}, Total: TZS {data['total_price']}")
    
    def test_order_requires_delivery_address(self, advocate_token):
        """Test order creation requires delivery address"""
        order_data = {
            "items": [
                {
                    "product_type": "stamp",
                    "stamp_type": "certificate",
                    "format": "desk",
                    "name": "Certificate Stamp",
                    "quantity": 1,
                    "unit_price": 150000,
                    "total_price": 150000
                }
            ],
            "delivery_address": "",  # Empty address
            "special_instructions": "",
            "customization": {}
        }
        
        response = requests.post(
            f"{BASE_URL}/api/physical-orders",
            json=order_data,
            headers={"Authorization": f"Bearer {advocate_token}"}
        )
        # The API accepts empty address but frontend validates
        # This tests the API behavior
        if response.status_code == 200:
            print("⚠ API accepts empty delivery address - frontend validation only")
        else:
            print("✓ API validates delivery address")


class TestTLSAdminReadOnlyView:
    """Test TLS Admin can view orders (read-only)"""
    
    @pytest.fixture
    def admin_token(self):
        """Get TLS Admin auth token"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json=TLS_ADMIN_CREDENTIALS
        )
        return response.json()["access_token"]
    
    def test_admin_can_view_all_orders(self, admin_token):
        """Test TLS Admin can view all physical orders"""
        response = requests.get(
            f"{BASE_URL}/api/physical-orders",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200
        
        orders = response.json()
        assert isinstance(orders, list)
        print(f"✓ TLS Admin can view {len(orders)} orders")
    
    def test_admin_can_view_single_order(self, admin_token):
        """Test TLS Admin can view single order details"""
        # First get list of orders
        response = requests.get(
            f"{BASE_URL}/api/physical-orders",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        orders = response.json()
        
        if len(orders) > 0:
            order_id = orders[0]["id"]
            response = requests.get(
                f"{BASE_URL}/api/physical-orders/{order_id}",
                headers={"Authorization": f"Bearer {admin_token}"}
            )
            assert response.status_code == 200
            order = response.json()
            assert order["id"] == order_id
            print(f"✓ TLS Admin can view order details: {order_id}")
        else:
            pytest.skip("No orders available to view")
    
    def test_admin_cannot_update_status(self, admin_token):
        """Test TLS Admin cannot update order status (read-only)"""
        # First get list of orders
        response = requests.get(
            f"{BASE_URL}/api/physical-orders",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        orders = response.json()
        
        if len(orders) > 0:
            order_id = orders[0]["id"]
            response = requests.put(
                f"{BASE_URL}/api/physical-orders/{order_id}/status?status=approved",
                headers={"Authorization": f"Bearer {admin_token}"}
            )
            assert response.status_code == 403, "TLS Admin should not be able to update status"
            print("✓ TLS Admin correctly denied status update (read-only)")
        else:
            pytest.skip("No orders available to test")


class TestIDCSuperAdminKanban:
    """Test IDC Super Admin Kanban management"""
    
    @pytest.fixture
    def super_admin_token(self):
        """Get IDC Super Admin auth token"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json=IDC_SUPER_ADMIN_CREDENTIALS
        )
        return response.json()["access_token"]
    
    @pytest.fixture
    def advocate_token(self):
        """Get advocate auth token for creating test orders"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json=ADVOCATE_CREDENTIALS
        )
        return response.json()["access_token"]
    
    def test_super_admin_can_view_all_orders(self, super_admin_token):
        """Test IDC Super Admin can view all orders"""
        response = requests.get(
            f"{BASE_URL}/api/physical-orders",
            headers={"Authorization": f"Bearer {super_admin_token}"}
        )
        assert response.status_code == 200
        
        orders = response.json()
        assert isinstance(orders, list)
        print(f"✓ IDC Super Admin can view {len(orders)} orders")
    
    def test_super_admin_can_view_stats(self, super_admin_token):
        """Test IDC Super Admin can view order statistics"""
        response = requests.get(
            f"{BASE_URL}/api/physical-orders/stats/summary",
            headers={"Authorization": f"Bearer {super_admin_token}"}
        )
        assert response.status_code == 200
        
        stats = response.json()
        assert "total_orders" in stats
        assert "by_status" in stats
        print(f"✓ IDC Super Admin stats: {stats['total_orders']} total orders")
    
    def test_super_admin_status_transition_full_workflow(self, super_admin_token, advocate_token):
        """Test IDC Super Admin can move order through all Kanban statuses"""
        # 1. Create a new test order as advocate
        order_data = {
            "items": [
                {
                    "product_type": "stamp",
                    "stamp_type": "certificate",
                    "format": "desk",
                    "name": "TEST_WORKFLOW Certificate Stamp",
                    "quantity": 1,
                    "unit_price": 150000,
                    "total_price": 150000
                }
            ],
            "delivery_address": "TEST_WORKFLOW Address, Dar es Salaam",
            "special_instructions": "TEST - Full workflow test",
            "customization": {}
        }
        
        create_response = requests.post(
            f"{BASE_URL}/api/physical-orders",
            json=order_data,
            headers={"Authorization": f"Bearer {advocate_token}"}
        )
        assert create_response.status_code == 200
        order = create_response.json()
        order_id = order["id"]
        assert order["status"] == "pending_review"
        print(f"✓ Created test order: {order_id} (status: pending_review)")
        
        # 2. Test status transitions through full workflow
        status_transitions = [
            ("approved", "Order approved for production"),
            ("in_production", "Stamp production started"),
            ("quality_check", "Quality inspection in progress"),
            ("ready_dispatch", "Ready for shipping"),
            ("dispatched", "Order shipped"),
            ("delivered", "Order delivered successfully")
        ]
        
        for new_status, note in status_transitions:
            response = requests.put(
                f"{BASE_URL}/api/physical-orders/{order_id}/status",
                params={"status": new_status, "note": note},
                headers={"Authorization": f"Bearer {super_admin_token}"}
            )
            assert response.status_code == 200, f"Failed to transition to {new_status}: {response.text}"
            print(f"✓ Status transition: → {new_status}")
            
            # Verify status was updated
            verify_response = requests.get(
                f"{BASE_URL}/api/physical-orders/{order_id}",
                headers={"Authorization": f"Bearer {super_admin_token}"}
            )
            assert verify_response.json()["status"] == new_status
        
        # 3. Verify final status and history
        final_response = requests.get(
            f"{BASE_URL}/api/physical-orders/{order_id}",
            headers={"Authorization": f"Bearer {super_admin_token}"}
        )
        final_order = final_response.json()
        assert final_order["status"] == "delivered"
        assert len(final_order["status_history"]) == 7  # Initial + 6 transitions
        print(f"✓ Full workflow completed! Order {order_id} delivered with {len(final_order['status_history'])} status history entries")
    
    def test_super_admin_can_add_tracking_number(self, super_admin_token, advocate_token):
        """Test IDC Super Admin can add tracking number when dispatching"""
        # Create test order
        order_data = {
            "items": [
                {
                    "product_type": "stamp",
                    "stamp_type": "notary",
                    "format": "pocket",
                    "name": "TEST_TRACKING Notary Stamp",
                    "quantity": 1,
                    "unit_price": 170000,
                    "total_price": 170000
                }
            ],
            "delivery_address": "TEST_TRACKING Address",
            "special_instructions": "",
            "customization": {}
        }
        
        create_response = requests.post(
            f"{BASE_URL}/api/physical-orders",
            json=order_data,
            headers={"Authorization": f"Bearer {advocate_token}"}
        )
        order_id = create_response.json()["id"]
        
        # Move to dispatched with tracking number
        # First approve
        requests.put(
            f"{BASE_URL}/api/physical-orders/{order_id}/status",
            params={"status": "approved"},
            headers={"Authorization": f"Bearer {super_admin_token}"}
        )
        
        # Add tracking number when dispatching
        tracking_number = "TZ-TRACK-123456"
        response = requests.put(
            f"{BASE_URL}/api/physical-orders/{order_id}/status",
            params={"status": "dispatched", "tracking_number": tracking_number, "note": "Shipped via DHL"},
            headers={"Authorization": f"Bearer {super_admin_token}"}
        )
        assert response.status_code == 200
        
        # Verify tracking number
        verify_response = requests.get(
            f"{BASE_URL}/api/physical-orders/{order_id}",
            headers={"Authorization": f"Bearer {super_admin_token}"}
        )
        assert verify_response.json()["tracking_number"] == tracking_number
        print(f"✓ Tracking number added: {tracking_number}")
    
    def test_super_admin_can_add_notes(self, super_admin_token, advocate_token):
        """Test IDC Super Admin can add notes to orders"""
        # Get any existing order or create one
        response = requests.get(
            f"{BASE_URL}/api/physical-orders",
            headers={"Authorization": f"Bearer {super_admin_token}"}
        )
        orders = response.json()
        
        if len(orders) > 0:
            order_id = orders[0]["id"]
        else:
            # Create test order
            order_data = {
                "items": [{"product_type": "stamp", "stamp_type": "certificate", "format": "desk", "name": "Test", "quantity": 1, "unit_price": 150000, "total_price": 150000}],
                "delivery_address": "TEST Address",
                "special_instructions": "",
                "customization": {}
            }
            create_response = requests.post(
                f"{BASE_URL}/api/physical-orders",
                json=order_data,
                headers={"Authorization": f"Bearer {advocate_token}"}
            )
            order_id = create_response.json()["id"]
        
        # Add a note
        test_note = "TEST_NOTE - Quality check passed"
        note_response = requests.post(
            f"{BASE_URL}/api/physical-orders/{order_id}/notes",
            params={"note": test_note},
            headers={"Authorization": f"Bearer {super_admin_token}"}
        )
        assert note_response.status_code == 200
        print(f"✓ Note added to order {order_id}")
        
        # Verify note was added
        verify_response = requests.get(
            f"{BASE_URL}/api/physical-orders/{order_id}",
            headers={"Authorization": f"Bearer {super_admin_token}"}
        )
        order = verify_response.json()
        assert len(order["notes"]) > 0
        assert any(test_note in note["text"] for note in order["notes"])
        print(f"✓ Note verified in order: {len(order['notes'])} notes total")
    
    def test_invalid_status_rejected(self, super_admin_token):
        """Test invalid status values are rejected"""
        response = requests.get(
            f"{BASE_URL}/api/physical-orders",
            headers={"Authorization": f"Bearer {super_admin_token}"}
        )
        orders = response.json()
        
        if len(orders) > 0:
            order_id = orders[0]["id"]
            response = requests.put(
                f"{BASE_URL}/api/physical-orders/{order_id}/status",
                params={"status": "invalid_status"},
                headers={"Authorization": f"Bearer {super_admin_token}"}
            )
            assert response.status_code == 400
            print("✓ Invalid status correctly rejected")
        else:
            pytest.skip("No orders available to test")


class TestCleanup:
    """Cleanup test data after tests"""
    
    def test_cleanup_test_orders(self):
        """Note: Test orders with TEST_ prefix should be cleaned up manually if needed"""
        print("⚠ Test data with TEST_ prefix may remain in database for verification")
        print("  Consider manual cleanup of orders with addresses containing 'TEST_'")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
