import React, { useState } from 'react';
import { User, UserRole } from '../types';
import { useLanguage } from '../i18n/LanguageContext';
import { useTheme } from '../context/ThemeContext';
import { ThemeCustomizerModal } from './ThemeCustomizerModal';
import { LanguageToggle } from './LanguageToggle';
import { SkyOpsLogo, SkyOpsEmblem } from './SkyOpsLogo';
import {
  Lock,
  ArrowRight,
  ShieldCheck,
  AlertCircle,
  CheckCircle2,
  Loader2,
  Sparkles,
  Sun,
  Moon,
  Palette,
  Eye,
  EyeOff,
  UserCheck,
  CreditCard,
  Plane,
  Wrench
} from 'lucide-react';

interface LoginScreenProps {
  users: User[];
  onLogin: (user: User) => void;
  loggedOutMessage?: string | null;
  firebaseConnected?: boolean;
  onReplayIntro?: () => void;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({
  users,
  onLogin,
  loggedOutMessage,
  onReplayIntro
}) => {
  const { t, language } = useLanguage();
  const { isDark, toggleTheme, isModalOpen, openModal, closeModal, activeHex } = useTheme();

  // Los campos de ingreso inician completamente vacíos
  const [identifier, setIdentifier] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const cleanIdentifier = identifier.trim();
    const cleanPassword = password.trim();

    if (!cleanIdentifier || !cleanPassword) {
      setError(
        language === 'es'
          ? 'Por favor ingresa tu usuario, correo o cédula y tu contraseña.'
          : 'Please enter your user, email or ID number and your password.'
      );
      return;
    }

    setIsSubmitting(true);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier: cleanIdentifier, password: cleanPassword })
      });
      const data = await res.json();

      if (res.ok && data.user) {
        onLogin(data.user);
        return;
      } else if (res.status === 401 || res.status === 400 || res.status === 403) {
        setError(data.error || (language === 'es' ? 'Credenciales inválidas.' : 'Invalid credentials.'));
        setIsSubmitting(false);
        return;
      }
    } catch (err) {
      console.warn('Endpoint /api/auth/login no respondió, validando contra estado local de usuarios:', err);
    }

    // Fallback de validación en cliente (por correo, cédula/documento de identidad o ID)
    const cleanId = cleanIdentifier.toLowerCase();
    const cleanDoc = cleanIdentifier.replace(/[\s.-]/g, '').toLowerCase();

    // Verificación de credenciales maestras de Jefatura de Operaciones e Instrucción / Master
    if (
      (cleanId === 'amunoz4100@gmail.com' ||
       cleanId === 'amunoz410@gmail.com' ||
       cleanId === 'amunoz4100' ||
       cleanId === 'amunoz410' ||
       cleanId === 'antpilot26@skyops.com' ||
       cleanDoc === '87421980' ||
       cleanId === '8-742-1980') &&
      (cleanPassword === 'Antpilot26' || cleanPassword === 'Antpilot26.')
    ) {
      const adminUser = users.find(
        (u) =>
          u.correo.toLowerCase() === 'amunoz4100@gmail.com' ||
          u.correo.toLowerCase() === 'amunoz410@gmail.com' ||
          u.correo.toLowerCase() === 'antpilot26@skyops.com' ||
          (u.documento_identidad && u.documento_identidad.replace(/[\s.-]/g, '') === '87421980')
      ) || {
        id: 'usr_amunoz_admin',
        nombre: 'Cap. Anthony Muñoz - Jefatura de Operaciones e Instrucción',
        rol: 'admin',
        telefono: '+507 6890-1122',
        correo: 'amunoz4100@gmail.com',
        password: 'Antpilot26',
        documento_identidad: '8-742-1980',
        direccion_residencial: 'Aeropuerto Internacional Marcos A. Gelabert, Hangar SkyOps, Panamá',
        fecha_ingreso: '2024-01-01',
        licencia: 'AAC-ATPL-09412',
        vencimiento_medico: '2028-12-31',
        vencimiento_licencia: '2028-12-31',
        numero_medico: 'MED-CL1-09412-AAC',
        activo: true,
        auth_provider: 'local',
        estado_autorizacion: 'aprobado'
      };
      onLogin(adminUser as User);
      return;
    }

    // Verificación de credenciales oficiales de Contabilidad & Finanzas
    if (
      (cleanId === 'contabilidad@skyops.com' ||
       cleanId === 'conta@skyops.com' ||
       cleanId === 'contabilidad' ||
       cleanId === 'conta' ||
       cleanDoc === '88002020' ||
       cleanId === '8-800-2020') &&
      (cleanPassword === 'Conta2026.' ||
       cleanPassword === 'Conta2026' ||
       cleanPassword === 'SkyOpsConta26.' ||
       cleanPassword === 'SkyOpsConta26' ||
       cleanPassword === 'Conta26.' ||
       cleanPassword === 'Conta26')
    ) {
      const contaUser = users.find(
        (u) =>
          u.correo.toLowerCase() === 'contabilidad@skyops.com' ||
          (u.documento_identidad && u.documento_identidad.replace(/[\s.-]/g, '') === '88002020') ||
          u.rol === 'contabilidad'
      ) || {
        id: 'usr_conta_1',
        nombre: 'Lic. Mariana Chen - Contabilidad y Finanzas',
        rol: 'contabilidad',
        telefono: '+507 6233-7711',
        correo: 'contabilidad@skyops.com',
        password: 'Conta2026.',
        documento_identidad: '8-800-2020',
        activo: true,
        auth_provider: 'local',
        estado_autorizacion: 'aprobado'
      };
      onLogin(contaUser as User);
      return;
    }

    // Verificación de credenciales oficiales de Estudiante / Alumno
    if (
      (cleanId === 'alumno@skyops.com' ||
       cleanId === 'estudiante@skyops.com' ||
       cleanId === 'daniel.alvarado@skyops.com' ||
       cleanId === 'alumno' ||
       cleanId === 'estudiante' ||
       cleanDoc === '89201140' ||
       cleanId === '8-920-1140') &&
      (cleanPassword === 'Alumno2026.' ||
       cleanPassword === 'Alumno2026' ||
       cleanPassword === 'Estudiante2026.' ||
       cleanPassword === 'Estudiante2026' ||
       cleanPassword === 'SkyOpsDaniel26.' ||
       cleanPassword === 'SkyOpsDaniel26')
    ) {
      const estUser = users.find(
        (u) =>
          u.correo.toLowerCase() === 'alumno@skyops.com' ||
          u.correo.toLowerCase() === 'daniel.alvarado@skyops.com' ||
          (u.documento_identidad && u.documento_identidad.replace(/[\s.-]/g, '') === '89201140') ||
          u.rol === 'estudiante'
      ) || {
        id: 'usr_est_daniel',
        nombre: 'Daniel Alvarado - Alumno Piloto CPL-A',
        rol: 'estudiante',
        telefono: '+507 6412-8899',
        correo: 'alumno@skyops.com',
        password: 'Alumno2026.',
        documento_identidad: '8-920-1140',
        curso_actual: 'Piloto Comercial de Avión (CPL-A)',
        licencia: 'AAC-SPL-11420',
        activo: true,
        auth_provider: 'local',
        estado_autorizacion: 'aprobado'
      };
      onLogin(estUser as User);
      return;
    }

    // Verificación de credenciales oficiales de Instructor (Cap. Valeria Benítez)
    if (
      (cleanId === 'instructor@skyops.com' ||
       cleanId === 'instructor' ||
       cleanId === 'valeria.benitez@skyops.com' ||
       cleanId === 'valeria' ||
       cleanDoc === '87901420' ||
       cleanId === '8-790-1420') &&
      (cleanPassword === 'Instructor2026.' ||
       cleanPassword === 'Instructor2026' ||
       cleanPassword === 'SkyOpsValeria26.' ||
       cleanPassword === 'SkyOpsInstructor26.' ||
       cleanPassword === 'Instructor26.' ||
       cleanPassword === 'Instructor26')
    ) {
      const instUser = users.find(
        (u) =>
          u.correo.toLowerCase() === 'instructor@skyops.com' ||
          u.correo.toLowerCase() === 'valeria.benitez@skyops.com' ||
          (u.documento_identidad && u.documento_identidad.replace(/[\s.-]/g, '') === '87901420') ||
          u.rol === 'instructor'
      ) || {
        id: 'usr_inst_valeria',
        nombre: 'Cap. Valeria Benítez - Instructora de Vuelo (CFI-A)',
        rol: 'instructor',
        telefono: '+507 6711-2233',
        correo: 'instructor@skyops.com',
        password: 'Instructor2026.',
        documento_identidad: '8-790-1420',
        licencia: 'AAC-CFI-08812',
        vencimiento_medico: '2027-10-31',
        vencimiento_licencia: '2027-11-30',
        numero_medico: 'MED-CL1-08812-AAC',
        activo: true,
        auth_provider: 'local',
        estado_autorizacion: 'aprobado'
      };
      onLogin(instUser as User);
      return;
    }

    // Verificación de credenciales oficiales de Taller & Mantenimiento Aeronáutico (TMA / OMA)
    if (
      (cleanId === 'taller@skyops.com' ||
       cleanId === 'taller' ||
       cleanId === 'mantenimiento@skyops.com' ||
       cleanId === 'mantenimiento' ||
       cleanId === 'carlos.mendoza@skyops.com' ||
       cleanId === 'carlos' ||
       cleanDoc === '87654321' ||
       cleanId === '8-765-4321') &&
      (cleanPassword === 'Taller2026.' ||
       cleanPassword === 'Taller2026' ||
       cleanPassword === 'SkyOpsTaller26.' ||
       cleanPassword === 'SkyOpsTaller26' ||
       cleanPassword === 'Taller26.' ||
       cleanPassword === 'Taller26')
    ) {
      const tallerUser = users.find(
        (u) =>
          u.correo.toLowerCase() === 'taller@skyops.com' ||
          u.correo.toLowerCase() === 'carlos.mendoza@skyops.com' ||
          (u.documento_identidad && u.documento_identidad.replace(/[\s.-]/g, '') === '87654321') ||
          u.rol === 'mantenimiento'
      ) || {
        id: 'usr_taller_carlos',
        nombre: 'Ing. Carlos Mendoza - Jefe de Taller & TMA',
        rol: 'mantenimiento',
        telefono: '+507 6890-4411',
        correo: 'taller@skyops.com',
        password: 'Taller2026.',
        documento_identidad: '8-765-4321',
        direccion_residencial: 'Albrook, Hangar 3B, Ciudad de Panamá',
        fecha_ingreso: '2023-08-01',
        licencia: 'AAC-TMA-04521',
        vencimiento_licencia: '2027-12-31',
        activo: true,
        auth_provider: 'local',
        estado_autorizacion: 'aprobado'
      };
      onLogin(tallerUser as User);
      return;
    }

    const matchedUser = users.find((u) => {
      if (u.correo && u.correo.trim().toLowerCase() === cleanId) return true;
      if (u.documento_identidad) {
        const userDoc = u.documento_identidad.trim().toLowerCase();
        const userDocClean = userDoc.replace(/[\s.-]/g, '');
        if (userDoc === cleanId || userDocClean === cleanDoc) return true;
      }
      if (u.id && u.id.trim().toLowerCase() === cleanId) return true;
      return false;
    });

    if (matchedUser) {
      const isMasterPwdMatch = (matchedUser.rol === 'admin' || matchedUser.rol === 'escuela') &&
        (cleanPassword === 'Antpilot26' || cleanPassword === 'Antpilot26.') &&
        (matchedUser.password === 'Antpilot26' || matchedUser.password === 'Antpilot26.');

      const isContaPwdMatch = (matchedUser.rol === 'contabilidad') &&
        (cleanPassword === 'Conta2026.' || cleanPassword === 'Conta2026' || cleanPassword === 'SkyOpsConta26.' || cleanPassword === 'SkyOpsConta26' || cleanPassword === 'Conta26.' || cleanPassword === 'Conta26');

      const isStudentPwdMatch = (matchedUser.rol === 'estudiante') &&
        (cleanPassword === 'Alumno2026.' || cleanPassword === 'Alumno2026' || cleanPassword === 'Estudiante2026.' || cleanPassword === 'Estudiante2026' || cleanPassword === 'SkyOpsDaniel26.' || cleanPassword === 'SkyOpsDaniel26');

      const isInstructorPwdMatch = (matchedUser.rol === 'instructor' || matchedUser.rol === 'instructor_en_jefe') &&
        (cleanPassword === 'Instructor2026.' || cleanPassword === 'Instructor2026' || cleanPassword === 'SkyOpsValeria26.' || cleanPassword === 'SkyOpsInstructor26.' || cleanPassword === 'Instructor26.' || cleanPassword === 'Instructor26' || cleanPassword === 'SkyOpsChief26.');

      const isTallerPwdMatch = (matchedUser.rol === 'mantenimiento') &&
        (cleanPassword === 'Taller2026.' || cleanPassword === 'Taller2026' || cleanPassword === 'SkyOpsTaller26.' || cleanPassword === 'SkyOpsTaller26' || cleanPassword === 'Taller26.' || cleanPassword === 'Taller26');

      if (matchedUser.password && matchedUser.password !== cleanPassword && !isMasterPwdMatch && !isContaPwdMatch && !isStudentPwdMatch && !isInstructorPwdMatch && !isTallerPwdMatch) {
        setError(
          language === 'es'
            ? 'Contraseña incorrecta. Por favor verifica tus credenciales.'
            : 'Incorrect password. Please verify your credentials.'
        );
        setIsSubmitting(false);
        return;
      }

      if (!matchedUser.activo) {
        setError(
          language === 'es'
            ? 'Esta cuenta se encuentra inactiva o suspendida administrativamente.'
            : 'This account is inactive or administratively suspended.'
        );
        setIsSubmitting(false);
        return;
      }

      onLogin(matchedUser);
    } else {
      setError(
        language === 'es'
          ? 'Usuario, correo o número de cédula no registrado en el sistema SkyOps.'
          : 'User, email or ID number not registered in the SkyOps system.'
      );
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-sky-950 flex flex-col justify-between text-white relative overflow-hidden font-sans">
      {/* Background Decorative Grid */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#1e293b15_1px,transparent_1px),linear-gradient(to_bottom,#1e293b15_1px,transparent_1px)] bg-[size:4rem_4rem] pointer-events-none" />

      {/* Top Header Bar */}
      <header className="relative z-10 p-4 sm:p-6 flex items-center justify-between max-w-7xl mx-auto w-full">
        <SkyOpsLogo
          variant="horizontal"
          size="md"
          theme="dark"
          badgeText="Flight Ops"
          subtitle={t('schoolSubtitle')}
        />

        {/* Language & Interface Controls */}
        <div className="flex items-center gap-3">
          {/* Regulatory Accreditation Pill */}
          <div className="hidden sm:flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-900/90 border border-slate-700/80 text-[11px]">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-slate-300 font-medium">Operaciones Oficiales • SkyOps</span>
          </div>

          {/* Language Pill Switcher */}
          <div className="bg-slate-800/80 p-1 rounded-xl border border-slate-700">
            <LanguageToggle variant="pill" className="bg-transparent border-0" />
          </div>

          {/* Cinematic Intro Replay Button */}
          {onReplayIntro && (
            <button
              id="login-replay-intro-btn"
              onClick={onReplayIntro}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl border border-sky-500/30 bg-sky-950/60 hover:bg-sky-900/80 text-sky-300 hover:text-white text-xs font-semibold transition-all cursor-pointer shadow-xs"
              title={language === 'es' ? 'Ver animación cinematográfica de bienvenida' : 'Watch cinematic intro'}
            >
              <Sparkles className="w-3.5 h-3.5 text-sky-400 animate-pulse" />
              <span className="hidden sm:inline">Intro SkyOps</span>
            </button>
          )}

          {/* Theme Mode Toggle */}
          <button
            id="login-theme-toggle-btn"
            onClick={toggleTheme}
            className="w-9 h-9 rounded-xl border border-slate-700 bg-slate-800/80 text-slate-300 hover:text-white hover:bg-slate-700 flex items-center justify-center transition-colors cursor-pointer"
            title={isDark ? (language === 'es' ? 'Modo Claro' : 'Light Mode') : (language === 'es' ? 'Modo Oscuro' : 'Dark Mode')}
          >
            {isDark ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-sky-400" />}
          </button>

          {/* Palette Customizer Trigger */}
          <button
            id="login-theme-palette-btn"
            onClick={openModal}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border border-slate-700 bg-slate-800/80 text-slate-300 hover:text-white hover:bg-slate-700 text-xs font-semibold transition-colors cursor-pointer"
            title={language === 'es' ? 'Personalizar tema y colores' : 'Customize theme & colors'}
          >
            <span
              className="w-3 h-3 rounded-full border border-white/50 shadow-2xs flex-shrink-0"
              style={{ backgroundColor: activeHex }}
            />
            <Palette className="w-3.5 h-3.5" />
          </button>
        </div>
      </header>

      {/* Main Center Section */}
      <main className="relative z-10 max-w-5xl mx-auto w-full px-4 py-8 sm:py-12 flex flex-col lg:flex-row gap-10 items-center justify-center my-auto">
        {/* Left Side: Institutional Title & Highlights */}
        <div className="w-full lg:w-1/2 space-y-6 text-center lg:text-left">
          <div className="space-y-3">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-sky-500/10 border border-sky-400/30 text-sky-300 text-xs font-semibold">
              <ShieldCheck className="w-4 h-4 text-sky-400" />
              <span>{t('regulatoryCompliance')}</span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white leading-tight">
              {language === 'es' ? 'Gestión Aeronáutica y Operaciones' : 'Aviation Operations & Flight Training'}
            </h1>
          </div>

          <div className="space-y-2.5 pt-2 text-left max-w-md mx-auto lg:mx-0">
            <div className="p-3 rounded-2xl bg-slate-900/60 border border-slate-800 flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-center flex-shrink-0 text-sky-400">
                <CreditCard className="w-4 h-4" />
              </div>
              <div className="text-xs font-bold text-white">
                {language === 'es' ? 'Acceso con Correo o Cédula' : 'Login by Email or National ID'}
              </div>
            </div>

            <div className="p-3 rounded-2xl bg-slate-900/60 border border-slate-800 flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center flex-shrink-0 text-purple-400">
                <UserCheck className="w-4 h-4" />
              </div>
              <div className="text-xs font-bold text-white">
                {language === 'es' ? 'Control de Acceso por Rol' : 'Role-Based Access Control'}
              </div>
            </div>

            <div className="p-3 rounded-2xl bg-slate-900/60 border border-slate-800 flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center flex-shrink-0 text-emerald-400">
                <Plane className="w-4 h-4" />
              </div>
              <div className="text-xs font-bold text-white">
                {language === 'es' ? 'Seguridad Operacional y Bitácoras' : 'Flight Safety & Logbooks'}
              </div>
            </div>
          </div>
        </div>

        {/* Right Side: Clean Authentication Form */}
        <div className="w-full lg:w-5/12 max-w-md">
          <div className="bg-slate-900/90 backdrop-blur-xl p-6 sm:p-8 rounded-3xl border border-slate-800 shadow-2xl space-y-6">
            {/* Status Messages */}
            {loggedOutMessage && (
              <div className="p-3 bg-emerald-950/80 border border-emerald-500/40 rounded-xl text-emerald-200 text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                <span>{loggedOutMessage}</span>
              </div>
            )}

            {error && (
              <div className="p-3 bg-rose-950/80 border border-rose-500/40 rounded-xl text-rose-200 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <div className="flex items-center gap-3.5 pb-1">
              <SkyOpsEmblem className="w-10 h-10" theme="dark" />
              <h2 className="text-xl font-bold text-white leading-tight">
                {language === 'es' ? 'Iniciar Sesión' : 'Sign In'}
              </h2>
            </div>

            {/* Chips de acceso rápido para perfiles oficiales */}
            <div className="space-y-1.5">
              <div className="p-2 rounded-xl bg-purple-950/40 border border-purple-500/30 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 overflow-hidden">
                  <ShieldCheck className="w-3.5 h-3.5 text-purple-400 flex-shrink-0" />
                  <div className="text-[11px] text-slate-300 truncate">
                    <span className="text-purple-300 font-semibold">Jefatura:</span> <span className="text-white">amunoz4100@gmail.com</span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setIdentifier('amunoz4100@gmail.com');
                    setPassword('Antpilot26');
                  }}
                  className="px-2 py-0.5 bg-purple-600 hover:bg-purple-500 text-white rounded text-[10px] font-semibold transition-colors flex-shrink-0 cursor-pointer shadow-sm"
                >
                  Autollenar
                </button>
              </div>

              <div className="p-2 rounded-xl bg-emerald-950/40 border border-emerald-500/30 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 overflow-hidden">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
                  <div className="text-[11px] text-slate-300 truncate">
                    <span className="text-emerald-300 font-semibold">Contabilidad:</span> <span className="text-white">contabilidad@skyops.com</span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setIdentifier('contabilidad@skyops.com');
                    setPassword('Conta2026.');
                  }}
                  className="px-2 py-0.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-[10px] font-semibold transition-colors flex-shrink-0 cursor-pointer shadow-sm"
                >
                  Autollenar
                </button>
              </div>

              <div className="p-2 rounded-xl bg-amber-950/40 border border-amber-500/30 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 overflow-hidden">
                  <ShieldCheck className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />
                  <div className="text-[11px] text-slate-300 truncate">
                    <span className="text-amber-300 font-semibold">Estudiante:</span> <span className="text-white">alumno@skyops.com</span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setIdentifier('alumno@skyops.com');
                    setPassword('Alumno2026.');
                  }}
                  className="px-2 py-0.5 bg-amber-600 hover:bg-amber-500 text-white rounded text-[10px] font-semibold transition-colors flex-shrink-0 cursor-pointer shadow-sm"
                >
                  Autollenar
                </button>
              </div>

              <div className="p-2 rounded-xl bg-sky-950/40 border border-sky-500/30 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 overflow-hidden">
                  <ShieldCheck className="w-3.5 h-3.5 text-sky-400 flex-shrink-0" />
                  <div className="text-[11px] text-slate-300 truncate">
                    <span className="text-sky-300 font-semibold">Instructor:</span> <span className="text-white">instructor@skyops.com</span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setIdentifier('instructor@skyops.com');
                    setPassword('Instructor2026.');
                  }}
                  className="px-2 py-0.5 bg-sky-600 hover:bg-sky-500 text-white rounded text-[10px] font-semibold transition-colors flex-shrink-0 cursor-pointer shadow-sm"
                >
                  Autollenar
                </button>
              </div>

              <div className="p-2 rounded-xl bg-orange-950/40 border border-orange-500/30 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 overflow-hidden">
                  <Wrench className="w-3.5 h-3.5 text-orange-400 flex-shrink-0" />
                  <div className="text-[11px] text-slate-300 truncate">
                    <span className="text-orange-300 font-semibold">Taller / TMA:</span> <span className="text-white">taller@skyops.com</span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setIdentifier('taller@skyops.com');
                    setPassword('Taller2026.');
                  }}
                  className="px-2 py-0.5 bg-orange-600 hover:bg-orange-500 text-white rounded text-[10px] font-semibold transition-colors flex-shrink-0 cursor-pointer shadow-sm"
                >
                  Autollenar
                </button>
              </div>
            </div>

            {/* Official Credentials Form */}
            <form onSubmit={handleSubmit} className="space-y-4 text-xs">
              {/* Field 1: User / Email / Cédula (STARTS EMPTY) */}
              <div>
                <label className="block text-slate-300 font-semibold mb-1.5 text-xs">
                  {language === 'es'
                    ? 'Usuario, Correo o Cédula / Documento'
                    : 'User, Email or ID / Cédula Number'}
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                    <CreditCard className="w-4 h-4" />
                  </div>
                  <input
                    type="text"
                    required
                    autoFocus
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                    placeholder={
                      language === 'es'
                        ? 'ej. amunoz4100@gmail.com o 8-742-1980'
                        : 'e.g. amunoz4100@gmail.com or 8-742-1980'
                    }
                    className="w-full pl-9 pr-3 py-2.5 bg-slate-800/80 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500 transition-colors"
                  />
                </div>
              </div>

              {/* Field 2: Password (STARTS EMPTY) */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-slate-300 font-semibold text-xs">
                    {t('password')}
                  </label>
                  <span className="text-[11px] text-sky-400 hover:text-sky-300 cursor-pointer">
                    {language === 'es' ? '¿Olvidaste tu contraseña?' : 'Forgot password?'}
                  </span>
                </div>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                    <Lock className="w-4 h-4" />
                  </div>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••••••"
                    className="w-full pl-9 pr-10 py-2.5 bg-slate-800/80 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500 transition-colors"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-200 cursor-pointer"
                    title={showPassword ? 'Ocultar contraseña' : 'Ver contraseña'}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Remember Session */}
              <div className="flex items-center justify-between pt-1">
                <label className="flex items-center gap-2 cursor-pointer text-slate-400 text-xs">
                  <input
                    type="checkbox"
                    defaultChecked
                    className="rounded bg-slate-800 border-slate-700 text-sky-600 focus:ring-sky-500 cursor-pointer"
                  />
                  <span>{t('rememberMe')}</span>
                </label>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-3 px-4 bg-gradient-to-r from-sky-600 to-sky-500 hover:from-sky-500 hover:to-sky-400 text-white font-bold rounded-xl shadow-lg shadow-sky-600/30 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 mt-3 text-sm"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>{language === 'es' ? 'Validando credenciales...' : 'Authenticating...'}</span>
                  </>
                ) : (
                  <>
                    <span>{language === 'es' ? 'Ingresar al Sistema' : 'Sign In'}</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 p-4 sm:p-6 text-center text-xs text-slate-500 border-t border-slate-800/60 max-w-7xl mx-auto w-full">
        <p>
          {t('schoolName')} {t('version')} • {t('systemTitle')} • Aeropuerto Internacional Marcos A. Gelabert (MPMG)
        </p>
      </footer>

      {/* Theme Customizer Modal */}
      <ThemeCustomizerModal
        isOpen={isModalOpen}
        onClose={closeModal}
      />
    </div>
  );
};
