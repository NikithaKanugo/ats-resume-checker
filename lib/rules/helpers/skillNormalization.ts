/**
 * skillNormalization.ts
 *
 * Canonical skill normalization and synonym expansion for JD matching.
 * No embeddings — purely deterministic string matching with a curated map.
 *
 * Two layers:
 *   1. normalizeSkill()  — strips suffixes, lowercases, trims
 *   2. expandSynonyms()  — returns all known aliases of a term
 *
 * Both are pure functions with no external dependencies.
 */

// ---------------------------------------------------------------------------
// Synonym groups — first entry is the canonical form
// ---------------------------------------------------------------------------

const SYNONYM_GROUPS: string[][] = [
  // Languages
  ["javascript", "js", "ecmascript", "es6", "es2015"],
  ["typescript", "ts"],
  ["python", "py"],
  ["golang", "go lang"],
  ["c#", "csharp", "c sharp"],
  ["c++", "cpp", "cplusplus"],
  ["ruby", "rb"],

  // Frontend
  ["react", "react.js", "reactjs"],
  ["next.js", "nextjs", "next"],
  ["vue", "vue.js", "vuejs"],
  ["angular", "angularjs", "angular.js"],
  ["svelte", "sveltejs", "sveltekit"],

  // Backend
  ["node.js", "nodejs", "node"],
  ["express", "express.js", "expressjs"],
  ["fastapi", "fast api"],
  ["django", "django rest framework", "drf"],
  ["spring boot", "spring", "spring framework"],
  ["ruby on rails", "rails", "ror"],
  ["laravel", "laravel php"],
  [".net", "dotnet", "dot net", "asp.net"],

  // Databases
  ["postgresql", "postgres", "psql", "pg"],
  ["mongodb", "mongo"],
  ["mysql", "my sql"],
  ["elasticsearch", "elastic search", "elastic"],
  ["dynamodb", "dynamo db", "dynamo"],
  ["sql server", "mssql", "ms sql"],

  // Cloud & infra
  ["amazon web services", "aws"],
  ["google cloud platform", "gcp", "google cloud"],
  ["microsoft azure", "azure"],
  ["kubernetes", "k8s", "kube"],
  ["docker", "containerization", "containers"],
  ["terraform", "tf", "hcl"],
  ["ci/cd", "ci cd", "cicd", "continuous integration", "continuous deployment"],
  ["github actions", "gh actions"],
  ["gitlab ci", "gitlab ci/cd"],

  // AI/ML
  ["machine learning", "ml"],
  ["artificial intelligence", "ai"],
  ["natural language processing", "nlp"],
  ["large language model", "llm", "llms"],
  ["retrieval augmented generation", "rag"],
  ["langchain", "lang chain"],
  ["llamaindex", "llama index"],

  // APIs & architecture
  ["rest api", "rest apis", "restful", "restful api"],
  ["graphql", "graph ql"],
  ["microservices", "micro services", "micro-services"],
  ["api", "apis"],
  ["grpc", "g rpc"],

  // Tools & practices
  ["git", "github", "gitlab", "version control"],
  ["jira", "atlassian jira"],
  ["agile", "agile methodology"],
  ["scrum", "scrum methodology"],
  ["test driven development", "tdd"],
  ["behavior driven development", "bdd"],

  // Data
  ["apache kafka", "kafka"],
  ["apache spark", "spark"],
  ["apache airflow", "airflow"],
  ["snowflake", "snowflake db"],
  ["tableau", "tableau desktop"],
  ["power bi", "powerbi"],
];

// ---------------------------------------------------------------------------
// Build lookup tables at module load time
// ---------------------------------------------------------------------------

/** Maps every known alias (lowercased) → its canonical form. */
const ALIAS_TO_CANONICAL = new Map<string, string>();

/** Maps every canonical form → all of its aliases (including itself). */
const CANONICAL_TO_ALIASES = new Map<string, string[]>();

for (const group of SYNONYM_GROUPS) {
  const canonical = group[0];
  const all = group.map((s) => s.toLowerCase());
  CANONICAL_TO_ALIASES.set(canonical, all);
  for (const alias of all) {
    ALIAS_TO_CANONICAL.set(alias, canonical);
  }
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Normalize a skill string for comparison:
 *   - lowercase
 *   - strip common suffixes (.js, .py, .io, .ts)
 *   - collapse whitespace
 *   - trim
 */
export function normalizeSkill(skill: string): string {
  return skill
    .toLowerCase()
    .replace(/\.(js|ts|py|rb|io)$/i, "")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Return the canonical form of a skill if known, otherwise the normalized form.
 */
export function canonicalize(skill: string): string {
  const norm = normalizeSkill(skill);
  return ALIAS_TO_CANONICAL.get(norm) ?? norm;
}

/**
 * Expand a term into itself + all known synonyms.
 * Returns lowercased strings.
 *
 * "Postgres" → ["postgresql", "postgres", "psql", "pg"]
 */
export function expandSynonyms(term: string): string[] {
  const norm = normalizeSkill(term);
  const canonical = ALIAS_TO_CANONICAL.get(norm);
  if (canonical) return CANONICAL_TO_ALIASES.get(canonical) ?? [norm];
  return [norm];
}

/**
 * Check if a keyword (or any of its synonyms) appears in a haystack string.
 * Handles multi-word terms, terms with special characters (C++, C#), and
 * single-word terms with word-boundary checks.
 */
export function matchesNormalized(haystack: string, needle: string): boolean {
  const variants = expandSynonyms(needle);
  for (const v of variants) {
    if (containsTerm(haystack, v)) return true;
  }
  return false;
}

// ---------------------------------------------------------------------------
// Internal matching
// ---------------------------------------------------------------------------

/**
 * Low-level term search:
 *   - Multi-word terms or terms with special chars → plain substring
 *   - Single alphanumeric words → word-boundary regex
 */
function containsTerm(haystack: string, term: string): boolean {
  if (!term) return false;
  // Terms containing special chars (C++, C#, .NET) or spaces → substring
  if (/[^a-z0-9]/.test(term)) return haystack.includes(term);
  // Pure alphanumeric single word → word boundary
  const re = new RegExp(`\\b${escapeRegex(term)}\\b`, "i");
  return re.test(haystack);
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
