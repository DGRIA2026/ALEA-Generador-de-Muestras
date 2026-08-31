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
  usageCount: number;
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
            <div className="inline-block bg-white/10 backdrop-blur-md border border-white/20 px-3 py-1 rounded-full text-white text-xs font-medium tracking-wider uppercase mb-2">
              {user.institution}
            </div>
            <h1 className="font-display text-3xl md:text-4xl font-bold text-white tracking-tight drop-shadow-md">
              Muestreo Aleatorio Simple
            </h1>
          </div>

          <div className="flex flex-wrap items-stretch gap-3 w-full md:w-auto">
            <div
              onClick={handleClick}
              className="flex items-center gap-3 bg-white/10 hover:bg-white/20 backdrop-blur-md border border-white/20 rounded-xl px-3 py-2 cursor-pointer transition-all duration-200 flex-1 md:flex-initial min-w-[200px]"
            >
              <Avatar sx={{ bgcolor: colorTokens.orange400, width: 40, height: 40, fontSize: '1rem', fontWeight: 'bold' }}>
                {user.institutionAcronym.substring(0, 2)}
              </Avatar>

              <div className="flex flex-col min-w-0">
                <span className="text-sm font-bold text-white leading-tight truncate">{user.fullName}</span>
                <div className="flex items-center gap-1 text-white/80">
                  <Business sx={{ fontSize: 12 }} />
                  <span className="text-xs uppercase tracking-wide font-medium">{user.institutionAcronym}</span>
                </div>
              </div>

              <KeyboardArrowDown className={`text-white/70 transition-transform ${open ? 'rotate-180' : ''}`} />
            </div>

            <Tooltip
              title={(
                <div className="p-1">
                  <div className="font-bold text-xs mb-1 uppercase tracking-wide text-blue-100">Integridad del Proceso</div>
                  <p className="text-xs leading-relaxed">
                    El limite de intentos por archivo garantiza la imparcialidad de la insaculacion.
                    Esto evita la seleccion discrecional de resultados y asegura
                    el cumplimiento de los principios de auditoria y transparencia.
                  </p>
                </div>
              )}
              arrow
              placement="bottom"
              TransitionComponent={Fade}
            >
              <div
                className={`flex flex-col justify-center items-center border rounded-xl px-4 py-2 cursor-help transition-all ${usageCount >= 3 ? 'border-pdn-coralLight/70' : 'bg-white/10 hover:bg-white/20 border-white/20'}`}
                style={usageCount >= 3 ? { backgroundColor: colorTokens.pdnCoralDark } : undefined}
              >
                <span className="text-[10px] text-white/70 uppercase tracking-widest font-bold flex items-center gap-1">
                  Muestreos <InfoOutlined sx={{ fontSize: 12 }} />
                </span>
                <div className="flex items-center gap-1 text-white font-bold">
                  <BarChart fontSize="small" />
                  <span>{usageCount}/3</span>
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
            Ayuda y Contacto
          </MenuItem>
          <Divider />
          <MenuItem onClick={handleLogoutClick} sx={{ color: colorTokens.red500 }}>
            <ListItemIcon>
              <Logout fontSize="small" sx={{ color: colorTokens.red500 }} />
            </ListItemIcon>
            Cerrar Sesion
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
        <DialogTitle sx={{ color: colorTokens.pdnBluePrimary, fontWeight: 800, pb: 1 }}>
          Ayuda y Contacto
        </DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ color: colorTokens.slate600, mb: 1.5 }}>
            Si necesitas reactivar carga de archivo o asistencia del sistema, contacta al administrador.
          </DialogContentText>
          <div className="rounded-xl border p-4" style={{ borderColor: colorTokens.slate200 }}>
            <div className="mb-2 flex items-center gap-2 text-sm font-bold" style={{ color: colorTokens.pdnBluePrimary }}>
              <SupportAgent fontSize="small" />
              Soporte Institucional
            </div>
            <p className="text-sm text-gray-700"><strong>Telefono:</strong> {supportContact.phone}</p>
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
              bgcolor: colorTokens.pdnBluePrimary,
              '&:hover': { bgcolor: colorTokens.pdnBlueMedium },
            }}
          >
            Entendido
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};
