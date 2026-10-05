#!/usr/bin/env node
// Notifica a IndexNow (Bing, Yandex y buscadores que lo soportan) sobre URLs
// nuevas o modificadas. Ejecutar DESPUÉS de que el deploy de Vercel esté en
// vivo: IndexNow valida el keyLocation contra el sitio real, así que si el
// archivo de la key aún no está publicado la API responde 403. Enviar solo
// las URLs que realmente cambiaron, no el sitio completo en cada corrida.
//
// Uso:
//   node scripts/indexnow.mjs /blog/mi-post/ https://insytech.mx/control/
//   node scripts/indexnow.mjs --all
//   node scripts/indexnow.mjs --dry-run /blog/mi-post/

const HOST = "insytech.mx";
const KEY = "1f659bc10e94aa8dcaf8f0da4152204b";
const KEY_LOCATION = `https://${HOST}/${KEY}.txt`;
const SITEMAP_URL = `https://${HOST}/sitemap-0.xml`;
const ENDPOINT = "https://api.indexnow.org/indexnow";

const args = process.argv.slice(2);
const dryRun = args.includes("--dry-run");
const all = args.includes("--all");
const inputs = args.filter((a) => a !== "--dry-run" && a !== "--all");

// El sitio usa trailingSlash 'always': una ruta de página sin barra final
// nunca coincide con la URL real, así que se normaliza antes de enviarla.
function normalizeUrl(input) {
    const url = input.startsWith("http") ? new URL(input) : new URL(input, `https://${HOST}`);
    if (!url.pathname.includes(".") && !url.pathname.endsWith("/")) {
        url.pathname += "/";
    }
    return url.href;
}

async function getAllSitemapUrls() {
    const res = await fetch(SITEMAP_URL);
    if (!res.ok) {
        throw new Error(`No se pudo obtener ${SITEMAP_URL}: HTTP ${res.status}`);
    }
    const xml = await res.text();
    const matches = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)];
    return matches.map((m) => m[1]);
}

function explainStatus(status) {
    switch (status) {
        case 200:
        case 202:
            return "OK: IndexNow aceptó la solicitud.";
        case 400:
            return "Bad Request: revisa el formato del payload.";
        case 403:
            return "Forbidden: la key no está publicada o no coincide. Verifica que el deploy ya esté en vivo.";
        case 422:
            return "Unprocessable: alguna URL no corresponde al host o no coincide con la key.";
        case 429:
            return "Too Many Requests: espera antes de reintentar.";
        default:
            return "Respuesta inesperada.";
    }
}

async function main() {
    let urlList;
    if (all) {
        urlList = await getAllSitemapUrls();
    } else {
        if (inputs.length === 0) {
            console.error("Uso: node scripts/indexnow.mjs [--dry-run] [--all] <ruta|url> ...");
            process.exit(1);
        }
        urlList = inputs.map(normalizeUrl);
    }

    const payload = { host: HOST, key: KEY, keyLocation: KEY_LOCATION, urlList };

    if (dryRun) {
        console.log(JSON.stringify(payload, null, 2));
        return;
    }

    const res = await fetch(ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json; charset=utf-8" },
        body: JSON.stringify(payload),
    });

    console.log(`HTTP ${res.status} — ${explainStatus(res.status)}`);
}

main().catch((err) => {
    console.error(err.message);
    process.exit(1);
});
