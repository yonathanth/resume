"use client";

import { useEffect, useRef } from "react";
import { deleteCvDocument } from "@/lib/api";

// The create/tailor/enhance flows persist a real CVDocument mid-flow (so the
// AI's analyze → refine steps have something to update), but that document
// should never outlive an abandoned session — a CV only "exists" once the
// user actually finishes the flow and opens it in Studio. This hook deletes
// the in-progress document if: (a) a later step in the same session creates
// a new document that supersedes it (e.g. re-analyzing after going back), or
// (b) the modal is closed before the flow completes. Call `markCompleted()`
// right before the final `onComplete(...)` call in each modal's finish
// handler so a successfully finished CV is never touched.
export function useDraftCvLifecycle(isOpen: boolean, cvDocumentId: string | null) {
  const prevIdRef = useRef<string | null>(null);
  const completedRef = useRef(false);
  const wasOpenRef = useRef(isOpen);

  // A new document superseded an uncommitted one from earlier in this same
  // session — clean up the orphan it left behind.
  useEffect(() => {
    const prevId = prevIdRef.current;
    if (prevId && prevId !== cvDocumentId && !completedRef.current) {
      deleteCvDocument(prevId).catch(() => {});
    }
    prevIdRef.current = cvDocumentId;
  }, [cvDocumentId]);

  // The modal was closed before the flow completed — clean up whatever
  // in-progress document exists, then reset for the next time it opens.
  useEffect(() => {
    if (wasOpenRef.current && !isOpen) {
      if (prevIdRef.current && !completedRef.current) {
        deleteCvDocument(prevIdRef.current).catch(() => {});
      }
      prevIdRef.current = null;
      completedRef.current = false;
    }
    wasOpenRef.current = isOpen;
  }, [isOpen]);

  // The modal's whole component tree was unmounted outright (e.g. the user
  // navigated to a different page mid-flow) rather than closed via its own
  // close button — the `isOpen` effect above never runs in that case, so
  // this is the last chance to clean up an abandoned document.
  useEffect(() => {
    return () => {
      if (prevIdRef.current && !completedRef.current) {
        deleteCvDocument(prevIdRef.current).catch(() => {});
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const markCompleted = () => {
    completedRef.current = true;
  };

  return { markCompleted };
}
