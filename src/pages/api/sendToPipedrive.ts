export const prerender = false;

const jsonHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Content-Type": "application/json",
};

async function pdFetch(path: string, opts: RequestInit, apiToken: string) {
    const url =
        `https://api.pipedrive.com/v1${path}${(path.includes("?") ? "&" : "?")}api_token=${apiToken}`;

    const res = await fetch(url, {
        ...opts,
        headers: {
            "Content-Type": "application/json",
            ...(opts.headers || {}),
        },
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok || data?.success === false) {
        const msg =
            data?.error || data?.message || data?.error_info || `HTTP ${res.status}`;
        throw new Error(msg);
    }
    return data;
}

export async function OPTIONS() {
    return new Response(null, { status: 204, headers: jsonHeaders });
}

export async function POST({ request }: { request: Request }) {
    try {
        const body = await request.json().catch(() => ({}));
        const name = String(body?.name || "").trim();
        const email = String(body?.email || "").trim();
        const phone = String(body?.phone || "").trim();
        const company = String(body?.company || "").trim();
        const message = String(body?.message || "").trim();

        if (!name && !email) {
            return new Response(
                JSON.stringify({ error: "Faltan campos obligatorios (nombre o email)" }),
                { status: 400, headers: jsonHeaders },
            );
        }

        // API key (dev y Vercel)
        const apiKey =
            (import.meta as any).env?.PIPEDRIVE_API_KEY ||
            process.env.PIPEDRIVE_API_KEY;
        if (!apiKey) {
            return new Response(
                JSON.stringify({ error: "API key no configurada" }),
                { status: 500, headers: jsonHeaders },
            );
        }

        // 0) Organización
        let orgId: number | undefined;
        if (company) {
            try {
                const org = await pdFetch(
                    "/organizations",
                    { method: "POST", body: JSON.stringify({ name: company }) },
                    apiKey,
                );
                orgId = org?.data?.id;
            } catch {
                // si falla la org, seguimos sin detener el flujo
            }
        }

        // 1) Persona
        const personPayload: any = {
            name: name || email,
            ...(orgId ? { org_id: orgId } : {}),
        };
        if (email) {
            personPayload.email = [
                { value: email, label: "work", primary: true },
            ];
        }
        if (phone) {
            personPayload.phone = [
                { value: phone, label: "work", primary: true },
            ];
        }

        const person = await pdFetch(
            "/persons",
            { method: "POST", body: JSON.stringify(personPayload) },
            apiKey,
        );

        // 2) LEAD
        const leadPayload: any = {
            title: `Lead de ${company || name || email}`,
            person_id: person?.data?.id,
            ...(orgId ? { organization_id: orgId } : {}),
        };

        const lead = await pdFetch(
            "/leads",
            { method: "POST", body: JSON.stringify(leadPayload) },
            apiKey,
        );

        // 3) Nota en el lead
        if (message) {
            await pdFetch(
                "/notes",
                {
                    method: "POST",
                    body: JSON.stringify({
                        content: message,
                        lead_id: lead?.data?.id,
                    }),
                },
                apiKey,
            );
        }

        return new Response(
            JSON.stringify({ ok: true, lead_id: lead?.data?.id }),
            { status: 200, headers: jsonHeaders },
        );
    } catch (err: any) {
        return new Response(
            JSON.stringify({ error: err?.message || "Error interno" }),
            { status: 500, headers: jsonHeaders },
        );
    }
}