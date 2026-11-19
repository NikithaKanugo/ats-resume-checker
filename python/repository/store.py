"""
store.py — In-memory storage for uploads and analysis results.
Thread-safe for single-process use (uvicorn with 1 worker).
"""

from __future__ import annotations
import threading
from typing import Optional
from ..models.analysis import AnalysisResult, AnalysisSummary
from ..utils.text_utils import now_iso


class UploadStore:
    def __init__(self) -> None:
        self._lock = threading.Lock()
        self._uploads: dict[str, dict] = {}

    def save(self, upload_id: str, data: bytes, filename: str) -> None:
        with self._lock:
            self._uploads[upload_id] = {
                "data": data,
                "filename": filename,
                "uploaded_at": now_iso(),
            }

    def get(self, upload_id: str) -> Optional[dict]:
        with self._lock:
            return self._uploads.get(upload_id)


class AnalysisStore:
    def __init__(self) -> None:
        self._lock = threading.Lock()
        self._analyses: dict[str, AnalysisResult] = {}

    def save(self, result: AnalysisResult) -> None:
        with self._lock:
            self._analyses[result.analysis_id] = result

    def get(self, analysis_id: str) -> Optional[AnalysisResult]:
        with self._lock:
            return self._analyses.get(analysis_id)

    def list(self) -> list[AnalysisSummary]:
        with self._lock:
            summaries: list[AnalysisSummary] = []
            for r in self._analyses.values():
                summaries.append(AnalysisSummary(
                    analysis_id=r.analysis_id,
                    created_at=r.created_at,
                    overall_score=r.overall_score,
                    candidate_name=r.parsed_resume.contact.name,
                    issue_count=len(r.issues),
                    scoring_mode=r.scoring_mode,
                ))
            # Newest first
            summaries.sort(key=lambda s: s.created_at, reverse=True)
            return summaries


# Module-level singletons
upload_store = UploadStore()
analysis_store = AnalysisStore()
