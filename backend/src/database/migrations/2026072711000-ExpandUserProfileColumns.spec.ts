import { QueryRunner } from 'typeorm';
import { ExpandUserProfileColumns2026072711000 } from './2026072711000-ExpandUserProfileColumns';

describe('ExpandUserProfileColumns2026072711000', () => {
  it('amplia las columnas sin borrar ni recrear users', async () => {
    const executedSql: string[] = [];
    const query = jest.fn((sql: string) => {
      executedSql.push(sql);
      return Promise.resolve();
    });
    const migration = new ExpandUserProfileColumns2026072711000();

    await migration.up({ query } as unknown as QueryRunner);

    const sql = executedSql[0] || '';
    expect(sql).toContain('ALTER TABLE "users"');
    expect(sql).toContain(
      'ALTER COLUMN "institution" TYPE character varying(255)',
    );
    expect(sql).toContain(
      'ALTER COLUMN "institutionAcronym" TYPE character varying(100)',
    );
    expect(sql).toContain(
      'ALTER COLUMN "position" TYPE character varying(255)',
    );
    expect(sql).not.toMatch(/\b(DROP|TRUNCATE|DELETE)\b/i);
  });
});
