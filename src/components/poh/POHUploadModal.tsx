import React, { useState, useRef } from 'react';
import { User, POHDocument, POHDocumentType } from '../../types';
import { OFFICIAL_FLEET } from '../AircraftLogbookModule';
import { api } from '../../services/api';
import {
  X,
  Upload,
  FileText,
  AlertTriangle,
  CheckCircle2,
  Plane,
  ShieldCheck,
  Calendar,
  Layers,
  FileUp,
  Info
} from 'lucide-react';

interface POHUploadModalProps {
  currentUser: User;
  onClose: () => void;
  onSavePOH: (doc: POHDocument) => void;
  existingPOH?: POHDocument | null;
}

export const POHUploadModal: React.FC<POHUploadModalProps> = ({
  currentUser,
  onClose,
  onSavePOH,
  existingPOH
}) => {
  const isSchoolDirection = currentUser.rol === 'escuela';
  const isJefatura = currentUser.rol === 'admin';

  const [matricula, setMatricula] = useState<string>(existingPOH?.matricula || 'HP-1588');
  const [modelo, setModelo] = useState<string>(existingPOH?.modelo || 'Cessna 172SP Nav III (G1000)');
  const [titulo, setTitulo] = useState<string>(existingPOH?.titulo || '');
  const [tipo, setTipo] = useState<POHDocumentType>(existingPOH?.tipo || 'poh_completo');
  const [version, setVersion] = useState<string>(existingPOH?.version || 'Revisión 1 (Aprobada)');
  const [fechaEmision, setFechaEmision] = useState<string>(
    existingPOH?.fecha_emision || new Date().toISOString().split('T')[0]
  );
  const [descripcion, setDescripcion] = useState<string>(existingPOH?.descripcion || '');
  const [paginas, setPaginas] = useState<number>(existingPOH?.paginas || 180);
  const [tamanoKb, setTamanoKb] = useState<number>(existingPOH?.tamano_kb || 4500);
  const [archivoUrl, setArchivoUrl] = useState<string | undefined>(existingPOH?.archivo_url);
  const [fileName, setFileName] = useState<string>(existingPOH?.archivo_url ? 'archivo_poh_cargado.pdf' : '');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFleetChange = (selectedMat: string) => {
    setMatricula(selectedMat);
    const fleetItem = OFFICIAL_FLEET.find(f => f.matricula === selectedMat);
    if (fleetItem) {
      setModelo(fleetItem.modelo);
      if (!titulo) {
        setTitulo(`Pilot's Operating Handbook & Flight Manual - ${fleetItem.modelo}`);
      }
    }
  };

  const processFile = (file: File) => {
    setErrorMsg(null);
    if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
      setErrorMsg('El archivo debe estar en formato PDF oficial (.pdf)');
      return;
    }

    setSelectedFile(file);
    setFileName(file.name);
    setTamanoKb(Math.round(file.size / 1024));

    // Si el título está vacío, deducir del nombre del archivo
    if (!titulo) {
      const cleanName = file.name.replace(/\.pdf$/i, '').replace(/_/g, ' ');
      setTitulo(cleanName);
    }

    // Leer como Data URL para previsualización inmediata
    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result as string;
      setArchivoUrl(result);
    };
    reader.onerror = () => {
      setErrorMsg('Error al leer el archivo PDF');
    };
    reader.readAsDataURL(file);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!titulo.trim()) {
      setErrorMsg('Por favor ingresa el título del manual POH');
      return;
    }

    setIsUploading(true);
    let finalUrl = archivoUrl;

    // Si se seleccionó un archivo nuevo, persistirlo en el backend
    if (selectedFile) {
      try {
        const uploadResult = await api.uploadFile(selectedFile);
        if (uploadResult && uploadResult.url) {
          finalUrl = uploadResult.url;
        }
      } catch (uploadErr) {
        console.warn('Error subiendo archivo al servidor, usando Data URL:', uploadErr);
      }
    }

    const doc: POHDocument = {
      id: existingPOH?.id || `poh-${Date.now()}`,
      matricula,
      modelo,
      titulo: titulo.trim(),
      tipo,
      version: version.trim() || 'Revisión Oficial',
      fecha_emision: fechaEmision,
      suministrado_por: isSchoolDirection
        ? 'Dirección de Escuela de Aviación'
        : 'Jefatura de Operaciones de Vuelo',
      suministrado_por_rol: isSchoolDirection ? 'escuela' : 'admin',
      suministrado_en: new Date().toISOString(),
      paginas: Number(paginas) || 120,
      tamano_kb: tamanoKb || 3500,
      descripcion: descripcion.trim(),
      archivo_url: finalUrl,
      es_oficial: true,
      secciones: existingPOH?.secciones || [
        {
          numero: 1,
          titulo: 'Sección 1: Especificaciones & Generalidades',
          resumen: `Documento suministrado para ${modelo} (${matricula}). Contiene datos de motor, consumos y dimensiones aprobadas.`
        },
        {
          numero: 2,
          titulo: 'Sección 2: Limitaciones & V-Speeds',
          resumen: `Límites operacionales aprobados por la academia para la matrícula ${matricula}.`
        },
        {
          numero: 3,
          titulo: 'Sección 3: Procedimientos de Emergencia',
          resumen: 'Listas de verificación de emergencia y maniobras críticas aprobadas.'
        }
      ]
    };

    setIsUploading(false);
    onSavePOH(doc);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-xs">
      <div className="bg-slate-900 border border-slate-800 text-white rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-sky-500/20 text-sky-400 border border-sky-400/30">
              <Upload className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">
                {existingPOH ? 'Actualizar Manual POH' : 'Suministrar Archivo POH (PDF)'}
              </h3>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-4 text-xs">
          {errorMsg && (
            <div className="p-3 rounded-xl bg-rose-950/80 border border-rose-500/60 text-rose-200 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 flex-shrink-0 text-rose-400" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Role Authorization Note */}
          <div className="p-3 rounded-xl bg-sky-950/40 border border-sky-800/60 text-sky-200 flex items-start gap-2.5">
            <ShieldCheck className="w-4 h-4 flex-shrink-0 text-sky-400 mt-0.5" />
            <div className="text-[11px] leading-relaxed">
              Los archivos POH suministrados estarán disponibles inmediatamente en el{' '}
              <strong>Visualizador de PDF Integrado</strong> para todos los Estudiantes Piloto e
              Instructores CFI de la academia.
            </div>
          </div>

          {/* Fleet Selection */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="font-bold text-slate-300 block mb-1">
                Aeronave de la Flota (Matrícula)
              </label>
              <select
                value={matricula}
                onChange={(e) => handleFleetChange(e.target.value)}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white font-mono focus:border-sky-500 focus:outline-hidden"
              >
                {OFFICIAL_FLEET.map((f) => (
                  <option key={f.matricula} value={f.matricula}>
                    {f.matricula} - {f.modelo}
                  </option>
                ))}
                <option value="GENERAL">FLOTA GENERAL (Toda la academia)</option>
              </select>
            </div>

            <div>
              <label className="font-bold text-slate-300 block mb-1">
                Modelo / Fabricante
              </label>
              <input
                type="text"
                value={modelo}
                onChange={(e) => setModelo(e.target.value)}
                placeholder="Ej: Cessna 172SP Nav III"
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white focus:border-sky-500 focus:outline-hidden"
                required
              />
            </div>
          </div>

          {/* Document Title */}
          <div>
            <label className="font-bold text-slate-300 block mb-1">
              Título Oficial del Manual POH
            </label>
            <input
              type="text"
              value={titulo}
              onChange={(e) => setTitulo(e.target.value)}
              placeholder="Ej: Pilot's Operating Handbook & FAA Approved AFM - Model 172SP"
              className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white focus:border-sky-500 focus:outline-hidden font-medium"
              required
            />
          </div>

          {/* Type, Version, Date */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="font-bold text-slate-300 block mb-1">
                Tipo de Manual
              </label>
              <select
                value={tipo}
                onChange={(e) => setTipo(e.target.value as POHDocumentType)}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white focus:border-sky-500 focus:outline-hidden"
              >
                <option value="poh_completo">POH Completo Oficial</option>
                <option value="checklist">Lista de Chequeo Rápida (QRC)</option>
                <option value="performance">Rendimiento & Performance</option>
                <option value="peso_balance">Peso y Balance (W&B)</option>
                <option value="suplemento">Suplemento de Aviónica</option>
              </select>
            </div>

            <div>
              <label className="font-bold text-slate-300 block mb-1">
                Revisión / Versión
              </label>
              <input
                type="text"
                value={version}
                onChange={(e) => setVersion(e.target.value)}
                placeholder="Ej: Revisión 5 (Aprobada)"
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white focus:border-sky-500 focus:outline-hidden"
              />
            </div>

            <div>
              <label className="font-bold text-slate-300 block mb-1">
                Fecha de Emisión
              </label>
              <input
                type="date"
                value={fechaEmision}
                onChange={(e) => setFechaEmision(e.target.value)}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white focus:border-sky-500 focus:outline-hidden"
              />
            </div>
          </div>

          {/* PDF File Dropzone / Uploader */}
          <div>
            <label className="font-bold text-slate-300 block mb-1">
              Archivo Digital PDF
            </label>
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`p-6 rounded-2xl border-2 border-dashed flex flex-col items-center justify-center text-center cursor-pointer transition-all ${
                isDragging
                  ? 'border-sky-400 bg-sky-950/40'
                  : archivoUrl
                  ? 'border-emerald-500/60 bg-emerald-950/20'
                  : 'border-slate-800 hover:border-slate-700 bg-slate-950/50'
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,application/pdf"
                onChange={handleFileChange}
                className="hidden"
              />

              {archivoUrl ? (
                <div className="space-y-2">
                  <div className="w-12 h-12 mx-auto rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center border border-emerald-400/30">
                    <CheckCircle2 className="w-6 h-6" />
                  </div>
                  <div>
                    <span className="font-bold text-white text-xs block truncate max-w-sm">
                      {fileName || 'documento_poh.pdf'}
                    </span>
                    <span className="text-[11px] text-emerald-400 font-mono">
                      Archivo cargado con éxito ({tamanoKb} KB) • Listo para visualizar
                    </span>
                  </div>
                  <span className="text-[10px] text-slate-400 underline block pt-1">
                    Haz clic para reemplazar por otro archivo PDF
                  </span>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="w-12 h-12 mx-auto rounded-full bg-sky-500/20 text-sky-400 flex items-center justify-center border border-sky-400/30">
                    <FileUp className="w-6 h-6" />
                  </div>
                  <div>
                    <span className="font-bold text-white text-xs block">
                      Arrastra y suelta el archivo PDF aquí o haz clic para examinar
                    </span>
                    <span className="text-[10px] text-slate-400 block mt-0.5">
                      Soporta manuales POH, checklists y suplementos en formato .pdf
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Description / Notes */}
          <div>
            <label className="font-bold text-slate-300 block mb-1">
              Notas u Observaciones Operacionales
            </label>
            <textarea
              value={descripcion}
              onChange={(e) => setDescripcion(e.target.value)}
              rows={2}
              placeholder="Ej: Manual aplicable a aeronaves con Garmin G1000 y motor de inyección de 180 HP."
              className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white focus:border-sky-500 focus:outline-hidden resize-none"
            />
          </div>

          {/* Modal Actions */}
          <div className="pt-4 border-t border-slate-800 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-slate-300 hover:text-white hover:bg-slate-800 font-semibold cursor-pointer transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isUploading}
              className="px-5 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 disabled:opacity-50 text-white font-bold shadow-lg shadow-sky-600/30 transition-all cursor-pointer flex items-center gap-2"
            >
              <Upload className="w-4 h-4" />
              <span>
                {isUploading
                  ? 'Guardando archivo...'
                  : existingPOH
                  ? 'Actualizar POH'
                  : 'Suministrar & Publicar POH'}
              </span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
