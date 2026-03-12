// import { Controller, Post, UseGuards, Request } from '@nestjs/common';
// import { AuthService } from './auth.service';
// import { AuthGuard } from '@nestjs/passport';

// @Controller('auth')
// export class AuthController {
//   constructor(private readonly authService: AuthService) {}

//   // POST /auth/admin/login
//   @UseGuards(AuthGuard('admin-local'))
//   @Post('admin/login')
//   async adminLogin(@Request() req) {
//     // req.user is set by LocalStrategy.validate()
//     return this.authService.login(req.user);
//   }
// }
