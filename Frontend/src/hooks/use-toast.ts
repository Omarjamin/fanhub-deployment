import { showToast } from "@/utils/toast.js";

type ToastInput = {
  title?: string;
  description?: string;
  variant?: "default" | "destructive";
};

export function toast(input: ToastInput) {
  const message = [input?.title, input?.description].filter(Boolean).join(": ");
  showToast(message || "Notice", input?.variant === "destructive" ? "error" : "info");
}

export function useToast() {
  return { toast, toasts: [] };
}
