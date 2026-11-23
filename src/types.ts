/**
 * Tipos de datos para el Sistema de Gestión Aeronáutica SkyOps
 */

export type UserRole = 'estudiante' | 'instructor' | 'instructor_en_jefe' | 'contabilidad' | 'admin' | 'escuela' | 'mantenimiento';

export type ThemeMode = 'light' | 'dark' | 'system';
export type DarkNuance = 'slate' | 'midnight' | 'oled' | 'cockpit';

export interface ThemePreferences {
  mode: ThemeMode;
  accentColor: string; // 'sky' | 'emerald' | 'amber' | 'indigo' | 'rose' | 'teal' | 'violet' | 'cyan' | 'slate' | 'custom'
  customHex?: string;
  darkNuance?: DarkNuance;
  updatedAt?: string;
}

export interface CellStyle {
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  strike?: boolean;
  textColor?: string;
  bgColor?: string;
  align?: 'left' | 'center' | 'right';
  format?: 'general' | 'currency' | 'hours' | 'percentage' | 'number' | 'date' | 'text';
  decimals?: number;
}

export interface SpreadsheetCell {
  raw: string; // lo que el usuario escribe, ej: "=SUM(H2:H10)" o "12.5" o "Daniel Alvarado"
  value: string | number; // valor evaluado
  formula?: string;
  style?: CellStyle;
  error?: string;
}

export interface SpreadsheetSheet {
  id: string;
  name: string;
  icon?: string;
  rowCount: number;
  colCount: number;
  cells: Record<string, SpreadsheetCell>; // clave ej: "A1", "B4", "H12"
  colWidths?: Record<number, number>;
  isProtected?: boolean;
}

export interface SpreadsheetWorkbook {
  id: string;
  title: string;
  sheets: SpreadsheetSheet[];
  activeSheetId: string;
  updatedAt: string;
}

export interface EmergencyContact {
  id?: string;
  nombre: string;
  parentesco: string; // ej: 'Padre', 'Madre', 'Cónyuge', 'Hermano/a', 'Familiar', 'Tutor', 'Amigo'
  telefono: string;
  telefono_secundario?: string;
}

export interface User {
  id: string;
  nombre: string;
  rol: UserRole;
  telefono: string;
  correo: string;
  documento_identidad?: string; // Cédula / Pasaporte
  direccion_residencial?: string;
  fecha_ingreso?: string; // Fecha de ingreso a la escuela o inicio de curso (YYYY-MM-DD)
  contactos_emergencia?: EmergencyContact[];
  licencia?: string;
  vencimiento_licencia?: string; // Formato YYYY-MM-DD
  foto_licencia?: string; // URL o Base64 Data URI
  numero_medico?: string;
  vencimiento_medico?: string; // Formato YYYY-MM-DD
  foto_medico?: string; // URL o Base64 Data URI
  foto_perfil?: string;
  curso_actual?: string; // ej: 'Multi-Motor', 'Comercial', 'Privado', 'IFR'
  instructor_asignado_id?: string;
  activo: boolean;
  password?: string;
  creado_en?: string;
  // Control de Acceso y Autorización para Cuentas Google
  auth_provider?: 'google' | 'local';
  estado_autorizacion?: 'aprobado' | 'pendiente_aprobacion' | 'rechazado';
  autorizado_por?: string; // Nombre / ID del Administrador Principal que autorizó el acceso
  fecha_autorizacion?: string; // Fecha en que fue aprobado o rechazado
  fecha_solicitud?: string; // Fecha en que solicitó acceso con Google
  motivo_rechazo_acceso?: string; // Motivo en caso de rechazo
  // Preferencias de Apariencia y Colores de la Plataforma
  preferencias_tema?: ThemePreferences;
  // Delegación de Permisos por Jefatura
  puede_crear_usuarios?: boolean; // Permiso asignable por Jefatura a roles administrativos (escuela, contabilidad)
  permisos_delegados?: {
    crear_usuarios?: boolean;
    gestionar_alumnos?: boolean;
    gestionar_instructores?: boolean;
    gestionar_finanzas?: boolean;
    asignado_por?: string;
    fecha_asignacion?: string;
  };
  cargo_departamento?: string;
  matricula_asignada?: string;
  tarifa_hora_dual?: number;
  habilitaciones?: string[];
  saldo_inicial?: number;
}

export type TransactionType = 'cargo' | 'abono';

export type TransactionApprovalStatus = 'aprobado' | 'pendiente_revision_bancaria' | 'rechazado';

export type TransactionConcept =
  | 'Matrícula'
  | 'Horas Bloque Vuelo'
  | 'Hora Instructor'
  | 'Simulador de Vuelo'
  | 'Examen Práctico Oficial (Checkride)'
  | 'Manuales y Material Didáctico'
  | 'Seguro Aeronáutico'
  | 'Abono ACH'
  | 'Abono Tarjeta / Efectivo'
  | 'Otro';

