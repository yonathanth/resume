"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { AccountGateProvider } from "@/components/account-gate/AccountGate";
import { CreateCvModal } from "@/components/dashboard/create-flow/CreateCvModal";
import { TailorCvModal } from "@/components/dashboard/create-flow/TailorCvModal";
import { EnhanceCvModal } from "@/components/dashboard/create-flow/EnhanceCvModal";
import type { CvData, TemplateId } from "@/components/dashboard/create-flow/types";
import { useCvTemplates } from "@/hooks/use-cv-templates";
import { useHasMounted } from "@/hooks/use-has-mounted";
import { ME_QUERY_KEY } from "@/hooks/use-auth";
import type { QuickIntent } from "@/lib/quick-links";
import { editorHref, ensureSavedCv, fillAccountFromFinishedCv } from "@/lib/finished-cv";
import { track } from "@/lib/analytics";
import { hasSession } from "@/lib/api";
import { forgetPreviousAccount } from "@/lib/browser-account";

export type TryFlowKind = "create" | "tailor" | "improve";

/**
 * The dashboard's own create / tailor / improve flow, on a public page. A
 * visitor goes through it signed out; it asks them to sign up (in a pop-up,
 * over the flow) right before the first AI call, then carries on. Finished,
 * the CV opens on its editor page — and a brand-new account's details are
 * filled in from it, so the dashboard's onboarding doesn't ask for them again.
 */
export function TryFlow({ flow, templateId }: { flow: TryFlowKind; templateId?: string }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  // The flow restores unfinished progress from this browser as it opens, so it's only drawn once in the browser.
  const hasMounted = useHasMounted();
  const { data: templates, isError: templatesFailed } = useCvTemplates();

  // A template from the link is used only if it's one we offer (unknown or hidden ones are ignored).
  const waitingForTemplates = Boolean(templateId) && !templates && !templatesFailed;
  const initialTemplate = templates?.some((t) => t.id === templateId) ? (templateId as TemplateId) : undefined;
  const intent: QuickIntent = flow === "create" && initialTemplate ? { kind: "template", templateId: initialTemplate } : { kind: flow };

  // Once per visit to the page, for the admin's try-first funnel.
  const tracked = useRef(false);
  useEffect(() => {
    if (tracked.current) return;
    tracked.current = true;
    // Signed out: whatever an earlier account left in this browser isn't this
    // visitor's. Dropped before the flow opens (it opens on the next render),
    // so signing up here doesn't wipe the flow they're in the middle of.
    if (!hasSession()) forgetPreviousAccount();
    track("try_started", { flow });
  }, [flow]);

  const close = () => router.push("/");
  // Signed up by now: the CV opens on its editor page, like one finished on the dashboard.
  const finish = async (cv: CvData) => {
    try {
      const id = await ensureSavedCv(cv);
      const user = await fillAccountFromFinishedCv(id, flow);
      if (user) queryClient.setQueryData(ME_QUERY_KEY, user);
      router.replace(editorHref(id, flow));
    } catch {
      router.push("/dashboard");
    }
  };

  return (
    <AccountGateProvider fallbackIntent={intent}>
      <div className="min-h-screen w-full bg-[#fbfbfb]" />
      {hasMounted && !waitingForTemplates && flow === "create" && (
        <CreateCvModal isOpen onClose={close} onComplete={finish} initialTemplate={initialTemplate} />
      )}
      {hasMounted && flow === "tailor" && <TailorCvModal isOpen onClose={close} onComplete={finish} />}
      {hasMounted && flow === "improve" && <EnhanceCvModal isOpen onClose={close} onComplete={finish} />}
    </AccountGateProvider>
  );
}
