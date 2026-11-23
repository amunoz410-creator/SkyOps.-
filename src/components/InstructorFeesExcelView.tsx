import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
  User,
  SpreadsheetWorkbook,
  SpreadsheetSheet,
  SpreadsheetCell,
  CellStyle,
  InstructorFeeExcelIndexItem
} from '../types';
import { api } from '../services/api';
import { exportWorkbookToXlsx } from '../utils/excelExport';
import {
  FileSpreadsheet,
  Save,
  RefreshCw,
  Download,
  Printer,
  Plus,
  Trash2,
  Bold,
  Italic,
  Underline,
  AlignLeft,
  AlignCenter,
  AlignRight,
  DollarSign,
  Percent,
  Clock,
  Check,
  Sparkles,
  ChevronDown,
  Users,
  Edit2,
  Lock,
  AlertCircle,
  Search
} from 'lucide-react';

interface InstructorFeesExcelViewProps {
  currentUser: User;
  allUsers: User[];
  initialInstructorId?: string;
  fixedInstructorId?: string;
  readOnly?: boolean;
  onSaved?: () => void;
}

const getColLabel = (index: number): string => {
  let label = '';
  let num = index;
  while (num >= 0) {
    label = String.fromCharCode((num % 26) + 65) + label;
    num = Math.floor(num / 26) - 1;
  }
  return label;
};

const getColIndex = (label: string): number => {
  let index = 0;
  for (let i = 0; i < label.length; i++) {
    index = index * 26 + (label.charCodeAt(i) - 64);
  }
  return index - 1;
};

const parseCellCoord = (
  key: string
): { col: number; row: number; colLabel: string; rowLabel: string } | null => {
  const match = key.match(/^([A-Z]+)([0-9]+)$/i);
  if (!match) return null;
  const colLabel = match[1].toUpperCase();
  const rowLabel = match[2];
  return {
    col: getColIndex(colLabel),
    row: parseInt(rowLabel, 10) - 1,
    colLabel,
    rowLabel
  };
};

const buildCellCoord = (col: number, row: number): string => {
  return `${getColLabel(col)}${row + 1}`;
};

