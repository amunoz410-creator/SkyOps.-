/**
 * Servicio de Correo Electrónico (Email Service Gateway)
 * Despacho automatizado de notificaciones de vuelo vía Email (Resend, SendGrid, SMTP, Simulación)
 * Soporte completo de Personalización de Marca (Logo, Paleta de Colores) y Plantillas HTML editables
 */

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

export interface EmailTemplateItem {
  id: EmailTemplateKey;
  name: string;
  description: string;
  subjectTemplate: string;
  htmlTemplate: string;
  category: 'itinerario' | 'disciplinario' | 'general';
}

export interface EmailConfig {
  provider: 'resend' | 'sendgrid' | 'smtp' | 'simulation';
  fromName: string;
  fromEmail: string;
  resendApiKey?: string;
  sendgridApiKey?: string;
  smtpHost?: string;
  smtpPort?: number;
  smtpUser?: string;
  smtpPassword?: string;
  smtpSecure?: boolean;
  autoSendOnFlightScheduled: boolean;
}

export interface SendEmailPayload {
  toEmail: string;
  recipientName: string;
  subject: string;
  htmlContent: string;
  textContent?: string;
  eventType: string;
  itineraryId?: string;
}

// Logo por defecto en formato SVG estilizado para máxima compatibilidad
const DEFAULT_LOGO_SVG = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" fill="none"><circle cx="50" cy="50" r="48" fill="%230284c7"/><path d="M50 20 L65 52 L50 46 L35 52 Z" fill="%23ffffff"/><path d="M22 62 L50 49 L78 62 L50 56 Z" fill="%2338bdf8"/><circle cx="50" cy="50" r="6" fill="%230f172a"/></svg>`;

export const DEFAULT_BRAND_CONFIG: EmailBrandConfig = {
  brandName: 'SkyOps Flight Academy',
  brandTagline: 'Centro de Instrucción y Despacho Aeronáutico',
  logoUrl: DEFAULT_LOGO_SVG,
  primaryColor: '#0284c7', // Sky Blue Principal
  secondaryColor: '#0369a1', // Deep Sky Blue
  accentColor: '#38bdf8', // Light Sky Cyan
  headerGradientStart: '#0284c7',
  headerGradientEnd: '#0f172a',
  footerText: 'SkyOps Flight Academy • Sistema de Gestión y Despacho Aeronáutico Oficial\nEste correo electrónico fue generado automáticamente por la plataforma de operaciones de vuelo.',
  contactEmail: 'despacho@skyopsacademy.com',
  contactPhone: '+507 317-5500 / +507 6200-8800',
  supportUrl: 'https://skyopsacademy.com'
};

