import { join } from 'path';
import { DataSource } from 'typeorm';
import { AppConfig } from '../app-config/app-config.entity';
import { SamplingHistory } from '../sampling-history/sampling-history.entity';
import { User } from '../users/user.entity';
import { booleanValue } from '../config/env.validation';

function requiredEnvironment(key: string) {
  const current = process.env[key]?.trim();
  if (!current) {
    throw new Error(`${key} es obligatorio para conectar con PostgreSQL.`);
  }
  return current;
}

function databasePort() {
  const current = Number(requiredEnvironment('DB_PORT'));
  if (!Number.isInteger(current) || current <= 0 || current > 65_535) {
    throw new Error('DB_PORT debe estar entre 1 y 65535.');
  }
  return current;
}

const dataSource = new DataSource({
  type: 'postgres',
  host: requiredEnvironment('DB_HOST'),
  port: databasePort(),
  username: requiredEnvironment('DB_USER'),
  password: requiredEnvironment('DB_PASSWORD'),
  database: requiredEnvironment('DB_NAME'),
  entities: [User, SamplingHistory, AppConfig],
  migrations: [join(__dirname, 'migrations', '*.{js,ts}')],
  migrationsTableName: 'typeorm_migrations',
  migrationsRun: booleanValue(process.env.DB_RUN_MIGRATIONS, true),
  synchronize: booleanValue(process.env.DB_SYNCHRONIZE, false),
});

export default dataSource;
