"use client";

import {
  useEffect,
  useRef,
  type FocusEvent,
  type FormEventHandler,
  type KeyboardEvent,
  type ReactNode,
  type RefObject,
} from "react";

/**
 * Shared pieces for the bottom-sheet forms (guestbook, time capsule), tuned for phone keyboards.
 *
 * When the keyboard opens, SheetForm docks its drawer right on top of it and shrinks it to the space
 * left, letting the fields scroll while the submit button stays pinned right above the keyboard.
 * Drawers holding a SheetForm set `repositionInputs={false}` so vaul doesn't move them as well.
 */

export const drawerClass = "mx-auto w-full max-w-[430px] bg-paper font-myeongjo tracking-[-0.04em] text-ink";
/** 16px text: iOS zooms the page into any focused field with smaller text. */
export const fieldClass = "h-11 rounded-[12px] border-line-strong bg-white/60 text-[16px] shadow-none md:text-[16px]";
export const textareaClass =
  "max-h-56 min-h-32 rounded-[12px] border-line-strong bg-white/60 text-[16px] leading-[24px] shadow-none md:text-[16px]";

/** Password fields: no "strong password" / save-password prompts from iOS or password managers. */
export const passwordProps = { type: "password", autoComplete: "off", "data-1p-ignore": true, "data-lpignore": "true" } as const;

/** Gap kept between a focused field and the edges of the scrolling area (e.g. the pinned submit button). */
const REVEAL_MARGIN = 12;

/** Scrolls only the sheet's own field area (never the page behind) so `field` is fully visible. */
function reveal(area: HTMLElement, field: HTMLElement) {
  const a = area.getBoundingClientRect();
  const f = field.getBoundingClientRect();
  const below = f.bottom - (a.bottom - REVEAL_MARGIN);
  const above = a.top + REVEAL_MARGIN - f.top;
  // a field taller than the area lines up with its top, where typing starts
  if (below > 0) area.scrollBy({ top: Math.min(below, -above), behavior: "smooth" });
  else if (above > 0) area.scrollBy({ top: -above, behavior: "smooth" });
}

/** Space left above a keyboard-squeezed sheet, so it still reads as a sheet over the page. */
const TOP_GAP = 24;

/**
 * Keeps the sheet sitting right on the keyboard.
 *
 * Phones keep the layout viewport (what the sheet's `bottom: 0` is measured from) at full height while
 * the keyboard is up and only shrink the visual viewport, which they also scroll to bring the focused
 * field into view. vaul's own `repositionInputs` lifts the sheet by the keyboard height but ignores
 * that scroll, so the two add up and the sheet shoots off the top of the screen. Measuring from where
 * the visual viewport actually is covers both.
 */
function useKeyboardDock(area: RefObject<HTMLDivElement | null>) {
  useEffect(() => {
    const viewport = window.visualViewport;
    const sheet = area.current?.closest<HTMLElement>("[data-vaul-drawer]");
    if (!viewport || !sheet) return;

    let frame = 0;
    let lastHeight = viewport.height;
    const dock = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const { height, offsetTop } = viewport;
        // from the bottom of the layout viewport up to the top of the keyboard (0 when it's closed)
        sheet.style.bottom = `${Math.max(0, window.innerHeight - height - offsetTop)}px`;
        // 80vh is the drawer's own cap
        sheet.style.maxHeight = `min(80vh, ${height - TOP_GAP}px)`;
        // the keyboard opened, closed or changed height: keep the field being typed in visible
        if (height !== lastHeight) {
          lastHeight = height;
          const field = document.activeElement;
          if (area.current && field instanceof HTMLElement && area.current.contains(field)) reveal(area.current, field);
        }
      });
    };

    dock();
    viewport.addEventListener("resize", dock);
    viewport.addEventListener("scroll", dock);
    return () => {
      cancelAnimationFrame(frame);
      viewport.removeEventListener("resize", dock);
      viewport.removeEventListener("scroll", dock);
      sheet.style.removeProperty("bottom");
      sheet.style.removeProperty("max-height");
    };
  }, [area]);
}

export function SheetForm({ onSubmit, submit, children }: { onSubmit: FormEventHandler<HTMLFormElement>; submit: ReactNode; children: ReactNode }) {
  const area = useRef<HTMLDivElement>(null);
  useKeyboardDock(area);

  // Moving to another field with the keyboard already up doesn't resize the viewport, so check
  // once the browser has finished bringing the new field into view.
  const onFocus = (e: FocusEvent<HTMLDivElement>) => {
    const field = e.target;
    if (!(field instanceof HTMLInputElement || field instanceof HTMLTextAreaElement)) return;
    setTimeout(() => area.current && document.activeElement === field && reveal(area.current, field), 350);
  };

  return (
    <form onSubmit={onSubmit} className="flex min-h-0 flex-1 flex-col">
      {/* data-vaul-no-drag: a swipe while typing scrolls the fields instead of closing the sheet (and losing the text) */}
      <div
        ref={area}
        data-vaul-no-drag
        onFocus={onFocus}
        className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto overscroll-contain px-4 pt-1 pb-4"
      >
        {children}
      </div>
      <div className="shrink-0 border-t border-line px-4 pt-3 pb-[max(1rem,env(safe-area-inset-bottom))]">{submit}</div>
    </form>
  );
}

/**
 * The keyboard's Enter/"next" key moves to the named field instead of submitting a half-filled form.
 * Ignored while a Korean syllable is still being composed.
 */
export function focusOnEnter(next: string) {
  return (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key !== "Enter" || e.nativeEvent.isComposing || e.nativeEvent.keyCode === 229) return;
    e.preventDefault();
    const target = e.currentTarget.form?.elements.namedItem(next);
    if (target instanceof HTMLElement) target.focus();
  };
}

/** Drop the keyboard before a sheet closes, so the page doesn't jump while both animate. */
export function dismissKeyboard() {
  if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
}
