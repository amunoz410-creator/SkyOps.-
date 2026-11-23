/**
 * Helper to generate authentic-looking digital bank receipt images (SVG Data URI)
 * for transactions and previewing bank vouchers.
 */

export function generateBankReceiptSvgUrl(data: {
  banco: string;
  monto: number;
  referencia: string;
  estudiante: string;
  fecha: string;
  concepto: string;
  cuentaDestino?: string;
  folio?: string;
}): string {
  const isBancoGeneral = data.banco.toLowerCase().includes('general') || data.banco.toLowerCase().includes('bg');
  const isBanistmo = data.banco.toLowerCase().includes('banistmo');
  const isBAC = data.banco.toLowerCase().includes('bac');
  
  const primaryColor = isBancoGeneral ? '#003A70' : isBanistmo ? '#1A4F9C' : isBAC ? '#D61A21' : '#0F2C59';
  const secondaryColor = isBancoGeneral ? '#0072CE' : isBanistmo ? '#00A3E0' : isBAC ? '#B81319' : '#3B82F6';
  const logoText = isBancoGeneral ? 'BANCO GENERAL' : isBanistmo ? 'BANISTMO' : isBAC ? 'BAC CREDOMATIC' : data.banco.toUpperCase();
  const cuentaDestino = data.cuentaDestino || 'AeroAcademia SkyOps - Cta Cte 03-72-01-998822-0';

  const svg = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 780" width="600" height="780">
  <defs>
    <linearGradient id="headerGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="${primaryColor}" />
      <stop offset="100%" stop-color="${secondaryColor}" />
    </linearGradient>
    <filter id="cardShadow" x="-5%" y="-5%" width="110%" height="110%">
      <feDropShadow dx="0" dy="4" stdDeviation="6" flood-opacity="0.12" />
    </filter>
  </defs>

  <!-- Background Canvas -->
  <rect width="600" height="780" fill="#F1F5F9" />

  <!-- Main Receipt Card -->
  <rect x="30" y="30" width="540" height="720" rx="16" fill="#FFFFFF" stroke="#E2E8F0" stroke-width="2" filter="url(#cardShadow)" />

  <!-- Bank Top Header -->
  <path d="M 30 46 Q 30 30 46 30 L 554 30 Q 570 30 570 46 L 570 120 L 30 120 Z" fill="url(#headerGrad)" />
  
  <!-- Header Text -->
  <text x="50" y="70" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="20" font-weight="900" fill="#FFFFFF" letter-spacing="1">
    ${logoText}
  </text>
  <text x="50" y="95" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="12" font-weight="600" fill="#E2E8F0" letter-spacing="0.5">
    COMPROBANTE DE TRANSFERENCIA ELECTRÓNICA ACH
  </text>
  
  <rect x="420" y="55" width="130" height="30" rx="6" fill="#FFFFFF" fill-opacity="0.2" />
  <text x="485" y="75" font-family="monospace" font-size="11" font-weight="bold" fill="#FFFFFF" text-anchor="middle">
    ${data.fecha}
  </text>

  <!-- Success Status Icon and Text -->
  <circle cx="300" cy="170" r="32" fill="#ECFDF5" stroke="#10B981" stroke-width="2.5" />
  <path d="M 288 170 L 297 179 L 314 160" fill="none" stroke="#10B981" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round" />
  
  <text x="300" y="225" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="15" font-weight="bold" fill="#065F46" text-anchor="middle">
    Transferencia ACH Procesada Exitosamente
  </text>

  <!-- Big Amount Box -->
  <rect x="60" y="245" width="480" height="80" rx="12" fill="#F8FAFC" stroke="#E2E8F0" />
  <text x="300" y="275" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="12" font-weight="bold" fill="#64748B" text-anchor="middle" letter-spacing="1">
    MONTO TRANSFERIDO
  </text>
  <text x="300" y="312" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="30" font-weight="900" fill="#0F172A" text-anchor="middle">
    $${data.monto.toLocaleString('en-US', { minimumFractionDigits: 2 })} USD
  </text>

  <!-- Transaction Fields -->
  <!-- Line 1: Titular -->
  <text x="60" y="360" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="11" font-weight="bold" fill="#94A3B8" letter-spacing="0.5">CLIENTE / TITULAR ORDENANTE</text>
  <text x="60" y="380" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="14" font-weight="bold" fill="#1E293B">${data.estudiante}</text>

  <!-- Line 2: Referencia ACH -->
  <text x="60" y="420" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="11" font-weight="bold" fill="#94A3B8" letter-spacing="0.5">NÚMERO DE REFERENCIA ACH</text>
  <rect x="60" y="428" width="260" height="28" rx="6" fill="#EFF6FF" stroke="#BFDBFE" />
  <text x="70" y="447" font-family="monospace" font-size="13" font-weight="bold" fill="#1D4ED8">${data.referencia}</text>

  <!-- Line 3: Cuenta Destino -->
  <text x="60" y="488" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="11" font-weight="bold" fill="#94A3B8" letter-spacing="0.5">CUENTA DE DESTINO (BENEFICIARIO)</text>
  <text x="60" y="508" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="13" font-weight="600" fill="#1E293B">${cuentaDestino}</text>

  <!-- Line 4: Concepto -->
  <text x="60" y="548" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="11" font-weight="bold" fill="#94A3B8" letter-spacing="0.5">DESCRIPCIÓN / CONCEPTO</text>
  <text x="60" y="568" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="13" font-weight="600" fill="#334155">${data.concepto}</text>

  <!-- Line 5: Folio / Canal -->
  <text x="60" y="608" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="11" font-weight="bold" fill="#94A3B8" letter-spacing="0.5">CANAL Y AUTORIZACIÓN</text>
  <text x="60" y="628" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="12" font-weight="500" fill="#475569">Banca en Línea / App Móvil • Auth: AUTH-${Math.floor(Math.random()*899999 + 100000)}</text>

  <!-- Divider -->
  <line x1="60" y1="655" x2="540" y2="655" stroke="#E2E8F0" stroke-width="1.5" stroke-dasharray="4 4" />

  <!-- Security Stamp / Footer -->
  <rect x="60" y="670" width="480" height="50" rx="8" fill="#F8FAFC" />
  <circle cx="85" cy="695" r="12" fill="#E2E8F0" />
  <text x="85" y="700" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="12" font-weight="bold" fill="#64748B" text-anchor="middle">✓</text>
  <text x="110" y="690" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="11" font-weight="bold" fill="#334155">
    Comprobante Oficial Emitido por la Red Bancaria ACH Panamá
  </text>
  <text x="110" y="706" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="10" font-weight="normal" fill="#64748B">
    Válido para auditoría y cotejo contable en AeroAcademia Flight School
  </text>
</svg>
  `.trim();

  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}
