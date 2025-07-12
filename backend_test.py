#!/usr/bin/env python3
"""
Comprehensive Backend Testing for Univox Messaging Application
Tests all backend APIs and functionality as specified in the review request.
"""

import requests
import json
import time
import uuid
from datetime import datetime

# Configuration
BACKEND_URL = "https://6e848df0-c71f-4c49-885d-2f03ec956bb8.preview.emergentagent.com/api"
TEST_SESSION_ID = None
TEST_USER_DATA = None

class TestResults:
    def __init__(self):
        self.results = []
        self.passed = 0
        self.failed = 0
    
    def add_result(self, test_name, passed, details=""):
        self.results.append({
            "test": test_name,
            "passed": passed,
            "details": details,
            "timestamp": datetime.now().isoformat()
        })
        if passed:
            self.passed += 1
        else:
            self.failed += 1
        
        status = "✅ PASS" if passed else "❌ FAIL"
        print(f"{status}: {test_name}")
        if details:
            print(f"   Details: {details}")
    
    def print_summary(self):
        print(f"\n{'='*60}")
        print(f"TEST SUMMARY")
        print(f"{'='*60}")
        print(f"Total Tests: {self.passed + self.failed}")
        print(f"Passed: {self.passed}")
        print(f"Failed: {self.failed}")
        print(f"Success Rate: {(self.passed/(self.passed + self.failed)*100):.1f}%")
        
        if self.failed > 0:
            print(f"\nFAILED TESTS:")
            for result in self.results:
                if not result["passed"]:
                    print(f"- {result['test']}: {result['details']}")

results = TestResults()

def test_auth_profile():
    """Test Emergent managed auth endpoint /api/auth/profile"""
    global TEST_SESSION_ID, TEST_USER_DATA
    
    try:
        # Test without session header (should trigger Emergent auth flow)
        response = requests.get(f"{BACKEND_URL}/auth/profile")
        
        if response.status_code == 401:
            results.add_result("Auth Profile - No Session Header", True, "Correctly returns 401 for missing session")
        else:
            results.add_result("Auth Profile - No Session Header", False, f"Expected 401, got {response.status_code}")
        
        # Test with invalid session
        headers = {"X-Session-ID": "invalid-session-123"}
        response = requests.get(f"{BACKEND_URL}/auth/profile", headers=headers)
        
        if response.status_code == 401:
            results.add_result("Auth Profile - Invalid Session", True, "Correctly returns 401 for invalid session")
        else:
            results.add_result("Auth Profile - Invalid Session", False, f"Expected 401, got {response.status_code}")
            
    except Exception as e:
        results.add_result("Auth Profile Tests", False, f"Exception: {str(e)}")

def test_user_profile_management():
    """Test profile updates at /api/user/profile"""
    
    try:
        # Test without session
        profile_data = {
            "username": "testuser",
            "email": "test@example.com",
            "name": "Test User",
            "bio": "Test bio",
            "age": 25,
            "country": "France",
            "interests": "coding, music"
        }
        
        response = requests.put(f"{BACKEND_URL}/user/profile", json=profile_data)
        
        if response.status_code == 401:
            results.add_result("Profile Update - No Auth", True, "Correctly requires authentication")
        else:
            results.add_result("Profile Update - No Auth", False, f"Expected 401, got {response.status_code}")
        
        # Test with invalid session
        headers = {"X-Session-ID": "invalid-session"}
        response = requests.put(f"{BACKEND_URL}/user/profile", json=profile_data, headers=headers)
        
        if response.status_code == 401:
            results.add_result("Profile Update - Invalid Session", True, "Correctly rejects invalid session")
        else:
            results.add_result("Profile Update - Invalid Session", False, f"Expected 401, got {response.status_code}")
            
    except Exception as e:
        results.add_result("User Profile Management", False, f"Exception: {str(e)}")

