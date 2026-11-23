import React, { useState, useEffect } from 'react';
import { MetarData, FlightCategory, PanamaWeatherResponse } from '../../types';
import { api } from '../../services/api';
import { useLanguage } from '../../i18n/LanguageContext';
import {
  CloudSun,
  Wind,
  Eye,
  Thermometer,
  Gauge,
  Compass,
  RefreshCw,
  Search,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Volume2,
  VolumeX,
  Copy,
  Check,
  Plane,
  Radio,
  Layers,
  MapPin,
  ChevronRight,
  ExternalLink,
  ShieldCheck,
  Sparkles,
  Info
} from 'lucide-react';

interface MetarTafPanamaViewProps {
  initialAirportIcao?: string;
}

export const MetarTafPanamaView: React.FC<MetarTafPanamaViewProps> = ({ initialAirportIcao }) => {
  const { t } = useLanguage();

  const [weatherData, setWeatherData] = useState<PanamaWeatherResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [selectedIcao, setSelectedIcao] = useState<string>(initialAirportIcao || 'MPMG');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [searchLoading, setSearchLoading] = useState<boolean>(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [copiedMetar, setCopiedMetar] = useState<boolean>(false);
  const [copiedTaf, setCopiedTaf] = useState<boolean>(false);
  const [isPlayingAtis, setIsPlayingAtis] = useState<boolean>(false);
  const [activeRegionFilter, setActiveRegionFilter] = useState<string>('todos');

  const loadWeather = async () => {
    try {
      setRefreshing(true);
      const data = await api.getPanamaWeather();
      setWeatherData(data);
      if (!selectedIcao && data.airports.length > 0) {
        setSelectedIcao(data.airports[0].icao);
      }
    } catch (err) {
      console.error('Error al cargar METAR/TAF:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadWeather();
    // Auto refresh every 3 minutes
    const interval = setInterval(() => {
      loadWeather();
    }, 3 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  // Handle custom ICAO search
  const handleSearchIcao = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    const queryClean = searchQuery.trim().toUpperCase();
    setSearchLoading(true);
    setSearchError(null);

    try {
      const result = await api.lookupAirportWeather(queryClean);
      if (result && result.airports.length > 0) {
        // Prepend or update in list
        setWeatherData(prev => {
          if (!prev) return result;
          const existingFiltered = prev.airports.filter(a => a.icao !== queryClean);
          return {
            ...prev,
            airports: [result.airports[0], ...existingFiltered],
            lastUpdated: new Date().toISOString()
          };
        });
        setSelectedIcao(queryClean);
        setSearchQuery('');
      } else {
        setSearchError(`No se encontraron registros METAR para ${queryClean}.`);
      }
    } catch (err) {
      setSearchError(`No se pudo consultar el aeródromo ${queryClean}. Verifica el código ICAO.`);
    } finally {
      setSearchLoading(false);
    }
  };

  // Find currently selected airport
  const currentAirport: MetarData | undefined = weatherData?.airports.find(a => a.icao === selectedIcao) || weatherData?.airports[0];

  // Helper for Flight Category styling
  const getFlightCategoryBadge = (cat: FlightCategory) => {
    switch (cat) {
      case 'VFR':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-extrabold bg-emerald-500/20 text-emerald-300 border border-emerald-400/40">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            VFR (Visual)
          </span>
        );
      case 'MVFR':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-extrabold bg-blue-500/20 text-blue-300 border border-blue-400/40">
            <span className="w-2 h-2 rounded-full bg-blue-400" />
            MVFR (VFR Marginal)
          </span>
        );
      case 'IFR':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-extrabold bg-rose-500/20 text-rose-300 border border-rose-400/40">
            <span className="w-2 h-2 rounded-full bg-rose-400 animate-ping" />
            IFR (Instrumentos)
          </span>
        );
      case 'LIFR':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-extrabold bg-purple-500/20 text-purple-300 border border-purple-400/40">
            <span className="w-2 h-2 rounded-full bg-purple-400" />
            LIFR (Bajo IFR)
          </span>
        );
    }
  };

  const getFlightCategoryExplanation = (cat: FlightCategory) => {
    switch (cat) {
      case 'VFR':
        return 'Condiciones óptimas para instrucción visual. Visibilidad ≥ 5 SM y Techo de nubes ≥ 3,000 ft AGL.';
      case 'MVFR':
        return 'VFR Marginal. Visibilidad entre 3 y 5 SM o Techo de nubes entre 1,000 y 3,000 ft AGL. Monitorear evolución.';
      case 'IFR':
        return 'Condiciones de vuelo por instrumentos requeridas. Visibilidad 1 a 3 SM o Techo entre 500 y 1,000 ft AGL.';
      case 'LIFR':
        return 'Bajo IFR. Visibilidad < 1 SM o Techo < 500 ft AGL. Restricciones severas de operación.';
    }
  };

  const copyToClipboard = (text: string, isTaf: boolean = false) => {
    navigator.clipboard.writeText(text);
    if (isTaf) {
      setCopiedTaf(true);
      setTimeout(() => setCopiedTaf(false), 2000);
    } else {
      setCopiedMetar(true);
      setTimeout(() => setCopiedMetar(false), 2000);
    }
  };

  // Simulated Voice ATIS
  const playSimulatedAtis = () => {
    if (!currentAirport) return;
    if ('speechSynthesis' in window) {
      if (isPlayingAtis) {
        window.speechSynthesis.cancel();
        setIsPlayingAtis(false);
        return;
      }

      const windSpd = currentAirport.windSpeedKt || 0;
      const windDir = currentAirport.windDirectionDeg || 0;
      const temp = currentAirport.temperatureC || 30;
      const dew = currentAirport.dewpointC || 24;
      const alt = currentAirport.altimeterInHg || 29.92;

      const text = `This is ${currentAirport.name} information Zulu. Observation time ${currentAirport.observationTimeFormatted}. Wind ${windDir} at ${windSpd} knots. Visibility ${currentAirport.visibilityDisplay}. Temperature ${temp}, dewpoint ${dew}. Altimeter ${alt}. Flight condition ${currentAirport.flightCategory}. Advise on initial contact you have information Zulu.`;

      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 0.95;
      utterance.pitch = 1.0;
      utterance.onend = () => setIsPlayingAtis(false);
      utterance.onerror = () => setIsPlayingAtis(false);

      setIsPlayingAtis(true);
      window.speechSynthesis.speak(utterance);
    }
  };

  // Crosswind calculation helper for main runway
  const calculateCrosswind = (windDir?: number, windSpd?: number, runwayHeading?: number) => {
    if (windDir === undefined || windSpd === undefined || runwayHeading === undefined) return null;
    const diffRad = ((windDir - runwayHeading) * Math.PI) / 180;
    const crosswind = Math.abs(Math.round(windSpd * Math.sin(diffRad)));
    const headwind = Math.round(windSpd * Math.cos(diffRad));
    return { crosswind, headwind };
  };

  // Filter airports by region
  const filteredAirports = weatherData?.airports.filter(apt => {
    if (activeRegionFilter === 'todos') return true;
    if (activeRegionFilter === 'panama') return ['MPTO', 'MPMG', 'MPPA'].includes(apt.icao);
    if (activeRegionFilter === 'provincias') return ['MPSC', 'MPCH', 'MPBL', 'MPJE', 'MPFS'].includes(apt.icao);
    return true;
  }) || [];

  return (
    <div className="space-y-5">
      {/* Top Banner & Search Control Bar */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-6 text-white shadow-xl">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-sky-600 to-indigo-600 flex items-center justify-center flex-shrink-0 shadow-md">
              <CloudSun className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-bold tracking-tight text-white">
                {t('weatherPanamaMetarTitle')}
              </h2>
            </div>
          </div>

          {/* Real-time Refresh & Timestamp */}
          <div className="flex items-center gap-3">
            {weatherData?.lastUpdated && (
              <div className="text-right hidden sm:block">
                <div className="text-[10px] text-slate-400">Última actualización:</div>
                <div className="text-xs font-semibold text-slate-200">
                  {new Date(weatherData.lastUpdated).toLocaleTimeString()} ({new Date(weatherData.lastUpdated).toISOString().substring(11, 16)} UTC)
                </div>
              </div>
            )}

            <button
              onClick={loadWeather}
              disabled={refreshing}
              className="inline-flex items-center gap-2 px-3.5 py-2 bg-sky-600 hover:bg-sky-500 disabled:opacity-50 text-white text-xs font-bold rounded-xl transition-all shadow-md cursor-pointer"
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
              <span>{t('refreshWeather')}</span>
            </button>
          </div>
        </div>

        {/* Airport Search Bar & Region Tabs */}
        <div className="mt-5 pt-4 border-t border-slate-800/80 flex flex-col md:flex-row gap-3 justify-between items-stretch md:items-center">
          {/* Region filter pills */}
          <div className="flex items-center gap-1.5 bg-slate-950 p-1 rounded-xl border border-slate-800">
            <button
              onClick={() => setActiveRegionFilter('todos')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
                activeRegionFilter === 'todos'
                  ? 'bg-sky-600 text-white shadow-xs'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Todos ({weatherData?.airports.length || 0})
            </button>
            <button
              onClick={() => setActiveRegionFilter('panama')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
                activeRegionFilter === 'panama'
                  ? 'bg-sky-600 text-white shadow-xs'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Ciudad de Panamá & Canal
            </button>
            <button
              onClick={() => setActiveRegionFilter('provincias')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
                activeRegionFilter === 'provincias'
                  ? 'bg-sky-600 text-white shadow-xs'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Provincias & Costas
            </button>
          </div>

          {/* ICAO Search Form */}
          <form onSubmit={handleSearchIcao} className="flex items-center gap-2 max-w-md w-full">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder={t('searchIcaoPlaceholder')}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value.toUpperCase())}
                maxLength={5}
                className="w-full bg-slate-950 border border-slate-700/80 rounded-xl pl-9 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-sky-500 font-mono uppercase tracking-wider"
              />
            </div>
            <button
              type="submit"
              disabled={searchLoading || !searchQuery.trim()}
              className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-slate-200 text-xs font-bold rounded-xl border border-slate-700 transition-colors cursor-pointer"
            >
              {searchLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : 'Consultar'}
            </button>
          </form>
        </div>

        {searchError && (
          <div className="mt-3 p-2.5 bg-rose-950/80 border border-rose-500/50 rounded-xl text-rose-200 text-xs flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-rose-400 flex-shrink-0" />
            <span>{searchError}</span>
          </div>
        )}
      </div>

      {/* Aerodromes Selector Horizontal Carousel */}
      <div className="flex items-center gap-2.5 overflow-x-auto pb-2 no-scrollbar">
        {filteredAirports.map((apt) => {
          const isSelected = apt.icao === selectedIcao;
          const isVfr = apt.flightCategory === 'VFR';
          const isMvfr = apt.flightCategory === 'MVFR';
          const isIfr = apt.flightCategory === 'IFR' || apt.flightCategory === 'LIFR';

          return (
            <button
              key={apt.icao}
              onClick={() => setSelectedIcao(apt.icao)}
              className={`p-3.5 rounded-2xl text-left transition-all flex-shrink-0 min-w-[200px] cursor-pointer border ${
                isSelected
                  ? 'bg-slate-900 border-sky-500 shadow-lg shadow-sky-500/10 ring-2 ring-sky-500/30'
                  : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50'
              }`}
            >
              <div className="flex items-center justify-between gap-2 mb-1.5">
                <div className="flex items-center gap-1.5">
                  <span className={`text-base font-extrabold font-mono ${isSelected ? 'text-white' : 'text-slate-900'}`}>
                    {apt.icao}
                  </span>
                  <span className="text-[10px] text-slate-400 font-normal">
                    {apt.city}
                  </span>
                </div>
                {getFlightCategoryBadge(apt.flightCategory)}
              </div>

              <div className="text-xs font-semibold text-slate-400 truncate mb-1">
                {apt.name}
              </div>

              <div className="flex items-center justify-between text-[11px] font-mono text-slate-500 pt-1 border-t border-slate-200/50 dark:border-slate-800">
                <span className="flex items-center gap-1">
                  <Wind className="w-3 h-3 text-sky-400" />
                  {apt.windSpeedKt !== undefined ? `${apt.windSpeedKt} KT` : 'Calma'}
                </span>
                <span className="flex items-center gap-1">
                  <Thermometer className="w-3 h-3 text-amber-400" />
                  {apt.temperatureC !== undefined ? `${apt.temperatureC}°C` : '--'}
                </span>
              </div>
            </button>
          );
        })}
      </div>

      {/* Detailed Weather Briefing for Selected Airport */}
      {currentAirport ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {/* Main Flight Dispatch & Decoder Card (Span 2 cols) */}
          <div className="lg:col-span-2 space-y-5">
            {/* Header of Selected Aerodrome */}
            <div className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-6 shadow-sm">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
                <div>
                  <div className="flex items-center gap-2.5">
                    <span className="text-2xl font-black font-mono tracking-tight text-slate-900">
                      {currentAirport.icao}
                    </span>
                    <span className="text-sm font-semibold text-slate-500">
                      {currentAirport.name}
                    </span>
                  </div>
                  <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 mt-1">
                    <span className="flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5 text-slate-400" />
                      {currentAirport.city}, {currentAirport.country}
                    </span>
                    <span>•</span>
                    <span className="flex items-center gap-1">
                      <Compass className="w-3.5 h-3.5 text-slate-400" />
                      Elev: <strong>{currentAirport.elevationFt} ft MSL</strong>
                    </span>
                    {currentAirport.towerFreq && (
                      <>
                        <span>•</span>
                        <span className="flex items-center gap-1">
                          <Radio className="w-3.5 h-3.5 text-emerald-500" />
                          Torre: <strong>{currentAirport.towerFreq}</strong>
                        </span>
                      </>
                    )}
                  </div>
                </div>

                {/* Simulated ATIS & Category Pill */}
                <div className="flex items-center gap-2">
                  <button
                    onClick={playSimulatedAtis}
                    className={`px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer border ${
                      isPlayingAtis
                        ? 'bg-amber-500 text-white border-amber-600 shadow-md animate-pulse'
                        : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200'
                    }`}
                    title="Escuchar audio simulado de información ATIS"
                  >
                    {isPlayingAtis ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4 text-sky-600" />}
                    <span>{isPlayingAtis ? 'Detener ATIS' : 'Audio ATIS'}</span>
                  </button>

                  <div>{getFlightCategoryBadge(currentAirport.flightCategory)}</div>
                </div>
              </div>

              {/* Category Explanation Alert */}
              <div className={`mt-4 p-3 rounded-xl text-xs flex items-start gap-2.5 ${
                currentAirport.flightCategory === 'VFR'
                  ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                  : currentAirport.flightCategory === 'MVFR'
                  ? 'bg-blue-50 text-blue-800 border border-blue-200'
                  : 'bg-rose-50 text-rose-800 border border-rose-200'
              }`}>
                <ShieldCheck className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold block mb-0.5">
                    {currentAirport.flightCategory} — {getFlightCategoryExplanation(currentAirport.flightCategory)}
                  </span>
                </div>
              </div>

              {/* 4-Grid Meteorological Instruments */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-5">
                {/* Wind Card */}
                <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3.5 text-center">
                  <div className="flex items-center justify-center gap-1.5 text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                    <Wind className="w-3.5 h-3.5 text-sky-500" />
                    <span>{t('windLabel')}</span>
                  </div>
                  <div className="text-base font-black text-slate-900 font-mono">
                    {currentAirport.windSpeedKt !== undefined && currentAirport.windSpeedKt > 0
                      ? `${currentAirport.windDirectionDeg}° / ${currentAirport.windSpeedKt} KT`
                      : '000° / 0 KT'}
                  </div>
                  <div className="text-[10px] text-slate-500 mt-1">
                    {currentAirport.windGustKt ? `Ráfagas de ${currentAirport.windGustKt} KT` : currentAirport.windDisplay}
                  </div>
                </div>

                {/* Visibility Card */}
                <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3.5 text-center">
                  <div className="flex items-center justify-center gap-1.5 text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                    <Eye className="w-3.5 h-3.5 text-indigo-500" />
                    <span>{t('visibilityLabel')}</span>
                  </div>
                  <div className="text-base font-black text-slate-900 font-mono">
                    {currentAirport.visibilityMiles !== undefined ? `${currentAirport.visibilityMiles} SM` : '> 10 SM'}
                  </div>
                  <div className="text-[10px] text-slate-500 mt-1">
                    {currentAirport.visibilityKm ? `~${currentAirport.visibilityKm} km de claridad` : 'Ilimitada'}
                  </div>
                </div>

                {/* Temperature & Dewpoint */}
                <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3.5 text-center">
                  <div className="flex items-center justify-center gap-1.5 text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                    <Thermometer className="w-3.5 h-3.5 text-amber-500" />
                    <span>Temp / Rocío</span>
                  </div>
                  <div className="text-base font-black text-slate-900 font-mono">
                    {currentAirport.temperatureC !== undefined ? `${currentAirport.temperatureC}°C` : '--'} / {currentAirport.dewpointC !== undefined ? `${currentAirport.dewpointC}°C` : '--'}
                  </div>
                  <div className="text-[10px] text-slate-500 mt-1">
                    Humedad: {currentAirport.relativeHumidity || 75}%
                  </div>
                </div>

                {/* Altimeter / QNH */}
                <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3.5 text-center">
                  <div className="flex items-center justify-center gap-1.5 text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                    <Gauge className="w-3.5 h-3.5 text-emerald-500" />
                    <span>{t('altimeterLabel')}</span>
                  </div>
                  <div className="text-base font-black text-slate-900 font-mono">
                    {currentAirport.altimeterInHg ? `${currentAirport.altimeterInHg} inHg` : '29.92 inHg'}
                  </div>
                  <div className="text-[10px] text-slate-500 mt-1">
                    {currentAirport.altimeterHpa ? `QNH ${currentAirport.altimeterHpa} hPa` : '1013 hPa'}
                  </div>
                </div>
              </div>

              {/* Cloud Layers & Ceilings Visual Breakdown */}
              <div className="mt-5 pt-4 border-t border-slate-100">
                <span className="text-xs font-bold text-slate-700 block mb-2.5 flex items-center gap-1.5">
                  <Layers className="w-4 h-4 text-sky-500" />
                  Estructura de Capas de Nubes y Techo (AGL):
                </span>
                <div className="space-y-2">
                  {currentAirport.clouds.map((cloud, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-200/70 text-xs"
                    >
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded font-mono font-bold bg-slate-200 text-slate-800 text-[11px]">
                          {cloud.cover}
                        </span>
                        <span className="font-semibold text-slate-700">
                          {cloud.baseFt ? `${cloud.baseFt.toLocaleString()} ft AGL` : 'Cielo Despejado'}
                        </span>
                        {cloud.type && (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-500 text-white animate-pulse">
                            {cloud.type === 'CB' ? 'CUMULONIMBUS (CB)' : 'TOWERING CUMULUS (TCU)'}
                          </span>
                        )}
                      </div>
                      <span className="text-slate-500 text-[11px]">
                        {cloud.description || 'Nubosidad estándar'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Weather Conditions Flags if any */}
              {currentAirport.weatherConditions && currentAirport.weatherConditions.length > 0 && (
                <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900">
                  <span className="font-bold block mb-1">Fenómenos de Tiempo Presente:</span>
                  <div className="flex flex-wrap gap-1.5">
                    {currentAirport.weatherConditions.map((wx, idx) => (
                      <span key={idx} className="px-2 py-1 rounded-md bg-amber-200/80 font-semibold text-amber-950">
                        {wx}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Decoded TAF Terminal Aerodrome Forecast Timeline */}
            <div className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-6 shadow-sm">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-indigo-600" />
                  <h3 className="text-sm font-bold text-slate-900">
                    Pronóstico Terminal de Aeródromo (TAF Decodificado - 24 Horas)
                  </h3>
                </div>
                {currentAirport.taf && (
                  <button
                    onClick={() => copyToClipboard(currentAirport.taf?.raw || '', true)}
                    className="text-xs font-semibold text-slate-500 hover:text-slate-800 flex items-center gap-1 cursor-pointer"
                  >
                    {copiedTaf ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedTaf ? 'Copiado' : 'Copiar TAF'}</span>
                  </button>
                )}
              </div>

              {currentAirport.taf ? (
                <div className="space-y-3">
                  {currentAirport.taf.forecasts.map((fc, idx) => (
                    <div
                      key={idx}
                      className="p-3.5 rounded-xl border border-slate-200/80 bg-slate-50 hover:bg-slate-100/80 transition-colors"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                        <div className="flex items-center gap-2">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-extrabold uppercase ${
                            fc.type === 'FM'
                              ? 'bg-purple-100 text-purple-800 border border-purple-200'
                              : fc.type === 'TEMPO'
                              ? 'bg-amber-100 text-amber-800 border border-amber-200'
                              : fc.type === 'BECMG'
                              ? 'bg-blue-100 text-blue-800 border border-blue-200'
                              : 'bg-slate-200 text-slate-800'
                          }`}>
                            {fc.type}
                          </span>
                          <span className="text-xs font-bold text-slate-700">
                            {fc.timeRangeDisplay || 'Período'}
                          </span>
                        </div>
                        {fc.flightCategory && getFlightCategoryBadge(fc.flightCategory)}
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs text-slate-600">
                        <div>
                          <strong className="text-slate-800">Viento:</strong> {fc.wind || 'Variable'}
                        </div>
                        <div>
                          <strong className="text-slate-800">Visibilidad:</strong> {fc.visibility || '10 SM'}
                        </div>
                        <div>
                          <strong className="text-slate-800">Nubes:</strong> {fc.clouds || 'FEW'}
                        </div>
                      </div>

                      {fc.weather && fc.weather !== 'NSW' && (
                        <div className="mt-2 text-[11px] text-amber-700 bg-amber-50 px-2.5 py-1 rounded-md border border-amber-200/60 font-semibold">
                          Tiempo esperado: {fc.weather}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-4 text-center text-xs text-slate-500 bg-slate-50 rounded-xl">
                  No hay boletín TAF publicado actualmente para este aeródromo secundario.
                </div>
              )}
            </div>
          </div>

          {/* Right Sidebar: Raw Telemetry, Runways & Crosswind (Span 1 col) */}
          <div className="space-y-5">
            {/* Raw METAR Card */}
            <div className="bg-slate-900 border border-slate-800 text-white rounded-2xl p-5 shadow-sm">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                  <Radio className="w-3.5 h-3.5 text-sky-400" />
                  {t('metarRaw')}
                </span>
                <button
                  onClick={() => copyToClipboard(currentAirport.raw, false)}
                  className="text-xs text-slate-400 hover:text-white flex items-center gap-1 cursor-pointer"
                >
                  {copiedMetar ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedMetar ? 'Copiado' : 'Copiar'}</span>
                </button>
              </div>

              <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 font-mono text-xs text-sky-300 leading-relaxed break-words selection:bg-sky-500 selection:text-white">
                {currentAirport.raw}
              </div>

              <div className="mt-3 text-[11px] text-slate-400 flex items-center justify-between">
                <span>Emitido hace: <strong>{currentAirport.timeAgoMinutes} min</strong></span>
                <span>{currentAirport.observationTimeFormatted}</span>
              </div>
            </div>

            {/* Runways & Crosswind Vector Calculator */}
            {currentAirport.runways && currentAirport.runways.length > 0 && (
              <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
                <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                  <Plane className="w-4 h-4 text-sky-600" />
                  {t('activeRunways')} y Viento Cruzado
                </h4>

                <div className="space-y-3">
                  {currentAirport.runways.map((rwy, idx) => {
                    const xw = calculateCrosswind(
                      currentAirport.windDirectionDeg,
                      currentAirport.windSpeedKt,
                      rwy.headingDeg
                    );

                    return (
                      <div
                        key={idx}
                        className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-1.5"
                      >
                        <div className="flex items-center justify-between font-mono font-bold text-slate-900">
                          <span>PISTA {rwy.ident}</span>
                          <span className="text-slate-500 font-sans font-normal text-[11px]">
                            {rwy.lengthFt.toLocaleString()} ft ({rwy.surface})
                          </span>
                        </div>

                        {xw && (
                          <div className="flex items-center justify-between text-[11px] pt-1 border-t border-slate-200/60">
                            <span className="text-slate-600">
                              Viento de frente: <strong>{xw.headwind} KT</strong>
                            </span>
                            <span className={`font-bold ${xw.crosswind > 12 ? 'text-rose-600' : 'text-slate-700'}`}>
                              Cruzado: {xw.crosswind} KT {xw.crosswind > 12 ? '⚠️' : ''}
                            </span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="p-12 text-center text-slate-500 bg-white rounded-2xl border border-slate-200">
          <CloudSun className="w-10 h-10 mx-auto text-slate-300 mb-2 animate-bounce" />
          <p className="text-sm font-semibold">{t('loading')}</p>
        </div>
      )}
    </div>
  );
};
