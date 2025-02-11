import { UnauthorizedException } from '@nestjs/common';

export const decodeJwtPayload = (token: string) => {
  const payload = token.split('.')[1];
  const decoded = Buffer.from(payload, 'base64').toString('utf-8');

  try {
    return JSON.parse(decoded);
  } catch (error) {
    throw new UnauthorizedException('Invalid token');
  }
};
