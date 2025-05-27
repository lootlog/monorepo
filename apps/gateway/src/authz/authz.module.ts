import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { WsJwtStrategy } from 'src/authz/ws-jwt.strategy';

@Module({
  imports: [PassportModule.register({ defaultStrategy: 'ws-jwt' })],
  providers: [WsJwtStrategy],
  exports: [PassportModule],
})
export class AuthzModule {}
