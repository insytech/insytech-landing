import { defineCollection, z } from "astro:content";
import { glob } from "astro/loaders";

const blog = defineCollection({
    loader: glob({ pattern: "**/*.md", base: "./src/content/blog" }),
    schema: z.object({
        title: z.string(),
        description: z.string(),
        pubDate: z.coerce.date(),
        author: z.enum(["edgar-olivan", "rene-andrade"]),
        // Señal de frescura: alimenta dateModified del schema y la firma visible.
        updatedDate: z.coerce.date().optional(),
        // Preguntas frecuentes del post: se pintan al final del cuerpo y
        // alimentan el schema FAQPage. Respuestas en texto plano, sin markdown,
        // porque el mismo texto va tal cual al JSON-LD.
        faq: z
            .array(z.object({ question: z.string(), answer: z.string() }))
            .optional(),
        // Blog redesign taxonomy: feeds the listing tabs, the card image and
        // the "Sigue leyendo" link back to that category's service page.
        category: z.enum(["vision", "control", "mes", "software"]),
        image: z.object({
            // Public path under /public, not an import: these images already
            // lived loose under public/images and this schema just reuses them.
            src: z.string(),
            alt: z.string(),
        }),
    }),
});

export const collections = { blog };
