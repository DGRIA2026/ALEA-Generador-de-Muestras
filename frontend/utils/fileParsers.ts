import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import type { Employee, ParseError, SamplingColumn } from '../types';

const normalizeHeader = (header: string): string => {
  return String(header || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/_/g, ' ')
    .replace(/\s+/g, ' ');
};

const mapRowToEmployee = (
  row: Record<string, unknown>,
  headerMapping: Record<string, string>,
  columns: SamplingColumn[],
  index: number,
): Employee | null => {
  const values: Record<string, string> = {};

  columns.forEach((column) => {
    const headerName = headerMapping[column.key];
    const rawValue = headerName ? row[headerName] : '';
    values[column.key] = String(rawValue ?? '').trim();
  });

  const hasAnyValue = Object.values(values).some((value) => value.length > 0);
  if (!hasAnyValue) return null;

  const firstColumnKey = columns[0]?.key;
  const firstValue = firstColumnKey ? values[firstColumnKey] : '';

  return {
    recordId: firstValue || `GEN-${index + 1}`,
    values,
    originalIndex: index,
  };
};

const findMappings = (
  headers: string[],
  columns: SamplingColumn[],
): { mapping: Record<string, string>; missing: string[] } => {
  const mapping: Record<string, string> = {};
  const usedHeaders = new Set<string>();
  const missing: string[] = [];

  const normalizedHeaders = headers.map((header) => ({
    original: header,
    norm: normalizeHeader(header),
  }));

  columns.forEach((column) => {
    const terms = [column.label, ...(column.aliases || [])]
      .map((term) => normalizeHeader(term))
      .filter(Boolean);

    const match = normalizedHeaders.find(({ original, norm }) => {
      if (usedHeaders.has(original)) return false;
      return terms.some((term) => norm === term || norm.includes(term));
    });

    if (!match) {
      missing.push(column.label);
      return;
    }

    mapping[column.key] = match.original;
    usedHeaders.add(match.original);
  });

  return { mapping, missing };
};

export const parseFile = async (
  file: File,
  columns: SamplingColumn[],
): Promise<{ data: Employee[]; error?: ParseError }> => {
  return new Promise((resolve) => {
    const isCsv = file.name.toLowerCase().endsWith('.csv');

    const handleData = (jsonData: Array<Record<string, unknown>>) => {
      if (!jsonData || jsonData.length === 0) {
        resolve({ data: [], error: { message: 'El archivo esta vacio.', severity: 'error' } });
        return;
      }

      const headers = Object.keys(jsonData[0] || {});
      if (headers.length === 0) {
        resolve({ data: [], error: { message: 'No se detectaron encabezados en el archivo.', severity: 'error' } });
        return;
      }

      const { mapping, missing } = findMappings(headers, columns);

      if (missing.length > 0) {
        resolve({
          data: [],
          error: {
            message: `No se pudieron identificar las columnas requeridas: ${missing.join(', ')}.`,
            severity: 'error',
          },
        });
        return;
      }

      const employees = jsonData
        .map((row, i) => mapRowToEmployee(row, mapping, columns, i))
        .filter((employee): employee is Employee => employee !== null);

      resolve({ data: employees });
    };

    if (isCsv) {
      Papa.parse<Record<string, unknown>>(file, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => handleData(results.data),
        error: (err) => resolve({ data: [], error: { message: `Error leyendo CSV: ${err.message}`, severity: 'error' } }),
      });
    } else {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = e.target?.result;
          const workbook = XLSX.read(data, { type: 'array' });
          const firstSheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[firstSheetName];
          const jsonData = XLSX.utils.sheet_to_json<Record<string, unknown>>(worksheet);
          handleData(jsonData);
        } catch {
          resolve({ data: [], error: { message: 'Error procesando archivo Excel.', severity: 'error' } });
        }
      };
      reader.readAsArrayBuffer(file);
    }
  });
};

const RESULT_LIST_META_EXACT_TERMS = [
  'muestra seleccionada',
  'reporte de auditoria de muestreo',
  'fecha de ejecucion',
  'semilla (seed)',
  'hash archivo (sha-256)',
  'hash resultado (sha-256)',
  'tamano muestra',
  'metodo',
  'total empleados origen',
];

const isLikelyMetaRow = (value: string, firstColumnTerms: string[]) => {
  const normalized = normalizeHeader(value);
  if (!normalized) return true;

  const normalizedIdTerms = firstColumnTerms.map(normalizeHeader).filter(Boolean);
  if (normalizedIdTerms.some((term) => normalized === term)) return true;

  if (RESULT_LIST_META_EXACT_TERMS.includes(normalized)) return true;
  if (normalized.startsWith('registros:')) return true;
  if (normalized.startsWith('generado:')) return true;

  return false;
};

export const parseResultListIds = async (
  file: File,
  firstColumnTerms: string[],
): Promise<{ ids: string[]; error?: ParseError }> => {
  return new Promise((resolve) => {
    const isCsv = file.name.toLowerCase().endsWith('.csv');

    const collectIds = (rows: unknown[][]) => {
      const ids = rows
        .map((row) => String((Array.isArray(row) ? row[0] : '') ?? '').trim())
        .filter(Boolean)
        .filter((value) => !isLikelyMetaRow(value, firstColumnTerms));

      if (ids.length === 0) {
        resolve({
          ids: [],
          error: {
            message:
              'No se detectaron registros válidos en la primera columna de la lista. Verifica el formato del archivo.',
            severity: 'error',
          },
        });
        return;
      }

      resolve({ ids });
    };

    if (isCsv) {
      Papa.parse<string[]>(file, {
        header: false,
        skipEmptyLines: true,
        complete: (results) => collectIds(results.data as unknown[][]),
        error: (err) =>
          resolve({ ids: [], error: { message: `Error leyendo CSV: ${err.message}`, severity: 'error' } }),
      });
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        const workbook = XLSX.read(data, { type: 'array' });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        const rows = XLSX.utils.sheet_to_json(worksheet, { header: 1, raw: false }) as unknown[][];
        collectIds(rows);
      } catch {
        resolve({ ids: [], error: { message: 'Error procesando archivo Excel.', severity: 'error' } });
      }
    };
    reader.readAsArrayBuffer(file);
  });
};
