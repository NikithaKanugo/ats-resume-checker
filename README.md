# ATS Resume Checker

A web app that analyzes resumes for Applicant Tracking System (ATS) compatibility. Upload a PDF, DOCX, or TXT resume and get an instant score with actionable fixes across three categories: parseability, structure, and content quality.

## Stack

- **FastAPI** — web framework
- **Pydantic** — data validation
- **pdfplumber / mammoth** — PDF and DOCX parsing
- **Jinja2 + Tailwind CSS** — UI templates
- **pytest** — test suite (71 tests)

## Getting Started

```bash
pip install -r python/requirements.txt
uvicorn python.main:app --reload
```

Open [http://localhost:8000](http://localhost:8000)

## Run Tests

```bash
python -m pytest python/tests/ -v
```

## Scoring

| Category | Weight |
|---|---|
| Parseability | 30% |
| Structure | 30% |
| Content Quality | 40% |
# ats-resume-checker
