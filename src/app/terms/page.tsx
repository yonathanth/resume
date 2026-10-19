import type { Metadata } from "next";
import { pageMetadata } from "@/lib/metadata";
import Link from "next/link";
import { LegalPage, type LegalSection } from "@/components/LegalPage";

export const metadata: Metadata = pageMetadata({
  title: "Terms of Service",
  description:
    "The terms that apply when you use GoMoxie.",
  path: "/terms",
});

const sections: LegalSection[] = [
  {
    title: "Using GoMoxie",
    body: (
      <>
        <p>
          GoMoxie helps you write, improve and tailor resumes with AI and export them as PDFs. You may use it for your
          own job search and career documents.
        </p>
        <p>
          You must be old enough to enter a binding agreement where you live. Don&apos;t use GoMoxie to break the law,
          to impersonate someone else, or to disrupt or probe the service.
        </p>
      </>
    ),
  },
  {
    title: "Your account",
    body: (
      <>
        <p>
          You can sign up with an email and password or with Google. Keep your login details safe — you&apos;re
          responsible for what happens under your account. Tell us through the Help center if you think someone else has
          access to it.
        </p>
        <p>You can delete your account at any time from Settings. Deleting it permanently removes your resumes, career profiles and imported CV text.</p>
      </>
    ),
  },
  {
    title: "Your content",
    body: (
      <>
        <p>
          The resumes, career profiles and files you add stay yours. You give us permission to store and process them
          only so we can run GoMoxie for you — for example to generate, preview and export your resumes.
        </p>
        <p>
          You&apos;re responsible for what you put in your resume. Make sure the information is truthful and that you
          have the right to use anything you upload.
        </p>
      </>
    ),
  },
  {
    title: "AI-generated content",
    body: (
      <>
        <p>
          GoMoxie uses AI to write and rewrite resume content from the information you provide. AI can make mistakes:
          always review your resume before sending it, and correct anything that isn&apos;t accurate.
        </p>
        <p>
          We don&apos;t guarantee that a resume will pass a particular applicant tracking system or lead to an interview
          or job offer.
        </p>
      </>
    ),
  },
  {
    title: "Plans and payments",
    body: (
      <>
        <p>
          The free plan includes 3 AI generations. If an AI generation fails and gives you nothing usable, it&apos;s
          given back. Pro gives you unlimited generations while it&apos;s active. Current prices are on the{" "}
          <Link href="/pricing" className="font-medium text-neutral-900 underline decoration-neutral-300 underline-offset-2">
            pricing page
          </Link>
          .
        </p>
        <ul>
          <li>
            <strong className="font-semibold text-neutral-800">Polar</strong> — a monthly subscription that renews
            automatically until you cancel it in Settings. You keep Pro until the end of the period you&apos;ve paid for.
          </li>
          <li>
            <strong className="font-semibold text-neutral-800">Chapa</strong> — a one-off payment for one month of Pro.
            It doesn&apos;t renew automatically.
          </li>
        </ul>
        <p>Payments already made aren&apos;t refunded, except where the law requires it.</p>
      </>
    ),
  },
  {
    title: "Availability and changes",
    body: (
      <p>
        We work to keep GoMoxie running smoothly, but it may sometimes be unavailable, and features may change over
        time. If we make important changes to these terms, we&apos;ll update the date at the top of this page.
      </p>
    ),
  },
  {
    title: "Ending your use",
    body: (
      <p>
        You can stop using GoMoxie and delete your account whenever you like. We may suspend or close accounts that
        break these terms or put the service or other people at risk.
      </p>
    ),
  },
  {
    title: "Liability",
    body: (
      <p>
        GoMoxie is provided &quot;as is&quot;. To the extent the law allows, we aren&apos;t liable for indirect or
        consequential losses arising from your use of the service, such as missed job opportunities.
      </p>
    ),
  },
];

export default function TermsPage() {
  return (
    <LegalPage
      title="Terms of Service"
      updated="October 6, 2026"
      intro={
        <p>
          These terms explain what you can expect from GoMoxie and what we expect from you. By creating an account or
          using GoMoxie, you agree to them. Please also read our{" "}
          <Link href="/privacy" className="font-medium text-neutral-900 underline decoration-neutral-300 underline-offset-2">
            Privacy Policy
          </Link>
          .
        </p>
      }
      sections={sections}
    />
  );
}
