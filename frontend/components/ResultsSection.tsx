import React, { useEffect, useMemo, useState } from 'react';
import {
  Button,
  InputAdornment,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TablePagination,
  TableRow,
  TableSortLabel,
  TextField,
} from '@mui/material';
import { Download, Search, VerifiedUser } from '@mui/icons-material';
import type { Employee, SamplingColumn, SamplingHistoryItem } from '../types';
import * as XLSX from 'xlsx-js-style';
import { colorTokens } from '../src/theme/colors';
import { normalizeText } from '../utils/normalizeText';

interface ResultsSectionProps {
  totalEmployees: number;
  sample: Employee[];
  columns: SamplingColumn[];
  auditData?: SamplingHistoryItem;
  heightClass?: string;
}

type Order = 'asc' | 'desc';

function descendingComparator(a: Employee, b: Employee, orderBy: string) {
  if (orderBy === 'originalIndex') {
    return b.originalIndex - a.originalIndex;
  }

  const valA = String(a.values[orderBy] || '').toLowerCase();
  const valB = String(b.values[orderBy] || '').toLowerCase();

  if (!Number.isNaN(Number(valA)) && !Number.isNaN(Number(valB)) && valA !== '' && valB !== '') {
    return Number(valB) - Number(valA);
  }

  if (valB < valA) return -1;
  if (valB > valA) return 1;
  return 0;
}

function getComparator(order: Order, orderBy: string) {
  return order === 'desc'
    ? (a: Employee, b: Employee) => descendingComparator(a, b, orderBy)
    : (a: Employee, b: Employee) => -descendingComparator(a, b, orderBy);
}

function toExcelColumn(index: number): string {
  let n = index + 1;
  let out = '';
  while (n > 0) {
    const rem = (n - 1) % 26;
    out = String.fromCharCode(65 + rem) + out;
    n = Math.floor((n - 1) / 26);
  }
  return out;
}

