// @ts-check
import { defineConfig } from "astro/config";
import tailwindcss from "@tailwindcss/vite";
import vercel from '@astrojs/vercel';
import react from '@astrojs/react';
import sitemap from '@astrojs/sitemap';
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
            // Solo las URLs de posts del blog llevan lastmod: son las únicas con
            // una fecha real en frontmatter. El resto de las rutas se queda sin
            // lastmod en vez de reportar la fecha del build, que engañaría a los
            // crawlers haciéndoles creer que cambiaron cuando no fue así.
            serialize(item) {
                const match = item.url.match(/\/blog\/([^/]+)\/$/);
                const slug = match?.[1];
                const lastmod = slug ? blogLastmod.get(slug) : undefined;
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