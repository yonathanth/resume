const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";
const TOKEN_KEY = "resumate_access_token";

export function getAccessToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(TOKEN_KEY);
}

export function setAccessToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearAccessToken(): void {
  localStorage.removeItem(TOKEN_KEY);
}

export interface ApiUser {
  id: string;
  email: string;
  fullName: string | null;
  firstName: string | null;
  lastName: string | null;
  phone: string | null;
  /** A catalog title or the user's own wording. */
  occupationTitle: string | null;
  /** Set only when occupationTitle matches the catalog. */
  occupationId: string | null;
  onboardingCompleted: boolean;
  /** What happens to a matching career profile when a new CV is made. */
  profileAutoSync: ProfileAutoSync;
  /** False for a Google-only account (it can set a first password). */
  hasPassword: boolean;
  hasGoogle: boolean;
  createdAt: string;
}

export type ProfileAutoSync = "ask" | "always" | "never";

export interface AuthResponse {
  user: ApiUser;
  accessToken: string;
}

export class ApiError extends Error {
  code: string;
  status: number;
  /** Extra fields the error envelope carried beyond code/message (e.g. existingProfileId). */
  details: Record<string, unknown>;

  constructor(status: number, code: string, message: string, details: Record<string, unknown> = {}) {
    super(message);
    this.code = code;
    this.status = status;
    this.details = details;
  }
}

const REFRESH_PATH = "/api/v1/auth/refresh";

// Dedupes concurrent 401s during a single access-token refresh so parallel
// requests don't each fire their own /auth/refresh call.
let refreshPromise: Promise<string | null> | null = null;

function requestRefresh(): Promise<string | null> {
  if (!refreshPromise) {
    refreshPromise = fetch(`${API_URL}${REFRESH_PATH}`, {
      method: "POST",
      credentials: "include",
    })
      .then(async (res) => {
        if (!res.ok) return null;
        const body = await res.json().catch(() => null);
        const newToken = body?.data?.accessToken as string | undefined;
        if (!newToken) return null;
        setAccessToken(newToken);
        return newToken;
      })
      .catch(() => null)
      .finally(() => {
        refreshPromise = null;
      });
  }
  return refreshPromise;
}

// Exchanges the httpOnly refresh cookie for a fresh access token (stored on
// success). Resolves null when there's no valid session.
export function refreshAccessToken(): Promise<string | null> {
  return requestRefresh();
}

export async function apiFetch<T>(path: string, options: RequestInit = {}, isRetry = false): Promise<T> {
  const token = getAccessToken();
  const headers = new Headers(options.headers);
  // FormData (file uploads) must keep the browser-generated multipart
  // boundary — never force JSON headers onto it. And a bodyless request
  // (e.g. DELETE) must not claim a JSON content-type at all — Fastify
  // rejects "Content-Type: application/json" paired with an empty body.
  if (options.body !== undefined && !(options.body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }
  if (token) headers.set("Authorization", `Bearer ${token}`);

  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers,
    credentials: "include",
  });

  // Access tokens expire after 15 minutes; the refresh token lives in an
  // httpOnly cookie, so on a 401 we silently rotate the access token and
  // retry the request once before giving up.
  if (res.status === 401 && token && !isRetry && path !== REFRESH_PATH) {
    const newToken = await requestRefresh();
    if (newToken) {
      return apiFetch<T>(path, options, true);
    }
    clearAccessToken();
    if (typeof window !== "undefined" && window.location.pathname !== "/login") {
      window.location.href = "/login";
    }
  }

  const body = await res.json().catch(() => null);

  if (!res.ok || body?.error) {
    const { code = "UNKNOWN_ERROR", message = "Something went wrong", ...details } = body?.error ?? {};
    throw new ApiError(res.status, code, message, details);
  }

  return body.data as T;
}

