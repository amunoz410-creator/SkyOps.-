import React, { useMemo, useState } from 'react';
import {
  AircraftMaintenanceRecord,
  MaintenanceWorkOrder,
  User,
  WorkOrderStatus
} from '../types';
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  ClipboardList,
  Package,
  Search,
  Wrench
} from 'lucide-react';

interface WorkshopStatusMiniDashboardProps {
  currentUser: User;
  workOrders: MaintenanceWorkOrder[];
  aircraftRecords: AircraftMaintenanceRecord[];
  loading?: boolean;
  onNavigateTab: (tabId: string, extraId?: string) => void;
}

type WorkshopFilterBucket = 'todas' | 'en_curso' | 'pendientes_repuestos' | 'terminadas';

const STATUS_LABELS: Record<WorkOrderStatus, string> = {
  abierta: 'Abierta',
  en_progreso: 'En Progreso',
  espera_repuestos: 'Espera Repuestos',
  inspeccion_calidad: 'Insp. Calidad',
  cerrada_conforme: 'Terminada · RTS'
};

const PRIORITY_LABELS: Record<MaintenanceWorkOrder['prioridad'], string> = {
  aog_critico: 'AOG Crítico',
  alta: 'Alta',
  media: 'Media',
  baja: 'Baja'
};

const PRIORITY_WEIGHT: Record<MaintenanceWorkOrder['prioridad'], number> = {
  aog_critico: 4,
  alta: 3,
  media: 2,
  baja: 1
};

const STATUS_WEIGHT: Record<WorkOrderStatus, number> = {
  en_progreso: 5,
  espera_repuestos: 4,
  inspeccion_calidad: 3,
  abierta: 2,
  cerrada_conforme: 1
};

const isInProgressBucket = (estado: WorkOrderStatus): boolean =>
  estado === 'abierta' || estado === 'en_progreso' || estado === 'inspeccion_calidad';

