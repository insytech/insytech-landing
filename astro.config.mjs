// @ts-check
import { defineConfig } from "astro/config";
import tailwindcss from "@tailwindcss/vite";
import vercel from '@astrojs/vercel';
import react from '@astrojs/react';
import sitemap from '@astrojs/sitemap';

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
    integrations: [react(), sitemap()],
    // ponytail: las redirecciones heredadas viven en public/*/index.html, no aquí.
    // Con trailingSlash 'always' el adaptador de Vercel emite la regla 308 de barra final
    // ANTES que los 301 de `redirects`, así que '/automatizacion' se convertía en
    // '/automatizacion/' y ya no coincidía con ningún 301 -> 404. El handle de filesystem
    // corre después de ambas reglas, por eso las páginas estáticas sí funcionan.
});