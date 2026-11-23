import React, { useState, useEffect } from 'react';
import { User, UserRole } from '../types';
import { GlobalSearchModal } from './GlobalSearchModal';
import { SkyOpsLogo } from './SkyOpsLogo';
import { ShieldAlert, CheckCircle2, UserCircle, Bell, Clock, Wallet, BookOpen, Calendar, AlertTriangle, Search, Command, Receipt, Plane } from 'lucide-react';

interface NavbarProps {
  currentUser: User;
  allUsers: User[];
  onSelectUser: (user: User) => void;
  activeTab: string;
  onSelectTab: (tab: string) => void;
  instructorLockInfo?: { locked: boolean; reason?: string };
}

export const Navbar: React.FC<NavbarProps> = ({
  currentUser,
  allUsers,
  onSelectUser,
  activeTab,
  onSelectTab,
  instructorLockInfo
}) => {
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const canSearch = currentUser.rol === 'admin' || currentUser.rol === 'contabilidad' || currentUser.rol === 'escuela';

  // Global shortcut
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        if (canSearch) {
          e.preventDefault();
          setIsSearchOpen(prev => !prev);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [canSearch]);

  const getRoleBadge = (role: UserRole) => {
    switch (role) {
      case 'admin':
        return <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-purple-100 text-purple-800 border border-purple-200">Administrador</span>;
      case 'escuela':
        return <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-indigo-100 text-indigo-800 border border-indigo-200">Dirección Escuela</span>;
      case 'instructor':
        return <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-sky-100 text-sky-800 border border-sky-200">Instructor CFI</span>;
      case 'instructor_en_jefe':
        return <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-indigo-100 text-indigo-800 border border-indigo-200">Instructor en Jefe</span>;
      case 'contabilidad':
        return <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">Contabilidad</span>;
      case 'estudiante':
        return <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-amber-100 text-amber-800 border border-amber-200">Estudiante</span>;
    }
  };

  const navItems = [
    { id: 'progreso', label: 'Hoja de Progreso', icon: BookOpen, roles: ['estudiante', 'instructor', 'instructor_en_jefe', 'admin', 'escuela'] },
    { id: 'solicitudes_vuelo', label: 'Solicitudes & Itinerario 8 PM', icon: Calendar, roles: ['instructor', 'instructor_en_jefe', 'escuela', 'admin'] },
    { id: 'bitacoras_aeronaves', label: 'Bitácoras de Vuelo', icon: Plane, roles: ['instructor', 'instructor_en_jefe', 'contabilidad', 'escuela', 'admin'] },
    { id: 'itinerarios', label: currentUser.rol === 'estudiante' ? 'Itinerario' : 'Itinerarios & Agenda', icon: Calendar, roles: ['estudiante', 'instructor', 'instructor_en_jefe', 'admin', 'escuela'] },
    { id: 'contabilidad', label: 'Contabilidad & Saldos', icon: Wallet, roles: ['estudiante', 'contabilidad', 'admin', 'escuela'] },
    { id: 'instructor_portal', label: 'Portal Instructor & Vigencias', icon: Clock, roles: ['instructor', 'instructor_en_jefe', 'admin', 'escuela'] },
    { id: 'honorarios_instructor', label: 'Honorarios', icon: Receipt, roles: ['instructor', 'contabilidad'] },
  ];

  const visibleNavItems = navItems.filter(item => item.roles.includes(currentUser.rol));

  return (
    <>
      <header className="bg-slate-900 text-white border-b border-slate-800 sticky top-0 z-40 shadow-md">
        {/* Top Banner for Instructor Hard Lock */}
        {currentUser.rol === 'instructor' && instructorLockInfo?.locked && (
          <div className="bg-rose-600 text-white px-4 py-2 text-xs md:text-sm font-semibold flex items-center justify-between animate-pulse">
            <div className="flex items-center gap-2">
              <ShieldAlert className="w-5 h-5 flex-shrink-0" />
              <span><strong>HARD LOCK DE SEGURIDAD ACTIVADO:</strong> {instructorLockInfo.reason}</span>
            </div>
            <span className="hidden md:inline bg-rose-900/60 px-2 py-0.5 rounded text-xs border border-rose-400/50">Despacho Bloqueado</span>
          </div>
        )}

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 gap-4">
            {/* Logo & School Name */}
            <SkyOpsLogo
              variant="horizontal"
              size="md"
              theme="dark"
              badgeText="AAC Panamá"
              subtitle="Control de Vuelo & Operaciones"
            />

            {/* Center Search Bar for Admin & Contabilidad */}
            {canSearch && (
              <div className="hidden md:block flex-1 max-w-sm mx-4">
                <button
                  onClick={() => setIsSearchOpen(true)}
                  className="w-full flex items-center justify-between px-3 py-1.5 rounded-lg bg-slate-800/90 border border-slate-700 hover:border-slate-600 text-slate-400 hover:text-slate-200 text-xs transition-colors cursor-pointer"
                >
                  <span className="flex items-center gap-2 truncate">
                    <Search className="w-3.5 h-3.5 text-sky-400" />
                    <span className="truncate">Buscar alumnos, ACH, vuelos...</span>
                  </span>
                  <kbd className="inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[10px] font-semibold text-slate-400 bg-slate-700 rounded">
                    ⌘K
                  </kbd>
                </button>
              </div>
            )}

            {/* Quick RBAC Role & User Switcher */}
            <div className="flex items-center gap-3">
              {canSearch && (
                <button
                  onClick={() => setIsSearchOpen(true)}
                  className="md:hidden p-2 rounded-lg bg-slate-800 text-sky-400 border border-slate-700"
                  title="Buscar"
                >
                  <Search className="w-4 h-4" />
                </button>
              )}

              <div className="flex items-center gap-2 bg-slate-800/80 px-3 py-1.5 rounded-lg border border-slate-700">
                <UserCircle className="w-4 h-4 text-sky-400" />
                <div className="text-xs">
                  <span className="text-white font-medium">{currentUser.nombre}</span>
                </div>
                {getRoleBadge(currentUser.rol)}
              </div>
            </div>
          </div>

          {/* Navigation Tabs */}
          <nav className="flex space-x-1 sm:space-x-4 overflow-x-auto py-2 border-t border-slate-800/80 no-scrollbar">
            {visibleNavItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  id={`tab-${item.id}`}
                  onClick={() => onSelectTab(item.id)}
                  className={`flex items-center gap-2 px-3 py-2 rounded-md text-xs sm:text-sm font-medium transition-colors whitespace-nowrap ${
                    isActive
                      ? 'bg-sky-600 text-white shadow-sm'
                      : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>
        </div>
      </header>

      {/* Search Modal */}
      {canSearch && (
        <GlobalSearchModal
          currentUser={currentUser}
          allUsers={allUsers}
          isOpen={isSearchOpen}
          onClose={() => setIsSearchOpen(false)}
          onNavigateTab={(tab) => onSelectTab(tab)}
          onSelectUser={onSelectUser}
        />
      )}
    </>
  );
};

