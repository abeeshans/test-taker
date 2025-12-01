import os
import google.generativeai as genai
from typing import List, Dict, Optional
import json
import time

class GeminiClient:
    def __init__(self):
        api_key = os.getenv("GEMINI_API_KEY")
        if not api_key:
            raise ValueError("GEMINI_API_KEY not found in environment variables")
        genai.configure(api_key=api_key)
        self.model = genai.GenerativeModel('gemini-2.5-flash-preview-09-2025')

    def upload_file(self, file_path: str, mime_type: str):
        """Uploads a file to Gemini."""
        print(f"Uploading file: {file_path}")
        file = genai.upload_file(file_path, mime_type=mime_type)
        print(f"Completed upload: {file.uri}")
        return file

    def wait_for_files_active(self, files):
        """Waits for the given files to be active."""
        print("Waiting for file processing...")
        for name in (file.name for file in files):
            file = genai.get_file(name)
            while file.state.name == "PROCESSING":
                print(".", end="", flush=True)
                time.sleep(2)
                file = genai.get_file(name)
            if file.state.name != "ACTIVE":
                raise Exception(f"File {file.name} failed to process")
        print("...all files ready")

    def generate_questions(self, file_path: str, mime_type: str, num_questions: int, difficulty: str) -> List[Dict]:
        """
        Generates questions from a file using Gemini.
        
        Args:
            file_path: Path to the local file.
            mime_type: Mime type of the file (e.g., 'application/pdf').
            num_questions: Number of questions to generate.
            difficulty: Difficulty level ('Simple', 'Average', 'Challenging').
            
        Returns:
            A list of dictionaries representing the questions.
        """
        
        # Upload the file
        uploaded_file = self.upload_file(file_path, mime_type)
        
        # Wait for processing
        self.wait_for_files_active([uploaded_file])
        
        # Construct the prompt
        prompt = f"""
        You are an expert teacher and test creator. The questions you create should only have relevance to the content of the file (no questions about the structure of the curriculum/notes/lecture, or anything unrelated). If the question references an image/page in the file, you must include a note in the passage that tells the user to refer to the image on the file. Below that include the pixel coordinates of the image to be referenced on the page, so that it can be used to crop using PIL. 
        IMPORTANT: Provide coordinates on a normalized 0-1000 scale, where (0,0) is top-left and (1000,1000) is bottom-right.
        Format: [E.g. Refer to the diagram on Page X of '{os.path.basename(file_path)}'.<br> (100, 200, 300, 400)]
        Create a JSON test based on the attached file.
        
        Requirements:
        1. Generate exactly {num_questions} questions.
        2. Difficulty level: {difficulty}.
        3. The output must be a valid JSON object with a "sets" key, containing a single set.
        4. The set should have a "questions" array.
        5. Each question object must have:
           - "id": a unique string ID (use uuid format or simple counter).
           - "question": the question text.
           - "options": an array of 4 strings.
           - "correctAnswer": the exact string of the correct option (must match one of the options).
           - "explanation": a brief explanation of the answer.

        Example JSON Structure:
        {{
            "sets": [
                {{
                    "questions": [
                        {{
                            "passage": "This question does not have a passage.",
                            "question": "Sample question?",
                            "options":[ 
                                "A. Option A",
                                 "B. Option B", 
                                 "C. Option C", 
                                 "D. Option D"
                            ],
                            "correctAnswer": "A. Option A",
                            "explanation": "Explanation here."
                        }}
                    ]
                }}
            ]
        }}
        
        Output ONLY the raw JSON string, no markdown formatting.
        """
        
        try:
            response = self.model.generate_content([uploaded_file, prompt])
            
            # Clean up the response text (remove markdown code blocks if present)
            text = response.text
            if text.startswith("```json"):
                text = text[7:]
            if text.endswith("```"):
                text = text[:-3]
            text = text.strip()
            
            data = json.loads(text)
            
            # Extract questions from the response structure
            # Extract questions from the response structure
            if isinstance(data, list):
                # If it's a list, assume it's the list of questions or sets
                if len(data) > 0 and "questions" in data[0]:
                     # List of sets?
                     questions = data[0]["questions"]
                else:
                    questions = data
            elif "sets" in data and len(data["sets"]) > 0:
                questions = data["sets"][0].get("questions", [])
            elif "questions" in data:
                 questions = data["questions"]
            else:
                print("Unexpected JSON structure:", data.keys())
                questions = []
            
            # Process images in questions
            if questions and file_path.lower().endswith('.pdf'):
                questions = self.process_images_in_questions(questions, file_path)
                
            return questions
                
        except Exception as e:
            print(f"Error generating questions: {e}")
            raise e
        finally:
            # Cleanup: delete the file from Gemini to save space/privacy
            try:
                genai.delete_file(uploaded_file.name)
            except Exception as cleanup_error:
                print(f"Failed to delete file {uploaded_file.name}: {cleanup_error}")

    def process_images_in_questions(self, questions: List[Dict], pdf_path: str) -> List[Dict]:
        """
        Scans questions for image coordinates, crops them from the PDF, 
        uploads to Supabase, and replaces text with image tags.
        """
        import fitz  # PyMuPDF
        import re
        from supabase import create_client
        
        # Initialize Supabase client for storage upload
        supabase_url = os.getenv("SUPABASE_URL")
        supabase_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY") or os.getenv("SUPABASE_KEY")
        
        if not supabase_url:
            print("CRITICAL: SUPABASE_URL is missing. Cannot upload images.")
            return questions
            
        if not supabase_key:
            print("CRITICAL: SUPABASE_SERVICE_ROLE_KEY and SUPABASE_KEY are missing. Cannot upload images.")
            return questions
            
        if not os.getenv("SUPABASE_SERVICE_ROLE_KEY"):
            print("WARNING: SUPABASE_SERVICE_ROLE_KEY is missing. Using SUPABASE_KEY. Image upload might fail due to RLS policies.")

        try:
            supabase = create_client(supabase_url, supabase_key)
        except Exception as e:
            print(f"CRITICAL: Failed to initialize Supabase client: {e}")
            return questions
        
        # Regex to find coordinates: (x1, y1, x2, y2)
        # and potentially page number: Page X
        # Example: Refer to the diagram on Page 10... (100, 200, 300, 400)
        coord_pattern = re.compile(r'\((\d+),\s*(\d+),\s*(\d+),\s*(\d+)\)')
        page_pattern = re.compile(r'Page\s+(\d+)', re.IGNORECASE)
        
        doc = fitz.open(pdf_path)
        
        for q in questions:
            # Check passage and question text
            for field in ['passage', 'question']:
                if field not in q or not isinstance(q[field], str):
                    continue
                    
                text = q[field]
                print(f"Checking {field} for coordinates: {text[:50]}...") # Log start of text
                coords_match = coord_pattern.search(text)
                
                if coords_match:
                    print(f"Found coordinates: {coords_match.group(0)}")
                    try:
                        # Extract coordinates
                        x1, y1, x2, y2 = map(int, coords_match.groups())
                        
                        # Extract page number (default to 0 if not found, though prompt asks for it)
                        # Search in the same text
                        page_match = page_pattern.search(text)
                        page_num = int(page_match.group(1)) - 1 if page_match else 0 # 0-indexed
                        print(f"Page number: {page_num + 1} (Index: {page_num})")
                        
                        if page_num < 0 or page_num >= len(doc):
                            print(f"Invalid page number {page_num} for file {pdf_path}")
                            continue

                        # Crop and upload
                        page = doc.load_page(page_num)
                        
                        # Scale coordinates from 0-1000 to actual page dimensions
                        width = page.rect.width
                        height = page.rect.height
                        
                        # x1, y1, x2, y2 are in 0-1000 scale
                        # Convert to actual points
                        rx1 = (x1 / 1000) * width
                        ry1 = (y1 / 1000) * height
                        rx2 = (x2 / 1000) * width
                        ry2 = (y2 / 1000) * height
                        
                        rect = fitz.Rect(rx1, ry1, rx2, ry2)
                        
                        # Render the cropped area to a pixmap
                        pix = page.get_pixmap(clip=rect)
                        img_data = pix.tobytes("png")
                        
                        # Generate unique filename
                        filename = f"crop_{int(time.time())}_{x1}_{y1}.png"
                        storage_path = f"generated/{filename}"
                        
                        print(f"Uploading to {storage_path}...")
                        # Upload to Supabase
                        res = supabase.storage.from_("question-images").upload(
                            storage_path, 
                            img_data, 
                            {"content-type": "image/png"}
                        )
                        print(f"Upload result: {res}")
                        
                        # Get Public URL
                        public_url = supabase.storage.from_("question-images").get_public_url(storage_path)
                        print(f"Public URL: {public_url}")
                        
                        # Replace the coordinate text with image tag
                        # We replace the whole match (coords) with the image
                        # And maybe the "Refer to..." text? 
                        # The user said: "modify the passage to replace the coordinates with the link"
                        # E.g. <img src='IMG_LINK_HERE' ...>
                        
                        img_tag = f"<img src='{public_url}' alt='Extracted Image' class='mt-2 rounded-md max-w-full h-auto' />"
                        
                        # Replace the coordinates part
                        new_text = text.replace(coords_match.group(0), img_tag)
                        q[field] = new_text
                        print("Text replaced successfully")
                        
                    except Exception as e:
                        print(f"Error processing image for question {q.get('id')}: {e}")
                else:
                    print("No coordinates found in text")
        
        doc.close()
        return questions

