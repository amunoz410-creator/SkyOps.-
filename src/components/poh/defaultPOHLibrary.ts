import { POHDocument } from '../../types';

export const DEFAULT_POH_LIBRARY: POHDocument[] = [
  {
    id: 'poh-c172sp-hp1588',
    matricula: 'HP-1588',
    modelo: 'Cessna 172SP Nav III (G1000)',
    titulo: "Pilot's Operating Handbook & FAA Approved Airplane Flight Manual - Model 172SP Nav III",
    tipo: 'poh_completo',
    version: 'Revisión 5 (Aprobado FAA/DGAC)',
    fecha_emision: '2023-11-15',
    suministrado_por: 'Dirección de Escuela & Jefatura Técnica',
    suministrado_por_rol: 'escuela',
    suministrado_en: '2024-01-10T08:00:00Z',
    paginas: 384,
    tamano_kb: 14200,
    descripcion: 'Manual de operaciones completo para la aeronave Cessna 172SP con suite integrada Garmin G1000 (PFD/MFD), piloto automático GFC 700 y motor Lycoming IO-360-L2A de inyección.',
    es_oficial: true,
    secciones: [
      {
        numero: 1,
        titulo: 'Sección 1: Información General',
        subtitulo: 'Dimensiones, Planta Motriz, Combustible y Aceite',
        resumen: 'Especificaciones del motor Lycoming IO-360-L2A (180 BHP a 2700 RPM), hélice McCauley bipala de paso fijo, combustible AVGAS 100LL (56 gal totales, 53 gal útiles) y capacidades de aceite (8 qts máximo, 5 qts mínimo operacional).',
        items_clave: [
          { etiqueta: 'Motor', valor: 'Lycoming IO-360-L2A (180 HP)', categoria: 'general' },
          { etiqueta: 'Combustible Total', valor: '56.0 US Gal (212 L)', categoria: 'general' },
          { etiqueta: 'Combustible Útil', valor: '53.0 US Gal (200.6 L)', categoria: 'general' },
          { etiqueta: 'Capacidad Aceite', valor: '8.0 US Quarts (Mín 5.0)', categoria: 'general' },
          { etiqueta: 'Envergadura', valor: '36 pies 1 pulgada (11.0 m)', categoria: 'general' }
        ]
      },
      {
        numero: 2,
        titulo: 'Sección 2: Limitaciones Operacionales',
        subtitulo: 'Velocidades de Operación (V-Speeds), Pesos y Envolvente',
        resumen: 'Limitaciones certificadas de velocidad anemométrica en KIAS, pesos máximos para rampa, despegue y aterrizaje, y factores de carga en categoría normal y utilitaria.',
        items_clave: [
          { etiqueta: 'Vso (Pérdida Flaps Extendidos)', valor: '40 KIAS (Arco Blanco inf.)', categoria: 'v_speeds' },
          { etiqueta: 'Vs (Pérdida Limpia Flaps Up)', valor: '48 KIAS (Arco Verde inf.)', categoria: 'v_speeds' },
          { etiqueta: 'Vr (Rotación Despegue)', valor: '55 KIAS', categoria: 'v_speeds' },
          { etiqueta: 'Vx (Mejor Ángulo Ascenso)', valor: '62 KIAS', categoria: 'v_speeds' },
          { etiqueta: 'Vy (Mejor Régimen Ascenso)', valor: '74 KIAS', categoria: 'v_speeds' },
          { etiqueta: 'Vfe 10° (Flaps 10°)', valor: '110 KIAS', categoria: 'v_speeds' },
          { etiqueta: 'Vfe 10°-30° (Flaps Full)', valor: '85 KIAS (Arco Blanco sup.)', categoria: 'v_speeds' },
          { etiqueta: 'Va (Maniobra a 2550 lbs)', valor: '105 KIAS', categoria: 'v_speeds' },
          { etiqueta: 'Vno (Crucero Estructural Máx)', valor: '129 KIAS (Arco Verde sup.)', categoria: 'v_speeds' },
          { etiqueta: 'Vne (Nunca Exceder)', valor: '163 KIAS (Línea Roja)', advertencia: true, categoria: 'v_speeds' },
          { etiqueta: 'Peso Máximo Rampa', valor: '2,558 lbs (1,160 kg)', categoria: 'peso' },
          { etiqueta: 'Peso Máximo Despegue', valor: '2,550 lbs (1,157 kg)', categoria: 'peso' },
          { etiqueta: 'Factor Carga (Normal)', valor: '+3.8G / -1.52G (Flaps Up)', categoria: 'general' }
        ]
      },
      {
        numero: 3,
        titulo: 'Sección 3: Procedimientos de Emergencia',
        subtitulo: 'Elementos de Memoria Inmediata (Boldface Memory Items)',
        resumen: 'Acciones obligatorias de memoria ante fallas críticas de motor, fuego a bordo, fallas del sistema eléctrico de 28V y recuperación de barrenas.',
        items_clave: [
          { etiqueta: 'Velocidad de Mejor Planeo', valor: '68 KIAS (2550 lbs)', advertencia: true, categoria: 'emergencia' },
          { etiqueta: 'Frecuencia de Emergencia', valor: '121.50 MHz', categoria: 'emergencia' },
          { etiqueta: 'Código Transponder Emergencia', valor: 'Squawk 7700', categoria: 'emergencia' }
        ],
        items_checklist: [
          { paso: 'Falla de Motor en Despegue (Pista disponible)', accion: 'Gases IDLE inmediatamente, Frenos MÁXIMO aplicados, Flaps RETRAER.', critico: true },
          { paso: 'Falla de Motor tras Despegue (Sin pista)', accion: 'Cabeceo abajo 68 KIAS (Mejor planeo). No intentar retorno a la pista.', critico: true },
          { paso: 'Falla de Motor en Vuelo (Reencendido)', accion: 'Velocidad 68 KIAS. Selector Combustible: AMBOS. Bomba Auxiliar: ON. Mezcla: RICA.', critico: true },
          { paso: 'Fuego de Motor en Vuelo', accion: 'Mezcla: CORTADA. Válvula Combustible: OFF. Bomba Aux: OFF. Master: OFF. Cabina Air: CERRAR.', critico: true },
          { paso: 'Fuego Eléctrico en Cabina', accion: 'Master Switch: OFF. Avionics Switch: OFF. Ventilación: ABRIR. Extintor: DESCARGAR.', critico: true },
          { paso: 'Recuperación de Barrena (Spin)', accion: 'Gases: IDLE. Timón de Dirección: PEDAL OPUESTO A FONDO. Control de Mando: ADELANTE ENÉRGICO.', critico: true }
        ]
      },
      {
        numero: 4,
        titulo: 'Sección 4: Procedimientos Normales',
        subtitulo: 'Listas de Verificación de Vuelo y Operación Estándar',
        resumen: 'Checklists estandarizados para inspección prevuelo, puesta en marcha con inyección, rodaje, chequeo de magnetos antes del despegue, crucero, descenso y parada de motor.',
        items_checklist: [
          { paso: 'Inspección Prevuelo', accion: 'Comprobar documentos aeronave, drenar 13 puntos de combustible, verificar 5-8 qts aceite, superficies libres.' },
          { paso: 'Puesta en Marcha (Frío)', accion: 'Master ON, Luces Beacon ON, Bomba Aux ON 3-5 seg (Cebar flujo), Llave START, Presión de Aceite verde en 30 seg.' },
          { paso: 'Chequeo Antes de Despegue (Run-Up)', accion: 'Frenos fijados, 1800 RPM, Magnetos L/R (caída máx 150 RPM, dif máx 50 RPM), Vacío 4.5-5.5, Calefacción pitot ON/OFF.' },
          { paso: 'Despegue Normal', accion: 'Flaps 0°-10°, Potencia FULL, Verificar RPM 2300+, Instrumentos motor verdes, Rotar a 55 KIAS, Ascenso a 70-80 KIAS.' },
          { paso: 'Navegación Crucero', accion: 'Nivelar, Potencia 2100-2700 RPM (65%-75%), Mezclar para 50°F del lado pobre de pico EGT tras 3000 ft.' },
          { paso: 'Aproximación y Aterrizaje', accion: 'Combustible AMBOS, Mezcla RICA, Luces Landing ON, Velocidad 65-75 KIAS (Flaps 10°), 60-70 KIAS (Flaps 30°).' }
        ]
      },
      {
        numero: 5,
        titulo: 'Sección 5: Rendimiento y Performance',
        subtitulo: 'Distancias de Despegue, Tasas de Ascenso y Consumo de Crucero',
        resumen: 'Cálculo de carrera de despegue y franqueamiento de obstáculo de 50 pies a nivel del mar (960 ft rodaje, 1630 ft sobre obstáculo a 2550 lbs a ISA). Consumo en crucero estándar al 75% de potencia: 9.5-10.2 GPH.',
        items_clave: [
          { etiqueta: 'Carrera Despegue (Nivel del Mar ISA)', valor: '960 ft (293 m)', categoria: 'general' },
          { etiqueta: 'Distancia Despegue (Obstáculo 50 ft)', valor: '1,630 ft (497 m)', categoria: 'general' },
          { etiqueta: 'Tasa de Ascenso Máxima', valor: '730 fpm (Nivel del Mar)', categoria: 'general' },
          { etiqueta: 'Techo de Servicio', valor: '14,000 ft MSL', categoria: 'general' },
          { etiqueta: 'Carrera Aterrizaje (Nivel del Mar)', valor: '575 ft (175 m)', categoria: 'general' },
          { etiqueta: 'Consumo Crucero 75% (6,000 ft)', valor: '9.8 GPH (AVGAS 100LL)', categoria: 'general' }
        ]
      },
      {
        numero: 6,
        titulo: 'Sección 6: Peso y Balance (Weight & Balance)',
        subtitulo: 'Datos de Estaciones, Brazos (Arms) y Envolvente CG',
        resumen: 'Datum de referencia: Cara frontal del mamparo cortafuegos (Firewall). Estaciones de carga estándar: Asientos delanteros (37.0 in), Asientos traseros (73.0 in), Equipaje 1 (95.0 in), Combustible (46.0 in).',
        items_clave: [
          { etiqueta: 'Brazo Asientos Delanteros (Piloto/Copiloto)', valor: 'Estación 37.0 in', categoria: 'peso' },
          { etiqueta: 'Brazo Asientos Traseros (Pasajeros)', valor: 'Estación 73.0 in', categoria: 'peso' },
          { etiqueta: 'Brazo Tanques Combustible', valor: 'Estación 46.0 in', categoria: 'peso' },
          { etiqueta: 'Brazo Área de Equipaje 1 (120 lbs máx)', valor: 'Estación 95.0 in', categoria: 'peso' },
          { etiqueta: 'Brazo Área de Equipaje 2 (50 lbs máx)', valor: 'Estación 123.0 in', categoria: 'peso' },
          { etiqueta: 'Límite CG Adelantado (2550 lbs)', valor: '41.0 in posterior al datum', categoria: 'peso' },
          { etiqueta: 'Límite CG Posterior (Todas masas)', valor: '47.3 in posterior al datum', categoria: 'peso' }
        ]
      },
      {
        numero: 7,
        titulo: 'Sección 7: Descripción del Avión y sus Sistemas',
        subtitulo: 'Estructura, Sistema de Combustible, Eléctrico y Garmin G1000',
        resumen: 'Estructura semimonocasco de aluminio. Sistema de inyección continua directa RSA-5AD1. Sistema eléctrico de 28V DC con alternador de 60A y batería principal de 24V respaldada por batería esencial.',
        items_clave: [
          { etiqueta: 'Sistema Eléctrico', valor: '28V DC / Alternador 60A / Batería 24V', categoria: 'sistema' },
          { etiqueta: 'Aviónica Integrada', valor: 'Garmin G1000 Dual 10.4" LCD Displays', categoria: 'sistema' },
          { etiqueta: 'Sistema de Frenos', valor: 'Discos hidráulicos independientes operados por pedales', categoria: 'sistema' },
          { etiqueta: 'Sistema de Flaps', valor: 'Actuación eléctrica con retenes a 10°, 20° y 30°', categoria: 'sistema' }
        ]
      }
    ]
  },
  {
    id: 'poh-c172-hp1450',
    matricula: 'HP-1450',
    modelo: 'Cessna 172 Skyhawk Classic',
    titulo: "Pilot's Operating Handbook & Airplane Flight Manual - Model 172 Classic Análoga",
    tipo: 'poh_completo',
    version: 'Revisión 3 (Manual Oficial de Escuela)',
    fecha_emision: '2023-08-20',
    suministrado_por: 'Jefatura de Operaciones de Vuelo',
    suministrado_por_rol: 'admin',
    suministrado_en: '2023-12-01T10:30:00Z',
    paginas: 298,
    tamano_kb: 11800,
    descripcion: 'Manual de vuelo operacional para aeronave monomotor Cessna 172 con instrumentación analógica tradicional de 6 instrumentos (Six-Pack) y receptor GPS Garmin GNS 430.',
    es_oficial: true,
    secciones: [
      {
        numero: 1,
        titulo: 'Sección 1: Especificaciones Generales',
        subtitulo: 'Planta Motriz y Capacidades Operativas',
        resumen: 'Motor Lycoming IO-360-L2A (180 HP a 2700 RPM), hélice fija McCauley 1A170E/JHA7660, combustible AVGAS 100LL de 53 galones útiles.',
        items_clave: [
          { etiqueta: 'Motor', valor: 'Lycoming IO-360-L2A (180 HP)', categoria: 'general' },
          { etiqueta: 'Combustible Útil', valor: '53.0 US Gal (AVGAS 100LL)', categoria: 'general' },
          { etiqueta: 'Velocidad Crucero Promedio', valor: '110 KTAS', categoria: 'general' }
        ]
      },
      {
        numero: 2,
        titulo: 'Sección 2: Limitaciones y Velocidades',
        subtitulo: 'V-Speeds para Operación en Instrucción',
        items_clave: [
          { etiqueta: 'Vso', valor: '40 KIAS', categoria: 'v_speeds' },
          { etiqueta: 'Vs', valor: '48 KIAS', categoria: 'v_speeds' },
          { etiqueta: 'Vr', valor: '55 KIAS', categoria: 'v_speeds' },
          { etiqueta: 'Vx', valor: '62 KIAS', categoria: 'v_speeds' },
          { etiqueta: 'Vy', valor: '74 KIAS', categoria: 'v_speeds' },
          { etiqueta: 'Vfe', valor: '85 KIAS (Flaps Full)', categoria: 'v_speeds' },
          { etiqueta: 'Va', valor: '105 KIAS', categoria: 'v_speeds' },
          { etiqueta: 'Vno', valor: '129 KIAS', categoria: 'v_speeds' },
          { etiqueta: 'Vne', valor: '163 KIAS', advertencia: true, categoria: 'v_speeds' }
        ]
      },
      {
        numero: 3,
        titulo: 'Sección 3: Procedimientos de Emergencia',
        subtitulo: 'Procedimientos Inmediatos en Cabina',
        items_checklist: [
          { paso: 'Falla de Motor en Vuelo', accion: 'Planear a 68 KIAS, Selector Combustible AMBOS, Mezcla RICA, Calefacción de Carburador/Inyección según corresponda, Magnetos BOTH.', critico: true },
          { paso: 'Fuego en Motor en Tierra', accion: 'Continuar arrancando para aspirar llamas hacia motor. Si no enciende: Mezcla CORTADA, Selector OFF, Master OFF.', critico: true }
        ]
      }
    ]
  },
  {
    id: 'poh-pa44-hp1822',
    matricula: 'HP-1822',
    modelo: 'Piper PA-44-180 Seminole (Bimotor)',
    titulo: "Pilot's Operating Handbook and FAA Approved Airplane Flight Manual - Seminole PA-44-180",
    tipo: 'poh_completo',
    version: 'Revisión 6 (Edición Multimotor)',
    fecha_emision: '2023-09-10',
    suministrado_por: 'Dirección de Escuela de Aviación',
    suministrado_por_rol: 'escuela',
    suministrado_en: '2023-11-20T14:15:00Z',
    paginas: 412,
    tamano_kb: 16500,
    descripcion: 'Manual de operaciones completo para la aeronave multimotor Piper Seminole PA-44-180, equipada con dos motores contrarrotativos Lycoming O-360 y hélices de paso variable con embanderamiento.',
    es_oficial: true,
    secciones: [
      {
        numero: 1,
        titulo: 'Sección 1: Generalidades Multimotor',
        subtitulo: 'Dos Motores Contrarrotativos Lycoming O-360-E1A6D (180 HP c/u)',
        resumen: 'Eliminación del motor crítico gracias a hélices contrarrotativas (motor izquierdo gira a favor de agujas del reloj, motor derecho gira en sentido inverso). Capacidad de combustible de 110 galones totales (108 gal útiles).',
        items_clave: [
          { etiqueta: 'Motores', valor: '2x Lycoming O-360 (180 HP cada uno)', categoria: 'general' },
          { etiqueta: 'Combustible Total', valor: '110 US Galones', categoria: 'general' },
          { etiqueta: 'Combustible Útil', valor: '108 US Galones (54 gal por ala)', categoria: 'general' },
          { etiqueta: 'Hélices', valor: 'Hartzell bipala velocidad constante y embanderamiento', categoria: 'general' }
        ]
      },
      {
        numero: 2,
        titulo: 'Sección 2: Limitaciones & Velocidades Bimotor',
        subtitulo: 'V-Speeds Críticas de Seguridad Multimotor',
        items_clave: [
          { etiqueta: 'Vmc (Vel. Control Mínimo con Motor Inop.)', valor: '56 KIAS (Línea Roja Radial)', advertencia: true, categoria: 'v_speeds' },
          { etiqueta: 'Vsse (Vel. Segura para Falla Deliberada)', valor: '82 KIAS', categoria: 'v_speeds' },
          { etiqueta: 'Vyse (Mejor Régimen Ascenso Monomotor)', valor: '88 KIAS (Línea Azul)', categoria: 'v_speeds' },
          { etiqueta: 'Vxse (Mejor Ángulo Monomotor)', valor: '82 KIAS', categoria: 'v_speeds' },
          { etiqueta: 'Vlo (Operación Tren de Aterrizaje)', valor: 'Extensión 140 KIAS / Retracción 109 KIAS', categoria: 'v_speeds' },
          { etiqueta: 'Vle (Tren Extendido)', valor: '140 KIAS', categoria: 'v_speeds' },
          { etiqueta: 'Vne (Nunca Exceder)', valor: '202 KIAS', advertencia: true, categoria: 'v_speeds' }
        ]
      },
      {
        numero: 3,
        titulo: 'Sección 3: Procedimientos de Emergencia Multimotor',
        subtitulo: 'Falla de Motor en Vuelo y Procedimiento de Embanderamiento',
        items_checklist: [
          { paso: 'Falla de Motor en Vuelo (Identificar)', accion: 'Mantener control direccional (Inclinación 2°-5° hacia motor vivo, medio pedal hacia bola centrada). Mantener 88 KIAS (Línea azul).', critico: true },
          { paso: 'Verificar & Asegurar', accion: 'Palancas de potencia ADELANTE (Mezclas, Hélices, Gases). Tren y Flaps ARRIBA. Identificar: Pie muerto, motor muerto.', critico: true },
          { paso: 'Embanderar Motor Inoperativo', accion: 'Acelerar levemente motor dudoso; si no responde: Palanca de hélice del motor inoperativo hacia ATRÁS al retén de FEATHER antes de 950 RPM.', critico: true },
          { paso: 'Asegurar Motor Afectado', accion: 'Mezcla CORTADA, Magnetos OFF, Bomba auxiliar OFF, Alternador OFF, Válvula de combustible OFF.', critico: true }
        ]
      }
    ]
  },
  {
    id: 'poh-pa28-hp1799',
    matricula: 'HP-1799',
    modelo: 'Piper PA-28-181 Archer III',
    titulo: "Archer III PA-28-181 Information Manual & POH",
    tipo: 'poh_completo',
    version: 'Revisión 4',
    fecha_emision: '2023-06-15',
    suministrado_por: 'Jefatura de Operaciones',
    suministrado_por_rol: 'admin',
    suministrado_en: '2023-10-05T09:00:00Z',
    paginas: 340,
    tamano_kb: 13100,
    descripcion: 'Manual de operaciones oficial para Piper Archer III con aviónica Garmin G5 Dual y motor Lycoming O-360-A4M de 180 HP.',
    es_oficial: true,
    secciones: [
      {
        numero: 1,
        titulo: 'Sección 1: Generalidades',
        subtitulo: 'Avión de ala baja, tren fijo triciclo',
        items_clave: [
          { etiqueta: 'Motor', valor: 'Lycoming O-360-A4M (180 HP)', categoria: 'general' },
          { etiqueta: 'Combustible Útil', valor: '48.0 US Galones', categoria: 'general' },
          { etiqueta: 'Velocidad de Crucero', valor: '118 KTAS', categoria: 'general' }
        ]
      },
      {
        numero: 2,
        titulo: 'Sección 2: Velocidades V-Speeds',
        subtitulo: 'Límites Operacionales',
        items_clave: [
          { etiqueta: 'Vso', valor: '45 KIAS', categoria: 'v_speeds' },
          { etiqueta: 'Vs', valor: '50 KIAS', categoria: 'v_speeds' },
          { etiqueta: 'Vr', valor: '60 KIAS', categoria: 'v_speeds' },
          { etiqueta: 'Vx', valor: '64 KIAS', categoria: 'v_speeds' },
          { etiqueta: 'Vy', valor: '76 KIAS', categoria: 'v_speeds' },
          { etiqueta: 'Vfe', valor: '102 KIAS', categoria: 'v_speeds' },
          { etiqueta: 'Vne', valor: '154 KIAS', advertencia: true, categoria: 'v_speeds' }
        ]
      }
    ]
  },
  {
    id: 'poh-pa28-hp1934',
    matricula: 'HP-1934',
    modelo: 'Piper PA-28-161 Cherokee Warrior II',
    titulo: "Warrior II PA-28-161 Pilot's Operating Handbook",
    tipo: 'poh_completo',
    version: 'Revisión 2',
    fecha_emision: '2023-04-10',
    suministrado_por: 'Dirección de Escuela de Aviación',
    suministrado_por_rol: 'escuela',
    suministrado_en: '2023-09-12T11:20:00Z',
    paginas: 280,
    tamano_kb: 9500,
    descripcion: 'Manual de vuelo de Piper Warrior II equipado con motor Lycoming O-320-D2A de 160 HP, ideal para fases primarias de instrucción.',
    es_oficial: true,
    secciones: [
      {
        numero: 1,
        titulo: 'Sección 1: Generalidades',
        subtitulo: 'Monomotor Terrestre 160 HP',
        items_clave: [
          { etiqueta: 'Motor', valor: 'Lycoming O-320-D2A (160 HP)', categoria: 'general' },
          { etiqueta: 'Combustible Útil', valor: '48.0 US Galones', categoria: 'general' },
          { etiqueta: 'Consumo Horario', valor: '8.0 GPH', categoria: 'general' }
        ]
      }
    ]
  },
  {
    id: 'poh-sim-alx',
    matricula: 'SIM-ALX',
    modelo: 'Simulador Alsim ALX FNPT II',
    titulo: 'Alsim ALX Flight Training Device Standard Operating Procedures & POH',
    tipo: 'poh_completo',
    version: 'Revisión 2.1 (Certificado AAC Panamá)',
    fecha_emision: '2023-10-01',
    suministrado_por: 'Jefatura de Operaciones de Vuelo',
    suministrado_por_rol: 'admin',
    suministrado_en: '2023-11-01T08:00:00Z',
    paginas: 210,
    tamano_kb: 8400,
    descripcion: 'Procedimientos estandarizados y guía técnica de entrenamiento sintético para créditos oficiales de horas IFR y procedimientos de emergencia.',
    es_oficial: true,
    secciones: [
      {
        numero: 1,
        titulo: 'Sección 1: Especificaciones del Simulador',
        subtitulo: 'Entrenador Sintético FNPT II / MCC',
        items_clave: [
          { etiqueta: 'Tipo de Dispositivo', valor: 'Alsim ALX FNPT II Multi-Configuration', categoria: 'general' },
          { etiqueta: 'Visual', valor: 'Sistema Envolvente 208° FOV', categoria: 'general' },
          { etiqueta: 'Crédito Regulatorio', valor: 'AAC Panamá RAC 61 & RAC 141', categoria: 'general' }
        ]
      }
    ]
  }
];