export interface Transaction {
  id: string;
  estudiante_id: string;
  estudiante_nombre?: string;
  fecha: string; // YYYY-MM-DD o ISO
  tipo: TransactionType;
  concepto: TransactionConcept;
  monto: number;
  referencia_ach: string;
  banco_origen?: string;
  archivo_adjunto?: string; // URL o Data URI / Nombre archivo
  archivo_nombre?: string;
  saldo_resultante: number;
  creado_por: string;
  notas?: string;
  // Campos de Control y Conciliación Bancaria por Contabilidad
  estado_aprobacion: TransactionApprovalStatus;
  comprobado_banco: boolean;
  referencia_bancaria_confirmada?: string;
  fecha_verificacion_bancaria?: string;
  verificado_por?: string;
  motivo_rechazo?: string;
  notas_bancarias?: string;
  creado_en?: string;
  // Campos de Desglose de Bitácora de Vuelo y Cobro
  horas_vuelo?: number;
  horas_hobbs?: number;
  factor_cobro_estudiante?: number;
  tarifa_hora?: number;
  matricula_avion?: string;
  modelo_avion?: string;
  instructor_nombre?: string;
  leccion_num?: number;
  tipo_mision?: string;
  hoja_vuelo_id?: string;
  saldo_anterior?: number;
  tacometro_inicial?: number;
  tacometro_final?: number;
  hobbs_inicial?: number;
  hobbs_final?: number;
  // Campos de Pagos con Tarjeta y Link de Pago
  metodo_pago?: 'ach' | 'tarjeta_debito' | 'tarjeta_credito' | 'link_pago' | 'clave' | 'efectivo';
  tarjeta_marca?: 'visa' | 'mastercard' | 'clave' | 'amex' | 'otro';
  tarjeta_ultimos4?: string;
  tarjeta_titular?: string;
  pasarela_transaccion_id?: string;
  codigo_autorizacion?: string;
  link_pago_id?: string;
  link_pago_url?: string;
}

export interface PaymentLink {
  id: string;
  token: string;
  estudiante_id: string;
  estudiante_nombre: string;
  estudiante_correo: string;
  monto: number;
  concepto: string;
  horas_estimadas?: number;
  creado_por: string;
  creado_en: string;
  expira_en: string;
  estado: 'pendiente' | 'pagado' | 'expirado' | 'cancelado';
  url_pago: string;
  qr_code?: string;
  transaccion_id?: string;
  pagado_en?: string;
  metodo_usado?: string;
  referencia?: string;
}

export interface CardPaymentPayload {
  studentId: string;
  amount: number;
  concept?: string;
  cardholderName: string;
  cardNumber: string;
  expiry: string; // MM/YY
  cvv: string;
  cardType: 'debito' | 'credito';
  billingZip?: string;
  email?: string;
  hoursEstimated?: number;
  paymentLinkId?: string;
}

export interface CreatePaymentLinkInput {
  studentId: string;
  amount: number;
  concept: string;
  hoursEstimated?: number;
  expiresInDays?: number;
  createdBy?: string;
}

// ==========================================
// HONORARIOS DE INSTRUCTORES DE VUELO
// ==========================================

export interface InstructorFlightFeeItem {
  id: string;
  fecha: string; // YYYY-MM-DD
  matricula_avion: string; // ej: HP-1450, HP-1588
  modelo_avion: string;
  folio_bitacora: string; // Folio oficial de la bitácora de vuelo del avión
  estudiante_id: string;
  estudiante_nombre: string;
  piloto_nombre?: string; // Nombre explícito del piloto en la bitácora registrada
  estudiante_cedula?: string;
  estudiante_licencia?: string;
  horas_vuelo: number;
  tarifa_instructor_hora: number;
  subtotal: number;
  tipo_mision?: string;
  origen_destino?: string;
  tacometro_inicial?: number;
  tacometro_final?: number;
  hobbs_inicial?: number;
  hobbs_final?: number;
  estado_pago?: 'pendiente' | 'incluido_en_liquidacion' | 'pagado';
}

export interface InstructorFeeExcelIndexItem {
  instructor_id: string;
  instructor_nombre: string;
  instructor_cedula: string;
  instructor_licencia: string;
  instructor_correo: string;
  fileName: string;
  registrosCount: number;
  totalHoras: number;
  totalBruto: number;
  totalRetencion: number;
  totalNeto: number;
  totalPagado: number;
  totalPendiente: number;
  updatedAt: string;
  hasCustomEdits: boolean;
}

export type InstructorFeeStatus = 'borrador' | 'enviado_contabilidad' | 'aprobado_contabilidad' | 'pagado' | 'rechazado';

export interface InstructorFeeStatement {
  id: string; // ej: "HON-BIT-202610-001"
  instructor_id: string;
  instructor_nombre: string;
  instructor_cedula: string;
  instructor_licencia: string;
  instructor_correo: string;
  instructor_telefono?: string;
  periodo_inicio: string; // YYYY-MM-DD
  periodo_fin: string; // YYYY-MM-DD
  fecha_generacion: string; // ISO
  fecha_envio_contabilidad?: string;
  fecha_pago?: string;
  total_horas: number;
  total_vuelos: number;
  tarifa_base_hora: number;
  total_bruto: number;
  retencion_impuesto: number;
  total_neto: number;
  estado: InstructorFeeStatus;
  vuelos: InstructorFlightFeeItem[];
  notas_instructor?: string;
  notas_contabilidad?: string;
  banco_pago?: string;
  referencia_pago_ach?: string;
  procesado_por?: string;
  // Campos de trazabilidad por bitácora registrada por Administración
  folio_bitacora?: string;
  estudiante_id?: string;
  estudiante_nombre?: string;
  piloto_id?: string;
  piloto_nombre?: string;
  matricula_avion?: string;
  modelo_avion?: string;
  tipo_mision?: string;
  origen_destino?: string;
  registrado_por_admin?: boolean;
  registrado_por_id?: string;
  registrado_por_nombre?: string;
  registrado_por_rol?: UserRole;
  bitacora_transaction_id?: string;
  estudiante_monto_debitado?: number;
  estudiante_saldo_anterior?: number;
  estudiante_saldo_resultante?: number;
  tacometro_inicial?: number;
  tacometro_final?: number;
  hobbs_inicial?: number;
  hobbs_final?: number;
}

