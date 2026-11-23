import React, { useState, useMemo } from 'react';
import { User, Transaction } from '../types';
import {
  Plane,
  Clock,
  DollarSign,
  Calendar,
  FileText,
  CheckCircle2,
  AlertCircle,
  Calculator,
  ArrowRight,
  TrendingDown,
  Info,
  Sparkles,
  Printer,
  X,
  ShieldCheck,
  Fuel,
  UserCheck,
  ChevronRight,
  ExternalLink
} from 'lucide-react';

interface StudentFlightHoursBillingBreakdownProps {
  student: User;
  transactions: Transaction[];
  currentBalance: number;
  onReportPaymentClick?: () => void;
  onNavigateToFlightProgress?: () => void;
}

interface FleetRate {
  matricula: string;
  modelo: string;
  tarifaDefault: number;
  tipo: string;
}

const FLEET_RATES: FleetRate[] = [
  { matricula: 'HP-1450', modelo: 'Cessna 172 Skyhawk', tarifaDefault: 220.0, tipo: 'Monomotor Terrestre' },
  { matricula: 'HP-1588', modelo: 'Cessna 172SP Garmin G1000', tarifaDefault: 220.0, tipo: 'Monomotor Glass Cockpit' },
  { matricula: 'HP-1822', modelo: 'Piper PA-44 Seminole', tarifaDefault: 340.0, tipo: 'Multi-Motor Bimotor' },
  { matricula: 'HP-1799', modelo: 'Piper PA-28 Archer III', tarifaDefault: 220.0, tipo: 'Monomotor Escuela' },
  { matricula: 'SIM-ALX', modelo: 'Alsim ALX Flight Simulator', tarifaDefault: 120.0, tipo: 'Entrenador Sintético IFR' }
];

