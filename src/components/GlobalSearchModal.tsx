import React, { useState, useEffect, useRef } from 'react';
import { User, GlobalSearchResult, SearchCategory, GlobalSearchResponse } from '../types';
import { api } from '../services/api';
import { useLanguage } from '../i18n/LanguageContext';
import { ImageViewerModal } from './ImageViewerModal';
import {
  Search,
  X,
  Users,
  CreditCard,
  FileText,
  Calendar,
  Shield,
  ShieldAlert,
  Plane,
  MessageSquare,
  Mail,
  ArrowRight,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  Clock,
  ChevronRight,
  Eye,
  CornerDownLeft,
  Filter,
  Loader2,
  ExternalLink,
  DollarSign
} from 'lucide-react';

interface GlobalSearchModalProps {
  currentUser: User;
  allUsers: User[];
  isOpen: boolean;
  onClose: () => void;
  onNavigateTab: (tab: string, extraId?: string, userContextId?: string) => void;
  onSelectUser?: (user: User) => void;
}

export const GlobalSearchModal: React.FC<GlobalSearchModalProps> = ({
  currentUser,
  allUsers,
  isOpen,
  onClose,
  onNavigateTab,
  onSelectUser
}) => {
  const { t, language } = useLanguage();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<SearchCategory>('all');
  const [results, setResults] = useState<GlobalSearchResult[]>([]);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState<number>(0);
  const [selectedVoucherTx, setSelectedVoucherTx] = useState<any | null>(null);

  const inputRef = useRef<HTMLInputElement>(null);
  const resultsContainerRef = useRef<HTMLDivElement>(null);

  const isAccounting = currentUser.rol === 'contabilidad';

  // Quick search suggestions
  const quickSuggestions = [
    { label: 'Daniel Alvarado', query: 'Daniel Alvarado', cat: 'users' },
    { label: 'Piper HP-1822', query: 'HP-1822', cat: 'fleet' },
    { label: 'Comprobantes ACH', query: 'ACH', cat: 'transactions' },
    { label: 'Vigencias Médicas', query: 'medico', cat: 'medical' },
    ...(!isAccounting ? [{ label: 'Lección 4', query: 'leccion 4', cat: 'flight_sheets' }] : []),
    { label: 'Monomotor IFR', query: 'IFR', cat: 'itinerarios' },
  ];

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
    } else {
      setSearchTerm('');
      setResults([]);
      setSelectedIndex(0);
    }
  }, [isOpen]);

  // Ejecutar búsqueda con debounce
  useEffect(() => {
    if (!isOpen) return;

    const trimmed = searchTerm.trim();
    if (!trimmed) {
      setResults([]);
      setCounts({});
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    const handler = setTimeout(async () => {
      try {
        const data = await api.searchPlatform(trimmed, selectedCategory);
        const filteredResults = isAccounting
          ? (data.results || []).filter(r => r.category !== 'flight_sheets' && r.targetTab !== 'progreso')
          : (data.results || []);
        setResults(filteredResults);
        setCounts(data.countsByCategory || {});
        setSelectedIndex(0);
      } catch (err) {
        console.error('Error en búsqueda:', err);
      } finally {
        setIsLoading(false);
      }
    }, 180);

    return () => clearTimeout(handler);
  }, [searchTerm, selectedCategory, isOpen]);

  // Manejo de teclado (Atajos de flechas, Enter y Escape)
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose();
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(prev => (results.length > 0 ? (prev + 1) % results.length : 0));
      scrollActiveIntoView(selectedIndex + 1);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(prev => (results.length > 0 ? (prev - 1 + results.length) % results.length : 0));
      scrollActiveIntoView(selectedIndex - 1);
    } else if (e.key === 'Enter') {
      if (results.length > 0 && results[selectedIndex]) {
        e.preventDefault();
        handleResultClick(results[selectedIndex]);
      }
    }
  };

  const scrollActiveIntoView = (index: number) => {
    if (!resultsContainerRef.current) return;
    const items = resultsContainerRef.current.querySelectorAll('[data-search-item]');
    if (items[index]) {
      items[index].scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }
  };

  const handleResultClick = (result: GlobalSearchResult) => {
    // Si es transacción con voucher y se quiere ver comprobante
    if (result.category === 'transactions' && result.raw?.archivo_adjunto && result.actionText?.includes('Comprobante')) {
      setSelectedVoucherTx(result.raw);
      return;
    }

    onClose();

    // Si tiene un usuario asociado que podemos simular si se pide
    if (result.userContextId && onSelectUser) {
      const userToSelect = allUsers.find(u => u.id === result.userContextId);
      if (userToSelect && currentUser.rol === 'admin') {
        // mantener sesión administrativa o pasar contexto
      }
    }

    // Navegar al tab objetivo
    onNavigateTab(result.targetTab, result.targetId, result.userContextId);
  };

  const getCategoryIcon = (category: SearchCategory) => {
    switch (category) {
      case 'users':
        return <Users className="w-4 h-4 text-sky-600" />;
      case 'transactions':
        return <CreditCard className="w-4 h-4 text-emerald-600" />;
      case 'flight_sheets':
        return <FileText className="w-4 h-4 text-blue-600" />;
      case 'itineraries':
        return <Calendar className="w-4 h-4 text-indigo-600" />;
      case 'medical':
        return <ShieldAlert className="w-4 h-4 text-amber-600" />;
      case 'fleet':
        return <Plane className="w-4 h-4 text-cyan-600" />;
      case 'messages':
        return <MessageSquare className="w-4 h-4 text-purple-600" />;
      case 'emails':
        return <Mail className="w-4 h-4 text-slate-600" />;
      default:
        return <Sparkles className="w-4 h-4 text-sky-500" />;
    }
  };

  const getBadgeStyle = (badgeColor?: string) => {
    switch (badgeColor) {
      case 'emerald':
        return 'bg-emerald-100 text-emerald-800 border-emerald-200';
      case 'amber':
        return 'bg-amber-100 text-amber-900 border-amber-300';
      case 'rose':
        return 'bg-rose-100 text-rose-800 border-rose-200';
      case 'purple':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'sky':
        return 'bg-sky-100 text-sky-800 border-sky-200';
      case 'yellow':
        return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      default:
        return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  if (!isOpen) return null;

  return (
    <>
      <div
        className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-start justify-center p-3 sm:p-6 sm:pt-14 overflow-y-auto animate-fadeIn"
        onClick={onClose}
      >
        <div
          className="bg-white w-full max-w-3xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[88vh] text-slate-800 transition-all transform scale-100"
          onClick={e => e.stopPropagation()}
          onKeyDown={handleKeyDown}
        >
          {/* Top Search Bar Input */}
          <div className="relative border-b border-slate-200 px-4 py-3.5 flex items-center gap-3 bg-slate-50/70">
            <Search className="w-5 h-5 text-sky-600 flex-shrink-0" />
            <input
              ref={inputRef}
              type="text"
              id="global-search-input"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              placeholder={
                language === 'es'
                  ? 'Buscar alumnos, instructores, transacciones ACH, hojas de vuelo, matrículas, certificados médicos...'
                  : 'Search students, instructors, ACH payments, flight sheets, tail numbers, medical certs...'
              }
              className="w-full bg-transparent text-sm sm:text-base font-medium text-slate-900 placeholder:text-slate-400 focus:outline-none"
            />
            {isLoading && <Loader2 className="w-4 h-4 text-sky-600 animate-spin flex-shrink-0" />}
            {searchTerm && (
              <button
                onClick={() => {
                  setSearchTerm('');
                  inputRef.current?.focus();
                }}
                className="p-1 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-200 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            )}
            <div className="hidden sm:flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 text-[10px] font-semibold text-slate-500 bg-white border border-slate-300 rounded shadow-xs">
                ESC
              </kbd>
            </div>
          </div>

          {/* Category Tabs Header */}
          <div className="px-4 py-2 border-b border-slate-100 bg-white flex items-center gap-1.5 overflow-x-auto no-scrollbar">
            {[
              { id: 'all', label: language === 'es' ? 'Todo' : 'All', count: counts.all },
              { id: 'users', label: language === 'es' ? 'Usuarios & Alumnos' : 'Users & Students', count: counts.users },
              { id: 'transactions', label: language === 'es' ? 'Contabilidad & ACH' : 'Accounting & ACH', count: counts.transactions },
              ...(!isAccounting ? [{ id: 'flight_sheets', label: language === 'es' ? 'Hojas de Vuelo' : 'Flight Sheets', count: counts.flight_sheets }] : []),
              { id: 'itinerarios', label: language === 'es' ? 'Agenda & Vuelos' : 'Itineraries', count: counts.itineraries },
              { id: 'medical', label: language === 'es' ? 'Médico AAC' : 'AAC Medical', count: counts.medical },
              { id: 'fleet', label: language === 'es' ? 'Flota' : 'Fleet', count: counts.fleet },
              { id: 'messages', label: language === 'es' ? 'Mensajes' : 'Messages', count: counts.messages },
              { id: 'emails', label: language === 'es' ? 'Correos' : 'Emails', count: counts.emails },
            ].map(tab => (
              <button
                key={tab.id}
                id={`search-tab-${tab.id}`}
                onClick={() => setSelectedCategory(tab.id as SearchCategory)}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold whitespace-nowrap transition-all cursor-pointer flex items-center gap-1.5 ${
                  selectedCategory === tab.id
                    ? 'bg-sky-600 text-white shadow-xs'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                <span>{tab.label}</span>
                {tab.count !== undefined && tab.count > 0 && (
                  <span
                    className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                      selectedCategory === tab.id ? 'bg-white/25 text-white' : 'bg-slate-200 text-slate-700'
                    }`}
                  >
                    {tab.count}
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* Results List Area */}
          <div ref={resultsContainerRef} className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-2 min-h-[260px] max-h-[55vh]">
            {!searchTerm.trim() ? (
              <div className="py-6 px-4 text-center space-y-4">
                <div className="w-12 h-12 rounded-2xl bg-sky-50 text-sky-600 border border-sky-100 flex items-center justify-center mx-auto shadow-xs">
                  <Search className="w-6 h-6" />
                </div>
                <div className="space-y-1 max-w-md mx-auto">
                  <h3 className="text-sm font-bold text-slate-800">
                    {language === 'es' ? 'Buscador Unificado de la Plataforma' : 'Platform Unified Search'}
                  </h3>
                </div>

                {/* Quick Suggestion Chips */}
                <div className="pt-2">
                  <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-2">
                    {language === 'es' ? 'Sugerencias de Búsqueda Rápida:' : 'Quick Search Suggestions:'}
                  </span>
                  <div className="flex flex-wrap items-center justify-center gap-1.5">
                    {quickSuggestions.map((item, idx) => (
                      <button
                        key={idx}
                        onClick={() => {
                          setSearchTerm(item.query);
                          setSelectedCategory('all');
                        }}
                        className="px-2.5 py-1 rounded-full text-xs font-medium bg-slate-100 hover:bg-sky-50 hover:text-sky-700 hover:border-sky-200 border border-slate-200 text-slate-700 cursor-pointer transition-colors"
                      >
                        🔍 {item.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            ) : results.length === 0 ? (
              <div className="py-12 px-4 text-center space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
                  <Search className="w-6 h-6" />
                </div>
                <h3 className="text-sm font-bold text-slate-700">
                  {language === 'es' ? 'No se encontraron resultados' : 'No results found'}
                </h3>
              </div>
            ) : (
              <div className="space-y-1.5">
                <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider px-2 flex items-center justify-between">
                  <span>
                    {language === 'es'
                      ? `${results.length} resultado${results.length === 1 ? '' : 's'} encontrado${results.length === 1 ? '' : 's'}`
                      : `${results.length} result${results.length === 1 ? '' : 's'} found`}
                  </span>
                  <span className="hidden sm:inline font-normal text-slate-400">
                    {language === 'es' ? 'Usa ↑ ↓ para navegar y Enter para abrir' : 'Use ↑ ↓ to navigate and Enter to open'}
                  </span>
                </div>

                {results.map((item, idx) => {
                  const isSelected = selectedIndex === idx;
                  return (
                    <div
                      key={item.id}
                      data-search-item
                      onClick={() => handleResultClick(item)}
                      onMouseEnter={() => setSelectedIndex(idx)}
                      className={`group p-3 rounded-xl border transition-all cursor-pointer flex items-start justify-between gap-3 ${
                        isSelected
                          ? 'bg-sky-50/80 border-sky-300 shadow-xs'
                          : 'bg-white hover:bg-slate-50 border-slate-200'
                      }`}
                    >
                      <div className="flex items-start gap-3 min-w-0">
                        <div
                          className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5 border ${
                            isSelected ? 'bg-sky-600 text-white border-sky-600' : 'bg-slate-100 text-slate-600 border-slate-200'
                          }`}
                        >
                          {getCategoryIcon(item.category)}
                        </div>

                        <div className="min-w-0 space-y-0.5">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-xs sm:text-sm font-bold text-slate-900 truncate">
                              {item.title}
                            </span>
                            <span
                              className={`px-2 py-0.5 rounded-md text-[10px] font-bold border ${getBadgeStyle(
                                item.badgeColor
                              )}`}
                            >
                              {item.badge}
                            </span>
                          </div>

                          <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed">
                            {item.subtitle}
                          </p>

                          <div className="flex items-center gap-3 text-[11px] text-slate-400 pt-0.5">
                            <span className="font-medium text-slate-500">{item.categoryLabel}</span>
                            {item.date && <span>• Fecha: {item.date}</span>}
                            {item.amount !== undefined && (
                              <span className="font-bold text-emerald-600">
                                • ${item.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Action Button on Right */}
                      <div className="flex items-center gap-1 flex-shrink-0 self-center">
                        <span
                          className={`hidden sm:inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold border transition-all ${
                            isSelected
                              ? 'bg-sky-600 text-white border-sky-600 shadow-xs'
                              : 'bg-slate-100 text-slate-700 border-slate-200 group-hover:bg-sky-100 group-hover:text-sky-800'
                          }`}
                        >
                          {item.actionText || (language === 'es' ? 'Abrir' : 'Open')}
                          <ArrowRight className="w-3.5 h-3.5" />
                        </span>
                        <ChevronRight className="w-5 h-5 text-slate-400 sm:hidden" />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Bottom Footer Info */}
          <div className="px-4 py-2.5 border-t border-slate-200 bg-slate-50 flex items-center justify-between text-xs text-slate-500">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-slate-700">SkyOps Global Navigator</span>
              <span>•</span>
              <span>{language === 'es' ? 'Módulos: Alumnos, Finanzas, Operaciones y Médico' : 'Modules: Students, Finance, Ops & Medical'}</span>
            </div>
            <div className="flex items-center gap-3 hidden sm:flex">
              <span className="flex items-center gap-1">
                <kbd className="px-1 py-0.5 text-[10px] font-semibold bg-white border border-slate-300 rounded">↑</kbd>
                <kbd className="px-1 py-0.5 text-[10px] font-semibold bg-white border border-slate-300 rounded">↓</kbd>
                <span>Navegar</span>
              </span>
              <span className="flex items-center gap-1">
                <kbd className="px-1.5 py-0.5 text-[10px] font-semibold bg-white border border-slate-300 rounded">↵</kbd>
                <span>Seleccionar</span>
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Lightbox for Voucher if triggered from Search */}
      {selectedVoucherTx && (
        <ImageViewerModal
          transaction={selectedVoucherTx}
          onClose={() => setSelectedVoucherTx(null)}
        />
      )}
    </>
  );
};
