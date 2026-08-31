import React, { useCallback, useEffect, useState } from 'react';
import {
  Add,
  Close,
  Edit,
  Error as ErrorIcon,
  Mail,
} from '@mui/icons-material';
import {
  Alert,
  Button,
  CircularProgress,
  Collapse,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  MenuItem,
  TextField,
} from '@mui/material';
import type { InviteUserInput, User, UserRole } from '../../types';
import { colorTokens } from '../../src/theme/colors';
import { getErrorMessages } from '../../src/utils/errorMessages';

export type UserFormData = InviteUserInput;

const EMPTY_USER_FORM: UserFormData = {
  fullName: '',
  email: '',
  role: 'auditor',
  institution: '',
  institutionAcronym: '',
  position: '',
};

interface UserFormDialogProps {
  open: boolean;
  editingUser: User | null;
  onClose: () => void;
  onSave: (formData: UserFormData) => Promise<void>;
}

export const UserFormDialog: React.FC<UserFormDialogProps> = ({
  open,
  editingUser,
  onClose,
  onSave,
}) => {
  const [formData, setFormData] = useState<UserFormData>(EMPTY_USER_FORM);
  const [errors, setErrors] = useState<
    Partial<Record<keyof UserFormData, string>>
  >({});
  const [saveErrorMessages, setSaveErrorMessages] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setSaving(false);
    setErrors({});
    setSaveErrorMessages([]);
    if (editingUser) {
      setFormData({
        fullName: editingUser.fullName,
        email: editingUser.email,
        role: editingUser.role,
        institution: editingUser.institution,
        institutionAcronym: editingUser.institutionAcronym,
        position: editingUser.position,
      });
      return;
    }
    setFormData(EMPTY_USER_FORM);
  }, [open, editingUser]);

  const handleFieldChange = useCallback(
    <K extends keyof UserFormData>(field: K) =>
      (e: React.ChangeEvent<HTMLInputElement>) => {
        setFormData((prev) => ({ ...prev, [field]: e.target.value as UserFormData[K] }));
        setErrors((prev) => {
          const next = { ...prev };
          delete next[field];
          return next;
        });
        setSaveErrorMessages([]);
      },
    [],
  );

  const validateForm = () => {
    const newErrors: Partial<Record<keyof UserFormData, string>> = {};
    if (!formData.fullName.trim()) {
      newErrors.fullName = 'El nombre es obligatorio';
    } else if (formData.fullName.trim().length > 200) {
      newErrors.fullName = 'El nombre no puede exceder 200 caracteres';
    }
    if (!formData.email.trim()) {
      newErrors.email = 'El correo es obligatorio';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Formato de correo inválido';
    } else if (formData.email.trim().length > 255) {
      newErrors.email = 'El correo no puede exceder 255 caracteres';
    }
    if (!formData.institution.trim()) {
      newErrors.institution = 'La institución es obligatoria';
    } else if (formData.institution.trim().length > 255) {
      newErrors.institution = 'La institución no puede exceder 255 caracteres';
    }
    if (!formData.institutionAcronym.trim()) {
      newErrors.institutionAcronym = 'Las siglas son obligatorias';
    } else if (formData.institutionAcronym.trim().length > 100) {
      newErrors.institutionAcronym = 'Las siglas no pueden exceder 100 caracteres';
    }
    if (!formData.position.trim()) {
      newErrors.position = 'El cargo es obligatorio';
    } else if (formData.position.trim().length > 255) {
      newErrors.position = 'El cargo no puede exceder 255 caracteres';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const hasErrors = Object.keys(errors).length > 0;

  const handleSaveClick = async () => {
    if (saving || !validateForm()) return;
    setSaving(true);
    setSaveErrorMessages([]);
    try {
      await onSave(formData);
      onClose();
    } catch (error: unknown) {
      setSaveErrorMessages(
        getErrorMessages(error, 'No fue posible crear el usuario'),
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={(_event, reason) => {
        if (!saving && reason !== 'backdropClick') onClose();
      }}
      maxWidth="sm"
      fullWidth
      PaperProps={{ sx: { borderRadius: 3 } }}
    >
      <DialogTitle
        sx={{
          bgcolor: colorTokens.pdnBluePrimary,
          color: 'white',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          py: 2,
        }}
      >
        <div className="flex items-center gap-2">
          {editingUser ? <Edit /> : <Add />}
          <span className="font-bold">{editingUser ? 'Editar Usuario' : 'Nuevo Usuario'}</span>
        </div>
        <IconButton size="small" onClick={onClose} disabled={saving} sx={{ color: 'white' }}>
          <Close />
        </IconButton>
      </DialogTitle>

      <DialogContent sx={{ pt: 3 }}>
        <Collapse in={saveErrorMessages.length > 0}>
          <Alert severity="error" sx={{ mb: 3 }}>
            <strong>No fue posible guardar el usuario.</strong>
            <ul className="mt-1 list-disc pl-5">
              {saveErrorMessages.map((message) => (
                <li key={message}>{message}</li>
              ))}
            </ul>
          </Alert>
        </Collapse>

        <Collapse in={hasErrors}>
          <Alert
            severity="error"
            variant="standard"
            icon={<ErrorIcon fontSize="inherit" />}
            sx={{ mb: 3, border: `1px solid ${colorTokens.red200}` }}
          >
            <strong>No se pudo guardar:</strong> Por favor corrige los campos resaltados en rojo
            para continuar.
          </Alert>
        </Collapse>

        <div className="mt-4 flex flex-col gap-5">
          <TextField
            name="fullName"
            label="Nombre Completo"
            fullWidth
            variant="outlined"
            value={formData.fullName}
            onChange={handleFieldChange('fullName')}
            error={Boolean(errors.fullName)}
            helperText={errors.fullName || ''}
          />

          <div className="grid grid-cols-2 gap-4">
            <TextField
              name="email"
              label="Correo Institucional"
              fullWidth
              type="email"
              value={formData.email}
              onChange={handleFieldChange('email')}
              error={Boolean(errors.email)}
              helperText={errors.email || ''}
            />
            <TextField
              select
              name="role"
              label="Rol Asignado"
              fullWidth
              value={formData.role}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, role: e.target.value as UserRole }))
              }
            >
              <MenuItem value="auditor">Auditor (Estándar)</MenuItem>
              <MenuItem value="admin">Administrador</MenuItem>
            </TextField>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <TextField
              name="institutionAcronym"
              label="Siglas Inst."
              className="col-span-1"
              value={formData.institutionAcronym}
              onChange={handleFieldChange('institutionAcronym')}
              error={Boolean(errors.institutionAcronym)}
              helperText={errors.institutionAcronym || ''}
            />
            <TextField
              name="institution"
              label="Institución (Nombre Completo)"
              className="col-span-2"
              value={formData.institution}
              onChange={handleFieldChange('institution')}
              error={Boolean(errors.institution)}
              helperText={errors.institution || ''}
            />
          </div>

          <TextField
            name="position"
            label="Cargo / Puesto"
            fullWidth
            value={formData.position}
            onChange={handleFieldChange('position')}
            error={Boolean(errors.position)}
            helperText={errors.position || ''}
          />

          <Alert severity="info" icon={<Mail fontSize="small" />} sx={{ fontSize: '0.85rem', mt: 1 }}>
            {editingUser ? (
              'Al guardar los cambios, la información del perfil se actualizará inmediatamente.'
            ) : (
              <span>
                Se enviará un correo a <strong>{formData.email || '...'}</strong> con un enlace
                único para configurar su contraseña.
              </span>
            )}
          </Alert>
        </div>
      </DialogContent>

      <DialogActions sx={{ p: 3, pt: 1 }}>
        <Button onClick={onClose} color="inherit" disabled={saving} sx={{ textTransform: 'none' }}>
          Cancelar
        </Button>
        <Button
          onClick={handleSaveClick}
          disabled={saving}
          variant="contained"
          sx={{
            bgcolor: colorTokens.pdnBluePrimary,
            textTransform: 'none',
            px: 4,
            borderRadius: 2,
            '&:hover': { bgcolor: colorTokens.pdnBlueMedium },
          }}
        >
          {saving ? (
            <span className="flex items-center gap-2">
              <CircularProgress size={18} color="inherit" />
              {editingUser ? 'Guardando...' : 'Creando y enviando...'}
            </span>
          ) : editingUser ? (
            'Guardar Cambios'
          ) : (
            'Crear y Enviar Invitación'
          )}
        </Button>
      </DialogActions>
    </Dialog>
  );
};
