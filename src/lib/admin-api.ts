import { apiFetch, setAccessToken } from "./api";

// Client for /api/v1/admin. Every call goes through apiFetch with the same
// session as the rest of the app; the backend re-checks the admin role on
// every request, so nothing here is trusted for authorization.

export type Paged<T> = { items: T[]; total: number; page: number; pageSize: number; pageCount: number };

type Query = Record<string, string | number | boolean | undefined | null>;

function qs(query: Query = {}): string {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value === undefined || value === null || value === "") continue;
    params.set(key, String(value));
  }
  const s = params.toString();
  return s ? `?${s}` : "";
}

const get = <T>(path: string, query?: Query) => apiFetch<T>(`/api/v1/admin${path}${qs(query)}`);
const send = <T>(method: "POST" | "PUT" | "PATCH" | "DELETE", path: string, body?: unknown) =>
  apiFetch<T>(`/api/v1/admin${path}`, { method, body: JSON.stringify(body ?? {}) });

// ---------------------------------------------------------------- auth

export type Permission =
  | "overview:read"
  | "users:read"
  | "users:write"
  | "users:delete"
  | "entitlements:write"
  | "billing:read"
  | "billing:write"
  | "settings:write"
  | "notifications:send"
  | "audit:read"
  | "ai:read";

export interface AdminMe {
  id: string;
  email: string;
  fullName: string | null;
  role: string;
  hasPassword: boolean;
  lastLoginAt: string | null;
  permissions: Permission[];
}

