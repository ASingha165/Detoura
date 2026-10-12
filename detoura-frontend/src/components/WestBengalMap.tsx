import { useEffect, useRef, useState, useCallback } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { getDestinationImage } from '../services/imageService';
import DestinationImage from './DestinationImage';
import { useTranslation } from '../DetouraContext';

export interface MapDestination {
  destination_id: string;
  name: string;
  district?: string;
  category?: string;
  latitude: number;
  longitude: number;
  detoura_score?: number;
  match_score?: number;
  budget_tier?: number;
  estimated_daily_inr?: number;
  underrated_score?: number;
  crowd_pressure_index?: number;
  image_url?: string;
}

interface WestBengalMapProps {
  destinations: MapDestination[];
  selectedDestinationId?: string | null;
  onSelectDestination?: (dest: MapDestination) => void;
  className?: string;
  height?: string;
}

// Bounding box strictly enclosing West Bengal (from Bay of Bengal coast to Himalayan peaks)
export const WEST_BENGAL_BOUNDS = {
  north: 27.5,
  south: 21.2,
  west: 85.5,
  east: 90.0,
};

export const WEST_BENGAL_CENTER = {
  lat: 24.3,
  lng: 87.85,
};

// SVG icon creator for Leaflet divIcon
const createMarkerIcon = (isSelected: boolean, isFeatured: boolean) => {
  const fill = isSelected ? '#9f3c16' : isFeatured ? '#7f5300' : '#3a6660';
  const size = isSelected ? 34 : 22;

  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 24 24" style="filter: drop-shadow(0 2px 5px rgba(0,0,0,0.35)); display: block;">
      ${isSelected ? `<circle cx="12" cy="12" r="11" fill="none" stroke="#9f3c16" stroke-width="2" stroke-dasharray="3,2" opacity="0.8"/>` : ''}
      <circle cx="12" cy="12" r="9" fill="${fill}" stroke="#ffffff" stroke-width="2.5"/>
      <circle cx="12" cy="12" r="3.5" fill="#ffffff"/>
    </svg>
  `;

  return L.divIcon({
    html: svg,
    className: 'detoura-leaflet-marker',
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });
};

export default function WestBengalMap({
  destinations,
  selectedDestinationId,
  onSelectDestination,
  className = '',
  height = '360px'
}: WestBengalMapProps) {
  const {
    t,
    localizeCategory,
    localizeRegion,
    localizeDestinationName,
    formatPricePerDay
  } = useTranslation();
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markersRef = useRef<Map<string, { marker: L.Marker; dest: MapDestination }>>(new Map());
  const prevSelectedIdRef = useRef<string | null>(null);

  const [activePopupDest, setActivePopupDest] = useState<MapDestination | null>(null);
  const [popupImage, setPopupImage] = useState<string | null>(null);

  // 1. Initialize Leaflet Map once
  useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current) return;

    const southWest = L.latLng(WEST_BENGAL_BOUNDS.south, WEST_BENGAL_BOUNDS.west);
    const northEast = L.latLng(WEST_BENGAL_BOUNDS.north, WEST_BENGAL_BOUNDS.east);
    const bounds = L.latLngBounds(southWest, northEast);

    const map = L.map(mapContainerRef.current, {
      center: [WEST_BENGAL_CENTER.lat, WEST_BENGAL_CENTER.lng],
      zoom: 7,
      minZoom: 6,
      maxZoom: 14,
      maxBounds: bounds,
      maxBoundsViscosity: 1.0,
      zoomControl: false,
      attributionControl: false,
    });

    // Free OpenStreetMap tiles (no API keys, no Google billing)
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 14,
      minZoom: 6,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    }).addTo(map);

    L.control.attribution({ position: 'bottomright', prefix: false })
      .addAttribution('&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap</a>')
      .addTo(map);

    mapInstanceRef.current = map;

    setTimeout(() => {
      map.invalidateSize();
    }, 250);

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  // 2. Select a marker callback
  const handleMarkerSelect = useCallback(
    async (dest: MapDestination, zoomIfFar = true) => {
      setActivePopupDest(dest);
      if (onSelectDestination) {
        onSelectDestination(dest);
      }

      // Load image lazily for active floating micro-card
      const img = await getDestinationImage(dest.name, dest.district, dest.category);
      setPopupImage(img);

      const map = mapInstanceRef.current;
      if (map) {
        const targetZoom = zoomIfFar && map.getZoom() < 9 ? 9 : map.getZoom();
        map.setView([dest.latitude, dest.longitude], targetZoom, { animate: true });
      }
    },
    [onSelectDestination]
  );

  // 3. Populate 515 destination markers on map (rebuilt only when destinations list changes)
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    // Remove old markers
    markersRef.current.forEach(({ marker }) => marker.remove());
    markersRef.current.clear();

    destinations.forEach((dest) => {
      if (typeof dest.latitude !== 'number' || typeof dest.longitude !== 'number') return;

      const isSelected = dest.destination_id === selectedDestinationId;
      const isFeatured = (dest.detoura_score || 0) > 1.5 || (dest.match_score || 0) > 0.85;

      const marker = L.marker([dest.latitude, dest.longitude], {
        icon: createMarkerIcon(isSelected, isFeatured),
        zIndexOffset: isSelected ? 1000 : 10,
        title: dest.name,
      });

      // Accessible tooltip with destination name and district
      marker.bindTooltip(
        `<div style="font-weight:600;font-size:12px;color:#1a3832;">${dest.name}</div><div style="font-size:10px;color:#555;">${dest.district || ''}</div>`,
        {
          direction: 'top',
          offset: [0, -12],
          className: 'detoura-tooltip-container',
          opacity: 0.95
        }
      );

      marker.on('click', (e) => {
        L.DomEvent.stopPropagation(e);
        handleMarkerSelect(dest);
      });

      marker.addTo(map);
      markersRef.current.set(dest.destination_id, { marker, dest });
    });
  }, [destinations, handleMarkerSelect]);

  // 4. Update marker styles and map center when selectedDestinationId changes
  useEffect(() => {
    if (!selectedDestinationId) {
      if (prevSelectedIdRef.current) {
        const prev = markersRef.current.get(prevSelectedIdRef.current);
        if (prev) {
          const isFeatured = (prev.dest.detoura_score || 0) > 1.5 || (prev.dest.match_score || 0) > 0.85;
          prev.marker.setIcon(createMarkerIcon(false, isFeatured));
          prev.marker.setZIndexOffset(10);
        }
      }
      prevSelectedIdRef.current = null;
      return;
    }

    // Unselect previous marker
    if (prevSelectedIdRef.current && prevSelectedIdRef.current !== selectedDestinationId) {
      const prev = markersRef.current.get(prevSelectedIdRef.current);
      if (prev) {
        const isFeatured = (prev.dest.detoura_score || 0) > 1.5 || (prev.dest.match_score || 0) > 0.85;
        prev.marker.setIcon(createMarkerIcon(false, isFeatured));
        prev.marker.setZIndexOffset(10);
      }
    }

    // Highlight new selected marker
    const current = markersRef.current.get(selectedDestinationId);
    if (current) {
      const isFeatured = (current.dest.detoura_score || 0) > 1.5 || (current.dest.match_score || 0) > 0.85;
      current.marker.setIcon(createMarkerIcon(true, isFeatured));
      current.marker.setZIndexOffset(1000);
      prevSelectedIdRef.current = selectedDestinationId;

      setActivePopupDest(current.dest);
      getDestinationImage(current.dest.name, current.dest.district, current.dest.category).then((img) => {
        setPopupImage(img);
      });

      const map = mapInstanceRef.current;
      if (map) {
        const currentZoom = map.getZoom();
        const targetZoom = currentZoom < 9 ? 9 : currentZoom;
        map.setView([current.dest.latitude, current.dest.longitude], targetZoom, { animate: true });
      }
    }
  }, [selectedDestinationId]);

  // Controls
  const handleRecenter = () => {
    if (mapInstanceRef.current) {
      mapInstanceRef.current.setView([WEST_BENGAL_CENTER.lat, WEST_BENGAL_CENTER.lng], 7, { animate: true });
    }
  };

  const handleZoomIn = () => {
    if (mapInstanceRef.current) {
      mapInstanceRef.current.zoomIn();
    }
  };

  const handleZoomOut = () => {
    if (mapInstanceRef.current) {
      mapInstanceRef.current.zoomOut();
    }
  };

  return (
    <div
      className={`relative w-full rounded-2xl overflow-hidden bg-surface-container-low shadow-md border border-outline-variant/30 ${className}`}
      style={{ height }}
    >
      <style>{`
        .detoura-leaflet-marker {
          background: transparent !important;
          border: none !important;
          cursor: pointer;
        }
        .leaflet-container {
          font-family: inherit;
          background-color: #f5f4ef;
        }
        .detoura-tooltip-container {
          border-radius: 8px !important;
          border: 1px solid rgba(0,0,0,0.1) !important;
          box-shadow: 0 4px 12px rgba(0,0,0,0.15) !important;
          padding: 4px 8px !important;
        }
      `}</style>

      {/* Leaflet Map Viewport */}
      <div ref={mapContainerRef} className="w-full h-full z-0" />

      {/* State Restriction Badge */}
      <div className="absolute top-3 right-3 flex flex-col items-end gap-1 pointer-events-none z-10">
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-surface-container-lowest/90 backdrop-blur-md shadow-sm border border-outline-variant/30">
          <span className="w-2 h-2 rounded-full bg-secondary"></span>
          <span className="font-label-sm text-label-sm text-secondary font-bold uppercase tracking-wider">
            {t('map.westBengalOnly')}
          </span>
        </div>
        <span className="font-label-sm text-[10px] bg-surface-container-lowest/80 backdrop-blur-xs px-2 py-0.5 rounded text-on-surface-variant font-mono shadow-xs">
          21.2°N - 27.5°N
        </span>
      </div>

      {/* Floating Micro-Card when a marker is active */}
      {activePopupDest && (
        <div className="absolute bottom-3 left-3 right-16 sm:right-auto sm:w-80 rounded-xl bg-surface-container-lowest p-3 shadow-xl border border-outline-variant/40 flex items-start gap-3 z-20 animate-fadeIn">
          <div className="w-16 h-16 rounded-lg overflow-hidden shrink-0 bg-surface-container-highest">
            <DestinationImage
              src={popupImage}
              alt={activePopupDest.name}
              name={activePopupDest.name}
              category={activePopupDest.category}
              className="w-full h-full object-cover"
            />
          </div>
          <div className="flex flex-col flex-1 min-w-0">
            <div className="flex items-center justify-between gap-1">
              <span className="font-label-sm text-[10px] text-secondary font-bold uppercase tracking-wider truncate">
                {localizeRegion(activePopupDest.district)}
              </span>
              <span className="px-1.5 py-0.2 rounded bg-primary/10 text-primary font-label-sm text-[9px] font-bold">
                {t('map.selected')}
              </span>
            </div>
            <h4 className="font-headline-sm text-[14px] font-semibold text-on-surface truncate leading-tight mt-0.5">
              {localizeDestinationName(activePopupDest.name)}
            </h4>
            <div className="flex items-center justify-between text-on-surface-variant font-label-sm text-[11px] mt-1">
              <span className="truncate">{localizeCategory(activePopupDest.category) || t('map.regionalDestination')}</span>
              {activePopupDest.estimated_daily_inr ? (
                <span className="font-semibold text-secondary shrink-0">
                  {formatPricePerDay(activePopupDest.estimated_daily_inr)}
                </span>
              ) : null}
            </div>
          </div>
          <button
            onClick={() => setActivePopupDest(null)}
            className="text-on-surface-variant hover:text-on-surface p-0.5 cursor-pointer"
            aria-label={t('map.closeDetails')}
          >
            <span className="material-symbols-outlined text-[16px]">close</span>
          </button>
        </div>
      )}

      {/* Floating Map Zoom & Recenter Controls */}
      <div className="absolute top-3 left-3 flex flex-col gap-1 bg-surface-container-lowest/90 backdrop-blur-md rounded-lg p-1 shadow-md border border-outline-variant/30 z-10">
        <button
          onClick={handleZoomIn}
          className="w-7 h-7 flex items-center justify-center text-on-surface-variant hover:text-primary transition-colors active:scale-95 cursor-pointer"
          title={t('map.zoomIn')}
          aria-label={t('map.zoomIn')}
        >
          <span className="material-symbols-outlined text-[16px]">add</span>
        </button>
        <button
          onClick={handleZoomOut}
          className="w-7 h-7 flex items-center justify-center text-on-surface-variant hover:text-primary transition-colors active:scale-95 cursor-pointer"
          title={t('map.zoomOut')}
          aria-label={t('map.zoomOut')}
        >
          <span className="material-symbols-outlined text-[16px]">remove</span>
        </button>
        <button
          onClick={handleRecenter}
          className="w-7 h-7 flex items-center justify-center text-on-surface-variant hover:text-primary transition-colors active:scale-95 cursor-pointer"
          title={t('map.recenter')}
          aria-label={t('map.recenter')}
        >
          <span className="material-symbols-outlined text-[16px]">my_location</span>
        </button>
      </div>
    </div>
  );
}
