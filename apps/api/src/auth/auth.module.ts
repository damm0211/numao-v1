import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './jwt-auth.guard';

@Module({
  imports: [
  
JwtModule.register({
  secret: (() => {
    const secret = process.env.JWT_SECRET?.trim();

    if (process.env.NODE_ENV === 'production' && !secret) {
      throw new Error(
        'JWT_SECRET es obligatorio en producción',
      );
    }

    return secret || 'numao-development-secret';
  })(),
  signOptions: {
    expiresIn: '7d',
  },
}),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtAuthGuard],
  exports: [JwtModule, JwtAuthGuard],
})
export class AuthModule {}