export const DEFAULT_EMAIL_TEMPLATES: Record<EmailTemplateKey, EmailTemplateItem> = {
  flight_scheduled: {
    id: 'flight_scheduled',
    name: 'Nueva Asignación de Vuelo (SLA 3 Horas)',
    description: 'Enviado automáticamente al estudiante e instructor cuando se agenda un nuevo vuelo de instrucción.',
    category: 'itinerario',
    subjectTemplate: '✈️ Asignación de Vuelo: {{airplane_reg}} ({{flight_date}} {{start_time}}) - {{brand_name}}',
    htmlTemplate: `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Asignación de Vuelo - {{brand_name}}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #0f172a; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #334155;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #0f172a; padding: 32px 12px;">
    <tr>
      <td align="center">
        <!-- Main Card Container -->
        <table role="presentation" width="100%" style="max-width: 620px; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 12px 30px rgba(0,0,0,0.35); border: 1px solid #334155;">
          
          <!-- Header Banner with Brand Color Gradient -->
          <tr>
            <td style="background: linear-gradient(135deg, {{header_gradient_start}} 0%, {{secondary_color}} 50%, {{header_gradient_end}} 100%); padding: 32px 28px; text-align: left;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                <tr>
                  <td style="vertical-align: middle; width: 64px;">
                    <img src="{{brand_logo_url}}" alt="{{brand_name}}" width="54" height="54" style="border-radius: 12px; display: block; border: 2px solid rgba(255,255,255,0.3); background: rgba(255,255,255,0.15);" />
                  </td>
                  <td style="vertical-align: middle; padding-left: 16px;">
                    <div style="display: inline-block; padding: 4px 10px; background: rgba(255,255,255,0.18); border-radius: 20px; font-size: 10px; font-weight: 700; color: {{accent_color}}; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 6px; border: 1px solid rgba(255,255,255,0.25);">
                      ✈️ Despacho de Vuelo Oficial
                    </div>
                    <h1 style="margin: 0; font-size: 22px; font-weight: 800; color: #ffffff; line-height: 1.2;">
                      {{brand_name}}
                    </h1>
                    <p style="margin: 4px 0 0 0; font-size: 13px; color: #bae6fd;">
                      {{brand_tagline}}
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Body Content -->
          <tr>
            <td style="padding: 32px 28px;">
              <p style="margin: 0 0 16px 0; font-size: 16px; color: #1e293b; line-height: 1.5;">
                Estimado/a <strong>{{student_name}}</strong>,
              </p>
              <p style="margin: 0 0 24px 0; font-size: 14px; color: #475569; line-height: 1.6;">
                Se ha programado una nueva misión de entrenamiento en el planificador de vuelos. A continuación encontrarás todos los detalles operacionales asignados:
              </p>

              <!-- Flight Information Table / Card -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; margin-bottom: 24px;">
                <tr>
                  <td style="padding: 20px;">
                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                      <tr>
                        <td width="50%" style="padding-bottom: 14px; vertical-align: top;">
                          <div style="font-size: 11px; color: #64748b; font-weight: 700; text-transform: uppercase;">📅 Fecha Programada</div>
                          <div style="font-size: 14px; color: #0f172a; font-weight: 800; margin-top: 2px;">{{flight_date}}</div>
                        </td>
                        <td width="50%" style="padding-bottom: 14px; vertical-align: top;">
                          <div style="font-size: 11px; color: #64748b; font-weight: 700; text-transform: uppercase;">⏰ Bloque Horario</div>
                          <div style="font-size: 14px; color: {{primary_color}}; font-weight: 800; margin-top: 2px;">{{start_time}} - {{end_time}}</div>
                        </td>
                      </tr>
                      <tr>
                        <td width="50%" style="padding-bottom: 14px; vertical-align: top;">
                          <div style="font-size: 11px; color: #64748b; font-weight: 700; text-transform: uppercase;">🛩️ Aeronave Asignada</div>
                          <div style="font-size: 14px; color: #0f172a; font-weight: 800; margin-top: 2px;">{{airplane_reg}}</div>
                          <div style="font-size: 12px; color: #64748b;">{{airplane_model}}</div>
                        </td>
                        <td width="50%" style="padding-bottom: 14px; vertical-align: top;">
                          <div style="font-size: 11px; color: #64748b; font-weight: 700; text-transform: uppercase;">👨‍✈️ Instructor de Vuelo</div>
                          <div style="font-size: 14px; color: #0f172a; font-weight: 800; margin-top: 2px;">{{instructor_name}}</div>
                          <div style="font-size: 12px; color: #64748b;">{{instructor_phone}}</div>
                        </td>
                      </tr>
                      <tr>
                        <td colspan="2" style="padding-top: 10px; border-top: 1px dashed #cbd5e1;">
                          <div style="font-size: 11px; color: #64748b; font-weight: 700; text-transform: uppercase;">🎯 Misión / Lección</div>
                          <div style="font-size: 13px; color: #1e293b; font-weight: 700; margin-top: 2px;">{{mission}}</div>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <!-- SLA Warning Box -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #ecfdf5; border: 1px solid #a7f3d0; border-radius: 12px; margin-bottom: 28px;">
                <tr>
                  <td style="padding: 16px;">
                    <div style="display: table; width: 100%;">
                      <div style="display: table-cell; width: 28px; vertical-align: top; font-size: 20px;">⏳</div>
                      <div style="display: table-cell; vertical-align: top; padding-left: 8px;">
                        <strong style="font-size: 13px; color: #065f46;">Plazo de Confirmación Obligatorio (SLA 3 Horas):</strong>
                        <p style="margin: 4px 0 0 0; font-size: 12px; color: #047857; line-height: 1.4;">
                          Tienes <strong>3 horas</strong> (hasta las <strong>{{deadline_hour}}</strong>) para aceptar o cancelar tu vuelo. Se enviarán recordatorios automáticos cada 30 minutos.
                        </p>
                      </div>
                    </div>
                  </td>
                </tr>
              </table>

              <!-- Action Call to Action -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin-bottom: 24px;">
                <tr>
                  <td align="center">
                    <p style="font-size: 13px; color: #475569; margin: 0 0 14px 0;">
                      Ingresa al portal de la academia para responder a tu asignación:
                    </p>
                    <a href="{{support_url}}" style="background-color: {{primary_color}}; color: #ffffff; font-weight: 700; font-size: 14px; text-decoration: none; padding: 12px 28px; border-radius: 8px; display: inline-block; box-shadow: 0 4px 8px rgba(0,0,0,0.15);">
                      ✈️ Abrir Portal de Despacho
                    </a>
                  </td>
                </tr>
              </table>

              <p style="margin: 0; font-size: 12px; color: #94a3b8; line-height: 1.5; text-align: center;">
                Recuerda presentarte 30 minutos antes en el hangar para el briefing meteorológico y cálculo de peso & balance.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #f1f5f9; padding: 20px 28px; border-top: 1px solid #e2e8f0; text-align: center;">
              <p style="margin: 0; font-size: 11px; color: #64748b; line-height: 1.5; white-space: pre-wrap;">{{footer_text}}</p>
              <p style="margin: 8px 0 0 0; font-size: 11px; color: #94a3b8;">Contacto: {{contact_email}} • {{contact_phone}}</p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`
  },

  flight_confirmed: {
    id: 'flight_confirmed',
    name: 'Confirmación de Asistencia a Vuelo',
    description: 'Enviado al estudiante e instructor cuando el alumno confirma su asistencia al vuelo programado.',
    category: 'itinerario',
    subjectTemplate: '✅ Vuelo Confirmado: {{airplane_reg}} ({{flight_date}} {{start_time}}) - {{brand_name}}',
    htmlTemplate: `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <title>Vuelo Confirmado - {{brand_name}}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #0f172a; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #334155;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #0f172a; padding: 32px 12px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" style="max-width: 600px; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 12px 28px rgba(0,0,0,0.3); border: 1px solid #334155;">
          <tr>
            <td style="background: linear-gradient(135deg, #059669 0%, #047857 50%, #064e3b 100%); padding: 28px; text-align: left;">
              <table role="presentation" width="100%">
                <tr>
                  <td style="width: 50px;">
                    <img src="{{brand_logo_url}}" alt="{{brand_name}}" width="48" height="48" style="border-radius: 10px; display: block; border: 2px solid rgba(255,255,255,0.3);" />
                  </td>
                  <td style="padding-left: 14px;">
                    <div style="font-size: 11px; font-weight: 700; color: #a7f3d0; text-transform: uppercase;">✅ Asistencia Confirmada</div>
                    <h1 style="margin: 2px 0 0 0; font-size: 20px; font-weight: 800; color: #ffffff;">{{brand_name}}</h1>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding: 28px;">
              <h2 style="color: #059669; font-size: 18px; margin-top: 0;">¡Vuelo Confirmado con Éxito!</h2>
              <p style="font-size: 14px; color: #334155; line-height: 1.6;">
                Estimado/a <strong>{{student_name}}</strong>, tu confirmación ha sido recibida y registrada en el sistema de despacho.
              </p>
              <table role="presentation" width="100%" style="background-color: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 10px; padding: 16px; margin: 18px 0;">
                <tr>
                  <td>
                    <div style="font-size: 12px; color: #166534;"><strong>Fecha:</strong> {{flight_date}} ({{start_time}} - {{end_time}})</div>
                    <div style="font-size: 12px; color: #166534; margin-top: 6px;"><strong>Aeronave:</strong> {{airplane_reg}} ({{airplane_model}})</div>
                    <div style="font-size: 12px; color: #166534; margin-top: 6px;"><strong>Instructor:</strong> {{instructor_name}}</div>
                    <div style="font-size: 12px; color: #166534; margin-top: 6px;"><strong>Misión:</strong> {{mission}}</div>
                  </td>
                </tr>
              </table>
              <p style="font-size: 13px; color: #64748b; line-height: 1.5;">
                Por favor preséntate 30 minutos antes para la revisión meteorológica y el briefing pre-vuelo.
              </p>
            </td>
          </tr>
          <tr>
            <td style="background-color: #f8fafc; padding: 16px 28px; border-top: 1px solid #e2e8f0; text-align: center;">
              <p style="margin: 0; font-size: 11px; color: #64748b;">{{footer_text}}</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`
  },

  flight_cancelled: {
    id: 'flight_cancelled',
    name: 'Cancelación de Vuelo (con Motivo)',
    description: 'Enviado cuando el estudiante o el instructor cancela un vuelo programado.',
    category: 'itinerario',
    subjectTemplate: '⚠️ Vuelo Cancelado: {{airplane_reg}} ({{flight_date}} {{start_time}}) - {{brand_name}}',
    htmlTemplate: `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <title>Vuelo Cancelado - {{brand_name}}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #0f172a; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #334155;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #0f172a; padding: 32px 12px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" style="max-width: 600px; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 12px 28px rgba(0,0,0,0.3); border: 1px solid #334155;">
          <tr>
            <td style="background: linear-gradient(135deg, #e11d48 0%, #be123c 50%, #881337 100%); padding: 28px; text-align: left;">
              <table role="presentation" width="100%">
                <tr>
                  <td style="width: 50px;">
                    <img src="{{brand_logo_url}}" alt="{{brand_name}}" width="48" height="48" style="border-radius: 10px; display: block; border: 2px solid rgba(255,255,255,0.3);" />
                  </td>
                  <td style="padding-left: 14px;">
                    <div style="font-size: 11px; font-weight: 700; color: #fecdd3; text-transform: uppercase;">⚠️ Alerta de Cancelación</div>
                    <h1 style="margin: 2px 0 0 0; font-size: 20px; font-weight: 800; color: #ffffff;">{{brand_name}}</h1>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding: 28px;">
              <h2 style="color: #e11d48; font-size: 18px; margin-top: 0;">Sesión de Vuelo Cancelada</h2>
              <p style="font-size: 14px; color: #334155; line-height: 1.6;">
                La sesión de entrenamiento programada para el <strong>{{flight_date}} ({{start_time}} - {{end_time}})</strong> en el <strong>{{airplane_reg}}</strong> ha sido cancelada por <strong>{{cancelled_by}}</strong>.
              </p>
              <div style="background-color: #fff1f2; border: 1px solid #fecdd3; border-radius: 10px; padding: 16px; margin: 18px 0;">
                <div style="font-size: 11px; font-weight: 700; color: #9f1239; text-transform: uppercase;">📝 Motivo Registrado:</div>
                <div style="font-size: 14px; color: #881337; font-weight: 600; margin-top: 4px;">"{{cancellation_reason}}"</div>
              </div>
              <p style="font-size: 13px; color: #64748b; line-height: 1.5;">
                El bloque horario y la aeronave {{airplane_reg}} han quedado liberados en el planificador de la academia. Si necesitas reagendar, ingresa al portal o contacta a tu instructor.
              </p>
            </td>
          </tr>
          <tr>
            <td style="background-color: #f8fafc; padding: 16px 28px; border-top: 1px solid #e2e8f0; text-align: center;">
              <p style="margin: 0; font-size: 11px; color: #64748b;">{{footer_text}}</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`
  },

  flight_reminder: {
    id: 'flight_reminder',
    name: 'Recordatorio Periódico (SLA 3 Horas)',
    description: 'Enviado automáticamente cada 30 minutos al estudiante si la asignación sigue pendiente.',
    category: 'itinerario',
    subjectTemplate: '⏰ Recordatorio #{{reminder_count}}: Confirmación de Vuelo Pendiente ({{flight_date}}) - {{brand_name}}',
    htmlTemplate: `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <title>Recordatorio de Vuelo - {{brand_name}}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #0f172a; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #334155;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #0f172a; padding: 32px 12px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" style="max-width: 600px; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 12px 28px rgba(0,0,0,0.3); border: 1px solid #334155;">
          <tr>
            <td style="background: linear-gradient(135deg, #d97706 0%, #b45309 50%, #78350f 100%); padding: 28px; text-align: left;">
              <table role="presentation" width="100%">
                <tr>
                  <td style="width: 50px;">
                    <img src="{{brand_logo_url}}" alt="{{brand_name}}" width="48" height="48" style="border-radius: 10px; display: block; border: 2px solid rgba(255,255,255,0.3);" />
                  </td>
                  <td style="padding-left: 14px;">
                    <div style="font-size: 11px; font-weight: 700; color: #fde68a; text-transform: uppercase;">⏰ Recordatorio #{{reminder_count}} (Cada 30 Minutos)</div>
                    <h1 style="margin: 2px 0 0 0; font-size: 20px; font-weight: 800; color: #ffffff;">{{brand_name}}</h1>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding: 28px;">
              <h2 style="color: #b45309; font-size: 18px; margin-top: 0;">Tienes una Asignación Pendiente</h2>
              <p style="font-size: 14px; color: #334155; line-height: 1.6;">
                Hola <strong>{{student_name}}</strong>, aún no has confirmado tu lección de vuelo programada para el <strong>{{flight_date}} ({{start_time}} - {{end_time}})</strong> en la aeronave <strong>{{airplane_reg}}</strong> con el instructor <strong>{{instructor_name}}</strong>.
              </p>
              <div style="background-color: #fefce8; border: 1px solid #fef08a; border-radius: 10px; padding: 16px; margin: 18px 0; text-align: center;">
                <div style="font-size: 12px; color: #854d0e; font-weight: 700;">TIEMPO RESTANTE PARA CONFIRMAR:</div>
                <div style="font-size: 22px; color: #713f12; font-weight: 800; margin-top: 4px;">Aprox. {{minutes_remaining}} minutos</div>
                <div style="font-size: 11px; color: #a16207; margin-top: 4px;">Plazo máximo de SLA: 3 horas desde la programación</div>
              </div>
              <div style="text-align: center; margin: 24px 0 10px 0;">
                <a href="{{support_url}}" style="background-color: {{primary_color}}; color: #ffffff; font-weight: 700; font-size: 14px; text-decoration: none; padding: 12px 26px; border-radius: 8px; display: inline-block;">
                  ✈️ Confirmar o Cancelar en el Portal
                </a>
              </div>
            </td>
          </tr>
          <tr>
            <td style="background-color: #f8fafc; padding: 16px 28px; border-top: 1px solid #e2e8f0; text-align: center;">
              <p style="margin: 0; font-size: 11px; color: #64748b;">{{footer_text}}</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`
  },

  flight_no_show: {
    id: 'flight_no_show',
    name: 'Aviso Disciplinario - Inasistencia (No Show)',
    description: 'Enviado al estudiante cuando no se presenta a su vuelo sin previo aviso justificado.',
    category: 'disciplinario',
    subjectTemplate: '⛔ Notificación Disciplinaria: Inasistencia a Vuelo (No Show) - {{brand_name}}',
    htmlTemplate: `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <title>Aviso Disciplinario - {{brand_name}}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #0f172a; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #334155;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #0f172a; padding: 32px 12px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" style="max-width: 600px; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 12px 28px rgba(0,0,0,0.3); border: 1px solid #334155;">
          <tr>
            <td style="background: linear-gradient(135deg, #991b1b 0%, #7f1d1d 50%, #450a0a 100%); padding: 28px; text-align: left;">
              <table role="presentation" width="100%">
                <tr>
                  <td style="width: 50px;">
                    <img src="{{brand_logo_url}}" alt="{{brand_name}}" width="48" height="48" style="border-radius: 10px; display: block; border: 2px solid rgba(255,255,255,0.3);" />
                  </td>
                  <td style="padding-left: 14px;">
                    <div style="font-size: 11px; font-weight: 700; color: #fca5a5; text-transform: uppercase;">⛔ Aviso Disciplinario Operacional</div>
                    <h1 style="margin: 2px 0 0 0; font-size: 20px; font-weight: 800; color: #ffffff;">{{brand_name}}</h1>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding: 28px;">
              <h2 style="color: #991b1b; font-size: 18px; margin-top: 0;">Inasistencia Registrada (No Show)</h2>
              <p style="font-size: 14px; color: #334155; line-height: 1.6;">
                Estimado/a <strong>{{student_name}}</strong>, se ha registrado una inasistencia injustificada a tu lección de vuelo programada para el <strong>{{flight_date}} ({{start_time}} - {{end_time}})</strong> en la aeronave <strong>{{airplane_reg}}</strong> con el <strong>Cap. {{instructor_name}}</strong>.
              </p>
              <div style="background-color: #fef2f2; border: 1px solid #fecaca; border-radius: 10px; padding: 16px; margin: 18px 0;">
                <div style="font-size: 12px; color: #991b1b; font-weight: 700;">POLÍTICA DISCIPLINARIA DE LA ACADEMIA:</div>
                <p style="margin: 4px 0 0 0; font-size: 12px; color: #7f1d1d; line-height: 1.4;">
                  Esta falta queda asentada en tu expediente operacional y se notifica a la jefatura de operaciones y departamento de contabilidad para la aplicación del cargo por inasistencia.
                </p>
              </div>
              <p style="font-size: 13px; color: #64748b; line-height: 1.5;">
                Si consideras que existió una causa de fuerza mayor debidamente justificada, por favor comunícate a la brevedad con la jefatura de instrucción.
              </p>
            </td>
          </tr>
          <tr>
            <td style="background-color: #f8fafc; padding: 16px 28px; border-top: 1px solid #e2e8f0; text-align: center;">
              <p style="margin: 0; font-size: 11px; color: #64748b;">{{footer_text}}</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`
  },

  direct_message: {
    id: 'direct_message',
    name: 'Comunicado Oficial de Operaciones',
    description: 'Plantilla para correos y avisos manuales directos enviados desde el portal de despacho.',
    category: 'general',
    subjectTemplate: '✈️ Comunicado de Operaciones: {{subject}} - {{brand_name}}',
    htmlTemplate: `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <title>Comunicado de Operaciones - {{brand_name}}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #0f172a; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #334155;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #0f172a; padding: 32px 12px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" style="max-width: 600px; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 12px 28px rgba(0,0,0,0.3); border: 1px solid #334155;">
          <tr>
            <td style="background: linear-gradient(135deg, {{header_gradient_start}} 0%, {{secondary_color}} 50%, {{header_gradient_end}} 100%); padding: 28px; text-align: left;">
              <table role="presentation" width="100%">
                <tr>
                  <td style="width: 50px;">
                    <img src="{{brand_logo_url}}" alt="{{brand_name}}" width="48" height="48" style="border-radius: 10px; display: block; border: 2px solid rgba(255,255,255,0.3);" />
                  </td>
                  <td style="padding-left: 14px;">
                    <div style="font-size: 11px; font-weight: 700; color: {{accent_color}}; text-transform: uppercase;">✈️ Comunicación Oficial</div>
                    <h1 style="margin: 2px 0 0 0; font-size: 20px; font-weight: 800; color: #ffffff;">{{brand_name}}</h1>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding: 28px;">
              <p style="font-size: 15px; color: #1e293b; line-height: 1.5; margin-top: 0;">
                Estimado/a <strong>{{recipient_name}}</strong>,
              </p>
              <div style="font-size: 14px; line-height: 1.6; color: #334155; margin: 18px 0; white-space: pre-wrap;">{{message_body}}</div>
            </td>
          </tr>
          <tr>
            <td style="background-color: #f8fafc; padding: 16px 28px; border-top: 1px solid #e2e8f0; text-align: center;">
              <p style="margin: 0; font-size: 11px; color: #64748b;">{{footer_text}}</p>
              <p style="margin: 6px 0 0 0; font-size: 11px; color: #94a3b8;">Contacto: {{contact_email}} • {{contact_phone}}</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`
  },

  payment_received: {
    id: 'payment_received',
    name: 'Recepción de Pago / Comprobante ACH',
    description: 'Enviado cuando un estudiante reporta un nuevo pago o abono. Notifica a Contabilidad, Jefatura y al Alumno.',
    category: 'general',
    subjectTemplate: '💳 Comprobante de Pago Recibido: {{student_name}} (${{amount}} USD) - {{brand_name}}',
    htmlTemplate: `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <title>Comprobante de Pago - {{brand_name}}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #0f172a; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #334155;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #0f172a; padding: 32px 12px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" style="max-width: 600px; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 12px 28px rgba(0,0,0,0.3); border: 1px solid #334155;">
          <tr>
            <td style="background: linear-gradient(135deg, #0284c7 0%, #0369a1 50%, #0f172a 100%); padding: 28px; text-align: left;">
              <table role="presentation" width="100%">
                <tr>
                  <td style="width: 50px;">
                    <img src="{{brand_logo_url}}" alt="{{brand_name}}" width="48" height="48" style="border-radius: 10px; display: block; border: 2px solid rgba(255,255,255,0.3);" />
                  </td>
                  <td style="padding-left: 14px;">
                    <div style="font-size: 11px; font-weight: 700; color: #bae6fd; text-transform: uppercase;">💳 Control Contable & Finanzas</div>
                    <h1 style="margin: 2px 0 0 0; font-size: 20px; font-weight: 800; color: #ffffff;">{{brand_name}}</h1>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding: 28px;">
              <h2 style="color: #0284c7; font-size: 18px; margin-top: 0;">Nuevo Comprobante de Pago Reportado</h2>
              <p style="font-size: 14px; color: #334155; line-height: 1.6;">
                Hola <strong>{{recipient_name}}</strong>, se ha registrado un nuevo reporte de abono en el sistema financiero:
              </p>
              <table role="presentation" width="100%" style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 16px; margin: 18px 0;">
                <tr>
                  <td>
                    <div style="font-size: 12px; color: #475569;"><strong>Estudiante:</strong> {{student_name}}</div>
                    <div style="font-size: 14px; color: #0f172a; font-weight: 800; margin-top: 6px;"><strong>Monto Reportado:</strong> <span style="color:#0284c7;">\${{amount}} USD</span></div>
                    <div style="font-size: 12px; color: #475569; margin-top: 6px;"><strong>Referencia ACH / Banco:</strong> {{reference}}</div>
                    <div style="font-size: 12px; color: #475569; margin-top: 6px;"><strong>Banco Emisor:</strong> {{bank_name}}</div>
                    <div style="font-size: 12px; color: #475569; margin-top: 6px;"><strong>Fecha del Reporte:</strong> {{payment_date}}</div>
                  </td>
                </tr>
              </table>
              <div style="padding: 12px; background-color: #eff6ff; border: 1px solid #bfdbfe; border-radius: 8px; font-size: 12px; color: #1e40af; line-height: 1.5;">
                ℹ️ <strong>Estado del Proceso:</strong> Pendiente de conciliación bancaria oficial por el Departamento de Contabilidad. El saldo no se aplicará para vuelos hasta ser comprobado.
              </div>
            </td>
          </tr>
          <tr>
            <td style="background-color: #f8fafc; padding: 16px 28px; border-top: 1px solid #e2e8f0; text-align: center;">
              <p style="margin: 0; font-size: 11px; color: #64748b;">{{footer_text}}</p>
              <p style="margin: 6px 0 0 0; font-size: 11px; color: #94a3b8;">Contacto: {{contact_email}} • {{contact_phone}}</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`
  },

  payment_approved: {
    id: 'payment_approved',
    name: 'Confirmación de Pago Aprobado',
    description: 'Enviado al estudiante con copia a Jefatura y Escuela cuando Contabilidad verifica y acredita el pago en el extracto bancario.',
    category: 'general',
    subjectTemplate: '✅ Pago Confirmado & Saldo Acreditado: +${{amount}} USD - {{brand_name}}',
    htmlTemplate: `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <title>Pago Aprobado - {{brand_name}}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #0f172a; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #334155;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #0f172a; padding: 32px 12px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" style="max-width: 600px; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 12px 28px rgba(0,0,0,0.3); border: 1px solid #334155;">
          <tr>
            <td style="background: linear-gradient(135deg, #059669 0%, #047857 50%, #064e3b 100%); padding: 28px; text-align: left;">
              <table role="presentation" width="100%">
                <tr>
                  <td style="width: 50px;">
                    <img src="{{brand_logo_url}}" alt="{{brand_name}}" width="48" height="48" style="border-radius: 10px; display: block; border: 2px solid rgba(255,255,255,0.3);" />
                  </td>
                  <td style="padding-left: 14px;">
                    <div style="font-size: 11px; font-weight: 700; color: #a7f3d0; text-transform: uppercase;">✅ Acreditación Financiera Oficial</div>
                    <h1 style="margin: 2px 0 0 0; font-size: 20px; font-weight: 800; color: #ffffff;">{{brand_name}}</h1>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding: 28px;">
              <h2 style="color: #059669; font-size: 18px; margin-top: 0;">¡Pago Verificado y Acreditado!</h2>
              <p style="font-size: 14px; color: #334155; line-height: 1.6;">
                Estimado/a <strong>{{student_name}}</strong>, el Departamento de Contabilidad ha verificado con éxito tu comprobante contra el extracto bancario oficial.
              </p>
              <table role="presentation" width="100%" style="background-color: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 10px; padding: 18px; margin: 18px 0;">
                <tr>
                  <td>
                    <div style="font-size: 13px; color: #166534;"><strong>Monto Acreditado:</strong> <span style="font-size: 16px; font-weight: 800; color: #15803d;">+\${{amount}} USD</span></div>
                    <div style="font-size: 13px; color: #166534; margin-top: 6px;"><strong>Referencia Confirmada:</strong> {{reference}}</div>
                    <div style="font-size: 13px; color: #166534; margin-top: 6px;"><strong>Nuevo Saldo Disponible:</strong> <span style="font-size: 15px; font-weight: 800; color: #047857;">\${{new_balance}} USD</span></div>
                    <div style="font-size: 12px; color: #15803d; margin-top: 6px;"><strong>Oficial Contable:</strong> {{verified_by}}</div>
                  </td>
                </tr>
              </table>
              <p style="font-size: 13px; color: #475569; line-height: 1.5;">
                Tu cuenta ha sido actualizada en tiempo real. Ahora dispones de saldo aprobado para agendar lecciones de vuelo e itinerarios en la academia.
              </p>
            </td>
          </tr>
          <tr>
            <td style="background-color: #f8fafc; padding: 16px 28px; border-top: 1px solid #e2e8f0; text-align: center;">
              <p style="margin: 0; font-size: 11px; color: #64748b;">{{footer_text}}</p>
              <p style="margin: 6px 0 0 0; font-size: 11px; color: #94a3b8;">Contacto: {{contact_email}} • {{contact_phone}}</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`
  },

  payment_rejected: {
    id: 'payment_rejected',
    name: 'Rechazo de Comprobante de Pago',
    description: 'Enviado al estudiante cuando un comprobante bancario no coincide con el extracto o tiene discrepancias.',
    category: 'general',
    subjectTemplate: '⚠️ Comprobante de Pago No Aprobado (${{amount}} USD) - {{brand_name}}',
    htmlTemplate: `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <title>Comprobante No Conciliado - {{brand_name}}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #0f172a; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #334155;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #0f172a; padding: 32px 12px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" style="max-width: 600px; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 12px 28px rgba(0,0,0,0.3); border: 1px solid #334155;">
          <tr>
            <td style="background: linear-gradient(135deg, #e11d48 0%, #be123c 50%, #881337 100%); padding: 28px; text-align: left;">
              <table role="presentation" width="100%">
                <tr>
                  <td style="width: 50px;">
                    <img src="{{brand_logo_url}}" alt="{{brand_name}}" width="48" height="48" style="border-radius: 10px; display: block; border: 2px solid rgba(255,255,255,0.3);" />
                  </td>
                  <td style="padding-left: 14px;">
                    <div style="font-size: 11px; font-weight: 700; color: #fecdd3; text-transform: uppercase;">⚠️ Discrepancia Contable</div>
                    <h1 style="margin: 2px 0 0 0; font-size: 20px; font-weight: 800; color: #ffffff;">{{brand_name}}</h1>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding: 28px;">
              <h2 style="color: #e11d48; font-size: 18px; margin-top: 0;">Comprobante de Pago No Conciliado</h2>
              <p style="font-size: 14px; color: #334155; line-height: 1.6;">
                Estimado/a <strong>{{student_name}}</strong>, tu reporte de transacción por <strong>\${{amount}} USD</strong> no pudo ser aprobado por Contabilidad:
              </p>
              <table role="presentation" width="100%" style="background-color: #fff1f2; border: 1px solid #fecdd3; border-radius: 10px; padding: 16px; margin: 18px 0;">
                <tr>
                  <td>
                    <div style="font-size: 12px; color: #9f1239;"><strong>Referencia Reportada:</strong> {{reference}}</div>
                    <div style="font-size: 13px; color: #881337; margin-top: 6px;"><strong>Motivo Indicado:</strong> <span style="font-weight: 800;">"{{rejection_reason}}"</span></div>
                    <div style="font-size: 12px; color: #9f1239; margin-top: 6px;"><strong>Revisado por:</strong> {{verified_by}}</div>
                  </td>
                </tr>
              </table>
              <p style="font-size: 13px; color: #64748b; line-height: 1.5;">
                Por favor verifica el comprobante oficial emitido por tu banco y vuelve a cargarlo a través del portal de contabilidad o contacta a tesorería.
              </p>
            </td>
          </tr>
          <tr>
            <td style="background-color: #f8fafc; padding: 16px 28px; border-top: 1px solid #e2e8f0; text-align: center;">
              <p style="margin: 0; font-size: 11px; color: #64748b;">{{footer_text}}</p>
              <p style="margin: 6px 0 0 0; font-size: 11px; color: #94a3b8;">Contacto: {{contact_email}} • {{contact_phone}}</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`
  },

  low_balance_alert: {
    id: 'low_balance_alert',
    name: 'Alerta de Saldo Crítico / Mínimo',
    description: 'Enviado al estudiante con copia a Contabilidad y Jefatura cuando su saldo es menor al costo estimado de una lección de vuelo.',
    category: 'general',
    subjectTemplate: '⚠️ Alerta de Saldo Crítico: {{student_name}} (${{balance}} USD) - {{brand_name}}',
    htmlTemplate: `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <title>Alerta de Saldo Mínimo - {{brand_name}}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #0f172a; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #334155;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #0f172a; padding: 32px 12px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" style="max-width: 600px; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 12px 28px rgba(0,0,0,0.3); border: 1px solid #334155;">
          <tr>
            <td style="background: linear-gradient(135deg, #d97706 0%, #b45309 50%, #78350f 100%); padding: 28px; text-align: left;">
              <table role="presentation" width="100%">
                <tr>
                  <td style="width: 50px;">
                    <img src="{{brand_logo_url}}" alt="{{brand_name}}" width="48" height="48" style="border-radius: 10px; display: block; border: 2px solid rgba(255,255,255,0.3);" />
                  </td>
                  <td style="padding-left: 14px;">
                    <div style="font-size: 11px; font-weight: 700; color: #fde68a; text-transform: uppercase;">⚠️ Alerta de Saldo Operacional</div>
                    <h1 style="margin: 2px 0 0 0; font-size: 20px; font-weight: 800; color: #ffffff;">{{brand_name}}</h1>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding: 28px;">
              <h2 style="color: #b45309; font-size: 18px; margin-top: 0;">Saldo Mínimo para Programación de Vuelo</h2>
              <p style="font-size: 14px; color: #334155; line-height: 1.6;">
                Estimado/a <strong>{{student_name}}</strong>, tu cuenta registra un saldo disponible de <strong style="color: #b45309;">\${{balance}} USD</strong>.
              </p>
              <div style="background-color: #fefce8; border: 1px solid #fef08a; border-radius: 10px; padding: 16px; margin: 18px 0; font-size: 13px; color: #854d0e; line-height: 1.5;">
                🔔 <strong>Aviso Preventivo:</strong> Para garantizar la continuidad de tus fases de vuelo y evitar pausas en el plan de estudios, te sugerimos recargar tu cuenta mediante transferencia ACH a las cuentas oficiales de la academia.
              </div>
              <p style="font-size: 13px; color: #64748b; line-height: 1.5;">
                Una vez realizada la transferencia, sube el comprobante en el módulo de contabilidad para su pronta acreditación.
              </p>
            </td>
          </tr>
          <tr>
            <td style="background-color: #f8fafc; padding: 16px 28px; border-top: 1px solid #e2e8f0; text-align: center;">
              <p style="margin: 0; font-size: 11px; color: #64748b;">{{footer_text}}</p>
              <p style="margin: 6px 0 0 0; font-size: 11px; color: #94a3b8;">Contacto: {{contact_email}} • {{contact_phone}}</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`
  },

  medical_expiration_alert: {
    id: 'medical_expiration_alert',
    name: 'Vencimiento de Certificado Médico AAC',
    description: 'Alerta regulatoria obligatoria enviada al piloto y a Jefatura de Instrucción ante vencimiento de examen médico.',
    category: 'disciplinario',
    subjectTemplate: '🚨 Alerta Regulatoria AAC: Vencimiento de Certificado Médico - {{pilot_name}}',
    htmlTemplate: `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <title>Alerta Regulatoria AAC - {{brand_name}}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #0f172a; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #334155;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #0f172a; padding: 32px 12px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" style="max-width: 600px; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 12px 28px rgba(0,0,0,0.3); border: 1px solid #334155;">
          <tr>
            <td style="background: linear-gradient(135deg, #7c3aed 0%, #6d28d9 50%, #4c1d95 100%); padding: 28px; text-align: left;">
              <table role="presentation" width="100%">
                <tr>
                  <td style="width: 50px;">
                    <img src="{{brand_logo_url}}" alt="{{brand_name}}" width="48" height="48" style="border-radius: 10px; display: block; border: 2px solid rgba(255,255,255,0.3);" />
                  </td>
                  <td style="padding-left: 14px;">
                    <div style="font-size: 11px; font-weight: 700; color: #ddd6fe; text-transform: uppercase;">🚨 Seguridad Operacional AAC</div>
                    <h1 style="margin: 2px 0 0 0; font-size: 20px; font-weight: 800; color: #ffffff;">{{brand_name}}</h1>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding: 28px;">
              <h2 style="color: #6d28d9; font-size: 18px; margin-top: 0;">Vencimiento Próximo de Certificado Médico</h2>
              <p style="font-size: 14px; color: #334155; line-height: 1.6;">
                Estimado/a <strong>{{pilot_name}}</strong> (Rol: <strong>{{pilot_role}}</strong>),
              </p>
              <table role="presentation" width="100%" style="background-color: #f5f3ff; border: 1px solid #ddd6fe; border-radius: 10px; padding: 16px; margin: 18px 0;">
                <tr>
                  <td>
                    <div style="font-size: 13px; color: #5b21b6;"><strong>Certificado Médico N°:</strong> {{medical_number}}</div>
                    <div style="font-size: 13px; color: #5b21b6; margin-top: 6px;"><strong>Fecha de Vencimiento:</strong> <span style="font-weight: 800; color: #7c3aed;">{{expiration_date}}</span> ({{days_left}} días restantes)</div>
                    <div style="font-size: 12px; color: #6d28d9; margin-top: 6px;"><strong>Normativa:</strong> RAC 67.025 (Validez de Certificaciones Médicas Aeronáuticas)</div>
                  </td>
                </tr>
              </table>
              <div style="padding: 12px; background-color: #fef2f2; border: 1px solid #fecaca; border-radius: 8px; font-size: 12px; color: #991b1b; line-height: 1.5;">
                ⛔ <strong>Hard Lock de Despacho:</strong> Por regulaciones aeronáuticas de la AAC Panamá, todo piloto con certificado médico vencido quedará bloqueado automáticamente para operaciones de vuelo hasta presentar su renovación aprobada.
              </div>
            </td>
          </tr>
          <tr>
            <td style="background-color: #f8fafc; padding: 16px 28px; border-top: 1px solid #e2e8f0; text-align: center;">
              <p style="margin: 0; font-size: 11px; color: #64748b;">{{footer_text}}</p>
              <p style="margin: 6px 0 0 0; font-size: 11px; color: #94a3b8;">Contacto: {{contact_email}} • {{contact_phone}}</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`
  },

  license_expiration_alert: {
    id: 'license_expiration_alert',
    name: 'Vencimiento de Licencia Aeronáutica AAC',
    description: 'Alerta regulatoria ante vencimiento de licencias de estudiante (SPL), comercial (CPL) o instructor (CFI).',
    category: 'disciplinario',
    subjectTemplate: '🚨 Alerta Regulatoria AAC: Vencimiento de Licencia Aeronáutica - {{pilot_name}}',
    htmlTemplate: `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <title>Vencimiento de Licencia - {{brand_name}}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #0f172a; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #334155;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #0f172a; padding: 32px 12px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" style="max-width: 600px; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 12px 28px rgba(0,0,0,0.3); border: 1px solid #334155;">
          <tr>
            <td style="background: linear-gradient(135deg, #0284c7 0%, #0369a1 50%, #0f172a 100%); padding: 28px; text-align: left;">
              <table role="presentation" width="100%">
                <tr>
                  <td style="width: 50px;">
                    <img src="{{brand_logo_url}}" alt="{{brand_name}}" width="48" height="48" style="border-radius: 10px; display: block; border: 2px solid rgba(255,255,255,0.3);" />
                  </td>
                  <td style="padding-left: 14px;">
                    <div style="font-size: 11px; font-weight: 700; color: #bae6fd; text-transform: uppercase;">🪪 Trazabilidad de Licencias AAC</div>
                    <h1 style="margin: 2px 0 0 0; font-size: 20px; font-weight: 800; color: #ffffff;">{{brand_name}}</h1>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding: 28px;">
              <h2 style="color: #0369a1; font-size: 18px; margin-top: 0;">Renovación Requerida de Licencia Aeronáutica</h2>
              <p style="font-size: 14px; color: #334155; line-height: 1.6;">
                Estimado/a <strong>{{pilot_name}}</strong>, tu licencia aeronáutica requiere renovación ante la Autoridad Aeronáutica Civil:
              </p>
              <table role="presentation" width="100%" style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 16px; margin: 18px 0;">
                <tr>
                  <td>
                    <div style="font-size: 13px; color: #334155;"><strong>Licencia N°:</strong> {{license_number}}</div>
                    <div style="font-size: 13px; color: #334155; margin-top: 6px;"><strong>Fecha de Vencimiento:</strong> <span style="font-weight: 800; color: #0284c7;">{{expiration_date}}</span></div>
                    <div style="font-size: 12px; color: #64748b; margin-top: 6px;"><strong>Reglamento:</strong> RAC 61 (Licencias al Personal de Vuelo)</div>
                  </td>
                </tr>
              </table>
              <p style="font-size: 13px; color: #64748b; line-height: 1.5;">
                Te solicitamos coordinar con Jefatura de Instrucción y presentar tu licencia actualizada para mantener habilitado tu perfil de vuelo.
              </p>
            </td>
          </tr>
          <tr>
            <td style="background-color: #f8fafc; padding: 16px 28px; border-top: 1px solid #e2e8f0; text-align: center;">
              <p style="margin: 0; font-size: 11px; color: #64748b;">{{footer_text}}</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`
  },

  maintenance_alert: {
    id: 'maintenance_alert',
    name: 'Mantenimiento & Horas Motor de Aeronaves',
    description: 'Alerta técnica de inspección programada (50 hrs / 100 hrs / anual) o discrepancia registrada en bitácora.',
    category: 'itinerario',
    subjectTemplate: '🔧 Alerta de Mantenimiento de Flota: {{airplane_reg}} - {{maintenance_type}}',
    htmlTemplate: `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <title>Alerta de Mantenimiento - {{brand_name}}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #0f172a; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #334155;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #0f172a; padding: 32px 12px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" style="max-width: 600px; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 12px 28px rgba(0,0,0,0.3); border: 1px solid #334155;">
          <tr>
            <td style="background: linear-gradient(135deg, #475569 0%, #334155 50%, #0f172a 100%); padding: 28px; text-align: left;">
              <table role="presentation" width="100%">
                <tr>
                  <td style="width: 50px;">
                    <img src="{{brand_logo_url}}" alt="{{brand_name}}" width="48" height="48" style="border-radius: 10px; display: block; border: 2px solid rgba(255,255,255,0.3);" />
                  </td>
                  <td style="padding-left: 14px;">
                    <div style="font-size: 11px; font-weight: 700; color: #cbd5e1; text-transform: uppercase;">🔧 Mantenimiento & Aeronavegabilidad</div>
                    <h1 style="margin: 2px 0 0 0; font-size: 20px; font-weight: 800; color: #ffffff;">{{brand_name}}</h1>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding: 28px;">
              <h2 style="color: #334155; font-size: 18px; margin-top: 0;">Inspección Técnica / Discrepancia de Flota</h2>
              <p style="font-size: 14px; color: #334155; line-height: 1.6;">
                Atención Operaciones y Despacho, se ha generado una alerta técnica para la aeronave:
              </p>
              <table role="presentation" width="100%" style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 16px; margin: 18px 0;">
                <tr>
                  <td>
                    <div style="font-size: 14px; color: #0f172a; font-weight: 800;"><strong>Aeronave:</strong> {{airplane_reg}} ({{airplane_model}})</div>
                    <div style="font-size: 13px; color: #334155; margin-top: 6px;"><strong>Tipo de Evento:</strong> <span style="color: #d97706; font-weight: 800;">{{maintenance_type}}</span></div>
                    <div style="font-size: 13px; color: #334155; margin-top: 6px;"><strong>Horas Motor Acumuladas:</strong> {{engine_hours}} hrs (Límite: {{limit_hours}} hrs)</div>
                    <div style="font-size: 12px; color: #64748b; margin-top: 6px;"><strong>Detalle Técnico:</strong> {{technical_notes}}</div>
                  </td>
                </tr>
              </table>
              <div style="padding: 12px; background-color: #fffbeb; border: 1px solid #fde68a; border-radius: 8px; font-size: 12px; color: #92400e; line-height: 1.5;">
                ⚠️ <strong>Revisión en Hangar:</strong> Coordinar con el Taller Aeronáutico Certificado antes del próximo vuelo de instrucción.
              </div>
            </td>
          </tr>
          <tr>
            <td style="background-color: #f8fafc; padding: 16px 28px; border-top: 1px solid #e2e8f0; text-align: center;">
              <p style="margin: 0; font-size: 11px; color: #64748b;">{{footer_text}}</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`
  }
};

