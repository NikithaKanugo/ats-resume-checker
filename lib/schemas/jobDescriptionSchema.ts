import { z } from "zod";

export const JobDescriptionSchema = z.object({
  raw_text: z.string().min(1, "Job description cannot be empty"),
  title: z.string().nullable(),
  company: z.string().nullable(),
  required_skills: z.array(z.string()),
  preferred_skills: z.array(z.string()),
  required_experience_years: z.number().nonnegative().nullable(),
  required_education: z.string().nullable(),
  responsibilities: z.array(z.string()),
  keywords: z.array(z.string()),
});

export type JobDescriptionSchemaType = z.infer<typeof JobDescriptionSchema>;
