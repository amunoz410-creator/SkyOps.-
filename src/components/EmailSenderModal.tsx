import React, { useState, useEffect } from 'react';
import { User } from '../types';
import { api } from '../services/api';
import { useLanguage } from '../i18n/LanguageContext';
import {
  Mail,
  Send,
  X,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  FileText,
  User as UserIcon,
  Plane
} from 'lucide-react';

interface EmailSenderModalProps {
  isOpen: boolean;
  onClose: () => void;
  allUsers: User[];
  preselectedUser?: User | null;
  initialSubject?: string;
  initialMessage?: string;
  onSuccess?: () => void;
}

export const EmailSenderModal: React.FC<EmailSenderModalProps> = ({
  isOpen,
  onClose,
  allUsers,
  preselectedUser,
  initialSubject,
  initialMessage,
  onSuccess
}) => {
  const { t } = useLanguage();
  const [selectedUserId, setSelectedUserId] = useState<string>('');
  const [recipientEmail, setRecipientEmail] = useState<string>('');
  const [recipientName, setRecipientName] = useState<string>('');
  const [subject, setSubject] = useState<string>('');
  const [message, setMessage] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [success, setSuccess] = useState<string>('');
  const [error, setError] = useState<string>('');

  useEffect(() => {
    if (preselectedUser) {
      setSelectedUserId(preselectedUser.id);
      setRecipientEmail(preselectedUser.correo || '');
      setRecipientName(preselectedUser.nombre || '');
    } else if (allUsers.length > 0 && !selectedUserId) {
      const firstStudent = allUsers.find(u => u.rol === 'estudiante') || allUsers[0];
      setSelectedUserId(firstStudent.id);
      setRecipientEmail(firstStudent.correo || '');
      setRecipientName(firstStudent.nombre || '');
    }

    if (initialSubject) {
      setSubject(initialSubject);
    }
    if (initialMessage) {
      setMessage(initialMessage);
    }
  }, [preselectedUser, allUsers, isOpen, initialSubject, initialMessage]);

  const handleUserChange = (userId: string) => {
    setSelectedUserId(userId);
    const user = allUsers.find(u => u.id === userId);
    if (user) {
      setRecipientEmail(user.correo || '');
      setRecipientName(user.nombre || '');
    }
  };

  const handleApplyTemplate = (type: 'briefing' | 'medical' | 'account' | 'welcome') => {
    const student = allUsers.find(u => u.id === selectedUserId);
    const name = student ? student.nombre : 'Piloto';

    switch (type) {
      case 'briefing':
        setSubject('✈️ Convocatoria a Briefing de Vuelo Previo - SkyOps');
        setMessage(
          `Hola ${name},\n\nTe recordamos presentarte con 30 minutos de antelación para la sesión de briefing previa a tu vuelo. Revisaremos el plan de vuelo, meteorología METAR/TAF, peso y balance, y NOTAMs vigentes.\n\nSaludos cordiales,\nJefatura de Operaciones SkyOps`
        );
        break;
      case 'medical':
        setSubject('⚠️ Recordatorio de Vencimiento de Certificado Médico - SkyOps');
        setMessage(
          `Estimado/a ${name},\n\nEl sistema ha detectado que la vigencia de tu certificado médico aeronáutico se encuentra próxima a expirar o requiere renovación. Por favor gestiona tu evaluación con el médico examinador oficial a la brevedad.\n\nAtentamente,\nControl de Licencias y Vigencias`
        );
        break;
      case 'account':
        setSubject('💳 Estado de Cuenta y Saldo de Horas de Vuelo - SkyOps');
        setMessage(
          `Estimado/a ${name},\n\nTe compartimos la actualización de tu estado de cuenta y balance de horas de vuelo disponibles para tus próximas misiones de entrenamiento.\n\nPuedes consultar el desglose detallado en el portal de la academia.\n\nContabilidad SkyOps`
        );
        break;
      case 'welcome':
        setSubject('🎓 ¡Bienvenido a SkyOps Flight Academy!');
        setMessage(
          `¡Hola ${name}!\n\nTe damos la más cordial bienvenida a SkyOps Flight Academy. Tu expediente de vuelo ha sido activado en la plataforma. Pronto tu instructor asignado comenzará a programar tus misiones de vuelo.\n\n¡Buenos vuelos!\nDirección de Instrucción`
        );
        break;
    }
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!recipientEmail || !subject || !message) {
      setError('Por favor completa el correo de destino, el asunto y el mensaje.');
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const selectedUser = allUsers.find(u => u.id === selectedUserId);
      const res = await api.sendDirectEmail({
        toEmail: recipientEmail,
        recipientName: recipientName,
        subject: subject,
        message: message,
        recipientType: selectedUser?.rol || 'estudiante'
      });

      if (res.success) {
        setSuccess(`¡Correo electrónico despachado exitosamente a ${recipientEmail}!`);
        setTimeout(() => {
          setSuccess('');
          if (onSuccess) onSuccess();
          onClose();
        }, 2000);
      } else {
        setError('Error al despachar el correo');
      }
    } catch (err: any) {
      setError(err.message || 'Error al enviar correo electrónico');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-2xl border border-slate-200 space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-sky-100 text-sky-700 rounded-xl">
              <Mail className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-800 text-base">Despacho de Correo Electrónico</h3>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 font-bold text-lg cursor-pointer"
          >
            &times;
          </button>
        </div>

        {/* Feedback alerts */}
        {error && (
          <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
            <span>{success}</span>
          </div>
        )}

        <form onSubmit={handleSend} className="space-y-4">
          {/* Destinatario */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Seleccionar Usuario
              </label>
              <select
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-500 cursor-pointer"
                value={selectedUserId}
                onChange={(e) => handleUserChange(e.target.value)}
              >
                {allUsers.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.nombre} ({u.rol})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Correo Electrónico *
              </label>
              <input
                type="email"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-500"
                value={recipientEmail}
                onChange={(e) => setRecipientEmail(e.target.value)}
                placeholder="correo@ejemplo.com"
                required
              />
            </div>
          </div>

          {/* Plantillas Rápidas */}
          <div>
            <div className="flex items-center gap-1 text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1.5">
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              <span>Plantillas Rápidas:</span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              <button
                type="button"
                onClick={() => handleApplyTemplate('briefing')}
                className="px-2.5 py-1 bg-sky-50 hover:bg-sky-100 text-sky-700 rounded-lg text-xs font-medium border border-sky-200 transition-colors cursor-pointer"
              >
                📋 Briefing Prevuelo
              </button>
              <button
                type="button"
                onClick={() => handleApplyTemplate('medical')}
                className="px-2.5 py-1 bg-amber-50 hover:bg-amber-100 text-amber-700 rounded-lg text-xs font-medium border border-amber-200 transition-colors cursor-pointer"
              >
                ⚠️ Vencimiento Médico
              </button>
              <button
                type="button"
                onClick={() => handleApplyTemplate('account')}
                className="px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-lg text-xs font-medium border border-emerald-200 transition-colors cursor-pointer"
              >
                💳 Estado de Cuenta
              </button>
              <button
                type="button"
                onClick={() => handleApplyTemplate('welcome')}
                className="px-2.5 py-1 bg-purple-50 hover:bg-purple-100 text-purple-700 rounded-lg text-xs font-medium border border-purple-200 transition-colors cursor-pointer"
              >
                🎓 Bienvenida
              </button>
            </div>
          </div>

          {/* Asunto */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Asunto del Correo *
            </label>
            <input
              type="text"
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-500"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="ej. Notificación de Operaciones SkyOps"
              required
            />
          </div>

          {/* Mensaje */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Mensaje / Contenido *
            </label>
            <textarea
              rows={4}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-500 font-sans"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Escribe el mensaje oficial para el alumno..."
              required
            />
          </div>

          {/* Footer Buttons */}
          <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2 text-xs font-semibold bg-sky-600 hover:bg-sky-700 text-white rounded-xl shadow-sm flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              <Send className="w-3.5 h-3.5" />
              <span>{loading ? 'Despachando...' : 'Despachar Correo'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
