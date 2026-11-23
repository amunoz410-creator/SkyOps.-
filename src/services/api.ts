/**
 * Cliente API para AeroAcademia
 */

import {
  User,
  Transaction,
  FlightProgress,
  Itinerary,
  EmailNotification,
  MorosidadReport,
  InstructorDualGivenStats,
  InternalAccountingMessage,
  POHDocument,
  InstructorFeeStatement,
  GenerateInstructorFeesInput,
  RegisterBitacoraHonorarioInput,
  RecordFlightLogInput,
  RecordFlightLogResponse,
  InstructorFeeStatus,
  AirworthinessCondition,
  AircraftMaintenanceRecord,
  MaintenanceWorkOrder,
  MaintenanceSquawk,
  MaintenancePartStock,
  AirworthinessDirective,
  SquawkSeverity,
  SquawkStatus,
  WorkOrderStatus,
  WorkOrderType,
  MovementType,
  MovementAirworthinessCondition,
  AircraftWorkshopMovement,
  FlightRequest,
  FlightRequestStatus,
  PublishedDailyItinerary,
  FlightRequestScheduleStatus,
  StudentFlightEligibility
} from '../types';
import {
  saveUserToFirestore,
  updateUserInFirestore,
  deleteUserFromFirestore,
  saveTransactionToFirestore,
  updateTransactionStatusInFirestore,
  getUsersFromFirestore,
  updateItineraryGoogleCalendarInfoInFirestore,
  INITIAL_FIRESTORE_USERS,
  savePOHDocumentToFirestore,
  getPOHDocumentsFromFirestore,
  deletePOHDocumentFromFirestore,
  saveFlightProgressToFirestore,
  getFlightProgressFromFirestore
} from '../firebase/firestoreService';
import { DEFAULT_POH_LIBRARY } from '../components/poh/defaultPOHLibrary';

const API_BASE = '/api';

