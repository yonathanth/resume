import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Check } from "lucide-react";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { CtaButton } from "@/components/CtaButton";
import { JsonLd } from "@/components/JsonLd";
import { pageMetadata } from "@/lib/metadata";
import { breadcrumbs } from "@/lib/structured-data";
import { CATEGORY_COPY, fetchPublicTemplate, fetchPublicTemplates, templatePreviewUrl } from "@/lib/templates-server";
import type { ApiCvTemplate } from "@/lib/api";

// One page per template (/templates/classic, /templates/sidebar, …): a real
// preview, who it suits, what it includes, and a button that starts a CV with
// it — no account needed until the AI runs (/try/create?template=<id>).
// Built from the backend's template registry; refreshed hourly, and a
// template added later renders on its first visit.

export const revalidate = 3600;

export async function generateStaticParams() {
  return (await fetchPublicTemplates()).map((t) => ({ id: t.id }));
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const template = await fetchPublicTemplate(id);
  if (!template) return { title: "Template not found" };
  return pageMetadata({
    title: `Free ${template.name} resume template`,
    description: `${template.description} A free ${template.category.toLowerCase()} resume template that reads cleanly in applicant tracking systems. Fill it in with AI and download a PDF.`,
    path: `/templates/${template.id}`,
  });
}

function TemplatePreview({ template, className = "", eager = false }: { template: ApiCvTemplate; className?: string; eager?: boolean }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element -- rendered by the backend; a plain image keeps it crawlable without image-domain config
    <img
      src={templatePreviewUrl(template.id)}
      alt={`${template.name} resume template example: a sample CV laid out in the ${template.name} design`}
      width={794}
      height={1123}
      loading={eager ? "eager" : "lazy"}
      className={`block h-auto w-full bg-white ${className}`}
    />
  );
}

export default async function TemplatePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const templates = await fetchPublicTemplates();
  const template = templates.find((t) => t.id === id);
  if (!template) notFound();

  const copy = CATEGORY_COPY[template.category];
  const layout = template.twoColumn ? "Two columns: a sidebar for skills and details, the main column for experience" : "One column, top to bottom";
  // Same category first, then the rest, three in all.
  const related = [
    ...templates.filter((t) => t.id !== template.id && t.category === template.category),
    ...templates.filter((t) => t.id !== template.id && t.category !== template.category),
  ].slice(0, 3);
  const useHref = `/try/create?template=${encodeURIComponent(template.id)}`;

  return (
    <div className="relative flex min-h-screen flex-col justify-between bg-[#fdfdfd] font-sans text-neutral-900 selection:bg-accent selection:text-white">
      <JsonLd
        data={breadcrumbs([
          { name: "Templates", path: "/templates" },
          { name: `${template.name} resume template`, path: `/templates/${template.id}` },
        ])}
      />
      <div className="pointer-events-none absolute inset-0 bg-grid-pattern opacity-40" />
      <Navbar />

      <main className="relative z-10 mx-auto w-full max-w-6xl px-4 pb-24 pt-32 sm:px-6 sm:pt-36 lg:px-8">
        <nav aria-label="Breadcrumb" className="mb-8">
          <Link href="/templates" className="inline-flex items-center gap-1.5 text-sm font-medium text-neutral-500 hover:text-neutral-900">
            <ArrowLeft className="h-4 w-4" />
            All templates
          </Link>
        </nav>

        <div className="grid grid-cols-1 items-start gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:gap-16">
          <div className="mx-auto w-full max-w-md overflow-hidden rounded-lg border border-neutral-200 shadow-[0_24px_60px_-28px_rgba(15,17,21,0.35)] lg:sticky lg:top-28">
            <TemplatePreview template={template} eager />
          </div>

          <div>
            <span className="inline-flex rounded-full border border-accent-border bg-accent-soft px-3 py-1 text-xs font-semibold text-accent-strong">
              {template.category}
            </span>
            <h1 className="mt-4 text-4xl font-bold tracking-tight text-neutral-950 sm:text-5xl sm:leading-[1.05]">
              {template.name} resume template
            </h1>
            <p className="mt-4 text-lg leading-relaxed text-neutral-600">{template.description}</p>
            {copy && <p className="mt-3 text-base leading-relaxed text-neutral-600">{copy.blurb}</p>}

            <div className="mt-8 flex flex-wrap gap-3">
              <CtaButton href={useHref}>Use this template — free</CtaButton>
              <CtaButton href="/templates" variant="secondary" plainArrow>
                Browse all templates
              </CtaButton>
            </div>
            <p className="mt-3 text-sm text-neutral-500">No account needed to start. Sign up when it&apos;s time to see your CV.</p>

            <dl className="mt-10 divide-y divide-neutral-200 rounded-lg border border-neutral-200 bg-white">
              {copy && (
                <div className="grid grid-cols-1 gap-1 px-5 py-4 sm:grid-cols-[9rem_1fr]">
                  <dt className="text-sm font-semibold text-neutral-900">Best for</dt>
                  <dd className="text-sm text-neutral-600">{copy.bestFor}</dd>
                </div>
              )}
              <div className="grid grid-cols-1 gap-1 px-5 py-4 sm:grid-cols-[9rem_1fr]">
                <dt className="text-sm font-semibold text-neutral-900">Layout</dt>
                <dd className="text-sm text-neutral-600">{layout}</dd>
              </div>
              <div className="grid grid-cols-1 gap-1 px-5 py-4 sm:grid-cols-[9rem_1fr]">
                <dt className="text-sm font-semibold text-neutral-900">Sections</dt>
                <dd className="text-sm text-neutral-600">{template.sections.map((s) => s.label).join(", ")}</dd>
              </div>
            </dl>

            <ul className="mt-8 space-y-2.5">
              {[
                "Reads cleanly in applicant tracking systems: real text, standard headings",
                "Filled in for you by AI from your own story, or from the CV you already have",
                "Switch to another template any time; nothing you've written is lost",
                "Download as a PDF that looks the same on every screen",
              ].map((point) => (
                <li key={point} className="flex gap-2.5 text-sm text-neutral-700">
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
                  {point}
                </li>
              ))}
            </ul>
          </div>
        </div>

        {related.length > 0 && (
          <section className="mt-24" aria-labelledby="related-title">
            <h2 id="related-title" className="text-2xl font-bold tracking-tight text-neutral-950">
              More templates like this
            </h2>
            <div className="mt-6 grid grid-cols-1 gap-8 sm:grid-cols-3">
              {related.map((t) => (
                <Link key={t.id} href={`/templates/${t.id}`} className="group flex flex-col">
                  <div className="overflow-hidden rounded-lg border border-neutral-200 transition-all duration-300 group-hover:-translate-y-1 group-hover:border-accent-border group-hover:shadow-[0_18px_40px_-24px_rgba(15,17,21,0.3)]">
                    <TemplatePreview template={t} />
                  </div>
                  <span className="mt-3 text-base font-semibold tracking-tight text-neutral-950">{t.name}</span>
                  <span className="text-sm text-neutral-500">{t.category}</span>
                </Link>
              ))}
            </div>
          </section>
        )}
      </main>

      <Footer />
    </div>
  );
}
