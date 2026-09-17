"use client";

import { useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { readAndClearLastPaymentRedirect } from "@/lib/payment-session";

// This is CHAPA_RETURN_URL's target — Chapa lands the browser here after
// checkout regardless of outcome. It never decides payment success itself
// (that's always re-verified server-side); it only knows which CV to send
// the user back to (embedded as ?cvId= on the return URL we gave Chapa, with
// a sessionStorage breadcrumb as a fallback), and forwards there so
// CvEditorWorkspace's existing verification + download logic can take over.
function ChapaReturnInner() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const cvId = searchParams.get("cvId") || readAndClearLastPaymentRedirect();
    router.replace(cvId ? `/dashboard/editor/${cvId}?resumeDownload=1` : "/dashboard");
  }, [router, searchParams]);

  return (
    <div className="h-screen w-full flex items-center justify-center bg-[#f5f5f7]">
      <span className="text-sm text-neutral-500">Confirming your payment...</span>
    </div>
  );
}

export default function ChapaReturnPage() {
  return (
    <Suspense
      fallback={
        <div className="h-screen w-full flex items-center justify-center bg-[#f5f5f7]">
          <span className="text-sm text-neutral-500">Confirming your payment...</span>
        </div>
      }
    >
      <ChapaReturnInner />
    </Suspense>
  );
}
