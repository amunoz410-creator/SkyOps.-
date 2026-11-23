import React, { useState, useMemo } from 'react';
import { ManeuverChangeRecord, FlightProgress, User, GradeValue } from '../types';
import { ManeuverDefinition, GRADE_CONFIG } from '../data/maneuvers';
import {
  History,
  Clock,
  UserCheck,
  ShieldCheck,
  Filter,
  Search,
  CheckCircle2,
  AlertCircle,
  FileText,
  ChevronDown,
  ChevronUp,
  Activity,
  Award
} from 'lucide-react';

interface ManeuverChangeLogProps {
  historial?: ManeuverChangeRecord[];
  activeSheet?: FlightProgress | null;
  maneuversCatalog: ManeuverDefinition[];
  selectedManeuverId?: string | null;
  onSelectManeuver?: (id: string | null) => void;
  currentUser?: User;
  language?: 'es' | 'en';
}

export const ManeuverChangeLog: React.FC<ManeuverChangeLogProps> = ({
  historial = [],
  activeSheet,
  maneuversCatalog,
  selectedManeuverId,
  onSelectManeuver,
  currentUser,
  language = 'es'
}) => {
  const [filterManeuverId, setFilterManeuverId] = useState<string>(selectedManeuverId || 'all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isExpanded, setIsExpanded] = useState<boolean>(true);

  // Sincronizar si cambia desde afuera
  React.useEffect(() => {
    if (selectedManeuverId) {
      setFilterManeuverId(selectedManeuverId);
    }
  }, [selectedManeuverId]);

  const handleFilterChange = (maneuverId: string) => {
    setFilterManeuverId(maneuverId);
    if (onSelectManeuver) {
      onSelectManeuver(maneuverId === 'all' ? null : maneuverId);
    }
  };

  // Filtrar registros según selección de maniobra y búsqueda
  const filteredRecords = useMemo(() => {
    let records = [...historial].sort(
      (a, b) => new Date(b.fecha_modificacion).getTime() - new Date(a.fecha_modificacion).getTime()
    );

    if (filterManeuverId && filterManeuverId !== 'all') {
      records = records.filter(r => r.maniobra_id === filterManeuverId);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      records = records.filter(
        r =>
          r.maniobra_nombre.toLowerCase().includes(q) ||
          r.modificado_por_nombre.toLowerCase().includes(q) ||
          r.modificado_por_rol.toLowerCase().includes(q) ||
          (r.motivo && r.motivo.toLowerCase().includes(q))
      );
    }

    return records;
  }, [historial, filterManeuverId, searchQuery]);

  // Obtener la última modificación específica (de la maniobra seleccionada o la general más reciente)
  const lastSpecificModification = useMemo(() => {
    if (filteredRecords.length > 0) {
      return filteredRecords[0];
    }
    return null;
  }, [filteredRecords]);

  // Buscar información de catálogo de la maniobra seleccionada
  const selectedManeuverDef = useMemo(() => {
    if (!filterManeuverId || filterManeuverId === 'all') return null;
    return maneuversCatalog.find(m => m.id === filterManeuverId) || null;
  }, [filterManeuverId, maneuversCatalog]);

  const formatDate = (isoString: string) => {
    try {
      const d = new Date(isoString);
      if (isNaN(d.getTime())) return isoString;
      return d.toLocaleDateString(language === 'en' ? 'en-US' : 'es-PA', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      });
    } catch {
      return isoString;
    }
  };

  const formatRelativeTime = (isoString: string) => {
    try {
      const diffMs = Date.now() - new Date(isoString).getTime();
      const diffMins = Math.floor(diffMs / (1000 * 60));
      const diffHours = Math.floor(diffMins / 60);
      const diffDays = Math.floor(diffHours / 24);

      if (diffMins < 1) return language === 'en' ? 'Just now' : 'Hace un momento';
      if (diffMins < 60) return language === 'en' ? `${diffMins} min ago` : `Hace ${diffMins} min`;
      if (diffHours < 24) return language === 'en' ? `${diffHours}h ago` : `Hace ${diffHours} h`;
      if (diffDays === 1) return language === 'en' ? 'Yesterday' : 'Ayer';
      return language === 'en' ? `${diffDays} days ago` : `Hace ${diffDays} días`;
    } catch {
      return '';
    }
  };

  const getRoleBadgeColor = (rol: string) => {
    switch (rol) {
      case 'instructor':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'admin':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'contabilidad':
        return 'bg-emerald-100 text-emerald-800 border-emerald-200';
      default:
        return 'bg-amber-100 text-amber-800 border-amber-200';
    }
  };

  const renderGradeBadge = (grade: GradeValue | string) => {
    const config = GRADE_CONFIG[grade as GradeValue];
    if (!config) {
      return <span className="px-2 py-0.5 rounded text-xs font-bold bg-slate-100 text-slate-700">{grade}</span>;
    }
    return (
      <span
        className={`px-2 py-0.5 rounded-md text-xs font-extrabold shadow-xs ${config.bgClass}`}
        title={language === 'en' ? config.name_en : config.name_es}
      >
        {grade}
      </span>
    );
  };

  return (
    <div
      id="component-changelog-maniobras"
      className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden transition-all"
    >
      {/* HEADER PRINCIPAL DEL CHANGELOG */}
      <div className="bg-slate-900 text-white p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-sky-500/20 border border-sky-400/30 flex items-center justify-center text-sky-400 flex-shrink-0">
            <History className="w-5 h-5" />
          </div>
            <div className="flex items-center gap-2">
              <h4 className="text-sm sm:text-base font-bold text-white tracking-wide">
                Historial de Maniobras
              </h4>
            </div>
        </div>

        <div className="flex items-center gap-2 self-end sm:self-center">
          <span className="text-xs text-slate-400 font-medium">
            {filteredRecords.length} {filteredRecords.length === 1 ? 'registro' : 'registros'}
          </span>
          <button
            type="button"
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-1.5 hover:bg-slate-800 rounded-lg text-slate-300 hover:text-white transition-colors cursor-pointer"
            title={isExpanded ? 'Minimizar ChangeLog' : 'Expandir ChangeLog'}
          >
            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {isExpanded && (
        <div className="p-4 sm:p-5 space-y-4">
          {/* BARRA DE FILTROS & SELECCIÓN DE MANIOBRA ESPECÍFICA */}
          <div className="bg-slate-50 p-3 rounded-xl border border-slate-200/90 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 text-xs">
            <div className="flex-1 flex flex-col sm:flex-row items-start sm:items-center gap-2">
              <div className="flex items-center gap-1.5 font-bold text-slate-700 whitespace-nowrap">
                <Filter className="w-3.5 h-3.5 text-sky-600" />
                <span>Maniobra específica:</span>
              </div>
              <select
                className="w-full sm:w-auto flex-1 max-w-md bg-white text-slate-800 font-semibold px-3 py-1.5 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-sky-500/20"
                value={filterManeuverId}
                onChange={e => handleFilterChange(e.target.value)}
              >
                <option value="all">-- Todas las maniobras con cambios ({historial.length}) --</option>
                {maneuversCatalog.map(m => {
                  const hasChanges = historial.some(h => h.maniobra_id === m.id);
                  const name = language === 'en' && m.nombre_en ? m.nombre_en : m.nombre;
                  return (
                    <option key={m.id} value={m.id}>
                      Col {m.columna}: {name} {hasChanges ? '★ (Con registro)' : ''}
                    </option>
                  );
                })}
              </select>
            </div>

            <div className="relative flex-shrink-0 sm:w-64">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Buscar instructor, maniobra..."
                className="w-full pl-8 pr-3 py-1.5 bg-white text-slate-800 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-sky-500/20"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
              />
            </div>
          </div>

          {/* TARJETA DESTACADA: ÚLTIMA MODIFICACIÓN ESPECÍFICA */}
          {lastSpecificModification ? (
            <div className="bg-gradient-to-r from-sky-50/80 via-white to-blue-50/50 p-4 rounded-xl border border-sky-200/80 shadow-xs">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3 border-b border-sky-100">
                <div className="flex items-start gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-sky-600 text-white flex items-center justify-center flex-shrink-0 font-bold text-xs shadow-xs">
                    <UserCheck className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                        Última Modificación en{' '}
                        <strong className="text-sky-900 font-extrabold">
                          {selectedManeuverDef
                            ? language === 'en' && selectedManeuverDef.nombre_en
                              ? selectedManeuverDef.nombre_en
                              : selectedManeuverDef.nombre
                            : lastSpecificModification.maniobra_nombre}
                        </strong>
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${getRoleBadgeColor(
                          lastSpecificModification.modificado_por_rol
                        )}`}
                      >
                        {lastSpecificModification.modificado_por_rol.toUpperCase()}
                      </span>
                    </div>

                    <h5 className="text-sm font-extrabold text-slate-900 mt-0.5">
                      {lastSpecificModification.modificado_por_nombre}
                    </h5>
                  </div>
                </div>

                <div className="flex items-center gap-3 text-xs">
                  <div className="text-right">
                    <div className="font-bold text-slate-800 flex items-center gap-1 justify-end">
                      <Clock className="w-3.5 h-3.5 text-sky-600" />
                      <span>{formatDate(lastSpecificModification.fecha_modificacion)}</span>
                    </div>
                    <div className="text-[11px] text-slate-500 font-medium">
                      {formatRelativeTime(lastSpecificModification.fecha_modificacion)}
                    </div>
                  </div>
                </div>
              </div>

              {/* DETALLES DE LA TRANSICIÓN DE CALIFICACIÓN */}
              <div className="mt-3 flex flex-wrap items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-2">
                  <span className="text-slate-600 font-medium">Transición de Calificación:</span>
                  <div className="flex items-center gap-1.5">
                    {renderGradeBadge(lastSpecificModification.calificacion_anterior)}
                    <span className="text-slate-400 font-bold text-sm">➔</span>
                    {renderGradeBadge(lastSpecificModification.calificacion_nueva)}
                  </div>
                </div>

                {lastSpecificModification.motivo && (
                  <div className="text-slate-600 text-[11px] bg-white px-2.5 py-1 rounded-md border border-slate-200">
                    <strong className="text-slate-700">Motivo/Contexto:</strong> {lastSpecificModification.motivo}
                  </div>
                )}

                <div className="flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                  <ShieldCheck className="w-3 h-3 text-emerald-600" />
                  <span>Integridad Verificada AAC</span>
                </div>
              </div>
            </div>
          ) : (
            <div className="p-4 bg-slate-50 rounded-xl border border-dashed border-slate-300 text-center text-xs text-slate-500">
              <Activity className="w-6 h-6 text-slate-400 mx-auto mb-1.5" />
              <p className="font-semibold text-slate-700">Sin modificaciones registradas.</p>
            </div>
          )}

          {/* TABLA HISTÓRICA DETALLADA */}
          {filteredRecords.length > 0 && (
            <div className="overflow-x-auto rounded-xl border border-slate-200">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-100/90 text-slate-700 font-bold border-b border-slate-200 text-[11px] uppercase tracking-wider">
                    <th className="p-2.5">Maniobra Evaluada</th>
                    <th className="p-2.5 text-center">Calificación</th>
                    <th className="p-2.5">Modificado Por</th>
                    <th className="p-2.5">Rol</th>
                    <th className="p-2.5 text-right">Fecha & Hora</th>
                    <th className="p-2.5">Contexto / Lección</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200/70 bg-white">
                  {filteredRecords.map((record, idx) => {
                    const isFirst = idx === 0;
                    return (
                      <tr
                        key={record.id || `${record.maniobra_id}-${idx}`}
                        className={`hover:bg-sky-50/40 transition-colors ${
                          isFirst ? 'bg-sky-50/20 font-medium' : ''
                        }`}
                      >
                        <td className="p-2.5">
                          <div className="font-semibold text-slate-800">{record.maniobra_nombre}</div>
                          <div className="text-[10px] text-slate-400 font-mono">ID: {record.maniobra_id}</div>
                        </td>

                        <td className="p-2.5 text-center">
                          <div className="inline-flex items-center gap-1">
                            <span className="text-[11px] text-slate-500 font-mono">
                              {record.calificacion_anterior}
                            </span>
                            <span className="text-slate-400 font-bold text-[10px]">➔</span>
                            {renderGradeBadge(record.calificacion_nueva)}
                          </div>
                        </td>

                        <td className="p-2.5">
                          <div className="font-bold text-slate-800">{record.modificado_por_nombre}</div>
                        </td>

                        <td className="p-2.5">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold border ${getRoleBadgeColor(
                              record.modificado_por_rol
                            )}`}
                          >
                            {record.modificado_por_rol.toUpperCase()}
                          </span>
                        </td>

                        <td className="p-2.5 text-right font-mono text-[11px] text-slate-600">
                          <div>{formatDate(record.fecha_modificacion)}</div>
                          <div className="text-[10px] text-slate-400">{formatRelativeTime(record.fecha_modificacion)}</div>
                        </td>

                        <td className="p-2.5 text-[11px] text-slate-600">
                          {record.motivo ? (
                            <span className="bg-slate-50 px-2 py-0.5 rounded border border-slate-200">
                              {record.motivo}
                            </span>
                          ) : (
                            <span className="text-slate-400">Lección #{record.leccion_num || activeSheet?.leccion_num || '-'}</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
