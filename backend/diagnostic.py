import urllib.request
import urllib.error
import json

def check_backend():
    url = "http://127.0.0.1:8000"
    print(f"Checking {url}...")
    try:
        with urllib.request.urlopen(url) as response:
            print(f"Root endpoint status: {response.getcode()}")
            print(f"Root endpoint content: {response.read().decode('utf-8')}")
    except urllib.error.URLError as e:
        print(f"Root endpoint failed: {e}")
        return

    print("\nChecking /folders (expect 401 without token)...")
    try:
        with urllib.request.urlopen(f"{url}/folders") as response:
            print(f"Folders endpoint status: {response.getcode()}")
            print(f"Folders endpoint content: {response.read().decode('utf-8')}")
    except urllib.error.HTTPError as e:
        print(f"Folders endpoint status: {e.code}")
        print(f"Folders endpoint content: {e.read().decode('utf-8')}")
    except urllib.error.URLError as e:
        print(f"Folders endpoint failed: {e}")

if __name__ == "__main__":
    check_backend()
