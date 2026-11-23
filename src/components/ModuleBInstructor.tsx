import React, { useState, useEffect } from 'react';
import { User, InstructorDualGivenStats, FlightProgress } from '../types';
import { api } from '../services/api';
import { useLanguage } from '../i18n/LanguageContext';
import {
  ShieldAlert,
  ShieldCheck,
  Clock,
  Award,
  Users,
  Calendar,
  AlertTriangle,
  FileCheck2,
  Plane,
  TrendingUp,
  CheckCircle,
  ExternalLink,
  Edit3,
  Save,
  DollarSign,
  Receipt
} from 'lucide-react';
import { InstructorFeeManager } from './InstructorFeeManager';

interface ModuleBInstructorProps {
  currentUser: User;
  allUsers: User[];
  onOpenFlightSheet?: (sheetId: string) => void;
  onOpenNewItinerary?: (instructorId: string, studentId?: string) => void;
  onUserUpdated?: () => void;
}

export const ModuleBInstructor: React.FC<ModuleBInstructorProps> = ({
  currentUser,
  allUsers,
  onOpenFlightSheet,
  onOpenNewItinerary,
  onUserUpdated
}) => {
  const { t, language } = useLanguage();
  const [selectedInstructorId, setSelectedInstructorId] = useState<string>(
    (currentUser.rol === 'instructor' || currentUser.rol === 'instructor_en_jefe')
      ? currentUser.id
      : allUsers.find(u => u.rol === 'instructor' || u.rol === 'instructor_en_jefe')?.id || ''
  );
  const [stats, setStats] = useState<InstructorDualGivenStats | null>(null);
  const [pendingSheets, setPendingSheets] = useState<FlightProgress[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'honorarios' | 'operacional'>('honorarios');

  // Edición de Vigencias
  const [isEditingDoc, setIsEditingDoc] = useState(false);
  const [vencMedico, setVencMedico] = useState('');
  const [vencLicencia, setVencLicencia] = useState('');
  const [licenciaNum, setLicenciaNum] = useState('');
  const [saveSuccessMsg, setSaveSuccessMsg] = useState('');
  const [saveErrorMsg, setSaveErrorMsg] = useState('');

  const instructor = allUsers.find(u => u.id === selectedInstructorId) || currentUser;
  const todayStr = new Date().toISOString().split('T')[0];

  // Chequeo de Vigencias (Hard Lock)
  const isMedicoVencido = instructor.vencimiento_medico ? instructor.vencimiento_medico < todayStr : false;
  const isLicenciaVencida = instructor.vencimiento_licencia ? instructor.vencimiento_licencia < todayStr : false;
  const isHardLocked = isMedicoVencido || isLicenciaVencida;

  const loadInstructorData = async () => {
    if (!selectedInstructorId) return;
    setLoading(true);
    try {
      const [dualStats, allSheets] = await Promise.all([
        api.getInstructorDualStats(selectedInstructorId),
        api.getFlightProgress()
      ]);
      setStats(dualStats);

      // Hojas pendientes de validación para este instructor
      const pending = allSheets.filter(
        s => s.instructor_id === selectedInstructorId && s.estado === 'pendiente_validacion'
      );
      setPendingSheets(pending);

      if (instructor) {
        setVencMedico(instructor.vencimiento_medico || '');
        setVencLicencia(instructor.vencimiento_licencia || '');
        setLicenciaNum(instructor.licencia || '');
      }
    } catch (err) {
      console.error('Error al cargar datos de instructor:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadInstructorData();
  }, [selectedInstructorId, currentUser]);

  const handleSaveVigencias = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaveErrorMsg('');
    try {
      await api.updateUser(instructor.id, {
        vencimiento_medico: vencMedico,
        vencimiento_licencia: vencLicencia,
        licencia: licenciaNum
      });
      setIsEditingDoc(false);
      setSaveSuccessMsg('Vigencias aeronáuticas actualizadas con éxito.');
      setTimeout(() => setSaveSuccessMsg(''), 4000);
      if (onUserUpdated) onUserUpdated();
      loadInstructorData();
    } catch (err: any) {
      setSaveErrorMsg('Error al actualizar vigencias: ' + (err.message || 'Intente nuevamente'));
    }
  };

  const calculateDaysRemaining = (dateStr?: string) => {
    if (!dateStr) return { days: 0, expired: false, text: 'No registrado' };
    const target = new Date(dateStr).getTime();
    const today = new Date(todayStr).getTime();
    const diffDays = Math.ceil((target - today) / (1000 * 60 * 60 * 24));

    if (diffDays < 0) {
      return { days: Math.abs(diffDays), expired: true, text: `VENCIDO hace ${Math.abs(diffDays)} días` };
    }
    return { days: diffDays, expired: false, text: `${diffDays} días restantes` };
  };

  const medicoStatus = calculateDaysRemaining(instructor.vencimiento_medico);
  const licenciaStatus = calculateDaysRemaining(instructor.vencimiento_licencia);

  // Alumnos asignados a este instructor
  const assignedStudents = allUsers.filter(
    u => u.rol === 'estudiante' && (u.instructor_asignado_id === instructor.id || currentUser.rol === 'admin')
  );

  return (
    <div className="space-y-6">
      {/* Header y Selector de Instructor si es Admin */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Clock className="w-6 h-6 text-sky-600" />
            <h1 className="text-xl font-bold text-slate-800">Portal del Instructor</h1>
          </div>
        </div>

        {currentUser.rol === 'admin' && (
          <div className="flex items-center gap-2 text-xs">
            <span className="font-semibold text-slate-600">Ver Instructor:</span>
            <select
              className="px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg font-medium text-slate-800 focus:outline-none"
              value={selectedInstructorId}
              onChange={(e) => setSelectedInstructorId(e.target.value)}
            >
              {allUsers.filter(u => u.rol === 'instructor').map(i => (
                <option key={i.id} value={i.id}>{i.nombre}</option>
              ))}
            </select>
          </div>
        )}
      </div>

      {saveSuccessMsg && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-emerald-800 text-sm flex items-center gap-2">
          <CheckCircle className="w-5 h-5 text-emerald-600" />
          <span>{saveSuccessMsg}</span>
        </div>
      )}

      {saveErrorMsg && (
        <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-rose-800 text-sm flex items-center gap-2">
          <AlertTriangle className="w-5 h-5 text-rose-600" />
          <span>{saveErrorMsg}</span>
        </div>
      )}

      {/* PESTAÑAS DE NAVEGACIÓN: HONORARIOS (BITÁCORAS) VS CONTROL OPERACIONAL Y VIGENCIAS */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2 flex-wrap">
        <button
          type="button"
          onClick={() => setActiveTab('honorarios')}
          className={`px-4 py-2.5 rounded-xl text-xs font-black transition-all flex items-center gap-2 cursor-pointer shadow-xs ${
            activeTab === 'honorarios'
              ? 'bg-gradient-to-r from-sky-600 to-blue-700 text-white shadow-sky-500/20'
              : 'bg-white text-slate-700 hover:bg-slate-50 border border-slate-200'
          }`}
        >
          <Receipt className="w-4 h-4 text-amber-300" />
          <span>Honorarios y Liquidaciones (Bitácoras de Vuelo)</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('operacional')}
          className={`px-4 py-2.5 rounded-xl text-xs font-black transition-all flex items-center gap-2 cursor-pointer shadow-xs ${
            activeTab === 'operacional'
              ? 'bg-gradient-to-r from-sky-600 to-blue-700 text-white shadow-sky-500/20'
              : 'bg-white text-slate-700 hover:bg-slate-50 border border-slate-200'
          }`}
        >
          <ShieldCheck className="w-4 h-4 text-emerald-500" />
          <span>Vigencias Médicas, Licencias y Seguridad</span>
        </button>
      </div>

      {activeTab === 'honorarios' ? (
        <InstructorFeeManager
          currentUser={currentUser}
          allUsers={allUsers}
          defaultInstructorId={selectedInstructorId}
          mode={['admin', 'escuela', 'contabilidad'].includes(currentUser.rol) ? 'accounting' : 'instructor'}
          onUpdated={loadInstructorData}
        />
      ) : (
        <>
          {/* PANEL DE VIGENCIAS AERONÁUTICAS (HARD LOCK) */}
          <div className={`p-6 rounded-2xl border ${
            isHardLocked
              ? 'bg-rose-50/80 border-rose-300 shadow-sm'
              : 'bg-white border-slate-200 shadow-sm'
          }`}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-200/80">
          <div className="flex items-center gap-3">
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
              isHardLocked ? 'bg-rose-600 text-white shadow-md animate-pulse' : 'bg-emerald-600 text-white'
            }`}>
              {isHardLocked ? <ShieldAlert className="w-7 h-7" /> : <ShieldCheck className="w-7 h-7" />}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-bold text-slate-900 text-base sm:text-lg">
                  Estado de Vigencias y Seguridad: {instructor.nombre}
                </h2>
                {isHardLocked ? (
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-extrabold bg-rose-600 text-white shadow-xs">
                    HARD LOCK ACTIVO
                  </span>
                ) : (
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
                    Habilitado para Despacho
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Licencia: <strong>{instructor.licencia || 'CFI'}</strong>
              </p>
            </div>
          </div>

          <button
            onClick={() => setIsEditingDoc(!isEditingDoc)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg border border-slate-300 transition-colors self-start sm:self-auto cursor-pointer"
          >
            <Edit3 className="w-3.5 h-3.5" />
            <span>{isEditingDoc ? 'Cerrar Edición' : 'Actualizar Vigencias'}</span>
          </button>
        </div>

        {/* ALERTA ROJA EN CASO DE HARD LOCK */}
        {isHardLocked && (
          <div className="mt-4 p-3.5 bg-rose-600 text-white rounded-xl shadow-xs flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 flex-shrink-0" />
            <div className="text-xs sm:text-sm font-bold">
              Bloqueo Operacional: Vigencia médica o licencia vencida.
            </div>
          </div>
        )}

        {/* TARJETAS DE VIGENCIAS */}
        {!isEditingDoc ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
            {/* Certificado Médico */}
            <div className={`p-4 rounded-xl border ${
              medicoStatus.expired
                ? 'bg-rose-100/50 border-rose-300 text-rose-900'
                : 'bg-slate-50 border-slate-200 text-slate-800'
            }`}>
              <div className="flex justify-between items-start">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Certificado Médico Clase 1
                </span>
                <span className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                  medicoStatus.expired ? 'bg-rose-600 text-white' : 'bg-emerald-100 text-emerald-800'
                }`}>
                  {medicoStatus.expired ? 'VENCIDO' : 'VIGENTE'}
                </span>
              </div>
              <div className="text-lg font-bold mt-2">
                {instructor.vencimiento_medico || 'No registrado'}
              </div>
              <div className="text-xs mt-1 font-medium">
                {medicoStatus.text}
              </div>
            </div>

            {/* Licencia de Instructor */}
            <div className={`p-4 rounded-xl border ${
              licenciaStatus.expired
                ? 'bg-rose-100/50 border-rose-300 text-rose-900'
                : 'bg-slate-50 border-slate-200 text-slate-800'
            }`}>
              <div className="flex justify-between items-start">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Licencia CFI / Chequeo de Competencia
                </span>
                <span className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                  licenciaStatus.expired ? 'bg-rose-600 text-white' : 'bg-emerald-100 text-emerald-800'
                }`}>
                  {licenciaStatus.expired ? 'VENCIDO' : 'VIGENTE'}
                </span>
              </div>
              <div className="text-lg font-bold mt-2">
                {instructor.vencimiento_licencia || 'No registrado'}
              </div>
              <div className="text-xs mt-1 font-medium">
                {licenciaStatus.text}
              </div>
            </div>
          </div>
        ) : (
          /* Formulario de actualización de vigencias */
          <form onSubmit={handleSaveVigencias} className="mt-4 p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-4">
            <h3 className="text-xs font-bold uppercase text-slate-700">Registrar Nuevas Fechas de Vencimiento</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Número de Licencia</label>
                <input
                  type="text"
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm"
                  value={licenciaNum}
                  onChange={(e) => setLicenciaNum(e.target.value)}
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Vencimiento Médico Clase 1 *</label>
                <input
                  type="date"
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm"
                  value={vencMedico}
                  onChange={(e) => setVencMedico(e.target.value)}
                  required
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Vencimiento Licencia / Chequeo *</label>
                <input
                  type="date"
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm"
                  value={vencLicencia}
                  onChange={(e) => setVencLicencia(e.target.value)}
                  required
                />
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsEditingDoc(false)}
                className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-200 rounded-lg"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-4 py-1.5 bg-sky-600 hover:bg-sky-700 text-white font-semibold text-xs rounded-lg flex items-center gap-1.5"
              >
                <Save className="w-3.5 h-3.5" />
                <span>Guardar y Actualizar Vigencias</span>
              </button>
            </div>
          </form>
        )}
      </div>

      {/* WIDGET CONTADOR DE HORAS Y HONORARIOS (BITÁCORAS ADMINISTRACIÓN) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-sky-600" />
              <h2 className="font-bold text-slate-800 text-base">
                Horas y Honorarios Certificados
              </h2>
            </div>
            <span className="text-xs font-semibold px-2.5 py-1 rounded bg-slate-100 text-slate-700 border border-slate-200 tabular-nums">
              Mes: {stats?.mes || new Date().toISOString().substring(0, 7)}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="bg-slate-50 p-5 rounded-xl border border-slate-200">
              <span className="text-xs font-semibold text-slate-600 uppercase tracking-wider">Horas Registradas (Mes)</span>
              <div className="text-3xl sm:text-4xl font-extrabold text-slate-900 mt-2 tabular-nums">
                {stats?.total_horas_dual.toFixed(1) || '0.0'} <span className="text-sm font-normal text-slate-600">hrs</span>
              </div>
              <div className="text-xs text-slate-600 mt-1 font-medium tabular-nums">
                {stats?.total_vuelos_realizados || 0} bitácoras
              </div>
            </div>

            <div className="bg-emerald-50/70 p-5 rounded-xl border border-emerald-200">
              <span className="text-xs font-semibold text-emerald-800 uppercase tracking-wider">Honorarios Netos</span>
              <div className="text-3xl sm:text-4xl font-extrabold text-emerald-900 mt-2 tabular-nums">
                ${(stats?.total_honorarios_mes ?? 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} <span className="text-sm font-normal text-emerald-700">USD</span>
              </div>
            </div>
          </div>

          {/* Desglose por Estudiante */}
          <div className="pt-2">
            <h3 className="text-xs font-bold uppercase text-slate-700 mb-2">Desglose por Estudiante</h3>
            <div className="space-y-2">
              {stats?.desglose_por_alumno && stats.desglose_por_alumno.length > 0 ? (
                stats.desglose_por_alumno.map(item => (
                  <div key={item.estudiante_id} className="flex items-center justify-between p-2.5 bg-slate-50 rounded-lg border border-slate-200 text-xs">
                    <div className="flex items-center gap-2">
                      <Users className="w-4 h-4 text-slate-500" />
                      <span className="font-semibold text-slate-800">{item.estudiante_nombre}</span>
                    </div>
                    <div className="flex items-center gap-4 text-slate-600 tabular-nums">
                      <span>{item.misiones} bitácora(s)</span>
                      <span className="font-bold text-sky-700">{item.horas_dual.toFixed(1)} hrs</span>
                      <span className="font-bold text-emerald-700">${(item.monto_honorarios ?? 0).toFixed(2)} USD</span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-xs text-slate-400 p-3 text-center bg-slate-50 rounded-lg">
                  Sin honorarios ni bitácoras registradas por Administración en este período.
                </div>
              )}
            </div>
          </div>
        </div>

        {/* HOJAS PENDIENTES DE VALIDACIÓN / FIRMA */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <FileCheck2 className="w-5 h-5 text-amber-600" />
                <h3 className="font-bold text-slate-800 text-sm">Hojas Pendientes de Firma</h3>
              </div>
              <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800">
                {pendingSheets.length}
              </span>
            </div>

            <div className="mt-3 space-y-2.5">
              {pendingSheets.length > 0 ? (
                pendingSheets.map(sheet => (
                  <div key={sheet.id} className="p-3 bg-amber-50/60 rounded-xl border border-amber-200 text-xs space-y-1.5">
                    <div className="flex justify-between font-semibold text-slate-800">
                      <span>Lección #{sheet.leccion_num} - {sheet.curso}</span>
                      <span className="text-slate-500">{sheet.fecha}</span>
                    </div>
                    <div className="text-slate-600">
                      Alumno: <strong>{sheet.estudiante_nombre}</strong> ({sheet.matricula})
                    </div>
                    <div className="flex justify-between items-center pt-1">
                      <span className="text-sky-700 font-bold">{sheet.tiempos_vuelo.vuelo_actual} hrs</span>
                      <button
                        onClick={() => onOpenFlightSheet && onOpenFlightSheet(sheet.id)}
                        disabled={isHardLocked}
                        className={`px-3 py-1 text-xs font-semibold rounded-md transition-colors ${
                          isHardLocked
                            ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                            : 'bg-amber-600 hover:bg-amber-700 text-white cursor-pointer'
                        }`}
                      >
                        {isHardLocked ? 'Bloqueado' : 'Revisar y Validar'}
                      </button>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-xs text-slate-400 text-center py-6">
                  No tienes hojas pendientes de validación.
                </div>
              )}
            </div>
          </div>

          {onOpenNewItinerary && (
            <button
              onClick={() => onOpenNewItinerary(instructor.id)}
              disabled={isHardLocked}
              className={`w-full py-2.5 text-xs font-bold rounded-xl shadow-xs transition-colors flex items-center justify-center gap-2 ${
                isHardLocked
                  ? 'bg-slate-200 text-slate-400 cursor-not-allowed border border-slate-300'
                  : 'bg-sky-600 hover:bg-sky-700 text-white cursor-pointer'
              }`}
            >
              <Calendar className="w-4 h-4" />
              <span>{isHardLocked ? 'Agendamiento Bloqueado' : 'Programar Vuelo'}</span>
            </button>
          )}
        </div>
      </div>

      {/* LISTA DE ESTUDIANTES ASIGNADOS */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-sky-600" />
            <h3 className="font-bold text-slate-800 text-base">Alumnos Asignados y Progreso Académico</h3>
          </div>
          <span className="text-xs text-slate-500">{assignedStudents.length} estudiantes activos</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {assignedStudents.map(student => (
            <div key={student.id} className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-slate-50 transition-colors space-y-3">
              <div className="flex items-center gap-3">
                <img
                  src={student.foto_perfil || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150'}
                  alt={student.nombre}
                  className="w-10 h-10 rounded-full object-cover border border-slate-300"
                />
                <div>
                  <h4 className="font-bold text-slate-800 text-sm">{student.nombre}</h4>
                  <p className="text-xs text-sky-700 font-medium">Curso: {student.curso_actual || 'Piloto Comercial'}</p>
                </div>
              </div>

              {/* Barra de progreso */}
              <div>
                <div className="flex justify-between text-xs text-slate-600 mb-1">
                  <span>Progreso de Fase</span>
                  <span className="font-bold">
                    {student.curso_actual === 'Multi-Motor' ? '65%' : student.curso_actual === 'Privado' ? '40%' : '80%'}
                  </span>
                </div>
                <div className="w-full bg-slate-200 rounded-full h-2">
                  <div
                    className="bg-sky-600 h-2 rounded-full"
                    style={{ width: student.curso_actual === 'Multi-Motor' ? '65%' : student.curso_actual === 'Privado' ? '40%' : '80%' }}
                  />
                </div>
              </div>

              <div className="flex items-center justify-between text-xs text-slate-500 pt-2 border-t border-slate-200">
                <span>Tel: {student.telefono}</span>
                <button
                  onClick={() => onOpenNewItinerary && onOpenNewItinerary(instructor.id, student.id)}
                  disabled={isHardLocked}
                  className={`text-xs font-semibold ${
                    isHardLocked ? 'text-slate-400 cursor-not-allowed' : 'text-sky-600 hover:underline cursor-pointer'
                  }`}
                >
                  Agendar Vuelo
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  )}
</div>
);
};
