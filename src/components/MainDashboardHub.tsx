import React, { useState, useEffect } from 'react';
import {
  User,
  FlightProgress,
  Itinerary,
  Transaction,
  MorosidadReport,
  InstructorDualGivenStats,
  FinancialDashboardSummary,
  AircraftMaintenanceRecord,
  MaintenanceSquawk,
  MaintenanceWorkOrder
} from '../types';
import { api } from '../services/api';
import { useLanguage } from '../i18n/LanguageContext';
import { AacMedicalAlertWidget, parseMedicalStatus } from './AacMedicalAlertWidget';
import { ExecutiveSummaryWidgets } from './ExecutiveSummaryWidgets';
import { WorkshopStatusMiniDashboard } from './WorkshopStatusMiniDashboard';
import { FlightFuelCalculatorWidget } from './FlightFuelCalculatorWidget';
import {
  BookOpen,
  Calendar,
  Wallet,
  Clock,
  Users,
  Plane,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  TrendingUp,
  ShieldCheck,
  ShieldAlert,
  FileCheck,
  Sparkles,
  RefreshCw,
  DollarSign,
  AlertCircle,
  Award,
  ChevronRight,
  Send,
  Building2,
  FileText,
  CloudSun,
  Wind,
  FileSpreadsheet,
  MessageSquare,
  Fuel,
  Wrench,
  BookMarked,
  Mail,
  ClipboardList,
  Receipt
} from 'lucide-react';

interface MainDashboardHubProps {
  currentUser: User;
  allUsers: User[];
  onNavigateTab: (tabId: string, extraId?: string) => void;
  onRefreshAll?: () => void;
}

