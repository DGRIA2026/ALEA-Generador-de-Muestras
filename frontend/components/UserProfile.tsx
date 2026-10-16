import React, { useState } from 'react';
import {
  Paper, Avatar, Typography, Button, Divider,
  TextField, Chip
} from '@mui/material';
import {
  Business, Email, Badge, Security,
  ArrowBack, Abc
} from '@mui/icons-material';
import { PasswordDialog } from './PasswordDialog';
import type { User } from '../types';
import { colorTokens } from '../src/theme/colors';

interface UserProfileProps {
  user: User;
  samplingCount: number | null;
  onBack: () => void;
  onChangePassword: (
    currentPassword: string,
    newPassword: string,
  ) => Promise<void>;
}

const formatLastLogin = (value?: string) => {
  if (!value) return 'Sin registro';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Sin registro';

  return date.toLocaleString('es-MX', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
};

export const UserProfile: React.FC<UserProfileProps> = ({
  user,
  samplingCount,
  onBack,
  onChangePassword,
}) => {
  const [openPassDialog, setOpenPassDialog] = useState(false);

  return (
    <div className="max-w-4xl mx-auto animate-[fadeIn_0.5s_ease]">
      <Button
        startIcon={<ArrowBack />}
        onClick={onBack}
        sx={{ mb: 3, color: 'white', '&:hover': { bgcolor: colorTokens.white10 } }}
      >
        Volver al Sistema
      </Button>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-1">
          <Paper elevation={3} sx={{ p: 4, borderRadius: 4, textAlign: 'center', height: '100%' }}>
            <div className="relative inline-block mb-4">
              <span
                aria-hidden="true"
                className="pointer-events-none absolute right-0 top-0 h-12 w-12 rounded-tr-md bg-[#E12726]"
              />
              <Avatar
                sx={{
                  position: 'relative',
                  width: 120,
                  height: 120,
                  bgcolor: '#56565A',
                  fontSize: '3rem',
                  fontWeight: 'bold',
                  boxShadow: '0 0 0 3px #ffffff, 0 8px 24px rgba(86, 86, 90, 0.3)',
                  mx: 'auto'
                }}
              >
                {(user.institutionAcronym || user.fullName).substring(0, 2).toUpperCase()
                }
              </Avatar>
              <div className="absolute bottom-0 right-0 bg-green-500 w-4 h-4 rounded-full border-2 border-white" title="Activo"></div>
            </div>

            <Typography variant="h6" fontWeight="bold" gutterBottom>
              {user.fullName}
            </Typography>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              {user.role === 'admin' ? 'Administrador Global' : 'Auditor Certificado'}
            </Typography>

            <Chip
              icon={<Security sx={{ fontSize: 16 }} />}
              label={`Rol: ${user.role.toUpperCase()}`}
              color={user.role === 'admin' ? 'secondary' : 'primary'}
              size="small"
              sx={{ mt: 1 }}
            />

            <Divider sx={{ my: 3 }} />

            <div className="text-left space-y-3">
              <div className="text-xs text-gray-500 uppercase font-bold tracking-wide">Estadísticas</div>
              <div className="flex justify-between items-center text-sm">
                <span>Muestreos del archivo actual</span>
                <span className="font-bold text-gray-800">{samplingCount ?? '—'}</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span>Último acceso</span>
                <span className="font-bold text-gray-800 text-right">{formatLastLogin(user.lastLogin)}</span>
              </div>
            </div>
          </Paper>
        </div>

        <div className="md:col-span-2">
          <Paper elevation={3} sx={{ p: 4, borderRadius: 4 }}>
            <div className="flex justify-between items-center mb-6">
              <Typography variant="h6" fontWeight="bold" sx={{ color: '#56565A' /* Anterior: colorTokens.pdnBluePrimary */ }}>
                Información Institucional
              </Typography>
              <Chip label="Solo lectura" size="small" variant="outlined" sx={{ color: '#56565A' /* Anterior: colorTokens.pdnBluePrimary */, borderColor: colorTokens.pdnBluePrimary }} />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <div className="flex items-center gap-2 mb-2 text-gray-500">
                  <Badge sx={{ fontSize: 20 }} />
                  <span className="text-xs font-bold uppercase">Nombre Completo</span>
                </div>
                <TextField
                  fullWidth
                  variant="filled"
                  value={user.fullName}
                  InputProps={{ readOnly: true, disableUnderline: true, sx: { borderRadius: 2 } }}
                />
              </div>

              <div>
                <div className="flex items-center gap-2 mb-2 text-gray-500">
                  <Email sx={{ fontSize: 20 }} />
                  <span className="text-xs font-bold uppercase">Correo Institucional</span>
                </div>
                <TextField
                  fullWidth
                  variant="filled"
                  value={user.email}
                  InputProps={{ readOnly: true, disableUnderline: true, sx: { borderRadius: 2 } }}
                />
              </div>

              <div className="sm:col-span-2">
                <div className="flex items-center gap-2 mb-2 text-gray-500">
                  <Business sx={{ fontSize: 20 }} />
                  <span className="text-xs font-bold uppercase">Nombre de Institución</span>
                </div>
                <TextField
                  fullWidth
                  variant="filled"
                  value={user.institution}
                  InputProps={{ readOnly: true, disableUnderline: true, sx: { borderRadius: 2 } }}
                />
              </div>

              <div>
                <div className="flex items-center gap-2 mb-2 text-gray-500">
                  <Abc sx={{ fontSize: 20 }} />
                  <span className="text-xs font-bold uppercase">Siglas</span>
                </div>
                <TextField
                  fullWidth
                  variant="filled"
                  value={user.institutionAcronym}
                  InputProps={{ readOnly: true, disableUnderline: true, sx: { borderRadius: 2 } }}
                />
              </div>

              <div>
                <div className="flex items-center gap-2 mb-2 text-gray-500">
                  <Badge sx={{ fontSize: 20 }} />
                  <span className="text-xs font-bold uppercase">Cargo / Puesto</span>
                </div>
                <TextField
                  fullWidth
                  variant="filled"
                  value={user.position}
                  InputProps={{ readOnly: true, disableUnderline: true, sx: { borderRadius: 2 } }}
                />
              </div>

              <div className="sm:col-span-2">
                <div className="flex items-center gap-2 mb-2 text-gray-500">
                  <Security sx={{ fontSize: 20 }} />
                  <span className="text-xs font-bold uppercase">Rol en Plataforma</span>
                </div>
                <TextField
                  fullWidth
                  variant="filled"
                  value={user.role === 'admin' ? 'Administrador' : 'Auditor'}
                  InputProps={{ readOnly: true, disableUnderline: true, sx: { borderRadius: 2 } }}
                />
              </div>
            </div>

            <Divider sx={{ my: 4 }} />

            <Typography variant="h6" fontWeight="bold" sx={{ color: '#56565A' /* Anterior: colorTokens.pdnBluePrimary */, mb: 3 }}>
              Seguridad
            </Typography>

            <div className="flex flex-col sm:flex-row gap-4">
              <Button
                variant="outlined"
                color="primary"
                onClick={() => setOpenPassDialog(true)}
                sx={{ color: '#56565A' /* Anterior: colorTokens.pdnBluePrimary */, borderColor: colorTokens.pdnBluePrimary }}
              >
                Cambiar Contraseña
              </Button>
            </div>
          </Paper>
        </div>
      </div>

      <PasswordDialog
        open={openPassDialog}
        onClose={() => setOpenPassDialog(false)}
        mode="change"
        onSubmit={async (data) => {
          await onChangePassword(data.currentPassword, data.newPassword);
        }}
      />
    </div>
  );
};
