import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { SplitText } from "gsap/SplitText";
import { MOTION, registerMotion, prefersReducedMotion } from "./motion";

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

    // The sticky index runs before the reduced-motion gate on purpose:
    // highlighting where you are is orientation, not decoration, and without it
    // the pinned column is a list that never responds.
    initCapabilityIndex();

    // Reduced motion: everything is already in its final state in the markup, so
    // doing nothing is the correct outcome, not a degraded one.
    if (prefersReducedMotion()) return;

    registerMotion();
    gsap.registerPlugin(SplitText);

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
 * Marks the sticky capability index against whichever article is currently in
 * the reading band. One trigger per article rather than a scroll listener, so it
 * shares ScrollTrigger's single measured pass instead of adding a second one.
 */
function initCapabilityIndex(): void {
    const articles = document.querySelectorAll<HTMLElement>("[data-capability]");
    if (!articles.length) return;

    const setActive = (id: string | null) => {
        document
            .querySelectorAll<HTMLElement>("[data-index-link]")
            .forEach((link) => {
                link.dataset.active = String(link.dataset.indexLink === id);
            });
        // The pinned viewport holds all six frames stacked; only the current one
        // is opaque, so scrolling the text reads as the viewport changing rather
        // than as six separate figures going by.
        document
            .querySelectorAll<HTMLElement>("[data-frame]")
            .forEach((frame) => {
                frame.dataset.active = String(frame.dataset.frame === id);
            });
    };

    articles.forEach((article) => {
        const id = article.dataset.capability!;
        ScrollTrigger.create({
            trigger: article,
            // Band across the upper half: an article counts as "current" from
            // the moment its top reaches the header down to when it leaves.
            start: "top 40%",
            end: "bottom 40%",
            onToggle: (self) => {
                if (self.isActive) setActive(id);
            },
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
