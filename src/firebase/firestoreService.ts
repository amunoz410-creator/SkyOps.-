/**
 * Servicio de Persistencia y Sincronización en Cloud Firestore para SkyOps
 */

import {
  collection,
  doc,
  getDoc,
  setDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  onSnapshot,
  writeBatch
} from 'firebase/firestore';
import { User as FirebaseUser } from 'firebase/auth';
import { db } from './config';
import { User, UserRole, Transaction, FlightProgress, Itinerary, POHDocument, OperatingExpense } from '../types';

export const PRINCIPAL_ADMIN_EMAILS = [
  'amunoz4100@gmail.com', // Administrador Master y Jefatura de Operaciones SkyOps
  'amunoz410@gmail.com', // Administrador Master
  'antpilot26@skyops.com', // Jefatura de Operaciones e Instrucción SkyOps
  'jefatura@aeroacademia.com'
];

export function isPrincipalAdmin(user: User | null | undefined): boolean {
  if (!user) return false;
  const email = (user.correo || '').toLowerCase().trim();
  if (PRINCIPAL_ADMIN_EMAILS.includes(email)) return true;
  return (user.rol === 'admin' || user.rol === 'escuela') && user.estado_autorizacion === 'aprobado';
}

/**
 * Ejecuta una operación de Firestore con un tiempo límite estricto para evitar
 * que la aplicación o los formularios se queden congelados / cargando indefinidamente
 * si hay restricciones de red, cuotas o iframe en el navegador.
 */
export async function firestoreWithTimeout<T>(promise: Promise<T>, timeoutMs = 2000): Promise<T | null> {
  let timer: any;
  const timeoutPromise = new Promise<null>((resolve) => {
    timer = setTimeout(() => {
      console.warn(`[Firestore] Operación cancelada por timeout (${timeoutMs}ms) para evitar bloqueos en la interfaz.`);
      resolve(null);
    }, timeoutMs);
  });
  try {
    const result = await Promise.race([promise, timeoutPromise]);
    clearTimeout(timer);
    return result;
  } catch (err) {
    clearTimeout(timer);
    console.warn('[Firestore] Error capturado en operación con timeout:', err);
    return null;
  }
}

