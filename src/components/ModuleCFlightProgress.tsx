import React, { useState, useEffect } from 'react';
import { User, FlightProgress, GradeValue, FlightTimes, ManeuverChangeRecord } from '../types';
import { MANEUVERS_CATALOG, GRADE_CONFIG, ManeuverDefinition } from '../data/maneuvers';
import { ManeuverChangeLog } from './ManeuverChangeLog';
import { api } from '../services/api';
import { useLanguage } from '../i18n/LanguageContext';
import {
  BookOpen,
  Plus,
  Save,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Clock,
  Plane,
  FileCheck,
  Award,
  ChevronRight,
  ShieldCheck,
  Edit2,
  Trash2,
  Layers,
  Sparkles,
  Info,
  Calendar,
  History
} from 'lucide-react';

interface ModuleCFlightProgressProps {
  currentUser: User;
  allUsers: User[];
  preselectedSheetId?: string;
  onRefreshAll?: () => void;
}

export const ModuleCFlightProgress: React.FC<ModuleCFlightProgressProps> = ({
  currentUser,
  allUsers,
  preselectedSheetId,
  onRefreshAll
}) => {
  const { t, language } = useLanguage();
  const [flightSheets, setFlightSheets] = useState<FlightProgress[]>([]);
  const [selectedStudentId, setSelectedStudentId] = useState<string>('');
  const [activeSheetId, setActiveSheetId] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [isCreatingNew, setIsCreatingNew] = useState<boolean>(false);

  // Formulario de Hoja de Progreso
  const [leccionNum, setLeccionNum] = useState<number>(1);
  const [fechaVuelo, setFechaVuelo] = useState<string>(new Date().toISOString().split('T')[0]);
  const [matricula, setMatricula] = useState<string>('HP-1822');
  const [tipoAvion, setTipoAvion] = useState<string>('Piper PA-44-180 Seminole (Multi-Motor)');
  const [curso, setCurso] = useState<'Multi-Motor' | 'Comercial' | 'Privado' | 'IFR'>('Multi-Motor');
  const [instructorId, setInstructorId] = useState<string>('');
  const [observaciones, setObservaciones] = useState<string>('');
  const [evaluaciones, setEvaluaciones] = useState<Record<string, GradeValue>>({});
  const [historialManiobras, setHistorialManiobras] = useState<ManeuverChangeRecord[]>([]);
  const [selectedManeuverForLog, setSelectedManeuverForLog] = useState<string | null>(null);

  // Tiempos de Vuelo
  const [vueloDual, setVueloDual] = useState<number>(1.5);
  const [vueloIfr, setVueloIfr] = useState<number>(0.0);
  const [dualTravesia, setDualTravesia] = useState<number>(0.0);
  const [soloTravesia, setSoloTravesia] = useState<number>(0.0);
  const [vueloDia, setVueloDia] = useState<number>(1.5);
  const [vueloNoche, setVueloNoche] = useState<number>(0.0);
  const [vueloActual, setVueloActual] = useState<number>(1.5);
  const [horasAnteriores, setHorasAnteriores] = useState<number>(0.0);

  // Estado de mensajes y cascada
  const [saveSuccessMsg, setSaveSuccessMsg] = useState<string>('');
  const [cascadeInfo, setCascadeInfo] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string>('');

  const isStudent = currentUser.rol === 'estudiante';
  const isInstructor = currentUser.rol === 'instructor' || currentUser.rol === 'instructor_en_jefe';
  const isAdmin = currentUser.rol === 'admin';
  const isAccounting = currentUser.rol === 'contabilidad';

  // Permisos: Solo Instructores y Admin pueden editar y certificar hojas de vuelo.
  // El estudiante no aprueba hojas de progreso ni se le exige firma.
  const canEditPermanently = !isStudent && (isAdmin || isInstructor);

  const studentsList = allUsers.filter(u => u.rol === 'estudiante');
  const instructorsList = allUsers.filter(u => u.rol === 'instructor' || u.rol === 'instructor_en_jefe');

  // Determinar alumno activo
  useEffect(() => {
    if (isStudent) {
      setSelectedStudentId(currentUser.id);
    } else if (studentsList.length > 0 && !selectedStudentId) {
      setSelectedStudentId(studentsList[0].id);
    }
  }, [currentUser, studentsList]);

  // Cargar hojas de vuelo del alumno
  const loadFlightSheets = async () => {
    if (!selectedStudentId) return;
    setLoading(true);
    try {
      const sheets = await api.getFlightProgress(selectedStudentId);
      setFlightSheets(sheets);

      if (preselectedSheetId) {
        const found = sheets.find(s => s.id === preselectedSheetId);
        if (found) {
          loadSheetIntoForm(found, sheets);
          return;
        }
      }

      if (sheets.length > 0 && !activeSheetId && !isCreatingNew) {
        loadSheetIntoForm(sheets[sheets.length - 1], sheets);
      } else if (sheets.length === 0) {
        startNewSheet(sheets);
      }
    } catch (err) {
      console.error('Error al cargar hojas de vuelo:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadFlightSheets();
  }, [selectedStudentId]);

  // Cargar hoja existente en el formulario
  const loadSheetIntoForm = (sheet: FlightProgress, allCurrentSheets: FlightProgress[]) => {
    setActiveSheetId(sheet.id);
    setIsCreatingNew(false);
    setLeccionNum(sheet.leccion_num);
    setFechaVuelo(sheet.fecha);
    setMatricula(sheet.matricula);
    setTipoAvion(sheet.tipo_avion);
    setCurso(sheet.curso);
    setInstructorId(sheet.instructor_id);
    setObservaciones(sheet.observaciones || '');
    setEvaluaciones(sheet.evaluacion_maniobras || {});

    // Cargar historial de cambios o generar trazabilidad inicial basada en calificaciones
    if (sheet.historial_maniobras && sheet.historial_maniobras.length > 0) {
      setHistorialManiobras(sheet.historial_maniobras);
    } else {
      const initialLogs: ManeuverChangeRecord[] = [];
      const instUser = allUsers.find(u => u.id === sheet.instructor_id);
      const instName = instUser ? instUser.nombre : (sheet.instructor_nombre || 'Instructor de Vuelo');
      const timestamp = sheet.fecha_validacion || sheet.actualizado_en || sheet.creado_en || new Date().toISOString();

      if (sheet.evaluacion_maniobras) {
        Object.entries(sheet.evaluacion_maniobras).forEach(([mId, grade]) => {
          if (grade !== 'N/A') {
            const def = MANEUVERS_CATALOG.find(m => m.id === mId);
            initialLogs.push({
              id: `mchange_init_${sheet.id}_${mId}`,
              maniobra_id: mId,
              maniobra_nombre: def?.nombre || mId,
              calificacion_anterior: 'N/A',
              calificacion_nueva: grade,
              modificado_por_id: sheet.instructor_id || currentUser.id,
              modificado_por_nombre: instName,
              modificado_por_rol: 'instructor',
              fecha_modificacion: timestamp,
              leccion_num: sheet.leccion_num,
              motivo: sheet.estado === 'aprobado' ? 'Validación y certificación de lección' : 'Evaluación inicial de vuelo'
            });
          }
        });
      }
      setHistorialManiobras(initialLogs);
    }

    // Tiempos
    const t = sheet.tiempos_vuelo;
    setVueloDual(t.vuelo_dual || 0);
    setVueloIfr(t.vuelo_ifr || 0);
    setDualTravesia(t.dual_travesia || 0);
    setSoloTravesia(t.solo_travesia || 0);
    setVueloDia(t.dia || 0);
    setVueloNoche(t.noche || 0);
    setVueloActual(t.vuelo_actual || 0);
    setHorasAnteriores(t.horas_anteriores || 0);
  };

  // Iniciar una nueva hoja con autocompletado de horas anteriores
  const startNewSheet = (currentSheets: FlightProgress[]) => {
    setIsCreatingNew(true);
    setActiveSheetId(null);
    setHistorialManiobras([]);
    setSelectedManeuverForLog(null);

    // Buscar lección previa cronológica para autocompletar Horas_Anteriores
    const sorted = [...currentSheets].sort((a, b) => new Date(a.fecha).getTime() - new Date(b.fecha).getTime());
    let prevTotal = 0.0;
    let nextLeccion = 1;

    if (sorted.length > 0) {
      const last = sorted[sorted.length - 1];
      prevTotal = last.tiempos_vuelo.total_horas;
      nextLeccion = last.leccion_num + 1;
    }

    setLeccionNum(nextLeccion);
    setFechaVuelo(new Date().toISOString().split('T')[0]);
    setMatricula('HP-1822');
    setTipoAvion('Piper PA-44-180 Seminole (Multi-Motor)');
    setCurso('Multi-Motor');
    setInstructorId(instructorsList[0]?.id || '');
    setObservaciones('');

    // Evaluaciones por defecto a 'N/A'
    const initialGrades: Record<string, GradeValue> = {};
    MANEUVERS_CATALOG.forEach(m => {
      initialGrades[m.id] = 'N/A';
    });
    setEvaluaciones(initialGrades);

    // Tiempos
    setHorasAnteriores(Number(prevTotal.toFixed(2)));
    setVueloDual(1.5);
    setVueloIfr(0.5);
    setDualTravesia(0.0);
    setSoloTravesia(0.0);
    setVueloDia(1.5);
    setVueloNoche(0.0);
    setVueloActual(1.5);
  };

  // Cálculo en tiempo real Total_Horas = Vuelo_Actual + Horas_Anteriores
  const totalHorasCalculadas = Number((horasAnteriores + vueloActual).toFixed(2));

  // Manejador de cambio de calificación de maniobra con trazabilidad en ChangeLog
  const handleGradeChange = (maneuverId: string, grade: GradeValue) => {
    const prevGrade = evaluaciones[maneuverId] || 'N/A';
    setEvaluaciones(prev => ({
      ...prev,
      [maneuverId]: grade
    }));

    if (prevGrade !== grade) {
      const def = MANEUVERS_CATALOG.find(m => m.id === maneuverId);
      const newRecord: ManeuverChangeRecord = {
        id: `mchange_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
        maniobra_id: maneuverId,
        maniobra_nombre: def?.nombre || maneuverId,
        calificacion_anterior: prevGrade,
        calificacion_nueva: grade,
        modificado_por_id: currentUser.id,
        modificado_por_nombre: currentUser.nombre,
        modificado_por_rol: currentUser.rol,
        fecha_modificacion: new Date().toISOString(),
        leccion_num: leccionNum,
        motivo: isInstructor
          ? 'Evaluación directa de maniobra por instructor'
          : `Actualización de calificación a ${grade}`
      };

      setHistorialManiobras(prev => [newRecord, ...prev]);
      setSelectedManeuverForLog(maneuverId);
    }
  };

  const handleSetAllGrades = (grade: GradeValue) => {
    const updated: Record<string, GradeValue> = {};
    const batchRecords: ManeuverChangeRecord[] = [];
    const timestamp = new Date().toISOString();

    MANEUVERS_CATALOG.forEach(m => {
      const prevGrade = evaluaciones[m.id] || 'N/A';
      updated[m.id] = grade;
      if (prevGrade !== grade) {
        batchRecords.push({
          id: `mchange_batch_${Date.now()}_${m.id}`,
          maniobra_id: m.id,
          maniobra_nombre: m.nombre,
          calificacion_anterior: prevGrade,
          calificacion_nueva: grade,
          modificado_por_id: currentUser.id,
          modificado_por_nombre: currentUser.nombre,
          modificado_por_rol: currentUser.rol,
          fecha_modificacion: timestamp,
          leccion_num: leccionNum,
          motivo: `Ajuste masivo de calificaciones a '${grade}'`
        });
      }
    });

    setEvaluaciones(updated);
    if (batchRecords.length > 0) {
      setHistorialManiobras(prev => [...batchRecords, ...prev]);
    }
  };

  // Guardar Hoja de Progreso
  const handleSaveFlightSheet = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setErrorMsg('');
    setSaveSuccessMsg('');
    setCascadeInfo('');

    if (!selectedStudentId) {
      setErrorMsg('Selecciona un estudiante.');
      return;
    }
    if (!instructorId) {
      setErrorMsg('Selecciona el instructor de vuelo.');
      return;
    }

    const currentSheetObj: Partial<FlightProgress> = {
      id: activeSheetId || undefined,
      estudiante_id: selectedStudentId,
      instructor_id: instructorId,
      leccion_num: leccionNum,
      fecha: fechaVuelo,
      matricula,
      tipo_avion: tipoAvion,
      curso,
      observaciones,
      evaluacion_maniobras: evaluaciones,
      historial_maniobras: historialManiobras,
      ultima_modificacion_maniobra: historialManiobras.length > 0 ? historialManiobras[0] : undefined,
      tiempos_vuelo: {
        vuelo_dual: vueloDual,
        vuelo_ifr: vueloIfr,
        dual_travesia: dualTravesia,
        solo_travesia: soloTravesia,
        dia: vueloDia,
        noche: vueloNoche,
        vuelo_actual: vueloActual,
        horas_anteriores: horasAnteriores,
        total_horas: totalHorasCalculadas
      },
      firma_estudiante: true,
      firma_instructor: isInstructor ? true : (activeSheet?.firma_instructor || false),
      estado: isInstructor ? 'aprobado' : (activeSheet?.estado || 'pendiente_validacion')
    };

    try {
      const saved = await api.saveFlightProgress(currentSheetObj);
      setSaveSuccessMsg(`¡Hoja de Progreso Lección #${saved.leccion_num} guardada exitosamente!`);

      // Recargar y actualizar datos
      const refreshed = await api.getFlightProgress(selectedStudentId);
      setFlightSheets(refreshed);
      setActiveSheetId(saved.id);
      setIsCreatingNew(false);

      if (onRefreshAll) onRefreshAll();
    } catch (err: any) {
      setErrorMsg(err.message || 'Error al guardar la hoja de vuelo');
    }
  };

  // Disparar Recalculación en Cascada explícita
  const handleTriggerCascadeRecalculation = async () => {
    if (!selectedStudentId) return;
    setLoading(true);
    try {
      const res = await api.triggerCascadeRecalculation(selectedStudentId);
      setCascadeInfo(`Recalculación en cascada exitosa: ${res.records.length} vuelos auditados y sincronizados con bitácora.`);
      setFlightSheets(res.records);
      if (activeSheetId) {
        const found = res.records.find(r => r.id === activeSheetId);
        if (found) loadSheetIntoForm(found, res.records);
      }
      if (onRefreshAll) onRefreshAll();
    } catch (err: any) {
      setErrorMsg('Error en recálculo: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  // Validación y Firma por parte del Instructor
  const handleValidateAsInstructor = async () => {
    if (!activeSheetId) return;
    try {
      await api.validateFlightProgress(activeSheetId, currentUser.id);
      setSaveSuccessMsg('¡Hoja de vuelo validada y firmada digitalmente por el Instructor!');
      loadFlightSheets();
      if (onRefreshAll) onRefreshAll();
    } catch (err: any) {
      setErrorMsg(err.message || 'Error al firmar hoja de vuelo');
    }
  };

  // Separar maniobras por columna
  const col1Maneuvers = MANEUVERS_CATALOG.filter(m => m.columna === 1);
  const col2Maneuvers = MANEUVERS_CATALOG.filter(m => m.columna === 2);
  const col3Maneuvers = MANEUVERS_CATALOG.filter(m => m.columna === 3);

  const activeSheet = flightSheets.find(s => s.id === activeSheetId);

  if (isAccounting) {
    return (
      <div className="bg-white dark:bg-slate-900 p-8 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm text-center max-w-lg mx-auto my-12 space-y-4">
        <div className="w-14 h-14 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-600 dark:text-rose-400 flex items-center justify-center mx-auto">
          <AlertTriangle className="w-7 h-7" />
        </div>
        <h2 className="text-base font-bold text-slate-900 dark:text-white">
          Acceso Restringido a Hoja de Progreso de Vuelo
        </h2>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* HEADER Y SELECCIÓN DE ALUMNO / NUEVO VUELO (COMPACTO) */}
      <div className="bg-white p-3.5 sm:p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <BookOpen className="w-5 h-5 text-sky-600" />
          <h1 className="text-base sm:text-lg font-bold text-slate-800">
            Hoja de Progreso de Vuelo
          </h1>
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto">
          {!isStudent && (
            <div className="flex items-center gap-1.5 text-xs bg-slate-50 px-2.5 py-1.5 rounded-xl border border-slate-200 flex-1 md:flex-initial">
              <span className="font-semibold text-slate-600">Alumno:</span>
              <select
                className="bg-white text-slate-800 font-semibold px-2 py-0.5 rounded-lg border border-slate-300 focus:outline-none"
                value={selectedStudentId}
                onChange={(e) => setSelectedStudentId(e.target.value)}
              >
                {studentsList.map(s => (
                  <option key={s.id} value={s.id}>{s.nombre}</option>
                ))}
              </select>
            </div>
          )}

          {!isStudent && (
            <button
              onClick={() => startNewSheet(flightSheets)}
              className="px-3 py-1.5 bg-sky-600 hover:bg-sky-700 text-white text-xs font-bold rounded-xl shadow-xs flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
            >
              <Plus className="w-4 h-4" />
              <span>Nueva Lección</span>
            </button>
          )}
        </div>
      </div>



      {/* ALERTAS Y NOTIFICACIONES */}
      {saveSuccessMsg && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs font-medium flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 flex-shrink-0 text-emerald-600" />
          <span>{saveSuccessMsg}</span>
        </div>
      )}

      {cascadeInfo && (
        <div className="p-3 bg-sky-50 border border-sky-200 rounded-xl text-sky-800 text-xs font-medium flex items-center gap-2">
          <Sparkles className="w-4 h-4 flex-shrink-0 text-sky-600" />
          <span>{cascadeInfo}</span>
        </div>
      )}

      {errorMsg && (
        <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs font-medium flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 flex-shrink-0 text-rose-600" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* LISTA DE LECCIONES DEL ALUMNO (TIMELINE HORIZONTAL COMPACTO) */}
      <div className="bg-white p-3 rounded-2xl border border-slate-200 shadow-xs">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-1.5">
            <Layers className="w-4 h-4 text-sky-600" />
            <span className="text-xs font-bold uppercase tracking-wider text-slate-700">Expediente de Vuelos</span>
          </div>
          <button
            onClick={handleTriggerCascadeRecalculation}
            className="flex items-center gap-1 text-[11px] font-semibold text-sky-700 bg-sky-50 hover:bg-sky-100 px-2 py-0.5 rounded-lg border border-sky-200 transition-colors cursor-pointer"
            title="Recalcula en cadena Horas Anteriores y Total de todos los vuelos"
          >
            <RefreshCw className="w-3 h-3" />
            <span>Recalcular Cascada</span>
          </button>
        </div>

        <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar">
          {flightSheets.map((sheet) => {
            const isSelected = activeSheetId === sheet.id && !isCreatingNew;
            return (
              <button
                key={sheet.id}
                onClick={() => loadSheetIntoForm(sheet, flightSheets)}
                className={`p-3 rounded-xl border text-left min-w-[170px] flex-shrink-0 transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-sky-50 border-sky-500 ring-2 ring-sky-500/20 shadow-xs'
                    : 'bg-slate-50 hover:bg-slate-100 border-slate-200'
                }`}
              >
                <div className="flex justify-between items-center text-xs">
                  <span className="font-bold text-slate-900">Lección #{sheet.leccion_num}</span>
                  <span className={`px-1.5 py-0.2 rounded text-[10px] font-bold ${
                    sheet.estado === 'aprobado' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                  }`}>
                    {sheet.estado === 'aprobado' ? 'Validado' : 'Pendiente'}
                  </span>
                </div>
                <div className="text-[11px] text-slate-500 mt-1">{sheet.fecha}</div>
                <div className="text-xs font-semibold text-slate-700 mt-0.5">{sheet.tipo_avion.split(' ')[0]}</div>
                <div className="text-[11px] text-sky-700 font-bold mt-1">
                  Tot: {sheet.tiempos_vuelo.total_horas.toFixed(1)} hrs
                </div>
              </button>
            );
          })}

          {flightSheets.length === 0 && (
            <div className="text-xs text-slate-400 py-3">
              Sin vuelos registrados.
            </div>
          )}
        </div>
      </div>

      {/* FORMULARIO PRINCIPAL DE LA HOJA DE PROGRESO */}
      <form onSubmit={(e) => handleSaveFlightSheet(e)} className="space-y-6">
        {/* ENCABEZADO DE LA HOJA (DATOS OPERACIONALES) */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <span className="w-8 h-8 rounded-lg bg-sky-600 text-white font-extrabold flex items-center justify-center text-sm shadow-xs">
                #{leccionNum}
              </span>
              <div>
                <h2 className="text-base font-bold text-slate-800">
                  {isCreatingNew ? 'Nueva Hoja de Progreso de Vuelo' : `Edición Hoja de Progreso - Lección #${leccionNum}`}
                </h2>
                <p className="text-xs text-slate-500">
                  {activeSheet?.estado === 'aprobado' ? 'Validado por Instructor' : 'Borrador / Pendiente de Validación'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {isInstructor && activeSheet?.estado === 'pendiente_validacion' && (
                <button
                  type="button"
                  onClick={handleValidateAsInstructor}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs rounded-lg shadow-sm flex items-center gap-1.5 cursor-pointer"
                >
                  <FileCheck className="w-4 h-4" />
                  <span>Validar y Firmar Hoja</span>
                </button>
              )}

              <button
                type="submit"
                id="btn-guardar-hoja"
                className="px-5 py-2 bg-sky-600 hover:bg-sky-700 text-white font-semibold text-xs rounded-lg shadow-sm flex items-center gap-1.5 cursor-pointer"
              >
                <Save className="w-4 h-4" />
                <span>Guardar Hoja de Progreso</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 text-xs">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Número de Lección *</label>
              <input
                type="number"
                min="1"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg font-bold text-slate-800 focus:bg-white focus:outline-none"
                value={leccionNum}
                onChange={(e) => setLeccionNum(parseInt(e.target.value) || 1)}
                required
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Fecha del Vuelo *</label>
              <input
                type="date"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-800 focus:bg-white focus:outline-none"
                value={fechaVuelo}
                onChange={(e) => setFechaVuelo(e.target.value)}
                required
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Curso / Habilitación *</label>
              <select
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg font-medium text-slate-800 focus:bg-white focus:outline-none"
                value={curso}
                onChange={(e) => setCurso(e.target.value as any)}
              >
                <option value="Multi-Motor">Multi-Motor (Bimotor)</option>
                <option value="Comercial">Piloto Comercial (CPL)</option>
                <option value="Privado">Piloto Privado (PPL)</option>
                <option value="IFR">Habilitación de Instrumentos (IFR)</option>
              </select>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Aeronave & Matrícula *</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Matrícula"
                  className="w-1/3 px-2 py-2 bg-slate-50 border border-slate-300 rounded-lg font-mono font-bold text-slate-800"
                  value={matricula}
                  onChange={(e) => setMatricula(e.target.value)}
                  required
                />
                <select
                  className="w-2/3 px-2 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-800 text-xs"
                  value={tipoAvion}
                  onChange={(e) => setTipoAvion(e.target.value)}
                >
                  <option value="Piper PA-44-180 Seminole (Multi-Motor)">PA-44 Seminole (Multi-Motor)</option>
                  <option value="Piper PA-34 Seneca (Multi-Motor)">PA-34 Seneca (Multi-Motor)</option>
                  <option value="Cessna 172 Skyhawk">Cessna 172 Skyhawk</option>
                  <option value="Piper PA-28 Archer">Piper PA-28 Archer</option>
                  <option value="Simulador Redbird FMX">Simulador Redbird FMX</option>
                </select>
              </div>
            </div>

            <div className="sm:col-span-2">
              <label className="block font-semibold text-slate-700 mb-1">Instructor de Vuelo Asignado (CFI) *</label>
              <select
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg font-medium text-slate-800 focus:bg-white focus:outline-none"
                value={instructorId}
                onChange={(e) => setInstructorId(e.target.value)}
                required
              >
                {instructorsList.map(inst => (
                  <option key={inst.id} value={inst.id}>
                    {inst.nombre} ({inst.licencia || 'CFI'})
                  </option>
                ))}
              </select>
            </div>

            <div className="sm:col-span-2">
              <label className="block font-semibold text-slate-700 mb-1">Observaciones / Debriefing del Vuelo</label>
              <input
                type="text"
                placeholder="ej: Maniobras monomotor satisfactorias. Buena gestión de velocidad Vmc."
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-800 focus:bg-white focus:outline-none"
                value={observaciones}
                onChange={(e) => setObservaciones(e.target.value)}
              />
            </div>
          </div>
        </div>

        {/* TABLA MATEMÁTICA DE TIEMPOS DE VUELO ADAPTADA A MÓVILES (EFECTO CASCADA) */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-sky-600" />
              <h3 className="font-bold text-slate-800 text-base">Tiempos de Vuelo</h3>
            </div>

            <div className="text-xs bg-slate-100 px-3 py-1.5 rounded-lg border border-slate-200 text-slate-700 font-mono tabular-nums">
              {horasAnteriores.toFixed(2)} + {vueloActual.toFixed(2)} = <strong>{totalHorasCalculadas.toFixed(2)} hrs</strong>
            </div>
          </div>

          {/* Grid de Inputs de Horas */}
          <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-8 gap-3 text-xs">
            <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200">
              <label className="block font-semibold text-slate-600 text-[11px] mb-1">Vuelo Dual</label>
              <input
                type="number"
                step="0.1"
                min="0"
                className="w-full px-2 py-1 bg-white border border-slate-300 rounded text-center font-bold text-slate-800"
                value={vueloDual}
                onChange={(e) => {
                  const val = parseFloat(e.target.value) || 0;
                  setVueloDual(val);
                  setVueloActual(val);
                  setVueloDia(val);
                }}
              />
            </div>

            <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200">
              <label className="block font-semibold text-slate-600 text-[11px] mb-1">Vuelo IFR</label>
              <input
                type="number"
                step="0.1"
                min="0"
                className="w-full px-2 py-1 bg-white border border-slate-300 rounded text-center font-bold text-slate-800"
                value={vueloIfr}
                onChange={(e) => setVueloIfr(parseFloat(e.target.value) || 0)}
              />
            </div>

            <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200">
              <label className="block font-semibold text-slate-600 text-[11px] mb-1">Dual Travesía</label>
              <input
                type="number"
                step="0.1"
                min="0"
                className="w-full px-2 py-1 bg-white border border-slate-300 rounded text-center font-bold text-slate-800"
                value={dualTravesia}
                onChange={(e) => setDualTravesia(parseFloat(e.target.value) || 0)}
              />
            </div>

            <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200">
              <label className="block font-semibold text-slate-600 text-[11px] mb-1">Solo Travesía</label>
              <input
                type="number"
                step="0.1"
                min="0"
                className="w-full px-2 py-1 bg-white border border-slate-300 rounded text-center font-bold text-slate-800"
                value={soloTravesia}
                onChange={(e) => setSoloTravesia(parseFloat(e.target.value) || 0)}
              />
            </div>

            <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200">
              <label className="block font-semibold text-slate-600 text-[11px] mb-1">Día</label>
              <input
                type="number"
                step="0.1"
                min="0"
                className="w-full px-2 py-1 bg-white border border-slate-300 rounded text-center font-bold text-slate-800"
                value={vueloDia}
                onChange={(e) => setVueloDia(parseFloat(e.target.value) || 0)}
              />
            </div>

            <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200">
              <label className="block font-semibold text-slate-600 text-[11px] mb-1">Noche</label>
              <input
                type="number"
                step="0.1"
                min="0"
                className="w-full px-2 py-1 bg-white border border-slate-300 rounded text-center font-bold text-slate-800"
                value={vueloNoche}
                onChange={(e) => setVueloNoche(parseFloat(e.target.value) || 0)}
              />
            </div>

            {/* Horas Anteriores (Autocompletado editable) */}
            <div className="bg-amber-50/70 p-2.5 rounded-xl border border-amber-200">
              <label className="block font-semibold text-amber-800 text-[11px] mb-1">Horas Anteriores</label>
              <input
                type="number"
                step="0.1"
                min="0"
                className="w-full px-2 py-1 bg-white border border-amber-300 rounded text-center font-bold text-amber-900"
                value={horasAnteriores}
                onChange={(e) => setHorasAnteriores(parseFloat(e.target.value) || 0)}
                title="Horas acumuladas antes de esta lección"
              />
            </div>

            {/* Total Horas Resultante */}
            <div className="bg-sky-600 p-2.5 rounded-xl text-white shadow-xs">
              <label className="block font-bold text-sky-100 text-[11px] mb-1">TOTAL HORAS</label>
              <div className="text-base font-extrabold text-center py-0.5">
                {totalHorasCalculadas.toFixed(2)}
              </div>
            </div>
          </div>
        </div>

        {/* CUADRÍCULA RESPONSIVA DE LAS 32 MANIOBRAS OBLIGATORIAS EN 3 COLUMNAS */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <Award className="w-5 h-5 text-sky-600" />
              <h3 className="font-bold text-slate-800 text-base">Evaluación de Maniobras</h3>
            </div>

            {!isStudent && (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleSetAllGrades('S')}
                  className="px-2.5 py-1 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-300 rounded text-xs font-semibold transition-colors cursor-pointer"
                >
                  Todas Satisfactorias (S)
                </button>
                <button
                  type="button"
                  onClick={() => handleSetAllGrades('N/A')}
                  className="px-2.5 py-1 bg-slate-100 text-slate-600 hover:bg-slate-200 border border-slate-300 rounded text-xs font-semibold transition-colors cursor-pointer"
                >
                  Resetear a N/A
                </button>
              </div>
            )}
          </div>

          {/* Grid de 3 Columnas Reglamentarias */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            {/* COLUMNA 1 */}
            <div className="space-y-3">
              <div className="bg-slate-100 px-3 py-2 rounded-lg border border-slate-200 font-bold text-xs text-slate-800 uppercase tracking-wider flex justify-between items-center">
                <span>{language === 'en' ? 'Column 1: Basic & Ground' : 'Columna 1: Básico & Maniobras'}</span>
                <span className="text-[11px] text-slate-500">({col1Maneuvers.length})</span>
              </div>

              <div className="space-y-2">
                {col1Maneuvers.map(m => (
                  <ManeuverRow
                    key={m.id}
                    maneuver={m}
                    currentGrade={evaluaciones[m.id] || 'N/A'}
                    onGradeChange={handleGradeChange}
                    onInspectChangeLog={id => setSelectedManeuverForLog(id)}
                    isSelectedForLog={selectedManeuverForLog === m.id}
                    language={language}
                    readOnly={isStudent}
                  />
                ))}
              </div>
            </div>

            {/* COLUMNA 2 */}
            <div className="space-y-3">
              <div className="bg-slate-100 px-3 py-2 rounded-lg border border-slate-200 font-bold text-xs text-slate-800 uppercase tracking-wider flex justify-between items-center">
                <span>{language === 'en' ? 'Column 2: Pattern & Emergencies' : 'Columna 2: Tránsito & Emergencias'}</span>
                <span className="text-[11px] text-slate-500">({col2Maneuvers.length})</span>
              </div>

              <div className="space-y-2">
                {col2Maneuvers.map(m => (
                  <ManeuverRow
                    key={m.id}
                    maneuver={m}
                    currentGrade={evaluaciones[m.id] || 'N/A'}
                    onGradeChange={handleGradeChange}
                    onInspectChangeLog={id => setSelectedManeuverForLog(id)}
                    isSelectedForLog={selectedManeuverForLog === m.id}
                    language={language}
                    readOnly={isStudent}
                  />
                ))}
              </div>
            </div>

            {/* COLUMNA 3 */}
            <div className="space-y-3">
              <div className="bg-slate-100 px-3 py-2 rounded-lg border border-slate-200 font-bold text-xs text-slate-800 uppercase tracking-wider flex justify-between items-center">
                <span>{language === 'en' ? 'Column 3: IFR, Multi-Engine & Special' : 'Columna 3: IFR, Multi-Motor & Especial'}</span>
                <span className="text-[11px] text-slate-500">({col3Maneuvers.length})</span>
              </div>

              <div className="space-y-2">
                {col3Maneuvers.map(m => (
                  <ManeuverRow
                    key={m.id}
                    maneuver={m}
                    currentGrade={evaluaciones[m.id] || 'N/A'}
                    onGradeChange={handleGradeChange}
                    onInspectChangeLog={id => setSelectedManeuverForLog(id)}
                    isSelectedForLog={selectedManeuverForLog === m.id}
                    language={language}
                    readOnly={isStudent}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* COMPONENTE CHANGELOG DE TRAZABILIDAD REGULATORIA DE MANIOBRAS */}
        <ManeuverChangeLog
          historial={historialManiobras}
          activeSheet={activeSheet}
          maneuversCatalog={MANEUVERS_CATALOG}
          selectedManeuverId={selectedManeuverForLog}
          onSelectManeuver={setSelectedManeuverForLog}
          currentUser={currentUser}
          language={language}
        />

        {/* PIE DE PÁGINA: CERTIFICACIÓN DE INSTRUCCIÓN Y ACCIÓN DE GUARDADO */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-4 text-xs text-slate-600">
            <div className="flex items-center gap-2">
              {activeSheet?.firma_instructor ? (
                <>
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                  <span>Instructor CFI: <strong className="text-emerald-700">Firmado</strong></span>
                </>
              ) : (
                <>
                  <Clock className="w-5 h-5 text-amber-500 shrink-0" />
                  <span>Instructor CFI: <strong className="text-amber-700">Pendiente de Firma</strong></span>
                </>
              )}
            </div>
          </div>

          <div className="flex items-center gap-3 w-full md:w-auto justify-end">
            {!isStudent && (
              <button
                type="button"
                onClick={handleTriggerCascadeRecalculation}
                className="px-4 py-2.5 text-xs font-semibold text-sky-700 bg-sky-50 hover:bg-sky-100 border border-sky-200 rounded-xl transition-colors cursor-pointer"
              >
                Auditar Cascada
              </button>
            )}

            {!isStudent && (
              <button
                type="submit"
                className="px-6 py-2.5 bg-sky-600 hover:bg-sky-700 text-white font-semibold text-xs rounded-xl shadow-sm transition-colors cursor-pointer flex items-center gap-2"
              >
                <Save className="w-4 h-4" />
                <span>Guardar Hoja de Progreso</span>
              </button>
            )}
          </div>
        </div>
      </form>
    </div>
  );
};

// Sub-componente para cada fila de maniobra con selectores táctiles D, S, N, N/A y acceso a trazabilidad
interface ManeuverRowProps {
  maneuver: ManeuverDefinition;
  currentGrade: GradeValue;
  onGradeChange: (id: string, grade: GradeValue) => void;
  onInspectChangeLog?: (id: string) => void;
  isSelectedForLog?: boolean;
  language: 'es' | 'en';
  readOnly?: boolean;
}

const ManeuverRow: React.FC<ManeuverRowProps> = ({
  maneuver,
  currentGrade,
  onGradeChange,
  onInspectChangeLog,
  isSelectedForLog,
  language,
  readOnly
}) => {
  const grades: GradeValue[] = ['D', 'S', 'N', 'N/A'];
  const name = language === 'en' && maneuver.nombre_en ? maneuver.nombre_en : maneuver.nombre;
  const description = language === 'en' && maneuver.descripcion_en ? maneuver.descripcion_en : maneuver.descripcion;

  return (
    <div
      className={`p-2.5 rounded-xl border flex items-center justify-between gap-2 text-xs transition-all ${
        isSelectedForLog
          ? 'bg-sky-50 border-sky-300 ring-2 ring-sky-400/20 shadow-xs'
          : 'bg-slate-50/70 hover:bg-slate-50 border-slate-200/90'
      }`}
    >
      <div className="flex-1 min-w-0 pr-1">
        <div className="flex items-center gap-1.5">
          <span className="font-semibold text-slate-800 truncate" title={name}>
            {name}
          </span>
          {onInspectChangeLog && (
            <button
              type="button"
              onClick={() => onInspectChangeLog(maneuver.id)}
              className={`p-0.5 rounded text-[10px] transition-colors cursor-pointer ${
                isSelectedForLog
                  ? 'text-sky-700 bg-sky-200/60'
                  : 'text-slate-400 hover:text-sky-600 hover:bg-slate-200/60'
              }`}
              title="Inspeccionar trazabilidad y auditoría de esta maniobra"
            >
              <History className="w-3 h-3" />
            </button>
          )}
        </div>
        <div className="text-[10px] text-slate-400 truncate" title={description}>
          {description}
        </div>
      </div>

      {/* Selectores táctiles */}
      <div className="flex items-center gap-1 flex-shrink-0">
        {grades.map(g => {
          const isSelected = currentGrade === g;
          const config = GRADE_CONFIG[g];
          const gradeName = language === 'en' ? config.name_en : config.name_es;

          return (
            <button
              key={g}
              type="button"
              disabled={readOnly}
              onClick={() => {
                if (!readOnly) onGradeChange(maneuver.id, g);
              }}
              className={`w-7 h-7 rounded-lg text-xs font-bold transition-all flex items-center justify-center ${
                readOnly ? 'cursor-default' : 'cursor-pointer'
              } ${
                isSelected
                  ? config.bgClass + ' ring-2 ring-slate-900/10'
                  : readOnly
                  ? 'bg-slate-100 text-slate-300 border border-slate-200'
                  : 'bg-white text-slate-500 border border-slate-200 hover:bg-slate-100'
              }`}
              title={`${g} - ${gradeName}${readOnly ? ' (Solo lectura para estudiante)' : ''}`}
            >
              {g}
            </button>
          );
        })}
      </div>
    </div>
  );
};
