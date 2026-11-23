/**
 * Google Calendar API Service for SkyOps Flight Itineraries
 * Synchronizes scheduled flights, dual instruction, simulators, and events
 * with personal Google Calendars of students and instructors.
 */

import { Itinerary, User } from '../types';
import { getCachedGoogleAccessToken, requestGoogleAccessTokenWithScopes } from '../firebase/config';

// The required Google Calendar OAuth scopes
export const CALENDAR_SCOPES = [
  'https://www.googleapis.com/auth/calendar.events',
  'https://www.googleapis.com/auth/calendar'
];

export interface GoogleCalendarEvent {
  id?: string;
  summary: string;
  description: string;
  location?: string;
  start: {
    dateTime: string;
    timeZone: string;
  };
  end: {
    dateTime: string;
    timeZone: string;
  };
  attendees?: Array<{
    email: string;
    displayName?: string;
    responseStatus?: string;
  }>;
  reminders?: {
    useDefault: boolean;
    overrides?: Array<{
      method: 'email' | 'popup';
      minutes: number;
    }>;
  };
  colorId?: string; // 1 to 11 for Google Calendar event colors
}

export interface SyncResult {
  success: boolean;
  eventId?: string;
  htmlLink?: string;
  message?: string;
  error?: string;
}

/**
 * Builds Google Calendar event payload from SkyOps Itinerary object
 */
export function formatItineraryToCalendarEvent(itinerary: Itinerary, studentUser?: User, instructorUser?: User): GoogleCalendarEvent {
  // Format Date ISO strings (Panama timezone UTC-5: America/Panama)
  // itinerary.fecha = 'YYYY-MM-DD', hora_inicio = 'HH:mm', hora_fin = 'HH:mm'
  const startDateTime = `${itinerary.fecha}T${itinerary.hora_inicio}:00-05:00`;
  const endDateTime = `${itinerary.fecha}T${itinerary.hora_fin}:00-05:00`;

  let eventTitle = `✈️ Vuelo SkyOps: ${itinerary.avion_matricula} - ${itinerary.mision || 'Instrucción de Vuelo'}`;
  let colorId = '9'; // Blueberry / Sky Blue

  if (itinerary.tipo_evento === 'simulador') {
    eventTitle = `🕹️ Simulador de Vuelo: ${itinerary.mision || 'Sesión IFR'}`;
    colorId = '7'; // Peacock
  } else if (itinerary.tipo_evento === 'mantenimiento') {
    eventTitle = `🔧 Mantenimiento / Taller: ${itinerary.avion_matricula}`;
    colorId = '11'; // Flamingo / Red
  } else if (itinerary.tipo_evento === 'reserva') {
    eventTitle = `🛡️ Guardia / Reserva: ${itinerary.pic || itinerary.instructor_nombre}`;
    colorId = '5'; // Banana / Yellow
  } else if (itinerary.tipo_evento === 'dia_libre') {
    eventTitle = `☕ Día Libre / Descanso: ${itinerary.pic || itinerary.instructor_nombre}`;
    colorId = '8'; // Graphite
  }

  const attendees: Array<{ email: string; displayName?: string }> = [];

  const studentEmail = studentUser?.correo;
  if (studentEmail && studentEmail.includes('@')) {
    attendees.push({
      email: studentEmail.trim(),
      displayName: itinerary.estudiante_nombre || studentUser?.nombre || 'Alumno Piloto'
    });
  }

  const instructorEmail = instructorUser?.correo;
  if (instructorEmail && instructorEmail.includes('@')) {
    attendees.push({
      email: instructorEmail.trim(),
      displayName: itinerary.instructor_nombre || instructorUser?.nombre || 'Instructor CFI'
    });
  }

  const descriptionLines = [
    `🛫 Misión: ${itinerary.mision || 'Instrucción Aeronáutica'}`,
    `🛩️ Aeronave: ${itinerary.avion_matricula} (${itinerary.avion_modelo || 'Piper PA-28 / PA-34'})`,
    `👨‍✈️ Alumno / PIC: ${itinerary.estudiante_nombre} (Tel: ${itinerary.estudiante_telefono || 'N/A'})`,
    `👨‍🏫 Instructor CFI: ${itinerary.instructor_nombre} (Tel: ${itinerary.instructor_telefono || 'N/A'})`,
    `📍 Ruta / Zona: ${itinerary.ruta || 'MPMG / Tráfico Local'}`,
    `⏱️ Tiempo Estimado: ${itinerary.horas || '1.5'} Horas`,
    `📌 Estado SkyOps: ${itinerary.estado.toUpperCase()}`,
    `----------------------------------------`,
    `Itinerario ID: ${itinerary.id}`,
    `Generado y sincronizado automáticamente por SkyOps Aviation System.`
  ];

  return {
    summary: eventTitle,
    description: descriptionLines.join('\n'),
    location: itinerary.ruta || 'Aeropuerto Marcos A. Gelabert (MPMG), Albrook, Panamá',
    start: {
      dateTime: startDateTime,
      timeZone: 'America/Panama'
    },
    end: {
      dateTime: endDateTime,
      timeZone: 'America/Panama'
    },
    attendees: attendees.length > 0 ? attendees : undefined,
    reminders: {
      useDefault: false,
      overrides: [
        { method: 'popup', minutes: 120 }, // 2 horas antes
        { method: 'popup', minutes: 30 },  // 30 minutos antes
        { method: 'email', minutes: 1440 } // 24 horas antes
      ]
    },
    colorId
  };
}

