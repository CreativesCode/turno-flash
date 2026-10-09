import { getAbsoluteUrl } from "@/utils/metadata";
import type { MetadataRoute } from "next";

export const dynamic = "force-static";

// The panel and the auth callbacks have nothing to index. /book and /trips
// are not listed here on purpose: they carry their own noindex, and a
// crawler must be able to read it.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", allow: "/", disallow: ["/dashboard", "/auth"] },
    sitemap: getAbsoluteUrl("/sitemap.xml"),
  };
}
