import weave
import os
import time # Added for potential timing metrics
from fastapi import FastAPI, HTTPException, Request
from fastapi.staticfiles import StaticFiles
from fastapi.responses import HTMLResponse, FileResponse
from pydantic import BaseModel
from openai import OpenAI, OpenAIError
from dotenv import load_dotenv
from typing import List, Dict # Added for type hinting

# Load environment variables
load_dotenv()

# Initialize Weave
try:
    weave.init("ollama-benchmarking")
except Exception as e:
    print(f"Failed to initialize Weave: {e}")

# --- Configuration ---
OLLAMA_BASE_URL = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434/v1/")
OLLAMA_API_KEY = os.getenv("OLLAMA_API_KEY", "ollama")

# --- FastAPI App ---
app = FastAPI(
    title="Ollama Benchmarking App",
    description="An API to chat with and evaluate Ollama models.", # Updated description
)

# Mount static files
app.mount("/static", StaticFiles(directory="static"), name="static")

# --- OpenAI Client Setup ---
client = OpenAI(
    base_url=OLLAMA_BASE_URL,
    api_key=OLLAMA_API_KEY,
)

# --- Placeholder Benchmark Data ---
# In a real app, this would come from a file, database, or Weave artifacts
BENCHMARKS = {
    "simple_math": {
        "description": "Basic arithmetic questions.",
        "prompts": [
            "What is 5 + 3?",
            "Calculate 12 * 4.",
            "What is 100 / 5?",
        ],
        # Future: Add expected answers for scoring
    },
    "general_knowledge": {
        "description": "Simple general knowledge questions.",
        "prompts": [
            "What is the capital of France?",
            "Who wrote Hamlet?",
            "What is the chemical symbol for water?",
        ],
    }
}

# --- Pydantic Models ---
class ChatRequest(BaseModel):
    model_id: str
    message: str

class ChatResponse(BaseModel):
    model_id: str
    reply: str

class BenchmarkEvaluationRequest(BaseModel):
    model_id: str
    benchmark_name: str

class EvaluationResult(BaseModel):
    prompt: str
    response: str
    # Future: Add metrics like latency, correctness_score

class EvaluationSummary(BaseModel):
    model_id: str
    benchmark_name: str
    status: str
    results: List[EvaluationResult]
    # Future: Add overall score, average latency, etc.

# --- Weave-decorated Ollama Call ---
# No changes needed here for now, but we'll call it from new places
@weave.op()
def call_ollama(model_id: str, prompt: str, use_chat_completion: bool = True) -> str:
    """Calls the Ollama model using the OpenAI SDK and returns the response content."""
    # Optional: Add timing here if needed, though Weave might capture it
    start_time = time.time()
    try:
        if use_chat_completion:
            completion = client.chat.completions.create(
                messages=[{"role": "user", "content": prompt}],
                model=model_id,
            )
            response_text = completion.choices[0].message.content or ""
        else:
            completion = client.completions.create(
                model=model_id,
                prompt=prompt,
            )
            response_text = completion.choices[0].text or ""

        end_time = time.time()
        # Optional: Log latency explicitly if desired
        # weave.log({"prompt": prompt, "response": response_text, "latency_ms": (end_time - start_time) * 1000})
        return response_text
    except OpenAIError as e:
        print(f"Error calling Ollama model {model_id}: {e}")
        raise HTTPException(status_code=500, detail=f"Ollama API Error: {e}")
    except Exception as e:
        print(f"An unexpected error occurred: {e}")
        raise HTTPException(status_code=500, detail=f"Internal Server Error: {e}")

# --- API Endpoints ---

@app.get("/", response_class=HTMLResponse)
async def serve_frontend():
    """Serve the frontend index.html file."""
    return FileResponse("static/index.html")

@app.post("/chat", response_model=ChatResponse)
async def chat_with_model(request: ChatRequest):
    """
    Sends a single message to a specified Ollama model and gets a reply.
    Uses chat completion mode.
    """
    print(f"Received chat request for model: {request.model_id}")

    # Use the chat completion mode for interactive chat
    model_reply = call_ollama(
        model_id=request.model_id,
        prompt=request.message,
        use_chat_completion=True # Explicitly true for chat
    )

    return ChatResponse(
        model_id=request.model_id,
        reply=model_reply
    )

@app.post("/run_evaluation", response_model=EvaluationSummary)
async def run_evaluation(request: BenchmarkEvaluationRequest):
    """
    Runs a predefined benchmark against a specified Ollama model.
    Logs results using Weave via the call_ollama function.
    """
    print(f"Received evaluation request for model: {request.model_id} on benchmark: {request.benchmark_name}")

    # Find the benchmark data
    benchmark = BENCHMARKS.get(request.benchmark_name)
    if not benchmark:
        raise HTTPException(status_code=404, detail=f"Benchmark '{request.benchmark_name}' not found.")

    prompts = benchmark.get("prompts", [])
    if not prompts:
         raise HTTPException(status_code=404, detail=f"No prompts found for benchmark '{request.benchmark_name}'.")

    evaluation_results: List[EvaluationResult] = []

    # Iterate through prompts and call the model
    for prompt in prompts:
        print(f"  Evaluating prompt: '{prompt[:50]}...'") # Log progress
        # Decide if evaluation should use chat or completion endpoint - default chat
        response = call_ollama(
            model_id=request.model_id,
            prompt=prompt,
            use_chat_completion=True # Or make this configurable per benchmark
        )
        evaluation_results.append(EvaluationResult(prompt=prompt, response=response))
        # Add a small delay if needed to avoid overwhelming Ollama
        # time.sleep(0.1)

    # In a real app: Calculate scores, aggregate metrics, and potentially store results persistently.
    # Weave logging happens within call_ollama for each call.
    # You might add overall Weave logging here for the entire evaluation run.
    # weave.log({"evaluation_summary": { ... }})

    return EvaluationSummary(
        model_id=request.model_id,
        benchmark_name=request.benchmark_name,
        status="Completed",
        results=evaluation_results
    )

@app.get("/benchmarks")
async def list_benchmarks() -> Dict[str, Dict[str, str]]:
    """Lists available benchmarks and their descriptions."""
    return {name: {"description": data.get("description", "No description")}
            for name, data in BENCHMARKS.items()}

@app.get("/chat", response_class=HTMLResponse)
async def serve_chat():
    """Serve the chat.html file."""
    return FileResponse("static/chat.html")

@app.get("/evaluation", response_class=HTMLResponse)
async def serve_evaluation():
    """Serve the evaluation.html file."""
    return FileResponse("static/evaluation.html")

# --- Running the App (for local development) ---
# Run via uvicorn command line: uvicorn ollama_benchmarking.main:app --reload
if __name__ == "__main__":
    import uvicorn
    print("Starting server. Run with: uvicorn ollama_benchmarking.main:app --reload --port 8000")