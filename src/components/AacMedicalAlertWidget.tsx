import React, { useState } from 'react';
import { User } from '../types';
import { api } from '../services/api';
import { useLanguage } from '../i18n/LanguageContext';
import {
  AlertTriangle,
  ShieldAlert,
  ShieldCheck,
  Calendar,
  Clock,
  Send,
  CheckCircle2,
  X,
  FileText,
  UserCheck,
  AlertCircle,
  ExternalLink,
  ChevronRight,
  RefreshCw,
  Search,
  Filter,
  Eye,
  Edit3,
  Mail,
  Copy,
  Printer,
  Sparkles,
  Info
} from 'lucide-react';
import { ImageViewerModal } from './ImageViewerModal';

export interface MedicalAlertItem {
  user: User;
  daysRemaining: number;
  status: 'expired' | 'critical' | 'warning' | 'valid' | 'missing';
  statusText: string;
  medicalClass: string;
}

export function parseMedicalStatus(user: User): MedicalAlertItem {
  if (!user) {
    return {
      user: { id: '', nombre: 'Usuario', rol: 'estudiante', correo: '', activo: true } as User,
      daysRemaining: 999,
      status: 'valid',
      statusText: 'Vigente',
      medicalClass: 'Clase 2'
    };
  }
  const vencimientoDate = user.vencimiento_medico;
  let medicalClass = 'Clase 2';
  if (user.numero_medico) {
    if (user.numero_medico.toUpperCase().includes('CL1') || user.numero_medico.toUpperCase().includes('CLASE 1')) {
      medicalClass = 'Clase 1';
    } else if (user.numero_medico.toUpperCase().includes('CL2') || user.numero_medico.toUpperCase().includes('CLASE 2')) {
      medicalClass = 'Clase 2';
    } else if (user.numero_medico.toUpperCase().includes('CL3') || user.numero_medico.toUpperCase().includes('CLASE 3')) {
      medicalClass = 'Clase 3';
    }
  } else if (
    user.rol === 'instructor' ||
    user.curso_actual === 'Comercial' ||
    user.curso_actual === 'Multi-Motor' ||
    (user.licencia && (user.licencia.includes('CPL') || user.licencia.includes('CFI') || user.licencia.includes('ATPL')))
  ) {
    medicalClass = 'Clase 1';
  }

  if (!vencimientoDate) {
    return {
      user,
      daysRemaining: -999,
      status: 'missing',
      statusText: 'Sin certificado registrado',
      medicalClass
    };
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const parts = vencimientoDate.split('-');
  let targetDate: Date;
  if (parts.length === 3) {
    targetDate = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
  } else {
    targetDate = new Date(vencimientoDate);
  }

  if (isNaN(targetDate.getTime())) {
    return {
      user,
      daysRemaining: -999,
      status: 'missing',
      statusText: 'Fecha no válida',
      medicalClass
    };
  }

  const diffTime = targetDate.getTime() - today.getTime();
  const days = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  if (days < 0) {
    const absDays = Math.abs(days);
    return {
      user,
      daysRemaining: days,
      status: 'expired',
      statusText: absDays === 0 ? 'Vence hoy' : `Vencido hace ${absDays} día${absDays !== 1 ? 's' : ''}`,
      medicalClass
    };
  } else if (days === 0) {
    return {
      user,
      daysRemaining: 0,
      status: 'critical',
      statusText: 'Vence hoy',
      medicalClass
    };
  } else if (days <= 7) {
    return {
      user,
      daysRemaining: days,
      status: 'critical',
      statusText: `Vence en ${days} día${days !== 1 ? 's' : ''}`,
      medicalClass
    };
  } else if (days <= 30) {
    return {
      user,
      daysRemaining: days,
      status: 'warning',
      statusText: `Vence en ${days} días`,
      medicalClass
    };
  }

  return {
    user,
    daysRemaining: days,
    status: 'valid',
    statusText: `Vigente (${days} días restantes)`,
    medicalClass
  };
}

interface AacMedicalAlertWidgetProps {
  allUsers: User[];
  onNavigateTab: (tabId: string, extraId?: string) => void;
  onRefreshUsers?: () => void;
  currentUser?: User;
}

export const AacMedicalAlertWidget: React.FC<AacMedicalAlertWidgetProps> = ({
  allUsers,
  onNavigateTab,
  onRefreshUsers,
  currentUser
}) => {
  const { t } = useLanguage();
  const [showDetailModal, setShowDetailModal] = useState<boolean>(false);
  const [activeFilter, setActiveFilter] = useState<'all_alerts' | 'within_30' | 'critical' | 'expired' | 'all'>('all_alerts');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedPhoto, setSelectedPhoto] = useState<{ url: string; name: string } | null>(null);

  // Email Notification modal / state
  const [emailingUser, setEmailingUser] = useState<User | null>(null);
  const [emailSubject, setEmailSubject] = useState<string>('');
  const [emailMessage, setEmailMessage] = useState<string>('');
  const [isSendingEmail, setIsSendingEmail] = useState<boolean>(false);
  const [emailSuccessMsg, setEmailSuccessMsg] = useState<string>('');

  // Quick Renewal modal / state
  const [renewingUser, setRenewingUser] = useState<User | null>(null);
  const [newExpirationDate, setNewExpirationDate] = useState<string>('');
  const [newMedicalNumber, setNewMedicalNumber] = useState<string>('');
  const [isSavingRenewal, setIsSavingRenewal] = useState<boolean>(false);
  const [renewalSuccessMsg, setRenewalSuccessMsg] = useState<string>('');

  // Bulk email sending state
  const [isBulkSending, setIsBulkSending] = useState<boolean>(false);
  const [bulkSuccessMsg, setBulkSuccessMsg] = useState<string>('');

  // Filter users that require medical certificates (students, instructors, admins with pilot duties)
  const flightPersonnel = allUsers.filter(
    u => (u.rol === 'estudiante' || u.rol === 'instructor' || (u.rol === 'admin' && u.licencia)) && u.activo !== false
  );

  const medicalAssessments: MedicalAlertItem[] = flightPersonnel.map(u => parseMedicalStatus(u));

  // Categorize
  const expiredItems = medicalAssessments.filter(item => item.status === 'expired' || item.status === 'missing');
  const criticalItems = medicalAssessments.filter(item => item.status === 'critical');
  const warningItems = medicalAssessments.filter(item => item.status === 'warning');
  const within30DaysItems = medicalAssessments.filter(item => item.status === 'warning' || item.status === 'critical');
  const allAlertItems = medicalAssessments.filter(item => item.status === 'expired' || item.status === 'critical' || item.status === 'warning' || item.status === 'missing');
  const validItems = medicalAssessments.filter(item => item.status === 'valid');

  // Compliance percentage
  const totalFlightCrew = flightPersonnel.length;
  const compliantCount = validItems.length + warningItems.length; // warning is technically valid until day 0
  const complianceRate = totalFlightCrew > 0 ? Math.round((compliantCount / totalFlightCrew) * 100) : 100;
  const dispatchableRate = totalFlightCrew > 0 ? Math.round(((totalFlightCrew - expiredItems.length) / totalFlightCrew) * 100) : 100;

  // Items to display in modal based on active filter and search
  const filteredModalItems = medicalAssessments.filter(item => {
    // Filter by category
    if (activeFilter === 'all_alerts') {
      if (item.status === 'valid') return false;
    } else if (activeFilter === 'within_30') {
      if (item.status !== 'warning' && item.status !== 'critical') return false;
    } else if (activeFilter === 'critical') {
      if (item.status !== 'critical') return false;
    } else if (activeFilter === 'expired') {
      if (item.status !== 'expired' && item.status !== 'missing') return false;
    }

    // Search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchName = (item.user.nombre || '').toLowerCase().includes(q);
      const matchEmail = (item.user.correo || '').toLowerCase().includes(q);
      const matchLic = item.user.licencia?.toLowerCase().includes(q);
      const matchMed = item.user.numero_medico?.toLowerCase().includes(q);
      const matchCourse = item.user.curso_actual?.toLowerCase().includes(q);
      return matchName || matchEmail || matchLic || matchMed || matchCourse;
    }

    return true;
  }).sort((a, b) => {
    // Sort order: expired first, then critical, then warning, then valid
    const orderMap = { expired: 1, missing: 2, critical: 3, warning: 4, valid: 5 };
    if (orderMap[a.status] !== orderMap[b.status]) {
      return orderMap[a.status] - orderMap[b.status];
    }
    return a.daysRemaining - b.daysRemaining;
  });

  // Prepare Single Email Modal
  const handleOpenEmailModal = (item: MedicalAlertItem) => {
    const u = item.user;
    const isExp = item.status === 'expired' || item.status === 'missing';
    const isCrit = item.status === 'critical';
    
    setEmailingUser(u);
    setEmailSubject(
      isExp
        ? `[BLOQUEO OPERACIONAL] Notificación de Certificado Médico Vencido - ${u.nombre}`
        : `[AVISO PREVENTIVO] Renovación de Certificado Médico Aeronáutico (Vence en ${item.daysRemaining} días)`
    );

    const bodyTemplate = `Estimado(a) ${u.nombre},\n\n` +
      `Esperamos que te encuentres bien. Por medio de la presente, la Dirección de Operaciones y Seguridad de SkyOps te notifica que tu Certificado Médico Aeronáutico (${item.medicalClass}, No. ${u.numero_medico || 'Por registrar'}) se encuentra ${isExp ? 'VENCIDO (' + u.vencimiento_medico + ')' : 'próximo a vencer el próximo ' + u.vencimiento_medico + ' (en ' + item.daysRemaining + ' días)'}.\n\n` +
      `Lineamiento de Seguridad Aeronáutica:\n` +
      `De conformidad con la reglamentación aeronáutica, es requisito indispensable mantener un certificado médico vigente para ser despachado en misiones de vuelo (Instrucción / Vuelo Solo / Examen Práctico).\n\n` +
      `Acciones Requeridas:\n` +
      `1. Agenda a la brevedad tu cita con un Médico Examinador Aéreo Autorizado (AME).\n` +
      `2. Una vez expedido el nuevo certificado, remite una copia digitalizada a Operaciones o cárgala en tu expediente de SkyOps.\n\n` +
      `${isExp ? '⚠️ ATENCIÓN: Tu cuenta se encuentra temporalmente bloqueada para despacho hasta la recepción de tu certificado renovado.\n\n' : ''}` +
      `Saludos cordiales,\n` +
      `Departamento de Operaciones & Seguridad de Vuelo\n` +
      `SkyOps`;

    setEmailMessage(bodyTemplate);
    setEmailSuccessMsg('');
  };

  const handleSendSingleEmail = async () => {
    if (!emailingUser) return;
    setIsSendingEmail(true);
    try {
      await api.sendDirectEmail({
        toEmail: emailingUser.correo,
        recipientName: emailingUser.nombre,
        subject: emailSubject,
        message: emailMessage,
        recipientType: emailingUser.rol
      });
      setEmailSuccessMsg(t('aacNotificationSentSuccess'));
      setTimeout(() => {
        setEmailingUser(null);
        setEmailSuccessMsg('');
      }, 1800);
    } catch (err) {
      console.error('Error al enviar correo:', err);
      alert('Error al enviar notificación por correo. Intenta nuevamente.');
    } finally {
      setIsSendingEmail(false);
    }
  };

  // Bulk email sending to all pilots with certificates <= 30 days
  const handleBulkSendAlerts = async () => {
    const targets = allAlertItems.filter(item => item.user.correo);
    if (targets.length === 0) {
      alert('No hay tripulantes con alertas médicas activas para notificar.');
      return;
    }

    if (!confirm(`¿Deseas enviar un correo oficial de aviso a los ${targets.length} tripulantes y alumnos con alertas médicas?`)) {
      return;
    }

    setIsBulkSending(true);
    let sentCount = 0;
    try {
      for (const item of targets) {
        const u = item.user;
        const isExp = item.status === 'expired';
        const subj = isExp
          ? `[BLOQUEO OPERACIONAL] Notificación de Certificado Médico Vencido - ${u.nombre}`
          : `[AVISO PREVENTIVO] Renovación de Certificado Médico Aeronáutico (${item.daysRemaining} días restantes)`;
        
        const body = `Estimado(a) ${u.nombre},\n\n` +
          `Te recordamos que según las regulaciones aeronáuticas vigentes, tu Certificado Médico Aeronáutico vence el ${u.vencimiento_medico || 'Fecha no registrada'} (${item.statusText}).\n\n` +
          `Por favor coordina tu cita con un Médico Examinador Aéreo Autorizado (AME) para mantener tu estatus de vuelo al día.\n\n` +
          `SkyOps - Operaciones de Vuelo`;

        await api.sendDirectEmail({
          toEmail: u.correo,
          recipientName: u.nombre,
          subject: subj,
          message: body,
          recipientType: u.rol
        }).catch(e => console.warn('Error sending bulk to', u.correo, e));
        sentCount++;
      }
      setBulkSuccessMsg(`Se han despachado ${sentCount} notificaciones oficiales correctamente.`);
      setTimeout(() => setBulkSuccessMsg(''), 4000);
    } catch (err) {
      console.error('Error in bulk email dispatch:', err);
    } finally {
      setIsBulkSending(false);
    }
  };

  // Open Quick Renewal Modal
  const handleOpenRenewalModal = (item: MedicalAlertItem) => {
    setRenewingUser(item.user);
    setNewExpirationDate(item.user.vencimiento_medico || '');
    setNewMedicalNumber(item.user.numero_medico || `MED-${item.medicalClass === 'Clase 1' ? 'CL1' : 'CL2'}-${item.user.licencia || 'CERT'}`);
    setRenewalSuccessMsg('');
  };

  const handleSaveRenewal = async () => {
    if (!renewingUser || !newExpirationDate) {
      alert('Por favor especifica una fecha de vencimiento válida.');
      return;
    }

    setIsSavingRenewal(true);
    try {
      await api.updateUser(renewingUser.id, {
        vencimiento_medico: newExpirationDate,
        numero_medico: newMedicalNumber
      });
      setRenewalSuccessMsg(t('aacRenewalSavedSuccess'));
      if (onRefreshUsers) onRefreshUsers();
      setTimeout(() => {
        setRenewingUser(null);
        setRenewalSuccessMsg('');
      }, 1500);
    } catch (err) {
      console.error('Error guardando renovación médica:', err);
      alert('Error al actualizar la vigencia médica.');
    } finally {
      setIsSavingRenewal(false);
    }
  };

  // Quick helper to preset 1 year or 2 years for renewal
  const handleSetPresetYears = (years: number) => {
    const d = new Date();
    d.setFullYear(d.getFullYear() + years);
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    setNewExpirationDate(`${yyyy}-${mm}-${dd}`);
  };

  return (
    <div className="space-y-3">
      {/* 1. HIGH IMPACT PROACTIVE ALERT BANNER (DASHBOARD COMPACT VIEW) */}
      <div className={`rounded-2xl border p-4 transition-all relative overflow-hidden shadow-xs ${
        expiredItems.length > 0
          ? 'bg-gradient-to-br from-rose-950/40 via-slate-900 to-rose-950/20 border-rose-500/40'
          : within30DaysItems.length > 0
          ? 'bg-gradient-to-br from-amber-950/40 via-slate-900 to-slate-900 border-amber-500/40'
          : 'bg-gradient-to-br from-slate-900 via-slate-900 to-emerald-950/20 border-slate-800'
      }`}>
        {/* Glow corner */}
        <div className={`absolute top-0 right-0 w-64 h-full pointer-events-none ${
          expiredItems.length > 0
            ? 'bg-rose-500/10'
            : within30DaysItems.length > 0
            ? 'bg-amber-500/10'
            : 'bg-emerald-500/5'
        } blur-2xl`} />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          
          {/* Left Title & Status Badges */}
          <div className="space-y-1.5">
            <div className="flex flex-wrap items-center gap-2">
              <div className={`p-1.5 rounded-xl border flex items-center justify-center ${
                expiredItems.length > 0
                  ? 'bg-rose-500/20 text-rose-400 border-rose-500/30'
                  : within30DaysItems.length > 0
                  ? 'bg-amber-500/20 text-amber-400 border-amber-500/30'
                  : 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
              }`}>
                {expiredItems.length > 0 ? (
                  <ShieldAlert className="w-5 h-5 animate-pulse text-rose-400" />
                ) : within30DaysItems.length > 0 ? (
                  <AlertTriangle className="w-5 h-5 text-amber-400" />
                ) : (
                  <ShieldCheck className="w-5 h-5 text-emerald-400" />
                )}
              </div>

              <div className="flex items-center gap-2">
                <h2 className="text-sm sm:text-base font-black text-white tracking-tight flex items-center gap-1.5">
                  <span>{t('aacMedicalAlertTitle')}</span>
                </h2>
              </div>
            </div>

            {/* KPI Summary Pills */}
            <div className="flex flex-wrap items-center gap-2 pt-1">
              {expiredItems.length > 0 && (
                <button
                  onClick={() => {
                    setActiveFilter('expired');
                    setShowDetailModal(true);
                  }}
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 border border-rose-500/40 text-rose-300 text-xs font-bold transition-all cursor-pointer"
                >
                  <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping" />
                  <span>{expiredItems.length} Vencidos (Hard Lock)</span>
                </button>
              )}

              {criticalItems.length > 0 && (
                <button
                  onClick={() => {
                    setActiveFilter('critical');
                    setShowDetailModal(true);
                  }}
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-300 text-xs font-bold transition-all cursor-pointer"
                >
                  <Clock className="w-3.5 h-3.5 text-amber-400" />
                  <span>{criticalItems.length} Críticos (≤ 7 días)</span>
                </button>
              )}

              {warningItems.length > 0 && (
                <button
                  onClick={() => {
                    setActiveFilter('within_30');
                    setShowDetailModal(true);
                  }}
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-yellow-500/10 hover:bg-yellow-500/20 border border-yellow-500/30 text-yellow-300 text-xs font-semibold transition-all cursor-pointer"
                >
                  <Calendar className="w-3.5 h-3.5 text-yellow-400" />
                  <span>{warningItems.length} Próximos (8 a 30 días)</span>
                </button>
              )}

              <div className="px-2.5 py-1 rounded-lg bg-slate-800/80 border border-slate-700 text-slate-300 text-xs font-medium">
                Aptitud Operacional: <strong className={dispatchableRate < 100 ? 'text-amber-400' : 'text-emerald-400'}>{dispatchableRate}%</strong>
              </div>
            </div>
          </div>

          {/* Right Action Buttons */}
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            {allAlertItems.length > 0 && (
              <button
                onClick={handleBulkSendAlerts}
                disabled={isBulkSending}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-bold transition-all cursor-pointer"
                title="Enviar recordatorio por correo a todos los afectados"
              >
                <Mail className={`w-3.5 h-3.5 ${isBulkSending ? 'animate-spin text-sky-400' : 'text-sky-400'}`} />
                <span>{isBulkSending ? 'Notificando...' : 'Aviso Masivo'}</span>
              </button>
            )}

            <button
              onClick={() => {
                setActiveFilter('all_alerts');
                setShowDetailModal(true);
              }}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-sky-500 hover:bg-sky-600 text-white text-xs font-bold transition-all shadow-xs cursor-pointer"
            >
              <span>Ver Auditoría Completa</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Proactive Highlights Strip: Top urgent alerts directly in dashboard */}
        {allAlertItems.length > 0 && (
          <div className="mt-3 pt-3 border-t border-slate-800/80 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {allAlertItems.slice(0, 3).map(item => (
              <div
                key={item.user.id}
                className={`p-2.5 rounded-xl border flex items-center justify-between gap-3 text-xs ${
                  item.status === 'expired' || item.status === 'missing'
                    ? 'bg-rose-950/30 border-rose-500/30 text-rose-200'
                    : item.status === 'critical'
                    ? 'bg-amber-950/30 border-amber-500/30 text-amber-200'
                    : 'bg-yellow-950/20 border-yellow-500/20 text-yellow-200'
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="relative shrink-0">
                    {item.user.foto_perfil ? (
                      <img
                        src={item.user.foto_perfil}
                        alt={item.user.nombre}
                        className="w-8 h-8 rounded-lg object-cover border border-white/20"
                      />
                    ) : (
                      <div className="w-8 h-8 rounded-lg bg-slate-800 flex items-center justify-center font-bold text-white border border-white/20">
                        {item.user.nombre.charAt(0)}
                      </div>
                    )}
                    <span className={`absolute -bottom-1 -right-1 w-2.5 h-2.5 rounded-full border border-slate-900 ${
                      item.status === 'expired' ? 'bg-rose-500' : item.status === 'critical' ? 'bg-amber-500' : 'bg-yellow-400'
                    }`} />
                  </div>

                  <div className="min-w-0">
                    <div className="font-bold text-white truncate max-w-[140px] sm:max-w-[160px]">
                      {item.user.nombre}
                    </div>
                    <div className="text-[10px] text-slate-300 flex items-center gap-1.5">
                      <span className="font-semibold">{item.medicalClass}</span>
                      <span>•</span>
                      <span className={item.status === 'expired' ? 'text-rose-300 font-bold' : item.status === 'critical' ? 'text-amber-300 font-bold' : 'text-yellow-300'}>
                        {item.statusText}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={() => handleOpenEmailModal(item)}
                    className="p-1.5 bg-white/10 hover:bg-white/20 rounded-lg text-slate-200 transition-colors cursor-pointer"
                    title="Notificar por correo"
                  >
                    <Send className="w-3.5 h-3.5 text-sky-300" />
                  </button>
                  <button
                    onClick={() => handleOpenRenewalModal(item)}
                    className="p-1.5 bg-white/10 hover:bg-white/20 rounded-lg text-slate-200 transition-colors cursor-pointer"
                    title="Registrar renovación médica"
                  >
                    <Edit3 className="w-3.5 h-3.5 text-emerald-300" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {bulkSuccessMsg && (
          <div className="mt-2 p-2 bg-emerald-500/20 border border-emerald-500/40 rounded-xl text-emerald-200 text-xs font-semibold flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{bulkSuccessMsg}</span>
          </div>
        )}
      </div>

      {/* 2. FULL AUDIT & SURVEILLANCE MODAL */}
      {showDetailModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl max-w-5xl w-full max-h-[92vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden my-auto">
            
            {/* Modal Header */}
            <div className="p-4 sm:p-5 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-2xl bg-sky-500/20 text-sky-400 border border-sky-400/30">
                  <ShieldAlert className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-black tracking-tight text-white">
                    Certificados Médicos Aeronáuticos
                  </h3>
                </div>
              </div>

              <button
                onClick={() => setShowDetailModal(false)}
                className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Filter Tabs & Search Bar */}
            <div className="p-4 bg-slate-50 border-b border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-3">
              
              {/* Category Pills */}
              <div className="flex flex-wrap items-center gap-1.5">
                <button
                  onClick={() => setActiveFilter('all_alerts')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                    activeFilter === 'all_alerts'
                      ? 'bg-slate-900 text-white shadow-xs'
                      : 'bg-white text-slate-600 hover:bg-slate-200/80 border border-slate-200'
                  }`}
                >
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
                  <span>Todas las Alertas ({allAlertItems.length})</span>
                </button>

                <button
                  onClick={() => setActiveFilter('within_30')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                    activeFilter === 'within_30'
                      ? 'bg-amber-500 text-white shadow-xs'
                      : 'bg-white text-slate-600 hover:bg-slate-200/80 border border-slate-200'
                  }`}
                >
                  <Calendar className="w-3.5 h-3.5" />
                  <span>Próximos 30 días ({within30DaysItems.length})</span>
                </button>

                <button
                  onClick={() => setActiveFilter('critical')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                    activeFilter === 'critical'
                      ? 'bg-orange-600 text-white shadow-xs'
                      : 'bg-white text-slate-600 hover:bg-slate-200/80 border border-slate-200'
                  }`}
                >
                  <Clock className="w-3.5 h-3.5" />
                  <span>Críticos ≤ 7d ({criticalItems.length})</span>
                </button>

                <button
                  onClick={() => setActiveFilter('expired')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                    activeFilter === 'expired'
                      ? 'bg-rose-600 text-white shadow-xs'
                      : 'bg-white text-slate-600 hover:bg-slate-200/80 border border-slate-200'
                  }`}
                >
                  <ShieldAlert className="w-3.5 h-3.5" />
                  <span>Vencidos ({expiredItems.length})</span>
                </button>

                <button
                  onClick={() => setActiveFilter('all')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    activeFilter === 'all'
                      ? 'bg-sky-600 text-white shadow-xs'
                      : 'bg-white text-slate-600 hover:bg-slate-200/80 border border-slate-200'
                  }`}
                >
                  <span>Todo el Personal ({flightPersonnel.length})</span>
                </button>
              </div>

              {/* Search Field */}
              <div className="relative min-w-[240px]">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Buscar piloto, licencia o curso..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-sky-500"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs"
                  >
                    ×
                  </button>
                )}
              </div>
            </div>

            {/* List Body */}
            <div className="p-4 sm:p-5 overflow-y-auto flex-1 space-y-3">
              {filteredModalItems.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {filteredModalItems.map((item) => {
                    const u = item.user;
                    const isExp = item.status === 'expired' || item.status === 'missing';
                    const isCrit = item.status === 'critical';
                    const isWarn = item.status === 'warning';
                    const isValid = item.status === 'valid';

                    return (
                      <div
                        key={u.id}
                        className={`rounded-2xl p-4 border transition-all flex flex-col justify-between ${
                          isExp
                            ? 'bg-rose-50/70 border-rose-200 hover:border-rose-300'
                            : isCrit
                            ? 'bg-amber-50/70 border-amber-200 hover:border-amber-300'
                            : isWarn
                            ? 'bg-yellow-50/50 border-yellow-200 hover:border-yellow-300'
                            : 'bg-slate-50/60 border-slate-200 hover:border-slate-300'
                        }`}
                      >
                        <div>
                          {/* Top row: User Identity & Status Badge */}
                          <div className="flex items-start justify-between gap-2 pb-3 border-b border-slate-200/80">
                            <div className="flex items-center gap-3 min-w-0">
                              <div className="relative shrink-0">
                                {u.foto_perfil ? (
                                  <img
                                    src={u.foto_perfil}
                                    alt={u.nombre}
                                    className="w-11 h-11 rounded-xl object-cover border-2 border-white shadow-xs"
                                  />
                                ) : (
                                  <div className="w-11 h-11 rounded-xl bg-slate-800 text-white font-bold flex items-center justify-center text-sm shadow-xs">
                                    {u.nombre.charAt(0)}
                                  </div>
                                )}
                                <span className={`absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full border-2 border-white ${
                                  isExp ? 'bg-rose-600' : isCrit ? 'bg-amber-500' : isWarn ? 'bg-yellow-400' : 'bg-emerald-500'
                                }`} />
                              </div>

                              <div className="min-w-0">
                                <h4 className="font-bold text-slate-900 text-sm truncate">
                                  {u.nombre}
                                </h4>
                                <div className="flex flex-wrap items-center gap-1.5 mt-0.5">
                                  <span className="px-1.5 py-0.5 text-[9px] font-bold uppercase rounded bg-slate-200 text-slate-700">
                                    {u.rol === 'instructor' ? 'Instructor CFI' : u.rol === 'admin' ? 'Administrador' : 'Piloto Alumno'}
                                  </span>
                                  {u.curso_actual && (
                                    <span className="px-1.5 py-0.5 text-[9px] font-semibold rounded bg-sky-100 text-sky-800">
                                      {u.curso_actual}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>

                            {/* Status Chip */}
                            <span className={`px-2 py-1 text-[10px] font-bold rounded-lg shrink-0 border ${
                              isExp
                                ? 'bg-rose-100 text-rose-800 border-rose-300'
                                : isCrit
                                ? 'bg-amber-100 text-amber-900 border-amber-300'
                                : isWarn
                                ? 'bg-yellow-100 text-yellow-900 border-yellow-300'
                                : 'bg-emerald-100 text-emerald-800 border-emerald-300'
                            }`}>
                              {isExp ? '🔴 HARD LOCK' : isCrit ? '🟠 URGENCIA CRÍTICA' : isWarn ? '🟡 ALERTA 30 DÍAS' : '🟢 VIGENTE'}
                            </span>
                          </div>

                          {/* Middle Details Grid */}
                          <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                            <div className="p-2 bg-white rounded-xl border border-slate-200/80">
                              <span className="text-[10px] text-slate-500 font-medium block">Clase y Certificado Médico</span>
                              <span className="font-bold text-slate-800 block truncate">
                                {item.medicalClass} • {u.numero_medico || 'No registrado'}
                              </span>
                            </div>

                            <div className="p-2 bg-white rounded-xl border border-slate-200/80">
                              <span className="text-[10px] text-slate-500 font-medium block">Licencia de Piloto</span>
                              <span className="font-bold text-slate-800 block truncate">
                                {u.licencia || 'En trámite'}
                              </span>
                            </div>

                            <div className="p-2 bg-white rounded-xl border border-slate-200/80 col-span-2 flex items-center justify-between">
                              <div>
                                <span className="text-[10px] text-slate-500 font-medium block">Vencimiento Médico Registrado</span>
                                <span className="font-bold text-slate-900 text-xs">
                                  {u.vencimiento_medico || 'Sin fecha'}
                                </span>
                              </div>
                              <span className={`font-black text-xs px-2 py-0.5 rounded-md ${
                                isExp ? 'text-rose-700 bg-rose-100' : isCrit ? 'text-amber-800 bg-amber-100' : isWarn ? 'text-yellow-800 bg-yellow-100' : 'text-emerald-700 bg-emerald-100'
                              }`}>
                                {item.statusText}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Bottom Actions Bar */}
                        <div className="mt-3 pt-3 border-t border-slate-200/80 flex flex-wrap items-center justify-between gap-2">
                          <div className="flex items-center gap-1.5">
                            {u.foto_medico ? (
                              <button
                                onClick={() => setSelectedPhoto({ url: u.foto_medico!, name: `Certificado Médico - ${u.nombre}` })}
                                className="flex items-center gap-1 px-2 py-1 bg-white hover:bg-slate-100 text-slate-700 text-[11px] font-semibold rounded-lg border border-slate-200 transition-colors cursor-pointer"
                                title="Ver copia digitalizada del certificado médico"
                              >
                                <Eye className="w-3.5 h-3.5 text-sky-600" />
                                <span>Ver Certificado</span>
                              </button>
                            ) : (
                              <span className="text-[10px] text-slate-400 italic">Sin adjunto</span>
                            )}

                            <button
                              onClick={() => {
                                setShowDetailModal(false);
                                onNavigateTab('usuarios');
                              }}
                              className="flex items-center gap-1 px-2 py-1 bg-white hover:bg-slate-100 text-slate-700 text-[11px] font-semibold rounded-lg border border-slate-200 transition-colors cursor-pointer"
                              title="Abrir expediente completo en el módulo de usuarios"
                            >
                              <FileText className="w-3.5 h-3.5 text-purple-600" />
                              <span>Expediente</span>
                            </button>
                          </div>

                          <div className="flex items-center gap-1.5">
                            <button
                              onClick={() => handleOpenEmailModal(item)}
                              className="flex items-center gap-1 px-2.5 py-1 bg-sky-50 hover:bg-sky-100 text-sky-700 text-[11px] font-bold rounded-lg border border-sky-200 transition-colors cursor-pointer"
                              title="Enviar notificación oficial de renovación por correo"
                            >
                              <Send className="w-3.5 h-3.5" />
                              <span>Notificar</span>
                            </button>

                            <button
                              onClick={() => handleOpenRenewalModal(item)}
                              className="flex items-center gap-1 px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold rounded-lg shadow-xs transition-colors cursor-pointer"
                              title="Actualizar la fecha de vigencia médica tras examen AME"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                              <span>Renovar</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="py-12 text-center text-slate-400">
                  <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto mb-2 opacity-80" />
                  <h4 className="text-slate-700 font-bold text-sm">Sin registros</h4>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-slate-100 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs">
              <div className="text-slate-600">
                Mostrando <strong>{filteredModalItems.length}</strong> de <strong>{flightPersonnel.length}</strong> tripulantes evaluados.
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowDetailModal(false)}
                  className="px-4 py-2 bg-white hover:bg-slate-200 text-slate-700 font-bold rounded-xl border border-slate-300 transition-colors cursor-pointer"
                >
                  Cerrar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 3. SEND EMAIL NOTIFICATION MODAL */}
      {emailingUser && (
        <div className="fixed inset-0 z-60 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl max-w-lg w-full p-5 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-sky-50 text-sky-600 border border-sky-100">
                  <Mail className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-bold text-slate-900 text-sm">
                    Enviar Notificación Oficial
                  </h4>
                  <p className="text-xs text-slate-500">Destinatario: {emailingUser.nombre}</p>
                </div>
              </div>

              <button
                onClick={() => setEmailingUser(null)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Correo Electrónico:</label>
                <input
                  type="text"
                  disabled
                  value={emailingUser.correo}
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-600 font-medium"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Asunto Oficial:</label>
                <input
                  type="text"
                  value={emailSubject}
                  onChange={(e) => setEmailSubject(e.target.value)}
                  className="w-full p-2 bg-white border border-slate-200 rounded-xl text-slate-800 font-medium focus:ring-2 focus:ring-sky-500"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Cuerpo del Mensaje:</label>
                <textarea
                  rows={8}
                  value={emailMessage}
                  onChange={(e) => setEmailMessage(e.target.value)}
                  className="w-full p-2.5 bg-white border border-slate-200 rounded-xl text-slate-800 text-xs font-mono focus:ring-2 focus:ring-sky-500"
                />
              </div>
            </div>

            {emailSuccessMsg && (
              <div className="p-2 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-xl text-xs font-semibold flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{emailSuccessMsg}</span>
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setEmailingUser(null)}
                className="px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl cursor-pointer"
              >
                Cancelar
              </button>

              <button
                type="button"
                onClick={handleSendSingleEmail}
                disabled={isSendingEmail}
                className="flex items-center gap-1.5 px-4 py-2 bg-sky-500 hover:bg-sky-600 text-white text-xs font-bold rounded-xl shadow-xs transition-colors cursor-pointer"
              >
                <Send className={`w-3.5 h-3.5 ${isSendingEmail ? 'animate-spin' : ''}`} />
                <span>{isSendingEmail ? 'Enviando...' : 'Despachar Correo'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 4. QUICK RENEWAL MODAL */}
      {renewingUser && (
        <div className="fixed inset-0 z-60 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl max-w-md w-full p-5 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-100">
                  <Edit3 className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-bold text-slate-900 text-sm">
                    Registrar Renovación Médica
                  </h4>
                  <p className="text-xs text-slate-500">{renewingUser.nombre}</p>
                </div>
              </div>

              <button
                onClick={() => setRenewingUser(null)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="font-semibold text-slate-700 block mb-1">
                  Nueva Fecha de Vencimiento (YYYY-MM-DD):
                </label>
                <input
                  type="date"
                  value={newExpirationDate}
                  onChange={(e) => setNewExpirationDate(e.target.value)}
                  className="w-full p-2.5 bg-white border border-slate-200 rounded-xl text-slate-800 font-bold focus:ring-2 focus:ring-emerald-500"
                />

                {/* Quick Presets for Medical Validity (1 year for Class 1 / 2 years for Class 2) */}
                <div className="flex items-center gap-2 mt-2">
                  <span className="text-[11px] text-slate-500">Atajos de Vigencia:</span>
                  <button
                    type="button"
                    onClick={() => handleSetPresetYears(1)}
                    className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-semibold text-[10px] cursor-pointer"
                  >
                    +1 Año (Clase 1)
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSetPresetYears(2)}
                    className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-semibold text-[10px] cursor-pointer"
                  >
                    +2 Años (Clase 2)
                  </button>
                </div>
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">
                  Número de Certificado Médico:
                </label>
                <input
                  type="text"
                  placeholder="ej: MED-CL1-10492"
                  value={newMedicalNumber}
                  onChange={(e) => setNewMedicalNumber(e.target.value)}
                  className="w-full p-2.5 bg-white border border-slate-200 rounded-xl text-slate-800 font-medium focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            </div>

            {renewalSuccessMsg && (
              <div className="p-2 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-xl text-xs font-semibold flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{renewalSuccessMsg}</span>
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setRenewingUser(null)}
                className="px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl cursor-pointer"
              >
                Cancelar
              </button>

              <button
                type="button"
                onClick={handleSaveRenewal}
                disabled={isSavingRenewal}
                className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-xs transition-colors cursor-pointer"
              >
                <CheckCircle2 className={`w-3.5 h-3.5 ${isSavingRenewal ? 'animate-spin' : ''}`} />
                <span>{isSavingRenewal ? 'Guardando...' : 'Guardar Renovación'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 5. LIGHTBOX MODAL FOR CERTIFICATE IMAGE */}
      {selectedPhoto && (
        <ImageViewerModal
          imageUrl={selectedPhoto.url}
          imageName={selectedPhoto.name}
          onClose={() => setSelectedPhoto(null)}
        />
      )}
    </div>
  );
};
