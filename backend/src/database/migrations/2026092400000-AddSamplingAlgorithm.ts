import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddSamplingAlgorithm2026092400000 implements MigrationInterface {
  name = 'AddSamplingAlgorithm2026092400000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "sampling_history"
      ADD COLUMN "algorithm" character varying(120) NOT NULL DEFAULT 'FisherYates+PRNG(SHA256)'
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "sampling_history" DROP COLUMN "algorithm"`);
  }
}
