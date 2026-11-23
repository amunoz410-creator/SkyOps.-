import React, { useState, useEffect, useMemo } from 'react';
import {
  User,
  AircraftMaintenanceRecord,
  MaintenanceWorkOrder,
  MaintenanceWorkOrderItem,
  MaintenanceSquawk,
  AircraftWorkshopMovement,
  WorkOrderStatus,
  WorkOrderType
} from '../types';
import { api } from '../services/api';
import {
  ClipboardList,
  Wrench,
  PlusCircle,
  RefreshCw,
  Search,
  Filter,
  CheckCircle2,
  ShieldAlert,
  FileCheck2,
  Eye,
  Edit3,
  Printer,
  X,
  Package,
  Trash2,
  AlertOctagon,
  Award
} from 'lucide-react';

interface WorkshopWorkOrdersSectionProps {
  currentUser: User;
  onRefreshAll?: () => void;
  onNavigateTab?: (tabId: string) => void;
}

const WORK_ORDER_TYPE_LABELS: Record<WorkOrderType, string> = {
  inspeccion_50h: 'Inspección 50 Horas',
  inspeccion_100h: 'Inspección 100 Horas',
  inspeccion_anual: 'Inspección Anual (RAC 91)',
  correctivo: 'Mantenimiento Correctivo',
  directiva_ad: 'Directiva de Aeronavegabilidad (AD)',
  servicio_aceite: 'Servicio de Aceite & Filtro',
  avionica: 'Aviónica & Instrumentos',
  overhaul: 'Overhaul / Gran Mantenimiento'
};

const WORK_ORDER_STATUS_LABELS: Record<WorkOrderStatus, string> = {
  abierta: 'Abierta',
  en_progreso: 'En Progreso',
  espera_repuestos: 'Espera de Repuestos',
  inspeccion_calidad: 'Inspección de Calidad',
  cerrada_conforme: 'Cerrada Conforme (RTS)'
};

const PRIORITY_LABELS: Record<MaintenanceWorkOrder['prioridad'], string> = {
  baja: 'Baja',
  media: 'Media',
  alta: 'Alta',
  aog_critico: 'AOG Crítico'
};

