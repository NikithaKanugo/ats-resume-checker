export interface ContactInfo {
  name: string | null;
  email: string | null;
  phone: string | null;
  linkedin: string | null;
  github: string | null;
  location: string | null;
}

export interface ExperienceEntry {
  company: string | null;
  title: string | null;
  start_date: string | null;
  end_date: string | null;
  is_current: boolean;
  location: string | null;
  bullets: string[];
  raw_text: string;
}

export interface EducationEntry {
  institution: string | null;
  degree: string | null;
  field_of_study: string | null;
  start_date: string | null;
  end_date: string | null;
  gpa: string | null;
  raw_text: string;
}

export interface SkillsSection {
  raw_list: string[];
  categories: Record<string, string[]>;
}

export interface ParseMetadata {
  source_format: "pdf" | "docx" | "txt" | "unknown";
  parse_confidence: "high" | "medium" | "low";
  char_count: number;
  page_count: number | null;
  detected_sections: string[];
  parse_warnings: string[];
}

export interface ResumeData {
  contact: ContactInfo;
  summary: string | null;
  experience: ExperienceEntry[];
  education: EducationEntry[];
  skills: SkillsSection;
  certifications: string[];
  projects: string[];
  raw_text: string;
  parse_metadata: ParseMetadata;
}
