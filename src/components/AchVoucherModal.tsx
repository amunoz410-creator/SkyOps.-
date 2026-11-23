import React, { useRef, useState } from 'react';
import { Transaction } from '../types';
import { ImageViewerModal } from './ImageViewerModal';
import {
  FileText,
  Download,
  Printer,
  Share2,
  CheckCircle2,
  Clock,
  XCircle,
  Building2,
  ShieldCheck,
  Calendar,
  DollarSign,
  User,
  Hash,
  ArrowDownLeft,
  X,
  ExternalLink,
  Copy,
  Check,
  Eye,
  FileImage,
  ZoomIn
} from 'lucide-react';

interface AchVoucherModalProps {
  transaction: Transaction;
  onClose: () => void;
  onShareInternal?: (tx: Transaction) => void;
}

export const AchVoucherModal: React.FC<AchVoucherModalProps> = ({
  transaction,
  onClose,
  onShareInternal
}) => {
  const [copied, setCopied] = useState(false);
  const [showImageViewer, setShowImageViewer] = useState(false);
  const printRef = useRef<HTMLDivElement>(null);

  const handleCopyReference = () => {
    navigator.clipboard.writeText(transaction.referencia_ach || '');
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadImageOnly = () => {
    if (transaction.archivo_adjunto) {
      const link = document.createElement('a');
      link.href = transaction.archivo_adjunto;
      const fileName = transaction.archivo_nombre || `Comprobante_${transaction.referencia_ach || transaction.id}.jpg`;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } else {
      handleDownloadTextVoucher();
    }
  };

  const handleDownload = () => {
    handleDownloadImageOnly();
  };

  const handleDownloadTextVoucher = () => {
    // Generate text/formatted receipt download
    const receiptContent = `
================================================================
          AEROACADEMIA FLIGHT SCHOOL - COMPROBANTE ACH
================================================================
Folio Transacción: ${transaction.id}
Referencia ACH:     ${transaction.referencia_ach}
Fecha:              ${transaction.fecha}
Hora / Registro:    ${transaction.creado_en ? new Date(transaction.creado_en).toLocaleString() : 'N/A'}
----------------------------------------------------------------
Estudiante:         ${transaction.estudiante_nombre || 'N/A'} (ID: ${transaction.estudiante_id})
Tipo Movimiento:    ${transaction.tipo.toUpperCase()}
Concepto:           ${transaction.concepto}
Banco Emisor:       ${transaction.banco_origen || 'Banco General / ACH'}
----------------------------------------------------------------
MONTO:              $${transaction.monto.toLocaleString('en-US', { minimumFractionDigits: 2 })} USD
ESTADO BANCARIO:    ${transaction.estado_aprobacion.toUpperCase()}
Verificado por:     ${transaction.verificado_por || 'Pendiente de Conciliación'}
Ref. Confirmada:    ${transaction.referencia_bancaria_confirmada || 'N/A'}
Notas Bancarias:    ${transaction.notas_bancarias || 'Sin notas'}
Archivo Adjunto:    ${transaction.archivo_nombre || 'Sin archivo adjunto'}
================================================================
Certificado digitalmente por el Sistema Contable AeroAcademia SkyOps
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
  };

  const isApproved = transaction.estado_aprobacion === 'aprobado';
  const isPending = transaction.estado_aprobacion === 'pendiente_revision_bancaria';
  const isRejected = transaction.estado_aprobacion === 'rechazado';

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-200 overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-2xl w-full shadow-2xl border border-slate-200 overflow-hidden my-8">
        {/* Top Control Bar (Hidden when printing) */}
        <div className="flex items-center justify-between px-6 py-4 bg-slate-900 text-white print:hidden">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-sky-500/20 text-sky-400 flex items-center justify-center">
              <FileText className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-slate-100">Visor de Comprobante ACH</h3>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {onShareInternal && (
              <button
                onClick={() => onShareInternal(transaction)}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-sky-400 border border-slate-700 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                title="Compartir con otro usuario de contabilidad por mensajería interna"
              >
                <Share2 className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Compartir Interno</span>
              </button>
            )}

            <button
              onClick={handleDownload}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-emerald-400 border border-slate-700 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
              title="Descargar comprobante"
            >
              <Download className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Descargar</span>
            </button>

            <button
              onClick={handlePrint}
              className="px-3 py-1.5 bg-sky-600 hover:bg-sky-500 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer shadow-sm"
              title="Imprimir boleta de comprobante"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Imprimir</span>
            </button>

            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 text-lg transition-colors cursor-pointer ml-1"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Receipt Area */}
        <div ref={printRef} className="p-6 sm:p-8 space-y-6 bg-white text-slate-800" id="ach-voucher-printable">
          {/* Header del Voucher */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-6 border-b-2 border-dashed border-slate-200 gap-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-sky-900 text-white flex items-center justify-center font-black text-xl tracking-wider shadow-sm">
                SKY
              </div>
              <div>
                <h2 className="text-lg font-black text-slate-900 tracking-tight">AEROACADEMIA FLIGHT SCHOOL</h2>
                <p className="text-xs font-semibold text-slate-500">DEPARTAMENTO DE CONTABILIDAD Y FINANZAS</p>
                <p className="text-[11px] text-slate-400">RUC 155694821-2-2021 DV 89 • Ciudad de Panamá</p>
              </div>
            </div>

            <div className="sm:text-right">
              <span className="inline-block px-2.5 py-1 rounded-md text-[11px] font-mono font-bold bg-slate-100 text-slate-700 border border-slate-200">
                FOLIO: {transaction.id}
              </span>
              <p className="text-xs text-slate-500 mt-1">Fecha: <strong>{transaction.fecha}</strong></p>
            </div>
          </div>

          {/* Status Banner */}
          <div className={`p-4 rounded-xl border flex items-center justify-between ${
            isApproved
              ? 'bg-emerald-50/80 border-emerald-200 text-emerald-900'
              : isPending
              ? 'bg-amber-50/80 border-amber-200 text-amber-900'
              : 'bg-rose-50/80 border-rose-200 text-rose-900'
          }`}>
            <div className="flex items-center gap-3">
              {isApproved && <CheckCircle2 className="w-6 h-6 text-emerald-600 flex-shrink-0" />}
              {isPending && <Clock className="w-6 h-6 text-amber-600 flex-shrink-0 animate-pulse" />}
              {isRejected && <XCircle className="w-6 h-6 text-rose-600 flex-shrink-0" />}
              <div>
                <span className="text-xs font-bold uppercase tracking-wider block">
                  {isApproved && 'Comprobado y Acreditado en Banco'}
                  {isPending && 'En Revisión Bancaria (No Acreditado)'}
                  {isRejected && 'Acreditación Rechazada por Contabilidad'}
                </span>
                <span className="text-xs opacity-80">
                  {isApproved && `Verificado formalmente por: ${transaction.verificado_por || 'Oficial de Contabilidad'}`}
                  {isPending && 'Pendiente de cotejo contra extracto bancario de la academia'}
                  {isRejected && (transaction.motivo_rechazo || 'Inconsistencia en los datos reportados')}
                </span>
              </div>
            </div>

            <div className="text-right pl-3">
              <span className="text-2xl font-black tracking-tight block text-slate-900">
                ${transaction.monto.toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </span>
              <span className="text-[10px] font-bold uppercase text-slate-500">USD DÓLARES</span>
            </div>
          </div>

          {/* Transaction Core Details Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            {/* Box Estudiante */}
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1.5">
              <span className="text-slate-400 font-semibold uppercase text-[10px] block">Estudiante / Titular</span>
              <div className="flex items-center gap-2">
                <User className="w-4 h-4 text-sky-600" />
                <span className="font-bold text-slate-800 text-sm">{transaction.estudiante_nombre}</span>
              </div>
              <p className="text-slate-500 text-[11px]">ID Alumno: {transaction.estudiante_id}</p>
            </div>

            {/* Box Banco y Referencia */}
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1.5">
              <span className="text-slate-400 font-semibold uppercase text-[10px] block">Banco & Referencia ACH</span>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-slate-600" />
                  <span className="font-bold text-slate-800">{transaction.banco_origen || 'Banco General'}</span>
                </div>
                <button
                  type="button"
                  onClick={handleCopyReference}
                  className="text-sky-600 hover:text-sky-800 text-[11px] font-semibold flex items-center gap-1 cursor-pointer print:hidden"
                  title="Copiar número de referencia"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copied ? 'Copiado' : 'Copiar'}</span>
                </button>
              </div>
              <p className="font-mono font-bold text-sky-800 text-xs bg-sky-50 px-2 py-0.5 rounded border border-sky-100 inline-block">
                {transaction.referencia_ach}
              </p>
            </div>

            {/* Box Concepto */}
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1.5">
              <span className="text-slate-400 font-semibold uppercase text-[10px] block">Concepto del Movimiento</span>
              <span className="font-bold text-slate-800 block text-xs">{transaction.concepto}</span>
              {transaction.notas && (
                <p className="text-slate-600 italic text-[11px]">"{transaction.notas}"</p>
              )}
            </div>

            {/* Box Cuenta Destino */}
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1.5">
              <span className="text-slate-400 font-semibold uppercase text-[10px] block">Cuenta Destino Academia</span>
              <span className="font-semibold text-slate-700 block">Banco General - Cuenta Corriente</span>
              <p className="font-mono text-slate-500 text-[11px]">No. 03-72-01-998822-0</p>
            </div>
          </div>

          {/* Detalle de imagen / archivo adjunto subido por el estudiante */}
          <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                <FileImage className="w-4 h-4 text-sky-600" />
                <span>Imagen / Comprobante de Pago Subido por el Alumno</span>
              </span>
              {transaction.archivo_nombre && (
                <span className="text-[11px] px-2 py-0.5 bg-sky-100 text-sky-800 font-semibold rounded">
                  Documento Registrado
                </span>
              )}
            </div>

            {transaction.archivo_adjunto || transaction.archivo_nombre ? (
              <div className="bg-white rounded-xl border border-slate-200 p-3 space-y-3">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-3 truncate">
                    {/* Thumbnail preview if available */}
                    {transaction.archivo_adjunto ? (
                      <div 
                        onClick={() => setShowImageViewer(true)}
                        className="w-14 h-14 rounded-lg bg-slate-100 border border-slate-300 overflow-hidden cursor-pointer hover:opacity-80 transition-opacity flex-shrink-0 relative group"
                        title="Clic para ampliar imagen"
                      >
                        <img
                          src={transaction.archivo_adjunto}
                          alt="Thumbnail comprobante"
                          className="w-full h-full object-cover"
                        />
                        <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                          <ZoomIn className="w-4 h-4 text-white" />
                        </div>
                      </div>
                    ) : (
                      <div className="w-12 h-12 rounded-lg bg-sky-50 text-sky-700 flex items-center justify-center font-bold text-xs flex-shrink-0">
                        DOC
                      </div>
                    )}

                    <div className="truncate">
                      <p className="text-xs font-bold text-slate-800 truncate">{transaction.archivo_nombre || 'Comprobante_Pago.jpg'}</p>
                      <p className="text-[11px] text-slate-500">
                        {transaction.archivo_adjunto ? 'Imagen / Captura de comprobante digital' : 'Comprobante de transferencia bancaria digital'}
                      </p>
                      <p className="text-[10px] text-emerald-700 font-semibold">Listo para visualización, descarga y reenvío</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 flex-wrap print:hidden">
                    {transaction.archivo_adjunto && (
                      <button
                        type="button"
                        onClick={() => setShowImageViewer(true)}
                        className="px-2.5 py-1.5 bg-sky-50 hover:bg-sky-100 text-sky-700 border border-sky-200 rounded-lg text-xs font-bold flex items-center gap-1 transition-colors cursor-pointer"
                        title="Ver imagen completa del comprobante con zoom"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>Ver Imagen</span>
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={handleDownloadImageOnly}
                      className="px-2.5 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-lg text-xs font-bold flex items-center gap-1 transition-colors cursor-pointer"
                      title="Descargar archivo original de imagen o comprobante"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Descargar Imagen</span>
                    </button>

                    {onShareInternal && (
                      <button
                        type="button"
                        onClick={() => onShareInternal(transaction)}
                        className="px-2.5 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 rounded-lg text-xs font-bold flex items-center gap-1 transition-colors cursor-pointer"
                        title="Compartir comprobante con compañeros de contabilidad"
                      >
                        <Share2 className="w-3.5 h-3.5 text-amber-600" />
                        <span>Compartir</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* Inline image preview snippet */}
                {transaction.archivo_adjunto && (
                  <div className="pt-2 border-t border-slate-100">
                    <div 
                      onClick={() => setShowImageViewer(true)}
                      className="cursor-pointer group relative rounded-lg overflow-hidden bg-slate-900/5 border border-slate-200 max-h-48 flex items-center justify-center p-1"
                    >
                      <img
                        src={transaction.archivo_adjunto}
                        alt="Vista previa del comprobante de pago"
                        className="max-h-44 object-contain rounded"
                      />
                      <div className="absolute inset-0 bg-slate-950/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 text-white text-xs font-bold">
                        <ZoomIn className="w-4 h-4" />
                        <span>Clic para inspeccionar a tamaño completo</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="p-3 bg-white rounded-lg border border-slate-200 text-xs text-slate-400 italic">
                El estudiante registró el pago indicando la referencia ACH sin adjuntar imagen o archivo de captura.
              </div>
            )}
          </div>

          {/* Notas de Conciliación Bancaria si está comprobado */}
          {transaction.notas_bancarias && (
            <div className="p-3 rounded-xl bg-emerald-50/50 border border-emerald-200 text-xs">
              <span className="font-bold text-emerald-900 block mb-0.5">Nota de Auditoría Contable:</span>
              <p className="text-emerald-800">{transaction.notas_bancarias}</p>
              {transaction.referencia_bancaria_confirmada && (
                <p className="text-[11px] font-mono text-emerald-700 mt-1">
                  Ref Confirmada en Banco: <strong>{transaction.referencia_bancaria_confirmada}</strong>
                </p>
              )}
            </div>
          )}

          {/* Footer del Comprobante */}
          <div className="pt-6 border-t-2 border-dashed border-slate-200 flex flex-col sm:flex-row items-center justify-between text-[11px] text-slate-400 gap-3">
            <div>
              <span>Sello Digital: SHA-256:{transaction.id.slice(0, 16)}...</span>
              <span className="block text-[10px]">AeroAcademia SkyOps Core Finance v2.4</span>
            </div>
            <div className="text-center sm:text-right">
              <span className="font-bold text-slate-600 block">Oficina de Contabilidad y Tesorería</span>
              <span>Comprobante válido para auditoría contable</span>
            </div>
          </div>
        </div>

        {/* Modal Bottom Actions (Hidden when printing) */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between print:hidden">
          <div className="text-xs text-slate-500">
            {isApproved ? '✅ Transacción formalmente conciliada' : '⚠️ Requiere o tuvo revisión bancaria'}
          </div>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 font-semibold text-xs rounded-lg transition-colors cursor-pointer"
            >
              Cerrar
            </button>
            <button
              type="button"
              onClick={handlePrint}
              className="px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white font-bold text-xs rounded-lg shadow-sm flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Imprimir Comprobante</span>
            </button>
          </div>
        </div>
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