export const api = {
  // USUARIOS
  async getUsers(rol?: string): Promise<User[]> {
    const query = rol ? `?rol=${rol}` : '';
    // 1. Intentar API local con respuesta instantánea
    try {
      const res = await fetch(`${API_BASE}/users${query}`);
      if (res.ok) {
        const users = await res.json();
        if (Array.isArray(users) && users.length > 0) {
          return users;
        }
      }
    } catch (apiErr) {
      console.warn('API local /api/users no disponible, intentando Firestore:', apiErr);
    }

    // 2. Intentar Firestore si la API local no respondió
    try {
      const fsUsers = await getUsersFromFirestore();
      if (Array.isArray(fsUsers) && fsUsers.length > 0) {
        if (rol) return fsUsers.filter(u => u.rol === rol);
        return fsUsers;
      }
    } catch (fsErr) {
      console.warn('Firestore fallback error:', fsErr);
    }

    // 3. Fallback infalible con catálogo inicial
    if (rol) {
      return INITIAL_FIRESTORE_USERS.filter(u => u.rol === rol);
    }
    return INITIAL_FIRESTORE_USERS;
  },

  async getUser(id: string): Promise<User> {
    const res = await fetch(`${API_BASE}/users/${id}`);
    if (!res.ok) throw new Error('Error al obtener usuario');
    return res.json();
  },

  async createUser(userData: Partial<User>): Promise<User> {
    const res = await fetch(`${API_BASE}/users`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(userData),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Error al crear usuario');
    }
    const createdUser = await res.json();
    // Persistencia secundaria en Firestore en segundo plano (sin bloquear la interfaz)
    saveUserToFirestore(createdUser).catch((fsErr) => {
      console.warn('[Firestore Sync] Usuario en segundo plano:', fsErr);
    });
    return createdUser;
  },

  async updateUser(id: string, updates: Partial<User>): Promise<User> {
    const res = await fetch(`${API_BASE}/users/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    });
    if (!res.ok) throw new Error('Error al actualizar usuario');
    const updatedUser = await res.json();
    // Persistencia secundaria en Firestore en segundo plano (sin bloquear la interfaz)
    updateUserInFirestore(id, updates).catch((fsErr) => {
      console.warn('[Firestore Sync] Actualización de usuario en segundo plano:', fsErr);
    });
    return updatedUser;
  },

  async delegateUserCreation(userId: string, allowed: boolean, authorizedBy?: string): Promise<User> {
    const res = await fetch(`${API_BASE}/admin/delegate-user-creation`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, allowed, authorizedBy }),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Error al actualizar permisos de creación');
    }
    const data = await res.json();
    updateUserInFirestore(userId, { puede_crear_usuarios: allowed }).catch(e => console.warn(e));
    return data.user;
  },

  async deleteUser(id: string): Promise<void> {
    const res = await fetch(`${API_BASE}/users/${id}`, { method: 'DELETE' });
    if (!res.ok) throw new Error('Error al eliminar usuario');
    // Persistencia secundaria en Firestore en segundo plano (sin bloquear la interfaz)
    deleteUserFromFirestore(id).catch((fsErr) => {
      console.warn('[Firestore Sync] Eliminación de usuario en segundo plano:', fsErr);
    });
  },

  // INSTRUCTORES
  async checkInstructorLock(id: string): Promise<{ locked: boolean; reason?: string }> {
    const res = await fetch(`${API_BASE}/instructors/${id}/check-lock`);
    if (!res.ok) throw new Error('Error al verificar vigencias');
    return res.json();
  },

  async getInstructorDualStats(id: string, month?: string): Promise<InstructorDualGivenStats> {
    const query = month ? `?month=${month}` : '';
    const res = await fetch(`${API_BASE}/instructors/${id}/dual-given${query}`);
    if (!res.ok) throw new Error('Error al cargar estadísticas Dual Given');
    return res.json();
  },

  // CONTABILIDAD Y CONCILIACIÓN BANCARIA
  async getStudentFlightEligibility(): Promise<{ minRequired: number; eligibility: Record<string, StudentFlightEligibility> }> {
    const res = await fetch(`${API_BASE}/students/flight-eligibility`);
    if (!res.ok) throw new Error('Error al verificar elegibilidad operativa de estudiantes');
    return res.json();
  },

  async getTransactions(studentId?: string, status?: string, role?: string): Promise<Transaction[]> {
    const params = new URLSearchParams();
    if (studentId) params.append('studentId', studentId);
    if (status) params.append('status', status);
    if (role) params.append('role', role);
    const queryString = params.toString() ? `?${params.toString()}` : '';
    const headers: Record<string, string> = {};
    if (role) headers['x-user-role'] = role;
    const res = await fetch(`${API_BASE}/transactions${queryString}`, { headers });
    if (!res.ok) throw new Error('Error al cargar transacciones');
    return res.json();
  },

  async getPendingTransactions(role?: string): Promise<Transaction[]> {
    const query = role ? `?role=${encodeURIComponent(role)}` : '';
    const headers: Record<string, string> = {};
    if (role) headers['x-user-role'] = role;
    const res = await fetch(`${API_BASE}/transactions/pending${query}`, { headers });
    if (!res.ok) throw new Error('Error al cargar transacciones pendientes');
    return res.json();
  },

  async getStudentBalance(studentId: string, role?: string): Promise<number> {
    const query = role ? `?role=${encodeURIComponent(role)}` : '';
    const headers: Record<string, string> = {};
    if (role) headers['x-user-role'] = role;
    const res = await fetch(`${API_BASE}/transactions/balance/${studentId}${query}`, { headers });
    if (!res.ok) throw new Error('Error al obtener saldo');
    const data = await res.json();
    return data.balance;
  },

  async getStudentBalanceDetails(studentId: string, role?: string): Promise<{ balance: number; totalPendingAbonos: number; totalPendingCargos: number; count: number }> {
    const query = role ? `?role=${encodeURIComponent(role)}` : '';
    const headers: Record<string, string> = {};
    if (role) headers['x-user-role'] = role;
    const res = await fetch(`${API_BASE}/transactions/balance/${studentId}${query}`, { headers });
    if (!res.ok) throw new Error('Error al obtener detalle de saldo');
    return res.json();
  },

  async createTransaction(tx: Omit<Transaction, 'id' | 'saldo_resultante'> & { estado_aprobacion?: string }): Promise<Transaction> {
    const res = await fetch(`${API_BASE}/transactions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(tx),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Error al registrar transacción');
    }
    const createdTx = await res.json();
    // Persistencia secundaria en Firestore en segundo plano (sin bloquear la interfaz)
    saveTransactionToFirestore(createdTx).catch((fsErr) => {
      console.warn('[Firestore Sync] Transacción en segundo plano:', fsErr);
    });
    return createdTx;
  },

  async approveTransaction(
    id: string,
    verificado_por: string,
    notas_bancarias?: string,
    referencia_confirmada?: string,
    monto_confirmado?: number
  ): Promise<Transaction> {
    const res = await fetch(`${API_BASE}/transactions/${id}/approve`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ verificado_por, notas_bancarias, referencia_confirmada, monto_confirmado }),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Error al aprobar transacción con el banco');
    }
    const approvedTx = await res.json();
    // Persistencia secundaria en Firestore en segundo plano (sin bloquear la interfaz)
    updateTransactionStatusInFirestore(id, 'aprobado', verificado_por, notas_bancarias, referencia_confirmada).catch((fsErr) => {
      console.warn('[Firestore Sync] Aprobación en segundo plano:', fsErr);
    });
    return approvedTx;
  },

  async rejectTransaction(id: string, verificado_por: string, motivo: string): Promise<Transaction> {
    const res = await fetch(`${API_BASE}/transactions/${id}/reject`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ verificado_por, motivo }),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Error al rechazar transacción');
    }
    return res.json();
  },

  async getMorosidadReport(role?: string): Promise<MorosidadReport[]> {
    const query = role ? `?role=${encodeURIComponent(role)}` : '';
    const headers: Record<string, string> = {};
    if (role) headers['x-user-role'] = role;
    const res = await fetch(`${API_BASE}/accounting/morosidad${query}`, { headers });
    if (!res.ok) throw new Error('Error al cargar reporte de morosidad');
    return res.json();
  },

  // CARGA DE BITÁCORAS DE AERONAVES Y DÉBITO AUTÓNOMO DE SALDOS
  async processAircraftLogbookBatch(data: {
    entries: Array<{
      fecha?: string;
      matricula?: string;
      tipo_avion?: string;
      estudiante_identificador?: string;
      horas_vuelo?: number;
      horas_hobbs?: number;
      factor_cobro_estudiante?: number;
      tarifa_hora?: number;
      instructor_nombre?: string;
      mision?: string;
      leccion_num?: number;
      folio?: string;
      hobbs_inicial?: number;
      hobbs_final?: number;
      notas?: string;
    }>;
    uploaded_by?: string;
  }): Promise<{
    success: boolean;
    totalProcessed: number;
    totalHours: number;
    totalDebited: number;
    results: Array<{
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
    }>;
  }> {
    const res = await fetch(`${API_BASE}/aircraft-logbooks/process-batch`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Error al procesar el lote de bitácoras de aeronaves');
    }
    return res.json();
  },

  // MENSAJERÍA INTERNA DE CONTABILIDAD
  async getAccountingMessages(userId?: string): Promise<InternalAccountingMessage[]> {
    const query = userId ? `?userId=${userId}` : '';
    const res = await fetch(`${API_BASE}/accounting-messages${query}`);
    if (!res.ok) throw new Error('Error al cargar mensajes internos de contabilidad');
    return res.json();
  },

  async sendAccountingMessage(data: {
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
  }): Promise<InternalAccountingMessage> {
    const res = await fetch(`${API_BASE}/accounting-messages`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Error al enviar mensaje interno');
    }
    return res.json();
  },

  async replyAccountingMessage(id: string, replyData: {
    remitente_id: string;
    remitente_nombre: string;
    mensaje: string;
    imagen_adjunta?: string;
    imagen_nombre?: string;
  }): Promise<InternalAccountingMessage> {
    const res = await fetch(`${API_BASE}/accounting-messages/${id}/reply`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(replyData),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Error al responder mensaje interno');
    }
    return res.json();
  },

  async markAccountingMessageRead(id: string): Promise<void> {
    const res = await fetch(`${API_BASE}/accounting-messages/${id}/read`, {
      method: 'PUT',
    });
    if (!res.ok) throw new Error('Error al marcar mensaje como leído');
  },

  async deleteAccountingMessage(id: string): Promise<void> {
    const res = await fetch(`${API_BASE}/accounting-messages/${id}`, {
      method: 'DELETE',
    });
    if (!res.ok) throw new Error('Error al eliminar mensaje');
  },

  // HOJAS DE PROGRESO & CASCADA
  async getFlightProgress(studentId?: string): Promise<FlightProgress[]> {
    const query = studentId ? `?studentId=${studentId}` : '';
    try {
      const res = await fetch(`${API_BASE}/flight-progress${query}`);
      if (res.ok) {
        return await res.json();
      }
    } catch (apiErr) {
      console.warn('API local /api/flight-progress no disponible, intentando Firestore:', apiErr);
    }
    try {
      return await getFlightProgressFromFirestore(studentId);
    } catch (fsErr) {
      console.warn('Firestore fallback flight_progress error:', fsErr);
      return [];
    }
  },

  async getFlightProgressById(id: string): Promise<FlightProgress> {
    const res = await fetch(`${API_BASE}/flight-progress/${id}`);
    if (!res.ok) throw new Error('Error al cargar hoja de progreso');
    return res.json();
  },

  async saveFlightProgress(data: Partial<FlightProgress>): Promise<FlightProgress> {
    const res = await fetch(`${API_BASE}/flight-progress`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Error al guardar hoja de progreso');
    }
    const saved = await res.json();
    saveFlightProgressToFirestore(saved).catch(e => console.warn('Sync FlightProgress Firestore:', e));
    return saved;
  },

  // SUBIDA PERMANENTE DE ARCHIVOS AL SERVIDOR
  async uploadFile(file: File): Promise<{ url: string; filename: string; size: number; mimeType: string }> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = async () => {
        try {
          const base64 = reader.result as string;
          const res = await fetch(`${API_BASE}/upload`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              filename: file.name,
              base64,
              mimeType: file.type
            })
          });
          if (!res.ok) {
            const err = await res.json().catch(() => ({}));
            throw new Error(err.error || 'Error al almacenar el archivo en servidor');
          }
          const result = await res.json();
          resolve(result);
        } catch (uploadErr) {
          reject(uploadErr);
        }
      };
      reader.onerror = () => reject(new Error('Error al leer el archivo en el navegador'));
      reader.readAsDataURL(file);
    });
  },

  // MANUALES POH (PILOT OPERATING HANDBOOKS)
  async getPOHDocuments(): Promise<POHDocument[]> {
    try {
      const res = await fetch(`${API_BASE}/poh`);
      if (res.ok) {
        const docs = await res.json();
        if (Array.isArray(docs) && docs.length > 0) return docs;
      }
    } catch (err) {
      console.warn('Error al cargar POH de API local:', err);
    }
    try {
      const fsDocs = await getPOHDocumentsFromFirestore();
      if (Array.isArray(fsDocs) && fsDocs.length > 0) return fsDocs;
    } catch (err) {
      console.warn('Error al cargar POH de Firestore:', err);
    }
    return DEFAULT_POH_LIBRARY;
  },

  async savePOHDocument(poh: POHDocument): Promise<POHDocument> {
    try {
      const res = await fetch(`${API_BASE}/poh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(poh)
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Error al guardar manual POH');
      }
      const saved = await res.json();
      savePOHDocumentToFirestore(saved).catch(e => console.warn('Sync POH Firestore:', e));
      return saved;
    } catch (localErr) {
      console.warn('Fallback guardando POH directo a Firestore:', localErr);
      await savePOHDocumentToFirestore(poh);
      return poh;
    }
  },

  async deletePOHDocument(id: string): Promise<boolean> {
    try {
      const res = await fetch(`${API_BASE}/poh/${id}`, { method: 'DELETE' });
      deletePOHDocumentFromFirestore(id).catch(e => console.warn('Delete POH Firestore:', e));
      return res.ok;
    } catch (err) {
      await deletePOHDocumentFromFirestore(id);
      return true;
    }
  },

  // HOJA DE TRABAJO DE BITÁCORA DE AERONAVES (DRAFT ROWS)
  async getLogbookDraftSheet(): Promise<any[]> {
    try {
      const res = await fetch(`${API_BASE}/aircraft-logbooks/sheet`);
      if (res.ok) {
        const rows = await res.json();
        if (Array.isArray(rows)) return rows;
      }
    } catch (err) {
      console.warn('Error al cargar hoja de bitácora:', err);
    }
    return [];
  },

  async saveLogbookDraftSheet(rows: any[]): Promise<any[]> {
    try {
      const res = await fetch(`${API_BASE}/aircraft-logbooks/sheet`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rows })
      });
      if (res.ok) {
        return rows;
      }
    } catch (err) {
      console.warn('Error al guardar hoja de bitácora:', err);
    }
    return rows;
  },

  async validateFlightProgress(id: string, instructorId: string): Promise<FlightProgress> {
    const res = await fetch(`${API_BASE}/flight-progress/${id}/validate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ instructor_id: instructorId }),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Error al validar hoja de vuelo');
    }
    return res.json();
  },

  async triggerCascadeRecalculation(studentId: string): Promise<{ message: string; records: FlightProgress[] }> {
    const res = await fetch(`${API_BASE}/flight-progress/recalculate-cascade`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ studentId }),
    });
    if (!res.ok) throw new Error('Error al ejecutar recálculo en cascada');
    return res.json();
  },

  async deleteFlightProgress(id: string): Promise<void> {
    const res = await fetch(`${API_BASE}/flight-progress/${id}`, { method: 'DELETE' });
    if (!res.ok) throw new Error('Error al eliminar hoja');
  },

  // ITINERARIOS
  async getItineraries(role?: string, userId?: string): Promise<Itinerary[]> {
    const params = new URLSearchParams();
    if (role) params.append('role', role);
    if (userId) params.append('userId', userId);
    const query = params.toString() ? `?${params.toString()}` : '';
    const res = await fetch(`${API_BASE}/itineraries${query}`);
    if (!res.ok) throw new Error('Error al cargar itinerarios');
    return res.json();
  },

  async createItinerary(data: Omit<Itinerary, 'id' | 'creado_en'>): Promise<Itinerary> {
    const res = await fetch(`${API_BASE}/itineraries`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Error al agendar vuelo');
    }
    return res.json();
  },

  async acceptItinerary(id: string, estudianteNombre?: string): Promise<Itinerary> {
    const res = await fetch(`${API_BASE}/itineraries/${id}/accept`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ estudiante_nombre: estudianteNombre }),
    });
    if (!res.ok) throw new Error('Error al confirmar vuelo');
    return res.json();
  },

  async cancelItinerary(id: string, motivo: string, canceladoPor?: string): Promise<Itinerary> {
    const res = await fetch(`${API_BASE}/itineraries/${id}/cancel`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ motivo, cancelado_por: canceladoPor }),
    });
    if (!res.ok) throw new Error('Error al cancelar vuelo');
    return res.json();
  },

  async markNoShow(id: string, instructorNombre: string): Promise<Itinerary> {
    const res = await fetch(`${API_BASE}/itineraries/${id}/noshow`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ instructor_nombre: instructorNombre }),
    });
    if (!res.ok) throw new Error('Error al marcar No Show');
    return res.json();
  },

  async sendItineraryReminder(id: string): Promise<{ itinerary: Itinerary }> {
    const res = await fetch(`${API_BASE}/itineraries/${id}/send-reminder`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });
    if (!res.ok) throw new Error('Error al enviar recordatorio');
    return res.json();
  },

  async updateItineraryStatus(id: string, estado: Itinerary['estado'], motivo?: string): Promise<Itinerary> {
    const res = await fetch(`${API_BASE}/itineraries/${id}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ estado, motivo }),
    });
    if (!res.ok) throw new Error('Error al actualizar estado del itinerario');
    return res.json();
  },

  async updateItinerary(
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
    actor: { id: string; nombre: string; rol: string }
  ): Promise<Itinerary> {
    const res = await fetch(`${API_BASE}/itineraries/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...updates, role: actor.rol, userId: actor.id, userName: actor.nombre }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Error al editar el vuelo en el itinerario');
    }
    return res.json();
  },

  async deleteItinerary(id: string, actor: { id: string; nombre: string; rol: string }): Promise<{ success: boolean }> {
    const res = await fetch(`${API_BASE}/itineraries/${id}`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ role: actor.rol, userId: actor.id, userName: actor.nombre }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Error al eliminar el vuelo del itinerario');
    }
    return res.json();
  },

  async updateItineraryGoogleCalendarInfo(id: string, eventId: string, htmlLink?: string): Promise<void> {
    updateItineraryGoogleCalendarInfoInFirestore(id, eventId, htmlLink).catch((err) => {
      console.warn('Error al actualizar Google Calendar info en Firestore:', err);
    });
  },

  // SOLICITUDES DE VUELO (11 AM - 6 PM) & ITINERARIO PUBLICADO (8 PM)
  async getFlightRequestScheduleStatus(): Promise<FlightRequestScheduleStatus> {
    const res = await fetch(`${API_BASE}/flight-requests/schedule-status`);
    if (!res.ok) throw new Error('Error al consultar estado horario de solicitudes');
    return res.json();
  },

  async setFlightRequestSimulatedTime(simulatedTime: string | null, role: string): Promise<FlightRequestScheduleStatus> {
    const res = await fetch(`${API_BASE}/flight-requests/simulated-time`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ simulatedTime, role })
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Error al ajustar hora operativa');
    }
    return res.json();
  },

  async getFlightRequests(params?: { instructorId?: string; status?: FlightRequestStatus; cycleDate?: string; role?: string; userId?: string }): Promise<FlightRequest[]> {
    const qs = new URLSearchParams();
    if (params?.instructorId) qs.set('instructorId', params.instructorId);
    if (params?.status) qs.set('status', params.status);
    if (params?.cycleDate) qs.set('cycleDate', params.cycleDate);
    if (params?.role) qs.set('role', params.role);
    if (params?.userId) qs.set('userId', params.userId);
    const query = qs.toString() ? `?${qs.toString()}` : '';
    const res = await fetch(`${API_BASE}/flight-requests${query}`);
    if (!res.ok) throw new Error('Error al cargar solicitudes de vuelo');
    return res.json();
  },

  async createFlightRequest(data: {
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
    solicitado_por_rol?: string;
  }): Promise<FlightRequest> {
    const res = await fetch(`${API_BASE}/flight-requests`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Error al registrar solicitud de vuelo');
    }
    return res.json();
  },

  async updateFlightRequest(
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
    actor: { id: string; nombre: string; rol: string }
  ): Promise<FlightRequest> {
    const res = await fetch(`${API_BASE}/flight-requests/${requestId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...updates, role: actor.rol, userId: actor.id, userName: actor.nombre })
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Error al actualizar solicitud/vuelo');
    }
    return res.json();
  },

  async deleteFlightRequest(
    requestId: string,
    actor: { id: string; nombre: string; rol: string }
  ): Promise<{ success: boolean }> {
    const res = await fetch(`${API_BASE}/flight-requests/${requestId}`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ role: actor.rol, userId: actor.id, userName: actor.nombre })
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Error al eliminar solicitud/vuelo');
    }
    return res.json();
  },

  async decideFlightRequest(
    requestId: string,
    decision: 'aprobada' | 'rechazada',
    chief: { id: string; nombre: string; rol: string },
    motivo_rechazo?: string
  ): Promise<FlightRequest> {
    const res = await fetch(`${API_BASE}/flight-requests/${requestId}/decision`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        decision,
        chiefId: chief.id,
        chiefName: chief.nombre,
        chiefRole: chief.rol,
        motivo_rechazo
      })
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Error al procesar decisión del Instructor en Jefe');
    }
    return res.json();
  },

  async runSixPmDispatchBatch(role: string): Promise<{ dispatchedCount: number; requests: FlightRequest[]; timestamp: string }> {
    const res = await fetch(`${API_BASE}/flight-requests/dispatch-6pm`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ role })
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Error al ejecutar corte de las 6:00 PM');
    }
    return res.json();
  },

  async runEightPmPublishBatch(role: string, publishedBy?: string): Promise<{ publication: PublishedDailyItinerary; publishedItineraries: Itinerary[]; publishedCount: number }> {
    const res = await fetch(`${API_BASE}/flight-requests/publish-8pm`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ role, publishedBy })
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Error al publicar itinerario oficial de las 8:00 PM');
    }
    return res.json();
  },

  async getPublishedDailyItineraries(role: string): Promise<{ publications: PublishedDailyItinerary[]; itineraries: Itinerary[]; restricted?: boolean }> {
    const res = await fetch(`${API_BASE}/published-itineraries?role=${encodeURIComponent(role)}`);
    if (res.status === 403) {
      return { publications: [], itineraries: [], restricted: true };
    }
    if (!res.ok) throw new Error('Error al cargar itinerario publicado');
    return res.json();
  },

  // EMAIL NOTIFICATIONS
  async getEmailLogs(role?: string): Promise<EmailNotification[]> {
    const url = role ? `${API_BASE}/email/logs?role=${encodeURIComponent(role)}` : `${API_BASE}/email/logs`;
    const res = await fetch(url);
    if (!res.ok) throw new Error('Error al cargar historial de correos');
    return res.json();
  },

  async getEmailConfig(): Promise<{ success: boolean; config: any; hasResendKey: boolean; hasSendgridKey: boolean; hasSmtp: boolean }> {
    const res = await fetch(`${API_BASE}/email/config`);
    if (!res.ok) throw new Error('Error al obtener configuración de correo');
    return res.json();
  },

  async updateEmailConfig(config: any): Promise<{ success: boolean; message: string; config: any }> {
    const res = await fetch(`${API_BASE}/email/config`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(config),
    });
    if (!res.ok) throw new Error('Error al guardar configuración de correo');
    return res.json();
  },

  async testEmailConnection(toEmail?: string, recipientName?: string): Promise<{ success: boolean; provider: string; messageId?: string; status: string; error?: string }> {
    const res = await fetch(`${API_BASE}/email/test-connection`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ toEmail, recipientName }),
    });
    if (!res.ok) throw new Error('Error al realizar prueba de envío de correo');
    return res.json();
  },

  async sendDirectEmail(data: { toEmail: string; recipientName: string; subject: string; message: string; recipientType?: string }): Promise<{ success: boolean; notification: EmailNotification }> {
    const res = await fetch(`${API_BASE}/email/send-direct`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error('Error al enviar correo electrónico');
    return res.json();
  },

  // --- BRANDING & EMAIL TEMPLATES API ---
  async getEmailBrandConfig(): Promise<{ success: boolean; brandConfig: import('../types').EmailBrandConfig }> {
    const res = await fetch(`${API_BASE}/email/brand-config`);
    if (!res.ok) throw new Error('Error al obtener la identidad de marca');
    return res.json();
  },

  async updateEmailBrandConfig(data: Partial<import('../types').EmailBrandConfig>): Promise<{ success: boolean; message: string; brandConfig: import('../types').EmailBrandConfig }> {
    const res = await fetch(`${API_BASE}/email/brand-config`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error('Error al actualizar la identidad de marca');
    return res.json();
  },

  async resetEmailBrandConfig(): Promise<{ success: boolean; message: string; brandConfig: import('../types').EmailBrandConfig }> {
    const res = await fetch(`${API_BASE}/email/brand-config/reset`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });
    if (!res.ok) throw new Error('Error al restablecer la identidad de marca');
    return res.json();
  },

  async getEmailTemplates(): Promise<{ success: boolean; templates: import('../types').EmailTemplateItem[] }> {
    const res = await fetch(`${API_BASE}/email/templates`);
    if (!res.ok) throw new Error('Error al obtener las plantillas de correo');
    return res.json();
  },

  async getEmailTemplate(key: string): Promise<{ success: boolean; template: import('../types').EmailTemplateItem }> {
    const res = await fetch(`${API_BASE}/email/templates/${key}`);
    if (!res.ok) throw new Error('Error al obtener la plantilla');
    return res.json();
  },

  async updateEmailTemplate(key: string, data: Partial<import('../types').EmailTemplateItem>): Promise<{ success: boolean; message: string; template: import('../types').EmailTemplateItem }> {
    const res = await fetch(`${API_BASE}/email/templates/${key}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error('Error al actualizar la plantilla');
    return res.json();
  },

  async resetEmailTemplate(key: string): Promise<{ success: boolean; message: string; template: import('../types').EmailTemplateItem }> {
    const res = await fetch(`${API_BASE}/email/templates/${key}/reset`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });
    if (!res.ok) throw new Error('Error al restablecer la plantilla');
    return res.json();
  },

  async previewEmailRender(payload: {
    key?: string;
    customHtml?: string;
    customSubject?: string;
    customBrand?: Partial<import('../types').EmailBrandConfig>;
    sampleVariables?: Record<string, string>;
  }): Promise<{ success: boolean; rendered: { subject: string; html: string; text: string } }> {
    const res = await fetch(`${API_BASE}/email/preview-render`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error('Error al previsualizar la plantilla');
    return res.json();
  },

  async getEmailRules(): Promise<{ success: boolean; rules: import('../types').RoleNotificationRule[] }> {
    const res = await fetch(`${API_BASE}/email/rules`);
    if (!res.ok) throw new Error('Error al obtener reglas de notificación');
    return res.json();
  },

  async updateEmailRule(id: string, updates: Partial<import('../types').RoleNotificationRule>): Promise<{ success: boolean; rule: import('../types').RoleNotificationRule }> {
    const res = await fetch(`${API_BASE}/email/rules/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    });
    if (!res.ok) throw new Error('Error al actualizar regla');
    return res.json();
  },

  async resetEmailRules(): Promise<{ success: boolean; rules: import('../types').RoleNotificationRule[] }> {
    const res = await fetch(`${API_BASE}/email/rules/reset`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });
    if (!res.ok) throw new Error('Error al reiniciar reglas');
    return res.json();
  },

  async markEmailAsRead(id: string): Promise<{ success: boolean }> {
    const res = await fetch(`${API_BASE}/email/mark-read`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    });
    if (!res.ok) throw new Error('Error al marcar correo como leído');
    return res.json();
  },

  async markAllEmailsAsRead(recipientEmail?: string): Promise<{ success: boolean; count: number }> {
    const res = await fetch(`${API_BASE}/email/mark-all-read`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ recipientEmail }),
    });
    if (!res.ok) throw new Error('Error al marcar todos como leídos');
    return res.json();
  },

  async dispatchEmailAlert(alertType: string, payload?: any): Promise<{ success: boolean; message?: string; count?: number }> {
    const res = await fetch(`${API_BASE}/email/dispatch-alert`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ alertType, ...(payload || {}) }),
    });
    if (!res.ok) throw new Error('Error al despachar alerta operacional');
    return res.json();
  },

  async scanAndDispatchAllAlerts(): Promise<{ success: boolean; message: string; stats: any }> {
    const res = await fetch(`${API_BASE}/email/scan-and-alert`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });
    if (!res.ok) throw new Error('Error al ejecutar escaneo general de alertas');
    return res.json();
  },

  // METEOROLOGÍA AERONÁUTICA (METAR & TAF)
  async getPanamaWeather(): Promise<import('../types').PanamaWeatherResponse> {
    const res = await fetch(`${API_BASE}/weather/panama`);
    if (!res.ok) throw new Error('Error al consultar meteorología de Panamá');
    return res.json();
  },

  async lookupAirportWeather(icao: string): Promise<import('../types').PanamaWeatherResponse> {
    const res = await fetch(`${API_BASE}/weather/lookup?icao=${encodeURIComponent(icao)}`);
    if (!res.ok) throw new Error('Error al consultar aeropuerto');
    return res.json();
  },

  // BUSCADOR UNIVERSAL
  async searchPlatform(query: string, category?: string): Promise<import('../types').GlobalSearchResponse> {
    const params = new URLSearchParams();
    if (query) params.append('q', query);
    if (category && category !== 'all') params.append('category', category);
    const queryString = params.toString() ? `?${params.toString()}` : '';
    const res = await fetch(`${API_BASE}/search${queryString}`);
    if (!res.ok) throw new Error('Error al ejecutar búsqueda global');
    return res.json();
  },

  // REPORTE DE HORAS - MOTOR DE HOJA DE CÁLCULO (EXCEL / GOOGLE SHEETS)
  async getHoursSpreadsheet(): Promise<{ success: boolean; workbook: import('../types').SpreadsheetWorkbook }> {
    const res = await fetch(`${API_BASE}/spreadsheet/hours`);
    if (!res.ok) throw new Error('Error al obtener reporte de horas');
    return res.json();
  },

  async saveHoursSpreadsheet(workbook: import('../types').SpreadsheetWorkbook): Promise<{ success: boolean; message: string; workbook: import('../types').SpreadsheetWorkbook }> {
    const res = await fetch(`${API_BASE}/spreadsheet/hours`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(workbook)
    });
    if (!res.ok) throw new Error('Error al guardar reporte de horas');
    return res.json();
  },

  async syncHoursSpreadsheet(): Promise<{ success: boolean; message: string; workbook: import('../types').SpreadsheetWorkbook }> {
    const res = await fetch(`${API_BASE}/spreadsheet/hours/sync`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });
    if (!res.ok) throw new Error('Error al sincronizar reporte de horas con vuelos');
    return res.json();
  },

  async resetHoursSpreadsheet(): Promise<{ success: boolean; message: string; workbook: import('../types').SpreadsheetWorkbook }> {
    const res = await fetch(`${API_BASE}/spreadsheet/hours/reset`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });
    if (!res.ok) throw new Error('Error al restablecer reporte de horas');
    return res.json();
  },

  // EXCEL INDIVIDUAL DE HONORARIOS POR INSTRUCTOR
  async getInstructorFeeExcelDirectory(actor: { id: string; rol: string }): Promise<{
    success: boolean;
    directory: import('../types').InstructorFeeExcelIndexItem[];
  }> {
    const res = await fetch(`${API_BASE}/instructor-fees/excel/directory`, {
      headers: {
        'x-user-role': actor.rol,
        'x-user-id': actor.id
      }
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Error al obtener directorio Excel de honorarios');
    }
    return res.json();
  },

  async getInstructorFeeExcelWorkbook(
    instructorId: string,
    actor: { id: string; rol: string }
  ): Promise<{
    success: boolean;
    workbook: import('../types').SpreadsheetWorkbook;
    hasCustomEdits: boolean;
    fileName: string;
  }> {
    const res = await fetch(`${API_BASE}/instructor-fees/excel/${encodeURIComponent(instructorId)}`, {
      headers: {
        'x-user-role': actor.rol,
        'x-user-id': actor.id
      }
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Error al obtener archivo Excel del instructor');
    }
    return res.json();
  },

  async saveInstructorFeeExcelWorkbook(
    instructorId: string,
    workbook: import('../types').SpreadsheetWorkbook,
    actor: { id: string; rol: string; nombre: string }
  ): Promise<{
    success: boolean;
    workbook: import('../types').SpreadsheetWorkbook;
    hasCustomEdits: boolean;
    fileName: string;
  }> {
    const res = await fetch(`${API_BASE}/instructor-fees/excel/${encodeURIComponent(instructorId)}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'x-user-role': actor.rol,
        'x-user-id': actor.id,
        'x-user-name': actor.nombre
      },
      body: JSON.stringify({ workbook, actorRole: actor.rol, actorName: actor.nombre })
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Error al guardar archivo Excel de honorarios');
    }
    return res.json();
  },

  async syncInstructorFeeExcelWorkbook(
    instructorId: string,
    actor: { id: string; rol: string }
  ): Promise<{
    success: boolean;
    workbook: import('../types').SpreadsheetWorkbook;
    hasCustomEdits: boolean;
    fileName: string;
  }> {
    const res = await fetch(`${API_BASE}/instructor-fees/excel/${encodeURIComponent(instructorId)}/sync`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-user-role': actor.rol,
        'x-user-id': actor.id
      },
      body: JSON.stringify({ actorRole: actor.rol })
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Error al sincronizar archivo Excel de honorarios');
    }
    return res.json();
  },

  // DASHBOARD FINANCIERO Y RENTABILIDAD
  async getFinancialSummary(anio?: number): Promise<import('../types').FinancialDashboardSummary> {
    const query = anio ? `?anio=${anio}` : '';
    const res = await fetch(`${API_BASE}/finances/summary${query}`);
    if (!res.ok) throw new Error('Error al obtener resumen financiero');
    return res.json();
  },

  async getOperatingExpenses(filters?: { categoria?: string; anio?: number; mes?: string; matricula?: string }): Promise<import('../types').OperatingExpense[]> {
    const params = new URLSearchParams();
    if (filters?.categoria) params.append('categoria', filters.categoria);
    if (filters?.anio) params.append('anio', String(filters.anio));
    if (filters?.mes) params.append('mes', filters.mes);
    if (filters?.matricula) params.append('matricula', filters.matricula);
    const queryString = params.toString() ? `?${params.toString()}` : '';
    const res = await fetch(`${API_BASE}/finances/expenses${queryString}`);
    if (!res.ok) throw new Error('Error al obtener gastos operativos');
    return res.json();
  },

  async createOperatingExpense(data: Omit<import('../types').OperatingExpense, 'id' | 'creado_en'>): Promise<import('../types').OperatingExpense> {
    const res = await fetch(`${API_BASE}/finances/expenses`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    if (!res.ok) throw new Error('Error al crear gasto operativo');
    return res.json();
  },

  async updateOperatingExpense(id: string, updates: Partial<import('../types').OperatingExpense>): Promise<import('../types').OperatingExpense> {
    const res = await fetch(`${API_BASE}/finances/expenses/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates)
    });
    if (!res.ok) throw new Error('Error al actualizar gasto operativo');
    return res.json();
  },

  async deleteOperatingExpense(id: string): Promise<void> {
    const res = await fetch(`${API_BASE}/finances/expenses/${id}`, {
      method: 'DELETE'
    });
    if (!res.ok) throw new Error('Error al eliminar gasto operativo');
  },

  // CONFIGURACIÓN DE WHATSAPP BUSINESS & DISPARADORES AUTOMÁTICOS
  async getWhatsAppConfig(): Promise<import('../types').WhatsAppConfig> {
    const res = await fetch(`${API_BASE}/whatsapp/config`);
    if (!res.ok) throw new Error('Error al obtener configuración de WhatsApp');
    return res.json();
  },

  async updateWhatsAppConfig(updates: Partial<import('../types').WhatsAppConfig>): Promise<import('../types').WhatsAppConfig> {
    const res = await fetch(`${API_BASE}/whatsapp/config`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates)
    });
    if (!res.ok) throw new Error('Error al actualizar configuración de WhatsApp');
    return res.json();
  },

  async verifyWhatsAppConnection(): Promise<{ success: boolean; message: string; config: import('../types').WhatsAppConfig }> {
    const res = await fetch(`${API_BASE}/whatsapp/verify-connection`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });
    if (!res.ok) throw new Error('Error al verificar conexión de WhatsApp');
    return res.json();
  },

  async generateWhatsAppQR(): Promise<{ qrCode: string; expiresAt: string }> {
    const res = await fetch(`${API_BASE}/whatsapp/generate-qr`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });
    if (!res.ok) throw new Error('Error al generar código QR de WhatsApp');
    return res.json();
  },

  async getWhatsAppTriggers(): Promise<import('../types').WhatsAppTrigger[]> {
    const res = await fetch(`${API_BASE}/whatsapp/triggers`);
    if (!res.ok) throw new Error('Error al obtener disparadores');
    return res.json();
  },

  async updateWhatsAppTrigger(id: string, updates: Partial<import('../types').WhatsAppTrigger>): Promise<import('../types').WhatsAppTrigger> {
    const res = await fetch(`${API_BASE}/whatsapp/triggers/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates)
    });
    if (!res.ok) throw new Error('Error al actualizar disparador');
    return res.json();
  },

  async toggleWhatsAppTrigger(id: string, activo?: boolean): Promise<import('../types').WhatsAppTrigger> {
    const res = await fetch(`${API_BASE}/whatsapp/triggers/${id}/toggle`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ activo })
    });
    if (!res.ok) throw new Error('Error al alternar estado del disparador');
    return res.json();
  },

  async sendTestWhatsAppMessage(params: {
    destinatario_nombre: string;
    destinatario_telefono: string;
    mensaje: string;
    trigger_id?: string;
  }): Promise<import('../types').WhatsAppLogMessage> {
    const res = await fetch(`${API_BASE}/whatsapp/test-message`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params)
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Error al enviar mensaje de prueba');
    }
    return res.json();
  },

  async getWhatsAppLogs(filters?: { trigger_id?: string; estado?: string; search?: string }): Promise<import('../types').WhatsAppLogMessage[]> {
    const params = new URLSearchParams();
    if (filters?.trigger_id) params.append('trigger_id', filters.trigger_id);
    if (filters?.estado) params.append('estado', filters.estado);
    if (filters?.search) params.append('search', filters.search);
    const queryString = params.toString() ? `?${params.toString()}` : '';
    const res = await fetch(`${API_BASE}/whatsapp/logs${queryString}`);
    if (!res.ok) throw new Error('Error al obtener registro de mensajes');
    return res.json();
  },

  async executeScheduledTriggers(): Promise<import('../types').WhatsAppTriggerExecutionResult> {
    const res = await fetch(`${API_BASE}/whatsapp/execute-triggers`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });
    if (!res.ok) throw new Error('Error al ejecutar disparadores automáticos');
    return res.json();
  },

  // ==========================================
  // AUDITORÍA Y TRAZABILIDAD REGULATORIA
  // ==========================================
  async getAuditLogs(filters?: import('../types').AuditLogFilter): Promise<import('../types').AuditLogEntry[]> {
    const params = new URLSearchParams();
    if (filters?.modulo && filters.modulo !== 'todos') params.append('modulo', filters.modulo);
    if (filters?.accion && filters.accion !== 'todos') params.append('accion', filters.accion);
    if (filters?.rol && filters.rol !== 'todos') params.append('rol', filters.rol);
    if (filters?.usuario_id && filters.usuario_id !== 'todos') params.append('usuario_id', filters.usuario_id);
    if (filters?.studentId && filters.studentId !== 'todos') params.append('studentId', filters.studentId);
    if (filters?.instructor_id && filters.instructor_id !== 'todos') params.append('instructor_id', filters.instructor_id);
    if (filters?.tipo_entidad && filters.tipo_entidad !== 'todos') params.append('tipo_entidad', filters.tipo_entidad);
    if (filters?.severidad && filters.severidad !== 'todos') params.append('severidad', filters.severidad);
    if (filters?.fecha_desde) params.append('fecha_desde', filters.fecha_desde);
    if (filters?.fecha_hasta) params.append('fecha_hasta', filters.fecha_hasta);
    if (filters?.busqueda) params.append('busqueda', filters.busqueda);

    const queryString = params.toString() ? `?${params.toString()}` : '';
    const res = await fetch(`${API_BASE}/audit-logs${queryString}`);
    if (!res.ok) throw new Error('Error al obtener registros de auditoría');
    return res.json();
  },

  async getAuditStats(): Promise<import('../types').AuditLogStats> {
    const res = await fetch(`${API_BASE}/audit-logs/stats`);
    if (!res.ok) throw new Error('Error al obtener estadísticas de auditoría');
    return res.json();
  },

  async verifyAuditTrail(): Promise<{ isValid: boolean; checkedCount: number; brokenIndex?: number; sealTimestamp: string; latestHash: string }> {
    const res = await fetch(`${API_BASE}/audit-logs/verify`);
    if (!res.ok) throw new Error('Error al verificar integridad criptográfica');
    return res.json();
  },

  async exportAuditReport(filters?: import('../types').AuditLogFilter): Promise<{
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
    logs: import('../types').AuditLogEntry[];
  }> {
    const params = new URLSearchParams();
    if (filters?.modulo && filters.modulo !== 'todos') params.append('modulo', filters.modulo);
    if (filters?.accion && filters.accion !== 'todos') params.append('accion', filters.accion);
    if (filters?.rol && filters.rol !== 'todos') params.append('rol', filters.rol);
    if (filters?.usuario_id && filters.usuario_id !== 'todos') params.append('usuario_id', filters.usuario_id);
    if (filters?.studentId && filters.studentId !== 'todos') params.append('studentId', filters.studentId);
    if (filters?.instructor_id && filters.instructor_id !== 'todos') params.append('instructor_id', filters.instructor_id);
    if (filters?.tipo_entidad && filters.tipo_entidad !== 'todos') params.append('tipo_entidad', filters.tipo_entidad);
    if (filters?.severidad && filters.severidad !== 'todos') params.append('severidad', filters.severidad);
    if (filters?.fecha_desde) params.append('fecha_desde', filters.fecha_desde);
    if (filters?.fecha_hasta) params.append('fecha_hasta', filters.fecha_hasta);
    if (filters?.busqueda) params.append('busqueda', filters.busqueda);

    const queryString = params.toString() ? `?${params.toString()}` : '';
    const res = await fetch(`${API_BASE}/audit-logs/export${queryString}`);
    if (!res.ok) throw new Error('Error al exportar informe de auditoría');
    return res.json();
  },

  async getAuditLogById(id: string): Promise<import('../types').AuditLogEntry> {
    const res = await fetch(`${API_BASE}/audit-logs/${id}`);
    if (!res.ok) throw new Error('Error al obtener registro de auditoría');
    return res.json();
  },

  async createAuditLog(entry: Partial<import('../types').AuditLogEntry>): Promise<import('../types').AuditLogEntry> {
    const res = await fetch(`${API_BASE}/audit-logs`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(entry)
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Error al crear evento de auditoría');
    }
    return res.json();
  },

  // --- PAGOS CON TARJETA Y LINKS DE PAGO ---
  async processCardPayment(payload: import('../types').CardPaymentPayload): Promise<{
    success: boolean;
    transaction: import('../types').Transaction;
    balance: number;
    authCode: string;
  }> {
    const res = await fetch(`${API_BASE}/payments/process-card`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Error al procesar el pago con tarjeta');
    }
    return res.json();
  },

  async getPaymentLinks(studentId?: string): Promise<{ success: boolean; links: import('../types').PaymentLink[] }> {
    const url = studentId ? `${API_BASE}/payments/links?studentId=${encodeURIComponent(studentId)}` : `${API_BASE}/payments/links`;
    const res = await fetch(url);
    if (!res.ok) throw new Error('Error al obtener enlaces de pago');
    return res.json();
  },

  async createPaymentLink(payload: import('../types').CreatePaymentLinkInput): Promise<{
    success: boolean;
    link: import('../types').PaymentLink;
  }> {
    const res = await fetch(`${API_BASE}/payments/links`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Error al generar el link de pago');
    }
    return res.json();
  },

  async getPaymentLinkByToken(token: string): Promise<{ success: boolean; link: import('../types').PaymentLink }> {
    const res = await fetch(`${API_BASE}/payments/links/${encodeURIComponent(token)}`);
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Error al consultar link de pago');
    }
    return res.json();
  },

  async payPaymentLink(token: string, paymentData: import('../types').CardPaymentPayload): Promise<{
    success: boolean;
    transaction: import('../types').Transaction;
    link: import('../types').PaymentLink;
  }> {
    const res = await fetch(`${API_BASE}/payments/links/${encodeURIComponent(token)}/pay`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(paymentData)
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Error al pagar el link');
    }
    return res.json();
  },

  async cancelPaymentLink(id: string): Promise<{ success: boolean }> {
    const res = await fetch(`${API_BASE}/payments/links/${encodeURIComponent(id)}`, {
      method: 'DELETE'
    });
    if (!res.ok) throw new Error('Error al cancelar el link de pago');
    return res.json();
  },

  // --- HONORARIOS DE INSTRUCTORES DE VUELO (LIQUIDACIÓN DESDE BITÁCORAS) ---
  async getInstructorFees(params?: {
    instructorId?: string;
    status?: string;
    search?: string;
  }): Promise<InstructorFeeStatement[]> {
    const query = new URLSearchParams();
    if (params?.instructorId) query.set('instructorId', params.instructorId);
    if (params?.status) query.set('status', params.status);
    if (params?.search) query.set('search', params.search);

    const qs = query.toString();
    const url = `${API_BASE}/instructor-fees${qs ? `?${qs}` : ''}`;
    const res = await fetch(url);
    if (!res.ok) {
      throw new Error('Error al consultar liquidaciones de honorarios');
    }
    return res.json();
  },

  async getInstructorFeeById(id: string): Promise<InstructorFeeStatement> {
    const res = await fetch(`${API_BASE}/instructor-fees/${encodeURIComponent(id)}`);
    if (!res.ok) {
      throw new Error('Error al consultar liquidación de honorarios');
    }
    return res.json();
  },

  async registerBitacoraHonorario(payload: RegisterBitacoraHonorarioInput): Promise<InstructorFeeStatement> {
    const res = await fetch(`${API_BASE}/instructor-fees/register-from-bitacora`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Error al registrar bitácora y crear honorario');
    }
    return res.json();
  },

  async recordFlightLog(payload: RecordFlightLogInput): Promise<RecordFlightLogResponse> {
    const res = await fetch(`${API_BASE}/aircraft-logbooks/record-flight`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Error al registrar vuelo en bitácora');
    }
    return res.json();
  },

  async generateInstructorFees(payload: GenerateInstructorFeesInput & { instructorQuery?: string }): Promise<InstructorFeeStatement> {
    const res = await fetch(`${API_BASE}/instructor-fees/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Error al generar honorarios desde las bitácoras');
    }
    return res.json();
  },

  async createInstructorFeeStatement(stmt: InstructorFeeStatement): Promise<InstructorFeeStatement> {
    const res = await fetch(`${API_BASE}/instructor-fees`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(stmt)
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Error al guardar liquidación');
    }
    return res.json();
  },

  async updateInstructorFeeStatus(
    id: string,
    update: {
      estado: InstructorFeeStatus;
      notas_contabilidad?: string;
      banco_pago?: string;
      referencia_pago_ach?: string;
      procesado_por?: string;
    }
  ): Promise<InstructorFeeStatement> {
    const res = await fetch(`${API_BASE}/instructor-fees/${encodeURIComponent(id)}/status`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(update)
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Error al actualizar estado de la liquidación');
    }
    return res.json();
  },

  async deleteInstructorFeeStatement(id: string): Promise<{ success: boolean }> {
    const res = await fetch(`${API_BASE}/instructor-fees/${encodeURIComponent(id)}`, {
      method: 'DELETE'
    });
    if (!res.ok) {
      throw new Error('Error al eliminar la liquidación');
    }
    return res.json();
  },

  // ==========================================
  // TALLER AERONÁUTICO & MANTENIMIENTO (OMA/TMA)
  // ==========================================
  async getAircraftMaintenanceRecords(): Promise<AircraftMaintenanceRecord[]> {
    const res = await fetch(`${API_BASE}/maintenance/aircraft`);
    if (!res.ok) throw new Error('Error al consultar récords de mantenimiento de aeronaves');
    return res.json();
  },

  async getAircraftMaintenanceRecord(matricula: string): Promise<AircraftMaintenanceRecord> {
    const res = await fetch(`${API_BASE}/maintenance/aircraft/${encodeURIComponent(matricula)}`);
    if (!res.ok) throw new Error('Error al consultar récord de la aeronave');
    return res.json();
  },

  async updateAircraftMaintenanceRecord(matricula: string, patch: Partial<AircraftMaintenanceRecord>): Promise<AircraftMaintenanceRecord> {
    const res = await fetch(`${API_BASE}/maintenance/aircraft/${encodeURIComponent(matricula)}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(patch)
    });
    if (!res.ok) throw new Error('Error al actualizar aeronave');
    return res.json();
  },

  async toggleAircraftGroundLock(
    matricula: string,
    data: {
      locked: boolean;
      reason?: string;
      authorizedBy?: string;
      licenciaTMA?: string;
      resetOverdueCounters?: boolean;
      resolveAogSquawks?: boolean;
      nextCondition?: AirworthinessCondition;
      ubicacion_hangar?: string;
    }
  ): Promise<{ success: boolean; aircraft: AircraftMaintenanceRecord; message: string }> {
    const res = await fetch(`${API_BASE}/maintenance/aircraft/${encodeURIComponent(matricula)}/ground-lock`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Error al modificar bloqueo en tierra');
    }
    return res.json();
  },

  async getMaintenanceWorkOrders(filter?: { matricula?: string; estado?: WorkOrderStatus; tipo?: WorkOrderType }): Promise<MaintenanceWorkOrder[]> {
    const params = new URLSearchParams();
    if (filter?.matricula && filter.matricula !== 'TODAS') params.append('matricula', filter.matricula);
    if (filter?.estado) params.append('estado', filter.estado);
    if (filter?.tipo) params.append('tipo', filter.tipo);
    const query = params.toString() ? `?${params.toString()}` : '';
    const res = await fetch(`${API_BASE}/maintenance/work-orders${query}`);
    if (!res.ok) throw new Error('Error al consultar órdenes de trabajo');
    return res.json();
  },

  async getMaintenanceWorkOrderById(id: string): Promise<MaintenanceWorkOrder> {
    const res = await fetch(`${API_BASE}/maintenance/work-orders/${encodeURIComponent(id)}`);
    if (!res.ok) throw new Error('Error al consultar orden de trabajo');
    return res.json();
  },

  async createMaintenanceWorkOrder(order: Omit<MaintenanceWorkOrder, 'id'>): Promise<MaintenanceWorkOrder> {
    const res = await fetch(`${API_BASE}/maintenance/work-orders`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(order)
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Error al emitir orden de trabajo');
    }
    return res.json();
  },

  async updateMaintenanceWorkOrder(id: string, patch: Partial<MaintenanceWorkOrder>, updatedBy?: string): Promise<MaintenanceWorkOrder> {
    const res = await fetch(`${API_BASE}/maintenance/work-orders/${encodeURIComponent(id)}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...patch, updatedBy })
    });
    if (!res.ok) throw new Error('Error al actualizar orden de trabajo');
    return res.json();
  },

  async returnAircraftToService(
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
  ): Promise<{ success: boolean; workOrder: MaintenanceWorkOrder; aircraft: AircraftMaintenanceRecord; message: string }> {
    const res = await fetch(`${API_BASE}/maintenance/work-orders/${encodeURIComponent(workOrderId)}/return-to-service`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(rtsData)
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Error al certificar retorno al servicio');
    }
    return res.json();
  },

  async getMaintenanceSquawks(filter?: { matricula?: string; estado?: SquawkStatus; severidad?: SquawkSeverity }): Promise<MaintenanceSquawk[]> {
    const params = new URLSearchParams();
    if (filter?.matricula && filter.matricula !== 'TODAS') params.append('matricula', filter.matricula);
    if (filter?.estado) params.append('estado', filter.estado);
    if (filter?.severidad) params.append('severidad', filter.severidad);
    const query = params.toString() ? `?${params.toString()}` : '';
    const res = await fetch(`${API_BASE}/maintenance/squawks${query}`);
    if (!res.ok) throw new Error('Error al consultar novedades de mantenimiento');
    return res.json();
  },

  async createMaintenanceSquawk(squawk: Omit<MaintenanceSquawk, 'id'>): Promise<MaintenanceSquawk> {
    const res = await fetch(`${API_BASE}/maintenance/squawks`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(squawk)
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Error al reportar novedad');
    }
    return res.json();
  },

  async resolveMaintenanceSquawk(id: string, resolution: { accion_correctiva: string; resuelto_por: string; resuelto_por_licencia?: string; estado?: SquawkStatus }): Promise<MaintenanceSquawk> {
    const res = await fetch(`${API_BASE}/maintenance/squawks/${encodeURIComponent(id)}/resolve`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(resolution)
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Error al resolver discrepancia mecánica');
    }
    return res.json();
  },

  async getMaintenanceParts(): Promise<MaintenancePartStock[]> {
    const res = await fetch(`${API_BASE}/maintenance/parts`);
    if (!res.ok) throw new Error('Error al consultar repuestos de hangar');
    return res.json();
  },

  async adjustMaintenancePartStock(id: string, delta: number, motivo?: string, updatedBy?: string): Promise<MaintenancePartStock> {
    const res = await fetch(`${API_BASE}/maintenance/parts/${encodeURIComponent(id)}/adjust`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ delta, motivo, updatedBy })
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Error al ajustar stock de repuesto');
    }
    return res.json();
  },

  async getAirworthinessDirectives(modelo?: string): Promise<AirworthinessDirective[]> {
    const query = modelo ? `?modelo=${encodeURIComponent(modelo)}` : '';
    const res = await fetch(`${API_BASE}/maintenance/directives${query}`);
    if (!res.ok) throw new Error('Error al consultar directivas ADs');
    return res.json();
  },

  async updateAirworthinessDirective(id: string, patch: Partial<AirworthinessDirective>): Promise<AirworthinessDirective> {
    const res = await fetch(`${API_BASE}/maintenance/directives/${encodeURIComponent(id)}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(patch)
    });
    if (!res.ok) throw new Error('Error al actualizar directiva AD');
    return res.json();
  },

  // HISTORIAL DE ENTRADA Y SALIDA DE AERONAVES (TRAZABILIDAD CON BITÁCORAS)
  async getAircraftMovements(filter?: { matricula?: string; tipo?: MovementType; search?: string }): Promise<AircraftWorkshopMovement[]> {
    const params = new URLSearchParams();
    if (filter?.matricula) params.append('matricula', filter.matricula);
    if (filter?.tipo) params.append('tipo', filter.tipo);
    if (filter?.search) params.append('search', filter.search);
    const qs = params.toString() ? `?${params.toString()}` : '';

    const res = await fetch(`${API_BASE}/maintenance/movements${qs}`);
    if (!res.ok) throw new Error('Error al consultar historial de entradas y salidas de taller');
    return res.json();
  },

  async getAircraftMovementById(id: string): Promise<AircraftWorkshopMovement> {
    const res = await fetch(`${API_BASE}/maintenance/movements/${encodeURIComponent(id)}`);
    if (!res.ok) throw new Error('Error al consultar ficha de movimiento');
    return res.json();
  },

  async createAircraftMovement(data: Omit<AircraftWorkshopMovement, 'id' | 'creado_en'>): Promise<AircraftWorkshopMovement> {
    const res = await fetch(`${API_BASE}/maintenance/movements`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Error al registrar movimiento de aeronave');
    }
    return res.json();
  },

  async updateAircraftMovement(id: string, patch: Partial<AircraftWorkshopMovement>): Promise<AircraftWorkshopMovement> {
    const res = await fetch(`${API_BASE}/maintenance/movements/${encodeURIComponent(id)}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(patch)
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Error al actualizar movimiento de aeronave');
    }
    return res.json();
  }
};

