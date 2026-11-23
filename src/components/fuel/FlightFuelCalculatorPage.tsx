import React from 'react';
import { User } from '../../types';
import { FlightFuelCalculatorWidget } from '../FlightFuelCalculatorWidget';
import {
  Fuel,
  Plane,
  Gauge,
  Navigation,
  Clock,
  ShieldCheck,
  Compass,
  AlertTriangle,
  FileSpreadsheet
} from 'lucide-react';
import { OFFICIAL_FLEET } from '../AircraftLogbookModule';

interface FlightFuelCalculatorPageProps {
  currentUser: User;
}

export const FlightFuelCalculatorPage: React.FC<FlightFuelCalculatorPageProps> = ({
  currentUser
}) => {
  return (
    <div id="fuel-calculator-page" className="space-y-6">
      {/* 1. HERO HEADER */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 sm:p-7 text-white shadow-xl relative overflow-hidden">
        {/* Ambient Glow */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 max-w-3xl">
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
            Calculadora de Combustible de Navegación
          </h1>
        </div>

        {/* Quick Fleet Reference strip */}
        <div className="mt-5 pt-4 border-t border-slate-800/80 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
          <div className="bg-slate-950/50 p-2.5 rounded-xl border border-slate-800/60">
            <span className="text-[10px] text-slate-400 block font-medium">Densidad AVGAS 100LL</span>
            <span className="text-sm font-black text-amber-400">6.0 lbs / US Gal</span>
          </div>

          <div className="bg-slate-950/50 p-2.5 rounded-xl border border-slate-800/60">
            <span className="text-[10px] text-slate-400 block font-medium">Factor Litros a Galón</span>
            <span className="text-sm font-mono font-bold text-slate-200">1 Gal = 3.785 L</span>
          </div>

          <div className="bg-slate-950/50 p-2.5 rounded-xl border border-slate-800/60">
            <span className="text-[10px] text-slate-400 block font-medium">Reserva VFR Día</span>
            <span className="text-sm font-bold text-emerald-400">30 Minutos (RAC 91)</span>
          </div>

          <div className="bg-slate-950/50 p-2.5 rounded-xl border border-slate-800/60">
            <span className="text-[10px] text-slate-400 block font-medium">Reserva IFR / Noche</span>
            <span className="text-sm font-bold text-sky-400">45 Minutos + Alterno</span>
          </div>
        </div>
      </div>

      {/* 2. CORE FUEL CALCULATOR ENGINE WIDGET */}
      <FlightFuelCalculatorWidget currentUser={currentUser} />
    </div>
  );
};
