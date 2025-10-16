#!/usr/bin/env node
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { WinstonModule } from 'nest-winston';
import { CommandFactory } from 'nest-commander';
import * as winston from 'winston';

async function bootstrap() {
  const isDev = process.env.NODE_ENV !== 'production';

  winston.addColors({
    error: 'bold red',
    warn: 'yellow',
    info: 'green',
    debug: 'blue',
    verbose: 'cyan',
  });

  const prodFormat = winston.format.combine(
    winston.format.colorize({ all: true }),
    winston.format.timestamp(),
    winston.format.json(),
  );

  const logger = WinstonModule.createLogger({
    // TODO: add other transport layers so that logs can be redirected to other sources like elsaticsearch, HDFS etc
    transports: [
      new winston.transports.Console({
        level: isDev ? 'debug' : 'info',
        format: prodFormat,
      }),
    ],
  });

  await CommandFactory.run(AppModule, {
    errorHandler: (err) => console.error(err),
    // logger
  });
}

bootstrap();
