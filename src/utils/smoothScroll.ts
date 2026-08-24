import Lenis from "lenis";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

/**
 * Smooth scroll driven by Lenis, with GSAP as the single clock.
 *
 * The whole point of routing Lenis through `gsap.ticker` instead of its own rAF
 * loop is that ScrollTrigger and the Three.js hero already run on GSAP's ticker.
 * Two independent loops would tear: the scene would sample a scroll position one
 * frame behind the one the page is painted at.
 */

const LERP = 0.1;

// Guard so a second call is a no-op. Astro re-runs bundled scripts on
// client-side navigation, and a second Lenis instance would fight the first for
// wheel events.
let lenis: Lenis | null = null;

export function initSmoothScroll(): Lenis | null {
    if (lenis) return lenis;
    if (typeof window === "undefined") return null;

    // Reduced motion keeps native scrolling. Lenis interpolates every wheel
    // event into an eased tween, which is exactly the sustained movement the
    // preference asks us not to produce — there is no "less smooth" setting that
    // honours it, so the answer is not to run it at all.
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
        return null;
    }

    gsap.registerPlugin(ScrollTrigger);

    lenis = new Lenis({
        lerp: LERP,
        smoothWheel: true,
        // Lenis resolves same-page hash links itself. Without this, every
        // `href="#contact"` on the page jumps natively while Lenis still thinks
        // it owns the scroll position, and the two disagree until the next wheel
        // event.
        anchors: true,
    });

    lenis.on("scroll", ScrollTrigger.update);

    gsap.ticker.add((time) => {
        // GSAP ticker time is seconds, Lenis expects milliseconds.
        lenis?.raf(time * 1000);
    });

    // Without this, GSAP tries to compensate for dropped frames and hands Lenis
    // a large delta after any stall, which lands as a visible jump.
    gsap.ticker.lagSmoothing(0);

    return lenis;
}

export function getLenis(): Lenis | null {
    return lenis;
}
