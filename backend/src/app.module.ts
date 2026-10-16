import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { join } from 'path';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { UsersModule } from './users/users.module';
import { AuthModule } from './auth/auth.module';
import { SamplingHistoryModule } from './sampling-history/sampling-history.module';
import { AppConfigModule } from './app-config/app-config.module';
import { booleanValue, validateEnvironment } from './config/env.validation';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, validate: validateEnvironment }),

    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'postgres',
        host: config.get('DB_HOST'),
        port: Number(config.get('DB_PORT')),
        username: config.get('DB_USER'),
        password: config.get('DB_PASSWORD'),
        database: config.get('DB_NAME'),
        autoLoadEntities: true,
        migrations: [join(__dirname, 'database', 'migrations', '*.{js,ts}')],
        migrationsTableName: 'typeorm_migrations',
        migrationsRun: booleanValue(
          config.get<string>('DB_RUN_MIGRATIONS'),
          true,
        ),
        synchronize: booleanValue(config.get<string>('DB_SYNCHRONIZE'), false),
      }),
    }),

    UsersModule,
    AuthModule,
    SamplingHistoryModule,
    AppConfigModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
