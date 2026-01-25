#!/usr/bin/env python3
"""
Backend API Testing for FinZen Croatian Invoice Management App
Tests all endpoints including auth, vendors, transactions, settings, and CSV operations
"""

import requests
import sys
import json
import io
import csv
from datetime import datetime
from pathlib import Path

class FinZenAPITester:
    def __init__(self, base_url="https://receipt-harvest-1.preview.emergentagent.com"):
        self.base_url = base_url
        self.token = None
        self.user_id = None
        self.tests_run = 0
        self.tests_passed = 0
        self.test_results = []

    def log_test(self, name, success, details=""):
        """Log test result"""
        self.tests_run += 1
        if success:
            self.tests_passed += 1
            print(f"✅ {name}")
        else:
            print(f"❌ {name} - {details}")
        
        self.test_results.append({
            "test": name,
            "success": success,
            "details": details
        })

    def make_request(self, method, endpoint, data=None, files=None, expected_status=200):
        """Make HTTP request with proper headers"""
        url = f"{self.base_url}/api/{endpoint}"
        headers = {'Content-Type': 'application/json'}
        
        if self.token:
            headers['Authorization'] = f'Bearer {self.token}'
        
        if files:
            # Remove Content-Type for file uploads
            headers.pop('Content-Type', None)

        try:
            if method == 'GET':
                response = requests.get(url, headers=headers)
            elif method == 'POST':
                if files:
                    response = requests.post(url, files=files, data=data, headers=headers)
                else:
                    response = requests.post(url, json=data, headers=headers)
            elif method == 'PUT':
                response = requests.put(url, json=data, headers=headers)
            elif method == 'DELETE':
                response = requests.delete(url, headers=headers)
            else:
                return False, f"Unsupported method: {method}"

            success = response.status_code == expected_status
            if success:
                try:
                    return True, response.json()
                except:
                    return True, response.text
            else:
                try:
                    error_detail = response.json().get('detail', f'Status {response.status_code}')
                except:
                    error_detail = f'Status {response.status_code}: {response.text[:100]}'
                return False, error_detail

        except Exception as e:
            return False, f"Request failed: {str(e)}"

    def test_health_check(self):
        """Test basic health endpoints"""
        success, result = self.make_request('GET', '')
        self.log_test("API Root Endpoint", success, result if not success else "")
        
        success, result = self.make_request('GET', 'health')
        self.log_test("Health Check", success, result if not success else "")

    def test_user_registration(self):
        """Test user registration"""
        test_user = {
            "email": "test2@example.com",
            "password": "test123",
            "name": "Test User"
        }
        
        success, result = self.make_request('POST', 'auth/register', test_user, expected_status=200)
        if success:
            self.token = result.get('access_token')
            self.user_id = result.get('user', {}).get('id')
        
        self.log_test("User Registration", success, result if not success else "")
        return success

    def test_user_login(self):
        """Test user login"""
        login_data = {
            "email": "test2@example.com",
            "password": "test123"
        }
        
        success, result = self.make_request('POST', 'auth/login', login_data, expected_status=200)
        if success:
            self.token = result.get('access_token')
            self.user_id = result.get('user', {}).get('id')
        
        self.log_test("User Login", success, result if not success else "")
        return success

    def test_get_user_profile(self):
        """Test getting user profile"""
        success, result = self.make_request('GET', 'auth/me')
        self.log_test("Get User Profile", success, result if not success else "")
        return success

    def test_zoho_settings(self):
        """Test Zoho configuration endpoints"""
        # Get current settings
        success, result = self.make_request('GET', 'settings/zoho')
        self.log_test("Get Zoho Settings", success, result if not success else "")
        
        # Save Zoho config
        zoho_config = {
            "zoho_email": "test@zoho.com",
            "zoho_app_password": "test_password_123"
        }
        success, result = self.make_request('POST', 'settings/zoho', zoho_config)
        self.log_test("Save Zoho Settings", success, result if not success else "")
        
        return success

    def test_vendor_management(self):
        """Test vendor CRUD operations"""
        # Create vendor
        vendor_data = {
            "name": "Test Vendor",
            "keywords": ["test", "vendor", "keyword"],
            "download_url": "https://example.com/billing",
            "instructions": "Test instructions for downloading invoices"
        }
        
        success, result = self.make_request('POST', 'vendors', vendor_data, expected_status=200)
        vendor_id = None
        if success:
            vendor_id = result.get('id')
        self.log_test("Create Vendor", success, result if not success else "")
        
        # Get all vendors
        success, result = self.make_request('GET', 'vendors')
        self.log_test("Get All Vendors", success, result if not success else "")
        
        if vendor_id:
            # Update vendor
            updated_data = {
                "name": "Updated Test Vendor",
                "keywords": ["updated", "test"],
                "download_url": "https://updated.example.com",
                "instructions": "Updated instructions"
            }
            success, result = self.make_request('PUT', f'vendors/{vendor_id}', updated_data)
            self.log_test("Update Vendor", success, result if not success else "")
            
            # Delete vendor
            success, result = self.make_request('DELETE', f'vendors/{vendor_id}')
            self.log_test("Delete Vendor", success, result if not success else "")
        
        return True

    def create_test_csv(self):
        """Create a test CSV file for upload"""
        csv_content = """Datum izvršenja,Primatelj,Opis transakcije,Ukupan iznos
2025-01-15,EMERGENT.SH,Hosting usluge prosinac 2024,-25.00 EUR
2025-01-10,CONTABO GmbH,VPS server mjesečno,-15.99 EUR
2025-01-05,Test Vendor,Test transakcija za testiranje,-100.00 EUR"""
        
        return io.StringIO(csv_content)

    def test_csv_upload_and_transactions(self):
        """Test CSV upload and transaction management"""
        # Create test CSV
        csv_file = self.create_test_csv()
        csv_content = csv_file.getvalue().encode('utf-8')
        
        # Upload CSV
        files = {'file': ('test_transactions.csv', csv_content, 'text/csv')}
        data = {'month': '1', 'year': '2025'}
        
        success, result = self.make_request('POST', 'upload/csv', data=data, files=files)
        batch_id = None
        if success:
            batch_id = result.get('batch_id')
        self.log_test("CSV Upload", success, result if not success else "")
        
        # Get batches
        success, result = self.make_request('GET', 'batches')
        self.log_test("Get Batches", success, result if not success else "")
        
        # Get all transactions
        success, result = self.make_request('GET', 'transactions')
        transaction_id = None
        if success and result:
            transaction_id = result[0].get('id') if result else None
        self.log_test("Get All Transactions", success, result if not success else "")
        
        # Get transactions by batch
        if batch_id:
            success, result = self.make_request('GET', f'transactions?batch_id={batch_id}')
            self.log_test("Get Transactions by Batch", success, result if not success else "")
        
        # Get transactions by status
        success, result = self.make_request('GET', 'transactions?status=pending')
        self.log_test("Get Transactions by Status", success, result if not success else "")
        
        # Update transaction status
        if transaction_id:
            update_data = {
                "status": "downloaded",
                "invoice_url": "https://example.com/invoice.pdf"
            }
            success, result = self.make_request('PUT', f'transactions/{transaction_id}', update_data)
            self.log_test("Update Transaction", success, result if not success else "")
        
        return batch_id

    def test_stats_endpoint(self):
        """Test statistics endpoint"""
        success, result = self.make_request('GET', 'stats')
        self.log_test("Get Statistics", success, result if not success else "")
        return success

    def test_csv_export(self, batch_id):
        """Test CSV export functionality"""
        if not batch_id:
            self.log_test("CSV Export", False, "No batch_id available")
            return False
        
        success, result = self.make_request('GET', f'export/csv/{batch_id}')
        self.log_test("CSV Export", success, result if not success else "")
        return success

    def test_email_endpoints(self):
        """Test new Zoho IMAP email endpoints"""
        # Test connection endpoint (should fail without valid credentials)
        success, result = self.make_request('GET', 'email/test-connection', expected_status=400)
        self.log_test("Email Test Connection (No Config)", success, result if not success else "")
        
        # Test email search endpoint (should fail without valid credentials)
        search_data = {
            "vendor_name": "Test Vendor",
            "date_from": "2025-01-01",
            "date_to": "2025-01-31"
        }
        success, result = self.make_request('POST', 'email/search', search_data, expected_status=400)
        self.log_test("Email Search (No Config)", success, result if not success else "")
        
        # Test download attachment endpoint (should fail without valid credentials)
        download_data = {
            "email_id": "123",
            "filename": "test.pdf",
            "transaction_id": "test-transaction-id"
        }
        success, result = self.make_request('POST', 'email/download-attachment', download_data, expected_status=400)
        self.log_test("Email Download Attachment (No Config)", success, result if not success else "")
        
        return True

    def run_all_tests(self):
        """Run all tests in sequence"""
        print("🚀 Starting FinZen Backend API Tests...")
        print(f"📍 Testing against: {self.base_url}")
        print("=" * 60)
        
        # Basic health checks
        print("\n📋 Testing Basic Endpoints...")
        self.test_health_check()
        
        # Authentication tests
        print("\n🔐 Testing Authentication...")
        if not self.test_user_registration():
            # If registration fails, try login with existing user
            if not self.test_user_login():
                print("❌ Authentication failed - stopping tests")
                return False
        
        self.test_get_user_profile()
        
        # Settings tests
        print("\n⚙️ Testing Settings...")
        self.test_zoho_settings()
        
        # Vendor management tests
        print("\n👥 Testing Vendor Management...")
        self.test_vendor_management()
        
        # Transaction and CSV tests
        print("\n📊 Testing Transactions & CSV...")
        batch_id = self.test_csv_upload_and_transactions()
        self.test_stats_endpoint()
        self.test_csv_export(batch_id)
        
        # Email search mock test
        print("\n📧 Testing Email Integration...")
        self.test_email_search_mock()
        
        return True

    def print_summary(self):
        """Print test summary"""
        print("\n" + "=" * 60)
        print("📊 TEST SUMMARY")
        print("=" * 60)
        print(f"Total Tests: {self.tests_run}")
        print(f"Passed: {self.tests_passed}")
        print(f"Failed: {self.tests_run - self.tests_passed}")
        print(f"Success Rate: {(self.tests_passed/self.tests_run*100):.1f}%" if self.tests_run > 0 else "0%")
        
        # Show failed tests
        failed_tests = [t for t in self.test_results if not t['success']]
        if failed_tests:
            print(f"\n❌ Failed Tests ({len(failed_tests)}):")
            for test in failed_tests:
                print(f"  • {test['test']}: {test['details']}")
        
        return self.tests_passed == self.tests_run

def main():
    """Main test execution"""
    tester = FinZenAPITester()
    
    try:
        success = tester.run_all_tests()
        tester.print_summary()
        return 0 if success else 1
    except KeyboardInterrupt:
        print("\n⏹️ Tests interrupted by user")
        return 1
    except Exception as e:
        print(f"\n💥 Unexpected error: {str(e)}")
        return 1

if __name__ == "__main__":
    sys.exit(main())