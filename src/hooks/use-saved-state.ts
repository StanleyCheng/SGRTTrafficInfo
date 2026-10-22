"use client";

import { useEffect, useRef, useState, type RefObject } from "react";
import { isScroll, readPreference, writePreference, type ValueGuard } from "@/lib/preferences";

/** Hydrate after SSR, then save changes. The initial default never overwrites saved data. */
export function useSavedState<T>(key: string, initial: T, valid: ValueGuard<T>) {
  const [value, setValue] = useState(initial);
  const [loaded, setLoaded] = useState(false);
  const initialRef = useRef(initial), guard = useRef(valid);
  useEffect(() => {
    let restored = initialRef.current;
    try { restored = readPreference(localStorage, key, restored, guard.current); } catch { /* browser storage denied */ }
     
    setValue(restored);
    setLoaded(true);
  }, [key]);
  useEffect(() => {
    if (loaded) try { writePreference(localStorage, key, value); } catch { /* browser storage denied */ }
  }, [key, loaded, value]);
  return [value, setValue, loaded] as const;
}

export function useSavedScroll(ref: RefObject<HTMLElement | null>, key: string, enabled: boolean) {
  useEffect(() => {
    const element = ref.current;
    if (!element || !enabled) return;
    let stored = { left: 0, top: 0 };
    try { stored = readPreference(localStorage, key, stored, isScroll); } catch { /* unavailable */ }
    element.scrollLeft = stored.left; element.scrollTop = stored.top;
    const save = () => { try { writePreference(localStorage, key, { left: element.scrollLeft, top: element.scrollTop }); } catch { /* unavailable */ } };
    element.addEventListener("scroll", save, { passive: true });
    window.addEventListener("pagehide", save);
    return () => { window.removeEventListener("pagehide", save); element.removeEventListener("scroll", save); };
  }, [ref, key, enabled]);
}
