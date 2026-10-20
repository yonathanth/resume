import type { Metadata } from "next";
import { pageMetadata } from "@/lib/metadata";
import Link from "next/link";
import { LegalPage, type LegalSection } from "@/components/LegalPage";

export const metadata: Metadata = pageMetadata({
  title: "Privacy Policy",
  description:
    "What gomoxie collects, why, and the choices you have.",
  path: "/privacy",
});

const sections: LegalSection[] = [
  {
    title: "What we collect",
    body: (
      <ul>
        <li>
          <strong className="font-semibold text-neutral-800">Account details</strong> — your email address and name.
          If you sign in with Google, we receive your basic Google profile (name and email). Passwords are stored only
          in hashed form.
        </li>
        <li>
          <strong className="font-semibold text-neutral-800">Resume content</strong> — the resumes, career profiles and
          job descriptions you create or paste in.
        </li>
        <li>
          <strong className="font-semibold text-neutral-800">Uploaded CVs</strong> — when you import a CV, the file is
          read in memory and never stored; we keep the text extracted from it.
        </li>
        <li>
          <strong className="font-semibold text-neutral-800">Subscription details</strong> — your plan, its status and
          payment records from our payment providers. We never see or store your full card or bank details.
        </li>
      </ul>
    ),
  },
  {
    title: "How we use it",
    body: (
      <ul>
        <li>To run your account and keep you signed in.</li>
        <li>To generate, improve, tailor, preview and export your resumes.</li>
        <li>To manage your plan and the number of free generations you have left.</li>
        <li>To keep gomoxie secure and fix problems.</li>
      </ul>
    ),
  },
  {
    title: "AI processing",
    body: (
      <p>
        When you ask gomoxie to write or rewrite a resume, the relevant content — for example your experience and a job
        description you pasted — is sent to our AI provider to produce the result. It&apos;s used to answer that request,
        not to advertise to you.
      </p>
    ),
  },
  {
    title: "Who we share it with",
    body: (
      <>
        <p>We don&apos;t sell your personal information. We share it only with services that help us run gomoxie:</p>
        <ul>
          <li>our AI provider, to generate resume content;</li>
          <li>Google, if you choose to sign in with Google;</li>
          <li>Polar and Chapa, to process payments;</li>
          <li>the hosting and database services that store your account.</li>
        </ul>
        <p>We may also disclose information when the law requires it.</p>
      </>
    ),
  },
  {
    title: "Cookies",
    body: (
      <p>
        We use a cookie to keep you signed in securely. We don&apos;t use advertising cookies.
      </p>
    ),
  },
  {
    title: "Keeping and deleting your data",
    body: (
      <p>
        We keep your data while your account is open. You can delete individual resumes and career profiles at any time,
        or delete your whole account from Settings — that permanently removes your resumes, career profiles, imported CV
        text and payment records. If you have an active Pro subscription, cancel it first so you aren&apos;t billed again.
      </p>
    ),
  },
  {
    title: "Security",
    body: (
      <p>
        We protect your data with measures such as hashed passwords and secure, expiring sign-in tokens. No online service
        can be perfectly secure, so please use a strong, unique password.
      </p>
    ),
  },
  {
    title: "Changes to this policy",
    body: <p>If we change this policy in a meaningful way, we&apos;ll update the date at the top of this page.</p>,
  },
];

export default function PrivacyPage() {
  return (
    <LegalPage
      title="Privacy Policy"
      updated="October 6, 2026"
      intro={
        <p>
          Your resume holds a lot about you. This policy explains what gomoxie collects, why, and the choices you have.
          It works alongside our{" "}
          <Link href="/terms" className="font-medium text-neutral-900 underline decoration-neutral-300 underline-offset-2">
            Terms of Service
          </Link>
          .
        </p>
      }
      sections={sections}
    />
  );
}
