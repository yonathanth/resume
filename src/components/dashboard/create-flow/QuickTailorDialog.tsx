"use client";

import React, { useState } from "react";
import { Copy, FilePen } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { canAutoFocus } from "@/lib/autofocus";
import { analyzeCv, deleteCvDocument, generateCv, getCvDocument, type GenerateCvMismatch } from "@/lib/api";
import { serializeCvContentToText } from "@/lib/cv-mapper";
import { atLeastAiWait, useAnalyzeExisting, useRefineCv } from "@/hooks/use-cv-generation";
import { CV_DRAFTS_QUERY_KEY } from "@/hooks/use-cv-drafts";
import { useProGate } from "@/hooks/use-pro-gate";
import { ProUpgradeModal } from "@/components/dashboard/ProUpgradeModal";
import { AiWaitLoader, FlowError, FlowModal, JobMismatchDialog, StepEyebrow, flowErrorMessage, useAiDone } from "./FlowUI";
import { OptionCard } from "./OptionCard";

/** Writing strength the full Tailor flow uses too — how far to tailor is fixed in the backend's rules. */
const TAILOR_ENHANCEMENT_LEVEL = 0.7;

type Mode = "copy" | "in-place";

export interface QuickTailorDialogProps {
  /** Saves the editor's pending changes and returns the CV's id (the editor's saveNow). */
  saveCv: () => Promise<string>;
  templateId: string;
  /** The job this CV was last tailored to, if any — prefilled. */
  initialJobDescription?: string;
  onClose: () => void;
  /** A tailored copy was made: open it. */
  onCopyReady: (cvId: string) => void;
  /** This CV itself was tailored: reload it. */
  onTailoredInPlace: (cvId: string) => void;
}

/**
 * "Tailor to a job" from the editor: its own short flow, not the full Tailor
 * flow (which starts by picking a source and would flash its first screens
 * while it reads this CV). Two questions — a copy or this CV, then the job —
 * then Moxie tailors and the result opens.
 *
 *  - A copy: the CV is copied (no AI, not charged) and the copy tailored,
 *    charged as a tailoring like any copy (pay at download allowed). The
 *    original stays as it is.
 *  - This CV: a fresh tailoring is charged (POST /cv/analyze with sourceCvId)
 *    and the result replaces this CV's content. "Pay at download" isn't
 *    offered: this CV is already paid for, so there'd be nothing to collect.
 */
