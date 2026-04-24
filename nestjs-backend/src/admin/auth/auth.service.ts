// import { Injectable, UnauthorizedException } from '@nestjs/common';
// import { InjectRepository } from '@nestjs/typeorm';
// import { Repository } from 'typeorm';
// import { JwtService } from '@nestjs/jwt';
// import * as bcrypt from 'bcrypt';

// import { Admin } from 'src/entities/entities/Admin';

// @Injectable()
// export class AuthService {
//   constructor(
//     @InjectRepository(Admin)
//     private readonly adminRepository: Repository<Admin>,
//     private readonly jwtService: JwtService,
//   ) {}

//   // called by LocalStrategy
//   async validateAdmin(email: string, password: string): Promise<Admin> {
//     const admin = await this.adminRepository.findOne({ where: { email } });

//     if (!admin) {
//       throw new UnauthorizedException('Invalid credentials');
//     }

//     // if you are NOT hashing passwords yet, use simple comparison:
//     // const passwordValid = admin.password === password;

//     //const passwordValid = await bcrypt.compare(password, admin.password);
//      const passwordValid = admin.password === password;

//     if (!passwordValid) {
//       throw new UnauthorizedException('Invalid credentials');
//     }

//     return admin;
//   }

//   // create JWT token
//   async login(admin: Admin) {
//     const payload = {
//       sub: admin.adminid,
//       email: admin.email,
//       role: admin.role || 'Admin',
//     };

//     return {
//       access_token: this.jwtService.sign(payload),
//     };
//   }
// }