export interface RegisterBitacoraHonorarioInput {
  folio_bitacora: string;
  fecha: string;
  matricula_avion: string;
  modelo_avion?: string;
  estudiante_id?: string;
  estudiante_nombre?: string;
  piloto_id?: string;
  piloto_nombre?: string;
  instructor_id: string;
  horas_vuelo: number;
  tarifa_instructor_hora: number;
  retencion_pct?: number;
  tipo_mision?: string;
  origen?: string;
  destino?: string;
  observaciones?: string;
  aplicar_debito_estudiante?: boolean;
  tarifa_aeronave_hora?: number;
  bitacora_transaction_id?: string;
  tacometro_inicial?: number;
  tacometro_final?: number;
  hobbs_inicial?: number;
  hobbs_final?: number;
  registrado_por_id: string;
  registrado_por_nombre: string;
  registrado_por_rol: UserRole;
  omitir_email_estudiante?: boolean;
}

export interface RecordFlightLogInput {
  folio_bitacora?: string;
  fecha: string;
  matricula_avion: string;
  modelo_avion?: string;
  estudiante_id?: string;
  estudiante_nombre: string;
  instructor_id?: string;
  instructor_nombre?: string;
  tacometro_inicial?: number;
  tacometro_final?: number;
  hobbs_inicial?: number;
  hobbs_final?: number;
  horas_vuelo: number;
  tarifa_aeronave_hora?: number;
  tarifa_instructor_hora?: number;
  origen?: string;
  destino?: string;
  hora_salida?: string;
  hora_llegada?: string;
  mision?: string;
  condicion?: string;
  aterrizajes?: number;
  combustible_gal?: number;
  aceite_qts?: number;
  novedades?: string;
  reportar_novedad_taller?: boolean;
  aplicar_debito_estudiante?: boolean;
  crear_honorario_instructor?: boolean;
  registrado_por_id: string;
  registrado_por_nombre: string;
  registrado_por_rol: UserRole;
}

export interface RecordFlightLogResponse {
  folio_bitacora: string;
  transaction: Transaction | null;
  feeStatement: InstructorFeeStatement | null;
  aircraftRecord: AircraftMaintenanceRecord | null;
  squawk: MaintenanceSquawk | null;
  studentIdentified?: {
    id: string;
    nombre: string;
    saldo_anterior: number;
    saldo_resultante: number;
  } | null;
}

export interface GenerateInstructorFeesInput {
  instructorId?: string;
  instructorQuery?: string;
  startDate?: string;
  endDate?: string;
  hourlyRate?: number;
  studentQuery?: string;
  taxWithholdingPct?: number;
  notes?: string;
  createdBy?: string;
  registrado_por_id?: string;
  registrado_por_rol?: UserRole;
}

export type GradeValue = 'D' | 'S' | 'N' | 'N/A';

export interface ManeuverGrade {
  nombre_maniobra: string;
  calificacion: GradeValue;
  columna: 1 | 2 | 3;
}

export interface ManeuverChangeRecord {
  id: string;
  maniobra_id: string;
  maniobra_nombre: string;
  calificacion_anterior: GradeValue | string;
  calificacion_nueva: GradeValue;
  modificado_por_id: string;
  modificado_por_nombre: string;
  modificado_por_rol: UserRole;
  fecha_modificacion: string; // Timestamp ISO
  motivo?: string;
  leccion_num?: number;
}

export interface FlightTimes {
  vuelo_dual: number;
  vuelo_ifr: number;
  dual_travesia: number;
  solo_travesia: number;
  dia: number;
  noche: number;
  vuelo_actual: number; // Suma o tiempo de esta lección
  horas_anteriores: number; // Vienen de la lección previa
  total_horas: number; // horas_anteriores + vuelo_actual
}

export type FlightProgressStatus = 'pendiente_validacion' | 'aprobado' | 'borrador';

export interface FlightProgress {
  id: string;
  estudiante_id: string;
  estudiante_nombre?: string;
  instructor_id: string;
  instructor_nombre?: string;
  leccion_num: number;
  fecha: string; // YYYY-MM-DD
  matricula: string;
  tipo_avion: string; // ej: 'Piper PA-44 Seminole (Multi-Motor)', 'Cessna 172 Skyhawk', 'Piper PA-28 Archer'
  curso: 'Multi-Motor' | 'Comercial' | 'Privado' | 'IFR';
  estado: FlightProgressStatus;
  observaciones: string;
  evaluacion_maniobras: Record<string, GradeValue>; // Mapa maniobra -> 'D' | 'S' | 'N' | 'N/A'
  historial_maniobras?: ManeuverChangeRecord[]; // Registro histórico de cambios para trazabilidad
  ultima_modificacion_maniobra?: ManeuverChangeRecord; // Última modificación registrada en maniobras
  tiempos_vuelo: FlightTimes;
  firma_estudiante?: boolean;
  firma_instructor?: boolean;
  fecha_validacion?: string;
  creado_en: string;
  actualizado_en: string;
}

export type ItineraryStatus =
  | 'pendiente_confirmacion'
  | 'confirmado'
  | 'programado'
  | 'en_vuelo'
  | 'completado'
  | 'cancelado'
  | 'no_show'
  | 'en_taller'
  | 'guardia'
  | 'descanso';

export type ItineraryEventType =
  | 'vuelo'
  | 'mantenimiento'
  | 'simulador'
  | 'reserva'
  | 'dia_libre';

