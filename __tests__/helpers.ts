/**
 * Test helper: builds a valid ResumeSchemaType with sensible defaults.
 * Override any field via the partial argument.
 */
import type { ResumeSchemaType } from "../lib/schemas/resumeSchema";

type DeepPartial<T> = { [K in keyof T]?: T[K] extends object ? DeepPartial<T[K]> : T[K] };

const DEFAULT_RESUME: ResumeSchemaType = {
  contact: {
    name: "Jane Doe",
    email: "jane@example.com",
    phone: "555-123-4567",
    linkedin: "linkedin.com/in/janedoe",
    github: "github.com/janedoe",
    location: "New York, NY",
  },
  summary: "Experienced software engineer with 5 years of experience.",
  experience: [
    {
      company: "Acme Corp",
      title: "Software Engineer",
      start_date: "Jan 2020",
      end_date: "Dec 2023",
      is_current: false,
      location: "New York, NY",
      bullets: [
        "Led migration of monolith to microservices, reducing deploy time by 60%.",
        "Built REST APIs handling 10K requests/sec with sub-50ms latency.",
        "Implemented CI/CD pipeline cutting release cycles from weekly to daily.",
        "Mentored 3 junior engineers and conducted 50+ code reviews.",
      ],
      raw_text: "Software Engineer at Acme Corp...",
    },
    {
      company: "Startup Inc",
      title: "Junior Developer",
      start_date: "Jun 2018",
      end_date: "Dec 2019",
      is_current: false,
      location: "Boston, MA",
      bullets: [
        "Developed React frontend serving 5K daily active users.",
        "Reduced page load time by 40% through code splitting and lazy loading.",
        "Wrote integration tests covering 85% of critical user flows.",
      ],
      raw_text: "Junior Developer at Startup Inc...",
    },
  ],
  education: [
    {
      institution: "MIT",
      degree: "B.S. Computer Science",
      field_of_study: "Computer Science",
      start_date: "Sep 2014",
      end_date: "May 2018",
      gpa: "3.8",
      raw_text: "MIT, B.S. Computer Science",
    },
  ],
  skills: {
    raw_list: [
      "TypeScript", "React", "Node.js", "Python", "PostgreSQL",
      "Docker", "AWS", "Git", "REST APIs", "CI/CD",
    ],
    categories: {},
  },
  certifications: [],
  projects: [],
  raw_text: [
    "Jane Doe",
    "jane@example.com | 555-123-4567 | New York, NY | linkedin.com/in/janedoe | github.com/janedoe",
    "",
    "SUMMARY",
    "Experienced software engineer with 5 years of hands-on experience designing, building, and operating distributed systems and scalable web applications across cloud-native environments. Strong background in backend architecture, API design, team leadership, and delivering high-quality production software from initial prototype through global rollout at scale.",
    "",
    "EXPERIENCE",
    "",
    "Software Engineer — Acme Corp",
    "Jan 2020 – Dec 2023 | New York, NY",
    "• Led migration of a monolithic application to a microservices architecture using Docker and Kubernetes, reducing average deploy time by 60% and enabling independent service releases across 8 teams.",
    "• Built REST APIs handling 10,000 requests per second with sub-50ms p95 latency using Node.js and PostgreSQL, serving the primary customer-facing product.",
    "• Implemented end-to-end CI/CD pipeline with GitHub Actions and ArgoCD, cutting release cycles from weekly to daily and eliminating 95% of manual deployment steps.",
    "• Mentored 3 junior engineers through pair programming and structured code reviews, conducting 50+ reviews per quarter and driving adoption of TypeScript across the frontend codebase.",
    "",
    "Junior Developer — Startup Inc",
    "Jun 2018 – Dec 2019 | Boston, MA",
    "• Developed responsive React frontend serving 5,000 daily active users with real-time data updates via WebSocket connections and optimistic UI patterns.",
    "• Reduced page load time by 40% through strategic code splitting, lazy loading of non-critical components, and aggressive image optimization with next-gen formats.",
    "• Wrote comprehensive integration tests covering 85% of critical user flows using Cypress, reducing production incident rate by 30% over two quarters.",
    "",
    "EDUCATION",
    "MIT — B.S. Computer Science",
    "Sep 2014 – May 2018 | GPA: 3.8",
    "",
    "SKILLS",
    "Languages: TypeScript, JavaScript, Python, SQL, Go",
    "Frameworks: React, Next.js, Node.js, Express, FastAPI",
    "Infrastructure: Docker, Kubernetes, AWS (S3, Lambda, ECS), Terraform",
    "Databases: PostgreSQL, Redis, MongoDB, Elasticsearch",
    "Tools: Git, GitHub Actions, ArgoCD, DataDog, Grafana",
  ].join("\n"),
  parse_metadata: {
    source_format: "pdf",
    parse_confidence: "high",
    char_count: 2500,
    page_count: 1,
    detected_sections: ["experience", "education", "skills"],
    parse_warnings: [],
    section_confidence: {
      contact: "high",
      experience: "high",
      education: "high",
      skills: "high",
    },
    fallbacks_used: {
      experience_header_fallback: false,
      paragraph_to_bullet_fallback: false,
      education_grouping_fallback: false,
      linkedin_bare_word_fallback: false,
      experience_split_log: [],
    },
  },
};

export function buildResume(overrides: DeepPartial<ResumeSchemaType> = {}): ResumeSchemaType {
  return deepMerge(structuredClone(DEFAULT_RESUME), overrides) as ResumeSchemaType;
}

function deepMerge(target: Record<string, unknown>, source: Record<string, unknown>): Record<string, unknown> {
  for (const key of Object.keys(source)) {
    const sv = source[key];
    const tv = target[key];
    if (sv !== undefined && tv !== undefined && isPlainObject(sv) && isPlainObject(tv)) {
      target[key] = deepMerge(tv as Record<string, unknown>, sv as Record<string, unknown>);
    } else if (sv !== undefined) {
      target[key] = sv;
    }
  }
  return target;
}

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}