class EmailService {
  private config: EmailConfig = {
    provider: (process.env.EMAIL_PROVIDER as any) || (process.env.RESEND_API_KEY ? 'resend' : 'simulation'),
    fromName: process.env.EMAIL_FROM_NAME || 'SkyOps Flight Academy',
    fromEmail: process.env.EMAIL_FROM || 'despacho@skyopsacademy.com',
    resendApiKey: process.env.RESEND_API_KEY || '',
    sendgridApiKey: process.env.SENDGRID_API_KEY || '',
    smtpHost: process.env.SMTP_HOST || 'smtp.gmail.com',
    smtpPort: Number(process.env.SMTP_PORT) || 587,
    smtpUser: process.env.SMTP_USER || '',
    smtpPassword: process.env.SMTP_PASSWORD || '',
    smtpSecure: process.env.SMTP_SECURE === 'true',
    autoSendOnFlightScheduled: true
  };

  private brandConfig: EmailBrandConfig = { ...DEFAULT_BRAND_CONFIG };
  private templates: Record<EmailTemplateKey, EmailTemplateItem> = JSON.parse(JSON.stringify(DEFAULT_EMAIL_TEMPLATES));

  getConfig(): EmailConfig {
    return {
      ...this.config,
      smtpPassword: this.config.smtpPassword ? '********' : '',
      resendApiKey: this.config.resendApiKey ? 're_***' + this.config.resendApiKey.slice(-4) : '',
      sendgridApiKey: this.config.sendgridApiKey ? 'SG.***' + this.config.sendgridApiKey.slice(-4) : ''
    };
  }

