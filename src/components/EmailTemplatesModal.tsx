import React, { useState, useEffect } from 'react';
import {
  Mail,
  Palette,
  Image,
  Code,
  Eye,
  RotateCcw,
  Save,
  Check,
  X,
  Sparkles,
  Smartphone,
  Monitor,
  Copy,
  Info,
  Layers,
  Upload,
  AlertCircle,
  HelpCircle,
  RefreshCw,
  Send
} from 'lucide-react';
import { EmailBrandConfig, EmailTemplateItem, EmailTemplateKey } from '../types';
import { api } from '../services/api';

interface EmailTemplatesModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved?: () => void;
}

const TEMPLATE_METADATA: Record<EmailTemplateKey, { name: string; icon: string; description: string; category: string }> = {
  flight_scheduled: {
    name: 'Asignación de Vuelo Inicial',
    icon: '✈️',
    description: 'Enviado al estudiante e instructor con SLA de confirmación de 3 horas y detalles de aeronave/misión.',
    category: 'Itinerario'
  },
  flight_confirmed: {
    name: 'Confirmación de Vuelo',
    icon: '✅',
    description: 'Enviado a estudiante, instructor y despacho al ser confirmada la lección dentro del SLA.',
    category: 'Itinerario'
  },
  flight_cancelled: {
    name: 'Cancelación de Vuelo',
    icon: '⚠️',
    description: 'Enviado a estudiante e instructor cuando el vuelo es cancelado con motivo justificado.',
    category: 'Itinerario'
  },
  flight_reminder: {
    name: 'Recordatorio de Confirmación (SLA)',
    icon: '⏰',
    description: 'Enviado periódicamente mientras el plazo de 3 horas para confirmar esté activo.',
    category: 'Itinerario'
  },
  flight_no_show: {
    name: 'Inasistencia (No Show)',
    icon: '⛔',
    description: 'Notificación disciplinaria al estudiante por inasistencia no justificada a sesión de vuelo.',
    category: 'Disciplinario'
  },
  payment_received: {
    name: 'Comprobante de Pago Recibido',
    icon: '💳',
    description: 'Notificación a Contabilidad, Alumno y Admin al reportar un nuevo abono o transferencia ACH.',
    category: 'Finanzas'
  },
  payment_approved: {
    name: 'Acreditación Oficial de Pago',
    icon: '💰',
    description: 'Enviado tras la conciliación bancaria con desglose del saldo actualizado acreditado al estudiante.',
    category: 'Finanzas'
  },
  payment_rejected: {
    name: 'Rechazo de Comprobante ACH',
    icon: '❌',
    description: 'Alerta formal de discrepancia bancaria enviada al estudiante indicando la causal de rechazo.',
    category: 'Finanzas'
  },
  low_balance_alert: {
    name: 'Alerta de Saldo Insuficiente',
    icon: '⚠️',
    description: 'Aviso preventivo cuando el balance financiero del alumno no cubre futuras lecciones de vuelo.',
    category: 'Alertas'
  },
  medical_expiration_alert: {
    name: 'Vencimiento de Certificado Médico AAC',
    icon: '🩺',
    description: 'Alerta regulatoria RAC 67 por proximidad de expiración de certificado médico aeronáutico.',
    category: 'Regulatorio'
  },
  license_expiration_alert: {
    name: 'Vencimiento de Licencia de Vuelo',
    icon: '🪪',
    description: 'Alerta regulatoria RAC 61 por vigencia de licencias de pilotos alumnos o instructores.',
    category: 'Regulatorio'
  },
  maintenance_alert: {
    name: 'Inspección Técnica de Aeronave',
    icon: '🛠️',
    description: 'Alerta técnica para mantenimiento preventivo, cambio de aceite o inspección de 50/100 horas.',
    category: 'Mantenimiento'
  },
  direct_message: {
    name: 'Mensaje Directo / Notificación General',
    icon: '💬',
    description: 'Plantilla base para comunicados manuales y avisos directos de operaciones.',
    category: 'General'
  }
};

