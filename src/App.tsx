import React, { useState, useEffect } from 'react';
import { User } from './types';
import { api } from './services/api';
import { LanguageProvider, useLanguage } from './i18n/LanguageContext';
import { AuthProvider, useAuth } from './firebase/AuthContext';
import { ThemeProvider, useTheme } from './context/ThemeContext';
import { ThemeCustomizerModal } from './components/ThemeCustomizerModal';
import { Sidebar } from './components/Sidebar';
import { Header } from './components/Header';
import { MobileBottomNav } from './components/MobileBottomNav';
import { LoginScreen } from './components/LoginScreen';
import { MainDashboardHub } from './components/MainDashboardHub';
import { ModuleAAccounting } from './components/ModuleAAccounting';
import { ModuleBInstructor } from './components/ModuleBInstructor';
import { ModuleCFlightProgress } from './components/ModuleCFlightProgress';
import { ItineraryPlanner } from './components/ItineraryPlanner';
import { UserManagementModule } from './components/UserManagementModule';
import { WeatherHubModule } from './components/weather/WeatherHubModule';
import { HoursReportSpreadsheet } from './components/HoursReportSpreadsheet';
import { AircraftLogbookModule } from './components/AircraftLogbookModule';
import { FinancialDashboard } from './components/FinancialDashboard';
import { WhatsAppConfigModule } from './components/WhatsAppConfigModule';
import { FlightFuelCalculatorPage } from './components/fuel/FlightFuelCalculatorPage';
import { POHModule } from './components/poh/POHModule';
import { EmailNotificationHub } from './components/EmailNotificationHub';
import { AircraftWorkshopModule } from './components/AircraftWorkshopModule';
import { WorkshopWorkOrdersSection } from './components/WorkshopWorkOrdersSection';
import { InstructorFeeManager } from './components/InstructorFeeManager';
import { FlightRequestsModule } from './components/FlightRequestsModule';
import { SkyOpsLogo } from './components/SkyOpsLogo';
import { WelcomeCinematicIntro } from './components/WelcomeCinematicIntro';
import { ErrorBoundary } from './components/ErrorBoundary';
import { AnimatePresence, motion } from 'motion/react';
import { Loader2, ShieldAlert } from 'lucide-react';

