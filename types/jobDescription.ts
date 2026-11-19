export interface JobDescriptionData {
  raw_text: string;
  title: string | null;
  company: string | null;
  required_skills: string[];
  preferred_skills: string[];
  required_experience_years: number | null;
  required_education: string | null;
  responsibilities: string[];
  keywords: string[];
}
