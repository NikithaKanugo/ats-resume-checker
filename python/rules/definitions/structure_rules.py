"""
Structure rules — measures resume organization: required sections, entry completeness, dates.
Category weight: 30 pts (resume-only)
"""

from ...models.rules import RuleDefinition

STRUCTURE_RULES: list[RuleDefinition] = [
    # Required sections
    RuleDefinition(
        id="STRUCT_001", title="Missing Experience Section",
        description="No experience section was detected. This is the most critical section for ATS ranking.",
        category="structure", severity="critical", scoreImpact=40, isCap=True, capValue=40,
    ),
    RuleDefinition(
        id="STRUCT_002", title="Missing Education Section",
        description="No education section was detected. Many job postings filter by education level.",
        category="structure", severity="high", scoreImpact=20, isCap=True, capValue=70,
    ),
    RuleDefinition(
        id="STRUCT_003", title="Missing Skills Section",
        description="No skills section was detected. ATS systems rely heavily on skills keywords for matching.",
        category="structure", severity="high", scoreImpact=20,
    ),
    # Experience entry completeness
    RuleDefinition(
        id="STRUCT_004", title="Experience Entries Missing Job Titles",
        description="One or more experience entries are missing a job title. Titles are required for ATS parsing.",
        category="structure", severity="high", scoreImpact=15,
    ),
    RuleDefinition(
        id="STRUCT_005", title="Experience Entries Missing Company Names",
        description="One or more experience entries are missing a company name.",
        category="structure", severity="high", scoreImpact=15,
    ),
    RuleDefinition(
        id="STRUCT_006", title="Experience Entries Missing Dates",
        description="One or more experience entries are missing start or end dates.",
        category="structure", severity="medium", scoreImpact=10,
    ),
    RuleDefinition(
        id="STRUCT_007", title="No Bullet Points in Experience",
        description="Experience entries contain no bullet points. ATS systems and recruiters expect achievements listed as bullets.",
        category="structure", severity="high", scoreImpact=20,
    ),
    RuleDefinition(
        id="STRUCT_008", title="Too Few Bullets Per Role",
        description="One or more experience entries have fewer than 2 bullet points. Each role should have 3–6 bullets.",
        category="structure", severity="medium", scoreImpact=10,
    ),
    # Education entry completeness
    RuleDefinition(
        id="STRUCT_009", title="Education Entries Missing Institution Name",
        description="One or more education entries are missing the institution name.",
        category="structure", severity="medium", scoreImpact=10,
    ),
    RuleDefinition(
        id="STRUCT_010", title="Education Entries Missing Degree",
        description="One or more education entries are missing the degree or qualification.",
        category="structure", severity="medium", scoreImpact=10,
    ),
    # Document shape
    RuleDefinition(
        id="STRUCT_011", title="Resume Exceeds Two Pages",
        description="The resume appears to exceed two pages based on content length.",
        category="structure", severity="medium", scoreImpact=10,
    ),
    RuleDefinition(
        id="STRUCT_012", title="Missing Summary or Objective",
        description="No professional summary or objective was found.",
        category="structure", severity="low", scoreImpact=5,
    ),
    RuleDefinition(
        id="STRUCT_013", title="Single Experience Entry Only",
        description="Only one job is listed in the experience section.",
        category="structure", severity="low", scoreImpact=5,
    ),
]

STRUCTURE_RULES_MAP: dict[str, RuleDefinition] = {r.id: r for r in STRUCTURE_RULES}
