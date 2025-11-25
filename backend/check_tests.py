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
    response = supabase.table("tests").select("id, title", count="exact").execute()
    print(f"Total tests found: {len(response.data)}")
    if len(response.data) > 0:
        print("First 3 tests:")
        for t in response.data[:3]:
            print(f"- {t['title']} ({t['id']})")
except Exception as e:
    print(f"Error: {e}")
