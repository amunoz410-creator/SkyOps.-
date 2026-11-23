import React, { useState, useEffect } from 'react';
import { User, Itinerary, ItineraryStatus, ItineraryEventType, AircraftMaintenanceRecord, StudentFlightEligibility } from '../types';
import { api } from '../services/api';
import { useLanguage } from '../i18n/LanguageContext';
import {
  syncItineraryToGoogleCalendar,
  deleteItineraryFromGoogleCalendar
} from '../services/googleCalendarService';
import { GoogleCalendarSyncModal } from './GoogleCalendarSyncModal';
import {
  Calendar as CalendarIcon,
  Clock,
  Plane,
  Plus,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  ShieldAlert,
  Search,
  Check,
  X,
  UserX,
  Send,
  Timer,
  ChevronLeft,
  ChevronRight,
  CalendarDays,
  Wrench,
  Gamepad2,
  Coffee,
  ShieldCheck,
  Eye,
  FileText,
  CalendarPlus,
  ExternalLink,
  Pencil,
  Trash2
} from 'lucide-react';

interface ItineraryPlannerProps {
  currentUser: User;
  allUsers: User[];
  onOpenFlightSheet?: (sheetId?: string) => void;
  onRefreshAll?: () => void;
  onNavigateTab?: (tab: string) => void;
}

// Helper para calcular el lunes de la semana
const getMonday = (d: Date): Date => {
  const date = new Date(d);
  const day = date.getDay();
  const diff = date.getDate() - day + (day === 0 ? -6 : 1);
  const mon = new Date(date.setDate(diff));
  mon.setHours(0, 0, 0, 0);
  return mon;
};

