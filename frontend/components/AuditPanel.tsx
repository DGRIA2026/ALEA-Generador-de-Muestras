import React, { useState } from 'react';
import type { SamplingHistoryItem } from '../types';
import { 
  ContentCopy, Lock, Fingerprint, History, 
  InfoOutlined, CalendarToday, Groups, FormatListNumbered
} from '@mui/icons-material';
import { Tooltip, IconButton, Zoom } from '@mui/material';
import { colorTokens } from '../src/theme/colors';

interface AuditPanelProps {
  data: SamplingHistoryItem;
  totalRecords: number;
}

export const AuditPanel: React.FC<AuditPanelProps> = ({ data, totalRecords }) => {
  const [copied, setCopied] = useState<string | null>(null);

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopied(label);
    setTimeout(() => setCopied(null), 2000);
  };

  // Format date for display
  const dateObj = new Date(data.timestamp);
  const dateStr = dateObj.toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' });
  const timeStr = dateObj.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' });
  const displayDate = `${dateStr}, ${timeStr}`;

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden animate-[fadeIn_0.5s_ease]">
        <div className="bg-gray-50 px-4 py-3 border-b border-gray-200 flex items-center gap-2">
            <Lock sx={{ color: colorTokens.pdnBluePrimary }} className="text-sm" />
            <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wide">
                Datos de Auditoría
            </h3>
        </div>

        <div className="p-4 space-y-4">
            
            {/* Detalles: Date (Full Width) + Total/Sample (Split) */}
            <div className="grid grid-cols-2 gap-3">
                {/* Date */}
                <div className="col-span-2">
                    <div className="flex items-center gap-1.5 mb-1.5">
                        <CalendarToday sx={{ fontSize: 16 }} className="text-gray-400" />
                        <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Fecha de Ejecución</span>
                    </div>
                    <div className="bg-slate-50 border border-slate-200 rounded px-2 py-2 text-xs font-medium text-gray-700 font-mono text-center">
                        {displayDate}
                    </div>
                </div>
                
                {/* Total */}
                <div>
                    <div className="flex items-center gap-1.5 mb-1.5">
                        <FormatListNumbered sx={{ fontSize: 16 }} className="text-gray-400" />
                        <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Total</span>
                    </div>
                    <div className="bg-slate-50 border border-slate-200 rounded px-2 py-2 text-xs font-medium text-gray-700 font-mono text-center">
                        {totalRecords}
                    </div>
                </div>

                {/* Sample */}
                <div>
                    <div className="flex items-center gap-1.5 mb-1.5">
                        <Groups sx={{ fontSize: 16 }} className="text-gray-400" />
                        <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Muestra</span>
                    </div>
                    <div className="bg-slate-50 border border-slate-200 rounded px-2 py-2 text-xs font-medium text-gray-700 font-mono text-center">
                        {data.sampleSize}
                    </div>
                </div>
            </div>

            {/* Seed */}
            <div>
                <div className="flex items-center gap-2 mb-1.5">
                    <History sx={{ fontSize: 16 }} className="text-gray-400" />
                    <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Semilla (Seed)</span>
                    <Tooltip 
                        title="Es el código único que generó este sorteo. Permite reproducir el proceso exacto en el futuro para demostrar que la selección fue 100% matemática y sin intervención humana." 
                        arrow 
                        placement="right"
                        TransitionComponent={Zoom}
                        children={<InfoOutlined sx={{ fontSize: 14, color: colorTokens.slate400, cursor: 'help' }} />}
                    />
                </div>
                <div className="flex items-center bg-slate-50 border border-slate-200 rounded p-1.5">
                     <code className="text-[10px] break-all flex-1 font-mono leading-tight" style={{ color: colorTokens.pdnBluePrimary }}>{data.seed}</code>
                     <Tooltip 
                        title={copied === 'seed' ? "Copiado!" : "Copiar"} 
                        placement="top"
                        children={
                            <IconButton size="small" onClick={() => copyToClipboard(data.seed, 'seed')} sx={{ padding: 0.5 }}>
                                <ContentCopy sx={{ fontSize: 14 }} />
                            </IconButton>
                        }
                    />
                </div>
            </div>

            {/* Result Hash */}
            <div>
                <div className="flex items-center gap-2 mb-1.5">
                    <Fingerprint sx={{ fontSize: 16 }} className="text-gray-400" />
                    <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Hash Resultado</span>
                    <Tooltip 
                        title="Es un sello de seguridad inviolable de los resultados. Si alguien intentara modificar un solo nombre de la lista final, este código cambiaría totalmente, revelando la alteración." 
                        arrow 
                        placement="right"
                        TransitionComponent={Zoom}
                        children={<InfoOutlined sx={{ fontSize: 14, color: colorTokens.slate400, cursor: 'help' }} />}
                    />
                </div>
                <div className="flex items-center bg-slate-50 border border-slate-200 rounded p-1.5">
                     <code className="text-[10px] text-gray-600 break-all flex-1 font-mono leading-tight">{data.resultHash}</code>
                     <Tooltip 
                        title={copied === 'reshash' ? "Copiado!" : "Copiar"} 
                        placement="top"
                        children={
                            <IconButton size="small" onClick={() => copyToClipboard(data.resultHash, 'reshash')} sx={{ padding: 0.5 }}>
                                <ContentCopy sx={{ fontSize: 14 }} />
                            </IconButton>
                        }
                    />
                </div>
            </div>
            
            <div className="text-[10px] text-gray-400 text-center pt-2 border-t border-gray-100 mt-2">
                Archivo Original: {data.fileHash.substring(0, 16)}...
            </div>
        </div>
    </div>
  );
};
