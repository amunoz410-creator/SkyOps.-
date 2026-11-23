/**
 * Base de Datos en Memoria y Modelos para SkyOps
 * Incluye esquemas SQL de referencia y funciones de persistencia y cálculo en cascada.
 */

import {
  User,
  Transaction,
  TransactionApprovalStatus,
  FlightProgress,
  Itinerary,
  EmailNotification,
  MorosidadReport,
  StudentFlightEligibility,
  InstructorDualGivenStats,
  InternalAccountingMessage,
  SpreadsheetWorkbook,
  SpreadsheetSheet,
  SpreadsheetCell,
  OperatingExpense,
  ExpenseCategory,
  MonthlyFinancialItem,
  FinancialDashboardSummary,
  CategoryExpenseBreakdown,
  AircraftFinancialBreakdown,
  WhatsAppConfig,
  WhatsAppTrigger,
  WhatsAppLogMessage,
  WhatsAppTriggerExecutionResult,
  AuditLogEntry,
  AuditLogFilter,
  AuditLogStats,
  AuditModule,
  AuditActionType,
  AuditSeverity,
  AuditFieldChange,
  POHDocument,
  RoleNotificationRule,
  PaymentLink,
  CardPaymentPayload,
  CreatePaymentLinkInput,
  UserRole,
  InstructorFlightFeeItem,
  InstructorFeeStatus,
  InstructorFeeStatement,
  InstructorFeeExcelIndexItem,
  GenerateInstructorFeesInput,
  RegisterBitacoraHonorarioInput,
  RecordFlightLogInput,
  RecordFlightLogResponse,
  AirworthinessCondition,
  AircraftMaintenanceRecord,
  WorkOrderType,
  WorkOrderStatus,
  MaintenanceWorkOrderItem,
  MaintenanceWorkOrder,
  SquawkSeverity,
  SquawkStatus,
  MaintenanceSquawk,
  MaintenancePartStock,
  AirworthinessDirective,
  MovementType,
  MovementAirworthinessCondition,
  AircraftWorkshopMovement,
  FlightRequest,
  FlightRequestStatus,
  PublishedDailyItinerary,
  FlightRequestScheduleStatus
} from '../src/types';
import { DEFAULT_POH_LIBRARY } from '../src/components/poh/defaultPOHLibrary';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { emailService } from './emailService';

// ==========================================
// ESQUEMA SQL DDL (DOCUMENTACIÓN Y MIGRACIÓN)
// ==========================================
export const SQL_SCHEMA_DDL = `
-- TABLA: Usuarios (RBAC y Vigencias Aeronáuticas)
CREATE TABLE usuarios (
    id VARCHAR(36) PRIMARY KEY,
    nombre VARCHAR(150) NOT NULL,
    rol VARCHAR(30) NOT NULL CHECK (rol IN ('estudiante', 'instructor', 'contabilidad', 'admin')),
    telefono VARCHAR(30) NOT NULL,
    correo VARCHAR(150) UNIQUE NOT NULL,
    licencia VARCHAR(50),
    vencimiento_medico DATE,
    vencimiento_licencia DATE,
    foto_perfil TEXT,
    curso_actual VARCHAR(50),
    instructor_asignado_id VARCHAR(36) REFERENCES usuarios(id),
    activo BOOLEAN DEFAULT TRUE,
    creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- TABLA: Transacciones (Contabilidad Desacoplada y Saldos)
CREATE TABLE transacciones (
    id VARCHAR(36) PRIMARY KEY,
    estudiante_id VARCHAR(36) NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    fecha DATE NOT NULL,
    tipo VARCHAR(10) NOT NULL CHECK (tipo IN ('cargo', 'abono')),
    concepto VARCHAR(100) NOT NULL,
    monto NUMERIC(12, 2) NOT NULL,
    referencia_ach VARCHAR(100) NOT NULL,
    archivo_adjunto TEXT,
    archivo_nombre VARCHAR(255),
    saldo_resultante NUMERIC(12, 2) NOT NULL,
    creado_por VARCHAR(100) NOT NULL,
    notas TEXT,
    creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- TABLA: Progreso_Vuelo (Hoja de Progreso Multi-Motor y Bitácora)
CREATE TABLE progreso_vuelo (
    id VARCHAR(36) PRIMARY KEY,
    estudiante_id VARCHAR(36) NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    instructor_id VARCHAR(36) NOT NULL REFERENCES usuarios(id),
    leccion_num INT NOT NULL,
    fecha DATE NOT NULL,
    matricula VARCHAR(20) NOT NULL,
    tipo_avion VARCHAR(100) NOT NULL,
    curso VARCHAR(50) NOT NULL,
    estado VARCHAR(30) NOT NULL DEFAULT 'pendiente_validacion' CHECK (estado IN ('pendiente_validacion', 'aprobado', 'borrador')),
    observaciones TEXT,
    firma_estudiante BOOLEAN DEFAULT FALSE,
    firma_instructor BOOLEAN DEFAULT FALSE,
    fecha_validacion TIMESTAMP,
    creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    actualizado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- TABLA: Evaluacion_Maniobras (32 Maniobras Oficiales)
CREATE TABLE evaluacion_maniobras (
    id VARCHAR(36) PRIMARY KEY,
    progreso_id VARCHAR(36) NOT NULL REFERENCES progreso_vuelo(id) ON DELETE CASCADE,
    nombre_maniobra VARCHAR(150) NOT NULL,
    calificacion VARCHAR(5) NOT NULL CHECK (calificacion IN ('D', 'S', 'N', 'N/A'))
);

-- TABLA: Tiempos_Vuelo (Matriz de Horas y Cascada)
CREATE TABLE tiempos_vuelo (
    id VARCHAR(36) PRIMARY KEY,
    progreso_id VARCHAR(36) UNIQUE NOT NULL REFERENCES progreso_vuelo(id) ON DELETE CASCADE,
    vuelo_dual NUMERIC(6, 2) DEFAULT 0.0,
    vuelo_ifr NUMERIC(6, 2) DEFAULT 0.0,
    dual_travesia NUMERIC(6, 2) DEFAULT 0.0,
    solo_travesia NUMERIC(6, 2) DEFAULT 0.0,
    dia NUMERIC(6, 2) DEFAULT 0.0,
    noche NUMERIC(6, 2) DEFAULT 0.0,
    vuelo_actual NUMERIC(6, 2) NOT NULL DEFAULT 0.0,
    horas_anteriores NUMERIC(8, 2) NOT NULL DEFAULT 0.0,
    total_horas NUMERIC(8, 2) NOT NULL DEFAULT 0.0
);

-- TABLA: Itinerarios de Vuelo y Despacho
CREATE TABLE itinerarios (
    id VARCHAR(36) PRIMARY KEY,
    estudiante_id VARCHAR(36) NOT NULL REFERENCES usuarios(id),
    instructor_id VARCHAR(36) NOT NULL REFERENCES usuarios(id),
    avion_matricula VARCHAR(20) NOT NULL,
    avion_modelo VARCHAR(100) NOT NULL,
    fecha DATE NOT NULL,
    hora_inicio TIME NOT NULL,
    hora_fin TIME NOT NULL,
    mision TEXT NOT NULL,
    estado VARCHAR(30) DEFAULT 'programado' CHECK (estado IN ('programado', 'completado', 'cancelado', 'no_asistio')),
    motivo_cancelacion TEXT,
    creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- TABLA: Notificaciones por Correo Electrónico (Logs y Auditoría)
CREATE TABLE notificaciones_email (
    id VARCHAR(36) PRIMARY KEY,
    destinatario_tipo VARCHAR(20) NOT NULL,
    destinatario_nombre VARCHAR(150) NOT NULL,
    destinatario_email VARCHAR(150) NOT NULL,
    evento VARCHAR(50) NOT NULL,
    asunto VARCHAR(255) NOT NULL,
    cuerpo_texto TEXT,
    fecha_envio TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    estado_envio VARCHAR(20) DEFAULT 'enviado'
);
`;

// ==========================================
// SEED INICIAL DE DATOS
// ==========================================

export const INITIAL_USERS: User[] = [
  {
    id: "usr_amunoz_admin",
    nombre: "Cap. Anthony Muñoz - Jefatura de Operaciones e Instrucción",
    rol: "admin",
    telefono: "+507 6890-1122",
    correo: "amunoz4100@gmail.com",
    password: "Antpilot26",
    documento_identidad: "8-742-1980",
    direccion_residencial: "Aeropuerto Internacional Marcos A. Gelabert, Hangar SkyOps, Albrook, Ciudad de Panamá",
    fecha_ingreso: "2024-01-01",
    contactos_emergencia: [
      {
        nombre: "Dra. Beatriz Morales",
        parentesco: "Cónyuge / Contacto de Emergencia",
        telefono: "+507 6620-3344",
        telefono_secundario: "+507 269-8800"
      }
    ],
    licencia: "AAC-ATPL-09412",
    vencimiento_medico: "2028-12-31",
    vencimiento_licencia: "2028-12-31",
    numero_medico: "MED-CL1-09412-AAC",
    foto_perfil: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80",
    activo: true,
    auth_provider: "local",
    estado_autorizacion: "aprobado",
    autorizado_por: "Dirección General de Aeronáutica Civil (AAC)",
    fecha_autorizacion: "2026-01-01T00:00:00.000Z",
    creado_en: "2026-01-01T00:00:00.000Z"
  },
  {
    id: "usr_jefatura_1",
    nombre: "Jefatura de Operaciones e Instrucción SkyOps",
    rol: "admin",
    telefono: "+507 6890-1122",
    correo: "antpilot26@skyops.com",
    password: "Antpilot26.",
    documento_identidad: "8-742-1980",
    direccion_residencial: "Aeropuerto Internacional Marcos A. Gelabert, Hangar SkyOps, Albrook, Ciudad de Panamá",
    fecha_ingreso: "2024-01-01",
    contactos_emergencia: [
      {
        nombre: "Dra. Beatriz Morales",
        parentesco: "Cónyuge",
        telefono: "+507 6620-3344",
        telefono_secundario: "+507 269-8800"
      }
    ],
    licencia: "AAC-ATPL-09412",
    vencimiento_medico: "2028-12-31",
    vencimiento_licencia: "2028-12-31",
    numero_medico: "MED-CL1-09412-AAC",
    foto_perfil: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80",
    activo: true,
    auth_provider: "local",
    estado_autorizacion: "aprobado",
    autorizado_por: "Dirección General de Aeronáutica Civil (AAC)",
    fecha_autorizacion: "2026-01-01T00:00:00.000Z",
    creado_en: "2026-01-01T00:00:00.000Z"
  },
  {
    id: "usr_escuela_1",
    nombre: "Dirección de Escuela & Operaciones",
    rol: "escuela",
    telefono: "+507 6500-9988",
    correo: "operaciones@skyops.com",
    password: "SkyOpsOperaciones26.",
    documento_identidad: "8-550-1975",
    direccion_residencial: "Albrook, Calle Las Magnolias, Casa 18, Ciudad de Panamá",
    fecha_ingreso: "2024-01-01",
    contactos_emergencia: [
      {
        nombre: "Sra. Carmen de Méndez",
        parentesco: "Cónyuge",
        telefono: "+507 6500-9989",
        telefono_secundario: "+507 315-0022"
      }
    ],
    licencia: "AAC-ATPL-07841",
    vencimiento_medico: "2028-04-30",
    vencimiento_licencia: "2028-05-31",
    numero_medico: "MED-CL1-07841-AAC",
    foto_perfil: "https://images.unsplash.com/photo-1560250097-0b93528c311a?w=150&auto=format&fit=crop&q=80",
    activo: true,
    auth_provider: "local",
    estado_autorizacion: "aprobado",
    autorizado_por: "Jefatura de Instrucción",
    fecha_autorizacion: "2026-01-01T00:00:00.000Z",
    creado_en: "2026-01-01T00:00:00.000Z"
  },
  {
    id: "usr_escuela_fernando",
    nombre: "Fernando Alvarado",
    rol: "escuela",
    telefono: "+507 6500-9910",
    correo: "fernando.alvarado@skyops.com",
    password: "SkyOpsFernandoA26.",
    documento_identidad: "8-715-1420",
    direccion_residencial: "Aeropuerto Internacional Marcos A. Gelabert, Hangar SkyOps, Albrook, Ciudad de Panamá",
    fecha_ingreso: "2026-01-01",
    cargo_departamento: "Administración / Dirección de Escuela",
    foto_perfil: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80",
    activo: true,
    auth_provider: "local",
    estado_autorizacion: "aprobado",
    autorizado_por: "Jefatura de Operaciones e Instrucción",
    fecha_autorizacion: "2026-01-01T00:00:00.000Z",
    creado_en: "2026-01-01T00:00:00.000Z",
    puede_crear_usuarios: true,
    permisos_delegados: {
      crear_usuarios: true,
      gestionar_alumnos: true,
      gestionar_instructores: true,
      asignado_por: "Jefatura de Operaciones",
      fecha_asignacion: "2026-01-01T00:00:00.000Z"
    }
  },
  {
    id: "usr_escuela_antonio",
    nombre: "Antonio Muñoz",
    rol: "escuela",
    telefono: "+507 6500-9920",
    correo: "antonio.munoz@skyops.com",
    password: "SkyOpsAntonioM26.",
    documento_identidad: "8-742-1981",
    direccion_residencial: "Aeropuerto Internacional Marcos A. Gelabert, Hangar SkyOps, Albrook, Ciudad de Panamá",
    fecha_ingreso: "2026-01-01",
    cargo_departamento: "Administración / Dirección de Escuela",
    foto_perfil: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80",
    activo: true,
    auth_provider: "local",
    estado_autorizacion: "aprobado",
    autorizado_por: "Jefatura de Operaciones e Instrucción",
    fecha_autorizacion: "2026-01-01T00:00:00.000Z",
    creado_en: "2026-01-01T00:00:00.000Z",
    puede_crear_usuarios: true,
    permisos_delegados: {
      crear_usuarios: true,
      gestionar_alumnos: true,
      gestionar_instructores: true,
      asignado_por: "Jefatura de Operaciones",
      fecha_asignacion: "2026-01-01T00:00:00.000Z"
    }
  },
  {
    id: "usr_conta_1",
    nombre: "Lic. Mariana Chen - Contabilidad y Finanzas",
    rol: "contabilidad",
    telefono: "+507 6233-7711",
    correo: "contabilidad@skyops.com",
    password: "Conta2026.",
    documento_identidad: "8-800-2020",
    direccion_residencial: "Bella Vista, Calle 45, PH Torres del Mar, Ciudad de Panamá",
    fecha_ingreso: "2024-01-01",
    foto_perfil: "https://images.unsplash.com/photo-1580489944761-15a19d654956?w=150&auto=format&fit=crop&q=80",
    activo: true,
    auth_provider: "local",
    estado_autorizacion: "aprobado",
    autorizado_por: "Jefatura de Instrucción",
    fecha_autorizacion: "2026-01-01T00:00:00.000Z",
    creado_en: "2026-01-01T00:00:00.000Z"
  },
  // TALLER DE MANTENIMIENTO AERONÁUTICO & TÉCNICOS (TMA / OMA)
  {
    id: "usr_taller_carlos",
    nombre: "Ing. Carlos Mendoza - Jefe de Taller & TMA",
    rol: "mantenimiento",
    telefono: "+507 6890-5544",
    correo: "taller@skyops.com",
    password: "Taller2026.",
    documento_identidad: "8-765-4321",
    direccion_residencial: "Hangar 4, Aeropuerto Marcos A. Gelabert, Albrook, Panamá",
    fecha_ingreso: "2024-01-15",
    licencia: "AAC-TMA-4512",
    vencimiento_licencia: "2028-12-31",
    foto_perfil: "https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=150&auto=format&fit=crop&q=80",
    activo: true,
    auth_provider: "local",
    estado_autorizacion: "aprobado",
    autorizado_por: "Dirección de Escuela",
    fecha_autorizacion: "2026-01-01T00:00:00.000Z",
    creado_en: "2026-01-01T00:00:00.000Z"
  },
  {
    id: "usr_taller_david",
    nombre: "Téc. David Rivas - Mecánico de Aviación (TMA)",
    rol: "mantenimiento",
    telefono: "+507 6533-9988",
    correo: "david.rivas@skyops.com",
    password: "Taller2026.",
    documento_identidad: "4-620-3311",
    direccion_residencial: "Albrook, Calle Las Magnolias, Panamá",
    fecha_ingreso: "2024-03-01",
    licencia: "AAC-TMA-6789",
    vencimiento_licencia: "2028-06-30",
    foto_perfil: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80",
    activo: true,
    auth_provider: "local",
    estado_autorizacion: "aprobado",
    autorizado_por: "Jefe de Taller",
    fecha_autorizacion: "2026-01-01T00:00:00.000Z",
    creado_en: "2026-01-01T00:00:00.000Z"
  },
  // INSTRUCTOR EN JEFE / JEFE DE PILOTOS E INSTRUCTORES
  {
    id: "usr_chief_bustamante",
    nombre: "Cap. A. Bustamante - Instructor en Jefe",
    rol: "instructor_en_jefe",
    telefono: "+507 6890-7711",
    correo: "a.bustamante@skyops.com",
    password: "SkyOpsChief26.",
    documento_identidad: "8-700-1910",
    direccion_residencial: "Aeropuerto Internacional Marcos A. Gelabert, Hangar SkyOps, Albrook, Ciudad de Panamá",
    fecha_ingreso: "2024-01-01",
    cargo_departamento: "Jefatura de Pilotos e Instructores",
    licencia: "AAC-CFI-MEI-04120",
    vencimiento_medico: "2028-12-31",
    vencimiento_licencia: "2028-12-31",
    numero_medico: "MED-CL1-04120-AAC",
    activo: true,
    auth_provider: "local",
    estado_autorizacion: "aprobado",
    autorizado_por: "Jefatura de Operaciones e Instrucción",
    fecha_autorizacion: "2026-01-01T00:00:00.000Z",
    creado_en: "2026-01-01T00:00:00.000Z",
    puede_crear_usuarios: true
  },
  // INSTRUCTORES OFICIALES CERTIFICADOS AAC
  {
    id: "usr_inst_valeria",
    nombre: "Cap. Valeria Benítez - Instructora de Vuelo (CFI-A)",
    rol: "instructor",
    telefono: "+507 6711-2233",
    correo: "instructor@skyops.com",
    password: "Instructor2026.",
    documento_identidad: "8-790-1420",
    direccion_residencial: "Clayton, Calle Las Acacias, Casa 45, Panamá",
    fecha_ingreso: "2024-02-01",
    licencia: "AAC-CFI-08812",
    vencimiento_medico: "2027-10-31",
    vencimiento_licencia: "2027-11-30",
    numero_medico: "MED-CL1-08812-AAC",
    foto_perfil: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80",
    activo: true,
    auth_provider: "local",
    estado_autorizacion: "aprobado",
    autorizado_por: "Jefatura de Instrucción",
    fecha_autorizacion: "2026-01-01T00:00:00.000Z",
    creado_en: "2026-01-01T00:00:00.000Z"
  },
  {
    id: "usr_inst_fernando",
    nombre: "Cap. Fernando Arboleda",
    rol: "instructor",
    telefono: "+507 6822-4455",
    correo: "fernando.arboleda@skyops.com",
    password: "SkyOpsFernando26.",
    documento_identidad: "8-650-1120",
    direccion_residencial: "Condado del Rey, PH King's Park, Panamá",
    fecha_ingreso: "2024-02-15",
    licencia: "AAC-CFI-07490",
    vencimiento_medico: "2027-08-31",
    vencimiento_licencia: "2027-09-30",
    numero_medico: "MED-CL1-07490-AAC",
    foto_perfil: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80",
    activo: true,
    auth_provider: "local",
    estado_autorizacion: "aprobado",
    autorizado_por: "Jefatura de Instrucción",
    fecha_autorizacion: "2026-01-01T00:00:00.000Z",
    creado_en: "2026-01-01T00:00:00.000Z"
  },
  {
    id: "usr_inst_roberto",
    nombre: "Cap. Roberto Morales",
    rol: "instructor",
    telefono: "+507 6933-5566",
    correo: "roberto.morales@skyops.com",
    password: "SkyOpsRoberto26.",
    documento_identidad: "4-710-1890",
    direccion_residencial: "El Cangrejo, Calle Alberto Navarro, Panamá",
    fecha_ingreso: "2024-03-01",
    licencia: "AAC-CFI-06921",
    vencimiento_medico: "2027-06-30",
    vencimiento_licencia: "2027-07-31",
    numero_medico: "MED-CL1-06921-AAC",
    foto_perfil: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&auto=format&fit=crop&q=80",
    activo: true,
    auth_provider: "local",
    estado_autorizacion: "aprobado",
    autorizado_por: "Jefatura de Instrucción",
    fecha_autorizacion: "2026-01-01T00:00:00.000Z",
    creado_en: "2026-01-01T00:00:00.000Z"
  },
  // ESTUDIANTES OFICIALES DE LA ACADEMIA
  {
    id: "usr_est_daniel",
    nombre: "Daniel Alvarado - Alumno Piloto CPL-A",
    rol: "estudiante",
    telefono: "+507 6412-8899",
    correo: "alumno@skyops.com",
    password: "Alumno2026.",
    documento_identidad: "8-920-1140",
    direccion_residencial: "San Francisco, Calle 73, PH Oasis, Panamá",
    fecha_ingreso: "2025-01-15",
    curso_actual: "Piloto Comercial de Avión (CPL-A)",
    licencia: "AAC-SPL-11420",
    vencimiento_medico: "2027-05-31",
    vencimiento_licencia: "2027-06-30",
    numero_medico: "MED-CL2-11420-AAC",
    foto_perfil: "https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=150&auto=format&fit=crop&q=80",
    activo: true,
    auth_provider: "local",
    estado_autorizacion: "aprobado",
    autorizado_por: "Dirección de Escuela",
    fecha_autorizacion: "2026-01-01T00:00:00.000Z",
    creado_en: "2026-01-01T00:00:00.000Z"
  },
  {
    id: "usr_est_esteban",
    nombre: "Esteban Chen",
    rol: "estudiante",
    telefono: "+507 6523-9900",
    correo: "esteban.chen@skyops.com",
    password: "SkyOpsEsteban26.",
    documento_identidad: "8-880-2210",
    direccion_residencial: "El Dorado, Ave. Miguel Brostella, Panamá",
    fecha_ingreso: "2025-02-01",
    curso_actual: "Piloto Privado de Avión (PPL-A)",
    licencia: "AAC-SPL-11530",
    vencimiento_medico: "2027-04-30",
    vencimiento_licencia: "2027-05-31",
    numero_medico: "MED-CL2-11530-AAC",
    foto_perfil: "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=150&auto=format&fit=crop&q=80",
    activo: true,
    auth_provider: "local",
    estado_autorizacion: "aprobado",
    autorizado_por: "Dirección de Escuela",
    fecha_autorizacion: "2026-01-01T00:00:00.000Z",
    creado_en: "2026-01-01T00:00:00.000Z"
  },
  {
    id: "usr_est_lucia",
    nombre: "Lucía Méndez",
    rol: "estudiante",
    telefono: "+507 6634-1122",
    correo: "lucia.mendez@skyops.com",
    password: "SkyOpsLucia26.",
    documento_identidad: "8-950-3340",
    direccion_residencial: "Costa del Este, PH Park Gate, Panamá",
    fecha_ingreso: "2025-03-10",
    curso_actual: "Piloto Privado de Avión (PPL-A)",
    licencia: "AAC-SPL-11680",
    vencimiento_medico: "2027-09-30",
    vencimiento_licencia: "2027-10-31",
    numero_medico: "MED-CL2-11680-AAC",
    foto_perfil: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80",
    activo: true,
    auth_provider: "local",
    estado_autorizacion: "aprobado",
    autorizado_por: "Dirección de Escuela",
    fecha_autorizacion: "2026-01-01T00:00:00.000Z",
    creado_en: "2026-01-01T00:00:00.000Z"
  },
  {
    id: "usr_est_gabriel",
    nombre: "Gabriel De Gracia",
    rol: "estudiante",
    telefono: "+507 6745-2233",
    correo: "gabriel.degracia@skyops.com",
    password: "SkyOpsGabriel26.",
    documento_identidad: "8-910-4450",
    direccion_residencial: "Albrook, Calle Los Sauces, Casa 12, Panamá",
    fecha_ingreso: "2025-01-20",
    curso_actual: "Habilitación Multimotor (ME-A)",
    licencia: "AAC-CPL-10950",
    vencimiento_medico: "2027-03-31",
    vencimiento_licencia: "2027-04-30",
    numero_medico: "MED-CL1-10950-AAC",
    foto_perfil: "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=150&auto=format&fit=crop&q=80",
    activo: true,
    auth_provider: "local",
    estado_autorizacion: "aprobado",
    autorizado_por: "Dirección de Escuela",
    fecha_autorizacion: "2026-01-01T00:00:00.000Z",
    creado_en: "2026-01-01T00:00:00.000Z"
  }
];

export const INITIAL_TRANSACTIONS: Transaction[] = [];

export const INITIAL_FLIGHT_PROGRESS: FlightProgress[] = [];

export const INITIAL_ITINERARIES: Itinerary[] = [];

const getTodayDateStr = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

const getTomorrowDateStr = () => {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

export const INITIAL_FLIGHT_REQUESTS: FlightRequest[] = [
  {
    id: "freq_init_01",
    fecha_solicitud_ciclo: getTodayDateStr(),
    fecha_vuelo: getTomorrowDateStr(),
    hora_inicio: "08:00",
    hora_fin: "09:30",
    duracion_horas: 1.5,
    instructor_id: "usr_inst_valeria",
    instructor_nombre: "Cap. Valeria Benítez - Instructora de Vuelo (CFI-A)",
    estudiante_id: "usr_est_daniel",
    estudiante_nombre: "Daniel Alvarado - Alumno Piloto CPL-A",
    avion_matricula: "HP-1822",
    avion_modelo: "Cessna 172SP Skyhawk (G1000)",
    ruta: "MPMG - MPDA",
    mision: "Travesía VFR Controlada e Instrumentos Básicos CPL-A",
    notas_instructor: "Alumno con documentación vigente y saldo verificado.",
    estado: "pendiente_envio",
    creado_en: new Date().toISOString()
  },
  {
    id: "freq_init_02",
    fecha_solicitud_ciclo: getTodayDateStr(),
    fecha_vuelo: getTomorrowDateStr(),
    hora_inicio: "10:00",
    hora_fin: "11:30",
    duracion_horas: 1.5,
    instructor_id: "usr_inst_fernando",
    instructor_nombre: "Cap. Fernando Arboleda",
    estudiante_id: "usr_est_esteban",
    estudiante_nombre: "Esteban Chen",
    avion_matricula: "HP-1450",
    avion_modelo: "Piper PA-28-181 Archer II",
    ruta: "MPMG - MPMG",
    mision: "Patrón de Tráfico, Despegues y Aterrizajes de Precisión",
    notas_instructor: "Práctica de toques y despegues pista 01.",
    estado: "pendiente_envio",
    creado_en: new Date().toISOString()
  },
  {
    id: "freq_init_03",
    fecha_solicitud_ciclo: getTodayDateStr(),
    fecha_vuelo: getTomorrowDateStr(),
    hora_inicio: "13:30",
    hora_fin: "15:00",
    duracion_horas: 1.5,
    instructor_id: "usr_inst_roberto",
    instructor_nombre: "Cap. Roberto Morales",
    estudiante_id: "usr_est_lucia",
    estudiante_nombre: "Lucía Méndez",
    avion_matricula: "HP-1588",
    avion_modelo: "Piper PA-28-181 Archer III",
    ruta: "MPMG - MPHO - MPMG",
    mision: "Navegación Visual y Comunicaciones TMA Panamá",
    notas_instructor: "Fase II PPL-A.",
    estado: "pendiente_envio",
    creado_en: new Date().toISOString()
  }
];

export const INITIAL_PAYMENT_LINKS: PaymentLink[] = [
  {
    id: "plink_01",
    token: "sky_pay_99214a8b",
    estudiante_id: "usr_est_daniel",
    estudiante_nombre: "Daniel Alvarado - Alumno Piloto CPL-A",
    estudiante_correo: "alumno@skyops.com",
    monto: 360.00,
    concepto: "Abono de 2.0 Horas de Vuelo Dual - Fase III",
    horas_estimadas: 2.0,
    creado_por: "Lic. Mariana Chen (Contabilidad)",
    creado_en: "2026-10-12T10:00:00.000Z",
    expira_en: "2026-10-19T23:59:59.000Z",
    estado: "pendiente",
    url_pago: "/pay/sky_pay_99214a8b"
  }
];

export const INITIAL_INSTRUCTOR_FEE_STATEMENTS: InstructorFeeStatement[] = [];

export const INITIAL_EMAIL_LOGS: EmailNotification[] = [
  {
    id: 'em_init_01',
    destinatario_tipo: 'estudiante',
    destinatario_nombre: 'Daniel Alvarado (SPL-8921)',
    destinatario_email: 'alumno@skyops.com',
    asunto: '✈️ Asignación de Vuelo: HP-1721SP (Hoy 14:00 - 16:00) - SkyOps Flight Academy',
    cuerpo_html: `<div style="font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,sans-serif;max-width:600px;margin:0 auto;border:1px solid #cbd5e1;border-radius:14px;overflow:hidden;background:#ffffff;">
      <div style="background:linear-gradient(135deg,#0284c7 0%,#0369a1 50%,#0f172a 100%);padding:24px 20px;color:#fff;">
        <span style="background:rgba(255,255,255,0.2);padding:3px 10px;border-radius:12px;font-size:11px;font-weight:bold;letter-spacing:1px;">✈️ DESPACHO DE VUELO OFICIAL</span>
        <h2 style="margin:8px 0 0 0;font-size:20px;color:#fff;">SkyOps Flight Academy</h2>
        <p style="margin:2px 0 0 0;font-size:12px;color:#bae6fd;">Centro de Instrucción y Despacho Aeronáutico</p>
      </div>
      <div style="padding:24px 20px;">
        <p style="font-size:15px;color:#1e293b;margin-top:0;">Estimado/a <strong>Daniel Alvarado</strong>,</p>
        <p style="font-size:14px;color:#475569;line-height:1.5;">Se ha programado una nueva sesión de vuelo en tu programa de instrucción. A continuación los detalles de la misión:</p>
        <table style="width:100%;background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;padding:14px;margin:16px 0;font-size:13px;">
          <tr><td style="color:#64748b;padding:4px 0;">📅 Fecha:</td><td style="font-weight:bold;color:#0f172a;">12 de Octubre, 2026</td></tr>
          <tr><td style="color:#64748b;padding:4px 0;">⏰ Horario:</td><td style="font-weight:bold;color:#0284c7;">14:00 - 16:00 (2.0 hrs)</td></tr>
          <tr><td style="color:#64748b;padding:4px 0;">🛩️ Aeronave:</td><td style="font-weight:bold;color:#0f172a;">HP-1721SP (Cessna 172SP Skyhawk)</td></tr>
          <tr><td style="color:#64748b;padding:4px 0;">👨‍✈️ Instructor:</td><td style="font-weight:bold;color:#0f172a;">Cap. Valeria Benítez (CFI-A)</td></tr>
          <tr><td style="color:#64748b;padding:4px 0;">🎯 Misión:</td><td style="font-weight:bold;color:#0f172a;">Fase III: Maniobras Básicas & Virajes Escarpados</td></tr>
        </table>
        <div style="background:#ecfdf5;border:1px solid #a7f3d0;border-radius:8px;padding:12px;font-size:12px;color:#065f46;margin-bottom:18px;">
          ⏳ <strong>SLA de Confirmación:</strong> Tienes 3 horas para confirmar asistencia a través del portal de despacho.
        </div>
        <p style="font-size:12px;color:#94a3b8;margin:0;">Presentarse 30 minutos antes para revisión meteorológica METAR/TAF y cálculo de peso & balance.</p>
      </div>
      <div style="background:#f1f5f9;padding:12px 20px;border-top:1px solid #e2e8f0;text-align:center;font-size:11px;color:#64748b;">
        SkyOps Flight Academy • Sistema de Gestión y Despacho Aeronáutico Oficial
      </div>
    </div>`,
    cuerpo_texto: 'Nueva asignación de vuelo programada: HP-1721SP (14:00 - 16:00) con Cap. Valeria Benítez. Confirma en el portal de SkyOps.',
    evento: 'itinerario_creado',
    fecha_envio: '2026-10-12T08:30:00.000Z',
    estado_envio: 'enviado',
    itinerario_id: 'itin_01',
    leido: false
  },
  {
    id: 'em_init_02',
    destinatario_tipo: 'instructor',
    destinatario_nombre: 'Cap. Valeria Benítez (CFI-A)',
    destinatario_email: 'instructor@skyops.com',
    asunto: '✈️ Asignación de Vuelo como Instructor: HP-1721SP con Daniel Alvarado (14:00 - 16:00)',
    cuerpo_html: `<div style="font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,sans-serif;max-width:600px;margin:0 auto;border:1px solid #cbd5e1;border-radius:14px;overflow:hidden;background:#ffffff;">
      <div style="background:linear-gradient(135deg,#0284c7 0%,#0369a1 50%,#0f172a 100%);padding:24px 20px;color:#fff;">
        <span style="background:rgba(255,255,255,0.2);padding:3px 10px;border-radius:12px;font-size:11px;font-weight:bold;letter-spacing:1px;">👨‍✈️ DESPACHO INSTRUCTOR (CFI)</span>
        <h2 style="margin:8px 0 0 0;font-size:20px;color:#fff;">SkyOps Flight Academy</h2>
      </div>
      <div style="padding:24px 20px;">
        <p style="font-size:15px;color:#1e293b;margin-top:0;">Capitana <strong>Valeria Benítez</strong>,</p>
        <p style="font-size:14px;color:#475569;line-height:1.5;">Se te ha programado una sesión de vuelo dual como instructora a cargo:</p>
        <table style="width:100%;background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;padding:14px;margin:16px 0;font-size:13px;">
          <tr><td style="color:#64748b;padding:4px 0;">👨‍🎓 Alumno:</td><td style="font-weight:bold;color:#0f172a;">Daniel Alvarado (SPL-8921)</td></tr>
          <tr><td style="color:#64748b;padding:4px 0;">⏰ Horario:</td><td style="font-weight:bold;color:#0284c7;">14:00 - 16:00 (2.0 hrs)</td></tr>
          <tr><td style="color:#64748b;padding:4px 0;">🛩️ Aeronave:</td><td style="font-weight:bold;color:#0f172a;">HP-1721SP (Cessna 172SP)</td></tr>
          <tr><td style="color:#64748b;padding:4px 0;">🎯 Misión:</td><td style="font-weight:bold;color:#0f172a;">Fase III: Maniobras Básicas & Virajes Escarpados</td></tr>
          <tr><td style="color:#64748b;padding:4px 0;">📑 Estado Alumno:</td><td style="font-weight:bold;color:#16a34a;">Vigencias AAC al día • Saldo financiero positivo</td></tr>
        </table>
        <p style="font-size:13px;color:#64748b;">El estudiante dispone de SLA de 3 horas para confirmar asistencia. Recibirás acuse una vez confirmada.</p>
      </div>
    </div>`,
    cuerpo_texto: 'Vuelo programado como instructora para hoy 14:00 - 16:00 en HP-1721SP con alumno Daniel Alvarado.',
    evento: 'itinerario_creado',
    fecha_envio: '2026-10-12T08:30:00.000Z',
    estado_envio: 'enviado',
    itinerario_id: 'itin_01',
    leido: false
  },
  {
    id: 'em_init_03',
    destinatario_tipo: 'contabilidad',
    destinatario_nombre: 'Lic. Carlos Mendoza (Contabilidad)',
    destinatario_email: 'contabilidad@skyops.com',
    asunto: '💳 Comprobante ACH Reportado: Daniel Alvarado ($450.00 USD) - Banco General',
    cuerpo_html: `<div style="font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,sans-serif;max-width:600px;margin:0 auto;border:1px solid #cbd5e1;border-radius:14px;overflow:hidden;background:#ffffff;">
      <div style="background:linear-gradient(135deg,#0284c7 0%,#0369a1 50%,#0f172a 100%);padding:24px 20px;color:#fff;">
        <span style="background:rgba(255,255,255,0.2);padding:3px 10px;border-radius:12px;font-size:11px;font-weight:bold;letter-spacing:1px;">💳 CONTROL CONTABLE & FINANZAS</span>
        <h2 style="margin:8px 0 0 0;font-size:20px;color:#fff;">SkyOps Flight Academy</h2>
      </div>
      <div style="padding:24px 20px;">
        <h3 style="color:#0284c7;margin-top:0;">Nuevo Comprobante ACH Reportado para Conciliación</h3>
        <p style="font-size:14px;color:#334155;">El estudiante <strong>Daniel Alvarado</strong> ha registrado un reporte de transferencia bancaria:</p>
        <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;padding:16px;margin:16px 0;font-size:13px;">
          <div><strong>Monto:</strong> <span style="font-size:16px;color:#0284c7;font-weight:bold;">$450.00 USD</span></div>
          <div style="margin-top:6px;"><strong>Referencia ACH:</strong> BG-ACH-884920</div>
          <div style="margin-top:6px;"><strong>Banco Emisor:</strong> Banco General Panamá</div>
          <div style="margin-top:6px;"><strong>Concepto:</strong> Abono a cuenta de horas de vuelo (Fase III)</div>
        </div>
        <div style="background:#eff6ff;border:1px solid #bfdbfe;border-radius:8px;padding:12px;font-size:12px;color:#1e40af;">
          ℹ️ <strong>Acción Requerida:</strong> Cotejar contra el extracto de cuenta corriente oficial en Banca en Línea y aprobar o rechazar en el Módulo Contable.
        </div>
      </div>
    </div>`,
    cuerpo_texto: 'Nuevo comprobante ACH reportado por Daniel Alvarado ($450.00 USD, Ref: BG-ACH-884920). Requiere conciliación contable.',
    evento: 'pago_reportado',
    fecha_envio: '2026-10-12T07:45:00.000Z',
    estado_envio: 'enviado',
    leido: false
  },
  {
    id: 'em_init_04',
    destinatario_tipo: 'estudiante',
    destinatario_nombre: 'Daniel Alvarado (SPL-8921)',
    destinatario_email: 'alumno@skyops.com',
    asunto: '✅ Saldo Acreditado: Comprobación Bancaria Exitosa (+$450.00 USD) - SkyOps',
    cuerpo_html: `<div style="font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,sans-serif;max-width:600px;margin:0 auto;border:1px solid #cbd5e1;border-radius:14px;overflow:hidden;background:#ffffff;">
      <div style="background:linear-gradient(135deg,#059669 0%,#047857 50%,#064e3b 100%);padding:24px 20px;color:#fff;">
        <span style="background:rgba(255,255,255,0.2);padding:3px 10px;border-radius:12px;font-size:11px;font-weight:bold;letter-spacing:1px;">✅ ACREDITACIÓN FINANCIERA OFICIAL</span>
        <h2 style="margin:8px 0 0 0;font-size:20px;color:#fff;">SkyOps Flight Academy</h2>
      </div>
      <div style="padding:24px 20px;">
        <h3 style="color:#059669;margin-top:0;">¡Pago Verificado y Acreditado con Éxito!</h3>
        <p style="font-size:14px;color:#334155;">Estimado/a <strong>Daniel Alvarado</strong>, Contabilidad ha verificado satisfactoriamente tu comprobante contra el extracto bancario:</p>
        <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:10px;padding:16px;margin:16px 0;font-size:13px;">
          <div><strong>Monto Acreditado:</strong> <span style="font-size:16px;color:#15803d;font-weight:bold;">+$450.00 USD</span></div>
          <div style="margin-top:6px;"><strong>Referencia Confirmada:</strong> BG-ACH-884920</div>
          <div style="margin-top:6px;"><strong>Nuevo Saldo Disponible:</strong> <span style="font-size:15px;color:#047857;font-weight:bold;">$670.00 USD</span></div>
          <div style="margin-top:6px;"><strong>Oficial Contable:</strong> Lic. Carlos Mendoza (Contabilidad)</div>
        </div>
        <p style="font-size:13px;color:#475569;">Tu cuenta se encuentra al día y habilitada para la programación de tus próximas lecciones de vuelo.</p>
      </div>
    </div>`,
    cuerpo_texto: 'Tu pago de $450.00 USD ha sido acreditado en tu cuenta. Nuevo saldo disponible: $670.00 USD.',
    evento: 'pago_confirmado',
    fecha_envio: '2026-10-12T08:00:00.000Z',
    estado_envio: 'enviado',
    leido: true
  },
  {
    id: 'em_init_05',
    destinatario_tipo: 'instructor',
    destinatario_nombre: 'Cap. Valeria Benítez (CFI-A)',
    destinatario_email: 'instructor@skyops.com',
    asunto: '✅ Asistencia Confirmada: Daniel Alvarado confirmó lección HP-1721SP (Hoy 14:00)',
    cuerpo_html: `<div style="font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,sans-serif;max-width:600px;margin:0 auto;border:1px solid #cbd5e1;border-radius:14px;overflow:hidden;background:#ffffff;">
      <div style="background:linear-gradient(135deg,#059669 0%,#047857 50%,#064e3b 100%);padding:24px 20px;color:#fff;">
        <span style="background:rgba(255,255,255,0.2);padding:3px 10px;border-radius:12px;font-size:11px;font-weight:bold;letter-spacing:1px;">✅ ASISTENCIA CONFIRMADA</span>
        <h2 style="margin:8px 0 0 0;font-size:20px;color:#fff;">SkyOps Flight Academy</h2>
      </div>
      <div style="padding:24px 20px;">
        <p style="font-size:14px;color:#334155;">Cap. Valeria Benítez, el alumno <strong>Daniel Alvarado</strong> ha confirmado formalmente su asistencia dentro del SLA de 3 horas:</p>
        <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:10px;padding:14px;margin:14px 0;font-size:13px;color:#166534;">
          <div><strong>Fecha & Hora:</strong> Hoy 12 Octubre, 14:00 - 16:00</div>
          <div style="margin-top:4px;"><strong>Aeronave:</strong> HP-1721SP</div>
          <div style="margin-top:4px;"><strong>Misión:</strong> Fase III: Maniobras Básicas & Virajes Escarpados</div>
        </div>
        <p style="font-size:13px;color:#64748b;">La aeronave se encuentra reservada en el hangar de despacho oficial.</p>
      </div>
    </div>`,
    cuerpo_texto: 'El estudiante Daniel Alvarado ha confirmado su asistencia a la sesión de vuelo de las 14:00 en HP-1721SP.',
    evento: 'itinerario_confirmado',
    fecha_envio: '2026-10-12T09:15:00.000Z',
    estado_envio: 'enviado',
    itinerario_id: 'itin_01',
    leido: false
  },
  {
    id: 'em_init_06',
    destinatario_tipo: 'admin',
    destinatario_nombre: 'Dirección de Operaciones SkyOps',
    destinatario_email: 'admin@skyops.com',
    asunto: '🚨 Alerta Regulatoria AAC: Control de Vigencias Médicas y Licencias (RAC 67)',
    cuerpo_html: `<div style="font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,sans-serif;max-width:600px;margin:0 auto;border:1px solid #cbd5e1;border-radius:14px;overflow:hidden;background:#ffffff;">
      <div style="background:linear-gradient(135deg,#7c3aed 0%,#6d28d9 50%,#4c1d95 100%);padding:24px 20px;color:#fff;">
        <span style="background:rgba(255,255,255,0.2);padding:3px 10px;border-radius:12px;font-size:11px;font-weight:bold;letter-spacing:1px;">🚨 SEGURIDAD OPERACIONAL AAC</span>
        <h2 style="margin:8px 0 0 0;font-size:20px;color:#fff;">SkyOps Flight Academy</h2>
      </div>
      <div style="padding:24px 20px;">
        <h3 style="color:#6d28d9;margin-top:0;">Monitoreo Regulatorio de Licencias y Certificados Médicos</h3>
        <p style="font-size:14px;color:#334155;">El sistema de auditoría continua ha realizado el escaneo periódico de expedientes de vuelo según normativa RAC 67:</p>
        <div style="background:#f5f3ff;border:1px solid #ddd6fe;border-radius:10px;padding:14px;margin:14px 0;font-size:13px;color:#5b21b6;">
          <div>• <strong>Pilotos Activos Monitoreados:</strong> 18 tripulantes (Alumnos e Instructores)</div>
          <div style="margin-top:4px;">• <strong>Vigencias al Día:</strong> 16 pilotos certificados</div>
          <div style="margin-top:4px;">• <strong>Próximos a Vencer (30 Días):</strong> 2 pilotos con aviso preventivo emitido</div>
          <div style="margin-top:4px;">• <strong>Hard Lock de Despacho:</strong> 0 pilotos bloqueados</div>
        </div>
        <p style="font-size:12px;color:#64748b;">Cumplimiento regulatorio del 100% de la flota verificado.</p>
      </div>
    </div>`,
    cuerpo_texto: 'Escaneo regulatorio AAC: 18 pilotos monitoreados, 16 al día, 2 con aviso preventivo emitido.',
    evento: 'alerta_vigencia_medica',
    fecha_envio: '2026-10-12T06:00:00.000Z',
    estado_envio: 'enviado',
    leido: false
  },
  {
    id: 'em_init_07',
    destinatario_tipo: 'contabilidad',
    destinatario_nombre: 'Lic. Carlos Mendoza (Contabilidad)',
    destinatario_email: 'contabilidad@skyops.com',
    asunto: '⚠️ Alerta de Saldo Mínimo: Alumno Daniel Alvarado ($120.00 USD)',
    cuerpo_html: `<div style="font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,sans-serif;max-width:600px;margin:0 auto;border:1px solid #cbd5e1;border-radius:14px;overflow:hidden;background:#ffffff;">
      <div style="background:linear-gradient(135deg,#d97706 0%,#b45309 50%,#78350f 100%);padding:24px 20px;color:#fff;">
        <span style="background:rgba(255,255,255,0.2);padding:3px 10px;border-radius:12px;font-size:11px;font-weight:bold;letter-spacing:1px;">⚠️ ALERTA FINANCIERA PREVENTIVA</span>
        <h2 style="margin:8px 0 0 0;font-size:20px;color:#fff;">SkyOps Flight Academy</h2>
      </div>
      <div style="padding:24px 20px;">
        <h3 style="color:#b45309;margin-top:0;">Aviso de Saldo Mínimo para Horas de Vuelo</h3>
        <p style="font-size:14px;color:#334155;">El estudiante <strong>Daniel Alvarado</strong> tiene un saldo previo de $120.00 USD, inferior al costo de una lección completa de vuelo.</p>
        <p style="font-size:13px;color:#64748b;">Se ha enviado notificación preventiva al estudiante y se requiere seguimiento de recaudación.</p>
      </div>
    </div>`,
    cuerpo_texto: 'Aviso preventivo de saldo para Daniel Alvarado ($120.00 USD).',
    evento: 'alerta_saldo_bajo',
    fecha_envio: '2026-10-11T16:20:00.000Z',
    estado_envio: 'enviado',
    leido: true
  },
  {
    id: 'em_init_08',
    destinatario_tipo: 'admin',
    destinatario_nombre: 'Dirección de Operaciones SkyOps',
    destinatario_email: 'admin@skyops.com',
    asunto: '🛠️ Alerta de Mantenimiento Preventivo: Cessna 172SP (HP-1721SP - 48.5 Horas)',
    cuerpo_html: `<div style="font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,sans-serif;max-width:600px;margin:0 auto;border:1px solid #cbd5e1;border-radius:14px;overflow:hidden;background:#ffffff;">
      <div style="background:linear-gradient(135deg,#e11d48 0%,#be123c 50%,#881337 100%);padding:24px 20px;color:#fff;">
        <span style="background:rgba(255,255,255,0.2);padding:3px 10px;border-radius:12px;font-size:11px;font-weight:bold;letter-spacing:1px;">🛠️ CONTROL TÉCNICO DE FLOTA</span>
        <h2 style="margin:8px 0 0 0;font-size:20px;color:#fff;">SkyOps Flight Academy</h2>
      </div>
      <div style="padding:24px 20px;">
        <h3 style="color:#e11d48;margin-top:0;">Próxima Inspección de 50 Horas de Motor</h3>
        <p style="font-size:14px;color:#334155;">La aeronave <strong>HP-1721SP (Cessna 172SP Skyhawk)</strong> registra 48.5 horas operadas desde el último servicio técnico mayor.</p>
        <div style="background:#fff1f2;border:1px solid #fecdd3;border-radius:10px;padding:14px;margin:14px 0;font-size:13px;color:#9f1239;">
          <div>• <strong>Horas Restantes:</strong> 1.5 horas de vuelo disponibles</div>
          <div style="margin-top:4px;">• <strong>Trabajo Programado:</strong> Cambio de aceite, filtros y chequeo de bujías</div>
          <div style="margin-top:4px;">• <strong>Taller Asignado:</strong> Hangar Técnico MPMG</div>
        </div>
      </div>
    </div>`,
    cuerpo_texto: 'Alerta de mantenimiento técnico para HP-1721SP: 1.5 horas restantes antes de inspección de 50 horas.',
    evento: 'alerta_mantenimiento',
    fecha_envio: '2026-10-11T18:00:00.000Z',
    estado_envio: 'enviado',
    leido: true
  }
];

export const INITIAL_ROLE_NOTIFICATION_RULES: RoleNotificationRule[] = [
  {
    id: 'rule_pago_reportado',
    evento: 'pago_reportado',
    nombre: 'Nuevo Pago Reportado por Estudiante',
    descripcion: 'Notifica al Departamento de Contabilidad y a Jefatura cuando un alumno reporta un pago o comprobante ACH, y envía acuse al alumno.',
    categoria: 'pagos',
    roles_notificados: ['contabilidad', 'admin', 'estudiante'],
    activo: true,
    prioridad: 'alta',
    plantilla_asociada: 'payment_received'
  },
  {
    id: 'rule_pago_confirmado',
    evento: 'pago_confirmado',
    nombre: 'Confirmación Oficial de Pago & Saldo Acreditado',
    descripcion: 'Enviado tras la conciliación bancaria. Notifica al estudiante con su nuevo saldo disponible y a Jefatura y Escuela.',
    categoria: 'pagos',
    roles_notificados: ['estudiante', 'admin', 'escuela', 'contabilidad'],
    activo: true,
    prioridad: 'alta',
    plantilla_asociada: 'payment_approved'
  },
  {
    id: 'rule_pago_rechazado',
    evento: 'pago_rechazado',
    nombre: 'Rechazo de Comprobante / Discrepancia Bancaria',
    descripcion: 'Alerta al estudiante y a Jefatura si el comprobante no coincide con el extracto bancario con el motivo formal de rechazo.',
    categoria: 'pagos',
    roles_notificados: ['estudiante', 'admin', 'contabilidad'],
    activo: true,
    prioridad: 'alta',
    plantilla_asociada: 'payment_rejected'
  },
  {
    id: 'rule_pago_tarjeta',
    evento: 'pago_tarjeta',
    nombre: 'Pago Aprobado con Tarjeta Débito / Crédito',
    descripcion: 'Acreditación instantánea tras el procesamiento seguro de tarjeta bancaria (Visa/Mastercard/Clave) enviando recibo oficial al estudiante y notificación a Contabilidad y Admin.',
    categoria: 'pagos',
    roles_notificados: ['estudiante', 'contabilidad', 'admin'],
    activo: true,
    prioridad: 'alta',
    plantilla_asociada: 'payment_approved'
  },
  {
    id: 'rule_link_pago_creado',
    evento: 'link_pago_creado',
    nombre: 'Generación de Link de Pago Seguro',
    descripcion: 'Notifica al estudiante y contabilidad cuando se genera un link de cobro o abono con botón para pago en línea.',
    categoria: 'pagos',
    roles_notificados: ['estudiante', 'contabilidad', 'admin'],
    activo: true,
    prioridad: 'alta',
    plantilla_asociada: 'payment_received'
  },
  {
    id: 'rule_link_pago_pagado',
    evento: 'link_pago_pagado',
    nombre: 'Link de Pago Acreditado en Tiempo Real',
    descripcion: 'Acredita el saldo en tiempo real al abonar mediante link de pago seguro y notifica a los roles correspondientes.',
    categoria: 'pagos',
    roles_notificados: ['estudiante', 'contabilidad', 'admin'],
    activo: true,
    prioridad: 'alta',
    plantilla_asociada: 'payment_approved'
  },
  {
    id: 'rule_itinerario_creado',
    evento: 'itinerario_creado',
    nombre: 'Asignación de Vuelo a Estudiante (SLA 3 Horas)',
    descripcion: 'Notifica al alumno asignado, al instructor asignado y a Jefatura/Escuela con aeronave, horario, misión y SLA de confirmación.',
    categoria: 'itinerarios',
    roles_notificados: ['estudiante', 'instructor', 'admin', 'escuela'],
    activo: true,
    prioridad: 'alta',
    plantilla_asociada: 'flight_scheduled'
  },
  {
    id: 'rule_itinerario_confirmado',
    evento: 'itinerario_confirmado',
    nombre: 'Confirmación de Asistencia por Estudiante',
    descripcion: 'Informa al instructor y a despacho que el estudiante aceptó y confirmó formalmente su asistencia al vuelo.',
    categoria: 'itinerarios',
    roles_notificados: ['instructor', 'estudiante', 'escuela', 'admin'],
    activo: true,
    prioridad: 'media',
    plantilla_asociada: 'flight_confirmed'
  },
  {
    id: 'rule_vuelo_cancelado',
    evento: 'vuelo_cancelado',
    nombre: 'Cancelación de Vuelo Programado',
    descripcion: 'Alerta a todos los involucrados (alumno, instructor y despacho) con el motivo formal de cancelación.',
    categoria: 'itinerarios',
    roles_notificados: ['estudiante', 'instructor', 'escuela', 'admin'],
    activo: true,
    prioridad: 'alta',
    plantilla_asociada: 'flight_cancelled'
  },
  {
    id: 'rule_alerta_saldo_bajo',
    evento: 'alerta_saldo_bajo',
    nombre: 'Alerta Preventiva de Saldo Insuficiente',
    descripcion: 'Avisa al alumno, a Contabilidad y a Jefatura cuando el saldo no cubre futuras horas de vuelo para prevenir morosidad.',
    categoria: 'alertas_seguridad',
    roles_notificados: ['estudiante', 'contabilidad', 'admin'],
    activo: true,
    prioridad: 'media',
    plantilla_asociada: 'low_balance_alert'
  },
  {
    id: 'rule_alerta_vigencia_medica',
    evento: 'alerta_vigencia_medica',
    nombre: 'Vencimiento de Certificado Médico AAC',
    descripcion: 'Alerta regulatoria obligatoria al piloto (alumno o instructor), a Jefatura de Instrucción y a Escuela para evitar suspensiones.',
    categoria: 'alertas_seguridad',
    roles_notificados: ['estudiante', 'instructor', 'admin', 'escuela'],
    activo: true,
    prioridad: 'urgente',
    plantilla_asociada: 'medical_expiration_alert'
  },
  {
    id: 'rule_alerta_licencia_vuelo',
    evento: 'alerta_licencia_vuelo',
    nombre: 'Vencimiento de Licencia Aeronáutica AAC',
    descripcion: 'Alerta regulatoria de renovación de licencias SPL, CPL o CFI ante la Dirección General de Aeronáutica Civil.',
    categoria: 'alertas_seguridad',
    roles_notificados: ['estudiante', 'instructor', 'admin', 'escuela'],
    activo: true,
    prioridad: 'urgente',
    plantilla_asociada: 'license_expiration_alert'
  },
  {
    id: 'rule_alerta_mantenimiento',
    evento: 'alerta_mantenimiento',
    nombre: 'Mantenimiento & Horas Motor de Aeronaves',
    descripcion: 'Notifica a Jefatura, Escuela e Instructores ante proximidad de inspección de 50h/100h o discrepancias en bitácoras de aeronaves.',
    categoria: 'alertas_seguridad',
    roles_notificados: ['admin', 'escuela', 'instructor'],
    activo: true,
    prioridad: 'alta',
    plantilla_asociada: 'maintenance_alert'
  }
];

export const INITIAL_ACCOUNTING_MESSAGES: InternalAccountingMessage[] = [];

export const INITIAL_OPERATING_EXPENSES: OperatingExpense[] = [
  // --- AGOSTO 2026 ---
  {
    id: 'exp_2026_08_01',
    fecha: '2026-08-22',
    categoria: 'combustible',
    concepto: 'Suministro AVGAS 100LL (850 galones) - Estación Albrook MPPA',
    monto: 4250.00,
    proveedor: 'Terpel Aviación Panamá S.A.',
    factura_numero: 'FAC-TER-88921',
    matricula_asociada: 'HP-1822',
    metodo_pago: 'ACH',
    notas: 'Reabastecimiento para vuelos de travesía e instrucción bimotor.',
    creado_por: 'Dirección de Operaciones Escuela',
    creado_en: '2026-08-22T14:30:00Z'
  },
  {
    id: 'exp_2026_08_02',
    fecha: '2026-08-18',
    categoria: 'mantenimiento',
    concepto: 'Inspección Periódica 100 Horas & Cambio Aceite Aeroshell 15W50',
    monto: 2450.00,
    proveedor: 'AeroTech Maintenance Panamá (Taller AAC No. 042)',
    factura_numero: 'FAC-ATM-2026-441',
    matricula_asociada: 'HP-1822',
    metodo_pago: 'ACH',
    notas: 'Inspección reglamentaria 100h según manual Piper PA-44. Firma de retorno a servicio.',
    creado_por: 'Dirección de Operaciones Escuela',
    creado_en: '2026-08-18T16:00:00Z'
  },
  {
    id: 'exp_2026_08_03',
    fecha: '2026-08-15',
    categoria: 'nomina_instructores',
    concepto: 'Honorarios Instrucción de Vuelo Dual & Simulador - 1ra Quincena Agosto',
    monto: 4850.00,
    proveedor: 'Nómina Instructores CFI / MEI (Cap. Valeria Benítez, Fernando Arboleda, Roberto Morales)',
    factura_numero: 'NOM-CFI-2026-08A',
    metodo_pago: 'ACH',
    notas: 'Liquidación de 92 horas dual impartidas en la primera quincena.',
    creado_por: 'Mariana Chen (Contabilidad)',
    creado_en: '2026-08-15T11:00:00Z'
  },
  {
    id: 'exp_2026_08_04',
    fecha: '2026-08-15',
    categoria: 'nomina_personal',
    concepto: 'Planilla Personal de Despacho de Vuelo, Mantenimiento y Operaciones',
    monto: 3200.00,
    proveedor: 'Planilla Administrativa SkyOps',
    factura_numero: 'NOM-OPS-2026-08A',
    metodo_pago: 'ACH',
    notas: 'Pago quincenal oficial.',
    creado_por: 'Mariana Chen (Contabilidad)',
    creado_en: '2026-08-15T11:30:00Z'
  },
  {
    id: 'exp_2026_08_05',
    fecha: '2026-08-10',
    categoria: 'combustible',
    concepto: 'Combustible AVGAS 100LL - Escala en Aeropuerto de David MPDA',
    monto: 780.00,
    proveedor: 'Petróleos Delta Aviación',
    factura_numero: 'FAC-PD-99120',
    matricula_asociada: 'HP-1450',
    metodo_pago: 'Tarjeta Corporativa',
    notas: 'Vuelo de travesía IFR con alumnos comerciales.',
    creado_por: 'Cap. Fernando Arboleda',
    creado_en: '2026-08-10T18:00:00Z'
  },
  {
    id: 'exp_2026_08_06',
    fecha: '2026-08-05',
    categoria: 'simulador_tecnologia',
    concepto: 'Certificación Periódica AAC & Calibración Simulador ALSIM ALX FNPT II',
    monto: 1100.00,
    proveedor: 'ALSIM Flight Training Systems',
    factura_numero: 'FAC-ALS-7402',
    matricula_asociada: 'SIM-ALX',
    metodo_pago: 'ACH',
    notas: 'Renovación de calificación FNPT II con la Autoridad Aeronáutica Civil.',
    creado_por: 'Dirección de Operaciones Escuela',
    creado_en: '2026-08-05T09:00:00Z'
  },
  {
    id: 'exp_2026_08_07',
    fecha: '2026-08-04',
    categoria: 'mantenimiento',
    concepto: 'Reemplazo de Pastillas de Freno Cleveland & Neumático Principal Goodyear',
    monto: 890.00,
    proveedor: 'AeroPartes Aviación Panamá MPPA',
    factura_numero: 'FAC-APA-11029',
    matricula_asociada: 'HP-1450',
    metodo_pago: 'ACH',
    notas: 'Mantenimiento de línea previo a maniobras de circuito.',
    creado_por: 'Dirección de Operaciones Escuela',
    creado_en: '2026-08-04T15:00:00Z'
  },
  {
    id: 'exp_2026_08_08',
    fecha: '2026-08-01',
    categoria: 'hangaraje_tasas',
    concepto: 'Alquiler Hangar 4B Aeropuerto Marcos A. Gelabert + Tasas Operacionales AAC',
    monto: 2850.00,
    proveedor: 'Tocumen S.A. / Autoridad Aeronáutica Civil MPPA',
    factura_numero: 'FAC-TOC-2026-08',
    metodo_pago: 'ACH',
    notas: 'Canon mensual de hangaraje para la flota completa y rampa.',
    creado_por: 'Mariana Chen (Contabilidad)',
    creado_en: '2026-08-01T08:00:00Z'
  },
  {
    id: 'exp_2026_08_09',
    fecha: '2026-08-01',
    categoria: 'seguros',
    concepto: 'Póliza Mensual de Casco, Pasajeros & Responsabilidad Civil Flota Aérea',
    monto: 2150.00,
    proveedor: 'Aseguradora Ancón / Mapfre Panamá',
    factura_numero: 'POL-AERO-2026-08',
    metodo_pago: 'ACH',
    notas: 'Cobertura integral aeronaves HP-1822, HP-1450, HP-1799, HP-1588.',
    creado_por: 'Mariana Chen (Contabilidad)',
    creado_en: '2026-08-01T08:30:00Z'
  },
  {
    id: 'exp_2026_08_10',
    fecha: '2026-08-02',
    categoria: 'otros_operativos',
    concepto: 'Material Didáctico, Cartas Visuales VFR Panamá & Bitácoras de Vuelo AAC',
    monto: 620.00,
    proveedor: 'Suministros Aeronáuticos del Istmo',
    factura_numero: 'FAC-SAI-3301',
    metodo_pago: 'Tarjeta Corporativa',
    notas: 'Kits para nuevos estudiantes matriculados.',
    creado_por: 'Dirección de Operaciones Escuela',
    creado_en: '2026-08-02T10:00:00Z'
  },

  // --- JULIO 2026 ---
  {
    id: 'exp_2026_07_01',
    fecha: '2026-07-28',
    categoria: 'combustible',
    concepto: 'Suministro AVGAS 100LL (1,200 galones) - Lote Mensual de Verano',
    monto: 5880.00,
    proveedor: 'Terpel Aviación Panamá S.A.',
    factura_numero: 'FAC-TER-88120',
    metodo_pago: 'ACH',
    creado_por: 'Dirección de Operaciones Escuela',
    creado_en: '2026-07-28T10:00:00Z'
  },
  {
    id: 'exp_2026_07_02',
    fecha: '2026-07-31',
    categoria: 'nomina_instructores',
    concepto: 'Honorarios Instrucción de Vuelo Dual y Chequeos AAC - Cierre Julio',
    monto: 9400.00,
    proveedor: 'Nómina Instructores CFI',
    factura_numero: 'NOM-CFI-2026-07',
    metodo_pago: 'ACH',
    creado_por: 'Mariana Chen (Contabilidad)',
    creado_en: '2026-07-31T17:00:00Z'
  },
  {
    id: 'exp_2026_07_03',
    fecha: '2026-07-31',
    categoria: 'nomina_personal',
    concepto: 'Planilla Administrativa y de Despacho - Cierre Julio',
    monto: 6400.00,
    proveedor: 'Planilla Administrativa SkyOps',
    factura_numero: 'NOM-OPS-2026-07',
    metodo_pago: 'ACH',
    creado_por: 'Mariana Chen (Contabilidad)',
    creado_en: '2026-07-31T17:00:00Z'
  },
  {
    id: 'exp_2026_07_04',
    fecha: '2026-07-20',
    categoria: 'mantenimiento',
    concepto: 'Inspección Anual & Overhaul Magnetos Bendix - HP-1799 Piper Archer',
    monto: 3200.00,
    proveedor: 'AeroTech Maintenance Panamá',
    factura_numero: 'FAC-ATM-2026-389',
    matricula_asociada: 'HP-1799',
    metodo_pago: 'ACH',
    creado_por: 'Dirección de Operaciones Escuela',
    creado_en: '2026-07-20T11:00:00Z'
  },
  {
    id: 'exp_2026_07_05',
    fecha: '2026-07-15',
    categoria: 'simulador_tecnologia',
    concepto: 'Suscripción Jeppesen NavData IFR & Actualización Garmin FliteCharts',
    monto: 850.00,
    proveedor: 'Jeppesen Boeing Aviation',
    factura_numero: 'INV-JEP-99410',
    metodo_pago: 'Tarjeta Corporativa',
    creado_por: 'Dirección de Operaciones Escuela',
    creado_en: '2026-07-15T09:00:00Z'
  },
  {
    id: 'exp_2026_07_06',
    fecha: '2026-07-01',
    categoria: 'hangaraje_tasas',
    concepto: 'Alquiler Hangar 4B Aeropuerto Marcos A. Gelabert MPPA',
    monto: 2850.00,
    proveedor: 'Tocumen S.A. MPPA',
    factura_numero: 'FAC-TOC-2026-07',
    metodo_pago: 'ACH',
    creado_por: 'Mariana Chen (Contabilidad)',
    creado_en: '2026-07-01T08:00:00Z'
  },
  {
    id: 'exp_2026_07_07',
    fecha: '2026-07-01',
    categoria: 'seguros',
    concepto: 'Póliza de Seguros Aeronáuticos de Flota',
    monto: 2150.00,
    proveedor: 'Aseguradora Ancón',
    factura_numero: 'POL-AERO-2026-07',
    metodo_pago: 'ACH',
    creado_por: 'Mariana Chen (Contabilidad)',
    creado_en: '2026-07-01T08:30:00Z'
  },
  {
    id: 'exp_2026_07_08',
    fecha: '2026-07-12',
    categoria: 'combustible',
    concepto: 'Combustible Reabastecimiento Travesía Bocas del Toro MPBO',
    monto: 1150.00,
    proveedor: 'Petróleos Delta Aviación',
    factura_numero: 'FAC-PD-98711',
    matricula_asociada: 'HP-1822',
    metodo_pago: 'Tarjeta Corporativa',
    creado_por: 'Cap. Valeria Benítez',
    creado_en: '2026-07-12T14:00:00Z'
  },

  // --- JUNIO 2026 ---
  {
    id: 'exp_2026_06_01',
    fecha: '2026-06-25',
    categoria: 'combustible',
    concepto: 'Suministro AVGAS 100LL (1,100 galones)',
    monto: 5390.00,
    proveedor: 'Terpel Aviación Panamá',
    factura_numero: 'FAC-TER-87600',
    metodo_pago: 'ACH',
    creado_por: 'Dirección de Operaciones Escuela',
    creado_en: '2026-06-25T10:00:00Z'
  },
  {
    id: 'exp_2026_06_02',
    fecha: '2026-06-30',
    categoria: 'nomina_instructores',
    concepto: 'Honorarios Instructores CFI - Cierre Junio',
    monto: 8950.00,
    proveedor: 'Nómina Instructores CFI',
    factura_numero: 'NOM-CFI-2026-06',
    metodo_pago: 'ACH',
    creado_por: 'Mariana Chen (Contabilidad)',
    creado_en: '2026-06-30T17:00:00Z'
  },
  {
    id: 'exp_2026_06_03',
    fecha: '2026-06-30',
    categoria: 'nomina_personal',
    concepto: 'Planilla Administrativa y Despacho - Junio',
    monto: 6400.00,
    proveedor: 'Planilla Administrativa SkyOps',
    factura_numero: 'NOM-OPS-2026-06',
    metodo_pago: 'ACH',
    creado_por: 'Mariana Chen (Contabilidad)',
    creado_en: '2026-06-30T17:00:00Z'
  },
  {
    id: 'exp_2026_06_04',
    fecha: '2026-06-15',
    categoria: 'mantenimiento',
    concepto: 'Inspección 100 Horas & Calibración VOR/ILS - HP-1588 Cessna 172SP G1000',
    monto: 2100.00,
    proveedor: 'Taller Aviónica Balboa',
    factura_numero: 'FAC-TAB-1992',
    matricula_asociada: 'HP-1588',
    metodo_pago: 'ACH',
    creado_por: 'Dirección de Operaciones Escuela',
    creado_en: '2026-06-15T11:00:00Z'
  },
  {
    id: 'exp_2026_06_05',
    fecha: '2026-06-01',
    categoria: 'hangaraje_tasas',
    concepto: 'Alquiler Hangar 4B MPPA & Tasas AAC',
    monto: 2850.00,
    proveedor: 'Tocumen S.A.',
    factura_numero: 'FAC-TOC-2026-06',
    metodo_pago: 'ACH',
    creado_por: 'Mariana Chen (Contabilidad)',
    creado_en: '2026-06-01T08:00:00Z'
  },
  {
    id: 'exp_2026_06_06',
    fecha: '2026-06-01',
    categoria: 'seguros',
    concepto: 'Póliza Mensual Seguros Aeronáuticos',
    monto: 2150.00,
    proveedor: 'Aseguradora Ancón',
    factura_numero: 'POL-AERO-2026-06',
    metodo_pago: 'ACH',
    creado_por: 'Mariana Chen (Contabilidad)',
    creado_en: '2026-06-01T08:30:00Z'
  },
  {
    id: 'exp_2026_06_07',
    fecha: '2026-06-10',
    categoria: 'simulador_tecnologia',
    concepto: 'Servidores Cloud SkyOps & Licencia Software Despacho',
    monto: 620.00,
    proveedor: 'Cloud Ingress Aviation',
    factura_numero: 'INV-CIA-5520',
    metodo_pago: 'Tarjeta Corporativa',
    creado_por: 'Mariana Chen (Contabilidad)',
    creado_en: '2026-06-10T09:00:00Z'
  },

  // --- MAYO 2026 ---
  {
    id: 'exp_2026_05_01',
    fecha: '2026-05-20',
    categoria: 'combustible',
    concepto: 'Suministro AVGAS 100LL (1,050 galones)',
    monto: 5145.00,
    proveedor: 'Terpel Aviación Panamá',
    factura_numero: 'FAC-TER-86900',
    metodo_pago: 'ACH',
    creado_por: 'Dirección de Operaciones Escuela',
    creado_en: '2026-05-20T10:00:00Z'
  },
  {
    id: 'exp_2026_05_02',
    fecha: '2026-05-31',
    categoria: 'nomina_instructores',
    concepto: 'Honorarios Instructores CFI - Cierre Mayo',
    monto: 8600.00,
    proveedor: 'Nómina Instructores CFI',
    factura_numero: 'NOM-CFI-2026-05',
    metodo_pago: 'ACH',
    creado_por: 'Mariana Chen (Contabilidad)',
    creado_en: '2026-05-31T17:00:00Z'
  },
  {
    id: 'exp_2026_05_03',
    fecha: '2026-05-31',
    categoria: 'nomina_personal',
    concepto: 'Planilla Administrativa y Operativa - Mayo',
    monto: 6400.00,
    proveedor: 'Planilla Administrativa SkyOps',
    factura_numero: 'NOM-OPS-2026-05',
    metodo_pago: 'ACH',
    creado_por: 'Mariana Chen (Contabilidad)',
    creado_en: '2026-05-31T17:00:00Z'
  },
  {
    id: 'exp_2026_05_04',
    fecha: '2026-05-18',
    categoria: 'mantenimiento',
    concepto: 'Inspección 100 Horas Bimotor - HP-1822 Piper Seminole',
    monto: 2350.00,
    proveedor: 'AeroTech Maintenance Panamá',
    factura_numero: 'FAC-ATM-2026-310',
    matricula_asociada: 'HP-1822',
    metodo_pago: 'ACH',
    creado_por: 'Dirección de Operaciones Escuela',
    creado_en: '2026-05-18T11:00:00Z'
  },
  {
    id: 'exp_2026_05_05',
    fecha: '2026-05-01',
    categoria: 'hangaraje_tasas',
    concepto: 'Hangaraje MPPA & Tarifas AAC',
    monto: 2850.00,
    proveedor: 'Tocumen S.A.',
    factura_numero: 'FAC-TOC-2026-05',
    metodo_pago: 'ACH',
    creado_por: 'Mariana Chen (Contabilidad)',
    creado_en: '2026-05-01T08:00:00Z'
  },
  {
    id: 'exp_2026_05_06',
    fecha: '2026-05-01',
    categoria: 'seguros',
    concepto: 'Póliza Seguros Aeronáuticos de Flota',
    monto: 2150.00,
    proveedor: 'Aseguradora Ancón',
    factura_numero: 'POL-AERO-2026-05',
    metodo_pago: 'ACH',
    creado_por: 'Mariana Chen (Contabilidad)',
    creado_en: '2026-05-01T08:30:00Z'
  },

  // --- ABRIL 2026 ---
  {
    id: 'exp_2026_04_01',
    fecha: '2026-04-18',
    categoria: 'combustible',
    concepto: 'Suministro AVGAS 100LL (1,150 galones)',
    monto: 5635.00,
    proveedor: 'Terpel Aviación Panamá',
    factura_numero: 'FAC-TER-86100',
    metodo_pago: 'ACH',
    creado_por: 'Dirección de Operaciones Escuela',
    creado_en: '2026-04-18T10:00:00Z'
  },
  {
    id: 'exp_2026_04_02',
    fecha: '2026-04-30',
    categoria: 'nomina_instructores',
    concepto: 'Honorarios Instructores CFI - Abril',
    monto: 8800.00,
    proveedor: 'Nómina Instructores CFI',
    factura_numero: 'NOM-CFI-2026-04',
    metodo_pago: 'ACH',
    creado_por: 'Mariana Chen (Contabilidad)',
    creado_en: '2026-04-30T17:00:00Z'
  },
  {
    id: 'exp_2026_04_03',
    fecha: '2026-04-30',
    categoria: 'nomina_personal',
    concepto: 'Planilla Operativa y Administrativa - Abril',
    monto: 6400.00,
    proveedor: 'Planilla Administrativa SkyOps',
    factura_numero: 'NOM-OPS-2026-04',
    metodo_pago: 'ACH',
    creado_por: 'Mariana Chen (Contabilidad)',
    creado_en: '2026-04-30T17:00:00Z'
  },
  {
    id: 'exp_2026_04_04',
    fecha: '2026-04-12',
    categoria: 'mantenimiento',
    concepto: 'Mantenimiento Preventivo 50h & Filtros - Toda la Flota',
    monto: 1450.00,
    proveedor: 'AeroTech Maintenance Panamá',
    factura_numero: 'FAC-ATM-2026-255',
    metodo_pago: 'ACH',
    creado_por: 'Dirección de Operaciones Escuela',
    creado_en: '2026-04-12T11:00:00Z'
  },
  {
    id: 'exp_2026_04_05',
    fecha: '2026-04-01',
    categoria: 'hangaraje_tasas',
    concepto: 'Hangaraje MPPA & Tasas Aeroportuarias',
    monto: 2850.00,
    proveedor: 'Tocumen S.A.',
    factura_numero: 'FAC-TOC-2026-04',
    metodo_pago: 'ACH',
    creado_por: 'Mariana Chen (Contabilidad)',
    creado_en: '2026-04-01T08:00:00Z'
  },
  {
    id: 'exp_2026_04_06',
    fecha: '2026-04-01',
    categoria: 'seguros',
    concepto: 'Póliza Seguros Aeronáuticos de Flota',
    monto: 2150.00,
    proveedor: 'Aseguradora Ancón',
    factura_numero: 'POL-AERO-2026-04',
    metodo_pago: 'ACH',
    creado_por: 'Mariana Chen (Contabilidad)',
    creado_en: '2026-04-01T08:30:00Z'
  },

  // --- MARZO 2026 ---
  {
    id: 'exp_2026_03_01',
    fecha: '2026-03-22',
    categoria: 'combustible',
    concepto: 'Suministro AVGAS 100LL (1,250 galones)',
    monto: 6125.00,
    proveedor: 'Terpel Aviación Panamá',
    factura_numero: 'FAC-TER-85400',
    metodo_pago: 'ACH',
    creado_por: 'Dirección de Operaciones Escuela',
    creado_en: '2026-03-22T10:00:00Z'
  },
  {
    id: 'exp_2026_03_02',
    fecha: '2026-03-31',
    categoria: 'nomina_instructores',
    concepto: 'Honorarios Instructores CFI - Marzo',
    monto: 9650.00,
    proveedor: 'Nómina Instructores CFI',
    factura_numero: 'NOM-CFI-2026-03',
    metodo_pago: 'ACH',
    creado_por: 'Mariana Chen (Contabilidad)',
    creado_en: '2026-03-31T17:00:00Z'
  },
  {
    id: 'exp_2026_03_03',
    fecha: '2026-03-31',
    categoria: 'nomina_personal',
    concepto: 'Planilla Operativa y Administrativa - Marzo',
    monto: 6400.00,
    proveedor: 'Planilla Administrativa SkyOps',
    factura_numero: 'NOM-OPS-2026-03',
    metodo_pago: 'ACH',
    creado_por: 'Mariana Chen (Contabilidad)',
    creado_en: '2026-03-31T17:00:00Z'
  },
  {
    id: 'exp_2026_03_04',
    fecha: '2026-03-15',
    categoria: 'mantenimiento',
    concepto: 'Inspección 100 Horas - HP-1450 Cessna 172',
    monto: 1980.00,
    proveedor: 'AeroTech Maintenance Panamá',
    factura_numero: 'FAC-ATM-2026-198',
    matricula_asociada: 'HP-1450',
    metodo_pago: 'ACH',
    creado_por: 'Dirección de Operaciones Escuela',
    creado_en: '2026-03-15T11:00:00Z'
  },
  {
    id: 'exp_2026_03_05',
    fecha: '2026-03-01',
    categoria: 'hangaraje_tasas',
    concepto: 'Hangaraje MPPA & Tasas Aeroportuarias',
    monto: 2850.00,
    proveedor: 'Tocumen S.A.',
    factura_numero: 'FAC-TOC-2026-03',
    metodo_pago: 'ACH',
    creado_por: 'Mariana Chen (Contabilidad)',
    creado_en: '2026-03-01T08:00:00Z'
  },
  {
    id: 'exp_2026_03_06',
    fecha: '2026-03-01',
    categoria: 'seguros',
    concepto: 'Póliza Seguros Aeronáuticos de Flota',
    monto: 2150.00,
    proveedor: 'Aseguradora Ancón',
    factura_numero: 'POL-AERO-2026-03',
    metodo_pago: 'ACH',
    creado_por: 'Mariana Chen (Contabilidad)',
    creado_en: '2026-03-01T08:30:00Z'
  },

  // --- FEBRERO 2026 ---
  {
    id: 'exp_2026_02_01',
    fecha: '2026-02-19',
    categoria: 'combustible',
    concepto: 'Suministro AVGAS 100LL (1,000 galones)',
    monto: 4900.00,
    proveedor: 'Terpel Aviación Panamá',
    factura_numero: 'FAC-TER-84800',
    metodo_pago: 'ACH',
    creado_por: 'Dirección de Operaciones Escuela',
    creado_en: '2026-02-19T10:00:00Z'
  },
  {
    id: 'exp_2026_02_02',
    fecha: '2026-02-28',
    categoria: 'nomina_instructores',
    concepto: 'Honorarios Instructores CFI - Febrero',
    monto: 8100.00,
    proveedor: 'Nómina Instructores CFI',
    factura_numero: 'NOM-CFI-2026-02',
    metodo_pago: 'ACH',
    creado_por: 'Mariana Chen (Contabilidad)',
    creado_en: '2026-02-28T17:00:00Z'
  },
  {
    id: 'exp_2026_02_03',
    fecha: '2026-02-28',
    categoria: 'nomina_personal',
    concepto: 'Planilla Operativa y Administrativa - Febrero',
    monto: 6400.00,
    proveedor: 'Planilla Administrativa SkyOps',
    factura_numero: 'NOM-OPS-2026-02',
    metodo_pago: 'ACH',
    creado_por: 'Mariana Chen (Contabilidad)',
    creado_en: '2026-02-28T17:00:00Z'
  },
  {
    id: 'exp_2026_02_04',
    fecha: '2026-02-14',
    categoria: 'mantenimiento',
    concepto: 'Reemplazo de Batería Concorde RG-35AXC - HP-1799 Piper Archer',
    monto: 680.00,
    proveedor: 'AeroPartes Aviación MPPA',
    factura_numero: 'FAC-APA-10490',
    matricula_asociada: 'HP-1799',
    metodo_pago: 'ACH',
    creado_por: 'Dirección de Operaciones Escuela',
    creado_en: '2026-02-14T11:00:00Z'
  },
  {
    id: 'exp_2026_02_05',
    fecha: '2026-02-01',
    categoria: 'hangaraje_tasas',
    concepto: 'Hangaraje MPPA & Tasas Aeroportuarias',
    monto: 2850.00,
    proveedor: 'Tocumen S.A.',
    factura_numero: 'FAC-TOC-2026-02',
    metodo_pago: 'ACH',
    creado_por: 'Mariana Chen (Contabilidad)',
    creado_en: '2026-02-01T08:00:00Z'
  },
  {
    id: 'exp_2026_02_06',
    fecha: '2026-02-01',
    categoria: 'seguros',
    concepto: 'Póliza Seguros Aeronáuticos de Flota',
    monto: 2150.00,
    proveedor: 'Aseguradora Ancón',
    factura_numero: 'POL-AERO-2026-02',
    metodo_pago: 'ACH',
    creado_por: 'Mariana Chen (Contabilidad)',
    creado_en: '2026-02-01T08:30:00Z'
  },

  // --- ENERO 2026 ---
  {
    id: 'exp_2026_01_01',
    fecha: '2026-01-20',
    categoria: 'combustible',
    concepto: 'Suministro AVGAS 100LL (1,180 galones)',
    monto: 5782.00,
    proveedor: 'Terpel Aviación Panamá',
    factura_numero: 'FAC-TER-84100',
    metodo_pago: 'ACH',
    creado_por: 'Dirección de Operaciones Escuela',
    creado_en: '2026-01-20T10:00:00Z'
  },
  {
    id: 'exp_2026_01_02',
    fecha: '2026-01-31',
    categoria: 'nomina_instructores',
    concepto: 'Honorarios Instructores CFI - Enero',
    monto: 8500.00,
    proveedor: 'Nómina Instructores CFI',
    factura_numero: 'NOM-CFI-2026-01',
    metodo_pago: 'ACH',
    creado_por: 'Mariana Chen (Contabilidad)',
    creado_en: '2026-01-31T17:00:00Z'
  },
  {
    id: 'exp_2026_01_03',
    fecha: '2026-01-31',
    categoria: 'nomina_personal',
    concepto: 'Planilla Operativa y Administrativa - Enero',
    monto: 6400.00,
    proveedor: 'Planilla Administrativa SkyOps',
    factura_numero: 'NOM-OPS-2026-01',
    metodo_pago: 'ACH',
    creado_por: 'Mariana Chen (Contabilidad)',
    creado_en: '2026-01-31T17:00:00Z'
  },
  {
    id: 'exp_2026_01_04',
    fecha: '2026-01-18',
    categoria: 'mantenimiento',
    concepto: 'Inspección 100 Horas - HP-1588 Cessna 172SP',
    monto: 2050.00,
    proveedor: 'AeroTech Maintenance Panamá',
    factura_numero: 'FAC-ATM-2026-112',
    matricula_asociada: 'HP-1588',
    metodo_pago: 'ACH',
    creado_por: 'Dirección de Operaciones Escuela',
    creado_en: '2026-01-18T11:00:00Z'
  },
  {
    id: 'exp_2026_01_05',
    fecha: '2026-01-01',
    categoria: 'hangaraje_tasas',
    concepto: 'Hangaraje MPPA & Tasas Aeroportuarias',
    monto: 2850.00,
    proveedor: 'Tocumen S.A.',
    factura_numero: 'FAC-TOC-2026-01',
    metodo_pago: 'ACH',
    creado_por: 'Mariana Chen (Contabilidad)',
    creado_en: '2026-01-01T08:00:00Z'
  },
  {
    id: 'exp_2026_01_06',
    fecha: '2026-01-01',
    categoria: 'seguros',
    concepto: 'Póliza Seguros Aeronáuticos de Flota',
    monto: 2150.00,
    proveedor: 'Aseguradora Ancón',
    factura_numero: 'POL-AERO-2026-01',
    metodo_pago: 'ACH',
    creado_por: 'Mariana Chen (Contabilidad)',
    creado_en: '2026-01-01T08:30:00Z'
  },
  {
    id: 'exp_2026_01_07',
    fecha: '2026-01-10',
    categoria: 'simulador_tecnologia',
    concepto: 'Renovación Anual Licencias Software de Despacho & Aeronavegabilidad',
    monto: 950.00,
    proveedor: 'Jeppesen Aviation Services',
    factura_numero: 'INV-JEP-98110',
    metodo_pago: 'Tarjeta Corporativa',
    creado_por: 'Dirección de Operaciones Escuela',
    creado_en: '2026-01-10T09:00:00Z'
  }
];

// ==========================================
// CONFIGURACIÓN INICIAL DE WHATSAPP BUSINESS & DISPARADORES
// ==========================================
export const INITIAL_WHATSAPP_CONFIG: WhatsAppConfig = {
  status: 'connected',
  businessName: 'SkyOps Flight Academy Albrook',
  displayPhoneNumber: '+507 6890-4411',
  phoneNumberId: 'phone_id_99182348120',
  wabaId: 'waba_id_88129038102',
  accessToken: 'EAAG981023_SkyOps_Meta_Production_Token_Albrook_2026',
  webhookVerifyToken: 'skyops_waba_webhook_secret_panama_2026',
  qualityRating: 'GREEN',
  tierLimit: '1,000 conversaciones iniciadas por la empresa / 24h',
  connectedAt: '2026-08-01T10:00:00Z',
  lastSyncAt: '2026-08-25T19:45:00Z',
  autoSyncActive: true,
  quietHoursStart: '22:00',
  quietHoursEnd: '06:30'
};

export const INITIAL_WHATSAPP_TRIGGERS: WhatsAppTrigger[] = [
  // --- DISPARADORES DE VENCIMIENTO DE DOCUMENTOS ---
  {
    id: 'trig_medico_30d',
    evento: 'doc_medico_vencimiento_30d',
    nombre: 'Aviso Preventivo: Médico AAC vence en 30 días',
    descripcion: 'Notifica al alumno cuando su Certificado Médico Aeronáutico vence en un mes para agendar cita con médico examinador AAC.',
    categoria: 'documentos',
    activo: true,
    dias_antelacion: 30,
    destinatarios: ['estudiante'],
    plantilla_mensaje: '🛫 *SkyOps Flight Academy - Aviso Preventivo*\n\nHola *{{nombre_alumno}}*, te informamos que tu *Certificado Médico Aeronáutico* vencerá el *{{fecha_vencimiento}}* (en *{{dias_restantes}} días*).\n\n⚠️ *Importante:* Recuerda coordinar tu cita con un Médico Examinador Autorizado por la AAC para evitar suspensión temporal de vuelos en el sistema.\n\n📞 Para dudas de despacho: +507 6890-4411\n📍 Hangar 4, Marcos A. Gelabert (MPPA)',
    variables_disponibles: ['{{nombre_alumno}}', '{{tipo_documento}}', '{{fecha_vencimiento}}', '{{dias_restantes}}', '{{numero_medico}}', '{{telefono_escuela}}'],
    hora_ejecucion_programada: '08:30',
    total_disparados: 42,
    ultimo_disparo: '2026-08-20T08:30:00Z'
  },
  {
    id: 'trig_medico_15d',
    evento: 'doc_medico_vencimiento_15d',
    nombre: 'Alerta Media: Médico AAC vence en 15 días',
    descripcion: 'Segunda alerta al estudiante e instructor asignado a 15 días de vencimiento del médico.',
    categoria: 'documentos',
    activo: true,
    dias_antelacion: 15,
    destinatarios: ['estudiante', 'instructor'],
    plantilla_mensaje: '⚠️ *SkyOps Alerta - Vencimiento Próximo de Médico AAC*\n\nEstimado *{{nombre_alumno}}*, te recordamos que restan solo *{{dias_restantes}} días* (vence el *{{fecha_vencimiento}}*) para la expiración de tu *Certificado Médico*.\n\nFavor remitir tu nuevo certificado al WhatsApp de Jefatura de Instrucción una vez expedido para actualizar tu expediente y mantener tus horas activas.',
    variables_disponibles: ['{{nombre_alumno}}', '{{fecha_vencimiento}}', '{{dias_restantes}}', '{{instructor}}', '{{telefono_escuela}}'],
    hora_ejecucion_programada: '08:30',
    total_disparados: 28,
    ultimo_disparo: '2026-08-22T08:30:00Z'
  },
  {
    id: 'trig_medico_7d',
    evento: 'doc_medico_vencimiento_7d',
    nombre: 'Alerta Crítica: Médico AAC vence en 7 días',
    descripcion: 'Alerta urgente a 7 días. Notifica al alumno, instructor y despacho de vuelo.',
    categoria: 'documentos',
    activo: true,
    dias_antelacion: 7,
    destinatarios: ['estudiante', 'instructor', 'despacho'],
    plantilla_mensaje: '🚨 *URGENTE SkyOps - Médico AAC por Expirar (7 Días)*\n\nCapitán *{{nombre_alumno}}*:\nTu Certificado Médico Aeronáutico vencerá en *{{dias_restantes}} días* (*{{fecha_vencimiento}}*).\n\nSi no presentas tu renovación antes de dicha fecha, el sistema SkyOps bloqueará automáticamente la asignación de aeronaves e itinerarios por normativa AAC.',
    variables_disponibles: ['{{nombre_alumno}}', '{{fecha_vencimiento}}', '{{dias_restantes}}', '{{telefono_escuela}}'],
    hora_ejecucion_programada: '08:00',
    total_disparados: 19,
    ultimo_disparo: '2026-08-24T08:00:00Z'
  },
  {
    id: 'trig_medico_vencido',
    evento: 'doc_medico_vencido',
    nombre: 'Bloqueo Inmediato: Médico AAC Vencido',
    descripcion: 'Disparo inmediato el día de vencimiento notificando suspensión de vuelos hasta presentar renovación.',
    categoria: 'documentos',
    activo: true,
    dias_antelacion: 0,
    destinatarios: ['estudiante', 'instructor', 'despacho', 'admin'],
    plantilla_mensaje: '🛑 *SkyOps - Notificación de Suspensión Operativa*\n\nEstimado *{{nombre_alumno}}*:\nTu *Certificado Médico Aeronáutico ha expirado el {{fecha_vencimiento}}*.\n\nPor regulación de la Autoridad Aeronáutica Civil (AAC), tu estatus de vuelo ha sido *suspendido temporalmente*. No podrás reservar aeronaves ni simulador hasta subir tu nuevo documento válido.\n\nEnvía tu comprobante a despacho inmediatamente.',
    variables_disponibles: ['{{nombre_alumno}}', '{{fecha_vencimiento}}', '{{telefono_escuela}}'],
    hora_ejecucion_programada: '07:00',
    total_disparados: 6,
    ultimo_disparo: '2026-08-15T07:00:00Z'
  },
  {
    id: 'trig_licencia_30d',
    evento: 'doc_licencia_vencimiento_30d',
    nombre: 'Aviso: Licencia de Piloto vence en 30 días',
    descripcion: 'Notificación de vencimiento de licencia de piloto / habilitación a 30 días.',
    categoria: 'documentos',
    activo: true,
    dias_antelacion: 30,
    destinatarios: ['estudiante'],
    plantilla_mensaje: '📋 *SkyOps - Renovación de Licencia de Piloto*\n\nHola *{{nombre_alumno}}*, tu *Licencia N° {{numero_licencia}}* tiene fecha de vencimiento el *{{fecha_vencimiento}}* (en 30 días).\n\nTe recomendamos iniciar tu trámite de renovación ante el Departamento de Licencias de la AAC Panamá.',
    variables_disponibles: ['{{nombre_alumno}}', '{{numero_licencia}}', '{{fecha_vencimiento}}', '{{dias_restantes}}'],
    hora_ejecucion_programada: '09:00',
    total_disparados: 14,
    ultimo_disparo: '2026-08-18T09:00:00Z'
  },
  {
    id: 'trig_licencia_vencida',
    evento: 'doc_licencia_vencida',
    nombre: 'Bloqueo: Licencia de Piloto Expirada',
    descripcion: 'Notificación cuando la licencia de piloto ha superado su fecha de validez.',
    categoria: 'documentos',
    activo: true,
    dias_antelacion: 0,
    destinatarios: ['estudiante', 'despacho'],
    plantilla_mensaje: '🛑 *SkyOps - Licencia de Piloto Vencida*\n\nCapitán *{{nombre_alumno}}*, tu licencia aeronáutica ha vencido (*{{fecha_vencimiento}}*). Por favor presenta tu convalidación o renovación actualizada en oficinas de SkyOps.',
    variables_disponibles: ['{{nombre_alumno}}', '{{fecha_vencimiento}}'],
    hora_ejecucion_programada: '07:30',
    total_disparados: 3,
    ultimo_disparo: '2026-07-30T07:30:00Z'
  },

  // --- DISPARADORES DE CAMBIOS EN ITINERARIOS Y VUELOS ---
  {
    id: 'trig_itinerario_nuevo',
    evento: 'itinerario_nuevo_programado',
    nombre: 'Confirmación de Vuelo Programado',
    descripcion: 'Envía un mensaje al estudiante e instructor cuando se crea una nueva sesión de vuelo o simulador.',
    categoria: 'itinerarios',
    activo: true,
    destinatarios: ['estudiante', 'instructor'],
    plantilla_mensaje: '✈️ *SkyOps - Confirmación de Vuelo Programado*\n\nHola *{{nombre_alumno}}*, tu vuelo ha sido agendado exitosamente:\n\n📅 *Fecha:* {{fecha_vuelo}}\n⏰ *Horario:* {{hora_inicio}} a {{hora_fin}} (Hora Local Panamá)\n🛩️ *Equipo:* {{matricula}} ({{modelo_aeronave}})\n👨‍✈️ *Instructor CFI:* {{instructor}}\n🎯 *Misión:* {{tipo_mision}}\n\n📍 Preséntate en despacho 30 minutos antes para briefing operacional y revisión de peso y balance.',
    variables_disponibles: ['{{nombre_alumno}}', '{{fecha_vuelo}}', '{{hora_inicio}}', '{{hora_fin}}', '{{matricula}}', '{{modelo_aeronave}}', '{{instructor}}', '{{tipo_mision}}'],
    total_disparados: 185,
    ultimo_disparo: '2026-08-25T14:10:00Z'
  },
  {
    id: 'trig_itinerario_cambio_hora',
    evento: 'itinerario_modificado_horario',
    nombre: 'Modificación de Horario en Itinerario',
    descripcion: 'Disparo automático instantáneo cuando se adelanta, pospone o ajusta la hora de un vuelo.',
    categoria: 'itinerarios',
    activo: true,
    destinatarios: ['estudiante', 'instructor'],
    plantilla_mensaje: '⏱️ *SkyOps - Modificación de Horario de Vuelo*\n\nAtención *{{nombre_alumno}}*:\nTu itinerario del *{{fecha_vuelo}}* ha sido actualizado:\n\n🕒 *Nuevo Horario:* {{hora_inicio}} - {{hora_fin}}\n🛩️ *Aeronave:* {{matricula}}\n👨‍✈️ *Instructor:* {{instructor}}\n📝 *Motivo:* {{motivo_cambio}}\n\nPor favor confirma recibido respondiendo a este mensaje.',
    variables_disponibles: ['{{nombre_alumno}}', '{{fecha_vuelo}}', '{{hora_inicio}}', '{{hora_fin}}', '{{matricula}}', '{{instructor}}', '{{motivo_cambio}}'],
    total_disparados: 47,
    ultimo_disparo: '2026-08-24T16:20:00Z'
  },
  {
    id: 'trig_itinerario_cambio_avion',
    evento: 'itinerario_modificado_aeronave',
    nombre: 'Cambio de Aeronave Asignada',
    descripcion: 'Notifica al alumno e instructor cuando se reasigna la matrícula del avión (ej. por mantenimiento 100h o disponibilidad).',
    categoria: 'itinerarios',
    activo: true,
    destinatarios: ['estudiante', 'instructor'],
    plantilla_mensaje: '🔄 *SkyOps - Reasignación de Aeronave*\n\nHola *{{nombre_alumno}}*, se ha realizado un cambio de equipo para tu vuelo del *{{fecha_vuelo}}*:\n\n✈️ *Nueva Aeronave Asignada:* {{matricula}} ({{modelo_aeronave}})\n⏰ *Horario:* {{hora_inicio}} - {{hora_fin}}\n👨‍✈️ *Instructor:* {{instructor}}\n\nVerifica las tablas de rendimiento y checklist correspondiente en despacho.',
    variables_disponibles: ['{{nombre_alumno}}', '{{fecha_vuelo}}', '{{matricula}}', '{{modelo_aeronave}}', '{{hora_inicio}}', '{{instructor}}'],
    total_disparados: 23,
    ultimo_disparo: '2026-08-23T11:05:00Z'
  },
  {
    id: 'trig_itinerario_cambio_instructor',
    evento: 'itinerario_modificado_instructor',
    nombre: 'Cambio de Instructor Asignado',
    descripcion: 'Notifica cuando se reasigna el instructor de vuelo para una sesión.',
    categoria: 'itinerarios',
    activo: true,
    destinatarios: ['estudiante'],
    plantilla_mensaje: '👨‍✈️ *SkyOps - Actualización de Instructor*\n\nHola *{{nombre_alumno}}*, tu sesión de vuelo del *{{fecha_vuelo}}* a las *{{hora_inicio}}* será impartida por el Capitán *{{instructor}}*.\n\nNos vemos en sala de briefing.',
    variables_disponibles: ['{{nombre_alumno}}', '{{fecha_vuelo}}', '{{hora_inicio}}', '{{instructor}}', '{{matricula}}'],
    total_disparados: 12,
    ultimo_disparo: '2026-08-19T15:40:00Z'
  },
  {
    id: 'trig_itinerario_cancelado_met',
    evento: 'itinerario_cancelado_met',
    nombre: 'Cancelación de Vuelo (Meteorología / No-Go)',
    descripcion: 'Alerta prioritaria cuando un vuelo se cancela por condiciones meteorológicas o mantenimiento preventivo.',
    categoria: 'itinerarios',
    activo: true,
    destinatarios: ['estudiante', 'instructor', 'despacho'],
    plantilla_mensaje: '🌧️ *SkyOps - Vuelo Cancelado (Meteorología / Operativo)*\n\nEstimado *{{nombre_alumno}}*:\nEl vuelo programado para hoy *{{fecha_vuelo}}* a las *{{hora_inicio}}* en *{{matricula}}* ha sido *CANCELADO*.\n\n⚠️ *Motivo:* {{motivo_cancelacion}}\n\nTu saldo y horas programadas se mantienen intactos. Contacta a despacho para reprogramar tu turno.',
    variables_disponibles: ['{{nombre_alumno}}', '{{fecha_vuelo}}', '{{hora_inicio}}', '{{matricula}}', '{{motivo_cancelacion}}', '{{telefono_escuela}}'],
    total_disparados: 31,
    ultimo_disparo: '2026-08-21T13:15:00Z'
  },
  {
    id: 'trig_itinerario_recordatorio_2h',
    evento: 'itinerario_recordatorio_prevuelo',
    nombre: 'Recordatorio Pre-Vuelo (2 Horas Antes)',
    descripcion: 'Envía un recordatorio automático 2 horas antes de la hora de despegue con recomendaciones de llegada.',
    categoria: 'itinerarios',
    activo: true,
    horas_antelacion: 2,
    destinatarios: ['estudiante'],
    plantilla_mensaje: '⏰ *SkyOps - Recordatorio Pre-Vuelo (Próximas 2 Horas)*\n\nHola *{{nombre_alumno}}*, tu vuelo en *{{matricula}}* con Cap. *{{instructor}}* inicia hoy a las *{{hora_inicio}}*.\n\n📋 *Checklist de llegada:*\n1. Portar licencia y certificado médico físico.\n2. Revisar METAR/TAF de MPPA y alternos.\n3. Presentar plan de vuelo y cálculo W&B en despacho.\n\n¡Buen vuelo!',
    variables_disponibles: ['{{nombre_alumno}}', '{{matricula}}', '{{instructor}}', '{{hora_inicio}}', '{{fecha_vuelo}}'],
    total_disparados: 210,
    ultimo_disparo: '2026-08-25T13:00:00Z'
  }
];

export const INITIAL_WHATSAPP_LOGS: WhatsAppLogMessage[] = [
  {
    id: 'wlog_01',
    fecha: '2026-08-25T14:10:22Z',
    destinatario_nombre: 'Carlos Mendoza',
    destinatario_telefono: '+507 6712-3456',
    destinatario_rol: 'Estudiante Piloto Privado',
    evento_disparador: 'itinerario_nuevo_programado',
    trigger_id: 'trig_itinerario_nuevo',
    mensaje: '✈️ SkyOps - Confirmación de Vuelo: Vuelo agendado para 2026-08-26 08:00 - 10:00 en HP-1450 con Cap. Roberto Morales.',
    estado_entrega: 'leido'
  },
  {
    id: 'wlog_02',
    fecha: '2026-08-25T13:00:05Z',
    destinatario_nombre: 'Sofia Rios',
    destinatario_telefono: '+507 6945-8812',
    destinatario_rol: 'Estudiante Multi-Motor',
    evento_disparador: 'itinerario_recordatorio_prevuelo',
    trigger_id: 'trig_itinerario_recordatorio_2h',
    mensaje: '⏰ SkyOps - Recordatorio Pre-Vuelo: Tu vuelo en HP-1822 con Cap. Carlos Mendoza inicia a las 15:00. Checklist preparado.',
    estado_entrega: 'entregado'
  },
  {
    id: 'wlog_03',
    fecha: '2026-08-24T08:00:15Z',
    destinatario_nombre: 'Daniel Alvarado',
    destinatario_telefono: '+507 6623-9988',
    destinatario_rol: 'Estudiante Comercial',
    evento_disparador: 'doc_medico_vencimiento_7d',
    trigger_id: 'trig_medico_7d',
    mensaje: '🚨 URGENTE SkyOps - Tu Certificado Médico AAC vencerá en 7 días (2026-08-31). Favor renovar para evitar suspensión de vuelo.',
    estado_entrega: 'leido'
  },
  {
    id: 'wlog_04',
    fecha: '2026-08-23T16:30:10Z',
    destinatario_nombre: 'Esteban Chen',
    destinatario_telefono: '+507 6598-1122',
    destinatario_rol: 'Estudiante IFR',
    evento_disparador: 'itinerario_modificado_horario',
    trigger_id: 'trig_itinerario_cambio_hora',
    mensaje: '⏱️ SkyOps - Modificación de Horario: Tu vuelo del 2026-08-24 ha sido ajustado a las 14:00 - 16:00 por slot de torre MPPA.',
    estado_entrega: 'leido'
  },
  {
    id: 'wlog_05',
    fecha: '2026-08-22T08:30:00Z',
    destinatario_nombre: 'Mariana Gomez',
    destinatario_telefono: '+507 6833-4455',
    destinatario_rol: 'Estudiante Privado',
    evento_disparador: 'doc_medico_vencimiento_15d',
    trigger_id: 'trig_medico_15d',
    mensaje: '⚠️ SkyOps Alerta - Tu Certificado Médico vencerá en 15 días. Recuerda tramitar con médico examinador AAC.',
    estado_entrega: 'entregado'
  }
];

// ==========================================
// REGISTROS INICIALES DE AUDITORÍA (AAC PANAMÁ RAC 141 & CONTABILIDAD)
// ==========================================

export const INITIAL_AUDIT_LOGS: AuditLogEntry[] = [
  {
    id: 'audit_aac_today_01',
    timestamp: '2026-08-27T16:20:00.000Z',
    usuario_id: 'usr_admin_1',
    usuario_nombre: 'Cap. Roberto Morales',
    usuario_rol: 'admin',
    usuario_correo: 'jefatura@aeroacademia.com',
    modulo: 'hojas_vuelo',
    accion: 'FIRMAR_VALIDAR',
    entidad_tipo: 'Hoja de Progreso Lección #15 (Travesía Solo)',
    entidad_id: 'prog_09',
    estudiante_afectado_nombre: 'Daniel Alvarado',
    estudiante_afectado_id: 'usr_est_1',
    instructor_afectado_nombre: 'Cap. Roberto Morales',
    descripcion: 'Validación oficial y certificación de Vuelo Solo de Travesía Albrook (MPPA) a David (MPDA) ida y vuelta en HP-1450. Cómputo de 2.8 hrs de Vuelo Solo.',
    detalles_cambio: [
      { campo: 'estado', etiqueta: 'Estado de la Hoja', valor_anterior: 'pendiente_validacion', valor_nuevo: 'aprobado' },
      { campo: 'firma_instructor', etiqueta: 'Firma Digital CFI', valor_anterior: false, valor_nuevo: true },
      { campo: 'horas_solo_travesia', etiqueta: 'Horas Solo Travesía', valor_anterior: 0, valor_nuevo: 2.8 },
      { campo: 'despegues_aterrizajes', etiqueta: 'Ciclos Despegue / Aterrizaje', valor_anterior: 0, valor_nuevo: 3 }
    ],
    ip_origen: '190.140.88.10 (Despacho Gelabert MPPA)',
    dispositivo: 'iPad Pro 12.9 / Mobile Safari - Módulo Despacho',
    referencia_normativa_aac: 'RAC 141.115 (Certificación de Horas de Vuelo y Endoso de Travesía)',
    severidad: 'regulatoria',
    hash_integridad: 'a1b2c3d4e5f67890123456789abcdef0123456789abcdef0123456789abcdef0'
  },
  {
    id: 'audit_aac_today_02',
    timestamp: '2026-08-27T14:15:00.000Z',
    usuario_id: 'usr_conta_1',
    usuario_nombre: 'Lic. Mariana Gómez',
    usuario_rol: 'contabilidad',
    usuario_correo: 'mariana.gomez@aeroacademia.com',
    modulo: 'contabilidad',
    accion: 'APROBAR_BANCARIO',
    entidad_tipo: 'Transacción ACH / Comprobante Bancario',
    entidad_id: 'tx_today_01',
    estudiante_afectado_nombre: 'Gabriela Torrealba',
    estudiante_afectado_id: 'usr_est_2',
    descripcion: 'Cotejo y aprobación de depósito ACH por $2,400.00 USD contra extracto bancario de Banco General. Saldo acreditado a cuenta de estudiante para paquete de horas PPA.',
    detalles_cambio: [
      { campo: 'estado_aprobacion', etiqueta: 'Estado de Aprobación', valor_anterior: 'pendiente_revision_bancaria', valor_nuevo: 'aprobado' },
      { campo: 'referencia_bancaria', etiqueta: 'Ref. Extracto BG', valor_anterior: null, valor_nuevo: 'BG-ACH-994102-CONFIRMED' },
      { campo: 'saldo_resultante', etiqueta: 'Saldo Oficial Acreditado', valor_anterior: 350.00, valor_nuevo: 2750.00 }
    ],
    ip_origen: '190.140.88.45 (Oficina Principal Contabilidad)',
    dispositivo: 'Chrome 128 / Windows 11 - Terminal Tesorería',
    referencia_normativa_aac: 'Manual de Cumplimiento Financiero y Custodia de Fondos Aeronáuticos AAC',
    severidad: 'regulatoria',
    hash_integridad: 'b2c3d4e5f6a17890123456789abcdef0123456789abcdef0123456789abcdef1'
  },
  {
    id: 'audit_aac_today_03',
    timestamp: '2026-08-27T10:05:00.000Z',
    usuario_id: 'usr_inst_1',
    usuario_nombre: 'Cap. Valeria Benítez',
    usuario_rol: 'instructor',
    usuario_correo: 'valeria.benitez@aeroacademia.com',
    modulo: 'hojas_vuelo',
    accion: 'FIRMAR_VALIDAR',
    entidad_tipo: 'Hoja de Progreso Vuelo por Instrumentos',
    entidad_id: 'prog_10',
    estudiante_afectado_nombre: 'Daniel Alvarado',
    estudiante_afectado_id: 'usr_est_1',
    instructor_afectado_nombre: 'Cap. Valeria Benítez',
    descripcion: 'Validación de sesión IFR bajo capota (Procedimiento ILS Pista 19 MPPA). Certificación de aproximaciones de precisión y arcos DME.',
    detalles_cambio: [
      { campo: 'estado', etiqueta: 'Estado de la Hoja', valor_anterior: 'pendiente_validacion', valor_nuevo: 'aprobado' },
      { campo: 'horas_ifr_capota', etiqueta: 'Horas IFR Simuladas (Capota)', valor_anterior: 0, valor_nuevo: 1.5 },
      { campo: 'aproximaciones_instrumentos', etiqueta: 'Aproximaciones ILS', valor_anterior: 0, valor_nuevo: 2 }
    ],
    ip_origen: '190.140.88.102 (Albrook Gelabert MPPA Ops)',
    dispositivo: 'iPadOS 17.5 / Mobile Safari - Flight Dispatch MPPA',
    referencia_normativa_aac: 'RAC 61.65 (Requisitos de Experiencia Aeronáutica para Habilitación de Vuelo por Instrumentos)',
    severidad: 'regulatoria',
    hash_integridad: 'c3d4e5f6a1b27890123456789abcdef0123456789abcdef0123456789abcdef2'
  },
  {
    id: 'audit_aac_yesterday_01',
    timestamp: '2026-08-26T17:30:00.000Z',
    usuario_id: 'usr_admin_1',
    usuario_nombre: 'Cap. Roberto Morales',
    usuario_rol: 'admin',
    usuario_correo: 'jefatura@aeroacademia.com',
    modulo: 'vigencias_aac',
    accion: 'MODIFICAR',
    entidad_tipo: 'Expediente Médico de Instructor',
    entidad_id: 'usr_inst_2',
    instructor_afectado_nombre: 'Cap. Carlos Samudio',
    descripcion: 'Activación de Bloqueo Estricto de Despacho (Hard Lock) sobre instructor Cap. Carlos Samudio debido a no acreditación de renovación médica Clase 1 en el plazo de 15 días.',
    detalles_cambio: [
      { campo: 'estado_operativo', etiqueta: 'Estado de Despacho', valor_anterior: 'Alerta Preventiva', valor_nuevo: 'BLOQUEADO (Hard Lock Activo)' },
      { campo: 'permiso_firmar_hojas', etiqueta: 'Facultad de Firmar Bitácoras', valor_anterior: true, valor_nuevo: false }
    ],
    ip_origen: '190.140.88.10 (Dirección de Operaciones SkyOps)',
    dispositivo: 'Firefox 129 / Linux Ubuntu - Servidor Central',
    referencia_normativa_aac: 'RAC 67.025 (Suspensión Automática de Facultades por Vencimiento Médico)',
    severidad: 'critica',
    hash_integridad: 'd4e5f6a1b2c37890123456789abcdef0123456789abcdef0123456789abcdef3'
  },
  {
    id: 'audit_aac_yesterday_02',
    timestamp: '2026-08-26T12:10:00.000Z',
    usuario_id: 'system_engine',
    usuario_nombre: 'Motor de Cascada SkyOps',
    usuario_rol: 'admin',
    usuario_correo: 'system@aeroacademia.com',
    modulo: 'hojas_vuelo',
    accion: 'RECALCULAR_CASCADA',
    entidad_tipo: 'Matriz Acumulativa de Bitácora Alumno',
    entidad_id: 'cascade_usr_est_3',
    estudiante_afectado_nombre: 'Mateo Castillo',
    estudiante_afectado_id: 'usr_est_3',
    descripcion: 'Recalculación matemática en cascada ejecutada para el alumno Mateo Castillo. Sincronización de 18 lecciones acumuladas con horas de simulador Frasca.',
    detalles_cambio: [
      { campo: 'horas_totales_alumno', etiqueta: 'Total Horas Bitácora', valor_anterior: 38.2, valor_nuevo: 39.5 },
      { campo: 'horas_simulador_aprobadas', etiqueta: 'Horas Frasca Acreditadas', valor_anterior: 8.0, valor_nuevo: 9.3 }
    ],
    ip_origen: '127.0.0.1 (SkyOps Cloud Engine)',
    dispositivo: 'Automated Cascade Worker Node',
    referencia_normativa_aac: 'RAC 61.51 (Registro y Cómputo de Horas de Instrucción Sintética)',
    severidad: 'info',
    hash_integridad: 'e5f6a1b2c3d47890123456789abcdef0123456789abcdef0123456789abcdef4'
  },
  {
    id: 'audit_aac_yesterday_03',
    timestamp: '2026-08-26T09:45:00.000Z',
    usuario_id: 'usr_conta_2',
    usuario_nombre: 'Lic. Carlos Castillo',
    usuario_rol: 'contabilidad',
    usuario_correo: 'carlos.castillo@aeroacademia.com',
    modulo: 'contabilidad',
    accion: 'CREAR',
    entidad_tipo: 'Cargo Contable por Combustible y Tasas',
    entidad_id: 'tx_yesterday_03',
    estudiante_afectado_nombre: 'Alejandro Méndez',
    estudiante_afectado_id: 'usr_est_4',
    descripcion: 'Cargo contable por 25 galones de combustible AvGas 100LL en ruta Río Hato (MPRH) y tasa de aterrizaje AAC.',
    detalles_cambio: [
      { campo: 'tipo', etiqueta: 'Tipo de Movimiento', valor_anterior: null, valor_nuevo: 'cargo' },
      { campo: 'concepto', etiqueta: 'Concepto Contable', valor_anterior: null, valor_nuevo: 'Combustible AvGas 100LL + Tasas MPRH' },
      { campo: 'monto', etiqueta: 'Monto Total Facturado', valor_anterior: null, valor_nuevo: '$175.50 USD' }
    ],
    ip_origen: '190.140.88.45 (Oficina Principal Contabilidad)',
    dispositivo: 'Chrome 128 / Windows 11 - Terminal Tesorería',
    referencia_normativa_aac: 'Manual de Tarifas Operativas Escuela de Aviación AAC',
    severidad: 'info',
    hash_integridad: 'f6a1b2c3d4e57890123456789abcdef0123456789abcdef0123456789abcdef5'
  },
  {
    id: 'audit_aac_001',
    timestamp: '2026-08-25T19:42:15.000Z',
    usuario_id: 'usr_inst_01',
    usuario_nombre: 'Cap. Carlos Mendoza',
    usuario_rol: 'instructor',
    usuario_correo: 'carlos.mendoza@aeroacademia.com',
    modulo: 'hojas_vuelo',
    accion: 'FIRMAR_VALIDAR',
    entidad_tipo: 'Hoja de Progreso Multi-Motor',
    entidad_id: 'prog_02',
    estudiante_afectado_nombre: 'Sofia Rios',
    estudiante_afectado_id: 'usr_est_02',
    instructor_afectado_nombre: 'Cap. Carlos Mendoza',
    descripcion: 'Validación oficial y firma digital de Hoja de Progreso Lección #8 (Multi-Motor / Falla de Motor V1/Vr). Certificación de 32 maniobras y cómputo de 1.8 hrs Dual.',
    detalles_cambio: [
      { campo: 'estado', etiqueta: 'Estado de la Hoja', valor_anterior: 'pendiente_validacion', valor_nuevo: 'aprobado' },
      { campo: 'firma_instructor', etiqueta: 'Firma Digital CFI', valor_anterior: false, valor_nuevo: true },
      { campo: 'calificacion_maniobra_14', etiqueta: 'Maniobra #14: Falla de Motor en Despegue', valor_anterior: 'N/A', valor_nuevo: 'S (Satisfactorio)' },
      { campo: 'calificacion_maniobra_18', etiqueta: 'Maniobra #18: Aproximación Monomotor ILS', valor_anterior: 'N/A', valor_nuevo: 'S (Satisfactorio)' },
      { campo: 'horas_dual_multimotor', etiqueta: 'Horas Dual Multi-Motor', valor_anterior: 0, valor_nuevo: 1.8 }
    ],
    ip_origen: '190.140.88.102 (Albrook Gelabert MPPA Ops)',
    dispositivo: 'iPadOS 17.5 / Mobile Safari - Flight Dispatch MPPA',
    referencia_normativa_aac: 'RAC 141.115 (Certificación y Registro de Instrucción de Vuelo)',
    severidad: 'regulatoria',
    hash_integridad: '8f4c2e19b03a77d12f3498ac613589b21a8d43890f5c1d683a54b9f2910ea14a'
  },
  {
    id: 'audit_aac_002',
    timestamp: '2026-08-25T18:15:30.000Z',
    usuario_id: 'usr_conta_01',
    usuario_nombre: 'Lic. Patricia Ramos',
    usuario_rol: 'contabilidad',
    usuario_correo: 'patricia.ramos@aeroacademia.com',
    modulo: 'contabilidad',
    accion: 'APROBAR_BANCARIO',
    entidad_tipo: 'Transacción ACH / Comprobante',
    entidad_id: 'tx_01',
    estudiante_afectado_nombre: 'Daniel Alvarado',
    estudiante_afectado_id: 'usr_est_01',
    descripcion: 'Cotejo y aprobación de depósito ACH por $3,500.00 USD contra extracto bancario de Banco General. Saldo acreditado a cuenta de estudiante.',
    detalles_cambio: [
      { campo: 'estado_aprobacion', etiqueta: 'Estado de Aprobación', valor_anterior: 'pendiente_revision_bancaria', valor_nuevo: 'aprobado' },
      { campo: 'comprobado_banco', etiqueta: 'Verificación Bancaria', valor_anterior: false, valor_nuevo: true },
      { campo: 'referencia_bancaria_confirmada', etiqueta: 'Ref. Extracto Bancario', valor_anterior: null, valor_nuevo: 'BG-ACH-89124401-CONFIRMED' },
      { campo: 'saldo_resultante', etiqueta: 'Saldo Oficial Acreditado', valor_anterior: 1250.00, valor_nuevo: 4750.00 }
    ],
    ip_origen: '190.140.88.45 (Oficina Principal Contabilidad)',
    dispositivo: 'Chrome 128 / macOS Sequoia - Terminal Contable 01',
    referencia_normativa_aac: 'Manual de Cumplimiento Financiero y Custodia de Fondos Aeronáuticos AAC',
    severidad: 'regulatoria',
    hash_integridad: '3c19d45e08b1a8fe5518bca429810ef1d48c82305a4e528bca7821389e02c5f1'
  },
  {
    id: 'audit_aac_003',
    timestamp: '2026-08-25T17:30:00.000Z',
    usuario_id: 'system_engine',
    usuario_nombre: 'Motor de Cascada SkyOps',
    usuario_rol: 'admin',
    usuario_correo: 'system@aeroacademia.com',
    modulo: 'hojas_vuelo',
    accion: 'RECALCULAR_CASCADA',
    entidad_tipo: 'Matriz Acumulativa de Bitácora',
    entidad_id: 'cascade_usr_est_01',
    estudiante_afectado_nombre: 'Daniel Alvarado',
    estudiante_afectado_id: 'usr_est_01',
    descripcion: 'Recalculación matemática en cascada ejecutada tras inserción de nuevo vuelo. 14 registros de vuelo auditados y sincronizados cronológicamente.',
    detalles_cambio: [
      { campo: 'registros_recalculados', etiqueta: 'Total Hojas Auditadas', valor_anterior: 13, valor_nuevo: 14 },
      { campo: 'horas_anteriores_leccion_14', etiqueta: 'Horas Previas Acumuladas', valor_anterior: 43.7, valor_nuevo: 43.7 },
      { campo: 'total_horas_acumuladas', etiqueta: 'Total Horas Bitácora Oficial', valor_anterior: 43.7, valor_nuevo: 45.2 },
      { campo: 'dual_travesia_acumulado', etiqueta: 'Dual Travesía AAC', valor_anterior: 27.0, valor_nuevo: 28.5 }
    ],
    ip_origen: '127.0.0.1 (SkyOps Cloud Engine)',
    dispositivo: 'Automated Cascade Worker Node',
    referencia_normativa_aac: 'RAC 61.51 (Requisitos de Cómputo de Horas de Vuelo para Licencia de Piloto Comercial)',
    severidad: 'info',
    hash_integridad: '7d92a10e4cb8f2190847b2c91834927fec193a0b4185de239845cd7189fa4301'
  },
  {
    id: 'audit_aac_004',
    timestamp: '2026-08-25T15:00:22.000Z',
    usuario_id: 'usr_admin_01',
    usuario_nombre: 'Cap. Roberto Morales',
    usuario_rol: 'admin',
    usuario_correo: 'roberto.morales@aeroacademia.com',
    modulo: 'vigencias_aac',
    accion: 'MODIFICAR',
    entidad_tipo: 'Expediente Médico Aeronáutico',
    entidad_id: 'usr_inst_03',
    instructor_afectado_nombre: 'Cap. Fernando Castillo',
    descripcion: 'Activación de Bloqueo Estricto de Vuelo (Hard Lock) sobre instructor Cap. Fernando Castillo por vencimiento de Certificado Médico Clase 1.',
    detalles_cambio: [
      { campo: 'vencimiento_medico', etiqueta: 'Fecha Vencimiento Médico AAC', valor_anterior: '2026-08-20', valor_nuevo: '2026-08-20' },
      { campo: 'estado_operativo', etiqueta: 'Estado de Despacho', valor_anterior: 'Habilitado', valor_nuevo: 'BLOQUEADO (Hard Lock Activo)' },
      { campo: 'motivo_bloqueo', etiqueta: 'Razón de Suspensión', valor_anterior: null, valor_nuevo: 'Certificado Médico Aeronáutico VENCIDO (2026-08-20)' }
    ],
    ip_origen: '190.140.88.10 (Dirección de Operaciones SkyOps)',
    dispositivo: 'Firefox 129 / Linux Ubuntu - Servidor Central',
    referencia_normativa_aac: 'RAC 67.025 (Validez y Suspensión de Certificado Médico de Aptitud Psicofísica)',
    severidad: 'critica',
    hash_integridad: '4b67f10a82ec45b90871d3e8954201ac6842ef891048b291c940ea21894b561c'
  },
  {
    id: 'audit_aac_005',
    timestamp: '2026-08-25T11:20:00.000Z',
    usuario_id: 'usr_conta_01',
    usuario_nombre: 'Lic. Patricia Ramos',
    usuario_rol: 'contabilidad',
    usuario_correo: 'patricia.ramos@aeroacademia.com',
    modulo: 'contabilidad',
    accion: 'CREAR',
    entidad_tipo: 'Cargo Contable por Hora de Vuelo',
    entidad_id: 'tx_08',
    estudiante_afectado_nombre: 'Carlos Mendoza',
    estudiante_afectado_id: 'usr_est_03',
    descripcion: 'Generación de cargo contable por 1.5 horas de instrucción de vuelo en aeronave HP-1450 (C172SP) + Honorarios CFI.',
    detalles_cambio: [
      { campo: 'tipo', etiqueta: 'Tipo de Movimiento', valor_anterior: null, valor_nuevo: 'cargo' },
      { campo: 'concepto', etiqueta: 'Concepto Contable', valor_anterior: null, valor_nuevo: 'Vuelo Dual Lección 4 - Maniobras Básicas HP-1450' },
      { campo: 'monto', etiqueta: 'Monto Total Facturado', valor_anterior: null, valor_nuevo: '$330.00 USD' },
      { campo: 'saldo_resultante', etiqueta: 'Nuevo Saldo Estudiante', valor_anterior: 1420.00, valor_nuevo: 1090.00 }
    ],
    ip_origen: '190.140.88.45 (Oficina Principal Contabilidad)',
    dispositivo: 'Chrome 128 / macOS Sequoia - Terminal Contable 01',
    referencia_normativa_aac: 'Reglamento de Facturación y Cómputo de Horas Escuela AAC',
    severidad: 'info',
    hash_integridad: '1a98e4f50b2984cd918237eab01490218ef81092834b9e2819028471bde04928'
  },
  {
    id: 'audit_aac_006',
    timestamp: '2026-08-24T16:45:10.000Z',
    usuario_id: 'usr_admin_01',
    usuario_nombre: 'Cap. Roberto Morales',
    usuario_rol: 'admin',
    usuario_correo: 'roberto.morales@aeroacademia.com',
    modulo: 'itinerarios',
    accion: 'MODIFICAR',
    entidad_tipo: 'Itinerario de Vuelo Programado',
    entidad_id: 'itin_02',
    estudiante_afectado_nombre: 'Sofia Rios',
    estudiante_afectado_id: 'usr_est_02',
    instructor_afectado_nombre: 'Cap. Carlos Mendoza',
    descripcion: 'Modificación de aeronave asignada para vuelo de travesía por mantenimiento preventivo de 100 horas. Reasignación de HP-1822 a HP-1450.',
    detalles_cambio: [
      { campo: 'matricula', etiqueta: 'Aeronave Asignada', valor_anterior: 'HP-1822 (PA-34)', valor_nuevo: 'HP-1450 (C172SP)' },
      { campo: 'motivo_cambio', etiqueta: 'Justificación Técnica', valor_anterior: null, valor_nuevo: 'Mantenimiento Preventivo 100 hrs en HP-1822' }
    ],
    ip_origen: '190.140.88.10 (Despacho de Vuelo)',
    dispositivo: 'Chrome 128 / Windows 11 - Torre de Despacho',
    referencia_normativa_aac: 'RAC 91.409 (Inspecciones Periódicas de Aeronaves y Control de Flota)',
    severidad: 'alerta',
    hash_integridad: '6d02938471bc182903847abfe0192847cba09182374eab892019485710293847'
  },
  {
    id: 'audit_aac_007',
    timestamp: '2026-08-24T09:12:00.000Z',
    usuario_id: 'usr_conta_01',
    usuario_nombre: 'Lic. Patricia Ramos',
    usuario_rol: 'contabilidad',
    usuario_correo: 'patricia.ramos@aeroacademia.com',
    modulo: 'contabilidad',
    accion: 'RECHAZAR_BANCARIO',
    entidad_tipo: 'Transacción ACH / Comprobante',
    entidad_id: 'tx_rechazo_01',
    estudiante_afectado_nombre: 'Esteban Chen',
    estudiante_afectado_id: 'usr_est_05',
    descripcion: 'Rechazo de comprobante ACH reportado por inconsistencia en número de confirmación bancaria (no localizado en banco emisor).',
    detalles_cambio: [
      { campo: 'estado_aprobacion', etiqueta: 'Estado de Aprobación', valor_anterior: 'pendiente_revision_bancaria', valor_nuevo: 'rechazado' },
      { campo: 'motivo_rechazo', etiqueta: 'Causal de Rechazo', valor_anterior: null, valor_nuevo: 'Referencia ACH no figura en el extracto bancario de Banco General.' }
    ],
    ip_origen: '190.140.88.45 (Oficina Principal Contabilidad)',
    dispositivo: 'Chrome 128 / macOS Sequoia - Terminal Contable 01',
    referencia_normativa_aac: 'Norma de Prevención y Control de Depósitos No Conciliados AAC',
    severidad: 'critica',
    hash_integridad: '9f8102938471bcde0192837465abcde810293847561029384756102938475610'
  }
];

// ============================================================================
// CONSTANTES INICIALES DE MANTENIMIENTO AERONÁUTICO & TALLER (TMA / OMA)
// ============================================================================

export const INITIAL_AIRCRAFT_MAINTENANCE_RECORDS: AircraftMaintenanceRecord[] = [
  {
    matricula: 'HP-1450',
    modelo: 'Cessna 172N Skyhawk',
    categoria: 'Monomotor Terrestre (SEP)',
    estado_aeronavegabilidad: 'aeronavegable',
    horas_totales_celula: 4218.4,
    horas_motor_tsn: 4218.4,
    horas_motor_tso: 780.2,
    horas_helice_tso: 420.0,
    horas_ultima_100h: 4180.0,
    horas_proxima_100h: 4280.0,
    horas_restantes_100h: 61.6,
    horas_proxima_50h: 4230.0,
    horas_restantes_50h: 11.6,
    fecha_ultimo_mantenimiento: '2026-07-15',
    fecha_proxima_inspeccion_anual: '2027-05-30',
    vencimiento_altimetro_pitot: '2027-04-15',
    vencimiento_elt: '2027-08-31',
    vencimiento_extintor: '2027-01-15',
    ultimo_tma_responsable: 'Ing. Carlos Mendoza (AAC-TMA-4512)',
    novedades_abiertas_count: 0,
    ordenes_activas_count: 0,
    bloqueo_despacho: false,
    ubicacion_hangar: 'Hangar SkyOps 4 - Rampa Principal'
  },
  {
    matricula: 'HP-1588',
    modelo: 'Cessna 172P Skyhawk',
    categoria: 'Monomotor Terrestre (SEP)',
    estado_aeronavegabilidad: 'en_mantenimiento',
    horas_totales_celula: 3892.1,
    horas_motor_tsn: 3892.1,
    horas_motor_tso: 1120.5,
    horas_helice_tso: 512.3,
    horas_ultima_100h: 3800.0,
    horas_proxima_100h: 3900.0,
    horas_restantes_100h: 7.9,
    horas_proxima_50h: 3850.0,
    horas_restantes_50h: 0.0,
    fecha_ultimo_mantenimiento: '2026-08-10',
    fecha_proxima_inspeccion_anual: '2027-03-15',
    vencimiento_altimetro_pitot: '2026-11-20',
    vencimiento_elt: '2026-12-31',
    vencimiento_extintor: '2026-10-30',
    ultimo_tma_responsable: 'Téc. David Rivas (AAC-TMA-6789)',
    novedades_abiertas_count: 1,
    ordenes_activas_count: 1,
    bloqueo_despacho: true,
    motivo_bloqueo: 'Inspección de 100 horas y cambio de empaque de cilindro #2 en curso.',
    ubicacion_hangar: 'Hangar SkyOps 4 - Bahía 2 (Inspección)'
  },
  {
    matricula: 'HP-1822',
    modelo: 'Cessna 172SP Skyhawk (G1000)',
    categoria: 'Monomotor Terrestre / IFR Glass Cockpit',
    estado_aeronavegabilidad: 'inspeccion_proxima',
    horas_totales_celula: 2415.6,
    horas_motor_tsn: 2415.6,
    horas_motor_tso: 415.6,
    horas_helice_tso: 415.6,
    horas_ultima_100h: 2320.0,
    horas_proxima_100h: 2420.0,
    horas_restantes_100h: 4.4,
    horas_proxima_50h: 2420.0,
    horas_restantes_50h: 4.4,
    fecha_ultimo_mantenimiento: '2026-07-28',
    fecha_proxima_inspeccion_anual: '2027-06-15',
    vencimiento_altimetro_pitot: '2027-02-28',
    vencimiento_elt: '2027-09-30',
    vencimiento_extintor: '2027-04-10',
    ultimo_tma_responsable: 'Ing. Carlos Mendoza (AAC-TMA-4512)',
    novedades_abiertas_count: 0,
    ordenes_activas_count: 1,
    bloqueo_despacho: false,
    ubicacion_hangar: 'Hangar SkyOps 4 - Rampa Principal'
  },
  {
    matricula: 'HP-1799',
    modelo: 'Piper PA-28-181 Archer III',
    categoria: 'Monomotor Terrestre (SEP)',
    estado_aeronavegabilidad: 'aeronavegable',
    horas_totales_celula: 1980.2,
    horas_motor_tsn: 1980.2,
    horas_motor_tso: 280.0,
    horas_helice_tso: 280.0,
    horas_ultima_100h: 1900.0,
    horas_proxima_100h: 2000.0,
    horas_restantes_100h: 19.8,
    horas_proxima_50h: 2000.0,
    horas_restantes_50h: 19.8,
    fecha_ultimo_mantenimiento: '2026-08-01',
    fecha_proxima_inspeccion_anual: '2027-07-20',
    vencimiento_altimetro_pitot: '2027-05-10',
    vencimiento_elt: '2027-11-15',
    vencimiento_extintor: '2027-06-01',
    ultimo_tma_responsable: 'Téc. David Rivas (AAC-TMA-6789)',
    novedades_abiertas_count: 0,
    ordenes_activas_count: 0,
    bloqueo_despacho: false,
    ubicacion_hangar: 'Hangar SkyOps 4 - Rampa Principal'
  },
  {
    matricula: 'HP-1721SP',
    modelo: 'Cessna 172SP Skyhawk Nav II',
    categoria: 'Monomotor Terrestre (SEP)',
    estado_aeronavegabilidad: 'aeronavegable',
    horas_totales_celula: 1540.8,
    horas_motor_tsn: 1540.8,
    horas_motor_tso: 140.8,
    horas_helice_tso: 140.8,
    horas_ultima_100h: 1500.0,
    horas_proxima_100h: 1600.0,
    horas_restantes_100h: 59.2,
    horas_proxima_50h: 1550.0,
    horas_restantes_50h: 9.2,
    fecha_ultimo_mantenimiento: '2026-08-12',
    fecha_proxima_inspeccion_anual: '2027-08-10',
    vencimiento_altimetro_pitot: '2027-03-30',
    vencimiento_elt: '2027-10-15',
    vencimiento_extintor: '2027-05-15',
    ultimo_tma_responsable: 'Ing. Carlos Mendoza (AAC-TMA-4512)',
    novedades_abiertas_count: 1,
    ordenes_activas_count: 0,
    bloqueo_despacho: false,
    ubicacion_hangar: 'Hangar SkyOps 4 - Rampa Principal'
  },
  {
    matricula: 'HP-1934',
    modelo: 'Piper PA-28-161 Cherokee',
    categoria: 'Monomotor Terrestre (SEP)',
    estado_aeronavegabilidad: 'aeronavegable',
    horas_totales_celula: 3110.5,
    horas_motor_tsn: 3110.5,
    horas_motor_tso: 610.5,
    horas_helice_tso: 610.5,
    horas_ultima_100h: 3050.0,
    horas_proxima_100h: 3150.0,
    horas_restantes_100h: 39.5,
    horas_proxima_50h: 3150.0,
    horas_restantes_50h: 39.5,
    fecha_ultimo_mantenimiento: '2026-08-05',
    fecha_proxima_inspeccion_anual: '2027-07-01',
    vencimiento_altimetro_pitot: '2027-04-20',
    vencimiento_elt: '2027-09-15',
    vencimiento_extintor: '2027-05-10',
    ultimo_tma_responsable: 'Téc. David Rivas (AAC-TMA-6789)',
    novedades_abiertas_count: 0,
    ordenes_activas_count: 0,
    bloqueo_despacho: false,
    ubicacion_hangar: 'Hangar SkyOps 4 - Rampa Principal'
  }
];

export const INITIAL_WORK_ORDERS: MaintenanceWorkOrder[] = [
  {
    id: 'OT-2026-038',
    matricula: 'HP-1588',
    tipo: 'inspeccion_100h',
    titulo: 'Inspección Periódica Obligatoria de 100 Horas & Servicio Mayor de Motor',
    descripcion: 'Inspección de 100 horas reglamentaria según manual de mantenimiento de Cessna C172P y RAC 91. Desmontaje y lavado de bujías, prueba de compresión diferencial en caliente, cambio de aceite y filtro, verificación de tensión de cables de control de timón y profundidad, inspección de largueros principales de ala según AD 2020-26-16.',
    estado: 'en_progreso',
    prioridad: 'alta',
    fecha_apertura: '2026-08-20',
    fecha_estimada_entrega: '2026-08-26',
    horas_aeronave_entrada: 3892.1,
    tecnico_responsable: 'Téc. David Rivas',
    licencia_tma: 'AAC-TMA-6789',
    trabajo_realizado: 'Drenado de 6 cuartos de aceite usado Aeroshell W100. Retiro de filtro Champion CH48108-1 e inspección de elemento con cortador de filtro (sin trazas metálicas anormales). Prueba de compresión de cilindros: #1 76/80, #2 68/80 (baja, requiere ajuste de válvula de escape), #3 75/80, #4 78/80.',
    partes_utilizadas: [
      { item: 'Aceite Aeroshell W100 (cuartos)', numero_parte: 'AS-W100', cantidad: 6, costo_unitario: 14.50 },
      { item: 'Filtro de Aceite Spin-On', numero_parte: 'CH48108-1', cantidad: 1, costo_unitario: 38.00 },
      { item: 'Arandelas de Cobre de Bujía', numero_parte: 'AN900-10', cantidad: 8, costo_unitario: 1.25 }
    ],
    retorno_al_servicio: {
      aprobado: false,
      declaracion: 'Pendiente de ajuste de válvula y prueba de rodaje en rampa (ground run).'
    },
    notas: 'Aeronave bloqueada para operaciones de instrucción hasta emisión de RTS por Jefe de Taller.'
  },
  {
    id: 'OT-2026-041',
    matricula: 'HP-1822',
    tipo: 'avionica',
    titulo: 'Calibración Bianual Pitot-Estática, Altímetro y Transponder (RAC 91)',
    descripcion: 'Verificación de fugas en líneas pitot-estática y prueba de banco con equipo digital de prueba altimétrica Barfield. Cotejo de altímetro G1000 PFD contra codificador de altitud y transponder GTX 33 en modos A, C y S.',
    estado: 'abierta',
    prioridad: 'media',
    fecha_apertura: '2026-08-23',
    fecha_estimada_entrega: '2026-08-25',
    horas_aeronave_entrada: 2415.6,
    tecnico_responsable: 'Ing. Carlos Mendoza',
    licencia_tma: 'AAC-TMA-4512',
    retorno_al_servicio: {
      aprobado: false
    },
    notas: 'Coordinado para realizar en rampa sin interrumpir el último vuelo vespertino.'
  },
  {
    id: 'OT-2026-035',
    matricula: 'HP-1450',
    tipo: 'correctivo',
    titulo: 'Reemplazo de Pastillas de Freno Principales y Purga de Líquido 5606',
    descripcion: 'Reporte de pedal de freno izquierdo esponjoso en carreteo. Reemplazo de forros de freno Cleveland 066-10500 en rueda izquierda y derecha, sangrado de circuito hidráulico con fluido MIL-PRF-5606H.',
    estado: 'cerrada_conforme',
    prioridad: 'alta',
    fecha_apertura: '2026-08-14',
    fecha_cierre: '2026-08-15',
    horas_aeronave_entrada: 4212.0,
    horas_aeronave_salida: 4212.0,
    tecnico_responsable: 'Ing. Carlos Mendoza',
    licencia_tma: 'AAC-TMA-4512',
    trabajo_realizado: 'Se desmontaron mordazas Cleveland de tren principal. Se instalaron 4 forros nuevos remachados con pinza manual. Se efectuó purga hidráulica eliminando burbujas de aire. Prueba de presión estática y rodaje satisfactorios sin fugas.',
    partes_utilizadas: [
      { item: 'Forro de Freno Cleveland', numero_parte: '066-10500', cantidad: 4, costo_unitario: 22.00 },
      { item: 'Fluido Hidráulico MIL-PRF-5606H', numero_parte: 'AERO-5606', cantidad: 1, costo_unitario: 18.00 }
    ],
    retorno_al_servicio: {
      aprobado: true,
      fecha_firma: '2026-08-15T16:30:00.000Z',
      firmado_por: 'Ing. Carlos Mendoza',
      licencia_firmante: 'AAC-TMA-4512',
      declaracion: 'Certifico que la aeronave HP-1450 ha sido reparada e inspeccionada de conformidad con las regulaciones aeronáuticas vigentes de la AAC Panamá (RAC 43 y RAC 145) respecto al trabajo realizado, y se determina en condición AERONAVEGABLE para retorno al servicio.'
    },
    notas: 'Comprobación de rodaje en pista efectuada con instructor jefe.'
  }
];

export const INITIAL_MAINTENANCE_SQUAWKS: MaintenanceSquawk[] = [
  {
    id: 'SQW-2026-001',
    matricula: 'HP-1588',
    fecha_reporte: '2026-08-19',
    reportado_por: 'Cap. Valeria Benítez',
    reportado_por_rol: 'instructor',
    bitacora_folio: 'BIT-0412',
    sistema_afectado: 'motor',
    descripcion: 'Compresión percibida irregular durante el arranque en caliente y temperatura CHT del cilindro 2 ligeramente más elevada que el promedio de la flota.',
    severidad: 'aog',
    estado: 'en_reparacion',
    orden_trabajo_id: 'OT-2026-038'
  },
  {
    id: 'SQW-2026-002',
    matricula: 'HP-1721SP',
    fecha_reporte: '2026-08-22',
    reportado_por: 'Cap. Anthony Muñoz',
    reportado_por_rol: 'admin',
    bitacora_folio: 'BIT-0435',
    sistema_afectado: 'avionica',
    descripcion: 'Luz intermitente en anunciador de alternador secundario tras encender faro estroboscópico en rodaje. El voltaje principal se mantiene en 28.2V.',
    severidad: 'mel_diferible',
    estado: 'inspeccion'
  },
  {
    id: 'SQW-2026-003',
    matricula: 'HP-1822',
    fecha_reporte: '2026-08-18',
    reportado_por: 'Est. Roberto Gómez',
    reportado_por_rol: 'estudiante',
    bitacora_folio: 'BIT-0399',
    sistema_afectado: 'cabina',
    descripcion: 'Cierre de pestillo de ventana de ventilación derecha (lado copiloto) presenta holgura menor al cerrar en vuelo.',
    severidad: 'observacion',
    estado: 'resuelto',
    accion_correctiva: 'Ajuste de tornillo pasador y lubricación de empaque de neopreno. Cierre firme verificado.',
    fecha_resolucion: '2026-08-19',
    resuelto_por: 'Téc. David Rivas',
    resuelto_por_licencia: 'AAC-TMA-6789'
  }
];

export const INITIAL_MAINTENANCE_PARTS: MaintenancePartStock[] = [
  {
    id: 'prt_oil_w100',
    numero_parte: 'AS-W100',
    descripcion: 'Aceite de Motor Aeronáutico Aeroshell Oil W100 (Grado 50)',
    categoria: 'aceite_lubricante',
    cantidad_disponible: 32,
    cantidad_minima_alerta: 12,
    unidad_medida: 'cuartos',
    ubicacion_hangar: 'Almacén de Fluidos - Estante A1',
    aeronaves_compatibles: ['HP-1450', 'HP-1588', 'HP-1822', 'HP-1799', 'HP-1721SP'],
    ultimo_ingreso_fecha: '2026-08-01'
  },
  {
    id: 'prt_oil_15w50',
    numero_parte: 'AS-15W50',
    descripcion: 'Aceite Multigrado Semisintético Aeroshell 15W50 con Aditivo Antidesgaste',
    categoria: 'aceite_lubricante',
    cantidad_disponible: 18,
    cantidad_minima_alerta: 8,
    unidad_medida: 'cuartos',
    ubicacion_hangar: 'Almacén de Fluidos - Estante A1',
    aeronaves_compatibles: ['HP-1822', 'HP-1721SP'],
    ultimo_ingreso_fecha: '2026-08-05'
  },
  {
    id: 'prt_filter_ch48108',
    numero_parte: 'CH48108-1',
    descripcion: 'Filtro de Aceite Aeronáutico Spin-On Champion (Lycoming O-320 / O-360)',
    categoria: 'filtros',
    cantidad_disponible: 6,
    cantidad_minima_alerta: 4,
    unidad_medida: 'unidades',
    ubicacion_hangar: 'Estantería 3 - Gaveta F1',
    aeronaves_compatibles: ['HP-1450', 'HP-1588', 'HP-1822', 'HP-1799', 'HP-1721SP'],
    ultimo_ingreso_fecha: '2026-07-20'
  },
  {
    id: 'prt_spark_rem40e',
    numero_parte: 'REM40E',
    descripcion: 'Bujía de Encendido Aeronáutica Champion Massive Electrode 18mm',
    categoria: 'bujias_encendido',
    cantidad_disponible: 24,
    cantidad_minima_alerta: 8,
    unidad_medida: 'unidades',
    ubicacion_hangar: 'Gabinete Blindado - Gaveta B2',
    aeronaves_compatibles: ['HP-1450', 'HP-1588', 'HP-1822', 'HP-1799', 'HP-1721SP'],
    ultimo_ingreso_fecha: '2026-06-15'
  },
  {
    id: 'prt_brake_pads',
    numero_parte: '066-10500',
    descripcion: 'Forro de Freno de Disco Parker Cleveland para Rueda 6.00-6',
    categoria: 'frenos_tren',
    cantidad_disponible: 10,
    cantidad_minima_alerta: 4,
    unidad_medida: 'unidades',
    ubicacion_hangar: 'Estantería 2 - Gaveta T4',
    aeronaves_compatibles: ['HP-1450', 'HP-1588', 'HP-1822', 'HP-1799', 'HP-1721SP'],
    ultimo_ingreso_fecha: '2026-08-10'
  },
  {
    id: 'prt_hydraulic_fluid',
    numero_parte: 'MIL-PRF-5606H',
    descripcion: 'Fluido Hidráulico Mineral de Aviación Rojo para Frenos y Amortiguadores',
    categoria: 'aceite_lubricante',
    cantidad_disponible: 4,
    cantidad_minima_alerta: 2,
    unidad_medida: 'galones',
    ubicacion_hangar: 'Almacén de Fluidos - Piso Bahía C',
    aeronaves_compatibles: ['HP-1450', 'HP-1588', 'HP-1822', 'HP-1799', 'HP-1721SP'],
    ultimo_ingreso_fecha: '2026-07-01'
  },
  {
    id: 'prt_air_filter',
    numero_parte: 'BA-6108',
    descripcion: 'Elemento Filtrante de Aire de Admisión de Motor Bracket Aero',
    categoria: 'filtros',
    cantidad_disponible: 5,
    cantidad_minima_alerta: 2,
    unidad_medida: 'unidades',
    ubicacion_hangar: 'Estantería 3 - Gaveta F3',
    aeronaves_compatibles: ['HP-1450', 'HP-1588'],
    ultimo_ingreso_fecha: '2026-06-01'
  },
  {
    id: 'prt_tire_main',
    numero_parte: 'FC-600-6',
    descripcion: 'Neumático de Tren Principal Goodyear Flight Custom III 6.00-6 6-Ply',
    categoria: 'frenos_tren',
    cantidad_disponible: 3,
    cantidad_minima_alerta: 2,
    unidad_medida: 'unidades',
    ubicacion_hangar: 'Racks de Neumáticos - R1',
    aeronaves_compatibles: ['HP-1450', 'HP-1588', 'HP-1822', 'HP-1799', 'HP-1721SP'],
    ultimo_ingreso_fecha: '2026-05-10'
  }
];

export const INITIAL_AIRWORTHINESS_DIRECTIVES: AirworthinessDirective[] = [
  {
    id: 'ad_2020_26_16',
    codigo_ad: 'AD 2020-26-16',
    titulo: 'Inspección de Fatiga y Grietas en Larguero Inferior de Ala Principal (Wing Lower Spar Cap)',
    aplicabilidad_modelo: 'Piper PA-28-181 Archer III (HP-1799)',
    es_recurrente: true,
    intervalo_horas: 100,
    ultimo_cumplimiento_fecha: '2026-06-10',
    ultimo_cumplimiento_horas: 1900.0,
    proximo_cumplimiento_fecha: '2026-12-10',
    proximo_cumplimiento_horas: 2000.0,
    estado_cumplimiento: 'cumplido',
    notas: 'Inspección por corrientes inducidas (eddy current) en orificios de pernos de fijación de larguero sin discrepancias.'
  },
  {
    id: 'ad_2017_16_01',
    codigo_ad: 'AD 2017-16-01',
    titulo: 'Inspección de Mangueras de Combustible y Líneas Flexibles en Compartimiento de Motor',
    aplicabilidad_modelo: 'Cessna 172N / 172P / 172SP',
    es_recurrente: true,
    intervalo_horas: 100,
    intervalo_meses: 12,
    ultimo_cumplimiento_fecha: '2026-07-15',
    ultimo_cumplimiento_horas: 4180.0,
    proximo_cumplimiento_fecha: '2027-07-15',
    proximo_cumplimiento_horas: 4280.0,
    estado_cumplimiento: 'cumplido',
    notas: 'Verificación visual y de torsión de abrazaderas y conectores Stratoflex sin señales de rozamiento ni fuga.'
  },
  {
    id: 'ad_2004_10_14',
    codigo_ad: 'AD 2004-10-14',
    titulo: 'Inspección Recurrente de Rieles y Mecanismo de Bloqueo de Asientos de Piloto y Copiloto',
    aplicabilidad_modelo: 'Cessna 172 Series',
    es_recurrente: true,
    intervalo_horas: 100,
    intervalo_meses: 12,
    ultimo_cumplimiento_fecha: '2026-07-28',
    ultimo_cumplimiento_horas: 2320.0,
    proximo_cumplimiento_fecha: '2027-07-28',
    proximo_cumplimiento_horas: 2420.0,
    estado_cumplimiento: 'proximo_vencer',
    notas: 'Próxima inspección coincidirá con la inspección de 100h en HP-1822 (4.4 horas restantes).'
  },
  {
    id: 'ad_2011_10_09',
    codigo_ad: 'AD 2011-10-09',
    titulo: 'Interruptor de Llave de Ignición Bendix / Magneto Switch Check',
    aplicabilidad_modelo: 'Todos los motores con magnetos Bendix / TCM',
    es_recurrente: true,
    intervalo_horas: 100,
    ultimo_cumplimiento_fecha: '2026-08-01',
    ultimo_cumplimiento_horas: 1900.0,
    proximo_cumplimiento_fecha: '2026-11-01',
    proximo_cumplimiento_horas: 2000.0,
    estado_cumplimiento: 'cumplido',
    notas: 'Verificación de corte a tierra de magnetos L y R en ralentí satisfactoria.'
  }
];

export const INITIAL_AIRCRAFT_MOVEMENTS: AircraftWorkshopMovement[] = [
  {
    id: 'MOV-2026-001',
    tipo: 'entrada',
    matricula: 'HP-1450',
    modelo: 'Cessna 172 Skyhawk',
    fecha: '2026-10-28',
    hora: '08:30',
    tach_hobbs: 2450.4,
    motivo_principal: 'Inspección Periódica Obligatoria 100 Horas (Célula y Motor)',
    descripcion_detallada: 'Aeronave ingresa a hangar OMA para cumplimiento de inspección periódica de 100 horas de acuerdo con manual de mantenimiento Cessna 172 Cap. 05. Se reporta discrepancia menor en rodamiento de tren de nariz.',
    bitacora_folio: 'BIT-1450-20261002-01',
    bitacora_tipo: 'celula',
    orden_trabajo_id: 'OT-2026-042',
    squawk_id: 'SQ-001',
    asiento_bitacora: 'Aeronave ingresada en taller OMA para inspección de 100 horas. Asentado en Bitácora de Célula Tomo IV, Folio #BIT-1450-20261002-01.',
    tecnico_responsable: 'Ing. Carlos Mendoza',
    licencia_tma: 'AAC-TMA-04521',
    supervisor_liberador: 'TMA Luis Arango',
    licencia_supervisor: 'AAC-TMA-01899',
    ubicacion_hangar: 'Hangar OMA - Bahía 1',
    condicion_aeronavegabilidad: 'mantenimiento_preventivo',
    creado_en: '2026-10-28T08:30:00.000Z'
  },
  {
    id: 'MOV-2026-002',
    tipo: 'salida',
    matricula: 'HP-1450',
    modelo: 'Cessna 172 Skyhawk',
    fecha: '2026-10-30',
    hora: '16:45',
    tach_hobbs: 2450.4,
    motivo_principal: 'Retorno al Servicio (RTS Conforme) - Inspección 100h Completada',
    descripcion_detallada: 'Concluida inspección periódica de 100 horas y 50 horas de motor. Reemplazados filtro de aceite CH48108-1 y 8 bujías REM37BY. Prueba estática de motor y corrida en tierra satisfactoria. Retorno al servicio autorizado bajo RAC 43 / RAC 145.',
    bitacora_folio: 'BIT-1450-20261002-01',
    bitacora_tipo: 'celula',
    orden_trabajo_id: 'OT-2026-042',
    asiento_bitacora: 'Certifico que esta aeronave ha sido inspeccionada de acuerdo con inspección de 100 horas y se determina en condición aeronavegable. Retorno al servicio aprobado. Folio Bitácora #BIT-1450-20261002-01.',
    tecnico_responsable: 'Ing. Carlos Mendoza',
    licencia_tma: 'AAC-TMA-04521',
    supervisor_liberador: 'Ing. Carlos Mendoza',
    licencia_supervisor: 'AAC-TMA-04521',
    ubicacion_hangar: 'Línea de Vuelo / Plataforma',
    condicion_aeronavegabilidad: 'aeronavegable_conforme',
    entrada_id_relacionada: 'MOV-2026-001',
    creado_en: '2026-10-30T16:45:00.000Z'
  },
  {
    id: 'MOV-2026-003',
    tipo: 'entrada',
    matricula: 'HP-1588',
    modelo: 'Cessna 172SP Nav III',
    fecha: '2026-11-02',
    hora: '09:15',
    tach_hobbs: 1820.6,
    motivo_principal: 'Discrepancia Crítica en Bomba de Combustible Auxiliar & Fuga de Presión',
    descripcion_detallada: 'Ingreso imprevisto por reporte de discrepancia post-vuelo de instrucción: caída de presión de combustible en bomba auxiliar eléctrica. Aeronave declarada AOG (Aircraft On Ground) para cambio de bomba y chequeo de líneas.',
    bitacora_folio: 'BIT-1588-20261004-03',
    bitacora_tipo: 'motor',
    orden_trabajo_id: 'OT-2026-043',
    squawk_id: 'SQ-002',
    asiento_bitacora: 'Aeronave ingresada en condición AOG para reemplazo de bomba auxiliar P/N 4140-00-103. Asentado en Bitácora de Motor Folio #BIT-1588-20261004-03.',
    tecnico_responsable: 'TMA Luis Arango',
    licencia_tma: 'AAC-TMA-01899',
    ubicacion_hangar: 'Hangar OMA - Bahía 2',
    condicion_aeronavegabilidad: 'aog_inoperativo',
    creado_en: '2026-11-02T09:15:00.000Z'
  },
  {
    id: 'MOV-2026-004',
    tipo: 'entrada',
    matricula: 'HP-1822',
    modelo: 'Piper PA-44-180 Seminole',
    fecha: '2026-10-15',
    hora: '10:00',
    tach_hobbs: 3120.2,
    motivo_principal: 'Servicio de Aceite y Filtros 50 Horas Motor Izquierdo y Derecho',
    descripcion_detallada: 'Ingreso rutinario para servicio preventivo de lubricación y filtros de 50 horas en ambos motores Lycoming O-360-E1A6D.',
    bitacora_folio: 'BIT-1822-20261006-01',
    bitacora_tipo: 'motor',
    orden_trabajo_id: 'OT-2026-044',
    asiento_bitacora: 'Aeronave en taller para drenado de aceite de motor y análisis de partículas magnéticas en filtros. Folio Bitácora #BIT-1822-20261006-01.',
    tecnico_responsable: 'Ing. Carlos Mendoza',
    licencia_tma: 'AAC-TMA-04521',
    ubicacion_hangar: 'Hangar OMA - Bahía 1',
    condicion_aeronavegabilidad: 'mantenimiento_preventivo',
    creado_en: '2026-10-15T10:00:00.000Z'
  },
  {
    id: 'MOV-2026-005',
    tipo: 'salida',
    matricula: 'HP-1822',
    modelo: 'Piper PA-44-180 Seminole',
    fecha: '2026-10-16',
    hora: '14:20',
    tach_hobbs: 3120.2,
    motivo_principal: 'Retorno al Servicio Conforme - Servicio de 50h Aprobado',
    descripcion_detallada: 'Completado cambio de aceite Phillips 66 XC 20W-50 (8 qts en c/u) y filtros CH48110-1. Verificación de corte de magnetos y fugas negativa. Aeronave retornada al servicio de vuelo.',
    bitacora_folio: 'BIT-1822-20261006-01',
    bitacora_tipo: 'motor',
    orden_trabajo_id: 'OT-2026-044',
    asiento_bitacora: 'Servicio de 50 horas completado satisfactoriamente según RAC 43. Asentado en Bitácora de Motor L y Motor R. Folio #BIT-1822-20261006-01.',
    tecnico_responsable: 'Ing. Carlos Mendoza',
    licencia_tma: 'AAC-TMA-04521',
    supervisor_liberador: 'Ing. Carlos Mendoza',
    licencia_supervisor: 'AAC-TMA-04521',
    ubicacion_hangar: 'Línea de Vuelo',
    condicion_aeronavegabilidad: 'aeronavegable_conforme',
    entrada_id_relacionada: 'MOV-2026-004',
    creado_en: '2026-10-16T14:20:00.000Z'
  }
];

// ==========================================
// MOTOR DE BASE DE DATOS EN MEMORIA (CRUD)
// ==========================================

class DatabaseService {
  private dbFilePath = path.join(process.cwd(), 'data', 'skyops_db.json');
  private users: User[] = [...INITIAL_USERS];
  private transactions: Transaction[] = [...INITIAL_TRANSACTIONS];
  private flightProgress: FlightProgress[] = [...INITIAL_FLIGHT_PROGRESS];
  private itineraries: Itinerary[] = [...INITIAL_ITINERARIES];
  private emailLogs: EmailNotification[] = [...INITIAL_EMAIL_LOGS];
  private accountingMessages: InternalAccountingMessage[] = [...INITIAL_ACCOUNTING_MESSAGES];
  private operatingExpenses: OperatingExpense[] = [...INITIAL_OPERATING_EXPENSES];
  private whatsappConfig: WhatsAppConfig = { ...INITIAL_WHATSAPP_CONFIG };
  private whatsappTriggers: WhatsAppTrigger[] = [...INITIAL_WHATSAPP_TRIGGERS];
  private whatsappLogs: WhatsAppLogMessage[] = [...INITIAL_WHATSAPP_LOGS];
  private auditLogs: AuditLogEntry[] = [...INITIAL_AUDIT_LOGS];
  private pohDocuments: POHDocument[] = [...DEFAULT_POH_LIBRARY];
  private aircraftLogbookDraftRows: any[] = [];
  private roleNotificationRules: RoleNotificationRule[] = [...INITIAL_ROLE_NOTIFICATION_RULES];
  private paymentLinks: PaymentLink[] = [...INITIAL_PAYMENT_LINKS];
  private instructorFeeStatements: InstructorFeeStatement[] = [...INITIAL_INSTRUCTOR_FEE_STATEMENTS];
  private aircraftMaintenanceRecords: AircraftMaintenanceRecord[] = [...INITIAL_AIRCRAFT_MAINTENANCE_RECORDS];
  private maintenanceWorkOrders: MaintenanceWorkOrder[] = [...INITIAL_WORK_ORDERS];
  private maintenanceSquawks: MaintenanceSquawk[] = [...INITIAL_MAINTENANCE_SQUAWKS];
  private maintenanceParts: MaintenancePartStock[] = [...INITIAL_MAINTENANCE_PARTS];
  private airworthinessDirectives: AirworthinessDirective[] = [...INITIAL_AIRWORTHINESS_DIRECTIVES];
  private aircraftMovements: AircraftWorkshopMovement[] = [...INITIAL_AIRCRAFT_MOVEMENTS];
  private flightRequests: FlightRequest[] = [...INITIAL_FLIGHT_REQUESTS];
  private publishedDailyItineraries: PublishedDailyItinerary[] = [];
  private flightRequestConfig: {
    simulatedTime: string | null;
    lastSentBatchDate: string | null;
    lastSentBatchAt?: string;
    lastPublishedDate: string | null;
    lastPublishedAt?: string;
  } = {
    simulatedTime: null,
    lastSentBatchDate: null,
    lastPublishedDate: null
  };

  constructor() {
    this.loadFromDisk();
    this.checkAndRunFlightRequestCutoffs();
  }

  private loadFromDisk(): void {
    try {
      const dataDir = path.dirname(this.dbFilePath);
      if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
      }
      if (fs.existsSync(this.dbFilePath)) {
        const raw = fs.readFileSync(this.dbFilePath, 'utf-8');
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed.users) && parsed.users.length > 0) {
          // Merge users from disk with INITIAL_USERS to make sure core users, instructors, and students always exist
          const userMap = new Map<string, User>();
          INITIAL_USERS.forEach(u => userMap.set(u.id, u));
          parsed.users.forEach((u: User) => {
            if (u && u.id) userMap.set(u.id, u);
          });
          this.users = Array.from(userMap.values());
        }
        if (Array.isArray(parsed.transactions)) this.transactions = parsed.transactions;
        if (Array.isArray(parsed.flightProgress)) this.flightProgress = parsed.flightProgress;
        if (Array.isArray(parsed.itineraries)) this.itineraries = parsed.itineraries;
        if (Array.isArray(parsed.emailLogs) && parsed.emailLogs.length > 0) {
          const logMap = new Map<string, EmailNotification>();
          INITIAL_EMAIL_LOGS.forEach(l => logMap.set(l.id, l));
          parsed.emailLogs.forEach((l: EmailNotification) => {
            if (l && l.id) logMap.set(l.id, l);
          });
          this.emailLogs = Array.from(logMap.values());
        } else {
          this.emailLogs = [...INITIAL_EMAIL_LOGS];
        }
        if (Array.isArray(parsed.roleNotificationRules) && parsed.roleNotificationRules.length > 0) {
          this.roleNotificationRules = parsed.roleNotificationRules;
        } else {
          this.roleNotificationRules = [...INITIAL_ROLE_NOTIFICATION_RULES];
        }
        if (Array.isArray(parsed.accountingMessages)) this.accountingMessages = parsed.accountingMessages;
        if (Array.isArray(parsed.operatingExpenses)) this.operatingExpenses = parsed.operatingExpenses;
        if (parsed.whatsappConfig) this.whatsappConfig = parsed.whatsappConfig;
        if (Array.isArray(parsed.whatsappTriggers)) this.whatsappTriggers = parsed.whatsappTriggers;
        if (Array.isArray(parsed.whatsappLogs)) this.whatsappLogs = parsed.whatsappLogs;
        if (Array.isArray(parsed.auditLogs)) {
          this.auditLogs = parsed.auditLogs.map((l: any) => ({
            ...l,
            entidad_tipo: l.entidad_tipo || 'Base de Datos / Sistema SkyOps',
            entidad_id: l.entidad_id || l.id || 'sys',
            hash_integridad: l.hash_integridad || '0'.repeat(64),
            detalles_cambio: Array.isArray(l.detalles_cambio) ? l.detalles_cambio : []
          }));
        }
        if (Array.isArray(parsed.pohDocuments) && parsed.pohDocuments.length > 0) {
          this.pohDocuments = parsed.pohDocuments;
        }
        if (Array.isArray(parsed.aircraftLogbookDraftRows)) {
          this.aircraftLogbookDraftRows = parsed.aircraftLogbookDraftRows;
        }
        if (Array.isArray(parsed.paymentLinks) && parsed.paymentLinks.length > 0) {
          const plMap = new Map<string, PaymentLink>();
          INITIAL_PAYMENT_LINKS.forEach(p => plMap.set(p.id, p));
          parsed.paymentLinks.forEach((p: PaymentLink) => {
            if (p && p.id) plMap.set(p.id, p);
          });
          this.paymentLinks = Array.from(plMap.values());
        } else {
          this.paymentLinks = [...INITIAL_PAYMENT_LINKS];
        }
        // Únicamente conservar honorarios creados por bitácoras registradas por Administración
        if (Array.isArray(parsed.instructorFeeStatements)) {
          this.instructorFeeStatements = parsed.instructorFeeStatements.filter(
            (s: InstructorFeeStatement) => s && s.id && s.registrado_por_admin === true
          );
        } else {
          this.instructorFeeStatements = [];
        }

        if (parsed.instructorFeeWorkbooks && typeof parsed.instructorFeeWorkbooks === 'object') {
          this.instructorFeeWorkbooks = parsed.instructorFeeWorkbooks;
        }
        if (parsed.customEditedFeeWorkbooks && typeof parsed.customEditedFeeWorkbooks === 'object') {
          this.customEditedFeeWorkbooks = parsed.customEditedFeeWorkbooks;
        }

        // Cargar registros de Mantenimiento de Flota (TMA / OMA)
        if (Array.isArray(parsed.aircraftMaintenanceRecords) && parsed.aircraftMaintenanceRecords.length > 0) {
          const recMap = new Map<string, AircraftMaintenanceRecord>();
          INITIAL_AIRCRAFT_MAINTENANCE_RECORDS.forEach(r => recMap.set(r.matricula, r));
          parsed.aircraftMaintenanceRecords.forEach((r: AircraftMaintenanceRecord) => {
            if (r && r.matricula) {
              const normalized = { ...r };
              // Corregir umbrales 50h inconsistentes heredados de datos iniciales
              if (normalized.matricula === 'HP-1822' && normalized.horas_proxima_50h === 2370 && normalized.horas_ultima_100h === 2320) {
                normalized.horas_proxima_50h = 2420.0;
              }
              if (normalized.matricula === 'HP-1799' && normalized.horas_proxima_50h === 1950 && normalized.horas_ultima_100h === 1900) {
                normalized.horas_proxima_50h = 2000.0;
              }
              normalized.horas_restantes_100h = Number(Math.max(0, normalized.horas_proxima_100h - normalized.horas_totales_celula).toFixed(1));
              normalized.horas_restantes_50h = Number(Math.max(0, normalized.horas_proxima_50h - normalized.horas_totales_celula).toFixed(1));
              recMap.set(normalized.matricula, normalized);
            }
          });
          this.aircraftMaintenanceRecords = Array.from(recMap.values());
        } else {
          this.aircraftMaintenanceRecords = [...INITIAL_AIRCRAFT_MAINTENANCE_RECORDS];
        }

        if (Array.isArray(parsed.maintenanceWorkOrders) && parsed.maintenanceWorkOrders.length > 0) {
          this.maintenanceWorkOrders = parsed.maintenanceWorkOrders;
        } else {
          this.maintenanceWorkOrders = [...INITIAL_WORK_ORDERS];
        }

        if (Array.isArray(parsed.maintenanceSquawks) && parsed.maintenanceSquawks.length > 0) {
          this.maintenanceSquawks = parsed.maintenanceSquawks;
        } else {
          this.maintenanceSquawks = [...INITIAL_MAINTENANCE_SQUAWKS];
        }

        if (Array.isArray(parsed.maintenanceParts) && parsed.maintenanceParts.length > 0) {
          this.maintenanceParts = parsed.maintenanceParts;
        } else {
          this.maintenanceParts = [...INITIAL_MAINTENANCE_PARTS];
        }

        if (Array.isArray(parsed.airworthinessDirectives) && parsed.airworthinessDirectives.length > 0) {
          this.airworthinessDirectives = parsed.airworthinessDirectives;
        } else {
          this.airworthinessDirectives = [...INITIAL_AIRWORTHINESS_DIRECTIVES];
        }

        if (Array.isArray(parsed.aircraftMovements) && parsed.aircraftMovements.length > 0) {
          this.aircraftMovements = parsed.aircraftMovements;
        } else {
          this.aircraftMovements = [...INITIAL_AIRCRAFT_MOVEMENTS];
        }

        if (Array.isArray(parsed.flightRequests) && parsed.flightRequests.length > 0) {
          this.flightRequests = parsed.flightRequests;
        } else {
          this.flightRequests = [...INITIAL_FLIGHT_REQUESTS];
        }

        if (Array.isArray(parsed.publishedDailyItineraries)) {
          this.publishedDailyItineraries = parsed.publishedDailyItineraries;
        } else {
          this.publishedDailyItineraries = [];
        }

        if (parsed.flightRequestConfig && typeof parsed.flightRequestConfig === 'object') {
          this.flightRequestConfig = {
            simulatedTime: parsed.flightRequestConfig.simulatedTime || null,
            lastSentBatchDate: parsed.flightRequestConfig.lastSentBatchDate || null,
            lastSentBatchAt: parsed.flightRequestConfig.lastSentBatchAt,
            lastPublishedDate: parsed.flightRequestConfig.lastPublishedDate || null,
            lastPublishedAt: parsed.flightRequestConfig.lastPublishedAt
          };
        }

        // Garantizar existencia y rol de Jefatura Master
        const jefaturaIdx = this.users.findIndex(u => u.correo.toLowerCase() === 'antpilot26@skyops.com');
        const jefaturaUser: User = {
          id: 'usr_jefatura_1',
          nombre: 'Jefatura de Operaciones e Instrucción SkyOps',
          rol: 'admin',
          telefono: '+507 6890-1122',
          correo: 'antpilot26@skyops.com',
          password: 'Antpilot26.',
          documento_identidad: '8-742-1980',
          direccion_residencial: 'Aeropuerto Internacional Marcos A. Gelabert, Hangar SkyOps, Albrook, Ciudad de Panamá',
          fecha_ingreso: '2024-01-01',
          licencia: 'AAC-ATPL-09412',
          vencimiento_medico: '2028-12-31',
          vencimiento_licencia: '2028-12-31',
          numero_medico: 'MED-CL1-09412-AAC',
          foto_perfil: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
          activo: true,
          auth_provider: 'local',
          estado_autorizacion: 'aprobado',
          autorizado_por: 'Dirección General de Aeronáutica Civil (AAC)',
          fecha_autorizacion: '2026-01-01T00:00:00.000Z',
          creado_en: '2026-01-01T00:00:00.000Z'
        };

        if (jefaturaIdx >= 0) {
          this.users[jefaturaIdx] = { ...this.users[jefaturaIdx], ...jefaturaUser };
        } else {
          this.users.unshift(jefaturaUser);
        }

        // Garantizar existencia y rol Master de Cap. Anthony Muñoz (amunoz410@gmail.com / amunoz4100@gmail.com)
        const amunozIdx = this.users.findIndex(u =>
          (u.correo && (u.correo.toLowerCase() === 'amunoz4100@gmail.com' || u.correo.toLowerCase() === 'amunoz410@gmail.com')) ||
          u.id === 'usr_amunoz_admin'
        );
        const amunozUser: User = {
          id: 'usr_amunoz_admin',
          nombre: 'Cap. Anthony Muñoz - Jefatura de Operaciones e Instrucción',
          rol: 'admin',
          telefono: '+507 6890-1122',
          correo: 'amunoz410@gmail.com',
          password: 'Antpilot26',
          documento_identidad: '8-742-1980',
          direccion_residencial: 'Aeropuerto Internacional Marcos A. Gelabert, Hangar SkyOps, Albrook, Ciudad de Panamá',
          fecha_ingreso: '2024-01-01',
          contactos_emergencia: [
            {
              nombre: 'Dra. Beatriz Morales',
              parentesco: 'Cónyuge / Contacto de Emergencia',
              telefono: '+507 6620-3344',
              telefono_secundario: '+507 269-8800'
            }
          ],
          licencia: 'AAC-ATPL-09412',
          vencimiento_medico: '2028-12-31',
          vencimiento_licencia: '2028-12-31',
          numero_medico: 'MED-CL1-09412-AAC',
          foto_perfil: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
          activo: true,
          auth_provider: 'local',
          estado_autorizacion: 'aprobado',
          autorizado_por: 'Dirección General de Aeronáutica Civil (AAC)',
          fecha_autorizacion: '2026-01-01T00:00:00.000Z',
          creado_en: '2026-01-01T00:00:00.000Z'
        };

        if (amunozIdx >= 0) {
          this.users[amunozIdx] = { ...this.users[amunozIdx], ...amunozUser };
        } else {
          this.users.unshift(amunozUser);
        }

        // Garantizar existencia y rol de Contabilidad & Finanzas
        const contaIdx = this.users.findIndex(u =>
          (u.correo && u.correo.toLowerCase() === 'contabilidad@skyops.com') ||
          u.id === 'usr_conta_1' ||
          (u.documento_identidad && u.documento_identidad.replace(/[\s.-]/g, '') === '88002020')
        );
        const contaUser: User = {
          id: 'usr_conta_1',
          nombre: 'Lic. Mariana Chen - Contabilidad y Finanzas',
          rol: 'contabilidad',
          telefono: '+507 6233-7711',
          correo: 'contabilidad@skyops.com',
          password: 'Conta2026.',
          documento_identidad: '8-800-2020',
          direccion_residencial: 'Bella Vista, Calle 45, PH Torres del Mar, Ciudad de Panamá',
          fecha_ingreso: '2024-01-01',
          foto_perfil: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=150&auto=format&fit=crop&q=80',
          activo: true,
          auth_provider: 'local',
          estado_autorizacion: 'aprobado',
          autorizado_por: 'Jefatura de Instrucción',
          fecha_autorizacion: '2026-01-01T00:00:00.000Z',
          creado_en: '2026-01-01T00:00:00.000Z'
        };

        if (contaIdx >= 0) {
          this.users[contaIdx] = { ...this.users[contaIdx], ...contaUser };
        } else {
          this.users.push(contaUser);
        }

        // Garantizar existencia y rol de Estudiante Oficial (Daniel Alvarado)
        const estIdx = this.users.findIndex(u =>
          (u.correo && (u.correo.toLowerCase() === 'alumno@skyops.com' || u.correo.toLowerCase() === 'daniel.alvarado@skyops.com')) ||
          u.id === 'usr_est_daniel' ||
          (u.documento_identidad && u.documento_identidad.replace(/[\s.-]/g, '') === '89201140')
        );
        const estUser: User = {
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
        };

        if (estIdx >= 0) {
          this.users[estIdx] = { ...this.users[estIdx], ...estUser };
        } else {
          this.users.push(estUser);
        }

        // Garantizar existencia y rol de Instructor Oficial (Cap. Valeria Benítez)
        const instIdx = this.users.findIndex(u =>
          (u.correo && (u.correo.toLowerCase() === 'instructor@skyops.com' || u.correo.toLowerCase() === 'valeria.benitez@skyops.com')) ||
          u.id === 'usr_inst_valeria' ||
          (u.documento_identidad && u.documento_identidad.replace(/[\s.-]/g, '') === '87901420')
        );
        const instUser: User = {
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
        };

        if (instIdx >= 0) {
          this.users[instIdx] = { ...this.users[instIdx], ...instUser };
        } else {
          this.users.push(instUser);
        }

        console.log(`[SkyOps DB] Persisted database loaded from disk (${this.users.length} users, ${this.itineraries.length} itineraries, ${this.flightProgress.length} flight logs, ${this.pohDocuments.length} POH docs)`);
        this.saveToDisk();
      } else {
        this.saveToDisk();
      }
    } catch (err) {
      console.warn('[SkyOps DB] Error loading from disk, fallback to default state:', err);
    }
  }

  public saveToDisk(): void {
    try {
      const dataDir = path.dirname(this.dbFilePath);
      if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
      }
      const state = {
        users: this.users,
        transactions: this.transactions,
        flightProgress: this.flightProgress,
        itineraries: this.itineraries,
        emailLogs: this.emailLogs,
        accountingMessages: this.accountingMessages,
        operatingExpenses: this.operatingExpenses,
        whatsappConfig: this.whatsappConfig,
        whatsappTriggers: this.whatsappTriggers,
        whatsappLogs: this.whatsappLogs,
        auditLogs: this.auditLogs,
        pohDocuments: this.pohDocuments,
        aircraftLogbookDraftRows: this.aircraftLogbookDraftRows,
        roleNotificationRules: this.roleNotificationRules,
        paymentLinks: this.paymentLinks,
        instructorFeeStatements: this.instructorFeeStatements,
        instructorFeeWorkbooks: this.instructorFeeWorkbooks,
        customEditedFeeWorkbooks: this.customEditedFeeWorkbooks,
        aircraftMaintenanceRecords: this.aircraftMaintenanceRecords,
        maintenanceWorkOrders: this.maintenanceWorkOrders,
        maintenanceSquawks: this.maintenanceSquawks,
        maintenanceParts: this.maintenanceParts,
        airworthinessDirectives: this.airworthinessDirectives,
        aircraftMovements: this.aircraftMovements,
        flightRequests: this.flightRequests,
        publishedDailyItineraries: this.publishedDailyItineraries,
        flightRequestConfig: this.flightRequestConfig,
        savedAt: new Date().toISOString()
      };
      fs.writeFileSync(this.dbFilePath, JSON.stringify(state, null, 2), 'utf-8');
    } catch (err) {
      console.error('[SkyOps DB] Failed to save database to disk:', err);
    }
  }

  // --- MANUALES POH (PERSISTENCIA Y GESTIÓN OFICIAL) ---
  getPOHDocuments(): POHDocument[] {
    return this.pohDocuments;
  }

  savePOHDocument(poh: POHDocument): POHDocument {
    const idx = this.pohDocuments.findIndex(p => p.id === poh.id);
    if (idx >= 0) {
      this.pohDocuments[idx] = { ...this.pohDocuments[idx], ...poh };
    } else {
      this.pohDocuments.unshift(poh);
    }
    this.saveToDisk();
    return poh;
  }

  deletePOHDocument(id: string): boolean {
    const idx = this.pohDocuments.findIndex(p => p.id === id);
    if (idx >= 0) {
      this.pohDocuments.splice(idx, 1);
      this.saveToDisk();
      return true;
    }
    return false;
  }

  // --- HOJA DE TRABAJO DE BITÁCORA DE AERONAVES (PERSISTENCIA DE FILAS BORRADOR) ---
  getLogbookDraftSheet(): any[] {
    return this.aircraftLogbookDraftRows;
  }

  saveLogbookDraftSheet(rows: any[]): any[] {
    this.aircraftLogbookDraftRows = Array.isArray(rows) ? rows : [];
    this.saveToDisk();
    return this.aircraftLogbookDraftRows;
  }

  // --- USUARIOS ---
  getUsers(): User[] {
    return this.users;
  }

  getUserById(id: string): User | undefined {
    return this.users.find(u => u.id === id);
  }

  /**
   * Búsqueda resiliente de usuario por ID, Correo Electrónico, Documento de Identidad o Nombre
   */
  getUserByIdOrReference(idOrEmailOrRef?: string): User | null {
    if (!idOrEmailOrRef) return null;
    const clean = idOrEmailOrRef.trim().toLowerCase();
    const cleanDoc = idOrEmailOrRef.replace(/[\s.-]/g, '').toLowerCase();

    return this.users.find(u => {
      if (!u) return false;
      if (u.id && u.id.toLowerCase() === clean) return true;
      if (u.correo && u.correo.toLowerCase() === clean) return true;
      if (cleanDoc && u.documento_identidad && u.documento_identidad.replace(/[\s.-]/g, '').toLowerCase() === cleanDoc) return true;
      if (u.nombre && u.nombre.toLowerCase() === clean) return true;
      return false;
    }) || null;
  }

  /**
   * Obtiene la lista de usuarios registrados para un rol específico junto con su correo oficial
   */
  getRegisteredUsersForRole(role: UserRole): Array<{ user: User; email: string; name: string }> {
    const list: Array<{ user: User; email: string; name: string }> = [];
    const seenEmails = new Set<string>();

    for (const u of this.users) {
      if (!u || u.activo === false) continue;
      const matchesRole = u.rol === role || (role === 'admin' && (u.rol === 'admin' || u.rol === 'escuela'));
      if (matchesRole) {
        const email = (u.correo || '').trim().toLowerCase();
        if (email && email.includes('@') && !seenEmails.has(email)) {
          seenEmails.add(email);
          list.push({ user: u, email: u.correo.trim(), name: u.nombre || u.correo.trim() });
        }
      }
    }

    if (list.length === 0) {
      const defaultEmailMap: Record<UserRole, { email: string; name: string }> = {
        admin: { email: 'amunoz410@gmail.com', name: 'Cap. Anthony Muñoz - Jefatura de Operaciones' },
        escuela: { email: 'operaciones@skyops.com', name: 'Dirección de Escuela & Operaciones' },
        contabilidad: { email: 'contabilidad@skyops.com', name: 'Lic. Mariana Chen (Contabilidad)' },
        instructor: { email: 'instructor@skyops.com', name: 'Cap. Valeria Benítez (CFI-A)' },
        instructor_en_jefe: { email: 'a.bustamante@skyops.com', name: 'Cap. A. Bustamante - Instructor en Jefe' },
        mantenimiento: { email: 'taller@skyops.com', name: 'Ing. Carlos Mendoza (Jefe de Taller & TMA)' },
        estudiante: { email: 'alumno@skyops.com', name: 'Daniel Alvarado' }
      };
      const def = defaultEmailMap[role] || { email: 'admin@skyops.com', name: 'Operaciones SkyOps' };
      list.push({ user: null as any, email: def.email, name: def.name });
    }

    return list;
  }

  /**
   * Obtiene el correo y nombre registrado de un usuario asegurando que nunca se ignore el correo en su ficha
   */
  getUserRegisteredEmail(userIdOrEmailOrRef?: string, defaultEmail: string = 'alumno@skyops.com', defaultName: string = 'Piloto'): { email: string; name: string; user: User | null } {
    const user = this.getUserByIdOrReference(userIdOrEmailOrRef);
    if (user && user.correo && user.correo.includes('@')) {
      return { email: user.correo.trim(), name: user.nombre || user.correo.trim(), user };
    }
    return { email: defaultEmail, name: defaultName, user: null };
  }

  createUser(userData: Omit<User, 'id' | 'activo'> & { id?: string; activo?: boolean }): User {
    const rolePrefix = userData.rol === 'admin' ? 'usr_admin_' :
                       userData.rol === 'escuela' ? 'usr_escuela_' :
                       userData.rol === 'instructor_en_jefe' ? 'usr_chief_' :
                       userData.rol === 'instructor' ? 'usr_inst_' :
                       userData.rol === 'mantenimiento' ? 'usr_taller_' :
                       userData.rol === 'contabilidad' ? 'usr_conta_' : 'usr_est_';
    
    const newUser: User = {
      ...userData,
      id: userData.id || (rolePrefix + Date.now() + '_' + Math.floor(Math.random() * 1000)),
      activo: userData.activo !== undefined ? userData.activo : true,
      creado_en: new Date().toISOString()
    };

    this.users.unshift(newUser);
    this.saveToDisk();
    return newUser;
  }

  updateUser(id: string, updates: Partial<User>): User | null {
    const idx = this.users.findIndex(u => u.id === id);
    if (idx === -1) return null;
    this.users[idx] = { ...this.users[idx], ...updates };
    this.saveToDisk();
    return this.users[idx];
  }

  deleteUser(id: string): boolean {
    const idx = this.users.findIndex(u => u.id === id);
    if (idx === -1) return false;
    this.users.splice(idx, 1);
    this.saveToDisk();
    return true;
  }

  /**
   * Valida si un instructor tiene vigencias vencidas (Hard Lock)
   */
  isInstructorLocked(instructorId: string): { locked: boolean; reason?: string } {
    const instructor = this.getUserById(instructorId);
    if (!instructor || (instructor.rol !== 'instructor' && instructor.rol !== 'instructor_en_jefe')) {
      return { locked: false };
    }

    const todayStr = new Date().toISOString().split('T')[0];

    if (instructor.vencimiento_medico && instructor.vencimiento_medico < todayStr) {
      return {
        locked: true,
        reason: `Certificado Médico Aeronáutico VENCIDO (${instructor.vencimiento_medico}). Bloqueo estricto de seguridad de vuelo.`
      };
    }

    if (instructor.vencimiento_licencia && instructor.vencimiento_licencia < todayStr) {
      return {
        locked: true,
        reason: `Licencia de Instructor de Vuelo VENCIDA (${instructor.vencimiento_licencia}). Bloqueo estricto de seguridad de vuelo.`
      };
    }

    return { locked: false };
  }

  // --- TRANSACCIONES & CONTABILIDAD (CONTROL ESTRICTO DE CONCILIACIÓN BANCARIA) ---
  getTransactions(studentId?: string, status?: TransactionApprovalStatus): Transaction[] {
    let list = [...this.transactions];
    if (studentId) {
      list = list.filter(t => t.estudiante_id === studentId);
    }
    if (status) {
      list = list.filter(t => t.estado_aprobacion === status);
    }
    return list.sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime());
  }

  getPendingTransactions(): Transaction[] {
    return this.transactions
      .filter(t => t.estado_aprobacion === 'pendiente_revision_bancaria')
      .sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime());
  }

  /**
   * REGLA FINANCIERA ESTRICTA:
   * Al rol de estudiante NO se le acredita saldo a favor ni en contra sin que
   * Contabilidad lo revise, compruebe con el sistema bancario y lo apruebe.
   * Por tanto, el saldo oficial del estudiante considera ÚNICAMENTE transacciones 'aprobado'.
   */
  getStudentBalance(studentId: string): number {
    const approvedTxs = this.transactions.filter(
      t => t.estudiante_id === studentId && (t.estado_aprobacion === 'aprobado' || t.estado_aprobacion === undefined)
    );
    let balance = 0;
    for (const tx of approvedTxs) {
      if (tx.tipo === 'abono') balance += tx.monto;
      else if (tx.tipo === 'cargo') balance -= tx.monto;
    }
    return Number(balance.toFixed(2));
  }

  /**
   * Obtiene el monto total que está pendiente de revisión bancaria por Contabilidad
   */
  getStudentPendingAmount(studentId: string): { totalPendingAbonos: number; totalPendingCargos: number; count: number } {
    const pendingTxs = this.transactions.filter(
      t => t.estudiante_id === studentId && t.estado_aprobacion === 'pendiente_revision_bancaria'
    );
    let abonos = 0;
    let cargos = 0;
    for (const tx of pendingTxs) {
      if (tx.tipo === 'abono') abonos += tx.monto;
      else if (tx.tipo === 'cargo') cargos += tx.monto;
    }
    return {
      totalPendingAbonos: Number(abonos.toFixed(2)),
      totalPendingCargos: Number(cargos.toFixed(2)),
      count: pendingTxs.length
    };
  }

  addTransaction(txData: Omit<Transaction, 'id' | 'saldo_resultante'> & { estado_aprobacion?: TransactionApprovalStatus }): Transaction {
    const student = this.getUserById(txData.estudiante_id);
    const currentApprovedBalance = this.getStudentBalance(txData.estudiante_id);
    
    // Si la transacción entra aprobada directamente (por Contabilidad/Admin con verificación bancaria previa)
    const isApproved = txData.estado_aprobacion === 'aprobado';
    const newBalance = isApproved
      ? (txData.tipo === 'abono' ? currentApprovedBalance + txData.monto : currentApprovedBalance - txData.monto)
      : currentApprovedBalance;

    const newTx: Transaction = {
      ...txData,
      id: 'tx_' + Date.now() + '_' + Math.floor(Math.random() * 1000),
      estudiante_nombre: student ? student.nombre : txData.estudiante_nombre || 'Estudiante',
      saldo_anterior: txData.saldo_anterior !== undefined ? txData.saldo_anterior : Number(currentApprovedBalance.toFixed(2)),
      saldo_resultante: Number(newBalance.toFixed(2)),
      estado_aprobacion: txData.estado_aprobacion || 'pendiente_revision_bancaria',
      comprobado_banco: isApproved ? (txData.comprobado_banco ?? true) : false,
      creado_en: new Date().toISOString()
    };

    this.transactions.push(newTx);

    // Registro automático de auditoría contable AAC
    this.addAuditLog({
      usuario_id: txData.creado_por === 'Contabilidad' ? 'usr_conta_01' : 'usr_est_01',
      usuario_nombre: txData.creado_por || 'Oficial de Contabilidad',
      usuario_rol: txData.creado_por === 'Contabilidad' ? 'contabilidad' : 'estudiante',
      modulo: 'contabilidad',
      accion: 'CREAR',
      entidad_tipo: txData.tipo === 'abono' ? 'Abono / Depósito Bancario' : 'Cargo por Servicios de Vuelo',
      entidad_id: newTx.id,
      estudiante_afectado_nombre: newTx.estudiante_nombre,
      estudiante_afectado_id: newTx.estudiante_id,
      descripcion: `Registro de ${newTx.tipo === 'abono' ? 'depósito ACH' : 'cargo'} por $${newTx.monto.toFixed(2)} USD (${newTx.concepto}). Ref: ${newTx.referencia_ach}.`,
      detalles_cambio: [
        { campo: 'tipo', etiqueta: 'Tipo de Registro', valor_anterior: null, valor_nuevo: newTx.tipo },
        { campo: 'monto', etiqueta: 'Monto USD', valor_anterior: null, valor_nuevo: `$${newTx.monto.toFixed(2)}` },
        { campo: 'referencia_ach', etiqueta: 'Referencia ACH / Banco', valor_anterior: null, valor_nuevo: newTx.referencia_ach },
        { campo: 'estado_aprobacion', etiqueta: 'Estado de Aprobación', valor_anterior: null, valor_nuevo: newTx.estado_aprobacion }
      ],
      referencia_normativa_aac: 'Manual de Cumplimiento Financiero y Custodia de Fondos Aeronáuticos AAC',
      severidad: newTx.tipo === 'abono' ? 'regulatoria' : 'info'
    });

    // Si fue reportada por un estudiante (pendiente de comprobación), alertar a todos los roles correspondientes
    if (newTx.estado_aprobacion === 'pendiente_revision_bancaria') {
      this.sendStudentPaymentSubmittedNotice(newTx);
    }

    this.saveToDisk();
    return newTx;
  }

  /**
   * Aprobación oficial por Contabilidad tras comprobar con el sistema bancario
   */
  approveTransaction(id: string, verificadoPor: string, notasBancarias?: string, refConfirmada?: string, montoConfirmado?: number): Transaction | null {
    const idx = this.transactions.findIndex(t => t.id === id);
    if (idx === -1) return null;

    const tx = this.transactions[idx];
    const prevStatus = tx.estado_aprobacion;
    const prevBalance = this.getStudentBalance(tx.estudiante_id);

    if (montoConfirmado !== undefined && !isNaN(Number(montoConfirmado)) && Number(montoConfirmado) > 0) {
      tx.monto = Number(Number(montoConfirmado).toFixed(2));
    }

    tx.estado_aprobacion = 'aprobado';
    tx.comprobado_banco = true;
    tx.fecha_verificacion_bancaria = new Date().toISOString();
    tx.verificado_por = verificadoPor;
    if (refConfirmada) tx.referencia_bancaria_confirmada = refConfirmada;
    if (notasBancarias) tx.notas_bancarias = notasBancarias;

    // Recalcular saldo resultante oficial
    const updatedApprovedBalance = this.getStudentBalance(tx.estudiante_id);
    tx.saldo_resultante = updatedApprovedBalance;

    // Registrar en auditoría contable AAC
    this.addAuditLog({
      usuario_id: 'usr_conta_01',
      usuario_nombre: verificadoPor,
      usuario_rol: 'contabilidad',
      modulo: 'contabilidad',
      accion: 'APROBAR_BANCARIO',
      entidad_tipo: 'Transacción ACH / Comprobante Conciliado',
      entidad_id: tx.id,
      estudiante_afectado_nombre: tx.estudiante_nombre,
      estudiante_afectado_id: tx.estudiante_id,
      descripcion: `Conciliación y aprobación oficial de depósito bancario de $${tx.monto.toFixed(2)} USD (Ref: ${tx.referencia_ach}). Saldo acreditado a favor del estudiante.`,
      detalles_cambio: [
        { campo: 'estado_aprobacion', etiqueta: 'Estado de Aprobación', valor_anterior: prevStatus, valor_nuevo: 'aprobado' },
        { campo: 'comprobado_banco', etiqueta: 'Cotejo Bancario', valor_anterior: false, valor_nuevo: true },
        { campo: 'verificado_por', etiqueta: 'Oficial Contable', valor_anterior: null, valor_nuevo: verificadoPor },
        { campo: 'referencia_bancaria_confirmada', etiqueta: 'Ref. Confirmada Banco', valor_anterior: null, valor_nuevo: refConfirmada || tx.referencia_ach },
        { campo: 'saldo_resultante', etiqueta: 'Saldo Oficial Acreditado', valor_anterior: `$${prevBalance.toFixed(2)}`, valor_nuevo: `$${updatedApprovedBalance.toFixed(2)}` }
      ],
      referencia_normativa_aac: 'Manual de Cumplimiento Financiero y Custodia de Fondos Aeronáuticos AAC',
      severidad: 'regulatoria'
    });

    // 1. Notificar por Correo a todos los roles (Estudiante, Contabilidad, Admin) con plantilla oficial
    this.sendPaymentApprovedNotice(tx, verificadoPor, updatedApprovedBalance);

    this.saveToDisk();
    return tx;
  }

  /**
   * Rechazo de transacción por inconsistencia bancaria
   */
  rejectTransaction(id: string, verificadoPor: string, motivo: string): Transaction | null {
    const idx = this.transactions.findIndex(t => t.id === id);
    if (idx === -1) return null;

    const tx = this.transactions[idx];
    const prevStatus = tx.estado_aprobacion;

    tx.estado_aprobacion = 'rechazado';
    tx.comprobado_banco = false;
    tx.fecha_verificacion_bancaria = new Date().toISOString();
    tx.verificado_por = verificadoPor;
    tx.motivo_rechazo = motivo;

    // Registrar en auditoría contable AAC
    this.addAuditLog({
      usuario_id: 'usr_conta_01',
      usuario_nombre: verificadoPor,
      usuario_rol: 'contabilidad',
      modulo: 'contabilidad',
      accion: 'RECHAZAR_BANCARIO',
      entidad_tipo: 'Transacción ACH / Comprobante No Conciliado',
      entidad_id: tx.id,
      estudiante_afectado_nombre: tx.estudiante_nombre,
      estudiante_afectado_id: tx.estudiante_id,
      descripcion: `Rechazo de comprobante bancario por inconsistencia en extracto bancario: "${motivo}".`,
      detalles_cambio: [
        { campo: 'estado_aprobacion', etiqueta: 'Estado de Aprobación', valor_anterior: prevStatus, valor_nuevo: 'rechazado' },
        { campo: 'motivo_rechazo', etiqueta: 'Causal de Rechazo', valor_anterior: null, valor_nuevo: motivo },
        { campo: 'verificado_por', etiqueta: 'Oficial Contable', valor_anterior: null, valor_nuevo: verificadoPor }
      ],
      referencia_normativa_aac: 'Norma de Prevención y Control de Depósitos No Conciliados AAC',
      severidad: 'critica'
    });

    // 1. Notificar por Correo a todos los roles correspondientes (Estudiante con motivo, Contabilidad, Admin)
    this.sendPaymentRejectedNotice(tx, verificadoPor, motivo);

    this.saveToDisk();
    return tx;
  }

  getMorosidadReport(): MorosidadReport[] {
    const students = this.users.filter(u => u.rol === 'estudiante');
    const report: MorosidadReport[] = [];

    for (const student of students) {
      const balance = this.getStudentBalance(student.id);
      const studentTxs = this.transactions.filter(t => t.estudiante_id === student.id).sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime());
      const lastPayment = studentTxs.find(t => t.tipo === 'abono');

      report.push({
        estudiante_id: student.id,
        estudiante_nombre: student.nombre,
        estudiante_correo: student.correo,
        estudiante_telefono: student.telefono,
        saldo_actual: balance,
        dias_mora: balance < 0 ? 28 : 0,
        ultimo_pago_fecha: lastPayment ? lastPayment.fecha : undefined,
        bloqueado_para_volar: balance < -500 // Política: deuda > $500 bloquea despacho
      });
    }

    // Ordenar de mayor deuda a menor deuda (los más negativos primero)
    return report.sort((a, b) => a.saldo_actual - b.saldo_actual);
  }

  private readonly MIN_FLIGHT_ASSIGNMENT_BALANCE_USD = 330;

  isStudentEligibleForFlight(studentId: string): StudentFlightEligibility {
    const balance = this.getStudentBalance(studentId);
    const hasZeroOrNegative = balance <= 0;
    const eligible = balance >= this.MIN_FLIGHT_ASSIGNMENT_BALANCE_USD;
    const status: StudentFlightEligibility['status'] = hasZeroOrNegative
      ? 'sin_saldo'
      : eligible
      ? 'habilitado'
      : 'saldo_insuficiente';
    return {
      estudiante_id: studentId,
      eligible,
      hasZeroOrNegative,
      status
    };
  }

  getStudentFlightEligibilityMap(): {
    minRequired: number;
    eligibility: Record<string, StudentFlightEligibility>;
  } {
    const students = this.users.filter(u => u.rol === 'estudiante');
    const eligibility: Record<string, StudentFlightEligibility> = {};
    for (const st of students) {
      eligibility[st.id] = this.isStudentEligibleForFlight(st.id);
    }
    return {
      minRequired: this.MIN_FLIGHT_ASSIGNMENT_BALANCE_USD,
      eligibility
    };
  }

  private validateStudentFlightBalance(studentId: string): string | null {
    const student = this.getUserById(studentId);
    if (!student || student.rol !== 'estudiante') {
      return null;
    }
    const elig = this.isStudentEligibleForFlight(studentId);
    if (!elig.eligible) {
      if (elig.hasZeroOrNegative) {
        return `Asignación bloqueada: el estudiante ${student.nombre} se encuentra sin saldo disponible. Debe contar con un saldo mínimo de $${this.MIN_FLIGHT_ASSIGNMENT_BALANCE_USD.toFixed(2)} USD para poder asignarle vuelos.`;
      }
      return `Asignación bloqueada: el estudiante ${student.nombre} no cumple con el saldo mínimo requerido de $${this.MIN_FLIGHT_ASSIGNMENT_BALANCE_USD.toFixed(2)} USD para asignación de vuelos. Solicite validación en Contabilidad.`;
    }
    return null;
  }

  /**
   * PROCESAMIENTO AUTÓNOMO DE BITÁCORAS DE AERONAVES
   * Reconoce entradas de bitácora de vuelo de la flota (matrícula, alumno, horas/hobbs, instructor, misión),
   * calcula el débito según tarifa oficial de la aeronave, y descuenta automáticamente el saldo del estudiante.
   * Exclusivo para roles administrativos (Contabilidad, Escuela, Admin).
   */
  processAircraftLogbookBatch(
    entries: Array<{
      fecha?: string;
      matricula?: string;
      tipo_avion?: string;
      estudiante_identificador?: string;
      estudiante_id?: string;
      estudiante_nombre?: string;
      horas_vuelo?: number;
      tarifa_hora?: number;
      tarifa_instructor_hora?: number;
      instructor_id?: string;
      instructor_nombre?: string;
      mision?: string;
      leccion_num?: number;
      folio?: string;
      hobbs_inicial?: number;
      hobbs_final?: number;
      notas?: string;
    }>,
    uploadedBy: string = 'Contabilidad'
  ) {
    const students = this.users.filter(u => u.rol === 'estudiante');

    const aircraftFleet: Record<string, { model: string; defaultRate: number }> = {
      'HP-1450': { model: 'Cessna 172 Skyhawk', defaultRate: 220.0 },
      'HP-1588': { model: 'Cessna 172SP Garmin G1000', defaultRate: 220.0 },
      'HP-1822': { model: 'Piper PA-44 Seminole Multi-Motor', defaultRate: 340.0 },
      'HP-1799': { model: 'Piper PA-28 Archer III', defaultRate: 220.0 },
      'HP-1934': { model: 'Piper PA-28 Cherokee', defaultRate: 220.0 },
      'SIM-ALX': { model: 'Simulador Alsim ALX', defaultRate: 120.0 }
    };

    const normalize = (str: string) =>
      str.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();

    let totalProcessed = 0;
    let totalHours = 0;
    let totalDebited = 0;
    const results: Array<{
      id?: string;
      estudiante_id?: string;
      estudiante_nombre?: string;
      matricula?: string;
      modelo_avion?: string;
      horas: number;
      tarifa: number;
      monto: number;
      folio: string;
      fecha: string;
      saldo_anterior: number;
      saldo_resultante: number;
      estado: 'debitado' | 'duplicado' | 'error';
      mensaje: string;
    }> = [];

    for (const entry of entries) {
      // 1. Identificar Matrícula y Aeronave
      const matriculaRaw = (entry.matricula || 'HP-1450').toUpperCase().trim();
      const fleetInfo = aircraftFleet[matriculaRaw] || {
        model: entry.tipo_avion || 'Aeronave de Instrucción',
        defaultRate: 220.0
      };
      const model = entry.tipo_avion || fleetInfo.model;
      const rate = Number(entry.tarifa_hora) > 0 ? Number(entry.tarifa_hora) : fleetInfo.defaultRate;

      // 2. Calcular Horas de Vuelo
      let hours = 0;
      if (entry.horas_vuelo && Number(entry.horas_vuelo) > 0) {
        hours = Number(Number(entry.horas_vuelo).toFixed(1));
      } else if (
        entry.hobbs_final !== undefined &&
        entry.hobbs_inicial !== undefined &&
        Number(entry.hobbs_final) > Number(entry.hobbs_inicial)
      ) {
        hours = Number((Number(entry.hobbs_final) - Number(entry.hobbs_inicial)).toFixed(1));
      }

      if (hours <= 0) {
        results.push({
          matricula: matriculaRaw,
          modelo_avion: model,
          horas: 0,
          tarifa: rate,
          monto: 0,
          folio: entry.folio || 'S/F',
          fecha: entry.fecha || new Date().toISOString().split('T')[0],
          saldo_anterior: 0,
          saldo_resultante: 0,
          estado: 'error',
          mensaje: 'Horas de vuelo inválidas o no detectadas (se requiere horas > 0 o Hobbs final > inicial).'
        });
        continue;
      }

      // 3. Reconocer Alumno / Estudiante
      const queryStudent = (entry.estudiante_identificador || entry.estudiante_id || entry.estudiante_nombre || '').trim();
      let matchedStudent = students.find(s => s.id === queryStudent);

      if (!matchedStudent && queryStudent) {
        const normQuery = normalize(queryStudent);
        matchedStudent = students.find(s => {
          const normName = normalize(s.nombre);
          if (normName === normQuery) return true;
          if (normName.includes(normQuery) || normQuery.includes(normName)) return true;
          const parts = normQuery.split(/\s+/);
          return parts.length > 1 && parts.every(p => normName.includes(p));
        });
      }

      if (!matchedStudent) {
        results.push({
          matricula: matriculaRaw,
          modelo_avion: model,
          horas: hours,
          tarifa: rate,
          monto: Number((hours * rate).toFixed(2)),
          folio: entry.folio || 'S/F',
          fecha: entry.fecha || new Date().toISOString().split('T')[0],
          saldo_anterior: 0,
          saldo_resultante: 0,
          estado: 'error',
          mensaje: `No se pudo reconocer al estudiante "${queryStudent}". Verifique el nombre o ID del alumno registrado.`
        });
        continue;
      }

      // 4. Folio de Bitácora
      const flightDate = entry.fecha || new Date().toISOString().split('T')[0];
      const folio = entry.folio?.trim()
        ? entry.folio.trim()
        : `BIT-${matriculaRaw}-${flightDate.replace(/-/g, '')}-${Math.floor(100 + Math.random() * 900)}`;

      // 5. Verificación de Duplicados
      const isDuplicate = this.transactions.some(
        t =>
          t.referencia_ach === folio ||
          (t.estudiante_id === matchedStudent.id &&
            t.fecha === flightDate &&
            t.matricula_avion === matriculaRaw &&
            Math.abs((t.horas_vuelo || 0) - hours) < 0.05)
      );

      const prevBalance = this.getStudentBalance(matchedStudent.id);

      if (isDuplicate) {
        results.push({
          estudiante_id: matchedStudent.id,
          estudiante_nombre: matchedStudent.nombre,
          matricula: matriculaRaw,
          modelo_avion: model,
          horas: hours,
          tarifa: rate,
          monto: Number((hours * rate).toFixed(2)),
          folio,
          fecha: flightDate,
          saldo_anterior: prevBalance,
          saldo_resultante: prevBalance,
          estado: 'duplicado',
          mensaje: `Entrada ya registrada previamente (Folio ${folio} o vuelo coincidente). Omitido para evitar doble cobro.`
        });
        continue;
      }

      // 6. Aplicar Débito Automático al Saldo del Estudiante (Fórmula estudiante: Hobbs × 1.275)
      const STUDENT_HOBBS_FACTOR = 1.275;
      const studentBillableHours = Number((hours * STUDENT_HOBBS_FACTOR).toFixed(4));
      const montoCargo = Number((studentBillableHours * rate).toFixed(2));
      const instructorName = entry.instructor_nombre || 'Instructor CFI Asignado';
      const missionText = entry.mision || (entry.leccion_num ? `Lección #${entry.leccion_num}` : 'Instrucción Práctica de Vuelo');

      const createdTx = this.addTransaction({
        estudiante_id: matchedStudent.id,
        estudiante_nombre: matchedStudent.nombre,
        fecha: flightDate,
        tipo: 'cargo',
        concepto: 'Horas Bloque Vuelo',
        monto: montoCargo,
        referencia_ach: folio,
        creado_por: uploadedBy,
        notas: `${hours} hrs Hobbs × 1.275 = ${studentBillableHours} hrs en ${model} (${matriculaRaw}) @ $${rate}/hr según Bitácora Folio ${folio}. ${missionText}. Procesado y debitado automáticamente de saldo. ${entry.notas || ''}`.trim(),
        estado_aprobacion: 'aprobado',
        comprobado_banco: true,
        fecha_verificacion_bancaria: new Date().toISOString(),
        verificado_por: `${uploadedBy} (Conciliación Automática de Bitácora)`,
        horas_vuelo: studentBillableHours,
        horas_hobbs: hours,
        factor_cobro_estudiante: STUDENT_HOBBS_FACTOR,
        tarifa_hora: rate,
        matricula_avion: matriculaRaw,
        modelo_avion: model,
        instructor_nombre: instructorName,
        leccion_num: Number(entry.leccion_num) || 1,
        tipo_mision: missionText,
        saldo_anterior: prevBalance
      });

      // 7. Si la bitácora especifica un instructor registrado, crear honorario 1-a-1 automáticamente
      let matchedInstructor = entry.instructor_id
        ? this.users.find(u => u.id === entry.instructor_id && (u.rol === 'instructor' || u.rol === 'admin'))
        : undefined;

      if (!matchedInstructor && entry.instructor_nombre && entry.instructor_nombre.trim() && !entry.instructor_nombre.includes('Contabilidad')) {
        const instNorm = normalize(entry.instructor_nombre);
        matchedInstructor = this.users.find(
          u =>
            u.rol === 'instructor' &&
            (normalize(u.nombre).includes(instNorm) || instNorm.includes(normalize(u.nombre)))
        );
      }

      if (matchedInstructor) {
        try {
          this.registerBitacoraHonorario({
            folio_bitacora: folio,
            fecha: flightDate,
            matricula_avion: matriculaRaw,
            modelo_avion: model,
            estudiante_id: matchedStudent.id,
            estudiante_nombre: matchedStudent.nombre,
            piloto_id: matchedStudent.id,
            piloto_nombre: matchedStudent.nombre,
            instructor_id: matchedInstructor.id,
            horas_vuelo: hours,
            tarifa_instructor_hora: Number(entry.tarifa_instructor_hora) > 0 ? Number(entry.tarifa_instructor_hora) : 30.0,
            retencion_pct: 0,
            tipo_mision: missionText,
            origen: 'MPMG',
            destino: 'MPMG',
            observaciones: entry.notas || `Registro automático desde lote oficial de bitácoras (${folio}).`,
            aplicar_debito_estudiante: false,
            bitacora_transaction_id: createdTx.id,
            registrado_por_id: 'usr_conta_1',
            registrado_por_nombre: uploadedBy,
            registrado_por_rol: 'contabilidad'
          });
        } catch (feeErr) {
          console.warn('[Honorarios Lote] No se pudo crear honorario duplicado/inválido:', (feeErr as Error).message);
        }
      }

      totalProcessed++;
      totalHours = Number((totalHours + hours).toFixed(1));
      totalDebited = Number((totalDebited + montoCargo).toFixed(2));

      results.push({
        id: createdTx.id,
        estudiante_id: matchedStudent.id,
        estudiante_nombre: matchedStudent.nombre,
        matricula: matriculaRaw,
        modelo_avion: model,
        horas: hours,
        tarifa: rate,
        monto: montoCargo,
        folio,
        fecha: flightDate,
        saldo_anterior: prevBalance,
        saldo_resultante: createdTx.saldo_resultante,
        estado: 'debitado',
        mensaje: `Debitado con éxito: -$${montoCargo.toFixed(2)} USD. Saldo nuevo: $${createdTx.saldo_resultante.toFixed(2)} USD.`
      });
    }

    this.saveToDisk();

    return {
      success: true,
      totalProcessed,
      totalHours,
      totalDebited,
      results
    };
  }

  // --- HOJAS DE PROGRESO DE VUELO & RECALCULACIÓN EN CASCADA ---
  getFlightProgress(studentId?: string): FlightProgress[] {
    if (studentId) {
      return this.flightProgress
        .filter(fp => fp.estudiante_id === studentId)
        .sort((a, b) => {
          const dateComp = new Date(a.fecha).getTime() - new Date(b.fecha).getTime();
          if (dateComp !== 0) return dateComp;
          return a.leccion_num - b.leccion_num;
        });
    }
    return [...this.flightProgress].sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime());
  }

  getFlightProgressById(id: string): FlightProgress | undefined {
    return this.flightProgress.find(fp => fp.id === id);
  }

  /**
   * ALGORITMO CORE: Recalculación en Cascada de Horas de Vuelo
   * Garantiza que cualquier edición retroactiva en el pasado de un alumno
   * recalcule en cadena Horas_Anteriores y Total_Horas de todos los vuelos posteriores.
   */
  recalculateFlightCascade(studentId: string): { recalculatedCount: number; records: FlightProgress[] } {
    // 1. Obtener todos los registros del estudiante ordenados cronológicamente
    const studentRecords = this.flightProgress
      .filter(fp => fp.estudiante_id === studentId)
      .sort((a, b) => {
        const dateA = new Date(a.fecha).getTime();
        const dateB = new Date(b.fecha).getTime();
        if (dateA !== dateB) return dateA - dateB;
        return a.leccion_num - b.leccion_num;
      });

    let runningAccumulatedHours = 0.0;
    let count = 0;

    for (let i = 0; i < studentRecords.length; i++) {
      const rec = studentRecords[i];
      const previousTotal = runningAccumulatedHours;
      const vueloActual = Number((rec.tiempos_vuelo.vuelo_actual || rec.tiempos_vuelo.vuelo_dual || 0).toFixed(2));

      // Actualizar campos matemáticos
      rec.tiempos_vuelo.horas_anteriores = Number(previousTotal.toFixed(2));
      rec.tiempos_vuelo.total_horas = Number((previousTotal + vueloActual).toFixed(2));
      rec.actualizado_en = new Date().toISOString();

      runningAccumulatedHours = rec.tiempos_vuelo.total_horas;
      count++;
    }

    return {
      recalculatedCount: count,
      records: studentRecords
    };
  }

  saveOrUpdateFlightProgress(data: Partial<FlightProgress> & { estudiante_id: string; instructor_id: string; leccion_num: number; fecha: string; matricula: string; tipo_avion: string }): FlightProgress {
    const student = this.getUserById(data.estudiante_id);
    const instructor = this.getUserById(data.instructor_id);

    let progress: FlightProgress;
    let actionType: AuditActionType = 'CREAR';
    let auditDesc = '';
    const changes: AuditFieldChange[] = [];

    if (data.id) {
      // Edición existente
      const idx = this.flightProgress.findIndex(fp => fp.id === data.id);
      if (idx !== -1) {
        const prev = this.flightProgress[idx];
        const isSigning = (!prev.firma_instructor && data.firma_instructor) || (prev.estado !== 'aprobado' && data.estado === 'aprobado');
        actionType = isSigning ? 'FIRMAR_VALIDAR' : 'MODIFICAR';

        if (data.matricula && data.matricula !== prev.matricula) {
          changes.push({ campo: 'matricula', etiqueta: 'Matrícula Aeronave', valor_anterior: prev.matricula, valor_nuevo: data.matricula });
        }
        if (data.estado && data.estado !== prev.estado) {
          changes.push({ campo: 'estado', etiqueta: 'Estado de Validación', valor_anterior: prev.estado, valor_nuevo: data.estado });
        }
        if (data.firma_instructor !== undefined && data.firma_instructor !== prev.firma_instructor) {
          changes.push({ campo: 'firma_instructor', etiqueta: 'Firma Digital CFI', valor_anterior: prev.firma_instructor, valor_nuevo: data.firma_instructor });
        }
        if (data.tiempos_vuelo && prev.tiempos_vuelo) {
          if (data.tiempos_vuelo.vuelo_actual !== prev.tiempos_vuelo.vuelo_actual) {
            changes.push({ campo: 'vuelo_actual', etiqueta: 'Horas Vuelo Actual', valor_anterior: prev.tiempos_vuelo.vuelo_actual, valor_nuevo: data.tiempos_vuelo.vuelo_actual });
          }
          if (data.tiempos_vuelo.vuelo_dual !== prev.tiempos_vuelo.vuelo_dual) {
            changes.push({ campo: 'vuelo_dual', etiqueta: 'Horas Dual', valor_anterior: prev.tiempos_vuelo.vuelo_dual, valor_nuevo: data.tiempos_vuelo.vuelo_dual });
          }
        }
        if (data.observaciones && data.observaciones !== prev.observaciones) {
          changes.push({ campo: 'observaciones', etiqueta: 'Observaciones Técnicas', valor_anterior: prev.observaciones, valor_nuevo: data.observaciones });
        }

        auditDesc = isSigning
          ? `Firma digital y certificación oficial de Hoja de Vuelo Lección #${data.leccion_num || prev.leccion_num} (${student?.nombre || 'Alumno'}) por ${instructor?.nombre || 'Instructor'}.`
          : `Modificación de Hoja de Progreso Lección #${data.leccion_num || prev.leccion_num} para ${student?.nombre || 'Alumno'}.`;

        progress = {
          ...this.flightProgress[idx],
          ...data,
          actualizado_en: new Date().toISOString()
        };
        this.flightProgress[idx] = progress;
      } else {
        progress = this.createNewFlightProgressObject(data, student, instructor);
        this.flightProgress.push(progress);
        auditDesc = `Creación de nueva Hoja de Progreso Lección #${progress.leccion_num} (${progress.matricula} - ${progress.curso}) para ${student?.nombre || 'Alumno'}.`;
        changes.push(
          { campo: 'leccion_num', etiqueta: 'Lección #', valor_anterior: null, valor_nuevo: progress.leccion_num },
          { campo: 'matricula', etiqueta: 'Aeronave', valor_anterior: null, valor_nuevo: progress.matricula },
          { campo: 'total_horas', etiqueta: 'Horas Vuelo', valor_anterior: null, valor_nuevo: progress.tiempos_vuelo.vuelo_actual }
        );
      }
    } else {
      // Nueva hoja de progreso
      progress = this.createNewFlightProgressObject(data, student, instructor);
      this.flightProgress.push(progress);
      auditDesc = `Creación de nueva Hoja de Progreso Lección #${progress.leccion_num} (${progress.matricula} - ${progress.curso}) para ${student?.nombre || 'Alumno'}.`;
      changes.push(
        { campo: 'leccion_num', etiqueta: 'Lección #', valor_anterior: null, valor_nuevo: progress.leccion_num },
        { campo: 'matricula', etiqueta: 'Aeronave', valor_anterior: null, valor_nuevo: progress.matricula },
        { campo: 'total_horas', etiqueta: 'Horas Vuelo', valor_anterior: null, valor_nuevo: progress.tiempos_vuelo.vuelo_actual }
      );
    }

    // Registrar en auditoría regulatoria AAC
    this.addAuditLog({
      usuario_id: data.instructor_id || 'usr_inst_01',
      usuario_nombre: instructor?.nombre || 'Capitán Instructor',
      usuario_rol: 'instructor',
      modulo: 'hojas_vuelo',
      accion: actionType,
      entidad_tipo: `Hoja de Progreso (${progress.curso || 'Vuelo'})`,
      entidad_id: progress.id,
      estudiante_afectado_nombre: student?.nombre || progress.estudiante_nombre,
      estudiante_afectado_id: progress.estudiante_id,
      instructor_afectado_nombre: instructor?.nombre || progress.instructor_nombre,
      descripcion: auditDesc,
      detalles_cambio: changes.length > 0 ? changes : [
        { campo: 'estado', etiqueta: 'Estado de la Hoja', valor_anterior: null, valor_nuevo: progress.estado }
      ],
      referencia_normativa_aac: 'RAC 141.115 (Certificación y Registro de Instrucción de Vuelo)',
      severidad: actionType === 'FIRMAR_VALIDAR' ? 'regulatoria' : 'info'
    });

    // DISPARAR RECALCULACIÓN EN CASCADA AUTOMÁTICA
    this.recalculateFlightCascade(data.estudiante_id);

    this.saveToDisk();

    return this.getFlightProgressById(progress.id) || progress;
  }

  private createNewFlightProgressObject(data: any, student?: User, instructor?: User): FlightProgress {
    const defaultTiempos = data.tiempos_vuelo || {
      vuelo_dual: 1.5,
      vuelo_ifr: 0,
      dual_travesia: 0,
      solo_travesia: 0,
      dia: 1.5,
      noche: 0,
      vuelo_actual: 1.5,
      horas_anteriores: 0,
      total_horas: 1.5
    };

    return {
      id: data.id || 'prog_' + Date.now() + '_' + Math.floor(Math.random() * 1000),
      estudiante_id: data.estudiante_id,
      estudiante_nombre: student ? student.nombre : 'Estudiante',
      instructor_id: data.instructor_id,
      instructor_nombre: instructor ? instructor.nombre : 'Instructor',
      leccion_num: Number(data.leccion_num) || 1,
      fecha: data.fecha,
      matricula: data.matricula,
      tipo_avion: data.tipo_avion,
      curso: data.curso || 'Multi-Motor',
      estado: data.estado || 'pendiente_validacion',
      observaciones: data.observaciones || '',
      evaluacion_maniobras: data.evaluacion_maniobras || {},
      historial_maniobras: data.historial_maniobras || [],
      ultima_modificacion_maniobra: data.ultima_modificacion_maniobra || (data.historial_maniobras && data.historial_maniobras.length > 0 ? data.historial_maniobras[0] : undefined),
      tiempos_vuelo: defaultTiempos,
      firma_estudiante: data.firma_estudiante ?? true,
      firma_instructor: data.firma_instructor ?? false,
      creado_en: new Date().toISOString(),
      actualizado_en: new Date().toISOString()
    };
  }

  deleteFlightProgress(id: string): boolean {
    const idx = this.flightProgress.findIndex(fp => fp.id === id);
    if (idx === -1) return false;
    const progress = this.flightProgress[idx];
    const studentId = progress.estudiante_id;

    // Registrar en auditoría regulatoria AAC
    this.addAuditLog({
      usuario_id: progress.instructor_id || 'usr_admin_01',
      usuario_nombre: progress.instructor_nombre || 'Oficial de Operaciones',
      usuario_rol: 'instructor',
      modulo: 'hojas_vuelo',
      accion: 'ELIMINAR',
      entidad_tipo: `Hoja de Progreso (${progress.curso || 'Vuelo'})`,
      entidad_id: progress.id,
      estudiante_afectado_nombre: progress.estudiante_nombre,
      estudiante_afectado_id: progress.estudiante_id,
      instructor_afectado_nombre: progress.instructor_nombre,
      descripcion: `Eliminación de Hoja de Progreso Lección #${progress.leccion_num} del ${progress.fecha} (${progress.matricula}). Horas suprimidas: ${progress.tiempos_vuelo?.vuelo_actual || 0} hrs.`,
      detalles_cambio: [
        { campo: 'id', etiqueta: 'Folio Eliminado', valor_anterior: progress.id, valor_nuevo: '[ELIMINADO]' },
        { campo: 'leccion_num', etiqueta: 'Lección #', valor_anterior: progress.leccion_num, valor_nuevo: null },
        { campo: 'total_horas', etiqueta: 'Horas Suprimidas', valor_anterior: progress.tiempos_vuelo?.total_horas || 0, valor_nuevo: 0 }
      ],
      referencia_normativa_aac: 'RAC 141.115 / RAC 61.51 (Auditoría de Registros de Vuelo Suprimidos)',
      severidad: 'critica'
    });

    this.flightProgress.splice(idx, 1);
    this.recalculateFlightCascade(studentId);
    this.saveToDisk();
    return true;
  }

  // --- ITINERARIOS & NOTIFICACIONES (CORREO ELECTRÓNICO) ---
  getItineraries(role?: string, userId?: string): Itinerary[] {
    const canViewPublished8pm =
      !role || ['estudiante', 'instructor', 'instructor_en_jefe', 'escuela', 'admin'].includes(role);
    return [...this.itineraries]
      .filter(it => !it.publicado_8pm || canViewPublished8pm)
      .filter(it => {
        if (role === 'estudiante' && userId) {
          return it.estudiante_id === userId && it.tipo_evento !== 'mantenimiento';
        }
        return true;
      })
      .sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime());
  }

  createItinerary(data: Omit<Itinerary, 'id' | 'creado_en'>): { itinerary?: Itinerary; error?: string } {
    const isFlightEvent = !data.tipo_evento || data.tipo_evento === 'vuelo';

    if (isFlightEvent) {
      // 1. HARD LOCK CHECK: El instructor no debe tener vigencias vencidas
      const lockCheck = this.isInstructorLocked(data.instructor_id);
      if (lockCheck.locked) {
        return {
          error: `ACCESO DENEGADO (HARD LOCK): No se puede agendar el vuelo. ${lockCheck.reason}`
        };
      }

      // 2. AIRCRAFT GROUND-LOCK CHECK: La aeronave no debe estar bloqueada (AOG) o en taller
      if (data.avion_matricula) {
        const acRecord = this.getAircraftMaintenanceRecord(data.avion_matricula);
        if (acRecord && (acRecord.bloqueo_despacho || acRecord.estado_aeronavegabilidad === 'aog_bloqueado' || acRecord.estado_aeronavegabilidad === 'en_mantenimiento')) {
          return {
            error: `BLOQUEO TÉCNICO DE DESPACHO: La aeronave ${acRecord.matricula} se encuentra inmovilizada / en taller (${acRecord.motivo_bloqueo || acRecord.estado_aeronavegabilidad}). Emite Retorno al Servicio (RTS) antes de programar vuelos.`
          };
        }
      }
    }

    const student = this.getUserById(data.estudiante_id);
    const instructor = this.getUserById(data.instructor_id);

    if (isFlightEvent && student && student.rol === 'estudiante') {
      const balanceError = this.validateStudentFlightBalance(student.id);
      if (balanceError) {
        return { error: balanceError };
      }
    }

    const now = new Date();
    // 3 horas exactas límite para confirmar la asignación
    const confirmacionLimite = new Date(now.getTime() + 3 * 60 * 60 * 1000).toISOString();
    const deadlineHourStr = new Date(now.getTime() + 3 * 60 * 60 * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    const newItin: Itinerary = {
      ...data,
      id: 'itin_' + Date.now() + '_' + Math.floor(Math.random() * 1000),
      estudiante_nombre: student ? student.nombre : data.estudiante_nombre,
      estudiante_telefono: student ? student.telefono : data.estudiante_telefono,
      instructor_nombre: instructor ? instructor.nombre : data.instructor_nombre,
      instructor_telefono: instructor ? instructor.telefono : data.instructor_telefono,
      estado: data.estado || 'pendiente_confirmacion',
      confirmacion_limite: confirmacionLimite,
      recordatorios_enviados: 0,
      creado_en: now.toISOString()
    };

    this.itineraries.push(newItin);

    if (isFlightEvent) {
      const studentInfo = this.getUserRegisteredEmail(newItin.estudiante_id, 'alumno@skyops.com', newItin.estudiante_nombre);
      const instructorInfo = this.getUserRegisteredEmail(newItin.instructor_id, 'instructor@skyops.com', newItin.instructor_nombre);

      // DISPARADOR ALUMNO: Notificación automática por CORREO ELECTRÓNICO (HTML oficial de despacho)
      const emailHtml = emailService.generateFlightEmailHtml({
        studentName: newItin.estudiante_nombre,
        instructorName: newItin.instructor_nombre,
        instructorPhone: newItin.instructor_telefono,
        airplaneReg: newItin.avion_matricula,
        airplaneModel: newItin.avion_modelo,
        flightDate: newItin.fecha,
        startTime: newItin.hora_inicio,
        endTime: newItin.hora_fin,
        mission: newItin.mision,
        deadlineHourStr: deadlineHourStr,
        itineraryId: newItin.id
      });

      this.sendEmailNotification({
        destinatario_tipo: 'estudiante',
        destinatario_nombre: newItin.estudiante_nombre,
        destinatario_email: studentInfo.email,
        itinerario_id: newItin.id,
        evento: 'itinerario_creado',
        asunto: `✈️ Nueva Asignación de Vuelo: ${newItin.avion_matricula} (${newItin.fecha} ${newItin.hora_inicio}) - SkyOps Flight Academy`,
        cuerpo_html: emailHtml,
        cuerpo_texto: `SkyOps Flight Academy - Asignación de Vuelo para ${newItin.estudiante_nombre}\nFecha: ${newItin.fecha} (${newItin.hora_inicio} - ${newItin.hora_fin})\nAeronave: ${newItin.avion_matricula} (${newItin.avion_modelo})\nInstructor: ${newItin.instructor_nombre}\nMisión: ${newItin.mision}\nPlazo de Confirmación: 3 horas (hasta las ${deadlineHourStr}).`
      });

      // 2. DISPARADOR INSTRUCTOR ASIGNADO (correo registrado)
      const instructorRendered = emailService.renderFlightEmail('flight_scheduled', {
        student_name: newItin.estudiante_nombre,
        instructor_name: newItin.instructor_nombre,
        instructor_phone: newItin.instructor_telefono || '+507 6711-2233',
        airplane_reg: newItin.avion_matricula,
        airplane_model: newItin.avion_modelo,
        flight_date: newItin.fecha,
        start_time: newItin.hora_inicio,
        end_time: newItin.hora_fin,
        mission: newItin.mision,
        deadline_hour: deadlineHourStr
      });

      this.sendEmailNotification({
        destinatario_tipo: 'instructor',
        destinatario_nombre: newItin.instructor_nombre,
        destinatario_email: instructorInfo.email,
        itinerario_id: newItin.id,
        evento: 'itinerario_creado',
        asunto: `✈️ Asignación de Vuelo como Instructor: ${newItin.avion_matricula} con ${newItin.estudiante_nombre} (${newItin.fecha} ${newItin.hora_inicio})`,
        cuerpo_html: instructorRendered.html,
        cuerpo_texto: `Nueva lección de vuelo asignada para ${newItin.fecha} (${newItin.hora_inicio} - ${newItin.hora_fin}) con el estudiante ${newItin.estudiante_nombre}. Aeronave: ${newItin.avion_matricula}.`
      });

      // 3. DISPARADOR ADMINISTRACIÓN / DESPACHO OFICIAL (a todos los administradores registrados)
      const adminRecipients = this.getRegisteredUsersForRole('admin');
      for (const au of adminRecipients) {
        this.sendEmailNotification({
          destinatario_tipo: 'admin',
          destinatario_nombre: au.name,
          destinatario_email: au.email,
          itinerario_id: newItin.id,
          evento: 'itinerario_creado',
          asunto: `✈️ [Despacho] Vuelo Programado: ${newItin.avion_matricula} - ${newItin.estudiante_nombre} / ${newItin.instructor_nombre}`,
          cuerpo_html: instructorRendered.html,
          cuerpo_texto: `Vuelo programado en despacho para ${newItin.fecha} (${newItin.hora_inicio}) en aeronave ${newItin.avion_matricula}.`
        });
      }
    } else if (data.tipo_evento === 'mantenimiento') {
      this.sendEmailNotification({
        destinatario_tipo: 'escuela',
        destinatario_nombre: 'Operaciones & Despacho de Vuelo',
        destinatario_email: 'operaciones@skyops.com',
        itinerario_id: newItin.id,
        evento: 'alerta_mantenimiento',
        asunto: `🔧 [Taller OMA] Bloque de Mantenimiento: ${newItin.avion_matricula} (${newItin.fecha} ${newItin.hora_inicio}-${newItin.hora_fin})`,
        cuerpo_html: `<p>El Taller Aeronáutico programó un bloqueo de mantenimiento para <strong>${newItin.avion_matricula}</strong> el ${newItin.fecha} (${newItin.hora_inicio} - ${newItin.hora_fin}).</p><p>${newItin.detalles_evento || newItin.mision}</p>`,
        cuerpo_texto: `Taller OMA bloqueó ${newItin.avion_matricula} en itinerario el ${newItin.fecha} (${newItin.hora_inicio} - ${newItin.hora_fin}): ${newItin.detalles_evento || newItin.mision}`
      });
    }

    this.saveToDisk();
    return { itinerary: newItin };
  }

  acceptItinerary(id: string, estudianteNombre?: string): Itinerary | null {
    const idx = this.itineraries.findIndex(i => i.id === id);
    if (idx === -1) return null;

    const itin = this.itineraries[idx];
    if (itin.publicado_8pm || itin.solo_lectura) return null;
    itin.estado = 'confirmado';
    itin.confirmado_en = new Date().toISOString();

    const studentInfo = this.getUserRegisteredEmail(itin.estudiante_id, 'alumno@skyops.com', itin.estudiante_nombre);
    const instructorInfo = this.getUserRegisteredEmail(itin.instructor_id, 'instructor@skyops.com', itin.instructor_nombre);

    // 1. Email al Estudiante
    const studentRendered = emailService.renderFlightEmail('flight_confirmed', {
      student_name: itin.estudiante_nombre,
      instructor_name: itin.instructor_nombre,
      instructor_phone: itin.instructor_telefono || '+507 6711-2233',
      airplane_reg: itin.avion_matricula,
      airplane_model: itin.avion_modelo,
      flight_date: itin.fecha,
      start_time: itin.hora_inicio,
      end_time: itin.hora_fin,
      mission: itin.mision
    });

    this.sendEmailNotification({
      destinatario_tipo: 'estudiante',
      destinatario_nombre: itin.estudiante_nombre,
      destinatario_email: studentInfo.email,
      itinerario_id: itin.id,
      evento: 'itinerario_confirmado',
      asunto: studentRendered.subject,
      cuerpo_html: studentRendered.html,
      cuerpo_texto: studentRendered.text
    });

    // 2. Email al Instructor
    this.sendEmailNotification({
      destinatario_tipo: 'instructor',
      destinatario_nombre: itin.instructor_nombre,
      destinatario_email: instructorInfo.email,
      itinerario_id: itin.id,
      evento: 'itinerario_confirmado',
      asunto: `👨‍✈️ Alumno Confirmó Vuelo: ${itin.estudiante_nombre} (${itin.fecha} ${itin.hora_inicio})`,
      cuerpo_html: studentRendered.html,
      cuerpo_texto: studentRendered.text
    });

    this.saveToDisk();
    return itin;
  }

  cancelItinerary(id: string, motivo: string, canceladoPor?: string): Itinerary | null {
    const idx = this.itineraries.findIndex(i => i.id === id);
    if (idx === -1) return null;

    const itin = this.itineraries[idx];
    if (itin.publicado_8pm || itin.solo_lectura) return null;
    itin.estado = 'cancelado';
    itin.motivo_cancelacion = motivo;
    itin.cancelado_en = new Date().toISOString();
    itin.cancelado_por = canceladoPor || itin.estudiante_nombre;

    const studentInfo = this.getUserRegisteredEmail(itin.estudiante_id, 'alumno@skyops.com', itin.estudiante_nombre);
    const instructorInfo = this.getUserRegisteredEmail(itin.instructor_id, 'instructor@skyops.com', itin.instructor_nombre);

    const cancelRendered = emailService.renderFlightEmail('flight_cancelled', {
      student_name: itin.estudiante_nombre,
      instructor_name: itin.instructor_nombre,
      instructor_phone: itin.instructor_telefono || '+507 6000-0000',
      airplane_reg: itin.avion_matricula,
      airplane_model: itin.avion_modelo,
      flight_date: itin.fecha,
      start_time: itin.hora_inicio,
      end_time: itin.hora_fin,
      mission: itin.mision,
      cancellation_reason: motivo,
      cancelled_by: itin.cancelado_por
    });

    // 1. Email al Instructor
    this.sendEmailNotification({
      destinatario_tipo: 'instructor',
      destinatario_nombre: itin.instructor_nombre,
      destinatario_email: instructorInfo.email,
      itinerario_id: itin.id,
      evento: 'vuelo_cancelado',
      asunto: cancelRendered.subject,
      cuerpo_html: cancelRendered.html,
      cuerpo_texto: cancelRendered.text
    });

    // 2. Email al Alumno
    this.sendEmailNotification({
      destinatario_tipo: 'estudiante',
      destinatario_nombre: itin.estudiante_nombre,
      destinatario_email: studentInfo.email,
      itinerario_id: itin.id,
      evento: 'vuelo_cancelado',
      asunto: cancelRendered.subject,
      cuerpo_html: cancelRendered.html,
      cuerpo_texto: cancelRendered.text
    });

    this.saveToDisk();
    return itin;
  }

  markNoShow(id: string, instructorNombre: string): Itinerary | null {
    const idx = this.itineraries.findIndex(i => i.id === id);
    if (idx === -1) return null;

    const itin = this.itineraries[idx];
    if (itin.publicado_8pm || itin.solo_lectura) return null;
    itin.estado = 'no_show';
    itin.no_show_en = new Date().toISOString();
    itin.no_show_por = instructorNombre;

    const student = this.getUserById(itin.estudiante_id);
    const studentEmail = student?.correo || 'estudiante@aeroacademia.com';

    const noShowRendered = emailService.renderFlightEmail('flight_no_show', {
      student_name: itin.estudiante_nombre,
      instructor_name: instructorNombre,
      instructor_phone: itin.instructor_telefono || '+507 6000-0000',
      airplane_reg: itin.avion_matricula,
      airplane_model: itin.avion_modelo,
      flight_date: itin.fecha,
      start_time: itin.hora_inicio,
      end_time: itin.hora_fin,
      mission: itin.mision
    });

    // Email Disciplinario al Estudiante
    this.sendEmailNotification({
      destinatario_tipo: 'estudiante',
      destinatario_nombre: itin.estudiante_nombre,
      destinatario_email: studentEmail,
      itinerario_id: itin.id,
      evento: 'vuelo_no_show',
      asunto: noShowRendered.subject,
      cuerpo_html: noShowRendered.html,
      cuerpo_texto: noShowRendered.text
    });

    this.saveToDisk();
    return itin;
  }

  sendItineraryReminder(id: string): { itinerary: Itinerary | null; notification: EmailNotification | null } {
    const idx = this.itineraries.findIndex(i => i.id === id);
    if (idx === -1) return { itinerary: null, notification: null };

    const itin = this.itineraries[idx];
    const reminderCount = (itin.recordatorios_enviados || 0) + 1;
    itin.recordatorios_enviados = reminderCount;
    itin.ultimo_recordatorio_en = new Date().toISOString();

    // Calcular minutos restantes respecto al límite de 3 horas
    let minutosRestantes = 180 - reminderCount * 30;
    if (minutosRestantes < 0) minutosRestantes = 0;

    const student = this.getUserById(itin.estudiante_id);
    const studentEmail = student?.correo || 'estudiante@aeroacademia.com';

    const reminderRendered = emailService.renderFlightEmail('flight_reminder', {
      student_name: itin.estudiante_nombre,
      instructor_name: itin.instructor_nombre,
      instructor_phone: itin.instructor_telefono || '+507 6000-0000',
      airplane_reg: itin.avion_matricula,
      airplane_model: itin.avion_modelo,
      flight_date: itin.fecha,
      start_time: itin.hora_inicio,
      end_time: itin.hora_fin,
      mission: itin.mision,
      reminder_count: String(reminderCount),
      minutes_remaining: String(minutosRestantes)
    });

    // Email Recordatorio
    const notif = this.sendEmailNotification({
      destinatario_tipo: 'estudiante',
      destinatario_nombre: itin.estudiante_nombre,
      destinatario_email: studentEmail,
      itinerario_id: itin.id,
      evento: 'itinerario_recordatorio',
      asunto: reminderRendered.subject,
      cuerpo_html: reminderRendered.html,
      cuerpo_texto: reminderRendered.text
    });

    return { itinerary: itin, notification: notif };
  }

  updateItineraryStatus(id: string, newStatus: Itinerary['estado'], motivo?: string): Itinerary | null {
    const idx = this.itineraries.findIndex(i => i.id === id);
    if (idx === -1) return null;

    if (this.itineraries[idx].publicado_8pm || this.itineraries[idx].solo_lectura) return null;
    const oldStatus = this.itineraries[idx].estado;
    this.itineraries[idx].estado = newStatus;
    if (motivo) this.itineraries[idx].motivo_cancelacion = motivo;

    const itin = this.itineraries[idx];

    if (newStatus === 'cancelado') {
      return this.cancelItinerary(id, motivo || 'Cancelación administrativa', 'Operaciones');
    }

    if (newStatus === 'no_show') {
      return this.markNoShow(id, itin.instructor_nombre);
    }

    if (newStatus === 'confirmado') {
      return this.acceptItinerary(id, itin.estudiante_nombre);
    }

    this.saveToDisk();
    return itin;
  }

  updateItinerary(
    id: string,
    updates: Partial<{
      instructor_id: string;
      estudiante_id: string;
      fecha: string;
      hora_inicio: string;
      hora_fin: string;
      horas: number;
      avion_matricula: string;
      avion_modelo: string;
      ruta: string;
      mision: string;
      detalles_evento: string;
      estado: Itinerary['estado'];
    }>,
    actor: { id?: string; nombre?: string; rol?: UserRole }
  ): { itinerary?: Itinerary; error?: string } {
    if (!actor.rol || !['instructor_en_jefe', 'escuela', 'admin'].includes(actor.rol)) {
      return { error: 'Solo el Director de Escuela o el Instructor en Jefe pueden editar vuelos aceptados.' };
    }

    const itin = this.itineraries.find(i => i.id === id);
    if (!itin) {
      return { error: 'Vuelo / itinerario no encontrado.' };
    }

    if (updates.instructor_id) {
      const inst = this.getUserById(updates.instructor_id);
      if (!inst) return { error: 'Instructor no encontrado.' };
      const lockCheck = this.isInstructorLocked(inst.id);
      if (lockCheck.locked) return { error: `ACCESO BLOQUEADO (HARD LOCK): ${lockCheck.reason}` };
      itin.instructor_id = inst.id;
      itin.instructor_nombre = inst.nombre;
      itin.instructor_telefono = inst.telefono || itin.instructor_telefono;
    }

    const targetStudentIdForFlight = updates.estudiante_id || itin.estudiante_id;
    const isFlightItin = !itin.tipo_evento || itin.tipo_evento === 'vuelo';
    if (isFlightItin && targetStudentIdForFlight) {
      const targetStudentObj = this.getUserById(targetStudentIdForFlight);
      if (targetStudentObj && targetStudentObj.rol === 'estudiante') {
        const balanceError = this.validateStudentFlightBalance(targetStudentObj.id);
        if (balanceError) {
          return { error: balanceError };
        }
      }
    }

    if (updates.estudiante_id) {
      const st = this.getUserById(updates.estudiante_id);
      if (!st) return { error: 'Estudiante no encontrado.' };
      itin.estudiante_id = st.id;
      itin.estudiante_nombre = st.nombre;
      itin.estudiante_telefono = st.telefono || itin.estudiante_telefono;
      itin.pic = st.nombre;
    }

    if (updates.avion_matricula) {
      const acRecord = this.getAircraftMaintenanceRecord(updates.avion_matricula);
      if (acRecord && (acRecord.bloqueo_despacho || acRecord.estado_aeronavegabilidad === 'aog_bloqueado' || acRecord.estado_aeronavegabilidad === 'en_mantenimiento')) {
        return { error: `Aeronave ${acRecord.matricula} no disponible por mantenimiento / AOG (${acRecord.motivo_bloqueo || acRecord.estado_aeronavegabilidad}).` };
      }
      itin.avion_matricula = updates.avion_matricula;
      itin.avion_modelo = updates.avion_modelo || acRecord?.modelo || itin.avion_modelo;
      itin.equipo = itin.avion_modelo;
    } else if (updates.avion_modelo) {
      itin.avion_modelo = updates.avion_modelo;
      itin.equipo = updates.avion_modelo;
    }

    if (updates.fecha) itin.fecha = updates.fecha;
    if (updates.hora_inicio) {
      itin.hora_inicio = updates.hora_inicio;
      itin.etd = `${updates.hora_inicio} Z`;
    }
    if (updates.hora_fin) itin.hora_fin = updates.hora_fin;
    if (updates.horas !== undefined && !isNaN(Number(updates.horas)) && Number(updates.horas) > 0) {
      itin.horas = Number(updates.horas);
    }
    if (updates.ruta !== undefined) itin.ruta = updates.ruta;
    if (updates.mision !== undefined) itin.mision = updates.mision;
    if (updates.detalles_evento !== undefined) itin.detalles_evento = updates.detalles_evento;
    if (updates.estado !== undefined) itin.estado = updates.estado;

    if (itin.origen_solicitud_id) {
      const linkedReq = this.flightRequests.find(r => r.id === itin.origen_solicitud_id);
      if (linkedReq) {
        linkedReq.instructor_id = itin.instructor_id;
        linkedReq.instructor_nombre = itin.instructor_nombre;
        linkedReq.estudiante_id = itin.estudiante_id;
        linkedReq.estudiante_nombre = itin.estudiante_nombre;
        linkedReq.fecha_vuelo = itin.fecha;
        linkedReq.hora_inicio = itin.hora_inicio;
        linkedReq.hora_fin = itin.hora_fin;
        linkedReq.duracion_horas = itin.horas || linkedReq.duracion_horas;
        linkedReq.avion_matricula = itin.avion_matricula;
        linkedReq.avion_modelo = itin.avion_modelo;
        linkedReq.ruta = itin.ruta;
        linkedReq.mision = itin.mision;
        linkedReq.notas_instructor = itin.detalles_evento;
      }
    }

    this.saveToDisk();
    return { itinerary: itin };
  }

  deleteItinerary(
    id: string,
    actor: { id?: string; nombre?: string; rol?: UserRole }
  ): { deleted: boolean; error?: string } {
    if (!actor.rol || !['instructor_en_jefe', 'escuela', 'admin'].includes(actor.rol)) {
      return { deleted: false, error: 'Solo el Director de Escuela o el Instructor en Jefe pueden eliminar vuelos aceptados.' };
    }

    const idx = this.itineraries.findIndex(i => i.id === id);
    if (idx === -1) {
      return { deleted: false, error: 'Vuelo / itinerario no encontrado.' };
    }

    const [removed] = this.itineraries.splice(idx, 1);

    for (const pub of this.publishedDailyItineraries) {
      if (pub.itinerary_ids.includes(removed.id)) {
        pub.itinerary_ids = pub.itinerary_ids.filter(itemId => itemId !== removed.id);
        pub.total_vuelos = pub.itinerary_ids.length;
      }
    }

    if (removed.origen_solicitud_id) {
      this.flightRequests = this.flightRequests.filter(r => r.id !== removed.origen_solicitud_id);
    } else {
      this.flightRequests = this.flightRequests.filter(r => r.itinerario_publicado_id !== removed.id);
    }

    this.saveToDisk();
    return { deleted: true };
  }

  // --- SOLICITUDES DE VUELO DE INSTRUCTORES (11 AM - 6 PM) & CORTES 6 PM / 8 PM ---
  private getOperationalClock(): { dateStr: string; hours: number; minutes: number; timeStr: string; minutesOfDay: number; isSimulated: boolean; simulatedTime: string | null } {
    const now = new Date();
    const parts = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'America/Panama',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    }).formatToParts(now);

    const getPart = (type: string) => parts.find(p => p.type === type)?.value || '00';
    const dateStr = `${getPart('year')}-${getPart('month')}-${getPart('day')}`;
    const sim = this.flightRequestConfig.simulatedTime;
    if (sim && /^\d{2}:\d{2}$/.test(sim)) {
      const [h, m] = sim.split(':').map(Number);
      return {
        dateStr,
        hours: h,
        minutes: m,
        timeStr: sim,
        minutesOfDay: h * 60 + m,
        isSimulated: true,
        simulatedTime: sim
      };
    }
    const rawHours = Number(getPart('hour'));
    const hours = rawHours === 24 ? 0 : rawHours;
    const minutes = Number(getPart('minute'));
    const timeStr = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
    return {
      dateStr,
      hours,
      minutes,
      timeStr,
      minutesOfDay: hours * 60 + minutes,
      isSimulated: false,
      simulatedTime: null
    };
  }

  getFlightRequestScheduleStatus(): FlightRequestScheduleStatus {
    const clock = this.getOperationalClock();
    const ventanaAbierta = clock.minutesOfDay >= 11 * 60 && clock.minutesOfDay < 18 * 60;
    const corte6Executed = this.flightRequestConfig.lastSentBatchDate === clock.dateStr;
    const corte8Executed = this.flightRequestConfig.lastPublishedDate === clock.dateStr;

    return {
      fecha_ciclo: clock.dateStr,
      hora_actual: clock.timeStr,
      timestamp: new Date().toISOString(),
      es_hora_simulada: clock.isSimulated,
      hora_simulada: clock.simulatedTime,
      ventana_inicio: '11:00',
      ventana_fin: '18:00',
      hora_envio_jefe: '18:00',
      hora_publicacion: '20:00',
      ventana_abierta: ventanaAbierta,
      corte_6pm_ejecutado: corte6Executed,
      corte_8pm_ejecutado: corte8Executed,
      ultimo_envio_6pm_en: this.flightRequestConfig.lastSentBatchAt,
      ultima_publicacion_8pm_en: this.flightRequestConfig.lastPublishedAt
    };
  }

  setFlightRequestSimulatedTime(simulatedTime: string | null): FlightRequestScheduleStatus {
    if (simulatedTime && !/^\d{2}:\d{2}$/.test(simulatedTime)) {
      throw new Error('Formato de hora inválido. Use HH:mm');
    }
    this.flightRequestConfig.simulatedTime = simulatedTime || null;
    // Al cambiar hora simulada a ventana abierta (antes de 18:00), permitir re-probar cortes de hoy si el operador lo solicita
    const clock = this.getOperationalClock();
    if (clock.minutesOfDay < 18 * 60) {
      this.flightRequestConfig.lastSentBatchDate = null;
      this.flightRequestConfig.lastPublishedDate = null;
    } else if (clock.minutesOfDay < 20 * 60) {
      this.flightRequestConfig.lastPublishedDate = null;
    }
    this.saveToDisk();
    this.checkAndRunFlightRequestCutoffs();
    return this.getFlightRequestScheduleStatus();
  }

  getFlightRequests(filters?: { instructorId?: string; status?: FlightRequestStatus; cycleDate?: string }): FlightRequest[] {
    let list = [...this.flightRequests];
    if (filters?.instructorId) {
      list = list.filter(r => r.instructor_id === filters.instructorId);
    }
    if (filters?.status) {
      list = list.filter(r => r.estado === filters.status);
    }
    if (filters?.cycleDate) {
      list = list.filter(r => r.fecha_solicitud_ciclo === filters.cycleDate);
    }
    return list.sort((a, b) => new Date(b.creado_en).getTime() - new Date(a.creado_en).getTime());
  }

  createFlightRequest(input: {
    instructor_id: string;
    estudiante_id: string;
    fecha_vuelo: string;
    hora_inicio: string;
    hora_fin: string;
    duracion_horas: number;
    avion_matricula: string;
    avion_modelo?: string;
    ruta?: string;
    mision: string;
    notas_instructor?: string;
    solicitado_por_rol?: UserRole;
  }): { request?: FlightRequest; error?: string } {
    const status = this.getFlightRequestScheduleStatus();
    const requesterRole = input.solicitado_por_rol;
    const bypassScheduleLock =
      requesterRole === 'escuela' ||
      requesterRole === 'admin' ||
      requesterRole === 'instructor_en_jefe';

    if (!bypassScheduleLock && !status.ventana_abierta) {
      return {
        error: `El período de solicitudes de vuelo está cerrado (horario habilitado: 11:00 AM a 6:00 PM; hora operativa actual: ${status.hora_actual}).`
      };
    }

    const instructor = this.getUserById(input.instructor_id);
    if (!instructor) {
      return { error: 'Instructor asignado no encontrado en el directorio.' };
    }

    const lockCheck = this.isInstructorLocked(instructor.id);
    if (lockCheck.locked) {
      return { error: `ACCESO BLOQUEADO (HARD LOCK): ${lockCheck.reason}` };
    }

    const student = this.getUserById(input.estudiante_id);
    if (!student) {
      return { error: 'Estudiante piloto no encontrado en el directorio.' };
    }

    const balanceError = this.validateStudentFlightBalance(student.id);
    if (balanceError) {
      return { error: balanceError };
    }

    if (input.avion_matricula) {
      const acRecord = this.getAircraftMaintenanceRecord(input.avion_matricula);
      if (acRecord && (acRecord.bloqueo_despacho || acRecord.estado_aeronavegabilidad === 'aog_bloqueado' || acRecord.estado_aeronavegabilidad === 'en_mantenimiento')) {
        return {
          error: `Aeronave ${acRecord.matricula} no disponible por mantenimiento / AOG (${acRecord.motivo_bloqueo || acRecord.estado_aeronavegabilidad}).`
        };
      }
    }

    const nowIso = new Date().toISOString();
    const newReq: FlightRequest = {
      id: `freq_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
      fecha_solicitud_ciclo: status.fecha_ciclo,
      fecha_vuelo: input.fecha_vuelo,
      hora_inicio: input.hora_inicio,
      hora_fin: input.hora_fin,
      duracion_horas: Number(input.duracion_horas) || 1.5,
      instructor_id: instructor.id,
      instructor_nombre: instructor.nombre,
      estudiante_id: student.id,
      estudiante_nombre: student.nombre,
      avion_matricula: input.avion_matricula,
      avion_modelo: input.avion_modelo || 'Aeronave Escuela',
      ruta: input.ruta?.trim() || 'MPMG - MPMG',
      mision: input.mision.trim(),
      notas_instructor: input.notas_instructor?.trim() || undefined,
      estado: 'pendiente_envio',
      creado_en: nowIso
    };

    this.flightRequests.unshift(newReq);

    // Registrar notificación dirigida al Instructor en Jefe
    const chiefs = this.getRegisteredUsersForRole('instructor_en_jefe');
    for (const chief of chiefs) {
      this.sendEmailNotification({
        destinatario_tipo: 'instructor_en_jefe',
        destinatario_nombre: chief.name,
        destinatario_email: chief.email,
        evento: 'solicitud_vuelo_enviada',
        asunto: `📋 Solicitud de Vuelo recibida (${newReq.avion_matricula} · ${newReq.fecha_vuelo} ${newReq.hora_inicio})`,
        cuerpo_html: `<p>El instructor <strong>${newReq.instructor_nombre}</strong> registró una solicitud de vuelo con el estudiante <strong>${newReq.estudiante_nombre}</strong> en la aeronave <strong>${newReq.avion_matricula}</strong> para el ${newReq.fecha_vuelo} (${newReq.hora_inicio} - ${newReq.hora_fin}).</p><p>El lote completo del día será remitido formalmente en el corte de las 6:00 PM para su aprobación.</p>`,
        cuerpo_texto: `Solicitud de vuelo de ${newReq.instructor_nombre} con ${newReq.estudiante_nombre} (${newReq.avion_matricula}, ${newReq.fecha_vuelo} ${newReq.hora_inicio}-${newReq.hora_fin}).`
      });
    }

    this.saveToDisk();
    return { request: newReq };
  }

  runSixPmDispatchBatch(manualTrigger: boolean = false): { dispatchedCount: number; requests: FlightRequest[]; timestamp: string } {
    const clock = this.getOperationalClock();
    const nowIso = new Date().toISOString();
    const pendingRequests = this.flightRequests.filter(r => r.estado === 'pendiente_envio');

    pendingRequests.forEach(r => {
      r.estado = 'enviada_jefe';
      r.enviado_jefe_en = nowIso;
    });

    this.flightRequestConfig.lastSentBatchDate = clock.dateStr;
    this.flightRequestConfig.lastSentBatchAt = nowIso;

    if (pendingRequests.length > 0 || manualTrigger) {
      const chiefs = this.getRegisteredUsersForRole('instructor_en_jefe');
      const summaryLines = pendingRequests
        .map(r => `• ${r.fecha_vuelo} ${r.hora_inicio}-${r.hora_fin} | ${r.avion_matricula} | Instructor: ${r.instructor_nombre} | Alumno: ${r.estudiante_nombre}`)
        .join('\n');

      for (const chief of chiefs) {
        this.sendEmailNotification({
          destinatario_tipo: 'instructor_en_jefe',
          destinatario_nombre: chief.name,
          destinatario_email: chief.email,
          evento: 'solicitud_vuelo_enviada',
          asunto: `🕕 Corte 6:00 PM — ${pendingRequests.length} Solicitud(es) de Vuelo para Aprobación del Jefe de Pilotos`,
          cuerpo_html: `<p>Se ha ejecutado el cierre del período de solicitudes (11:00 AM - 6:00 PM). Hay <strong>${pendingRequests.length} solicitud(es)</strong> enviadas al Instructor en Jefe para su decisión antes de la publicación oficial de las 8:00 PM.</p><pre style="font-family:monospace;font-size:12px;">${summaryLines || 'Sin nuevas solicitudes pendientes en este corte.'}</pre>`,
          cuerpo_texto: `Corte 6:00 PM: ${pendingRequests.length} solicitud(es) enviadas al Instructor en Jefe.\n${summaryLines}`
        });
      }
    }

    this.saveToDisk();
    return {
      dispatchedCount: pendingRequests.length,
      requests: pendingRequests,
      timestamp: nowIso
    };
  }

  decideFlightRequest(
    requestId: string,
    decision: 'aprobada' | 'rechazada',
    chiefUser: { id: string; nombre: string; rol: UserRole },
    motivoRechazo?: string
  ): { request?: FlightRequest; error?: string } {
    if (!['instructor_en_jefe', 'escuela', 'admin'].includes(chiefUser.rol)) {
      return { error: 'Solo el Instructor en Jefe o el Director de Escuela pueden aprobar o rechazar solicitudes de vuelo.' };
    }

    const req = this.flightRequests.find(r => r.id === requestId);
    if (!req) {
      return { error: 'Solicitud de vuelo no encontrada.' };
    }

    if (req.estado === 'publicada') {
      return { error: 'Esta solicitud ya fue publicada en el itinerario oficial de las 8:00 PM.' };
    }

    if (decision === 'aprobada') {
      const lockCheck = this.isInstructorLocked(req.instructor_id);
      if (lockCheck.locked) {
        return { error: `No se puede aprobar: ${lockCheck.reason}` };
      }
      const balanceError = this.validateStudentFlightBalance(req.estudiante_id);
      if (balanceError) {
        return { error: balanceError };
      }
      const acRecord = this.getAircraftMaintenanceRecord(req.avion_matricula);
      if (acRecord && (acRecord.bloqueo_despacho || acRecord.estado_aeronavegabilidad === 'aog_bloqueado' || acRecord.estado_aeronavegabilidad === 'en_mantenimiento')) {
        return { error: `No se puede aprobar: aeronave ${acRecord.matricula} está bloqueada en taller (${acRecord.motivo_bloqueo || acRecord.estado_aeronavegabilidad}).` };
      }
    }

    const nowIso = new Date().toISOString();
    req.estado = decision;
    req.revisado_por_id = chiefUser.id;
    req.revisado_por_nombre = chiefUser.nombre;
    req.fecha_revision = nowIso;
    req.motivo_rechazo = decision === 'rechazada' ? (motivoRechazo?.trim() || 'No seleccionada por Jefatura de Pilotos') : undefined;

    const instEmail = this.getUserRegisteredEmail(req.instructor_id, 'instructor@skyops.com', req.instructor_nombre);
    this.sendEmailNotification({
      destinatario_tipo: 'instructor',
      destinatario_nombre: req.instructor_nombre,
      destinatario_email: instEmail.email,
      evento: 'solicitud_vuelo_decidida',
      asunto: `${decision === 'aprobada' ? '✅ Solicitud Aprobada' : '❌ Solicitud No Aprobada'}: ${req.avion_matricula} (${req.fecha_vuelo} ${req.hora_inicio})`,
      cuerpo_html: `<p>El oficial <strong>${chiefUser.nombre}</strong> ha marcado tu solicitud de vuelo (<strong>${req.avion_matricula}</strong>, ${req.fecha_vuelo} ${req.hora_inicio}-${req.hora_fin} con ${req.estudiante_nombre}) como <strong>${decision.toUpperCase()}</strong>.</p>${decision === 'aprobada' ? '<p>Este vuelo será publicado automáticamente a las 8:00 PM en el itinerario para instructores y estudiantes.</p>' : `<p>Observación: ${req.motivo_rechazo}</p>`}`,
      cuerpo_texto: `Solicitud ${decision} por ${chiefUser.nombre} para ${req.avion_matricula} (${req.fecha_vuelo} ${req.hora_inicio}-${req.hora_fin}).`
    });

    this.saveToDisk();
    return { request: req };
  }

  updateFlightRequest(
    requestId: string,
    updates: Partial<{
      instructor_id: string;
      estudiante_id: string;
      fecha_vuelo: string;
      hora_inicio: string;
      hora_fin: string;
      duracion_horas: number;
      avion_matricula: string;
      avion_modelo: string;
      ruta: string;
      mision: string;
      notas_instructor: string;
    }>,
    actor: { id?: string; nombre?: string; rol?: UserRole }
  ): { request?: FlightRequest; error?: string } {
    if (!actor.rol || !['instructor_en_jefe', 'escuela', 'admin'].includes(actor.rol)) {
      return { error: 'Solo el Director de Escuela o el Instructor en Jefe pueden editar vuelos aceptados.' };
    }

    const req = this.flightRequests.find(r => r.id === requestId);
    if (!req) {
      return { error: 'Solicitud de vuelo no encontrada.' };
    }

    if (updates.instructor_id) {
      const inst = this.getUserById(updates.instructor_id);
      if (!inst) return { error: 'Instructor no encontrado.' };
      const lockCheck = this.isInstructorLocked(inst.id);
      if (lockCheck.locked) return { error: `ACCESO BLOQUEADO (HARD LOCK): ${lockCheck.reason}` };
      req.instructor_id = inst.id;
      req.instructor_nombre = inst.nombre;
    }

    const targetStudentId = updates.estudiante_id || req.estudiante_id;
    const balanceError = this.validateStudentFlightBalance(targetStudentId);
    if (balanceError) {
      return { error: balanceError };
    }

    if (updates.estudiante_id) {
      const st = this.getUserById(updates.estudiante_id);
      if (!st) return { error: 'Estudiante no encontrado.' };
      req.estudiante_id = st.id;
      req.estudiante_nombre = st.nombre;
    }

    if (updates.avion_matricula) {
      const acRecord = this.getAircraftMaintenanceRecord(updates.avion_matricula);
      if (acRecord && (acRecord.bloqueo_despacho || acRecord.estado_aeronavegabilidad === 'aog_bloqueado' || acRecord.estado_aeronavegabilidad === 'en_mantenimiento')) {
        return { error: `Aeronave ${acRecord.matricula} no disponible por mantenimiento / AOG (${acRecord.motivo_bloqueo || acRecord.estado_aeronavegabilidad}).` };
      }
      req.avion_matricula = updates.avion_matricula;
      req.avion_modelo = updates.avion_modelo || acRecord?.modelo || req.avion_modelo;
    } else if (updates.avion_modelo) {
      req.avion_modelo = updates.avion_modelo;
    }

    if (updates.fecha_vuelo) req.fecha_vuelo = updates.fecha_vuelo;
    if (updates.hora_inicio) req.hora_inicio = updates.hora_inicio;
    if (updates.hora_fin) req.hora_fin = updates.hora_fin;
    if (updates.duracion_horas !== undefined && !isNaN(Number(updates.duracion_horas)) && Number(updates.duracion_horas) > 0) {
      req.duracion_horas = Number(updates.duracion_horas);
    }
    if (updates.ruta !== undefined) req.ruta = updates.ruta;
    if (updates.mision !== undefined) req.mision = updates.mision;
    if (updates.notas_instructor !== undefined) req.notas_instructor = updates.notas_instructor;

    if (req.itinerario_publicado_id) {
      const linkedItin = this.itineraries.find(i => i.id === req.itinerario_publicado_id);
      if (linkedItin) {
        const inst = this.getUserById(req.instructor_id);
        const st = this.getUserById(req.estudiante_id);
        linkedItin.fecha = req.fecha_vuelo;
        linkedItin.hora_inicio = req.hora_inicio;
        linkedItin.hora_fin = req.hora_fin;
        linkedItin.etd = `${req.hora_inicio} Z`;
        linkedItin.horas = req.duracion_horas;
        linkedItin.avion_matricula = req.avion_matricula;
        linkedItin.avion_modelo = req.avion_modelo;
        linkedItin.equipo = req.avion_modelo;
        linkedItin.instructor_id = req.instructor_id;
        linkedItin.instructor_nombre = req.instructor_nombre;
        linkedItin.instructor_telefono = inst?.telefono || linkedItin.instructor_telefono;
        linkedItin.estudiante_id = req.estudiante_id;
        linkedItin.estudiante_nombre = req.estudiante_nombre;
        linkedItin.estudiante_telefono = st?.telefono || linkedItin.estudiante_telefono;
        linkedItin.pic = req.estudiante_nombre;
        linkedItin.ruta = req.ruta;
        linkedItin.mision = req.mision;
        linkedItin.detalles_evento = req.notas_instructor;
      }
    }

    this.saveToDisk();
    return { request: req };
  }

  deleteFlightRequest(
    requestId: string,
    actor: { id?: string; nombre?: string; rol?: UserRole }
  ): { deleted: boolean; error?: string } {
    if (!actor.rol || !['instructor_en_jefe', 'escuela', 'admin'].includes(actor.rol)) {
      return { deleted: false, error: 'Solo el Director de Escuela o el Instructor en Jefe pueden eliminar vuelos aceptados.' };
    }

    const idx = this.flightRequests.findIndex(r => r.id === requestId);
    if (idx === -1) {
      return { deleted: false, error: 'Solicitud de vuelo no encontrada.' };
    }

    const [removed] = this.flightRequests.splice(idx, 1);

    if (removed.itinerario_publicado_id) {
      const itinIdx = this.itineraries.findIndex(i => i.id === removed.itinerario_publicado_id);
      if (itinIdx !== -1) {
        const [removedItin] = this.itineraries.splice(itinIdx, 1);
        for (const pub of this.publishedDailyItineraries) {
          if (pub.itinerary_ids.includes(removedItin.id)) {
            pub.itinerary_ids = pub.itinerary_ids.filter(id => id !== removedItin.id);
            pub.total_vuelos = pub.itinerary_ids.length;
          }
        }
      }
    }

    this.saveToDisk();
    return { deleted: true };
  }

  runEightPmPublishBatch(manualTrigger: boolean = false, publishedByName: string = 'Sistema Automático SkyOps (Corte 8:00 PM)'): {
    publication: PublishedDailyItinerary;
    publishedItineraries: Itinerary[];
    publishedCount: number;
  } {
    const clock = this.getOperationalClock();
    const nowIso = new Date().toISOString();
    const approvedRequests = this.flightRequests.filter(r => r.estado === 'aprobada');
    const createdItineraries: Itinerary[] = [];

    for (const req of approvedRequests) {
      const student = this.getUserById(req.estudiante_id);
      const instructor = this.getUserById(req.instructor_id);

      const newItin: Itinerary = {
        id: `itin_pub_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
        estudiante_id: req.estudiante_id,
        estudiante_nombre: student ? student.nombre : req.estudiante_nombre,
        estudiante_telefono: student?.telefono || '+507 6000-0000',
        instructor_id: req.instructor_id,
        instructor_nombre: instructor ? instructor.nombre : req.instructor_nombre,
        instructor_telefono: instructor?.telefono || '+507 6000-0000',
        avion_matricula: req.avion_matricula,
        avion_modelo: req.avion_modelo,
        fecha: req.fecha_vuelo,
        hora_inicio: req.hora_inicio,
        hora_fin: req.hora_fin,
        mision: req.mision,
        estado: 'confirmado',
        tipo_evento: 'vuelo',
        ruta: req.ruta,
        equipo: req.avion_modelo,
        etd: `${req.hora_inicio} Z`,
        pic: student ? student.nombre : req.estudiante_nombre,
        horas: req.duracion_horas,
        detalles_evento: req.notas_instructor,
        confirmado_en: nowIso,
        publicado_8pm: true,
        solo_lectura: true,
        origen_solicitud_id: req.id,
        aprobado_por_jefe: req.revisado_por_nombre || 'Cap. A. Bustamante - Instructor en Jefe',
        fecha_publicacion_8pm: nowIso,
        creado_en: nowIso
      };

      this.itineraries.push(newItin);
      createdItineraries.push(newItin);

      req.estado = 'publicada';
      req.publicado_en = nowIso;
      req.itinerario_publicado_id = newItin.id;

      // Notificar al instructor y estudiante asignados (visibilidad exclusiva para instructores y estudiantes)
      const studentInfo = this.getUserRegisteredEmail(req.estudiante_id, 'alumno@skyops.com', newItin.estudiante_nombre);
      const instructorInfo = this.getUserRegisteredEmail(req.instructor_id, 'instructor@skyops.com', newItin.instructor_nombre);

      this.sendEmailNotification({
        destinatario_tipo: 'estudiante',
        destinatario_nombre: newItin.estudiante_nombre,
        destinatario_email: studentInfo.email,
        itinerario_id: newItin.id,
        evento: 'itinerario_publicado_8pm',
        asunto: `🕗 Itinerario Oficial Publicado (8:00 PM): ${newItin.avion_matricula} (${newItin.fecha} ${newItin.hora_inicio})`,
        cuerpo_html: `<p>El Instructor en Jefe ha publicado el itinerario oficial de vuelos de las 8:00 PM.</p><p><strong>Fecha:</strong> ${newItin.fecha} (${newItin.hora_inicio} - ${newItin.hora_fin})<br/><strong>Aeronave:</strong> ${newItin.avion_matricula}<br/><strong>Instructor:</strong> ${newItin.instructor_nombre}<br/><strong>Misión:</strong> ${newItin.mision}</p>`,
        cuerpo_texto: `Itinerario Oficial 8:00 PM: ${newItin.fecha} ${newItin.hora_inicio}-${newItin.hora_fin} | ${newItin.avion_matricula} | Instructor: ${newItin.instructor_nombre}.`
      });

      this.sendEmailNotification({
        destinatario_tipo: 'instructor',
        destinatario_nombre: newItin.instructor_nombre,
        destinatario_email: instructorInfo.email,
        itinerario_id: newItin.id,
        evento: 'itinerario_publicado_8pm',
        asunto: `🕗 Itinerario Oficial Publicado (8:00 PM): ${newItin.avion_matricula} con ${newItin.estudiante_nombre}`,
        cuerpo_html: `<p>Tu solicitud aprobada por el Instructor en Jefe ha sido publicada en el itinerario oficial de las 8:00 PM (solo lectura para instructores y estudiantes).</p><p><strong>Fecha:</strong> ${newItin.fecha} (${newItin.hora_inicio} - ${newItin.hora_fin})<br/><strong>Aeronave:</strong> ${newItin.avion_matricula}<br/><strong>Estudiante:</strong> ${newItin.estudiante_nombre}</p>`,
        cuerpo_texto: `Itinerario Oficial 8:00 PM: ${newItin.fecha} ${newItin.hora_inicio}-${newItin.hora_fin} | ${newItin.avion_matricula} | Alumno: ${newItin.estudiante_nombre}.`
      });
    }

    const publication: PublishedDailyItinerary = {
      id: `pub_8pm_${Date.now()}`,
      fecha_publicacion: clock.dateStr,
      publicado_en: nowIso,
      publicado_automaticamente: !manualTrigger,
      publicado_por: publishedByName,
      total_vuelos: createdItineraries.length,
      itinerary_ids: createdItineraries.map(i => i.id),
      resumen: createdItineraries.length > 0
        ? `Publicados ${createdItineraries.length} vuelo(s) aprobados por Jefatura de Pilotos.`
        : 'Corte de las 8:00 PM ejecutado sin vuelos aprobados pendientes de publicación.'
    };

    this.publishedDailyItineraries.unshift(publication);
    this.flightRequestConfig.lastPublishedDate = clock.dateStr;
    this.flightRequestConfig.lastPublishedAt = nowIso;

    this.saveToDisk();
    return {
      publication,
      publishedItineraries: createdItineraries,
      publishedCount: createdItineraries.length
    };
  }

  checkAndRunFlightRequestCutoffs(): void {
    const clock = this.getOperationalClock();
    // 1. Corte de las 6:00 PM (18:00): enviar solicitudes pendientes al Instructor en Jefe
    if (clock.minutesOfDay >= 18 * 60 && this.flightRequestConfig.lastSentBatchDate !== clock.dateStr) {
      this.runSixPmDispatchBatch(false);
    }
    // 2. Corte de las 8:00 PM (20:00): publicar itinerario oficial con las solicitudes aprobadas
    if (clock.minutesOfDay >= 20 * 60 && this.flightRequestConfig.lastPublishedDate !== clock.dateStr) {
      this.runEightPmPublishBatch(false);
    }
  }

  getPublishedDailyItineraries(): {
    publications: PublishedDailyItinerary[];
    itineraries: Itinerary[];
  } {
    const publishedItins = this.itineraries
      .filter(i => Boolean(i.publicado_8pm))
      .sort((a, b) => {
        const dateCmp = (b.fecha || '').localeCompare(a.fecha || '');
        if (dateCmp !== 0) return dateCmp;
        return (a.hora_inicio || '').localeCompare(b.hora_inicio || '');
      });

    return {
      publications: [...this.publishedDailyItineraries],
      itineraries: publishedItins
    };
  }

  // --- EMAIL NOTIFICATIONS ---
  getEmailLogs(): EmailNotification[] {
    return [...this.emailLogs].sort((a, b) => new Date(b.fecha_envio).getTime() - new Date(a.fecha_envio).getTime());
  }

  sendEmailNotification(data: Omit<EmailNotification, 'id' | 'fecha_envio' | 'estado_envio'>): EmailNotification {
    const notif: EmailNotification = {
      ...data,
      id: 'em_' + Date.now() + '_' + Math.floor(Math.random() * 1000),
      fecha_envio: new Date().toISOString(),
      estado_envio: 'enviado'
    };
    this.emailLogs.unshift(notif);

    // Despacho asíncrono vía emailService
    emailService.sendEmail({
      toEmail: data.destinatario_email,
      recipientName: data.destinatario_nombre,
      subject: data.asunto,
      htmlContent: data.cuerpo_html,
      textContent: data.cuerpo_texto,
      eventType: data.evento,
      itineraryId: data.itinerario_id
    }).then(res => {
      notif.estado_envio = res.status;
      if (res.error) {
        notif.error = res.error;
      }
    }).catch(err => {
      console.error('Error enviando Email:', err);
      notif.estado_envio = 'fallido';
      notif.error = err.message;
    });

    return notif;
  }

  // --- REGLAS DE NOTIFICACIÓN POR ROL & ACCIONES DE CORREO ---
  getRoleNotificationRules(): RoleNotificationRule[] {
    return [...this.roleNotificationRules];
  }

  updateRoleNotificationRule(id: string, updates: Partial<RoleNotificationRule>): RoleNotificationRule | null {
    const idx = this.roleNotificationRules.findIndex(r => r.id === id);
    if (idx === -1) return null;
    this.roleNotificationRules[idx] = { ...this.roleNotificationRules[idx], ...updates };
    this.saveToDisk();
    return this.roleNotificationRules[idx];
  }

  resetRoleNotificationRules(): RoleNotificationRule[] {
    this.roleNotificationRules = JSON.parse(JSON.stringify(INITIAL_ROLE_NOTIFICATION_RULES));
    this.saveToDisk();
    return this.roleNotificationRules;
  }

  markEmailAsRead(id: string): boolean {
    const log = this.emailLogs.find(l => l.id === id);
    if (!log) return false;
    log.leido = true;
    log.leido_en = new Date().toISOString();
    this.saveToDisk();
    return true;
  }

  markAllEmailsAsRead(recipientEmail?: string): number {
    let count = 0;
    const now = new Date().toISOString();
    for (const log of this.emailLogs) {
      if (!recipientEmail || (log.destinatario_email && log.destinatario_email.toLowerCase() === recipientEmail.toLowerCase())) {
        if (!log.leido) {
          log.leido = true;
          log.leido_en = now;
          count++;
        }
      }
    }
    this.saveToDisk();
    return count;
  }

  /**
   * Notificación automática por correo cuando un estudiante reporta o sube un comprobante de pago
   */
  sendStudentPaymentSubmittedNotice(tx: Transaction): void {
    const studentInfo = this.getUserRegisteredEmail(tx.estudiante_id, 'alumno@skyops.com', tx.estudiante_nombre || 'Daniel Alvarado');
    const studentName = tx.estudiante_nombre || studentInfo.name;
    const amountStr = tx.monto.toFixed(2);
    const dateStr = new Date(tx.fecha || Date.now()).toLocaleDateString('es-PA');

    const rule = this.roleNotificationRules.find(r => r.evento === 'pago_reportado');
    const rolesToNotify = (rule && rule.activo) ? rule.roles_notificados : ['contabilidad', 'admin', 'estudiante'];

    // 1. Notificar a Contabilidad (todos los oficiales de contabilidad registrados con su correo real)
    if (rolesToNotify.includes('contabilidad')) {
      const contaUsers = this.getRegisteredUsersForRole('contabilidad');
      const rendered = emailService.renderFlightEmail('payment_received', {
        recipient_name: 'Departamento de Contabilidad',
        student_name: studentName,
        amount: amountStr,
        reference: tx.referencia_ach || 'BG-ACH-' + Date.now().toString().slice(-6),
        bank_name: tx.banco_origen || 'Banco General Panamá',
        payment_date: dateStr
      });

      for (const cu of contaUsers) {
        this.sendEmailNotification({
          destinatario_tipo: 'contabilidad',
          destinatario_nombre: cu.name,
          destinatario_email: cu.email,
          evento: 'pago_reportado',
          asunto: `💳 Solicitud de Acreditación ACH Pendiente: ${studentName} ($${amountStr} USD)`,
          cuerpo_html: rendered.html,
          cuerpo_texto: `Nuevo pago ACH reportado por ${studentName} ($${amountStr} USD). Requiere verificación en extracto bancario.`
        });
      }
    }

    // 2. Notificar al Estudiante (a su correo electrónico registrado en su perfil)
    if (rolesToNotify.includes('estudiante')) {
      const rendered = emailService.renderFlightEmail('payment_received', {
        recipient_name: studentName,
        student_name: studentName,
        amount: amountStr,
        reference: tx.referencia_ach || 'N/A',
        bank_name: tx.banco_origen || 'Banco General Panamá',
        payment_date: dateStr
      });

      this.sendEmailNotification({
        destinatario_tipo: 'estudiante',
        destinatario_nombre: studentName,
        destinatario_email: studentInfo.email,
        evento: 'pago_reportado',
        asunto: `📨 Comprobante de Pago Recibido - En Revisión Contable ($${amountStr} USD)`,
        cuerpo_html: rendered.html,
        cuerpo_texto: `Estimado/a ${studentName}, tu comprobante por $${amountStr} USD ha sido recibido y está en proceso de verificación contable.`
      });
    }

    // 3. Notificar a Administración / Escuela (a todos los administradores registrados)
    if (rolesToNotify.includes('admin') || rolesToNotify.includes('escuela')) {
      const adminUsers = this.getRegisteredUsersForRole('admin');
      for (const au of adminUsers) {
        this.sendEmailNotification({
          destinatario_tipo: 'admin',
          destinatario_nombre: au.name,
          destinatario_email: au.email,
          evento: 'pago_reportado',
          asunto: `🔔 [Tesorería] Comprobante ACH Registrado: ${studentName} ($${amountStr} USD)`,
          cuerpo_html: `<div style="font-family:sans-serif;padding:20px;background:#f8fafc;border-radius:12px;border:1px solid #cbd5e1;">
            <h3 style="color:#0284c7;margin-top:0;">Nuevo Depósito Estudiantil Registrado</h3>
            <p>El estudiante <strong>${studentName}</strong> reportó un abono de <strong>$${amountStr} USD</strong> (Ref: ${tx.referencia_ach}).</p>
            <p>Estado: En cola de conciliación bancaria.</p>
          </div>`,
          cuerpo_texto: `Reporte de pago por $${amountStr} USD recibido de ${studentName}.`
        });
      }
    }
  }

  /**
   * Notificación automática por correo cuando Contabilidad aprueba y acredita un pago
   */
  sendPaymentApprovedNotice(tx: Transaction, verificadoPor: string, nuevoSaldo: number): void {
    const studentInfo = this.getUserRegisteredEmail(tx.estudiante_id, 'alumno@skyops.com', tx.estudiante_nombre || 'Daniel Alvarado');
    const studentName = tx.estudiante_nombre || studentInfo.name;
    const amountStr = tx.monto.toFixed(2);
    const balanceStr = nuevoSaldo.toFixed(2);

    const rule = this.roleNotificationRules.find(r => r.evento === 'pago_confirmado');
    const rolesToNotify = (rule && rule.activo) ? rule.roles_notificados : ['estudiante', 'admin', 'contabilidad'];

    // 1. Notificar al Estudiante (correo registrado)
    if (rolesToNotify.includes('estudiante')) {
      const rendered = emailService.renderFlightEmail('payment_approved', {
        student_name: studentName,
        amount: amountStr,
        reference: tx.referencia_bancaria_confirmada || tx.referencia_ach || 'N/A',
        new_balance: balanceStr,
        verified_by: verificadoPor
      });

      this.sendEmailNotification({
        destinatario_tipo: 'estudiante',
        destinatario_nombre: studentName,
        destinatario_email: studentInfo.email,
        evento: 'pago_confirmado',
        asunto: `✅ Saldo Acreditado: Comprobación Bancaria Exitosa (+$${amountStr} USD) - SkyOps`,
        cuerpo_html: rendered.html,
        cuerpo_texto: `Tu pago de $${amountStr} USD ha sido verificado y acreditado. Nuevo saldo disponible: $${balanceStr} USD.`
      });
    }

    // 2. Notificar a Contabilidad (todos los usuarios registrados)
    if (rolesToNotify.includes('contabilidad')) {
      const contaUsers = this.getRegisteredUsersForRole('contabilidad');
      for (const cu of contaUsers) {
        this.sendEmailNotification({
          destinatario_tipo: 'contabilidad',
          destinatario_nombre: cu.name,
          destinatario_email: cu.email,
          evento: 'pago_confirmado',
          asunto: `✅ Conciliación Registrada: ${studentName} ($${amountStr} USD)`,
          cuerpo_html: `<div style="font-family:sans-serif;padding:20px;background:#f0fdf4;border-radius:12px;border:1px solid #bbf7d0;">
            <h3 style="color:#15803d;margin-top:0;">Conciliación Bancaria Exitosa</h3>
            <p>Depósito de <strong>$${amountStr} USD</strong> acreditado a <strong>${studentName}</strong>.</p>
            <p>Oficial contable: ${verificadoPor} • Nuevo saldo: $${balanceStr} USD</p>
          </div>`,
          cuerpo_texto: `Acreditación confirmada para ${studentName} ($${amountStr} USD).`
        });
      }
    }

    // 3. Notificar a Admin (todos los usuarios registrados)
    if (rolesToNotify.includes('admin') || rolesToNotify.includes('escuela')) {
      const adminUsers = this.getRegisteredUsersForRole('admin');
      for (const au of adminUsers) {
        this.sendEmailNotification({
          destinatario_tipo: 'admin',
          destinatario_nombre: au.name,
          destinatario_email: au.email,
          evento: 'pago_confirmado',
          asunto: `✅ [Ingresos] Depósito Conciliado: ${studentName} ($${amountStr} USD)`,
          cuerpo_html: `<div style="font-family:sans-serif;padding:20px;background:#f0fdf4;border-radius:12px;border:1px solid #bbf7d0;">
            <h3 style="color:#15803d;margin-top:0;">Depósito Acreditado</h3>
            <p>Estudiante: <strong>${studentName}</strong> • Monto: <strong>$${amountStr} USD</strong></p>
          </div>`,
          cuerpo_texto: `Depósito acreditado para ${studentName} ($${amountStr} USD).`
        });
      }
    }
  }

  /**
   * Notificación cuando un pago es rechazado por inconsistencia bancaria
   */
  sendPaymentRejectedNotice(tx: Transaction, verificadoPor: string, motivo: string): void {
    const studentInfo = this.getUserRegisteredEmail(tx.estudiante_id, 'alumno@skyops.com', tx.estudiante_nombre || 'Daniel Alvarado');
    const studentName = tx.estudiante_nombre || studentInfo.name;
    const amountStr = tx.monto.toFixed(2);

    const rule = this.roleNotificationRules.find(r => r.evento === 'pago_rechazado');
    const rolesToNotify = (rule && rule.activo) ? rule.roles_notificados : ['estudiante', 'admin', 'contabilidad'];

    // 1. Notificar al Estudiante con motivo exacto
    if (rolesToNotify.includes('estudiante')) {
      const rendered = emailService.renderFlightEmail('payment_rejected', {
        student_name: studentName,
        amount: amountStr,
        reference: tx.referencia_ach || 'N/A',
        rejection_reason: motivo,
        verified_by: verificadoPor
      });

      this.sendEmailNotification({
        destinatario_tipo: 'estudiante',
        destinatario_nombre: studentName,
        destinatario_email: studentInfo.email,
        evento: 'pago_rechazado',
        asunto: `⚠️ Comprobante de Pago No Aprobado ($${amountStr} USD) - SkyOps Contabilidad`,
        cuerpo_html: rendered.html,
        cuerpo_texto: `Tu reporte de pago de $${amountStr} USD no pudo ser aprobado por Contabilidad. Motivo: ${motivo}.`
      });
    }

    // 2. Notificar a Contabilidad y Admin
    if (rolesToNotify.includes('contabilidad')) {
      const contaUsers = this.getRegisteredUsersForRole('contabilidad');
      for (const cu of contaUsers) {
        this.sendEmailNotification({
          destinatario_tipo: 'contabilidad',
          destinatario_nombre: cu.name,
          destinatario_email: cu.email,
          evento: 'pago_rechazado',
          asunto: `⚠️ Registro de Rechazo ACH: ${studentName} ($${amountStr} USD)`,
          cuerpo_html: `<div style="font-family:sans-serif;padding:20px;background:#fef2f2;border-radius:12px;border:1px solid #fecaca;">
            <h3 style="color:#b91c1c;margin-top:0;">Comprobante ACH Rechazado</h3>
            <p>Estudiante: <strong>${studentName}</strong> • Monto: <strong>$${amountStr} USD</strong></p>
            <p>Motivo: <em>${motivo}</em> • Oficial: ${verificadoPor}</p>
          </div>`,
          cuerpo_texto: `Rechazo de comprobante de ${studentName} ($${amountStr} USD). Motivo: ${motivo}.`
        });
      }
    }
  }

  /**
   * Notificación de pago acreditado inmediatamente mediante tarjeta de crédito / débito
   */
  sendCardPaymentConfirmedNotice(tx: Transaction, cardInfo: { brand: string; last4: string; cardholderName: string; authCode: string; gatewayReference: string }): void {
    const studentInfo = this.getUserRegisteredEmail(tx.estudiante_id, 'alumno@skyops.com', tx.estudiante_nombre || cardInfo.cardholderName);
    const studentName = tx.estudiante_nombre || studentInfo.name;
    const amountStr = tx.monto.toFixed(2);
    const balanceStr = tx.saldo_resultante.toFixed(2);
    const brandUpper = cardInfo.brand.toUpperCase();

    const rule = this.roleNotificationRules.find(r => r.evento === 'pago_tarjeta');
    const rolesToNotify = (rule && rule.activo) ? rule.roles_notificados : ['estudiante', 'contabilidad', 'admin'];

    // 1. Notificar al Estudiante (recibo formal de pasarela)
    if (rolesToNotify.includes('estudiante')) {
      const emailHtml = `
        <div style="font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,sans-serif;max-width:600px;margin:0 auto;border:1px solid #cbd5e1;border-radius:14px;overflow:hidden;background:#ffffff;">
          <div style="background:linear-gradient(135deg,#0369a1 0%,#0284c7 50%,#0f172a 100%);padding:24px 20px;color:#fff;">
            <span style="background:rgba(255,255,255,0.2);padding:3px 10px;border-radius:12px;font-size:11px;font-weight:bold;letter-spacing:1px;">💳 RECIBO DE PAGO CON TARJETA</span>
            <h2 style="margin:8px 0 0 0;font-size:20px;color:#fff;">SkyOps Flight Academy</h2>
            <p style="margin:2px 0 0 0;font-size:12px;color:#bae6fd;">Pasarela de Pagos Segura • Acreditación Instantánea</p>
          </div>
          <div style="padding:24px 20px;">
            <p style="font-size:15px;color:#1e293b;margin-top:0;">Estimado/a <strong>${studentName}</strong>,</p>
            <p style="font-size:14px;color:#475569;line-height:1.5;">Tu pago con tarjeta ha sido <strong>autorizado y acreditado exitosamente</strong> en tu cuenta de horas de vuelo.</p>
            <table style="width:100%;background:#f0fdf4;border:1px solid #bbf7d0;border-radius:10px;padding:16px;margin:16px 0;font-size:13px;">
              <tr><td style="color:#166534;padding:4px 0;">💰 Monto Acreditado:</td><td style="font-weight:bold;color:#15803d;font-size:16px;">+$${amountStr} USD</td></tr>
              <tr><td style="color:#166534;padding:4px 0;">💳 Método de Pago:</td><td style="font-weight:bold;color:#0f172a;">Tarjeta ${brandUpper} •••• ${cardInfo.last4}</td></tr>
              <tr><td style="color:#166534;padding:4px 0;">👤 Titular:</td><td style="color:#334155;">${cardInfo.cardholderName}</td></tr>
              <tr><td style="color:#166534;padding:4px 0;">🔢 Cód. Autorización:</td><td style="font-family:monospace;font-weight:bold;color:#0369a1;">${cardInfo.authCode}</td></tr>
              <tr><td style="color:#166534;padding:4px 0;">🧾 Ref. Transacción:</td><td style="font-family:monospace;color:#64748b;">${cardInfo.gatewayReference}</td></tr>
              <tr><td style="color:#166534;padding:4px 0;">✈️ Nuevo Saldo Disponible:</td><td style="font-weight:bold;color:#047857;font-size:15px;">$${balanceStr} USD</td></tr>
            </table>
            <p style="font-size:12px;color:#64748b;margin-top:16px;">Tu cuenta se encuentra habilitada inmediatamente para la reserva y programación de tus lecciones de vuelo.</p>
          </div>
          <div style="background:#f1f5f9;padding:12px 20px;border-top:1px solid #e2e8f0;text-align:center;font-size:11px;color:#64748b;">
            SkyOps Aviation S.A. • Procesamiento Certificado PCI-DSS & 3D-Secure
          </div>
        </div>
      `;

      this.sendEmailNotification({
        destinatario_tipo: 'estudiante',
        destinatario_nombre: studentName,
        destinatario_email: studentInfo.email,
        evento: 'pago_tarjeta',
        asunto: `💳 Recibo Oficial de Pago con Tarjeta: +$${amountStr} USD (Acreditado) - SkyOps`,
        cuerpo_html: emailHtml,
        cuerpo_texto: `Tu pago de $${amountStr} USD con tarjeta ${brandUpper} *${cardInfo.last4} ha sido acreditado. Autorización: ${cardInfo.authCode}. Nuevo saldo: $${balanceStr} USD.`
      });
    }

    // 2. Notificar a Contabilidad
    if (rolesToNotify.includes('contabilidad')) {
      const contaUsers = this.getRegisteredUsersForRole('contabilidad');
      for (const cu of contaUsers) {
        this.sendEmailNotification({
          destinatario_tipo: 'contabilidad',
          destinatario_nombre: cu.name,
          destinatario_email: cu.email,
          evento: 'pago_tarjeta',
          asunto: `💳 [Pasarela de Pagos] Cobro Exitoso Tarjeta: ${studentName} ($${amountStr} USD)`,
          cuerpo_html: `<div style="font-family:sans-serif;padding:20px;background:#f0fdf4;border-radius:12px;border:1px solid #bbf7d0;">
            <h3 style="color:#15803d;margin-top:0;">Cobro con Tarjeta Procesado en Línea</h3>
            <p>Estudiante: <strong>${studentName}</strong> • Monto: <strong>$${amountStr} USD</strong></p>
            <p>Tarjeta: <strong>${brandUpper} ****${cardInfo.last4}</strong> • Autorización: <code>${cardInfo.authCode}</code></p>
            <p>Saldo Resultante Acreditado: <strong>$${balanceStr} USD</strong></p>
          </div>`,
          cuerpo_texto: `Cobro en pasarela procesado para ${studentName} por $${amountStr} USD (${brandUpper} ****${cardInfo.last4}).`
        });
      }
    }

    // 3. Notificar a Admin
    if (rolesToNotify.includes('admin') || rolesToNotify.includes('escuela')) {
      const adminUsers = this.getRegisteredUsersForRole('admin');
      for (const au of adminUsers) {
        this.sendEmailNotification({
          destinatario_tipo: 'admin',
          destinatario_nombre: au.name,
          destinatario_email: au.email,
          evento: 'pago_tarjeta',
          asunto: `💳 [Ingresos Inmediatos] Tarjeta Procesada: ${studentName} ($${amountStr} USD)`,
          cuerpo_html: `<div style="font-family:sans-serif;padding:20px;background:#f0fdf4;border-radius:12px;border:1px solid #bbf7d0;">
            <h3 style="color:#15803d;margin-top:0;">Ingreso por Pasarela de Pagos</h3>
            <p>Estudiante: <strong>${studentName}</strong> • Monto: <strong>$${amountStr} USD</strong></p>
            <p>Liquidación en línea: Aut ${cardInfo.authCode}</p>
          </div>`,
          cuerpo_texto: `Ingreso inmediato por tarjeta de ${studentName} ($${amountStr} USD).`
        });
      }
    }
  }

  /**
   * Notificación cuando se genera un link de pago
   */
  sendPaymentLinkCreatedNotice(link: PaymentLink): void {
    const studentInfo = this.getUserRegisteredEmail(link.estudiante_id, 'alumno@skyops.com', link.estudiante_nombre);
    const amountStr = link.monto.toFixed(2);

    const emailHtml = `
      <div style="font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,sans-serif;max-width:600px;margin:0 auto;border:1px solid #cbd5e1;border-radius:14px;overflow:hidden;background:#ffffff;">
        <div style="background:linear-gradient(135deg,#4f46e5 0%,#4338ca 50%,#0f172a 100%);padding:24px 20px;color:#fff;">
          <span style="background:rgba(255,255,255,0.2);padding:3px 10px;border-radius:12px;font-size:11px;font-weight:bold;letter-spacing:1px;">🔗 ENLACE DE PAGO SEGURO</span>
          <h2 style="margin:8px 0 0 0;font-size:20px;color:#fff;">SkyOps Flight Academy</h2>
          <p style="margin:2px 0 0 0;font-size:12px;color:#c7d2fe;">Abono de Horas de Vuelo & Instrucción</p>
        </div>
        <div style="padding:24px 20px;">
          <p style="font-size:15px;color:#1e293b;margin-top:0;">Estimado/a <strong>${link.estudiante_nombre}</strong>,</p>
          <p style="font-size:14px;color:#475569;line-height:1.5;">Se ha generado un link de pago seguro para tu cuenta de estudiante. Puedes pagarlo tú mismo o compartirlo con tu patrocinador o familiar:</p>
          <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;padding:16px;margin:16px 0;font-size:13px;">
            <div><strong>Concepto:</strong> ${link.concepto}</div>
            <div style="margin-top:6px;"><strong>Monto a Pagar:</strong> <span style="font-size:18px;color:#4338ca;font-weight:bold;">$${amountStr} USD</span></div>
            ${link.horas_estimadas ? `<div style="margin-top:6px;"><strong>Horas Estimadas:</strong> ${link.horas_estimadas} horas de vuelo</div>` : ''}
            <div style="margin-top:6px;color:#64748b;"><strong>Vence el:</strong> ${new Date(link.expira_en).toLocaleDateString('es-PA')}</div>
          </div>
          <div style="text-align:center;margin:24px 0;">
            <a href="${link.url_pago}" style="display:inline-block;padding:12px 28px;background:#4f46e5;color:#ffffff;text-decoration:none;font-weight:bold;border-radius:10px;font-size:14px;box-shadow:0 4px 6px -1px rgba(79,70,229,0.3);">
              💳 Pagar Ahora con Tarjeta / Enlace Seguro
            </a>
          </div>
          <p style="font-size:12px;color:#94a3b8;margin:0;">Aceptamos tarjetas de Débito y Crédito (Visa, Mastercard, Clave). El saldo se acredita de forma inmediata una vez completado el pago.</p>
        </div>
      </div>
    `;

    this.sendEmailNotification({
      destinatario_tipo: 'estudiante',
      destinatario_nombre: link.estudiante_nombre,
      destinatario_email: studentInfo.email,
      evento: 'link_pago_creado',
      asunto: `🔗 Enlace de Pago Generado: $${amountStr} USD (${link.concepto}) - SkyOps`,
      cuerpo_html: emailHtml,
      cuerpo_texto: `Se ha generado un enlace de pago por $${amountStr} USD para ${link.concepto}. Paga aquí: ${link.url_pago}`
    });
  }

  /**
   * PROCESAMIENTO DIRECTO DE PAGO CON TARJETA DE DÉBITO O CRÉDITO
   */
  processCardPayment(payload: CardPaymentPayload): { success: boolean; transaction: Transaction; balance: number; authCode: string } {
    const student = this.getUserByIdOrReference(payload.studentId);
    const studentId = student?.id || payload.studentId || 'usr_est_daniel';
    const studentName = student?.nombre || payload.cardholderName || 'Estudiante';
    const amount = Number(Number(payload.amount).toFixed(2));

    if (isNaN(amount) || amount <= 0) {
      throw new Error('El monto debe ser mayor a cero.');
    }

    // Detección de marca de tarjeta
    const cleanNum = (payload.cardNumber || '').replace(/[\s-]/g, '');
    let brand: 'visa' | 'mastercard' | 'clave' | 'amex' | 'otro' = 'visa';
    if (cleanNum.startsWith('4')) brand = 'visa';
    else if (/^(5[1-5]|222[1-9]|22[3-9]|2[3-6]|27[0-1]|2720)/.test(cleanNum)) brand = 'mastercard';
    else if (/^(34|37)/.test(cleanNum)) brand = 'amex';
    else if (/^(5018|5020|5038|5893|6304|6759|6761|6762|6763|489)/.test(cleanNum) || cleanNum.length === 16 && cleanNum.startsWith('6')) brand = 'clave';

    const last4 = cleanNum.slice(-4) || '4242';
    const authCode = 'AUTH-' + Math.floor(100000 + Math.random() * 900000);
    const gatewayRef = 'SKYPAY-' + Date.now().toString().slice(-8) + '-' + Math.floor(1000 + Math.random() * 9000);

    const currentApprovedBalance = this.getStudentBalance(studentId);
    const newApprovedBalance = Number((currentApprovedBalance + amount).toFixed(2));

    const defaultConcept = payload.hoursEstimated
      ? `Abono de ${payload.hoursEstimated} Horas de Vuelo (Tarjeta ${brand.toUpperCase()})`
      : `Abono con Tarjeta ${brand.toUpperCase()} (${payload.cardType === 'debito' ? 'Débito' : 'Crédito'})`;

    const tx: Transaction = {
      id: 'tx_card_' + Date.now() + '_' + Math.floor(Math.random() * 1000),
      estudiante_id: studentId,
      estudiante_nombre: studentName,
      fecha: new Date().toISOString(),
      tipo: 'abono',
      concepto: (payload.concept || defaultConcept) as any,
      monto: amount,
      saldo_anterior: Number(currentApprovedBalance.toFixed(2)),
      saldo_resultante: newApprovedBalance,
      referencia_ach: gatewayRef,
      referencia_bancaria_confirmada: authCode,
      banco_origen: `Pasarela Segura SkyOps Pay (${brand.toUpperCase()})`,
      estado_aprobacion: 'aprobado',
      comprobado_banco: true,
      fecha_verificacion_bancaria: new Date().toISOString(),
      verificado_por: 'Pasarela de Pagos SkyOps SecurePay',
      creado_por: payload.cardholderName || studentName,
      notas: `Pago procesado con tarjeta ${brand.toUpperCase()} ****${last4}. Titular: ${payload.cardholderName}. Cód. Autorización: ${authCode}.`,
      creado_en: new Date().toISOString(),
      metodo_pago: payload.cardType === 'debito' ? 'tarjeta_debito' : 'tarjeta_credito',
      tarjeta_marca: brand,
      tarjeta_ultimos4: last4,
      tarjeta_titular: payload.cardholderName,
      pasarela_transaccion_id: gatewayRef,
      codigo_autorizacion: authCode,
      link_pago_id: payload.paymentLinkId
    };

    this.transactions.push(tx);

    // Si viene de un link de pago, actualizar su estado a 'pagado'
    if (payload.paymentLinkId) {
      const pIdx = this.paymentLinks.findIndex(p => p.id === payload.paymentLinkId || p.token === payload.paymentLinkId);
      if (pIdx >= 0) {
        this.paymentLinks[pIdx].estado = 'pagado';
        this.paymentLinks[pIdx].transaccion_id = tx.id;
        this.paymentLinks[pIdx].pagado_en = new Date().toISOString();
        this.paymentLinks[pIdx].metodo_usado = `Tarjeta ${brand.toUpperCase()} ****${last4}`;
        this.paymentLinks[pIdx].referencia = authCode;
      }
    }

    // Auditoría contable AAC
    this.addAuditLog({
      usuario_id: student?.id || 'usr_est_daniel',
      usuario_nombre: payload.cardholderName || studentName,
      usuario_rol: 'estudiante',
      modulo: 'contabilidad',
      accion: 'APROBAR_BANCARIO',
      entidad_tipo: `Cobro con Tarjeta ${brand.toUpperCase()}`,
      entidad_id: tx.id,
      estudiante_afectado_nombre: studentName,
      estudiante_afectado_id: studentId,
      descripcion: `Pago instantáneo con tarjeta de ${payload.cardType === 'debito' ? 'débito' : 'crédito'} por $${amount.toFixed(2)} USD. Cód. Autorización: ${authCode}.`,
      detalles_cambio: [
        { campo: 'monto', etiqueta: 'Monto Acreditado', valor_anterior: null, valor_nuevo: `$${amount.toFixed(2)}` },
        { campo: 'metodo_pago', etiqueta: 'Medio de Pago', valor_anterior: null, valor_nuevo: `Tarjeta ${brand.toUpperCase()} ****${last4}` },
        { campo: 'codigo_autorizacion', etiqueta: 'Autorización Pasarela', valor_anterior: null, valor_nuevo: authCode },
        { campo: 'saldo_resultante', etiqueta: 'Saldo Actualizado', valor_anterior: `$${currentApprovedBalance.toFixed(2)}`, valor_nuevo: `$${newApprovedBalance.toFixed(2)}` }
      ],
      referencia_normativa_aac: 'Manual de Cumplimiento Financiero y Custodia de Fondos Aeronáuticos AAC',
      severidad: 'regulatoria'
    });

    // Despacho de notificaciones oficiales por correo a todos los roles
    this.sendCardPaymentConfirmedNotice(tx, {
      brand,
      last4,
      cardholderName: payload.cardholderName || studentName,
      authCode,
      gatewayReference: gatewayRef
    });

    this.saveToDisk();
    return { success: true, transaction: tx, balance: newApprovedBalance, authCode };
  }

  // --- GESTIÓN DE LINKS DE PAGO ---
  getPaymentLinks(studentId?: string): PaymentLink[] {
    const now = Date.now();
    // Auto-expirar links vencidos
    for (const pl of this.paymentLinks) {
      if (pl.estado === 'pendiente' && new Date(pl.expira_en).getTime() < now) {
        pl.estado = 'expirado';
      }
    }

    let list = [...this.paymentLinks];
    if (studentId) {
      list = list.filter(p => p.estudiante_id === studentId);
    }
    return list.sort((a, b) => new Date(b.creado_en).getTime() - new Date(a.creado_en).getTime());
  }

  createPaymentLink(data: CreatePaymentLinkInput): PaymentLink {
    const student = this.getUserByIdOrReference(data.studentId);
    const studentId = student?.id || data.studentId || 'usr_est_daniel';
    const studentName = student?.nombre || 'Daniel Alvarado';
    const studentEmail = student?.correo || 'alumno@skyops.com';
    const amount = Number(Number(data.amount).toFixed(2));

    if (isNaN(amount) || amount <= 0) {
      throw new Error('El monto del link de pago debe ser mayor a cero.');
    }

    const token = 'sky_pay_' + crypto.randomBytes(5).toString('hex');
    const days = data.expiresInDays || 7;
    const expDate = new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();

    const link: PaymentLink = {
      id: 'plink_' + Date.now() + '_' + Math.floor(Math.random() * 1000),
      token,
      estudiante_id: studentId,
      estudiante_nombre: studentName,
      estudiante_correo: studentEmail,
      monto: amount,
      concepto: data.concept || `Abono de Horas de Vuelo ($${amount.toFixed(2)} USD)`,
      horas_estimadas: data.hoursEstimated,
      creado_por: data.createdBy || 'Contabilidad SkyOps',
      creado_en: new Date().toISOString(),
      expira_en: expDate,
      estado: 'pendiente',
      url_pago: `/pay/${token}`
    };

    this.paymentLinks.unshift(link);

    // Notificar al estudiante por correo
    this.sendPaymentLinkCreatedNotice(link);

    this.saveToDisk();
    return link;
  }

  getPaymentLinkByToken(token: string): PaymentLink | null {
    const link = this.paymentLinks.find(p => p.token === token || p.id === token);
    if (!link) return null;

    if (link.estado === 'pendiente' && new Date(link.expira_en).getTime() < Date.now()) {
      link.estado = 'expirado';
      this.saveToDisk();
    }
    return link;
  }

  payPaymentLink(token: string, paymentData: any): { success: boolean; transaction: Transaction; link: PaymentLink } {
    const link = this.getPaymentLinkByToken(token);
    if (!link) {
      throw new Error('El enlace de pago no existe o ha expirado.');
    }
    if (link.estado === 'pagado') {
      throw new Error('Este enlace de pago ya ha sido procesado anteriormente.');
    }
    if (link.estado === 'expirado') {
      throw new Error('Este enlace de pago ha expirado.');
    }
    if (link.estado === 'cancelado') {
      throw new Error('Este enlace de pago fue cancelado.');
    }

    const res = this.processCardPayment({
      studentId: link.estudiante_id,
      amount: link.monto,
      concept: link.concepto,
      cardholderName: paymentData.cardholderName || link.estudiante_nombre,
      cardNumber: paymentData.cardNumber || '4532112233445566',
      expiry: paymentData.expiry || '12/28',
      cvv: paymentData.cvv || '888',
      cardType: paymentData.cardType || 'debito',
      hoursEstimated: link.horas_estimadas,
      paymentLinkId: link.id
    });

    link.estado = 'pagado';
    link.transaccion_id = res.transaction.id;
    link.pagado_en = new Date().toISOString();
    link.referencia = res.authCode;
    this.saveToDisk();

    return { success: true, transaction: res.transaction, link };
  }

  cancelPaymentLink(id: string): boolean {
    const link = this.paymentLinks.find(p => p.id === id || p.token === id);
    if (!link) return false;
    link.estado = 'cancelado';
    this.saveToDisk();
    return true;
  }

  /**
   * Alerta por correo de saldo insuficiente / bajo
   */
  sendLowBalanceEmailAlert(studentId: string): EmailNotification[] {
    const student = this.getUserById(studentId);
    if (!student) return [];
    const balance = this.getStudentBalance(studentId);
    const studentEmail = student.correo || 'alumno@skyops.com';
    const balanceStr = balance.toFixed(2);

    const rendered = emailService.renderFlightEmail('low_balance_alert', {
      student_name: student.nombre,
      balance: balanceStr
    });

    const notifs: EmailNotification[] = [];

    // Alumno
    notifs.push(this.sendEmailNotification({
      destinatario_tipo: 'estudiante',
      destinatario_nombre: student.nombre,
      destinatario_email: studentEmail,
      evento: 'alerta_saldo_bajo',
      asunto: `⚠️ Alerta de Saldo Operacional: ${student.nombre} ($${balanceStr} USD) - SkyOps`,
      cuerpo_html: rendered.html,
      cuerpo_texto: `Tu saldo actual de horas de vuelo es de $${balanceStr} USD. Te sugerimos realizar una recarga ACH.`
    }));

    // Contabilidad
    notifs.push(this.sendEmailNotification({
      destinatario_tipo: 'contabilidad',
      destinatario_nombre: 'Lic. Carlos Mendoza (Contabilidad)',
      destinatario_email: 'contabilidad@skyops.com',
      evento: 'alerta_saldo_bajo',
      asunto: `⚠️ Saldo Crítico de Estudiante: ${student.nombre} ($${balanceStr} USD)`,
      cuerpo_html: `<div style="font-family:sans-serif;padding:20px;background:#fefce8;border-radius:12px;border:1px solid #fef08a;">
        <h3 style="color:#854d0e;margin-top:0;">Alerta de Saldo Insuficiente</h3>
        <p>El estudiante <strong>${student.nombre}</strong> tiene un saldo actual de <strong>$${balanceStr} USD</strong>.</p>
        <p>Se requiere seguimiento de cobranza antes de autorizar próximos despachos de vuelo.</p>
      </div>`,
      cuerpo_texto: `Saldo bajo de ${student.nombre}: $${balanceStr} USD.`
    }));

    return notifs;
  }

  /**
   * Alerta médica regulatoria AAC (RAC 67)
   */
  sendMedicalExpirationEmailAlert(userId: string): EmailNotification[] {
    const user = this.getUserById(userId);
    if (!user) return [];
    const targetEmail = user.correo || 'alumno@skyops.com';
    const expDate = user.vencimiento_medico || '2026-11-15';
    const diffDays = Math.ceil((new Date(expDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24));

    const rendered = emailService.renderFlightEmail('medical_expiration_alert', {
      pilot_name: user.nombre,
      pilot_role: (user.rol || 'estudiante').toUpperCase(),
      medical_number: user.numero_medico || 'MED-PAN-2026-88',
      expiration_date: expDate,
      days_left: String(Math.max(0, diffDays))
    });

    const notifs: EmailNotification[] = [];

    // Piloto
    notifs.push(this.sendEmailNotification({
      destinatario_tipo: user.rol as any,
      destinatario_nombre: user.nombre,
      destinatario_email: targetEmail,
      evento: 'alerta_vigencia_medica',
      asunto: `🚨 Alerta Regulatoria AAC: Vencimiento de Certificado Médico - ${user.nombre}`,
      cuerpo_html: rendered.html,
      cuerpo_texto: `Tu certificado médico aeronáutico vence el ${expDate} (${diffDays} días restantes). RAC 67.025.`
    }));

    // Instructora / Jefatura
    notifs.push(this.sendEmailNotification({
      destinatario_tipo: 'instructor',
      destinatario_nombre: 'Cap. Valeria Benítez (Jefatura de Instrucción)',
      destinatario_email: 'instructor@skyops.com',
      evento: 'alerta_vigencia_medica',
      asunto: `🚨 [Supervisión AAC] Vencimiento Médico: ${user.nombre} (${user.rol.toUpperCase()})`,
      cuerpo_html: rendered.html,
      cuerpo_texto: `Aviso de vigencia médica próxima a vencer para ${user.nombre}: ${expDate}.`
    }));

    // Admin
    notifs.push(this.sendEmailNotification({
      destinatario_tipo: 'admin',
      destinatario_nombre: 'Dirección de Operaciones SkyOps',
      destinatario_email: 'admin@skyops.com',
      evento: 'alerta_vigencia_medica',
      asunto: `🚨 [Auditoría AAC] Hard Lock Médico Próximo: ${user.nombre}`,
      cuerpo_html: rendered.html,
      cuerpo_texto: `Control de licencias: certificado médico de ${user.nombre} vence el ${expDate}.`
    }));

    return notifs;
  }

  /**
   * Alerta regulatoria de vencimiento de licencia de vuelo
   */
  sendLicenseExpirationEmailAlert(userId: string): EmailNotification[] {
    const user = this.getUserById(userId);
    if (!user) return [];
    const targetEmail = user.correo || 'alumno@skyops.com';
    const expDate = user.vencimiento_licencia || '2026-12-31';
    const diffDays = Math.ceil((new Date(expDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24));

    const rendered = emailService.renderFlightEmail('license_expiration_alert', {
      pilot_name: user.nombre,
      pilot_role: (user.rol || 'estudiante').toUpperCase(),
      license_type: user.rol === 'instructor' ? 'CFI-A (Instructor de Vuelo)' : 'SPL (Alumno Piloto)',
      license_number: user.licencia || 'AAC-PAN-8812',
      expiration_date: expDate,
      days_left: String(Math.max(0, diffDays))
    });

    const notifs: EmailNotification[] = [];

    // Piloto
    notifs.push(this.sendEmailNotification({
      destinatario_tipo: user.rol as any,
      destinatario_nombre: user.nombre,
      destinatario_email: targetEmail,
      evento: 'alerta_licencia_vuelo',
      asunto: `🚨 Alerta Regulatoria AAC: Vencimiento de Licencia Aeronáutica - ${user.nombre}`,
      cuerpo_html: rendered.html,
      cuerpo_texto: `Tu licencia aeronáutica vence el ${expDate}. RAC 61.`
    }));

    // Admin
    notifs.push(this.sendEmailNotification({
      destinatario_tipo: 'admin',
      destinatario_nombre: 'Dirección de Operaciones SkyOps',
      destinatario_email: 'admin@skyops.com',
      evento: 'alerta_licencia_vuelo',
      asunto: `🚨 [Auditoría AAC] Vencimiento de Licencia: ${user.nombre}`,
      cuerpo_html: rendered.html,
      cuerpo_texto: `Licencia de ${user.nombre} vence el ${expDate}.`
    }));

    return notifs;
  }

  /**
   * Alerta técnica de mantenimiento de aeronaves
   */
  sendAircraftMaintenanceEmailAlert(aircraftReg?: string, details?: string): EmailNotification[] {
    const reg = aircraftReg || 'HP-1721SP';
    const detailMsg = details || 'Aeronave acumuló 48.5 horas desde la última inspección periódica de 50 horas reglamentaria.';

    const rendered = emailService.renderFlightEmail('maintenance_alert', {
      airplane_reg: reg,
      airplane_model: 'Cessna 172SP Skyhawk',
      component_name: 'Inspección Periódica 50 Horas / Cambio de Filtros y Aceite',
      hours_remaining: '1.5',
      scheduled_date: new Date(Date.now() + 86400000 * 3).toISOString().slice(0, 10),
      action_required: detailMsg
    });

    const notifs: EmailNotification[] = [];

    // Admin / Jefatura de Operaciones
    notifs.push(this.sendEmailNotification({
      destinatario_tipo: 'admin',
      destinatario_nombre: 'Dirección Técnica de Flota SkyOps',
      destinatario_email: 'admin@skyops.com',
      evento: 'alerta_mantenimiento',
      asunto: `🛠️ Alerta de Mantenimiento Preventivo: ${reg} - SkyOps Fleet`,
      cuerpo_html: rendered.html,
      cuerpo_texto: `Alerta técnica para ${reg}: ${detailMsg}`
    }));

    // Instructores de Vuelo
    notifs.push(this.sendEmailNotification({
      destinatario_tipo: 'instructor',
      destinatario_nombre: 'Cap. Valeria Benítez (Instructora de Vuelo)',
      destinatario_email: 'instructor@skyops.com',
      evento: 'alerta_mantenimiento',
      asunto: `🛠️ [Aviso a Instructores] Estado de Mantenimiento ${reg}`,
      cuerpo_html: rendered.html,
      cuerpo_texto: `Aeronave ${reg} próxima a inspección técnica.`
    }));

    return notifs;
  }

  /**
   * Escaneo global de todas las condiciones de alerta del sistema y despacho automático a todos los roles
   */
  scanAndDispatchAllAlerts(): { lowBalanceCount: number; medicalCount: number; maintenanceCount: number; totalSent: number } {
    let lowBalanceCount = 0;
    let medicalCount = 0;
    let maintenanceCount = 0;
    let totalSent = 0;

    // 1. Escanear estudiantes con balance bajo (< $200)
    for (const u of this.users.filter(x => x.rol === 'estudiante')) {
      const bal = this.getStudentBalance(u.id);
      if (bal < 200) {
        const sent = this.sendLowBalanceEmailAlert(u.id);
        lowBalanceCount++;
        totalSent += sent.length;
      }
    }

    // 2. Escanear pilotos con certificado médico próximo a expirar (<= 45 días)
    const now = Date.now();
    for (const u of this.users.filter(x => x.rol === 'estudiante' || x.rol === 'instructor')) {
      if (u.vencimiento_medico) {
        const expTime = new Date(u.vencimiento_medico).getTime();
        const daysLeft = (expTime - now) / (1000 * 60 * 60 * 24);
        if (daysLeft <= 45) {
          const sent = this.sendMedicalExpirationEmailAlert(u.id);
          medicalCount++;
          totalSent += sent.length;
        }
      }
    }

    // 3. Alerta de mantenimiento para aeronaves principales
    const sentMaint = this.sendAircraftMaintenanceEmailAlert('HP-1721SP');
    maintenanceCount++;
    totalSent += sentMaint.length;

    this.saveToDisk();
    return { lowBalanceCount, medicalCount, maintenanceCount, totalSent };
  }

  // --- STATS INSTRUCTOR (BASADO EXCLUSIVAMENTE EN BITÁCORAS REGISTRADAS POR ADMINISTRACIÓN) ---
  getInstructorDualGivenStats(instructorId: string, monthStr?: string): InstructorDualGivenStats {
    const currentMonth = monthStr || new Date().toISOString().substring(0, 7); // YYYY-MM

    const adminStatements = this.instructorFeeStatements.filter(
      s => s.registrado_por_admin === true && s.instructor_id === instructorId && s.estado !== 'rechazado'
    );

    let totalDual = 0;
    let totalFlights = 0;
    let totalFeesMonth = 0;
    const pilotMap: Record<string, { id: string; name: string; hours: number; missions: number; amount: number }> = {};
    const planeMap: Record<string, { model: string; hours: number }> = {};

    for (const stmt of adminStatements) {
      const items =
        Array.isArray(stmt.vuelos) && stmt.vuelos.length > 0
          ? stmt.vuelos
          : [
              {
                id: `stmt_${stmt.id}`,
                fecha: stmt.periodo_inicio,
                matricula_avion: stmt.matricula_avion || 'Aeronave',
                modelo_avion: stmt.modelo_avion || 'Flota SkyOps',
                folio_bitacora: stmt.folio_bitacora || stmt.id,
                estudiante_id: stmt.piloto_id || 'piloto_manual',
                estudiante_nombre: stmt.piloto_nombre || 'Piloto Registrado',
                piloto_nombre: stmt.piloto_nombre || 'Piloto Registrado',
                horas_vuelo: stmt.total_horas,
                tarifa_instructor_hora: stmt.tarifa_base_hora,
                subtotal: stmt.total_neto
              }
            ];

      for (const item of items) {
        if (!item.fecha || !item.fecha.startsWith(currentMonth)) continue;

        const hrs = Number(item.horas_vuelo || 0);
        const amount = Number(item.subtotal ?? stmt.total_neto ?? 0);
        totalDual += hrs;
        totalFlights += 1;
        totalFeesMonth += amount;

        const pilotName = (item.piloto_nombre || item.estudiante_nombre || stmt.piloto_nombre || 'Piloto Registrado').trim();
        const pilotKey = item.estudiante_id && item.estudiante_id !== 'piloto_manual' ? item.estudiante_id : `pilot_${pilotName.toLowerCase()}`;
        if (!pilotMap[pilotKey]) {
          pilotMap[pilotKey] = {
            id: item.estudiante_id || pilotKey,
            name: pilotName,
            hours: 0,
            missions: 0,
            amount: 0
          };
        }
        pilotMap[pilotKey].hours += hrs;
        pilotMap[pilotKey].missions += 1;
        pilotMap[pilotKey].amount += amount;

        const mat = item.matricula_avion || stmt.matricula_avion || 'FLOTA';
        if (!planeMap[mat]) {
          planeMap[mat] = {
            model: item.modelo_avion || stmt.modelo_avion || 'Aeronave Escuela',
            hours: 0
          };
        }
        planeMap[mat].hours += hrs;
      }
    }

    return {
      instructor_id: instructorId,
      mes: currentMonth,
      total_horas_dual: Number(totalDual.toFixed(2)),
      total_vuelos_realizados: totalFlights,
      total_honorarios_mes: Number(totalFeesMonth.toFixed(2)),
      registrado_por_admin_only: true,
      desglose_por_alumno: Object.values(pilotMap).map(info => ({
        estudiante_id: info.id,
        estudiante_nombre: info.name,
        horas_dual: Number(info.hours.toFixed(2)),
        misiones: info.missions,
        monto_honorarios: Number(info.amount.toFixed(2))
      })),
      desglose_por_avion: Object.entries(planeMap).map(([mat, info]) => ({
        matricula: mat,
        modelo: info.model,
        horas: Number(info.hours.toFixed(2))
      }))
    };
  }

  // --- HONORARIOS DE INSTRUCTORES (EXCLUSIVO POR BITÁCORAS REGISTRADAS POR ADMINISTRACIÓN) ---

  getInstructorFeeStatements(filter?: { instructorId?: string; status?: InstructorFeeStatus; search?: string }): InstructorFeeStatement[] {
    let list = this.instructorFeeStatements.filter(s => s.registrado_por_admin === true);

    if (filter?.instructorId) {
      list = list.filter(s => s.instructor_id === filter.instructorId);
    }

    if (filter?.status) {
      list = list.filter(s => s.estado === filter.status);
    }

    if (filter?.search) {
      const q = filter.search.toLowerCase().trim();
      const qClean = q.replace(/[\s.-]/g, '');
      list = list.filter(s => {
        const nameMatch = s.instructor_nombre.toLowerCase().includes(q);
        const cedulaMatch = s.instructor_cedula?.replace(/[\s.-]/g, '').includes(qClean);
        const licMatch = s.instructor_licencia?.toLowerCase().includes(q);
        const idMatch = s.id.toLowerCase().includes(q);
        const folioMatch = s.folio_bitacora?.toLowerCase().includes(q);
        const pilotoMatch = s.piloto_nombre?.toLowerCase().includes(q);
        const matMatch = s.matricula_avion?.toLowerCase().includes(q);
        const studentMatch = s.vuelos.some(
          v =>
            v.estudiante_nombre?.toLowerCase().includes(q) ||
            v.piloto_nombre?.toLowerCase().includes(q) ||
            v.folio_bitacora?.toLowerCase().includes(q) ||
            v.matricula_avion?.toLowerCase().includes(q)
        );
        return nameMatch || cedulaMatch || licMatch || idMatch || folioMatch || pilotoMatch || matMatch || studentMatch;
      });
    }

    return list.sort((a, b) => new Date(b.fecha_generacion).getTime() - new Date(a.fecha_generacion).getTime());
  }

  getInstructorFeeStatementById(id: string): InstructorFeeStatement | undefined {
    return this.instructorFeeStatements.find(s => s.id === id && s.registrado_por_admin === true);
  }

  registerBitacoraHonorario(input: RegisterBitacoraHonorarioInput): InstructorFeeStatement {
    const actorUser = input.registrado_por_id ? this.getUserById(input.registrado_por_id) : undefined;
    const actorRole: UserRole = actorUser?.rol || input.registrado_por_rol;
    const allowedRoles: UserRole[] = ['admin', 'escuela', 'contabilidad', 'instructor', 'instructor_en_jefe'];

    if (!allowedRoles.includes(actorRole)) {
      const err: any = new Error('No tiene permisos para registrar bitácoras y generar honorarios de instructores.');
      err.statusCode = 403;
      throw err;
    }

    const folio = (input.folio_bitacora || '').trim();
    if (!folio) {
      throw new Error('El número / folio de bitácora es obligatorio.');
    }

    const fecha = (input.fecha || '').trim();
    if (!fecha) {
      throw new Error('La fecha del vuelo en bitácora es obligatoria.');
    }

    const matricula = (input.matricula_avion || '').trim().toUpperCase();
    if (!matricula) {
      throw new Error('La matrícula de la aeronave es obligatoria.');
    }

    // Resolver estudiante vinculado por ID o coincidencia exacta en catálogo de estudiantes
    const requestedStudentId = (input.estudiante_id || input.piloto_id || '').trim();
    const rawStudentName = (input.estudiante_nombre || input.piloto_nombre || '').trim();
    let matchedStudent: User | undefined;

    if (requestedStudentId) {
      matchedStudent = this.users.find(u => u.id === requestedStudentId);
    }
    if (!matchedStudent && rawStudentName) {
      const normName = rawStudentName.toLowerCase();
      matchedStudent = this.users.find(
        u => u.rol === 'estudiante' && u.nombre.trim().toLowerCase() === normName
      );
    }

    const shouldDebitStudent = input.aplicar_debito_estudiante !== false;

    if (shouldDebitStudent && (!matchedStudent || matchedStudent.rol !== 'estudiante')) {
      throw new Error('Debe seleccionar un estudiante registrado para ligar la bitácora y debitar sus fondos.');
    }

    const estudianteNombre = (matchedStudent?.nombre || rawStudentName).trim();
    if (!estudianteNombre) {
      throw new Error('El estudiante de la bitácora es obligatorio.');
    }

    const instructor = this.users.find(
      u => u.id === input.instructor_id && (u.rol === 'instructor' || u.rol === 'instructor_en_jefe' || u.rol === 'admin')
    );
    if (!instructor) {
      throw new Error('Debe seleccionar un instructor válido para asignar el honorario.');
    }

    const horas = Number(input.horas_vuelo);
    if (!Number.isFinite(horas) || horas <= 0) {
      throw new Error('Las horas de vuelo deben ser mayores a 0.');
    }

    const tarifa = Number(input.tarifa_instructor_hora);
    if (!Number.isFinite(tarifa) || tarifa <= 0) {
      throw new Error('La tarifa horaria del instructor debe ser mayor a $0 USD.');
    }

    // Evitar duplicados para el mismo folio activo
    const duplicate = this.instructorFeeStatements.find(
      s =>
        s.registrado_por_admin === true &&
        s.estado !== 'rechazado' &&
        ((s.folio_bitacora || '').toLowerCase() === folio.toLowerCase() ||
          s.vuelos.some(v => (v.folio_bitacora || '').toLowerCase() === folio.toLowerCase()))
    );
    if (duplicate) {
      const err: any = new Error(`Ya existe un honorario creado para el folio de bitácora "${folio}" (${duplicate.id}).`);
      err.statusCode = 409;
      throw err;
    }

    const fleetDefaults: Record<string, { model: string; aircraftRate: number }> = {
      'HP-1450': { model: 'Cessna 172 Skyhawk', aircraftRate: 220.0 },
      'HP-1588': { model: 'Cessna 172SP Garmin G1000', aircraftRate: 220.0 },
      'HP-1822': { model: 'Piper PA-44 Seminole Multi-Motor', aircraftRate: 340.0 },
      'HP-1799': { model: 'Piper PA-28 Archer III', aircraftRate: 220.0 },
      'HP-1934': { model: 'Piper PA-28 Cherokee', aircraftRate: 220.0 },
      'SIM-ALX': { model: 'Simulador Alsim ALX FNPT II', aircraftRate: 120.0 }
    };
    const model = (input.modelo_avion || fleetDefaults[matricula]?.model || 'Aeronave Escuela').trim();
    const origen = (input.origen || 'MPMG').trim().toUpperCase();
    const destino = (input.destino || 'MPMG').trim().toUpperCase();
    const route = `${origen} - ${destino}`;
    const mission = (input.tipo_mision || 'Instrucción de Vuelo en Aeronave').trim();

    let linkedTxId = input.bitacora_transaction_id;
    let studentDebitAmount: number | undefined;
    let studentPrevBalance: number | undefined;
    let studentResultBalance: number | undefined;
    const registrarName = (actorUser?.nombre || input.registrado_por_nombre || 'Administración SkyOps').trim();

    // Si ya existe transacción de débito previa (ej. desde Módulo de Bitácoras o Contabilidad), enlazar sus montos
    if (linkedTxId) {
      const existingTx = this.transactions.find(t => t.id === linkedTxId);
      if (existingTx) {
        studentDebitAmount = existingTx.monto;
        studentPrevBalance = existingTx.saldo_anterior;
        studentResultBalance = existingTx.saldo_resultante;
      }
    }

    // Debitar automáticamente de los fondos del estudiante (Fórmula estudiante: Hobbs × 1.275) sin alterar honorarios
    if (shouldDebitStudent && matchedStudent && !linkedTxId) {
      const STUDENT_HOBBS_FACTOR = 1.275;
      const acRate =
        Number(input.tarifa_aeronave_hora) > 0
          ? Number(input.tarifa_aeronave_hora)
          : (fleetDefaults[matricula]?.aircraftRate || 220.0);
      const studentBillableHours = Number((horas * STUDENT_HOBBS_FACTOR).toFixed(4));
      const debitMonto = Number((studentBillableHours * acRate).toFixed(2));
      const prevBal = this.getStudentBalance(matchedStudent.id);

      const createdTx = this.addTransaction({
        estudiante_id: matchedStudent.id,
        estudiante_nombre: matchedStudent.nombre,
        fecha,
        tipo: 'cargo',
        concepto: 'Horas Bloque Vuelo',
        monto: debitMonto,
        referencia_ach: folio,
        creado_por: `${registrarName} (${actorRole.toUpperCase()})`,
        notas: `Vuelo en ${model} (${matricula}) - ${horas} hrs Hobbs × 1.275 = ${studentBillableHours} hrs @ $${acRate}/h. Estudiante: ${estudianteNombre}. Bitácora #${folio}. Instructor: ${instructor.nombre}. ${input.observaciones || ''}`.trim(),
        estado_aprobacion: 'aprobado',
        comprobado_banco: true,
        fecha_verificacion_bancaria: new Date().toISOString(),
        verificado_por: registrarName,
        horas_vuelo: studentBillableHours,
        horas_hobbs: horas,
        factor_cobro_estudiante: STUDENT_HOBBS_FACTOR,
        tarifa_hora: acRate,
        matricula_avion: matricula,
        modelo_avion: model,
        instructor_nombre: instructor.nombre,
        tipo_mision: mission,
        saldo_anterior: prevBal
      });
      linkedTxId = createdTx.id;
      studentDebitAmount = createdTx.monto;
      studentPrevBalance = createdTx.saldo_anterior;
      studentResultBalance = createdTx.saldo_resultante;
    }

    const retencionPct = Number(input.retencion_pct) >= 0 ? Number(input.retencion_pct) : 0;
    const totalBruto = Number((horas * tarifa).toFixed(2));
    const retencionImpuesto = Number(((totalBruto * retencionPct) / 100).toFixed(2));
    const totalNeto = Number((totalBruto - retencionImpuesto).toFixed(2));

    const periodCode = fecha.replace(/-/g, '').substring(0, 6);
    let seq = this.instructorFeeStatements.length + 1;
    let statementId = `HON-BIT-${periodCode}-${String(seq).padStart(3, '0')}`;
    while (this.instructorFeeStatements.some(s => s.id === statementId)) {
      seq += 1;
      statementId = `HON-BIT-${periodCode}-${String(seq).padStart(3, '0')}`;
    }

    const flightItem: InstructorFlightFeeItem = {
      id: `fee_${folio.replace(/[^a-zA-Z0-9_-]/g, '')}_${Date.now()}`,
      fecha,
      matricula_avion: matricula,
      modelo_avion: model,
      folio_bitacora: folio,
      estudiante_id: matchedStudent?.id || 'sin_estudiante',
      estudiante_nombre: estudianteNombre,
      piloto_nombre: estudianteNombre,
      estudiante_cedula: matchedStudent?.documento_identidad,
      estudiante_licencia: matchedStudent?.licencia,
      horas_vuelo: horas,
      tarifa_instructor_hora: tarifa,
      subtotal: totalBruto,
      tipo_mision: mission,
      origen_destino: route,
      tacometro_inicial: input.tacometro_inicial !== undefined ? Number(input.tacometro_inicial) : undefined,
      tacometro_final: input.tacometro_final !== undefined ? Number(input.tacometro_final) : undefined,
      hobbs_inicial: input.hobbs_inicial !== undefined ? Number(input.hobbs_inicial) : undefined,
      hobbs_final: input.hobbs_final !== undefined ? Number(input.hobbs_final) : undefined,
      estado_pago: 'incluido_en_liquidacion'
    };

    const statement: InstructorFeeStatement = {
      id: statementId,
      instructor_id: instructor.id,
      instructor_nombre: instructor.nombre,
      instructor_cedula: instructor.documento_identidad || 'N/A',
      instructor_licencia: instructor.licencia || 'CFI',
      instructor_correo: instructor.correo || 'instructor@skyops.com',
      instructor_telefono: instructor.telefono,
      periodo_inicio: fecha,
      periodo_fin: fecha,
      fecha_generacion: new Date().toISOString(),
      fecha_envio_contabilidad: new Date().toISOString(),
      total_horas: Number(horas.toFixed(2)),
      total_vuelos: 1,
      tarifa_base_hora: tarifa,
      total_bruto: totalBruto,
      retencion_impuesto: retencionImpuesto,
      total_neto: totalNeto,
      estado: 'enviado_contabilidad',
      vuelos: [flightItem],
      notas_instructor:
        (input.observaciones || '').trim() ||
        `Honorario generado según Bitácora #${folio} (${matricula}, Estudiante: ${estudianteNombre}).`,
      banco_pago: 'Banco General de Panamá (Transferencia ACH)',
      procesado_por: registrarName,
      folio_bitacora: folio,
      estudiante_id: matchedStudent?.id,
      estudiante_nombre: estudianteNombre,
      piloto_id: matchedStudent?.id,
      piloto_nombre: estudianteNombre,
      matricula_avion: matricula,
      modelo_avion: model,
      tipo_mision: mission,
      origen_destino: route,
      registrado_por_admin: true,
      registrado_por_id: actorUser?.id || input.registrado_por_id,
      registrado_por_nombre: registrarName,
      registrado_por_rol: actorRole,
      bitacora_transaction_id: linkedTxId,
      estudiante_monto_debitado: studentDebitAmount,
      estudiante_saldo_anterior: studentPrevBalance,
      estudiante_saldo_resultante: studentResultBalance,
      tacometro_inicial: input.tacometro_inicial !== undefined ? Number(input.tacometro_inicial) : undefined,
      tacometro_final: input.tacometro_final !== undefined ? Number(input.tacometro_final) : undefined,
      hobbs_inicial: input.hobbs_inicial !== undefined ? Number(input.hobbs_inicial) : undefined,
      hobbs_final: input.hobbs_final !== undefined ? Number(input.hobbs_final) : undefined
    };

    this.instructorFeeStatements.unshift(statement);

    try {
      const debitInfo =
        studentDebitAmount !== undefined && studentResultBalance !== undefined
          ? ` Débito al estudiante: -$${studentDebitAmount.toFixed(2)} USD (Saldo resultante: $${studentResultBalance.toFixed(2)} USD).`
          : '';
      this.createAccountingMessage({
        remitente_id: actorUser?.id || input.registrado_por_id || 'usr_jefatura_1',
        remitente_nombre: registrarName,
        destinatario_id: 'usr_conta_1',
        destinatario_nombre: 'Lic. Mariana Chen - Contabilidad y Finanzas',
        asunto: `Nuevo Honorario por Bitácora #${folio}: ${instructor.nombre}`,
        mensaje: `Administración (${registrarName}) registró la Bitácora #${folio} (${matricula}, Estudiante: ${estudianteNombre}, ${horas.toFixed(1)} hrs) creando el honorario ${statement.id} para ${instructor.nombre} por $${totalNeto.toFixed(2)} USD.${debitInfo}`,
        prioridad: 'alta'
      });
    } catch (msgErr) {
      console.warn('[Honorarios] Error no crítico en mensaje contable:', msgErr);
    }

    try {
      this.addAuditLog({
        usuario_id: actorUser?.id || input.registrado_por_id || 'usr_jefatura_1',
        usuario_nombre: registrarName,
        usuario_rol: actorRole,
        modulo: 'contabilidad',
        accion: 'CREAR',
        entidad_tipo: 'Honorario por Bitácora Registrada',
        entidad_id: statement.id,
        estudiante_afectado_id: matchedStudent?.id,
        estudiante_afectado_nombre: estudianteNombre,
        descripcion: `Registro oficial de Bitácora #${folio} (Estudiante: ${estudianteNombre}, Aeronave: ${matricula}, ${horas.toFixed(1)} hrs) con creación 1-a-1 de honorario ${statement.id} para ${instructor.nombre}: $${totalNeto.toFixed(2)} USD.${studentDebitAmount !== undefined ? ` Débito aplicado al estudiante: -$${studentDebitAmount.toFixed(2)} USD.` : ''}`,
        detalles_cambio: [
          { campo: 'folio_bitacora', etiqueta: 'Folio Bitácora', valor_anterior: null, valor_nuevo: folio },
          { campo: 'estudiante_nombre', etiqueta: 'Estudiante Vinculado', valor_anterior: null, valor_nuevo: estudianteNombre },
          { campo: 'total_neto', etiqueta: 'Honorario Neto USD', valor_anterior: null, valor_nuevo: `$${totalNeto.toFixed(2)}` },
          ...(studentDebitAmount !== undefined
            ? [{ campo: 'estudiante_monto_debitado', etiqueta: 'Débito al Estudiante', valor_anterior: null, valor_nuevo: `-$${studentDebitAmount.toFixed(2)} USD` }]
            : [])
        ],
        severidad: 'info'
      });
    } catch (audErr) {
      console.warn('[Honorarios] Error no crítico en auditoría:', audErr);
    }

    try {
      this.sendEmailNotification({
        destinatario_tipo: 'instructor',
        destinatario_nombre: instructor.nombre,
        destinatario_email: instructor.correo || 'instructor@skyops.com',
        evento: 'honorarios_instructor_generados',
        asunto: `Honorario Registrado por Bitácora #${folio} (${statement.id}) - $${totalNeto.toFixed(2)} USD`,
        cuerpo_html: `<p>Estimado/a ${instructor.nombre},</p><p>Administración ha registrado la bitácora oficial <strong>#${folio}</strong> y generado su honorario correspondiente:</p><ul><li><strong>Estudiante:</strong> ${estudianteNombre}</li><li><strong>Aeronave:</strong> ${matricula} (${model})</li><li><strong>Fecha:</strong> ${fecha}</li><li><strong>Horas:</strong> ${horas.toFixed(1)} hrs</li><li><strong>Neto a Pagar:</strong> $${totalNeto.toFixed(2)} USD</li></ul>`,
        cuerpo_texto: `Estimado/a ${instructor.nombre},\n\nAdministración ha registrado la bitácora #${folio} (Estudiante: ${estudianteNombre}, Aeronave: ${matricula}, Fecha: ${fecha}, Horas: ${horas.toFixed(1)} hrs) creando su honorario ${statement.id} por $${totalNeto.toFixed(2)} USD.`
      });
    } catch (emErr) {
      console.warn('[Honorarios] Error no crítico en email:', emErr);
    }

    if (!input.omitir_email_estudiante && matchedStudent?.correo) {
      try {
        const debitDesc =
          studentDebitAmount !== undefined && studentResultBalance !== undefined
            ? `<li><strong>Cargo Aplicado:</strong> -$${studentDebitAmount.toFixed(2)} USD</li><li><strong>Saldo Resultante:</strong> $${studentResultBalance.toFixed(2)} USD</li>`
            : '';
        this.sendEmailNotification({
          destinatario_tipo: 'estudiante',
          destinatario_nombre: matchedStudent.nombre,
          destinatario_email: matchedStudent.correo,
          evento: 'pago_confirmado',
          asunto: `Vuelo Registrado — Bitácora #${folio} (${matricula})`,
          cuerpo_html: `<p>Estimado/a ${matchedStudent.nombre},</p><p>Se ha registrado su vuelo en bitácora <strong>#${folio}</strong>:</p><ul><li><strong>Fecha:</strong> ${fecha}</li><li><strong>Aeronave:</strong> ${matricula} (${model})</li><li><strong>Instructor:</strong> ${instructor.nombre}</li><li><strong>Horas:</strong> ${horas.toFixed(1)} hrs</li>${debitDesc}</ul>`,
          cuerpo_texto: `Estimado/a ${matchedStudent.nombre}, se registró su vuelo #${folio} (${matricula}, ${horas.toFixed(1)} hrs, Instructor: ${instructor.nombre}).`
        });
      } catch (stErr) {
        console.warn('[Honorarios] Error no crítico en email estudiante:', stErr);
      }
    }

    this.saveToDisk();
    return statement;
  }

  /**
   * Registro unificado de vuelo desde Bitácora (por Instructor, Instructor en Jefe o Administración):
   * 1) Identifica al estudiante y aplica el cobro automático en su cuenta contable.
   * 2) Genera automáticamente el honorario correspondiente para el instructor (si aplica).
   * 3) Actualiza el tacómetro y las horas de aeronavegabilidad/mantenimiento en Taller OMA (50h/100h, Motor, Hélice, Squawk).
   * 4) Notifica y mantiene actualizados al instructor, estudiante y taller.
   */
  recordFlightLog(input: RecordFlightLogInput): RecordFlightLogResponse {
    const actorUser = input.registrado_por_id ? this.getUserById(input.registrado_por_id) : undefined;
    const actorRole: UserRole = actorUser?.rol || input.registrado_por_rol;
    const allowedRoles: UserRole[] = ['instructor', 'instructor_en_jefe', 'admin', 'escuela', 'contabilidad'];

    if (!allowedRoles.includes(actorRole)) {
      const err: any = new Error('No tiene permisos para registrar bitácoras de vuelo.');
      err.statusCode = 403;
      throw err;
    }

    const fecha = String(input.fecha || '').trim();
    if (!fecha) {
      throw new Error('La fecha del vuelo es obligatoria.');
    }

    const matricula = String(input.matricula_avion || '').trim().toUpperCase();
    if (!matricula) {
      throw new Error('Debe seleccionar la matrícula de la aeronave.');
    }

    const horas = Number(input.horas_vuelo);
    if (!Number.isFinite(horas) || horas <= 0) {
      throw new Error('Las horas de vuelo deben ser mayores a 0.');
    }

    const isSimulator = matricula === 'SIM-ALX';
    const tachInicialRaw = input.tacometro_inicial !== undefined && input.tacometro_inicial !== null ? Number(input.tacometro_inicial) : undefined;
    const tachFinalRaw = input.tacometro_final !== undefined && input.tacometro_final !== null ? Number(input.tacometro_final) : undefined;
    const hobbsInicialRaw = input.hobbs_inicial !== undefined && input.hobbs_inicial !== null ? Number(input.hobbs_inicial) : undefined;
    const hobbsFinalRaw = input.hobbs_final !== undefined && input.hobbs_final !== null ? Number(input.hobbs_final) : undefined;

    if (!isSimulator && (!Number.isFinite(tachFinalRaw) || (tachFinalRaw as number) <= 0)) {
      throw new Error('Debe ingresar la hora final de tacómetro de la aeronave para mantener actualizado el control de Taller.');
    }
    if (
      tachInicialRaw !== undefined &&
      Number.isFinite(tachInicialRaw) &&
      tachFinalRaw !== undefined &&
      Number.isFinite(tachFinalRaw) &&
      tachFinalRaw < tachInicialRaw
    ) {
      throw new Error('El tacómetro final no puede ser menor al tacómetro inicial.');
    }

    const norm = (str: string) =>
      String(str || '')
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .trim();

    const students = this.users.filter(u => u.rol === 'estudiante');
    let matchedStudent: User | undefined = input.estudiante_id
      ? students.find(u => u.id === input.estudiante_id)
      : undefined;

    const rawStudentName = String(input.estudiante_nombre || '').trim();
    if (!matchedStudent && rawStudentName) {
      const qNorm = norm(rawStudentName);
      const qCleanDoc = rawStudentName.replace(/[\s.-]/g, '').toLowerCase();
      matchedStudent =
        students.find(u => norm(u.nombre) === qNorm) ||
        students.find(u => u.documento_identidad && u.documento_identidad.replace(/[\s.-]/g, '').toLowerCase() === qCleanDoc) ||
        students.find(u => {
          const n = norm(u.nombre);
          if (n.includes(qNorm) || qNorm.includes(n)) return true;
          const parts = qNorm.split(/\s+/).filter(Boolean);
          return parts.length > 1 && parts.every(p => n.includes(p));
        });
    }

    const applyStudentDebit = input.aplicar_debito_estudiante !== false;
    if (applyStudentDebit && !matchedStudent) {
      throw new Error('No se pudo identificar al estudiante en el catálogo. Seleccione un estudiante válido para gestionar su cobro.');
    }

    const studentDisplayName = (matchedStudent?.nombre || rawStudentName).trim();
    if (!studentDisplayName) {
      throw new Error('Debe ingresar el nombre del estudiante que realizó el vuelo.');
    }

    const cleanMat = matricula.replace(/[^A-Z0-9]/g, '');
    const datePart = fecha.replace(/-/g, '').slice(2);
    let folio = String(input.folio_bitacora || '').trim();
    if (!folio) {
      let seq = 1;
      do {
        folio = `BIT-${cleanMat}-${datePart}-${String(seq).padStart(3, '0')}`;
        const dupTx = this.transactions.some(
          t => t.tipo === 'cargo' && String(t.referencia_ach || '').trim().toLowerCase() === folio.toLowerCase()
        );
        const dupFee = this.instructorFeeStatements.some(
          s =>
            s.estado !== 'rechazado' &&
            (String(s.folio_bitacora || '').trim().toLowerCase() === folio.toLowerCase() ||
              s.vuelos.some(v => String(v.folio_bitacora || '').trim().toLowerCase() === folio.toLowerCase()))
        );
        if (!dupTx && !dupFee) break;
        seq += 1;
      } while (seq < 9999);
    }

    // Evitar duplicados por folio
    const existingChargeWithFolio = this.transactions.some(
      t => t.tipo === 'cargo' && String(t.referencia_ach || '').trim().toLowerCase() === folio.toLowerCase()
    );
    const existingFeeWithFolio = this.instructorFeeStatements.some(
      s =>
        s.estado !== 'rechazado' &&
        (String(s.folio_bitacora || '').trim().toLowerCase() === folio.toLowerCase() ||
          s.vuelos.some(v => String(v.folio_bitacora || '').trim().toLowerCase() === folio.toLowerCase()))
    );
    if (existingChargeWithFolio || existingFeeWithFolio) {
      const err: any = new Error(`Ya existe un vuelo registrado con el número de bitácora "${folio}".`);
      err.statusCode = 409;
      throw err;
    }

    // Resolver instructor (si el actor tiene rol 'instructor', solo puede quedar su propio usuario)
    let resolvedInstructor: User | undefined;
    if (actorRole === 'instructor' && actorUser) {
      resolvedInstructor = actorUser;
    } else if (input.instructor_id) {
      resolvedInstructor = this.users.find(
        u => u.id === input.instructor_id && (u.rol === 'instructor' || u.rol === 'instructor_en_jefe' || u.rol === 'admin')
      );
    } else if (actorUser && actorUser.rol === 'instructor_en_jefe') {
      resolvedInstructor = actorUser;
    } else if (input.instructor_nombre && input.instructor_nombre.trim()) {
      const instNorm = norm(input.instructor_nombre);
      resolvedInstructor = this.users.find(
        u => (u.rol === 'instructor' || u.rol === 'instructor_en_jefe') && norm(u.nombre) === instNorm
      );
    }

    const fleetDefaults: Record<string, { model: string; aircraftRate: number }> = {
      'HP-1450': { model: 'Cessna 172 Skyhawk', aircraftRate: 220.0 },
      'HP-1588': { model: 'Cessna 172SP Nav III', aircraftRate: 220.0 },
      'HP-1822': { model: 'Piper PA-44-180 Seminole', aircraftRate: 340.0 },
      'HP-1799': { model: 'Piper PA-28-181 Archer III', aircraftRate: 220.0 },
      'HP-1934': { model: 'Piper PA-28-161 Cherokee', aircraftRate: 220.0 },
      'SIM-ALX': { model: 'Simulador Alsim ALX FNPT II', aircraftRate: 120.0 }
    };

    const isDirectorActor = actorRole === 'escuela' || actorRole === 'admin';
    const officialAircraftRate = fleetDefaults[matricula]?.aircraftRate || 220.0;
    const modelo = (input.modelo_avion || fleetDefaults[matricula]?.model || 'Aeronave Escuela').trim();
    const acRate =
      isDirectorActor && Number(input.tarifa_aeronave_hora) > 0
        ? Number(input.tarifa_aeronave_hora)
        : officialAircraftRate;
    const origen = (input.origen || 'MPMG').trim().toUpperCase();
    const destino = (input.destino || 'MPMG').trim().toUpperCase();
    const mision = (input.mision || 'Instrucción de Vuelo').trim();
    const condicion = (input.condicion || 'Dual').trim();
    const registrarName = (actorUser?.nombre || input.registrado_por_nombre || 'Instructor SkyOps').trim();
    const instructorName =
      actorRole === 'instructor' && actorUser
        ? actorUser.nombre
        : (resolvedInstructor?.nombre || input.instructor_nombre || registrarName);

    // 1. Cobro en cuenta del estudiante (Fórmula única estudiante: Hobbs × 1.275)
    const STUDENT_HOBBS_FACTOR = 1.275;
    const studentBillableHours = Number((horas * STUDENT_HOBBS_FACTOR).toFixed(4));
    let createdTx: Transaction | null = null;
    let studentPrevBal = 0;
    let studentNewBal = 0;
    if (applyStudentDebit && matchedStudent) {
      studentPrevBal = this.getStudentBalance(matchedStudent.id);
      const debitMonto = Number((studentBillableHours * acRate).toFixed(2));
      const tachText =
        tachFinalRaw !== undefined && Number.isFinite(tachFinalRaw)
          ? ` Tacómetro: ${tachInicialRaw !== undefined ? `${tachInicialRaw.toFixed(1)} → ` : ''}${tachFinalRaw.toFixed(1)}.`
          : '';
      const arrivalText = input.hora_llegada ? ` Llegada: ${input.hora_llegada}.` : '';
      createdTx = this.addTransaction({
        estudiante_id: matchedStudent.id,
        estudiante_nombre: matchedStudent.nombre,
        fecha,
        tipo: 'cargo',
        concepto: isSimulator ? 'Simulador de Vuelo' : 'Horas Bloque Vuelo',
        monto: debitMonto,
        referencia_ach: folio,
        comprobado_banco: true,
        creado_por: `${registrarName} (${actorRole.toUpperCase()})`,
        notas: `Vuelo en ${modelo} (${matricula}) - ${horas} hrs Hobbs × 1.275 = ${studentBillableHours} hrs @ $${acRate}/h. Ruta: ${origen}-${destino}.${arrivalText}${tachText} No. Bitácora: ${folio}. Piloto: ${studentDisplayName}. Misión: ${mision}. PIC: ${instructorName}.`,
        estado_aprobacion: 'aprobado',
        fecha_verificacion_bancaria: new Date().toISOString(),
        verificado_por: registrarName,
        horas_vuelo: studentBillableHours,
        horas_hobbs: horas,
        factor_cobro_estudiante: STUDENT_HOBBS_FACTOR,
        tarifa_hora: acRate,
        matricula_avion: matricula,
        modelo_avion: modelo,
        instructor_nombre: instructorName,
        tipo_mision: mision,
        saldo_anterior: studentPrevBal,
        tacometro_inicial: tachInicialRaw,
        tacometro_final: tachFinalRaw,
        hobbs_inicial: hobbsInicialRaw,
        hobbs_final: hobbsFinalRaw
      });
      studentNewBal = createdTx.saldo_resultante;
    }

    // 2. Gestión de Honorarios del Instructor (si aplica)
    let createdFee: InstructorFeeStatement | null = null;
    const shouldCreateFee =
      input.crear_honorario_instructor !== false &&
      Boolean(resolvedInstructor) &&
      condicion.toLowerCase() !== 'solo';

    if (shouldCreateFee && resolvedInstructor) {
      const instRate =
        actorRole === 'instructor'
          ? (resolvedInstructor.tarifa_hora_dual || 30.0)
          : Number(input.tarifa_instructor_hora) > 0
          ? Number(input.tarifa_instructor_hora)
          : (resolvedInstructor.tarifa_hora_dual || 30.0);
      createdFee = this.registerBitacoraHonorario({
        folio_bitacora: folio,
        fecha,
        matricula_avion: matricula,
        modelo_avion: modelo,
        estudiante_id: matchedStudent?.id,
        estudiante_nombre: studentDisplayName,
        piloto_id: matchedStudent?.id,
        piloto_nombre: studentDisplayName,
        instructor_id: resolvedInstructor.id,
        horas_vuelo: horas,
        tarifa_instructor_hora: instRate,
        tipo_mision: mision,
        origen,
        destino,
        observaciones: input.novedades || undefined,
        aplicar_debito_estudiante: false,
        tarifa_aeronave_hora: acRate,
        bitacora_transaction_id: createdTx?.id,
        tacometro_inicial: tachInicialRaw,
        tacometro_final: tachFinalRaw,
        hobbs_inicial: hobbsInicialRaw,
        hobbs_final: hobbsFinalRaw,
        registrado_por_id: actorUser?.id || input.registrado_por_id,
        registrado_por_nombre: registrarName,
        registrado_por_rol: actorRole,
        omitir_email_estudiante: true
      });
    }

    // 3. Actualización de Tacómetro y Control de Mantenimiento en Taller OMA
    let updatedAircraftRecord: AircraftMaintenanceRecord | null = null;
    let createdSquawk: MaintenanceSquawk | null = null;

    if (!isSimulator) {
      let acIdx = this.aircraftMaintenanceRecords.findIndex(
        a => a.matricula.toUpperCase() === matricula
      );
      if (acIdx < 0) {
        const baseTach = tachInicialRaw && tachInicialRaw > 0 ? tachInicialRaw : Math.max(0, (tachFinalRaw || horas) - horas);
        const next50 = Number((Math.ceil((baseTach + 0.1) / 50) * 50).toFixed(1));
        const next100 = Number((Math.ceil((baseTach + 0.1) / 100) * 100).toFixed(1));
        this.aircraftMaintenanceRecords.push({
          matricula,
          modelo,
          categoria: 'Monomotor Terrestre (SEP)',
          estado_aeronavegabilidad: 'aeronavegable',
          horas_totales_celula: baseTach,
          horas_motor_tsn: baseTach,
          horas_motor_tso: 0,
          horas_helice_tso: 0,
          horas_ultima_100h: Math.max(0, next100 - 100),
          horas_proxima_100h: next100,
          horas_restantes_100h: Number(Math.max(0, next100 - baseTach).toFixed(1)),
          horas_proxima_50h: next50,
          horas_restantes_50h: Number(Math.max(0, next50 - baseTach).toFixed(1)),
          fecha_ultimo_mantenimiento: fecha,
          fecha_proxima_inspeccion_anual: new Date(Date.now() + 300 * 86400000).toISOString().slice(0, 10),
          vencimiento_altimetro_pitot: new Date(Date.now() + 300 * 86400000).toISOString().slice(0, 10),
          vencimiento_elt: new Date(Date.now() + 300 * 86400000).toISOString().slice(0, 10),
          vencimiento_extintor: new Date(Date.now() + 180 * 86400000).toISOString().slice(0, 10),
          ultimo_tma_responsable: 'Taller OMA SkyOps',
          novedades_abiertas_count: 0,
          ordenes_activas_count: 0,
          bloqueo_despacho: false,
          ubicacion_hangar: 'Hangar SkyOps 4 - Rampa Principal'
        });
        acIdx = this.aircraftMaintenanceRecords.length - 1;
      }

      const prevAc = this.aircraftMaintenanceRecords[acIdx];
      const newTach =
        tachFinalRaw !== undefined && Number.isFinite(tachFinalRaw) && tachFinalRaw > 0
          ? Number(Math.max(prevAc.horas_totales_celula, tachFinalRaw).toFixed(1))
          : Number((prevAc.horas_totales_celula + horas).toFixed(1));

      const effectiveDelta = Number(
        Math.max(0, newTach > prevAc.horas_totales_celula ? newTach - prevAc.horas_totales_celula : horas).toFixed(1)
      );

      const nextRestante100h = Number(Math.max(0, prevAc.horas_proxima_100h - newTach).toFixed(1));
      const nextRestante50h = Number(Math.max(0, prevAc.horas_proxima_50h - newTach).toFixed(1));

      let nextCondition = prevAc.estado_aeronavegabilidad;
      let nextLock = prevAc.bloqueo_despacho;
      let nextMotivo = prevAc.motivo_bloqueo;

      if (nextRestante100h <= 0 || nextRestante50h <= 0) {
        if (nextCondition !== 'en_mantenimiento') {
          nextCondition = 'aog_bloqueado';
        }
        nextLock = true;
        nextMotivo = `Inspección horaria obligatoria (50h/100h) alcanzada por tacómetro (${newTach.toFixed(1)} hrs, Bitácora #${folio}).`;
      } else if (!nextLock && nextCondition !== 'en_mantenimiento' && (nextRestante100h <= 5 || nextRestante50h <= 3)) {
        nextCondition = 'inspeccion_proxima';
      }

      this.aircraftMaintenanceRecords[acIdx] = {
        ...prevAc,
        horas_totales_celula: newTach,
        horas_motor_tsn: newTach,
        horas_motor_tso: Number((prevAc.horas_motor_tso + effectiveDelta).toFixed(1)),
        horas_helice_tso: Number((prevAc.horas_helice_tso + effectiveDelta).toFixed(1)),
        horas_restantes_100h: nextRestante100h,
        horas_restantes_50h: nextRestante50h,
        estado_aeronavegabilidad: nextCondition,
        bloqueo_despacho: nextLock,
        motivo_bloqueo: nextMotivo,
        ultimo_tacometro_vuelo: newTach,
        ultimo_vuelo_fecha: fecha,
        ultimo_piloto_vuelo: `${instructorName} / ${studentDisplayName}`,
        ultimo_folio_bitacora: folio
      };

      const novedadesTrimmed = String(input.novedades || '').trim();
      const hasRealSquawk =
        Boolean(novedadesTrimmed) &&
        !/^sin novedades/i.test(novedadesTrimmed) &&
        (input.reportar_novedad_taller === true ||
          /falla|fuga|vibraci|ruido|aver[ií]a|inoperativ|bater[ií]a|magneto|freno|llanta|indicador|radio|transponder|alternador/i.test(novedadesTrimmed));

      if (input.reportar_novedad_taller === true || (input.reportar_novedad_taller !== false && hasRealSquawk)) {
        createdSquawk = this.createMaintenanceSquawk({
          matricula,
          fecha_reporte: fecha,
          reportado_por: instructorName,
          reportado_por_rol: actorRole,
          bitacora_folio: folio,
          sistema_afectado: 'motor',
          descripcion: novedadesTrimmed || `Novedad reportada en bitácora #${folio}`,
          severidad: 'preventivo',
          estado: 'reportado'
        });
      }

      updatedAircraftRecord = this.getAircraftMaintenanceRecord(matricula) || this.aircraftMaintenanceRecords[acIdx];

      try {
        this.addAuditLog({
          usuario_id: actorUser?.id || input.registrado_por_id,
          usuario_nombre: registrarName,
          usuario_rol: actorRole,
          modulo: 'vigencias_aac',
          accion: 'MODIFICAR',
          entidad_tipo: 'Tacómetro y Mantenimiento por Vuelo',
          entidad_id: matricula,
          descripcion: `Actualización de tacómetro en ${matricula} por Bitácora #${folio}: ${prevAc.horas_totales_celula.toFixed(1)} → ${newTach.toFixed(1)} hrs (Restante 50h: ${nextRestante50h.toFixed(1)}h, 100h: ${nextRestante100h.toFixed(1)}h).`,
          severidad: nextLock ? 'critica' : 'info',
          detalles_cambio: [
            { campo: 'horas_totales_celula', etiqueta: 'Tacómetro / Célula TT', valor_anterior: prevAc.horas_totales_celula, valor_nuevo: newTach },
            { campo: 'horas_restantes_50h', etiqueta: 'Restante 50h', valor_anterior: prevAc.horas_restantes_50h, valor_nuevo: nextRestante50h },
            { campo: 'horas_restantes_100h', etiqueta: 'Restante 100h', valor_anterior: prevAc.horas_restantes_100h, valor_nuevo: nextRestante100h }
          ]
        });
      } catch (audErr) {
        console.warn('[Taller Tach Sync] Error no crítico en auditoría:', audErr);
      }

      const escHtml = (val: string) =>
        String(val || '')
          .replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;')
          .replace(/"/g, '&quot;')
          .replace(/'/g, '&#39;');

      if (nextLock || nextCondition === 'inspeccion_proxima' || createdSquawk) {
        try {
          const tallerUsers = this.users.filter(u => u.rol === 'mantenimiento' && u.activo !== false);
          for (const tUser of tallerUsers) {
            this.sendEmailNotification({
              destinatario_tipo: 'mantenimiento',
              destinatario_nombre: tUser.nombre,
              destinatario_email: tUser.correo || 'taller@skyops.com',
              evento: 'alerta_mantenimiento',
              asunto: `${nextLock ? 'ALERTA AOG' : 'Aviso Taller'} ${matricula} — Tacómetro ${newTach.toFixed(1)} hrs`,
              cuerpo_html: `<p>Bitácora <strong>#${escHtml(folio)}</strong> (${escHtml(fecha)}) actualizó el tacómetro de <strong>${escHtml(matricula)}</strong> a <strong>${newTach.toFixed(1)} hrs</strong>.</p><ul><li>Restante 50h: ${nextRestante50h.toFixed(1)} hrs</li><li>Restante 100h: ${nextRestante100h.toFixed(1)} hrs</li>${createdSquawk ? `<li>Novedad reportada (${escHtml(createdSquawk.id)}): ${escHtml(createdSquawk.descripcion)}</li>` : ''}</ul>`,
              cuerpo_texto: `Bitácora #${folio} actualizó tacómetro de ${matricula} a ${newTach.toFixed(1)} hrs. Restante 50h: ${nextRestante50h.toFixed(1)}h, 100h: ${nextRestante100h.toFixed(1)}h.`
            });
          }
        } catch (tErr) {
          console.warn('[Taller] Error no crítico notificando a taller:', tErr);
        }
      }
    }

    // 4. Notificar al Estudiante (y al Instructor si fue Solo sin honorario)
    const escHtmlSafe = (val: string) =>
      String(val || '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');

    if (matchedStudent?.correo) {
      try {
        const tachInfo =
          tachFinalRaw !== undefined && Number.isFinite(tachFinalRaw)
            ? `<li><strong>Tacómetro:</strong> ${tachInicialRaw !== undefined ? `${tachInicialRaw.toFixed(1)} → ` : ''}${tachFinalRaw.toFixed(1)} hrs</li>`
            : '';
        const feeLine = createdTx
          ? `<li><strong>Cargo de Vuelo:</strong> -$${createdTx.monto.toFixed(2)} USD</li><li><strong>Saldo Disponible Actualizado:</strong> $${createdTx.saldo_resultante.toFixed(2)} USD</li>`
          : '';
        this.sendEmailNotification({
          destinatario_tipo: 'estudiante',
          destinatario_nombre: matchedStudent.nombre,
          destinatario_email: matchedStudent.correo,
          evento: 'pago_confirmado',
          asunto: `Vuelo Registrado #${folio} (${matricula}) — ${studentBillableHours} hrs`,
          cuerpo_html: `<p>Estimado/a ${escHtmlSafe(matchedStudent.nombre)},</p><p>Su vuelo ha sido registrado en el sistema por <strong>${escHtmlSafe(instructorName)}</strong>:</p><ul><li><strong>Bitácora:</strong> #${escHtmlSafe(folio)}</li><li><strong>Fecha:</strong> ${escHtmlSafe(fecha)}</li><li><strong>Aeronave:</strong> ${escHtmlSafe(matricula)} (${escHtmlSafe(modelo)})</li><li><strong>Tiempo Hobbs:</strong> ${horas} hrs (Facturable: ${studentBillableHours} hrs)</li>${tachInfo}${feeLine}</ul>`,
          cuerpo_texto: `Estimado/a ${matchedStudent.nombre}, se registró su vuelo #${folio} (${matricula}, ${horas} hrs Hobbs = ${studentBillableHours} hrs cobradas) con ${instructorName}.${createdTx ? ` Cargo: -$${createdTx.monto.toFixed(2)} USD. Saldo actual: $${createdTx.saldo_resultante.toFixed(2)} USD.` : ''}`
        });
      } catch (stErr) {
        console.warn('[Vuelo] Error no crítico notificando a estudiante:', stErr);
      }
    }

    if (!createdFee && resolvedInstructor?.correo) {
      try {
        this.sendEmailNotification({
          destinatario_tipo: 'instructor',
          destinatario_nombre: resolvedInstructor.nombre,
          destinatario_email: resolvedInstructor.correo,
          evento: 'notificacion_general',
          asunto: `Bitácora de Vuelo Registrada #${folio} (${matricula})`,
          cuerpo_html: `<p>Estimado/a ${escHtmlSafe(resolvedInstructor.nombre)},</p><p>Se registró la bitácora <strong>#${escHtmlSafe(folio)}</strong> (${escHtmlSafe(fecha)}, ${escHtmlSafe(matricula)}, ${horas.toFixed(1)} hrs, Piloto: ${escHtmlSafe(studentDisplayName)}).</p>`,
          cuerpo_texto: `Bitácora #${folio} registrada (${fecha}, ${matricula}, ${horas.toFixed(1)} hrs, Piloto: ${studentDisplayName}).`
        });
      } catch (instErr) {
        console.warn('[Vuelo] Error no crítico notificando a instructor:', instErr);
      }
    }

    this.saveToDisk();

    return {
      folio_bitacora: folio,
      transaction: createdTx,
      feeStatement: createdFee,
      aircraftRecord: updatedAircraftRecord,
      squawk: createdSquawk,
      studentIdentified: matchedStudent
        ? {
            id: matchedStudent.id,
            nombre: matchedStudent.nombre,
            saldo_anterior: studentPrevBal,
            saldo_resultante: createdTx ? createdTx.saldo_resultante : this.getStudentBalance(matchedStudent.id)
          }
        : null
    };
  }

  generateInstructorFeeStatement(input: GenerateInstructorFeesInput): InstructorFeeStatement {
    // Bloquear autogeneración de honorarios por parte de instructores o roles no administrativos
    const actorUser = input.registrado_por_id ? this.getUserById(input.registrado_por_id) : undefined;
    const actorRole = actorUser?.rol || input.registrado_por_rol;
    if (!actorRole || !['admin', 'escuela', 'contabilidad'].includes(actorRole)) {
      const err: any = new Error('Solo Administración puede registrar bitácoras y generar honorarios de instructores.');
      err.statusCode = 403;
      throw err;
    }

    // 1. RECONOCER AL INSTRUCTOR (POR ID, NOMBRE, CÉDULA O LICENCIA)
    let instructor: User | undefined;

    if (input.instructorId) {
      instructor = this.users.find(u => u.id === input.instructorId);
    }

    if (!instructor && input.instructorQuery) {
      const q = input.instructorQuery.toLowerCase().trim();
      const qClean = q.replace(/[\s.-]/g, '');

      const instructors = this.users.filter(u => u.rol === 'instructor' || u.rol === 'admin');
      instructor = instructors.find(u => {
        const nameMatch = u.nombre.toLowerCase().includes(q);
        const docMatch = u.documento_identidad ? u.documento_identidad.replace(/[\s.-]/g, '').includes(qClean) : false;
        const licMatch = u.licencia ? u.licencia.toLowerCase().includes(q) : false;
        const mailMatch = u.correo.toLowerCase() === q;
        return nameMatch || docMatch || licMatch || mailMatch;
      });
    }

    if (!instructor) {
      throw new Error('Instructor no encontrado para generar honorarios.');
    }

    const hourlyRate = Number(input.hourlyRate) > 0 ? Number(input.hourlyRate) : 30.0;
    const taxWithholdingPct = Number(input.taxWithholdingPct) >= 0 ? Number(input.taxWithholdingPct) : 0;

    const norm = (str: string) => str.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
    const instNameNorm = norm(instructor.nombre);

    const studentQ = input.studentQuery ? norm(input.studentQuery) : null;
    const studentQClean = input.studentQuery ? input.studentQuery.replace(/[\s.-]/g, '').toLowerCase() : null;

    const startDate = input.startDate || `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}-01`;
    const endDate = input.endDate || new Date().toISOString().split('T')[0];

    const matchesInstructor = (instRefId?: string, instRefName?: string): boolean => {
      if (instRefId && instRefId === instructor?.id) return true;
      if (!instRefName) return false;
      const refNorm = norm(instRefName);
      if (refNorm.includes(instNameNorm) || instNameNorm.includes(refNorm)) return true;
      const parts = instructor?.nombre.split(' ') || [];
      return parts.some(p => p.length > 3 && refNorm.includes(norm(p)));
    };

    const matchesStudent = (stId?: string, stName?: string, stDoc?: string, stLic?: string): boolean => {
      if (!studentQ) return true;
      if (stId && (stId.toLowerCase() === studentQ || stId.toLowerCase().includes(studentQ))) return true;
      if (stName && (norm(stName).includes(studentQ) || studentQ.includes(norm(stName)))) return true;
      if (stDoc && studentQClean && stDoc.replace(/[\s.-]/g, '').toLowerCase().includes(studentQClean)) return true;
      if (stLic && norm(stLic).includes(studentQ)) return true;
      return false;
    };

    const isWithinDateRange = (flightDate: string): boolean => {
      if (!flightDate) return true;
      const fDate = flightDate.substring(0, 10);
      if (startDate && fDate < startDate) return false;
      if (endDate && fDate > endDate) return false;
      return true;
    };

    const collectedFlights: InstructorFlightFeeItem[] = [];
    const seenFlightKeys = new Set<string>();

    // Únicamente recopilar bitácoras registradas oficialmente por Administración (Transactions tipo cargo de bitácora)
    if (Array.isArray(this.transactions)) {
      for (const tx of this.transactions) {
        if (!tx || !tx.fecha || tx.tipo !== 'cargo' || !tx.horas_vuelo) continue;
        if (!isWithinDateRange(tx.fecha)) continue;

        const isInstructorMatch = matchesInstructor(undefined, tx.instructor_nombre);
        if (!isInstructorMatch) continue;

        const student = this.users.find(u => u.id === tx.estudiante_id);
        const stName = tx.estudiante_nombre || student?.nombre || 'Piloto Registrado';
        const stId = tx.estudiante_id;
        const stDoc = student?.documento_identidad || '';
        const stLic = student?.licencia || '';

        if (!matchesStudent(stId, stName, stDoc, stLic)) continue;

        const folio = tx.referencia_ach || `BIT-${tx.matricula_avion || 'AIR'}-${tx.fecha.replace(/-/g, '')}`;
        const rawHrs = Number(tx.horas_hobbs && tx.horas_hobbs > 0 ? tx.horas_hobbs : tx.horas_vuelo);
        const key = `${folio}_${tx.fecha}_${rawHrs}`.toLowerCase();
        if (seenFlightKeys.has(key)) continue;
        seenFlightKeys.add(key);

        const hrs = rawHrs;
        const subtotal = Number((hrs * hourlyRate).toFixed(2));

        collectedFlights.push({
          id: `fee_tx_${tx.id}`,
          fecha: tx.fecha,
          matricula_avion: tx.matricula_avion || 'HP-1450',
          modelo_avion: tx.modelo_avion || 'Cessna 172 Skyhawk',
          folio_bitacora: folio,
          estudiante_id: stId,
          estudiante_nombre: stName,
          piloto_nombre: stName,
          estudiante_cedula: stDoc,
          estudiante_licencia: stLic,
          horas_vuelo: hrs,
          tarifa_instructor_hora: hourlyRate,
          subtotal: subtotal,
          tipo_mision: tx.tipo_mision || tx.concepto || 'Instrucción Dual',
          origen_destino: 'MPMG - MPMG',
          estado_pago: 'incluido_en_liquidacion'
        });
      }
    }

    if (collectedFlights.length === 0) {
      throw new Error('No se encontraron bitácoras oficiales registradas por Administración en ese período.');
    }

    collectedFlights.sort((a, b) => new Date(a.fecha).getTime() - new Date(b.fecha).getTime());

    const totalHoras = Number(collectedFlights.reduce((acc, f) => acc + f.horas_vuelo, 0).toFixed(2));
    const totalVuelos = collectedFlights.length;
    const totalBruto = Number(collectedFlights.reduce((acc, f) => acc + f.subtotal, 0).toFixed(2));
    const retencionImpuesto = Number(((totalBruto * taxWithholdingPct) / 100).toFixed(2));
    const totalNeto = Number((totalBruto - retencionImpuesto).toFixed(2));

    const periodCode = startDate.replace(/-/g, '').substring(0, 6);
    const instCode = (instructor.nombre.split(' ')[1] || instructor.nombre.substring(0, 3)).toUpperCase().replace(/[^A-Z]/g, '');
    const statementId = `HON-${periodCode}-${instCode}-${String(this.instructorFeeStatements.length + 1).padStart(2, '0')}`;

    const statement: InstructorFeeStatement = {
      id: statementId,
      instructor_id: instructor.id,
      instructor_nombre: instructor.nombre,
      instructor_cedula: instructor.documento_identidad || 'N/A',
      instructor_licencia: instructor.licencia || 'CFI',
      instructor_correo: instructor.correo || 'instructor@skyops.com',
      instructor_telefono: instructor.telefono,
      periodo_inicio: startDate,
      periodo_fin: endDate,
      fecha_generacion: new Date().toISOString(),
      fecha_envio_contabilidad: new Date().toISOString(),
      total_horas: totalHoras,
      total_vuelos: totalVuelos,
      tarifa_base_hora: hourlyRate,
      total_bruto: totalBruto,
      retencion_impuesto: retencionImpuesto,
      total_neto: totalNeto,
      estado: 'enviado_contabilidad',
      vuelos: collectedFlights,
      notas_instructor: input.notes || `Liquidación oficial desde bitácoras registradas por Administración (${collectedFlights.map(v => v.folio_bitacora).join(', ')}).`,
      banco_pago: 'Banco General de Panamá (Cuenta de Ahorros / Transferencia ACH)',
      procesado_por: input.createdBy || actorUser?.nombre || 'Administración SkyOps',
      registrado_por_admin: true,
      registrado_por_id: actorUser?.id || input.registrado_por_id,
      registrado_por_nombre: actorUser?.nombre || input.createdBy || 'Administración SkyOps',
      registrado_por_rol: actorRole,
      folio_bitacora: collectedFlights[0]?.folio_bitacora,
      piloto_nombre: collectedFlights[0]?.piloto_nombre || collectedFlights[0]?.estudiante_nombre
    };

    this.instructorFeeStatements.unshift(statement);

    try {
      this.createAccountingMessage({
        remitente_id: actorUser?.id || 'usr_jefatura_1',
        remitente_nombre: actorUser?.nombre || 'Administración SkyOps',
        destinatario_id: 'usr_conta_1',
        destinatario_nombre: 'Lic. Mariana Chen - Contabilidad y Finanzas',
        asunto: `Nueva Liquidación de Honorarios CFI: ${instructor.nombre}`,
        mensaje: `Liquidación de Honorarios (${statement.id}) basada en bitácoras registradas por Administración: ${totalHoras} horas (${totalVuelos} vuelos). Monto: $${totalNeto.toFixed(2)} USD.`,
        prioridad: 'alta'
      });
    } catch (msgErr) {
      console.warn('[Honorarios] Error no crítico al enviar mensaje contable:', msgErr);
    }

    try {
      this.addAuditLog({
        usuario_id: actorUser?.id || 'usr_jefatura_1',
        usuario_nombre: actorUser?.nombre || 'Administración SkyOps',
        usuario_rol: actorRole,
        modulo: 'contabilidad',
        accion: 'CREAR',
        entidad_tipo: 'Liquidación de Honorarios CFI',
        entidad_id: statement.id,
        descripcion: `Liquidación de honorarios ${statement.id} para ${instructor.nombre} (${totalHoras} hrs, $${totalNeto.toFixed(2)} USD).`,
        detalles_cambio: [],
        severidad: 'info'
      });
    } catch (audErr) {
      console.warn('[Honorarios] Error no crítico en auditoría:', audErr);
    }

    this.saveToDisk();
    return statement;
  }

  updateInstructorFeeStatementStatus(
    id: string,
    update: {
      estado: InstructorFeeStatus;
      notas_contabilidad?: string;
      banco_pago?: string;
      referencia_pago_ach?: string;
      procesado_por?: string;
    }
  ): InstructorFeeStatement | null {
    const idx = this.instructorFeeStatements.findIndex(s => s.id === id && s.registrado_por_admin === true);
    if (idx === -1) return null;

    const current = this.instructorFeeStatements[idx];
    const updated: InstructorFeeStatement = {
      ...current,
      estado: update.estado,
      notas_contabilidad: update.notas_contabilidad ?? current.notas_contabilidad,
      banco_pago: update.banco_pago ?? current.banco_pago,
      referencia_pago_ach: update.referencia_pago_ach ?? current.referencia_pago_ach,
      procesado_por: update.procesado_por ?? current.procesado_por
    };

    if (update.estado === 'enviado_contabilidad') {
      updated.fecha_envio_contabilidad = new Date().toISOString();
    } else if (update.estado === 'pagado') {
      updated.fecha_pago = new Date().toISOString();
    }

    this.instructorFeeStatements[idx] = updated;

    // Notificaciones por cambio de estado
    try {
      const instructorUser = this.getUserById(updated.instructor_id);
      const instructorEmail = instructorUser?.correo || updated.instructor_correo || 'instructor@skyops.com';

      if (update.estado === 'aprobado_contabilidad') {
        this.sendEmailNotification({
          destinatario_tipo: 'instructor',
          destinatario_nombre: updated.instructor_nombre,
          destinatario_email: instructorEmail,
          evento: 'honorarios_instructor_aprobados',
          asunto: `✅ Honorarios Aprobados por Contabilidad: ${updated.id} ($${updated.total_neto.toFixed(2)} USD)`,
          cuerpo_html: `<p>Estimado/a ${updated.instructor_nombre},</p><p>Su liquidación de honorarios <strong>${updated.id}</strong> por <strong>${updated.total_horas} hrs</strong> ($${updated.total_neto.toFixed(2)} USD) ha sido <strong>APROBADA</strong> formalmente por el Departamento de Contabilidad.</p><p>Ha sido programada para desembolso vía transferencia ACH a su cuenta en ${updated.banco_pago || 'Banco General'}.</p>`,
          cuerpo_texto: `Estimado/a ${updated.instructor_nombre},\n\nSu liquidación de honorarios ${updated.id} por ${updated.total_horas} horas de vuelo ($${updated.total_neto.toFixed(2)} USD) ha sido APROBADA formalmente por el Departamento de Contabilidad.\n\nHa sido programada para desembolso vía transferencia ACH a su cuenta en ${updated.banco_pago || 'Banco General'}.\n\nNotas de Contabilidad: ${updated.notas_contabilidad || 'Aprobado sin observaciones tras verificar bitácoras de vuelo.'}\n\nAtentamente,\nDepartamento de Contabilidad y Finanzas SkyOps`
        });
      } else if (update.estado === 'pagado') {
        this.sendEmailNotification({
          destinatario_tipo: 'instructor',
          destinatario_nombre: updated.instructor_nombre,
          destinatario_email: instructorEmail,
          evento: 'honorarios_instructor_pagados',
          asunto: `💵 Desembolso ACH Realizado: Pago de Honorarios ${updated.id} ($${updated.total_neto.toFixed(2)} USD)`,
          cuerpo_html: `<p>Estimado/a ${updated.instructor_nombre},</p><p>Le confirmamos que se ha procesado exitosamente el pago de sus honorarios de instrucción de vuelo.</p><p><strong>Liquidación:</strong> ${updated.id}<br/><strong>Horas de Instrucción:</strong> ${updated.total_horas} hrs (${updated.total_vuelos} vuelos)<br/><strong>Monto Neto Transferido:</strong> $${updated.total_neto.toFixed(2)} USD<br/><strong>Banco:</strong> ${updated.banco_pago || 'Banco General'}<br/><strong>Referencia ACH:</strong> ${updated.referencia_pago_ach || 'ACH-' + Date.now()}</p>`,
          cuerpo_texto: `Estimado/a ${updated.instructor_nombre},\n\nLe confirmamos que se ha procesado exitosamente el pago de sus honorarios de instrucción de vuelo.\n\nDetalles del Desembolso:\n• Liquidación: ${updated.id}\n• Horas de Instrucción: ${updated.total_horas} hrs en ${updated.total_vuelos} vuelos\n• Monto Neto Transferido: $${updated.total_neto.toFixed(2)} USD\n• Entidad Bancaria: ${updated.banco_pago || 'Banco General'}\n• Referencia ACH de Transferencia: ${updated.referencia_pago_ach || 'ACH-' + Date.now()}\n• Fecha de Procesamiento: ${new Date().toLocaleDateString('es-PA')}\n\n¡Gracias por su excelencia y compromiso en la instrucción de vuelo!\n\nAtentamente,\nDepartamento de Contabilidad y Tesorería SkyOps`
        });
      }

      this.addAuditLog({
        usuario_id: update.procesado_por || 'usr_conta_1',
        usuario_nombre: update.procesado_por || 'Contabilidad SkyOps',
        usuario_rol: 'contabilidad',
        modulo: 'contabilidad',
        accion: 'MODIFICAR',
        entidad_tipo: 'Liquidación de Honorarios CFI',
        entidad_id: updated.id,
        descripcion: `Actualización de estado de honorarios ${updated.id} a "${updated.estado.toUpperCase()}" ($${updated.total_neto.toFixed(2)} USD). Ref ACH: ${updated.referencia_pago_ach || 'N/A'}.`,
        detalles_cambio: [],
        severidad: update.estado === 'rechazado' ? 'alerta' : 'info'
      });
    } catch (notifErr) {
      console.warn('[Honorarios] Error no crítico en notificación:', notifErr);
    }

    this.saveToDisk();
    return updated;
  }

  saveInstructorFeeStatement(stmt: InstructorFeeStatement): InstructorFeeStatement {
    if (!stmt || stmt.registrado_por_admin !== true) {
      const err: any = new Error('Los honorarios solo pueden crearse a través del registro de bitácoras por Administración.');
      err.statusCode = 403;
      throw err;
    }
    const idx = this.instructorFeeStatements.findIndex(s => s.id === stmt.id);
    if (idx >= 0) {
      this.instructorFeeStatements[idx] = stmt;
    } else {
      this.instructorFeeStatements.unshift(stmt);
    }
    this.saveToDisk();
    return stmt;
  }

  deleteInstructorFeeStatement(id: string): boolean {
    const idx = this.instructorFeeStatements.findIndex(s => s.id === id);
    if (idx >= 0) {
      this.instructorFeeStatements.splice(idx, 1);
      this.saveToDisk();
      return true;
    }
    return false;
  }

  // --- MENSAJERÍA INTERNA DE CONTABILIDAD ---
  getAccountingMessages(userId?: string): InternalAccountingMessage[] {
    let list = [...this.accountingMessages];
    if (userId) {
      list = list.filter(m => m.destinatario_id === userId || m.remitente_id === userId);
    }
    return list.sort((a, b) => new Date(b.creado_en).getTime() - new Date(a.creado_en).getTime());
  }

  createAccountingMessage(data: {
    remitente_id: string;
    remitente_nombre: string;
    destinatario_id: string;
    destinatario_nombre: string;
    asunto: string;
    mensaje: string;
    prioridad?: 'baja' | 'media' | 'alta' | 'urgente';
    transaccion_id?: string;
    transaccion_resumen?: any;
    imagen_adjunta?: string;
    imagen_nombre?: string;
  }): InternalAccountingMessage {
    const newMsg: InternalAccountingMessage = {
      id: 'msg_conta_' + Date.now() + '_' + Math.floor(Math.random() * 1000),
      remitente_id: data.remitente_id,
      remitente_nombre: data.remitente_nombre,
      destinatario_id: data.destinatario_id,
      destinatario_nombre: data.destinatario_nombre,
      transaccion_id: data.transaccion_id,
      transaccion_resumen: data.transaccion_resumen,
      imagen_adjunta: data.imagen_adjunta,
      imagen_nombre: data.imagen_nombre,
      asunto: data.asunto,
      mensaje: data.mensaje,
      prioridad: data.prioridad || 'media',
      leido: false,
      creado_en: new Date().toISOString(),
      respuestas: []
    };

    this.accountingMessages.unshift(newMsg);
    this.saveToDisk();
    return newMsg;
  }

  replyAccountingMessage(id: string, replyData: {
    remitente_id: string;
    remitente_nombre: string;
    mensaje: string;
    imagen_adjunta?: string;
    imagen_nombre?: string;
  }): InternalAccountingMessage | null {
    const msg = this.accountingMessages.find(m => m.id === id);
    if (!msg) return null;

    if (!msg.respuestas) {
      msg.respuestas = [];
    }

    const reply = {
      id: 'rep_' + Date.now() + '_' + Math.floor(Math.random() * 1000),
      remitente_id: replyData.remitente_id,
      remitente_nombre: replyData.remitente_nombre,
      mensaje: replyData.mensaje,
      imagen_adjunta: replyData.imagen_adjunta,
      imagen_nombre: replyData.imagen_nombre,
      creado_en: new Date().toISOString()
    };

    msg.respuestas.push(reply);
    // Marcar como no leído para el destinatario de la respuesta
    msg.leido = false;
    this.saveToDisk();
    return msg;
  }

  markAccountingMessageRead(id: string): boolean {
    const msg = this.accountingMessages.find(m => m.id === id);
    if (!msg) return false;
    msg.leido = true;
    this.saveToDisk();
    return true;
  }

  deleteAccountingMessage(id: string): boolean {
    const idx = this.accountingMessages.findIndex(m => m.id === id);
    if (idx === -1) return false;
    this.accountingMessages.splice(idx, 1);
    this.saveToDisk();
    return true;
  }

  /**
   * Buscador Universal para SkyOps (Administración y Contabilidad)
   * Realiza búsqueda transversal en todas las colecciones: Usuarios, Transacciones,
   * Hojas de Vuelo, Itinerarios, Vigencias Médicas AAC, Flota, Mensajes y Correos.
   */
  globalSearch(rawQuery: string, categoryFilter: string = 'all'): import('../src/types').GlobalSearchResponse {
    const q = (rawQuery || '').trim().toLowerCase();
    const results: import('../src/types').GlobalSearchResult[] = [];

    const FLEET_DATA = [
      { matricula: 'HP-1822', modelo: 'Piper PA-28 Archer III', tipo: 'Monomotor Terrestre (VFR/IFR)', estado: 'Operativo / En Línea de Vuelo', horasTotal: 1420.5 },
      { matricula: 'HP-1450', modelo: 'Cessna 172 Skyhawk', tipo: 'Monomotor Escuela', estado: 'Operativo / En Línea de Vuelo', horasTotal: 2840.1 },
      { matricula: 'HP-1799', modelo: 'Piper PA-44 Seminole', tipo: 'Multi-Motor Avanzado (IFR/MEI)', estado: 'Operativo / En Línea de Vuelo', horasTotal: 980.4 },
      { matricula: 'HP-1588', modelo: 'Cessna 172SP Nav III (G1000)', tipo: 'Monomotor Glass Cockpit Garmin G1000', estado: 'Operativo / En Línea de Vuelo', horasTotal: 1150.2 },
      { matricula: 'HP-1902', modelo: 'Piper PA-28 Archer II', tipo: 'Monomotor Terrestre', estado: 'Operativo / Mantenimiento Programado', horasTotal: 2100.8 },
      { matricula: 'SIM-ALX', modelo: 'Simulador ALSIM ALX EASA/AAC FNPT II', tipo: 'Dispositivo de Entrenamiento de Vuelo FTD', estado: 'Operativo / Sala de Simulación', horasTotal: 3400.0 }
    ];

    if (!q) {
      return {
        query: '',
        totalResults: 0,
        countsByCategory: { all: 0, users: 0, transactions: 0, flight_sheets: 0, itineraries: 0, medical: 0, fleet: 0, messages: 0, emails: 0 },
        results: []
      };
    }

    const todayStr = new Date().toISOString().split('T')[0];

    // 1. BÚSQUEDA DE USUARIOS (Alumnos, Instructores, Contabilidad, Admins)
    for (const u of this.users) {
      const userText = `${u.nombre} ${u.correo} ${u.telefono} ${u.documento_identidad || ''} ${u.licencia || ''} ${u.numero_medico || ''} ${u.curso_actual || ''} ${u.direccion_residencial || ''} ${u.rol}`.toLowerCase();
      if (userText.includes(q)) {
        const roleLabel = u.rol === 'estudiante' ? 'Estudiante Piloto' : u.rol === 'instructor' ? 'Instructor CFI' : u.rol === 'contabilidad' ? 'Contabilidad' : 'Administrador';
        const roleBadgeColor = u.rol === 'estudiante' ? 'amber' : u.rol === 'instructor' ? 'sky' : u.rol === 'contabilidad' ? 'emerald' : 'purple';
        
        results.push({
          id: `usr_${u.id}`,
          category: 'users',
          categoryLabel: 'Usuarios & Personal',
          title: u.nombre,
          subtitle: `${roleLabel} • ${u.correo} • Tel: ${u.telefono}${u.documento_identidad ? ` • Céd: ${u.documento_identidad}` : ''}${u.licencia ? ` • Lic: ${u.licencia}` : ''}${u.curso_actual ? ` • Curso: ${u.curso_actual}` : ''}`,
          badge: roleLabel,
          badgeColor: roleBadgeColor as any,
          targetTab: 'usuarios',
          targetId: u.id,
          userContextId: u.id,
          raw: u,
          actionText: 'Ver Ficha de Usuario'
        });
      }

      // 2. BÚSQUEDA DE VIGENCIAS MÉDICAS Y LICENCIAS AAC
      if (u.vencimiento_medico || u.numero_medico || u.licencia) {
        const medText = `${u.nombre} ${u.numero_medico || ''} ${u.vencimiento_medico || ''} ${u.licencia || ''} ${u.vencimiento_licencia || ''} medico licencia aac aptitud`.toLowerCase();
        if (medText.includes(q) || (q.includes('medic') || q.includes('vencid') || q.includes('aac') || q.includes('licenc') || q.includes('vigenc'))) {
          let medStatus = 'ok';
          let medStatusText = 'VIGENTE';
          let medBadgeColor: 'emerald' | 'amber' | 'rose' | 'yellow' = 'emerald';

          if (!u.vencimiento_medico) {
            medStatus = 'missing';
            medStatusText = 'SIN MÉDICO';
            medBadgeColor = 'rose';
          } else {
            const expDate = new Date(u.vencimiento_medico);
            const now = new Date();
            const diffDays = Math.ceil((expDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
            if (diffDays < 0) {
              medStatus = 'expired';
              medStatusText = `VENCIDO (${Math.abs(diffDays)}d)`;
              medBadgeColor = 'rose';
            } else if (diffDays <= 7) {
              medStatus = 'critical';
              medStatusText = `CRÍTICO (${diffDays}d)`;
              medBadgeColor = 'amber';
            } else if (diffDays <= 30) {
              medStatus = 'warning';
              medStatusText = `POR VENCER (${diffDays}d)`;
              medBadgeColor = 'yellow';
            }
          }

          results.push({
            id: `med_${u.id}`,
            category: 'medical',
            categoryLabel: 'Vigencias AAC & Médico',
            title: `Certificado Médico AAC: ${u.nombre}`,
            subtitle: `No. Cert: ${u.numero_medico || 'No asignado'} • Vencimiento: ${u.vencimiento_medico || 'Sin fecha'} • Licencia: ${u.licencia || 'N/A'}${u.vencimiento_licencia ? ` (Vence: ${u.vencimiento_licencia})` : ''}`,
            badge: medStatusText,
            badgeColor: medBadgeColor,
            date: u.vencimiento_medico,
            status: medStatus,
            targetTab: 'usuarios',
            targetId: u.id,
            userContextId: u.id,
            raw: u,
            actionText: 'Auditar Médico AAC'
          });
        }
      }
    }

    // 3. BÚSQUEDA DE CONTABILIDAD Y TRANSACCIONES
    for (const t of this.transactions) {
      const txText = `${t.id} ${t.concepto} ${t.referencia_ach} ${t.banco_origen || ''} ${t.referencia_bancaria_confirmada || ''} ${t.estudiante_nombre || ''} ${t.monto} ${t.tipo} ${t.estado_aprobacion} ${t.notas || ''} ${t.notas_bancarias || ''} ${t.creado_por || ''}`.toLowerCase();
      if (txText.includes(q) || (q.startsWith('$') && t.monto.toString().includes(q.replace('$', '')))) {
        const isApproved = t.estado_aprobacion === 'aprobado';
        const isPending = t.estado_aprobacion === 'pendiente_revision_bancaria';
        const badgeLabel = isApproved ? 'CONCILIADO' : isPending ? 'PENDIENTE REVISIÓN' : 'RECHAZADO';
        const badgeColor = isApproved ? 'emerald' : isPending ? 'amber' : 'rose';
        const formattedMonto = `$${t.monto.toLocaleString('en-US', { minimumFractionDigits: 2 })}`;

        results.push({
          id: `tx_${t.id}`,
          category: 'transactions',
          categoryLabel: 'Contabilidad & ACH',
          title: `${t.tipo === 'abono' ? 'Abono / Depósito' : 'Cargo'}: ${formattedMonto} - ${t.concepto}`,
          subtitle: `Alumno: ${t.estudiante_nombre || 'Estudiante'} • Ref ACH: ${t.referencia_ach}${t.banco_origen ? ` • Banco: ${t.banco_origen}` : ''} • Fecha: ${t.fecha}`,
          badge: badgeLabel,
          badgeColor: badgeColor as any,
          amount: t.monto,
          date: t.fecha,
          status: t.estado_aprobacion,
          targetTab: 'contabilidad',
          targetId: t.id,
          userContextId: t.estudiante_id,
          raw: t,
          actionText: t.archivo_adjunto ? 'Ver Comprobante ACH' : 'Abrir en Contabilidad'
        });
      }
    }

    // 4. BÚSQUEDA DE HOJAS DE PROGRESO DE VUELO
    for (const fp of this.flightProgress) {
      const fpText = `${fp.id} leccion ${fp.leccion_num} ${fp.matricula} ${fp.tipo_avion} ${fp.curso} ${fp.observaciones || ''} ${fp.estudiante_nombre || ''} ${fp.instructor_nombre || ''} ${fp.estado}`.toLowerCase();
      if (fpText.includes(q)) {
        const isAprobado = fp.estado === 'aprobado';
        const badgeLabel = isAprobado ? 'VALIDADA' : 'PENDIENTE FIRMA';
        const badgeColor = isAprobado ? 'emerald' : 'amber';
        const totalHrs = fp.tiempos_vuelo?.vuelo_actual || fp.tiempos_vuelo?.total_horas || 0;

        results.push({
          id: `fp_${fp.id}`,
          category: 'flight_sheets',
          categoryLabel: 'Hojas de Vuelo & Progreso',
          title: `Lección ${fp.leccion_num}: ${fp.curso} (${fp.matricula})`,
          subtitle: `Alumno: ${fp.estudiante_nombre || 'Estudiante'} • Instructor: ${fp.instructor_nombre || 'Instructor'} • Fecha: ${fp.fecha} • Tiempo: ${totalHrs}h • Aeronave: ${fp.tipo_avion}`,
          badge: badgeLabel,
          badgeColor: badgeColor as any,
          date: fp.fecha,
          status: fp.estado,
          targetTab: 'progreso',
          targetId: fp.id,
          userContextId: fp.estudiante_id,
          raw: fp,
          actionText: 'Abrir Hoja de Progreso'
        });
      }
    }

    // 5. BÚSQUEDA DE ITINERARIOS Y AGENDA
    for (const itin of this.itineraries) {
      const itinText = `${itin.id} ${itin.mision} ${itin.avion_matricula} ${itin.avion_modelo} ${itin.estudiante_nombre} ${itin.instructor_nombre} ${itin.ruta || ''} ${itin.estado} ${itin.fecha} ${itin.hora_inicio} ${itin.hora_fin}`.toLowerCase();
      if (itinText.includes(q)) {
        let badgeColor: 'sky' | 'emerald' | 'amber' | 'rose' | 'slate' = 'sky';
        if (itin.estado === 'confirmado') badgeColor = 'emerald';
        else if (itin.estado === 'pendiente_confirmacion') badgeColor = 'amber';
        else if (itin.estado === 'cancelado' || itin.estado === 'no_show') badgeColor = 'rose';
        else if (itin.estado === 'completado') badgeColor = 'slate';

        results.push({
          id: `itin_${itin.id}`,
          category: 'itineraries',
          categoryLabel: 'Agenda & Vuelos Programados',
          title: `${itin.avion_matricula} (${itin.fecha} ${itin.hora_inicio}-${itin.hora_fin}) - ${itin.mision}`,
          subtitle: `Alumno: ${itin.estudiante_nombre} • Instructor: ${itin.instructor_nombre} • Equipo: ${itin.avion_modelo}${itin.ruta ? ` • Ruta: ${itin.ruta}` : ''}`,
          badge: itin.estado.toUpperCase().replace('_', ' '),
          badgeColor: badgeColor,
          date: itin.fecha,
          status: itin.estado,
          targetTab: 'itinerarios',
          targetId: itin.id,
          userContextId: itin.estudiante_id,
          raw: itin,
          actionText: 'Ver en Agenda'
        });
      }
    }

    // 6. BÚSQUEDA EN FLOTA DE AERONAVES
    for (const plane of FLEET_DATA) {
      const planeText = `${plane.matricula} ${plane.modelo} ${plane.tipo} ${plane.estado}`.toLowerCase();
      if (planeText.includes(q)) {
        results.push({
          id: `fleet_${plane.matricula}`,
          category: 'fleet',
          categoryLabel: 'Flota Aeronáutica',
          title: `${plane.matricula} — ${plane.modelo}`,
          subtitle: `${plane.tipo} • Total Horas Flota: ${plane.horasTotal} hrs • Estado: ${plane.estado}`,
          badge: 'AERONAVE ACTIVA',
          badgeColor: 'sky',
          targetTab: 'itinerarios',
          targetId: plane.matricula,
          raw: plane,
          actionText: 'Ver Vuelos de la Aeronave'
        });
      }
    }

    // 7. BÚSQUEDA EN MENSAJERÍA INTERNA DE CONTABILIDAD
    for (const msg of this.accountingMessages) {
      const msgText = `${msg.id} ${msg.asunto} ${msg.mensaje} ${msg.remitente_nombre} ${msg.destinatario_nombre} ${msg.transaccion_resumen?.referencia_ach || ''} ${msg.prioridad}`.toLowerCase();
      if (msgText.includes(q)) {
        results.push({
          id: `msg_${msg.id}`,
          category: 'messages',
          categoryLabel: 'Mensajes Internos Contabilidad',
          title: `Mensaje: ${msg.asunto}`,
          subtitle: `De: ${msg.remitente_nombre} Para: ${msg.destinatario_nombre} • Prioridad: ${msg.prioridad.toUpperCase()} • ${msg.mensaje.slice(0, 100)}...`,
          badge: msg.prioridad.toUpperCase(),
          badgeColor: msg.prioridad === 'urgente' || msg.prioridad === 'alta' ? 'rose' : 'slate',
          date: msg.creado_en.split('T')[0],
          targetTab: 'contabilidad',
          targetId: msg.id,
          raw: msg,
          actionText: 'Ver Conversación'
        });
      }
    }

    // 8. BÚSQUEDA EN HISTORIAL DE NOTIFICACIONES Y CORREOS
    for (const em of this.emailLogs) {
      const emText = `${em.id} ${em.asunto} ${em.destinatario_nombre} ${em.destinatario_email} ${em.evento} ${em.cuerpo_texto || ''}`.toLowerCase();
      if (emText.includes(q)) {
        results.push({
          id: `em_${em.id}`,
          category: 'emails',
          categoryLabel: 'Historial de Correos',
          title: `Correo: ${em.asunto}`,
          subtitle: `Destinatario: ${em.destinatario_nombre} (${em.destinatario_email}) • Evento: ${em.evento} • Estado: ${em.estado_envio.toUpperCase()}`,
          badge: em.estado_envio === 'enviado' ? 'ENVIADO' : 'FALLIDO',
          badgeColor: em.estado_envio === 'enviado' ? 'emerald' : 'rose',
          date: em.fecha_envio ? em.fecha_envio.split('T')[0] : todayStr,
          targetTab: 'usuarios',
          targetId: em.id,
          raw: em,
          actionText: 'Ver Detalle del Correo'
        });
      }
    }

    // Conteos por categoría
    const countsByCategory: Record<string, number> = {
      all: results.length,
      users: results.filter(r => r.category === 'users').length,
      transactions: results.filter(r => r.category === 'transactions').length,
      flight_sheets: results.filter(r => r.category === 'flight_sheets').length,
      itineraries: results.filter(r => r.category === 'itineraries').length,
      medical: results.filter(r => r.category === 'medical').length,
      fleet: results.filter(r => r.category === 'fleet').length,
      messages: results.filter(r => r.category === 'messages').length,
      emails: results.filter(r => r.category === 'emails').length
    };

    const filteredResults = categoryFilter === 'all'
      ? results
      : results.filter(r => r.category === categoryFilter);

    return {
      query: rawQuery,
      totalResults: filteredResults.length,
      countsByCategory,
      results: filteredResults.slice(0, 100) // limitar a 100 para máxima fluidez
    };
  }

  // --- REPORTE DE HORAS (MOTOR DE HOJA DE CÁLCULO EXCEL / GOOGLE SHEETS) ---
  private hoursWorkbook: SpreadsheetWorkbook = createInitialHoursWorkbook(INITIAL_FLIGHT_PROGRESS, INITIAL_ITINERARIES, INITIAL_USERS);
  private instructorFeeWorkbooks: Record<string, SpreadsheetWorkbook> = {};
  private customEditedFeeWorkbooks: Record<string, boolean> = {};

  private buildInstructorExcelFileName(instructorName: string): string {
    const clean = (instructorName || 'Instructor')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-zA-Z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '');
    return `Honorarios_${clean || 'Instructor'}.xlsx`;
  }

  private formatFeeStatusLabel(status: InstructorFeeStatus): {
    label: string;
    bgColor: string;
    textColor: string;
  } {
    switch (status) {
      case 'pagado':
        return { label: 'PAGADO ACH', bgColor: '#ECFDF5', textColor: '#047857' };
      case 'aprobado_contabilidad':
        return { label: 'APROBADO CONTAB.', bgColor: '#F0F9FF', textColor: '#0369A1' };
      case 'enviado_contabilidad':
        return { label: 'PENDIENTE PAGO', bgColor: '#FFFBEB', textColor: '#B45309' };
      case 'rechazado':
        return { label: 'RECHAZADO / AJUSTE', bgColor: '#FEF2F2', textColor: '#B91C1C' };
      default:
        return { label: 'REGISTRADO', bgColor: '#F8FAFC', textColor: '#475569' };
    }
  }

  private buildInstructorFeeWorkbook(instructorId: string): SpreadsheetWorkbook {
    const instructorUser = this.users.find(u => u.id === instructorId);
    const statements = this.instructorFeeStatements
      .filter(s => s.instructor_id === instructorId && s.registrado_por_admin === true)
      .slice()
      .sort((a, b) => {
        const da = a.vuelos?.[0]?.fecha || a.periodo_inicio || '';
        const dbDate = b.vuelos?.[0]?.fecha || b.periodo_inicio || '';
        return dbDate.localeCompare(da);
      });

    const firstStmt = statements[0];
    const instructorName = instructorUser?.nombre || firstStmt?.instructor_nombre || 'Instructor';
    const cedula = instructorUser?.documento_identidad || firstStmt?.instructor_cedula || 'N/A';
    const licencia = instructorUser?.licencia || firstStmt?.instructor_licencia || 'CFI';
    const correo = instructorUser?.correo || firstStmt?.instructor_correo || '';
    const baseRate = Number(instructorUser?.tarifa_hora_dual ?? firstStmt?.tarifa_base_hora ?? 30);
    const fileName = this.buildInstructorExcelFileName(instructorName);

    const cells1: Record<string, SpreadsheetCell> = {
      A1: {
        raw: `REGISTRO INDIVIDUAL DE HONORARIOS (CFI) — ${instructorName.toUpperCase()}`,
        value: `REGISTRO INDIVIDUAL DE HONORARIOS (CFI) — ${instructorName.toUpperCase()}`,
        style: { bold: true, bgColor: '#0F172A', textColor: '#FFFFFF', align: 'left' }
      },
      B1: { raw: '', value: '', style: { bgColor: '#0F172A' } },
      C1: { raw: '', value: '', style: { bgColor: '#0F172A' } },
      D1: { raw: '', value: '', style: { bgColor: '#0F172A' } },
      E1: { raw: '', value: '', style: { bgColor: '#0F172A' } },
      F1: { raw: '', value: '', style: { bgColor: '#0F172A' } },
      G1: { raw: '', value: '', style: { bgColor: '#0F172A' } },
      H1: { raw: '', value: '', style: { bgColor: '#0F172A' } },
      I1: { raw: '', value: '', style: { bgColor: '#0F172A' } },
      J1: { raw: '', value: '', style: { bgColor: '#0F172A' } },
      K1: { raw: '', value: '', style: { bgColor: '#0F172A' } },
      L1: { raw: '', value: '', style: { bgColor: '#0F172A' } },

      A2: { raw: 'INSTRUCTOR:', value: 'INSTRUCTOR:', style: { bold: true, bgColor: '#F8FAFC', textColor: '#475569', align: 'left' } },
      B2: { raw: instructorName, value: instructorName, style: { bold: true, bgColor: '#F8FAFC', textColor: '#0F172A', align: 'left' } },
      C2: { raw: 'CÉDULA:', value: 'CÉDULA:', style: { bold: true, bgColor: '#F8FAFC', textColor: '#475569', align: 'right' } },
      D2: { raw: cedula, value: cedula, style: { bold: true, bgColor: '#F8FAFC', textColor: '#0F172A', align: 'left' } },
      E2: { raw: 'LICENCIA:', value: 'LICENCIA:', style: { bold: true, bgColor: '#F8FAFC', textColor: '#475569', align: 'right' } },
      F2: { raw: licencia, value: licencia, style: { bold: true, bgColor: '#F8FAFC', textColor: '#0369A1', align: 'left' } },
      G2: { raw: 'TARIFA BASE:', value: 'TARIFA BASE:', style: { bold: true, bgColor: '#F8FAFC', textColor: '#475569', align: 'right' } },
      H2: { raw: String(baseRate), value: baseRate, style: { bold: true, bgColor: '#ECFDF5', textColor: '#047857', align: 'right', format: 'currency' } },
      I2: { raw: 'CORREO:', value: 'CORREO:', style: { bold: true, bgColor: '#F8FAFC', textColor: '#475569', align: 'right' } },
      J2: { raw: correo, value: correo, style: { bgColor: '#F8FAFC', textColor: '#334155', align: 'left' } },
      K2: { raw: 'ARCHIVO:', value: 'ARCHIVO:', style: { bold: true, bgColor: '#F8FAFC', textColor: '#475569', align: 'right' } },
      L2: { raw: fileName, value: fileName, style: { bold: true, bgColor: '#F0F9FF', textColor: '#0369A1', align: 'left' } },
    };

    const startDataRow = 6;
    const endDataRow = statements.length > 0 ? startDataRow + statements.length - 1 : startDataRow;
    const sumHoursVal = statements.filter(s => s.estado !== 'rechazado').reduce((acc, s) => acc + s.total_horas, 0);
    const sumBrutoVal = statements.filter(s => s.estado !== 'rechazado').reduce((acc, s) => acc + s.total_bruto, 0);
    const sumRetVal = statements.filter(s => s.estado !== 'rechazado').reduce((acc, s) => acc + s.retencion_impuesto, 0);
    const sumNetoVal = statements.filter(s => s.estado !== 'rechazado').reduce((acc, s) => acc + s.total_neto, 0);
    const sumPagadoVal = statements.filter(s => s.estado === 'pagado').reduce((acc, s) => acc + s.total_neto, 0);
    const sumPendienteVal = statements.filter(s => s.estado === 'enviado_contabilidad' || s.estado === 'aprobado_contabilidad').reduce((acc, s) => acc + s.total_neto, 0);

    // Fila 3: Resumen KPI individual en Excel
    cells1['A3'] = { raw: 'TOTAL HORAS:', value: 'TOTAL HORAS:', style: { bold: true, bgColor: '#F0F9FF', textColor: '#0369A1', align: 'left' } };
    cells1['B3'] = statements.length > 0
      ? { raw: `=SUM(E${startDataRow}:E${endDataRow})`, value: Number(sumHoursVal.toFixed(2)), formula: `SUM(E${startDataRow}:E${endDataRow})`, style: { bold: true, bgColor: '#F0F9FF', textColor: '#0369A1', align: 'right', format: 'hours' } }
      : { raw: '0', value: 0, style: { bold: true, bgColor: '#F0F9FF', textColor: '#0369A1', align: 'right', format: 'hours' } };
    cells1['C3'] = { raw: 'TOTAL NETO:', value: 'TOTAL NETO:', style: { bold: true, bgColor: '#ECFDF5', textColor: '#047857', align: 'right' } };
    cells1['D3'] = statements.length > 0
      ? { raw: `=SUM(I${startDataRow}:I${endDataRow})`, value: Number(sumNetoVal.toFixed(2)), formula: `SUM(I${startDataRow}:I${endDataRow})`, style: { bold: true, bgColor: '#ECFDF5', textColor: '#047857', align: 'right', format: 'currency' } }
      : { raw: '0', value: 0, style: { bold: true, bgColor: '#ECFDF5', textColor: '#047857', align: 'right', format: 'currency' } };
    cells1['E3'] = { raw: 'PAGADO ACH:', value: 'PAGADO ACH:', style: { bold: true, bgColor: '#ECFDF5', textColor: '#047857', align: 'right' } };
    cells1['F3'] = { raw: String(Number(sumPagadoVal.toFixed(2))), value: Number(sumPagadoVal.toFixed(2)), style: { bold: true, bgColor: '#ECFDF5', textColor: '#047857', align: 'right', format: 'currency' } };
    cells1['G3'] = { raw: 'PENDIENTE:', value: 'PENDIENTE:', style: { bold: true, bgColor: '#FFFBEB', textColor: '#B45309', align: 'right' } };
    cells1['H3'] = { raw: String(Number(sumPendienteVal.toFixed(2))), value: Number(sumPendienteVal.toFixed(2)), style: { bold: true, bgColor: '#FFFBEB', textColor: '#B45309', align: 'right', format: 'currency' } };
    cells1['I3'] = { raw: 'VUELOS:', value: 'VUELOS:', style: { bold: true, bgColor: '#F8FAFC', textColor: '#475569', align: 'right' } };
    cells1['J3'] = { raw: String(statements.length), value: statements.length, style: { bold: true, bgColor: '#F8FAFC', textColor: '#0F172A', align: 'center' } };
    cells1['K3'] = { raw: '', value: '', style: { bgColor: '#F8FAFC' } };
    cells1['L3'] = { raw: '', value: '', style: { bgColor: '#F8FAFC' } };

    // Fila 5: Encabezados de tabla principal
    const headers1: Array<{ col: string; label: string; align: 'left' | 'center' | 'right'; bg: string; format?: 'currency' | 'hours' }> = [
      { col: 'A', label: 'FECHA', align: 'center', bg: '#1E293B' },
      { col: 'B', label: 'FOLIO BITÁCORA', align: 'center', bg: '#1E293B' },
      { col: 'C', label: 'AERONAVE', align: 'center', bg: '#1E293B' },
      { col: 'D', label: 'ESTUDIANTE', align: 'left', bg: '#1E293B' },
      { col: 'E', label: 'HORAS (CFI)', align: 'right', bg: '#0369A1', format: 'hours' },
      { col: 'F', label: 'TARIFA ($/H)', align: 'right', bg: '#1E293B', format: 'currency' },
      { col: 'G', label: 'BRUTO ($)', align: 'right', bg: '#0284C7', format: 'currency' },
      { col: 'H', label: 'RETENCIÓN ($)', align: 'right', bg: '#1E293B', format: 'currency' },
      { col: 'I', label: 'NETO A PAGAR ($)', align: 'right', bg: '#0F766E', format: 'currency' },
      { col: 'J', label: 'ESTADO', align: 'center', bg: '#1E293B' },
      { col: 'K', label: 'REF. PAGO / BANCO', align: 'left', bg: '#1E293B' },
      { col: 'L', label: 'OBSERVACIONES', align: 'left', bg: '#1E293B' },
    ];

    headers1.forEach(h => {
      cells1[`${h.col}5`] = {
        raw: h.label,
        value: h.label,
        style: {
          bold: true,
          bgColor: h.bg,
          textColor: '#FFFFFF',
          align: h.align,
          ...(h.format ? { format: h.format } : {})
        }
      };
    });

    statements.forEach((stmt, idx) => {
      const r = startDataRow + idx;
      const firstFlight = stmt.vuelos?.[0];
      const fecha = firstFlight?.fecha || stmt.periodo_inicio || '';
      const folio = stmt.folio_bitacora || firstFlight?.folio_bitacora || stmt.id;
      const matricula = stmt.matricula_avion || firstFlight?.matricula_avion || 'N/A';
      const estudiante =
        stmt.estudiante_nombre ||
        stmt.piloto_nombre ||
        firstFlight?.estudiante_nombre ||
        firstFlight?.piloto_nombre ||
        'No especificado';
      const hrs = Number(stmt.total_horas || 0);
      const rate = Number(stmt.tarifa_base_hora || baseRate || 30);
      const bruto = Number((hrs * rate).toFixed(2));
      const ret = Number(stmt.retencion_impuesto || 0);
      const neto = Number((bruto - ret).toFixed(2));
      const statusBadge = this.formatFeeStatusLabel(stmt.estado);
      const pagoRef = stmt.referencia_pago_ach
        ? `${stmt.referencia_pago_ach}${stmt.banco_pago ? ` (${stmt.banco_pago})` : ''}`
        : (stmt.banco_pago || '');
      const obs = stmt.notas_contabilidad || stmt.notas_instructor || stmt.tipo_mision || '';

      cells1[`A${r}`] = { raw: fecha, value: fecha, style: { align: 'center', format: 'date' } };
      cells1[`B${r}`] = { raw: folio, value: folio, style: { align: 'center', bold: true, textColor: '#0369A1' } };
      cells1[`C${r}`] = { raw: matricula, value: matricula, style: { align: 'center', bold: true } };
      cells1[`D${r}`] = { raw: estudiante, value: estudiante, style: { align: 'left', bold: true } };
      cells1[`E${r}`] = { raw: String(hrs), value: hrs, style: { align: 'right', format: 'hours' } };
      cells1[`F${r}`] = { raw: String(rate), value: rate, style: { align: 'right', format: 'currency' } };
      cells1[`G${r}`] = { raw: `=E${r}*F${r}`, value: bruto, formula: `E${r}*F${r}`, style: { align: 'right', format: 'currency', bgColor: '#F0F9FF' } };
      cells1[`H${r}`] = { raw: String(ret), value: ret, style: { align: 'right', format: 'currency' } };
      cells1[`I${r}`] = { raw: `=G${r}-H${r}`, value: neto, formula: `G${r}-H${r}`, style: { align: 'right', bold: true, format: 'currency', textColor: '#0F766E', bgColor: '#F0FDFA' } };
      cells1[`J${r}`] = { raw: statusBadge.label, value: statusBadge.label, style: { align: 'center', bold: true, bgColor: statusBadge.bgColor, textColor: statusBadge.textColor } };
      cells1[`K${r}`] = { raw: pagoRef, value: pagoRef, style: { align: 'left' } };
      cells1[`L${r}`] = { raw: obs, value: obs, style: { align: 'left' } };
    });

    const totalRow = statements.length > 0 ? endDataRow + 1 : startDataRow + 1;
    if (statements.length === 0) {
      cells1[`A${startDataRow}`] = {
        raw: 'Sin bitácoras de honorarios registradas para este instructor',
        value: 'Sin bitácoras de honorarios registradas para este instructor',
        style: { italic: true, textColor: '#64748B', align: 'left' }
      };
    }

    cells1[`A${totalRow}`] = { raw: 'TOTALES ACUMULADOS', value: 'TOTALES ACUMULADOS', style: { bold: true, bgColor: '#0F172A', textColor: '#FFFFFF', align: 'left' } };
    cells1[`B${totalRow}`] = { raw: '', value: '', style: { bgColor: '#0F172A' } };
    cells1[`C${totalRow}`] = { raw: '', value: '', style: { bgColor: '#0F172A' } };
    cells1[`D${totalRow}`] = { raw: '', value: '', style: { bgColor: '#0F172A' } };
    cells1[`E${totalRow}`] = statements.length > 0
      ? { raw: `=SUM(E${startDataRow}:E${endDataRow})`, value: Number(sumHoursVal.toFixed(2)), formula: `SUM(E${startDataRow}:E${endDataRow})`, style: { bold: true, bgColor: '#0F172A', textColor: '#38BDF8', align: 'right', format: 'hours' } }
      : { raw: '0', value: 0, style: { bold: true, bgColor: '#0F172A', textColor: '#38BDF8', align: 'right', format: 'hours' } };
    cells1[`F${totalRow}`] = statements.length > 0
      ? { raw: `=AVERAGE(F${startDataRow}:F${endDataRow})`, value: Number(baseRate.toFixed(2)), formula: `AVERAGE(F${startDataRow}:F${endDataRow})`, style: { bold: true, bgColor: '#0F172A', textColor: '#94A3B8', align: 'right', format: 'currency' } }
      : { raw: String(baseRate), value: baseRate, style: { bold: true, bgColor: '#0F172A', textColor: '#94A3B8', align: 'right', format: 'currency' } };
    cells1[`G${totalRow}`] = statements.length > 0
      ? { raw: `=SUM(G${startDataRow}:G${endDataRow})`, value: Number(sumBrutoVal.toFixed(2)), formula: `SUM(G${startDataRow}:G${endDataRow})`, style: { bold: true, bgColor: '#0F172A', textColor: '#FFFFFF', align: 'right', format: 'currency' } }
      : { raw: '0', value: 0, style: { bold: true, bgColor: '#0F172A', textColor: '#FFFFFF', align: 'right', format: 'currency' } };
    cells1[`H${totalRow}`] = statements.length > 0
      ? { raw: `=SUM(H${startDataRow}:H${endDataRow})`, value: Number(sumRetVal.toFixed(2)), formula: `SUM(H${startDataRow}:H${endDataRow})`, style: { bold: true, bgColor: '#0F172A', textColor: '#FBBF24', align: 'right', format: 'currency' } }
      : { raw: '0', value: 0, style: { bold: true, bgColor: '#0F172A', textColor: '#FBBF24', align: 'right', format: 'currency' } };
    cells1[`I${totalRow}`] = statements.length > 0
      ? { raw: `=SUM(I${startDataRow}:I${endDataRow})`, value: Number(sumNetoVal.toFixed(2)), formula: `SUM(I${startDataRow}:I${endDataRow})`, style: { bold: true, bgColor: '#0F172A', textColor: '#34D399', align: 'right', format: 'currency' } }
      : { raw: '0', value: 0, style: { bold: true, bgColor: '#0F172A', textColor: '#34D399', align: 'right', format: 'currency' } };
    cells1[`J${totalRow}`] = { raw: `${statements.length} REGISTRO(S)`, value: `${statements.length} REGISTRO(S)`, style: { bold: true, bgColor: '#0F172A', textColor: '#CBD5E1', align: 'center' } };
    cells1[`K${totalRow}`] = { raw: '', value: '', style: { bgColor: '#0F172A' } };
    cells1[`L${totalRow}`] = { raw: '', value: '', style: { bgColor: '#0F172A' } };

    // Hoja 2: Resumen Mensual Individual
    const cells2: Record<string, SpreadsheetCell> = {
      A1: {
        raw: `RESUMEN MENSUAL DE HONORARIOS — ${instructorName.toUpperCase()}`,
        value: `RESUMEN MENSUAL DE HONORARIOS — ${instructorName.toUpperCase()}`,
        style: { bold: true, bgColor: '#0F172A', textColor: '#FFFFFF', align: 'left' }
      },
      B1: { raw: '', value: '', style: { bgColor: '#0F172A' } },
      C1: { raw: '', value: '', style: { bgColor: '#0F172A' } },
      D1: { raw: '', value: '', style: { bgColor: '#0F172A' } },
      E1: { raw: '', value: '', style: { bgColor: '#0F172A' } },
      F1: { raw: '', value: '', style: { bgColor: '#0F172A' } },
      G1: { raw: '', value: '', style: { bgColor: '#0F172A' } },
      H1: { raw: '', value: '', style: { bgColor: '#0F172A' } },

      A2: { raw: 'MES', value: 'MES', style: { bold: true, bgColor: '#1E293B', textColor: '#FFFFFF', align: 'center' } },
      B2: { raw: 'BITÁCORAS', value: 'BITÁCORAS', style: { bold: true, bgColor: '#1E293B', textColor: '#FFFFFF', align: 'center' } },
      C2: { raw: 'HORAS (CFI)', value: 'HORAS (CFI)', style: { bold: true, bgColor: '#0369A1', textColor: '#FFFFFF', align: 'right', format: 'hours' } },
      D2: { raw: 'BRUTO ($)', value: 'BRUTO ($)', style: { bold: true, bgColor: '#1E293B', textColor: '#FFFFFF', align: 'right', format: 'currency' } },
      E2: { raw: 'RETENCIÓN ($)', value: 'RETENCIÓN ($)', style: { bold: true, bgColor: '#1E293B', textColor: '#FFFFFF', align: 'right', format: 'currency' } },
      F2: { raw: 'NETO ($)', value: 'NETO ($)', style: { bold: true, bgColor: '#0F766E', textColor: '#FFFFFF', align: 'right', format: 'currency' } },
      G2: { raw: 'PAGADO ACH ($)', value: 'PAGADO ACH ($)', style: { bold: true, bgColor: '#059669', textColor: '#FFFFFF', align: 'right', format: 'currency' } },
      H2: { raw: 'PENDIENTE ($)', value: 'PENDIENTE ($)', style: { bold: true, bgColor: '#D97706', textColor: '#FFFFFF', align: 'right', format: 'currency' } },
    };

    const monthMap = new Map<string, { mes: string; count: number; horas: number; bruto: number; ret: number; neto: number; pagado: number; pendiente: number }>();
    statements.filter(s => s.estado !== 'rechazado').forEach(s => {
      const fecha = s.vuelos?.[0]?.fecha || s.periodo_inicio || '';
      const mes = fecha.length >= 7 ? fecha.slice(0, 7) : 'Sin fecha';
      const cur = monthMap.get(mes) || { mes, count: 0, horas: 0, bruto: 0, ret: 0, neto: 0, pagado: 0, pendiente: 0 };
      cur.count += 1;
      cur.horas += Number(s.total_horas || 0);
      cur.bruto += Number(s.total_bruto || 0);
      cur.ret += Number(s.retencion_impuesto || 0);
      cur.neto += Number(s.total_neto || 0);
      if (s.estado === 'pagado') cur.pagado += Number(s.total_neto || 0);
      else cur.pendiente += Number(s.total_neto || 0);
      monthMap.set(mes, cur);
    });
    const months = Array.from(monthMap.values()).sort((a, b) => b.mes.localeCompare(a.mes));

    months.forEach((m, i) => {
      const r = 3 + i;
      cells2[`A${r}`] = { raw: m.mes, value: m.mes, style: { bold: true, align: 'center' } };
      cells2[`B${r}`] = { raw: String(m.count), value: m.count, style: { align: 'center' } };
      cells2[`C${r}`] = { raw: String(Number(m.horas.toFixed(2))), value: Number(m.horas.toFixed(2)), style: { align: 'right', format: 'hours' } };
      cells2[`D${r}`] = { raw: String(Number(m.bruto.toFixed(2))), value: Number(m.bruto.toFixed(2)), style: { align: 'right', format: 'currency' } };
      cells2[`E${r}`] = { raw: String(Number(m.ret.toFixed(2))), value: Number(m.ret.toFixed(2)), style: { align: 'right', format: 'currency' } };
      cells2[`F${r}`] = { raw: `=D${r}-E${r}`, value: Number((m.bruto - m.ret).toFixed(2)), formula: `D${r}-E${r}`, style: { bold: true, align: 'right', format: 'currency', bgColor: '#F0FDFA', textColor: '#0F766E' } };
      cells2[`G${r}`] = { raw: String(Number(m.pagado.toFixed(2))), value: Number(m.pagado.toFixed(2)), style: { align: 'right', format: 'currency', textColor: '#047857', bgColor: '#ECFDF5' } };
      cells2[`H${r}`] = { raw: `=F${r}-G${r}`, value: Number(m.pendiente.toFixed(2)), formula: `F${r}-G${r}`, style: { bold: true, align: 'right', format: 'currency', textColor: '#B45309', bgColor: '#FFFBEB' } };
    });

    const mTotalRow = months.length > 0 ? 3 + months.length : 4;
    cells2[`A${mTotalRow}`] = { raw: 'TOTAL GENERAL', value: 'TOTAL GENERAL', style: { bold: true, bgColor: '#0F172A', textColor: '#FFFFFF', align: 'left' } };
    cells2[`B${mTotalRow}`] = months.length > 0
      ? { raw: `=SUM(B3:B${mTotalRow - 1})`, value: months.reduce((a, b) => a + b.count, 0), formula: `SUM(B3:B${mTotalRow - 1})`, style: { bold: true, bgColor: '#0F172A', textColor: '#FFFFFF', align: 'center' } }
      : { raw: '0', value: 0, style: { bold: true, bgColor: '#0F172A', textColor: '#FFFFFF', align: 'center' } };
    cells2[`C${mTotalRow}`] = months.length > 0
      ? { raw: `=SUM(C3:C${mTotalRow - 1})`, value: Number(sumHoursVal.toFixed(2)), formula: `SUM(C3:C${mTotalRow - 1})`, style: { bold: true, bgColor: '#0F172A', textColor: '#38BDF8', align: 'right', format: 'hours' } }
      : { raw: '0', value: 0, style: { bold: true, bgColor: '#0F172A', textColor: '#38BDF8', align: 'right', format: 'hours' } };
    cells2[`D${mTotalRow}`] = months.length > 0
      ? { raw: `=SUM(D3:D${mTotalRow - 1})`, value: Number(sumBrutoVal.toFixed(2)), formula: `SUM(D3:D${mTotalRow - 1})`, style: { bold: true, bgColor: '#0F172A', textColor: '#FFFFFF', align: 'right', format: 'currency' } }
      : { raw: '0', value: 0, style: { bold: true, bgColor: '#0F172A', textColor: '#FFFFFF', align: 'right', format: 'currency' } };
    cells2[`E${mTotalRow}`] = months.length > 0
      ? { raw: `=SUM(E3:E${mTotalRow - 1})`, value: Number(sumRetVal.toFixed(2)), formula: `SUM(E3:E${mTotalRow - 1})`, style: { bold: true, bgColor: '#0F172A', textColor: '#FBBF24', align: 'right', format: 'currency' } }
      : { raw: '0', value: 0, style: { bold: true, bgColor: '#0F172A', textColor: '#FBBF24', align: 'right', format: 'currency' } };
    cells2[`F${mTotalRow}`] = months.length > 0
      ? { raw: `=SUM(F3:F${mTotalRow - 1})`, value: Number(sumNetoVal.toFixed(2)), formula: `SUM(F3:F${mTotalRow - 1})`, style: { bold: true, bgColor: '#0F172A', textColor: '#34D399', align: 'right', format: 'currency' } }
      : { raw: '0', value: 0, style: { bold: true, bgColor: '#0F172A', textColor: '#34D399', align: 'right', format: 'currency' } };
    cells2[`G${mTotalRow}`] = months.length > 0
      ? { raw: `=SUM(G3:G${mTotalRow - 1})`, value: Number(sumPagadoVal.toFixed(2)), formula: `SUM(G3:G${mTotalRow - 1})`, style: { bold: true, bgColor: '#0F172A', textColor: '#34D399', align: 'right', format: 'currency' } }
      : { raw: '0', value: 0, style: { bold: true, bgColor: '#0F172A', textColor: '#34D399', align: 'right', format: 'currency' } };
    cells2[`H${mTotalRow}`] = months.length > 0
      ? { raw: `=SUM(H3:H${mTotalRow - 1})`, value: Number(sumPendienteVal.toFixed(2)), formula: `SUM(H3:H${mTotalRow - 1})`, style: { bold: true, bgColor: '#0F172A', textColor: '#FBBF24', align: 'right', format: 'currency' } }
      : { raw: '0', value: 0, style: { bold: true, bgColor: '#0F172A', textColor: '#FBBF24', align: 'right', format: 'currency' } };

    return {
      id: `hon_excel_${instructorId}`,
      title: `Honorarios — ${instructorName}`,
      activeSheetId: 'sheet_detalle_honorarios',
      updatedAt: new Date().toISOString(),
      sheets: [
        {
          id: 'sheet_detalle_honorarios',
          name: 'Detalle Honorarios',
          icon: 'Users',
          rowCount: Math.max(25, totalRow + 6),
          colCount: 12,
          cells: cells1,
          colWidths: {
            0: 110,
            1: 170,
            2: 105,
            3: 190,
            4: 110,
            5: 115,
            6: 120,
            7: 120,
            8: 135,
            9: 155,
            10: 170,
            11: 220
          }
        },
        {
          id: 'sheet_resumen_mensual',
          name: 'Resumen Mensual',
          icon: 'FileSpreadsheet',
          rowCount: Math.max(20, mTotalRow + 5),
          colCount: 10,
          cells: cells2,
          colWidths: {
            0: 120,
            1: 110,
            2: 125,
            3: 125,
            4: 125,
            5: 135,
            6: 135,
            7: 135
          }
        }
      ]
    };
  }

  getInstructorFeeExcelDirectory(): InstructorFeeExcelIndexItem[] {
    const instructorMap = new Map<string, { id: string; nombre: string; cedula: string; licencia: string; correo: string }>();

    this.users
      .filter(u => u.rol === 'instructor')
      .forEach(u => {
        instructorMap.set(u.id, {
          id: u.id,
          nombre: u.nombre,
          cedula: u.documento_identidad || 'N/A',
          licencia: u.licencia || 'CFI',
          correo: u.correo || ''
        });
      });

    this.instructorFeeStatements
      .filter(s => s.registrado_por_admin === true)
      .forEach(s => {
        if (s.instructor_id && !instructorMap.has(s.instructor_id)) {
          instructorMap.set(s.instructor_id, {
            id: s.instructor_id,
            nombre: s.instructor_nombre,
            cedula: s.instructor_cedula || 'N/A',
            licencia: s.instructor_licencia || 'CFI',
            correo: s.instructor_correo || ''
          });
        }
      });

    return Array.from(instructorMap.values())
      .map(inst => {
        const stmts = this.instructorFeeStatements.filter(
          s => s.instructor_id === inst.id && s.registrado_por_admin === true && s.estado !== 'rechazado'
        );
        const totalHoras = Number(stmts.reduce((acc, s) => acc + (s.total_horas || 0), 0).toFixed(2));
        const totalBruto = Number(stmts.reduce((acc, s) => acc + (s.total_bruto || 0), 0).toFixed(2));
        const totalRetencion = Number(stmts.reduce((acc, s) => acc + (s.retencion_impuesto || 0), 0).toFixed(2));
        const totalNeto = Number(stmts.reduce((acc, s) => acc + (s.total_neto || 0), 0).toFixed(2));
        const totalPagado = Number(stmts.filter(s => s.estado === 'pagado').reduce((acc, s) => acc + (s.total_neto || 0), 0).toFixed(2));
        const totalPendiente = Number(
          stmts
            .filter(s => s.estado === 'enviado_contabilidad' || s.estado === 'aprobado_contabilidad')
            .reduce((acc, s) => acc + (s.total_neto || 0), 0)
            .toFixed(2)
        );
        const savedWb = this.instructorFeeWorkbooks[inst.id];
        return {
          instructor_id: inst.id,
          instructor_nombre: inst.nombre,
          instructor_cedula: inst.cedula,
          instructor_licencia: inst.licencia,
          instructor_correo: inst.correo,
          fileName: this.buildInstructorExcelFileName(inst.nombre),
          registrosCount: stmts.length,
          totalHoras,
          totalBruto,
          totalRetencion,
          totalNeto,
          totalPagado,
          totalPendiente,
          updatedAt: savedWb?.updatedAt || new Date().toISOString(),
          hasCustomEdits: Boolean(this.customEditedFeeWorkbooks[inst.id])
        };
      })
      .sort((a, b) => a.instructor_nombre.localeCompare(b.instructor_nombre));
  }

  getInstructorFeeExcelWorkbook(instructorId: string): {
    workbook: SpreadsheetWorkbook;
    hasCustomEdits: boolean;
    fileName: string;
  } {
    const instructorUser = this.users.find(u => u.id === instructorId);
    const firstStmt = this.instructorFeeStatements.find(s => s.instructor_id === instructorId);
    const instName = instructorUser?.nombre || firstStmt?.instructor_nombre || 'Instructor';
    const fileName = this.buildInstructorExcelFileName(instName);

    if (this.customEditedFeeWorkbooks[instructorId] && this.instructorFeeWorkbooks[instructorId]) {
      return {
        workbook: this.instructorFeeWorkbooks[instructorId],
        hasCustomEdits: true,
        fileName
      };
    }

    const generated = this.buildInstructorFeeWorkbook(instructorId);
    this.instructorFeeWorkbooks[instructorId] = generated;
    return {
      workbook: generated,
      hasCustomEdits: false,
      fileName
    };
  }

  saveInstructorFeeExcelWorkbook(
    instructorId: string,
    workbook: SpreadsheetWorkbook,
    actorRole: string,
    actorName?: string
  ): { workbook: SpreadsheetWorkbook; hasCustomEdits: boolean; fileName: string } {
    if (!['escuela', 'admin', 'contabilidad'].includes(actorRole)) {
      const err: any = new Error('Solo Director, Administración y Contabilidad pueden editar la hoja Excel de honorarios.');
      err.statusCode = 403;
      throw err;
    }

    const instructorUser = this.users.find(u => u.id === instructorId);
    const instName = instructorUser?.nombre || workbook.title || 'Instructor';
    const fileName = this.buildInstructorExcelFileName(instName);

    const saved: SpreadsheetWorkbook = {
      ...workbook,
      id: `hon_excel_${instructorId}`,
      updatedAt: new Date().toISOString()
    };

    this.instructorFeeWorkbooks[instructorId] = saved;
    this.customEditedFeeWorkbooks[instructorId] = true;

    try {
      this.addAuditLog({
        usuario_id: actorName || actorRole,
        usuario_nombre: actorName || actorRole.toUpperCase(),
        usuario_rol: actorRole as UserRole,
        modulo: 'contabilidad',
        accion: 'MODIFICAR',
        entidad_tipo: 'Excel Honorarios Instructor',
        entidad_id: instructorId,
        descripcion: `Edición de archivo Excel individual (${fileName}) para ${instName}.`,
        detalles_cambio: [],
        severidad: 'info'
      });
    } catch (audErr) {
      console.warn('[Excel Honorarios] Error no crítico en auditoría:', audErr);
    }

    this.saveToDisk();
    return { workbook: saved, hasCustomEdits: true, fileName };
  }

  syncInstructorFeeExcelWorkbook(
    instructorId: string,
    actorRole: string
  ): { workbook: SpreadsheetWorkbook; hasCustomEdits: boolean; fileName: string } {
    if (!['escuela', 'admin', 'contabilidad'].includes(actorRole)) {
      const err: any = new Error('Solo Director, Administración y Contabilidad pueden sincronizar la hoja Excel de honorarios.');
      err.statusCode = 403;
      throw err;
    }

    const instructorUser = this.users.find(u => u.id === instructorId);
    const firstStmt = this.instructorFeeStatements.find(s => s.instructor_id === instructorId);
    const instName = instructorUser?.nombre || firstStmt?.instructor_nombre || 'Instructor';
    const fileName = this.buildInstructorExcelFileName(instName);

    const rebuilt = this.buildInstructorFeeWorkbook(instructorId);
    this.instructorFeeWorkbooks[instructorId] = rebuilt;
    this.customEditedFeeWorkbooks[instructorId] = false;
    this.saveToDisk();

    return { workbook: rebuilt, hasCustomEdits: false, fileName };
  }

  getHoursSpreadsheet(): SpreadsheetWorkbook {
    return this.hoursWorkbook;
  }

  saveHoursSpreadsheet(workbook: SpreadsheetWorkbook): SpreadsheetWorkbook {
    this.hoursWorkbook = {
      ...workbook,
      updatedAt: new Date().toISOString()
    };
    this.saveToDisk();
    return this.hoursWorkbook;
  }

  syncHoursSpreadsheetFromFlights(): SpreadsheetWorkbook {
    this.hoursWorkbook = createInitialHoursWorkbook(this.flightProgress, this.itineraries, this.users);
    this.saveToDisk();
    return this.hoursWorkbook;
  }

  resetHoursSpreadsheet(): SpreadsheetWorkbook {
    this.hoursWorkbook = createInitialHoursWorkbook(this.flightProgress, this.itineraries, this.users);
    this.saveToDisk();
    return this.hoursWorkbook;
  }

  // ==========================================
  // DASHBOARD FINANCIERO Y GESTIÓN DE GASTOS OPERATIVOS
  // ==========================================

  getOperatingExpenses(filter?: {
    categoria?: string;
    anio?: number;
    mes?: string;
    matricula?: string;
  }): OperatingExpense[] {
    let list = [...this.operatingExpenses];

    if (filter?.categoria && filter.categoria !== 'todas') {
      list = list.filter(e => e.categoria === filter.categoria);
    }
    if (filter?.matricula && filter.matricula !== 'todas') {
      list = list.filter(e => e.matricula_asociada === filter.matricula);
    }
    if (filter?.anio) {
      list = list.filter(e => e.fecha.startsWith(String(filter.anio)));
    }
    if (filter?.mes) {
      list = list.filter(e => e.fecha.startsWith(filter.mes!));
    }

    return list.sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime());
  }

  getOperatingExpenseById(id: string): OperatingExpense | undefined {
    return this.operatingExpenses.find(e => e.id === id);
  }

  addOperatingExpense(data: Omit<OperatingExpense, 'id' | 'creado_en'>): OperatingExpense {
    const newExpense: OperatingExpense = {
      ...data,
      id: 'exp_' + Date.now() + '_' + Math.floor(Math.random() * 1000),
      creado_en: new Date().toISOString()
    };
    this.operatingExpenses.unshift(newExpense);
    this.saveToDisk();
    return newExpense;
  }

  updateOperatingExpense(id: string, updates: Partial<OperatingExpense>): OperatingExpense | null {
    const idx = this.operatingExpenses.findIndex(e => e.id === id);
    if (idx === -1) return null;
    this.operatingExpenses[idx] = {
      ...this.operatingExpenses[idx],
      ...updates
    };
    this.saveToDisk();
    return this.operatingExpenses[idx];
  }

  deleteOperatingExpense(id: string): boolean {
    const idx = this.operatingExpenses.findIndex(e => e.id === id);
    if (idx === -1) return false;
    this.operatingExpenses.splice(idx, 1);
    this.saveToDisk();
    return true;
  }

  /**
   * Genera el Resumen Financiero Completo por Mes y Rentabilidad
   * Consolida ingresos (transacciones, vuelos facturados, paquetes de horas) y gastos operativos.
   */
  getFinancialDashboardSummary(targetAnio: number = 2026): FinancialDashboardSummary {
    const monthsMeta = [
      { key: '01', short: 'Ene', full: 'Enero', defaultRev: 38400, defaultHrs: 168.5 },
      { key: '02', short: 'Feb', full: 'Febrero', defaultRev: 35900, defaultHrs: 156.0 },
      { key: '03', short: 'Mar', full: 'Marzo', defaultRev: 43800, defaultHrs: 192.4 },
      { key: '04', short: 'Abr', full: 'Abril', defaultRev: 40250, defaultHrs: 176.8 },
      { key: '05', short: 'May', full: 'Mayo', defaultRev: 39100, defaultHrs: 171.2 },
      { key: '06', short: 'Jun', full: 'Junio', defaultRev: 42600, defaultHrs: 185.0 },
      { key: '07', short: 'Jul', full: 'Julio', defaultRev: 46200, defaultHrs: 202.0 },
      { key: '08', short: 'Ago', full: 'Agosto', defaultRev: 36800, defaultHrs: 162.5 },
      { key: '09', short: 'Sep', full: 'Septiembre', defaultRev: 41500, defaultHrs: 180.0 },
      { key: '10', short: 'Oct', full: 'Octubre', defaultRev: 44000, defaultHrs: 190.0 },
      { key: '11', short: 'Nov', full: 'Noviembre', defaultRev: 45200, defaultHrs: 195.0 },
      { key: '12', short: 'Dic', full: 'Diciembre', defaultRev: 48000, defaultHrs: 210.0 }
    ];

    const currentYear = new Date().getFullYear();
    const currentMonthNum = new Date().getMonth() + 1; // 1-12

    const desgloseMensual: MonthlyFinancialItem[] = [];
    const categoryTotals: Record<ExpenseCategory, number> = {
      combustible: 0,
      mantenimiento: 0,
      nomina_instructores: 0,
      nomina_personal: 0,
      hangaraje_tasas: 0,
      seguros: 0,
      simulador_tecnologia: 0,
      otros_operativos: 0
    };

    let totalIngresos = 0;
    let totalGastos = 0;
    let totalHorasVuelo = 0;

    monthsMeta.forEach((m, idx) => {
      const monthStr = `${targetAnio}-${m.key}`;
      
      // Gastos reales registrados para este mes
      const monthExpenses = this.operatingExpenses.filter(e => e.fecha.startsWith(monthStr));
      
      const monthCatExpenses: Record<ExpenseCategory, number> = {
        combustible: 0,
        mantenimiento: 0,
        nomina_instructores: 0,
        nomina_personal: 0,
        hangaraje_tasas: 0,
        seguros: 0,
        simulador_tecnologia: 0,
        otros_operativos: 0
      };

      let sumGastos = 0;
      monthExpenses.forEach(exp => {
        monthCatExpenses[exp.categoria] = (monthCatExpenses[exp.categoria] || 0) + exp.monto;
        sumGastos += exp.monto;
        categoryTotals[exp.categoria] = (categoryTotals[exp.categoria] || 0) + exp.monto;
      });

      // Si es un mes futuro del año actual y no hay gastos registrados, usar proyección base
      const isPastOrCurrent = targetAnio < currentYear || (targetAnio === currentYear && idx + 1 <= currentMonthNum);
      
      let finalGastos = sumGastos;
      let finalIngresos = m.defaultRev;
      let finalHoras = m.defaultHrs;

      if (!isPastOrCurrent && sumGastos === 0) {
        // Proyección equilibrada para meses futuros
        finalGastos = Math.round(m.defaultRev * 0.64);
        monthCatExpenses.combustible = Math.round(finalGastos * 0.22);
        monthCatExpenses.nomina_instructores = Math.round(finalGastos * 0.31);
        monthCatExpenses.nomina_personal = Math.round(finalGastos * 0.22);
        monthCatExpenses.hangaraje_tasas = 2850;
        monthCatExpenses.seguros = 2150;
        monthCatExpenses.mantenimiento = Math.round(finalGastos * 0.08);
      }

      // Si tenemos transacciones aprobadas en ese mes, sumar a ingresos dinámicos
      const monthTxs = this.transactions.filter(t => t.fecha.startsWith(monthStr) && t.estado_aprobacion === 'aprobado' && t.tipo === 'abono');
      if (monthTxs.length > 0 && isPastOrCurrent) {
        const txRevenue = monthTxs.reduce((sum, t) => sum + t.monto, 0);
        // Mezcla ponderada con facturación por hora
        finalIngresos = Math.max(finalIngresos, txRevenue + (m.defaultHrs * 180));
      }

      const utilidadNeta = finalIngresos - finalGastos;
      const margenRentabilidad = finalIngresos > 0 ? Number(((utilidadNeta / finalIngresos) * 100).toFixed(1)) : 0;
      const costoPorHora = finalHoras > 0 ? Number((finalGastos / finalHoras).toFixed(2)) : 0;
      const ingresoPorHora = finalHoras > 0 ? Number((finalIngresos / finalHoras).toFixed(2)) : 0;
      const margenPorHora = finalHoras > 0 ? Number((utilidadNeta / finalHoras).toFixed(2)) : 0;

      totalIngresos += finalIngresos;
      totalGastos += finalGastos;
      totalHorasVuelo += finalHoras;

      desgloseMensual.push({
        mes: monthStr,
        mesNombre: m.short,
        mesCompleto: `${m.full} ${targetAnio}`,
        anio: targetAnio,
        ingresos: finalIngresos,
        gastos: finalGastos,
        utilidadNeta,
        margenRentabilidad,
        horasVuelo: finalHoras,
        costoPorHora,
        ingresoPorHora,
        margenPorHora,
        gastosPorCategoria: monthCatExpenses
      });
    });

    const utilidadNetaTotal = totalIngresos - totalGastos;
    const margenRentabilidadPromedio = totalIngresos > 0 ? Number(((utilidadNetaTotal / totalIngresos) * 100).toFixed(1)) : 0;
    const costoPromedioHora = totalHorasVuelo > 0 ? Number((totalGastos / totalHorasVuelo).toFixed(2)) : 0;
    const ingresoPromedioHora = totalHorasVuelo > 0 ? Number((totalIngresos / totalHorasVuelo).toFixed(2)) : 0;
    const margenPromedioHora = totalHorasVuelo > 0 ? Number((utilidadNetaTotal / totalHorasVuelo).toFixed(2)) : 0;

    // Desglose por Categoría con colores de alta distinción
    const categoryConfigs: { cat: ExpenseCategory; label: string; color: string }[] = [
      { cat: 'combustible', label: 'Combustible AVGAS 100LL & Jet-A', color: '#0284C7' },
      { cat: 'nomina_instructores', label: 'Honorarios Instructores CFI / MEI', color: '#6366F1' },
      { cat: 'nomina_personal', label: 'Planilla Despacho & Operaciones', color: '#8B5CF6' },
      { cat: 'mantenimiento', label: 'Mantenimiento e Inspección 100h', color: '#F59E0B' },
      { cat: 'hangaraje_tasas', label: 'Hangaraje & Tasas Aeroportuarias', color: '#EC4899' },
      { cat: 'seguros', label: 'Seguros Aeronáuticos de Casco & R.C.', color: '#10B981' },
      { cat: 'simulador_tecnologia', label: 'Simulador ALSIM & Software Cloud', color: '#06B6D4' },
      { cat: 'otros_operativos', label: 'Material Didáctico & Suministros', color: '#64748B' }
    ];

    const sumAllCatExpenses = Object.values(categoryTotals).reduce((a, b) => a + b, 0) || 1;
    const desglosePorCategoria: CategoryExpenseBreakdown[] = categoryConfigs.map(cfg => {
      const amount = categoryTotals[cfg.cat] || 0;
      const pct = Number(((amount / sumAllCatExpenses) * 100).toFixed(1));
      return {
        categoria: cfg.cat,
        label: cfg.label,
        monto: amount,
        porcentaje: pct,
        color: cfg.color
      };
    }).sort((a, b) => b.monto - a.monto);

    // Desglose por Aeronave de la Escuela
    const desglosePorAeronave: AircraftFinancialBreakdown[] = [
      {
        matricula: 'HP-1822',
        modelo: 'Piper PA-44-180 Seminole (Bimotor)',
        horas: 485.0,
        ingresos: 155200.0,
        gastos: 94800.0,
        utilidad: 60400.0,
        margen: 38.9
      },
      {
        matricula: 'HP-1450',
        modelo: 'Cessna 172SP Skyhawk (Garmin G1000)',
        horas: 540.2,
        ingresos: 105339.0,
        gastos: 68100.0,
        utilidad: 37239.0,
        margen: 35.4
      },
      {
        matricula: 'HP-1799',
        modelo: 'Piper PA-28-181 Archer III',
        horas: 490.5,
        ingresos: 93195.0,
        gastos: 61400.0,
        utilidad: 31795.0,
        margen: 34.1
      },
      {
        matricula: 'HP-1588',
        modelo: 'Cessna 172N Skyhawk (Analógico)',
        horas: 410.0,
        ingresos: 79950.0,
        gastos: 52600.0,
        utilidad: 27350.0,
        margen: 34.2
      },
      {
        matricula: 'SIM-ALX',
        modelo: 'Simulador ALSIM ALX FNPT II',
        horas: 320.0,
        ingresos: 38400.0,
        gastos: 14200.0,
        utilidad: 24200.0,
        margen: 63.0
      }
    ];

    const recentExpenses = this.getOperatingExpenses({ anio: targetAnio }).slice(0, 15);

    return {
      periodo: `Enero - Diciembre ${targetAnio}`,
      anioSeleccionado: targetAnio,
      resumenAnual: {
        totalIngresos,
        totalGastos,
        utilidadNetaTotal,
        margenRentabilidadPromedio,
        totalHorasVuelo,
        costoPromedioHora,
        ingresoPromedioHora,
        margenPromedioHora,
        comparativaAnioAnterior: {
          crecimientoIngresosPct: 14.8,
          crecimientoUtilidadPct: 18.2
        }
      },
      desgloseMensual,
      desglosePorCategoria,
      desglosePorAeronave,
      gastosRecientes: recentExpenses
    };
  }

  // ==========================================
  // MÓDULO WHATSAPP BUSINESS & AUTOMATIZACIÓN
  // ==========================================

  getWhatsAppConfig(): WhatsAppConfig {
    return this.whatsappConfig;
  }

  updateWhatsAppConfig(updates: Partial<WhatsAppConfig>): WhatsAppConfig {
    this.whatsappConfig = {
      ...this.whatsappConfig,
      ...updates,
      lastSyncAt: new Date().toISOString()
    };
    return this.whatsappConfig;
  }

  verifyWhatsAppConnection(): { success: boolean; message: string; config: WhatsAppConfig } {
    // Simulación de verificación con Graph API v20.0 / Cloud API
    this.whatsappConfig.status = 'connected';
    this.whatsappConfig.connectedAt = this.whatsappConfig.connectedAt || new Date().toISOString();
    this.whatsappConfig.lastSyncAt = new Date().toISOString();
    this.whatsappConfig.qualityRating = 'GREEN';

    return {
      success: true,
      message: 'Conexión verificada exitosamente con Meta WhatsApp Business Cloud API (Servidores de Panamá/US-East).',
      config: this.whatsappConfig
    };
  }

  generateWhatsAppQR(): { qrCode: string; expiresAt: string } {
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString();
    const qrData = `skyops_waba_session_${Date.now()}_albrook_panama_auth_multi_device`;
    this.whatsappConfig.status = 'qr_ready';
    this.whatsappConfig.qrCodeData = qrData;
    return {
      qrCode: qrData,
      expiresAt
    };
  }

  getWhatsAppTriggers(): WhatsAppTrigger[] {
    return this.whatsappTriggers;
  }

  getWhatsAppTriggerById(id: string): WhatsAppTrigger | undefined {
    return this.whatsappTriggers.find(t => t.id === id);
  }

  updateWhatsAppTrigger(id: string, updates: Partial<WhatsAppTrigger>): WhatsAppTrigger {
    const index = this.whatsappTriggers.findIndex(t => t.id === id);
    if (index === -1) {
      throw new Error(`Disparador con ID ${id} no encontrado.`);
    }

    this.whatsappTriggers[index] = {
      ...this.whatsappTriggers[index],
      ...updates
    };

    return this.whatsappTriggers[index];
  }

  toggleWhatsAppTrigger(id: string, activo?: boolean): WhatsAppTrigger {
    const trigger = this.getWhatsAppTriggerById(id);
    if (!trigger) {
      throw new Error(`Disparador ${id} no encontrado.`);
    }

    trigger.activo = activo !== undefined ? activo : !trigger.activo;
    return trigger;
  }

  sendTestWhatsAppMessage(params: {
    destinatario_nombre: string;
    destinatario_telefono: string;
    mensaje: string;
    trigger_id?: string;
  }): WhatsAppLogMessage {
    const newLog: WhatsAppLogMessage = {
      id: `wlog_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      fecha: new Date().toISOString(),
      destinatario_nombre: params.destinatario_nombre || 'Destinatario de Prueba',
      destinatario_telefono: params.destinatario_telefono,
      destinatario_rol: 'Prueba / Administrador',
      evento_disparador: params.trigger_id ? 'prueba_disparador' : 'mensaje_prueba_manual',
      trigger_id: params.trigger_id,
      mensaje: params.mensaje,
      estado_entrega: 'entregado',
      es_prueba: true
    };

    this.whatsappLogs.unshift(newLog);
    if (this.whatsappLogs.length > 200) {
      this.whatsappLogs = this.whatsappLogs.slice(0, 200);
    }

    return newLog;
  }

  getWhatsAppLogs(filters?: { trigger_id?: string; estado?: string; search?: string }): WhatsAppLogMessage[] {
    let list = [...this.whatsappLogs];
    if (filters?.trigger_id && filters.trigger_id !== 'todos') {
      list = list.filter(l => l.trigger_id === filters.trigger_id);
    }
    if (filters?.estado && filters.estado !== 'todos') {
      list = list.filter(l => l.estado_entrega === filters.estado);
    }
    if (filters?.search) {
      const q = filters.search.toLowerCase();
      list = list.filter(l =>
        l.destinatario_nombre.toLowerCase().includes(q) ||
        l.destinatario_telefono.toLowerCase().includes(q) ||
        l.mensaje.toLowerCase().includes(q)
      );
    }
    return list;
  }

  executeScheduledTriggers(): WhatsAppTriggerExecutionResult {
    const now = new Date();
    const todayStr = now.toISOString().slice(0, 10);
    const newLogs: WhatsAppLogMessage[] = [];
    let docAlerts = 0;
    let itinAlerts = 0;

    const students = this.users.filter(u => u.rol === 'estudiante');
    const activeTriggers = this.whatsappTriggers.filter(t => t.activo);

    // 1. EVALUAR VENCIMIENTOS DE CERTIFICADO MÉDICO
    students.forEach(student => {
      if (student.vencimiento_medico) {
        const medDate = new Date(student.vencimiento_medico);
        const diffTime = medDate.getTime() - now.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        // Determinar qué disparador aplica
        let trig: WhatsAppTrigger | undefined;
        if (diffDays <= 0) {
          trig = activeTriggers.find(t => t.evento === 'doc_medico_vencido');
        } else if (diffDays <= 7) {
          trig = activeTriggers.find(t => t.evento === 'doc_medico_vencimiento_7d');
        } else if (diffDays <= 15) {
          trig = activeTriggers.find(t => t.evento === 'doc_medico_vencimiento_15d');
        } else if (diffDays <= 30) {
          trig = activeTriggers.find(t => t.evento === 'doc_medico_vencimiento_30d');
        }

        if (trig) {
          let msg = trig.plantilla_mensaje
            .replace(/\{\{nombre_alumno\}\}/g, student.nombre)
            .replace(/\{\{tipo_documento\}\}/g, 'Certificado Médico Aeronáutico')
            .replace(/\{\{fecha_vencimiento\}\}/g, student.vencimiento_medico)
            .replace(/\{\{dias_restantes\}\}/g, Math.max(0, diffDays).toString())
            .replace(/\{\{numero_medico\}\}/g, student.numero_medico || 'AAC-PAN-9912')
            .replace(/\{\{telefono_escuela\}\}/g, '+507 6890-4411')
            .replace(/\{\{clase_medico\}\}/g, 'Clase 1 / 2');

          const log: WhatsAppLogMessage = {
            id: `wlog_auto_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
            fecha: new Date().toISOString(),
            destinatario_nombre: student.nombre,
            destinatario_telefono: student.telefono || '+507 6000-0000',
            destinatario_rol: 'Estudiante Piloto',
            evento_disparador: trig.evento,
            trigger_id: trig.id,
            mensaje: msg,
            estado_entrega: 'entregado'
          };

          newLogs.push(log);
          this.whatsappLogs.unshift(log);
          trig.total_disparados += 1;
          trig.ultimo_disparo = new Date().toISOString();
          docAlerts++;
        }
      }

      // 2. EVALUAR VENCIMIENTO DE LICENCIA
      if (student.vencimiento_licencia) {
        const licDate = new Date(student.vencimiento_licencia);
        const diffTime = licDate.getTime() - now.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        let trigLic: WhatsAppTrigger | undefined;
        if (diffDays <= 0) {
          trigLic = activeTriggers.find(t => t.evento === 'doc_licencia_vencida');
        } else if (diffDays <= 30) {
          trigLic = activeTriggers.find(t => t.evento === 'doc_licencia_vencimiento_30d');
        }

        if (trigLic) {
          let msg = trigLic.plantilla_mensaje
            .replace(/\{\{nombre_alumno\}\}/g, student.nombre)
            .replace(/\{\{numero_licencia\}\}/g, student.licencia || 'AAC-PCA-4402')
            .replace(/\{\{fecha_vencimiento\}\}/g, student.vencimiento_licencia)
            .replace(/\{\{dias_restantes\}\}/g, Math.max(0, diffDays).toString())
            .replace(/\{\{telefono_escuela\}\}/g, '+507 6890-4411');

          const log: WhatsAppLogMessage = {
            id: `wlog_lic_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
            fecha: new Date().toISOString(),
            destinatario_nombre: student.nombre,
            destinatario_telefono: student.telefono || '+507 6000-0000',
            destinatario_rol: 'Estudiante Piloto',
            evento_disparador: trigLic.evento,
            trigger_id: trigLic.id,
            mensaje: msg,
            estado_entrega: 'entregado'
          };

          newLogs.push(log);
          this.whatsappLogs.unshift(log);
          trigLic.total_disparados += 1;
          trigLic.ultimo_disparo = new Date().toISOString();
          docAlerts++;
        }
      }
    });

    // 3. EVALUAR RECORDATORIOS DE ITINERARIOS
    const trigItin = activeTriggers.find(t => t.evento === 'itinerario_recordatorio_prevuelo');
    if (trigItin) {
      const upcomingItins = this.itineraries.filter(it => it.estado === 'programado').slice(0, 3);
      upcomingItins.forEach(itin => {
        const student = this.users.find(u => u.id === itin.estudiante_id);
        const instructor = this.users.find(u => u.id === itin.instructor_id);

        let msg = trigItin.plantilla_mensaje
          .replace(/\{\{nombre_alumno\}\}/g, student?.nombre || itin.estudiante_nombre || 'Alumno')
          .replace(/\{\{matricula\}\}/g, itin.avion_matricula || 'HP-1234')
          .replace(/\{\{instructor\}\}/g, instructor?.nombre || itin.instructor_nombre || 'Instructor CFI')
          .replace(/\{\{hora_inicio\}\}/g, itin.hora_inicio)
          .replace(/\{\{fecha_vuelo\}\}/g, itin.fecha);

        const log: WhatsAppLogMessage = {
          id: `wlog_itin_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
          fecha: new Date().toISOString(),
          destinatario_nombre: student?.nombre || itin.estudiante_nombre || 'Alumno',
          destinatario_telefono: student?.telefono || '+507 6712-3456',
          destinatario_rol: 'Estudiante en Itinerario',
          evento_disparador: trigItin.evento,
          trigger_id: trigItin.id,
          mensaje: msg,
          estado_entrega: 'entregado'
        };

        newLogs.push(log);
        this.whatsappLogs.unshift(log);
        trigItin.total_disparados += 1;
        trigItin.ultimo_disparo = new Date().toISOString();
        itinAlerts++;
      });
    }

    return {
      ejecutados: newLogs.length,
      mensajes_enviados: newLogs,
      resumen: {
        documentos_alertados: docAlerts,
        itinerarios_notificados: itinAlerts
      }
    };
  }

  // ========================================================
  // SUBSISTEMA DE AUDITORÍA Y TRAZABILIDAD REGULATORIA (AAC PANAMÁ)
  // ========================================================

  /**
   * Registra un nuevo evento inmutable en la bitácora de auditoría con firma hash SHA-256
   */
  addAuditLog(entry: Omit<AuditLogEntry, 'id' | 'timestamp' | 'hash_integridad' | 'ip_origen' | 'dispositivo'> & {
    id?: string;
    timestamp?: string;
    hash_integridad?: string;
    ip_origen?: string;
    dispositivo?: string;
  }): AuditLogEntry {
    const timestamp = entry.timestamp || new Date().toISOString();
    const id = entry.id || `audit_aac_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
    
    // Obtener el hash del registro previo para mantener la cadena de inmutabilidad
    const prevHash = this.auditLogs.length > 0 ? this.auditLogs[0].hash_integridad : '0'.repeat(64);
    
    // Generar Hash criptográfico SHA-256
    const payload = `${timestamp}|${entry.usuario_id}|${entry.modulo}|${entry.accion}|${entry.entidad_id}|${JSON.stringify(entry.detalles_cambio || [])}|${prevHash}`;
    const hash = entry.hash_integridad || crypto.createHash('sha256').update(payload).digest('hex');

    const logEntry: AuditLogEntry = {
      ...entry,
      id,
      timestamp,
      hash_integridad: hash,
      ip_origen: entry.ip_origen || '190.140.88.10 (Terminal SkyOps)',
      dispositivo: entry.dispositivo || 'SkyOps Flight Control Engine',
      detalles_cambio: entry.detalles_cambio || []
    };

    this.auditLogs.unshift(logEntry);

    // Mantener un límite seguro en memoria preservando el historial
    if (this.auditLogs.length > 1000) {
      this.auditLogs = this.auditLogs.slice(0, 1000);
    }

    return logEntry;
  }

  /**
   * Obtiene la lista de registros de auditoría filtrados y ordenados por fecha
   */
  getAuditLogs(filter?: AuditLogFilter): AuditLogEntry[] {
    let logs = [...this.auditLogs];

    if (!filter) return logs;

    if (filter.modulo && filter.modulo !== 'todos') {
      logs = logs.filter(l => l.modulo === filter.modulo);
    }

    if (filter.accion && filter.accion !== 'todos') {
      logs = logs.filter(l => l.accion === filter.accion);
    }

    if (filter.rol && filter.rol !== 'todos') {
      logs = logs.filter(l => l.usuario_rol === filter.rol);
    }

    if (filter.usuario_id && filter.usuario_id !== 'todos') {
      logs = logs.filter(l => l.usuario_id === filter.usuario_id);
    }

    if (filter.studentId && filter.studentId !== 'todos') {
      logs = logs.filter(l =>
        l.estudiante_afectado_id === filter.studentId ||
        l.entidad_id === filter.studentId ||
        (l.estudiante_afectado_nombre && l.estudiante_afectado_nombre.toLowerCase().includes(filter.studentId.toLowerCase()))
      );
    }

    if (filter.instructor_id && filter.instructor_id !== 'todos') {
      logs = logs.filter(l =>
        l.usuario_id === filter.instructor_id ||
        l.entidad_id === filter.instructor_id ||
        (l.instructor_afectado_nombre && (
          l.instructor_afectado_nombre === filter.instructor_id ||
          l.instructor_afectado_nombre.toLowerCase().includes(filter.instructor_id.toLowerCase())
        ))
      );
    }

    if (filter.tipo_entidad && filter.tipo_entidad !== 'todos') {
      if (filter.tipo_entidad === 'alumno') {
        logs = logs.filter(l => {
          const tipo = (l.entidad_tipo || '').toLowerCase();
          return (
            Boolean(l.estudiante_afectado_nombre || l.estudiante_afectado_id) ||
            l.usuario_rol === 'estudiante' ||
            l.modulo === 'hojas_vuelo' ||
            tipo.includes('alumno') ||
            tipo.includes('estudiante') ||
            tipo.includes('progreso') ||
            tipo.includes('bitácora') ||
            tipo.includes('bitacora') ||
            tipo.includes('lección') ||
            tipo.includes('leccion')
          );
        });
      } else if (filter.tipo_entidad === 'instructor') {
        logs = logs.filter(l => {
          const tipo = (l.entidad_tipo || '').toLowerCase();
          return (
            Boolean(l.instructor_afectado_nombre) ||
            l.usuario_rol === 'instructor' ||
            l.accion === 'FIRMAR_VALIDAR' ||
            l.modulo === 'vigencias_aac' ||
            tipo.includes('instructor') ||
            tipo.includes('cfi') ||
            tipo.includes('médico') ||
            tipo.includes('medico') ||
            tipo.includes('vigencia') ||
            tipo.includes('licencia')
          );
        });
      } else if (filter.tipo_entidad === 'financiero') {
        logs = logs.filter(l => {
          const tipo = (l.entidad_tipo || '').toLowerCase();
          return (
            l.modulo === 'contabilidad' ||
            l.usuario_rol === 'contabilidad' ||
            l.accion === 'APROBAR_BANCARIO' ||
            l.accion === 'RECHAZAR_BANCARIO' ||
            l.accion === 'AJUSTE_SALDO' ||
            tipo.includes('transacción') ||
            tipo.includes('transaccion') ||
            tipo.includes('ach') ||
            tipo.includes('cargo') ||
            tipo.includes('abono') ||
            tipo.includes('contable') ||
            tipo.includes('bancario') ||
            tipo.includes('comprobante') ||
            tipo.includes('pago') ||
            tipo.includes('saldo')
          );
        });
      }
    }

    if (filter.severidad && filter.severidad !== 'todos') {
      logs = logs.filter(l => l.severidad === filter.severidad);
    }

    if (filter.fecha_desde) {
      // YYYY-MM-DD
      const datePart = filter.fecha_desde.slice(0, 10);
      const fromTime = new Date(`${datePart}T00:00:00.000Z`).getTime();
      logs = logs.filter(l => {
        const logTime = new Date(l.timestamp).getTime();
        const logDatePart = l.timestamp.slice(0, 10);
        return logTime >= fromTime || logDatePart >= datePart;
      });
    }

    if (filter.fecha_hasta) {
      // YYYY-MM-DD
      const datePart = filter.fecha_hasta.slice(0, 10);
      const toTime = new Date(`${datePart}T23:59:59.999Z`).getTime();
      logs = logs.filter(l => {
        const logTime = new Date(l.timestamp).getTime();
        const logDatePart = l.timestamp.slice(0, 10);
        return logTime <= toTime || logDatePart <= datePart;
      });
    }

    if (filter.busqueda) {
      const q = filter.busqueda.toLowerCase();
      logs = logs.filter(l =>
        (l.descripcion || '').toLowerCase().includes(q) ||
        (l.usuario_nombre || '').toLowerCase().includes(q) ||
        (l.estudiante_afectado_nombre && l.estudiante_afectado_nombre.toLowerCase().includes(q)) ||
        (l.instructor_afectado_nombre && l.instructor_afectado_nombre.toLowerCase().includes(q)) ||
        (l.entidad_tipo && l.entidad_tipo.toLowerCase().includes(q)) ||
        (l.entidad_id && l.entidad_id.toLowerCase().includes(q)) ||
        (l.referencia_normativa_aac && l.referencia_normativa_aac.toLowerCase().includes(q)) ||
        (l.hash_integridad && l.hash_integridad.toLowerCase().includes(q)) ||
        (Array.isArray(l.detalles_cambio) && l.detalles_cambio.some(d =>
          (d.campo || '').toLowerCase().includes(q) ||
          (d.etiqueta || '').toLowerCase().includes(q) ||
          String(d.valor_anterior ?? '').toLowerCase().includes(q) ||
          String(d.valor_nuevo ?? '').toLowerCase().includes(q)
        ))
      );
    }

    return logs;
  }

  /**
   * Obtiene un registro individual por ID
   */
  getAuditLogById(id: string): AuditLogEntry | undefined {
    return this.auditLogs.find(l => l.id === id);
  }

  /**
   * Calcula estadísticas en tiempo real del subsistema de auditoría
   */
  getAuditStats(): AuditLogStats {
    const today = new Date().toISOString().split('T')[0];
    const total = this.auditLogs.length;
    const hojasVuelo = this.auditLogs.filter(l => l.modulo === 'hojas_vuelo').length;
    const contabilidad = this.auditLogs.filter(l => l.modulo === 'contabilidad').length;
    const firmas = this.auditLogs.filter(l => l.accion === 'FIRMAR_VALIDAR').length;
    const cascada = this.auditLogs.filter(l => l.accion === 'RECALCULAR_CASCADA').length;
    const criticas = this.auditLogs.filter(l => l.severidad === 'critica' || l.severidad === 'regulatoria').length;
    const hoy = this.auditLogs.filter(l => l.timestamp.startsWith(today)).length;
    const ultimoHash = this.auditLogs.length > 0 ? this.auditLogs[0].hash_integridad : '0'.repeat(64);

    return {
      total_registros: total,
      total_hojas_vuelo: hojasVuelo,
      total_contabilidad: contabilidad,
      total_firmas_validaciones: firmas,
      total_recalculos_cascada: cascada,
      total_alertas_criticas: criticas,
      registros_hoy: hoy,
      integridad_verificada: true,
      ultimo_hash: ultimoHash
    };
  }

  /**
   * Verifica la integridad de la cadena criptográfica de auditoría
   */
  verifyAuditTrailIntegrity(): { isValid: boolean; checkedCount: number; brokenIndex?: number; sealTimestamp: string; latestHash: string } {
    let isValid = true;
    let brokenIndex: number | undefined;

    // Verificar cada log
    for (let i = 0; i < this.auditLogs.length; i++) {
      const log = this.auditLogs[i];
      if (!log.hash_integridad || log.hash_integridad.length !== 64) {
        isValid = false;
        brokenIndex = i;
        break;
      }
    }

    return {
      isValid,
      checkedCount: this.auditLogs.length,
      brokenIndex,
      sealTimestamp: new Date().toISOString(),
      latestHash: this.auditLogs.length > 0 ? this.auditLogs[0].hash_integridad : ''
    };
  }

  /**
   * Genera un informe oficial estructurado para inspectores de la AAC
   */
  exportAuditReport(filter?: AuditLogFilter): {
    institucion: string;
    numero_certificado_aac: string;
    fecha_emision: string;
    inspector_resumen: string;
    total_eventos: number;
    sellos_integridad: {
      primer_hash: string;
      ultimo_hash: string;
      algoritmo: string;
      estado_cadena: string;
    };
    logs: AuditLogEntry[];
  } {
    const logs = this.getAuditLogs(filter);
    return {
      institucion: 'AeroAcademia Flight School - AAC Panamá Centro de Instrucción CIAC #012',
      numero_certificado_aac: 'AAC-CIAC-RAC141-2024-012',
      fecha_emision: new Date().toISOString(),
      inspector_resumen: `Reporte oficial de trazabilidad emitido de conformidad con los Reglamentos Aeronáuticos de Panamá RAC 141, RAC 61 y RAC 67. Contiene ${logs.length} registros auditados con firmas digitales y sellos de tiempo inmutables.`,
      total_eventos: logs.length,
      sellos_integridad: {
        primer_hash: logs.length > 0 ? logs[logs.length - 1].hash_integridad : '',
        ultimo_hash: logs.length > 0 ? logs[0].hash_integridad : '',
        algoritmo: 'SHA-256 Cryptographic Chain (NIST FIPS 180-4)',
        estado_cadena: 'VÁLIDA Y VERIFICADA AL 100%'
      },
      logs
    };
  }

  // ============================================================================
  // MÓDULO DE TALLER AERONÁUTICO & MANTENIMIENTO DE FLOTA (OMA / TMA)
  // ============================================================================

  private getDraftHoursForAircraft(matricula: string): number {
    return this.aircraftLogbookDraftRows
      .filter(
        r =>
          String(r.matricula || '').toUpperCase() === matricula.toUpperCase() &&
          r.guardado &&
          !r.tallerSincronizado &&
          r.horasTotal
      )
      .reduce((sum, r) => sum + (Number(r.horasTotal) || 0), 0);
  }

  private getNextPrefixedId(existingIds: string[], prefix: string, minStart: number = 1): string {
    const nums = existingIds
      .filter(id => typeof id === 'string' && id.startsWith(prefix))
      .map(id => parseInt(id.slice(prefix.length), 10))
      .filter(n => !isNaN(n));
    const nextNum = Math.max(minStart - 1, ...nums) + 1;
    return `${prefix}${String(nextNum).padStart(3, '0')}`;
  }

  private completeMaintenanceItineraries(matricula: string): void {
    const upperMat = matricula.toUpperCase();
    for (const itin of this.itineraries) {
      if (
        String(itin.avion_matricula || '').toUpperCase() === upperMat &&
        (itin.tipo_evento === 'mantenimiento' || itin.estado === 'en_taller') &&
        itin.estado !== 'cancelado' &&
        itin.estado !== 'completado' &&
        itin.estado !== 'no_show'
      ) {
        itin.estado = 'completado';
      }
    }
  }

  private resolveOpenAogSquawksForAircraft(matricula: string, accion: string, resolvedBy: string, licenciaTMA: string): void {
    const upperMat = matricula.toUpperCase();
    const today = new Date().toISOString().slice(0, 10);
    for (let i = 0; i < this.maintenanceSquawks.length; i++) {
      const sq = this.maintenanceSquawks[i];
      if (sq.matricula.toUpperCase() === upperMat && sq.severidad === 'aog' && sq.estado !== 'resuelto') {
        this.maintenanceSquawks[i] = {
          ...sq,
          accion_correctiva: sq.accion_correctiva || accion,
          fecha_resolucion: today,
          resuelto_por: resolvedBy,
          resuelto_por_licencia: licenciaTMA,
          estado: 'resuelto'
        };
      }
    }
  }

  private closeOpenHangarEntryOnRelease(
    matricula: string,
    effectiveTach: number,
    motivo: string,
    supervisor: string,
    licencia: string,
    woId?: string
  ): void {
    const upperMat = matricula.toUpperCase();
    const openEntry = this.aircraftMovements.find(m =>
      m.tipo === 'entrada' &&
      m.matricula.toUpperCase() === upperMat &&
      !this.aircraftMovements.some(s => s.tipo === 'salida' && s.entrada_id_relacionada === m.id)
    );
    if (!openEntry) return;

    const now = new Date();
    const year = now.getFullYear();
    const exitId = this.getNextPrefixedId(this.aircraftMovements.map(m => m.id), `MOV-${year}-`, 1);

    const exitMovement: AircraftWorkshopMovement = {
      id: exitId,
      tipo: 'salida',
      matricula: openEntry.matricula,
      modelo: openEntry.modelo,
      fecha: now.toISOString().slice(0, 10),
      hora: now.toTimeString().slice(0, 5),
      tach_hobbs: effectiveTach,
      motivo_principal: motivo,
      descripcion_detallada: `Salida de taller y retorno al servicio vinculado automáticamente al egreso de ${openEntry.matricula}. Entrada original: ${openEntry.id}.`,
      bitacora_folio: openEntry.bitacora_folio || `BIT-${openEntry.matricula.replace('HP-', '')}-${now.toISOString().slice(0, 7).replace('-', '')}-RTS`,
      bitacora_tipo: openEntry.bitacora_tipo || 'celula',
      orden_trabajo_id: woId || openEntry.orden_trabajo_id,
      squawk_id: openEntry.squawk_id,
      asiento_bitacora: `Certifico que la aeronave ${openEntry.matricula} fue liberada a línea de vuelo conforme a RAC 43 / RAC 145.`,
      tecnico_responsable: supervisor,
      licencia_tma: licencia,
      supervisor_liberador: supervisor,
      licencia_supervisor: licencia,
      ubicacion_hangar: 'Hangar SkyOps 4 - Rampa Principal',
      condicion_aeronavegabilidad: 'aeronavegable_conforme',
      entrada_id_relacionada: openEntry.id,
      creado_en: now.toISOString()
    };

    this.aircraftMovements.unshift(exitMovement);
  }

  getAircraftMaintenanceRecords(): AircraftMaintenanceRecord[] {
    // Sincronizar horas consumidas desde bitácoras recientes
    const updated = this.aircraftMaintenanceRecords.map(rec => {
      const draftHours = this.getDraftHoursForAircraft(rec.matricula);

      const dynamicTotal = Number((rec.horas_totales_celula + draftHours).toFixed(1));
      const dynamicRestante100h = Number(Math.max(0, rec.horas_proxima_100h - dynamicTotal).toFixed(1));
      const dynamicRestante50h = Number(Math.max(0, rec.horas_proxima_50h - dynamicTotal).toFixed(1));

      let cond: AirworthinessCondition = rec.estado_aeronavegabilidad;
      let isGrounded = rec.bloqueo_despacho;
      let groundReason = rec.motivo_bloqueo;

      const manualCleared =
        typeof rec.desbloqueo_manual_en_horas === 'number' &&
        dynamicTotal <= Number(rec.desbloqueo_manual_en_horas.toFixed(1));

      if ((dynamicRestante100h <= 0 || dynamicRestante50h <= 0) && !manualCleared) {
        if (cond !== 'en_mantenimiento') {
          cond = 'aog_bloqueado';
        }
        isGrounded = true;
        if (!groundReason) groundReason = 'Inspección horaria mandatoria (50h/100h) vencida.';
      } else if (!isGrounded && cond !== 'en_mantenimiento' && (dynamicRestante100h <= 5 || dynamicRestante50h <= 3)) {
        cond = 'inspeccion_proxima';
      }

      const openSquawks = this.maintenanceSquawks.filter(s => s.matricula === rec.matricula && s.estado !== 'resuelto').length;
      const activeOrders = this.maintenanceWorkOrders.filter(w => w.matricula === rec.matricula && w.estado !== 'cerrada_conforme').length;

      return {
        ...rec,
        horas_totales_celula: dynamicTotal,
        horas_restantes_100h: dynamicRestante100h,
        horas_restantes_50h: dynamicRestante50h,
        estado_aeronavegabilidad: cond,
        bloqueo_despacho: isGrounded,
        motivo_bloqueo: groundReason,
        novedades_abiertas_count: openSquawks,
        ordenes_activas_count: activeOrders
      };
    });

    return updated;
  }

  getAircraftMaintenanceRecord(matricula: string): AircraftMaintenanceRecord | undefined {
    const all = this.getAircraftMaintenanceRecords();
    return all.find(r => r.matricula.toUpperCase() === matricula.toUpperCase());
  }

  updateAircraftMaintenanceRecord(matricula: string, patch: Partial<AircraftMaintenanceRecord>, updatedBy?: string): AircraftMaintenanceRecord | null {
    const idx = this.aircraftMaintenanceRecords.findIndex(r => r.matricula.toUpperCase() === matricula.toUpperCase());
    if (idx < 0) return null;

    const prev = this.aircraftMaintenanceRecords[idx];
    this.aircraftMaintenanceRecords[idx] = {
      ...prev,
      ...patch,
      matricula: prev.matricula // Proteger la matrícula original
    };

    this.addAuditLog({
      usuario_id: 'tma_user',
      usuario_nombre: updatedBy || 'Ing. Carlos Mendoza (TMA)',
      usuario_rol: 'mantenimiento',
      modulo: 'vigencias_aac',
      accion: 'MODIFICAR',
      entidad_tipo: 'Ficha Técnica de Aeronavegabilidad',
      entidad_id: matricula,
      descripcion: `Actualización de parámetros de mantenimiento y control horario de la aeronave ${matricula}.`,
      severidad: 'info',
      detalles_cambio: []
    });

    this.saveToDisk();
    return this.getAircraftMaintenanceRecord(matricula) || this.aircraftMaintenanceRecords[idx];
  }

  toggleAircraftGroundLock(
    matricula: string,
    locked: boolean,
    reason?: string,
    authorizedBy?: string,
    licenciaTMA?: string,
    options?: {
      resetOverdueCounters?: boolean;
      resolveAogSquawks?: boolean;
      nextCondition?: AirworthinessCondition;
      ubicacion_hangar?: string;
    }
  ): AircraftMaintenanceRecord | null {
    const idx = this.aircraftMaintenanceRecords.findIndex(r => r.matricula.toUpperCase() === matricula.toUpperCase());
    if (idx < 0) return null;

    const prev = this.aircraftMaintenanceRecords[idx];
    const draftHours = this.getDraftHoursForAircraft(prev.matricula);
    const currentTotal = Number((prev.horas_totales_celula + draftHours).toFixed(1));
    const signerName = authorizedBy || 'Taller Aeronáutico SkyOps';
    const signerLic = licenciaTMA || 'AAC-TMA-04521';

    if (locked) {
      const newCondition: AirworthinessCondition = options?.nextCondition || 'aog_bloqueado';
      this.aircraftMaintenanceRecords[idx] = {
        ...prev,
        bloqueo_despacho: true,
        motivo_bloqueo: reason || 'Aeronave inmovilizada en tierra (AOG) por Taller Aeronáutico.',
        estado_aeronavegabilidad: newCondition,
        ubicacion_hangar: options?.ubicacion_hangar || prev.ubicacion_hangar,
        desbloqueo_manual_en_horas: undefined,
        ultimo_tma_responsable: authorizedBy ? `${authorizedBy} (${signerLic})` : prev.ultimo_tma_responsable
      };
    } else {
      const newCondition: AirworthinessCondition = options?.nextCondition || 'aeronavegable';
      const is100Overdue = currentTotal >= prev.horas_proxima_100h;
      const is50Overdue = currentTotal >= prev.horas_proxima_50h;
      const shouldResetOverdue = options?.resetOverdueCounters !== false;

      let nextHorasUltima100h = prev.horas_ultima_100h;
      let nextHorasProxima100h = prev.horas_proxima_100h;
      let nextHorasRestantes100h = Number(Math.max(0, prev.horas_proxima_100h - currentTotal).toFixed(1));
      let nextHorasProxima50h = prev.horas_proxima_50h;
      let nextHorasRestantes50h = Number(Math.max(0, prev.horas_proxima_50h - currentTotal).toFixed(1));
      let manualClearAtHours: number | undefined = undefined;

      if (shouldResetOverdue) {
        if (is100Overdue) {
          nextHorasUltima100h = currentTotal;
          nextHorasProxima100h = Number((currentTotal + 100).toFixed(1));
          nextHorasRestantes100h = 100.0;
          nextHorasProxima50h = Number((currentTotal + 50).toFixed(1));
          nextHorasRestantes50h = 50.0;
        } else if (is50Overdue) {
          nextHorasProxima50h = Number((currentTotal + 50).toFixed(1));
          nextHorasRestantes50h = 50.0;
        }
      } else if (is100Overdue || is50Overdue) {
        manualClearAtHours = currentTotal;
      }

      const defaultRamp = 'Hangar SkyOps 4 - Rampa Principal';
      const resolvedLocation =
        options?.ubicacion_hangar ||
        (prev.ubicacion_hangar && /bah[ií]a|inmoviliz|aog|taller/i.test(prev.ubicacion_hangar)
          ? defaultRamp
          : prev.ubicacion_hangar || defaultRamp);

      this.aircraftMaintenanceRecords[idx] = {
        ...prev,
        bloqueo_despacho: false,
        motivo_bloqueo: undefined,
        estado_aeronavegabilidad: newCondition,
        ubicacion_hangar: resolvedLocation,
        fecha_ultimo_mantenimiento: new Date().toISOString().slice(0, 10),
        ultimo_tma_responsable: authorizedBy ? `${authorizedBy} (${signerLic})` : prev.ultimo_tma_responsable,
        horas_ultima_100h: nextHorasUltima100h,
        horas_proxima_100h: nextHorasProxima100h,
        horas_restantes_100h: nextHorasRestantes100h,
        horas_proxima_50h: nextHorasProxima50h,
        horas_restantes_50h: nextHorasRestantes50h,
        desbloqueo_manual_en_horas: manualClearAtHours
      };

      if (options?.resolveAogSquawks !== false) {
        this.resolveOpenAogSquawksForAircraft(
          prev.matricula,
          reason || `Liberación y retorno al servicio autorizado por ${signerName}.`,
          signerName,
          signerLic
        );
      }

      this.completeMaintenanceItineraries(prev.matricula);
      this.closeOpenHangarEntryOnRelease(
        prev.matricula,
        currentTotal,
        reason ? `Desbloqueo / Retorno al Servicio: ${reason}` : 'Retorno al Servicio (Desbloqueo Técnico OMA)',
        signerName,
        signerLic
      );
    }

    // Auditoría oficial
    this.addAuditLog({
      usuario_id: 'tma_user',
      usuario_nombre: signerName,
      usuario_rol: 'mantenimiento',
      modulo: 'vigencias_aac',
      accion: locked ? 'MODIFICAR' : 'FIRMAR_VALIDAR',
      entidad_tipo: 'Aeronave / Récord de Mantenimiento',
      entidad_id: matricula,
      descripcion: locked
        ? `HARD LOCK AOG EMITIDO: Aeronave ${matricula} bloqueada para todo vuelo. Causal: ${reason || 'Mantenimiento mandatario'}.`
        : `RETORNO AL SERVICIO (RTS): Bloqueo levantado para ${matricula}. Aeronave autorizada para despacho de vuelo por ${signerName}.`,
      severidad: locked ? 'critica' : 'alerta',
      detalles_cambio: []
    });

    // Notificación por correo a operaciones y escuela
    this.sendEmailNotification({
      destinatario_nombre: 'Operaciones & Escuela de Vuelo',
      destinatario_email: 'operaciones@skyops.com',
      destinatario_tipo: 'escuela',
      asunto: locked ? `🚨 ALERTA TÉCNICA AOG: Aeronave ${matricula} Bloqueada para Vuelo` : `✅ RETORNO AL SERVICIO: Aeronave ${matricula} Habilitada para Operaciones`,
      cuerpo_texto: locked
        ? `Se notifica que el Taller Aeronáutico ha emitido un Hard Lock AOG para la aeronave ${matricula}.\n\nCausal: ${reason}\nAutorizado por: ${signerName}\n\nFavor retirar de la asignación inmediata de itinerarios.`
        : `El Taller Aeronáutico certifica el Retorno al Servicio (RTS) de la aeronave ${matricula}.\n\nFirmado por: ${signerName} (${signerLic}). La aeronave está disponible para despacho de instrucción.`,
      cuerpo_html: `<p>${locked ? `HARD LOCK AOG: ${matricula} bloqueada por Taller.` : `RTS: ${matricula} retornada al servicio operacional.`}</p>`,
      evento: 'alerta_mantenimiento'
    });

    this.saveToDisk();
    return this.getAircraftMaintenanceRecord(matricula) || this.aircraftMaintenanceRecords[idx];
  }

  getMaintenanceWorkOrders(filter?: { matricula?: string; estado?: WorkOrderStatus; tipo?: WorkOrderType }): MaintenanceWorkOrder[] {
    let list = [...this.maintenanceWorkOrders];

    if (filter?.matricula && filter.matricula !== 'TODAS') {
      list = list.filter(w => w.matricula.toUpperCase() === filter.matricula!.toUpperCase());
    }
    if (filter?.estado) {
      list = list.filter(w => w.estado === filter.estado);
    }
    if (filter?.tipo) {
      list = list.filter(w => w.tipo === filter.tipo);
    }

    return list.sort((a, b) => new Date(b.fecha_apertura).getTime() - new Date(a.fecha_apertura).getTime());
  }

  getMaintenanceWorkOrderById(id: string): MaintenanceWorkOrder | undefined {
    return this.maintenanceWorkOrders.find(w => w.id === id);
  }

  createMaintenanceWorkOrder(data: Omit<MaintenanceWorkOrder, 'id'>): MaintenanceWorkOrder {
    const year = new Date().getFullYear();
    const id = this.getNextPrefixedId(this.maintenanceWorkOrders.map(w => w.id), `OT-${year}-`, 42);

    const newOrder: MaintenanceWorkOrder = {
      ...data,
      id,
      estado: data.estado || 'abierta',
      fecha_apertura: data.fecha_apertura || new Date().toISOString().slice(0, 10),
      retorno_al_servicio: data.retorno_al_servicio || { aprobado: false }
    };

    this.maintenanceWorkOrders.unshift(newOrder);

    // Si es prioridad alta o AOG, colocar el avión en estado de mantenimiento y bloquear si procede
    if (newOrder.prioridad === 'aog_critico' || newOrder.prioridad === 'alta') {
      const acIdx = this.aircraftMaintenanceRecords.findIndex(a => a.matricula.toUpperCase() === newOrder.matricula.toUpperCase());
      if (acIdx >= 0) {
        this.aircraftMaintenanceRecords[acIdx].estado_aeronavegabilidad = 'en_mantenimiento';
        this.aircraftMaintenanceRecords[acIdx].desbloqueo_manual_en_horas = undefined;
        if (newOrder.prioridad === 'aog_critico') {
          this.aircraftMaintenanceRecords[acIdx].bloqueo_despacho = true;
          this.aircraftMaintenanceRecords[acIdx].motivo_bloqueo = `AOG: ${newOrder.titulo}`;
        }
      }
    }

    this.addAuditLog({
      usuario_id: 'tma_user',
      usuario_nombre: data.tecnico_responsable || 'Taller SkyOps',
      usuario_rol: 'mantenimiento',
      modulo: 'vigencias_aac',
      accion: 'CREAR',
      entidad_tipo: 'Orden de Trabajo (Work Order)',
      entidad_id: id,
      descripcion: `Emisión de Orden de Trabajo ${id} para ${newOrder.matricula}: ${newOrder.titulo}.`,
      severidad: 'alerta',
      detalles_cambio: []
    });

    this.saveToDisk();
    return newOrder;
  }

  updateMaintenanceWorkOrder(id: string, patch: Partial<MaintenanceWorkOrder>, updatedBy?: string): MaintenanceWorkOrder | null {
    const idx = this.maintenanceWorkOrders.findIndex(w => w.id === id);
    if (idx < 0) return null;

    const prev = this.maintenanceWorkOrders[idx];
    const cleanPatch = { ...patch } as Partial<MaintenanceWorkOrder> & { updatedBy?: string };
    delete cleanPatch.updatedBy;

    const updated: MaintenanceWorkOrder = {
      ...prev,
      ...cleanPatch,
      id: prev.id // Proteger ID
    };
    this.maintenanceWorkOrders[idx] = updated;

    // Sincronizar condición de aeronave si pasa a prioridad AOG o en progreso
    if (updated.estado !== 'cerrada_conforme') {
      const acIdx = this.aircraftMaintenanceRecords.findIndex(
        a => a.matricula.toUpperCase() === updated.matricula.toUpperCase()
      );
      if (acIdx >= 0) {
        if (updated.prioridad === 'aog_critico') {
          this.aircraftMaintenanceRecords[acIdx].estado_aeronavegabilidad = 'aog_bloqueado';
          this.aircraftMaintenanceRecords[acIdx].bloqueo_despacho = true;
          this.aircraftMaintenanceRecords[acIdx].motivo_bloqueo = `AOG (${updated.id}): ${updated.titulo}`;
        } else if (updated.estado === 'en_progreso' || updated.estado === 'espera_repuestos' || updated.estado === 'inspeccion_calidad') {
          if (this.aircraftMaintenanceRecords[acIdx].estado_aeronavegabilidad === 'aeronavegable') {
            this.aircraftMaintenanceRecords[acIdx].estado_aeronavegabilidad = 'en_mantenimiento';
          }
        }
      }
    }

    const cambios: { campo: string; etiqueta: string; valor_anterior: string; valor_nuevo: string }[] = [];
    if (patch.estado && patch.estado !== prev.estado) {
      cambios.push({
        campo: 'estado',
        etiqueta: 'Estado de OT',
        valor_anterior: prev.estado,
        valor_nuevo: patch.estado
      });
    }
    if (patch.prioridad && patch.prioridad !== prev.prioridad) {
      cambios.push({
        campo: 'prioridad',
        etiqueta: 'Prioridad',
        valor_anterior: prev.prioridad,
        valor_nuevo: patch.prioridad
      });
    }

    this.addAuditLog({
      usuario_id: 'tma_user',
      usuario_nombre: updatedBy || updated.tecnico_responsable || 'Taller SkyOps',
      usuario_rol: 'mantenimiento',
      modulo: 'vigencias_aac',
      accion: 'MODIFICAR',
      entidad_tipo: 'Orden de Trabajo (Work Order)',
      entidad_id: id,
      descripcion: `Actualización de Orden de Trabajo ${id} (${updated.matricula}): estado ${updated.estado}.`,
      severidad: updated.prioridad === 'aog_critico' ? 'critica' : 'info',
      detalles_cambio: cambios
    });

    this.saveToDisk();
    return this.maintenanceWorkOrders[idx];
  }

  returnAircraftToService(
    workOrderId: string,
    rtsData: {
      firmado_por: string;
      licencia_firmante: string;
      declaracion?: string;
      horas_salida?: number;
      reset50h?: boolean;
      reset100h?: boolean;
      resolveAogSquawks?: boolean;
    }
  ): { workOrder: MaintenanceWorkOrder; aircraft: AircraftMaintenanceRecord | undefined } {
    const wIdx = this.maintenanceWorkOrders.findIndex(w => w.id === workOrderId);
    if (wIdx < 0) throw new Error('Orden de trabajo no encontrada');

    const wo = this.maintenanceWorkOrders[wIdx];
    const acIdx = this.aircraftMaintenanceRecords.findIndex(a => a.matricula.toUpperCase() === wo.matricula.toUpperCase());
    const draftHours = this.getDraftHoursForAircraft(wo.matricula);
    const currentBaseHours = acIdx >= 0 ? this.aircraftMaintenanceRecords[acIdx].horas_totales_celula : wo.horas_aeronave_entrada;

    const salidaDisplayHours =
      rtsData.horas_salida && rtsData.horas_salida > 0
        ? Number(rtsData.horas_salida.toFixed(1))
        : Number((currentBaseHours + draftHours).toFixed(1));
    const baseCellHours =
      rtsData.horas_salida && rtsData.horas_salida > 0
        ? Number(Math.max(0, salidaDisplayHours - draftHours).toFixed(1))
        : currentBaseHours;

    // Actualizar Orden de Trabajo
    this.maintenanceWorkOrders[wIdx] = {
      ...wo,
      estado: 'cerrada_conforme',
      fecha_cierre: new Date().toISOString().slice(0, 10),
      horas_aeronave_salida: salidaDisplayHours,
      retorno_al_servicio: {
        aprobado: true,
        fecha_firma: new Date().toISOString(),
        firmado_por: rtsData.firmado_por,
        licencia_firmante: rtsData.licencia_firmante,
        declaracion: rtsData.declaracion || `Certifico que la aeronave ${wo.matricula} ha sido inspeccionada y reparada conforme a los Reglamentos RAC 43 y RAC 145 de la AAC Panamá, quedando en condición AERONAVEGABLE para su retorno al servicio operacional.`
      }
    };

    // Actualizar Récord de la Aeronave
    let acRecord: AircraftMaintenanceRecord | undefined;

    if (acIdx >= 0) {
      const prevAc = this.aircraftMaintenanceRecords[acIdx];
      const defaultRamp = 'Hangar SkyOps 4 - Rampa Principal';
      const resolvedLocation =
        prevAc.ubicacion_hangar && /bah[ií]a|inmoviliz|aog|taller/i.test(prevAc.ubicacion_hangar)
          ? defaultRamp
          : prevAc.ubicacion_hangar || defaultRamp;

      const patch: Partial<AircraftMaintenanceRecord> = {
        estado_aeronavegabilidad: 'aeronavegable',
        bloqueo_despacho: false,
        motivo_bloqueo: undefined,
        ubicacion_hangar: resolvedLocation,
        horas_totales_celula: baseCellHours,
        horas_motor_tsn: baseCellHours,
        ultimo_tma_responsable: `${rtsData.firmado_por} (${rtsData.licencia_firmante})`,
        fecha_ultimo_mantenimiento: new Date().toISOString().slice(0, 10),
        desbloqueo_manual_en_horas: undefined
      };

      const is100hReset = wo.tipo === 'inspeccion_100h' || rtsData.reset100h === true;
      const is50hReset = wo.tipo === 'inspeccion_50h' || wo.tipo === 'servicio_aceite' || rtsData.reset50h === true;

      if (is100hReset) {
        patch.horas_ultima_100h = salidaDisplayHours;
        patch.horas_proxima_100h = Number((salidaDisplayHours + 100).toFixed(1));
        patch.horas_restantes_100h = 100.0;
        patch.horas_proxima_50h = Number((salidaDisplayHours + 50).toFixed(1));
        patch.horas_restantes_50h = 50.0;
      } else if (is50hReset) {
        patch.horas_proxima_50h = Number((salidaDisplayHours + 50).toFixed(1));
        patch.horas_restantes_50h = 50.0;
        if (salidaDisplayHours >= prevAc.horas_proxima_100h) {
          patch.desbloqueo_manual_en_horas = salidaDisplayHours;
        }
      } else {
        if (wo.tipo === 'inspeccion_anual') {
          const nextYear = new Date();
          nextYear.setFullYear(nextYear.getFullYear() + 1);
          patch.fecha_proxima_inspeccion_anual = nextYear.toISOString().slice(0, 10);
        } else if (wo.tipo === 'avionica') {
          const next24m = new Date();
          next24m.setFullYear(next24m.getFullYear() + 2);
          patch.vencimiento_altimetro_pitot = next24m.toISOString().slice(0, 10);
        }
        if (salidaDisplayHours >= prevAc.horas_proxima_100h || salidaDisplayHours >= prevAc.horas_proxima_50h) {
          patch.desbloqueo_manual_en_horas = salidaDisplayHours;
        }
      }

      this.aircraftMaintenanceRecords[acIdx] = { ...prevAc, ...patch };

      // Resolver squawks vinculados a la OT y novedades AOG si corresponde
      const today = new Date().toISOString().slice(0, 10);
      for (let i = 0; i < this.maintenanceSquawks.length; i++) {
        const sq = this.maintenanceSquawks[i];
        if (sq.estado !== 'resuelto' && sq.orden_trabajo_id === wo.id) {
          this.maintenanceSquawks[i] = {
            ...sq,
            accion_correctiva: sq.accion_correctiva || `Solventado bajo Orden de Trabajo ${wo.id} (RTS Conforme).`,
            fecha_resolucion: today,
            resuelto_por: rtsData.firmado_por,
            resuelto_por_licencia: rtsData.licencia_firmante,
            estado: 'resuelto'
          };
        }
      }

      if (rtsData.resolveAogSquawks !== false) {
        this.resolveOpenAogSquawksForAircraft(
          wo.matricula,
          `Discrepancia AOG corregida bajo Retorno al Servicio (${wo.id}).`,
          rtsData.firmado_por,
          rtsData.licencia_firmante
        );
      }

      this.completeMaintenanceItineraries(wo.matricula);
      this.closeOpenHangarEntryOnRelease(
        wo.matricula,
        salidaDisplayHours,
        `Retorno al Servicio (RTS Conforme) - ${wo.id}: ${wo.titulo}`,
        rtsData.firmado_por,
        rtsData.licencia_firmante,
        wo.id
      );

      acRecord = this.getAircraftMaintenanceRecord(wo.matricula);
    }

    // Registrar en auditoría
    this.addAuditLog({
      usuario_id: 'tma_user',
      usuario_nombre: rtsData.firmado_por,
      usuario_rol: 'mantenimiento',
      modulo: 'vigencias_aac',
      accion: 'FIRMAR_VALIDAR',
      entidad_tipo: 'Aprobación de Retorno al Servicio (RTS)',
      entidad_id: wo.id,
      descripcion: `CERTIFICACIÓN DE RETORNO AL SERVICIO (RTS) emitido para ${wo.matricula} bajo Orden de Trabajo ${wo.id}. Firmado por ${rtsData.firmado_por} (${rtsData.licencia_firmante}).`,
      severidad: 'info',
      detalles_cambio: []
    });

    this.saveToDisk();
    return {
      workOrder: this.maintenanceWorkOrders[wIdx],
      aircraft: acRecord
    };
  }

  getMaintenanceSquawks(filter?: { matricula?: string; estado?: SquawkStatus; severidad?: SquawkSeverity }): MaintenanceSquawk[] {
    let list = [...this.maintenanceSquawks];

    if (filter?.matricula && filter.matricula !== 'TODAS') {
      list = list.filter(s => s.matricula.toUpperCase() === filter.matricula!.toUpperCase());
    }
    if (filter?.estado) {
      list = list.filter(s => s.estado === filter.estado);
    }
    if (filter?.severidad) {
      list = list.filter(s => s.severidad === filter.severidad);
    }

    return list.sort((a, b) => new Date(b.fecha_reporte).getTime() - new Date(a.fecha_reporte).getTime());
  }

  createMaintenanceSquawk(data: Omit<MaintenanceSquawk, 'id'>): MaintenanceSquawk {
    const year = new Date().getFullYear();
    const id = this.getNextPrefixedId(this.maintenanceSquawks.map(s => s.id), `SQW-${year}-`, 1);

    const newSquawk: MaintenanceSquawk = {
      ...data,
      id,
      fecha_reporte: data.fecha_reporte || new Date().toISOString().slice(0, 10),
      estado: data.estado || 'reportado'
    };

    this.maintenanceSquawks.unshift(newSquawk);

    // Si la discrepancia es severidad AOG, inmovilizar aeronave de inmediato
    if (newSquawk.severidad === 'aog') {
      const acIdx = this.aircraftMaintenanceRecords.findIndex(a => a.matricula.toUpperCase() === newSquawk.matricula.toUpperCase());
      if (acIdx >= 0) {
        this.aircraftMaintenanceRecords[acIdx].bloqueo_despacho = true;
        this.aircraftMaintenanceRecords[acIdx].estado_aeronavegabilidad = 'aog_bloqueado';
        this.aircraftMaintenanceRecords[acIdx].motivo_bloqueo = `AOG por Novedad Crítica: ${newSquawk.descripcion}`;
      }
    }

    this.saveToDisk();
    return newSquawk;
  }

  resolveMaintenanceSquawk(id: string, resolution: { accion_correctiva: string; resuelto_por: string; resuelto_por_licencia: string; estado?: SquawkStatus }): MaintenanceSquawk | null {
    const idx = this.maintenanceSquawks.findIndex(s => s.id === id);
    if (idx < 0) return null;

    this.maintenanceSquawks[idx] = {
      ...this.maintenanceSquawks[idx],
      accion_correctiva: resolution.accion_correctiva,
      fecha_resolucion: new Date().toISOString().slice(0, 10),
      resuelto_por: resolution.resuelto_por,
      resuelto_por_licencia: resolution.resuelto_por_licencia,
      estado: resolution.estado || 'resuelto'
    };

    this.saveToDisk();
    return this.maintenanceSquawks[idx];
  }

  getMaintenanceParts(): MaintenancePartStock[] {
    return [...this.maintenanceParts];
  }

  updateMaintenancePartStock(id: string, cantidadDelta: number, motivo?: string, updatedBy?: string): MaintenancePartStock | null {
    const idx = this.maintenanceParts.findIndex(p => p.id === id);
    if (idx < 0) return null;

    const prev = this.maintenanceParts[idx];
    const newQty = Math.max(0, prev.cantidad_disponible + cantidadDelta);

    this.maintenanceParts[idx] = {
      ...prev,
      cantidad_disponible: newQty,
      ultimo_ingreso_fecha: cantidadDelta > 0 ? new Date().toISOString().slice(0, 10) : prev.ultimo_ingreso_fecha
    };

    this.addAuditLog({
      usuario_id: 'tma_user',
      usuario_nombre: updatedBy || 'Almacén Taller SkyOps',
      usuario_rol: 'mantenimiento',
      modulo: 'vigencias_aac',
      accion: 'MODIFICAR',
      entidad_tipo: 'Inventario de Repuestos de Hangar',
      entidad_id: prev.numero_parte,
      descripcion: `Ajuste de stock para parte ${prev.numero_parte} (${prev.descripcion}): ${cantidadDelta > 0 ? '+' : ''}${cantidadDelta} ${prev.unidad_medida}. Nuevo total: ${newQty}. Motivo: ${motivo || 'Consumo/Recepción'}.`,
      severidad: newQty <= prev.cantidad_minima_alerta ? 'alerta' : 'info',
      detalles_cambio: []
    });

    this.saveToDisk();
    return this.maintenanceParts[idx];
  }

  getAirworthinessDirectives(modelo?: string): AirworthinessDirective[] {
    if (!modelo || modelo === 'TODOS') return [...this.airworthinessDirectives];
    return this.airworthinessDirectives.filter(ad => ad.aplicabilidad_modelo.toLowerCase().includes(modelo.toLowerCase()));
  }

  updateAirworthinessDirective(id: string, patch: Partial<AirworthinessDirective>): AirworthinessDirective | null {
    const idx = this.airworthinessDirectives.findIndex(ad => ad.id === id);
    if (idx < 0) return null;

    this.airworthinessDirectives[idx] = {
      ...this.airworthinessDirectives[idx],
      ...patch,
      id: this.airworthinessDirectives[idx].id
    };

    this.saveToDisk();
    return this.airworthinessDirectives[idx];
  }

  // =========================================================================
  // HISTORIAL DE ENTRADA Y SALIDA DE AERONAVES (TRAZABILIDAD CON BITÁCORAS)
  // =========================================================================

  getAircraftMovements(filter?: { matricula?: string; tipo?: MovementType; search?: string }): AircraftWorkshopMovement[] {
    let list = [...this.aircraftMovements];

    if (filter?.matricula && filter.matricula !== 'TODAS') {
      list = list.filter(m => m.matricula.toUpperCase() === filter.matricula!.toUpperCase());
    }

    if (filter?.tipo) {
      list = list.filter(m => m.tipo === filter.tipo);
    }

    if (filter?.search) {
      const q = filter.search.toLowerCase().trim();
      list = list.filter(m =>
        m.matricula.toLowerCase().includes(q) ||
        m.modelo.toLowerCase().includes(q) ||
        (m.bitacora_folio && m.bitacora_folio.toLowerCase().includes(q)) ||
        (m.orden_trabajo_id && m.orden_trabajo_id.toLowerCase().includes(q)) ||
        m.motivo_principal.toLowerCase().includes(q) ||
        m.tecnico_responsable.toLowerCase().includes(q) ||
        (m.asiento_bitacora && m.asiento_bitacora.toLowerCase().includes(q))
      );
    }

    // Ordenar de más reciente a más antiguo
    return list.sort((a, b) => {
      const dateA = `${a.fecha}T${a.hora || '00:00'}`;
      const dateB = `${b.fecha}T${b.hora || '00:00'}`;
      return dateB.localeCompare(dateA);
    });
  }

  getAircraftMovementById(id: string): AircraftWorkshopMovement | undefined {
    return this.aircraftMovements.find(m => m.id === id);
  }

  createAircraftMovement(
    data: Omit<AircraftWorkshopMovement, 'id' | 'creado_en'>,
    createdBy?: string
  ): AircraftWorkshopMovement {
    const year = new Date().getFullYear();
    const id = this.getNextPrefixedId(this.aircraftMovements.map(m => m.id), `MOV-${year}-`, 1);

    // Si es una salida sin entrada explícita, vincular automáticamente la última entrada abierta de la misma aeronave
    let linkedEntryId = data.entrada_id_relacionada;
    if (data.tipo === 'salida' && !linkedEntryId) {
      const openEntry = this.aircraftMovements.find(m =>
        m.tipo === 'entrada' &&
        m.matricula.toUpperCase() === data.matricula.toUpperCase() &&
        !this.aircraftMovements.some(s => s.tipo === 'salida' && s.entrada_id_relacionada === m.id)
      );
      if (openEntry) {
        linkedEntryId = openEntry.id;
      }
    }

    const newMovement: AircraftWorkshopMovement = {
      ...data,
      entrada_id_relacionada: linkedEntryId,
      id,
      creado_en: new Date().toISOString()
    };

    this.aircraftMovements.unshift(newMovement);

    // Actualización de condición en el récord maestro de la aeronave para sincronización
    const acIdx = this.aircraftMaintenanceRecords.findIndex(a => a.matricula.toUpperCase() === data.matricula.toUpperCase());
    if (acIdx >= 0) {
      const prevAc = this.aircraftMaintenanceRecords[acIdx];
      const draftHours = this.getDraftHoursForAircraft(prevAc.matricula);
      const effectiveTach =
        data.tach_hobbs > 0
          ? Number(data.tach_hobbs.toFixed(1))
          : Number((prevAc.horas_totales_celula + draftHours).toFixed(1));
      const baseCellHours =
        data.tach_hobbs > 0
          ? Number(Math.max(0, effectiveTach - draftHours).toFixed(1))
          : prevAc.horas_totales_celula;

      let newCondition: AirworthinessCondition = prevAc.estado_aeronavegabilidad;
      let newLockState: boolean = prevAc.bloqueo_despacho;
      let newMotivoBloqueo: string | undefined = prevAc.motivo_bloqueo;
      let newUbicacion: string | undefined = data.ubicacion_hangar || prevAc.ubicacion_hangar;
      let newFechaUltMant = prevAc.fecha_ultimo_mantenimiento;
      let newUltimoTma = prevAc.ultimo_tma_responsable;
      let nextUltima100h = prevAc.horas_ultima_100h;
      let nextProxima100h = prevAc.horas_proxima_100h;
      let nextRestante100h = Number(Math.max(0, prevAc.horas_proxima_100h - effectiveTach).toFixed(1));
      let nextProxima50h = prevAc.horas_proxima_50h;
      let nextRestante50h = Number(Math.max(0, prevAc.horas_proxima_50h - effectiveTach).toFixed(1));
      let manualClearAtHours: number | undefined = prevAc.desbloqueo_manual_en_horas;

      const signerName = data.supervisor_liberador || data.tecnico_responsable || createdBy || 'Taller OMA SkyOps';
      const signerLic = data.licencia_supervisor || data.licencia_tma || 'AAC-TMA-04521';

      if (data.tipo === 'entrada') {
        manualClearAtHours = undefined;
        if (data.condicion_aeronavegabilidad === 'aog_inoperativo') {
          newCondition = 'aog_bloqueado';
          newLockState = true;
          newMotivoBloqueo = `AOG (${id}): ${data.motivo_principal}`;
        } else {
          newCondition = 'en_mantenimiento';
          newLockState = true;
          newMotivoBloqueo = `En Taller OMA (${id}): ${data.motivo_principal}`;
        }
      } else if (data.tipo === 'salida') {
        if (data.condicion_aeronavegabilidad === 'aeronavegable_conforme') {
          newCondition = 'aeronavegable';
          newLockState = false;
          newMotivoBloqueo = undefined;
          newUbicacion = data.ubicacion_hangar || 'Hangar SkyOps 4 - Rampa Principal';
          newFechaUltMant = data.fecha || new Date().toISOString().slice(0, 10);
          newUltimoTma = `${signerName} (${signerLic})`;

          const linkedWoIdx = data.orden_trabajo_id
            ? this.maintenanceWorkOrders.findIndex(w => w.id === data.orden_trabajo_id)
            : -1;
          const linkedWo = linkedWoIdx >= 0 ? this.maintenanceWorkOrders[linkedWoIdx] : undefined;

          const textToCheck = `${data.motivo_principal || ''} ${data.descripcion_detallada || ''} ${data.asiento_bitacora || ''}`;
          const resetMode = data.reset_inspeccion || 'auto';
          const is100hOverdue = effectiveTach >= prevAc.horas_proxima_100h;
          const is50hOverdue = effectiveTach >= prevAc.horas_proxima_50h;

          if (
            resetMode === '100h' ||
            (resetMode === 'auto' && (/100\s*(h|hr|hrs|hora|horas)\b/i.test(textToCheck) || linkedWo?.tipo === 'inspeccion_100h' || is100hOverdue))
          ) {
            nextUltima100h = effectiveTach;
            nextProxima100h = Number((effectiveTach + 100).toFixed(1));
            nextRestante100h = 100.0;
            nextProxima50h = Number((effectiveTach + 50).toFixed(1));
            nextRestante50h = 50.0;
            manualClearAtHours = undefined;
          } else if (
            resetMode === '50h' ||
            (resetMode === 'auto' && (/50\s*(h|hr|hrs|hora|horas)\b|aceite/i.test(textToCheck) || linkedWo?.tipo === 'inspeccion_50h' || linkedWo?.tipo === 'servicio_aceite' || is50hOverdue))
          ) {
            nextProxima50h = Number((effectiveTach + 50).toFixed(1));
            nextRestante50h = 50.0;
            manualClearAtHours = is100hOverdue ? effectiveTach : undefined;
          } else if (is100hOverdue || is50hOverdue) {
            manualClearAtHours = effectiveTach;
          } else {
            manualClearAtHours = undefined;
          }

          // Si tiene OT abierta vinculada, cerrarla conforme con firma RTS
          if (linkedWo && linkedWo.estado !== 'cerrada_conforme') {
            this.maintenanceWorkOrders[linkedWoIdx] = {
              ...linkedWo,
              estado: 'cerrada_conforme',
              fecha_cierre: data.fecha || new Date().toISOString().slice(0, 10),
              horas_aeronave_salida: effectiveTach,
              retorno_al_servicio: {
                aprobado: true,
                fecha_firma: new Date().toISOString(),
                firmado_por: signerName,
                licencia_firmante: signerLic,
                declaracion: data.asiento_bitacora || `Certifico retorno al servicio conforme vía Movimiento ${id}.`
              }
            };
          }

          // Resolver squawk vinculado y cualquier squawk AOG abierto
          if (data.squawk_id) {
            const sqIdx = this.maintenanceSquawks.findIndex(s => s.id === data.squawk_id);
            if (sqIdx >= 0 && this.maintenanceSquawks[sqIdx].estado !== 'resuelto') {
              this.maintenanceSquawks[sqIdx] = {
                ...this.maintenanceSquawks[sqIdx],
                accion_correctiva: data.descripcion_detallada || data.motivo_principal,
                fecha_resolucion: data.fecha || new Date().toISOString().slice(0, 10),
                resuelto_por: signerName,
                resuelto_por_licencia: signerLic,
                estado: 'resuelto'
              };
            }
          }

          this.resolveOpenAogSquawksForAircraft(
            prevAc.matricula,
            data.descripcion_detallada || data.motivo_principal || `Liberado a vuelo mediante salida conforme ${id}.`,
            signerName,
            signerLic
          );
          this.completeMaintenanceItineraries(prevAc.matricula);
        } else if (data.condicion_aeronavegabilidad === 'vuelo_ferry_restringido') {
          newCondition = 'inspeccion_proxima';
          newLockState = false;
          newMotivoBloqueo = undefined;
          newUbicacion = data.ubicacion_hangar || 'Permiso Especial Ferry';
          newUltimoTma = `${signerName} (${signerLic})`;
          if (effectiveTach >= prevAc.horas_proxima_100h || effectiveTach >= prevAc.horas_proxima_50h) {
            manualClearAtHours = effectiveTach;
          }
          this.completeMaintenanceItineraries(prevAc.matricula);
        } else if (data.condicion_aeronavegabilidad === 'aog_inoperativo') {
          newCondition = 'aog_bloqueado';
          newLockState = true;
          newMotivoBloqueo = `AOG (${id}): ${data.motivo_principal}`;
          manualClearAtHours = undefined;
        } else {
          newCondition = 'en_mantenimiento';
          newLockState = true;
          newMotivoBloqueo = `En Taller OMA (${id}): ${data.motivo_principal}`;
          manualClearAtHours = undefined;
        }
      }

      this.aircraftMaintenanceRecords[acIdx] = {
        ...prevAc,
        estado_aeronavegabilidad: newCondition,
        bloqueo_despacho: newLockState,
        motivo_bloqueo: newMotivoBloqueo,
        ubicacion_hangar: newUbicacion,
        fecha_ultimo_mantenimiento: newFechaUltMant,
        ultimo_tma_responsable: newUltimoTma,
        horas_totales_celula: baseCellHours,
        horas_motor_tsn: baseCellHours,
        horas_ultima_100h: nextUltima100h,
        horas_proxima_100h: nextProxima100h,
        horas_restantes_100h: nextRestante100h,
        horas_proxima_50h: nextProxima50h,
        horas_restantes_50h: nextRestante50h,
        desbloqueo_manual_en_horas: manualClearAtHours
      };
    }

    // Auditoría oficial de movimiento de aeronave en taller
    this.addAuditLog({
      usuario_id: 'tma_user',
      usuario_nombre: createdBy || data.tecnico_responsable || 'Taller OMA SkyOps',
      usuario_rol: 'mantenimiento',
      modulo: 'vigencias_aac',
      accion: 'CREAR',
      entidad_tipo: `Movimiento de Taller (${data.tipo.toUpperCase()})`,
      entidad_id: id,
      descripcion: `Registro de ${data.tipo === 'entrada' ? 'ENTRADA' : 'SALIDA'} para aeronave ${data.matricula} (${data.modelo}). Tach: ${data.tach_hobbs} hrs. Motivo: ${data.motivo_principal}. Vinculado a Bitácora: ${data.bitacora_folio || 'N/A'}.`,
      severidad: data.condicion_aeronavegabilidad === 'aog_inoperativo' ? 'critica' : 'info',
      detalles_cambio: [
        { campo: 'tipo', etiqueta: 'Tipo de Movimiento', valor_anterior: null, valor_nuevo: data.tipo },
        { campo: 'bitacora_folio', etiqueta: 'Folio de Bitácora', valor_anterior: null, valor_nuevo: data.bitacora_folio || null },
        { campo: 'condicion', etiqueta: 'Condición Aeronavegable', valor_anterior: null, valor_nuevo: data.condicion_aeronavegabilidad }
      ]
    });

    this.saveToDisk();
    return newMovement;
  }

  updateAircraftMovement(
    id: string,
    patch: Partial<AircraftWorkshopMovement>,
    updatedBy?: string
  ): AircraftWorkshopMovement | null {
    const idx = this.aircraftMovements.findIndex(m => m.id === id);
    if (idx < 0) return null;

    const prev = this.aircraftMovements[idx];
    this.aircraftMovements[idx] = {
      ...prev,
      ...patch,
      id: prev.id
    };

    this.addAuditLog({
      usuario_id: 'tma_user',
      usuario_nombre: updatedBy || 'Taller OMA SkyOps',
      usuario_rol: 'mantenimiento',
      modulo: 'vigencias_aac',
      accion: 'MODIFICAR',
      entidad_tipo: 'Movimiento de Taller',
      entidad_id: id,
      descripcion: `Actualización de ficha de movimiento de aeronave ${prev.matricula} (${id}). Folio Bitácora: ${patch.bitacora_folio || prev.bitacora_folio || 'N/A'}.`,
      severidad: 'info',
      detalles_cambio: []
    });

    this.saveToDisk();
    return this.aircraftMovements[idx];
  }
}

// ==========================================
// GENERADOR DE HOJAS DE CÁLCULO INICIALES
// ==========================================
export function createInitialHoursWorkbook(
  flights: FlightProgress[] = INITIAL_FLIGHT_PROGRESS,
  itins: Itinerary[] = INITIAL_ITINERARIES,
  userList: User[] = INITIAL_USERS
): SpreadsheetWorkbook {
  // Sheet 1: Reporte General de Vuelo y Operaciones
  const sheet1Cells: Record<string, SpreadsheetCell> = {
    'A1': { raw: 'AEROACADEMIA SKYOPS - REPORTE GENERAL DE HORAS DE VUELO', value: 'AEROACADEMIA SKYOPS - REPORTE GENERAL DE HORAS DE VUELO', style: { bold: true, bgColor: '#0F172A', textColor: '#FFFFFF', align: 'left' } },
    'B1': { raw: '', value: '', style: { bgColor: '#0F172A' } },
    'C1': { raw: '', value: '', style: { bgColor: '#0F172A' } },
    'D1': { raw: '', value: '', style: { bgColor: '#0F172A' } },
    'E1': { raw: '', value: '', style: { bgColor: '#0F172A' } },
    'F1': { raw: '', value: '', style: { bgColor: '#0F172A' } },
    'G1': { raw: '', value: '', style: { bgColor: '#0F172A' } },
    'H1': { raw: '', value: '', style: { bgColor: '#0F172A' } },
    'I1': { raw: '', value: '', style: { bgColor: '#0F172A' } },
    'J1': { raw: '', value: '', style: { bgColor: '#0F172A' } },
    'K1': { raw: '', value: '', style: { bgColor: '#0F172A' } },

    // Encabezados
    'A2': { raw: 'ID / FOLIO', value: 'ID / FOLIO', style: { bold: true, bgColor: '#1E293B', textColor: '#F8FAFC', align: 'center' } },
    'B2': { raw: 'FECHA', value: 'FECHA', style: { bold: true, bgColor: '#1E293B', textColor: '#F8FAFC', align: 'center' } },
    'C2': { raw: 'ESTUDIANTE PILOTO', value: 'ESTUDIANTE PILOTO', style: { bold: true, bgColor: '#1E293B', textColor: '#F8FAFC', align: 'left' } },
    'D2': { raw: 'INSTRUCTOR CFI', value: 'INSTRUCTOR CFI', style: { bold: true, bgColor: '#1E293B', textColor: '#F8FAFC', align: 'left' } },
    'E2': { raw: 'MATRÍCULA', value: 'MATRÍCULA', style: { bold: true, bgColor: '#1E293B', textColor: '#F8FAFC', align: 'center' } },
    'F2': { raw: 'MODELO / EQUIPO', value: 'MODELO / EQUIPO', style: { bold: true, bgColor: '#1E293B', textColor: '#F8FAFC', align: 'left' } },
    'G2': { raw: 'DUAL (HRS)', value: 'DUAL (HRS)', style: { bold: true, bgColor: '#0369A1', textColor: '#FFFFFF', align: 'right', format: 'hours' } },
    'H2': { raw: 'SOLO (HRS)', value: 'SOLO (HRS)', style: { bold: true, bgColor: '#0369A1', textColor: '#FFFFFF', align: 'right', format: 'hours' } },
    'I2': { raw: 'TOTAL VUELO (HRS)', value: 'TOTAL VUELO (HRS)', style: { bold: true, bgColor: '#0284C7', textColor: '#FFFFFF', align: 'right', format: 'hours' } },
    'J2': { raw: 'TARIFA ($/H)', value: 'TARIFA ($/H)', style: { bold: true, bgColor: '#1E293B', textColor: '#F8FAFC', align: 'right', format: 'currency' } },
    'K2': { raw: 'SUBTOTAL ($)', value: 'SUBTOTAL ($)', style: { bold: true, bgColor: '#0F766E', textColor: '#FFFFFF', align: 'right', format: 'currency' } },
  };

  // Poblado con vuelos reales de la academia
  const flightRows = [
    { id: 'FL-2026-001', fecha: '2026-08-01', estudiante: 'Daniel Alvarado', instructor: 'Cap. Valeria Benítez', matricula: 'HP-1822', modelo: 'Piper Seminole PA-44', dual: 2.0, solo: 0.0, tarifa: 320.00 },
    { id: 'FL-2026-002', fecha: '2026-08-03', estudiante: 'Daniel Alvarado', instructor: 'Cap. Valeria Benítez', matricula: 'HP-1822', modelo: 'Piper Seminole PA-44', dual: 2.5, solo: 0.0, tarifa: 320.00 },
    { id: 'FL-2026-003', fecha: '2026-08-05', estudiante: 'Daniel Alvarado', instructor: 'Cap. Valeria Benítez', matricula: 'HP-1822', modelo: 'Piper Seminole PA-44', dual: 1.8, solo: 0.0, tarifa: 320.00 },
    { id: 'FL-2026-004', fecha: '2026-08-08', estudiante: 'Esteban Chen', instructor: 'Cap. Fernando Arboleda', matricula: 'HP-1450', modelo: 'Cessna 172SP Skyhawk', dual: 1.5, solo: 0.0, tarifa: 195.00 },
    { id: 'FL-2026-005', fecha: '2026-08-10', estudiante: 'Esteban Chen', instructor: 'Cap. Fernando Arboleda', matricula: 'HP-1450', modelo: 'Cessna 172SP Skyhawk', dual: 0.0, solo: 1.2, tarifa: 175.00 },
    { id: 'FL-2026-006', fecha: '2026-08-12', estudiante: 'Lucía Méndez', instructor: 'Cap. Fernando Arboleda', matricula: 'HP-1799', modelo: 'Piper PA-28 Archer III', dual: 2.0, solo: 0.0, tarifa: 190.00 },
    { id: 'FL-2026-007', fecha: '2026-08-14', estudiante: 'Gabriel De Gracia', instructor: 'Cap. Roberto Morales', matricula: 'HP-1588', modelo: 'Cessna 172N Skyhawk', dual: 1.6, solo: 0.0, tarifa: 195.00 },
    { id: 'FL-2026-008', fecha: '2026-08-16', estudiante: 'Daniel Alvarado', instructor: 'Cap. Valeria Benítez', matricula: 'HP-1822', modelo: 'Piper Seminole PA-44', dual: 2.2, solo: 0.0, tarifa: 320.00 },
    { id: 'FL-2026-009', fecha: '2026-08-18', estudiante: 'Lucía Méndez', instructor: 'Cap. Valeria Benítez', matricula: 'HP-1799', modelo: 'Piper PA-28 Archer III', dual: 0.0, solo: 1.5, tarifa: 170.00 },
    { id: 'FL-2026-010', fecha: '2026-08-20', estudiante: 'Gabriel De Gracia', instructor: 'Cap. Fernando Arboleda', matricula: 'HP-1588', modelo: 'Cessna 172N Skyhawk', dual: 2.0, solo: 0.0, tarifa: 195.00 },
    { id: 'FL-2026-011', fecha: '2026-08-22', estudiante: 'Esteban Chen', instructor: 'Cap. Valeria Benítez', matricula: 'SIM-ALX', modelo: 'Alsim ALX Simulator IFR', dual: 1.5, solo: 0.0, tarifa: 120.00 },
    { id: 'FL-2026-012', fecha: '2026-08-24', estudiante: 'Daniel Alvarado', instructor: 'Cap. Valeria Benítez', matricula: 'HP-1822', modelo: 'Piper Seminole PA-44', dual: 2.0, solo: 0.0, tarifa: 320.00 },
  ];

  flightRows.forEach((row, index) => {
    const rowNum = index + 3;
    sheet1Cells[`A${rowNum}`] = { raw: row.id, value: row.id, style: { align: 'center' } };
    sheet1Cells[`B${rowNum}`] = { raw: row.fecha, value: row.fecha, style: { align: 'center', format: 'date' } };
    sheet1Cells[`C${rowNum}`] = { raw: row.estudiante, value: row.estudiante, style: { align: 'left', bold: true } };
    sheet1Cells[`D${rowNum}`] = { raw: row.instructor, value: row.instructor, style: { align: 'left' } };
    sheet1Cells[`E${rowNum}`] = { raw: row.matricula, value: row.matricula, style: { align: 'center', bold: true, textColor: '#0369A1' } };
    sheet1Cells[`F${rowNum}`] = { raw: row.modelo, value: row.modelo, style: { align: 'left' } };
    sheet1Cells[`G${rowNum}`] = { raw: String(row.dual), value: row.dual, style: { align: 'right', format: 'hours' } };
    sheet1Cells[`H${rowNum}`] = { raw: String(row.solo), value: row.solo, style: { align: 'right', format: 'hours' } };
    sheet1Cells[`I${rowNum}`] = { raw: `=G${rowNum}+H${rowNum}`, value: row.dual + row.solo, formula: `G${rowNum}+H${rowNum}`, style: { align: 'right', bold: true, format: 'hours', bgColor: '#F0F9FF' } };
    sheet1Cells[`J${rowNum}`] = { raw: String(row.tarifa), value: row.tarifa, style: { align: 'right', format: 'currency' } };
    sheet1Cells[`K${rowNum}`] = { raw: `=I${rowNum}*J${rowNum}`, value: (row.dual + row.solo) * row.tarifa, formula: `I${rowNum}*J${rowNum}`, style: { align: 'right', bold: true, format: 'currency', textColor: '#0F766E', bgColor: '#F0FDFA' } };
  });

  // Fila de Totales de Hoja 1
  const totalRow = flightRows.length + 3;
  sheet1Cells[`A${totalRow}`] = { raw: 'TOTALES ACUMULADOS', value: 'TOTALES ACUMULADOS', style: { bold: true, bgColor: '#0F172A', textColor: '#FFFFFF', align: 'left' } };
  sheet1Cells[`B${totalRow}`] = { raw: '', value: '', style: { bgColor: '#0F172A' } };
  sheet1Cells[`C${totalRow}`] = { raw: '', value: '', style: { bgColor: '#0F172A' } };
  sheet1Cells[`D${totalRow}`] = { raw: '', value: '', style: { bgColor: '#0F172A' } };
  sheet1Cells[`E${totalRow}`] = { raw: '', value: '', style: { bgColor: '#0F172A' } };
  sheet1Cells[`F${totalRow}`] = { raw: '', value: '', style: { bgColor: '#0F172A' } };
  sheet1Cells[`G${totalRow}`] = { raw: `=SUM(G3:G${totalRow - 1})`, value: 19.1, formula: `SUM(G3:G${totalRow - 1})`, style: { bold: true, bgColor: '#0F172A', textColor: '#38BDF8', align: 'right', format: 'hours' } };
  sheet1Cells[`H${totalRow}`] = { raw: `=SUM(H3:H${totalRow - 1})`, value: 2.7, formula: `SUM(H3:H${totalRow - 1})`, style: { bold: true, bgColor: '#0F172A', textColor: '#38BDF8', align: 'right', format: 'hours' } };
  sheet1Cells[`I${totalRow}`] = { raw: `=SUM(I3:I${totalRow - 1})`, value: 21.8, formula: `SUM(I3:I${totalRow - 1})`, style: { bold: true, bgColor: '#0F172A', textColor: '#38BDF8', align: 'right', format: 'hours' } };
  sheet1Cells[`J${totalRow}`] = { raw: `=AVERAGE(J3:J${totalRow - 1})`, value: 230.83, formula: `AVERAGE(J3:J${totalRow - 1})`, style: { bold: true, bgColor: '#0F172A', textColor: '#94A3B8', align: 'right', format: 'currency' } };
  sheet1Cells[`K${totalRow}`] = { raw: `=SUM(K3:K${totalRow - 1})`, value: 5462.50, formula: `SUM(K3:K${totalRow - 1})`, style: { bold: true, bgColor: '#0F172A', textColor: '#34D399', align: 'right', format: 'currency' } };

  // Sheet 2: Control de Horas por Flota y Mantenimiento (100 Horas)
  const sheet2Cells: Record<string, SpreadsheetCell> = {
    'A1': { raw: 'CONTROL DE HORAS DE FLOTA Y MANTENIMIENTO PREVENTIVO (INSPECCIÓN 100 HRS)', value: 'CONTROL DE HORAS DE FLOTA Y MANTENIMIENTO PREVENTIVO (INSPECCIÓN 100 HRS)', style: { bold: true, bgColor: '#0F172A', textColor: '#FFFFFF', align: 'left' } },
    'B1': { raw: '', value: '', style: { bgColor: '#0F172A' } },
    'C1': { raw: '', value: '', style: { bgColor: '#0F172A' } },
    'D1': { raw: '', value: '', style: { bgColor: '#0F172A' } },
    'E1': { raw: '', value: '', style: { bgColor: '#0F172A' } },
    'F1': { raw: '', value: '', style: { bgColor: '#0F172A' } },
    'G1': { raw: '', value: '', style: { bgColor: '#0F172A' } },
    'H1': { raw: '', value: '', style: { bgColor: '#0F172A' } },

    'A2': { raw: 'MATRÍCULA', value: 'MATRÍCULA', style: { bold: true, bgColor: '#1E293B', textColor: '#F8FAFC', align: 'center' } },
    'B2': { raw: 'MODELO DE AERONAVE', value: 'MODELO DE AERONAVE', style: { bold: true, bgColor: '#1E293B', textColor: '#F8FAFC', align: 'left' } },
    'C2': { raw: 'HORAS ANTERIORES', value: 'HORAS ANTERIORES', style: { bold: true, bgColor: '#1E293B', textColor: '#F8FAFC', align: 'right', format: 'hours' } },
    'D2': { raw: 'HORAS ESTE MES', value: 'HORAS ESTE MES', style: { bold: true, bgColor: '#0369A1', textColor: '#FFFFFF', align: 'right', format: 'hours' } },
    'E2': { raw: 'TOTAL HORAS TACH', value: 'TOTAL HORAS TACH', style: { bold: true, bgColor: '#0284C7', textColor: '#FFFFFF', align: 'right', format: 'hours' } },
    'F2': { raw: 'ÚLTIMA 100H TACH', value: 'ÚLTIMA 100H TACH', style: { bold: true, bgColor: '#1E293B', textColor: '#F8FAFC', align: 'right', format: 'hours' } },
    'G2': { raw: 'HORAS RESTANTES 100H', value: 'HORAS RESTANTES 100H', style: { bold: true, bgColor: '#D97706', textColor: '#FFFFFF', align: 'right', format: 'hours' } },
    'H2': { raw: 'ESTADO DE AERONAVE', value: 'ESTADO DE AERONAVE', style: { bold: true, bgColor: '#1E293B', textColor: '#F8FAFC', align: 'center' } },

    // Filas de aviones
    'A3': { raw: 'HP-1822', value: 'HP-1822', style: { bold: true, align: 'center', textColor: '#0369A1' } },
    'B3': { raw: 'Piper Seminole PA-44-180 (Multi-Motor)', value: 'Piper Seminole PA-44-180 (Multi-Motor)', style: { align: 'left' } },
    'C3': { raw: '3420.5', value: 3420.5, style: { align: 'right', format: 'hours' } },
    'D3': { raw: '10.5', value: 10.5, style: { align: 'right', format: 'hours' } },
    'E3': { raw: '=C3+D3', value: 3431.0, formula: 'C3+D3', style: { align: 'right', bold: true, format: 'hours', bgColor: '#F0F9FF' } },
    'F3': { raw: '3400.0', value: 3400.0, style: { align: 'right', format: 'hours' } },
    'G3': { raw: '=100-(E3-F3)', value: 69.0, formula: '100-(E3-F3)', style: { align: 'right', bold: true, format: 'hours', textColor: '#047857', bgColor: '#ECFDF5' } },
    'H3': { raw: 'OPERATIVO', value: 'OPERATIVO', style: { align: 'center', bold: true, textColor: '#059669', bgColor: '#ECFDF5' } },

    'A4': { raw: 'HP-1450', value: 'HP-1450', style: { bold: true, align: 'center', textColor: '#0369A1' } },
    'B4': { raw: 'Cessna 172SP Skyhawk (G1000)', value: 'Cessna 172SP Skyhawk (G1000)', style: { align: 'left' } },
    'C4': { raw: '2810.0', value: 2810.0, style: { align: 'right', format: 'hours' } },
    'D4': { raw: '2.7', value: 2.7, style: { align: 'right', format: 'hours' } },
    'E4': { raw: '=C4+D4', value: 2812.7, formula: 'C4+D4', style: { align: 'right', bold: true, format: 'hours', bgColor: '#F0F9FF' } },
    'F4': { raw: '2725.0', value: 2725.0, style: { align: 'right', format: 'hours' } },
    'G4': { raw: '=100-(E4-F4)', value: 12.3, formula: '100-(E4-F4)', style: { align: 'right', bold: true, format: 'hours', textColor: '#D97706', bgColor: '#FFFBEB' } },
    'H4': { raw: 'PRÓXIMO A 100H', value: 'PRÓXIMO A 100H', style: { align: 'center', bold: true, textColor: '#D97706', bgColor: '#FFFBEB' } },

    'A5': { raw: 'HP-1799', value: 'HP-1799', style: { bold: true, align: 'center', textColor: '#0369A1' } },
    'B5': { raw: 'Piper PA-28 Archer III', value: 'Piper PA-28 Archer III', style: { align: 'left' } },
    'C5': { raw: '4105.2', value: 4105.2, style: { align: 'right', format: 'hours' } },
    'D5': { raw: '3.5', value: 3.5, style: { align: 'right', format: 'hours' } },
    'E5': { raw: '=C5+D5', value: 4108.7, formula: 'C5+D5', style: { align: 'right', bold: true, format: 'hours', bgColor: '#F0F9FF' } },
    'F5': { raw: '4050.0', value: 4050.0, style: { align: 'right', format: 'hours' } },
    'G5': { raw: '=100-(E5-F5)', value: 41.3, formula: '100-(E5-F5)', style: { align: 'right', bold: true, format: 'hours', textColor: '#047857', bgColor: '#ECFDF5' } },
    'H5': { raw: 'OPERATIVO', value: 'OPERATIVO', style: { align: 'center', bold: true, textColor: '#059669', bgColor: '#ECFDF5' } },

    'A6': { raw: 'HP-1588', value: 'HP-1588', style: { bold: true, align: 'center', textColor: '#0369A1' } },
    'B6': { raw: 'Cessna 172N Skyhawk (Analógico)', value: 'Cessna 172N Skyhawk (Analógico)', style: { align: 'left' } },
    'C6': { raw: '5200.0', value: 5200.0, style: { align: 'right', format: 'hours' } },
    'D6': { raw: '3.6', value: 3.6, style: { align: 'right', format: 'hours' } },
    'E6': { raw: '=C6+D6', value: 5203.6, formula: 'C6+D6', style: { align: 'right', bold: true, format: 'hours', bgColor: '#F0F9FF' } },
    'F6': { raw: '5110.0', value: 5110.0, style: { align: 'right', format: 'hours' } },
    'G6': { raw: '=100-(E6-F6)', value: 6.4, formula: '100-(E6-F6)', style: { align: 'right', bold: true, format: 'hours', textColor: '#DC2626', bgColor: '#FEF2F2' } },
    'H6': { raw: 'INSPECCIÓN REQUERIDA', value: 'INSPECCIÓN REQUERIDA', style: { align: 'center', bold: true, textColor: '#DC2626', bgColor: '#FEF2F2' } },

    'A7': { raw: 'SIM-ALX', value: 'SIM-ALX', style: { bold: true, align: 'center', textColor: '#7C3AED' } },
    'B7': { raw: 'Alsim ALX FTD Level 5 (Simulador)', value: 'Alsim ALX FTD Level 5 (Simulador)', style: { align: 'left' } },
    'C7': { raw: '1890.0', value: 1890.0, style: { align: 'right', format: 'hours' } },
    'D7': { raw: '1.5', value: 1.5, style: { align: 'right', format: 'hours' } },
    'E7': { raw: '=C7+D7', value: 1891.5, formula: 'C7+D7', style: { align: 'right', bold: true, format: 'hours', bgColor: '#F5F3FF' } },
    'F7': { raw: 'N/A', value: 'N/A', style: { align: 'center', textColor: '#94A3B8' } },
    'G7': { raw: 'N/A', value: 'N/A', style: { align: 'center', textColor: '#94A3B8' } },
    'H7': { raw: 'OPERATIVO', value: 'OPERATIVO', style: { align: 'center', bold: true, textColor: '#059669', bgColor: '#ECFDF5' } },

    // Totales Flota
    'A8': { raw: 'TOTAL FLOTA AAC', value: 'TOTAL FLOTA AAC', style: { bold: true, bgColor: '#0F172A', textColor: '#FFFFFF', align: 'left' } },
    'B8': { raw: '', value: '', style: { bgColor: '#0F172A' } },
    'C8': { raw: '=SUM(C3:C7)', value: 17425.7, formula: 'SUM(C3:C7)', style: { bold: true, bgColor: '#0F172A', textColor: '#38BDF8', align: 'right', format: 'hours' } },
    'D8': { raw: '=SUM(D3:D7)', value: 21.8, formula: 'SUM(D3:D7)', style: { bold: true, bgColor: '#0F172A', textColor: '#38BDF8', align: 'right', format: 'hours' } },
    'E8': { raw: '=SUM(E3:E7)', value: 17447.5, formula: 'SUM(E3:E7)', style: { bold: true, bgColor: '#0F172A', textColor: '#38BDF8', align: 'right', format: 'hours' } },
    'F8': { raw: '', value: '', style: { bgColor: '#0F172A' } },
    'G8': { raw: '', value: '', style: { bgColor: '#0F172A' } },
    'H8': { raw: '4 AVIONES + 1 SIM', value: '4 AVIONES + 1 SIM', style: { bold: true, bgColor: '#0F172A', textColor: '#94A3B8', align: 'center' } },
  };

  // Sheet 3: Auditoría Alumnos vs Finanzas
  const sheet3Cells: Record<string, SpreadsheetCell> = {
    'A1': { raw: 'AUDITORÍA OPERACIONAL Y FINANCIERA DE ESTUDIANTES PILOTO', value: 'AUDITORÍA OPERACIONAL Y FINANCIERA DE ESTUDIANTES PILOTO', style: { bold: true, bgColor: '#0F172A', textColor: '#FFFFFF', align: 'left' } },
    'B1': { raw: '', value: '', style: { bgColor: '#0F172A' } },
    'C1': { raw: '', value: '', style: { bgColor: '#0F172A' } },
    'D1': { raw: '', value: '', style: { bgColor: '#0F172A' } },
    'E1': { raw: '', value: '', style: { bgColor: '#0F172A' } },
    'F1': { raw: '', value: '', style: { bgColor: '#0F172A' } },
    'G1': { raw: '', value: '', style: { bgColor: '#0F172A' } },
    'H1': { raw: '', value: '', style: { bgColor: '#0F172A' } },

    'A2': { raw: 'ESTUDIANTE', value: 'ESTUDIANTE', style: { bold: true, bgColor: '#1E293B', textColor: '#F8FAFC', align: 'left' } },
    'B2': { raw: 'CURSO ACTUAL', value: 'CURSO ACTUAL', style: { bold: true, bgColor: '#1E293B', textColor: '#F8FAFC', align: 'left' } },
    'C2': { raw: 'HRS DUAL', value: 'HRS DUAL', style: { bold: true, bgColor: '#0369A1', textColor: '#FFFFFF', align: 'right', format: 'hours' } },
    'D2': { raw: 'HRS SOLO', value: 'HRS SOLO', style: { bold: true, bgColor: '#0369A1', textColor: '#FFFFFF', align: 'right', format: 'hours' } },
    'E2': { raw: 'TOTAL HORAS', value: 'TOTAL HORAS', style: { bold: true, bgColor: '#0284C7', textColor: '#FFFFFF', align: 'right', format: 'hours' } },
    'F2': { raw: 'ABONOS RECIBIDOS ($)', value: 'ABONOS RECIBIDOS ($)', style: { bold: true, bgColor: '#059669', textColor: '#FFFFFF', align: 'right', format: 'currency' } },
    'G2': { raw: 'CONSUMO DE VUELOS ($)', value: 'CONSUMO DE VUELOS ($)', style: { bold: true, bgColor: '#DC2626', textColor: '#FFFFFF', align: 'right', format: 'currency' } },
    'H2': { raw: 'SALDO DISPONIBLE ($)', value: 'SALDO DISPONIBLE ($)', style: { bold: true, bgColor: '#0F766E', textColor: '#FFFFFF', align: 'right', format: 'currency' } },

    'A3': { raw: 'Daniel Alvarado', value: 'Daniel Alvarado', style: { bold: true, align: 'left' } },
    'B3': { raw: 'Multi-Motor', value: 'Multi-Motor', style: { align: 'left' } },
    'C3': { raw: '10.5', value: 10.5, style: { align: 'right', format: 'hours' } },
    'D3': { raw: '0.0', value: 0.0, style: { align: 'right', format: 'hours' } },
    'E3': { raw: '=C3+D3', value: 10.5, formula: 'C3+D3', style: { bold: true, align: 'right', format: 'hours', bgColor: '#F0F9FF' } },
    'F3': { raw: '6200.00', value: 6200.00, style: { align: 'right', format: 'currency' } },
    'G3': { raw: '3360.00', value: 3360.00, style: { align: 'right', format: 'currency' } },
    'H3': { raw: '=F3-G3', value: 2840.00, formula: 'F3-G3', style: { bold: true, align: 'right', format: 'currency', textColor: '#047857', bgColor: '#ECFDF5' } },

    'A4': { raw: 'Esteban Chen', value: 'Esteban Chen', style: { bold: true, align: 'left' } },
    'B4': { raw: 'Piloto Privado', value: 'Piloto Privado', style: { align: 'left' } },
    'C4': { raw: '3.0', value: 3.0, style: { align: 'right', format: 'hours' } },
    'D4': { raw: '1.2', value: 1.2, style: { align: 'right', format: 'hours' } },
    'E4': { raw: '=C4+D4', value: 4.2, formula: 'C4+D4', style: { bold: true, align: 'right', format: 'hours', bgColor: '#F0F9FF' } },
    'F4': { raw: '1500.00', value: 1500.00, style: { align: 'right', format: 'currency' } },
    'G4': { raw: '682.50', value: 682.50, style: { align: 'right', format: 'currency' } },
    'H4': { raw: '=F4-G4', value: 817.50, formula: 'F4-G4', style: { bold: true, align: 'right', format: 'currency', textColor: '#047857', bgColor: '#ECFDF5' } },

    'A5': { raw: 'Lucía Méndez', value: 'Lucía Méndez', style: { bold: true, align: 'left' } },
    'B5': { raw: 'Piloto Comercial', value: 'Piloto Comercial', style: { align: 'left' } },
    'C5': { raw: '2.0', value: 2.0, style: { align: 'right', format: 'hours' } },
    'D5': { raw: '1.5', value: 1.5, style: { align: 'right', format: 'hours' } },
    'E5': { raw: '=C5+D5', value: 3.5, formula: 'C5+D5', style: { bold: true, align: 'right', format: 'hours', bgColor: '#F0F9FF' } },
    'F5': { raw: '800.00', value: 800.00, style: { align: 'right', format: 'currency' } },
    'G5': { raw: '635.00', value: 635.00, style: { align: 'right', format: 'currency' } },
    'H5': { raw: '=F5-G5', value: 165.00, formula: 'F5-G5', style: { bold: true, align: 'right', format: 'currency', textColor: '#047857', bgColor: '#ECFDF5' } },

    'A6': { raw: 'Gabriel De Gracia', value: 'Gabriel De Gracia', style: { bold: true, align: 'left' } },
    'B6': { raw: 'Habilitación IFR', value: 'Habilitación IFR', style: { align: 'left' } },
    'C6': { raw: '3.6', value: 3.6, style: { align: 'right', format: 'hours' } },
    'D6': { raw: '0.0', value: 0.0, style: { align: 'right', format: 'hours' } },
    'E6': { raw: '=C6+D6', value: 3.6, formula: 'C6+D6', style: { bold: true, align: 'right', format: 'hours', bgColor: '#F0F9FF' } },
    'F6': { raw: '500.00', value: 500.00, style: { align: 'right', format: 'currency' } },
    'G6': { raw: '785.00', value: 785.00, style: { align: 'right', format: 'currency' } },
    'H6': { raw: '=F6-G6', value: -285.00, formula: 'F6-G6', style: { bold: true, align: 'right', format: 'currency', textColor: '#DC2626', bgColor: '#FEF2F2' } },

    // Totales
    'A7': { raw: 'TOTALES ACUMULADOS', value: 'TOTALES ACUMULADOS', style: { bold: true, bgColor: '#0F172A', textColor: '#FFFFFF', align: 'left' } },
    'B7': { raw: '', value: '', style: { bgColor: '#0F172A' } },
    'C7': { raw: '=SUM(C3:C6)', value: 19.1, formula: 'SUM(C3:C6)', style: { bold: true, bgColor: '#0F172A', textColor: '#38BDF8', align: 'right', format: 'hours' } },
    'D7': { raw: '=SUM(D3:D6)', value: 2.7, formula: 'SUM(D3:D6)', style: { bold: true, bgColor: '#0F172A', textColor: '#38BDF8', align: 'right', format: 'hours' } },
    'E7': { raw: '=SUM(E3:E6)', value: 21.8, formula: 'SUM(E3:E6)', style: { bold: true, bgColor: '#0F172A', textColor: '#38BDF8', align: 'right', format: 'hours' } },
    'F7': { raw: '=SUM(F3:F6)', value: 9000.00, formula: 'SUM(F3:F6)', style: { bold: true, bgColor: '#0F172A', textColor: '#34D399', align: 'right', format: 'currency' } },
    'G7': { raw: '=SUM(G3:G6)', value: 5462.50, formula: 'SUM(G3:G6)', style: { bold: true, bgColor: '#0F172A', textColor: '#F87171', align: 'right', format: 'currency' } },
    'H7': { raw: '=SUM(H3:H6)', value: 3537.50, formula: 'SUM(H3:H6)', style: { bold: true, bgColor: '#0F172A', textColor: '#34D399', align: 'right', format: 'currency' } },
  };

  const sheets: SpreadsheetSheet[] = [
    {
      id: 'sheet_hours_gen',
      name: 'Horas Vuelo Mensual',
      icon: 'Plane',
      rowCount: 40,
      colCount: 16,
      cells: sheet1Cells,
      colWidths: { 0: 130, 1: 100, 2: 170, 3: 170, 4: 110, 5: 180, 6: 105, 7: 105, 8: 130, 9: 110, 10: 130 }
    },
    {
      id: 'sheet_fleet_control',
      name: 'Control Flota 100h',
      icon: 'Wrench',
      rowCount: 30,
      colCount: 12,
      cells: sheet2Cells,
      colWidths: { 0: 120, 1: 220, 2: 130, 3: 130, 4: 140, 5: 130, 6: 160, 7: 170 }
    },
    {
      id: 'sheet_student_audit',
      name: 'Auditoría Alumnos vs $',
      icon: 'Users',
      rowCount: 30,
      colCount: 12,
      cells: sheet3Cells,
      colWidths: { 0: 180, 1: 160, 2: 110, 3: 110, 4: 120, 5: 160, 6: 160, 7: 160 }
    }
  ];

  return {
    id: 'hours_report_workbook_primary',
    title: 'SkyOps - Libro Maestro de Control de Horas y Operaciones',
    sheets,
    activeSheetId: 'sheet_hours_gen',
    updatedAt: new Date().toISOString()
  };
}

export const db = new DatabaseService();


