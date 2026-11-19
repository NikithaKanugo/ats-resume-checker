"""
build_result.py — helpers to build RuleViolation and EvaluatorResult objects.
"""

from __future__ import annotations
from typing import Optional
from ...models.rules import RuleDefinition, RuleViolation, EvaluatorResult


def build_violation(
    rule: RuleDefinition,
    message: str,
    section: Optional[str] = None,
    text: Optional[str] = None,
) -> RuleViolation:
    return RuleViolation(
        rule_id=rule.id,
        title=rule.title,
        message=message,
        severity=rule.severity,
        category=rule.category,
        penalty=rule.score_impact,
        target_section=section,
        target_text=text,
    )


def build_evaluator_result(
    category: str,
    violations: list[RuleViolation],
    cap_rules: list[RuleDefinition],
) -> EvaluatorResult:
    total_penalty = sum(v.penalty for v in violations)
    # The active cap is the minimum capValue of all triggered cap rules
    cap: Optional[int] = None
    for rule in cap_rules:
        if rule.cap_value is not None:
            cap = rule.cap_value if cap is None else min(cap, rule.cap_value)

    return EvaluatorResult(
        category=category,
        violations=violations,
        total_penalty=total_penalty,
        cap=cap,
    )
