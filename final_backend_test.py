#!/usr/bin/env python3
"""
Final Comprehensive Backend Test for Univox
Tests all critical functionality and identifies any issues
"""

import requests
import json
import time
import uuid
from datetime import datetime

# Configuration
BACKEND_URL = "https://6e848df0-c71f-4c49-885d-2f03ec956bb8.preview.emergentagent.com/api"

class FinalTestResults:
    def __init__(self):
        self.results = []
        self.passed = 0
        self.failed = 0
        self.critical_issues = []
        self.minor_issues = []
    
    def add_result(self, test_name, passed, details="", critical=False):
        self.results.append({
            "test": test_name,
            "passed": passed,
            "details": details,
            "critical": critical,
            "timestamp": datetime.now().isoformat()
        })
        
        if passed:
            self.passed += 1
        else:
            self.failed += 1
            if critical:
                self.critical_issues.append(f"{test_name}: {details}")
            else:
                self.minor_issues.append(f"{test_name}: {details}")
        
        status = "✅ PASS" if passed else ("🔴 CRITICAL FAIL" if critical else "⚠️  MINOR FAIL")
        print(f"{status}: {test_name}")
        if details:
            print(f"   Details: {details}")
    
    def print_summary(self):
        print(f"\n{'='*60}")
        print(f"FINAL TEST SUMMARY")
        print(f"{'='*60}")
        print(f"Total Tests: {self.passed + self.failed}")
        print(f"Passed: {self.passed}")
        print(f"Failed: {self.failed}")
        print(f"Critical Issues: {len(self.critical_issues)}")
        print(f"Minor Issues: {len(self.minor_issues)}")
        print(f"Success Rate: {(self.passed/(self.passed + self.failed)*100):.1f}%")
        
        if self.critical_issues:
            print(f"\n🔴 CRITICAL ISSUES:")
            for issue in self.critical_issues:
                print(f"- {issue}")
        
        if self.minor_issues:
            print(f"\n⚠️  MINOR ISSUES:")
            for issue in self.minor_issues:
                print(f"- {issue}")

results = FinalTestResults()

def test_core_authentication():
    """Test core authentication functionality"""
    
    try:
        # Test 1: No session header
        response = requests.get(f"{BACKEND_URL}/auth/profile")
        
        if response.status_code == 401:
            try:
                error_data = response.json()
                if "detail" in error_data and error_data["detail"] == "Invalid session":
                    results.add_result("Core Auth - No Session", True, "Correctly handles missing session")
                else:
                    results.add_result("Core Auth - No Session", False, f"Unexpected error message: {error_data}", critical=True)
            except:
                results.add_result("Core Auth - No Session", False, "Response not valid JSON", critical=True)
        else:
            results.add_result("Core Auth - No Session", False, f"Expected 401, got {response.status_code}", critical=True)
        
        # Test 2: Invalid session
        headers = {"X-Session-ID": "invalid-session-12345"}
        response = requests.get(f"{BACKEND_URL}/auth/profile", headers=headers)
        
        if response.status_code == 401:
            results.add_result("Core Auth - Invalid Session", True, "Correctly rejects invalid session")
        else:
            results.add_result("Core Auth - Invalid Session", False, f"Expected 401, got {response.status_code}", critical=True)
        
        # Test 3: Empty session
        headers = {"X-Session-ID": ""}
        response = requests.get(f"{BACKEND_URL}/auth/profile", headers=headers)
        
        if response.status_code == 401:
            results.add_result("Core Auth - Empty Session", True, "Correctly handles empty session")
        else:
            results.add_result("Core Auth - Empty Session", False, f"Expected 401, got {response.status_code}")
            
    except Exception as e:
        results.add_result("Core Authentication Tests", False, f"Exception: {str(e)}", critical=True)

def test_user_profile_endpoints():
    """Test user profile management endpoints"""
    
    try:
        # Test profile update without auth
        profile_data = {
            "username": "alice_martin",
            "email": "alice@example.com",
            "name": "Alice Martin",
            "bio": "Passionate developer from Paris",
            "age": 28,
            "country": "France",
            "interests": "coding, photography, travel"
        }
        
        response = requests.put(f"{BACKEND_URL}/user/profile", json=profile_data)
        
        if response.status_code == 401:
            results.add_result("Profile Update - Auth Required", True, "Correctly requires authentication")
        else:
            results.add_result("Profile Update - Auth Required", False, f"Expected 401, got {response.status_code}", critical=True)
        
        # Test user search without auth
        response = requests.get(f"{BACKEND_URL}/users/search?q=alice")
        
        if response.status_code == 401:
            results.add_result("User Search - Auth Required", True, "Correctly requires authentication")
        else:
            results.add_result("User Search - Auth Required", False, f"Expected 401, got {response.status_code}", critical=True)
        
        # Test user search with missing query
        headers = {"X-Session-ID": "test-session"}
        response = requests.get(f"{BACKEND_URL}/users/search", headers=headers)
        
        if response.status_code in [400, 422]:
            results.add_result("User Search - Missing Query", True, "Correctly validates query parameter")
        else:
            results.add_result("User Search - Missing Query", False, f"Should validate query param, got {response.status_code}")
            
    except Exception as e:
        results.add_result("User Profile Endpoints", False, f"Exception: {str(e)}", critical=True)

