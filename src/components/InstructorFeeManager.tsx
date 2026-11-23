import React, { useState, useEffect, useMemo } from 'react';
import {
  InstructorFeeStatement,
  InstructorFeeStatus,
  User,
  RegisterBitacoraHonorarioInput,
  MorosidadReport,
  Transaction
} from '../types';
import { api } from '../services/api';
import { InstructorFeesExcelView } from './InstructorFeesExcelView';
import {
  DollarSign,
  FileText,
  Clock,
  CheckCircle2,
  AlertCircle,
  Search,
  Send,
  Printer,
  X,
  Eye,
  RefreshCw,
  Plane,
  CreditCard,
  Check,
  ShieldCheck,
  TrendingUp,
  Receipt,
  ClipboardCheck,
  UserCheck,
  Plus,
  Download,
  Users,
  Trash2,
  XCircle,
  FileSpreadsheet
} from 'lucide-react';

interface InstructorFeeManagerProps {
  currentUser: User;
  allUsers: User[];
  defaultInstructorId?: string;
  mode: 'instructor' | 'accounting';
  onUpdated?: () => void;
}

const FLEET_OPTIONS = [
  { matricula: 'HP-1450', modelo: 'Cessna 172 Skyhawk', tarifaAvion: 220 },
  { matricula: 'HP-1588', modelo: 'Cessna 172SP Garmin G1000', tarifaAvion: 220 },
  { matricula: 'HP-1822', modelo: 'Piper PA-44 Seminole Multi-Motor', tarifaAvion: 340 },
  { matricula: 'HP-1799', modelo: 'Piper PA-28 Archer III', tarifaAvion: 220 },
  { matricula: 'HP-1934', modelo: 'Piper PA-28 Cherokee', tarifaAvion: 220 },
  { matricula: 'SIM-ALX', modelo: 'Simulador Alsim ALX FNPT II', tarifaAvion: 120 }
];

const formatHoursAsTime = (hours: number): string => {
  const totalMinutes = Math.round((hours || 0) * 60);
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  return `${h}h ${m.toString().padStart(2, '0')}m`;
};

