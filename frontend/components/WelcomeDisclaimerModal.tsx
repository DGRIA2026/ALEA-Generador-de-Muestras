import React, { useState } from 'react';
import { Checkbox, Dialog, Typography, Button, Box, Stack } from '@mui/material';
import {
  VerifiedUser,
  CheckCircleOutline,
  Gavel,
  PrivacyTip,
  TaskAlt,
} from '@mui/icons-material';
import { colorTokens } from '../src/theme/colors';
import { LEGAL_LINKS } from '../src/legalLinks';

interface WelcomeDisclaimerModalProps {
  open: boolean;
  onAccept: () => void;
}

const ACKNOWLEDGEMENTS: string[] = [
  'La información que cargue corresponde exclusivamente a la institución que representa y es responsabilidad de ésta.',
  'La SESNA no tiene acceso al contenido de los archivos cargados en su cuenta ni determina el universo de personas a seleccionar.',
  'ALEA únicamente ejecuta un procedimiento técnico de selección aleatoria; los resultados no constituyen un señalamiento, indicio o determinación de irregularidad o responsabilidad alguna.',
  'Los resultados y el historial de la ronda de muestreo permanecerán disponibles hasta que se inicie una nueva ronda de muestreo. Antes de ello, deberá descargar la información que requiera conservar.',
  'El uso de la herramienta implica la aceptación de los Términos y Condiciones de Uso y del Aviso de Privacidad.',
];

// Documentos cuya lectura debe confirmarse con casilla antes de poder continuar.
// El Manual de usuario deliberadamente NO vive aqui: se accede desde el Fab
// flotante de la vista del auditor (LEGAL_LINKS.manual), no desde este modal.
const CONSENT_DOCS = [
  {
    key: 'terminos' as const,
    label: 'Términos y Condiciones',
    href: LEGAL_LINKS.terminosCondiciones,
    icon: <Gavel sx={{ fontSize: 18 }} />,
    checkboxLabel: 'Confirmo que leí y acepto los Términos y Condiciones',
  },
  {
    key: 'privacidad' as const,
    label: 'Aviso de Privacidad',
    href: LEGAL_LINKS.avisoPrivacidad,
    icon: <PrivacyTip sx={{ fontSize: 18 }} />,
    checkboxLabel: 'Confirmo que leí y acepto el Aviso de Privacidad',
  },
];

