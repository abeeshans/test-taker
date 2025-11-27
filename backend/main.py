from fastapi import FastAPI, Depends, HTTPException, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional, Dict
import json
import uuid
from datetime import datetime
from auth import get_current_user, get_authenticated_client, supabase

app = FastAPI()

import os

# CORS configuration
# Explicitly allow localhost origins (required for credentials)
origins = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "http://localhost:3001",
    "http://127.0.0.1:3001",
    "https://frontend-351771281344.us-central1.run.app",
]

# Add production frontend URL if set
frontend_url = os.getenv("FRONTEND_URL")
if frontend_url:
    origins.append(frontend_url)

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- Pydantic Models ---

class Folder(BaseModel):
    id: str
    name: str
    parent_id: Optional[str] = None
    created_at: str
    test_count: int = 0
    folder_count: int = 0
    avg_score: Optional[int] = None

class FolderCreate(BaseModel):
    name: str
    parent_id: Optional[str] = None

class FolderUpdate(BaseModel):
    name: Optional[str] = None
    parent_id: Optional[str] = None

class Test(BaseModel):
    id: str
    title: str
    created_at: str
    folder_id: Optional[str] = None
    is_starred: bool = False
    last_accessed: Optional[str] = None
    question_count: int = 0
    set_count: int = 0
    attempt_count: int = 0
    avg_score: Optional[int] = None
    best_score: Optional[int] = None
    last_score: Optional[int] = None
    question_range: Optional[str] = None

class TestDetail(Test):
    content: dict

class TestUpdate(BaseModel):
    title: Optional[str] = None
    folder_id: Optional[str] = None
    is_starred: Optional[bool] = None
    last_accessed: Optional[str] = None

class TestAttemptCreate(BaseModel):
    test_id: str
    score: int
    total_questions: int
    time_taken: int
    set_name: Optional[str] = None
    details: Optional[List[dict]] = None

class TestAttempt(TestAttemptCreate):
    id: str
    completed_at: str
    test_title: Optional[str] = None
    is_reset: bool = False

# --- Endpoints ---

@app.get("/")
def read_root():
    return {"message": "Test Taker API"}

# --- Folders ---

@app.get("/folders", response_model=List[Folder])
def get_folders(user=Depends(get_current_user), client=Depends(get_authenticated_client)):
    # Fetch all folders
    folders_resp = client.table("folders").select("*").order("name").execute()
    folders_data = folders_resp.data
    
    # Fetch all tests (lightweight)
    tests_resp = client.table("tests").select("id, folder_id").execute()
    tests_data = tests_resp.data
    
    # Fetch all attempts for stats
    attempts_resp = client.table("test_attempts").select("test_id, score, total_questions, is_reset").execute()
    attempts_data = attempts_resp.data
    
    # Pre-calculate test stats
    test_stats = {} # test_id -> avg_score
    attempts_by_test = {}
    for a in attempts_data:
        if a['test_id'] not in attempts_by_test:
            attempts_by_test[a['test_id']] = []
        attempts_by_test[a['test_id']].append(a)
        
    for t in tests_data:
        t_attempts = attempts_by_test.get(t['id'], [])
        if t_attempts:
            percentages = []
            for a in t_attempts:
                if a.get('is_reset', False): continue
                if a['total_questions'] > 0:
                    percentages.append((a['score'] / a['total_questions']) * 100)
                else:
                    percentages.append(0)
            if percentages:
                test_stats[t['id']] = sum(percentages) / len(percentages)
            else:
                test_stats[t['id']] = None
        else:
            test_stats[t['id']] = None

    # Build trees
    folder_map = {f['id']: f for f in folders_data}
    children_map = {f['id']: [] for f in folders_data} # folder_id -> list of child folder_ids
    tests_in_folder = {f['id']: [] for f in folders_data} # folder_id -> list of test_ids
    
    for f in folders_data:
        f['test_count'] = 0
        f['folder_count'] = 0
        f['avg_score'] = None
        if f['parent_id'] and f['parent_id'] in children_map:
            children_map[f['parent_id']].append(f['id'])
            
    for t in tests_data:
        if t['folder_id'] and t['folder_id'] in tests_in_folder:
            tests_in_folder[t['folder_id']].append(t['id'])

    # Recursive stats calculation
    def calculate_stats(folder_id):
        folder = folder_map[folder_id]
        
        # Immediate tests
        my_test_ids = tests_in_folder[folder_id]
        total_tests = len(my_test_ids)
        
        # Immediate subfolders
        my_child_ids = children_map[folder_id]
        total_folders = len(my_child_ids)
        
        # Collect scores
        my_scores = []
        for tid in my_test_ids:
            if test_stats.get(tid) is not None:
                my_scores.append(test_stats[tid])
        
        # Recurse
        for child_id in my_child_ids:
            child_stats = calculate_stats(child_id)
            total_tests += child_stats['test_count']
            total_folders += child_stats['folder_count']
            my_scores.extend(child_stats['scores'])
            
        # Update folder
        folder['test_count'] = total_tests
        folder['folder_count'] = total_folders
        if my_scores:
            folder['avg_score'] = round(sum(my_scores) / len(my_scores))
        else:
            folder['avg_score'] = None
            
        return {
            'test_count': total_tests,
            'folder_count': total_folders,
            'scores': my_scores
        }

    # Memoized calculation
    memo = {}
    def get_stats_memo(fid):
        if fid in memo: return memo[fid]
        stats = calculate_stats(fid)
        memo[fid] = stats
        return stats
    
    # Process all folders
    stats_cache = {}
    def calculate_stats_cached(fid):
        if fid in stats_cache: return stats_cache[fid]
        
        folder = folder_map[fid]
        my_test_ids = tests_in_folder[fid]
        total_tests = len(my_test_ids)
        my_child_ids = children_map[fid]
        total_folders = len(my_child_ids)
        my_scores = []
        for tid in my_test_ids:
            if test_stats.get(tid) is not None:
                my_scores.append(test_stats[tid])
                
        for child_id in my_child_ids:
            child_stats = calculate_stats_cached(child_id)
            total_tests += child_stats['test_count']
            total_folders += child_stats['folder_count']
            my_scores.extend(child_stats['scores'])
            
        folder['test_count'] = total_tests
        folder['folder_count'] = total_folders
        if my_scores:
            folder['avg_score'] = round(sum(my_scores) / len(my_scores))
        else:
            folder['avg_score'] = None
            
        res = {
            'test_count': total_tests,
            'folder_count': total_folders,
            'scores': my_scores
        }
        stats_cache[fid] = res
        return res

    for f in folders_data:
        calculate_stats_cached(f['id'])

    return folders_data

