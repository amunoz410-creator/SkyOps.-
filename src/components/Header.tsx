import React from 'react';
import { User, UserRole } from '../types';
import { useLanguage } from '../i18n/LanguageContext';
import {
  GraduationCap,
  Briefcase,
  ShieldCheck,
  Calculator,
  Compass,
  Mail,
  Wrench
} from 'lucide-react';

interface HeaderProps {
  currentUser: User;
  allUsers?: User[];
  onSelectUser?: (user: User) => void;
  activeTab?: string;
  onToggleMobile?: () => void;
  instructorLockInfo?: { locked: boolean; reason?: string };
  onLogout?: () => void;
  onNavigateTab?: (tab: string, extraId?: string, userContextId?: string) => void;
  firebaseConnected?: boolean;
  isGoogleAuth?: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  currentUser,
  activeTab,
  onNavigateTab
}) => {
  const { language } = useLanguage();

  const getRolePresentation = (role: UserRole) => {
    switch (role) {
      case 'admin':
        return {
          label: language === 'es' ? 'Administrador' : 'Administrator',
          icon: ShieldCheck
        };
      case 'escuela':
        return {
          label: language === 'es' ? 'Dirección de Escuela' : 'School Management',
          icon: Briefcase
        };
      case 'instructor':
        return {
          label: language === 'es' ? 'Instructor CFI' : 'Flight Instructor (CFI)',
          icon: Compass
        };
      case 'instructor_en_jefe':
        return {
          label: language === 'es' ? 'Instructor en Jefe / Jefe de Pilotos' : 'Chief Flight Instructor',
          icon: ShieldCheck
        };
      case 'contabilidad':
        return {
          label: language === 'es' ? 'Contabilidad' : 'Accounting',
          icon: Calculator
        };
      case 'mantenimiento':
        return {
          label: language === 'es' ? 'Taller Aeronáutico (OMA)' : 'Aircraft Maintenance (AMO)',
          icon: Wrench
        };
      case 'estudiante':
      default:
        return {
          label: language === 'es' ? 'Piloto Alumno' : 'Student Pilot',
          icon: GraduationCap
        };
    }
  };

  const currentUserName = currentUser?.nombre || currentUser?.correo || 'Usuario';
  const roleInfo = getRolePresentation(currentUser?.rol || 'estudiante');
  const RoleIcon = roleInfo.icon;

  return (
    <header className="sticky top-0 z-30 bg-white/95 dark:bg-slate-950/95 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 shadow-2xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2.5 flex items-center justify-between">
        {/* Identidad del Usuario: Foto de Perfil, Nombre y Rol */}
        <div className="flex items-center gap-3 min-w-0">
          {/* Foto de Perfil */}
          <div className="w-9 h-9 rounded-full bg-slate-900 dark:bg-slate-800 text-white flex items-center justify-center font-bold text-xs shadow-xs border border-slate-200 dark:border-slate-700 overflow-hidden flex-shrink-0">
            {currentUser?.foto_perfil ? (
              <img
                src={currentUser.foto_perfil}
                alt={currentUserName}
                className="w-full h-full object-cover"
              />
            ) : (
              <span>{currentUserName.charAt(0).toUpperCase()}</span>
            )}
          </div>

          {/* Nombre y Rol en tipografía limpia sin píldoras */}
          <div className="min-w-0 flex flex-col justify-center">
            <h1 className="text-sm font-semibold text-slate-900 dark:text-white truncate tracking-tight leading-tight">
              {currentUserName}
            </h1>
            <div className="flex items-center gap-1.5 mt-0.5 text-xs text-slate-500 dark:text-slate-400">
              <RoleIcon className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500 flex-shrink-0" />
              <span className="font-medium truncate">{roleInfo.label}</span>
              {currentUser?.matricula_asignada && (
                <>
                  <span className="text-slate-300 dark:text-slate-600">·</span>
                  <span className="font-mono text-[11px] text-slate-600 dark:text-slate-300">{currentUser.matricula_asignada}</span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Acceso a Notificaciones */}
        <div className="flex items-center gap-2">
          {onNavigateTab && (
            <button
              onClick={() => onNavigateTab('correos')}
              className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                activeTab === 'correos'
                  ? 'bg-slate-900 text-white dark:bg-slate-800 dark:text-white shadow-xs'
                  : 'bg-slate-100 dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800'
              }`}
              title="Notificaciones Operacionales y Correo"
            >
              <Mail className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
              <span className="hidden sm:inline">Notificaciones</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