const AVAILABLE_PLACEHOLDERS: Array<{ tag: string; label: string; desc: string }> = [
  { tag: '{{brand_name}}', label: 'Nombre Escuela', desc: 'Nombre de la academia aeronáutica' },
  { tag: '{{brand_tagline}}', label: 'Lema Escuela', desc: 'Lema o subtítulo oficial' },
  { tag: '{{brand_logo_url}}', label: 'URL Logo', desc: 'URL del logo institucional' },
  { tag: '{{primary_color}}', label: 'Color Primario', desc: 'Color primario de la marca' },
  { tag: '{{secondary_color}}', label: 'Color Secundario', desc: 'Color secundario de acento' },
  { tag: '{{accent_color}}', label: 'Color Acento', desc: 'Color cian/acento de brillo' },
  { tag: '{{header_gradient_start}}', label: 'Gradiente Inicio', desc: 'Color inicial del banner superior' },
  { tag: '{{header_gradient_end}}', label: 'Gradiente Fin', desc: 'Color final del banner superior' },
  { tag: '{{student_name}}', label: 'Nombre Alumno', desc: 'Ej: Alex Montoya' },
  { tag: '{{instructor_name}}', label: 'Nombre Instructor', desc: 'Ej: Cap. Gabriel Ramos' },
  { tag: '{{instructor_phone}}', label: 'Tel. Instructor', desc: 'Ej: +507 6890-1234' },
  { tag: '{{airplane_reg}}', label: 'Matrícula Avión', desc: 'Ej: HP-1842XP' },
  { tag: '{{airplane_model}}', label: 'Modelo Avión', desc: 'Ej: Cessna 172SP Skyhawk G1000' },
  { tag: '{{flight_date}}', label: 'Fecha Vuelo', desc: 'Ej: 2025-05-18' },
  { tag: '{{start_time}}', label: 'Hora Inicio', desc: 'Ej: 08:00' },
  { tag: '{{end_time}}', label: 'Hora Fin', desc: 'Ej: 10:00' },
  { tag: '{{mission}}', label: 'Misión / Maniobra', desc: 'Ej: Navegación VFR y Maniobras de Precisión' },
  { tag: '{{deadline_hour}}', label: 'Límite SLA', desc: 'Ej: 11:00 AM (3 horas de tolerancia)' },
  { tag: '{{cancellation_reason}}', label: 'Motivo Cancelación', desc: 'Razón de cancelación reportada' },
  { tag: '{{contact_email}}', label: 'Email Soporte', desc: 'Correo de contacto institucional' },
  { tag: '{{contact_phone}}', label: 'Tel. Soporte', desc: 'Teléfono de contacto institucional' },
  { tag: '{{support_url}}', label: 'URL Portal', desc: 'Enlace al sistema oficial' },
  { tag: '{{footer_text}}', label: 'Texto Pie Legal', desc: 'Nota legal y de confidencialidad' }
];