  updateConfig(newConfig: Partial<EmailConfig>) {
    this.config = {
      ...this.config,
      ...newConfig,
      smtpPassword: newConfig.smtpPassword && !newConfig.smtpPassword.includes('***') ? newConfig.smtpPassword : this.config.smtpPassword,
      resendApiKey: newConfig.resendApiKey && !newConfig.resendApiKey.includes('***') ? newConfig.resendApiKey : this.config.resendApiKey,
      sendgridApiKey: newConfig.sendgridApiKey && !newConfig.sendgridApiKey.includes('***') ? newConfig.sendgridApiKey : this.config.sendgridApiKey
    };
    if (newConfig.fromName) {
      this.brandConfig.brandName = newConfig.fromName;
    }
  }

  // Brand and Templates Management
  getBrandConfig(): EmailBrandConfig {
    return { ...this.brandConfig };
  }

  updateBrandConfig(newBrand: Partial<EmailBrandConfig>): EmailBrandConfig {
    this.brandConfig = {
      ...this.brandConfig,
      ...newBrand
    };
    if (newBrand.brandName) {
      this.config.fromName = newBrand.brandName;
    }
    return { ...this.brandConfig };
  }

  resetBrandConfig(): EmailBrandConfig {
    this.brandConfig = { ...DEFAULT_BRAND_CONFIG };
    if (this.brandConfig.brandName) {
      this.config.fromName = this.brandConfig.brandName;
    }
    return { ...this.brandConfig };
  }

