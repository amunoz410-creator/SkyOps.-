import React from 'react';
import { User } from '../types';
import { useLanguage } from '../i18n/LanguageContext';
import {
  LayoutDashboard,
  BookOpen,
  Calendar,
  Wallet,
  Clock,
  MessageSquare,
  Menu,
  Users,
  FileSpreadsheet,
  Wrench,
  Plane,
  ClipboardList,
  Receipt,
  Send
} from 'lucide-react';

interface MobileBottomNavProps {
  currentUser: User;
  activeTab: string;
  onSelectTab: (tab: string) => void;
  onOpenMenu: () => void;
}

export const MobileBottomNav: React.FC<MobileBottomNavProps> = ({
  currentUser,
  activeTab,
  onSelectTab,
  onOpenMenu
}) => {
  const { t } = useLanguage();

  // Tabs dinámicos para la barra inferior según rol
  const getPrimaryTabs = () => {
    if (currentUser.rol === 'escuela') {
      return [
        { id: 'inicio', label: t('short_inicio') || 'Inicio', icon: LayoutDashboard },
        { id: 'reporte_horas', label: 'Reporte Horas', icon: FileSpreadsheet },
        { id: 'progreso', label: t('short_progreso') || 'Progreso', icon: BookOpen },
        { id: 'contabilidad', label: t('short_contabilidad') || 'Saldos', icon: Wallet },
      ];
    }

    if (currentUser.rol === 'instructor_en_jefe') {
      return [
        { id: 'inicio', label: t('short_inicio') || 'Inicio', icon: LayoutDashboard },
        { id: 'solicitudes_vuelo', label: 'Aprobar Vuelos', icon: Send },
        { id: 'itinerarios', label: t('short_itinerarios') || 'Agenda', icon: Calendar },
        { id: 'progreso', label: t('short_progreso') || 'Progreso', icon: BookOpen },
      ];
    }

    if (currentUser.rol === 'instructor') {
      return [
        { id: 'inicio', label: t('short_inicio'), icon: LayoutDashboard },
        { id: 'solicitudes_vuelo', label: 'Solicitudes', icon: Send },
        { id: 'itinerarios', label: t('short_itinerarios'), icon: Calendar },
        { id: 'honorarios_instructor', label: t('short_honorarios') || 'Honorarios', icon: Receipt },
        { id: 'progreso', label: t('short_progreso'), icon: BookOpen },
      ];
    }

    if (currentUser.rol === 'contabilidad') {
      return [
        { id: 'inicio', label: t('short_inicio'), icon: LayoutDashboard },
        { id: 'contabilidad', label: t('short_contabilidad'), icon: Wallet },
        { id: 'honorarios_instructor', label: t('short_honorarios') || 'Honorarios', icon: Receipt },
        { id: 'reporte_horas', label: 'Horas', icon: FileSpreadsheet },
      ];
    }

    if (currentUser.rol === 'mantenimiento') {
      return [
        { id: 'inicio', label: t('short_inicio') || 'Inicio', icon: LayoutDashboard },
        { id: 'taller_mantenimiento', label: 'Taller OMA', icon: Wrench },
        { id: 'ordenes_trabajo', label: 'Órdenes OT', icon: ClipboardList },
        { id: 'bitacoras_aeronaves', label: 'Bitácoras', icon: Plane },
      ];
    }

    if (currentUser.rol === 'admin') {
      return [
        { id: 'inicio', label: t('short_inicio'), icon: LayoutDashboard },
        { id: 'itinerarios', label: t('short_itinerarios'), icon: Calendar },
        { id: 'progreso', label: t('short_progreso'), icon: BookOpen },
        { id: 'contabilidad', label: t('short_contabilidad'), icon: Wallet },
      ];
    }

    // Estudiante
    return [
      { id: 'inicio', label: t('short_inicio'), icon: LayoutDashboard },
      { id: 'itinerarios', label: 'Itinerario', icon: Calendar },
      { id: 'progreso', label: t('short_progreso'), icon: BookOpen },
      { id: 'contabilidad', label: t('short_contabilidad'), icon: Wallet },
    ];
  };

  const primaryTabs = getPrimaryTabs();

  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-slate-900/95 backdrop-blur-lg border-t border-slate-800 px-2 py-1.5 shadow-2xl safe-area-bottom">
      <div className="flex items-center justify-around">
        {primaryTabs.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;

          return (
            <button
              key={item.id}
              onClick={() => onSelectTab(item.id)}
              className={`flex flex-col items-center justify-center py-1 px-1.5 rounded-xl min-w-[46px] min-h-[48px] transition-all cursor-pointer ${
                isActive
                  ? 'text-sky-400 font-bold scale-105'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <div
                className={`p-1 rounded-lg transition-colors ${
                  isActive ? 'bg-sky-500/20 text-sky-400' : ''
                }`}
              >
                <Icon className="w-5 h-5" />
              </div>
              <span className="text-[10px] tracking-tight mt-0.5 whitespace-nowrap">
                {item.label}
              </span>
            </button>
          );
        })}

        {/* Botón de Menú Completo / Drawer */}
        <button
          onClick={onOpenMenu}
          className="flex flex-col items-center justify-center py-1 px-2.5 rounded-xl min-w-[56px] min-h-[48px] text-slate-400 hover:text-white transition-all cursor-pointer"
          aria-label="Abrir menú completo"
        >
          <div className="p-1 rounded-lg hover:bg-slate-800">
            <Menu className="w-5 h-5 text-slate-300" />
          </div>
          <span className="text-[10px] tracking-tight mt-0.5 text-slate-300 font-medium">
            {t('more')}
          </span>
        </button>
      </div>
    </div>
  );
};
