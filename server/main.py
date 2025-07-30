# in backend/main.py
import os
import uuid
import tempfile
from fastapi import FastAPI, UploadFile, File, Form, BackgroundTasks, HTTPException, Body
from fastapi.middleware.cors import CORSMiddleware
from typing import Dict, Any, List

# Import both agents now
from core.agent import QuizGenerationAgent
from core.variation_agent import QuestionVariationAgent

# In-memory storage for job status (for production, use Redis or a database)
jobs: Dict[str, Dict[str, Any]] = {}

# --- Initialize Agents ---
from dotenv import load_dotenv
load_dotenv()
GROQ_API_KEY = os.getenv("GROQ_API_KEY")
GOOGLE_API_KEY = os.getenv("GOOGLE_API_KEY")

if not GROQ_API_KEY or not GOOGLE_API_KEY:
    raise RuntimeError("API keys not found in .env file!")

quiz_generation_agent = QuizGenerationAgent(
    groq_api_key=GROQ_API_KEY,
    google_api_key=GOOGLE_API_KEY
)
# Initialize the new agent
variation_agent = QuestionVariationAgent(
    groq_api_key=GROQ_API_KEY
)

app = FastAPI()

# --- CORS Middleware ---
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5000", "http://localhost:5173", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- Background Task Functions ---
def run_quiz_generation(job_id: str, file_path: str, user_prompt: str, num_questions: int):
    """Background task for generating the initial quiz."""
    # ... (This function remains unchanged)
    def progress_callback(text: str, value: float):
        jobs[job_id]["status"] = "processing"
        jobs[job_id]["message"] = text
        jobs[job_id]["progress"] = value

    try:
        generated_questions = quiz_generation_agent.generate_quiz_parallel(
            file_path=file_path, user_prompt=user_prompt,
            num_questions=num_questions, progress_callback=progress_callback
        )
        jobs[job_id]["status"] = "completed"
        jobs[job_id]["result"] = generated_questions
    except Exception as e:
        jobs[job_id]["status"] = "failed"; jobs[job_id]["message"] = str(e)
    finally:
        if os.path.exists(file_path): os.remove(file_path)

# --- NEW Background Task for Variations ---
def run_variation_generation(job_id: str, base_questions: List[Dict], num_variations: int):
    """Background task for generating question variations."""
    total_questions = len(base_questions)
    all_variations = {}
    for i, base_question in enumerate(base_questions):
        jobs[job_id]["message"] = f"Generating variations for Q{i+1}/{total_questions}"
        jobs[job_id]["progress"] = (i + 1) / total_questions
        
        try:
            variations = variation_agent.generate_variations_for_question(
                base_question=base_question,
                num_variations=num_variations
            )
            all_variations[f"base_q_{i}"] = variations
        except Exception as e:
            print(f"Error generating variation for Q{i+1}: {e}")
            all_variations[f"base_q_{i}"] = [] # Add empty list on failure

    jobs[job_id]["status"] = "completed"
    jobs[job_id]["result"] = all_variations


# --- API Endpoints ---
@app.post("/api/v1/quiz/generate")
async def generate_quiz_endpoint(background_tasks: BackgroundTasks, file: UploadFile = File(...), user_prompt: str = Form(...), num_questions: int = Form(...)):
    """Starts the initial quiz generation process."""
    # ... (This endpoint remains unchanged)
    job_id = str(uuid.uuid4())
    with tempfile.NamedTemporaryFile(delete=False, suffix=".pdf") as tmp_file:
        content = await file.read(); tmp_file.write(content); temp_file_path = tmp_file.name
    jobs[job_id] = {"status": "processing", "message": "Initializing job..."}
    background_tasks.add_task(run_quiz_generation, job_id, temp_file_path, user_prompt, num_questions)
    return {"job_id": job_id}


# --- NEW Endpoint for Variations ---
@app.post("/api/v1/quiz/variations")
async def generate_variations_endpoint(
    background_tasks: BackgroundTasks,
    payload: Dict = Body(...)
):
    """
    Starts the variation generation process for a list of base questions.
    Expects a payload like: {"base_questions": [...], "num_variations": 3}
    """
    job_id = str(uuid.uuid4())
    base_questions = payload.get("base_questions", [])
    num_variations = payload.get("num_variations", 2)

    if not base_questions:
        raise HTTPException(status_code=400, detail="No base questions provided.")

    jobs[job_id] = {"status": "processing", "message": "Initializing variation job..."}
    background_tasks.add_task(run_variation_generation, job_id, base_questions, num_variations)
    return {"job_id": job_id}


@app.get("/api/v1/quiz/status/{job_id}")
async def get_quiz_status(job_id: str):
    """Poll this endpoint for the status of ANY background job."""
    # ... (This endpoint remains unchanged)
    job = jobs.get(job_id)
    if not job: raise HTTPException(status_code=404, detail="Job not found")
    return job