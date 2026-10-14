"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useCvTemplates } from "@/hooks/use-cv-templates";
import { consumeQuickIntent, peekQuickIntent } from "@/lib/quick-links";
import { latestFlowDraft } from "@/lib/flow-drafts";
import { readOpenFlow } from "@/lib/flow-url";
import type { CreateDraft } from "./create-flow/CreateCvModal";
import { useDashboard } from "./DashboardContext";
import type { TemplateId } from "./create-flow/types";

/**
 * Opens what a quick link (/go/...) asked for, once someone is in the
 * dashboard — straight away when they were already signed in, or right after
 * they sign up or log in — or, after a refresh or a trip to checkout, the flow they hadn't
 * finished (it restores its own progress). Waits for `ready` (no onboarding
 * or welcome over the page) so it opens on a clear screen. Renders nothing.
 */
export function QuickLinkLauncher({ ready }: { ready: boolean }) {
  const router = useRouter();
  const { handleNewResume, handleUseTemplate, openFlow } = useDashboard();
  const { data: templates, isError: templatesFailed } = useCvTemplates();
  const launched = useRef(false);

  useEffect(() => {
    if (!ready || launched.current) return;
    const pending = peekQuickIntent();
    if (!pending) {
      // An unfinished flow (e.g. back from checkout): reopen it the way it was
      // opened. Not when the URL already has one open (a refresh) — that's it.
      const draft = latestFlowDraft<Partial<CreateDraft>>();
      if (!draft || readOpenFlow(new URLSearchParams(window.location.search))) return;
      launched.current = true;
      if (draft.kind !== "create") openFlow(draft.kind);
      else openFlow("create", { profile: draft.data.openedWith?.profileId, template: draft.data.openedWith?.template });
      return;
    }
    // A template link needs the list, to check the template is one we offer.
    if (pending.kind === "template" && !templates && !templatesFailed) return;

    launched.current = true;
    const intent = consumeQuickIntent();
    if (!intent) return;
    switch (intent.kind) {
      case "create":
        handleNewResume();
        break;
      case "tailor":
      case "improve":
        openFlow(intent.kind);
        break;
      case "template":
        // A template that isn't offered (unknown, or hidden) still starts a CV, just without it.
        if (templates?.some((t) => t.id === intent.templateId)) handleUseTemplate(intent.templateId as TemplateId);
        else handleNewResume();
        break;
      case "pro":
        router.push("/dashboard/upgrade");
        break;
    }
  }, [ready, templates, templatesFailed, handleNewResume, handleUseTemplate, openFlow, router]);

  return null;
}
