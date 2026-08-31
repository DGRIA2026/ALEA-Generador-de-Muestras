import React from 'react';
import { Typography } from '@mui/material';
import { Code, VerifiedUser } from '@mui/icons-material';
import { colorTokens } from '../src/theme/colors';

export const Footer: React.FC = () => {
  return (
    <footer className="bg-pdn-blueMedium text-white py-8 mt-auto border-t border-white/10">
      <div className="container mx-auto px-6">
        <div className="flex flex-col md:flex-row justify-between items-center gap-6">
          
          {/* Logo Area */}
          <div className="flex items-center gap-3">
            <div className="bg-white/10 p-2 rounded-lg">
                {/* Placeholder for Custom Logo - using Icon for now */}
                <VerifiedUser className="text-white" />
            </div>
            <div>
              <Typography variant="subtitle2" sx={{ fontWeight: 'bold', letterSpacing: '0.5px' }}>
                PLATAFORMA DIGITAL NACIONAL
              </Typography>
              <Typography variant="subtitle2" sx={{ fontWeight: 'bold', letterSpacing: '0.5px' }}>
                DIRECCIÓN GENERAL DE RIESGOS E INTELIGENCIA ANTICORRUPCIÓN
              </Typography>
            </div>
          </div>

          {/* Developer Credit */}
          <div className="text-center md:text-right">
            <Typography variant="caption" display="block" sx={{ opacity: 0.7, mb: 0.5 }}>
              Desarrollado por el equipo de tecnología de la SESNA
            </Typography>
            <div className="flex items-center justify-center md:justify-end gap-1.5 text-xs font-mono text-blue-200">
               <Code sx={{ fontSize: 14 }} />
               <span>v1.0.0 (Stable)</span>
            </div>
          </div>
        </div>
        
        <div className="border-t border-white/10 mt-6 pt-6 text-center">
            <Typography variant="caption" sx={{ color: colorTokens.slate400 }}>
                &copy; {new Date().getFullYear()} Secretaría Ejecutiva del Sistema Nacional Anticorrupción. Todos los derechos reservados.
            </Typography>
        </div>
      </div>
    </footer>
  );
};