export interface Itinerary {
  id: string;
  estudiante_id: string;
  estudiante_nombre: string;
  estudiante_telefono: string;
  instructor_id: string;
  instructor_nombre: string;
  instructor_telefono: string;
  avion_matricula: string;
  avion_modelo: string;
  fecha: string; // YYYY-MM-DD
  hora_inicio: string; // HH:mm
  hora_fin: string; // HH:mm
  mision: string; // ej: 'Fase 4: Maniobras Multi-Motor y Falla Monomotor'
  estado: ItineraryStatus;
  tipo_evento?: ItineraryEventType;
  ruta?: string; // ej: 'MPMG - MPDA'
  equipo?: string; // ej: 'PA-28', 'PA-34'
  etd?: string; // ej: '08:00 Z'
  pic?: string; // ej: 'A. Muñoz'
  horas?: number; // ej: 1.5
  detalles_evento?: string; // ej: 'Inspección 100 hrs', 'Disponibilidad local'
  confirmacion_limite?: string; // ISO timestamp (3 horas límite desde creación)
  confirmado_en?: string;
  cancelado_en?: string;
  cancelado_por?: string;
  motivo_cancelacion?: string;
  no_show_en?: string;
  no_show_por?: string;
  recordatorios_enviados?: number; // Contador de recordatorios cada 30 min (0 a 6)
  ultimo_recordatorio_en?: string;
  // Sincronización con Google Calendar API
  google_calendar_event_id?: string;
  google_calendar_synced_at?: string;
  google_calendar_html_link?: string;
  // Trazabilidad de Solicitudes de Vuelo y Publicación Oficial 8:00 PM
  publicado_8pm?: boolean;
  solo_lectura?: boolean;
  origen_solicitud_id?: string;
  aprobado_por_jefe?: string;
  fecha_publicacion_8pm?: string;
  creado_en: string;
}

export type FlightRequestStatus =
  | 'pendiente_envio'
  | 'enviada_jefe'
  | 'aprobada'
  | 'rechazada'
  | 'publicada';

export interface FlightRequest {
  id: string;
  fecha_solicitud_ciclo: string; // YYYY-MM-DD (jornada de solicitud y corte)
  fecha_vuelo: string; // YYYY-MM-DD
  hora_inicio: string; // HH:mm
  hora_fin: string; // HH:mm
  duracion_horas: number;
  instructor_id: string;
  instructor_nombre: string;
  estudiante_id: string;
  estudiante_nombre: string;
  avion_matricula: string;
  avion_modelo: string;
  ruta?: string;
  mision: string;
  notas_instructor?: string;
  estado: FlightRequestStatus;
  creado_en: string;
  enviado_jefe_en?: string;
  revisado_por_id?: string;
  revisado_por_nombre?: string;
  fecha_revision?: string;
  motivo_rechazo?: string;
  publicado_en?: string;
  itinerario_publicado_id?: string;
}

export interface PublishedDailyItinerary {
  id: string;
  fecha_publicacion: string; // YYYY-MM-DD
  publicado_en: string; // ISO
  publicado_automaticamente: boolean;
  publicado_por: string;
  total_vuelos: number;
  itinerary_ids: string[];
  resumen: string;
}

export interface FlightRequestScheduleStatus {
  fecha_ciclo: string;
  hora_actual: string; // HH:mm
  timestamp: string;
  es_hora_simulada: boolean;
  hora_simulada: string | null;
  ventana_inicio: string; // '11:00'
  ventana_fin: string; // '18:00'
  hora_envio_jefe: string; // '18:00'
  hora_publicacion: string; // '20:00'
  ventana_abierta: boolean;
  corte_6pm_ejecutado: boolean;
  corte_8pm_ejecutado: boolean;
  ultimo_envio_6pm_en?: string;
  ultima_publicacion_8pm_en?: string;
}

export interface EmailNotification {
  id: string;
  destinatario_tipo: UserRole;
  destinatario_nombre: string;
  destinatario_email: string;
  asunto: string;
  cuerpo_html: string;
  cuerpo_texto?: string;
  evento:
    | 'itinerario_creado'
    | 'itinerario_recordatorio'
    | 'itinerario_confirmado'
    | 'vuelo_cancelado'
    | 'vuelo_no_asistio'
    | 'vuelo_no_show'
    | 'pago_reportado'
    | 'pago_confirmado'
    | 'pago_rechazado'
    | 'pago_tarjeta'
    | 'link_pago_creado'
    | 'link_pago_pagado'
    | 'alerta_saldo_bajo'
    | 'alerta_vigencia_medica'
    | 'alerta_licencia_vuelo'
    | 'alerta_mantenimiento'
    | 'vigencia_alerta'
    | 'honorarios_instructor_generados'
    | 'honorarios_instructor_aprobados'
    | 'honorarios_instructor_pagados'
    | 'solicitud_vuelo_enviada'
    | 'solicitud_vuelo_decidida'
    | 'itinerario_publicado_8pm'
    | 'notificacion_general';
  fecha_envio: string;
  estado_envio: 'enviado' | 'fallido' | 'simulado';
  itinerario_id?: string;
  error?: string;
  leido?: boolean;
  leido_en?: string;
}

export interface RoleNotificationRule {
  id: string;
  evento: string;
  nombre: string;
  descripcion: string;
  categoria: 'pagos' | 'itinerarios' | 'alertas_seguridad' | 'general';
  roles_notificados: UserRole[];
  activo: boolean;
  prioridad: 'alta' | 'media' | 'urgente';
  plantilla_asociada: EmailTemplateKey;
  correos_adicionales_cc?: string[];
}

export interface MorosidadReport {
  estudiante_id: string;
  estudiante_nombre: string;
  estudiante_correo: string;
  estudiante_telefono: string;
  saldo_actual: number; // Negativo significa deuda
  dias_mora: number;
  ultimo_pago_fecha?: string;
  bloqueado_para_volar: boolean;
}