  getTemplates(): EmailTemplateItem[] {
    return Object.values(this.templates);
  }

  getTemplate(key: EmailTemplateKey): EmailTemplateItem | undefined {
    return this.templates[key] ? { ...this.templates[key] } : undefined;
  }

  updateTemplate(key: EmailTemplateKey, updated: Partial<EmailTemplateItem>): EmailTemplateItem | undefined {
    if (this.templates[key]) {
      this.templates[key] = {
        ...this.templates[key],
        ...updated
      };
      return { ...this.templates[key] };
    }
    return undefined;
  }

  resetTemplate(key: EmailTemplateKey): EmailTemplateItem | undefined {
    if (DEFAULT_EMAIL_TEMPLATES[key]) {
      this.templates[key] = JSON.parse(JSON.stringify(DEFAULT_EMAIL_TEMPLATES[key]));
      return { ...this.templates[key] };
    }
    return undefined;
  }

  resetTemplates(specificKey?: EmailTemplateKey) {
    if (specificKey && DEFAULT_EMAIL_TEMPLATES[specificKey]) {
      this.templates[specificKey] = JSON.parse(JSON.stringify(DEFAULT_EMAIL_TEMPLATES[specificKey]));
    } else {
      this.templates = JSON.parse(JSON.stringify(DEFAULT_EMAIL_TEMPLATES));
      this.brandConfig = { ...DEFAULT_BRAND_CONFIG };
    }
  }

