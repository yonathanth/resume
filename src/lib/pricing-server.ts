import type { PricingCatalog } from "@/lib/api";
import { FALLBACK_PRICING } from "@/lib/plans";
import { API_URL } from "@/lib/site";

/**
 * The live price list for server-rendered text (page descriptions, the help
 * center's structured data), or the backend's defaults if it can't be
 * reached (e.g. at build time). Refreshed hourly.
 */
export async function fetchPricing(): Promise<PricingCatalog> {
  try {
    const res = await fetch(`${API_URL}/api/v1/pricing`, { next: { revalidate: 60 * 60 } });
    if (!res.ok) return FALLBACK_PRICING;
    const body = (await res.json()) as { data?: PricingCatalog };
    return body.data ?? FALLBACK_PRICING;
  } catch {
    return FALLBACK_PRICING;
  }
}
