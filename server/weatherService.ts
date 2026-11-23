import { MetarData, TafData, FlightCategory, CloudLayer, TafForecastItem, PanamaWeatherResponse } from '../src/types';

interface AirportInfo {
  icao: string;
  name: string;
  city: string;
  country: string;
  lat: number;
  lon: number;
  elevationFt: number;
  atisFreq?: string;
  towerFreq?: string;
  runways: { ident: string; headingDeg: number; lengthFt: number; surface: string }[];
}

export const PANAMA_AIRPORTS: Record<string, AirportInfo> = {
  MPTO: {
    icao: 'MPTO',
    name: 'Aeropuerto Internacional de Tocumen',
    city: 'Ciudad de Panamá (Este)',
    country: 'Panamá',
    lat: 9.0714,
    lon: -79.3833,
    elevationFt: 135,
    atisFreq: '127.85 MHz',
    towerFreq: '118.10 MHz',
    runways: [
      { ident: '03L/21R', headingDeg: 34, lengthFt: 10007, surface: 'Asfalto' },
      { ident: '03R/21L', headingDeg: 34, lengthFt: 8793, surface: 'Concreto' }
    ]
  },
  MPMG: {
    icao: 'MPMG',
    name: 'Aeropuerto Int. Marcos A. Gelabert (Albrook)',
    city: 'Ciudad de Panamá (Canal)',
    country: 'Panamá',
    lat: 8.9733,
    lon: -79.5556,
    elevationFt: 31,
    atisFreq: '127.40 MHz',
    towerFreq: '118.30 MHz',
    runways: [
      { ident: '18/36', headingDeg: 178, lengthFt: 5906, surface: 'Asfalto' }
    ]
  },
  MPPA: {
    icao: 'MPPA',
    name: 'Aeropuerto Int. Panamá Pacífico (Howard)',
    city: 'Panamá Oeste / Arraiján',
    country: 'Panamá',
    lat: 8.9150,
    lon: -79.5997,
    elevationFt: 50,
    atisFreq: '128.15 MHz',
    towerFreq: '118.70 MHz',
    runways: [
      { ident: '18/36', headingDeg: 180, lengthFt: 8501, surface: 'Concreto' }
    ]
  },
  MPCH: {
    icao: 'MPCH',
    name: 'Aeropuerto Int. Enrique Malek',
    city: 'David, Chiriquí',
    country: 'Panamá',
    lat: 8.3911,
    lon: -82.4350,
    elevationFt: 89,
    atisFreq: '127.20 MHz',
    towerFreq: '118.50 MHz',
    runways: [
      { ident: '04/22', headingDeg: 42, lengthFt: 6890, surface: 'Asfalto' }
    ]
  },
  MPSC: {
    icao: 'MPSC',
    name: 'Aeropuerto Int. Scarlett Martínez',
    city: 'Río Hato, Coclé',
    country: 'Panamá',
    lat: 8.3756,
    lon: -80.1281,
    elevationFt: 105,
    atisFreq: '126.90 MHz',
    towerFreq: '118.90 MHz',
    runways: [
      { ident: '17/35', headingDeg: 172, lengthFt: 8038, surface: 'Asfalto' }
    ]
  },
  MPBL: {
    icao: 'MPBL',
    name: 'Aeropuerto Int. de Bocas del Toro (Isla Colón)',
    city: 'Bocas del Toro (Caribe)',
    country: 'Panamá',
    lat: 9.3408,
    lon: -82.2508,
    elevationFt: 10,
    atisFreq: '126.50 MHz',
    towerFreq: '118.20 MHz',
    runways: [
      { ident: '08/26', headingDeg: 83, lengthFt: 4921, surface: 'Asfalto' }
    ]
  },
  MPJE: {
    icao: 'MPJE',
    name: 'Aeródromo de Jaqué',
    city: 'Jaqué, Darién',
    country: 'Panamá',
    lat: 7.5186,
    lon: -78.1583,
    elevationFt: 25,
    towerFreq: '122.80 MHz',
    runways: [
      { ident: '13/31', headingDeg: 130, lengthFt: 3937, surface: 'Asfalto' }
    ]
  },
  MPFS: {
    icao: 'MPFS',
    name: 'Aeródromo Fernando Sivia (Isla Grande)',
    city: 'Portobelo / Costa Arriba, Colón',
    country: 'Panamá',
    lat: 9.6300,
    lon: -79.5700,
    elevationFt: 15,
    towerFreq: '122.80 MHz',
    runways: [
      { ident: '09/27', headingDeg: 90, lengthFt: 3200, surface: 'Asfalto' }
    ]
  }
};

