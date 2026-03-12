// import { Module } from '@nestjs/common';
// import { TypeOrmModule } from '@nestjs/typeorm';
// import { PassportModule } from '@nestjs/passport';
// import { JwtModule } from '@nestjs/jwt';

// import { AuthService } from './auth.service';
// import { AuthController } from './auth.controller';
// import { LocalStrategy } from '../../auth/local.strategy';
// import { JwtStrategy } from '../../auth/jwt.strategy';

// import { Admin } from 'src/entities/entities/Admin';

// @Module({
//   imports: [
//     TypeOrmModule.forFeature([Admin]),
//     PassportModule,
//     JwtModule.register({
//       secret: 'SUPER_SECRET_KEY_CHANGE_ME',   // move to env in real project
//       signOptions: { expiresIn: '1d' },
//     }),
//   ],
//   controllers: [AuthController],
//   providers: [AuthService, LocalStrategy, JwtStrategy],
//   exports: [AuthService],
// })
// export class AuthModule {}
