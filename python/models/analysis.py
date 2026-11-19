"""
Pydantic models for analysis results.
Mirrors types/analysis.ts and lib/schemas/analysisSchema.ts
"""

from __future__ import annotations
from typing import Optional, Literal
from pydantic import BaseModel, Field

from .rules import RuleViolation
from .resume import Resume

ScoringMode = Literal["resume_only", "resume_and_jd"]


class CategoryScore(BaseModel):
    category: str
    raw_score: float
    weight: int
    weighted_score: float
    cap_applied: Optional[int] = None


class PriorityFix(BaseModel):
    rank: int
    rule_id: str
    title: str
    severity: str
    impact: int
    weighted_lift: int
    suggestion: str
    target_section: Optional[str] = None


class AnalysisMetadata(BaseModel):
    resume_char_count: int = 0
    parse_confidence: str = "low"
    detected_sections: list[str] = Field(default_factory=list)
    parse_warnings: list[str] = Field(default_factory=list)


class AnalysisResult(BaseModel):
    analysis_id: str
    created_at: str
    scoring_mode: ScoringMode
    overall_score: float
    subscores: list[CategoryScore] = Field(default_factory=list)
    issues: list[RuleViolation] = Field(default_factory=list)
    strengths: list[str] = Field(default_factory=list)
    priority_fixes: list[PriorityFix] = Field(default_factory=list)
    gap_report: Optional[dict] = None
    parsed_resume: Resume
    metadata: AnalysisMetadata = Field(default_factory=AnalysisMetadata)


class AnalysisSummary(BaseModel):
    """Lightweight summary for history list view."""
    analysis_id: str
    created_at: str
    overall_score: float
    candidate_name: Optional[str] = None
    issue_count: int = 0
    scoring_mode: ScoringMode