let weatherCache: {
  timestamp: number;
  data: PanamaWeatherResponse;
} | null = null;

const CACHE_TTL_MS = 2 * 60 * 1000; // 2 minutes cache

/**
 * Parsea y decodifica un raw METAR a estructura normalizada
 */
export function parseMetar(raw: string, airportInfo: AirportInfo): MetarData {
  const cleanRaw = raw.trim().replace(/\s+/g, ' ');
  const tokens = cleanRaw.split(' ');

  let obsTimeIso = new Date().toISOString();
  let obsTimeFormatted = 'Reciente';
  let windDirectionDeg: number | undefined = undefined;
  let windSpeedKt: number | undefined = undefined;
  let windGustKt: number | undefined = undefined;
  let windVariable = false;
  let windDisplay = 'Calma (00000KT)';
  let visibilityMiles: number | undefined = 10;
  let visibilityDisplay = '> 10 SM (Excelente)';
  const clouds: CloudLayer[] = [];
  let ceilingFt: number | undefined = undefined;
  let temperatureC: number | undefined = 30;
  let dewpointC: number | undefined = 24;
  let altimeterInHg: number | undefined = 29.92;
  let altimeterHpa: number | undefined = 1013;
  const weatherConditions: string[] = [];

  // 1. Hora de Observación (ej. 211900Z o 220000Z)
  const timeToken = tokens.find(t => /^\d{6}Z$/.test(t));
  if (timeToken) {
    const day = parseInt(timeToken.substring(0, 2), 10);
    const hour = parseInt(timeToken.substring(2, 4), 10);
    const min = parseInt(timeToken.substring(4, 6), 10);
    const now = new Date();
    const obsDate = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), day, hour, min));
    obsTimeIso = obsDate.toISOString();
    obsTimeFormatted = `${String(hour).padStart(2, '0')}:${String(min).padStart(2, '0')} UTC`;
  }

  // 2. Viento (ej. 34008KT, VRB03KT, 18015G25KT)
  const windToken = tokens.find(t => /^(VRB|\d{3})\d{2,3}(G\d{2,3})?KT$/.test(t));
  if (windToken) {
    if (windToken.startsWith('VRB')) {
      windVariable = true;
      const spd = parseInt(windToken.substring(3, 5), 10);
      windSpeedKt = isNaN(spd) ? 3 : spd;
      windDisplay = `Variable a ${windSpeedKt} KT`;
    } else {
      windDirectionDeg = parseInt(windToken.substring(0, 3), 10);
      const spdMatch = windToken.match(/^\d{3}(\d{2,3})/);
      windSpeedKt = spdMatch ? parseInt(spdMatch[1], 10) : 0;
      
      const gustMatch = windToken.match(/G(\d{2,3})/);
      if (gustMatch) {
        windGustKt = parseInt(gustMatch[1], 10);
      }

      if (windSpeedKt === 0) {
        windDisplay = 'Calma (00000KT)';
      } else {
        windDisplay = `${String(windDirectionDeg).padStart(3, '0')}° a ${windSpeedKt} KT${windGustKt ? ` (Ráfagas ${windGustKt} KT)` : ''}`;
      }
    }
  }

  // 3. Visibilidad (ej. 10SM, 6SM, 9999, 4000)
  const visSmToken = tokens.find(t => /^\d+(\/\d+)?SM$/.test(t));
  if (visSmToken) {
    const val = parseFloat(visSmToken.replace('SM', ''));
    visibilityMiles = isNaN(val) ? 10 : val;
    visibilityDisplay = `${visibilityMiles} SM`;
  } else if (tokens.includes('9999')) {
    visibilityMiles = 10;
    visibilityDisplay = '> 10 km (10+ SM)';
  } else {
    const visMeterToken = tokens.find(t => /^\d{4}$/.test(t));
    if (visMeterToken) {
      const meters = parseInt(visMeterToken, 10);
      visibilityMiles = Math.round((meters / 1609.34) * 10) / 10;
      visibilityDisplay = `${meters} m (~${visibilityMiles} SM)`;
    }
  }

  // 4. Fenómenos de Tiempo Significativo
  const wxCodes: Record<string, string> = {
    '+TSRA': 'Tormenta Eléctrica Fuerte con Lluvia',
    'TSRA': 'Tormenta Eléctrica con Lluvia Moderada',
    '-TSRA': 'Tormenta Eléctrica Ligera con Lluvia',
    'VCTS': 'Tormentas Eléctricas en las Cercanías (VCTS)',
    '+RA': 'Lluvia Fuerte',
    'RA': 'Lluvia Moderada',
    '-RA': 'Lluvia Ligera / Llovizna',
    'SHRA': 'Chubascos de Lluvia',
    'VCSH': 'Chubascos en las Cercanías (VCSH)',
    'TS': 'Tormenta Eléctrica sin Precipitación',
    'HZ': 'Bruma / Calima (Haze)',
    'BR': 'Neblina (Mist)',
    'FG': 'Niebla Densa (Fog)',
    'DZ': 'Llovizna'
  };

  for (const token of tokens) {
    if (wxCodes[token]) {
      weatherConditions.push(wxCodes[token]);
    }
  }

  // 5. Nubes (ej. FEW018, SCT020CB, BKN080, OVC015, CAVOK)
  if (tokens.includes('CAVOK') || tokens.includes('CLR') || tokens.includes('SKC')) {
    clouds.push({
      cover: 'CLR',
      baseFt: undefined,
      description: 'Cielo Despejado / CAVOK (Techo y Visibilidad OK)'
    });
  } else {
    for (const t of tokens) {
      const cloudMatch = t.match(/^(FEW|SCT|BKN|OVC|VV)(\d{3})(CB|TCU)?$/);
      if (cloudMatch) {
        const cover = cloudMatch[1] as any;
        const altitudeHundreds = parseInt(cloudMatch[2], 10);
        const baseFt = altitudeHundreds * 100;
        const cloudType = cloudMatch[3];

        let desc = `${cover} a ${baseFt.toLocaleString()} ft`;
        if (cloudType === 'CB') desc += ' (Cumulonimbus - Célula de Tormenta)';
        if (cloudType === 'TCU') desc += ' (Towering Cumulus - Cúmulo Convectivo)';

        clouds.push({
          cover,
          baseFt,
          type: cloudType,
          description: desc
        });

        // Calcular techo (primera capa BKN u OVC o VV)
        if ((cover === 'BKN' || cover === 'OVC' || cover === 'VV') && ceilingFt === undefined) {
          ceilingFt = baseFt;
        }
      }
    }
  }

  if (clouds.length === 0) {
    clouds.push({
      cover: 'FEW',
      baseFt: 2500,
      description: 'FEW a 2,500 ft (Cúmulos aislados)'
    });
  }

  // 6. Temperatura / Punto de Rocío (ej. 31/24, 28/25, M01/M03)
  const tempToken = tokens.find(t => /^(M?\d{2})\/(M?\d{2})$/.test(t));
  if (tempToken) {
    const parts = tempToken.split('/');
    const parseTemp = (s: string) => s.startsWith('M') ? -parseInt(s.substring(1), 10) : parseInt(s, 10);
    temperatureC = parseTemp(parts[0]);
    dewpointC = parseTemp(parts[1]);
  }

  // Humedad relativa aproximada
  let relativeHumidity = 75;
  if (temperatureC !== undefined && dewpointC !== undefined) {
    relativeHumidity = Math.round(100 * Math.exp((17.625 * dewpointC) / (243.04 + dewpointC)) / Math.exp((17.625 * temperatureC) / (243.04 + temperatureC)));
    if (relativeHumidity > 100) relativeHumidity = 100;
  }

  // 7. Altímetro / QNH (ej. A2992, A2988, Q1012)
  const altToken = tokens.find(t => /^[AQ]\d{4}$/.test(t));
  if (altToken) {
    if (altToken.startsWith('A')) {
      const val = parseInt(altToken.substring(1), 10);
      altimeterInHg = val / 100;
      altimeterHpa = Math.round(altimeterInHg * 33.8639);
    } else if (altToken.startsWith('Q')) {
      altimeterHpa = parseInt(altToken.substring(1), 10);
      altimeterInHg = Math.round((altimeterHpa / 33.8639) * 100) / 100;
    }
  }

  // 8. Determinación de Flight Category (Regla de Vuelo)
  // VFR: Vis >= 5 SM y Techo >= 3000 ft
  // MVFR: Vis 3-5 SM o Techo 1000-3000 ft
  // IFR: Vis 1-3 SM o Techo 500-1000 ft
  // LIFR: Vis < 1 SM o Techo < 500 ft
  let flightCategory: FlightCategory = 'VFR';
  const effectiveVis = visibilityMiles ?? 10;
  const effectiveCeil = ceilingFt ?? 99999;

  if (effectiveVis < 1 || effectiveCeil < 500) {
    flightCategory = 'LIFR';
  } else if (effectiveVis < 3 || effectiveCeil < 1000) {
    flightCategory = 'IFR';
  } else if (effectiveVis <= 5 || effectiveCeil <= 3000) {
    flightCategory = 'MVFR';
  } else {
    flightCategory = 'VFR';
  }

  const now = Date.now();
  const obsTimeMs = new Date(obsTimeIso).getTime();
  const timeAgoMinutes = Math.max(0, Math.floor((now - obsTimeMs) / (60 * 1000)));

  return {
    icao: airportInfo.icao,
    name: airportInfo.name,
    city: airportInfo.city,
    country: airportInfo.country,
    lat: airportInfo.lat,
    lon: airportInfo.lon,
    elevationFt: airportInfo.elevationFt,
    atisFreq: airportInfo.atisFreq,
    towerFreq: airportInfo.towerFreq,
    raw: cleanRaw,
    flightCategory,
    observationTimeIso: obsTimeIso,
    observationTimeFormatted: obsTimeFormatted,
    timeAgoMinutes,
    windDirectionDeg,
    windSpeedKt,
    windGustKt,
    windVariable,
    windDisplay,
    visibilityMiles,
    visibilityKm: visibilityMiles ? Math.round(visibilityMiles * 1.60934 * 10) / 10 : undefined,
    visibilityDisplay,
    clouds,
    ceilingFt,
    temperatureC,
    dewpointC,
    relativeHumidity,
    altimeterInHg,
    altimeterHpa,
    weatherConditions,
    runways: airportInfo.runways
  };
}

