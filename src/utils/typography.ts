/**
 * Escala tipográfica y ritmo vertical de las páginas de servicio.
 *
 * Nació en /vision/ y se movió aquí al necesitarla /software/. Los tres niveles
 * son una escala, no un reparto fijo: cada página decide qué secciones son su
 * argumento y cuáles su apoyo. Copiar la asignación de /vision/ tal cual es
 * justamente el error que la escala existe para evitar.
 *
 * Antes de esto, diez de las once secciones usaban exactamente
 * `text-4xl md:text-5xl` y todas `py-20`: ninguna pesaba más que otra, así que
 * todas gritaban al mismo volumen y ninguna se oía. Los tres niveles de abajo
 * existen para que el visitante sepa, sin leer, qué es argumento y qué es apoyo.
 *
 * Razones entre pasos a lg: 60/36 = 1.67 y 36/24 = 1.5, por encima del 1.25 que
 * pide una jerarquía legible. El h1 del hero se queda en 4.5rem y no entra aquí:
 * es el título de la página, no una sección.
 */

const BASE =
    "font-black font-heading text-[#211915] dark:text-white tracking-tight text-balance";

export const HEADING = {
    /** El argumento de la página: la comparación y la tesis. Dos secciones. */
    display: `text-4xl md:text-5xl lg:text-6xl leading-[1.02] ${BASE}`,
    /** Sustancia: lo que se explica en serio. */
    section: `text-2xl md:text-3xl lg:text-4xl leading-[1.1] ${BASE}`,
    /** Apoyo: proceso, preguntas, lecturas. Cierra, no abre. */
    minor: `text-xl md:text-2xl leading-[1.15] ${BASE}`,
} as const;

/**
 * Ritmo vertical. El aire acompaña al peso del encabezado: una sección de
 * argumento respira, una de apoyo no necesita hacerlo.
 */
export const PAD = {
    display: "py-24 lg:py-32",
    section: "py-16 lg:py-20",
    minor: "py-14 lg:py-16",
} as const;

/**
 * Superficies. Antes alternaban por reflejo en cada sección, lo que convierte el
 * cambio de fondo en ruido: si todo alterna, nada separa. Ahora la página son
 * tres movimientos y el fondo solo cambia entre ellos, de modo que el corte
 * significa algo.
 */
export const SURFACE = {
    base: "bg-white dark:bg-gray-950",
    raised: "bg-gray-50 dark:bg-gray-900",
} as const;
