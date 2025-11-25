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
    response = supabase.table("folders").select("id, name", count="exact").execute()
    print(f"Total folders found: {len(response.data)}")
    if len(response.data) > 0:
        print("First 3 folders:")
        for f in response.data[:3]:
            print(f"- {f['name']} ({f['id']})")
except Exception as e:
    print(f"Error: {e}")
