import requests

# Test the backend endpoints
base_url = "http://127.0.0.1:5000"

# Test root endpoint
try:
    response = requests.get(f"{base_url}/")
    print(f"Root endpoint: {response.status_code}")
    print(f"Response: {response.json()}")
except Exception as e:
    print(f"Root endpoint error: {e}")

print("\n" + "="*50 + "\n")

# Test /tests endpoint without auth (should get 401 or 403)
try:
    response = requests.get(f"{base_url}/tests")
    print(f"/tests endpoint (no auth): {response.status_code}")
    print(f"Response: {response.text[:200]}")
except Exception as e:
    print(f"/tests endpoint error: {e}")
