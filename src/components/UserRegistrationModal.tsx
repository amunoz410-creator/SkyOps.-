import React, { useState, useId } from 'react';
import { User, UserRole, EmergencyContact } from '../types';
import { useLanguage } from '../i18n/LanguageContext';
import { api } from '../services/api';
import {
  UserPlus,
  X,
  Users,
  HeartHandshake,
  FileText,
  KeyRound,
  Eye,
  EyeOff,
  Sparkles,
  Upload,
  Check,
  AlertCircle,
  CheckCircle2,
  Plane,
  GraduationCap,
  Shield,
  ShieldCheck,
  Briefcase,
  DollarSign,
  Plus,
  Trash2,
  Copy,
  Calendar,
  Phone,
  Mail,
  CreditCard,
  Building2,
  Lock,
  Wrench
} from 'lucide-react';

interface UserRegistrationModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: User;
  allUsers: User[];
  onUserCreated: () => Promise<void>;
  initialRole?: UserRole;
}

export const UserRegistrationModal: React.FC<UserRegistrationModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  allUsers,
  onUserCreated,
  initialRole = 'estudiante'
}) => {
  const { t, language } = useLanguage();
  const isJefatura = currentUser.rol === 'admin';
  const hasCreationPermission = isJefatura || Boolean(currentUser.puede_crear_usuarios) || Boolean(currentUser.permisos_delegados?.crear_usuarios);

  // Active form tab
  const [activeTab, setActiveTab] = useState<'credentials' | 'personal' | 'aero' | 'summary'>('credentials');

  // Form State
  const [formData, setFormData] = useState<{
    nombre: string;
    rol: UserRole;
    correo: string;
    telefono: string;
    documento_identidad: string;
    password: string;
    direccion_residencial: string;
    fecha_ingreso: string;
    foto_perfil: string;
    // Estudiante specific
    curso_actual: string;
    instructor_asignado_id: string;
    saldo_inicial: string;
    // Instructor specific
    tarifa_hora_dual: string;
    habilitaciones: string[];
    // Administrative specific
    cargo_departamento: string;
    puede_crear_usuarios: boolean;
    // Documentos Aeronáuticos (Licencia & Médico)
    licencia: string;
    vencimiento_licencia: string;
    foto_licencia: string;
    numero_medico: string;
    clase_medica: '1' | '2' | '3';
    vencimiento_medico: string;
    foto_medico: string;
    // Contactos de emergencia
    contactos_emergencia: EmergencyContact[];
  }>({
    nombre: '',
    rol: initialRole,
    correo: '',
    telefono: '',
    documento_identidad: '',
    password: '',
    direccion_residencial: '',
    fecha_ingreso: new Date().toISOString().split('T')[0],
    foto_perfil: '',
    curso_actual: 'Privado',
    instructor_asignado_id: '',
    saldo_inicial: '0',
    tarifa_hora_dual: '35.00',
    habilitaciones: ['CFI', 'VFR'],
    cargo_departamento: '',
    puede_crear_usuarios: false,
    licencia: '',
    vencimiento_licencia: '',
    foto_licencia: '',
    numero_medico: '',
    clase_medica: initialRole === 'instructor' ? '1' : '2',
    vencimiento_medico: '',
    foto_medico: '',
    contactos_emergencia: [
      { nombre: '', parentesco: 'Padre', telefono: '', telefono_secundario: '' }
    ]
  });

  // UI States
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successData, setSuccessData] = useState<{
    user: User;
    rawPassword: string;
  } | null>(null);
  const [copiedCredentials, setCopiedCredentials] = useState(false);

  // Instructors list for student assignment
  const instructorsList = allUsers.filter(u => (u.rol === 'instructor' || u.rol === 'instructor_en_jefe') && u.activo !== false);

  if (!isOpen) return null;

  // Generate secure random password
  const handleGeneratePassword = () => {
    const prefixes = ['SkyOps', 'AeroPanama', 'FlyPilot', 'AlphaBravo', 'PanamaSky', 'FlightCrew'];
    const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
    const num = Math.floor(100 + Math.random() * 900);
    const symbols = ['#', '!', '.', '$', '&'];
    const symbol = symbols[Math.floor(Math.random() * symbols.length)];
    const generated = `${prefix}${num}${symbol}`;
    setFormData(prev => ({ ...prev, password: generated }));
    setShowPassword(true);
  };

  // Image Upload helper
  const handleFileUpload = (
    e: React.ChangeEvent<HTMLInputElement>,
    field: 'foto_perfil' | 'foto_licencia' | 'foto_medico'
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      if (event.target?.result) {
        setFormData(prev => ({ ...prev, [field]: event.target?.result as string }));
      }
    };
    reader.readAsDataURL(file);
  };

  // Emergency contact handlers
  const handleAddEmergencyContact = () => {
    setFormData(prev => ({
      ...prev,
      contactos_emergencia: [
        ...prev.contactos_emergencia,
        { nombre: '', parentesco: 'Familiar', telefono: '', telefono_secundario: '' }
      ]
    }));
  };

  const handleRemoveEmergencyContact = (idx: number) => {
    setFormData(prev => ({
      ...prev,
      contactos_emergencia: prev.contactos_emergencia.filter((_, i) => i !== idx)
    }));
  };

  const handleContactChange = (idx: number, key: keyof EmergencyContact, value: string) => {
    setFormData(prev => {
      const updated = [...prev.contactos_emergencia];
      updated[idx] = { ...updated[idx], [key]: value };
      return { ...prev, contactos_emergencia: updated };
    });
  };

  // Toggle rating for instructors
  const toggleHabilitacion = (hab: string) => {
    setFormData(prev => {
      const exists = prev.habilitaciones.includes(hab);
      const nextHabs = exists
        ? prev.habilitaciones.filter(h => h !== hab)
        : [...prev.habilitaciones, hab];
      return { ...prev, habilitaciones: nextHabs };
    });
  };

  // Submit Handler
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    // Validaciones primarias
    if (!formData.nombre.trim()) {
      setErrorMessage(language === 'es' ? 'El nombre completo es obligatorio.' : 'Full name is required.');
      setActiveTab('credentials');
      return;
    }
    if (!formData.correo.trim()) {
      setErrorMessage(language === 'es' ? 'El correo institucional es obligatorio.' : 'Institutional email is required.');
      setActiveTab('credentials');
      return;
    }
    if (!formData.documento_identidad.trim()) {
      setErrorMessage(
        language === 'es'
          ? 'El número de cédula o pasaporte es obligatorio para la identificación y acceso del usuario.'
          : 'National ID or Passport is required for user identification and login.'
      );
      setActiveTab('credentials');
      return;
    }
    if (!formData.password.trim()) {
      setErrorMessage(language === 'es' ? 'La contraseña inicial es requerida.' : 'Initial password is required.');
      setActiveTab('credentials');
      return;
    }
    if (!formData.telefono.trim()) {
      setErrorMessage(language === 'es' ? 'El número de teléfono es obligatorio.' : 'Phone number is required.');
      setActiveTab('personal');
      return;
    }

    // Role security check: Non-admin users cannot grant admin roles
    if (!isJefatura && formData.rol === 'admin') {
      setErrorMessage(
        language === 'es'
          ? 'Solo la Jefatura de Operaciones puede asignar el rol de Administrador.'
          : 'Only Jefatura can assign the Administrator role.'
      );
      return;
    }

    setIsSubmitting(true);

    try {
      const payload: Partial<User> & Record<string, any> = {
        nombre: formData.nombre.trim(),
        rol: formData.rol,
        correo: formData.correo.trim().toLowerCase(),
        telefono: formData.telefono.trim(),
        documento_identidad: formData.documento_identidad.trim(),
        password: formData.password.trim(),
        direccion_residencial: formData.direccion_residencial.trim(),
        fecha_ingreso: formData.fecha_ingreso,
        foto_perfil: formData.foto_perfil || undefined,
        activo: true,
        auth_provider: 'local',
        estado_autorizacion: 'aprobado',
        contactos_emergencia: formData.contactos_emergencia.filter(c => c.nombre.trim() && c.telefono.trim())
      };

      // Si es estudiante
      if (formData.rol === 'estudiante') {
        payload.curso_actual = formData.curso_actual;
        payload.instructor_asignado_id = formData.instructor_asignado_id || undefined;
        payload.numero_medico = formData.numero_medico || undefined;
        payload.vencimiento_medico = formData.vencimiento_medico || undefined;
        payload.foto_medico = formData.foto_medico || undefined;
        payload.licencia = formData.licencia || undefined;
        payload.vencimiento_licencia = formData.vencimiento_licencia || undefined;
        payload.foto_licencia = formData.foto_licencia || undefined;
        if (Number(formData.saldo_inicial) > 0) {
          payload.saldo_inicial = Number(formData.saldo_inicial);
          payload.creado_por = currentUser.nombre;
        }
      }

      // Si es instructor o instructor en jefe
      if (formData.rol === 'instructor' || formData.rol === 'instructor_en_jefe') {
        payload.licencia = formData.licencia || 'CPL-PENDIENTE';
        payload.vencimiento_licencia = formData.vencimiento_licencia || undefined;
        payload.foto_licencia = formData.foto_licencia || undefined;
        payload.numero_medico = formData.numero_medico || undefined;
        payload.vencimiento_medico = formData.vencimiento_medico || undefined;
        payload.foto_medico = formData.foto_medico || undefined;
        payload.habilitaciones = formData.habilitaciones;
        payload.tarifa_hora_dual = Number(formData.tarifa_hora_dual) || 35;
        if (formData.rol === 'instructor_en_jefe') {
          payload.cargo_departamento = formData.cargo_departamento || 'Jefatura de Pilotos e Instructores';
        }
      }

      // Si es rol administrativo o de taller
      if (formData.rol === 'mantenimiento' || formData.rol === 'escuela' || formData.rol === 'contabilidad' || formData.rol === 'admin') {
        payload.cargo_departamento = formData.cargo_departamento || (formData.rol === 'mantenimiento' ? 'Taller Aeronáutico (TMA / OMA)' : undefined);
        if (formData.licencia) {
          payload.licencia = formData.licencia;
          payload.vencimiento_licencia = formData.vencimiento_licencia || undefined;
        }
        // Asignación de permisos de creación (solo Jefatura puede otorgarlo)
        if (isJefatura && (formData.rol === 'escuela' || formData.rol === 'contabilidad')) {
          payload.puede_crear_usuarios = formData.puede_crear_usuarios;
          payload.permisos_delegados = {
            crear_usuarios: formData.puede_crear_usuarios,
            asignado_por: currentUser.nombre,
            fecha_asignacion: new Date().toISOString()
          };
        }
      }

      const created = await api.createUser(payload);
      await onUserCreated();

      setSuccessData({
        user: created,
        rawPassword: formData.password
      });
      setActiveTab('summary');
    } catch (err: any) {
      console.error('Error al registrar usuario:', err);
      setErrorMessage(err.message || 'Error al procesar el registro.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Copy credentials to clipboard
  const handleCopyCredentials = () => {
    if (!successData) return;
    const text = `CREDENCIALES DE ACCESO SKYOPS\n` +
      `Nombre: ${successData.user.nombre}\n` +
      `Rol: ${successData.user.rol.toUpperCase()}\n` +
      `Usuario / Correo: ${successData.user.correo}\n` +
      `Cédula / Documento: ${successData.user.documento_identidad || 'N/A'}\n` +
      `Contraseña: ${successData.rawPassword}\n` +
      `Enlace de Ingreso: https://skyops.aero`;
    navigator.clipboard.writeText(text);
    setCopiedCredentials(true);
    setTimeout(() => setCopiedCredentials(false), 2500);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl max-w-4xl w-full my-auto overflow-hidden flex flex-col max-h-[92vh]">
        
        {/* MODAL HEADER */}
        <div className="px-5 py-4 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-sky-500/20 text-sky-400 border border-sky-400/30 flex items-center justify-center shadow-inner">
              <UserPlus className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-bold text-white tracking-tight">
                  {language === 'es' ? 'Formulario de Registro Completo de Cuenta' : 'Complete Account Registration Form'}
                </h3>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* SECURITY & AUTHORIZATION BANNER */}
        <div className="px-5 py-2.5 bg-slate-100 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300">
            <ShieldCheck className="w-4 h-4 text-emerald-500 flex-shrink-0" />
            <span>
              <strong>{language === 'es' ? 'Oficial Responsable:' : 'Authorizing Officer:'}</strong> {currentUser.nombre} ({currentUser.rol.toUpperCase()})
            </span>
          </div>
          {isJefatura ? (
            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-purple-700 dark:text-purple-300 bg-purple-100 dark:bg-purple-950/60 px-2 py-0.5 rounded-md border border-purple-200 dark:border-purple-800">
              <Shield className="w-3 h-3 text-purple-500" />
              {language === 'es' ? 'Autoridad Plena Jefatura' : 'Jefatura Master Authority'}
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-sky-700 dark:text-sky-300 bg-sky-100 dark:bg-sky-950/60 px-2 py-0.5 rounded-md border border-sky-200 dark:border-sky-800">
              <Check className="w-3 h-3 text-sky-500" />
              {language === 'es' ? 'Permiso Delegado por Jefatura' : 'Delegated by Jefatura'}
            </span>
          )}
        </div>

        {/* NAVIGATION TABS (If not in summary view) */}
        {activeTab !== 'summary' && (
          <div className="flex border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-4 sm:px-6 flex-shrink-0 gap-1 sm:gap-2 overflow-x-auto no-scrollbar">
            <button
              type="button"
              onClick={() => setActiveTab('credentials')}
              className={`py-3 px-3.5 text-xs font-bold border-b-2 transition-all cursor-pointer flex items-center gap-2 whitespace-nowrap ${
                activeTab === 'credentials'
                  ? 'border-sky-600 text-sky-600 dark:text-sky-400'
                  : 'border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <KeyRound className="w-4 h-4" />
              <span>{language === 'es' ? '1. Credenciales & Cuenta' : '1. Credentials & Account'}</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('personal')}
              className={`py-3 px-3.5 text-xs font-bold border-b-2 transition-all cursor-pointer flex items-center gap-2 whitespace-nowrap ${
                activeTab === 'personal'
                  ? 'border-sky-600 text-sky-600 dark:text-sky-400'
                  : 'border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Users className="w-4 h-4" />
              <span>{language === 'es' ? '2. Datos Personales & Contactos' : '2. Personal Data & Contacts'}</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('aero')}
              className={`py-3 px-3.5 text-xs font-bold border-b-2 transition-all cursor-pointer flex items-center gap-2 whitespace-nowrap ${
                activeTab === 'aero'
                  ? 'border-sky-600 text-sky-600 dark:text-sky-400'
                  : 'border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <FileText className="w-4 h-4" />
              <span>
                {formData.rol === 'estudiante'
                  ? (language === 'es' ? '3. Expediente de Estudiante' : '3. Student Record')
                  : (formData.rol === 'instructor' || formData.rol === 'instructor_en_jefe')
                  ? (language === 'es' ? '3. Expediente de Instructor CFI' : '3. Instructor Record')
                  : (language === 'es' ? '3. Expediente Administrativo' : '3. Administrative Record')}
              </span>
            </button>
          </div>
        )}

        {/* ERROR NOTIFICATION */}
        {errorMessage && (
          <div className="mx-6 mt-4 p-3.5 bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900 rounded-2xl text-rose-800 dark:text-rose-300 text-xs flex items-center gap-2.5">
            <AlertCircle className="w-4 h-4 text-rose-600 dark:text-rose-400 flex-shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* FORM CONTENT */}
        <form onSubmit={handleSubmit} className="flex-1 min-h-0 overflow-y-auto p-5 sm:p-6 space-y-6">
          
          {/* ============================================================ */}
          {/* TAB 1: CREDENCIALES, ACCESO & ROL                            */}
          {/* ============================================================ */}
          {activeTab === 'credentials' && (
            <div className="space-y-6">
              
              {/* Role Selection Interactive Cards */}
              <div>
                <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-2">
                  {language === 'es' ? 'Seleccionar Rol Institucional *' : 'Select Institutional Role *'}
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  
                  {/* Estudiante */}
                  <button
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, rol: 'estudiante', clase_medica: '2' }))}
                    className={`p-3 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                      formData.rol === 'estudiante'
                        ? 'border-amber-500 bg-amber-50/60 dark:bg-amber-950/30 text-amber-950 dark:text-amber-200 ring-2 ring-amber-500/20 shadow-xs'
                        : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <GraduationCap className={`w-5 h-5 ${formData.rol === 'estudiante' ? 'text-amber-600' : 'text-slate-400'}`} />
                      {formData.rol === 'estudiante' && <CheckCircle2 className="w-4 h-4 text-amber-600" />}
                    </div>
                    <div>
                      <span className="block text-xs font-bold">Piloto Alumno</span>
                      <span className="block text-[10px] text-slate-500 dark:text-slate-400">Estudiante</span>
                    </div>
                  </button>

                  {/* Instructor */}
                  <button
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, rol: 'instructor', clase_medica: '1' }))}
                    className={`p-3 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                      formData.rol === 'instructor'
                        ? 'border-sky-500 bg-sky-50/60 dark:bg-sky-950/30 text-sky-950 dark:text-sky-200 ring-2 ring-sky-500/20 shadow-xs'
                        : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <Plane className={`w-5 h-5 ${formData.rol === 'instructor' ? 'text-sky-600' : 'text-slate-400'}`} />
                      {formData.rol === 'instructor' && <CheckCircle2 className="w-4 h-4 text-sky-600" />}
                    </div>
                    <div>
                      <span className="block text-xs font-bold">Instructor CFI</span>
                      <span className="block text-[10px] text-slate-500 dark:text-slate-400">Piloto Instructor</span>
                    </div>
                  </button>

                  {/* Instructor en Jefe */}
                  <button
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, rol: 'instructor_en_jefe', clase_medica: '1' }))}
                    className={`p-3 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                      formData.rol === 'instructor_en_jefe'
                        ? 'border-indigo-500 bg-indigo-50/60 dark:bg-indigo-950/30 text-indigo-950 dark:text-indigo-200 ring-2 ring-indigo-500/20 shadow-xs'
                        : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <ShieldCheck className={`w-5 h-5 ${formData.rol === 'instructor_en_jefe' ? 'text-indigo-600' : 'text-slate-400'}`} />
                      {formData.rol === 'instructor_en_jefe' && <CheckCircle2 className="w-4 h-4 text-indigo-600" />}
                    </div>
                    <div>
                      <span className="block text-xs font-bold">Instructor en Jefe</span>
                      <span className="block text-[10px] text-slate-500 dark:text-slate-400">Jefe de Pilotos</span>
                    </div>
                  </button>

                  {/* Dirección de Escuela */}
                  <button
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, rol: 'escuela' }))}
                    className={`p-3 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                      formData.rol === 'escuela'
                        ? 'border-indigo-500 bg-indigo-50/60 dark:bg-indigo-950/30 text-indigo-950 dark:text-indigo-200 ring-2 ring-indigo-500/20 shadow-xs'
                        : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <Briefcase className={`w-5 h-5 ${formData.rol === 'escuela' ? 'text-indigo-600' : 'text-slate-400'}`} />
                      {formData.rol === 'escuela' && <CheckCircle2 className="w-4 h-4 text-indigo-600" />}
                    </div>
                    <div>
                      <span className="block text-xs font-bold">Dir. Escuela</span>
                      <span className="block text-[10px] text-slate-500 dark:text-slate-400">Operaciones de Vuelo</span>
                    </div>
                  </button>

                  {/* Contabilidad */}
                  <button
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, rol: 'contabilidad' }))}
                    className={`p-3 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                      formData.rol === 'contabilidad'
                        ? 'border-emerald-500 bg-emerald-50/60 dark:bg-emerald-950/30 text-emerald-950 dark:text-emerald-200 ring-2 ring-emerald-500/20 shadow-xs'
                        : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <DollarSign className={`w-5 h-5 ${formData.rol === 'contabilidad' ? 'text-emerald-600' : 'text-slate-400'}`} />
                      {formData.rol === 'contabilidad' && <CheckCircle2 className="w-4 h-4 text-emerald-600" />}
                    </div>
                    <div>
                      <span className="block text-xs font-bold">Contabilidad</span>
                      <span className="block text-[10px] text-slate-500 dark:text-slate-400">Finanzas y Conciliación</span>
                    </div>
                  </button>

                  {/* Taller / Mantenimiento TMA */}
                  <button
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, rol: 'mantenimiento' }))}
                    className={`p-3 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                      formData.rol === 'mantenimiento'
                        ? 'border-amber-500 bg-amber-50/60 dark:bg-amber-950/30 text-amber-950 dark:text-amber-200 ring-2 ring-amber-500/20 shadow-xs'
                        : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <Wrench className={`w-5 h-5 ${formData.rol === 'mantenimiento' ? 'text-amber-600' : 'text-slate-400'}`} />
                      {formData.rol === 'mantenimiento' && <CheckCircle2 className="w-4 h-4 text-amber-600" />}
                    </div>
                    <div>
                      <span className="block text-xs font-bold">Taller / TMA</span>
                      <span className="block text-[10px] text-slate-500 dark:text-slate-400">OMA Mantenimiento</span>
                    </div>
                  </button>

                  {/* Jefatura / Admin (Disabled if caller is not Jefatura) */}
                  <button
                    type="button"
                    disabled={!isJefatura}
                    onClick={() => isJefatura && setFormData(prev => ({ ...prev, rol: 'admin' }))}
                    className={`p-3 rounded-2xl border text-left transition-all flex flex-col justify-between ${
                      !isJefatura
                        ? 'opacity-40 bg-slate-50 dark:bg-slate-900 border-slate-200 cursor-not-allowed'
                        : formData.rol === 'admin'
                        ? 'border-purple-500 bg-purple-50/60 dark:bg-purple-950/30 text-purple-950 dark:text-purple-200 ring-2 ring-purple-500/20 shadow-xs cursor-pointer'
                        : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 cursor-pointer'
                    }`}
                    title={!isJefatura ? 'Solo Jefatura puede delegar el rol Administrador' : undefined}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <Shield className={`w-5 h-5 ${formData.rol === 'admin' ? 'text-purple-600' : 'text-slate-400'}`} />
                      {formData.rol === 'admin' && <CheckCircle2 className="w-4 h-4 text-purple-600" />}
                    </div>
                    <div>
                      <span className="block text-xs font-bold">Jefatura</span>
                      <span className="block text-[10px] text-slate-500 dark:text-slate-400">Administrador Master</span>
                    </div>
                  </button>
                </div>
              </div>

              {/* Login Fields: Correo institucional, Cédula/Documento, Contraseña */}
              <div className="p-4 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-slate-200 dark:border-slate-700/70 space-y-4">
                <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-700/60 pb-2">
                  <CreditCard className="w-4 h-4 text-sky-600" />
                  <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100">
                    {language === 'es' ? 'Datos de Ingreso y Autenticación Unificada' : 'Login and Authentication Identifiers'}
                  </h4>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Correo Institucional / Usuario */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      {language === 'es' ? 'Correo Electrónico Institucional / Usuario *' : 'Institutional Email / Username *'}
                    </label>
                    <div className="relative">
                      <input
                        type="email"
                        required
                        value={formData.correo}
                        onChange={(e) => setFormData(prev => ({ ...prev, correo: e.target.value }))}
                        placeholder="usuario@skyops.com"
                        className="w-full pl-9 pr-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:border-sky-500 shadow-2xs"
                      />
                      <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                    </div>
                  </div>

                  {/* Documento de Identidad / Cédula / Pasaporte */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      {language === 'es' ? 'Número de Cédula de Identidad o Pasaporte *' : 'National ID or Passport *'}
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        required
                        value={formData.documento_identidad}
                        onChange={(e) => setFormData(prev => ({ ...prev, documento_identidad: e.target.value }))}
                        placeholder="ej. 8-742-1980 / PE-12-345"
                        className="w-full pl-9 pr-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:border-sky-500 shadow-2xs font-mono"
                      />
                      <CreditCard className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                    </div>
                  </div>
                </div>

                {/* Contraseña de Acceso */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                      {language === 'es' ? 'Contraseña Inicial de Acceso *' : 'Initial Access Password *'}
                    </label>
                    <button
                      type="button"
                      onClick={handleGeneratePassword}
                      className="inline-flex items-center gap-1 text-sky-600 hover:text-sky-700 text-xs font-bold cursor-pointer"
                    >
                      <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                      <span>{language === 'es' ? 'Generar Contraseña Segura' : 'Generate Secure Password'}</span>
                    </button>
                  </div>
                  
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      value={formData.password}
                      onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
                      placeholder="Mínimo 6 caracteres (ej. SkyOps2026.)"
                      className="w-full pl-9 pr-10 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:border-sky-500 shadow-2xs font-mono"
                    />
                    <KeyRound className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 cursor-pointer"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              </div>

              {/* JEFATURA EXCLUSIVE: Delegation of User Creation Rights to Administrative Roles */}
              {isJefatura && (formData.rol === 'escuela' || formData.rol === 'contabilidad') && (
                <div className="p-4 bg-purple-50/70 dark:bg-purple-950/40 rounded-2xl border border-purple-200 dark:border-purple-800/80 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Shield className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                      <div>
                        <h4 className="text-xs font-bold text-purple-900 dark:text-purple-200">
                          {language === 'es' ? 'Delegación de Privilegios de Creación de Usuarios' : 'Delegation of User Creation Privileges'}
                        </h4>
                      </div>
                    </div>

                    <label className="relative inline-flex items-center cursor-pointer flex-shrink-0">
                      <input
                        type="checkbox"
                        checked={formData.puede_crear_usuarios}
                        onChange={(e) => setFormData(prev => ({ ...prev, puede_crear_usuarios: e.target.checked }))}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
                    </label>
                  </div>
                  {formData.puede_crear_usuarios && (
                    <div className="text-[11px] bg-white/70 dark:bg-purple-900/40 p-2.5 rounded-xl border border-purple-200 dark:border-purple-800 text-purple-800 dark:text-purple-200 flex items-center gap-1.5">
                      <Check className="w-3.5 h-3.5 text-purple-600 flex-shrink-0" />
                      <span>Este usuario tendrá acceso habilitado al botón de creación y formulario de registro completo.</span>
                    </div>
                  )}
                </div>
              )}

              {/* Botón para pasar a la pestaña siguiente */}
              <div className="flex justify-end pt-2">
                <button
                  type="button"
                  onClick={() => {
                    if (!formData.nombre.trim() || !formData.correo.trim() || !formData.documento_identidad.trim() || !formData.password.trim()) {
                      setErrorMessage('Por favor completa todos los campos requeridos de esta sección.');
                      return;
                    }
                    setErrorMessage('');
                    setActiveTab('personal');
                  }}
                  className="px-5 py-2.5 bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-xs font-bold rounded-xl hover:bg-slate-800 dark:hover:bg-slate-100 transition-colors cursor-pointer"
                >
                  {language === 'es' ? 'Siguiente: Datos Personales & Contactos →' : 'Next: Personal Data & Contacts →'}
                </button>
              </div>
            </div>
          )}

          {/* ============================================================ */}
          {/* TAB 2: DATOS PERSONALES & CONTACTOS DE EMERGENCIA            */}
          {/* ============================================================ */}
          {activeTab === 'personal' && (
            <div className="space-y-6">
              
              {/* Profile Photo & Full Name */}
              <div className="flex flex-col sm:flex-row items-center gap-4 p-4 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-slate-200 dark:border-slate-700/70">
                <div className="relative group w-20 h-20 rounded-2xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 flex items-center justify-center overflow-hidden shadow-xs flex-shrink-0">
                  {formData.foto_perfil ? (
                    <img
                      src={formData.foto_perfil}
                      alt="Avatar"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <Users className="w-8 h-8 text-slate-300 dark:text-slate-600" />
                  )}
                  <label className="absolute inset-0 bg-slate-950/60 opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center text-white text-[10px] cursor-pointer transition-opacity">
                    <Upload className="w-4 h-4 mb-0.5" />
                    <span>{t('changePhoto')}</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleFileUpload(e, 'foto_perfil')}
                      className="hidden"
                    />
                  </label>
                </div>

                <div className="flex-1 space-y-1 text-center sm:text-left">
                  <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200">{t('profilePhoto')}</h4>
                  <div className="pt-1">
                    <label className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white dark:bg-slate-800 hover:bg-slate-100 text-slate-700 dark:text-slate-200 text-xs font-semibold rounded-lg border border-slate-300 dark:border-slate-700 cursor-pointer shadow-2xs">
                      <Upload className="w-3.5 h-3.5" />
                      <span>{t('uploadDocument')}</span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => handleFileUpload(e, 'foto_perfil')}
                        className="hidden"
                      />
                    </label>
                  </div>
                </div>
              </div>

              {/* General Personal Information */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    {t('fullName')} *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.nombre}
                    onChange={(e) => setFormData(prev => ({ ...prev, nombre: e.target.value }))}
                    placeholder="ej. Daniel A. Alvarado Chen"
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800/60 border border-slate-300 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-slate-100 focus:bg-white dark:focus:bg-slate-900 focus:outline-none focus:border-sky-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    {t('phone')} / WhatsApp *
                  </label>
                  <div className="relative">
                    <input
                      type="tel"
                      required
                      value={formData.telefono}
                      onChange={(e) => setFormData(prev => ({ ...prev, telefono: e.target.value }))}
                      placeholder="+507 6123-4567"
                      className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-800/60 border border-slate-300 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-slate-100 focus:bg-white dark:focus:bg-slate-900 focus:outline-none focus:border-sky-500"
                    />
                    <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    {language === 'es' ? 'Fecha de Ingreso / Alta' : 'Enrollment / Hire Date'}
                  </label>
                  <div className="relative">
                    <input
                      type="date"
                      value={formData.fecha_ingreso}
                      onChange={(e) => setFormData(prev => ({ ...prev, fecha_ingreso: e.target.value }))}
                      className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-800/60 border border-slate-300 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-slate-100 focus:bg-white dark:focus:bg-slate-900 focus:outline-none focus:border-sky-500"
                    />
                    <Calendar className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    {language === 'es' ? 'Dirección Residencial Completa' : 'Residential Address'}
                  </label>
                  <input
                    type="text"
                    value={formData.direccion_residencial}
                    onChange={(e) => setFormData(prev => ({ ...prev, direccion_residencial: e.target.value }))}
                    placeholder="Calle, Edificio/Residencia, Ciudad, Provincia"
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800/60 border border-slate-300 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-slate-100 focus:bg-white dark:focus:bg-slate-900 focus:outline-none focus:border-sky-500"
                  />
                </div>
              </div>

              {/* Emergency Contacts Section */}
              <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-2">
                  <div>
                    <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                      <HeartHandshake className="w-4 h-4 text-rose-500" />
                      <span>{language === 'es' ? 'Contactos en Caso de Emergencia' : 'Emergency Contacts'}</span>
                    </h4>
                  </div>

                  <button
                    type="button"
                    onClick={handleAddEmergencyContact}
                    className="inline-flex items-center gap-1 px-3 py-1.5 bg-sky-50 dark:bg-sky-950/50 hover:bg-sky-100 text-sky-700 dark:text-sky-300 text-xs font-bold rounded-xl border border-sky-200 dark:border-sky-800 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>{t('addEmergencyContact')}</span>
                  </button>
                </div>

                {formData.contactos_emergencia.map((contact, index) => (
                  <div
                    key={index}
                    className="p-3.5 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-slate-200 dark:border-slate-700/60 space-y-3"
                  >
                    <div className="flex items-center justify-between text-xs font-bold text-slate-700 dark:text-slate-300">
                      <span>Contacto #{index + 1}</span>
                      {formData.contactos_emergencia.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveEmergencyContact(index)}
                          className="text-rose-500 hover:text-rose-700 p-1 cursor-pointer"
                          title="Eliminar contacto"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                      <div className="sm:col-span-1">
                        <label className="block text-[10px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                          {t('contactName')} *
                        </label>
                        <input
                          type="text"
                          required
                          value={contact.nombre}
                          onChange={(e) => handleContactChange(index, 'nombre', e.target.value)}
                          placeholder="ej. Roberto Alvarado"
                          className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:border-sky-500"
                        />
                      </div>

                      <div className="sm:col-span-1">
                        <label className="block text-[10px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                          {t('relationship')} *
                        </label>
                        <select
                          value={contact.parentesco}
                          onChange={(e) => handleContactChange(index, 'parentesco', e.target.value)}
                          className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-xs text-slate-900 dark:text-slate-100 font-semibold focus:outline-none cursor-pointer"
                        >
                          <option value="Padre">{t('kinshipFather')}</option>
                          <option value="Madre">{t('kinshipMother')}</option>
                          <option value="Cónyuge">{t('kinshipSpouse')}</option>
                          <option value="Hermano/a">{t('kinshipSibling')}</option>
                          <option value="Familiar">{t('kinshipRelative')}</option>
                          <option value="Tutor">{t('kinshipGuardian')}</option>
                          <option value="Otro">{t('kinshipOther')}</option>
                        </select>
                      </div>

                      <div className="sm:col-span-1">
                        <label className="block text-[10px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                          {t('emergencyPhone')} *
                        </label>
                        <input
                          type="tel"
                          required
                          value={contact.telefono}
                          onChange={(e) => handleContactChange(index, 'telefono', e.target.value)}
                          placeholder="+507 6700-1122"
                          className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:border-sky-500"
                        />
                      </div>

                      <div className="sm:col-span-1">
                        <label className="block text-[10px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                          {t('secondaryPhone')}
                        </label>
                        <input
                          type="tel"
                          value={contact.telefono_secundario || ''}
                          onChange={(e) => handleContactChange(index, 'telefono_secundario', e.target.value)}
                          placeholder="+507 290-4400"
                          className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:border-sky-500"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Botones de navegación de pestañas */}
              <div className="flex items-center justify-between pt-2">
                <button
                  type="button"
                  onClick={() => setActiveTab('credentials')}
                  className="px-4 py-2 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  ← Volver a Credenciales
                </button>

                <button
                  type="button"
                  onClick={() => {
                    if (!formData.telefono.trim()) {
                      setErrorMessage('El número de teléfono es requerido.');
                      return;
                    }
                    setErrorMessage('');
                    setActiveTab('aero');
                  }}
                  className="px-5 py-2.5 bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-xs font-bold rounded-xl hover:bg-slate-800 dark:hover:bg-slate-100 transition-colors cursor-pointer"
                >
                  {language === 'es' ? 'Siguiente: Expediente Aeronáutico →' : 'Next: Aeronautical Record →'}
                </button>
              </div>
            </div>
          )}

          {/* ============================================================ */}
          {/* TAB 3: EXPEDIENTE AERONÁUTICO SEGÚN ROL                     */}
          {/* ============================================================ */}
          {activeTab === 'aero' && (
            <div className="space-y-6">
              
              {/* SUBSECCIÓN ESTUDIANTE */}
              {formData.rol === 'estudiante' && (
                <div className="space-y-5">
                  <div className="p-4 bg-amber-50/50 dark:bg-amber-950/20 rounded-2xl border border-amber-200 dark:border-amber-800/60 space-y-4">
                    <div className="flex items-center gap-2">
                      <GraduationCap className="w-5 h-5 text-amber-600" />
                      <h4 className="text-xs font-bold text-amber-950 dark:text-amber-200">
                        {language === 'es' ? 'Configuración de Entrenamiento de Vuelo' : 'Flight Training Settings'}
                      </h4>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      {/* Curso Actual */}
                      <div>
                        <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                          {t('currentCourse')} *
                        </label>
                        <select
                          value={formData.curso_actual}
                          onChange={(e) => setFormData(prev => ({ ...prev, curso_actual: e.target.value }))}
                          className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-slate-100 font-semibold focus:outline-none cursor-pointer"
                        >
                          <option value="Privado">Piloto Privado de Avión (PPL)</option>
                          <option value="Comercial">Piloto Comercial de Avión (CPL)</option>
                          <option value="IFR">Habilitación por Instrumentos (IFR)</option>
                          <option value="Multi-Motor">Habilitación Multi-Motor (ME)</option>
                          <option value="Nocturno">Habilitación de Vuelo Nocturno</option>
                          <option value="CFI">Curso de Instructor de Vuelo (CFI)</option>
                        </select>
                      </div>

                      {/* Instructor Asignado */}
                      <div>
                        <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                          {t('assignedInstructor')}
                        </label>
                        <select
                          value={formData.instructor_asignado_id}
                          onChange={(e) => setFormData(prev => ({ ...prev, instructor_asignado_id: e.target.value }))}
                          className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-slate-100 font-semibold focus:outline-none cursor-pointer"
                        >
                          <option value="">{language === 'es' ? '-- Asignar más adelante --' : '-- Assign later --'}</option>
                          {instructorsList.map(inst => (
                            <option key={inst.id} value={inst.id}>
                              {inst.nombre} ({inst.licencia || 'CFI'})
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Saldo Inicial / Matrícula */}
                      <div>
                        <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                          {language === 'es' ? 'Abono Inicial en Cuenta ($ USD)' : 'Initial Account Deposit ($ USD)'}
                        </label>
                        <div className="relative">
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={formData.saldo_inicial}
                            onChange={(e) => setFormData(prev => ({ ...prev, saldo_inicial: e.target.value }))}
                            placeholder="0.00"
                            className="w-full pl-8 pr-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-slate-100 font-semibold focus:outline-none"
                          />
                          <DollarSign className="w-4 h-4 text-emerald-600 absolute left-2.5 top-2.5" />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Certificado Médico Aeronáutico */}
                  <div className="p-4 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-slate-200 dark:border-slate-700/70 space-y-4">
                    <div className="flex items-center gap-2">
                      <HeartHandshake className="w-4 h-4 text-emerald-600" />
                      <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200">
                        {language === 'es' ? 'Certificado Médico Aeronáutico' : 'Aeronautical Medical Certificate'}
                      </h4>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                          {t('medicalNumber')}
                        </label>
                        <input
                          type="text"
                          value={formData.numero_medico}
                          onChange={(e) => setFormData(prev => ({ ...prev, numero_medico: e.target.value }))}
                          placeholder="MED-CL2-10842"
                          className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-slate-100 focus:outline-none"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                          Clase Médica
                        </label>
                        <select
                          value={formData.clase_medica}
                          onChange={(e) => setFormData(prev => ({ ...prev, clase_medica: e.target.value as any }))}
                          className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-slate-100 font-semibold focus:outline-none cursor-pointer"
                        >
                          <option value="1">Clase 1 (Comercial / ATP / CFI)</option>
                          <option value="2">Clase 2 (Piloto Privado PPL)</option>
                          <option value="3">Clase 3 (Controlador / Operaciones)</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                          {t('medicalCertExpiration')}
                        </label>
                        <input
                          type="date"
                          value={formData.vencimiento_medico}
                          onChange={(e) => setFormData(prev => ({ ...prev, vencimiento_medico: e.target.value }))}
                          className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-slate-100 focus:outline-none"
                        />
                      </div>
                    </div>

                    {/* Foto o Adjunto de Médico */}
                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                        {t('medicalCertPhoto')}
                      </label>
                      {formData.foto_medico ? (
                        <div className="flex items-center gap-3 p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700">
                          <img src={formData.foto_medico} alt="Médico" className="w-12 h-12 object-cover rounded-lg" />
                          <div className="flex-1 text-xs">
                            <span className="font-bold text-slate-800 dark:text-slate-200 block">Certificado Médico Adjunto</span>
                            <span className="text-emerald-600 text-[10px]">Cargado exitosamente</span>
                          </div>
                          <button
                            type="button"
                            onClick={() => setFormData(prev => ({ ...prev, foto_medico: '' }))}
                            className="p-1.5 text-rose-500 hover:text-rose-700 rounded-lg cursor-pointer"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      ) : (
                        <label className="border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-emerald-400 bg-white dark:bg-slate-900 rounded-xl p-3 flex items-center justify-center gap-2 cursor-pointer transition-colors text-xs font-semibold text-slate-600 dark:text-slate-300">
                          <Upload className="w-4 h-4 text-slate-400" />
                          <span>Cargar Foto / PDF de Certificado Médico</span>
                          <input
                            type="file"
                            accept="image/*"
                            onChange={(e) => handleFileUpload(e, 'foto_medico')}
                            className="hidden"
                          />
                        </label>
                      )}
                    </div>
                  </div>

                  {/* Licencia de Alumno Piloto / Previa */}
                  <div className="p-4 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-slate-200 dark:border-slate-700/70 space-y-4">
                    <div className="flex items-center gap-2">
                      <Plane className="w-4 h-4 text-sky-600" />
                      <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200">
                        {language === 'es' ? 'Licencia de Alumno Piloto o Previa (Si aplica)' : 'Student or Previous Pilot License'}
                      </h4>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                          {t('licenseNumber')}
                        </label>
                        <input
                          type="text"
                          value={formData.licencia}
                          onChange={(e) => setFormData(prev => ({ ...prev, licencia: e.target.value }))}
                          placeholder="STU-49102"
                          className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-slate-100 focus:outline-none"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                          {t('licenseExpiration')}
                        </label>
                        <input
                          type="date"
                          value={formData.vencimiento_licencia}
                          onChange={(e) => setFormData(prev => ({ ...prev, vencimiento_licencia: e.target.value }))}
                          className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-slate-100 focus:outline-none"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* SUBSECCIÓN INSTRUCTOR */}
              {(formData.rol === 'instructor' || formData.rol === 'instructor_en_jefe') && (
                <div className="space-y-5">
                  <div className="p-4 bg-sky-50/50 dark:bg-sky-950/20 rounded-2xl border border-sky-200 dark:border-sky-800/60 space-y-4">
                    <div className="flex items-center gap-2">
                      <Plane className="w-5 h-5 text-sky-600" />
                      <h4 className="text-xs font-bold text-sky-950 dark:text-sky-200">
                        {language === 'es' ? 'Licencia de Instructor de Vuelo (CFI) & Habilitaciones' : 'Flight Instructor License (CFI) & Ratings'}
                      </h4>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                          {t('licenseNumber')} *
                        </label>
                        <input
                          type="text"
                          required
                          value={formData.licencia}
                          onChange={(e) => setFormData(prev => ({ ...prev, licencia: e.target.value }))}
                          placeholder="CPL-49102-CFI"
                          className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-slate-100 font-semibold focus:outline-none"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                          {t('licenseExpiration')} *
                        </label>
                        <input
                          type="date"
                          required
                          value={formData.vencimiento_licencia}
                          onChange={(e) => setFormData(prev => ({ ...prev, vencimiento_licencia: e.target.value }))}
                          className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-slate-100 focus:outline-none"
                        />
                      </div>
                    </div>

                    {/* Habilitaciones Chips */}
                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                        Habilitaciones Oficiales
                      </label>
                      <div className="flex flex-wrap gap-2">
                        {['CFI', 'CFII', 'MEI', 'VFR', 'IFR', 'Multi-Engine', 'Acrobacia'].map(hab => {
                          const isChecked = formData.habilitaciones.includes(hab);
                          return (
                            <button
                              key={hab}
                              type="button"
                              onClick={() => toggleHabilitacion(hab)}
                              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                                isChecked
                                  ? 'bg-sky-600 text-white shadow-xs'
                                  : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-700 hover:border-sky-400'
                              }`}
                            >
                              {hab}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Tarifa Dual Given */}
                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                        Tarifa por Hora de Instrucción Dual ($/hr)
                      </label>
                      <div className="relative max-w-xs">
                        <input
                          type="number"
                          step="1"
                          min="0"
                          value={formData.tarifa_hora_dual}
                          onChange={(e) => setFormData(prev => ({ ...prev, tarifa_hora_dual: e.target.value }))}
                          className="w-full pl-8 pr-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-slate-100 font-semibold focus:outline-none"
                        />
                        <DollarSign className="w-4 h-4 text-sky-600 absolute left-2.5 top-2.5" />
                      </div>
                    </div>
                  </div>

                  {/* Certificado Médico Clase 1 */}
                  <div className="p-4 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-slate-200 dark:border-slate-700/70 space-y-4">
                    <div className="flex items-center gap-2">
                      <HeartHandshake className="w-4 h-4 text-rose-600" />
                      <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200">
                        Certificado Médico Aeronáutico Clase 1 (Exigido para Instrucción)
                      </h4>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                          {t('medicalNumber')} *
                        </label>
                        <input
                          type="text"
                          required
                          value={formData.numero_medico}
                          onChange={(e) => setFormData(prev => ({ ...prev, numero_medico: e.target.value }))}
                          placeholder="MED-CL1-09412"
                          className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-slate-100 focus:outline-none"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                          {t('medicalCertExpiration')} *
                        </label>
                        <input
                          type="date"
                          required
                          value={formData.vencimiento_medico}
                          onChange={(e) => setFormData(prev => ({ ...prev, vencimiento_medico: e.target.value }))}
                          className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-slate-100 focus:outline-none"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* SUBSECCIÓN ADMINISTRATIVO */}
              {(formData.rol === 'escuela' || formData.rol === 'contabilidad' || formData.rol === 'admin') && (
                <div className="p-4 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-slate-200 dark:border-slate-700/70 space-y-4">
                  <div className="flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-indigo-600" />
                    <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200">
                      Datos del Cargo y Asignación Institucional SkyOps
                    </h4>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                        Cargo o Departamento
                      </label>
                      <input
                        type="text"
                        value={formData.cargo_departamento}
                        onChange={(e) => setFormData(prev => ({ ...prev, cargo_departamento: e.target.value }))}
                        placeholder={formData.rol === 'contabilidad' ? 'Contador General / Auditor' : 'Director de Operaciones'}
                        className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-slate-100 focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                        Licencia Aeronáutica / Despacho (Opcional)
                      </label>
                      <input
                        type="text"
                        value={formData.licencia}
                        onChange={(e) => setFormData(prev => ({ ...prev, licencia: e.target.value }))}
                        placeholder="DOV-10294"
                        className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-slate-100 focus:outline-none"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Botones de acción final del formulario */}
              <div className="flex items-center justify-between pt-4 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setActiveTab('personal')}
                  className="px-4 py-2 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  ← Volver a Datos Personales
                </button>

                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={onClose}
                    className="px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                  >
                    {t('cancel')}
                  </button>

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="inline-flex items-center gap-2 px-6 py-2.5 bg-sky-600 hover:bg-sky-700 text-white text-xs font-bold rounded-xl shadow-md shadow-sky-600/20 transition-all cursor-pointer disabled:opacity-50"
                  >
                    {isSubmitting ? (
                      <span>{language === 'es' ? 'Creando cuenta...' : 'Creating account...'}</span>
                    ) : (
                      <>
                        <UserPlus className="w-4 h-4" />
                        <span>{language === 'es' ? 'Crear Usuario y Guardar Expediente' : 'Create User & Save Record'}</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ============================================================ */}
          {/* TAB 4: RESUMEN DE ÉXITO & ENTREGA DE CREDENCIALES            */}
          {/* ============================================================ */}
          {activeTab === 'summary' && successData && (
            <div className="space-y-6 py-4">
              <div className="text-center space-y-2">
                <div className="w-14 h-14 bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 rounded-full flex items-center justify-center mx-auto border-2 border-emerald-300 dark:border-emerald-700 shadow-sm">
                  <CheckCircle2 className="w-8 h-8" />
                </div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                  {language === 'es' ? '¡Usuario Registrado Exitosamente!' : 'User Registered Successfully!'}
                </h3>
              </div>

              {/* Credential Card */}
              <div className="p-5 bg-slate-900 text-white rounded-3xl border border-slate-800 shadow-xl space-y-4 max-w-lg mx-auto">
                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                  <div className="flex items-center gap-2">
                    <Plane className="w-4 h-4 text-sky-400" />
                    <span className="text-xs font-bold text-white uppercase tracking-wider">
                      Ficha de Acceso SkyOps
                    </span>
                  </div>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-sky-500/20 text-sky-300 border border-sky-400/30">
                    ROL: {successData.user.rol.toUpperCase()}
                  </span>
                </div>

                <div className="space-y-2 text-xs font-mono">
                  <div className="flex justify-between py-1 border-b border-slate-800/80">
                    <span className="text-slate-400">Nombre:</span>
                    <span className="font-bold text-white">{successData.user.nombre}</span>
                  </div>

                  <div className="flex justify-between py-1 border-b border-slate-800/80">
                    <span className="text-slate-400">Usuario / Correo:</span>
                    <span className="text-sky-300 font-bold">{successData.user.correo}</span>
                  </div>

                  <div className="flex justify-between py-1 border-b border-slate-800/80">
                    <span className="text-slate-400">Cédula / Documento:</span>
                    <span className="text-amber-300 font-bold">{successData.user.documento_identidad || 'N/A'}</span>
                  </div>

                  <div className="flex justify-between py-1 border-b border-slate-800/80">
                    <span className="text-slate-400">Contraseña Inicial:</span>
                    <span className="text-emerald-400 font-bold">{successData.rawPassword}</span>
                  </div>
                </div>

                <div className="pt-2 flex gap-3">
                  <button
                    type="button"
                    onClick={handleCopyCredentials}
                    className="flex-1 inline-flex items-center justify-center gap-2 py-2 px-4 bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold rounded-xl transition-all cursor-pointer shadow-md"
                  >
                    {copiedCredentials ? (
                      <>
                        <Check className="w-4 h-4 text-emerald-300" />
                        <span>¡Credenciales Copiadas!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-4 h-4" />
                        <span>Copiar Ficha de Acceso</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              <div className="flex justify-center pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-6 py-2.5 bg-slate-900 text-white dark:bg-white dark:text-slate-900 text-xs font-bold rounded-xl hover:opacity-90 transition-opacity cursor-pointer"
                >
                  Cerrar Ventana
                </button>
              </div>
            </div>
          )}
        </form>
      </div>
    </div>
  );
};