@app.post("/folders", response_model=Folder)
def create_folder(folder: FolderCreate, user=Depends(get_current_user), client=Depends(get_authenticated_client)):
    data = {
        "user_id": user.id,
        "name": folder.name,
        "parent_id": folder.parent_id
    }
    response = client.table("folders").insert(data).execute()
    return response.data[0]

@app.patch("/folders/{folder_id}", response_model=Folder)
def update_folder(folder_id: str, folder: FolderUpdate, user=Depends(get_current_user), client=Depends(get_authenticated_client)):
    data = {k: v for k, v in folder.dict(exclude_unset=True).items()}
    if not data:
        raise HTTPException(status_code=400, detail="No fields to update")
    
    response = client.table("folders").update(data).eq("id", folder_id).execute()
    if not response.data:
         raise HTTPException(status_code=404, detail="Folder not found")
    return response.data[0]

@app.delete("/folders/{folder_id}")
def delete_folder(folder_id: str, move_contents: bool = False, user=Depends(get_current_user), client=Depends(get_authenticated_client)):
    # Get the folder to be deleted to find its parent
    folder_resp = client.table("folders").select("parent_id").eq("id", folder_id).execute()
    if not folder_resp.data:
        raise HTTPException(status_code=404, detail="Folder not found")
    
    parent_id = folder_resp.data[0]['parent_id']
    
    if move_contents:
        # Move subfolders to parent
        client.table("folders").update({"parent_id": parent_id}).eq("parent_id", folder_id).execute()
        
        # Move tests to parent
        client.table("tests").update({"folder_id": parent_id}).eq("folder_id", folder_id).execute()

    # Delete the folder
    # If move_contents is False, ON DELETE CASCADE will handle deleting contents
    response = client.table("folders").delete().eq("id", folder_id).execute()
    return {"message": "Folder deleted"}

@app.post("/tests/{test_id}/reset_stats")
def reset_test_stats(test_id: str, user=Depends(get_current_user), client=Depends(get_authenticated_client)):
    # Soft reset: Mark all attempts as reset and clear review content
    client.table("test_attempts").update({"is_reset": True, "details": None}).eq("test_id", test_id).execute()
    return {"message": "Stats reset successfully"}

