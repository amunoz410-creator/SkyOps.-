/**
 * Catálogo Oficial de Maniobras de Vuelo de SkyOps (Bilingüe ES / EN - Estándares de Entrenamiento Aeronáutico)
 * Dividido en 3 Columnas Reglamentarias para la Hoja de Progreso
 */

export interface ManeuverDefinition {
  id: string;
  nombre: string;
  nombre_en: string;
  columna: 1 | 2 | 3;
  categoria: string;
  categoria_en: string;
  descripcion: string;
  descripcion_en: string;
}

export const MANEUVERS_CATALOG: ManeuverDefinition[] = [
  // COLUMNA 1 (11 Maniobras)
  {
    id: 'run_up',
    nombre: 'Run Up',
    nombre_en: 'Engine Run-Up & System Checks',
    columna: 1,
    categoria: 'Pre-Vuelo',
    categoria_en: 'Pre-Flight',
    descripcion: 'Prueba de magnetos, hélice paso variable, alternadores, presión y temp de aceite.',
    descripcion_en: 'Magneto check, propeller governor, alternators, oil pressure and temperature checks.'
  },
  {
    id: 'despegue_normal',
    nombre: 'Despegue normal',
    nombre_en: 'Normal Takeoff and Climb',
    columna: 1,
    categoria: 'Despegue',
    categoria_en: 'Takeoff',
    descripcion: 'Alineación de eje de pista, potencia de despegue y rotación a Vr.',
    descripcion_en: 'Centerline alignment, full takeoff power application, and rotation at Vr.'
  },
  {
    id: 'ascenso_vel_cte',
    nombre: 'Ascenso velocidad constante',
    nombre_en: 'Constant Airspeed Climb (Vy/Vx)',
    columna: 1,
    categoria: 'Ascenso',
    categoria_en: 'Climb',
    descripcion: 'Mantenimiento de Vy / Vx con control de mezcla y compensador.',
    descripcion_en: 'Maintaining Vy / Vx with mixture control, rudder coordination, and trim.'
  },
  {
    id: 'descenso_vel_cte',
    nombre: 'Descenso velocidad constante',
    nombre_en: 'Constant Airspeed Descent',
    columna: 1,
    categoria: 'Descenso',
    categoria_en: 'Descent',
    descripcion: 'Ajuste de potencia para régimen de descenso estándar sin exceder Vno.',
    descripcion_en: 'Power and pitch management for target descent rate without exceeding Vno.'
  },
  {
    id: 'virajes_suaves_10_20',
    nombre: 'Virajes suaves 10° y 20°',
    nombre_en: 'Shallow & Medium Turns (10° - 20°)',
    columna: 1,
    categoria: 'Vuelo Básico',
    categoria_en: 'Basic Maneuvers',
    descripcion: 'Coordinación de alerones y timón de dirección manteniendo altitud.',
    descripcion_en: 'Aileron and rudder coordination while maintaining constant altitude and bank.'
  },
  {
    id: 'virajes_escarpados_30_45',
    nombre: 'Virajes escarpados 30° y 45°',
    nombre_en: 'Steep Turns (30° - 45° / 50°)',
    columna: 1,
    categoria: 'Maniobras de Precisión',
    categoria_en: 'Precision Maneuvers',
    descripcion: 'Incremento de factor de carga, potencia y compensación a 45°/50°.',
    descripcion_en: 'Load factor management, back pressure, power addition and trim at 45°/50° bank.'
  },
  {
    id: 'vuelo_lento_con_flaps_tren',
    nombre: 'Vuelo Lento: Con Flaps y Tren',
    nombre_en: 'Slow Flight (Dirty - Flaps & Gear)',
    columna: 1,
    categoria: 'Vuelo Lento',
    categoria_en: 'Slow Flight',
    descripcion: 'Vuelo a velocidad mínima de control en configuración sucia de aterrizaje.',
    descripcion_en: 'Flight at minimum controllable airspeed in landing configuration.'
  },
  {
    id: 'vuelo_lento_sin_flaps_tren',
    nombre: 'Vuelo Lento: Sin Flaps y Tren',
    nombre_en: 'Slow Flight (Clean Configuration)',
    columna: 1,
    categoria: 'Vuelo Lento',
    categoria_en: 'Slow Flight',
    descripcion: 'Vuelo a velocidad mínima de control en configuración limpia de crucero.',
    descripcion_en: 'Flight at minimum controllable airspeed in clean cruise configuration.'
  },
  {
    id: 'virajes_alrededor_punto',
    nombre: 'Virajes alrededor de un punto',
    nombre_en: 'Turns Around a Point',
    columna: 1,
    categoria: 'Maniobras de Tierra',
    categoria_en: 'Ground Reference',
    descripcion: 'Compensación de deriva por viento manteniendo radio constante respecto a una referencia.',
    descripcion_en: 'Wind drift correction maintaining a constant radius around a ground reference.'
  },
  {
    id: 'stall_sin_potencia',
    nombre: 'Stall: Sin Potencia',
    nombre_en: 'Power-Off Stalls (Approach/Landing)',
    columna: 1,
    categoria: 'Pérdidas',
    categoria_en: 'Stalls',
    descripcion: 'Simulación de pérdida en aproximación final y recuperación con mínima pérdida de altitud.',
    descripcion_en: 'Stall recovery in landing configuration with prompt power addition and minimum altitude loss.'
  },
  {
    id: 'stall_con_potencia',
    nombre: 'Stall: Con Potencia',
    nombre_en: 'Power-On Stalls (Takeoff/Climb)',
    columna: 1,
    categoria: 'Pérdidas',
    categoria_en: 'Stalls',
    descripcion: 'Simulación de pérdida en actitud de despegue/ascenso y control direccional.',
    descripcion_en: 'Takeoff and departure stall recognition, directional rudder control, and prompt recovery.'
  },

  // COLUMNA 2 (11 Maniobras)
  {
    id: 'ingreso_circuito_45',
    nombre: 'Ingreso al Circuito (45°)',
    nombre_en: 'Pattern Entry (45° to Downwind)',
    columna: 2,
    categoria: 'Circuito de Tránsito',
    categoria_en: 'Traffic Pattern',
    descripcion: 'Incorporación a la pierna a favor del viento a 45° a la altitud de patrón.',
    descripcion_en: 'Standard 45-degree pattern entry into the downwind leg at designated pattern altitude.'
  },
  {
    id: 'circuito_rectangulo',
    nombre: 'Circuito Rectángulo',
    nombre_en: 'Rectangular Course / Traffic Pattern',
    columna: 2,
    categoria: 'Circuito de Tránsito',
    categoria_en: 'Traffic Pattern',
    descripcion: 'Mantenimiento del patrón de tráfico estándar con viento cruzado y corrección de deriva.',
    descripcion_en: 'Maintaining standard traffic pattern legs with wind crab angles and spacing.'
  },
  {
    id: 'aterrizajes_despegues',
    nombre: 'Aterrizajes y Despegues',
    nombre_en: 'Touch and Go / Landings',
    columna: 2,
    categoria: 'Toque y Despegue',
    categoria_en: 'Takeoff & Landing',
    descripcion: 'Touch & Go con reconfiguración rápida de flaps, calefacción de carburador y potencia.',
    descripcion_en: 'Touch-and-go drills with flap retraction, carburetor heat control, and smooth takeoff power.'
  },
  {
    id: 'briefing_emergencias',
    nombre: 'Briefing de Emergencias',
    nombre_en: 'Emergency Takeoff Briefing',
    columna: 2,
    categoria: 'Seguridad',
    categoria_en: 'Safety',
    descripcion: 'Repaso verbal de acciones inmediatas de memoria ante fallas de motor antes del despegue.',
    descripcion_en: 'Verbal review of rejected takeoff and engine failure memory items prior to takeoff roll.'
  },
  {
    id: 'briefing_pasajeros',
    nombre: 'Briefing de Pasajeros',
    nombre_en: 'Passenger Safety Briefing (SAFETY)',
    columna: 2,
    categoria: 'Seguridad',
    categoria_en: 'Safety',
    descripcion: 'Instrucciones sobre cinturones, salidas de emergencia, extintor y no tocar mandos.',
    descripcion_en: 'Passenger briefing on seatbelts, exits, fire extinguisher, and sterile cockpit rules.'
  },
  {
    id: 'emergencias_despegue',
    nombre: 'Emergencias en despegue',
    nombre_en: 'Engine Failure on Takeoff / Climb',
    columna: 2,
    categoria: 'Emergencias',
    categoria_en: 'Emergencias',
    descripcion: 'Aborto de despegue en pista o falla de motor por debajo/arriba de 1,000 pies AGL.',
    descripcion_en: 'Rejected takeoff on runway or engine failure after liftoff below/above 1,000 ft AGL.'
  },
  {
    id: 'emergencias_crucero',
    nombre: 'Emergencias en Crucero',
    nombre_en: 'In-Flight Emergency & Forced Landing',
    columna: 2,
    categoria: 'Emergencias',
    categoria_en: 'Emergencias',
    descripcion: 'Falla de motor en ruta: velocidad de mejor planeo, selección de campo y reencendido.',
    descripcion_en: 'En-route engine failure: establish best glide (Vg), emergency field selection and restart checklist.'
  },
  {
    id: 'planeo',
    nombre: 'Planeo',
    nombre_en: 'Best Glide Configuration (Vg)',
    columna: 2,
    categoria: 'Emergencias',
    categoria_en: 'Emergencias',
    descripcion: 'Establecimiento inmediato de Vg (Best Glide) y configuración óptima de planeo.',
    descripcion_en: 'Immediate pitch for Vg, propeller and cowl flap configuration for maximum glide ratio.'
  },
  {
    id: 'descenso_emergencia',
    nombre: 'Descenso de Emergencia',
    nombre_en: 'Emergency Descent',
    columna: 2,
    categoria: 'Emergencias',
    categoria_en: 'Emergencias',
    descripcion: 'Descenso rápido con tren abajo/spoilers para evacuación por humo/fuego en cabina.',
    descripcion_en: 'High descent rate maneuver with landing gear/spoilers for cockpit fire/smoke cabin emergency.'
  },
  {
    id: 'campo_suave_despegue',
    nombre: 'Campo Suave Despegue',
    nombre_en: 'Soft-Field Takeoff and Climb',
    columna: 2,
    categoria: 'Operaciones Especiales',
    categoria_en: 'Special Operations',
    descripcion: 'Despegue en pistas no pavimentadas manteniendo la rueda de nariz en el aire (Ground Effect).',
    descripcion_en: 'Takeoff from unpaved turf with nosewheel held off and acceleration in ground effect.'
  },
  {
    id: 'campo_suave_aterrizaje',
    nombre: 'Campo Suave Aterrizaje',
    nombre_en: 'Soft-Field Approach and Landing',
    columna: 2,
    categoria: 'Operaciones Especiales',
    categoria_en: 'Special Operations',
    descripcion: 'Toque a mínima velocidad y mantenimiento de rueda de morro levantada sin frenos bruscos.',
    descripcion_en: 'Soft touchdown at minimum sink rate, maintaining back elevator pressure without heavy braking.'
  },

  // COLUMNA 3 (10 Maniobras)
  {
    id: 'campo_corto_despegue',
    nombre: 'Campo Corto Despegue',
    nombre_en: 'Short-Field Takeoff & 50-ft Obstacle Climb',
    columna: 3,
    categoria: 'Operaciones Especiales',
    categoria_en: 'Special Operations',
    descripcion: 'Despegue con frenos aplicados a máxima potencia y ascenso a Vx sobre obstáculos de 50 pies.',
    descripcion_en: 'Full power static takeoff with climb at Vx over a simulated 50-foot obstacle.'
  },
  {
    id: 'campo_corto_aterrizaje',
    nombre: 'Campo Corto Aterrizaje',
    nombre_en: 'Short-Field Approach and Landing',
    columna: 3,
    categoria: 'Operaciones Especiales',
    categoria_en: 'Special Operations',
    descripcion: 'Aproximación empinada a Vref y frenado enérgico al tocar el punto designado.',
    descripcion_en: 'Steep stabilized approach at Vref with firm touchdown on designated touchdown zone and maximum braking.'
  },
  {
    id: 'aprox_precision_normal',
    nombre: 'Aproximación de precisión Normal',
    nombre_en: 'Precision Instrument Approach (ILS/GLS)',
    columna: 3,
    categoria: 'Vuelo por Instrumentos IFR',
    categoria_en: 'Instrument Flight Rules (IFR)',
    descripcion: 'Aproximación ILS/GLS siguiendo localizador y senda de planeo (GS) estabilizada.',
    descripcion_en: 'Stabilized ILS/GLS precision approach tracking localizer and glideslope to DA.'
  },
  {
    id: 'aprox_precision_falla_motor',
    nombre: 'Aproximación de precisión Con Falla de motor',
    nombre_en: 'One Engine Inoperative Precision Approach (ILS)',
    columna: 3,
    categoria: 'Multi-Motor Asimétrico',
    categoria_en: 'Multi-Engine Asymmetric',
    descripcion: 'Aproximación ILS monomotor con hélice embanderada, manteniendo eje y senda.',
    descripcion_en: 'Single-engine precision ILS approach with feathered propeller and asymmetric trim control.'
  },
  {
    id: 'aprox_no_precision_normal',
    nombre: 'Aproximación de NO precisión Normal',
    nombre_en: 'Non-Precision Approach (VOR/RNAV/LOC)',
    columna: 3,
    categoria: 'Vuelo por Instrumentos IFR',
    categoria_en: 'Instrument Flight Rules (IFR)',
    descripcion: 'Aproximación VOR/RNAV/LOC con descensos por escalones hacia MDA.',
    descripcion_en: 'Stepdown descent VOR/RNAV/LOC non-precision approach tracking to MDA and missed approach point.'
  },
  {
    id: 'aprox_no_precision_falla_motor',
    nombre: 'Aproximación de NO precisión Con Falla de motor',
    nombre_en: 'One Engine Inoperative Non-Precision Approach',
    columna: 3,
    categoria: 'Multi-Motor Asimétrico',
    categoria_en: 'Multi-Engine Asymmetric',
    descripcion: 'Aproximación VOR/RNAV monomotor con control asimétrico y aproximación frustrada monomotor.',
    descripcion_en: 'Single-engine non-precision approach with asymmetric rudder control and single-engine go-around.'
  },
  {
    id: 'holding',
    nombre: 'Holding',
    nombre_en: 'Holding Pattern Procedures',
    columna: 3,
    categoria: 'Procedimientos IFR',
    categoria_en: 'IFR Procedures',
    descripcion: 'Entrada directa, paralela o gota (Teardrop) al patrón de espera estándar con corrección de viento.',
    descripcion_en: 'Direct, parallel, and teardrop holding entries with wind drift and timing compensation.'
  },
  {
    id: 'intercepcion_radiales',
    nombre: 'Intercepción de radiales',
    nombre_en: 'Radial & Bearing Interception (VOR/GPS)',
    columna: 3,
    categoria: 'Radio-Navegación',
    categoria_en: 'Radio Navigation',
    descripcion: 'Rumbo de interceptación a 45°/90° hacia/desde radiales VOR o cursos GPS.',
    descripcion_en: 'Standard 45°/90° intercept angles to track inbound/outbound VOR radials or GPS tracks.'
  },
  {
    id: 'vuelo_travesia',
    nombre: 'Vuelo de Travesía',
    nombre_en: 'Cross-Country Flight (Dead Reckoning)',
    columna: 3,
    categoria: 'Navegación en Ruta',
    categoria_en: 'En-Route Navigation',
    descripcion: 'Navegación estimada (Dead Reckoning), puntos de chequeo visuales y control de combustible.',
    descripcion_en: 'Dead reckoning navigation, visual visual checkpoints, groundspeed checks, and fuel log.'
  },
  {
    id: 'falla_motor_despegue_v1',
    nombre: 'Falla de Motor en Despegue / Vmc Demo (Multi-Motor)',
    nombre_en: 'Engine Failure on Takeoff / Vmc Demonstration',
    columna: 3,
    categoria: 'Multi-Motor Crítico',
    categoria_en: 'Critical Multi-Engine',
    descripcion: 'Reconocimiento de falla súbita del motor crítico, identificación, verificación y embanderado.',
    descripcion_en: 'Critical engine failure recognition, identify-verify-feather drill, and minimum controllable airspeed demo.'
  }
];

