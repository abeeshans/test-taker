import os
from dotenv import load_dotenv

# Load from .env.local first, then .env
load_dotenv("backend/.env.local")
load_dotenv("backend/.env")

url = os.getenv("SUPABASE_URL")
key = os.getenv("SUPABASE_SERVICE_ROLE_KEY") or os.getenv("SUPABASE_KEY")

print(f"SUPABASE_URL found: {bool(url)}")
print(f"SUPABASE_KEY found: {bool(key)}")