export async function adminLogin(email: string, password: string) {
  const data = await apiFetch<{ accessToken: string; admin: { id: string; email: string } }>("/api/v1/admin/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
  setAccessToken(data.accessToken);
  return data;
}

export const getAdminMe = () => get<AdminMe>("/me");

// ---------------------------------------------------------------- overview

export type FlowKey = "create" | "tailor" | "improve";

export interface AuditEntry {
  id: string;
  actorId: string | null;
  actorEmail: string | null;
  action: string;
  targetType: string | null;
  targetId: string | null;
  summary: string | null;
  metadata: Record<string, unknown> | null;
  ip: string | null;
  userAgent: string | null;
  createdAt: string;
}

export interface WebhookEventRow {
  id: string;
  provider: string;
  eventId: string;
  eventType: string | null;
  resourceId: string | null;
  status: string | null;
  error: string | null;
  processedAt: string | null;
  createdAt: string;
}

export interface EmailLogRow {
  id: string;
  userId: string | null;
  toEmail: string;
  kind: string;
  subject: string;
  provider: string;
  status: "sent" | "failed" | "skipped";
  error: string | null;
  providerMessageId: string | null;
  notificationId: string | null;
  createdAt: string;
}

export interface AiEventRow {
  id: string;
  userId: string | null;
  userEmail?: string | null;
  operation: string;
  flowType: string | null;
  provider: string;
  model: string;
  status: string;
  errorCode: string | null;
  errorMessage: string | null;
  promptTokens: number | null;
  completionTokens: number | null;
  totalTokens: number | null;
  latencyMs: number | null;
  createdAt: string;
}

export interface CurrencyAmount {
  currency: string;
  amount: number;
  count: number;
}

export type PolarRevenue =
  | {
      available: true;
      source: "polar_api";
      byCurrency: Record<string, { gross: number; net: number; refunded: number; orders: number }>;
      truncated: boolean;
    }
  | { available: false; source: "polar_api"; error: string };

export interface Overview {
  days: number;
  generatedAt: string;
  users: {
    source: "database";
    total: number;
    newInPeriod: number;
    verified: number;
    unverified: number;
    suspended: number;
    admins: number;
    signupsByDay: { day: string; count: number }[];
  };
  plans: {
    source: "database";
    pro: number;
    paid: number;
    complimentary: number;
    free: number;
    cancellingAtPeriodEnd: number;
    lapsed: number;
    subscriptionStatus: Record<string, number>;
  };
  revenue: {
    chapa: { source: "database"; successful: CurrencyAmount[]; byStatus: Record<string, number> };
    /** Amounts in minor units (cents). */
    polar: PolarRevenue;
  };
  content: {
    source: "database";
    totalCvs: number;
    cvsInPeriod: number;
    aiCvsInPeriod: number;
    totalProfiles: number;
    freeUsesSpent: Record<FlowKey, number>;
    usersWhoUsedFree: Record<FlowKey, number>;
  };
  ai: {
    source: "tracked";
    trackingSince: string | null;
    success: number;
    failed: number;
    limitReached: number;
    appRateLimited: number;
    tokens: number;
  };
  recent: {
    registrations: { id: string; email: string; fullName: string | null; createdAt: string; verified: boolean; google: boolean }[];
    payments: {
      id: string;
      userId: string;
      userEmail: string | null;
      provider: string;
      amount: number;
      currency: string;
      status: string;
      createdAt: string;
    }[];
    webhookFailures: WebhookEventRow[];
    emailFailures: EmailLogRow[];
    aiFailures: AiEventRow[];
    audit: AuditEntry[];
  };
}

export const getOverview = (days: number) => get<Overview>("/overview", { days });

// ---------------------------------------------------------------- insights

export interface InsightsSegment {
  value: string;
  users: number;
  onboarded: number;
  firstCv: number;
  downloaded: number;
  pro: number;
}

export interface Insights {
  days: number;
  generatedAt: string;
  /** When the first product event was recorded; event-based numbers start here. */
  trackingSince: string | null;
  funnel: { key: string; label: string; count: number; of: number }[];
  segments: Record<"intent" | "careerStage" | "source" | "surface", InsightsSegment[]>;
  attribution: Record<"utmSource" | "utmCampaign" | "referrer" | "quickLink", { value: string; count: number }[]>;
  onboarding: { steps: { step: string; viewed: number; skipped: number }[] };
  tryFlows: { flow: FlowKey; started: number; askedToSignUp: number; signedUp: number }[];
  tourStarts: number;
  feedback: {
    cvRating: { count: number; average: number | null; distribution: number[] };
    aiDraft: { byFlow: { flow: string; up: number; down: number }[]; downReasons: { reason: string; count: number }[] };
    deletion: { count: number; reasons: { reason: string; count: number }[] };
    recentComments: {
      id: string;
      kind: string;
      rating: number | null;
      reason: string | null;
      comment: string | null;
      flowType: string | null;
      userId: string | null;
      userEmail: string | null;
      createdAt: string;
    }[];
  };
  lifecycleEmails: { kind: string; sent: number; failed: number }[];
}

export const getInsights = (days: number) => get<Insights>("/insights", { days });

// ---------------------------------------------------------------- users

export interface UserListItem {
  id: string;
  email: string;
  fullName: string | null;
  role: string;
  status: "ACTIVE" | "SUSPENDED";
  emailVerified: boolean;
  createdAt: string;
  lastActiveAt: string | null;
  lastLoginAt: string | null;
  signInMethods: ("password" | "google")[];
  isPro: boolean;
  proSource: "subscription" | "grant" | null;
  subscriptionProvider: string | null;
  subscriptionStatus: string | null;
  cvCount: number;
  profileCount: number;
}

export interface UserListQuery extends Query {
  page?: number;
  pageSize?: number;
  q?: string;
  status?: "ACTIVE" | "SUSPENDED";
  verified?: "true" | "false";
  plan?: "pro" | "paid" | "grant" | "free";
  role?: "USER" | "ADMIN";
  from?: string;
  to?: string;
  sort?: "newest" | "oldest" | "lastActive" | "email";
}

export const listUsers = (query: UserListQuery) => get<Paged<UserListItem>>("/users", query);

export type EntitlementKind = "PRO_ACCESS" | "FEATURE" | "LIMIT_ADJUSTMENT" | "EXEMPTION";
export type FeatureKey = "careerProfiles" | "polishSummary" | "cvImport";
export type GrantableFeature = FeatureKey | "beta";
export type ExemptionKey = "aiRateLimit" | "generationQuota";

export interface Entitlement {
  id: string;
  userId: string;
  kind: EntitlementKind;
  feature: string | null;
  flow: FlowKey | null;
  amount: number | null;
  reason: string;
  note: string | null;
  startsAt: string;
  expiresAt: string | null;
  createdById: string | null;
  createdByEmail: string | null;
  createdAt: string;
  updatedAt: string;
  revokedAt: string | null;
  revokedById: string | null;
  revokeReason: string | null;
  /** Present on lists and the user detail. */
  active?: boolean;
  label?: string;
  user?: { email: string; fullName: string | null };
}

export interface FlowLimit {
  limit: number | null;
  used: number;
  remaining: number | null;
}

export interface AccessSnapshot {
  isPro: boolean;
  proSource: "subscription" | "grant" | null;
  billingPro: boolean;
  proGrantExpiresAt: string | null;
  beta: boolean;
  features: Record<FeatureKey, boolean>;
  exemptions: Record<ExemptionKey, boolean>;
  limits: Record<FlowKey, FlowLimit>;
  activeGrantIds: string[];
  planDefaults: Record<FlowKey, number>;
}

export interface ChapaPaymentRow {
  id: string;
  userId?: string;
  userEmail?: string | null;
  provider: string;
  productType: string;
  amount: number;
  currency: string;
  status: "PENDING" | "SUCCESS" | "FAILED" | "CANCELLED" | "EXPIRED";
  merchantReference: string;
  providerReference: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface UserDetail {
  account: {
    id: string;
    email: string;
    fullName: string | null;
    firstName: string | null;
    lastName: string | null;
    phone: string | null;
    occupationTitle: string | null;
    professions: string[];
    role: string;
    status: "ACTIVE" | "SUSPENDED";
    suspendedAt: string | null;
    suspensionReason: string | null;
    emailVerifiedAt: string | null;
    createdAt: string;
    updatedAt: string;
    lastLoginAt: string | null;
    lastActiveAt: string | null;
    onboardingCompletedAt: string | null;
    signupIntent: string | null;
    careerStage: string | null;
    acquisitionSource: string | null;
    acquisitionDetail: string | null;
    signupSurface: string | null;
    signupAttribution: Record<string, string> | null;
    hasPassword: boolean;
    hasGoogle: boolean;
    emailAnnouncementsOptOut: boolean;
    activeSessions: number;
    pushDevices: number;
  };
  content: { cvCount: number; cvBySource: Record<string, number>; profileCount: number; importCount: number };
  access: AccessSnapshot;
  subscription: {
    provider: string | null;
    status: string | null;
    currentPeriodEnd: string | null;
    cancelAtPeriodEnd: boolean;
    polarCustomerId: string | null;
    polarSubscriptionId: string | null;
    polarProductId: string | null;
    renewingPolar: boolean;
  };
  entitlements: Entitlement[];
  payments: ChapaPaymentRow[];
  ai: { totals: { status: string; count: number; tokens: number }[]; recent: AiEventRow[] };
  emails: EmailLogRow[];
  audit: AuditEntry[];
}

export const getUser = (id: string) => get<UserDetail>(`/users/${id}`);

type Ok = { success: true };
export const verifyUserEmail = (id: string, reason: string) => send<Ok>("POST", `/users/${id}/verify-email`, { reason });
export const resendUserVerification = (id: string) => send<Ok>("POST", `/users/${id}/resend-verification`);
export const suspendUser = (id: string, reason: string) => send<Ok>("POST", `/users/${id}/suspend`, { reason });
export const reactivateUser = (id: string, reason: string) => send<Ok>("POST", `/users/${id}/reactivate`, { reason });
export const revokeUserSessions = (id: string, reason?: string) => send<Ok>("POST", `/users/${id}/revoke-sessions`, { reason });
export const sendUserPasswordReset = (id: string, reason?: string) =>
  send<{ success: true; delivery: "sent" | "skipped" }>("POST", `/users/${id}/password-reset`, { reason });
export const resetUserUsage = (id: string, flows: FlowKey[], reason: string) => send<Ok>("POST", `/users/${id}/usage/reset`, { flows, reason });
export const deleteUser = (id: string, confirmEmail: string, reason: string) => send<Ok>("DELETE", `/users/${id}`, { confirmEmail, reason });

// ---------------------------------------------------------------- entitlements

export type GrantInput = { reason: string; note?: string; durationDays?: number; expiresAt?: string } & (
  | { kind: "PRO_ACCESS" }
  | { kind: "FEATURE"; feature: GrantableFeature }
  | { kind: "LIMIT_ADJUSTMENT"; flow: FlowKey; amount: number }
  | { kind: "EXEMPTION"; feature: ExemptionKey }
);

export const grantEntitlement = (userId: string, input: GrantInput) => send<Entitlement>("POST", `/users/${userId}/entitlements`, input);
export const updateEntitlement = (
  id: string,
  input: { reason: string; expiresAt?: string | null; extendDays?: number; note?: string }
) => send<Entitlement>("PATCH", `/entitlements/${id}`, input);
export const revokeEntitlement = (id: string, reason: string) => send<Entitlement>("POST", `/entitlements/${id}/revoke`, { reason });
export const listEntitlements = (query: {
  page?: number;
  pageSize?: number;
  state?: "active" | "expired" | "revoked" | "all";
  kind?: EntitlementKind;
  userId?: string;
}) => get<Paged<Entitlement>>("/entitlements", query);

// ---------------------------------------------------------------- billing

export interface PolarLinks {
  environment: "sandbox" | "production";
  organization: { id: string; slug: string; name: string } | null;
  dashboard: string;
  orderBase: string | null;
  subscriptionBase: string | null;
  customerBase: string | null;
}

export interface BillingSummary {
  subscriptions: {
    activePaid: number;
    cancellingAtPeriodEnd: number;
    lapsed: number;
    byStatus: Record<string, number>;
    byProvider: Record<string, number>;
  };
  chapa: { byStatus: Record<string, number>; successfulRevenue: CurrencyAmount[] };
  webhooks: Record<string, number>;
  polar: PolarLinks;
}

export const getBillingSummary = () => get<BillingSummary>("/billing/summary");

export interface SubscriptionRow {
  id: string;
  email: string;
  fullName: string | null;
  subscriptionProvider: string | null;
  subscriptionStatus: string | null;
  subscriptionCurrentPeriodEnd: string | null;
  subscriptionCancelAtPeriodEnd: boolean;
  polarSubscriptionId: string | null;
  polarCustomerId: string | null;
  polarProductId: string | null;
  hasPaidAccess: boolean;
}

export const listSubscriptions = (query: {
  page?: number;
  pageSize?: number;
  status?: string;
  provider?: "POLAR" | "CHAPA";
  view?: "all" | "active" | "cancelling" | "lapsed";
  q?: string;
}) => get<Paged<SubscriptionRow>>("/billing/subscriptions", query);

export const listChapaPayments = (query: {
  page?: number;
  pageSize?: number;
  status?: ChapaPaymentRow["status"];
  q?: string;
  from?: string;
  to?: string;
}) => get<Paged<ChapaPaymentRow>>("/billing/payments", query);

export const reverifyChapaPayment = (id: string) =>
  send<{ id: string; status: ChapaPaymentRow["status"]; changed: boolean }>("POST", `/billing/payments/${id}/verify`);

export interface PolarOrder {
  id: string;
  createdAt: string;
  status: "draft" | "pending" | "paid" | "refunded" | "partially_refunded" | "void";
  paid: boolean;
  billingReason: string;
  /** Minor units (cents). */
  totalAmount: number;
  netAmount: number;
  refundedAmount: number;
  currency: string;
  customerId: string;
  customerEmail: string | null;
  externalCustomerId: string | null;
  subscriptionId: string | null;
  productName: string | null;
  invoiceNumber: string | null;
}

export const listPolarOrders = (query: { page?: number; pageSize?: number; status?: PolarOrder["status"]; userId?: string; from?: string; to?: string }) =>
  get<{ items: PolarOrder[]; total: number; maxPage: number; page: number; pageSize: number }>("/billing/polar/orders", query);

export interface PolarRefund {
  id: string;
  createdAt: string;
  status: string;
  reason: string;
  amount: number;
  currency: string;
  orderId: string;
  subscriptionId: string | null;
  customerId: string;
}

export const listPolarRefunds = (query: { page?: number; pageSize?: number; userId?: string }) =>
  get<{ items: PolarRefund[]; total: number }>("/billing/polar/refunds", query);

export interface PolarDispute {
  id: string;
  createdAt: string;
  status: string;
  resolved: boolean;
  amount: number;
  currency: string;
  reason: string | null;
  evidenceDueBy: string | null;
  orderId: string;
  customerEmail: string | null;
}

export const listPolarDisputes = (query: { page?: number; pageSize?: number }) =>
  get<{ items: PolarDispute[]; total: number }>("/billing/polar/disputes", query);

export const listWebhookEvents = (query: { page?: number; pageSize?: number; status?: string }) =>
  get<Paged<WebhookEventRow>>("/billing/webhooks", query);

export const retryWebhookEvent = (id: string) => send<{ status: string; polar: unknown }>("POST", `/billing/webhooks/${id}/retry`);

export const syncUserBilling = (userId: string) =>
  send<{
    polar: { found: boolean; status?: string; currentPeriodEnd?: string; cancelAtPeriodEnd?: boolean } | null;
    polarError: string | null;
    chapa: { id: string; before: string; after: string; error?: string }[];
  }>("POST", `/users/${userId}/billing/sync`);

export const cancelUserSubscription = (userId: string, reason: string) =>
  send<{ status: string; currentPeriodEnd: string; cancelAtPeriodEnd: boolean }>("POST", `/users/${userId}/subscription/cancel`, { reason });
export const resumeUserSubscription = (userId: string, reason: string) =>
  send<{ status: string; currentPeriodEnd: string; cancelAtPeriodEnd: boolean }>("POST", `/users/${userId}/subscription/resume`, { reason });

// ---------------------------------------------------------------- settings

export type FeatureAccessLevel = "all" | "pro" | "beta" | "off";

export interface SettingsValues {
  limits: { freeUsesPerFlow: Record<FlowKey, number>; aiRequestsPerMinute: number; aiRequestsPerDay: number };
  features: Record<FeatureKey, FeatureAccessLevel>;
  platform: { registrationEnabled: boolean; aiGenerationPaused: boolean; banner: { enabled: boolean; message: string; tone: "info" | "warning" } };
  aiPricing: { models: { model: string; inputPerMillionUsd: number; outputPerMillionUsd: number }[] };
  notifications: { maxEmailRecipients: number };
  lifecycleEmails: { enabled: boolean };
}
export type SettingKey = keyof SettingsValues;

export interface SettingsResponse {
  values: SettingsValues;
  defaults: SettingsValues;
  features: Record<FeatureKey, { label: string; description: string; endpoints: string[] }>;
  meta: Partial<Record<SettingKey, { updatedAt: string; updatedBy: string | null }>>;
}

export const getSettings = () => get<SettingsResponse>("/settings");
export const getSettingsImpact = () => get<{ total: number; pro: number; paid: number; free: number; suspended: number }>("/settings/impact");
export const updateSetting = <K extends SettingKey>(key: K, value: SettingsValues[K], reason?: string) =>
  send<{ key: K; value: SettingsValues[K] }>("PUT", `/settings/${key}`, { value, reason });

export interface Health {
  checkedAt: string;
  environment: string;
  database: { ok: boolean; latencyMs: number | null; error?: string };
  email: { provider: string | null; delivers: boolean; fromDomain: string | null; configured: boolean };
  push: { configured: boolean };
  ai: { provider: string; model: string; keyConfigured: boolean };
  polar: { environment: string; reachable: boolean; organization: string | null; latencyMs: number | null };
  chapa: { configured: boolean; apiVersion: string };
  google: { signInConfigured: boolean; redirectConfigured: boolean };
  last24h: { failedWebhooks: number; failedEmails: number; aiErrors: number };
}

export const getHealth = () => get<Health>("/health");

// ---------------------------------------------------------------- notifications

export type Audience =
  | { type: "all" }
  | { type: "free" }
  | { type: "pro" }
  | { type: "paid" }
  | { type: "verified" }
  | { type: "beta" }
  | { type: "new"; days: number }
  | { type: "users"; userIds: string[] };

export type Channel = "in_app" | "email" | "push";

export interface NotificationRow {
  id: string;
  title: string;
  body: string;
  actionUrl: string | null;
  audience: Audience;
  channels: Channel[];
  emailCategory: "product" | "service";
  createdById: string | null;
  createdByEmail: string | null;
  status: "sending" | "done" | "failed";
  recipientCount: number;
  emailSent: number;
  emailFailed: number;
  emailSkipped: number;
  pushSent: number;
  pushFailed: number;
  createdAt: string;
  completedAt: string | null;
  readCount?: number;
}

export interface ChannelStatus {
  in_app: { available: true };
  email: { provider: string | null; delivers: boolean; fromDomain: string | null; configured: boolean };
  push: { available: boolean; subscribedUsers: number };
}

export const getChannelStatus = () => get<ChannelStatus>("/notifications/channels");
export const countAudience = (audience: Audience) =>
  send<{ total: number; emailableProduct: number; emailableService: number }>("POST", "/notifications/audience", { audience });
export const listAdminNotifications = (query: { page?: number; pageSize?: number }) => get<Paged<NotificationRow>>("/notifications", query);
export const getAdminNotification = (id: string) =>
  get<NotificationRow & { stats: { inApp: number; read: number; dismissed: number }; emailFailures: EmailLogRow[] }>(`/notifications/${id}`);
export const createAdminNotification = (input: {
  title: string;
  body: string;
  actionUrl?: string | null;
  audience: Audience;
  channels: Channel[];
  emailCategory: "product" | "service";
}) => send<NotificationRow>("POST", "/notifications", input);

export const listEmailLogs = (query: { page?: number; pageSize?: number; status?: EmailLogRow["status"]; kind?: string; q?: string }) =>
  get<Paged<EmailLogRow>>("/email/logs", query);
export const sendTestEmail = (to?: string) =>
  send<{ to: string; status: "sent" | "skipped" | "failed"; id?: string | null; error?: string }>("POST", "/email/test", { to });

// ---------------------------------------------------------------- AI

export interface AiUsage {
  days: number;
  trackingSince: string | null;
  current: { provider: string; model: string; limits: SettingsValues["limits"]; paused: boolean };
  totals: {
    calls: number;
    success: number;
    failed: number;
    limitReached: number;
    appRateLimited: number;
    paused: number;
    tokens: number;
    estimatedCostUsd: number | null;
    modelsWithoutPrice: string[];
  };
  byStatus: Record<string, number>;
  byOperation: { operation: string; status: string; count: number }[];
  models: {
    provider: string;
    model: string;
    calls: number;
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
    avgLatencyMs: number | null;
    estimatedCostUsd: number | null;
  }[];
  byDay: { day: string; success: number; failed: number; refused: number; tokens: number }[];
  topUsers: { userId: string | null; email: string | null; calls: number; tokens: number }[];
  limitHitters: { userId: string | null; email: string | null; count: number }[];
}

export const getAiUsage = (days: number) => get<AiUsage>("/ai/usage", { days });
export const listAiEvents = (query: { page?: number; pageSize?: number; status?: string; operation?: string; userId?: string }) =>
  get<Paged<AiEventRow>>("/ai/events", query);

// ---------------------------------------------------------------- audit

export const listAudit = (query: { page?: number; pageSize?: number; action?: string; actor?: string; targetId?: string; from?: string; to?: string }) =>
  get<Paged<AuditEntry> & { actions: string[] }>("/audit", query);

// ---------------------------------------------------------------- feedback

export type FeedbackKind = "cv_rating" | "ai_draft" | "account_deletion";

export interface FeedbackEntry {
  id: string;
  kind: FeedbackKind;
  /** cv_rating: 1–5. ai_draft: 1 (thumbs up) or -1 (down). account_deletion: null. */
  rating: number | null;
  reason: string | null;
  comment: string | null;
  flowType: string | null;
  cvDocumentId: string | null;
  context: Record<string, unknown> | null;
  createdAt: string;
  /** Null for account deletions (stored without the user) and for accounts deleted since. */
  user: { id: string; email: string; fullName: string | null } | null;
}

export interface FeedbackSummary {
  cvRatings: number;
  averageRating: number | null;
  aiDrafts: number;
  thumbsUp: number;
  deletions: number;
}

export const listFeedback = (query: {
  page?: number;
  pageSize?: number;
  kind?: FeedbackKind;
  rating?: number;
  withComment?: boolean;
  q?: string;
  userId?: string;
  from?: string;
  to?: string;
}) => get<Paged<FeedbackEntry> & { summary: FeedbackSummary }>("/feedback", query);