export const WorkshopStatusMiniDashboard: React.FC<WorkshopStatusMiniDashboardProps> = ({
  currentUser,
  workOrders,
  aircraftRecords,
  loading = false,
  onNavigateTab
}) => {
  const isAuthorizedRole =
    currentUser.rol === 'mantenimiento' ||
    currentUser.rol === 'admin' ||
    currentUser.rol === 'escuela' ||
    currentUser.rol === 'instructor' ||
    currentUser.rol === 'instructor_en_jefe';

  const canManageWorkOrders =
    currentUser.rol === 'mantenimiento' ||
    currentUser.rol === 'admin' ||
    currentUser.rol === 'escuela';

  const [activeFilter, setActiveFilter] = useState<WorkshopFilterBucket>('todas');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [showAllRows, setShowAllRows] = useState<boolean>(false);

  const metrics = useMemo(() => {
    const safeOrders = workOrders || [];
    const open = safeOrders.filter(w => w.estado === 'abierta').length;
    const inExecution = safeOrders.filter(w => w.estado === 'en_progreso').length;
    const qualityCheck = safeOrders.filter(w => w.estado === 'inspeccion_calidad').length;
    const enCurso = open + inExecution + qualityCheck;
    const waitingParts = safeOrders.filter(w => w.estado === 'espera_repuestos').length;
    const finished = safeOrders.filter(w => w.estado === 'cerrada_conforme').length;
    const total = safeOrders.length;

    const pctEnCurso = total > 0 ? Math.round((enCurso / total) * 100) : 0;
    const pctParts = total > 0 ? Math.round((waitingParts / total) * 100) : 0;
    const pctFinished = total > 0 ? Math.max(0, 100 - pctEnCurso - pctParts) : 0;

    const aogOrders = safeOrders.filter(
      w => w.estado !== 'cerrada_conforme' && w.prioridad === 'aog_critico'
    );
    const aogAircraft = (aircraftRecords || []).filter(
      a => a.bloqueo_despacho || a.estado_aeronavegabilidad === 'aog_bloqueado'
    );

    const aogMatriculas = Array.from(
      new Set([
        ...aogOrders.map(o => o.matricula.toUpperCase()),
        ...aogAircraft.map(a => a.matricula.toUpperCase())
      ])
    );

    return {
      total,
      open,
      inExecution,
      qualityCheck,
      enCurso,
      waitingParts,
      finished,
      pctEnCurso,
      pctParts,
      pctFinished,
      aogOrdersCount: aogOrders.length,
      aogFleetCount: aogAircraft.length,
      aogMatriculas
    };
  }, [workOrders, aircraftRecords]);

  const aogMatriculaSet = useMemo(
    () => new Set(metrics.aogMatriculas),
    [metrics.aogMatriculas]
  );

  const filteredOrders = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    const list = (workOrders || []).filter(wo => {
      if (activeFilter === 'en_curso' && !isInProgressBucket(wo.estado)) return false;
      if (activeFilter === 'pendientes_repuestos' && wo.estado !== 'espera_repuestos') return false;
      if (activeFilter === 'terminadas' && wo.estado !== 'cerrada_conforme') return false;

      if (!q) return true;
      return (
        wo.id.toLowerCase().includes(q) ||
        wo.matricula.toLowerCase().includes(q) ||
        wo.titulo.toLowerCase().includes(q) ||
        wo.tecnico_responsable.toLowerCase().includes(q)
      );
    });

    return [...list].sort((a, b) => {
      const aClosed = a.estado === 'cerrada_conforme' ? 1 : 0;
      const bClosed = b.estado === 'cerrada_conforme' ? 1 : 0;
      if (aClosed !== bClosed) return aClosed - bClosed;

      if (!aClosed) {
        const prioDiff = PRIORITY_WEIGHT[b.prioridad] - PRIORITY_WEIGHT[a.prioridad];
        if (prioDiff !== 0) return prioDiff;

        const statusDiff = STATUS_WEIGHT[b.estado] - STATUS_WEIGHT[a.estado];
        if (statusDiff !== 0) return statusDiff;
      }

      const dateA = a.fecha_cierre || a.fecha_apertura || '';
      const dateB = b.fecha_cierre || b.fecha_apertura || '';
      return dateB.localeCompare(dateA);
    });
  }, [workOrders, activeFilter, searchTerm]);

  if (!isAuthorizedRole) {
    return null;
  }

  const maxInitialRows = 5;
  const visibleOrders = showAllRows ? filteredOrders : filteredOrders.slice(0, maxInitialRows);

  const enCursoBreakdown = [
    metrics.inExecution > 0 ? `${metrics.inExecution} en ejecución` : null,
    metrics.open > 0 ? `${metrics.open} abiertas` : null,
    metrics.qualityCheck > 0 ? `${metrics.qualityCheck} insp. calidad` : null
  ]
    .filter(Boolean)
    .join(' · ');

  const handleMetricToggle = (bucket: WorkshopFilterBucket) => {
    setActiveFilter(prev => (prev === bucket ? 'todas' : bucket));
    setShowAllRows(false);
  };

  return (
    <section
      aria-label="Estado de Taller"
      className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden"
    >
      {/* Top Dark Navy Header Strip */}
      <div className="bg-[#0B2F64] dark:bg-slate-950 text-white px-4 sm:px-5 py-3.5 border-b border-[#163D78] dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-start sm:items-center gap-3 min-w-0">
          <div className="p-2 rounded-lg bg-white/10 border border-white/15 shrink-0">
            <Wrench className="w-4 h-4 text-sky-300" />
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-sm font-bold tracking-tight text-white">
                Estado de Taller
              </h2>
              <span className="text-sky-200/70 text-xs" aria-hidden="true">·</span>
              <span className="text-xs font-mono tabular-nums text-sky-200 font-semibold">
                {loading ? '—' : `${metrics.total} órdenes`}
              </span>
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={() => onNavigateTab(canManageWorkOrders ? 'ordenes_trabajo' : 'itinerarios')}
          className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 bg-white/10 hover:bg-white/20 text-white border border-white/20 rounded-lg text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap shrink-0"
        >
          <ClipboardList className="w-3.5 h-3.5" />
          <span>{canManageWorkOrders ? 'Gestionar Órdenes de Trabajo' : 'Ver Itinerario / Flota'}</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Loading Skeleton State */}
      {loading ? (
        <div className="p-4 sm:p-5 space-y-4 animate-pulse">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[0, 1, 2].map(idx => (
              <div
                key={idx}
                className="h-20 rounded-lg bg-slate-100 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700"
              />
            ))}
          </div>
          <div className="h-2.5 rounded bg-slate-100 dark:bg-slate-800" />
          <div className="space-y-2.5 pt-1">
            {[0, 1, 2].map(idx => (
              <div
                key={idx}
                className="h-10 rounded bg-slate-100 dark:bg-slate-800/60"
              />
            ))}
          </div>
        </div>
      ) : (
        <>
          {/* 3-Column Interactive KPI Strip (Single Elevation, Hairline Dividers) */}
          <div className="grid grid-cols-1 sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x divide-slate-200 dark:divide-slate-800 border-b border-slate-200 dark:border-slate-800">
            {/* KPI 1: En Curso */}
            <button
              type="button"
              onClick={() => handleMetricToggle('en_curso')}
              className={`p-4 text-left transition-colors cursor-pointer group ${
                activeFilter === 'en_curso'
                  ? 'bg-sky-50/80 dark:bg-sky-950/30'
                  : 'hover:bg-slate-50 dark:hover:bg-slate-800/40'
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-300 flex items-center gap-1.5">
                  <Wrench className="w-3.5 h-3.5 text-[#0B2F64] dark:text-sky-400" />
                  <span>En Curso</span>
                </span>
                <span className="text-[11px] font-mono tabular-nums font-semibold text-[#0B2F64] dark:text-sky-400">
                  {metrics.pctEnCurso}%
                </span>
              </div>
              <div className="mt-2 flex items-baseline justify-between gap-2">
                <span className="text-2xl font-bold font-mono tabular-nums text-[#0B2F64] dark:text-sky-400">
                  {metrics.enCurso}
                </span>
                <span className="text-[11px] text-slate-500 dark:text-slate-400 font-mono tabular-nums truncate">
                  {enCursoBreakdown || 'Sin órdenes activas'}
                </span>
              </div>
            </button>

            {/* KPI 2: Pendientes de Repuestos */}
            <button
              type="button"
              onClick={() => handleMetricToggle('pendientes_repuestos')}
              className={`p-4 text-left transition-colors cursor-pointer group ${
                activeFilter === 'pendientes_repuestos'
                  ? 'bg-amber-50/80 dark:bg-amber-950/25'
                  : 'hover:bg-slate-50 dark:hover:bg-slate-800/40'
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-300 flex items-center gap-1.5">
                  <Package
                    className={`w-3.5 h-3.5 ${
                      metrics.waitingParts > 0
                        ? 'text-amber-600 dark:text-amber-400'
                        : 'text-slate-400'
                    }`}
                  />
                  <span>Pendientes de Repuestos</span>
                </span>
                <span
                  className={`text-[11px] font-mono tabular-nums font-semibold ${
                    metrics.waitingParts > 0
                      ? 'text-amber-700 dark:text-amber-400'
                      : 'text-slate-400 dark:text-slate-500'
                  }`}
                >
                  {metrics.pctParts}%
                </span>
              </div>
              <div className="mt-2 flex items-baseline justify-between gap-2">
                <span
                  className={`text-2xl font-bold font-mono tabular-nums ${
                    metrics.waitingParts > 0
                      ? 'text-amber-600 dark:text-amber-400'
                      : 'text-slate-800 dark:text-slate-200'
                  }`}
                >
                  {metrics.waitingParts}
                </span>
              </div>
            </button>

            {/* KPI 3: Terminadas */}
            <button
              type="button"
              onClick={() => handleMetricToggle('terminadas')}
              className={`p-4 text-left transition-colors cursor-pointer group ${
                activeFilter === 'terminadas'
                  ? 'bg-emerald-50/80 dark:bg-emerald-950/25'
                  : 'hover:bg-slate-50 dark:hover:bg-slate-800/40'
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-300 flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                  <span>Terminadas</span>
                </span>
                <span className="text-[11px] font-mono tabular-nums font-semibold text-emerald-700 dark:text-emerald-400">
                  {metrics.pctFinished}%
                </span>
              </div>
              <div className="mt-2 flex items-baseline justify-between gap-2">
                <span className="text-2xl font-bold font-mono tabular-nums text-emerald-700 dark:text-emerald-400">
                  {metrics.finished}
                </span>
              </div>
            </button>
          </div>

          {/* Segmented Distribution Bar + Important AOG Red Notice */}
          <div className="px-4 sm:px-5 py-3 bg-slate-50/80 dark:bg-slate-950/40 border-b border-slate-200 dark:border-slate-800 space-y-2.5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex flex-wrap items-center gap-4 text-[11px] text-slate-600 dark:text-slate-300">
                <span className="inline-flex items-center gap-1.5 font-mono tabular-nums">
                  <span className="w-2.5 h-2.5 rounded-xs bg-[#0B2F64] dark:bg-sky-500 inline-block" />
                  <span>En curso: {metrics.enCurso}</span>
                </span>
                <span className="inline-flex items-center gap-1.5 font-mono tabular-nums">
                  <span className="w-2.5 h-2.5 rounded-xs bg-amber-500 inline-block" />
                  <span>Repuestos: {metrics.waitingParts}</span>
                </span>
                <span className="inline-flex items-center gap-1.5 font-mono tabular-nums">
                  <span className="w-2.5 h-2.5 rounded-xs bg-emerald-600 inline-block" />
                  <span>Terminadas: {metrics.finished}</span>
                </span>
              </div>

              {(metrics.aogFleetCount > 0 || metrics.aogOrdersCount > 0) && (
                <div className="flex items-center gap-1.5 text-[11px] font-bold text-red-600 dark:text-red-400 font-mono tabular-nums">
                  <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                  <span>
                    AOG / Bloqueo en tierra: {metrics.aogMatriculas.join(', ')}
                  </span>
                </div>
              )}
            </div>

            {metrics.total > 0 && (
              <div
                className="w-full h-2 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden flex"
                role="img"
                aria-label={`Distribución de órdenes: ${metrics.enCurso} en curso, ${metrics.waitingParts} pendientes de repuestos, ${metrics.finished} terminadas`}
              >
                {metrics.enCurso > 0 && (
                  <div
                    style={{ width: `${(metrics.enCurso / metrics.total) * 100}%` }}
                    className="bg-[#0B2F64] dark:bg-sky-500 transition-all duration-300"
                    title={`En curso: ${metrics.enCurso}`}
                  />
                )}
                {metrics.waitingParts > 0 && (
                  <div
                    style={{ width: `${(metrics.waitingParts / metrics.total) * 100}%` }}
                    className="bg-amber-500 transition-all duration-300"
                    title={`Pendientes de repuestos: ${metrics.waitingParts}`}
                  />
                )}
                {metrics.finished > 0 && (
                  <div
                    style={{ width: `${(metrics.finished / metrics.total) * 100}%` }}
                    className="bg-emerald-600 transition-all duration-300"
                    title={`Terminadas: ${metrics.finished}`}
                  />
                )}
              </div>
            )}
          </div>

          {/* Filter Tabs & Quick Search Bar */}
          <div className="px-4 sm:px-5 py-3 border-b border-slate-200 dark:border-slate-800 flex flex-col lg:flex-row lg:items-center justify-between gap-2.5">
            <div className="flex flex-wrap items-center gap-1 bg-slate-100 dark:bg-slate-950 p-1 rounded-lg border border-slate-200 dark:border-slate-800">
              {(
                [
                  { id: 'todas', label: `Todas (${metrics.total})` },
                  { id: 'en_curso', label: `En curso (${metrics.enCurso})` },
                  { id: 'pendientes_repuestos', label: `Repuestos (${metrics.waitingParts})` },
                  { id: 'terminadas', label: `Terminadas (${metrics.finished})` }
                ] as { id: WorkshopFilterBucket; label: string }[]
              ).map(tab => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => {
                    setActiveFilter(tab.id);
                    setShowAllRows(false);
                  }}
                  className={`px-2.5 py-1 rounded-md text-xs font-semibold font-mono tabular-nums transition-colors cursor-pointer whitespace-nowrap ${
                    activeFilter === tab.id
                      ? 'bg-[#0B2F64] text-white dark:bg-slate-800'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <div className="relative w-full lg:w-72">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                placeholder="Filtrar matrícula, OT o técnico..."
                aria-label="Filtrar órdenes de trabajo"
                className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white focus:outline-none focus:border-[#0B2F64] dark:focus:border-sky-500"
              />
            </div>
          </div>

          {/* Orders List / Populated vs Empty States */}
          {metrics.total === 0 ? (
            <div className="px-5 py-8 text-center space-y-2">
              <ClipboardList className="w-7 h-7 text-slate-300 dark:text-slate-700 mx-auto" />
              <p className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                Sin órdenes de trabajo
              </p>
              {canManageWorkOrders && (
                <div className="pt-1">
                  <button
                    type="button"
                    onClick={() => onNavigateTab('ordenes_trabajo')}
                    className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-[#0B2F64] hover:bg-[#0E3A7A] text-white rounded-lg text-xs font-semibold transition-colors cursor-pointer"
                  >
                    <span>Registrar Primera Orden</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </div>
          ) : filteredOrders.length === 0 ? (
            <div className="px-5 py-7 text-center space-y-2">
              <p className="text-xs font-semibold text-slate-700 dark:text-slate-200">
                No hay órdenes de trabajo en esta categoría o búsqueda
              </p>
              <button
                type="button"
                onClick={() => {
                  setActiveFilter('todas');
                  setSearchTerm('');
                }}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 rounded-lg text-xs font-semibold transition-colors cursor-pointer"
              >
                Mostrar todas las órdenes
              </button>
            </div>
          ) : (
            <>
              {/* Desktop High-Density Table */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 dark:bg-slate-950/60 border-b border-slate-200 dark:border-slate-800 text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                      <th className="py-2 px-4">Orden</th>
                      <th className="py-2 px-3">Aeronave</th>
                      <th className="py-2 px-3">Trabajo &amp; TMA</th>
                      <th className="py-2 px-3">Prioridad</th>
                      <th className="py-2 px-4 text-right">Estado</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
                    {visibleOrders.map(wo => {
                      const isAogAircraft =
                        wo.estado !== 'cerrada_conforme' &&
                        aogMatriculaSet.has(wo.matricula.toUpperCase());

                      return (
                        <tr
                          key={wo.id}
                          className="hover:bg-slate-50/90 dark:hover:bg-slate-800/40 transition-colors"
                        >
                          <td className="py-2.5 px-4 whitespace-nowrap align-middle">
                            <div className="font-mono tabular-nums font-bold text-slate-900 dark:text-white">
                              {wo.id}
                            </div>
                            <div className="text-[11px] font-mono tabular-nums text-slate-500 dark:text-slate-400">
                              {wo.fecha_cierre ? `Cierre ${wo.fecha_cierre}` : `Apert. ${wo.fecha_apertura}`}
                            </div>
                          </td>

                          <td className="py-2.5 px-3 whitespace-nowrap align-middle">
                            <span className="font-mono font-bold text-[#0B2F64] dark:text-sky-400">
                              {wo.matricula}
                            </span>
                            {isAogAircraft && (
                              <span className="block text-[10px] font-bold text-red-600 dark:text-red-400">
                                AOG en tierra
                              </span>
                            )}
                          </td>

                          <td className="py-2.5 px-3 align-middle max-w-md">
                            <div className="font-semibold text-slate-900 dark:text-white truncate">
                              {wo.titulo}
                            </div>
                            <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                              {wo.tecnico_responsable}
                              {wo.fecha_estimada_entrega && wo.estado !== 'cerrada_conforme'
                                ? ` · Est. ${wo.fecha_estimada_entrega}`
                                : ''}
                            </div>
                          </td>

                          <td className="py-2.5 px-3 whitespace-nowrap align-middle font-semibold">
                            <span
                              className={
                                wo.prioridad === 'aog_critico'
                                  ? 'text-red-600 dark:text-red-400'
                                  : wo.prioridad === 'alta'
                                  ? 'text-amber-700 dark:text-amber-400'
                                  : 'text-slate-500 dark:text-slate-400'
                              }
                            >
                              {PRIORITY_LABELS[wo.prioridad]}
                            </span>
                          </td>

                          <td className="py-2.5 px-4 whitespace-nowrap align-middle text-right font-semibold">
                            <span
                              className={
                                wo.estado === 'cerrada_conforme'
                                  ? 'text-emerald-700 dark:text-emerald-400'
                                  : wo.estado === 'espera_repuestos'
                                  ? 'text-amber-700 dark:text-amber-400'
                                  : wo.estado === 'en_progreso'
                                  ? 'text-[#0B2F64] dark:text-sky-400'
                                  : wo.estado === 'inspeccion_calidad'
                                  ? 'text-indigo-700 dark:text-indigo-400'
                                  : 'text-slate-700 dark:text-slate-300'
                              }
                            >
                              {STATUS_LABELS[wo.estado]}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Mobile Compact Stacked List */}
              <div className="md:hidden divide-y divide-slate-100 dark:divide-slate-800">
                {visibleOrders.map(wo => (
                  <div key={wo.id} className="p-3.5 space-y-1.5 text-xs">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 font-mono tabular-nums">
                        <span className="font-bold text-slate-900 dark:text-white">{wo.id}</span>
                        <span className="text-slate-400" aria-hidden="true">·</span>
                        <span className="font-bold text-[#0B2F64] dark:text-sky-400">{wo.matricula}</span>
                      </div>
                      <span
                        className={`font-semibold text-[11px] ${
                          wo.estado === 'cerrada_conforme'
                            ? 'text-emerald-700 dark:text-emerald-400'
                            : wo.estado === 'espera_repuestos'
                            ? 'text-amber-700 dark:text-amber-400'
                            : wo.estado === 'en_progreso'
                            ? 'text-[#0B2F64] dark:text-sky-400'
                            : 'text-slate-700 dark:text-slate-300'
                        }`}
                      >
                        {STATUS_LABELS[wo.estado]}
                      </span>
                    </div>
                    <div className="font-semibold text-slate-900 dark:text-white line-clamp-1">
                      {wo.titulo}
                    </div>
                    <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
                      <span className="truncate pr-2">{wo.tecnico_responsable}</span>
                      <span
                        className={`font-semibold shrink-0 ${
                          wo.prioridad === 'aog_critico'
                            ? 'text-red-600 dark:text-red-400'
                            : wo.prioridad === 'alta'
                            ? 'text-amber-700 dark:text-amber-400'
                            : 'text-slate-500 dark:text-slate-400'
                        }`}
                      >
                        {PRIORITY_LABELS[wo.prioridad]}
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Footer Pagination / Expand Control */}
              {filteredOrders.length > maxInitialRows && (
                <div className="px-4 sm:px-5 py-2.5 bg-slate-50/70 dark:bg-slate-950/30 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs">
                  <span className="text-slate-500 dark:text-slate-400 font-mono tabular-nums">
                    Mostrando {visibleOrders.length} de {filteredOrders.length}
                  </span>
                  <button
                    type="button"
                    onClick={() => setShowAllRows(prev => !prev)}
                    className="font-semibold text-[#0B2F64] dark:text-sky-400 hover:underline cursor-pointer"
                  >
                    {showAllRows ? 'Mostrar menos' : `Ver todas (${filteredOrders.length})`}
                  </button>
                </div>
              )}
            </>
          )}
        </>
      )}
    </section>
  );
};