export const WorkshopWorkOrdersSection: React.FC<WorkshopWorkOrdersSectionProps> = ({
  currentUser,
  onRefreshAll,
  onNavigateTab
}) => {
  const isAllowed =
    currentUser.rol === 'mantenimiento' ||
    currentUser.rol === 'escuela' ||
    currentUser.rol === 'admin';

  const [workOrders, setWorkOrders] = useState<MaintenanceWorkOrder[]>([]);
  const [aircraftList, setAircraftList] = useState<AircraftMaintenanceRecord[]>([]);
  const [squawks, setSquawks] = useState<MaintenanceSquawk[]>([]);
  const [movements, setMovements] = useState<AircraftWorkshopMovement[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [actionLoading, setActionLoading] = useState<boolean>(false);

  // Feedback Toasts
  const [toastMessage, setToastMessage] = useState<{ text: string; isError?: boolean } | null>(null);

  // Filters
  const [statusFilter, setStatusFilter] = useState<'TODAS' | WorkOrderStatus>('TODAS');
  const [matriculaFilter, setMatriculaFilter] = useState<string>('TODAS');
  const [priorityFilter, setPriorityFilter] = useState<'TODAS' | MaintenanceWorkOrder['prioridad']>('TODAS');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Modals State
  const [selectedDetailWo, setSelectedDetailWo] = useState<MaintenanceWorkOrder | null>(null);
  const [selectedEditWo, setSelectedEditWo] = useState<MaintenanceWorkOrder | null>(null);
  const [selectedRtsWo, setSelectedRtsWo] = useState<MaintenanceWorkOrder | null>(null);
  const [showNewWoModal, setShowNewWoModal] = useState<boolean>(false);

  // Create Form State
  const [newWoForm, setNewWoForm] = useState<{
    matricula: string;
    tipo: WorkOrderType;
    titulo: string;
    descripcion: string;
    prioridad: MaintenanceWorkOrder['prioridad'];
    fecha_estimada_entrega: string;
    horas_aeronave_entrada: number;
    tecnico_responsable: string;
    licencia_tma: string;
    notas: string;
  }>({
    matricula: 'HP-1450',
    tipo: 'inspeccion_100h',
    titulo: '',
    descripcion: '',
    prioridad: 'media',
    fecha_estimada_entrega: '',
    horas_aeronave_entrada: 4218.5,
    tecnico_responsable:
      currentUser.rol === 'mantenimiento' ? currentUser.nombre : 'Ing. Carlos Mendoza',
    licencia_tma: currentUser.licencia || 'AAC-TMA-4512',
    notas: ''
  });

  // Edit / Update Progress Form State
  const [editForm, setEditForm] = useState<{
    estado: WorkOrderStatus;
    prioridad: MaintenanceWorkOrder['prioridad'];
    fecha_estimada_entrega: string;
    tecnico_responsable: string;
    licencia_tma: string;
    trabajo_realizado: string;
    notas: string;
    partes_utilizadas: MaintenanceWorkOrderItem[];
  }>({
    estado: 'abierta',
    prioridad: 'media',
    fecha_estimada_entrega: '',
    tecnico_responsable: '',
    licencia_tma: '',
    trabajo_realizado: '',
    notas: '',
    partes_utilizadas: []
  });

  const [newPartRow, setNewPartRow] = useState<{
    item: string;
    numero_parte: string;
    cantidad: number;
    costo_unitario: number;
  }>({
    item: '',
    numero_parte: '',
    cantidad: 1,
    costo_unitario: 0
  });

  // RTS Certification Form State
  const [rtsTmaName, setRtsTmaName] = useState(
    currentUser.rol === 'mantenimiento' ? currentUser.nombre : 'Ing. Carlos Mendoza'
  );
  const [rtsTmaLic, setRtsTmaLic] = useState(currentUser.licencia || 'AAC-TMA-4512');
  const [rtsTachSalida, setRtsTachSalida] = useState<number>(0);
  const [rtsDeclaration, setRtsDeclaration] = useState<string>('');
  const [rtsResetCounter, setRtsResetCounter] = useState<boolean>(false);
  const [rtsResolveSquawks, setRtsResolveSquawks] = useState<boolean>(true);

  const showToast = (text: string, isError = false) => {
    setToastMessage({ text, isError });
    setTimeout(() => setToastMessage(null), 4500);
  };

  const loadData = async () => {
    if (!isAllowed) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const [woData, acData, sqData, movData] = await Promise.all([
        api.getMaintenanceWorkOrders(),
        api.getAircraftMaintenanceRecords(),
        api.getMaintenanceSquawks().catch(() => []),
        api.getAircraftMovements().catch(() => [])
      ]);
      setWorkOrders(woData);
      setAircraftList(acData);
      setSquawks(sqData);
      setMovements(movData);

      if (acData.length > 0 && !acData.some(a => a.matricula === newWoForm.matricula)) {
        setNewWoForm(prev => ({
          ...prev,
          matricula: acData[0].matricula,
          horas_aeronave_entrada: acData[0].horas_totales_celula
        }));
      }
    } catch (err: any) {
      showToast(err.message || 'Error al cargar órdenes de trabajo de taller', true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [currentUser.id, currentUser.rol]);

  // Computed KPI metrics across all work orders
  const metrics = useMemo(() => {
    const total = workOrders.length;
    const open = workOrders.filter(w => w.estado === 'abierta').length;
    const inProgress = workOrders.filter(w => w.estado === 'en_progreso').length;
    const waitingParts = workOrders.filter(w => w.estado === 'espera_repuestos').length;
    const qc = workOrders.filter(w => w.estado === 'inspeccion_calidad').length;
    const closed = workOrders.filter(w => w.estado === 'cerrada_conforme').length;
    const activeTotal = total - closed;
    const aogActive = workOrders.filter(
      w => w.estado !== 'cerrada_conforme' && w.prioridad === 'aog_critico'
    ).length;
    const highActive = workOrders.filter(
      w => w.estado !== 'cerrada_conforme' && w.prioridad === 'alta'
    ).length;
    const rtsRate = total > 0 ? Math.round((closed / total) * 100) : 0;

    return {
      total,
      open,
      inProgress,
      waitingParts,
      qc,
      closed,
      activeTotal,
      aogActive,
      highActive,
      rtsRate
    };
  }, [workOrders]);

  const aircraftByMatricula = useMemo(() => {
    const map: Record<string, AircraftMaintenanceRecord> = {};
    aircraftList.forEach(ac => {
      map[ac.matricula.toUpperCase()] = ac;
    });
    return map;
  }, [aircraftList]);

  const filteredOrders = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return workOrders.filter(wo => {
      if (statusFilter !== 'TODAS' && wo.estado !== statusFilter) return false;
      if (matriculaFilter !== 'TODAS' && wo.matricula !== matriculaFilter) return false;
      if (priorityFilter !== 'TODAS' && wo.prioridad !== priorityFilter) return false;
      if (q) {
        const haystack = [
          wo.id,
          wo.matricula,
          wo.titulo,
          wo.descripcion,
          wo.tecnico_responsable,
          wo.licencia_tma,
          WORK_ORDER_TYPE_LABELS[wo.tipo] || wo.tipo
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      return true;
    });
  }, [workOrders, statusFilter, matriculaFilter, priorityFilter, searchQuery]);

  const todayStr = new Date().toISOString().slice(0, 10);

  const handleOpenNewModal = () => {
    const defaultAc = aircraftList[0];
    setNewWoForm({
      matricula: defaultAc?.matricula || 'HP-1450',
      tipo: 'inspeccion_100h',
      titulo: '',
      descripcion: '',
      prioridad: 'media',
      fecha_estimada_entrega: '',
      horas_aeronave_entrada: defaultAc ? defaultAc.horas_totales_celula : 0,
      tecnico_responsable:
        currentUser.rol === 'mantenimiento' ? currentUser.nombre : 'Ing. Carlos Mendoza',
      licencia_tma: currentUser.licencia || 'AAC-TMA-4512',
      notas: ''
    });
    setShowNewWoModal(true);
  };

  const handleCreateWorkOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newWoForm.titulo.trim()) {
      showToast('El título de la orden de trabajo es obligatorio', true);
      return;
    }
    setActionLoading(true);
    try {
      const created = await api.createMaintenanceWorkOrder({
        matricula: newWoForm.matricula,
        tipo: newWoForm.tipo,
        titulo: newWoForm.titulo.trim(),
        descripcion: newWoForm.descripcion.trim() || 'Inspección y verificación técnica de aeronave según manual aplicable.',
        estado: 'abierta',
        prioridad: newWoForm.prioridad,
        fecha_apertura: todayStr,
        fecha_estimada_entrega: newWoForm.fecha_estimada_entrega || undefined,
        horas_aeronave_entrada: Number(newWoForm.horas_aeronave_entrada) || 0,
        tecnico_responsable: newWoForm.tecnico_responsable.trim(),
        licencia_tma: newWoForm.licencia_tma.trim(),
        notas: newWoForm.notas.trim() || undefined,
        retorno_al_servicio: { aprobado: false }
      });
      showToast(`Orden ${created.id} emitida correctamente para ${created.matricula}`);
      setShowNewWoModal(false);
      await loadData();
      if (onRefreshAll) onRefreshAll();
    } catch (err: any) {
      showToast(err.message || 'Error al emitir orden de trabajo', true);
    } finally {
      setActionLoading(false);
    }
  };

  const handleOpenEditModal = (wo: MaintenanceWorkOrder) => {
    setSelectedEditWo(wo);
    setEditForm({
      estado: wo.estado,
      prioridad: wo.prioridad,
      fecha_estimada_entrega: wo.fecha_estimada_entrega || '',
      tecnico_responsable: wo.tecnico_responsable,
      licencia_tma: wo.licencia_tma,
      trabajo_realizado: wo.trabajo_realizado || '',
      notas: wo.notas || '',
      partes_utilizadas: wo.partes_utilizadas ? [...wo.partes_utilizadas] : []
    });
    setNewPartRow({ item: '', numero_parte: '', cantidad: 1, costo_unitario: 0 });
  };

  const handleAddPartRow = () => {
    if (!newPartRow.item.trim() || !newPartRow.numero_parte.trim()) {
      showToast('Ingresa descripción y número de parte (P/N) del repuesto', true);
      return;
    }
    setEditForm(prev => ({
      ...prev,
      partes_utilizadas: [
        ...prev.partes_utilizadas,
        {
          item: newPartRow.item.trim(),
          numero_parte: newPartRow.numero_parte.trim().toUpperCase(),
          cantidad: Number(newPartRow.cantidad) || 1,
          costo_unitario: Number(newPartRow.costo_unitario) || 0
        }
      ]
    }));
    setNewPartRow({ item: '', numero_parte: '', cantidad: 1, costo_unitario: 0 });
  };

  const handleRemovePartRow = (index: number) => {
    setEditForm(prev => ({
      ...prev,
      partes_utilizadas: prev.partes_utilizadas.filter((_, idx) => idx !== index)
    }));
  };

  const handleSaveEditWo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEditWo) return;
    setActionLoading(true);
    try {
      const updated = await api.updateMaintenanceWorkOrder(
        selectedEditWo.id,
        {
          estado: editForm.estado,
          prioridad: editForm.prioridad,
          fecha_estimada_entrega: editForm.fecha_estimada_entrega || undefined,
          tecnico_responsable: editForm.tecnico_responsable.trim(),
          licencia_tma: editForm.licencia_tma.trim(),
          trabajo_realizado: editForm.trabajo_realizado.trim() || undefined,
          notas: editForm.notas.trim() || undefined,
          partes_utilizadas: editForm.partes_utilizadas
        },
        currentUser.nombre
      );
      showToast(`Orden ${updated.id} actualizada (${WORK_ORDER_STATUS_LABELS[updated.estado]})`);
      setSelectedEditWo(null);
      if (selectedDetailWo?.id === updated.id) {
        setSelectedDetailWo(updated);
      }
      await loadData();
      if (onRefreshAll) onRefreshAll();
    } catch (err: any) {
      showToast(err.message || 'Error al actualizar orden de trabajo', true);
    } finally {
      setActionLoading(false);
    }
  };

  const handleOpenRtsModal = (wo: MaintenanceWorkOrder) => {
    const ac = aircraftByMatricula[wo.matricula.toUpperCase()];
    setSelectedRtsWo(wo);
    setRtsTachSalida(ac ? ac.horas_totales_celula : wo.horas_aeronave_entrada);
    setRtsTmaName(currentUser.rol === 'mantenimiento' ? currentUser.nombre : wo.tecnico_responsable || 'Ing. Carlos Mendoza');
    setRtsTmaLic(currentUser.licencia || wo.licencia_tma || 'AAC-TMA-4512');
    setRtsResetCounter(
      wo.tipo === 'inspeccion_100h' ||
        wo.tipo === 'inspeccion_50h' ||
        wo.tipo === 'servicio_aceite' ||
        Boolean(ac && (ac.horas_restantes_50h <= 0 || ac.horas_restantes_100h <= 0))
    );
    setRtsResolveSquawks(true);
    setRtsDeclaration(
      `Certifico que la aeronave ${wo.matricula} ha sido inspeccionada y reparada conforme a los Reglamentos RAC 43 y RAC 145 de la AAC Panamá y manuales del fabricante, encontrándose en condición AERONAVEGABLE para retorno al servicio operacional.`
    );
  };

  const handleConfirmRts = async () => {
    if (!selectedRtsWo) return;
    if (!rtsTmaName.trim() || !rtsTmaLic.trim()) {
      showToast('El nombre del técnico certificador y su licencia TMA son obligatorios', true);
      return;
    }
    setActionLoading(true);
    try {
      const targetAc = aircraftByMatricula[selectedRtsWo.matricula.toUpperCase()];
      const is100hOverdue = Boolean(targetAc && targetAc.horas_restantes_100h <= 0);
      const is50hOverdue = Boolean(targetAc && targetAc.horas_restantes_50h <= 0);
      const res = await api.returnAircraftToService(selectedRtsWo.id, {
        firmado_por: rtsTmaName.trim(),
        licencia_firmante: rtsTmaLic.trim(),
        declaracion: rtsDeclaration.trim(),
        horas_salida: Number(rtsTachSalida),
        reset100h: selectedRtsWo.tipo === 'inspeccion_100h' || (rtsResetCounter && is100hOverdue),
        reset50h: selectedRtsWo.tipo === 'inspeccion_50h' || selectedRtsWo.tipo === 'servicio_aceite' || (rtsResetCounter && is50hOverdue),
        resolveAogSquawks: rtsResolveSquawks
      });
      showToast(res.message);
      setSelectedRtsWo(null);
      if (selectedDetailWo?.id === res.workOrder.id) {
        setSelectedDetailWo(res.workOrder);
      }
      await loadData();
      if (onRefreshAll) onRefreshAll();
    } catch (err: any) {
      showToast(err.message || 'Error al emitir certificación RTS', true);
    } finally {
      setActionLoading(false);
    }
  };

  if (!isAllowed) {
    return (
      <div className="bg-slate-900 p-8 rounded-xl border border-slate-800 shadow-sm text-center max-w-lg mx-auto my-12 space-y-4">
        <div className="w-14 h-14 rounded-xl bg-red-950/50 border border-red-500/40 text-red-400 flex items-center justify-center mx-auto">
          <ShieldAlert className="w-7 h-7" />
        </div>
        <h2 className="text-base font-semibold text-white tracking-tight">
          Acceso Restringido a Órdenes de Trabajo de Taller
        </h2>
        {onNavigateTab && (
          <div className="pt-2">
            <button
              onClick={() => onNavigateTab('inicio')}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-100 border border-slate-700 rounded-lg text-xs font-medium transition-colors cursor-pointer"
            >
              Volver al Inicio
            </button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-12">
      {/* Toast Notification */}
      {toastMessage && (
        <div
          className={`fixed top-4 right-4 z-50 flex items-center gap-2.5 px-4 py-3 rounded-lg shadow-xl text-xs font-semibold text-white ${
            toastMessage.isError ? 'bg-red-600' : 'bg-slate-900 border border-slate-700'
          }`}
        >
          {toastMessage.isError ? (
            <AlertOctagon className="w-4 h-4 flex-shrink-0" />
          ) : (
            <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
          )}
          <span>{toastMessage.text}</span>
        </div>
      )}

      {/* Header Banner */}
      <header className="bg-slate-950 text-white rounded-xl border border-slate-800 p-5 sm:p-6">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
              Órdenes de Trabajo de Taller
            </h1>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            {onNavigateTab && (
              <button
                type="button"
                onClick={() => onNavigateTab('taller_mantenimiento')}
                className="inline-flex items-center gap-2 px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-700 rounded-lg text-xs font-semibold transition-colors cursor-pointer"
              >
                <Wrench className="w-3.5 h-3.5 text-slate-400" />
                <span>Módulo Taller OMA</span>
              </button>
            )}

            <button
              type="button"
              onClick={loadData}
              disabled={loading}
              className="inline-flex items-center gap-2 px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-700 rounded-lg text-xs font-semibold transition-colors cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-sky-400' : 'text-slate-400'}`} />
              <span>Actualizar</span>
            </button>

            <button
              type="button"
              onClick={handleOpenNewModal}
              className="inline-flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-500 text-white rounded-lg text-xs font-semibold transition-colors cursor-pointer"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Nueva Orden de Trabajo</span>
            </button>
          </div>
        </div>
      </header>

      {/* Executive Summary Strip */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4">
          <div className="text-xs font-medium text-slate-500 dark:text-slate-400">
            Órdenes Registradas
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-2xl font-bold text-slate-900 dark:text-white font-mono tabular-nums">
              {metrics.total}
            </span>
            <span className="text-xs text-slate-500 dark:text-slate-400 font-mono tabular-nums">
              {metrics.activeTotal} activas · {metrics.closed} RTS
            </span>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4">
          <div className="text-xs font-medium text-slate-500 dark:text-slate-400">
            Ejecución en Hangar
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-2xl font-bold text-slate-900 dark:text-white font-mono tabular-nums">
              {metrics.open + metrics.inProgress + metrics.waitingParts + metrics.qc}
            </span>
            <span className="text-xs text-slate-500 dark:text-slate-400 font-mono tabular-nums">
              {metrics.inProgress} progreso · {metrics.waitingParts} repuestos
            </span>
          </div>
        </div>

        <div
          className={`rounded-xl border p-4 ${
            metrics.aogActive > 0
              ? 'bg-red-50/70 dark:bg-red-950/30 border-red-300 dark:border-red-800/70'
              : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800'
          }`}
        >
          <div
            className={`text-xs font-medium ${
              metrics.aogActive > 0
                ? 'text-red-700 dark:text-red-400'
                : 'text-slate-500 dark:text-slate-400'
            }`}
          >
            Prioridad AOG Crítico & Alta
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <span
              className={`text-2xl font-bold font-mono tabular-nums ${
                metrics.aogActive > 0
                  ? 'text-red-600 dark:text-red-400'
                  : 'text-slate-900 dark:text-white'
              }`}
            >
              {metrics.aogActive + metrics.highActive}
            </span>
            <span
              className={`text-xs font-mono tabular-nums ${
                metrics.aogActive > 0
                  ? 'text-red-700 dark:text-red-300 font-semibold'
                  : 'text-slate-500 dark:text-slate-400'
              }`}
            >
              {metrics.aogActive} AOG · {metrics.highActive} alta
            </span>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4">
          <div className="text-xs font-medium text-slate-500 dark:text-slate-400">
            Cumplimiento & Retorno al Servicio
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-2xl font-bold text-slate-900 dark:text-white font-mono tabular-nums">
              {metrics.rtsRate}%
            </span>
            <span className="text-xs text-slate-500 dark:text-slate-400 font-mono tabular-nums">
              {metrics.qc} en inspección final
            </span>
          </div>
        </div>
      </section>

      {/* Filter & Search Bar */}
      <section className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4 space-y-3">
        <div className="flex flex-wrap items-center gap-1.5 bg-slate-100 dark:bg-slate-950 p-1 rounded-lg border border-slate-200 dark:border-slate-800">
          {(
            [
              { id: 'TODAS', label: `Todas (${metrics.total})` },
              { id: 'abierta', label: `Abiertas (${metrics.open})` },
              { id: 'en_progreso', label: `En Progreso (${metrics.inProgress})` },
              { id: 'espera_repuestos', label: `Espera Repuestos (${metrics.waitingParts})` },
              { id: 'inspeccion_calidad', label: `Insp. Calidad (${metrics.qc})` },
              { id: 'cerrada_conforme', label: `Cerradas RTS (${metrics.closed})` }
            ] as const
          ).map(tab => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setStatusFilter(tab.id)}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors cursor-pointer ${
                statusFilter === tab.id
                  ? 'bg-slate-900 text-white dark:bg-slate-800'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-12 gap-3">
          <div className="lg:col-span-6 relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Buscar por número OT, matrícula, título, técnico TMA o licencia..."
              className="w-full pl-9 pr-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white focus:outline-none focus:border-slate-500"
            />
          </div>

          <div className="lg:col-span-3 flex items-center gap-2">
            <Filter className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
            <select
              value={matriculaFilter}
              onChange={e => setMatriculaFilter(e.target.value)}
              aria-label="Filtrar por aeronave"
              className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white font-medium"
            >
              <option value="TODAS">Todas las Aeronaves ({aircraftList.length})</option>
              {aircraftList.map(ac => (
                <option key={ac.matricula} value={ac.matricula}>
                  {ac.matricula} — {ac.modelo}
                </option>
              ))}
            </select>
          </div>

          <div className="lg:col-span-3">
            <select
              value={priorityFilter}
              onChange={e => setPriorityFilter(e.target.value as any)}
              aria-label="Filtrar por prioridad"
              className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white font-medium"
            >
              <option value="TODAS">Todas las Prioridades</option>
              <option value="aog_critico">AOG Crítico</option>
              <option value="alta">Prioridad Alta</option>
              <option value="media">Prioridad Media</option>
              <option value="baja">Prioridad Baja</option>
            </select>
          </div>
        </div>
      </section>

      {/* Work Orders Table & Mobile List */}
      {loading ? (
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-12 text-center text-xs text-slate-500 dark:text-slate-400">
          Cargando registro oficial de órdenes de trabajo...
        </div>
      ) : filteredOrders.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-12 text-center space-y-2">
          <ClipboardList className="w-8 h-8 text-slate-300 dark:text-slate-700 mx-auto" />
          <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">
            Sin órdenes de trabajo
          </p>
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
          {/* Desktop Table */}
          <div className="hidden lg:block overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-950 text-slate-300 text-xs font-semibold border-b border-slate-800">
                  <th className="py-3 px-4">Orden & Fechas</th>
                  <th className="py-3 px-4">Aeronave</th>
                  <th className="py-3 px-4">Trabajo Solicitado & Tipo</th>
                  <th className="py-3 px-4">Prioridad</th>
                  <th className="py-3 px-4">Estado</th>
                  <th className="py-3 px-4">TMA & Horómetro</th>
                  <th className="py-3 px-4 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800 text-xs">
                {filteredOrders.map(wo => {
                  const ac = aircraftByMatricula[wo.matricula.toUpperCase()];
                  const isClosed = wo.estado === 'cerrada_conforme';
                  const isOverdue =
                    !isClosed && Boolean(wo.fecha_estimada_entrega && wo.fecha_estimada_entrega < todayStr);
                  const partsCount = wo.partes_utilizadas?.length || 0;

                  return (
                    <tr
                      key={wo.id}
                      className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors align-top"
                    >
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div className="font-mono tabular-nums font-bold text-slate-900 dark:text-white">
                          {wo.id}
                        </div>
                        <div className="text-[11px] text-slate-500 dark:text-slate-400 font-mono tabular-nums mt-0.5">
                          Apertura: {wo.fecha_apertura}
                        </div>
                        {isClosed && wo.fecha_cierre ? (
                          <div className="text-[11px] text-emerald-700 dark:text-emerald-400 font-mono tabular-nums">
                            Cierre: {wo.fecha_cierre}
                          </div>
                        ) : wo.fecha_estimada_entrega ? (
                          <div
                            className={`text-[11px] font-mono tabular-nums ${
                              isOverdue
                                ? 'text-red-600 dark:text-red-400 font-semibold'
                                : 'text-slate-500 dark:text-slate-400'
                            }`}
                          >
                            Entrega est.: {wo.fecha_estimada_entrega}
                            {isOverdue ? ' (Vencida)' : ''}
                          </div>
                        ) : null}
                      </td>

                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div className="font-mono tabular-nums font-bold text-slate-900 dark:text-white">
                          {wo.matricula}
                        </div>
                        <div className="text-[11px] text-slate-500 dark:text-slate-400">
                          {ac ? ac.modelo : 'Cessna / Piper Flota'}
                        </div>
                        {ac && ac.bloqueo_despacho && (
                          <div className="text-[11px] font-semibold text-red-600 dark:text-red-400 mt-0.5">
                            AOG Bloqueada
                          </div>
                        )}
                      </td>

                      <td className="py-3.5 px-4 max-w-md">
                        <div className="font-semibold text-slate-900 dark:text-white leading-snug">
                          {wo.titulo}
                        </div>
                        <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 flex flex-wrap items-center gap-1.5">
                          <span>{WORK_ORDER_TYPE_LABELS[wo.tipo] || wo.tipo}</span>
                          {partsCount > 0 && (
                            <>
                              <span aria-hidden="true">·</span>
                              <span className="font-mono tabular-nums">{partsCount} repuesto{partsCount > 1 ? 's' : ''}</span>
                            </>
                          )}
                        </div>
                        {wo.descripcion && (
                          <p className="text-[11px] text-slate-600 dark:text-slate-400 mt-1 line-clamp-2 leading-relaxed">
                            {wo.descripcion}
                          </p>
                        )}
                      </td>

                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span
                          className={`font-semibold ${
                            wo.prioridad === 'aog_critico'
                              ? 'text-red-600 dark:text-red-400'
                              : wo.prioridad === 'alta'
                              ? 'text-amber-700 dark:text-amber-400'
                              : wo.prioridad === 'media'
                              ? 'text-sky-700 dark:text-sky-400'
                              : 'text-slate-600 dark:text-slate-400'
                          }`}
                        >
                          {PRIORITY_LABELS[wo.prioridad]}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div
                          className={`font-semibold ${
                            isClosed
                              ? 'text-emerald-700 dark:text-emerald-400'
                              : wo.estado === 'inspeccion_calidad'
                              ? 'text-sky-700 dark:text-sky-400'
                              : wo.estado === 'espera_repuestos'
                              ? 'text-amber-700 dark:text-amber-400'
                              : 'text-slate-900 dark:text-slate-200'
                          }`}
                        >
                          {WORK_ORDER_STATUS_LABELS[wo.estado]}
                        </div>
                        {isClosed && wo.retorno_al_servicio?.firmado_por && (
                          <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                            RTS: {wo.retorno_al_servicio.firmado_por}
                          </div>
                        )}
                      </td>

                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div className="font-medium text-slate-800 dark:text-slate-200">
                          {wo.tecnico_responsable}
                        </div>
                        <div className="text-[11px] font-mono text-slate-500 dark:text-slate-400">
                          {wo.licencia_tma}
                        </div>
                        <div className="text-[11px] font-mono tabular-nums text-slate-500 dark:text-slate-400 mt-0.5">
                          Tach: {wo.horas_aeronave_entrada.toFixed(1)}h
                          {wo.horas_aeronave_salida
                            ? ` → ${wo.horas_aeronave_salida.toFixed(1)}h`
                            : ''}
                        </div>
                      </td>

                      <td className="py-3.5 px-4 whitespace-nowrap text-right">
                        <div className="inline-flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => setSelectedDetailWo(wo)}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-semibold transition-colors cursor-pointer"
                            title="Ver expediente completo de orden"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>Ver</span>
                          </button>

                          {!isClosed && (
                            <>
                              <button
                                type="button"
                                onClick={() => handleOpenEditModal(wo)}
                                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 font-semibold transition-colors cursor-pointer"
                                title="Actualizar estado, avance o repuestos"
                              >
                                <Edit3 className="w-3.5 h-3.5" />
                                <span>Actualizar</span>
                              </button>

                              <button
                                type="button"
                                onClick={() => handleOpenRtsModal(wo)}
                                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 dark:bg-emerald-600 dark:hover:bg-emerald-500 text-white font-semibold transition-colors cursor-pointer"
                                title="Certificar Retorno al Servicio (RTS)"
                              >
                                <FileCheck2 className="w-3.5 h-3.5" />
                                <span>RTS</span>
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile / Tablet Responsive List */}
          <div className="lg:hidden divide-y divide-slate-200 dark:divide-slate-800">
            {filteredOrders.map(wo => {
              const isClosed = wo.estado === 'cerrada_conforme';
              const ac = aircraftByMatricula[wo.matricula.toUpperCase()];
              return (
                <div key={wo.id} className="p-4 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2 text-xs">
                        <span className="font-mono tabular-nums font-bold text-slate-900 dark:text-white">
                          {wo.id}
                        </span>
                        <span aria-hidden="true" className="text-slate-400">·</span>
                        <span className="font-mono font-bold text-slate-700 dark:text-slate-300">
                          {wo.matricula}
                        </span>
                        {ac && (
                          <>
                            <span aria-hidden="true" className="text-slate-400">·</span>
                            <span className="text-slate-500 dark:text-slate-400">{ac.modelo}</span>
                          </>
                        )}
                      </div>
                      <h3 className="text-sm font-semibold text-slate-900 dark:text-white mt-1">
                        {wo.titulo}
                      </h3>
                    </div>
                    <span
                      className={`text-xs font-semibold shrink-0 ${
                        wo.prioridad === 'aog_critico'
                          ? 'text-red-600 dark:text-red-400'
                          : 'text-slate-600 dark:text-slate-300'
                      }`}
                    >
                      {PRIORITY_LABELS[wo.prioridad]}
                    </span>
                  </div>

                  <div className="text-xs text-slate-500 dark:text-slate-400 flex flex-wrap items-center gap-x-3 gap-y-1">
                    <span>{WORK_ORDER_STATUS_LABELS[wo.estado]}</span>
                    <span aria-hidden="true">·</span>
                    <span>{WORK_ORDER_TYPE_LABELS[wo.tipo] || wo.tipo}</span>
                    <span aria-hidden="true">·</span>
                    <span className="font-mono tabular-nums">Apertura {wo.fecha_apertura}</span>
                    <span aria-hidden="true">·</span>
                    <span>{wo.tecnico_responsable}</span>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => setSelectedDetailWo(wo)}
                      className="px-3 py-2 text-xs font-semibold rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-200 cursor-pointer"
                    >
                      Ver Detalle
                    </button>
                    {!isClosed && (
                      <>
                        <button
                          type="button"
                          onClick={() => handleOpenEditModal(wo)}
                          className="px-3 py-2 text-xs font-semibold rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 cursor-pointer"
                        >
                          Actualizar
                        </button>
                        <button
                          type="button"
                          onClick={() => handleOpenRtsModal(wo)}
                          className="px-3 py-2 text-xs font-semibold rounded-lg bg-slate-900 dark:bg-emerald-600 text-white cursor-pointer"
                        >
                          Certificar RTS
                        </button>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* =====================================================================
          MODAL 1: DETALLE COMPLETO & EXPEDIENTE DE ORDEN DE TRABAJO
          ===================================================================== */}
      {selectedDetailWo && (() => {
        const wo = selectedDetailWo;
        const ac = aircraftByMatricula[wo.matricula.toUpperCase()];
        const partsCost = (wo.partes_utilizadas || []).reduce(
          (sum, p) => sum + (p.costo_unitario || 0) * (p.cantidad || 0),
          0
        );
        const linkedSquawks = squawks.filter(
          s => s.orden_trabajo_id === wo.id || (s.matricula === wo.matricula && s.estado !== 'resuelto')
        );
        const linkedMovements = movements.filter(m => m.orden_trabajo_id === wo.id);

        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs">
            <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 max-w-3xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
              <div className="px-6 py-4 bg-slate-950 text-white flex items-center justify-between border-b border-slate-800 shrink-0">
                <div>
                  <div className="flex items-center gap-2 text-xs text-slate-400">
                    <span className="font-mono font-bold text-white">{wo.id}</span>
                    <span aria-hidden="true">·</span>
                    <span className="font-mono font-semibold text-slate-200">{wo.matricula}</span>
                    {ac && (
                      <>
                        <span aria-hidden="true">·</span>
                        <span>{ac.modelo}</span>
                      </>
                    )}
                  </div>
                  <h3 className="text-base font-bold text-white mt-0.5">{wo.titulo}</h3>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => window.print()}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-white border border-slate-700 cursor-pointer"
                  >
                    <Printer className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Imprimir</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedDetailWo(null)}
                    className="p-1.5 text-slate-400 hover:text-white rounded-lg cursor-pointer"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              <div className="p-6 flex-1 min-h-0 overflow-y-auto space-y-5 text-xs">
                {/* Key Specs Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
                  <div>
                    <div className="text-[11px] text-slate-500 dark:text-slate-400">Estado</div>
                    <div className="font-semibold text-slate-900 dark:text-white mt-0.5">
                      {WORK_ORDER_STATUS_LABELS[wo.estado]}
                    </div>
                  </div>
                  <div>
                    <div className="text-[11px] text-slate-500 dark:text-slate-400">Prioridad</div>
                    <div
                      className={`font-semibold mt-0.5 ${
                        wo.prioridad === 'aog_critico'
                          ? 'text-red-600 dark:text-red-400'
                          : 'text-slate-900 dark:text-white'
                      }`}
                    >
                      {PRIORITY_LABELS[wo.prioridad]}
                    </div>
                  </div>
                  <div>
                    <div className="text-[11px] text-slate-500 dark:text-slate-400">Tach Entrada / Salida</div>
                    <div className="font-mono tabular-nums font-semibold text-slate-900 dark:text-white mt-0.5">
                      {wo.horas_aeronave_entrada.toFixed(1)}h
                      {wo.horas_aeronave_salida ? ` / ${wo.horas_aeronave_salida.toFixed(1)}h` : ''}
                    </div>
                  </div>
                  <div>
                    <div className="text-[11px] text-slate-500 dark:text-slate-400">TMA Responsable</div>
                    <div className="font-semibold text-slate-900 dark:text-white mt-0.5">
                      {wo.tecnico_responsable} ({wo.licencia_tma})
                    </div>
                  </div>
                </div>

                {/* Alcance Técnico & Trabajos Realizados */}
                <div className="space-y-3">
                  <div>
                    <h4 className="text-xs font-semibold text-slate-900 dark:text-white mb-1">
                      Alcance Técnico Solicitado
                    </h4>
                    <p className="text-slate-600 dark:text-slate-300 leading-relaxed p-3 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
                      {wo.descripcion}
                    </p>
                  </div>

                  <div>
                    <h4 className="text-xs font-semibold text-slate-900 dark:text-white mb-1">
                      Registro de Trabajos Realizados en Taller
                    </h4>
                    <p className="text-slate-600 dark:text-slate-300 leading-relaxed p-3 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
                      {wo.trabajo_realizado || 'Sin reporte técnico registrado aún.'}
                    </p>
                  </div>

                  {wo.notas && (
                    <div>
                      <h4 className="text-xs font-semibold text-slate-900 dark:text-white mb-1">
                        Notas Operativas / Coordinación
                      </h4>
                      <p className="text-slate-600 dark:text-slate-300 leading-relaxed p-3 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
                        {wo.notas}
                      </p>
                    </div>
                  )}
                </div>

                {/* Partes & Insumos Utilizados */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-xs font-semibold text-slate-900 dark:text-white">
                      Repuestos e Insumos Utilizados
                    </h4>
                    {partsCost > 0 && (
                      <span className="font-mono tabular-nums font-semibold text-slate-700 dark:text-slate-300">
                        Total Materiales: ${partsCost.toFixed(2)}
                      </span>
                    )}
                  </div>
                  {wo.partes_utilizadas && wo.partes_utilizadas.length > 0 ? (
                    <div className="rounded-lg border border-slate-200 dark:border-slate-800 overflow-hidden">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-slate-50 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 text-slate-500">
                          <tr>
                            <th className="py-2 px-3">Descripción</th>
                            <th className="py-2 px-3">Número de Parte (P/N)</th>
                            <th className="py-2 px-3 text-right">Cant.</th>
                            <th className="py-2 px-3 text-right">Subtotal</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                          {wo.partes_utilizadas.map((p, idx) => (
                            <tr key={`${p.numero_parte}-${idx}`}>
                              <td className="py-2 px-3 text-slate-800 dark:text-slate-200">{p.item}</td>
                              <td className="py-2 px-3 font-mono text-slate-600 dark:text-slate-400">
                                {p.numero_parte}
                              </td>
                              <td className="py-2 px-3 text-right font-mono tabular-nums">{p.cantidad}</td>
                              <td className="py-2 px-3 text-right font-mono tabular-nums">
                                ${((p.costo_unitario || 0) * p.cantidad).toFixed(2)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="text-slate-500 dark:text-slate-400 italic">
                      No se han imputado repuestos ni consumibles en esta orden todavía.
                    </div>
                  )}
                </div>

                {/* Linked Traceability */}
                {(linkedSquawks.length > 0 || linkedMovements.length > 0) && (
                  <div className="space-y-2 pt-2 border-t border-slate-200 dark:border-slate-800">
                    <h4 className="text-xs font-semibold text-slate-900 dark:text-white">
                      Trazabilidad Asociada (Discrepancias & Movimientos)
                    </h4>
                    <div className="space-y-1.5">
                      {linkedSquawks.map(sq => (
                        <div
                          key={sq.id}
                          className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 flex items-center justify-between gap-2"
                        >
                          <div>
                            <span className="font-mono font-semibold text-slate-900 dark:text-white">
                              {sq.id}
                            </span>{' '}
                            · <span className="text-slate-600 dark:text-slate-300">{sq.descripcion}</span>
                          </div>
                          <span className="font-semibold text-slate-600 dark:text-slate-400 shrink-0">
                            {sq.estado}
                          </span>
                        </div>
                      ))}
                      {linkedMovements.map(mv => (
                        <div
                          key={mv.id}
                          className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 flex items-center justify-between gap-2"
                        >
                          <div>
                            <span className="font-mono font-semibold text-slate-900 dark:text-white">
                              {mv.id}
                            </span>{' '}
                            ({mv.tipo === 'entrada' ? 'Entrada a Hangar' : 'Salida de Taller'}) ·{' '}
                            <span className="text-slate-600 dark:text-slate-300">{mv.motivo_principal}</span>
                          </div>
                          <span className="font-mono tabular-nums text-slate-500 shrink-0">
                            {mv.fecha} {mv.hora}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Retorno al Servicio (RTS) */}
                <div
                  className={`p-4 rounded-xl border ${
                    wo.retorno_al_servicio?.aprobado
                      ? 'bg-emerald-50/70 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800'
                      : 'bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <h4 className="font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                      <Award className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                      <span>Certificación de Retorno al Servicio (RTS — RAC 43 / RAC 145)</span>
                    </h4>
                    <span className="font-semibold text-slate-700 dark:text-slate-300">
                      {wo.retorno_al_servicio?.aprobado ? 'Aprobado y Firmado' : 'Pendiente de Firma'}
                    </span>
                  </div>

                  {wo.retorno_al_servicio?.aprobado ? (
                    <div className="mt-2 space-y-1 text-slate-700 dark:text-slate-300">
                      <p className="leading-relaxed">{wo.retorno_al_servicio.declaracion}</p>
                      <div className="pt-1 font-mono text-[11px] text-slate-500 dark:text-slate-400">
                        Firmado por: {wo.retorno_al_servicio.firmado_por} (
                        {wo.retorno_al_servicio.licencia_firmante}) ·{' '}
                        {wo.retorno_al_servicio.fecha_firma?.slice(0, 10)}
                      </div>
                    </div>
                  ) : (
                    <p className="mt-1.5 text-slate-500 dark:text-slate-400">
                      {wo.retorno_al_servicio?.declaracion ||
                        'La aeronave permanecerá sujeta a inspección de taller hasta completar los trabajos y firmar el Retorno al Servicio.'}
                    </p>
                  )}
                </div>
              </div>

              <div className="px-6 py-3.5 bg-slate-50 dark:bg-slate-950 border-t border-slate-200 dark:border-slate-800 flex items-center justify-end gap-2">
                {wo.estado !== 'cerrada_conforme' && (
                  <>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedDetailWo(null);
                        handleOpenEditModal(wo);
                      }}
                      className="px-3.5 py-2 rounded-lg border border-slate-300 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                    >
                      Editar / Actualizar Avance
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedDetailWo(null);
                        handleOpenRtsModal(wo);
                      }}
                      className="px-3.5 py-2 rounded-lg bg-slate-900 dark:bg-emerald-600 text-white text-xs font-semibold hover:bg-slate-800 dark:hover:bg-emerald-500 cursor-pointer"
                    >
                      Certificar Retorno al Servicio (RTS)
                    </button>
                  </>
                )}
                <button
                  type="button"
                  onClick={() => setSelectedDetailWo(null)}
                  className="px-4 py-2 rounded-lg bg-slate-200 dark:bg-slate-800 text-slate-800 dark:text-slate-200 text-xs font-semibold cursor-pointer"
                >
                  Cerrar
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* =====================================================================
          MODAL 2: ACTUALIZAR AVANCE, ESTADO Y REPUESTOS
          ===================================================================== */}
      {selectedEditWo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 max-w-2xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
            <div className="px-6 py-4 bg-slate-950 text-white flex items-center justify-between border-b border-slate-800 shrink-0">
              <div>
                <div className="text-xs text-slate-400 font-mono">
                  {selectedEditWo.id} · {selectedEditWo.matricula}
                </div>
                <h3 className="text-base font-bold text-white">Actualizar Orden de Trabajo</h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedEditWo(null)}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEditWo} className="p-6 flex-1 min-h-0 overflow-y-auto space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Estado Operativo:
                  </label>
                  <select
                    value={editForm.estado}
                    onChange={e => setEditForm(prev => ({ ...prev, estado: e.target.value as WorkOrderStatus }))}
                    className="w-full p-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white font-semibold"
                  >
                    <option value="abierta">Abierta</option>
                    <option value="en_progreso">En Progreso</option>
                    <option value="espera_repuestos">Espera de Repuestos</option>
                    <option value="inspeccion_calidad">Inspección de Calidad</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Prioridad:
                  </label>
                  <select
                    value={editForm.prioridad}
                    onChange={e =>
                      setEditForm(prev => ({
                        ...prev,
                        prioridad: e.target.value as MaintenanceWorkOrder['prioridad']
                      }))
                    }
                    className="w-full p-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white font-semibold"
                  >
                    <option value="baja">Baja</option>
                    <option value="media">Media</option>
                    <option value="alta">Alta</option>
                    <option value="aog_critico">AOG Crítico</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Fecha Estimada Entrega:
                  </label>
                  <input
                    type="date"
                    value={editForm.fecha_estimada_entrega}
                    onChange={e => setEditForm(prev => ({ ...prev, fecha_estimada_entrega: e.target.value }))}
                    className="w-full p-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    TMA Responsable:
                  </label>
                  <input
                    type="text"
                    required
                    value={editForm.tecnico_responsable}
                    onChange={e => setEditForm(prev => ({ ...prev, tecnico_responsable: e.target.value }))}
                    className="w-full p-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Licencia TMA:
                  </label>
                  <input
                    type="text"
                    required
                    value={editForm.licencia_tma}
                    onChange={e => setEditForm(prev => ({ ...prev, licencia_tma: e.target.value }))}
                    className="w-full p-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Bitácora de Trabajos Realizados:
                </label>
                <textarea
                  rows={3}
                  value={editForm.trabajo_realizado}
                  onChange={e => setEditForm(prev => ({ ...prev, trabajo_realizado: e.target.value }))}
                  placeholder="Describe mediciones, pruebas de compresión, inspecciones realizadas..."
                  className="w-full p-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Notas para Dirección / Operaciones:
                </label>
                <textarea
                  rows={2}
                  value={editForm.notas}
                  onChange={e => setEditForm(prev => ({ ...prev, notas: e.target.value }))}
                  placeholder="Observaciones de disponibilidad o repuestos pendientes..."
                  className="w-full p-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white"
                />
              </div>

              {/* Gestión de Repuestos Imputados */}
              <div className="pt-2 border-t border-slate-200 dark:border-slate-800 space-y-2.5">
                <h4 className="font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                  <Package className="w-4 h-4 text-slate-500" />
                  <span>Repuestos e Insumos Utilizados</span>
                </h4>

                {editForm.partes_utilizadas.length > 0 && (
                  <div className="space-y-1.5">
                    {editForm.partes_utilizadas.map((p, idx) => (
                      <div
                        key={`${p.numero_parte}-${idx}`}
                        className="flex items-center justify-between gap-2 p-2 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800"
                      >
                        <div className="min-w-0">
                          <span className="font-medium text-slate-900 dark:text-white">{p.item}</span>
                          <span className="text-slate-400 mx-1.5">·</span>
                          <span className="font-mono text-slate-500">{p.numero_parte}</span>
                          <span className="text-slate-400 mx-1.5">·</span>
                          <span className="font-mono tabular-nums">
                            {p.cantidad} u × ${(p.costo_unitario || 0).toFixed(2)}
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleRemovePartRow(idx)}
                          className="p-1 text-slate-400 hover:text-red-600 cursor-pointer"
                          title="Quitar repuesto"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 items-end">
                  <div className="sm:col-span-5">
                    <input
                      type="text"
                      placeholder="Nombre del repuesto o insumo"
                      value={newPartRow.item}
                      onChange={e => setNewPartRow(prev => ({ ...prev, item: e.target.value }))}
                      className="w-full p-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white"
                    />
                  </div>
                  <div className="sm:col-span-3">
                    <input
                      type="text"
                      placeholder="P/N (ej. CH48108-1)"
                      value={newPartRow.numero_parte}
                      onChange={e => setNewPartRow(prev => ({ ...prev, numero_parte: e.target.value }))}
                      className="w-full p-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white font-mono"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <input
                      type="number"
                      min={1}
                      placeholder="Cant."
                      value={newPartRow.cantidad}
                      onChange={e => setNewPartRow(prev => ({ ...prev, cantidad: Number(e.target.value) || 1 }))}
                      className="w-full p-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white font-mono"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <button
                      type="button"
                      onClick={handleAddPartRow}
                      className="w-full py-2 px-2.5 bg-slate-800 hover:bg-slate-700 text-white font-semibold rounded-lg cursor-pointer"
                    >
                      + Agregar
                    </button>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setSelectedEditWo(null)}
                  className="px-4 py-2 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-4 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 dark:bg-sky-600 dark:hover:bg-sky-500 text-white font-semibold cursor-pointer"
                >
                  {actionLoading ? 'Guardando...' : 'Guardar Cambios'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =====================================================================
          MODAL 3: NUEVA ORDEN DE TRABAJO (OT)
          ===================================================================== */}
      {showNewWoModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 max-w-lg w-full max-h-[90vh] overflow-y-auto my-auto p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <Wrench className="w-5 h-5 text-red-600" />
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Emitir Nueva Orden de Trabajo (OT)
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowNewWoModal(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateWorkOrder} className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Aeronave:
                  </label>
                  <select
                    value={newWoForm.matricula}
                    onChange={e => {
                      const selAc = aircraftList.find(a => a.matricula === e.target.value);
                      setNewWoForm(prev => ({
                        ...prev,
                        matricula: e.target.value,
                        horas_aeronave_entrada: selAc
                          ? selAc.horas_totales_celula
                          : prev.horas_aeronave_entrada
                      }));
                    }}
                    className="w-full p-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white font-semibold"
                  >
                    {aircraftList.map(a => (
                      <option key={a.matricula} value={a.matricula}>
                        {a.matricula} ({a.modelo})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Tipo de Mantenimiento:
                  </label>
                  <select
                    value={newWoForm.tipo}
                    onChange={e => setNewWoForm(prev => ({ ...prev, tipo: e.target.value as WorkOrderType }))}
                    className="w-full p-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white font-semibold"
                  >
                    {Object.entries(WORK_ORDER_TYPE_LABELS).map(([k, lbl]) => (
                      <option key={k} value={k}>
                        {lbl}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Título de la Orden:
                </label>
                <input
                  type="text"
                  required
                  placeholder="ej. Inspección periódica 100 horas y servicio de bujías"
                  value={newWoForm.titulo}
                  onChange={e => setNewWoForm(prev => ({ ...prev, titulo: e.target.value }))}
                  className="w-full p-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Alcance Técnico y Tareas a Desarrollar:
                </label>
                <textarea
                  rows={3}
                  placeholder="Detalla los trabajos requeridos, manuales aplicables (AMM/CMM) y pruebas en tierra."
                  value={newWoForm.descripcion}
                  onChange={e => setNewWoForm(prev => ({ ...prev, descripcion: e.target.value }))}
                  className="w-full p-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Prioridad:
                  </label>
                  <select
                    value={newWoForm.prioridad}
                    onChange={e =>
                      setNewWoForm(prev => ({
                        ...prev,
                        prioridad: e.target.value as MaintenanceWorkOrder['prioridad']
                      }))
                    }
                    className="w-full p-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white font-semibold"
                  >
                    <option value="baja">Baja</option>
                    <option value="media">Media</option>
                    <option value="alta">Alta</option>
                    <option value="aog_critico">AOG Crítico</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Tach Entrada:
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    value={newWoForm.horas_aeronave_entrada}
                    onChange={e =>
                      setNewWoForm(prev => ({
                        ...prev,
                        horas_aeronave_entrada: parseFloat(e.target.value) || 0
                      }))
                    }
                    className="w-full p-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white font-mono"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Entrega Estimada:
                  </label>
                  <input
                    type="date"
                    value={newWoForm.fecha_estimada_entrega}
                    onChange={e =>
                      setNewWoForm(prev => ({ ...prev, fecha_estimada_entrega: e.target.value }))
                    }
                    className="w-full p-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    TMA Asignado:
                  </label>
                  <input
                    type="text"
                    required
                    value={newWoForm.tecnico_responsable}
                    onChange={e => setNewWoForm(prev => ({ ...prev, tecnico_responsable: e.target.value }))}
                    className="w-full p-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Licencia TMA:
                  </label>
                  <input
                    type="text"
                    required
                    value={newWoForm.licencia_tma}
                    onChange={e => setNewWoForm(prev => ({ ...prev, licencia_tma: e.target.value }))}
                    className="w-full p-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white font-mono"
                  />
                </div>
              </div>

              {newWoForm.prioridad === 'aog_critico' && (
                <div className="p-2.5 rounded-lg bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 font-medium">
                  La prioridad AOG Crítico inmovilizará automáticamente la aeronave para despacho de vuelos hasta emitir su Retorno al Servicio (RTS).
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowNewWoModal(false)}
                  className="px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold rounded-lg cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white font-semibold rounded-lg cursor-pointer"
                >
                  {actionLoading ? 'Emitiendo...' : 'Emitir Orden de Trabajo'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =====================================================================
          MODAL 4: CERTIFICACIÓN DE RETORNO AL SERVICIO (RTS)
          ===================================================================== */}
      {selectedRtsWo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 max-w-lg w-full max-h-[90vh] overflow-y-auto my-auto p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <FileCheck2 className="w-5 h-5 text-emerald-600" />
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">
                    Certificar Retorno al Servicio (RTS)
                  </h3>
                  <div className="text-xs text-slate-500 font-mono">
                    {selectedRtsWo.id} · {selectedRtsWo.matricula}
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedRtsWo(null)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Horómetro Tach de Salida:
                </label>
                <input
                  type="number"
                  step="0.1"
                  value={rtsTachSalida}
                  onChange={e => setRtsTachSalida(parseFloat(e.target.value) || 0)}
                  className="w-full p-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 font-mono font-bold text-slate-900 dark:text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Técnico Certificador (TMA):
                  </label>
                  <input
                    type="text"
                    required
                    value={rtsTmaName}
                    onChange={e => setRtsTmaName(e.target.value)}
                    className="w-full p-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Licencia AAC No.:
                  </label>
                  <input
                    type="text"
                    required
                    value={rtsTmaLic}
                    onChange={e => setRtsTmaLic(e.target.value)}
                    className="w-full p-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 font-mono text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Declaración Regulatoria (RAC 43 / RAC 145):
                </label>
                <textarea
                  rows={3}
                  value={rtsDeclaration}
                  onChange={e => setRtsDeclaration(e.target.value)}
                  className="w-full p-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white leading-relaxed"
                />
              </div>

              <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-1.5">
                <label className="flex items-center gap-2 text-[11px] font-semibold text-slate-700 dark:text-slate-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={rtsResetCounter}
                    onChange={e => setRtsResetCounter(e.target.checked)}
                    className="rounded text-emerald-600"
                  />
                  <span>Reiniciar ciclo horario de inspección cumplido / vencido (50h / 100h)</span>
                </label>
                <label className="flex items-center gap-2 text-[11px] font-semibold text-slate-700 dark:text-slate-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={rtsResolveSquawks}
                    onChange={e => setRtsResolveSquawks(e.target.checked)}
                    className="rounded text-emerald-600"
                  />
                  <span>Resolver automáticamente discrepancias AOG vinculadas o abiertas de {selectedRtsWo.matricula}</span>
                </label>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setSelectedRtsWo(null)}
                className="px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-semibold rounded-lg cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={actionLoading}
                onClick={handleConfirmRts}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-lg cursor-pointer"
              >
                {actionLoading ? 'Firmando...' : 'Firmar y Emitir RTS'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