  /**
   * Compilador de plantillas que inyecta tanto variables dinámicas de vuelo como de marca
   */
  compileTemplate(templateHtml: string, variables: Record<string, string>, customBrand?: Partial<EmailBrandConfig>): string {
    let result = templateHtml;
    const activeBrand = { ...this.brandConfig, ...customBrand };

    // 1. Inyectar variables de marca
    const brandVars: Record<string, string> = {
      brand_name: activeBrand.brandName,
      brand_tagline: activeBrand.brandTagline,
      brand_logo_url: activeBrand.logoUrl,
      primary_color: activeBrand.primaryColor,
      secondary_color: activeBrand.secondaryColor,
      accent_color: activeBrand.accentColor,
      header_gradient_start: activeBrand.headerGradientStart || activeBrand.primaryColor,
      header_gradient_end: activeBrand.headerGradientEnd || '#0f172a',
      footer_text: activeBrand.footerText,
      contact_email: activeBrand.contactEmail,
      contact_phone: activeBrand.contactPhone,
      support_url: activeBrand.supportUrl
    };

    const allVars = { ...brandVars, ...variables };

    for (const [key, value] of Object.entries(allVars)) {
      const reg = new RegExp(`\\{\\{\\s*${key}\\s*\\}\\}`, 'g');
      result = result.replace(reg, value || '');
    }

    return result;
  }

