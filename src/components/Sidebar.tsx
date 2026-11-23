import React from 'react';
import { User, UserRole } from '../types';
import { useLanguage } from '../i18n/LanguageContext';
import { useTheme } from '../context/ThemeContext';
import { LanguageToggle } from './LanguageToggle';
import { SkyOpsEmblem } from './SkyOpsLogo';
import {
  LayoutDashboard,
  ShieldAlert,
  UserCircle,
  Clock,
  Wallet,
  BookOpen,
  Calendar,
  ChevronLeft,
  ChevronRight,
  X,
  LogOut,
  Users,
  CloudSun,
  FileSpreadsheet,
  BarChart3,
  MessageSquare,
  Sun,
  Moon,
  Palette,
  Plane,
  Fuel,
  BookMarked,
  Mail,
  Wrench,
  ClipboardList,
  Receipt,
  Send
} from 'lucide-react';

interface SidebarProps {
  currentUser: User;
  allUsers?: User[];
  onSelectUser?: (user: User) => void;
  activeTab: string;
  onSelectTab: (tab: string) => void;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  isMobileOpen: boolean;
  onToggleMobile: () => void;
  instructorLockInfo?: { locked: boolean; reason?: string };
  onLogout?: () => void;
}

interface NavItem {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  roles: UserRole[];
  badgeCritical?: boolean;
}