export const WelcomeDisclaimerModal: React.FC<WelcomeDisclaimerModalProps> = ({ open, onAccept }) => {
  const [accepted, setAccepted] = useState({ terminos: false, privacidad: false });
  const canContinue = accepted.terminos && accepted.privacidad;

  return (
    <Dialog
      open={open}
      // Modal obligatorio: solo puede cerrarse desde el botón de continuar,
      // y este únicamente se habilita cuando ambas casillas están marcadas.
      disableEscapeKeyDown
      onClose={() => {
        /* sin acción: el cierre solo ocurre al aceptar */
      }}
      maxWidth="sm"
      fullWidth
      scroll="paper"
      aria-labelledby="welcome-disclaimer-title"
      PaperProps={{
        sx: {
          borderRadius: 4,
          overflow: 'hidden',
          maxHeight: { xs: '94vh', sm: '90vh' },
        },
      }}
    >
      {/* Encabezado con gradiente de marca.
          flexShrink: 0 es imprescindible: el Paper del Dialog es un flex column y,
          sin esto, al exceder el contenido el maxHeight el navegador comprime el
          encabezado y el título queda recortado por el overflow: hidden del Paper.
          Disposición horizontal (icono | antetítulo + título) para gastar menos
          alto en pantallas cortas y dejar el título a la altura óptica de lectura. */}
      <Box
        sx={{
          background: colorTokens.pdnBrandGradient,
          position: 'relative',
          overflow: 'hidden',
          flexShrink: 0,
          px: { xs: 2.5, sm: 4 },
          py: { xs: 2.25, sm: 2.75 },
        }}
      >
        <div className="absolute top-0 left-0 w-full h-full opacity-10 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-white via-transparent to-transparent scale-150" />
        <Box
          sx={{
            position: 'relative',
            zIndex: 10,
            display: 'flex',
            alignItems: 'center',
            gap: { xs: 1.5, sm: 2 },
          }}
        >
          <Box
            sx={{
              display: 'flex',
              flexShrink: 0,
              p: 1.25,
              borderRadius: '50%',
              bgcolor: colorTokens.white10,
              border: `1px solid ${colorTokens.white10}`,
              backdropFilter: 'blur(8px)',
            }}
          >
            <VerifiedUser sx={{ fontSize: { xs: 26, sm: 30 }, color: colorTokens.white }} />
          </Box>
          <Box sx={{ minWidth: 0 }}>
            <Typography
              component="p"
              sx={{
                color: colorTokens.white80,
                fontSize: '0.625rem',
                fontWeight: 700,
                letterSpacing: '0.12em',
                textTransform: 'uppercase',
                lineHeight: 1.4,
                mb: 0.25,
              }}
            >
              Sistema Nacional Anticorrupción
            </Typography>
            <Typography
              id="welcome-disclaimer-title"
              variant="h6"
              component="h2"
              sx={{
                color: colorTokens.white,
                fontWeight: 700,
                fontFamily: 'Archivo, sans-serif',
                fontSize: { xs: '1.0625rem', sm: '1.25rem' },
                lineHeight: 1.25,
              }}
            >
              Antes de utilizar la herramienta
            </Typography>
          </Box>
        </Box>
      </Box>

      {/* Cuerpo: única región que hace scroll. flex 1 1 auto + minHeight 0 son
          necesarios para que ceda el alto en lugar de empujar al encabezado. */}
      <Box
        sx={{
          flex: '1 1 auto',
          minHeight: 0,
          overflowY: 'auto',
          px: { xs: 3, sm: 4 },
          py: 3,
          bgcolor: colorTokens.white,
        }}
      >
        <Typography variant="body2" sx={{ color: colorTokens.slate600, mb: 2 }}>
          Le pedimos leer la siguiente información:
        </Typography>
        <Typography variant="body2" sx={{ color: colorTokens.slate600, mb: 2.5, lineHeight: 1.7 }}>
          <strong>ALEA</strong> es una herramienta desarrollada por la Secretaría Ejecutiva del Sistema
          Nacional Anticorrupción (SESNA) para realizar procesos de selección aleatoria de personas
          servidoras públicas en apoyo a los procedimientos de verificación patrimonial.
        </Typography>
        <Typography
          variant="subtitle2"
          sx={{ color: colorTokens.pdnBluePrimary, fontWeight: 700, mb: 1.5 }}
        >
          Al utilizar ALEA, usted reconoce que:
        </Typography>
        <Stack component="ul" spacing={1.5} sx={{ listStyle: 'none', p: 0, m: 0, mb: 3 }}>
          {ACKNOWLEDGEMENTS.map((text, index) => (
            <Box component="li" key={index} sx={{ display: 'flex', gap: 1.25, alignItems: 'flex-start' }}>
              <CheckCircleOutline
                sx={{ fontSize: 20, color: colorTokens.pdnCoral, mt: '2px', flexShrink: 0 }}
              />
              <Typography variant="body2" sx={{ color: colorTokens.slate600, lineHeight: 1.6 }}>
                {text}
              </Typography>
            </Box>
          ))}
        </Stack>

        {/* Documentos de consulta */}
        <Box
          sx={{
            border: `1px solid ${colorTokens.slate200}`,
            borderRadius: 3,
            p: 2,
            bgcolor: colorTokens.slate50,
          }}
        >
          <Typography
            variant="caption"
            sx={{ color: colorTokens.slate500, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' }}
          >
            Documentos de consulta
          </Typography>
          <Stack direction="column" spacing={0.5} sx={{ mt: 1.25 }}>
            {CONSENT_DOCS.map((doc) => (
              <Box key={doc.href} sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <Checkbox
                  checked={accepted[doc.key]}
                  onChange={(event) =>
                    setAccepted((prev) => ({ ...prev, [doc.key]: event.target.checked }))
                  }
                  size="small"
                  inputProps={{ 'aria-label': doc.checkboxLabel }}
                  sx={{
                    color: colorTokens.slate500,
                    '&.Mui-checked': { color: colorTokens.pdnCoral },
                  }}
                />
                <Button
                  href={doc.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  startIcon={doc.icon}
                  size="small"
                  sx={{
                    color: colorTokens.pdnBluePrimary,
                    textTransform: 'none',
                    fontWeight: 600,
                    justifyContent: 'flex-start',
                    flexGrow: 1,
                    '&:hover': { bgcolor: colorTokens.bluePrimary04 },
                  }}
                >
                  {doc.label}
                </Button>
              </Box>
            ))}
          </Stack>
          <Typography
            variant="caption"
            sx={{ display: 'block', mt: 1, color: colorTokens.slate500, lineHeight: 1.5 }}
          >
            Debe marcar ambas casillas para confirmar la lectura y aceptación de los Términos y
            Condiciones y del Aviso de Privacidad.
          </Typography>
        </Box>
      </Box>

      {/* Pie con acción de aceptación. flexShrink: 0 para que el botón siga
          visible sin importar cuánto crezca el cuerpo. */}
      <Box
        sx={{
          flexShrink: 0,
          px: { xs: 3, sm: 4 },
          py: { xs: 2, sm: 2.5 },
          borderTop: `1px solid ${colorTokens.slate200}`,
          bgcolor: colorTokens.white,
        }}
      >
        <Button
          onClick={onAccept}
          disabled={!canContinue}
          variant="contained"
          fullWidth
          size="large"
          startIcon={<TaskAlt />}
          sx={{
            bgcolor: colorTokens.pdnCoral,
            py: 1.4,
            fontWeight: 700,
            fontSize: '1rem',
            boxShadow: `0 4px 12px ${colorTokens.coral30}`,
            '&:hover': { bgcolor: colorTokens.pdnCoralDark },
            '&.Mui-disabled': {
              bgcolor: colorTokens.slate200,
              color: colorTokens.slate500,
              boxShadow: 'none',
            },
          }}
        >
          He leído y acepto — Continuar
        </Button>
      </Box>
    </Dialog>
  );
};