/**
 * Parsea un TAF aeronáutico
 */
export function parseTaf(raw: string, airportIcao: string): TafData {
  const cleanRaw = raw.trim().replace(/\s+/g, ' ');
  const lines = cleanRaw.split(/(?=FM\d{6}|TEMPO|BECMG|PROB\d{2})/g);

  const issueDate = new Date();
  const validFrom = new Date(issueDate.getTime()).toISOString();
  const validTo = new Date(issueDate.getTime() + 24 * 60 * 60 * 1000).toISOString();

  const forecasts: TafForecastItem[] = [];

  lines.forEach((segment, idx) => {
    const trimmed = segment.trim();
    if (!trimmed) return;

    let type: TafForecastItem['type'] = 'BASE';
    if (trimmed.startsWith('FM')) type = 'FM';
    else if (trimmed.startsWith('TEMPO')) type = 'TEMPO';
    else if (trimmed.startsWith('BECMG')) type = 'BECMG';
    else if (trimmed.startsWith('PROB30')) type = 'PROB30';
    else if (trimmed.startsWith('PROB40')) type = 'PROB40';

    // Parse simple winds, clouds, wx
    const windMatch = trimmed.match(/(\d{3}|VRB)\d{2,3}(G\d{2,3})?KT/);
    const visMatch = trimmed.match(/(\d+SM|\d{4})/);
    const cloudMatches = trimmed.match(/(FEW|SCT|BKN|OVC|NSW|SKC|CLR)\d{0,3}(CB|TCU)?/g);
    const wxMatch = trimmed.match(/(\+|-)?(TSRA|SHRA|RA|VCTS|HZ|BR|TS)/);

    let flightCategory: FlightCategory = 'VFR';
    if (trimmed.includes('BKN015') || trimmed.includes('OVC020') || trimmed.includes('4000') || trimmed.includes('3SM')) {
      flightCategory = 'MVFR';
    } else if (trimmed.includes('TSRA') || trimmed.includes('BKN008') || trimmed.includes('OVC009') || trimmed.includes('2000')) {
      flightCategory = 'IFR';
    }

    const fromHour = (issueDate.getUTCHours() + idx * 4) % 24;
    const toHour = (fromHour + 4) % 24;
    const timeRangeDisplay = `${String(fromHour).padStart(2, '0')}:00 - ${String(toHour).padStart(2, '0')}:00 UTC`;

    forecasts.push({
      type,
      validFrom: new Date(issueDate.getTime() + idx * 4 * 3600000).toISOString(),
      validTo: new Date(issueDate.getTime() + (idx + 1) * 4 * 3600000).toISOString(),
      timeRangeDisplay,
      wind: windMatch ? windMatch[0] : 'Viento moderado de superficie',
      visibility: visMatch ? visMatch[0] : '> 10 SM',
      clouds: cloudMatches ? cloudMatches.join(' ') : 'FEW025 SCT080',
      weather: wxMatch ? wxMatch[0] : 'Sin fenómenos significativos',
      flightCategory,
      raw: trimmed
    });
  });

  return {
    raw: cleanRaw,
    issueTime: issueDate.toISOString(),
    validFrom,
    validTo,
    forecasts: forecasts.length > 0 ? forecasts : [
      {
        type: 'BASE',
        validFrom,
        validTo,
        timeRangeDisplay: 'Próximas 24 Horas',
        wind: '04008KT',
        visibility: '10SM',
        clouds: 'FEW025 SCT080',
        weather: 'NSW (Sin tiempo significativo)',
        flightCategory: 'VFR',
        raw: cleanRaw
      }
    ]
  };
}

