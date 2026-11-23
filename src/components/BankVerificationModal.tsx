import React, { useState } from 'react';
import { Transaction } from '../types';
import { ImageViewerModal } from './ImageViewerModal';
import {
  ShieldCheck,
  Building2,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  FileText,
  Clock,
  UserCheck,
  ExternalLink,
  Download,
  Printer,
  Share2,
  Eye,
  FileImage,
  ZoomIn
} from 'lucide-react';

interface BankVerificationModalProps {
  transaction: Transaction;
  currentUser: { nombre: string; rol: string };
  onClose: () => void;
  onApprove: (txId: string, verificadoPor: string, notasBancarias?: string, refConfirmada?: string, montoConfirmado?: number) => Promise<void>;
  onReject: (txId: string, verificadoPor: string, motivo: string) => Promise<void>;
  onViewVoucher?: (tx: Transaction) => void;
  onShareInternal?: (tx: Transaction) => void;
}

export const BankVerificationModal: React.FC<BankVerificationModalProps> = ({
  transaction,
  currentUser,
  onClose,
  onApprove,
  onReject,
  onViewVoucher,
  onShareInternal
}) => {
  const [refConfirmada, setRefConfirmada] = useState(transaction.referencia_ach || '');
  const [montoAcreditar, setMontoAcreditar] = useState(transaction.monto.toFixed(2));
  const [notasBancarias, setNotasBancarias] = useState('');
  const [motivoRechazo, setMotivoRechazo] = useState('');
  const [actionType, setActionType] = useState<'approve' | 'reject'>('approve');
  const [submitting, setSubmitting] = useState(false);
  const [showImageViewer, setShowImageViewer] = useState(false);

  const parsedMontoAcreditar = parseFloat(montoAcreditar);
  // Validación ágil directa para Contabilidad (sin checklist bloqueante obligatorio)
  const isFormValidToApprove = refConfirmada.trim().length > 0 && !isNaN(parsedMontoAcreditar) && parsedMontoAcreditar > 0;
  const isFormValidToReject = motivoRechazo.trim().length > 3;

  const handleConfirmAction = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      if (actionType === 'approve') {
        await onApprove(
          transaction.id,
          currentUser.nombre + ' (Contabilidad)',
          notasBancarias.trim() || 'Verificado y cotejado exitosamente por Contabilidad.',
          refConfirmada.trim(),
          parsedMontoAcreditar
        );
      } else {
        await onReject(
          transaction.id,
          currentUser.nombre + ' (Contabilidad)',
          motivoRechazo.trim()
        );
      }
      onClose();
    } catch (err: any) {
      alert('Error en la operación: ' + (err.message || 'Error desconocido'));
    } finally {
      setSubmitting(false);
    }
  };

  const handleDirectDownloadImage = () => {
    if (transaction.archivo_adjunto) {
      const link = document.createElement('a');
      link.href = transaction.archivo_adjunto;
      link.download = transaction.archivo_nombre || `Comprobante_${transaction.referencia_ach || transaction.id}.jpg`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } else {
      const receiptContent = `
================================================================
          AEROACADEMIA FLIGHT SCHOOL - COMPROBANTE ACH
================================================================
Folio Transacción: ${transaction.id}
Referencia ACH:     ${transaction.referencia_ach}
Fecha:              ${transaction.fecha}
Estudiante:         ${transaction.estudiante_nombre || 'N/A'}
Tipo Movimiento:    ${transaction.tipo.toUpperCase()}
Concepto:           ${transaction.concepto}
Banco Emisor:       ${transaction.banco_origen || 'Banco General'}
MONTO:              $${transaction.monto.toLocaleString('en-US', { minimumFractionDigits: 2 })} USD
ESTADO BANCARIO:    ${transaction.estado_aprobacion.toUpperCase()}
Archivo Adjunto:    ${transaction.archivo_nombre || 'Sin archivo adjunto'}
================================================================
Certificado digitalmente por el Sistema Contable AeroAcademia
      `.trim();

      const blob = new Blob([receiptContent], { type: 'text/plain;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `Comprobante_ACH_${transaction.referencia_ach || transaction.id}.txt`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-2xl border border-slate-200 space-y-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-sky-100 text-sky-700 flex items-center justify-center">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-bold text-slate-800 text-base">
                Conciliación y Aprobación Bancaria
              </h3>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 text-xl font-bold cursor-pointer"
          >
            &times;
          </button>
        </div>

        {/* Resumen del movimiento con acciones rápidas de Comprobante e Imagen */}
        <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3 text-xs">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <span className="text-slate-500 block">Estudiante:</span>
              <span className="font-bold text-slate-800 text-sm">{transaction.estudiante_nombre}</span>
            </div>
            <div>
              <span className="text-slate-500 block">Monto a Conciliar:</span>
              <span className="font-extrabold text-base text-emerald-700">
                ${transaction.monto.toLocaleString('en-US', { minimumFractionDigits: 2 })} USD
              </span>
            </div>
            <div>
              <span className="text-slate-500 block">Banco Reportado:</span>
              <span className="font-semibold text-slate-700">{transaction.banco_origen || 'Banco General / ACH'}</span>
            </div>
            <div>
              <span className="text-slate-500 block">Referencia ACH Reportada:</span>
              <span className="font-mono font-semibold text-sky-700 bg-sky-50 px-2 py-0.5 rounded border border-sky-200">
                {transaction.referencia_ach}
              </span>
            </div>
            <div>
              <span className="text-slate-500 block">Fecha de Reporte:</span>
              <span className="text-slate-700 font-medium">{transaction.fecha}</span>
            </div>
            <div>
              <span className="text-slate-500 block">Comprobante Subido:</span>
              {transaction.archivo_nombre ? (
                <div className="flex items-center gap-1 text-sky-700 font-bold truncate">
                  <FileImage className="w-3.5 h-3.5 flex-shrink-0 text-sky-600" />
                  <span className="truncate">{transaction.archivo_nombre}</span>
                </div>
              ) : (
                <span className="text-slate-400">Sin archivo adjunto</span>
              )}
            </div>
          </div>

          {/* Inline Image Preview Thumbnail */}
          {transaction.archivo_adjunto && (
            <div className="pt-2 border-t border-slate-200">
              <span className="text-[11px] font-bold text-slate-700 block mb-1.5 flex items-center gap-1">
                <Eye className="w-3.5 h-3.5 text-sky-600" />
                <span>Vista Previa de la Imagen del Comprobante:</span>
              </span>
              <div 
                onClick={() => setShowImageViewer(true)}
                className="cursor-pointer group relative rounded-lg overflow-hidden bg-white border border-slate-300 max-h-36 flex items-center justify-center p-1.5 hover:border-sky-400 transition-all shadow-2xs"
                title="Clic para ampliar y descargar la imagen del comprobante"
              >
                <img
                  src={transaction.archivo_adjunto}
                  alt="Comprobante de pago"
                  className="max-h-32 object-contain rounded"
                />
                <div className="absolute inset-0 bg-slate-950/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 text-white text-xs font-bold">
                  <ZoomIn className="w-4 h-4" />
                  <span>Inspeccionar Imagen Completa (Zoom)</span>
                </div>
              </div>
            </div>
          )}

          {transaction.notas && (
            <div className="pt-2 border-t border-slate-200 text-slate-600">
              <span className="font-semibold">Notas del alumno:</span> {transaction.notas}
            </div>
          )}

          {/* Barra de Herramientas de Comprobante ACH: Ver, Descargar, Imprimir, Compartir */}
          <div className="pt-2.5 border-t border-slate-200 flex items-center justify-between gap-2 flex-wrap bg-white p-2.5 rounded-lg border">
            <span className="font-bold text-slate-700 flex items-center gap-1 text-[11px]">
              <FileImage className="w-3.5 h-3.5 text-sky-600" />
              <span>Acciones del Comprobante:</span>
            </span>

            <div className="flex items-center gap-1.5 flex-wrap">
              {transaction.archivo_adjunto && (
                <button
                  type="button"
                  onClick={() => setShowImageViewer(true)}
                  className="px-2.5 py-1 bg-sky-50 hover:bg-sky-100 text-sky-700 border border-sky-200 rounded font-semibold text-[11px] flex items-center gap-1 transition-colors cursor-pointer"
                  title="Ver imagen del comprobante con visor de zoom"
                >
                  <Eye className="w-3 h-3" />
                  <span>Ver Imagen</span>
                </button>
              )}

              {onViewVoucher && (
                <button
                  type="button"
                  onClick={() => onViewVoucher(transaction)}
                  className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 rounded font-semibold text-[11px] flex items-center gap-1 transition-colors cursor-pointer"
                  title="Ver boleta oficial ACH"
                >
                  <FileText className="w-3 h-3" />
                  <span>Boleta</span>
                </button>
              )}

              <button
                type="button"
                onClick={handleDirectDownloadImage}
                className="px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 rounded font-semibold text-[11px] flex items-center gap-1 transition-colors cursor-pointer"
                title="Descargar imagen del comprobante"
              >
                <Download className="w-3 h-3" />
                <span>Descargar</span>
              </button>

              {onShareInternal && (
                <button
                  type="button"
                  onClick={() => onShareInternal(transaction)}
                  className="px-2.5 py-1 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-300 rounded font-semibold text-[11px] flex items-center gap-1 transition-colors cursor-pointer"
                  title="Compartir comprobante por mensajería interna"
                >
                  <Share2 className="w-3 h-3" />
                  <span>Compartir</span>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Selector de acción */}
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setActionType('approve')}
            className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer ${
              actionType === 'approve'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>Aprobar y Acreditar Saldo</span>
          </button>
          <button
            type="button"
            onClick={() => setActionType('reject')}
            className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer ${
              actionType === 'reject'
                ? 'bg-rose-600 text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            <XCircle className="w-4 h-4" />
            <span>Rechazar Acreditación</span>
          </button>
        </div>

        <form onSubmit={handleConfirmAction} className="space-y-3">
          {actionType === 'approve' ? (
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Valor Libre a Acreditar a Cuenta ($ USD) *
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  value={montoAcreditar}
                  onChange={(e) => setMontoAcreditar(e.target.value)}
                  placeholder="0.00"
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 font-bold text-emerald-700"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Referencia Bancaria Confirmada en Extracto *
                </label>
                <input
                  type="text"
                  value={refConfirmada}
                  onChange={(e) => setRefConfirmada(e.target.value)}
                  placeholder="ej. ACH-CONFIRMADO-BG-992318"
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500 font-mono font-medium"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Notas de Conciliación Contable (Opcional)
                </label>
                <input
                  type="text"
                  value={notasBancarias}
                  onChange={(e) => setNotasBancarias(e.target.value)}
                  placeholder="ej. Acreditado en Cuenta Corriente Banco General #03-72..."
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500"
                />
              </div>
            </div>
          ) : (
            <div className="space-y-3">


              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Explicación / Causa de Inconsistencia Bancaria *
                </label>
                <textarea
                  rows={3}
                  value={motivoRechazo}
                  onChange={(e) => setMotivoRechazo(e.target.value)}
                  placeholder="ej. No se encontró la transferencia con esa referencia en el extracto bancario, o el monto reportado difiere del depósito."
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-500"
                  required
                />
              </div>
            </div>
          )}

          {/* Footer actions */}
          <div className="flex items-center justify-between pt-3 border-t border-slate-100">
            <div className="text-[11px] text-slate-500 flex items-center gap-1">
              <UserCheck className="w-3.5 h-3.5 text-slate-400" />
              <span>Oficial: <strong>{currentUser.nombre}</strong></span>
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={onClose}
                disabled={submitting}
                className="px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg cursor-pointer"
              >
                Cancelar
              </button>

              {actionType === 'approve' ? (
                <button
                  type="submit"
                  disabled={!isFormValidToApprove || submitting}
                  className={`px-4 py-2 text-xs font-bold rounded-lg flex items-center gap-1.5 shadow-sm transition-colors cursor-pointer ${
                    isFormValidToApprove && !submitting
                      ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                      : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                  }`}
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{submitting ? 'Aprobando...' : 'Confirmar y Acreditar Saldo'}</span>
                </button>
              ) : (
                <button
                  type="submit"
                  disabled={!isFormValidToReject || submitting}
                  className={`px-4 py-2 text-xs font-bold rounded-lg flex items-center gap-1.5 shadow-sm transition-colors cursor-pointer ${
                    isFormValidToReject && !submitting
                      ? 'bg-rose-600 hover:bg-rose-700 text-white'
                      : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                  }`}
                >
                  <XCircle className="w-4 h-4" />
                  <span>{submitting ? 'Rechazando...' : 'Rechazar Transacción'}</span>
                </button>
              )}
            </div>
          </div>
        </form>
      </div>

      {showImageViewer && (
        <ImageViewerModal
          transaction={transaction}
          onClose={() => setShowImageViewer(false)}
          onShareInternal={onShareInternal}
        />
      )}
    </div>
  );
};

