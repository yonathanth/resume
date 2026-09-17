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
}

export interface AuthResponse {
  user: ApiUser;
  accessToken: string;
}

export class ApiError extends Error {
  code: string;
  status: number;

  constructor(status: number, code: string, message: string) {
    super(message);
    this.code = code;
    this.status = status;
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
    const error = body?.error ?? { code: "UNKNOWN_ERROR", message: "Something went wrong" };
    throw new ApiError(res.status, error.code, error.message);
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

export function googleAuth(idToken: string) {
  return apiFetch<AuthResponse>("/api/v1/auth/google", {
    method: "POST",
    body: JSON.stringify({ idToken }),
  });
}

export interface ApiCareerProfile {
  id: string;
  title: string;
  isPrimary: boolean;
  // Cached AI summary fields (see getProfileSummary) — present once a
  // summary has been computed for this profile at least once.
  summarySkills?: string[] | null;
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

export interface CVContentDTO {
  personal?: {
    full_name?: string;
    title?: string;
    email?: string;
    phone?: string;
    location?: string;
    links?: { label: string; url: string }[];
  };
  summary?: string;
  experience?: {
    company?: string;
    role?: string;
    location?: string;
    start_date?: string;
    end_date?: string;
    bullets?: string[];
  }[];
  education?: {
    institution?: string;
    degree?: string;
    start_date?: string;
    end_date?: string;
    honors?: string;
  }[];
  skills?: string[];
  certifications?: { name: string }[];
}

export interface ApiCvDocument {
  id: string;
  profileId: string | null;
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
  profileId: string;
  rawText: string | null;
  status: "pending" | "complete" | "failed";
  error: string | null;
}

// Uploads a resume file (pdf/docx/png/jpg/jpeg) for OCR/text extraction —
// backed by pdf-parse, mammoth and tesseract.js on the server. Omit
// profileId for a standalone upload not attached to any career profile.
export function uploadCvImport(file: File, profileId?: string) {
  const formData = new FormData();
  formData.append("file", file);
  const path = profileId
    ? `/api/v1/profiles/${encodeURIComponent(profileId)}/import`
    : "/api/v1/imports";
  return apiFetch<ApiCvImport>(path, {
    method: "POST",
    body: formData,
  });
}

export function listProfiles() {
  return apiFetch<ApiCareerProfile[]>("/api/v1/profiles");
}

// Deduped skills across every CV under the user's real career profiles.
export function getProfileSkills() {
  return apiFetch<{ skills: string[] }>("/api/v1/profiles/skills");
}

export interface ApiProfileSummary {
  domain: string;
  highlight: string;
  skills: string[];
  targetCompanies: string[];
  readinessScore: number;
}

// AI-generated trajectory summary derived from this profile's existing CVs.
export function getProfileSummary(profileId: string) {
  return apiFetch<ApiProfileSummary>(`/api/v1/profiles/${encodeURIComponent(profileId)}/summary`);
}

export function createProfile(title: string) {
  return apiFetch<ApiCareerProfile>("/api/v1/profiles", {
    method: "POST",
    body: JSON.stringify({ title }),
  });
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

// Runs the same combined AI analysis /cv/analyze does, without persisting
// anything — structuring, tailoring, job compatibility, and clarification
// questions all come back together (see the backend's clarification.rules.ts
// for why this stays one AI call).
export function analyzeCv(input: {
  sourceText: string;
  jobDescription?: string;
  name?: string;
  enhancementLevel?: number;
  templateId?: string;
  // A short instruction for what to emphasize/rewrite toward (e.g. the
  // Enhance flow's improvement-goal field) — kept out of sourceText so the
  // AI treats it as a directive, not more candidate narrative.
  focusInstructions?: string;
}) {
  return apiFetch<AnalyzeResult | GenerateCvMismatch>("/api/v1/cv/analyze", {
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
  input: { content?: CVContentDTO; jobDescription?: string | null; title?: string }
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

export function renderCvDocument(cvId: string) {
  return apiFetch<{ pdfPath: string }>(`/api/v1/cv/${cvId}/render`, { method: "POST" });
}

export type PaymentProductType = "CV_DOWNLOAD";
export type PaymentStatus = "PENDING" | "SUCCESS" | "FAILED" | "CANCELLED" | "EXPIRED";

export interface ApiPayment {
  id: string;
  productType: PaymentProductType;
  resourceId: string;
  amount: number;
  currency: string;
  status: PaymentStatus;
  createdAt: string;
  updatedAt: string;
}

export interface InitializePaymentResult {
  paymentId: string;
  // null when the resource was already paid for — nothing to redirect to.
  checkoutUrl: string | null;
  alreadyPaid: boolean;
}

// Creates (or reuses) a pending payment for one specific resource — the
// backend determines the price, never trust an amount from the frontend.
export function initializePayment(input: { productType: PaymentProductType; resourceId: string }) {
  return apiFetch<InitializePaymentResult>("/api/v1/payments/initialize", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

// Re-verifies a still-pending payment against the provider server-side and
// returns its current status — never resolve access from a redirect's query
// string alone, always confirm through this endpoint.
export function getPaymentStatus(paymentId: string) {
  return apiFetch<ApiPayment>(`/api/v1/payments/${paymentId}/status`);
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
