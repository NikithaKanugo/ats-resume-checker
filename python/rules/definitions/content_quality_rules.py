"""
Content quality rules — measures bullet quality, action verbs, language, skills depth.
Category weight: 40 pts (resume-only)
"""

from ...models.rules import RuleDefinition

CONTENT_QUALITY_RULES: list[RuleDefinition] = [
    # Bullet quality
    RuleDefinition(
        id="CONTENT_001", title="Too Few Quantified Achievements",
        description="Fewer than 25% of experience bullets contain measurable results.",
        category="content_quality", severity="high", scoreImpact=20,
    ),
    RuleDefinition(
        id="CONTENT_002", title="Excessive Use of Weak Verbs",
        description="More than 30% of bullets begin with weak or passive verbs.",
        category="content_quality", severity="high", scoreImpact=15,
    ),
    RuleDefinition(
        id="CONTENT_003", title="No Action Verbs Detected",
        description="Experience bullets do not start with action verbs.",
        category="content_quality", severity="critical", scoreImpact=25,
    ),
    RuleDefinition(
        id="CONTENT_004", title="Bullet Points Too Long",
        description="More than 30% of bullets exceed 200 characters.",
        category="content_quality", severity="medium", scoreImpact=10,
    ),
    RuleDefinition(
        id="CONTENT_005", title="Bullet Points Too Short",
        description="More than 30% of bullets are fewer than 40 characters.",
        category="content_quality", severity="medium", scoreImpact=10,
    ),
    RuleDefinition(
        id="CONTENT_006", title="Too Few Total Bullets",
        description="The resume contains fewer than 6 bullet points across all experience entries.",
        category="content_quality", severity="high", scoreImpact=15,
    ),
    # Language quality
    RuleDefinition(
        id="CONTENT_007", title="First-Person Pronouns Detected",
        description="The resume uses first-person pronouns ('I', 'my', 'me', 'we').",
        category="content_quality", severity="medium", scoreImpact=10,
    ),
    RuleDefinition(
        id="CONTENT_008", title="Cliché or Overused Phrases",
        description="The resume contains overused clichés (e.g., 'team player', 'self-motivated').",
        category="content_quality", severity="low", scoreImpact=8,
    ),
    RuleDefinition(
        id="CONTENT_009", title="Responsibility-Focused Language",
        description="Many bullets describe responsibilities rather than achievements.",
        category="content_quality", severity="high", scoreImpact=15,
    ),
    # Skills quality
    RuleDefinition(
        id="CONTENT_010", title="Too Few Skills Listed",
        description="Fewer than 5 skills were detected.",
        category="content_quality", severity="medium", scoreImpact=10,
    ),
    RuleDefinition(
        id="CONTENT_011", title="Skills Section Contains Only Soft Skills",
        description="No technical or domain-specific skills were detected.",
        category="content_quality", severity="medium", scoreImpact=10,
    ),
    # Dates and gaps
    RuleDefinition(
        id="CONTENT_012", title="Employment Gap Detected",
        description="A gap of more than 6 months between experience entries was detected.",
        category="content_quality", severity="low", scoreImpact=5,
    ),
]

CONTENT_QUALITY_RULES_MAP: dict[str, RuleDefinition] = {r.id: r for r in CONTENT_QUALITY_RULES}
