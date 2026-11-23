import React, { useState } from 'react';
import { User, UserRole, EmergencyContact } from '../types';
import { useLanguage } from '../i18n/LanguageContext';
import { useTheme } from '../context/ThemeContext';
import { api } from '../services/api';
import { useAuth } from '../firebase/AuthContext';
import { saveUserToFirestore } from '../firebase/firestoreService';
import { parseMedicalStatus } from './AacMedicalAlertWidget';
import {
  Users,
  UserPlus,
  Search,
  Phone,
  Mail,
  MapPin,
  Calendar,
  Shield,
  ShieldAlert,
  ShieldCheck,
  ShieldX,
  AlertTriangle,
  FileText,
  AlertCircle,
  CheckCircle2,
  X,
  Plus,
  Trash2,
  Upload,
  Image,
  Eye,
  Edit,
  GraduationCap,
  Plane,
  HeartHandshake,
  Check,
  UserCheck,
  Sparkles,
  RefreshCw,
  KeyRound,
  Palette,
  Lock,
  Wrench
} from 'lucide-react';
import { UserRegistrationModal } from './UserRegistrationModal';

interface UserManagementModuleProps {
  currentUser: User;
  allUsers: User[];
  onRefreshAll: () => Promise<void>;
}

export const UserManagementModule: React.FC<UserManagementModuleProps> = ({
  currentUser,
  allUsers,
  onRefreshAll
}) => {
  const { t, language } = useLanguage();
  const { openModal: openThemeModal, activeHex } = useTheme();
  const isAuthorized = currentUser.rol === 'admin' || currentUser.rol === 'contabilidad' || currentUser.rol === 'escuela';

  // Permisos de creación de usuarios
  const isJefatura = currentUser.rol === 'admin';
  const canCreateUsers = isJefatura || Boolean(currentUser.puede_crear_usuarios) || Boolean(currentUser.permisos_delegados?.crear_usuarios);
  const adminStaffUsers = allUsers.filter(u => u.rol === 'escuela' || u.rol === 'contabilidad');

  // Modal de registro completo
  const [isRegistrationModalOpen, setIsRegistrationModalOpen] = useState<boolean>(false);

  // Filters & State
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [selectedUserForDetail, setSelectedUserForDetail] = useState<User | null>(null);
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [lightboxImage, setLightboxImage] = useState<{ url: string; title: string } | null>(null);

  // Form State
  const [formData, setFormData] = useState<Partial<User>>({
    nombre: '',
    rol: 'estudiante',
    correo: '',
    telefono: '',
    documento_identidad: '',
    direccion_residencial: '',
    fecha_ingreso: new Date().toISOString().split('T')[0],
    curso_actual: 'Privado',
    instructor_asignado_id: '',
    licencia: '',
    vencimiento_licencia: '',
    foto_licencia: '',
    numero_medico: '',
    vencimiento_medico: '',
    foto_medico: '',
    foto_perfil: '',
    contactos_emergencia: [
      { nombre: '', parentesco: 'Padre', telefono: '', telefono_secundario: '' }
    ]
  });

  const [activeFormTab, setActiveFormTab] = useState<'personal' | 'emergency' | 'documents'>('personal');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [formError, setFormError] = useState<string>('');
  const [formSuccess, setFormSuccess] = useState<string>('');

  const instructorsList = allUsers.filter(u => u.rol === 'instructor');

  const getRoleBadge = (role: UserRole) => {
    switch (role) {
      case 'admin':
        return <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-bold bg-purple-100 text-purple-800 border border-purple-200">{t('role_admin')}</span>;
      case 'escuela':
        return <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-bold bg-indigo-100 text-indigo-800 border border-indigo-200">{t('role_escuela')}</span>;
      case 'instructor_en_jefe':
        return <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-bold bg-indigo-100 text-indigo-800 border border-indigo-300">{t('role_instructor_en_jefe')}</span>;
      case 'instructor':
        return <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-bold bg-sky-100 text-sky-800 border border-sky-200">{t('role_instructor')}</span>;
      case 'contabilidad':
        return <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">{t('role_contabilidad')}</span>;
      case 'mantenimiento':
        return <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-bold bg-amber-100 text-amber-900 border border-amber-300">Taller / TMA</span>;
      case 'estudiante':
      default:
        return <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-bold bg-amber-100 text-amber-800 border border-amber-200">{t('role_estudiante')}</span>;
    }
  };

  // Delegación de creación de usuarios por Jefatura
  const handleToggleDelegation = async (targetUser: User) => {
    if (!isJefatura) return;
    const currentAllowed = Boolean(targetUser.puede_crear_usuarios || targetUser.permisos_delegados?.crear_usuarios);
    const newAllowed = !currentAllowed;
    try {
      await api.delegateUserCreation(targetUser.id, newAllowed, currentUser.nombre);
      await onRefreshAll();
    } catch (err: any) {
      console.error('Error al actualizar permisos de creación:', err);
      alert('Error al delegar permisos: ' + (err.message || 'Error desconocido'));
    }
  };

  const handleOpenCreateModal = () => {
    setIsRegistrationModalOpen(true);
  };

  const handleOpenEditModal = (user: User) => {
    setEditingUser(user);
    setFormData({
      ...user,
      contactos_emergencia: user.contactos_emergencia && user.contactos_emergencia.length > 0
        ? user.contactos_emergencia
        : [{ nombre: '', parentesco: 'Padre', telefono: '', telefono_secundario: '' }]
    });
    setActiveFormTab('personal');
    setFormError('');
    setFormSuccess('');
    setIsModalOpen(true);
  };

  // Handle Image File Upload (Converts to Data URI for instant local persistence)
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

  // Emergency Contacts Handlers
  const handleAddEmergencyContact = () => {
    setFormData(prev => ({
      ...prev,
      contactos_emergencia: [
        ...(prev.contactos_emergencia || []),
        { nombre: '', parentesco: 'Familiar', telefono: '', telefono_secundario: '' }
      ]
    }));
  };

  const handleRemoveEmergencyContact = (index: number) => {
    setFormData(prev => ({
      ...prev,
      contactos_emergencia: (prev.contactos_emergencia || []).filter((_, idx) => idx !== index)
    }));
  };

  const handleEmergencyContactChange = (index: number, key: keyof EmergencyContact, value: string) => {
    setFormData(prev => {
      const contacts = [...(prev.contactos_emergencia || [])];
      contacts[index] = { ...contacts[index], [key]: value };
      return { ...prev, contactos_emergencia: contacts };
    });
  };

  const handleSubmitForm = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    setFormSuccess('');

    if (!formData.nombre || !formData.correo || !formData.telefono || !formData.rol) {
      setFormError(language === 'es' ? 'Nombre, rol, correo y teléfono son obligatorios.' : 'Name, role, email and phone are required.');
      setActiveFormTab('personal');
      return;
    }

    setIsSubmitting(true);

    try {
      if (editingUser) {
        await api.updateUser(editingUser.id, formData);
        setFormSuccess(t('userUpdatedSuccess'));
      } else {
        await api.createUser(formData);
        setFormSuccess(t('userCreatedSuccess'));
      }

      await onRefreshAll();

      setTimeout(() => {
        setIsModalOpen(false);
        setIsSubmitting(false);
      }, 1000);
    } catch (err: unknown) {
      console.error(err);
      const errorMessage = err instanceof Error ? err.message : t('error');
      setFormError(errorMessage);
      setIsSubmitting(false);
    }
  };

  // Filtered Users
  const filteredUsers = allUsers.filter(u => {
    const matchesSearch =
      u.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.correo.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (u.telefono && u.telefono.includes(searchTerm)) ||
      (u.documento_identidad && u.documento_identidad.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (u.licencia && u.licencia.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (u.numero_medico && u.numero_medico.toLowerCase().includes(searchTerm.toLowerCase()));

    if (roleFilter === 'medical_alerts') {
      const med = parseMedicalStatus(u);
      return matchesSearch && (med.status === 'expired' || med.status === 'critical' || med.status === 'warning' || med.status === 'missing') && (u.rol === 'estudiante' || u.rol === 'instructor' || u.rol === 'instructor_en_jefe' || u.licencia);
    }

    const matchesRole = roleFilter === 'all' || u.rol === roleFilter;

    return matchesSearch && matchesRole;
  });

  const totalMedicalAlerts = allUsers.filter(u => {
    const med = parseMedicalStatus(u);
    return (med.status === 'expired' || med.status === 'critical' || med.status === 'warning' || med.status === 'missing') && (u.rol === 'estudiante' || u.rol === 'instructor' || u.rol === 'instructor_en_jefe' || u.licencia);
  }).length;

  if (!isAuthorized) {
    return (
      <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm text-center max-w-lg mx-auto my-12 space-y-4">
        <div className="w-16 h-16 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center mx-auto shadow-inner">
          <Shield className="w-8 h-8" />
        </div>
        <h2 className="text-lg font-extrabold text-slate-800 tracking-tight">Acceso Exclusivo a Administración y Contabilidad</h2>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Feedback Messages */}
      {formSuccess && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center justify-between text-xs text-emerald-800 animate-in fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span className="font-semibold">{formSuccess}</span>
          </div>
          <button
            onClick={() => setFormSuccess('')}
            className="text-emerald-600 hover:text-emerald-800 p-1 cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {formError && (
        <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-2xl flex items-center justify-between text-xs text-rose-800 animate-in fade-in">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span className="font-semibold">{formError}</span>
          </div>
          <button
            onClick={() => setFormError('')}
            className="text-rose-600 hover:text-rose-800 p-1 cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Top Banner / Authorization Header */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-extrabold text-slate-900 tracking-tight">
              {t('userManagement')}
            </h2>
            <span className="bg-sky-100 text-sky-800 text-xs font-bold px-2 py-0.5 rounded-full">
              {allUsers.length} {t('short_usuarios')}
            </span>
          </div>
        </div>

        {/* Primary CTAs: Only visible if authorized */}
        {isAuthorized ? (
          <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
            {canCreateUsers ? (
              <div className="flex items-center gap-2">
                {!isJefatura && (
                  <span className="inline-flex items-center gap-1 text-[11px] font-bold text-sky-700 bg-sky-50 px-2.5 py-1.5 rounded-xl border border-sky-200 shadow-2xs">
                    <Check className="w-3.5 h-3.5 text-sky-600" />
                    <span>Permiso Delegado por Jefatura</span>
                  </span>
                )}
                <button
                  onClick={handleOpenCreateModal}
                  className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-sky-600 hover:bg-sky-700 text-white font-bold text-xs rounded-xl shadow-md shadow-sky-600/20 transition-all cursor-pointer flex-shrink-0"
                >
                  <UserPlus className="w-4 h-4" />
                  <span>{t('createUser')}</span>
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2 bg-slate-100 border border-slate-300 text-slate-600 px-3.5 py-2 rounded-xl text-xs">
                <Lock className="w-4 h-4 text-slate-500 flex-shrink-0" />
                <span>Creación restringida. Requiere asignación de Jefatura.</span>
              </div>
            )}
          </div>
        ) : (
          <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 text-amber-800 px-3 py-2 rounded-xl text-xs">
            <Shield className="w-4 h-4 text-amber-600 flex-shrink-0" />
            <span>{t('onlyAdminContaAllowed')}</span>
          </div>
        )}
      </div>

      {/* Metrics Summary Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 sm:gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
            <span>{language === 'es' ? 'Alumnos Piloto' : 'Student Pilots'}</span>
            <GraduationCap className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-2xl font-black text-slate-900 mt-1">
            {allUsers.filter(u => u.rol === 'estudiante' && u.estado_autorizacion !== 'pendiente_aprobacion').length}
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
            <span>{language === 'es' ? 'Instructores CFI' : 'Flight Instructors'}</span>
            <Plane className="w-4 h-4 text-sky-500" />
          </div>
          <div className="text-2xl font-black text-slate-900 mt-1">
            {allUsers.filter(u => (u.rol === 'instructor' || u.rol === 'instructor_en_jefe') && u.estado_autorizacion !== 'pendiente_aprobacion').length}
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
            <span>{language === 'es' ? 'Contabilidad' : 'Accounting'}</span>
            <FileText className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-2xl font-black text-slate-900 mt-1">
            {allUsers.filter(u => u.rol === 'contabilidad' && u.estado_autorizacion !== 'pendiente_aprobacion').length}
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
            <span>{language === 'es' ? 'Dir. Escuela' : 'Flight School'}</span>
            <Users className="w-4 h-4 text-indigo-500" />
          </div>
          <div className="text-2xl font-black text-slate-900 mt-1">
            {allUsers.filter(u => u.rol === 'escuela' && u.estado_autorizacion !== 'pendiente_aprobacion').length}
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
            <span>{language === 'es' ? 'Jefatura' : 'Chief / Admin'}</span>
            <Shield className="w-4 h-4 text-purple-500" />
          </div>
          <div className="text-2xl font-black text-slate-900 mt-1">
            {allUsers.filter(u => u.rol === 'admin').length}
          </div>
        </div>
      </div>

      {/* ========================================================= */}
      {/* PANEL EXCLUSIVO JEFATURA: DELEGACIÓN DE PRIVILEGIOS        */}
      {/* ========================================================= */}
      {isJefatura && (
        <div className="bg-gradient-to-r from-purple-50/90 via-slate-50 to-indigo-50/80 rounded-2xl border border-purple-200 p-5 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-purple-100">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-2xl bg-purple-600 text-white flex items-center justify-center shadow-md shadow-purple-600/20 flex-shrink-0">
                <Shield className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm sm:text-base font-black text-purple-950 tracking-tight">
                    Delegación de Privilegios de Creación de Usuarios
                  </h3>
                </div>
              </div>
            </div>
          </div>

          {adminStaffUsers.length === 0 ? (
            <div className="p-4 bg-white/80 rounded-xl border border-purple-100 text-xs text-slate-500 text-center">
              No hay cuentas de roles administrativos secundarios (Escuela o Contabilidad) para delegar permisos.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {adminStaffUsers.map(adminUser => {
                const isAllowed = Boolean(adminUser.puede_crear_usuarios || adminUser.permisos_delegados?.crear_usuarios);
                return (
                  <div
                    key={adminUser.id}
                    className="p-4 bg-white rounded-2xl border border-purple-100/90 shadow-2xs flex items-center justify-between gap-3"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-xl bg-purple-100 text-purple-700 font-black text-sm flex items-center justify-center flex-shrink-0">
                        {adminUser.nombre.charAt(0)}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-slate-900 truncate">{adminUser.nombre}</span>
                          {getRoleBadge(adminUser.rol)}
                        </div>
                        <span className="text-[11px] text-slate-500 truncate block mt-0.5">
                          {adminUser.correo} • Cédula: {adminUser.documento_identidad || 'N/A'}
                        </span>
                        {adminUser.permisos_delegados?.asignado_por && (
                          <span className="text-[10px] text-purple-700 block mt-0.5 font-medium">
                            Autorizado por: {adminUser.permisos_delegados.asignado_por}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex flex-col items-end gap-1 flex-shrink-0">
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={isAllowed}
                          onChange={() => handleToggleDelegation(adminUser)}
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
                      </label>
                      <span className={`text-[10px] font-bold ${isAllowed ? 'text-purple-700' : 'text-slate-400'}`}>
                        {isAllowed ? 'Creación Concedida' : 'Inhabilitado'}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Search & Filter Controls */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-3">
        <div className="flex flex-col sm:flex-row items-center gap-3">
          {/* Search Input */}
          <div className="relative flex-1 w-full">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder={t('searchUsers')}
              className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-sky-500 focus:bg-white transition-all"
            />
          </div>

          {/* Role Filters */}
          <div className="flex items-center gap-1 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0 no-scrollbar">
            {[
              { id: 'all', label: t('allRoles') },
              { id: 'medical_alerts', label: `⚠️ Alertas de Vigencia (${totalMedicalAlerts})`, alert: totalMedicalAlerts > 0 },
              { id: 'estudiante', label: language === 'es' ? 'Estudiantes' : 'Students' },
              { id: 'instructor', label: language === 'es' ? 'Instructores' : 'Instructors' },
              { id: 'instructor_en_jefe', label: language === 'es' ? 'Jefe de Pilotos' : 'Chief Pilot' },
              { id: 'mantenimiento', label: language === 'es' ? 'Taller TMA' : 'Maintenance' },
              { id: 'escuela', label: language === 'es' ? 'Escuela' : 'School' },
              { id: 'contabilidad', label: language === 'es' ? 'Contabilidad' : 'Accounting' },
              { id: 'admin', label: language === 'es' ? 'Admin' : 'Admin' }
            ].map(tab => {
              const isActive = roleFilter === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setRoleFilter(tab.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap cursor-pointer transition-colors flex items-center gap-1.5 ${
                    isActive
                      ? tab.id === 'medical_alerts'
                        ? 'bg-amber-600 text-white'
                        : 'bg-slate-900 text-white'
                      : tab.id === 'medical_alerts' && totalMedicalAlerts > 0
                      ? 'bg-amber-50 text-amber-800 border border-amber-300 hover:bg-amber-100 font-bold'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Users Grid Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredUsers.length === 0 ? (
          <div className="col-span-full py-12 text-center bg-white rounded-2xl border border-slate-200 text-slate-400">
            <Users className="w-10 h-10 mx-auto text-slate-300 mb-2" />
            <p className="text-sm font-medium">{t('noUsersFound')}</p>
          </div>
        ) : (
          filteredUsers.map((user) => {
            return (
            <div
              key={user.id}
              className="bg-white rounded-2xl border border-slate-200 shadow-xs hover:shadow-md transition-all p-4 flex flex-col justify-between group"
            >
              <div className="space-y-3">
                {/* User Top Row: Avatar, Name & Role */}
                <div className="flex items-start gap-3">
                  <div className="relative flex-shrink-0">
                    <div className="w-12 h-12 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center overflow-hidden shadow-inner">
                      {user.foto_perfil ? (
                        <img
                          src={user.foto_perfil}
                          alt={user.nombre}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <Users className="w-6 h-6 text-slate-400" />
                      )}
                    </div>
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5 flex-wrap mb-1">
                      {getRoleBadge(user.rol)}
                      {user.curso_actual && (
                        <span className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded font-medium">
                          {user.curso_actual}
                        </span>
                      )}
                      {(user.puede_crear_usuarios || user.permisos_delegados?.crear_usuarios) && (
                        <span className="text-[10px] bg-purple-50 text-purple-700 border border-purple-200 font-bold px-1.5 py-0.5 rounded flex items-center gap-1">
                          <Shield className="w-2.5 h-2.5" />
                          Creación Habilitada
                        </span>
                      )}
                    </div>
                    <h3 className="text-sm font-bold text-slate-900 truncate group-hover:text-sky-600 transition-colors">
                      {user.nombre}
                    </h3>
                    <p className="text-xs text-slate-500 truncate flex items-center gap-1 mt-0.5">
                      <Mail className="w-3 h-3 text-slate-400 flex-shrink-0" />
                      <span>{user.correo}</span>
                    </p>
                    {user.documento_identidad && (
                      <p className="text-[11px] text-slate-500 font-mono truncate flex items-center gap-1 mt-0.5">
                        <KeyRound className="w-3 h-3 text-slate-400 flex-shrink-0" />
                        <span>Cédula: {user.documento_identidad}</span>
                      </p>
                    )}
                  </div>
                </div>

                {/* Info Pills */}
                <div className="bg-slate-50 rounded-xl p-2.5 space-y-1.5 text-xs text-slate-600 border border-slate-100">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400 flex items-center gap-1">
                      <Phone className="w-3 h-3" />
                      {t('phone')}:
                    </span>
                    <span className="font-semibold text-slate-800">{user.telefono}</span>
                  </div>

                  {user.documento_identidad && (
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">{t('nationalId')}:</span>
                      <span className="font-semibold text-slate-800">{user.documento_identidad}</span>
                    </div>
                  )}

                  {user.fecha_ingreso && (
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400 flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {language === 'es' ? 'Ingreso' : 'Enrolled'}:
                      </span>
                      <span className="font-medium text-slate-700">{user.fecha_ingreso}</span>
                    </div>
                  )}

                  {/* Medical Validity & Status */}
                  {(user.vencimiento_medico || user.rol === 'estudiante' || user.rol === 'instructor' || user.rol === 'instructor_en_jefe') && (() => {
                    const med = parseMedicalStatus(user);
                    const isExp = med.status === 'expired' || med.status === 'missing';
                    const isCrit = med.status === 'critical';
                    const isWarn = med.status === 'warning';

                    return (
                      <div className={`p-1.5 rounded-lg border text-[11px] flex items-center justify-between gap-1.5 ${
                        isExp
                          ? 'bg-rose-50 border-rose-200 text-rose-800'
                          : isCrit
                          ? 'bg-amber-50 border-amber-200 text-amber-900'
                          : isWarn
                          ? 'bg-yellow-50 border-yellow-200 text-yellow-900'
                          : 'bg-emerald-50 border-emerald-200 text-emerald-800'
                      }`}>
                        <div className="flex items-center gap-1 font-semibold truncate">
                          {isExp ? <ShieldAlert className="w-3 h-3 text-rose-600 shrink-0" /> : <Shield className="w-3 h-3 text-slate-500 shrink-0" />}
                          <span className="truncate">Médico: {user.vencimiento_medico || 'No registrado'}</span>
                        </div>
                        <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded shrink-0 ${
                          isExp ? 'bg-rose-600 text-white' : isCrit ? 'bg-amber-600 text-white' : isWarn ? 'bg-yellow-500 text-white' : 'bg-emerald-600 text-white'
                        }`}>
                          {isExp ? 'VENCIDO' : isCrit ? `${med.daysRemaining}d` : isWarn ? `${med.daysRemaining}d` : 'OK'}
                        </span>
                      </div>
                    );
                  })()}

                  {user.contactos_emergencia && user.contactos_emergencia.length > 0 && user.contactos_emergencia[0].nombre && (
                    <div className="flex items-center justify-between pt-1 border-t border-slate-200/60">
                      <span className="text-amber-600 font-medium flex items-center gap-1 text-[11px]">
                        <HeartHandshake className="w-3 h-3" />
                        {language === 'es' ? 'Emergencia' : 'Emergency'}:
                      </span>
                      <span className="font-semibold text-slate-800 text-[11px] truncate max-w-[140px]">
                        {user.contactos_emergencia[0].nombre} ({user.contactos_emergencia[0].parentesco})
                      </span>
                    </div>
                  )}
                </div>

                {/* Documents Badges Preview */}
                {(user.foto_licencia || user.foto_medico) && (
                  <div className="flex items-center gap-2 text-[11px]">
                    <span className="text-slate-400 font-medium">{t('viewDocuments')}:</span>
                    {user.foto_licencia && (
                      <button
                        onClick={() => setLightboxImage({ url: user.foto_licencia!, title: `${t('licensePhoto')} - ${user.nombre}` })}
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-sky-50 text-sky-700 hover:bg-sky-100 font-semibold border border-sky-200 cursor-pointer"
                      >
                        <Image className="w-3 h-3" />
                        <span>{language === 'es' ? 'Licencia' : 'License'}</span>
                      </button>
                    )}
                    {user.foto_medico && (
                      <button
                        onClick={() => setLightboxImage({ url: user.foto_medico!, title: `${t('medicalCertPhoto')} - ${user.nombre}` })}
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 hover:bg-emerald-100 font-semibold border border-emerald-200 cursor-pointer"
                      >
                        <Image className="w-3 h-3" />
                        <span>{language === 'es' ? 'Médico' : 'Medical'}</span>
                      </button>
                    )}
                  </div>
                )}
              </div>

              {/* Card Bottom Actions */}
              <div className="pt-3 mt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                <button
                  onClick={() => setSelectedUserForDetail(user)}
                  className="flex-1 py-1.5 px-2.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span>{t('viewProfile')}</span>
                </button>

                {isAuthorized && (
                  <button
                    onClick={() => handleOpenEditModal(user)}
                    className="py-1.5 px-2.5 rounded-lg bg-sky-50 hover:bg-sky-100 text-sky-700 text-xs font-semibold transition-colors flex items-center justify-center gap-1.5 border border-sky-200 cursor-pointer"
                    title={t('editUser')}
                  >
                    <Edit className="w-3.5 h-3.5" />
                    <span>{t('edit')}</span>
                  </button>
                )}
              </div>
            </div>
            );
          })
        )}
      </div>

      {/* ========================================================= */}
      {/* MODAL: REGISTRAR / EDITAR USUARIO (ADMIN & CONTABILIDAD) */}
      {/* ========================================================= */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-3xl w-full my-auto overflow-hidden flex flex-col max-h-[90vh]">
            {/* Modal Header */}
            <div className="p-4 sm:p-6 border-b border-slate-200 flex items-center justify-between bg-slate-900 text-white flex-shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-sky-500/20 text-sky-400 border border-sky-400/30 flex items-center justify-center">
                  <UserPlus className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-bold text-white">
                    {editingUser ? t('editUser') : t('createUser')}
                  </h3>
                </div>
              </div>

              <button
                onClick={() => setIsModalOpen(false)}
                className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Navigation Tabs */}
            <div className="flex border-b border-slate-200 bg-slate-50 px-4 sm:px-6 flex-shrink-0">
              <button
                type="button"
                onClick={() => setActiveFormTab('personal')}
                className={`py-3 px-4 text-xs font-bold border-b-2 transition-colors cursor-pointer flex items-center gap-2 ${
                  activeFormTab === 'personal'
                    ? 'border-sky-600 text-sky-600 bg-white rounded-t-lg'
                    : 'border-transparent text-slate-500 hover:text-slate-900'
                }`}
              >
                <Users className="w-4 h-4" />
                <span>{t('personalInfo')}</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveFormTab('emergency')}
                className={`py-3 px-4 text-xs font-bold border-b-2 transition-colors cursor-pointer flex items-center gap-2 ${
                  activeFormTab === 'emergency'
                    ? 'border-sky-600 text-sky-600 bg-white rounded-t-lg'
                    : 'border-transparent text-slate-500 hover:text-slate-900'
                }`}
              >
                <HeartHandshake className="w-4 h-4" />
                <span>{t('emergencyContacts')}</span>
                {formData.contactos_emergencia && formData.contactos_emergencia.length > 0 && (
                  <span className="w-4 h-4 rounded-full bg-sky-100 text-sky-800 text-[10px] flex items-center justify-center font-bold">
                    {formData.contactos_emergencia.length}
                  </span>
                )}
              </button>

              <button
                type="button"
                onClick={() => setActiveFormTab('documents')}
                className={`py-3 px-4 text-xs font-bold border-b-2 transition-colors cursor-pointer flex items-center gap-2 ${
                  activeFormTab === 'documents'
                    ? 'border-sky-600 text-sky-600 bg-white rounded-t-lg'
                    : 'border-transparent text-slate-500 hover:text-slate-900'
                }`}
              >
                <FileText className="w-4 h-4" />
                <span>{t('aeronauticalDocuments')}</span>
              </button>
            </div>

            {/* Modal Body / Form */}
            <form onSubmit={handleSubmitForm} className="flex-1 min-h-0 overflow-y-auto p-4 sm:p-6 space-y-6">
              {/* Alert Messages */}
              {formError && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              {formSuccess && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                  <span>{formSuccess}</span>
                </div>
              )}

              {/* TAB 1: INFORMACIÓN PERSONAL */}
              {activeFormTab === 'personal' && (
                <div className="space-y-4">
                  {/* Photo & Basic Credentials */}
                  <div className="flex flex-col sm:flex-row items-center gap-4 p-4 bg-slate-50 rounded-2xl border border-slate-200">
                    <div className="relative group w-20 h-20 rounded-2xl bg-white border border-slate-300 flex items-center justify-center overflow-hidden shadow-xs flex-shrink-0">
                      {formData.foto_perfil ? (
                        <img
                          src={formData.foto_perfil}
                          alt="Avatar"
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <Users className="w-8 h-8 text-slate-300" />
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
                      <h4 className="text-xs font-bold text-slate-800">{t('profilePhoto')}</h4>
                      <div className="pt-1">
                        <label className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-slate-100 text-slate-700 text-xs font-semibold rounded-lg border border-slate-300 cursor-pointer shadow-2xs">
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

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        {t('fullName')} *
                      </label>
                      <input
                        type="text"
                        required
                        value={formData.nombre || ''}
                        onChange={(e) => setFormData(prev => ({ ...prev, nombre: e.target.value }))}
                        placeholder="ej. Daniel Alvarado"
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-none focus:border-sky-500"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        {t('userRole')} *
                      </label>
                      <select
                        value={formData.rol || 'estudiante'}
                        onChange={(e) => setFormData(prev => ({ ...prev, rol: e.target.value as UserRole }))}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-none focus:border-sky-500 font-semibold cursor-pointer"
                      >
                        <option value="estudiante">{t('role_estudiante')}</option>
                        <option value="instructor">{t('role_instructor')}</option>
                        <option value="instructor_en_jefe">{t('role_instructor_en_jefe')}</option>
                        <option value="mantenimiento">Taller Aeronáutico (TMA / OMA)</option>
                        <option value="escuela">{t('role_escuela')}</option>
                        <option value="contabilidad">{t('role_contabilidad')}</option>
                        <option value="admin">{t('role_admin')}</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        {t('email')} *
                      </label>
                      <input
                        type="email"
                        required
                        value={formData.correo || ''}
                        onChange={(e) => setFormData(prev => ({ ...prev, correo: e.target.value }))}
                        placeholder="alumno@skyops.aero"
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-none focus:border-sky-500"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        {t('phone')} *
                      </label>
                      <input
                        type="tel"
                        required
                        value={formData.telefono || ''}
                        onChange={(e) => setFormData(prev => ({ ...prev, telefono: e.target.value }))}
                        placeholder="+507 6123-4567"
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-none focus:border-sky-500"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        {t('nationalId')}
                      </label>
                      <input
                        type="text"
                        value={formData.documento_identidad || ''}
                        onChange={(e) => setFormData(prev => ({ ...prev, documento_identidad: e.target.value }))}
                        placeholder="8-912-3456 / Pasaporte"
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-none focus:border-sky-500"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        {t('enrollmentDate')}
                      </label>
                      <input
                        type="date"
                        value={formData.fecha_ingreso || ''}
                        onChange={(e) => setFormData(prev => ({ ...prev, fecha_ingreso: e.target.value }))}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-none focus:border-sky-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      {t('residentialAddress')}
                    </label>
                    <textarea
                      rows={2}
                      value={formData.direccion_residencial || ''}
                      onChange={(e) => setFormData(prev => ({ ...prev, direccion_residencial: e.target.value }))}
                      placeholder="Calle, Residencia o Edificio, Apto/Casa, Ciudad, Provincia, País"
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-none focus:border-sky-500 resize-none"
                    />
                  </div>

                  {/* Delegación de Permisos de Creación por Jefatura */}
                  {isJefatura && (formData.rol === 'escuela' || formData.rol === 'contabilidad') && (
                    <div className="p-3.5 bg-purple-50 rounded-2xl border border-purple-200 flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2.5">
                        <Shield className="w-5 h-5 text-purple-600 flex-shrink-0" />
                        <div>
                          <span className="text-xs font-bold text-purple-950 block">
                            Permiso de Creación de Usuarios
                          </span>
                        </div>
                      </div>

                      <label className="relative inline-flex items-center cursor-pointer flex-shrink-0">
                        <input
                          type="checkbox"
                          checked={Boolean(formData.puede_crear_usuarios)}
                          onChange={(e) => setFormData(prev => ({
                            ...prev,
                            puede_crear_usuarios: e.target.checked,
                            permisos_delegados: {
                              ...prev.permisos_delegados,
                              crear_usuarios: e.target.checked,
                              asignado_por: currentUser.nombre,
                              fecha_asignacion: new Date().toISOString()
                            }
                          }))}
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
                      </label>
                    </div>
                  )}

                  {formData.rol === 'estudiante' && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 bg-sky-50/60 rounded-2xl border border-sky-200">
                      <div>
                        <label className="block text-xs font-bold text-sky-900 mb-1">
                          {t('currentCourse')}
                        </label>
                        <select
                          value={formData.curso_actual || 'Privado'}
                          onChange={(e) => setFormData(prev => ({ ...prev, curso_actual: e.target.value }))}
                          className="w-full px-3 py-2 bg-white border border-sky-300 rounded-xl text-xs text-slate-900 font-semibold focus:outline-none cursor-pointer"
                        >
                          <option value="Privado">Piloto Privado (PPL)</option>
                          <option value="Comercial">Piloto Comercial (CPL)</option>
                          <option value="Multi-Motor">Habilitación Multi-Motor (ME)</option>
                          <option value="IFR">Habilitación por Instrumentos (IFR)</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-sky-900 mb-1">
                          {t('assignedInstructor')}
                        </label>
                        <select
                          value={formData.instructor_asignado_id || ''}
                          onChange={(e) => setFormData(prev => ({ ...prev, instructor_asignado_id: e.target.value }))}
                          className="w-full px-3 py-2 bg-white border border-sky-300 rounded-xl text-xs text-slate-900 font-semibold focus:outline-none cursor-pointer"
                        >
                          <option value="">{language === 'es' ? '-- Sin instructor asignado --' : '-- No CFI assigned --'}</option>
                          {instructorsList.map(inst => (
                            <option key={inst.id} value={inst.id}>
                              {inst.nombre}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* TAB 2: CONTACTOS EN CASO DE EMERGENCIA */}
              {activeFormTab === 'emergency' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-xs font-bold text-slate-800">{t('emergencyContacts')}</h4>
                    </div>

                    <button
                      type="button"
                      onClick={handleAddEmergencyContact}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-sky-50 hover:bg-sky-100 text-sky-700 text-xs font-bold rounded-xl border border-sky-200 cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>{t('addEmergencyContact')}</span>
                    </button>
                  </div>

                  {(formData.contactos_emergencia || []).map((contact, index) => (
                    <div
                      key={index}
                      className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3 relative group"
                    >
                      <div className="flex items-center justify-between border-b border-slate-200/80 pb-2">
                        <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                          <HeartHandshake className="w-4 h-4 text-amber-500" />
                          <span>Contacto #{index + 1}</span>
                        </span>

                        {(formData.contactos_emergencia?.length || 0) > 1 && (
                          <button
                            type="button"
                            onClick={() => handleRemoveEmergencyContact(index)}
                            className="text-rose-500 hover:text-rose-700 p-1 rounded hover:bg-rose-50 cursor-pointer"
                            title={t('delete')}
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[11px] font-bold text-slate-600 mb-1">
                            {t('contactName')} *
                          </label>
                          <input
                            type="text"
                            required
                            value={contact.nombre}
                            onChange={(e) => handleEmergencyContactChange(index, 'nombre', e.target.value)}
                            placeholder="ej. Fernando Alvarado"
                            className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-sky-500"
                          />
                        </div>

                        <div>
                          <label className="block text-[11px] font-bold text-slate-600 mb-1">
                            {t('relationship')} *
                          </label>
                          <select
                            value={contact.parentesco}
                            onChange={(e) => handleEmergencyContactChange(index, 'parentesco', e.target.value)}
                            className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-xl text-xs text-slate-900 font-semibold focus:outline-none cursor-pointer"
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

                        <div>
                          <label className="block text-[11px] font-bold text-slate-600 mb-1">
                            {t('emergencyPhone')} *
                          </label>
                          <input
                            type="tel"
                            required
                            value={contact.telefono}
                            onChange={(e) => handleEmergencyContactChange(index, 'telefono', e.target.value)}
                            placeholder="+507 6700-1122"
                            className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-sky-500"
                          />
                        </div>

                        <div>
                          <label className="block text-[11px] font-bold text-slate-600 mb-1">
                            {t('secondaryPhone')}
                          </label>
                          <input
                            type="tel"
                            value={contact.telefono_secundario || ''}
                            onChange={(e) => handleEmergencyContactChange(index, 'telefono_secundario', e.target.value)}
                            placeholder="+507 290-4400 (Casa / Trabajo)"
                            className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-sky-500"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* TAB 3: DOCUMENTOS AERONÁUTICOS Y FOTOS */}
              {activeFormTab === 'documents' && (
                <div className="space-y-6">
                  {/* PILOT LICENSE CARD */}
                  <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-4">
                    <div className="flex items-center gap-2">
                      <Plane className="w-4 h-4 text-sky-600" />
                      <h4 className="text-xs font-bold text-slate-800">
                        {language === 'es' ? 'Licencia de Piloto (PPL / CPL / ATPL / CFI)' : 'Pilot Certificate & Ratings'}
                      </h4>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">
                          {t('licenseNumber')}
                        </label>
                        <input
                          type="text"
                          value={formData.licencia || ''}
                          onChange={(e) => setFormData(prev => ({ ...prev, licencia: e.target.value }))}
                          placeholder="PPL-10492 / CPL-3918"
                          className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-sky-500"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">
                          {t('licenseExpiration')}
                        </label>
                        <input
                          type="date"
                          value={formData.vencimiento_licencia || ''}
                          onChange={(e) => setFormData(prev => ({ ...prev, vencimiento_licencia: e.target.value }))}
                          className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-sky-500"
                        />
                      </div>
                    </div>

                    {/* Foto Licencia Upload & Preview */}
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1.5">
                        {t('licensePhoto')}
                      </label>
                      {formData.foto_licencia ? (
                        <div className="relative group rounded-xl overflow-hidden border border-slate-300 bg-slate-900 h-40 flex items-center justify-center">
                          <img
                            src={formData.foto_licencia}
                            alt="Licencia"
                            className="max-h-full max-w-full object-contain"
                          />
                          <div className="absolute inset-0 bg-slate-950/70 opacity-0 group-hover:opacity-100 flex items-center justify-center gap-3 transition-opacity">
                            <button
                              type="button"
                              onClick={() => setLightboxImage({ url: formData.foto_licencia!, title: t('licensePhoto') })}
                              className="p-2 bg-white/20 hover:bg-white/30 text-white rounded-lg cursor-pointer"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                            <label className="p-2 bg-sky-600 hover:bg-sky-500 text-white rounded-lg cursor-pointer">
                              <Upload className="w-4 h-4" />
                              <input
                                type="file"
                                accept="image/*"
                                onChange={(e) => handleFileUpload(e, 'foto_licencia')}
                                className="hidden"
                              />
                            </label>
                            <button
                              type="button"
                              onClick={() => setFormData(prev => ({ ...prev, foto_licencia: '' }))}
                              className="p-2 bg-rose-600 hover:bg-rose-500 text-white rounded-lg cursor-pointer"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      ) : (
                        <label className="border-2 border-dashed border-slate-300 hover:border-sky-400 bg-white hover:bg-sky-50/50 rounded-2xl p-4 flex flex-col items-center justify-center cursor-pointer transition-colors text-center">
                          <Upload className="w-6 h-6 text-slate-400 mb-1" />
                          <span className="text-xs font-semibold text-slate-700">{t('dragOrClickUpload')}</span>
                          <span className="text-[10px] text-slate-400">PNG, JPG, PDF Escaneado</span>
                          <input
                            type="file"
                            accept="image/*"
                            onChange={(e) => handleFileUpload(e, 'foto_licencia')}
                            className="hidden"
                          />
                        </label>
                      )}
                    </div>
                  </div>

                  {/* MEDICAL CERTIFICATE CARD */}
                  <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-4">
                    <div className="flex items-center gap-2">
                      <Shield className="w-4 h-4 text-emerald-600" />
                      <h4 className="text-xs font-bold text-slate-800">
                        {language === 'es' ? 'Certificado Médico Aeronáutico (Clase 1 / Clase 2 / Clase 3)' : 'Aero-Medical Certification'}
                      </h4>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">
                          {t('medicalNumber')}
                        </label>
                        <input
                          type="text"
                          value={formData.numero_medico || ''}
                          onChange={(e) => setFormData(prev => ({ ...prev, numero_medico: e.target.value }))}
                          placeholder="MED-CL1-09412"
                          className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-sky-500"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">
                          {t('medicalCertExpiration')}
                        </label>
                        <input
                          type="date"
                          value={formData.vencimiento_medico || ''}
                          onChange={(e) => setFormData(prev => ({ ...prev, vencimiento_medico: e.target.value }))}
                          className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-sky-500"
                        />
                      </div>
                    </div>

                    {/* Foto Certificado Médico Upload & Preview */}
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1.5">
                        {t('medicalCertPhoto')}
                      </label>
                      {formData.foto_medico ? (
                        <div className="relative group rounded-xl overflow-hidden border border-slate-300 bg-slate-900 h-40 flex items-center justify-center">
                          <img
                            src={formData.foto_medico}
                            alt="Certificado Médico"
                            className="max-h-full max-w-full object-contain"
                          />
                          <div className="absolute inset-0 bg-slate-950/70 opacity-0 group-hover:opacity-100 flex items-center justify-center gap-3 transition-opacity">
                            <button
                              type="button"
                              onClick={() => setLightboxImage({ url: formData.foto_medico!, title: t('medicalCertPhoto') })}
                              className="p-2 bg-white/20 hover:bg-white/30 text-white rounded-lg cursor-pointer"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                            <label className="p-2 bg-sky-600 hover:bg-sky-500 text-white rounded-lg cursor-pointer">
                              <Upload className="w-4 h-4" />
                              <input
                                type="file"
                                accept="image/*"
                                onChange={(e) => handleFileUpload(e, 'foto_medico')}
                                className="hidden"
                              />
                            </label>
                            <button
                              type="button"
                              onClick={() => setFormData(prev => ({ ...prev, foto_medico: '' }))}
                              className="p-2 bg-rose-600 hover:bg-rose-500 text-white rounded-lg cursor-pointer"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      ) : (
                        <label className="border-2 border-dashed border-slate-300 hover:border-emerald-400 bg-white hover:bg-emerald-50/50 rounded-2xl p-4 flex flex-col items-center justify-center cursor-pointer transition-colors text-center">
                          <Upload className="w-6 h-6 text-slate-400 mb-1" />
                          <span className="text-xs font-semibold text-slate-700">{t('dragOrClickUpload')}</span>
                          <span className="text-[10px] text-slate-400">Certificado Médico Aeronáutico (Clase 1 / 2 / 3)</span>
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
                </div>
              )}

              {/* Modal Footer Controls */}
              <div className="pt-4 border-t border-slate-200 flex items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl border border-slate-300 text-slate-700 text-xs font-bold hover:bg-slate-100 transition-colors cursor-pointer"
                >
                  {t('cancel')}
                </button>

                <div className="flex items-center gap-2">
                  {activeFormTab === 'personal' && (
                    <button
                      type="button"
                      onClick={() => setActiveFormTab('emergency')}
                      className="px-4 py-2.5 rounded-xl bg-slate-900 text-white text-xs font-bold hover:bg-slate-800 transition-colors cursor-pointer"
                    >
                      {language === 'es' ? 'Siguiente: Contactos de Emergencia →' : 'Next: Emergency Contacts →'}
                    </button>
                  )}

                  {activeFormTab === 'emergency' && (
                    <button
                      type="button"
                      onClick={() => setActiveFormTab('documents')}
                      className="px-4 py-2.5 rounded-xl bg-slate-900 text-white text-xs font-bold hover:bg-slate-800 transition-colors cursor-pointer"
                    >
                      {language === 'es' ? 'Siguiente: Documentos Aeronáuticos →' : 'Next: Aeronautical Documents →'}
                    </button>
                  )}

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="px-5 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-700 text-white text-xs font-bold shadow-md shadow-sky-600/30 transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    <Check className="w-4 h-4" />
                    <span>{isSubmitting ? t('loading') : t('save')}</span>
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL: EXPEDIENTE COMPLETO DEL USUARIO (DETAIL INSPECTOR) */}
      {/* ========================================================= */}
      {selectedUserForDetail && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-2xl w-full my-auto overflow-hidden max-h-[90vh] flex flex-col">
            <div className="p-4 sm:p-6 bg-slate-900 text-white flex items-center justify-between flex-shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-slate-800 border border-slate-700 overflow-hidden flex items-center justify-center">
                  {selectedUserForDetail.foto_perfil ? (
                    <img
                      src={selectedUserForDetail.foto_perfil}
                      alt={selectedUserForDetail.nombre}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <Users className="w-6 h-6 text-sky-400" />
                  )}
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-0.5">
                    <h3 className="text-base font-bold text-white">
                      {selectedUserForDetail.nombre}
                    </h3>
                    {getRoleBadge(selectedUserForDetail.rol)}
                  </div>
                  <p className="text-xs text-slate-400">
                    {selectedUserForDetail.correo} • {selectedUserForDetail.telefono}
                  </p>
                </div>
              </div>

              <button
                onClick={() => setSelectedUserForDetail(null)}
                className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 sm:p-6 flex-1 min-h-0 overflow-y-auto space-y-5 text-xs text-slate-700">
              {/* Personal Details Strip */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-4 bg-slate-50 rounded-2xl border border-slate-200">
                {selectedUserForDetail.documento_identidad && (
                  <div>
                    <span className="text-slate-400 block text-[11px] font-bold">{t('nationalId')}</span>
                    <span className="font-semibold text-slate-900">{selectedUserForDetail.documento_identidad}</span>
                  </div>
                )}

                {selectedUserForDetail.fecha_ingreso && (
                  <div>
                    <span className="text-slate-400 block text-[11px] font-bold">{t('enrollmentDate')}</span>
                    <span className="font-semibold text-slate-900">{selectedUserForDetail.fecha_ingreso}</span>
                  </div>
                )}

                {selectedUserForDetail.direccion_residencial && (
                  <div className="sm:col-span-2">
                    <span className="text-slate-400 block text-[11px] font-bold flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5 text-slate-400" />
                      {t('residentialAddress')}
                    </span>
                    <span className="font-medium text-slate-800 mt-0.5 block">{selectedUserForDetail.direccion_residencial}</span>
                  </div>
                )}
              </div>

              {/* Security & Authorization Audit Strip */}
              <div className="p-4 bg-slate-900 text-white rounded-2xl space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Shield className="w-4 h-4 text-amber-400" />
                    <h4 className="text-xs font-black uppercase tracking-wider text-slate-200">
                      Seguridad y Control de Acceso
                    </h4>
                  </div>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    selectedUserForDetail.activo
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                      : 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                  }`}>
                    {selectedUserForDetail.activo ? 'Usuario Activo' : 'Usuario Inactivo'}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-[11px]">
                  <div className="bg-slate-800/80 p-2.5 rounded-xl border border-slate-700">
                    <span className="text-slate-400 block">Método de Acceso:</span>
                    <span className="font-bold text-white flex items-center gap-1 mt-0.5">
                      Correo y Contraseña
                    </span>
                  </div>

                  <div className="bg-slate-800/80 p-2.5 rounded-xl border border-slate-700">
                    <span className="text-slate-400 block">Autorizado Por:</span>
                    <span className="font-bold text-white mt-0.5 block truncate">
                      {selectedUserForDetail.autorizado_por || 'Administración Principal'}
                    </span>
                  </div>

                  <div className="bg-slate-800/80 p-2.5 rounded-xl border border-slate-700">
                    <span className="text-slate-400 block">Fecha de Registro:</span>
                    <span className="font-bold text-white mt-0.5 block">
                      {selectedUserForDetail.creado_en
                        ? new Date(selectedUserForDetail.creado_en).toLocaleDateString('es-PA')
                        : 'Registrado'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Emergency Contacts Section */}
              <div className="space-y-2.5">
                <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                  <HeartHandshake className="w-4 h-4 text-amber-500" />
                  <span>{t('emergencyContacts')}</span>
                </h4>

                {selectedUserForDetail.contactos_emergencia && selectedUserForDetail.contactos_emergencia.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {selectedUserForDetail.contactos_emergencia.map((contact, idx) => (
                      <div key={idx} className="p-3 bg-amber-50/60 rounded-xl border border-amber-200/80 space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-slate-900 text-xs">{contact.nombre}</span>
                          <span className="text-[10px] font-bold bg-amber-200 text-amber-900 px-1.5 py-0.2 rounded">
                            {contact.parentesco}
                          </span>
                        </div>
                        <div className="text-slate-600 flex items-center gap-1">
                          <Phone className="w-3 h-3 text-amber-600" />
                          <span className="font-semibold">{contact.telefono}</span>
                        </div>
                        {contact.telefono_secundario && (
                          <div className="text-slate-500 text-[11px]">
                            {language === 'es' ? 'Secundario' : 'Secondary'}: {contact.telefono_secundario}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-slate-400 italic text-[11px]">{language === 'es' ? 'No se han registrado contactos de emergencia.' : 'No emergency contacts registered.'}</p>
                )}
              </div>

              {/* Aeronautical Credentials & Image Previews */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                  <Plane className="w-4 h-4 text-sky-600" />
                  <span>{t('aeronauticalDocuments')}</span>
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Licencia */}
                  <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
                    <span className="text-slate-400 block text-[11px] font-bold">{t('licenseNumber')}</span>
                    <span className="font-bold text-slate-900">{selectedUserForDetail.licencia || 'N/A'}</span>
                    {selectedUserForDetail.vencimiento_licencia && (
                      <div className="text-[11px] text-slate-500">
                        {t('licenseExpiration')}: <span className="font-semibold text-slate-700">{selectedUserForDetail.vencimiento_licencia}</span>
                      </div>
                    )}
                    {selectedUserForDetail.foto_licencia && (
                      <div
                        onClick={() => setLightboxImage({ url: selectedUserForDetail.foto_licencia!, title: `${t('licensePhoto')} - ${selectedUserForDetail.nombre}` })}
                        className="h-28 rounded-xl overflow-hidden border border-slate-300 bg-slate-900 flex items-center justify-center cursor-pointer hover:opacity-90 transition-opacity"
                      >
                        <img
                          src={selectedUserForDetail.foto_licencia}
                          alt="Licencia"
                          className="h-full w-full object-cover"
                        />
                      </div>
                    )}
                  </div>

                  {/* Certificado Médico */}
                  <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
                    <span className="text-slate-400 block text-[11px] font-bold">{t('medicalNumber')}</span>
                    <span className="font-bold text-slate-900">{selectedUserForDetail.numero_medico || 'N/A'}</span>
                    {selectedUserForDetail.vencimiento_medico && (
                      <div className="text-[11px] text-slate-500">
                        {t('medicalCertExpiration')}: <span className="font-semibold text-slate-700">{selectedUserForDetail.vencimiento_medico}</span>
                      </div>
                    )}
                    {selectedUserForDetail.foto_medico && (
                      <div
                        onClick={() => setLightboxImage({ url: selectedUserForDetail.foto_medico!, title: `${t('medicalCertPhoto')} - ${selectedUserForDetail.nombre}` })}
                        className="h-28 rounded-xl overflow-hidden border border-slate-300 bg-slate-900 flex items-center justify-center cursor-pointer hover:opacity-90 transition-opacity"
                      >
                        <img
                          src={selectedUserForDetail.foto_medico}
                          alt="Certificado Médico"
                          className="h-full w-full object-cover"
                        />
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="p-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between gap-2 flex-wrap">
              <button
                onClick={() => setSelectedUserForDetail(null)}
                className="px-4 py-2 bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 rounded-xl text-xs font-bold transition-colors cursor-pointer"
              >
                {t('closeExpediente')}
              </button>

              <div className="flex items-center gap-2">
                {isAuthorized && (
                  <button
                    onClick={() => {
                      const u = selectedUserForDetail;
                      setSelectedUserForDetail(null);
                      handleOpenEditModal(u);
                    }}
                    className="px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 cursor-pointer"
                  >
                    <Edit className="w-3.5 h-3.5" />
                    <span>{t('editUser')}</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* LIGHTBOX: FOTO DE DOCUMENTO AERONÁUTICO CON ZOOM          */}
      {/* ========================================================= */}
      {lightboxImage && (
        <div
          onClick={() => setLightboxImage(null)}
          className="fixed inset-0 z-60 bg-slate-950/90 backdrop-blur-md flex flex-col items-center justify-center p-4 cursor-pointer"
        >
          <div className="max-w-3xl w-full flex items-center justify-between text-white mb-2" onClick={e => e.stopPropagation()}>
            <h4 className="text-sm font-bold truncate">{lightboxImage.title}</h4>
            <button
              onClick={() => setLightboxImage(null)}
              className="p-1 text-slate-400 hover:text-white rounded-lg cursor-pointer"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
          <div className="max-w-3xl max-h-[80vh] overflow-hidden rounded-2xl border border-slate-700 bg-black flex items-center justify-center shadow-2xl" onClick={e => e.stopPropagation()}>
            <img
              src={lightboxImage.url}
              alt={lightboxImage.title}
              className="max-h-[80vh] w-auto object-contain"
            />
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL: REGISTRO COMPLETO DE NUEVO USUARIO                  */}
      {/* ========================================================= */}
      <UserRegistrationModal
        isOpen={isRegistrationModalOpen}
        onClose={() => setIsRegistrationModalOpen(false)}
        currentUser={currentUser}
        allUsers={allUsers}
        onUserCreated={async () => {
          await onRefreshAll();
        }}
      />
    </div>
  );
};
