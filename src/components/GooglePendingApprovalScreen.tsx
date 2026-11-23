import React, { useState } from 'react';
import {
  ShieldAlert,
  Clock,
  RefreshCw,
  LogOut,
  CheckCircle2,
  AlertTriangle,
  Plane,
  ShieldX,
  FileCheck,
  UserCheck,
  Building,
  KeyRound
} from 'lucide-react';
import { User } from '../types';

interface GooglePendingApprovalScreenProps {
  user: User;
  onRefreshStatus: () => Promise<User | null>;
  onLogout: () => void;
}

export const GooglePendingApprovalScreen: React.FC<GooglePendingApprovalScreenProps> = ({
  user,
  onRefreshStatus,
  onLogout
}) => {
  const [isChecking, setIsChecking] = useState(false);
  const [checkResult, setCheckResult] = useState<'pending' | 'approved' | 'still_pending' | null>(null);

  const isRejected = user.estado_autorizacion === 'rechazado';

  const handleCheckStatus = async () => {
    setIsChecking(true);
    setCheckResult(null);
    try {
      const freshUser = await onRefreshStatus();
      if (freshUser && freshUser.estado_autorizacion === 'aprobado') {
        setCheckResult('approved');
      } else {
        setCheckResult('still_pending');
      }
    } catch (err) {
      console.error('Error al comprobar estado:', err);
      setCheckResult('still_pending');
    } finally {
      setIsChecking(false);
    }
  };

  const formattedDate = user.fecha_solicitud
    ? new Date(user.fecha_solicitud).toLocaleString('es-PA', {
        dateStyle: 'medium',
        timeStyle: 'short'
      })
    : new Date().toLocaleString('es-PA', { dateStyle: 'medium', timeStyle: 'short' });

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-950 flex flex-col justify-center items-center p-4 sm:p-6 text-slate-100 relative overflow-hidden">
      {/* Decorative runway background lighting */}
      <div className="absolute inset-0 opacity-10 pointer-events-none bg-[radial-gradient(#38bdf8_1px,transparent_1px)] [background-size:24px_24px]" />
      <div className="absolute -top-32 -right-32 w-96 h-96 bg-sky-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-32 -left-32 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="relative z-10 w-full max-w-xl">
        {/* SkyOps Header */}
        <div className="text-center mb-6">
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
            Control de Acceso Operacional
          </h1>
        </div>

        {/* Main Status Container */}
        <div className="bg-slate-900/90 border border-slate-700/80 backdrop-blur-xl rounded-2xl shadow-2xl overflow-hidden">
          {/* Status Top Banner */}
          <div
            className={`px-6 py-4 flex items-center gap-3 border-b ${
              isRejected
                ? 'bg-rose-500/15 border-rose-500/30 text-rose-300'
                : 'bg-amber-500/15 border-amber-500/30 text-amber-300'
            }`}
          >
            {isRejected ? (
              <ShieldX className="w-6 h-6 text-rose-400 flex-shrink-0" />
            ) : (
              <Clock className="w-6 h-6 text-amber-400 flex-shrink-0 animate-pulse" />
            )}
            <div>
              <div className="text-xs font-black uppercase tracking-wider">
                {isRejected ? 'Estado: Solicitud No Autorizada' : 'Estado: Pendiente de Aprobación'}
              </div>
              <div className="text-sm font-semibold text-white">
                {isRejected
                  ? 'El acceso con esta cuenta de Google fue denegado'
                  : 'En revisión por Jefatura de Instrucción o Administrador'}
              </div>
            </div>
          </div>

          <div className="p-6 sm:p-8 space-y-6">
            {/* Rejection Reason (only if rejected) */}
            {isRejected && (
              <div className="text-xs sm:text-sm text-slate-300 leading-relaxed bg-slate-800/60 p-4 rounded-xl border border-slate-700/50">
                <p className="font-medium text-rose-300 mb-1">Motivo:</p>
                <p className="text-slate-300 italic">
                  "{user.motivo_rechazo_acceso || 'Cuenta no autorizada.'}"
                </p>
              </div>
            )}

            {/* Google Profile Card */}
            <div className="bg-slate-800/80 rounded-xl p-4 border border-slate-700/70 flex items-center gap-4">
              <div className="relative">
                <div className="w-14 h-14 rounded-full overflow-hidden border-2 border-amber-400/80 bg-slate-700 flex-shrink-0 shadow-lg">
                  {user.foto_perfil ? (
                    <img
                      src={user.foto_perfil}
                      alt={user.nombre}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center font-bold text-lg text-slate-300">
                      {user.nombre.charAt(0)}
                    </div>
                  )}
                </div>
                <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-white flex items-center justify-center shadow-xs">
                  <svg className="w-3.5 h-3.5" viewBox="0 0 24 24">
                    <path
                      fill="#4285F4"
                      d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.33 24 12 24z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 9.98 0 12s.45 3.82 1.25 5.42l4.03-3.15z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
                    />
                  </svg>
                </div>
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <h2 className="text-base font-bold text-white truncate">{user.nombre}</h2>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-700 text-slate-300 font-mono">
                    Google Auth
                  </span>
                </div>
                <p className="text-xs text-slate-400 truncate">{user.correo}</p>
                <div className="flex items-center gap-3 text-[11px] text-slate-400 mt-2">
                  <span>Solicitado: {formattedDate}</span>
                </div>
              </div>
            </div>

            {/* Check Feedback */}
            {checkResult === 'still_pending' && (
              <div className="p-3 bg-amber-500/15 border border-amber-500/30 rounded-xl text-xs text-amber-300 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                <span>
                  Tu solicitud aún continúa en espera de aprobación. Por favor contacta a la Jefatura de Instrucción o inténtalo nuevamente en unos minutos.
                </span>
              </div>
            )}

            {checkResult === 'approved' && (
              <div className="p-3 bg-emerald-500/15 border border-emerald-500/30 rounded-xl text-xs text-emerald-300 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 flex-shrink-0 text-emerald-400" />
                <span>
                  ¡Acceso autorizado con éxito! Redirigiendo a tu panel de operaciones...
                </span>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row items-center gap-3 pt-2">
              {!isRejected && (
                <button
                  onClick={handleCheckStatus}
                  disabled={isChecking}
                  className="w-full sm:flex-1 py-3 px-4 rounded-xl bg-gradient-to-r from-sky-500 to-sky-600 hover:from-sky-400 hover:to-sky-500 text-white font-bold text-xs tracking-wide shadow-lg shadow-sky-500/20 hover:shadow-sky-500/30 flex items-center justify-center gap-2 cursor-pointer transition-all disabled:opacity-50"
                >
                  <RefreshCw className={`w-4 h-4 ${isChecking ? 'animate-spin' : ''}`} />
                  <span>{isChecking ? 'Consultando Firestore...' : 'Comprobar Estado de Aprobación'}</span>
                </button>
              )}

              <button
                onClick={onLogout}
                className="w-full sm:w-auto py-3 px-5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white font-bold text-xs border border-slate-700 hover:border-slate-600 flex items-center justify-center gap-2 cursor-pointer transition-all"
              >
                <LogOut className="w-4 h-4" />
                <span>Cerrar Sesión / Cambiar Cuenta</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
