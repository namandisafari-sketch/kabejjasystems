import { useState, useEffect, useCallback, useRef } from "react";

export function usePersistentState<T>(key: string, initial: T): [T, (val: T | ((prev: T) => T)) => void] {
  const [state, setState] = useState<T>(() => {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : initial;
    } catch {
      return initial;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify(state));
    } catch {}
  }, [key, state]);

  return [state, setState];
}

export function clearPersistentState(key: string) {
  localStorage.removeItem(key);
}

export function normalizePhone(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.length === 9 && digits.startsWith("7")) return "+256" + digits;
  if (digits.length === 10 && digits.startsWith("07")) return "+256" + digits.slice(1);
  if (digits.length === 12 && digits.startsWith("256")) return "+" + digits;
  if (digits.length === 13 && digits.startsWith("+256")) return "+" + digits.slice(1);
  return phone;
}

export function usePrevious<T>(value: T): T | undefined {
  const ref = useRef<T>();
  useEffect(() => { ref.current = value; });
  return ref.current;
}
