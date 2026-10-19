// Structured data (schema.org JSON-LD) for search engines. Rendered on the
// server; "<" is escaped so no value can close the script tag.
export function JsonLd({ data }: { data: Record<string, unknown> | Record<string, unknown>[] }) {
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, "\u003c") }} />;
}
