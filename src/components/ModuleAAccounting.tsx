import React, { useState, useEffect } from 'react';
import { User, Transaction, TransactionType, TransactionConcept, TransactionApprovalStatus, MorosidadReport } from '../types';
import { api } from '../services/api';
import { useLanguage } from '../i18n/LanguageContext';
import { BankVerificationModal } from './BankVerificationModal';
import { AchVoucherModal } from './AchVoucherModal';
import { ImageViewerModal } from './ImageViewerModal';
import { InternalAccountingMessagingModal } from './InternalAccountingMessagingModal';
import { StudentWhatsAppNoticeModal } from './StudentWhatsAppNoticeModal';
import { EmailSenderModal } from './EmailSenderModal';
import { generateBankReceiptSvgUrl } from '../utils/receiptGenerator';
import { StudentFlightHoursBillingBreakdown } from './StudentFlightHoursBillingBreakdown';
import { CardPaymentModal } from './CardPaymentModal';
import { PaymentLinkModal } from './PaymentLinkModal';
import { InstructorFeeManager } from './InstructorFeeManager';
import {
  Wallet,
  ArrowUpRight,
  ArrowDownLeft,
  FileText,
  UploadCloud,
  CheckCircle2,
  AlertTriangle,
  Download,
  PlusCircle,
  Search,
  Filter,
  DollarSign,
  Send,
  FileCheck,
  Building2,
  ShieldCheck,
  Clock,
  XCircle,
  Check,
  HelpCircle,
  Eye,
  MessageSquare,
  Share2,
  Printer,
  FileImage,
  ZoomIn,
  Mail,
  Phone,
  User as UserIcon,
  Sparkles,
  ExternalLink,
  UserCheck,
  Flame,
  Users,
  Plane,
  Calculator,
  ArrowRight,
  FileSpreadsheet,
  Layers,
  Trash2,
  RefreshCw,
  CreditCard,
  Link2
} from 'lucide-react';

interface ModuleAAccountingProps {
  currentUser: User;
  allUsers: User[];
  onRefreshData?: () => void;
}

const PRESET_CONCEPTS: TransactionConcept[] = [
  'Horas Bloque Vuelo',
  'Hora Instructor',
  'Matrícula',
  'Simulador de Vuelo',
  'Examen Práctico Oficial (Checkride)',
  'Manuales y Material Didáctico',
  'Seguro Aeronáutico',
  'Abono ACH',
  'Abono Tarjeta / Efectivo',
  'Otro'
];

const PRESET_BANKS = [
  'Banco General',
  'Banistmo',
  'BAC Credomatic',
  'Banco Nacional de Panamá',
  'Global Bank',
  'Caja de Ahorros',
  'Scotiabank',
  'Otro Banco'
];

