import React from 'react';
import { Link, Typography } from '@mui/material';
import { Code, VerifiedUser } from '@mui/icons-material';
import { LEGAL_LINKS } from '../src/legalLinks';

export const Footer: React.FC = () => {
  // Fondo anterior: bg-pdn-blueMedium (#613962). Restaurar esa clase si se requiere.
  // Fondo desactivado: bg-[#A3B2C9]/30. Sustituir bg-transparent para restaurarlo.
  return (
    <footer className="bg-transparent text-[#56565A] pb-4 mt-auto">
      <hr className="m-0 mb-4 border-0 border-t border-[#56565A]/30" />
      <div className="container mx-auto px-6">
        <div className="grid grid-cols-1 items-center gap-4 lg:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)]">
          
          {/* Logo Area */}
          <div className="flex items-center justify-center gap-3 lg:justify-start">
            <div className="bg-white/10 p-2 rounded-lg">
                {/* Placeholder for Custom Logo - using Icon for now */}
                <VerifiedUser className="text-white" />
            </div>
            <div>
              <Typography variant="subtitle2" sx={{ fontWeight: 'bold', letterSpacing: '0.5px' }}>
                Secretaría Ejecutiva del Sistema Nacional Anticorrupción
              </Typography>
            </div>
          </div>

          {/* Developer Credit */}
          <div className="order-3 text-center lg:text-right">
            <Typography variant="caption" display="block" sx={{ mb: 0.5 }}>
              Desarrollado por el equipo de tecnología de la SESNA
            </Typography>
            {/* Color anterior del icono y la versión: text-blue-200. */}
            <div className="flex items-center justify-center lg:justify-end gap-1.5 text-xs font-mono">
               <Code sx={{ fontSize: 14 }} />
               <span>v1.0.0</span>
            </div>
          </div>
        <div className="order-2 text-center">
            <Link
                href={LEGAL_LINKS.avisoPrivacidad}
                target="_blank"
                rel="noopener noreferrer"
                variant="caption"
                display="block"
                // Color anterior: colorTokens.slate400.
                sx={{ color: '#56565A', mb: 0.5 }}
            >
                Aviso de privacidad
            </Link>
            {/* Color anterior: colorTokens.slate400. */}
            <Typography variant="caption" sx={{ color: '#56565A' }}>
                &copy; {new Date().getFullYear()}. Todos los derechos reservados.
            </Typography>
        </div>
        </div>
      </div>
    </footer>
  );
};