export interface StudentFlightEligibility {
  estudiante_id: string;
  eligible: boolean;
  hasZeroOrNegative: boolean;
  status: 'habilitado' | 'sin_saldo' | 'saldo_insuficiente';
}

export interface InstructorDualGivenStats {
  instructor_id: string;
  mes: string; // YYYY-MM
  total_horas_dual: number;
  total_vuelos_realizados: number;
  total_honorarios_mes?: number;
  registrado_por_admin_only?: boolean;
  desglose_por_alumno: {
    estudiante_id: string;
    estudiante_nombre: string;
    horas_dual: number;
    misiones: number;
    monto_honorarios?: number;
  }[];
  desglose_por_avion: {
    matricula: string;
    modelo: string;
    horas: number;
  }[];
}

export interface InternalAccountingMessageReply {
  id: string;
  remitente_id: string;
  remitente_nombre: string;
  mensaje: string;
  imagen_adjunta?: string;
  imagen_nombre?: string;
  creado_en: string;
}

export interface InternalAccountingMessage {
  id: string;
  remitente_id: string;
  remitente_nombre: string;
  destinatario_id: string;
  destinatario_nombre: string;
  transaccion_id?: string;
  transaccion_resumen?: {
    estudiante_nombre: string;
    monto: number;
    referencia_ach: string;
    banco_origen?: string;
    archivo_nombre?: string;
    archivo_adjunto?: string;
    estado_aprobacion: TransactionApprovalStatus;
  };
  imagen_adjunta?: string;
  imagen_nombre?: string;
  asunto: string;
  mensaje: string;
  prioridad: 'baja' | 'media' | 'alta' | 'urgente';
  leido: boolean;
  creado_en: string;
  respuestas?: InternalAccountingMessageReply[];
}

export interface EmailBrandConfig {
  brandName: string;
  brandTagline: string;
  logoUrl: string;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  headerGradientStart: string;
  headerGradientEnd: string;
  footerText: string;
  contactEmail: string;
  contactPhone: string;
  supportUrl: string;
}

export type EmailTemplateKey =
  | 'flight_scheduled'
  | 'flight_confirmed'
  | 'flight_cancelled'
  | 'flight_reminder'
  | 'flight_no_show'
  | 'payment_received'
  | 'payment_approved'
  | 'payment_rejected'
  | 'low_balance_alert'
  | 'medical_expiration_alert'
  | 'license_expiration_alert'
  | 'maintenance_alert'
  | 'direct_message';

export interface EmailTemplateVariable {
  variable: string;
  description: string;
  sampleValue: string;
}

export interface EmailTemplateItem {
  id: EmailTemplateKey;
  name: string;
  description: string;
  subjectTemplate: string;
  htmlTemplate: string;
  category: 'itinerario' | 'disciplinario' | 'general';
}

export interface EmailTemplatesPackage {
  brand: EmailBrandConfig;
  templates: Record<EmailTemplateKey, EmailTemplateItem>;
}

// ==========================================
// METEOROLOGÍA AERONÁUTICA (METAR, TAF, WINDY)
// ==========================================

export type FlightCategory = 'VFR' | 'MVFR' | 'IFR' | 'LIFR';

export interface CloudLayer {
  cover: 'FEW' | 'SCT' | 'BKN' | 'OVC' | 'VV' | 'CLR' | 'SKC' | 'NSC';
  baseFt?: number;
  type?: string; // 'CB' | 'TCU'
  description?: string;
}

export interface TafForecastItem {
  type: 'BASE' | 'FM' | 'TEMPO' | 'BECMG' | 'PROB30' | 'PROB40';
  validFrom: string;
  validTo: string;
  timeRangeDisplay?: string;
  wind?: string;
  visibility?: string;
  clouds?: string;
  weather?: string;
  flightCategory?: FlightCategory;
  raw: string;
}

export interface TafData {
  raw: string;
  issueTime: string;
  validFrom: string;
  validTo: string;
  forecasts: TafForecastItem[];
}

export interface AirportRunway {
  ident: string;
  headingDeg: number;
  lengthFt: number;
  surface: string;
}

export interface MetarData {
  icao: string;
  name: string;
  city: string;
  country: string;
  lat: number;
  lon: number;
  elevationFt: number;
  atisFreq?: string;
  towerFreq?: string;
  raw: string;
  flightCategory: FlightCategory;
  observationTimeIso: string;
  observationTimeFormatted: string;
  timeAgoMinutes: number;
  windDirectionDeg?: number;
  windSpeedKt?: number;
  windGustKt?: number;
  windVariable?: boolean;
  windDisplay: string;
  visibilityMiles?: number;
  visibilityKm?: number;
  visibilityDisplay: string;
  clouds: CloudLayer[];
  ceilingFt?: number;
  temperatureC?: number;
  dewpointC?: number;
  relativeHumidity?: number;
  altimeterInHg?: number;
  altimeterHpa?: number;
  weatherConditions: string[];
  runways: AirportRunway[];
  taf?: TafData;
}

export interface PanamaWeatherResponse {
  airports: MetarData[];
  lastUpdated: string;
  source: string;
}

export type SearchCategory =
  | 'all'
  | 'users'
  | 'transactions'
  | 'flight_sheets'
  | 'itineraries'
  | 'medical'
  | 'fleet'
  | 'messages'
  | 'emails';

export interface GlobalSearchResult {
  id: string;
  category: SearchCategory;
  categoryLabel: string;
  title: string;
  subtitle: string;
  badge: string;
  badgeColor?: 'sky' | 'emerald' | 'amber' | 'rose' | 'purple' | 'slate' | 'yellow';
  date?: string;
  amount?: number;
  status?: string;
  targetTab: 'usuarios' | 'contabilidad' | 'progreso' | 'itinerarios' | 'instructor_portal' | 'meteorologia' | 'inicio';
  targetId?: string;
  userContextId?: string;
  raw?: any;
  highlightSnippet?: string;
  actionText?: string;
}

