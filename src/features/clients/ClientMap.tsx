import { useEffect, useRef, useState } from "react";
import { Check, Expand, LocateFixed, Loader2, MapPin, Minus, Plus, RotateCcw, X } from "lucide-react";
import { loadMapLibrary, type ClientLeafletMap, type MapCluster, type MapLibrary } from "./map-library";
import { cn } from "@/lib/utils";
import "./client-map.css";

export type GeographicClient = {
  id: string; name: string; city: string; photo?: string;
  lat: number; lng: number; bought: boolean; visited: boolean; scheduled: boolean;
};

export function ClientMap({ clients, onSelect, emptyMessage, focusClientId }: {
  clients: GeographicClient[];
  onSelect: (id: string) => void;
  emptyMessage: string;
  focusClientId?: string | null;
}) {
  const element = useRef<HTMLDivElement>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  const host = useRef<HTMLDivElement>(null);
  const frame = useRef<HTMLDivElement>(null);
  const map = useRef<ClientLeafletMap>();
  const library = useRef<MapLibrary>();
  const clusters = useRef<MapCluster>();
  const previousBounds = useRef("");
  const currentClients = useRef(clients);
  currentClients.current = clients;
  const select = useRef(onSelect);
  select.current = onSelect;
  const [ready, setReady] = useState(false);
  const [error, setError] = useState(false);
  const [tileError, setTileError] = useState(false);
  const [retry, setRetry] = useState(0);
  const [locating, setLocating] = useState(false);
  const [locationMessage, setLocationMessage] = useState("");
  const [expanded, setExpanded] = useState(false);
  const locationLayers = useRef<Array<{ remove(): unknown }>>([]);

  function fitClients() {
    const points = currentClients.current.map((client): [number, number] => [client.lat, client.lng]);
    if (points.length) map.current?.fitBounds(points, { padding: [60, 60], maxZoom: 14, animate: false });
  }

  useEffect(() => {
    let disposed = false;
    let observer: ResizeObserver | undefined;
    setReady(false); setError(false); setTileError(false);
    loadMapLibrary().then((L) => {
      if (disposed || !element.current) return;
      library.current = L;
      const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      const instance = L.map(element.current, { zoomControl: false, minZoom: 3, maxZoom: 19, touchZoom: true, dragging: true, scrollWheelZoom: true, keyboard: true, zoomAnimation: !reducedMotion, fadeAnimation: !reducedMotion, markerZoomAnimation: !reducedMotion });
      map.current = instance;
      instance.setView([-14.2, -51.9], 4);
      const tiles = L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19, attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap</a>'
      }).addTo(instance);
      let failures = 0;
      tiles.on("tileerror", () => { if (++failures >= 2 && !disposed) setTileError(true); });
      tiles.on("tileload", () => { failures = 0; if (!disposed) setTileError(false); });
      clusters.current = L.markerClusterGroup({ maxClusterRadius: 58, showCoverageOnHover: false, spiderfyOnMaxZoom: true, zoomToBoundsOnClick: true, animate: !reducedMotion }).addTo(instance);
      observer = new ResizeObserver(() => instance.invalidateSize({ pan: false }));
      observer.observe(element.current);
      previousBounds.current = "";
      setReady(true);
    }).catch(() => { if (!disposed) setError(true); });
    return () => {
      disposed = true;
      observer?.disconnect();
      map.current?.remove();
      map.current = undefined;
      clusters.current = undefined;
      locationLayers.current = [];
    };
  }, [retry]);

  useEffect(() => {
    const L = library.current;
    const group = clusters.current;
    if (!ready || !L || !group) return;
    group.clearLayers();
    clients.forEach((client) => {
      const content = document.createElement("div");
      content.className = `client-map-avatar ${client.bought ? "is-sold" : client.visited ? "is-visited" : client.scheduled ? "is-scheduled" : ""}`;
      const initials = document.createElement("span");
      initials.textContent = client.name.split(/\s+/).filter(Boolean).slice(0, 2).map((word) => word[0]).join("");
      if (client.photo) {
        const img = document.createElement("img");
        img.src = client.photo; img.alt = client.name; img.draggable = false;
        img.onerror = () => { img.replaceWith(initials); };
        content.appendChild(img);
      } else content.appendChild(initials);
      const badges = document.createElement("span");
      badges.className = "client-map-badges";
      for (const [enabled, label, status] of [[client.bought, "V", "sold"], [client.visited, "✓", "visited"], [client.scheduled, "A", "scheduled"]] as const) {
        if (!enabled) continue;
        const badge = document.createElement("span"); badge.className = `is-${status}`; badge.textContent = label; badges.appendChild(badge);
      }
      content.appendChild(badges);
      const title = `${client.name}, ${client.city}${client.bought ? ", vendido" : ""}${client.visited ? ", visitado" : ""}${client.scheduled ? ", visita agendada" : ""}`;
      const marker = L.marker([client.lat, client.lng], { title, alt: title, keyboard: true, riseOnHover: true, icon: L.divIcon({ html: content, className: "client-map-marker", iconSize: [36, 36], iconAnchor: [18, 18] }) });
      const tooltip = document.createElement("span"); tooltip.textContent = client.name;
      marker.bindTooltip(tooltip, { direction: "top", offset: [0, -15] });
      marker.on("click", () => { dialog.current?.close(); setExpanded(false); select.current(client.id); });
      group.addLayer(marker);
    });
    const boundsKey = clients.map((client) => `${client.id}:${client.lat}:${client.lng}`).sort().join("|");
    if (previousBounds.current !== boundsKey) { previousBounds.current = boundsKey; fitClients(); }
  }, [clients, ready]);

  useEffect(() => {
    if (!ready || !focusClientId) return;
    const client = clients.find((item) => item.id === focusClientId);
    if (client) map.current?.setView([client.lat, client.lng], 15, { animate: true });
  }, [clients, focusClientId, ready]);

  // Reparent the existing map into a native modal; preserve its camera and touch state.
  useEffect(() => {
    if (!dialog.current || !frame.current || !host.current) return;
    if (expanded) { dialog.current.showModal(); dialog.current.appendChild(frame.current); }
    else { host.current.appendChild(frame.current); dialog.current.close(); }
    map.current?.invalidateSize({ pan: false });
    const before = document.body.style.overflow;
    if (expanded) document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = before; };
  }, [expanded]);

  function locate() {
    if (!navigator.geolocation) { setLocationMessage("Localização indisponível neste navegador."); return; }
    setLocating(true); setLocationMessage("");
    navigator.geolocation.getCurrentPosition((position) => {
      const L = library.current;
      const instance = map.current;
      if (!L || !instance) return;
      locationLayers.current.forEach((layer) => layer.remove());
      const point: [number, number] = [position.coords.latitude, position.coords.longitude];
      locationLayers.current = [
        L.circle(point, { radius: position.coords.accuracy, color: "#0284c7", weight: 1, fillOpacity: 0.08 }).addTo(instance),
        L.circleMarker(point, { radius: 8, color: "white", weight: 3, fillColor: "#0284c7", fillOpacity: 1 }).addTo(instance)
      ];
      instance.setView(point, 14);
      setLocating(false);
    }, () => { setLocating(false); setLocationMessage("Não foi possível obter sua localização. Confira a permissão do navegador."); }, { timeout: 10000, maximumAge: 60000, enableHighAccuracy: true });
  }

  return <>
    <div ref={host} className="client-map-host">
      <div ref={frame} className={cn("client-map-frame", expanded && "is-expanded")}>
        <div ref={element} className="client-map-canvas" aria-label="Mapa geográfico dos clientes" />
        <div className="client-map-controls">
          <MapControl label={expanded ? "Fechar tela cheia" : "Ampliar mapa"} icon={expanded ? X : Expand} onClick={() => setExpanded(!expanded)} />
          <MapControl label="Aproximar" icon={Plus} disabled={!ready} onClick={() => map.current?.zoomIn()} />
          <MapControl label="Afastar" icon={Minus} disabled={!ready} onClick={() => map.current?.zoomOut()} />
          <MapControl label="Mostrar todos os clientes" icon={RotateCcw} disabled={!ready || !clients.length} onClick={fitClients} />
          <MapControl label="Minha localização" icon={locating ? Loader2 : LocateFixed} disabled={!ready || locating} onClick={locate} />
        </div>
        {(!ready || error) && <div className="client-map-state" role="status">{error ? <><p>Não foi possível carregar o mapa.</p><button onClick={() => setRetry((value) => value + 1)}>Tentar novamente</button></> : <><Loader2 className="h-6 w-6 animate-spin" /><p>Carregando mapa...</p></>}</div>}
        {ready && !clients.length && <div className="client-map-notice"><MapPin className="h-4 w-4 shrink-0" /><span>{emptyMessage}</span></div>}
        {(tileError || locationMessage) && <div className="client-map-notice" role="status"><span>{locationMessage || "As ruas estão indisponíveis. Verifique sua conexão."}</span><button aria-label="Tentar carregar novamente" onClick={() => { setLocationMessage(""); setRetry((value) => value + 1); }}><RotateCcw className="h-4 w-4" /></button></div>}
      </div>
    </div>
    <dialog ref={dialog} className="client-map-dialog" aria-label="Mapa em tela cheia" onCancel={(event) => { event.preventDefault(); setExpanded(false); }} />
    <div className="mt-3 flex flex-wrap gap-x-4 gap-y-2 text-xs text-muted-foreground" aria-label="Legenda do mapa">
      <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />Vendido</span>
      <span className="flex items-center gap-1.5"><Check className="h-3.5 w-3.5 text-sky-500" />Visitado</span>
      <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-amber-500" />Agendado</span>
    </div>
  </>;
}

function MapControl({ label, icon: Icon, onClick, disabled }: { label: string; icon: React.ElementType; onClick: () => void; disabled?: boolean }) {
  return <button type="button" title={label} aria-label={label} onClick={onClick} disabled={disabled}><Icon className="h-4 w-4" /></button>;
}
