import React, { useState } from 'react';
import { 
  Paper, TextField, Button, InputAdornment, IconButton, 
  CircularProgress, Typography, Fade, Link
} from '@mui/material';
import { 
  Visibility, VisibilityOff, Email, Lock, 
  Login as LoginIcon, VerifiedUser
} from '@mui/icons-material';
import { PasswordDialog } from './PasswordDialog';
import { colorTokens } from '../src/theme/colors';

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
    <div className="min-h-screen flex items-center justify-center p-4">
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
          {/* Decorative Header - Updated to Purple Gradient */}
          <div style={{ background: colorTokens.pdnBrandGradient }} className="p-8 text-center relative overflow-hidden">
             <div className="absolute top-0 left-0 w-full h-full opacity-10 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-white via-transparent to-transparent scale-150"></div>
             
             <div className="relative z-10 flex flex-col items-center">
                <div className="bg-white/20 p-3 rounded-full mb-4 backdrop-blur-sm">
                    <VerifiedUser sx={{ fontSize: 40, color: 'white' }} />
                </div>
                <div className="inline-block bg-white/10 backdrop-blur-md border border-white/20 px-3 py-1 rounded-full text-white text-[10px] font-bold tracking-widest uppercase mb-2">
                  Sistema Nacional Anticorrupción
                </div>
                <Typography variant="h5" component="h1" sx={{ color: 'white', fontWeight: 700, fontFamily: 'Archivo, sans-serif' }}>
                  Acceso Institucional
                </Typography>
             </div>
          </div>

          {/* Form Section */}
          <div className="p-8 pt-8 bg-white">
            <form onSubmit={handleLogin} className="flex flex-col gap-6">
              <TextField
                label="Correo Institucional"
                variant="outlined"
                fullWidth
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={loading}
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
                sx={{ 
                  bgcolor: colorTokens.pdnCoral,
                  py: 1.5,
                  fontSize: '1rem',
                  fontWeight: 'bold',
                  boxShadow: `0 4px 12px ${colorTokens.coral30}`,
                  '&:hover': { bgcolor: colorTokens.pdnCoralDark }
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
                    sx={{ color: colorTokens.slate500, textDecoration: 'none', '&:hover': { color: colorTokens.pdnBluePrimary, textDecoration: 'underline' } }}
                 >
                   ¿Olvidaste tu contraseña?
                 </Link>
              </div>
            </form>

          </div>
          
          <div className="bg-gray-50 p-4 text-center border-t border-gray-100">
             <Typography variant="caption" sx={{ color: colorTokens.slate500 }}>
               Plataforma Digital Nacional &copy; {new Date().getFullYear()}
             </Typography>
          </div>
        </Paper>
      } />

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