export interface GlobalSearchResponse {
  query: string;
  totalResults: number;
  countsByCategory: Record<string, number>;
  results: GlobalSearchResult[];
}

export type ExpenseCategory =
  | 'combustible'
  | 'mantenimiento'
  | 'nomina_instructores'
  | 'nomina_personal'
  | 'hangaraje_tasas'
  | 'seguros'
  | 'simulador_tecnologia'
  | 'otros_operativos';

export interface OperatingExpense {
  id: string;
  fecha: string; // YYYY-MM-DD
  categoria: ExpenseCategory;
  concepto: string;
  monto: number;
  proveedor: string;
  factura_numero?: string;
  matricula_asociada?: string; // ej: 'HP-1822', 'HP-1544', 'HP-1901', 'HP-1788'
  metodo_pago: 'ACH' | 'Tarjeta Corporativa' | 'Cheque' | 'Efectivo';
  comprobante_url?: string;
  notas?: string;
  creado_por: string;
  creado_en?: string;
}

export interface MonthlyFinancialItem {
  mes: string; // '2026-01', '2026-02', etc.
  mesNombre: string; // 'Ene', 'Feb', etc.
  mesCompleto: string; // 'Enero 2026'
  anio: number;
  ingresos: number;
  gastos: number;
  utilidadNeta: number;
  margenRentabilidad: number; // Porcentaje ej: 24.5%
  horasVuelo: number;
  costoPorHora: number;
  ingresoPorHora: number;
  margenPorHora: number;
  gastosPorCategoria: Record<ExpenseCategory, number>;
}

export interface CategoryExpenseBreakdown {
  categoria: ExpenseCategory;
  label: string;
  monto: number;
  porcentaje: number;
  color: string;
}

export interface AircraftFinancialBreakdown {
  matricula: string;
  modelo: string;
  horas: number;
  ingresos: number;
  gastos: number;
  utilidad: number;
  margen: number;
}

export interface FinancialDashboardSummary {
  periodo: string;
  anioSeleccionado: number;
  resumenAnual: {
    totalIngresos: number;
    totalGastos: number;
    utilidadNetaTotal: number;
    margenRentabilidadPromedio: number;
    totalHorasVuelo: number;
    costoPromedioHora: number;
    ingresoPromedioHora: number;
    margenPromedioHora: number;
    comparativaAnioAnterior?: {
      crecimientoIngresosPct: number;
      crecimientoUtilidadPct: number;
    };
  };
  desgloseMensual: MonthlyFinancialItem[];
  desglosePorCategoria: CategoryExpenseBreakdown[];
  desglosePorAeronave: AircraftFinancialBreakdown[];
  gastosRecientes: OperatingExpense[];
}

// ==========================================
// WHATSAPP BUSINESS & AUTOMATIC TRIGGERS
// ==========================================

export type WhatsAppConnectionStatus = 'connected' | 'disconnected' | 'connecting' | 'qr_ready' | 'error';
export type WhatsAppTriggerCategory = 'documentos' | 'itinerarios' | 'sistema';

export interface WhatsAppConfig {
  status: WhatsAppConnectionStatus;
  businessName: string;
  displayPhoneNumber: string;
  phoneNumberId: string;
  wabaId: string;
  accessToken: string;
  webhookVerifyToken: string;
  qualityRating: 'GREEN' | 'YELLOW' | 'RED';
  tierLimit: string;
  connectedAt?: string;
  lastSyncAt?: string;
  qrCodeData?: string;
  autoSyncActive: boolean;
  quietHoursStart?: string; // ej "22:00"
  quietHoursEnd?: string; // ej "06:00"
}

export type WhatsAppTriggerEvent =
  | 'doc_medico_vencimiento_30d'
  | 'doc_medico_vencimiento_15d'
  | 'doc_medico_vencimiento_7d'
  | 'doc_medico_vencido'
  | 'doc_licencia_vencimiento_30d'
  | 'doc_licencia_vencimiento_15d'
  | 'doc_licencia_vencida'
  | 'itinerario_nuevo_programado'
  | 'itinerario_modificado_horario'
  | 'itinerario_modificado_aeronave'
  | 'itinerario_modificado_instructor'
  | 'itinerario_cancelado_met'
  | 'itinerario_recordatorio_prevuelo'
  | 'saldo_cuenta_bajo'
  | 'pago_recibido_confirmacion';

export interface WhatsAppTrigger {
  id: string;
  evento: WhatsAppTriggerEvent;
  nombre: string;
  descripcion: string;
  categoria: WhatsAppTriggerCategory;
  activo: boolean;
  dias_antelacion?: number; // Para vencimientos: 30, 15, 7, 0
  horas_antelacion?: number; // Para prevuelo: 2, 4, etc.
  destinatarios: ('estudiante' | 'instructor' | 'admin' | 'despacho')[];
  plantilla_mensaje: string;
  variables_disponibles: string[];
  hora_ejecucion_programada?: string; // ej "08:00"
  total_disparados: number;
  ultimo_disparo?: string;
}

export interface WhatsAppLogMessage {
  id: string;
  fecha: string;
  destinatario_nombre: string;
  destinatario_telefono: string;
  destinatario_rol: string;
  evento_disparador?: string;
  trigger_id?: string;
  mensaje: string;
  estado_entrega: 'enviado' | 'entregado' | 'leido' | 'fallido';
  error_detalle?: string;
  es_prueba?: boolean;
}

