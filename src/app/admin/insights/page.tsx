"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { RefreshCw, Star } from "lucide-react";
import { getInsights, type Insights, type InsightsSegment } from "@/lib/admin-api";
import {
  Badge,
  Button,
  Card,
  EmptyState,
  ErrorState,
  LoadingState,
  Note,
  PageHeader,
  PeriodPicker,
  SourceTag,
  Tabs,
} from "@/components/admin/ui";
import { errorText, formatDate, formatDateTime, formatNumber, formatRelative } from "@/lib/admin-format";

// Insights: how accounts created in the period get to a finished CV, how that
// differs by what they told us in onboarding, and what people said. One
// request to /admin/insights. Database facts (verification, CVs, Pro) cover
// every account; event-based numbers only cover what happened since
// tracking began, and say so.

const LABELS: Record<string, string> = {
  // Intent / flows
  create: "Start from scratch",
  tailor: "Tailor to a job",
  improve: "Improve a CV",
  // Career stage
  student: "Student or graduate",
  entry: "Early career",
  mid: "Mid-level",
  senior: "Senior or lead",
  career_change: "Changing careers",
  // Source
  search: "Search",
  social: "Social media",
  telegram: "Telegram",
  friend: "Friend or colleague",
  school: "School or university",
  ad: "An ad",
  other: "Somewhere else",
  // Surface
  dashboard: "Signed up, then onboarded",
  try: "Signed up mid-flow (/try)",
  // Onboarding steps
  intent: "What brings you here?",
  about: "Your name",
  career: "Profession & level",
  source: "How did you hear about us?",
  // AI draft reasons
  wrong_details: "Wrong details",
  too_generic: "Too generic",
  missing_experience: "Left things out",
  bad_wording: "Wording sounds off",
  too_long: "Too long",
  // Deletion reasons
  got_the_job: "Got the job",
  not_useful: "Wasn't useful",
  too_expensive: "Too expensive",
  poor_results: "CVs weren't good enough",
  privacy: "Privacy concerns",
  other_service: "Using something else",
  not_given: "No reason given",
  // Lifecycle emails
  welcome: "Welcome",
  first_cv_nudge: "First-CV nudge (day 1)",
  download_reminder: "Download reminder",
  // Feedback kinds
  cv_rating: "CV rating",
  ai_draft: "AI draft",
  account_deletion: "Account deletion",
  unknown: "Not answered",
};

const label = (value: string) => LABELS[value] ?? value;

function pct(count: number, of: number): string {
  if (of === 0) return "—";
  return `${Math.round((count / of) * 100)}%`;
}

function Bar({ value, max, tone = "accent" }: { value: number; max: number; tone?: "accent" | "good" | "bad" }) {
  const color = tone === "good" ? "bg-emerald-500" : tone === "bad" ? "bg-rose-500" : "bg-accent";
  return (
    <div className="h-2 w-full rounded-full bg-neutral-100 overflow-hidden" aria-hidden="true">
      <div className={`h-full rounded-full ${color}`} style={{ width: `${max > 0 ? Math.max(value > 0 ? 2 : 0, (value / max) * 100) : 0}%` }} />
    </div>
  );
}

function FunnelCard({ data }: { data: Insights }) {
  const total = data.funnel[0]?.count ?? 0;
  return (
    <Card
      title={
        <span className="inline-flex items-center gap-2">
          Activation funnel <SourceTag source="database" />
        </span>
      }
      description={`Accounts created in the last ${data.days} days, and how far each got`}
    >
      {total === 0 ? (
        <EmptyState title="No new accounts in this period" />
      ) : (
        <ol className="space-y-3.5">
          {data.funnel.map((step, i) => {
            const prev = i > 0 ? data.funnel[i - 1] : null;
            return (
              <li key={step.key}>
                <div className="flex items-baseline justify-between gap-3 text-sm">
                  <span className="font-medium text-neutral-900">{step.label}</span>
                  <span className="tabular-nums text-neutral-600">
                    <span className="font-bold text-neutral-950">{formatNumber(step.count)}</span>
                    <span className="ml-2 text-xs">{pct(step.count, step.of)}</span>
                    {prev && step.of === prev.of && prev.count > 0 && (
                      <span className="ml-2 text-xs text-neutral-400" title="Of the step above">
                        ({pct(step.count, prev.count)} of previous)
                      </span>
                    )}
                  </span>
                </div>
                <div className="mt-1.5">
                  <Bar value={step.count} max={step.of} />
                </div>
                {step.key === "returned" && (
                  <p className="mt-1 text-[11px] text-neutral-500">
                    Of the {formatNumber(step.of)} accounts at least 8 days old. Needs activity tracking, so it starts at{" "}
                    {data.trackingSince ? formatDate(data.trackingSince) : "the first tracked event"}.
                  </p>
                )}
              </li>
            );
          })}
        </ol>
      )}
    </Card>
  );
}

