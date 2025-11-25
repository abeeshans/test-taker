import os
from supabase import create_client
from dotenv import load_dotenv
import json

load_dotenv()
load_dotenv(".env.local", override=True)

url = os.environ.get("SUPABASE_URL")
key = os.environ.get("SUPABASE_KEY")

if not url or not key:
    print("Supabase credentials not found")
    exit(1)

supabase = create_client(url, key)

try:
    # Fetch attempts
    response = supabase.table("test_attempts").select("*").limit(5).execute()
    attempts = response.data
    
    print(f"Found {len(attempts)} attempts.")
    for a in attempts:
        print(f"ID: {a.get('id')}, Test ID: {a.get('test_id')}, is_reset: {a.get('is_reset')}")

    # Check if ANY attempt has is_reset = True
    reset_response = supabase.table("test_attempts").select("*").eq("is_reset", True).execute()
    print(f"\nTotal reset attempts found: {len(reset_response.data)}")

except Exception as e:
    print(f"Error: {e}")
