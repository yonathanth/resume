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
  // boundary — never force JSON headers onto it.
  if (!(options.body instanceof FormData)) {
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
  profileId: string;
  templateId: string;
  content: CVContentDTO;
  status: string;
  createdAt: string;
  updatedAt: string;
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
// backed by pdf-parse, mammoth and tesseract.js on the server.
export function uploadCvImport(profileId: string, file: File) {
  const formData = new FormData();
  formData.append("file", file);
  return apiFetch<ApiCvImport>(`/api/v1/profiles/${encodeURIComponent(profileId)}/import`, {
    method: "POST",
    body: formData,
  });
}

export function listProfiles() {
  return apiFetch<ApiCareerProfile[]>("/api/v1/profiles");
}

// The hidden per-user bucket profile for CVs generated via "Skip & Open
// Studio Directly" — created lazily on the backend, never shown in the
// regular profiles list.
export function getUnfiledProfile() {
  return apiFetch<ApiCareerProfile>("/api/v1/profiles/default");
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

export function createCvDocument(profileId: string, templateId = "default") {
  return apiFetch<ApiCvDocument>("/api/v1/cv", {
    method: "POST",
    body: JSON.stringify({ profileId, templateId }),
  });
}

// Omit profileId to list every CV document the user owns across all of
// their career profiles (including the hidden "Unfiled CVs" bucket).
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

export function generateCv(
  cvId: string,
  input: { sourceText: string; jobDescription?: string; name?: string; enhancementLevel?: number }
) {
  return apiFetch<ApiCvDocument | GenerateCvMismatch>(`/api/v1/cv/${cvId}/generate`, {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function moveCvDocumentProfile(cvId: string, profileId: string) {
  return apiFetch<ApiCvDocument>(`/api/v1/cv/${cvId}/profile`, {
    method: "PATCH",
    body: JSON.stringify({ profileId }),
  });
}

export function updateCvContent(
  cvId: string,
  input: { content?: CVContentDTO; jobDescription?: string | null }
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
