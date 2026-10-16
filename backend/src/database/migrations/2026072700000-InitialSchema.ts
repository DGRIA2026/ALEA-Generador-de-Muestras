import { MigrationInterface, QueryRunner } from 'typeorm';

export class InitialSchema2026072700000 implements MigrationInterface {
  name = 'InitialSchema2026072700000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "users" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "email" character varying NOT NULL,
        "fullName" character varying(200) NOT NULL,
        "role" character varying(50) NOT NULL DEFAULT 'auditor',
        "status" character varying(20) NOT NULL DEFAULT 'pending',
        "institution" character varying(200) NOT NULL DEFAULT '',
        "institutionAcronym" character varying(50) NOT NULL DEFAULT '',
        "position" character varying(200) NOT NULL DEFAULT '',
        "passwordHash" character varying NOT NULL,
        "authVersion" integer NOT NULL DEFAULT 0,
        "activationTokenHash" character varying(128),
        "activationTokenExpiresAt" TIMESTAMP WITH TIME ZONE,
        "resetTokenHash" character varying(128),
        "resetTokenExpiresAt" TIMESTAMP WITH TIME ZONE,
        "lastLogin" TIMESTAMP WITH TIME ZONE,
        "lastUploadedFileHash" character varying(64),
        "uploadWindowStartedAt" TIMESTAMP WITH TIME ZONE,
        "uploadWindowEndsAt" TIMESTAMP WITH TIME ZONE,
        "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_users_email" UNIQUE ("email"),
        CONSTRAINT "PK_users_id" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "app_config" (
        "key" character varying(80) NOT NULL,
        "value" jsonb NOT NULL,
        "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_app_config_key" PRIMARY KEY ("key")
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "sampling_history" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "userId" uuid NOT NULL,
        "timestamp" TIMESTAMP WITH TIME ZONE NOT NULL,
        "sampleSize" integer NOT NULL,
        "seed" character varying(256) NOT NULL,
        "fileHash" character varying(64) NOT NULL,
        "resultHash" character varying(64) NOT NULL,
        "canonicalResultHash" character varying(64),
        "method" character varying(120) NOT NULL,
        "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_sampling_history_id" PRIMARY KEY ("id"),
        CONSTRAINT "FK_sampling_history_user" FOREIGN KEY ("userId")
          REFERENCES "users"("id") ON DELETE CASCADE
      )
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_sampling_history_user_file_timestamp"
      ON "sampling_history" ("userId", "fileHash", "timestamp")
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE "sampling_history"');
    await queryRunner.query('DROP TABLE "app_config"');
    await queryRunner.query('DROP TABLE "users"');
  }
}