export function register(email: string, password: string) {
  return apiFetch<AuthResponse>("/api/v1/auth/register", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
}

export function login(email: string, password: string) {
  return apiFetch<AuthResponse>("/api/v1/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
}

// Redirect-based Google sign-in: a full-page navigation to the backend, which
// bounces through Google and lands back on /auth/google with a refresh cookie.
export function googleSignInUrl() {
  return `${API_URL}/api/v1/auth/google/start`;
}

export function googleAuth(idToken: string) {
  return apiFetch<AuthResponse>("/api/v1/auth/google", {
    method: "POST",
    body: JSON.stringify({ idToken }),
  });
}

// The current user's real profile — the source of truth for the settings
// page (never hardcode a display name/email).
export function getMe() {
  return apiFetch<ApiUser>("/api/v1/auth/me");
}

export interface UpdateMeInput {
  fullName?: string;
  email?: string;
  firstName?: string;
  lastName?: string;
  /** "" clears it. */
  phone?: string;
  occupationTitle?: string;
  completeOnboarding?: true;
  profileAutoSync?: ProfileAutoSync;
}

export function updateMe(input: UpdateMeInput) {
  return apiFetch<ApiUser>("/api/v1/auth/me", {
    method: "PATCH",
    body: JSON.stringify(input),
  });
}

export interface OccupationSuggestion {
  id: string;
  title: string;
  category: string;
}

// Typeahead over the curated occupation catalog (onboarding, Account settings).
export function searchOccupations(q: string, limit = 8) {
  return apiFetch<OccupationSuggestion[]>(`/api/v1/occupations?q=${encodeURIComponent(q)}&limit=${limit}`);
}

// Changes the password, or sets a first one on a Google-only account (omit
// currentPassword). Signs out every other device; this one stays signed in.
export function changePassword(input: { currentPassword?: string; newPassword: string }) {
  return apiFetch<ApiUser>("/api/v1/auth/password", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

// Permanently deletes the account. Re-confirm with the password, or — for a
// Google-only account — by typing the account email back.
export function deleteAccount(input: { password?: string; confirmEmail?: string }) {
  return apiFetch<{ success: boolean }>("/api/v1/auth/me", {
    method: "DELETE",
    body: JSON.stringify(input),
  });
}

// Ends every session on every device, including this one.
export function logoutAll() {
  return apiFetch<{ success: boolean }>("/api/v1/auth/logout-all", { method: "POST" });
}

// Best-effort — clears the httpOnly refresh cookie server-side. The access
// token itself is cleared client-side regardless (see useLogout).
export function logout() {
  return apiFetch<{ success: boolean }>("/api/v1/auth/logout", { method: "POST" });
}

// ---- Career profiles (see the backend's schemas/profile-content.schema.ts)

export type ProfileItemSource = "manual" | "cv" | "upload" | "freestyle" | "clarification" | "enhance";

export interface ProfileItemMeta {
  source: ProfileItemSource;
  sourceCvId?: string;
  /** True once edited by hand — automatic merges never touch it. */
  locked: boolean;
  aliases?: string[];
  addedAt: string;
  updatedAt?: string;
}

/** Every list item in profile content. The server owns `id` and `meta`; new items are sent without them. */
export type ProfileItem<T> = T & { id?: string; meta?: ProfileItemMeta };

export type ProfileBullet = { id?: string; label?: string; text: string };
type ArrayItem<T> = T extends readonly (infer U)[] ? U : never;
type CvItem<K extends keyof CVContentDTO> = ArrayItem<NonNullable<CVContentDTO[K]>>;
type WithBullets<T> = Omit<T, "bullets"> & { bullets: ProfileBullet[] };

export interface ProfileContentDTO {
  headline?: string;
  summary?: string;
  location?: string;
  interests: string[];
  links: ProfileItem<{ label: string; url: string }>[];
  experience: ProfileItem<WithBullets<CvItem<"experience">> & { company: string; role: string }>[];
  education: ProfileItem<WithBullets<CvItem<"education">> & { institution: string }>[];
  projects: ProfileItem<WithBullets<CvItem<"projects">> & { name: string }>[];
  certifications: ProfileItem<CvItem<"certifications"> & { name: string }>[];
  languages: ProfileItem<CvItem<"languages"> & { language: string }>[];
  awards: ProfileItem<CvItem<"awards"> & { title: string }>[];
  publications: ProfileItem<CvItem<"publications"> & { title: string }>[];
  volunteering: ProfileItem<WithBullets<CvItem<"volunteering">> & { organization: string }>[];
  courses: ProfileItem<CvItem<"courses"> & { name: string }>[];
  memberships: ProfileItem<CvItem<"memberships"> & { organization: string }>[];
  presentations: ProfileItem<CvItem<"presentations"> & { title: string }>[];
  references: ProfileItem<CvItem<"references"> & { name: string }>[];
  personalDetails: ProfileItem<{ label: string; value: string }>[];
  research: ProfileItem<WithBullets<CVPositionDTO> & { title: string }>[];
  teaching: ProfileItem<WithBullets<CVPositionDTO> & { title: string }>[];
  activities: ProfileItem<WithBullets<CVPositionDTO> & { title: string }>[];
  skills: ProfileItem<{ name: string }>[];
  skillGroups: ProfileItem<{ category: string; items: string[] }>[];
  dismissedKeys?: string[];
}

export type ProfileSection = Exclude<keyof ProfileContentDTO, "headline" | "summary" | "location" | "interests" | "dismissedKeys">;

export interface ProfileChangeSummary {
  added: Partial<Record<string, number>>;
  updated: Partial<Record<string, number>>;
  removed: Partial<Record<string, number>>;
}

export interface ApiCareerProfile {
  id: string;
  title: string;
  roleKey: string;
  seniority: string | null;
  occupationId: string | null;
  occupationTitle: string | null;
  occupationCategory: string | null;
  origin: "manual" | "cv";
  version: number;
  headline: string | null;
  counts: Partial<Record<ProfileSection, number>>;
  documentCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface ApiProfileChange {
  id: string;
  kind: "create" | "manual_edit" | "merge_cv" | "wording" | "revert";
  cvDocumentId: string | null;
  fromVersion: number;
  toVersion: number;
  summary: (Partial<ProfileChangeSummary> & Record<string, unknown>) | null;
  createdAt: string;
}

export interface ApiCareerProfileDetail extends ApiCareerProfile {
  content: ProfileContentDTO;
  documents: {
    id: string;
    title: string | null;
    templateId: string;
    status: string;
    profileVersion: number | null;
    tailored: boolean;
    createdAt: string;
    updatedAt: string;
  }[];
  changes: ApiProfileChange[];
}

export interface ClarificationQuestion {
  id: string;
  question: string;
  reason: string;
  type: "text" | "textarea" | "select" | "date";
  required: boolean;
  options?: string[];
}

export interface JobAnalysis {
  mismatch: false;
  gaps?: string[];
}

// Mirrors the backend's cv-content.schema.ts. A bullet is `{ label?, text }`;
// content saved before bullets were structured may still hold plain strings,
// so readers accept both (see cv-mapper.ts's toBullet).
export interface CVBulletDTO {
  label?: string;
  text?: string;
}

export interface CVContentDTO {
  personal?: {
    full_name?: string;
    title?: string;
    email?: string;
    phone?: string;
    location?: string;
    links?: { label?: string; url?: string }[];
    /** data:image/...;base64 — uploaded in the editor, never AI-generated. */
    photo?: string;
  };
  summary?: string;
  experience?: {
    company?: string;
    role?: string;
    location?: string;
    url?: string;
    start_date?: string;
    end_date?: string;
    bullets?: (CVBulletDTO | string)[];
  }[];
  education?: {
    institution?: string;
    degree?: string;
    field?: string;
    location?: string;
    gpa?: string;
    start_date?: string;
    end_date?: string;
    honors?: string;
    bullets?: (CVBulletDTO | string)[];
  }[];
  skills?: string[];
  skillGroups?: { category?: string; items?: string[] }[];
  certifications?: { name?: string; issuer?: string; date?: string; expires?: string; url?: string }[];
  projects?: {
    name?: string;
    subtitle?: string;
    description?: string;
    tech?: string[];
    url?: string;
    bullets?: (CVBulletDTO | string)[];
  }[];
  languages?: { language?: string; proficiency?: string }[];
  awards?: { title?: string; issuer?: string; date?: string; description?: string }[];
  publications?: { title?: string; authors?: string; venue?: string; date?: string; url?: string }[];
  volunteering?: {
    organization?: string;
    role?: string;
    location?: string;
    start_date?: string;
    end_date?: string;
    bullets?: (CVBulletDTO | string)[];
  }[];
  courses?: { name?: string; institution?: string; date?: string }[];
  memberships?: { organization?: string; role?: string; start_date?: string; end_date?: string }[];
  presentations?: { title?: string; event?: string; date?: string; url?: string }[];
  interests?: string[];
  references?: {
    name?: string;
    title?: string;
    organization?: string;
    relationship?: string;
    email?: string;
    phone?: string;
  }[];
  personalDetails?: { label?: string; value?: string }[];
  research?: CVPositionDTO[];
  teaching?: CVPositionDTO[];
  activities?: CVPositionDTO[];
  consent?: string;
}

/** Research, teaching and activities share the experience-like shape. */
export interface CVPositionDTO {
  title?: string;
  organization?: string;
  location?: string;
  start_date?: string;
  end_date?: string;
  bullets?: (CVBulletDTO | string)[];
}

export interface ApiCvDocument {
  id: string;
  profileId: string | null;
  profileVersion?: number | null;
  // The document's own display name, distinct from content.personal.title
  // (the candidate's job title/headline inside the CV itself).
  title: string | null;
  templateId: string;
  content: CVContentDTO;
  status: string;
  createdAt: string;
  updatedAt: string;
  // Only present on the response from generateCv() when it actually ran the
  // AI (as opposed to persisting an already-analyzed candidateData).
  questions?: ClarificationQuestion[];
  jobAnalysis?: JobAnalysis | null;
}

export interface AnalyzeResult {
  candidateData: CVContentDTO;
  questions: ClarificationQuestion[];
  jobAnalysis: JobAnalysis | null;
}

export interface GenerateCvMismatch {
  mismatch: true;
  reason: string;
  missing: string[];
}

export interface ApiCvImport {
  id: string;
  rawText: string | null;
  // Best-effort regex guesses from the extracted text (see the backend's
  // importExtraction.service.ts).
  extractedData: { personal?: { full_name?: string; email?: string; phone?: string } } | null;
  status: "pending" | "complete" | "failed";
  error: string | null;
}

// Uploads a resume file (pdf/docx/png/jpg/jpeg) for OCR/text extraction —
// backed by pdf-parse, mammoth and tesseract.js on the server.
export function uploadCvImport(file: File) {
  const formData = new FormData();
  formData.append("file", file);
  return apiFetch<ApiCvImport>("/api/v1/imports", {
    method: "POST",
    body: formData,
  });
}

const profilePath = (id: string) => `/api/v1/profiles/${encodeURIComponent(id)}`;

export function listProfiles() {
  return apiFetch<ApiCareerProfile[]>("/api/v1/profiles");
}

export function getProfile(id: string) {
  return apiFetch<ApiCareerProfileDetail>(profilePath(id));
}

/** Pro only. 409 PROFILE_ROLE_EXISTS (details.existingProfileId) when the role already has a profile. */
export function createProfile(input: {
  title: string;
  occupationId?: string;
  content?: Partial<ProfileContentDTO>;
  copyFromProfileId?: string;
}) {
  return apiFetch<ApiCareerProfileDetail>("/api/v1/profiles", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

/** Pro only. `version` is the one the client loaded — 409 PROFILE_VERSION_CONFLICT if it changed since. */
export function updateProfile(
  id: string,
  input: { version: number; title?: string; occupationId?: string | null; content?: ProfileContentDTO }
) {
  return apiFetch<ApiCareerProfileDetail>(profilePath(id), {
    method: "PATCH",
    body: JSON.stringify(input),
  });
}

export function deleteProfile(id: string) {
  return apiFetch<{ success: boolean }>(profilePath(id), { method: "DELETE" });
}

export function revertProfileChange(id: string, changeId: string, version: number) {
  return apiFetch<ApiCareerProfileDetail>(`${profilePath(id)}/changes/${encodeURIComponent(changeId)}/revert`, {
    method: "POST",
    body: JSON.stringify({ version }),
  });
}

/** The profile in CV shape (account contact details filled in) — the source for a new CV. */
export function getProfileCvContent(id: string) {
  return apiFetch<{ content: CVContentDTO; profileVersion: number }>(`${profilePath(id)}/cv-content`);
}

export interface WordingProposal {
  /** "summary", or "<section>:<profile item id>" — what gets sent back to approve it. */
  key: string;
  section: ProfileSection | "summary";
  label: string;
  before: string[];
  after: string[];
  /** The user edited this entry by hand before. */
  locked: boolean;
}

export interface WordingPreview {
  profile: { id: string; title: string; version: number } | null;
  reason: "tailored" | "no_profile" | "updates_off" | null;
  proposals: WordingProposal[];
}

/** Enhance: improved wording that differs from the profile, entry by entry. Read-only. Pro only. */
export function previewCvWording(input: { cvDocumentId: string; sourceCvId?: string }) {
  return apiFetch<WordingPreview>("/api/v1/profiles/wording/preview", { method: "POST", body: JSON.stringify(input) });
}

/** Saves the approved proposals (by key) to the profile and links the CV. */
export function applyCvWording(profileId: string, input: { cvDocumentId: string; version: number; keys: string[] }) {
  return apiFetch<{ profile: ApiCareerProfileDetail; applied: number; changeId: string | null }>(
    `${profilePath(profileId)}/wording`,
    { method: "POST", body: JSON.stringify(input) }
  );
}

export interface ProfileSuggestion {
  roleTitle: string | null;
  /** The profile this CV is the same role as, and what merging would change. */
  match: { profileId: string; title: string; via: "role" | "occupation" | "ai"; preview: ProfileChangeSummary } | null;
  /** Related roles — offered as "add to this instead", never merged automatically. */
  related: { profileId: string; title: string }[];
  newProfilePreview: ProfileChangeSummary;
  linkedProfileId: string | null;
  autoSync: ProfileAutoSync;
}

/** Which profile a new CV belongs to, and what saving it would change. Read-only. Pro only. */
export function suggestProfileForCv(input: { cvDocumentId: string; factsOnly?: boolean }) {
  return apiFetch<ProfileSuggestion>("/api/v1/profiles/suggest-for-cv", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

/**
 * Creates a profile from a CV (omit profileId) or merges the CV into one, and
 * links the CV. Pro only. `changeId` (when something changed) can be passed
 * to revertProfileChange to undo.
 */
export function syncCvIntoProfile(input: {
  cvDocumentId: string;
  profileId?: string;
  title?: string;
  occupationId?: string;
  factsOnly?: boolean;
}) {
  return apiFetch<{ profile: ApiCareerProfileDetail; summary: ProfileChangeSummary; created: boolean; changeId: string | null }>(
    "/api/v1/profiles/from-cv",
    { method: "POST", body: JSON.stringify(input) }
  );
}

// Omit profileId to create a standalone CV not attached to any career profile.
export function createCvDocument(profileId?: string, templateId = "default") {
  return apiFetch<ApiCvDocument>("/api/v1/cv", {
    method: "POST",
    body: JSON.stringify({ profileId, templateId }),
  });
}

// Omit profileId to list every CV document the user owns — across all of
// their career profiles and standalone (unattached) documents alike.
export function listCvDocuments(profileId?: string) {
  const query = profileId ? `?profileId=${encodeURIComponent(profileId)}` : "";
  return apiFetch<ApiCvDocument[]>(`/api/v1/cv${query}`);
}

export function getCvDocument(cvId: string) {
  return apiFetch<ApiCvDocument>(`/api/v1/cv/${encodeURIComponent(cvId)}`);
}

export function deleteCvDocument(cvId: string) {
  return apiFetch<{ success: boolean }>(`/api/v1/cv/${encodeURIComponent(cvId)}`, {
    method: "DELETE",
  });
}

// Which dashboard tab a CV flow started from — one free use each,
// one-time-only (see entitlement.service.ts on the backend).
export type CvFlowType = "create" | "tailor" | "improve";

// Runs the same combined AI analysis /cv/analyze does, without persisting
// anything — structuring, tailoring, job compatibility, and clarification
// questions all come back together (see the backend's clarification.rules.ts
// for why this stays one AI call).
export function analyzeCv(input: {
  sourceText: string;
  jobDescription?: string;
  name?: string;
  email?: string;
  enhancementLevel?: number;
  templateId?: string;
  // A short instruction for what to emphasize/rewrite toward (e.g. the
  // Enhance flow's improvement-goal field) — kept out of sourceText so the
  // AI treats it as a directive, not more candidate narrative.
  focusInstructions?: string;
  // Required to start a brand new flow (charges that tab's one free use).
  // Omit only when cvDocumentId is set.
  flowType?: CvFlowType;
  // Set only for a flow's own refine/re-analysis call, once the document
  // already exists — marks this as a continuation already paid for by the
  // flow's first analyze call, so no second free use is spent.
  cvDocumentId?: string;
}) {
  return apiFetch<AnalyzeResult | GenerateCvMismatch>("/api/v1/cv/analyze", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

// Stateless AI rewrite of just the summary field — grounded by (but never
// adding facts from) the rest of the CV. Powers the editor's "AI Polish"
// action on the Summary section.
export function polishSummary(input: {
  summary: string;
  title?: string;
  skills?: string[];
  experienceBullets?: string[];
}) {
  return apiFetch<{ summary: string }>("/api/v1/cv/polish-summary", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

// Persists a CV document. Either pass sourceText (runs the AI here, same as
// analyzeCv) or analyzedContent (the candidateData from a prior analyzeCv()
// call — skips the AI call and just validates + saves it).
export function generateCv(
  cvId: string,
  input: {
    sourceText?: string;
    analyzedContent?: CVContentDTO;
    jobDescription?: string;
    name?: string;
    enhancementLevel?: number;
    focusInstructions?: string;
    /** Replace the document's content instead of only filling empty fields
     * — for a deliberate re-generation (refine), not a first fill. */
    replaceContent?: boolean;
  }
) {
  return apiFetch<ApiCvDocument | GenerateCvMismatch>(`/api/v1/cv/${cvId}/generate`, {
    method: "POST",
    body: JSON.stringify(input),
  });
}

// null detaches the document from any career profile.
export function moveCvDocumentProfile(cvId: string, profileId: string | null) {
  return apiFetch<ApiCvDocument>(`/api/v1/cv/${cvId}/profile`, {
    method: "PATCH",
    body: JSON.stringify({ profileId }),
  });
}

export function updateCvContent(
  cvId: string,
  input: { content?: CVContentDTO; jobDescription?: string | null; title?: string; templateId?: string }
) {
  return apiFetch<ApiCvDocument>(`/api/v1/cv/${cvId}`, {
    method: "PATCH",
    body: JSON.stringify(input),
  });
}

// Validates the document is complete (personal, >=1 experience, >=1 skill)
// and marks it "final" — required before it can be rendered to PDF. Throws
// an ApiError with code INCOMPLETE_DOCUMENT (422) if required fields are
// missing, or leaves an already-final document as-is.
export function finalizeCvDocument(cvId: string) {
  return apiFetch<ApiCvDocument>(`/api/v1/cv/${cvId}/finalize`, { method: "POST" });
}

export type PaymentStatus = "PENDING" | "SUCCESS" | "FAILED" | "CANCELLED" | "EXPIRED";

// A Chapa payment record — today only "PRO_SUBSCRIPTION" (a 1-month FitCV
// Pro period; Chapa can't auto-renew, see the backend's grantChapaProPeriod).
export interface ApiPayment {
  id: string;
  productType: string;
  resourceId: string;
  amount: number;
  currency: string;
  status: PaymentStatus;
  createdAt: string;
  updatedAt: string;
}

// Re-verifies a still-pending Chapa payment against Chapa server-side and
// returns its current status (this is what actually grants the Pro period
// on success, alongside Chapa's own webhook) — never resolve access from a
// redirect's query string alone, always confirm through this endpoint. Used
// by the Chapa return page after a Pro-subscription checkout.
export function getPaymentStatus(paymentId: string) {
  return apiFetch<ApiPayment>(`/api/v1/payments/${paymentId}/status`);
}

// Mirrors the backend's Polar SubscriptionStatus verbatim, plus "revoked"
// for a hard revocation — see fitcv-backend's entitlement.service.ts. Null
// until the user's first Polar subscription event has synced.
export type SubscriptionStatus =
  | "incomplete"
  | "incomplete_expired"
  | "trialing"
  | "active"
  | "past_due"
  | "canceled"
  | "unpaid"
  | "paused"
  | "revoked"
  | null;

export type SubscriptionProvider = "POLAR" | "CHAPA" | null;

export interface SubscriptionStatusResult {
  isPro: boolean;
  // One free use per dashboard tab, one-time-only — not a shared pool.
  freeCreateUsed: boolean;
  freeTailorUsed: boolean;
  freeImproveUsed: boolean;
  subscriptionStatus: SubscriptionStatus;
  subscriptionProvider: SubscriptionProvider;
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
  // True once the user has been Pro before (either provider) but isn't
  // currently — shows a "your plan expired, renew" prompt instead of a
  // first-time upgrade pitch.
  isExpired: boolean;
}

// The single source of truth for Pro access and free-generation usage —
// never derive either from client-side state.
export function getSubscriptionStatus() {
  return apiFetch<SubscriptionStatusResult>("/api/v1/subscriptions/status");
}

export type CheckoutProvider = "polar" | "chapa";

export interface CheckoutResult {
  checkoutUrl: string;
  // Only present for the Chapa path — the frontend needs this to force a
  // re-verify (getPaymentStatus) when the user returns from Chapa's
  // checkout, since Chapa's webhook can lag.
  paymentId?: string;
}

// Starts a checkout with the chosen provider for FitCV Pro. Polar is a real
// recurring $5/month subscription; Chapa (local-market alternative, no
// auto-renewal) sells a fixed 1-month period for 80 ETB per payment. The
// backend identifies the user from the auth token — never pass a user id
// here.
export function createSubscriptionCheckout(provider: CheckoutProvider) {
  return apiFetch<CheckoutResult>("/api/v1/subscriptions/checkout", {
    method: "POST",
    body: JSON.stringify({ provider }),
  });
}

// Schedules cancellation at the end of the current billing period — Pro
// access and the subscription stay active until then, nothing already paid
// is refunded, and it simply won't renew afterward. Never an immediate
// revoke. Returns the same shape as getSubscriptionStatus().
export function cancelSubscription() {
  return apiFetch<SubscriptionStatusResult>("/api/v1/subscriptions/cancel", { method: "POST" });
}

// Reverses a pending cancel-at-period-end — the subscription goes back to
// renewing normally.
export function resumeSubscription() {
  return apiFetch<SubscriptionStatusResult>("/api/v1/subscriptions/resume", { method: "POST" });
}

// Not run through apiFetch: the response body is a raw PDF stream, not JSON.
export async function downloadCvPdf(cvId: string): Promise<Blob> {
  const token = getAccessToken();
  const headers = new Headers();
  if (token) headers.set("Authorization", `Bearer ${token}`);

  const res = await fetch(`${API_URL}/api/v1/cv/${encodeURIComponent(cvId)}/download`, {
    headers,
    credentials: "include",
  });

  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new ApiError(
      res.status,
      body?.error?.code ?? "DOWNLOAD_FAILED",
      body?.error?.message ?? "Could not download the PDF"
    );
  }

  return res.blob();
}

export interface ApiCvTemplate {
  id: string;
  name: string;
  description: string;
  /** Gallery grouping: "Simple" | "Professional" | "Academic" | "Two-column". */
  category: string;
  hasPhoto: boolean;
  twoColumn: boolean;
  /** Catalog sections the template renders, in order — also the editor's section list. */
  sections: { key: string; label: string }[];
  /** Sections the AI asks about when the user's material has nothing for them. */
  askIfMissing: string[];
  isDefault: boolean;
}

// The templates the backend can actually render (preview and PDF share them).
export function listCvTemplates() {
  return apiFetch<ApiCvTemplate[]>("/api/v1/templates");
}

// Renders unsaved editor content with the same template the PDF download
// uses — the editor shows this HTML in an iframe, so the preview is the PDF.
export function previewCvHtml(templateId: string, content: CVContentDTO, showMissing = false) {
  return apiFetch<{ html: string }>("/api/v1/cv/preview", {
    method: "POST",
    body: JSON.stringify({ templateId, content, showMissing }),
  });
}

// The real PDF of unsaved editor content (no save, no finalize) — "Preview PDF".
export async function previewCvPdf(templateId: string, content: CVContentDTO): Promise<Blob> {
  const token = getAccessToken();
  const headers = new Headers({ "Content-Type": "application/json" });
  if (token) headers.set("Authorization", `Bearer ${token}`);

  const res = await fetch(`${API_URL}/api/v1/cv/preview/pdf`, {
    method: "POST",
    headers,
    credentials: "include",
    body: JSON.stringify({ templateId, content }),
  });

  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new ApiError(
      res.status,
      body?.error?.code ?? "PREVIEW_FAILED",
      body?.error?.message ?? "Could not create the PDF preview"
    );
  }

  return res.blob();
}

// One of the user's saved CVs rendered with its own template — for resume cards.
export function getCvThumbnail(cvId: string) {
  return apiFetch<{ html: string }>(`/api/v1/cv/${encodeURIComponent(cvId)}/thumbnail`);
}

// A template rendered with a fictional sample CV — for gallery thumbnails.
// `persona` picks one of several sample people (the backend wraps it around).
export interface CvTemplateSample {
  html: string;
  persona: number;
  personaCount: number;
  /** The sample person's headline, e.g. "Data Analyst". */
  label: string;
}

export function getCvTemplateSample(templateId: string, persona = 0) {
  return apiFetch<CvTemplateSample>(`/api/v1/templates/${encodeURIComponent(templateId)}/sample?persona=${persona}`);
}
