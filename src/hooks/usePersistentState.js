import { useEffect, useState } from "react";
import { readJSONStorage, readTextStorage, writeJSONStorage, writeTextStorage } from "../lib/storage";

// SSR-safe persistent state hook.
// Always starts with initialValue on the server and first client render
// (so server and client HTML match), then loads from localStorage after mount.
export function usePersistentState(key, initialValue, mode = "json") {
  const [value, setValue] = useState(initialValue);
  const [hydrated, setHydrated] = useState(false);

  // After mount (client only), load the real stored value
  useEffect(() => {
    const stored =
      mode === "text"
        ? readTextStorage(key, initialValue)
        : readJSONStorage(key, initialValue);
    setValue(stored);
    setHydrated(true);
  }, [key]); // eslint-disable-line react-hooks/exhaustive-deps

  // Persist on change, but only after hydration (not during SSR)
  useEffect(() => {
    if (!hydrated) return;
    if (mode === "text") {
      writeTextStorage(key, value);
    } else {
      writeJSONStorage(key, value);
    }
  }, [key, mode, value, hydrated]);

  return [value, setValue];
}