def test_user_search():
    """Test user search functionality at /api/users/search"""
    
    try:
        # Test without session
        response = requests.get(f"{BACKEND_URL}/users/search?q=test")
        
        if response.status_code == 401:
            results.add_result("User Search - No Auth", True, "Correctly requires authentication")
        else:
            results.add_result("User Search - No Auth", False, f"Expected 401, got {response.status_code}")
        
        # Test with invalid session
        headers = {"X-Session-ID": "invalid-session"}
        response = requests.get(f"{BACKEND_URL}/users/search?q=test", headers=headers)
        
        if response.status_code == 401:
            results.add_result("User Search - Invalid Session", True, "Correctly rejects invalid session")
        else:
            results.add_result("User Search - Invalid Session", False, f"Expected 401, got {response.status_code}")
            
    except Exception as e:
        results.add_result("User Search Tests", False, f"Exception: {str(e)}")

def test_friends_system():
    """Test friends system endpoints"""
    
    try:
        # Test friend request sending without auth
        friend_request = {"friend_id": str(uuid.uuid4())}
        response = requests.post(f"{BACKEND_URL}/friends/request", json=friend_request)
        
        if response.status_code == 401:
            results.add_result("Friend Request - No Auth", True, "Correctly requires authentication")
        else:
            results.add_result("Friend Request - No Auth", False, f"Expected 401, got {response.status_code}")
        
        # Test friend list retrieval without auth
        response = requests.get(f"{BACKEND_URL}/friends")
        
        if response.status_code == 401:
            results.add_result("Friends List - No Auth", True, "Correctly requires authentication")
        else:
            results.add_result("Friends List - No Auth", False, f"Expected 401, got {response.status_code}")
        
        # Test friend request response without auth
        response = requests.put(f"{BACKEND_URL}/friends/request/test-id?action=accept")
        
        if response.status_code == 401:
            results.add_result("Friend Request Response - No Auth", True, "Correctly requires authentication")
        else:
            results.add_result("Friend Request Response - No Auth", False, f"Expected 401, got {response.status_code}")
        
        # Test friend removal without auth
        response = requests.delete(f"{BACKEND_URL}/friends/test-id")
        
        if response.status_code == 401:
            results.add_result("Friend Removal - No Auth", True, "Correctly requires authentication")
        else:
            results.add_result("Friend Removal - No Auth", False, f"Expected 401, got {response.status_code}")
            
    except Exception as e:
        results.add_result("Friends System Tests", False, f"Exception: {str(e)}")

def test_messaging_system():
    """Test messaging system endpoints"""
    
    try:
        # Test message retrieval without auth
        response = requests.get(f"{BACKEND_URL}/messages")
        
        if response.status_code == 401:
            results.add_result("Messages Get - No Auth", True, "Correctly requires authentication")
        else:
            results.add_result("Messages Get - No Auth", False, f"Expected 401, got {response.status_code}")
        
        # Test message sending without auth
        message_data = {
            "content": "Hello world!",
            "message_type": "text"
        }
        response = requests.post(f"{BACKEND_URL}/messages", json=message_data)
        
        if response.status_code == 401:
            results.add_result("Message Send - No Auth", True, "Correctly requires authentication")
        else:
            results.add_result("Message Send - No Auth", False, f"Expected 401, got {response.status_code}")
        
        # Test message reaction without auth
        reaction_data = {
            "message_id": "test-message",
            "emoji": "👍"
        }
        response = requests.post(f"{BACKEND_URL}/messages/test-id/reaction", json=reaction_data)
        
        if response.status_code == 401:
            results.add_result("Message Reaction - No Auth", True, "Correctly requires authentication")
        else:
            results.add_result("Message Reaction - No Auth", False, f"Expected 401, got {response.status_code}")
        
        # Test message deletion without auth
        response = requests.delete(f"{BACKEND_URL}/messages/test-id")
        
        if response.status_code == 401:
            results.add_result("Message Delete - No Auth", True, "Correctly requires authentication")
        else:
            results.add_result("Message Delete - No Auth", False, f"Expected 401, got {response.status_code}")
            
    except Exception as e:
        results.add_result("Messaging System Tests", False, f"Exception: {str(e)}")

