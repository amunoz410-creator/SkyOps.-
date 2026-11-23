import React, { useState, useEffect } from 'react';
import {
  MessageSquare,
  Send,
  Smartphone,
  Bell,
  FileText,
  Calendar,
  Clock,
  CheckCircle2,
  AlertTriangle,
  AlertOctagon,
  ShieldCheck,
  RefreshCw,
  Play,
  Sliders,
  Eye,
  EyeOff,
  Copy,
  Check,
  QrCode,
  Search,
  Filter,
  Sparkles,
  Plane,
  User,
  ExternalLink,
  Settings,
  Zap,
  ArrowRight,
  HelpCircle,
  ChevronDown
} from 'lucide-react';
import { api } from '../services/api';
import {
  WhatsAppConfig,
  WhatsAppTrigger,
  WhatsAppLogMessage,
  WhatsAppTriggerExecutionResult,
  User as UserType
} from '../types';

interface WhatsAppConfigModuleProps {
  currentUser?: UserType;
  onNavigateToUser?: (userId: string) => void;
}

export const WhatsAppConfigModule: React.FC<WhatsAppConfigModuleProps> = ({
  currentUser
}) => {
  // Estados principales
  const [activeTab, setActiveTab] = useState<'triggers' | 'config' | 'logs' | 'simulator'>('triggers');
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [executing, setExecuting] = useState<boolean>(false);

  // Datos
  const [config, setConfig] = useState<WhatsAppConfig | null>(null);
  const [triggers, setTriggers] = useState<WhatsAppTrigger[]>([]);
  const [logs, setLogs] = useState<WhatsAppLogMessage[]>([]);
  const [students, setStudents] = useState<UserType[]>([]);

  // Filtros de Triggers
  const [triggerCategoryFilter, setTriggerCategoryFilter] = useState<'todos' | 'documentos' | 'itinerarios'>('todos');
  const [triggerSearch, setTriggerSearch] = useState<string>('');

  // Filtros de Logs
  const [logFilterTrigger, setLogFilterTrigger] = useState<string>('todos');
  const [logFilterStatus, setLogFilterStatus] = useState<string>('todos');
  const [logSearch, setLogSearch] = useState<string>('');

  // Modal de Edición de Disparador
  const [editingTrigger, setEditingTrigger] = useState<WhatsAppTrigger | null>(null);
  const [tempTrigger, setTempTrigger] = useState<WhatsAppTrigger | null>(null);

  // Modal de Prueba Rápida
  const [testModalOpen, setTestModalOpen] = useState<boolean>(false);
  const [testRecipientName, setTestRecipientName] = useState<string>('Capitán Juan Pérez');
  const [testRecipientPhone, setTestRecipientPhone] = useState<string>('+507 6890-1234');
  const [testMessageBody, setTestMessageBody] = useState<string>('');
  const [testSending, setTestSending] = useState<boolean>(false);
  const [testSuccessMessage, setTestSuccessMessage] = useState<string | null>(null);

  // Modal de Resultado de Ejecución de Disparadores
  const [executionResult, setExecutionResult] = useState<WhatsAppTriggerExecutionResult | null>(null);

  // Modal de Código QR
  const [qrModalOpen, setQrModalOpen] = useState<boolean>(false);
  const [qrData, setQrData] = useState<string | null>(null);
  const [qrLoading, setQrLoading] = useState<boolean>(false);

  // Formulario de Credenciales API
  const [showToken, setShowToken] = useState<boolean>(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [notificationBanner, setNotificationBanner] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Carga inicial
  const loadData = async () => {
    try {
      setLoading(true);
      const [cfgData, trgData, logsData, usrData] = await Promise.all([
        api.getWhatsAppConfig(),
        api.getWhatsAppTriggers(),
        api.getWhatsAppLogs(),
        api.getUsers('estudiante')
      ]);
      setConfig(cfgData);
      setTriggers(trgData);
      setLogs(logsData);
      setStudents(usrData);
    } catch (err: any) {
      console.error('Error cargando configuración de WhatsApp:', err);
      setNotificationBanner({
        type: 'error',
        message: 'No se pudo conectar con el servicio de WhatsApp. ' + (err.message || '')
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCopy = (text: string, fieldKey: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(fieldKey);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const handleVerifyConnection = async () => {
    try {
      setSaving(true);
      const result = await api.verifyWhatsAppConnection();
      setConfig(result.config);
      setNotificationBanner({
        type: 'success',
        message: result.message
      });
      setTimeout(() => setNotificationBanner(null), 4000);
    } catch (err: any) {
      setNotificationBanner({
        type: 'error',
        message: 'Error al verificar API: ' + (err.message || 'Error desconocido')
      });
    } finally {
      setSaving(false);
    }
  };

  const handleSaveConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!config) return;
    try {
      setSaving(true);
      const updated = await api.updateWhatsAppConfig(config);
      setConfig(updated);
      setNotificationBanner({
        type: 'success',
        message: 'Credenciales y parámetros de WhatsApp Business guardados correctamente.'
      });
      setTimeout(() => setNotificationBanner(null), 4000);
    } catch (err: any) {
      setNotificationBanner({
        type: 'error',
        message: 'Error al guardar credenciales: ' + (err.message || '')
      });
    } finally {
      setSaving(false);
    }
  };

  const handleToggleTrigger = async (triggerId: string, currentStatus: boolean) => {
    try {
      const updated = await api.toggleWhatsAppTrigger(triggerId, !currentStatus);
      setTriggers(prev => prev.map(t => (t.id === triggerId ? updated : t)));
    } catch (err: any) {
      alert('Error al alternar estado del disparador: ' + err.message);
    }
  };

  const handleOpenEditTrigger = (trigger: WhatsAppTrigger) => {
    setEditingTrigger(trigger);
    setTempTrigger({ ...trigger });
  };

  const handleSaveTrigger = async () => {
    if (!tempTrigger) return;
    try {
      setSaving(true);
      const updated = await api.updateWhatsAppTrigger(tempTrigger.id, tempTrigger);
      setTriggers(prev => prev.map(t => (t.id === updated.id ? updated : t)));
      setEditingTrigger(null);
      setTempTrigger(null);
      setNotificationBanner({
        type: 'success',
        message: `Disparador "${updated.nombre}" actualizado correctamente.`
      });
      setTimeout(() => setNotificationBanner(null), 3000);
    } catch (err: any) {
      alert('Error al guardar disparador: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleInsertVariable = (variable: string) => {
    if (!tempTrigger) return;
    setTempTrigger(prev => {
      if (!prev) return null;
      return {
        ...prev,
        plantilla_mensaje: (prev.plantilla_mensaje || '') + ' ' + variable
      };
    });
  };

  const handleOpenQuickTest = (trigger?: WhatsAppTrigger) => {
    if (trigger) {
      // Generar mensaje de muestra con variables de prueba
      let sample = trigger.plantilla_mensaje
        .replace(/\{\{nombre_alumno\}\}/g, testRecipientName)
        .replace(/\{\{tipo_documento\}\}/g, 'Certificado Médico Aeronáutico')
        .replace(/\{\{fecha_vencimiento\}\}/g, '2026-09-15')
        .replace(/\{\{dias_restantes\}\}/g, String(trigger.dias_antelacion || 15))
        .replace(/\{\{numero_medico\}\}/g, 'MED-9912')
        .replace(/\{\{telefono_escuela\}\}/g, '+507 6890-4411')
        .replace(/\{\{clase_medico\}\}/g, 'Clase 1')
        .replace(/\{\{matricula\}\}/g, 'HP-1450')
        .replace(/\{\{modelo_aeronave\}\}/g, 'Cessna 172SP')
        .replace(/\{\{fecha_vuelo\}\}/g, '2026-08-26')
        .replace(/\{\{hora_inicio\}\}/g, '08:00')
        .replace(/\{\{hora_fin\}\}/g, '10:00')
        .replace(/\{\{instructor\}\}/g, 'Cap. Roberto Morales (CFI)')
        .replace(/\{\{tipo_mision\}\}/g, 'Navegación IFR a David (MPDA)')
        .replace(/\{\{motivo_cambio\}\}/g, 'Ajuste de slot operacional')
        .replace(/\{\{motivo_cancelacion\}\}/g, 'METAR MPPA: Tormenta con CB en aproximación');
      setTestMessageBody(sample);
    } else {
      setTestMessageBody('🛫 *SkyOps Flight Academy Albrook*\n\nHola *Capitán*, este es un mensaje de prueba de la pasarela oficial de WhatsApp Business API.');
    }
    setTestSuccessMessage(null);
    setTestModalOpen(true);
  };

  const handleSendTestMessage = async () => {
    if (!testRecipientPhone || !testMessageBody) return;
    try {
      setTestSending(true);
      const newLog = await api.sendTestWhatsAppMessage({
        destinatario_nombre: testRecipientName,
        destinatario_telefono: testRecipientPhone,
        mensaje: testMessageBody,
        trigger_id: editingTrigger?.id
      });
      setLogs(prev => [newLog, ...prev]);
      setTestSuccessMessage(`Mensaje de prueba entregado exitosamente a ${testRecipientPhone}.`);
      setTimeout(() => {
        setTestModalOpen(false);
        setTestSuccessMessage(null);
      }, 2500);
    } catch (err: any) {
      alert('Error enviando mensaje de prueba: ' + err.message);
    } finally {
      setTestSending(false);
    }
  };

  const handleExecuteTriggersNow = async () => {
    try {
      setExecuting(true);
      const result = await api.executeScheduledTriggers();
      setExecutionResult(result);
      // Refrescar logs y triggers
      const [updatedLogs, updatedTriggers] = await Promise.all([
        api.getWhatsAppLogs(),
        api.getWhatsAppTriggers()
      ]);
      setLogs(updatedLogs);
      setTriggers(updatedTriggers);
    } catch (err: any) {
      alert('Error al ejecutar disparadores: ' + err.message);
    } finally {
      setExecuting(false);
    }
  };

  const handleGenerateQR = async () => {
    try {
      setQrLoading(true);
      setQrModalOpen(true);
      const res = await api.generateWhatsAppQR();
      setQrData(res.qrCode);
      if (config) {
        setConfig({ ...config, status: 'qr_ready', qrCodeData: res.qrCode });
      }
    } catch (err: any) {
      alert('Error generando QR: ' + err.message);
    } finally {
      setQrLoading(false);
    }
  };

  // Filtrado de Disparadores
  const filteredTriggers = triggers.filter(t => {
    if (triggerCategoryFilter !== 'todos' && t.categoria !== triggerCategoryFilter) return false;
    if (triggerSearch) {
      const q = triggerSearch.toLowerCase();
      return (
        (t.nombre || '').toLowerCase().includes(q) ||
        (t.descripcion || '').toLowerCase().includes(q) ||
        (t.evento || '').toLowerCase().includes(q)
      );
    }
    return true;
  });

  // Filtrado de Logs
  const filteredLogs = logs.filter(l => {
    if (logFilterTrigger !== 'todos' && l.trigger_id !== logFilterTrigger) return false;
    if (logFilterStatus !== 'todos' && l.estado_entrega !== logFilterStatus) return false;
    if (logSearch) {
      const q = logSearch.toLowerCase();
      return (
        (l.destinatario_nombre || '').toLowerCase().includes(q) ||
        (l.destinatario_telefono || '').toLowerCase().includes(q) ||
        (l.mensaje || '').toLowerCase().includes(q)
      );
    }
    return true;
  });

  const docTriggersCount = triggers.filter(t => t.categoria === 'documentos' && t.activo).length;
  const itinTriggersCount = triggers.filter(t => t.categoria === 'itinerarios' && t.activo).length;
  const totalDisparados = triggers.reduce((acc, t) => acc + (t.total_disparados || 0), 0);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 space-y-4">
        <div className="w-12 h-12 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-sm font-medium text-slate-600 dark:text-slate-400">
          Cargando configuración de WhatsApp Business & Disparadores...
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Banner de Notificación Rápida */}
      {notificationBanner && (
        <div
          className={`p-4 rounded-xl flex items-center justify-between border ${
            notificationBanner.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800 dark:bg-emerald-950/40 dark:border-emerald-800 dark:text-emerald-300'
              : 'bg-red-50 border-red-200 text-red-800 dark:bg-red-950/40 dark:border-red-800 dark:text-red-300'
          }`}
        >
          <div className="flex items-center space-x-3">
            {notificationBanner.type === 'success' ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
            ) : (
              <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400 shrink-0" />
            )}
            <span className="text-sm font-medium">{notificationBanner.message}</span>
          </div>
          <button
            onClick={() => setNotificationBanner(null)}
            className="text-xs font-semibold underline opacity-75 hover:opacity-100"
          >
            Cerrar
          </button>
        </div>
      )}

      {/* HEADER PRINCIPAL */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
          <div className="space-y-1.5">
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 rounded-xl bg-emerald-600 flex items-center justify-center text-white shadow-md shadow-emerald-500/20">
                <MessageSquare className="w-6 h-6" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
                  WhatsApp Business & Automatización
                </h1>
              </div>
            </div>
          </div>

          {/* Acciones Rápidas del Encabezado */}
          <div className="flex flex-wrap items-center gap-2.5">
            <button
              onClick={handleExecuteTriggersNow}
              disabled={executing}
              className="inline-flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white text-sm font-semibold shadow-sm transition-all disabled:opacity-50"
              title="Escanea inmediatamente alumnos con documentos próximos a vencer y vuelos programados para enviar alertas"
            >
              {executing ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <Play className="w-4 h-4 fill-white" />
              )}
              <span>{executing ? 'Escaneando...' : 'Escanear & Disparar Ahora'}</span>
            </button>

            <button
              onClick={() => handleOpenQuickTest()}
              className="inline-flex items-center space-x-2 px-3.5 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-sm font-medium border border-slate-200 dark:border-slate-700 transition-colors"
            >
              <Send className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <span>Mensaje de Prueba</span>
            </button>

            <button
              onClick={handleVerifyConnection}
              disabled={saving}
              className="inline-flex items-center space-x-2 px-3.5 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-sm font-medium border border-slate-200 dark:border-slate-700 transition-colors"
            >
              <RefreshCw className={`w-4 h-4 ${saving ? 'animate-spin' : ''}`} />
              <span>Verificar Conexión</span>
            </button>
          </div>
        </div>

        {/* Tarjeta de Estatus de Conexión WABA */}
        <div className="mt-6 pt-6 border-t border-slate-100 dark:border-slate-800/80 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-800 flex items-center space-x-3">
            <div className="p-2 rounded-lg bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300">
              <Smartphone className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs text-slate-500 dark:text-slate-400 font-medium">Línea Oficial Emisora</div>
              <div className="text-sm font-bold text-slate-900 dark:text-slate-100">
                {config?.displayPhoneNumber || '+507 6890-4411'}
              </div>
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-800 flex items-center space-x-3">
            <div className="p-2 rounded-lg bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs text-slate-500 dark:text-slate-400 font-medium">Estado WABA & Calidad</div>
              <div className="flex items-center space-x-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                <span className="text-sm font-bold text-emerald-700 dark:text-emerald-400">
                  {config?.status === 'connected' ? 'Conectado / Alta' : 'Desconectado'}
                </span>
              </div>
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-800 flex items-center space-x-3">
            <div className="p-2 rounded-lg bg-indigo-100 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300">
              <Zap className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs text-slate-500 dark:text-slate-400 font-medium">Disparadores Activos</div>
              <div className="text-sm font-bold text-slate-900 dark:text-slate-100">
                {docTriggersCount} Docs • {itinTriggersCount} Itinerarios
              </div>
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-800 flex items-center space-x-3">
            <div className="p-2 rounded-lg bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300">
              <Bell className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs text-slate-500 dark:text-slate-400 font-medium">Total Notificaciones</div>
              <div className="text-sm font-bold text-slate-900 dark:text-slate-100">
                {totalDisparados.toLocaleString()} envíos automáticos
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* PESTAÑAS DE NAVEGACIÓN */}
      <div className="flex border-b border-slate-200 dark:border-slate-800 space-x-1 bg-white dark:bg-slate-900 px-4 pt-2 rounded-xl shadow-xs">
        <button
          onClick={() => setActiveTab('triggers')}
          className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors flex items-center space-x-2 ${
            activeTab === 'triggers'
              ? 'border-emerald-600 text-emerald-600 dark:text-emerald-400 dark:border-emerald-400'
              : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
          }`}
        >
          <Sliders className="w-4 h-4" />
          <span>Disparadores de Alertas ({triggers.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('config')}
          className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors flex items-center space-x-2 ${
            activeTab === 'config'
              ? 'border-emerald-600 text-emerald-600 dark:text-emerald-400 dark:border-emerald-400'
              : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
          }`}
        >
          <Settings className="w-4 h-4" />
          <span>Vinculación WABA & Credenciales</span>
        </button>

        <button
          onClick={() => setActiveTab('logs')}
          className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors flex items-center space-x-2 ${
            activeTab === 'logs'
              ? 'border-emerald-600 text-emerald-600 dark:text-emerald-400 dark:border-emerald-400'
              : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
          }`}
        >
          <FileText className="w-4 h-4" />
          <span>Historial de Mensajes ({logs.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('simulator')}
          className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors flex items-center space-x-2 ${
            activeTab === 'simulator'
              ? 'border-emerald-600 text-emerald-600 dark:text-emerald-400 dark:border-emerald-400'
              : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
          }`}
        >
          <Sparkles className="w-4 h-4" />
          <span>Simulador Operacional</span>
        </button>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: DISPARADORES AUTOMÁTICOS */}
      {/* ========================================================================= */}
      {activeTab === 'triggers' && (
        <div className="space-y-6">
          {/* Barra de Filtros de Disparadores */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800">
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setTriggerCategoryFilter('todos')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                  triggerCategoryFilter === 'todos'
                    ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900'
                    : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                }`}
              >
                Todos ({triggers.length})
              </button>
              <button
                onClick={() => setTriggerCategoryFilter('documentos')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors flex items-center space-x-1.5 ${
                  triggerCategoryFilter === 'documentos'
                    ? 'bg-amber-600 text-white'
                    : 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300'
                }`}
              >
                <FileText className="w-3.5 h-3.5" />
                <span>Vencimiento de Documentos ({triggers.filter(t => t.categoria === 'documentos').length})</span>
              </button>
              <button
                onClick={() => setTriggerCategoryFilter('itinerarios')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors flex items-center space-x-1.5 ${
                  triggerCategoryFilter === 'itinerarios'
                    ? 'bg-sky-600 text-white'
                    : 'bg-sky-50 text-sky-700 dark:bg-sky-950/40 dark:text-sky-300'
                }`}
              >
                <Plane className="w-3.5 h-3.5" />
                <span>Cambios en Itinerarios ({triggers.filter(t => t.categoria === 'itinerarios').length})</span>
              </button>
            </div>

            <div className="relative w-full sm:w-72">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Buscar disparador o evento..."
                value={triggerSearch}
                onChange={e => setTriggerSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 rounded-lg text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>

          {/* LISTA DE DISPARADORES */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredTriggers.map(trigger => (
              <div
                key={trigger.id}
                className={`bg-white dark:bg-slate-900 rounded-2xl border transition-all p-5 flex flex-col justify-between ${
                  trigger.activo
                    ? 'border-slate-200 dark:border-slate-800 shadow-xs'
                    : 'border-slate-200/60 dark:border-slate-800/60 opacity-60 bg-slate-50/50 dark:bg-slate-900/40'
                }`}
              >
                <div className="space-y-3">
                  {/* Encabezado del Trigger */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start space-x-3">
                      <div
                        className={`p-2.5 rounded-xl shrink-0 ${
                          trigger.categoria === 'documentos'
                            ? 'bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300'
                            : 'bg-sky-100 text-sky-700 dark:bg-sky-950/50 dark:text-sky-300'
                        }`}
                      >
                        {trigger.categoria === 'documentos' ? (
                          <FileText className="w-5 h-5" />
                        ) : (
                          <Plane className="w-5 h-5" />
                        )}
                      </div>
                      <div>
                        <div className="flex items-center space-x-2">
                          <span
                            className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md ${
                              trigger.categoria === 'documentos'
                                ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-300'
                                : 'bg-sky-100 text-sky-800 dark:bg-sky-900/50 dark:text-sky-300'
                            }`}
                          >
                            {trigger.categoria === 'documentos' ? 'Vigencia Doc' : 'Itinerario'}
                          </span>
                          {trigger.dias_antelacion !== undefined && (
                            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                              {trigger.dias_antelacion === 0
                                ? 'El día de vencimiento'
                                : `${trigger.dias_antelacion} días antes`}
                            </span>
                          )}
                          {trigger.horas_antelacion !== undefined && (
                            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                              {trigger.horas_antelacion} horas antes
                            </span>
                          )}
                        </div>
                        <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 mt-1">
                          {trigger.nombre}
                        </h3>
                      </div>
                    </div>

                    {/* Switch de Activación */}
                    <button
                      onClick={() => handleToggleTrigger(trigger.id, trigger.activo)}
                      className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                        trigger.activo ? 'bg-emerald-600' : 'bg-slate-300 dark:bg-slate-700'
                      }`}
                      title={trigger.activo ? 'Desactivar disparador' : 'Activar disparador'}
                    >
                      <span
                        className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                          trigger.activo ? 'translate-x-5' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </div>

                  <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                    {trigger.descripcion}
                  </p>

                  {/* Destinatarios */}
                  <div className="flex flex-wrap items-center gap-1.5 pt-1">
                    <span className="text-xs font-medium text-slate-500 dark:text-slate-400 mr-1">
                      Destinatarios:
                    </span>
                    {trigger.destinatarios.map(d => (
                      <span
                        key={d}
                        className="px-2 py-0.5 text-[11px] font-semibold rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 capitalize"
                      >
                        {d}
                      </span>
                    ))}
                  </div>

                  {/* Vista Previa del Mensaje Configurado */}
                  <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200/80 dark:border-slate-800/80 text-xs text-slate-700 dark:text-slate-300 font-mono whitespace-pre-wrap line-clamp-3">
                    {trigger.plantilla_mensaje}
                  </div>
                </div>

                {/* Footer de la Tarjeta */}
                <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                  <div className="flex items-center space-x-3">
                    <span>
                      Disparos: <strong>{trigger.total_disparados || 0}</strong>
                    </span>
                    {trigger.ultimo_disparo && (
                      <span className="hidden sm:inline">
                        Último: {new Date(trigger.ultimo_disparo).toLocaleDateString()}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => handleOpenQuickTest(trigger)}
                      className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-medium transition-colors flex items-center space-x-1"
                      title="Enviar mensaje de prueba con esta plantilla"
                    >
                      <Send className="w-3 h-3 text-emerald-600" />
                      <span>Probar</span>
                    </button>
                    <button
                      onClick={() => handleOpenEditTrigger(trigger)}
                      className="px-2.5 py-1 rounded-lg bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/50 dark:hover:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300 font-semibold transition-colors flex items-center space-x-1"
                    >
                      <Sliders className="w-3 h-3" />
                      <span>Editar</span>
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: VINCULACIÓN WABA & CREDENCIALES */}
      {/* ========================================================================= */}
      {activeTab === 'config' && config && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Panel Principal de Formulario */}
          <div className="lg:col-span-2 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm space-y-6">
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                Credenciales de Meta WhatsApp Business Cloud API
              </h2>
            </div>

            <form onSubmit={handleSaveConfig} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    Nombre Comercial Registrado
                  </label>
                  <input
                    type="text"
                    value={config.businessName}
                    onChange={e => setConfig({ ...config, businessName: e.target.value })}
                    className="w-full px-3.5 py-2 rounded-xl text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                    placeholder="Ej. SkyOps Flight Academy"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    Número de Teléfono Visible en WhatsApp
                  </label>
                  <input
                    type="text"
                    value={config.displayPhoneNumber}
                    onChange={e => setConfig({ ...config, displayPhoneNumber: e.target.value })}
                    className="w-full px-3.5 py-2 rounded-xl text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                    placeholder="+507 6890-4411"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center justify-between">
                    <span>Phone Number ID</span>
                    <button
                      type="button"
                      onClick={() => handleCopy(config.phoneNumberId, 'phoneId')}
                      className="text-[11px] text-emerald-600 hover:underline flex items-center space-x-1"
                    >
                      {copiedField === 'phoneId' ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                      <span>{copiedField === 'phoneId' ? 'Copiado' : 'Copiar'}</span>
                    </button>
                  </label>
                  <input
                    type="text"
                    value={config.phoneNumberId}
                    onChange={e => setConfig({ ...config, phoneNumberId: e.target.value })}
                    className="w-full px-3.5 py-2 rounded-xl text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-mono focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                    placeholder="100982348120..."
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center justify-between">
                    <span>WhatsApp Business Account ID (WABA ID)</span>
                    <button
                      type="button"
                      onClick={() => handleCopy(config.wabaId, 'wabaId')}
                      className="text-[11px] text-emerald-600 hover:underline flex items-center space-x-1"
                    >
                      {copiedField === 'wabaId' ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                      <span>{copiedField === 'wabaId' ? 'Copiado' : 'Copiar'}</span>
                    </button>
                  </label>
                  <input
                    type="text"
                    value={config.wabaId}
                    onChange={e => setConfig({ ...config, wabaId: e.target.value })}
                    className="w-full px-3.5 py-2 rounded-xl text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-mono focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                    placeholder="88129038102..."
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center justify-between">
                  <span>System User Permanent Access Token (Bearer)</span>
                  <div className="flex items-center space-x-2">
                    <button
                      type="button"
                      onClick={() => setShowToken(!showToken)}
                      className="text-[11px] text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 flex items-center space-x-1"
                    >
                      {showToken ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                      <span>{showToken ? 'Ocultar' : 'Ver'}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleCopy(config.accessToken, 'token')}
                      className="text-[11px] text-emerald-600 hover:underline flex items-center space-x-1"
                    >
                      {copiedField === 'token' ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                      <span>{copiedField === 'token' ? 'Copiado' : 'Copiar'}</span>
                    </button>
                  </div>
                </label>
                <input
                  type={showToken ? 'text' : 'password'}
                  value={config.accessToken}
                  onChange={e => setConfig({ ...config, accessToken: e.target.value })}
                  className="w-full px-3.5 py-2 rounded-xl text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-mono focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  placeholder="EAAG..."
                  required
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    Token de Verificación de Webhook
                  </label>
                  <input
                    type="text"
                    value={config.webhookVerifyToken || ''}
                    onChange={e => setConfig({ ...config, webhookVerifyToken: e.target.value })}
                    className="w-full px-3.5 py-2 rounded-xl text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-mono focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                    placeholder="skyops_waba_webhook_token_2026"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                      Horario Silencio (Inicio)
                    </label>
                    <input
                      type="time"
                      value={config.quietHoursStart || '22:00'}
                      onChange={e => setConfig({ ...config, quietHoursStart: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                      Horario Silencio (Fin)
                    </label>
                    <input
                      type="time"
                      value={config.quietHoursEnd || '06:30'}
                      onChange={e => setConfig({ ...config, quietHoursEnd: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              <div className="pt-4 flex items-center justify-between border-t border-slate-100 dark:border-slate-800">
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="autoSyncActive"
                    checked={config.autoSyncActive}
                    onChange={e => setConfig({ ...config, autoSyncActive: e.target.checked })}
                    className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 border-slate-300"
                  />
                  <label htmlFor="autoSyncActive" className="text-xs font-medium text-slate-700 dark:text-slate-300 cursor-pointer">
                    Habilitar sincronización y disparo automático en segundo plano
                  </label>
                </div>

                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold shadow-sm transition-colors flex items-center space-x-2"
                >
                  {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                  <span>Guardar Credenciales</span>
                </button>
              </div>
            </form>
          </div>

          {/* Tarjeta Lateral de Configuración & QR Pairing */}
          <div className="space-y-6">
            {/* Opción de Vinculación por Código QR */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm space-y-4">
              <div className="flex items-center space-x-3">
                <div className="p-2.5 rounded-xl bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300">
                  <QrCode className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    Vinculación Rápida QR
                  </h3>
                </div>
              </div>

              <button
                onClick={handleGenerateQR}
                className="w-full py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-bold border border-slate-200 dark:border-slate-700 transition-colors flex items-center justify-center space-x-2"
              >
                <QrCode className="w-4 h-4 text-emerald-600" />
                <span>Generar Código QR de Vinculación</span>
              </button>
            </div>

            {/* Guía Rápida de Formato de Variables */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm space-y-3">
              <div className="flex items-center space-x-2">
                <HelpCircle className="w-4 h-4 text-emerald-600" />
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  Variables Dinámicas
                </h3>
              </div>
              <div className="space-y-1.5 text-xs font-mono">
                <div className="p-1.5 rounded bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                  <span className="text-emerald-600 font-bold">{'{{nombre_alumno}}'}</span> : Nombre del estudiante
                </div>
                <div className="p-1.5 rounded bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                  <span className="text-emerald-600 font-bold">{'{{fecha_vencimiento}}'}</span> : Vencimiento de doc
                </div>
                <div className="p-1.5 rounded bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                  <span className="text-emerald-600 font-bold">{'{{matricula}}'}</span> : Matrícula (ej. HP-1450)
                </div>
                <div className="p-1.5 rounded bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                  <span className="text-emerald-600 font-bold">{'{{hora_inicio}}'}</span> : Hora de salida
                </div>
                <div className="p-1.5 rounded bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                  <span className="text-emerald-600 font-bold">{'{{instructor}}'}</span> : Instructor CFI
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: HISTORIAL DE MENSAJES DISPARADOS */}
      {/* ========================================================================= */}
      {activeTab === 'logs' && (
        <div className="space-y-4">
          {/* Filtros de Logs */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800">
            <div className="flex flex-wrap items-center gap-2">
              <select
                value={logFilterTrigger}
                onChange={e => setLogFilterTrigger(e.target.value)}
                className="px-3 py-1.5 rounded-lg text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300"
              >
                <option value="todos">Todos los eventos</option>
                {triggers.map(t => (
                  <option key={t.id} value={t.id}>
                    {t.nombre}
                  </option>
                ))}
              </select>

              <select
                value={logFilterStatus}
                onChange={e => setLogFilterStatus(e.target.value)}
                className="px-3 py-1.5 rounded-lg text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300"
              >
                <option value="todos">Todos los estados</option>
                <option value="entregado">Entregado (Dos ganchos)</option>
                <option value="leido">Leído (Ganchos azules)</option>
                <option value="enviado">Enviado</option>
                <option value="fallido">Fallido</option>
              </select>
            </div>

            <div className="relative w-full sm:w-72">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Buscar por alumno, teléfono o texto..."
                value={logSearch}
                onChange={e => setLogSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 rounded-lg text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>

          {/* Tabla de Logs */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 font-semibold border-b border-slate-200 dark:border-slate-800">
                  <tr>
                    <th className="py-3 px-4">Fecha y Hora</th>
                    <th className="py-3 px-4">Destinatario</th>
                    <th className="py-3 px-4">Teléfono</th>
                    <th className="py-3 px-4">Evento / Disparador</th>
                    <th className="py-3 px-4">Contenido del Mensaje</th>
                    <th className="py-3 px-4 text-center">Estado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                  {filteredLogs.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-slate-500 dark:text-slate-400">
                        No se encontraron registros de mensajes con los filtros seleccionados.
                      </td>
                    </tr>
                  ) : (
                    filteredLogs.map(log => (
                      <tr key={log.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                        <td className="py-3 px-4 text-slate-500 dark:text-slate-400 whitespace-nowrap font-mono">
                          {new Date(log.fecha).toLocaleString()}
                        </td>
                        <td className="py-3 px-4 font-semibold text-slate-900 dark:text-white">
                          {log.destinatario_nombre}
                          {log.es_prueba && (
                            <span className="ml-1.5 px-1.5 py-0.2 rounded bg-purple-100 text-purple-700 dark:bg-purple-900/50 dark:text-purple-300 text-[10px]">
                              Prueba
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4 font-mono text-slate-600 dark:text-slate-300">
                          {log.destinatario_telefono}
                        </td>
                        <td className="py-3 px-4">
                          <span className="px-2 py-0.5 rounded-md text-[11px] font-medium bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                            {log.evento_disparador}
                          </span>
                        </td>
                        <td className="py-3 px-4 max-w-xs truncate text-slate-600 dark:text-slate-400" title={log.mensaje}>
                          {log.mensaje}
                        </td>
                        <td className="py-3 px-4 text-center whitespace-nowrap">
                          {log.estado_entrega === 'leido' ? (
                            <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-sky-100 text-sky-800 dark:bg-sky-950/60 dark:text-sky-300">
                              <Check className="w-3 h-3 text-sky-600" />
                              <Check className="w-3 h-3 text-sky-600 -ml-2" />
                              <span>Leído</span>
                            </span>
                          ) : log.estado_entrega === 'entregado' ? (
                            <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
                              <Check className="w-3 h-3 text-emerald-600" />
                              <Check className="w-3 h-3 text-emerald-600 -ml-2" />
                              <span>Entregado</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                              <Check className="w-3 h-3 text-slate-500" />
                              <span>Enviado</span>
                            </span>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 4: SIMULADOR OPERACIONAL */}
      {/* ========================================================================= */}
      {activeTab === 'simulator' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Panel de Ejecución Inmediata */}
          <div className="lg:col-span-2 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm space-y-6">
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center space-x-2">
                <Sparkles className="w-5 h-5 text-emerald-600" />
                <span>Simulador de Disparos en Vivo</span>
              </h2>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                Alumnos en la Base de Datos con Documentos en Seguimiento ({students.length})
              </h3>
              <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                {students.map(std => {
                  const now = new Date();
                  const medDate = std.vencimiento_medico ? new Date(std.vencimiento_medico) : null;
                  const diffDays = medDate ? Math.ceil((medDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)) : null;

                  return (
                    <div
                      key={std.id}
                      className="p-3 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs"
                    >
                      <div>
                        <div className="font-bold text-slate-900 dark:text-slate-100">{std.nombre}</div>
                        <div className="text-slate-500 dark:text-slate-400">
                          Tel: {std.telefono || '+507 6000-0000'} • Médico: {std.vencimiento_medico || 'No registrado'}
                        </div>
                      </div>

                      <div className="flex items-center space-x-2">
                        {diffDays !== null && (
                          <span
                            className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                              diffDays <= 0
                                ? 'bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300'
                                : diffDays <= 7
                                ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                                : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                            }`}
                          >
                            {diffDays <= 0 ? 'Vencido' : `${diffDays} días`}
                          </span>
                        )}

                        <button
                          onClick={() => {
                            setTestRecipientName(std.nombre);
                            setTestRecipientPhone(std.telefono || '+507 6890-1234');
                            handleOpenQuickTest(triggers.find(t => t.categoria === 'documentos'));
                          }}
                          className="px-2.5 py-1 rounded bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-semibold dark:bg-emerald-950 dark:text-emerald-300"
                        >
                          Probar Alerta
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="pt-2">
              <button
                onClick={handleExecuteTriggersNow}
                disabled={executing}
                className="w-full py-3.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-bold text-sm shadow-md transition-all flex items-center justify-center space-x-2 disabled:opacity-50"
              >
                {executing ? <RefreshCw className="w-5 h-5 animate-spin" /> : <Play className="w-5 h-5 fill-white" />}
                <span>Ejecutar Motor de Disparadores y Notificar Vía WhatsApp</span>
              </button>
            </div>
          </div>

          {/* Tarjeta de Resumen del Motor */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm space-y-4">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center space-x-2">
              <Clock className="w-4 h-4 text-emerald-600" />
              <span>Cron Jobs & Reglas de Disparo</span>
            </h3>
            <div className="space-y-3 text-xs text-slate-600 dark:text-slate-400">
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                <div className="font-bold text-slate-900 dark:text-white mb-1">⏰ Escaneo Diario de Vigencias (08:30 AM)</div>
                <div>Revisa toda la base de datos de estudiantes y tripulaciones buscando médicos y licencias que venzan en 30, 15, 7 o 0 días.</div>
              </div>
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                <div className="font-bold text-slate-900 dark:text-white mb-1">✈️ Eventos de Itinerario en Tiempo Real</div>
                <div>Se disparan inmediatamente cuando un despachador o administrador crea, reasigna aeronave, cambia instructor o cancela un vuelo.</div>
              </div>
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                <div className="font-bold text-slate-900 dark:text-white mb-1">🛑 Hard Lock de Operaciones</div>
                <div>Si el médico vence hoy (0 días), notifica al estudiante y bloquea automáticamente la programación de turnos en el sistema.</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: EDITAR DISPARADOR & VISTA PREVIA WHATSAPP EN VIVO */}
      {/* ========================================================================= */}
      {editingTrigger && tempTrigger && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 max-w-4xl w-full p-6 shadow-2xl space-y-6 my-8">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                  Editor de Disparador
                </span>
                <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                  {tempTrigger.nombre}
                </h2>
              </div>
              <button
                onClick={() => {
                  setEditingTrigger(null);
                  setTempTrigger(null);
                }}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-lg font-bold"
              >
                ✕
              </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Formulario de Configuración del Disparador */}
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Nombre del Disparador
                  </label>
                  <input
                    type="text"
                    value={tempTrigger.nombre}
                    onChange={e => setTempTrigger({ ...tempTrigger, nombre: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  {tempTrigger.dias_antelacion !== undefined && (
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        Días de Antelación
                      </label>
                      <input
                        type="number"
                        min="0"
                        max="90"
                        value={tempTrigger.dias_antelacion}
                        onChange={e =>
                          setTempTrigger({ ...tempTrigger, dias_antelacion: Number(e.target.value) })
                        }
                        className="w-full px-3 py-2 rounded-xl text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      />
                    </div>
                  )}

                  {tempTrigger.hora_ejecucion_programada && (
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        Hora de Ejecución Diaria
                      </label>
                      <input
                        type="time"
                        value={tempTrigger.hora_ejecucion_programada}
                        onChange={e =>
                          setTempTrigger({ ...tempTrigger, hora_ejecucion_programada: e.target.value })
                        }
                        className="w-full px-3 py-2 rounded-xl text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      />
                    </div>
                  )}
                </div>

                {/* Destinatarios */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    Roles Destinatarios
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {(['estudiante', 'instructor', 'despacho', 'admin'] as const).map(role => {
                      const isChecked = tempTrigger.destinatarios.includes(role);
                      return (
                        <button
                          key={role}
                          type="button"
                          onClick={() => {
                            const next = isChecked
                              ? tempTrigger.destinatarios.filter(r => r !== role)
                              : [...tempTrigger.destinatarios, role];
                            setTempTrigger({ ...tempTrigger, destinatarios: next });
                          }}
                          className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition-colors ${
                            isChecked
                              ? 'bg-emerald-600 text-white'
                              : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                          }`}
                        >
                          {role}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Variables Disponibles */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    Variables Rápidas (Haz clic para insertar en la plantilla)
                  </label>
                  <div className="flex flex-wrap gap-1.5">
                    {(tempTrigger.variables_disponibles || []).map(v => (
                      <button
                        key={v}
                        type="button"
                        onClick={() => handleInsertVariable(v)}
                        className="px-2 py-1 rounded bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-[11px] font-mono transition-colors"
                      >
                        {v}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Área de Texto de la Plantilla */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Plantilla del Mensaje
                  </label>
                  <textarea
                    rows={6}
                    value={tempTrigger.plantilla_mensaje}
                    onChange={e => setTempTrigger({ ...tempTrigger, plantilla_mensaje: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              {/* VISTA PREVIA WHATSAPP (SIMULADOR DE BURBUJA DE CHAT) */}
              <div className="space-y-2">
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Vista Previa en Dispositivo Móvil
                </label>
                <div className="rounded-2xl bg-[#EFEAE2] dark:bg-[#0B141A] border border-slate-300 dark:border-slate-800 p-4 min-h-[360px] flex flex-col justify-end relative shadow-inner">
                  {/* Encabezado Simulado de WhatsApp */}
                  <div className="absolute top-0 left-0 right-0 p-3 bg-[#075E54] dark:bg-[#1F2C34] text-white rounded-t-2xl flex items-center space-x-3 shadow-xs">
                    <div className="w-8 h-8 rounded-full bg-emerald-400 flex items-center justify-center text-slate-900 font-bold text-xs">
                      SO
                    </div>
                    <div>
                      <div className="text-xs font-bold leading-tight">SkyOps Flight Academy</div>
                      <div className="text-[10px] text-emerald-200">Cuenta Comercial Oficial</div>
                    </div>
                  </div>

                  {/* Burbuja del Mensaje Recibido */}
                  <div className="bg-white dark:bg-[#1F2C34] text-slate-900 dark:text-slate-100 rounded-2xl rounded-tl-xs p-3.5 text-xs shadow-md max-w-[90%] space-y-2 my-2 font-sans">
                    <div className="whitespace-pre-wrap leading-relaxed">
                      {tempTrigger.plantilla_mensaje
                        .replace(/\{\{nombre_alumno\}\}/g, 'Carlos Mendoza')
                        .replace(/\{\{tipo_documento\}\}/g, 'Certificado Médico Aeronáutico')
                        .replace(/\{\{fecha_vencimiento\}\}/g, '2026-09-15')
                        .replace(/\{\{dias_restantes\}\}/g, String(tempTrigger.dias_antelacion || 15))
                        .replace(/\{\{numero_medico\}\}/g, 'MED-9912')
                        .replace(/\{\{telefono_escuela\}\}/g, '+507 6890-4411')
                        .replace(/\{\{clase_medico\}\}/g, 'Clase 1')
                        .replace(/\{\{matricula\}\}/g, 'HP-1450')
                        .replace(/\{\{modelo_aeronave\}\}/g, 'Cessna 172SP')
                        .replace(/\{\{fecha_vuelo\}\}/g, '2026-08-26')
                        .replace(/\{\{hora_inicio\}\}/g, '08:00')
                        .replace(/\{\{hora_fin\}\}/g, '10:00')
                        .replace(/\{\{instructor\}\}/g, 'Cap. Roberto Morales')
                        .replace(/\{\{tipo_mision\}\}/g, 'Navegación MPDA')
                        .replace(/\{\{motivo_cambio\}\}/g, 'Ajuste de slot operacional')
                        .replace(/\{\{motivo_cancelacion\}\}/g, 'METAR MPPA: No-Go por tormenta')}
                    </div>
                    <div className="text-[10px] text-slate-400 text-right flex items-center justify-end space-x-1">
                      <span>14:32</span>
                      <Check className="w-3 h-3 text-sky-500" />
                      <Check className="w-3 h-3 text-sky-500 -ml-2" />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end space-x-3 pt-4 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => {
                  setEditingTrigger(null);
                  setTempTrigger(null);
                }}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleSaveTrigger}
                disabled={saving}
                className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-sm transition-colors flex items-center space-x-1.5"
              >
                {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                <span>Guardar Cambios</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: ENVÍO DE MENSAJE DE PRUEBA */}
      {/* ========================================================================= */}
      {testModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 max-w-lg w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center space-x-2">
                <Send className="w-4 h-4 text-emerald-600" />
                <span>Enviar Notificación de Prueba</span>
              </h3>
              <button onClick={() => setTestModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                ✕
              </button>
            </div>

            {testSuccessMessage ? (
              <div className="p-4 rounded-xl bg-emerald-50 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 text-center font-medium text-xs">
                {testSuccessMessage}
              </div>
            ) : (
              <div className="space-y-3 text-xs">
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Nombre del Destinatario
                  </label>
                  <input
                    type="text"
                    value={testRecipientName}
                    onChange={e => setTestRecipientName(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Número de WhatsApp (con prefijo de país)
                  </label>
                  <input
                    type="text"
                    value={testRecipientPhone}
                    onChange={e => setTestRecipientPhone(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    placeholder="+507 6890-1234"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Texto del Mensaje
                  </label>
                  <textarea
                    rows={4}
                    value={testMessageBody}
                    onChange={e => setTestMessageBody(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div className="flex items-center justify-end space-x-2 pt-2">
                  <button
                    onClick={() => setTestModalOpen(false)}
                    className="px-4 py-2 rounded-xl font-semibold text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleSendTestMessage}
                    disabled={testSending}
                    className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold transition-colors flex items-center space-x-1.5"
                  >
                    {testSending ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                    <span>Enviar Prueba</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: RESULTADO DE EJECUCIÓN DEL MOTOR DE DISPARADORES */}
      {/* ========================================================================= */}
      {executionResult && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 max-w-lg w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center space-x-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Ejecución de Disparadores Completada
                </h3>
              </div>
              <button onClick={() => setExecutionResult(null)} className="text-slate-400 hover:text-slate-600">
                ✕
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3 text-center">
              <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800">
                <div className="text-2xl font-extrabold text-amber-700 dark:text-amber-300">
                  {executionResult.resumen.documentos_alertados}
                </div>
                <div className="text-xs font-semibold text-amber-800 dark:text-amber-400">
                  Alertas de Documentos y Vigencias
                </div>
              </div>

              <div className="p-3 rounded-xl bg-sky-50 dark:bg-sky-950/40 border border-sky-200 dark:border-sky-800">
                <div className="text-2xl font-extrabold text-sky-700 dark:text-sky-300">
                  {executionResult.resumen.itinerarios_notificados}
                </div>
                <div className="text-xs font-semibold text-sky-800 dark:text-sky-400">
                  Avisos de Itinerario
                </div>
              </div>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-400">
              Se han enviado y registrado exitosamente <strong>{executionResult.ejecutados}</strong> notificaciones en los registros de entrega.
            </p>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => {
                  setExecutionResult(null);
                  setActiveTab('logs');
                }}
                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-sm transition-colors"
              >
                Ver en Historial de Mensajes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: CÓDIGO QR DE VINCULACIÓN */}
      {/* ========================================================================= */}
      {qrModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 max-w-sm w-full p-6 shadow-2xl space-y-4 text-center">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Vincular Dispositivo WhatsApp
              </h3>
              <button onClick={() => setQrModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                ✕
              </button>
            </div>

            <div className="p-4 bg-white rounded-2xl border border-slate-200 inline-block shadow-inner">
              {/* QR Simulado con Canvas/SVG */}
              <div className="w-48 h-48 bg-slate-900 rounded-xl p-3 flex flex-col items-center justify-center relative overflow-hidden">
                <div className="grid grid-cols-6 gap-1 w-full h-full p-2 bg-white rounded-lg">
                  {Array.from({ length: 36 }).map((_, i) => (
                    <div
                      key={i}
                      className={`rounded-xs ${
                        i % 2 === 0 || i % 5 === 0 ? 'bg-slate-900' : 'bg-transparent'
                      }`}
                    />
                  ))}
                </div>
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-10 h-10 rounded-full bg-emerald-500 border-2 border-white flex items-center justify-center text-white font-bold shadow-md">
                    <MessageSquare className="w-5 h-5" />
                  </div>
                </div>
              </div>
            </div>

            <button
              onClick={() => {
                setQrModalOpen(false);
                setNotificationBanner({
                  type: 'success',
                  message: 'Dispositivo vinculado exitosamente a SkyOps Flight Academy.'
                });
              }}
              className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs"
            >
              Confirmar Vinculación
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
