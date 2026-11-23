import React, { useState, useMemo } from 'react';
import { POHDocument, POHSection } from '../../types';
import {
  X,
  Maximize2,
  Minimize2,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Download,
  Printer,
  Search,
  ChevronLeft,
  ChevronRight,
  Bookmark,
  FileText,
  AlertTriangle,
  CheckCircle2,
  Moon,
  Sun,
  ShieldCheck,
  Plane,
  Gauge,
  Scale,
  Settings,
  Layers,
  Sparkles,
  ExternalLink
} from 'lucide-react';

interface POHPdfRunnerProps {
  document: POHDocument;
  onClose: () => void;
  onDownload?: (doc: POHDocument) => void;
}

export const POHPdfRunner: React.FC<POHPdfRunnerProps> = ({
  document,
  onClose,
  onDownload
}) => {
  const [zoomLevel, setZoomLevel] = useState<number>(100);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [activeSectionIndex, setActiveSectionIndex] = useState<number>(0);
  const [cockpitNightMode, setCockpitNightMode] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [viewMode, setViewMode] = useState<'digital' | 'pdf_embed'>('digital');
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [checkedChecklistItems, setCheckedChecklistItems] = useState<Record<string, boolean>>({});

  const totalPages = document.paginas || 120;
  const sections = document.secciones || [];
  const currentSection: POHSection | undefined = sections[activeSectionIndex] || sections[0];

  const handleZoomIn = () => setZoomLevel(prev => Math.min(200, prev + 15));
  const handleZoomOut = () => setZoomLevel(prev => Math.max(70, prev - 15));
  const handleZoomReset = () => setZoomLevel(100);

  const handlePrevPage = () => {
    setCurrentPage(prev => Math.max(1, prev - 1));
    if (activeSectionIndex > 0 && currentPage <= (activeSectionIndex * 15)) {
      setActiveSectionIndex(prev => prev - 1);
    }
  };

  const handleNextPage = () => {
    setCurrentPage(prev => Math.min(totalPages, prev + 1));
    if (activeSectionIndex < sections.length - 1 && currentPage >= ((activeSectionIndex + 1) * 15)) {
      setActiveSectionIndex(prev => prev + 1);
    }
  };

  const handleSelectSection = (index: number) => {
    setActiveSectionIndex(index);
    // Calcular página aproximada según sección
    const approxPage = Math.max(1, index * 25 + 1);
    setCurrentPage(approxPage);
  };

  const toggleChecklistItem = (key: string) => {
    setCheckedChecklistItems(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  const toggleFullscreen = () => {
    if (!documentRef.current) return;
    if (!isFullscreen) {
      if (documentRef.current.requestFullscreen) {
        documentRef.current.requestFullscreen();
      }
      setIsFullscreen(true);
    } else {
      if (window.document.exitFullscreen) {
        window.document.exitFullscreen();
      }
      setIsFullscreen(false);
    }
  };

  const documentRef = React.useRef<HTMLDivElement>(null);

  // Filtrar secciones por búsqueda si hay query
  const filteredSections = useMemo(() => {
    if (!searchQuery.trim()) return sections;
    const query = searchQuery.toLowerCase();
    return sections.filter(sec =>
      sec.titulo.toLowerCase().includes(query) ||
      sec.subtitulo?.toLowerCase().includes(query) ||
      sec.resumen?.toLowerCase().includes(query) ||
      sec.items_clave?.some(i => i.etiqueta.toLowerCase().includes(query) || i.valor.toLowerCase().includes(query)) ||
      sec.items_checklist?.some(c => c.paso.toLowerCase().includes(query) || c.accion.toLowerCase().includes(query))
    );
  }, [sections, searchQuery]);

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadFile = () => {
    if (onDownload) {
      onDownload(document);
    } else if (document.archivo_url) {
      const a = window.document.createElement('a');
      a.href = document.archivo_url;
      a.download = `${document.matricula}_${document.modelo.replace(/\s+/g, '_')}_POH.pdf`;
      a.click();
    } else {
      // Generar descarga de texto oficial si no hay archivo binario adjunto
      const text = `=====================================================
SKY OPS - MANUAL DE OPERACIÓN OFICIAL (POH)
AERONAVE: ${document.matricula} (${document.modelo})
TÍTULO: ${document.titulo}
VERSIÓN: ${document.version}
EMISIÓN: ${document.fecha_emision}
SUMINISTRADO POR: ${document.suministrado_por} (${document.suministrado_por_rol})
=====================================================
${sections.map(s => `
[${s.titulo.toUpperCase()}]
${s.subtitulo || ''}
${s.resumen || ''}

Puntos Clave:
${s.items_clave?.map(k => ` - ${k.etiqueta}: ${k.valor}`).join('\n') || 'N/A'}

Checklist / Procedimientos:
${s.items_checklist?.map(c => ` [ ] ${c.paso}: ${c.accion}`).join('\n') || 'N/A'}
`).join('\n-----------------------------------------------------\n')}
`;
      const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = window.document.createElement('a');
      a.href = url;
      a.download = `POH_${document.matricula}_${document.version}.txt`;
      a.click();
      URL.revokeObjectURL(url);
    }
  };

  return (
    <div
      ref={documentRef}
      id="poh-pdf-runner-container"
      className={`fixed inset-0 z-50 flex flex-col transition-colors duration-200 select-none ${
        cockpitNightMode
          ? 'bg-red-950/95 text-red-100 dark:bg-red-950'
          : 'bg-slate-900 text-slate-100'
      }`}
    >
      {/* 1. TOP RUNNER HEADER BAR */}
      <header
        className={`px-3 py-2 border-b flex flex-wrap items-center justify-between gap-2 flex-shrink-0 ${
          cockpitNightMode
            ? 'bg-red-950 border-red-900/80 text-red-200'
            : 'bg-slate-950 border-slate-800 text-slate-200'
        }`}
      >
        {/* Left: Document Info & Fleet Badge */}
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="p-1.5 rounded-lg bg-sky-500/20 text-sky-400 border border-sky-400/30 flex-shrink-0">
            <FileText className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-mono font-black text-xs px-2 py-0.5 rounded bg-sky-950 text-sky-300 border border-sky-800">
                {document.matricula}
              </span>
              <span className="font-bold text-xs text-white truncate max-w-[200px] sm:max-w-[340px]">
                {document.modelo}
              </span>
              <span className="hidden md:inline-block text-[10px] text-slate-400 font-medium truncate max-w-[200px]">
                • {document.version}
              </span>
            </div>
            <span className="text-[10px] text-slate-400 block truncate">
              {document.titulo}
            </span>
          </div>
        </div>

        {/* Center: Controls & Mode Switcher */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          {/* Mode Switcher */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-lg p-0.5 flex items-center text-[11px] font-semibold">
            <button
              onClick={() => setViewMode('digital')}
              className={`px-2.5 py-1 rounded-md transition-all cursor-pointer ${
                viewMode === 'digital'
                  ? 'bg-sky-600 text-white shadow-xs font-bold'
                  : 'text-slate-400 hover:text-white'
              }`}
              title="Visualizador Digital Interactivo con Checklist y V-Speeds"
            >
              Manual Digital
            </button>
            <button
              onClick={() => setViewMode('pdf_embed')}
              className={`px-2.5 py-1 rounded-md transition-all cursor-pointer flex items-center gap-1 ${
                viewMode === 'pdf_embed'
                  ? 'bg-sky-600 text-white shadow-xs font-bold'
                  : 'text-slate-400 hover:text-white'
              }`}
              title="Corredor de PDF Oficial Embebido"
            >
              <span>Visor PDF</span>
              {document.archivo_url && (
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              )}
            </button>
          </div>

          {/* Zoom controls */}
          <div className="hidden sm:flex items-center gap-1 bg-slate-900/80 border border-slate-800 rounded-lg p-0.5">
            <button
              onClick={handleZoomOut}
              className="p-1 text-slate-400 hover:text-white hover:bg-slate-800 rounded cursor-pointer"
              title="Alejar (-15%)"
            >
              <ZoomOut className="w-4 h-4" />
            </button>
            <span className="text-[11px] font-mono font-bold px-1 text-slate-300 min-w-[40px] text-center">
              {zoomLevel}%
            </span>
            <button
              onClick={handleZoomIn}
              className="p-1 text-slate-400 hover:text-white hover:bg-slate-800 rounded cursor-pointer"
              title="Acercar (+15%)"
            >
              <ZoomIn className="w-4 h-4" />
            </button>
            <button
              onClick={handleZoomReset}
              className="p-1 text-slate-400 hover:text-white hover:bg-slate-800 rounded cursor-pointer"
              title="Restablecer a 100%"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Page navigator */}
          <div className="flex items-center gap-1 bg-slate-900/80 border border-slate-800 rounded-lg px-2 py-0.5">
            <button
              onClick={handlePrevPage}
              disabled={currentPage <= 1}
              className="p-1 text-slate-400 hover:text-white disabled:opacity-30 cursor-pointer"
              title="Página anterior"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-[11px] font-mono text-slate-300">
              Pág. <strong className="text-white">{currentPage}</strong> / {totalPages}
            </span>
            <button
              onClick={handleNextPage}
              disabled={currentPage >= totalPages}
              className="p-1 text-slate-400 hover:text-white disabled:opacity-30 cursor-pointer"
              title="Página siguiente"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Cockpit Night Filter */}
          <button
            onClick={() => setCockpitNightMode(prev => !prev)}
            className={`p-1.5 rounded-lg border text-xs font-semibold flex items-center gap-1 cursor-pointer transition-colors ${
              cockpitNightMode
                ? 'bg-red-900/80 border-red-500 text-red-200'
                : 'bg-slate-900 border-slate-800 text-slate-300 hover:text-white'
            }`}
            title="Modo Nocturno de Cabina (Filtro Rojo Antideslumbrante para Pilotos)"
          >
            <Moon className="w-4 h-4 text-rose-400" />
            <span className="hidden lg:inline text-[10px]">Luz Roja</span>
          </button>

          {/* Action Buttons: Print, Download, Fullscreen, Close */}
          <button
            onClick={handlePrint}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg cursor-pointer"
            title="Imprimir Manual"
          >
            <Printer className="w-4 h-4" />
          </button>

          <button
            onClick={handleDownloadFile}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg cursor-pointer"
            title="Descargar Archivo PDF / Documento"
          >
            <Download className="w-4 h-4" />
          </button>

          <button
            onClick={toggleFullscreen}
            className="hidden sm:inline-flex p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg cursor-pointer"
            title={isFullscreen ? 'Salir de pantalla completa' : 'Pantalla completa'}
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>

          <button
            onClick={onClose}
            className="p-1.5 bg-rose-600/20 hover:bg-rose-600 text-rose-300 hover:text-white border border-rose-500/30 rounded-lg transition-colors cursor-pointer ml-1"
            title="Cerrar Corredor de PDF"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* 2. MAIN RUNNER WORKSPACE */}
      <div className="flex-1 flex overflow-hidden">
        {/* LEFT INDEX / DRAWER (SECTIONS) */}
        <aside
          className={`w-64 sm:w-72 flex-shrink-0 border-r flex flex-col transition-colors overflow-hidden ${
            cockpitNightMode
              ? 'bg-red-950/70 border-red-900/60'
              : 'bg-slate-950/80 border-slate-800'
          }`}
        >
          {/* Section Search */}
          <div className="p-2.5 border-b border-slate-800/80">
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar velocidad, falla..."
                className="w-full pl-8 pr-2.5 py-1.5 bg-slate-900 text-xs rounded-lg border border-slate-800 text-slate-200 placeholder-slate-500 focus:outline-hidden focus:border-sky-500"
              />
            </div>
          </div>

          {/* Section List */}
          <div className="flex-1 overflow-y-auto p-2 space-y-1 no-scrollbar">
            <div className="px-2 py-1 text-[10px] uppercase font-black tracking-wider text-slate-400">
              Índice General (9 Secciones)
            </div>

            {filteredSections.map((sec, idx) => {
              const isSelected = activeSectionIndex === idx;
              return (
                <button
                  key={sec.numero}
                  onClick={() => handleSelectSection(idx)}
                  className={`w-full text-left p-2.5 rounded-xl transition-all cursor-pointer flex flex-col gap-0.5 ${
                    isSelected
                      ? cockpitNightMode
                        ? 'bg-red-900 text-white font-bold border border-red-600 shadow-xs'
                        : 'bg-sky-600 text-white font-bold shadow-md shadow-sky-600/30'
                      : cockpitNightMode
                      ? 'text-red-300 hover:bg-red-900/40'
                      : 'text-slate-300 hover:bg-slate-900 hover:text-white'
                  }`}
                >
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-mono font-bold">Sec. {sec.numero}</span>
                    {sec.items_checklist && (
                      <span className="text-[9px] px-1.5 py-0.2 rounded bg-black/30 text-sky-200 font-normal">
                        Checklist
                      </span>
                    )}
                  </div>
                  <span className="text-[11px] font-medium leading-tight truncate">
                    {sec.titulo.replace(/^Sección \d+:\s*/, '')}
                  </span>
                  {sec.subtitulo && (
                    <span className="text-[9px] opacity-75 truncate">
                      {sec.subtitulo}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Footer Metadata */}
          <div className="p-3 border-t border-slate-800/80 bg-slate-950/60 text-[10px] text-slate-400 space-y-1">
            <div className="flex items-center justify-between">
              <span>Suministrado por:</span>
              <strong className="text-slate-200">{document.suministrado_por}</strong>
            </div>
            <div className="flex items-center justify-between">
              <span>Acreditación:</span>
              <span className="text-sky-400 font-semibold">{document.es_oficial ? 'Oficial Escuela' : 'Manual Auxiliar'}</span>
            </div>
          </div>
        </aside>

        {/* RIGHT DOCUMENT DISPLAY AREA */}
        <main className="flex-1 overflow-y-auto bg-slate-950 flex flex-col items-center p-3 sm:p-6">
          {/* VIEW MODE A: EMBEDDED REAL PDF RUNNER */}
          {viewMode === 'pdf_embed' ? (
            <div className="w-full h-full flex flex-col items-center justify-center">
              {document.archivo_url ? (
                <iframe
                  src={`${document.archivo_url}#toolbar=1&navpanes=1&scrollbar=1&view=FitH`}
                  title={`Visor PDF ${document.titulo}`}
                  className="w-full h-full rounded-xl border border-slate-800 shadow-2xl bg-white"
                />
              ) : (
                <div className="max-w-md text-center p-8 bg-slate-900 rounded-2xl border border-slate-800 shadow-xl space-y-4">
                  <div className="w-14 h-14 mx-auto rounded-2xl bg-sky-500/20 text-sky-400 flex items-center justify-center border border-sky-400/30">
                    <FileText className="w-7 h-7" />
                  </div>
                  <div>
                    <h4 className="text-base font-bold text-white">Visualizador Digital Activo</h4>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-left text-xs space-y-1.5">
                    <div className="flex justify-between">
                      <span className="text-slate-400">Aeronave:</span>
                      <strong className="text-white">{document.matricula} ({document.modelo})</strong>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Edición:</span>
                      <strong className="text-sky-400">{document.version}</strong>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Páginas Oficiales:</span>
                      <strong className="text-white">{document.paginas} págs</strong>
                    </div>
                  </div>
                  <button
                    onClick={() => setViewMode('digital')}
                    className="w-full py-2.5 px-4 bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold rounded-xl shadow-lg transition-colors cursor-pointer"
                  >
                    Abrir Manual Digital Interactivo
                  </button>
                </div>
              )}
            </div>
          ) : (
            /* VIEW MODE B: RICH DIGITAL POH RUNNER (WITH V-SPEEDS, CHECKLISTS, PERFORMANCE) */
            <div
              style={{ transform: `scale(${zoomLevel / 100})`, transformOrigin: 'top center' }}
              className={`w-full max-w-4xl transition-transform duration-150 rounded-2xl p-6 sm:p-10 shadow-2xl border space-y-8 ${
                cockpitNightMode
                  ? 'bg-red-950 text-red-100 border-red-900'
                  : 'bg-slate-900 text-slate-100 border-slate-800'
              }`}
            >
              {/* Document Page Header (Aviation Standard Header) */}
              <div className="border-b border-slate-800 pb-4 flex items-center justify-between">
                <div>
                  <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                    {currentSection?.titulo || document.titulo}
                  </h2>
                  {currentSection?.subtitulo && (
                    <p className="text-xs text-sky-300 font-medium mt-0.5">
                      {currentSection.subtitulo}
                    </p>
                  )}
                </div>

                <div className="text-right">
                  <span className="font-mono text-xs px-2.5 py-1 rounded bg-slate-800 text-slate-200 border border-slate-700 font-bold">
                    {document.matricula}
                  </span>
                  <span className="block text-[10px] text-slate-400 mt-1 font-mono">
                    Pág. {currentPage}
                  </span>
                </div>
              </div>

              {/* Section Summary / Narrative */}
              {currentSection?.resumen && (
                <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800/80 text-xs text-slate-300 leading-relaxed">
                  <p className="font-medium">{currentSection.resumen}</p>
                </div>
              )}

              {/* KEY ITEMS GRID (V-Speeds, Weights, Limits, Systems) */}
              {currentSection?.items_clave && currentSection.items_clave.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-400">
                    <Gauge className="w-4 h-4 text-sky-400" />
                    <span>Datos Técnicos & Velocidades Certificadas</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                    {currentSection.items_clave.map((item, i) => (
                      <div
                        key={i}
                        className={`p-3 rounded-xl border flex flex-col justify-between transition-colors ${
                          item.advertencia
                            ? 'bg-rose-950/50 border-rose-600/50 text-rose-200'
                            : 'bg-slate-950/60 border-slate-800 text-slate-200 hover:border-slate-700'
                        }`}
                      >
                        <span className="text-[11px] text-slate-400 font-medium">{item.etiqueta}</span>
                        <span className={`text-sm font-mono font-bold mt-1 ${item.advertencia ? 'text-rose-400 font-black' : 'text-white'}`}>
                          {item.valor}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* CHECKLIST SECTION (If present, interactive with checkable boxes) */}
              {currentSection?.items_checklist && currentSection.items_checklist.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-400">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                      <span>Lista de Chequeo / Procedimientos Operacionales</span>
                    </div>
                    <span className="text-[10px] text-slate-400">
                      (Haz clic en cada elemento para marcar como completado)
                    </span>
                  </div>

                  <div className="space-y-2">
                    {currentSection.items_checklist.map((chk, i) => {
                      const itemKey = `${document.id}-${activeSectionIndex}-${i}`;
                      const isDone = checkedChecklistItems[itemKey];

                      return (
                        <div
                          key={i}
                          onClick={() => toggleChecklistItem(itemKey)}
                          className={`p-3 rounded-xl border flex items-start gap-3 cursor-pointer transition-all ${
                            chk.critico
                              ? isDone
                                ? 'bg-emerald-950/30 border-emerald-600/40 text-slate-400 opacity-60 line-through'
                                : 'bg-rose-950/40 border-rose-500/60 text-rose-100 hover:bg-rose-950/60'
                              : isDone
                              ? 'bg-slate-950/40 border-slate-800/40 text-slate-500 line-through'
                              : 'bg-slate-950/70 border-slate-800 text-slate-200 hover:border-sky-500/50'
                          }`}
                        >
                          <div
                            className={`w-5 h-5 rounded-md border flex items-center justify-center flex-shrink-0 mt-0.5 transition-colors ${
                              isDone
                                ? 'bg-emerald-500 border-emerald-400 text-white'
                                : chk.critico
                                ? 'border-rose-400 bg-rose-900/40 text-rose-300'
                                : 'border-slate-700 bg-slate-900 text-transparent'
                            }`}
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                          </div>

                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className={`text-xs font-bold ${chk.critico && !isDone ? 'text-rose-300' : 'text-white'}`}>
                                {chk.paso}
                              </span>
                              {chk.critico && (
                                <span className="text-[9px] font-black uppercase px-1.5 py-0.2 rounded bg-rose-500 text-white">
                                  Memoria
                                </span>
                              )}
                            </div>
                            <p className="text-[11px] text-slate-400 mt-0.5 leading-relaxed font-mono">
                              {chk.accion}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* AVIATION DISCLAIMER FOOTER */}
              <div className="pt-6 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3 text-[10px] text-slate-500">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  <span>Documentación Oficial aprobada para adiestramiento de vuelo RAC 141 / RAC 61</span>
                </div>
                <span>SkyOps Flight Ops • Revisión Digital Continua</span>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
};
