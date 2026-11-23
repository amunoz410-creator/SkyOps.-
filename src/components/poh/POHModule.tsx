import React, { useState, useEffect, useMemo } from 'react';
import { User, POHDocument, POHDocumentType } from '../../types';
import { DEFAULT_POH_LIBRARY } from './defaultPOHLibrary';
import { POHPdfRunner } from './POHPdfRunner';
import { POHUploadModal } from './POHUploadModal';
import { OFFICIAL_FLEET } from '../AircraftLogbookModule';
import { api } from '../../services/api';
import {
  BookMarked,
  FileText,
  Search,
  Upload,
  Eye,
  Download,
  ShieldCheck,
  Plane,
  FileCheck,
  Trash2,
  Edit3,
  Filter,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  BookOpen,
  Layers,
  Sparkles,
  Info
} from 'lucide-react';

interface POHModuleProps {
  currentUser: User;
}

const STORAGE_KEY = 'skyops_poh_library_v1';

export const POHModule: React.FC<POHModuleProps> = ({ currentUser }) => {
  const isJefaturaOrDireccion = currentUser.rol === 'admin' || currentUser.rol === 'escuela';
  const isStudent = currentUser.rol === 'estudiante';
  const isInstructor = currentUser.rol === 'instructor';

  const [pohList, setPohList] = useState<POHDocument[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    } catch (e) {
      console.warn('Error reading POH from localStorage:', e);
    }
    return DEFAULT_POH_LIBRARY;
  });

  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedFleetFilter, setSelectedFleetFilter] = useState<string>('TODOS');
  const [selectedTypeFilter, setSelectedTypeFilter] = useState<string>('TODOS');
  const [activeRunningDoc, setActiveRunningDoc] = useState<POHDocument | null>(null);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState<boolean>(false);
  const [editingDoc, setEditingDoc] = useState<POHDocument | null>(null);
  const [feedbackToast, setFeedbackToast] = useState<string | null>(null);

  // Cargar POHs persistidos del servidor / Firestore al montar
  useEffect(() => {
    let isMounted = true;
    api.getPOHDocuments().then(remoteDocs => {
      if (isMounted && Array.isArray(remoteDocs) && remoteDocs.length > 0) {
        setPohList(remoteDocs);
      }
    }).catch(err => {
      console.warn('No se pudo cargar POHs del servidor:', err);
    });
    return () => {
      isMounted = false;
    };
  }, []);

  // Guardar en localStorage ante cambios
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(pohList));
    } catch (e) {
      console.warn('Error saving POH to localStorage:', e);
    }
  }, [pohList]);

  // Mostrar toast temporal
  const showToast = (msg: string) => {
    setFeedbackToast(msg);
    setTimeout(() => setFeedbackToast(null), 3500);
  };

  // Guardar o actualizar POH (solo jefatura o dirección)
  const handleSavePOH = async (doc: POHDocument) => {
    // Actualizar estado local inmediatamente
    setPohList(prev => {
      const existsIndex = prev.findIndex(p => p.id === doc.id);
      if (existsIndex >= 0) {
        const updated = [...prev];
        updated[existsIndex] = doc;
        return updated;
      }
      return [doc, ...prev];
    });

    // Persistir en backend y base de datos Cloud Firestore
    try {
      await api.savePOHDocument(doc);
    } catch (err) {
      console.error('Error persistiendo POH en backend:', err);
    }

    showToast(
      doc.id === editingDoc?.id
        ? 'Manual POH actualizado exitosamente'
        : 'Nuevo archivo POH suministrado y disponible para alumnos e instructores'
    );
    setEditingDoc(null);
  };

  // Eliminar POH (solo jefatura o dirección)
  const handleDeletePOH = async (id: string, titulo: string) => {
    if (!window.confirm(`¿Confirmas eliminar el manual "${titulo}"?`)) return;
    setPohList(prev => prev.filter(p => p.id !== id));
    try {
      await api.deletePOHDocument(id);
    } catch (err) {
      console.error('Error eliminando POH del servidor:', err);
    }
    showToast('Manual POH eliminado del catálogo');
  };

  // Filtrar catálogo de POH
  const filteredPOHList = useMemo(() => {
    return pohList.filter(doc => {
      const matchSearch =
        !searchQuery.trim() ||
        doc.matricula.toLowerCase().includes(searchQuery.toLowerCase()) ||
        doc.modelo.toLowerCase().includes(searchQuery.toLowerCase()) ||
        doc.titulo.toLowerCase().includes(searchQuery.toLowerCase()) ||
        doc.version.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (doc.descripcion && doc.descripcion.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchFleet =
        selectedFleetFilter === 'TODOS' ||
        doc.matricula === selectedFleetFilter;

      const matchType =
        selectedTypeFilter === 'TODOS' ||
        doc.tipo === selectedTypeFilter;

      return matchSearch && matchFleet && matchType;
    });
  }, [pohList, searchQuery, selectedFleetFilter, selectedTypeFilter]);

  const getTypeLabel = (type: POHDocumentType) => {
    switch (type) {
      case 'poh_completo':
        return 'POH Oficial Completo';
      case 'checklist':
        return 'Lista de Chequeo (QRC)';
      case 'performance':
        return 'Rendimiento & Performance';
      case 'peso_balance':
        return 'Peso y Balance (W&B)';
      case 'suplemento':
        return 'Suplemento Aviónica';
      default:
        return 'Manual Operacional';
    }
  };

  return (
    <div id="poh-module-container" className="space-y-5">
      {/* 1. HEADER HERO DEL MÓDULO */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 sm:p-7 text-white shadow-xl relative overflow-hidden">
        {/* Ambient Glow */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-sky-600/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-5">
          <div className="max-w-2xl">
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
              POH - Manuales de Operación de Aeronaves
            </h1>
          </div>

          {/* Action button: Upload for Jefatura / Dirección */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 flex-shrink-0">
            {isJefaturaOrDireccion ? (
              <button
                onClick={() => {
                  setEditingDoc(null);
                  setIsUploadModalOpen(true);
                }}
                className="px-5 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold shadow-lg shadow-sky-600/30 transition-all cursor-pointer flex items-center justify-center gap-2 active:scale-98"
              >
                <Upload className="w-4 h-4" />
                <span>Suministrar Archivo POH (PDF)</span>
              </button>
            ) : (
              <div className="px-3.5 py-2 rounded-xl bg-slate-950/80 border border-slate-800 text-slate-300 text-xs flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                <span className="text-[11px]">
                  Modo Alumno / Instructor: <strong>Lectura & Visualización PDF</strong>
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Status Pills Bar */}
        <div className="mt-5 pt-4 border-t border-slate-800/80 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
          <div className="bg-slate-950/50 p-2.5 rounded-xl border border-slate-800/60">
            <span className="text-[10px] text-slate-400 block font-medium">Manuales en Catálogo</span>
            <span className="text-lg font-black text-white">{pohList.length}</span>
          </div>

          <div className="bg-slate-950/50 p-2.5 rounded-xl border border-slate-800/60">
            <span className="text-[10px] text-slate-400 block font-medium">Aeronaves Cubiertas</span>
            <span className="text-lg font-black text-sky-400">
              {new Set(pohList.map(p => p.matricula)).size} Flotas
            </span>
          </div>

          <div className="bg-slate-950/50 p-2.5 rounded-xl border border-slate-800/60">
            <span className="text-[10px] text-slate-400 block font-medium">Suministrado Por</span>
            <span className="text-xs font-bold text-slate-200 mt-1 block truncate">
              Jefatura & Dirección
            </span>
          </div>

          <div className="bg-slate-950/50 p-2.5 rounded-xl border border-slate-800/60">
            <span className="text-[10px] text-slate-400 block font-medium">Programa Visor PDF</span>
            <span className="text-xs font-bold text-emerald-400 mt-1 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>Motor Activo</span>
            </span>
          </div>
        </div>
      </div>

      {/* Toast feedback */}
      {feedbackToast && (
        <div className="p-3 bg-emerald-950 border border-emerald-500 rounded-xl text-emerald-200 text-xs flex items-center gap-2 animate-bounce">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
          <span>{feedbackToast}</span>
        </div>
      )}

      {/* 2. FILTERS & SEARCH BAR */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-xs space-y-3">
        <div className="flex flex-col md:flex-row gap-3">
          {/* Search Input */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar por matrícula (HP-1588), modelo (Cessna 172), título o velocidad..."
              className="w-full pl-9 pr-4 py-2 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white rounded-xl border border-slate-200 dark:border-slate-800 text-xs focus:outline-hidden focus:border-sky-500"
            />
          </div>

          {/* Document Type Dropdown */}
          <div className="w-full md:w-56">
            <select
              value={selectedTypeFilter}
              onChange={(e) => setSelectedTypeFilter(e.target.value)}
              className="w-full py-2 px-3 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white rounded-xl border border-slate-200 dark:border-slate-800 text-xs focus:outline-hidden focus:border-sky-500 font-medium"
            >
              <option value="TODOS">Todos los Tipos de Manual</option>
              <option value="poh_completo">POH Completo Oficial</option>
              <option value="checklist">Listas de Chequeo (Checklists)</option>
              <option value="performance">Rendimiento & Performance</option>
              <option value="peso_balance">Peso y Balance (W&B)</option>
              <option value="suplemento">Suplementos de Aviónica</option>
            </select>
          </div>
        </div>

        {/* Aircraft Pills Filter */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar text-xs">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mr-1 flex items-center gap-1">
            <Plane className="w-3 h-3" />
            <span>Aeronave:</span>
          </span>

          <button
            onClick={() => setSelectedFleetFilter('TODOS')}
            className={`px-3 py-1 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
              selectedFleetFilter === 'TODOS'
                ? 'bg-sky-600 text-white'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
            }`}
          >
            Todas ({pohList.length})
          </button>

          {OFFICIAL_FLEET.map((fleet) => {
            const count = pohList.filter(p => p.matricula === fleet.matricula).length;
            const isSelected = selectedFleetFilter === fleet.matricula;
            return (
              <button
                key={fleet.matricula}
                onClick={() => setSelectedFleetFilter(fleet.matricula)}
                className={`px-3 py-1 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer flex items-center gap-1.5 ${
                  isSelected
                    ? 'bg-sky-600 text-white shadow-xs'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                }`}
              >
                <span className="font-mono font-bold">{fleet.matricula}</span>
                <span className="text-[10px] opacity-75 font-normal">({count})</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 3. DOCUMENT CATALOG GRID */}
      {filteredPOHList.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-12 text-center space-y-3">
          <div className="w-12 h-12 mx-auto rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400">
            <Search className="w-6 h-6" />
          </div>
          <h4 className="text-base font-bold text-slate-800 dark:text-white">
            No se encontraron manuales POH
          </h4>
          <button
            onClick={() => {
              setSearchQuery('');
              setSelectedFleetFilter('TODOS');
              setSelectedTypeFilter('TODOS');
            }}
            className="px-4 py-2 bg-sky-600 text-white rounded-xl text-xs font-bold hover:bg-sky-500 cursor-pointer"
          >
            Restablecer Filtros
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredPOHList.map((doc) => {
            return (
              <div
                key={doc.id}
                className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-2xl p-5 shadow-xs hover:shadow-md hover:border-sky-500/50 transition-all flex flex-col justify-between group"
              >
                <div>
                  {/* Card Header: Matricula & Type Badge */}
                  <div className="flex items-center justify-between gap-2 pb-3 border-b border-slate-100 dark:border-slate-800">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="px-2.5 py-0.5 rounded-md font-mono font-black text-xs bg-sky-50 dark:bg-sky-950 text-sky-700 dark:text-sky-300 border border-sky-200 dark:border-sky-800">
                        {doc.matricula}
                      </span>
                      <span className="text-xs font-bold text-slate-600 dark:text-slate-300 truncate">
                        {doc.modelo}
                      </span>
                    </div>

                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 whitespace-nowrap">
                      {getTypeLabel(doc.tipo)}
                    </span>
                  </div>

                  {/* Title & Description */}
                  <div className="mt-3.5 space-y-1.5">
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white group-hover:text-sky-500 transition-colors line-clamp-2 leading-snug">
                      {doc.titulo}
                    </h3>

                    {doc.descripcion && (
                      <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 leading-relaxed">
                        {doc.descripcion}
                      </p>
                    )}
                  </div>

                  {/* Metadata Chips */}
                  <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800/80 grid grid-cols-2 gap-2 text-[11px]">
                    <div className="text-slate-500 dark:text-slate-400">
                      <span>Versión:</span>{' '}
                      <strong className="text-slate-800 dark:text-slate-200 font-mono">
                        {doc.version}
                      </strong>
                    </div>

                    <div className="text-slate-500 dark:text-slate-400 text-right">
                      <span>Páginas:</span>{' '}
                      <strong className="text-slate-800 dark:text-slate-200">
                        {doc.paginas} págs
                      </strong>
                    </div>

                    <div className="text-slate-500 dark:text-slate-400 col-span-2 flex items-center justify-between text-[10px] pt-1">
                      <span>Suministrado por:</span>
                      <span className="font-semibold text-sky-600 dark:text-sky-400 truncate max-w-[170px]">
                        {doc.suministrado_por}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Card Action Buttons */}
                <div className="mt-5 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center gap-2">
                  <button
                    onClick={() => setActiveRunningDoc(doc)}
                    className="flex-1 py-2 px-3 bg-sky-600 hover:bg-sky-500 text-white rounded-xl text-xs font-bold shadow-xs hover:shadow-md transition-all cursor-pointer flex items-center justify-center gap-1.5 active:scale-98"
                    title="Abrir y Correr este manual en el Visualizador de PDF"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>Correr PDF</span>
                  </button>

                  {/* Admin / Escuela Management Controls */}
                  {isJefaturaOrDireccion && (
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => {
                          setEditingDoc(doc);
                          setIsUploadModalOpen(true);
                        }}
                        className="p-2 text-slate-400 hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg cursor-pointer transition-colors"
                        title="Editar información del manual"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>

                      <button
                        onClick={() => handleDeletePOH(doc.id, doc.titulo)}
                        className="p-2 text-rose-400 hover:text-rose-200 hover:bg-rose-950/40 rounded-lg cursor-pointer transition-colors"
                        title="Eliminar este manual POH"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* 4. PROGRAMA PARA CORRER PDF (MODAL COMPLETO / VISOR RUNNER) */}
      {activeRunningDoc && (
        <POHPdfRunner
          document={activeRunningDoc}
          onClose={() => setActiveRunningDoc(null)}
        />
      )}

      {/* 5. MODAL PARA SUMINISTRAR / SUBIR POH (JEFATURA Y DIRECCIÓN) */}
      {isUploadModalOpen && (
        <POHUploadModal
          currentUser={currentUser}
          existingPOH={editingDoc}
          onClose={() => {
            setIsUploadModalOpen(false);
            setEditingDoc(null);
          }}
          onSavePOH={handleSavePOH}
        />
      )}
    </div>
  );
};