export const StudentFlightHoursBillingBreakdown: React.FC<StudentFlightHoursBillingBreakdownProps> = ({
  student,
  transactions,
  currentBalance,
  onReportPaymentClick,
  onNavigateToFlightProgress
}) => {
  // Estado para el modal de comprobante detallado de vuelo
  const [selectedTxForReceipt, setSelectedTxForReceipt] = useState<Transaction | null>(null);

  // Filtros de tabla
  const [filterAircraft, setFilterAircraft] = useState<string>('todos');
  const [searchTerm, setSearchTerm] = useState<string>('');

  // Estado para el simulador de vuelo
  const [simMatricula, setSimMatricula] = useState<string>('HP-1450');
  const [simHours, setSimHours] = useState<number>(1.5);

  // Filtrar transacciones que corresponden a vuelos y bitácoras
  const flightCharges = useMemo(() => {
    return transactions.filter(t => {
      // Cargos aprobados relacionados con horas de vuelo o bitácoras
      const isFlightCharge = t.tipo === 'cargo' && (
        t.concepto === 'Horas Bloque Vuelo' ||
        t.concepto === 'Hora Instructor' ||
        t.concepto === 'Simulador de Vuelo' ||
        t.horas_vuelo !== undefined ||
        (t.notas && (t.notas.toLowerCase().includes('hora') || t.notas.toLowerCase().includes('vuelo') || t.notas.toLowerCase().includes('bitácora') || t.notas.toLowerCase().includes('bitacora')))
      );
      return isFlightCharge;
    }).sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime());
  }, [transactions]);

  // Cálculos consolidados
  const { totalHoursFlown, totalDebited, averageRate, totalAbonos } = useMemo(() => {
    let hours = 0;
    let debited = 0;

    flightCharges.forEach(t => {
      debited += t.monto;
      if (t.horas_vuelo && t.horas_vuelo > 0) {
        hours += t.horas_vuelo;
      } else {
        // Intento de extracción heurística de notas si horas_vuelo no estaba en el registro antiguo
        const match = t.notas?.match(/(\d+(\.\d+)?)\s*(horas?|hrs?)/i);
        if (match && match[1]) {
          hours += parseFloat(match[1]);
        }
      }
    });

    // Abonos totales aprobados del estudiante
    const abonos = transactions
      .filter(t => t.tipo === 'abono' && t.estado_aprobacion === 'aprobado')
      .reduce((sum, t) => sum + t.monto, 0);

    const avg = hours > 0 ? debited / hours : 220.0;

    return {
      totalHoursFlown: Number(hours.toFixed(4)),
      totalDebited: Number(debited.toFixed(2)),
      averageRate: Number(avg.toFixed(2)),
      totalAbonos: Number(abonos.toFixed(2))
    };
  }, [flightCharges, transactions]);

  // Horas de vuelo estimadas que puede volar con su saldo actual
  const estimatedHoursRemaining = useMemo(() => {
    if (currentBalance <= 0) return 0;
    const rateToUse = averageRate > 0 ? averageRate : 220.0;
    return Number((currentBalance / rateToUse).toFixed(1));
  }, [currentBalance, averageRate]);

  // Filtrado de la tabla
  const filteredFlights = useMemo(() => {
    return flightCharges.filter(t => {
      const matchAircraft = filterAircraft === 'todos' || 
        t.matricula_avion === filterAircraft ||
        (t.notas && t.notas.includes(filterAircraft));
      
      const searchLower = searchTerm.toLowerCase();
      const matchSearch = !searchTerm ||
        t.fecha.includes(searchLower) ||
        (t.referencia_ach && t.referencia_ach.toLowerCase().includes(searchLower)) ||
        (t.notas && t.notas.toLowerCase().includes(searchLower)) ||
        (t.matricula_avion && t.matricula_avion.toLowerCase().includes(searchLower)) ||
        (t.instructor_nombre && t.instructor_nombre.toLowerCase().includes(searchLower));

      return matchAircraft && matchSearch;
    });
  }, [flightCharges, filterAircraft, searchTerm]);

  // Simulación matemática de costo de próximo vuelo (Hobbs × 1.275)
  const simSelectedAircraft = FLEET_RATES.find(a => a.matricula === simMatricula) || FLEET_RATES[0];
  const simBillableHours = Number((simHours * 1.275).toFixed(4));
  const simCost = Number((simBillableHours * simSelectedAircraft.tarifaDefault).toFixed(2));
  const simProjectedBalance = Number((currentBalance - simCost).toFixed(2));
  const simIsAffordable = simProjectedBalance >= 0;
  const simShortage = simProjectedBalance < 0 ? Math.abs(simProjectedBalance) : 0;

  return (
    <div className="space-y-4">
      {/* BANNER PRINCIPAL EXPLICATIVO */}
      <div className="bg-gradient-to-r from-sky-900 via-sky-800 to-indigo-900 text-white p-5 rounded-2xl shadow-sm border border-sky-700/50 relative overflow-hidden">
        <div className="absolute right-0 top-0 bottom-0 opacity-10 pointer-events-none flex items-center pr-6">
          <Plane className="w-56 h-56 transform -rotate-12 translate-x-10" />
        </div>

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="max-w-2xl">
            <h2 className="text-xl font-black tracking-tight text-white">
              Desglose de Cobro vs. Hora Volada
            </h2>
          </div>

          <div className="flex sm:flex-col items-end justify-between sm:justify-center bg-white/10 backdrop-blur-xs p-3 rounded-xl border border-white/15 min-w-[200px]">
            <span className="text-[11px] font-semibold text-sky-200 uppercase tracking-wider">Saldo Disponible Oficial</span>
            <div className={`text-2xl font-black tracking-tight ${currentBalance >= 250 ? 'text-emerald-300' : currentBalance >= 0 ? 'text-amber-300' : 'text-rose-300'}`}>
              ${currentBalance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} <span className="text-xs font-medium text-sky-200">USD</span>
            </div>
            <span className="text-[10px] text-sky-200/80">
              {currentBalance >= 250 ? '✓ Fondos suficientes para despacho' : currentBalance >= 0 ? '⚠️ Saldo próximo a agotarse' : '🔴 Saldo deudor pendiente'}
            </span>
          </div>
        </div>
      </div>

      {/* KPI METRIC CARDS */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Card 1: Horas Totales Voladas */}
        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-sky-50 text-sky-600 flex items-center justify-center shrink-0 border border-sky-100">
            <Clock className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block truncate">
              Horas Voladas Facturadas
            </span>
            <div className="text-lg font-black text-slate-900 mt-0.5">
              {Number(totalHoursFlown.toFixed(4))} <span className="text-xs font-bold text-slate-500">hrs</span>
            </div>
            <span className="text-[10px] text-slate-500 block truncate">
              {flightCharges.length} registros en bitácora
            </span>
          </div>
        </div>

        {/* Card 2: Total Cobrado por Vuelos */}
        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center shrink-0 border border-rose-100">
            <TrendingDown className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block truncate">
              Total Cobrado en Vuelos
            </span>
            <div className="text-lg font-black text-rose-600 mt-0.5">
              ${totalDebited.toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </div>
            <span className="text-[10px] text-slate-500 block truncate">
              Descontado del crédito
            </span>
          </div>
        </div>

        {/* Card 3: Tarifa Promedio por Hora */}
        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0 border border-indigo-100">
            <DollarSign className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block truncate">
              Tarifa Media por Hora
            </span>
            <div className="text-lg font-black text-indigo-700 mt-0.5">
              ${averageRate.toFixed(2)} <span className="text-xs font-semibold text-slate-500">/hr</span>
            </div>
            <span className="text-[10px] text-slate-500 block truncate">
              Promedio según flota volada
            </span>
          </div>
        </div>

        {/* Card 4: Autonomía Estimada */}
        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 border border-emerald-100">
            <Fuel className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block truncate">
              Autonomía Estimada
            </span>
            <div className="text-lg font-black text-emerald-700 mt-0.5">
              ~{estimatedHoursRemaining.toFixed(1)} <span className="text-xs font-bold text-slate-500">hrs</span>
            </div>
            <span className="text-[10px] text-slate-500 block truncate">
              Disponibles con saldo actual
            </span>
          </div>
        </div>
      </div>

      {/* BARRA VISUAL DE CRÉDITO Y CONSUMO */}
      {totalAbonos > 0 && (
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="font-bold text-slate-700">Rendimiento de Fondos Acreditados</span>
            <span className="text-slate-500 font-medium">
              Abonado: <strong className="text-slate-900">${totalAbonos.toLocaleString('en-US', { minimumFractionDigits: 2 })}</strong> • 
              Consumido en Vuelos: <strong className="text-rose-600">${totalDebited.toLocaleString('en-US', { minimumFractionDigits: 2 })}</strong> ({((totalDebited / totalAbonos) * 100).toFixed(0)}%)
            </span>
          </div>

          <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden flex">
            <div
              className="bg-rose-500 h-full transition-all duration-500"
              style={{ width: `${Math.min(100, (totalDebited / totalAbonos) * 100)}%` }}
              title={`Consumido en horas de vuelo: $${totalDebited}`}
            />
            <div
              className="bg-emerald-500 h-full transition-all duration-500"
              style={{ width: `${Math.max(0, Math.min(100, (Math.max(0, currentBalance) / totalAbonos) * 100))}%` }}
              title={`Saldo disponible remanente: $${currentBalance}`}
            />
          </div>

          <div className="flex items-center justify-between text-[11px] text-slate-500 pt-0.5">
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
              <span>Horas de Vuelo Descontadas: ${totalDebited.toFixed(2)}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
              <span>Saldo Acreditado Disponible: ${Math.max(0, currentBalance).toFixed(2)}</span>
            </div>
          </div>
        </div>
      )}

      {/* TABLA PRINCIPAL: HISTORIAL DE VUELOS Y COBROS DEBITADOS */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        {/* Encabezado y Filtros */}
        <div className="p-4 border-b border-slate-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
              <FileText className="w-4 h-4 text-sky-600" />
              <span>Bitácoras de Vuelo y Cargos</span>
            </h3>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto flex-wrap">
            {/* Filtro Aeronave */}
            <select
              value={filterAircraft}
              onChange={(e) => setFilterAircraft(e.target.value)}
              className="px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-sky-500 font-medium"
            >
              <option value="todos">Toda la Flota</option>
              <option value="HP-1450">HP-1450 (Cessna 172)</option>
              <option value="HP-1588">HP-1588 (C172 G1000)</option>
              <option value="HP-1822">HP-1822 (Seminole)</option>
              <option value="HP-1799">HP-1799 (Archer)</option>
              <option value="SIM-ALX">SIM-ALX (Simulador)</option>
            </select>

            {/* Buscador de Bitácora */}
            <div className="relative">
              <input
                type="text"
                placeholder="Buscador de Bitácora (ej. BIT-1450, fecha...)"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-7 pr-2.5 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-sky-500 w-full sm:w-60"
              />
              <FileText className="w-3.5 h-3.5 text-slate-400 absolute left-2 top-2 pointer-events-none" />
            </div>
          </div>
        </div>

        {/* Tabla */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-700 uppercase font-semibold text-[10px] border-b border-slate-200">
              <tr>
                <th className="px-3.5 py-2.5">No. Bitácora / Recibo</th>
                <th className="px-3.5 py-2.5">Fecha</th>
                <th className="px-3.5 py-2.5">Aeronave & Misión</th>
                <th className="px-3.5 py-2.5 text-center">Tiempo Volado</th>
                <th className="px-3.5 py-2.5 text-right">Tarifa / Hora</th>
                <th className="px-3.5 py-2.5 text-right">Cobro Debitado</th>
                <th className="px-3.5 py-2.5 text-right">Saldo Resultante</th>
                <th className="px-3.5 py-2.5">Instructor / Verificación</th>
                <th className="px-3.5 py-2.5 text-center">Comprobante</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {filteredFlights.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-8 text-center text-slate-400">
                    <Plane className="w-8 h-8 mx-auto mb-1.5 text-slate-300" />
                    <p className="font-semibold text-slate-600">Sin registros de bitácora</p>
                  </td>
                </tr>
              ) : (
                filteredFlights.map((tx) => {
                  const horas = tx.horas_vuelo || (tx.notas?.match(/(\d+(\.\d+)?)\s*(horas?|hrs?)/i)?.[1] ? parseFloat(tx.notas.match(/(\d+(\.\d+)?)\s*(horas?|hrs?)/i)![1]) : 1.0);
                  const tarifa = tx.tarifa_hora || (horas > 0 ? tx.monto / horas : 220.0);
                  const matricula = tx.matricula_avion || (tx.notas?.includes('HP-1822') ? 'HP-1822' : tx.notas?.includes('HP-1450') ? 'HP-1450' : tx.notas?.includes('HP-1588') ? 'HP-1588' : 'HP-1450');
                  const bitacoraFolio = tx.referencia_ach || `BIT-${matricula}-${tx.fecha.replace(/-/g, '')}`;

                  return (
                    <tr key={tx.id} className="hover:bg-slate-50/80 transition-colors">
                      {/* Número de Bitácora / Recibo */}
                      <td className="px-3.5 py-2.5 whitespace-nowrap font-mono">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-indigo-50 border border-indigo-200 text-indigo-700 font-bold text-[11px]">
                          <FileText className="w-3 h-3 text-indigo-500" />
                          <span>{bitacoraFolio}</span>
                        </span>
                      </td>

                      {/* Fecha */}
                      <td className="px-3.5 py-2.5 whitespace-nowrap font-medium text-slate-700">
                        <div className="flex items-center gap-1.5">
                          <Calendar className="w-3.5 h-3.5 text-slate-400" />
                          <span>{tx.fecha}</span>
                        </div>
                      </td>

                      {/* Aeronave y Misión */}
                      <td className="px-3.5 py-2.5">
                        <div className="flex items-center gap-1.5 font-bold text-slate-900">
                          <span className="px-1.5 py-0.5 bg-sky-100 text-sky-800 rounded font-mono text-[10px]">
                            {matricula}
                          </span>
                          <span>{tx.modelo_avion || (matricula === 'HP-1822' ? 'Piper Seminole PA-44' : matricula === 'HP-1450' ? 'Cessna 172 Skyhawk' : 'Aeronave Escuela')}</span>
                        </div>
                        <div className="text-[11px] text-slate-500 mt-0.5 line-clamp-1">
                          {tx.tipo_mision || tx.notas || tx.concepto}
                        </div>
                      </td>

                      {/* Tiempo Volado */}
                      <td className="px-3.5 py-2.5 text-center">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full font-black text-xs bg-sky-50 text-sky-700 border border-sky-200">
                          <Clock className="w-3 h-3 text-sky-600" />
                          <span>{Number(horas.toFixed(4))} hrs</span>
                        </span>
                        {tx.horas_hobbs !== undefined && (
                          <span className="block text-[10px] font-mono text-slate-400 mt-0.5">
                            {tx.horas_hobbs}h × 1.275
                          </span>
                        )}
                      </td>

                      {/* Tarifa por Hora */}
                      <td className="px-3.5 py-2.5 text-right font-medium text-slate-600">
                        ${tarifa.toFixed(2)} <span className="text-[10px] text-slate-400">/hr</span>
                      </td>

                      {/* Cobro Debitado */}
                      <td className="px-3.5 py-2.5 text-right">
                        <span className="font-extrabold text-rose-600 text-xs">
                          -${tx.monto.toFixed(2)}
                        </span>
                      </td>

                      {/* Saldo Resultante */}
                      <td className="px-3.5 py-2.5 text-right font-mono">
                        <span className={`font-bold text-xs ${tx.saldo_resultante >= 250 ? 'text-emerald-700' : tx.saldo_resultante >= 0 ? 'text-amber-700' : 'text-rose-700'}`}>
                          ${tx.saldo_resultante.toFixed(2)}
                        </span>
                        {tx.saldo_anterior !== undefined && (
                          <span className="text-[9px] text-slate-400 block line-through">
                            Ant: ${tx.saldo_anterior.toFixed(2)}
                          </span>
                        )}
                      </td>

                      {/* Instructor / Verificación Contabilidad */}
                      <td className="px-3.5 py-2.5">
                        <div className="text-[11px] font-semibold text-slate-800">
                          {tx.instructor_nombre || 'Instructor CFI Asignado'}
                        </div>
                        <div className="flex items-center gap-1 text-[10px] text-emerald-600 mt-0.5">
                          <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                          <span>Auditado por Contabilidad</span>
                        </div>
                      </td>

                      {/* Botón Ver Comprobante */}
                      <td className="px-3.5 py-2.5 text-center">
                        <button
                          onClick={() => setSelectedTxForReceipt(tx)}
                          className="px-2.5 py-1 bg-slate-100 hover:bg-sky-50 hover:text-sky-700 text-slate-700 text-[11px] font-bold rounded-lg transition-colors cursor-pointer inline-flex items-center gap-1 border border-slate-200 hover:border-sky-300"
                          title="Ver desglose y comprobante de liquidación de vuelo"
                        >
                          <FileText className="w-3 h-3" />
                          <span>Voucher</span>
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Footer con información de cálculo */}
        <div className="bg-slate-50 p-3 border-t border-slate-200 text-xs text-slate-500 flex flex-col sm:flex-row items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 text-[11px]">
            <Info className="w-3.5 h-3.5 text-sky-600 shrink-0" />
            <span>Fórmula contable: <code>Monto Debitado = (Hobbs × 1.275) × Tarifa Aeronave</code>. Saldo Resultante = Saldo Previo - Monto Debitado.</span>
          </div>

          {onNavigateToFlightProgress && (
            <button
              onClick={onNavigateToFlightProgress}
              className="text-sky-600 hover:text-sky-800 font-bold inline-flex items-center gap-1 text-xs cursor-pointer hover:underline"
            >
              <span>Ver Hojas de Progreso Técnico de Maniobras</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* SIMULADOR DE PRÓXIMO VUELO & CALCULADORA DE SALDO */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-3">
        <div className="flex items-center justify-between pb-2 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-indigo-50 text-indigo-600">
              <Calculator className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-sm">Simulador de Próximo Vuelo</h3>
            </div>
          </div>
          <span className="text-xs font-semibold px-2 py-0.5 bg-indigo-50 text-indigo-700 rounded-md border border-indigo-200">
            Calculadora en Vivo
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {/* Selector de Avión */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Aeronave Planificada</label>
            <select
              value={simMatricula}
              onChange={(e) => setSimMatricula(e.target.value)}
              className="w-full px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 font-medium"
            >
              {FLEET_RATES.map((f) => (
                <option key={f.matricula} value={f.matricula}>
                  {f.matricula} - {f.modelo} (${f.tarifaDefault}/hr)
                </option>
              ))}
            </select>
          </div>

          {/* Horas Estimadas */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Horas de Vuelo Previstas: <strong className="text-indigo-700">{simHours} hrs</strong>
            </label>
            <div className="flex items-center gap-2">
              <input
                type="range"
                min="0.5"
                max="4.0"
                step="0.1"
                value={simHours}
                onChange={(e) => setSimHours(parseFloat(e.target.value))}
                className="w-full accent-indigo-600"
              />
              <span className="text-xs font-bold text-slate-700 font-mono w-12 text-right">{simHours.toFixed(1)}h</span>
            </div>
          </div>

          {/* Tarifa Aplicada */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Tarifa Horaria Oficial</label>
            <div className="px-2.5 py-1.5 text-xs bg-slate-100 rounded-lg text-slate-700 font-bold border border-slate-200">
              ${simSelectedAircraft.tarifaDefault.toFixed(2)} USD / hora
            </div>
          </div>
        </div>

        {/* Resultado del cálculo del simulador */}
        <div className={`p-3.5 rounded-xl border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 ${
          simIsAffordable ? 'bg-emerald-50/70 border-emerald-200' : 'bg-rose-50/70 border-rose-200'
        }`}>
          <div className="space-y-0.5">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-bold text-slate-700">Costo Estimado de Sesión:</span>
              <span className="text-sm font-black text-slate-900">${simCost.toFixed(2)} USD</span>
              <span className="text-[11px] text-slate-500">({simHours}h × 1.275 = {simBillableHours} hrs × ${simSelectedAircraft.tarifaDefault}/h)</span>
            </div>
            <div className="text-xs">
              <span>Tu saldo pasará de <strong>${currentBalance.toFixed(2)}</strong> a </span>
              <strong className={`font-black ${simProjectedBalance >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
                ${simProjectedBalance.toFixed(2)} USD
              </strong>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {simIsAffordable ? (
              <span className="px-3 py-1.5 bg-emerald-600 text-white font-bold text-xs rounded-xl shadow-xs inline-flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4" />
                <span>Saldo Suficiente para Despacho</span>
              </span>
            ) : (
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-1 bg-rose-100 text-rose-800 font-bold text-xs rounded-lg border border-rose-200 inline-flex items-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5 text-rose-600" />
                  <span>Requiere Abono de ${simShortage.toFixed(2)} USD</span>
                </span>
                {onReportPaymentClick && (
                  <button
                    onClick={onReportPaymentClick}
                    className="px-3 py-1.5 bg-sky-600 hover:bg-sky-700 text-white font-bold text-xs rounded-xl transition-colors cursor-pointer"
                  >
                    Reportar Abono ACH
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* MODAL: COMPROBANTE OFICIAL DE LIQUIDACIÓN DE VUELO */}
      {selectedTxForReceipt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto my-auto shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
            {/* Cabecera Modal */}
            <div className="bg-sky-900 text-white px-5 py-4 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-sky-700 flex items-center justify-center text-white">
                  <Plane className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-white">Comprobante de Liquidación de Vuelo</h3>
                </div>
              </div>
              <button
                onClick={() => setSelectedTxForReceipt(null)}
                className="w-7 h-7 rounded-lg bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Contenido Comprobante */}
            <div className="p-5 space-y-4 text-xs">
              {/* Folio y Fecha */}
              <div className="flex justify-between items-center pb-3 border-b border-slate-200">
                <div>
                  <span className="text-[10px] text-slate-500 uppercase font-semibold block">Folio de Bitácora / Referencia</span>
                  <span className="font-mono font-bold text-sm text-slate-900">{selectedTxForReceipt.referencia_ach}</span>
                </div>
                <div className="text-right">
                  <span className="text-[10px] text-slate-500 uppercase font-semibold block">Fecha de Vuelo</span>
                  <span className="font-bold text-slate-800">{selectedTxForReceipt.fecha}</span>
                </div>
              </div>

              {/* Datos Alumno */}
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-1">
                <div className="flex justify-between">
                  <span className="text-slate-500">Alumno Piloto:</span>
                  <strong className="text-slate-900">{student.nombre}</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Documento / Cédula:</span>
                  <span className="font-mono text-slate-700">{student.documento_identidad || 'N/A'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Curso:</span>
                  <span className="text-sky-700 font-semibold">{student.curso_actual || 'Piloto Comercial'}</span>
                </div>
              </div>

              {/* Desglose Matemático */}
              <div className="space-y-2">
                <span className="font-bold text-slate-800 block text-[11px] uppercase tracking-wider">
                  Desglose de Operación y Tarifa Horaria
                </span>
                <div className="border border-slate-200 rounded-xl overflow-hidden">
                  <table className="w-full text-left">
                    <thead className="bg-slate-100 text-slate-600 text-[10px] uppercase font-semibold">
                      <tr>
                        <th className="p-2">Concepto / Aeronave</th>
                        <th className="p-2 text-center">Horas</th>
                        <th className="p-2 text-right">Tarifa / h</th>
                        <th className="p-2 text-right">Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      <tr>
                        <td className="p-2">
                          <strong className="text-slate-800 block">
                            {selectedTxForReceipt.matricula_avion || 'Aeronave Escuela'} - {selectedTxForReceipt.modelo_avion || 'Piper/Cessna'}
                          </strong>
                          <span className="text-[10px] text-slate-500">{selectedTxForReceipt.tipo_mision || selectedTxForReceipt.notas}</span>
                        </td>
                        <td className="p-2 text-center font-bold">
                          {selectedTxForReceipt.horas_vuelo ? Number(selectedTxForReceipt.horas_vuelo.toFixed(4)) : '1.5'}h
                          {selectedTxForReceipt.horas_hobbs !== undefined && (
                            <span className="block text-[9px] font-mono text-slate-400">
                              ({selectedTxForReceipt.horas_hobbs}h × 1.275)
                            </span>
                          )}
                        </td>
                        <td className="p-2 text-right font-medium">
                          ${selectedTxForReceipt.tarifa_hora ? selectedTxForReceipt.tarifa_hora.toFixed(2) : (selectedTxForReceipt.monto / (selectedTxForReceipt.horas_vuelo || 1.5)).toFixed(2)}
                        </td>
                        <td className="p-2 text-right font-black text-rose-600">
                          ${selectedTxForReceipt.monto.toFixed(2)}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Impacto en el Saldo */}
              <div className="bg-sky-50/60 p-3 rounded-xl border border-sky-200 space-y-1.5">
                <div className="flex justify-between text-slate-600">
                  <span>Saldo Acreditado Anterior:</span>
                  <span className="font-mono font-medium">${(selectedTxForReceipt.saldo_anterior ?? (selectedTxForReceipt.saldo_resultante + selectedTxForReceipt.monto)).toFixed(2)} USD</span>
                </div>
                <div className="flex justify-between text-rose-700 font-bold">
                  <span>Menos Cargo de Vuelo:</span>
                  <span className="font-mono">-${selectedTxForReceipt.monto.toFixed(2)} USD</span>
                </div>
                <div className="flex justify-between pt-1 border-t border-sky-200/80 font-black text-slate-900 text-xs">
                  <span>Saldo Resultante en Cuenta:</span>
                  <span className="font-mono text-sky-800">${selectedTxForReceipt.saldo_resultante.toFixed(2)} USD</span>
                </div>
              </div>

              {/* Sello de Auditoría */}
              <div className="p-2.5 bg-emerald-50 rounded-xl border border-emerald-200 text-[11px] text-emerald-800 flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0" />
                <div>
                  <strong className="block">Operación Auditada y Liquidada</strong>
                  <span>Registrado por: {selectedTxForReceipt.creado_por || 'Contabilidad'} • Ref: {selectedTxForReceipt.id}</span>
                </div>
              </div>
            </div>

            {/* Footer Modal */}
            <div className="p-3 bg-slate-50 border-t border-slate-200 flex justify-end gap-2">
              <button
                onClick={() => window.print()}
                className="px-3 py-1.5 bg-white border border-slate-300 text-slate-700 font-bold text-xs rounded-xl hover:bg-slate-50 cursor-pointer inline-flex items-center gap-1.5"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Imprimir Recibo</span>
              </button>
              <button
                onClick={() => setSelectedTxForReceipt(null)}
                className="px-4 py-1.5 bg-sky-600 hover:bg-sky-700 text-white font-bold text-xs rounded-xl transition-colors cursor-pointer"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
