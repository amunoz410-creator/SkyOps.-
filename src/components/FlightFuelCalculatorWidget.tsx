import React, { useState, useMemo } from 'react';
import { User } from '../types';
import {
  Fuel,
  Plane,
  Gauge,
  Clock,
  Navigation,
  AlertTriangle,
  CheckCircle2,
  Copy,
  Check,
  RotateCcw,
  Sparkles,
  Info,
  Scale,
  ShieldCheck,
  ChevronDown,
  ChevronUp
} from 'lucide-react';

interface FleetFuelProfile {
  matricula: string;
  modelo: string;
  velocidadCruceroKTAS: number;
  consumoGPH: number;
  capacidadUtilGal: number;
  tipoCombustible: string;
  motor: string;
}

const FLEET_PROFILES: FleetFuelProfile[] = [
  {
    matricula: 'HP-1450',
    modelo: 'Cessna 172 Skyhawk',
    velocidadCruceroKTAS: 110,
    consumoGPH: 8.5,
    capacidadUtilGal: 53.0,
    tipoCombustible: 'AVGAS 100LL',
    motor: 'Lycoming IO-360-L2A (180 HP)'
  },
  {
    matricula: 'HP-1588',
    modelo: 'Cessna 172SP Nav III (G1000)',
    velocidadCruceroKTAS: 115,
    consumoGPH: 9.2,
    capacidadUtilGal: 53.0,
    tipoCombustible: 'AVGAS 100LL',
    motor: 'Lycoming IO-360-L2A (180 HP)'
  },
  {
    matricula: 'HP-1822',
    modelo: 'Piper PA-44-180 Seminole (Bimotor)',
    velocidadCruceroKTAS: 155,
    consumoGPH: 21.0,
    capacidadUtilGal: 108.0,
    tipoCombustible: 'AVGAS 100LL',
    motor: '2x Lycoming O-360-E1A6D (360 HP)'
  },
  {
    matricula: 'HP-1799',
    modelo: 'Piper PA-28-181 Archer III',
    velocidadCruceroKTAS: 118,
    consumoGPH: 9.5,
    capacidadUtilGal: 48.0,
    tipoCombustible: 'AVGAS 100LL',
    motor: 'Lycoming O-360-A4M (180 HP)'
  },
  {
    matricula: 'HP-1934',
    modelo: 'Piper PA-28-161 Cherokee',
    velocidadCruceroKTAS: 105,
    consumoGPH: 8.5,
    capacidadUtilGal: 48.0,
    tipoCombustible: 'AVGAS 100LL',
    motor: 'Lycoming O-320-D2A (160 HP)'
  },
  {
    matricula: 'SIM-ALX',
    modelo: 'Simulador Alsim ALX FNPT II',
    velocidadCruceroKTAS: 130,
    consumoGPH: 10.0,
    capacidadUtilGal: 60.0,
    tipoCombustible: 'Entrenador Sintético',
    motor: 'Simulación Turbohélice / Multi-Motor'
  }
];

const POPULAR_ROUTES = [
  { nombre: 'Tránsito / Maniobras', origen: 'MPMG', destino: 'Local', distanciaNM: 20 },
  { nombre: 'Chame', origen: 'MPMG', destino: 'MPCE', distanciaNM: 32 },
  { nombre: 'Contadora', origen: 'MPMG', destino: 'MPFS', distanciaNM: 35 },
  { nombre: 'Río Hato', origen: 'MPMG', destino: 'MPRA', distanciaNM: 55 },
  { nombre: 'Chitré', origen: 'MPMG', destino: 'MPCH', distanciaNM: 85 },
  { nombre: 'Santiago', origen: 'MPMG', destino: 'MPSR', distanciaNM: 105 },
  { nombre: 'Bocas del Toro', origen: 'MPMG', destino: 'MPBO', distanciaNM: 160 },
  { nombre: 'David / Malek', origen: 'MPMG', destino: 'MPDA', distanciaNM: 175 }
];

interface FlightFuelCalculatorWidgetProps {
  currentUser: User;
}

