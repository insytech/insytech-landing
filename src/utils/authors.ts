export interface Author {
    name: string;
    /** Cargo mostrado en la firma y en el schema Person. */
    jobTitle?: string;
    /** Qué hace en Insytech. Cierto por construcción: describe el trabajo que
     *  respalda su firma, sin biografía inventada. */
    role?: string;
    /** Retrato en /public/images/team/. Sin foto la ficha usa el monograma. */
    photo?: string;
    /** Perfil externo que valida a la persona (sameAs del schema). */
    linkedin?: string;
}

// ponytail: registro plano en vez de una colección de Astro; son dos autores,
// no un CMS. Migrar a colección si algún día firman externos con biografía propia.
export const authors = {
    "edgar-olivan": {
        name: "Edgar Olivan",
        jobTitle: "Ingeniero de software",
        photo: "/images/team/edgar-olivan.webp",
        role: "Construye el software que se queda en la planta: las aplicaciones a la medida, las integraciones con el ERP y los modelos de visión e inteligencia artificial que corren sobre la línea.",
        linkedin: "https://www.linkedin.com/in/edoriban/",
    },
    "rene-andrade": {
        name: "René Andrade",
        // El título lidera con la credencial técnica: firma guías de automatización
        // y trazabilidad, donde "responsable comercial" a secas resta autoridad.
        jobTitle: "Ingeniero mecatrónico y responsable comercial",
        photo: "/images/team/rene-andrade.webp",
        role: "Es el primer contacto de cada proyecto y quien lo aterriza en piso: levanta el alcance con el cliente, define el control y la trazabilidad que hacen falta, y sigue la ejecución hasta el arranque.",
        linkedin: "https://www.linkedin.com/in/rene-andrade-ortiz/",
    },
} satisfies Record<string, Author>;

export type AuthorId = keyof typeof authors;

/** Ancla canónica de la persona en /nosotros/. Es el @id que usan el schema
 *  Person del artículo y el de la página de equipo, para que los motores de
 *  respuesta lean una sola entidad y no una por artículo. */
export const authorUrl = (id: AuthorId) => `https://insytech.mx/nosotros/#${id}`;
