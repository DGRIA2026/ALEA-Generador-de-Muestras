import React, { useState } from 'react';
import {
  Paper, TextField, Button, InputAdornment, IconButton,
  CircularProgress, Typography, Fade, Box, Link
} from '@mui/material';
import {
  Visibility, VisibilityOff, Lock,
  CheckCircle, ArrowForward
} from '@mui/icons-material';
import { colorTokens } from '../src/theme/colors';
import { LEGAL_LINKS } from '../src/legalLinks';

const screenBackground = {
  backgroundImage: `url('${import.meta.env.BASE_URL}images/fondoaleacent.png')`,
  backgroundPosition: 'center',
  backgroundRepeat: 'no-repeat',
  backgroundSize: 'cover',
  backgroundAttachment: 'fixed',
};

const buttonStyles = {
  color: '#56565A',
  bgcolor: 'rgba(225, 39, 38, 0.2)',
  py: 1.5,
  fontSize: '1rem',
  fontWeight: 'bold',
  boxShadow: '0 4px 12px rgba(225, 39, 38, 0.2)',
  '&:hover': { bgcolor: 'rgba(225, 39, 38, 0.4)' },
};

const inputStyles = {
  '& .MuiOutlinedInput-root': {
    backgroundColor: 'rgba(86, 86, 90, 0.1)',
    '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: '#56565A' },
  },
  '& .MuiInputLabel-root.Mui-focused': { color: '#56565A' },
};

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
      <div className="login-screen min-h-screen flex items-center justify-center p-4 py-8" style={screenBackground}>
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
              sx={buttonStyles}
            >
              Ir al Inicio de Sesión
            </Button>
          </Paper>
        </Fade>
      </div>
    );
  }

  const pageTitle = mode === 'reset' ? 'Restablecer Contraseña' : 'Activación de Cuenta';

  return (
    <div className="login-screen min-h-screen flex items-center justify-center p-4 py-8" style={screenBackground}>
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
          <div className="bg-white px-8 pt-8 pb-2 text-center relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-full opacity-10 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-white via-transparent to-transparent scale-150"></div>

            <div className="relative z-10 flex flex-col items-center">
              <div className="mb-1 h-[190px] overflow-hidden bg-white/20 backdrop-blur-sm">
                <img
                  src={`${import.meta.env.BASE_URL}images/Alea2SF.png`}
                  alt="ALEA"
                  className="h-full w-auto"
                />
              </div>
              <Typography component="h1" className="inline-block bg-white px-3 text-lg font-bold tracking-tight" sx={{ color: 'rgba(86, 86, 90, 0.9)', fontSize: '1.125rem', fontWeight: 700 }}>
                {pageTitle}
              </Typography>
              {mode === 'reset' && (
                <Typography variant="caption" sx={{ color: '#56565A', mt: 0.5 }}>
                  Recuperación de Acceso
                </Typography>
              )}
            </div>
          </div>

          {/* Formulario de Contraseña Directo */}
          <div className="px-8 pt-2 pb-4 bg-white flex flex-col gap-5">
            <Box sx={{ bgcolor: 'rgba(86, 86, 90, 0.1)', border: '1px solid rgba(86, 86, 90, 0.2)', p: 2, borderRadius: 2 }}>
              <Typography variant="body2" sx={{ fontSize: '0.85rem', color: '#56565A' }}>
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
                sx={inputStyles}
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
                sx={inputStyles}
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
                sx={buttonStyles}
              >
                {loading ? <CircularProgress size={24} color="inherit" /> : (mode === 'reset' ? 'RESTABLECER MI CONTRASEÑA' : 'ACTIVAR MI CUENTA')}
              </Button>
            </form>
          </div>

          {/* Pie de Página */}
          <div className="bg-gray-50 p-4 text-center border-t border-gray-100">
            <Link
              href={LEGAL_LINKS.avisoPrivacidad}
              target="_blank"
              rel="noopener noreferrer"
              variant="caption"
              display="block"
              sx={{ color: colorTokens.slate500, mb: 1 }}
            >
              Aviso de privacidad
            </Link>
            <Typography variant="caption" sx={{ color: colorTokens.slate500 }}>
              © 2026 Secretaría Ejecutiva del Sistema Nacional Anticorrupción
            </Typography>
          </div>
        </Paper>
      </Fade>
    </div>
  );
};