/**
 * Creates or updates an event in Google Calendar
 */
export async function syncItineraryToGoogleCalendar(
  itinerary: Itinerary,
  studentUser?: User,
  instructorUser?: User,
  accessToken?: string | null
): Promise<SyncResult> {
  let token = accessToken || getCachedGoogleAccessToken();

  // If no token cached, prompt via Token Client with scopes
  if (!token) {
    try {
      token = await requestGoogleAccessTokenWithScopes(CALENDAR_SCOPES);
    } catch (authErr: any) {
      console.warn('OAuth authorization not granted for Google Calendar:', authErr);
      return {
        success: false,
        error: authErr?.message || 'No se concedieron permisos para acceder a Google Calendar.'
      };
    }
  }

  if (!token) {
    return {
      success: false,
      error: 'Token de acceso a Google Calendar no disponible.'
    };
  }

  const eventPayload = formatItineraryToCalendarEvent(itinerary, studentUser, instructorUser);

  try {
    let url = 'https://www.googleapis.com/calendar/v3/calendars/primary/events';
    let method = 'POST';

    // If already has Google Calendar Event ID, update existing
    if (itinerary.google_calendar_event_id) {
      url = `https://www.googleapis.com/calendar/v3/calendars/primary/events/${itinerary.google_calendar_event_id}`;
      method = 'PUT';
    }

    const response = await fetch(url, {
      method,
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(eventPayload)
    });

    if (!response.ok) {
      // If event was deleted in Google Calendar or 404, fallback to creating fresh
      if (response.status === 404 && method === 'PUT') {
        const createResponse = await fetch('https://www.googleapis.com/calendar/v3/calendars/primary/events', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(eventPayload)
        });

        if (createResponse.ok) {
          const createdData = await createResponse.json();
          return {
            success: true,
            eventId: createdData.id,
            htmlLink: createdData.htmlLink,
            message: 'Evento creado exitosamente en Google Calendar'
          };
        }
      }

      const errData = await response.json().catch(() => ({}));
      const errorMsg = errData.error?.message || `Error Google Calendar API (${response.status})`;
      return {
        success: false,
        error: errorMsg
      };
    }

    const eventData = await response.json();
    return {
      success: true,
      eventId: eventData.id,
      htmlLink: eventData.htmlLink,
      message: method === 'PUT' ? 'Evento actualizado en Google Calendar' : 'Evento creado en Google Calendar'
    };
  } catch (error: any) {
    console.error('Error sincronizando con Google Calendar:', error);
    return {
      success: false,
      error: error?.message || 'Error de conexión con Google Calendar'
    };
  }
}

/**
 * Deletes a scheduled event from Google Calendar (e.g. cancelled flight)
 */
export async function deleteItineraryFromGoogleCalendar(
  eventId: string,
  accessToken?: string | null
): Promise<{ success: boolean; error?: string }> {
  const token = accessToken || getCachedGoogleAccessToken();
  if (!token) {
    return { success: false, error: 'No hay sesión de Google activa con permisos de Calendar' };
  }

  try {
    const res = await fetch(`https://www.googleapis.com/calendar/v3/calendars/primary/events/${eventId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (!res.ok && res.status !== 404 && res.status !== 410) {
      const err = await res.json().catch(() => ({}));
      return { success: false, error: err?.error?.message || 'Error al eliminar de Google Calendar' };
    }

    return { success: true };
  } catch (err: any) {
    console.error('Error eliminando evento de Google Calendar:', err);
    return { success: false, error: err?.message };
  }
}

/**
 * List upcoming events from primary Google Calendar for validation & conflict avoidance
 */
export async function listUpcomingCalendarEvents(
  timeMin?: string,
  timeMax?: string,
  accessToken?: string | null
): Promise<any[]> {
  const token = accessToken || getCachedGoogleAccessToken();
  if (!token) return [];

  try {
    const params = new URLSearchParams({
      timeMin: timeMin || new Date().toISOString(),
      maxResults: '20',
      singleEvents: 'true',
      orderBy: 'startTime'
    });

    if (timeMax) {
      params.append('timeMax', timeMax);
    }

    const res = await fetch(`https://www.googleapis.com/calendar/v3/calendars/primary/events?${params.toString()}`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (!res.ok) return [];
    const data = await res.json();
    return data.items || [];
  } catch (error) {
    console.error('Error obteniendo eventos de Google Calendar:', error);
    return [];
  }
}
