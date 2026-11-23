import React, { useEffect, useMemo, useState } from 'react';
import {
  User,
  FlightRequest,
  FlightRequestStatus,
  FlightRequestScheduleStatus,
  PublishedDailyItinerary,
  Itinerary,
  AircraftMaintenanceRecord,
  StudentFlightEligibility
} from '../types';
import { api } from '../services/api';
import {
  Clock,
  Send,
  CheckCircle2,
  XCircle,
  Calendar,
  Plane,
  ShieldAlert,
  Lock,
  Eye,
  RefreshCw,
  AlertTriangle,
  Check,
  X,
  Pencil,
  Trash2
} from 'lucide-react';

interface FlightRequestsModuleProps {
  currentUser: User;
  allUsers: User[];
  onRefreshAll?: () => void;
}

const AIRCRAFT_MODELS: Record<string, string> = {
  'HP-1822': 'Cessna 172SP Skyhawk (G1000)',
  'HP-1450': 'Piper PA-28-181 Archer II',
  'HP-1588': 'Piper PA-28-181 Archer III',
  'HP-1799': 'Piper PA-34-220T Seneca',
  'HP-1721SP': 'Cessna 172SP Skyhawk'
};

export const FlightRequestsModule: React.FC<FlightRequestsModuleProps> = ({
  currentUser,
  allUsers,
  onRefreshAll
}) => {
  const isChiefInstructor = currentUser.rol === 'instructor_en_jefe';
  const isDirector = currentUser.rol === 'escuela' || currentUser.rol === 'admin';
  const isInstructor = currentUser.rol === 'instructor';
  const isStudent = currentUser.rol === 'estudiante';
  const canBypassTimeLock = isChiefInstructor || isDirector;
  const canManageAcceptedFlights = isChiefInstructor || isDirector;
  const isAllowedRole = canManageAcceptedFlights || isInstructor || isStudent;

  const [scheduleStatus, setScheduleStatus] = useState<FlightRequestScheduleStatus | null>(null);
  const [requests, setRequests] = useState<FlightRequest[]>([]);
  const [publications, setPublications] = useState<PublishedDailyItinerary[]>([]);
  const [publishedItineraries, setPublishedItineraries] = useState<Itinerary[]>([]);
  const [aircraftRecords, setAircraftRecords] = useState<AircraftMaintenanceRecord[]>([]);
  const [eligibilityMap, setEligibilityMap] = useState<Record<string, StudentFlightEligibility>>({});
  const [minBalanceRequired, setMinBalanceRequired] = useState<number>(330);
  const [loading, setLoading] = useState<boolean>(true);
  const [actionBusy, setActionBusy] = useState<boolean>(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Filtros
  const [chiefFilter, setChiefFilter] = useState<'pendientes_decision' | 'todas' | 'aprobada' | 'rechazada' | 'publicada'>('pendientes_decision');
  const [publishedScope, setPublishedScope] = useState<'todos' | 'mios'>('todos');
  const [selectedPublishedDate, setSelectedPublishedDate] = useState<string>('');

  // Modal de rechazo (Instructor en Jefe / Director)
  const [rejectingRequest, setRejectingRequest] = useState<FlightRequest | null>(null);
  const [rejectReason, setRejectReason] = useState<string>('');

  // Modal de edición / eliminación de vuelos aceptados (Director e Instructor en Jefe)
  const [editingTarget, setEditingTarget] = useState<{
    kind: 'request' | 'itinerary';
    id: string;
    instructor_id: string;
    estudiante_id: string;
    fecha: string;
    hora_inicio: string;
    hora_fin: string;
    avion_matricula: string;
    ruta: string;
    mision: string;
    notas: string;
  } | null>(null);
  const [deletingTarget, setDeletingTarget] = useState<{
    kind: 'request' | 'itinerary';
    id: string;
    label: string;
  } | null>(null);

  // Formulario de solicitud
  const studentsList = useMemo(
    () => allUsers.filter(u => u.rol === 'estudiante' && u.activo !== false),
    [allUsers]
  );

  const instructorsList = useMemo(
    () => allUsers.filter(u => (u.rol === 'instructor' || u.rol === 'instructor_en_jefe') && u.activo !== false),
    [allUsers]
  );

  const fleetList = useMemo(() => {
    const mats = Array.from(
      new Set([
        ...aircraftRecords.map(a => a.matricula).filter(Boolean),
        'HP-1822',
        'HP-1450',
        'HP-1588',
        'HP-1799',
        'HP-1721SP'
      ])
    );
    return mats;
  }, [aircraftRecords]);

  const getTomorrowDate = () => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  };

  const [selectedInstructorId, setSelectedInstructorId] = useState<string>('');
  const [estudianteId, setEstudianteId] = useState<string>('');
  const [fechaVuelo, setFechaVuelo] = useState<string>(getTomorrowDate());
  const [horaInicio, setHoraInicio] = useState<string>('08:00');
  const [horaFin, setHoraFin] = useState<string>('09:30');
  const [avionMatricula, setAvionMatricula] = useState<string>('HP-1822');
  const [ruta, setRuta] = useState<string>('MPMG - MPDA');
  const [mision, setMision] = useState<string>('Vuelo de Instrucción y Maniobras');
  const [notasInstructor, setNotasInstructor] = useState<string>('');

  useEffect(() => {
    if (!estudianteId && studentsList.length > 0) {
      setEstudianteId(studentsList[0].id);
    }
  }, [studentsList, estudianteId]);

  useEffect(() => {
    if (!selectedInstructorId) {
      if (isInstructor || isChiefInstructor) {
        setSelectedInstructorId(currentUser.id);
      } else if (instructorsList.length > 0) {
        setSelectedInstructorId(instructorsList[0].id);
      }
    }
  }, [instructorsList, selectedInstructorId, isInstructor, isChiefInstructor, currentUser.id]);

  const computedDuration = useMemo(() => {
    if (!horaInicio || !horaFin) return 1.5;
    const [h1, m1] = horaInicio.split(':').map(Number);
    const [h2, m2] = horaFin.split(':').map(Number);
    const diff = (h2 * 60 + m2 - (h1 * 60 + m1)) / 60;
    return diff > 0 ? Number(diff.toFixed(1)) : 1.5;
  }, [horaInicio, horaFin]);

  const selectedStudentEligibility = estudianteId ? eligibilityMap[estudianteId] : undefined;
  const isSelectedStudentBlocked = Boolean(selectedStudentEligibility && !selectedStudentEligibility.eligible);
  const isRequestFormDisabled = (!canBypassTimeLock && !scheduleStatus?.ventana_abierta) || actionBusy;

  const loadData = async () => {
    if (!isAllowedRole) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const [statusRes, reqsRes, pubRes, acRes, eligRes] = await Promise.all([
        api.getFlightRequestScheduleStatus(),
        isStudent
          ? Promise.resolve([] as FlightRequest[])
          : api.getFlightRequests({ role: currentUser.rol, userId: currentUser.id }),
        api.getPublishedDailyItineraries(currentUser.rol),
        api.getAircraftMaintenanceRecords().catch(() => []),
        isStudent
          ? Promise.resolve({ minRequired: 330, eligibility: {} as Record<string, StudentFlightEligibility> })
          : api.getStudentFlightEligibility().catch(() => ({ minRequired: 330, eligibility: {} as Record<string, StudentFlightEligibility> }))
      ]);

      setScheduleStatus(statusRes);
      setRequests(reqsRes);
      setPublications(pubRes.publications || []);
      setPublishedItineraries(pubRes.itineraries || []);
      setAircraftRecords(acRes);
      setMinBalanceRequired(eligRes.minRequired || 330);
      setEligibilityMap(eligRes.eligibility || {});
    } catch (err: any) {
      setFeedback({ type: 'error', text: err.message || 'Error al cargar datos de solicitudes.' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    const timer = setInterval(() => {
      loadData();
    }, 30000);
    return () => clearInterval(timer);
  }, [currentUser.id, currentUser.rol]);

  const handleSubmitRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null);
    if (!canBypassTimeLock && !scheduleStatus?.ventana_abierta) {
      setFeedback({
        type: 'error',
        text: 'El período de solicitudes está cerrado. Solo se admiten solicitudes entre las 11:00 AM y las 6:00 PM.'
      });
      return;
    }
    if (isSelectedStudentBlocked) {
      setFeedback({
        type: 'error',
        text: selectedStudentEligibility?.hasZeroOrNegative
          ? `Asignación bloqueada: el estudiante seleccionado está sin saldo disponible. Debe contar con un saldo mínimo de $${minBalanceRequired.toFixed(2)} USD para asignarle vuelos.`
          : `Asignación bloqueada: el estudiante seleccionado no cumple con el saldo mínimo requerido de $${minBalanceRequired.toFixed(2)} USD para asignación de vuelos.`
      });
      return;
    }
    setActionBusy(true);
    try {
      const acRecord = aircraftRecords.find(a => a.matricula === avionMatricula);
      const model = acRecord?.modelo || AIRCRAFT_MODELS[avionMatricula] || 'Aeronave Escuela';
      await api.createFlightRequest({
        instructor_id: canBypassTimeLock && selectedInstructorId ? selectedInstructorId : currentUser.id,
        estudiante_id: estudianteId,
        fecha_vuelo: fechaVuelo,
        hora_inicio: horaInicio,
        hora_fin: horaFin,
        duracion_horas: computedDuration,
        avion_matricula: avionMatricula,
        avion_modelo: model,
        ruta,
        mision,
        notas_instructor: notasInstructor,
        solicitado_por_rol: currentUser.rol
      });
      setFeedback({
        type: 'success',
        text: canBypassTimeLock
          ? 'Solicitud de vuelo registrada sin restricción horaria. Puede aprobarla o publicarla directamente.'
          : 'Solicitud registrada en la cola del día. Se enviará automáticamente al Instructor en Jefe a las 6:00 PM.'
      });
      setNotasInstructor('');
      await loadData();
    } catch (err: any) {
      setFeedback({ type: 'error', text: err.message || 'No se pudo enviar la solicitud.' });
    } finally {
      setActionBusy(false);
    }
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTarget) return;
    const editElig = editingTarget.estudiante_id ? eligibilityMap[editingTarget.estudiante_id] : undefined;
    if (editElig && !editElig.eligible) {
      setFeedback({
        type: 'error',
        text: editElig.hasZeroOrNegative
          ? `Asignación bloqueada: el estudiante seleccionado se encuentra sin saldo disponible (mínimo requerido $${minBalanceRequired.toFixed(2)} USD).`
          : `Asignación bloqueada: el estudiante no alcanza el saldo mínimo de $${minBalanceRequired.toFixed(2)} USD requerido para volar.`
      });
      return;
    }
    setFeedback(null);
    setActionBusy(true);
    try {
      const [h1, m1] = editingTarget.hora_inicio.split(':').map(Number);
      const [h2, m2] = editingTarget.hora_fin.split(':').map(Number);
      const diff = (h2 * 60 + m2 - (h1 * 60 + m1)) / 60;
      const horas = diff > 0 ? Number(diff.toFixed(1)) : 1.5;
      const acRecord = aircraftRecords.find(a => a.matricula === editingTarget.avion_matricula);
      const model = acRecord?.modelo || AIRCRAFT_MODELS[editingTarget.avion_matricula] || 'Aeronave Escuela';
      const actor = { id: currentUser.id, nombre: currentUser.nombre, rol: currentUser.rol };

      if (editingTarget.kind === 'request') {
        await api.updateFlightRequest(
          editingTarget.id,
          {
            instructor_id: editingTarget.instructor_id,
            estudiante_id: editingTarget.estudiante_id,
            fecha_vuelo: editingTarget.fecha,
            hora_inicio: editingTarget.hora_inicio,
            hora_fin: editingTarget.hora_fin,
            duracion_horas: horas,
            avion_matricula: editingTarget.avion_matricula,
            avion_modelo: model,
            ruta: editingTarget.ruta,
            mision: editingTarget.mision,
            notas_instructor: editingTarget.notas
          },
          actor
        );
      } else {
        await api.updateItinerary(
          editingTarget.id,
          {
            instructor_id: editingTarget.instructor_id,
            estudiante_id: editingTarget.estudiante_id,
            fecha: editingTarget.fecha,
            hora_inicio: editingTarget.hora_inicio,
            hora_fin: editingTarget.hora_fin,
            horas,
            avion_matricula: editingTarget.avion_matricula,
            avion_modelo: model,
            ruta: editingTarget.ruta,
            mision: editingTarget.mision,
            detalles_evento: editingTarget.notas
          },
          actor
        );
      }

      setFeedback({
        type: 'success',
        text: editingTarget.kind === 'request' ? 'Solicitud / vuelo actualizado correctamente.' : 'Vuelo actualizado correctamente.'
      });
      setEditingTarget(null);
      await loadData();
      if (onRefreshAll) onRefreshAll();
    } catch (err: any) {
      setFeedback({ type: 'error', text: err.message || 'No se pudo actualizar el vuelo.' });
    } finally {
      setActionBusy(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deletingTarget) return;
    setFeedback(null);
    setActionBusy(true);
    try {
      const actor = { id: currentUser.id, nombre: currentUser.nombre, rol: currentUser.rol };
      if (deletingTarget.kind === 'request') {
        await api.deleteFlightRequest(deletingTarget.id, actor);
      } else {
        await api.deleteItinerary(deletingTarget.id, actor);
      }
      setFeedback({ type: 'success', text: 'Vuelo eliminado correctamente.' });
      setDeletingTarget(null);
      await loadData();
      if (onRefreshAll) onRefreshAll();
    } catch (err: any) {
      setFeedback({ type: 'error', text: err.message || 'No se pudo eliminar el vuelo.' });
    } finally {
      setActionBusy(false);
    }
  };

  const handleDecision = async (req: FlightRequest, decision: 'aprobada' | 'rechazada', reason?: string) => {
    if (decision === 'aprobada') {
      const reqElig = eligibilityMap[req.estudiante_id];
      if (reqElig && !reqElig.eligible) {
        setFeedback({
          type: 'error',
          text: reqElig.hasZeroOrNegative
            ? `Aprobación bloqueada: ${req.estudiante_nombre} se encuentra sin saldo disponible. Requiere saldo mínimo de $${minBalanceRequired.toFixed(2)} USD validado por Contabilidad.`
            : `Aprobación bloqueada: ${req.estudiante_nombre} no cumple con el saldo mínimo requerido de $${minBalanceRequired.toFixed(2)} USD.`
        });
        return;
      }
    }
    setFeedback(null);
    setActionBusy(true);
    try {
      await api.decideFlightRequest(
        req.id,
        decision,
        { id: currentUser.id, nombre: currentUser.nombre, rol: currentUser.rol },
        reason
      );
      setFeedback({
        type: 'success',
        text:
          decision === 'aprobada'
            ? `Solicitud de ${req.instructor_nombre} (${req.avion_matricula}) aprobada para publicación a las 8:00 PM.`
            : `Solicitud de ${req.instructor_nombre} (${req.avion_matricula}) marcada como rechazada.`
      });
      setRejectingRequest(null);
      setRejectReason('');
      await loadData();
    } catch (err: any) {
      setFeedback({ type: 'error', text: err.message || 'Error al registrar decisión.' });
    } finally {
      setActionBusy(false);
    }
  };

  const handleManualSixPmBatch = async () => {
    setFeedback(null);
    setActionBusy(true);
    try {
      const res = await api.runSixPmDispatchBatch(currentUser.rol);
      setFeedback({
        type: 'success',
        text: `Corte 6:00 PM ejecutado: ${res.dispatchedCount} solicitud(es) remitida(s) a la bandeja del Instructor en Jefe.`
      });
      await loadData();
    } catch (err: any) {
      setFeedback({ type: 'error', text: err.message || 'Error al ejecutar corte 6:00 PM.' });
    } finally {
      setActionBusy(false);
    }
  };

  const handleManualEightPmPublish = async () => {
    setFeedback(null);
    setActionBusy(true);
    try {
      const res = await api.runEightPmPublishBatch(currentUser.rol, currentUser.nombre);
      setFeedback({
        type: 'success',
        text: `Itinerario 8:00 PM publicado: ${res.publishedCount} vuelo(s) aprobado(s) visible(s) en modo solo lectura para instructores y estudiantes.`
      });
      await loadData();
      if (onRefreshAll) onRefreshAll();
    } catch (err: any) {
      setFeedback({ type: 'error', text: err.message || 'Error al publicar itinerario.' });
    } finally {
      setActionBusy(false);
    }
  };

  const handleSimulatedClockChange = async (val: string) => {
    setFeedback(null);
    setActionBusy(true);
    try {
      const updated = await api.setFlightRequestSimulatedTime(val === 'real' ? null : val, currentUser.rol);
      setScheduleStatus(updated);
      await loadData();
      if (onRefreshAll) onRefreshAll();
    } catch (err: any) {
      setFeedback({ type: 'error', text: err.message || 'Error al ajustar hora operativa.' });
    } finally {
      setActionBusy(false);
    }
  };

  const getStatusLabel = (estado: FlightRequestStatus) => {
    switch (estado) {
      case 'pendiente_envio':
        return { text: 'En cola (corte 6:00 PM)', cls: 'text-amber-700 dark:text-amber-400' };
      case 'enviada_jefe':
        return { text: 'Enviada a Instructor en Jefe', cls: 'text-sky-700 dark:text-sky-400' };
      case 'aprobada':
        return { text: 'Aprobada (publica 8:00 PM)', cls: 'text-emerald-700 dark:text-emerald-400' };
      case 'rechazada':
        return { text: 'No aprobada', cls: 'text-rose-700 dark:text-rose-400' };
      case 'publicada':
        return { text: 'Publicada en Itinerario 8:00 PM', cls: 'text-indigo-700 dark:text-indigo-400' };
    }
  };

  const chiefFilteredRequests = useMemo(() => {
    if (chiefFilter === 'todas') return requests;
    if (chiefFilter === 'pendientes_decision') {
      return requests.filter(r => r.estado === 'enviada_jefe' || r.estado === 'pendiente_envio');
    }
    return requests.filter(r => r.estado === chiefFilter);
  }, [requests, chiefFilter]);

  const visiblePublishedItineraries = useMemo(() => {
    let list = [...publishedItineraries];
    if (publishedScope === 'mios') {
      list = list.filter(
        it => it.instructor_id === currentUser.id || it.estudiante_id === currentUser.id
      );
    }
    if (selectedPublishedDate) {
      list = list.filter(it => it.fecha === selectedPublishedDate);
    }
    return list;
  }, [publishedItineraries, publishedScope, selectedPublishedDate, currentUser.id]);

  // Acceso exclusivo para Dirección, Instructor en Jefe, Instructores y Estudiantes
  if (!isAllowedRole) {
    return (
      <div className="bg-white dark:bg-slate-900 p-8 rounded-xl border border-slate-200 dark:border-slate-800 text-center max-w-lg mx-auto my-12 space-y-4">
        <div className="w-12 h-12 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-600 dark:text-rose-400 flex items-center justify-center mx-auto">
          <ShieldAlert className="w-6 h-6" />
        </div>
        <h3 className="text-base font-semibold text-slate-900 dark:text-white">
          Acceso Exclusivo para Dirección, Instructores y Estudiantes
        </h3>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Encabezado Principal */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-xl font-semibold text-slate-900 dark:text-white tracking-tight">
            {canManageAcceptedFlights
              ? 'Solicitudes de Vuelo y Gestión de Vuelos'
              : isInstructor
              ? 'Solicitudes de Vuelo e Itinerario Oficial'
              : 'Itinerario Diario Oficial'}
          </h1>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {canManageAcceptedFlights && (
            <select
              value={scheduleStatus?.es_hora_simulada && scheduleStatus.hora_simulada ? scheduleStatus.hora_simulada : 'real'}
              onChange={(e) => handleSimulatedClockChange(e.target.value)}
              disabled={actionBusy}
              className="px-3 py-2 text-xs font-medium bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-200 cursor-pointer"
              title="Permite probar las ventanas horarias de 11am-6pm, 6pm y 8pm"
            >
              <option value="real">Reloj Operativo: Hora Real</option>
              <option value="14:00">Simular 14:00 (Ventana 11 AM–6 PM Abierta)</option>
              <option value="18:05">Simular 18:05 (Corte 6:00 PM Enviado)</option>
              <option value="20:05">Simular 20:05 (Corte 8:00 PM Publicado)</option>
            </select>
          )}

          <button
            type="button"
            onClick={loadData}
            disabled={loading || actionBusy}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700 rounded-lg transition-colors cursor-pointer whitespace-nowrap"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Actualizar</span>
          </button>
        </div>
      </div>

      {/* Línea de Cortes Horarios del Día */}
      {scheduleStatus && (
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4 grid grid-cols-1 md:grid-cols-3 gap-4 divide-y md:divide-y-0 md:divide-x divide-slate-200 dark:divide-slate-800">
          <div className="flex items-start justify-between gap-3 pt-1 md:pt-0">
            <div>
              <div className="text-xs text-slate-500 dark:text-slate-400">
                Período de Solicitud
              </div>
              <div className="text-sm font-semibold text-slate-900 dark:text-white font-mono tabular-nums mt-0.5">
                11:00 AM – 6:00 PM
              </div>
              <div className={`text-xs font-medium mt-1 ${scheduleStatus.ventana_abierta ? 'text-emerald-700 dark:text-emerald-400' : 'text-amber-700 dark:text-amber-400'}`}>
                {scheduleStatus.ventana_abierta ? 'Abierta' : 'Cerrada'}
              </div>
            </div>
            <Clock className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
          </div>

          <div className="flex items-start justify-between gap-3 pt-3 md:pt-0 md:pl-4">
            <div>
              <div className="text-xs text-slate-500 dark:text-slate-400">
                Envío a Instructor en Jefe
              </div>
              <div className="text-sm font-semibold text-slate-900 dark:text-white font-mono tabular-nums mt-0.5">
                6:00 PM · {scheduleStatus.fecha_ciclo}
              </div>
              <div className={`text-xs font-medium mt-1 ${scheduleStatus.corte_6pm_ejecutado ? 'text-emerald-700 dark:text-emerald-400' : 'text-slate-600 dark:text-slate-400'}`}>
                {scheduleStatus.corte_6pm_ejecutado ? 'Enviado' : 'Pendiente'}
              </div>
            </div>
            <Send className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
          </div>

          <div className="flex items-start justify-between gap-3 pt-3 md:pt-0 md:pl-4">
            <div>
              <div className="text-xs text-slate-500 dark:text-slate-400">
                Publicación Oficial
              </div>
              <div className="text-sm font-semibold text-slate-900 dark:text-white font-mono tabular-nums mt-0.5">
                8:00 PM · {scheduleStatus.hora_actual}
              </div>
              <div className={`text-xs font-medium mt-1 ${scheduleStatus.corte_8pm_ejecutado ? 'text-indigo-700 dark:text-indigo-400' : 'text-slate-600 dark:text-slate-400'}`}>
                {scheduleStatus.corte_8pm_ejecutado ? 'Publicado' : 'Pendiente'}
              </div>
            </div>
            <Calendar className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
          </div>
        </div>
      )}

      {/* Mensajes de retroalimentación */}
      {feedback && (
        <div
          className={`p-3.5 rounded-xl border text-xs flex items-center gap-2.5 ${
            feedback.type === 'success'
              ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300'
              : 'bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-300'
          }`}
        >
          {feedback.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 shrink-0" />
          ) : (
            <AlertTriangle className="w-4 h-4 shrink-0" />
          )}
          <span>{feedback.text}</span>
        </div>
      )}

      {/* SECCIÓN 1: FORMULARIO DE SOLICITUD DE VUELO (11 AM - 6 PM PARA INSTRUCTORES; SIN BLOQUEO PARA DIRECTOR E INSTRUCTOR EN JEFE) */}
      {(isInstructor || canBypassTimeLock) && (
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-5 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 dark:border-slate-800 pb-3">
            <h2 className="text-base font-semibold text-slate-900 dark:text-white">
              Nueva Solicitud de Vuelo
            </h2>
            <div className="text-xs font-mono tabular-nums text-slate-600 dark:text-slate-300 whitespace-nowrap">
              {canBypassTimeLock
                ? 'Sin bloqueo horario'
                : scheduleStatus?.ventana_abierta
                ? '11:00–18:00 · Abierto'
                : '11:00–18:00 · Cerrado'}
            </div>
          </div>

          {!canBypassTimeLock && !scheduleStatus?.ventana_abierta && (
            <div className="p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg text-xs text-amber-900 dark:text-amber-300 flex items-center gap-2.5">
              <Lock className="w-4 h-4 shrink-0" />
              <span>
                Horario de solicitudes: 11:00 AM – 6:00 PM (Hora actual: <strong className="font-mono tabular-nums">{scheduleStatus?.hora_actual || '--:--'}</strong>)
              </span>
            </div>
          )}

          <form onSubmit={handleSubmitRequest} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
            {canBypassTimeLock && (
              <div>
                <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Instructor Asignado *
                </label>
                <select
                  value={selectedInstructorId}
                  onChange={(e) => setSelectedInstructorId(e.target.value)}
                  disabled={actionBusy}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 disabled:opacity-60"
                  required
                >
                  {instructorsList.map(inst => (
                    <option key={inst.id} value={inst.id}>
                      {inst.nombre}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div>
              <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                Estudiante Piloto *
              </label>
              <select
                value={estudianteId}
                onChange={(e) => setEstudianteId(e.target.value)}
                disabled={isRequestFormDisabled}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 disabled:opacity-60"
                required
              >
                {studentsList.map(st => {
                  const stElig = eligibilityMap[st.id];
                  const blocked = stElig && !stElig.eligible;
                  return (
                    <option key={st.id} value={st.id}>
                      {st.nombre}{blocked ? (stElig.hasZeroOrNegative ? ` — Sin saldo (Mín. $${minBalanceRequired.toFixed(2)})` : ` — Saldo < $${minBalanceRequired.toFixed(2)}`) : ''}
                    </option>
                  );
                })}
              </select>
            </div>

            <div>
              <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                Aeronave Solicitada *
              </label>
              <select
                value={avionMatricula}
                onChange={(e) => setAvionMatricula(e.target.value)}
                disabled={isRequestFormDisabled}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg font-mono text-slate-900 dark:text-slate-100 disabled:opacity-60"
                required
              >
                {fleetList.map(mat => {
                  const rec = aircraftRecords.find(a => a.matricula === mat);
                  const blocked = rec && (rec.bloqueo_despacho || rec.estado_aeronavegabilidad === 'aog_bloqueado' || rec.estado_aeronavegabilidad === 'en_mantenimiento');
                  return (
                    <option key={mat} value={mat} disabled={Boolean(blocked)}>
                      {mat} {blocked ? '(En Taller / Bloqueada)' : ''}
                    </option>
                  );
                })}
              </select>
            </div>

            <div>
              <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                Fecha del Vuelo *
              </label>
              <input
                type="date"
                value={fechaVuelo}
                onChange={(e) => setFechaVuelo(e.target.value)}
                disabled={isRequestFormDisabled}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg font-mono tabular-nums text-slate-900 dark:text-slate-100 disabled:opacity-60"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Inicio *
                </label>
                <input
                  type="time"
                  value={horaInicio}
                  onChange={(e) => setHoraInicio(e.target.value)}
                  disabled={isRequestFormDisabled}
                  className="w-full px-2.5 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg font-mono tabular-nums text-slate-900 dark:text-slate-100 disabled:opacity-60"
                  required
                />
              </div>
              <div>
                <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Fin ({computedDuration}h) *
                </label>
                <input
                  type="time"
                  value={horaFin}
                  onChange={(e) => setHoraFin(e.target.value)}
                  disabled={isRequestFormDisabled}
                  className="w-full px-2.5 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg font-mono tabular-nums text-slate-900 dark:text-slate-100 disabled:opacity-60"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                Ruta
              </label>
              <input
                type="text"
                value={ruta}
                onChange={(e) => setRuta(e.target.value)}
                disabled={isRequestFormDisabled}
                placeholder="MPMG - MPDA"
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 disabled:opacity-60"
              />
            </div>

            <div className={canBypassTimeLock ? 'lg:col-span-1' : 'lg:col-span-2'}>
              <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                Misión / Lección *
              </label>
              <input
                type="text"
                value={mision}
                onChange={(e) => setMision(e.target.value)}
                disabled={isRequestFormDisabled}
                placeholder="Ej: Maniobras de precisión y patrón de tráfico"
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 disabled:opacity-60"
                required
              />
            </div>

            <div>
              <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                Observaciones
              </label>
              <input
                type="text"
                value={notasInstructor}
                onChange={(e) => setNotasInstructor(e.target.value)}
                disabled={isRequestFormDisabled}
                placeholder="Notas para Jefe de Pilotos"
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 disabled:opacity-60"
              />
            </div>

            {selectedStudentEligibility && (
              <div className="sm:col-span-2 lg:col-span-4">
                {!selectedStudentEligibility.eligible ? (
                  <div className="p-3 bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800 rounded-lg text-xs text-rose-800 dark:text-rose-300 flex items-start gap-2.5">
                    <ShieldAlert className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
                    <div>
                      <strong className="block font-semibold">
                        {selectedStudentEligibility.hasZeroOrNegative
                          ? 'Estudiante sin saldo disponible — Asignación de vuelo bloqueada'
                          : 'Saldo insuficiente — Asignación de vuelo bloqueada'}
                      </strong>
                      <span>
                        No se pueden asignar ni solicitar vuelos hasta que Contabilidad valide un saldo mínimo de ${minBalanceRequired.toFixed(2)} USD en la cuenta del estudiante.
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="px-3 py-2 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 rounded-lg text-xs text-emerald-800 dark:text-emerald-300 flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                    <span>
                      Estudiante habilitado para asignación de vuelo (cumple con el mínimo operativo requerido de ${minBalanceRequired.toFixed(2)} USD).
                    </span>
                  </div>
                )}
              </div>
            )}

            <div className="sm:col-span-2 lg:col-span-4 flex justify-end pt-1">
              <button
                type="submit"
                disabled={isRequestFormDisabled || isSelectedStudentBlocked}
                className="inline-flex items-center gap-2 px-4 py-2 bg-slate-900 dark:bg-sky-600 hover:bg-slate-800 dark:hover:bg-sky-500 text-white text-xs font-semibold rounded-lg transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Enviar Solicitud de Vuelo</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* SECCIÓN 2: BANDEJA DE DECISIÓN (DIRECTOR / INSTRUCTOR EN JEFE) O HISTORIAL DEL INSTRUCTOR */}
      {(canManageAcceptedFlights || isInstructor) && (
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-5 space-y-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-800 pb-3">
            <h2 className="text-base font-semibold text-slate-900 dark:text-white">
              {canManageAcceptedFlights
                ? 'Solicitudes y Vuelos Aceptados'
                : 'Mis Solicitudes de Vuelo'}
            </h2>

            {canManageAcceptedFlights && (
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={handleManualSixPmBatch}
                  disabled={actionBusy}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 border border-slate-300 dark:border-slate-700 rounded-lg cursor-pointer whitespace-nowrap"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Ejecutar Corte 6:00 PM</span>
                </button>
                <button
                  type="button"
                  onClick={handleManualEightPmPublish}
                  disabled={actionBusy}
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold bg-slate-900 dark:bg-sky-600 hover:bg-slate-800 dark:hover:bg-sky-500 text-white rounded-lg cursor-pointer whitespace-nowrap"
                >
                  <Calendar className="w-3.5 h-3.5" />
                  <span>Publicar Itinerario 8:00 PM</span>
                </button>
              </div>
            )}
          </div>

          {canManageAcceptedFlights && (
            <div className="flex flex-wrap items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-lg w-fit">
              {[
                { id: 'pendientes_decision', label: 'Por Decidir' },
                { id: 'todas', label: 'Todas' },
                { id: 'aprobada', label: 'Aprobadas' },
                { id: 'rechazada', label: 'Rechazadas' },
                { id: 'publicada', label: 'Publicadas 8 PM' }
              ].map(tab => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setChiefFilter(tab.id as any)}
                  className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors cursor-pointer whitespace-nowrap ${
                    chiefFilter === tab.id
                      ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          )}

          {loading ? (
            <div className="py-10 text-center text-xs text-slate-500">Cargando solicitudes...</div>
          ) : (canManageAcceptedFlights ? chiefFilteredRequests : requests).length === 0 ? (
            <div className="py-10 text-center text-xs text-slate-500 dark:text-slate-400 border border-dashed border-slate-200 dark:border-slate-800 rounded-lg">
              No hay solicitudes registradas para este filtro.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400">
                    <th className="py-2.5 px-3 font-medium">Fecha / Hora Vuelo</th>
                    <th className="py-2.5 px-3 font-medium">Aeronave</th>
                    <th className="py-2.5 px-3 font-medium">Instructor Solicitante</th>
                    <th className="py-2.5 px-3 font-medium">Estudiante</th>
                    <th className="py-2.5 px-3 font-medium">Misión & Ruta</th>
                    <th className="py-2.5 px-3 font-medium">Estado</th>
                    {canManageAcceptedFlights && <th className="py-2.5 px-3 font-medium text-right">Acciones / Decisión</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                  {(canManageAcceptedFlights ? chiefFilteredRequests : requests).map(req => {
                    const st = getStatusLabel(req.estado);
                    const canDecide = canManageAcceptedFlights && req.estado !== 'publicada';
                    const isAcceptedOrPublished = req.estado === 'aprobada' || req.estado === 'publicada';
                    return (
                      <tr key={req.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                        <td className="py-2.5 px-3 font-mono tabular-nums whitespace-nowrap">
                          <div className="font-semibold text-slate-900 dark:text-white">{req.fecha_vuelo}</div>
                          <div className="text-[11px] text-slate-500">
                            {req.hora_inicio} – {req.hora_fin} ({req.duracion_horas}h)
                          </div>
                        </td>
                        <td className="py-2.5 px-3 font-mono font-semibold text-slate-800 dark:text-slate-200 whitespace-nowrap">
                          {req.avion_matricula}
                        </td>
                        <td className="py-2.5 px-3 text-slate-800 dark:text-slate-200">
                          {req.instructor_nombre}
                        </td>
                        <td className="py-2.5 px-3 text-slate-800 dark:text-slate-200">
                          <div>{req.estudiante_nombre}</div>
                          {(() => {
                            const reqElig = eligibilityMap[req.estudiante_id];
                            if (reqElig && !reqElig.eligible) {
                              return (
                                <div className="text-[10px] font-semibold text-rose-600 dark:text-rose-400 mt-0.5">
                                  {reqElig.hasZeroOrNegative
                                    ? `Sin saldo (Mín. $${minBalanceRequired.toFixed(2)})`
                                    : `Saldo < $${minBalanceRequired.toFixed(2)} USD`}
                                </div>
                              );
                            }
                            return null;
                          })()}
                        </td>
                        <td className="py-2.5 px-3 max-w-xs">
                          <div className="text-slate-900 dark:text-white font-medium truncate" title={req.mision}>
                            {req.mision}
                          </div>
                          <div className="text-[11px] text-slate-500 truncate">
                            {req.ruta || 'MPMG - MPMG'}
                            {req.motivo_rechazo ? ` · Motivo: ${req.motivo_rechazo}` : ''}
                          </div>
                        </td>
                        <td className="py-2.5 px-3 whitespace-nowrap">
                          <span className={`font-semibold ${st.cls}`}>{st.text}</span>
                        </td>
                        {canManageAcceptedFlights && (
                          <td className="py-2.5 px-3 text-right whitespace-nowrap">
                            <div className="inline-flex items-center gap-1.5">
                              {canDecide && (() => {
                                const reqElig = eligibilityMap[req.estudiante_id];
                                const blockedStudent = Boolean(reqElig && !reqElig.eligible);
                                return (
                                  <>
                                    <button
                                      type="button"
                                      disabled={actionBusy || req.estado === 'aprobada' || blockedStudent}
                                      onClick={() => handleDecision(req, 'aprobada')}
                                      title={blockedStudent ? `Bloqueado: requiere saldo mínimo de $${minBalanceRequired.toFixed(2)} USD` : 'Aprobar solicitud'}
                                      className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold bg-emerald-600 hover:bg-emerald-700 text-white rounded-md cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                                    >
                                      <Check className="w-3 h-3" />
                                      <span>Aprobar</span>
                                    </button>
                                    <button
                                      type="button"
                                      disabled={actionBusy || req.estado === 'rechazada'}
                                      onClick={() => {
                                        setRejectingRequest(req);
                                        setRejectReason('');
                                      }}
                                      className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold bg-rose-600 hover:bg-rose-700 text-white rounded-md cursor-pointer disabled:opacity-40"
                                    >
                                      <X className="w-3 h-3" />
                                      <span>Rechazar</span>
                                    </button>
                                  </>
                                );
                              })()}
                              <button
                                type="button"
                                disabled={actionBusy}
                                onClick={() =>
                                  setEditingTarget({
                                    kind: 'request',
                                    id: req.id,
                                    instructor_id: req.instructor_id,
                                    estudiante_id: req.estudiante_id,
                                    fecha: req.fecha_vuelo,
                                    hora_inicio: req.hora_inicio,
                                    hora_fin: req.hora_fin,
                                    avion_matricula: req.avion_matricula,
                                    ruta: req.ruta || 'MPMG - MPMG',
                                    mision: req.mision,
                                    notas: req.notas_instructor || ''
                                  })
                                }
                                className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold bg-sky-600 hover:bg-sky-700 text-white rounded-md cursor-pointer disabled:opacity-40"
                                title={isAcceptedOrPublished ? 'Editar vuelo aceptado' : 'Editar solicitud antes de aprobar'}
                              >
                                <Pencil className="w-3 h-3" />
                                <span>Editar</span>
                              </button>
                              {isAcceptedOrPublished && (
                                <button
                                  type="button"
                                  disabled={actionBusy}
                                  onClick={() =>
                                    setDeletingTarget({
                                      kind: 'request',
                                      id: req.id,
                                      label: `${req.avion_matricula} · ${req.fecha_vuelo} (${req.hora_inicio}–${req.hora_fin}) con ${req.estudiante_nombre}`
                                    })
                                  }
                                  className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold bg-slate-700 hover:bg-rose-700 text-white rounded-md cursor-pointer disabled:opacity-40"
                                  title="Eliminar vuelo aceptado"
                                >
                                  <Trash2 className="w-3 h-3" />
                                  <span>Eliminar</span>
                                </button>
                              )}
                            </div>
                          </td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* SECCIÓN 3: ITINERARIO OFICIAL PUBLICADO A LAS 8:00 PM (SOLO LECTURA PARA INSTRUCTORES Y ESTUDIANTES) */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-5 space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <Eye className="w-4 h-4 text-slate-500" />
            <h2 className="text-base font-semibold text-slate-900 dark:text-white">
              Itinerario Oficial Publicado (8:00 PM)
            </h2>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-lg">
              <button
                type="button"
                onClick={() => setPublishedScope('todos')}
                className={`px-3 py-1 text-xs font-medium rounded-md cursor-pointer whitespace-nowrap ${
                  publishedScope === 'todos'
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400'
                }`}
              >
                Todos los Vuelos
              </button>
              <button
                type="button"
                onClick={() => setPublishedScope('mios')}
                className={`px-3 py-1 text-xs font-medium rounded-md cursor-pointer whitespace-nowrap ${
                  publishedScope === 'mios'
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400'
                }`}
              >
                Mis Vuelos
              </button>
            </div>

            <input
              type="date"
              value={selectedPublishedDate}
              onChange={(e) => setSelectedPublishedDate(e.target.value)}
              className="px-2.5 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg font-mono tabular-nums text-slate-800 dark:text-slate-200"
            />
            {selectedPublishedDate && (
              <button
                type="button"
                onClick={() => setSelectedPublishedDate('')}
                className="px-2.5 py-1.5 text-xs text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg cursor-pointer"
              >
                Limpiar fecha
              </button>
            )}
          </div>
        </div>

        {publications.length > 0 && (
          <div className="text-xs text-slate-500 dark:text-slate-400 flex flex-wrap items-center gap-2">
            <span>Última publicación oficial:</span>
            <span className="font-mono tabular-nums font-medium text-slate-800 dark:text-slate-200">
              {new Date(publications[0].publicado_en).toLocaleString('es-PA')}
            </span>
            <span aria-hidden="true">·</span>
            <span>{publications[0].resumen}</span>
          </div>
        )}

        {visiblePublishedItineraries.length === 0 ? (
          <div className="py-10 text-center text-xs text-slate-500 dark:text-slate-400 border border-dashed border-slate-200 dark:border-slate-800 rounded-lg space-y-1">
            <Plane className="w-5 h-5 mx-auto text-slate-400" />
            <p className="font-medium text-slate-700 dark:text-slate-300">
              Sin vuelos publicados
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400">
                  <th className="py-2.5 px-3 font-medium">Fecha / ETD</th>
                  <th className="py-2.5 px-3 font-medium">Aeronave</th>
                  <th className="py-2.5 px-3 font-medium">Instructor</th>
                  <th className="py-2.5 px-3 font-medium">Estudiante</th>
                  <th className="py-2.5 px-3 font-medium">Ruta & Misión</th>
                  <th className="py-2.5 px-3 font-medium">Aprobación</th>
                  {canManageAcceptedFlights && <th className="py-2.5 px-3 font-medium text-right">Gestión</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                {visiblePublishedItineraries.map(it => (
                  <tr key={it.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                    <td className="py-2.5 px-3 font-mono tabular-nums whitespace-nowrap">
                      <div className="font-semibold text-slate-900 dark:text-white">{it.fecha}</div>
                      <div className="text-[11px] text-slate-500">
                        {it.hora_inicio} – {it.hora_fin} ({it.horas || 1.5}h)
                      </div>
                    </td>
                    <td className="py-2.5 px-3 font-mono font-semibold text-slate-900 dark:text-white whitespace-nowrap">
                      {it.avion_matricula}
                    </td>
                    <td className="py-2.5 px-3 text-slate-800 dark:text-slate-200">
                      {it.instructor_nombre}
                    </td>
                    <td className="py-2.5 px-3 text-slate-800 dark:text-slate-200">
                      {it.estudiante_nombre}
                    </td>
                    <td className="py-2.5 px-3">
                      <div className="font-medium text-slate-900 dark:text-white">{it.mision}</div>
                      <div className="text-[11px] text-slate-500">{it.ruta || 'MPMG - MPMG'}</div>
                    </td>
                    <td className="py-2.5 px-3 whitespace-nowrap">
                      <div className="text-emerald-700 dark:text-emerald-400 font-semibold">
                        Confirmado · Solo Lectura
                      </div>
                      <div className="text-[11px] text-slate-500">
                        {it.aprobado_por_jefe || 'Cap. A. Bustamante'}
                      </div>
                    </td>
                    {canManageAcceptedFlights && (
                      <td className="py-2.5 px-3 text-right whitespace-nowrap">
                        <div className="inline-flex items-center gap-1.5">
                          <button
                            type="button"
                            disabled={actionBusy}
                            onClick={() =>
                              setEditingTarget({
                                kind: 'itinerary',
                                id: it.id,
                                instructor_id: it.instructor_id,
                                estudiante_id: it.estudiante_id,
                                fecha: it.fecha,
                                hora_inicio: it.hora_inicio,
                                hora_fin: it.hora_fin,
                                avion_matricula: it.avion_matricula,
                                ruta: it.ruta || 'MPMG - MPMG',
                                mision: it.mision,
                                notas: it.detalles_evento || ''
                              })
                            }
                            className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold bg-sky-600 hover:bg-sky-700 text-white rounded-md cursor-pointer disabled:opacity-40"
                          >
                            <Pencil className="w-3 h-3" />
                            <span>Editar</span>
                          </button>
                          <button
                            type="button"
                            disabled={actionBusy}
                            onClick={() =>
                              setDeletingTarget({
                                kind: 'itinerary',
                                id: it.id,
                                label: `${it.avion_matricula} · ${it.fecha} (${it.hora_inicio}–${it.hora_fin}) con ${it.estudiante_nombre}`
                              })
                            }
                            className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold bg-slate-700 hover:bg-rose-700 text-white rounded-md cursor-pointer disabled:opacity-40"
                          >
                            <Trash2 className="w-3 h-3" />
                            <span>Eliminar</span>
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* MODAL RECHAZO DE SOLICITUD (INSTRUCTOR EN JEFE / DIRECTOR) */}
      {rejectingRequest && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 rounded-xl max-w-md w-full max-h-[90vh] overflow-y-auto my-auto p-5 border border-slate-200 dark:border-slate-800 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <XCircle className="w-5 h-5 text-rose-600" />
                <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
                  Rechazar Solicitud de Vuelo
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setRejectingRequest(null)}
                className="text-slate-400 hover:text-slate-600 text-lg font-bold cursor-pointer"
              >
                &times;
              </button>
            </div>

            <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-lg text-xs space-y-1 text-slate-700 dark:text-slate-300">
              <div><strong>Instructor:</strong> {rejectingRequest.instructor_nombre}</div>
              <div><strong>Estudiante:</strong> {rejectingRequest.estudiante_nombre}</div>
              <div><strong>Vuelo:</strong> {rejectingRequest.avion_matricula} · {rejectingRequest.fecha_vuelo} ({rejectingRequest.hora_inicio}–{rejectingRequest.hora_fin})</div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Motivo / Observación (opcional)
              </label>
              <textarea
                rows={3}
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="Ej: Prioridad de flota para examen práctico, conflicto de horario..."
                className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-200 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setRejectingRequest(null)}
                className="px-3.5 py-2 text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={actionBusy}
                onClick={() => handleDecision(rejectingRequest, 'rechazada', rejectReason)}
                className="px-4 py-2 text-xs font-semibold bg-rose-600 hover:bg-rose-700 text-white rounded-lg cursor-pointer disabled:opacity-50"
              >
                Confirmar Rechazo
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL EDITAR VUELO ACEPTADO (DIRECTOR / INSTRUCTOR EN JEFE) */}
      {editingTarget && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto">
          <form
            onSubmit={handleSaveEdit}
            className="bg-white dark:bg-slate-900 rounded-xl max-w-lg w-full max-h-[90vh] overflow-y-auto my-auto p-5 border border-slate-200 dark:border-slate-800 shadow-xl space-y-4 text-xs"
          >
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Pencil className="w-4 h-4 text-sky-600" />
                <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
                  {editingTarget.kind === 'request' ? 'Editar Solicitud / Vuelo' : 'Editar Vuelo Aceptado'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setEditingTarget(null)}
                className="text-slate-400 hover:text-slate-600 text-lg font-bold cursor-pointer"
              >
                &times;
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Instructor *
                </label>
                <select
                  value={editingTarget.instructor_id}
                  onChange={(e) => setEditingTarget(prev => (prev ? { ...prev, instructor_id: e.target.value } : prev))}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100"
                  required
                >
                  {instructorsList.map(inst => (
                    <option key={inst.id} value={inst.id}>
                      {inst.nombre}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Estudiante *
                </label>
                <select
                  value={editingTarget.estudiante_id}
                  onChange={(e) => setEditingTarget(prev => (prev ? { ...prev, estudiante_id: e.target.value } : prev))}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100"
                  required
                >
                  {studentsList.map(st => {
                    const stElig = eligibilityMap[st.id];
                    const blocked = stElig && !stElig.eligible;
                    return (
                      <option key={st.id} value={st.id}>
                        {st.nombre}{blocked ? (stElig.hasZeroOrNegative ? ` — Sin saldo (Mín. $${minBalanceRequired.toFixed(2)})` : ` — Saldo < $${minBalanceRequired.toFixed(2)}`) : ''}
                      </option>
                    );
                  })}
                </select>
              </div>

              <div>
                <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Aeronave *
                </label>
                <select
                  value={editingTarget.avion_matricula}
                  onChange={(e) => setEditingTarget(prev => (prev ? { ...prev, avion_matricula: e.target.value } : prev))}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg font-mono text-slate-900 dark:text-slate-100"
                  required
                >
                  {fleetList.map(mat => (
                    <option key={mat} value={mat}>
                      {mat}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Fecha *
                </label>
                <input
                  type="date"
                  value={editingTarget.fecha}
                  onChange={(e) => setEditingTarget(prev => (prev ? { ...prev, fecha: e.target.value } : prev))}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg font-mono text-slate-900 dark:text-slate-100"
                  required
                />
              </div>

              <div>
                <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Hora Inicio *
                </label>
                <input
                  type="time"
                  value={editingTarget.hora_inicio}
                  onChange={(e) => setEditingTarget(prev => (prev ? { ...prev, hora_inicio: e.target.value } : prev))}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg font-mono text-slate-900 dark:text-slate-100"
                  required
                />
              </div>

              <div>
                <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Hora Fin *
                </label>
                <input
                  type="time"
                  value={editingTarget.hora_fin}
                  onChange={(e) => setEditingTarget(prev => (prev ? { ...prev, hora_fin: e.target.value } : prev))}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg font-mono text-slate-900 dark:text-slate-100"
                  required
                />
              </div>

              <div>
                <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Ruta
                </label>
                <input
                  type="text"
                  value={editingTarget.ruta}
                  onChange={(e) => setEditingTarget(prev => (prev ? { ...prev, ruta: e.target.value } : prev))}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100"
                />
              </div>

              <div>
                <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Misión *
                </label>
                <input
                  type="text"
                  value={editingTarget.mision}
                  onChange={(e) => setEditingTarget(prev => (prev ? { ...prev, mision: e.target.value } : prev))}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100"
                  required
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Notas / Detalles
                </label>
                <input
                  type="text"
                  value={editingTarget.notas}
                  onChange={(e) => setEditingTarget(prev => (prev ? { ...prev, notas: e.target.value } : prev))}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100"
                />
              </div>
            </div>

            {(() => {
              const editElig = editingTarget.estudiante_id ? eligibilityMap[editingTarget.estudiante_id] : undefined;
              const isEditBlocked = Boolean(editElig && !editElig.eligible);
              return (
                <>
                  {isEditBlocked && (
                    <div className="p-2.5 bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800 rounded-lg text-rose-800 dark:text-rose-300 flex items-start gap-2">
                      <ShieldAlert className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                      <span>
                        {editElig?.hasZeroOrNegative
                          ? `Estudiante sin saldo disponible. Requiere mínimo $${minBalanceRequired.toFixed(2)} USD para asignación de vuelo.`
                          : `El estudiante no cumple con el saldo mínimo requerido de $${minBalanceRequired.toFixed(2)} USD.`}
                      </span>
                    </div>
                  )}

                  <div className="flex justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
                    <button
                      type="button"
                      onClick={() => setEditingTarget(null)}
                      className="px-3.5 py-2 font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg cursor-pointer"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      disabled={actionBusy || isEditBlocked}
                      className="px-4 py-2 font-semibold bg-sky-600 hover:bg-sky-700 text-white rounded-lg cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Guardar Cambios
                    </button>
                  </div>
                </>
              );
            })()}
          </form>
        </div>
      )}

      {/* MODAL CONFIRMAR ELIMINACIÓN DE VUELO ACEPTADO */}
      {deletingTarget && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 rounded-xl max-w-md w-full p-5 border border-slate-200 dark:border-slate-800 shadow-xl space-y-4 text-xs">
            <div className="flex items-center gap-2 text-rose-600 font-semibold text-sm">
              <Trash2 className="w-4 h-4" />
              <span>Eliminar Vuelo Aceptado</span>
            </div>
            <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
              ¿Confirmas que deseas eliminar permanentemente el vuelo <strong>{deletingTarget.label}</strong>? Se eliminará tanto del registro de solicitudes como del itinerario publicado.
            </p>
            <div className="flex justify-end gap-2 pt-2 border-t border-slate-200 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setDeletingTarget(null)}
                className="px-3.5 py-2 font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={actionBusy}
                onClick={handleConfirmDelete}
                className="px-4 py-2 font-semibold bg-rose-600 hover:bg-rose-700 text-white rounded-lg cursor-pointer disabled:opacity-50"
              >
                Confirmar Eliminación
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
