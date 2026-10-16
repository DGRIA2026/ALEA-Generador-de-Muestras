import { IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateSupportContactDto {
  @IsOptional()
  @IsString()
  @MaxLength(120)
  phone?: string;

  @IsOptional()
  @IsString()
  @MaxLength(160)
  email?: string;

  @IsOptional()
  @IsString()
  @MaxLength(220)
  address?: string;

  @IsOptional()
  @IsString()
  @MaxLength(180)
  hours?: string;

  @IsOptional()
  @IsString()
  @MaxLength(300)
  notes?: string;
}
