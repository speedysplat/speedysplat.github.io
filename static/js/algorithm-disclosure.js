/* ---- AccuTile algorithm disclosure ----
 *
 * The full algorithm remains ordinary HTML in its original section, which is a
 * readable fallback when JavaScript is unavailable. With JavaScript, that content
 * is moved beneath the Method section's AccuTile paragraph and progressively
 * enhanced into an accessible, animated disclosure.
 *
 * CSS grid animates the intrinsic content height. No pixel height is measured or
 * cached, so MathJax reflow, repeated toggles, viewport resizes, and orientation
 * changes cannot leave the panel clipped at a stale size. During collapse, scroll
 * compensation follows the toggle upward so the reader is not stranded in the
 * section that originally sat below the expanded algorithm.
 */
(function () {
    "use strict";

    var STORAGE_KEY = "accutile-algorithm-expanded";
    var HASHES = ["#accutile", "#accutile-details"];

    function readRememberedState() {
        try {
            return sessionStorage.getItem(STORAGE_KEY) === "true";
        } catch (e) {
            return false;
        }
    }

    function rememberState(open) {
        try {
            sessionStorage.setItem(STORAGE_KEY, open ? "true" : "false");
        } catch (e) {
            // Storage can be unavailable in private browsing; the control still works.
        }
    }

    function init() {
        var source = document.getElementById("accutile");
        var mount = document.getElementById("accutile-disclosure-mount");
        var content = source && source.querySelector(".content");
        if (!source || !mount || !content) return;

        var shell = document.createElement("div");
        shell.id = "accutile";
        shell.className = "algorithm-disclosure-shell";

        var panel = document.createElement("div");
        panel.id = "accutile-details";
        panel.className = "algorithm-disclosure";
        panel.setAttribute("role", "region");
        panel.setAttribute("aria-labelledby", "accutile-toggle");

        var inner = document.createElement("div");
        inner.className = "algorithm-disclosure-inner";
        content.classList.add("algorithm-disclosure-content");
        inner.appendChild(content);
        panel.appendChild(inner);

        var button = document.createElement("button");
        button.id = "accutile-toggle";
        button.className = "algorithm-disclosure-toggle";
        button.type = "button";
        button.setAttribute("aria-controls", panel.id);
        button.innerHTML =
            '<span>AccuTile Algorithm</span>' +
            '<svg class="algorithm-disclosure-chevron" viewBox="0 0 20 20" width="16" height="16" aria-hidden="true" focusable="false">' +
            '<path d="M5 7.5 10 12.5 15 7.5" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" />' +
            '</svg>';

        shell.appendChild(panel);
        shell.appendChild(button);

        // Preserve the old section until the replacement is fully assembled.
        source.remove();
        mount.replaceWith(shell);

        var focusable = Array.prototype.slice.call(panel.querySelectorAll(
            'a[href], button, input, select, textarea, [tabindex]'
        ));
        var originalTabindex = new Map();
        focusable.forEach(function (element) {
            originalTabindex.set(element, element.getAttribute("tabindex"));
        });

        var scrollFollowFrame = null;
        var scrollCancelEvents = ["wheel", "touchstart", "pointerdown", "keydown"];
        var previousInlineScrollBehavior = null;

        function cancelScrollFollow() {
            if (scrollFollowFrame !== null) {
                cancelAnimationFrame(scrollFollowFrame);
                scrollFollowFrame = null;
            }
            scrollCancelEvents.forEach(function (type) {
                window.removeEventListener(type, cancelScrollFollow, true);
            });
            if (previousInlineScrollBehavior !== null) {
                document.documentElement.style.scrollBehavior = previousInlineScrollBehavior;
                previousInlineScrollBehavior = null;
            }
        }

        function cssTimeToMilliseconds(value) {
            value = value.trim();
            if (value.endsWith("ms")) return parseFloat(value) || 0;
            if (value.endsWith("s")) return (parseFloat(value) || 0) * 1000;
            return 0;
        }

        function transitionMilliseconds(element) {
            var style = getComputedStyle(element);
            var durations = style.transitionDuration.split(",").map(cssTimeToMilliseconds);
            var delays = style.transitionDelay.split(",").map(cssTimeToMilliseconds);
            var count = Math.max(durations.length, delays.length);
            var longest = 0;
            for (var i = 0; i < count; i++) {
                longest = Math.max(
                    longest,
                    durations[i % durations.length] + delays[i % delays.length]
                );
            }
            return longest;
        }

        function followButtonDuringCollapse(anchorTop) {
            cancelScrollFollow();
            // The page normally smooth-scrolls anchor jumps. Per-frame compensation
            // must be immediate or those small corrections queue up and play only
            // after the panel transition, creating a separate second phase.
            previousInlineScrollBehavior = document.documentElement.style.scrollBehavior;
            document.documentElement.style.scrollBehavior = "auto";
            scrollCancelEvents.forEach(function (type) {
                window.addEventListener(type, cancelScrollFollow, { capture: true, passive: true });
            });

            var endTime = performance.now() + transitionMilliseconds(panel) + 50;

            function follow(now) {
                if (button.getAttribute("aria-expanded") === "true") {
                    cancelScrollFollow();
                    return;
                }

                var delta = button.getBoundingClientRect().top - anchorTop;
                if (Math.abs(delta) > 0.25) window.scrollBy(0, delta);

                if (now < endTime) {
                    scrollFollowFrame = requestAnimationFrame(follow);
                } else {
                    cancelScrollFollow();
                }
            }

            scrollFollowFrame = requestAnimationFrame(follow);
        }

        function syncFocusable(open) {
            panel.toggleAttribute("inert", !open);
            // Fallback for browsers without inert support.
            focusable.forEach(function (element) {
                if (!open) {
                    element.setAttribute("tabindex", "-1");
                    return;
                }
                var original = originalTabindex.get(element);
                if (original === null) element.removeAttribute("tabindex");
                else element.setAttribute("tabindex", original);
            });
        }

        function setOpen(open, remember) {
            shell.classList.toggle("is-open", open);
            button.setAttribute("aria-expanded", open ? "true" : "false");
            button.setAttribute(
                "aria-label",
                open ? "Hide AccuTile algorithm" : "Show AccuTile algorithm"
            );
            panel.setAttribute("aria-hidden", open ? "false" : "true");
            syncFocusable(open);
            if (remember) rememberState(open);
        }

        function hashRequestsOpen() {
            return HASHES.indexOf(window.location.hash) !== -1;
        }

        button.addEventListener("click", function () {
            var willOpen = button.getAttribute("aria-expanded") !== "true";
            var anchorTop = button.getBoundingClientRect().top;
            cancelScrollFollow();
            setOpen(willOpen, true);
            if (!willOpen) followButtonDuringCollapse(anchorTop);
            if (!willOpen && hashRequestsOpen() && window.history && history.replaceState) {
                history.replaceState(null, "", window.location.pathname + window.location.search);
            }
        });

        window.addEventListener("hashchange", function () {
            if (hashRequestsOpen()) {
                cancelScrollFollow();
                setOpen(true, true);
            }
        });

        var openedFromHash = hashRequestsOpen();
        setOpen(openedFromHash || readRememberedState(), false);

        // Suppress an animation during initial page setup; subsequent changes roll.
        requestAnimationFrame(function () {
            shell.classList.add("is-ready");
            if (openedFromHash) shell.scrollIntoView({ block: "start" });
        });
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", init);
    } else {
        init();
    }
})();
