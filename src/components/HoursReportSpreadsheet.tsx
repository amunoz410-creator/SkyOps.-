import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { User, SpreadsheetWorkbook, SpreadsheetSheet, SpreadsheetCell, CellStyle } from '../types';
import { api } from '../services/api';
import { useLanguage } from '../i18n/LanguageContext';
import {
  FileSpreadsheet,
  Save,
  RotateCcw,
  RefreshCw,
  Download,
  Printer,
  Plus,
  Trash2,
  Bold,
  Italic,
  Underline,
  Strikethrough,
  AlignLeft,
  AlignCenter,
  AlignRight,
  DollarSign,
  Percent,
  Clock,
  Hash,
  HelpCircle,
  Copy,
  Check,
  Search,
  Filter,
  ChevronRight,
  ChevronDown,
  Plane,
  Wrench,
  Users,
  Calendar,
  Layers,
  Sparkles,
  ArrowUpDown,
  MoreVertical,
  Edit2,
  ShieldAlert
} from 'lucide-react';

interface HoursReportSpreadsheetProps {
  currentUser: User;
}

// Convert 0 -> "A", 1 -> "B", 25 -> "Z", 26 -> "AA"
const getColLabel = (index: number): string => {
  let label = '';
  let num = index;
  while (num >= 0) {
    label = String.fromCharCode((num % 26) + 65) + label;
    num = Math.floor(num / 26) - 1;
  }
  return label;
};

// Convert "A" -> 0, "B" -> 1, "AA" -> 26
const getColIndex = (label: string): number => {
  let index = 0;
  for (let i = 0; i < label.length; i++) {
    index = index * 26 + (label.charCodeAt(i) - 64);
  }
  return index - 1;
};

// Parse coordinate "B4" -> { col: 1, row: 3, colLabel: "B", rowLabel: "4" }
const parseCellCoord = (key: string): { col: number; row: number; colLabel: string; rowLabel: string } | null => {
  const match = key.match(/^([A-Z]+)([0-9]+)$/i);
  if (!match) return null;
  const colLabel = match[1].toUpperCase();
  const rowLabel = match[2];
  const col = getColIndex(colLabel);
  const row = parseInt(rowLabel, 10) - 1;
  return { col, row, colLabel, rowLabel };
};

// Build coordinate 1, 3 -> "B4"
const buildCellCoord = (col: number, row: number): string => {
  return `${getColLabel(col)}${row + 1}`;
};