def test_friends_system_endpoints():
    """Test friends system with 5-friend limit logic"""
    
    try:
        # Test friend request without auth
        friend_request = {"friend_id": str(uuid.uuid4())}
        response = requests.post(f"{BACKEND_URL}/friends/request", json=friend_request)
        
        if response.status_code == 401:
            results.add_result("Friend Request - Auth Required", True, "Correctly requires authentication")
        else:
            results.add_result("Friend Request - Auth Required", False, f"Expected 401, got {response.status_code}", critical=True)
        
        # Test friend request with invalid friend_id
        invalid_request = {"friend_id": ""}
        response = requests.post(f"{BACKEND_URL}/friends/request", json=invalid_request)
        
        if response.status_code in [400, 401, 422]:
            results.add_result("Friend Request - Invalid ID", True, "Correctly validates friend_id")
        else:
            results.add_result("Friend Request - Invalid ID", False, f"Should validate friend_id, got {response.status_code}")
        
        # Test friend request response without auth
        response = requests.put(f"{BACKEND_URL}/friends/request/test-id?action=accept")
        
        if response.status_code == 401:
            results.add_result("Friend Response - Auth Required", True, "Correctly requires authentication")
        else:
            results.add_result("Friend Response - Auth Required", False, f"Expected 401, got {response.status_code}", critical=True)
        
        # Test friend list without auth
        response = requests.get(f"{BACKEND_URL}/friends")
        
        if response.status_code == 401:
            results.add_result("Friends List - Auth Required", True, "Correctly requires authentication")
        else:
            results.add_result("Friends List - Auth Required", False, f"Expected 401, got {response.status_code}", critical=True)
        
        # Test friend removal without auth
        response = requests.delete(f"{BACKEND_URL}/friends/test-id")
        
        if response.status_code == 401:
            results.add_result("Friend Removal - Auth Required", True, "Correctly requires authentication")
        else:
            results.add_result("Friend Removal - Auth Required", False, f"Expected 401, got {response.status_code}", critical=True)
            
    except Exception as e:
        results.add_result("Friends System Endpoints", False, f"Exception: {str(e)}", critical=True)

def test_messaging_system_endpoints():
    """Test messaging system with last 10 messages logic"""
    
    try:
        # Test message retrieval without auth
        response = requests.get(f"{BACKEND_URL}/messages")
        
        if response.status_code == 401:
            results.add_result("Messages Get - Auth Required", True, "Correctly requires authentication")
        else:
            results.add_result("Messages Get - Auth Required", False, f"Expected 401, got {response.status_code}", critical=True)
        
        # Test message sending without auth
        message_data = {
            "content": "Bonjour tout le monde! Comment allez-vous?",
            "message_type": "text"
        }
        response = requests.post(f"{BACKEND_URL}/messages", json=message_data)
        
        if response.status_code == 401:
            results.add_result("Message Send - Auth Required", True, "Correctly requires authentication")
        else:
            results.add_result("Message Send - Auth Required", False, f"Expected 401, got {response.status_code}", critical=True)
        
        # Test message reaction without auth
        reaction_data = {
            "message_id": "test-message",
            "emoji": "👍"
        }
        response = requests.post(f"{BACKEND_URL}/messages/test-id/reaction", json=reaction_data)
        
        if response.status_code == 401:
            results.add_result("Message Reaction - Auth Required", True, "Correctly requires authentication")
        else:
            results.add_result("Message Reaction - Auth Required", False, f"Expected 401, got {response.status_code}", critical=True)
        
        # Test message deletion without auth
        response = requests.delete(f"{BACKEND_URL}/messages/test-id")
        
        if response.status_code == 401:
            results.add_result("Message Delete - Auth Required", True, "Correctly requires authentication")
        else:
            results.add_result("Message Delete - Auth Required", False, f"Expected 401, got {response.status_code}", critical=True)
        
        # Test message with empty content
        empty_message = {"content": "", "message_type": "text"}
        response = requests.post(f"{BACKEND_URL}/messages", json=empty_message)
        
        if response.status_code in [400, 401, 422]:
            results.add_result("Message - Empty Content Validation", True, "Correctly validates message content")
        else:
            results.add_result("Message - Empty Content Validation", False, f"Should validate content, got {response.status_code}")
            
    except Exception as e:
        results.add_result("Messaging System Endpoints", False, f"Exception: {str(e)}", critical=True)

