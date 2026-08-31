import assert from 'node:assert/strict';
import test from 'node:test';
import { getErrorMessages } from '../src/utils/errorMessages.ts';
import { buildInviteUserPayload } from '../src/users/inviteUserPayload.ts';

test('conserva la correspondencia de institución, siglas y puesto', () => {
  const input = {
    email: 'nuevo@example.com',
    fullName: 'Usuario nuevo',
    role: 'auditor',
    institution:
      'Secretaría Ejecutiva del Sistema Nacional Anticorrupción',
    institutionAcronym: 'SESNA',
    position:
      'Jefe de Departamento de Calidad de Software y Procesos Institucionales',
  };

  assert.deepEqual(buildInviteUserPayload(input), input);
});

test('normaliza mensajes de error en arreglo, texto o respuesta vacía', () => {
  assert.deepEqual(getErrorMessages({ message: ['Campo inválido'] }), [
    'Campo inválido',
  ]);
  assert.deepEqual(getErrorMessages({ message: 'Solicitud inválida' }), [
    'Solicitud inválida',
  ]);
  assert.deepEqual(getErrorMessages(undefined), [
    'No fue posible crear el usuario',
  ]);
});

test('acepta una excepción Error sin leer propiedades inexistentes', () => {
  assert.deepEqual(getErrorMessages(new Error('La invitación falló')), [
    'La invitación falló',
  ]);
});