export const MainDashboardHub: React.FC<MainDashboardHubProps> = ({
  currentUser,
  allUsers,
  onNavigateTab,
  onRefreshAll
}) => {
  const { t } = useLanguage();
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);

  // General Data
  const [flightSheets, setFlightSheets] = useState<FlightProgress[]>([]);
  const [itineraries, setItineraries] = useState<Itinerary[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [pendingTransactions, setPendingTransactions] = useState<Transaction[]>([]);
  const [studentBalance, setStudentBalance] = useState<number>(0);
  const [morosidadList, setMorosidadList] = useState<MorosidadReport[]>([]);
  const [financialSummary, setFinancialSummary] = useState<FinancialDashboardSummary | null>(null);
  const [instructorLock, setInstructorLock] = useState<{ locked: boolean; reason?: string }>({ locked: false });
  const [instructorStats, setInstructorStats] = useState<InstructorDualGivenStats | null>(null);

  const isStudent = currentUser.rol === 'estudiante';
  const isInstructor = currentUser.rol === 'instructor';
  const isChiefInstructor = currentUser.rol === 'instructor_en_jefe';
  const isAccounting = currentUser.rol === 'contabilidad';
  const isAdmin = currentUser.rol === 'admin';
  const isEscuela = currentUser.rol === 'escuela';
  const isMaintenance = currentUser.rol === 'mantenimiento';

  const [maintenanceRecords, setMaintenanceRecords] = useState<AircraftMaintenanceRecord[]>([]);
  const [activeSquawks, setActiveSquawks] = useState<MaintenanceSquawk[]>([]);
  const [activeOrders, setActiveOrders] = useState<MaintenanceWorkOrder[]>([]);

  const loadDashboardData = async () => {
    try {
      const isFinanciallyAuthorized = isAccounting || isAdmin || isEscuela;

      const [itinerariesData, pendingTxData, finSummaryData, allSheetsData, morosidadData] = await Promise.all([
        api.getItineraries(currentUser.rol, currentUser.id).catch(() => []),
        isFinanciallyAuthorized ? api.getPendingTransactions().catch(() => []) : Promise.resolve([]),
        isFinanciallyAuthorized ? api.getFinancialSummary(new Date().getFullYear()).catch(() => null) : Promise.resolve(null),
        api.getFlightProgress().catch(() => []),
        isFinanciallyAuthorized ? api.getMorosidadReport().catch(() => []) : Promise.resolve([])
      ]);
      setItineraries(itinerariesData);
      setPendingTransactions(pendingTxData);
      setFinancialSummary(finSummaryData);
      setFlightSheets(allSheetsData);
      setMorosidadList(morosidadData);

      if (isStudent) {
        const balDetails = await api.getStudentBalanceDetails(currentUser.id).catch(() => ({ balance: 0, totalPendingAbonos: 0, totalPendingCargos: 0, count: 0 }));
        setStudentBalance(balDetails.balance);
      } else if (isInstructor || isChiefInstructor) {
        const [lockData, statsData] = await Promise.all([
          api.checkInstructorLock(currentUser.id).catch(() => ({ locked: false })),
          api.getInstructorDualStats(currentUser.id).catch(() => null)
        ]);
        setInstructorLock(lockData);
        setInstructorStats(statsData);
      } else if (isAccounting || isAdmin || isEscuela) {
        const allTx = await api.getTransactions().catch(() => []);
        setTransactions(allTx);
      }

      if (isAdmin || isEscuela || isMaintenance || isInstructor || isChiefInstructor) {
        const [acData, sqData, woData] = await Promise.all([
          api.getAircraftMaintenanceRecords().catch(() => []),
          api.getMaintenanceSquawks().catch(() => []),
          api.getMaintenanceWorkOrders().catch(() => [])
        ]);
        setMaintenanceRecords(acData);
        setActiveSquawks(sqData);
        setActiveOrders(woData);
      } else {
        setMaintenanceRecords([]);
        setActiveSquawks([]);
        setActiveOrders([]);
      }
    } catch (err) {
      console.error('Error loading dashboard overview:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    setLoading(true);
    loadDashboardData();
  }, [currentUser?.id, currentUser?.rol]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadDashboardData();
    if (onRefreshAll) onRefreshAll();
  };

  // Student Computed Values
  const studentItineraries = itineraries.filter(it => it.estudiante_id === currentUser.id);
  const nextStudentFlight = studentItineraries
    .filter(it => it.estado === 'programado' || it.estado === 'confirmado')
    .sort((a, b) => new Date(`${a.fecha}T${a.hora_inicio}`).getTime() - new Date(`${b.fecha}T${b.hora_inicio}`).getTime())[0];

  const studentSheets = flightSheets.filter(s => s.estudiante_id === currentUser.id);
  const totalStudentHours = studentSheets.length > 0
    ? ((studentSheets[0].tiempos_vuelo?.total_horas || (studentSheets[0] as any).tiempos?.total_horas) || 0)
    : 0;

  const totalDualHours = studentSheets.reduce((acc, s) => acc + ((s.tiempos_vuelo?.vuelo_dual || (s as any).tiempos?.vuelo_dual) || 0), 0);
  const totalSoloHours = studentSheets.reduce((acc, s) => acc + ((s.tiempos_vuelo?.solo_travesia || (s as any).tiempos?.solo_travesia) || 0), 0);
  const totalIfrHours = studentSheets.reduce((acc, s) => acc + ((s.tiempos_vuelo?.vuelo_ifr || (s as any).tiempos?.vuelo_ifr) || 0), 0);

  // Instructor Computed Values
  const instructorItineraries = itineraries.filter(it => it.instructor_id === currentUser.id);
  const todayStr = new Date().toISOString().split('T')[0];
  const todayInstructorFlights = instructorItineraries.filter(it => it.fecha === todayStr && it.estado !== 'cancelado');
  const pendingInstructorSheets = flightSheets.filter(
    s => s.instructor_id === currentUser.id && ((s as any).estado_validacion === 'pendiente_validacion' || (s as any).estado === 'pendiente_validacion')
  );

  // Accounting Computed Values
  const safeUsers = allUsers || [];
  const pendingAchAmount = pendingTransactions.reduce((acc, tx) => acc + (tx.monto || 0), 0);
  const criticalStudentsCount = morosidadList.filter(m => m && m.saldo_actual < 0).length;

  // Admin Computed Values
  const activeStudents = safeUsers.filter(u => u && u.rol === 'estudiante' && u.activo !== false);
  const activeInstructors = safeUsers.filter(u => u && u.rol === 'instructor' && u.activo !== false);
  const todayAllFlights = itineraries.filter(it => it && it.fecha === todayStr && it.estado !== 'cancelado');
  const confirmedTodayFlights = todayAllFlights.filter(it => it && it.estado === 'confirmado');

  const assignedInstructorObj = isStudent && currentUser?.instructor_asignado_id
    ? safeUsers.find(u => u && u.id === currentUser.instructor_asignado_id)
    : null;

  const currentUserName = currentUser?.nombre || 'Usuario';

  return (
    <div className="space-y-5 animate-in fade-in duration-200">
      
      {/* 1. COMPACT WELCOME BANNER & IDENTITY STRIP */}
      <div className="bg-slate-900 text-white rounded-2xl p-4 sm:p-5 border border-slate-800 shadow-sm relative overflow-hidden">
        {/* Subtle background glow */}
        <div className="absolute top-0 right-0 w-80 h-full bg-gradient-to-l from-sky-600/10 via-transparent to-transparent pointer-events-none" />

        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="relative">
              {currentUser?.foto_perfil ? (
                <img
                  src={currentUser.foto_perfil}
                  alt={currentUserName}
                  className="w-13 h-13 rounded-2xl object-cover border-2 border-sky-400/40 shadow-xs"
                />
              ) : (
                <div className="w-13 h-13 rounded-2xl bg-gradient-to-br from-sky-600 to-slate-800 flex items-center justify-center font-bold text-lg text-white border-2 border-sky-400/30 shadow-xs">
                  {currentUserName.charAt(0)}
                </div>
              )}
              <span className="absolute -bottom-1 -right-1 w-3.5 h-3.5 bg-emerald-500 border-2 border-slate-900 rounded-full" />
            </div>

            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-base sm:text-lg font-bold text-white tracking-tight">
                  {currentUserName}
                </h1>
                <span className="text-slate-500 font-medium text-xs">·</span>
                <span className="text-xs text-slate-300 font-semibold">
                  {currentUser?.rol === 'admin'
                    ? 'Administrador'
                    : currentUser?.rol === 'instructor_en_jefe'
                    ? 'Instructor en Jefe (Jefe de Pilotos)'
                    : currentUser?.rol === 'instructor'
                    ? 'Instructor CFI'
                    : currentUser?.rol === 'contabilidad'
                    ? 'Contabilidad'
                    : currentUser?.rol === 'escuela'
                    ? 'Dirección Escuela'
                    : currentUser?.rol === 'mantenimiento'
                    ? 'Taller Aeronáutico (OMA)'
                    : 'Piloto Alumno'}
                </span>
                {isStudent && currentUser?.curso_actual && (
                  <>
                    <span className="text-slate-500 font-medium text-xs">·</span>
                    <span className="text-xs text-slate-400 font-medium">{currentUser.curso_actual}</span>
                  </>
                )}
              </div>
              <p className="text-xs text-slate-400 mt-0.5 flex items-center gap-2">
                <span>{currentUser?.correo}</span>
                {currentUser?.telefono && <span>• {currentUser.telefono}</span>}
                {isStudent && assignedInstructorObj && (
                  <span>• CFI: <strong className="text-sky-300">{assignedInstructorObj.nombre}</strong></span>
                )}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-semibold border border-slate-700 transition-colors cursor-pointer"
              title="Actualizar datos del dashboard"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin text-sky-400' : ''}`} />
              <span>{refreshing ? 'Actualizando...' : 'Actualizar'}</span>
            </button>

            {isStudent && (
              <button
                onClick={() => onNavigateTab('contabilidad')}
                className="flex items-center gap-1.5 px-3.5 py-1.5 bg-sky-500 hover:bg-sky-600 text-white rounded-lg text-xs font-bold transition-all shadow-xs cursor-pointer"
              >
                <DollarSign className="w-3.5 h-3.5" />
                <span>Pagar / Cargar ACH</span>
              </button>
            )}

            {(isInstructor || isChiefInstructor) && (
              <button
                onClick={() => onNavigateTab('bitacoras_aeronaves')}
                className="flex items-center gap-1.5 px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold transition-all shadow-xs cursor-pointer"
              >
                <Plane className="w-3.5 h-3.5" />
                <span>Registrar Vuelo / Bitácora</span>
              </button>
            )}

            {isInstructor && (
              <button
                onClick={() => onNavigateTab('solicitudes_vuelo')}
                className="flex items-center gap-1.5 px-3.5 py-1.5 bg-sky-500 hover:bg-sky-600 text-white rounded-lg text-xs font-bold transition-all shadow-xs cursor-pointer"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Solicitar Vuelo (11am–6pm)</span>
              </button>
            )}

            {(isChiefInstructor || isEscuela || isAdmin) && (
              <button
                onClick={() => onNavigateTab('solicitudes_vuelo')}
                className="flex items-center gap-1.5 px-3.5 py-1.5 bg-sky-500 hover:bg-sky-600 text-white rounded-lg text-xs font-bold transition-all shadow-xs cursor-pointer"
              >
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>Solicitudes y Vuelos Aceptados</span>
              </button>
            )}

            {isMaintenance && (
              <button
                onClick={() => onNavigateTab('taller_mantenimiento')}
                className="flex items-center gap-1.5 px-3.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-xs font-semibold border border-slate-700 transition-all cursor-pointer"
              >
                <Wrench className="w-3.5 h-3.5 text-amber-400" />
                <span>Gestión de Hangar</span>
              </button>
            )}

            {(isAccounting || isAdmin) && (
              <button
                onClick={() => onNavigateTab(isAccounting ? 'contabilidad' : 'itinerarios')}
                className="flex items-center gap-1.5 px-3.5 py-1.5 bg-sky-500 hover:bg-sky-600 text-white rounded-lg text-xs font-bold transition-all shadow-xs cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>{isAccounting ? 'Verificar ACH' : 'Gestión Operativa'}</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* 2. ROLE SPECIFIC DASHBOARD CARDS & SUMMARIES */}

      {/* PERSONAL MEDICAL ALERT BANNER FOR PILOTS/STUDENTS */}
      {(isStudent || isInstructor || isChiefInstructor) && (() => {
        const myMed = parseMedicalStatus(currentUser);
        if (myMed.status === 'valid') return null;
        const isExp = myMed.status === 'expired' || myMed.status === 'missing';
        const isCrit = myMed.status === 'critical';

        return (
          <div className={`p-3.5 rounded-2xl border flex items-center justify-between gap-3 text-xs shadow-xs ${
            isExp
              ? 'bg-rose-950/40 border-rose-500/50 text-rose-200'
              : isCrit
              ? 'bg-amber-950/40 border-amber-500/50 text-amber-200'
              : 'bg-yellow-950/30 border-yellow-500/40 text-yellow-200'
          }`}>
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-xl border ${
                isExp ? 'bg-rose-500/20 text-rose-400 border-rose-500/30' : 'bg-amber-500/20 text-amber-400 border-amber-500/30'
              }`}>
                {isExp ? <ShieldAlert className="w-5 h-5 animate-pulse" /> : <AlertTriangle className="w-5 h-5" />}
              </div>
              <div>
                <div className="font-bold text-white flex items-center gap-2">
                  <span>Aviso de Certificado Médico Aeronáutico</span>
                  <span className="px-1.5 py-0.2 rounded text-[10px] uppercase font-black bg-white/10">
                    {myMed.medicalClass}
                  </span>
                </div>
                <p className="text-[11px] text-slate-300 mt-0.5">
                  Tu certificado médico ({currentUser.numero_medico || 'No registrado'}) {isExp ? 'se encuentra VENCIDO. No puedes ser despachado en vuelo.' : `vence el ${currentUser.vencimiento_medico} (${myMed.statusText}). Coordina tu cita con un AME.`}
                </p>
              </div>
            </div>

            <button
              onClick={() => onNavigateTab('usuarios')}
              className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs shrink-0 transition-colors cursor-pointer"
            >
              Ver Mi Expediente
            </button>
          </div>
        );
      })()}

      {/* ADMIN MEDICAL SURVEILLANCE WIDGET */}
      {isAdmin && (
        <AacMedicalAlertWidget
          allUsers={allUsers}
          onNavigateTab={onNavigateTab}
          onRefreshUsers={handleRefresh}
          currentUser={currentUser}
        />
      )}

      {/* EXECUTIVE SUMMARY WIDGETS: ALUMNOS ACTIVOS, HORAS VOLADAS ESTE MES, VIGENCIAS DE INSTRUCTORES (ADMIN, CONTABILIDAD, ESCUELA, INSTRUCTOR) */}
      {!isStudent && !isMaintenance && (
        <ExecutiveSummaryWidgets
          currentUser={currentUser}
          allUsers={allUsers}
          flightSheets={flightSheets}
          itineraries={itineraries}
          financialSummary={financialSummary}
          morosidadList={morosidadList}
          onNavigateTab={onNavigateTab}
        />
      )}

      {/* A. ESTUDIANTE VIEW */}
      {isStudent && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          
          {/* Card 1: Próximo Vuelo y Agenda */}
          <div className="bg-white rounded-2xl p-4 border border-slate-200/90 shadow-xs flex flex-col justify-between hover:border-slate-300 transition-all">
            <div>
              <div className="flex items-center justify-between pb-2.5 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-sky-50 text-sky-600 border border-sky-100">
                    <Calendar className="w-4 h-4" />
                  </div>
                  <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">Próximo Vuelo</span>
                </div>
                {nextStudentFlight && (
                  <span className={`px-2 py-0.5 text-[10px] font-bold rounded-full border ${
                    nextStudentFlight.estado === 'confirmado'
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                      : 'bg-amber-50 text-amber-700 border-amber-200'
                  }`}>
                    {nextStudentFlight.estado === 'confirmado' ? 'Confirmado' : 'Por Confirmar'}
                  </span>
                )}
              </div>

              {nextStudentFlight ? (
                <div className="mt-3 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-500">Fecha y Hora:</span>
                    <span className="font-bold text-slate-800">
                      {nextStudentFlight.fecha} ({nextStudentFlight.hora_inicio} - {nextStudentFlight.hora_fin})
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-500">Aeronave:</span>
                    <span className="font-semibold text-slate-700">{nextStudentFlight.avion_matricula || (nextStudentFlight as any).matricula}</span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-500">Instructor:</span>
                    <span className="font-semibold text-sky-700">{nextStudentFlight.instructor_nombre}</span>
                  </div>
                  <div className="p-2 bg-slate-50 rounded-xl text-[11px] text-slate-600 border border-slate-100 line-clamp-2">
                    <strong className="text-slate-700">Misión:</strong> {nextStudentFlight.mision || 'Lección Práctica de Vuelo'}
                  </div>
                </div>
              ) : (
                <div className="py-6 text-center text-xs text-slate-400">
                  <Clock className="w-6 h-6 mx-auto mb-1 text-slate-300" />
                  <span>No tienes vuelos agendados actualmente.</span>
                </div>
              )}
            </div>

            <button
              onClick={() => onNavigateTab('itinerarios')}
              className="mt-3 w-full py-2 px-3 bg-slate-50 hover:bg-sky-50 hover:text-sky-700 text-slate-700 text-xs font-bold rounded-xl border border-slate-200 flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
            >
              <span>Ver Itinerario</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Card 2: Progreso de Horas */}
          <div className="bg-white rounded-2xl p-4 border border-slate-200/90 shadow-xs flex flex-col justify-between hover:border-slate-300 transition-all">
            <div>
              <div className="flex items-center justify-between pb-2.5 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-indigo-50 text-indigo-600 border border-indigo-100">
                    <BookOpen className="w-4 h-4" />
                  </div>
                  <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">Horas y Bitácora</span>
                </div>
                <span className="text-xs font-black text-slate-900 bg-slate-100 px-2 py-0.5 rounded-lg">
                  {totalStudentHours.toFixed(1)} hrs
                </span>
              </div>

              <div className="grid grid-cols-3 gap-2 mt-3 text-center">
                <div className="p-2 bg-slate-50 rounded-xl border border-slate-100">
                  <span className="block text-[10px] text-slate-500 font-semibold">Dual Inst.</span>
                  <span className="text-xs font-bold text-slate-800">{totalDualHours.toFixed(1)}h</span>
                </div>
                <div className="p-2 bg-slate-50 rounded-xl border border-slate-100">
                  <span className="block text-[10px] text-slate-500 font-semibold">Solo / Trav.</span>
                  <span className="text-xs font-bold text-slate-800">{totalSoloHours.toFixed(1)}h</span>
                </div>
                <div className="p-2 bg-slate-50 rounded-xl border border-slate-100">
                  <span className="block text-[10px] text-slate-500 font-semibold">IFR / Capota</span>
                  <span className="text-xs font-bold text-slate-800">{totalIfrHours.toFixed(1)}h</span>
                </div>
              </div>

              <div className="mt-3 p-2 bg-slate-50 rounded-xl border border-slate-100 text-xs flex items-center justify-between">
                <span className="text-slate-500">Hojas de Vuelo Registradas:</span>
                <span className="font-bold text-slate-800">{flightSheets.length} misiones</span>
              </div>
            </div>

            <button
              onClick={() => onNavigateTab('progreso')}
              className="mt-3 w-full py-2 px-3 bg-slate-50 hover:bg-sky-50 hover:text-sky-700 text-slate-700 text-xs font-bold rounded-xl border border-slate-200 flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
            >
              <span>Ver Hojas de Progreso</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Card 3: Estado de Cuenta y Finanzas */}
          <div className="bg-white rounded-2xl p-4 border border-slate-200/90 shadow-xs flex flex-col justify-between hover:border-slate-300 transition-all">
            <div>
              <div className="flex items-center justify-between pb-2.5 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-emerald-50 text-emerald-600 border border-emerald-100">
                    <Wallet className="w-4 h-4" />
                  </div>
                  <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">Estado Financiero</span>
                </div>
                <span className={`px-2 py-0.5 text-[10px] font-bold rounded-full border ${
                  studentBalance >= 0
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                    : 'bg-rose-50 text-rose-700 border-rose-200'
                }`}>
                  {studentBalance >= 0 ? 'Solvente' : 'Saldo Deudor'}
                </span>
              </div>

              <div className="mt-3 p-3 bg-gradient-to-r from-slate-50 to-slate-100 rounded-xl border border-slate-200 text-center">
                <span className="text-[10px] text-slate-500 uppercase font-semibold">Saldo Disponible en Cuenta</span>
                <div className={`text-xl font-black mt-0.5 ${
                  studentBalance >= 0 ? 'text-emerald-700' : 'text-rose-600'
                }`}>
                  ${studentBalance.toFixed(2)}
                </div>
              </div>

              <div className="mt-2 text-[11px] text-slate-500 text-center">
                {studentBalance < 0
                  ? '⚠️ Requiere abono antes de realizar el próximo vuelo.'
                  : '✅ Tu cuenta se encuentra habilitada para despacho operacional.'}
              </div>
            </div>

            <button
              onClick={() => onNavigateTab('contabilidad')}
              className="mt-3 w-full py-2 px-3 bg-slate-50 hover:bg-sky-50 hover:text-sky-700 text-slate-700 text-xs font-bold rounded-xl border border-slate-200 flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
            >
              <span>Ver Estado de Cuenta / Pagos</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* B. INSTRUCTOR VIEW */}
      {isInstructor && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          
          {/* Card 1: Semáforo de Vigencias y Hard Lock */}
          <div className="bg-white rounded-2xl p-4 border border-slate-200/90 shadow-xs flex flex-col justify-between hover:border-slate-300 transition-all">
            <div>
              <div className="flex items-center justify-between pb-2.5 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <div className={`p-1.5 rounded-lg border ${
                    instructorLock.locked
                      ? 'bg-rose-50 text-rose-600 border-rose-200'
                      : 'bg-emerald-50 text-emerald-600 border-emerald-200'
                  }`}>
                    {instructorLock.locked ? <ShieldAlert className="w-4 h-4" /> : <ShieldCheck className="w-4 h-4" />}
                  </div>
                  <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">Vigencias Aeronáuticas</span>
                </div>
                <span className={`px-2 py-0.5 text-[10px] font-bold rounded-full border ${
                  instructorLock.locked
                    ? 'bg-rose-100 text-rose-800 border-rose-300'
                    : 'bg-emerald-100 text-emerald-800 border-emerald-300'
                }`}>
                  {instructorLock.locked ? 'Hard Lock Activo' : 'Habilitado'}
                </span>
              </div>

              <div className="mt-3 space-y-2 text-xs">
                <div className="flex items-center justify-between p-2 bg-slate-50 rounded-xl border border-slate-100">
                  <span className="text-slate-600">Certificado Médico:</span>
                  <span className="font-semibold text-slate-800">{currentUser.vencimiento_medico || 'No registrado'}</span>
                </div>
                <div className="flex items-center justify-between p-2 bg-slate-50 rounded-xl border border-slate-100">
                  <span className="text-slate-600">Licencia CFI:</span>
                  <span className="font-semibold text-slate-800">{currentUser.vencimiento_licencia || 'No registrado'}</span>
                </div>
              </div>
            </div>

            <button
              onClick={() => onNavigateTab('instructor_portal')}
              className="mt-3 w-full py-2 px-3 bg-slate-50 hover:bg-sky-50 hover:text-sky-700 text-slate-700 text-xs font-bold rounded-xl border border-slate-200 flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
            >
              <span>Ver Portal CFI & Vigencias</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Card 2: Vuelos de Hoy y Agenda */}
          <div className="bg-white rounded-2xl p-4 border border-slate-200/90 shadow-xs flex flex-col justify-between hover:border-slate-300 transition-all">
            <div>
              <div className="flex items-center justify-between pb-2.5 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-sky-50 text-sky-600 border border-sky-100">
                    <Calendar className="w-4 h-4" />
                  </div>
                  <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">Vuelos Asignados Hoy</span>
                </div>
                <span className="text-xs font-black text-sky-800 bg-sky-50 border border-sky-200 px-2 py-0.5 rounded-lg">
                  {todayInstructorFlights.length} hoy
                </span>
              </div>

              <div className="mt-3 space-y-2">
                {todayInstructorFlights.length > 0 ? (
                  todayInstructorFlights.slice(0, 2).map((fl) => (
                    <div key={fl.id} className="p-2 bg-slate-50 rounded-xl border border-slate-100 text-xs flex items-center justify-between">
                      <div>
                        <span className="font-bold text-slate-800">{fl.hora_inicio} - {fl.hora_fin}</span>
                        <p className="text-[10px] text-slate-500">{fl.estudiante_nombre} • {fl.avion_matricula || (fl as any).matricula}</p>
                      </div>
                      <span className={`px-1.5 py-0.5 text-[9px] font-bold rounded ${
                        fl.estado === 'confirmado' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                      }`}>
                        {fl.estado}
                      </span>
                    </div>
                  ))
                ) : (
                  <div className="py-4 text-center text-xs text-slate-400">
                    <span>No tienes vuelos programados para hoy.</span>
                  </div>
                )}
              </div>
            </div>

            <button
              onClick={() => onNavigateTab('itinerarios')}
              className="mt-3 w-full py-2 px-3 bg-slate-50 hover:bg-sky-50 hover:text-sky-700 text-slate-700 text-xs font-bold rounded-xl border border-slate-200 flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
            >
              <span>Ver Toda la Agenda</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Card 3: Dual Given & Validación */}
          <div className="bg-white rounded-2xl p-4 border border-slate-200/90 shadow-xs flex flex-col justify-between hover:border-slate-300 transition-all">
            <div>
              <div className="flex items-center justify-between pb-2.5 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-indigo-50 text-indigo-600 border border-indigo-100">
                    <Award className="w-4 h-4" />
                  </div>
                  <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">Instrucción e Honorarios</span>
                </div>
                <span className="text-xs font-black text-slate-900 bg-slate-100 px-2 py-0.5 rounded-lg tabular-nums">
                  {instructorStats ? `${instructorStats.total_horas_dual.toFixed(1)}h` : '0.0h'}
                </span>
              </div>

              <div className="mt-3 p-2 bg-slate-50 rounded-xl border border-slate-100 text-xs space-y-1.5 tabular-nums">
                <div className="flex items-center justify-between text-slate-600">
                  <span>Honorarios Mes (Admin):</span>
                  <span className="font-bold text-emerald-700">
                    ${(instructorStats?.total_honorarios_mes ?? 0).toFixed(2)} USD
                  </span>
                </div>
                <div className="flex items-center justify-between text-slate-600">
                  <span>Hojas pendientes de firma:</span>
                  <span className="font-bold text-amber-700">{pendingInstructorSheets.length}</span>
                </div>
                <div className="flex items-center justify-between text-slate-600">
                  <span>Alumnos asignados activos:</span>
                  <span className="font-bold text-slate-800">
                    {allUsers.filter(u => u.rol === 'estudiante' && u.instructor_asignado_id === currentUser.id).length}
                  </span>
                </div>
              </div>
            </div>

            <div className="mt-3 space-y-2">
              <button
                onClick={() => onNavigateTab('bitacoras_aeronaves')}
                className="w-full py-2 px-3 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
              >
                <Plane className="w-3.5 h-3.5" />
                <span>Registrar Vuelo y Tacómetro</span>
              </button>
              <button
                onClick={() => onNavigateTab('honorarios_instructor')}
                className="w-full py-2 px-3 bg-slate-50 hover:bg-sky-50 hover:text-sky-700 text-slate-700 text-xs font-bold rounded-xl border border-slate-200 flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
              >
                <span>Ver Mis Honorarios (Horas y Dinero)</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* B. INSTRUCTOR VIEW END */}

      {/* B2. INSTRUCTOR EN JEFE / JEFE DE PILOTOS VIEW */}
      {isChiefInstructor && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white rounded-2xl p-4 border border-slate-200/90 shadow-xs flex flex-col justify-between hover:border-slate-300 transition-all">
            <div>
              <div className="flex items-center justify-between pb-2.5 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-sky-50 text-sky-600 border border-sky-100">
                    <Send className="w-4 h-4" />
                  </div>
                  <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">Despacho 6 PM & Publicación 8 PM</span>
                </div>
                <span className="text-xs font-bold text-sky-800 bg-sky-50 border border-sky-200 px-2 py-0.5 rounded-lg">
                  Jefatura CFI
                </span>
              </div>
              <div className="mt-3 space-y-1.5 text-xs tabular-nums">
                <div className="flex items-center justify-between p-2 bg-slate-50 rounded-xl border border-slate-100">
                  <span className="text-slate-600">Corte de Envío:</span>
                  <span className="font-semibold text-slate-800">6:00 PM</span>
                </div>
                <div className="flex items-center justify-between p-2 bg-slate-50 rounded-xl border border-slate-100">
                  <span className="text-slate-600">Publicación Itinerario:</span>
                  <span className="font-semibold text-slate-800">8:00 PM</span>
                </div>
              </div>
            </div>
            <button
              onClick={() => onNavigateTab('solicitudes_vuelo')}
              className="mt-3 w-full py-2 px-3 bg-sky-600 hover:bg-sky-700 text-white text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
            >
              <span>Abrir Bandeja de Aprobación</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="bg-white rounded-2xl p-4 border border-slate-200/90 shadow-xs flex flex-col justify-between hover:border-slate-300 transition-all">
            <div>
              <div className="flex items-center justify-between pb-2.5 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-emerald-50 text-emerald-600 border border-emerald-100">
                    <ShieldCheck className="w-4 h-4" />
                  </div>
                  <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">Vigencias Instructor en Jefe</span>
                </div>
                <span className={`px-2 py-0.5 text-[10px] font-bold rounded-lg border ${
                  instructorLock.locked ? 'bg-rose-100 text-rose-800 border-rose-300' : 'bg-emerald-100 text-emerald-800 border-emerald-300'
                }`}>
                  {instructorLock.locked ? 'Bloqueo Activo' : 'Habilitado'}
                </span>
              </div>
              <div className="mt-3 space-y-2 text-xs tabular-nums">
                <div className="flex items-center justify-between p-2 bg-slate-50 rounded-xl border border-slate-100">
                  <span className="text-slate-600">Certificado Médico:</span>
                  <span className="font-semibold text-slate-800">{currentUser.vencimiento_medico || 'Vigente'}</span>
                </div>
                <div className="flex items-center justify-between p-2 bg-slate-50 rounded-xl border border-slate-100">
                  <span className="text-slate-600">Licencia CFI/MEI:</span>
                  <span className="font-semibold text-slate-800">{currentUser.vencimiento_licencia || 'Vigente'}</span>
                </div>
              </div>
            </div>
            <button
              onClick={() => onNavigateTab('instructor_portal')}
              className="mt-3 w-full py-2 px-3 bg-slate-50 hover:bg-sky-50 hover:text-sky-700 text-slate-700 text-xs font-bold rounded-xl border border-slate-200 flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
            >
              <span>Ver Portal CFI & Instructores</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="bg-white rounded-2xl p-4 border border-slate-200/90 shadow-xs flex flex-col justify-between hover:border-slate-300 transition-all">
            <div>
              <div className="flex items-center justify-between pb-2.5 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-indigo-50 text-indigo-600 border border-indigo-100">
                    <Calendar className="w-4 h-4" />
                  </div>
                  <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">Itinerario Diario Flota</span>
                </div>
                <span className="text-xs font-black text-slate-900 bg-slate-100 px-2 py-0.5 rounded-lg tabular-nums">
                  {todayAllFlights.length} hoy
                </span>
              </div>
              <div className="mt-3 space-y-1.5 text-xs tabular-nums">
                <div className="flex items-center justify-between p-2 bg-slate-50 rounded-xl border border-slate-100">
                  <span className="text-slate-600">Instructores activos:</span>
                  <span className="font-bold text-slate-800">{activeInstructors.length}</span>
                </div>
                <div className="flex items-center justify-between p-2 bg-slate-50 rounded-xl border border-slate-100">
                  <span className="text-slate-600">Alumnos activos:</span>
                  <span className="font-bold text-slate-800">{activeStudents.length}</span>
                </div>
              </div>
            </div>
            <button
              onClick={() => onNavigateTab('itinerarios')}
              className="mt-3 w-full py-2 px-3 bg-slate-50 hover:bg-sky-50 hover:text-sky-700 text-slate-700 text-xs font-bold rounded-xl border border-slate-200 flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
            >
              <span>Ver Agenda Operacional</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* C. CONTABILIDAD VIEW */}
      {isAccounting && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          
          {/* Card 1: Comprobantes Bancarios ACH */}
          <div className="bg-white rounded-2xl p-4 border border-slate-200/90 shadow-xs flex flex-col justify-between hover:border-slate-300 transition-all">
            <div>
              <div className="flex items-center justify-between pb-2.5 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-amber-50 text-amber-600 border border-amber-100">
                    <FileCheck className="w-4 h-4" />
                  </div>
                  <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">Comprobantes ACH</span>
                </div>
                <span className="text-xs font-black text-amber-800 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-lg">
                  {pendingTransactions.length} pendientes
                </span>
              </div>

              <div className="mt-3 p-3 bg-amber-50/50 rounded-xl border border-amber-100 text-center">
                <span className="text-[10px] text-amber-700 uppercase font-semibold">Total por Verificar con Banco</span>
                <div className="text-xl font-black text-amber-900 mt-0.5">
                  ${pendingAchAmount.toFixed(2)}
                </div>
              </div>
            </div>

            <button
              onClick={() => onNavigateTab('contabilidad')}
              className="mt-3 w-full py-2 px-3 bg-slate-50 hover:bg-sky-50 hover:text-sky-700 text-slate-700 text-xs font-bold rounded-xl border border-slate-200 flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
            >
              <span>Verificar en Módulo Contable</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Card 2: Reporte de Morosidad */}
          <div className="bg-white rounded-2xl p-4 border border-slate-200/90 shadow-xs flex flex-col justify-between hover:border-slate-300 transition-all">
            <div>
              <div className="flex items-center justify-between pb-2.5 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-rose-50 text-rose-600 border border-rose-100">
                    <AlertTriangle className="w-4 h-4" />
                  </div>
                  <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">Alertas de Morosidad</span>
                </div>
                <span className="text-xs font-black text-rose-800 bg-rose-50 border border-rose-200 px-2 py-0.5 rounded-lg">
                  {criticalStudentsCount} en alerta
                </span>
              </div>

              <div className="mt-3 space-y-1.5">
                {morosidadList.slice(0, 3).map((item) => (
                  <div key={item.estudiante_id} className="p-1.5 bg-slate-50 rounded-lg text-xs flex items-center justify-between">
                    <span className="font-semibold text-slate-700 truncate max-w-[140px]">{item.estudiante_nombre}</span>
                    <span className="font-bold text-rose-600">${item.saldo_actual.toFixed(2)}</span>
                  </div>
                ))}
              </div>
            </div>

            <button
              onClick={() => onNavigateTab('contabilidad')}
              className="mt-3 w-full py-2 px-3 bg-slate-50 hover:bg-sky-50 hover:text-sky-700 text-slate-700 text-xs font-bold rounded-xl border border-slate-200 flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
            >
              <span>Ver Reporte de Saldos</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Card 3: Bitácoras de Aeronaves y Débito Autónomo */}
          <div className="bg-white rounded-2xl p-4 border border-indigo-200 shadow-xs flex flex-col justify-between hover:border-indigo-300 transition-all">
            <div>
              <div className="flex items-center justify-between pb-2.5 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-indigo-50 text-indigo-600 border border-indigo-100">
                    <Plane className="w-4 h-4" />
                  </div>
                  <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">Bitácoras Flota</span>
                </div>
                <span className="text-[10px] font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded-lg">
                  Débito Autónomo
                </span>
              </div>

              <div className="mt-3 p-3 bg-indigo-50/50 rounded-xl border border-indigo-100 text-center">
                <span className="text-[10px] text-indigo-700 uppercase font-semibold">Bitácoras de Vuelo</span>
                <div className="text-sm font-bold text-indigo-950 mt-1">
                  HP-1450, HP-1588, HP-1822...
                </div>
              </div>
            </div>

            <button
              onClick={() => onNavigateTab('bitacoras_aeronaves')}
              className="mt-3 w-full py-2 px-3 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
            >
              <span>Cargar Bitácora de Avión</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Card 4: Expedientes de Usuarios */}
          <div className="bg-white rounded-2xl p-4 border border-slate-200/90 shadow-xs flex flex-col justify-between hover:border-slate-300 transition-all">
            <div>
              <div className="flex items-center justify-between pb-2.5 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-sky-50 text-sky-600 border border-sky-100">
                    <Users className="w-4 h-4" />
                  </div>
                  <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">Directorio de Usuarios</span>
                </div>
                <span className="text-xs font-black text-slate-900 bg-slate-100 px-2 py-0.5 rounded-lg">
                  {allUsers.length} total
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2 mt-3 text-center">
                <div className="p-2 bg-slate-50 rounded-xl border border-slate-100">
                  <span className="block text-[10px] text-slate-500 font-semibold">Alumnos</span>
                  <span className="text-xs font-bold text-slate-800">
                    {allUsers.filter(u => u.rol === 'estudiante').length}
                  </span>
                </div>
                <div className="p-2 bg-slate-50 rounded-xl border border-slate-100">
                  <span className="block text-[10px] text-slate-500 font-semibold">Instructores</span>
                  <span className="text-xs font-bold text-slate-800">
                    {allUsers.filter(u => u.rol === 'instructor').length}
                  </span>
                </div>
              </div>
            </div>

            <button
              onClick={() => onNavigateTab('usuarios')}
              className="mt-3 w-full py-2 px-3 bg-slate-50 hover:bg-sky-50 hover:text-sky-700 text-slate-700 text-xs font-bold rounded-xl border border-slate-200 flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
            >
              <span>Gestionar Expedientes</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* D. ADMINISTRADOR & DIRECCIÓN ESCUELA VIEW */}
      {(isAdmin || isEscuela) && (() => {
        const flightPersonnel = allUsers.filter(
          u => (u.rol === 'estudiante' || u.rol === 'instructor' || (u.rol === 'admin' && u.licencia)) && u.activo !== false
        );
        const medicalAlertsList = flightPersonnel.map(parseMedicalStatus);
        const medicalExpiredCount = medicalAlertsList.filter(m => m.status === 'expired' || m.status === 'missing').length;
        const medicalWithin30Count = medicalAlertsList.filter(m => m.status === 'warning' || m.status === 'critical').length;

        return (
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              
              {/* Card 1: Operaciones de Vuelo */}
              <div className="bg-white rounded-2xl p-4 border border-slate-200/90 shadow-xs flex flex-col justify-between hover:border-slate-300 transition-all">
                <div>
                  <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 rounded-lg bg-sky-50 text-sky-600 border border-sky-100">
                        <Calendar className="w-4 h-4" />
                      </div>
                      <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">Operaciones Hoy</span>
                    </div>
                    <span className="text-xs font-black text-sky-800 bg-sky-50 border border-sky-200 px-2 py-0.5 rounded-lg">
                      {todayAllFlights.length} vuelos
                    </span>
                  </div>
                  <div className="mt-3 space-y-1.5 text-xs">
                    <div className="flex justify-between text-slate-600">
                      <span>Confirmados:</span>
                      <strong className="text-emerald-700">{confirmedTodayFlights.length}</strong>
                    </div>
                    <div className="flex justify-between text-slate-600">
                      <span>Pendientes SLA:</span>
                      <strong className="text-amber-700">{todayAllFlights.length - confirmedTodayFlights.length}</strong>
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => onNavigateTab('itinerarios')}
                  className="mt-3 w-full py-1.5 px-2.5 bg-slate-50 hover:bg-sky-50 hover:text-sky-700 text-slate-700 text-xs font-bold rounded-xl border border-slate-200 flex items-center justify-center gap-1 transition-colors cursor-pointer"
                >
                  <span>Ver Agenda</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Card 2: Finanzas y Conciliación */}
              <div className="bg-white rounded-2xl p-4 border border-slate-200/90 shadow-xs flex flex-col justify-between hover:border-slate-300 transition-all">
                <div>
                  <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 rounded-lg bg-emerald-50 text-emerald-600 border border-emerald-100">
                        <Wallet className="w-4 h-4" />
                      </div>
                      <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">Tesorería & ACH</span>
                    </div>
                    <span className="text-xs font-black text-amber-800 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-lg">
                      {pendingTransactions.length} ACH
                    </span>
                  </div>
                  <div className="mt-3 space-y-1.5 text-xs">
                    <div className="flex justify-between text-slate-600">
                      <span>Por Conciliar:</span>
                      <strong className="text-slate-800">${pendingAchAmount.toFixed(2)}</strong>
                    </div>
                    <div className="flex justify-between text-slate-600">
                      <span>Morosidad:</span>
                      <strong className="text-rose-600">{criticalStudentsCount} alumnos</strong>
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => onNavigateTab('contabilidad')}
                  className="mt-3 w-full py-1.5 px-2.5 bg-slate-50 hover:bg-sky-50 hover:text-sky-700 text-slate-700 text-xs font-bold rounded-xl border border-slate-200 flex items-center justify-center gap-1 transition-colors cursor-pointer"
                >
                  <span>Ver Finanzas</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Card 3: Vigilancia Médica Aeronáutica */}
              <div className={`rounded-2xl p-4 border shadow-xs flex flex-col justify-between transition-all ${
                medicalExpiredCount > 0
                  ? 'bg-rose-50/50 border-rose-200 hover:border-rose-300'
                  : medicalWithin30Count > 0
                  ? 'bg-amber-50/50 border-amber-200 hover:border-amber-300'
                  : 'bg-white border-slate-200/90 hover:border-slate-300'
              }`}>
                <div>
                  <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                    <div className="flex items-center gap-2">
                      <div className={`p-1.5 rounded-lg border ${
                        medicalExpiredCount > 0
                          ? 'bg-rose-100 text-rose-700 border-rose-200'
                          : medicalWithin30Count > 0
                          ? 'bg-amber-100 text-amber-700 border-amber-200'
                          : 'bg-sky-50 text-sky-600 border-sky-100'
                      }`}>
                        <ShieldAlert className="w-4 h-4" />
                      </div>
                      <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">Médico Aeronáutico</span>
                    </div>
                    <span className={`text-xs font-black px-2 py-0.5 rounded-lg border ${
                      medicalExpiredCount > 0
                        ? 'bg-rose-100 text-rose-800 border-rose-300'
                        : medicalWithin30Count > 0
                        ? 'bg-amber-100 text-amber-800 border-amber-300'
                        : 'bg-emerald-50 text-emerald-800 border-emerald-200'
                    }`}>
                      {medicalExpiredCount + medicalWithin30Count > 0 ? `${medicalExpiredCount + medicalWithin30Count} Alertas` : 'Al Día'}
                    </span>
                  </div>
                  <div className="mt-3 space-y-1.5 text-xs">
                    <div className="flex justify-between text-slate-600">
                      <span>Próximos (≤30d):</span>
                      <strong className={medicalWithin30Count > 0 ? 'text-amber-700' : 'text-slate-800'}>
                        {medicalWithin30Count} pilotos
                      </strong>
                    </div>
                    <div className="flex justify-between text-slate-600">
                      <span>Inhabilitados:</span>
                      <strong className={medicalExpiredCount > 0 ? 'text-rose-600' : 'text-emerald-700'}>
                        {medicalExpiredCount} bloqueados
                      </strong>
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => onNavigateTab('usuarios')}
                  className="mt-3 w-full py-1.5 px-2.5 bg-slate-50 hover:bg-sky-50 hover:text-sky-700 text-slate-700 text-xs font-bold rounded-xl border border-slate-200 flex items-center justify-center gap-1 transition-colors cursor-pointer"
                >
                  <span>Vigilancia Médica</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Card 4: Directorio y Personal */}
              <div className="bg-white rounded-2xl p-4 border border-slate-200/90 shadow-xs flex flex-col justify-between hover:border-slate-300 transition-all">
                <div>
                  <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 rounded-lg bg-purple-50 text-purple-600 border border-purple-100">
                        <Users className="w-4 h-4" />
                      </div>
                      <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">Directorio</span>
                    </div>
                    <span className="text-xs font-black text-slate-900 bg-slate-100 px-2 py-0.5 rounded-lg">
                      {allUsers.length}
                    </span>
                  </div>
                  <div className="mt-3 space-y-1.5 text-xs">
                    <div className="flex justify-between text-slate-600">
                      <span>Alumnos Activos:</span>
                      <strong className="text-slate-800">{activeStudents.length}</strong>
                    </div>
                    <div className="flex justify-between text-slate-600">
                      <span>Instructores:</span>
                      <strong className="text-slate-800">{activeInstructors.length}</strong>
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => onNavigateTab('usuarios')}
                  className="mt-3 w-full py-1.5 px-2.5 bg-slate-50 hover:bg-sky-50 hover:text-sky-700 text-slate-700 text-xs font-bold rounded-xl border border-slate-200 flex items-center justify-center gap-1 transition-colors cursor-pointer"
                >
                  <span>Ver Usuarios</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* E. VISTA ESPECIALIZADA: TALLER AERONÁUTICO & HANGAR */}
      {isMaintenance && (() => {
        const aogCount = maintenanceRecords.filter(a => a.bloqueo_despacho || a.estado_aeronavegabilidad === 'aog_bloqueado').length;
        const totalPlanes = maintenanceRecords.length || 4;
        const pendingWoCount = activeOrders.filter(w => w.estado !== 'cerrada_conforme').length;
        const criticalSquawks = activeSquawks.filter(s => s.severidad === 'aog' && s.estado !== 'resuelto');
        const openSquawks = activeSquawks.filter(s => s.estado !== 'resuelto');

        return (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Card 1: Aeronavegabilidad y AOG */}
            <div className={`rounded-xl p-4 border transition-all flex flex-col justify-between ${
              aogCount > 0
                ? 'bg-red-950/20 border-red-500/40 text-red-200'
                : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800'
            }`}>
              <div>
                <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
                  <div className="flex items-center gap-2">
                    <div className={`p-1.5 rounded-lg ${aogCount > 0 ? 'bg-red-500/20 text-red-400' : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'}`}>
                      <Plane className="w-4 h-4" />
                    </div>
                    <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 uppercase tracking-wider">Aeronavegabilidad</span>
                  </div>
                  {aogCount > 0 ? (
                    <span className="text-[11px] font-bold text-red-400 bg-red-950/80 border border-red-500/40 px-2 py-0.5 rounded">
                      {aogCount} AOG Inmovilizadas
                    </span>
                  ) : (
                    <span className="text-[11px] font-medium text-emerald-600 dark:text-emerald-400">
                      100% Operativa
                    </span>
                  )}
                </div>
                <div className="mt-3 space-y-1.5 text-xs">
                  <div className="flex justify-between text-slate-600 dark:text-slate-400">
                    <span>Aeronaves en flota:</span>
                    <strong className="text-slate-900 dark:text-white">{totalPlanes} aviones</strong>
                  </div>
                  <div className="flex justify-between text-slate-600 dark:text-slate-400">
                    <span>Habilitadas para vuelo:</span>
                    <strong className="text-emerald-600 dark:text-emerald-400">{totalPlanes - aogCount} listas</strong>
                  </div>
                </div>
              </div>
              <button
                onClick={() => onNavigateTab('taller_mantenimiento')}
                className={`mt-3 w-full py-2 px-3 text-xs font-semibold rounded-lg flex items-center justify-center gap-1.5 transition-colors cursor-pointer ${
                  aogCount > 0
                    ? 'bg-red-600 hover:bg-red-500 text-white shadow-xs'
                    : 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200'
                }`}
              >
                <span>{aogCount > 0 ? 'Gestionar Bloqueos AOG' : 'Ver Ficha de Flota'}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Card 2: Órdenes de Trabajo (Work Orders) */}
            <div className="bg-white dark:bg-slate-900 rounded-xl p-4 border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                      <Wrench className="w-4 h-4" />
                    </div>
                    <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 uppercase tracking-wider">Órdenes de Trabajo</span>
                  </div>
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded">
                    {pendingWoCount} activas
                  </span>
                </div>
                <div className="mt-3 space-y-1.5 text-xs">
                  <div className="flex justify-between text-slate-600 dark:text-slate-400">
                    <span>Certificados RTS:</span>
                    <strong className="text-slate-900 dark:text-white">
                      {activeOrders.filter(w => w.estado === 'cerrada_conforme').length} emitidos
                    </strong>
                  </div>
                  <div className="flex justify-between text-slate-600 dark:text-slate-400">
                    <span>Inspecciones 100h:</span>
                    <strong className="text-amber-600 dark:text-amber-400">RAC 43 / RAC 145</strong>
                  </div>
                </div>
              </div>
              <button
                onClick={() => onNavigateTab('ordenes_trabajo')}
                className="mt-3 w-full py-2 px-3 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-semibold rounded-lg flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
              >
                <span>Ver Órdenes de Trabajo</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Card 3: Novedades & Discrepancias (Squawks) */}
            <div className={`rounded-xl p-4 border transition-all flex flex-col justify-between ${
              criticalSquawks.length > 0
                ? 'bg-red-950/20 border-red-500/40 text-red-200'
                : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800'
            }`}>
              <div>
                <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
                  <div className="flex items-center gap-2">
                    <div className={`p-1.5 rounded-lg ${criticalSquawks.length > 0 ? 'bg-red-500/20 text-red-400' : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'}`}>
                      <AlertTriangle className="w-4 h-4" />
                    </div>
                    <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 uppercase tracking-wider">Discrepancias (Squawks)</span>
                  </div>
                  {criticalSquawks.length > 0 ? (
                    <span className="text-[11px] font-bold text-red-400 bg-red-950/80 border border-red-500/40 px-2 py-0.5 rounded">
                      {criticalSquawks.length} Críticas
                    </span>
                  ) : (
                    <span className="text-xs font-medium text-slate-600 dark:text-slate-400">
                      {openSquawks.length} pendientes
                    </span>
                  )}
                </div>
                <div className="mt-3 space-y-1.5 text-xs">
                  <div className="flex justify-between text-slate-600 dark:text-slate-400">
                    <span>Reportadas por pilotos:</span>
                    <strong className="text-slate-900 dark:text-white">{openSquawks.length} registros</strong>
                  </div>
                  <div className="flex justify-between text-slate-600 dark:text-slate-400">
                    <span>Condición crítica AOG:</span>
                    <strong className={criticalSquawks.length > 0 ? 'text-red-500 font-bold' : 'text-slate-600 dark:text-slate-400'}>
                      {criticalSquawks.length > 0 ? 'Inmoviliza despacho' : 'Bajo control'}
                    </strong>
                  </div>
                </div>
              </div>
              <button
                onClick={() => onNavigateTab('taller_mantenimiento')}
                className={`mt-3 w-full py-2 px-3 text-xs font-semibold rounded-lg flex items-center justify-center gap-1.5 transition-colors cursor-pointer ${
                  criticalSquawks.length > 0
                    ? 'bg-red-600 hover:bg-red-500 text-white shadow-xs'
                    : 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200'
                }`}
              >
                <span>{criticalSquawks.length > 0 ? 'Resolver Squawk Crítico' : 'Revisar Bitácora Novedades'}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Card 4: Insumos de Hangar & Repuestos */}
            <div className="bg-white dark:bg-slate-900 rounded-xl p-4 border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                      <Fuel className="w-4 h-4" />
                    </div>
                    <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 uppercase tracking-wider">Insumos & Repuestos</span>
                  </div>
                  <span className="text-xs font-medium text-slate-600 dark:text-slate-400">
                    Aeroshell / Bujías
                  </span>
                </div>
                <div className="mt-3 space-y-1.5 text-xs">
                  <div className="flex justify-between text-slate-600 dark:text-slate-400">
                    <span>Aceite W100 / 15W50:</span>
                    <strong className="text-slate-900 dark:text-white">Almacén Hangar</strong>
                  </div>
                  <div className="flex justify-between text-slate-600 dark:text-slate-400">
                    <span>Directivas ADs:</span>
                    <strong className="text-sky-600 dark:text-sky-400 font-medium">Cumplimiento AAC</strong>
                  </div>
                </div>
              </div>
              <button
                onClick={() => onNavigateTab('taller_mantenimiento')}
                className="mt-3 w-full py-2 px-3 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-semibold rounded-lg flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
              >
                <span>Inventario & Repuestos</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        );
      })()}

      {/* F. DASHBOARD RÁPIDO: ESTADO DE TALLER (MANTENIMIENTO, JEFATURA E INSTRUCTORES) */}
      {(isMaintenance || isAdmin || isEscuela || isInstructor || isChiefInstructor) && (
        <WorkshopStatusMiniDashboard
          currentUser={currentUser}
          workOrders={activeOrders}
          aircraftRecords={maintenanceRecords}
          loading={loading}
          onNavigateTab={onNavigateTab}
        />
      )}

      {/* HERRAMIENTAS DE VUELO & POH */}
      {(isStudent || isInstructor || isChiefInstructor) && (
        <div className="bg-gradient-to-r from-slate-900 to-slate-850 border border-slate-800 text-white rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-md">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-400/30 flex-shrink-0">
              <Fuel className="w-5 h-5" />
            </div>
            <h4 className="text-sm font-bold text-white">
              Herramientas de Vuelo & POH
            </h4>
          </div>
          <div className="flex items-center gap-2 w-full sm:w-auto flex-shrink-0">
            <button
              onClick={() => onNavigateTab('calculadora_combustible')}
              className="flex-1 sm:flex-none px-3.5 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 shadow-xs"
            >
              <Fuel className="w-3.5 h-3.5" />
              <span>Calculadora de Combustible</span>
            </button>
            <button
              onClick={() => onNavigateTab('poh')}
              className="flex-1 sm:flex-none px-3.5 py-2 bg-sky-600 hover:bg-sky-500 text-white rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 shadow-xs"
            >
              <BookOpen className="w-3.5 h-3.5" />
              <span>Manuales POH</span>
            </button>
          </div>
        </div>
      )}

      {/* 3. QUICK NAVIGATION GRID (COMPACT & MODERN) */}
      <div className="bg-white dark:bg-slate-900 rounded-xl p-4 border border-slate-200 dark:border-slate-800 shadow-xs">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800 mb-3">
          <h3 className="text-xs font-semibold text-slate-800 dark:text-slate-200 uppercase tracking-wider flex items-center gap-2">
            <span>Módulos</span>
          </h3>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
          {/* Taller Aeronáutico (mantenimiento, admin, escuela) */}
          {(isMaintenance || isAdmin || isEscuela) && (
            <button
              onClick={() => onNavigateTab('taller_mantenimiento')}
              className="p-3 bg-slate-50 dark:bg-slate-800/60 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-left transition-all group cursor-pointer"
            >
              <Wrench className="w-4 h-4 text-amber-500 mb-1.5" />
              <span className="block text-xs font-semibold text-slate-800 dark:text-slate-200">Taller OMA</span>
            </button>
          )}

          {/* Órdenes de Trabajo de Taller (mantenimiento, admin, escuela) */}
          {(isMaintenance || isAdmin || isEscuela) && (
            <button
              onClick={() => onNavigateTab('ordenes_trabajo')}
              className="p-3 bg-slate-50 dark:bg-slate-800/60 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-left transition-all group cursor-pointer"
            >
              <ClipboardList className="w-4 h-4 text-red-500 mb-1.5" />
              <span className="block text-xs font-semibold text-slate-800 dark:text-slate-200">Órdenes de Trabajo</span>
            </button>
          )}

          {/* Bitácoras Flota */}
          <button
            onClick={() => onNavigateTab('bitacoras_aeronaves')}
            className="p-3 bg-slate-50 dark:bg-slate-800/60 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-left transition-all group cursor-pointer"
          >
            <Plane className="w-4 h-4 text-sky-500 mb-1.5" />
            <span className="block text-xs font-semibold text-slate-800 dark:text-slate-200">Bitácoras</span>
          </button>

          {/* Progreso Alumnos (estudiante, instructor, admin, escuela) */}
          {!isMaintenance && !isAccounting && (
            <button
              onClick={() => onNavigateTab('progreso')}
              className="p-3 bg-slate-50 dark:bg-slate-800/60 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-left transition-all group cursor-pointer"
            >
              <BookOpen className="w-4 h-4 text-sky-500 mb-1.5" />
              <span className="block text-xs font-semibold text-slate-800 dark:text-slate-200">Progreso</span>
            </button>
          )}

          {/* Agenda de Vuelos / Itinerario */}
          {!isMaintenance && (
            <button
              onClick={() => onNavigateTab('itinerarios')}
              className="p-3 bg-slate-50 dark:bg-slate-800/60 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-left transition-all group cursor-pointer"
            >
              <Calendar className="w-4 h-4 text-sky-500 mb-1.5" />
              <span className="block text-xs font-semibold text-slate-800 dark:text-slate-200">
                {isStudent ? 'Itinerario' : 'Agenda'}
              </span>
            </button>
          )}

          {/* Solicitudes 11-6 & Itinerario 8 PM */}
          {(isInstructor || isChiefInstructor || isEscuela || isAdmin) && (
            <button
              onClick={() => onNavigateTab('solicitudes_vuelo')}
              className="p-3 bg-slate-50 dark:bg-slate-800/60 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-left transition-all group cursor-pointer"
            >
              <Send className="w-4 h-4 text-sky-500 mb-1.5" />
              <span className="block text-xs font-semibold text-slate-800 dark:text-slate-200">
                Solicitudes Vuelo
              </span>
            </button>
          )}

          {/* Clima & Radar */}
          <button
            onClick={() => onNavigateTab('meteorologia')}
            className="p-3 bg-slate-50 dark:bg-slate-800/60 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-left transition-all group cursor-pointer"
          >
            <CloudSun className="w-4 h-4 text-sky-500 mb-1.5" />
            <span className="block text-xs font-semibold text-slate-800 dark:text-slate-200">Meteorología</span>
          </button>

          {/* Manuales POH */}
          <button
            onClick={() => onNavigateTab('poh')}
            className="p-3 bg-slate-50 dark:bg-slate-800/60 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-left transition-all group cursor-pointer"
          >
            <BookMarked className="w-4 h-4 text-indigo-500 mb-1.5" />
            <span className="block text-xs font-semibold text-slate-800 dark:text-slate-200">Manuales POH</span>
          </button>

          {/* Combustible */}
          <button
            onClick={() => onNavigateTab('calculadora_combustible')}
            className="p-3 bg-slate-50 dark:bg-slate-800/60 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-left transition-all group cursor-pointer"
          >
            <Fuel className="w-4 h-4 text-amber-500 mb-1.5" />
            <span className="block text-xs font-semibold text-slate-800 dark:text-slate-200">Combustible</span>
          </button>

          {/* Notificaciones Correo */}
          <button
            onClick={() => onNavigateTab('correos')}
            className="p-3 bg-slate-50 dark:bg-slate-800/60 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-left transition-all group cursor-pointer"
          >
            <Mail className="w-4 h-4 text-slate-500 mb-1.5" />
            <span className="block text-xs font-semibold text-slate-800 dark:text-slate-200">Notificaciones</span>
          </button>

          {/* Rentabilidad Financiera (escuela, admin, contabilidad) */}
          {(isEscuela || isAdmin || isAccounting) && (
            <button
              onClick={() => onNavigateTab('dashboard_financiero')}
              className="p-3 bg-slate-50 dark:bg-slate-800/60 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-left transition-all group cursor-pointer"
            >
              <TrendingUp className="w-4 h-4 text-emerald-500 mb-1.5" />
              <span className="block text-xs font-semibold text-slate-800 dark:text-slate-200">Finanzas</span>
            </button>
          )}

          {/* Reporte Horas (escuela, admin, contabilidad) */}
          {(isEscuela || isAdmin || isAccounting) && (
            <button
              onClick={() => onNavigateTab('reporte_horas')}
              className="p-3 bg-slate-50 dark:bg-slate-800/60 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-left transition-all group cursor-pointer"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-500 mb-1.5" />
              <span className="block text-xs font-semibold text-slate-800 dark:text-slate-200">Reporte Horas</span>
            </button>
          )}

          {/* Contabilidad (estudiante, contabilidad, admin, escuela) */}
          {(isStudent || isAccounting || isAdmin || isEscuela) && (
            <button
              onClick={() => onNavigateTab('contabilidad')}
              className="p-3 bg-slate-50 dark:bg-slate-800/60 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-left transition-all group cursor-pointer"
            >
              <Wallet className="w-4 h-4 text-emerald-500 mb-1.5" />
              <span className="block text-xs font-semibold text-slate-800 dark:text-slate-200">Saldos & Pagos</span>
            </button>
          )}

          {/* Portal Instructor (instructor, instructor_en_jefe, admin, escuela) */}
          {(isInstructor || isChiefInstructor || isAdmin || isEscuela) && (
            <button
              onClick={() => onNavigateTab('instructor_portal')}
              className="p-3 bg-slate-50 dark:bg-slate-800/60 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-left transition-all group cursor-pointer"
            >
              <Clock className="w-4 h-4 text-sky-500 mb-1.5" />
              <span className="block text-xs font-semibold text-slate-800 dark:text-slate-200">Portal CFI</span>
            </button>
          )}

          {/* Honorarios Instructor (instructor y contabilidad) */}
          {(isInstructor || isAccounting) && (
            <button
              onClick={() => onNavigateTab('honorarios_instructor')}
              className="p-3 bg-slate-50 dark:bg-slate-800/60 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-left transition-all group cursor-pointer"
            >
              <Receipt className="w-4 h-4 text-emerald-500 mb-1.5" />
              <span className="block text-xs font-semibold text-slate-800 dark:text-slate-200">
                {isAccounting ? 'Honorarios Instructores' : 'Honorarios'}
              </span>
            </button>
          )}

          {/* Directorio de Usuarios (contabilidad, admin, escuela) */}
          {(isAccounting || isAdmin || isEscuela) && (
            <button
              onClick={() => onNavigateTab('usuarios')}
              className="p-3 bg-slate-50 dark:bg-slate-800/60 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-left transition-all group cursor-pointer"
            >
              <Users className="w-4 h-4 text-purple-500 mb-1.5" />
              <span className="block text-xs font-semibold text-slate-800 dark:text-slate-200">Usuarios</span>
            </button>
          )}

          {/* WhatsApp (admin, escuela) */}
          {(isAdmin || isEscuela) && (
            <button
              onClick={() => onNavigateTab('whatsapp')}
              className="p-3 bg-slate-50 dark:bg-slate-800/60 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-left transition-all group cursor-pointer"
            >
              <MessageSquare className="w-4 h-4 text-emerald-500 mb-1.5" />
              <span className="block text-xs font-semibold text-slate-800 dark:text-slate-200">WhatsApp</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
