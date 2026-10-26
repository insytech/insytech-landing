// @ts-check
import { defineConfig } from "astro/config";
import tailwindcss from "@tailwindcss/vite";
import vercel from '@astrojs/vercel';
import react from '@astrojs/react';
import sitemap from '@astrojs/sitemap';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// Mapa slug -> fecha para el <lastmod> del sitemap, solo de los posts del blog.
// Se lee el frontmatter a mano (sin dependencia YAML) porque únicamente nos
// interesan dos líneas: `pubDate:` y `updatedDate:`. El resto del contenido
// no tiene una fecha honesta por página (no editamos esas rutas con esa
// disciplina), así que no se les inventa un lastmod de build.
const blogDir = fileURLToPath(new URL('./src/content/blog', import.meta.url));
const blogLastmod = new Map();
for (const file of fs.readdirSync(blogDir)) {
    if (!file.endsWith('.md')) continue;
    const slug = path.basename(file, '.md');
    const raw = fs.readFileSync(path.join(blogDir, file), 'utf-8');
    const frontmatter = raw.match(/^---\n([\s\S]*?)\n---/)?.[1] ?? '';
    const pubDate = frontmatter.match(/^pubDate:\s*(.+)$/m)?.[1]?.trim();
    const updatedDate = frontmatter.match(/^updatedDate:\s*(.+)$/m)?.[1]?.trim();
    // YAML admite la fecha entre comillas; sin quitarlas, new Date() da Invalid Date
    // y toISOString() tumba el build.
    const date = (updatedDate ?? pubDate)?.replace(/^['"]|['"]$/g, '');
    if (date) blogLastmod.set(slug, new Date(date).toISOString());
}

// Para las páginas que no son del blog, la fecha honesta es el último commit que
// tocó lo que la página muestra: su archivo en src/pages más los componentes que
// importa, recorridos de forma transitiva. Se excluye el cromo del sitio
// (src/components/elements: navbar, footer, SEO, cookies), los layouts y las
// utilidades, porque un cambio ahí no cambia el contenido de la página.
//
// Vercel clona con historia corta. En un clon superficial, el commit frontera
// aparenta haber creado todos los archivos, así que su fecha sería falsa: si el
// último commit de una página es frontera, la página se queda sin lastmod.
const srcDir = fileURLToPath(new URL('./src', import.meta.url));
const aliasRoots = { '@components': 'components', '@layouts': 'layouts', '@utils': 'utils' };
const sourceExts = ['', '.astro', '.tsx', '.jsx', '.ts', '.js'];

function resolveImport(fromFile, spec) {
    let base;
    if (spec.startsWith('.')) base = path.resolve(path.dirname(fromFile), spec);
    else {
        const alias = Object.keys(aliasRoots).find((a) => spec.startsWith(`${a}/`));
        if (!alias) return undefined;
        base = path.join(srcDir, aliasRoots[alias], spec.slice(alias.length + 1));
    }
    return sourceExts.map((ext) => base + ext).find((p) => fs.existsSync(p) && fs.statSync(p).isFile());
}

function contentFiles(entry) {
    const seen = new Set();
    const pending = [entry];
    while (pending.length) {
        const file = pending.pop();
        if (seen.has(file)) continue;
        seen.add(file);
        const raw = fs.readFileSync(file, 'utf-8');
        for (const [, spec] of raw.matchAll(/(?:from|import)\s+['"]([^'"]+)['"]/g)) {
            const resolved = resolveImport(file, spec);
            if (!resolved) continue;
            const rel = path.relative(srcDir, resolved);
            if (rel.startsWith('pages') || (rel.startsWith('components') && !rel.startsWith(path.join('components', 'elements')))) {
                pending.push(resolved);
            }
        }
    }
    return [...seen];
}

function gitLastmod(files) {
    try {
        const shallowFile = execFileSync('git', ['rev-parse', '--git-path', 'shallow'], { encoding: 'utf-8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
        const boundaries = fs.existsSync(shallowFile) ? fs.readFileSync(shallowFile, 'utf-8').split('\n') : [];
        const [hash, date] = execFileSync('git', ['log', '-1', '--format=%H %cI', '--', ...files], { encoding: 'utf-8', stdio: ['ignore', 'pipe', 'ignore'] })
            .trim()
            .split(' ');
        if (!hash || boundaries.includes(hash)) return undefined;
        return new Date(date).toISOString();
    } catch {
        return undefined;
    }
}

const pagesDir = path.join(srcDir, 'pages');
const pageLastmod = new Map();
for (const file of fs.readdirSync(pagesDir, { recursive: true })) {
    const full = path.join(pagesDir, String(file));
    if (!full.endsWith('.astro') || full.includes('[')) continue;
    const route = `/${path.relative(pagesDir, full).replace(/(^|\/)index\.astro$/, '$1').replace(/\.astro$/, '')}`;
    const url = route === '/' ? '/' : `${route.replace(/\/$/, '')}/`;
    // El listado del blog pinta los títulos de la colección, que no se importa:
    // un cambio en un post también cambia /blog/.
    const files = contentFiles(full);
    if (url === '/blog/') files.push(blogDir);
    const lastmod = gitLastmod(files);
    if (lastmod) pageLastmod.set(url, lastmod);
}

// https://astro.build/config
export default defineConfig({
    site: 'https://insytech.mx',
    output: 'static',
    // Una sola URL canónica por página: /software (sin barra) redirige 308 a /software/.
    // Antes ambas devolvían 200 y GSC las indexaba por separado, partiendo las señales.
    trailingSlash: 'always',
    adapter: vercel(),
    vite: {
        plugins: [tailwindcss()],
        // Estas dependencias las montan islas que Vite solo descubre al navegar
        // (Silk, MagicBento, la escena de /vision). Al descubrirlas re-optimiza y
        // cambia el hash de `?v=`, y las peticiones en vuelo responden
        // "504 Outdated Optimize Dep". Declarándolas se pre-empaquetan al
        // arrancar. Solo afecta a dev: el build ya empaqueta todo por adelantado.
        optimizeDeps: {
            include: [
                '@react-three/fiber',
                'three',
                'gsap',
                'gsap/ScrollTrigger',
                'framer-motion',
            ],
        },
    },
    integrations: [
        react(),
        sitemap({
            // Los posts toman la fecha de su frontmatter y el resto de las
            // páginas la del último commit de su contenido (ver pageLastmod).
            // Nunca la fecha del build, que engañaría a los crawlers haciéndoles
            // creer que todo cambió en cada deploy.
            serialize(item) {
                const match = item.url.match(/\/blog\/([^/]+)\/$/);
                const slug = match?.[1];
                const lastmod = slug
                    ? blogLastmod.get(slug)
                    : pageLastmod.get(new URL(item.url).pathname);
                return lastmod ? { ...item, lastmod } : item;
            },
        }),
    ],
    // ponytail: las redirecciones heredadas viven en public/*/index.html, no aquí.
    // Con trailingSlash 'always' el adaptador de Vercel emite la regla 308 de barra final
    // ANTES que los 301 de `redirects`, así que '/automatizacion' se convertía en
    // '/automatizacion/' y ya no coincidía con ningún 301 -> 404. El handle de filesystem
    // corre después de ambas reglas, por eso las páginas estáticas sí funcionan.
});