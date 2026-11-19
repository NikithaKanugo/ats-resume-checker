"""
main.py — FastAPI application entry point.

Routes:
  GET  /                       → Dashboard page
  GET  /analyze                → Upload/analyze page
  GET  /results/{analysis_id}  → Results page
  GET  /history                → History page

  POST /api/upload             → Upload a resume file
  POST /api/analyze            → Run analysis on uploaded file or pasted text
  GET  /api/analyses           → List all analysis summaries

Run with:
  uvicorn python.main:app --reload
  or:
  cd python && uvicorn main:app --reload
"""

from __future__ import annotations
import os
from pathlib import Path

from fastapi import FastAPI, File, UploadFile, HTTPException, Request
from fastapi.responses import HTMLResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from pydantic import BaseModel, field_validator
from typing import Optional

from .orchestrators.run_resume_only_analysis import (
    run_resume_only_analysis,
    run_resume_only_analysis_from_text,
)
from .repository.store import upload_store, analysis_store
from .utils.text_utils import generate_id, now_iso
from .scoring.compute_overall_score import score_to_grade

# ---------------------------------------------------------------------------
# App setup
# ---------------------------------------------------------------------------

BASE_DIR = Path(__file__).parent

app = FastAPI(title="ATS Resume Checker", version="1.0.0")
app.mount("/static", StaticFiles(directory=str(BASE_DIR / "static")), name="static")
templates = Jinja2Templates(directory=str(BASE_DIR / "templates"))

# ---------------------------------------------------------------------------
# Template helpers
# ---------------------------------------------------------------------------

def _score_color(score: float) -> str:
    if score >= 80:
        return "emerald"
    if score >= 65:
        return "blue"
    if score >= 50:
        return "amber"
    return "red"


templates.env.globals["score_color"] = _score_color
templates.env.globals["score_to_grade"] = score_to_grade

# ---------------------------------------------------------------------------
# UI Routes
# ---------------------------------------------------------------------------

@app.get("/", response_class=HTMLResponse)
async def dashboard(request: Request):
    recent = analysis_store.list()[:6]
    total_scans = len(recent)
    avg_score = (
        round(sum(r.overall_score for r in recent) / total_scans) if total_scans > 0 else 0
    )
    total_issues = sum(r.issue_count for r in recent)
    return templates.TemplateResponse("dashboard.html", {
        "request": request,
        "recent": recent,
        "total_scans": total_scans,
        "avg_score": avg_score,
        "total_issues": total_issues,
    })


@app.get("/analyze", response_class=HTMLResponse)
async def analyze_page(request: Request):
    return templates.TemplateResponse("analyze.html", {"request": request})


@app.get("/results/{analysis_id}", response_class=HTMLResponse)
async def results_page(request: Request, analysis_id: str):
    result = analysis_store.get(analysis_id)
    if not result:
        raise HTTPException(status_code=404, detail="Analysis not found")
    grade = score_to_grade(result.overall_score)
    return templates.TemplateResponse("results.html", {
        "request": request,
        "result": result,
        "grade": grade,
        "score_color": _score_color(result.overall_score),
    })



# ---------------------------------------------------------------------------
# API Routes
# ---------------------------------------------------------------------------

ALLOWED_EXTENSIONS = {"pdf", "docx", "doc", "txt"}
MAX_FILE_SIZE = 10 * 1024 * 1024  # 10 MB


@app.post("/api/upload")
async def api_upload(file: UploadFile = File(...)):
    # Validate extension
    ext = (file.filename or "").rsplit(".", 1)[-1].lower() if "." in (file.filename or "") else ""
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=415,
            detail=f'Unsupported file type ".{ext}". Upload a PDF, DOCX, or TXT file.',
        )

    data = await file.read()

    if len(data) > MAX_FILE_SIZE:
        raise HTTPException(
            status_code=413,
            detail=f"File exceeds the 10 MB limit ({len(data) / 1024 / 1024:.1f} MB received).",
        )

    upload_id = generate_id()
    upload_store.save(upload_id, data, file.filename or "resume")

    return JSONResponse({
        "upload_id": upload_id,
        "filename": file.filename,
        "size_bytes": len(data),
        "uploaded_at": now_iso(),
    }, status_code=201)


class AnalyzeRequest(BaseModel):
    resume_upload_id: Optional[str] = None
    raw_text: Optional[str] = None

    @field_validator("raw_text")
    @classmethod
    def validate_raw_text(cls, v):
        if v is not None and len(v.strip()) < 50:
            raise ValueError("raw_text must be at least 50 characters.")
        return v


@app.post("/api/analyze")
async def api_analyze(body: AnalyzeRequest):
    if body.resume_upload_id is None and body.raw_text is None:
        raise HTTPException(400, detail="Provide either resume_upload_id or raw_text.")

    try:
        if body.resume_upload_id:
            upload = upload_store.get(body.resume_upload_id)
            if not upload:
                raise HTTPException(
                    404,
                    detail=f'No upload found for id "{body.resume_upload_id}". Upload the file first via POST /api/upload.',
                )
            result = run_resume_only_analysis(upload["data"], upload["filename"])
        else:
            result = run_resume_only_analysis_from_text(body.raw_text)  # type: ignore[arg-type]

        analysis_store.save(result)
        return result.model_dump()

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(500, detail=str(e)) from e


@app.get("/api/analyses")
async def api_list_analyses():
    analyses = analysis_store.list()
    return {"analyses": [a.model_dump() for a in analyses]}


@app.get("/api/analyses/{analysis_id}")
async def api_get_analysis(analysis_id: str):
    result = analysis_store.get(analysis_id)
    if not result:
        raise HTTPException(404, detail=f'Analysis "{analysis_id}" not found.')
    return result.model_dump()
