import React, { useState } from 'react';
import { 
  Paper, TextField, Button, InputAdornment, IconButton, 
  CircularProgress, Typography, Fade, Link
} from '@mui/material';
import { 
  Visibility, VisibilityOff, Email, Lock, 
  Login as LoginIcon
} from '@mui/icons-material';
import { PasswordDialog } from './PasswordDialog';
import { colorTokens } from '../src/theme/colors';
import { LEGAL_LINKS } from '../src/legalLinks';

interface LoginProps {
  onLogin: (
    email: string,
    pass: string,
  ) => Promise<{ success: boolean; msg?: string; retryable?: boolean }>;
  onResetRequest: (email: string) => Promise<void>;
}

export const Login: React.FC<LoginProps> = ({ onLogin, onResetRequest }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [connectionUnavailable, setConnectionUnavailable] = useState(false);

  // Modal States
  const [resetOpen, setResetOpen] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setConnectionUnavailable(false);
    setLoading(true);

    try {
        const result = await onLogin(email, password);
        if (!result.success) {
            setError(result.msg || 'Credenciales inválidas');
            setConnectionUnavailable(Boolean(result.retryable));
        }
    } catch {
        setError('El servicio no esta disponible. Espera unos segundos e intenta nuevamente.');
        setConnectionUnavailable(true);
    } finally {
        setLoading(false);
    }
  };

  return (
    <div
      className="login-screen min-h-screen flex flex-col items-center justify-center gap-8 p-4 py-8"
      style={{
        backgroundImage: `url('${import.meta.env.BASE_URL}images/fondoaleacent.png')`,
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
        backgroundSize: 'cover',
        backgroundAttachment: 'fixed',
      }}
    >
      <Fade in={true} timeout={800} children={
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
          {/* Decorative Header */}
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
                <div className="inline-block bg-white px-3 text-[#56565A]/90 text-lg font-bold tracking-tight">
                  Inicio de sesión
                </div>
             </div>
          </div>

          {/* Form Section */}
          <div className="px-8 pt-2 pb-4 bg-white">
            <form onSubmit={handleLogin} className="flex flex-col gap-6">
              <TextField
                label="Correo Institucional"
                variant="outlined"
                fullWidth
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={loading}
                sx={{
                  '& .MuiOutlinedInput-root': {
                    // Diseño anterior: sin fondo personalizado. Para restaurarlo,
                    // sustituir el color activo por backgroundColor: 'transparent'.
                    // backgroundColor: 'transparent',
                    backgroundColor: 'rgba(86, 86, 90, 0.1)',
                  },
                }}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <Email sx={{ color: colorTokens.slate400 }} />
                    </InputAdornment>
                  ),
                }}
              />

              <TextField
                label="Contraseña"
                type={showPassword ? 'text' : 'password'}
                variant="outlined"
                fullWidth
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading}
                sx={{
                  '& .MuiOutlinedInput-root': {
                    // Diseño anterior: sin fondo personalizado. Para restaurarlo,
                    // sustituir el color activo por backgroundColor: 'transparent'.
                    // backgroundColor: 'transparent',
                    backgroundColor: 'rgba(86, 86, 90, 0.1)',
                  },
                }}
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
                endIcon={!loading && <LoginIcon />}
                // Respaldo del diseño anterior: restaurar este sx y retirar el activo.
                // sx={{
                //   bgcolor: colorTokens.pdnCoral,
                //   py: 1.5,
                //   fontSize: '1rem',
                //   fontWeight: 'bold',
                //   boxShadow: `0 4px 12px ${colorTokens.coral30}`,
                //   '&:hover': { bgcolor: colorTokens.pdnCoralDark }
                // }}
                sx={{ 
                  // Respaldo gris: bgcolor: '#56565A'; sombra rgba(86, 86, 90, 0.3); hover rgba(86, 86, 90, 0.9).
                            color: '#56565A',
                            bgcolor: 'rgba(225, 39, 38, 0.2)',
                  py: 1.5,
                  fontSize: '1rem',
                  fontWeight: 'bold',
                  boxShadow: '0 4px 12px rgba(225, 39, 38, 0.2)',
                  '&:hover': { bgcolor: 'rgba(225, 39, 38, 0.4)' }
                }}
              >
                {loading ? (
                  <CircularProgress size={24} color="inherit" />
                ) : connectionUnavailable ? (
                  'Reintentar conexión'
                ) : (
                  'Iniciar Sesión'
                )}
              </Button>

              <div className="flex flex-col gap-2 items-center mt-2">
                 <Link 
                    component="button" 
                    type="button"
                    variant="caption"
                    onClick={() => setResetOpen(true)}
                    sx={{ color: colorTokens.slate500, textDecoration: 'none', '&:hover': { color: '#56565A' /* Anterior: colorTokens.pdnBluePrimary */, textDecoration: 'underline' } }}
                 >
                   ¿Olvidaste tu contraseña?
                 </Link>
              </div>
            </form>

          </div>
          
        </Paper>
      } />

      <div className="mx-auto w-full max-w-[1200px]">
        {/* Fondos anteriores: bg-white/10 (original) y bg-[#A3B2C9] (sólido).
            Para restaurarlos, sustituir bg-[#A3B2C9]/50 por la clase deseada. */}
        <div className="rounded-2xl border border-white/20 bg-[#ffffff]/90 p-6 text-white shadow-lg backdrop-blur-md md:p-8">
          {/* Color anterior: style={{ color: 'rgba(86, 86, 90, 0.8)' }}.
              Diseño original: blanco heredado con opacity-90 en ambos párrafos. */}
          {/* Respaldo del texto blanco anterior: className="text-white". */}
          <div className="text-[#56565A]/90">
            <img
              src={`${import.meta.env.BASE_URL}images/LogoSESNA.png`}
              alt="Secretaría Ejecutiva del Sistema Nacional Anticorrupción"
              className="mx-auto mb-5 h-auto w-40 max-w-full object-contain md:w-48"
            />
            <h3 className="mb-2 text-lg font-bold tracking-tight">¿Qué es Alea?</h3>
            <p className="text-justify text-sm font-light leading-relaxed md:text-base">
              Es una herramienta desarrollada por la Secretaría Ejecutiva del Sistema Nacional Anticorrupción para apoyar a las Secretarías y Órganos Internos de Control de los distintos órdenes de gobierno en la selección aleatoria de personas servidoras públicas para su verificación patrimonial.
            </p>
            <p className="mt-4 text-justify text-sm font-light leading-relaxed md:text-base">
              Su objetivo es facilitar una selección imparcial, trazable y verificable, reduciendo la discrecionalidad en la determinación de las personas que serán revisadas.
            </p>
          </div>
          <div className="mt-6 text-center">
            <hr className="mb-4 border-0 border-t border-[#56565A]/30" />
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
        </div>
      </div>

      <PasswordDialog 
        open={resetOpen}
        onClose={() => setResetOpen(false)}
        mode="reset"
        onSubmit={async ({ email }) => {
            await onResetRequest(email);
        }}
      />
    </div>
  );
};