export const INITIAL_FIRESTORE_USERS: User[] = [
  {
    id: 'usr_amunoz_admin',
    nombre: 'Cap. Anthony Muñoz - Jefatura de Operaciones e Instrucción',
    rol: 'admin',
    telefono: '+507 6890-1122',
    correo: 'amunoz4100@gmail.com',
    password: 'Antpilot26',
    documento_identidad: '8-742-1980',
    direccion_residencial: 'Aeropuerto Internacional Marcos A. Gelabert, Hangar SkyOps, Albrook, Panamá',
    fecha_ingreso: '2024-01-01',
    licencia: 'AAC-ATPL-09412',
    vencimiento_medico: '2028-12-31',
    vencimiento_licencia: '2028-12-31',
    numero_medico: 'MED-CL1-09412-AAC',
    foto_perfil: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
    activo: true,
    auth_provider: 'local',
    estado_autorizacion: 'aprobado',
    autorizado_por: 'Dirección General de Aviación',
    fecha_autorizacion: '2026-01-01T00:00:00.000Z',
    creado_en: '2026-01-01T00:00:00.000Z'
  },
  {
    id: 'usr_jefatura_1',
    nombre: 'Jefatura de Operaciones e Instrucción SkyOps',
    rol: 'admin',
    telefono: '+507 6890-1122',
    correo: 'antpilot26@skyops.com',
    password: 'Antpilot26.',
    documento_identidad: '8-742-1980',
    direccion_residencial: 'Aeropuerto Internacional Marcos A. Gelabert, Hangar SkyOps, Albrook, Panamá',
    fecha_ingreso: '2024-01-01',
    licencia: 'ATPL-09412',
    vencimiento_medico: '2028-12-31',
    vencimiento_licencia: '2028-12-31',
    numero_medico: 'MED-CL1-09412',
    foto_perfil: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
    activo: true,
    auth_provider: 'local',
    estado_autorizacion: 'aprobado',
    autorizado_por: 'Dirección General de Aviación',
    fecha_autorizacion: '2026-01-01T00:00:00.000Z',
    creado_en: '2026-01-01T00:00:00.000Z'
  },
  {
    id: 'usr_escuela_1',
    nombre: 'Dirección de Escuela & Operaciones',
    rol: 'escuela',
    telefono: '+507 6500-9988',
    correo: 'operaciones@skyops.com',
    password: 'SkyOpsOperaciones26.',
    documento_identidad: '8-550-1975',
    licencia: 'ATPL-07841',
    vencimiento_medico: '2028-04-30',
    vencimiento_licencia: '2028-05-31',
    numero_medico: 'MED-CL1-07841',
    foto_perfil: 'https://images.unsplash.com/photo-1560250097-0b93528c311a?w=150&auto=format&fit=crop&q=80',
    activo: true,
    auth_provider: 'local',
    estado_autorizacion: 'aprobado',
    autorizado_por: 'Jefatura de Instrucción',
    fecha_autorizacion: '2026-01-01T00:00:00.000Z',
    creado_en: '2026-01-01T00:00:00.000Z'
  },
  {
    id: 'usr_escuela_fernando',
    nombre: 'Fernando Alvarado',
    rol: 'escuela',
    telefono: '+507 6500-9910',
    correo: 'fernando.alvarado@skyops.com',
    password: 'SkyOpsFernandoA26.',
    documento_identidad: '8-715-1420',
    direccion_residencial: 'Aeropuerto Internacional Marcos A. Gelabert, Hangar SkyOps, Albrook, Ciudad de Panamá',
    fecha_ingreso: '2026-01-01',
    cargo_departamento: 'Administración / Dirección de Escuela',
    foto_perfil: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
    activo: true,
    auth_provider: 'local',
    estado_autorizacion: 'aprobado',
    autorizado_por: 'Jefatura de Operaciones e Instrucción',
    fecha_autorizacion: '2026-01-01T00:00:00.000Z',
    creado_en: '2026-01-01T00:00:00.000Z',
    puede_crear_usuarios: true,
    permisos_delegados: {
      crear_usuarios: true,
      gestionar_alumnos: true,
      gestionar_instructores: true,
      asignado_por: 'Jefatura de Operaciones',
      fecha_asignacion: '2026-01-01T00:00:00.000Z'
    }
  },
  {
    id: 'usr_escuela_antonio',
    nombre: 'Antonio Muñoz',
    rol: 'escuela',
    telefono: '+507 6500-9920',
    correo: 'antonio.munoz@skyops.com',
    password: 'SkyOpsAntonioM26.',
    documento_identidad: '8-742-1981',
    direccion_residencial: 'Aeropuerto Internacional Marcos A. Gelabert, Hangar SkyOps, Albrook, Ciudad de Panamá',
    fecha_ingreso: '2026-01-01',
    cargo_departamento: 'Administración / Dirección de Escuela',
    foto_perfil: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80',
    activo: true,
    auth_provider: 'local',
    estado_autorizacion: 'aprobado',
    autorizado_por: 'Jefatura de Operaciones e Instrucción',
    fecha_autorizacion: '2026-01-01T00:00:00.000Z',
    creado_en: '2026-01-01T00:00:00.000Z',
    puede_crear_usuarios: true,
    permisos_delegados: {
      crear_usuarios: true,
      gestionar_alumnos: true,
      gestionar_instructores: true,
      asignado_por: 'Jefatura de Operaciones',
      fecha_asignacion: '2026-01-01T00:00:00.000Z'
    }
  },
  {
    id: 'usr_conta_1',
    nombre: 'Lic. Mariana Chen - Contabilidad y Finanzas',
    rol: 'contabilidad',
    telefono: '+507 6233-7711',
    correo: 'contabilidad@skyops.com',
    password: 'Conta2026.',
    documento_identidad: '8-800-2020',
    foto_perfil: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=150&auto=format&fit=crop&q=80',
    activo: true,
    auth_provider: 'local',
    estado_autorizacion: 'aprobado',
    autorizado_por: 'Jefatura de Instrucción',
    fecha_autorizacion: '2026-01-01T00:00:00.000Z',
    creado_en: '2026-01-01T00:00:00.000Z'
  },
  // INSTRUCTOR EN JEFE / JEFE DE PILOTOS E INSTRUCTORES
  {
    id: 'usr_chief_bustamante',
    nombre: 'Cap. A. Bustamante - Instructor en Jefe',
    rol: 'instructor_en_jefe',
    telefono: '+507 6890-7711',
    correo: 'a.bustamante@skyops.com',
    password: 'SkyOpsChief26.',
    documento_identidad: '8-700-1910',
    direccion_residencial: 'Aeropuerto Internacional Marcos A. Gelabert, Hangar SkyOps, Albrook, Ciudad de Panamá',
    fecha_ingreso: '2024-01-01',
    cargo_departamento: 'Jefatura de Pilotos e Instructores',
    licencia: 'AAC-CFI-MEI-04120',
    vencimiento_medico: '2028-12-31',
    vencimiento_licencia: '2028-12-31',
    numero_medico: 'MED-CL1-04120-AAC',
    activo: true,
    auth_provider: 'local',
    estado_autorizacion: 'aprobado',
    autorizado_por: 'Jefatura de Operaciones e Instrucción',
    fecha_autorizacion: '2026-01-01T00:00:00.000Z',
    creado_en: '2026-01-01T00:00:00.000Z',
    puede_crear_usuarios: true
  },
  // INSTRUCTORES OFICIALES SKYOPs
  {
    id: 'usr_inst_valeria',
    nombre: 'Cap. Valeria Benítez - Instructora de Vuelo (CFI-A)',
    rol: 'instructor',
    telefono: '+507 6711-2233',
    correo: 'instructor@skyops.com',
    password: 'Instructor2026.',
    documento_identidad: '8-790-1420',
    direccion_residencial: 'Clayton, Calle Las Acacias, Casa 45, Panamá',
    fecha_ingreso: '2024-02-01',
    licencia: 'AAC-CFI-08812',
    vencimiento_medico: '2027-10-31',
    vencimiento_licencia: '2027-11-30',
    numero_medico: 'MED-CL1-08812-AAC',
    foto_perfil: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80',
    activo: true,
    auth_provider: 'local',
    estado_autorizacion: 'aprobado',
    autorizado_por: 'Jefatura de Instrucción',
    fecha_autorizacion: '2026-01-01T00:00:00.000Z',
    creado_en: '2026-01-01T00:00:00.000Z'
  },
  {
    id: 'usr_inst_fernando',
    nombre: 'Cap. Fernando Arboleda',
    rol: 'instructor',
    telefono: '+507 6822-4455',
    correo: 'fernando.arboleda@skyops.com',
    password: 'SkyOpsFernando26.',
    documento_identidad: '8-650-1120',
    direccion_residencial: 'Condado del Rey, PH King\'s Park, Panamá',
    fecha_ingreso: '2024-02-15',
    licencia: 'AAC-CFI-07490',
    vencimiento_medico: '2027-08-31',
    vencimiento_licencia: '2027-09-30',
    numero_medico: 'MED-CL1-07490-AAC',
    foto_perfil: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80',
    activo: true,
    auth_provider: 'local',
    estado_autorizacion: 'aprobado',
    autorizado_por: 'Jefatura de Instrucción',
    fecha_autorizacion: '2026-01-01T00:00:00.000Z',
    creado_en: '2026-01-01T00:00:00.000Z'
  },
  {
    id: 'usr_inst_roberto',
    nombre: 'Cap. Roberto Morales',
    rol: 'instructor',
    telefono: '+507 6933-5566',
    correo: 'roberto.morales@skyops.com',
    password: 'SkyOpsRoberto26.',
    documento_identidad: '4-710-1890',
    direccion_residencial: 'El Cangrejo, Calle Alberto Navarro, Panamá',
    fecha_ingreso: '2024-03-01',
    licencia: 'AAC-CFI-06921',
    vencimiento_medico: '2027-06-30',
    vencimiento_licencia: '2027-07-31',
    numero_medico: 'MED-CL1-06921-AAC',
    foto_perfil: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&auto=format&fit=crop&q=80',
    activo: true,
    auth_provider: 'local',
    estado_autorizacion: 'aprobado',
    autorizado_por: 'Jefatura de Instrucción',
    fecha_autorizacion: '2026-01-01T00:00:00.000Z',
    creado_en: '2026-01-01T00:00:00.000Z'
  },
  // ESTUDIANTES OFICIALES
  {
    id: 'usr_est_daniel',
    nombre: 'Daniel Alvarado - Alumno Piloto CPL-A',
    rol: 'estudiante',
    telefono: '+507 6412-8899',
    correo: 'alumno@skyops.com',
    password: 'Alumno2026.',
    documento_identidad: '8-920-1140',
    direccion_residencial: 'San Francisco, Calle 73, PH Oasis, Panamá',
    fecha_ingreso: '2025-01-15',
    curso_actual: 'Piloto Comercial de Avión (CPL-A)',
    licencia: 'AAC-SPL-11420',
    vencimiento_medico: '2027-05-31',
    vencimiento_licencia: '2027-06-30',
    numero_medico: 'MED-CL2-11420-AAC',
    foto_perfil: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=150&auto=format&fit=crop&q=80',
    activo: true,
    auth_provider: 'local',
    estado_autorizacion: 'aprobado',
    autorizado_por: 'Dirección de Escuela',
    fecha_autorizacion: '2026-01-01T00:00:00.000Z',
    creado_en: '2026-01-01T00:00:00.000Z'
  },
  {
    id: 'usr_est_esteban',
    nombre: 'Esteban Chen',
    rol: 'estudiante',
    telefono: '+507 6523-9900',
    correo: 'esteban.chen@skyops.com',
    password: 'SkyOpsEsteban26.',
    documento_identidad: '8-880-2210',
    direccion_residencial: 'El Dorado, Ave. Miguel Brostella, Panamá',
    fecha_ingreso: '2025-02-01',
    curso_actual: 'Piloto Privado de Avión (PPL-A)',
    licencia: 'AAC-SPL-11530',
    vencimiento_medico: '2027-04-30',
    vencimiento_licencia: '2027-05-31',
    numero_medico: 'MED-CL2-11530-AAC',
    foto_perfil: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=150&auto=format&fit=crop&q=80',
    activo: true,
    auth_provider: 'local',
    estado_autorizacion: 'aprobado',
    autorizado_por: 'Dirección de Escuela',
    fecha_autorizacion: '2026-01-01T00:00:00.000Z',
    creado_en: '2026-01-01T00:00:00.000Z'
  },
  {
    id: 'usr_est_lucia',
    nombre: 'Lucía Méndez',
    rol: 'estudiante',
    telefono: '+507 6634-1122',
    correo: 'lucia.mendez@skyops.com',
    password: 'SkyOpsLucia26.',
    documento_identidad: '8-950-3340',
    direccion_residencial: 'Costa del Este, PH Park Gate, Panamá',
    fecha_ingreso: '2025-03-10',
    curso_actual: 'Piloto Privado de Avión (PPL-A)',
    licencia: 'AAC-SPL-11680',
    vencimiento_medico: '2027-09-30',
    vencimiento_licencia: '2027-10-31',
    numero_medico: 'MED-CL2-11680-AAC',
    foto_perfil: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
    activo: true,
    auth_provider: 'local',
    estado_autorizacion: 'aprobado',
    autorizado_por: 'Dirección de Escuela',
    fecha_autorizacion: '2026-01-01T00:00:00.000Z',
    creado_en: '2026-01-01T00:00:00.000Z'
  },
  {
    id: 'usr_est_gabriel',
    nombre: 'Gabriel De Gracia',
    rol: 'estudiante',
    telefono: '+507 6745-2233',
    correo: 'gabriel.degracia@skyops.com',
    password: 'SkyOpsGabriel26.',
    documento_identidad: '8-910-4450',
    direccion_residencial: 'Albrook, Calle Los Sauces, Casa 12, Panamá',
    fecha_ingreso: '2025-01-20',
    curso_actual: 'Habilitación Multimotor (ME-A)',
    licencia: 'AAC-CPL-10950',
    vencimiento_medico: '2027-03-31',
    vencimiento_licencia: '2027-04-30',
    numero_medico: 'MED-CL1-10950-AAC',
    foto_perfil: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=150&auto=format&fit=crop&q=80',
    activo: true,
    auth_provider: 'local',
    estado_autorizacion: 'aprobado',
    autorizado_por: 'Dirección de Escuela',
    fecha_autorizacion: '2026-01-01T00:00:00.000Z',
    creado_en: '2026-01-01T00:00:00.000Z'
  }
];