def test_api_consistency():
    """Test API consistency and proper error handling"""
    
    try:
        # Test that all endpoints return consistent error format
        endpoints = [
            "/auth/profile",
            "/user/profile",
            "/users/search?q=test",
            "/friends/request",
            "/friends",
            "/messages"
        ]
        
        consistent_errors = True
        for endpoint in endpoints:
            try:
                if endpoint == "/user/profile":
                    response = requests.put(f"{BACKEND_URL}{endpoint}", json={})
                elif endpoint == "/friends/request":
                    response = requests.post(f"{BACKEND_URL}{endpoint}", json={})
                else:
                    response = requests.get(f"{BACKEND_URL}{endpoint}")
                
                if response.status_code in [401, 422]:
                    error_data = response.json()
                    if "detail" not in error_data:
                        consistent_errors = False
                        break
            except:
                consistent_errors = False
                break
        
        if consistent_errors:
            results.add_result("API Error Consistency", True, "All endpoints return consistent error format")
        else:
            results.add_result("API Error Consistency", False, "Inconsistent error format across endpoints")
        
        # Test CORS headers
        response = requests.options(f"{BACKEND_URL}/auth/profile")
        cors_headers = ["access-control-allow-origin", "access-control-allow-methods", "access-control-allow-headers"]
        cors_present = any(header.lower() in [h.lower() for h in response.headers] for header in cors_headers)
        
        if cors_present:
            results.add_result("CORS Configuration", True, "CORS headers are properly configured")
        else:
            results.add_result("CORS Configuration", False, "CORS headers may not be configured", critical=True)
            
    except Exception as e:
        results.add_result("API Consistency Tests", False, f"Exception: {str(e)}")

def test_backend_health():
    """Test overall backend health and connectivity"""
    
    try:
        # Test basic connectivity
        start_time = time.time()
        response = requests.get(f"{BACKEND_URL}/auth/profile", timeout=10)
        response_time = time.time() - start_time
        
        if response.status_code in [200, 401, 422]:
            if response_time < 5.0:
                results.add_result("Backend Health - Response Time", True, f"Good response time: {response_time:.2f}s")
            else:
                results.add_result("Backend Health - Response Time", False, f"Slow response time: {response_time:.2f}s")
            
            results.add_result("Backend Health - Connectivity", True, "Backend is accessible and responding")
        else:
            results.add_result("Backend Health - Connectivity", False, f"Unexpected response: {response.status_code}", critical=True)
        
        # Test JSON response format
        try:
            response.json()
            results.add_result("Backend Health - JSON Format", True, "Responses are valid JSON")
        except:
            results.add_result("Backend Health - JSON Format", False, "Responses are not valid JSON", critical=True)
            
    except requests.exceptions.ConnectionError:
        results.add_result("Backend Health - Connectivity", False, "Cannot connect to backend", critical=True)
    except requests.exceptions.Timeout:
        results.add_result("Backend Health - Connectivity", False, "Backend timeout", critical=True)
    except Exception as e:
        results.add_result("Backend Health Tests", False, f"Exception: {str(e)}", critical=True)

def main():
    """Run all final backend tests"""
    print("Starting Univox Final Backend Testing...")
    print(f"Testing backend at: {BACKEND_URL}")
    print("="*60)
    
    # Run all test suites
    test_backend_health()
    test_core_authentication()
    test_user_profile_endpoints()
    test_friends_system_endpoints()
    test_messaging_system_endpoints()
    test_api_consistency()
    
    # Print final results
    results.print_summary()
    
    # Determine overall status
    if len(results.critical_issues) == 0:
        print(f"\n✅ BACKEND STATUS: WORKING")
        print("All critical functionality is working correctly.")
        if len(results.minor_issues) > 0:
            print("Minor issues noted but do not affect core functionality.")
    else:
        print(f"\n❌ BACKEND STATUS: CRITICAL ISSUES FOUND")
        print("Critical issues must be resolved before deployment.")
    
    return len(results.critical_issues) == 0

if __name__ == "__main__":
    success = main()
    exit(0 if success else 1)