import { RequestMethod } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { AppModule } from './app.module';
import { ConfigService } from '@nestjs/config';
import cookieParser from 'cookie-parser';
import { UsersService } from './users/users.service';
import {
  booleanValue,
  normalizeApiBasePath,
  parseCorsOrigins,
} from './config/env.validation';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  const config = app.get(ConfigService);
  const users = app.get(UsersService);
  const apiBasePath = normalizeApiBasePath(config.get<string>('API_BASE_PATH'));
  const trustProxy = booleanValue(config.get<string>('TRUST_PROXY'), false);

  app.set('trust proxy', trustProxy);
  app.enableShutdownHooks();

  if (apiBasePath) {
    app.setGlobalPrefix(apiBasePath.slice(1), {
      exclude: [{ path: 'health', method: RequestMethod.GET }],
    });
  }

  app.use(cookieParser());

  app.enableCors({
    origin: parseCorsOrigins(config.get<string>('CORS_ORIGINS')),
    credentials: true,
  });

  const seeded = await users.seedInitialAdminFromEnv({
    email: config.get<string>('SEED_ADMIN_EMAIL'),
    password: config.get<string>('SEED_ADMIN_PASSWORD'),
    fullName: config.get<string>('SEED_ADMIN_FULLNAME'),
    institution: config.get<string>('SEED_ADMIN_INSTITUTION'),
    institutionAcronym: config.get<string>('SEED_ADMIN_INSTITUTION_ACRONYM'),
    position: config.get<string>('SEED_ADMIN_POSITION'),
  });

  if (seeded) {
    console.log('Admin inicial creado desde variables SEED_ADMIN_*');
  }

  const port = Number(config.get('PORT')) || 3001;
  const listenHost = config.get<string>('LISTEN_HOST') || '0.0.0.0';
  await app.listen(port, listenHost);
  console.log(
    `API escuchando sobre http://${listenHost}:${port}${apiBasePath || ''}`,
  );
}
void bootstrap();
