import { z } from "zod";

export const ContactInfoSchema = z.object({
  name: z.string().nullable(),
  // .email() / .url() are intentionally omitted: values are extracted from
  // raw resume text and may lack a protocol ("linkedin.com/…") or use
  // non-standard formats. Format validation happens at the UI layer instead.
  email: z.string().nullable(),
  phone: z.string().nullable(),
  linkedin: z.string().nullable(),
  github: z.string().nullable(),
  location: z.string().nullable(),
});

export const ExperienceEntrySchema = z.object({
  company: z.string().nullable(),
  title: z.string().nullable(),
  start_date: z.string().nullable(),
  end_date: z.string().nullable(),
  is_current: z.boolean(),
  location: z.string().nullable(),
  bullets: z.array(z.string()),
  raw_text: z.string(),
});

export const EducationEntrySchema = z.object({
  institution: z.string().nullable(),
  degree: z.string().nullable(),
  field_of_study: z.string().nullable(),
  start_date: z.string().nullable(),
  end_date: z.string().nullable(),
  gpa: z.string().nullable(),
  raw_text: z.string(),
});

export const SkillsSectionSchema = z.object({
  raw_list: z.array(z.string()),
  categories: z.record(z.string(), z.array(z.string())),
});

export const SectionConfidenceSchema = z.object({
  contact: z.enum(["high", "medium", "low"]),
  experience: z.enum(["high", "medium", "low"]),
  education: z.enum(["high", "medium", "low"]),
  skills: z.enum(["high", "medium", "low"]),
});

export const FallbacksUsedSchema = z.object({
  /** Company detected from line 2 (not inline separator on title line). */
  experience_header_fallback: z.boolean(),
  /** Paragraph text was split into pseudo-bullets (no bullet markers found). */
  paragraph_to_bullet_fallback: z.boolean(),
  /** Education entries came from the single-newline entry splitter. */
  education_grouping_fallback: z.boolean(),
  /** LinkedIn detected from bare word, not a full URL. */
  linkedin_bare_word_fallback: z.boolean(),
  /** Debug log: entry boundary decisions made during experience splitting. */
  experience_split_log: z.array(z.object({
    line: z.string(),
    action: z.enum(["split", "absorb"]),
    reason: z.string(),
  })),
});

export const ParseMetadataSchema = z.object({
  source_format: z.enum(["pdf", "docx", "txt", "unknown"]),
  parse_confidence: z.enum(["high", "medium", "low"]),
  char_count: z.number().int().nonnegative(),
  page_count: z.number().int().positive().nullable(),
  detected_sections: z.array(z.string()),
  parse_warnings: z.array(z.string()),
  section_confidence: SectionConfidenceSchema,
  fallbacks_used: FallbacksUsedSchema,
});

export const ResumeSchema = z.object({
  contact: ContactInfoSchema,
  summary: z.string().nullable(),
  experience: z.array(ExperienceEntrySchema),
  education: z.array(EducationEntrySchema),
  skills: SkillsSectionSchema,
  certifications: z.array(z.string()),
  projects: z.array(z.string()),
  raw_text: z.string(),
  parse_metadata: ParseMetadataSchema,
});

export type ResumeSchemaType = z.infer<typeof ResumeSchema>;
