import React, { useState } from 'react';
import { useLanguage } from '../../i18n/LanguageContext';
import {
  Wind,
  CloudRain,
  Cloud,
  Satellite,
  Compass,
  ExternalLink,
  MapPin,
  Radio,
  Maximize2,
  Minimize2,
  Layers,
  Sparkles,
  Plane,
  Eye,
  Info
} from 'lucide-react';

interface AirportQuickPreset {
  icao: string;
  name: string;
  city: string;
  lat: number;
  lon: number;
  zoom: number;
  elevation: string;
  tower: string;
  runway: string;
}

const PANAMA_QUICK_AIRPORTS: AirportQuickPreset[] = [
  {
    icao: 'MPMG',
    name: 'Albrook / M.A. Gelabert',
    city: 'Ciudad de Panamá (Canal)',
    lat: 8.9733,
    lon: -79.5556,
    zoom: 10,
    elevation: '31 ft MSL',
    tower: '118.30 MHz',
    runway: 'RWY 18/36 (5,906 ft)'
  },
  {
    icao: 'MPTO',
    name: 'Tocumen Internacional',
    city: 'Panamá Este',
    lat: 9.0714,
    lon: -79.3833,
    zoom: 10,
    elevation: '135 ft MSL',
    tower: '118.10 MHz',
    runway: 'RWY 03L/21R, 03R/21L'
  },
  {
    icao: 'MPPA',
    name: 'Panamá Pacífico (Howard)',
    city: 'Panamá Oeste',
    lat: 8.9150,
    lon: -79.5997,
    zoom: 10,
    elevation: '50 ft MSL',
    tower: '118.70 MHz',
    runway: 'RWY 18/36 (8,501 ft)'
  },
  {
    icao: 'MPCH',
    name: 'Enrique Malek',
    city: 'David, Chiriquí',
    lat: 8.3911,
    lon: -82.4350,
    zoom: 10,
    elevation: '89 ft MSL',
    tower: '118.50 MHz',
    runway: 'RWY 04/22 (6,890 ft)'
  },
  {
    icao: 'MPSC',
    name: 'Scarlett Martínez',
    city: 'Río Hato, Coclé',
    lat: 8.3756,
    lon: -80.1281,
    zoom: 10,
    elevation: '105 ft MSL',
    tower: '118.90 MHz',
    runway: 'RWY 17/35 (8,038 ft)'
  },
  {
    icao: 'MPBL',
    name: 'Bocas del Toro (Isla Colón)',
    city: 'Bocas del Toro',
    lat: 9.3408,
    lon: -82.2508,
    zoom: 10,
    elevation: '10 ft MSL',
    tower: '118.20 MHz',
    runway: 'RWY 08/26 (4,921 ft)'
  },
  {
    icao: 'MPJE',
    name: 'Jaqué',
    city: 'Darién / Pacífico Sur',
    lat: 7.5186,
    lon: -78.1583,
    zoom: 9,
    elevation: '25 ft MSL',
    tower: '122.80 MHz',
    runway: 'RWY 13/31 (3,937 ft)'
  }
];

type WeatherOverlay = 'wind' | 'radar' | 'rain' | 'clouds' | 'satellite' | 'waves';
type AltitudeLevel = 'surface' | '850h' | '700h';

