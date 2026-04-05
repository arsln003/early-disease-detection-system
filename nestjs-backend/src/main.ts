// src/main.ts
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AdminService } from 'src/admin/admin.service';
import { DataSource } from 'typeorm';
import { seedAdmins } from './database/seeds/admin.seed';
async function bootstrap() {
  const app = await NestFactory.create(AppModule);
     const dataSource = app.get(DataSource);
      await seedAdmins(dataSource);

  // --- YEH LINE ADD KARO ---
  app.enableCors({
    origin: 'http://localhost:3000', // Allow Next.js frontend
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    credentials: true,
  });
  // -------------------------

  // Swagger setup
  const config = new DocumentBuilder()
    .setTitle('My API')
    .setDescription('API documentation')
    .setVersion('1.0')
    .addBearerAuth() // optional (JWT support)
    .build();
 const document = SwaggerModule.createDocument(app, config);

  SwaggerModule.setup('api', app, document);

  await app.listen(5000); // Make sure port match kare
}
bootstrap();