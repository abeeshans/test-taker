import os
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from supabase import create_client, Client
from dotenv import load_dotenv

load_dotenv()
load_dotenv(".env.local", override=True)

url: str = os.environ.get("SUPABASE_URL")
key: str = os.environ.get("SUPABASE_KEY")

if not url or not key:
    raise ValueError("Supabase credentials not found in environment variables")

supabase: Client = create_client(url, key)
security = HTTPBearer()

def get_authenticated_client(credentials: HTTPAuthorizationCredentials = Depends(security)):
    token = credentials.credentials
    try:
        # Create a new client for this request
        client = create_client(url, key)
        # Set the JWT token for PostgREST (Database)
        client.postgrest.auth(token)
        
        # Set the JWT token for Storage
        # Supabase Python client storage implementation uses a separate session or headers
        # We try to update the headers of the storage client's session if possible, 
        # or we rely on the fact that we might need to pass headers to upload.
        # However, looking at the library, updating the global headers of the client might work.
        client.options.headers.update({"Authorization": f"Bearer {token}"})
        
        return client
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Failed to create authenticated client: {str(e)}",
            headers={"WWW-Authenticate": "Bearer"},
        )

def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    token = credentials.credentials
    try:
        user = supabase.auth.get_user(token)
        if not user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid authentication credentials",
                headers={"WWW-Authenticate": "Bearer"},
            )
        return user.user
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Authentication failed: {str(e)}",
            headers={"WWW-Authenticate": "Bearer"},
        )
