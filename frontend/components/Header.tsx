import React, { useState } from 'react';
import {
  BarChart,
  Business,
  HelpOutline,
  InfoOutlined,
  KeyboardArrowDown,
  Logout,
  Person,
  SupportAgent,
} from '@mui/icons-material';
import {
  Avatar,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Divider,
  Fade,
  ListItemIcon,
  Menu,
  MenuItem,
  Tooltip,
} from '@mui/material';
import type { SupportContact, User } from '../types';
import { colorTokens } from '../src/theme/colors';

interface HeaderProps {
  user: User;
  usageCount: number | null;
  supportContact: SupportContact;
  onLogout: () => void;
  onNavigateProfile: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  user,
  usageCount,
  supportContact,
  onLogout,
  onNavigateProfile,
}) => {
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [helpOpen, setHelpOpen] = useState(false);
  const open = Boolean(anchorEl);

  const handleClick = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleProfileClick = () => {
    handleClose();
    onNavigateProfile();
  };

  const handleLogoutClick = () => {
    handleClose();
    onLogout();
  };

  const handleHelpClick = () => {
    handleClose();
    setHelpOpen(true);
  };

  return (
    <>
      <header className="mb-6 animate-[fadeInDown_0.6s_ease]">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="flex-1 cursor-pointer" onClick={() => window.location.reload()}>
            <img
              src={`${import.meta.env.BASE_URL}images/AleaSF.png`}
              alt="ALEA - Generador de Muestras"
               className="mb-2 h-[166px] w-auto object-contain md:h-[174px]"
            />
            {/* Color anterior: text-white. Para restaurarlo, sustituir text-[#56565A] por text-white. */}
            <h1 className="font-display text-lg md:text-2xl font-bold text-[#56565A] tracking-tight drop-shadow-md">
            Selección de personas sujetas a verificación patrimonial
            </h1>
          </div>

          <div className="flex flex-wrap items-stretch gap-3 w-full md:w-auto">
            <div
              onClick={handleClick}
              className="flex items-center gap-3 bg-white/10 hover:bg-white/20 backdrop-blur-md border border-white/20 rounded-xl px-3 py-2 cursor-pointer transition-all duration-200 flex-1 md:flex-initial min-w-[200px]"
            >
              <div className="relative h-10 w-10 shrink-0">
                <span
                  aria-hidden="true"
                  className="pointer-events-none absolute right-0 top-0 h-4 w-4 rounded-tr-sm bg-[#E12726]"
                />
                {/* Fondo anterior del avatar: colorTokens.orange400. */}
                <Avatar sx={{ position: 'relative', bgcolor: '#56565A', width: 40, height: 40, fontSize: '1rem', fontWeight: 'bold', boxShadow: '0 0 0 2px #ffffff' }}>
                  {user.institutionAcronym.substring(0, 2)}
                </Avatar>
              </div>

              <div className="flex flex-col min-w-0">
                {/* Colores anteriores: nombre text-white; dependencia text-white/80. */}
                <span className="text-sm font-bold text-[#56565A] leading-tight truncate">{user.fullName}</span>
                <div className="flex items-center gap-1 text-[#56565A]">
                  <Business sx={{ fontSize: 12 }} />
                  <span className="text-xs uppercase tracking-wide font-medium">{user.institutionAcronym}</span>
                </div>
              </div>

              {/* Color anterior de la flecha: text-white/70. */}
              <KeyboardArrowDown className={`text-[#56565A] transition-transform ${open ? 'rotate-180' : ''}`} />
            </div>

            <Tooltip
              title={(
                <div className="p-1">
                  <div className="font-bold text-xs mb-1 uppercase tracking-wide text-blue-100">Integridad del Proceso</div>
                  <p className="text-xs leading-relaxed">
      El límite de intentos por archivo garantiza la imparcialidad de la insaculación. 
      Esto evita la selección discrecional de resultados y asegura el cumplimiento de los principios de auditoría y transparencia.
                  </p>
                </div>
              )}
              arrow
              placement="bottom"
              TransitionComponent={Fade}
            >
              <div
                // Estado anterior al llegar a 3: borde border-pdn-coralLight/70 y fondo colorTokens.pdnCoralDark.
                className={`flex flex-col justify-center items-center border rounded-xl px-4 py-2 cursor-help transition-all ${(usageCount ?? 0) >= 3 ? 'bg-[#56565A] border-[#56565A] text-white' : 'bg-white/10 hover:bg-white/20 border-white/20 text-[#56565A]'}`}
              >
                {/* Colores anteriores: etiqueta text-white/70; contador e icono text-white. */}
                <span className="text-[10px] uppercase tracking-widest font-bold flex items-center gap-1">
                  Muestreos <InfoOutlined sx={{ fontSize: 12 }} />
                </span>
                <div className="flex items-center gap-1 font-bold">
                  <BarChart fontSize="small" />
                  <span>{usageCount ?? '—'}/3</span>
                </div>
              </div>
            </Tooltip>
          </div>
        </div>

        <Menu
          anchorEl={anchorEl}
          open={open}
          onClose={handleClose}
          onClick={handleClose}
          PaperProps={{
            elevation: 0,
            sx: {
              overflow: 'visible',
              filter: `drop-shadow(0px 2px 8px ${colorTokens.black32})`,
              mt: 1.5,
              borderRadius: 3,
              minWidth: 220,
              '&:before': {
                content: '""',
                display: 'block',
                position: 'absolute',
                top: 0,
                right: 14,
                width: 10,
                height: 10,
                bgcolor: 'background.paper',
                transform: 'translateY(-50%) rotate(45deg)',
                zIndex: 0,
              },
            },
          }}
          transformOrigin={{ horizontal: 'right', vertical: 'top' }}
          anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
        >
          <div className="px-4 py-2">
            <p className="text-sm font-bold text-gray-800">{user.fullName}</p>
            <p className="text-xs text-gray-500">{user.email}</p>
          </div>
          <Divider />
          <MenuItem onClick={handleProfileClick} sx={{ mt: 1 }}>
            <ListItemIcon>
              <Person fontSize="small" />
            </ListItemIcon>
            Mi Perfil
          </MenuItem>
          <MenuItem onClick={handleHelpClick}>
            <ListItemIcon>
              <HelpOutline fontSize="small" />
            </ListItemIcon>
            Ayuda y contacto
          </MenuItem>
          <Divider />
          <MenuItem onClick={handleLogoutClick} sx={{ color: colorTokens.red500 }}>
            <ListItemIcon>
              <Logout fontSize="small" sx={{ color: colorTokens.red500 }} />
            </ListItemIcon>
            Cerrar sesión
          </MenuItem>
        </Menu>
      </header>

      <Dialog
        open={helpOpen}
        onClose={() => setHelpOpen(false)}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: 3,
            border: `1px solid ${colorTokens.slate200}`,
            background: `linear-gradient(145deg, ${colorTokens.white} 0%, ${colorTokens.slate50} 100%)`,
          },
        }}
      >
        <DialogTitle sx={{ color: '#56565A' /* Anterior: colorTokens.pdnBluePrimary */, fontWeight: 800, pb: 1 }}>
          Ayuda y contacto
        </DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ color: colorTokens.slate600, mb: 1.5 }}>
            Si necesitas reactivar carga de archivo o asistencia del sistema, contacta al administrador.
          </DialogContentText>
          <div className="rounded-xl border p-4" style={{ borderColor: colorTokens.slate200 }}>
            <div className="mb-2 flex items-center gap-2 text-sm font-bold" style={{ color: '#56565A' /* Anterior: colorTokens.pdnBluePrimary */ }}>
              <SupportAgent fontSize="small" />
              Soporte institucional
            </div>
            {/* Telefono oculto; conservar para poder mostrarlo nuevamente.
            <p className="text-sm text-gray-700"><strong>Telefono:</strong> {supportContact.phone}</p>
            */}
            <p className="text-sm text-gray-700"><strong>Correo:</strong> {supportContact.email}</p>
            <p className="text-sm text-gray-700"><strong>Direccion:</strong> {supportContact.address}</p>
            <p className="text-sm text-gray-700"><strong>Horario:</strong> {supportContact.hours}</p>
            <p className="mt-2 text-xs text-gray-600">{supportContact.notes}</p>
          </div>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button
            onClick={() => setHelpOpen(false)}
            variant="contained"
            sx={{
              // Diseño anterior:
              // bgcolor: colorTokens.pdnBluePrimary,
              // '&:hover': { bgcolor: colorTokens.pdnBlueMedium },
              // Sombra anterior: la predeterminada de MUI.
              color: '#56565A',
              bgcolor: 'rgba(225, 39, 38, 0.2)',
              boxShadow: '0 4px 12px rgba(225, 39, 38, 0.2)',
              '&:hover': { bgcolor: 'rgba(225, 39, 38, 0.4)' },
            }}
          >
            Entendido
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};
