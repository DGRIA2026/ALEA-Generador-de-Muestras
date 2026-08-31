import React, { useState } from 'react';
import { 
  Dialog, DialogTitle, DialogContent, DialogActions, 
  TextField, Button, Typography, Alert, CircularProgress 
} from '@mui/material';
import { LockReset, MarkEmailRead, CheckCircle } from '@mui/icons-material';
import { colorTokens } from '../src/theme/colors';

type Mode = 'change' | 'reset' | 'activate';

export type PasswordSubmitData = {
  currentPassword: string;
  newPassword: string;
  email: string;
};

interface PasswordDialogProps {
  open: boolean;
  onClose: () => void;
  mode: Mode;
  email?: string; // For activate/reset context
  onSubmit: (data: PasswordSubmitData) => Promise<void>;
}

export const PasswordDialog: React.FC<PasswordDialogProps> = ({ open, onClose, mode, email, onSubmit }) => {
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  
  // Form State
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [resetEmail, setResetEmail] = useState('');
  const passwordByteLength = (value: string) => new TextEncoder().encode(value).length;

  const getTitle = () => {
    switch(mode) {
      case 'change': return "Cambiar Contraseña";
      case 'reset': return "Recuperar Contraseña";
      case 'activate': return "Activar Cuenta";
    }
  };

  const getDescription = () => {
    switch(mode) {
      case 'change': return "Ingresa tu contraseña actual y define una nueva para asegurar tu cuenta.";
      case 'reset': return "Ingresa tu correo institucional. Te enviaremos un enlace temporal.";
      case 'activate': return `Hola ${email || 'usuario'}, define tu contraseña para activar tu acceso al sistema.`;
    }
  };

  const handleSubmit = async () => {
    setError('');

    if (mode === 'reset' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(resetEmail.trim())) {
        setError('Ingresa un correo electronico valido.');
        return;
    }

    if (mode === 'change' || mode === 'activate') {
        if (mode === 'change' && !currentPassword) {
            setError("Ingresa tu contraseña actual.");
            return;
        }
        if (newPassword !== confirmPassword) {
            setError("Las contraseñas no coinciden.");
            return;
        }
        if (newPassword.length < 8) {
            setError("La contraseña debe tener al menos 8 caracteres.");
            return;
        }
        if (passwordByteLength(newPassword) > 72) {
            setError("La contraseña no puede exceder 72 bytes.");
            return;
        }
    }

    setLoading(true);
    try {
        await onSubmit({ 
            currentPassword, 
            newPassword, 
            email: mode === 'reset' ? resetEmail.trim() : (email || '')
        });
        setSuccess(true);
        setTimeout(() => {
            handleClose();
        }, 2000);
    } catch (e) {
        setError(e instanceof Error ? e.message : "Error al procesar la solicitud.");
    } finally {
        setLoading(false);
    }
  };

  const handleClose = () => {
    setSuccess(false);
    setError('');
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setResetEmail('');
    onClose();
  };

  return (
    <Dialog open={open} onClose={() => { if (!loading) handleClose(); }} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        {mode === 'reset' ? <MarkEmailRead /> : <LockReset />}
        {getTitle()}
      </DialogTitle>
      
      <DialogContent>
        {success ? (
            <div className="flex flex-col items-center justify-center py-8 text-center animate-[fadeIn_0.5s]">
                <CheckCircle sx={{ fontSize: 60, color: 'green', mb: 2 }} />
                <Typography variant="h6">¡Operación Exitosa!</Typography>
                <Typography variant="body2" color="text.secondary">
                    {mode === 'reset' 
                        ? "Se ha enviado un correo con las instrucciones." 
                        : "Tu contraseña ha sido actualizada correctamente."}
                </Typography>
            </div>
        ) : (
            <div className="pt-2 flex flex-col gap-4">
                <Alert severity="info" sx={{ mb: 2 }}>{getDescription()}</Alert>
                {error && <Alert severity="error">{error}</Alert>}

                {mode === 'change' && (
                    <TextField
                        label="Contraseña Actual"
                        type="password"
                        fullWidth
                        value={currentPassword}
                        onChange={(e) => setCurrentPassword(e.target.value)}
                    />
                )}

                {(mode === 'change' || mode === 'activate') && (
                    <>
                        <TextField
                            label="Nueva Contraseña"
                            type="password"
                            fullWidth
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                        />
                        <TextField
                            label="Confirmar Nueva Contraseña"
                            type="password"
                            fullWidth
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                        />
                    </>
                )}

                {mode === 'reset' && (
                    <TextField
                        label="Correo Institucional"
                        type="email"
                        fullWidth
                        value={resetEmail}
                        onChange={(e) => {
                            setResetEmail(e.target.value);
                            if (error) setError('');
                        }}
                        placeholder="ejemplo@sesna.gob.mx"
                        disabled={loading}
                    />
                )}
            </div>
        )}
      </DialogContent>
      
      {!success && (
          <DialogActions sx={{ px: 3, pb: 3 }}>
            <Button onClick={handleClose} color="inherit" disabled={loading}>
                Cancelar
            </Button>
            <Button 
                onClick={handleSubmit} 
                variant="contained" 
                sx={{ bgcolor: colorTokens.pdnCoral, '&:hover': { bgcolor: colorTokens.pdnCoralDark } }}
                disabled={loading}
            >
                {loading ? <CircularProgress size={24} color="inherit" /> : "Confirmar"}
            </Button>
          </DialogActions>
      )}
    </Dialog>
  );
};