/**
 * Sincroniza el usuario autenticado con Google en Firebase Auth dentro de Cloud Firestore.
 * REGLA DE NEGOCIO: El ingreso mediante cuentas de Google debe ser expresamente autorizado
 * por uno de los Administradores Principales.
 * Solo los administradores principales conocidos son autorizados automáticamente.
 * Las nuevas cuentas ingresan en estado 'pendiente_aprobacion' hasta que un Administrador Principal
 * les asigne su rol y active el acceso.
 */
export async function syncGoogleUserWithFirestore(
  firebaseUser: FirebaseUser,
  requestedRole?: UserRole
): Promise<User> {
  const userEmail = (firebaseUser.email || '').toLowerCase().trim();
  const isMasterAdmin = PRINCIPAL_ADMIN_EMAILS.includes(userEmail);
  const userRef = doc(db, 'users', firebaseUser.uid);

  let snapshot: any = null;
  let isFirestoreOffline = false;
  try {
    snapshot = await getDoc(userRef);
  } catch (err: any) {
    console.warn('[Firestore] getDoc offline/error fallback:', err?.message || err);
    isFirestoreOffline = true;
  }

  if (snapshot && snapshot.exists && snapshot.exists()) {
    const existing = snapshot.data() as User;
    const updates: Partial<User> = {};
    if (firebaseUser.photoURL && firebaseUser.photoURL !== existing.foto_perfil) {
      updates.foto_perfil = firebaseUser.photoURL;
    }
    if (firebaseUser.displayName && firebaseUser.displayName !== existing.nombre) {
      updates.nombre = firebaseUser.displayName;
    }
    // Si es uno de los administradores principales, garantizar rol de admin y estado aprobado
    if (isMasterAdmin && (existing.estado_autorizacion !== 'aprobado' || existing.rol !== 'admin')) {
      updates.estado_autorizacion = 'aprobado';
      updates.rol = 'admin';
      updates.activo = true;
      updates.autorizado_por = 'SuperAdmin / Sistema';
      updates.fecha_autorizacion = new Date().toISOString();
    }
    if (Object.keys(updates).length > 0) {
      try {
        await updateDoc(userRef, updates);
      } catch (updErr) {
        console.warn('[Firestore] No se pudo actualizar en Firestore (offline):', updErr);
      }
      return { ...existing, ...updates };
    }
    return existing;
  }

  // Si Firestore está online, buscar por correo
  if (!isFirestoreOffline) {
    try {
      const usersColl = collection(db, 'users');
      const q = query(usersColl, where('correo', '==', firebaseUser.email || ''));
      const querySnap = await getDocs(q);

      if (!querySnap.empty) {
        const matchedDoc = querySnap.docs[0];
        const existing = matchedDoc.data() as User;
        const mergedUser: User = {
          ...existing,
          id: firebaseUser.uid,
          auth_provider: 'google',
          foto_perfil: firebaseUser.photoURL || existing.foto_perfil,
          nombre: firebaseUser.displayName || existing.nombre,
          estado_autorizacion: isMasterAdmin ? 'aprobado' : (existing.estado_autorizacion || 'aprobado'),
          activo: isMasterAdmin ? true : (existing.activo ?? true)
        };
        try {
          await setDoc(userRef, mergedUser, { merge: true });
        } catch (setErr) {
          console.warn('[Firestore] No se pudo guardar mergedUser en Firestore (offline):', setErr);
        }
        return mergedUser;
      }
    } catch (queryErr) {
      console.warn('[Firestore] Error al consultar usuario por correo:', queryErr);
    }
  }

  // Si no se encontró en Firestore o Firestore está offline, buscar en el catálogo inicial
  const existingInitial = INITIAL_FIRESTORE_USERS.find(
    u => u.correo.toLowerCase() === userEmail || u.id === firebaseUser.uid
  );
  if (existingInitial) {
    const mergedUser: User = {
      ...existingInitial,
      id: firebaseUser.uid,
      auth_provider: 'google',
      foto_perfil: firebaseUser.photoURL || existingInitial.foto_perfil,
      nombre: firebaseUser.displayName || existingInitial.nombre,
      estado_autorizacion: isMasterAdmin ? 'aprobado' : (existingInitial.estado_autorizacion || 'aprobado'),
      activo: isMasterAdmin ? true : (existingInitial.activo ?? true)
    };
    try {
      await setDoc(userRef, mergedUser, { merge: true });
    } catch (ignore) {}
    return mergedUser;
  }

  // NUEVA CUENTA DE GOOGLE
  // 1. Caso Administrador Principal:
  if (isMasterAdmin) {
    const newAdminUser: User = {
      id: firebaseUser.uid,
      nombre: firebaseUser.displayName || 'Administrador Principal SkyOps',
      rol: 'admin',
      correo: firebaseUser.email || '',
      telefono: firebaseUser.phoneNumber || '+507 6890-1122',
      foto_perfil: firebaseUser.photoURL || 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
      licencia: 'ATPL-09412',
      vencimiento_medico: '2028-12-31',
      vencimiento_licencia: '2028-12-31',
      numero_medico: 'MED-CL1-ADMIN',
      activo: true,
      auth_provider: 'google',
      estado_autorizacion: 'aprobado',
      autorizado_por: 'SuperAdmin / Sistema',
      fecha_autorizacion: new Date().toISOString(),
      creado_en: new Date().toISOString()
    };
    try {
      await setDoc(userRef, newAdminUser, { merge: true });
      await logAuditToFirestore({
        id: `audit_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        timestamp: new Date().toISOString(),
        usuario_id: firebaseUser.uid,
        usuario_nombre: newAdminUser.nombre,
        usuario_rol: 'admin',
        modulo: 'SEGURIDAD_ACCESO',
        accion: 'LOGIN_ADMIN_PRINCIPAL',
        descripcion: `Ingreso de Administrador Principal ${newAdminUser.correo} verificado y autorizado automáticamente.`,
        severidad: 'baja'
      });
    } catch (ignore) {}

    return newAdminUser;
  }

  // 2. Caso Usuario Regular de Google:
  // Queda en estado PENDIENTE DE APROBACIÓN POR UN ADMINISTRADOR PRINCIPAL
  const pendingUser: User = {
    id: firebaseUser.uid,
    nombre: firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'Usuario Google',
    rol: requestedRole || 'estudiante', // Rol provisional hasta asignación por administrador
    correo: firebaseUser.email || '',
    telefono: firebaseUser.phoneNumber || '+507 6000-0000',
    foto_perfil: firebaseUser.photoURL || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
    activo: false, // Inactivo hasta aprobación
    auth_provider: 'google',
    estado_autorizacion: 'pendiente_aprobacion',
    fecha_solicitud: new Date().toISOString(),
    creado_en: new Date().toISOString()
  };

  try {
    await setDoc(userRef, pendingUser, { merge: true });
    await logAuditToFirestore({
      id: `audit_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      timestamp: new Date().toISOString(),
      usuario_id: firebaseUser.uid,
      usuario_nombre: pendingUser.nombre,
      usuario_rol: pendingUser.rol,
      modulo: 'SEGURIDAD_ACCESO',
      accion: 'SOLICITUD_ACCESO_GOOGLE',
      descripcion: `Nueva solicitud de acceso con cuenta Google (${pendingUser.correo}) registrada. Requiere autorización expresa por uno de los Administradores Principales.`,
      severidad: 'regulatoria'
    });
  } catch (ignore) {}

  return pendingUser;
}

/**
 * Autoriza el acceso de una cuenta Google asignándole un rol oficial aeronáutico.
 * Debe ser ejecutado por un Administrador Principal.
 */
export async function approveGoogleAccessInFirestore(
  userId: string,
  assignedRole: UserRole,
  adminName: string,
  extraData?: {
    curso_actual?: string;
    licencia?: string;
    numero_medico?: string;
    vencimiento_licencia?: string;
    vencimiento_medico?: string;
  }
): Promise<void> {
  const userRef = doc(db, 'users', userId);
  const now = new Date().toISOString();
  let existing: User | undefined = undefined;

  try {
    const snap = await getDoc(userRef);
    if (snap.exists()) {
      existing = snap.data() as User;
    }
  } catch (err) {
    console.warn('[Firestore] getDoc error in approveGoogleAccess:', err);
  }

  const updates: Partial<User> = {
    estado_autorizacion: 'aprobado',
    activo: true,
    rol: assignedRole,
    autorizado_por: adminName,
    fecha_autorizacion: now,
    ...(extraData?.curso_actual ? { curso_actual: extraData.curso_actual } : {}),
    ...(extraData?.licencia ? { licencia: extraData.licencia } : {}),
    ...(extraData?.numero_medico ? { numero_medico: extraData.numero_medico } : {}),
    ...(extraData?.vencimiento_licencia ? { vencimiento_licencia: extraData.vencimiento_licencia } : {}),
    ...(extraData?.vencimiento_medico ? { vencimiento_medico: extraData.vencimiento_medico } : {})
  };

  try {
    await firestoreWithTimeout(setDoc(userRef, updates, { merge: true }), 2000);
  } catch (err) {
    console.warn('[Firestore] setDoc error in approveGoogleAccess:', err);
  }

  await logAuditToFirestore({
    id: `audit_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    timestamp: now,
    usuario_id: userId,
    usuario_nombre: existing?.nombre || userId,
    usuario_rol: assignedRole,
    modulo: 'SEGURIDAD_ACCESO',
    accion: 'AUTORIZAR_ACCESO_GOOGLE',
    descripcion: `Acceso con Google autorizado para ${existing?.correo || userId} con rol [${assignedRole}] por el Administrador Principal ${adminName}.`,
    severidad: 'regulatoria'
  });
}

/**
 * Rechaza la solicitud de acceso de una cuenta Google.
 */
export async function rejectGoogleAccessInFirestore(
  userId: string,
  motivo: string,
  adminName: string
): Promise<void> {
  const userRef = doc(db, 'users', userId);
  const now = new Date().toISOString();
  let existing: User | undefined = undefined;

  try {
    const snap = await getDoc(userRef);
    if (snap.exists()) {
      existing = snap.data() as User;
    }
  } catch (err) {
    console.warn('[Firestore] getDoc error in rejectGoogleAccess:', err);
  }

  const updates: Partial<User> = {
    estado_autorizacion: 'rechazado',
    activo: false,
    motivo_rechazo_acceso: motivo || 'Acceso no autorizado por la administración',
    autorizado_por: adminName,
    fecha_autorizacion: now
  };

  try {
    await firestoreWithTimeout(setDoc(userRef, updates, { merge: true }), 2000);
  } catch (err) {
    console.warn('[Firestore] setDoc error in rejectGoogleAccess:', err);
  }

  await logAuditToFirestore({
    id: `audit_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    timestamp: now,
    usuario_id: userId,
    usuario_nombre: existing?.nombre || userId,
    usuario_rol: existing?.rol || 'estudiante',
    modulo: 'SEGURIDAD_ACCESO',
    accion: 'RECHAZAR_ACCESO_GOOGLE',
    descripcion: `Solicitud de acceso con Google rechazada para ${existing?.correo || userId} por el Administrador Principal ${adminName}. Motivo: ${motivo}`,
    severidad: 'regulatoria'
  });
}

/**
 * Revoca el acceso de una cuenta Google anteriormente autorizada.
 */
export async function revokeGoogleAccessInFirestore(
  userId: string,
  motivo: string,
  adminName: string
): Promise<void> {
  const userRef = doc(db, 'users', userId);
  const now = new Date().toISOString();
  let existing: User | undefined = undefined;

  try {
    const snap = await getDoc(userRef);
    if (snap.exists()) {
      existing = snap.data() as User;
    }
  } catch (err) {
    console.warn('[Firestore] getDoc error in revokeGoogleAccess:', err);
  }

  const updates: Partial<User> = {
    estado_autorizacion: 'rechazado',
    activo: false,
    motivo_rechazo_acceso: motivo || 'Acceso revocado por la administración',
    autorizado_por: adminName,
    fecha_autorizacion: now
  };

  try {
    await firestoreWithTimeout(setDoc(userRef, updates, { merge: true }), 2000);
  } catch (err) {
    console.warn('[Firestore] setDoc error in revokeGoogleAccess:', err);
  }

  await logAuditToFirestore({
    id: `audit_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    timestamp: now,
    usuario_id: userId,
    usuario_nombre: existing?.nombre || userId,
    usuario_rol: existing?.rol || 'estudiante',
    modulo: 'SEGURIDAD_ACCESO',
    accion: 'REVOCAR_ACCESO_GOOGLE',
    descripcion: `Acceso revocado para la cuenta ${existing?.correo || userId} por el Administrador Principal ${adminName}.`,
    severidad: 'alta'
  });
}

/**
 * Obtiene todos los usuarios desde Cloud Firestore.
 * Si la colección está vacía, la pre-siembra automáticamente.
 */
export async function getUsersFromFirestore(): Promise<User[]> {
  try {
    const usersColl = collection(db, 'users');
    const snapshot = await firestoreWithTimeout(getDocs(usersColl), 2500);

    if (!snapshot || snapshot.empty) {
      return INITIAL_FIRESTORE_USERS;
    }

    const users: User[] = [];
    snapshot.forEach(docSnap => {
      const u = docSnap.data() as User;
      if (u && u.id) {
        users.push(u);
      }
    });

    // Asegurar que la cuenta oficial de Jefatura siempre esté presente
    if (!users.some(u => u.correo.toLowerCase() === 'antpilot26@skyops.com')) {
      users.unshift(INITIAL_FIRESTORE_USERS[0]);
    }

    return users.length > 0 ? users : INITIAL_FIRESTORE_USERS;
  } catch (error) {
    console.warn('[Firestore] getUsersFromFirestore fallback to initial:', error);
    return INITIAL_FIRESTORE_USERS;
  }
}

/**
 * Guarda o actualiza un usuario en Cloud Firestore
 */
export async function saveUserToFirestore(user: User): Promise<User> {
  try {
    const ref = doc(db, 'users', user.id);
    await firestoreWithTimeout(setDoc(ref, user, { merge: true }), 2000);
  } catch (err) {
    console.warn('[Firestore] saveUserToFirestore error:', err);
  }
  return user;
}

/**
 * Actualiza campos parciales de un usuario en Cloud Firestore
 */
export async function updateUserInFirestore(userId: string, updates: Partial<User>): Promise<void> {
  try {
    const ref = doc(db, 'users', userId);
    await firestoreWithTimeout(setDoc(ref, updates, { merge: true }), 2000);
  } catch (err) {
    console.warn('[Firestore] updateUserInFirestore error:', err);
  }
}

/**
 * Elimina un usuario de Cloud Firestore
 */
export async function deleteUserFromFirestore(userId: string): Promise<void> {
  try {
    const ref = doc(db, 'users', userId);
    await firestoreWithTimeout(deleteDoc(ref), 2000);
  } catch (err) {
    console.warn('[Firestore] deleteUserFromFirestore error:', err);
  }
}

/**
 * Suscripción en tiempo real a cambios en la colección de usuarios en Firestore
 */
export function subscribeToUsers(callback: (users: User[]) => void) {
  const usersColl = collection(db, 'users');
  return onSnapshot(usersColl, (snapshot) => {
    const users: User[] = [];
    snapshot.forEach(docSnap => {
      users.push(docSnap.data() as User);
    });
    callback(users);
  }, (err) => {
    console.error('Error en listener de usuarios Firestore:', err);
  });
}

/**
 * Obtiene transacciones desde Cloud Firestore
 */
export async function getTransactionsFromFirestore(studentId?: string): Promise<Transaction[]> {
  try {
    const txColl = collection(db, 'transactions');
    let q = query(txColl, orderBy('fecha', 'desc'));
    if (studentId) {
      q = query(txColl, where('estudiante_id', '==', studentId), orderBy('fecha', 'desc'));
    }
    const snapshot = await firestoreWithTimeout(getDocs(q), 2500);
    if (!snapshot) return [];
    const txs: Transaction[] = [];
    snapshot.forEach(docSnap => {
      txs.push(docSnap.data() as Transaction);
    });
    return txs;
  } catch (error) {
    console.error('Error al obtener transacciones de Firestore:', error);
    return [];
  }
}

/**
 * Guarda una nueva transacción en Cloud Firestore
 */
export async function saveTransactionToFirestore(tx: Transaction): Promise<Transaction> {
  try {
    const ref = doc(db, 'transactions', tx.id);
    await firestoreWithTimeout(setDoc(ref, tx, { merge: true }), 2000);
  } catch (err) {
    console.warn('[Firestore] saveTransactionToFirestore error:', err);
  }
  return tx;
}

/**
 * Actualiza el estado de aprobación de una transacción en Cloud Firestore
 */
export async function updateTransactionStatusInFirestore(
  txId: string,
  estado: Transaction['estado_aprobacion'],
  verificado_por?: string,
  notas_bancarias?: string,
  referencia_confirmada?: string
): Promise<void> {
  try {
    const ref = doc(db, 'transactions', txId);
    await firestoreWithTimeout(setDoc(ref, {
      estado_aprobacion: estado,
      verificado_por: verificado_por || 'Sistema',
      notas_bancarias: notas_bancarias || '',
      referencia_bancaria_confirmada: referencia_confirmada || ''
    }, { merge: true }), 2000);
  } catch (err) {
    console.warn('[Firestore] updateTransactionStatusInFirestore error:', err);
  }
}

/**
 * Registra un evento inmutable en la bitácora de auditoría forense de Cloud Firestore
 */
export async function logAuditToFirestore(entry: {
  id: string;
  timestamp: string;
  usuario_id: string;
  usuario_nombre: string;
  usuario_rol: string;
  modulo: string;
  accion: string;
  descripcion: string;
  severidad: string;
  entidad_tipo?: string;
  estudiante_afectado_id?: string;
  instructor_afectado_id?: string;
}): Promise<void> {
  try {
    const ref = doc(db, 'audit_logs', entry.id);
    await firestoreWithTimeout(setDoc(ref, entry), 2000);
  } catch (error) {
    console.error('Error al registrar auditoría en Firestore:', error);
  }
}

/**
 * Obtiene logs de auditoría desde Cloud Firestore
 */
export async function getAuditLogsFromFirestore(): Promise<any[]> {
  try {
    const logsColl = collection(db, 'audit_logs');
    const q = query(logsColl, orderBy('timestamp', 'desc'));
    const snapshot = await firestoreWithTimeout(getDocs(q), 2500);
    if (!snapshot) return [];
    const logs: any[] = [];
    snapshot.forEach(docSnap => {
      logs.push(docSnap.data());
    });
    return logs;
  } catch (error) {
    console.error('Error al obtener audit logs de Firestore:', error);
    return [];
  }
}

/**
 * Guarda las preferencias de tema y personalización de color del usuario en Firestore.
 */
export async function saveUserThemePreferencesInFirestore(
  userId: string,
  preferencias: any
): Promise<void> {
  try {
    const userRef = doc(db, 'users', userId);
    await firestoreWithTimeout(updateDoc(userRef, { preferencias_tema: preferencias }), 2000);
  } catch (error) {
    console.warn('No se pudo guardar la preferencia de tema en Firestore:', error);
  }
}

/**
 * Guarda o actualiza un itinerario en Cloud Firestore incluyendo metadatos de Google Calendar
 */
export async function saveItineraryToFirestore(itinerary: Itinerary): Promise<void> {
  try {
    const ref = doc(db, 'itineraries', itinerary.id);
    await firestoreWithTimeout(setDoc(ref, itinerary, { merge: true }), 2000);
  } catch (error) {
    console.error('Error al persistir itinerario en Firestore:', error);
  }
}

/**
 * Actualiza los datos de Google Calendar en el itinerario en Firestore
 */
export async function updateItineraryGoogleCalendarInfoInFirestore(
  itineraryId: string,
  calendarEventId: string,
  htmlLink?: string
): Promise<void> {
  try {
    const ref = doc(db, 'itineraries', itineraryId);
    await firestoreWithTimeout(updateDoc(ref, {
      google_calendar_event_id: calendarEventId,
      google_calendar_synced_at: new Date().toISOString(),
      google_calendar_html_link: htmlLink || ''
    }), 2000);
  } catch (error) {
    console.warn('Error al actualizar info de Google Calendar en Firestore:', error);
  }
}

/**
 * Persistencia y sincronización de manuales POH en Cloud Firestore
 */
export async function savePOHDocumentToFirestore(poh: POHDocument): Promise<void> {
  try {
    const ref = doc(db, 'poh_documents', poh.id);
    await firestoreWithTimeout(setDoc(ref, poh, { merge: true }), 2500);
  } catch (err) {
    console.warn('[Firestore] Error guardando POH:', err);
  }
}

export async function getPOHDocumentsFromFirestore(): Promise<POHDocument[]> {
  try {
    const col = collection(db, 'poh_documents');
    const snap = await firestoreWithTimeout(getDocs(col), 2500);
    if (!snap || snap.empty) return [];
    const list: POHDocument[] = [];
    snap.forEach(d => list.push(d.data() as POHDocument));
    return list;
  } catch (err) {
    console.warn('[Firestore] Error obteniendo POHs:', err);
    return [];
  }
}

export async function deletePOHDocumentFromFirestore(id: string): Promise<void> {
  try {
    const ref = doc(db, 'poh_documents', id);
    await firestoreWithTimeout(deleteDoc(ref), 2500);
  } catch (err) {
    console.warn('[Firestore] Error eliminando POH:', err);
  }
}

/**
 * Persistencia y sincronización de FlightProgress en Cloud Firestore
 */
export async function saveFlightProgressToFirestore(fp: FlightProgress): Promise<void> {
  try {
    const ref = doc(db, 'flight_progress', fp.id);
    await firestoreWithTimeout(setDoc(ref, fp, { merge: true }), 2500);
  } catch (err) {
    console.warn('[Firestore] Error guardando flight_progress:', err);
  }
}

export async function getFlightProgressFromFirestore(studentId?: string): Promise<FlightProgress[]> {
  try {
    const col = collection(db, 'flight_progress');
    let q = query(col, orderBy('fecha', 'desc'));
    if (studentId) {
      q = query(col, where('estudiante_id', '==', studentId), orderBy('fecha', 'desc'));
    }
    const snap = await firestoreWithTimeout(getDocs(q), 2500);
    if (!snap || snap.empty) return [];
    const list: FlightProgress[] = [];
    snap.forEach(d => list.push(d.data() as FlightProgress));
    return list;
  } catch (err) {
    console.warn('[Firestore] Error obteniendo flight_progress:', err);
    return [];
  }
}