@app.get("/tests", response_model=List[Dict])
def get_tests(user=Depends(get_current_user), client=Depends(get_authenticated_client)):
    # Fetch tests with content to extract set titles
    response = client.table("tests").select("id, title, created_at, folder_id, is_starred, last_accessed, question_count, set_count, question_range, content").eq("user_id", user.id).execute()
    tests_data = response.data
    
    # Fetch all attempts for stats
    attempts_resp = client.table("test_attempts").select("test_id, score, total_questions, is_reset").execute()
    attempts_data = attempts_resp.data
    
    # Pre-calculate test stats
    test_stats = {} # test_id -> avg_score
    attempts_by_test = {}
    for a in attempts_data:
        if a['test_id'] not in attempts_by_test:
            attempts_by_test[a['test_id']] = []
        attempts_by_test[a['test_id']].append(a)
        
    for t in tests_data:
        # Extract set titles
        if t.get('content') and 'sets' in t['content']:
            t['sets'] = [{'title': s.get('title', f'Set {i+1}')} for i, s in enumerate(t['content']['sets'])]
        else:
            t['sets'] = []
        
        # Remove content to reduce payload size
        if 'content' in t:
            del t['content']

        t_attempts = attempts_by_test.get(t['id'], [])
        # Count non-reset attempts
        non_reset_attempts = [a for a in t_attempts if not a.get('is_reset', False)]
        t['attempt_count'] = len(non_reset_attempts)
        
        if non_reset_attempts:
            percentages = []
            for a in non_reset_attempts:
                if a['total_questions'] > 0:
                    percentages.append((a['score'] / a['total_questions']) * 100)
                else:
                    percentages.append(0)
            if percentages:
                t['avg_score'] = round(sum(percentages) / len(percentages))
                t['best_score'] = round(max(percentages))
                t['last_score'] = round(percentages[0])
            else:
                t['avg_score'] = None
                t['best_score'] = None
                t['last_score'] = None
        else:
            t['attempt_count'] = 0
            t['avg_score'] = None
            t['best_score'] = None
            t['last_score'] = None
            
    return tests_data

@app.get("/tests/{test_id}", response_model=TestDetail)
def get_test(test_id: str, user=Depends(get_current_user), client=Depends(get_authenticated_client)):
    response = client.table("tests").select("*").eq("id", test_id).execute()
    if not response.data:
        raise HTTPException(status_code=404, detail="Test not found")
    
    # Update last_accessed
    client.table("tests").update({"last_accessed": datetime.now().isoformat()}).eq("id", test_id).execute()
    
    test = response.data[0]
    
    # Calculate stats for this single test
    attempts_response = client.table("test_attempts").select("*").eq("test_id", test_id).order("completed_at", desc=True).execute()
    attempts = attempts_response.data
    
    test['attempt_count'] = len([a for a in attempts if not a.get('is_reset', False)])
    if attempts:
        percentages = [round((a['score'] / a['total_questions']) * 100) for a in attempts if a['total_questions'] > 0 and not a.get('is_reset', False)]
        if percentages:
            test['avg_score'] = round(sum(percentages) / len(percentages))
            test['best_score'] = max(percentages)
            test['last_score'] = percentages[0] # First one is latest due to desc order
    
    return test

@app.patch("/tests/{test_id}", response_model=Test)
def update_test(test_id: str, test: TestUpdate, user=Depends(get_current_user), client=Depends(get_authenticated_client)):
    data = {k: v for k, v in test.dict(exclude_unset=True).items()}
    if not data:
        raise HTTPException(status_code=400, detail="No fields to update")
        
    response = client.table("tests").update(data).eq("id", test_id).execute()
    if not response.data:
        raise HTTPException(status_code=404, detail="Test not found")
    return response.data[0]

@app.delete("/tests/{test_id}")
def delete_test(test_id: str, user=Depends(get_current_user), client=Depends(get_authenticated_client)):
    response = client.table("tests").delete().eq("id", test_id).execute()
    return {"message": "Test deleted"}

