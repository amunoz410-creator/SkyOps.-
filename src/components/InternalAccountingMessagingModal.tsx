import React, { useState, useEffect, useRef } from 'react';
import { User, Transaction, InternalAccountingMessage, InternalAccountingMessageReply } from '../types';
import { api } from '../services/api';
import { ImageViewerModal } from './ImageViewerModal';
import { generateBankReceiptSvgUrl } from '../utils/receiptGenerator';
import {
  MessageSquare,
  Send,
  Share2,
  Inbox,
  Clock,
  AlertTriangle,
  FileText,
  User as UserIcon,
  CheckCircle2,
  X,
  Trash2,
  Check,
  RefreshCw,
  ExternalLink,
  ShieldCheck,
  Building2,
  Tag,
  Image as ImageIcon,
  UploadCloud,
  Eye,
  Download,
  ZoomIn,
  CornerDownRight,
  Sparkles,
  Paperclip,
  Maximize2
} from 'lucide-react';

interface InternalAccountingMessagingModalProps {
  currentUser: User;
  allUsers: User[];
  allTransactions?: Transaction[];
  preSelectedTransaction?: Transaction | null;
  onClose: () => void;
  onOpenTransactionVoucher?: (tx: Transaction) => void;
  onRefreshParent?: () => void;
}

