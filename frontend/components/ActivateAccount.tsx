import React, { useState } from 'react';
import {
  Paper, TextField, Button, InputAdornment, IconButton,
  CircularProgress, Typography, Fade, Box
} from '@mui/material';
import {
  Visibility, VisibilityOff, Lock,
  VerifiedUser, CheckCircle, ArrowForward
} from '@mui/icons-material';
import { colorTokens } from '../src/theme/colors';

interface ActivateAccountProps {
  email: string;
  onActivate: (password: string) => Promise<void>;
  onGoToLogin?: () => void;
  mode?: 'activate' | 'reset';
}

export const ActivateAccount: React.FC<ActivateAccountProps> = ({
  email,
  onActivate,
  onGoToLogin,
  mode = 'activate',
}) => {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const passwordByteLength = (value: string) => new TextEncoder().encode(value).length;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (password.length < 8) {
      setError('La contraseña debe tener al menos 8 caracteres.');
      return;
    }

    if (passwordByteLength(password) > 72) {
      setError('La contraseña no puede exceder 72 bytes.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Las contraseñas no coinciden.');
      return;
    }

    setLoading(true);

    try {
      await onActivate(password);
      setSuccess(true);
    } catch {
      setError(mode === 'reset'
        ? 'Error al restablecer la contraseña. El enlace podría haber expirado.'
        : 'Error al activar la cuenta. El enlace podría haber expirado.');
      setLoading(false);
    }
  };

  if (success) {
    const title = mode === 'reset' ? 'Contraseña Restablecida' : 'Cuenta Activada';
    const description = mode === 'reset'
      ? 'Has actualizado tu contraseña exitosamente. Ahora puedes acceder al sistema.'
      : 'Has configurado tu contraseña exitosamente. Ahora puedes acceder al sistema.';

    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Fade in={true}>
          <Paper elevation={24} sx={{ maxWidth: 450, width: '100%', borderRadius: 4, p: 6, textAlign: 'center' }}>
            <div className="mx-auto bg-green-100 w-16 h-16 rounded-full flex items-center justify-center mb-4">
              <CheckCircle sx={{ fontSize: 40, color: colorTokens.green800 }} />
            </div>
            <Typography variant="h5" fontWeight="bold" gutterBottom>{title}</Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 4 }}>{description}</Typography>
            <Button
              variant="contained"
              fullWidth
              onClick={() => {
                if (onGoToLogin) onGoToLogin();
                else window.location.search = '';
              }}
              sx={{ bgcolor: colorTokens.pdnBluePrimary, '&:hover': { bgcolor: colorTokens.pdnBlueMedium } }}
            >
              Ir al Inicio de Sesión
            </Button>
          </Paper>
        </Fade>
      </div>
    );
  }

  const pageTitle = mode === 'reset' ? 'Restablecer Contraseña' : 'Activación de Cuenta';
  const pageSubtitle = mode === 'reset' ? 'Recuperación de Acceso' : 'Sistema Nacional Anticorrupción';

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <Fade in={true} timeout={800}>
        <Paper
          elevation={24}
          sx={{
            maxWidth: 450,
            width: '100%',
            borderRadius: 4,
            overflow: 'hidden',
            position: 'relative'
          }}
        >
          {/* Encabezado */}
          <div style={{ background: colorTokens.pdnBrandGradient }} className="p-8 text-center relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-full opacity-10 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-white via-transparent to-transparent scale-150"></div>

            <div className="relative z-10 flex flex-col items-center">
              <div className="bg-white/20 p-3 rounded-full mb-3 backdrop-blur-sm">
                <VerifiedUser sx={{ fontSize: 32, color: 'white' }} />
              </div>
              <Typography variant="h6" component="h1" sx={{ color: 'white', fontWeight: 700 }}>
                {pageTitle}
              </Typography>
              <Typography variant="caption" sx={{ color: colorTokens.white80, mt: 0.5 }}>
                {pageSubtitle}
              </Typography>
            </div>
          </div>

          {/* Formulario de Contraseña Directo */}
          <div className="p-6 bg-white flex flex-col gap-5">
            <Box sx={{ bgcolor: '#f0f9ff', border: '1px solid #bae6fd', p: 2, borderRadius: 2 }}>
              <Typography variant="body2" sx={{ fontSize: '0.85rem', color: '#0369a1' }}>
                Hola <strong>{email}</strong>,<br />
                {mode === 'reset'
                  ? 'Para recuperar el acceso a la plataforma, por favor define tu nueva contraseña segura.'
                  : 'Para completar tu registro y acceder a la plataforma, por favor define tu contraseña segura.'}
              </Typography>
            </Box>

            <form onSubmit={handleSubmit} className="flex flex-col gap-5">
              <TextField
                label="Nueva Contraseña"
                type={showPassword ? 'text' : 'password'}
                variant="outlined"
                fullWidth
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <Lock sx={{ color: colorTokens.slate400 }} />
                    </InputAdornment>
                  ),
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton
                        onClick={() => setShowPassword(!showPassword)}
                        edge="end"
                      >
                        {showPassword ? <VisibilityOff /> : <Visibility />}
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
              />

              <TextField
                label="Confirmar Contraseña"
                type={showPassword ? 'text' : 'password'}
                variant="outlined"
                fullWidth
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                disabled={loading}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <Lock sx={{ color: colorTokens.slate400 }} />
                    </InputAdornment>
                  ),
                }}
              />

              {error && (
                <div className="text-red-500 text-sm text-center font-medium bg-red-50 p-2 rounded-lg">
                  {error}
                </div>
              )}

              <Button
                type="submit"
                variant="contained"
                size="large"
                disabled={loading}
                endIcon={!loading && <ArrowForward />}
                sx={{
                  bgcolor: colorTokens.pdnCoral,
                  py: 1.5,
                  fontSize: '1rem',
                  fontWeight: 'bold',
                  boxShadow: `0 4px 12px ${colorTokens.coral30}`,
                  '&:hover': { bgcolor: colorTokens.pdnCoralDark }
                }}
              >
                {loading ? <CircularProgress size={24} color="inherit" /> : (mode === 'reset' ? 'RESTABLECER MI CONTRASEÑA' : 'ACTIVAR MI CUENTA')}
              </Button>
            </form>
          </div>

          {/* Pie de Página */}
          <div className="bg-gray-50 p-4 text-center border-t border-gray-100">
            <Typography variant="caption" sx={{ color: colorTokens.slate500 }}>
              Plataforma Digital Nacional &copy; {new Date().getFullYear()}
            </Typography>
          </div>
        </Paper>
      </Fade>
    </div>
  );
};
