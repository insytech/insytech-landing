// @ts-check
import { defineConfig } from "astro/config";
import tailwindcss from "@tailwindcss/vite";
import vercelServerless from '@astrojs/vercel/serverless';
import react from '@astrojs/react';

// https://astro.build/config
export default defineConfig({
    output: 'server',
    adapter: vercelServerless({
        edgeMiddleware: true,
    }),
    vite: {
        plugins: [tailwindcss()],
    },
    integrations: [react()],
});