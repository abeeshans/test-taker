from auth import supabase
import sys

try:
    print("Checking 'test_attempts' table for 'is_reset' column...")
    response = supabase.table("test_attempts").select("is_reset").limit(1).execute()
    print("Column 'is_reset' exists.")
    print(f"Sample data: {response.data}")
except Exception as e:
    print(f"Error: {e}")
