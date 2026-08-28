import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { SplitText } from "gsap/SplitText";
import { MOTION, registerMotion, prefersReducedMotion } from "./motion";
import { getLenis } from "./smoothScroll";

/**
 * Scroll-driven reveals for /vision/, opt-in through data attributes:
 *
 *   data-reveal="heading"  split into lines and revealed from behind a mask
 *   data-reveal="group"    direct children rise and fade in with a stagger
 *   data-parallax          drifts against the scroll while in view
 *
 * This runs alongside the older `[data-animate]` observer in the layouts rather
 * than replacing it: that one is shared by every page, and swapping it out here
 * would change the whole site from a branch meant to be discardable.
 */

export function initReveals(): void {
    if (typeof window === "undefined") return;
    if (document.documentElement.dataset.revealsReady === "true") return;
    document.documentElement.dataset.revealsReady = "true";

    gsap.registerPlugin(ScrollTrigger);

    // Pinning is desktop-and-motion-only: on a phone it costs more than it
    // gives, and under reduced motion taking over the scroll is the wrong move.
    // Both fall back to the stacked list the markup already renders.
    // Reduced motion: everything is already in its final state in the markup, so
    // doing nothing is the correct outcome, not a degraded one.
    if (prefersReducedMotion()) return;

    registerMotion();
    gsap.registerPlugin(SplitText);

    if (window.matchMedia("(min-width: 1024px)").matches) {
        initCapabilityStepper();
    }

    // SplitText measures line boxes. Splitting before the webfont swaps means
    // measuring Raleway's fallback and baking in line breaks that are wrong once
    // the real face lands.
    const ready = document.fonts?.ready ?? Promise.resolve();
    ready.then(() => {
        revealHeadings();
        revealGroups();
        initParallax();
        ScrollTrigger.refresh();
    });
}

/**
 * Pins the capability block and advances it a step at a time: the index marks
 * the current one, the viewport swaps, and the copy animates in.
 *
 * Desktop only. Pinning takes over the scroll, which on a phone costs more than
 * it gives, and under reduced motion hijacking the scroll is exactly the wrong
 * move — both fall back to the plain stacked list the markup already is.
 */
function initCapabilityStepper(): void {
    const pin = document.querySelector<HTMLElement>("[data-capability-pin]");
    const stepper = document.querySelector<HTMLElement>(
        "[data-capability-stepper]"
    );
    if (!pin || !stepper) return;

    const steps = Array.from(
        stepper.querySelectorAll<HTMLElement>("[data-step]")
    );
    if (steps.length < 2) return;

    const links = Array.from(
        stepper.querySelectorAll<HTMLElement>("[data-index-link]")
    );

    // Un unico timeline vivo para todo el bloque. Con un tween independiente por
    // paso, invertir la direccion del scroll dejaba el orden de kills
    // indeterminado y dos pasos acababan superpuestos: el tween del paso que se
    // abandonaba seguia corriendo y devolvia su opacidad a 1 despues de haberlo
    // ocultado. Con uno solo, cada transicion parte de un estado conocido.
    const OUT_DURATION = 0.18;

    let current = -1;
    let tl: gsap.core.Timeline | null = null;

    const allParts = steps.flatMap((step) =>
        Array.from(
            step.querySelectorAll<HTMLElement>(
                ".capability-media, .capability-copy"
            )
        )
    );

    const partsOf = (step: HTMLElement) =>
        Array.from(
            step.querySelectorAll<HTMLElement>(
                ".capability-media, .capability-copy"
            )
        );

    const show = (i: number, animate: boolean) => {
        if (i === current) return;
        current = i;

        steps.forEach((step, n) => {
            step.dataset.active = String(n === i);
        });
        links.forEach((link, n) => {
            link.dataset.active = String(n === i);
        });

        // Secuencia, no cross-fade. Los pasos se superponen en la misma celda de
        // la reja, asi que solaparlos durante la transicion es exactamente el
        // texto encimado que hay que evitar: primero sale el anterior, rapido, y
        // despues entra el siguiente. Deja un hueco de ~0.18s en blanco, que es
        // el precio de no encimar nunca.
        tl?.kill();
        gsap.killTweensOf(allParts);

        const parts = partsOf(steps[i]);
        const others = allParts.filter((el) => !parts.includes(el));

        if (!animate) {
            gsap.set(others, { autoAlpha: 0 });
            gsap.set(parts, { autoAlpha: 1, y: 0 });
            return;
        }

        tl = gsap
            .timeline()
            .to(others, { autoAlpha: 0, duration: OUT_DURATION, ease: "none" })
            .fromTo(
                parts,
                { autoAlpha: 0, y: 24 },
                {
                    autoAlpha: 1,
                    y: 0,
                    duration: MOTION.GROUP_DURATION,
                    stagger: 0.08,
                    ease: MOTION.EASE,
                }
            );
    };

    pin.dataset.enabled = "true";

    show(0, false);

    const st = ScrollTrigger.create({
        trigger: pin,
        // Se fija al centro. Antes anclaba en "top top" porque el contenedor
        // media una ventana completa y centraba su contenido por CSS; ese
        // `min-height: 100vh` repartia casi 600 px de aire alrededor de un
        // bloque de 480 px, y se veia como un hueco enorme antes del titular.
        // Quitado el 100vh, el bloque mide lo suyo y es el pin el que lo deja
        // centrado en la ventana al engancharse.
        start: "center center",
        // One viewport of scroll per step. Less feels like the content is being
        // yanked past; more and the visitor wonders whether the page is stuck.
        end: () => "+=" + window.innerHeight * steps.length,
        pin: true,
        pinSpacing: true,
        invalidateOnRefresh: true,
        onUpdate: (self) => {
            const i = Math.min(
                steps.length - 1,
                Math.floor(self.progress * steps.length)
            );
            show(i, true);
        },
    });

    // Al hacer clic hay que MOVER el scroll, no solo conmutar lo visible. Antes
    // se llamaba a show() directo: el paso cambiaba, pero el ScrollTrigger seguia
    // en la posicion del paso anterior, asi que al primer movimiento recalculaba
    // el indice desde ahi y la seccion "regresaba" al 01.
    links.forEach((link, i) => {
        link.addEventListener("click", () => {
            const mid = st.start + ((i + 0.5) / steps.length) * (st.end - st.start);
            const lenis = getLenis();
            if (lenis) lenis.scrollTo(mid);
            else window.scrollTo({ top: mid, behavior: "smooth" });
        });
    });
}

