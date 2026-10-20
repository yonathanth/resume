import type { CvData } from "@/components/dashboard/create-flow/types";
import type { CVContentDTO } from "@/lib/api";
import type { EditorTarget } from "@/lib/preview-paths";
import { scoreCv, type CvScore, type ScoreCheck, type ScoreInput, type ScoreJobRequirements } from "./engine";

export * from "./engine";

/**
 * The editor's side of the CV score. engine.ts is a verbatim copy of the
 * backend's src/services/score/engine.ts (a backend test fails if they
 * differ), so the live number here is the number the backend stores.
 */

const normalizeJd = (text: string | undefined | null) => (text ?? "").trim().replace(/\s+/g, " ");

export type JobRequirementsState =
  | { status: "none" }
  | { status: "pending" }
  | { status: "invalid" }
  | { status: "ready"; data: ScoreJobRequirements };

/** Whether the CV's job description has been analyzed — the same "same text" rule the backend uses (its hash ignores whitespace). */
export function jobRequirementsState(cv: Pick<CvData, "jobDescription" | "jobRequirements">): JobRequirementsState {
  const jd = normalizeJd(cv.jobDescription);
  if (!jd) return { status: "none" };
  const stored = cv.jobRequirements;
  if (!stored || normalizeJd(stored.forJobDescription) !== jd) return { status: "pending" };
  return stored.data ? { status: "ready", data: stored.data } : { status: "invalid" };
}

/** Scores the editor's CV exactly as the backend will score it once saved. */
export function scoreEditorCv(cv: CvData, content: CVContentDTO): CvScore {
  const job = jobRequirementsState(cv);
  return scoreCv(content as ScoreInput, job.status === "ready" ? job.data : null);
}

/** Where "Go to" takes the user for a check: the section, and the entry/field to focus when there is one. */
export function checkTarget(cv: CvData, check: ScoreCheck): EditorTarget {
  switch (check.section) {
    case "personal":
      return { section: "personal", field: check.field };
    case "summary":
      return { section: "summary", field: "summary" };
    case "experience": {
      const entry = cv.experiences[check.index ?? 0];
      return { section: "experience", entryId: entry?.id, field: entry ? (check.id === "experience.complete" ? "role" : "bullets") : undefined };
    }
    case "education": {
      const entry = cv.education[check.index ?? 0];
      return { section: "education", entryId: entry?.id, field: entry ? "school" : undefined };
    }
    case "skills": {
      const group = cv.skillGroups[0];
      return { section: "skills", entryId: group?.id, field: group ? "items" : undefined };
    }
    default:
      return { section: check.section };
  }
}

/** Points the check is losing. */
export const pointsLost = (check: ScoreCheck) => Math.round((check.max - check.points) * 10) / 10;

/** Color band for a score: red under 60, amber to 84, green from 85. */
export function scoreTone(score: number): { ring: string; text: string; bg: string; label: string } {
  if (score >= 85) return { ring: "#059669", text: "text-emerald-700", bg: "bg-emerald-50", label: "Strong" };
  if (score >= 60) return { ring: "#d97706", text: "text-amber-700", bg: "bg-amber-50", label: "Good start" };
  return { ring: "#dc2626", text: "text-red-700", bg: "bg-red-50", label: "Needs work" };
}