export interface WhatsAppTriggerExecutionResult {
  ejecutados: number;
  mensajes_enviados: WhatsAppLogMessage[];
  resumen: {
    documentos_alertados: number;
    itinerarios_notificados: number;
  };
}

// ========================================================
// SISTEMA DE AUDITORÍA Y TRAZABILIDAD REGULATORIA
// ========================================================

export type AuditModule =
  | 'hojas_vuelo'
  | 'contabilidad'
  | 'itinerarios'
  | 'vigencias_aac'
  | 'usuarios'
  | 'autenticacion'
  | 'sistema';

export type AuditActionType =
  | 'CREAR'
  | 'MODIFICAR'
  | 'FIRMAR_VALIDAR'
  | 'APROBAR_BANCARIO'
  | 'RECHAZAR_BANCARIO'
  | 'ELIMINAR'
  | 'ANULAR'
  | 'RECALCULAR_CASCADA'
  | 'AJUSTE_SALDO'
  | 'LOGIN_SEGURIDAD';

export type AuditSeverity = 'info' | 'alerta' | 'critica' | 'regulatoria';

export interface AuditFieldChange {
  campo: string;
  etiqueta: string;
  valor_anterior: any;
  valor_nuevo: any;
}

export interface AuditLogEntry {
  id: string;
  timestamp: string; // ISO 8601
  usuario_id: string;
  usuario_nombre: string;
  usuario_rol: UserRole;
  usuario_correo?: string;
  modulo: AuditModule;
  accion: AuditActionType;
  entidad_tipo: string; // ej: 'Hoja de Progreso', 'Transacción Contable', 'Itinerario', 'Expediente Médico'
  entidad_id: string;
  estudiante_afectado_nombre?: string;
  estudiante_afectado_id?: string;
  instructor_afectado_nombre?: string;
  descripcion: string;
  detalles_cambio: AuditFieldChange[];
  ip_origen: string;
  dispositivo?: string;
  referencia_normativa_aac?: string; // ej: 'Bitácora Oficial', 'Normativa Operacional'
  severidad: AuditSeverity;
  hash_integridad: string; // Hash criptográfico de verificación inmutable
  metadata_adicional?: Record<string, any>;
}

export type AuditEntityTypeFilter = 'todos' | 'alumno' | 'instructor' | 'financiero';

export interface AuditLogFilter {
  modulo?: AuditModule | 'todos';
  accion?: AuditActionType | 'todos';
  rol?: UserRole | 'todos';
  usuario_id?: string;
  studentId?: string;
  instructor_id?: string;
  tipo_entidad?: AuditEntityTypeFilter;
  severidad?: AuditSeverity | 'todos';
  fecha_desde?: string;
  fecha_hasta?: string;
  busqueda?: string;
}

export interface AuditLogStats {
  total_registros: number;
  total_hojas_vuelo: number;
  total_contabilidad: number;
  total_firmas_validaciones: number;
  total_recalculos_cascada: number;
  total_alertas_criticas: number;
  registros_hoy: number;
  integridad_verificada: boolean;
  ultimo_hash: string;
}

// ==========================================
// MÓDULO POH (PILOT'S OPERATING HANDBOOK)
// ==========================================
export type POHDocumentType =
  | 'poh_completo'
  | 'checklist'
  | 'performance'
  | 'peso_balance'
  | 'suplemento';

export interface POHKeyItem {
  etiqueta: string;
  valor: string;
  advertencia?: boolean;
  categoria?: 'v_speeds' | 'peso' | 'emergencia' | 'sistema' | 'general';
}

export interface POHSection {
  numero: number;
  titulo: string;
  subtitulo?: string;
  resumen?: string;
  contenido?: string;
  items_clave?: POHKeyItem[];
  items_checklist?: { paso: string; accion: string; critico?: boolean }[];
}

export interface POHDocument {
  id: string;
  matricula: string;
  modelo: string;
  titulo: string;
  tipo: POHDocumentType;
  version: string;
  fecha_emision: string;
  suministrado_por: string; // ej: "Jefatura de Operaciones" o "Dirección de Escuela"
  suministrado_por_rol: 'admin' | 'escuela';
  suministrado_en: string;
  paginas: number;
  tamano_kb: number;
  descripcion?: string;
  archivo_url?: string; // Data URL o URL externa para correr el PDF
  es_oficial: boolean;
  secciones?: POHSection[];
}

// ============================================================================
// MÓDULO DE TALLER AERONÁUTICO & MANTENIMIENTO DE FLOTA (OMA / TMA)
// ============================================================================

export type AirworthinessCondition =
  | 'aeronavegable'
  | 'en_mantenimiento'
  | 'aog_bloqueado'
  | 'inspeccion_proxima';

export interface AircraftMaintenanceRecord {
  matricula: string;
  modelo: string;
  categoria: string;
  estado_aeronavegabilidad: AirworthinessCondition;
  horas_totales_celula: number; // Airframe TT
  horas_motor_tsn: number;      // Engine TSN
  horas_motor_tso: number;      // Engine TSO (since overhaul)
  horas_helice_tso: number;     // Propeller TSO
  horas_ultima_100h: number;
  horas_proxima_100h: number;
  horas_restantes_100h: number;
  horas_proxima_50h: number;
  horas_restantes_50h: number;
  fecha_ultimo_mantenimiento: string;
  fecha_proxima_inspeccion_anual: string;
  vencimiento_altimetro_pitot: string; // Transponder & Pitot Static 24M (RAC 91)
  vencimiento_elt: string;             // ELT battery
  vencimiento_extintor: string;        // Extinguisher
  ultimo_tma_responsable: string;
  novedades_abiertas_count: number;
  ordenes_activas_count: number;
  bloqueo_despacho: boolean;
  motivo_bloqueo?: string;
  ubicacion_hangar?: string;
  desbloqueo_manual_en_horas?: number;
  ultimo_tacometro_vuelo?: number;
  ultimo_vuelo_fecha?: string;
  ultimo_piloto_vuelo?: string;
  ultimo_folio_bitacora?: string;
}

