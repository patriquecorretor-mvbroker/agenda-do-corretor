import { useState } from "react";
import { Map, Navigation } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

type RouteButtonProps = {
  label: string;
  latitude?: number | null;
  longitude?: number | null;
  address?: string;
  className?: string;
  text?: string;
  iconClassName?: string;
};

export function RouteButton({ label, latitude, longitude, address, className, text = "Ir", iconClassName }: RouteButtonProps) {
  const [open, setOpen] = useState(false);
  const destination = latitude != null && longitude != null ? `${latitude},${longitude}` : address?.trim() || "";
  const googleUrl = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(destination)}`;
  const wazeUrl = latitude != null && longitude != null
    ? `https://www.waze.com/ul?ll=${latitude}%2C${longitude}&navigate=yes`
    : `https://www.waze.com/ul?q=${encodeURIComponent(destination)}&navigate=yes`;

  return <>
    <button
      type="button"
      title={`Ir para ${label}`}
      aria-label={`Escolher rota para ${label}`}
      className={cn("inline-flex items-center justify-center gap-2", className)}
      onClick={(event) => { event.stopPropagation(); setOpen(true); }}
    >
      <Navigation className={cn("h-4 w-4", iconClassName)} />{text}
    </button>
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Como deseja chegar?</DialogTitle>
          <DialogDescription className="line-clamp-2">{label}{address ? ` · ${address}` : ""}</DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-3">
          <a href={wazeUrl} target="_blank" rel="noreferrer" onClick={() => setOpen(false)} className="flex min-h-24 flex-col items-center justify-center gap-2 rounded-2xl border bg-card text-sm font-semibold transition hover:border-primary hover:bg-primary/5">
            <Navigation className="h-6 w-6 text-primary" />Waze
          </a>
          <a href={googleUrl} target="_blank" rel="noreferrer" onClick={() => setOpen(false)} className="flex min-h-24 flex-col items-center justify-center gap-2 rounded-2xl border bg-card text-sm font-semibold transition hover:border-primary hover:bg-primary/5">
            <Map className="h-6 w-6 text-primary" />Google Maps
          </a>
        </div>
      </DialogContent>
    </Dialog>
  </>;
}
