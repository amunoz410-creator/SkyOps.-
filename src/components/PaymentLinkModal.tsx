import React, { useState, useEffect, useMemo } from 'react';
import {
  Link2,
  Copy,
  Check,
  Share2,
  ExternalLink,
  QrCode,
  Calendar,
  Clock,
  DollarSign,
  AlertCircle,
  CheckCircle2,
  X,
  Plus,
  RefreshCw,
  Mail,
  User as UserIcon,
  CreditCard,
  Lock,
  MessageSquare,
  Sparkles,
  Plane,
  Trash2
} from 'lucide-react';
import { User, PaymentLink, CardPaymentPayload } from '../types';
import { api } from '../services/api';

interface PaymentLinkModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: User;
  studentsList: User[];
  preselectedStudentId?: string;
  onPaymentSuccess?: () => void;
}

export const PaymentLinkModal: React.FC<PaymentLinkModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  studentsList,
  preselectedStudentId,
  onPaymentSuccess
}) => {
  const isStudent = currentUser.rol === 'estudiante';

  // Pestaña activa: 'crear' | 'lista' | 'checkout'
  const [activeTab, setActiveTab] = useState<'crear' | 'lista' | 'checkout'>('crear');
  const [linksList, setLinksList] = useState<PaymentLink[]>([]);
  const [loadingLinks, setLoadingLinks] = useState<boolean>(false);
  const [copiedToken, setCopiedToken] = useState<string | null>(null);

  // Formulario de creación
  const [studentId, setStudentId] = useState<string>(() => {
    if (preselectedStudentId) return preselectedStudentId;
    if (isStudent) return currentUser.id;
    return studentsList[0]?.id || '';
  });
  const [amount, setAmount] = useState<string>('');
  const [hoursEstimated, setHoursEstimated] = useState<number | undefined>(undefined);
  const [concept, setConcept] = useState<string>('Abono / Acreditación a Cuenta');
  const [expiresInDays, setExpiresInDays] = useState<number>(7);
  const [isCreating, setIsCreating] = useState<boolean>(false);
  const [createdLink, setCreatedLink] = useState<PaymentLink | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  // Estado para el Checkout interactivo de un link
  const [checkoutLink, setCheckoutLink] = useState<PaymentLink | null>(null);
  const [checkoutCard, setCheckoutCard] = useState({
    cardholderName: '',
    cardNumber: '',
    expiry: '',
    cvv: '',
    cardType: 'debito' as 'debito' | 'credito'
  });
  const [isPayingLink, setIsPayingLink] = useState<boolean>(false);
  const [checkoutSuccess, setCheckoutSuccess] = useState<boolean>(false);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);

  // Sincronizar estudiante preseleccionado
  useEffect(() => {
    if (preselectedStudentId) {
      setStudentId(preselectedStudentId);
    } else if (isStudent) {
      setStudentId(currentUser.id);
    } else if (!studentId && studentsList.length > 0) {
      setStudentId(studentsList[0].id);
    }
  }, [preselectedStudentId, isStudent, currentUser.id, studentsList]);

  // Cargar lista de enlaces
  const fetchLinks = async () => {
    try {
      setLoadingLinks(true);
      const studentFilter = isStudent ? currentUser.id : undefined;
      const res = await api.getPaymentLinks(studentFilter);
      if (res?.links) {
        setLinksList(res.links);
      }
    } catch (err) {
      console.error('Error cargando enlaces de pago:', err);
    } finally {
      setLoadingLinks(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchLinks();
    }
  }, [isOpen]);

  const activeStudent = useMemo(() => {
    if (isStudent) return currentUser;
    return studentsList.find(s => s.id === studentId) || studentsList[0] || currentUser;
  }, [studentId, isStudent, currentUser, studentsList]);

  // Manejar creación de enlace
  const handleCreateLink = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      setFormError('El monto debe ser superior a 0 USD.');
      return;
    }

    try {
      setIsCreating(true);
      const res = await api.createPaymentLink({
        studentId: activeStudent.id,
        amount: numAmount,
        concept: concept.trim() || `Abono de Horas de Vuelo ($${numAmount.toFixed(2)} USD)`,
        hoursEstimated: hoursEstimated || undefined,
        expiresInDays,
        createdBy: `${currentUser.nombre} (${currentUser.rol})`
      });

      if (res?.link) {
        setCreatedLink(res.link);
        setLinksList(prev => [res.link, ...prev]);
      }
    } catch (err: any) {
      console.error('Error al generar enlace:', err);
      setFormError(err.message || 'No se pudo generar el enlace de pago.');
    } finally {
      setIsCreating(false);
    }
  };

  // Copiar link al portapapeles
  const handleCopyLink = (url: string, token: string) => {
    navigator.clipboard.writeText(url);
    setCopiedToken(token);
    setTimeout(() => setCopiedToken(null), 2500);
  };

  // Compartir por WhatsApp
  const handleShareWhatsApp = (link: PaymentLink) => {
    const text = `Hola ${link.estudiante_nombre}, te compartimos tu enlace de pago seguro de SkyOps Flight Academy:\n\n*Concepto:* ${link.concepto}\n*Monto:* $${link.monto.toFixed(2)} USD\n*Vence:* ${new Date(link.expira_en).toLocaleDateString('es-PA')}\n\nPuedes pagar directamente con Tarjeta de Débito (Clave) o Crédito aquí:\n${link.url_pago}`;
    const waUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`;
    window.open(waUrl, '_blank');
  };

  // Abrir Checkout para pagar un link
  const handleOpenCheckout = (link: PaymentLink) => {
    setCheckoutLink(link);
    setCheckoutCard({
      cardholderName: link.estudiante_nombre,
      cardNumber: '',
      expiry: '',
      cvv: '',
      cardType: 'debito'
    });
    setCheckoutSuccess(false);
    setCheckoutError(null);
    setActiveTab('checkout');
  };

  // Pagar enlace desde la pantalla de Checkout
  const handlePayCheckout = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!checkoutLink) return;
    setCheckoutError(null);

    const cleanCard = checkoutCard.cardNumber.replace(/\s+/g, '');
    if (cleanCard.length < 15) {
      setCheckoutError('Ingresa un número de tarjeta válido.');
      return;
    }
    if (!checkoutCard.expiry || checkoutCard.expiry.length < 5) {
      setCheckoutError('Ingresa la fecha de expiración MM/AA.');
      return;
    }
    if (!checkoutCard.cvv || checkoutCard.cvv.length < 3) {
      setCheckoutError('Ingresa el CVV de la tarjeta.');
      return;
    }

    try {
      setIsPayingLink(true);
      const paymentPayload: CardPaymentPayload = {
        studentId: checkoutLink.estudiante_id,
        amount: checkoutLink.monto,
        concept: checkoutLink.concepto,
        cardholderName: checkoutCard.cardholderName.trim(),
        cardNumber: cleanCard,
        expiry: checkoutCard.expiry.trim(),
        cvv: checkoutCard.cvv.trim(),
        cardType: checkoutCard.cardType,
        paymentLinkId: checkoutLink.id,
        hoursEstimated: checkoutLink.horas_estimadas
      };

      await api.payPaymentLink(checkoutLink.token, paymentPayload);
      setCheckoutSuccess(true);
      await fetchLinks();
      if (onPaymentSuccess) {
        onPaymentSuccess();
      }
    } catch (err: any) {
      console.error('Error al pagar link:', err);
      setCheckoutError(err.message || 'Error al procesar el pago del enlace.');
    } finally {
      setIsPayingLink(false);
    }
  };

  // Cancelar enlace
  const handleCancelLink = async (id: string) => {
    if (!window.confirm('¿Seguro que deseas cancelar este enlace de pago? Ya no podrá ser utilizado.')) return;
    try {
      await api.cancelPaymentLink(id);
      setLinksList(prev => prev.map(l => l.id === id ? { ...l, estado: 'cancelado' } : l));
    } catch (err: any) {
      alert('Error al cancelar el link: ' + err.message);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-3xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden my-auto animate-in fade-in zoom-in-95 duration-200">
        
        {/* Encabezado */}
        <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 p-5 text-white flex items-center justify-between border-b border-indigo-500/20">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/30">
              <Link2 className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-indigo-400">SkyOps Pay Link</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                  Cobro Digital & Compartir
                </span>
              </div>
              <h3 className="text-lg font-bold text-white leading-tight">
                Enlaces de Pago Digitales (Payment Links)
              </h3>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Barra de Pestañas */}
        <div className="flex items-center gap-2 px-6 pt-4 border-b border-slate-200 bg-slate-50/50">
          <button
            onClick={() => setActiveTab('crear')}
            className={`pb-3 px-3 text-xs font-bold transition-all border-b-2 cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'crear'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Generar Nuevo Link</span>
          </button>

          <button
            onClick={() => { setActiveTab('lista'); fetchLinks(); }}
            className={`pb-3 px-3 text-xs font-bold transition-all border-b-2 cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'lista'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Link2 className="w-3.5 h-3.5" />
            <span>Historial de Enlaces ({linksList.length})</span>
          </button>

          {checkoutLink && (
            <button
              onClick={() => setActiveTab('checkout')}
              className={`pb-3 px-3 text-xs font-bold transition-all border-b-2 cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'checkout'
                  ? 'border-indigo-600 text-indigo-600'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <CreditCard className="w-3.5 h-3.5" />
              <span>Checkout Activo (${checkoutLink.monto.toFixed(2)})</span>
            </button>
          )}
        </div>

        {/* CONTENIDO PRINCIPAL */}
        <div className="p-6">
          
          {/* TAB 1: GENERAR LINK DE PAGO */}
          {activeTab === 'crear' && (
            <div>
              {createdLink ? (
                /* Link recién creado con opciones para compartir */
                <div className="space-y-5 animate-in fade-in duration-200">
                  <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-start gap-3">
                    <CheckCircle2 className="w-6 h-6 text-emerald-600 flex-shrink-0 mt-0.5" />
                    <div className="space-y-1">
                      <h4 className="font-extrabold text-slate-900 text-sm">¡Enlace de Pago Generado Exitosamente!</h4>
                    </div>
                  </div>

                  {/* Resumen del Link */}
                  <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-500">Estudiante:</span>
                      <strong className="text-slate-900">{createdLink.estudiante_nombre}</strong>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-500">Monto del Enlace:</span>
                      <strong className="text-indigo-700 font-extrabold text-base">${createdLink.monto.toFixed(2)} USD</strong>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-500">Concepto:</span>
                      <span className="text-slate-800 font-medium">{createdLink.concepto}</span>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-500">Expira el:</span>
                      <span className="text-slate-600">{new Date(createdLink.expira_en).toLocaleDateString('es-PA')}</span>
                    </div>

                    {/* Caja de Copiar Link */}
                    <div className="pt-2">
                      <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                        URL Pública de Cobro:
                      </label>
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          readOnly
                          value={createdLink.url_pago}
                          className="w-full text-xs font-mono px-3 py-2 bg-white border border-slate-300 rounded-lg select-all text-slate-800"
                        />
                        <button
                          type="button"
                          onClick={() => handleCopyLink(createdLink.url_pago, createdLink.token)}
                          className="px-3.5 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer flex-shrink-0"
                        >
                          {copiedToken === createdLink.token ? (
                            <>
                              <Check className="w-3.5 h-3.5 text-white" />
                              <span>¡Copiado!</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-3.5 h-3.5" />
                              <span>Copiar</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Acciones Rápidas para Compartir */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => handleShareWhatsApp(createdLink)}
                      className="p-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-sm transition-all cursor-pointer"
                    >
                      <MessageSquare className="w-4 h-4" />
                      <span>Compartir por WhatsApp</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleOpenCheckout(createdLink)}
                      className="p-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-sm transition-all cursor-pointer"
                    >
                      <CreditCard className="w-4 h-4" />
                      <span>Abrir Pasarela de Pago Ahora</span>
                    </button>
                  </div>

                  <div className="text-center pt-2">
                    <button
                      type="button"
                      onClick={() => setCreatedLink(null)}
                      className="text-xs text-indigo-600 font-bold hover:underline cursor-pointer"
                    >
                      + Generar otro enlace de pago
                    </button>
                  </div>
                </div>
              ) : (
                /* Formulario de creación */
                <form onSubmit={handleCreateLink} className="space-y-4">
                  {/* Selector de Estudiante */}
                  {!isStudent ? (
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1.5">
                        <UserIcon className="w-3.5 h-3.5 text-indigo-600" />
                        Estudiante Destinatario:
                      </label>
                      <select
                        value={studentId}
                        onChange={(e) => setStudentId(e.target.value)}
                        className="w-full text-xs font-medium px-3 py-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                      >
                        {studentsList.map(s => (
                          <option key={s.id} value={s.id}>
                            {s.nombre} • {s.correo}
                          </option>
                        ))}
                      </select>
                      <div className="flex items-center gap-1.5 text-[11px] text-slate-500 mt-1">
                        <Mail className="w-3 h-3 text-indigo-600" />
                        <span>Correo registrado para notificación: <strong>{activeStudent.correo}</strong></span>
                      </div>
                    </div>
                  ) : (
                    <div className="p-3 bg-indigo-50/60 rounded-xl border border-indigo-200 text-xs">
                      <span className="text-slate-500 block">Estudiante:</span>
                      <strong className="text-slate-900 font-bold text-sm">{currentUser.nombre}</strong>
                      <span className="text-indigo-700 block text-[11px] mt-0.5">
                        Notificaciones a: <strong>{currentUser.correo}</strong>
                      </span>
                    </div>
                  )}

                  {/* Monto Libre y Vigencia */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Monto Libre a Acreditar ($ USD):
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
                          placeholder="Ej. 150.00"
                          className="w-full text-sm font-extrabold pl-8 pr-3 py-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-slate-900"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Vigencia del Link:
                      </label>
                      <select
                        value={expiresInDays}
                        onChange={(e) => setExpiresInDays(Number(e.target.value))}
                        className="w-full text-xs font-medium px-3 py-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                      >
                        <option value={1}>24 Horas (Urgente)</option>
                        <option value={3}>3 Días</option>
                        <option value={7}>7 Días (Recomendado)</option>
                        <option value={15}>15 Días</option>
                        <option value={30}>30 Días</option>
                      </select>
                    </div>
                  </div>

                  {/* Concepto */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Concepto o Motivo del Cobro:
                    </label>
                    <input
                      type="text"
                      required
                      value={concept}
                      onChange={(e) => setConcept(e.target.value)}
                      placeholder="Ej. Abono de 2 Horas de Vuelo"
                      className="w-full text-xs font-medium px-3 py-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-slate-800"
                    />
                  </div>

                  {formError && (
                    <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700 flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />
                      <span>{formError}</span>
                    </div>
                  )}

                  {/* Botón de Enviar */}
                  <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={onClose}
                      className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
                    >
                      Cerrar
                    </button>

                    <button
                      type="submit"
                      disabled={isCreating}
                      className="px-6 py-2.5 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-600/30 flex items-center gap-2 transition-all cursor-pointer disabled:opacity-50"
                    >
                      <Sparkles className="w-4 h-4" />
                      <span>{isCreating ? 'Generando Enlace...' : 'Generar Enlace de Pago'}</span>
                    </button>
                  </div>
                </form>
              )}
            </div>
          )}

          {/* TAB 2: HISTORIAL DE ENLACES */}
          {activeTab === 'lista' && (
            <div className="space-y-4">
              <div className="flex items-center justify-end">
                <button
                  onClick={fetchLinks}
                  disabled={loadingLinks}
                  className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 transition-colors cursor-pointer"
                  title="Actualizar"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${loadingLinks ? 'animate-spin' : ''}`} />
                </button>
              </div>

              {linksList.length === 0 ? (
                <div className="py-12 text-center text-slate-400 space-y-2">
                  <Link2 className="w-10 h-10 mx-auto text-slate-300" />
                  <p className="text-xs font-medium">No se han generado enlaces de pago aún.</p>
                  <button
                    onClick={() => setActiveTab('crear')}
                    className="text-xs text-indigo-600 font-bold hover:underline"
                  >
                    Crear el primer enlace ahora
                  </button>
                </div>
              ) : (
                <div className="divide-y divide-slate-100 max-h-[380px] overflow-y-auto pr-1">
                  {linksList.map((link) => {
                    const isPaid = link.estado === 'pagado';
                    const isCancelled = link.estado === 'cancelado';
                    const isExpired = new Date(link.expira_en).getTime() < Date.now() && !isPaid;

                    return (
                      <div key={link.id} className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50/80 px-2 rounded-xl transition-colors">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-extrabold text-sm text-slate-900">${link.monto.toFixed(2)} USD</span>
                            
                            {isPaid ? (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 flex items-center gap-1">
                                <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Pagado
                              </span>
                            ) : isCancelled ? (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-200 text-slate-700">
                                Cancelado
                              </span>
                            ) : isExpired ? (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800">
                                Expirado
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800">
                                Pendiente
                              </span>
                            )}

                            <span className="text-slate-400 text-xs">•</span>
                            <span className="text-xs font-bold text-slate-800">{link.estudiante_nombre}</span>
                          </div>

                          <p className="text-xs text-slate-600">{link.concepto}</p>
                          
                          <div className="flex items-center gap-3 text-[11px] text-slate-400">
                            <span>Vence: {new Date(link.expira_en).toLocaleDateString('es-PA')}</span>
                            <span>•</span>
                            <span>Notif: {link.estudiante_correo}</span>
                          </div>
                        </div>

                        {/* Botones de acción */}
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <button
                            type="button"
                            onClick={() => handleCopyLink(link.url_pago, link.token)}
                            className="p-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors cursor-pointer"
                            title="Copiar URL"
                          >
                            {copiedToken === link.token ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                          </button>

                          <button
                            type="button"
                            onClick={() => handleShareWhatsApp(link)}
                            className="p-2 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 transition-colors cursor-pointer"
                            title="Compartir por WhatsApp"
                          >
                            <MessageSquare className="w-4 h-4" />
                          </button>

                          {!isPaid && !isCancelled && (
                            <button
                              type="button"
                              onClick={() => handleOpenCheckout(link)}
                              className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold flex items-center gap-1 transition-all cursor-pointer"
                            >
                              <CreditCard className="w-3.5 h-3.5" />
                              <span>Pagar</span>
                            </button>
                          )}

                          {!isPaid && !isCancelled && !isStudent && (
                            <button
                              type="button"
                              onClick={() => handleCancelLink(link.id)}
                              className="p-2 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-600 transition-colors cursor-pointer"
                              title="Cancelar enlace"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* TAB 3: CHECKOUT ACTIVO DEL ENLACE DE PAGO */}
          {activeTab === 'checkout' && checkoutLink && (
            <div className="space-y-5">
              {checkoutSuccess ? (
                <div className="text-center py-6 space-y-4">
                  <div className="w-16 h-16 rounded-full bg-emerald-100 border-2 border-emerald-500 text-emerald-600 flex items-center justify-center mx-auto animate-bounce">
                    <CheckCircle2 className="w-10 h-10" />
                  </div>
                  <h4 className="text-xl font-black text-slate-900">¡Enlace de Pago Cobrado Exitosamente!</h4>
                  <div className="text-sm font-black text-emerald-600">
                    +${checkoutLink.monto.toFixed(2)} USD • {checkoutLink.estudiante_nombre}
                  </div>

                  <div className="pt-3">
                    <button
                      type="button"
                      onClick={() => { setActiveTab('lista'); setCheckoutLink(null); }}
                      className="px-6 py-2 rounded-xl text-xs font-bold bg-indigo-600 text-white hover:bg-indigo-500 cursor-pointer"
                    >
                      Volver a Enlaces
                    </button>
                  </div>
                </div>
              ) : (
                <div>
                  {/* Resumen del Link en Checkout */}
                  <div className="p-4 rounded-xl bg-gradient-to-r from-indigo-900 to-slate-900 text-white flex items-center justify-between mb-4">
                    <div>
                      <span className="text-[10px] uppercase font-bold text-indigo-300">Factura de Enlace SkyOps Pay</span>
                      <h4 className="font-extrabold text-base">{checkoutLink.concepto}</h4>
                      <span className="text-xs text-slate-300">Estudiante: {checkoutLink.estudiante_nombre}</span>
                    </div>

                    <div className="text-right">
                      <span className="text-[10px] text-slate-400 uppercase block">Total a Pagar</span>
                      <span className="text-2xl font-black text-emerald-400">${checkoutLink.monto.toFixed(2)} USD</span>
                    </div>
                  </div>

                  {/* Formulario de Pago con Tarjeta en el Checkout */}
                  <form onSubmit={handlePayCheckout} className="space-y-4">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">
                          Tipo de Tarjeta:
                        </label>
                        <select
                          value={checkoutCard.cardType}
                          onChange={(e) => setCheckoutCard(prev => ({ ...prev, cardType: e.target.value as any }))}
                          className="w-full text-xs font-medium px-3 py-2 bg-white border border-slate-300 rounded-lg outline-none"
                        >
                          <option value="debito">Tarjeta Débito (Clave / Visa Débito)</option>
                          <option value="credito">Tarjeta de Crédito</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">
                          Titular de la Tarjeta:
                        </label>
                        <input
                          type="text"
                          required
                          value={checkoutCard.cardholderName}
                          onChange={(e) => setCheckoutCard(prev => ({ ...prev, cardholderName: e.target.value.toUpperCase() }))}
                          placeholder="NOMBRE DEL TITULAR"
                          className="w-full text-xs font-bold uppercase px-3 py-2 bg-white border border-slate-300 rounded-lg outline-none"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Número de Tarjeta:
                      </label>
                      <input
                        type="text"
                        required
                        value={checkoutCard.cardNumber}
                        onChange={(e) => {
                          const digitsOnly = e.target.value.replace(/\D/g, '').slice(0, 16);
                          const formatted = digitsOnly.match(/.{1,4}/g)?.join(' ') || digitsOnly;
                          setCheckoutCard(prev => ({ ...prev, cardNumber: formatted }));
                        }}
                        maxLength={19}
                        placeholder="4000 1234 5678 9010"
                        className="w-full text-sm font-mono font-bold tracking-wider px-3 py-2 bg-white border border-slate-300 rounded-lg outline-none"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">
                          Vencimiento:
                        </label>
                        <input
                          type="text"
                          required
                          value={checkoutCard.expiry}
                          onChange={(e) => {
                            let val = e.target.value.replace(/\D/g, '').slice(0, 4);
                            if (val.length >= 2) val = val.slice(0, 2) + '/' + val.slice(2);
                            setCheckoutCard(prev => ({ ...prev, expiry: val }));
                          }}
                          maxLength={5}
                          placeholder="MM/AA"
                          className="w-full text-xs font-mono font-bold text-center px-3 py-2 bg-white border border-slate-300 rounded-lg outline-none"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">
                          CVV:
                        </label>
                        <input
                          type="password"
                          required
                          value={checkoutCard.cvv}
                          onChange={(e) => {
                            const digitsOnly = e.target.value.replace(/\D/g, '').slice(0, 4);
                            setCheckoutCard(prev => ({ ...prev, cvv: digitsOnly }));
                          }}
                          maxLength={4}
                          placeholder="123"
                          className="w-full text-xs font-mono font-bold text-center px-3 py-2 bg-white border border-slate-300 rounded-lg outline-none"
                        />
                      </div>
                    </div>

                    {checkoutError && (
                      <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700 flex items-center gap-2">
                        <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />
                        <span>{checkoutError}</span>
                      </div>
                    )}

                    <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                      <button
                        type="button"
                        onClick={() => setActiveTab('lista')}
                        className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl"
                      >
                        Atrás
                      </button>

                      <button
                        type="submit"
                        disabled={isPayingLink}
                        className="px-6 py-2.5 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-600/30 flex items-center gap-2 cursor-pointer disabled:opacity-50"
                      >
                        <Lock className="w-4 h-4" />
                        <span>{isPayingLink ? 'Procesando Pago Seguro...' : `Pagar $${checkoutLink.monto.toFixed(2)} USD Ahora`}</span>
                      </button>
                    </div>
                  </form>
                </div>
              )}
            </div>
          )}

        </div>
      </div>
    </div>
  );
};
