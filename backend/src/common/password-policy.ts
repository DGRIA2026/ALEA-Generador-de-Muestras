export function getPasswordPolicyViolation(
  password: string,
  subject = 'La contraseña',
): string | null {
  if (password.length < 8) {
    return `${subject} debe tener al menos 8 caracteres.`;
  }
  if (Buffer.byteLength(password, 'utf8') > 72) {
    return `${subject} no puede exceder 72 bytes.`;
  }
  return null;
}
