export const prerender = false;

const jsonHeaders = {
    "Access-Control-Allow-Origin": "https://insytech.mx",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Content-Type": "application/json",
};

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
        const source = String(body?.source || "").trim() || "(desconocida)";

        // Honeypot: si el campo oculto viene lleno, es un bot. Fingimos éxito sin enviar nada.
        if (String(body?.website || "").trim()) {
            return new Response(JSON.stringify({ ok: true }), {
                status: 200,
                headers: jsonHeaders,
            });
        }

        if (!name && !email) {
            return new Response(
                JSON.stringify({ error: "Faltan campos obligatorios (nombre o email)" }),
                { status: 400, headers: jsonHeaders },
            );
        }

        const accessKey =
            (import.meta as any).env?.WEB3FORMS_ACCESS_KEY ||
            process.env.WEB3FORMS_ACCESS_KEY;
        if (!accessKey) {
            return new Response(
                JSON.stringify({ error: "Servicio de correo no configurado" }),
                { status: 500, headers: jsonHeaders },
            );
        }

        // Web3Forms envía el correo a la dirección con la que se registró el access key
        // (regístralo con ventas@insytech.mx). Etiquetas en español = así se ven en el email.
        const res = await fetch("https://api.web3forms.com/submit", {
            method: "POST",
            headers: { "Content-Type": "application/json", Accept: "application/json" },
            body: JSON.stringify({
                access_key: accessKey,
                subject: `Nuevo lead desde ${source} — insytech.mx`,
                from_name: "Sitio Insytech",
                replyto: email || undefined,
                Nombre: name,
                Empresa: company,
                Email: email,
                Teléfono: phone,
                Mensaje: message,
                "Página de origen": source,
            }),
        });

        const data = await res.json().catch(() => ({}));
        if (!res.ok || data?.success === false) {
            throw new Error(data?.message || `HTTP ${res.status}`);
        }

        return new Response(JSON.stringify({ ok: true }), {
            status: 200,
            headers: jsonHeaders,
        });
    } catch (err: any) {
        return new Response(
            JSON.stringify({ error: err?.message || "Error interno" }),
            { status: 500, headers: jsonHeaders },
        );
    }
}