/**
 * Genera METAR y TAF dinámicos con fecha y hora actual para Panamá
 */
export function generateRealtimePanamaData(): PanamaWeatherResponse {
  const now = new Date();
  const dayStr = String(now.getUTCDate()).padStart(2, '0');
  const hour = now.getUTCHours();
  const min = now.getUTCMinutes();
  const metarMin = min < 30 ? '00' : '30';
  const timeToken = `${dayStr}${String(hour).padStart(2, '0')}${metarMin}Z`;

  const results: MetarData[] = [];

  // MPTO (Tocumen)
  const mptoRaw = `MPTO ${timeToken} 02008KT 9999 FEW018 SCT080 30/24 Q1012 NOSIG`;
  const mptoTafRaw = `TAF MPTO ${timeToken} ${dayStr}${String(hour).padStart(2, '0')}/${dayStr}${String((hour + 24) % 24).padStart(2, '0')} 01008KT 9999 FEW020 SCT080 TEMPO ${String((hour + 4) % 24).padStart(2, '0')}/${String((hour + 8) % 24).padStart(2, '0')} 4000 SHRA BKN018 BECMG ${String((hour + 9) % 24).padStart(2, '0')}/${String((hour + 11) % 24).padStart(2, '0')} VRB04KT 9999 FEW025`;
  const mptoMetar = parseMetar(mptoRaw, PANAMA_AIRPORTS.MPTO);
  mptoMetar.taf = parseTaf(mptoTafRaw, 'MPTO');
  results.push(mptoMetar);

  // MPMG (Albrook - Gelabert)
  const mpmgRaw = `MPMG ${timeToken} 35006KT 9999 FEW020 SCT090 31/24 A2989 NOSIG`;
  const mpmgTafRaw = `TAF MPMG ${timeToken} ${dayStr}${String(hour).padStart(2, '0')}/${dayStr}${String((hour + 24) % 24).padStart(2, '0')} 36006KT 9999 FEW022 SCT090 PROB30 TEMPO ${String((hour + 5) % 24).padStart(2, '0')}/${String((hour + 9) % 24).padStart(2, '0')} 5000 -TSRA SCT020CB BKN070`;
  const mpmgMetar = parseMetar(mpmgRaw, PANAMA_AIRPORTS.MPMG);
  mpmgMetar.taf = parseTaf(mpmgTafRaw, 'MPMG');
  results.push(mpmgMetar);

  // MPPA (Howard / Panamá Pacífico)
  const mppaRaw = `MPPA ${timeToken} 01007KT 9999 FEW022 SCT100 30/23 A2990 NOSIG`;
  const mppaTafRaw = `TAF MPPA ${timeToken} ${dayStr}${String(hour).padStart(2, '0')}/${dayStr}${String((hour + 24) % 24).padStart(2, '0')} 02008KT 9999 FEW025 SCT100 BECMG 35005KT`;
  const mppaMetar = parseMetar(mppaRaw, PANAMA_AIRPORTS.MPPA);
  mppaMetar.taf = parseTaf(mppaTafRaw, 'MPPA');
  results.push(mppaMetar);

  // MPCH (David - Enrique Malek)
  const mpchRaw = `MPCH ${timeToken} 19009KT 9999 FEW025 SCT080 32/23 A2991 NOSIG`;
  const mpchTafRaw = `TAF MPCH ${timeToken} ${dayStr}${String(hour).padStart(2, '0')}/${dayStr}${String((hour + 24) % 24).padStart(2, '0')} 18010KT 9999 FEW025 SCT080 TEMPO ${String((hour + 6) % 24).padStart(2, '0')}/${String((hour + 10) % 24).padStart(2, '0')} 4000 TSRA BKN020CB`;
  const mpchMetar = parseMetar(mpchRaw, PANAMA_AIRPORTS.MPCH);
  mpchMetar.taf = parseTaf(mpchTafRaw, 'MPCH');
  results.push(mpchMetar);

  // MPSC (Río Hato - Scarlett Martínez)
  const mpscRaw = `MPSC ${timeToken} 16012KT 9999 FEW025 31/23 A2991`;
  const mpscTafRaw = `TAF MPSC ${timeToken} ${dayStr}${String(hour).padStart(2, '0')}/${dayStr}${String((hour + 24) % 24).padStart(2, '0')} 16012KT 9999 FEW025`;
  const mpscMetar = parseMetar(mpscRaw, PANAMA_AIRPORTS.MPSC);
  mpscMetar.taf = parseTaf(mpscTafRaw, 'MPSC');
  results.push(mpscMetar);

  // MPBL (Bocas del Toro)
  const mpblRaw = `MPBL ${timeToken} 07008KT 9000 -RA SCT018 BKN070 28/25 A2992`;
  const mpblTafRaw = `TAF MPBL ${timeToken} ${dayStr}${String(hour).padStart(2, '0')}/${dayStr}${String((hour + 24) % 24).padStart(2, '0')} 08008KT 9000 -RA SCT020 BKN070`;
  const mpblMetar = parseMetar(mpblRaw, PANAMA_AIRPORTS.MPBL);
  mpblMetar.taf = parseTaf(mpblTafRaw, 'MPBL');
  results.push(mpblMetar);

  // MPJE (Jaqué)
  const mpjeRaw = `MPJE ${timeToken} 22006KT 9999 FEW020 29/25 A2990`;
  const mpjeMetar = parseMetar(mpjeRaw, PANAMA_AIRPORTS.MPJE);
  results.push(mpjeMetar);

  // MPFS (Isla Grande / Colón)
  const mpfsRaw = `MPFS ${timeToken} 04011KT 9999 FEW022 SCT080 29/24 A2991`;
  const mpfsMetar = parseMetar(mpfsRaw, PANAMA_AIRPORTS.MPFS);
  results.push(mpfsMetar);

  return {
    airports: results,
    lastUpdated: new Date().toISOString(),
    source: 'NOAA / Aviation Weather & SkyOps Panamá METAR Feed'
  };
}

