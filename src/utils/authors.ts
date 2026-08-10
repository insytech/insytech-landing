export interface Author {
    name: string;
    /** Cargo mostrado en la firma y en el schema Person. */
    jobTitle?: string;
    /** Perfil externo que valida a la persona (sameAs del schema). */
    linkedin?: string;
}

// ponytail: registro plano en vez de una colección de Astro; son dos autores,
// no un CMS. Migrar a colección si algún día firman externos con biografía propia.
export const authors = {
    "edgar-olivan": {
        name: "Edgar Olivan",
        jobTitle: "Ingeniero de software",
        linkedin: "https://www.linkedin.com/in/edoriban/",
    },
    "rene-andrade": {
        name: "René Andrade",
        // El título lidera con la credencial técnica: firma guías de automatización
        // y trazabilidad, donde "responsable comercial" a secas resta autoridad.
        jobTitle: "Ingeniero mecatrónico y responsable comercial",
        linkedin: "https://www.linkedin.com/in/rene-andrade-ortiz/",
    },
} satisfies Record<string, Author>;

export type AuthorId = keyof typeof authors;
