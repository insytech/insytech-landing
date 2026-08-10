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
    }),
});

export const collections = { blog };
