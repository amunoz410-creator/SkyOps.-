import React from 'react';
import { Calendar, AlertCircle, CheckCircle, Clock, MapPin, Plane, Users, Info } from 'lucide-react';
import { Itinerary, User } from '../types';

interface GoogleCalendarSyncModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  itinerary: Itinerary | null;
  studentUser?: User;
  instructorUser?: User;
  isUpdating?: boolean;
  isLoading?: boolean;
}

export const GoogleCalendarSyncModal: React.FC<GoogleCalendarSyncModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  itinerary,
  studentUser,
  instructorUser,
  isUpdating = false,
  isLoading = false
}) => {
  if (!isOpen || !itinerary) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-blue-50 text-blue-600 rounded-xl">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-base">
                {isUpdating ? 'Actualizar en Google Calendar' : 'Sincronizar con Google Calendar'}
              </h3>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={isLoading}
            className="text-slate-400 hover:text-slate-600 text-xl font-bold cursor-pointer transition-colors"
          >
            &times;
          </button>
        </div>

        {/* Resumen del Evento */}
        <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2.5 text-xs text-slate-700">
          <div className="flex items-center justify-between pb-2 border-b border-slate-200/60">
            <span className="font-bold text-slate-900 flex items-center gap-1.5">
              <Plane className="w-4 h-4 text-[#0B2F64]" />
              {itinerary.avion_matricula} ({itinerary.avion_modelo || 'Aeronave SkyOps'})
            </span>
            <span className="px-2 py-0.5 bg-blue-100 text-blue-800 rounded-full font-bold text-[11px]">
              {itinerary.tipo_evento?.toUpperCase() || 'VUELO'}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2 pt-1">
            <div className="flex items-start gap-1.5">
              <Clock className="w-3.5 h-3.5 text-slate-400 mt-0.5 flex-shrink-0" />
              <div>
                <span className="text-slate-500 block text-[11px]">Fecha y Horario:</span>
                <span className="font-semibold text-slate-900">
                  {itinerary.fecha} • {itinerary.hora_inicio} - {itinerary.hora_fin}
                </span>
              </div>
            </div>

            <div className="flex items-start gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-slate-400 mt-0.5 flex-shrink-0" />
              <div>
                <span className="text-slate-500 block text-[11px]">Ruta / Ubicación:</span>
                <span className="font-semibold text-slate-900">
                  {itinerary.ruta || 'MPMG - Tráfico Local'}
                </span>
              </div>
            </div>
          </div>

          <div className="pt-2 border-t border-slate-200/60 space-y-1">
            <div className="flex items-center gap-1.5 text-slate-600">
              <Users className="w-3.5 h-3.5 text-slate-400" />
              <span>
                <strong>Alumno:</strong> {itinerary.estudiante_nombre}
                {studentUser?.correo ? ` (${studentUser.correo})` : ''}
              </span>
            </div>
            <div className="flex items-center gap-1.5 text-slate-600">
              <Users className="w-3.5 h-3.5 text-slate-400" />
              <span>
                <strong>Instructor CFI:</strong> {itinerary.instructor_nombre}
                {instructorUser?.correo ? ` (${instructorUser.correo})` : ''}
              </span>
            </div>
            {itinerary.mision && (
              <div className="text-slate-600">
                <strong>Misión:</strong> {itinerary.mision}
              </div>
            )}
          </div>
        </div>

        {/* Botones de Acción */}
        <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-100">
          <button
            type="button"
            onClick={onClose}
            disabled={isLoading}
            className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer transition-colors"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isLoading}
            className="flex items-center gap-1.5 px-5 py-2 text-xs font-bold bg-[#0B2F64] hover:bg-[#08234a] text-white rounded-xl shadow-xs cursor-pointer transition-all disabled:opacity-50"
          >
            {isLoading ? (
              <>
                <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>Sincronizando...</span>
              </>
            ) : (
              <>
                <CheckCircle className="w-4 h-4" />
                <span>{isUpdating ? 'Actualizar en Calendar' : 'Sincronizar con Google Calendar'}</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