interface NavSection {
  id: string;
  title: string;
  items: NavItem[];
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentUser,
  activeTab,
  onSelectTab,
  isCollapsed,
  onToggleCollapse,
  isMobileOpen,
  onToggleMobile,
  instructorLockInfo,
  onLogout
}) => {
  const { t, language } = useLanguage();
  const { isDark, toggleTheme, openModal, activeHex } = useTheme();

  const getRolePresentation = (role: UserRole) => {
    switch (role) {
      case 'admin':
        return { label: 'Administrador', short: 'Admin' };
      case 'escuela':
        return { label: 'Dirección Escuela', short: 'Dirección' };
      case 'instructor':
        return { label: 'Instructor CFI', short: 'CFI' };
      case 'instructor_en_jefe':
        return { label: 'Instructor en Jefe', short: 'Jefe Pilotos' };
      case 'contabilidad':
        return { label: 'Contabilidad', short: 'Contab.' };
      case 'mantenimiento':
        return { label: 'Taller / OMA', short: 'Taller' };
      case 'estudiante':
      default:
        return { label: 'Piloto Alumno', short: 'Alumno' };
    }
  };

  // Organización lógica y profesional en 3 secciones operativas
  const navSections: NavSection[] = [
    {
      id: 'operaciones',
      title: 'Operaciones de Vuelo',
      items: [
        {
          id: 'inicio',
          label: t('tab_inicio') || 'Inicio',
          icon: LayoutDashboard,
          roles: ['estudiante', 'instructor', 'instructor_en_jefe', 'admin', 'contabilidad', 'escuela', 'mantenimiento']
        },
        {
          id: 'solicitudes_vuelo',
          label:
            currentUser?.rol === 'instructor_en_jefe' || currentUser?.rol === 'escuela' || currentUser?.rol === 'admin'
              ? 'Solicitudes & Aprobación'
              : 'Solicitudes de Vuelo',
          icon: Send,
          roles: ['instructor', 'instructor_en_jefe', 'escuela', 'admin']
        },
        {
          id: 'itinerarios',
          label: currentUser?.rol === 'estudiante' ? 'Itinerario' : (t('tab_itinerarios') || 'Itinerarios'),
          icon: Calendar,
          roles: ['estudiante', 'instructor', 'instructor_en_jefe', 'admin', 'escuela', 'mantenimiento']
        },
        {
          id: 'meteorologia',
          label: t('tab_meteorologia') || 'Meteorología',
          icon: CloudSun,
          roles: ['estudiante', 'instructor', 'instructor_en_jefe', 'admin', 'escuela', 'mantenimiento']
        },
        {
          id: 'correos',
          label: 'Notificaciones',
          icon: Mail,
          roles: ['estudiante', 'instructor', 'instructor_en_jefe', 'contabilidad', 'admin', 'escuela', 'mantenimiento']
        }
      ]
    },
    {
      id: 'tecnica_flota',
      title: 'Técnica & Flota',
      items: [
        {
          id: 'taller_mantenimiento',
          label: 'Taller Aeronáutico (OMA)',
          icon: Wrench,
          roles: ['mantenimiento', 'admin', 'escuela']
        },
        {
          id: 'ordenes_trabajo',
          label: t('tab_ordenes_trabajo') || 'Órdenes de Trabajo',
          icon: ClipboardList,
          roles: ['mantenimiento', 'escuela', 'admin']
        },
        {
          id: 'bitacoras_aeronaves',
          label: t('tab_bitacoras_aeronaves') || 'Bitácoras de Vuelo',
          icon: Plane,
          roles: ['estudiante', 'escuela', 'admin', 'contabilidad', 'instructor', 'instructor_en_jefe', 'mantenimiento']
        },
        {
          id: 'poh',
          label: 'Manuales POH',
          icon: BookMarked,
          roles: ['estudiante', 'instructor', 'instructor_en_jefe', 'admin', 'escuela', 'mantenimiento']
        },
        {
          id: 'calculadora_combustible',
          label: 'Calculadora Combustible',
          icon: Fuel,
          roles: ['estudiante', 'instructor', 'instructor_en_jefe', 'admin', 'escuela', 'mantenimiento']
        }
      ]
    },
    {
      id: 'gestion_control',
      title: 'Gestión & Control',
      items: [
        {
          id: 'progreso',
          label: t('tab_progreso') || 'Progreso Alumnos',
          icon: BookOpen,
          roles: ['estudiante', 'instructor', 'instructor_en_jefe', 'admin', 'escuela']
        },
        {
          id: 'instructor_portal',
          label: 'Portal Instructor',
          icon: Clock,
          roles: ['instructor', 'instructor_en_jefe', 'admin', 'escuela']
        },
        {
          id: 'honorarios_instructor',
          label: currentUser?.rol === 'instructor' ? (t('tab_honorarios_instructor') || 'Honorarios') : 'Honorarios Instructores',
          icon: Receipt,
          roles: ['instructor', 'contabilidad', 'admin', 'escuela']
        },
        {
          id: 'reporte_horas',
          label: 'Reporte de Horas',
          icon: FileSpreadsheet,
          roles: ['escuela', 'admin', 'contabilidad']
        },
        {
          id: 'contabilidad',
          label: t('tab_contabilidad') || 'Contabilidad & Pagos',
          icon: Wallet,
          roles: ['estudiante', 'contabilidad', 'admin', 'escuela']
        },
        {
          id: 'dashboard_financiero',
          label: 'Métricas Financieras',
          icon: BarChart3,
          roles: ['escuela', 'admin', 'contabilidad']
        },
        {
          id: 'usuarios',
          label: 'Directorio Usuarios',
          icon: Users,
          roles: ['admin', 'contabilidad', 'escuela']
        },
        {
          id: 'whatsapp',
          label: 'WhatsApp Business',
          icon: MessageSquare,
          roles: ['admin', 'escuela']
        }
      ]
    }
  ];

  // Filtrar secciones y elementos autorizados para el rol actual
  const userRole = currentUser?.rol || 'estudiante';
  const visibleSections = navSections
    .map(section => ({
      ...section,
      items: section.items.filter(item => item.roles.includes(userRole))
    }))
    .filter(section => section.items.length > 0);

  const handleTabClick = (tabId: string) => {
    onSelectTab(tabId);
    if (isMobileOpen) {
      onToggleMobile();
    }
  };

  return (
    <>
      {/* Mobile Backdrop Overlay */}
      {isMobileOpen && (
        <div
          onClick={onToggleMobile}
          className="fixed inset-0 bg-slate-950/80 backdrop-blur-xs z-40 md:hidden transition-opacity duration-300"
          aria-hidden="true"
        />
      )}

      {/* Main Sidebar Element */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-50 bg-slate-950 text-white border-r border-slate-800/90 flex flex-col transition-all duration-300 ease-in-out shadow-2xl h-[100dvh] ${
          // Desktop sizing
          isCollapsed ? 'md:w-20' : 'md:w-64'
        } ${
          // Mobile translation and width
          isMobileOpen ? 'translate-x-0 w-[85vw] max-w-[320px]' : '-translate-x-full md:translate-x-0'
        }`}
      >
        {/* SIDEBAR HEADER: CLEAN BRAND IDENTITY */}
        <div className="h-16 px-4 border-b border-slate-800/80 flex items-center justify-between flex-shrink-0 bg-slate-950">
          <div className="flex items-center gap-3 overflow-hidden min-w-0">
            <SkyOpsEmblem className="w-8 h-8 flex-shrink-0" theme="dark" animate={false} />
            {(!isCollapsed || isMobileOpen) && (
              <div className="flex flex-col min-w-0">
                <span className="font-bold text-sm tracking-tight text-white uppercase truncate">SkyOps</span>
                <span className="text-[10px] text-slate-400 font-medium tracking-wide truncate">AeroAcademia</span>
              </div>
            )}
          </div>

          {/* Desktop Collapse Button */}
          <button
            onClick={onToggleCollapse}
            aria-label={isCollapsed ? "Expandir menú lateral" : "Colapsar menú lateral"}
            title={isCollapsed ? "Expandir menú" : "Colapsar menú"}
            className="hidden md:flex p-1.5 text-slate-400 hover:text-white hover:bg-slate-900 rounded-lg transition-colors cursor-pointer"
          >
            {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </button>

          {/* Mobile Close Button */}
          <button
            onClick={onToggleMobile}
            aria-label="Cerrar menú lateral"
            className="flex md:hidden p-2 text-slate-400 hover:text-white hover:bg-slate-900 rounded-lg cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* INSTRUCTOR HARD LOCK ALERT IN SIDEBAR (CRIMSON HIGHLIGHT FOR SAFETY) */}
        {currentUser.rol === 'instructor' && instructorLockInfo?.locked && (
          <div className="m-3 p-2.5 bg-red-950/80 border border-red-500/50 rounded-xl text-red-200 text-xs flex items-center gap-2 animate-pulse flex-shrink-0">
            <ShieldAlert className="w-4.5 h-4.5 flex-shrink-0 text-red-400" />
            {(!isCollapsed || isMobileOpen) && (
              <div className="text-[11px] leading-tight min-w-0">
                <span className="font-bold text-red-300 block truncate">BLOQUEO OPERATIVO AOG</span>
                <span className="text-red-200/80 text-[10px] line-clamp-2">{instructorLockInfo.reason}</span>
              </div>
            )}
          </div>
        )}

        {/* NAVIGATION ITEMS ORGANIZED BY SECTION */}
        <nav className="flex-1 px-2.5 py-3 space-y-4 overflow-y-auto no-scrollbar">
          {visibleSections.map((section) => (
            <div key={section.id} className="space-y-1">
              {(!isCollapsed || isMobileOpen) ? (
                <div className="px-3 pt-1 pb-1 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                  {section.title}
                </div>
              ) : (
                <div className="w-8 mx-auto border-t border-slate-800/80 my-2" />
              )}

              {section.items.map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;

                return (
                  <button
                    key={item.id}
                    id={`sidebar-tab-${item.id}`}
                    onClick={() => handleTabClick(item.id)}
                    title={isCollapsed ? item.label : undefined}
                    className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-medium transition-all group cursor-pointer relative ${
                      isActive
                        ? 'bg-slate-800/95 text-white font-semibold shadow-xs border border-slate-700/60'
                        : 'text-slate-300 hover:bg-slate-900 hover:text-white'
                    } ${isCollapsed && !isMobileOpen ? 'justify-center px-2 py-2.5' : ''}`}
                  >
                    {/* Active left indicator */}
                    {isActive && (
                      <span className="absolute left-0 top-1.5 bottom-1.5 w-1 bg-sky-400 rounded-r-full" />
                    )}

                    <Icon
                      className={`w-4.5 h-4.5 flex-shrink-0 transition-transform ${
                        isActive ? 'text-sky-400' : 'text-slate-400 group-hover:text-slate-200'
                      }`}
                    />

                    {(!isCollapsed || isMobileOpen) && (
                      <span className="truncate text-left flex-1">{item.label}</span>
                    )}

                    {/* Red dot for critical notifications if applicable */}
                    {item.badgeCritical && (!isCollapsed || isMobileOpen) && (
                      <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse flex-shrink-0" />
                    )}
                  </button>
                );
              })}
            </div>
          ))}
        </nav>

        {/* CONTROLS & USER PROFILE FOOTER */}
        <div className="p-3 border-t border-slate-800/80 bg-slate-950 flex-shrink-0 space-y-2.5">
          {/* Quick theme and language toggle */}
          {(!isCollapsed || isMobileOpen) ? (
            <div className="flex items-center gap-1.5">
              <div className="flex-1">
                <LanguageToggle variant="compact" />
              </div>
              <button
                type="button"
                id="sidebar-theme-toggle-btn"
                onClick={toggleTheme}
                className="flex items-center justify-center p-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800 text-xs transition-colors cursor-pointer"
                title={isDark ? (language === 'es' ? 'Modo Claro' : 'Light Mode') : (language === 'es' ? 'Modo Oscuro' : 'Dark Mode')}
              >
                {isDark ? <Sun className="w-3.5 h-3.5 text-amber-400" /> : <Moon className="w-3.5 h-3.5 text-sky-400" />}
              </button>
              <button
                type="button"
                id="sidebar-theme-palette-btn"
                onClick={openModal}
                className="flex items-center justify-center p-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800 text-xs transition-colors cursor-pointer"
                title={language === 'es' ? 'Color' : 'Theme'}
              >
                <span
                  className="w-2.5 h-2.5 rounded-full border border-white/40 shadow-2xs"
                  style={{ backgroundColor: activeHex }}
                />
              </button>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-1.5">
              <button
                type="button"
                onClick={toggleTheme}
                title={isDark ? 'Modo Claro' : 'Modo Oscuro'}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
              >
                {isDark ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-sky-400" />}
              </button>
            </div>
          )}

          {/* User profile row: Clean avatar + name + unboxed role + logout */}
          {(!isCollapsed || isMobileOpen) ? (
            <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2.5 min-w-0 flex-1">
                <div className="w-8 h-8 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center flex-shrink-0 overflow-hidden">
                  {currentUser.foto_perfil ? (
                    <img
                      src={currentUser.foto_perfil}
                      alt={currentUser.nombre}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <UserCircle className="w-5 h-5 text-slate-400" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-xs font-semibold text-white truncate leading-tight">
                    {currentUser.nombre}
                  </div>
                  <div className="text-[10px] text-slate-400 font-medium truncate">
                    {getRolePresentation(currentUser.rol).label}
                  </div>
                </div>
              </div>

              {onLogout && (
                <button
                  onClick={onLogout}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-red-400 hover:bg-red-950/30 transition-colors cursor-pointer flex-shrink-0"
                  title={t('logout') || 'Cerrar Sesión'}
                >
                  <LogOut className="w-4 h-4" />
                </button>
              )}
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2">
              <div
                title={`${currentUser.nombre} (${getRolePresentation(currentUser.rol).label})`}
                className="w-8 h-8 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center overflow-hidden"
              >
                {currentUser.foto_perfil ? (
                  <img
                    src={currentUser.foto_perfil}
                    alt={currentUser.nombre}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <UserCircle className="w-5 h-5 text-slate-400" />
                )}
              </div>
              {onLogout && (
                <button
                  onClick={onLogout}
                  title={t('logout') || 'Cerrar Sesión'}
                  className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-red-400 hover:bg-red-950/40 transition-colors cursor-pointer"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              )}
            </div>
          )}
        </div>
      </aside>
    </>
  );
};
