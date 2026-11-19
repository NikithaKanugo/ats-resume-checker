import { Mail, Phone, MapPin, Link2, GitBranch } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { ResumeSectionBlock } from "./ResumeSectionBlock";
import { PenaltyHighlight } from "./PenaltyHighlight";
import type { UIAnalysisResult, UIIssue, ParsedExperience } from "@/types/analysisUI";

interface ResumeAuditViewerProps {
  analysis: UIAnalysisResult;
}

/** Return all issues whose target_section starts with the given prefix. */
function issuesForSection(issues: UIIssue[], prefix: string): UIIssue[] {
  return issues.filter(
    (i) => i.target_section === prefix || i.target_section?.startsWith(prefix + ".")
  );
}

/** Check if a bullet text matches any issue's target_text. */
function issuesForText(issues: UIIssue[], text: string): UIIssue[] {
  return issues.filter(
    (i) => i.target_text && text.toLowerCase().includes(i.target_text.toLowerCase())
  );
}

function ContactSection({
  contact,
  issues,
}: {
  contact: UIAnalysisResult["parsed_resume"]["contact"];
  issues: UIIssue[];
}) {
  if (!contact) return null;
  return (
    <ResumeSectionBlock issues={issues}>
      <h1 className="text-xl font-bold text-slate-900">{contact.full_name}</h1>
      <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1.5 text-xs text-slate-500">
        {contact.email && (
          <span className="flex items-center gap-1">
            <Mail className="h-3 w-3" /> {contact.email}
          </span>
        )}
        {contact.phone && (
          <span className="flex items-center gap-1">
            <Phone className="h-3 w-3" /> {contact.phone}
          </span>
        )}
        {contact.location && (
          <span className="flex items-center gap-1">
            <MapPin className="h-3 w-3" /> {contact.location}
          </span>
        )}
        {contact.linkedin ? (
          <span className="flex items-center gap-1">
            <Link2 className="h-3 w-3" /> {contact.linkedin}
          </span>
        ) : (
          <PenaltyHighlight severity="minor" label="No LinkedIn profile" inline>
            <span className="flex items-center gap-1">
              <Link2 className="h-3 w-3" /> linkedin not provided
            </span>
          </PenaltyHighlight>
        )}
        {contact.github && (
          <span className="flex items-center gap-1">
            <GitBranch className="h-3 w-3" /> {contact.github}
          </span>
        )}
      </div>
    </ResumeSectionBlock>
  );
}

function ExperienceEntry({
  entry,
  entryIndex,
  allIssues,
}: {
  entry: ParsedExperience;
  entryIndex: number;
  allIssues: UIIssue[];
}) {
  const entryKey = `experience.${entryIndex}`;
  const entryIssues = issuesForSection(allIssues, entryKey);
  // Only flag missing dates on real role headers (short title or has company).
  // Content blocks that slipped through as entries won't have a short title or company.
  const isRoleHeader =
    Boolean(entry.company) ||
    (entry.title !== undefined && (entry.title?.length ?? 0) <= 80);
  const hasMissingDates = !entry.start_date && !entry.end_date && isRoleHeader;

  return (
    <ResumeSectionBlock issues={entryIssues.filter((i) => !i.target_section?.includes("bullets"))}>
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-sm font-semibold text-slate-800">{entry.title}</p>
          <p className="text-xs text-slate-500">{entry.company}</p>
        </div>
        {hasMissingDates ? (
          <PenaltyHighlight severity="major" label="Missing dates" detail="Add start and end dates in Month Year format." inline>
            <span className="text-xs text-slate-400 italic">No dates</span>
          </PenaltyHighlight>
        ) : (
          <span className="text-xs text-slate-400 whitespace-nowrap">
            {entry.start_date} – {entry.end_date ?? "Present"}
          </span>
        )}
      </div>

      {entry.bullets && entry.bullets.length > 0 && (
        <ul className="mt-2 space-y-1 pl-1">
          {entry.bullets.map((bullet, bi) => {
            const bulletIssues = issuesForText(allIssues, bullet);
            if (bulletIssues.length > 0) {
              const top = bulletIssues[0];
              return (
                <li key={bi}>
                  <PenaltyHighlight
                    severity={top.severity}
                    label={top.title}
                    detail={top.how_to_fix}
                  >
                    <span className="text-xs leading-relaxed">• {bullet}</span>
                  </PenaltyHighlight>
                </li>
              );
            }
            return (
              <li key={bi} className="text-xs text-slate-700 leading-relaxed">
                • {bullet}
              </li>
            );
          })}
        </ul>
      )}
    </ResumeSectionBlock>
  );
}

export function ResumeAuditViewer({ analysis }: ResumeAuditViewerProps) {
  const { parsed_resume: resume, issues } = analysis;

  return (
    <div className="font-sans text-slate-800 space-y-1">
      {/* Contact */}
      <ContactSection
        contact={resume.contact}
        issues={issuesForSection(issues, "contact")}
      />

      <Separator className="my-3" />

      {/* Summary */}
      {resume.summary?.text && (
        <>
          <ResumeSectionBlock
            title="Summary"
            issues={issuesForSection(issues, "summary")}
          >
            <p className="text-xs leading-relaxed text-slate-700">{resume.summary.text}</p>
          </ResumeSectionBlock>
          <Separator className="my-3" />
        </>
      )}

      {/* Experience */}
      {resume.experience && resume.experience.length > 0 && (
        <>
          <div className="mb-2">
            <h2 className="text-xs font-bold uppercase tracking-widest text-slate-400">
              Experience
            </h2>
          </div>
          {resume.experience.map((entry, i) => (
            <ExperienceEntry
              key={i}
              entry={entry}
              entryIndex={i}
              allIssues={issues}
            />
          ))}
          <Separator className="my-3" />
        </>
      )}

      {/* Education */}
      {resume.education && resume.education.length > 0 && (
        <>
          <div className="mb-2">
            <h2 className="text-xs font-bold uppercase tracking-widest text-slate-400">
              Education
            </h2>
          </div>
          {resume.education.map((edu, i) => (
            <ResumeSectionBlock
              key={i}
              issues={issuesForSection(issues, `education.${i}`)}
            >
              <p className="text-sm font-semibold text-slate-800">{edu.degree}</p>
              <div className="flex items-center justify-between mt-0.5">
                <p className="text-xs text-slate-500">{edu.institution}</p>
                {edu.end_date && (
                  <span className="text-xs text-slate-400">{edu.end_date}</span>
                )}
              </div>
            </ResumeSectionBlock>
          ))}
          <Separator className="my-3" />
        </>
      )}

      {/* Skills */}
      {resume.skills?.normalized && resume.skills.normalized.length > 0 && (
        <ResumeSectionBlock
          title="Skills"
          issues={issuesForSection(issues, "skills")}
        >
          <div className="flex flex-wrap gap-1.5 mt-1">
            {resume.skills.normalized.map((skill) => (
              <span
                key={skill}
                className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-0.5 text-xs text-slate-600"
              >
                {skill}
              </span>
            ))}
          </div>
        </ResumeSectionBlock>
      )}
    </div>
  );
}
