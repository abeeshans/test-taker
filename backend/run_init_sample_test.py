import os
from supabase import create_client
from dotenv import load_dotenv

# Load environment variables
load_dotenv()
load_dotenv(".env.local", override=True)

url = os.environ.get("SUPABASE_URL")
key = os.environ.get("SUPABASE_KEY")

if not url or not key:
    print("❌ Supabase credentials not found")
    exit(1)

supabase = create_client(url, key)

# Read the SQL migration file
with open("init_sample_test.sql", "r") as f:
    sql = f.read()

print("🚀 Running migration: init_sample_test.sql")
print("=" * 50)

try:
    # Execute the SQL via RPC
    # Note: Supabase Python client doesn't support raw SQL directly
    # We need to use the SQL Editor in Supabase Dashboard or use psycopg2
    
    print("\n⚠️  This migration needs to be run via Supabase Dashboard:")
    print("\n1. Go to: https://kgyvwxkkhyuehdesthcv.supabase.co/project/_/sql")
    print("2. Create a new query")
    print("3. Paste the contents of 'init_sample_test.sql'")
    print("4. Click 'Run'")
    print("\nThe SQL file has been created at:")
    print(f"   {os.path.abspath('init_sample_test.sql')}")
    print("\n✅ After running the migration, all new users will automatically get the Sample Test!")
    
except Exception as e:
    print(f"❌ Error: {e}")