export const InstructorFeeManager: React.FC<InstructorFeeManagerProps> = ({
  currentUser,
  allUsers,
  defaultInstructorId,
  mode,
  onUpdated
}) => {
  const isAdministrationRole =
    currentUser.rol === 'admin' ||
    currentUser.rol === 'escuela' ||
    currentUser.rol === 'contabilidad';
  const isInstructorRole =
    currentUser.rol === 'instructor' || currentUser.rol === 'instructor_en_jefe';
  const canManageFees = mode === 'accounting' && isAdministrationRole;
  const [feeViewTab, setFeeViewTab] = useState<'excel' | 'gestion'>('excel');

  const [statements, setStatements] = useState<InstructorFeeStatement[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [selectedStatement, setSelectedStatement] = useState<InstructorFeeStatement | null>(null);

  // Feedback en línea (sin window.alert / window.confirm)
  const [actionBanner, setActionBanner] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [confirmApproveId, setConfirmApproveId] = useState<string | null>(null);

  // Filtros de búsqueda
  const [searchFilter, setSearchFilter] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('todos');
  const [instructorFilter, setInstructorFilter] = useState<string>(
    mode === 'instructor'
      ? (isInstructorRole ? currentUser.id : defaultInstructorId || '')
      : ''
  );

  useEffect(() => {
    if (mode === 'instructor') {
      setInstructorFilter(isInstructorRole ? currentUser.id : defaultInstructorId || '');
    }
  }, [defaultInstructorId, mode, isInstructorRole, currentUser.id]);

  // Datos financieros y de consumo de estudiantes (para Administración)
  const [morosidadList, setMorosidadList] = useState<MorosidadReport[]>([]);
  const [allTransactions, setAllTransactions] = useState<Transaction[]>([]);

  // Estado del Formulario de Registro de Bitácora -> Honorario (Exclusivo Administración)
  const [isRegisterFormOpen, setIsRegisterFormOpen] = useState<boolean>(false);
  const [submittingForm, setSubmittingForm] = useState<boolean>(false);
  const [formFolio, setFormFolio] = useState<string>('');
  const [formFecha, setFormFecha] = useState<string>(() => new Date().toISOString().split('T')[0]);
  const [formMatricula, setFormMatricula] = useState<string>('HP-1450');
  const [formCustomMatricula, setFormCustomMatricula] = useState<string>('');
  const [formModelo, setFormModelo] = useState<string>('Cessna 172 Skyhawk');
  const [formEstudianteId, setFormEstudianteId] = useState<string>('');
  const [formInstructorId, setFormInstructorId] = useState<string>(() =>
    defaultInstructorId || allUsers.find(u => u.rol === 'instructor')?.id || ''
  );
  const [formHoras, setFormHoras] = useState<string>('1.5');
  const [formTarifaHora, setFormTarifaHora] = useState<string>('30.00');
  const [formRetencionPct, setFormRetencionPct] = useState<string>('0');
  const [formMision, setFormMision] = useState<string>('Instrucción Dual en Aeronave');
  const [formOrigen, setFormOrigen] = useState<string>('MPMG');
  const [formDestino, setFormDestino] = useState<string>('MPMG');
  const [formObservaciones, setFormObservaciones] = useState<string>('');
  const [formTarifaAvion, setFormTarifaAvion] = useState<string>('220.00');
  const [formSuccessMsg, setFormSuccessMsg] = useState<string | null>(null);
  const [formErrorMsg, setFormErrorMsg] = useState<string | null>(null);

  // Modal de Pago (Contabilidad / Administración / Plataforma Externa)
  const [payModalStatement, setPayModalStatement] = useState<InstructorFeeStatement | null>(null);
  const [payBank, setPayBank] = useState<string>('Banco General');
  const [payRefAch, setPayRefAch] = useState<string>('');
  const [payNotes, setPayNotes] = useState<string>('');
  const [paying, setPaying] = useState<boolean>(false);

  // Modal de Rechazo / Ajuste y Confirmación de Eliminación
  const [rejectModalStatement, setRejectModalStatement] = useState<InstructorFeeStatement | null>(null);
  const [rejectReason, setRejectReason] = useState<string>('');
  const [rejecting, setRejecting] = useState<boolean>(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const instructors = useMemo(() => {
    return allUsers.filter(
      u => u.rol === 'instructor' || u.rol === 'instructor_en_jefe' || u.rol === 'admin'
    );
  }, [allUsers]);

  const students = useMemo(() => {
    return allUsers.filter(u => u.rol === 'estudiante');
  }, [allUsers]);

  const selectedStudentUser = useMemo(() => {
    if (!formEstudianteId) return null;
    return students.find(s => s.id === formEstudianteId) || null;
  }, [formEstudianteId, students]);

  const getStudentConsumptionStats = (studentId: string) => {
    const morosidadItem = morosidadList.find(m => m.estudiante_id === studentId);
    const studentTxs = allTransactions.filter(
      t => t.estudiante_id === studentId && (t.estado_aprobacion === 'aprobado' || t.estado_aprobacion === undefined)
    );
    const computedBalance = studentTxs.reduce(
      (acc, t) => (t.tipo === 'abono' ? acc + t.monto : t.tipo === 'cargo' ? acc - t.monto : acc),
      0
    );
    const saldoActual = morosidadItem ? morosidadItem.saldo_actual : Number(computedBalance.toFixed(2));
    const flightCargos = studentTxs.filter(
      t =>
        t.tipo === 'cargo' &&
        (t.concepto === 'Horas Bloque Vuelo' || t.concepto === 'Simulador de Vuelo' || (t.horas_vuelo ?? 0) > 0)
    );
    const horasConsumidas = flightCargos.reduce((acc, t) => acc + (t.horas_vuelo || 0), 0);
    const montoConsumido = flightCargos.reduce((acc, t) => acc + t.monto, 0);
    return {
      saldoActual,
      horasConsumidas: Number(horasConsumidas.toFixed(4)),
      montoConsumido: Number(montoConsumido.toFixed(2)),
      vuelosRegistrados: flightCargos.length
    };
  };

  const generateSuggestedFolio = (mat: string, dateStr: string) => {
    const cleanMat = (mat === 'OTRA' ? formCustomMatricula || 'AER' : mat).replace(/[^a-zA-Z0-9]/g, '');
    const compactDate = (dateStr || new Date().toISOString().split('T')[0]).replace(/-/g, '').slice(2);
    const rnd = Math.floor(100 + Math.random() * 900);
    return `BIT-${cleanMat}-${compactDate}-${rnd}`;
  };

  const resetRegistrationForm = () => {
    const defaultMat = 'HP-1450';
    const today = new Date().toISOString().split('T')[0];
    setFormFolio('');
    setFormFecha(today);
    setFormMatricula(defaultMat);
    setFormCustomMatricula('');
    setFormModelo('Cessna 172 Skyhawk');
    setFormEstudianteId(students[0]?.id || '');
    setFormInstructorId(
      defaultInstructorId || allUsers.find(u => u.rol === 'instructor')?.id || ''
    );
    setFormHoras('1.5');
    setFormTarifaHora('30.00');
    setFormRetencionPct('0');
    setFormMision('Instrucción Dual en Aeronave');
    setFormOrigen('MPMG');
    setFormDestino('MPMG');
    setFormObservaciones('');
    setFormTarifaAvion('220.00');
    setFormErrorMsg(null);
    setFormSuccessMsg(null);
  };

  const openRegistrationForm = () => {
    if (!canManageFees) return;
    resetRegistrationForm();
    setIsRegisterFormOpen(true);
  };

  // Cargar honorarios registrados por Administración
  const loadStatements = async () => {
    if (currentUser.rol === 'instructor') {
      setLoading(false);
      return;
    }
    try {
      setRefreshing(true);
      const params: { instructorId?: string; status?: string; search?: string } = {};
      if (isInstructorRole) {
        params.instructorId = currentUser.id;
      } else if (instructorFilter) {
        params.instructorId = instructorFilter;
      }
      if (statusFilter !== 'todos') {
        params.status = statusFilter;
      }
      if (searchFilter.trim()) {
        params.search = searchFilter.trim();
      }

      const [list, morosidad, txs] = await Promise.all([
        api.getInstructorFees(params),
        isAdministrationRole ? api.getMorosidadReport().catch(() => []) : Promise.resolve([]),
        isAdministrationRole ? api.getTransactions().catch(() => []) : Promise.resolve([])
      ]);
      setStatements(list);
      if (isAdministrationRole) {
        setMorosidadList(morosidad);
        setAllTransactions(txs);
      }
    } catch (err) {
      console.error('Error al cargar honorarios de instructores:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (currentUser.rol !== 'instructor') {
      loadStatements();
    }
  }, [statusFilter, instructorFilter, searchFilter, currentUser.rol]);

  const handleMatriculaSelect = (mat: string) => {
    setFormMatricula(mat);
    const found = FLEET_OPTIONS.find(f => f.matricula === mat);
    if (found) {
      setFormModelo(found.modelo);
      setFormTarifaAvion(found.tarifaAvion.toFixed(2));
    } else if (mat === 'OTRA') {
      setFormModelo('Aeronave de Instrucción');
      setFormTarifaAvion('220.00');
    }
  };

  // Cálculo en vivo del formulario (Honorario CFI + Débito y Consumo de Estudiante)
  const previewHoras = parseFloat(formHoras) || 0;
  const previewTarifa = parseFloat(formTarifaHora) || 0;
  const previewTarifaAvion = parseFloat(formTarifaAvion) || 0;
  const previewRetPct = parseFloat(formRetencionPct) || 0;
  const previewBruto = Number((previewHoras * previewTarifa).toFixed(2));
  const previewRetencion = Number(((previewBruto * previewRetPct) / 100).toFixed(2));
  const previewNeto = Number((previewBruto - previewRetencion).toFixed(2));
  const previewHorasEstudiante = Number((previewHoras * 1.275).toFixed(4));
  const previewCargoEstudiante = Number((previewHorasEstudiante * previewTarifaAvion).toFixed(2));
  const selectedStudentStats = selectedStudentUser
    ? getStudentConsumptionStats(selectedStudentUser.id)
    : null;
  const previewSaldoResultanteEstudiante = selectedStudentStats
    ? Number((selectedStudentStats.saldoActual - previewCargoEstudiante).toFixed(2))
    : 0;

  // Envío del Formulario de Registro de Bitácora ligado al Estudiante -> Débito de fondos + Honorario 1-a-1
  const handleRegisterBitacoraHonorario = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canManageFees || submittingForm) return;

    setFormErrorMsg(null);
    setFormSuccessMsg(null);

    const effectiveMatricula =
      formMatricula === 'OTRA' ? formCustomMatricula.trim().toUpperCase() : formMatricula;

    if (!formFolio.trim()) {
      setFormErrorMsg('Debe ingresar el número / folio de la bitácora.');
      return;
    }
    if (!effectiveMatricula) {
      setFormErrorMsg('Debe indicar la matrícula de la aeronave.');
      return;
    }
    if (!selectedStudentUser) {
      setFormErrorMsg('Debe seleccionar un estudiante para ligar la bitácora y debitar sus fondos.');
      return;
    }
    if (!formInstructorId) {
      setFormErrorMsg('Debe seleccionar el instructor al que corresponde el honorario.');
      return;
    }
    if (previewHoras <= 0) {
      setFormErrorMsg('Las horas de vuelo deben ser mayores a 0.');
      return;
    }
    if (previewTarifaAvion <= 0) {
      setFormErrorMsg('La tarifa de aeronave para el débito del estudiante debe ser mayor a $0 USD.');
      return;
    }
    if (previewTarifa <= 0) {
      setFormErrorMsg('La tarifa horaria del instructor debe ser mayor a $0 USD.');
      return;
    }

    setSubmittingForm(true);
    try {
      const payload: RegisterBitacoraHonorarioInput = {
        folio_bitacora: formFolio.trim(),
        fecha: formFecha,
        matricula_avion: effectiveMatricula,
        modelo_avion: formModelo.trim() || 'Aeronave Escuela',
        estudiante_id: selectedStudentUser.id,
        estudiante_nombre: selectedStudentUser.nombre,
        piloto_id: selectedStudentUser.id,
        piloto_nombre: selectedStudentUser.nombre,
        instructor_id: formInstructorId,
        horas_vuelo: previewHoras,
        tarifa_instructor_hora: previewTarifa,
        retencion_pct: previewRetPct,
        tipo_mision: formMision.trim() || 'Instrucción Dual en Aeronave',
        origen: formOrigen.trim().toUpperCase() || 'MPMG',
        destino: formDestino.trim().toUpperCase() || 'MPMG',
        observaciones: formObservaciones.trim() || undefined,
        aplicar_debito_estudiante: true,
        tarifa_aeronave_hora: previewTarifaAvion,
        registrado_por_id: currentUser.id,
        registrado_por_nombre: currentUser.nombre,
        registrado_por_rol: currentUser.rol
      };

      const created = await api.registerBitacoraHonorario(payload);
      const debitInfo =
        created.estudiante_monto_debitado !== undefined && created.estudiante_saldo_resultante !== undefined
          ? ` Débito a ${created.estudiante_nombre || selectedStudentUser.nombre}: -$${created.estudiante_monto_debitado.toFixed(2)} USD (Nuevo saldo: $${created.estudiante_saldo_resultante.toFixed(2)} USD).`
          : '';

      setFormSuccessMsg(
        `Honorario ${created.id} creado para ${created.instructor_nombre} desde Bitácora #${created.folio_bitacora}.${debitInfo}`
      );
      setActionBanner({
        type: 'success',
        text: `Bitácora #${created.folio_bitacora} registrada y ligada a ${created.estudiante_nombre || selectedStudentUser.nombre}. Honorario ${created.id} ($${created.total_neto.toFixed(2)} USD) creado.${debitInfo}`
      });

      await loadStatements();
      setSelectedStatement(created);
      if (onUpdated) onUpdated();
      setIsRegisterFormOpen(false);
    } catch (err: any) {
      setFormErrorMsg(err.message || 'No se pudo registrar la bitácora y crear el honorario.');
    } finally {
      setSubmittingForm(false);
    }
  };

  // Aprobar Honorarios (Administración / Contabilidad)
  const handleApproveStatement = async (statement: InstructorFeeStatement) => {
    if (!canManageFees) return;
    try {
      const updated = await api.updateInstructorFeeStatus(statement.id, {
        estado: 'aprobado_contabilidad',
        notas_contabilidad: 'Bitácora oficial cotejada por Administración y aprobada para desembolso.',
        procesado_por: `${currentUser.nombre} (${currentUser.rol.toUpperCase()})`
      });
      setConfirmApproveId(null);
      await loadStatements();
      if (selectedStatement?.id === statement.id) {
        setSelectedStatement(updated);
      }
      if (onUpdated) onUpdated();
      setActionBanner({
        type: 'success',
        text: `Honorario ${updated.id} (Bitácora #${updated.folio_bitacora || updated.id}) aprobado para pago.`
      });
    } catch (err: any) {
      setActionBanner({
        type: 'error',
        text: err.message || 'Error al aprobar honorario.'
      });
    }
  };

  // Ejecutar Pago ACH (Administración / Contabilidad)
  const handleExecutePayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!payModalStatement || !canManageFees) return;
    setPaying(true);

    try {
      const updated = await api.updateInstructorFeeStatus(payModalStatement.id, {
        estado: 'pagado',
        banco_pago: payBank,
        referencia_pago_ach: payRefAch.trim() || `ACH-${Date.now().toString().slice(-6)}`,
        notas_contabilidad: payNotes.trim() || 'Desembolso formalizado vía transferencia bancaria ACH.',
        procesado_por: `${currentUser.nombre} (${currentUser.rol.toUpperCase()})`
      });

      setPayModalStatement(null);
      setPayRefAch('');
      setPayNotes('');
      await loadStatements();
      if (selectedStatement?.id === updated.id) {
        setSelectedStatement(updated);
      }
      if (onUpdated) onUpdated();
      setActionBanner({
        type: 'success',
        text: `Pago (${updated.referencia_pago_ach}) registrado para ${updated.instructor_nombre} — $${updated.total_neto.toFixed(2)} USD.`
      });
    } catch (err: any) {
      setActionBanner({
        type: 'error',
        text: err.message || 'Error al registrar el pago.'
      });
    } finally {
      setPaying(false);
    }
  };

  // Marcar Rechazo / Ajuste (Contabilidad / Administración)
  const handleRejectStatement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rejectModalStatement || !canManageFees) return;
    setRejecting(true);
    try {
      const updated = await api.updateInstructorFeeStatus(rejectModalStatement.id, {
        estado: 'rechazado',
        notas_contabilidad: rejectReason.trim() || 'Devuelto para revisión o ajuste por Contabilidad.',
        procesado_por: `${currentUser.nombre} (${currentUser.rol.toUpperCase()})`
      });
      setRejectModalStatement(null);
      setRejectReason('');
      await loadStatements();
      if (selectedStatement?.id === updated.id) {
        setSelectedStatement(updated);
      }
      if (onUpdated) onUpdated();
      setActionBanner({
        type: 'success',
        text: `Honorario ${updated.id} marcado como Rechazado / Ajuste.`
      });
    } catch (err: any) {
      setActionBanner({
        type: 'error',
        text: err.message || 'Error al actualizar estado.'
      });
    } finally {
      setRejecting(false);
    }
  };

  // Eliminar Liquidación (Contabilidad / Administración)
  const handleDeleteStatement = async (stmt: InstructorFeeStatement) => {
    if (!canManageFees) return;
    try {
      await api.deleteInstructorFeeStatement(stmt.id);
      setConfirmDeleteId(null);
      if (selectedStatement?.id === stmt.id) {
        setSelectedStatement(null);
      }
      await loadStatements();
      if (onUpdated) onUpdated();
      setActionBanner({
        type: 'success',
        text: `Honorario ${stmt.id} eliminado.`
      });
    } catch (err: any) {
      setActionBanner({
        type: 'error',
        text: err.message || 'Error al eliminar honorario.'
      });
    }
  };

  // Exportar CSV para gestión de pagos en otra plataforma
  const handleExportFeesCsv = () => {
    if (statements.length === 0) return;
    const escapeCsv = (val: unknown) => {
      const s = String(val ?? '').replace(/"/g, '""');
      return `"${s}"`;
    };
    const headers = [
      'ID',
      'Fecha',
      'Folio Bitácora',
      'Instructor',
      'Cédula',
      'Correo',
      'Matrícula',
      'Estudiante',
      'Horas',
      'Tarifa/Hora (USD)',
      'Bruto (USD)',
      'Retención (USD)',
      'Neto a Pagar (USD)',
      'Estado',
      'Banco / Plataforma',
      'Referencia Pago',
      'Notas Contabilidad'
    ];
    const rows = statements.map(stmt => {
      const firstFlight = stmt.vuelos[0];
      return [
        stmt.id,
        firstFlight?.fecha || stmt.periodo_inicio || '',
        stmt.folio_bitacora || firstFlight?.folio_bitacora || '',
        stmt.instructor_nombre,
        stmt.instructor_cedula || '',
        stmt.instructor_correo || '',
        stmt.matricula_avion || firstFlight?.matricula_avion || '',
        stmt.estudiante_nombre || stmt.piloto_nombre || firstFlight?.estudiante_nombre || firstFlight?.piloto_nombre || '',
        stmt.total_horas.toFixed(2),
        stmt.tarifa_base_hora.toFixed(2),
        stmt.total_bruto.toFixed(2),
        stmt.retencion_impuesto.toFixed(2),
        stmt.total_neto.toFixed(2),
        stmt.estado,
        stmt.banco_pago || '',
        stmt.referencia_pago_ach || '',
        stmt.notas_contabilidad || ''
      ]
        .map(escapeCsv)
        .join(',');
    });
    const csvContent = `\uFEFF${headers.map(escapeCsv).join(',')}\n${rows.join('\n')}`;
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `honorarios_instructores_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const getStatusBadge = (status: InstructorFeeStatus) => {
    switch (status) {
      case 'pagado':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-800">
            <CheckCircle2 className="w-3 h-3" />
            Pagado ACH
          </span>
        );
      case 'aprobado_contabilidad':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold bg-sky-50 text-sky-700 border border-sky-200 dark:bg-sky-950/50 dark:text-sky-300 dark:border-sky-800">
            <ShieldCheck className="w-3 h-3" />
            Aprobado Contabilidad
          </span>
        );
      case 'enviado_contabilidad':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-950/50 dark:text-amber-300 dark:border-amber-800">
            <Clock className="w-3 h-3" />
            En Gestión de Contabilidad
          </span>
        );
      case 'rechazado':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold bg-rose-50 text-rose-700 border border-rose-200 dark:bg-rose-950/50 dark:text-rose-300 dark:border-rose-800">
            <AlertCircle className="w-3 h-3" />
            Rechazado / Ajuste
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium bg-slate-100 text-slate-700 border border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700">
            Registrado
          </span>
        );
    }
  };

  // Métricas KPI y resumen mensual (tiempo y dinero) basadas en bitácoras registradas por Administración
  const summaryMetrics = useMemo(() => {
    const active = statements.filter(s => s.estado !== 'rechazado');
    const totalBruto = active.reduce((acc, s) => acc + s.total_bruto, 0);
    const totalRetencion = active.reduce((acc, s) => acc + s.retencion_impuesto, 0);
    const totalNeto = active.reduce((acc, s) => acc + s.total_neto, 0);
    const totalHoras = active.reduce((acc, s) => acc + s.total_horas, 0);
    const totalBitacoras = active.length;

    const pendingItems = active.filter(s => s.estado === 'enviado_contabilidad' || s.estado === 'aprobado_contabilidad');
    const paidItems = active.filter(s => s.estado === 'pagado');

    const pendientes = pendingItems.length;
    const horasPendientes = pendingItems.reduce((acc, s) => acc + s.total_horas, 0);
    const totalPendienteMonto = pendingItems.reduce((acc, s) => acc + s.total_neto, 0);

    const pagados = paidItems.length;
    const horasPagadas = paidItems.reduce((acc, s) => acc + s.total_horas, 0);
    const totalPagadoMonto = paidItems.reduce((acc, s) => acc + s.total_neto, 0);

    const monthMap = new Map<
      string,
      {
        mes: string;
        bitacoras: number;
        horas: number;
        bruto: number;
        retencion: number;
        neto: number;
        pagado: number;
        pendiente: number;
      }
    >();

    for (const stmt of active) {
      const dateStr = stmt.vuelos[0]?.fecha || stmt.periodo_inicio || '';
      const mes = dateStr.length >= 7 ? dateStr.slice(0, 7) : 'Sin fecha';
      const existing = monthMap.get(mes) || {
        mes,
        bitacoras: 0,
        horas: 0,
        bruto: 0,
        retencion: 0,
        neto: 0,
        pagado: 0,
        pendiente: 0
      };
      existing.bitacoras += 1;
      existing.horas += stmt.total_horas;
      existing.bruto += stmt.total_bruto;
      existing.retencion += stmt.retencion_impuesto;
      existing.neto += stmt.total_neto;
      if (stmt.estado === 'pagado') {
        existing.pagado += stmt.total_neto;
      } else {
        existing.pendiente += stmt.total_neto;
      }
      monthMap.set(mes, existing);
    }

    const monthlyBreakdown = Array.from(monthMap.values()).sort((a, b) => b.mes.localeCompare(a.mes));

    const instMap = new Map<
      string,
      {
        instructor_id: string;
        instructor_nombre: string;
        instructor_cedula: string;
        instructor_correo: string;
        bitacoras: number;
        horas: number;
        bruto: number;
        retencion: number;
        neto: number;
        pagado: number;
        pendiente: number;
      }
    >();

    for (const stmt of active) {
      const key = stmt.instructor_id || stmt.instructor_nombre;
      const existing = instMap.get(key) || {
        instructor_id: stmt.instructor_id,
        instructor_nombre: stmt.instructor_nombre,
        instructor_cedula: stmt.instructor_cedula || '',
        instructor_correo: stmt.instructor_correo || '',
        bitacoras: 0,
        horas: 0,
        bruto: 0,
        retencion: 0,
        neto: 0,
        pagado: 0,
        pendiente: 0
      };
      existing.bitacoras += 1;
      existing.horas += stmt.total_horas;
      existing.bruto += stmt.total_bruto;
      existing.retencion += stmt.retencion_impuesto;
      existing.neto += stmt.total_neto;
      if (stmt.estado === 'pagado') {
        existing.pagado += stmt.total_neto;
      } else {
        existing.pendiente += stmt.total_neto;
      }
      instMap.set(key, existing);
    }

    const instructorBreakdown = Array.from(instMap.values()).sort(
      (a, b) => b.pendiente - a.pendiente || b.neto - a.neto
    );

    return {
      totalBruto,
      totalRetencion,
      totalNeto,
      totalHoras,
      totalBitacoras,
      pendientes,
      horasPendientes,
      totalPendienteMonto,
      pagados,
      horasPagadas,
      totalPagadoMonto,
      monthlyBreakdown,
      instructorBreakdown
    };
  }, [statements]);

  // Rol de instructor: visible únicamente en formato Excel individual (solo lectura)
  if (currentUser.rol === 'instructor') {
    return (
      <InstructorFeesExcelView
        currentUser={currentUser}
        allUsers={allUsers}
        fixedInstructorId={currentUser.id}
        readOnly={true}
      />
    );
  }

  return (
    <div className="space-y-5">
      {/* NAVEGADOR EXCEL INDIVIDUAL VS GESTIÓN DE LIQUIDACIONES (DIRECTOR / ADMIN / CONTABILIDAD) */}
      {canManageFees && (
        <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-900 p-1.5 rounded-xl border border-slate-200 dark:border-slate-800 w-fit flex-wrap">
          <button
            type="button"
            onClick={() => setFeeViewTab('excel')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
              feeViewTab === 'excel'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>Archivos Excel Individuales</span>
          </button>

          <button
            type="button"
            onClick={() => setFeeViewTab('gestion')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
              feeViewTab === 'gestion'
                ? 'bg-slate-900 dark:bg-sky-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Receipt className="w-4 h-4" />
            <span>Gestión de Bitácoras y Pagos</span>
          </button>
        </div>
      )}

      {canManageFees && feeViewTab === 'excel' ? (
        <InstructorFeesExcelView
          currentUser={currentUser}
          allUsers={allUsers}
          initialInstructorId={defaultInstructorId}
          readOnly={false}
          onSaved={() => {
            loadStatements();
            if (onUpdated) onUpdated();
          }}
        />
      ) : (
      <>
      {/* CABECERA PRINCIPAL */}
      <div className="bg-slate-900 dark:bg-slate-950 text-white p-5 sm:p-6 rounded-2xl border border-slate-800 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-sky-500/20 border border-sky-400/30 flex items-center justify-center text-sky-300 shrink-0">
            <DollarSign className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg sm:text-xl font-bold tracking-tight text-white">
              {mode === 'instructor'
                ? 'Mis Honorarios — Horas y Dinero'
                : 'Honorarios de Instructores'}
            </h2>
          </div>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          {canManageFees && statements.length > 0 && (
            <button
              type="button"
              onClick={handleExportFeesCsv}
              className="px-3 py-2 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-200 rounded-xl text-xs font-semibold border border-emerald-400/30 transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Exportar CSV</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => loadStatements()}
            disabled={refreshing}
            className="px-3 py-2 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-semibold border border-white/15 transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
            <span>Actualizar</span>
          </button>

          {canManageFees && (
            <button
              type="button"
              onClick={openRegistrationForm}
              className="px-4 py-2 bg-sky-600 hover:bg-sky-500 text-white rounded-xl text-xs font-bold shadow-sm transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Registrar Bitácora y Honorario</span>
            </button>
          )}
        </div>
      </div>



      {/* FEEDBACK DE ACCIÓN */}
      {actionBanner && (
        <div
          className={`p-3.5 rounded-xl border text-xs flex items-center justify-between gap-3 ${
            actionBanner.type === 'success'
              ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200'
              : 'bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800 text-rose-900 dark:text-rose-200'
          }`}
        >
          <div className="flex items-center gap-2">
            {actionBanner.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            )}
            <span className="font-medium">{actionBanner.text}</span>
          </div>
          <button
            type="button"
            onClick={() => setActionBanner(null)}
            className="p-1 rounded-md hover:bg-black/5 dark:hover:bg-white/10 cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* INDICADORES KPI (TIEMPO Y DINERO) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="p-4 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800">
          <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
            Horas Contabilizadas (Tiempo)
          </span>
          <div className="text-2xl font-bold text-slate-900 dark:text-white mt-1 tabular-nums">
            {summaryMetrics.totalHoras.toFixed(1)}
            <span className="text-xs font-normal text-slate-500 ml-1">hrs</span>
          </div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 flex items-center gap-1 tabular-nums">
            <Clock className="w-3 h-3 text-sky-600" />
            <span>{formatHoursAsTime(summaryMetrics.totalHoras)} · {summaryMetrics.totalBitacoras} bitácora(s)</span>
          </p>
        </div>

        <div className="p-4 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800">
          <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
            Total Contabilizado (Dinero)
          </span>
          <div className="text-2xl font-bold text-slate-900 dark:text-white mt-1 tabular-nums">
            ${summaryMetrics.totalNeto.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            <span className="text-xs font-normal text-slate-500 ml-1">USD</span>
          </div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 flex items-center gap-1 tabular-nums">
            <TrendingUp className="w-3 h-3 text-emerald-600" />
            <span>
              {summaryMetrics.totalRetencion > 0
                ? `Bruto $${summaryMetrics.totalBruto.toFixed(2)} · Ret. -$${summaryMetrics.totalRetencion.toFixed(2)}`
                : 'Neto acumulado por bitácoras'}
            </span>
          </p>
        </div>

        <div className="p-4 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800">
          <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
            Pendiente por Cobrar
          </span>
          <div className="text-2xl font-bold text-amber-600 dark:text-amber-400 mt-1 tabular-nums">
            ${summaryMetrics.totalPendienteMonto.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            <span className="text-xs font-normal text-slate-500 ml-1">USD</span>
          </div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 tabular-nums">
            {summaryMetrics.horasPendientes.toFixed(1)} hrs ({formatHoursAsTime(summaryMetrics.horasPendientes)}) · {summaryMetrics.pendientes} pendiente(s)
          </p>
        </div>

        <div className="p-4 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800">
          <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
            Pagado ACH
          </span>
          <div className="text-2xl font-bold text-emerald-700 dark:text-emerald-400 mt-1 tabular-nums">
            ${summaryMetrics.totalPagadoMonto.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            <span className="text-xs font-normal text-slate-500 ml-1">USD</span>
          </div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 tabular-nums">
            {summaryMetrics.horasPagadas.toFixed(1)} hrs ({formatHoursAsTime(summaryMetrics.horasPagadas)}) · {summaryMetrics.pagados} pagado(s)
          </p>
        </div>
      </div>

      {/* CONSOLIDADO POR INSTRUCTOR (CONTABILIDAD / PAGOS EXTERNOS) */}
      {mode === 'accounting' && isAdministrationRole && summaryMetrics.instructorBreakdown.length > 0 && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
          <div className="px-4 py-3 bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <h3 className="font-bold text-slate-800 dark:text-white text-xs uppercase tracking-wider">
                Resumen por Instructor — Liquidación para Pagos
              </h3>
            </div>
            <span className="text-[11px] text-slate-500 dark:text-slate-400">
              {summaryMetrics.instructorBreakdown.length} instructor(es)
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse tabular-nums">
              <thead className="bg-slate-50/70 dark:bg-slate-800/40 text-slate-600 dark:text-slate-300 font-semibold border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="px-4 py-2.5">Instructor</th>
                  <th className="px-4 py-2.5">Cédula / Correo</th>
                  <th className="px-4 py-2.5 text-center">Bitácoras</th>
                  <th className="px-4 py-2.5 text-right">Horas</th>
                  <th className="px-4 py-2.5 text-right">Neto Total</th>
                  <th className="px-4 py-2.5 text-right">Pagado</th>
                  <th className="px-4 py-2.5 text-right">Pendiente</th>
                  <th className="px-4 py-2.5 text-right">Filtro</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-200">
                {summaryMetrics.instructorBreakdown.map(row => (
                  <tr key={row.instructor_id || row.instructor_nombre} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/30">
                    <td className="px-4 py-2.5 font-bold text-slate-900 dark:text-white">{row.instructor_nombre}</td>
                    <td className="px-4 py-2.5 text-[11px] text-slate-500 dark:text-slate-400">
                      <span className="font-mono text-slate-700 dark:text-slate-300">{row.instructor_cedula || 'N/A'}</span>
                      {row.instructor_correo && <span className="block">{row.instructor_correo}</span>}
                    </td>
                    <td className="px-4 py-2.5 text-center">{row.bitacoras}</td>
                    <td className="px-4 py-2.5 text-right font-semibold text-sky-700 dark:text-sky-400">
                      {row.horas.toFixed(1)} hrs <span className="text-[11px] font-normal text-slate-500 dark:text-slate-400">({formatHoursAsTime(row.horas)})</span>
                    </td>
                    <td className="px-4 py-2.5 text-right font-semibold">${row.neto.toFixed(2)} USD</td>
                    <td className="px-4 py-2.5 text-right font-semibold text-emerald-700 dark:text-emerald-400">${row.pagado.toFixed(2)}</td>
                    <td className="px-4 py-2.5 text-right font-bold text-amber-700 dark:text-amber-400">${row.pendiente.toFixed(2)} USD</td>
                    <td className="px-4 py-2.5 text-right">
                      <button
                        type="button"
                        onClick={() =>
                          setInstructorFilter(prev => (prev === row.instructor_id ? '' : row.instructor_id))
                        }
                        className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-sky-50 dark:hover:bg-sky-900/40 text-slate-700 dark:text-slate-200 text-[11px] font-semibold cursor-pointer"
                      >
                        {instructorFilter === row.instructor_id ? 'Ver todos' : 'Filtrar'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* RESUMEN MENSUAL EN TIEMPO Y DINERO */}
      {summaryMetrics.monthlyBreakdown.length > 0 && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
          <div className="px-4 py-3 bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-sky-600 dark:text-sky-400" />
              <h3 className="font-bold text-slate-800 dark:text-white text-xs uppercase tracking-wider">
                Contabilidad Mensual — Horas (Tiempo) y Honorarios (Dinero)
              </h3>
            </div>
            <span className="text-[11px] text-slate-500 dark:text-slate-400">
              {summaryMetrics.monthlyBreakdown.length} período(s)
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse tabular-nums">
              <thead className="bg-slate-50/70 dark:bg-slate-800/40 text-slate-600 dark:text-slate-300 font-semibold border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="px-4 py-2.5">Mes</th>
                  <th className="px-4 py-2.5 text-center">Bitácoras</th>
                  <th className="px-4 py-2.5 text-right">Horas (Tiempo)</th>
                  <th className="px-4 py-2.5 text-right">Bruto</th>
                  <th className="px-4 py-2.5 text-right">Retención</th>
                  <th className="px-4 py-2.5 text-right">Neto</th>
                  <th className="px-4 py-2.5 text-right">Pagado</th>
                  <th className="px-4 py-2.5 text-right">Pendiente</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-200">
                {summaryMetrics.monthlyBreakdown.map(row => (
                  <tr key={row.mes} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/30">
                    <td className="px-4 py-2.5 font-mono font-bold text-slate-900 dark:text-white">{row.mes}</td>
                    <td className="px-4 py-2.5 text-center">{row.bitacoras}</td>
                    <td className="px-4 py-2.5 text-right font-semibold text-sky-700 dark:text-sky-400">
                      {row.horas.toFixed(1)} hrs <span className="text-[11px] font-normal text-slate-500 dark:text-slate-400">({formatHoursAsTime(row.horas)})</span>
                    </td>
                    <td className="px-4 py-2.5 text-right">${row.bruto.toFixed(2)}</td>
                    <td className="px-4 py-2.5 text-right text-amber-700 dark:text-amber-400">
                      {row.retencion > 0 ? `-$${row.retencion.toFixed(2)}` : '$0.00'}
                    </td>
                    <td className="px-4 py-2.5 text-right font-bold text-slate-900 dark:text-white">${row.neto.toFixed(2)} USD</td>
                    <td className="px-4 py-2.5 text-right font-semibold text-emerald-700 dark:text-emerald-400">${row.pagado.toFixed(2)}</td>
                    <td className="px-4 py-2.5 text-right font-semibold text-amber-700 dark:text-amber-400">${row.pendiente.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* BARRA DE BÚSQUEDA Y FILTROS */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        <div className="flex items-center gap-2 flex-1">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar por folio de bitácora, estudiante, instructor o matrícula..."
              value={searchFilter}
              onChange={(e) => setSearchFilter(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-xs font-medium text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500"
            />
          </div>
          {searchFilter && (
            <button
              type="button"
              onClick={() => setSearchFilter('')}
              className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
              title="Limpiar búsqueda"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {!isInstructorRole && (
            <select
              value={instructorFilter}
              onChange={(e) => setInstructorFilter(e.target.value)}
              className="px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-xs font-medium text-slate-700 dark:text-slate-200 focus:outline-none"
            >
              <option value="">Todos los Instructores</option>
              {instructors.map(inst => (
                <option key={inst.id} value={inst.id}>
                  {inst.nombre}
                </option>
              ))}
            </select>
          )}

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-xs font-medium text-slate-700 dark:text-slate-200 focus:outline-none"
          >
            <option value="todos">Todos los Estados</option>
            <option value="enviado_contabilidad">En Gestión de Contabilidad</option>
            <option value="aprobado_contabilidad">Aprobado Contabilidad</option>
            <option value="pagado">Pagado ACH</option>
            <option value="rechazado">Rechazado / Ajuste</option>
          </select>
        </div>
      </div>

      {/* LISTADO DE HONORARIOS POR BITÁCORA */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
        <div className="p-4 bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Receipt className="w-4 h-4 text-sky-600 dark:text-sky-400" />
            <h3 className="font-bold text-slate-800 dark:text-white text-sm">
              Honorarios Emitidos por Bitácoras ({statements.length})
            </h3>
          </div>
          <span className="text-xs text-slate-500 dark:text-slate-400">
            Respaldado por Administración
          </span>
        </div>

        {loading ? (
          <div className="p-12 text-center text-slate-400 text-xs">
            <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-sky-600" />
            Cargando honorarios registrados por Administración...
          </div>
        ) : statements.length === 0 ? (
          <div className="p-12 text-center text-slate-500 dark:text-slate-400 space-y-3">
            <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-300 flex items-center justify-center mx-auto">
              <FileText className="w-6 h-6" />
            </div>
            <div className="text-sm font-bold text-slate-800 dark:text-white">
              Sin honorarios registrados
            </div>
            {canManageFees && (
              <button
                type="button"
                onClick={openRegistrationForm}
                className="mt-2 px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white rounded-xl text-xs font-bold transition-colors inline-flex items-center gap-1.5 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Registrar Bitácora y Crear Honorario</span>
              </button>
            )}
          </div>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {statements.map((stmt) => {
              const firstFlight = stmt.vuelos[0];
              const displayFolio = stmt.folio_bitacora || firstFlight?.folio_bitacora || stmt.id;
              const displayStudent =
                stmt.estudiante_nombre ||
                stmt.piloto_nombre ||
                firstFlight?.estudiante_nombre ||
                firstFlight?.piloto_nombre ||
                'No especificado';
              const displayAircraft = stmt.matricula_avion || firstFlight?.matricula_avion || 'N/A';
              const displayDate = firstFlight?.fecha || stmt.periodo_inicio;
              const registeredBy = stmt.registrado_por_nombre || stmt.procesado_por || 'Administración';

              return (
                <div
                  key={stmt.id}
                  className="p-4 hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4"
                >
                  <div className="space-y-1.5 flex-1 min-w-0">
                    <div className="flex items-center gap-2.5 flex-wrap">
                      <span className="font-mono font-bold text-sky-700 dark:text-sky-400 text-sm">
                        {displayFolio}
                      </span>
                      <span className="text-xs font-mono text-slate-400">({stmt.id})</span>
                      {getStatusBadge(stmt.estado)}
                      <span className="text-xs text-slate-500 dark:text-slate-400 tabular-nums">
                        {displayDate}
                      </span>
                    </div>

                    <div className="text-xs text-slate-700 dark:text-slate-200 flex items-center gap-2 flex-wrap">
                      <span>
                        Estudiante: <strong className="text-slate-900 dark:text-white">{displayStudent}</strong>
                      </span>
                      <span className="text-slate-300 dark:text-slate-600">•</span>
                      <span>
                        Instructor: <strong className="text-slate-900 dark:text-white">{stmt.instructor_nombre}</strong>
                      </span>
                      <span className="text-slate-300 dark:text-slate-600">•</span>
                      <span>
                        Aeronave: <strong className="font-mono">{displayAircraft}</strong>
                      </span>
                    </div>

                    <div className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-3 flex-wrap tabular-nums">
                      <span>Registrado por: <strong className="text-slate-700 dark:text-slate-300">{registeredBy}</strong></span>
                      {(stmt.tacometro_final !== undefined || firstFlight?.tacometro_final !== undefined) && (
                        <span className="font-mono text-indigo-700 dark:text-indigo-300 font-semibold">
                          Tacómetro: {(stmt.tacometro_inicial ?? firstFlight?.tacometro_inicial) !== undefined
                            ? `${Number(stmt.tacometro_inicial ?? firstFlight?.tacometro_inicial).toFixed(1)}→`
                            : ''}
                          {Number(stmt.tacometro_final ?? firstFlight?.tacometro_final).toFixed(1)} hrs
                        </span>
                      )}
                      {!isInstructorRole && mode === 'accounting' && stmt.estudiante_monto_debitado !== undefined && (
                        <span className="text-slate-700 dark:text-slate-300 font-medium">
                          Débito estudiante: <strong className="text-rose-700 dark:text-rose-400">-${stmt.estudiante_monto_debitado.toFixed(2)} USD</strong>
                          {stmt.estudiante_saldo_resultante !== undefined && (
                            <> • Saldo resultante: <strong className={stmt.estudiante_saldo_resultante >= 0 ? 'text-emerald-700 dark:text-emerald-400' : 'text-rose-700 dark:text-rose-400'}>${stmt.estudiante_saldo_resultante.toFixed(2)} USD</strong></>
                          )}
                        </span>
                      )}
                      {stmt.referencia_pago_ach && (
                        <span className="text-emerald-700 dark:text-emerald-400 font-semibold">
                          ACH: {stmt.referencia_pago_ach} ({stmt.banco_pago || 'Banco General'})
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-5 self-end lg:self-center shrink-0">
                    <div className="text-right tabular-nums">
                      <div className="text-lg font-bold text-slate-900 dark:text-white">
                        ${stmt.total_neto.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        <span className="text-[11px] font-normal text-slate-500 ml-1">USD</span>
                      </div>
                      <div className="text-xs text-slate-500 dark:text-slate-400">
                        {stmt.total_horas.toFixed(1)} hrs ({formatHoursAsTime(stmt.total_horas)}) × ${stmt.tarifa_base_hora.toFixed(2)}/h
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 flex-wrap justify-end">
                      <button
                        type="button"
                        onClick={() => {
                          setConfirmApproveId(null);
                          setSelectedStatement(stmt);
                        }}
                        className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>Detalle</span>
                      </button>

                      {mode === 'accounting' && isAdministrationRole && stmt.estado === 'enviado_contabilidad' && (
                        confirmApproveId === stmt.id ? (
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => handleApproveStatement(stmt)}
                              className="px-2.5 py-1.5 bg-sky-600 hover:bg-sky-700 text-white rounded-lg text-xs font-bold cursor-pointer"
                            >
                              Confirmar
                            </button>
                            <button
                              type="button"
                              onClick={() => setConfirmApproveId(null)}
                              className="px-2 py-1.5 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-lg text-xs cursor-pointer"
                            >
                              No
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setConfirmApproveId(stmt.id)}
                            className="px-3 py-1.5 bg-sky-600 hover:bg-sky-700 text-white rounded-lg text-xs font-bold flex items-center gap-1 transition-colors cursor-pointer"
                          >
                            <Check className="w-3.5 h-3.5" />
                            <span>Aprobar</span>
                          </button>
                        )
                      )}

                      {mode === 'accounting' && isAdministrationRole && (stmt.estado === 'aprobado_contabilidad' || stmt.estado === 'enviado_contabilidad') && (
                        <button
                          type="button"
                          onClick={() => {
                            setPayModalStatement(stmt);
                            setPayRefAch(`EXT-${Date.now().toString().slice(-6)}`);
                          }}
                          className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold flex items-center gap-1 transition-colors cursor-pointer"
                        >
                          <CreditCard className="w-3.5 h-3.5" />
                          <span>Marcar Pagado</span>
                        </button>
                      )}

                      {mode === 'accounting' && isAdministrationRole && stmt.estado !== 'pagado' && stmt.estado !== 'rechazado' && (
                        <button
                          type="button"
                          onClick={() => {
                            setRejectModalStatement(stmt);
                            setRejectReason('');
                          }}
                          className="px-2.5 py-1.5 bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/40 dark:hover:bg-amber-900/50 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800 rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                          title="Rechazar / Ajuste"
                        >
                          <XCircle className="w-3.5 h-3.5" />
                          <span>Ajuste</span>
                        </button>
                      )}

                      {mode === 'accounting' && isAdministrationRole && (
                        confirmDeleteId === stmt.id ? (
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => handleDeleteStatement(stmt)}
                              className="px-2 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-bold cursor-pointer"
                            >
                              Eliminar
                            </button>
                            <button
                              type="button"
                              onClick={() => setConfirmDeleteId(null)}
                              className="px-2 py-1.5 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-lg text-xs cursor-pointer"
                            >
                              No
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setConfirmDeleteId(stmt.id)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition-colors cursor-pointer"
                            title="Eliminar honorario"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* MODAL FORMULARIO DE REGISTRO DE BITÁCORA Y HONORARIO (SOLO ADMINISTRACIÓN) */}
      {/* ========================================================================= */}
      {isRegisterFormOpen && canManageFees && (
        <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 max-w-2xl w-full max-h-[90vh] flex flex-col overflow-hidden my-auto">
            <div className="bg-slate-900 text-white p-5 flex items-center justify-between border-b border-slate-800 shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-sky-500/20 border border-sky-400/30 flex items-center justify-center text-sky-300">
                  <ClipboardCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-white">
                    Registro de Bitácora y Honorario
                  </h3>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsRegisterFormOpen(false)}
                className="p-1.5 text-white/70 hover:text-white rounded-lg hover:bg-white/10 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleRegisterBitacoraHonorario} className="flex-1 min-h-0 overflow-y-auto p-6 space-y-4">
              {formSuccessMsg && (
                <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-xl text-emerald-800 dark:text-emerald-200 text-xs flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>{formSuccessMsg}</span>
                </div>
              )}

              {formErrorMsg && (
                <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 rounded-xl text-rose-800 dark:text-rose-200 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>{formErrorMsg}</span>
                </div>
              )}

              {/* 1. DATOS DE BITÁCORA */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-200">
                      Folio de Bitácora *
                    </label>
                    <button
                      type="button"
                      onClick={() => setFormFolio(generateSuggestedFolio(formMatricula, formFecha))}
                      className="text-[11px] font-semibold text-sky-600 dark:text-sky-400 hover:underline cursor-pointer"
                    >
                      Sugerir folio
                    </button>
                  </div>
                  <input
                    type="text"
                    placeholder="ej: BIT-1450-2026-001"
                    value={formFolio}
                    onChange={(e) => setFormFolio(e.target.value)}
                    required
                    className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-xs font-mono font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-sky-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-200">
                    Fecha del Vuelo *
                  </label>
                  <input
                    type="date"
                    value={formFecha}
                    onChange={(e) => setFormFecha(e.target.value)}
                    required
                    className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-xs font-semibold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-sky-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-200">
                    Aeronave / Matrícula *
                  </label>
                  <select
                    value={formMatricula}
                    onChange={(e) => handleMatriculaSelect(e.target.value)}
                    className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-sky-500"
                  >
                    {FLEET_OPTIONS.map(f => (
                      <option key={f.matricula} value={f.matricula}>
                        {f.matricula} — {f.modelo}
                      </option>
                    ))}
                    <option value="OTRA">Otra matrícula...</option>
                  </select>
                </div>
              </div>

              {formMatricula === 'OTRA' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-200">
                      Matrícula Personalizada *
                    </label>
                    <input
                      type="text"
                      placeholder="ej: HP-2010"
                      value={formCustomMatricula}
                      onChange={(e) => setFormCustomMatricula(e.target.value.toUpperCase())}
                      required
                      className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-xs font-mono font-bold text-slate-900 dark:text-white"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-200">
                      Modelo de Aeronave
                    </label>
                    <input
                      type="text"
                      value={formModelo}
                      onChange={(e) => setFormModelo(e.target.value)}
                      className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-xs text-slate-900 dark:text-white"
                    />
                  </div>
                </div>
              )}

              {/* 2. ESTUDIANTE E INSTRUCTOR */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="flex items-center justify-between text-xs font-bold text-slate-700 dark:text-slate-200">
                    <span>Estudiante *</span>
                    {selectedStudentUser && (
                      <span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                        <UserCheck className="w-3 h-3" /> Fondos vinculados
                      </span>
                    )}
                  </label>
                  <select
                    value={formEstudianteId}
                    onChange={(e) => setFormEstudianteId(e.target.value)}
                    required
                    className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-xs font-semibold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-sky-500"
                  >
                    <option value="">-- Seleccionar Estudiante --</option>
                    {students.map(student => {
                      const stStats = getStudentConsumptionStats(student.id);
                      const balText =
                        stStats.saldoActual < 0
                          ? `-$${Math.abs(stStats.saldoActual).toFixed(2)} USD (En mora)`
                          : `$${stStats.saldoActual.toFixed(2)} USD`;
                      return (
                        <option key={student.id} value={student.id}>
                          {student.nombre} — Saldo: {balText}
                        </option>
                      );
                    })}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-200">
                    Instructor Asignado (CFI) *
                  </label>
                  <select
                    value={formInstructorId}
                    onChange={(e) => setFormInstructorId(e.target.value)}
                    required
                    className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-xs font-semibold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-sky-500"
                  >
                    <option value="">-- Seleccionar Instructor --</option>
                    {instructors.map(inst => (
                      <option key={inst.id} value={inst.id}>
                        {inst.nombre} ({inst.licencia || 'CFI'})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* 3. HORAS, TARIFA AERONAVE, TARIFA INSTRUCTOR Y RETENCIÓN */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="space-y-1">
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-200">
                    Horas de Vuelo *
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    min="0.1"
                    max="24"
                    value={formHoras}
                    onChange={(e) => setFormHoras(e.target.value)}
                    required
                    className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-xs font-bold text-slate-900 dark:text-white tabular-nums focus:outline-none focus:ring-2 focus:ring-sky-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-200">
                    Tarifa Aeronave ($/hr) *
                  </label>
                  <input
                    type="number"
                    step="1"
                    min="1"
                    value={formTarifaAvion}
                    onChange={(e) => setFormTarifaAvion(e.target.value)}
                    required
                    className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-xs font-bold text-slate-900 dark:text-white tabular-nums focus:outline-none focus:ring-2 focus:ring-sky-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-200">
                    Tarifa Instructor ($/hr) *
                  </label>
                  <input
                    type="number"
                    step="0.5"
                    min="1"
                    value={formTarifaHora}
                    onChange={(e) => setFormTarifaHora(e.target.value)}
                    required
                    className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-xs font-bold text-slate-900 dark:text-white tabular-nums focus:outline-none focus:ring-2 focus:ring-sky-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-200">
                    Retención (%)
                  </label>
                  <input
                    type="number"
                    step="0.5"
                    min="0"
                    max="50"
                    value={formRetencionPct}
                    onChange={(e) => setFormRetencionPct(e.target.value)}
                    className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-xs font-semibold text-slate-900 dark:text-white tabular-nums focus:outline-none focus:ring-2 focus:ring-sky-500"
                  />
                </div>
              </div>

              {/* 4. RUTA Y MISIÓN */}
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                <div className="space-y-1">
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-200">Origen</label>
                  <input
                    type="text"
                    value={formOrigen}
                    onChange={(e) => setFormOrigen(e.target.value.toUpperCase())}
                    className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-xs font-bold uppercase text-slate-900 dark:text-white"
                  />
                </div>
                <div className="space-y-1">
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-200">Destino</label>
                  <input
                    type="text"
                    value={formDestino}
                    onChange={(e) => setFormDestino(e.target.value.toUpperCase())}
                    className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-xs font-bold uppercase text-slate-900 dark:text-white"
                  />
                </div>
                <div className="sm:col-span-2 space-y-1">
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-200">
                    Misión / Tipo de Instrucción
                  </label>
                  <input
                    type="text"
                    value={formMision}
                    onChange={(e) => setFormMision(e.target.value)}
                    placeholder="ej: Maniobras Básicas, IFR, Travesía..."
                    className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-xs text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              {/* FICHA EN VIVO DE FONDOS Y CONSUMO DEL ESTUDIANTE */}
              {selectedStudentUser && selectedStudentStats && (
                <div className="p-3.5 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl space-y-2 tabular-nums">
                  <div className="flex items-center justify-between gap-2 text-xs">
                    <span className="font-bold text-slate-800 dark:text-slate-100">
                      Consumo y Débito de Fondos — {selectedStudentUser.nombre}
                    </span>
                    <span className="text-[11px] text-slate-500 dark:text-slate-400">
                      Consumo previo: {Number(selectedStudentStats.horasConsumidas.toFixed(4))} hrs (${selectedStudentStats.montoConsumido.toFixed(2)} USD)
                    </span>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs pt-1">
                    <div className="p-2 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700">
                      <span className="text-[10px] text-slate-500 dark:text-slate-400 block">Saldo Actual</span>
                      <strong className={selectedStudentStats.saldoActual >= 0 ? 'text-emerald-700 dark:text-emerald-400' : 'text-rose-700 dark:text-rose-400'}>
                        ${selectedStudentStats.saldoActual.toFixed(2)} USD
                      </strong>
                    </div>
                    <div className="p-2 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700">
                      <span className="text-[10px] text-slate-500 dark:text-slate-400 block">Débito Bitácora</span>
                      <strong className="text-rose-700 dark:text-rose-400">
                        -${previewCargoEstudiante.toFixed(2)} USD
                      </strong>
                    </div>
                    <div className="p-2 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700">
                      <span className="text-[10px] text-slate-500 dark:text-slate-400 block">Saldo Resultante</span>
                      <strong className={previewSaldoResultanteEstudiante >= 0 ? 'text-slate-900 dark:text-white' : 'text-rose-700 dark:text-rose-400'}>
                        ${previewSaldoResultanteEstudiante.toFixed(2)} USD
                      </strong>
                    </div>
                    <div className="p-2 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700">
                      <span className="text-[10px] text-slate-500 dark:text-slate-400 block">Consumo Actualizado</span>
                      <strong className="text-sky-700 dark:text-sky-400">
                        {Number((selectedStudentStats.horasConsumidas + previewHorasEstudiante).toFixed(4))} hrs
                      </strong>
                    </div>
                  </div>
                </div>
              )}

              {/* OBSERVACIONES */}
              <div className="space-y-1">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-200">
                  Observaciones de Bitácora (Opcional)
                </label>
                <textarea
                  rows={2}
                  value={formObservaciones}
                  onChange={(e) => setFormObservaciones(e.target.value)}
                  placeholder="Anotaciones de bitácora o comentarios para Contabilidad..."
                  className="w-full p-2.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-sky-500"
                />
              </div>

              {/* RESUMEN FINANCIERO EN VIVO */}
              <div className="p-4 bg-slate-900 text-white rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 tabular-nums">
                <div className="text-xs text-slate-300 space-y-1">
                  <div>
                    Honorario CFI: <strong className="text-white">{previewHoras.toFixed(1)} hrs × ${previewTarifa.toFixed(2)}/h</strong> = ${previewBruto.toFixed(2)} USD
                  </div>
                  <div>
                    Débito Estudiante ({formMatricula}): <strong className="text-rose-300">-${previewCargoEstudiante.toFixed(2)} USD</strong> ({previewHoras}h × 1.275 = {Number(previewHorasEstudiante.toFixed(4))} hrs × ${previewTarifaAvion.toFixed(2)}/h)
                  </div>
                  {previewRetencion > 0 && (
                    <div className="text-amber-300">
                      Retención ({previewRetPct}%): -${previewRetencion.toFixed(2)} USD
                    </div>
                  )}
                </div>
                <div className="text-right">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-sky-300 block">
                    Honorario Neto a Crear
                  </span>
                  <span className="text-xl font-bold text-white">
                    ${previewNeto.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD
                  </span>
                </div>
              </div>

              {/* ACCIONES */}
              <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsRegisterFormOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-semibold cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submittingForm}
                  className="px-5 py-2.5 bg-sky-600 hover:bg-sky-700 text-white rounded-xl text-xs font-bold shadow-sm transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-60"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>{submittingForm ? 'Registrando...' : 'Registrar Bitácora y Crear Honorario'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: DETALLE DEL HONORARIO POR BITÁCORA                                 */}
      {/* ========================================================================= */}
      {selectedStatement && (
        <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 max-w-4xl w-full max-h-[90vh] flex flex-col overflow-hidden my-auto">
            <div className="bg-slate-900 text-white p-5 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-sky-500/20 border border-sky-400/30 flex items-center justify-center text-sky-400">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-bold text-base text-white">
                      Honorario {selectedStatement.id}
                    </h3>
                    {getStatusBadge(selectedStatement.estado)}
                  </div>
                  <p className="text-xs text-slate-300 mt-0.5">
                    Bitácora: <strong className="font-mono">{selectedStatement.folio_bitacora || selectedStatement.vuelos[0]?.folio_bitacora || 'N/A'}</strong> • Estudiante: <strong>{selectedStatement.estudiante_nombre || selectedStatement.piloto_nombre || selectedStatement.vuelos[0]?.estudiante_nombre || selectedStatement.vuelos[0]?.piloto_nombre || 'N/A'}</strong>
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="p-2 text-white/80 hover:text-white rounded-lg hover:bg-white/10 cursor-pointer"
                  title="Imprimir detalle"
                >
                  <Printer className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedStatement(null)}
                  className="p-2 text-white/80 hover:text-white rounded-lg hover:bg-white/10 cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="flex-1 min-h-0 overflow-y-auto p-6 space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700 text-xs">
                <div className="space-y-1">
                  <span className="font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block text-[10px]">
                    Instructor Beneficiario
                  </span>
                  <div className="font-bold text-slate-900 dark:text-white text-sm">
                    {selectedStatement.instructor_nombre}
                  </div>
                  <div className="text-slate-600 dark:text-slate-300">
                    Cédula: <strong>{selectedStatement.instructor_cedula}</strong> • Licencia: <strong>{selectedStatement.instructor_licencia}</strong>
                  </div>
                  <div className="text-slate-600 dark:text-slate-300">
                    Correo: <strong>{selectedStatement.instructor_correo}</strong>
                  </div>
                </div>

                <div className="space-y-1 md:text-right">
                  <span className="font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block text-[10px]">
                    Registro Administrativo & Pago
                  </span>
                  <div className="text-slate-700 dark:text-slate-200">
                    Registrado por: <strong>{selectedStatement.registrado_por_nombre || selectedStatement.procesado_por || 'Administración'}</strong>
                  </div>
                  <div className="text-slate-600 dark:text-slate-300">
                    Fecha de Vuelo: <strong className="tabular-nums">{selectedStatement.periodo_inicio}</strong>
                  </div>
                  {selectedStatement.referencia_pago_ach && (
                    <div className="text-emerald-700 dark:text-emerald-400 font-bold">
                      Ref. ACH: {selectedStatement.referencia_pago_ach} ({selectedStatement.banco_pago || 'Banco General'})
                    </div>
                  )}
                </div>
              </div>

              {/* DESGLOSE DE BITÁCORA */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-slate-900 dark:text-white text-xs uppercase tracking-wider flex items-center gap-1.5">
                    <Plane className="w-4 h-4 text-sky-600" />
                    <span>Bitácora Asociada ({selectedStatement.vuelos.length})</span>
                  </h4>
                  <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 tabular-nums">
                    Tarifa: ${selectedStatement.tarifa_base_hora.toFixed(2)}/h
                  </span>
                </div>

                <div className="border border-slate-200 dark:border-slate-700 rounded-xl overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-bold border-b border-slate-200 dark:border-slate-700">
                      <tr>
                        <th className="p-2.5">Fecha</th>
                        <th className="p-2.5">Folio Bitácora</th>
                        <th className="p-2.5">Aeronave</th>
                        <th className="p-2.5">Estudiante</th>
                        <th className="p-2.5">Misión / Ruta</th>
                        <th className="p-2.5 text-center">Horas</th>
                        <th className="p-2.5 text-right">Subtotal</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-200">
                      {selectedStatement.vuelos.map((v, i) => (
                        <tr key={v.id || i}>
                          <td className="p-2.5 font-medium whitespace-nowrap tabular-nums">{v.fecha}</td>
                          <td className="p-2.5 font-mono font-bold text-sky-700 dark:text-sky-400 whitespace-nowrap">
                            {v.folio_bitacora}
                          </td>
                          <td className="p-2.5 whitespace-nowrap">
                            <span className="font-mono font-bold text-slate-900 dark:text-white">
                              {v.matricula_avion}
                            </span>
                            <span className="block text-[10px] text-slate-500 dark:text-slate-400">{v.modelo_avion}</span>
                          </td>
                          <td className="p-2.5">
                            <span className="font-semibold text-slate-900 dark:text-white">
                              {v.estudiante_nombre || v.piloto_nombre}
                            </span>
                            {v.estudiante_cedula && (
                              <span className="block text-[10px] text-slate-400">Céd: {v.estudiante_cedula}</span>
                            )}
                          </td>
                          <td className="p-2.5 text-[11px] text-slate-600 dark:text-slate-300">
                            {v.tipo_mision || 'Instrucción de Vuelo'}
                            {v.origen_destino && <span className="block text-[10px] text-slate-400">{v.origen_destino}</span>}
                            {v.tacometro_final !== undefined && (
                              <span className="block text-[10px] font-mono text-indigo-600 dark:text-indigo-400">
                                Tach: {v.tacometro_inicial !== undefined ? `${v.tacometro_inicial.toFixed(1)}→` : ''}{v.tacometro_final.toFixed(1)}h
                              </span>
                            )}
                          </td>
                          <td className="p-2.5 text-center font-bold text-slate-900 dark:text-white tabular-nums">
                            {v.horas_vuelo.toFixed(1)} h
                          </td>
                          <td className="p-2.5 text-right font-bold text-slate-900 dark:text-white tabular-nums">
                            ${v.subtotal.toFixed(2)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* RESUMEN FINANCIERO */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 bg-slate-900 text-white rounded-xl tabular-nums">
                <div className="space-y-1 text-xs">
                  <div className="text-slate-300">
                    Horas Contabilizadas: <strong>{selectedStatement.total_horas.toFixed(1)} hrs ({formatHoursAsTime(selectedStatement.total_horas)})</strong>
                  </div>
                  <div className="text-slate-300">
                    Monto Bruto: <strong>${selectedStatement.total_bruto.toFixed(2)} USD</strong>
                  </div>
                  {!isInstructorRole && mode === 'accounting' && selectedStatement.estudiante_monto_debitado !== undefined && (
                    <div className="text-emerald-300">
                      Consumo Debitado al Estudiante: <strong>-${selectedStatement.estudiante_monto_debitado.toFixed(2)} USD</strong>
                      {selectedStatement.estudiante_saldo_resultante !== undefined && (
                        <> (Saldo resultante: ${selectedStatement.estudiante_saldo_resultante.toFixed(2)} USD)</>
                      )}
                    </div>
                  )}
                  {selectedStatement.retencion_impuesto > 0 && (
                    <div className="text-amber-300">
                      Retención Aplicada: -${selectedStatement.retencion_impuesto.toFixed(2)} USD
                    </div>
                  )}
                </div>

                <div className="text-right">
                  <span className="text-xs text-sky-300 font-bold uppercase tracking-wider block">
                    Total Neto Honorario
                  </span>
                  <div className="text-2xl font-bold text-white">
                    ${selectedStatement.total_neto.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    <span className="text-xs font-normal text-sky-200 ml-1">USD</span>
                  </div>
                </div>
              </div>

              {(selectedStatement.notas_instructor || selectedStatement.notas_contabilidad) && (
                <div className="space-y-2 text-xs">
                  {selectedStatement.notas_instructor && (
                    <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-lg border border-slate-200 dark:border-slate-700">
                      <span className="font-bold text-slate-700 dark:text-slate-200 block mb-0.5">Observaciones de Registro:</span>
                      <p className="text-slate-600 dark:text-slate-300">{selectedStatement.notas_instructor}</p>
                    </div>
                  )}
                  {selectedStatement.notas_contabilidad && (
                    <div className="p-3 bg-sky-50 dark:bg-sky-950/30 rounded-lg border border-sky-200 dark:border-sky-800">
                      <span className="font-bold text-sky-900 dark:text-sky-200 block mb-0.5">Dictamen Contable:</span>
                      <p className="text-sky-800 dark:text-sky-300">{selectedStatement.notas_contabilidad}</p>
                    </div>
                  )}
                </div>
              )}

              {mode === 'accounting' && isAdministrationRole && (
                <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex items-center justify-end gap-2.5">
                  {selectedStatement.estado === 'enviado_contabilidad' && (
                    <button
                      type="button"
                      onClick={() => handleApproveStatement(selectedStatement)}
                      className="px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                    >
                      <Check className="w-4 h-4" />
                      <span>Aprobar Honorario</span>
                    </button>
                  )}

                  {(selectedStatement.estado === 'aprobado_contabilidad' || selectedStatement.estado === 'enviado_contabilidad') && (
                    <button
                      type="button"
                      onClick={() => {
                        setPayModalStatement(selectedStatement);
                        setPayRefAch(`EXT-${Date.now().toString().slice(-6)}`);
                      }}
                      className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                    >
                      <CreditCard className="w-4 h-4" />
                      <span>Marcar Pagado</span>
                    </button>
                  )}

                  {selectedStatement.estado !== 'pagado' && selectedStatement.estado !== 'rechazado' && (
                    <button
                      type="button"
                      onClick={() => {
                        setRejectModalStatement(selectedStatement);
                        setRejectReason('');
                      }}
                      className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                    >
                      <XCircle className="w-4 h-4" />
                      <span>Rechazar / Ajuste</span>
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: REGISTRAR PAGO POR CONTABILIDAD / PLATAFORMA EXTERNA               */}
      {/* ========================================================================= */}
      {payModalStatement && canManageFees && (
        <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 max-w-md w-full max-h-[90vh] flex flex-col overflow-hidden my-auto">
            <div className="bg-emerald-800 text-white p-4 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-emerald-200" />
                <h3 className="font-bold text-sm text-white">
                  Registrar Pago de Honorario
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setPayModalStatement(null)}
                className="p-1 text-white/70 hover:text-white rounded-lg hover:bg-white/10 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleExecutePayment} className="flex-1 min-h-0 overflow-y-auto p-5 space-y-4">
              <div className="p-3 bg-emerald-50 dark:bg-emerald-950/30 rounded-xl border border-emerald-200 dark:border-emerald-800 text-xs space-y-1">
                <div className="text-slate-700 dark:text-slate-200">
                  Instructor: <strong>{payModalStatement.instructor_nombre}</strong>
                </div>
                <div className="text-slate-700 dark:text-slate-200">
                  Bitácora: <strong className="font-mono">{payModalStatement.folio_bitacora || payModalStatement.id}</strong> ({payModalStatement.total_horas.toFixed(1)} hrs)
                </div>
                <div className="text-slate-700 dark:text-slate-200">
                  Estudiante: <strong>{payModalStatement.estudiante_nombre || payModalStatement.piloto_nombre || payModalStatement.vuelos[0]?.estudiante_nombre || payModalStatement.vuelos[0]?.piloto_nombre || 'N/A'}</strong>
                </div>
                <div className="text-emerald-900 dark:text-emerald-300 text-sm font-bold pt-1 tabular-nums">
                  Monto a Pagar: ${payModalStatement.total_neto.toFixed(2)} USD
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-200 mb-1">Banco / Plataforma de Pago</label>
                <input
                  type="text"
                  value={payBank}
                  onChange={(e) => setPayBank(e.target.value)}
                  required
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-xs font-semibold text-slate-800 dark:text-white focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-200 mb-1">
                  Referencia de Pago *
                </label>
                <input
                  type="text"
                  value={payRefAch}
                  onChange={(e) => setPayRefAch(e.target.value)}
                  placeholder="ej: ACH-992140 / EXT-1042"
                  required
                  className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-xs font-mono font-bold text-slate-900 dark:text-white focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-200 mb-1">Notas Contables</label>
                <textarea
                  rows={2}
                  value={payNotes}
                  onChange={(e) => setPayNotes(e.target.value)}
                  placeholder="Detalles del pago realizado..."
                  className="w-full p-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-xs text-slate-800 dark:text-white focus:outline-none"
                />
              </div>

              <div className="pt-2 border-t border-slate-200 dark:border-slate-800 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setPayModalStatement(null)}
                  className="px-3 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-lg text-xs font-semibold cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={paying}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                >
                  <Check className="w-4 h-4" />
                  <span>{paying ? 'Procesando...' : 'Confirmar Pago'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: RECHAZAR / SOLICITAR AJUSTE DE HONORARIO                           */}
      {/* ========================================================================= */}
      {rejectModalStatement && canManageFees && (
        <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 max-w-md w-full max-h-[90vh] flex flex-col overflow-hidden my-auto">
            <div className="bg-amber-700 text-white p-4 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <XCircle className="w-5 h-5 text-amber-200" />
                <h3 className="font-bold text-sm text-white">
                  Rechazar / Solicitar Ajuste
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setRejectModalStatement(null)}
                className="p-1 text-white/70 hover:text-white rounded-lg hover:bg-white/10 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleRejectStatement} className="flex-1 min-h-0 overflow-y-auto p-5 space-y-4">
              <div className="p-3 bg-amber-50 dark:bg-amber-950/30 rounded-xl border border-amber-200 dark:border-amber-800 text-xs space-y-1">
                <div className="text-slate-700 dark:text-slate-200">
                  Instructor: <strong>{rejectModalStatement.instructor_nombre}</strong>
                </div>
                <div className="text-slate-700 dark:text-slate-200">
                  Bitácora: <strong className="font-mono">{rejectModalStatement.folio_bitacora || rejectModalStatement.id}</strong> · ${rejectModalStatement.total_neto.toFixed(2)} USD
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-200 mb-1">
                  Motivo / Notas de Ajuste *
                </label>
                <textarea
                  rows={3}
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  required
                  placeholder="Indica el motivo del ajuste o rechazo..."
                  className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-xs text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div className="pt-2 border-t border-slate-200 dark:border-slate-800 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setRejectModalStatement(null)}
                  className="px-3 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-lg text-xs font-semibold cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={rejecting}
                  className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                >
                  <XCircle className="w-4 h-4" />
                  <span>{rejecting ? 'Guardando...' : 'Confirmar Ajuste'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      </>
      )}
    </div>
  );
};