export const WindyWeatherView: React.FC = () => {
  const { t } = useLanguage();

  const [activeAirport, setActiveAirport] = useState<AirportQuickPreset>(PANAMA_QUICK_AIRPORTS[0]);
  const [selectedOverlay, setSelectedOverlay] = useState<WeatherOverlay>('radar');
  const [selectedAltitude, setSelectedAltitude] = useState<AltitudeLevel>('surface');
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);

  // Generador de URL para el widget oficial de Windy embebido
  const generateWindyUrl = () => {
    const lat = activeAirport.lat;
    const lon = activeAirport.lon;
    const zoom = activeAirport.zoom;

    let overlayParam = 'radar';
    if (selectedOverlay === 'wind') overlayParam = 'wind';
    else if (selectedOverlay === 'rain') overlayParam = 'rain';
    else if (selectedOverlay === 'clouds') overlayParam = 'clouds';
    else if (selectedOverlay === 'satellite') overlayParam = 'satellite';
    else if (selectedOverlay === 'waves') overlayParam = 'waves';

    const levelParam = selectedAltitude === 'surface' ? 'surface' : selectedAltitude;

    return `https://embed.windy.com/embed2.html?lat=${lat}&lon=${lon}&detailLat=${lat}&detailLon=${lon}&width=100%25&height=100%25&zoom=${zoom}&level=${levelParam}&overlay=${overlayParam}&product=ecmwf&menu=&message=&marker=true&calendar=now&pressure=true&type=map&location=coordinates&detail=&metricWind=kt&metricTemp=%C2%B0C&radarRange=-1`;
  };

  const handleSelectAirport = (apt: AirportQuickPreset) => {
    setActiveAirport(apt);
  };

  const externalWindyLink = `https://www.windy.com/?${activeAirport.lat},${activeAirport.lon},${activeAirport.zoom},m:dYNae6j`;

  return (
    <div className={`space-y-4 transition-all duration-300 ${isFullscreen ? 'fixed inset-0 z-50 bg-slate-950 p-4 overflow-y-auto' : ''}`}>
      {/* Top Header Card with Quick Tools */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-5 text-white shadow-xl">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-sky-500/20 text-sky-400 border border-sky-500/30 flex items-center justify-center">
                <Wind className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-lg sm:text-xl font-bold tracking-tight text-white">
                  {t('weatherRadarTitle')}
                </h2>
              </div>
            </div>
          </div>

          {/* Quick Actions & External Link */}
          <div className="flex flex-wrap items-center gap-2">
            <a
              href={externalWindyLink}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-sky-300 text-xs font-semibold rounded-xl border border-slate-700 transition-colors shadow-sm"
              title="Abrir mapa en pantalla completa en Windy.com"
            >
              <ExternalLink className="w-4 h-4" />
              <span>{t('viewOnWindy')}</span>
            </a>

            <button
              onClick={() => setIsFullscreen(!isFullscreen)}
              className="inline-flex items-center gap-1.5 px-3 py-2 bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold rounded-xl transition-colors shadow-md cursor-pointer"
            >
              {isFullscreen ? (
                <>
                  <Minimize2 className="w-4 h-4" />
                  <span>Salir de Pantalla Completa</span>
                </>
              ) : (
                <>
                  <Maximize2 className="w-4 h-4" />
                  <span>Modo Pantalla Completa</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Airport Selectors & Layer Switcher Bar */}
        <div className="mt-5 pt-4 border-t border-slate-800/80 flex flex-col xl:flex-row gap-4 justify-between items-start xl:items-center">
          {/* Panama Airfield Quick Buttons */}
          <div className="w-full xl:w-auto">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-2">
              {t('quickPanamaAirports')}
            </span>
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1.5 no-scrollbar max-w-full">
              {PANAMA_QUICK_AIRPORTS.map((apt) => {
                const isSelected = activeAirport.icao === apt.icao;
                return (
                  <button
                    key={apt.icao}
                    onClick={() => handleSelectAirport(apt)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1.5 cursor-pointer ${
                      isSelected
                        ? 'bg-sky-500 text-white shadow-lg shadow-sky-500/30 scale-102 border border-sky-400'
                        : 'bg-slate-800/90 text-slate-300 hover:bg-slate-700/80 hover:text-white border border-slate-700/60'
                    }`}
                  >
                    <MapPin className="w-3.5 h-3.5" />
                    <span>{apt.icao}</span>
                    <span className="text-[10px] opacity-75 font-normal hidden sm:inline">
                      ({apt.name.split('/')[0].trim()})
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Meteorological Layer Switchers */}
          <div className="flex flex-wrap items-center gap-1.5">
            <button
              onClick={() => setSelectedOverlay('radar')}
              className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer ${
                selectedOverlay === 'radar'
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 font-bold'
                  : 'bg-slate-800 text-slate-400 hover:text-slate-200 border border-slate-700/50'
              }`}
            >
              <CloudRain className="w-3.5 h-3.5 text-amber-400" />
              <span>Radar Doppler</span>
            </button>

            <button
              onClick={() => setSelectedOverlay('wind')}
              className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer ${
                selectedOverlay === 'wind'
                  ? 'bg-sky-500/20 text-sky-300 border border-sky-500/40 font-bold'
                  : 'bg-slate-800 text-slate-400 hover:text-slate-200 border border-slate-700/50'
              }`}
            >
              <Wind className="w-3.5 h-3.5 text-sky-400" />
              <span>Viento (KT)</span>
            </button>

            <button
              onClick={() => setSelectedOverlay('clouds')}
              className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer ${
                selectedOverlay === 'clouds'
                  ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/40 font-bold'
                  : 'bg-slate-800 text-slate-400 hover:text-slate-200 border border-slate-700/50'
              }`}
            >
              <Cloud className="w-3.5 h-3.5 text-indigo-400" />
              <span>Nubes & Techo</span>
            </button>

            <button
              onClick={() => setSelectedOverlay('satellite')}
              className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer ${
                selectedOverlay === 'satellite'
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-bold'
                  : 'bg-slate-800 text-slate-400 hover:text-slate-200 border border-slate-700/50'
              }`}
            >
              <Satellite className="w-3.5 h-3.5 text-emerald-400" />
              <span>Satélite IR</span>
            </button>

            {/* Altitude Level Selector */}
            <div className="flex items-center bg-slate-950 p-0.5 rounded-lg border border-slate-800 ml-1">
              <button
                onClick={() => setSelectedAltitude('surface')}
                className={`px-2 py-1 text-[11px] font-bold rounded-md transition-colors cursor-pointer ${
                  selectedAltitude === 'surface'
                    ? 'bg-sky-600 text-white shadow-xs'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
                title="Vientos en Superficie"
              >
                SFC
              </button>
              <button
                onClick={() => setSelectedAltitude('850h')}
                className={`px-2 py-1 text-[11px] font-bold rounded-md transition-colors cursor-pointer ${
                  selectedAltitude === '850h'
                    ? 'bg-sky-600 text-white shadow-xs'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
                title="Vientos a FL050 (~5,000 ft)"
              >
                FL050
              </button>
              <button
                onClick={() => setSelectedAltitude('700h')}
                className={`px-2 py-1 text-[11px] font-bold rounded-md transition-colors cursor-pointer ${
                  selectedAltitude === '700h'
                    ? 'bg-sky-600 text-white shadow-xs'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
                title="Vientos a FL100 (~10,000 ft)"
              >
                FL100
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Active Airport Quick Technical Specs Ribbon */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-slate-300 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 font-semibold">
          <Plane className="w-4 h-4 text-sky-400" />
          <span className="text-white font-bold">{activeAirport.icao}</span>
          <span className="text-slate-400">— {activeAirport.name} ({activeAirport.city})</span>
        </div>

        <div className="flex flex-wrap items-center gap-4 text-[11px] text-slate-400">
          <div className="flex items-center gap-1.5">
            <Radio className="w-3.5 h-3.5 text-emerald-400" />
            <span>TWR: <strong className="text-slate-200">{activeAirport.tower}</strong></span>
          </div>
          <div className="flex items-center gap-1.5">
            <Compass className="w-3.5 h-3.5 text-indigo-400" />
            <span>Elevación: <strong className="text-slate-200">{activeAirport.elevation}</strong></span>
          </div>
          <div className="flex items-center gap-1.5">
            <Layers className="w-3.5 h-3.5 text-amber-400" />
            <span>Pista: <strong className="text-slate-200">{activeAirport.runway}</strong></span>
          </div>
        </div>
      </div>

      {/* Embedded Windy Iframe Container */}
      <div className="relative w-full rounded-2xl overflow-hidden border border-slate-800 bg-slate-950 shadow-2xl min-h-[550px] sm:min-h-[650px] lg:min-h-[720px] flex flex-col">
        <iframe
          src={generateWindyUrl()}
          title="Windy Weather Radar Panamá"
          className="w-full flex-1 border-0 min-h-[550px] sm:min-h-[650px] lg:min-h-[720px]"
          loading="lazy"
          allow="geolocation"
        />
      </div>
    </div>
  );
};
