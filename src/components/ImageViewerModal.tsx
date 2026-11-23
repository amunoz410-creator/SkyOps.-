import React, { useState } from 'react';
import { Transaction } from '../types';
import {
  X,
  Download,
  ZoomIn,
  ZoomOut,
  RotateCw,
  Maximize2,
  Share2,
  Printer,
  FileImage,
  Building2,
  User,
  ShieldCheck,
  Calendar,
  ExternalLink
} from 'lucide-react';

interface ImageViewerModalProps {
  transaction?: Transaction | null;
  imageUrl?: string;
  imageName?: string;
  onClose: () => void;
  onShareInternal?: (tx: Transaction) => void;
}

export const ImageViewerModal: React.FC<ImageViewerModalProps> = ({
  transaction,
  imageUrl,
  imageName,
  onClose,
  onShareInternal
}) => {
  const [zoomLevel, setZoomLevel] = useState<number>(1);
  const [rotation, setRotation] = useState<number>(0);

  const displayImage = imageUrl || transaction?.archivo_adjunto;
  const displayName = imageName || transaction?.archivo_nombre || (transaction ? `Comprobante_${transaction.referencia_ach || transaction.id}.jpg` : 'Comprobante_ACH.jpg');

  const handleZoomIn = () => setZoomLevel(prev => Math.min(prev + 0.25, 3));
  const handleZoomOut = () => setZoomLevel(prev => Math.max(prev - 0.25, 0.5));
  const handleResetZoom = () => {
    setZoomLevel(1);
    setRotation(0);
  };
  const handleRotate = () => setRotation(prev => (prev + 90) % 360);

  const handleDownloadImage = () => {
    if (!displayImage) return;

    const link = document.createElement('a');
    link.href = displayImage;
    link.download = displayName.includes('.') ? displayName : `${displayName}.jpg`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePrint = () => {
    if (!displayImage) return;
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(`
        <html>
          <head>
            <title>Imprimir Comprobante - ${transaction?.referencia_ach || displayName}</title>
            <style>
              body { margin: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; font-family: sans-serif; padding: 20px; }
              .header { text-align: center; margin-bottom: 20px; }
              img { max-width: 95%; max-height: 85vh; object-fit: contain; border: 1px solid #ddd; }
            </style>
          </head>
          <body>
            <div class="header">
              <h2>AeroAcademia SkyOps - Comprobante de Pago ACH</h2>
              ${transaction ? `<p>Estudiante: <strong>${transaction.estudiante_nombre}</strong> | Monto: <strong>$${transaction.monto.toFixed(2)} USD</strong> | Ref: <strong>${transaction.referencia_ach}</strong></p>` : `<p>${displayName}</p>`}
            </div>
            <img src="${displayImage}" onload="window.print();window.close();" />
          </body>
        </html>
      `);
      printWindow.document.close();
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-950/85 backdrop-blur-md flex flex-col z-50 animate-in fade-in duration-200">
      {/* Top Header Bar */}
      <div className="flex items-center justify-between px-6 py-3 bg-slate-900 border-b border-slate-800 text-white flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-sky-500/20 text-sky-400 flex items-center justify-center">
            <FileImage className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-sm text-slate-100">{displayName}</h3>
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-sky-900/60 text-sky-300 border border-sky-700">
                {transaction?.banco_origen || 'Comprobante ACH'}
              </span>
            </div>
            {transaction && (
              <p className="text-xs text-slate-400">
                {transaction.estudiante_nombre} • Ref: <span className="font-mono text-sky-300 font-bold">{transaction.referencia_ach}</span> • Monto: <span className="font-bold text-emerald-400">${transaction.monto.toLocaleString('en-US', { minimumFractionDigits: 2 })} USD</span>
              </p>
            )}
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          {/* Zoom Controls */}
          <div className="flex items-center bg-slate-800 rounded-lg p-1 border border-slate-700">
            <button
              type="button"
              onClick={handleZoomOut}
              className="p-1.5 text-slate-300 hover:text-white hover:bg-slate-700 rounded transition-colors cursor-pointer"
              title="Alejar (-)"
            >
              <ZoomOut className="w-4 h-4" />
            </button>
            <span className="px-2 text-xs font-mono text-slate-300">{Math.round(zoomLevel * 100)}%</span>
            <button
              type="button"
              onClick={handleZoomIn}
              className="p-1.5 text-slate-300 hover:text-white hover:bg-slate-700 rounded transition-colors cursor-pointer"
              title="Acercar (+)"
            >
              <ZoomIn className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={handleRotate}
              className="p-1.5 text-slate-300 hover:text-white hover:bg-slate-700 rounded transition-colors cursor-pointer ml-1"
              title="Rotar 90°"
            >
              <RotateCw className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={handleResetZoom}
              className="p-1.5 text-slate-300 hover:text-white hover:bg-slate-700 rounded transition-colors cursor-pointer ml-1"
              title="Ajustar al centro"
            >
              <Maximize2 className="w-4 h-4" />
            </button>
          </div>

          {/* Share Button */}
          {onShareInternal && transaction && (
            <button
              type="button"
              onClick={() => onShareInternal(transaction)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-600/30 hover:bg-amber-600/50 text-amber-300 border border-amber-500/40 rounded-lg text-xs font-semibold transition-colors cursor-pointer"
              title="Compartir imagen por mensajería interna con otros compañeros de contabilidad"
            >
              <Share2 className="w-4 h-4" />
              <span className="hidden md:inline">Compartir</span>
            </button>
          )}

          {/* Download Image Button */}
          <button
            type="button"
            onClick={handleDownloadImage}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold transition-colors cursor-pointer shadow-sm"
            title="Descargar archivo original de imagen del comprobante"
          >
            <Download className="w-4 h-4" />
            <span>Descargar Imagen</span>
          </button>

          {/* Print Button */}
          <button
            type="button"
            onClick={handlePrint}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-lg text-xs font-semibold transition-colors cursor-pointer"
            title="Imprimir imagen"
          >
            <Printer className="w-4 h-4" />
            <span className="hidden sm:inline">Imprimir</span>
          </button>

          {/* Close Button */}
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors cursor-pointer ml-2"
            title="Cerrar visor"
          >
            <X className="w-6 h-6" />
          </button>
        </div>
      </div>

      {/* Main Image Display Workspace */}
      <div className="flex-1 overflow-auto flex items-center justify-center p-4 sm:p-8 select-none">
        {displayImage ? (
          <div
            className="transition-transform duration-150 ease-out flex items-center justify-center max-w-full max-h-full"
            style={{
              transform: `scale(${zoomLevel}) rotate(${rotation}deg)`
            }}
          >
            <img
              src={displayImage}
              alt={`Comprobante de pago ${displayName}`}
              className="max-w-[85vw] max-h-[75vh] object-contain rounded-xl shadow-2xl border border-slate-700 bg-white"
            />
          </div>
        ) : (
          <div className="text-center text-slate-400 space-y-2">
            <FileImage className="w-12 h-12 mx-auto text-slate-600" />
            <p className="text-sm font-semibold">No se encontró imagen adjunta en esta transacción.</p>
          </div>
        )}
      </div>

      {/* Bottom Info Bar */}
      <div className="px-6 py-2.5 bg-slate-900/90 border-t border-slate-800 text-xs text-slate-400 flex items-center justify-between flex-shrink-0 flex-wrap gap-2">
        <div className="flex items-center gap-4">
          <span>Banco: <strong className="text-slate-200">{transaction?.banco_origen || 'ACH Transfer'}</strong></span>
          <span>Fecha: <strong className="text-slate-200">{transaction?.fecha || new Date().toISOString().split('T')[0]}</strong></span>
          {transaction?.estado_aprobacion && (
            <span>Estado: <strong className={transaction.estado_aprobacion === 'aprobado' ? 'text-emerald-400' : 'text-amber-400'}>{transaction.estado_aprobacion.toUpperCase()}</strong></span>
          )}
        </div>
      </div>
    </div>
  );
};