def test_api_structure():
    """Test that all required API endpoints exist and respond appropriately"""
    
    endpoints_to_test = [
        ("GET", "/auth/profile"),
        ("PUT", "/user/profile"),
        ("GET", "/users/search"),
        ("POST", "/friends/request"),
        ("PUT", "/friends/request/test-id"),
        ("GET", "/friends"),
        ("DELETE", "/friends/test-id"),
        ("GET", "/messages"),
        ("POST", "/messages"),
        ("POST", "/messages/test-id/reaction"),
        ("DELETE", "/messages/test-id")
    ]
    
    for method, endpoint in endpoints_to_test:
        try:
            if method == "GET":
                response = requests.get(f"{BACKEND_URL}{endpoint}")
            elif method == "POST":
                response = requests.post(f"{BACKEND_URL}{endpoint}", json={})
            elif method == "PUT":
                response = requests.put(f"{BACKEND_URL}{endpoint}", json={})
            elif method == "DELETE":
                response = requests.delete(f"{BACKEND_URL}{endpoint}")
            
            # We expect 401 (unauthorized) or 400 (bad request) for most endpoints without proper auth
            # 404 would indicate the endpoint doesn't exist
            if response.status_code != 404:
                results.add_result(f"Endpoint Exists - {method} {endpoint}", True, f"Status: {response.status_code}")
            else:
                results.add_result(f"Endpoint Exists - {method} {endpoint}", False, "Endpoint not found (404)")
                
        except Exception as e:
            results.add_result(f"Endpoint Test - {method} {endpoint}", False, f"Exception: {str(e)}")

def test_error_handling():
    """Test error handling for various scenarios"""
    
    try:
        # Test malformed JSON
        response = requests.post(f"{BACKEND_URL}/messages", data="invalid json")
        
        if response.status_code in [400, 422]:
            results.add_result("Error Handling - Malformed JSON", True, f"Correctly handles malformed JSON with status {response.status_code}")
        else:
            results.add_result("Error Handling - Malformed JSON", False, f"Unexpected status code: {response.status_code}")
        
        # Test missing required fields
        response = requests.post(f"{BACKEND_URL}/friends/request", json={})
        
        if response.status_code in [400, 401, 422]:
            results.add_result("Error Handling - Missing Fields", True, f"Correctly handles missing fields with status {response.status_code}")
        else:
            results.add_result("Error Handling - Missing Fields", False, f"Unexpected status code: {response.status_code}")
            
    except Exception as e:
        results.add_result("Error Handling Tests", False, f"Exception: {str(e)}")

def test_backend_connectivity():
    """Test basic backend connectivity"""
    
    try:
        # Test if backend is reachable
        response = requests.get(f"{BACKEND_URL}/auth/profile", timeout=10)
        
        if response.status_code in [200, 401, 422]:
            results.add_result("Backend Connectivity", True, f"Backend is reachable (status: {response.status_code})")
        else:
            results.add_result("Backend Connectivity", False, f"Unexpected response: {response.status_code}")
            
    except requests.exceptions.ConnectionError:
        results.add_result("Backend Connectivity", False, "Cannot connect to backend server")
    except requests.exceptions.Timeout:
        results.add_result("Backend Connectivity", False, "Backend request timed out")
    except Exception as e:
        results.add_result("Backend Connectivity", False, f"Exception: {str(e)}")

def main():
    """Run all backend tests"""
    print("Starting Univox Backend Testing...")
    print(f"Testing backend at: {BACKEND_URL}")
    print("="*60)
    
    # Run all test suites
    test_backend_connectivity()
    test_api_structure()
    test_auth_profile()
    test_user_profile_management()
    test_user_search()
    test_friends_system()
    test_messaging_system()
    test_error_handling()
    
    # Print final results
    results.print_summary()
    
    return results.failed == 0

if __name__ == "__main__":
    success = main()
    exit(0 if success else 1)