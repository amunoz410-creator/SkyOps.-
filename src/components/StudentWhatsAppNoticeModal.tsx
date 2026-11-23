import React, { useState, useEffect } from 'react';
import { User } from '../types';
import { api } from '../services/api';
import {
  MessageSquare,
  Send,
  ExternalLink,
  Copy,
  Check,
  AlertTriangle,
  Clock,
  DollarSign,
  Building2,
  Phone,
  User as UserIcon,
  X,
  Sparkles,
  CheckCircle2,
  ShieldCheck
} from 'lucide-react';

interface StudentWhatsAppNoticeModalProps {
  isOpen: boolean;
  onClose: () => void;
  student: User | null;
  balance: number;
  onSuccess?: () => void;
}

export const StudentWhatsAppNoticeModal: React.FC<StudentWhatsAppNoticeModalProps> = ({
  isOpen,
  onClose,
  student,
  balance,
  onSuccess
}) => {
  const isNegative = balance < 0;
  const isNearExhausted = balance >= 0 && balance < 250;

  const [phone, setPhone] = useState<string>('');
  const [templateType, setTemplateType] = useState<'deuda' | 'saldo_bajo' | 'estado_cuenta'>(
    isNegative ? 'deuda' : isNearExhausted ? 'saldo_bajo' : 'estado_cuenta'
  );
  const [message, setMessage] = useState<string>('');
  const [copied, setCopied] = useState<boolean>(false);
  const [sendingApi, setSendingApi] = useState<boolean>(false);
  const [apiSuccess, setApiSuccess] = useState<string | null>(null);
  const [apiError, setApiError] = useState<string | null>(null);

  useEffect(() => {
    if (student) {
      setPhone(student.telefono || '+507 6000-0000');
      const defaultTemplate = isNegative ? 'deuda' : isNearExhausted ? 'saldo_bajo' : 'estado_cuenta';
      setTemplateType(defaultTemplate);
      generateMessage(defaultTemplate, student, balance);
      setApiSuccess(null);
      setApiError(null);
      setCopied(false);
    }
  }, [student, balance, isOpen]);

  const generateMessage = (type: 'deuda' | 'saldo_bajo' | 'estado_cuenta', targetStudent: User, targetBalance: number) => {
    const studentName = targetStudent.nombre || 'Piloto';
    const absBalance = Math.abs(targetBalance).toFixed(2);
    const formattedBalance = targetBalance.toFixed(2);

    let text = '';
    if (type === 'deuda') {
      text = `✈️ *SkyOps Flight Academy - Aviso de Tesorería*\n\n` +
        `Estimado/a *${studentName}*,\n\n` +
        `Le saludamos del departamento de Contabilidad y Tesorería. Le informamos que su estado de cuenta registra un *saldo deudor de -$${absBalance} USD*.\n\n` +
        `⚠️ *Condición de Operaciones:* De acuerdo con el manual de despacho, es necesario regularizar este balance para mantener la continuidad en la programación de sus vuelos e instrucción en aeronaves.\n\n` +
        `💳 *Datos para Transferencia ACH:*\n` +
        `• *Banco:* Banco General de Panamá\n` +
        `• *Tipo de Cuenta:* Corriente\n` +
        `• *No. de Cuenta:* 03-72-01-123456-7\n` +
        `• *Beneficiario:* SkyOps Aviation S.A.\n\n` +
        `Agradecemos reportar su comprobante en la plataforma o por este medio una vez efectuada la transferencia.\n\n` +
        `_Atentamente,_\n*Departamento de Contabilidad SkyOps*`;
    } else if (type === 'saldo_bajo') {
      text = `✈️ *SkyOps Flight Academy - Aviso de Saldo Disponible*\n\n` +
        `Hola *${studentName}*,\n\n` +
        `Te escribimos de Contabilidad para notificarte que tu saldo disponible de horas de vuelo es de *$${formattedBalance} USD* (estimado para menos de 1.5 horas de instrucción de vuelo).\n\n` +
        `💡 *Recomendación:* Te sugerimos realizar una recarga de horas bloque con anticipación para asegurar que tus próximos vuelos en el itinerario no se vean pausados por falta de saldo.\n\n` +
        `💳 *Cuentas ACH:*\n` +
        `• *Banco General* (Cta. Cte. 03-72-01-123456-7 - SkyOps Aviation S.A.)\n\n` +
        `¡Quedamos a tu orden para cualquier consulta contable!\n\n` +
        `_Saludos cordiales,_\n*Contabilidad & Despacho SkyOps*`;
    } else {
      text = `✈️ *SkyOps Flight Academy - Estado de Cuenta Oficial*\n\n` +
        `Estimado/a *${studentName}*,\n\n` +
        `Le compartimos la actualización de su balance de horas de vuelo en SkyOps:\n\n` +
        `• *Saldo Oficial Acreditado:* $${formattedBalance} USD\n` +
        `• *Estatus de Despacho:* Habilitado ✅\n\n` +
        `Puede revisar el desglose detallado de cargos por vuelo y abonos bancarios en el portal del estudiante.\n\n` +
        `_Atentamente,_\n*Tesorería SkyOps*`;
    }

    setMessage(text);
  };

  const handleTemplateChange = (type: 'deuda' | 'saldo_bajo' | 'estado_cuenta') => {
    setTemplateType(type);
    if (student) {
      generateMessage(type, student, balance);
    }
  };

  // Limpiar número telefónico para enlace wa.me (remover espacios, guiones, símbolos)
  const getCleanPhoneNumber = (rawPhone: string): string => {
    let cleaned = rawPhone.replace(/[^\d+]/g, '');
    // Si empieza con 6 o 2 (formato Panamá) y no tiene código de país, agregar 507
    if (!cleaned.startsWith('+') && !cleaned.startsWith('507') && cleaned.length === 8) {
      cleaned = '507' + cleaned;
    }
    cleaned = cleaned.replace('+', '');
    return cleaned;
  };

  const handleOpenWhatsAppWeb = () => {
    const cleanPhone = getCleanPhoneNumber(phone);
    const encodedText = encodeURIComponent(message);
    const whatsappUrl = `https://wa.me/${cleanPhone}?text=${encodedText}`;
    window.open(whatsappUrl, '_blank', 'noopener,noreferrer');
    if (onSuccess) onSuccess();
  };

  const handleCopyMessage = () => {
    navigator.clipboard.writeText(message);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleSendViaApi = async () => {
    if (!student) return;
    setSendingApi(true);
    setApiError(null);
    setApiSuccess(null);

    try {
      await api.sendTestWhatsAppMessage({
        destinatario_nombre: student.nombre,
        destinatario_telefono: phone,
        mensaje: message
      });
      setApiSuccess(`¡Aviso enviado exitosamente al WhatsApp de ${student.nombre} (${phone})!`);
      if (onSuccess) onSuccess();
    } catch (err: any) {
      setApiError(err.message || 'No se pudo despachar por la API de WhatsApp.');
    } finally {
      setSendingApi(false);
    }
  };

  if (!isOpen || !student) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 z-50 animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl max-w-lg w-full p-4 sm:p-5 shadow-2xl border border-slate-200 space-y-4 max-h-[92vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-white ${
              isNegative ? 'bg-rose-600' : isNearExhausted ? 'bg-amber-500' : 'bg-emerald-600'
            }`}>
              <MessageSquare className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-base">
                Aviso de Saldo por WhatsApp
              </h3>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Card resumen del Estudiante con Indicador Visual */}
        <div className={`p-3 rounded-xl border flex items-center justify-between gap-3 ${
          isNegative
            ? 'bg-rose-50/90 border-rose-300 text-rose-950'
            : isNearExhausted
            ? 'bg-amber-50/90 border-amber-300 text-amber-950'
            : 'bg-emerald-50/90 border-emerald-300 text-emerald-950'
        }`}>
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-full bg-white border border-slate-200 overflow-hidden flex-shrink-0 flex items-center justify-center">
              {student.foto_perfil ? (
                <img src={student.foto_perfil} alt={student.nombre} className="w-full h-full object-cover" />
              ) : (
                <UserIcon className="w-5 h-5 text-slate-400" />
              )}
            </div>
            <div>
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="font-bold text-xs text-slate-900">{student.nombre}</span>
                <span className={`text-[10px] font-extrabold px-1.5 py-0.2 rounded border ${
                  isNegative
                    ? 'bg-rose-100 text-rose-800 border-rose-300'
                    : isNearExhausted
                    ? 'bg-amber-100 text-amber-900 border-amber-300'
                    : 'bg-emerald-100 text-emerald-800 border-emerald-300'
                }`}>
                  {isNegative ? '🔴 Saldo Deudor' : isNearExhausted ? '🟠 Próximo a Agotarse' : '🟢 Solvente'}
                </span>
              </div>
              <div className="text-[11px] text-slate-600 flex items-center gap-2 mt-0.5">
                <span>{student.curso_actual || 'Estudiante Piloto'}</span>
                <span>•</span>
                <span className="flex items-center gap-0.5">
                  <Phone className="w-3 h-3 text-slate-400" />
                  {student.telefono || 'Sin teléfono'}
                </span>
              </div>
            </div>
          </div>

          <div className="text-right flex-shrink-0">
            <span className="text-[10px] uppercase font-bold text-slate-500 block">Saldo Actual</span>
            <span className={`text-base font-extrabold ${
              isNegative ? 'text-rose-700' : isNearExhausted ? 'text-amber-800' : 'text-emerald-700'
            }`}>
              {isNegative ? '-' : ''}${Math.abs(balance).toFixed(2)}
            </span>
          </div>
        </div>

        {/* Teléfono de Destino editable */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            Número de WhatsApp Destino (con código de país)
          </label>
          <div className="relative">
            <span className="absolute inset-y-0 left-0 pl-2.5 flex items-center text-slate-400 text-xs font-bold">
              <Phone className="w-3.5 h-3.5 text-slate-400" />
            </span>
            <input
              type="text"
              className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:ring-1 focus:ring-emerald-500 focus:bg-white focus:outline-none font-mono font-bold"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+507 6890-1234"
            />
          </div>
        </div>

        {/* Selector de Plantilla */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1.5">
            Seleccionar Plantilla de Mensaje
          </label>
          <div className="grid grid-cols-3 gap-1.5">
            <button
              type="button"
              onClick={() => handleTemplateChange('deuda')}
              className={`py-1.5 px-2 text-[11px] font-bold rounded-lg border transition-all cursor-pointer flex flex-col items-center gap-0.5 ${
                templateType === 'deuda'
                  ? 'bg-rose-50 border-rose-500 text-rose-800 shadow-2xs'
                  : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
              }`}
            >
              <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
              <span>Saldo Deudor (Mora)</span>
            </button>

            <button
              type="button"
              onClick={() => handleTemplateChange('saldo_bajo')}
              className={`py-1.5 px-2 text-[11px] font-bold rounded-lg border transition-all cursor-pointer flex flex-col items-center gap-0.5 ${
                templateType === 'saldo_bajo'
                  ? 'bg-amber-50 border-amber-500 text-amber-900 shadow-2xs'
                  : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
              }`}
            >
              <Clock className="w-3.5 h-3.5 text-amber-600" />
              <span>Próximo a Agotarse</span>
            </button>

            <button
              type="button"
              onClick={() => handleTemplateChange('estado_cuenta')}
              className={`py-1.5 px-2 text-[11px] font-bold rounded-lg border transition-all cursor-pointer flex flex-col items-center gap-0.5 ${
                templateType === 'estado_cuenta'
                  ? 'bg-emerald-50 border-emerald-500 text-emerald-800 shadow-2xs'
                  : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
              }`}
            >
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              <span>Estado Oficial</span>
            </button>
          </div>
        </div>

        {/* Vista y Edición del Mensaje de WhatsApp */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="text-xs font-semibold text-slate-700">
              Contenido del Mensaje de WhatsApp
            </label>
            <button
              type="button"
              onClick={handleCopyMessage}
              className="text-[11px] text-sky-600 hover:text-sky-700 font-semibold flex items-center gap-1 cursor-pointer"
            >
              {copied ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
              <span>{copied ? '¡Copiado!' : 'Copiar texto'}</span>
            </button>
          </div>
          <textarea
            rows={7}
            className="w-full p-2.5 text-xs bg-slate-50 border border-slate-300 rounded-xl focus:ring-1 focus:ring-emerald-500 focus:bg-white focus:outline-none font-sans leading-relaxed text-slate-800"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
          />
        </div>

        {/* Notificaciones de Éxito / Error de Envío API */}
        {apiSuccess && (
          <div className="p-2.5 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
            <span>{apiSuccess}</span>
          </div>
        )}

        {apiError && (
          <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-rose-600 flex-shrink-0" />
            <span>{apiError}</span>
          </div>
        )}

        {/* Botones de Acción */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 pt-3 border-t border-slate-100">
          <button
            type="button"
            onClick={onClose}
            className="px-3.5 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer text-center"
          >
            Cerrar
          </button>

          <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
            <button
              type="button"
              onClick={handleSendViaApi}
              disabled={sendingApi || !phone.trim()}
              className="flex-1 sm:flex-none px-3.5 py-2 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-xs transition-colors cursor-pointer flex items-center justify-center gap-1.5"
              title="Despachar a través de la integración de API WhatsApp de SkyOps"
            >
              <Send className="w-3.5 h-3.5 text-emerald-400" />
              <span>{sendingApi ? 'Enviando...' : 'Enviar vía Servidor API'}</span>
            </button>

            <button
              type="button"
              onClick={handleOpenWhatsAppWeb}
              disabled={!phone.trim()}
              className="flex-1 sm:flex-none px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-xs transition-all cursor-pointer flex items-center justify-center gap-1.5"
              title="Abrir chat en WhatsApp Web o App Móvil con el mensaje precargado"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>Abrir en WhatsApp</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
