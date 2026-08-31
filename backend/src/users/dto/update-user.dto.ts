import { IsEmail, IsIn, IsString, MaxLength, MinLength } from 'class-validator';

export class UpdateUserDto {
  @IsString()
  @MinLength(1)
  @MaxLength(200, {
    message: 'El nombre completo no puede exceder 200 caracteres.',
  })
  fullName: string;

  @IsEmail()
  @MaxLength(255, {
    message: 'El correo no puede exceder 255 caracteres.',
  })
  email: string;

  @IsIn(['admin', 'auditor'])
  role: 'admin' | 'auditor';

  @IsString()
  @MinLength(1)
  @MaxLength(255, {
    message: 'La institución no puede exceder 255 caracteres.',
  })
  institution: string;

  @IsString()
  @MinLength(1)
  @MaxLength(100, {
    message: 'Las siglas no pueden exceder 100 caracteres.',
  })
  institutionAcronym: string;

  @IsString()
  @MinLength(1)
  @MaxLength(255, {
    message: 'El cargo no puede exceder 255 caracteres.',
  })
  position: string;
}