export type WorkOrderType =
  | 'inspeccion_50h'
  | 'inspeccion_100h'
  | 'inspeccion_anual'
  | 'correctivo'
  | 'directiva_ad'
  | 'servicio_aceite'
  | 'avionica'
  | 'overhaul';

export type WorkOrderStatus =
  | 'abierta'
  | 'en_progreso'
  | 'espera_repuestos'
  | 'inspeccion_calidad'
  | 'cerrada_conforme';

export interface MaintenanceWorkOrderItem {
  item: string;
  numero_parte: string;
  cantidad: number;
  costo_unitario?: number;
}

export interface MaintenanceWorkOrder {
  id: string; // ej. "OT-2026-042"
  matricula: string;
  tipo: WorkOrderType;
  titulo: string;
  descripcion: string;
  estado: WorkOrderStatus;
  prioridad: 'baja' | 'media' | 'alta' | 'aog_critico';
  fecha_apertura: string;
  fecha_estimada_entrega?: string;
  fecha_cierre?: string;
  horas_aeronave_entrada: number;
  horas_aeronave_salida?: number;
  tecnico_responsable: string;
  licencia_tma: string;
  trabajo_realizado?: string;
  partes_utilizadas?: MaintenanceWorkOrderItem[];
  retorno_al_servicio: {
    aprobado: boolean;
    fecha_firma?: string;
    firmado_por?: string;
    licencia_firmante?: string;
    declaracion?: string;
  };
  notas?: string;
}

export type SquawkSeverity = 'aog' | 'mel_diferible' | 'preventivo' | 'observacion';
export type SquawkStatus = 'reportado' | 'inspeccion' | 'en_reparacion' | 'resuelto' | 'diferido';

export interface MaintenanceSquawk {
  id: string;
  matricula: string;
  fecha_reporte: string;
  reportado_por: string;
  reportado_por_rol: UserRole;
  bitacora_folio?: string;
  sistema_afectado: 'motor' | 'avionica' | 'estructura' | 'tren_frenos' | 'electrico' | 'mandos_vuelo' | 'cabina';
  descripcion: string;
  severidad: SquawkSeverity;
  estado: SquawkStatus;
  accion_correctiva?: string;
  fecha_resolucion?: string;
  resuelto_por?: string;
  resuelto_por_licencia?: string;
  orden_trabajo_id?: string;
}

export interface MaintenancePartStock {
  id: string;
  numero_parte: string;
  descripcion: string;
  categoria: 'aceite_lubricante' | 'filtros' | 'bujias_encendido' | 'frenos_tren' | 'avionica_instrumentos' | 'hardware_tornilleria' | 'general';
  cantidad_disponible: number;
  cantidad_minima_alerta: number;
  unidad_medida: 'unidades' | 'cuartos' | 'galones' | 'kits' | 'libras';
  ubicacion_hangar: string;
  aeronaves_compatibles: string[];
  ultimo_ingreso_fecha: string;
}

export interface AirworthinessDirective {
  id: string;
  codigo_ad: string;
  titulo: string;
  aplicabilidad_modelo: string;
  es_recurrente: boolean;
  intervalo_horas?: number;
  intervalo_meses?: number;
  ultimo_cumplimiento_fecha?: string;
  ultimo_cumplimiento_horas?: number;
  proximo_cumplimiento_fecha?: string;
  proximo_cumplimiento_horas?: number;
  estado_cumplimiento: 'cumplido' | 'pendiente' | 'proximo_vencer';
  notas?: string;
}

export type MovementType = 'entrada' | 'salida';

export type MovementAirworthinessCondition =
  | 'aog_inoperativo'
  | 'mantenimiento_preventivo'
  | 'aeronavegable_conforme'
  | 'vuelo_ferry_restringido';

export interface AircraftWorkshopMovement {
  id: string; // ej. "MOV-2026-001"
  tipo: MovementType; // 'entrada' | 'salida'
  matricula: string;
  modelo: string;
  fecha: string; // "YYYY-MM-DD"
  hora: string; // "HH:MM"
  tach_hobbs: number;
  motivo_principal: string;
  descripcion_detallada: string;

  // Vinculación y trazabilidad con Bitácoras de Mantenimiento / Vuelo
  bitacora_folio?: string; // Folio de bitácora asociado (ej. "BIT-1450-20261002-01")
  bitacora_tipo?: 'celula' | 'motor' | 'helice' | 'avionica' | 'vuelo_diario';
  orden_trabajo_id?: string; // ej. "OT-2026-042"
  squawk_id?: string; // ej. "SQ-001"
  asiento_bitacora?: string; // Texto asentado en bitácora para trazabilidad RAC 43 / 145

  // Responsables técnicos
  tecnico_responsable: string;
  licencia_tma: string;
  supervisor_liberador?: string;
  licencia_supervisor?: string;

  // Ubicación física y condición de aeronavegabilidad
  ubicacion_hangar: string; // ej. 'Hangar OMA - Bahía 1'
  condicion_aeronavegabilidad: MovementAirworthinessCondition;

  // Referencia a entrada previa si es una salida
  entrada_id_relacionada?: string;
  reset_inspeccion?: 'auto' | 'none' | '50h' | '100h';
  creado_en?: string;
}