const SEGMENT_TABS = [
  { id: "intent", label: "What they came to do" },
  { id: "careerStage", label: "Career stage" },
  { id: "source", label: "How they heard" },
  { id: "surface", label: "Where they signed up" },
] as const;
type SegmentTab = (typeof SEGMENT_TABS)[number]["id"];

function SegmentsCard({ data }: { data: Insights }) {
  const [tab, setTab] = useState<SegmentTab>("intent");
  const rows: InsightsSegment[] = data.segments[tab];
  return (
    <Card
      title={
        <span className="inline-flex items-center gap-2">
          Activation by onboarding answer <SourceTag source="database" />
        </span>
      }
      description="Which kinds of people get to a finished CV, and to a paid plan"
    >
      <Tabs tabs={SEGMENT_TABS.map((t) => ({ id: t.id, label: t.label }))} active={tab} onChange={setTab} />
      {rows.length === 0 ? (
        <EmptyState title="No accounts in this period" />
      ) : (
        <div className="overflow-x-auto -mx-5">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-neutral-200 text-left text-xs text-neutral-500">
                <th className="px-5 py-2 font-semibold">Answer</th>
                <th className="px-3 py-2 font-semibold text-right">Accounts</th>
                <th className="px-3 py-2 font-semibold text-right">Onboarded</th>
                <th className="px-3 py-2 font-semibold text-right">First CV</th>
                <th className="px-3 py-2 font-semibold text-right">Downloaded</th>
                <th className="px-5 py-2 font-semibold text-right">Paid</th>
              </tr>
            </thead>
            <tbody className="tabular-nums">
              {rows.map((r) => (
                <tr key={r.value} className="border-b border-neutral-100 last:border-0">
                  <td className={`px-5 py-2 font-medium ${r.value === "unknown" ? "text-neutral-500" : "text-neutral-900"}`}>{label(r.value)}</td>
                  <td className="px-3 py-2 text-right">{formatNumber(r.users)}</td>
                  <td className="px-3 py-2 text-right">{pct(r.onboarded, r.users)}</td>
                  <td className="px-3 py-2 text-right">{pct(r.firstCv, r.users)}</td>
                  <td className="px-3 py-2 text-right">{pct(r.downloaded, r.users)}</td>
                  <td className="px-5 py-2 text-right">{pct(r.pro, r.users)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}

function OnboardingCard({ data }: { data: Insights }) {
  const order = ["intent", "about", "career", "source"];
  const steps = [...data.onboarding.steps].sort((a, b) => order.indexOf(a.step) - order.indexOf(b.step));
  const max = Math.max(1, ...steps.map((s) => s.viewed));
  return (
    <Card
      title={
        <span className="inline-flex items-center gap-2">
          Onboarding steps <SourceTag source="tracked" />
        </span>
      }
      description="People who saw each step, and who skipped setup from it"
    >
      {steps.length === 0 ? (
        <EmptyState title="No onboarding tracked in this period" />
      ) : (
        <ul className="space-y-3">
          {steps.map((s) => (
            <li key={s.step}>
              <div className="flex items-baseline justify-between gap-3 text-sm">
                <span className="font-medium text-neutral-900">{label(s.step)}</span>
                <span className="tabular-nums text-xs text-neutral-600">
                  <span className="text-sm font-bold text-neutral-950">{formatNumber(s.viewed)}</span> saw it
                  {s.skipped > 0 && <span className="ml-2 text-rose-700">{formatNumber(s.skipped)} skipped setup here</span>}
                </span>
              </div>
              <div className="mt-1.5">
                <Bar value={s.viewed} max={max} />
              </div>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

function TryFlowsCard({ data }: { data: Insights }) {
  const any = data.tryFlows.some((f) => f.started || f.askedToSignUp || f.signedUp);
  return (
    <Card
      title={
        <span className="inline-flex items-center gap-2">
          Try first, sign up later <SourceTag source="tracked" />
        </span>
      }
      description="Visitors on the public /try pages (counted per browser)"
      padded={false}
    >
      {!any ? (
        <p className="px-5 py-4 text-sm text-neutral-500">No /try visits tracked in this period.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-neutral-200 bg-neutral-50/60 text-left text-xs text-neutral-500">
                <th className="px-5 py-2 font-semibold">Flow</th>
                <th className="px-3 py-2 font-semibold text-right">Started</th>
                <th className="px-3 py-2 font-semibold text-right">Asked to sign up</th>
                <th className="px-5 py-2 font-semibold text-right">Signed up</th>
              </tr>
            </thead>
            <tbody className="tabular-nums">
              {data.tryFlows.map((f) => (
                <tr key={f.flow} className="border-b border-neutral-100 last:border-0">
                  <td className="px-5 py-2 font-medium">{label(f.flow)}</td>
                  <td className="px-3 py-2 text-right">{formatNumber(f.started)}</td>
                  <td className="px-3 py-2 text-right">
                    {formatNumber(f.askedToSignUp)} <span className="text-xs text-neutral-400">{pct(f.askedToSignUp, f.started)}</span>
                  </td>
                  <td className="px-5 py-2 text-right">
                    {formatNumber(f.signedUp)} <span className="text-xs text-neutral-400">{pct(f.signedUp, f.askedToSignUp)}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}

function CountList({ rows, empty }: { rows: { value: string; count: number }[]; empty: string }) {
  if (rows.length === 0) return <p className="text-sm text-neutral-500">{empty}</p>;
  const max = Math.max(1, ...rows.map((r) => r.count));
  return (
    <ul className="space-y-2">
      {rows.map((r) => (
        <li key={r.value}>
          <div className="flex items-baseline justify-between gap-3 text-sm">
            <span className="min-w-0 truncate text-neutral-800">{label(r.value)}</span>
            <span className="shrink-0 font-semibold tabular-nums">{formatNumber(r.count)}</span>
          </div>
          <div className="mt-1">
            <Bar value={r.count} max={max} />
          </div>
        </li>
      ))}
    </ul>
  );
}

function AttributionCard({ data }: { data: Insights }) {
  const blocks: [string, { value: string; count: number }[]][] = [
    ["utm_source", data.attribution.utmSource],
    ["utm_campaign", data.attribution.utmCampaign],
    ["Referring site", data.attribution.referrer],
    ["/go link", data.attribution.quickLink],
  ];
  return (
    <Card
      title={
        <span className="inline-flex items-center gap-2">
          First touch <SourceTag source="tracked" />
        </span>
      }
      description="How new accounts first arrived, from the browser they signed up on"
    >
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        {blocks.map(([title, rows]) => (
          <div key={title}>
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-neutral-500">{title}</h3>
            <CountList rows={rows} empty="Nothing recorded." />
          </div>
        ))}
      </div>
    </Card>
  );
}

function FeedbackCard({ data }: { data: Insights }) {
  const { cvRating, aiDraft, deletion } = data.feedback;
  const maxStars = Math.max(1, ...cvRating.distribution);
  const draftTotals = aiDraft.byFlow.reduce((t, f) => ({ up: t.up + f.up, down: t.down + f.down }), { up: 0, down: 0 });
  return (
    <Card
      title={
        <span className="inline-flex items-center gap-2">
          What people told us <SourceTag source="tracked" />
        </span>
      }
      description={`Feedback given in the last ${data.days} days`}
    >
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div>
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-neutral-500">After the first PDF</h3>
          {cvRating.count === 0 ? (
            <p className="text-sm text-neutral-500">No ratings yet.</p>
          ) : (
            <>
              <p className="flex items-baseline gap-2">
                <span className="text-2xl font-bold tabular-nums text-neutral-950">{cvRating.average?.toFixed(2)}</span>
                <span className="text-xs text-neutral-500">
                  out of 5 · {formatNumber(cvRating.count)} rating{cvRating.count === 1 ? "" : "s"}
                </span>
              </p>
              <ul className="mt-3 space-y-1.5">
                {[5, 4, 3, 2, 1].map((stars) => (
                  <li key={stars} className="flex items-center gap-2 text-xs">
                    <span className="inline-flex w-8 shrink-0 items-center gap-0.5 tabular-nums text-neutral-600">
                      {stars} <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                    </span>
                    <Bar value={cvRating.distribution[stars - 1]} max={maxStars} tone={stars >= 4 ? "good" : stars <= 2 ? "bad" : "accent"} />
                    <span className="w-8 shrink-0 text-right tabular-nums text-neutral-600">{cvRating.distribution[stars - 1]}</span>
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>

        <div>
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-neutral-500">AI first drafts</h3>
          {draftTotals.up + draftTotals.down === 0 ? (
            <p className="text-sm text-neutral-500">No thumbs yet.</p>
          ) : (
            <>
              <p className="flex items-baseline gap-2">
                <span className="text-2xl font-bold tabular-nums text-neutral-950">{pct(draftTotals.up, draftTotals.up + draftTotals.down)}</span>
                <span className="text-xs text-neutral-500">
                  thumbs up · {formatNumber(draftTotals.up + draftTotals.down)} answers
                </span>
              </p>
              <ul className="mt-3 space-y-1 text-sm">
                {aiDraft.byFlow.map((f) => (
                  <li key={f.flow} className="flex justify-between gap-3">
                    <span className="text-neutral-700">{label(f.flow)}</span>
                    <span className="tabular-nums text-xs">
                      <span className="text-emerald-700">{f.up} up</span> · <span className="text-rose-700">{f.down} down</span>
                    </span>
                  </li>
                ))}
              </ul>
              {aiDraft.downReasons.length > 0 && (
                <div className="mt-4">
                  <p className="mb-1.5 text-xs font-semibold text-neutral-500">Why thumbs down</p>
                  <CountList rows={aiDraft.downReasons.map((r) => ({ value: r.reason, count: r.count }))} empty="" />
                </div>
              )}
            </>
          )}
        </div>

        <div>
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-neutral-500">Deleted accounts</h3>
          {deletion.count === 0 ? (
            <p className="text-sm text-neutral-500">No reasons given.</p>
          ) : (
            <CountList rows={deletion.reasons.map((r) => ({ value: r.reason, count: r.count }))} empty="" />
          )}
          <p className="mt-2 text-[11px] text-neutral-500">Only deletions where someone chose a reason or left a comment. Stored without the account.</p>
        </div>
      </div>
    </Card>
  );
}

function CommentsCard({ data }: { data: Insights }) {
  const comments = data.feedback.recentComments;
  return (
    <Card
      title="Recent comments"
      description="The latest written feedback, newest first"
      actions={
        <Link href="/admin/feedback" className="text-xs font-semibold text-neutral-600 hover:text-neutral-950">
          See all feedback →
        </Link>
      }
      padded={false}
    >
      {comments.length === 0 ? (
        <p className="px-5 py-4 text-sm text-neutral-500">No comments in this period.</p>
      ) : (
        <ul className="divide-y divide-neutral-100">
          {comments.map((c) => (
            <li key={c.id} className="px-5 py-3">
              <div className="flex flex-wrap items-center gap-2 text-xs text-neutral-500">
                <Badge>{label(c.kind)}</Badge>
                {c.kind === "cv_rating" && c.rating !== null && <span className="font-semibold text-neutral-700">{c.rating}/5</span>}
                {c.kind === "ai_draft" && (
                  <span className={c.rating === 1 ? "font-semibold text-emerald-700" : "font-semibold text-rose-700"}>
                    {c.rating === 1 ? "Thumbs up" : "Thumbs down"}
                  </span>
                )}
                {c.reason && <span>{label(c.reason)}</span>}
                {c.flowType && <span>· {label(c.flowType)}</span>}
                <span className="ml-auto" title={formatDateTime(c.createdAt)}>
                  {formatRelative(c.createdAt)}
                </span>
              </div>
              <p className="mt-1.5 text-sm text-neutral-800 whitespace-pre-line break-words">{c.comment}</p>
              {c.userId && (
                <Link href={`/admin/users/${c.userId}`} className="mt-1 inline-block text-xs font-medium text-neutral-500 hover:text-accent-strong hover:underline">
                  {c.userEmail ?? c.userId}
                </Link>
              )}
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

function LifecycleCard({ data }: { data: Insights }) {
  return (
    <Card
      title={
        <span className="inline-flex items-center gap-2">
          Lifecycle emails <SourceTag source="database" />
        </span>
      }
      description={
        <>
          Sent in the last {data.days} days · turn them on or off in{" "}
          <Link href="/admin/settings" className="underline hover:text-neutral-900">
            Platform Settings
          </Link>
        </>
      }
      padded={false}
    >
      <table className="w-full text-sm">
        <tbody className="tabular-nums">
          {data.lifecycleEmails.map((l) => (
            <tr key={l.kind} className="border-b border-neutral-100 last:border-0">
              <td className="px-5 py-2 font-medium">{label(l.kind)}</td>
              <td className="px-3 py-2 text-right">{formatNumber(l.sent)} sent</td>
              <td className={`px-5 py-2 text-right ${l.failed > 0 ? "text-rose-700" : "text-neutral-400"}`}>{formatNumber(l.failed)} failed</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="px-5 py-3 border-t border-neutral-100 text-xs text-neutral-500">
        Tour started from the post-first-CV offer or the menu: <span className="font-semibold text-neutral-800">{formatNumber(data.tourStarts)}</span> times.
      </p>
    </Card>
  );
}

function InsightsBody({ data }: { data: Insights }) {
  return (
    <div className="space-y-4">
      {!data.trackingSince ? (
        <Note tone="info">
          No product events yet. The funnel&apos;s database steps already work; onboarding, /try, attribution and feedback numbers fill in as people use the app.
        </Note>
      ) : (
        <Note>
          Event-based numbers (marked &ldquo;tracked&rdquo;) start {formatDateTime(data.trackingSince)}; anything before that wasn&apos;t recorded.
        </Note>
      )}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <FunnelCard data={data} />
        <SegmentsCard data={data} />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <OnboardingCard data={data} />
        <TryFlowsCard data={data} />
      </div>
      <FeedbackCard data={data} />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <CommentsCard data={data} />
        <div className="space-y-4">
          <AttributionCard data={data} />
          <LifecycleCard data={data} />
        </div>
      </div>
    </div>
  );
}

export default function AdminInsightsPage() {
  const [days, setDays] = useState<number>(30);
  const query = useQuery({
    queryKey: ["admin", "insights", days],
    queryFn: () => getInsights(days),
    placeholderData: (prev) => prev,
  });
  const data = query.data;

  return (
    <div>
      <PageHeader
        title="Insights"
        description="How new accounts get to a finished CV, and what people tell us. The funnel follows accounts created in the period."
        actions={
          <>
            <PeriodPicker value={days} onChange={setDays} />
            <Button onClick={() => query.refetch()} loading={query.isFetching}>
              {!query.isFetching && <RefreshCw className="w-3.5 h-3.5" />}
              Refresh
            </Button>
          </>
        }
      />
      {query.error && data && (
        <div className="mb-4">
          <Note tone="warn">Couldn&apos;t refresh: {errorText(query.error)}. Showing the last loaded data.</Note>
        </div>
      )}
      {data ? (
        <div className={query.isPlaceholderData ? "opacity-60 transition-opacity" : "transition-opacity"}>
          <InsightsBody data={data} />
        </div>
      ) : query.error ? (
        <Card>
          <ErrorState error={query.error} onRetry={() => query.refetch()} />
        </Card>
      ) : (
        <LoadingState label="Loading insights…" />
      )}
    </div>
  );
}
