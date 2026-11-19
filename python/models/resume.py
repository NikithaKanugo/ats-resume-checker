"""
Pydantic models for resume data structures.
Mirrors TypeScript types in types/resume.ts and lib/schemas/resumeSchema.ts
"""

from __future__ import annotations
from typing import Optional
from pydantic import BaseModel, Field


class ContactInfo(BaseModel):
    name: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    linkedin: Optional[str] = None
    github: Optional[str] = None
    location: Optional[str] = None


class ExperienceEntry(BaseModel):
    company: Optional[str] = None
    title: Optional[str] = None
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    is_current: bool = False
    location: Optional[str] = None
    bullets: list[str] = Field(default_factory=list)
    raw_text: str = ""


class EducationEntry(BaseModel):
    institution: Optional[str] = None
    degree: Optional[str] = None
    field_of_study: Optional[str] = None
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    gpa: Optional[str] = None
    raw_text: str = ""


class SkillsSection(BaseModel):
    raw_list: list[str] = Field(default_factory=list)
    categories: dict[str, list[str]] = Field(default_factory=dict)


class FallbacksUsed(BaseModel):
    experience_header_fallback: bool = False
    paragraph_to_bullet_fallback: bool = False
    education_grouping_fallback: bool = False
    linkedin_bare_word_fallback: bool = False
    experience_split_log: list[dict] = Field(default_factory=list)


class SectionConfidence(BaseModel):
    contact: str = "low"   # "high" | "medium" | "low"
    experience: str = "low"
    education: str = "low"
    skills: str = "low"


class ParseMetadata(BaseModel):
    source_format: str = "txt"
    parse_confidence: str = "low"   # "high" | "medium" | "low"
    char_count: int = 0
    page_count: Optional[int] = None
    detected_sections: list[str] = Field(default_factory=list)
    parse_warnings: list[str] = Field(default_factory=list)
    section_confidence: SectionConfidence = Field(default_factory=SectionConfidence)
    fallbacks_used: FallbacksUsed = Field(default_factory=FallbacksUsed)


class Resume(BaseModel):
    contact: ContactInfo = Field(default_factory=ContactInfo)
    summary: Optional[str] = None
    experience: list[ExperienceEntry] = Field(default_factory=list)
    education: list[EducationEntry] = Field(default_factory=list)
    skills: SkillsSection = Field(default_factory=SkillsSection)
    certifications: list[str] = Field(default_factory=list)
    projects: list[str] = Field(default_factory=list)
    raw_text: str = ""
    parse_metadata: ParseMetadata = Field(default_factory=ParseMetadata)