export const GRADE_CONFIG: Record<string, { label: string; name_es: string; name_en: string; badgeClass: string; bgClass: string; textClass: string }> = {
  'S': {
    label: 'S',
    name_es: 'Satisfactorio',
    name_en: 'Satisfactory',
    badgeClass: 'bg-emerald-100 text-emerald-800 border-emerald-300 font-semibold',
    bgClass: 'bg-emerald-500 text-white shadow-sm',
    textClass: 'text-emerald-700'
  },
  'D': {
    label: 'D',
    name_es: 'Deficiente',
    name_en: 'Deficient',
    badgeClass: 'bg-amber-100 text-amber-800 border-amber-300 font-semibold',
    bgClass: 'bg-amber-500 text-white shadow-sm',
    textClass: 'text-amber-700'
  },
  'N': {
    label: 'N',
    name_es: 'No Cumple',
    name_en: 'Unsatisfactory',
    badgeClass: 'bg-rose-100 text-rose-800 border-rose-300 font-semibold',
    bgClass: 'bg-rose-500 text-white shadow-sm',
    textClass: 'text-rose-700'
  },
  'N/A': {
    label: 'N/A',
    name_es: 'No Aplica',
    name_en: 'Not Applicable',
    badgeClass: 'bg-slate-100 text-slate-600 border-slate-200',
    bgClass: 'bg-slate-300 text-slate-800',
    textClass: 'text-slate-500'
  }
};
