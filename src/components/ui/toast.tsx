import { createContext, useCallback, useContext, useMemo, useState } from "react";
import { CheckCircle2, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";

type Toast = {
  id: number;
  title: string;
  variant?: "success" | "error";
};

type ToastContextValue = {
  toast: (toast: Omit<Toast, "id">) => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<Toast[]>([]);

  const toast = useCallback((item: Omit<Toast, "id">) => {
    const id = Date.now();
    setItems((current) => [...current, { ...item, id }]);
    window.setTimeout(() => {
      setItems((current) => current.filter((toastItem) => toastItem.id !== id));
    }, 3000);
  }, []);

  const value = useMemo(() => ({ toast }), [toast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="fixed bottom-24 left-4 right-4 z-[80] grid gap-2 md:left-auto md:right-6 md:top-6 md:bottom-auto md:w-96">
        {items.map((item) => {
          const Icon = item.variant === "error" ? XCircle : CheckCircle2;
          return (
            <div
              key={item.id}
              className={cn(
                "flex items-center gap-3 rounded-2xl border bg-card p-4 text-sm shadow-soft",
                item.variant === "error" ? "border-destructive/30" : "border-primary/20"
              )}
            >
              <Icon className={cn("h-5 w-5", item.variant === "error" ? "text-destructive" : "text-primary")} />
              <span>{item.title}</span>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) throw new Error("useToast deve ser usado dentro de ToastProvider.");
  return context;
}
