import { gsap } from "gsap";
import { CustomEase } from "gsap/CustomEase";

/**
 * Single source for motion timing on /vision/.
 *
 * Before this file the delays lived as `data-animate-delay=".1s"` / `".2s"`
 * strings inside each component, so retiming the page meant grepping for
 * fractions of a second across a dozen files.
 */

let registered = false;

export function registerMotion(): void {
    if (registered) return;
    gsap.registerPlugin(CustomEase);

    // Slow start, long settle. Reads as weight rather than speed, which is what
    // separates a reveal that feels engineered from one that feels like a
    // default ease-out.
    CustomEase.create("insytechOut", "M0,0 C0.16,0.84 0.24,1 1,1");
    registered = true;
}

export const MOTION = {
    /** Heading line reveal. */
    HEADING_DURATION: 0.9,
    HEADING_STAGGER: 0.09,
    /** Distance a masked line travels, as a share of its own height. */
    HEADING_Y_PERCENT: 110,

    /** Cards, list items and anything appearing as a group. */
    GROUP_DURATION: 0.7,
    GROUP_STAGGER: 0.08,
    GROUP_Y: 28,

    /** Default parallax travel, in percent of the element's height. */
    PARALLAX_Y_PERCENT: 12,

    EASE: "insytechOut",

    /**
     * Reveals start slightly before the element is fully on screen; waiting for
     * dead centre reads as lag on a long page.
     */
    START: "top 85%",
} as const;

/**
 * GSAP writes transforms inline, so the `prefers-reduced-motion` block in
 * global.css (which only restricts `transition-property`) does not cover any of
 * these animations. Every entry point has to ask.
 */
export function prefersReducedMotion(): boolean {
    if (typeof window === "undefined") return true;
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}
