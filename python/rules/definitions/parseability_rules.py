"""
Parseability rules — measures whether the resume can be reliably read by an ATS parser.
Category weight: 30 pts (resume-only)
"""

from ...models.rules import RuleDefinition

PARSEABILITY_RULES: list[RuleDefinition] = [
    RuleDefinition(
        id="PARSE_001", title="Resume Too Short to Parse",
        description="The extracted text is fewer than 100 characters, suggesting the file may be image-based, corrupted, or empty.",
        category="parseability", severity="critical", scoreImpact=100, isCap=True, capValue=0,
    ),
    RuleDefinition(
        id="PARSE_002", title="Low Parse Confidence",
        description="The parser was unable to detect key sections, resulting in low confidence in the extracted content.",
        category="parseability", severity="high", scoreImpact=30,
    ),
    RuleDefinition(
        id="PARSE_003", title="No Contact Information Detected",
        description="No recognizable contact block was found. ATS systems require at minimum a name and email.",
        category="parseability", severity="critical", scoreImpact=40,
    ),
    RuleDefinition(
        id="PARSE_004", title="Missing Email Address",
        description="No valid email address was found in the resume. This is a required contact field.",
        category="parseability", severity="high", scoreImpact=20,
    ),
    RuleDefinition(
        id="PARSE_005", title="Missing Phone Number",
        description="No phone number was detected. Most ATS systems expect a phone number in the contact section.",
        category="parseability", severity="medium", scoreImpact=10,
    ),
    RuleDefinition(
        id="PARSE_006", title="No Section Headers Detected",
        description="The resume contains no recognizable section headers (e.g., Experience, Education, Skills). This severely limits ATS parsing.",
        category="parseability", severity="critical", scoreImpact=50, isCap=True, capValue=30,
    ),
    RuleDefinition(
        id="PARSE_007", title="Insufficient Resume Length",
        description="The resume contains fewer than 300 words. A substantive resume should have at least 400–600 words.",
        category="parseability", severity="medium", scoreImpact=15,
    ),
    RuleDefinition(
        id="PARSE_008", title="Candidate Name Not Detected",
        description="No candidate name could be extracted from the top of the resume.",
        category="parseability", severity="high", scoreImpact=20,
    ),
    RuleDefinition(
        id="PARSE_009", title="No LinkedIn or GitHub Profile",
        description="No LinkedIn or GitHub URL was found. While not critical, these improve recruiter confidence.",
        category="parseability", severity="low", scoreImpact=5,
    ),
]

PARSEABILITY_RULES_MAP: dict[str, RuleDefinition] = {r.id: r for r in PARSEABILITY_RULES}
