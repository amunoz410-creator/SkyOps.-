import React, { useState, useEffect, useMemo } from 'react';
import {
  User,
  AircraftMaintenanceRecord,
  MaintenanceWorkOrder,
  MaintenanceSquawk,
  MaintenancePartStock,
  AirworthinessDirective,
  WorkOrderStatus,
  WorkOrderType,
  SquawkSeverity,
  SquawkStatus,
  AirworthinessCondition,
  MovementType,
  MovementAirworthinessCondition,
  AircraftWorkshopMovement
} from '../types';
import { api } from '../services/api';
import {
  Wrench,
  Plane,
  AlertTriangle,
  CheckCircle2,
  Clock,
  ShieldAlert,
  ShieldCheck,
  PlusCircle,
  RefreshCw,
  Search,
  Filter,
  FileText,
  Calendar,
  Lock,
  Unlock,
  Check,
  X,
  Package,
  Layers,
  Award,
  AlertOctagon,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  LayoutGrid,
  Table,
  SlidersHorizontal,
  TrendingDown,
  Gauge,
  FileCheck2,
  History,
  Tag,
  Hammer,
  ClipboardList,
  ArrowRightLeft,
  LogIn,
  LogOut,
  BookOpen,
  Hash,
  Printer,
  ExternalLink,
  ArrowRight
} from 'lucide-react';

interface AircraftWorkshopModuleProps {
  currentUser: User;
  onRefreshAll?: () => void;
}