export const FlightFuelCalculatorWidget: React.FC<FlightFuelCalculatorWidgetProps> = ({ currentUser }) => {
  const [selectedMatricula, setSelectedMatricula] = useState<string>('HP-1450');
  const [distanciaNM, setDistanciaNM] = useState<number | string>(85);
  const [velocidadCrucero, setVelocidadCrucero] = useState<number | string>(110);
  const [consumoGPH, setConsumoGPH] = useState<number | string>(8.5);
  const [reservaTipo, setReservaTipo] = useState<'vfr_dia' | 'vfr_noche' | 'ifr' | 'ninguna'>('vfr_dia');
  const [taxiGalones, setTaxiGalones] = useState<number | string>(1.5);
  const [copiado, setCopiado] = useState<boolean>(false);
  const [isCollapsed, setIsCollapsed] = useState<boolean>(false);

  // Perfil de la aeronave seleccionada
  const activeProfile = useMemo(() => {
    return FLEET_PROFILES.find(p => p.matricula === selectedMatricula) || FLEET_PROFILES[0];
  }, [selectedMatricula]);

  // Al cambiar la aeronave, restablecer sus parámetros nominales de fábrica
  const handleSelectAircraft = (matricula: string) => {
    setSelectedMatricula(matricula);
    const prof = FLEET_PROFILES.find(p => p.matricula === matricula);
    if (prof) {
      setVelocidadCrucero(prof.velocidadCruceroKTAS);
      setConsumoGPH(prof.consumoGPH);
    }
  };

  // Minutos de reserva regulatoria aeronáutica
  const minutosReserva = useMemo(() => {
    switch (reservaTipo) {
      case 'vfr_dia':
        return 30; // 30 minutos VFR Día
      case 'vfr_noche':
        return 45; // 45 minutos VFR Noche
      case 'ifr':
        return 60; // 45 min norma IFR + 15 min reserva alterno
      case 'ninguna':
      default:
        return 0;
    }
  }, [reservaTipo]);

  // Cálculos de navegación y combustible
  const calculations = useMemo(() => {
    const dist = Math.max(0, parseFloat(String(distanciaNM)) || 0);
    const speed = Math.max(1, parseFloat(String(velocidadCrucero)) || 1);
    const gph = Math.max(0, parseFloat(String(consumoGPH)) || 0);
    const taxi = Math.max(0, parseFloat(String(taxiGalones)) || 0);

    // Tiempo en ruta (horas decimales)
    const tiempoRutaHoras = dist / speed;
    const tiempoRutaMinutos = Math.round(tiempoRutaHoras * 60);
    const horasFormato = Math.floor(tiempoRutaMinutos / 60);
    const minutosFormato = tiempoRutaMinutos % 60;

    // Combustible en ruta (Galones)
    const combustibleRutaGal = tiempoRutaHoras * gph;

    // Combustible de reserva reglamentaria
    const combustibleReservaGal = (minutosReserva / 60) * gph;

    // Combustible total requerido para despacho
    const combustibleTotalGal = combustibleRutaGal + combustibleReservaGal + taxi;

    // Conversiones aeronáuticas
    const combustibleLitros = combustibleTotalGal * 3.78541;
    // Densidad nominal AVGAS 100LL: 6.0 lbs por galón americano
    const pesoLibras = combustibleTotalGal * 6.0;

    // Capacidad útil y margen
    const capacidadUtil = activeProfile.capacidadUtilGal;
    const excedeCapacidad = combustibleTotalGal > capacidadUtil;
    const porcentajeCapacidad = capacidadUtil > 0 ? (combustibleTotalGal / capacidadUtil) * 100 : 0;
    const combustibleRemanenteGal = Math.max(0, capacidadUtil - combustibleTotalGal);
    const autonomiaTotalHoras = gph > 0 ? capacidadUtil / gph : 0;

    return {
      distanciaKm: dist * 1.852,
      tiempoRutaHoras,
      tiempoRutaMinutos,
      tiempoRutaTexto: `${horasFormato}h ${minutosFormato < 10 ? '0' : ''}${minutosFormato}m`,
      combustibleRutaGal,
      combustibleReservaGal,
      taxiGal: taxi,
      combustibleTotalGal,
      combustibleLitros,
      pesoLibras,
      capacidadUtil,
      excedeCapacidad,
      porcentajeCapacidad,
      combustibleRemanenteGal,
      autonomiaTotalHoras
    };
  }, [distanciaNM, velocidadCrucero, consumoGPH, taxiGalones, minutosReserva, activeProfile]);

  const handleCopySummary = () => {
    const text = `=== PLAN DE COMBUSTIBLE DE NAVEGACIÓN ===
Aeronave: ${activeProfile.modelo} (${activeProfile.matricula})
Distancia de Navegación: ${distanciaNM} NM (${calculations.distanciaKm.toFixed(1)} km)
Velocidad de Crucero (TAS): ${velocidadCrucero} KTAS | Consumo: ${consumoGPH} GPH
Tiempo Estimado en Ruta (ETE): ${calculations.tiempoRutaTexto}
--------------------------------------------------
Combustible en Ruta: ${calculations.combustibleRutaGal.toFixed(2)} Gal
Reserva Reglamentaria (${minutosReserva} min): ${calculations.combustibleReservaGal.toFixed(2)} Gal
Rodaje y Arranque (Taxi): ${calculations.taxiGal.toFixed(2)} Gal
==================================================
COMBUSTIBLE MÍNIMO REQUERIDO: ${calculations.combustibleTotalGal.toFixed(1)} US GAL
Equivalente: ${calculations.combustibleLitros.toFixed(1)} Litros / ${calculations.pesoLibras.toFixed(1)} Lbs (AVGAS 100LL)
Capacidad Útil del Tanque: ${activeProfile.capacidadUtilGal} Gal (${calculations.porcentajeCapacidad.toFixed(0)}% ocupado)
Despacho Generado por: ${currentUser.nombre} (${currentUser.rol.toUpperCase()})`;

    navigator.clipboard.writeText(text);
    setCopiado(true);
    setTimeout(() => setCopiado(false), 2500);
  };

  const handleResetDefaults = () => {
    setDistanciaNM(85);
    setTaxiGalones(1.5);
    setReservaTipo('vfr_dia');
    setVelocidadCrucero(activeProfile.velocidadCruceroKTAS);
    setConsumoGPH(activeProfile.consumoGPH);
  };

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-sky-200 dark:border-sky-900/60 shadow-xs overflow-hidden transition-all">
      {/* Header del Módulo Auxiliar */}
      <div className="px-4 sm:px-5 py-3.5 bg-linear-to-r from-sky-900 via-slate-900 to-indigo-950 text-white flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-sky-500/20 text-sky-300 border border-sky-400/30">
            <Fuel className="w-4 h-4" />
          </div>
          <div>
            <h3 className="font-bold text-xs sm:text-sm tracking-wide text-white">
              Calculadora de Combustible de Navegación
            </h3>
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            onClick={handleResetDefaults}
            className="p-1.5 hover:bg-white/10 rounded-lg text-slate-300 hover:text-white transition-colors cursor-pointer"
            title="Restablecer valores nominales"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="p-1.5 hover:bg-white/10 rounded-lg text-slate-300 hover:text-white transition-colors cursor-pointer"
            title={isCollapsed ? 'Expandir calculadora' : 'Contraer calculadora'}
          >
            {isCollapsed ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {!isCollapsed && (
        <div className="p-4 sm:p-5 space-y-4">
          {/* Fila 1: Selección de Aeronave y Configuración de Régimen */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-3.5">
            {/* Selector de Aeronave */}
            <div className="lg:col-span-5 space-y-1.5">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <Plane className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400" />
                  Aeronave de la Flota
                </span>
                <span className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">
                  {activeProfile.tipoCombustible}
                </span>
              </label>
              <select
                value={selectedMatricula}
                onChange={(e) => handleSelectAircraft(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800/80 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-sky-500 cursor-pointer"
              >
                {FLEET_PROFILES.map((p) => (
                  <option key={p.matricula} value={p.matricula}>
                    {p.matricula} — {p.modelo} ({p.consumoGPH} GPH / {p.velocidadCruceroKTAS} KTAS)
                  </option>
                ))}
              </select>
              <div className="p-2 rounded-lg bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 text-[11px] text-slate-600 dark:text-slate-400 flex items-center justify-between">
                <span>Planta Motriz: <strong>{activeProfile.motor}</strong></span>
                <span>Tanque Útil: <strong>{activeProfile.capacidadUtilGal} Gal</strong></span>
              </div>
            </div>

            {/* Consumo y Velocidad */}
            <div className="lg:col-span-7 grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* Consumo GPH */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center justify-between">
                  <span className="flex items-center gap-1">
                    <Fuel className="w-3.5 h-3.5 text-amber-500" />
                    Consumo (GPH)
                  </span>
                  <span className="text-[10px] text-amber-600 dark:text-amber-400 font-bold">Gal/hr</span>
                </label>
                <div className="relative">
                  <input
                    type="number"
                    step="0.1"
                    min="1"
                    value={consumoGPH}
                    onChange={(e) => setConsumoGPH(e.target.value)}
                    className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-black text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-sky-500"
                    placeholder="8.5"
                  />
                  <span className="absolute right-3 top-2.5 text-[10px] text-slate-400 font-bold pointer-events-none">
                    GPH
                  </span>
                </div>
                <span className="text-[10px] text-slate-500 block">
                  Nominal: {activeProfile.consumoGPH} GPH
                </span>
              </div>

              {/* Velocidad de Crucero (KTAS) */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center justify-between">
                  <span className="flex items-center gap-1">
                    <Gauge className="w-3.5 h-3.5 text-indigo-500" />
                    Velocidad (TAS)
                  </span>
                  <span className="text-[10px] text-indigo-600 dark:text-indigo-400 font-bold">Nudos</span>
                </label>
                <div className="relative">
                  <input
                    type="number"
                    step="1"
                    min="20"
                    value={velocidadCrucero}
                    onChange={(e) => setVelocidadCrucero(e.target.value)}
                    className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-black text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-sky-500"
                    placeholder="110"
                  />
                  <span className="absolute right-3 top-2.5 text-[10px] text-slate-400 font-bold pointer-events-none">
                    KTAS
                  </span>
                </div>
                <span className="text-[10px] text-slate-500 block">
                  Crucero: {activeProfile.velocidadCruceroKTAS} kts
                </span>
              </div>

              {/* Taxi / Rodaje */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center justify-between">
                  <span className="flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-slate-500" />
                    Rodaje / Run-up
                  </span>
                  <span className="text-[10px] text-slate-500 font-bold">Taxi</span>
                </label>
                <div className="relative">
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    value={taxiGalones}
                    onChange={(e) => setTaxiGalones(e.target.value)}
                    className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-black text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-sky-500"
                    placeholder="1.5"
                  />
                  <span className="absolute right-3 top-2.5 text-[10px] text-slate-400 font-bold pointer-events-none">
                    Gal
                  </span>
                </div>
                <span className="text-[10px] text-slate-500 block">
                  Arranque y prueba
                </span>
              </div>
            </div>
          </div>

          {/* Fila 2: Distancia de Navegación y Rutas Frecuentes */}
          <div className="p-3.5 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200 dark:border-slate-800 space-y-2.5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <label className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                <Navigation className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400" />
                <span>Distancia de Navegación del Vuelo:</span>
                <strong className="text-sky-700 dark:text-sky-300 text-sm">
                  {distanciaNM || 0} NM
                </strong>
                <span className="text-[11px] text-slate-500 font-normal">
                  ({calculations.distanciaKm.toFixed(1)} km)
                </span>
              </label>

              <div className="flex items-center gap-2">
                <div className="relative w-32">
                  <input
                    type="number"
                    step="1"
                    min="1"
                    value={distanciaNM}
                    onChange={(e) => setDistanciaNM(e.target.value)}
                    className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-xs font-black text-center text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-sky-500"
                    placeholder="85"
                  />
                  <span className="absolute right-2 top-1.5 text-[10px] text-slate-400 font-bold pointer-events-none">
                    NM
                  </span>
                </div>
              </div>
            </div>

            {/* Accesos rápidos a aeropuertos frecuentes en Panamá */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-[11px]">
              <span className="text-slate-500 font-semibold shrink-0">Rutas desde MPMG:</span>
              {POPULAR_ROUTES.map((r) => {
                const isSelected = parseFloat(String(distanciaNM)) === r.distanciaNM;
                return (
                  <button
                    key={r.nombre}
                    type="button"
                    onClick={() => setDistanciaNM(r.distanciaNM)}
                    className={`px-2.5 py-1 rounded-lg font-semibold shrink-0 transition-all cursor-pointer border ${
                      isSelected
                        ? 'bg-sky-600 text-white border-sky-600 shadow-2xs'
                        : 'bg-white dark:bg-slate-800 hover:bg-sky-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                    }`}
                  >
                    <span>{r.nombre}</span>
                    <span className={`ml-1 text-[10px] ${isSelected ? 'text-sky-100' : 'text-slate-400'}`}>
                      {r.distanciaNM} NM
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Fila 3: Tipo de Reserva Regulatoria */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                Reserva Obligatoria de Combustible (Reglamentación Aeronáutica)
              </span>
              <span className="text-[10px] text-slate-500">
                Minutos requeridos: <strong>+{minutosReserva} min</strong>
              </span>
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <button
                type="button"
                onClick={() => setReservaTipo('vfr_dia')}
                className={`p-2 rounded-xl text-left border transition-all cursor-pointer ${
                  reservaTipo === 'vfr_dia'
                    ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-500 text-emerald-900 dark:text-emerald-200 shadow-2xs ring-1 ring-emerald-500'
                    : 'bg-white dark:bg-slate-800/80 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-slate-300'
                }`}
              >
                <div className="font-bold text-xs">VFR Día (+30 min)</div>
                <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">Vuelo diurno</div>
              </button>

              <button
                type="button"
                onClick={() => setReservaTipo('vfr_noche')}
                className={`p-2 rounded-xl text-left border transition-all cursor-pointer ${
                  reservaTipo === 'vfr_noche'
                    ? 'bg-indigo-50 dark:bg-indigo-950/40 border-indigo-500 text-indigo-900 dark:text-indigo-200 shadow-2xs ring-1 ring-indigo-500'
                    : 'bg-white dark:bg-slate-800/80 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-slate-300'
                }`}
              >
                <div className="font-bold text-xs">VFR Noche (+45 min)</div>
                <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">Travesía nocturna</div>
              </button>

              <button
                type="button"
                onClick={() => setReservaTipo('ifr')}
                className={`p-2 rounded-xl text-left border transition-all cursor-pointer ${
                  reservaTipo === 'ifr'
                    ? 'bg-purple-50 dark:bg-purple-950/40 border-purple-500 text-purple-900 dark:text-purple-200 shadow-2xs ring-1 ring-purple-500'
                    : 'bg-white dark:bg-slate-800/80 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-slate-300'
                }`}
              >
                <div className="font-bold text-xs">IFR (+60 min)</div>
                <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">45m + Alterno</div>
              </button>

              <button
                type="button"
                onClick={() => setReservaTipo('ninguna')}
                className={`p-2 rounded-xl text-left border transition-all cursor-pointer ${
                  reservaTipo === 'ninguna'
                    ? 'bg-slate-100 dark:bg-slate-800 border-slate-400 text-slate-900 dark:text-slate-200 shadow-2xs ring-1 ring-slate-400'
                    : 'bg-white dark:bg-slate-800/80 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-slate-300'
                }`}
              >
                <div className="font-bold text-xs">Solo en Ruta (0m)</div>
                <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">Sin reserva adicional</div>
              </button>
            </div>
          </div>

          {/* Fila 4: Tarjetas de Resultados y Desglose Visual */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-3.5 pt-1">
            {/* Desglose Detallado */}
            <div className="md:col-span-7 bg-slate-50 dark:bg-slate-800/60 rounded-xl p-3.5 border border-slate-200 dark:border-slate-800 space-y-2.5">
              <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center justify-between">
                <span>Desglose de Combustible Calculado</span>
                <span className="text-[11px] text-slate-500 font-normal">
                  Tiempo en Ruta (ETE): <strong className="text-sky-700 dark:text-sky-300">{calculations.tiempoRutaTexto}</strong>
                </span>
              </h4>

              <div className="space-y-1.5 text-xs">
                {/* Combustible en Ruta */}
                <div className="flex items-center justify-between p-2 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700">
                  <span className="text-slate-600 dark:text-slate-400">
                    En Ruta ({distanciaNM} NM @ {velocidadCrucero} KTAS):
                  </span>
                  <span className="font-bold text-slate-900 dark:text-slate-100">
                    {calculations.combustibleRutaGal.toFixed(2)} Gal
                  </span>
                </div>

                {/* Combustible Reserva */}
                <div className="flex items-center justify-between p-2 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700">
                  <span className="text-slate-600 dark:text-slate-400">
                    Reserva Reglamentaria ({minutosReserva} min @ {consumoGPH} GPH):
                  </span>
                  <span className="font-bold text-emerald-600 dark:text-emerald-400">
                    +{calculations.combustibleReservaGal.toFixed(2)} Gal
                  </span>
                </div>

                {/* Taxi & Rodaje */}
                <div className="flex items-center justify-between p-2 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700">
                  <span className="text-slate-600 dark:text-slate-400">
                    Rodaje y Prueba de Motor (Taxi / Run-up):
                  </span>
                  <span className="font-bold text-slate-700 dark:text-slate-300">
                    +{calculations.taxiGal.toFixed(2)} Gal
                  </span>
                </div>
              </div>

              {/* Barra de Capacidad del Tanque */}
              <div className="pt-1">
                <div className="flex justify-between text-[11px] text-slate-600 dark:text-slate-400 mb-1">
                  <span>Uso del Tanque ({activeProfile.matricula})</span>
                  <span className={calculations.excedeCapacidad ? 'font-bold text-rose-600' : 'font-semibold'}>
                    {calculations.combustibleTotalGal.toFixed(1)} de {activeProfile.capacidadUtilGal} Gal ({calculations.porcentajeCapacidad.toFixed(0)}%)
                  </span>
                </div>
                <div className="w-full h-2.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                  <div
                    className={`h-full transition-all duration-300 ${
                      calculations.excedeCapacidad
                        ? 'bg-rose-500'
                        : calculations.porcentajeCapacidad > 80
                        ? 'bg-amber-500'
                        : 'bg-emerald-500'
                    }`}
                    style={{ width: `${Math.min(100, calculations.porcentajeCapacidad)}%` }}
                  />
                </div>
                {calculations.excedeCapacidad ? (
                  <div className="flex items-center gap-1 text-[11px] text-rose-600 dark:text-rose-400 mt-1 font-bold">
                    <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                    <span>¡Alerta! La distancia excede la capacidad útil de combustible. Se requiere escala técnica.</span>
                  </div>
                ) : (
                  <div className="flex items-center justify-between text-[10px] text-slate-500 mt-1">
                    <span>Remanente en tanques: <strong>{calculations.combustibleRemanenteGal.toFixed(1)} Gal</strong></span>
                    <span>Autonomía máxima: <strong>{calculations.autonomiaTotalHoras.toFixed(1)} hrs</strong></span>
                  </div>
                )}
              </div>
            </div>

            {/* Display Principal del Combustible Requerido */}
            <div className={`md:col-span-5 rounded-xl p-4 border flex flex-col justify-between ${
              calculations.excedeCapacidad
                ? 'bg-rose-50 dark:bg-rose-950/40 border-rose-300 dark:border-rose-800 text-rose-900 dark:text-rose-100'
                : 'bg-linear-to-br from-sky-50 via-white to-indigo-50/70 dark:from-slate-800 dark:via-slate-800 dark:to-indigo-950/30 border-sky-300 dark:border-sky-800'
            }`}>
              <div>
                <div className="flex items-center justify-between pb-2 border-b border-sky-200 dark:border-slate-700">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-sky-900 dark:text-sky-300 flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-sky-600 dark:text-sky-400" />
                    Combustible Mínimo para Despacho
                  </span>
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-sky-200 dark:bg-sky-900/80 text-sky-800 dark:text-sky-200">
                    AVGAS 100LL
                  </span>
                </div>

                <div className="my-3 text-center">
                  <div className="text-3xl sm:text-4xl font-black text-sky-950 dark:text-white tracking-tight">
                    {calculations.combustibleTotalGal.toFixed(1)}
                    <span className="text-base sm:text-lg font-bold text-sky-700 dark:text-sky-400 ml-1.5">
                      US Gal
                    </span>
                  </div>

                  <div className="flex items-center justify-center gap-3 mt-2 text-xs font-semibold text-slate-600 dark:text-slate-300">
                    <span className="flex items-center gap-1">
                      <Fuel className="w-3.5 h-3.5 text-amber-500" />
                      {calculations.combustibleLitros.toFixed(1)} Litros
                    </span>
                    <span>•</span>
                    <span className="flex items-center gap-1">
                      <Scale className="w-3.5 h-3.5 text-indigo-500" />
                      {calculations.pesoLibras.toFixed(1)} Lbs (W&B)
                    </span>
                  </div>
                </div>
              </div>

              <div className="space-y-2 pt-2 border-t border-sky-200/80 dark:border-slate-700">
                <button
                  type="button"
                  onClick={handleCopySummary}
                  className="w-full py-2 px-3 bg-sky-600 hover:bg-sky-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  {copiado ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-300" />
                      <span>¡Copiado para Plan de Vuelo!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Copiar Desglose para Despacho</span>
                    </>
                  )}
                </button>

                <p className="text-[10px] text-center text-slate-500 dark:text-slate-400">
                  Aplica para planificación pre-vuelo de {currentUser.rol === 'estudiante' ? 'Alumnos Piloto' : 'Instructores CFI'}.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
