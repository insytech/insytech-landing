// @ts-check
import { defineConfig } from "astro/config";
import tailwindcss from "@tailwindcss/vite";
import vercelServerless from '@astrojs/vercel/serverless';
// https://astro.build/config
export default defineConfig({
    output: 'server',
    adapter: vercelServerless({
        edgeMiddleware: true,
    }),
    vite: {
        plugins: [tailwindcss()],
    },
});