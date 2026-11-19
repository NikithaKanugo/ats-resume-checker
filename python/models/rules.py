"""
Pydantic models for rule definitions, violations, and evaluator results.
Mirrors types/rules.ts
"""

from __future__ import annotations
from typing import Optional, Literal
from pydantic import BaseModel, Field

RuleCategory = Literal["parseability", "structure", "content_quality", "jd_match"]
Severity = Literal["critical", "high", "medium", "low"]


class RuleDefinition(BaseModel):
    id: str
    title: str
    description: str
    category: RuleCategory
    severity: Severity
    score_impact: int = Field(alias="scoreImpact", default=0)
    is_cap: bool = Field(alias="isCap", default=False)
    cap_value: Optional[int] = Field(alias="capValue", default=None)

    model_config = {"populate_by_name": True}


class RuleViolation(BaseModel):
    rule_id: str
    title: str
    message: str
    severity: Severity
    category: RuleCategory
    penalty: int
    target_section: Optional[str] = None
    target_text: Optional[str] = None


class EvaluatorResult(BaseModel):
    category: RuleCategory
    violations: list[RuleViolation] = Field(default_factory=list)
    total_penalty: int = 0
    cap: Optional[int] = None