export const ModuleAAccounting: React.FC<ModuleAAccountingProps> = ({
  currentUser,
  allUsers,
  onRefreshData
}) => {
  const { t } = useLanguage();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [morosidadList, setMorosidadList] = useState<MorosidadReport[]>([]);
  const [studentBalance, setStudentBalance] = useState<number>(0);
  const [pendingAbonos, setPendingAbonos] = useState<number>(0);
  const [pendingCount, setPendingCount] = useState<number>(0);
  const [loading, setLoading] = useState(true);

  // Modal de Verificación Bancaria para Contabilidad
  const [verifyingTx, setVerifyingTx] = useState<Transaction | null>(null);

  // Modal de Comprobante ACH (Visor, Descarga e Impresión)
  const [selectedVoucherTx, setSelectedVoucherTx] = useState<Transaction | null>(null);

  // Modal Visor de Imagen / Captura de Comprobante
  const [viewingImageTx, setViewingImageTx] = useState<Transaction | null>(null);

  // Modal de Mensajería Interna de Contabilidad
  const [showMessagingModal, setShowMessagingModal] = useState<boolean>(false);
  const [sharingVoucherTx, setSharingVoucherTx] = useState<Transaction | null>(null);
  const [unreadAccountingMessages, setUnreadAccountingMessages] = useState<number>(0);

  // Formulario Contable
  const [selectedStudentId, setSelectedStudentId] = useState<string>('');
  const [tipoTx, setTipoTx] = useState<TransactionType>('abono');
  const [concepto, setConcepto] = useState<TransactionConcept>('Horas Bloque Vuelo');
  const [monto, setMonto] = useState<string>('');
  const [referenciaAch, setReferenciaAch] = useState<string>('');
  const [bancoOrigen, setBancoOrigen] = useState<string>('Banco General');
  const [fecha, setFecha] = useState<string>(new Date().toISOString().split('T')[0]);
  const [notas, setNotas] = useState<string>('');
  const [attachedFileName, setAttachedFileName] = useState<string>('');
  const [attachedFileDataUrl, setAttachedFileDataUrl] = useState<string>('');
  const [dragActive, setDragActive] = useState<boolean>(false);
  const [formSuccessMessage, setFormSuccessMessage] = useState<string>('');
  const [formError, setFormError] = useState<string>('');
  
  // Estado de aprobación al crear (Contabilidad puede marcarlo comprobado de inmediato)
  const [isPreVerifiedInBank, setIsPreVerifiedInBank] = useState<boolean>(true);

  // Modal Reportar Pago ACH para Estudiante
  const [showReportAchModal, setShowReportAchModal] = useState<boolean>(false);
  const [achMonto, setAchMonto] = useState<string>('');
  const [achRef, setAchRef] = useState<string>('');
  const [achBanco, setAchBanco] = useState<string>('Banco General');
  const [achAttachedFile, setAchAttachedFile] = useState<string>('');
  const [achAttachedFileDataUrl, setAchAttachedFileDataUrl] = useState<string>('');

  // Modales de Pago con Tarjeta (Débito/Crédito) y Enlaces de Pago (Payment Links)
  const [showCardPaymentModal, setShowCardPaymentModal] = useState<boolean>(false);
  const [showPaymentLinkModal, setShowPaymentLinkModal] = useState<boolean>(false);

  // Vista activa para rol de Estudiante ('desglose_vuelos' por defecto para máxima transparencia financiera)
  const [studentViewTab, setStudentViewTab] = useState<'desglose_vuelos' | 'todos_movimientos'>('desglose_vuelos');

  // Vista activa de trabajo para Contabilidad / Admin
  const [accountingActiveTab, setAccountingActiveTab] = useState<'libro' | 'conciliacion' | 'nueva_tx' | 'morosidad' | 'bitacora' | 'honorarios'>('libro');
  const [pendingInstructorFeesCount, setPendingInstructorFeesCount] = useState<number>(0);

  // Estado para Contabilidad: Formulario Cargar Bitácora de Vuelo y Descuento de Saldo
  const [bitacoraStudentId, setBitacoraStudentId] = useState<string>('');
  const [bitacoraPilotoNombre, setBitacoraPilotoNombre] = useState<string>('');
  const [bitacoraMatricula, setBitacoraMatricula] = useState<string>('HP-1450');
  const [bitacoraHoras, setBitacoraHoras] = useState<string>('1.5');
  const [bitacoraTarifa, setBitacoraTarifa] = useState<string>('220.00');
  const [bitacoraTarifaInstructor, setBitacoraTarifaInstructor] = useState<string>('30.00');
  const [bitacoraFecha, setBitacoraFecha] = useState<string>(new Date().toISOString().split('T')[0]);
  const [bitacoraMision, setBitacoraMision] = useState<string>('Maniobras Básicas y Circuitos de Tránsito');
  const [bitacoraLeccionNum, setBitacoraLeccionNum] = useState<string>('1');
  const [bitacoraInstructorId, setBitacoraInstructorId] = useState<string>('');
  const [bitacoraFolio, setBitacoraFolio] = useState<string>('');
  const [bitacoraNotas, setBitacoraNotas] = useState<string>('');
  const [bitacoraSubmitting, setBitacoraSubmitting] = useState<boolean>(false);
  const [bitacoraSuccessMsg, setBitacoraSuccessMsg] = useState<string | null>(null);
  const [bitacoraErrorMsg, setBitacoraErrorMsg] = useState<string | null>(null);
  const [batchInstructorId, setBatchInstructorId] = useState<string>('');

  // Sub-modo de bitácora: 'lote' (reconocimiento y débito autónomo) vs 'individual' (carga manual)
  const [bitacoraSubTab, setBitacoraSubTab] = useState<'lote' | 'individual'>('lote');
  const [batchRawText, setBatchRawText] = useState<string>('');
  const [parsedBatchList, setParsedBatchList] = useState<any[]>([]);
  const [batchProcessing, setBatchProcessing] = useState<boolean>(false);
  const [batchDragActive, setBatchDragActive] = useState<boolean>(false);
  const [batchResultReport, setBatchResultReport] = useState<any | null>(null);

  // Filtros de búsqueda para tabla
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<string>('todos');
  const [filterStatus, setFilterStatus] = useState<string>('todos');

  // Modales de Notificación por WhatsApp y Correo
  const [studentForWhatsApp, setStudentForWhatsApp] = useState<{ user: User; balance: number } | null>(null);
  const [showWhatsAppModal, setShowWhatsAppModal] = useState<boolean>(false);
  const [studentForEmail, setStudentForEmail] = useState<{ user: User; initialSubject?: string; initialMessage?: string } | null>(null);
  const [showEmailModal, setShowEmailModal] = useState<boolean>(false);

  // Filtro y búsqueda en reporte de morosidad
  const [morosidadFilter, setMorosidadFilter] = useState<'todos' | 'morosos' | 'proximos' | 'solventes'>('todos');
  const [morosidadSearch, setMorosidadSearch] = useState<string>('');

  const isStudent = currentUser.rol === 'estudiante';
  const isAccounting = currentUser.rol === 'contabilidad';
  const isAdmin = currentUser.rol === 'admin';
  const isEscuela = currentUser.rol === 'escuela';
  // Restricción estricta: Únicamente roles administrativos pueden registrar y procesar bitácoras y débitos
  const canPostTransactions = isAccounting || isAdmin || isEscuela;

  const studentsList = allUsers.filter(u => u.rol === 'estudiante');

  // Helper para obtener estatus financiero de un estudiante
  const getStudentFinancialInfo = (studentId: string) => {
    const user = allUsers.find(u => u.id === studentId);
    const m = morosidadList.find(item => item.estudiante_id === studentId);
    const bal = m ? m.saldo_actual : 0;
    const isNegative = bal < 0;
    const isNearExhausted = bal >= 0 && bal < 250;
    const isSolvent = bal >= 250;
    return {
      user,
      balance: bal,
      isNegative,
      isNearExhausted,
      isSolvent,
      diasMora: m?.dias_mora || 0,
      ultimoPago: m?.ultimo_pago_fecha,
      bloqueadoParaVolar: m?.bloqueado_para_volar || isNegative
    };
  };

  const handleOpenWhatsAppNotice = (targetUser: User, balance: number) => {
    setStudentForWhatsApp({ user: targetUser, balance });
    setShowWhatsAppModal(true);
  };

  const handleOpenEmailNotice = (targetUser: User, balance: number) => {
    const absBal = Math.abs(balance).toFixed(2);
    const isNeg = balance < 0;
    const subject = isNeg 
      ? `⚠️ Aviso de Saldo Deudor (-$${absBal} USD) - SkyOps Contabilidad`
      : balance < 250
      ? `⚠️ Saldo Próximo a Agotarse ($${balance.toFixed(2)} USD) - SkyOps Contabilidad`
      : `💳 Estado de Cuenta Oficial - SkyOps Flight Academy`;

    const message = isNeg
      ? `Estimado/a ${targetUser.nombre},\n\nLe saludamos del departamento de Contabilidad y Tesorería de SkyOps Flight Academy.\n\nLe informamos que su cuenta registra un saldo pendiente de -$${absBal} USD. Para garantizar la continuidad de sus misiones de vuelo en el simulador y aeronaves, le solicitamos regularizar este balance a la brevedad.\n\nDatos bancarios para transferencia ACH:\n• Banco General de Panamá\n• Cuenta Corriente No. 03-72-01-123456-7\n• Beneficiario: SkyOps Aviation S.A.\n\nFavor reportar su comprobante de pago en la plataforma una vez efectuada la transferencia.\n\nAtentamente,\nDepartamento de Contabilidad y Finanzas SkyOps`
      : balance < 250
      ? `Hola ${targetUser.nombre},\n\nTe notificamos que tu saldo disponible de horas de vuelo es de $${balance.toFixed(2)} USD (estimado para menos de 1.5 horas de instrucción).\n\nTe recomendamos realizar un abono de horas bloque con anticipación para asegurar que tus próximos vuelos programados en el itinerario no se vean pausados por falta de saldo.\n\nCuentas ACH:\n• Banco General - Cta. Cte. 03-72-01-123456-7 (SkyOps Aviation S.A.)\n\n¡Quedamos a la orden para cualquier consulta!\nContabilidad SkyOps`
      : `Estimado/a ${targetUser.nombre},\n\nLe compartimos la actualización de su estado de cuenta en SkyOps Flight Academy con un saldo oficial acreditado de $${balance.toFixed(2)} USD.\n\nAtentamente,\nContabilidad SkyOps`;

    setStudentForEmail({ user: targetUser, initialSubject: subject, initialMessage: message });
    setShowEmailModal(true);
  };

  const loadData = async () => {
    if (currentUser.rol === 'instructor') {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      if (isStudent) {
        const [txs, balanceDetails] = await Promise.all([
          api.getTransactions(currentUser.id),
          api.getStudentBalanceDetails(currentUser.id)
        ]);
        setTransactions(txs);
        setStudentBalance(balanceDetails.balance || 0);
        setPendingAbonos(balanceDetails.totalPendingAbonos || 0);
        setPendingCount(balanceDetails.count || 0);
      } else {
        const [txs, morosos, internalMsgs, feeStmts] = await Promise.all([
          api.getTransactions(),
          api.getMorosidadReport(),
          api.getAccountingMessages(currentUser.id),
          api.getInstructorFees().catch(() => [])
        ]);
        setTransactions(txs);
        setMorosidadList(morosos);
        const unread = internalMsgs.filter(m => !m.leido && m.destinatario_id === currentUser.id).length;
        setUnreadAccountingMessages(unread);
        const pendingFees = feeStmts.filter(s => s.estado === 'enviado_contabilidad').length;
        setPendingInstructorFeesCount(pendingFees);
      }
    } catch (err) {
      console.error('Error al cargar datos contables:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    if (studentsList.length > 0 && !selectedStudentId) {
      setSelectedStudentId(studentsList[0].id);
      if (!bitacoraPilotoNombre) {
        setBitacoraPilotoNombre(studentsList[0].nombre);
      }
    }
  }, [currentUser]);

  const handleOpenShareModal = (tx: Transaction) => {
    setSharingVoucherTx(tx);
    setShowMessagingModal(true);
  };


  const handleFileUpload = (file: File) => {
    setAttachedFileName(file.name);
    const reader = new FileReader();
    reader.onload = (e) => {
      if (e.target?.result) {
        setAttachedFileDataUrl(e.target.result as string);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileUpload(e.dataTransfer.files[0]);
    }
  };

  const handleSubmitTransaction = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    setFormSuccessMessage('');

    if (!selectedStudentId) {
      setFormError('Por favor selecciona un alumno');
      return;
    }
    const numMonto = parseFloat(monto);
    if (isNaN(numMonto) || numMonto <= 0) {
      setFormError('Por favor ingresa un monto numérico positivo');
      return;
    }
    if (!referenciaAch.trim()) {
      setFormError('El número de referencia / comprobante es obligatorio');
      return;
    }

    try {
      const statusToSet: TransactionApprovalStatus = isPreVerifiedInBank ? 'aprobado' : 'pendiente_revision_bancaria';
      const studentObj = studentsList.find(s => s.id === selectedStudentId);
      const studentName = studentObj ? studentObj.nombre : 'Estudiante';

      const finalAdjunto = attachedFileDataUrl || generateBankReceiptSvgUrl({
        banco: bancoOrigen,
        monto: numMonto,
        referencia: referenciaAch,
        estudiante: studentName,
        fecha,
        concepto
      });

      await api.createTransaction({
        estudiante_id: selectedStudentId,
        fecha,
        tipo: tipoTx,
        concepto,
        monto: numMonto,
        referencia_ach: referenciaAch,
        banco_origen: bancoOrigen,
        archivo_nombre: attachedFileName || `Comprobante_${referenciaAch}.jpg`,
        archivo_adjunto: finalAdjunto,
        creado_por: `${currentUser.nombre} (${isAccounting ? 'Contabilidad' : 'Administración'})`,
        notas,
        estado_aprobacion: statusToSet,
        comprobado_banco: isPreVerifiedInBank,
        referencia_bancaria_confirmada: isPreVerifiedInBank ? referenciaAch : undefined,
        verificado_por: isPreVerifiedInBank ? `${currentUser.nombre} (Contabilidad)` : undefined,
        notas_bancarias: isPreVerifiedInBank ? `Comprobado en extracto bancario ${bancoOrigen} al momento del registro.` : undefined
      });

      setFormSuccessMessage(
        isPreVerifiedInBank
          ? `Transacción de $${numMonto.toFixed(2)} (${tipoTx.toUpperCase()}) registrada y ACREDITADA formalmente tras comprobación bancaria.`
          : `Transacción de $${numMonto.toFixed(2)} registrada en cola PENDIENTE de comprobación bancaria.`
      );
      setMonto('');
      setReferenciaAch('');
      setNotas('');
      setAttachedFileName('');
      setAttachedFileDataUrl('');
      loadData();
      if (onRefreshData) onRefreshData();
    } catch (err: any) {
      setFormError(err.message || 'Error al guardar la transacción');
    }
  };

  const handleMatriculaBitacoraChange = (matricula: string) => {
    setBitacoraMatricula(matricula);
    const rates: Record<string, string> = {
      'HP-1450': '220.00',
      'HP-1588': '220.00',
      'HP-1822': '340.00',
      'HP-1799': '220.00',
      'HP-1934': '220.00',
      'SIM-ALX': '120.00'
    };
    if (rates[matricula]) {
      setBitacoraTarifa(rates[matricula]);
    }
  };

  const handleSubmitFlightBitacora = async (e: React.FormEvent) => {
    e.preventDefault();
    setBitacoraErrorMsg(null);
    setBitacoraSuccessMsg(null);

    const targetStudentId = bitacoraStudentId || selectedStudentId || (studentsList[0]?.id);
    if (!targetStudentId) {
      setBitacoraErrorMsg('Por favor seleccione un estudiante.');
      return;
    }

    const targetStudent = studentsList.find(s => s.id === targetStudentId);
    if (!targetStudent) {
      setBitacoraErrorMsg('Estudiante no encontrado.');
      return;
    }

    const pilotoNombreFinal = targetStudent.nombre;

    const horas = parseFloat(bitacoraHoras);
    const tarifa = parseFloat(bitacoraTarifa);
    const tarifaCfi = parseFloat(bitacoraTarifaInstructor) || 30.0;
    if (isNaN(horas) || horas <= 0) {
      setBitacoraErrorMsg('Ingrese una cantidad de horas válida mayor a 0.');
      return;
    }
    if (isNaN(tarifa) || tarifa <= 0) {
      setBitacoraErrorMsg('Ingrese una tarifa horaria válida.');
      return;
    }

    const studentBillableHoras = Number((horas * 1.275).toFixed(4));
    const calculatedMonto = Number((studentBillableHoras * tarifa).toFixed(2));
    const selectedInstructor = bitacoraInstructorId
      ? allUsers.find(u => u.id === bitacoraInstructorId && (u.rol === 'instructor' || u.rol === 'admin'))
      : undefined;
    const instructorName = selectedInstructor ? selectedInstructor.nombre : 'Vuelo Solo / Sin CFI';
    const aircraftMap: Record<string, string> = {
      'HP-1450': 'Cessna 172 Skyhawk',
      'HP-1588': 'Cessna 172SP Garmin G1000',
      'HP-1822': 'Piper PA-44 Seminole',
      'HP-1799': 'Piper PA-28 Archer III',
      'SIM-ALX': 'Simulador Alsim ALX'
    };
    const modeloAvion = aircraftMap[bitacoraMatricula] || 'Aeronave Escuela';
    const refFolio = bitacoraFolio.trim() ? bitacoraFolio.trim() : `BITACORA-FL-${bitacoraFecha.replace(/-/g, '')}-${Math.floor(100 + Math.random() * 900)}`;

    setBitacoraSubmitting(true);
    try {
      const newTx = await api.createTransaction({
        estudiante_id: targetStudent.id,
        estudiante_nombre: targetStudent.nombre,
        fecha: bitacoraFecha,
        tipo: 'cargo',
        concepto: 'Horas Bloque Vuelo',
        monto: calculatedMonto,
        referencia_ach: refFolio,
        creado_por: `${currentUser.nombre} (${isAccounting ? 'Contabilidad' : 'Administración'})`,
        notas: `${horas} hrs Hobbs × 1.275 = ${studentBillableHoras} hrs en ${modeloAvion} (${bitacoraMatricula}) @ $${tarifa}/hr según Bitácora #${refFolio}. Piloto: ${pilotoNombreFinal}. ${bitacoraNotas}`.trim(),
        estado_aprobacion: 'aprobado',
        comprobado_banco: true,
        fecha_verificacion_bancaria: new Date().toISOString(),
        verificado_por: `${currentUser.nombre} (Administración)`,
        notas_bancarias: `Liquidación de bitácora de vuelo formalizada por Administración. Folio ${refFolio}.`,
        horas_vuelo: studentBillableHoras,
        horas_hobbs: horas,
        factor_cobro_estudiante: 1.275,
        tarifa_hora: tarifa,
        matricula_avion: bitacoraMatricula,
        modelo_avion: modeloAvion,
        instructor_nombre: instructorName,
        leccion_num: parseInt(bitacoraLeccionNum, 10) || 1,
        tipo_mision: bitacoraMision,
        saldo_anterior: undefined
      });

      let honorarioNotice = '';
      if (selectedInstructor) {
        try {
          const createdFee = await api.registerBitacoraHonorario({
            folio_bitacora: refFolio,
            fecha: bitacoraFecha,
            matricula_avion: bitacoraMatricula,
            modelo_avion: modeloAvion,
            estudiante_id: targetStudent.id,
            estudiante_nombre: targetStudent.nombre,
            piloto_id: targetStudent.id,
            piloto_nombre: targetStudent.nombre,
            instructor_id: selectedInstructor.id,
            horas_vuelo: horas,
            tarifa_instructor_hora: tarifaCfi,
            tipo_mision: bitacoraMision || 'Instrucción de Vuelo',
            origen: 'MPMG',
            destino: 'MPMG',
            observaciones: bitacoraNotas || undefined,
            aplicar_debito_estudiante: false,
            tarifa_aeronave_hora: tarifa,
            bitacora_transaction_id: newTx.id,
            registrado_por_id: currentUser.id,
            registrado_por_nombre: currentUser.nombre,
            registrado_por_rol: currentUser.rol
          });
          honorarioNotice = ` Honorario ${createdFee.id} creado para ${createdFee.instructor_nombre} (Estudiante: ${createdFee.estudiante_nombre || targetStudent.nombre}) por $${createdFee.total_neto.toFixed(2)} USD.`;
        } catch (feeErr: any) {
          honorarioNotice = ` Nota honorario: ${feeErr?.message || 'ya existía para ese folio'}.`;
        }
      }

      setBitacoraSuccessMsg(`¡Bitácora registrada y liquidada! Se descontaron -$${calculatedMonto.toFixed(2)} USD del saldo de ${targetStudent.nombre}. Saldo resultante: $${newTx.saldo_resultante.toFixed(2)} USD.${honorarioNotice}`);
      setBitacoraFolio('');
      setBitacoraNotas('');
      await loadData();
      if (onRefreshData) onRefreshData();
    } catch (err: any) {
      setBitacoraErrorMsg(err.message || 'Error al registrar bitácora de vuelo');
    } finally {
      setBitacoraSubmitting(false);
    }
  };

  // AUTONOMOUS FLIGHT LOGBOOK RECOGNITION & BATCH PROCESSOR
  const FLEET_INFO: Record<string, { model: string; rate: number }> = {
    'HP-1450': { model: 'Cessna 172 Skyhawk', rate: 220.00 },
    'HP-1588': { model: 'Cessna 172SP Garmin G1000', rate: 220.00 },
    'HP-1822': { model: 'Piper PA-44 Seminole Multi-Motor', rate: 340.00 },
    'HP-1799': { model: 'Piper PA-28 Archer III', rate: 220.00 },
    'HP-1934': { model: 'Piper PA-28 Cherokee', rate: 220.00 },
    'SIM-ALX': { model: 'Simulador Alsim ALX', rate: 120.00 },
  };

  const normalizeStr = (str: string) =>
    str.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();

  const parseLogbookLines = (text: string) => {
    if (!text.trim()) {
      setParsedBatchList([]);
      return;
    }

    const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);
    const parsed: any[] = [];

    lines.forEach((line, index) => {
      // Ignorar cabecera si existe
      const lower = line.toLowerCase();
      if (lower.includes('matricula') || lower.includes('estudiante') || (lower.includes('fecha') && lower.includes('horas'))) {
        return;
      }

      const delimiter = line.includes('\t') ? '\t' : line.includes(';') ? ';' : line.includes('|') ? '|' : ',';
      const parts = line.split(delimiter).map(p => p.trim());

      let matricula = '';
      let estudianteStr = '';
      let horas = 1.0;
      let fecha = new Date().toISOString().split('T')[0];
      let mision = 'Entrenamiento de Vuelo';
      let folio = `BIT-${fecha.replace(/-/g, '')}-${index + 100}`;
      let hobbsIni: number | undefined = undefined;
      let hobbsFin: number | undefined = undefined;

      // Buscar matrícula
      for (const p of parts) {
        const matMatch = p.match(/(HP-\d{4}|SIM-[A-Z0-9]+)/i);
        if (matMatch) {
          matricula = matMatch[1].toUpperCase();
          break;
        }
      }
      if (!matricula) {
        matricula = 'HP-1450';
      }

      // Buscar fecha
      for (const p of parts) {
        const dateMatch = p.match(/\d{4}-\d{2}-\d{2}/) || p.match(/\d{2}\/\d{2}\/\d{4}/);
        if (dateMatch) {
          if (dateMatch[0].includes('/')) {
            const [d, m, y] = dateMatch[0].split('/');
            fecha = `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
          } else {
            fecha = dateMatch[0];
          }
          break;
        }
      }

      // Buscar horas o lectura Hobbs (ej: 124.5 - 126.0)
      for (const p of parts) {
        const hobbsMatch = p.match(/(\d+\.?\d*)\s*[-a]\s*(\d+\.?\d*)/);
        if (hobbsMatch && parseFloat(hobbsMatch[2]) > parseFloat(hobbsMatch[1])) {
          hobbsIni = parseFloat(hobbsMatch[1]);
          hobbsFin = parseFloat(hobbsMatch[2]);
          horas = Number((hobbsFin - hobbsIni).toFixed(1));
          break;
        }
        const hMatch = p.match(/^(\d+\.?\d*)\s*(hrs?|horas?)?$/i);
        if (hMatch && !p.includes('-') && !p.includes('/') && parseFloat(hMatch[1]) < 24) {
          horas = parseFloat(hMatch[1]);
          break;
        }
      }

      // Buscar estudiante
      for (const p of parts) {
        if (p === matricula || p === fecha || p.match(/^(\d+\.?\d*)\s*(hrs?|horas?)?$/i) || p.includes('Hobbs') || p.includes('BIT-') || p.includes('FOLIO')) {
          continue;
        }
        const normP = normalizeStr(p);
        const match = studentsList.find(s => {
          const sNorm = normalizeStr(s.nombre);
          return sNorm === normP || sNorm.includes(normP) || normP.includes(sNorm) || s.id.toLowerCase() === normP;
        });
        if (match) {
          estudianteStr = match.nombre;
          break;
        }
        if (p.length > 3 && !estudianteStr && !p.startsWith('HP-')) {
          estudianteStr = p;
        }
      }

      // Buscar folio
      for (const p of parts) {
        if (p.toLowerCase().includes('folio') || p.toLowerCase().includes('bit-') || p.match(/^[A-Z0-9]{3,12}-\d+$/i)) {
          folio = p;
          break;
        }
      }

      // Buscar misión
      for (const p of parts) {
        if (p !== matricula && p !== fecha && p !== estudianteStr && p !== folio && !p.match(/^\d+\.?\d*$/)) {
          if (p.length > 5 && !p.toLowerCase().includes('hobbs')) {
            mision = p;
            break;
          }
        }
      }

      // Matching con base de datos de estudiantes
      const normQuery = normalizeStr(estudianteStr);
      const matchedStudent = studentsList.find(s => {
        const sNorm = normalizeStr(s.nombre);
        return sNorm === normQuery || sNorm.includes(normQuery) || normQuery.includes(sNorm) || s.id.toLowerCase() === normQuery;
      });

      const fleetData = FLEET_INFO[matricula] || { model: 'Aeronave Escuela', rate: 220.00 };
      const tarifa = fleetData.rate;
      const horasFacturablesEstudiante = Number((horas * 1.275).toFixed(4));
      const cargoEstimado = Number((horasFacturablesEstudiante * tarifa).toFixed(2));

      let saldoAnterior = 0;
      let saldoResultante = 0;
      if (matchedStudent) {
        const finInfo = getStudentFinancialInfo(matchedStudent.id);
        saldoAnterior = finInfo.balance;
        saldoResultante = Number((saldoAnterior - cargoEstimado).toFixed(2));
      }

      // Detección de posible duplicado
      const isDuplicate = transactions.some(t =>
        t.tipo === 'cargo' &&
        t.fecha === fecha &&
        (t.estudiante_id === matchedStudent?.id || t.referencia_ach === folio)
      );

      parsed.push({
        id: `entry-${index}-${Date.now()}`,
        matricula,
        modelo_avion: fleetData.model,
        fecha,
        estudiante_busqueda: estudianteStr || 'No especificado',
        matchedStudent,
        horas_vuelo: horas,
        tarifa_hora: tarifa,
        cargo_estimado: cargoEstimado,
        saldo_anterior: saldoAnterior,
        saldo_resultante: saldoResultante,
        mision,
        folio,
        hobbs_inicial: hobbsIni,
        hobbs_final: hobbsFin,
        esValido: !!matchedStudent && horas > 0,
        motivoInvalido: !matchedStudent ? 'Alumno no identificado en la base de datos' : horas <= 0 ? 'Horas inválidas' : undefined,
        advertenciaDuplicado: isDuplicate
      });
    });

    setParsedBatchList(parsed);
  };

  const handleRawTextChange = (text: string) => {
    setBatchRawText(text);
    parseLogbookLines(text);
  };

  const handleLoadSampleBatch = () => {
    const s1 = studentsList[0]?.nombre || 'Carlos Mendoza';
    const s2 = studentsList[1]?.nombre || 'Ana Castillo';
    const s3 = studentsList[2]?.nombre || studentsList[0]?.nombre || 'Roberto Gómez';
    const today = new Date().toISOString().split('T')[0];

    const sample = `Fecha, Matrícula, Estudiante, Horas, Misión, Folio
${today}, HP-1450, ${s1}, 1.5, Maniobras y Circuitos de Tránsito, BIT-FL-${today.replace(/-/g, '')}-101
${today}, HP-1822, ${s2}, 2.0, Vuelo por Instrumentos IFR y Aproximaciones, BIT-FL-${today.replace(/-/g, '')}-102
${today}, HP-1588, ${s3}, 1.2, Navegación de Travesía VFR, BIT-FL-${today.replace(/-/g, '')}-103`;

    setBatchRawText(sample);
    parseLogbookLines(sample);
  };

  const handleBatchFileDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setBatchDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      const reader = new FileReader();
      reader.onload = (event) => {
        const content = event.target?.result as string;
        if (content) {
          handleRawTextChange(content);
        }
      };
      reader.readAsText(file);
    }
  };

  const handleBatchFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const reader = new FileReader();
      reader.onload = (event) => {
        const content = event.target?.result as string;
        if (content) {
          handleRawTextChange(content);
        }
      };
      reader.readAsText(file);
    }
  };

  const handleRemoveBatchItem = (id: string) => {
    setParsedBatchList(prev => prev.filter(item => item.id !== id));
  };

  const handleExecuteBatchDebit = async () => {
    const validEntries = parsedBatchList.filter(e => e.esValido && e.matchedStudent);
    if (validEntries.length === 0) {
      setBitacoraErrorMsg('No hay vuelos válidos con alumnos reconocidos para procesar.');
      return;
    }

    setBatchProcessing(true);
    setBitacoraErrorMsg(null);
    setBitacoraSuccessMsg(null);

    try {
      const selectedBatchInst = batchInstructorId
        ? allUsers.find(u => u.id === batchInstructorId && (u.rol === 'instructor' || u.rol === 'admin'))
        : undefined;

      const payloadEntries = validEntries.map(e => ({
        matricula: e.matricula,
        estudiante_identificador: e.matchedStudent.id,
        estudiante_id: e.matchedStudent.id,
        estudiante_nombre: e.matchedStudent.nombre,
        horas_vuelo: e.horas_vuelo,
        fecha: e.fecha,
        tarifa_hora: e.tarifa_hora,
        tarifa_instructor_hora: parseFloat(bitacoraTarifaInstructor) || 30.0,
        folio: e.folio,
        mision: e.mision,
        hobbs_inicial: e.hobbs_inicial,
        hobbs_final: e.hobbs_final,
        instructor_id: selectedBatchInst?.id,
        instructor_nombre: selectedBatchInst?.nombre
      }));

      const res = await api.processAircraftLogbookBatch({
        entries: payloadEntries,
        uploaded_by: `${currentUser.nombre} (${isAccounting ? 'Contabilidad' : 'Administración'})`
      });

      setBatchResultReport(res);
      setBitacoraSuccessMsg(
        `¡Bitácoras de aeronaves procesadas! Se liquidaron ${res.totalProcessed} vuelos (-$${res.totalDebited.toLocaleString('en-US', { minimumFractionDigits: 2 })} USD).${selectedBatchInst ? ` Se generaron honorarios 1-a-1 para ${selectedBatchInst.nombre}.` : ''}`
      );
      setParsedBatchList([]);
      setBatchRawText('');
      await loadData();
      if (onRefreshData) onRefreshData();
    } catch (err: any) {
      setBitacoraErrorMsg(err.message || 'Error al procesar lote de bitácoras de aeronaves');
    } finally {
      setBatchProcessing(false);
    }
  };

  const handleReportPaymentFromStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    const numMonto = parseFloat(achMonto);
    if (isNaN(numMonto) || numMonto <= 0) {
      alert('Ingresa un monto válido');
      return;
    }
    if (!achRef.trim()) {
      alert('Ingresa el número de confirmación o slip ACH');
      return;
    }

    try {
      const generatedRef = `ACH-${achBanco.toUpperCase().substring(0, 3)}-${achRef}`;
      const finalAdjunto = achAttachedFileDataUrl || generateBankReceiptSvgUrl({
        banco: achBanco,
        monto: numMonto,
        referencia: generatedRef,
        estudiante: currentUser.nombre,
        fecha: new Date().toISOString().split('T')[0],
        concepto: 'Abono ACH'
      });

      await api.createTransaction({
        estudiante_id: currentUser.id,
        fecha: new Date().toISOString().split('T')[0],
        tipo: 'abono',
        concepto: 'Abono ACH',
        monto: numMonto,
        referencia_ach: generatedRef,
        banco_origen: achBanco,
        archivo_nombre: achAttachedFile || `Comprobante_Pago_${achRef}.jpg`,
        archivo_adjunto: finalAdjunto,
        creado_por: `Reportado por Alumno: ${currentUser.nombre}`,
        notas: `Transferencia desde ${achBanco}. Requiere comprobación en sistema bancario por Contabilidad.`,
        estado_aprobacion: 'pendiente_revision_bancaria',
        comprobado_banco: false
      });

      setShowReportAchModal(false);
      setAchMonto('');
      setAchRef('');
      setAchAttachedFile('');
      setAchAttachedFileDataUrl('');
      alert('¡Comprobante de pago ACH reportado con éxito! Ha sido enviado a la bandeja de Contabilidad para cotejar con el extracto bancario antes de acreditar tu saldo.');
      loadData();
    } catch (err: any) {
      alert('Error al reportar pago: ' + err.message);
    }
  };

  const handleApproveBank = async (txId: string, verificadoPor: string, notasBancarias?: string, refConfirmada?: string, montoConfirmado?: number) => {
    await api.approveTransaction(txId, verificadoPor, notasBancarias, refConfirmada, montoConfirmado);
    loadData();
    if (onRefreshData) onRefreshData();
  };

  const handleRejectBank = async (txId: string, verificadoPor: string, motivo: string) => {
    await api.rejectTransaction(txId, verificadoPor, motivo);
    loadData();
    if (onRefreshData) onRefreshData();
  };

  // Filtrado de transacciones
  const pendingTransactionsList = transactions.filter(t => t.estado_aprobacion === 'pendiente_revision_bancaria');

  const filteredTransactions = transactions.filter(t => {
    const matchesSearch =
      (t.estudiante_nombre && t.estudiante_nombre.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (t.concepto && t.concepto.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (t.referencia_ach && t.referencia_ach.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (t.banco_origen && t.banco_origen.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesType =
      filterType === 'todos' ||
      (filterType === 'abono' && t.tipo === 'abono') ||
      (filterType === 'cargo' && t.tipo === 'cargo');

    const matchesStatus =
      filterStatus === 'todos' ||
      (filterStatus === 'aprobado' && t.estado_aprobacion === 'aprobado') ||
      (filterStatus === 'pendiente' && t.estado_aprobacion === 'pendiente_revision_bancaria') ||
      (filterStatus === 'rechazado' && t.estado_aprobacion === 'rechazado');

    return matchesSearch && matchesType && matchesStatus;
  });

  const exportToCSV = () => {
    const headers = [
      'ID',
      'Fecha',
      'Estudiante',
      'Tipo',
      'Concepto',
      'Monto ($)',
      'Banco',
      'Referencia ACH',
      'Estado Conciliación Bancaria',
      'Comprobado en Banco',
      'Saldo Resultante Acreditado ($)',
      'Verificado Por'
    ];
    const rows = filteredTransactions.map(t => [
      t.id,
      t.fecha,
      t.estudiante_nombre || currentUser.nombre,
      t.tipo.toUpperCase(),
      `"${t.concepto}"`,
      t.monto.toFixed(2),
      `"${t.banco_origen || 'N/A'}"`,
      t.referencia_ach,
      t.estado_aprobacion.toUpperCase(),
      t.comprobado_banco ? 'SI' : 'NO',
      t.saldo_resultante.toFixed(2),
      `"${t.verificado_por || t.creado_por}"`
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Estado_de_Cuenta_Conciliado_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Estadísticas y métricas compactas para Contabilidad / Admin
  const totalApprovedAbonos = transactions
    .filter(t => t.tipo === 'abono' && t.estado_aprobacion === 'aprobado')
    .reduce((acc, t) => acc + t.monto, 0);

  const totalApprovedCargos = transactions
    .filter(t => t.tipo === 'cargo' && t.estado_aprobacion === 'aprobado')
    .reduce((acc, t) => acc + t.monto, 0);

  const totalPendingAchAmount = pendingTransactionsList.reduce((acc, t) => acc + t.monto, 0);

  const totalDeudaMorosidad = morosidadList
    .filter(m => m.saldo_actual < 0)
    .reduce((acc, m) => acc + Math.abs(m.saldo_actual), 0);

  const totalAlumnosMorosos = morosidadList.filter(m => m.saldo_actual < 0).length;
  const totalAlumnosProximos = morosidadList.filter(m => m.saldo_actual >= 0 && m.saldo_actual < 250).length;
  const totalAlumnosSolventes = morosidadList.filter(m => m.saldo_actual >= 250).length;

  if (currentUser.rol === 'instructor') {
    return (
      <div className="bg-white p-8 rounded-2xl border border-rose-200 shadow-sm text-center max-w-lg mx-auto my-12 space-y-4">
        <div className="w-16 h-16 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto">
          <ShieldCheck className="w-8 h-8 text-rose-600" />
        </div>
        <h3 className="text-lg font-bold text-slate-800">Acceso Restringido a Contabilidad</h3>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Top Banner / Header Compacto */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-sky-950 text-white p-3.5 sm:p-4 rounded-2xl shadow-xs border border-slate-700/80">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-sky-500/10 border border-sky-400/20 flex items-center justify-center flex-shrink-0 text-sky-400">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-base sm:text-lg font-bold text-white tracking-tight">
                {isStudent ? 'Mi Estado de Cuenta y Finanzas' : 'Centro de Control Contable y Tesorería'}
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap flex-shrink-0">
            {canPostTransactions && (
              <button
                id="btn-internal-accounting-messaging"
                onClick={() => {
                  setSharingVoucherTx(null);
                  setShowMessagingModal(true);
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-sky-300 text-xs font-bold rounded-xl border border-slate-600 shadow-xs transition-all cursor-pointer relative"
                title="Mensajería interna entre usuarios de contabilidad para coordinar comprobantes"
              >
                <MessageSquare className="w-3.5 h-3.5 text-sky-400" />
                <span>Mensajería Contable</span>
                {unreadAccountingMessages > 0 ? (
                  <span className="px-1.5 py-0.2 rounded-full bg-rose-500 text-white font-extrabold text-[10px] animate-bounce">
                    {unreadAccountingMessages}
                  </span>
                ) : (
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                )}
              </button>
            )}

            {canPostTransactions && (
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  id="btn-conta-card-pay"
                  onClick={() => setShowCardPaymentModal(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold rounded-xl shadow-xs transition-all cursor-pointer"
                  title="Cobrar con tarjeta de débito o crédito a un estudiante"
                >
                  <CreditCard className="w-3.5 h-3.5" />
                  <span>Cobrar Tarjeta</span>
                </button>

                <button
                  type="button"
                  id="btn-conta-payment-links"
                  onClick={() => setShowPaymentLinkModal(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl shadow-xs transition-all cursor-pointer"
                  title="Generar y gestionar enlaces de pago digitales"
                >
                  <Link2 className="w-3.5 h-3.5" />
                  <span>Links de Pago</span>
                </button>
              </div>
            )}

            {isStudent && (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  id="btn-student-card-pay"
                  onClick={() => setShowCardPaymentModal(true)}
                  className="flex items-center gap-1.5 px-3.5 py-1.5 bg-gradient-to-r from-sky-600 to-blue-700 hover:from-sky-500 hover:to-blue-600 text-white text-xs font-bold rounded-xl shadow-md shadow-sky-600/30 transition-all cursor-pointer"
                  title="Pagar con tarjeta de débito o crédito con acreditación inmediata de saldo"
                >
                  <CreditCard className="w-3.5 h-3.5" />
                  <span>Pagar con Tarjeta</span>
                </button>

                <button
                  type="button"
                  id="btn-student-payment-links"
                  onClick={() => setShowPaymentLinkModal(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl shadow-xs transition-all cursor-pointer"
                  title="Ver y pagar tus enlaces de pago"
                >
                  <Link2 className="w-3.5 h-3.5" />
                  <span>Links de Pago</span>
                </button>

                <button
                  type="button"
                  id="btn-report-ach"
                  onClick={() => setShowReportAchModal(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-xl border border-slate-700 shadow-xs transition-all cursor-pointer"
                >
                  <UploadCloud className="w-3.5 h-3.5" />
                  <span>Reportar ACH</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* KPI METRICS RIBBON (CONTABILIDAD & ADMIN) */}
      {canPostTransactions && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Card 1: Conciliación Pendiente */}
          <div 
            onClick={() => setAccountingActiveTab('conciliacion')}
            className={`p-3.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between ${
              accountingActiveTab === 'conciliacion'
                ? 'bg-amber-500/10 border-amber-400/60 shadow-xs'
                : 'bg-white border-slate-200 hover:border-amber-300 shadow-xs'
            }`}
          >
            <div>
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                Por Conciliar ACH
              </span>
              <div className="text-xl font-extrabold text-amber-700 mt-0.5 flex items-baseline gap-1">
                <span>${totalPendingAchAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
              </div>
              <span className="text-[10px] text-amber-800 font-semibold block mt-0.5">
                {pendingTransactionsList.length} {pendingTransactionsList.length === 1 ? 'comprobante en cola' : 'comprobantes en cola'}
              </span>
            </div>
            <div className="w-9 h-9 rounded-lg bg-amber-100 text-amber-800 flex items-center justify-center flex-shrink-0">
              <Clock className="w-5 h-5" />
            </div>
          </div>

          {/* Card 2: Total Recaudado / Abonos */}
          <div 
            onClick={() => setAccountingActiveTab('libro')}
            className={`p-3.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between ${
              accountingActiveTab === 'libro'
                ? 'bg-emerald-500/10 border-emerald-400/60 shadow-xs'
                : 'bg-white border-slate-200 hover:border-emerald-300 shadow-xs'
            }`}
          >
            <div>
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                Abonos Acreditados
              </span>
              <div className="text-xl font-extrabold text-emerald-700 mt-0.5">
                +${totalApprovedAbonos.toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </div>
              <span className="text-[10px] text-slate-500 font-medium block mt-0.5">
                {transactions.filter(t => t.tipo === 'abono' && t.estado_aprobacion === 'aprobado').length} depósitos verificados
              </span>
            </div>
            <div className="w-9 h-9 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center flex-shrink-0">
              <ArrowDownLeft className="w-5 h-5" />
            </div>
          </div>

          {/* Card 3: Cargos por Vuelo / Instrucción */}
          <div 
            onClick={() => setAccountingActiveTab('libro')}
            className={`p-3.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between ${
              accountingActiveTab === 'libro'
                ? 'bg-sky-500/10 border-sky-400/60 shadow-xs'
                : 'bg-white border-slate-200 hover:border-sky-300 shadow-xs'
            }`}
          >
            <div>
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                Cargos Operacionales
              </span>
              <div className="text-xl font-extrabold text-slate-800 mt-0.5">
                -${totalApprovedCargos.toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </div>
              <span className="text-[10px] text-slate-500 font-medium block mt-0.5">
                {transactions.filter(t => t.tipo === 'cargo').length} consumos registrados
              </span>
            </div>
            <div className="w-9 h-9 rounded-lg bg-sky-100 text-sky-800 flex items-center justify-center flex-shrink-0">
              <ArrowUpRight className="w-5 h-5" />
            </div>
          </div>

          {/* Card 4: Morosidad & Deuda */}
          <div 
            onClick={() => setAccountingActiveTab('morosidad')}
            className={`p-3.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between ${
              accountingActiveTab === 'morosidad'
                ? 'bg-rose-500/10 border-rose-400/60 shadow-xs ring-1 ring-rose-400/30'
                : 'bg-white border-slate-200 hover:border-rose-300 shadow-xs'
            }`}
          >
            <div>
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                Cartera Vencida / Mora
              </span>
              <div className="text-xl font-extrabold text-rose-700 mt-0.5">
                ${totalDeudaMorosidad.toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </div>
              <div className="flex items-center gap-1.5 text-[10px] font-semibold mt-0.5 flex-wrap">
                <span className="text-rose-700">{totalAlumnosMorosos} en mora</span>
                <span className="text-slate-300">•</span>
                <span className="text-amber-700">{totalAlumnosProximos} por agotarse</span>
              </div>
            </div>
            <div className="w-9 h-9 rounded-lg bg-rose-100 text-rose-800 flex items-center justify-center flex-shrink-0">
              <AlertTriangle className="w-5 h-5" />
            </div>
          </div>
        </div>
      )}

      {/* VISTA DEL ESTUDIANTE: DESGLOSE DE SALDO Y ESTADO DE APROBACIÓN */}
      {isStudent && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
          {/* Saldo Oficial Acreditado */}
          <div className={`p-4 rounded-2xl border ${
            studentBalance >= 0
              ? 'bg-gradient-to-br from-emerald-50 to-teal-50 border-emerald-200 text-emerald-950'
              : 'bg-gradient-to-br from-rose-50 to-amber-50 border-rose-200 text-rose-950'
          } shadow-xs md:col-span-2 relative overflow-hidden`}>
            <div className="flex justify-between items-start">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-white/90 border border-slate-200 shadow-xs inline-flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3 text-sky-600" />
                  {studentBalance >= 0 ? 'Saldo Oficial Acreditado' : 'Saldo en Mora'}
                </span>
                <h2 className="text-xs font-semibold text-slate-600 mt-2">Saldo Activo Disponible</h2>
                <div className="text-3xl font-extrabold mt-0.5 tracking-tight flex items-baseline gap-1">
                  <span className={studentBalance >= 0 ? 'text-emerald-700' : 'text-rose-700'}>
                    ${Math.abs(studentBalance).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </span>
                  <span className="text-xs font-normal text-slate-500">USD</span>
                </div>
              </div>

              <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${
                studentBalance >= 0 ? 'bg-emerald-500 text-white' : 'bg-rose-500 text-white'
              } shadow-xs`}>
                {studentBalance >= 0 ? <CheckCircle2 className="w-6 h-6" /> : <AlertTriangle className="w-6 h-6" />}
              </div>
            </div>

            {/* Aviso si tiene transacciones en proceso de revisión */}
            {pendingCount > 0 && (
              <div className="mt-3 p-2.5 bg-amber-50/90 border border-amber-200 rounded-xl flex items-start gap-2 text-xs text-amber-900">
                <Clock className="w-3.5 h-3.5 text-amber-600 flex-shrink-0 mt-0.5" />
                <div>
                  <strong className="font-semibold">${pendingAbonos.toFixed(2)} USD en verificación bancaria:</strong>
                  <span className="ml-1">Cotejándose con el extracto bancario.</span>
                </div>
              </div>
            )}

            <div className="mt-3 pt-2.5 border-t border-slate-200/80 flex flex-wrap gap-4 text-xs">
              <div className="flex items-center gap-1 text-slate-700">
                <ShieldCheck className="w-3.5 h-3.5 text-sky-600" />
                <span>Despacho: <strong>{studentBalance >= 0 ? 'Habilitado' : 'Condicionado a Pago'}</strong></span>
              </div>
              <div className="flex items-center gap-1 text-slate-700">
                <Building2 className="w-3.5 h-3.5 text-slate-500" />
                <span>Piloto: <strong>{currentUser.nombre}</strong></span>
              </div>
            </div>
          </div>

          {/* Información Bancaria Oficial */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between">
            <div>
              <h3 className="font-bold text-slate-800 text-xs flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5 text-sky-600" />
                <span>Cuentas para Transferencias ACH</span>
              </h3>
              <div className="mt-2 space-y-1 text-xs bg-slate-50 p-2.5 rounded-xl border border-slate-200 text-slate-700">
                <div><strong>Banco:</strong> Banco General de Panamá</div>
                <div><strong>Tipo:</strong> Cta. Corriente</div>
                <div><strong>No.:</strong> 03-72-01-123456-7</div>
                <div><strong>Titular:</strong> SkyOps Aviation S.A.</div>
              </div>
            </div>
            <div className="mt-4 space-y-2">
              <button
                type="button"
                onClick={() => setShowCardPaymentModal(true)}
                className="w-full py-2.5 bg-gradient-to-r from-sky-600 to-blue-700 hover:from-sky-500 hover:to-blue-600 text-white font-bold text-xs rounded-xl shadow-md shadow-sky-600/20 transition-all cursor-pointer flex items-center justify-center gap-1.5"
              >
                <CreditCard className="w-4 h-4" />
                <span>Pagar con Tarjeta (Acreditación Inmediata)</span>
              </button>

              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setShowPaymentLinkModal(true)}
                  className="py-2 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 font-bold text-xs rounded-xl border border-indigo-200 transition-colors cursor-pointer flex items-center justify-center gap-1"
                >
                  <Link2 className="w-3.5 h-3.5" />
                  <span>Links de Pago</span>
                </button>

                <button
                  type="button"
                  onClick={() => setShowReportAchModal(true)}
                  className="py-2 bg-slate-100 text-slate-700 hover:bg-slate-200 font-bold text-xs rounded-xl border border-slate-200 transition-colors cursor-pointer flex items-center justify-center gap-1"
                >
                  <UploadCloud className="w-3.5 h-3.5" />
                  <span>Reportar ACH</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* NAVEGADOR DE PESTAÑAS PARA EL ROL DE ESTUDIANTE */}
      {isStudent && (
        <div className="flex items-center justify-between border-b border-slate-200 pb-2 gap-2 flex-wrap">
          <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl">
            <button
              onClick={() => setStudentViewTab('desglose_vuelos')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                studentViewTab === 'desglose_vuelos'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Plane className="w-4 h-4 text-sky-600" />
              <span>Desglose Cobro vs. Hora Volada</span>
            </button>

            <button
              onClick={() => setStudentViewTab('todos_movimientos')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                studentViewTab === 'todos_movimientos'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <FileText className="w-3.5 h-3.5 text-slate-600" />
              <span>Todos los Movimientos y Abonos</span>
              <span className="px-1.5 py-0.2 rounded-full bg-slate-200 text-slate-700 text-[10px]">
                {transactions.length}
              </span>
            </button>
          </div>
        </div>
      )}

      {/* RENDERIZADO DEL COMPONENTE DE DESGLOSE COBRO VS HORA VOLADA (ESTUDIANTE) */}
      {isStudent && studentViewTab === 'desglose_vuelos' && (
        <StudentFlightHoursBillingBreakdown
          student={currentUser}
          transactions={transactions}
          currentBalance={studentBalance}
          onReportPaymentClick={() => setShowReportAchModal(true)}
        />
      )}

      {/* SEGMENTED TAB NAVIGATOR (CONTABILIDAD & ADMIN) */}
      {canPostTransactions && (
        <div className="flex items-center justify-between border-b border-slate-200 pb-2 gap-2 flex-wrap">
          <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl">
            <button
              onClick={() => setAccountingActiveTab('libro')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                accountingActiveTab === 'libro'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <FileText className="w-3.5 h-3.5 text-sky-600" />
              <span>Libro Mayor & Movimientos</span>
              <span className="px-1.5 py-0.2 rounded-full bg-slate-200 text-slate-700 text-[10px]">
                {transactions.length}
              </span>
            </button>

            <button
              onClick={() => setAccountingActiveTab('bitacora')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                accountingActiveTab === 'bitacora'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Plane className="w-3.5 h-3.5 text-indigo-600" />
              <span>Cargar Bitácora (Descuento de Horas)</span>
            </button>

            <button
              onClick={() => setAccountingActiveTab('conciliacion')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                accountingActiveTab === 'conciliacion'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <ShieldCheck className="w-3.5 h-3.5 text-amber-600" />
              <span>Bandeja de Conciliación ACH</span>
              {pendingTransactionsList.length > 0 && (
                <span className="px-1.5 py-0.2 rounded-full bg-amber-500 text-white font-extrabold text-[10px]">
                  {pendingTransactionsList.length}
                </span>
              )}
            </button>

            <button
              onClick={() => setAccountingActiveTab('nueva_tx')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                accountingActiveTab === 'nueva_tx'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <PlusCircle className="w-3.5 h-3.5 text-emerald-600" />
              <span>Registrar Transacción</span>
            </button>

            <button
              onClick={() => setAccountingActiveTab('morosidad')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                accountingActiveTab === 'morosidad'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
              <span>Reporte de Morosidad</span>
              {totalAlumnosMorosos > 0 ? (
                <span className="px-1.5 py-0.2 rounded-full bg-rose-500 text-white font-extrabold text-[10px]" title={`${totalAlumnosMorosos} alumnos con deuda / mora`}>
                  {totalAlumnosMorosos}
                </span>
              ) : totalAlumnosProximos > 0 ? (
                <span className="px-1.5 py-0.2 rounded-full bg-amber-500 text-white font-extrabold text-[10px]" title={`${totalAlumnosProximos} alumnos con saldo próximo a agotarse`}>
                  {totalAlumnosProximos}
                </span>
              ) : null}
            </button>

            <button
              onClick={() => setAccountingActiveTab('honorarios')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                accountingActiveTab === 'honorarios'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <DollarSign className="w-3.5 h-3.5 text-emerald-600" />
              <span>Honorarios Instructores</span>
              {pendingInstructorFeesCount > 0 && (
                <span className="px-1.5 py-0.2 rounded-full bg-amber-500 text-white font-extrabold text-[10px] animate-pulse" title={`${pendingInstructorFeesCount} liquidaciones pendientes de gestionar`}>
                  {pendingInstructorFeesCount}
                </span>
              )}
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={exportToCSV}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-xl border border-slate-200 shadow-xs transition-colors cursor-pointer"
              title="Descargar libro mayor en archivo CSV"
            >
              <Download className="w-3.5 h-3.5 text-slate-500" />
              <span>Exportar CSV</span>
            </button>
          </div>
        </div>
      )}

      {/* SECCIÓN 1: BANDEJA DE CONCILIACIÓN BANCARIA (CUANDO ACTIVA O EN VISTA LIBRO CON PENDIENTES) */}
      {canPostTransactions && (accountingActiveTab === 'conciliacion' || (accountingActiveTab === 'libro' && pendingTransactionsList.length > 0)) && (
        <div className={`bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-3 ${
          accountingActiveTab !== 'conciliacion' && pendingTransactionsList.length > 0 ? 'border-amber-300 bg-amber-50/10' : ''
        }`}>
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 pb-2.5 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-amber-100 text-amber-800 flex items-center justify-center font-bold text-xs">
                {pendingTransactionsList.length}
              </div>
              <div>
                <h2 className="font-bold text-slate-900 text-sm">
                  Bandeja de Conciliación Bancaria y Comprobación ACH
                </h2>
              </div>
            </div>

            {pendingTransactionsList.length > 0 && (
              <span className="px-2.5 py-0.5 bg-amber-100 text-amber-800 border border-amber-200 rounded-full text-xs font-semibold flex items-center gap-1">
                <Clock className="w-3 h-3 text-amber-600" />
                <span>{pendingTransactionsList.length} pendientes</span>
              </span>
            )}
          </div>

          {pendingTransactionsList.length === 0 ? (
            <div className="p-6 text-center bg-slate-50 rounded-xl border border-dashed border-slate-200">
              <CheckCircle2 className="w-7 h-7 text-emerald-500 mx-auto mb-1.5" />
              <p className="text-xs font-semibold text-slate-700">Sin pagos pendientes por conciliar</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {pendingTransactionsList.map(tx => (
                <div key={tx.id} className="p-3.5 rounded-xl border border-amber-200 bg-amber-50/30 hover:bg-amber-50/60 transition-all flex flex-col justify-between gap-2.5">
                  <div className="space-y-2 text-xs">
                    <div className="flex justify-between items-start">
                      <div>
                        <span className="font-bold text-slate-900 text-xs block">{tx.estudiante_nombre}</span>
                        <div className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5">
                          <span>{tx.banco_origen || 'Banco General'}</span>
                          <span>•</span>
                          <span>{tx.fecha}</span>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="text-sm font-extrabold text-emerald-700">
                          +${tx.monto.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                        </span>
                        <span className="text-[9px] text-slate-400 block font-medium">USD</span>
                      </div>
                    </div>

                    <div className="p-2 bg-white rounded-lg border border-slate-200 space-y-1.5">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-slate-500">Ref. Reportada:</span>
                        <span className="font-mono font-semibold text-sky-700">{tx.referencia_ach}</span>
                      </div>
                      
                      {/* Image Preview / File Details */}
                      {tx.archivo_adjunto ? (
                        <div className="pt-1 border-t border-slate-100 flex items-center justify-between gap-2">
                          <div 
                            onClick={() => setViewingImageTx(tx)}
                            className="flex items-center gap-2 cursor-pointer group hover:opacity-90 transition-opacity"
                            title="Clic para ver imagen del comprobante"
                          >
                            <div className="w-8 h-8 rounded border border-slate-200 overflow-hidden bg-slate-100 flex-shrink-0 relative">
                              <img
                                src={tx.archivo_adjunto}
                                alt="Comprobante"
                                className="w-full h-full object-cover"
                              />
                              <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                                <ZoomIn className="w-3 h-3 text-white" />
                              </div>
                            </div>
                            <div className="truncate">
                              <span className="font-semibold text-slate-800 text-[10px] block truncate max-w-[120px]">
                                {tx.archivo_nombre || 'Comprobante_Pago.jpg'}
                              </span>
                              <span className="text-[10px] text-sky-600 font-semibold flex items-center gap-0.5">
                                <Eye className="w-2.5 h-2.5" />
                                <span>Ver Imagen</span>
                              </span>
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={() => setViewingImageTx(tx)}
                            className="px-2 py-0.5 bg-sky-50 hover:bg-sky-100 text-sky-700 border border-sky-200 rounded text-[10px] font-bold transition-colors cursor-pointer flex items-center gap-1"
                          >
                            <FileImage className="w-3 h-3" />
                            <span>Foto</span>
                          </button>
                        </div>
                      ) : null}

                      {tx.notas && (
                        <p className="text-[10px] text-slate-600 italic pt-1 border-t border-slate-100">
                          "{tx.notas}"
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-amber-200/60 gap-1.5 flex-wrap">
                    <span className="text-[10px] text-amber-700 font-semibold flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      <span>Sin acreditar</span>
                    </span>

                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => setSelectedVoucherTx(tx)}
                        className="px-2 py-1 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 font-semibold text-[11px] rounded-lg transition-colors cursor-pointer flex items-center gap-1"
                        title="Ver Boleta de Comprobante ACH"
                      >
                        <FileText className="w-3 h-3 text-slate-500" />
                        <span>Boleta</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleOpenShareModal(tx)}
                        className="p-1 bg-amber-100 hover:bg-amber-200 text-amber-900 border border-amber-300 rounded-lg transition-colors cursor-pointer"
                        title="Compartir por mensajería interna"
                      >
                        <Share2 className="w-3.5 h-3.5" />
                      </button>

                      <button
                        type="button"
                        onClick={() => setVerifyingTx(tx)}
                        className="px-2.5 py-1 bg-sky-600 hover:bg-sky-700 text-white font-bold text-[11px] rounded-lg shadow-2xs transition-colors cursor-pointer flex items-center gap-1"
                      >
                        <ShieldCheck className="w-3.5 h-3.5" />
                        <span>Conciliar</span>
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* SECCIÓN: CARGA DE BITÁCORAS DE AERONAVES Y DÉBITO AUTÓNOMO (EXCLUSIVO ADMINISTRACIÓN/CONTABILIDAD) */}
      {canPostTransactions && (accountingActiveTab === 'bitacora') && (
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-indigo-200 shadow-xs space-y-5">
          {/* Encabezado con selector de modo */}
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3 pb-3 border-b border-indigo-100">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center border border-indigo-100 shrink-0">
                <Plane className="w-5 h-5" />
              </div>
              <div>
                <h2 className="font-bold text-slate-900 text-sm sm:text-base">
                  Carga de Bitácoras de Aeronaves & Débito Autónomo
                </h2>
              </div>
            </div>

            {/* Selector de Sub-pestaña */}
            <div className="flex items-center bg-slate-100 p-1 rounded-xl shrink-0">
              <button
                type="button"
                onClick={() => setBitacoraSubTab('lote')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  bitacoraSubTab === 'lote'
                    ? 'bg-white text-indigo-700 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                <span>Reconocimiento Autónomo por Lote</span>
              </button>

              <button
                type="button"
                onClick={() => setBitacoraSubTab('individual')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  bitacoraSubTab === 'individual'
                    ? 'bg-white text-indigo-700 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <PlusCircle className="w-3.5 h-3.5 text-indigo-600" />
                <span>Carga Manual Individual</span>
              </button>
            </div>
          </div>

          {/* Mensajes de éxito o error */}
          {bitacoraSuccessMsg && (
            <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-900 text-xs flex items-start gap-2.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <div className="flex-1">
                <span className="font-semibold block">{bitacoraSuccessMsg}</span>
              </div>
            </div>
          )}

          {bitacoraErrorMsg && (
            <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-rose-900 text-xs flex items-start gap-2.5">
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <div className="flex-1">
                <span className="font-semibold block">{bitacoraErrorMsg}</span>
              </div>
            </div>
          )}

          {/* MODO 1: RECONOCIMIENTO Y DÉBITO AUTÓNOMO POR LOTE */}
          {bitacoraSubTab === 'lote' && (
            <div className="space-y-4">
              {/* Zona de Arrastre de Archivo y Caja de Entrada de Texto */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                {/* Cuadro de Arrastre de Archivos (CSV, TXT, LOG) */}
                <div
                  onDragOver={(e) => { e.preventDefault(); setBatchDragActive(true); }}
                  onDragLeave={() => setBatchDragActive(false)}
                  onDrop={handleBatchFileDrop}
                  className={`border-2 border-dashed rounded-2xl p-5 text-center transition-all flex flex-col items-center justify-center ${
                    batchDragActive
                      ? 'border-indigo-500 bg-indigo-50/60 ring-2 ring-indigo-500/20'
                      : 'border-slate-300 hover:border-indigo-400 bg-slate-50/50'
                  }`}
                >
                  <div className="w-10 h-10 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center mb-2">
                    <FileSpreadsheet className="w-5 h-5" />
                  </div>
                  <h3 className="font-bold text-xs text-slate-800">Subir Archivo de Bitácora</h3>
                  <label className="mt-3 px-3.5 py-1.5 bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 font-bold text-xs rounded-xl shadow-2xs cursor-pointer transition-colors inline-flex items-center gap-1.5">
                    <UploadCloud className="w-3.5 h-3.5 text-indigo-600" />
                    <span>Seleccionar Archivo</span>
                    <input
                      type="file"
                      accept=".csv,.txt,.log,.tsv"
                      onChange={handleBatchFileInput}
                      className="hidden"
                    />
                  </label>
                </div>

                {/* Área de Texto / Pegado Directo */}
                <div className="lg:col-span-2 space-y-2">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <label className="font-bold text-xs text-slate-800 flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                      <span>O pegar texto de bitácoras de vuelo (CSV / Líneas de Registro)</span>
                    </label>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={handleLoadSampleBatch}
                        className="text-[11px] font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 px-2.5 py-1 rounded-lg border border-indigo-200 transition-colors cursor-pointer flex items-center gap-1"
                        title="Cargar 3 registros de prueba con estudiantes registrados"
                      >
                        <Sparkles className="w-3 h-3" />
                        <span>Cargar Ejemplo de Flota (3 Vuelos)</span>
                      </button>
                      {batchRawText && (
                        <button
                          type="button"
                          onClick={() => handleRawTextChange('')}
                          className="text-[11px] font-semibold text-slate-500 hover:text-slate-800 px-2 py-1 rounded-lg transition-colors cursor-pointer"
                        >
                          Limpiar
                        </button>
                      )}
                    </div>
                  </div>

                  <textarea
                    rows={4}
                    value={batchRawText}
                    onChange={(e) => handleRawTextChange(e.target.value)}
                    placeholder="Ejemplo: Fecha, Matrícula, Estudiante, Horas, Misión, Folio&#10;2026-03-02, HP-1450, Carlos Mendoza, 1.5, Maniobras Básicas, BIT-2026-001&#10;2026-03-02, HP-1822, Ana Castillo, 2.0, IFR Procedimientos, BIT-2026-002"
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl font-mono text-xs focus:ring-1 focus:ring-indigo-500 focus:bg-white focus:outline-none"
                  />
                  <div className="text-[11px] text-slate-400 flex items-center justify-between">
                    <span>Reconoce automáticamente: Matrícula (HP-1450, HP-1588, HP-1822, etc.), nombre del alumno y horas o rango Hobbs.</span>
                    <span className="font-semibold text-indigo-700">{parsedBatchList.length} registros detectados</span>
                  </div>
                </div>
              </div>

              {/* TABLA DE PREVISUALIZACIÓN Y RECONOCIMIENTO EN VIVO */}
              {parsedBatchList.length > 0 && (
                <div className="space-y-3 pt-2">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-xs text-slate-900 uppercase tracking-wider">
                        Vuelos Reconocidos Listos para Débito Autónomo ({parsedBatchList.length})
                      </h3>
                      {parsedBatchList.filter(p => !p.esValido).length > 0 && (
                        <span className="text-[10px] font-bold px-2 py-0.5 bg-rose-100 text-rose-800 rounded-full border border-rose-200">
                          {parsedBatchList.filter(p => !p.esValido).length} con observaciones
                        </span>
                      )}
                    </div>

                    <span className="text-xs text-slate-500">
                      Revisa las tarifas asignadas por aeronave y los saldos proyectados antes de confirmar.
                    </span>
                  </div>

                  <div className="overflow-x-auto border border-slate-200 rounded-xl shadow-2xs">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200 text-[11px] uppercase tracking-wider">
                        <tr>
                          <th className="py-2.5 px-3">Estado</th>
                          <th className="py-2.5 px-3">Aeronave</th>
                          <th className="py-2.5 px-3">Alumno Reconocido</th>
                          <th className="py-2.5 px-3">Horas / Hobbs</th>
                          <th className="py-2.5 px-3">Tarifa Oficial</th>
                          <th className="py-2.5 px-3">A Debitar</th>
                          <th className="py-2.5 px-3">Saldo Resultante</th>
                          <th className="py-2.5 px-3">Folio / Misión</th>
                          <th className="py-2.5 px-2 text-center">Acción</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 bg-white">
                        {parsedBatchList.map((entry) => (
                          <tr key={entry.id} className={!entry.esValido ? 'bg-rose-50/40' : entry.advertenciaDuplicado ? 'bg-amber-50/40' : 'hover:bg-slate-50/80'}>
                            {/* Estado */}
                            <td className="py-2.5 px-3 whitespace-nowrap">
                              {entry.esValido ? (
                                entry.advertenciaDuplicado ? (
                                  <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-200" title="Posible duplicado en esta fecha">
                                    <AlertTriangle className="w-3 h-3 text-amber-600" />
                                    <span>Revisar Duplicado</span>
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                                    <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                    <span>Listo para Débito</span>
                                  </span>
                                )
                              ) : (
                                <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 border border-rose-200" title={entry.motivoInvalido}>
                                  <XCircle className="w-3 h-3 text-rose-600" />
                                  <span>{entry.motivoInvalido || 'Inválido'}</span>
                                </span>
                              )}
                            </td>

                            {/* Aeronave */}
                            <td className="py-2.5 px-3 whitespace-nowrap">
                              <div className="font-bold text-slate-800 flex items-center gap-1">
                                <Plane className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                                <span>{entry.matricula}</span>
                              </div>
                              <span className="text-[10px] text-slate-400 block">{entry.modelo_avion}</span>
                            </td>

                            {/* Alumno Reconocido */}
                            <td className="py-2.5 px-3 whitespace-nowrap">
                              {entry.matchedStudent ? (
                                <div>
                                  <span className="font-bold text-slate-900 block">{entry.matchedStudent.nombre}</span>
                                  <span className="text-[10px] text-slate-500">
                                    Saldo actual: <strong className={entry.saldo_anterior >= 0 ? 'text-emerald-700' : 'text-rose-700'}>${entry.saldo_anterior.toFixed(2)}</strong>
                                  </span>
                                </div>
                              ) : (
                                <span className="text-rose-700 font-semibold text-xs">
                                  ⚠️ "{entry.estudiante_busqueda}" no coincide
                                </span>
                              )}
                            </td>

                            {/* Horas */}
                            <td className="py-2.5 px-3 whitespace-nowrap">
                              <div className="font-bold text-slate-800">
                                {entry.horas_vuelo} hrs
                              </div>
                              {entry.hobbs_inicial !== undefined && entry.hobbs_final !== undefined && (
                                <span className="text-[10px] text-slate-400 block font-mono">
                                  H: {entry.hobbs_inicial} - {entry.hobbs_final}
                                </span>
                              )}
                            </td>

                            {/* Tarifa Oficial */}
                            <td className="py-2.5 px-3 whitespace-nowrap font-medium text-slate-700">
                              ${entry.tarifa_hora.toFixed(2)}/h
                            </td>

                            {/* A Debitar */}
                            <td className="py-2.5 px-3 whitespace-nowrap">
                              <span className="font-extrabold text-rose-700 text-xs">
                                -${entry.cargo_estimado.toFixed(2)}
                              </span>
                              <span className="text-[9px] text-slate-400 block">USD</span>
                            </td>

                            {/* Saldo Resultante */}
                            <td className="py-2.5 px-3 whitespace-nowrap">
                              {entry.matchedStudent ? (
                                <span className={`font-bold text-xs ${
                                  entry.saldo_resultante >= 250
                                    ? 'text-emerald-700'
                                    : entry.saldo_resultante >= 0
                                    ? 'text-amber-700'
                                    : 'text-rose-700 font-black'
                                }`}>
                                  ${entry.saldo_resultante.toFixed(2)} USD
                                </span>
                              ) : (
                                <span className="text-slate-400">—</span>
                              )}
                            </td>

                            {/* Folio y Misión */}
                            <td className="py-2.5 px-3 whitespace-nowrap max-w-xs truncate">
                              <span className="font-mono text-[10px] text-slate-600 block">{entry.folio}</span>
                              <span className="text-[10px] text-slate-400 truncate block">{entry.mision}</span>
                            </td>

                            {/* Acción */}
                            <td className="py-2.5 px-2 text-center whitespace-nowrap">
                              <button
                                type="button"
                                onClick={() => handleRemoveBatchItem(entry.id)}
                                className="p-1 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                                title="Eliminar fila"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Resumen numérico y botón de confirmación de débito autónomo */}
                  {(() => {
                    const validEntries = parsedBatchList.filter(e => e.esValido);
                    const totalHoras = validEntries.reduce((acc, e) => acc + e.horas_vuelo, 0);
                    const totalDebito = validEntries.reduce((acc, e) => acc + e.cargo_estimado, 0);
                    const uniqueStudents = new Set(validEntries.map(e => e.matchedStudent?.id)).size;

                    return (
                      <div className="bg-indigo-50/60 p-4 rounded-2xl border border-indigo-100 space-y-3">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-indigo-100">
                          <label className="text-xs font-bold text-slate-700">
                            Instructor Asignado para crear Honorarios del Lote (Opcional):
                          </label>
                          <select
                            value={batchInstructorId}
                            onChange={(e) => setBatchInstructorId(e.target.value)}
                            className="px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-medium text-slate-800 sm:w-72"
                          >
                            <option value="">-- Sin instructor (Solo débito de avión) --</option>
                            {allUsers.filter(u => u.rol === 'instructor').map(inst => (
                              <option key={inst.id} value={inst.id}>{inst.nombre}</option>
                            ))}
                          </select>
                        </div>

                        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs tabular-nums">
                            <div>
                              <span className="text-[11px] text-slate-500 font-semibold block">Vuelos Válidos:</span>
                              <strong className="text-base text-slate-900 font-bold">{validEntries.length} de {parsedBatchList.length}</strong>
                            </div>
                            <div>
                              <span className="text-[11px] text-slate-500 font-semibold block">Horas Totales:</span>
                              <strong className="text-base text-indigo-700 font-bold">{totalHoras.toFixed(1)} hrs</strong>
                            </div>
                            <div>
                              <span className="text-[11px] text-slate-500 font-semibold block">Monto a Debitar:</span>
                              <strong className="text-base text-rose-700 font-black">-${totalDebito.toLocaleString('en-US', { minimumFractionDigits: 2 })} USD</strong>
                            </div>
                            <div>
                              <span className="text-[11px] text-slate-500 font-semibold block">Alumnos Impactados:</span>
                              <strong className="text-base text-slate-900 font-bold">{uniqueStudents}</strong>
                            </div>
                          </div>

                          <button
                            type="button"
                            disabled={batchProcessing || validEntries.length === 0}
                            onClick={handleExecuteBatchDebit}
                            className="w-full md:w-auto px-6 py-3 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-xs transition-colors cursor-pointer flex items-center justify-center gap-2 shrink-0"
                          >
                            {batchProcessing ? (
                              <>
                                <RefreshCw className="w-4 h-4 animate-spin" />
                                <span>Debitando Autónomamente...</span>
                              </>
                            ) : (
                              <>
                                <Plane className="w-4 h-4" />
                                <span>Debitar Autónomamente de los Saldos ({validEntries.length} Vuelos)</span>
                              </>
                            )}
                          </button>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              )}

              {/* REPORTE DE RESULTADOS DEL ÚLTIMO LOTE PROCESADO */}
              {batchResultReport && (
                <div className="p-4 bg-emerald-50/80 border border-emerald-200 rounded-2xl space-y-3">
                  <div className="flex items-center justify-between flex-wrap gap-2 pb-2 border-b border-emerald-200/60">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                      <h4 className="font-bold text-xs text-emerald-900">
                        Lote Procesado con Éxito ({batchResultReport.totalProcessed} vuelos liquidados - {batchResultReport.totalHours} hrs)
                      </h4>
                    </div>
                    <span className="text-xs font-black text-emerald-800">
                      Total Debitado: ${batchResultReport.totalDebited.toFixed(2)} USD
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 text-xs">
                    {batchResultReport.results?.map((det: any, idx: number) => (
                      <div key={idx} className={`p-2.5 rounded-xl border shadow-2xs space-y-1 ${det.estado === 'debitado' ? 'bg-white border-emerald-100' : 'bg-amber-50/80 border-amber-200'}`}>
                        <div className="flex justify-between items-center font-bold text-slate-800">
                          <span>{det.estudiante_nombre || det.matricula}</span>
                          <span className={det.estado === 'debitado' ? 'text-rose-700 font-extrabold' : 'text-amber-700'}>
                            {det.estado === 'debitado' ? `-$${det.monto.toFixed(2)}` : det.estado.toUpperCase()}
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-500 flex justify-between">
                          <span>{det.matricula} ({det.horas}h)</span>
                          {det.estado === 'debitado' ? (
                            <span className="font-semibold text-slate-700">Saldo: ${det.saldo_resultante?.toFixed(2)}</span>
                          ) : (
                            <span className="text-[10px] text-amber-700 truncate">{det.mensaje}</span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* MODO 2: FORMULARIO MANUAL INDIVIDUAL */}
          {bitacoraSubTab === 'individual' && (
            <form onSubmit={handleSubmitFlightBitacora} className="space-y-4 text-xs">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-slate-600 text-xs">
                Usa este formulario para registrar y liquidar un único vuelo de bitácora directamente en la cuenta del alumno.
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
                {/* Estudiante */}
                <div className="md:col-span-2">
                  <label className="block font-semibold text-slate-700 mb-1">
                    Estudiante *
                  </label>
                  <select
                    value={bitacoraStudentId || selectedStudentId || (studentsList[0]?.id || '')}
                    onChange={(e) => {
                      const val = e.target.value;
                      setBitacoraStudentId(val);
                      setSelectedStudentId(val);
                      const chosen = studentsList.find(s => s.id === val);
                      if (chosen) setBitacoraPilotoNombre(chosen.nombre);
                    }}
                    className="w-full px-2.5 py-2 bg-slate-50 border border-slate-300 rounded-lg focus:ring-1 focus:ring-indigo-500 font-medium"
                    required
                  >
                    {studentsList.map(s => {
                      const info = getStudentFinancialInfo(s.id);
                      const balLabel = info.isNegative
                        ? `-$${Math.abs(info.balance).toFixed(2)} USD (En Mora)`
                        : `+$${info.balance.toFixed(2)} USD`;
                      return (
                        <option key={s.id} value={s.id}>
                          {s.nombre} ({s.curso_actual || 'Alumno'}) — Saldo: {balLabel}
                        </option>
                      );
                    })}
                  </select>
                </div>

                {/* Aeronave */}
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Aeronave / Matrícula *
                  </label>
                  <select
                    value={bitacoraMatricula}
                    onChange={(e) => handleMatriculaBitacoraChange(e.target.value)}
                    className="w-full px-2.5 py-2 bg-slate-50 border border-slate-300 rounded-lg focus:ring-1 focus:ring-indigo-500 font-medium"
                    required
                  >
                    <option value="HP-1450">HP-1450 - Cessna 172 Skyhawk ($220.00/h)</option>
                    <option value="HP-1588">HP-1588 - Cessna 172SP Garmin G1000 ($220.00/h)</option>
                    <option value="HP-1822">HP-1822 - Piper PA-44 Seminole Multi-Motor ($340.00/h)</option>
                    <option value="HP-1799">HP-1799 - Piper PA-28 Archer III ($220.00/h)</option>
                    <option value="HP-1934">HP-1934 - Piper PA-28 Cherokee ($220.00/h)</option>
                    <option value="SIM-ALX">SIM-ALX - Simulador Alsim ALX ($120.00/h)</option>
                  </select>
                </div>

                {/* Fecha de Vuelo */}
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Fecha del Vuelo *
                  </label>
                  <input
                    type="date"
                    value={bitacoraFecha}
                    onChange={(e) => setBitacoraFecha(e.target.value)}
                    className="w-full px-2.5 py-2 bg-slate-50 border border-slate-300 rounded-lg focus:ring-1 focus:ring-indigo-500 font-medium"
                    required
                  />
                </div>

                {/* Horas Voladas */}
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Horas de Vuelo (Tiempo Calzo a Calzo) *
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      step="0.1"
                      min="0.1"
                      max="10"
                      placeholder="1.5"
                      value={bitacoraHoras}
                      onChange={(e) => setBitacoraHoras(e.target.value)}
                      className="w-full px-2.5 py-2 bg-slate-50 border border-slate-300 rounded-lg focus:ring-1 focus:ring-indigo-500 font-bold tabular-nums"
                      required
                    />
                    <span className="absolute right-3 top-2 text-slate-400 font-bold text-xs">hrs</span>
                  </div>
                </div>

                {/* Tarifa por Hora */}
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Tarifa Aeronave ($ USD/hr) *
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      step="1"
                      min="1"
                      value={bitacoraTarifa}
                      onChange={(e) => setBitacoraTarifa(e.target.value)}
                      className="w-full px-2.5 py-2 bg-slate-50 border border-slate-300 rounded-lg focus:ring-1 focus:ring-indigo-500 font-bold tabular-nums"
                      required
                    />
                    <span className="absolute right-3 top-2 text-slate-400 font-bold text-xs">USD/h</span>
                  </div>
                </div>

                {/* Folio / Bitácora # */}
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    No. Folio / Comprobante de Bitácora
                  </label>
                  <input
                    type="text"
                    placeholder="ej: BITACORA-2026-009"
                    value={bitacoraFolio}
                    onChange={(e) => setBitacoraFolio(e.target.value)}
                    className="w-full px-2.5 py-2 bg-slate-50 border border-slate-300 rounded-lg focus:ring-1 focus:ring-indigo-500 font-mono"
                  />
                </div>

                {/* Misión / Lección */}
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Misión / Fase de Instrucción
                  </label>
                  <input
                    type="text"
                    placeholder="ej: Circuitos de Tránsito y Aterrizajes"
                    value={bitacoraMision}
                    onChange={(e) => setBitacoraMision(e.target.value)}
                    className="w-full px-2.5 py-2 bg-slate-50 border border-slate-300 rounded-lg focus:ring-1 focus:ring-indigo-500 font-medium"
                  />
                </div>

                {/* Lección # */}
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Número de Lección
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="100"
                    value={bitacoraLeccionNum}
                    onChange={(e) => setBitacoraLeccionNum(e.target.value)}
                    className="w-full px-2.5 py-2 bg-slate-50 border border-slate-300 rounded-lg focus:ring-1 focus:ring-indigo-500 font-medium tabular-nums"
                  />
                </div>

                {/* Instructor CFI */}
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Instructor CFI (Genera Honorario 1-a-1)
                  </label>
                  <select
                    value={bitacoraInstructorId}
                    onChange={(e) => setBitacoraInstructorId(e.target.value)}
                    className="w-full px-2.5 py-2 bg-slate-50 border border-slate-300 rounded-lg focus:ring-1 focus:ring-indigo-500 font-medium"
                  >
                    <option value="">-- Sin instructor (Vuelo Solo / Sin honorario) --</option>
                    {allUsers.filter(u => u.rol === 'instructor').map(inst => (
                      <option key={inst.id} value={inst.id}>{inst.nombre}</option>
                    ))}
                  </select>
                </div>

                {/* Tarifa Honorario Instructor */}
                {bitacoraInstructorId && (
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      Tarifa Honorario CFI ($ USD/hr)
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        step="0.5"
                        min="1"
                        value={bitacoraTarifaInstructor}
                        onChange={(e) => setBitacoraTarifaInstructor(e.target.value)}
                        className="w-full px-2.5 py-2 bg-slate-50 border border-slate-300 rounded-lg focus:ring-1 focus:ring-indigo-500 font-bold tabular-nums"
                      />
                      <span className="absolute right-3 top-2 text-slate-400 font-bold text-xs">USD/h</span>
                    </div>
                  </div>
                )}
              </div>

              {/* PREVISUALIZACIÓN MATEMÁTICA Y SALDO RESULTANTE */}
              {(() => {
                const currentTargetStudent = studentsList.find(s => s.id === (bitacoraStudentId || selectedStudentId || studentsList[0]?.id));
                const currentInfo = currentTargetStudent ? getStudentFinancialInfo(currentTargetStudent.id) : null;
                const prevBalance = currentInfo?.balance || 0;
                const hrs = parseFloat(bitacoraHoras) || 0;
                const hrsEstudiante = Number((hrs * 1.275).toFixed(4));
                const trf = parseFloat(bitacoraTarifa) || 0;
                const trfCfi = parseFloat(bitacoraTarifaInstructor) || 45;
                const cargoEstimado = Number((hrsEstudiante * trf).toFixed(2));
                const saldoResultante = Number((prevBalance - cargoEstimado).toFixed(2));
                const honorarioEstimado = bitacoraInstructorId ? Number((hrs * trfCfi).toFixed(2)) : 0;

                return (
                  <div className="bg-indigo-50/50 p-4 rounded-xl border border-indigo-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 tabular-nums">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap text-xs">
                        <span className="text-slate-600 font-medium">Cálculo de Bitácora:</span>
                        <strong className="text-slate-800">{hrs} hrs × 1.275 = {Number(hrsEstudiante.toFixed(4))} hrs × ${trf.toFixed(2)}/hr</strong>
                        <span className="text-slate-400">=</span>
                        <strong className="text-rose-600 font-black text-sm">-${cargoEstimado.toFixed(2)} USD (Cargo a Cuenta)</strong>
                      </div>
                      <div className="flex items-center gap-2 text-xs flex-wrap">
                        <span>Saldo actual de <strong>{currentTargetStudent?.nombre || 'Alumno'}</strong>: <strong>${prevBalance.toFixed(2)} USD</strong></span>
                        <ArrowRight className="w-3.5 h-3.5 text-slate-400 inline" />
                        <span>Saldo resultante tras restar vuelo: </span>
                        <strong className={`font-black ${saldoResultante >= 250 ? 'text-emerald-700' : saldoResultante >= 0 ? 'text-amber-700' : 'text-rose-700'}`}>
                          ${saldoResultante.toFixed(2)} USD
                        </strong>
                      </div>
                      {bitacoraInstructorId && (
                        <div className="text-xs text-sky-800 font-semibold">
                          Honorario a crear para instructor ({bitacoraPilotoNombre.trim() || currentTargetStudent?.nombre || 'Piloto'}): ${honorarioEstimado.toFixed(2)} USD ({hrs.toFixed(1)} hrs × ${trfCfi.toFixed(2)}/h)
                        </div>
                      )}
                    </div>

                    <button
                      type="submit"
                      disabled={bitacoraSubmitting}
                      className="w-full sm:w-auto px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-xs transition-colors cursor-pointer flex items-center justify-center gap-2 shrink-0"
                    >
                      <Plane className="w-4 h-4" />
                      <span>
                        {bitacoraSubmitting
                          ? 'Procesando Vuelo...'
                          : bitacoraInstructorId
                          ? 'Cargar Bitácora, Restar y Crear Honorario'
                          : 'Cargar Bitácora y Restar del Saldo'}
                      </span>
                    </button>
                  </div>
                );
              })()}
            </form>
          )}
        </div>
      )}

      {/* SECCIÓN 2: FORMULARIO DE CARGA RÁPIDA DE TRANSACCIÓN */}
      {canPostTransactions && (accountingActiveTab === 'nueva_tx') && (
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between mb-3 pb-2.5 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <PlusCircle className="w-4 h-4 text-sky-600" />
              <h2 className="font-bold text-slate-900 text-sm">Registrar Movimiento Financiero en Cuenta</h2>
            </div>
            <span className="text-[11px] font-semibold px-2 py-0.5 rounded bg-sky-50 text-sky-700 border border-sky-200">
              Formulario de Caja
            </span>
          </div>

          {formSuccessMessage && (
            <div className="mb-3 p-2.5 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
              <span>{formSuccessMessage}</span>
            </div>
          )}

          {formError && (
            <div className="mb-3 p-2.5 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 flex-shrink-0" />
              <span>{formError}</span>
            </div>
          )}

          <form onSubmit={handleSubmitTransaction} className="space-y-3 text-xs">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {/* Selector de Estudiante */}
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Estudiante / Piloto en Entrenamiento *
                </label>
                <select
                  id="select-student-tx"
                  className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded-lg focus:ring-1 focus:ring-sky-500 focus:bg-white focus:outline-none font-medium"
                  value={selectedStudentId}
                  onChange={(e) => setSelectedStudentId(e.target.value)}
                  required
                >
                  {studentsList.map(s => {
                    const info = getStudentFinancialInfo(s.id);
                    const statusEmoji = info.isNegative ? '🔴' : info.isNearExhausted ? '🟠' : '🟢';
                    const balLabel = info.isNegative 
                      ? `-$${Math.abs(info.balance).toFixed(2)} USD (En Mora)` 
                      : info.isNearExhausted 
                      ? `+$${info.balance.toFixed(2)} USD (Por agotarse)` 
                      : `+$${info.balance.toFixed(2)} USD`;
                    return (
                      <option key={s.id} value={s.id}>
                        {statusEmoji} {s.nombre} ({s.curso_actual || 'Alumno'}) — {balLabel}
                      </option>
                    );
                  })}
                </select>
              </div>

              {/* Tipo de Transacción */}
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Tipo de Movimiento *
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setTipoTx('abono')}
                    className={`py-1.5 font-bold rounded-lg border flex items-center justify-center gap-1 cursor-pointer transition-colors ${
                      tipoTx === 'abono'
                        ? 'bg-emerald-600 text-white border-emerald-600 shadow-2xs'
                        : 'bg-slate-50 text-slate-700 border-slate-300 hover:bg-slate-100'
                    }`}
                  >
                    <ArrowDownLeft className="w-3.5 h-3.5" />
                    <span>ABONO (+)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setTipoTx('cargo')}
                    className={`py-1.5 font-bold rounded-lg border flex items-center justify-center gap-1 cursor-pointer transition-colors ${
                      tipoTx === 'cargo'
                        ? 'bg-rose-600 text-white border-rose-600 shadow-2xs'
                        : 'bg-slate-50 text-slate-700 border-slate-300 hover:bg-slate-100'
                    }`}
                  >
                    <ArrowUpRight className="w-3.5 h-3.5" />
                    <span>CARGO (-)</span>
                  </button>
                </div>
              </div>

              {/* Concepto Predefinido */}
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Concepto *
                </label>
                <select
                  id="select-concepto-tx"
                  className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded-lg focus:ring-1 focus:ring-sky-500 focus:bg-white focus:outline-none"
                  value={concepto}
                  onChange={(e) => setConcepto(e.target.value as TransactionConcept)}
                >
                  {PRESET_CONCEPTS.map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>

              {/* Monto */}
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Monto en Dólares ($ USD) *
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-2.5 flex items-center text-slate-400 font-bold">$</span>
                  <input
                    id="input-monto-tx"
                    type="number"
                    step="0.01"
                    min="0.01"
                    placeholder="0.00"
                    className="w-full pl-7 pr-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded-lg focus:ring-1 focus:ring-sky-500 focus:bg-white focus:outline-none font-bold"
                    value={monto}
                    onChange={(e) => setMonto(e.target.value)}
                    required
                  />
                </div>
              </div>

              {/* Banco de Origen */}
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Banco / Sistema Bancario *
                </label>
                <select
                  className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded-lg focus:ring-1 focus:ring-sky-500 focus:bg-white focus:outline-none"
                  value={bancoOrigen}
                  onChange={(e) => setBancoOrigen(e.target.value)}
                >
                  {PRESET_BANKS.map(b => (
                    <option key={b} value={b}>{b}</option>
                  ))}
                </select>
              </div>

              {/* Referencia ACH */}
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Referencia ACH / Factura / Recibo *
                </label>
                <input
                  id="input-ref-ach"
                  type="text"
                  placeholder="ej. ACH-BG-892102"
                  className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded-lg focus:ring-1 focus:ring-sky-500 focus:bg-white focus:outline-none font-mono"
                  value={referenciaAch}
                  onChange={(e) => setReferenciaAch(e.target.value)}
                  required
                />
              </div>

              {/* Fecha */}
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Fecha de Transacción *
                </label>
                <input
                  id="input-fecha-tx"
                  type="date"
                  className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded-lg focus:ring-1 focus:ring-sky-500 focus:bg-white focus:outline-none"
                  value={fecha}
                  onChange={(e) => setFecha(e.target.value)}
                  required
                />
              </div>

              {/* Verificación Bancaria Inmediata para Contabilidad */}
              <div className="md:col-span-2 flex items-center gap-2.5 p-2 bg-sky-50/80 rounded-xl border border-sky-200">
                <input
                  type="checkbox"
                  id="chk-preverified"
                  checked={isPreVerifiedInBank}
                  onChange={(e) => setIsPreVerifiedInBank(e.target.checked)}
                  className="w-4 h-4 text-sky-600 rounded border-slate-300 focus:ring-sky-500 cursor-pointer"
                />
                <label htmlFor="chk-preverified" className="text-[11px] text-sky-900 cursor-pointer select-none">
                  <strong className="font-semibold">Conciliado y Comprobado con Sistema Bancario</strong>
                  <span className="block text-slate-500">{isPreVerifiedInBank ? 'Se acreditará de inmediato al saldo oficial del alumno.' : 'Se guardará como pendiente de verificación bancaria.'}</span>
                </label>
              </div>
            </div>

            {/* Ficha de Resumen Financiero del Estudiante Seleccionado con Botones de Aviso */}
            {selectedStudentId && (() => {
              const info = getStudentFinancialInfo(selectedStudentId);
              if (!info.user) return null;
              return (
                <div className={`p-3 rounded-xl border transition-all ${
                  info.isNegative
                    ? 'bg-rose-50/90 border-rose-300 ring-1 ring-rose-200'
                    : info.isNearExhausted
                    ? 'bg-amber-50/90 border-amber-300 ring-1 ring-amber-200'
                    : 'bg-emerald-50/70 border-emerald-300 ring-1 ring-emerald-200'
                }`}>
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-xs shadow-2xs flex-shrink-0 ${
                        info.isNegative 
                          ? 'bg-rose-600 text-white' 
                          : info.isNearExhausted 
                          ? 'bg-amber-500 text-white' 
                          : 'bg-emerald-600 text-white'
                      }`}>
                        {info.user.foto_perfil ? (
                          <img src={info.user.foto_perfil} alt={info.user.nombre} className="w-full h-full object-cover rounded-xl" />
                        ) : (
                          info.user.nombre.substring(0, 2).toUpperCase()
                        )}
                      </div>
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="font-bold text-slate-900 text-xs">{info.user.nombre}</h4>
                          <span className="text-[10px] font-semibold px-2 py-0.2 rounded-full bg-white/80 border border-slate-200 text-slate-700">
                            {info.user.curso_actual || 'Piloto en Entrenamiento'}
                          </span>
                          {info.isNegative && (
                            <span className="text-[10px] font-bold px-2 py-0.2 rounded-full bg-rose-600 text-white animate-pulse">
                              🔴 Saldo Deudor ({info.diasMora} días en mora)
                            </span>
                          )}
                          {info.isNearExhausted && (
                            <span className="text-[10px] font-bold px-2 py-0.2 rounded-full bg-amber-600 text-white">
                              🟠 Saldo Próximo a Agotarse (&lt; $250 USD)
                            </span>
                          )}
                          {info.isSolvent && (
                            <span className="text-[10px] font-bold px-2 py-0.2 rounded-full bg-emerald-600 text-white">
                              🟢 Solvente / Despacho Habilitado
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-3 text-slate-600 text-[11px] mt-0.5 flex-wrap">
                          <span className="flex items-center gap-1">
                            <Phone className="w-3 h-3 text-slate-400" />
                            {info.user.telefono || 'Sin teléfono'}
                          </span>
                          <span className="text-slate-300">•</span>
                          <span className="flex items-center gap-1">
                            <Mail className="w-3 h-3 text-slate-400" />
                            {info.user.correo}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end border-t sm:border-t-0 pt-2 sm:pt-0 border-slate-200/60">
                      <div className="text-right">
                        <span className="text-[9px] font-bold uppercase text-slate-500 block">Saldo Actual Oficial</span>
                        <div className={`text-base font-extrabold tracking-tight ${
                          info.isNegative ? 'text-rose-700' : info.isNearExhausted ? 'text-amber-700' : 'text-emerald-700'
                        }`}>
                          {info.isNegative ? `-$${Math.abs(info.balance).toLocaleString('en-US', { minimumFractionDigits: 2 })}` : `+$${info.balance.toLocaleString('en-US', { minimumFractionDigits: 2 })}`} USD
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 flex-shrink-0 flex-wrap">
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedStudentId(info.user.id);
                            setShowCardPaymentModal(true);
                          }}
                          className="px-2.5 py-1.5 bg-sky-600 hover:bg-sky-700 text-white text-xs font-bold rounded-lg shadow-2xs transition-all flex items-center gap-1 cursor-pointer"
                          title="Cobrar con tarjeta de débito o crédito a este estudiante"
                        >
                          <CreditCard className="w-3.5 h-3.5" />
                          <span>Tarjeta</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedStudentId(info.user.id);
                            setShowPaymentLinkModal(true);
                          }}
                          className="px-2.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-lg shadow-2xs transition-all flex items-center gap-1 cursor-pointer"
                          title="Generar link de pago para este estudiante"
                        >
                          <Link2 className="w-3.5 h-3.5" />
                          <span>Link</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleOpenWhatsAppNotice(info.user, info.balance)}
                          className="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg shadow-2xs transition-all flex items-center gap-1 cursor-pointer"
                          title="Enviar aviso de cobranza / saldo por WhatsApp"
                        >
                          <MessageSquare className="w-3.5 h-3.5" />
                          <span>WhatsApp</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleOpenEmailNotice(info.user, info.balance)}
                          className="px-2.5 py-1.5 bg-slate-700 hover:bg-slate-600 text-white text-xs font-bold rounded-lg shadow-2xs transition-all flex items-center gap-1 cursor-pointer"
                          title="Enviar aviso formal por Correo Electrónico"
                        >
                          <Mail className="w-3.5 h-3.5" />
                          <span>Correo</span>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })()}

            {/* Drag & Drop Archivo Adjunto */}
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Comprobante Digital (PDF / Factura / Recibo ACH)
              </label>
              <div
                onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
                onDragLeave={() => setDragActive(false)}
                onDrop={handleDrop}
                className={`border-2 border-dashed rounded-xl p-3 text-center transition-colors ${
                  dragActive ? 'border-sky-500 bg-sky-50/50' : 'border-slate-300 bg-slate-50/50 hover:bg-slate-50'
                }`}
              >
                {attachedFileName ? (
                  <div className="flex items-center justify-center gap-2 text-xs text-emerald-700 font-medium">
                    <FileCheck className="w-4 h-4 text-emerald-600" />
                    <span>Archivo cargado: <strong>{attachedFileName}</strong></span>
                    <button
                      type="button"
                      onClick={() => setAttachedFileName('')}
                      className="ml-2 text-[11px] text-rose-600 hover:underline cursor-pointer"
                    >
                      Quitar
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center justify-center gap-2 text-slate-500">
                    <UploadCloud className="w-5 h-5 text-slate-400" />
                    <span>Arrastra tu archivo aquí o </span>
                    <label className="text-sky-600 font-semibold cursor-pointer hover:underline">
                      examinar
                      <input
                        type="file"
                        accept=".pdf,.png,.jpg,.jpeg"
                        className="hidden"
                        onChange={(e) => {
                          if (e.target.files && e.target.files[0]) {
                            handleFileUpload(e.target.files[0]);
                          }
                        }}
                      />
                    </label>
                  </div>
                )}
              </div>
            </div>

            {/* Notas opcionales */}
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Notas / Detalle de Horas o Lección</label>
              <input
                type="text"
                placeholder="ej: 1.5 horas Multi-Motor Seminole HP-1822 + Instrucción"
                className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded-lg focus:ring-1 focus:ring-sky-500 focus:bg-white focus:outline-none"
                value={notas}
                onChange={(e) => setNotas(e.target.value)}
              />
            </div>

            <div className="flex justify-end pt-1">
              <button
                type="submit"
                id="btn-guardar-tx"
                className="px-5 py-2 bg-sky-600 hover:bg-sky-700 text-white font-bold text-xs rounded-xl shadow-xs transition-colors cursor-pointer flex items-center gap-1.5"
              >
                <PlusCircle className="w-4 h-4" />
                <span>Registrar Transacción Contable</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* SECCIÓN 3: REPORTE DE MOROSIDAD (CUANDO ACTIVA) */}
      {canPostTransactions && (accountingActiveTab === 'morosidad') && (
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 pb-2.5 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-rose-100 text-rose-800 flex items-center justify-center font-bold text-xs">
                <AlertTriangle className="w-4 h-4" />
              </div>
              <div>
                <h2 className="font-bold text-slate-900 text-sm">Reporte de Morosidad, Saldos y Avisos de Cobro</h2>
              </div>
            </div>
            <span className="text-xs text-slate-500 font-medium bg-slate-100 px-2.5 py-1 rounded-lg">
              Total {morosidadList.length} estudiantes registrados
            </span>
          </div>

          {/* Mini KPI Cards de Morosidad */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5">
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl">
              <span className="text-[10px] font-bold text-rose-700 uppercase tracking-wider block">Cartera Vencida</span>
              <div className="text-lg font-extrabold text-rose-800 mt-0.5">
                ${totalDeudaMorosidad.toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </div>
              <span className="text-[10px] text-rose-700 font-medium block mt-0.5">Total pendiente por cobrar</span>
            </div>

            <div 
              onClick={() => setMorosidadFilter('morosos')}
              className={`p-3 border rounded-xl cursor-pointer transition-all ${
                morosidadFilter === 'morosos' ? 'bg-rose-100/80 border-rose-400 ring-1 ring-rose-300' : 'bg-white border-slate-200 hover:border-rose-300'
              }`}
            >
              <span className="text-[10px] font-bold text-rose-700 uppercase tracking-wider block">🔴 Saldo Deudor / Mora</span>
              <div className="text-lg font-extrabold text-rose-700 mt-0.5">{totalAlumnosMorosos} alumnos</div>
              <span className="text-[10px] text-slate-500 font-medium block mt-0.5">Despacho restringido</span>
            </div>

            <div 
              onClick={() => setMorosidadFilter('proximos')}
              className={`p-3 border rounded-xl cursor-pointer transition-all ${
                morosidadFilter === 'proximos' ? 'bg-amber-100/80 border-amber-400 ring-1 ring-amber-300' : 'bg-white border-slate-200 hover:border-amber-300'
              }`}
            >
              <span className="text-[10px] font-bold text-amber-800 uppercase tracking-wider block">🟠 Próximo a Agotarse</span>
              <div className="text-lg font-extrabold text-amber-800 mt-0.5">{totalAlumnosProximos} alumnos</div>
              <span className="text-[10px] text-slate-500 font-medium block mt-0.5">Saldo menor a $250 USD</span>
            </div>

            <div 
              onClick={() => setMorosidadFilter('solventes')}
              className={`p-3 border rounded-xl cursor-pointer transition-all ${
                morosidadFilter === 'solventes' ? 'bg-emerald-100/80 border-emerald-400 ring-1 ring-emerald-300' : 'bg-white border-slate-200 hover:border-emerald-300'
              }`}
            >
              <span className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider block">🟢 Cuentas Solventes</span>
              <div className="text-lg font-extrabold text-emerald-800 mt-0.5">{totalAlumnosSolventes} alumnos</div>
              <span className="text-[10px] text-slate-500 font-medium block mt-0.5">Despacho habilitado</span>
            </div>
          </div>

          {/* Barra de Filtros y Búsqueda */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 pt-1">
            <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl flex-wrap">
              <button
                type="button"
                onClick={() => setMorosidadFilter('todos')}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  morosidadFilter === 'todos' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Todos ({morosidadList.length})
              </button>
              <button
                type="button"
                onClick={() => setMorosidadFilter('morosos')}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
                  morosidadFilter === 'morosos' ? 'bg-rose-600 text-white shadow-2xs' : 'text-rose-700 hover:bg-rose-50'
                }`}
              >
                <span>🔴 En Mora</span>
                <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-white/20">{totalAlumnosMorosos}</span>
              </button>
              <button
                type="button"
                onClick={() => setMorosidadFilter('proximos')}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
                  morosidadFilter === 'proximos' ? 'bg-amber-600 text-white shadow-2xs' : 'text-amber-800 hover:bg-amber-50'
                }`}
              >
                <span>🟠 Saldo Bajo</span>
                <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-white/20">{totalAlumnosProximos}</span>
              </button>
              <button
                type="button"
                onClick={() => setMorosidadFilter('solventes')}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
                  morosidadFilter === 'solventes' ? 'bg-emerald-600 text-white shadow-2xs' : 'text-emerald-800 hover:bg-emerald-50'
                }`}
              >
                <span>🟢 Solventes</span>
                <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-white/20">{totalAlumnosSolventes}</span>
              </button>
            </div>

            <div className="relative flex-1 max-w-xs">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Buscar alumno, correo, teléfono..."
                className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-1 focus:ring-sky-500"
                value={morosidadSearch}
                onChange={(e) => setMorosidadSearch(e.target.value)}
              />
            </div>
          </div>

          {/* Tabla Enriquecida de Morosidad con Indicador Visual Rojo/Ámbar/Verde y Acciones de Contacto */}
          <div className="overflow-x-auto rounded-xl border border-slate-200">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-700 uppercase font-semibold text-[10px] border-b border-slate-200">
                <tr>
                  <th className="px-3.5 py-2.5">Estudiante & Programa</th>
                  <th className="px-3.5 py-2.5">Saldo Acreditado</th>
                  <th className="px-3.5 py-2.5">Estado Financiero & Despacho</th>
                  <th className="px-3.5 py-2.5">Datos de Contacto</th>
                  <th className="px-3.5 py-2.5">Último Pago</th>
                  <th className="px-3.5 py-2.5 text-right">Avisos & Cobranza</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {(() => {
                  const filtered = morosidadList.filter((m) => {
                    if (morosidadFilter === 'morosos' && m.saldo_actual >= 0) return false;
                    if (morosidadFilter === 'proximos' && (m.saldo_actual < 0 || m.saldo_actual >= 250)) return false;
                    if (morosidadFilter === 'solventes' && m.saldo_actual < 250) return false;

                    if (morosidadSearch.trim()) {
                      const q = morosidadSearch.toLowerCase();
                      const matchesName = (m.estudiante_nombre || '').toLowerCase().includes(q);
                      const matchesPhone = (m.estudiante_telefono || '').toLowerCase().includes(q);
                      const matchesEmail = (m.estudiante_correo || '').toLowerCase().includes(q);
                      return matchesName || matchesPhone || matchesEmail;
                    }
                    return true;
                  });

                  if (filtered.length === 0) {
                    return (
                      <tr>
                        <td colSpan={6} className="text-center py-8 text-slate-400 text-xs">
                          No se encontraron estudiantes con los criterios de filtro seleccionados.
                        </td>
                      </tr>
                    );
                  }

                  return filtered.map((m) => {
                    const studentUser: User = allUsers.find(u => u.id === m.estudiante_id) || {
                      id: m.estudiante_id,
                      nombre: m.estudiante_nombre,
                      correo: m.estudiante_correo,
                      telefono: m.estudiante_telefono,
                      rol: 'estudiante' as const,
                      activo: true
                    };

                    const isNegative = m.saldo_actual < 0;
                    const isNearExhausted = m.saldo_actual >= 0 && m.saldo_actual < 250;
                    const isSolvent = m.saldo_actual >= 250;

                    return (
                      <tr 
                        key={m.estudiante_id} 
                        className={`transition-colors ${
                          isNegative 
                            ? 'bg-rose-50/70 hover:bg-rose-50 border-l-4 border-l-rose-500' 
                            : isNearExhausted 
                            ? 'bg-amber-50/50 hover:bg-amber-50/80 border-l-4 border-l-amber-500' 
                            : 'hover:bg-slate-50 border-l-4 border-l-emerald-500'
                        }`}
                      >
                        {/* Estudiante & Avatar */}
                        <td className="px-3.5 py-3">
                          <div className="flex items-center gap-2.5">
                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs flex-shrink-0 text-white shadow-2xs ${
                              isNegative ? 'bg-rose-600 ring-2 ring-rose-300' : isNearExhausted ? 'bg-amber-500 ring-2 ring-amber-300' : 'bg-emerald-600'
                            }`}>
                              {studentUser.foto_perfil ? (
                                <img src={studentUser.foto_perfil} alt={studentUser.nombre} className="w-full h-full object-cover rounded-lg" />
                              ) : (
                                studentUser.nombre.substring(0, 2).toUpperCase()
                              )}
                            </div>
                            <div>
                              <div className="font-bold text-slate-900 flex items-center gap-1.5">
                                <span>{m.estudiante_nombre}</span>
                                {isNegative && (
                                  <span className="w-2 h-2 rounded-full bg-rose-600 animate-ping inline-block" title="Saldo deudor urgente" />
                                )}
                              </div>
                              <div className="text-[10px] text-slate-500 font-medium">
                                {studentUser.curso_actual || 'Alumno Piloto'}
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* Saldo Acreditado */}
                        <td className="px-3.5 py-3 font-bold">
                          <div className="text-sm">
                            <span className={isNegative ? 'text-rose-700 font-extrabold' : isNearExhausted ? 'text-amber-700 font-extrabold' : 'text-emerald-700 font-extrabold'}>
                              {isNegative ? `-$${Math.abs(m.saldo_actual).toLocaleString('en-US', { minimumFractionDigits: 2 })}` : `+$${m.saldo_actual.toLocaleString('en-US', { minimumFractionDigits: 2 })}`}
                            </span>
                            <span className="text-[10px] text-slate-400 font-normal ml-1">USD</span>
                          </div>
                          <span className="text-[10px] text-slate-500 font-normal block mt-0.5">
                            {isNegative 
                              ? '⚠️ Cartera deudora' 
                              : isNearExhausted 
                              ? '⏳ ~1.2 hrs vuelo aprox' 
                              : '✈️ Saldo disponible'}
                          </span>
                        </td>

                        {/* Estado Financiero & Despacho */}
                        <td className="px-3.5 py-3">
                          {isNegative ? (
                            <div className="space-y-1">
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-300">
                                <AlertTriangle className="w-3 h-3 text-rose-600" />
                                <span>Mora ({m.dias_mora} días)</span>
                              </span>
                              <span className="block text-[10px] font-semibold text-rose-700">
                                🚫 Despacho Suspendido
                              </span>
                            </div>
                          ) : isNearExhausted ? (
                            <div className="space-y-1">
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-300">
                                <Clock className="w-3 h-3 text-amber-600" />
                                <span>Saldo Bajo (&lt; $250)</span>
                              </span>
                              <span className="block text-[10px] font-semibold text-amber-700">
                                ⚠️ Requiere Recarga Próxima
                              </span>
                            </div>
                          ) : (
                            <div className="space-y-1">
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                                <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                <span>Solvente / Al Día</span>
                              </span>
                              <span className="block text-[10px] font-semibold text-emerald-700">
                                ✅ Despacho Habilitado
                              </span>
                            </div>
                          )}
                        </td>

                        {/* Contacto */}
                        <td className="px-3.5 py-3 text-slate-600 text-[11px]">
                          <div className="flex items-center gap-1 font-semibold text-slate-800">
                            <Phone className="w-3 h-3 text-emerald-600" />
                            <span>{m.estudiante_telefono || 'No registrado'}</span>
                          </div>
                          <div className="text-slate-500 text-[10px] flex items-center gap-1 mt-0.5 truncate max-w-[170px]" title={m.estudiante_correo}>
                            <Mail className="w-3 h-3 text-sky-600 flex-shrink-0" />
                            <span className="truncate">{m.estudiante_correo}</span>
                          </div>
                        </td>

                        {/* Último Pago */}
                        <td className="px-3.5 py-3 text-slate-600 text-[11px]">
                          <div className="font-medium text-slate-800">{m.ultimo_pago_fecha || 'Sin pagos'}</div>
                          <div className="text-[10px] text-slate-400">Verificado en banco</div>
                        </td>

                        {/* Acciones de Contacto Directo: WhatsApp y Correo */}
                        <td className="px-3.5 py-3 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              type="button"
                              onClick={() => handleOpenWhatsAppNotice(studentUser, m.saldo_actual)}
                              className={`px-2.5 py-1.5 text-xs font-bold rounded-lg shadow-2xs transition-all flex items-center gap-1 cursor-pointer ${
                                isNegative
                                  ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                                  : isNearExhausted
                                  ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                                  : 'bg-slate-100 hover:bg-emerald-50 text-slate-700 hover:text-emerald-700 border border-slate-200'
                              }`}
                              title="Enviar aviso por WhatsApp"
                            >
                              <MessageSquare className="w-3.5 h-3.5" />
                              <span>WhatsApp</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => handleOpenEmailNotice(studentUser, m.saldo_actual)}
                              className={`px-2.5 py-1.5 text-xs font-bold rounded-lg shadow-2xs transition-all flex items-center gap-1 cursor-pointer ${
                                isNegative
                                  ? 'bg-sky-600 hover:bg-sky-700 text-white'
                                  : isNearExhausted
                                  ? 'bg-sky-600 hover:bg-sky-700 text-white'
                                  : 'bg-slate-100 hover:bg-sky-50 text-slate-700 hover:text-sky-700 border border-slate-200'
                              }`}
                              title="Enviar correo formal de estado de cuenta o cobro"
                            >
                              <Mail className="w-3.5 h-3.5" />
                              <span>Correo</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  });
                })()}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* SECCIÓN: HONORARIOS DE INSTRUCTORES (GESTIÓN Y PAGOS ACH PARA CONTABILIDAD) */}
      {canPostTransactions && (accountingActiveTab === 'honorarios') && (
        <InstructorFeeManager
          currentUser={currentUser}
          allUsers={allUsers}
          mode="accounting"
          onUpdated={() => {
            loadData();
            if (onRefreshData) onRefreshData();
          }}
        />
      )}

      {/* SECCIÓN PRINCIPAL: HISTORIAL Y LIBRO MAYOR COMPACTO */}
      {((isStudent && studentViewTab === 'todos_movimientos') || (canPostTransactions && accountingActiveTab === 'libro')) && (
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-3">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5">
            <div>
              <h3 className="font-bold text-slate-900 text-sm">
                {isStudent ? 'Historial de Movimientos y Despacho' : 'Libro Mayor de Movimientos y Transacciones'}
              </h3>
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto flex-wrap">
              {/* Buscador */}
              <div className="relative flex-1 sm:w-44">
                <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Buscar..."
                  className="w-full pl-8 pr-2.5 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-sky-500"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>

              {/* Filtro tipo */}
              <select
                className="px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:outline-none font-medium"
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
              >
                <option value="todos">Todos los Tipos</option>
                <option value="abono">Solo Abonos (+)</option>
                <option value="cargo">Solo Cargos (-)</option>
              </select>

              {/* Filtro estado de conciliación */}
              <select
                className="px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:outline-none font-medium"
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
              >
                <option value="todos">Todos los Estados</option>
                <option value="aprobado">Conciliados en Banco</option>
                <option value="pendiente">Pendientes de Cotejo</option>
                <option value="rechazado">Rechazados</option>
              </select>
            </div>
          </div>

          {/* Tabla */}
          <div className="overflow-x-auto rounded-xl border border-slate-200">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-700 uppercase font-semibold text-[10px] border-b border-slate-200">
                <tr>
                  <th className="px-3.5 py-2.5">Fecha</th>
                  {!isStudent && <th className="px-3.5 py-2.5">Estudiante</th>}
                  <th className="px-3.5 py-2.5">Tipo</th>
                  <th className="px-3.5 py-2.5">Concepto & Banco</th>
                  <th className="px-3.5 py-2.5">Referencia ACH</th>
                  <th className="px-3.5 py-2.5">Estado Bancario</th>
                  <th className="px-3.5 py-2.5 text-right">Monto ($)</th>
                  <th className="px-3.5 py-2.5 text-right">Saldo Oficial</th>
                  <th className="px-3.5 py-2.5 text-center">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {filteredTransactions.length === 0 ? (
                  <tr>
                    <td colSpan={isStudent ? 8 : 9} className="px-4 py-8 text-center text-slate-400 text-xs">
                      No se encontraron transacciones registradas con los filtros actuales.
                    </td>
                  </tr>
                ) : (
                  filteredTransactions.map((tx) => (
                    <tr key={tx.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-3.5 py-2.5 font-medium text-slate-600 whitespace-nowrap text-[11px]">
                        {tx.fecha}
                      </td>
                      {!isStudent && (
                        <td className="px-3.5 py-2.5 font-bold text-slate-900">
                          {tx.estudiante_nombre}
                        </td>
                      )}
                      <td className="px-3.5 py-2.5">
                        <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold ${
                          tx.tipo === 'abono'
                            ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                            : 'bg-rose-100 text-rose-800 border border-rose-200'
                        }`}>
                          {tx.tipo === 'abono' ? <ArrowDownLeft className="w-3 h-3" /> : <ArrowUpRight className="w-3 h-3" />}
                          {tx.tipo.toUpperCase()}
                        </span>
                      </td>
                      <td className="px-3.5 py-2.5">
                        <div className="font-semibold text-slate-800">{tx.concepto}</div>
                        <div className="text-[10px] text-slate-500">
                          {tx.banco_origen && <span>{tx.banco_origen} • </span>}
                          {tx.notas && <span className="italic">{tx.notas}</span>}
                        </div>
                      </td>
                      <td className="px-3.5 py-2.5 text-slate-600 font-mono text-[11px]">
                        {tx.referencia_ach}
                      </td>
                      <td className="px-3.5 py-2.5">
                        {tx.estado_aprobacion === 'aprobado' ? (
                          <div>
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                              <CheckCircle2 className="w-2.5 h-2.5 text-emerald-600" />
                              <span>Comprobado en Banco</span>
                            </span>
                            {tx.verificado_por && (
                              <div className="text-[9px] text-slate-400 mt-0.5">
                                Por: {tx.verificado_por}
                              </div>
                            )}
                          </div>
                        ) : tx.estado_aprobacion === 'pendiente_revision_bancaria' ? (
                          <div>
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
                              <Clock className="w-2.5 h-2.5 text-amber-600" />
                              <span>En Revisión Bancaria</span>
                            </span>
                            <div className="text-[9px] text-amber-600 font-medium mt-0.5">
                              (No acreditado aún)
                            </div>
                          </div>
                        ) : (
                          <div>
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-rose-50 text-rose-800 border border-rose-200">
                              <XCircle className="w-2.5 h-2.5 text-rose-600" />
                              <span>Rechazado</span>
                            </span>
                            {tx.motivo_rechazo && (
                              <div className="text-[9px] text-rose-700 italic mt-0.5 max-w-[130px] truncate" title={tx.motivo_rechazo}>
                                {tx.motivo_rechazo}
                              </div>
                            )}
                          </div>
                        )}
                      </td>
                      <td className="px-3.5 py-2.5 text-right font-bold text-xs">
                        <span className={tx.tipo === 'abono' ? 'text-emerald-700' : 'text-slate-800'}>
                          {tx.tipo === 'abono' ? '+' : '-'}${tx.monto.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                        </span>
                      </td>
                      <td className="px-3.5 py-2.5 text-right font-bold text-xs">
                        {tx.estado_aprobacion === 'aprobado' ? (
                          <span className={tx.saldo_resultante >= 0 ? 'text-emerald-700' : 'text-rose-600'}>
                            ${tx.saldo_resultante.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                          </span>
                        ) : (
                          <span className="text-slate-400 font-normal italic text-[11px]">
                            Pendiente
                          </span>
                        )}
                      </td>
                      <td className="px-3.5 py-2.5 text-center">
                        <div className="flex items-center justify-center gap-1 flex-wrap">
                          {/* Ver Imagen Directa del Comprobante si existe */}
                          {tx.archivo_adjunto && (
                            <button
                              type="button"
                              className="p-1 rounded-lg text-slate-500 hover:text-emerald-700 hover:bg-emerald-50 transition-colors cursor-pointer"
                              title="Ver Imagen original del Comprobante"
                              onClick={() => setViewingImageTx(tx)}
                            >
                              <FileImage className="w-3.5 h-3.5 text-emerald-600" />
                            </button>
                          )}

                          {/* Ver Boleta / Comprobante ACH completo */}
                          <button
                            type="button"
                            className="p-1 rounded-lg text-slate-500 hover:text-sky-700 hover:bg-sky-50 transition-colors cursor-pointer"
                            title="Ver Boleta de Comprobante ACH"
                            onClick={() => setSelectedVoucherTx(tx)}
                          >
                            <Eye className="w-3.5 h-3.5 text-sky-600" />
                          </button>

                          {/* Compartir por Mensajería Interna (Contabilidad/Admin) */}
                          {canPostTransactions && (
                            <button
                              type="button"
                              className="p-1 rounded-lg text-slate-500 hover:text-amber-700 hover:bg-amber-50 transition-colors cursor-pointer"
                              title="Compartir comprobante por mensajería interna"
                              onClick={() => handleOpenShareModal(tx)}
                            >
                              <Share2 className="w-3.5 h-3.5 text-amber-600" />
                            </button>
                          )}

                          {/* Conciliación bancaria si está pendiente */}
                          {canPostTransactions && tx.estado_aprobacion === 'pendiente_revision_bancaria' && (
                            <button
                              type="button"
                              onClick={() => setVerifyingTx(tx)}
                              className="px-2 py-0.5 bg-sky-600 hover:bg-sky-700 text-white rounded text-[10px] font-bold shadow-2xs transition-colors cursor-pointer flex items-center gap-1"
                              title="Revisar y comprobar con el extracto bancario"
                            >
                              <ShieldCheck className="w-3 h-3" />
                              <span>Conciliar</span>
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* MODAL DE CONCILIACIÓN BANCARIA (CONTABILIDAD) */}
      {verifyingTx && (
        <BankVerificationModal
          transaction={verifyingTx}
          currentUser={currentUser}
          onClose={() => setVerifyingTx(null)}
          onApprove={handleApproveBank}
          onReject={handleRejectBank}
          onViewVoucher={(tx) => setSelectedVoucherTx(tx)}
          onShareInternal={(tx) => handleOpenShareModal(tx)}
        />
      )}

      {/* MODAL: VISOR DE COMPROBANTE ACH OFICIAL (DESCARGA E IMPRESIÓN) */}
      {selectedVoucherTx && (
        <AchVoucherModal
          transaction={selectedVoucherTx}
          onClose={() => setSelectedVoucherTx(null)}
          onShareInternal={canPostTransactions ? (tx) => handleOpenShareModal(tx) : undefined}
        />
      )}

      {/* MODAL: VISOR DE IMAGEN ORIGINAL DEL COMPROBANTE (ZOOM, ROTAR, DESCARGAR, COMPARTIR) */}
      {viewingImageTx && (
        <ImageViewerModal
          transaction={viewingImageTx}
          imageUrl={viewingImageTx.archivo_adjunto}
          onClose={() => setViewingImageTx(null)}
          onShareInternal={canPostTransactions ? (tx) => {
            setViewingImageTx(null);
            handleOpenShareModal(tx);
          } : undefined}
        />
      )}

      {/* MODAL: MENSAJERÍA INTERNA ENTRE USUARIOS DE CONTABILIDAD */}
      {showMessagingModal && (
        <InternalAccountingMessagingModal
          currentUser={currentUser}
          allUsers={allUsers}
          allTransactions={transactions}
          preSelectedTransaction={sharingVoucherTx}
          onClose={() => {
            setShowMessagingModal(false);
            setSharingVoucherTx(null);
          }}
          onOpenTransactionVoucher={(tx) => {
            setSelectedVoucherTx(tx);
          }}
          onRefreshParent={loadData}
        />
      )}

      {/* MODAL: REPORTAR PAGO ACH (ESTUDIANTE) */}
      {showReportAchModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <UploadCloud className="w-5 h-5 text-emerald-600" />
                <h3 className="font-bold text-slate-800 text-lg">Reportar Pago por Transferencia ACH</h3>
              </div>
              <button
                onClick={() => setShowReportAchModal(false)}
                className="text-slate-400 hover:text-slate-600 text-lg font-bold cursor-pointer"
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleReportPaymentFromStudent} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Banco Emisor</label>
                <select
                  className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-300 rounded-lg focus:outline-none"
                  value={achBanco}
                  onChange={(e) => setAchBanco(e.target.value)}
                >
                  {PRESET_BANKS.map(b => (
                    <option key={b} value={b}>{b}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Monto Transferido ($ USD) *</label>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  placeholder="ej. 125.50"
                  className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:bg-white focus:outline-none font-bold"
                  value={achMonto}
                  onChange={(e) => setAchMonto(e.target.value)}
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Número de Referencia / Confirmación ACH *</label>
                <input
                  type="text"
                  placeholder="ej. 89201948"
                  className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:bg-white focus:outline-none"
                  value={achRef}
                  onChange={(e) => setAchRef(e.target.value)}
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Adjuntar Captura o Foto del Comprobante (JPG, PNG, PDF)</label>
                <input
                  type="file"
                  accept=".png,.jpg,.jpeg,.svg,.pdf"
                  className="w-full text-xs text-slate-500 file:mr-3 file:py-2 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-sky-50 file:text-sky-700 hover:file:bg-sky-100 cursor-pointer"
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      const file = e.target.files[0];
                      setAchAttachedFile(file.name);
                      const reader = new FileReader();
                      reader.onload = (ev) => {
                        if (ev.target?.result) {
                          setAchAttachedFileDataUrl(ev.target.result as string);
                        }
                      };
                      reader.readAsDataURL(file);
                    }
                  }}
                />
                {achAttachedFile && (
                  <p className="text-[11px] text-emerald-700 font-semibold mt-1 flex items-center gap-1">
                    <Check className="w-3 h-3" />
                    <span>Archivo seleccionado: {achAttachedFile}</span>
                  </p>
                )}
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowReportAchModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg shadow-sm cursor-pointer"
                >
                  Enviar para Verificación Bancaria
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: ENVÍO DE AVISO POR WHATSAPP A ESTUDIANTES */}
      {showWhatsAppModal && studentForWhatsApp && (
        <StudentWhatsAppNoticeModal
          isOpen={showWhatsAppModal}
          student={studentForWhatsApp.user}
          balance={studentForWhatsApp.balance}
          onClose={() => {
            setShowWhatsAppModal(false);
            setStudentForWhatsApp(null);
          }}
          onSuccess={() => {
            loadData();
          }}
        />
      )}

      {/* MODAL: ENVÍO DE CORREO DIRECTO A ESTUDIANTES */}
      {showEmailModal && (
        <EmailSenderModal
          isOpen={showEmailModal}
          onClose={() => {
            setShowEmailModal(false);
            setStudentForEmail(null);
          }}
          allUsers={allUsers}
          preselectedUser={studentForEmail ? studentForEmail.user : null}
          initialSubject={studentForEmail?.initialSubject}
          initialMessage={studentForEmail?.initialMessage}
          onSuccess={() => {
            loadData();
          }}
        />
      )}

      {/* MODAL: PAGO CON TARJETA DE DÉBITO O CRÉDITO */}
      {showCardPaymentModal && (
        <CardPaymentModal
          isOpen={showCardPaymentModal}
          onClose={() => setShowCardPaymentModal(false)}
          currentUser={currentUser}
          studentsList={studentsList}
          preselectedStudentId={selectedStudentId || undefined}
          onPaymentSuccess={() => {
            loadData();
            if (onRefreshData) onRefreshData();
          }}
        />
      )}

      {/* MODAL: GESTOR Y GENERADOR DE LINKS DE PAGO */}
      {showPaymentLinkModal && (
        <PaymentLinkModal
          isOpen={showPaymentLinkModal}
          onClose={() => setShowPaymentLinkModal(false)}
          currentUser={currentUser}
          studentsList={studentsList}
          preselectedStudentId={selectedStudentId || undefined}
          onPaymentSuccess={() => {
            loadData();
            if (onRefreshData) onRefreshData();
          }}
        />
      )}
    </div>
  );
};
