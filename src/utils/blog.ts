// Blog redesign taxonomy and utilities.
//
// Centralizes what used to live only in each post's frontmatter: the visible
// label per category, the link back to the matching service page, the
// reading-time calculation, and the "Desde Monterrey" flag. One place for
// blog.astro and [...slug].astro instead of reinventing the mapping per page.

export const CATEGORIES = ["vision", "control", "mes", "software"] as const;

export type Category = (typeof CATEGORIES)[number];

/** Visible label per category (card eyebrow, tabs, breadcrumb). */
export const CATEGORY_LABEL: Record<Category, string> = {
    vision: "Visión artificial",
    control: "Automatización y control",
    mes: "MES y trazabilidad",
    software: "Software e IA",
};

/** Service page that "Sigue leyendo" links to, per category. */
export const CATEGORY_SERVICE_HREF: Record<Category, string> = {
    vision: "/vision/",
    control: "/control/",
    mes: "/tracking/",
    software: "/software/",
};

/** Service name exactly as it appears in the Navbar dropdown: the "Sigue
 *  leyendo" service card reuses that same label verbatim. */
export const CATEGORY_SERVICE_NAME: Record<Category, string> = {
    vision: "Visión con IA",
    control: "Automatización y Control",
    mes: "Trazabilidad y Monitoreo",
    software: "Desarrollo de Software",
};

const WORDS_PER_MINUTE = 200;

/** Reading minutes from the body's real word count (frontmatter excluded),
 *  never an invented number. */
export function readingTime(body: string): number {
    const words = body
        .trim()
        .split(/\s+/)
        .filter(Boolean).length;
    return Math.max(1, Math.ceil(words / WORDS_PER_MINUTE));
}

/** A post is "geo-local" when its slug targets Monterrey search intent —
 *  the signal that feeds the listing's "Desde Monterrey" band. */
export function isGeoLocal(slug: string): boolean {
    return slug.endsWith("-monterrey");
}
