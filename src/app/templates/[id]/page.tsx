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
import { TemplateCard } from "@/components/dashboard/TemplatesView";

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

        <div className="grid grid-cols-1 items-start gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:gap-14">
          {/* The real page, on a soft stage */}
          <div className="rounded-2xl border border-neutral-200 bg-neutral-100/70 p-4 sm:p-6 lg:sticky lg:top-28">
            <div className="mx-auto w-full max-w-md overflow-hidden rounded-lg border border-neutral-200 shadow-[0_24px_60px_-28px_rgba(15,17,21,0.35)]">
              <TemplatePreview template={template} eager />
            </div>
          </div>

          <div className="lg:pt-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full border border-accent-border bg-accent-soft px-3 py-1 text-xs font-semibold text-accent-strong">
                {template.category}
              </span>
              <span className="rounded-full border border-neutral-200 bg-white px-3 py-1 text-xs font-medium text-neutral-600">
                {template.twoColumn ? "Two columns" : "One column"}
              </span>
              {template.hasPhoto && (
                <span className="rounded-full border border-neutral-200 bg-white px-3 py-1 text-xs font-medium text-neutral-600">Photo</span>
              )}
            </div>
            <h1 className="mt-4 text-3xl font-bold tracking-tight text-neutral-950 sm:text-4xl sm:leading-[1.1]">{template.name}</h1>
            <p className="mt-3 text-base leading-relaxed text-neutral-600">
              {template.description}
              {copy && <> {copy.blurb}</>}
            </p>

            <div className="mt-7 flex flex-wrap gap-3">
              <CtaButton href={useHref}>Use this template</CtaButton>
              <CtaButton href="/templates" variant="secondary" plainArrow>
                All templates
              </CtaButton>
            </div>
            <p className="mt-3 text-[13px] text-neutral-500">Free to start. No account needed until you see your CV.</p>

            <div className="mt-9 space-y-3">
              {copy && (
                <div className="rounded-xl border border-neutral-200 bg-white px-5 py-4">
                  <h2 className="text-xs font-semibold uppercase tracking-wide text-neutral-500">Best for</h2>
                  <p className="mt-1 text-sm text-neutral-800">{copy.bestFor}</p>
                </div>
              )}
              <div className="rounded-xl border border-neutral-200 bg-white px-5 py-4">
                <h2 className="text-xs font-semibold uppercase tracking-wide text-neutral-500">Layout</h2>
                <p className="mt-1 text-sm text-neutral-800">{layout}</p>
              </div>
              <div className="rounded-xl border border-neutral-200 bg-white px-5 py-4">
                <h2 className="text-xs font-semibold uppercase tracking-wide text-neutral-500">Sections</h2>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {template.sections.map((section) => (
                    <span key={section.key} className="rounded-md bg-neutral-100 px-2 py-1 text-xs font-medium text-neutral-700">
                      {section.label}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            <ul className="mt-6 space-y-2.5 rounded-xl border border-accent-border/60 bg-accent-soft/40 px-5 py-4">
              {[
                "Reads cleanly in applicant tracking systems",
                "Filled in by AI from your story or your current CV",
                "Switch templates any time without losing anything",
                "Downloads as a PDF that looks the same everywhere",
              ].map((point) => (
                <li key={point} className="flex gap-2.5 text-sm text-neutral-800">
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-accent-strong" strokeWidth={2.5} />
                  {point}
                </li>
              ))}
            </ul>
          </div>
        </div>

        {related.length > 0 && (
          <section className="mt-20" aria-labelledby="related-title">
            <h2 id="related-title" className="text-xl font-bold tracking-tight text-neutral-950 sm:text-2xl">
              More templates like this
            </h2>
            {/* The same cards as the templates gallery. */}
            <div className="mt-6 grid grid-cols-1 gap-x-6 gap-y-10 sm:grid-cols-3">
              {related.map((t) => (
                <TemplateCard key={t.id} template={t} href={`/templates/${t.id}`} useHref={`/try/create?template=${encodeURIComponent(t.id)}`} />
              ))}
            </div>
          </section>
        )}
      </main>

      <Footer />
    </div>
  );
}
