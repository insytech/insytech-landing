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
    adapter: vercel(),
    vite: {
        plugins: [tailwindcss()],
    },
    integrations: [react(), sitemap()],
});