export const AircraftWorkshopModule: React.FC<AircraftWorkshopModuleProps> = ({
  currentUser,
  onRefreshAll
}) => {
  // Navigation subtabs
  const [activeSubTab, setActiveSubTab] = useState<
    'flota' | 'ordenes' | 'squawks' | 'repuestos' | 'directivas' | 'movimientos'
  >('flota');

  // Core Data States
  const [aircraftList, setAircraftList] = useState<AircraftMaintenanceRecord[]>([]);
  const [workOrders, setWorkOrders] = useState<MaintenanceWorkOrder[]>([]);
  const [squawks, setSquawks] = useState<MaintenanceSquawk[]>([]);
  const [parts, setParts] = useState<MaintenancePartStock[]>([]);
  const [directives, setDirectives] = useState<AirworthinessDirective[]>([]);
  const [movements, setMovements] = useState<AircraftWorkshopMovement[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [successToast, setSuccessToast] = useState<string | null>(null);
  const [errorToast, setErrorToast] = useState<string | null>(null);

  // Filters
  const [selectedMatriculaFilter, setSelectedMatriculaFilter] = useState<string>('TODAS');
  const [searchQuery, setSearchQuery] = useState('');
  const [woStatusFilter, setWoStatusFilter] = useState<string>('TODOS');
  const [squawkStatusFilter, setSquawkStatusFilter] = useState<string>('TODOS');
  const [movementTypeFilter, setMovementTypeFilter] = useState<'TODOS' | 'entrada' | 'salida'>('TODOS');
  const [movementConditionFilter, setMovementConditionFilter] = useState<string>('TODAS');

  // Panel de Indicadores (KPIs) de Horas Acumuladas & Inspecciones Programadas 50h/100h
  const [showKpiHoursPanel, setShowKpiHoursPanel] = useState<boolean>(true);
  const [kpiHoursFilter, setKpiHoursFilter] = useState<'TODAS' | 'ALERTA' | 'CESSNA' | 'PIPER'>('TODAS');
  const [kpiHoursSort, setKpiHoursSort] = useState<'urgencia' | 'horas_tt' | 'matricula'>('urgencia');
  const [kpiHoursViewMode, setKpiHoursViewMode] = useState<'cards' | 'table'>('cards');

  // Modals & Movement Form
  const [selectedAircraftForLock, setSelectedAircraftForLock] = useState<AircraftMaintenanceRecord | null>(null);
  const [lockReason, setLockReason] = useState('');
  const [unlockResetOverdue, setUnlockResetOverdue] = useState<boolean>(true);
  const [unlockResolveSquawks, setUnlockResolveSquawks] = useState<boolean>(true);

  const [selectedWoForRTS, setSelectedWoForRTS] = useState<MaintenanceWorkOrder | null>(null);
  const [rtsTmaName, setRtsTmaName] = useState(currentUser.nombre || 'Ing. Carlos Mendoza');
  const [rtsTmaLic, setRtsTmaLic] = useState(currentUser.licencia || 'AAC-TMA-04521');
  const [rtsTachSalida, setRtsTachSalida] = useState<number>(0);
  const [rtsDeclaration, setRtsDeclaration] = useState('');
  const [rtsResetCounter, setRtsResetCounter] = useState<boolean>(false);
  const [rtsResolveSquawks, setRtsResolveSquawks] = useState<boolean>(true);

  const [selectedMovementForDetail, setSelectedMovementForDetail] = useState<AircraftWorkshopMovement | null>(null);
  const [showNewMovementModal, setShowNewMovementModal] = useState(false);

  const [newMovementForm, setNewMovementForm] = useState<{
    tipo: MovementType;
    matricula: string;
    modelo: string;
    fecha: string;
    hora: string;
    tach_hobbs: number;
    motivo_principal: string;
    descripcion_detallada: string;
    bitacora_folio: string;
    bitacora_tipo: 'celula' | 'motor' | 'helice' | 'avionica' | 'vuelo_diario';
    orden_trabajo_id: string;
    squawk_id: string;
    asiento_bitacora: string;
    tecnico_responsable: string;
    licencia_tma: string;
    supervisor_liberador: string;
    licencia_supervisor: string;
    ubicacion_hangar: string;
    condicion_aeronavegabilidad: MovementAirworthinessCondition;
    entrada_id_relacionada?: string;
    reset_inspeccion?: 'auto' | 'none' | '50h' | '100h';
  }>({
    tipo: 'entrada',
    matricula: 'HP-1450',
    modelo: 'Cessna 172 Skyhawk',
    fecha: new Date().toISOString().slice(0, 10),
    hora: new Date().toTimeString().slice(0, 5),
    tach_hobbs: 2450.4,
    motivo_principal: 'Inspección Periódica Obligatoria 100 Horas',
    descripcion_detallada: '',
    bitacora_folio: 'BIT-1450-202611-01',
    bitacora_tipo: 'celula',
    orden_trabajo_id: '',
    squawk_id: '',
    asiento_bitacora: '',
    tecnico_responsable: currentUser.nombre || 'Ing. Carlos Mendoza',
    licencia_tma: currentUser.licencia || 'AAC-TMA-04521',
    supervisor_liberador: currentUser.nombre || 'Ing. Carlos Mendoza',
    licencia_supervisor: currentUser.licencia || 'AAC-TMA-04521',
    ubicacion_hangar: 'Hangar OMA - Bahía 1',
    condicion_aeronavegabilidad: 'mantenimiento_preventivo',
    reset_inspeccion: 'auto'
  });

  const [showNewWoModal, setShowNewWoModal] = useState(false);
  const [newWoForm, setNewWoForm] = useState<{
    matricula: string;
    tipo: WorkOrderType;
    titulo: string;
    descripcion: string;
    prioridad: 'baja' | 'media' | 'alta' | 'aog_critico';
    horas_aeronave_entrada: number;
    tecnico_responsable: string;
    licencia_tma: string;
    fecha_estimada_entrega: string;
  }>({
    matricula: 'HP-1450',
    tipo: 'inspeccion_100h',
    titulo: '',
    descripcion: '',
    prioridad: 'media',
    horas_aeronave_entrada: 0,
    tecnico_responsable: currentUser.nombre || 'Ing. Carlos Mendoza',
    licencia_tma: currentUser.licencia || 'AAC-TMA-04521',
    fecha_estimada_entrega: ''
  });

  const [showNewSquawkModal, setShowNewSquawkModal] = useState(false);
  const [newSquawkForm, setNewSquawkForm] = useState<{
    matricula: string;
    sistema_afectado: 'motor' | 'avionica' | 'estructura' | 'tren_frenos' | 'electrico' | 'mandos_vuelo' | 'cabina';
    descripcion: string;
    severidad: SquawkSeverity;
    bitacora_folio: string;
  }>({
    matricula: 'HP-1450',
    sistema_afectado: 'motor',
    descripcion: '',
    severidad: 'preventivo',
    bitacora_folio: ''
  });

  const [selectedSquawkForResolve, setSelectedSquawkForResolve] = useState<MaintenanceSquawk | null>(null);
  const [resolveActionText, setResolveActionText] = useState('');
  const [resolveTmaName, setResolveTmaName] = useState(currentUser.nombre || 'Ing. Carlos Mendoza');
  const [resolveTmaLic, setResolveTmaLic] = useState(currentUser.licencia || 'AAC-TMA-04521');

  const [selectedPartForAdjust, setSelectedPartForAdjust] = useState<MaintenancePartStock | null>(null);
  const [partAdjustDelta, setPartAdjustDelta] = useState<number>(1);
  const [partAdjustMotivo, setPartAdjustMotivo] = useState('');

  // Initial Data Fetch
  const loadData = async () => {
    setLoading(true);
    try {
      const [acRes, woRes, sqRes, ptRes, adRes, movRes] = await Promise.all([
        api.getAircraftMaintenanceRecords().catch(() => []),
        api.getMaintenanceWorkOrders().catch(() => []),
        api.getMaintenanceSquawks().catch(() => []),
        api.getMaintenanceParts().catch(() => []),
        api.getAirworthinessDirectives().catch(() => []),
        api.getAircraftMovements().catch(() => [])
      ]);
      setAircraftList(acRes);
      setWorkOrders(woRes);
      setSquawks(sqRes);
      setParts(ptRes);
      setDirectives(adRes);
      setMovements(movRes);
    } catch (err: any) {
      console.error('Error loading workshop data:', err);
      setErrorToast('No se pudieron cargar todos los registros del taller');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const showNotification = (msg: string, isError = false) => {
    if (isError) {
      setErrorToast(msg);
      setTimeout(() => setErrorToast(null), 4000);
    } else {
      setSuccessToast(msg);
      setTimeout(() => setSuccessToast(null), 4000);
    }
  };

  // Metrics
  const metrics = useMemo(() => {
    const totalFleet = aircraftList.length;
    const airworthy = aircraftList.filter(a => a.estado_aeronavegabilidad === 'aeronavegable').length;
    const inMaint = aircraftList.filter(a => a.estado_aeronavegabilidad === 'en_mantenimiento').length;
    const aogLocked = aircraftList.filter(a => a.bloqueo_despacho || a.estado_aeronavegabilidad === 'aog_bloqueado').length;
    const activeWo = workOrders.filter(w => w.estado !== 'cerrada_conforme').length;
    const openSquawks = squawks.filter(s => s.estado !== 'resuelto').length;
    const criticalSquawks = squawks.filter(s => s.estado !== 'resuelto' && s.severidad === 'aog').length;
    const lowStockParts = parts.filter(p => p.cantidad_disponible <= p.cantidad_minima_alerta).length;

    // Métricas específicas de Historial de Entradas y Salidas
    const totalMovements = movements.length;
    const activeInHangar = movements.filter(m => m.tipo === 'entrada' && !movements.some(s => s.tipo === 'salida' && s.entrada_id_relacionada === m.id)).length;
    const certifiedExits = movements.filter(m => m.tipo === 'salida').length;
    const linkedBitacoraCount = movements.filter(m => m.bitacora_folio).length;

    return {
      totalFleet,
      airworthy,
      inMaint,
      aogLocked,
      activeWo,
      openSquawks,
      criticalSquawks,
      lowStockParts,
      totalMovements,
      activeInHangar,
      certifiedExits,
      linkedBitacoraCount
    };
  }, [aircraftList, workOrders, squawks, parts, movements]);

  // Movimientos filtrados para la subsección de entradas y salidas
  const filteredMovements = useMemo(() => {
    return movements.filter(m => {
      if (movementTypeFilter !== 'TODOS' && m.tipo !== movementTypeFilter) return false;
      if (selectedMatriculaFilter !== 'TODAS' && m.matricula.toUpperCase() !== selectedMatriculaFilter.toUpperCase()) return false;
      if (movementConditionFilter !== 'TODAS' && m.condicion_aeronavegabilidad !== movementConditionFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchMatricula = m.matricula.toLowerCase().includes(q);
        const matchFolio = (m.bitacora_folio || '').toLowerCase().includes(q);
        const matchMotivo = (m.motivo_principal || '').toLowerCase().includes(q);
        const matchOT = (m.orden_trabajo_id || '').toLowerCase().includes(q);
        const matchTecnico = (m.tecnico_responsable || '').toLowerCase().includes(q);
        const matchLic = (m.licencia_tma || '').toLowerCase().includes(q);
        const matchDesc = (m.descripcion_detallada || '').toLowerCase().includes(q);
        if (!matchMatricula && !matchFolio && !matchMotivo && !matchOT && !matchTecnico && !matchLic && !matchDesc) {
          return false;
        }
      }
      return true;
    });
  }, [movements, movementTypeFilter, selectedMatriculaFilter, movementConditionFilter, searchQuery]);

  // Métricas agregadas para el Panel de KPIs de Horas Acumuladas y Mantenimiento Programado
  const kpiHoursSummary = useMemo(() => {
    const totalFleetHours = aircraftList.reduce((sum, a) => sum + (a.horas_totales_celula || 0), 0);
    const totalEngineHours = aircraftList.reduce((sum, a) => sum + (a.horas_motor_tso || 0), 0);

    const alertAircraft = aircraftList.filter(
      a => a.horas_restantes_100h <= 15 || a.horas_restantes_50h <= 10 || a.bloqueo_despacho
    );

    const criticalAircraft = aircraftList.filter(
      a => a.horas_restantes_100h <= 5 || a.horas_restantes_50h <= 3 || a.bloqueo_despacho
    );

    const sortedByNearest = [...aircraftList].sort((a, b) => {
      const nearestA = Math.min(a.horas_restantes_100h, a.horas_restantes_50h);
      const nearestB = Math.min(b.horas_restantes_100h, b.horas_restantes_50h);
      return nearestA - nearestB;
    });

    const nextDueAircraft = sortedByNearest[0] || null;
    const nextDueHours = nextDueAircraft
      ? Math.min(nextDueAircraft.horas_restantes_100h, nextDueAircraft.horas_restantes_50h)
      : 0;
    const nextDueType = nextDueAircraft
      ? nextDueAircraft.horas_restantes_50h < nextDueAircraft.horas_restantes_100h
        ? 'Servicio 50h'
        : 'Inspección 100h'
      : '';

    return {
      totalFleetHours,
      totalEngineHours,
      alertCount: alertAircraft.length,
      criticalCount: criticalAircraft.length,
      optimalCount: aircraftList.length - alertAircraft.length,
      nextDueAircraft,
      nextDueHours,
      nextDueType
    };
  }, [aircraftList]);

  // Lista de aeronaves filtrada y ordenada para el Panel de KPIs
  const sortedAndFilteredKpiAircraft = useMemo(() => {
    let list = [...aircraftList];

    if (kpiHoursFilter === 'ALERTA') {
      list = list.filter(a => a.horas_restantes_100h <= 15 || a.horas_restantes_50h <= 10 || a.bloqueo_despacho);
    } else if (kpiHoursFilter === 'CESSNA') {
      list = list.filter(a => a.modelo.toLowerCase().includes('cessna') || a.matricula.includes('1450') || a.matricula.includes('1588'));
    } else if (kpiHoursFilter === 'PIPER') {
      list = list.filter(a => a.modelo.toLowerCase().includes('piper') || a.matricula.includes('1822') || a.matricula.includes('1799') || a.matricula.includes('1934'));
    }

    list.sort((a, b) => {
      if (kpiHoursSort === 'urgencia') {
        const nearestA = Math.min(a.horas_restantes_100h, a.horas_restantes_50h);
        const nearestB = Math.min(b.horas_restantes_100h, b.horas_restantes_50h);
        return nearestA - nearestB;
      }
      if (kpiHoursSort === 'horas_tt') {
        return b.horas_totales_celula - a.horas_totales_celula;
      }
      return a.matricula.localeCompare(b.matricula);
    });

    return list;
  }, [aircraftList, kpiHoursFilter, kpiHoursSort]);

  const isAircraftGrounded = (ac: AircraftMaintenanceRecord): boolean =>
    Boolean(ac.bloqueo_despacho || ac.estado_aeronavegabilidad === 'aog_bloqueado');

  const isAircraftInWorkshop = (ac: AircraftMaintenanceRecord): boolean =>
    isAircraftGrounded(ac) || ac.estado_aeronavegabilidad === 'en_mantenimiento';

  const findOpenEntryForAircraft = (matricula: string): AircraftWorkshopMovement | undefined =>
    movements.find(
      m =>
        m.tipo === 'entrada' &&
        m.matricula.toUpperCase() === matricula.toUpperCase() &&
        !movements.some(s => s.tipo === 'salida' && s.entrada_id_relacionada === m.id)
    );

  const openGroundLockModal = (ac: AircraftMaintenanceRecord) => {
    setSelectedAircraftForLock(ac);
    setLockReason(ac.motivo_bloqueo || '');
    setUnlockResetOverdue(true);
    setUnlockResolveSquawks(true);
  };

  // Handlers para Movimientos y Trazabilidad de Bitácoras
  const handleCreateMovement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMovementForm.matricula || !newMovementForm.motivo_principal.trim()) {
      showNotification('Por favor completa los campos obligatorios del movimiento', true);
      return;
    }
    setActionLoading(true);
    try {
      const created = await api.createAircraftMovement({
        ...newMovementForm,
        tach_hobbs: Number(newMovementForm.tach_hobbs) || 0
      });
      setMovements(prev => [created, ...prev]);
      showNotification(`¡Movimiento ${created.tipo === 'entrada' ? 'ENTRADA' : 'SALIDA / RTS'} registrado para ${created.matricula}! Folio Bitácora: ${created.bitacora_folio || 'N/A'}`);
      setShowNewMovementModal(false);
      await loadData();
      if (onRefreshAll) onRefreshAll();
    } catch (err: any) {
      showNotification(err.message || 'Error al registrar movimiento', true);
    } finally {
      setActionLoading(false);
    }
  };

  const handleOpenNewMovement = (tipo: MovementType = 'entrada', initialMatricula?: string) => {
    const fallbackSalidaMat =
      aircraftList.find(a => isAircraftInWorkshop(a))?.matricula ||
      aircraftList[0]?.matricula ||
      'HP-1588';
    const fallbackEntradaMat =
      aircraftList.find(a => !isAircraftInWorkshop(a))?.matricula ||
      aircraftList[0]?.matricula ||
      'HP-1450';
    const mat = initialMatricula || (tipo === 'salida' ? fallbackSalidaMat : fallbackEntradaMat);

    const targetAc = aircraftList.find(a => a.matricula.toUpperCase() === mat.toUpperCase());
    const model = targetAc ? targetAc.modelo : mat.includes('1822') ? 'Cessna 172SP Skyhawk' : 'Cessna 172 Skyhawk';
    const tach = targetAc ? targetAc.horas_totales_celula : 2450.4;
    const yearMonth = new Date().toISOString().slice(0, 7).replace('-', '');
    const openEntry = tipo === 'salida' ? findOpenEntryForAircraft(mat) : undefined;
    const openWo = workOrders.find(w => w.matricula.toUpperCase() === mat.toUpperCase() && w.estado !== 'cerrada_conforme');
    const openSquawk = squawks.find(s => s.matricula.toUpperCase() === mat.toUpperCase() && s.estado !== 'resuelto');

    setNewMovementForm({
      tipo,
      matricula: mat,
      modelo: model,
      fecha: new Date().toISOString().slice(0, 10),
      hora: new Date().toTimeString().slice(0, 5),
      tach_hobbs: tach,
      motivo_principal:
        tipo === 'entrada'
          ? 'Inspección Periódica Obligatoria 100 Horas'
          : openEntry
          ? `Retorno al Servicio (RTS Conforme) - Completado: ${openEntry.motivo_principal}`
          : 'Retorno al Servicio (RTS Conforme) - Trabajos Concluidos',
      descripcion_detallada:
        tipo === 'salida' && openEntry
          ? `Salida de taller y retorno al servicio tras concluir: ${openEntry.motivo_principal}. Pruebas en tierra satisfactorias.`
          : '',
      bitacora_folio: openEntry?.bitacora_folio || `BIT-${mat.replace('HP-', '')}-${yearMonth}-01`,
      bitacora_tipo: openEntry?.bitacora_tipo || 'celula',
      orden_trabajo_id: openEntry?.orden_trabajo_id || openWo?.id || '',
      squawk_id: openEntry?.squawk_id || openSquawk?.id || '',
      asiento_bitacora:
        tipo === 'salida'
          ? `Certifico que la aeronave ${mat} ha sido inspeccionada de acuerdo a RAC 43 / RAC 145 y se determina en condición aeronavegable.`
          : '',
      tecnico_responsable: currentUser.nombre || 'Ing. Carlos Mendoza',
      licencia_tma: currentUser.licencia || 'AAC-TMA-04521',
      supervisor_liberador: currentUser.nombre || 'Ing. Carlos Mendoza',
      licencia_supervisor: currentUser.licencia || 'AAC-TMA-04521',
      ubicacion_hangar: tipo === 'entrada' ? 'Hangar OMA - Bahía 1' : 'Hangar SkyOps 4 - Rampa Principal',
      condicion_aeronavegabilidad: tipo === 'entrada' ? 'mantenimiento_preventivo' : 'aeronavegable_conforme',
      entrada_id_relacionada: openEntry?.id,
      reset_inspeccion: 'auto'
    });
    setShowNewMovementModal(true);
  };

  const handleOpenExitForEntry = (entry: AircraftWorkshopMovement) => {
    const targetAc = aircraftList.find(a => a.matricula.toUpperCase() === entry.matricula.toUpperCase());
    const currentTach = targetAc ? targetAc.horas_totales_celula : entry.tach_hobbs;

    setNewMovementForm({
      tipo: 'salida',
      matricula: entry.matricula,
      modelo: entry.modelo,
      fecha: new Date().toISOString().slice(0, 10),
      hora: new Date().toTimeString().slice(0, 5),
      tach_hobbs: currentTach,
      motivo_principal: `Retorno al Servicio (RTS Conforme) - Completado: ${entry.motivo_principal}`,
      descripcion_detallada: `Salida de taller y liberación de la aeronave tras solventar: ${entry.motivo_principal}. Pruebas funcionales de motor y sistemas en tierra conformes.`,
      bitacora_folio: entry.bitacora_folio || (`BIT-${entry.matricula.replace('HP-', '')}-${new Date().toISOString().slice(0, 7).replace('-', '')}-01`),
      bitacora_tipo: entry.bitacora_tipo || 'celula',
      orden_trabajo_id: entry.orden_trabajo_id || '',
      squawk_id: entry.squawk_id || '',
      asiento_bitacora: `Certifico que la aeronave ${entry.matricula} ha recibido mantenimiento de acuerdo a manuales técnicos y regulaciones vigentes RAC 43 / RAC 145. Retorno al servicio autorizado. Asentado en Bitácora Folio #${entry.bitacora_folio || 'RTS'}.`,
      tecnico_responsable: currentUser.nombre || 'Ing. Carlos Mendoza',
      licencia_tma: currentUser.licencia || 'AAC-TMA-04521',
      supervisor_liberador: currentUser.nombre || 'Ing. Carlos Mendoza',
      licencia_supervisor: currentUser.licencia || 'AAC-TMA-04521',
      ubicacion_hangar: 'Hangar SkyOps 4 - Rampa Principal',
      condicion_aeronavegabilidad: 'aeronavegable_conforme',
      entrada_id_relacionada: entry.id,
      reset_inspeccion: 'auto'
    });
    setShowNewMovementModal(true);
  };

  const handleOpenNewWoForAircraft = (matricula: string, tipo: WorkOrderType = 'inspeccion_100h') => {
    const targetAc = aircraftList.find(a => a.matricula.toUpperCase() === matricula.toUpperCase());
    const tach = targetAc ? targetAc.horas_totales_celula : 0;
    setNewWoForm({
      matricula,
      tipo,
      titulo: tipo === 'inspeccion_100h'
        ? `Inspección Periódica 100 Horas - ${matricula}`
        : `Servicio 50 Horas (Aceite & Filtro) - ${matricula}`,
      descripcion: `Cumplimiento mandatorio de mantenimiento a las ${tach.toFixed(1)} hrs de horómetro según RAC 91.409 y programa de mantenimiento SkyOps.`,
      prioridad: (targetAc && (targetAc.horas_restantes_100h <= 5 || targetAc.horas_restantes_50h <= 3)) ? 'alta' : 'media',
      horas_aeronave_entrada: tach,
      tecnico_responsable: currentUser.nombre || 'Ing. Carlos Mendoza',
      licencia_tma: currentUser.licencia || 'AAC-TMA-04521',
      fecha_estimada_entrega: new Date(Date.now() + 86400000 * 3).toISOString().slice(0, 10)
    });
    setShowNewWoModal(true);
  };

  // Handlers
  const handleToggleGroundLock = async () => {
    if (!selectedAircraftForLock) return;
    const currentlyGrounded = isAircraftGrounded(selectedAircraftForLock);
    const newLockState = !currentlyGrounded;
    setActionLoading(true);
    try {
      const res = await api.toggleAircraftGroundLock(selectedAircraftForLock.matricula, {
        locked: newLockState,
        reason: newLockState ? (lockReason.trim() || 'Bloqueo técnico preventivo por Taller OMA') : undefined,
        authorizedBy: currentUser.nombre || 'Taller Aeronáutico',
        licenciaTMA: currentUser.licencia || 'AAC-TMA-04521',
        resetOverdueCounters: newLockState ? undefined : unlockResetOverdue,
        resolveAogSquawks: newLockState ? undefined : unlockResolveSquawks
      });
      showNotification(res.message);
      setSelectedAircraftForLock(null);
      setLockReason('');
      await loadData();
      if (onRefreshAll) onRefreshAll();
    } catch (err: any) {
      showNotification(err.message || 'Error al modificar condición de despacho', true);
    } finally {
      setActionLoading(false);
    }
  };

  const handleOpenRtsModal = (wo: MaintenanceWorkOrder) => {
    setSelectedWoForRTS(wo);
    const targetAc = aircraftList.find(a => a.matricula.toUpperCase() === wo.matricula.toUpperCase());
    const initialTach = targetAc ? targetAc.horas_totales_celula : wo.horas_aeronave_entrada;
    setRtsTachSalida(initialTach);
    setRtsResetCounter(
      wo.tipo === 'inspeccion_100h' ||
        wo.tipo === 'inspeccion_50h' ||
        wo.tipo === 'servicio_aceite' ||
        Boolean(targetAc && (targetAc.horas_restantes_50h <= 0 || targetAc.horas_restantes_100h <= 0))
    );
    setRtsResolveSquawks(true);
    setRtsDeclaration(
      `Certifico que la aeronave ${wo.matricula} ha sido inspeccionada y reparada conforme a los Reglamentos RAC 43 y RAC 145 de la AAC Panamá y directivas técnicas del fabricante, encontrándose en condición AERONAVEGABLE para retorno al servicio de vuelo.`
    );
  };

  const handleConfirmRts = async () => {
    if (!selectedWoForRTS) return;
    if (!rtsTmaName.trim() || !rtsTmaLic.trim()) {
      showNotification('Se requiere nombre del técnico e identificación de licencia TMA', true);
      return;
    }
    setActionLoading(true);
    try {
      const targetAc = aircraftList.find(a => a.matricula.toUpperCase() === selectedWoForRTS.matricula.toUpperCase());
      const is100hOverdue = Boolean(targetAc && targetAc.horas_restantes_100h <= 0);
      const is50hOverdue = Boolean(targetAc && targetAc.horas_restantes_50h <= 0);
      const res = await api.returnAircraftToService(selectedWoForRTS.id, {
        firmado_por: rtsTmaName.trim(),
        licencia_firmante: rtsTmaLic.trim(),
        declaracion: rtsDeclaration.trim(),
        horas_salida: Number(rtsTachSalida),
        reset100h: selectedWoForRTS.tipo === 'inspeccion_100h' || (rtsResetCounter && is100hOverdue),
        reset50h: selectedWoForRTS.tipo === 'inspeccion_50h' || selectedWoForRTS.tipo === 'servicio_aceite' || (rtsResetCounter && is50hOverdue),
        resolveAogSquawks: rtsResolveSquawks
      });
      showNotification(res.message);
      setSelectedWoForRTS(null);
      await loadData();
      if (onRefreshAll) onRefreshAll();
    } catch (err: any) {
      showNotification(err.message || 'Error al emitir retorno al servicio', true);
    } finally {
      setActionLoading(false);
    }
  };

  const handleCreateWorkOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newWoForm.titulo.trim()) {
      showNotification('Ingresa un título para la orden de trabajo', true);
      return;
    }
    setActionLoading(true);
    try {
      const created = await api.createMaintenanceWorkOrder({
        matricula: newWoForm.matricula,
        tipo: newWoForm.tipo,
        titulo: newWoForm.titulo.trim(),
        descripcion: newWoForm.descripcion.trim(),
        prioridad: newWoForm.prioridad,
        fecha_apertura: new Date().toISOString().slice(0, 10),
        fecha_estimada_entrega: newWoForm.fecha_estimada_entrega || undefined,
        horas_aeronave_entrada: Number(newWoForm.horas_aeronave_entrada),
        tecnico_responsable: newWoForm.tecnico_responsable.trim(),
        licencia_tma: newWoForm.licencia_tma.trim(),
        estado: 'abierta',
        retorno_al_servicio: { aprobado: false }
      });
      showNotification(`Orden de trabajo ${created.id} emitida con éxito para ${created.matricula}`);
      setShowNewWoModal(false);
      setNewWoForm({
        matricula: 'HP-1450',
        tipo: 'inspeccion_100h',
        titulo: '',
        descripcion: '',
        prioridad: 'media',
        horas_aeronave_entrada: 0,
        tecnico_responsable: currentUser.nombre || 'Ing. Carlos Mendoza',
        licencia_tma: currentUser.licencia || 'AAC-TMA-04521',
        fecha_estimada_entrega: ''
      });
      await loadData();
      if (onRefreshAll) onRefreshAll();
    } catch (err: any) {
      showNotification(err.message || 'Error al crear orden de trabajo', true);
    } finally {
      setActionLoading(false);
    }
  };

  const handleCreateSquawk = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSquawkForm.descripcion.trim()) {
      showNotification('Describe la novedad observada', true);
      return;
    }
    setActionLoading(true);
    try {
      const created = await api.createMaintenanceSquawk({
        matricula: newSquawkForm.matricula,
        fecha_reporte: new Date().toISOString().slice(0, 10),
        reportado_por: currentUser.nombre || 'Personal de Operaciones',
        reportado_por_rol: currentUser.rol || 'mantenimiento',
        bitacora_folio: newSquawkForm.bitacora_folio.trim() || undefined,
        sistema_afectado: newSquawkForm.sistema_afectado,
        descripcion: newSquawkForm.descripcion.trim(),
        severidad: newSquawkForm.severidad,
        estado: 'reportado'
      });
      showNotification(`Novedad técnica ${created.id} registrada. ${created.severidad === 'aog' ? '¡Aeronave inmovilizada en tierra (AOG)!' : ''}`);
      setShowNewSquawkModal(false);
      setNewSquawkForm({
        matricula: 'HP-1450',
        sistema_afectado: 'motor',
        descripcion: '',
        severidad: 'preventivo',
        bitacora_folio: ''
      });
      await loadData();
      if (onRefreshAll) onRefreshAll();
    } catch (err: any) {
      showNotification(err.message || 'Error al reportar discrepancia', true);
    } finally {
      setActionLoading(false);
    }
  };

  const handleResolveSquawk = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSquawkForResolve) return;
    if (!resolveActionText.trim()) {
      showNotification('Describe la acción correctiva realizada', true);
      return;
    }
    setActionLoading(true);
    try {
      await api.resolveMaintenanceSquawk(selectedSquawkForResolve.id, {
        accion_correctiva: resolveActionText.trim(),
        resuelto_por: resolveTmaName.trim(),
        resuelto_por_licencia: resolveTmaLic.trim(),
        estado: 'resuelto'
      });
      showNotification(`Novedad ${selectedSquawkForResolve.id} resuelta y firmada en bitácora técnica`);
      setSelectedSquawkForResolve(null);
      setResolveActionText('');
      await loadData();
      if (onRefreshAll) onRefreshAll();
    } catch (err: any) {
      showNotification(err.message || 'Error al resolver novedad', true);
    } finally {
      setActionLoading(false);
    }
  };

  const handleAdjustPart = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPartForAdjust) return;
    setActionLoading(true);
    try {
      await api.adjustMaintenancePartStock(
        selectedPartForAdjust.id,
        partAdjustDelta,
        partAdjustMotivo.trim() || 'Ajuste manual de almacén',
        currentUser.nombre || 'Taller SkyOps'
      );
      showNotification(`Stock actualizado para parte ${selectedPartForAdjust.numero_parte}`);
      setSelectedPartForAdjust(null);
      setPartAdjustDelta(1);
      setPartAdjustMotivo('');
      await loadData();
    } catch (err: any) {
      showNotification(err.message || 'Error al ajustar inventario', true);
    } finally {
      setActionLoading(false);
    }
  };

  // Helper formatting
  const getConditionBadge = (cond: AirworthinessCondition, isLocked: boolean) => {
    if (isLocked || cond === 'aog_bloqueado') {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-rose-500/10 text-rose-500 dark:text-rose-400 border border-rose-500/20">
          <AlertOctagon className="w-3.5 h-3.5" />
          AOG Bloqueado
        </span>
      );
    }
    switch (cond) {
      case 'aeronavegable':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
            <CheckCircle2 className="w-3.5 h-3.5" />
            Aeronavegable (RTS)
          </span>
        );
      case 'en_mantenimiento':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-blue-500/10 text-blue-500 dark:text-blue-400 border border-blue-500/20">
            <Wrench className="w-3.5 h-3.5" />
            En Mantenimiento
          </span>
        );
      case 'inspeccion_proxima':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-500/10 text-amber-500 dark:text-amber-400 border border-amber-500/20">
            <Clock className="w-3.5 h-3.5" />
            Inspección Próxima
          </span>
        );
    }
  };

  const getPriorityBadge = (prio: string) => {
    switch (prio) {
      case 'aog_critico':
        return <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-rose-500/20 text-rose-400 border border-rose-500/30">AOG Crítico</span>;
      case 'alta':
        return <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30">Alta</span>;
      case 'media':
        return <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-sky-500/20 text-sky-400 border border-sky-500/30">Media</span>;
      default:
        return <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-slate-500/20 text-slate-400">Baja</span>;
    }
  };

  const getSquawkSeverityBadge = (sev: SquawkSeverity) => {
    switch (sev) {
      case 'aog':
        return <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-rose-600 text-white animate-pulse">AOG (Grounded)</span>;
      case 'mel_diferible':
        return <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30">MEL Diferible</span>;
      case 'preventivo':
        return <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-blue-500/20 text-blue-400 border border-blue-500/30">Preventivo</span>;
      default:
        return <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-slate-500/20 text-slate-400">Observación</span>;
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Toast Notifications */}
      {successToast && (
        <div className="fixed top-4 right-4 z-50 flex items-center gap-2 bg-emerald-600 text-white px-4 py-3 rounded-xl shadow-xl text-sm font-semibold animate-fade-in">
          <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
          <span>{successToast}</span>
        </div>
      )}
      {errorToast && (
        <div className="fixed top-4 right-4 z-50 flex items-center gap-2 bg-rose-600 text-white px-4 py-3 rounded-xl shadow-xl text-sm font-semibold animate-fade-in">
          <AlertOctagon className="w-5 h-5 flex-shrink-0" />
          <span>{errorToast}</span>
        </div>
      )}

      {/* Main Header Banner */}
      <div className="bg-slate-950 p-6 rounded-xl border border-slate-800 shadow-xs text-white">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="w-11 h-11 rounded-lg bg-slate-900 border border-slate-800 text-amber-400 flex items-center justify-center flex-shrink-0">
              <Wrench className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
                Taller & Mantenimiento de Flota
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={loadData}
              disabled={loading}
              className="inline-flex items-center gap-2 px-3 py-2 bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 rounded-lg text-xs font-semibold transition-all cursor-pointer disabled:opacity-50"
              title="Refrescar datos técnicos"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">Actualizar</span>
            </button>

            <button
              onClick={() => setShowNewSquawkModal(true)}
              className="inline-flex items-center gap-2 px-3.5 py-2 bg-red-600 hover:bg-red-500 text-white rounded-lg text-xs font-semibold transition-all cursor-pointer shadow-xs"
            >
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>Reportar Novedad</span>
            </button>

            <button
              onClick={() => setShowNewWoModal(true)}
              className="inline-flex items-center gap-2 px-3.5 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-white rounded-lg text-xs font-semibold transition-all cursor-pointer shadow-xs"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Nueva Orden de Trabajo (OT)</span>
            </button>
          </div>
        </div>

        {/* Operational Metrics Ribbon */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 pt-5 border-t border-slate-800/80">
          <div className="bg-slate-900/80 border border-slate-800/80 rounded-lg p-3">
            <div className="flex items-center justify-between text-slate-400 text-xs">
              <span>Flota Total</span>
              <Plane className="w-4 h-4 text-sky-400" />
            </div>
            <div className="text-xl font-bold text-white mt-1">
              {metrics.totalFleet} aviones
            </div>
            <div className="text-[11px] text-slate-400 mt-0.5">
              {metrics.airworthy} aeronavegables
            </div>
          </div>

          <div className={`rounded-lg p-3 border transition-colors ${
            metrics.aogLocked > 0 ? 'bg-red-950/40 border-red-500/40' : 'bg-slate-900/80 border-slate-800/80'
          }`}>
            <div className="flex items-center justify-between text-slate-400 text-xs">
              <span>Inmovilizados (AOG)</span>
              <AlertOctagon className={`w-4 h-4 ${metrics.aogLocked > 0 ? 'text-red-400' : 'text-slate-500'}`} />
            </div>
            <div className={`text-xl font-bold mt-1 ${metrics.aogLocked > 0 ? 'text-red-400' : 'text-slate-400'}`}>
              {metrics.aogLocked}
            </div>
            <div className={`text-[11px] mt-0.5 ${metrics.aogLocked > 0 ? 'text-red-300 font-semibold' : 'text-emerald-400'}`}>
              {metrics.aogLocked > 0 ? 'Bloqueo estricto de despacho' : 'Flota disponible al 100%'}
            </div>
          </div>

          <div className="bg-slate-900/80 border border-slate-800/80 rounded-lg p-3">
            <div className="flex items-center justify-between text-slate-400 text-xs">
              <span>Órdenes de Trabajo</span>
              <ClipboardList className="w-4 h-4 text-amber-400" />
            </div>
            <div className="text-xl font-bold text-white mt-1">
              {metrics.activeWo}
            </div>
            <div className="text-[11px] text-slate-400 mt-0.5">
              En proceso de taller OMA
            </div>
          </div>

          <div className="bg-slate-900/80 border border-slate-800/80 rounded-lg p-3">
            <div className="flex items-center justify-between text-slate-400 text-xs">
              <span>Novedades & Almacén</span>
              <Package className="w-4 h-4 text-slate-400" />
            </div>
            <div className="text-xl font-bold text-white mt-1">
              {metrics.openSquawks}
            </div>
            <div className={`text-[11px] mt-0.5 ${metrics.lowStockParts > 0 ? 'text-amber-400 font-medium' : 'text-slate-400'}`}>
              {metrics.lowStockParts} repuestos bajo mínimo
            </div>
          </div>
        </div>
      </div>

      {/* =========================================================================
          PANEL DE INDICADORES (KPIs): CONTROL HORARIO & MANTENIMIENTO PROGRAMADO 50H / 100H
          ========================================================================= */}
      <div className="bg-slate-950 rounded-2xl border border-slate-800 p-5 shadow-lg space-y-4 text-white animate-fade-in">
        {/* Header del Panel */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-800/80">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center flex-shrink-0 mt-0.5">
              <Gauge className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white tracking-tight">
                Horas Acumuladas & Inspecciones (50h / 100h)
              </h2>
            </div>
          </div>

          {/* Quick Metrics & Controls */}
          <div className="flex items-center gap-2.5 flex-wrap">
            {/* Resumen Compacto */}
            <div className="hidden sm:flex items-center gap-4 px-3.5 py-1.5 bg-slate-900/90 rounded-xl border border-slate-800 text-xs font-mono">
              <div>
                <span className="text-[10px] text-slate-400 block font-sans">Total Horas Flota</span>
                <span className="font-bold text-white text-sm">
                  {kpiHoursSummary.totalFleetHours.toFixed(1)} hrs
                </span>
              </div>
              <div className="h-6 w-px bg-slate-800" />
              <div>
                <span className="text-[10px] text-slate-400 block font-sans">Próximo Vencimiento</span>
                <span className={`font-bold ${
                  kpiHoursSummary.nextDueHours <= 5 ? 'text-rose-400' : kpiHoursSummary.nextDueHours <= 15 ? 'text-amber-400' : 'text-emerald-400'
                }`}>
                  {kpiHoursSummary.nextDueAircraft ? `${kpiHoursSummary.nextDueAircraft.matricula} (${kpiHoursSummary.nextDueHours.toFixed(1)}h)` : 'N/A'}
                </span>
              </div>
            </div>

            {/* Toggle Expandir/Colapsar */}
            <button
              onClick={() => setShowKpiHoursPanel(prev => !prev)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 rounded-lg text-xs font-semibold cursor-pointer transition-all"
              title={showKpiHoursPanel ? 'Colapsar panel de KPIs' : 'Expandir panel de KPIs'}
            >
              {showKpiHoursPanel ? (
                <>
                  <ChevronUp className="w-3.5 h-3.5" />
                  <span>Ocultar Panel</span>
                </>
              ) : (
                <>
                  <ChevronDown className="w-3.5 h-3.5" />
                  <span>Ver Panel KPIs ({aircraftList.length})</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Contenido Expandido del Panel */}
        {showKpiHoursPanel && (
          <div className="space-y-4 pt-1 animate-fade-in">
            {/* Barra de Filtros, Ordenamiento y Vista */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
              {/* Segmented Filter */}
              <div className="flex items-center gap-1 bg-slate-900 p-1 rounded-xl border border-slate-800 overflow-x-auto">
                <button
                  type="button"
                  onClick={() => setKpiHoursFilter('TODAS')}
                  className={`px-3 py-1 rounded-lg font-bold transition-all cursor-pointer whitespace-nowrap ${
                    kpiHoursFilter === 'TODAS'
                      ? 'bg-slate-800 text-white shadow-xs'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Todas ({aircraftList.length})
                </button>
                <button
                  type="button"
                  onClick={() => setKpiHoursFilter('ALERTA')}
                  className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg font-bold transition-all cursor-pointer whitespace-nowrap ${
                    kpiHoursFilter === 'ALERTA'
                      ? 'bg-amber-500 text-slate-950 shadow-xs'
                      : 'text-amber-400 hover:text-amber-300'
                  }`}
                >
                  <AlertTriangle className="w-3 h-3" />
                  <span>En Alerta ({kpiHoursSummary.alertCount})</span>
                </button>
                <button
                  type="button"
                  onClick={() => setKpiHoursFilter('CESSNA')}
                  className={`px-3 py-1 rounded-lg font-bold transition-all cursor-pointer whitespace-nowrap ${
                    kpiHoursFilter === 'CESSNA'
                      ? 'bg-slate-800 text-white shadow-xs'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Cessna C172
                </button>
                <button
                  type="button"
                  onClick={() => setKpiHoursFilter('PIPER')}
                  className={`px-3 py-1 rounded-lg font-bold transition-all cursor-pointer whitespace-nowrap ${
                    kpiHoursFilter === 'PIPER'
                      ? 'bg-slate-800 text-white shadow-xs'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Piper Fleet
                </button>
              </div>

              {/* Ordenamiento y Modos de Vista */}
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1.5">
                  <span className="text-slate-400 text-[11px]">Ordenar:</span>
                  <select
                    value={kpiHoursSort}
                    onChange={e => setKpiHoursSort(e.target.value as any)}
                    aria-label="Ordenar panel de indicadores"
                    className="bg-slate-900 border border-slate-800 text-slate-200 text-xs px-2.5 py-1 rounded-lg font-medium focus:outline-none focus:ring-1 focus:ring-amber-500"
                  >
                    <option value="urgencia">⚡ Urgencia (Menor tiempo a servicio)</option>
                    <option value="horas_tt">📈 Mayor Horas Acumuladas (TT)</option>
                    <option value="matricula">🔤 Matrícula</option>
                  </select>
                </div>

                <div className="flex items-center bg-slate-900 border border-slate-800 rounded-lg p-0.5">
                  <button
                    type="button"
                    onClick={() => setKpiHoursViewMode('cards')}
                    className={`p-1.5 rounded-md transition-all cursor-pointer ${
                      kpiHoursViewMode === 'cards'
                        ? 'bg-slate-800 text-amber-400 shadow-xs'
                        : 'text-slate-400 hover:text-white'
                    }`}
                    title="Vista en Tarjetas de Progreso"
                  >
                    <LayoutGrid className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setKpiHoursViewMode('table')}
                    className={`p-1.5 rounded-md transition-all cursor-pointer ${
                      kpiHoursViewMode === 'table'
                        ? 'bg-slate-800 text-amber-400 shadow-xs'
                        : 'text-slate-400 hover:text-white'
                    }`}
                    title="Vista en Tabla Comparativa"
                  >
                    <Table className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>

            {/* VISTA 1: TARJETAS DE PROGRESO POR AERONAVE */}
            {kpiHoursViewMode === 'cards' && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
                {sortedAndFilteredKpiAircraft.map(ac => {
                  const rem100 = ac.horas_restantes_100h;
                  const rem50 = ac.horas_restantes_50h;

                  // Porcentajes completados del ciclo actual (0 a 100%)
                  const pct100 = Math.max(0, Math.min(100, ((100 - rem100) / 100) * 100));
                  const pct50 = Math.max(0, Math.min(100, ((50 - rem50) / 50) * 100));

                  const isNext50Closer = rem50 < rem100;
                  const closestHours = Math.min(rem100, rem50);
                  const isCritical = closestHours <= 5 || ac.bloqueo_despacho;
                  const isWarning = !isCritical && closestHours <= 15;

                  return (
                    <div
                      key={ac.matricula}
                      className={`bg-slate-900/90 rounded-xl border p-4 transition-all flex flex-col justify-between ${
                        ac.bloqueo_despacho
                          ? 'border-red-500/50 bg-red-950/20 ring-1 ring-red-500/30'
                          : isCritical
                          ? 'border-rose-500/40 bg-rose-950/10'
                          : isWarning
                          ? 'border-amber-500/40 bg-amber-950/10'
                          : 'border-slate-800 hover:border-slate-700'
                      }`}
                    >
                      <div className="space-y-3">
                        {/* Cabecera Aeronave */}
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-base font-black text-white tracking-tight">
                                {ac.matricula}
                              </span>
                              <span className="text-[10px] font-mono uppercase px-1.5 py-0.5 rounded bg-slate-800 text-slate-300">
                                {ac.categoria}
                              </span>
                            </div>
                            <p className="text-xs text-slate-400 font-medium">
                              {ac.modelo}
                            </p>
                          </div>
                          <div>
                            {getConditionBadge(ac.estado_aeronavegabilidad, ac.bloqueo_despacho)}
                          </div>
                        </div>

                        {/* Indicador de Horas Totales Acumuladas */}
                        <div className="grid grid-cols-2 gap-2 p-2.5 rounded-lg bg-slate-950/80 border border-slate-800/80 text-xs">
                          <div>
                            <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">
                              Horómetro Célula (TT)
                            </span>
                            <span className="text-sm font-black font-mono text-white block mt-0.5">
                              {ac.horas_totales_celula.toFixed(1)} hrs
                            </span>
                          </div>
                          <div>
                            <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">
                              Motor (TSN / TSO)
                            </span>
                            <span className="text-sm font-black font-mono text-slate-300 block mt-0.5">
                              {ac.horas_motor_tso.toFixed(1)} hrs
                            </span>
                          </div>
                        </div>

                        {/* Diagnóstico del Próximo Servicio Inmediato */}
                        <div className={`p-2 rounded-lg text-[11px] font-semibold flex items-center justify-between ${
                          isCritical
                            ? 'bg-rose-500/10 text-rose-300 border border-rose-500/20'
                            : isWarning
                            ? 'bg-amber-500/10 text-amber-300 border border-amber-500/20'
                            : 'bg-slate-800/60 text-slate-300 border border-slate-800'
                        }`}>
                          <div className="flex items-center gap-1.5">
                            <Clock className={`w-3.5 h-3.5 ${isCritical ? 'text-rose-400' : isWarning ? 'text-amber-400' : 'text-sky-400'}`} />
                            <span>
                              Próximo: {isNext50Closer ? 'Servicio 50h (Aceite)' : 'Inspección Mayor 100h'}
                            </span>
                          </div>
                          <span className="font-mono font-bold">
                            en {closestHours.toFixed(1)} hrs
                          </span>
                        </div>

                        {/* Barra de Progreso: Servicio 50 Horas (Aceite & Filtro) */}
                        <div className="space-y-1 pt-1">
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-slate-300 text-[11px] font-medium flex items-center gap-1">
                              <span>Servicio 50 Horas</span>
                              <span className="text-slate-500 text-[10px]">(Aceite/Filtro)</span>
                            </span>
                            <span className={`font-mono text-[11px] font-bold ${
                              rem50 <= 3 ? 'text-rose-400' : rem50 <= 10 ? 'text-amber-400' : 'text-emerald-400'
                            }`}>
                              {rem50.toFixed(1)}h restantes
                            </span>
                          </div>

                          <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden p-0.5">
                            <div
                              className={`h-full rounded-full transition-all duration-500 ${
                                rem50 <= 3
                                  ? 'bg-rose-500'
                                  : rem50 <= 10
                                  ? 'bg-amber-500'
                                  : 'bg-emerald-500'
                              }`}
                              style={{ width: `${pct50}%` }}
                            />
                          </div>

                          <div className="flex items-center justify-between text-[10px] text-slate-500 font-mono">
                            <span>Último: {(ac.horas_proxima_50h - 50).toFixed(1)}h</span>
                            <span>Meta: {ac.horas_proxima_50h.toFixed(1)}h</span>
                          </div>
                        </div>

                        {/* Barra de Progreso: Inspección Mayor 100 Horas */}
                        <div className="space-y-1 pt-1">
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-slate-300 text-[11px] font-medium flex items-center gap-1">
                              <span>Inspección 100 Horas</span>
                              <span className="text-slate-500 text-[10px]">(RAC 91)</span>
                            </span>
                            <span className={`font-mono text-[11px] font-bold ${
                              rem100 <= 5 ? 'text-rose-400' : rem100 <= 15 ? 'text-amber-400' : 'text-emerald-400'
                            }`}>
                              {rem100.toFixed(1)}h restantes
                            </span>
                          </div>

                          <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden p-0.5">
                            <div
                              className={`h-full rounded-full transition-all duration-500 ${
                                rem100 <= 5
                                  ? 'bg-rose-500'
                                  : rem100 <= 15
                                  ? 'bg-amber-500'
                                  : 'bg-emerald-500'
                              }`}
                              style={{ width: `${pct100}%` }}
                            />
                          </div>

                          <div className="flex items-center justify-between text-[10px] text-slate-500 font-mono">
                            <span>Última: {ac.horas_ultima_100h.toFixed(1)}h</span>
                            <span>Meta: {ac.horas_proxima_100h.toFixed(1)}h</span>
                          </div>
                        </div>
                      </div>

                      {/* Footer Acciones de la Tarjeta */}
                      <div className="flex items-center justify-between gap-2 pt-3 mt-3 border-t border-slate-800/80">
                        <button
                          type="button"
                          onClick={() => handleOpenNewWoForAircraft(ac.matricula, isNext50Closer ? 'servicio_aceite' : 'inspeccion_100h')}
                          className="flex-1 py-1 px-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-[11px] font-bold transition-all cursor-pointer flex items-center justify-center gap-1"
                        >
                          <PlusCircle className="w-3 h-3 text-amber-400" />
                          <span>Emitir OT</span>
                        </button>
                        {isAircraftInWorkshop(ac) ? (
                          <button
                            type="button"
                            onClick={() => handleOpenNewMovement('salida', ac.matricula)}
                            className="flex-1 py-1 px-2 rounded-lg bg-emerald-600/90 hover:bg-emerald-500 text-white text-[11px] font-bold transition-all cursor-pointer flex items-center justify-center gap-1"
                          >
                            <LogOut className="w-3 h-3" />
                            <span>Egresar RTS</span>
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleOpenNewMovement('entrada', ac.matricula)}
                            className="flex-1 py-1 px-2 rounded-lg bg-blue-600/80 hover:bg-blue-600 text-white text-[11px] font-bold transition-all cursor-pointer flex items-center justify-center gap-1"
                          >
                            <LogIn className="w-3 h-3" />
                            <span>Ingreso Taller</span>
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* VISTA 2: TABLA COMPARATIVA DE HORAS Y PROGRESOS */}
            {kpiHoursViewMode === 'table' && (
              <div className="bg-slate-900 rounded-xl border border-slate-800 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="bg-slate-950/80 text-slate-400 uppercase text-[10px] font-bold tracking-wider border-b border-slate-800">
                        <th className="p-3">Aeronave</th>
                        <th className="p-3">Horas Totales Acumuladas</th>
                        <th className="p-3">Próximo Servicio</th>
                        <th className="p-3">Progreso Servicio 50h</th>
                        <th className="p-3">Progreso Inspección 100h</th>
                        <th className="p-3">Estado</th>
                        <th className="p-3 text-right">Acciones</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800 text-slate-300">
                      {sortedAndFilteredKpiAircraft.map(ac => {
                        const rem100 = ac.horas_restantes_100h;
                        const rem50 = ac.horas_restantes_50h;
                        const pct100 = Math.max(0, Math.min(100, ((100 - rem100) / 100) * 100));
                        const pct50 = Math.max(0, Math.min(100, ((50 - rem50) / 50) * 100));
                        const isNext50Closer = rem50 < rem100;
                        const closest = Math.min(rem100, rem50);

                        return (
                          <tr key={ac.matricula} className="hover:bg-slate-800/40 transition-colors">
                            <td className="p-3 whitespace-nowrap">
                              <div className="font-mono font-bold text-white text-sm">
                                {ac.matricula}
                              </div>
                              <div className="text-[11px] text-slate-400">
                                {ac.modelo}
                              </div>
                            </td>

                            <td className="p-3 whitespace-nowrap">
                              <div className="font-mono font-bold text-white">
                                {ac.horas_totales_celula.toFixed(1)} hrs <span className="text-[10px] text-slate-400 font-sans font-normal">(Célula TT)</span>
                              </div>
                              <div className="font-mono text-[11px] text-slate-400">
                                {ac.horas_motor_tso.toFixed(1)} hrs (Motor)
                              </div>
                            </td>

                            <td className="p-3 whitespace-nowrap">
                              <span className={`inline-flex items-center gap-1 font-mono font-bold text-xs ${
                                closest <= 5 ? 'text-rose-400' : closest <= 15 ? 'text-amber-400' : 'text-emerald-400'
                              }`}>
                                <Clock className="w-3.5 h-3.5" />
                                {isNext50Closer ? '50h' : '100h'}: en {closest.toFixed(1)} hrs
                              </span>
                            </td>

                            {/* Progreso 50h */}
                            <td className="p-3 min-w-[160px]">
                              <div className="flex items-center justify-between text-[11px] font-mono mb-1">
                                <span className="text-slate-400">Meta: {ac.horas_proxima_50h.toFixed(1)}h</span>
                                <span className={`font-bold ${rem50 <= 3 ? 'text-rose-400' : rem50 <= 10 ? 'text-amber-400' : 'text-emerald-400'}`}>
                                  {rem50.toFixed(1)}h
                                </span>
                              </div>
                              <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                                <div
                                  className={`h-full ${rem50 <= 3 ? 'bg-rose-500' : rem50 <= 10 ? 'bg-amber-500' : 'bg-emerald-500'}`}
                                  style={{ width: `${pct50}%` }}
                                />
                              </div>
                            </td>

                            {/* Progreso 100h */}
                            <td className="p-3 min-w-[160px]">
                              <div className="flex items-center justify-between text-[11px] font-mono mb-1">
                                <span className="text-slate-400">Meta: {ac.horas_proxima_100h.toFixed(1)}h</span>
                                <span className={`font-bold ${rem100 <= 5 ? 'text-rose-400' : rem100 <= 15 ? 'text-amber-400' : 'text-emerald-400'}`}>
                                  {rem100.toFixed(1)}h
                                </span>
                              </div>
                              <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                                <div
                                  className={`h-full ${rem100 <= 5 ? 'bg-rose-500' : rem100 <= 15 ? 'bg-amber-500' : 'bg-emerald-500'}`}
                                  style={{ width: `${pct100}%` }}
                                />
                              </div>
                            </td>

                            <td className="p-3 whitespace-nowrap">
                              {getConditionBadge(ac.estado_aeronavegabilidad, ac.bloqueo_despacho)}
                            </td>

                            <td className="p-3 text-right whitespace-nowrap">
                              <div className="flex items-center justify-end gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => handleOpenNewWoForAircraft(ac.matricula, isNext50Closer ? 'servicio_aceite' : 'inspeccion_100h')}
                                  className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded text-[11px] font-bold cursor-pointer"
                                >
                                  OT
                                </button>
                                {isAircraftInWorkshop(ac) ? (
                                  <button
                                    type="button"
                                    onClick={() => handleOpenNewMovement('salida', ac.matricula)}
                                    className="px-2 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-[11px] font-bold cursor-pointer"
                                  >
                                    Egreso RTS
                                  </button>
                                ) : (
                                  <button
                                    type="button"
                                    onClick={() => handleOpenNewMovement('entrada', ac.matricula)}
                                    className="px-2 py-1 bg-blue-600 hover:bg-blue-500 text-white rounded text-[11px] font-bold cursor-pointer"
                                  >
                                    Ingreso
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Navigation Tabs Bar */}
      <div className="flex items-center gap-1.5 border-b border-slate-200 dark:border-slate-800 pb-2 overflow-x-auto">
        <button
          onClick={() => setActiveSubTab('flota')}
          className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer whitespace-nowrap ${
            activeSubTab === 'flota'
              ? 'bg-slate-900 text-white dark:bg-slate-800 dark:text-white shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/60'
          }`}
        >
          <Plane className="w-4 h-4" />
          <span>Flota & Aeronavegabilidad</span>
          <span className="text-[11px] opacity-70">
            ({aircraftList.length})
          </span>
        </button>

        <button
          onClick={() => setActiveSubTab('ordenes')}
          className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer whitespace-nowrap ${
            activeSubTab === 'ordenes'
              ? 'bg-slate-900 text-white dark:bg-slate-800 dark:text-white shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/60'
          }`}
        >
          <FileText className="w-4 h-4" />
          <span>Órdenes de Trabajo</span>
          {metrics.activeWo > 0 && (
            <span className="text-[11px] text-amber-500 font-bold">
              ({metrics.activeWo})
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveSubTab('squawks')}
          className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer whitespace-nowrap ${
            activeSubTab === 'squawks'
              ? 'bg-slate-900 text-white dark:bg-slate-800 dark:text-white shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/60'
          }`}
        >
          <AlertTriangle className="w-4 h-4" />
          <span>Discrepancias (Squawks)</span>
          {metrics.openSquawks > 0 && (
            <span className="px-1.5 py-0.2 rounded bg-red-600 text-white text-[10px] font-bold">
              {metrics.openSquawks}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveSubTab('repuestos')}
          className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer whitespace-nowrap ${
            activeSubTab === 'repuestos'
              ? 'bg-slate-900 text-white dark:bg-slate-800 dark:text-white shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/60'
          }`}
        >
          <Package className="w-4 h-4" />
          <span>Almacén de Repuestos</span>
          {metrics.lowStockParts > 0 && (
            <span className="text-[11px] text-amber-500 font-bold">
              ({metrics.lowStockParts} bajo mínimo)
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveSubTab('directivas')}
          className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer whitespace-nowrap ${
            activeSubTab === 'directivas'
              ? 'bg-slate-900 text-white dark:bg-slate-800 dark:text-white shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/60'
          }`}
        >
          <Award className="w-4 h-4" />
          <span>Directivas ADs / Boletines</span>
        </button>

        <button
          onClick={() => setActiveSubTab('movimientos')}
          className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer whitespace-nowrap ${
            activeSubTab === 'movimientos'
              ? 'bg-slate-900 text-white dark:bg-slate-800 dark:text-white shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/60'
          }`}
        >
          <History className="w-4 h-4 text-sky-500" />
          <span>Entradas & Salidas (Trazabilidad)</span>
          <span className="text-[11px] opacity-70">
            ({movements.length})
          </span>
        </button>
      </div>

      {/* =========================================================================
          SUBTAB 1: FLOTA & AERONAVEGABILIDAD
          ========================================================================= */}
      {activeSubTab === 'flota' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Plane className="w-4 h-4 text-amber-500" />
              <span>Condición de Aeronavegabilidad e Inmovilización AOG</span>
            </h2>
            <div className="text-xs text-slate-500 dark:text-slate-400">
              Inspecciones obligatorias según RAC 91.409 y programa de mantenimiento SkyOps
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {aircraftList.map((ac) => {
              const rem100 = ac.horas_restantes_100h;
              const rem50 = ac.horas_restantes_50h;
              const pct100 = Math.max(0, Math.min(100, ((100 - rem100) / 100) * 100));
              const pct50 = Math.max(0, Math.min(100, ((50 - rem50) / 50) * 100));

              const isGrounded = isAircraftGrounded(ac);
              const inWorkshopOnly = !isGrounded && ac.estado_aeronavegabilidad === 'en_mantenimiento';

              return (
                <div
                  key={ac.matricula}
                  className={`bg-white dark:bg-slate-900 rounded-2xl border p-5 shadow-sm transition-all flex flex-col justify-between ${
                    isGrounded
                      ? 'border-rose-400 dark:border-rose-600/60 ring-2 ring-rose-500/20'
                      : inWorkshopOnly
                      ? 'border-blue-400 dark:border-blue-600/60 ring-2 ring-blue-500/20'
                      : 'border-slate-200 dark:border-slate-800 hover:border-amber-400/50'
                  }`}
                >
                  <div>
                    {/* Header Card */}
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-lg font-black tracking-tight text-slate-900 dark:text-white font-mono">
                            {ac.matricula}
                          </span>
                          <span className="text-xs font-semibold px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                            {ac.categoria}
                          </span>
                        </div>
                        <div className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-0.5">
                          {ac.modelo}
                        </div>
                      </div>
                      <div>{getConditionBadge(ac.estado_aeronavegabilidad, isGrounded)}</div>
                    </div>

                    {/* AOG Alert Notice if blocked */}
                    {isGrounded && (
                      <div className="mt-3 p-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/60 text-rose-800 dark:text-rose-300 text-xs">
                        <div className="flex items-center gap-1.5 font-bold">
                          <ShieldAlert className="w-4 h-4 flex-shrink-0 text-rose-600 dark:text-rose-400" />
                          <span>BLOQUEO EN TIERRA (AOG)</span>
                        </div>
                        <p className="mt-1 text-[11px] leading-tight">
                          {ac.motivo_bloqueo || 'Aeronave inmovilizada para despacho por Taller de Mantenimiento.'}
                        </p>
                      </div>
                    )}

                    {/* Workshop notice if en_mantenimiento without hard lock flag */}
                    {inWorkshopOnly && (
                      <div className="mt-3 p-2.5 rounded-xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800/60 text-blue-800 dark:text-blue-300 text-xs">
                        <div className="flex items-center gap-1.5 font-bold">
                          <Wrench className="w-4 h-4 flex-shrink-0 text-blue-600 dark:text-blue-400" />
                          <span>INGRESADA EN TALLER OMA</span>
                        </div>
                        <p className="mt-1 text-[11px] leading-tight">
                          {ac.motivo_bloqueo || ac.ubicacion_hangar || 'Aeronave en proceso de mantenimiento programado. Emite Salida / RTS al concluir.'}
                        </p>
                      </div>
                    )}

                    {/* Total Hours Section */}
                    <div className="grid grid-cols-2 gap-2 mt-4 p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-100 dark:border-slate-800 text-xs">
                      <div>
                        <span className="text-[10px] text-slate-500 dark:text-slate-400 uppercase font-semibold">
                          Total Célula / Tacómetro
                        </span>
                        <div className="text-sm font-black text-slate-900 dark:text-white font-mono">
                          {ac.horas_totales_celula.toFixed(1)} hrs
                        </div>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-500 dark:text-slate-400 uppercase font-semibold">
                          Motor (TSN / TSO)
                        </span>
                        <div className="text-sm font-black text-slate-900 dark:text-white font-mono">
                          {ac.horas_motor_tso.toFixed(1)} hrs
                        </div>
                      </div>
                    </div>

                    {(ac.ultimo_tacometro_vuelo !== undefined || ac.ultimo_folio_bitacora) && (
                      <div className="mt-2.5 px-3 py-2 bg-indigo-50/70 dark:bg-indigo-950/30 border border-indigo-200/70 dark:border-indigo-900/50 rounded-xl text-[11px] flex flex-wrap items-center justify-between gap-1.5">
                        <span className="font-mono font-bold text-indigo-700 dark:text-indigo-300">
                          Últ. Bitácora: {ac.ultimo_folio_bitacora || 'N/A'}
                        </span>
                        <span className="font-mono font-semibold text-slate-700 dark:text-slate-300">
                          Tach: {(ac.ultimo_tacometro_vuelo ?? ac.horas_totales_celula).toFixed(1)}h · {ac.ultimo_vuelo_fecha || ''}
                        </span>
                      </div>
                    )}

                    {/* 100 Hours Inspection Progress Bar */}
                    <div className="mt-4 space-y-1">
                      <div className="flex items-center justify-between text-xs font-semibold">
                        <span className="text-slate-700 dark:text-slate-300 flex items-center gap-1">
                          <Gauge className="w-3.5 h-3.5 text-amber-500" />
                          Inspección 100 Horas
                        </span>
                        <span
                          className={`font-mono font-bold ${
                            rem100 <= 5 ? 'text-rose-500' : rem100 <= 15 ? 'text-amber-500' : 'text-emerald-500'
                          }`}
                        >
                          {rem100.toFixed(1)} hrs restantes
                        </span>
                      </div>
                      <div className="w-full bg-slate-200 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                        <div
                          className={`h-full transition-all duration-500 ${
                            rem100 <= 5 ? 'bg-rose-500' : rem100 <= 15 ? 'bg-amber-500' : 'bg-emerald-500'
                          }`}
                          style={{ width: `${pct100}%` }}
                        />
                      </div>
                      <div className="flex justify-between text-[10px] text-slate-400">
                        <span>Última: {ac.horas_ultima_100h.toFixed(1)} hrs</span>
                        <span>Próxima: {ac.horas_proxima_100h.toFixed(1)} hrs</span>
                      </div>
                    </div>

                    {/* 50 Hours Inspection Progress Bar */}
                    <div className="mt-3 space-y-1">
                      <div className="flex items-center justify-between text-xs font-semibold">
                        <span className="text-slate-700 dark:text-slate-300 flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5 text-sky-500" />
                          Inspección 50 Horas (Aceite/Filtro)
                        </span>
                        <span
                          className={`font-mono font-bold ${
                            rem50 <= 3 ? 'text-rose-500' : rem50 <= 8 ? 'text-amber-500' : 'text-sky-500'
                          }`}
                        >
                          {rem50.toFixed(1)} hrs restantes
                        </span>
                      </div>
                      <div className="w-full bg-slate-200 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                        <div
                          className={`h-full transition-all duration-500 ${
                            rem50 <= 3 ? 'bg-rose-500' : rem50 <= 8 ? 'bg-amber-500' : 'bg-sky-500'
                          }`}
                          style={{ width: `${pct50}%` }}
                        />
                      </div>
                    </div>

                    {/* Expiry Dates Checklist */}
                    <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 text-[11px] space-y-1 text-slate-600 dark:text-slate-400">
                      <div className="flex items-center justify-between">
                        <span>Próxima Anual (RAC 91):</span>
                        <span className="font-semibold text-slate-800 dark:text-slate-200">
                          {ac.fecha_proxima_inspeccion_anual}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span>Pitot/Estática & XPDR 24M:</span>
                        <span className="font-semibold text-slate-800 dark:text-slate-200">
                          {ac.vencimiento_altimetro_pitot}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span>Batería ELT:</span>
                        <span className="font-semibold text-slate-800 dark:text-slate-200">
                          {ac.vencimiento_elt}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Actions Footer */}
                  <div className="mt-5 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center gap-2 flex-wrap">
                    <button
                      type="button"
                      onClick={() => openGroundLockModal(ac)}
                      className={`flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                        isGrounded
                          ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-xs'
                          : 'bg-rose-600/90 hover:bg-rose-500 text-white shadow-xs'
                      }`}
                    >
                      {isGrounded ? (
                        <>
                          <Unlock className="w-3.5 h-3.5" />
                          <span>Desbloquear</span>
                        </>
                      ) : (
                        <>
                          <Lock className="w-3.5 h-3.5" />
                          <span>Bloquear AOG</span>
                        </>
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={() => handleOpenNewMovement(isAircraftInWorkshop(ac) ? 'salida' : 'entrada', ac.matricula)}
                      className={`flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                        isAircraftInWorkshop(ac)
                          ? 'bg-emerald-700 hover:bg-emerald-600 text-white shadow-xs'
                          : 'bg-blue-600 hover:bg-blue-500 text-white shadow-xs'
                      }`}
                      title={isAircraftInWorkshop(ac) ? 'Registrar Salida y Retorno al Servicio (RTS)' : 'Ingresar aeronave a Taller OMA'}
                    >
                      {isAircraftInWorkshop(ac) ? (
                        <>
                          <LogOut className="w-3.5 h-3.5" />
                          <span>Egresar (RTS)</span>
                        </>
                      ) : (
                        <>
                          <LogIn className="w-3.5 h-3.5" />
                          <span>Ingresar Taller</span>
                        </>
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setNewWoForm(prev => ({
                          ...prev,
                          matricula: ac.matricula,
                          horas_aeronave_entrada: ac.horas_totales_celula,
                          tipo: rem100 <= 10 ? 'inspeccion_100h' : 'correctivo',
                          titulo: `Mantenimiento ${ac.matricula} - ${ac.modelo}`
                        }));
                        setShowNewWoModal(true);
                      }}
                      className="px-3 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-amber-500 hover:text-slate-950 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold transition-all cursor-pointer"
                      title="Emitir Orden de Trabajo"
                    >
                      <Wrench className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* =========================================================================
          SUBTAB 2: ÓRDENES DE TRABAJO (WORK ORDERS)
          ========================================================================= */}
      {activeSubTab === 'ordenes' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800">
            <div className="flex items-center gap-3 flex-wrap">
              <div className="flex items-center gap-1.5 text-xs text-slate-500 font-semibold">
                <Filter className="w-3.5 h-3.5" />
                <span>Filtrar:</span>
              </div>
              <select
                value={selectedMatriculaFilter}
                onChange={e => setSelectedMatriculaFilter(e.target.value)}
                className="px-3 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-800 dark:text-slate-200"
              >
                <option value="TODAS">Todas las Aeronaves</option>
                {aircraftList.map(a => (
                  <option key={a.matricula} value={a.matricula}>
                    {a.matricula} - {a.modelo}
                  </option>
                ))}
              </select>

              <select
                value={woStatusFilter}
                onChange={e => setWoStatusFilter(e.target.value)}
                className="px-3 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-800 dark:text-slate-200"
              >
                <option value="TODOS">Todos los Estados</option>
                <option value="abierta">Abierta</option>
                <option value="en_progreso">En Progreso</option>
                <option value="espera_repuestos">Espera de Repuestos</option>
                <option value="inspeccion_calidad">Inspección de Calidad</option>
                <option value="cerrada_conforme">Cerrada Conforme (RTS)</option>
              </select>
            </div>

            <button
              onClick={() => setShowNewWoModal(true)}
              className="inline-flex items-center gap-2 px-3.5 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-xl text-xs transition-all cursor-pointer shadow-xs"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Emitir Orden de Trabajo</span>
            </button>
          </div>

          <div className="space-y-3">
            {workOrders
              .filter(wo => {
                if (selectedMatriculaFilter !== 'TODAS' && wo.matricula !== selectedMatriculaFilter) return false;
                if (woStatusFilter !== 'TODOS' && wo.estado !== woStatusFilter) return false;
                return true;
              })
              .map(wo => {
                const isClosed = wo.estado === 'cerrada_conforme';
                return (
                  <div
                    key={wo.id}
                    className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-xs hover:border-amber-400/40 transition-all"
                  >
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-mono font-black text-sm text-slate-900 dark:text-white bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded">
                            {wo.id}
                          </span>
                          <span className="font-mono font-bold text-xs text-amber-600 dark:text-amber-400">
                            {wo.matricula}
                          </span>
                          <span className="text-xs px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-semibold uppercase">
                            {wo.tipo.replace('_', ' ')}
                          </span>
                          {getPriorityBadge(wo.prioridad)}
                          {isClosed ? (
                            <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                              <CheckCircle2 className="w-3 h-3" />
                              RTS Certificado
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded bg-blue-500/10 text-blue-500 dark:text-blue-400 border border-blue-500/20">
                              <Clock className="w-3 h-3" />
                              {wo.estado.replace('_', ' ')}
                            </span>
                          )}
                        </div>

                        <h3 className="text-sm font-bold text-slate-900 dark:text-white pt-1">
                          {wo.titulo}
                        </h3>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          {wo.descripcion}
                        </p>

                        <div className="flex items-center gap-4 text-[11px] text-slate-500 dark:text-slate-400 pt-1 flex-wrap">
                          <span>Apertura: {wo.fecha_apertura}</span>
                          <span>Tach Entrada: {wo.horas_aeronave_entrada.toFixed(1)} hrs</span>
                          {wo.horas_aeronave_salida && <span>Tach Salida: {wo.horas_aeronave_salida.toFixed(1)} hrs</span>}
                          <span>TMA: {wo.tecnico_responsable} ({wo.licencia_tma})</span>
                        </div>
                      </div>

                      {/* RTS Actions */}
                      <div className="flex items-center gap-2 flex-shrink-0">
                        {isClosed ? (
                          <div className="text-right">
                            <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-600 dark:text-emerald-400">
                              <Award className="w-4 h-4" />
                              Retorno al Servicio Aprobado
                            </span>
                            <div className="text-[10px] text-slate-400">
                              Firmado por {wo.retorno_al_servicio?.firmado_por} ({wo.retorno_al_servicio?.licencia_firmante})
                            </div>
                          </div>
                        ) : (
                          <button
                            onClick={() => handleOpenRtsModal(wo)}
                            className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white rounded-xl text-xs font-bold transition-all cursor-pointer shadow-sm shadow-emerald-900/30"
                          >
                            <FileCheck2 className="w-4 h-4" />
                            <span>Certificar Retorno al Servicio (RTS)</span>
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
          </div>
        </div>
      )}

      {/* =========================================================================
          SUBTAB 3: NOVEDADES & DISCREPANCIAS (SQUAWKS)
          ========================================================================= */}
      {activeSubTab === 'squawks' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800">
            <div className="flex items-center gap-3 flex-wrap">
              <span className="text-xs text-slate-500 font-semibold">Filtro Estado:</span>
              <select
                value={squawkStatusFilter}
                onChange={e => setSquawkStatusFilter(e.target.value)}
                className="px-3 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-800 dark:text-slate-200"
              >
                <option value="TODOS">Todos</option>
                <option value="reportado">Reportados</option>
                <option value="en_reparacion">En Reparación</option>
                <option value="resuelto">Resueltos</option>
              </select>
            </div>

            <button
              onClick={() => setShowNewSquawkModal(true)}
              className="inline-flex items-center gap-2 px-3.5 py-1.5 bg-rose-600 hover:bg-rose-500 text-white font-bold rounded-xl text-xs transition-all cursor-pointer shadow-xs"
            >
              <AlertTriangle className="w-4 h-4" />
              <span>Reportar Novedad Mecánica</span>
            </button>
          </div>

          <div className="space-y-3">
            {squawks
              .filter(sq => {
                if (squawkStatusFilter !== 'TODOS' && sq.estado !== squawkStatusFilter) return false;
                return true;
              })
              .map(sq => {
                const isResolved = sq.estado === 'resuelto';
                return (
                  <div
                    key={sq.id}
                    className={`bg-white dark:bg-slate-900 rounded-2xl border p-5 shadow-xs transition-all ${
                      sq.severidad === 'aog' && !isResolved
                        ? 'border-rose-500/70 dark:border-rose-600/70 bg-rose-50/20 dark:bg-rose-950/10'
                        : 'border-slate-200 dark:border-slate-800'
                    }`}
                  >
                    <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                      <div className="space-y-1.5">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-mono font-black text-xs text-slate-900 dark:text-white px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800">
                            {sq.id}
                          </span>
                          <span className="font-mono font-bold text-xs text-amber-600 dark:text-amber-400">
                            {sq.matricula}
                          </span>
                          <span className="text-xs px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-semibold uppercase">
                            Sistema: {sq.sistema_afectado}
                          </span>
                          {getSquawkSeverityBadge(sq.severidad)}
                        </div>

                        <p className="text-sm font-semibold text-slate-900 dark:text-white pt-1">
                          {sq.descripcion}
                        </p>

                        <div className="flex items-center gap-4 text-[11px] text-slate-500 dark:text-slate-400">
                          <span>Reportado por: {sq.reportado_por} ({sq.reportado_por_rol})</span>
                          <span>Fecha: {sq.fecha_reporte}</span>
                          {sq.bitacora_folio && <span>Folio Bitácora: #{sq.bitacora_folio}</span>}
                        </div>

                        {/* Resolution details if resolved */}
                        {isResolved && sq.accion_correctiva && (
                          <div className="mt-3 p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/60 text-emerald-900 dark:text-emerald-300 text-xs">
                            <div className="font-bold flex items-center gap-1.5">
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                              <span>Acción Correctiva OMA Certificada:</span>
                            </div>
                            <p className="mt-1 leading-relaxed text-[11px]">
                              {sq.accion_correctiva}
                            </p>
                            <div className="text-[10px] text-emerald-700 dark:text-emerald-400 mt-1 font-mono">
                              Resuelto el {sq.fecha_resolucion} por {sq.resuelto_por} ({sq.resuelto_por_licencia})
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Action */}
                      {!isResolved && (
                        <button
                          onClick={() => {
                            setSelectedSquawkForResolve(sq);
                            setResolveActionText('');
                          }}
                          className="inline-flex items-center gap-1.5 px-3 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition-all cursor-pointer flex-shrink-0"
                        >
                          <Check className="w-3.5 h-3.5" />
                          <span>Firmar Acción Correctiva</span>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
          </div>
        </div>
      )}

      {/* =========================================================================
          SUBTAB 4: ALMACÉN DE REPUESTOS & CONSUMIBLES
          ========================================================================= */}
      {activeSubTab === 'repuestos' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Inventario de Hangar
              </h3>
            </div>
            <div className="text-xs font-bold text-amber-500 bg-amber-500/10 px-3 py-1.5 rounded-xl border border-amber-500/20">
              {metrics.lowStockParts} partes por debajo del mínimo de seguridad
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {parts.map(part => {
              const isLow = part.cantidad_disponible <= part.cantidad_minima_alerta;
              return (
                <div
                  key={part.id}
                  className={`bg-white dark:bg-slate-900 rounded-2xl border p-5 shadow-xs flex flex-col justify-between ${
                    isLow
                      ? 'border-amber-400/80 dark:border-amber-500/80 bg-amber-500/5'
                      : 'border-slate-200 dark:border-slate-800'
                  }`}
                >
                  <div className="space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <span className="font-mono font-black text-sm text-slate-900 dark:text-white">
                          P/N {part.numero_parte}
                        </span>
                        <div className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-0.5">
                          {part.descripcion}
                        </div>
                      </div>
                      {isLow && (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500 text-slate-950 uppercase">
                          Bajo Stock
                        </span>
                      )}
                    </div>

                    <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-100 dark:border-slate-800 flex items-center justify-between">
                      <div>
                        <span className="text-[10px] text-slate-400 uppercase font-semibold">
                          Disponible en Hangar
                        </span>
                        <div className="text-xl font-black text-slate-900 dark:text-white font-mono">
                          {part.cantidad_disponible}{' '}
                          <span className="text-xs font-normal text-slate-400">
                            {part.unidad_medida}
                          </span>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="text-[10px] text-slate-400 uppercase font-semibold">
                          Mínimo de Alerta
                        </span>
                        <div className="text-sm font-bold text-slate-700 dark:text-slate-300 font-mono">
                          {part.cantidad_minima_alerta} {part.unidad_medida}
                        </div>
                      </div>
                    </div>

                    <div className="text-[11px] text-slate-500 dark:text-slate-400 space-y-1 pt-1">
                      <div>
                        <span className="font-semibold text-slate-700 dark:text-slate-300">Ubicación:</span>{' '}
                        {part.ubicacion_hangar}
                      </div>
                      <div>
                        <span className="font-semibold text-slate-700 dark:text-slate-300">Compatible con:</span>{' '}
                        {part.aeronaves_compatibles.join(', ')}
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                    <span className="text-[10px] text-slate-400">
                      Último ingreso: {part.ultimo_ingreso_fecha}
                    </span>
                    <button
                      onClick={() => {
                        setSelectedPartForAdjust(part);
                        setPartAdjustDelta(1);
                        setPartAdjustMotivo('');
                      }}
                      className="px-3 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-amber-500 hover:text-slate-950 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold transition-all cursor-pointer"
                    >
                      Ajustar Stock (+/-)
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* =========================================================================
          SUBTAB 5: DIRECTIVAS DE AERONAVEGABILIDAD (ADS) & BOLETINES
          ========================================================================= */}
      {activeSubTab === 'directivas' && (
        <div className="space-y-4">
          <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              Directivas de Aeronavegabilidad (AD) & Boletines de Servicio (SB)
            </h3>
          </div>

          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-bold uppercase text-[10px] tracking-wider">
                  <tr>
                    <th className="p-3">Código AD / SB</th>
                    <th className="p-3">Título / Detalle</th>
                    <th className="p-3">Aplicabilidad</th>
                    <th className="p-3">Intervalo</th>
                    <th className="p-3">Último Cumplimiento</th>
                    <th className="p-3">Próximo Vencimiento</th>
                    <th className="p-3 text-center">Condición</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {directives.map(ad => (
                    <tr key={ad.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                      <td className="p-3 font-mono font-black text-slate-900 dark:text-white">
                        {ad.codigo_ad}
                      </td>
                      <td className="p-3 font-medium text-slate-800 dark:text-slate-200">
                        {ad.titulo}
                      </td>
                      <td className="p-3 text-slate-600 dark:text-slate-400">
                        {ad.aplicabilidad_modelo}
                      </td>
                      <td className="p-3 font-mono text-slate-600 dark:text-slate-400">
                        {ad.es_recurrente
                          ? `${ad.intervalo_horas ? `${ad.intervalo_horas} hrs` : ''}${
                              ad.intervalo_meses ? ` / ${ad.intervalo_meses} meses` : ''
                            }`
                          : 'Terminante (One-Time)'}
                      </td>
                      <td className="p-3 text-slate-600 dark:text-slate-400">
                        {ad.ultimo_cumplimiento_fecha || 'N/A'}{' '}
                        {ad.ultimo_cumplimiento_horas ? `(${ad.ultimo_cumplimiento_horas}h)` : ''}
                      </td>
                      <td className="p-3 font-semibold text-slate-800 dark:text-slate-200">
                        {ad.proximo_cumplimiento_fecha ||
                          (ad.proximo_cumplimiento_horas ? `${ad.proximo_cumplimiento_horas} hrs` : 'N/A')}
                      </td>
                      <td className="p-3 text-center">
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                          <CheckCircle2 className="w-3 h-3" />
                          Cumplido
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          SUBTAB 6: HISTORIAL DE ENTRADAS Y SALIDAS (TRAZABILIDAD RAC 43 / RAC 145)
          ========================================================================= */}
      {activeSubTab === 'movimientos' && (
        <div className="space-y-4 animate-fade-in">
          {/* Subtab Top Banner & Actions */}
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-slate-900/90 dark:bg-slate-900 p-4 rounded-xl border border-slate-800">
            <div>
              <h2 className="text-lg font-bold text-white">
                Historial de Entrada y Salida de Aeronaves
              </h2>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <button
                onClick={() => handleOpenNewMovement('entrada')}
                className="inline-flex items-center gap-2 px-3.5 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-bold transition-all shadow-xs cursor-pointer"
              >
                <LogIn className="w-4 h-4" />
                <span>+ Registrar Entrada a Taller</span>
              </button>
              <button
                onClick={() => handleOpenNewMovement('salida')}
                className="inline-flex items-center gap-2 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold transition-all shadow-xs cursor-pointer"
              >
                <LogOut className="w-4 h-4" />
                <span>+ Registrar Salida / RTS Conforme</span>
              </button>
            </div>
          </div>

          {/* KPI Cards Row */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3.5 rounded-xl border bg-slate-900/60 border-slate-800">
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span>En Hangar Activos</span>
                <LogIn className="w-4 h-4 text-amber-400" />
              </div>
              <div className="text-xl font-bold text-white mt-1.5 font-mono">
                {metrics.activeInHangar}
              </div>
              <div className="text-[11px] text-amber-400/90 font-medium mt-0.5">
                Ingresos pendientes de RTS
              </div>
            </div>

            <div className="p-3.5 rounded-xl border bg-slate-900/60 border-slate-800">
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span>Salidas / RTS Certificadas</span>
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              </div>
              <div className="text-xl font-bold text-white mt-1.5 font-mono">
                {metrics.certifiedExits}
              </div>
              <div className="text-[11px] text-emerald-400/90 font-medium mt-0.5">
                Liberadas a línea de vuelo
              </div>
            </div>

            <div className="p-3.5 rounded-xl border bg-slate-900/60 border-slate-800">
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span>Bitácoras Vinculadas</span>
                <BookOpen className="w-4 h-4 text-sky-400" />
              </div>
              <div className="text-xl font-bold text-white mt-1.5 font-mono">
                {metrics.linkedBitacoraCount}
              </div>
              <div className="text-[11px] text-slate-400 mt-0.5">
                Con folio formal RAC 43
              </div>
            </div>

            <div className="p-3.5 rounded-xl border bg-slate-900/60 border-slate-800">
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span>Total Movimientos</span>
                <History className="w-4 h-4 text-slate-400" />
              </div>
              <div className="text-xl font-bold text-white mt-1.5 font-mono">
                {metrics.totalMovements}
              </div>
              <div className="text-[11px] text-slate-400 mt-0.5">
                Trazabilidad 100% auditada
              </div>
            </div>
          </div>

          {/* Filters Bar */}
          <div className="bg-white dark:bg-slate-900 p-3 rounded-xl border border-slate-200 dark:border-slate-800 flex flex-col md:flex-row items-stretch md:items-center gap-3">
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Buscar por matrícula, folio bitácora, OT, motivo o técnico TMA..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-sky-500"
              />
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <select
                value={movementTypeFilter}
                onChange={e => setMovementTypeFilter(e.target.value as any)}
                aria-label="Filtrar por tipo de movimiento"
                className="text-xs px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-200 font-medium"
              >
                <option value="TODOS">Tipo: Todos los Movimientos</option>
                <option value="entrada">📥 Solo Entradas (Ingreso)</option>
                <option value="salida">📤 Solo Salidas (RTS)</option>
              </select>

              <select
                value={selectedMatriculaFilter}
                onChange={e => setSelectedMatriculaFilter(e.target.value)}
                aria-label="Filtrar por matrícula de aeronave"
                className="text-xs px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-200 font-medium"
              >
                <option value="TODAS">Aeronave: Todas</option>
                {aircraftList.map(a => (
                  <option key={a.matricula} value={a.matricula}>
                    {a.matricula} ({a.modelo})
                  </option>
                ))}
              </select>

              <select
                value={movementConditionFilter}
                onChange={e => setMovementConditionFilter(e.target.value)}
                aria-label="Filtrar por condición de aeronavegabilidad"
                className="text-xs px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-200 font-medium"
              >
                <option value="TODAS">Condición: Todas</option>
                <option value="aeronavegable_conforme">Aeronavegable Conforme</option>
                <option value="mantenimiento_preventivo">Mantenimiento Preventivo</option>
                <option value="aog_inoperativo">AOG Inoperativo</option>
                <option value="vuelo_ferry_restringido">Vuelo Ferry Restringido</option>
              </select>
            </div>
          </div>

          {/* Movements List Table */}
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 dark:text-slate-400 font-bold border-b border-slate-200 dark:border-slate-800 uppercase tracking-wider text-[10px]">
                    <th className="p-3">Evento & ID</th>
                    <th className="p-3">Aeronave & Horas</th>
                    <th className="p-3">Fecha / Hora & Bahía</th>
                    <th className="p-3">Motivo del Movimiento</th>
                    <th className="p-3">Vinculación con Bitácora</th>
                    <th className="p-3">Técnico & Licencia</th>
                    <th className="p-3">Condición</th>
                    <th className="p-3 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                  {filteredMovements.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="p-8 text-center text-slate-500 dark:text-slate-400">
                        <History className="w-8 h-8 mx-auto text-slate-400 mb-2 opacity-50" />
                        <p className="font-semibold">Sin movimientos registrados.</p>
                      </td>
                    </tr>
                  ) : (
                    filteredMovements.map(mov => {
                      const isEntry = mov.tipo === 'entrada';
                      const hasExit = movements.some(m => m.tipo === 'salida' && m.entrada_id_relacionada === mov.id);

                      return (
                        <tr
                          key={mov.id}
                          className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors"
                        >
                          <td className="p-3 whitespace-nowrap">
                            <div className="flex items-center gap-2">
                              {isEntry ? (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/30">
                                  <LogIn className="w-3 h-3" />
                                  ENTRADA
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
                                  <LogOut className="w-3 h-3" />
                                  SALIDA (RTS)
                                </span>
                              )}
                              <span className="font-mono text-slate-500 dark:text-slate-400 text-[11px]">
                                {mov.id}
                              </span>
                            </div>
                          </td>

                          <td className="p-3">
                            <div className="font-mono font-bold text-slate-900 dark:text-white">
                              {mov.matricula}
                            </div>
                            <div className="text-[11px] text-slate-500 dark:text-slate-400">
                              {mov.modelo}
                            </div>
                            <div className="text-[10px] font-mono text-slate-600 dark:text-slate-300">
                              Tach: {mov.tach_hobbs.toFixed(1)} hrs
                            </div>
                          </td>

                          <td className="p-3 whitespace-nowrap">
                            <div className="font-semibold text-slate-800 dark:text-slate-200">
                              {mov.fecha}
                            </div>
                            <div className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {mov.hora} hrs
                            </div>
                            <div className="text-[10px] text-slate-400">
                              {mov.ubicacion_hangar}
                            </div>
                          </td>

                          <td className="p-3 max-w-xs">
                            <div className="font-semibold text-slate-900 dark:text-white line-clamp-1">
                              {mov.motivo_principal}
                            </div>
                            {mov.descripcion_detallada && (
                              <div className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-2 mt-0.5">
                                {mov.descripcion_detallada}
                              </div>
                            )}
                          </td>

                          <td className="p-3">
                            <div className="flex flex-col gap-1">
                              <div className="flex items-center gap-1.5">
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded font-mono font-bold text-[11px] bg-slate-100 dark:bg-slate-800 text-sky-600 dark:text-sky-400 border border-slate-200 dark:border-slate-700">
                                  <BookOpen className="w-3 h-3 text-sky-500" />
                                  {mov.bitacora_folio}
                                </span>
                                <span className="text-[10px] uppercase font-semibold text-slate-400">
                                  [{mov.bitacora_tipo}]
                                </span>
                              </div>
                              {mov.orden_trabajo_id && (
                                <div className="text-[10px] text-slate-500 dark:text-slate-400 flex items-center gap-1 font-mono">
                                  <ClipboardList className="w-3 h-3 text-amber-500" />
                                  OT: {mov.orden_trabajo_id}
                                </div>
                              )}
                              {mov.squawk_id && (
                                <div className="text-[10px] text-rose-500 flex items-center gap-1 font-mono">
                                  <AlertTriangle className="w-3 h-3" />
                                  Squawk: {mov.squawk_id}
                                </div>
                              )}
                            </div>
                          </td>

                          <td className="p-3 whitespace-nowrap">
                            <div className="font-semibold text-slate-800 dark:text-slate-200">
                              {mov.tecnico_responsable}
                            </div>
                            <div className="text-[11px] font-mono text-slate-500 dark:text-slate-400">
                              Lic. {mov.licencia_tma}
                            </div>
                          </td>

                          <td className="p-3 whitespace-nowrap">
                            {mov.condicion_aeronavegabilidad === 'aeronavegable_conforme' && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                                <CheckCircle2 className="w-3 h-3" />
                                Aeronavegable
                              </span>
                            )}
                            {mov.condicion_aeronavegabilidad === 'mantenimiento_preventivo' && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-500/10 text-blue-500 dark:text-blue-400 border border-blue-500/20">
                                <Wrench className="w-3 h-3" />
                                En Taller
                              </span>
                            )}
                            {mov.condicion_aeronavegabilidad === 'aog_inoperativo' && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/10 text-rose-500 dark:text-rose-400 border border-rose-500/20">
                                <AlertOctagon className="w-3 h-3" />
                                AOG Inoperativo
                              </span>
                            )}
                            {mov.condicion_aeronavegabilidad === 'vuelo_ferry_restringido' && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-500 dark:text-amber-400 border border-amber-500/20">
                                <AlertTriangle className="w-3 h-3" />
                                Ferry Restringido
                              </span>
                            )}
                          </td>

                          <td className="p-3 text-right whitespace-nowrap">
                            <div className="flex items-center justify-end gap-1.5">
                              {isEntry && !hasExit && (
                                <button
                                  onClick={() => handleOpenExitForEntry(mov)}
                                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-bold bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 transition-all cursor-pointer"
                                  title="Registrar Salida / Retorno al Servicio de esta aeronave"
                                >
                                  <LogOut className="w-3 h-3" />
                                  <span>Registrar Salida</span>
                                </button>
                              )}

                              <button
                                onClick={() => setSelectedMovementForDetail(mov)}
                                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-bold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-700 transition-all cursor-pointer"
                                title="Ver Ficha Técnica y Asiento Oficial de Bitácora"
                              >
                                <FileText className="w-3 h-3 text-sky-500" />
                                <span>Ver Ficha</span>
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          MODAL 1: BLOQUEO / DESBLOQUEO EN TIERRA AOG
          ========================================================================= */}
      {selectedAircraftForLock && (() => {
        const currentlyGrounded = isAircraftGrounded(selectedAircraftForLock);
        const isOverdue50 = selectedAircraftForLock.horas_restantes_50h <= 0;
        const isOverdue100 = selectedAircraftForLock.horas_restantes_100h <= 0;
        const hasOverdue = isOverdue50 || isOverdue100;
        const openAogSquawksCount = squawks.filter(
          s => s.matricula.toUpperCase() === selectedAircraftForLock.matricula.toUpperCase() && s.severidad === 'aog' && s.estado !== 'resuelto'
        ).length;

        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs animate-fade-in overflow-y-auto">
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 max-w-md w-full max-h-[90vh] overflow-y-auto my-auto p-6 shadow-2xl space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {currentlyGrounded ? (
                    <Unlock className="w-5 h-5 text-emerald-500" />
                  ) : (
                    <Lock className="w-5 h-5 text-rose-500" />
                  )}
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">
                    {currentlyGrounded
                      ? `Desbloquear Despacho de ${selectedAircraftForLock.matricula}`
                      : `Inmovilizar en Tierra (AOG) ${selectedAircraftForLock.matricula}`}
                  </h3>
                </div>
                <button
                  onClick={() => setSelectedAircraftForLock(null)}
                  className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                {currentlyGrounded
                  ? `Al desbloquear la aeronave, volverá a estar disponible en el despachador de vuelos e itinerarios de estudiantes e instructores.`
                  : `Al inmovilizar la aeronave por condición AOG, el despachador rechazará automáticamente cualquier programación de vuelo con este equipo.`}
              </p>

              {currentlyGrounded && (hasOverdue || openAogSquawksCount > 0) && (
                <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/60 text-xs space-y-2">
                  <div className="font-bold text-amber-800 dark:text-amber-300 flex items-center gap-1.5">
                    <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                    <span>Condiciones activas detectadas al desbloquear:</span>
                  </div>
                  {hasOverdue && (
                    <label className="flex items-start gap-2 text-[11px] text-amber-900 dark:text-amber-200 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={unlockResetOverdue}
                        onChange={e => setUnlockResetOverdue(e.target.checked)}
                        className="mt-0.5 rounded text-emerald-600"
                      />
                      <span>
                        Inspección horaria vencida ({isOverdue100 ? '100h' : ''}{isOverdue100 && isOverdue50 ? ' y ' : ''}{isOverdue50 ? '50h' : ''}).{' '}
                        <strong>Reiniciar contador al liberar</strong> para evitar bloqueo automático inmediato.
                      </span>
                    </label>
                  )}
                  {openAogSquawksCount > 0 && (
                    <label className="flex items-start gap-2 text-[11px] text-amber-900 dark:text-amber-200 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={unlockResolveSquawks}
                        onChange={e => setUnlockResolveSquawks(e.target.checked)}
                        className="mt-0.5 rounded text-emerald-600"
                      />
                      <span>
                        Cerrar {openAogSquawksCount} discrepancia(s) AOG abiertas al confirmar retorno al servicio.
                      </span>
                    </label>
                  )}
                </div>
              )}

              {!currentlyGrounded && (
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Motivo Técnico de Inmovilización (AOG / Inspección / Falla):
                  </label>
                  <textarea
                    rows={3}
                    value={lockReason}
                    onChange={e => setLockReason(e.target.value)}
                    placeholder="ej. Discrepancia crítica en cilindro No. 3 o inspección 100 horas vencida."
                    className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-amber-500"
                  />
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setSelectedAircraftForLock(null)}
                  className="px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold rounded-xl"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  disabled={actionLoading}
                  onClick={handleToggleGroundLock}
                  className={`px-4 py-2 text-white text-xs font-bold rounded-xl transition-all cursor-pointer ${
                    currentlyGrounded
                      ? 'bg-emerald-600 hover:bg-emerald-500'
                      : 'bg-rose-600 hover:bg-rose-500'
                  }`}
                >
                  {actionLoading ? 'Procesando...' : currentlyGrounded ? 'Confirmar Retorno a Vuelo' : 'Confirmar Bloqueo AOG'}
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* =========================================================================
          MODAL 2: CERTIFICACIÓN DE RETORNO AL SERVICIO (RTS)
          ========================================================================= */}
      {selectedWoForRTS && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs animate-fade-in overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 max-w-lg w-full max-h-[90vh] overflow-y-auto my-auto p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Award className="w-5 h-5 text-emerald-500" />
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Aprobación de Retorno al Servicio (RTS) - RAC 43 / RAC 145
                </h3>
              </div>
              <button
                onClick={() => setSelectedWoForRTS(null)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-xs space-y-1">
              <div className="flex justify-between">
                <span className="font-bold text-slate-800 dark:text-slate-200">Orden de Trabajo:</span>
                <span className="font-mono text-amber-500 font-bold">{selectedWoForRTS.id}</span>
              </div>
              <div className="flex justify-between">
                <span className="font-bold text-slate-800 dark:text-slate-200">Aeronave:</span>
                <span className="font-mono font-bold">{selectedWoForRTS.matricula}</span>
              </div>
              <div className="flex justify-between">
                <span className="font-bold text-slate-800 dark:text-slate-200">Tipo de Trabajo:</span>
                <span className="uppercase font-semibold">{selectedWoForRTS.tipo.replace('_', ' ')}</span>
              </div>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Horas Tachómetro / TT de Salida de Taller:
                </label>
                <input
                  type="number"
                  step="0.1"
                  required
                  value={rtsTachSalida}
                  onChange={e => setRtsTachSalida(parseFloat(e.target.value) || 0)}
                  className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-mono text-slate-900 dark:text-white font-bold"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Técnico Certificador (TMA):
                  </label>
                  <input
                    type="text"
                    required
                    value={rtsTmaName}
                    onChange={e => setRtsTmaName(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Licencia AAC No.:
                  </label>
                  <input
                    type="text"
                    required
                    value={rtsTmaLic}
                    onChange={e => setRtsTmaLic(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Declaración Regulatoria de Retorno al Servicio:
                </label>
                <textarea
                  rows={3}
                  value={rtsDeclaration}
                  onChange={e => setRtsDeclaration(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white leading-relaxed text-[11px]"
                />
              </div>

              <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-1.5">
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
                  <span>Resolver automáticamente discrepancias AOG vinculadas o abiertas de {selectedWoForRTS.matricula}</span>
                </label>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setSelectedWoForRTS(null)}
                className="px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold rounded-xl"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={actionLoading}
                onClick={handleConfirmRts}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl shadow-md transition-all flex items-center gap-1.5"
              >
                <FileCheck2 className="w-4 h-4" />
                <span>{actionLoading ? 'Firmando...' : 'Firmar y Emitir RTS'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          MODAL 3: NUEVA ORDEN DE TRABAJO (OT)
          ========================================================================= */}
      {showNewWoModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs animate-fade-in overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 max-w-lg w-full max-h-[90vh] overflow-y-auto my-auto p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Wrench className="w-5 h-5 text-amber-500" />
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Apertura de Orden de Trabajo (OT)
                </h3>
              </div>
              <button
                onClick={() => setShowNewWoModal(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateWorkOrder} className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Aeronave:
                  </label>
                  <select
                    value={newWoForm.matricula}
                    onChange={e => {
                      const selAc = aircraftList.find(a => a.matricula === e.target.value);
                      setNewWoForm(prev => ({
                        ...prev,
                        matricula: e.target.value,
                        horas_aeronave_entrada: selAc ? selAc.horas_totales_celula : prev.horas_aeronave_entrada
                      }));
                    }}
                    className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-bold"
                  >
                    {aircraftList.map(a => (
                      <option key={a.matricula} value={a.matricula}>
                        {a.matricula} ({a.modelo})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Tipo de Mantenimiento:
                  </label>
                  <select
                    value={newWoForm.tipo}
                    onChange={e => setNewWoForm(prev => ({ ...prev, tipo: e.target.value as WorkOrderType }))}
                    className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-semibold"
                  >
                    <option value="inspeccion_50h">Inspección 50 Horas</option>
                    <option value="inspeccion_100h">Inspección 100 Horas</option>
                    <option value="inspeccion_anual">Inspección Anual</option>
                    <option value="correctivo">Mantenimiento Correctivo</option>
                    <option value="servicio_aceite">Servicio de Aceite y Filtro</option>
                    <option value="avionica">Aviónica & Instrumentos</option>
                    <option value="directiva_ad">Directiva de Aeronavegabilidad (AD)</option>
                    <option value="overhaul">Overhaul / Gran Mantenimiento</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Título de la Orden:
                </label>
                <input
                  type="text"
                  required
                  placeholder="ej. Inspección periódica 100 horas y cambio de bujías"
                  value={newWoForm.titulo}
                  onChange={e => setNewWoForm(prev => ({ ...prev, titulo: e.target.value }))}
                  className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Alcance y Tareas a Desarrollar:
                </label>
                <textarea
                  rows={3}
                  placeholder="Detalla los trabajos a realizar, manuales de referencia (CMM, AMM) e ítems a inspeccionar."
                  value={newWoForm.descripcion}
                  onChange={e => setNewWoForm(prev => ({ ...prev, descripcion: e.target.value }))}
                  className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Horas Entrada (Tach):
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    value={newWoForm.horas_aeronave_entrada}
                    onChange={e => setNewWoForm(prev => ({ ...prev, horas_aeronave_entrada: parseFloat(e.target.value) || 0 }))}
                    className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-mono"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Prioridad de Taller:
                  </label>
                  <select
                    value={newWoForm.prioridad}
                    onChange={e => setNewWoForm(prev => ({ ...prev, prioridad: e.target.value as any }))}
                    className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
                  >
                    <option value="baja">Baja</option>
                    <option value="media">Media</option>
                    <option value="alta">Alta</option>
                    <option value="aog_critico">AOG Crítico</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    TMA Asignado:
                  </label>
                  <input
                    type="text"
                    required
                    value={newWoForm.tecnico_responsable}
                    onChange={e => setNewWoForm(prev => ({ ...prev, tecnico_responsable: e.target.value }))}
                    className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Licencia TMA:
                  </label>
                  <input
                    type="text"
                    required
                    value={newWoForm.licencia_tma}
                    onChange={e => setNewWoForm(prev => ({ ...prev, licencia_tma: e.target.value }))}
                    className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-mono"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setShowNewWoModal(false)}
                  className="px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold rounded-xl"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold rounded-xl shadow-md transition-all flex items-center gap-1.5"
                >
                  <PlusCircle className="w-4 h-4" />
                  <span>{actionLoading ? 'Emitiendo...' : 'Emitir Orden de Trabajo'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =========================================================================
          MODAL 4: REPORTAR NOVEDAD TÉCNICA (SQUAWK)
          ========================================================================= */}
      {showNewSquawkModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs animate-fade-in overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 max-w-md w-full max-h-[90vh] overflow-y-auto my-auto p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-rose-500" />
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Reportar Novedad o Discrepancia Técnica
                </h3>
              </div>
              <button
                onClick={() => setShowNewSquawkModal(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateSquawk} className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Aeronave:
                  </label>
                  <select
                    value={newSquawkForm.matricula}
                    onChange={e => setNewSquawkForm(prev => ({ ...prev, matricula: e.target.value }))}
                    className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-bold"
                  >
                    {aircraftList.map(a => (
                      <option key={a.matricula} value={a.matricula}>
                        {a.matricula}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Sistema Afectado:
                  </label>
                  <select
                    value={newSquawkForm.sistema_afectado}
                    onChange={e => setNewSquawkForm(prev => ({ ...prev, sistema_afectado: e.target.value as any }))}
                    className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
                  >
                    <option value="motor">Motor & Planta Motriz</option>
                    <option value="avionica">Aviónica & Comunicaciones</option>
                    <option value="estructura">Estructura & Celda</option>
                    <option value="tren_frenos">Tren de Aterrizaje / Frenos</option>
                    <option value="electrico">Sistema Eléctrico</option>
                    <option value="mandos_vuelo">Mandos de Vuelo</option>
                    <option value="cabina">Cabina & Asientos</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Severidad de la Discrepancia:
                </label>
                <select
                  value={newSquawkForm.severidad}
                  onChange={e => setNewSquawkForm(prev => ({ ...prev, severidad: e.target.value as SquawkSeverity }))}
                  className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-bold"
                >
                  <option value="preventivo">Preventivo (Atención en próximo mantenimiento)</option>
                  <option value="mel_diferible">MEL Diferible (Permite vuelo bajo Lista de Equipo Mínimo)</option>
                  <option value="aog">AOG Crítico (Inmoviliza inmediatamente el avión)</option>
                  <option value="observacion">Observación Operacional</option>
                </select>
                {newSquawkForm.severidad === 'aog' && (
                  <p className="mt-1 text-[10px] text-rose-500 font-bold">
                    ⚠️ ADVERTENCIA: La severidad AOG bloqueará automáticamente el despacho de la aeronave en todo el sistema.
                  </p>
                )}
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Folio de Bitácora de Vuelo (Opcional):
                </label>
                <input
                  type="text"
                  placeholder="ej. FOL-2026-089"
                  value={newSquawkForm.bitacora_folio}
                  onChange={e => setNewSquawkForm(prev => ({ ...prev, bitacora_folio: e.target.value }))}
                  className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Descripción Detallada de la Falla:
                </label>
                <textarea
                  rows={3}
                  required
                  placeholder="ej. Caída excesiva de 180 RPM en magnetos izquierdos durante prueba de motor a 1,700 RPM."
                  value={newSquawkForm.descripcion}
                  onChange={e => setNewSquawkForm(prev => ({ ...prev, descripcion: e.target.value }))}
                  className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowNewSquawkModal(false)}
                  className="px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold rounded-xl"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold rounded-xl shadow-md transition-all flex items-center gap-1.5"
                >
                  <AlertTriangle className="w-4 h-4" />
                  <span>{actionLoading ? 'Registrando...' : 'Registrar Novedad'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =========================================================================
          MODAL 5: RESOLVER NOVEDAD / DISCREPANCIA
          ========================================================================= */}
      {selectedSquawkForResolve && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs animate-fade-in overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 max-w-md w-full max-h-[90vh] overflow-y-auto my-auto p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Firmar Corrección de Discrepancia {selectedSquawkForResolve.id}
                </h3>
              </div>
              <button
                onClick={() => setSelectedSquawkForResolve(null)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs">
              <span className="font-bold text-slate-800 dark:text-slate-200">Novedad reportada:</span>
              <p className="mt-1 text-slate-600 dark:text-slate-300">{selectedSquawkForResolve.descripcion}</p>
            </div>

            <form onSubmit={handleResolveSquawk} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Acción Correctiva Realizada por Taller:
                </label>
                <textarea
                  rows={3}
                  required
                  placeholder="ej. Se reemplazó bujía inferior No. 3 por nueva P/N REM40E. Prueba en tierra satisfactoria dentro de parámetros del manual."
                  value={resolveActionText}
                  onChange={e => setResolveActionText(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    TMA Certificador:
                  </label>
                  <input
                    type="text"
                    required
                    value={resolveTmaName}
                    onChange={e => setResolveTmaName(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Licencia TMA:
                  </label>
                  <input
                    type="text"
                    required
                    value={resolveTmaLic}
                    onChange={e => setResolveTmaLic(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-mono"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setSelectedSquawkForResolve(null)}
                  className="px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold rounded-xl"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl shadow-md transition-all flex items-center gap-1.5"
                >
                  <Check className="w-4 h-4" />
                  <span>{actionLoading ? 'Guardando...' : 'Cerrar Discrepancia'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =========================================================================
          MODAL 6: AJUSTE DE STOCK DE REPUESTOS
          ========================================================================= */}
      {selectedPartForAdjust && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs animate-fade-in overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 max-w-sm w-full max-h-[90vh] overflow-y-auto my-auto p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Package className="w-5 h-5 text-amber-500" />
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Ajuste de Stock
                </h3>
              </div>
              <button
                onClick={() => setSelectedPartForAdjust(null)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800 text-xs space-y-1">
              <div className="font-mono font-bold text-slate-900 dark:text-white">
                P/N {selectedPartForAdjust.numero_parte}
              </div>
              <div className="text-slate-500">{selectedPartForAdjust.descripcion}</div>
              <div className="text-slate-700 dark:text-slate-300 font-semibold pt-1">
                Stock actual: {selectedPartForAdjust.cantidad_disponible} {selectedPartForAdjust.unidad_medida}
              </div>
            </div>

            <form onSubmit={handleAdjustPart} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Cantidad a sumar o restar (usa signo negativo para consumo):
                </label>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setPartAdjustDelta(prev => prev - 1)}
                    className="w-9 h-9 rounded-xl bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-white font-bold flex items-center justify-center hover:bg-slate-300"
                  >
                    -
                  </button>
                  <input
                    type="number"
                    required
                    value={partAdjustDelta}
                    onChange={e => setPartAdjustDelta(parseInt(e.target.value) || 0)}
                    className="flex-1 p-2 text-center rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-mono font-bold text-base"
                  />
                  <button
                    type="button"
                    onClick={() => setPartAdjustDelta(prev => prev + 1)}
                    className="w-9 h-9 rounded-xl bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-white font-bold flex items-center justify-center hover:bg-slate-300"
                  >
                    +
                  </button>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Motivo de Ajuste:
                </label>
                <input
                  type="text"
                  placeholder="ej. Consumo para cambio de aceite en HP-1450"
                  value={partAdjustMotivo}
                  onChange={e => setPartAdjustMotivo(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
                />
              </div>
              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setSelectedPartForAdjust(null)}
                  className="px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold rounded-xl"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold rounded-xl shadow-md transition-all"
                >
                  {actionLoading ? 'Guardando...' : 'Aplicar Ajuste'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =========================================================================
          MODAL: REGISTRAR ENTRADA / SALIDA (VINCULACIÓN A BITÁCORAS)
          ========================================================================= */}
      {showNewMovementModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs animate-fade-in overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 max-w-2xl w-full p-6 shadow-2xl my-auto space-y-4 max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2.5">
                <div className={`p-2 rounded-lg ${newMovementForm.tipo === 'entrada' ? 'bg-blue-500/10 text-blue-500' : 'bg-emerald-500/10 text-emerald-500'}`}>
                  {newMovementForm.tipo === 'entrada' ? <LogIn className="w-5 h-5" /> : <LogOut className="w-5 h-5" />}
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">
                    {newMovementForm.tipo === 'entrada'
                      ? 'Registrar Entrada a Taller'
                      : 'Registrar Salida / RTS'}
                  </h3>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowNewMovementModal(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Toggle Tipo de Evento */}
            <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl">
              <button
                type="button"
                onClick={() => {
                  setNewMovementForm(prev => ({
                    ...prev,
                    tipo: 'entrada',
                    condicion_aeronavegabilidad: 'mantenimiento_preventivo',
                    ubicacion_hangar: 'Hangar OMA - Bahía 1',
                    motivo_principal: 'Inspección Periódica Obligatoria 100 Horas',
                    entrada_id_relacionada: undefined,
                    reset_inspeccion: 'auto'
                  }));
                }}
                className={`py-2 text-xs font-bold rounded-lg flex items-center justify-center gap-2 transition-all cursor-pointer ${
                  newMovementForm.tipo === 'entrada'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <LogIn className="w-4 h-4" />
                <span>Entrada (Ingreso a Taller)</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setNewMovementForm(prev => {
                    const openEntry = findOpenEntryForAircraft(prev.matricula);
                    const openWo = workOrders.find(w => w.matricula.toUpperCase() === prev.matricula.toUpperCase() && w.estado !== 'cerrada_conforme');
                    return {
                      ...prev,
                      tipo: 'salida',
                      condicion_aeronavegabilidad: 'aeronavegable_conforme',
                      ubicacion_hangar: 'Hangar SkyOps 4 - Rampa Principal',
                      motivo_principal: openEntry
                        ? `Retorno al Servicio (RTS Conforme) - Completado: ${openEntry.motivo_principal}`
                        : 'Retorno al Servicio (RTS Conforme) - Trabajos Concluidos',
                      bitacora_folio: openEntry?.bitacora_folio || prev.bitacora_folio,
                      bitacora_tipo: openEntry?.bitacora_tipo || prev.bitacora_tipo,
                      orden_trabajo_id: openEntry?.orden_trabajo_id || openWo?.id || prev.orden_trabajo_id,
                      squawk_id: openEntry?.squawk_id || prev.squawk_id,
                      asiento_bitacora: prev.asiento_bitacora || `Certifico que la aeronave ${prev.matricula} ha sido inspeccionada de acuerdo a RAC 43 / RAC 145 y se determina en condición aeronavegable.`,
                      entrada_id_relacionada: openEntry?.id,
                      reset_inspeccion: 'auto'
                    };
                  });
                }}
                className={`py-2 text-xs font-bold rounded-lg flex items-center justify-center gap-2 transition-all cursor-pointer ${
                  newMovementForm.tipo === 'salida'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <LogOut className="w-4 h-4" />
                <span>Salida / Retorno al Servicio (RTS)</span>
              </button>
            </div>

            {newMovementForm.tipo === 'salida' && newMovementForm.entrada_id_relacionada && (
              <div className="p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/50 text-xs text-emerald-800 dark:text-emerald-300 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                <span>
                  Cerrando ingreso activo <strong className="font-mono">{newMovementForm.entrada_id_relacionada}</strong> y habilitando aeronave para despacho de vuelo.
                </span>
              </div>
            )}

            <form onSubmit={handleCreateMovement} className="space-y-4 text-xs">
              {/* Aeronave, Fecha, Hora, Horómetro */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Matrícula Aeronave *
                  </label>
                  <select
                    value={newMovementForm.matricula}
                    onChange={e => {
                      const mat = e.target.value;
                      const targetAc = aircraftList.find(a => a.matricula.toUpperCase() === mat.toUpperCase());
                      const model = targetAc ? targetAc.modelo : 'Cessna 172 Skyhawk';
                      const tach = targetAc ? targetAc.horas_totales_celula : 2450.4;
                      const ym = new Date().toISOString().slice(0, 7).replace('-', '');
                      const openEntry = newMovementForm.tipo === 'salida' ? findOpenEntryForAircraft(mat) : undefined;
                      const openWo = workOrders.find(w => w.matricula.toUpperCase() === mat.toUpperCase() && w.estado !== 'cerrada_conforme');
                      const openSquawk = squawks.find(s => s.matricula.toUpperCase() === mat.toUpperCase() && s.estado !== 'resuelto');
                      setNewMovementForm(prev => ({
                        ...prev,
                        matricula: mat,
                        modelo: model,
                        tach_hobbs: tach,
                        bitacora_folio: openEntry?.bitacora_folio || `BIT-${mat.replace('HP-', '')}-${ym}-01`,
                        bitacora_tipo: openEntry?.bitacora_tipo || prev.bitacora_tipo,
                        orden_trabajo_id: openEntry?.orden_trabajo_id || openWo?.id || '',
                        squawk_id: openEntry?.squawk_id || openSquawk?.id || '',
                        entrada_id_relacionada: prev.tipo === 'salida' ? openEntry?.id : undefined,
                        motivo_principal:
                          prev.tipo === 'salida'
                            ? openEntry
                              ? `Retorno al Servicio (RTS Conforme) - Completado: ${openEntry.motivo_principal}`
                              : 'Retorno al Servicio (RTS Conforme) - Trabajos Concluidos'
                            : prev.motivo_principal
                      }));
                    }}
                    className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-mono font-bold"
                  >
                    {aircraftList.map(a => (
                      <option key={a.matricula} value={a.matricula}>
                        {a.matricula} ({a.modelo})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Horómetro / Tach Hobbs *
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    value={newMovementForm.tach_hobbs}
                    onChange={e => setNewMovementForm(prev => ({ ...prev, tach_hobbs: parseFloat(e.target.value) || 0 }))}
                    className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-mono font-bold"
                    required
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Fecha del Evento *
                  </label>
                  <input
                    type="date"
                    value={newMovementForm.fecha}
                    onChange={e => setNewMovementForm(prev => ({ ...prev, fecha: e.target.value }))}
                    className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
                    required
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Hora Local (24h) *
                  </label>
                  <input
                    type="time"
                    value={newMovementForm.hora}
                    onChange={e => setNewMovementForm(prev => ({ ...prev, hora: e.target.value }))}
                    className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
                    required
                  />
                </div>
              </div>

              {/* Motivo Principal y Sugerencias rápidas */}
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Motivo Principal del Movimiento *
                </label>
                <input
                  type="text"
                  placeholder="ej. Inspección Periódica Obligatoria 100 Horas o Retorno al Servicio RTS"
                  value={newMovementForm.motivo_principal}
                  onChange={e => setNewMovementForm(prev => ({ ...prev, motivo_principal: e.target.value }))}
                  className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-semibold"
                  required
                />
                {/* Quick chips */}
                <div className="flex items-center gap-1.5 flex-wrap mt-1.5">
                  <span className="text-[10px] text-slate-400">Sugerencias:</span>
                  {(newMovementForm.tipo === 'entrada' ? [
                    'Inspección Periódica 100 Horas',
                    'Falla de Magneto Izquierdo',
                    'Cambio de Aceite & Filtro 50h',
                    'Cumplimiento Directiva AD 2026-11',
                    'Reemplazo Neumático Principal',
                    'Mantenimiento No Programado AOG'
                  ] : [
                    'Retorno al Servicio (RTS Conforme) - Inspección 100h Finalizada',
                    'Liberación Técnica tras Cambio de Magneto',
                    'Vuelo Ferry Restringido a Taller Mayor',
                    'Pruebas Funcionales en Tierra Satisfactorias'
                  ]).map(chip => (
                    <button
                      key={chip}
                      type="button"
                      onClick={() => setNewMovementForm(prev => ({ ...prev, motivo_principal: chip }))}
                      className="px-2 py-0.5 rounded text-[10px] bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-300 dark:hover:bg-slate-700 transition-colors"
                    >
                      {chip}
                    </button>
                  ))}
                </div>
              </div>

              {/* Descripción detallada */}
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Alcance o Descripción Detallada de Trabajos
                </label>
                <textarea
                  rows={2}
                  placeholder="Detalla las tareas ejecutadas, novedades atendidas, pruebas en tierra realizadas..."
                  value={newMovementForm.descripcion_detallada}
                  onChange={e => setNewMovementForm(prev => ({ ...prev, descripcion_detallada: e.target.value }))}
                  className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
                />
              </div>

              {/* ==========================================
                  SECCIÓN DE VINCULACIÓN A BITÁCORAS
                  ========================================== */}
              <div className="p-3.5 bg-sky-50 dark:bg-sky-950/20 border border-sky-200 dark:border-sky-800/40 rounded-xl space-y-3">
                <div className="flex items-center gap-2">
                  <BookOpen className="w-4 h-4 text-sky-600 dark:text-sky-400" />
                  <h4 className="font-bold text-sky-950 dark:text-sky-300 text-xs uppercase tracking-wider">
                    Vinculación con Bitácoras Oficiales (Trazabilidad RAC 43 / RAC 145)
                  </h4>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  <div>
                    <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Folio de Bitácora *
                    </label>
                    <input
                      type="text"
                      placeholder="ej. BIT-1450-202611-01"
                      value={newMovementForm.bitacora_folio}
                      onChange={e => setNewMovementForm(prev => ({ ...prev, bitacora_folio: e.target.value }))}
                      className="w-full p-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-mono font-bold"
                      required
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Tipo de Bitácora *
                    </label>
                    <select
                      value={newMovementForm.bitacora_tipo}
                      onChange={e => setNewMovementForm(prev => ({ ...prev, bitacora_tipo: e.target.value as any }))}
                      className="w-full p-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-medium"
                    >
                      <option value="celula">Bitácora de Célula (Airframe)</option>
                      <option value="motor">Bitácora de Motor (Engine Log)</option>
                      <option value="helice">Bitácora de Hélice (Propeller)</option>
                      <option value="avionica">Bitácora de Aviónica</option>
                      <option value="vuelo_diario">Bitácora Diaria de Vuelo</option>
                    </select>
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Orden de Trabajo (OT)
                    </label>
                    <select
                      value={newMovementForm.orden_trabajo_id}
                      onChange={e => setNewMovementForm(prev => ({ ...prev, orden_trabajo_id: e.target.value }))}
                      className="w-full p-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-mono"
                    >
                      <option value="">Sin OT vinculada (Directo)</option>
                      {workOrders
                        .filter(w => w.matricula.toUpperCase() === newMovementForm.matricula.toUpperCase())
                        .map(w => (
                          <option key={w.id} value={w.id}>
                            {w.id} - {w.titulo} ({w.estado})
                          </option>
                        ))}
                    </select>
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Squawk / Novedad ID
                    </label>
                    <select
                      value={newMovementForm.squawk_id}
                      onChange={e => setNewMovementForm(prev => ({ ...prev, squawk_id: e.target.value }))}
                      className="w-full p-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-mono"
                    >
                      <option value="">Ninguno</option>
                      {squawks
                        .filter(s => s.matricula.toUpperCase() === newMovementForm.matricula.toUpperCase())
                        .map(s => (
                          <option key={s.id} value={s.id}>
                            {s.id} - {s.sistema_afectado} ({s.severidad})
                          </option>
                        ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Asiento Oficial Registrado en Bitácora (Texto de Certificación Técnica)
                  </label>
                  <textarea
                    rows={2}
                    placeholder="Certifico que la aeronave ha sido inspeccionada / ingresada conforme a RAC 43..."
                    value={newMovementForm.asiento_bitacora}
                    onChange={e => setNewMovementForm(prev => ({ ...prev, asiento_bitacora: e.target.value }))}
                    className="w-full p-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-mono text-[11px]"
                  />
                </div>
              </div>

              {/* Ubicación en Hangar & Condición Aeronavegable */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Ubicación en Hangar / Bahía
                  </label>
                  <input
                    type="text"
                    value={newMovementForm.ubicacion_hangar}
                    onChange={e => setNewMovementForm(prev => ({ ...prev, ubicacion_hangar: e.target.value }))}
                    placeholder="ej. Hangar OMA - Bahía 1"
                    className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Condición de Aeronavegabilidad Resultante *
                  </label>
                  <select
                    value={newMovementForm.condicion_aeronavegabilidad}
                    onChange={e => setNewMovementForm(prev => ({ ...prev, condicion_aeronavegabilidad: e.target.value as any }))}
                    className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-semibold"
                  >
                    {newMovementForm.tipo === 'entrada' ? (
                      <>
                        <option value="mantenimiento_preventivo">En Mantenimiento Preventivo (Bloquea Despacho)</option>
                        <option value="aog_inoperativo">AOG Inoperativo (Inmovilizado Estricto)</option>
                      </>
                    ) : (
                      <>
                        <option value="aeronavegable_conforme">Aeronavegable Conforme (Habilita y Desbloquea Vuelo)</option>
                        <option value="vuelo_ferry_restringido">Vuelo Ferry Restringido (Permiso Especial)</option>
                        <option value="mantenimiento_preventivo">Permanecer en Taller (Sin Liberación)</option>
                      </>
                    )}
                  </select>
                </div>
              </div>

              {newMovementForm.tipo === 'salida' && newMovementForm.condicion_aeronavegabilidad === 'aeronavegable_conforme' && (
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Actualización de Contadores de Inspección (50h / 100h) al Egresar:
                  </label>
                  <select
                    value={newMovementForm.reset_inspeccion || 'auto'}
                    onChange={e => setNewMovementForm(prev => ({ ...prev, reset_inspeccion: e.target.value as any }))}
                    className="w-full p-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-semibold"
                  >
                    <option value="auto">Automático (detecta motivo / OT / servicio vencido)</option>
                    <option value="50h">Reiniciar Servicio 50 Horas (Aceite & Filtro)</option>
                    <option value="100h">Reiniciar Inspección Mayor 100 Horas (+ 50h)</option>
                    <option value="none">Mantener contadores actuales (solo desbloquear despacho)</option>
                  </select>
                </div>
              )}

              {/* Técnicos y Licencias */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 border-t border-slate-200 dark:border-slate-800 pt-3">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Técnico TMA Responsable *
                  </label>
                  <input
                    type="text"
                    value={newMovementForm.tecnico_responsable}
                    onChange={e => setNewMovementForm(prev => ({ ...prev, tecnico_responsable: e.target.value }))}
                    className="w-full p-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-medium"
                    required
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Licencia TMA *
                  </label>
                  <input
                    type="text"
                    value={newMovementForm.licencia_tma}
                    onChange={e => setNewMovementForm(prev => ({ ...prev, licencia_tma: e.target.value }))}
                    className="w-full p-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-mono"
                    required
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Supervisor / Calidad
                  </label>
                  <input
                    type="text"
                    value={newMovementForm.supervisor_liberador}
                    onChange={e => setNewMovementForm(prev => ({ ...prev, supervisor_liberador: e.target.value }))}
                    className="w-full p-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-medium"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Licencia Supervisor
                  </label>
                  <input
                    type="text"
                    value={newMovementForm.licencia_supervisor}
                    onChange={e => setNewMovementForm(prev => ({ ...prev, licencia_supervisor: e.target.value }))}
                    className="w-full p-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-mono"
                  />
                </div>
              </div>

              {/* Botones de acción */}
              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowNewMovementModal(false)}
                  className="px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold rounded-xl cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className={`px-5 py-2 text-white text-xs font-bold rounded-xl shadow-md transition-all cursor-pointer flex items-center gap-2 ${
                    newMovementForm.tipo === 'entrada'
                      ? 'bg-blue-600 hover:bg-blue-500'
                      : 'bg-emerald-600 hover:bg-emerald-500'
                  }`}
                >
                  <Check className="w-4 h-4" />
                  <span>{actionLoading ? 'Guardando...' : `Registrar ${newMovementForm.tipo === 'entrada' ? 'Entrada' : 'Salida RTS'}`}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =========================================================================
          MODAL: FICHA TÉCNICA Y ASIENTO OFICIAL DE BITÁCORA (DETALLE / IMPRIMIBLE)
          ========================================================================= */}
      {selectedMovementForDetail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs animate-fade-in overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 max-w-2xl w-full p-6 shadow-2xl my-auto space-y-5 max-h-[92vh] overflow-y-auto">
            {/* Header Documento Oficial */}
            <div className="flex items-start justify-between border-b border-slate-200 dark:border-slate-800 pb-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-900 text-amber-400 border border-slate-800">
                    OMA RAC 145 / RAC 43
                  </span>
                  <span className="text-[11px] font-mono text-slate-500">
                    ID: {selectedMovementForDetail.id}
                  </span>
                </div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                  Ficha de Movimiento y Asiento de Bitácora
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedMovementForDetail(null)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Resumen Superior */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 dark:bg-slate-800/60 p-3.5 rounded-xl border border-slate-200 dark:border-slate-700/60">
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Tipo de Evento</span>
                <span className={`text-xs font-bold inline-flex items-center gap-1 mt-0.5 ${
                  selectedMovementForDetail.tipo === 'entrada' ? 'text-amber-500' : 'text-emerald-500'
                }`}>
                  {selectedMovementForDetail.tipo === 'entrada' ? <LogIn className="w-3.5 h-3.5" /> : <LogOut className="w-3.5 h-3.5" />}
                  {selectedMovementForDetail.tipo === 'entrada' ? 'INGRESO A TALLER' : 'SALIDA / RETORNO A VUELO'}
                </span>
              </div>

              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Aeronave</span>
                <span className="text-xs font-mono font-bold text-slate-900 dark:text-white block mt-0.5">
                  {selectedMovementForDetail.matricula}
                </span>
                <span className="text-[10px] text-slate-500">{selectedMovementForDetail.modelo}</span>
              </div>

              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Fecha & Hora</span>
                <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block mt-0.5">
                  {selectedMovementForDetail.fecha}
                </span>
                <span className="text-[10px] text-slate-500">{selectedMovementForDetail.hora} hrs local</span>
              </div>

              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Horómetro / Tach</span>
                <span className="text-xs font-mono font-bold text-slate-900 dark:text-white block mt-0.5">
                  {selectedMovementForDetail.tach_hobbs.toFixed(1)} hrs
                </span>
                <span className="text-[10px] text-slate-500">{selectedMovementForDetail.ubicacion_hangar}</span>
              </div>
            </div>

            {/* Motivo y Detalle Técnico */}
            <div className="space-y-2">
              <span className="text-xs font-bold text-slate-700 dark:text-slate-300 block">
                Motivo del Movimiento
              </span>
              <div className="p-3 bg-slate-100 dark:bg-slate-800 rounded-xl text-xs font-semibold text-slate-900 dark:text-white">
                {selectedMovementForDetail.motivo_principal}
              </div>
              {selectedMovementForDetail.descripcion_detallada && (
                <div className="p-3 bg-slate-50 dark:bg-slate-800/40 rounded-xl text-xs text-slate-600 dark:text-slate-300 leading-relaxed border border-slate-200 dark:border-slate-800">
                  <span className="font-bold block text-[11px] text-slate-500 mb-1">Descripción de Trabajos:</span>
                  {selectedMovementForDetail.descripcion_detallada}
                </div>
              )}
            </div>

            {/* Vinculación con Bitácoras Oficiales */}
            <div className="p-4 bg-sky-50 dark:bg-sky-950/20 border border-sky-200 dark:border-sky-800/40 rounded-xl space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <BookOpen className="w-4 h-4 text-sky-600 dark:text-sky-400" />
                  <h4 className="font-bold text-sky-950 dark:text-sky-300 text-xs uppercase tracking-wider">
                    Asiento Certificado en Bitácora Técnica
                  </h4>
                </div>
                <span className="font-mono text-xs font-bold text-sky-700 dark:text-sky-300 bg-sky-100 dark:bg-sky-900/50 px-2 py-0.5 rounded border border-sky-300 dark:border-sky-700">
                  Folio: {selectedMovementForDetail.bitacora_folio}
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
                <div>
                  <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase">Libro Afectado:</span>
                  <p className="font-semibold text-slate-900 dark:text-white capitalize">{selectedMovementForDetail.bitacora_tipo}</p>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase">Orden de Trabajo:</span>
                  <p className="font-mono font-semibold text-slate-900 dark:text-white">{selectedMovementForDetail.orden_trabajo_id || 'N/A'}</p>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase">Squawk Relacionado:</span>
                  <p className="font-mono font-semibold text-slate-900 dark:text-white">{selectedMovementForDetail.squawk_id || 'Ninguno'}</p>
                </div>
              </div>

              {/* Transcripción del Asiento */}
              <div>
                <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase block mb-1">
                  Texto Asentado en el Libro de la Aeronave:
                </span>
                <div className="p-3 bg-white dark:bg-slate-900 rounded-lg border border-sky-200 dark:border-sky-800/50 text-xs font-mono text-slate-800 dark:text-slate-200 leading-relaxed">
                  "{selectedMovementForDetail.asiento_bitacora || 'Registro de movimiento asentado formalmente en bitácora de mantenimiento conforme a RAC 43.'}"
                </div>
              </div>
            </div>

            {/* Firmas y Licencias Técnicas */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 border-t border-slate-200 dark:border-slate-800 pt-4">
              <div className="p-3 rounded-xl border border-dashed border-slate-300 dark:border-slate-700 space-y-1">
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Técnico Mecánico de Aviación (TMA)</span>
                <p className="text-xs font-bold text-slate-900 dark:text-white">{selectedMovementForDetail.tecnico_responsable}</p>
                <p className="text-[11px] font-mono text-slate-500 dark:text-slate-400">Licencia: {selectedMovementForDetail.licencia_tma}</p>
                <div className="text-[9px] text-emerald-600 dark:text-emerald-400 font-semibold pt-1 flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" /> Firma Digital Validada
                </div>
              </div>

              <div className="p-3 rounded-xl border border-dashed border-slate-300 dark:border-slate-700 space-y-1">
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Inspector / Supervisor Liberador</span>
                <p className="text-xs font-bold text-slate-900 dark:text-white">{selectedMovementForDetail.supervisor_liberador || selectedMovementForDetail.tecnico_responsable}</p>
                <p className="text-[11px] font-mono text-slate-500 dark:text-slate-400">Licencia: {selectedMovementForDetail.licencia_supervisor || selectedMovementForDetail.licencia_tma}</p>
                <div className="text-[9px] text-emerald-600 dark:text-emerald-400 font-semibold pt-1 flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3" /> Aprobación OMA Conforme
                </div>
              </div>
            </div>

            {/* Footer y Acciones */}
            <div className="flex items-center justify-between border-t border-slate-200 dark:border-slate-800 pt-3">
              <span className="text-[10px] text-slate-400">
                Documento de trazabilidad técnica generado bajo estándar RAC 43 / RAC 145 AAC Panamá.
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg text-xs font-semibold cursor-pointer transition-all"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Imprimir / PDF</span>
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedMovementForDetail(null)}
                  className="px-4 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-bold cursor-pointer transition-all"
                >
                  Cerrar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
