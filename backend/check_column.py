import os
from supabase import create_client
from dotenv import load_dotenv

load_dotenv()
load_dotenv(".env.local", override=True)

url = os.environ.get("SUPABASE_URL")
key = os.environ.get("SUPABASE_KEY")

if not url or not key:
    print("Supabase credentials not found")
    exit(1)

supabase = create_client(url, key)

try:
    # Try to select the column
    response = supabase.table("test_attempts").select("is_reset").limit(1).execute()
    print("Column exists")
except Exception as e:
    print(f"Error: {e}")
