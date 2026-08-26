"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { PageHeader, inputClass } from "@/components/ui";
import { cn } from "@/lib/utils";
import type { Map as LeafletMap, LayerGroup } from "leaflet";
import "leaflet/dist/leaflet.css";

type Odp = {
  id: string;
  name: string;
  area: string;
  owner: string;
  lat: string;
  lng: string;
  capacity: number;
  used: number;
  note: string;
};

const DEFAULT_CENTER: [number, number] = [-6.732, 108.552];
const DEFAULT_ZOOM = 12;
const LEAFLET_ICON = {
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
};

function parseCoord(value: string | undefined): number | null {
  if (!value?.trim()) return null;
  const n = Number(value.replace(",", ".").trim());
  return Number.isFinite(n) ? n : null;
}

function pair(latRaw: string, lngRaw: string): [number, number] | null {
  const lat = parseCoord(latRaw);
  const lng = parseCoord(lngRaw);
  if (lat === null || lng === null) return null;
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return null;
  return [lat, lng];
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function OdpMap() {
  const mapEl = useRef<HTMLDivElement>(null);
  const mapRef = useRef<LeafletMap | null>(null);
  const markersRef = useRef<LayerGroup | null>(null);
  const fittedRef = useRef(false);

  const [rows, setRows] = useState<Odp[]>([]);
  const [areaFilter, setAreaFilter] = useState("");
  const [ownerFilter, setOwnerFilter] = useState("");
  const [query, setQuery] = useState("");
  const [mapReady, setMapReady] = useState(false);

  const load = useCallback(async () => {
    const data = await fetch("/api/v1/odps").then((r) => r.json());
    setRows((data.rows ?? []) as Odp[]);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const areaOptions = useMemo(() => {
    return [...new Set(rows.map((row) => row.area.trim()).filter(Boolean))].sort((a, b) =>
      a.localeCompare(b, "id"),
    );
  }, [rows]);

  const ownerOptions = useMemo(() => {
    return [...new Set(rows.map((row) => (row.owner || "admin").trim()).filter(Boolean))].sort(
      (a, b) => a.localeCompare(b, "id"),
    );
  }, [rows]);

  const q = query.trim().toLowerCase();

  const visible = useMemo(() => {
    return rows.filter((row) => {
      if (areaFilter && row.area !== areaFilter) return false;
      if (ownerFilter && (row.owner || "admin") !== ownerFilter) return false;
      if (!q) return true;
      return (
        row.name.toLowerCase().includes(q) ||
        row.area.toLowerCase().includes(q) ||
        (row.owner || "").toLowerCase().includes(q)
      );
    });
  }, [rows, areaFilter, ownerFilter, q]);

  const placed = visible.filter((row) => pair(row.lat, row.lng));

  useEffect(() => {
    if (!mapEl.current || mapRef.current) return;
    let cancelled = false;
    let onFullscreen: (() => void) | undefined;

    void (async () => {
      const L = (await import("leaflet")).default;
      if (cancelled || !mapEl.current) return;

      delete (L.Icon.Default.prototype as { _getIconUrl?: unknown })._getIconUrl;
      L.Icon.Default.mergeOptions(LEAFLET_ICON);

      const street = L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19,
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      });
      const satellite = L.tileLayer(
        "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
        {
          maxZoom: 19,
          attribution:
            "Tiles &copy; Esri — Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community",
        },
      );

      const map = L.map(mapEl.current, {
        center: DEFAULT_CENTER,
        zoom: DEFAULT_ZOOM,
        layers: [street],
        zoomControl: true,
      });
      if (cancelled) {
        map.remove();
        return;
      }

      L.control
        .layers({ "Street Map": street, Satellite: satellite }, undefined, {
          position: "bottomright",
        })
        .addTo(map);

      const FullscreenControl = L.Control.extend({
        onAdd(thisMap: LeafletMap) {
          const wrap = L.DomUtil.create("div", "leaflet-bar");
          const btn = L.DomUtil.create("a", "customer-map-fs", wrap);
          btn.href = "#";
          btn.title = "Toggle Fullscreen";
          btn.setAttribute("role", "button");
          btn.setAttribute("aria-label", "Toggle Fullscreen");
          btn.innerHTML =
            '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M8 3H5a2 2 0 0 0-2 2v3"/><path d="M21 8V5a2 2 0 0 0-2-2h-3"/><path d="M3 16v3a2 2 0 0 0 2 2h3"/><path d="M16 21h3a2 2 0 0 0 2-2v-3"/></svg>';
          L.DomEvent.disableClickPropagation(wrap);
          L.DomEvent.on(btn, "click", (event) => {
            L.DomEvent.preventDefault(event);
            const el = thisMap.getContainer();
            if (!document.fullscreenElement) void el.requestFullscreen();
            else void document.exitFullscreen();
          });
          return wrap;
        },
      });
      map.addControl(new FullscreenControl({ position: "topleft" }));

      const markers = L.layerGroup().addTo(map);
      onFullscreen = () => {
        window.setTimeout(() => map.invalidateSize(), 200);
      };
      document.addEventListener("fullscreenchange", onFullscreen);
      mapRef.current = map;
      markersRef.current = markers;
      if (cancelled) {
        document.removeEventListener("fullscreenchange", onFullscreen);
        map.remove();
        mapRef.current = null;
        markersRef.current = null;
        return;
      }
      setMapReady(true);
    })();

    return () => {
      cancelled = true;
      if (onFullscreen) document.removeEventListener("fullscreenchange", onFullscreen);
      mapRef.current?.remove();
      mapRef.current = null;
      markersRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    const group = markersRef.current;
    if (!mapReady || !map || !group) return;

    void import("leaflet").then(({ default: L }) => {
      group.clearLayers();
      const bounds: [number, number][] = [];

      for (const row of visible) {
        const coords = pair(row.lat, row.lng);
        if (!coords) continue;
        bounds.push(coords);
        const sisa = Math.max(0, row.capacity - row.used);
        L.marker(coords, { title: row.name })
          .bindPopup(
            `<div class="customer-map-popup">
              <strong>${escapeHtml(row.name)}</strong>
              ${row.area ? `<div>${escapeHtml(row.area)}</div>` : ""}
              <div>Owner: ${escapeHtml(row.owner || "admin")}</div>
              <div>${row.used}/${row.capacity} port · sisa ${sisa}</div>
              <a href="/odp">Kelola ODP | POP</a>
            </div>`,
          )
          .addTo(group);
      }

      if (bounds.length && !fittedRef.current) {
        fittedRef.current = true;
        map.fitBounds(bounds, { padding: [40, 40], maxZoom: 16 });
      }
    });
  }, [mapReady, visible]);

  return (
    <div>
      <PageHeader title="Peta Lokasi ODP | POP" breadcrumb={["Home", "Peta Lokasi ODP | POP"]} />

      <div className="mb-2 flex flex-wrap gap-2">
        <select
          className={cn(inputClass, "w-[180px]")}
          value={areaFilter}
          onChange={(event) => setAreaFilter(event.target.value)}
          aria-label="Filter area"
        >
          <option value="">-- ALL AREA --</option>
          {areaOptions.map((area) => (
            <option key={area} value={area}>
              {area}
            </option>
          ))}
        </select>
        <select
          className={cn(inputClass, "w-[180px]")}
          value={ownerFilter}
          onChange={(event) => setOwnerFilter(event.target.value)}
          aria-label="Filter owner"
        >
          <option value="">-- ALL OWNER --</option>
          {ownerOptions.map((owner) => (
            <option key={owner} value={owner}>
              {owner}
            </option>
          ))}
        </select>
        <input
          className={cn(inputClass, "min-w-[220px] flex-1")}
          placeholder="Name / Area"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
      </div>

      <section className="overflow-hidden rounded-sm border border-[var(--lte-line)] bg-white shadow-[0_1px_1px_rgba(0,0,0,0.05)]">
        <div ref={mapEl} className="customer-map-canvas h-[calc(100vh-220px)] min-h-[480px] w-full" />
        {mapReady && !placed.length ? (
          <p className="border-t border-[var(--lte-line)] bg-[#fafafa] px-3 py-2 text-[12px] text-[var(--lte-muted)]">
            Belum ada ODP dengan koordinat pada filter ini. Isi Lat/Lng di Kelola ODP | POP.
          </p>
        ) : null}
      </section>
    </div>
  );
}