@app.post("/upload")
async def upload_files(files: List[UploadFile] = File(...), folder_id: Optional[str] = Form(None), user=Depends(get_current_user), client=Depends(get_authenticated_client)):
    user_id = user.id
    results = []
    
    for file in files:
        content = await file.read()
        
        if file.filename.endswith(".json"):
            try:
                json_content = json.loads(content)
                title = file.filename.replace(".json", "")
                
                # Extract ID if present
                test_id = json_content.get('id')
                
                # Calculate stats
                sets = json_content.get('sets', [])
                set_count = len(sets)
                question_counts = [len(s.get('questions', [])) for s in sets]
                total_questions = sum(question_counts)
                
                question_range = None
                if set_count > 1:
                    min_q = min(question_counts) if question_counts else 0
                    max_q = max(question_counts) if question_counts else 0
                    if min_q != max_q:
                        question_range = f"{min_q}-{max_q}"
                    else:
                        question_range = f"{min_q}"
                
                data = {
                    "user_id": user_id,
                    "title": title,
                    "content": json_content,
                    "folder_id": folder_id if folder_id and folder_id != "null" else None,
                    "question_count": total_questions,
                    "set_count": set_count,
                    "question_range": question_range
                }
                
                # Check if test with this ID exists
                existing_test = None
                if test_id:
                    # Check if valid UUID
                    try:
                        uuid_obj = uuid.UUID(test_id)
                        # Check DB
                        resp = client.table("tests").select("id").eq("id", test_id).eq("user_id", user_id).execute()
                        if resp.data:
                            existing_test = resp.data[0]
                    except ValueError:
                        # Invalid UUID, ignore ID and treat as new (or maybe error? Let's treat as new but warn?)
                        # For now, let's just ignore invalid ID and generate new one
                        pass

                if existing_test:
                    # Update existing test
                    # Don't update folder_id on re-upload unless explicitly requested? 
                    # Requirement says "reupload an editted version... without it being read as a new test card"
                    # Usually we want to keep it in the same folder it was.
                    # So let's NOT update folder_id if it's an update, unless we want to move it.
                    # But the user might be uploading from the dashboard root or a specific folder.
                    # If they are in a specific folder, maybe they want to move it there?
                    # Let's assume we update content and title, but keep folder unless specified?
                    # Actually, if I upload a file, I expect it to go where I am.
                    # But if it's an update, maybe it should stay where it is?
                    # Let's update the content and title.
                    # Let's keep the folder_id as is, unless we want to force move.
                    # For now, let's only update title, content, stats.
                    update_data = {
                        "title": title,
                        "content": json_content,
                        "question_count": total_questions,
                        "set_count": set_count,
                        "question_range": question_range
                    }
                    # If the user is in a specific folder, maybe we should move it there?
                    # Let's stick to updating content for now.
                    
                    client.table("tests").update(update_data).eq("id", test_id).execute()
                    results.append({"filename": file.filename, "status": "updated", "id": test_id})
                else:
                    # Insert new test
                    if test_id:
                         data['id'] = test_id # Use the ID from JSON
                    
                    response = client.table("tests").insert(data).execute()
                    results.append({"filename": file.filename, "status": "created", "id": response.data[0]['id']})

            except json.JSONDecodeError:
                results.append({"filename": file.filename, "status": "error", "detail": "Invalid JSON"})
            except Exception as e:
                results.append({"filename": file.filename, "status": "error", "detail": str(e)})
        
        elif file.filename.endswith(".pdf"):
            file_path = f"{user_id}/{file.filename}"
            try:
                response = client.storage.from_("pdfs").upload(file_path, content, {"content-type": "application/pdf"})
                results.append({"filename": file.filename, "status": "success", "path": file_path})
            except Exception as e:
                 results.append({"filename": file.filename, "status": "error", "detail": str(e)})
        
        else:
            results.append({"filename": file.filename, "status": "error", "detail": "Unsupported file type"})
            
    return {"results": results}

# --- Stats ---

@app.post("/attempts", response_model=TestAttempt)
def record_attempt(attempt: TestAttemptCreate, user=Depends(get_current_user), client=Depends(get_authenticated_client)):
    data = {
        "user_id": user.id,
        "test_id": attempt.test_id,
        "score": attempt.score,
        "total_questions": attempt.total_questions,
        "time_taken": attempt.time_taken,
        "set_name": attempt.set_name,
        "details": attempt.details
    }
    response = client.table("test_attempts").insert(data).execute()
    return response.data[0]

@app.get("/attempts", response_model=List[TestAttempt])
def get_attempts(test_id: Optional[str] = None, user=Depends(get_current_user), client=Depends(get_authenticated_client)):
    query = client.table("test_attempts").select("*").eq("user_id", user.id)
    if test_id:
        query = query.eq("test_id", test_id)
    
    response = query.order("completed_at", desc=True).execute()
    attempts = response.data
    
    if not attempts:
        return []

    # Fetch test titles in one query
    test_ids = list(set(a['test_id'] for a in attempts))
    if test_ids:
        tests_resp = client.table("tests").select("id, title").in_("id", test_ids).execute()
        test_map = {t['id']: t['title'] for t in tests_resp.data}
        for a in attempts:
            a['test_title'] = test_map.get(a['test_id'])
            
    return attempts

@app.get("/attempts/{attempt_id}", response_model=TestAttempt)
def get_attempt(attempt_id: str, user=Depends(get_current_user), client=Depends(get_authenticated_client)):
    """Fetch a single attempt by its ID"""
    response = client.table("test_attempts").select("*").eq("id", attempt_id).eq("user_id", user.id).execute()
    
    if not response.data or len(response.data) == 0:
        raise HTTPException(status_code=404, detail="Attempt not found")
    
    attempt = response.data[0]
    
    # Fetch test title
    test_resp = client.table("tests").select("id, title").eq("id", attempt['test_id']).execute()
    if test_resp.data:
        attempt['test_title'] = test_resp.data[0]['title']
    
    return attempt
