import React, { useState, useEffect, useMemo } from 'react';
import { User, Transaction, AircraftMaintenanceRecord } from '../types';
import { api } from '../services/api';
import { useLanguage } from '../i18n/LanguageContext';
import {
  Plane,
  UploadCloud,
  FileSpreadsheet,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Sparkles,
  RefreshCw,
  PlusCircle,
  History,
  FileText,
  DollarSign,
  Clock,
  Search,
  Filter,
  Download,
  Trash2,
  ArrowRight,
  ShieldCheck,
  Fuel,
  Gauge,
  Printer,
  X,
  UserCheck,
  Check,
  Calendar,
  Hash,
  ChevronDown,
  Loader2
} from 'lucide-react';

interface AircraftLogbookModuleProps {
  currentUser: User;
  allUsers?: User[];
  onRefreshAll?: () => void;
}

// Catálogo y Tarifario Oficial de Aeronaves
export const OFFICIAL_FLEET = [
  {
    matricula: 'HP-1450',
    modelo: 'Cessna 172 Skyhawk',
    tarifa: 220,
    categoria: 'Monomotor Terrestre',
    motor: 'Lycoming IO-360-L2A (180 HP)',
    avionica: 'Análoga + GPS Garmin GNS 430',
    combustible: 'AVGAS 100LL',
    descripcion: 'Aeronave primaria para fases de VFR, maniobras elementales y navegación crucero.'
  },
  {
    matricula: 'HP-1588',
    modelo: 'Cessna 172SP Nav III',
    tarifa: 220,
    categoria: 'Monomotor Terrestre Glass Cockpit',
    motor: 'Lycoming IO-360-L2A (180 HP)',
    avionica: 'Garmin G1000 Integrado (PFD/MFD)',
    combustible: 'AVGAS 100LL',
    descripcion: 'Equipada con cabina de cristal de última generación para entrenamiento avanzado y navegación IFR.'
  },
  {
    matricula: 'HP-1822',
    modelo: 'Piper PA-44-180 Seminole',
    tarifa: 340,
    categoria: 'Multimotor Terrestre',
    motor: '2x Lycoming O-360-E1A6D (180 HP c/u)',
    avionica: 'Dual VOR/ILS + Garmin GTN 650',
    combustible: 'AVGAS 100LL',
    descripcion: 'Aeronave bimotor líder para habilitación de clase Multimotor (MEI) y maniobras de motor inoperativo.'
  },
  {
    matricula: 'HP-1799',
    modelo: 'Piper PA-28-181 Archer III',
    tarifa: 220,
    categoria: 'Monomotor Terrestre',
    motor: 'Lycoming O-360-A4M (180 HP)',
    avionica: 'Garmin G5 Electronic Flight Instruments',
    combustible: 'AVGAS 100LL',
    descripcion: 'Ala baja excelente para entrenamiento de vuelo instrumental y vuelos nocturnos de travesía.'
  },
  {
    matricula: 'HP-1934',
    modelo: 'Piper PA-28-161 Cherokee',
    tarifa: 220,
    categoria: 'Monomotor Terrestre',
    motor: 'Lycoming O-320-D2A (160 HP)',
    avionica: 'Panel Estándar IFR',
    combustible: 'AVGAS 100LL',
    descripcion: 'Aeronave confiable y económica para acumulación de horas de vuelo solo y navegación básica.'
  },
  {
    matricula: 'SIM-ALX',
    modelo: 'Simulador Alsim ALX FNPT II',
    tarifa: 120,
    categoria: 'Entrenador Sintético de Vuelo',
    motor: 'Simulación Turbohélice / Multi-Motor / Jet',
    avionica: 'Cabina Modular Universal + Visual 208°',
    combustible: 'N/A (100% Eléctrico)',
    descripcion: 'Simulador certificado por la AAC para créditos de horas IFR, MCC y procedimientos de emergencia.'
  }
];

// Fila del Cuadro de Bitácora Oficial
export interface LogbookSheetRow {
  id: string;
  numeroBitacora: string; // Número de recibo / folio
  fecha: string;
  instructorId: string;
  instructorNombre: string;
  estudianteQuery: string;
  matchedStudent: User | null;
  origen: string;
  destino: string;
  horaSalida: string;
  horaLlegada: string;
  tacometroInicial: number;
  tacometroFinal: number;
  hobbsInicial: number;
  hobbsFinal: number;
  horasTotal: number;
  mision: string;
  condicion: string;
  aterrizajes: number;
  combustibleGal: number;
  aceiteQts: number;
  novedades: string;
  reportarNovedadTaller?: boolean;
  tallerSincronizado?: boolean;
  tarifa: number;
  totalDebito: number;
  saldoAnterior: number;
  saldoResultante: number;
  guardado?: boolean;
  saving?: boolean;
  error?: string;
}

// Estructura de entrada parseada para procesamiento por lote
interface ParsedBatchEntry {
  id: string;
  fecha: string;
  matricula: string;
  modelo_avion: string;
  estudiante_busqueda: string;
  matchedStudent?: User;
  horas_vuelo: number;
  tarifa_hora: number;
  cargo_estimado: number;
  saldo_anterior: number;
  saldo_resultante: number;
  mision: string;
  leccion_num?: number;
  folio: string;
  hobbs_inicial?: number;
  hobbs_final?: number;
  esValido: boolean;
  motivoInvalido?: string;
  advertenciaDuplicado?: boolean;
}

// Fórmula oficial de cobro al estudiante: Total Hobbs × 1.275
const STUDENT_HOBBS_FACTOR = 1.275;
const calcStudentBillableHours = (hobbsHours: number): number =>
  Number(((Number.isFinite(hobbsHours) ? hobbsHours : 0) * STUDENT_HOBBS_FACTOR).toFixed(4));
const formatFormulaHours = (hours: number): string =>
  Number.isFinite(hours) ? Number(hours.toFixed(4)).toString() : '0';

// Normalizador de texto para búsquedas insensibles a mayúsculas y acentos
const normalize = (str: string) =>
  str ? String(str).toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim() : "";