function revealHeadings(): void {
    document
        .querySelectorAll<HTMLElement>('[data-reveal="heading"]')
        .forEach((el) => {
            // `mask: "lines"` makes GSAP wrap each line in its own
            // overflow-hidden element, so the lines slide out from behind their
            // own box instead of needing hand-written wrappers.
            const split = SplitText.create(el, {
                type: "lines",
                mask: "lines",
                linesClass: "reveal-line",
            });

            gsap.from(split.lines, {
                yPercent: MOTION.HEADING_Y_PERCENT,
                duration: MOTION.HEADING_DURATION,
                stagger: MOTION.HEADING_STAGGER,
                ease: MOTION.EASE,
                scrollTrigger: { trigger: el, start: MOTION.START },
            });
        });
}

function revealGroups(): void {
    document
        .querySelectorAll<HTMLElement>('[data-reveal="group"]')
        .forEach((el) => {
            const items = Array.from(el.children) as HTMLElement[];
            if (!items.length) return;

            gsap.set(items, { y: MOTION.GROUP_Y, autoAlpha: 0 });

            // One trigger per item, not one on the container. A row of cards is
            // short enough that a container trigger works, but the capability
            // list is thousands of pixels tall — there, a single trigger would
            // finish animating the last three long before they are on screen.
            // batch() keeps the stagger for whatever enters together.
            ScrollTrigger.batch(items, {
                start: MOTION.START,
                once: true,
                onEnter: (batch) =>
                    gsap.to(batch, {
                        y: 0,
                        autoAlpha: 1,
                        duration: MOTION.GROUP_DURATION,
                        stagger: MOTION.GROUP_STAGGER,
                        ease: MOTION.EASE,
                        overwrite: true,
                    }),
            });
        });
}

function initParallax(): void {
    document
        .querySelectorAll<HTMLElement>("[data-parallax]")
        .forEach((el) => {
            const amount = Number(el.dataset.parallax) || MOTION.PARALLAX_Y_PERCENT;
            const direction = el.dataset.parallaxDirection === "down" ? 1 : -1;

            gsap.fromTo(
                el,
                { yPercent: -amount * direction * 0.5 },
                {
                    yPercent: amount * direction * 0.5,
                    ease: "none",
                    scrollTrigger: {
                        trigger: el,
                        start: "top bottom",
                        end: "bottom top",
                        // Lenis already smooths the input; a scrub number here
                        // would smooth an already-smoothed value and lag behind
                        // the page.
                        scrub: true,
                        invalidateOnRefresh: true,
                    },
                }
            );
        });
}
