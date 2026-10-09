import { getAbsoluteUrl } from "@/utils/metadata";
import type { MetadataRoute } from "next";

export const dynamic = "force-static";

const PAGES = ["/", "/register", "/login", "/help", "/privacy", "/terms"];

export default function sitemap(): MetadataRoute.Sitemap {
  return PAGES.map((path) => ({
    url: getAbsoluteUrl(path),
    changeFrequency: path === "/" ? "weekly" : "monthly",
    priority: path === "/" ? 1 : 0.5,
  }));
}
