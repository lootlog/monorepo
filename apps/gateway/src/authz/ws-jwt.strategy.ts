import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-jwt';
import { passportJwtSecret } from 'jwks-rsa';
import { ConfigService } from '@nestjs/config';
import { Auth0Config } from 'src/config/auth0.config';
import { ConfigKey } from 'src/config/config-key.enum';

@Injectable()
export class WsJwtStrategy extends PassportStrategy(Strategy, 'ws-jwt') {
  constructor(private readonly configService: ConfigService) {
    const { auth0IssuerUrl, auth0Audience } = configService.get<Auth0Config>(
      ConfigKey.AUTH0,
    );

    super({
      secretOrKeyProvider: passportJwtSecret({
        cache: true,
        rateLimit: true,
        jwksRequestsPerMinute: 5,
        jwksUri: `${auth0IssuerUrl}/.well-known/jwks.json`,
      }),
      jwtFromRequest: (req) => {
        return req.token ?? '';
      },
      audience: auth0Audience,
      issuer: `${auth0IssuerUrl}/`,
      algorithms: ['RS256'],
    });
  }

  validate(payload: unknown): unknown {
    return payload;
  }
}