export const InstructorFeesExcelView: React.FC<InstructorFeesExcelViewProps> = ({
  currentUser,
  initialInstructorId,
  fixedInstructorId,
  readOnly = false,
  onSaved
}) => {
  const isEditorRole =
    currentUser.rol === 'escuela' ||
    currentUser.rol === 'admin' ||
    currentUser.rol === 'contabilidad';
  const canEdit = isEditorRole && !readOnly;
  const isInstructorLocked = currentUser.rol === 'instructor' || Boolean(fixedInstructorId);

  const [directory, setDirectory] = useState<InstructorFeeExcelIndexItem[]>([]);
  const [directorySearch, setDirectorySearch] = useState<string>('');
  const [selectedInstructorId, setSelectedInstructorId] = useState<string>(
    fixedInstructorId ||
      (currentUser.rol === 'instructor' ? currentUser.id : initialInstructorId || '')
  );

  const [workbook, setWorkbook] = useState<SpreadsheetWorkbook | null>(null);
  const [fileName, setFileName] = useState<string>('Honorarios_Instructor.xlsx');
  const [hasCustomEdits, setHasCustomEdits] = useState<boolean>(false);
  const [activeSheetId, setActiveSheetId] = useState<string>('');
  const [selectedCell, setSelectedCell] = useState<string>('A6');
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [editValue, setEditValue] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState<boolean>(false);
  const [banner, setBanner] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [showFormulaHelper, setShowFormulaHelper] = useState<boolean>(false);
  const [editingSheetTitleId, setEditingSheetTitleId] = useState<string | null>(null);
  const [tempSheetName, setTempSheetName] = useState<string>('');
  const [confirmSync, setConfirmSync] = useState<boolean>(false);

  const formulaInputRef = useRef<HTMLInputElement>(null);
  const cellInputRef = useRef<HTMLInputElement>(null);

  const loadDirectory = useCallback(async () => {
    try {
      const res = await api.getInstructorFeeExcelDirectory({
        id: currentUser.id,
        rol: currentUser.rol
      });
      const list = res.directory || [];
      setDirectory(list);
      if (isInstructorLocked) {
        const targetId = fixedInstructorId || currentUser.id;
        setSelectedInstructorId(targetId);
      } else if (!selectedInstructorId || !list.some(i => i.instructor_id === selectedInstructorId)) {
        const preferred =
          (initialInstructorId && list.find(i => i.instructor_id === initialInstructorId)?.instructor_id) ||
          list[0]?.instructor_id ||
          '';
        setSelectedInstructorId(preferred);
      }
      return list;
    } catch (err: any) {
      setBanner({
        type: 'error',
        text: err.message || 'Error al cargar directorio de archivos Excel'
      });
      return [];
    }
  }, [currentUser.id, currentUser.rol, fixedInstructorId, initialInstructorId, isInstructorLocked, selectedInstructorId]);

  const loadInstructorWorkbook = useCallback(
    async (instId: string) => {
      if (!instId) {
        setIsLoading(false);
        return;
      }
      setIsLoading(true);
      try {
        const res = await api.getInstructorFeeExcelWorkbook(instId, {
          id: currentUser.id,
          rol: currentUser.rol
        });
        setWorkbook(res.workbook);
        setFileName(res.fileName);
        setHasCustomEdits(res.hasCustomEdits);
        setActiveSheetId(res.workbook.activeSheetId || res.workbook.sheets[0]?.id || '');
        setHasUnsavedChanges(false);
        setIsEditing(false);
        setConfirmSync(false);
      } catch (err: any) {
        setBanner({
          type: 'error',
          text: err.message || 'No se pudo cargar la hoja Excel del instructor'
        });
      } finally {
        setIsLoading(false);
      }
    },
    [currentUser.id, currentUser.rol]
  );

  useEffect(() => {
    loadDirectory();
  }, [currentUser.id, currentUser.rol]);

  useEffect(() => {
    if (selectedInstructorId) {
      loadInstructorWorkbook(selectedInstructorId);
    }
  }, [selectedInstructorId, loadInstructorWorkbook]);

  const activeSheet = useMemo(() => {
    if (!workbook) return null;
    return workbook.sheets.find(s => s.id === activeSheetId) || workbook.sheets[0] || null;
  }, [workbook, activeSheetId]);

  const evaluateFormula = useCallback(
    (formula: string, cells: Record<string, SpreadsheetCell>, depth = 0): number | string => {
      if (depth > 20) return '#ERROR';
      const cleanFormula = formula.trim().replace(/^=/, '');

      const funcMatch = cleanFormula.match(
        /^(SUM|SUMA|AVERAGE|PROMEDIO|COUNT|CONTAR|MAX|MIN|ROUND|REDONDEAR)\s*\((.*)\)$/i
      );
      if (funcMatch) {
        const funcName = funcMatch[1].toUpperCase();
        const argsStr = funcMatch[2];

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
                  const num =
                    typeof cell.value === 'number'
                      ? cell.value
                      : parseFloat(String(cell.value).replace(/[^0-9.-]/g, ''));
                  if (!isNaN(num)) values.push(num);
                }
              }
            }

            if (funcName === 'SUM' || funcName === 'SUMA') {
              return values.reduce((acc, v) => acc + v, 0);
            }
            if (funcName === 'AVERAGE' || funcName === 'PROMEDIO') {
              return values.length > 0 ? values.reduce((acc, v) => acc + v, 0) / values.length : 0;
            }
            if (funcName === 'COUNT' || funcName === 'CONTAR') {
              return values.length;
            }
            if (funcName === 'MAX') {
              return values.length > 0 ? Math.max(...values) : 0;
            }
            if (funcName === 'MIN') {
              return values.length > 0 ? Math.min(...values) : 0;
            }
          }
        }
      }

      try {
        const sanitized = cleanFormula.replace(/([A-Z]+[0-9]+)/gi, match => {
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
    },
    []
  );

  const recalculateSheet = useCallback(
    (sheet: SpreadsheetSheet): SpreadsheetSheet => {
      const updatedCells: Record<string, SpreadsheetCell> = { ...sheet.cells };

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

      // Dos pasadas para fórmulas encadenadas (ej. G6 -> I6 -> I10 -> D3)
      for (let pass = 0; pass < 2; pass++) {
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
      }

      return { ...sheet, cells: updatedCells };
    },
    [evaluateFormula]
  );

  const updateCellValue = useCallback(
    (coord: string, newRaw: string) => {
      if (!canEdit || !workbook || !activeSheet) return;

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

      setWorkbook({
        ...workbook,
        sheets: workbook.sheets.map(s => (s.id === updatedSheet.id ? updatedSheet : s)),
        updatedAt: new Date().toISOString()
      });
      setHasUnsavedChanges(true);
    },
    [canEdit, workbook, activeSheet, evaluateFormula, recalculateSheet]
  );

  const applyStyleToSelected = useCallback(
    (stylePatch: Partial<CellStyle>) => {
      if (!canEdit || !workbook || !activeSheet || !selectedCell) return;

      const updatedCells = { ...activeSheet.cells };
      const existing = updatedCells[selectedCell] || { raw: '', value: '' };
      updatedCells[selectedCell] = {
        ...existing,
        style: {
          ...(existing.style || {}),
          ...stylePatch
        }
      };

      const updatedSheet: SpreadsheetSheet = {
        ...activeSheet,
        cells: updatedCells
      };

      setWorkbook({
        ...workbook,
        sheets: workbook.sheets.map(s => (s.id === updatedSheet.id ? updatedSheet : s)),
        updatedAt: new Date().toISOString()
      });
      setHasUnsavedChanges(true);
    },
    [canEdit, workbook, activeSheet, selectedCell]
  );

  const startEditing = (coord: string) => {
    if (!canEdit) return;
    setSelectedCell(coord);
    const cell = activeSheet?.cells[coord];
    setEditValue(cell?.raw || '');
    setIsEditing(true);
    setTimeout(() => {
      cellInputRef.current?.focus();
      cellInputRef.current?.select();
    }, 40);
  };

  const commitEditing = () => {
    if (!canEdit) {
      setIsEditing(false);
      return;
    }
    if (isEditing) {
      updateCellValue(selectedCell, editValue);
      setIsEditing(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!activeSheet) return;
    const current = parseCellCoord(selectedCell);
    if (!current) return;

    if (isEditing && canEdit) {
      if (e.key === 'Enter') {
        e.preventDefault();
        commitEditing();
        setSelectedCell(buildCellCoord(current.col, Math.min(current.row + 1, activeSheet.rowCount - 1)));
      } else if (e.key === 'Tab') {
        e.preventDefault();
        commitEditing();
        setSelectedCell(buildCellCoord(Math.min(current.col + 1, activeSheet.colCount - 1), current.row));
      } else if (e.key === 'Escape') {
        setIsEditing(false);
      }
      return;
    }

    if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedCell(buildCellCoord(current.col, Math.max(0, current.row - 1)));
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedCell(buildCellCoord(current.col, Math.min(activeSheet.rowCount - 1, current.row + 1)));
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault();
      setSelectedCell(buildCellCoord(Math.max(0, current.col - 1), current.row));
    } else if (e.key === 'ArrowRight') {
      e.preventDefault();
      setSelectedCell(buildCellCoord(Math.min(activeSheet.colCount - 1, current.col + 1), current.row));
    } else if (canEdit && (e.key === 'Enter' || e.key === 'F2')) {
      e.preventDefault();
      startEditing(selectedCell);
    } else if (canEdit && (e.key === 'Delete' || e.key === 'Backspace')) {
      e.preventDefault();
      updateCellValue(selectedCell, '');
    } else if (canEdit && e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
      setEditValue(e.key);
      setIsEditing(true);
      setTimeout(() => cellInputRef.current?.focus(), 20);
    }
  };

  const handleSaveWorkbook = async () => {
    if (!canEdit || !workbook || !selectedInstructorId) return;
    setIsSaving(true);
    try {
      const res = await api.saveInstructorFeeExcelWorkbook(selectedInstructorId, workbook, {
        id: currentUser.id,
        rol: currentUser.rol,
        nombre: currentUser.nombre
      });
      setWorkbook(res.workbook);
      setHasCustomEdits(res.hasCustomEdits);
      setHasUnsavedChanges(false);
      setBanner({ type: 'success', text: `Archivo ${res.fileName} guardado correctamente.` });
      await loadDirectory();
      if (onSaved) onSaved();
    } catch (err: any) {
      setBanner({ type: 'error', text: err.message || 'No se pudo guardar el archivo Excel.' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleSyncFromBitacoras = async () => {
    if (!canEdit || !selectedInstructorId) return;
    setIsSyncing(true);
    try {
      const res = await api.syncInstructorFeeExcelWorkbook(selectedInstructorId, {
        id: currentUser.id,
        rol: currentUser.rol
      });
      setWorkbook(res.workbook);
      setActiveSheetId(res.workbook.activeSheetId || res.workbook.sheets[0]?.id || '');
      setHasCustomEdits(res.hasCustomEdits);
      setHasUnsavedChanges(false);
      setConfirmSync(false);
      setBanner({
        type: 'success',
        text: `${res.fileName} actualizado con las bitácoras vigentes.`
      });
      await loadDirectory();
    } catch (err: any) {
      setBanner({ type: 'error', text: err.message || 'Error al sincronizar bitácoras.' });
    } finally {
      setIsSyncing(false);
    }
  };

  const handleAddRows = () => {
    if (!canEdit || !workbook || !activeSheet) return;
    const updatedSheet: SpreadsheetSheet = {
      ...activeSheet,
      rowCount: activeSheet.rowCount + 10
    };
    setWorkbook({
      ...workbook,
      sheets: workbook.sheets.map(s => (s.id === updatedSheet.id ? updatedSheet : s))
    });
    setHasUnsavedChanges(true);
  };

  const handleAddSheet = () => {
    if (!canEdit || !workbook) return;
    const newSheet: SpreadsheetSheet = {
      id: `sheet_inst_${Date.now()}`,
      name: `Hoja ${workbook.sheets.length + 1}`,
      icon: 'FileSpreadsheet',
      rowCount: 25,
      colCount: 12,
      cells: {
        A1: {
          raw: workbook.title,
          value: workbook.title,
          style: { bold: true, bgColor: '#0F172A', textColor: '#FFFFFF' }
        }
      },
      colWidths: { 0: 130, 1: 150, 2: 120, 3: 150 }
    };
    setWorkbook({
      ...workbook,
      sheets: [...workbook.sheets, newSheet],
      activeSheetId: newSheet.id
    });
    setActiveSheetId(newSheet.id);
    setHasUnsavedChanges(true);
  };

  const handleRenameSheet = (sheetId: string) => {
    if (!canEdit || !workbook || !tempSheetName.trim()) {
      setEditingSheetTitleId(null);
      return;
    }
    setWorkbook({
      ...workbook,
      sheets: workbook.sheets.map(s => (s.id === sheetId ? { ...s, name: tempSheetName.trim() } : s))
    });
    setEditingSheetTitleId(null);
    setHasUnsavedChanges(true);
  };

  const handleDeleteSheet = (sheetId: string) => {
    if (!canEdit || !workbook || workbook.sheets.length <= 1) return;
    const remaining = workbook.sheets.filter(s => s.id !== sheetId);
    const nextId = activeSheetId === sheetId ? remaining[0].id : activeSheetId;
    setWorkbook({
      ...workbook,
      sheets: remaining,
      activeSheetId: nextId
    });
    setActiveSheetId(nextId);
    setHasUnsavedChanges(true);
  };

  const handleDownloadXlsx = async (targetInstructorId?: string) => {
    const targetId = targetInstructorId || selectedInstructorId;
    if (!targetId) return;
    try {
      if (targetId === selectedInstructorId && workbook) {
        exportWorkbookToXlsx(workbook, fileName);
      } else {
        const res = await api.getInstructorFeeExcelWorkbook(targetId, {
          id: currentUser.id,
          rol: currentUser.rol
        });
        exportWorkbookToXlsx(res.workbook, res.fileName);
      }
    } catch (err: any) {
      setBanner({
        type: 'error',
        text: err.message || 'No se pudo generar el archivo Excel.'
      });
    }
  };

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

  const filteredDirectory = useMemo(() => {
    if (!directorySearch.trim()) return directory;
    const q = directorySearch.toLowerCase();
    return directory.filter(
      item =>
        item.instructor_nombre.toLowerCase().includes(q) ||
        item.instructor_cedula.toLowerCase().includes(q) ||
        item.fileName.toLowerCase().includes(q)
    );
  }, [directory, directorySearch]);

  const activeCellData = activeSheet?.cells[selectedCell];

  return (
    <div className="space-y-4 max-w-[100vw] overflow-hidden" tabIndex={0} onKeyDown={handleKeyDown}>
      {/* CABECERA */}
      <div className="bg-slate-900 dark:bg-slate-950 border border-slate-800 rounded-2xl p-4 sm:p-5 text-white shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-emerald-600/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0">
              <FileSpreadsheet className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-bold tracking-tight text-white">
                {isInstructorLocked ? 'Mis Honorarios — Formato Excel' : 'Honorarios en Formato Excel'}
              </h2>
              <div className="flex items-center gap-2 mt-1 flex-wrap">
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-800 border border-slate-700 text-[11px] font-mono text-emerald-300">
                  {fileName}
                </span>
                {!canEdit && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-500/15 border border-amber-400/30 text-[11px] font-semibold text-amber-200">
                    <Lock className="w-3 h-3" />
                    Solo Lectura
                  </span>
                )}
                {canEdit && hasUnsavedChanges && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-500/20 border border-amber-400/40 text-[11px] font-semibold text-amber-200">
                    Cambios sin guardar
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {canEdit && (
              confirmSync ? (
                <div className="flex items-center gap-1.5 bg-slate-800 px-2.5 py-1.5 rounded-xl border border-slate-700">
                  <span className="text-[11px] text-slate-200">¿Actualizar desde bitácoras?</span>
                  <button
                    type="button"
                    onClick={handleSyncFromBitacoras}
                    disabled={isSyncing}
                    className="px-2.5 py-1 bg-sky-600 hover:bg-sky-500 text-white rounded-lg text-[11px] font-bold cursor-pointer"
                  >
                    Sí
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmSync(false)}
                    className="px-2 py-1 bg-slate-700 hover:bg-slate-600 text-slate-200 rounded-lg text-[11px] cursor-pointer"
                  >
                    No
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setConfirmSync(true)}
                  disabled={isSyncing || !selectedInstructorId}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold transition-colors disabled:opacity-50 cursor-pointer"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
                  <span>Sincronizar Bitácoras</span>
                </button>
              )
            )}

            {canEdit && (
              <button
                type="button"
                onClick={handleSaveWorkbook}
                disabled={isSaving || !workbook}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-colors disabled:opacity-50 cursor-pointer"
              >
                <Save className="w-3.5 h-3.5" />
                <span>{isSaving ? 'Guardando...' : 'Guardar Excel'}</span>
              </button>
            )}

            {!canEdit && (
              <button
                type="button"
                onClick={() => selectedInstructorId && loadInstructorWorkbook(selectedInstructorId)}
                disabled={isLoading}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-semibold border border-white/15 transition-colors cursor-pointer"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
                <span>Actualizar</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => handleDownloadXlsx()}
              disabled={!workbook}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-600 text-white text-xs font-bold border border-emerald-500/40 transition-colors disabled:opacity-50 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Descargar Excel (.xlsx)</span>
            </button>

            <button
              type="button"
              onClick={() => window.print()}
              className="flex items-center gap-1.5 px-2.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition-colors cursor-pointer"
              title="Imprimir"
            >
              <Printer className="w-4 h-4" />
            </button>
          </div>
        </div>

        {banner && (
          <div
            className={`mt-3 px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center justify-between gap-2 ${
              banner.type === 'success'
                ? 'bg-emerald-500/20 border border-emerald-500/40 text-emerald-200'
                : 'bg-rose-500/20 border border-rose-500/40 text-rose-200'
            }`}
          >
            <div className="flex items-center gap-2">
              {banner.type === 'success' ? (
                <Check className="w-4 h-4 text-emerald-400 shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
              )}
              <span>{banner.text}</span>
            </div>
            <button
              type="button"
              onClick={() => setBanner(null)}
              className="text-xs underline opacity-80 hover:opacity-100 cursor-pointer"
            >
              Cerrar
            </button>
          </div>
        )}
      </div>

      {/* SELECTOR DE ARCHIVO INDIVIDUAL POR INSTRUCTOR (DIRECTOR / ADMIN / CONTABILIDAD) */}
      {!isInstructorLocked && directory.length > 0 && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-white">
                Archivos Individuales por Instructor ({directory.length})
              </h3>
            </div>
            <div className="relative w-full sm:w-64">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={directorySearch}
                onChange={e => setDirectorySearch(e.target.value)}
                placeholder="Buscar instructor o archivo..."
                className="w-full pl-8 pr-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-xs text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
            {filteredDirectory.map(item => {
              const isSelected = selectedInstructorId === item.instructor_id;
              return (
                <div
                  key={item.instructor_id}
                  onClick={() => setSelectedInstructorId(item.instructor_id)}
                  className={`p-3 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                    isSelected
                      ? 'bg-emerald-50/80 dark:bg-emerald-950/40 border-emerald-500 ring-1 ring-emerald-500/40'
                      : 'bg-slate-50/70 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 hover:border-emerald-400'
                  }`}
                >
                  <div className="min-w-0 flex-1 space-y-0.5">
                    <div className="flex items-center gap-1.5">
                      <FileSpreadsheet
                        className={`w-4 h-4 shrink-0 ${
                          isSelected ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-500'
                        }`}
                      />
                      <span className="font-bold text-xs text-slate-900 dark:text-white truncate">
                        {item.instructor_nombre}
                      </span>
                    </div>
                    <div className="text-[10px] font-mono text-sky-700 dark:text-sky-400 truncate">
                      {item.fileName}
                    </div>
                    <div className="text-[11px] text-slate-600 dark:text-slate-300 tabular-nums flex items-center gap-2 flex-wrap">
                      <span>{item.totalHoras.toFixed(1)} hrs</span>
                      <span>•</span>
                      <span className="font-semibold text-emerald-700 dark:text-emerald-400">
                        ${item.totalNeto.toFixed(2)} USD
                      </span>
                      {item.hasCustomEdits && (
                        <span className="px-1.5 py-0.2 rounded bg-amber-100 dark:bg-amber-900/50 text-amber-800 dark:text-amber-200 text-[9px] font-bold">
                          Editado
                        </span>
                      )}
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={e => {
                      e.stopPropagation();
                      handleDownloadXlsx(item.instructor_id);
                    }}
                    title={`Descargar ${item.fileName}`}
                    className="p-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/60 transition-colors shrink-0 cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5" />
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ESPACIO DE TRABAJO EXCEL */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden flex flex-col">
        {/* Barra de formato (visible solo para Director, Administración y Contabilidad) */}
        {canEdit && (
          <div className="bg-slate-50 border-b border-slate-200 px-3 py-2 flex items-center justify-between gap-2 flex-wrap text-slate-700 select-none">
            <div className="flex items-center gap-1 flex-wrap">
              <div className="flex items-center bg-white border border-slate-200 rounded-lg p-0.5">
                <button
                  type="button"
                  onClick={() => applyStyleToSelected({ bold: !activeCellData?.style?.bold })}
                  className={`p-1.5 rounded hover:bg-slate-100 cursor-pointer ${
                    activeCellData?.style?.bold ? 'bg-sky-100 text-sky-700' : ''
                  }`}
                  title="Negrita"
                >
                  <Bold className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => applyStyleToSelected({ italic: !activeCellData?.style?.italic })}
                  className={`p-1.5 rounded hover:bg-slate-100 cursor-pointer ${
                    activeCellData?.style?.italic ? 'bg-sky-100 text-sky-700' : ''
                  }`}
                  title="Cursiva"
                >
                  <Italic className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => applyStyleToSelected({ underline: !activeCellData?.style?.underline })}
                  className={`p-1.5 rounded hover:bg-slate-100 cursor-pointer ${
                    activeCellData?.style?.underline ? 'bg-sky-100 text-sky-700' : ''
                  }`}
                  title="Subrayado"
                >
                  <Underline className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="flex items-center bg-white border border-slate-200 rounded-lg p-0.5">
                <button
                  type="button"
                  onClick={() => applyStyleToSelected({ align: 'left' })}
                  className={`p-1.5 rounded hover:bg-slate-100 cursor-pointer ${
                    activeCellData?.style?.align === 'left' ? 'bg-sky-100 text-sky-700' : ''
                  }`}
                  title="Alinear izquierda"
                >
                  <AlignLeft className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => applyStyleToSelected({ align: 'center' })}
                  className={`p-1.5 rounded hover:bg-slate-100 cursor-pointer ${
                    activeCellData?.style?.align === 'center' ? 'bg-sky-100 text-sky-700' : ''
                  }`}
                  title="Centrar"
                >
                  <AlignCenter className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => applyStyleToSelected({ align: 'right' })}
                  className={`p-1.5 rounded hover:bg-slate-100 cursor-pointer ${
                    activeCellData?.style?.align === 'right' ? 'bg-sky-100 text-sky-700' : ''
                  }`}
                  title="Alinear derecha"
                >
                  <AlignRight className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="flex items-center bg-white border border-slate-200 rounded-lg p-0.5">
                <button
                  type="button"
                  onClick={() => applyStyleToSelected({ format: 'currency', align: 'right' })}
                  className={`flex items-center gap-0.5 px-2 py-1 rounded text-xs font-bold hover:bg-slate-100 cursor-pointer ${
                    activeCellData?.style?.format === 'currency'
                      ? 'bg-emerald-100 text-emerald-800'
                      : 'text-slate-700'
                  }`}
                  title="Formato Moneda ($)"
                >
                  <DollarSign className="w-3 h-3 text-emerald-600" />
                  <span>USD</span>
                </button>
                <button
                  type="button"
                  onClick={() => applyStyleToSelected({ format: 'hours', align: 'right' })}
                  className={`flex items-center gap-0.5 px-2 py-1 rounded text-xs font-bold hover:bg-slate-100 cursor-pointer ${
                    activeCellData?.style?.format === 'hours'
                      ? 'bg-sky-100 text-sky-800'
                      : 'text-slate-700'
                  }`}
                  title="Formato Horas"
                >
                  <Clock className="w-3 h-3 text-sky-600" />
                  <span>Hrs</span>
                </button>
                <button
                  type="button"
                  onClick={() => applyStyleToSelected({ format: 'percentage', align: 'right' })}
                  className={`p-1 rounded hover:bg-slate-100 cursor-pointer ${
                    activeCellData?.style?.format === 'percentage'
                      ? 'bg-purple-100 text-purple-800'
                      : 'text-slate-700'
                  }`}
                  title="Porcentaje"
                >
                  <Percent className="w-3 h-3 text-purple-600" />
                </button>
                <button
                  type="button"
                  onClick={() => applyStyleToSelected({ format: 'general' })}
                  className="px-1.5 py-1 rounded text-[11px] font-semibold hover:bg-slate-100 text-slate-600 cursor-pointer"
                  title="General"
                >
                  123
                </button>
              </div>

              <button
                type="button"
                onClick={handleAddRows}
                className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white border border-slate-200 hover:bg-slate-100 text-xs font-semibold text-slate-700 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>+10 Filas</span>
              </button>
            </div>

            <button
              type="button"
              onClick={() => setShowFormulaHelper(prev => !prev)}
              className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-sky-50 hover:bg-sky-100 text-sky-700 text-xs font-bold border border-sky-200 cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Fórmulas (fx)</span>
              <ChevronDown className="w-3 h-3" />
            </button>
          </div>
        )}

        {canEdit && showFormulaHelper && (
          <div className="bg-slate-900 text-white p-3 border-b border-slate-800 text-xs flex flex-wrap gap-2.5 items-center justify-between">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-bold text-sky-300">Fórmulas:</span>
              <button
                type="button"
                onClick={() => {
                  updateCellValue(selectedCell, '=SUM(E6:E15)');
                  setShowFormulaHelper(false);
                }}
                className="bg-slate-800 hover:bg-slate-700 px-2 py-1 rounded border border-slate-700 text-sky-200 font-mono text-[11px] cursor-pointer"
              >
                =SUM(E6:E15)
              </button>
              <button
                type="button"
                onClick={() => {
                  updateCellValue(selectedCell, '=SUM(I6:I15)');
                  setShowFormulaHelper(false);
                }}
                className="bg-slate-800 hover:bg-slate-700 px-2 py-1 rounded border border-slate-700 text-emerald-200 font-mono text-[11px] cursor-pointer"
              >
                =SUM(I6:I15)
              </button>
              <button
                type="button"
                onClick={() => {
                  updateCellValue(selectedCell, '=E6*F6');
                  setShowFormulaHelper(false);
                }}
                className="bg-slate-800 hover:bg-slate-700 px-2 py-1 rounded border border-slate-700 text-emerald-200 font-mono text-[11px] cursor-pointer"
              >
                =E6*F6
              </button>
              <button
                type="button"
                onClick={() => {
                  updateCellValue(selectedCell, '=G6-H6');
                  setShowFormulaHelper(false);
                }}
                className="bg-slate-800 hover:bg-slate-700 px-2 py-1 rounded border border-slate-700 text-amber-200 font-mono text-[11px] cursor-pointer"
              >
                =G6-H6
              </button>
            </div>
            <button
              type="button"
              onClick={() => setShowFormulaHelper(false)}
              className="text-slate-400 hover:text-white underline cursor-pointer"
            >
              Cerrar
            </button>
          </div>
        )}

        {/* Barra de Fórmulas (fx) */}
        <div className="bg-white border-b border-slate-200 px-3 py-1.5 flex items-center gap-2">
          <div className="w-14 px-2 py-1 bg-slate-100 border border-slate-300 rounded font-mono font-bold text-xs text-slate-800 text-center select-none">
            {selectedCell}
          </div>
          <div className="font-serif italic font-bold text-slate-400 text-sm select-none">fx</div>
          {canEdit ? (
            <input
              ref={formulaInputRef}
              type="text"
              value={isEditing ? editValue : activeCellData?.raw || ''}
              onChange={e => {
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
              onKeyDown={e => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  commitEditing();
                  formulaInputRef.current?.blur();
                } else if (e.key === 'Escape') {
                  setIsEditing(false);
                  formulaInputRef.current?.blur();
                }
              }}
              placeholder="Valor o fórmula (=E6*F6, =SUM(I6:I15))"
              className="flex-1 font-mono text-xs text-slate-800 bg-transparent focus:outline-none px-2 py-1"
            />
          ) : (
            <div className="flex-1 font-mono text-xs text-slate-700 px-2 py-1 truncate">
              {activeCellData?.raw || ''}
            </div>
          )}
          {activeCellData?.formula && (
            <div className="text-[11px] text-slate-500 font-mono bg-slate-50 border border-slate-200 px-2 py-0.5 rounded">
              <strong className="text-emerald-700">{renderFormattedCellValue(activeCellData)}</strong>
            </div>
          )}
        </div>

        {/* Cuadrícula Excel */}
        {isLoading ? (
          <div className="p-16 text-center text-slate-500 text-xs">
            <RefreshCw className="w-7 h-7 animate-spin mx-auto mb-2 text-emerald-600" />
            Cargando hoja Excel...
          </div>
        ) : (
          <div className="relative overflow-auto max-h-[600px] bg-slate-100 select-none cursor-default font-sans">
            {activeSheet && (
              <table className="border-collapse table-fixed bg-white text-xs">
                <thead>
                  <tr className="bg-slate-100 text-slate-600 font-semibold sticky top-0 z-20">
                    <th className="w-10 min-w-10 max-w-10 h-6 border border-slate-300 bg-slate-200 text-[10px] text-center font-mono sticky left-0 z-30">
                      #
                    </th>
                    {Array.from({ length: activeSheet.colCount }).map((_, c) => {
                      const width = activeSheet.colWidths?.[c] || 115;
                      return (
                        <th
                          key={c}
                          style={{ width: `${width}px`, minWidth: `${width}px`, maxWidth: `${width}px` }}
                          className="h-6 border border-slate-300 text-center font-mono text-[11px] text-slate-700 px-1 bg-slate-100"
                        >
                          {getColLabel(c)}
                        </th>
                      );
                    })}
                  </tr>
                </thead>
                <tbody>
                  {Array.from({ length: activeSheet.rowCount }).map((_, r) => (
                    <tr key={r}>
                      <td className="w-10 min-w-10 max-w-10 h-7 border border-slate-300 bg-slate-100 text-[11px] text-slate-600 font-mono text-center font-semibold sticky left-0 z-10">
                        {r + 1}
                      </td>
                      {Array.from({ length: activeSheet.colCount }).map((_, c) => {
                        const coord = buildCellCoord(c, r);
                        const cell = activeSheet.cells[coord];
                        const isSelected = selectedCell === coord;
                        const style = cell?.style || {};

                        const cellBgColor = style.bgColor || (isSelected ? '#E0F2FE' : '#FFFFFF');
                        const cellTextColor = style.textColor || '#0F172A';
                        const cellAlign =
                          style.align || (typeof cell?.value === 'number' ? 'right' : 'left');

                        return (
                          <td
                            key={c}
                            onClick={() => {
                              if (isEditing && selectedCell !== coord) commitEditing();
                              setSelectedCell(coord);
                            }}
                            onDoubleClick={() => startEditing(coord)}
                            style={{
                              backgroundColor: cellBgColor,
                              color: cellTextColor,
                              textAlign: cellAlign,
                              fontWeight: style.bold ? 'bold' : 'normal',
                              fontStyle: style.italic ? 'italic' : 'normal',
                              textDecoration: style.underline ? 'underline' : 'none'
                            }}
                            className={`h-7 border border-slate-200 px-2 py-1 text-xs truncate relative ${
                              isSelected
                                ? 'outline-2 outline-sky-600 outline-offset-[-2px] z-10'
                                : 'hover:border-slate-400'
                            }`}
                          >
                            {isSelected && isEditing && canEdit ? (
                              <input
                                ref={cellInputRef}
                                type="text"
                                value={editValue}
                                onChange={e => setEditValue(e.target.value)}
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
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

        {/* Pestañas de Hojas */}
        <div className="bg-slate-100 border-t border-slate-300 px-3 py-2 flex items-center justify-between gap-3 flex-wrap select-none">
          <div className="flex items-center gap-1.5 overflow-x-auto py-0.5">
            {workbook?.sheets.map(sheet => {
              const isActive = activeSheetId === sheet.id;
              const isEditingTitle = editingSheetTitleId === sheet.id;

              return (
                <div
                  key={sheet.id}
                  onClick={() => {
                    if (!isEditingTitle) {
                      setActiveSheetId(sheet.id);
                      setSelectedCell('A1');
                    }
                  }}
                  className={`group flex items-center gap-1.5 px-3 py-1.5 rounded-t-lg text-xs font-bold border transition-all cursor-pointer ${
                    isActive
                      ? 'bg-white text-emerald-800 border-slate-300 border-b-white shadow-xs'
                      : 'bg-slate-200 text-slate-600 border-transparent hover:bg-slate-300/80'
                  }`}
                >
                  <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
                  {isEditingTitle && canEdit ? (
                    <input
                      type="text"
                      autoFocus
                      value={tempSheetName}
                      onChange={e => setTempSheetName(e.target.value)}
                      onBlur={() => handleRenameSheet(sheet.id)}
                      onKeyDown={e => {
                        if (e.key === 'Enter') handleRenameSheet(sheet.id);
                        if (e.key === 'Escape') setEditingSheetTitleId(null);
                      }}
                      className="px-1 py-0.5 text-xs bg-white border border-emerald-500 rounded text-slate-900 w-28 focus:outline-none"
                    />
                  ) : (
                    <span>{sheet.name}</span>
                  )}

                  {canEdit && (
                    <div className="flex items-center opacity-0 group-hover:opacity-100 transition-opacity ml-1">
                      <button
                        type="button"
                        onClick={e => {
                          e.stopPropagation();
                          setEditingSheetTitleId(sheet.id);
                          setTempSheetName(sheet.name);
                        }}
                        className="p-0.5 hover:text-sky-600 cursor-pointer"
                        title="Renombrar hoja"
                      >
                        <Edit2 className="w-3 h-3" />
                      </button>
                      {workbook.sheets.length > 1 && (
                        <button
                          type="button"
                          onClick={e => {
                            e.stopPropagation();
                            handleDeleteSheet(sheet.id);
                          }}
                          className="p-0.5 hover:text-rose-600 ml-0.5 cursor-pointer"
                          title="Eliminar hoja"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  )}
                </div>
              );
            })}

            {canEdit && (
              <button
                type="button"
                onClick={handleAddSheet}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-bold transition-colors cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Nueva Hoja</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