export const AircraftLogbookModule: React.FC<AircraftLogbookModuleProps> = ({
  currentUser,
  allUsers = [],
  onRefreshAll
}) => {
  const { t } = useLanguage();

  const isStudent = currentUser.rol === 'estudiante';
  const isAccounting = currentUser.rol === 'contabilidad';
  const isAdmin = currentUser.rol === 'admin';
  const isEscuela = currentUser.rol === 'escuela';
  const isInstructor = currentUser.rol === 'instructor';
  const isChiefInstructor = currentUser.rol === 'instructor_en_jefe';
  const isInstructorAny = isInstructor || isChiefInstructor;
  const isDirector = isEscuela || isAdmin;
  const canPostDebit = isAccounting || isAdmin || isEscuela || isInstructorAny;
  const canEditLogbook = isAccounting || isAdmin || isEscuela || isInstructorAny;
  const isReadOnlyLogbook = !canEditLogbook;

  // Sub-tabs dentro del módulo (para no-estudiantes)
  const [activeSubTab, setActiveSubTab] = useState<'cuadro' | 'historial' | 'lote' | 'flota'>('cuadro');

  // Transacciones, mantenimiento de aeronaves y carga
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [aircraftMaintenanceList, setAircraftMaintenanceList] = useState<AircraftMaintenanceRecord[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);

  // Modal de Comprobante / Recibo de Bitácora
  const [receiptModalTx, setReceiptModalTx] = useState<Transaction | null>(null);

  // Mensajes de Alerta
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Lista de estudiantes registrados
  const studentsList = useMemo(() => {
    return allUsers.filter(u => u.rol === 'estudiante');
  }, [allUsers]);

  // Lista de instructores (incluye instructor en jefe y admins con licencia)
  const instructorsList = useMemo(() => {
    return allUsers.filter(
      u => u.rol === 'instructor' || u.rol === 'instructor_en_jefe' || (u.rol === 'admin' && Boolean(u.licencia))
    );
  }, [allUsers]);

  // Para el rol de instructor, solo debe aparecer el instructor dueño de su usuario
  const availableInstructorsForLogbook = useMemo(() => {
    if (isInstructor) {
      return [currentUser];
    }
    return instructorsList;
  }, [isInstructor, currentUser, instructorsList]);

  const getLiveAircraftMaintenance = (matricula: string, list: AircraftMaintenanceRecord[] = aircraftMaintenanceList) => {
    if (!matricula) return undefined;
    return list.find(a => a.matricula.toUpperCase() === matricula.toUpperCase());
  };

  const getLiveTachForAircraft = (matricula: string, list: AircraftMaintenanceRecord[] = aircraftMaintenanceList): number | undefined => {
    return getLiveAircraftMaintenance(matricula, list)?.horas_totales_celula;
  };

  // Cargar transacciones, récords de taller y hoja borrador de bitácora
  const loadData = async () => {
    try {
      setRefreshing(true);
      const [allTx, savedRows, maintRecords] = await Promise.all([
        api.getTransactions(undefined, undefined, currentUser.rol).catch(() => []),
        api.getLogbookDraftSheet().catch(() => []),
        api.getAircraftMaintenanceRecords().catch(() => [])
      ]);
      setTransactions(allTx);
      setAircraftMaintenanceList(Array.isArray(maintRecords) ? maintRecords : []);

      const recordedFolios = new Set(
        (Array.isArray(allTx) ? allTx : [])
          .filter(t => t.tipo === 'cargo' && t.referencia_ach)
          .map(t => String(t.referencia_ach).trim().toLowerCase())
      );

      if (Array.isArray(savedRows) && savedRows.length > 0) {
        const seenDraftFolios = new Set<string>();
        const normalizedSavedRows = savedRows.map((r: any) => {
          const liveTach = getLiveTachForAircraft(selectedAircraft, maintRecords);
          const fallbackTachIni = r.tacometroInicial !== undefined ? Number(r.tacometroInicial) : (liveTach ?? 0);
          const fallbackTachFin =
            r.tacometroFinal !== undefined
              ? Number(r.tacometroFinal)
              : Number((fallbackTachIni + (Number(r.horasTotal) || 0)).toFixed(1));
          const rowHrs = Number(r.horasTotal) || 0;
          const officialFleetRate = OFFICIAL_FLEET.find(f => f.matricula === selectedAircraft)?.tarifa ?? 220;
          const rowRate = !r.guardado ? officialFleetRate : (Number(r.tarifa) || officialFleetRate);
          const recalcDebito = !r.guardado
            ? Number((calcStudentBillableHours(rowHrs) * rowRate).toFixed(2))
            : Number(r.totalDebito || 0);
          const currentFolio = String(r.numeroBitacora || '').trim();
          const currentFolioLower = currentFolio.toLowerCase();
          const hasCollision =
            !r.guardado &&
            (!currentFolio || recordedFolios.has(currentFolioLower) || seenDraftFolios.has(currentFolioLower));
          const nextFolio = hasCollision
            ? generateInitialBitacoraNo(selectedAircraft, allTx, Array.from(seenDraftFolios), [])
            : currentFolio;
          if (nextFolio) {
            seenDraftFolios.add(nextFolio.toLowerCase());
          }
          return {
            ...r,
            numeroBitacora: nextFolio,
            instructorId: isInstructor && !r.guardado ? currentUser.id : r.instructorId,
            instructorNombre: isInstructor && !r.guardado ? currentUser.nombre : r.instructorNombre,
            tacometroInicial: fallbackTachIni,
            tacometroFinal: fallbackTachFin,
            tarifa: rowRate,
            totalDebito: recalcDebito,
            saldoResultante: !r.guardado
              ? Number(((Number(r.saldoAnterior) || 0) - recalcDebito).toFixed(2))
              : Number(r.saldoResultante || 0)
          };
        });
        setSheetRows(normalizedSavedRows);
      } else {
        const liveTach = Array.isArray(maintRecords) ? getLiveTachForAircraft(selectedAircraft, maintRecords) : undefined;
        setSheetRows(prev => {
          const seenFolios = new Set<string>();
          return prev.map((r, i) => {
            const currentFolio = String(r.numeroBitacora || '').trim();
            const currentLower = currentFolio.toLowerCase();
            const needsNewFolio =
              !r.guardado && (!currentFolio || recordedFolios.has(currentLower) || seenFolios.has(currentLower));
            const nextFolio = needsNewFolio
              ? generateInitialBitacoraNo(selectedAircraft, allTx, Array.from(seenFolios), [])
              : currentFolio;
            if (nextFolio) seenFolios.add(nextFolio.toLowerCase());
            return {
              ...r,
              numeroBitacora: nextFolio,
              ...(i === 0 && !r.guardado && !r.tallerSincronizado && liveTach !== undefined
                ? {
                    tacometroInicial: liveTach,
                    tacometroFinal: Number((liveTach + (r.horasTotal || 1.5)).toFixed(1))
                  }
                : {})
            };
          });
        });
      }
    } catch (err) {
      console.error('Error al cargar datos en módulo de bitácoras:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Calcular balance de un alumno
  const getStudentBalance = (studentId: string): number => {
    const studentTxs = transactions.filter(t => t.estudiante_id === studentId);
    return studentTxs.reduce((acc, t) => {
      if (t.estado_aprobacion && t.estado_aprobacion !== 'aprobado') return acc;
      if (t.tipo === 'abono') {
        return acc + t.monto;
      }
      if (t.tipo === 'cargo') {
        return acc - t.monto;
      }
      return acc;
    }, 0);
  };

  // =========================================================================
  // ESTADOS PARA EL "CUADRO DE BITÁCORA DE AERONAVE" (VISTA ADMINISTRATIVA)
  // =========================================================================
  const [selectedAircraft, setSelectedAircraft] = useState<string>('HP-1450');
  const [sheetDate, setSheetDate] = useState<string>(new Date().toISOString().split('T')[0]);

  // Contador o generador de correlativo único de folio de bitácora (evita colisiones con registros previos)
  const generateInitialBitacoraNo = (
    mat: string,
    txList: Transaction[] = transactions,
    extraUsedFolios: string[] = [],
    rowsList: LogbookSheetRow[] = []
  ): string => {
    const todayStr = new Date().toISOString().split('T')[0].replace(/-/g, '').slice(2);
    const cleanMat = (mat || 'FLOTA').replace(/[^A-Za-z0-9]/g, '').toUpperCase();
    const usedSet = new Set<string>();
    txList.forEach(t => {
      if (t.referencia_ach) usedSet.add(String(t.referencia_ach).trim().toLowerCase());
    });
    rowsList.forEach(r => {
      if (r.numeroBitacora) usedSet.add(String(r.numeroBitacora).trim().toLowerCase());
    });
    extraUsedFolios.forEach(f => {
      if (f) usedSet.add(String(f).trim().toLowerCase());
    });

    let seq = 1;
    let candidate = `BIT-${cleanMat}-${todayStr}-${String(seq).padStart(3, '0')}`;
    while (usedSet.has(candidate.toLowerCase()) && seq < 9999) {
      seq += 1;
      candidate = `BIT-${cleanMat}-${todayStr}-${String(seq).padStart(3, '0')}`;
    }
    return candidate;
  };

  const currentAircraftData = useMemo(() => {
    return OFFICIAL_FLEET.find(f => f.matricula === selectedAircraft) || OFFICIAL_FLEET[0];
  }, [selectedAircraft]);

  // Crear fila inicial del cuadro de bitácora
  const createInitialRow = (
    index: number,
    mat: string,
    rate: number,
    existingRows: LogbookSheetRow[] = []
  ): LogbookSheetRow => {
    const initialStudent = studentsList.length > 0 ? studentsList[0] : null;
    const initialBalance = initialStudent ? getStudentBalance(initialStudent.id) : 0;
    const horas = 1.5;
    const total = Number((calcStudentBillableHours(horas) * rate).toFixed(2));
    const liveTach = getLiveTachForAircraft(mat);
    const tachIni = liveTach !== undefined ? liveTach : 0;
    const tachFin = tachIni > 0 ? Number((tachIni + horas).toFixed(1)) : 0;
    const defaultInst = isInstructorAny ? currentUser : instructorsList[0];

    return {
      id: `row-${Date.now()}-${index}`,
      numeroBitacora: generateInitialBitacoraNo(mat, transactions, [], existingRows),
      fecha: sheetDate,
      instructorId: defaultInst?.id || '',
      instructorNombre: defaultInst?.nombre || 'Vuelo Solo / Sin CFI',
      estudianteQuery: initialStudent?.nombre || '',
      matchedStudent: initialStudent,
      origen: 'MPMG',
      destino: 'MPMG',
      horaSalida: '08:30',
      horaLlegada: '10:00',
      tacometroInicial: tachIni,
      tacometroFinal: tachFin,
      hobbsInicial: 1420.5,
      hobbsFinal: 1422.0,
      horasTotal: horas,
      mision: 'Maniobras Básicas y Circuitos de Tránsito',
      condicion: 'Dual',
      aterrizajes: 3,
      combustibleGal: 15,
      aceiteQts: 0,
      novedades: 'Sin novedades de mantenimiento',
      reportarNovedadTaller: false,
      tallerSincronizado: false,
      tarifa: rate,
      totalDebito: total,
      saldoAnterior: initialBalance,
      saldoResultante: Number((initialBalance - total).toFixed(2)),
      guardado: false
    };
  };

  const [sheetRows, setSheetRows] = useState<LogbookSheetRow[]>(() => [
    createInitialRow(1, 'HP-1450', 220, [])
  ]);

  // Persistir automáticamente los cambios de la hoja de bitácora en backend (usuarios autorizados)
  useEffect(() => {
    if (!canEditLogbook) return;
    if (sheetRows && sheetRows.length > 0) {
      const timer = setTimeout(() => {
        api.saveLogbookDraftSheet(sheetRows).catch(err => {
          console.warn('Error guardando borrador de bitácora:', err);
        });
      }, 1200);
      return () => clearTimeout(timer);
    }
  }, [sheetRows, canEditLogbook]);

  // =========================================================================
  // ESTADOS Y MODELO PARA EL PANEL MODAL DE REGISTRO DE VUELO
  // =========================================================================
  interface BlankLogbookForm {
    numeroBitacora: string;
    matricula: string;
    modelo: string;
    tarifa: number | string;
    fecha: string;
    estudianteQuery: string;
    matchedStudent: User | null;
    instructorId: string;
    instructorNombre: string;
    tarifaInstructor: number | string;
    crearHonorarioInstructor: boolean;
    sinDebitoAlumno: boolean;
    origen: string;
    destino: string;
    horaSalida: string;
    horaLlegada: string;
    tacometroInicial: number | string;
    tacometroFinal: number | string;
    hobbsInicial: number | string;
    hobbsFinal: number | string;
    horasTotal: number | string;
    mision: string;
    condicion: string;
    aterrizajes: number | string;
    combustibleGal: number | string;
    aceiteQts: number | string;
    novedades: string;
    reportarNovedadTaller: boolean;
  }

  const emptyLogbookForm: BlankLogbookForm = {
    numeroBitacora: '',
    matricula: '',
    modelo: '',
    tarifa: '',
    fecha: '',
    estudianteQuery: '',
    matchedStudent: null,
    instructorId: '',
    instructorNombre: '',
    tarifaInstructor: '30.00',
    crearHonorarioInstructor: true,
    sinDebitoAlumno: false,
    origen: '',
    destino: '',
    horaSalida: '',
    horaLlegada: '',
    tacometroInicial: '',
    tacometroFinal: '',
    hobbsInicial: '',
    hobbsFinal: '',
    horasTotal: '',
    mision: '',
    condicion: '',
    aterrizajes: '',
    combustibleGal: '',
    aceiteQts: '',
    novedades: '',
    reportarNovedadTaller: false
  };

  const [isRegisterModalOpen, setIsRegisterModalOpen] = useState<boolean>(false);
  const [isPanelReadOnly, setIsPanelReadOnly] = useState<boolean>(false);
  const effectiveModalReadOnly = isReadOnlyLogbook || isPanelReadOnly;
  const [blankForm, setBlankForm] = useState<BlankLogbookForm>(emptyLogbookForm);
  const [blankFormSaving, setBlankFormSaving] = useState<boolean>(false);
  const [isSavingAll, setIsSavingAll] = useState<boolean>(false);
  const [blankFormError, setBlankFormError] = useState<string | null>(null);
  const [studentDropdownOpen, setStudentDropdownOpen] = useState<boolean>(false);

  // Abrir panel de registro (pre-cargado inteligentemente para el instructor y aeronave seleccionada)
  const handleOpenBlankRegisterPanel = () => {
    if (!canEditLogbook) return;
    const todayStr = new Date().toISOString().split('T')[0];
    const ac = OFFICIAL_FLEET.find(f => f.matricula === selectedAircraft) || OFFICIAL_FLEET[0];
    const liveTach = selectedAircraft !== 'SIM-ALX' ? getLiveTachForAircraft(selectedAircraft) : undefined;
    setIsPanelReadOnly(false);
    setBlankForm({
      ...emptyLogbookForm,
      numeroBitacora: isInstructorAny ? generateInitialBitacoraNo(ac.matricula, transactions, [], sheetRows) : '',
      fecha: todayStr,
      matricula: ac.matricula,
      modelo: ac.modelo,
      tarifa: ac.tarifa,
      tacometroInicial: liveTach !== undefined ? liveTach : '',
      instructorId: isInstructorAny ? currentUser.id : '',
      instructorNombre: isInstructorAny ? currentUser.nombre : '',
      tarifaInstructor: isInstructorAny && currentUser.tarifa_hora_dual ? Number(currentUser.tarifa_hora_dual).toFixed(2) : '30.00',
      crearHonorarioInstructor: true,
      origen: 'MPMG',
      destino: 'MPMG',
      condicion: 'Dual'
    });
    setBlankFormError(null);
    setStudentDropdownOpen(false);
    setIsRegisterModalOpen(true);
  };

  // Abrir fila existente en el panel modal
  const handleOpenRowInPanel = (row: LogbookSheetRow) => {
    const liveTach = selectedAircraft !== 'SIM-ALX' ? getLiveTachForAircraft(selectedAircraft) : undefined;
    const tIni = row.tacometroInicial > 0 ? row.tacometroInicial : (liveTach ?? '');
    const tFin = row.tacometroFinal > 0 ? row.tacometroFinal : '';
    const enforcedInstructorId = isInstructor ? currentUser.id : row.instructorId;
    const enforcedInstructorName = isInstructor ? currentUser.nombre : row.instructorNombre;
    const officialTarifa = OFFICIAL_FLEET.find(f => f.matricula === selectedAircraft)?.tarifa ?? 220;
    setIsPanelReadOnly(Boolean(row.guardado));
    setBlankForm({
      numeroBitacora: row.numeroBitacora,
      matricula: selectedAircraft,
      modelo: currentAircraftData.modelo,
      tarifa: isDirector ? row.tarifa : officialTarifa,
      fecha: row.fecha,
      estudianteQuery: row.estudianteQuery,
      matchedStudent: row.matchedStudent,
      instructorId: enforcedInstructorId,
      instructorNombre: enforcedInstructorName,
      tarifaInstructor: isInstructor && currentUser.tarifa_hora_dual ? Number(currentUser.tarifa_hora_dual).toFixed(2) : '30.00',
      crearHonorarioInstructor: Boolean(enforcedInstructorId),
      sinDebitoAlumno: false,
      origen: row.origen,
      destino: row.destino,
      horaSalida: row.horaSalida,
      horaLlegada: row.horaLlegada,
      tacometroInicial: tIni,
      tacometroFinal: tFin,
      hobbsInicial: row.hobbsInicial > 0 ? row.hobbsInicial : '',
      hobbsFinal: row.hobbsFinal > 0 ? row.hobbsFinal : '',
      horasTotal: row.horasTotal > 0 ? row.horasTotal : '',
      mision: row.mision,
      condicion: row.condicion,
      aterrizajes: row.aterrizajes > 0 ? row.aterrizajes : '',
      combustibleGal: row.combustibleGal > 0 ? row.combustibleGal : '',
      aceiteQts: row.aceiteQts > 0 ? row.aceiteQts : '',
      novedades: row.novedades,
      reportarNovedadTaller: Boolean(row.reportarNovedadTaller)
    });
    setBlankFormError(null);
    setStudentDropdownOpen(false);
    setIsRegisterModalOpen(true);
  };

  // Actualizar un campo del formulario
  const updateBlankFormField = (field: keyof BlankLogbookForm, value: any) => {
    if (field === 'tarifa' && !isDirector) return;
    if (field === 'tarifaInstructor') return;

    setBlankForm(prev => {
      const updated = { ...prev, [field]: value };

      // Si seleccionó aeronave de la lista oficial
      if (field === 'matricula') {
        const fleetItem = OFFICIAL_FLEET.find(f => f.matricula === value);
        if (fleetItem) {
          updated.modelo = fleetItem.modelo;
          updated.tarifa = fleetItem.tarifa;
          const liveTach = value !== 'SIM-ALX' ? getLiveTachForAircraft(value) : undefined;
          updated.tacometroInicial = liveTach !== undefined ? liveTach : '';
          updated.tacometroFinal = '';
          const currentFolio = String(prev.numeroBitacora || '').trim();
          if (!currentFolio || /^BIT-[A-Z0-9]+-\d{6}-\d+$/i.test(currentFolio)) {
            updated.numeroBitacora = generateInitialBitacoraNo(value, transactions, [], sheetRows);
          }
        }
      }

      // Si seleccionó instructor (si es rol instructor, queda fijado a su propio usuario)
      if (field === 'instructorId') {
        if (isInstructor) {
          updated.instructorId = currentUser.id;
          updated.instructorNombre = currentUser.nombre;
          updated.tarifaInstructor = currentUser.tarifa_hora_dual ? Number(currentUser.tarifa_hora_dual).toFixed(2) : '30.00';
        } else {
          const inst = instructorsList.find(i => i.id === value);
          if (inst) {
            updated.instructorNombre = inst.nombre;
            updated.tarifaInstructor = inst.tarifa_hora_dual ? Number(inst.tarifa_hora_dual).toFixed(2) : '30.00';
          } else {
            updated.instructorNombre = '';
            updated.tarifaInstructor = '30.00';
          }
        }
      }

      // Si cambió hobbs inicial o final -> calcular horas Hobbs automáticamente
      if (field === 'hobbsInicial' || field === 'hobbsFinal') {
        const hIni = field === 'hobbsInicial' ? parseFloat(value) || 0 : parseFloat(String(prev.hobbsInicial)) || 0;
        const hFin = field === 'hobbsFinal' ? parseFloat(value) || 0 : parseFloat(String(prev.hobbsFinal)) || 0;
        if (hFin >= hIni && hIni > 0) {
          updated.horasTotal = Number((hFin - hIni).toFixed(2));
        }
      }

      // Si cambió tacómetro inicial o final -> calcular horas si no hay hobbs activo
      if (field === 'tacometroInicial' || field === 'tacometroFinal') {
        const tIni = field === 'tacometroInicial' ? parseFloat(value) || 0 : parseFloat(String(prev.tacometroInicial)) || 0;
        const tFin = field === 'tacometroFinal' ? parseFloat(value) || 0 : parseFloat(String(prev.tacometroFinal)) || 0;
        const hIni = parseFloat(String(prev.hobbsInicial)) || 0;
        const hFin = parseFloat(String(prev.hobbsFinal)) || 0;
        const hasValidHobbs = hFin > hIni && hIni > 0;
        if (!hasValidHobbs && tFin > tIni && tIni >= 0) {
          updated.horasTotal = Number((tFin - tIni).toFixed(2));
        }
      }

      return updated;
    });
  };

  // Búsqueda y filtrado dinámico de estudiantes para el panel
  const filteredStudentsForPanel = useMemo(() => {
    if (!blankForm.estudianteQuery.trim()) return studentsList.slice(0, 12);
    const q = normalize(blankForm.estudianteQuery);
    return studentsList.filter(s =>
      normalize(s.nombre).includes(q) ||
      normalize(s.documento_identidad || '').includes(q) ||
      normalize(s.id).includes(q) ||
      normalize(s.correo || '').includes(q)
    );
  }, [blankForm.estudianteQuery, studentsList]);

  // Seleccionar estudiante en el panel
  const handleSelectStudentInBlankForm = (student: User) => {
    setBlankForm(prev => ({
      ...prev,
      matchedStudent: student,
      estudianteQuery: student.nombre
    }));
    setStudentDropdownOpen(false);
    setBlankFormError(null);
  };

  // Cálculos contables en tiempo real para el panel (Fórmula única estudiante: Hobbs × 1.275)
  const panelHoras = parseFloat(String(blankForm.horasTotal)) || 0;
  const panelHorasEstudiante = calcStudentBillableHours(panelHoras);
  const panelTarifa = parseFloat(String(blankForm.tarifa)) || 0;
  const panelDebitoTotal = Number((panelHorasEstudiante * panelTarifa).toFixed(2));
  const panelStudentBalance = blankForm.matchedStudent ? getStudentBalance(blankForm.matchedStudent.id) : 0;
  const panelSaldoResultante = Number((panelStudentBalance - panelDebitoTotal).toFixed(2));
  const panelInstructorRate = parseFloat(String(blankForm.tarifaInstructor)) || 30;
  const panelHonorarioTotal =
    blankForm.instructorId && blankForm.crearHonorarioInstructor && blankForm.condicion !== 'Solo'
      ? Number((panelHoras * panelInstructorRate).toFixed(2))
      : 0;
  const panelTachInicial = parseFloat(String(blankForm.tacometroInicial));
  const panelTachFinal = parseFloat(String(blankForm.tacometroFinal));
  const panelIsSimulator = blankForm.matricula === 'SIM-ALX';

  // Guardar vuelo unificado desde el panel (Identifica estudiante, cobra saldo, crea honorario y actualiza tacómetro en Taller)
  const handleSaveAndDebitFromPanel = async () => {
    if (blankFormSaving || !canEditLogbook) return;
    setBlankFormError(null);

    if (!canPostDebit) {
      setBlankFormError('No tienes permisos para registrar bitácoras de vuelo.');
      return;
    }

    if (!blankForm.matricula) {
      setBlankFormError('Debe seleccionar la aeronave / matrícula del vuelo.');
      return;
    }

    if (!blankForm.fecha) {
      setBlankFormError('Debe indicar la fecha de operación del vuelo.');
      return;
    }

    const pilotNameFinal = (blankForm.matchedStudent?.nombre || blankForm.estudianteQuery || '').trim();
    if (!pilotNameFinal) {
      setBlankFormError('Debe ingresar y seleccionar el nombre del estudiante para gestionar el cobro y los honorarios.');
      return;
    }

    if (!blankForm.sinDebitoAlumno && !blankForm.matchedStudent) {
      setBlankFormError('Seleccione un estudiante del catálogo para identificar su cuenta y aplicar el cobro.');
      return;
    }

    if (blankForm.sinDebitoAlumno && !blankForm.instructorId) {
      setBlankFormError('Para registrar sin débito a estudiante, debe seleccionar el instructor al que se asignará el honorario.');
      return;
    }

    if (panelHoras <= 0) {
      setBlankFormError('Las horas de vuelo deben ser mayores a 0.');
      return;
    }

    if (!panelIsSimulator && (!Number.isFinite(panelTachFinal) || panelTachFinal <= 0)) {
      setBlankFormError('Debe ingresar la hora final de tacómetro de la aeronave para mantener actualizado el control de Taller.');
      return;
    }

    if (!panelIsSimulator && Number.isFinite(panelTachInicial) && panelTachFinal < panelTachInicial) {
      setBlankFormError('El tacómetro final no puede ser menor al tacómetro inicial.');
      return;
    }

    if (!blankForm.sinDebitoAlumno && panelTarifa <= 0) {
      setBlankFormError('La tarifa por hora debe ser mayor a $0 USD.');
      return;
    }

    if (blankForm.instructorId && blankForm.crearHonorarioInstructor && panelInstructorRate <= 0) {
      setBlankFormError('La tarifa del honorario del instructor debe ser mayor a $0 USD.');
      return;
    }

    setBlankFormSaving(true);
    try {
      const student = blankForm.matchedStudent;
      const ac = OFFICIAL_FLEET.find(f => f.matricula === blankForm.matricula);
      const modeloFinal = blankForm.modelo || ac?.modelo || 'Aeronave';
      const folioTrimmed =
        blankForm.numeroBitacora.trim() || generateInitialBitacoraNo(blankForm.matricula, transactions, [], sheetRows);

      const effectiveInstructorId = isInstructor ? currentUser.id : (blankForm.instructorId || undefined);
      const effectiveInstructorName = isInstructor ? currentUser.nombre : (blankForm.instructorNombre || undefined);

      const result = await api.recordFlightLog({
        folio_bitacora: folioTrimmed,
        fecha: blankForm.fecha,
        matricula_avion: blankForm.matricula,
        modelo_avion: modeloFinal,
        estudiante_id: student?.id,
        estudiante_nombre: pilotNameFinal,
        instructor_id: effectiveInstructorId,
        instructor_nombre: effectiveInstructorName,
        tacometro_inicial: Number.isFinite(panelTachInicial) ? panelTachInicial : undefined,
        tacometro_final: Number.isFinite(panelTachFinal) ? panelTachFinal : undefined,
        hobbs_inicial: Number.isFinite(parseFloat(String(blankForm.hobbsInicial))) ? parseFloat(String(blankForm.hobbsInicial)) : undefined,
        hobbs_final: Number.isFinite(parseFloat(String(blankForm.hobbsFinal))) ? parseFloat(String(blankForm.hobbsFinal)) : undefined,
        horas_vuelo: panelHoras,
        tarifa_aeronave_hora: isDirector ? (panelTarifa || ac?.tarifa || 220) : (ac?.tarifa || 220),
        tarifa_instructor_hora: panelInstructorRate,
        origen: blankForm.origen || 'MPMG',
        destino: blankForm.destino || 'MPMG',
        hora_salida: blankForm.horaSalida || undefined,
        hora_llegada: blankForm.horaLlegada || undefined,
        mision: blankForm.mision || 'Instrucción de Vuelo',
        condicion: blankForm.condicion || 'Dual',
        aterrizajes: parseInt(String(blankForm.aterrizajes)) || 0,
        combustible_gal: parseFloat(String(blankForm.combustibleGal)) || 0,
        aceite_qts: parseFloat(String(blankForm.aceiteQts)) || 0,
        novedades: blankForm.novedades || undefined,
        reportar_novedad_taller: blankForm.reportarNovedadTaller,
        aplicar_debito_estudiante: !blankForm.sinDebitoAlumno,
        crear_honorario_instructor: Boolean(blankForm.instructorId) && (blankForm.crearHonorarioInstructor || blankForm.sinDebitoAlumno),
        registrado_por_id: currentUser.id,
        registrado_por_nombre: currentUser.nombre,
        registrado_por_rol: currentUser.rol
      });

      const resultingBal = result.studentIdentified ? result.studentIdentified.saldo_resultante : panelSaldoResultante;
      const newRowId = `row-${Date.now()}`;
      const newSheetRow: LogbookSheetRow = {
        id: newRowId,
        numeroBitacora: result.folio_bitacora,
        fecha: blankForm.fecha,
        instructorId: blankForm.instructorId,
        instructorNombre: blankForm.instructorNombre || 'Vuelo Solo / Sin CFI',
        estudianteQuery: pilotNameFinal,
        matchedStudent: student,
        origen: blankForm.origen || 'MPMG',
        destino: blankForm.destino || 'MPMG',
        horaSalida: blankForm.horaSalida || '',
        horaLlegada: blankForm.horaLlegada || '',
        tacometroInicial: Number.isFinite(panelTachInicial) ? panelTachInicial : 0,
        tacometroFinal: Number.isFinite(panelTachFinal) ? panelTachFinal : 0,
        hobbsInicial: parseFloat(String(blankForm.hobbsInicial)) || 0,
        hobbsFinal: parseFloat(String(blankForm.hobbsFinal)) || 0,
        horasTotal: panelHoras,
        mision: blankForm.mision || 'Instrucción',
        condicion: blankForm.condicion || 'Dual',
        aterrizajes: parseInt(String(blankForm.aterrizajes)) || 0,
        combustibleGal: parseFloat(String(blankForm.combustibleGal)) || 0,
        aceiteQts: parseFloat(String(blankForm.aceiteQts)) || 0,
        novedades: blankForm.novedades || 'Sin novedades',
        reportarNovedadTaller: blankForm.reportarNovedadTaller,
        tallerSincronizado: Boolean(result.aircraftRecord),
        tarifa: isDirector ? (panelTarifa || ac?.tarifa || 220) : (ac?.tarifa || 220),
        totalDebito: blankForm.sinDebitoAlumno ? 0 : panelDebitoTotal,
        saldoAnterior: result.studentIdentified ? result.studentIdentified.saldo_anterior : (student ? panelStudentBalance : 0),
        saldoResultante: !blankForm.sinDebitoAlumno ? resultingBal : 0,
        guardado: true
      };

      const updatedSheetRows = [
        newSheetRow,
        ...sheetRows.filter(
          r => r.guardado || r.numeroBitacora.trim().toLowerCase() !== result.folio_bitacora.trim().toLowerCase()
        )
      ];
      setSheetRows(updatedSheetRows);
      setIsRegisterModalOpen(false);
      setIsPanelReadOnly(false);
      setBlankForm({ ...emptyLogbookForm });

      try {
        await api.saveLogbookDraftSheet(updatedSheetRows);
      } catch (draftErr) {
        console.warn('Error guardando hoja actualizada tras registro:', draftErr);
      }

      const parts: string[] = [`Bitácora #${result.folio_bitacora} registrada.`];
      if (result.transaction && result.studentIdentified) {
        parts.push(
          isInstructorAny
            ? `Estudiante ${result.studentIdentified.nombre}: -$${result.transaction.monto.toFixed(2)} USD.`
            : `Estudiante ${result.studentIdentified.nombre}: -$${result.transaction.monto.toFixed(2)} USD (Saldo: $${result.studentIdentified.saldo_resultante.toFixed(2)} USD).`
        );
      }
      if (result.feeStatement) {
        parts.push(
          `Honorario ${result.feeStatement.id} para ${result.feeStatement.instructor_nombre}: $${result.feeStatement.total_neto.toFixed(2)} USD.`
        );
      }
      if (result.aircraftRecord && !isInstructor) {
        parts.push(
          `Taller ${result.aircraftRecord.matricula}: Tacómetro ${result.aircraftRecord.horas_totales_celula.toFixed(1)} hrs (50h: ${result.aircraftRecord.horas_restantes_50h.toFixed(1)}h · 100h: ${result.aircraftRecord.horas_restantes_100h.toFixed(1)}h).`
        );
      }
      if (result.squawk) {
        parts.push(`Squawk ${result.squawk.id} enviado a Taller.`);
      }
      setSuccessMsg(parts.join(' '));

      try {
        await loadData();
      } catch (loadErr) {
        console.warn('Error al refrescar datos locales de bitácora:', loadErr);
      }

      try {
        if (onRefreshAll) onRefreshAll();
      } catch (refreshErr) {
        console.warn('Error en callback global onRefreshAll:', refreshErr);
      }
    } catch (err: any) {
      console.warn('[Bitácora Panel] Error al registrar vuelo:', err?.message || err);
      setBlankFormError(err.message || 'Error al registrar la bitácora.');
    } finally {
      setBlankFormSaving(false);
    }
  };

  // Guardar como borrador en el cuadro para debitar después
  const handleSaveAsDraftInSheet = () => {
    if (!canEditLogbook) return;
    if (!blankForm.numeroBitacora.trim() && !blankForm.estudianteQuery.trim()) {
      setBlankFormError('Ingrese al menos el número de bitácora o el estudiante para guardar en el cuadro.');
      return;
    }

    const newRowId = `row-${Date.now()}`;
    const newSheetRow: LogbookSheetRow = {
      id: newRowId,
      numeroBitacora: blankForm.numeroBitacora.trim() || `BIT-${blankForm.matricula || 'FLOTA'}-${Date.now().toString().slice(-4)}`,
      fecha: blankForm.fecha || sheetDate,
      instructorId: blankForm.instructorId,
      instructorNombre: blankForm.instructorNombre || 'N/A',
      estudianteQuery: blankForm.estudianteQuery,
      matchedStudent: blankForm.matchedStudent,
      origen: blankForm.origen || 'MPMG',
      destino: blankForm.destino || 'MPMG',
      horaSalida: blankForm.horaSalida || '',
      horaLlegada: blankForm.horaLlegada || '',
      tacometroInicial: Number.isFinite(panelTachInicial) ? panelTachInicial : 0,
      tacometroFinal: Number.isFinite(panelTachFinal) ? panelTachFinal : 0,
      hobbsInicial: parseFloat(String(blankForm.hobbsInicial)) || 0,
      hobbsFinal: parseFloat(String(blankForm.hobbsFinal)) || 0,
      horasTotal: panelHoras,
      mision: blankForm.mision || '',
      condicion: blankForm.condicion || 'Dual',
      aterrizajes: parseInt(String(blankForm.aterrizajes)) || 0,
      combustibleGal: parseFloat(String(blankForm.combustibleGal)) || 0,
      aceiteQts: parseFloat(String(blankForm.aceiteQts)) || 0,
      novedades: blankForm.novedades || '',
      reportarNovedadTaller: blankForm.reportarNovedadTaller,
      tallerSincronizado: false,
      tarifa: panelTarifa || currentAircraftData.tarifa,
      totalDebito: panelDebitoTotal,
      saldoAnterior: panelStudentBalance,
      saldoResultante: panelSaldoResultante,
      guardado: false
    };

    setSheetRows(prev => [newSheetRow, ...prev]);
    setIsRegisterModalOpen(false);
    setSuccessMsg('Fila agregada al Cuadro de Registro de Vuelo como borrador. Puede revisarla y enviarla cuando lo desee.');
  };

  // Manejar cambio de aeronave principal en el cuadro
  const handleAircraftChange = (newMat: string) => {
    setSelectedAircraft(newMat);
    if (!canEditLogbook) return;
    const ac = OFFICIAL_FLEET.find(f => f.matricula === newMat) || OFFICIAL_FLEET[0];
    const liveTach = newMat !== 'SIM-ALX' ? getLiveTachForAircraft(newMat) : undefined;
    setSheetRows(prev => {
      const assignedFolios: string[] = [];
      return prev.map(row => {
        const total = Number((calcStudentBillableHours(row.horasTotal) * ac.tarifa).toFixed(2));
        const saldoRes = Number((row.saldoAnterior - total).toFixed(2));
        const nextTachIni = !row.guardado && liveTach !== undefined ? liveTach : row.tacometroInicial;
        const nextTachFin =
          !row.guardado && liveTach !== undefined
            ? Number((liveTach + row.horasTotal).toFixed(1))
            : row.tacometroFinal;
        let nextFolio = row.numeroBitacora;
        if (!row.guardado) {
          nextFolio = generateInitialBitacoraNo(newMat, transactions, assignedFolios, prev.filter(r => r.guardado));
          assignedFolios.push(nextFolio);
        }
        return {
          ...row,
          numeroBitacora: nextFolio,
          tacometroInicial: nextTachIni,
          tacometroFinal: nextTachFin,
          tarifa: ac.tarifa,
          totalDebito: total,
          saldoResultante: saldoRes
        };
      });
    });
  };

  // Actualizar una celda del cuadro
  const updateRowField = (rowId: string, field: keyof LogbookSheetRow, value: any) => {
    if (!canEditLogbook) return;
    setSheetRows(prev => prev.map(row => {
      if (row.id !== rowId) return row;

      const updated = { ...row, [field]: value };

      // Si cambió el instructor asignado (rol instructor solo permite dueño de su usuario)
      if (field === 'instructorId') {
        if (isInstructor) {
          updated.instructorId = currentUser.id;
          updated.instructorNombre = currentUser.nombre;
        } else {
          const inst = instructorsList.find(i => i.id === String(value));
          updated.instructorNombre = inst ? inst.nombre : 'Vuelo Solo / Sin CFI';
        }
      }

      // Si cambió el estudiante
      if (field === 'estudianteQuery') {
        const queryNorm = normalize(String(value));
        const match = studentsList.find(s =>
          normalize(s.nombre).includes(queryNorm) ||
          normalize(s.documento_identidad || '').includes(queryNorm) ||
          normalize(s.id).includes(queryNorm)
        );
        updated.matchedStudent = match || null;
        if (match) {
          const bal = getStudentBalance(match.id);
          updated.saldoAnterior = bal;
          updated.saldoResultante = Number((bal - updated.totalDebito).toFixed(2));
        }
      }

      // Si cambió hobbs inicial o final
      if (field === 'hobbsInicial' || field === 'hobbsFinal') {
        const hIni = field === 'hobbsInicial' ? parseFloat(value) || 0 : row.hobbsInicial;
        const hFin = field === 'hobbsFinal' ? parseFloat(value) || 0 : row.hobbsFinal;
        if (hFin >= hIni && hIni > 0) {
          const diff = Number((hFin - hIni).toFixed(2));
          updated.horasTotal = diff;
          updated.totalDebito = Number((calcStudentBillableHours(diff) * updated.tarifa).toFixed(2));
          updated.saldoResultante = Number((updated.saldoAnterior - updated.totalDebito).toFixed(2));
        }
      }

      // Si cambió tacómetro inicial o final
      if (field === 'tacometroInicial' || field === 'tacometroFinal') {
        const tIni = field === 'tacometroInicial' ? parseFloat(value) || 0 : row.tacometroInicial;
        const tFin = field === 'tacometroFinal' ? parseFloat(value) || 0 : row.tacometroFinal;
        if (tFin > tIni && tIni >= 0) {
          const diff = Number((tFin - tIni).toFixed(2));
          updated.horasTotal = diff;
          updated.totalDebito = Number((calcStudentBillableHours(diff) * updated.tarifa).toFixed(2));
          updated.saldoResultante = Number((updated.saldoAnterior - updated.totalDebito).toFixed(2));
        }
      }

      // Si cambió horas directamente
      if (field === 'horasTotal') {
        const hrs = parseFloat(value) || 0;
        updated.totalDebito = Number((calcStudentBillableHours(hrs) * updated.tarifa).toFixed(2));
        updated.saldoResultante = Number((updated.saldoAnterior - updated.totalDebito).toFixed(2));
      }

      // Si cambió tarifa (solo rol Director puede alterarla)
      if (field === 'tarifa') {
        if (!isDirector) return row;
        const trf = parseFloat(value) || 0;
        updated.totalDebito = Number((calcStudentBillableHours(updated.horasTotal) * trf).toFixed(2));
        updated.saldoResultante = Number((updated.saldoAnterior - updated.totalDebito).toFixed(2));
      }

      return updated;
    }));
  };

  // Seleccionar estudiante directamente desde el autocompletado
  const selectStudentForRow = (rowId: string, student: User) => {
    if (!canEditLogbook) return;
    setSheetRows(prev => prev.map(row => {
      if (row.id !== rowId) return row;
      const bal = getStudentBalance(student.id);
      const deb = row.totalDebito;
      return {
        ...row,
        estudianteQuery: student.nombre,
        matchedStudent: student,
        saldoAnterior: bal,
        saldoResultante: Number((bal - deb).toFixed(2))
      };
    }));
  };

  // Agregar una nueva fila al cuadro
  const handleAddRow = () => {
    if (!canEditLogbook) return;
    const lastRow = sheetRows[sheetRows.length - 1];
    const nextHobbs = lastRow ? lastRow.hobbsFinal : 1422.0;
    const liveTach = selectedAircraft !== 'SIM-ALX' ? getLiveTachForAircraft(selectedAircraft) : undefined;
    const nextTach = lastRow && lastRow.tacometroFinal > 0 ? lastRow.tacometroFinal : (liveTach ?? 0);
    const newRowId = `row-${Date.now()}-${sheetRows.length + 1}`;
    const nextNumber = generateInitialBitacoraNo(selectedAircraft, transactions, [], sheetRows);

    const newRow: LogbookSheetRow = {
      ...createInitialRow(sheetRows.length + 1, selectedAircraft, currentAircraftData.tarifa, sheetRows),
      id: newRowId,
      numeroBitacora: nextNumber,
      tacometroInicial: nextTach,
      tacometroFinal: nextTach > 0 ? Number((nextTach + 1.5).toFixed(1)) : 0,
      hobbsInicial: nextHobbs,
      hobbsFinal: Number((nextHobbs + 1.5).toFixed(1)),
      horasTotal: 1.5,
      fecha: sheetDate
    };
    setSheetRows(prev => [...prev, newRow]);
  };

  // Eliminar una fila del cuadro
  const handleDeleteRow = (rowId: string) => {
    if (!canEditLogbook) return;
    if (sheetRows.length <= 1) return;
    setSheetRows(prev => prev.filter(r => r.id !== rowId));
  };

  // GUARDAR FILA DE BITÁCORA (IDENTIFICAR ESTUDIANTE, COBRAR, GENERAR HONORARIO Y ACTUALIZAR TACÓMETRO TALLER)
  const handleSaveRow = async (rowId: string, reloadAfter: boolean = true) => {
    if (!canEditLogbook || !canPostDebit) {
      setErrorMsg('No tienes permisos para registrar vuelos en bitácora.');
      return;
    }
    const targetRow = sheetRows.find(r => r.id === rowId);
    if (!targetRow) return;

    if (!targetRow.matchedStudent) {
      setErrorMsg('Debes buscar y seleccionar un estudiante válido para identificar su cuenta.');
      return;
    }

    if (!targetRow.numeroBitacora.trim()) {
      setErrorMsg('El campo "Número de Bitácora" es obligatorio para identificar el recibo.');
      return;
    }

    if (targetRow.horasTotal <= 0) {
      setErrorMsg('Las horas de vuelo deben ser mayores a 0.');
      return;
    }

    const isSim = selectedAircraft === 'SIM-ALX';
    if (!isSim && (!Number.isFinite(Number(targetRow.tacometroFinal)) || Number(targetRow.tacometroFinal) <= 0)) {
      setErrorMsg('Debe ingresar el Tacómetro Final de la aeronave para actualizar Taller.');
      return;
    }

    if (!isSim && Number(targetRow.tacometroFinal) < Number(targetRow.tacometroInicial || 0)) {
      setErrorMsg('El Tacómetro Final no puede ser menor al Tacómetro Inicial.');
      return;
    }

    // Marcar fila como guardando
    setSheetRows(prev => prev.map(r => r.id === rowId ? { ...r, saving: true, error: undefined } : r));
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const student = targetRow.matchedStudent;
      const effectiveRowInstId = isInstructor ? currentUser.id : targetRow.instructorId;
      const matchedInst = effectiveRowInstId
        ? instructorsList.find(i => i.id === effectiveRowInstId)
        : undefined;
      const resolvedInstructorName = isInstructor
        ? currentUser.nombre
        : (matchedInst?.nombre || (effectiveRowInstId ? targetRow.instructorNombre : 'Vuelo Solo / Sin CFI'));

      const result = await api.recordFlightLog({
        folio_bitacora: targetRow.numeroBitacora.trim(),
        fecha: targetRow.fecha || sheetDate,
        matricula_avion: selectedAircraft,
        modelo_avion: currentAircraftData.modelo,
        estudiante_id: student.id,
        estudiante_nombre: (targetRow.estudianteQuery || student.nombre).trim(),
        instructor_id: effectiveRowInstId || undefined,
        instructor_nombre: resolvedInstructorName,
        tacometro_inicial: Number(targetRow.tacometroInicial) || undefined,
        tacometro_final: Number(targetRow.tacometroFinal) || undefined,
        hobbs_inicial: Number(targetRow.hobbsInicial) || undefined,
        hobbs_final: Number(targetRow.hobbsFinal) || undefined,
        horas_vuelo: targetRow.horasTotal,
        tarifa_aeronave_hora: isDirector ? targetRow.tarifa : (OFFICIAL_FLEET.find(f => f.matricula === selectedAircraft)?.tarifa || 220),
        tarifa_instructor_hora: (isInstructor ? currentUser.tarifa_hora_dual : matchedInst?.tarifa_hora_dual) || 30,
        origen: targetRow.origen || 'MPMG',
        destino: targetRow.destino || 'MPMG',
        hora_salida: targetRow.horaSalida || undefined,
        hora_llegada: targetRow.horaLlegada || undefined,
        mision: targetRow.mision || 'Instrucción de Vuelo',
        condicion: targetRow.condicion || 'Dual',
        aterrizajes: Number(targetRow.aterrizajes) || 0,
        combustible_gal: Number(targetRow.combustibleGal) || 0,
        aceite_qts: Number(targetRow.aceiteQts) || 0,
        novedades: targetRow.novedades || undefined,
        reportar_novedad_taller: Boolean(targetRow.reportarNovedadTaller),
        aplicar_debito_estudiante: true,
        crear_honorario_instructor: Boolean(effectiveRowInstId) && (targetRow.condicion || '').toLowerCase() !== 'solo',
        registrado_por_id: currentUser.id,
        registrado_por_nombre: currentUser.nombre,
        registrado_por_rol: currentUser.rol
      });

      const prevBal = result.studentIdentified?.saldo_anterior ?? getStudentBalance(student.id);
      const resultingBal = result.studentIdentified?.saldo_resultante ?? Number((prevBal - targetRow.totalDebito).toFixed(2));

      // Actualizar estado de la fila y persistir antes de recargar
      const updatedRowsAfterSave = sheetRows.map(r => {
        if (r.id === rowId) {
          return {
            ...r,
            saving: false,
            guardado: true,
            tallerSincronizado: Boolean(result.aircraftRecord),
            saldoAnterior: prevBal,
            saldoResultante: resultingBal
          };
        }
        return r;
      });
      setSheetRows(updatedRowsAfterSave);

      try {
        await api.saveLogbookDraftSheet(updatedRowsAfterSave);
      } catch (draftErr) {
        console.warn('Error guardando hoja tras registro de fila:', draftErr);
      }

      // Recargar transacciones y récords de taller si se solicita
      if (reloadAfter) {
        try {
          await loadData();
        } catch (loadErr) {
          console.warn('Error al refrescar datos tras registro de fila:', loadErr);
        }
        try {
          if (onRefreshAll) onRefreshAll();
        } catch (refreshErr) {
          console.warn('Error en onRefreshAll tras registro de fila:', refreshErr);
        }
      }

      const parts: string[] = [`Bitácora #${result.folio_bitacora} registrada.`];
      if (result.transaction) {
        parts.push(
          isInstructorAny
            ? `Cobro a ${student.nombre}: -$${result.transaction.monto.toFixed(2)} USD.`
            : `Cobro a ${student.nombre}: -$${result.transaction.monto.toFixed(2)} USD (Saldo: $${resultingBal.toFixed(2)} USD).`
        );
      }
      if (result.feeStatement) {
        parts.push(`Honorario ${result.feeStatement.id} para ${result.feeStatement.instructor_nombre}: $${result.feeStatement.total_neto.toFixed(2)} USD.`);
      }
      if (result.aircraftRecord && !isInstructor) {
        parts.push(`Tacómetro ${result.aircraftRecord.matricula}: ${result.aircraftRecord.horas_totales_celula.toFixed(1)} hrs en Taller.`);
      }
      setSuccessMsg(parts.join(' '));
    } catch (err: any) {
      console.error('Error al guardar bitácora:', err);
      setErrorMsg(err.message || 'Error al procesar el registro de la bitácora.');
      setSheetRows(prev => prev.map(r => r.id === rowId ? { ...r, saving: false, error: err.message } : r));
    }
  };

  // GUARDAR Y DEBITAR TODAS LAS FILAS PENDIENTES DE FORMA SECUENCIAL Y SEGURA
  const handleSaveAllPendingRows = async () => {
    if (!canEditLogbook || !canPostDebit) {
      setErrorMsg('No tienes permisos contables o administrativos para debitar cuentas.');
      return;
    }
    const pendingRows = sheetRows.filter(r => !r.guardado && r.matchedStudent && r.horasTotal > 0 && r.numeroBitacora.trim());
    if (pendingRows.length === 0) {
      setErrorMsg('No hay filas pendientes válidas con estudiante, horas mayores a cero y número de bitácora.');
      return;
    }

    setIsSavingAll(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      for (const row of pendingRows) {
        await handleSaveRow(row.id, false);
      }

      try {
        await loadData();
      } catch (loadErr) {
        console.warn('Error al refrescar datos tras guardado masivo:', loadErr);
      }

      try {
        if (onRefreshAll) onRefreshAll();
      } catch (refreshErr) {
        console.warn('Error en onRefreshAll tras guardado masivo:', refreshErr);
      }

      setSuccessMsg(`¡${pendingRows.length} bitácora(s) guardadas, debitadas y honorarios aplicables registrados exitosamente!`);
    } catch (err: any) {
      setErrorMsg('Ocurrió un inconveniente al guardar las bitácoras: ' + (err.message || ''));
    } finally {
      setIsSavingAll(false);
    }
  };

  // =========================================================================
  // VISTA DEL ESTUDIANTE: HISTORIAL DE VUELOS Y DÉBITOS CON BUSCADOR DE BITÁCORA
  // =========================================================================
  const [studentSearchTerm, setStudentSearchTerm] = useState<string>('');
  const [studentAircraftFilter, setStudentAircraftFilter] = useState<string>('TODAS');

  // Filtrar vuelos y bitácoras pertenecientes al estudiante
  const studentFlightDebits = useMemo(() => {
    const studentId = currentUser.id;
    return transactions.filter(t => {
      // Debe pertenecer al estudiante
      if (t.estudiante_id !== studentId) return false;
      // Solo cargos de vuelo o con horas
      const isFlight = t.tipo === 'cargo' && (
        t.concepto === 'Horas Bloque Vuelo' ||
        t.concepto === 'Hora Instructor' ||
        t.concepto === 'Simulador de Vuelo' ||
        t.horas_vuelo !== undefined ||
        (t.notas && (t.notas.toLowerCase().includes('vuelo') || t.notas.toLowerCase().includes('bitácora') || t.notas.toLowerCase().includes('bitacora')))
      );
      return isFlight;
    }).sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime());
  }, [transactions, currentUser.id]);

  // Aplicar el Buscador de Bitácora del Estudiante
  const filteredStudentFlights = useMemo(() => {
    return studentFlightDebits.filter(tx => {
      // Filtro de aeronave
      if (studentAircraftFilter !== 'TODAS') {
        const mat = tx.matricula_avion || '';
        if (!mat.toUpperCase().includes(studentAircraftFilter.toUpperCase())) {
          return false;
        }
      }

      // Buscador de bitácora
      if (studentSearchTerm.trim()) {
        const q = normalize(studentSearchTerm);
        const ref = normalize(tx.referencia_ach || '');
        const mat = normalize(tx.matricula_avion || '');
        const date = normalize(tx.fecha || '');
        const mission = normalize(tx.tipo_mision || '');
        const notes = normalize(tx.notas || '');
        const inst = normalize(tx.instructor_nombre || '');

        const matches =
          ref.includes(q) ||
          mat.includes(q) ||
          date.includes(q) ||
          mission.includes(q) ||
          notes.includes(q) ||
          inst.includes(q);

        if (!matches) return false;
      }

      return true;
    });
  }, [studentFlightDebits, studentAircraftFilter, studentSearchTerm]);

  // Métricas consolidadas del estudiante
  const studentMetrics = useMemo(() => {
    let totalHrs = 0;
    let totalDebited = 0;

    studentFlightDebits.forEach(tx => {
      totalDebited += tx.monto;
      if (tx.horas_vuelo && tx.horas_vuelo > 0) {
        totalHrs += tx.horas_vuelo;
      } else {
        const match = tx.notas?.match(/(\d+(\.\d+)?)\s*(horas?|hrs?)/i);
        if (match && match[1]) {
          totalHrs += parseFloat(match[1]);
        }
      }
    });

    const studentBalance = getStudentBalance(currentUser.id);

    return {
      totalHrs: Number(totalHrs.toFixed(4)),
      totalDebited: Number(totalDebited.toFixed(2)),
      currentBalance: studentBalance,
      flightCount: studentFlightDebits.length
    };
  }, [studentFlightDebits, transactions, currentUser.id]);

  // =========================================================================
  // VISTA HISTORIAL GLOBAL DE BITÁCORAS (ADMIN / ESCUELA / CONTABILIDAD)
  // =========================================================================
  const [globalHistorySearch, setGlobalHistorySearch] = useState<string>('');
  const [globalAircraftFilter, setGlobalAircraftFilter] = useState<string>('ALL');
  const [globalStudentFilter, setGlobalStudentFilter] = useState<string>('ALL');

  const allFlightDebits = useMemo(() => {
    return transactions.filter(t => {
      const isFlight = t.tipo === 'cargo' && (
        t.concepto === 'Horas Bloque Vuelo' ||
        t.horas_vuelo !== undefined ||
        (t.notas && (t.notas.toLowerCase().includes('vuelo') || t.notas.toLowerCase().includes('bitácora') || t.notas.toLowerCase().includes('bitacora')))
      );
      return isFlight;
    }).sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime());
  }, [transactions]);

  const filteredGlobalFlights = useMemo(() => {
    return allFlightDebits.filter(tx => {
      if (globalAircraftFilter !== 'ALL') {
        const mat = tx.matricula_avion || '';
        if (!mat.toUpperCase().includes(globalAircraftFilter.toUpperCase())) return false;
      }
      if (globalStudentFilter !== 'ALL' && tx.estudiante_id !== globalStudentFilter) {
        return false;
      }
      if (globalHistorySearch.trim()) {
        const q = normalize(globalHistorySearch);
        const ref = normalize(tx.referencia_ach || '');
        const mat = normalize(tx.matricula_avion || '');
        const date = normalize(tx.fecha || '');
        const student = normalize(allUsers.find(u => u.id === tx.estudiante_id)?.nombre || '');
        const notes = normalize(tx.notas || '');

        if (!ref.includes(q) && !mat.includes(q) && !date.includes(q) && !student.includes(q) && !notes.includes(q)) {
          return false;
        }
      }
      return true;
    });
  }, [allFlightDebits, globalAircraftFilter, globalStudentFilter, globalHistorySearch, allUsers]);

  // Exportar historial a CSV
  const handleExportCSV = () => {
    if (filteredGlobalFlights.length === 0) return;
    const headers = ['No. Bitacora', 'Fecha', 'Estudiante', 'Matricula', 'Horas', 'Tarifa/hr', 'Monto Debitado', 'Notas'];
    const rows = filteredGlobalFlights.map(tx => {
      const studentName = allUsers.find(u => u.id === tx.estudiante_id)?.nombre || 'Estudiante';
      return [
        `"${tx.referencia_ach || ''}"`,
        `"${tx.fecha}"`,
        `"${studentName}"`,
        `"${tx.matricula_avion || ''}"`,
        tx.horas_vuelo || 0,
        tx.tarifa_hora || 0,
        tx.monto,
        `"${(tx.notas || '').replace(/"/g, '""')}"`
      ].join(',');
    });
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Bitacoras_Vuelo_SkyOps_${sheetDate}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      {/* ========================================================================= */}
      {/* HEADER PRINCIPAL */}
      {/* ========================================================================= */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-indigo-600 rounded-xl text-white shadow-xs">
              <Plane className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                {isStudent ? 'Historial de Vuelos y Débitos de Bitácoras' : 'Bitácoras de Aeronaves y Débito Autónomo'}
              </h1>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 self-end md:self-auto">
          <button
            onClick={loadData}
            disabled={refreshing}
            className="px-3 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            title="Recargar datos"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">Actualizar</span>
          </button>
        </div>
      </div>

      {/* MENSAJES DE ÉXITO O ERROR */}
      {successMsg && (
        <div className="p-4 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200 rounded-2xl text-xs flex items-center justify-between gap-3 shadow-xs">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span className="font-semibold">{successMsg}</span>
          </div>
          <button onClick={() => setSuccessMsg(null)} className="text-emerald-600 hover:text-emerald-800 cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {errorMsg && (
        <div className="p-4 bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-200 rounded-2xl text-xs flex items-center justify-between gap-3 shadow-xs">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
            <span className="font-semibold">{errorMsg}</span>
          </div>
          <button onClick={() => setErrorMsg(null)} className="text-rose-600 hover:text-rose-800 cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* ========================================================================= */}
      {/* VISTA 1: VISTA DEL ESTUDIANTE (Historial de Vuelos + Buscador de Bitácora) */}
      {/* ========================================================================= */}
      {isStudent ? (
        <div className="space-y-6">
          {/* TARJETAS RESUMEN DE SALDO Y HORAS DEL ESTUDIANTE */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
            {/* Saldo Disponible */}
            <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-500 uppercase">Saldo Disponible</span>
                <DollarSign className="w-4 h-4 text-emerald-600" />
              </div>
              <div className={`text-2xl font-black mt-1 ${studentMetrics.currentBalance < 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                ${studentMetrics.currentBalance.toLocaleString('en-US', { minimumFractionDigits: 2 })} USD
              </div>
              <span className="text-[11px] text-slate-400 mt-1 block">
                {studentMetrics.currentBalance < 0 ? '⚠️ Saldo pendiente en mora' : 'Fondos vigentes para vuelos'}
              </span>
            </div>

            {/* Total Horas Voladas */}
            <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-500 uppercase">Horas Voladas</span>
                <Clock className="w-4 h-4 text-sky-600" />
              </div>
              <div className="text-2xl font-black text-slate-900 dark:text-white mt-1">
                {formatFormulaHours(studentMetrics.totalHrs)} hrs
              </div>
              <span className="text-[11px] text-slate-400 mt-1 block">
                Acumulado total de bitácoras
              </span>
            </div>

            {/* Total Débitos */}
            <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-500 uppercase">Total Descontado</span>
                <ArrowRight className="w-4 h-4 text-rose-600" />
              </div>
              <div className="text-2xl font-black text-rose-600 mt-1">
                -${studentMetrics.totalDebited.toLocaleString('en-US', { minimumFractionDigits: 2 })} USD
              </div>
              <span className="text-[11px] text-slate-400 mt-1 block">
                Inversión en sesiones de vuelo
              </span>
            </div>

            {/* Total Vuelos */}
            <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-500 uppercase">Bitácoras Procesadas</span>
                <FileText className="w-4 h-4 text-indigo-600" />
              </div>
              <div className="text-2xl font-black text-indigo-600 mt-1">
                {studentMetrics.flightCount}
              </div>
              <span className="text-[11px] text-slate-400 mt-1 block">
                Salidas registradas
              </span>
            </div>
          </div>

          {/* CONTENEDOR DEL HISTORIAL CON BUSCADOR DE BITÁCORA */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
            {/* BARRA DEL BUSCADOR DE BITÁCORA */}
            <div className="p-4 sm:p-5 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-indigo-600" />
                <h3 className="font-bold text-sm sm:text-base text-slate-900 dark:text-white">
                  Historial de Vuelos y Débitos de Bitácora
                </h3>
              </div>

              {/* BUSCADOR DE BITÁCORA DESTACADO */}
              <div className="flex flex-col sm:flex-row items-center gap-2.5 w-full md:w-auto">
                <div className="relative w-full sm:w-80">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
                  <input
                    type="text"
                    placeholder="Buscador de Bitácora (ej. BIT-1450...)"
                    value={studentSearchTerm}
                    onChange={(e) => setStudentSearchTerm(e.target.value)}
                    className="w-full pl-9 pr-8 py-2 text-xs bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium text-slate-900 dark:text-slate-100 shadow-2xs"
                  />
                  {studentSearchTerm && (
                    <button
                      onClick={() => setStudentSearchTerm('')}
                      className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600 cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {/* Filtro por Aeronave */}
                <select
                  value={studentAircraftFilter}
                  onChange={(e) => setStudentAircraftFilter(e.target.value)}
                  className="w-full sm:w-auto px-3 py-2 text-xs bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium text-slate-900 dark:text-slate-100 shadow-2xs cursor-pointer"
                >
                  <option value="TODAS">Toda la Flota</option>
                  {OFFICIAL_FLEET.map(f => (
                    <option key={f.matricula} value={f.matricula}>
                      {f.matricula} ({f.modelo})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* LISTADO DE VUELOS */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-100/70 dark:bg-slate-800/60 text-slate-700 dark:text-slate-300 uppercase font-bold text-[10px] border-b border-slate-200 dark:border-slate-800 tracking-wider">
                  <tr>
                    <th className="px-4 py-3">No. de Bitácora</th>
                    <th className="px-4 py-3">Fecha del Vuelo</th>
                    <th className="px-4 py-3">Aeronave & Matrícula</th>
                    <th className="px-4 py-3">Misión / Detalle</th>
                    <th className="px-4 py-3 text-center">Horas Voladas</th>
                    <th className="px-4 py-3 text-right">Tarifa / hr</th>
                    <th className="px-4 py-3 text-right">Monto Debitado</th>
                    <th className="px-4 py-3 text-right">Saldo Resultante</th>
                    <th className="px-4 py-3 text-center">Recibo</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
                  {filteredStudentFlights.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="px-4 py-12 text-center text-slate-400">
                        <Plane className="w-10 h-10 mx-auto mb-2 text-slate-300 dark:text-slate-600" />
                        <p className="font-bold text-slate-600 dark:text-slate-300 text-sm">
                          Sin bitácoras registradas
                        </p>
                      </td>
                    </tr>
                  ) : (
                    filteredStudentFlights.map((tx) => {
                      const horas = tx.horas_vuelo || (tx.notas?.match(/(\d+(\.\d+)?)\s*(horas?|hrs?)/i)?.[1] ? parseFloat(tx.notas.match(/(\d+(\.\d+)?)\s*(horas?|hrs?)/i)![1]) : 1.0);
                      const tarifa = tx.tarifa_hora || (horas > 0 ? tx.monto / horas : 220.0);
                      const matricula = tx.matricula_avion || (tx.notas?.includes('HP-1822') ? 'HP-1822' : tx.notas?.includes('HP-1450') ? 'HP-1450' : tx.notas?.includes('HP-1588') ? 'HP-1588' : 'HP-1450');
                      const folio = tx.referencia_ach || `BIT-${matricula}-${tx.fecha.replace(/-/g, '')}`;
                      const saldoRes = tx.saldo_anterior !== undefined ? tx.saldo_anterior - tx.monto : undefined;

                      return (
                        <tr key={tx.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors">
                          {/* Número de Bitácora */}
                          <td className="px-4 py-3 whitespace-nowrap font-mono">
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300 font-bold text-xs">
                              <Hash className="w-3 h-3 text-indigo-500" />
                              <span>{folio}</span>
                            </span>
                          </td>

                          {/* Fecha */}
                          <td className="px-4 py-3 whitespace-nowrap text-slate-700 dark:text-slate-300">
                            <div className="flex items-center gap-1.5 font-medium">
                              <Calendar className="w-3.5 h-3.5 text-slate-400" />
                              <span>{tx.fecha}</span>
                            </div>
                          </td>

                          {/* Aeronave */}
                          <td className="px-4 py-3 whitespace-nowrap">
                            <div className="flex items-center gap-2">
                              <span className="px-2 py-0.5 bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200 rounded font-bold text-[11px] font-mono">
                                {matricula}
                              </span>
                              <span className="text-slate-600 dark:text-slate-300 text-xs">
                                {tx.modelo_avion || 'Aeronave Escuela'}
                              </span>
                            </div>
                          </td>

                          {/* Misión / Detalle */}
                          <td className="px-4 py-3 max-w-xs">
                            <div className="text-slate-800 dark:text-slate-200 text-xs font-semibold truncate">
                              {tx.tipo_mision || 'Instrucción Práctica de Vuelo'}
                            </div>
                            <div className="text-[11px] text-slate-400 truncate">
                              {tx.instructor_nombre ? `PIC: ${tx.instructor_nombre}` : tx.notas}
                            </div>
                          </td>

                          {/* Horas Voladas */}
                          <td className="px-4 py-3 whitespace-nowrap text-center">
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full font-bold text-xs bg-sky-50 dark:bg-sky-950/60 text-sky-700 dark:text-sky-300 border border-sky-200 dark:border-sky-800">
                              <Clock className="w-3 h-3 text-sky-500" />
                              <span>{formatFormulaHours(horas)} hrs</span>
                            </span>
                            {tx.horas_hobbs !== undefined && (
                              <span className="block text-[10px] font-mono text-slate-400 mt-0.5">
                                {tx.horas_hobbs}h × 1.275
                              </span>
                            )}
                          </td>

                          {/* Tarifa / hr */}
                          <td className="px-4 py-3 whitespace-nowrap text-right text-slate-600 dark:text-slate-400">
                            ${tarifa.toFixed(2)}/h
                          </td>

                          {/* Monto Debitado */}
                          <td className="px-4 py-3 whitespace-nowrap text-right font-black text-rose-600 dark:text-rose-400 text-xs">
                            -${tx.monto.toFixed(2)} USD
                          </td>

                          {/* Saldo Resultante */}
                          <td className="px-4 py-3 whitespace-nowrap text-right font-bold text-slate-700 dark:text-slate-300">
                            {saldoRes !== undefined ? `$${saldoRes.toFixed(2)} USD` : '—'}
                          </td>

                          {/* Botón Ver Recibo */}
                          <td className="px-4 py-3 whitespace-nowrap text-center">
                            <button
                              onClick={() => setReceiptModalTx(tx)}
                              className="px-2.5 py-1 bg-slate-100 hover:bg-indigo-50 dark:bg-slate-800 dark:hover:bg-indigo-950/60 text-slate-700 hover:text-indigo-600 dark:text-slate-300 dark:hover:text-indigo-400 rounded-lg text-[11px] font-bold transition-colors cursor-pointer inline-flex items-center gap-1 border border-slate-200 dark:border-slate-700"
                              title="Ver comprobante oficial de recibo"
                            >
                              <FileText className="w-3 h-3" />
                              <span>Ver Recibo</span>
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : (
        /* ========================================================================= */
        /* VISTA 2: VISTA ADMINISTRATIVA (CUADRO DE BITÁCORA + HISTORIAL + LOTE + FLOTA) */
        /* ========================================================================= */
        <div className="space-y-6">
          {/* NAVEGACIÓN POR SUB-PESTAÑAS */}
          <div className="flex border-b border-slate-200 dark:border-slate-800 gap-2 sm:gap-4 overflow-x-auto text-xs sm:text-sm font-semibold">
            <button
              type="button"
              onClick={() => setActiveSubTab('cuadro')}
              className={`pb-3 px-3 flex items-center gap-2 border-b-2 transition-colors cursor-pointer whitespace-nowrap ${
                activeSubTab === 'cuadro'
                  ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
                  : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
              }`}
            >
              <FileSpreadsheet className="w-4 h-4" />
              <span>Cuadro de Bitácora</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveSubTab('historial')}
              className={`pb-3 px-3 flex items-center gap-2 border-b-2 transition-colors cursor-pointer whitespace-nowrap ${
                activeSubTab === 'historial'
                  ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
                  : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
              }`}
            >
              <History className="w-4 h-4" />
              <span>Historial de Bitácoras</span>
            </button>

            {!isReadOnlyLogbook && !isInstructor && (
              <button
                type="button"
                onClick={() => setActiveSubTab('lote')}
                className={`pb-3 px-3 flex items-center gap-2 border-b-2 transition-colors cursor-pointer whitespace-nowrap ${
                  activeSubTab === 'lote'
                    ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
                    : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                }`}
              >
                <UploadCloud className="w-4 h-4" />
                <span>Carga por Lote / Archivo</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => setActiveSubTab('flota')}
              className={`pb-3 px-3 flex items-center gap-2 border-b-2 transition-colors cursor-pointer whitespace-nowrap ${
                activeSubTab === 'flota'
                  ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
                  : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
              }`}
            >
              <Plane className="w-4 h-4" />
              <span>Tarifario de Flota</span>
            </button>
          </div>

          {/* ========================================================================= */}
          {/* SUB-TAB: CUADRO DE BITÁCORA DE AERONAVE (REPLICADO CON EXACTITUD TOTAL) */}
          {/* ========================================================================= */}
          {activeSubTab === 'cuadro' && (
            <div className="space-y-5">
              {/* ENCABEZADO TÉCNICO DE LA BITÁCORA (OMITIENDO EL NOMBRE DE LA EMPRESA) */}
              <div className="bg-white dark:bg-slate-900 p-4 sm:p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                  {/* Selector de Aeronave / Matrícula */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      AERONAVE / MATRÍCULA *
                    </label>
                    <select
                      value={selectedAircraft}
                      onChange={(e) => handleAircraftChange(e.target.value)}
                      className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
                    >
                      {OFFICIAL_FLEET.map(f => (
                        <option key={f.matricula} value={f.matricula}>
                          {f.matricula} — {f.modelo} (${f.tarifa}.00/h)
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Modelo y Categoría de la Aeronave */}
                  <div>
                    <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1">
                      MODELO Y TARIFA VIGENTE
                    </label>
                    <div className="px-3 py-2.5 bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-xs flex items-center justify-between">
                      <span className="font-bold text-slate-800 dark:text-slate-200 truncate">
                        {currentAircraftData.modelo}
                      </span>
                      <span className="font-black text-indigo-600 dark:text-indigo-400 shrink-0 ml-2">
                        ${currentAircraftData.tarifa}.00/hr
                      </span>
                    </div>
                  </div>

                  {/* Fecha de la Hoja de Bitácora */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      FECHA DE OPERACIÓN *
                    </label>
                    <input
                      type="date"
                      value={sheetDate}
                      onChange={(e) => {
                        setSheetDate(e.target.value);
                        setSheetRows(prev => prev.map(r => ({ ...r, fecha: e.target.value })));
                      }}
                      className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>

                  {/* Base Operacional */}
                  <div>
                    <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1">
                      BASE / AEROPUERTO OPERACIONAL
                    </label>
                    <div className="px-3 py-2.5 bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                      <Plane className="w-3.5 h-3.5 text-slate-400" />
                      <span>MPMG - Marcos A. Gelabert (Albrook)</span>
                    </div>
                  </div>
                </div>

                {/* Estado en vivo de Tacómetro y Mantenimiento (Taller OMA) */}
                {!isInstructor && (() => {
                  const maint = getLiveAircraftMaintenance(selectedAircraft);
                  if (!maint) return null;
                  return (
                    <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2 text-xs">
                      <div className="flex items-center gap-3 flex-wrap">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 font-mono font-bold text-slate-800 dark:text-slate-200">
                          <Gauge className="w-3.5 h-3.5 text-indigo-600" />
                          <span>Tacómetro Taller: {maint.horas_totales_celula.toFixed(1)} hrs</span>
                        </span>
                        <span className={`font-mono font-semibold ${maint.horas_restantes_50h <= 5 ? 'text-rose-600 dark:text-rose-400' : 'text-slate-600 dark:text-slate-400'}`}>
                          50h restante: {maint.horas_restantes_50h.toFixed(1)} hrs
                        </span>
                        <span className={`font-mono font-semibold ${maint.horas_restantes_100h <= 10 ? 'text-rose-600 dark:text-rose-400' : 'text-slate-600 dark:text-slate-400'}`}>
                          100h restante: {maint.horas_restantes_100h.toFixed(1)} hrs
                        </span>
                      </div>
                      <span className={`px-2.5 py-0.5 rounded-md font-bold text-[11px] uppercase ${
                        maint.bloqueo_despacho || maint.estado_aeronavegabilidad === 'aog_bloqueado'
                          ? 'bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300'
                          : maint.estado_aeronavegabilidad === 'inspeccion_proxima'
                          ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
                          : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300'
                      }`}>
                        {maint.bloqueo_despacho || maint.estado_aeronavegabilidad === 'aog_bloqueado'
                          ? 'AOG Bloqueado'
                          : maint.estado_aeronavegabilidad === 'inspeccion_proxima'
                          ? 'Inspección Próxima'
                          : maint.estado_aeronavegabilidad === 'en_mantenimiento'
                          ? 'En Taller OMA'
                          : 'Aeronavegable'}
                      </span>
                    </div>
                  );
                })()}
              </div>

              {/* CUADRO TÉCNICO DE BITÁCORA */}
              <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
                <div className="p-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                  <div>
                    <h2 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2 flex-wrap">
                      <FileSpreadsheet className="w-4 h-4 text-indigo-600" />
                      <span>Cuadro de Registro de Vuelo de la Aeronave</span>
                      {isReadOnlyLogbook && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-[11px] font-semibold bg-slate-800 text-slate-300 border border-slate-700">
                          <ShieldCheck className="w-3.5 h-3.5 text-sky-400" />
                          <span>Solo Lectura</span>
                        </span>
                      )}
                    </h2>
                  </div>

                  {!isReadOnlyLogbook && (
                    <div className="flex items-center gap-2 flex-wrap">
                      <button
                        type="button"
                        id="btn-registrar-bitacora"
                        onClick={handleOpenBlankRegisterPanel}
                        className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 active:scale-98 text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-2 cursor-pointer hover:shadow-md"
                      >
                        <PlusCircle className="w-4 h-4 text-white" />
                        <span>{isInstructorAny ? 'Registrar Vuelo en Bitácora' : 'Registrar Bitácora'}</span>
                      </button>

                      <button
                        type="button"
                        onClick={handleAddRow}
                        className="px-3 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-medium border border-slate-200 dark:border-slate-700 transition-colors cursor-pointer flex items-center gap-1.5"
                        title="Agregar fila rápida en la tabla"
                      >
                        <PlusCircle className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">Agregar Fila Rápida</span>
                      </button>
                    </div>
                  )}
                </div>

                {/* TABLA PRINCIPAL DEL CUADRO DE BITÁCORA */}
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead className="bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 font-bold uppercase text-[10px] border-b border-slate-200 dark:border-slate-700 tracking-wider">
                      <tr>
                        <th className="p-3 border-r border-slate-200 dark:border-slate-700 text-center w-10">#</th>
                        <th className="p-3 border-r border-slate-200 dark:border-slate-700 min-w-[190px]">
                          NÚMERO DE BITÁCORA (RECIBO) *
                        </th>
                        <th className="p-3 border-r border-slate-200 dark:border-slate-700 min-w-[220px]">
                          ESTUDIANTE (IDENTIFICACIÓN) *
                        </th>
                        <th className="p-3 border-r border-slate-200 dark:border-slate-700 min-w-[170px]">
                          INSTRUCTOR / PIC
                        </th>
                        <th className="p-3 border-r border-slate-200 dark:border-slate-700 min-w-[120px]">
                          RUTA (DE - A)
                        </th>
                        <th className="p-3 border-r border-slate-200 dark:border-slate-700 min-w-[140px] text-center">
                          CALZO (OUT - IN)
                        </th>
                        <th className="p-3 border-r border-slate-200 dark:border-slate-700 min-w-[165px] text-center">
                          TACÓMETRO (INI - FIN) *
                        </th>
                        <th className="p-3 border-r border-slate-200 dark:border-slate-700 min-w-[150px] text-center">
                          HOBBS (INI - FIN)
                        </th>
                        <th className="p-3 border-r border-slate-200 dark:border-slate-700 min-w-[100px] text-center">
                          TOTAL HOBBS
                        </th>
                        <th className="p-3 border-r border-slate-200 dark:border-slate-700 min-w-[160px]">
                          MISIÓN / FASE
                        </th>
                        {canPostDebit && (
                          <>
                            <th className="p-3 border-r border-slate-200 dark:border-slate-700 min-w-[125px] text-center">
                              FÓRMULA (×1.275)
                            </th>
                            <th className="p-3 border-r border-slate-200 dark:border-slate-700 min-w-[110px] text-right">
                              COBRO ESTUDIANTE
                            </th>
                            {!isInstructorAny && (
                              <th className="p-3 border-r border-slate-200 dark:border-slate-700 min-w-[130px] text-right">
                                SALDO RESTANTE
                              </th>
                            )}
                          </>
                        )}
                        <th className="p-3 text-center min-w-[140px]">ACCIÓN</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                      {sheetRows.map((row, idx) => {
                        const studentBal = row.matchedStudent ? getStudentBalance(row.matchedStudent.id) : 0;
                        const projectedBal = Number((studentBal - row.totalDebito).toFixed(2));

                        return (
                          <tr
                            key={row.id}
                            className={`transition-colors ${row.guardado ? 'bg-emerald-50/40 dark:bg-emerald-950/20' : 'hover:bg-slate-50/60 dark:hover:bg-slate-800/30'}`}
                          >
                            {/* Número de Fila */}
                            <td className="p-3 border-r border-slate-200 dark:border-slate-700 text-center font-bold text-slate-500">
                              {idx + 1}
                            </td>

                            {/* NÚMERO DE BITÁCORA / RECIBO */}
                            <td className="p-3 border-r border-slate-200 dark:border-slate-700">
                              {isReadOnlyLogbook ? (
                                <span className="font-mono font-bold text-slate-900 dark:text-white text-xs block">
                                  {row.numeroBitacora || 'S/N'}
                                </span>
                              ) : (
                                <div className="relative">
                                  <input
                                    type="text"
                                    value={row.numeroBitacora}
                                    disabled={row.guardado}
                                    onChange={(e) => updateRowField(row.id, 'numeroBitacora', e.target.value)}
                                    placeholder="ej: BIT-1450-2026-0042"
                                    className="w-full px-2.5 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-xs font-mono font-bold text-indigo-700 dark:text-indigo-300 focus:ring-1 focus:ring-indigo-500 uppercase"
                                  />
                                </div>
                              )}
                            </td>

                            {/* ESTUDIANTE / BÚSQUEDA AUTOMÁTICA */}
                            <td className="p-3 border-r border-slate-200 dark:border-slate-700">
                              {isReadOnlyLogbook ? (
                                <span className="font-semibold text-slate-900 dark:text-slate-100 text-xs block">
                                  {row.matchedStudent ? row.matchedStudent.nombre : (row.estudianteQuery || 'Sin asignar')}
                                </span>
                              ) : (
                                <div className="space-y-1.5">
                                  <div className="relative">
                                    <input
                                      type="text"
                                      value={row.estudianteQuery}
                                      disabled={row.guardado}
                                      onChange={(e) => updateRowField(row.id, 'estudianteQuery', e.target.value)}
                                      placeholder="Escriba nombre o cédula..."
                                      className="w-full px-2.5 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-xs font-medium text-slate-900 dark:text-white focus:ring-1 focus:ring-indigo-500"
                                    />
                                  </div>

                                  {row.matchedStudent ? (
                                    <div className="flex items-center justify-between text-[11px] bg-indigo-50/70 dark:bg-indigo-950/40 px-2 py-1 rounded border border-indigo-100 dark:border-indigo-900/40">
                                      <span className="font-semibold text-slate-800 dark:text-slate-200 truncate">
                                        {row.matchedStudent.nombre}
                                      </span>
                                      {!isInstructorAny && (
                                        <span className="font-bold text-slate-600 dark:text-slate-400 ml-1 shrink-0">
                                          Saldo: ${studentBal.toFixed(2)}
                                        </span>
                                      )}
                                    </div>
                                  ) : (
                                    <div className="text-[10px] text-amber-600 dark:text-amber-400 flex items-center gap-1">
                                      <AlertTriangle className="w-3 h-3 shrink-0" />
                                      <span>Selecciona un estudiante</span>
                                    </div>
                                  )}
                                </div>
                              )}
                            </td>

                            {/* INSTRUCTOR / PIC */}
                            <td className="p-3 border-r border-slate-200 dark:border-slate-700">
                              {isReadOnlyLogbook ? (
                                <span className="font-medium text-slate-800 dark:text-slate-300 text-xs">
                                  {row.instructorNombre || 'Cap. Valeria Benítez'}
                                </span>
                              ) : isInstructor ? (
                                <span className="inline-block w-full px-2 py-1.5 bg-slate-100 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-semibold text-slate-800 dark:text-slate-200 truncate">
                                  {currentUser.nombre}
                                </span>
                              ) : (
                                <select
                                  value={row.instructorId}
                                  disabled={row.guardado}
                                  onChange={(e) => {
                                    updateRowField(row.id, 'instructorId', e.target.value);
                                  }}
                                  className="w-full px-2 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-xs font-medium text-slate-800 dark:text-slate-200 focus:ring-1 focus:ring-indigo-500"
                                >
                                  <option value="">-- Vuelo Solo (Sin Instructor) --</option>
                                  {availableInstructorsForLogbook.map(inst => (
                                    <option key={inst.id} value={inst.id}>{inst.nombre}</option>
                                  ))}
                                </select>
                              )}
                            </td>

                            {/* RUTA (DE - A) */}
                            <td className="p-3 border-r border-slate-200 dark:border-slate-700">
                              {isReadOnlyLogbook ? (
                                <span className="font-mono font-bold text-slate-800 dark:text-slate-200 text-xs uppercase">
                                  {row.origen || 'MPMG'} - {row.destino || 'MPMG'}
                                </span>
                              ) : (
                                <div className="flex items-center gap-1">
                                  <input
                                    type="text"
                                    value={row.origen}
                                    disabled={row.guardado}
                                    onChange={(e) => updateRowField(row.id, 'origen', e.target.value.toUpperCase())}
                                    className="w-1/2 px-2 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-xs font-mono font-bold text-slate-800 dark:text-slate-200 text-center uppercase"
                                  />
                                  <span className="text-slate-400">-</span>
                                  <input
                                    type="text"
                                    value={row.destino}
                                    disabled={row.guardado}
                                    onChange={(e) => updateRowField(row.id, 'destino', e.target.value.toUpperCase())}
                                    className="w-1/2 px-2 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-xs font-mono font-bold text-slate-800 dark:text-slate-200 text-center uppercase"
                                  />
                                </div>
                              )}
                            </td>

                            {/* CALZO (OUT - IN) */}
                            <td className="p-3 border-r border-slate-200 dark:border-slate-700 text-center">
                              {isReadOnlyLogbook ? (
                                <span className="font-mono text-slate-700 dark:text-slate-300 text-xs">
                                  {row.horaSalida || '—'} - {row.horaLlegada || '—'}
                                </span>
                              ) : (
                                <div className="flex items-center gap-1">
                                  <input
                                    type="text"
                                    value={row.horaSalida}
                                    disabled={row.guardado}
                                    onChange={(e) => updateRowField(row.id, 'horaSalida', e.target.value)}
                                    placeholder="08:30"
                                    className="w-1/2 px-1.5 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-xs font-mono text-center text-slate-800 dark:text-slate-200"
                                  />
                                  <span className="text-slate-400">-</span>
                                  <input
                                    type="text"
                                    value={row.horaLlegada}
                                    disabled={row.guardado}
                                    onChange={(e) => updateRowField(row.id, 'horaLlegada', e.target.value)}
                                    placeholder="10:00"
                                    className="w-1/2 px-1.5 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-xs font-mono text-center text-slate-800 dark:text-slate-200"
                                  />
                                </div>
                              )}
                            </td>

                            {/* TACÓMETRO (INI - FIN) */}
                            <td className="p-3 border-r border-slate-200 dark:border-slate-700 text-center">
                              {isReadOnlyLogbook ? (
                                <span className="font-mono font-semibold text-indigo-700 dark:text-indigo-300 text-xs">
                                  {row.tacometroInicial || '—'} - {row.tacometroFinal || '—'}
                                </span>
                              ) : (
                                <div className="flex items-center gap-1">
                                  <input
                                    type="number"
                                    step="0.1"
                                    value={row.tacometroInicial}
                                    disabled={row.guardado}
                                    onChange={(e) => updateRowField(row.id, 'tacometroInicial', e.target.value)}
                                    placeholder="Ini"
                                    className="w-1/2 px-1.5 py-1.5 bg-indigo-50/50 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-800 rounded-lg text-xs font-mono font-bold text-center text-indigo-800 dark:text-indigo-200"
                                  />
                                  <span className="text-slate-400">-</span>
                                  <input
                                    type="number"
                                    step="0.1"
                                    value={row.tacometroFinal}
                                    disabled={row.guardado}
                                    onChange={(e) => updateRowField(row.id, 'tacometroFinal', e.target.value)}
                                    placeholder="Fin"
                                    className="w-1/2 px-1.5 py-1.5 bg-indigo-50/50 dark:bg-indigo-950/30 border border-indigo-300 dark:border-indigo-700 rounded-lg text-xs font-mono font-bold text-center text-indigo-900 dark:text-indigo-100"
                                  />
                                </div>
                              )}
                            </td>

                            {/* HOBBS (INI - FIN) */}
                            <td className="p-3 border-r border-slate-200 dark:border-slate-700 text-center">
                              {isReadOnlyLogbook ? (
                                <span className="font-mono font-semibold text-slate-700 dark:text-slate-300 text-xs">
                                  {row.hobbsInicial} - {row.hobbsFinal}
                                </span>
                              ) : (
                                <div className="flex items-center gap-1">
                                  <input
                                    type="number"
                                    step="0.1"
                                    value={row.hobbsInicial}
                                    disabled={row.guardado}
                                    onChange={(e) => updateRowField(row.id, 'hobbsInicial', e.target.value)}
                                    className="w-1/2 px-1.5 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-xs font-mono font-bold text-center text-slate-800 dark:text-slate-200"
                                  />
                                  <span className="text-slate-400">-</span>
                                  <input
                                    type="number"
                                    step="0.1"
                                    value={row.hobbsFinal}
                                    disabled={row.guardado}
                                    onChange={(e) => updateRowField(row.id, 'hobbsFinal', e.target.value)}
                                    className="w-1/2 px-1.5 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-xs font-mono font-bold text-center text-slate-800 dark:text-slate-200"
                                  />
                                </div>
                              )}
                            </td>

                            {/* TOTAL HOBBS */}
                            <td className="p-3 border-r border-slate-200 dark:border-slate-700 text-center">
                              {isReadOnlyLogbook ? (
                                <span className="font-mono font-black text-xs text-sky-600 dark:text-sky-400">
                                  {row.horasTotal} hrs
                                </span>
                              ) : (
                                <input
                                  type="number"
                                  step="0.01"
                                  value={row.horasTotal}
                                  disabled={row.guardado}
                                  onChange={(e) => updateRowField(row.id, 'horasTotal', e.target.value)}
                                  className="w-16 px-2 py-1.5 bg-indigo-50/60 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800 rounded-lg text-xs font-black text-center text-indigo-700 dark:text-indigo-300"
                                />
                              )}
                            </td>

                            {/* MISIÓN / FASE */}
                            <td className="p-3 border-r border-slate-200 dark:border-slate-700">
                              {isReadOnlyLogbook ? (
                                <span className="text-xs text-slate-700 dark:text-slate-300 truncate max-w-xs block">
                                  {row.mision || 'Instrucción de Vuelo'}
                                </span>
                              ) : (
                                <input
                                  type="text"
                                  value={row.mision}
                                  disabled={row.guardado}
                                  onChange={(e) => updateRowField(row.id, 'mision', e.target.value)}
                                  placeholder="Maniobras / Tránsito..."
                                  className="w-full px-2.5 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-xs font-medium text-slate-800 dark:text-slate-200"
                                />
                              )}
                            </td>

                            {canPostDebit && (
                              <>
                                {/* TOTAL FÓRMULA ESTUDIANTE (× 1.275) */}
                                <td className="p-3 border-r border-slate-200 dark:border-slate-700 text-center font-mono">
                                  <span className="font-black text-indigo-700 dark:text-indigo-300 block">
                                    {formatFormulaHours(calcStudentBillableHours(Number(row.horasTotal) || 0))} hrs
                                  </span>
                                  <span className="text-[10px] text-slate-400">
                                    {Number(row.horasTotal) || 0} × 1.275
                                  </span>
                                </td>

                                {/* DÉBITO TOTAL */}
                                <td className="p-3 border-r border-slate-200 dark:border-slate-700 text-right font-black text-rose-600 dark:text-rose-400">
                                  -${row.totalDebito.toFixed(2)}
                                </td>

                                {/* SALDO RESTANTE */}
                                {!isInstructorAny && (
                                  <td className="p-3 border-r border-slate-200 dark:border-slate-700 text-right">
                                    <span className={`font-black ${projectedBal < 0 ? 'text-rose-600' : 'text-slate-800 dark:text-slate-200'}`}>
                                      ${projectedBal.toFixed(2)}
                                    </span>
                                  </td>
                                )}
                              </>
                            )}

                            {/* ACCIÓN: GUARDAR / DEBITAR O VER DETALLE */}
                            <td className="p-3 text-center">
                              {isReadOnlyLogbook ? (
                                <button
                                  type="button"
                                  onClick={() => handleOpenRowInPanel(row)}
                                  className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-lg text-xs font-semibold transition-colors cursor-pointer inline-flex items-center gap-1.5 border border-slate-200 dark:border-slate-700"
                                  title="Ver detalles del registro en modo solo lectura"
                                >
                                  <FileText className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
                                  <span>Ver Detalle</span>
                                </button>
                              ) : row.guardado ? (
                                <div className="flex items-center justify-center gap-2">
                                  <div className="inline-flex items-center gap-1 text-emerald-600 font-bold text-xs">
                                    <CheckCircle2 className="w-4 h-4" />
                                    <span>Debitado</span>
                                  </div>
                                  <button
                                    type="button"
                                    onClick={() => handleOpenRowInPanel(row)}
                                    className="p-1 text-indigo-600 hover:text-indigo-800 dark:text-indigo-400 transition-colors cursor-pointer"
                                    title="Ver en el panel"
                                  >
                                    <FileSpreadsheet className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              ) : (
                                <div className="flex items-center justify-center gap-1.5">
                                  <button
                                    type="button"
                                    onClick={() => handleSaveRow(row.id)}
                                    disabled={row.saving || !canPostDebit}
                                    className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-bold text-xs rounded-lg transition-colors cursor-pointer flex items-center gap-1 shadow-2xs"
                                    title="Guardar información de bitácora y debitar cuenta"
                                  >
                                    <Check className="w-3.5 h-3.5" />
                                    <span>{row.saving ? 'Guardando...' : 'Guardar y Debitar'}</span>
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleOpenRowInPanel(row)}
                                    className="p-1.5 text-slate-500 hover:text-indigo-600 dark:text-slate-400 dark:hover:text-indigo-400 transition-colors cursor-pointer"
                                    title="Abrir y editar en el panel completo"
                                  >
                                    <FileSpreadsheet className="w-3.5 h-3.5" />
                                  </button>
                                  {sheetRows.length > 1 && (
                                    <button
                                      type="button"
                                      onClick={() => handleDeleteRow(row.id)}
                                      className="p-1.5 text-slate-400 hover:text-rose-600 transition-colors cursor-pointer"
                                      title="Eliminar fila"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  )}
                                </div>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* PIE DEL CUADRO CON ACCIÓN MASIVA O AVISO DE SOLO LECTURA */}
                <div className="p-4 bg-slate-50 dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
                  <span className="text-slate-500 dark:text-slate-400">
                    Aeronave: <strong>{selectedAircraft}</strong> • Tarifa oficial: <strong>${currentAircraftData.tarifa}.00 USD/hr</strong> • {sheetRows.length} registro(s) en la hoja
                  </span>

                  {isReadOnlyLogbook ? (
                    <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 text-xs py-1">
                      <ShieldCheck className="w-4 h-4 text-sky-400 shrink-0" />
                      <span>Solo lectura</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 w-full sm:w-auto flex-wrap">
                      <button
                        type="button"
                        onClick={handleOpenBlankRegisterPanel}
                        className="w-full sm:w-auto px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl transition-colors cursor-pointer flex items-center justify-center gap-1.5 shadow-xs"
                      >
                        <PlusCircle className="w-4 h-4 text-white" />
                        <span>Registrar Bitácora</span>
                      </button>

                      <button
                        type="button"
                        onClick={handleAddRow}
                        className="w-full sm:w-auto px-4 py-2 bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-bold rounded-xl transition-colors cursor-pointer flex items-center justify-center gap-1.5"
                      >
                        <PlusCircle className="w-4 h-4" />
                        <span>Agregar Fila Rápida</span>
                      </button>

                      <button
                        type="button"
                        onClick={handleSaveAllPendingRows}
                        disabled={!canPostDebit || isSavingAll || sheetRows.every(r => r.guardado)}
                        className="w-full sm:w-auto px-5 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold rounded-xl transition-colors cursor-pointer flex items-center justify-center gap-1.5 shadow-2xs"
                      >
                        <CheckCircle2 className="w-4 h-4" />
                        <span>{isSavingAll ? 'Guardando...' : 'Guardar y Debitar Todas'}</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* SUB-TAB: HISTORIAL GLOBAL DE BITÁCORAS (ADMIN) */}
          {/* ========================================================================= */}
          {activeSubTab === 'historial' && (
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
              <div className="p-4 sm:p-5 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div>
                  <h3 className="font-bold text-sm sm:text-base text-slate-900 dark:text-white">
                    Historial Global de Bitácoras de Flota
                  </h3>
                </div>

                <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
                  {/* Buscador Global */}
                  <div className="relative w-full sm:w-64">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
                    <input
                      type="text"
                      placeholder="Buscar bitácora, alumno, fecha..."
                      value={globalHistorySearch}
                      onChange={(e) => setGlobalHistorySearch(e.target.value)}
                      className="w-full pl-9 pr-8 py-2 text-xs bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-900 dark:text-white shadow-2xs"
                    />
                  </div>

                  {/* Filtro Aeronave */}
                  <select
                    value={globalAircraftFilter}
                    onChange={(e) => setGlobalAircraftFilter(e.target.value)}
                    className="px-3 py-2 text-xs bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl font-medium text-slate-900 dark:text-white shadow-2xs cursor-pointer"
                  >
                    <option value="ALL">Todas las Aeronaves</option>
                    {OFFICIAL_FLEET.map(f => (
                      <option key={f.matricula} value={f.matricula}>{f.matricula}</option>
                    ))}
                  </select>

                  {/* Exportar */}
                  <button
                    onClick={handleExportCSV}
                    className="px-3 py-2 text-xs font-bold text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800 rounded-xl hover:bg-indigo-100 transition-colors flex items-center gap-1.5 cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>CSV</span>
                  </button>
                </div>
              </div>

              {/* TABLA HISTORIAL */}
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-100/70 dark:bg-slate-800/60 text-slate-700 dark:text-slate-300 uppercase font-bold text-[10px] border-b border-slate-200 dark:border-slate-800">
                    <tr>
                      <th className="px-4 py-3">No. Bitácora</th>
                      <th className="px-4 py-3">Fecha</th>
                      <th className="px-4 py-3">Estudiante</th>
                      <th className="px-4 py-3">Aeronave</th>
                      <th className="px-4 py-3 text-center">Horas / Tacómetro</th>
                      {!isStudent && (
                        <>
                          <th className="px-4 py-3 text-right">Tarifa</th>
                          <th className="px-4 py-3 text-right">Débito</th>
                        </>
                      )}
                      <th className="px-4 py-3">Detalle / Misión</th>
                      <th className="px-4 py-3 text-center">Comprobante</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
                    {filteredGlobalFlights.length === 0 ? (
                      <tr>
                        <td colSpan={9} className="px-4 py-8 text-center text-slate-400">
                          No hay registros de bitácoras con los filtros seleccionados
                        </td>
                      </tr>
                    ) : (
                      filteredGlobalFlights.map((tx) => {
                        const studentName = allUsers.find(u => u.id === tx.estudiante_id)?.nombre || tx.estudiante_nombre || 'Estudiante';
                        const folio = tx.referencia_ach || 'S/F';

                        return (
                          <tr key={tx.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors">
                            <td className="px-4 py-3 whitespace-nowrap font-mono font-bold text-indigo-600 dark:text-indigo-400">
                              {folio}
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap text-slate-700 dark:text-slate-300">
                              {tx.fecha}
                            </td>
                            <td className="px-4 py-3 font-semibold text-slate-900 dark:text-white">
                              {studentName}
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap">
                              <span className="px-2 py-0.5 bg-slate-200 dark:bg-slate-700 rounded font-mono font-bold text-[10px]">
                                {tx.matricula_avion || 'HP-1450'}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-center">
                              <span className="font-bold text-sky-600 block">
                                {tx.horas_hobbs !== undefined
                                  ? `${formatFormulaHours(tx.horas_hobbs)} hrs Hobbs`
                                  : tx.horas_vuelo
                                  ? `${formatFormulaHours(tx.horas_vuelo)} hrs`
                                  : '1.0 hrs'}
                              </span>
                              {tx.horas_hobbs !== undefined && tx.horas_vuelo !== undefined && (
                                <span className="font-mono text-[10px] text-indigo-600 dark:text-indigo-400 block">
                                  Cobro Est.: {formatFormulaHours(tx.horas_vuelo)} hrs
                                </span>
                              )}
                              {tx.tacometro_final !== undefined && (
                                <span className="font-mono text-[10px] text-slate-500 dark:text-slate-400">
                                  Tach: {tx.tacometro_inicial !== undefined ? `${tx.tacometro_inicial.toFixed(1)}→` : ''}{tx.tacometro_final.toFixed(1)}
                                </span>
                              )}
                            </td>
                            {!isStudent && (
                              <>
                                <td className="px-4 py-3 text-right text-slate-500">
                                  ${tx.tarifa_hora ? tx.tarifa_hora : 220}/h
                                </td>
                                <td className="px-4 py-3 text-right font-black text-rose-600">
                                  -${tx.monto.toFixed(2)} USD
                                </td>
                              </>
                            )}
                            <td className="px-4 py-3 text-slate-500 text-[11px] max-w-xs truncate">
                              {tx.tipo_mision || tx.notas}
                            </td>
                            <td className="px-4 py-3 text-center">
                              <button
                                onClick={() => setReceiptModalTx(tx)}
                                className="px-2 py-1 bg-slate-100 dark:bg-slate-800 hover:bg-indigo-50 dark:hover:bg-indigo-950 text-indigo-600 dark:text-indigo-400 font-bold rounded text-[10px] cursor-pointer"
                              >
                                Ver Recibo
                              </button>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* SUB-TAB: CARGA POR LOTE / TELEMETRÍA */}
          {/* ========================================================================= */}
          {activeSubTab === 'lote' && !isInstructor && (
            <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
              <div>
                <h3 className="font-bold text-sm sm:text-base text-slate-900 dark:text-white">
                  Carga por Lote / Archivo de Bitácoras
                </h3>
              </div>

              <div className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700 text-xs text-slate-600 dark:text-slate-300">
                <p className="font-bold text-slate-800 dark:text-slate-200 mb-1">Formato soportado (por fila):</p>
                <p className="font-mono text-[11px] text-indigo-600 dark:text-indigo-300">
                  Fecha, Matrícula, Nombre del Estudiante, Horas, Folio Bitácora
                </p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                  Ejemplo: <code>2026-03-15, HP-1450, Gabriel Fernández, 1.5, BIT-1450-2026-0099</code>
                </p>
              </div>

              <button
                type="button"
                onClick={() => setActiveSubTab('cuadro')}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl cursor-pointer transition-colors"
              >
                Ir al Cuadro de Registro Manual
              </button>
            </div>
          )}

          {/* ========================================================================= */}
          {/* SUB-TAB: TARIFARIO DE FLOTA */}
          {/* ========================================================================= */}
          {activeSubTab === 'flota' && (
            <div className="space-y-4">
              <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
                <h2 className="font-bold text-sm sm:text-base text-slate-900 dark:text-white">
                  Tarifario Oficial & Especificaciones de Aeronaves
                </h2>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {OFFICIAL_FLEET.map(aircraft => (
                  <div
                    key={aircraft.matricula}
                    className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col justify-between space-y-4 hover:border-indigo-300 transition-all"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2 pb-3 border-b border-slate-100 dark:border-slate-800">
                        <div>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                            {aircraft.categoria}
                          </span>
                          <h3 className="font-black text-lg text-slate-900 dark:text-white mt-1.5 flex items-center gap-2">
                            <Plane className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                            <span>{aircraft.matricula}</span>
                          </h3>
                          <p className="text-xs font-semibold text-slate-600 dark:text-slate-300">{aircraft.modelo}</p>
                        </div>

                        <div className="text-right">
                          <span className="text-[10px] text-slate-400 uppercase font-bold block">Tarifa Oficial</span>
                          <div className="text-xl font-black text-indigo-600 dark:text-indigo-400">
                            ${aircraft.tarifa}
                            <span className="text-xs font-normal text-slate-400">/hr</span>
                          </div>
                        </div>
                      </div>

                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-3">
                        {aircraft.descripcion}
                      </p>

                      <div className="mt-4 space-y-2 bg-slate-50 dark:bg-slate-800/60 p-3 rounded-xl border border-slate-100 dark:border-slate-700/60 text-xs">
                        <div className="flex items-center justify-between">
                          <span className="text-slate-500 flex items-center gap-1">
                            <Gauge className="w-3.5 h-3.5 text-slate-400" />
                            <span>Planta Motriz:</span>
                          </span>
                          <span className="font-semibold text-slate-800 dark:text-slate-200 text-right text-[11px]">{aircraft.motor}</span>
                        </div>

                        <div className="flex items-center justify-between">
                          <span className="text-slate-500 flex items-center gap-1">
                            <Fuel className="w-3.5 h-3.5 text-slate-400" />
                            <span>Combustible:</span>
                          </span>
                          <span className="font-semibold text-slate-800 dark:text-slate-200 text-[11px]">{aircraft.combustible}</span>
                        </div>
                      </div>
                    </div>

                    <div className="pt-2 flex items-center justify-between text-xs">
                      <span className="text-[11px] text-slate-400">Certificada AAC RAC 141</span>
                      <button
                        type="button"
                        onClick={() => {
                          handleAircraftChange(aircraft.matricula);
                          setActiveSubTab('cuadro');
                        }}
                        className="px-3 py-1.5 bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-100 text-indigo-700 dark:text-indigo-300 font-bold rounded-lg border border-indigo-200 dark:border-indigo-800 text-[11px] transition-colors cursor-pointer flex items-center gap-1"
                      >
                        <span>{isInstructor ? 'Ver en el Cuadro' : 'Cargar al Cuadro'}</span>
                        <ArrowRight className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: COMPROBANTE OFICIAL DE BITÁCORA Y RECIBO DE VUELO */}
      {/* ========================================================================= */}
      {receiptModalTx && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-lg w-full max-h-[90vh] overflow-y-auto my-auto p-6 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-5 animate-in fade-in zoom-in-95 duration-200">
            {/* Cabecera del Comprobante */}
            <div className="flex items-start justify-between pb-4 border-b border-slate-200 dark:border-slate-800">
              <div>
                <span className="text-[10px] uppercase tracking-wider font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950 px-2 py-0.5 rounded">
                  Comprobante Oficial de Bitácora
                </span>
                <h3 className="text-lg font-black text-slate-900 dark:text-white mt-1">
                  Recibo de Horas de Vuelo Debitado
                </h3>
                <p className="text-xs font-mono font-bold text-slate-500 dark:text-slate-400 mt-0.5">
                  Folio: {receiptModalTx.referencia_ach || 'BIT-OFICIAL'}
                </p>
              </div>
              <button
                onClick={() => setReceiptModalTx(null)}
                className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Detalles del Vuelo */}
            <div className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3 bg-slate-50 dark:bg-slate-800/60 p-3.5 rounded-2xl border border-slate-100 dark:border-slate-700/60">
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">Fecha de Emisión</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200">{receiptModalTx.fecha}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">Aeronave</span>
                  <span className="font-mono font-black text-indigo-600 dark:text-indigo-400">
                    {receiptModalTx.matricula_avion || 'HP-1450'} ({receiptModalTx.modelo_avion || 'Cessna 172'})
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">Estudiante / Alumno</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200">
                    {allUsers.find(u => u.id === receiptModalTx.estudiante_id)?.nombre || 'Alumno Piloto'}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">Horas Facturadas</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200">
                    {receiptModalTx.horas_vuelo ? `${formatFormulaHours(receiptModalTx.horas_vuelo)} hrs` : '1.0 hrs'}
                  </span>
                  {receiptModalTx.horas_hobbs !== undefined && (
                    <span className="block text-[10px] font-mono text-indigo-600 dark:text-indigo-400">
                      Hobbs {formatFormulaHours(receiptModalTx.horas_hobbs)}h × 1.275
                    </span>
                  )}
                </div>
                {!isInstructor && receiptModalTx.tacometro_final !== undefined && (
                  <div className="col-span-2">
                    <span className="text-slate-400 block text-[10px] uppercase font-bold">Lectura de Tacómetro (Taller)</span>
                    <span className="font-mono font-bold text-indigo-600 dark:text-indigo-400">
                      {receiptModalTx.tacometro_inicial !== undefined ? `${receiptModalTx.tacometro_inicial.toFixed(1)} → ` : ''}
                      {receiptModalTx.tacometro_final.toFixed(1)} hrs
                    </span>
                  </div>
                )}
              </div>

              {/* Desglose de Liquidación */}
              <div className="space-y-2 p-3.5 bg-indigo-50/50 dark:bg-indigo-950/30 rounded-2xl border border-indigo-100 dark:border-indigo-900/40">
                <div className="flex justify-between items-center text-slate-600 dark:text-slate-400">
                  <span>Tarifa Aplicada:</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200">
                    ${receiptModalTx.tarifa_hora ? receiptModalTx.tarifa_hora.toFixed(2) : '220.00'} USD/hr
                  </span>
                </div>
                <div className="flex justify-between items-center text-slate-600 dark:text-slate-400">
                  <span>Misión / Fase:</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200">
                    {receiptModalTx.tipo_mision || 'Instrucción Práctica de Vuelo'}
                  </span>
                </div>
                <div className="pt-2 border-t border-indigo-200/60 dark:border-indigo-800/60 flex justify-between items-center font-bold">
                  <span className="text-slate-800 dark:text-slate-200">Monto Debitado de Cuenta:</span>
                  <span className="text-base font-black text-rose-600 dark:text-rose-400">
                    -${receiptModalTx.monto.toFixed(2)} USD
                  </span>
                </div>
              </div>

              {/* Notas y Certificación */}
              <div className="text-[11px] text-slate-500 dark:text-slate-400 p-2.5 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-100 dark:border-slate-800">
                <p className="font-semibold text-slate-700 dark:text-slate-300 mb-0.5">Observaciones Técnicas:</p>
                <p>{receiptModalTx.notas || 'Vuelo certificado según estándares de instrucción AAC Panamá RAC 141.'}</p>
              </div>
            </div>

            {/* Acciones del Modal */}
            <div className="flex items-center justify-between gap-3 pt-2">
              <button
                type="button"
                onClick={() => window.print()}
                className="px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <Printer className="w-4 h-4" />
                <span>Imprimir Recibo</span>
              </button>

              <button
                type="button"
                onClick={() => setReceiptModalTx(null)}
                className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl transition-colors cursor-pointer"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* PANEL MODAL CON TODOS LOS CAMPOS EN BLANCO PARA PERSONAL DE CONTABILIDAD */}
      {/* ========================================================================= */}
      {isRegisterModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
          <div className="relative bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl sm:rounded-3xl shadow-2xl w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden my-auto animate-in fade-in zoom-in-95 duration-150">
            
            {/* OVERLAY CON SPINNER DE 'GUARDANDO EN FIRESTORE' */}
            {blankFormSaving && (
              <div
                id="modal-logbook-saving-overlay"
                className="absolute inset-0 z-50 bg-white/95 dark:bg-slate-900/95 backdrop-blur-sm flex flex-col items-center justify-center p-6 text-center animate-in fade-in duration-200"
              >
                <div className="relative mb-5">
                  <div className="w-18 h-18 sm:w-20 sm:h-20 rounded-3xl bg-indigo-50 dark:bg-indigo-950/80 border-2 border-indigo-200 dark:border-indigo-800 flex items-center justify-center shadow-xl shadow-indigo-600/20">
                    <Loader2 className="w-9 h-9 sm:w-10 sm:h-10 text-indigo-600 dark:text-indigo-400 animate-spin" />
                  </div>
                  <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-emerald-500 text-white flex items-center justify-center shadow-md text-[10px] font-bold">
                    <Check className="w-3.5 h-3.5" />
                  </div>
                </div>

                <h4 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <span>Guardando bitácora...</span>
                </h4>

                <div className="mt-6 flex flex-col sm:flex-row items-center gap-2.5 px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-600 dark:text-slate-300">
                  <span className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-indigo-500 animate-ping shrink-0" />
                    <span className="font-semibold">Sincronización en curso</span>
                  </span>
                  <span className="hidden sm:inline text-slate-400">•</span>
                  <span className="text-[11px] text-slate-500 dark:text-slate-400">
                    Bloqueo activo para evitar múltiples envíos accidentales
                  </span>
                </div>
              </div>
            )}

            {/* ENCABEZADO DEL PANEL */}
            <div className="p-4 sm:p-5 border-b border-slate-100 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-800/50 flex items-center justify-between gap-3 shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shadow-md shadow-indigo-600/20 shrink-0">
                  <FileSpreadsheet className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-slate-900 dark:text-white flex items-center gap-2 flex-wrap">
                    <span>{effectiveModalReadOnly ? 'Detalle de Bitácora de Aeronave' : 'Registro de Bitácora de Aeronave'}</span>
                  </h3>
                </div>
              </div>

              <button
                type="button"
                onClick={() => !blankFormSaving && setIsRegisterModalOpen(false)}
                disabled={blankFormSaving}
                className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                title="Cerrar panel"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* CUERPO DEL FORMULARIO CON CAMPOS EN BLANCO (CONTENEDOR CON SCROLL VERTICAL) */}
            <div className="flex-1 min-h-0 overflow-y-auto p-4 sm:p-6">
              <fieldset disabled={blankFormSaving || effectiveModalReadOnly} className="space-y-6 text-xs border-0 m-0 p-0 min-w-0">
              
              {/* ALERTA DE ERROR EN EL FORMULARIO */}
              {blankFormError && (
                <div className="p-3.5 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 rounded-2xl text-rose-700 dark:text-rose-300 flex items-start gap-2.5">
                  <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600" />
                  <div className="flex-1">
                    <p className="font-bold">Revise los campos del formulario:</p>
                    <p className="text-[11px] mt-0.5">{blankFormError}</p>
                  </div>
                </div>
              )}

              {/* SECCIÓN 1: FOLIO Y AERONAVE */}
              <div className="space-y-3">
                <div className="flex items-center gap-2 pb-1 border-b border-slate-100 dark:border-slate-800">
                  <Hash className="w-4 h-4 text-indigo-600" />
                  <h4 className="font-bold text-slate-800 dark:text-slate-200 uppercase text-[11px] tracking-wider">
                    1. Identificación del Folio y Aeronave
                  </h4>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                  {/* Número de Bitácora / Recibo */}
                  <div className="space-y-1 sm:col-span-2">
                    <div className="flex items-center justify-between">
                      <label className="font-bold text-slate-700 dark:text-slate-300">
                        Número de Bitácora (Recibo) <span className="text-rose-500">*</span>
                      </label>
                      {!effectiveModalReadOnly && (
                        <button
                          type="button"
                          onClick={() => {
                            const suggested = generateInitialBitacoraNo(blankForm.matricula || selectedAircraft, transactions, [], sheetRows);
                            updateBlankFormField('numeroBitacora', suggested);
                          }}
                          className="text-[10px] text-indigo-600 hover:text-indigo-800 dark:text-indigo-400 hover:underline cursor-pointer"
                        >
                          Generar sugerido
                        </button>
                      )}
                    </div>
                    <input
                      type="text"
                      placeholder="Ej. BIT-1450-2026-0042"
                      value={blankForm.numeroBitacora}
                      onChange={(e) => updateBlankFormField('numeroBitacora', e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono focus:ring-2 focus:ring-indigo-500 outline-hidden"
                    />
                  </div>

                  {/* Fecha de Operación */}
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <label className="font-bold text-slate-700 dark:text-slate-300">
                        Fecha del Vuelo <span className="text-rose-500">*</span>
                      </label>
                      {!effectiveModalReadOnly && (
                        <button
                          type="button"
                          onClick={() => updateBlankFormField('fecha', new Date().toISOString().split('T')[0])}
                          className="text-[10px] text-indigo-600 hover:text-indigo-800 dark:text-indigo-400 hover:underline cursor-pointer"
                        >
                          Hoy
                        </button>
                      )}
                    </div>
                    <input
                      type="date"
                      value={blankForm.fecha}
                      onChange={(e) => updateBlankFormField('fecha', e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-hidden"
                    />
                  </div>

                  {/* Aeronave / Matrícula */}
                  <div className="space-y-1">
                    <label className="font-bold text-slate-700 dark:text-slate-300">
                      Aeronave / Matrícula <span className="text-rose-500">*</span>
                    </label>
                    <select
                      value={blankForm.matricula}
                      onChange={(e) => updateBlankFormField('matricula', e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-bold focus:ring-2 focus:ring-indigo-500 outline-hidden"
                    >
                      <option value="">-- Seleccionar Aeronave --</option>
                      {OFFICIAL_FLEET.map(ac => (
                        <option key={ac.matricula} value={ac.matricula}>
                          {ac.matricula} ({ac.modelo}) - ${ac.tarifa}/h
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* SECCIÓN 2: ESTUDIANTE, INSTRUCTOR Y HONORARIO */}
              <div className="space-y-3">
                <div className="flex items-center gap-2 pb-1 border-b border-slate-100 dark:border-slate-800">
                  <UserCheck className="w-4 h-4 text-indigo-600" />
                  <h4 className="font-bold text-slate-800 dark:text-slate-200 uppercase text-[11px] tracking-wider">
                    2. Estudiante en Bitácora, Instructor y Tarifas
                  </h4>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Búsqueda o Selección de Estudiante */}
                  <div className="space-y-1.5">
                    <label className="font-bold text-slate-700 dark:text-slate-300 flex items-center justify-between">
                      <span>Estudiante (en Bitácora) <span className="text-rose-500">*</span></span>
                      {blankForm.matchedStudent && (
                        <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" /> Estudiante Vinculado
                        </span>
                      )}
                    </label>

                    <div className="relative">
                      <div className="relative">
                        <input
                          type="text"
                          placeholder="Busque y seleccione el estudiante..."
                          value={blankForm.estudianteQuery}
                          onFocus={() => setStudentDropdownOpen(true)}
                          onChange={(e) => {
                            updateBlankFormField('estudianteQuery', e.target.value);
                            setStudentDropdownOpen(true);
                            if (blankForm.matchedStudent && e.target.value !== blankForm.matchedStudent.nombre) {
                              updateBlankFormField('matchedStudent', null);
                            }
                          }}
                          className={`w-full pl-9 pr-3 py-2 border rounded-xl bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-hidden ${
                            blankForm.matchedStudent
                              ? 'border-emerald-400 bg-emerald-50/20 text-emerald-900 dark:text-emerald-100 font-semibold'
                              : 'border-slate-300 dark:border-slate-700'
                          }`}
                        />
                        <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                      </div>

                      {/* Dropdown de Autocompletado */}
                      {studentDropdownOpen && !effectiveModalReadOnly && (
                        <div className="absolute left-0 right-0 top-full mt-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl z-20 max-h-48 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-700">
                          <div className="px-3 py-1.5 bg-slate-50 dark:bg-slate-800/80 flex items-center justify-between text-[10px] text-slate-500">
                            <span>Estudiantes registrados</span>
                            <button
                              type="button"
                              onClick={() => setStudentDropdownOpen(false)}
                              className="text-slate-500 hover:text-slate-800 cursor-pointer"
                            >
                              Cerrar
                            </button>
                          </div>
                          {filteredStudentsForPanel.length === 0 ? (
                            <div className="p-3 text-slate-400 text-center text-xs">
                              No se encontraron estudiantes; puedes usar el nombre escrito para registrar el honorario.
                            </div>
                          ) : (
                            filteredStudentsForPanel.map(student => {
                              const sBal = getStudentBalance(student.id);
                              return (
                                <button
                                  key={student.id}
                                  type="button"
                                  onClick={() => handleSelectStudentInBlankForm(student)}
                                  className="w-full text-left p-2.5 hover:bg-indigo-50 dark:hover:bg-indigo-950/50 flex items-center justify-between transition-colors cursor-pointer"
                                >
                                  <div>
                                    <span className="font-bold text-slate-800 dark:text-slate-200 block text-xs">
                                      {student.nombre}
                                    </span>
                                    <span className="text-[10px] text-slate-400">
                                      Céd: {student.documento_identidad || 'N/A'} • ID: {student.id}
                                    </span>
                                  </div>
                                  {!isInstructorAny && (
                                    <div className="text-right tabular-nums">
                                      <span className="text-[10px] text-slate-400 block">Saldo Actual:</span>
                                      <span className={`text-xs font-bold ${sBal >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                                        ${sBal.toFixed(2)} USD
                                      </span>
                                    </div>
                                  )}
                                </button>
                              );
                            })
                          )}
                        </div>
                      )}
                    </div>

                    {/* Resumen del estudiante seleccionado */}
                    {blankForm.matchedStudent ? (
                      <div className="p-2.5 bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900/50 rounded-xl flex items-center justify-between tabular-nums">
                        <div>
                          <span className="text-[10px] text-indigo-700 dark:text-indigo-300 font-bold block">
                            Piloto / Alumno Confirmado:
                          </span>
                          <span className="font-extrabold text-slate-800 dark:text-slate-100 text-xs">
                            {blankForm.matchedStudent.nombre}
                          </span>
                        </div>
                        {!isInstructorAny && (
                          <div className="text-right">
                            <span className="text-[10px] text-slate-500 dark:text-slate-400 block">Saldo en Cuenta:</span>
                            <span className="text-xs font-black text-indigo-700 dark:text-indigo-300">
                              ${panelStudentBalance.toFixed(2)} USD
                            </span>
                          </div>
                        )}
                      </div>
                    ) : (
                      <span className="text-[10px] text-slate-400 block">
                        Busque al alumno o ingrese directamente el nombre del piloto para registrar bitácora y honorario.
                      </span>
                    )}

                    {!effectiveModalReadOnly && (
                      <label className="flex items-center gap-2 pt-1 text-[11px] font-medium text-slate-600 dark:text-slate-300 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={blankForm.sinDebitoAlumno}
                          onChange={(e) => updateBlankFormField('sinDebitoAlumno', e.target.checked)}
                          className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                        />
                        <span>Solo registrar bitácora y honorario de instructor (sin debitar cuenta de estudiante)</span>
                      </label>
                    )}
                  </div>

                  {/* Instructor y Tarifas */}
                  <div className="space-y-3">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {/* Instructor / PIC */}
                      <div className="space-y-1">
                        <label className="font-bold text-slate-700 dark:text-slate-300">
                          Instructor / PIC
                        </label>
                        {isInstructor ? (
                          <div className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-100 dark:bg-slate-800/70 text-slate-900 dark:text-white font-semibold truncate">
                            {currentUser.nombre}
                          </div>
                        ) : (
                          <select
                            value={blankForm.instructorId}
                            onChange={(e) => updateBlankFormField('instructorId', e.target.value)}
                            className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-hidden"
                          >
                            <option value="">-- Seleccionar Instructor --</option>
                            {availableInstructorsForLogbook.map(inst => (
                              <option key={inst.id} value={inst.id}>
                                {inst.nombre}
                              </option>
                            ))}
                          </select>
                        )}
                      </div>

                      {/* Condición de Vuelo */}
                      <div className="space-y-1">
                        <label className="font-bold text-slate-700 dark:text-slate-300">
                          Condición
                        </label>
                        <select
                          value={blankForm.condicion}
                          onChange={(e) => updateBlankFormField('condicion', e.target.value)}
                          className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-hidden"
                        >
                          <option value="">-- Seleccionar --</option>
                          <option value="Dual">Dual (Con Instructor)</option>
                          <option value="Solo">Solo (Alumno)</option>
                          <option value="SPIC">SPIC</option>
                          <option value="Chequeo">Vuelo de Chequeo</option>
                        </select>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {/* Tarifa Aeronave */}
                      {!blankForm.sinDebitoAlumno && (
                        <div className="space-y-1">
                          <label className="font-bold text-slate-700 dark:text-slate-300">
                            Tarifa Aeronave ($/hr USD) {isDirector && <span className="text-rose-500">*</span>}
                          </label>
                          {isDirector ? (
                            <input
                              type="number"
                              step="0.01"
                              placeholder="220.00"
                              value={blankForm.tarifa}
                              onChange={(e) => updateBlankFormField('tarifa', e.target.value)}
                              className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-bold tabular-nums focus:ring-2 focus:ring-indigo-500 outline-hidden"
                            />
                          ) : (
                            <div className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-100 dark:bg-slate-800/70 text-slate-900 dark:text-white font-bold tabular-nums">
                              ${(parseFloat(String(blankForm.tarifa)) || 220).toFixed(2)} USD/hr
                            </div>
                          )}
                        </div>
                      )}

                      {/* Tarifa Honorario Instructor */}
                      <div className="space-y-1">
                        <label className="font-bold text-slate-700 dark:text-slate-300">
                          Tarifa Honorario CFI ($/hr USD)
                        </label>
                        <div className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-100 dark:bg-slate-800/70 text-slate-900 dark:text-white font-bold tabular-nums">
                          ${(parseFloat(String(blankForm.tarifaInstructor)) || 30).toFixed(2)} USD/hr
                        </div>
                      </div>
                    </div>

                    {blankForm.instructorId && !blankForm.sinDebitoAlumno && !isReadOnlyLogbook && (
                      <label className="flex items-center gap-2 text-[11px] font-medium text-indigo-700 dark:text-indigo-300 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={blankForm.crearHonorarioInstructor}
                          onChange={(e) => updateBlankFormField('crearHonorarioInstructor', e.target.checked)}
                          className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                        />
                        <span>Crear automáticamente honorario 1-a-1 para el instructor con esta bitácora</span>
                      </label>
                    )}
                  </div>
                </div>
              </div>

              {/* SECCIÓN 3: RUTA, TACÓMETRO Y TIEMPOS DE VUELO */}
              <div className="space-y-3">
                <div className="flex items-center justify-between pb-1 border-b border-slate-100 dark:border-slate-800">
                  <div className="flex items-center gap-2">
                    <Plane className="w-4 h-4 text-indigo-600" />
                    <h4 className="font-bold text-slate-800 dark:text-slate-200 uppercase text-[11px] tracking-wider">
                      3. Ruta, Tacómetro de Aeronave y Tiempos de Vuelo
                    </h4>
                  </div>
                  {!isInstructor && !panelIsSimulator && blankForm.matricula && (() => {
                    const liveTach = getLiveTachForAircraft(blankForm.matricula);
                    return liveTach !== undefined ? (
                      <span className="text-[11px] font-mono font-bold text-indigo-600 dark:text-indigo-400">
                        Tacómetro Taller: {liveTach.toFixed(1)} hrs
                      </span>
                    ) : null;
                  })()}
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {/* Origen */}
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <label className="font-bold text-slate-700 dark:text-slate-300">Origen</label>
                      <button
                        type="button"
                        onClick={() => updateBlankFormField('origen', 'MPMG')}
                        className="text-[10px] text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer"
                      >
                        MPMG
                      </button>
                    </div>
                    <input
                      type="text"
                      placeholder="MPMG"
                      value={blankForm.origen}
                      onChange={(e) => updateBlankFormField('origen', e.target.value.toUpperCase())}
                      className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-slate-900 dark:text-white uppercase font-bold focus:ring-2 focus:ring-indigo-500 outline-hidden text-center"
                    />
                  </div>

                  {/* Destino */}
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <label className="font-bold text-slate-700 dark:text-slate-300">Destino</label>
                      <button
                        type="button"
                        onClick={() => updateBlankFormField('destino', 'MPMG')}
                        className="text-[10px] text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer"
                      >
                        MPMG
                      </button>
                    </div>
                    <input
                      type="text"
                      placeholder="MPMG"
                      value={blankForm.destino}
                      onChange={(e) => updateBlankFormField('destino', e.target.value.toUpperCase())}
                      className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-slate-900 dark:text-white uppercase font-bold focus:ring-2 focus:ring-indigo-500 outline-hidden text-center"
                    />
                  </div>

                  {/* Calzo Salida */}
                  <div className="space-y-1">
                    <label className="font-bold text-slate-700 dark:text-slate-300">Hora Salida (Out)</label>
                    <input
                      type="text"
                      placeholder="08:00"
                      value={blankForm.horaSalida}
                      onChange={(e) => updateBlankFormField('horaSalida', e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-hidden text-center"
                    />
                  </div>

                  {/* Calzo Llegada */}
                  <div className="space-y-1">
                    <label className="font-bold text-slate-700 dark:text-slate-300">Hora Llegada (In)</label>
                    <input
                      type="text"
                      placeholder="09:30"
                      value={blankForm.horaLlegada}
                      onChange={(e) => updateBlankFormField('horaLlegada', e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-hidden text-center"
                    />
                  </div>
                </div>

                {/* Lecturas de Tacómetro (Sincronización Taller OMA) y Hobbs */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3 bg-indigo-50/40 dark:bg-indigo-950/20 border border-indigo-200/70 dark:border-indigo-900/50 rounded-2xl">
                  <div className="space-y-1">
                    <label className="font-bold text-indigo-800 dark:text-indigo-300 flex items-center gap-1">
                      <Gauge className="w-3.5 h-3.5" />
                      <span>Tacómetro Inicial</span>
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      placeholder="3420.5"
                      value={blankForm.tacometroInicial}
                      onChange={(e) => updateBlankFormField('tacometroInicial', e.target.value)}
                      className="w-full px-3 py-2 border border-indigo-200 dark:border-indigo-800 rounded-xl bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono font-bold text-center focus:ring-2 focus:ring-indigo-500 outline-hidden"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="font-bold text-indigo-800 dark:text-indigo-300 flex items-center gap-1">
                      <Gauge className="w-3.5 h-3.5" />
                      <span>
                        Tacómetro Final {!panelIsSimulator && <span className="text-rose-500">*</span>}
                      </span>
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      placeholder="3422.0"
                      value={blankForm.tacometroFinal}
                      onChange={(e) => updateBlankFormField('tacometroFinal', e.target.value)}
                      className="w-full px-3 py-2 border-2 border-indigo-400 dark:border-indigo-600 rounded-xl bg-white dark:bg-slate-800 text-indigo-950 dark:text-indigo-100 font-mono font-black text-center focus:ring-2 focus:ring-indigo-500 outline-hidden"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="font-bold text-slate-700 dark:text-slate-300">Hobbs Inicial</label>
                    <input
                      type="number"
                      step="0.1"
                      placeholder="1420.5"
                      value={blankForm.hobbsInicial}
                      onChange={(e) => updateBlankFormField('hobbsInicial', e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono font-bold text-center focus:ring-2 focus:ring-indigo-500 outline-hidden"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="font-bold text-slate-700 dark:text-slate-300">Hobbs Final</label>
                    <input
                      type="number"
                      step="0.1"
                      placeholder="1422.0"
                      value={blankForm.hobbsFinal}
                      onChange={(e) => updateBlankFormField('hobbsFinal', e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono font-bold text-center focus:ring-2 focus:ring-indigo-500 outline-hidden"
                    />
                  </div>
                </div>

                {/* Horas Totales Hobbs */}
                <div className="space-y-1">
                  <label className="font-bold text-indigo-700 dark:text-indigo-300 flex items-center justify-between">
                    <span>Total Horas Hobbs <span className="text-rose-500">*</span></span>
                    {Number(blankForm.horasTotal) > 0 && (
                      <span className="text-[11px] font-mono text-indigo-600 dark:text-indigo-400 font-bold">
                        {blankForm.horasTotal} hrs × 1.275 = {formatFormulaHours(panelHorasEstudiante)} hrs
                      </span>
                    )}
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="1.5"
                    value={blankForm.horasTotal}
                    onChange={(e) => updateBlankFormField('horasTotal', e.target.value)}
                    className="w-full px-3 py-2.5 border-2 border-indigo-400 dark:border-indigo-600 rounded-xl bg-indigo-50/20 dark:bg-indigo-950/30 text-indigo-950 dark:text-indigo-100 font-extrabold text-base focus:ring-2 focus:ring-indigo-500 outline-hidden text-center"
                  />
                </div>

                {/* Misión / Fase */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <label className="font-bold text-slate-700 dark:text-slate-300">
                      Misión / Fase de Instrucción
                    </label>
                    <div className="flex items-center gap-1.5 overflow-x-auto">
                      {['Maniobras', 'Tránsito', 'Navegación', 'Vuelo Solo', 'IFR'].map(sug => (
                        <button
                          key={sug}
                          type="button"
                          onClick={() => updateBlankFormField('mision', sug)}
                          className="px-2 py-0.5 bg-slate-100 dark:bg-slate-800 hover:bg-indigo-100 text-slate-600 dark:text-slate-300 hover:text-indigo-700 rounded-md text-[10px] font-medium transition-colors cursor-pointer"
                        >
                          {sug}
                        </button>
                      ))}
                    </div>
                  </div>
                  <input
                    type="text"
                    placeholder="Ej. Maniobras Básicas, Tránsito de Aeródromo y Toques y Despegues"
                    value={blankForm.mision}
                    onChange={(e) => updateBlankFormField('mision', e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-hidden"
                  />
                </div>
              </div>

              {/* SECCIÓN 4: PARÁMETROS ADICIONALES Y MANTENIMIENTO */}
              <div className="space-y-3">
                <div className="flex items-center gap-2 pb-1 border-b border-slate-100 dark:border-slate-800">
                  <Gauge className="w-4 h-4 text-indigo-600" />
                  <h4 className="font-bold text-slate-800 dark:text-slate-200 uppercase text-[11px] tracking-wider">
                    4. Operaciones y Mantenimiento Técnico (Taller OMA)
                  </h4>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {/* Aterrizajes */}
                  <div className="space-y-1">
                    <label className="font-bold text-slate-700 dark:text-slate-300">Aterrizajes</label>
                    <input
                      type="number"
                      placeholder="3"
                      value={blankForm.aterrizajes}
                      onChange={(e) => updateBlankFormField('aterrizajes', e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-hidden"
                    />
                  </div>

                  {/* Combustible */}
                  <div className="space-y-1">
                    <label className="font-bold text-slate-700 dark:text-slate-300">Combustible Cargado (Gal)</label>
                    <input
                      type="number"
                      step="0.1"
                      placeholder="15.0"
                      value={blankForm.combustibleGal}
                      onChange={(e) => updateBlankFormField('combustibleGal', e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-hidden"
                    />
                  </div>

                  {/* Aceite */}
                  <div className="space-y-1">
                    <label className="font-bold text-slate-700 dark:text-slate-300">Aceite Agregado (Qts)</label>
                    <input
                      type="number"
                      step="0.5"
                      placeholder="0"
                      value={blankForm.aceiteQts}
                      onChange={(e) => updateBlankFormField('aceiteQts', e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-hidden"
                    />
                  </div>
                </div>

                {/* Novedades */}
                <div className="space-y-1.5">
                  <label className="font-bold text-slate-700 dark:text-slate-300">
                    Novedades Técnicas / Reporte Mecánico
                  </label>
                  <input
                    type="text"
                    placeholder="Sin novedades mecánicas o reporte técnico de la aeronave..."
                    value={blankForm.novedades}
                    onChange={(e) => updateBlankFormField('novedades', e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-hidden"
                  />
                  {!panelIsSimulator && (
                    <label className="flex items-center gap-2 pt-1 text-[11px] font-medium text-amber-700 dark:text-amber-300 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={blankForm.reportarNovedadTaller}
                        onChange={(e) => updateBlankFormField('reportarNovedadTaller', e.target.checked)}
                        className="rounded border-slate-300 text-amber-600 focus:ring-amber-500"
                      />
                      <span>Reportar discrepancia directa al Taller (Squawk)</span>
                    </label>
                  )}
                </div>
              </div>

              {/* SECCIÓN 5: RESUMEN INTEGRAL (FÓRMULA HOBBS × 1.275 · ESTUDIANTE · INSTRUCTOR · TALLER) */}
              <div className="p-4 bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 rounded-2xl space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2 font-bold text-slate-800 dark:text-slate-200 text-xs">
                    <DollarSign className="w-4 h-4 text-indigo-600" />
                    <span>{isInstructor ? 'Resumen de Cobro y Honorarios' : 'Resumen de Cobro, Honorarios y Tacómetro Taller'}</span>
                  </div>
                  <span className="text-[11px] font-mono text-indigo-700 dark:text-indigo-300 font-bold">
                    {panelHoras} hrs Hobbs × 1.275 = {formatFormulaHours(panelHorasEstudiante)} hrs × ${panelTarifa.toFixed(2)} USD
                  </span>
                </div>

                <div className={`grid grid-cols-2 ${isInstructor ? 'sm:grid-cols-4' : 'sm:grid-cols-5'} gap-3`}>
                  <div className="p-3 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
                    <span className="text-[10px] text-slate-400 uppercase font-bold block">Horas Hobbs</span>
                    <span className="text-base font-black text-slate-900 dark:text-white">{panelHoras} hrs</span>
                  </div>

                  <div className="p-3 bg-sky-50 dark:bg-sky-950/40 rounded-xl border border-sky-200 dark:border-sky-800">
                    <span className="text-[10px] text-sky-700 dark:text-sky-300 uppercase font-extrabold block">Total Fórmula (×1.275)</span>
                    <span className="text-base font-black font-mono text-sky-800 dark:text-sky-200">
                      {formatFormulaHours(panelHorasEstudiante)} hrs
                    </span>
                  </div>

                  <div className="p-3 bg-rose-50 dark:bg-rose-950/40 rounded-xl border border-rose-200 dark:border-rose-900">
                    <span className="text-[10px] text-rose-600 dark:text-rose-400 uppercase font-extrabold block">Cobro a Estudiante</span>
                    <span className="text-base font-black text-rose-600 dark:text-rose-400">
                      {blankForm.sinDebitoAlumno ? '$0.00 USD' : `-$${panelDebitoTotal.toFixed(2)} USD`}
                    </span>
                  </div>

                  <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 rounded-xl border border-emerald-200 dark:border-emerald-900">
                    <span className="text-[10px] text-emerald-700 dark:text-emerald-400 uppercase font-bold block">Honorario Instructor</span>
                    <span className="text-base font-black text-emerald-700 dark:text-emerald-300">
                      +${panelHonorarioTotal.toFixed(2)} USD
                    </span>
                  </div>

                  {!isInstructor && (
                    <div className="p-3 bg-indigo-50 dark:bg-indigo-950/40 rounded-xl border border-indigo-200 dark:border-indigo-900">
                      <span className="text-[10px] text-indigo-600 dark:text-indigo-400 uppercase font-bold block">Tacómetro Taller</span>
                      <span className="text-base font-black font-mono text-indigo-700 dark:text-indigo-300">
                        {panelIsSimulator
                          ? 'Simulador'
                          : Number.isFinite(panelTachFinal) && panelTachFinal > 0
                          ? `${panelTachFinal.toFixed(1)} hrs`
                          : '—'}
                      </span>
                    </div>
                  )}
                </div>

                {!isInstructorAny && !blankForm.sinDebitoAlumno && panelSaldoResultante < 0 && blankForm.matchedStudent && (
                  <div className="p-2.5 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-xl text-amber-800 dark:text-amber-200 text-[11px] flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 shrink-0 text-amber-600" />
                    <span>
                      <strong>Saldo proyectado del estudiante:</strong> -${Math.abs(panelSaldoResultante).toFixed(2)} USD.
                    </span>
                  </div>
                )}
              </div>
              </fieldset>
            </div>

            {/* PIE DE ACCIONES DEL PANEL */}
            <div className="p-4 sm:p-5 border-t border-slate-100 dark:border-slate-800 bg-slate-50/90 dark:bg-slate-800/60 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
              {effectiveModalReadOnly ? (
                <>
                  <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 text-xs py-1">
                    <ShieldCheck className="w-4 h-4 text-sky-400 shrink-0" />
                    <span>
                      {isPanelReadOnly
                        ? 'Bitácora ya registrada y debitada.'
                        : 'Modo solo lectura. No se permiten modificaciones ni débitos.'}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsRegisterModalOpen(false)}
                    className="w-full sm:w-auto px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-white rounded-xl font-bold text-xs transition-colors cursor-pointer"
                  >
                    Cerrar Detalle
                  </button>
                </>
              ) : (
                <>
                  <div className="flex items-center gap-2 w-full sm:w-auto">
                    <button
                      type="button"
                      onClick={() => {
                        setBlankForm({
                          ...emptyLogbookForm,
                          instructorId: isInstructor ? currentUser.id : '',
                          instructorNombre: isInstructor ? currentUser.nombre : '',
                          tarifaInstructor: isInstructor && currentUser.tarifa_hora_dual ? Number(currentUser.tarifa_hora_dual).toFixed(2) : '30.00'
                        });
                        setBlankFormError(null);
                      }}
                      disabled={blankFormSaving}
                      className="px-3.5 py-2 bg-slate-200 hover:bg-slate-300 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 rounded-xl font-bold text-xs transition-colors cursor-pointer flex items-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed"
                      title="Restablecer todos los campos en blanco"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      <span>Limpiar Campos</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => !blankFormSaving && setIsRegisterModalOpen(false)}
                      disabled={blankFormSaving}
                      className="px-4 py-2 border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl font-bold text-xs transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      Cancelar
                    </button>
                  </div>

                  <div className="flex items-center gap-2 w-full sm:w-auto flex-wrap sm:flex-nowrap justify-end">
                    <button
                      type="button"
                      onClick={handleSaveAsDraftInSheet}
                      disabled={blankFormSaving}
                      className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 rounded-xl font-bold text-xs transition-colors cursor-pointer border border-slate-200 dark:border-slate-700 disabled:opacity-40 disabled:cursor-not-allowed"
                      title="Añade los datos al cuadro de bitácora técnica de vuelo"
                    >
                      Guardar en Cuadro como Borrador
                    </button>

                    <button
                      type="button"
                      id="btn-guardar-y-debitar-panel"
                      onClick={handleSaveAndDebitFromPanel}
                      disabled={blankFormSaving || !canPostDebit}
                      className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 active:scale-98 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl font-extrabold text-xs transition-all shadow-md hover:shadow-lg cursor-pointer flex items-center gap-2"
                    >
                      {blankFormSaving ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span>Sincronizando...</span>
                        </>
                      ) : (
                        <>
                          <CheckCircle2 className="w-4 h-4" />
                          <span>
                            {blankForm.sinDebitoAlumno
                              ? 'Registrar Bitácora y Honorario'
                              : blankForm.instructorId && blankForm.crearHonorarioInstructor
                              ? 'Guardar, Debitar y Crear Honorario'
                              : 'Guardar y Debitar Cuenta'}
                          </span>
                        </>
                      )}
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
