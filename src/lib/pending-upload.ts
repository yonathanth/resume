// A CV file picked during onboarding ("I have a CV to improve"), handed to
// the Improve flow when it opens, so they don't have to pick it twice. Kept in
// memory only (a File can't be stored): a refresh in between just means
// picking it again in the flow.

let pending: File | null = null;

export function setPendingUpload(file: File | null) {
  pending = file;
}

/** The handed-over file, without taking it (safe to call during render). */
export function peekPendingUpload(): File | null {
  return pending;
}

/** The handed-over file, once: whoever takes it owns it. */
export function takePendingUpload(): File | null {
  const file = pending;
  pending = null;
  return file;
}
