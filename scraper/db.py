import os
from supabase import create_client, Client
from dotenv import load_dotenv

# Load environment variables from .env file (for local testing)
load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_SERVICE_KEY = os.getenv("SUPABASE_SERVICE_KEY")

def get_supabase_client() -> Client:
    """
    Initializes and returns the Supabase client using the Service Role Key.
    The Service Role Key is required to bypass RLS policies and insert data.
    """
    if not SUPABASE_URL or not SUPABASE_SERVICE_KEY:
        raise ValueError("Supabase URL and Service Key must be set in environment variables.")
    
    return create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)

def upsert_scholarship(client: Client, data: dict):
    """
    Upserts a scholarship record into the 'scholarships' table.
    Expects data to contain a unique 'source_url' to prevent duplicates.
    """
    # Assuming 'source_url' has a unique constraint in your Supabase table.
    # If not, Supabase will just insert it. In a real production system, 
    # you'd want to add a UNIQUE constraint to source_url.
    try:
        response = client.table("scholarships").upsert(
            data, 
            on_conflict="source_url" # This requires a unique constraint on source_url
        ).execute()
        return response
    except Exception as e:
        print(f"Error inserting {data.get('title')}: {str(e)}")
        # Fallback if no unique constraint exists: just do a regular insert
        # try:
        #     client.table("scholarships").insert(data).execute()
        # except Exception as inner_e:
        #     print(f"Fallback insert failed: {str(inner_e)}")
        return None