function SkyOpsDashboard() {
  const { t } = useLanguage();
  const { isModalOpen, closeModal, applyUserPreferences } = useTheme();
  const {
    firebaseUser,
    currentUser: authUser,
    allUsers: firestoreUsers,
    isLoading: authLoading,
    isFirebaseConnected,
    selectUser: setAuthUser,
    logout: authLogout,
    refreshCurrentUserData
  } = useAuth();

  // Estado de pantalla de bienvenida cinematográfica
  const [showIntro, setShowIntro] = useState<boolean>(true);

  const [users, setUsers] = useState<User[]>([]);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(false);
  const [logoutMessage, setLogoutMessage] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<string>('inicio');
  const [loading, setLoading] = useState<boolean>(true);
  const [instructorLockInfo, setInstructorLockInfo] = useState<{ locked: boolean; reason?: string }>({ locked: false });

  // Sidebar Layout States
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState<boolean>(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState<boolean>(false);

  // Hoja preseleccionada para abrir desde otros módulos
  const [preselectedSheetId, setPreselectedSheetId] = useState<string | undefined>(undefined);

  const loadInitialData = async () => {
    try {
      const allUsers = await api.getUsers();
      const safeList = allUsers && allUsers.length > 0 ? allUsers : [];
      setUsers(safeList);
      // Iniciar siempre en el menú de inicio de sesión sin preseleccionar perfil activo
    } catch (err) {
      console.error('Error al inicializar usuarios:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadInitialData();
  }, []);

  // Mantener sincronizada la lista de usuarios con Firestore cuando se actualiza
  useEffect(() => {
    if (firestoreUsers && firestoreUsers.length > 0) {
      setUsers(firestoreUsers);
    }
  }, [firestoreUsers]);

  // Si el usuario inicia sesión con Google en Firebase Auth, actualizar estado
  useEffect(() => {
    if (authUser) {
      setCurrentUser(authUser);
      setIsLoggedIn(true);
    }
  }, [authUser]);

  // Verificar Hard Lock cuando el usuario actual es instructor
  useEffect(() => {
    const checkLock = async () => {
      if (currentUser && currentUser.rol === 'instructor' && isLoggedIn) {
        try {
          const res = await api.checkInstructorLock(currentUser.id);
          setInstructorLockInfo(res);
        } catch (err) {
          console.error('Error al verificar lock:', err);
        }
      } else {
        setInstructorLockInfo({ locked: false });
      }
    };
    checkLock();
  }, [currentUser, isLoggedIn]);

  // Sincronizar preferencias de tema personalizadas del usuario si existen
  useEffect(() => {
    if (currentUser?.preferencias_tema) {
      applyUserPreferences(currentUser.preferencias_tema);
    }
  }, [currentUser?.id, currentUser?.preferencias_tema]);

  const handleSelectUser = (user: User) => {
    setCurrentUser(user);
    setAuthUser(user);
    if (user.preferencias_tema) {
      applyUserPreferences(user.preferencias_tema);
    }
    // Ajustar tab por defecto si el usuario no tiene permiso en el tab actual
    const restrictedForStudent = ['reporte_horas', 'dashboard_financiero', 'whatsapp', 'instructor_portal', 'honorarios_instructor', 'usuarios', 'taller_mantenimiento', 'ordenes_trabajo', 'solicitudes_vuelo'];
    const restrictedForInstructor = ['contabilidad', 'reporte_horas', 'dashboard_financiero', 'whatsapp', 'usuarios', 'taller_mantenimiento', 'ordenes_trabajo'];
    const restrictedForChiefInstructor = ['contabilidad', 'reporte_horas', 'dashboard_financiero', 'whatsapp', 'usuarios', 'taller_mantenimiento', 'ordenes_trabajo', 'honorarios_instructor'];
    const restrictedForMantenimiento = ['contabilidad', 'dashboard_financiero', 'whatsapp', 'usuarios', 'instructor_portal', 'honorarios_instructor', 'reporte_horas', 'solicitudes_vuelo'];
    const restrictedForAccounting = ['progreso', 'instructor_portal', 'taller_mantenimiento', 'ordenes_trabajo', 'whatsapp', 'solicitudes_vuelo'];

    if (user.rol === 'estudiante' && restrictedForStudent.includes(activeTab)) {
      setActiveTab(activeTab === 'solicitudes_vuelo' ? 'itinerarios' : 'inicio');
    } else if (user.rol === 'instructor' && restrictedForInstructor.includes(activeTab)) {
      setActiveTab('instructor_portal');
    } else if (user.rol === 'instructor_en_jefe' && restrictedForChiefInstructor.includes(activeTab)) {
      setActiveTab('solicitudes_vuelo');
    } else if (user.rol === 'mantenimiento') {
      if (restrictedForMantenimiento.includes(activeTab)) {
        setActiveTab('taller_mantenimiento');
      }
    } else if (user.rol === 'contabilidad' && restrictedForAccounting.includes(activeTab)) {
      setActiveTab('contabilidad');
    }
  };

  const handleLogin = (user: User) => {
    setCurrentUser(user);
    setAuthUser(user);
    if (user.preferencias_tema) {
      applyUserPreferences(user.preferencias_tema);
    }
    const restrictedForStudent = ['reporte_horas', 'dashboard_financiero', 'whatsapp', 'instructor_portal', 'honorarios_instructor', 'usuarios', 'taller_mantenimiento', 'ordenes_trabajo', 'solicitudes_vuelo'];
    const restrictedForInstructor = ['contabilidad', 'reporte_horas', 'dashboard_financiero', 'whatsapp', 'usuarios', 'taller_mantenimiento', 'ordenes_trabajo'];
    const restrictedForChiefInstructor = ['contabilidad', 'reporte_horas', 'dashboard_financiero', 'whatsapp', 'usuarios', 'taller_mantenimiento', 'ordenes_trabajo', 'honorarios_instructor'];
    const restrictedForMantenimiento = ['contabilidad', 'reporte_horas', 'dashboard_financiero', 'whatsapp', 'usuarios', 'instructor_portal', 'honorarios_instructor', 'solicitudes_vuelo'];
    const restrictedForAccounting = ['progreso', 'instructor_portal', 'taller_mantenimiento', 'ordenes_trabajo', 'whatsapp', 'solicitudes_vuelo'];

    if (user.rol === 'estudiante' && restrictedForStudent.includes(activeTab)) {
      setActiveTab(activeTab === 'solicitudes_vuelo' ? 'itinerarios' : 'inicio');
    } else if (user.rol === 'instructor' && restrictedForInstructor.includes(activeTab)) {
      setActiveTab('instructor_portal');
    } else if (user.rol === 'instructor_en_jefe' && restrictedForChiefInstructor.includes(activeTab)) {
      setActiveTab('solicitudes_vuelo');
    } else if (user.rol === 'mantenimiento') {
      if (restrictedForMantenimiento.includes(activeTab)) {
        setActiveTab('taller_mantenimiento');
      }
    } else if (user.rol === 'contabilidad' && restrictedForAccounting.includes(activeTab)) {
      setActiveTab('contabilidad');
    }
    setIsLoggedIn(true);
    setLogoutMessage(null);
  };

  const handleLogout = async () => {
    await authLogout();
    setIsLoggedIn(false);
    setCurrentUser(null);
    setActiveTab('inicio');
    setIsMobileSidebarOpen(false);
    setLogoutMessage(t('sessionClosed'));
  };

  const handleOpenFlightSheet = (sheetId?: string) => {
    setPreselectedSheetId(sheetId);
    setActiveTab('progreso');
  };

  const handleOpenNewItinerary = (instructorId: string, studentId?: string) => {
    setActiveTab('itinerarios');
  };

  const safeNavigateTab = (tab: string, extraId?: string) => {
    if (extraId) {
      setPreselectedSheetId(extraId);
    } else {
      setPreselectedSheetId(undefined);
    }
    // Restricción estricta de seguridad: estudiante no accede a taller, órdenes de trabajo ni finanzas
    if (
      currentUser?.rol === 'estudiante' &&
      ['reporte_horas', 'dashboard_financiero', 'whatsapp', 'instructor_portal', 'honorarios_instructor', 'usuarios', 'taller_mantenimiento', 'ordenes_trabajo'].includes(tab)
    ) {
      setActiveTab('inicio');
      return;
    }
    // Restricción estricta de seguridad: el rol de instructor e instructor_en_jefe NO tienen acceso a contabilidad, finanzas, taller ni órdenes de trabajo
    if (
      (currentUser?.rol === 'instructor' || currentUser?.rol === 'instructor_en_jefe') &&
      ['contabilidad', 'dashboard_financiero', 'reporte_horas', 'usuarios', 'whatsapp', 'taller_mantenimiento', 'ordenes_trabajo'].includes(tab)
    ) {
      setActiveTab(currentUser.rol === 'instructor_en_jefe' ? 'solicitudes_vuelo' : 'instructor_portal');
      return;
    }
    // Restricción estricta de seguridad: contabilidad NO accede a hoja de progreso, taller, órdenes de trabajo, portal instructor ni solicitudes_vuelo
    if (
      currentUser?.rol === 'contabilidad' &&
      ['progreso', 'instructor_portal', 'taller_mantenimiento', 'ordenes_trabajo', 'whatsapp', 'solicitudes_vuelo'].includes(tab)
    ) {
      setActiveTab('contabilidad');
      return;
    }
    // Restricción de seguridad: el rol de taller/mantenimiento NO tiene acceso a finanzas, contabilidad, reportes de horas ni solicitudes_vuelo
    if (
      currentUser?.rol === 'mantenimiento' &&
      ['contabilidad', 'dashboard_financiero', 'reporte_horas', 'usuarios', 'instructor_portal', 'honorarios_instructor', 'whatsapp', 'solicitudes_vuelo'].includes(tab)
    ) {
      setActiveTab('taller_mantenimiento');
      return;
    }
    if (tab === 'honorarios_instructor' && !['instructor', 'contabilidad', 'admin', 'escuela'].includes(currentUser?.rol || '')) {
      setActiveTab('inicio');
      return;
    }
    if (tab === 'solicitudes_vuelo' && !['instructor', 'instructor_en_jefe', 'escuela', 'admin'].includes(currentUser?.rol || '')) {
      setActiveTab(currentUser?.rol === 'estudiante' ? 'itinerarios' : 'inicio');
      return;
    }
    setActiveTab(tab);
  };

  // Si el usuario no ha iniciado sesión o no tiene perfil seleccionado, mostrar pantalla con transición cinematográfica
  if (!isLoggedIn || !currentUser) {
    if (loading && !showIntro) {
      return (
        <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-sky-950 flex flex-col items-center justify-center text-white p-6 space-y-6">
          <SkyOpsLogo
            variant="hero"
            size="xl"
            theme="dark"
            animate={true}
            badgeText="Flight Ops"
            subtitle="Cargando plataforma de operaciones..."
          />
          <div className="flex items-center gap-2.5 text-xs font-semibold text-sky-300/80 bg-slate-900/80 px-4 py-2 rounded-full border border-sky-500/20 shadow-lg">
            <Loader2 className="w-4 h-4 animate-spin text-sky-400" />
            <span>{t('loading')}</span>
          </div>
        </div>
      );
    }

    return (
      <div className="relative min-h-screen bg-slate-950 overflow-hidden">
        <AnimatePresence mode="wait">
          {showIntro ? (
            <WelcomeCinematicIntro
              key="skyops-cinematic-intro"
              onFinish={() => setShowIntro(false)}
            />
          ) : (
            <motion.div
              key="skyops-login-screen"
              initial={{ opacity: 0, scale: 0.97, filter: 'blur(10px)' }}
              animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
              exit={{ opacity: 0, scale: 0.98, filter: 'blur(8px)' }}
              transition={{
                duration: 1.1,
                ease: [0.16, 1, 0.3, 1]
              }}
              className="min-h-screen"
            >
              <LoginScreen
                users={users}
                onLogin={handleLogin}
                firebaseConnected={isFirebaseConnected}
                loggedOutMessage={logoutMessage}
                onReplayIntro={() => setShowIntro(true)}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex font-sans antialiased">
      {/* Vertical Collapsible Sidebar for Desktop & Mobile Drawer */}
      <Sidebar
        currentUser={currentUser}
        allUsers={users}
        onSelectUser={handleSelectUser}
        activeTab={activeTab}
        onSelectTab={(tab) => safeNavigateTab(tab)}
        isCollapsed={isSidebarCollapsed}
        onToggleCollapse={() => setIsSidebarCollapsed(prev => !prev)}
        isMobileOpen={isMobileSidebarOpen}
        onToggleMobile={() => setIsMobileSidebarOpen(prev => !prev)}
        instructorLockInfo={instructorLockInfo}
        onLogout={handleLogout}
      />

      {/* Main Content Area with Adaptive Left Margin */}
      <div
        className={`flex-1 flex flex-col min-h-screen transition-all duration-300 ease-in-out pb-20 md:pb-0 ${
          isSidebarCollapsed ? 'md:pl-20' : 'md:pl-64'
        }`}
      >
        {/* Top Header Bar */}
        <Header
          currentUser={currentUser}
          allUsers={users}
          onSelectUser={handleSelectUser}
          activeTab={activeTab}
          onToggleMobile={() => setIsMobileSidebarOpen(prev => !prev)}
          instructorLockInfo={instructorLockInfo}
          onLogout={handleLogout}
          isGoogleAuth={Boolean(firebaseUser)}
          firebaseConnected={isFirebaseConnected}
          onNavigateTab={safeNavigateTab}
        />

        {/* Dynamic Section Content */}
        <main className="flex-1 max-w-7xl w-full mx-auto px-3 sm:px-6 lg:px-8 py-3.5 sm:py-5">
          <ErrorBoundary onReset={loadInitialData}>
            {activeTab === 'inicio' && (
              <MainDashboardHub
                currentUser={currentUser}
                allUsers={users}
                onNavigateTab={safeNavigateTab}
                onRefreshAll={loadInitialData}
              />
            )}

            {activeTab === 'progreso' && currentUser.rol !== 'contabilidad' && (
              <ModuleCFlightProgress
                currentUser={currentUser}
                allUsers={users}
                preselectedSheetId={preselectedSheetId}
                onRefreshAll={loadInitialData}
              />
            )}

            {activeTab === 'itinerarios' && (
              <ItineraryPlanner
                currentUser={currentUser}
                allUsers={users}
                onOpenFlightSheet={handleOpenFlightSheet}
                onRefreshAll={loadInitialData}
                onNavigateTab={safeNavigateTab}
              />
            )}

            {activeTab === 'solicitudes_vuelo' && (
              <FlightRequestsModule
                currentUser={currentUser}
                allUsers={users}
                onRefreshAll={loadInitialData}
              />
            )}

            {(activeTab === 'meteorologia' || activeTab === 'clima_windy' || activeTab === 'metar_taf') && (
              <WeatherHubModule
                currentUser={currentUser}
                allUsers={users}
                defaultSubTab={activeTab === 'metar_taf' ? 'metar_taf' : 'windy'}
              />
            )}

            {activeTab === 'taller_mantenimiento' && (
              currentUser.rol === 'mantenimiento' || currentUser.rol === 'escuela' || currentUser.rol === 'admin' ? (
                <AircraftWorkshopModule
                  currentUser={currentUser}
                  onRefreshAll={loadInitialData}
                />
              ) : (
                <div className="bg-slate-900/90 dark:bg-slate-950 p-8 rounded-2xl border border-slate-800 shadow-xl text-center max-w-lg mx-auto my-12 space-y-4">
                  <div className="w-14 h-14 rounded-xl bg-rose-950/40 border border-rose-500/30 text-rose-400 flex items-center justify-center mx-auto">
                    <ShieldAlert className="w-7 h-7" />
                  </div>
                  <h3 className="text-base font-semibold text-white tracking-tight">Acceso Restringido a Taller Aeronáutico</h3>
                  <div className="pt-2">
                    <button
                      onClick={() => safeNavigateTab('inicio')}
                      className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-100 border border-slate-700 rounded-lg text-xs font-medium transition-all cursor-pointer"
                    >
                      Volver al Inicio
                    </button>
                  </div>
                </div>
              )
            )}

            {activeTab === 'ordenes_trabajo' && (
              currentUser.rol === 'mantenimiento' || currentUser.rol === 'escuela' || currentUser.rol === 'admin' ? (
                <WorkshopWorkOrdersSection
                  currentUser={currentUser}
                  onRefreshAll={loadInitialData}
                  onNavigateTab={safeNavigateTab}
                />
              ) : (
                <div className="bg-slate-900/90 dark:bg-slate-950 p-8 rounded-2xl border border-slate-800 shadow-xl text-center max-w-lg mx-auto my-12 space-y-4">
                  <div className="w-14 h-14 rounded-xl bg-rose-950/40 border border-rose-500/30 text-rose-400 flex items-center justify-center mx-auto">
                    <ShieldAlert className="w-7 h-7" />
                  </div>
                  <h3 className="text-base font-semibold text-white tracking-tight">Acceso Restringido a Órdenes de Trabajo</h3>
                  <div className="pt-2">
                    <button
                      onClick={() => safeNavigateTab('inicio')}
                      className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-100 border border-slate-700 rounded-lg text-xs font-medium transition-all cursor-pointer"
                    >
                      Volver al Inicio
                    </button>
                  </div>
                </div>
              )
            )}

            {activeTab === 'reporte_horas' && (currentUser.rol === 'admin' || currentUser.rol === 'escuela' || currentUser.rol === 'contabilidad') && (
              <HoursReportSpreadsheet
                currentUser={currentUser}
              />
            )}

            {activeTab === 'reporte_horas' && currentUser.rol === 'mantenimiento' && (
              <div className="bg-slate-900/90 dark:bg-slate-950 p-8 rounded-2xl border border-slate-800 shadow-xl text-center max-w-lg mx-auto my-12 space-y-4">
                <div className="w-14 h-14 rounded-xl bg-rose-950/40 border border-rose-500/30 text-rose-400 flex items-center justify-center mx-auto">
                  <ShieldAlert className="w-7 h-7" />
                </div>
                <h3 className="text-base font-semibold text-white tracking-tight">Acceso Restringido a Reporte de Horas Contables</h3>
                <div className="pt-2">
                  <button
                    onClick={() => setActiveTab('taller_mantenimiento')}
                    className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-100 border border-slate-700 rounded-lg text-xs font-medium transition-all cursor-pointer"
                  >
                    Ir a Taller Aeronáutico
                  </button>
                </div>
              </div>
            )}

            {activeTab === 'bitacoras_aeronaves' && (
              <AircraftLogbookModule
                currentUser={currentUser}
                allUsers={users}
                onRefreshAll={loadInitialData}
              />
            )}

            {activeTab === 'dashboard_financiero' && (
              <FinancialDashboard
                currentUser={currentUser}
                onRefreshAll={loadInitialData}
              />
            )}

            {activeTab === 'whatsapp' && (
              <WhatsAppConfigModule
                currentUser={currentUser}
              />
            )}

            {activeTab === 'contabilidad' && currentUser.rol !== 'instructor' && currentUser.rol !== 'instructor_en_jefe' && currentUser.rol !== 'mantenimiento' && (
              <ModuleAAccounting
                currentUser={currentUser}
                allUsers={users}
                onRefreshData={loadInitialData}
              />
            )}

            {activeTab === 'contabilidad' && currentUser.rol === 'mantenimiento' && (
              <div className="bg-slate-900/90 dark:bg-slate-950 p-8 rounded-2xl border border-slate-800 shadow-xl text-center max-w-lg mx-auto my-12 space-y-4">
                <div className="w-14 h-14 rounded-xl bg-rose-950/40 border border-rose-500/30 text-rose-400 flex items-center justify-center mx-auto">
                  <ShieldAlert className="w-7 h-7" />
                </div>
                <h3 className="text-base font-semibold text-white tracking-tight">Acceso Restringido a Contabilidad</h3>
                <div className="pt-2">
                  <button
                    onClick={() => setActiveTab('taller_mantenimiento')}
                    className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-100 border border-slate-700 rounded-lg text-xs font-medium transition-all cursor-pointer"
                  >
                    Ir a Taller Aeronáutico
                  </button>
                </div>
              </div>
            )}

            {activeTab === 'contabilidad' && (currentUser.rol === 'instructor' || currentUser.rol === 'instructor_en_jefe') && (
              <div className="bg-slate-900/90 dark:bg-slate-950 p-8 rounded-2xl border border-slate-800 shadow-xl text-center max-w-lg mx-auto my-12 space-y-4">
                <div className="w-14 h-14 rounded-xl bg-rose-950/40 border border-rose-500/30 text-rose-400 flex items-center justify-center mx-auto">
                  <ShieldAlert className="w-7 h-7" />
                </div>
                <h3 className="text-base font-semibold text-white tracking-tight">Acceso Restringido a Contabilidad</h3>
                <div className="pt-2">
                  <button
                    onClick={() => setActiveTab(currentUser.rol === 'instructor_en_jefe' ? 'solicitudes_vuelo' : 'honorarios_instructor')}
                    className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-100 border border-slate-700 rounded-lg text-xs font-medium transition-all cursor-pointer"
                  >
                    {currentUser.rol === 'instructor_en_jefe' ? 'Ir a Solicitudes de Vuelo' : 'Ir a Mis Honorarios'}
                  </button>
                </div>
              </div>
            )}

            {activeTab === 'correos' && (
              <EmailNotificationHub
                currentUser={currentUser}
                allUsers={users}
              />
            )}

            {activeTab === 'instructor_portal' && (
              <ModuleBInstructor
                currentUser={currentUser}
                allUsers={users}
                onOpenFlightSheet={handleOpenFlightSheet}
                onOpenNewItinerary={handleOpenNewItinerary}
                onUserUpdated={loadInitialData}
              />
            )}

            {activeTab === 'honorarios_instructor' && ['instructor', 'contabilidad', 'admin', 'escuela'].includes(currentUser.rol) && (
              <InstructorFeeManager
                currentUser={currentUser}
                allUsers={users}
                defaultInstructorId={currentUser.rol === 'instructor' ? currentUser.id : undefined}
                mode={currentUser.rol === 'instructor' ? 'instructor' : 'accounting'}
                onUpdated={loadInitialData}
              />
            )}

            {activeTab === 'usuarios' && currentUser.rol !== 'instructor' && currentUser.rol !== 'instructor_en_jefe' && currentUser.rol !== 'estudiante' && (
              <UserManagementModule
                currentUser={currentUser}
                allUsers={users}
                onRefreshAll={loadInitialData}
              />
            )}

            {activeTab === 'calculadora_combustible' && (
              <FlightFuelCalculatorPage
                currentUser={currentUser}
              />
            )}

            {activeTab === 'poh' && (
              <POHModule
                currentUser={currentUser}
              />
            )}
          </ErrorBoundary>
        </main>

        {/* Footer */}
        <footer className="bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 py-3.5 mt-auto hidden sm:block">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-slate-500 dark:text-slate-400">
            <div className="flex items-center gap-2.5">
              <SkyOpsLogo variant="icon" size="xs" theme="light" />
              <span className="font-bold text-slate-800 dark:text-slate-200">{t('schoolName')} {t('version')}</span>
              <span>•</span>
              <span>{t('systemTitle')}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-sky-50 dark:bg-sky-950/50 text-sky-700 dark:text-sky-300 border border-sky-200 dark:border-sky-800">
                Cloud Operations & Intelligence
              </span>
              <span>{t('regulatoryCompliance')}</span>
            </div>
          </div>
        </footer>

        {/* Mobile Ergonomic Bottom Navigation Dock */}
        <MobileBottomNav
          currentUser={currentUser}
          activeTab={activeTab}
          onSelectTab={(tab) => safeNavigateTab(tab)}
          onOpenMenu={() => setIsMobileSidebarOpen(true)}
        />
      </div>

      {/* Global Theme & Color Customizer Modal (Accessible to All Roles) */}
      <ThemeCustomizerModal
        currentUser={currentUser || undefined}
        isOpen={isModalOpen}
        onClose={closeModal}
      />
    </div>
  );
}

export default function App() {
  return (
    <LanguageProvider>
      <AuthProvider>
        <ThemeProvider>
          <SkyOpsDashboard />
        </ThemeProvider>
      </AuthProvider>
    </LanguageProvider>
  );
}