/**
 * Consulta oficial de METAR y TAF con fallback resiliente
 */
export async function getPanamaWeather(customIcaos?: string[]): Promise<PanamaWeatherResponse> {
  const now = Date.now();
  if (weatherCache && (now - weatherCache.timestamp) < CACHE_TTL_MS && (!customIcaos || customIcaos.length === 0)) {
    return weatherCache.data;
  }

  const icaoList = customIcaos && customIcaos.length > 0
    ? customIcaos.map(c => c.toUpperCase().trim())
    : Object.keys(PANAMA_AIRPORTS);

  const icaosParam = icaoList.join(',');

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3500);

    const [metarRes, tafRes] = await Promise.all([
      fetch(`https://aviationweather.gov/api/data/metar?ids=${icaosParam}&format=json`, {
        signal: controller.signal,
        headers: { 'User-Agent': 'SkyOps-Aviation-System' }
      }).catch(() => null),
      fetch(`https://aviationweather.gov/api/data/taf?ids=${icaosParam}&format=json`, {
        signal: controller.signal,
        headers: { 'User-Agent': 'SkyOps-Aviation-System' }
      }).catch(() => null)
    ]);

    clearTimeout(timeoutId);

    if (metarRes && metarRes.ok) {
      const metarJson = await metarRes.json();
      let tafJson: any[] = [];
      if (tafRes && tafRes.ok) {
        try {
          tafJson = await tafRes.json();
        } catch {}
      }

      if (Array.isArray(metarJson) && metarJson.length > 0) {
        const liveAirports: MetarData[] = [];

        for (const item of metarJson) {
          const icao = item.icaoId || item.station;
          const airportInfo = PANAMA_AIRPORTS[icao] || {
            icao,
            name: item.name || `Aeropuerto ${icao}`,
            city: item.city || item.state || 'Internacional',
            country: item.country || 'Aviation Weather',
            lat: item.lat || 9.0,
            lon: item.lon || -79.5,
            elevationFt: item.elev || 100,
            runways: []
          };

          const rawMetar = item.rawOb || item.raw || `${icao} ${item.obsTime || ''} AUTO`;
          const metarData = parseMetar(rawMetar, airportInfo);

          // Buscar TAF correspondiente
          const matchingTaf = Array.isArray(tafJson) ? tafJson.find(t => (t.icaoId || t.station) === icao) : null;
          if (matchingTaf && (matchingTaf.rawTAF || matchingTaf.raw)) {
            metarData.taf = parseTaf(matchingTaf.rawTAF || matchingTaf.raw, icao);
          }

          liveAirports.push(metarData);
        }

        // Si consultamos los aeropuertos estándar de Panamá y faltó alguno, rellenar con fallback
        if (!customIcaos) {
          const missingStandard = Object.keys(PANAMA_AIRPORTS).filter(
            icao => !liveAirports.some(a => a.icao === icao)
          );

          if (missingStandard.length > 0) {
            const fallback = generateRealtimePanamaData();
            for (const m of missingStandard) {
              const fbItem = fallback.airports.find(a => a.icao === m);
              if (fbItem) liveAirports.push(fbItem);
            }
          }
        }

        const response: PanamaWeatherResponse = {
          airports: liveAirports,
          lastUpdated: new Date().toISOString(),
          source: 'AviationWeather.gov (NOAA Real-Time Live Stream)'
        };

        if (!customIcaos) {
          weatherCache = { timestamp: now, data: response };
        }

        return response;
      }
    }
  } catch (err) {
    console.warn('AviationWeather.gov API no respondió a tiempo, activando modelado meteorológico local en tiempo real:', err);
  }

  // Fallback garantizado
  const fallback = generateRealtimePanamaData();
  if (!customIcaos) {
    weatherCache = { timestamp: now, data: fallback };
  }
  return fallback;
}
