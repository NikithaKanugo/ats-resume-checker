/**
 * buildDebugOutput.ts
 *
 * Extracts a lightweight diagnostic summary from an AnalysisResult.
 * No scoring logic — pure projection of existing data into a shape
 * optimized for debugging parse quality and rule behaviour.
 */

import type { AnalysisResult } from "../../types/analysis";

export interface DebugOutput {
  analysis_id: string;
  overall_score: number;

  parser: {
    confidence: string;
    char_count: number;
    detected_sections: string[];
    warnings: string[];
    section_confidence: Record<string, string>;
    fallbacks_used: Record<string, unknown>;
  };

  experience_entries: {
    index: number;
    title: string | null;
    company: string | null;
    start_date: string | null;
    end_date: string | null;
    is_current: boolean;
    bullet_count: number;
  }[];

  education_entries: {
    index: number;
    institution: string | null;
    degree: string | null;
    start_date: string | null;
    end_date: string | null;
  }[];

  skills_extracted: number;

  contact: {
    name: string | null;
    email: string | null;
    phone: string | null;
    linkedin: string | null;
    github: string | null;
  };

  triggered_rules: {
    rule_id: string;
    title: string;
    category: string;
    severity: string;
    penalty: number;
    target_section: string | null;
    message: string;
  }[];

  subscores: {
    category: string;
    raw_score: number;
    weight: number;
    weighted_score: number;
    cap_applied: number | null;
  }[];
}

export function buildDebugOutput(result: AnalysisResult): DebugOutput {
  const resume = result.parsed_resume;
  const meta = resume.parse_metadata;

  return {
    analysis_id: result.analysis_id,
    overall_score: Math.round(result.overall_score),

    parser: {
      confidence: meta.parse_confidence,
      char_count: meta.char_count,
      detected_sections: meta.detected_sections,
      warnings: meta.parse_warnings,
      section_confidence: meta.section_confidence,
      fallbacks_used: meta.fallbacks_used,
    },

    experience_entries: resume.experience.map((e, i) => ({
      index: i,
      title: e.title,
      company: e.company,
      start_date: e.start_date,
      end_date: e.end_date,
      is_current: e.is_current,
      bullet_count: e.bullets.length,
    })),

    education_entries: resume.education.map((e, i) => ({
      index: i,
      institution: e.institution,
      degree: e.degree,
      start_date: e.start_date,
      end_date: e.end_date,
    })),

    skills_extracted: resume.skills.raw_list.length,

    contact: {
      name: resume.contact.name,
      email: resume.contact.email,
      phone: resume.contact.phone,
      linkedin: resume.contact.linkedin,
      github: resume.contact.github,
    },

    triggered_rules: result.issues.map((v) => ({
      rule_id: v.ruleId,
      title: v.title,
      category: v.category,
      severity: v.severity,
      penalty: v.penalty,
      target_section: v.target_section ?? null,
      message: v.message,
    })),

    subscores: result.subscores.map((s) => ({
      category: s.category,
      raw_score: s.raw_score,
      weight: s.weight,
      weighted_score: s.weighted_score,
      cap_applied: s.cap_applied,
    })),
  };
}
