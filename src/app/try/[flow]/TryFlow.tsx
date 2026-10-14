"use client";

import { useRouter } from "next/navigation";
import { AccountGateProvider } from "@/components/account-gate/AccountGate";
import { CreateCvModal } from "@/components/dashboard/create-flow/CreateCvModal";
import { TailorCvModal } from "@/components/dashboard/create-flow/TailorCvModal";
import { EnhanceCvModal } from "@/components/dashboard/create-flow/EnhanceCvModal";
import type { CvData, TemplateId } from "@/components/dashboard/create-flow/types";
import { useCvTemplates } from "@/hooks/use-cv-templates";
import { useHasMounted } from "@/hooks/use-has-mounted";
import type { QuickIntent } from "@/lib/quick-links";
import { editorHref, ensureSavedCv } from "@/lib/finished-cv";

export type TryFlowKind = "create" | "tailor" | "improve";

/**
 * The dashboard's own create / tailor / improve flow, on a public page. A
 * visitor goes through it signed out; it asks them to sign up (in a pop-up,
 * over the flow) right before the first AI call, then carries on. Finished,
 * the CV opens on its editor page.
 */
export function TryFlow({ flow, templateId }: { flow: TryFlowKind; templateId?: string }) {
  const router = useRouter();
  // The flow restores unfinished progress from this browser as it opens, so it's only drawn once in the browser.
  const hasMounted = useHasMounted();
  const { data: templates, isError: templatesFailed } = useCvTemplates();

  // A template from the link is used only if it's one we offer (unknown or hidden ones are ignored).
  const waitingForTemplates = Boolean(templateId) && !templates && !templatesFailed;
  const initialTemplate = templates?.some((t) => t.id === templateId) ? (templateId as TemplateId) : undefined;
  const intent: QuickIntent = flow === "create" && initialTemplate ? { kind: "template", templateId: initialTemplate } : { kind: flow };

  const close = () => router.push("/");
  // Signed up by now: the CV opens on its editor page, like one finished on the dashboard.
  const finish = async (cv: CvData) => {
    try {
      router.replace(editorHref(await ensureSavedCv(cv)));
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