export const EmailTemplatesModal: React.FC<EmailTemplatesModalProps> = ({
  isOpen,
  onClose,
  onSaved
}) => {
  const [activeTab, setActiveTab] = useState<'brand' | 'templates'>('brand');
  const [selectedTemplateKey, setSelectedTemplateKey] = useState<EmailTemplateKey>('flight_scheduled');
  
  // State for Brand Config
  const [brandConfig, setBrandConfig] = useState<EmailBrandConfig | null>(null);
  
  // State for Templates list
  const [templates, setTemplates] = useState<Record<EmailTemplateKey, EmailTemplateItem>>({} as any);
  
  // Current active template editing state
  const [currentSubject, setCurrentSubject] = useState<string>('');
  const [currentHtml, setCurrentHtml] = useState<string>('');
  
  // Preview State
  const [previewMode, setPreviewMode] = useState<'desktop' | 'mobile'>('desktop');
  const [previewHtml, setPreviewHtml] = useState<string>('');
  const [previewSubject, setPreviewSubject] = useState<string>('');
  const [previewLoading, setPreviewLoading] = useState<boolean>(false);
  const [splitView, setSplitView] = useState<'split' | 'code_only' | 'preview_only'>('split');
  
  // Status feedback
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [copiedTag, setCopiedTag] = useState<string | null>(null);

  // Load initial data
  const loadData = async () => {
    setLoading(true);
    try {
      const [brandRes, templatesRes] = await Promise.all([
        api.getEmailBrandConfig(),
        api.getEmailTemplates()
      ]);

      if (brandRes.brandConfig) {
        setBrandConfig(brandRes.brandConfig);
      }

      if (templatesRes.templates) {
        const map: Record<EmailTemplateKey, EmailTemplateItem> = {} as any;
        templatesRes.templates.forEach(t => {
          map[t.id] = t;
        });
        setTemplates(map);

        const initialTpl = map[selectedTemplateKey] || templatesRes.templates[0];
        if (initialTpl) {
          setSelectedTemplateKey(initialTpl.id);
          setCurrentSubject(initialTpl.subjectTemplate);
          setCurrentHtml(initialTpl.htmlTemplate);
        }
      }
    } catch (err: any) {
      console.error('Error loading email branding and templates:', err);
      setStatusMsg({ type: 'error', text: 'Error al cargar configuraciones: ' + err.message });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadData();
    }
  }, [isOpen]);

  // When switching selected template
  const handleSelectTemplate = (key: EmailTemplateKey) => {
    setSelectedTemplateKey(key);
    const tpl = templates[key];
    if (tpl) {
      setCurrentSubject(tpl.subjectTemplate);
      setCurrentHtml(tpl.htmlTemplate);
    }
  };

  // Live preview update with debounce
  useEffect(() => {
    if (!isOpen) return;

    const timer = setTimeout(async () => {
      setPreviewLoading(true);
      try {
        const res = await api.previewEmailRender({
          key: selectedTemplateKey,
          customHtml: currentHtml,
          customSubject: currentSubject,
          customBrand: brandConfig || undefined
        });
        if (res.success && res.rendered) {
          setPreviewHtml(res.rendered.html);
          setPreviewSubject(res.rendered.subject);
        }
      } catch (err) {
        console.error('Error rendering preview:', err);
      } finally {
        setPreviewLoading(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [selectedTemplateKey, currentHtml, currentSubject, brandConfig, isOpen]);

  // Handle saving brand config
  const handleSaveBrand = async () => {
    if (!brandConfig) return;
    setSaving(true);
    setStatusMsg(null);
    try {
      const res = await api.updateEmailBrandConfig(brandConfig);
      if (res.success) {
        setStatusMsg({ type: 'success', text: '¡Identidad de marca y colores guardados exitosamente!' });
        setTimeout(() => setStatusMsg(null), 3500);
        if (onSaved) onSaved();
      }
    } catch (err: any) {
      setStatusMsg({ type: 'error', text: 'Error al guardar marca: ' + err.message });
    } finally {
      setSaving(false);
    }
  };

  // Handle resetting brand config
  const handleResetBrand = async () => {
    if (!window.confirm('¿Deseas restablecer la identidad de marca a los colores y logo originales por defecto?')) return;
    setSaving(true);
    setStatusMsg(null);
    try {
      const res = await api.resetEmailBrandConfig();
      if (res.success) {
        setBrandConfig(res.brandConfig);
        setStatusMsg({ type: 'success', text: 'Identidad de marca restablecida a los valores predeterminados.' });
        setTimeout(() => setStatusMsg(null), 3500);
        if (onSaved) onSaved();
      }
    } catch (err: any) {
      setStatusMsg({ type: 'error', text: 'Error al restablecer: ' + err.message });
    } finally {
      setSaving(false);
    }
  };

  // Handle saving the current template
  const handleSaveTemplate = async () => {
    setSaving(true);
    setStatusMsg(null);
    try {
      const res = await api.updateEmailTemplate(selectedTemplateKey, {
        subjectTemplate: currentSubject,
        htmlTemplate: currentHtml
      });

      if (res.success) {
        setTemplates(prev => ({
          ...prev,
          [selectedTemplateKey]: res.template
        }));
        setStatusMsg({ type: 'success', text: `¡Plantilla "${res.template.name}" guardada exitosamente!` });
        setTimeout(() => setStatusMsg(null), 3500);
        if (onSaved) onSaved();
      }
    } catch (err: any) {
      setStatusMsg({ type: 'error', text: 'Error al guardar plantilla: ' + err.message });
    } finally {
      setSaving(false);
    }
  };

  // Handle resetting current template
  const handleResetTemplate = async () => {
    if (!window.confirm(`¿Deseas restablecer la plantilla "${TEMPLATE_METADATA[selectedTemplateKey]?.name}" al código HTML original de fábrica?`)) return;
    setSaving(true);
    setStatusMsg(null);
    try {
      const res = await api.resetEmailTemplate(selectedTemplateKey);
      if (res.success) {
        setTemplates(prev => ({
          ...prev,
          [selectedTemplateKey]: res.template
        }));
        setCurrentSubject(res.template.subjectTemplate);
        setCurrentHtml(res.template.htmlTemplate);
        setStatusMsg({ type: 'success', text: 'Plantilla restablecida a su versión de fábrica.' });
        setTimeout(() => setStatusMsg(null), 3500);
        if (onSaved) onSaved();
      }
    } catch (err: any) {
      setStatusMsg({ type: 'error', text: 'Error al restablecer: ' + err.message });
    } finally {
      setSaving(false);
    }
  };

  // Insert placeholder at cursor or end
  const handleInsertPlaceholder = (tag: string) => {
    setCurrentHtml(prev => prev + ' ' + tag + ' ');
    setCopiedTag(tag);
    navigator.clipboard?.writeText(tag);
    setTimeout(() => setCopiedTag(null), 2000);
  };

  // Logo file upload helper
  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('Por favor selecciona un archivo de imagen válido (PNG, JPG, SVG, WebP).');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const base64 = event.target?.result as string;
      if (base64 && brandConfig) {
        setBrandConfig({
          ...brandConfig,
          logoUrl: base64
        });
      }
    };
    reader.readAsDataURL(file);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 md:p-6 bg-slate-950/80 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl w-full max-w-7xl h-[92vh] border border-slate-200 shadow-2xl overflow-hidden flex flex-col">
        
        {/* MODAL HEADER */}
        <div className="px-6 py-3.5 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-sky-500/20 text-sky-400 rounded-xl border border-sky-500/30">
              <Mail className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-100">
                Personalizador de Plantillas de Correo e Identidad de Marca
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Top Navigation Tabs */}
            <div className="flex bg-slate-800 p-1 rounded-xl border border-slate-700">
              <button
                type="button"
                onClick={() => setActiveTab('brand')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  activeTab === 'brand'
                    ? 'bg-sky-600 text-white shadow-sm'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                <Palette className="w-3.5 h-3.5" />
                <span>Identidad y Colores</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('templates')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  activeTab === 'templates'
                    ? 'bg-sky-600 text-white shadow-sm'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                <Code className="w-3.5 h-3.5" />
                <span>Plantillas HTML ({Object.keys(templates).length || 6})</span>
              </button>
            </div>

            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
              title="Cerrar modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* FEEDBACK BANNER */}
        {statusMsg && (
          <div className={`px-6 py-2 text-xs font-semibold flex items-center justify-between transition-all shrink-0 ${
            statusMsg.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border-b border-emerald-200'
              : 'bg-rose-50 text-rose-800 border-b border-rose-200'
          }`}>
            <div className="flex items-center gap-2">
              {statusMsg.type === 'success' ? <Check className="w-4 h-4 text-emerald-600" /> : <AlertCircle className="w-4 h-4 text-rose-600" />}
              <span>{statusMsg.text}</span>
            </div>
            <button onClick={() => setStatusMsg(null)} className="text-slate-400 hover:text-slate-600 font-bold">×</button>
          </div>
        )}

        {/* MODAL BODY */}
        <div className="flex-1 overflow-hidden flex flex-col bg-slate-50">
          {loading ? (
            <div className="flex-1 flex items-center justify-center text-slate-400 text-sm">
              <div className="flex flex-col items-center gap-2">
                <div className="w-7 h-7 border-2 border-sky-500 border-t-transparent rounded-full animate-spin"></div>
                <span>Cargando configuraciones y plantillas...</span>
              </div>
            </div>
          ) : activeTab === 'brand' ? (
            /* TAB 1: IDENTIDAD DE MARCA Y COLORES */
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              <div className="max-w-5xl mx-auto space-y-6">
                
                {/* Visual Header Banner */}
                <div className="p-4 bg-gradient-to-r from-sky-900 to-slate-900 text-white rounded-2xl border border-sky-800/40 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                  <div>
                    <h3 className="font-bold text-sm text-sky-100 flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-sky-400" />
                      Paleta de Marca Global para Correos Automáticos
                    </h3>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleResetBrand}
                      disabled={saving}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-xl border border-slate-700 transition-colors cursor-pointer"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>Restablecer por Defecto</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleSaveBrand}
                      disabled={saving}
                      className="flex items-center gap-1.5 px-4 py-1.5 bg-sky-500 hover:bg-sky-600 text-white text-xs font-bold rounded-xl shadow-sm transition-all cursor-pointer"
                    >
                      <Save className="w-3.5 h-3.5" />
                      <span>{saving ? 'Guardando...' : 'Guardar Identidad'}</span>
                    </button>
                  </div>
                </div>

                {brandConfig && (
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                    {/* Left Column: Logo & General Info (5 cols) */}
                    <div className="lg:col-span-5 space-y-6">
                      
                      {/* Card: Logo de la Marca */}
                      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
                        <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
                          <Image className="w-4 h-4 text-sky-600" />
                          <h4 className="font-bold text-xs text-slate-800 uppercase tracking-wider">Logo de la Escuela</h4>
                        </div>

                        {/* Logo Preview Box */}
                        <div className="p-4 bg-slate-900 rounded-xl flex flex-col items-center justify-center border border-slate-800 min-h-[120px]">
                          {brandConfig.logoUrl ? (
                            <img
                              src={brandConfig.logoUrl}
                              alt={brandConfig.brandName}
                              style={{ maxHeight: '80px', maxWidth: '200px', objectFit: 'contain' }}
                              className="transition-all"
                            />
                          ) : (
                            <span className="text-xs text-slate-500 italic">Sin logo cargado</span>
                          )}
                          <span className="text-[10px] text-slate-400 mt-2 font-mono">
                            Vista previa sobre fondo oscuro del header
                          </span>
                        </div>

                        {/* Upload Button + URL input */}
                        <div className="space-y-3">
                          <div>
                            <label className="block text-[11px] font-bold text-slate-700 mb-1">
                              Subir Archivo de Logo (PNG, JPG, SVG)
                            </label>
                            <label className="flex items-center justify-center gap-2 px-3 py-2 bg-slate-50 hover:bg-slate-100 border border-dashed border-slate-300 rounded-xl cursor-pointer text-xs font-semibold text-slate-700 transition-colors">
                              <Upload className="w-4 h-4 text-sky-600" />
                              <span>Examinar imagen local...</span>
                              <input
                                type="file"
                                accept="image/*"
                                onChange={handleLogoUpload}
                                className="hidden"
                              />
                            </label>
                          </div>

                          <div>
                            <label className="block text-[11px] font-bold text-slate-700 mb-1">
                              O ingresar URL pública de la imagen
                            </label>
                            <input
                              type="text"
                              placeholder="https://ejemplo.com/logo.png"
                              value={brandConfig.logoUrl || ''}
                              onChange={(e) => setBrandConfig({ ...brandConfig, logoUrl: e.target.value })}
                              className="w-full px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg font-mono focus:outline-none focus:ring-1 focus:ring-sky-500"
                            />
                          </div>
                        </div>
                      </div>

                      {/* Card: Información General de la Escuela */}
                      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-3">
                        <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
                          <Info className="w-4 h-4 text-sky-600" />
                          <h4 className="font-bold text-xs text-slate-800 uppercase tracking-wider">Datos de la Escuela</h4>
                        </div>

                        <div>
                          <label className="block text-[11px] font-bold text-slate-700 mb-1">Nombre Comercial de la Academia</label>
                          <input
                            type="text"
                            value={brandConfig.brandName}
                            onChange={(e) => setBrandConfig({ ...brandConfig, brandName: e.target.value })}
                            className="w-full px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg font-semibold focus:outline-none focus:ring-1 focus:ring-sky-500"
                          />
                        </div>

                        <div>
                          <label className="block text-[11px] font-bold text-slate-700 mb-1">Lema o Subtítulo Institucional</label>
                          <input
                            type="text"
                            value={brandConfig.brandTagline || ''}
                            onChange={(e) => setBrandConfig({ ...brandConfig, brandTagline: e.target.value })}
                            className="w-full px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none"
                          />
                        </div>

                        <div className="grid grid-cols-2 gap-2 pt-1">
                          <div>
                            <label className="block text-[10px] font-semibold text-slate-600 mb-1">Correo de Contacto</label>
                            <input
                              type="email"
                              value={brandConfig.contactEmail || ''}
                              onChange={(e) => setBrandConfig({ ...brandConfig, contactEmail: e.target.value })}
                              className="w-full px-2.5 py-1 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none"
                            />
                          </div>
                          <div>
                            <label className="block text-[10px] font-semibold text-slate-600 mb-1">Teléfono de Contacto</label>
                            <input
                              type="text"
                              value={brandConfig.contactPhone || ''}
                              onChange={(e) => setBrandConfig({ ...brandConfig, contactPhone: e.target.value })}
                              className="w-full px-2.5 py-1 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none"
                            />
                          </div>
                        </div>

                        <div>
                          <label className="block text-[10px] font-semibold text-slate-600 mb-1">Sitio Web / Portal Oficial</label>
                          <input
                            type="text"
                            value={brandConfig.supportUrl || ''}
                            onChange={(e) => setBrandConfig({ ...brandConfig, supportUrl: e.target.value })}
                            className="w-full px-3 py-1 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none"
                          />
                        </div>

                        <div>
                          <label className="block text-[10px] font-semibold text-slate-600 mb-1">Texto de Pie de Página (Footer Legal)</label>
                          <textarea
                            rows={2}
                            value={brandConfig.footerText || ''}
                            onChange={(e) => setBrandConfig({ ...brandConfig, footerText: e.target.value })}
                            className="w-full px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none resize-none"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Right Column: Color Scheme (7 cols) */}
                    <div className="lg:col-span-7 space-y-6">
                      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
                        <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                          <div className="flex items-center gap-2">
                            <Palette className="w-4 h-4 text-sky-600" />
                            <h4 className="font-bold text-xs text-slate-800 uppercase tracking-wider">Esquema de Colores (HEX)</h4>
                          </div>
                          <span className="text-[10px] text-slate-500 font-medium">
                            Haz clic en la muestra de color para abrir el selector
                          </span>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          {/* Primary Color */}
                          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                            <div className="flex items-center justify-between">
                              <label className="text-xs font-bold text-slate-800">Color Primario</label>
                              <span className="text-[10px] text-slate-500">Cabecera, botones, títulos</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <input
                                type="color"
                                value={brandConfig.primaryColor}
                                onChange={(e) => setBrandConfig({ ...brandConfig, primaryColor: e.target.value })}
                                className="w-10 h-10 rounded-lg border border-slate-300 p-0.5 cursor-pointer bg-white"
                              />
                              <input
                                type="text"
                                value={brandConfig.primaryColor}
                                onChange={(e) => setBrandConfig({ ...brandConfig, primaryColor: e.target.value })}
                                className="flex-1 px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg font-mono font-bold text-slate-800 focus:outline-none"
                              />
                            </div>
                          </div>

                          {/* Secondary Color */}
                          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                            <div className="flex items-center justify-between">
                              <label className="text-xs font-bold text-slate-800">Color Secundario</label>
                              <span className="text-[10px] text-slate-500">Acentos, insignias, bordes</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <input
                                type="color"
                                value={brandConfig.secondaryColor}
                                onChange={(e) => setBrandConfig({ ...brandConfig, secondaryColor: e.target.value })}
                                className="w-10 h-10 rounded-lg border border-slate-300 p-0.5 cursor-pointer bg-white"
                              />
                              <input
                                type="text"
                                value={brandConfig.secondaryColor}
                                onChange={(e) => setBrandConfig({ ...brandConfig, secondaryColor: e.target.value })}
                                className="flex-1 px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg font-mono font-bold text-slate-800 focus:outline-none"
                              />
                            </div>
                          </div>

                          {/* Accent Color */}
                          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                            <div className="flex items-center justify-between">
                              <label className="text-xs font-bold text-slate-800">Color de Acento</label>
                              <span className="text-[10px] text-slate-500">Destacados y etiquetas</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <input
                                type="color"
                                value={brandConfig.accentColor}
                                onChange={(e) => setBrandConfig({ ...brandConfig, accentColor: e.target.value })}
                                className="w-10 h-10 rounded-lg border border-slate-300 p-0.5 cursor-pointer bg-white"
                              />
                              <input
                                type="text"
                                value={brandConfig.accentColor}
                                onChange={(e) => setBrandConfig({ ...brandConfig, accentColor: e.target.value })}
                                className="flex-1 px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg font-mono font-bold text-slate-800 focus:outline-none"
                              />
                            </div>
                          </div>

                          {/* Header Gradient End */}
                          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                            <div className="flex items-center justify-between">
                              <label className="text-xs font-bold text-slate-800">Fondo Oscuro Gradiente</label>
                              <span className="text-[10px] text-slate-500">Final del degradado</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <input
                                type="color"
                                value={brandConfig.headerGradientEnd || '#0f172a'}
                                onChange={(e) => setBrandConfig({ ...brandConfig, headerGradientEnd: e.target.value })}
                                className="w-10 h-10 rounded-lg border border-slate-300 p-0.5 cursor-pointer bg-white"
                              />
                              <input
                                type="text"
                                value={brandConfig.headerGradientEnd || '#0f172a'}
                                onChange={(e) => setBrandConfig({ ...brandConfig, headerGradientEnd: e.target.value })}
                                className="flex-1 px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg font-mono font-bold text-slate-800 focus:outline-none"
                              />
                            </div>
                          </div>
                        </div>

                        {/* Live Email Header Demonstration Banner */}
                        <div className="mt-4 pt-4 border-t border-slate-100 space-y-2">
                          <label className="block text-xs font-bold text-slate-700">
                            Demostración en Vivo del Encabezado del Correo:
                          </label>
                          <div
                            style={{
                              background: `linear-gradient(135deg, ${brandConfig.primaryColor} 0%, ${brandConfig.secondaryColor} 50%, ${brandConfig.headerGradientEnd || '#0f172a'} 100%)`,
                              padding: '24px',
                              borderRadius: '16px',
                              color: '#ffffff',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '16px'
                            }}
                          >
                            {brandConfig.logoUrl && (
                              <img
                                src={brandConfig.logoUrl}
                                alt="Logo"
                                style={{ maxHeight: '48px', maxWidth: '120px', objectFit: 'contain' }}
                              />
                            )}
                            <div>
                              <div
                                style={{
                                  display: 'inline-block',
                                  padding: '2px 8px',
                                  borderRadius: '12px',
                                  fontSize: '9px',
                                  fontWeight: 'bold',
                                  color: brandConfig.accentColor,
                                  backgroundColor: 'rgba(255,255,255,0.18)',
                                  textTransform: 'uppercase',
                                  letterSpacing: '1px',
                                  marginBottom: '4px'
                                }}
                              >
                                ✈️ Notificación Oficial
                              </div>
                              <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 800, color: '#ffffff' }}>
                                {brandConfig.brandName}
                              </h3>
                              <p style={{ margin: 0, fontSize: '12px', color: '#bae6fd', opacity: 0.9 }}>
                                {brandConfig.brandTagline}
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : (
            /* TAB 2: EDITOR VISUAL DE PLANTILLAS HTML */
            <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
              
              {/* Left Sidebar: Template Selector & Tags (Width 280px) */}
              <div className="w-full md:w-72 bg-white border-r border-slate-200 flex flex-col shrink-0 overflow-hidden">
                <div className="p-3 bg-slate-100/70 border-b border-slate-200 flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                    <Layers className="w-3.5 h-3.5 text-sky-600" />
                    Plantillas ({Object.keys(TEMPLATE_METADATA).length})
                  </span>
                </div>

                {/* Templates List */}
                <div className="p-2 overflow-y-auto space-y-1 max-h-[40vh] md:max-h-none md:flex-1">
                  {(Object.keys(TEMPLATE_METADATA) as EmailTemplateKey[]).map((key) => {
                    const meta = TEMPLATE_METADATA[key];
                    const isSelected = selectedTemplateKey === key;
                    return (
                      <button
                        key={key}
                        type="button"
                        onClick={() => handleSelectTemplate(key)}
                        className={`w-full text-left p-2.5 rounded-xl text-xs transition-all flex items-start gap-2.5 cursor-pointer ${
                          isSelected
                            ? 'bg-sky-50 text-sky-950 border border-sky-200 shadow-xs font-bold'
                            : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900 border border-transparent'
                        }`}
                      >
                        <span className="text-base shrink-0 mt-0.5">{meta.icon}</span>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <span className="font-semibold truncate">{meta.name}</span>
                          </div>
                          <p className="text-[10px] text-slate-500 line-clamp-2 mt-0.5 font-normal">
                            {meta.description}
                          </p>
                        </div>
                      </button>
                    );
                  })}
                </div>

                {/* Dynamic Variables Guide & Inserter */}
                <div className="p-3 bg-slate-50 border-t border-slate-200 shrink-0">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[11px] font-bold text-slate-700 flex items-center gap-1">
                      <Code className="w-3 h-3 text-sky-600" />
                      Variables Dinámicas
                    </span>
                    <span className="text-[9px] text-slate-400">Clic para copiar</span>
                  </div>
                  <div className="flex flex-wrap gap-1 max-h-36 overflow-y-auto p-1 bg-white rounded-lg border border-slate-200">
                    {AVAILABLE_PLACEHOLDERS.map((ph) => (
                      <button
                        key={ph.tag}
                        type="button"
                        onClick={() => handleInsertPlaceholder(ph.tag)}
                        className="px-1.5 py-0.5 bg-slate-100 hover:bg-sky-100 hover:text-sky-800 text-[10px] font-mono text-slate-700 rounded border border-slate-200 cursor-pointer transition-colors"
                        title={ph.desc}
                      >
                        {ph.tag}
                      </button>
                    ))}
                  </div>
                  {copiedTag && (
                    <div className="mt-1 text-[10px] text-emerald-600 font-semibold flex items-center gap-1">
                      <Check className="w-3 h-3" />
                      Copiado: {copiedTag}
                    </div>
                  )}
                </div>
              </div>

              {/* Center/Right Area: Code Editor & Live Preview */}
              <div className="flex-1 flex flex-col overflow-hidden bg-slate-100">
                
                {/* Editor Toolbar */}
                <div className="px-4 py-2.5 bg-white border-b border-slate-200 flex flex-wrap items-center justify-between gap-2 shrink-0">
                  <div className="flex items-center gap-2">
                    <span className="text-base">{TEMPLATE_METADATA[selectedTemplateKey]?.icon}</span>
                    <div>
                      <h3 className="text-xs font-bold text-slate-800">
                        {TEMPLATE_METADATA[selectedTemplateKey]?.name}
                      </h3>
                      <span className="text-[10px] text-slate-500 font-mono">
                        Clave: {selectedTemplateKey}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {/* View Switcher: Split / Code / Preview */}
                    <div className="flex bg-slate-100 p-0.5 rounded-lg border border-slate-200 text-xs">
                      <button
                        type="button"
                        onClick={() => setSplitView('split')}
                        className={`px-2.5 py-1 rounded-md text-[11px] font-bold cursor-pointer transition-colors ${
                          splitView === 'split' ? 'bg-white shadow-xs text-sky-700' : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        Dividido
                      </button>
                      <button
                        type="button"
                        onClick={() => setSplitView('code_only')}
                        className={`px-2.5 py-1 rounded-md text-[11px] font-bold cursor-pointer transition-colors ${
                          splitView === 'code_only' ? 'bg-white shadow-xs text-sky-700' : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        Solo HTML
                      </button>
                      <button
                        type="button"
                        onClick={() => setSplitView('preview_only')}
                        className={`px-2.5 py-1 rounded-md text-[11px] font-bold cursor-pointer transition-colors ${
                          splitView === 'preview_only' ? 'bg-white shadow-xs text-sky-700' : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        Solo Vista Previa
                      </button>
                    </div>

                    <button
                      type="button"
                      onClick={handleResetTemplate}
                      disabled={saving}
                      className="flex items-center gap-1 px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg border border-slate-200 cursor-pointer"
                      title="Restablecer plantilla a fábrica"
                    >
                      <RotateCcw className="w-3 h-3" />
                      <span>Fábrica</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleSaveTemplate}
                      disabled={saving}
                      className="flex items-center gap-1 px-3 py-1.5 bg-sky-600 hover:bg-sky-700 text-white text-xs font-bold rounded-lg shadow-xs transition-all cursor-pointer"
                    >
                      <Save className="w-3.5 h-3.5" />
                      <span>{saving ? 'Guardando...' : 'Guardar Plantilla'}</span>
                    </button>
                  </div>
                </div>

                {/* Subject Line Input */}
                <div className="px-4 py-2 bg-white border-b border-slate-200 flex items-center gap-2 shrink-0">
                  <label className="text-xs font-bold text-slate-700 whitespace-nowrap">
                    Asunto del Correo:
                  </label>
                  <input
                    type="text"
                    value={currentSubject}
                    onChange={(e) => setCurrentSubject(e.target.value)}
                    className="flex-1 px-3 py-1 text-xs bg-slate-50 border border-slate-200 rounded-lg font-mono focus:outline-none focus:ring-1 focus:ring-sky-500"
                    placeholder="✈️ Asignación de Vuelo..."
                  />
                </div>

                {/* Workspace: Code + Preview */}
                <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
                  
                  {/* Left Workspace: Code Editor */}
                  {(splitView === 'split' || splitView === 'code_only') && (
                    <div className={`${splitView === 'split' ? 'w-full md:w-1/2 border-r border-slate-200' : 'w-full'} flex flex-col bg-slate-900 overflow-hidden`}>
                      <div className="px-3 py-1.5 bg-slate-950 border-b border-slate-800 text-slate-400 text-[11px] flex items-center justify-between">
                        <span className="font-mono">Código Fuente HTML / Responsive</span>
                        <span className="text-[10px] text-slate-500 font-mono">
                          {currentHtml.length} caracteres
                        </span>
                      </div>
                      <textarea
                        value={currentHtml}
                        onChange={(e) => setCurrentHtml(e.target.value)}
                        className="flex-1 w-full p-4 bg-slate-900 text-slate-100 font-mono text-xs leading-relaxed focus:outline-none resize-none overflow-y-auto selection:bg-sky-800"
                        spellCheck={false}
                      />
                    </div>
                  )}

                  {/* Right Workspace: Live Render Preview */}
                  {(splitView === 'split' || splitView === 'preview_only') && (
                    <div className={`${splitView === 'split' ? 'w-full md:w-1/2' : 'w-full'} flex flex-col bg-slate-200 overflow-hidden`}>
                      {/* Preview Top bar with device toggle */}
                      <div className="px-3 py-1.5 bg-slate-100 border-b border-slate-300 text-slate-700 text-xs flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Eye className="w-3.5 h-3.5 text-sky-600" />
                          <span className="font-bold text-[11px]">Vista Previa en Vivo</span>
                          {previewLoading && (
                            <RefreshCw className="w-3 h-3 text-sky-500 animate-spin" />
                          )}
                        </div>

                        <div className="flex items-center gap-1 bg-slate-200 p-0.5 rounded-md border border-slate-300">
                          <button
                            type="button"
                            onClick={() => setPreviewMode('desktop')}
                            className={`p-1 rounded cursor-pointer ${
                              previewMode === 'desktop' ? 'bg-white text-slate-800 shadow-xs' : 'text-slate-500 hover:text-slate-800'
                            }`}
                            title="Modo Escritorio"
                          >
                            <Monitor className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setPreviewMode('mobile')}
                            className={`p-1 rounded cursor-pointer ${
                              previewMode === 'mobile' ? 'bg-white text-slate-800 shadow-xs' : 'text-slate-500 hover:text-slate-800'
                            }`}
                            title="Modo Móvil"
                          >
                            <Smartphone className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      {/* Asunto preview strip */}
                      <div className="px-3 py-1 bg-slate-50 border-b border-slate-200 text-slate-600 text-[11px] flex items-center gap-2">
                        <span className="font-semibold text-slate-500">Asunto renderizado:</span>
                        <span className="font-medium text-slate-800 truncate">{previewSubject || currentSubject}</span>
                      </div>

                      {/* IFrame or Card Container */}
                      <div className="flex-1 p-3 overflow-y-auto flex items-center justify-center">
                        <div
                          className={`bg-white rounded-xl shadow-lg border border-slate-300 overflow-hidden transition-all duration-300 ${
                            previewMode === 'mobile'
                              ? 'w-[375px] h-[600px] border-4 border-slate-800 rounded-3xl shadow-2xl'
                              : 'w-full h-full max-w-[650px]'
                          }`}
                        >
                          <iframe
                            title="Email Live Preview"
                            srcDoc={previewHtml}
                            className="w-full h-full border-0 bg-slate-900"
                            sandbox="allow-same-origin"
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
