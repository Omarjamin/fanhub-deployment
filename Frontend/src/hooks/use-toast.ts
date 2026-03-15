import { showToast } from "@/utils/toast.js";

type ToastInput = {
  title?: string;
  description?: string;
  variant?: "default" | "destructive" | "success";
};

export function toast(input: ToastInput) {
  const message = [input?.title, input?.description].filter(Boolean).join(": ");
  const type =
    input?.variant === "destructive"
      ? "error"
      : input?.variant === "success"
        ? "success"
        : "info";
  showToast(message || "Notice", type);
}

export function useToast() {
  return { toast, toasts: [] };
}