export const ItineraryPlanner: React.FC<ItineraryPlannerProps> = ({
  currentUser,
  allUsers,
  onOpenFlightSheet,
  onRefreshAll,
  onNavigateTab
}) => {
  const { t, language } = useLanguage();
  const [itineraries, setItineraries] = useState<Itinerary[]>([]);
  const [aircraftRecords, setAircraftRecords] = useState<AircraftMaintenanceRecord[]>([]);
  const [eligibilityMap, setEligibilityMap] = useState<Record<string, StudentFlightEligibility>>({});
  const [minBalanceRequired, setMinBalanceRequired] = useState<number>(330);
  const [loading, setLoading] = useState<boolean>(true);
  const [releaseProcessingMat, setReleaseProcessingMat] = useState<string | null>(null);
  const [showScheduleModal, setShowScheduleModal] = useState<boolean>(false);
  const [statusFilter, setStatusFilter] = useState<string>('todos');
  const [searchTerm, setSearchTerm] = useState<string>('');

  // Horizontal Calendar State
  const [currentStartDate, setCurrentStartDate] = useState<Date>(() => getMonday(new Date()));
  const [selectedDetailItinerary, setSelectedDetailItinerary] = useState<Itinerary | null>(null);

  // Formulario nuevo itinerario / evento
  const [tipoEvento, setTipoEvento] = useState<ItineraryEventType>('vuelo');
  const [estudianteId, setEstudianteId] = useState<string>('');
  const [instructorId, setInstructorId] = useState<string>('');
  const [avionMatricula, setAvionMatricula] = useState<string>('HP-1822');
  const [avionModelo, setAvionModelo] = useState<string>('Cessna 172SP Skyhawk (G1000)');
  const [fecha, setFecha] = useState<string>(new Date().toISOString().split('T')[0]);
  const [horaInicio, setHoraInicio] = useState<string>('08:00');
  const [horaFin, setHoraFin] = useState<string>('09:30');
  const [ruta, setRuta] = useState<string>('MPMG - MPDA');
  const [picName, setPicName] = useState<string>('A. Muñoz');
  const [duracionHoras, setDuracionHoras] = useState<number>(1.5);
  const [mision, setMision] = useState<string>('Vuelo de Instrucción y Travesía');
  const [detallesEvento, setDetallesEvento] = useState<string>('');

  const [formError, setFormError] = useState<string>('');
  const [formSuccess, setFormSuccess] = useState<string>('');

  // Modal Cancelación con Motivo
  const [cancellingItinerary, setCancellingItinerary] = useState<Itinerary | null>(null);
  const [cancellationReason, setCancellationReason] = useState<string>('');
  const [cancelError, setCancelError] = useState<string>('');

  // Modal No Show
  const [noShowItinerary, setNoShowItinerary] = useState<Itinerary | null>(null);

  // Google Calendar Integration State & Modal
  const [calendarSyncModalOpen, setCalendarSyncModalOpen] = useState<boolean>(false);
  const [calendarTargetItinerary, setCalendarTargetItinerary] = useState<Itinerary | null>(null);
  const [isCalendarSyncing, setIsCalendarSyncing] = useState<boolean>(false);
  const [calendarSyncSuccessMsg, setCalendarSyncSuccessMsg] = useState<string>('');

  // Time ticker for countdown
  const [currentTime, setCurrentTime] = useState<number>(Date.now());

  const isStudent = currentUser.rol === 'estudiante';
  const isInstructor = currentUser.rol === 'instructor';
  const isChiefInstructor = currentUser.rol === 'instructor_en_jefe';
  const isAdmin = currentUser.rol === 'admin';
  const isDirector = currentUser.rol === 'admin' || currentUser.rol === 'escuela';
  const canEditDeleteAccepted = isChiefInstructor || isDirector;
  const isMantenimiento = currentUser.rol === 'mantenimiento';
  const canProgramAssignment = !isStudent && !isInstructor;
  const canViewEightPmSchedule = isStudent || isInstructor || isChiefInstructor || isDirector;

  // Edición y eliminación de vuelos aceptados (Director e Instructor en Jefe)
  const [editingItinerary, setEditingItinerary] = useState<Itinerary | null>(null);
  const [editItinForm, setEditItinForm] = useState({
    instructor_id: '',
    estudiante_id: '',
    fecha: '',
    hora_inicio: '',
    hora_fin: '',
    avion_matricula: '',
    ruta: '',
    mision: '',
    detalles_evento: ''
  });
  const [editItinError, setEditItinError] = useState<string>('');
  const [editItinBusy, setEditItinBusy] = useState<boolean>(false);
  const [deletingItinerary, setDeletingItinerary] = useState<Itinerary | null>(null);
  const [deleteItinBusy, setDeleteItinBusy] = useState<boolean>(false);

  // Modal para Sacar Aeronave de Línea de Vuelo (Taller / OMA)
  const [showGroundModal, setShowGroundModal] = useState<boolean>(false);
  const [groundMatricula, setGroundMatricula] = useState<string>('HP-1822');
  const [groundDate, setGroundDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [groundReason, setGroundReason] = useState<string>('Entrada a Taller Imprevista - Reporte de Discrepancia Técnica / Daño OMA');
  const [groundCancelFlights, setGroundCancelFlights] = useState<boolean>(true);
  const [groundCreateBlock, setGroundCreateBlock] = useState<boolean>(true);
  const [groundProcessing, setGroundProcessing] = useState<boolean>(false);
  const [createMaintSlotOnCancel, setCreateMaintSlotOnCancel] = useState<boolean>(true);

  const isAircraftUnavailable = (ac: AircraftMaintenanceRecord): boolean =>
    Boolean(
      ac.bloqueo_despacho ||
      ac.estado_aeronavegabilidad === 'aog_bloqueado' ||
      ac.estado_aeronavegabilidad === 'en_mantenimiento'
    );

  const getAircraftRecordByMat = (mat?: string): AircraftMaintenanceRecord | undefined => {
    if (!mat) return undefined;
    const upper = mat.trim().toUpperCase();
    return aircraftRecords.find(a => a.matricula.toUpperCase() === upper);
  };

  const unavailableFleet = aircraftRecords.filter(isAircraftUnavailable);

  // Lista de matrículas de la flota escolar y taller
  const fleetMatriculas = Array.from(
    new Set([
      ...aircraftRecords.map(a => a.matricula).filter(Boolean),
      'HP-1450',
      'HP-1588',
      'HP-1822',
      'HP-1799',
      'HP-1721SP',
      ...itineraries.map(i => i.avion_matricula).filter(Boolean)
    ])
  );

  const studentsList = allUsers.filter(u => u.rol === 'estudiante');
  const instructorsList = allUsers.filter(u => u.rol === 'instructor' || u.rol === 'instructor_en_jefe');

  const loadItineraries = async () => {
    setLoading(true);
    try {
      const [list, acList, eligRes] = await Promise.all([
        api.getItineraries(currentUser.rol, currentUser.id),
        api.getAircraftMaintenanceRecords().catch(() => []),
        !isStudent && !isMantenimiento
          ? api.getStudentFlightEligibility().catch(() => ({ minRequired: 330, eligibility: {} as Record<string, StudentFlightEligibility> }))
          : Promise.resolve({ minRequired: 330, eligibility: {} as Record<string, StudentFlightEligibility> })
      ]);
      setItineraries(list);
      setAircraftRecords(acList);
      setMinBalanceRequired(eligRes.minRequired || 330);
      setEligibilityMap(eligRes.eligibility || {});
    } catch (err) {
      console.error('Error al cargar itinerarios:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadItineraries();
    if (studentsList.length > 0 && !estudianteId) {
      const defaultStudent = isStudent ? currentUser : studentsList[0];
      setEstudianteId(defaultStudent.id);
      if (!isStudent) {
        setPicName(defaultStudent.nombre);
      }
    }
    if (instructorsList.length > 0 && !instructorId) {
      setInstructorId((isInstructor || isChiefInstructor) ? currentUser.id : instructorsList[0].id);
    }
  }, [currentUser]);

  // Periodic ticker for live countdowns
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(Date.now());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const handleCreateItinerary = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    setFormSuccess('');

    if (!canProgramAssignment) {
      setFormError('El rol de instructor no tiene permiso para programar asignaciones en Agenda e Itinerarios.');
      return;
    }

    const targetStudent = allUsers.find(u => u.id === estudianteId) || currentUser;
    const targetInstructor = allUsers.find(u => u.id === instructorId) || currentUser;

    if (tipoEvento === 'vuelo' && targetStudent.rol === 'estudiante') {
      const elig = eligibilityMap[targetStudent.id];
      if (elig && !elig.eligible) {
        setFormError(
          elig.hasZeroOrNegative
            ? `Asignación bloqueada: ${targetStudent.nombre} se encuentra sin saldo disponible. Debe contar con un saldo mínimo de $${minBalanceRequired.toFixed(2)} USD para asignarle vuelos.`
            : `Asignación bloqueada: ${targetStudent.nombre} no cumple con el saldo mínimo requerido de $${minBalanceRequired.toFixed(2)} USD para asignación de vuelos.`
        );
        return;
      }
    }

    let initEstado: ItineraryStatus = 'confirmado';
    if (tipoEvento === 'vuelo') {
      initEstado = 'confirmado';
    } else if (tipoEvento === 'mantenimiento') {
      initEstado = 'en_taller';
    } else if (tipoEvento === 'simulador') {
      initEstado = 'completado';
    } else if (tipoEvento === 'reserva') {
      initEstado = 'guardia';
    } else if (tipoEvento === 'dia_libre') {
      initEstado = 'descanso';
    }

    try {
      const createdItinerary = await api.createItinerary({
        estudiante_id: targetStudent.id,
        estudiante_nombre: picName || targetStudent.nombre,
        estudiante_telefono: targetStudent.telefono,
        instructor_id: targetInstructor.id,
        instructor_nombre: targetInstructor.nombre,
        instructor_telefono: targetInstructor.telefono,
        avion_matricula: avionMatricula,
        avion_modelo: avionModelo,
        fecha,
        hora_inicio: horaInicio,
        hora_fin: horaFin,
        mision: mision || (tipoEvento === 'mantenimiento' ? 'Mantenimiento en Taller' : 'Instrucción'),
        estado: initEstado,
        tipo_evento: tipoEvento,
        ruta: tipoEvento === 'vuelo' ? ruta : undefined,
        equipo: tipoEvento === 'vuelo' || tipoEvento === 'mantenimiento' ? (avionModelo.includes('PA-28') ? 'PA-28' : avionModelo.includes('PA-34') ? 'PA-34' : avionModelo.includes('PA-44') ? 'PA-44' : avionModelo) : tipoEvento === 'simulador' ? 'Redbird FMX' : undefined,
        etd: tipoEvento === 'vuelo' ? `${horaInicio} Z` : horaInicio,
        pic: picName || targetStudent.nombre,
        horas: duracionHoras,
        detalles_evento: detallesEvento.trim() || (tipoEvento === 'mantenimiento' ? 'Inspección / Trabajo en Taller' : undefined)
      });

      setFormSuccess('¡Programación asignada exitosamente en el panel operacional!');
      setShowScheduleModal(false);
      loadItineraries();
      if (onRefreshAll) onRefreshAll();

      // DISPARADOR GOOGLE CALENDAR: Abrir diálogo de confirmación para sincronización con calendarios personales
      setCalendarTargetItinerary(createdItinerary);
      setCalendarSyncModalOpen(true);

      setTimeout(() => setFormSuccess(''), 5000);
    } catch (err: any) {
      setFormError(err.message || 'Error al agendar itinerario');
    }
  };

  const handleExecuteCalendarSync = async () => {
    if (!calendarTargetItinerary) return;
    setIsCalendarSyncing(true);
    try {
      const studentUser = allUsers.find(u => u.id === calendarTargetItinerary.estudiante_id);
      const instructorUser = allUsers.find(u => u.id === calendarTargetItinerary.instructor_id);

      const result = await syncItineraryToGoogleCalendar(calendarTargetItinerary, studentUser, instructorUser);

      if (result.success && result.eventId) {
        await api.updateItineraryGoogleCalendarInfo(
          calendarTargetItinerary.id,
          result.eventId,
          result.htmlLink
        );
        setCalendarSyncSuccessMsg(`¡Itinerario sincronizado con éxito en Google Calendar!`);
        setCalendarSyncModalOpen(false);
        setCalendarTargetItinerary(null);
        loadItineraries();
        setTimeout(() => setCalendarSyncSuccessMsg(''), 6000);
      } else {
        alert(`Aviso de Sincronización: ${result.error || 'No se pudo completar la sincronización'}`);
        setCalendarSyncModalOpen(false);
      }
    } catch (calErr: any) {
      console.error('Error al sincronizar con Google Calendar:', calErr);
      alert('Error en Google Calendar: ' + (calErr.message || 'Error de conexión'));
      setCalendarSyncModalOpen(false);
    } finally {
      setIsCalendarSyncing(false);
    }
  };

  const handleAcceptFlight = async (itinerary: Itinerary) => {
    try {
      await api.acceptItinerary(itinerary.id, currentUser.nombre);
      setFormSuccess(`¡Vuelo confirmado con éxito para ${itinerary.estudiante_nombre}! Notificación enviada.`);
      loadItineraries();
      if (onRefreshAll) onRefreshAll();
      setTimeout(() => setFormSuccess(''), 5000);
    } catch (err: any) {
      alert('Error al confirmar vuelo: ' + err.message);
    }
  };

  const handleConfirmCancellation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cancellingItinerary) return;
    if (!cancellationReason.trim()) {
      setCancelError(t('reasonRequiredAlert'));
      return;
    }

    try {
      const cancelAuthor = isMantenimiento
        ? `${currentUser.nombre} (Taller OMA)`
        : currentUser.nombre;

      await api.cancelItinerary(cancellingItinerary.id, cancellationReason.trim(), cancelAuthor);

      // Si se solicitó registrar bloqueo de mantenimiento en taller para esta aeronave y horario
      if (createMaintSlotOnCancel && cancellingItinerary.avion_matricula) {
        try {
          await api.createItinerary({
            estudiante_id: currentUser.id,
            estudiante_nombre: 'Taller Aeronáutico (OMA)',
            estudiante_telefono: currentUser.telefono || '+507 6000-0000',
            instructor_id: currentUser.id,
            instructor_nombre: currentUser.nombre,
            instructor_telefono: currentUser.telefono || '+507 6000-0000',
            avion_matricula: cancellingItinerary.avion_matricula,
            avion_modelo: cancellingItinerary.avion_modelo || getAircraftRecordByMat(cancellingItinerary.avion_matricula)?.modelo || 'Cessna 172 Skyhawk',
            fecha: cancellingItinerary.fecha,
            hora_inicio: cancellingItinerary.hora_inicio,
            hora_fin: cancellingItinerary.hora_fin,
            mision: `Mantenimiento Imprevisto OMA`,
            detalles_evento: `FUERA DE LÍNEA: ${cancellationReason.trim()}`,
            estado: 'en_taller',
            tipo_evento: 'mantenimiento',
            equipo: cancellingItinerary.avion_matricula
          });
        } catch (mErr) {
          console.warn('No se pudo crear automáticamente el bloque de taller:', mErr);
        }

        if (isMantenimiento || /taller|mantenimiento|aog|falla|da[nñ]o|discrepancia/i.test(cancellationReason)) {
          try {
            await api.toggleAircraftGroundLock(cancellingItinerary.avion_matricula, {
              locked: true,
              reason: `Retiro de Línea en Dispatch: ${cancellationReason.trim()}`,
              authorizedBy: currentUser.nombre,
              licenciaTMA: currentUser.licencia || 'AAC-TMA-04521',
              ubicacion_hangar: 'Hangar OMA - Entrada Imprevista'
            });
          } catch (lockErr) {
            console.warn('No se pudo sincronizar el bloqueo de aeronave en Taller:', lockErr);
          }
        }
      }

      setCancellingItinerary(null);
      setCancellationReason('');
      setCancelError('');
      setFormSuccess(
        isMantenimiento || cancellationReason.toLowerCase().includes('taller')
          ? `¡Vuelo retirado de línea de vuelo y aeronave puesta en mantenimiento OMA con éxito!`
          : t('flightCancelledSuccess')
      );
      await loadItineraries();
      if (onRefreshAll) onRefreshAll();
      setTimeout(() => setFormSuccess(''), 5000);
    } catch (err: any) {
      setCancelError(err.message || 'Error al cancelar vuelo');
    }
  };

  // Función dedicada para retirar aeronave de línea de vuelo (AOG / Entrada Imprevista a Taller OMA)
  const handleGroundAircraft = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!groundMatricula || !groundReason.trim()) return;
    setGroundProcessing(true);
    setFormError('');
    try {
      let cancelledCount = 0;
      if (groundCancelFlights) {
        // Encontrar vuelos activos de esta aeronave en la fecha
        const affectedFlights = itineraries.filter(itin =>
          itin.avion_matricula === groundMatricula &&
          itin.fecha === groundDate &&
          itin.estado !== 'cancelado' &&
          itin.estado !== 'no_show' &&
          itin.tipo_evento !== 'mantenimiento'
        );

        for (const fl of affectedFlights) {
          await api.cancelItinerary(
            fl.id,
            `Retiro de Línea por Taller OMA: ${groundReason.trim()}`,
            `${currentUser.nombre} (${currentUser.rol === 'mantenimiento' ? 'Taller OMA' : 'Mantenimiento'})`
          );
          cancelledCount++;
        }
      }

      await api.toggleAircraftGroundLock(groundMatricula, {
        locked: true,
        reason: groundReason.trim(),
        authorizedBy: currentUser.nombre,
        licenciaTMA: currentUser.licencia || 'AAC-TMA-04521',
        ubicacion_hangar: 'Hangar OMA - Entrada Imprevista'
      });

      if (groundCreateBlock) {
        const targetAc = getAircraftRecordByMat(groundMatricula);
        await api.createItinerary({
          estudiante_id: currentUser.id,
          estudiante_nombre: 'Taller Aeronáutico (OMA)',
          estudiante_telefono: currentUser.telefono || '+507 6000-0000',
          instructor_id: currentUser.id,
          instructor_nombre: currentUser.nombre,
          instructor_telefono: currentUser.telefono || '+507 6000-0000',
          avion_matricula: groundMatricula,
          avion_modelo: targetAc?.modelo || (groundMatricula.includes('1799') ? 'Piper PA-28-181 Archer III' : 'Cessna 172 Skyhawk'),
          fecha: groundDate,
          hora_inicio: '08:00',
          hora_fin: '18:00',
          mision: `MANTENIMIENTO IMPREVISTO OMA`,
          detalles_evento: `AERONAVE FUERA DE LÍNEA: ${groundReason.trim()}`,
          estado: 'en_taller',
          tipo_evento: 'mantenimiento',
          equipo: groundMatricula
        });
      }

      setFormSuccess(`¡Aeronave ${groundMatricula} inmovilizada y retirada de línea de vuelo con éxito! ${cancelledCount > 0 ? `${cancelledCount} vuelo(s) cancelados en la fecha.` : 'Sin vuelos activos previos en la fecha.'}`);
      setShowGroundModal(false);
      await loadItineraries();
      if (onRefreshAll) onRefreshAll();
      setTimeout(() => setFormSuccess(''), 6000);
    } catch (err: any) {
      setFormError(err.message || 'Error al sacar aeronave de línea');
    } finally {
      setGroundProcessing(false);
    }
  };

  // Liberación y Retorno al Servicio (RTS) desde Dispatch / Itinerario Semanal
  const handleReleaseAircraftFromDispatch = async (matricula: string, itinerary?: Itinerary) => {
    if (!matricula) return;
    setReleaseProcessingMat(matricula);
    setFormError('');
    try {
      await api.toggleAircraftGroundLock(matricula, {
        locked: false,
        reason: 'Liberación y Retorno al Servicio desde Dispatch Semanal OMA',
        authorizedBy: currentUser.nombre,
        licenciaTMA: currentUser.licencia || 'AAC-TMA-04521',
        resetOverdueCounters: true,
        resolveAogSquawks: true
      });
      if (itinerary && itinerary.estado !== 'completado' && itinerary.estado !== 'cancelado') {
        await api.updateItineraryStatus(itinerary.id, 'completado');
      }
      setFormSuccess(`¡Aeronave ${matricula} liberada y retornada al servicio operacional (RTS)!`);
      setSelectedDetailItinerary(null);
      await loadItineraries();
      if (onRefreshAll) onRefreshAll();
      setTimeout(() => setFormSuccess(''), 6000);
    } catch (err: any) {
      setFormError(err.message || `Error al liberar la aeronave ${matricula}`);
    } finally {
      setReleaseProcessingMat(null);
    }
  };

  const handleConfirmNoShow = async () => {
    if (!noShowItinerary) return;
    try {
      await api.markNoShow(noShowItinerary.id, currentUser.nombre);
      setNoShowItinerary(null);
      setFormSuccess(t('noShowRecorded'));
      loadItineraries();
      if (onRefreshAll) onRefreshAll();
      setTimeout(() => setFormSuccess(''), 5000);
    } catch (err: any) {
      alert('Error al asentar No Show: ' + err.message);
    }
  };

  // Filtrado de itinerarios (el itinerario publicado 8 PM solo es visible para instructores y estudiantes)
  const filteredItineraries = itineraries.filter(itin => {
    if (itin.publicado_8pm && !canViewEightPmSchedule) return false;
    const q = searchTerm.toLowerCase();
    const matchesSearch =
      (itin.estudiante_nombre || '').toLowerCase().includes(q) ||
      (itin.instructor_nombre || '').toLowerCase().includes(q) ||
      (itin.avion_matricula || '').toLowerCase().includes(q) ||
      (itin.ruta && itin.ruta.toLowerCase().includes(q)) ||
      (itin.mision || '').toLowerCase().includes(q);

    if (!matchesSearch) return false;

    if (statusFilter === 'todos') return true;
    if (statusFilter === 'pendientes') return itin.estado === 'pendiente_confirmacion';
    if (statusFilter === 'confirmados') return itin.estado === 'confirmado' || itin.estado === 'programado';
    if (statusFilter === 'cancelados') return itin.estado === 'cancelado';
    if (statusFilter === 'no_show') return itin.estado === 'no_show';
    return true;
  });

  // Navegación de Fechas (7 días - Semana Completa de Lunes a Domingo)
  const handlePrevWeek = () => {
    const prev = new Date(currentStartDate);
    prev.setDate(prev.getDate() - 7);
    setCurrentStartDate(prev);
  };

  const handleNextWeek = () => {
    const next = new Date(currentStartDate);
    next.setDate(next.getDate() + 7);
    setCurrentStartDate(next);
  };

  const handleGoToday = () => {
    setCurrentStartDate(getMonday(new Date()));
  };

  const handleDateJump = (dateStr: string) => {
    if (!dateStr) return;
    const [y, m, d] = dateStr.split('-').map(Number);
    const chosen = new Date(y, m - 1, d);
    setCurrentStartDate(getMonday(chosen));
  };

  const openScheduleForDate = (dateStr: string) => {
    if (!canProgramAssignment) return;
    setFecha(dateStr);
    setFormError('');
    setShowScheduleModal(true);
  };

  // Construcción de las 7 columnas de la semana (Lunes a Domingo)
  const daysOfWeek = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
  
  const weekDays = Array.from({ length: 7 }).map((_, idx) => {
    const dayDate = new Date(currentStartDate);
    dayDate.setDate(currentStartDate.getDate() + idx);

    const yyyy = dayDate.getFullYear();
    const mm = String(dayDate.getMonth() + 1).padStart(2, '0');
    const dd = String(dayDate.getDate()).padStart(2, '0');
    const dateStr = `${yyyy}-${mm}-${dd}`;
    const displayDate = `${dd}/${mm}`;

    const todayStr = new Date().toISOString().split('T')[0];
    const isToday = dateStr === todayStr;

    // Vuelos / Eventos asignados a esta fecha exacta
    const dayEvents = filteredItineraries
      .filter(itin => itin.fecha === dateStr)
      .sort((a, b) => a.hora_inicio.localeCompare(b.hora_inicio));

    return {
      dateStr,
      dayDate,
      dayName: daysOfWeek[idx],
      displayDate,
      isToday,
      events: dayEvents
    };
  });

  // Calcular número de filas necesarias (mínimo 2 filas como en el diseño)
  const maxEventsInAnyDay = Math.max(2, ...weekDays.map(d => d.events.length));
  const rowIndices = Array.from({ length: maxEventsInAnyDay }, (_, i) => i);

  const startDay = weekDays[0];
  const endDay = weekDays[6];
  const weekRangeTitle = `${startDay.displayDate} - ${endDay.displayDate} ${startDay.dayDate.getFullYear()}`;

  // Helper para renderizar contenido de celda según el tipo de evento
  const renderCellContent = (itin: Itinerary, dayEventIdx: number) => {
    const isMaint = itin.tipo_evento === 'mantenimiento' || itin.estado === 'en_taller';
    const isSim = itin.tipo_evento === 'simulador' || itin.avion_modelo.toLowerCase().includes('simulador') || itin.avion_matricula.includes('SIM');
    const isStandby = itin.tipo_evento === 'reserva' || itin.estado === 'guardia';
    const isRest = itin.tipo_evento === 'dia_libre' || itin.estado === 'descanso';

    // 1. Mantenimiento
    if (isMaint) {
      const maintStatusText =
        itin.estado === 'completado'
          ? '[Taller Completado · RTS]'
          : itin.estado === 'cancelado'
          ? '[Cancelado]'
          : '[En Taller]';
      const maintStatusColor =
        itin.estado === 'completado'
          ? 'text-[#15803d]'
          : itin.estado === 'cancelado'
          ? 'text-[#b91c1c]'
          : 'text-[#b45309]';
      const teamLabel =
        itin.equipo && itin.avion_matricula && !itin.equipo.includes(itin.avion_matricula)
          ? `${itin.avion_matricula} (${itin.equipo})`
          : itin.avion_matricula || itin.equipo || 'PA-28';

      return (
        <div className="space-y-1">
          <div className="font-bold text-slate-900 text-xs sm:text-[13px] leading-tight">
            Mantenimiento:
          </div>
          <div className="space-y-0.5 text-xs text-slate-800 leading-snug">
            <div>• {itin.detalles_evento || itin.mision || 'Inspección 100 hrs'}</div>
            <div>• Equipo: {teamLabel}</div>
            <div>• Horario: {itin.etd || (itin.hora_inicio && itin.hora_fin ? `${itin.hora_inicio} - ${itin.hora_fin}` : 'Todo el día')}</div>
          </div>
          <div className={`pt-1 font-bold ${maintStatusColor} text-xs`}>
            {maintStatusText}
          </div>
        </div>
      );
    }

    // 2. Entrenamiento SIM
    if (isSim) {
      return (
        <div className="space-y-1">
          <div className="font-bold text-slate-900 text-xs sm:text-[13px] leading-tight">
            Entrenamiento SIM:
          </div>
          <div className="space-y-0.5 text-xs text-slate-800 leading-snug">
            <div>• {itin.detalles_evento || itin.mision || 'FTD / Refresco IFR'}</div>
            <div>• Horario: {itin.hora_inicio && itin.hora_fin ? `${itin.hora_inicio} - ${itin.hora_fin}` : '14:00 - 16:00'}</div>
          </div>
          <div className="pt-1 font-bold text-[#15803d] text-xs">
            [Completado]
          </div>
        </div>
      );
    }

    // 3. Reserva / Standby
    if (isStandby) {
      return (
        <div className="space-y-1">
          <div className="font-bold text-slate-900 text-xs sm:text-[13px] leading-tight">
            Reserva / Standby:
          </div>
          <div className="space-y-0.5 text-xs text-slate-800 leading-snug">
            <div>• {itin.detalles_evento || 'Disponibilidad local'}</div>
            <div>• Horario: {itin.hora_inicio && itin.hora_fin ? `${itin.hora_inicio} - ${itin.hora_fin}` : '08:00 - 16:00'}</div>
          </div>
          <div className="pt-1 font-bold text-[#1d4ed8] text-xs">
            [Guardia]
          </div>
        </div>
      );
    }

    // 4. Día Libre
    if (isRest) {
      return (
        <div className="space-y-1">
          <div className="font-bold text-slate-900 text-xs sm:text-[13px] leading-tight">
            Día Libre:
          </div>
          <div className="space-y-0.5 text-xs text-slate-800 leading-snug">
            <div>• {itin.detalles_evento || 'Sin programación.'}</div>
          </div>
          <div className="pt-1 font-bold text-[#64748b] text-xs">
            [Descanso]
          </div>
        </div>
      );
    }

    // 5. Vuelo de Instrucción Normal (Vuelo 1, Vuelo 2, etc.)
    const flightTitle = `Vuelo ${dayEventIdx + 1}:`;
    const rutaText = itin.ruta || (itin.mision.includes('MP') ? itin.mision : 'MPMG - Local');
    const equipoText = itin.equipo || (itin.avion_modelo.includes('PA-28') ? 'PA-28' : itin.avion_modelo.includes('PA-34') ? 'PA-34' : itin.avion_modelo.includes('PA-44') ? 'PA-44' : itin.avion_modelo.includes('172') ? 'C-172' : itin.avion_matricula);
    const etdText = itin.etd || `${itin.hora_inicio} Z`;
    const picText = itin.pic || itin.estudiante_nombre;
    const horasText = itin.horas ? `${itin.horas.toFixed(1)} hrs` : '1.5 hrs';

    let statusText = '[Confirmado]';
    let statusColorClass = 'text-[#15803d]';

    if (itin.estado === 'pendiente_confirmacion') {
      statusText = '[Pendiente]';
      statusColorClass = 'text-[#b45309]';
    } else if (itin.estado === 'completado') {
      statusText = '[Completado]';
      statusColorClass = 'text-[#15803d]';
    } else if (itin.estado === 'cancelado') {
      const isMaintCancel =
        (itin.motivo_cancelacion || '').toLowerCase().includes('taller') ||
        (itin.motivo_cancelacion || '').toLowerCase().includes('mantenimiento') ||
        (itin.motivo_cancelacion || '').toLowerCase().includes('daño') ||
        (itin.motivo_cancelacion || '').toLowerCase().includes('aog') ||
        (itin.cancelado_por || '').toLowerCase().includes('taller');
      statusText = isMaintCancel ? '[Fuera de Línea - Taller]' : '[Cancelado]';
      statusColorClass = 'text-[#b91c1c] font-bold';
    } else if (itin.estado === 'no_show') {
      statusText = '[No Show]';
      statusColorClass = 'text-[#b91c1c]';
    }

    return (
      <div className="space-y-1">
        <div className="font-bold text-slate-900 text-xs sm:text-[13px] leading-tight">
          {flightTitle}
        </div>
        <div className="space-y-0.5 text-xs text-slate-800 leading-snug">
          <div>• Ruta: {rutaText}</div>
          <div>• Equipo: {equipoText}</div>
          <div>• ETD: {etdText}</div>
          <div>• PIC: {picText}</div>
          <div>• Horas: {horasText}</div>
        </div>
        <div className={`pt-1 font-bold ${statusColorClass} text-xs`}>
          {statusText}
        </div>
        {itin.publicado_8pm && (
          <div className="pt-0.5 text-[10px] font-semibold text-sky-700 bg-sky-50 border border-sky-200 rounded px-1.5 py-0.5 inline-block">
            Itinerario 8:00 PM · Solo Lectura
          </div>
        )}
      </div>
    );
  };

  if (isStudent) {
    const studentAssignments = itineraries
      .filter(it => it.estudiante_id === currentUser.id && it.tipo_evento !== 'mantenimiento')
      .sort((a, b) => {
        const dateCmp = (b.fecha || '').localeCompare(a.fecha || '');
        if (dateCmp !== 0) return dateCmp;
        return (a.hora_inicio || '').localeCompare(b.hora_inicio || '');
      });

    const getStudentStatusBadge = (itin: Itinerary) => {
      if (itin.estado === 'cancelado') {
        return { label: 'Cancelado', cls: 'text-rose-700 dark:text-rose-400' };
      }
      if (itin.estado === 'no_show') {
        return { label: 'No Show', cls: 'text-rose-700 dark:text-rose-400' };
      }
      if (itin.estado === 'pendiente_confirmacion') {
        return { label: 'Pendiente', cls: 'text-amber-700 dark:text-amber-400' };
      }
      if (itin.estado === 'completado') {
        return { label: 'Completado', cls: 'text-emerald-700 dark:text-emerald-400' };
      }
      if (itin.estado === 'guardia') {
        return { label: 'Guardia', cls: 'text-sky-700 dark:text-sky-400' };
      }
      if (itin.estado === 'descanso') {
        return { label: 'Descanso', cls: 'text-slate-600 dark:text-slate-400' };
      }
      return { label: 'Confirmado', cls: 'text-emerald-700 dark:text-emerald-400' };
    };

    return (
      <div className="space-y-4">
        <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs flex items-center gap-3">
          <div className="p-2 bg-[#0B2F64] text-white rounded-lg shadow-xs">
            <Plane className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
              Itinerario
            </h1>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
          {loading ? (
            <div className="py-12 text-center text-xs text-slate-500 dark:text-slate-400">
              Cargando asignaciones...
            </div>
          ) : studentAssignments.length === 0 ? (
            <div className="py-12 px-4 text-center space-y-1.5">
              <Plane className="w-6 h-6 mx-auto text-slate-400" />
              <p className="text-sm font-medium text-slate-700 dark:text-slate-200">
                No tienes asignaciones en tu itinerario.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 text-slate-600 dark:text-slate-300">
                    <th className="py-3 px-4 font-semibold">Fecha y Horario</th>
                    <th className="py-3 px-4 font-semibold">Aeronave</th>
                    <th className="py-3 px-4 font-semibold">Instructor</th>
                    <th className="py-3 px-4 font-semibold">Misión y Ruta</th>
                    <th className="py-3 px-4 font-semibold">Estado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                  {studentAssignments.map(itin => {
                    const statusInfo = getStudentStatusBadge(itin);
                    return (
                      <tr key={itin.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                        <td className="py-3 px-4 font-mono tabular-nums whitespace-nowrap">
                          <div className="font-semibold text-slate-900 dark:text-white">
                            {itin.fecha}
                          </div>
                          <div className="text-[11px] text-slate-500 dark:text-slate-400">
                            {itin.hora_inicio} – {itin.hora_fin} ({(itin.horas || 1.5).toFixed(1)}h)
                          </div>
                        </td>
                        <td className="py-3 px-4 whitespace-nowrap">
                          <div className="font-mono font-semibold text-slate-900 dark:text-white">
                            {itin.avion_matricula || 'SIM'}
                          </div>
                          <div className="text-[11px] text-slate-500 dark:text-slate-400">
                            {itin.equipo || itin.avion_modelo}
                          </div>
                        </td>
                        <td className="py-3 px-4 text-slate-800 dark:text-slate-200">
                          {itin.instructor_nombre || 'Por asignar'}
                        </td>
                        <td className="py-3 px-4">
                          <div className="font-medium text-slate-900 dark:text-white">
                            {itin.mision || itin.detalles_evento || 'Vuelo de Instrucción'}
                          </div>
                          {itin.ruta && (
                            <div className="text-[11px] text-slate-500 dark:text-slate-400 font-mono">
                              {itin.ruta}
                            </div>
                          )}
                        </td>
                        <td className="py-3 px-4 whitespace-nowrap">
                          <span className={`font-semibold ${statusInfo.cls}`}>
                            {statusInfo.label}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Barra Superior con Acciones, Navegación de Semanas y Filtros */}
      <div className="bg-white p-3.5 sm:p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="p-2 bg-[#0B2F64] text-white rounded-lg shadow-xs">
            <Plane className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-base sm:text-lg font-bold text-slate-900">
              {t('itineraryTitle')} (Dispatch Semanal)
            </h1>
          </div>
        </div>

        {/* Acciones */}
        <div className="flex items-center gap-2 w-full md:w-auto justify-end flex-wrap">
          {onNavigateTab && isInstructor && (
            <button
              onClick={() => onNavigateTab('solicitudes_vuelo')}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-sky-600 hover:bg-sky-700 text-white text-xs font-bold rounded-lg shadow-xs transition-colors cursor-pointer whitespace-nowrap"
            >
              <Send className="w-4 h-4" />
              <span>Solicitar Vuelo (11am–6pm)</span>
            </button>
          )}

          {onNavigateTab && isChiefInstructor && (
            <button
              onClick={() => onNavigateTab('solicitudes_vuelo')}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-lg shadow-xs transition-colors cursor-pointer whitespace-nowrap"
            >
              <ShieldCheck className="w-4 h-4" />
              <span>Aprobar Solicitudes (6pm / 8pm)</span>
            </button>
          )}

          {(isMantenimiento || isAdmin || currentUser.rol === 'escuela') && (
            <button
              onClick={() => {
                setGroundReason('Entrada a Taller Imprevista - Reporte de Discrepancia Técnica / Daño OMA');
                setShowGroundModal(true);
              }}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-lg shadow-xs transition-colors cursor-pointer whitespace-nowrap"
              title="Sacar una aeronave de la línea de vuelo y cancelar vuelos por falla o entrada imprevista al taller"
            >
              <Wrench className="w-4 h-4" />
              <span>Sacar Aeronave de Línea (Taller OMA)</span>
            </button>
          )}

          {canProgramAssignment && (
            <button
              onClick={() => {
                setFormError('');
                if (isMantenimiento) {
                  setTipoEvento('mantenimiento');
                }
                setShowScheduleModal(true);
              }}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-[#0B2F64] hover:bg-[#08234a] text-white text-xs font-bold rounded-lg shadow-xs transition-colors cursor-pointer whitespace-nowrap"
            >
              <Plus className="w-4 h-4" />
              <span>+ Programar Asignación</span>
            </button>
          )}
        </div>
      </div>

      {/* Banner Operativo para Rol Taller Aeronáutico (OMA) */}
      {isMantenimiento && (
        <div className="bg-[#0B2F64] border border-slate-700 rounded-xl p-3.5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs text-slate-100 shadow-sm">
          <div className="flex items-start sm:items-center gap-2.5">
            <div className="p-2 bg-red-600/20 text-red-300 border border-red-500/30 rounded-lg shrink-0 mt-0.5 sm:mt-0">
              <Wrench className="w-4 h-4 text-red-400" />
            </div>
            <div>
              <p className="font-bold text-white text-xs">
                Taller Aeronáutico (OMA)
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              setGroundReason('Entrada a Taller Imprevista - Reporte de Discrepancia Técnica / Daño OMA');
              setShowGroundModal(true);
            }}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-lg font-bold text-xs shrink-0 cursor-pointer shadow-sm"
          >
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>Reportar AOG / Fuera de Línea</span>
          </button>
        </div>
      )}

      {/* Control Rápido de Aeronaves Inmovilizadas / En Taller (Retorno al Servicio desde Dispatch) */}
      {(isMantenimiento || isAdmin || currentUser.rol === 'escuela') && unavailableFleet.length > 0 && (
        <div className="bg-white border border-slate-300 rounded-xl p-3.5 shadow-xs space-y-2.5">
          <div className="flex items-center justify-between gap-2 border-b border-slate-200 pb-2">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-900">
              <ShieldAlert className="w-4 h-4 text-red-600 shrink-0" />
              <span>Aeronaves Fuera de Línea / En Taller OMA ({unavailableFleet.length})</span>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5">
            {unavailableFleet.map(ac => {
              const isAog = ac.bloqueo_despacho || ac.estado_aeronavegabilidad === 'aog_bloqueado';
              const isBusy = releaseProcessingMat === ac.matricula;
              return (
                <div
                  key={ac.matricula}
                  className={`p-2.5 rounded-lg border flex items-center justify-between gap-2.5 ${
                    isAog ? 'bg-red-50/70 border-red-200' : 'bg-slate-50 border-slate-200'
                  }`}
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-xs text-slate-900">{ac.matricula}</span>
                      <span
                        className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${
                          isAog
                            ? 'bg-red-100 text-red-800 border-red-300'
                            : 'bg-amber-100 text-amber-800 border-amber-300'
                        }`}
                      >
                        {isAog ? 'BLOQUEADA AOG' : 'EN TALLER'}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-600 truncate mt-0.5" title={ac.motivo_bloqueo || ac.modelo}>
                      {ac.motivo_bloqueo || ac.modelo}
                    </p>
                  </div>
                  <button
                    type="button"
                    disabled={isBusy}
                    onClick={() => handleReleaseAircraftFromDispatch(ac.matricula)}
                    className="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[11px] font-bold shrink-0 cursor-pointer flex items-center gap-1 shadow-2xs disabled:opacity-60"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>{isBusy ? 'Liberando...' : 'Liberar a Servicio (RTS)'}</span>
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Navegación y Filtros */}
      <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-xs flex flex-col lg:flex-row items-start lg:items-center justify-between gap-3">
        {/* Controles de Navegación de Semanas */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center bg-slate-50 border border-slate-300 rounded-lg p-0.5">
            <button
              onClick={handlePrevWeek}
              className="p-1.5 text-slate-700 hover:bg-slate-200 rounded-md transition-colors cursor-pointer"
              title="Semana anterior"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={handleGoToday}
              className="px-2.5 py-1 text-xs font-bold text-[#0B2F64] hover:bg-sky-50 rounded-md transition-colors cursor-pointer flex items-center gap-1"
            >
              <CalendarDays className="w-3.5 h-3.5" />
              <span>Semana Actual</span>
            </button>
            <button
              onClick={handleNextWeek}
              className="p-1.5 text-slate-700 hover:bg-slate-200 rounded-md transition-colors cursor-pointer"
              title="Semana siguiente"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs font-bold text-slate-800">
            <CalendarIcon className="w-3.5 h-3.5 text-[#0B2F64]" />
            <span>Semana: {weekRangeTitle}</span>
          </div>

          <input
            type="date"
            className="px-2 py-1 bg-slate-50 border border-slate-300 rounded-lg text-xs text-slate-800 cursor-pointer"
            value={currentStartDate.toISOString().split('T')[0]}
            onChange={(e) => handleDateJump(e.target.value)}
            title="Seleccionar fecha"
          />
        </div>

        {/* Buscador y Filtro */}
        <div className="flex items-center gap-2 w-full lg:w-auto flex-wrap">
          <div className="relative flex-1 sm:flex-initial">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar PIC, ruta, avión..."
              className="pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-sky-600 w-full sm:w-48 text-slate-800"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <select
            className="px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:outline-none font-medium text-slate-700 cursor-pointer"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="todos">Todos los Estados</option>
            <option value="confirmados">Confirmados / Completados</option>
            <option value="pendientes">Pendientes</option>
            <option value="cancelados">Cancelados</option>
            <option value="no_show">No Show</option>
          </select>
        </div>
      </div>

      {formError && !showScheduleModal && (
        <div className="p-3 bg-rose-50 border border-rose-300 rounded-xl text-rose-800 text-xs font-semibold flex items-center justify-between gap-2 animate-in fade-in">
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-rose-600 flex-shrink-0" />
            <span>{formError}</span>
          </div>
          <button
            type="button"
            onClick={() => setFormError('')}
            className="text-rose-500 hover:text-rose-700 font-bold cursor-pointer"
          >
            &times;
          </button>
        </div>
      )}

      {formSuccess && (
        <div className="p-3 bg-emerald-50 border border-emerald-300 rounded-xl text-emerald-800 text-xs font-semibold flex items-center gap-2 animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
          <span>{formSuccess}</span>
        </div>
      )}

      {calendarSyncSuccessMsg && (
        <div className="p-3 bg-blue-50 border border-blue-300 rounded-xl text-blue-900 text-xs font-semibold flex items-center gap-2 animate-in fade-in">
          <CalendarIcon className="w-4 h-4 text-blue-600 flex-shrink-0" />
          <span>{calendarSyncSuccessMsg}</span>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TABLA PRINCIPAL DE DISPATCH (DISEÑO EXACTO DEL ESQUEMA SOLICITADO)       */}
      {/* ========================================================================= */}
      <div className="bg-white rounded-xl border border-slate-400 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse border border-slate-400 bg-white text-slate-900 font-sans text-xs">
            {/* ENCABEZADO: AZUL OSCURO CON DÍA DE LA SEMANA Y FECHA (DD/MM) */}
            <thead>
              <tr className="bg-[#0B2F64] text-white">
                {weekDays.map((day) => (
                  <th
                    key={day.dateStr}
                    className={`border border-slate-400 py-2.5 px-3 text-center w-[14.28%] min-w-[130px] font-bold select-none ${
                      day.isToday ? 'ring-2 ring-sky-300 ring-inset' : ''
                    }`}
                  >
                    <div className="text-xs sm:text-sm leading-tight tracking-wide font-semibold">
                      {day.dayName}
                    </div>
                    <div className="text-xs sm:text-sm font-bold opacity-95">
                      {day.displayDate}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>

            {/* CUERPO DE LA TABLA: FILAS DE VUELOS / ASIGNACIONES */}
            <tbody>
              {rowIndices.map((rowIdx) => (
                <tr key={rowIdx} className="border-b border-slate-400">
                  {weekDays.map((day) => {
                    const event = day.events[rowIdx];

                    return (
                      <td
                        key={`${day.dateStr}-${rowIdx}`}
                        className="border border-slate-400 p-2.5 sm:p-3 align-top bg-white hover:bg-slate-50 transition-colors"
                      >
                        {event ? (
                          <div
                            onClick={() => setSelectedDetailItinerary(event)}
                            className="cursor-pointer group hover:opacity-95"
                            title="Clic para ver detalles y gestionar"
                          >
                            {renderCellContent(event, rowIdx)}
                          </div>
                        ) : (
                          // Espacio vacío en la fila
                          <div className="py-4 text-center">
                            {rowIdx > 0 ? (
                              <span className="text-[11px] italic text-slate-600 block">
                                Sin asignación adicional
                              </span>
                            ) : canProgramAssignment ? (
                              <button
                                onClick={() => openScheduleForDate(day.dateStr)}
                                className="text-[11px] italic text-slate-400 hover:text-sky-700 transition-colors cursor-pointer"
                              >
                                Sin asignación
                              </button>
                            ) : (
                              <span className="text-[11px] italic text-slate-400 block">
                                Sin asignación
                              </span>
                            )}
                          </div>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL: VER DETALLE COMPLETO DEL VUELO / GESTIÓN */}
      {selectedDetailItinerary && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-200 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto my-auto p-5 sm:p-6 shadow-xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Plane className="w-5 h-5 text-[#0B2F64]" />
                <h3 className="font-bold text-slate-800 text-base">
                  Detalle de Asignación #{selectedDetailItinerary.id}
                </h3>
              </div>
              <button
                onClick={() => setSelectedDetailItinerary(null)}
                className="text-slate-400 hover:text-slate-600 text-lg font-bold cursor-pointer"
              >
                &times;
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 grid grid-cols-2 gap-3">
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-semibold">Fecha y Horario:</span>
                  <strong className="text-slate-800">
                    {selectedDetailItinerary.fecha} ({selectedDetailItinerary.hora_inicio} - {selectedDetailItinerary.hora_fin})
                  </strong>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-semibold">Aeronave / Equipo:</span>
                  <strong className="text-sky-900 font-mono">
                    {selectedDetailItinerary.avion_matricula}
                  </strong> ({selectedDetailItinerary.equipo || selectedDetailItinerary.avion_modelo})
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-semibold">PIC / Asignado:</span>
                  <strong className="text-slate-800">{selectedDetailItinerary.pic || selectedDetailItinerary.estudiante_nombre}</strong>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-semibold">Horas Estimadas:</span>
                  <strong className="text-slate-800">{selectedDetailItinerary.horas || 1.5} hrs</strong>
                </div>
              </div>

              {selectedDetailItinerary.ruta && (
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-semibold">Ruta Operacional:</span>
                  <p className="text-slate-800 font-bold mt-0.5 bg-slate-50 p-2.5 rounded-xl border border-slate-200 font-mono">
                    {selectedDetailItinerary.ruta}
                  </p>
                </div>
              )}

              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-semibold">Misión / Detalle:</span>
                <p className="text-slate-800 font-medium mt-0.5 bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                  {selectedDetailItinerary.detalles_evento || selectedDetailItinerary.mision}
                </p>
              </div>

              {selectedDetailItinerary.motivo_cancelacion && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-900 space-y-1">
                  <strong>Motivo de Cancelación:</strong>
                  <p className="italic">"{selectedDetailItinerary.motivo_cancelacion}"</p>
                  {selectedDetailItinerary.cancelado_por && (
                    <span className="text-[10px] text-slate-500 block">Cancelado por: {selectedDetailItinerary.cancelado_por}</span>
                  )}
                </div>
              )}

              {/* Estado de sincronización con Google Calendar */}
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <div className={`p-1.5 rounded-lg ${selectedDetailItinerary.google_calendar_event_id ? 'bg-blue-100 text-blue-700' : 'bg-slate-200 text-slate-500'}`}>
                    <CalendarIcon className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="font-bold text-slate-800 text-xs block">Google Calendar</span>
                    <span className="text-[11px] text-slate-500">
                      {selectedDetailItinerary.google_calendar_event_id
                        ? `Sincronizado (${new Date(selectedDetailItinerary.google_calendar_synced_at || '').toLocaleDateString('es-PA')})`
                        : 'No sincronizado aún con calendarios'}
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setCalendarTargetItinerary(selectedDetailItinerary);
                    setCalendarSyncModalOpen(true);
                  }}
                  className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5 shadow-2xs"
                >
                  <CalendarPlus className="w-3.5 h-3.5" />
                  <span>{selectedDetailItinerary.google_calendar_event_id ? 'Actualizar Evento' : 'Sincronizar'}</span>
                </button>
              </div>
            </div>

            {/* Aviso de solo lectura si pertenece al itinerario oficial 8:00 PM */}
            {(selectedDetailItinerary.publicado_8pm || selectedDetailItinerary.solo_lectura) && (
              <div className="p-3 bg-sky-50 border border-sky-200 rounded-xl text-sky-900 text-xs flex items-start gap-2">
                <Eye className="w-4 h-4 text-sky-600 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold block">Itinerario Oficial Publicado 8:00 PM</span>
                  <span className="text-[11px] text-sky-800">
                    Aprobado por {selectedDetailItinerary.aprobado_por_jefe || 'Cap. A. Bustamante (Instructor en Jefe)'}. {canEditDeleteAccepted ? 'Dirección e Instructor en Jefe pueden editar o eliminar este vuelo.' : 'Solo lectura para instructores y estudiantes.'}
                  </span>
                </div>
              </div>
            )}

            {/* Acciones Rápidas */}
            <div className="flex items-center justify-between pt-3 border-t border-slate-100 flex-wrap gap-2">
              <div className="flex items-center gap-1.5 flex-wrap">
                {canEditDeleteAccepted && (
                  selectedDetailItinerary.estado === 'confirmado' ||
                  selectedDetailItinerary.publicado_8pm ||
                  selectedDetailItinerary.solo_lectura
                ) && (
                  <>
                    <button
                      type="button"
                      onClick={() => {
                        setEditItinError('');
                        setEditItinForm({
                          instructor_id: selectedDetailItinerary.instructor_id,
                          estudiante_id: selectedDetailItinerary.estudiante_id,
                          fecha: selectedDetailItinerary.fecha,
                          hora_inicio: selectedDetailItinerary.hora_inicio,
                          hora_fin: selectedDetailItinerary.hora_fin,
                          avion_matricula: selectedDetailItinerary.avion_matricula,
                          ruta: selectedDetailItinerary.ruta || 'MPMG - MPMG',
                          mision: selectedDetailItinerary.mision,
                          detalles_evento: selectedDetailItinerary.detalles_evento || ''
                        });
                        setEditingItinerary(selectedDetailItinerary);
                        setSelectedDetailItinerary(null);
                      }}
                      className="px-3 py-1.5 bg-sky-600 hover:bg-sky-700 text-white rounded-lg text-xs font-bold transition-colors cursor-pointer flex items-center gap-1"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                      <span>Editar Vuelo</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setDeletingItinerary(selectedDetailItinerary);
                        setSelectedDetailItinerary(null);
                      }}
                      className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-bold transition-colors cursor-pointer flex items-center gap-1"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Eliminar Vuelo</span>
                    </button>
                  </>
                )}
                {!(selectedDetailItinerary.publicado_8pm || selectedDetailItinerary.solo_lectura) && (() => {
                  const canWorkshopControl = isMantenimiento || isAdmin || currentUser.rol === 'escuela';
                  const isActiveMaintSlot =
                    (selectedDetailItinerary.tipo_evento === 'mantenimiento' || selectedDetailItinerary.estado === 'en_taller') &&
                    selectedDetailItinerary.estado !== 'completado' &&
                    selectedDetailItinerary.estado !== 'cancelado';
                  const detailAc = getAircraftRecordByMat(selectedDetailItinerary.avion_matricula);
                  const detailAcBlocked = Boolean(detailAc && isAircraftUnavailable(detailAc));
                  const isBusy = releaseProcessingMat === selectedDetailItinerary.avion_matricula;

                  return (
                    <>
                      {canWorkshopControl && (isActiveMaintSlot || detailAcBlocked) && (
                        <button
                          type="button"
                          disabled={isBusy}
                          onClick={() =>
                            handleReleaseAircraftFromDispatch(
                              selectedDetailItinerary.avion_matricula,
                              isActiveMaintSlot ? selectedDetailItinerary : undefined
                            )
                          }
                          className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5 shadow-xs disabled:opacity-60"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>{isBusy ? 'Liberando...' : 'Liberar a Servicio (RTS)'}</span>
                        </button>
                      )}

                      {canWorkshopControl &&
                        !isActiveMaintSlot &&
                        selectedDetailItinerary.estado !== 'cancelado' &&
                        selectedDetailItinerary.estado !== 'no_show' &&
                        selectedDetailItinerary.estado !== 'completado' && (
                          <button
                            onClick={() => {
                              setCancellingItinerary(selectedDetailItinerary);
                              setSelectedDetailItinerary(null);
                              setCancellationReason('Entrada a Taller Imprevista - Reporte Técnico OMA / Daño');
                            }}
                            className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5 shadow-xs"
                            title="Sacar esta aeronave de línea de vuelo y cancelar este horario por mantenimiento imprevisto o daño"
                          >
                            <Wrench className="w-3.5 h-3.5" />
                            <span>Sacar de Línea (Taller OMA)</span>
                          </button>
                        )}
                    </>
                  );
                })()}

                {!(selectedDetailItinerary.publicado_8pm || selectedDetailItinerary.solo_lectura) && selectedDetailItinerary.estado === 'pendiente_confirmacion' && (
                  <>
                    <button
                      onClick={() => {
                        handleAcceptFlight(selectedDetailItinerary);
                        setSelectedDetailItinerary(null);
                      }}
                      className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition-colors cursor-pointer flex items-center gap-1"
                    >
                      <Check className="w-3.5 h-3.5" />
                      <span>Confirmar Vuelo</span>
                    </button>
                    {!isMantenimiento && (
                      <button
                        onClick={() => {
                          setCancellingItinerary(selectedDetailItinerary);
                          setSelectedDetailItinerary(null);
                        }}
                        className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-lg text-xs font-semibold cursor-pointer"
                      >
                        Cancelar con Motivo
                      </button>
                    )}
                  </>
                )}

                {!(selectedDetailItinerary.publicado_8pm || selectedDetailItinerary.solo_lectura) && (isInstructor || isChiefInstructor) && selectedDetailItinerary.estado !== 'cancelado' && selectedDetailItinerary.estado !== 'no_show' && (
                  <button
                    onClick={() => {
                      setNoShowItinerary(selectedDetailItinerary);
                      setSelectedDetailItinerary(null);
                    }}
                    className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-lg text-xs font-semibold cursor-pointer flex items-center gap-1"
                  >
                    <UserX className="w-3.5 h-3.5" />
                    <span>No Show</span>
                  </button>
                )}
              </div>

              <button
                onClick={() => setSelectedDetailItinerary(null)}
                className="px-4 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold cursor-pointer ml-auto"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: PROGRAMAR ASIGNACIÓN (VUELO / MANTENIMIENTO / SIMULADOR / GUARDIA / DÍA LIBRE) */}
      {showScheduleModal && canProgramAssignment && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-200 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-lg w-full p-5 sm:p-6 shadow-xl border border-slate-200 space-y-4 max-h-[90vh] overflow-y-auto my-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Plane className="w-5 h-5 text-[#0B2F64]" />
                <h3 className="font-bold text-slate-800 text-base">Programar en Dispatch Semanal</h3>
              </div>
              <button
                onClick={() => setShowScheduleModal(false)}
                className="text-slate-400 hover:text-slate-600 text-lg font-bold cursor-pointer"
              >
                &times;
              </button>
            </div>

            {formError && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs flex items-start gap-2">
                <ShieldAlert className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <div>
                  <strong>Error:</strong>
                  <p>{formError}</p>
                </div>
              </div>
            )}

            {/* Selector de Tipo de Asignación */}
            <div className="grid grid-cols-5 gap-1 p-1 bg-slate-100 rounded-xl text-[11px] font-semibold text-slate-700">
              <button
                type="button"
                onClick={() => setTipoEvento('vuelo')}
                className={`py-1.5 rounded-lg transition-all cursor-pointer flex flex-col items-center gap-0.5 ${
                  tipoEvento === 'vuelo' ? 'bg-[#0B2F64] text-white shadow-2xs font-bold' : 'hover:bg-slate-200'
                }`}
              >
                <Plane className="w-3.5 h-3.5" />
                <span>Vuelo</span>
              </button>
              <button
                type="button"
                onClick={() => setTipoEvento('mantenimiento')}
                className={`py-1.5 rounded-lg transition-all cursor-pointer flex flex-col items-center gap-0.5 ${
                  tipoEvento === 'mantenimiento' ? 'bg-amber-600 text-white shadow-2xs font-bold' : 'hover:bg-slate-200'
                }`}
              >
                <Wrench className="w-3.5 h-3.5" />
                <span>Taller</span>
              </button>
              <button
                type="button"
                onClick={() => setTipoEvento('simulador')}
                className={`py-1.5 rounded-lg transition-all cursor-pointer flex flex-col items-center gap-0.5 ${
                  tipoEvento === 'simulador' ? 'bg-emerald-700 text-white shadow-2xs font-bold' : 'hover:bg-slate-200'
                }`}
              >
                <Gamepad2 className="w-3.5 h-3.5" />
                <span>SIM</span>
              </button>
              <button
                type="button"
                onClick={() => setTipoEvento('reserva')}
                className={`py-1.5 rounded-lg transition-all cursor-pointer flex flex-col items-center gap-0.5 ${
                  tipoEvento === 'reserva' ? 'bg-blue-700 text-white shadow-2xs font-bold' : 'hover:bg-slate-200'
                }`}
              >
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>Guardia</span>
              </button>
              <button
                type="button"
                onClick={() => setTipoEvento('dia_libre')}
                className={`py-1.5 rounded-lg transition-all cursor-pointer flex flex-col items-center gap-0.5 ${
                  tipoEvento === 'dia_libre' ? 'bg-slate-700 text-white shadow-2xs font-bold' : 'hover:bg-slate-200'
                }`}
              >
                <Coffee className="w-3.5 h-3.5" />
                <span>Libre</span>
              </button>
            </div>

            <form onSubmit={handleCreateItinerary} className="space-y-3 text-xs">
              {/* Fecha y Horas */}
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">{t('date')} *</label>
                  <input
                    type="date"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-slate-800"
                    value={fecha}
                    onChange={(e) => setFecha(e.target.value)}
                    required
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">{t('startTime')} *</label>
                  <input
                    type="time"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-semibold text-slate-800"
                    value={horaInicio}
                    onChange={(e) => setHoraInicio(e.target.value)}
                    required
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">{t('endTime')} *</label>
                  <input
                    type="time"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-semibold text-slate-800"
                    value={horaFin}
                    onChange={(e) => setHoraFin(e.target.value)}
                    required
                  />
                </div>
              </div>

              {/* CAMPOS ESPECÍFICOS PARA VUELO */}
              {tipoEvento === 'vuelo' && (
                <>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">Estudiante Piloto *</label>
                      <select
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-semibold text-slate-800 cursor-pointer"
                        value={estudianteId}
                        onChange={(e) => {
                          const sid = e.target.value;
                          setEstudianteId(sid);
                          const st = studentsList.find(s => s.id === sid);
                          if (st) setPicName(st.nombre);
                        }}
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
                      <label className="block font-semibold text-slate-700 mb-1">Instructor Asignado *</label>
                      {isInstructor ? (
                        <div className="w-full px-3 py-2 bg-slate-100 border border-slate-200 rounded-xl font-semibold text-slate-800 truncate">
                          {currentUser.nombre}
                        </div>
                      ) : (
                        <select
                          className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-semibold text-slate-800 cursor-pointer"
                          value={instructorId}
                          onChange={(e) => setInstructorId(e.target.value)}
                          required
                        >
                          {instructorsList.map(inst => (
                            <option key={inst.id} value={inst.id}>
                              {inst.nombre}
                            </option>
                          ))}
                        </select>
                      )}
                    </div>
                  </div>

                  {(() => {
                    const stElig = estudianteId ? eligibilityMap[estudianteId] : undefined;
                    if (!stElig) return null;
                    if (!stElig.eligible) {
                      return (
                        <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-[11px] flex items-start gap-2">
                          <ShieldAlert className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                          <span>
                            <strong>
                              {stElig.hasZeroOrNegative
                                ? 'Estudiante sin saldo disponible:'
                                : 'Saldo insuficiente para asignar vuelo:'}
                            </strong>{' '}
                            El estudiante debe contar con un saldo mínimo de ${minBalanceRequired.toFixed(2)} USD validado en Contabilidad antes de poder asignarle vuelos.
                          </span>
                        </div>
                      );
                    }
                    return (
                      <div className="px-3 py-1.5 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-[11px] flex items-center gap-2">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                        <span>Estudiante habilitado para vuelo (saldo mínimo de ${minBalanceRequired.toFixed(2)} USD verificado).</span>
                      </div>
                    );
                  })()}

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">Ruta Operacional (ej. MPMG - MPDA) *</label>
                      <input
                        type="text"
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-mono font-bold text-slate-800"
                        value={ruta}
                        onChange={(e) => setRuta(e.target.value)}
                        placeholder="MPMG - MPDA"
                        required
                      />
                    </div>
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">PIC / Piloto al Mando *</label>
                      <input
                        type="text"
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-semibold text-slate-800"
                        value={picName}
                        onChange={(e) => setPicName(e.target.value)}
                        placeholder="A. Muñoz"
                        required
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">Equipo (Modelo)</label>
                      <select
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-slate-800 font-semibold"
                        value={avionModelo}
                        onChange={(e) => setAvionModelo(e.target.value)}
                      >
                        <option value="Cessna 172N Skyhawk">Cessna 172N Skyhawk</option>
                        <option value="Cessna 172P Skyhawk">Cessna 172P Skyhawk</option>
                        <option value="Cessna 172SP Skyhawk (G1000)">Cessna 172SP (G1000)</option>
                        <option value="Cessna 172SP Skyhawk Nav II">Cessna 172SP Nav II</option>
                        <option value="Piper PA-28-181 Archer III">PA-28 Archer III</option>
                        <option value="Piper PA-34 Seneca (Multi-Motor)">PA-34 Seneca</option>
                        <option value="Piper PA-44-180 Seminole (Multi-Motor)">PA-44 Seminole</option>
                      </select>
                    </div>
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">Matrícula</label>
                      <select
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-mono font-bold text-slate-800 cursor-pointer"
                        value={avionMatricula}
                        onChange={(e) => {
                          const mat = e.target.value;
                          setAvionMatricula(mat);
                          const rec = getAircraftRecordByMat(mat);
                          if (rec) setAvionModelo(rec.modelo);
                        }}
                        required
                      >
                        {fleetMatriculas.map(mat => (
                          <option key={mat} value={mat}>
                            {mat}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">Horas de Vuelo</label>
                      <input
                        type="number"
                        step="0.1"
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-bold text-slate-800"
                        value={duracionHoras}
                        onChange={(e) => setDuracionHoras(parseFloat(e.target.value) || 0)}
                        required
                      />
                    </div>
                  </div>

                  {(() => {
                    const selectedAc = getAircraftRecordByMat(avionMatricula);
                    if (selectedAc && isAircraftUnavailable(selectedAc)) {
                      return (
                        <div className="p-2.5 bg-red-50 border border-red-200 rounded-xl text-red-800 text-[11px] flex items-start gap-2">
                          <ShieldAlert className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                          <span>
                            <strong>Bloqueo de Despacho Activo ({selectedAc.matricula}):</strong>{' '}
                            {selectedAc.motivo_bloqueo || 'Aeronave inmovilizada o en taller OMA.'} Debe emitirse Retorno al Servicio (RTS) antes de programar vuelos.
                          </span>
                        </div>
                      );
                    }
                    return null;
                  })()}

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Misión / Lección de Instrucción</label>
                    <input
                      type="text"
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-slate-800"
                      value={mision}
                      onChange={(e) => setMision(e.target.value)}
                      placeholder="ej. Vuelo de Travesía MPMG - MPDA"
                    />
                  </div>
                </>
              )}

              {/* CAMPOS ESPECÍFICOS PARA MANTENIMIENTO */}
              {tipoEvento === 'mantenimiento' && (
                <div className="space-y-3">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Trabajo de Mantenimiento / Inspección *</label>
                    <input
                      type="text"
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-bold text-slate-800"
                      value={detallesEvento}
                      onChange={(e) => setDetallesEvento(e.target.value)}
                      placeholder="Inspección 100 hrs / Servicio 50h / Revisión OMA"
                      required
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">Aeronave (Matrícula) *</label>
                      <select
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-mono font-bold text-slate-800 cursor-pointer"
                        value={avionMatricula}
                        onChange={(e) => {
                          const mat = e.target.value;
                          setAvionMatricula(mat);
                          const rec = getAircraftRecordByMat(mat);
                          if (rec) setAvionModelo(rec.modelo);
                        }}
                      >
                        {fleetMatriculas.map(mat => (
                          <option key={mat} value={mat}>
                            {mat}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">Horario en Taller</label>
                      <input
                        type="text"
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-slate-800"
                        defaultValue="Todo el día"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* CAMPOS ESPECÍFICOS PARA SIMULADOR */}
              {tipoEvento === 'simulador' && (
                <div className="space-y-3">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Sesión de Simulador *</label>
                    <input
                      type="text"
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-bold text-slate-800"
                      value={detallesEvento || 'FTD / Refresco IFR'}
                      onChange={(e) => setDetallesEvento(e.target.value)}
                      placeholder="FTD / Refresco IFR"
                      required
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">Piloto / Alumno</label>
                      <input
                        type="text"
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-semibold text-slate-800"
                        value={picName}
                        onChange={(e) => setPicName(e.target.value)}
                      />
                    </div>
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">Simulador</label>
                      <input
                        type="text"
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-semibold text-slate-800"
                        value="Redbird FMX"
                        readOnly
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* CAMPOS ESPECÍFICOS PARA GUARDIA / RESERVA */}
              {tipoEvento === 'reserva' && (
                <div className="space-y-3">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Detalle de Guardia / Standby</label>
                    <input
                      type="text"
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-bold text-slate-800"
                      value={detallesEvento || 'Disponibilidad local'}
                      onChange={(e) => setDetallesEvento(e.target.value)}
                      placeholder="Disponibilidad local"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Piloto / Personal en Guardia</label>
                    <input
                      type="text"
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-semibold text-slate-800"
                      value={picName}
                      onChange={(e) => setPicName(e.target.value)}
                    />
                  </div>
                </div>
              )}

              {/* CAMPOS ESPECÍFICOS PARA DÍA LIBRE */}
              {tipoEvento === 'dia_libre' && (
                <div className="space-y-3">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Detalle de Descanso</label>
                    <input
                      type="text"
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-slate-800"
                      value={detallesEvento || 'Sin programación.'}
                      onChange={(e) => setDetallesEvento(e.target.value)}
                    />
                  </div>
                </div>
              )}

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowScheduleModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
                >
                  {t('cancel')}
                </button>
                <button
                  type="submit"
                  disabled={
                    tipoEvento === 'vuelo' &&
                    Boolean(estudianteId && eligibilityMap[estudianteId] && !eligibilityMap[estudianteId].eligible)
                  }
                  className="px-5 py-2 text-xs font-semibold bg-[#0B2F64] hover:bg-[#08234a] text-white rounded-xl shadow-xs cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Guardar en Dispatch
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: EDITAR VUELO ACEPTADO (DIRECTOR / INSTRUCTOR EN JEFE) */}
      {editingItinerary && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-200 overflow-y-auto">
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              setEditItinError('');
              const editElig = editItinForm.estudiante_id ? eligibilityMap[editItinForm.estudiante_id] : undefined;
              if (editingItinerary.tipo_evento === 'vuelo' && editElig && !editElig.eligible) {
                setEditItinError(
                  editElig.hasZeroOrNegative
                    ? `Asignación bloqueada: el estudiante seleccionado está sin saldo disponible (mínimo requerido $${minBalanceRequired.toFixed(2)} USD).`
                    : `Asignación bloqueada: el estudiante no cumple con el saldo mínimo requerido de $${minBalanceRequired.toFixed(2)} USD.`
                );
                return;
              }
              setEditItinBusy(true);
              try {
                const [h1, m1] = editItinForm.hora_inicio.split(':').map(Number);
                const [h2, m2] = editItinForm.hora_fin.split(':').map(Number);
                const diff = (h2 * 60 + m2 - (h1 * 60 + m1)) / 60;
                const horas = diff > 0 ? Number(diff.toFixed(1)) : editingItinerary.horas || 1.5;
                await api.updateItinerary(
                  editingItinerary.id,
                  {
                    ...editItinForm,
                    horas
                  },
                  { id: currentUser.id, nombre: currentUser.nombre, rol: currentUser.rol }
                );
                setEditingItinerary(null);
                await loadItineraries();
                if (onRefreshAll) onRefreshAll();
              } catch (err: any) {
                setEditItinError(err.message || 'No se pudo actualizar el vuelo.');
              } finally {
                setEditItinBusy(false);
              }
            }}
            className="bg-white rounded-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto my-auto p-5 sm:p-6 shadow-xl border border-slate-200 space-y-4 text-xs"
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Pencil className="w-5 h-5 text-sky-600" />
                <h3 className="font-bold text-slate-800 text-base">Editar Vuelo Aceptado</h3>
              </div>
              <button
                type="button"
                onClick={() => setEditingItinerary(null)}
                className="text-slate-400 hover:text-slate-600 font-bold text-lg cursor-pointer"
              >
                &times;
              </button>
            </div>

            {editItinError && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{editItinError}</span>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Instructor *</label>
                <select
                  value={editItinForm.instructor_id}
                  onChange={(e) => setEditItinForm(prev => ({ ...prev, instructor_id: e.target.value }))}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-slate-900"
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
                <label className="block font-bold text-slate-700 mb-1">Estudiante *</label>
                <select
                  value={editItinForm.estudiante_id}
                  onChange={(e) => setEditItinForm(prev => ({ ...prev, estudiante_id: e.target.value }))}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-slate-900"
                  required
                >
                  {studentsList.map(st => {
                    const stElig = eligibilityMap[st.id];
                    const blocked = editingItinerary.tipo_evento === 'vuelo' && stElig && !stElig.eligible;
                    return (
                      <option key={st.id} value={st.id}>
                        {st.nombre}{blocked ? (stElig.hasZeroOrNegative ? ` — Sin saldo (Mín. $${minBalanceRequired.toFixed(2)})` : ` — Saldo < $${minBalanceRequired.toFixed(2)}`) : ''}
                      </option>
                    );
                  })}
                </select>
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">Aeronave *</label>
                <select
                  value={editItinForm.avion_matricula}
                  onChange={(e) => setEditItinForm(prev => ({ ...prev, avion_matricula: e.target.value }))}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-mono text-slate-900"
                  required
                >
                  {fleetMatriculas.map(mat => (
                    <option key={mat} value={mat}>
                      {mat}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">Fecha *</label>
                <input
                  type="date"
                  value={editItinForm.fecha}
                  onChange={(e) => setEditItinForm(prev => ({ ...prev, fecha: e.target.value }))}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-mono text-slate-900"
                  required
                />
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">Hora Inicio *</label>
                <input
                  type="time"
                  value={editItinForm.hora_inicio}
                  onChange={(e) => setEditItinForm(prev => ({ ...prev, hora_inicio: e.target.value }))}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-mono text-slate-900"
                  required
                />
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">Hora Fin *</label>
                <input
                  type="time"
                  value={editItinForm.hora_fin}
                  onChange={(e) => setEditItinForm(prev => ({ ...prev, hora_fin: e.target.value }))}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-mono text-slate-900"
                  required
                />
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">Ruta</label>
                <input
                  type="text"
                  value={editItinForm.ruta}
                  onChange={(e) => setEditItinForm(prev => ({ ...prev, ruta: e.target.value }))}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-slate-900"
                />
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">Misión *</label>
                <input
                  type="text"
                  value={editItinForm.mision}
                  onChange={(e) => setEditItinForm(prev => ({ ...prev, mision: e.target.value }))}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-slate-900"
                  required
                />
              </div>
              <div className="sm:col-span-2">
                <label className="block font-bold text-slate-700 mb-1">Notas / Detalles</label>
                <input
                  type="text"
                  value={editItinForm.detalles_evento}
                  onChange={(e) => setEditItinForm(prev => ({ ...prev, detalles_evento: e.target.value }))}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-slate-900"
                />
              </div>
            </div>

            {(() => {
              const editElig = editItinForm.estudiante_id ? eligibilityMap[editItinForm.estudiante_id] : undefined;
              const isEditBlocked = editingItinerary.tipo_evento === 'vuelo' && Boolean(editElig && !editElig.eligible);
              return (
                <>
                  {isEditBlocked && (
                    <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-[11px] flex items-start gap-2">
                      <ShieldAlert className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                      <span>
                        {editElig?.hasZeroOrNegative
                          ? `Estudiante sin saldo disponible. Requiere mínimo $${minBalanceRequired.toFixed(2)} USD para asignación de vuelo.`
                          : `El estudiante no alcanza el saldo mínimo requerido de $${minBalanceRequired.toFixed(2)} USD.`}
                      </span>
                    </div>
                  )}

                  <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={() => setEditingItinerary(null)}
                      className="px-4 py-2 font-semibold text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      disabled={editItinBusy || isEditBlocked}
                      className="px-5 py-2 font-semibold bg-sky-600 hover:bg-sky-700 text-white rounded-xl cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {editItinBusy ? 'Guardando...' : 'Guardar Cambios'}
                    </button>
                  </div>
                </>
              );
            })()}
          </form>
        </div>
      )}

      {/* MODAL: CONFIRMAR ELIMINACIÓN DE VUELO ACEPTADO */}
      {deletingItinerary && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-200 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-md w-full p-5 sm:p-6 shadow-xl border border-slate-200 space-y-4 text-xs">
            <div className="flex items-center gap-2 text-rose-600 font-bold text-sm">
              <Trash2 className="w-5 h-5" />
              <span>Eliminar Vuelo Aceptado</span>
            </div>
            <p className="text-slate-600 leading-relaxed">
              ¿Confirmas que deseas eliminar el vuelo <strong>{deletingItinerary.avion_matricula}</strong> del <strong>{deletingItinerary.fecha}</strong> ({deletingItinerary.hora_inicio} – {deletingItinerary.hora_fin}) con <strong>{deletingItinerary.estudiante_nombre}</strong>?
            </p>
            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setDeletingItinerary(null)}
                className="px-4 py-2 font-semibold text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={deleteItinBusy}
                onClick={async () => {
                  setDeleteItinBusy(true);
                  try {
                    await api.deleteItinerary(deletingItinerary.id, {
                      id: currentUser.id,
                      nombre: currentUser.nombre,
                      rol: currentUser.rol
                    });
                    setDeletingItinerary(null);
                    await loadItineraries();
                    if (onRefreshAll) onRefreshAll();
                  } catch (err: any) {
                    alert(err.message || 'No se pudo eliminar el vuelo.');
                  } finally {
                    setDeleteItinBusy(false);
                  }
                }}
                className="px-5 py-2 font-semibold bg-rose-600 hover:bg-rose-700 text-white rounded-xl cursor-pointer disabled:opacity-50"
              >
                {deleteItinBusy ? 'Eliminando...' : 'Confirmar Eliminación'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: CANCELACIÓN CON MOTIVO */}
      {cancellingItinerary && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-200 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-md w-full max-h-[90vh] overflow-y-auto my-auto p-5 sm:p-6 shadow-xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <XCircle className="w-5 h-5 text-rose-600" />
                <h3 className="font-bold text-slate-800 text-base">{t('cancelWithReason')}</h3>
              </div>
              <button
                onClick={() => setCancellingItinerary(null)}
                className="text-slate-400 hover:text-slate-600 font-bold text-lg cursor-pointer"
              >
                &times;
              </button>
            </div>

            <div className="p-3 bg-slate-50 rounded-xl text-xs space-y-1">
              <div><strong>Vuelo:</strong> {cancellingItinerary.fecha} ({cancellingItinerary.hora_inicio} - {cancellingItinerary.hora_fin})</div>
              <div><strong>Aeronave:</strong> {cancellingItinerary.avion_matricula}</div>
              <div><strong>PIC / Alumno:</strong> {cancellingItinerary.pic || cancellingItinerary.estudiante_nombre}</div>
            </div>

            {cancelError && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-600 flex-shrink-0" />
                <span>{cancelError}</span>
              </div>
            )}

            <form onSubmit={handleConfirmCancellation} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">
                  {t('cancellationReason')} *
                </label>
                <div className="flex flex-wrap gap-1 mb-2">
                  {[
                    'Entrada a Taller Imprevista (OMA)',
                    'Falla Mecánica / AOG',
                    'Daño Estructural / Revisión OMA',
                    'Discrepancia de Instrumentos / Aviónica',
                    'Inspección Extraordinaria Requerida',
                    'Meteorología Adversa'
                  ].map((motivo) => (
                    <button
                      key={motivo}
                      type="button"
                      onClick={() => setCancellationReason(motivo)}
                      className="text-[10px] px-2 py-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold border border-slate-300 transition-colors cursor-pointer"
                    >
                      {motivo}
                    </button>
                  ))}
                </div>
                <textarea
                  rows={3}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-rose-500"
                  placeholder={t('cancellationReasonPlaceholder')}
                  value={cancellationReason}
                  onChange={(e) => setCancellationReason(e.target.value)}
                  required
                />
              </div>

              {/* Opción de programar automáticamente bloque de taller imprevisto */}
              <label className="flex items-center gap-2 text-xs text-slate-700 font-semibold cursor-pointer p-2 bg-slate-50 rounded-xl border border-slate-200">
                <input
                  type="checkbox"
                  checked={createMaintSlotOnCancel}
                  onChange={(e) => setCreateMaintSlotOnCancel(e.target.checked)}
                  className="rounded text-rose-600 focus:ring-rose-500"
                />
                <span>Programar automáticamente bloque de Mantenimiento en Taller (AOG) en este horario</span>
              </label>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setCancellingItinerary(null)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
                >
                  {t('cancel')}
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-semibold bg-rose-600 hover:bg-rose-700 text-white rounded-xl shadow-xs cursor-pointer flex items-center gap-1.5"
                >
                  <Wrench className="w-3.5 h-3.5" />
                  <span>Confirmar Cancelación / Retiro</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL DEDICADO: SACAR AERONAVE DE LÍNEA DE VUELO (TALLER OMA / AOG) */}
      {showGroundModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-200 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-lg w-full p-5 sm:p-6 shadow-xl border border-rose-200 space-y-4 max-h-[90vh] overflow-y-auto my-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-rose-100 text-rose-700 rounded-lg">
                  <Wrench className="w-5 h-5 text-rose-600" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-base">
                    Retirar Aeronave de Línea de Vuelo
                  </h3>
                </div>
              </div>
              <button
                onClick={() => setShowGroundModal(false)}
                className="text-slate-400 hover:text-slate-600 font-bold text-lg cursor-pointer"
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleGroundAircraft} className="space-y-3.5 text-xs">

              {/* Matrícula y Fecha */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Aeronave Afectada (Matrícula) *
                  </label>
                  <select
                    value={groundMatricula}
                    onChange={(e) => setGroundMatricula(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-mono font-bold text-slate-900 cursor-pointer"
                    required
                  >
                    {fleetMatriculas.map(mat => (
                      <option key={mat} value={mat}>
                        {mat}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Fecha de Entrada a Taller *
                  </label>
                  <input
                    type="date"
                    value={groundDate}
                    onChange={(e) => setGroundDate(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-semibold text-slate-900 cursor-pointer"
                    required
                  />
                </div>
              </div>

              {/* Detección de vuelos programados para esta aeronave en esa fecha */}
              {(() => {
                const affected = itineraries.filter(itin =>
                  itin.avion_matricula === groundMatricula &&
                  itin.fecha === groundDate &&
                  itin.estado !== 'cancelado' &&
                  itin.estado !== 'no_show'
                );

                return (
                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="font-bold text-slate-800">
                        Vuelos Activos Programados ({affected.length}):
                      </span>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        affected.length > 0 ? 'bg-rose-100 text-rose-800' : 'bg-emerald-100 text-emerald-800'
                      }`}>
                        {affected.length > 0 ? 'Afecta Línea de Vuelo' : 'Sin Vuelos en Conflicto'}
                      </span>
                    </div>

                    {affected.length > 0 ? (
                      <div className="space-y-1 max-h-28 overflow-y-auto pr-1">
                        {affected.map(itin => (
                          <div key={itin.id} className="text-[11px] p-1.5 bg-white border border-slate-200 rounded-lg flex items-center justify-between">
                            <div>
                              <strong>{itin.hora_inicio} - {itin.hora_fin}</strong>: {itin.pic || itin.estudiante_nombre}
                              <span className="text-slate-500 ml-1">({itin.ruta || itin.mision})</span>
                            </div>
                            <span className="text-rose-600 font-bold text-[10px]">Será cancelado</span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-[11px] text-slate-500 italic">
                        No hay otros vuelos de instrucción confirmados para {groundMatricula} en esta fecha.
                      </p>
                    )}
                  </div>
                );
              })()}

              {/* Motivo de Daño / Discrepancia Técnica */}
              <div>
                <label className="block font-bold text-slate-800 mb-1">
                  Motivo de Retiro / Discrepancia Técnica *
                </label>
                <div className="flex flex-wrap gap-1 mb-2">
                  {[
                    'Entrada a Taller Imprevista (OMA)',
                    'Falla de Motor / Fuga de Aceite (AOG)',
                    'Daño Estructural / Revisión OMA',
                    'Discrepancia de Instrumentos / Aviónica',
                    'Inspección Extraordinaria Requerida',
                    'Fuga en Sistema de Frenos'
                  ].map(mot => (
                    <button
                      key={mot}
                      type="button"
                      onClick={() => setGroundReason(mot)}
                      className="text-[10px] px-2 py-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold border border-slate-300 transition-colors cursor-pointer"
                    >
                      {mot}
                    </button>
                  ))}
                </div>
                <textarea
                  rows={2}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 focus:outline-none focus:ring-1 focus:ring-rose-500"
                  value={groundReason}
                  onChange={(e) => setGroundReason(e.target.value)}
                  placeholder="Detalla el daño reportado, discrepancia técnica o razón de entrada imprevista..."
                  required
                />
              </div>

              {/* Opciones */}
              <div className="space-y-2 p-3 bg-slate-50 border border-slate-200 rounded-xl">
                <label className="flex items-center gap-2 font-semibold text-slate-800 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={groundCancelFlights}
                    onChange={(e) => setGroundCancelFlights(e.target.checked)}
                    className="rounded text-rose-600 focus:ring-rose-500"
                  />
                  <span>Cancelar automáticamente todos los vuelos programados para {groundMatricula} en la fecha</span>
                </label>

                <label className="flex items-center gap-2 font-semibold text-slate-800 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={groundCreateBlock}
                    onChange={(e) => setGroundCreateBlock(e.target.checked)}
                    className="rounded text-rose-600 focus:ring-rose-500"
                  />
                  <span>Crear bloqueo de "Mantenimiento Técnico en Taller (AOG)" en el itinerario semanal</span>
                </label>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowGroundModal(false)}
                  className="px-4 py-2 font-semibold text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
                  disabled={groundProcessing}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={groundProcessing}
                  className="px-5 py-2 font-bold bg-rose-600 hover:bg-rose-700 text-white rounded-xl shadow-xs cursor-pointer flex items-center gap-1.5"
                >
                  <Wrench className="w-4 h-4" />
                  <span>{groundProcessing ? 'Procesando Retiro...' : 'Confirmar Retiro de Línea'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: MARCAR NO SHOW */}
      {noShowItinerary && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-200 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-md w-full max-h-[90vh] overflow-y-auto my-auto p-5 sm:p-6 shadow-xl border border-slate-200 space-y-4">
            <div className="flex items-center gap-2 pb-3 border-b border-slate-100 text-rose-600">
              <UserX className="w-5 h-5" />
              <h3 className="font-bold text-slate-800 text-base">{t('markNoShowBtn')}</h3>
            </div>

            <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-900 space-y-1.5">
              <div className="font-bold">¿Deseas asentar "NO SHOW" para esta asignación?</div>
              <p>
                <strong>Alumno:</strong> {noShowItinerary.pic || noShowItinerary.estudiante_nombre}<br />
                <strong>Vuelo:</strong> {noShowItinerary.fecha} ({noShowItinerary.hora_inicio} - {noShowItinerary.hora_fin})<br />
                <strong>Aeronave:</strong> {noShowItinerary.avion_matricula}
              </p>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setNoShowItinerary(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
              >
                {t('cancel')}
              </button>
              <button
                onClick={handleConfirmNoShow}
                className="px-5 py-2 text-xs font-semibold bg-rose-600 hover:bg-rose-700 text-white rounded-xl shadow-xs cursor-pointer"
              >
                Asentar No Show
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE CONFIRMACIÓN OBLIGATORIA: GOOGLE CALENDAR SYNC */}
      <GoogleCalendarSyncModal
        isOpen={calendarSyncModalOpen}
        onClose={() => {
          setCalendarSyncModalOpen(false);
          setCalendarTargetItinerary(null);
        }}
        onConfirm={handleExecuteCalendarSync}
        itinerary={calendarTargetItinerary}
        studentUser={allUsers.find(u => u.id === calendarTargetItinerary?.estudiante_id)}
        instructorUser={allUsers.find(u => u.id === calendarTargetItinerary?.instructor_id)}
        isUpdating={!!calendarTargetItinerary?.google_calendar_event_id}
        isLoading={isCalendarSyncing}
      />
    </div>
  );
};