  /**
   * Renderiza el asunto y el HTML completo de una notificación de vuelo
   */
  renderFlightEmail(
    templateKey: EmailTemplateKey,
    variables: Record<string, string>,
    options?: {
      customHtml?: string;
      customSubject?: string;
      customBrand?: Partial<EmailBrandConfig>;
    }
  ): {
    subject: string;
    html: string;
    text: string;
  } {
    const templateItem = this.templates[templateKey] || DEFAULT_EMAIL_TEMPLATES[templateKey] || DEFAULT_EMAIL_TEMPLATES.flight_scheduled;
    const subjectSource = options?.customSubject || templateItem.subjectTemplate;
    const htmlSource = options?.customHtml || templateItem.htmlTemplate;

    const subject = this.compileTemplate(subjectSource, variables, options?.customBrand);
    const html = this.compileTemplate(htmlSource, variables, options?.customBrand);
    const brandName = options?.customBrand?.brandName || this.brandConfig.brandName;
    const text = `${subject}\n\n${variables.mission ? `Misión: ${variables.mission}\n` : ''}${variables.flight_date ? `Fecha: ${variables.flight_date} (${variables.start_time} - ${variables.end_time})\n` : ''}${variables.airplane_reg ? `Aeronave: ${variables.airplane_reg}\n` : ''}${brandName}`;

    return { subject, html, text };
  }

