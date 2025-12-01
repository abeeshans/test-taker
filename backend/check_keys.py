import os
from dotenv import load_dotenv

load_dotenv("backend/.env.local")
load_dotenv("backend/.env")

service_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
anon_key = os.getenv("SUPABASE_KEY")

print(f"Service Role Key present: {bool(service_key)}")
print(f"Anon Key present: {bool(anon_key)}")
