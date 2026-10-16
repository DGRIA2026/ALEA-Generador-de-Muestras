import { MigrationInterface, QueryRunner } from 'typeorm';

export class ExpandUserProfileColumns2026072711000 implements MigrationInterface {
  name = 'ExpandUserProfileColumns2026072711000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "users"
        ALTER COLUMN "institution" TYPE character varying(255),
        ALTER COLUMN "institutionAcronym" TYPE character varying(100),
        ALTER COLUMN "position" TYPE character varying(255)
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "users"
        ALTER COLUMN "institution" TYPE character varying(200),
        ALTER COLUMN "institutionAcronym" TYPE character varying(50),
        ALTER COLUMN "position" TYPE character varying(200)
    `);
  }
}
