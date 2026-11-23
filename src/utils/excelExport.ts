import * as XLSX from 'xlsx';
import { SpreadsheetWorkbook, SpreadsheetSheet } from '../types';

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

const parseCoord = (key: string): { col: number; row: number } | null => {
  const match = key.match(/^([A-Z]+)([0-9]+)$/i);
  if (!match) return null;
  return {
    col: getColIndex(match[1].toUpperCase()),
    row: parseInt(match[2], 10) - 1
  };
};

const sheetToXlsxWorksheet = (sheet: SpreadsheetSheet): XLSX.WorkSheet => {
  const ws: XLSX.WorkSheet = {};
  let maxRow = 0;
  let maxCol = 0;

  Object.entries(sheet.cells).forEach(([coord, cell]) => {
    const pos = parseCoord(coord);
    if (!pos) return;
    if (pos.row > maxRow) maxRow = pos.row;
    if (pos.col > maxCol) maxCol = pos.col;

    const xlsxCell: XLSX.CellObject = { t: 's', v: '' };

    if (cell.formula) {
      xlsxCell.f = cell.formula;
      if (typeof cell.value === 'number' && !isNaN(cell.value)) {
        xlsxCell.t = 'n';
        xlsxCell.v = cell.value;
      } else {
        xlsxCell.t = 's';
        xlsxCell.v = String(cell.value ?? '');
      }
    } else if (typeof cell.value === 'number' && !isNaN(cell.value)) {
      xlsxCell.t = 'n';
      xlsxCell.v = cell.value;
    } else {
      xlsxCell.t = 's';
      xlsxCell.v = String(cell.value ?? cell.raw ?? '');
    }

    if (cell.style?.format === 'currency') {
      xlsxCell.z = '$#,##0.00';
    } else if (cell.style?.format === 'hours') {
      xlsxCell.z = '0.0 "hrs"';
    } else if (cell.style?.format === 'percentage') {
      xlsxCell.z = '0.0"%"';
    }

    ws[coord.toUpperCase()] = xlsxCell;
  });

  ws['!ref'] = `A1:${getColLabel(Math.max(maxCol, 0))}${Math.max(maxRow + 1, 1)}`;
  ws['!cols'] = Array.from({ length: Math.max(sheet.colCount, maxCol + 1) }).map((_, idx) => {
    const px = sheet.colWidths?.[idx] || 120;
    return { wch: Math.max(10, Math.round(px / 7.5)) };
  });

  return ws;
};

export const exportWorkbookToXlsx = (workbook: SpreadsheetWorkbook, fileName?: string): void => {
  const wb = XLSX.utils.book_new();
  const usedNames = new Set<string>();

  workbook.sheets.forEach((sheet, idx) => {
    let safeName = (sheet.name || `Hoja_${idx + 1}`)
      .replace(/[\\/*?:\[\]]/g, '')
      .trim()
      .slice(0, 31) || `Hoja_${idx + 1}`;
    if (usedNames.has(safeName)) {
      safeName = `${safeName.slice(0, 27)}_${idx + 1}`;
    }
    usedNames.add(safeName);
    const ws = sheetToXlsxWorksheet(sheet);
    XLSX.utils.book_append_sheet(wb, ws, safeName);
  });

  const cleanFileName = (fileName || `${workbook.title || 'Honorarios_Instructor'}.xlsx`)
    .replace(/[<>:"/\\|?*]+/g, '_');
  const finalName = cleanFileName.toLowerCase().endsWith('.xlsx') ? cleanFileName : `${cleanFileName}.xlsx`;
  XLSX.writeFile(wb, finalName);
};
