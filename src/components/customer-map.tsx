"use client";

import { Plus } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Modal } from "@/components/modal";
import { Button, PageHeader, inputClass } from "@/components/ui";
import { cn } from "@/lib/utils";
import type { Map as LeafletMap, LayerGroup, Marker } from "leaflet";
import "leaflet/dist/leaflet.css";

type Customer = {
  id: string;
  customerCode: string;
  name: string;
  username: string;
  status: string;
  kind: string;
  serviceType: string;
  odp: string;
  latitude: string;
  longitude: string;
};

type Odp = {
  id: string;
  name: string;
  area: string;
  lat: string;
  lng: string;
};

type PendingPin = {
  lat: number;
  lng: number;
};

const DEFAULT_CENTER: [number, number] = [-6.732, 108.552];
const DEFAULT_ZOOM = 12;
const LEAFLET_ICON = {
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
};

const TYPE_LABEL: Record<string, string> = {
  pppoe: "PPPoE",
  pptp: "PPTP",
  l2tp: "L2TP",
  ovpn: "OpenVPN / SSTP",
  hotspot: "Hotspot",
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

function customerHref(row: Customer) {
  return row.kind === "hotspot" ? `/customers/hotspot/${row.id}` : `/customers/ppp/${row.id}`;
}

export function CustomerMap() {
  const mapEl = useRef<HTMLDivElement>(null);
  const mapRef = useRef<LeafletMap | null>(null);
  const markersRef = useRef<LayerGroup | null>(null);
  const draftRef = useRef<Marker | null>(null);
  const pickingRef = useRef(false);
  const fittedRef = useRef(false);

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [odps, setOdps] = useState<Odp[]>([]);
  const [typeFilter, setTypeFilter] = useState("");
  const [odpFilter, setOdpFilter] = useState("");
  const [query, setQuery] = useState("");
  const [picking, setPicking] = useState(false);
  const [pending, setPending] = useState<PendingPin | null>(null);
  const [targetKind, setTargetKind] = useState<"customer" | "odp">("customer");
  const [targetId, setTargetId] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mapReady, setMapReady] = useState(false);

  pickingRef.current = picking;

  const load = useCallback(async () => {
    const [custData, odpData] = await Promise.all([
      fetch("/api/v1/customers").then((r) => r.json()),
      fetch("/api/v1/odps").then((r) => r.json()),
    ]);
    setCustomers((custData.rows ?? []) as Customer[]);
    setOdps((odpData.rows ?? []) as Odp[]);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const typeOptions = useMemo(() => {
    const values = [...new Set(customers.map((row) => row.serviceType).filter(Boolean))];
    return values.sort();
  }, [customers]);

  const odpOptions = useMemo(() => {
    const names = new Set<string>();
    for (const row of odps) if (row.name) names.add(row.name);
    for (const row of customers) if (row.odp) names.add(row.odp);
    return [...names].sort((a, b) => a.localeCompare(b, "id"));
  }, [customers, odps]);

  const q = query.trim().toLowerCase();

  const visibleCustomers = useMemo(() => {
    if (typeFilter === "odp") return [];
    return customers.filter((row) => {
      if (typeFilter && row.serviceType !== typeFilter) return false;
      if (odpFilter && row.odp !== odpFilter) return false;
      if (!q) return true;
      return (
        row.name.toLowerCase().includes(q) ||
        row.customerCode.toLowerCase().includes(q) ||
        row.username.toLowerCase().includes(q)
      );
    });
  }, [customers, typeFilter, odpFilter, q]);

  const visibleOdps = useMemo(() => {
    if (typeFilter && typeFilter !== "odp") return [];
    return odps.filter((row) => {
      if (odpFilter && row.name !== odpFilter) return false;
      if (!q) return true;
      return row.name.toLowerCase().includes(q) || row.area.toLowerCase().includes(q);
    });
  }, [odps, typeFilter, odpFilter, q]);

  const placedCount =
    visibleCustomers.filter((row) => pair(row.latitude, row.longitude)).length +
    visibleOdps.filter((row) => pair(row.lat, row.lng)).length;

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
      map.on("click", (event) => {
        if (!pickingRef.current) return;
        const { lat, lng } = event.latlng;
        setPending({ lat, lng });
        setError(null);
        if (draftRef.current) draftRef.current.setLatLng(event.latlng);
        else {
          draftRef.current = L.marker(event.latlng).addTo(map);
        }
      });

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
      draftRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    const group = markersRef.current;
    if (!mapReady || !map || !group) return;

    void import("leaflet").then(({ default: L }) => {
      group.clearLayers();
      const bounds: [number, number][] = [];

      const odpIcon = L.divIcon({
        className: "customer-map-odp",
        html: '<span class="customer-map-odp-dot"></span>',
        iconSize: [16, 16],
        iconAnchor: [8, 8],
        popupAnchor: [0, -10],
      });

      for (const row of visibleCustomers) {
        const coords = pair(row.latitude, row.longitude);
        if (!coords) continue;
        bounds.push(coords);
        const type = TYPE_LABEL[row.serviceType] ?? row.serviceType.toUpperCase();
        L.marker(coords)
          .bindPopup(
            `<div class="customer-map-popup">
              <strong>${escapeHtml(row.name)}</strong>
              <div>${escapeHtml(row.customerCode)}</div>
              <div>${escapeHtml(type)} · ${escapeHtml(row.status)}</div>
              ${row.odp ? `<div>ODP: ${escapeHtml(row.odp)}</div>` : ""}
              <a href="${customerHref(row)}">Detail pelanggan</a>
            </div>`,
          )
          .addTo(group);
      }

      for (const row of visibleOdps) {
        const coords = pair(row.lat, row.lng);
        if (!coords) continue;
        bounds.push(coords);
        L.marker(coords, { icon: odpIcon, title: row.name })
          .bindPopup(
            `<div class="customer-map-popup">
              <strong>${escapeHtml(row.name)}</strong>
              <div>ODP / POP</div>
              ${row.area ? `<div>${escapeHtml(row.area)}</div>` : ""}
              <a href="/odp">Kelola ODP</a>
            </div>`,
          )
          .addTo(group);
      }

      if (bounds.length && !fittedRef.current) {
        fittedRef.current = true;
        map.fitBounds(bounds, { padding: [40, 40], maxZoom: 16 });
      }
    });
  }, [mapReady, visibleCustomers, visibleOdps]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    map.getContainer().style.cursor = picking ? "crosshair" : "";
    if (!picking && draftRef.current) {
      draftRef.current.remove();
      draftRef.current = null;
    }
  }, [picking]);

  function startPicking() {
    setError(null);
    setPending(null);
    setTargetKind("customer");
    setTargetId("");
    setPicking(true);
  }

  function cancelPicking() {
    setPicking(false);
    setPending(null);
    setTargetId("");
    setError(null);
  }

  async function savePin() {
    if (!pending || !targetId) {
      setError("Pilih pelanggan atau ODP yang akan ditandai.");
      return;
    }
    setSaving(true);
    setError(null);
    const lat = pending.lat.toFixed(7);
    const lng = pending.lng.toFixed(7);
    const response =
      targetKind === "odp"
        ? await fetch(`/api/v1/odps/${targetId}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ lat, lng }),
          })
        : await fetch(`/api/v1/customers/${targetId}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ latitude: lat, longitude: lng }),
          });
    const data = (await response.json()) as { error?: string };
    setSaving(false);
    if (!response.ok) {
      setError(data.error ?? "Gagal menyimpan koordinat.");
      return;
    }
    if (draftRef.current) {
      draftRef.current.remove();
      draftRef.current = null;
    }
    fittedRef.current = true;
    mapRef.current?.flyTo([pending.lat, pending.lng], Math.max(mapRef.current.getZoom(), 16));
    setPicking(false);
    setPending(null);
    setTargetId("");
    await load();
  }

  const unplacedCustomers = customers.filter((row) => !pair(row.latitude, row.longitude));
  const placedCustomers = customers.filter((row) => pair(row.latitude, row.longitude));
  const unplacedOdps = odps.filter((row) => !pair(row.lat, row.lng));
  const placedOdps = odps.filter((row) => pair(row.lat, row.lng));

  return (
    <div>
      <PageHeader
        title="Peta Pelanggan"
        breadcrumb={["Home", "Peta pelanggan"]}
        actions={
          picking ? (
            <Button variant="secondary" onClick={cancelPicking}>
              Batal menandai
            </Button>
          ) : (
            <Button variant="secondary" onClick={startPicking}>
              <Plus className="mr-1 size-3.5" />
              Tambah penanda
            </Button>
          )
        }
      />

      {error && !pending ? (
        <p className="mb-3 rounded-sm border border-[#ebccd1] bg-[#f2dede] px-3 py-2 text-[13px] text-[#a94442]">
          {error}
        </p>
      ) : null}

      <div className="mb-2 flex flex-wrap gap-2">
        <select
          className={cn(inputClass, "w-[180px]")}
          value={typeFilter}
          onChange={(event) => setTypeFilter(event.target.value)}
          aria-label="Filter tipe"
        >
          <option value="">-- ALL TYPE --</option>
          {typeOptions.map((value) => (
            <option key={value} value={value}>
              {TYPE_LABEL[value] ?? value.toUpperCase()}
            </option>
          ))}
          <option value="odp">ODP</option>
        </select>
        <select
          className={cn(inputClass, "w-[220px]")}
          value={odpFilter}
          onChange={(event) => setOdpFilter(event.target.value)}
          aria-label="Filter ODP atau POP"
        >
          <option value="">-- ALL ODP|POP --</option>
          {odpOptions.map((name) => (
            <option key={name} value={name}>
              {name}
            </option>
          ))}
        </select>
        <input
          className={cn(inputClass, "min-w-[220px] flex-1")}
          placeholder="Name / Customer-Id"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
      </div>

      {picking && !pending ? (
        <p className="mb-2 text-[12px] text-[var(--lte-blue)]">
          Klik lokasi di peta untuk menaruh penanda.
        </p>
      ) : null}

      <section className="overflow-hidden rounded-sm border border-[var(--lte-line)] bg-white shadow-[0_1px_1px_rgba(0,0,0,0.05)]">
        <div ref={mapEl} className="customer-map-canvas h-[calc(100vh-240px)] min-h-[480px] w-full" />
        {!placedCount && mapReady ? (
          <p className="border-t border-[var(--lte-line)] bg-[#fafafa] px-3 py-2 text-[12px] text-[var(--lte-muted)]">
            Belum ada koordinat pada filter ini. Klik Tambah penanda, lalu klik peta.
          </p>
        ) : null}
      </section>

      <Modal
        title="Tambah penanda"
        open={Boolean(pending)}
        onClose={cancelPicking}
        footer={
          <>
            <Button variant="ghost" onClick={cancelPicking}>
              Batal
            </Button>
            <Button onClick={() => void savePin()} disabled={saving || !targetId}>
              {saving ? "Menyimpan…" : "Simpan"}
            </Button>
          </>
        }
      >
        <div className="space-y-3">
          {error ? (
            <p className="rounded-sm border border-[#ebccd1] bg-[#f2dede] px-3 py-2 text-[13px] text-[#a94442]">
              {error}
            </p>
          ) : null}
          <p className="text-[12px] text-[var(--lte-muted)]">
            Koordinat: {pending?.lat.toFixed(7)}, {pending?.lng.toFixed(7)}
          </p>
          <label className="block text-[12px] font-semibold text-[#555]">
            Tipe
            <select
              className={cn(inputClass, "mt-1")}
              value={targetKind}
              onChange={(event) => {
                setTargetKind(event.target.value as "customer" | "odp");
                setTargetId("");
              }}
            >
              <option value="customer">Pelanggan</option>
              <option value="odp">ODP / POP</option>
            </select>
          </label>
          {targetKind === "customer" ? (
            <label className="block text-[12px] font-semibold text-[#555]">
              Pelanggan
              <select
                className={cn(inputClass, "mt-1")}
                value={targetId}
                onChange={(event) => setTargetId(event.target.value)}
              >
                <option value="">— Pilih pelanggan —</option>
                {unplacedCustomers.length ? (
                  <optgroup label="Belum ada pin">
                    {unplacedCustomers.map((row) => (
                      <option key={row.id} value={row.id}>
                        {row.name} · {row.customerCode}
                      </option>
                    ))}
                  </optgroup>
                ) : null}
                {placedCustomers.length ? (
                  <optgroup label="Pindahkan pin">
                    {placedCustomers.map((row) => (
                      <option key={row.id} value={row.id}>
                        {row.name} · {row.customerCode}
                      </option>
                    ))}
                  </optgroup>
                ) : null}
              </select>
            </label>
          ) : (
            <label className="block text-[12px] font-semibold text-[#555]">
              ODP / POP
              <select
                className={cn(inputClass, "mt-1")}
                value={targetId}
                onChange={(event) => setTargetId(event.target.value)}
              >
                <option value="">— Pilih ODP —</option>
                {unplacedOdps.map((row) => (
                  <option key={row.id} value={row.id}>
                    {row.name}
                  </option>
                ))}
                {placedOdps.map((row) => (
                  <option key={`p-${row.id}`} value={row.id}>
                    {row.name} (pindahkan)
                  </option>
                ))}
              </select>
            </label>
          )}
        </div>
      </Modal>
    </div>
  );
}
