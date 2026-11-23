import React, { useState, useEffect, useMemo } from 'react';
import { User, EmailNotification, RoleNotificationRule, UserRole } from '../types';
import { api } from '../services/api';
import { useLanguage } from '../i18n/LanguageContext';
import {
  Mail,
  Send,
  Inbox,
  Filter,
  CheckCircle2,
  AlertCircle,
  Clock,
  Plane,
  CreditCard,
  ShieldAlert,
  Wrench,
  Search,
  RefreshCw,
  Eye,
  Check,
  CheckCheck,
  RotateCcw,
  Sparkles,
  Sliders,
  Settings,
  Bell,
  ArrowRight,
  UserCheck,
  Calendar,
  DollarSign,
  AlertTriangle,
  ExternalLink,
  ChevronRight,
  ShieldCheck,
  Building2,
  Share2,
  Printer,
  Users,
  Link2,
  Edit3,
  Save,
  X
} from 'lucide-react';
import { EmailTemplatesModal } from './EmailTemplatesModal';
import { EmailSenderModal } from './EmailSenderModal';

interface EmailNotificationHubProps {
  currentUser: User | null;
  allUsers?: User[];
}

export const EmailNotificationHub: React.FC<EmailNotificationHubProps> = ({
  currentUser,
  allUsers = []
}) => {
  const { t } = useLanguage();
  const [logs, setLogs] = useState<EmailNotification[]>([]);
  const [rules, setRules] = useState<RoleNotificationRule[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'mi_bandeja' | 'todos' | 'pagos' | 'vuelos' | 'alertas' | 'reglas' | 'disparador' | 'directorio_correos'>('mi_bandeja');
  const [selectedEmail, setSelectedEmail] = useState<EmailNotification | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<'todos' | 'no_leidos' | 'leidos'>('todos');
  const [actionFeedback, setActionFeedback] = useState<{ message: string; type: 'success' | 'info' | 'error' } | null>(null);

  // Directorio de Correos Registrados por Usuario
  const [registeredUsers, setRegisteredUsers] = useState<User[]>(allUsers || []);
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [editingUserEmail, setEditingUserEmail] = useState<string>('');
  const [userSearchTerm, setUserSearchTerm] = useState<string>('');
  const [savingUserEmail, setSavingUserEmail] = useState<boolean>(false);

  // Modales adicionales
  const [showTemplatesModal, setShowTemplatesModal] = useState<boolean>(false);
  const [showSenderModal, setShowSenderModal] = useState<boolean>(false);
  const [dispatchingAlert, setDispatchingAlert] = useState<boolean>(false);

  const userEmail = (currentUser?.correo || '').toLowerCase().trim();
  const userRole = currentUser?.rol || 'estudiante';

  // Cargar datos
  const loadData = async (silent: boolean = false) => {
    try {
      if (!silent) setRefreshing(true);
      const [logsData, rulesData, usersData] = await Promise.all([
        api.getEmailLogs(userRole),
        api.getEmailRules().catch(() => ({ success: false, rules: [] })),
        allUsers && allUsers.length > 0 ? Promise.resolve(allUsers) : api.getUsers().catch(() => [])
      ]);
      setLogs(logsData || []);
      if (rulesData?.rules) {
        setRules(rulesData.rules);
      }
      if (usersData && usersData.length > 0) {
        setRegisteredUsers(usersData);
      }
    } catch (err: any) {
      console.error('Error al cargar datos de correo:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
    const interval = setInterval(() => loadData(true), 15000);
    return () => clearInterval(interval);
  }, [userRole]);

  // Si el usuario es taller o instructor y estaba en la pestaña de pagos, redirigir a mi_bandeja
  useEffect(() => {
    if ((userRole === 'mantenimiento' || userRole === 'instructor' || userRole === 'instructor_en_jefe') && activeTab === 'pagos') {
      setActiveTab('mi_bandeja');
    }
  }, [userRole, activeTab]);

  const showNotification = (msg: string, type: 'success' | 'info' | 'error' = 'success') => {
    setActionFeedback({ message: msg, type });
    setTimeout(() => setActionFeedback(null), 4000);
  };

  // Helper de seguridad: Comprueba si un correo es de naturaleza financiera/cobros/depósitos
  // El rol 'mantenimiento' (Taller), 'instructor' e 'instructor_en_jefe' no pueden ver ningún pago, cobro, depósito ni saldo
  const isFinancialExcludedEmail = (em: EmailNotification) => {
    if (userRole !== 'mantenimiento' && userRole !== 'instructor' && userRole !== 'instructor_en_jefe') return false;
    const financialEvents = [
      'pago_reportado',
      'pago_confirmado',
      'pago_rechazado',
      'pago_tarjeta',
      'link_pago_creado',
      'link_pago_completado',
      'alerta_saldo_bajo'
    ];
    if (financialEvents.includes(em.evento)) return true;

    const fullContent = `${em.evento || ''} ${em.asunto || ''} ${em.cuerpo_texto || ''} ${em.cuerpo_html || ''}`.toLowerCase();
    return /\b(pago|pagos|cobro|cobros|deposito|depósito|depositos|depósitos|saldo|saldos|ach|recibo|arancel|tarjeta de crédito)\b/i.test(fullContent);
  };

  // Filtrado de correos
  const filteredEmails = useMemo(() => {
    return logs.filter(em => {
      const emTo = (em.destinatario_email || '').toLowerCase().trim();
      const emName = (em.destinatario_nombre || '').toLowerCase();
      const emSubj = (em.asunto || '').toLowerCase();
      const emBody = (em.cuerpo_texto || em.cuerpo_html || '').toLowerCase();
      const q = searchQuery.toLowerCase().trim();

      // Restricción estricta de seguridad: Taller e Instructor no tienen acceso a pagos, cobros ni depósitos
      if (isFinancialExcludedEmail(em)) {
        return false;
      }

      // Tab filter
      if (activeTab === 'mi_bandeja') {
        const matchesUserEmail = userEmail && emTo === userEmail;
        const matchesRole = em.destinatario_tipo === userRole;
        if (!matchesUserEmail && !matchesRole && userRole !== 'admin') {
          return false;
        }
      } else if (activeTab === 'pagos') {
        if (userRole === 'instructor' || userRole === 'instructor_en_jefe' || userRole === 'mantenimiento') return false;
        if (!['pago_reportado', 'pago_confirmado', 'pago_rechazado', 'pago_tarjeta', 'link_pago_creado', 'link_pago_completado'].includes(em.evento)) return false;
      } else if (activeTab === 'vuelos') {
        if (!['itinerario_creado', 'itinerario_confirmado', 'vuelo_cancelado', 'vuelo_no_show', 'itinerario_recordatorio', 'solicitud_vuelo_enviada', 'solicitud_vuelo_decidida', 'itinerario_publicado_8pm'].includes(em.evento)) return false;
      } else if (activeTab === 'alertas') {
        if (!['alerta_saldo_bajo', 'alerta_vigencia_medica', 'alerta_licencia_vuelo', 'alerta_mantenimiento'].includes(em.evento)) return false;
      }

      // Read status filter
      if (statusFilter === 'no_leidos' && em.leido) return false;
      if (statusFilter === 'leidos' && !em.leido) return false;

      // Search query
      if (q) {
        const matchesQuery =
          emSubj.includes(q) ||
          emName.includes(q) ||
          emTo.includes(q) ||
          emBody.includes(q);
        if (!matchesQuery) return false;
      }

      return true;
    });
  }, [logs, activeTab, statusFilter, searchQuery, userEmail, userRole]);

  // Contadores seguros filtrados por rol
  const accessibleLogs = useMemo(() => {
    return logs.filter(l => !isFinancialExcludedEmail(l));
  }, [logs, userRole]);

  const unreadCount = useMemo(() => {
    if (!userEmail) return accessibleLogs.filter(l => !l.leido).length;
    return accessibleLogs.filter(l => !l.leido && ((l.destinatario_email || '').toLowerCase() === userEmail || l.destinatario_tipo === userRole)).length;
  }, [accessibleLogs, userEmail, userRole]);

  const totalMyEmailsCount = useMemo(() => {
    return accessibleLogs.filter(l => (l.destinatario_email || '').toLowerCase() === userEmail || l.destinatario_tipo === userRole).length;
  }, [accessibleLogs, userEmail, userRole]);

  const paymentEmailsCount = useMemo(() => {
    if (userRole === 'instructor' || userRole === 'instructor_en_jefe' || userRole === 'mantenimiento') return 0;
    return logs.filter(l => ['pago_reportado', 'pago_confirmado', 'pago_rechazado', 'pago_tarjeta', 'link_pago_creado', 'link_pago_completado'].includes(l.evento)).length;
  }, [logs, userRole]);

  const flightEmailsCount = useMemo(() => {
    return accessibleLogs.filter(l => ['itinerario_creado', 'itinerario_confirmado', 'vuelo_cancelado', 'vuelo_no_show', 'solicitud_vuelo_enviada', 'solicitud_vuelo_decidida', 'itinerario_publicado_8pm'].includes(l.evento)).length;
  }, [accessibleLogs]);

  const alertEmailsCount = useMemo(() => {
    return accessibleLogs.filter(l => ['alerta_saldo_bajo', 'alerta_vigencia_medica', 'alerta_licencia_vuelo', 'alerta_mantenimiento'].includes(l.evento)).length;
  }, [accessibleLogs]);

  // Manejo de lectura
  const handleSelectEmail = async (email: EmailNotification) => {
    setSelectedEmail(email);
    if (!email.leido) {
      try {
        await api.markEmailAsRead(email.id);
        setLogs(prev => prev.map(l => l.id === email.id ? { ...l, leido: true } : l));
      } catch (err) {
        console.error('Error al marcar leído:', err);
      }
    }
  };

  const handleMarkAllRead = async () => {
    try {
      const res = await api.markAllEmailsAsRead(activeTab === 'mi_bandeja' ? userEmail : undefined);
      showNotification(`Se marcaron ${res.count} correos como leídos.`, 'success');
      setLogs(prev => prev.map(l => ({ ...l, leido: true })));
    } catch (err: any) {
      showNotification('Error al marcar correos: ' + err.message, 'error');
    }
  };

  // Disparo de alertas operacionales de prueba
  const handleTriggerAlert = async (type: string, title: string) => {
    try {
      setDispatchingAlert(true);
      const res = await api.dispatchEmailAlert(type);
      showNotification(`¡Alerta enviada exitosamente! ${res.message || 'Se despachó el correo a los roles correspondientes.'}`, 'success');
      await loadData(true);
    } catch (err: any) {
      showNotification(`Error al emitir alerta: ${err.message}`, 'error');
    } finally {
      setDispatchingAlert(false);
    }
  };

  const handleScanAllAlerts = async () => {
    try {
      setDispatchingAlert(true);
      const res = await api.scanAndDispatchAllAlerts();
      showNotification(res.message, 'success');
      await loadData(true);
    } catch (err: any) {
      showNotification(`Error en escaneo: ${err.message}`, 'error');
    } finally {
      setDispatchingAlert(false);
    }
  };

  // Guardar cambio de correo registrado del usuario
  const handleSaveUserEmail = async (userId: string) => {
    if (!editingUserEmail || !editingUserEmail.includes('@')) {
      showNotification('Ingresa un correo electrónico válido con formato usuario@dominio.com.', 'error');
      return;
    }
    try {
      setSavingUserEmail(true);
      await api.updateUser(userId, { correo: editingUserEmail.trim().toLowerCase() });
      setRegisteredUsers(prev => prev.map(u => u.id === userId ? { ...u, correo: editingUserEmail.trim().toLowerCase() } : u));
      setEditingUserId(null);
      showNotification('Correo oficial del usuario actualizado en base de datos. Todas las notificaciones futuras se enviarán a esta dirección.', 'success');
    } catch (err: any) {
      showNotification('Error al actualizar correo: ' + err.message, 'error');
    } finally {
      setSavingUserEmail(false);
    }
  };

  // Enviar alerta de prueba directa al correo registrado del usuario
  const handleSendTestToUser = async (user: User) => {
    try {
      setDispatchingAlert(true);
      await api.dispatchEmailAlert('test_payment', { studentId: user.id });
      showNotification(`Notificación de prueba enviada exitosamente al correo registrado de ${user.nombre} (${user.correo}).`, 'success');
      await loadData(true);
    } catch (err: any) {
      showNotification('Error enviando prueba: ' + err.message, 'error');
    } finally {
      setDispatchingAlert(false);
    }
  };

  // Modificación de reglas de rol
  const handleToggleRuleActive = async (ruleId: string, currentVal: boolean) => {
    try {
      const res = await api.updateEmailRule(ruleId, { activo: !currentVal });
      if (res?.rule) {
        setRules(prev => prev.map(r => r.id === ruleId ? res.rule : r));
        showNotification(`Regla ${res.rule.nombre} ${!currentVal ? 'activada' : 'desactivada'}.`, 'info');
      }
    } catch (err: any) {
      showNotification('Error al actualizar regla: ' + err.message, 'error');
    }
  };

  const handleToggleRoleInRule = async (ruleId: string, role: UserRole) => {
    const target = rules.find(r => r.id === ruleId);
    if (!target) return;
    const currentRoles = target.roles_notificados || [];
    const updatedRoles = currentRoles.includes(role)
      ? currentRoles.filter(r => r !== role)
      : [...currentRoles, role];

    try {
      const res = await api.updateEmailRule(ruleId, { roles_notificados: updatedRoles as any });
      if (res?.rule) {
        setRules(prev => prev.map(r => r.id === ruleId ? res.rule : r));
        showNotification(`Roles actualizados para la regla ${target.nombre}.`, 'info');
      }
    } catch (err: any) {
      showNotification('Error al actualizar roles: ' + err.message, 'error');
    }
  };

  const handleResetRules = async () => {
    if (!window.confirm('¿Deseas restaurar todas las reglas de notificación a los valores oficiales de SkyOps?')) return;
    try {
      const res = await api.resetEmailRules();
      if (res?.rules) {
        setRules(res.rules);
        showNotification('Reglas restauradas con éxito.', 'success');
      }
    } catch (err: any) {
      showNotification('Error al reiniciar reglas: ' + err.message, 'error');
    }
  };

  // Helper de badges por evento
  const getEventBadge = (evento: string) => {
    switch (evento) {
      case 'pago_reportado':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-sky-500/10 text-sky-400 border border-sky-500/30">
            <CreditCard className="w-3 h-3 text-sky-400" /> Pago Reportado
          </span>
        );
      case 'pago_tarjeta':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-sky-500/15 text-sky-300 border border-sky-400/30">
            <CreditCard className="w-3 h-3 text-sky-400" /> Tarjeta Acreditada
          </span>
        );
      case 'link_pago_creado':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-indigo-500/15 text-indigo-300 border border-indigo-400/30">
            <Link2 className="w-3 h-3 text-indigo-400" /> Link de Pago Generado
          </span>
        );
      case 'link_pago_completado':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-500/15 text-emerald-300 border border-emerald-400/30">
            <CheckCircle2 className="w-3 h-3 text-emerald-400" /> Link Cobrado
          </span>
        );
      case 'pago_confirmado':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
            <CheckCircle2 className="w-3 h-3 text-emerald-400" /> Pago Conciliado
          </span>
        );
      case 'pago_rechazado':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-rose-500/10 text-rose-400 border border-rose-500/30">
            <AlertCircle className="w-3 h-3 text-rose-400" /> Pago Rechazado
          </span>
        );
      case 'itinerario_creado':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-blue-500/10 text-blue-400 border border-blue-500/30">
            <Plane className="w-3 h-3 text-blue-400" /> Vuelo Asignado (SLA)
          </span>
        );
      case 'itinerario_confirmado':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-teal-500/10 text-teal-400 border border-teal-500/30">
            <CheckCheck className="w-3 h-3 text-teal-400" /> Vuelo Confirmado
          </span>
        );
      case 'vuelo_cancelado':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/30">
            <AlertTriangle className="w-3 h-3 text-amber-400" /> Vuelo Cancelado
          </span>
        );
      case 'alerta_saldo_bajo':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/30">
            <DollarSign className="w-3 h-3 text-amber-400" /> Saldo Mínimo
          </span>
        );
      case 'alerta_vigencia_medica':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-purple-500/10 text-purple-400 border border-purple-500/30">
            <ShieldAlert className="w-3 h-3 text-purple-400" /> Médico AAC (RAC 67)
          </span>
        );
      case 'alerta_licencia_vuelo':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-indigo-500/10 text-indigo-400 border border-indigo-500/30">
            <ShieldCheck className="w-3 h-3 text-indigo-400" /> Licencia AAC
          </span>
        );
      case 'alerta_mantenimiento':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-rose-500/10 text-rose-400 border border-rose-500/30">
            <Wrench className="w-3 h-3 text-rose-400" /> Mantenimiento Flota
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-slate-500/10 text-slate-300 border border-slate-500/30">
            <Mail className="w-3 h-3 text-slate-400" /> Despacho
          </span>
        );
    }
  };

  const getRoleBadge = (rol: string) => {
    switch (rol) {
      case 'contabilidad':
        return <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">Contabilidad</span>;
      case 'instructor':
        return <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-sky-500/20 text-sky-300 border border-sky-500/30">Instructor</span>;
      case 'estudiante':
        return <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">Estudiante</span>;
      case 'admin':
        return <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-purple-500/20 text-purple-300 border border-purple-500/30">Dirección</span>;
      default:
        return <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-slate-500/20 text-slate-300 border border-slate-500/30">General</span>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Banner Superior Principal */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-slate-900 via-sky-950 to-slate-900 border border-sky-500/20 p-6 shadow-xl">
        <div className="absolute top-0 right-0 w-96 h-96 bg-sky-500/10 rounded-full blur-3xl -z-10 pointer-events-none" />

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-sky-500/20 text-sky-300 border border-sky-400/30">
                <Mail className="w-3.5 h-3.5" /> SkyOps Mail System • Notificaciones por Correo
              </span>
              {unreadCount > 0 && (
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold bg-amber-500 text-slate-950 animate-pulse">
                  {unreadCount} sin leer
                </span>
              )}
            </div>
            <h1 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight flex items-center gap-2">
              Centro de Notificaciones & Correo Electrónico
            </h1>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setShowSenderModal(true)}
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold bg-sky-600 hover:bg-sky-500 text-white shadow-lg shadow-sky-600/30 transition-all cursor-pointer"
            >
              <Send className="w-4 h-4" />
              Redactar Correo
            </button>

            <button
              onClick={() => setShowTemplatesModal(true)}
              className="inline-flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium bg-slate-800/80 hover:bg-slate-700/80 text-slate-200 border border-slate-700 transition-all cursor-pointer"
            >
              <Settings className="w-4 h-4 text-sky-400" />
              Plantillas & Marca
            </button>

            <button
              onClick={() => loadData()}
              disabled={refreshing}
              className="p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700/80 text-slate-300 border border-slate-700 transition-all cursor-pointer"
              title="Actualizar correos"
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin text-sky-400' : ''}`} />
            </button>
          </div>
        </div>

        {/* Info del Rol Activo */}
        <div className="mt-4 pt-4 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-400">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1.5 text-slate-300 font-medium">
              <UserCheck className="w-3.5 h-3.5 text-sky-400" />
              Conectado como: <strong>{currentUser?.nombre}</strong>
            </span>
            <span>•</span>
            <span className="text-slate-300">
              Correo: <code className="px-1.5 py-0.5 rounded bg-slate-800 text-sky-300 font-mono">{userEmail}</code>
            </span>
            <span>•</span>
            <div>{getRoleBadge(userRole)}</div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleMarkAllRead}
              className="inline-flex items-center gap-1 text-slate-300 hover:text-white transition-colors cursor-pointer"
            >
              <CheckCheck className="w-3.5 h-3.5 text-emerald-400" />
              Marcar todos como leídos
            </button>
          </div>
        </div>
      </div>

      {/* Alerta de Feedback Temporal */}
      {actionFeedback && (
        <div
          className={`p-3 rounded-xl border flex items-center justify-between text-xs font-medium transition-all ${
            actionFeedback.type === 'success'
              ? 'bg-emerald-950/60 border-emerald-500/40 text-emerald-200'
              : actionFeedback.type === 'error'
              ? 'bg-rose-950/60 border-rose-500/40 text-rose-200'
              : 'bg-sky-950/60 border-sky-500/40 text-sky-200'
          }`}
        >
          <div className="flex items-center gap-2">
            {actionFeedback.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            ) : actionFeedback.type === 'error' ? (
              <AlertCircle className="w-4 h-4 text-rose-400" />
            ) : (
              <Sparkles className="w-4 h-4 text-sky-400" />
            )}
            <span>{actionFeedback.message}</span>
          </div>
          <button onClick={() => setActionFeedback(null)} className="text-slate-400 hover:text-white">
            ✕
          </button>
        </div>
      )}

      {/* Navegación por Pestañas */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-3">
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            onClick={() => { setActiveTab('mi_bandeja'); setSelectedEmail(null); }}
            className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'mi_bandeja'
                ? 'bg-sky-600 text-white shadow-md shadow-sky-600/30'
                : 'bg-slate-900/60 text-slate-400 hover:bg-slate-800/80 hover:text-slate-200 border border-slate-800'
            }`}
          >
            <Inbox className="w-3.5 h-3.5" />
            Mi Bandeja
            <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${activeTab === 'mi_bandeja' ? 'bg-sky-950 text-sky-200' : 'bg-slate-800 text-slate-300'}`}>
              {totalMyEmailsCount}
            </span>
          </button>

          <button
            onClick={() => { setActiveTab('todos'); setSelectedEmail(null); }}
            className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'todos'
                ? 'bg-sky-600 text-white shadow-md shadow-sky-600/30'
                : 'bg-slate-900/60 text-slate-400 hover:bg-slate-800/80 hover:text-slate-200 border border-slate-800'
            }`}
          >
            <Mail className="w-3.5 h-3.5" />
            Todos los Correos
            <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${activeTab === 'todos' ? 'bg-sky-950 text-sky-200' : 'bg-slate-800 text-slate-300'}`}>
              {accessibleLogs.length}
            </span>
          </button>

          {userRole !== 'instructor' && userRole !== 'instructor_en_jefe' && userRole !== 'mantenimiento' && (
            <button
              onClick={() => { setActiveTab('pagos'); setSelectedEmail(null); }}
              className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'pagos'
                  ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/30'
                  : 'bg-slate-900/60 text-slate-400 hover:bg-slate-800/80 hover:text-slate-200 border border-slate-800'
              }`}
            >
              <CreditCard className="w-3.5 h-3.5 text-emerald-400" />
              Pagos & Comprobantes
              <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${activeTab === 'pagos' ? 'bg-emerald-950 text-emerald-200' : 'bg-slate-800 text-slate-300'}`}>
                {paymentEmailsCount}
              </span>
            </button>
          )}

          <button
            onClick={() => { setActiveTab('vuelos'); setSelectedEmail(null); }}
            className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'vuelos'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                : 'bg-slate-900/60 text-slate-400 hover:bg-slate-800/80 hover:text-slate-200 border border-slate-800'
            }`}
          >
            <Plane className="w-3.5 h-3.5 text-blue-400" />
            Vuelos & SLA
            <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${activeTab === 'vuelos' ? 'bg-blue-950 text-blue-200' : 'bg-slate-800 text-slate-300'}`}>
              {flightEmailsCount}
            </span>
          </button>

          <button
            onClick={() => { setActiveTab('alertas'); setSelectedEmail(null); }}
            className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'alertas'
                ? 'bg-amber-600 text-white shadow-md shadow-amber-600/30'
                : 'bg-slate-900/60 text-slate-400 hover:bg-slate-800/80 hover:text-slate-200 border border-slate-800'
            }`}
          >
            <ShieldAlert className="w-3.5 h-3.5 text-amber-400" />
            Alertas Operacionales
            <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${activeTab === 'alertas' ? 'bg-amber-950 text-amber-200' : 'bg-slate-800 text-slate-300'}`}>
              {alertEmailsCount}
            </span>
          </button>

          <button
            onClick={() => { setActiveTab('disparador'); setSelectedEmail(null); }}
            className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'disparador'
                ? 'bg-purple-600 text-white shadow-md shadow-purple-600/30'
                : 'bg-slate-900/60 text-slate-400 hover:bg-slate-800/80 hover:text-slate-200 border border-slate-800'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-purple-400" />
            Disparar Pruebas en Vivo
          </button>

          <button
            onClick={() => { setActiveTab('reglas'); setSelectedEmail(null); }}
            className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'reglas'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                : 'bg-slate-900/60 text-slate-400 hover:bg-slate-800/80 hover:text-slate-200 border border-slate-800'
            }`}
          >
            <Sliders className="w-3.5 h-3.5 text-indigo-400" />
            Reglas por Rol
          </button>

          <button
            onClick={() => { setActiveTab('directorio_correos'); setSelectedEmail(null); }}
            className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'directorio_correos'
                ? 'bg-sky-600 text-white shadow-md shadow-sky-600/30'
                : 'bg-slate-900/60 text-slate-400 hover:bg-slate-800/80 hover:text-slate-200 border border-slate-800'
            }`}
          >
            <Users className="w-3.5 h-3.5 text-sky-400" />
            Correos Registrados
            <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${activeTab === 'directorio_correos' ? 'bg-sky-950 text-sky-200' : 'bg-slate-800 text-slate-300'}`}>
              {registeredUsers.length}
            </span>
          </button>
        </div>

        {/* Filtros rápidos de estado */}
        <div className="flex items-center gap-2">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="px-2.5 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-300 focus:outline-none focus:border-sky-500"
          >
            <option value="todos">Todos los Estados</option>
            <option value="no_leidos">Solo No Leídos</option>
            <option value="leidos">Solo Leídos</option>
          </select>
        </div>
      </div>

      {/* Contenido Condicional según Pestaña */}
      {activeTab === 'reglas' ? (
        /* Vista de Reglas de Notificación por Rol */
        <div className="space-y-4">
          <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <Sliders className="w-4 h-4 text-indigo-400" />
                Matriz de Notificaciones por Rol
              </h2>
            </div>
            <button
              onClick={handleResetRules}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5 text-amber-400" />
              Restablecer Valores Oficiales
            </button>
          </div>

          <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-900/40">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-900 text-slate-400 font-semibold border-b border-slate-800 uppercase text-[10px] tracking-wider">
                <tr>
                  <th className="py-3 px-4">Estado</th>
                  <th className="py-3 px-4">Evento Operacional</th>
                  <th className="py-3 px-4">Descripción del Flujo</th>
                  <th className="py-3 px-4 text-center">Estudiante</th>
                  <th className="py-3 px-4 text-center">Instructor</th>
                  <th className="py-3 px-4 text-center">Contabilidad</th>
                  <th className="py-3 px-4 text-center">Dirección / Admin</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {rules.map((rule) => (
                  <tr key={rule.id} className="hover:bg-slate-800/30 transition-colors">
                    <td className="py-3 px-4">
                      <button
                        onClick={() => handleToggleRuleActive(rule.id, rule.activo)}
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold cursor-pointer transition-colors ${
                          rule.activo
                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                            : 'bg-slate-800 text-slate-500 border border-slate-700'
                        }`}
                      >
                        {rule.activo ? 'ACTIVO' : 'PAUSADO'}
                      </button>
                    </td>
                    <td className="py-3 px-4 font-semibold text-white">
                      <div className="flex items-center gap-2">
                        {getEventBadge(rule.evento)}
                      </div>
                      <div className="text-xs font-bold text-slate-200 mt-1">{rule.nombre}</div>
                    </td>
                    <td className="py-3 px-4 text-slate-400 max-w-xs">{rule.descripcion}</td>
                    
                    {/* Checkbox Estudiante */}
                    <td className="py-3 px-4 text-center">
                      <input
                        type="checkbox"
                        checked={rule.roles_notificados.includes('estudiante')}
                        onChange={() => handleToggleRoleInRule(rule.id, 'estudiante')}
                        className="rounded text-sky-600 focus:ring-sky-500 h-4 w-4 bg-slate-950 border-slate-700 cursor-pointer"
                      />
                    </td>

                    {/* Checkbox Instructor */}
                    <td className="py-3 px-4 text-center">
                      <input
                        type="checkbox"
                        checked={rule.roles_notificados.includes('instructor')}
                        onChange={() => handleToggleRoleInRule(rule.id, 'instructor')}
                        className="rounded text-sky-600 focus:ring-sky-500 h-4 w-4 bg-slate-950 border-slate-700 cursor-pointer"
                      />
                    </td>

                    {/* Checkbox Contabilidad */}
                    <td className="py-3 px-4 text-center">
                      <input
                        type="checkbox"
                        checked={rule.roles_notificados.includes('contabilidad')}
                        onChange={() => handleToggleRoleInRule(rule.id, 'contabilidad')}
                        className="rounded text-sky-600 focus:ring-sky-500 h-4 w-4 bg-slate-950 border-slate-700 cursor-pointer"
                      />
                    </td>

                    {/* Checkbox Admin */}
                    <td className="py-3 px-4 text-center">
                      <input
                        type="checkbox"
                        checked={rule.roles_notificados.includes('admin') || rule.roles_notificados.includes('escuela')}
                        onChange={() => handleToggleRoleInRule(rule.id, 'admin')}
                        className="rounded text-sky-600 focus:ring-sky-500 h-4 w-4 bg-slate-950 border-slate-700 cursor-pointer"
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : activeTab === 'disparador' ? (
        /* Vista de Pruebas y Disparo en Tiempo Real */
        <div className="space-y-6">
          <div className="p-4 rounded-xl bg-purple-950/30 border border-purple-500/30 flex items-center justify-between gap-4">
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-purple-400" />
                Simulador & Emisor de Eventos Operacionales
              </h2>
            </div>
            <button
              onClick={handleScanAllAlerts}
              disabled={dispatchingAlert}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold bg-purple-600 hover:bg-purple-500 text-white shadow-lg shadow-purple-600/30 cursor-pointer transition-all"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${dispatchingAlert ? 'animate-spin' : ''}`} />
              Escanear Todo el Sistema
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Tarjeta 1: Pago Reportado */}
            <div className="p-5 rounded-2xl bg-slate-900/80 border border-sky-500/30 flex flex-col justify-between space-y-4 hover:border-sky-500/50 transition-all">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="p-2 rounded-xl bg-sky-500/10 text-sky-400 border border-sky-500/20">
                    <CreditCard className="w-5 h-5" />
                  </span>
                  <span className="text-[10px] font-bold text-sky-400 uppercase tracking-wide">Financiero</span>
                </div>
                <h3 className="text-sm font-bold text-white">1. Pago Reportado por Estudiante</h3>
              </div>
              <button
                onClick={() => handleTriggerAlert('test_payment', 'Pago Reportado')}
                disabled={dispatchingAlert}
                className="w-full py-2.5 rounded-xl text-xs font-bold bg-sky-600 hover:bg-sky-500 text-white shadow-md transition-all cursor-pointer flex items-center justify-center gap-2"
              >
                <Send className="w-3.5 h-3.5" />
                Disparar Alerta de Pago
              </button>
            </div>

            {/* Tarjeta 2: Pago Acreditado */}
            <div className="p-5 rounded-2xl bg-slate-900/80 border border-emerald-500/30 flex flex-col justify-between space-y-4 hover:border-emerald-500/50 transition-all">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    <CheckCircle2 className="w-5 h-5" />
                  </span>
                  <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wide">Conciliación</span>
                </div>
                <h3 className="text-sm font-bold text-white">2. Confirmación & Acreditación de Saldo</h3>
              </div>
              <button
                onClick={() => handleTriggerAlert('test_approval', 'Confirmación de Pago')}
                disabled={dispatchingAlert}
                className="w-full py-2.5 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white shadow-md transition-all cursor-pointer flex items-center justify-center gap-2"
              >
                <Check className="w-3.5 h-3.5" />
                Disparar Acreditación de Saldo
              </button>
            </div>

            {/* Tarjeta 3: Asignación de Vuelo */}
            <div className="p-5 rounded-2xl bg-slate-900/80 border border-blue-500/30 flex flex-col justify-between space-y-4 hover:border-blue-500/50 transition-all">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="p-2 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20">
                    <Plane className="w-5 h-5" />
                  </span>
                  <span className="text-[10px] font-bold text-blue-400 uppercase tracking-wide">Itinerario & SLA</span>
                </div>
                <h3 className="text-sm font-bold text-white">3. Asignación de Vuelo a Estudiante & Instructor</h3>
              </div>
              <button
                onClick={() => handleTriggerAlert('test_flight', 'Asignación de Vuelo')}
                disabled={dispatchingAlert}
                className="w-full py-2.5 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-500 text-white shadow-md transition-all cursor-pointer flex items-center justify-center gap-2"
              >
                <Plane className="w-3.5 h-3.5" />
                Disparar Asignación de Vuelo
              </button>
            </div>

            {/* Tarjeta 4: Alerta Médica AAC */}
            <div className="p-5 rounded-2xl bg-slate-900/80 border border-purple-500/30 flex flex-col justify-between space-y-4 hover:border-purple-500/50 transition-all">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="p-2 rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20">
                    <ShieldAlert className="w-5 h-5" />
                  </span>
                  <span className="text-[10px] font-bold text-purple-400 uppercase tracking-wide">RAC 67.025</span>
                </div>
                <h3 className="text-sm font-bold text-white">4. Alerta Regulatoria Médica AAC</h3>
              </div>
              <button
                onClick={() => handleTriggerAlert('medical', 'Alerta Médica AAC')}
                disabled={dispatchingAlert}
                className="w-full py-2.5 rounded-xl text-xs font-bold bg-purple-600 hover:bg-purple-500 text-white shadow-md transition-all cursor-pointer flex items-center justify-center gap-2"
              >
                <ShieldAlert className="w-3.5 h-3.5" />
                Disparar Alerta Médica
              </button>
            </div>

            {/* Tarjeta 5: Alerta de Saldo Bajo */}
            <div className="p-5 rounded-2xl bg-slate-900/80 border border-amber-500/30 flex flex-col justify-between space-y-4 hover:border-amber-500/50 transition-all">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="p-2 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
                    <DollarSign className="w-5 h-5" />
                  </span>
                  <span className="text-[10px] font-bold text-amber-400 uppercase tracking-wide">Prevención</span>
                </div>
                <h3 className="text-sm font-bold text-white">5. Alerta Preventiva de Saldo Bajo</h3>
              </div>
              <button
                onClick={() => handleTriggerAlert('low_balance', 'Alerta de Saldo Bajo')}
                disabled={dispatchingAlert}
                className="w-full py-2.5 rounded-xl text-xs font-bold bg-amber-600 hover:bg-amber-500 text-white shadow-md transition-all cursor-pointer flex items-center justify-center gap-2"
              >
                <DollarSign className="w-3.5 h-3.5" />
                Disparar Alerta de Saldo
              </button>
            </div>

            {/* Tarjeta 6: Alerta Mantenimiento Flota */}
            <div className="p-5 rounded-2xl bg-slate-900/80 border border-rose-500/30 flex flex-col justify-between space-y-4 hover:border-rose-500/50 transition-all">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="p-2 rounded-xl bg-rose-500/10 text-rose-400 border border-rose-500/20">
                    <Wrench className="w-5 h-5" />
                  </span>
                  <span className="text-[10px] font-bold text-rose-400 uppercase tracking-wide">Aeronavegabilidad</span>
                </div>
                <h3 className="text-sm font-bold text-white">6. Alerta de Mantenimiento de Flota (50 Horas)</h3>
              </div>
              <button
                onClick={() => handleTriggerAlert('maintenance', 'Alerta de Mantenimiento')}
                disabled={dispatchingAlert}
                className="w-full py-2.5 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-500 text-white shadow-md transition-all cursor-pointer flex items-center justify-center gap-2"
              >
                <Wrench className="w-3.5 h-3.5" />
                Disparar Alerta de Mantenimiento
              </button>
            </div>
          </div>
        </div>
      ) : activeTab === 'directorio_correos' ? (
        /* VISTA: DIRECTORIO OFICIAL DE CORREOS REGISTRADOS */
        <div className="space-y-5">
          <div className="p-5 rounded-2xl bg-gradient-to-r from-slate-900 via-sky-950 to-slate-900 border border-sky-500/20 text-white">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h2 className="text-xl font-black text-white flex items-center gap-2">
                  Directorio de Correos Electrónicos Registrados
                </h2>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-400">Total Usuarios:</span>
                <span className="px-3 py-1 rounded-xl bg-sky-900/60 border border-sky-500/30 text-sky-200 font-extrabold text-sm">
                  {registeredUsers.length}
                </span>
              </div>
            </div>

            {/* Buscador de usuarios */}
            <div className="mt-4 pt-4 border-t border-slate-800/80 flex flex-col sm:flex-row items-center gap-3">
              <div className="relative w-full sm:max-w-md">
                <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                <input
                  type="text"
                  value={userSearchTerm}
                  onChange={(e) => setUserSearchTerm(e.target.value)}
                  placeholder="Buscar por nombre, correo o rol..."
                  className="w-full pl-9 pr-3 py-2 bg-slate-950/80 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-400 focus:outline-none focus:border-sky-500"
                />
              </div>

              <span className="text-xs text-slate-400 hidden sm:inline">
                Mostrando usuarios cuyos correos reciben notificaciones en tiempo real
              </span>
            </div>
          </div>

          {/* Tabla de Usuarios Registrados */}
          <div className="rounded-2xl border border-slate-800 bg-slate-900/40 overflow-hidden shadow-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-slate-900 text-slate-400 font-bold border-b border-slate-800 uppercase text-[10px] tracking-wider">
                  <tr>
                    <th className="py-3 px-4">Usuario</th>
                    <th className="py-3 px-4">Rol en la Academia</th>
                    <th className="py-3 px-4">Correo Electrónico Registrado</th>
                    <th className="py-3 px-4 text-center">Estado de Recepción</th>
                    <th className="py-3 px-4 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {registeredUsers
                    .filter(u => {
                      if (!userSearchTerm.trim()) return true;
                      const q = userSearchTerm.toLowerCase();
                      return (
                        (u.nombre || '').toLowerCase().includes(q) ||
                        (u.correo || '').toLowerCase().includes(q) ||
                        (u.rol || '').toLowerCase().includes(q) ||
                        (u.id || '').toLowerCase().includes(q)
                      );
                    })
                    .map(u => {
                      const isEditing = editingUserId === u.id;
                      const userLogsCount = logs.filter(l => (l.destinatario_email || '').toLowerCase() === (u.correo || '').toLowerCase()).length;

                      return (
                        <tr key={u.id} className="hover:bg-slate-800/30 transition-colors">
                          {/* Columna Usuario */}
                          <td className="py-3.5 px-4">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-lg bg-sky-950 border border-sky-800 text-sky-300 flex items-center justify-center font-bold text-xs flex-shrink-0">
                                {u.nombre ? u.nombre.substring(0, 2).toUpperCase() : 'US'}
                              </div>
                              <div>
                                <span className="font-bold text-white block">{u.nombre}</span>
                                <span className="text-[10px] font-mono text-slate-500">{u.id}</span>
                              </div>
                            </div>
                          </td>

                          {/* Columna Rol */}
                          <td className="py-3.5 px-4">
                            {getRoleBadge(u.rol)}
                          </td>

                          {/* Columna Correo Registrado */}
                          <td className="py-3.5 px-4">
                            {isEditing ? (
                              <div className="flex items-center gap-2 max-w-sm">
                                <input
                                  type="email"
                                  value={editingUserEmail}
                                  onChange={(e) => setEditingUserEmail(e.target.value)}
                                  disabled={savingUserEmail}
                                  className="w-full px-2.5 py-1.5 bg-slate-950 border border-sky-500 rounded-lg text-xs font-mono text-white focus:outline-none"
                                />
                                <button
                                  type="button"
                                  onClick={() => handleSaveUserEmail(u.id)}
                                  disabled={savingUserEmail}
                                  className="p-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white cursor-pointer"
                                  title="Guardar Correo"
                                >
                                  <Save className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setEditingUserId(null)}
                                  disabled={savingUserEmail}
                                  className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 cursor-pointer"
                                  title="Cancelar"
                                >
                                  <X className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            ) : (
                              <div className="flex items-center gap-2">
                                <Mail className="w-3.5 h-3.5 text-sky-400 flex-shrink-0" />
                                <span className="font-mono text-sky-200 font-semibold">{u.correo}</span>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setEditingUserId(u.id);
                                    setEditingUserEmail(u.correo || '');
                                  }}
                                  className="p-1 text-slate-400 hover:text-white rounded transition-colors cursor-pointer"
                                  title="Modificar correo registrado"
                                >
                                  <Edit3 className="w-3 h-3" />
                                </button>
                              </div>
                            )}
                          </td>

                          {/* Columna Estado de Recepción */}
                          <td className="py-3.5 px-4 text-center">
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                              <CheckCircle2 className="w-3 h-3 text-emerald-400" /> Activo ({userLogsCount} notif.)
                            </span>
                          </td>

                          {/* Columna Acciones */}
                          <td className="py-3.5 px-4 text-right">
                            <button
                              type="button"
                              onClick={() => handleSendTestToUser(u)}
                              disabled={dispatchingAlert}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-sky-600/80 hover:bg-sky-500 text-white transition-all cursor-pointer shadow-xs disabled:opacity-50"
                              title={`Enviar prueba directa a ${u.correo}`}
                            >
                              <Send className="w-3 h-3" />
                              <span>Probar Envío</span>
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : (
        /* Vista de Bandeja de Entrada & Visor de Correo */
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Columna Izquierda: Buscador & Lista de Correos (5 columnas) */}
          <div className="lg:col-span-5 space-y-3">
            {/* Buscador */}
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar por asunto, destinatario o contenido..."
                className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-slate-900/80 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-sky-500"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-2.5 text-slate-400 hover:text-white text-xs"
                >
                  ✕
                </button>
              )}
            </div>

            {/* Listado de Correos */}
            <div className="space-y-2 max-h-[620px] overflow-y-auto pr-1">
              {loading ? (
                <div className="p-8 text-center text-slate-400 text-xs space-y-2">
                  <RefreshCw className="w-6 h-6 animate-spin mx-auto text-sky-400" />
                  <p>Cargando registros de correo...</p>
                </div>
              ) : filteredEmails.length === 0 ? (
                <div className="p-12 text-center rounded-xl border border-dashed border-slate-800 text-slate-400 text-xs space-y-2">
                  <Inbox className="w-8 h-8 mx-auto text-slate-500" />
                  <p className="font-semibold text-slate-300">No hay correos en esta bandeja.</p>
                </div>
              ) : (
                filteredEmails.map((email) => {
                  const isSelected = selectedEmail?.id === email.id;
                  const dateStr = new Date(email.fecha_envio).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) + ' • ' + new Date(email.fecha_envio).toLocaleDateString('es-PA', { day: '2-digit', month: 'short' });

                  return (
                    <div
                      key={email.id}
                      onClick={() => handleSelectEmail(email)}
                      className={`p-3.5 rounded-xl border transition-all cursor-pointer text-left relative space-y-1.5 ${
                        isSelected
                          ? 'bg-sky-950/60 border-sky-500 shadow-md shadow-sky-500/10'
                          : email.leido
                          ? 'bg-slate-900/40 border-slate-800/80 hover:bg-slate-800/40'
                          : 'bg-slate-900/90 border-slate-700/80 hover:border-sky-500/50'
                      }`}
                    >
                      {/* Indicador de no leído */}
                      {!email.leido && (
                        <span className="w-2 h-2 rounded-full bg-sky-400 absolute top-3.5 right-3 animate-pulse" title="No leído" />
                      )}

                      <div className="flex items-center justify-between gap-2 pr-3">
                        <div className="flex items-center gap-1.5 overflow-hidden">
                          {getRoleBadge(email.destinatario_tipo)}
                          <span className="text-xs font-bold text-white truncate max-w-[170px]">
                            {email.destinatario_nombre}
                          </span>
                        </div>
                        <span className="text-[10px] text-slate-400 shrink-0">{dateStr}</span>
                      </div>

                      <div className="text-xs font-semibold text-slate-200 line-clamp-1">
                        {email.asunto}
                      </div>

                      <div className="flex items-center justify-between gap-2 text-[11px] text-slate-400">
                        <div className="flex items-center gap-1.5">
                          {getEventBadge(email.evento)}
                        </div>
                        <span className="text-[10px] text-slate-500 font-mono truncate max-w-[140px]">
                          {email.destinatario_email}
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Columna Derecha: Visor de Correo en Alta Fidelidad (7 columnas) */}
          <div className="lg:col-span-7">
            {selectedEmail ? (
              <div className="rounded-2xl border border-slate-800 bg-slate-900 overflow-hidden shadow-2xl flex flex-col">
                {/* Cabecera del Correo */}
                <div className="p-5 border-b border-slate-800 bg-slate-950/80 space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      {getEventBadge(selectedEmail.evento)}
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                        <Check className="w-3 h-3" /> Estado: {selectedEmail.estado_envio.toUpperCase()}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5 text-xs text-slate-400">
                      <Clock className="w-3.5 h-3.5" />
                      <span>{new Date(selectedEmail.fecha_envio).toLocaleString('es-PA')}</span>
                    </div>
                  </div>

                  <h2 className="text-lg font-bold text-white leading-snug">
                    {selectedEmail.asunto}
                  </h2>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs pt-2 border-t border-slate-800/80 text-slate-300">
                    <div>
                      <span className="text-slate-500 font-medium">De:</span>{' '}
                      <strong className="text-sky-300">SkyOps Flight Academy &lt;despacho@skyopsacademy.com&gt;</strong>
                    </div>
                    <div>
                      <span className="text-slate-500 font-medium">Para:</span>{' '}
                      <strong>{selectedEmail.destinatario_nombre}</strong> &lt;{selectedEmail.destinatario_email}&gt;
                    </div>
                  </div>
                </div>

                {/* Cuerpo del Correo (Render HTML en contenedor aislado) */}
                <div className="p-6 bg-slate-950 overflow-y-auto max-h-[550px]">
                  <div
                    className="email-render-preview bg-white text-slate-900 rounded-xl overflow-hidden shadow-lg p-1"
                    dangerouslySetInnerHTML={{ __html: selectedEmail.cuerpo_html }}
                  />
                </div>

                {/* Pie de Acciones del Visor */}
                <div className="p-3.5 border-t border-slate-800 bg-slate-950 flex flex-wrap items-center justify-between gap-2 text-xs">
                  <div className="flex items-center gap-2 text-slate-400">
                    <span className="font-mono text-[11px]">ID: {selectedEmail.id}</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        window.print();
                      }}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 cursor-pointer"
                    >
                      <Printer className="w-3.5 h-3.5" />
                      Imprimir
                    </button>
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(selectedEmail.cuerpo_texto || selectedEmail.asunto);
                        showNotification('Texto del correo copiado al portapapeles.', 'info');
                      }}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 cursor-pointer"
                    >
                      <Share2 className="w-3.5 h-3.5" />
                      Copiar
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="h-[500px] rounded-2xl border border-dashed border-slate-800 bg-slate-900/20 flex flex-col items-center justify-center text-center p-8 text-slate-400 space-y-3">
                <div className="p-4 rounded-full bg-slate-800/50 text-slate-500">
                  <Mail className="w-8 h-8" />
                </div>
                <h3 className="text-base font-bold text-slate-300">Selecciona un correo para previsualizar</h3>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modal de Personalización de Plantillas */}
      <EmailTemplatesModal
        isOpen={showTemplatesModal}
        onClose={() => setShowTemplatesModal(false)}
        onSaved={() => {
          showNotification('Plantillas y marca de correo actualizadas exitosamente.', 'success');
          loadData(true);
        }}
      />

      {/* Modal de Redactor Directo de Correo */}
      <EmailSenderModal
        isOpen={showSenderModal}
        onClose={() => setShowSenderModal(false)}
        allUsers={allUsers}
        onSuccess={() => {
          showNotification('Correo despachado exitosamente.', 'success');
          loadData(true);
        }}
      />
    </div>
  );
};
