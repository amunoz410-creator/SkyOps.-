import React, { useState, useEffect, useMemo } from 'react';
import {
  CreditCard,
  ShieldCheck,
  Lock,
  CheckCircle2,
  AlertCircle,
  X,
  Printer,
  Sparkles,
  Plane,
  ArrowRight,
  RefreshCw,
  Mail,
  User as UserIcon,
  DollarSign,
  Clock
} from 'lucide-react';
import { User, Transaction, CardPaymentPayload } from '../types';
import { api } from '../services/api';

interface CardPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: User;
  studentsList: User[];
  preselectedStudentId?: string;
  onPaymentSuccess?: (transaction: Transaction, newBalance: number) => void;
}

export const CardPaymentModal: React.FC<CardPaymentModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  studentsList,
  preselectedStudentId,
  onPaymentSuccess
}) => {
  const isStudent = currentUser.rol === 'estudiante';

  // Selección de estudiante
  const [selectedStudentId, setSelectedStudentId] = useState<string>(() => {
    if (preselectedStudentId) return preselectedStudentId;
    if (isStudent) return currentUser.id;
    return studentsList[0]?.id || '';
  });

  useEffect(() => {
    if (preselectedStudentId) {
      setSelectedStudentId(preselectedStudentId);
    } else if (isStudent) {
      setSelectedStudentId(currentUser.id);
    } else if (!selectedStudentId && studentsList.length > 0) {
      setSelectedStudentId(studentsList[0].id);
    }
  }, [preselectedStudentId, isStudent, currentUser.id, studentsList]);

  // Datos del formulario de pago
  const [cardType, setCardType] = useState<'debito' | 'credito'>('debito');
  const [amount, setAmount] = useState<string>('');
  const [hoursEstimated, setHoursEstimated] = useState<number | undefined>(undefined);
  const [concept, setConcept] = useState<string>('Abono / Acreditación a Cuenta');
  const [cardNumber, setCardNumber] = useState<string>('');
  const [cardholderName, setCardholderName] = useState<string>(() => {
    if (isStudent) return currentUser.nombre || '';
    return '';
  });
  const [expiry, setExpiry] = useState<string>('');
  const [cvv, setCvv] = useState<string>('');
  const [billingZip, setBillingZip] = useState<string>('0801');

  // Estado del flujo
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [processStep, setProcessStep] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successReceipt, setSuccessReceipt] = useState<{
    transaction: Transaction;
    balance: number;
    authCode: string;
  } | null>(null);

  // Obtener objeto del estudiante seleccionado
  const activeStudent = useMemo(() => {
    if (isStudent) return currentUser;
    return studentsList.find(s => s.id === selectedStudentId) || studentsList[0] || currentUser;
  }, [selectedStudentId, isStudent, currentUser, studentsList]);

  // Actualizar nombre del titular por defecto si cambia el estudiante
  useEffect(() => {
    if (activeStudent && !cardholderName) {
      setCardholderName(activeStudent.nombre || '');
    }
  }, [activeStudent]);

  // Detección de marca de tarjeta
  const cardBrand = useMemo(() => {
    const raw = cardNumber.replace(/\s+/g, '');
    if (raw.startsWith('4')) return { brand: 'visa', label: 'Visa', color: 'from-blue-600 to-indigo-800' };
    if (/^(5[1-5]|222[1-9]|22[3-9]|2[3-6]|27[0-1]|2720)/.test(raw)) return { brand: 'mastercard', label: 'Mastercard', color: 'from-amber-600 to-rose-700' };
    if (/^(34|37)/.test(raw)) return { brand: 'amex', label: 'American Express', color: 'from-cyan-700 to-blue-900' };
    if (raw.startsWith('5018') || raw.startsWith('5020') || raw.startsWith('6')) return { brand: 'clave', label: 'Clave / Débito', color: 'from-emerald-700 to-teal-900' };
    return { brand: 'generic', label: 'Tarjeta Bancaria', color: 'from-slate-800 to-slate-900' };
  }, [cardNumber]);

  // Formateadores de inputs
  const handleCardNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const digitsOnly = e.target.value.replace(/\D/g, '').slice(0, 16);
    const formatted = digitsOnly.match(/.{1,4}/g)?.join(' ') || digitsOnly;
    setCardNumber(formatted);
  };

  const handleExpiryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let val = e.target.value.replace(/\D/g, '').slice(0, 4);
    if (val.length >= 2) {
      val = val.slice(0, 2) + '/' + val.slice(2);
    }
    setExpiry(val);
  };

  const handleCvvChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const digitsOnly = e.target.value.replace(/\D/g, '').slice(0, 4);
    setCvv(digitsOnly);
  };

  // Procesar Pago
  const handleSubmitPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const numClean = cardNumber.replace(/\s+/g, '');
    if (numClean.length < 15) {
      setErrorMessage('Por favor ingresa un número de tarjeta válido (mínimo 15 dígitos).');
      return;
    }

    if (!expiry || !expiry.includes('/') || expiry.length < 5) {
      setErrorMessage('Ingresa la fecha de vencimiento en formato MM/AA.');
      return;
    }

    if (!cvv || cvv.length < 3) {
      setErrorMessage('Ingresa un código de seguridad (CVV) válido de 3 o 4 dígitos.');
      return;
    }

    if (!cardholderName.trim()) {
      setErrorMessage('Ingresa el nombre del titular tal como aparece en la tarjeta.');
      return;
    }

    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      setErrorMessage('El monto a pagar debe ser mayor a 0 USD.');
      return;
    }

    try {
      setIsProcessing(true);
      setProcessStep('Conectando con la Pasarela Bancaria Segura (Cifrado TLS 1.3 / AES-256)...');
      await new Promise(r => setTimeout(r, 600));

      setProcessStep('Verificando tokenización y validación de fondos 3D-Secure...');
      await new Promise(r => setTimeout(r, 700));

      setProcessStep('Acreditando saldo y emitiendo comprobante fiscal...');

      const payload: CardPaymentPayload = {
        studentId: activeStudent.id,
        amount: numAmount,
        concept: concept.trim() || `Abono de horas de vuelo (${cardType === 'debito' ? 'Débito' : 'Crédito'})`,
        cardholderName: cardholderName.trim(),
        cardNumber: numClean,
        expiry: expiry.trim(),
        cvv: cvv.trim(),
        cardType,
        billingZip: billingZip.trim() || '0801',
        hoursEstimated: hoursEstimated || undefined,
        email: activeStudent.correo
      };

      const result = await api.processCardPayment(payload);

      setProcessStep('Despachando notificación de comprobante al correo registrado...');
      await new Promise(r => setTimeout(r, 500));

      setSuccessReceipt({
        transaction: result.transaction,
        balance: result.balance,
        authCode: result.authCode
      });

      if (onPaymentSuccess) {
        onPaymentSuccess(result.transaction, result.balance);
      }
    } catch (err: any) {
      console.error('Error procesando pago:', err);
      setErrorMessage(err.message || 'No se pudo procesar el pago con la pasarela bancaria. Intenta nuevamente.');
    } finally {
      setIsProcessing(false);
      setProcessStep('');
    }
  };

  // Imprimir recibo
  const handlePrintReceipt = () => {
    window.print();
  };

  const handleResetModal = () => {
    setSuccessReceipt(null);
    setCardNumber('');
    setExpiry('');
    setCvv('');
    setErrorMessage(null);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden my-auto animate-in fade-in zoom-in-95 duration-200">
        
        {/* Encabezado Principal */}
        <div className="bg-gradient-to-r from-slate-900 via-sky-950 to-slate-900 p-5 text-white flex items-center justify-between border-b border-sky-500/20">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-sky-500 to-blue-600 flex items-center justify-center shadow-lg shadow-sky-500/30">
              <CreditCard className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-sky-400">SkyOps Pay Gateway</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                  <Lock className="w-2.5 h-2.5" /> Pago Seguro SSL
                </span>
              </div>
              <h3 className="text-lg font-bold text-white leading-tight">
                {successReceipt ? 'Comprobante de Pago Acreditado' : 'Pago con Tarjeta de Débito o Crédito'}
              </h3>
            </div>
          </div>

          <button
            onClick={handleResetModal}
            className="w-8 h-8 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* CONTENIDO DEL MODAL */}
        <div className="p-6">
          {/* VISTA 1: RECIBO EXITOSO */}
          {successReceipt ? (
            <div className="space-y-6">
              <div className="text-center py-3">
                <div className="w-16 h-16 rounded-full bg-emerald-100 border-2 border-emerald-500 text-emerald-600 flex items-center justify-center mx-auto mb-3 animate-bounce">
                  <CheckCircle2 className="w-10 h-10" />
                </div>
                <h4 className="text-2xl font-black text-slate-900">¡Pago Aprobado Exitosamente!</h4>
              </div>

              {/* Tarjeta de Recibo Digital Oficial */}
              <div className="p-5 rounded-2xl bg-gradient-to-b from-slate-50 to-white border-2 border-slate-200 shadow-sm relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 rounded-full blur-2xl -z-10" />
                
                <div className="flex items-center justify-between pb-3 border-b border-slate-200">
                  <div className="flex items-center gap-2">
                    <Plane className="w-5 h-5 text-sky-600" />
                    <span className="font-extrabold text-sm text-slate-900">SKYOPS FLIGHT ACADEMY</span>
                  </div>
                  <span className="text-xs font-mono text-slate-500 font-bold">
                    {new Date().toLocaleDateString('es-PA')} {new Date().toLocaleTimeString('es-PA', { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-4 py-4 text-xs border-b border-slate-200">
                  <div>
                    <span className="text-slate-500 block uppercase text-[10px] font-bold">Estudiante / Titular:</span>
                    <span className="font-bold text-slate-900 text-sm">{activeStudent.nombre}</span>
                    <span className="text-slate-500 block text-[11px] mt-0.5">{activeStudent.correo}</span>
                  </div>

                  <div className="text-right">
                    <span className="text-slate-500 block uppercase text-[10px] font-bold">Monto Acreditado:</span>
                    <span className="font-black text-emerald-600 text-xl">+${parseFloat(amount).toFixed(2)} USD</span>
                    {hoursEstimated ? (
                      <span className="text-[11px] text-slate-500 block">Horas estimadas: {hoursEstimated} hrs</span>
                    ) : null}
                  </div>

                  <div>
                    <span className="text-slate-500 block uppercase text-[10px] font-bold">Método / Tarjeta:</span>
                    <span className="font-bold text-slate-800 capitalize">
                      {cardType === 'debito' ? 'Tarjeta Débito' : 'Tarjeta Crédito'} {cardBrand.label}
                    </span>
                    <span className="text-slate-500 font-mono block">•••• {cardNumber.slice(-4) || '4242'}</span>
                  </div>

                  <div className="text-right">
                    <span className="text-slate-500 block uppercase text-[10px] font-bold">Código Autorización:</span>
                    <span className="font-mono font-bold text-sky-700 bg-sky-50 px-2 py-0.5 rounded border border-sky-200 inline-block">
                      {successReceipt.authCode}
                    </span>
                    <span className="text-[10px] text-slate-400 block font-mono mt-0.5">
                      Ref: {successReceipt.transaction.pasarela_transaccion_id || 'SKYPAY-OK'}
                    </span>
                  </div>
                </div>

                <div className="pt-3 flex items-center justify-between text-xs">
                  <div>
                    <span className="text-slate-500 block text-[11px]">Nuevo Saldo Disponible:</span>
                    <span className="text-base font-extrabold text-slate-900">
                      ${successReceipt.balance.toLocaleString('en-US', { minimumFractionDigits: 2 })} USD
                    </span>
                  </div>

                  <div className="text-right">
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Acreditación Inmediata
                    </span>
                  </div>
                </div>
              </div>

              {/* Aviso del envío al correo registrado */}
              <div className="p-3.5 rounded-xl bg-sky-50 border border-sky-200 flex items-start gap-3 text-xs text-sky-900">
                <Mail className="w-4 h-4 text-sky-600 mt-0.5 flex-shrink-0" />
                <div>
                  <strong className="block font-bold">Notificación Despachada Automáticamente</strong>
                  <span>
                    El comprobante digital formal fue enviado al correo registrado de <strong>{activeStudent.nombre}</strong> (
                    <code className="font-mono font-bold text-sky-800">{activeStudent.correo}</code>) y a los oficiales del departamento de contabilidad.
                  </span>
                </div>
              </div>

              {/* Botones de acción */}
              <div className="flex flex-wrap items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={handlePrintReceipt}
                  className="px-4 py-2.5 rounded-xl text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 flex items-center gap-2 transition-all cursor-pointer"
                >
                  <Printer className="w-4 h-4" />
                  Imprimir Comprobante
                </button>

                <button
                  type="button"
                  onClick={handleResetModal}
                  className="px-6 py-2.5 rounded-xl text-xs font-bold bg-sky-600 hover:bg-sky-500 text-white shadow-lg shadow-sky-600/30 flex items-center gap-2 transition-all cursor-pointer"
                >
                  <span>Listo / Continuar</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          ) : (
            /* VISTA 2: FORMULARIO DE COBRO CON TARJETA */
            <form onSubmit={handleSubmitPayment} className="space-y-5">
              
              {/* Selector de Estudiante (Si es Admin o Contabilidad) */}
              {!isStudent && (
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1.5">
                    <UserIcon className="w-3.5 h-3.5 text-sky-600" />
                    Estudiante a Acreditar:
                  </label>
                  <select
                    value={selectedStudentId}
                    onChange={(e) => setSelectedStudentId(e.target.value)}
                    disabled={isProcessing}
                    className="w-full text-xs font-medium px-3 py-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-sky-500 outline-none"
                  >
                    {studentsList.map(s => (
                      <option key={s.id} value={s.id}>
                        {s.nombre} • {s.correo} ({s.curso_actual || 'Estudiante'})
                      </option>
                    ))}
                  </select>
                  <span className="text-[11px] text-slate-500 mt-1 block">
                    Correo registrado para notificaciones: <strong className="text-sky-700">{activeStudent.correo}</strong>
                  </span>
                </div>
              )}

              {/* Selector de Tipo de Tarjeta y Atajos de Monto */}
              <div className="space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wide">
                    Tipo de Tarjeta:
                  </label>
                  <div className="flex items-center p-0.5 bg-slate-100 rounded-lg border border-slate-200 text-xs">
                    <button
                      type="button"
                      onClick={() => setCardType('debito')}
                      className={`px-3 py-1 rounded-md font-bold transition-all cursor-pointer ${
                        cardType === 'debito'
                          ? 'bg-white text-sky-700 shadow-2xs'
                          : 'text-slate-500 hover:text-slate-800'
                      }`}
                    >
                      Tarjeta Débito (Clave / Visa)
                    </button>
                    <button
                      type="button"
                      onClick={() => setCardType('credito')}
                      className={`px-3 py-1 rounded-md font-bold transition-all cursor-pointer ${
                        cardType === 'credito'
                          ? 'bg-white text-sky-700 shadow-2xs'
                          : 'text-slate-500 hover:text-slate-800'
                      }`}
                    >
                      Tarjeta Crédito
                    </button>
                  </div>
                </div>

                {/* Campos de Monto Libre y Concepto */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Monto Libre a Acreditar (USD $):
                    </label>
                    <div className="relative">
                      <DollarSign className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                      <input
                        type="number"
                        step="0.01"
                        min="0.01"
                        required
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        disabled={isProcessing}
                        placeholder="Ej. 150.00"
                        className="w-full text-sm font-extrabold pl-8 pr-3 py-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-sky-500 outline-none text-slate-900"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Concepto del Cobro:
                    </label>
                    <input
                      type="text"
                      required
                      value={concept}
                      onChange={(e) => setConcept(e.target.value)}
                      disabled={isProcessing}
                      placeholder="Ej. Abono horas de vuelo"
                      className="w-full text-xs font-medium px-3 py-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-sky-500 outline-none text-slate-800"
                    />
                  </div>
                </div>
              </div>

              {/* PREVIEW VISUAL DE LA TARJETA (AERO SKY DESIGN) */}
              <div className="relative w-full max-w-sm mx-auto h-44 rounded-2xl p-5 text-white shadow-xl bg-gradient-to-tr from-slate-950 via-slate-900 to-sky-900 border border-sky-400/30 overflow-hidden select-none">
                <div className="absolute top-0 right-0 w-40 h-40 bg-sky-500/10 rounded-full blur-xl pointer-events-none" />

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <Plane className="w-4 h-4 text-sky-400" />
                    <span className="text-[11px] font-black tracking-widest text-sky-200">SKYOPS ACADEMY</span>
                  </div>

                  <span className="text-xs font-extrabold uppercase px-2 py-0.5 rounded bg-white/10 backdrop-blur-md text-sky-300 border border-white/20">
                    {cardBrand.label}
                  </span>
                </div>

                {/* Chip EMV y Contactless */}
                <div className="flex items-center gap-3 my-3">
                  <div className="w-8 h-6 rounded bg-gradient-to-r from-amber-300 to-yellow-500 border border-yellow-600 shadow-inner flex items-center justify-center">
                    <div className="w-5 h-4 border border-yellow-800/40 rounded-xs" />
                  </div>
                  <div className="text-[10px] text-sky-300/80 font-mono">●)))</div>
                </div>

                {/* Número de tarjeta formateado */}
                <div className="font-mono text-base tracking-wider text-slate-100 font-bold mb-2">
                  {cardNumber || '•••• •••• •••• ••••'}
                </div>

                {/* Titular y Expiración */}
                <div className="flex items-end justify-between text-xs">
                  <div>
                    <span className="text-[9px] uppercase tracking-wider text-slate-400 block font-bold">Titular</span>
                    <span className="font-semibold text-slate-200 tracking-wide uppercase truncate max-w-[180px] block">
                      {cardholderName || 'NOMBRE EN LA TARJETA'}
                    </span>
                  </div>

                  <div className="text-right">
                    <span className="text-[9px] uppercase tracking-wider text-slate-400 block font-bold">Vence</span>
                    <span className="font-mono font-semibold text-slate-200">{expiry || 'MM/AA'}</span>
                  </div>
                </div>
              </div>

              {/* CAMPOS DE LA TARJETA */}
              <div className="space-y-3 pt-1">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Número de Tarjeta (Débito o Crédito):
                  </label>
                  <div className="relative">
                    <CreditCard className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                    <input
                      type="text"
                      required
                      value={cardNumber}
                      onChange={handleCardNumberChange}
                      disabled={isProcessing}
                      maxLength={19}
                      placeholder="4000 1234 5678 9010"
                      className="w-full text-sm font-mono tracking-wider pl-9 pr-3 py-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-sky-500 outline-none text-slate-900 font-bold"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Nombre del Titular (tal como figura en el plástico):
                  </label>
                  <input
                    type="text"
                    required
                    value={cardholderName}
                    onChange={(e) => setCardholderName(e.target.value.toUpperCase())}
                    disabled={isProcessing}
                    placeholder="DANIEL ALVARADO"
                    className="w-full text-xs font-bold tracking-wide uppercase px-3 py-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-sky-500 outline-none text-slate-800"
                  />
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Vencimiento:
                    </label>
                    <input
                      type="text"
                      required
                      value={expiry}
                      onChange={handleExpiryChange}
                      disabled={isProcessing}
                      maxLength={5}
                      placeholder="MM/AA"
                      className="w-full text-xs font-mono font-bold text-center px-3 py-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-sky-500 outline-none text-slate-900"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1">
                      <Lock className="w-3 h-3 text-slate-400" />
                      CVV / CVC:
                    </label>
                    <input
                      type="password"
                      required
                      value={cvv}
                      onChange={handleCvvChange}
                      disabled={isProcessing}
                      maxLength={4}
                      placeholder="123"
                      className="w-full text-xs font-mono font-bold text-center px-3 py-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-sky-500 outline-none text-slate-900"
                    />
                  </div>

                  <div className="col-span-2 sm:col-span-1">
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Cód. Postal:
                    </label>
                    <input
                      type="text"
                      value={billingZip}
                      onChange={(e) => setBillingZip(e.target.value)}
                      disabled={isProcessing}
                      placeholder="0801"
                      className="w-full text-xs font-medium px-3 py-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-sky-500 outline-none text-slate-800"
                    />
                  </div>
                </div>
              </div>

              {/* Mensaje de error si falla */}
              {errorMessage && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />
                  <span>{errorMessage}</span>
                </div>
              )}

              {/* Indicador de proceso */}
              {isProcessing && (
                <div className="p-3.5 rounded-xl bg-sky-950 text-white border border-sky-500/40 flex items-center gap-3">
                  <RefreshCw className="w-5 h-5 text-sky-400 animate-spin flex-shrink-0" />
                  <div className="text-xs">
                    <strong className="block font-bold text-sky-300">Procesando transacción con pasarela...</strong>
                    <span className="text-slate-300">{processStep}</span>
                  </div>
                </div>
              )}

              {/* Nota de envío de notificación */}
              <div className="text-[11px] text-slate-500 flex items-center gap-1.5 bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                <ShieldCheck className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                <span>
                  Al completar el pago, el saldo se acredita de inmediato y el comprobante se enviará al correo registrado de{' '}
                  <strong className="text-slate-800">{activeStudent.nombre}</strong> (<code>{activeStudent.correo}</code>).
                </span>
              </div>

              {/* Botón de Enviar Pago */}
              <div className="flex items-center justify-end gap-3 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={onClose}
                  disabled={isProcessing}
                  className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
                >
                  Cancelar
                </button>

                <button
                  type="submit"
                  disabled={isProcessing}
                  className="px-6 py-2.5 rounded-xl text-xs font-bold bg-gradient-to-r from-sky-600 to-blue-700 hover:from-sky-500 hover:to-blue-600 text-white shadow-lg shadow-sky-600/30 flex items-center gap-2 transition-all cursor-pointer disabled:opacity-50"
                >
                  <CreditCard className="w-4 h-4" />
                  <span>
                    {isProcessing ? 'Autorizando Pago...' : `Pagar $${parseFloat(amount || '0').toFixed(2)} USD Ahora`}
                  </span>
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
