import type { APIRoute } from "astro";

// The one server route on an otherwise static site. It exists for a single
// reason: the CRM shared secret cannot live in the browser bundle.
//
// It deliberately does NOT send the email. Web3Forms' free plan rejects
// server-side submissions ("Use our API in client side... Pro plan is
// required"), so the mail stays a client-side call in FormBase.astro and this
// route only runs afterwards, once the mail — the lead's safety net — is out.
export const prerender = false;

// Agreed with the CRM as a CLOSED enum: an unknown slug is a 422 there, not a
// silent bucket. Adding a page with a form is a coordinated change in both
// repos — tell the CRM side before shipping one.
const FORM_SLUGS: Record<string, string> = {
    "/": "contacto-home",
    "/vision/": "contacto-vision",
    "/ai/": "contacto-ai",
    "/control/": "contacto-control",
    "/tracking/": "contacto-tracking",
    "/software/": "contacto-software",
    "/contact/": "contacto-contacto",
};
const KNOWN_SLUGS = new Set(Object.values(FORM_SLUGS));

// Field caps mirror the CRM's, so an oversized value is truncated here instead
// of coming back as a 422. `email` is the exception — see the guard below.
const LIMITS = { name: 200, company: 200, email: 320, phone: 50, message: 5000 };
const MAX_BODY_BYTES = 16 * 1024;
const CRM_TIMEOUT_MS = 3000;

const env = (key: string) => process.env[key]?.trim() || undefined;

type Lead = {
    form: string;
    name: string;
    company: string;
    email: string;
    phone: string;
    message: string;
};

/**
 * Hand the lead to the CRM. Every failure — network, timeout, 4xx, 5xx — is
 * logged and swallowed. No automatic retries: the CRM does not dedupe in v1,
 * so a retry would create a duplicate lead.
 *
 * Each skip gets its own fixed CRM_SKIP_* label, so "why are no leads
 * arriving" is answered by a grep of the Vercel logs instead of a reading.
 */
async function sendToCrm(lead: Lead): Promise<void> {
    const url = env("CRM_LEAD_URL");
    const key = env("CRM_LEAD_KEY");
    if (!url || !key) {
        // Both vars are scoped to Production ONLY in Vercel, deliberately: a
        // preview deploy falls through here, so it can never create real leads
        // in the production CRM. Copying them to Preview breaks that.
        // Loudest of the skips: it drops 100% of leads, not an edge case.
        console.error("[lead] CRM_SKIP_UNCONFIGURED: CRM_LEAD_URL/CRM_LEAD_KEY unset");
        return;
    }
    if (!KNOWN_SLUGS.has(lead.form)) {
        console.error(`[lead] CRM_SKIP_UNKNOWN_SLUG: "${lead.form}"`);
        return;
    }
    // A truncated address is a wrong address, and the CRM matches contacts by
    // email. Past 320 chars it is junk, so drop it rather than mismatch it.
    if (lead.email.length > LIMITS.email) {
        console.error(`[lead] CRM_SKIP_OVERSIZED_EMAIL: ${lead.email.length} chars`);
        return;
    }

    try {
        const res = await fetch(url, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "X-Insytech-Key": key,
            },
            body: JSON.stringify(lead),
            signal: AbortSignal.timeout(CRM_TIMEOUT_MS),
        });
        if (res.status === 201) return;

        const detail = await res.text().catch(() => "");
        // 401/403/404 all mean broken configuration rather than a bad payload:
        // a wrong key, a browser-origin call tripping the CRM's cross-site
        // guard, or the CRM not provisioned yet. A 404 also means CRM_LEAD_URL
        // was given a trailing slash — the CRM's router does not normalise it.
        const misconfigured = [401, 403, 404].includes(res.status);
        const label = misconfigured ? "CRM_SKIP_MISCONFIGURED" : "CRM_SKIP_REJECTED";
        console.error(`[lead] ${label}: ${res.status} ${detail}`);
    } catch (err) {
        console.error("[lead] CRM_SKIP_UNREACHABLE:", err);
    }
}

export const POST: APIRoute = async ({ request, url: requestUrl }) => {
    // Modest gate against off-site scripts posting straight at this route. Only
    // rejects when a browser actually declares a foreign origin; a missing
    // Origin (server-to-server, curl) is left alone.
    const origin = request.headers.get("origin");
    if (origin && new URL(origin).host !== requestUrl.host) {
        return new Response(null, { status: 403 });
    }

    const raw = await request.text();
    if (raw.length > MAX_BODY_BYTES) return new Response(null, { status: 413 });

    let body: Record<string, unknown>;
    try {
        body = JSON.parse(raw);
    } catch {
        return new Response(null, { status: 400 });
    }

    const field = (key: string, max: number) =>
        String(body[key] ?? "")
            .trim()
            .slice(0, max);

    // Honeypot: a filled hidden field means a bot. Such a submission never gets
    // this far — Web3Forms rejects it client-side first — but the CRM must
    // never hear that bots exist even if that ever changes.
    if (field("website", 200) !== "") return new Response(null, { status: 204 });

    const page = field("page", 200);
    const lead: Lead = {
        form: FORM_SLUGS[page] ?? "",
        name: field("name", LIMITS.name),
        company: field("company", LIMITS.company),
        email: field("email", MAX_BODY_BYTES), // never truncated, see sendToCrm
        phone: field("phone", LIMITS.phone),
        message: field("message", LIMITS.message),
    };

    await sendToCrm(lead);

    // Always 204: the browser has already told the visitor the mail went out,
    // and nothing this route reports could change that.
    return new Response(null, { status: 204 });
};
