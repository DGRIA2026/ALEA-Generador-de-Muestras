import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AppConfig } from './app-config.entity';
import { UpdateSamplingColumnsDto } from './dto/update-sampling-columns.dto';
import { UpdateSupportContactDto } from './dto/update-support-contact.dto';

const SAMPLING_COLUMNS_KEY = 'sampling_columns';
const SUPPORT_CONTACT_KEY = 'support_contact';

type SamplingColumn = {
  key: string;
  label: string;
  aliases: string[];
};

type SupportContact = {
  phone: string;
  email: string;
  address: string;
  hours: string;
  notes: string;
};

const DEFAULT_COLUMNS: SamplingColumn[] = [
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

const DEFAULT_SUPPORT_CONTACT: SupportContact = {
  phone: '555-000-0000',
  email: 'soporte@institucion.gob',
  address: 'Oficina de Sistemas - Edificio Principal',
  hours: 'Lunes a Viernes, 09:00 a 18:00',
  notes: 'Si no recibes respuesta, solicita apoyo al administrador institucional.',
};

@Injectable()
export class AppConfigService {
  constructor(
    @InjectRepository(AppConfig)
    private readonly repo: Repository<AppConfig>,
  ) {}

  async getSamplingColumns(): Promise<{ columns: SamplingColumn[] }> {
    const row = await this.repo.findOne({ where: { key: SAMPLING_COLUMNS_KEY } });

    if (!row) {
      return { columns: DEFAULT_COLUMNS };
    }

    const rawColumns = (row.value?.columns as unknown[]) || [];
    const parsed = this.sanitizeColumns(rawColumns);

    if (parsed.length === 0) {
      return { columns: DEFAULT_COLUMNS };
    }

    return { columns: parsed };
  }

  async updateSamplingColumns(dto: UpdateSamplingColumnsDto): Promise<{ columns: SamplingColumn[] }> {
    if (!dto?.columns?.length) {
      throw new BadRequestException('Debes definir al menos una columna.');
    }

    const normalized = this.normalizeIncomingColumns(dto.columns);

    if (normalized.length === 0) {
      throw new BadRequestException('No hay columnas validas para guardar.');
    }

    const entity = this.repo.create({
      key: SAMPLING_COLUMNS_KEY,
      value: { columns: normalized },
    });

    await this.repo.save(entity);

    return { columns: normalized };
  }

  async getSupportContact(): Promise<{ contact: SupportContact }> {
    const row = await this.repo.findOne({ where: { key: SUPPORT_CONTACT_KEY } });
    if (!row) {
      return { contact: DEFAULT_SUPPORT_CONTACT };
    }

    const contact = this.sanitizeSupportContact(row.value);
    return { contact };
  }

  async updateSupportContact(dto: UpdateSupportContactDto): Promise<{ contact: SupportContact }> {
    const normalized = this.normalizeSupportContact(dto);
    const entity = this.repo.create({
      key: SUPPORT_CONTACT_KEY,
      value: normalized,
    });

    await this.repo.save(entity);

    return { contact: normalized };
  }

  private normalizeIncomingColumns(columns: UpdateSamplingColumnsDto['columns']): SamplingColumn[] {
    const out: SamplingColumn[] = [];
    const usedKeys = new Set<string>();

    columns.forEach((column, index) => {
      const cleanLabel = String(column?.label || '').trim();
      if (!cleanLabel) return;

      let baseKey = this.toKey(cleanLabel);
      if (!baseKey) {
        baseKey = `columna_${index + 1}`;
      }

      let finalKey = baseKey;
      let suffix = 2;
      while (usedKeys.has(finalKey)) {
        finalKey = `${baseKey}_${suffix++}`;
      }
      usedKeys.add(finalKey);

      const aliases = this.uniqueTrimmed([cleanLabel, ...(column.aliases || [])]);

      out.push({
        key: finalKey,
        label: cleanLabel,
        aliases,
      });
    });

    return out;
  }

  private sanitizeColumns(rawColumns: unknown[]): SamplingColumn[] {
    if (!Array.isArray(rawColumns)) return [];

    const out: SamplingColumn[] = [];
    const usedKeys = new Set<string>();

    rawColumns.forEach((raw, index) => {
      if (!raw || typeof raw !== 'object') return;

      const rawObj = raw as { key?: unknown; label?: unknown; aliases?: unknown };
      const label = String(rawObj.label || '').trim();
      if (!label) return;

      const keyCandidate = String(rawObj.key || '').trim() || this.toKey(label) || `columna_${index + 1}`;
      let key = keyCandidate;
      let suffix = 2;
      while (usedKeys.has(key)) {
        key = `${keyCandidate}_${suffix++}`;
      }
      usedKeys.add(key);

      const aliasArray = Array.isArray(rawObj.aliases) ? rawObj.aliases.map((x) => String(x || '')) : [];

      out.push({
        key,
        label,
        aliases: this.uniqueTrimmed([label, ...aliasArray]),
      });
    });

    return out;
  }

  private uniqueTrimmed(values: string[]): string[] {
    const used = new Set<string>();
    const out: string[] = [];

    values.forEach((value) => {
      const cleaned = String(value || '').trim();
      if (!cleaned) return;

      const normalized = cleaned.toLowerCase();
      if (used.has(normalized)) return;

      used.add(normalized);
      out.push(cleaned);
    });

    return out;
  }

  private toKey(value: string): string {
    return value
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '');
  }

  private normalizeSupportContact(dto: UpdateSupportContactDto): SupportContact {
    return {
      phone: String(dto?.phone || '').trim(),
      email: String(dto?.email || '').trim(),
      address: String(dto?.address || '').trim(),
      hours: String(dto?.hours || '').trim(),
      notes: String(dto?.notes || '').trim(),
    };
  }

  private sanitizeSupportContact(value: Record<string, unknown>): SupportContact {
    const input = value || {};
    const normalized = this.normalizeSupportContact({
      phone: String(input.phone || ''),
      email: String(input.email || ''),
      address: String(input.address || ''),
      hours: String(input.hours || ''),
      notes: String(input.notes || ''),
    });

    return {
      phone: normalized.phone || DEFAULT_SUPPORT_CONTACT.phone,
      email: normalized.email || DEFAULT_SUPPORT_CONTACT.email,
      address: normalized.address || DEFAULT_SUPPORT_CONTACT.address,
      hours: normalized.hours || DEFAULT_SUPPORT_CONTACT.hours,
      notes: normalized.notes || DEFAULT_SUPPORT_CONTACT.notes,
    };
  }
}