export const InternalAccountingMessagingModal: React.FC<InternalAccountingMessagingModalProps> = ({
  currentUser,
  allUsers,
  allTransactions = [],
  preSelectedTransaction,
  onClose,
  onOpenTransactionVoucher,
  onRefreshParent
}) => {
  const [activeTab, setActiveTab] = useState<'inbox' | 'compose'>(
    preSelectedTransaction ? 'compose' : 'inbox'
  );
  const [messages, setMessages] = useState<InternalAccountingMessage[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [filterPriority, setFilterPriority] = useState<string>('todos');

  // Form State (Compose)
  const accountingAndAdminUsers = allUsers.filter(
    u => (u.rol === 'contabilidad' || u.rol === 'admin') && u.id !== currentUser.id
  );

  const [destinatarioId, setDestinatarioId] = useState<string>(
    accountingAndAdminUsers.length > 0 ? accountingAndAdminUsers[0].id : ''
  );
  const [asunto, setAsunto] = useState<string>(
    preSelectedTransaction
      ? `Revisión Comprobante ACH: ${preSelectedTransaction.estudiante_nombre} ($${preSelectedTransaction.monto.toFixed(2)})`
      : ''
  );
  const [mensaje, setMensaje] = useState<string>(
    preSelectedTransaction
      ? `Colega, favor revisar el comprobante ACH adjunto del estudiante ${preSelectedTransaction.estudiante_nombre} por $${preSelectedTransaction.monto.toFixed(2)} USD (Ref: ${preSelectedTransaction.referencia_ach}, Banco: ${preSelectedTransaction.banco_origen || 'Banco General'}).`
      : ''
  );
  const [prioridad, setPrioridad] = useState<'baja' | 'media' | 'alta' | 'urgente'>(
    preSelectedTransaction?.estado_aprobacion === 'pendiente_revision_bancaria' ? 'alta' : 'media'
  );

  // Attached Transaction and Image Attachments
  const [attachedTx, setAttachedTx] = useState<Transaction | null>(preSelectedTransaction || null);
  const [attachedImage, setAttachedImage] = useState<string | null>(
    preSelectedTransaction?.archivo_adjunto || null
  );
  const [attachedImageName, setAttachedImageName] = useState<string | null>(
    preSelectedTransaction?.archivo_nombre || (preSelectedTransaction ? `Comprobante_ACH_${preSelectedTransaction.referencia_ach}.jpg` : null)
  );
  const [isDraggingImage, setIsDraggingImage] = useState<boolean>(false);

  // Quick Reply States
  const [activeReplyMessageId, setActiveReplyMessageId] = useState<string | null>(null);
  const [replyText, setReplyText] = useState<string>('');
  const [replyImage, setReplyImage] = useState<string | null>(null);
  const [replyImageName, setReplyImageName] = useState<string | null>(null);
  const [submittingReply, setSubmittingReply] = useState<boolean>(false);

  // Image Viewer Modal State
  const [viewingImage, setViewingImage] = useState<{
    imageUrl: string;
    imageName: string;
    transaction?: Transaction | null;
  } | null>(null);

  const [submitting, setSubmitting] = useState<boolean>(false);
  const [successMsg, setSuccessMsg] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string>('');

  const fileInputRef = useRef<HTMLInputElement>(null);
  const replyFileInputRef = useRef<HTMLInputElement>(null);

  const loadMessages = async () => {
    setLoading(true);
    try {
      const data = await api.getAccountingMessages(currentUser.id);
      setMessages(data);
    } catch (err: any) {
      console.error('Error al cargar mensajes internos:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMessages();
  }, [currentUser]);

  // Handle when preSelectedTransaction changes
  useEffect(() => {
    if (preSelectedTransaction) {
      setAttachedTx(preSelectedTransaction);
      if (preSelectedTransaction.archivo_adjunto) {
        setAttachedImage(preSelectedTransaction.archivo_adjunto);
        setAttachedImageName(preSelectedTransaction.archivo_nombre || `Comprobante_ACH_${preSelectedTransaction.referencia_ach}.jpg`);
      } else {
        // Generate SVG receipt if no image exists
        const svgUrl = generateBankReceiptSvgUrl({
          banco: preSelectedTransaction.banco_origen || 'Banco General',
          monto: preSelectedTransaction.monto,
          referencia: preSelectedTransaction.referencia_ach,
          estudiante: preSelectedTransaction.estudiante_nombre || 'Estudiante',
          fecha: preSelectedTransaction.fecha,
          concepto: preSelectedTransaction.concepto
        });
        setAttachedImage(svgUrl);
        setAttachedImageName(`Comprobante_Digital_${preSelectedTransaction.referencia_ach}.jpg`);
      }
      setAsunto(`Revisión Comprobante ACH: ${preSelectedTransaction.estudiante_nombre} ($${preSelectedTransaction.monto.toFixed(2)})`);
      setMensaje(`Colega, favor revisar el comprobante ACH adjunto del estudiante ${preSelectedTransaction.estudiante_nombre} por $${preSelectedTransaction.monto.toFixed(2)} USD (Ref: ${preSelectedTransaction.referencia_ach}, Banco: ${preSelectedTransaction.banco_origen || 'Banco General'}).`);
      setActiveTab('compose');
    }
  }, [preSelectedTransaction]);

  // Image File Process Helper
  const processImageFile = (file: File, isReply: boolean = false) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      if (e.target?.result) {
        const dataUrl = e.target.result as string;
        if (isReply) {
          setReplyImage(dataUrl);
          setReplyImageName(file.name);
        } else {
          setAttachedImage(dataUrl);
          setAttachedImageName(file.name);
        }
      }
    };
    reader.readAsDataURL(file);
  };

  // Clipboard Paste Support (Ctrl+V / Command+V for screenshots)
  const handlePaste = (e: React.ClipboardEvent, isReply: boolean = false) => {
    const items = e.clipboardData?.items;
    if (!items) return;

    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf('image') !== -1) {
        const blob = items[i].getAsFile();
        if (blob) {
          const fileName = `Captura_Comprobante_${new Date().toISOString().substring(11, 19).replace(/:/g, '-')}.png`;
          const reader = new FileReader();
          reader.onload = (ev) => {
            if (ev.target?.result) {
              const dataUrl = ev.target.result as string;
              if (isReply) {
                setReplyImage(dataUrl);
                setReplyImageName(fileName);
              } else {
                setAttachedImage(dataUrl);
                setAttachedImageName(fileName);
              }
            }
          };
          reader.readAsDataURL(blob);
          break;
        }
      }
    }
  };

  const handleSelectTransactionToAttach = (txId: string) => {
    const tx = allTransactions.find(t => t.id === txId);
    if (!tx) {
      setAttachedTx(null);
      return;
    }
    setAttachedTx(tx);
    const imgUrl = tx.archivo_adjunto || generateBankReceiptSvgUrl({
      banco: tx.banco_origen || 'Banco General',
      monto: tx.monto,
      referencia: tx.referencia_ach,
      estudiante: tx.estudiante_nombre || 'Estudiante',
      fecha: tx.fecha,
      concepto: tx.concepto
    });
    setAttachedImage(imgUrl);
    setAttachedImageName(tx.archivo_nombre || `Comprobante_ACH_${tx.referencia_ach}.jpg`);

    if (!asunto) {
      setAsunto(`Revisión Comprobante ACH: ${tx.estudiante_nombre} ($${tx.monto.toFixed(2)})`);
    }
    if (!mensaje) {
      setMensaje(`Adjunto el comprobante ACH del estudiante ${tx.estudiante_nombre} por $${tx.monto.toFixed(2)} USD (Ref: ${tx.referencia_ach}). Favor cotejar con los extractos bancarios.`);
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!destinatarioId || !asunto.trim() || !mensaje.trim()) {
      setErrorMsg('Por favor completa todos los campos requeridos.');
      return;
    }

    const destinatarioUser = allUsers.find(u => u.id === destinatarioId);
    setSubmitting(true);
    setErrorMsg('');
    try {
      await api.sendAccountingMessage({
        remitente_id: currentUser.id,
        remitente_nombre: currentUser.nombre,
        destinatario_id: destinatarioId,
        destinatario_nombre: destinatarioUser ? destinatarioUser.nombre : 'Equipo de Contabilidad',
        asunto: asunto.trim(),
        mensaje: mensaje.trim(),
        prioridad,
        imagen_adjunta: attachedImage || undefined,
        imagen_nombre: attachedImageName || undefined,
        transaccion_id: attachedTx ? attachedTx.id : undefined,
        transaccion_resumen: attachedTx
          ? {
              estudiante_nombre: attachedTx.estudiante_nombre || 'Estudiante',
              monto: attachedTx.monto,
              referencia_ach: attachedTx.referencia_ach,
              banco_origen: attachedTx.banco_origen,
              archivo_nombre: attachedImageName || attachedTx.archivo_nombre || 'Comprobante_ACH.jpg',
              archivo_adjunto: attachedImage || attachedTx.archivo_adjunto,
              estado_aprobacion: attachedTx.estado_aprobacion
            }
          : undefined
      });

      setSuccessMsg('Mensaje e imagen del comprobante ACH enviados exitosamente a contabilidad.');
      setAsunto('');
      setMensaje('');
      setAttachedTx(null);
      setAttachedImage(null);
      setAttachedImageName(null);
      await loadMessages();
      if (onRefreshParent) onRefreshParent();
      setTimeout(() => {
        setSuccessMsg('');
        setActiveTab('inbox');
      }, 1200);
    } catch (err: any) {
      setErrorMsg(err.message || 'Error al enviar mensaje.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSendReply = async (messageId: string) => {
    if (!replyText.trim()) return;

    setSubmittingReply(true);
    try {
      const updated = await api.replyAccountingMessage(messageId, {
        remitente_id: currentUser.id,
        remitente_nombre: currentUser.nombre,
        mensaje: replyText.trim(),
        imagen_adjunta: replyImage || undefined,
        imagen_nombre: replyImageName || undefined
      });

      setMessages(prev => prev.map(m => m.id === messageId ? updated : m));
      setReplyText('');
      setReplyImage(null);
      setReplyImageName(null);
      setActiveReplyMessageId(null);
    } catch (err: any) {
      alert('Error al enviar respuesta: ' + (err.message || 'Error del servidor'));
    } finally {
      setSubmittingReply(false);
    }
  };

  const handleMarkAsRead = async (msg: InternalAccountingMessage) => {
    try {
      await api.markAccountingMessageRead(msg.id);
      setMessages(prev => prev.map(m => m.id === msg.id ? { ...m, leido: true } : m));
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteMessage = async (id: string) => {
    try {
      await api.deleteAccountingMessage(id);
      setMessages(prev => prev.filter(m => m.id !== id));
    } catch (err) {
      console.error(err);
    }
  };

  const filteredMessages = messages.filter(m => {
    if (filterPriority !== 'todos' && m.prioridad !== filterPriority) return false;
    return true;
  });

  const unreadCount = messages.filter(m => !m.leido && m.destinatario_id === currentUser.id).length;

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 z-50 animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl max-w-4xl w-full h-[650px] shadow-2xl border border-slate-200 flex flex-col overflow-hidden">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-900 text-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-sky-500/20 text-sky-400 flex items-center justify-center">
              <MessageSquare className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-slate-100 flex items-center gap-2">
                <span>Mensajería Interna de Contabilidad</span>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-sky-500/20 text-sky-300 border border-sky-500/30 flex items-center gap-1">
                  <ImageIcon className="w-3 h-3" />
                  <span>Soporte de Imágenes ACH</span>
                </span>
                {unreadCount > 0 && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-rose-500 text-white">
                    {unreadCount} nuevo{unreadCount > 1 ? 's' : ''}
                  </span>
                )}
              </h3>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                setActiveTab('inbox');
                loadMessages();
              }}
              className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
              title="Actualizar mensajes"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 text-lg transition-colors cursor-pointer"
              title="Cerrar mensajería"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-200 bg-slate-50 px-6 pt-2 gap-2">
          <button
            onClick={() => setActiveTab('inbox')}
            className={`py-2.5 px-4 text-xs font-bold rounded-t-lg border-b-2 flex items-center gap-2 transition-colors cursor-pointer ${
              activeTab === 'inbox'
                ? 'border-sky-600 text-sky-700 bg-white shadow-2xs'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <Inbox className="w-4 h-4" />
            <span>Bandeja de Mensajes ({messages.length})</span>
            {unreadCount > 0 && (
              <span className="w-2 h-2 rounded-full bg-rose-500"></span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('compose')}
            className={`py-2.5 px-4 text-xs font-bold rounded-t-lg border-b-2 flex items-center gap-2 transition-colors cursor-pointer ${
              activeTab === 'compose'
                ? 'border-sky-600 text-sky-700 bg-white shadow-2xs'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <Share2 className="w-4 h-4" />
            <span>Redactar / Enviar Comprobante ACH</span>
            {attachedImage && (
              <span className="w-2 h-2 rounded-full bg-emerald-500" title="Imagen adjunta"></span>
            )}
          </button>
        </div>

        {/* Modal Content */}
        <div className="flex-1 overflow-y-auto p-6 bg-slate-50/50">
          {activeTab === 'inbox' ? (
            <div className="space-y-4">
              {/* Filter bar */}
              <div className="flex items-center justify-between text-xs pb-2 border-b border-slate-200">
                <span className="font-semibold text-slate-700">
                  Comprobantes ACH compartidos y auditoría interna:
                </span>
                <div className="flex items-center gap-2">
                  <span className="text-slate-400">Prioridad:</span>
                  <select
                    value={filterPriority}
                    onChange={(e) => setFilterPriority(e.target.value)}
                    className="px-2 py-1 bg-white border border-slate-300 rounded-md text-xs font-medium focus:outline-none"
                  >
                    <option value="todos">Todas</option>
                    <option value="urgente">Urgente</option>
                    <option value="alta">Alta</option>
                    <option value="media">Media</option>
                    <option value="baja">Baja</option>
                  </select>
                </div>
              </div>

              {/* Message List */}
              {loading ? (
                <div className="py-12 text-center text-slate-400 text-xs">Cargando mensajes y comprobantes...</div>
              ) : filteredMessages.length === 0 ? (
                <div className="py-12 text-center text-slate-400 text-xs space-y-3">
                  <Inbox className="w-10 h-10 mx-auto text-slate-300" />
                  <p className="text-slate-600 font-medium">No hay mensajes ni comprobantes en la bandeja de entrada.</p>
                  <button
                    onClick={() => setActiveTab('compose')}
                    className="px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white rounded-lg font-bold text-xs inline-flex items-center gap-2 transition-colors cursor-pointer shadow-sm"
                  >
                    <Share2 className="w-3.5 h-3.5" />
                    <span>Compartir una imagen de comprobante ACH</span>
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  {filteredMessages.map((msg) => {
                    const isUnread = !msg.leido && msg.destinatario_id === currentUser.id;
                    const isSender = msg.remitente_id === currentUser.id;
                    const displayImage = msg.imagen_adjunta || msg.transaccion_resumen?.archivo_adjunto;
                    const displayImageName = msg.imagen_nombre || msg.transaccion_resumen?.archivo_nombre || 'Comprobante_ACH.jpg';
                    const hasReplies = msg.respuestas && msg.respuestas.length > 0;
                    const isReplyingThis = activeReplyMessageId === msg.id;

                    return (
                      <div
                        key={msg.id}
                        onClick={() => {
                          if (isUnread) handleMarkAsRead(msg);
                        }}
                        className={`p-4 rounded-xl border transition-all ${
                          isUnread
                            ? 'bg-sky-50/80 border-sky-300 shadow-sm'
                            : 'bg-white border-slate-200 hover:border-slate-300 shadow-2xs'
                        }`}
                      >
                        {/* Header: Sender/Receiver & Timestamp */}
                        <div className="flex items-start justify-between gap-3 mb-2">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-bold text-slate-800 text-xs flex items-center gap-1.5">
                              <UserIcon className="w-3.5 h-3.5 text-slate-500" />
                              <span>{isSender ? `Para: ${msg.destinatario_nombre}` : `De: ${msg.remitente_nombre}`}</span>
                            </span>
                            <span className={`px-2 py-0.5 rounded text-[10px] font-extrabold uppercase ${
                              msg.prioridad === 'urgente'
                                ? 'bg-rose-100 text-rose-800 border border-rose-200'
                                : msg.prioridad === 'alta'
                                ? 'bg-amber-100 text-amber-800 border border-amber-200'
                                : 'bg-slate-100 text-slate-700 border border-slate-200'
                            }`}>
                              {msg.prioridad}
                            </span>
                            {isUnread && (
                              <span className="px-1.5 py-0.5 rounded bg-sky-600 text-white text-[10px] font-bold">
                                No leído
                              </span>
                            )}
                          </div>

                          <div className="flex items-center gap-2 text-[11px] text-slate-400">
                            <span>{new Date(msg.creado_en).toLocaleString()}</span>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteMessage(msg.id);
                              }}
                              className="text-slate-400 hover:text-rose-600 transition-colors p-1 cursor-pointer"
                              title="Eliminar mensaje"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>

                        {/* Subject and Text Content */}
                        <h4 className="font-bold text-slate-900 text-sm mb-1">{msg.asunto}</h4>
                        <p className="text-xs text-slate-700 leading-relaxed mb-3 whitespace-pre-wrap">
                          {msg.mensaje}
                        </p>

                        {/* Visual Image / Voucher Card Attachment (If image present) */}
                        {displayImage && (
                          <div className="mb-3 p-3 bg-slate-900 rounded-xl text-white border border-slate-800 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
                            <div className="flex items-center gap-3 w-full sm:w-auto">
                              {/* Thumbnail preview with Zoom overlay */}
                              <div
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setViewingImage({
                                    imageUrl: displayImage,
                                    imageName: displayImageName,
                                    transaction: msg.transaccion_resumen ? {
                                      id: msg.transaccion_id || 'tx_img',
                                      estudiante_id: 'usr_est',
                                      estudiante_nombre: msg.transaccion_resumen.estudiante_nombre,
                                      fecha: new Date(msg.creado_en).toISOString().split('T')[0],
                                      tipo: 'abono',
                                      concepto: 'Abono ACH',
                                      monto: msg.transaccion_resumen.monto || 0,
                                      referencia_ach: msg.transaccion_resumen.referencia_ach || '',
                                      banco_origen: msg.transaccion_resumen.banco_origen,
                                      archivo_nombre: displayImageName,
                                      archivo_adjunto: displayImage,
                                      saldo_resultante: msg.transaccion_resumen.monto || 0,
                                      creado_por: msg.remitente_nombre,
                                      estado_aprobacion: msg.transaccion_resumen.estado_aprobacion,
                                      comprobado_banco: msg.transaccion_resumen.estado_aprobacion === 'aprobado'
                                    } : null
                                  });
                                }}
                                className="relative w-16 h-16 sm:w-20 sm:h-20 rounded-lg overflow-hidden border border-slate-700 bg-slate-800 flex-shrink-0 cursor-pointer group shadow-inner"
                                title="Clic para ampliar imagen del comprobante"
                              >
                                <img
                                  src={displayImage}
                                  alt={displayImageName}
                                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                                />
                                <div className="absolute inset-0 bg-slate-950/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white">
                                  <ZoomIn className="w-5 h-5 text-sky-400" />
                                </div>
                              </div>

                              <div className="truncate flex-1">
                                <div className="flex items-center gap-1.5 text-xs font-bold text-slate-100 truncate">
                                  <ImageIcon className="w-3.5 h-3.5 text-sky-400 flex-shrink-0" />
                                  <span className="truncate">{displayImageName}</span>
                                </div>
                                {msg.transaccion_resumen && (
                                  <div className="text-[11px] text-slate-300 mt-0.5">
                                    <span className="font-semibold text-sky-300">{msg.transaccion_resumen.estudiante_nombre}</span> •{' '}
                                    <span className="text-emerald-400 font-bold">
                                      ${msg.transaccion_resumen.monto.toLocaleString('en-US', { minimumFractionDigits: 2 })} USD
                                    </span>
                                  </div>
                                )}
                                <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                                  Ref: {msg.transaccion_resumen?.referencia_ach || 'Comprobante Adjunto'} ({msg.transaccion_resumen?.banco_origen || 'Banco General'})
                                </div>
                              </div>
                            </div>

                            {/* Action Buttons for Image */}
                            <div className="flex items-center gap-2 w-full sm:w-auto justify-end flex-wrap">
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setViewingImage({
                                    imageUrl: displayImage,
                                    imageName: displayImageName,
                                    transaction: msg.transaccion_resumen ? {
                                      id: msg.transaccion_id || 'tx_img',
                                      estudiante_id: 'usr_est',
                                      estudiante_nombre: msg.transaccion_resumen.estudiante_nombre,
                                      fecha: new Date(msg.creado_en).toISOString().split('T')[0],
                                      tipo: 'abono',
                                      concepto: 'Abono ACH',
                                      monto: msg.transaccion_resumen.monto || 0,
                                      referencia_ach: msg.transaccion_resumen.referencia_ach || '',
                                      banco_origen: msg.transaccion_resumen.banco_origen,
                                      archivo_nombre: displayImageName,
                                      archivo_adjunto: displayImage,
                                      saldo_resultante: msg.transaccion_resumen.monto || 0,
                                      creado_por: msg.remitente_nombre,
                                      estado_aprobacion: msg.transaccion_resumen.estado_aprobacion,
                                      comprobado_banco: msg.transaccion_resumen.estado_aprobacion === 'aprobado'
                                    } : null
                                  });
                                }}
                                className="px-3 py-1.5 bg-sky-600 hover:bg-sky-500 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer shadow-sm"
                                title="Ver comprobante en pantalla completa con zoom y rotación"
                              >
                                <Eye className="w-3.5 h-3.5" />
                                <span>Ver Imagen</span>
                              </button>

                              <a
                                href={displayImage}
                                download={displayImageName.includes('.') ? displayImageName : `${displayImageName}.jpg`}
                                onClick={(e) => e.stopPropagation()}
                                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                                title="Descargar archivo de comprobante"
                              >
                                <Download className="w-3.5 h-3.5" />
                                <span className="hidden sm:inline">Descargar</span>
                              </a>

                              {onOpenTransactionVoucher && msg.transaccion_resumen && (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onOpenTransactionVoucher({
                                      id: msg.transaccion_id || 'tx_ref',
                                      estudiante_id: 'usr_est',
                                      estudiante_nombre: msg.transaccion_resumen?.estudiante_nombre,
                                      fecha: new Date(msg.creado_en).toISOString().split('T')[0],
                                      tipo: 'abono',
                                      concepto: 'Abono ACH',
                                      monto: msg.transaccion_resumen?.monto || 0,
                                      referencia_ach: msg.transaccion_resumen?.referencia_ach || '',
                                      banco_origen: msg.transaccion_resumen?.banco_origen,
                                      archivo_nombre: displayImageName,
                                      archivo_adjunto: displayImage,
                                      saldo_resultante: msg.transaccion_resumen?.monto || 0,
                                      creado_por: msg.remitente_nombre,
                                      estado_aprobacion: msg.transaccion_resumen?.estado_aprobacion || 'pendiente_revision_bancaria',
                                      comprobado_banco: msg.transaccion_resumen?.estado_aprobacion === 'aprobado'
                                    });
                                  }}
                                  className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 rounded-lg text-xs font-medium flex items-center gap-1 transition-colors cursor-pointer"
                                  title="Ver Boleta Oficial ACH"
                                >
                                  <FileText className="w-3.5 h-3.5" />
                                  <span>Boleta</span>
                                </button>
                              )}
                            </div>
                          </div>
                        )}

                        {/* Thread Replies */}
                        {hasReplies && (
                          <div className="mt-3 pt-3 border-t border-slate-100 space-y-2.5 pl-3 border-l-2 border-sky-300 ml-2">
                            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wide block">
                              Respuestas ({msg.respuestas!.length})
                            </span>
                            {msg.respuestas!.map((rep) => (
                              <div key={rep.id} className="p-2.5 bg-slate-50 rounded-lg border border-slate-200 text-xs">
                                <div className="flex items-center justify-between text-[11px] font-semibold text-slate-700 mb-1">
                                  <span className="flex items-center gap-1">
                                    <UserIcon className="w-3 h-3 text-slate-400" />
                                    {rep.remitente_nombre}
                                  </span>
                                  <span className="text-slate-400 font-normal">{new Date(rep.creado_en).toLocaleString()}</span>
                                </div>
                                <p className="text-slate-700 leading-relaxed whitespace-pre-wrap">{rep.mensaje}</p>

                                {rep.imagen_adjunta && (
                                  <div className="mt-2 flex items-center gap-2 p-1.5 bg-white rounded border border-slate-200">
                                    <img
                                      src={rep.imagen_adjunta}
                                      alt="Imagen adjunta en respuesta"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setViewingImage({
                                          imageUrl: rep.imagen_adjunta!,
                                          imageName: rep.imagen_nombre || 'Imagen_Respuesta.jpg'
                                        });
                                      }}
                                      className="w-10 h-10 object-cover rounded cursor-pointer hover:opacity-90 transition-opacity"
                                    />
                                    <div className="truncate flex-1">
                                      <span className="text-[11px] font-semibold text-slate-800 block truncate">
                                        {rep.imagen_nombre || 'Comprobante_Respuesta.jpg'}
                                      </span>
                                      <button
                                        type="button"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setViewingImage({
                                            imageUrl: rep.imagen_adjunta!,
                                            imageName: rep.imagen_nombre || 'Imagen_Respuesta.jpg'
                                          });
                                        }}
                                        className="text-[10px] text-sky-600 font-bold hover:underline"
                                      >
                                        Ver Imagen
                                      </button>
                                    </div>
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        )}

                        {/* Reply Action Form / Trigger */}
                        <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between">
                          {!isReplyingThis ? (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setActiveReplyMessageId(msg.id);
                                setReplyText('');
                                setReplyImage(null);
                                setReplyImageName(null);
                              }}
                              className="text-xs font-semibold text-sky-700 hover:text-sky-800 flex items-center gap-1.5 p-1 rounded hover:bg-sky-50 transition-colors cursor-pointer"
                            >
                              <CornerDownRight className="w-3.5 h-3.5" />
                              <span>Responder / Adjuntar Imagen</span>
                            </button>
                          ) : (
                            <div className="w-full mt-2 p-3 bg-slate-50 rounded-xl border border-sky-200 space-y-2.5">
                              <div className="flex items-center justify-between">
                                <span className="text-xs font-bold text-slate-800 flex items-center gap-1">
                                  <CornerDownRight className="w-3.5 h-3.5 text-sky-600" />
                                  <span>Responder a {msg.remitente_nombre}</span>
                                </span>
                                <button
                                  type="button"
                                  onClick={() => setActiveReplyMessageId(null)}
                                  className="text-xs text-slate-400 hover:text-slate-600"
                                >
                                  Cancelar
                                </button>
                              </div>

                              <textarea
                                rows={2}
                                value={replyText}
                                onChange={(e) => setReplyText(e.target.value)}
                                onPaste={(e) => handlePaste(e, true)}
                                placeholder="Escribe tu respuesta contable o pega una captura con Ctrl+V..."
                                className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500"
                              />

                              {/* Attached Image in Reply */}
                              {replyImage && (
                                <div className="flex items-center justify-between p-2 bg-white rounded-lg border border-sky-200">
                                  <div className="flex items-center gap-2 truncate">
                                    <img src={replyImage} alt="Preview" className="w-8 h-8 rounded object-cover" />
                                    <span className="text-xs font-semibold text-slate-800 truncate">{replyImageName}</span>
                                  </div>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setReplyImage(null);
                                      setReplyImageName(null);
                                    }}
                                    className="text-xs text-rose-600 hover:underline font-semibold"
                                  >
                                    Quitar
                                  </button>
                                </div>
                              )}

                              <div className="flex items-center justify-between pt-1">
                                <div className="flex items-center gap-2">
                                  <input
                                    type="file"
                                    ref={replyFileInputRef}
                                    accept="image/*,.pdf"
                                    className="hidden"
                                    onChange={(e) => {
                                      if (e.target.files && e.target.files[0]) {
                                        processImageFile(e.target.files[0], true);
                                      }
                                    }}
                                  />
                                  <button
                                    type="button"
                                    onClick={() => replyFileInputRef.current?.click()}
                                    className="px-2.5 py-1 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 rounded text-xs font-semibold flex items-center gap-1 cursor-pointer"
                                  >
                                    <ImageIcon className="w-3.5 h-3.5 text-sky-600" />
                                    <span>Adjuntar Imagen</span>
                                  </button>
                                </div>

                                <button
                                  type="button"
                                  disabled={submittingReply || !replyText.trim()}
                                  onClick={() => handleSendReply(msg.id)}
                                  className="px-4 py-1.5 bg-sky-600 hover:bg-sky-700 text-white rounded text-xs font-bold flex items-center gap-1 transition-colors cursor-pointer disabled:opacity-50"
                                >
                                  <Send className="w-3.5 h-3.5" />
                                  <span>{submittingReply ? 'Enviando...' : 'Enviar Respuesta'}</span>
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          ) : (
            /* Compose Tab */
            <form onSubmit={handleSendMessage} className="space-y-4" onPaste={(e) => handlePaste(e, false)}>
              {successMsg && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-emerald-800 text-xs flex items-center gap-2 font-semibold">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                  <span>{successMsg}</span>
                </div>
              )}

              {errorMsg && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-rose-800 text-xs flex items-center gap-2 font-semibold">
                  <AlertTriangle className="w-4 h-4 text-rose-600 flex-shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Destinatario (Equipo de Contabilidad / Auditoría) *
                  </label>
                  <select
                    value={destinatarioId}
                    onChange={(e) => setDestinatarioId(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500 font-medium"
                    required
                  >
                    {accountingAndAdminUsers.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.nombre} ({u.rol === 'admin' ? 'Administrador' : 'Contabilidad'})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Prioridad de Conciliación / Atención
                  </label>
                  <select
                    value={prioridad}
                    onChange={(e) => setPrioridad(e.target.value as any)}
                    className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500 font-medium"
                  >
                    <option value="baja">Baja - Informativo / Consulta</option>
                    <option value="media">Media - Revisión Estándar</option>
                    <option value="alta">Alta - Acreditación Urgente para Vuelo</option>
                    <option value="urgente">Urgente - Inconsistencia / Alerta Bancaria</option>
                  </select>
                </div>
              </div>

              {/* Selector de Transacción Rápida ACH (Opcional) */}
              {allTransactions.length > 0 && !attachedTx && (
                <div className="p-3 bg-slate-100 rounded-xl border border-slate-200">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Vincular Comprobante de Transacción Existente (Opcional)
                  </label>
                  <select
                    onChange={(e) => handleSelectTransactionToAttach(e.target.value)}
                    defaultValue=""
                    className="w-full px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none font-medium text-slate-700"
                  >
                    <option value="">-- Seleccionar un pago/abono ACH de la lista para vincular su imagen --</option>
                    {allTransactions.filter(t => t.tipo === 'abono').map(t => (
                      <option key={t.id} value={t.id}>
                        {t.estudiante_nombre} - ${t.monto.toFixed(2)} USD (Ref: {t.referencia_ach}, {t.banco_origen || 'Banco General'} - {t.fecha})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Box de Imagen de Comprobante ACH Adjunta */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    <ImageIcon className="w-4 h-4 text-sky-600" />
                    <span>Imagen del Comprobante ACH / Captura de Transferencia</span>
                  </label>
                  {attachedImage && (
                    <button
                      type="button"
                      onClick={() => {
                        setAttachedImage(null);
                        setAttachedImageName(null);
                        setAttachedTx(null);
                      }}
                      className="text-xs text-rose-600 hover:underline font-semibold cursor-pointer"
                    >
                      Quitar Imagen
                    </button>
                  )}
                </div>

                {attachedImage ? (
                  /* Preview of attached image */
                  <div className="p-3 bg-slate-900 rounded-xl border border-slate-800 text-white flex flex-col sm:flex-row items-center justify-between gap-3">
                    <div className="flex items-center gap-3 w-full sm:w-auto">
                      <div
                        onClick={() => setViewingImage({
                          imageUrl: attachedImage,
                          imageName: attachedImageName || 'Comprobante_ACH.jpg',
                          transaction: attachedTx
                        })}
                        className="w-14 h-14 rounded-lg overflow-hidden border border-slate-700 bg-slate-800 flex-shrink-0 cursor-pointer relative group"
                        title="Clic para ampliar"
                      >
                        <img
                          src={attachedImage}
                          alt="Comprobante Adjunto"
                          className="w-full h-full object-cover"
                        />
                        <div className="absolute inset-0 bg-slate-950/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                          <ZoomIn className="w-4 h-4 text-sky-400" />
                        </div>
                      </div>

                      <div className="truncate">
                        <span className="font-bold text-xs text-slate-100 block truncate">
                          {attachedImageName || 'Comprobante_ACH.jpg'}
                        </span>
                        {attachedTx ? (
                          <span className="text-[11px] text-sky-300 block font-mono">
                            Vinculado: {attachedTx.estudiante_nombre} (${attachedTx.monto.toFixed(2)} USD - Ref: {attachedTx.referencia_ach})
                          </span>
                        ) : (
                          <span className="text-[11px] text-slate-400 block">
                            Imagen cargada lista para enviar por mensajería
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setViewingImage({
                          imageUrl: attachedImage,
                          imageName: attachedImageName || 'Comprobante_ACH.jpg',
                          transaction: attachedTx
                        })}
                        className="px-3 py-1.5 bg-sky-600 hover:bg-sky-500 text-white rounded-lg text-xs font-bold flex items-center gap-1 cursor-pointer transition-colors"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>Ver en Grande</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-semibold cursor-pointer transition-colors"
                      >
                        Cambiar
                      </button>
                    </div>
                  </div>
                ) : (
                  /* Drop zone / Upload button */
                  <div
                    onDragOver={(e) => {
                      e.preventDefault();
                      setIsDraggingImage(true);
                    }}
                    onDragLeave={() => setIsDraggingImage(false)}
                    onDrop={(e) => {
                      e.preventDefault();
                      setIsDraggingImage(false);
                      if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                        processImageFile(e.dataTransfer.files[0], false);
                      }
                    }}
                    className={`p-4 rounded-xl border-2 border-dashed text-center transition-all ${
                      isDraggingImage
                        ? 'border-sky-500 bg-sky-50/60 scale-[1.01]'
                        : 'border-slate-300 bg-white hover:border-slate-400'
                    }`}
                  >
                    <input
                      type="file"
                      ref={fileInputRef}
                      accept="image/*,.pdf"
                      className="hidden"
                      onChange={(e) => {
                        if (e.target.files && e.target.files[0]) {
                          processImageFile(e.target.files[0], false);
                        }
                      }}
                    />
                    <div className="flex flex-col items-center gap-1.5">
                      <UploadCloud className="w-7 h-7 text-sky-600" />
                      <p className="text-xs font-bold text-slate-800">
                        Arrastra y suelta aquí la imagen del comprobante bancario, o{' '}
                        <button
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
                          className="text-sky-600 hover:underline font-bold cursor-pointer"
                        >
                          selecciona un archivo
                        </button>
                      </p>
                    </div>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Asunto del Mensaje Interno *
                </label>
                <input
                  type="text"
                  value={asunto}
                  onChange={(e) => setAsunto(e.target.value)}
                  placeholder="ej. Cotejo de comprobante ACH Banco General cuenta corriente..."
                  className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500 font-medium"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Mensaje / Observaciones Contables *
                </label>
                <textarea
                  rows={4}
                  value={mensaje}
                  onChange={(e) => setMensaje(e.target.value)}
                  placeholder="Escribe los detalles para tu compañero de contabilidad (ej. validación en portal bancario, titular emisor, verificación de fondos, autorización para vuelo)..."
                  className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500 leading-relaxed"
                  required
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setActiveTab('inbox')}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 bg-sky-600 hover:bg-sky-700 text-white font-bold text-xs rounded-lg shadow-sm flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>{submitting ? 'Enviando Mensaje...' : 'Enviar Mensaje con Comprobante'}</span>
                </button>
              </div>
            </form>
          )}
        </div>
      </div>

      {/* Standalone Fullscreen Image Viewer Modal */}
      {viewingImage && (
        <ImageViewerModal
          imageUrl={viewingImage.imageUrl}
          imageName={viewingImage.imageName}
          transaction={viewingImage.transaction}
          onClose={() => setViewingImage(null)}
        />
      )}
    </div>
  );
};
