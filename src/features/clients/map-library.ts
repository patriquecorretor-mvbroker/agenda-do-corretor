type Point = [number, number];
type Options = Record<string, unknown>;
export interface MapLayer {
  addTo(map: ClientLeafletMap): this;
  remove(): this;
  on(event: string, callback: () => void): this;
}
export interface MapMarker extends MapLayer {
  bindTooltip(content: HTMLElement, options?: Options): this;
}
export interface MapCluster extends MapLayer {
  addLayer(marker: MapMarker): this;
  clearLayers(): this;
}
export interface ClientLeafletMap {
  setView(point: Point, zoom: number, options?: Options): this;
  fitBounds(points: Point[], options?: Options): this;
  invalidateSize(options?: Options): this;
  zoomIn(): this;
  zoomOut(): this;
  remove(): void;
  getZoom(): number;
  on(event: string, callback: () => void): this;
}
export interface MapLibrary {
  map(element: HTMLElement, options: Options): ClientLeafletMap;
  tileLayer(url: string, options: Options): MapLayer & { redraw(): void };
  marker(point: Point, options: Options): MapMarker;
  divIcon(options: Options): unknown;
  markerClusterGroup(options: Options): MapCluster;
  circleMarker(point: Point, options: Options): MapMarker;
  circle(point: Point, options: Options): MapLayer;
}

let pending: Promise<MapLibrary> | undefined;

function resource(path: string, style = false) {
  return new Promise<void>((resolve, reject) => {
    const element = style ? document.createElement("link") : document.createElement("script");
    if (element instanceof HTMLLinkElement) { element.rel = "stylesheet"; element.href = path; }
    else { element.src = path; element.async = true; }
    const timeout = window.setTimeout(() => failed(), 15000);
    const failed = () => { clearTimeout(timeout); element.remove(); reject(new Error("Não foi possível carregar o mapa.")); };
    element.onload = () => { clearTimeout(timeout); resolve(); };
    element.onerror = failed;
    document.head.appendChild(element);
  });
}

export function loadMapLibrary() {
  if (!pending) pending = (async () => {
    await Promise.all([
      resource("/vendor/leaflet/leaflet.css", true),
      resource("/vendor/leaflet/MarkerCluster.css", true),
      resource("/vendor/leaflet/MarkerCluster.Default.css", true)
    ]);
    await resource("/vendor/leaflet/leaflet.js");
    await resource("/vendor/leaflet/leaflet.markercluster.js");
    return (window as unknown as { L: MapLibrary }).L;
  })().catch((error) => { pending = undefined; throw error; });
  return pending;
}
