import { Module } from '@nestjs/common';
import { Auth0Service } from './auth0.service';
import { HttpModule } from '@nestjs/axios';

@Module({
  imports: [HttpModule],
  providers: [Auth0Service],
  exports: [Auth0Service],
})
export class Auth0Module {}
