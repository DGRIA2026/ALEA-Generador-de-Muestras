export interface Employee {
  recordId: string;
  values: Record<string, string>;
  originalIndex: number;
}

export interface SamplingColumn {
  key: string;
  label: string;
  aliases: string[];
}

export interface SupportContact {
  phone: string;
  email: string;
  address: string;
  hours: string;
  notes: string;
}

export interface MailStatus {
  configured: boolean;
  available: boolean;
  message: string;
}

export const DEFAULT_SAMPLING_COLUMNS: SamplingColumn[] = [
  {
    key: 'id',
    label: 'ID',
    aliases: ['id', 'identificador', 'clave', 'num_empleado', 'no_empleado', 'cve'],
  },
  {
    key: 'nombre_completo',
    label: 'Nombre Completo',
    aliases: ['nombre completo', 'nombre', 'empleado', 'trabajador', 'nombres', 'name'],
  },
  {
    key: 'puesto',
    label: 'Puesto',
    aliases: ['puesto', 'cargo', 'posicion', 'plaza', 'job', 'role'],
  },
  {
    key: 'area',
    label: 'Area',
    aliases: ['area', 'área', 'unidad', 'departamento', 'adscripcion', 'adscripción', 'gerencia'],
  },
];

export interface SamplingHistoryItem {
  timestamp: string;
  sampleSize: number;
  seed: string;
  fileHash: string;
  resultHash: string;
  canonicalResultHash?: string;
  method: string;
}

export interface UsageData {
  count: number;
  lastUsedAt: string;
  history: SamplingHistoryItem[];
}

export interface FileData {
  name: string;
  hash: string;
  employees: Employee[];
  columns: SamplingColumn[];
}

export type ParseError = {
  message: string;
  severity: 'error' | 'warning';
};

export interface SamplingState {
  results: Employee[];
  audit?: SamplingHistoryItem;
  sampleSize: string;
  seed?: string;
  resultHashInput?: string;
  matchStatus: 'idle' | 'match' | 'mismatch';
  externalListFileName?: string;
  externalListCount?: number;
  externalOrderHash?: string;
  externalCanonicalHash?: string;
  externalMatchStatus?: 'idle' | 'exact' | 'canonical' | 'mismatch';
}

export type UserRole = 'admin' | 'auditor';
export type UserStatus = 'active' | 'pending' | 'inactive';

export interface User {
  id: string;
  email: string;
  fullName: string;
  role: UserRole;
  status: UserStatus;
  institution: string;
  institutionAcronym: string;
  position: string;
  lastLogin?: string;
  lastUploadedFileHash?: string | null;
  uploadWindowStartedAt?: string | null;
  uploadWindowEndsAt?: string | null;
}

export type InviteUserInput = Pick<
  User,
  | 'email'
  | 'fullName'
  | 'role'
  | 'institution'
  | 'institutionAcronym'
  | 'position'
>;