export const ResultsSection: React.FC<ResultsSectionProps> = ({
  totalEmployees,
  sample,
  columns,
  auditData,
  heightClass = 'h-full',
}) => {
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(25);
  const [searchText, setSearchText] = useState('');
  const [order, setOrder] = useState<Order>('asc');
  const [orderBy, setOrderBy] = useState<string>('');

  useEffect(() => {
    if (orderBy && !columns.some((column) => column.key === orderBy) && orderBy !== 'originalIndex') {
      setOrderBy('');
    }
  }, [columns, orderBy]);

  const percentage = totalEmployees > 0 ? ((sample.length / totalEmployees) * 100).toFixed(1) : '0.0';

  const visibleRows = useMemo(() => {
    let filtered = sample;

    if (searchText) {
      const searchTerms = normalizeText(searchText).split(' ').filter(Boolean);
      filtered = sample.filter((row) => {
        const rowString = normalizeText(columns.map((column) => row.values[column.key] || '').join(' '));
        return searchTerms.every((term) => rowString.includes(term));
      });
    }

    if (!orderBy) return filtered;
    return [...filtered].sort(getComparator(order, orderBy));
  }, [sample, columns, searchText, order, orderBy]);

  const paginatedRows = useMemo(() => {
    return visibleRows.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);
  }, [visibleRows, page, rowsPerPage]);

  const handleRequestSort = (property: string) => {
    const isAsc = orderBy === property && order === 'asc';
    setOrder(isAsc ? 'desc' : 'asc');
    setOrderBy(property);
  };

  const handleExport = () => {
    if (sample.length === 0 || columns.length === 0) return;

    const wb = XLSX.utils.book_new();
    const estimateWidth = (value: unknown) => String(value ?? '').trim().length;

    const styles = {
      title: {
        fill: { fgColor: { rgb: 'EAF2FA' } },
        font: { color: { rgb: '1A4D7D' }, bold: true, name: 'Arial', sz: 14 },
        alignment: { vertical: 'center', horizontal: 'left' },
      },
      subtitle: {
        font: { color: { rgb: '475569' }, italic: true, name: 'Arial', sz: 10 },
        alignment: { vertical: 'center', horizontal: 'left' },
      },
      header: {
        fill: { fgColor: { rgb: '1A4D7D' } },
        font: { color: { rgb: 'FFFFFF' }, bold: true, name: 'Arial', sz: 12 },
        alignment: { vertical: 'center', horizontal: 'center' },
      },
      cell: {
        font: { name: 'Arial', sz: 11 },
        alignment: { vertical: 'center', wrapText: true },
      },
      altCell: {
        font: { name: 'Arial', sz: 11 },
        fill: { fgColor: { rgb: 'F8FAFC' } },
        alignment: { vertical: 'center', wrapText: true },
      },
      auditTitle: {
        font: { sz: 14, bold: true, color: { rgb: '1A4D7D' } },
      },
      auditKey: {
        font: { bold: true, color: { rgb: '334155' } },
        fill: { fgColor: { rgb: 'F1F5F9' } },
      },
      auditValue: {
        font: { name: 'Consolas', color: { rgb: '0F172A' } },
      },
    };

    if (auditData) {
      const auditRows = [
        [{ v: 'REPORTE DE AUDITORIA DE MUESTREO', s: styles.auditTitle }, null],
        [],
        [{ v: 'Fecha de Ejecucion', s: styles.auditKey }, { v: auditData.timestamp, s: styles.auditValue }],
        [{ v: 'Semilla (Seed)', s: styles.auditKey }, { v: auditData.seed, s: styles.auditValue }],
        [{ v: 'Hash Archivo (SHA-256)', s: styles.auditKey }, { v: auditData.fileHash, s: styles.auditValue }],
        [{ v: 'Hash Resultado (SHA-256)', s: styles.auditKey }, { v: auditData.resultHash, s: styles.auditValue }],
        [{ v: 'Tamano Muestra', s: styles.auditKey }, { v: auditData.sampleSize, s: styles.auditValue }],
        [{ v: 'Metodo', s: styles.auditKey }, { v: auditData.method, s: styles.auditValue }],
        [{ v: 'Total Empleados Origen', s: styles.auditKey }, { v: totalEmployees, s: styles.auditValue }],
      ];

      const wsAudit = XLSX.utils.aoa_to_sheet(auditRows);
      wsAudit['!cols'] = [{ wch: 30 }, { wch: 95 }];
      XLSX.utils.book_append_sheet(wb, wsAudit, 'Auditoria');
    }

    const headers = columns.map((column) => column.label);
    const dataToExport = sample;
    const generatedAt = new Date().toLocaleString('es-MX');
    const subtitleText = `Registros: ${dataToExport.length} de ${totalEmployees} | Generado: ${generatedAt}`;

    const nullPadding = new Array(Math.max(0, columns.length - 1)).fill(null);
    const titleRows = [
      [{ v: 'MUESTRA SELECCIONADA', s: styles.title }, ...nullPadding],
      [{ v: subtitleText, s: styles.subtitle }, ...nullPadding],
      [],
    ];

    const headerRow = headers.map((header) => ({ v: header, s: styles.header }));
    const dataRows = dataToExport.map((employee, idx) => {
      const isAlt = idx % 2 === 1;
      return columns.map((column) => ({
        v: employee.values[column.key] || '',
        s: isAlt ? styles.altCell : styles.cell,
      }));
    });

    const allRows = [...titleRows, headerRow, ...dataRows];
    const wsData = XLSX.utils.aoa_to_sheet(allRows);

    if (columns.length > 1) {
      wsData['!merges'] = [
        { s: { r: 0, c: 0 }, e: { r: 0, c: columns.length - 1 } },
        { s: { r: 1, c: 0 }, e: { r: 1, c: columns.length - 1 } },
      ];
    }

    const lastColumn = toExcelColumn(Math.max(columns.length - 1, 0));
    wsData['!autofilter'] = { ref: `A4:${lastColumn}${Math.max(4, dataRows.length + 4)}` };

    wsData['!cols'] = columns.map((column, index) => {
      const maxWidth = Math.max(
        headers[index].length,
        ...dataToExport.map((employee) => estimateWidth(employee.values[column.key])),
      );
      return { wch: Math.max(12, Math.min(maxWidth + 3, 52)) };
    });

    XLSX.utils.book_append_sheet(wb, wsData, 'Muestra Seleccionada');

    const dateStr = new Date().toISOString().replace(/[-:T.]/g, '').slice(0, 14);
    XLSX.writeFile(wb, `Muestra_PDN_${dateStr}.xlsx`);
  };

  const SortableHeader = ({ id, label }: { id: string; label: string }) => (
    <TableCell
      sx={{
        fontWeight: 'bold',
        color: colorTokens.slate600,
        backgroundColor: colorTokens.slate50,
        borderBottom: `2px solid ${colorTokens.slate200}`,
        whiteSpace: 'nowrap',
      }}
      sortDirection={orderBy === id ? order : false}
    >
      <TableSortLabel
        active={orderBy === id}
        direction={orderBy === id ? order : 'asc'}
        onClick={() => handleRequestSort(id)}
      >
        {label}
      </TableSortLabel>
    </TableCell>
  );

  return (
    <div className="flex h-full min-h-0 flex-col animate-[fadeIn_0.5s_ease]">
      <div className="bg-slate-50 border-b border-slate-200 p-4 flex flex-col xl:flex-row gap-4 justify-between items-center rounded-t-xl">
        <div className="flex gap-6 items-center w-full xl:w-auto justify-between xl:justify-start">
          <div className="flex gap-6 items-center">
            <div>
              <span className="block text-[10px] uppercase text-gray-500 font-bold tracking-wider">Muestra</span>
              <span className="text-xl font-bold text-pdn-bluePrimary">{sample.length}</span>
            </div>
            <div className="h-8 w-px bg-gray-300" />
            <div>
              <span className="block text-[10px] uppercase text-gray-500 font-bold tracking-wider">% Total</span>
              <span className="text-xl font-bold text-pdn-bluePrimary">{percentage}%</span>
            </div>
            {auditData && (
              <>
                <div className="h-8 w-px bg-gray-300 hidden sm:block" />
                <div className="hidden sm:block">
                  <div className="flex items-center gap-1">
                    <VerifiedUser color="success" sx={{ fontSize: 16 }} />
                    <span className="text-[10px] uppercase text-gray-500 font-bold tracking-wider">Verificado</span>
                  </div>
                  <span className="text-xs font-mono text-gray-600 truncate max-w-[100px] block" title={auditData.resultHash}>
                    {auditData.resultHash.substring(0, 12)}...
                  </span>
                </div>
              </>
            )}
          </div>
        </div>

        <div className="flex-1 w-full xl:max-w-md px-0 xl:px-4">
          <TextField
            fullWidth
            size="small"
            placeholder="Buscar en columnas configuradas..."
            value={searchText}
            onChange={(e) => {
              setSearchText(e.target.value);
              setPage(0);
            }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <Search sx={{ color: colorTokens.slate400 }} />
                </InputAdornment>
              ),
              sx: {
                backgroundColor: 'white',
                borderRadius: 2,
                '& fieldset': { borderColor: colorTokens.slate200 },
                '&:hover fieldset': { borderColor: colorTokens.pdnBluePrimary },
              },
            }}
          />
        </div>

        <div className="w-full xl:w-auto flex justify-end">
          <Button
            variant="outlined"
            startIcon={<Download />}
            onClick={handleExport}
            sx={{
              color: colorTokens.pdnBluePrimary,
              borderColor: colorTokens.pdnBluePrimary,
              textTransform: 'none',
              fontWeight: 600,
              boxShadow: 'none',
              whiteSpace: 'nowrap',
              '&:hover': {
                backgroundColor: colorTokens.pdnBluePrimary,
                color: 'white !important',
                boxShadow: 'none',
              },
            }}
          >
            Descargar Excel
          </Button>
        </div>
      </div>

      <Paper
        elevation={0}
        sx={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          border: `1px solid ${colorTokens.slate200}`,
          borderTop: 'none',
          borderBottomLeftRadius: 12,
          borderBottomRightRadius: 12,
          overflow: 'hidden',
        }}
      >
        <TableContainer sx={{ flex: 1, minHeight: 0 }} className={heightClass}>
          <Table stickyHeader>
            <TableHead>
              <TableRow>
                {columns.map((column) => (
                  <SortableHeader key={column.key} id={column.key} label={column.label} />
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {paginatedRows.length > 0 ? (
                paginatedRows.map((row) => (
                  <TableRow key={`${row.recordId}-${row.originalIndex}`} hover>
                    {columns.map((column, index) => (
                      <TableCell
                        key={`${row.originalIndex}-${column.key}`}
                        className={index === 0 ? 'font-mono text-xs text-gray-600' : 'text-sm text-gray-700'}
                      >
                        {row.values[column.key] || '-'}
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={Math.max(columns.length, 1)} align="center" sx={{ py: 6 }}>
                    <div className="text-gray-400 flex flex-col items-center">
                      <Search sx={{ fontSize: 40, mb: 1, opacity: 0.5 }} />
                      <span className="text-sm">No se encontraron resultados para tu busqueda.</span>
                    </div>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
        <TablePagination
          rowsPerPageOptions={[10, 25, 50, 100]}
          component="div"
          count={visibleRows.length}
          rowsPerPage={rowsPerPage}
          page={page}
          onPageChange={(_event, newPage) => setPage(newPage)}
          onRowsPerPageChange={(event: React.ChangeEvent<HTMLInputElement>) => {
            setRowsPerPage(+event.target.value);
            setPage(0);
          }}
          labelRowsPerPage="Filas"
          sx={{ borderTop: `1px solid ${colorTokens.slate200}` }}
        />
      </Paper>
    </div>
  );
};
