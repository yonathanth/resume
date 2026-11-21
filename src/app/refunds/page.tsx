import type { Metadata } from "next";
import { pageMetadata } from "@/lib/metadata";
import Link from "next/link";
import { LegalPage, type LegalSection } from "@/components/LegalPage";
import { SUPPORT_EMAIL } from "@/lib/help-content";

export const metadata: Metadata = pageMetadata({
  title: "Refund and Cancellation Policy",
  description: "How to cancel a gomoxie plan and how to get a refund within 7 days.",
  path: "/refunds",
});

const linkClass = "font-medium text-neutral-900 underline decoration-neutral-300 underline-offset-2";

const sections: LegalSection[] = [
  {
    title: "Cancelling a subscription",
    body: (
      <>
        <p>
          Plus and Pro subscriptions (weekly, monthly or 3-month) renew automatically until you cancel. You can cancel
          at any time from Settings in your dashboard, in a couple of clicks.
        </p>
        <p>
          When you cancel, you won&apos;t be charged again. You keep your plan until the end of the period you&apos;ve
          already paid for, and then your account moves to the free plan. Your resumes stay in your account.
        </p>
        <p>
          Chapa payments in Ethiopia don&apos;t renew automatically: each one covers a single period, so there&apos;s
          nothing to cancel.
        </p>
      </>
    ),
  },
  {
    title: "7-day refund",
    body: (
      <>
        <p>
          If gomoxie isn&apos;t right for you, you can ask for a full refund within <strong className="font-semibold text-neutral-800">7 days</strong>{" "}
          of your first payment for:
        </p>
        <ul>
          <li>a Plus or Pro subscription;</li>
          <li>Plus Lifetime;</li>
          <li>a Pay per CV purchase.</li>
        </ul>
        <p>
          When we refund a subscription, we also cancel it, so it won&apos;t renew. When we refund Plus Lifetime or a
          CV purchase, the access it unlocked ends.
        </p>
      </>
    ),
  },
  {
    title: "Renewals",
    body: (
      <>
        <p>
          Automatic renewals aren&apos;t normally refunded, because you can cancel at any time before the next one. If
          you were charged for a renewal you didn&apos;t mean to keep and haven&apos;t used the plan since, contact us
          within 7 days of that charge and we&apos;ll refund it.
        </p>
      </>
    ),
  },
  {
    title: "How to ask for a refund",
    body: (
      <>
        <p>
          Email{" "}
          <a href={`mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent("Refund request")}`} className={linkClass}>
            {SUPPORT_EMAIL}
          </a>{" "}
          from the email address on your gomoxie account, and tell us which payment you&apos;d like refunded. We reply
          within 2 business days.
        </p>
        <p>
          Card refunds are issued by Dodo Payments, our merchant of record, to the original payment method. They usually
          show up within 5–10 business days, depending on your bank. Chapa payments are refunded through Chapa.
        </p>
      </>
    ),
  },
  {
    title: "Other cases",
    body: (
      <>
        <p>
          If you were charged twice, charged after cancelling, or couldn&apos;t use what you paid for because of a
          problem on our side, contact us at any time and we&apos;ll put it right, even after 7 days.
        </p>
        <p>
          We may decline repeated refund requests on the same account, or requests where the service has clearly been
          misused. Nothing in this policy limits any rights you have under the consumer laws where you live.
        </p>
      </>
    ),
  },
];

export default function RefundsPage() {
  return (
    <LegalPage
      title="Refund and Cancellation Policy"
      updated="November 21, 2026"
      intro={
        <p>
          This policy explains how to cancel a gomoxie plan and when you can get your money back. It&apos;s part of our{" "}
          <Link href="/terms" className={linkClass}>
            Terms of Service
          </Link>
          , and prices are on the{" "}
          <Link href="/pricing" className={linkClass}>
            pricing page
          </Link>
          .
        </p>
      }
      sections={sections}
    />
  );
}
