import { z } from "zod";

export const CategoryScoreSchema = z.object({
  category: z.string(),
  raw_score: z.number().min(0).max(100),
  weight: z.number().min(0).max(100),
  weighted_score: z.number().min(0).max(100),
  cap_applied: z.number().nullable(),
});

export const RuleViolationSchema = z.object({
  ruleId: z.string(),
  title: z.string(),
  category: z.enum(["parseability", "structure", "content_quality", "jd_match"]),
  severity: z.enum(["critical", "high", "medium", "low"]),
  message: z.string(),
  penalty: z.number().nonnegative(),
});

export const PriorityFixSchema = z.object({
  rank: z.number().int().positive(),
  ruleId: z.string(),
  title: z.string(),
  severity: z.string(),
  impact: z.number(),
  suggestion: z.string(),
});

export const AnalysisResultSchema = z.object({
  analysis_id: z.string().uuid(),
  created_at: z.string().datetime(),
  scoring_mode: z.enum(["resume_only", "resume_and_jd"]),
  overall_score: z.number().min(0).max(100),
  subscores: z.array(CategoryScoreSchema),
  issues: z.array(RuleViolationSchema),
  strengths: z.array(z.string()),
  priority_fixes: z.array(PriorityFixSchema),
  metadata: z.object({
    resume_char_count: z.number().int().nonnegative(),
    parse_confidence: z.enum(["high", "medium", "low"]),
    detected_sections: z.array(z.string()),
    parse_warnings: z.array(z.string()),
  }),
});

export type AnalysisResultSchemaType = z.infer<typeof AnalysisResultSchema>;
