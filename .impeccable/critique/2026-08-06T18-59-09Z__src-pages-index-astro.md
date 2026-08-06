---
target: home / landing page
total_score: 21
max_score: 40
na_heuristics: 
p0_count: 2
p1_count: 3
timestamp: 2026-08-06T18-59-09Z
slug: src-pages-index-astro
---
# Critique — home (src/pages/index.astro) · modo Persuade

Method: dual-agent (A: design review · B: detector). Sin browser automation en la sesión: sin overlay visual.

## Design Health Score: 21/40 (Aceptable)

| # | Heurística | Score | Problema clave |
|---|---|---|---|
| 1 | Visibilidad del estado | 3 | `#contact-status` (FormBase.astro:124) sin aria-live |
| 2 | Mundo real | 2 | Jargon de terminal en inglés; "Soluciones" apunta a #about-us inexistente |
| 3 | Control y libertad | 3 | Panel WhatsApp oculta su lanzador; sin cierre tocando fuera |
| 4 | Consistencia | 2 | 4 lenguajes visuales; radios sin escala; dos tokens primary en conflicto |
| 5 | Prevención de errores | 2 | Markup exige 3 campos, JS exige "nombre O email" (FormBase.astro:172) |
| 6 | Reconocer vs recordar | 2 | Tres taxonomías para los mismos 5 servicios |
| 7 | Flexibilidad | 2 | Sin CTA fijo en móvil; WhatsApp pelea con banner de cookies |
| 8 | Estético y minimalista | 1 | Shader + 4 escenas 3D + GSAP + PLC + scanlines simultáneos; 3 titulares 7xl seguidos |
| 9 | Recuperación de errores | 1 | Un string genérico, sin anunciar, sin ruta alterna |
| 10 | Ayuda y documentación | 3 | Bloque de tranquilidad del formulario bien resuelto |

Carga cognitiva: ALTA (6/8 fallos). Decisiones con >4 opciones: dropdown Soluciones (5), footer Soluciones (5).

## Veredicto de especificidad

Partido en la dirección equivocada. El cuerpo (rack PLC en Services.astro:297-390, cuatro escenas Three.js en Features.astro:337-402) es genuinamente inclonable: la animación ES el proceso vendido. El hero — lo único que ve el 100% — es plantilla: cuadrados desenfocados, titular con degradado, shader WebGL, y paneles que dicen CRM_SYNC/MKT_FLOW/LEAD_AI/BI_INSIGHT (DashboardShowcase.tsx:253-257), vocabulario de marketing automation, no de automatización industrial. El trabajo diferenciado está a 2.000px y apagado en móvil.

Detector: 9 hallazgos. gradient-text x7 (Hero:72, Services:49, Features:59 y :120, Process:48, ContactSection:30, Navbar:72), codex-grid-background x1 (Services:28), flat-type-hierarchy x1 (Layout:142, ratio 1.6:1).
gradient-text NO es falso positivo por volumen: es el único tratamiento de titular del sitio, por eso ningún encabezado gana sobre otro.
codex-grid-background SÍ es falso positivo: rejilla técnica en sitio de automatización es lenguaje de dominio.

## Lo que funciona
1. La simulación del rack PLC es un foso: correcta lo bastante para ser reconocida por un ingeniero de control.
2. Las escenas sectoriales ilustran el proceso, no decoran.
3. El bloque de tranquilidad del formulario (FormBase.astro:119-141) responde las 4 preguntas reales de un lead dudoso.

## Issues prioritarios

[P0] Cada número está inventado y la audiencia son ingenieros. Features.astro:125-145 (99.9%, 24/7, <1ms, ZERO), Services.astro:247 (Math.random() en el gráfico), Services.astro:172-176 (latency 0.2ms, throughput 1.2Gb/s). Fix: atribuir a despliegue y periodo con nombre, borrar el resto, etiquetar simulaciones. -> /impeccable clarify

[P0] Navbar.astro:26 apunta "Soluciones" a #about-us; AboutUs está comentado en index.astro:18. El ítem más clicado no hace nada. -> /impeccable clarify

[P1] Features en móvil: 3D cortado bajo 1024px (Features.astro:247) y bajo reduced-motion (:248) pero min-h-[600px] intacto (:73) = 2600px de cajas vacías. Reduced-motion elimina contenido, no solo movimiento. -> /impeccable adapt

[P1] Tarjeta 4 con dos destinos: título a /vision/ (Services.astro:496), botón "Launch AI Core" a /ai/ (:541). -> /impeccable clarify

[P1] Formulario: sin aria-live en #contact-status; originalText capturado con textContent (:183) y restaurado con textContent (:232) destruye el icono SVG para siempre; error sin ruta alterna con teléfono y mailto en la misma pantalla. -> /impeccable harden

[P2] CookieConsent.astro trae 3 bloques script, los tres enlazan aceptar/rechazar: evento cookie-consent duplicado. Banner z-[60] tapa lanzador WhatsApp z-[55]. -> /impeccable harden

## Personas
Jordan: termina el hero sin saber para quién es; "Soluciones" no responde; antetítulos solo en inglés técnico; tarjeta 1 sin afordancia de clic; data.ts:4 con doble punto.
Riley: dos contratos de validación contradictorios; icono del botón destruido tras el primer envío; sin JS el form no tiene action ni method (FormBase.astro:6) y recarga como GET perdiendo el lead; a 1023px desaparece el centro del hero.
Casey: 3 elementos de chrome antes del contenido; CTA secundario pesa más que el primario (border-2); 2600px de cajas vacías en Features; panel WhatsApp sin cierre tocando fuera.

## Menores
Ocho azules casi negros sin token (#002B49 el más usado, no oficial). ContactSection.astro:45,77 usa blue-500 genérico. Brands.astro:60 dark:grayscale-50 no es utilidad válida. Footer.astro:73 y 3 de 4 redes a href="#" con sr-only idéntico. Process.astro:8 con id="cta". Imports muertos en Services.astro:2,5 y Process.astro:2,4. Layout.astro:116-133 duplica y contradice global.css:227-238 (45deg vs 40deg).

## Preguntas
1. Si borraras cada número no trazable a una planta con nombre, ¿qué quedaría para persuadir?
2. ¿Por qué el bloque menos específico (hero) se lleva el 100% de las impresiones?
3. ¿Dónde se plantea "qué se me rompe si no hago nada doce meses más"?
4. ¿Todo el presupuesto visual está puesto en el visitante que ya te iba a llamar?