export const HoursReportSpreadsheet: React.FC<HoursReportSpreadsheetProps> = ({ currentUser }) => {
  const { t } = useLanguage();
  const isAuthorized = ['admin', 'escuela', 'contabilidad'].includes(currentUser?.rol || '');

  const [workbook, setWorkbook] = useState<SpreadsheetWorkbook | null>(null);
  const [activeSheetId, setActiveSheetId] = useState<string>('');
  const [selectedCell, setSelectedCell] = useState<string>('A2');
  const [selectedRange, setSelectedRange] = useState<{ start: string; end: string } | null>(null);
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [editValue, setEditValue] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [saveSuccessMessage, setSaveSuccessMessage] = useState<string | null>(null);
  const [sheetSearchQuery, setSheetSearchQuery] = useState<string>('');
  const [showFormulaHelper, setShowFormulaHelper] = useState<boolean>(false);
  const [editingSheetTitleId, setEditingSheetTitleId] = useState<string | null>(null);
  const [tempSheetName, setTempSheetName] = useState<string>('');

  const gridContainerRef = useRef<HTMLDivElement>(null);
  const formulaInputRef = useRef<HTMLInputElement>(null);
  const cellInputRef = useRef<HTMLInputElement>(null);

  // Cargar libro desde servidor
  const loadWorkbook = useCallback(async () => {
    if (!isAuthorized) {
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    try {
      const data = await api.getHoursSpreadsheet();
      if (data.success && data.workbook) {
        setWorkbook(data.workbook);
        setActiveSheetId(data.workbook.activeSheetId || data.workbook.sheets[0]?.id || '');
      }
    } catch (err) {
      console.error('Error cargando hoja de horas:', err);
    } finally {
      setIsLoading(false);
    }
  }, [isAuthorized]);

  useEffect(() => {
    loadWorkbook();
  }, [loadWorkbook]);

  const activeSheet = useMemo(() => {
    if (!workbook) return null;
    return workbook.sheets.find(s => s.id === activeSheetId) || workbook.sheets[0] || null;
  }, [workbook, activeSheetId]);

  // Motor de Evaluación de Fórmulas de Hoja de Cálculo
  const evaluateFormula = useCallback((formula: string, cells: Record<string, SpreadsheetCell>, depth = 0): number | string => {
    if (depth > 20) return '#ERROR: CIRCULAR';
    const cleanFormula = formula.trim().replace(/^=/, '');

    // 1. Manejo de funciones SUM, AVERAGE, COUNT, MAX, MIN
    const funcMatch = cleanFormula.match(/^(SUM|AVERAGE|PROMEDIO|COUNT|CONTAR|MAX|MIN|ROUND|REDONDEAR)\s*\((.*)\)$/i);
    if (funcMatch) {
      const funcName = funcMatch[1].toUpperCase();
      const argsStr = funcMatch[2];

      // Rango ej: G3:G12 o lista de celdas G3, G4
      if (argsStr.includes(':')) {
        const [startCoord, endCoord] = argsStr.split(':').map(s => s.trim().toUpperCase());
        const start = parseCellCoord(startCoord);
        const end = parseCellCoord(endCoord);

        if (start && end) {
          const minCol = Math.min(start.col, end.col);
          const maxCol = Math.max(start.col, end.col);
          const minRow = Math.min(start.row, end.row);
          const maxRow = Math.max(start.row, end.row);

          const values: number[] = [];
          for (let r = minRow; r <= maxRow; r++) {
            for (let c = minCol; c <= maxCol; c++) {
              const coord = buildCellCoord(c, r);
              const cell = cells[coord];
              if (cell && cell.value !== undefined && cell.value !== '' && cell.value !== null) {
                const num = typeof cell.value === 'number' ? cell.value : parseFloat(String(cell.value).replace(/[^0-9.-]/g, ''));
                if (!isNaN(num)) {
                  values.push(num);
                }
              }
            }
          }

          if (funcName === 'SUM') {
            return values.reduce((acc, v) => acc + v, 0);
          } else if (funcName === 'AVERAGE' || funcName === 'PROMEDIO') {
            return values.length > 0 ? values.reduce((acc, v) => acc + v, 0) / values.length : 0;
          } else if (funcName === 'COUNT' || funcName === 'CONTAR') {
            return values.length;
          } else if (funcName === 'MAX') {
            return values.length > 0 ? Math.max(...values) : 0;
          } else if (funcName === 'MIN') {
            return values.length > 0 ? Math.min(...values) : 0;
          }
        }
      }
    }

    // 2. Manejo de expresiones aritméticas con referencias de celda: ej "G3+H3", "I3*J3", "100-(E3-F3)"
    try {
      const sanitized = cleanFormula.replace(/([A-Z]+[0-9]+)/gi, (match) => {
        const coord = match.toUpperCase();
        const cell = cells[coord];
        if (!cell || cell.value === undefined || cell.value === null || cell.value === '') {
          return '0';
        }
        if (typeof cell.value === 'number') {
          return String(cell.value);
        }
        const num = parseFloat(String(cell.value).replace(/[^0-9.-]/g, ''));
        return isNaN(num) ? '0' : String(num);
      });

      // Solo evaluar si contiene caracteres matemáticos seguros
      if (/^[0-9+\-*/().\s]+$/.test(sanitized)) {
        // eslint-disable-next-line no-new-func
        const result = Function(`"use strict"; return (${sanitized})`)();
        if (typeof result === 'number' && !isNaN(result) && isFinite(result)) {
          return Math.round(result * 10000) / 10000;
        }
      }
    } catch {
      return '#VALUE!';
    }

    return cleanFormula;
  }, []);

  // Recalcular toda la hoja
  const recalculateSheet = useCallback((sheet: SpreadsheetSheet): SpreadsheetSheet => {
    const updatedCells: Record<string, SpreadsheetCell> = { ...sheet.cells };

    // Pasada 1: Celdas sin fórmula
    Object.keys(updatedCells).forEach(coord => {
      const cell = updatedCells[coord];
      if (!cell.raw.startsWith('=')) {
        const num = parseFloat(cell.raw);
        if (!isNaN(num) && String(num) === cell.raw.trim()) {
          updatedCells[coord] = { ...cell, value: num, formula: undefined };
        } else {
          updatedCells[coord] = { ...cell, value: cell.raw, formula: undefined };
        }
      }
    });

    // Pasada 2: Celdas con fórmulas
    Object.keys(updatedCells).forEach(coord => {
      const cell = updatedCells[coord];
      if (cell.raw.startsWith('=')) {
        const evalVal = evaluateFormula(cell.raw, updatedCells);
        updatedCells[coord] = {
          ...cell,
          value: typeof evalVal === 'number' ? Math.round(evalVal * 100) / 100 : evalVal,
          formula: cell.raw.substring(1)
        };
      }
    });

    return { ...sheet, cells: updatedCells };
  }, [evaluateFormula]);

  // Actualizar contenido de una celda
  const updateCellValue = useCallback((coord: string, newRaw: string) => {
    if (!workbook || !activeSheet) return;

    const currentCells = { ...activeSheet.cells };
    const currentCell = currentCells[coord] || { raw: '', value: '' };

    let calculatedValue: string | number = newRaw;
    let formula: string | undefined = undefined;

    if (newRaw.startsWith('=')) {
      formula = newRaw.substring(1);
      calculatedValue = evaluateFormula(newRaw, currentCells);
    } else {
      const num = parseFloat(newRaw);
      if (!isNaN(num) && String(num) === newRaw.trim()) {
        calculatedValue = num;
      }
    }

    currentCells[coord] = {
      ...currentCell,
      raw: newRaw,
      value: calculatedValue,
      formula
    };

    const updatedSheet = recalculateSheet({
      ...activeSheet,
      cells: currentCells
    });

    const updatedWorkbook: SpreadsheetWorkbook = {
      ...workbook,
      sheets: workbook.sheets.map(s => s.id === updatedSheet.id ? updatedSheet : s),
      updatedAt: new Date().toISOString()
    };

    setWorkbook(updatedWorkbook);
  }, [workbook, activeSheet, evaluateFormula, recalculateSheet]);

  // Aplicar estilo a celda(s) seleccionada(s)
  const applyStyleToSelected = useCallback((stylePatch: Partial<CellStyle>) => {
    if (!workbook || !activeSheet) return;

    const coordsToUpdate: string[] = [];
    if (selectedRange) {
      const start = parseCellCoord(selectedRange.start);
      const end = parseCellCoord(selectedRange.end);
      if (start && end) {
        const minCol = Math.min(start.col, end.col);
        const maxCol = Math.max(start.col, end.col);
        const minRow = Math.min(start.row, end.row);
        const maxRow = Math.max(start.row, end.row);
        for (let r = minRow; r <= maxRow; r++) {
          for (let c = minCol; c <= maxCol; c++) {
            coordsToUpdate.push(buildCellCoord(c, r));
          }
        }
      }
    } else if (selectedCell) {
      coordsToUpdate.push(selectedCell);
    }

    if (coordsToUpdate.length === 0) return;

    const updatedCells = { ...activeSheet.cells };
    coordsToUpdate.forEach(coord => {
      const existing = updatedCells[coord] || { raw: '', value: '' };
      updatedCells[coord] = {
        ...existing,
        style: {
          ...(existing.style || {}),
          ...stylePatch
        }
      };
    });

    const updatedSheet: SpreadsheetSheet = {
      ...activeSheet,
      cells: updatedCells
    };

    const updatedWorkbook: SpreadsheetWorkbook = {
      ...workbook,
      sheets: workbook.sheets.map(s => s.id === updatedSheet.id ? updatedSheet : s),
      updatedAt: new Date().toISOString()
    };

    setWorkbook(updatedWorkbook);
  }, [workbook, activeSheet, selectedCell, selectedRange]);

  // Iniciar edición de celda
  const startEditing = (coord: string) => {
    setSelectedCell(coord);
    const cell = activeSheet?.cells[coord];
    setEditValue(cell?.raw || '');
    setIsEditing(true);
    setTimeout(() => {
      cellInputRef.current?.focus();
      cellInputRef.current?.select();
    }, 50);
  };

  // Confirmar edición
  const commitEditing = () => {
    if (isEditing) {
      updateCellValue(selectedCell, editValue);
      setIsEditing(false);
    }
  };

  // Navegación por teclado
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!activeSheet) return;

    const current = parseCellCoord(selectedCell);
    if (!current) return;

    if (isEditing) {
      if (e.key === 'Enter') {
        e.preventDefault();
        commitEditing();
        // Mover abajo
        const nextCoord = buildCellCoord(current.col, Math.min(current.row + 1, activeSheet.rowCount - 1));
        setSelectedCell(nextCoord);
      } else if (e.key === 'Tab') {
        e.preventDefault();
        commitEditing();
        // Mover derecha
        const nextCoord = buildCellCoord(Math.min(current.col + 1, activeSheet.colCount - 1), current.row);
        setSelectedCell(nextCoord);
      } else if (e.key === 'Escape') {
        setIsEditing(false);
      }
      return;
    }

    if (e.key === 'Enter' || e.key === 'F2') {
      e.preventDefault();
      startEditing(selectedCell);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      const nextRow = Math.max(0, current.row - 1);
      setSelectedCell(buildCellCoord(current.col, nextRow));
      setSelectedRange(null);
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      const nextRow = Math.min(activeSheet.rowCount - 1, current.row + 1);
      setSelectedCell(buildCellCoord(current.col, nextRow));
      setSelectedRange(null);
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault();
      const nextCol = Math.max(0, current.col - 1);
      setSelectedCell(buildCellCoord(nextCol, current.row));
      setSelectedRange(null);
    } else if (e.key === 'ArrowRight') {
      e.preventDefault();
      const nextCol = Math.min(activeSheet.colCount - 1, current.col + 1);
      setSelectedCell(buildCellCoord(nextCol, current.row));
      setSelectedRange(null);
    } else if (e.key === 'Delete' || e.key === 'Backspace') {
      e.preventDefault();
      updateCellValue(selectedCell, '');
    } else if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
      // Escribir directamente
      setEditValue(e.key);
      setIsEditing(true);
      setTimeout(() => {
        cellInputRef.current?.focus();
      }, 20);
    }
  };

  // Guardar en Backend
  const handleSave = async () => {
    if (!workbook) return;
    setIsSaving(true);
    try {
      const res = await api.saveHoursSpreadsheet(workbook);
      if (res.success) {
        setSaveSuccessMessage('¡Libro de cálculo guardado exitosamente!');
        setTimeout(() => setSaveSuccessMessage(null), 3000);
      }
    } catch (err) {
      console.error('Error guardando:', err);
    } finally {
      setIsSaving(false);
    }
  };

  // Sincronizar con vuelos reales de base de datos
  const handleSyncWithFlights = async () => {
    setIsSyncing(true);
    try {
      const res = await api.syncHoursSpreadsheet();
      if (res.success && res.workbook) {
        setWorkbook(res.workbook);
        setSaveSuccessMessage('¡Datos sincronizados con las hojas de vuelo y bitácora de SkyOps!');
        setTimeout(() => setSaveSuccessMessage(null), 4000);
      }
    } catch (err) {
      console.error('Error sincronizando:', err);
    } finally {
      setIsSyncing(false);
    }
  };

  // Restablecer plantilla
  const handleResetTemplate = async () => {
    if (!confirm('¿Deseas restablecer la plantilla original de horas de vuelo y flota? Se perderán las modificaciones no guardadas.')) return;
    setIsLoading(true);
    try {
      const res = await api.resetHoursSpreadsheet();
      if (res.success && res.workbook) {
        setWorkbook(res.workbook);
        setSaveSuccessMessage('Plantilla restablecida a valores operacionales iniciales.');
        setTimeout(() => setSaveSuccessMessage(null), 3000);
      }
    } catch (err) {
      console.error('Error restableciendo:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // Agregar nueva pestaña
  const handleAddNewSheet = () => {
    if (!workbook) return;
    const newIndex = workbook.sheets.length + 1;
    const newSheet: SpreadsheetSheet = {
      id: `sheet_custom_${Date.now()}`,
      name: `Hoja ${newIndex}`,
      icon: 'FileSpreadsheet',
      rowCount: 30,
      colCount: 12,
      cells: {
        'A1': { raw: 'NUEVA HOJA DE TRABAJO', value: 'NUEVA HOJA DE TRABAJO', style: { bold: true, bgColor: '#0F172A', textColor: '#FFFFFF' } }
      },
      colWidths: { 0: 160, 1: 140, 2: 120, 3: 120 }
    };

    const updatedWorkbook: SpreadsheetWorkbook = {
      ...workbook,
      sheets: [...workbook.sheets, newSheet],
      activeSheetId: newSheet.id
    };

    setWorkbook(updatedWorkbook);
    setActiveSheetId(newSheet.id);
  };

  // Renombrar pestaña
  const handleRenameSheet = (sheetId: string) => {
    if (!workbook || !tempSheetName.trim()) {
      setEditingSheetTitleId(null);
      return;
    }
    const updated = {
      ...workbook,
      sheets: workbook.sheets.map(s => s.id === sheetId ? { ...s, name: tempSheetName.trim() } : s)
    };
    setWorkbook(updated);
    setEditingSheetTitleId(null);
  };

  // Eliminar pestaña
  const handleDeleteSheet = (sheetId: string, sheetName: string) => {
    if (!workbook || workbook.sheets.length <= 1) {
      alert('El libro debe tener al menos una hoja.');
      return;
    }
    if (!confirm(`¿Eliminar la hoja "${sheetName}"?`)) return;

    const remaining = workbook.sheets.filter(s => s.id !== sheetId);
    const newActiveId = activeSheetId === sheetId ? remaining[0].id : activeSheetId;

    setWorkbook({
      ...workbook,
      sheets: remaining,
      activeSheetId: newActiveId
    });
    setActiveSheetId(newActiveId);
  };

  // Exportar CSV
  const handleExportCSV = () => {
    if (!activeSheet) return;

    let csvContent = '\uFEFF'; // BOM UTF-8
    for (let r = 0; r < activeSheet.rowCount; r++) {
      const rowValues: string[] = [];
      let hasData = false;
      for (let c = 0; c < activeSheet.colCount; c++) {
        const coord = buildCellCoord(c, r);
        const cell = activeSheet.cells[coord];
        const val = cell?.value !== undefined ? String(cell.value) : '';
        if (val) hasData = true;
        // Escapar comillas
        rowValues.push(`"${val.replace(/"/g, '""')}"`);
      }
      if (hasData || r < 10) {
        csvContent += rowValues.join(',') + '\r\n';
      }
    }

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `SkyOps_Reporte_${activeSheet.name.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Imprimir
  const handlePrint = () => {
    window.print();
  };

  // Formato visual de celda
  const renderFormattedCellValue = (cell?: SpreadsheetCell) => {
    if (!cell || cell.value === undefined || cell.value === null) return '';
    const val = cell.value;
    const fmt = cell.style?.format;

    if (fmt === 'currency') {
      const num = typeof val === 'number' ? val : parseFloat(String(val).replace(/[^0-9.-]/g, ''));
      if (isNaN(num)) return String(val);
      return `$${num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    }

    if (fmt === 'hours') {
      const num = typeof val === 'number' ? val : parseFloat(String(val).replace(/[^0-9.-]/g, ''));
      if (isNaN(num)) return String(val);
      return `${num.toFixed(1)} hrs`;
    }

    if (fmt === 'percentage') {
      const num = typeof val === 'number' ? val : parseFloat(String(val).replace(/[^0-9.-]/g, ''));
      if (isNaN(num)) return String(val);
      return `${num.toFixed(1)}%`;
    }

    return String(val);
  };

  // Estadísticas de celda(s) seleccionadas
  const selectionStats = useMemo(() => {
    if (!activeSheet) return null;
    const values: number[] = [];

    if (selectedRange) {
      const start = parseCellCoord(selectedRange.start);
      const end = parseCellCoord(selectedRange.end);
      if (start && end) {
        const minCol = Math.min(start.col, end.col);
        const maxCol = Math.max(start.col, end.col);
        const minRow = Math.min(start.row, end.row);
        const maxRow = Math.max(start.row, end.row);
        for (let r = minRow; r <= maxRow; r++) {
          for (let c = minCol; c <= maxCol; c++) {
            const cell = activeSheet.cells[buildCellCoord(c, r)];
            if (cell && typeof cell.value === 'number') {
              values.push(cell.value);
            }
          }
        }
      }
    } else if (selectedCell) {
      const cell = activeSheet.cells[selectedCell];
      if (cell && typeof cell.value === 'number') {
        values.push(cell.value);
      }
    }

    if (values.length === 0) return null;

    const sum = values.reduce((acc, v) => acc + v, 0);
    const avg = sum / values.length;
    const min = Math.min(...values);
    const max = Math.max(...values);

    return {
      count: values.length,
      sum: Math.round(sum * 100) / 100,
      avg: Math.round(avg * 100) / 100,
      min,
      max
    };
  }, [activeSheet, selectedCell, selectedRange]);

  const activeCellData = activeSheet?.cells[selectedCell];

  if (!isAuthorized) {
    return (
      <div className="bg-white dark:bg-slate-900 p-8 sm:p-12 rounded-2xl border border-slate-200 dark:border-slate-800 text-center shadow-sm max-w-2xl mx-auto my-8 space-y-4">
        <div className="w-16 h-16 rounded-2xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 text-rose-600 flex items-center justify-center mx-auto shadow-xs">
          <ShieldAlert className="w-8 h-8" />
        </div>
        <div className="space-y-2">
          <h2 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">
            Acceso Restringido
          </h2>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[500px] bg-slate-900 text-white rounded-2xl p-8 shadow-xl">
        <RefreshCw className="w-10 h-10 text-sky-400 animate-spin mb-4" />
        <h3 className="text-lg font-bold">Cargando Reporte de Horas...</h3>
      </div>
    );
  }

  return (
    <div className="space-y-4 max-w-[100vw] overflow-hidden" tabIndex={0} onKeyDown={handleKeyDown}>
      {/* Top Banner / Header Card */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-5 text-white shadow-xl">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-start sm:items-center gap-3.5">
            <div className="w-12 h-12 rounded-xl bg-emerald-600/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 flex-shrink-0 shadow-inner">
              <FileSpreadsheet className="w-7 h-7" />
            </div>
            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <h2 className="text-lg sm:text-xl font-black tracking-tight text-white">
                  Reporte de Horas & Libro de Operaciones
                </h2>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap flex-shrink-0">
            <button
              id="spreadsheet-sync-btn"
              onClick={handleSyncWithFlights}
              disabled={isSyncing}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold transition-all shadow-md active:scale-95 disabled:opacity-50 cursor-pointer"
              title="Sincronizar automáticamente con las horas reales de las hojas de vuelo"
            >
              <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />
              <span>{isSyncing ? 'Sincronizando...' : 'Sincronizar Vuelos'}</span>
            </button>

            <button
              id="spreadsheet-save-btn"
              onClick={handleSave}
              disabled={isSaving}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all shadow-md active:scale-95 disabled:opacity-50 cursor-pointer"
            >
              <Save className="w-4 h-4" />
              <span>{isSaving ? 'Guardando...' : 'Guardar'}</span>
            </button>

            <button
              id="spreadsheet-export-csv-btn"
              onClick={handleExportCSV}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition-colors cursor-pointer"
              title="Exportar archivo CSV compatible con Microsoft Excel y Google Sheets"
            >
              <Download className="w-4 h-4 text-emerald-400" />
              <span className="hidden sm:inline">Exportar CSV</span>
            </button>

            <button
              id="spreadsheet-print-btn"
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-2.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold border border-slate-700 transition-colors cursor-pointer"
              title="Imprimir o guardar PDF"
            >
              <Printer className="w-4 h-4" />
            </button>

            <button
              id="spreadsheet-reset-btn"
              onClick={handleResetTemplate}
              className="flex items-center gap-1.5 px-2.5 py-2 rounded-xl bg-slate-800 hover:bg-rose-950/60 text-slate-400 hover:text-rose-300 text-xs font-semibold border border-slate-700 hover:border-rose-800/50 transition-colors cursor-pointer"
              title="Restablecer plantilla inicial de horas"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Success toast notification */}
        {saveSuccessMessage && (
          <div className="mt-3 bg-emerald-500/20 border border-emerald-500/40 text-emerald-200 px-3 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 animate-fade-in">
            <Check className="w-4 h-4 text-emerald-400" />
            <span>{saveSuccessMessage}</span>
          </div>
        )}
      </div>

      {/* Spreadsheet Workspace Container */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden flex flex-col">
        {/* 1. Google Sheets Style Toolbar */}
        <div className="bg-slate-50 border-b border-slate-200 px-3 py-2 flex items-center justify-between gap-2 flex-wrap text-slate-700 select-none">
          {/* Format Tools Group */}
          <div className="flex items-center gap-1 flex-wrap">
            {/* Bold, Italic, Underline, Strikethrough */}
            <div className="flex items-center bg-white border border-slate-200 rounded-lg p-0.5 shadow-2xs">
              <button
                id="style-bold-btn"
                onClick={() => applyStyleToSelected({ bold: !activeCellData?.style?.bold })}
                className={`p-1.5 rounded hover:bg-slate-100 transition-colors ${activeCellData?.style?.bold ? 'bg-sky-100 text-sky-700 font-black' : ''}`}
                title="Negrita (Bold)"
              >
                <Bold className="w-3.5 h-3.5" />
              </button>
              <button
                id="style-italic-btn"
                onClick={() => applyStyleToSelected({ italic: !activeCellData?.style?.italic })}
                className={`p-1.5 rounded hover:bg-slate-100 transition-colors ${activeCellData?.style?.italic ? 'bg-sky-100 text-sky-700' : ''}`}
                title="Cursiva (Italic)"
              >
                <Italic className="w-3.5 h-3.5" />
              </button>
              <button
                id="style-underline-btn"
                onClick={() => applyStyleToSelected({ underline: !activeCellData?.style?.underline })}
                className={`p-1.5 rounded hover:bg-slate-100 transition-colors ${activeCellData?.style?.underline ? 'bg-sky-100 text-sky-700' : ''}`}
                title="Subrayado"
              >
                <Underline className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="h-5 w-px bg-slate-200 mx-1 hidden sm:block" />

            {/* Alignment */}
            <div className="flex items-center bg-white border border-slate-200 rounded-lg p-0.5 shadow-2xs">
              <button
                id="align-left-btn"
                onClick={() => applyStyleToSelected({ align: 'left' })}
                className={`p-1.5 rounded hover:bg-slate-100 ${activeCellData?.style?.align === 'left' ? 'bg-sky-100 text-sky-700' : ''}`}
                title="Alinear a la izquierda"
              >
                <AlignLeft className="w-3.5 h-3.5" />
              </button>
              <button
                id="align-center-btn"
                onClick={() => applyStyleToSelected({ align: 'center' })}
                className={`p-1.5 rounded hover:bg-slate-100 ${activeCellData?.style?.align === 'center' ? 'bg-sky-100 text-sky-700' : ''}`}
                title="Alinear al centro"
              >
                <AlignCenter className="w-3.5 h-3.5" />
              </button>
              <button
                id="align-right-btn"
                onClick={() => applyStyleToSelected({ align: 'right' })}
                className={`p-1.5 rounded hover:bg-slate-100 ${activeCellData?.style?.align === 'right' ? 'bg-sky-100 text-sky-700' : ''}`}
                title="Alinear a la derecha"
              >
                <AlignRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="h-5 w-px bg-slate-200 mx-1 hidden sm:block" />

            {/* Number Formats */}
            <div className="flex items-center bg-white border border-slate-200 rounded-lg p-0.5 shadow-2xs">
              <button
                id="fmt-currency-btn"
                onClick={() => applyStyleToSelected({ format: 'currency', align: 'right' })}
                className={`flex items-center gap-0.5 px-2 py-1 rounded text-xs font-bold hover:bg-slate-100 ${activeCellData?.style?.format === 'currency' ? 'bg-emerald-100 text-emerald-800' : 'text-slate-700'}`}
                title="Formato Moneda ($)"
              >
                <DollarSign className="w-3 h-3 text-emerald-600" />
                <span>USD</span>
              </button>
              <button
                id="fmt-hours-btn"
                onClick={() => applyStyleToSelected({ format: 'hours', align: 'right' })}
                className={`flex items-center gap-0.5 px-2 py-1 rounded text-xs font-bold hover:bg-slate-100 ${activeCellData?.style?.format === 'hours' ? 'bg-sky-100 text-sky-800' : 'text-slate-700'}`}
                title="Formato Horas de Vuelo (hrs)"
              >
                <Clock className="w-3 h-3 text-sky-600" />
                <span>Hrs</span>
              </button>
              <button
                id="fmt-percentage-btn"
                onClick={() => applyStyleToSelected({ format: 'percentage', align: 'right' })}
                className={`flex items-center gap-0.5 px-2 py-1 rounded text-xs font-bold hover:bg-slate-100 ${activeCellData?.style?.format === 'percentage' ? 'bg-purple-100 text-purple-800' : 'text-slate-700'}`}
                title="Formato Porcentaje (%)"
              >
                <Percent className="w-3 h-3 text-purple-600" />
              </button>
              <button
                id="fmt-general-btn"
                onClick={() => applyStyleToSelected({ format: 'general' })}
                className={`px-1.5 py-1 rounded text-[11px] font-semibold hover:bg-slate-100 ${!activeCellData?.style?.format || activeCellData?.style?.format === 'general' ? 'bg-slate-100 text-slate-900' : 'text-slate-500'}`}
                title="Texto / Número Estándar"
              >
                123
              </button>
            </div>

            <div className="h-5 w-px bg-slate-200 mx-1 hidden md:block" />

            {/* Quick Fill Colors */}
            <div className="hidden lg:flex items-center gap-1">
              <span className="text-[11px] font-semibold text-slate-400">Color:</span>
              <button
                onClick={() => applyStyleToSelected({ bgColor: '#F0F9FF', textColor: '#0369A1' })}
                className="w-5 h-5 rounded bg-sky-100 border border-sky-300 hover:scale-110 transition-transform"
                title="Azul Vuelo"
              />
              <button
                onClick={() => applyStyleToSelected({ bgColor: '#ECFDF5', textColor: '#047857' })}
                className="w-5 h-5 rounded bg-emerald-100 border border-emerald-300 hover:scale-110 transition-transform"
                title="Verde Operativo / Saldo"
              />
              <button
                onClick={() => applyStyleToSelected({ bgColor: '#FFFBEB', textColor: '#B45309' })}
                className="w-5 h-5 rounded bg-amber-100 border border-amber-300 hover:scale-110 transition-transform"
                title="Amarillo Alerta"
              />
              <button
                onClick={() => applyStyleToSelected({ bgColor: '#FEF2F2', textColor: '#B91C1C' })}
                className="w-5 h-5 rounded bg-rose-100 border border-rose-300 hover:scale-110 transition-transform"
                title="Rojo Mantenimiento / Cargo"
              />
              <button
                onClick={() => applyStyleToSelected({ bgColor: '#0F172A', textColor: '#FFFFFF', bold: true })}
                className="w-5 h-5 rounded bg-slate-900 border border-slate-700 hover:scale-110 transition-transform"
                title="Negro Encabezado"
              />
              <button
                onClick={() => applyStyleToSelected({ bgColor: undefined, textColor: undefined })}
                className="text-[10px] text-slate-500 hover:text-slate-800 underline px-1 cursor-pointer"
                title="Quitar color"
              >
                Limpiar
              </button>
            </div>
          </div>

          {/* Formulas Quick Dropdown */}
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setShowFormulaHelper(prev => !prev)}
              className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-sky-50 hover:bg-sky-100 text-sky-700 text-xs font-bold border border-sky-200 transition-colors cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Fórmulas (fx)</span>
              <ChevronDown className="w-3 h-3" />
            </button>
          </div>
        </div>

        {/* Formula Helper Card Dropdown */}
        {showFormulaHelper && (
          <div className="bg-slate-900 text-white p-3.5 border-b border-slate-800 text-xs flex flex-wrap gap-4 items-center justify-between animate-fade-in">
            <div className="flex items-center gap-3 flex-wrap">
              <span className="font-bold text-sky-300">Fórmulas soportadas:</span>
              <button
                onClick={() => { updateCellValue(selectedCell, `=SUM(G3:G12)`); setShowFormulaHelper(false); }}
                className="bg-slate-800 hover:bg-slate-700 px-2 py-1 rounded border border-slate-700 text-sky-200 font-mono text-[11px] cursor-pointer"
              >
                =SUM(G3:G12)
              </button>
              <button
                onClick={() => { updateCellValue(selectedCell, `=AVERAGE(G3:G12)`); setShowFormulaHelper(false); }}
                className="bg-slate-800 hover:bg-slate-700 px-2 py-1 rounded border border-slate-700 text-sky-200 font-mono text-[11px] cursor-pointer"
              >
                =AVERAGE(G3:G12)
              </button>
              <button
                onClick={() => { updateCellValue(selectedCell, `=COUNT(A3:A12)`); setShowFormulaHelper(false); }}
                className="bg-slate-800 hover:bg-slate-700 px-2 py-1 rounded border border-slate-700 text-sky-200 font-mono text-[11px] cursor-pointer"
              >
                =COUNT(A3:A12)
              </button>
              <button
                onClick={() => { updateCellValue(selectedCell, `=G3+H3`); setShowFormulaHelper(false); }}
                className="bg-slate-800 hover:bg-slate-700 px-2 py-1 rounded border border-slate-700 text-emerald-200 font-mono text-[11px] cursor-pointer"
              >
                =G3+H3 (Suma Celdas)
              </button>
              <button
                onClick={() => { updateCellValue(selectedCell, `=I3*J3`); setShowFormulaHelper(false); }}
                className="bg-slate-800 hover:bg-slate-700 px-2 py-1 rounded border border-slate-700 text-emerald-200 font-mono text-[11px] cursor-pointer"
              >
                =I3*J3 (Multiplicación)
              </button>
              <button
                onClick={() => { updateCellValue(selectedCell, `=100-(E3-F3)`); setShowFormulaHelper(false); }}
                className="bg-slate-800 hover:bg-slate-700 px-2 py-1 rounded border border-slate-700 text-amber-200 font-mono text-[11px] cursor-pointer"
              >
                =100-(E3-F3) (100h Mantenimiento)
              </button>
            </div>
            <button
              onClick={() => setShowFormulaHelper(false)}
              className="text-slate-400 hover:text-white text-xs underline cursor-pointer"
            >
              Cerrar
            </button>
          </div>
        )}

        {/* 2. Formula Bar (fx) */}
        <div className="bg-white border-b border-slate-200 px-3 py-1.5 flex items-center gap-2">
          {/* Cell Coordinate Pill */}
          <div className="w-16 px-2 py-1 bg-slate-100 border border-slate-300 rounded font-mono font-bold text-xs text-slate-800 text-center select-none">
            {selectedCell}
          </div>

          {/* fx symbol */}
          <div className="font-serif italic font-bold text-slate-400 text-sm select-none">
            fx
          </div>

          {/* Formula / Cell Content Input */}
          <input
            ref={formulaInputRef}
            id="spreadsheet-formula-bar"
            type="text"
            value={isEditing ? editValue : (activeCellData?.raw || '')}
            onChange={(e) => {
              if (!isEditing) setIsEditing(true);
              setEditValue(e.target.value);
            }}
            onFocus={() => {
              if (!isEditing) {
                setEditValue(activeCellData?.raw || '');
                setIsEditing(true);
              }
            }}
            onBlur={() => {
              if (isEditing) commitEditing();
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                commitEditing();
                formulaInputRef.current?.blur();
              } else if (e.key === 'Escape') {
                setIsEditing(false);
                formulaInputRef.current?.blur();
              }
            }}
            placeholder="Introduce un valor o fórmula (ej: =SUM(G3:G12), =G3+H3, 150.00, Daniel Alvarado)"
            className="flex-1 font-mono text-xs text-slate-800 bg-transparent focus:outline-none border-0 focus:ring-0 px-2 py-1"
          />

          {/* Evaluated Value Indicator when there is a formula */}
          {activeCellData?.formula && (
            <div className="text-[11px] text-slate-500 font-mono bg-slate-50 border border-slate-200 px-2 py-0.5 rounded">
              Resultado: <strong className="text-sky-700">{renderFormattedCellValue(activeCellData)}</strong>
            </div>
          )}
        </div>

        {/* 3. Main Spreadsheet Table Grid */}
        <div
          ref={gridContainerRef}
          className="relative overflow-auto max-h-[620px] bg-slate-100 select-none cursor-default font-sans"
        >
          {activeSheet && (
            <table className="border-collapse table-fixed bg-white text-xs">
              {/* Table Column Header Letters (A, B, C...) */}
              <thead>
                <tr className="bg-slate-100 text-slate-600 font-semibold sticky top-0 z-20 shadow-2xs">
                  {/* Top-Left Empty Corner Cell */}
                  <th className="w-10 min-w-10 max-w-10 h-6 border border-slate-300 bg-slate-200 text-[10px] text-center font-mono sticky left-0 z-30">
                    #
                  </th>
                  {Array.from({ length: activeSheet.colCount }).map((_, c) => {
                    const colLabel = getColLabel(c);
                    const width = activeSheet.colWidths?.[c] || 110;
                    return (
                      <th
                        key={c}
                        style={{ width: `${width}px`, minWidth: `${width}px`, maxWidth: `${width}px` }}
                        className="h-6 border border-slate-300 text-center font-mono text-[11px] text-slate-700 px-1 bg-slate-100 select-none hover:bg-slate-200 transition-colors"
                      >
                        {colLabel}
                      </th>
                    );
                  })}
                </tr>
              </thead>

              {/* Table Rows (1, 2, 3...) */}
              <tbody>
                {Array.from({ length: activeSheet.rowCount }).map((_, r) => {
                  const rowLabel = `${r + 1}`;
                  return (
                    <tr key={r} className="hover:bg-slate-50/50">
                      {/* Row Number Header */}
                      <td className="w-10 min-w-10 max-w-10 h-7 border border-slate-300 bg-slate-100 text-[11px] text-slate-600 font-mono text-center font-semibold sticky left-0 z-10 select-none">
                        {rowLabel}
                      </td>

                      {/* Cells in Row */}
                      {Array.from({ length: activeSheet.colCount }).map((_, c) => {
                        const coord = buildCellCoord(c, r);
                        const cell = activeSheet.cells[coord];
                        const isSelected = selectedCell === coord;
                        const style = cell?.style || {};

                        const cellBgColor = style.bgColor || (isSelected ? '#E0F2FE' : '#FFFFFF');
                        const cellTextColor = style.textColor || '#0F172A';
                        const cellAlign = style.align || (typeof cell?.value === 'number' ? 'right' : 'left');

                        return (
                          <td
                            key={c}
                            id={`cell-${coord}`}
                            onClick={() => {
                              if (isEditing && selectedCell !== coord) {
                                commitEditing();
                              }
                              setSelectedCell(coord);
                              setSelectedRange(null);
                            }}
                            onDoubleClick={() => startEditing(coord)}
                            style={{
                              backgroundColor: cellBgColor,
                              color: cellTextColor,
                              textAlign: cellAlign,
                              fontWeight: style.bold ? 'bold' : 'normal',
                              fontStyle: style.italic ? 'italic' : 'normal',
                              textDecoration: [
                                style.underline ? 'underline' : '',
                                style.strike ? 'line-through' : ''
                              ].filter(Boolean).join(' ') || 'none'
                            }}
                            className={`h-7 border border-slate-200 px-2 py-1 text-xs truncate select-none transition-all relative ${
                              isSelected
                                ? 'outline-2 outline-sky-600 outline-offset-[-2px] z-10 shadow-sm'
                                : 'hover:border-slate-400'
                            }`}
                          >
                            {/* In-place input editor when active and editing */}
                            {isSelected && isEditing ? (
                              <input
                                ref={cellInputRef}
                                type="text"
                                value={editValue}
                                onChange={(e) => setEditValue(e.target.value)}
                                onBlur={commitEditing}
                                className="absolute inset-0 w-full h-full px-2 font-mono text-xs text-slate-900 bg-white border-2 border-sky-600 focus:outline-none z-20"
                              />
                            ) : (
                              <span>{renderFormattedCellValue(cell)}</span>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* 4. Bottom Sheet Tabs Bar (Google Sheets style) */}
        <div className="bg-slate-100 border-t border-slate-300 px-3 py-2 flex items-center justify-between gap-3 flex-wrap select-none">
          {/* Sheet Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
            {workbook?.sheets.map((sheet) => {
              const isActive = activeSheetId === sheet.id;
              const isEditingTitle = editingSheetTitleId === sheet.id;

              return (
                <div
                  key={sheet.id}
                  className={`group flex items-center gap-1.5 px-3 py-1.5 rounded-t-lg text-xs font-bold border transition-all cursor-pointer ${
                    isActive
                      ? 'bg-white text-sky-800 border-slate-300 border-b-white shadow-xs'
                      : 'bg-slate-200 text-slate-600 border-transparent hover:bg-slate-300/80 hover:text-slate-800'
                  }`}
                  onClick={() => {
                    if (!isEditingTitle) {
                      setActiveSheetId(sheet.id);
                      setSelectedCell('A2');
                    }
                  }}
                >
                  {sheet.icon === 'Plane' && <Plane className="w-3.5 h-3.5 text-sky-600" />}
                  {sheet.icon === 'Wrench' && <Wrench className="w-3.5 h-3.5 text-amber-600" />}
                  {sheet.icon === 'Users' && <Users className="w-3.5 h-3.5 text-emerald-600" />}
                  {(!sheet.icon || sheet.icon === 'FileSpreadsheet') && <FileSpreadsheet className="w-3.5 h-3.5 text-slate-500" />}

                  {isEditingTitle ? (
                    <input
                      type="text"
                      autoFocus
                      value={tempSheetName}
                      onChange={(e) => setTempSheetName(e.target.value)}
                      onBlur={() => handleRenameSheet(sheet.id)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleRenameSheet(sheet.id);
                        if (e.key === 'Escape') setEditingSheetTitleId(null);
                      }}
                      className="px-1 py-0.5 text-xs bg-white border border-sky-500 rounded text-slate-900 w-28 focus:outline-none"
                    />
                  ) : (
                    <span onDoubleClick={() => { setEditingSheetTitleId(sheet.id); setTempSheetName(sheet.name); }}>
                      {sheet.name}
                    </span>
                  )}

                  {/* Tab Actions */}
                  <div className="flex items-center opacity-0 group-hover:opacity-100 transition-opacity ml-1">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setEditingSheetTitleId(sheet.id);
                        setTempSheetName(sheet.name);
                      }}
                      className="p-0.5 hover:text-sky-600"
                      title="Renombrar hoja"
                    >
                      <Edit2 className="w-3 h-3" />
                    </button>
                    {workbook.sheets.length > 1 && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteSheet(sheet.id, sheet.name);
                        }}
                        className="p-0.5 hover:text-rose-600 ml-0.5"
                        title="Eliminar hoja"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}

            {/* Add New Sheet Button */}
            <button
              id="spreadsheet-add-sheet-btn"
              onClick={handleAddNewSheet}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-bold transition-colors cursor-pointer"
              title="Añadir nueva pestaña de hoja de cálculo"
            >
              <Plus className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Nueva Hoja</span>
            </button>
          </div>

          {/* Quick Selection Stats Bar (Bottom Right) */}
          {selectionStats && (
            <div className="flex items-center gap-3 text-[11px] font-mono bg-white border border-slate-300 px-3 py-1 rounded-lg text-slate-700 shadow-2xs">
              <span><strong>SUMA:</strong> <span className="text-sky-700 font-bold">{selectionStats.sum}</span></span>
              <span className="text-slate-300">|</span>
              <span><strong>PROMEDIO:</strong> {selectionStats.avg}</span>
              <span className="text-slate-300">|</span>
              <span><strong>CONTEO:</strong> {selectionStats.count}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
