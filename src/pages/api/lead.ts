import type { APIRoute } from "astro";

// This route must run on the server: it holds the CRM shared secret, which can
// never reach the browser. `output` stays 'static' for every other page.
export const prerender = false;

// Public Web3Forms key (safe in the clear per their docs). The email is the
// safety net for a lead, so it is sent first and its result is what the
// visitor sees.
const WEB3FORMS_KEY = "6e179734-4555-4053-ab94-9b4413672e9c";

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
// of coming back as a 422 after the email already went out.
const LIMITS = { name: 200, company: 200, email: 320, phone: 50, message: 5000 };
const MAX_BODY_BYTES = 16 * 1024;
const CRM_TIMEOUT_MS = 3000;

const env = (key: string) => process.env[key]?.trim() || undefined;

const json = (status: number, body: unknown) =>
    new Response(JSON.stringify(body), {
        status,
        headers: { "Content-Type": "application/json" },
    });

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
 * logged and swallowed: a CRM outage must never break the email or show the
 * visitor an error. No automatic retries; the CRM does not dedupe in v1, so a
 * retry would create a duplicate lead.
 */
async function sendToCrm(lead: Lead): Promise<void> {
    const url = env("CRM_LEAD_URL");
    const key = env("CRM_LEAD_KEY");
    if (!url || !key) {
        // Both vars are scoped to Production ONLY in Vercel, deliberately: a
        // preview deploy falls through here and just sends the email, so it can
        // never create real leads in the production CRM. Copying them to
        // Preview "to test" breaks that guarantee.
        // Loudest of the three skips: it drops 100% of leads, not an edge case.
        console.error("[lead] CRM_SKIP_UNCONFIGURED: CRM_LEAD_URL/CRM_LEAD_KEY unset");
        return;
    }
    if (!KNOWN_SLUGS.has(lead.form)) {
        console.error(`[lead] CRM_SKIP_UNKNOWN_SLUG: "${lead.form}"`);
        return;
    }
    // A truncated address is a wrong address, and the CRM matches contacts by
    // email. Over 320 chars is junk, so drop the lead rather than mismatch it.
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
        // a wrong or missing key, a browser-origin call tripping the CRM's
        // cross-site guard, or the CRM not provisioned yet. The 404 is expected
        // during bring-up, until the key and system account exist there.
        const misconfigured = [401, 403, 404].includes(res.status);
        const label = misconfigured ? "CRM_SKIP_MISCONFIGURED" : "CRM_SKIP_REJECTED";
        console.error(`[lead] ${label}: ${res.status} ${detail}`);
    } catch (err) {
        console.error("[lead] CRM_SKIP_UNREACHABLE:", err);
    }
}

export const POST: APIRoute = async ({ request }) => {
    const raw = await request.text();
    if (raw.length > MAX_BODY_BYTES) return json(413, { error: "Payload too large" });

    let body: Record<string, unknown>;
    try {
        body = JSON.parse(raw);
    } catch {
        return json(400, { error: "Malformed JSON" });
    }

    const field = (key: string, max: number) =>
        String(body[key] ?? "")
            .trim()
            .slice(0, max);

    const page = field("page", 200);
    const lead: Lead = {
        form: FORM_SLUGS[page] ?? "",
        name: field("name", LIMITS.name),
        company: field("company", LIMITS.company),
        // Never truncated: see the oversized-email guard in sendToCrm.
        email: field("email", MAX_BODY_BYTES),
        phone: field("phone", LIMITS.phone),
        message: field("message", LIMITS.message),
    };
    // Honeypot: a filled hidden field means a bot. Web3Forms drops it through
    // `botcheck`; the CRM never hears that bots exist.
    const isBot = field("website", 200) !== "";

    if (!lead.name && !lead.email) return json(422, { error: "Name or email required" });

    const mail = await fetch("https://api.web3forms.com/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({
            access_key: WEB3FORMS_KEY,
            subject: `Nuevo lead desde ${page} — insytech.mx`,
            from_name: "Sitio Insytech",
            replyto: lead.email,
            botcheck: isBot,
            Nombre: lead.name,
            Empresa: lead.company,
            Email: lead.email,
            Teléfono: lead.phone,
            Mensaje: lead.message,
            "Página de origen": page,
        }),
    }).catch(() => null);

    const mailBody = mail ? await mail.json().catch(() => ({})) : {};
    if (!mail?.ok || mailBody?.success === false) {
        console.error("[lead] Web3Forms failed:", mail?.status, mailBody?.message);
        return json(502, { error: "Could not send" });
    }

    if (!isBot) await sendToCrm(lead);

    return json(200, { success: true });
};
