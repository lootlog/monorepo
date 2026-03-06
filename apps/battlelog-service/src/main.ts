import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ConfigService } from '@nestjs/config';
import { ServiceConfig } from 'src/config/service.config';
import {
  FastifyAdapter,
  type NestFastifyApplication,
} from '@nestjs/platform-fastify';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

async function bootstrap() {
  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter(),
  );
  const configService = app.get<ConfigService>(ConfigService);

  const { port } = configService.get<ServiceConfig>('service', {
    infer: true,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      transformOptions: {
        enableImplicitConversion: false,
      },
    }),
  );

  const config = new DocumentBuilder()
    .setTitle('Battle Log API')
    .setDescription('The Battle Log API documentation')
    .setVersion('1.0')
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, config);
  const env = configService.get<ServiceConfig>('service', {
    infer: true,
  })?.env;
  if (env === 'local' || env === 'dev') {
    SwaggerModule.setup('docs', app, document);
  }

  await app.startAllMicroservices();
  await app.listen(port, '0.0.0.0');
}
bootstrap();