export function QuickTailorDialog({ saveCv, templateId, initialJobDescription = "", onClose, onCopyReady, onTailoredInPlace }: QuickTailorDialogProps) {
  const [mode, setMode] = useState<Mode | null>(null);
  const [jobDescription, setJobDescription] = useState(initialJobDescription);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mismatch, setMismatch] = useState<GenerateCvMismatch | null>(null);
  const analyzeExisting = useAnalyzeExisting();
  const refine = useRefineCv();
  const proGate = useProGate();
  const { done: aiDone, celebrate } = useAiDone();
  const queryClient = useQueryClient();

  const tailorCopy = async (cvId: string, job: string) => {
    const payLater = proGate.payLater();
    const copy = await analyzeExisting.mutateAsync({ sourceCvId: cvId, templateId, flowType: "tailor", payLater });
    const copyId = copy.cvDocumentId;
    if (!copyId) throw new Error("Couldn't make a copy of this CV. Please try again.");
    try {
      const result = await refine.mutateAsync({
        cvDocumentId: copyId,
        templateId,
        sourceText: copy.sourceText,
        jobDescription: job,
        requiresRewrite: true,
        enhancementLevel: TAILOR_ENHANCEMENT_LEVEL,
        flowType: "tailor",
        payLater,
      });
      if ("mismatch" in result) {
        await deleteCvDocument(copyId).catch(() => undefined);
        return { mismatch: result };
      }
      return { cvId: copyId };
    } catch (err) {
      // Nothing usable was written: don't leave an untailored copy behind.
      await deleteCvDocument(copyId).catch(() => undefined);
      throw err;
    }
  };

  const tailorInPlace = async (cvId: string, job: string) => {
    const doc = await getCvDocument(cvId);
    const analyzed = await analyzeCv({
      sourceText: serializeCvContentToText(doc.content),
      templateId,
      jobDescription: job,
      enhancementLevel: TAILOR_ENHANCEMENT_LEVEL,
      flowType: "tailor",
      sourceCvId: cvId,
      payLater: false,
    });
    if ("mismatch" in analyzed) return { mismatch: analyzed };
    const saved = await generateCv(cvId, {
      analyzedContent: analyzed.candidateData,
      jobDescription: job,
      enhancementLevel: TAILOR_ENHANCEMENT_LEVEL,
      replaceContent: true,
      chargeToken: analyzed.chargeToken,
    });
    if ("mismatch" in saved) return { mismatch: saved };
    return { cvId };
  };

  const run = async () => {
    if (!mode) return;
    const job = jobDescription.trim();
    setError(null);
    setRunning(true);
    try {
      const cvId = await saveCv();
      const outcome = mode === "copy" ? await tailorCopy(cvId, job) : await atLeastAiWait(tailorInPlace(cvId, job));
      if ("mismatch" in outcome && outcome.mismatch) {
        setMismatch(outcome.mismatch);
        return;
      }
      queryClient.invalidateQueries({ queryKey: CV_DRAFTS_QUERY_KEY });
      await celebrate("tailor");
      if (mode === "copy") onCopyReady(outcome.cvId!);
      else onTailoredInPlace(outcome.cvId!);
    } catch (err) {
      if (proGate.isProRequired(err, mode === "copy" ? () => void run() : undefined)) return;
      setError(flowErrorMessage(err, "Couldn't tailor your CV. Please try again."));
    } finally {
      setRunning(false);
    }
  };

  return (
    <FlowModal
      stepKey={mode ? "job" : "mode"}
      onClose={running ? undefined : onClose}
      loader={(running || aiDone) && <AiWaitLoader wait="tailor" done={aiDone !== null} />}
      outside={
        <>
          <ProUpgradeModal
            isOpen={proGate.isPaywallOpen}
            onClose={proGate.closePaywall}
            paywall={proGate.paywall}
            onPayLater={proGate.canPayLater() ? proGate.continuePayLater : undefined}
          />
          <JobMismatchDialog
            mismatch={mismatch}
            onClose={() => setMismatch(null)}
            options={[
              {
                label: "Try a different job",
                onClick: () => {
                  setMismatch(null);
                  setJobDescription("");
                },
              },
              { label: "Keep my CV as it is", onClick: onClose },
            ]}
          />
        </>
      }
    >
      {!mode ? (
        <div>
          <div className="text-center mb-6">
            <StepEyebrow>Tailor to a job</StepEyebrow>
            <h2 className="text-xl font-bold tracking-tight text-neutral-950">Where should the tailored CV go?</h2>
          </div>
          <div className="space-y-3">
            <OptionCard
              icon={Copy}
              tone="sky"
              title="Save as a new copy"
              description="This CV stays as it is. The tailored version is saved next to it."
              onClick={() => setMode("copy")}
            />
            <OptionCard
              icon={FilePen}
              tone="accent"
              title="Tailor this CV"
              description="Rewrite this CV for the job. Its current wording is replaced."
              onClick={() => setMode("in-place")}
            />
          </div>
        </div>
      ) : (
        <div>
          <div className="text-center mb-5">
            <StepEyebrow>{mode === "copy" ? "Tailor a new copy" : "Tailor this CV"}</StepEyebrow>
            <h2 className="text-xl font-bold tracking-tight text-neutral-950">Paste the job description</h2>
          </div>
          <textarea
            rows={7}
            autoFocus={canAutoFocus()}
            value={jobDescription}
            onChange={(e) => setJobDescription(e.target.value)}
            placeholder="Paste the job posting, or a job title like Senior Accountant"
            className="w-full p-3 mb-4 rounded-xl bg-white border border-neutral-300 text-sm text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:border-accent focus:ring-4 focus:ring-accent/10 resize-none"
          />
          <FlowError message={error} className="mb-4" />
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => {
                setError(null);
                setMode(null);
              }}
              className="w-1/3 py-3 rounded-xl border border-neutral-200 text-sm font-bold text-neutral-700 hover:bg-neutral-100 cursor-pointer"
            >
              Back
            </button>
            <button
              type="button"
              disabled={!jobDescription.trim() || running}
              onClick={() => void run()}
              className="flex-1 py-3 rounded-xl bg-neutral-950 text-sm font-bold text-white hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-40 cursor-pointer"
            >
              Tailor my CV
            </button>
          </div>
        </div>
      )}
    </FlowModal>
  );
}
