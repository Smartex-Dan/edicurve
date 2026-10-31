import { useCallback, useEffect, useRef, useState } from "react";

export type ToastState = {
  id: number;
  message: string;
  type: "success" | "error";
} | null;

export function useToast() {
  const [toast, setToast] = useState<ToastState>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showToast = useCallback(
    (message: string, type: "success" | "error" = "success") => {
      if (timer.current) clearTimeout(timer.current);
      setToast({ id: Date.now(), message, type });
      timer.current = setTimeout(
        () => setToast(null),
        type === "error" ? 4500 : 2500,
      );
    },
    [],
  );

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );

  return { toast, showToast };
}