  /**
   * Genera plantilla HTML corporativa para vuelos programados
   */
  generateFlightEmailHtml(options: {
    studentName: string;
    instructorName: string;
    instructorPhone?: string;
    airplaneReg: string;
    airplaneModel: string;
    flightDate: string;
    startTime: string;
    endTime: string;
    mission: string;
    deadlineHourStr: string;
    itineraryId?: string;
    appUrl?: string;
  }): string {
    const rendered = this.renderFlightEmail('flight_scheduled', {
      student_name: options.studentName,
      instructor_name: options.instructorName,
      instructor_phone: options.instructorPhone || '+507 6000-0000',
      airplane_reg: options.airplaneReg,
      airplane_model: options.airplaneModel,
      flight_date: options.flightDate,
      start_time: options.startTime,
      end_time: options.endTime,
      mission: options.mission,
      deadline_hour: options.deadlineHourStr,
      support_url: options.appUrl || this.brandConfig.supportUrl
    });
    return rendered.html;
  }

  /**
   * Despacha un correo electrónico usando el proveedor configurado o el emulador
   */
  async sendEmail(payload: SendEmailPayload): Promise<{
    success: boolean;
    provider: string;
    messageId?: string;
    status: 'enviado' | 'simulado' | 'fallido';
    error?: string;
  }> {
    const { toEmail, recipientName, subject, htmlContent, textContent } = payload;

    if (!toEmail || !toEmail.includes('@')) {
      return {
        success: false,
        provider: this.config.provider,
        status: 'fallido',
        error: `Dirección de correo electrónico inválida: ${toEmail}`
      };
    }

    try {
      if (this.config.provider === 'resend' && this.config.resendApiKey) {
        const response = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${this.config.resendApiKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            from: `${this.brandConfig.brandName || this.config.fromName} <${this.config.fromEmail}>`,
            to: [toEmail],
            subject: subject,
            html: htmlContent,
            text: textContent
          })
        });

        const data = await response.json();
        if (response.ok) {
          return {
            success: true,
            provider: 'resend',
            messageId: data.id,
            status: 'enviado'
          };
        } else {
          return {
            success: false,
            provider: 'resend',
            status: 'fallido',
            error: data.message || 'Error en Resend API'
          };
        }
      }

      if (this.config.provider === 'sendgrid' && this.config.sendgridApiKey) {
        const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${this.config.sendgridApiKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            personalizations: [{ to: [{ email: toEmail, name: recipientName }] }],
            from: { email: this.config.fromEmail, name: this.brandConfig.brandName || this.config.fromName },
            subject: subject,
            content: [
              { type: 'text/html', value: htmlContent },
              ...(textContent ? [{ type: 'text/plain', value: textContent }] : [])
            ]
          })
        });

        if (response.ok || response.status === 202) {
          return {
            success: true,
            provider: 'sendgrid',
            messageId: response.headers.get('x-message-id') || 'sg_' + Date.now(),
            status: 'enviado'
          };
        } else {
          const errText = await response.text();
          return {
            success: false,
            provider: 'sendgrid',
            status: 'fallido',
            error: errText || 'Error en SendGrid API'
          };
        }
      }

      // Mock / Simulación
      console.log(`[Email Service (${this.config.provider})] Correo despachado a ${recipientName} <${toEmail}> | Asunto: ${subject}`);
      return {
        success: true,
        provider: this.config.provider,
        messageId: 'email_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6),
        status: 'simulado'
      };
    } catch (err: any) {
      console.error('[Email Service] Error al despachar correo:', err);
      return {
        success: false,
        provider: this.config.provider,
        status: 'fallido',
        error: err.message || 'Excepción al contactar servidor de correo'
      };
    }
  }
}

export const emailService = new EmailService();

