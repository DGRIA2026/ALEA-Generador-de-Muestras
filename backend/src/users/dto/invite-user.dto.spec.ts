import { validate } from 'class-validator';
import { InviteUserDto } from './invite-user.dto';

function validDto() {
  return Object.assign(new InviteUserDto(), {
    email: 'nuevo@example.com',
    fullName: 'Usuario nuevo',
    role: 'auditor' as const,
    institution: 'Secretaría Ejecutiva del Sistema Nacional Anticorrupción',
    institutionAcronym: 'SESNA',
    position:
      'Jefe de Departamento de Calidad de Software y Procesos Institucionales',
  });
}

describe('InviteUserDto', () => {
  it('acepta nombres largos razonables y siglas normales', async () => {
    await expect(validate(validDto())).resolves.toHaveLength(0);
  });

  it.each([
    ['institution', 256],
    ['institutionAcronym', 101],
    ['position', 256],
  ] as const)('rechaza %s cuando excede su limite', async (field, length) => {
    const dto = validDto();
    dto[field] = 'x'.repeat(length);

    const errors = await validate(dto);

    expect(errors.some((error) => error.property === field)).toBe(true);
  });
});
