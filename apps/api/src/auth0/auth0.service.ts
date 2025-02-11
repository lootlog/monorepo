import { HttpService } from '@nestjs/axios';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AxiosError } from 'axios';
import { catchError, firstValueFrom } from 'rxjs';
import {
  Auth0Connection,
  Auth0FetchManagementApiTokenResponse,
  Auth0Identity,
  Auth0UserProfileResponse,
} from 'src/auth0/types/auth0-api.types';
import { AUTH0_USER_ID_PREFIX, Auth0Config } from 'src/config/auth0.config';

@Injectable()
export class Auth0Service {
  private readonly logger = new Logger(Auth0Service.name);
  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {}

  async fetchManagementApiToken(): Promise<Auth0FetchManagementApiTokenResponse> {
    const { auth0Domain, auth0ClientId, auth0ClientSecret } =
      this.configService.get<Auth0Config>('auth0');
    const url = `${auth0Domain}/oauth/token`;

    const requestBody = {
      client_id: auth0ClientId,
      client_secret: auth0ClientSecret,
      audience: `${auth0Domain}/api/v2/`,
      grant_type: 'client_credentials',
    };

    const response = await firstValueFrom(
      this.httpService
        .post<Auth0FetchManagementApiTokenResponse>(url, requestBody)
        .pipe(
          catchError((error: AxiosError) => {
            this.logger.error(error.response.data);
            throw 'An error happened!';
          }),
        ),
    );

    return response.data;
  }

  async fetchUserProfile(userId: string): Promise<Auth0UserProfileResponse> {
    const token = await this.fetchManagementApiToken();
    const { auth0Domain } = this.configService.get<Auth0Config>('auth0');

    const url = `${auth0Domain}/api/v2/users/${AUTH0_USER_ID_PREFIX}${userId}`;

    const response = await firstValueFrom(
      this.httpService
        .get<Auth0UserProfileResponse>(url, {
          headers: {
            Authorization: `${token.token_type} ${token.access_token}`,
          },
        })
        .pipe(
          catchError((error: AxiosError) => {
            this.logger.error(error.response.data);
            throw 'An error happened!';
          }),
        ),
    );

    return response.data;
  }

  async getIDPAccessToken(
    userId: string,
    connection: Auth0Connection,
  ): Promise<Auth0Identity> {
    const token = await this.fetchUserProfile(userId);
    const identity = token.identities.find((i) => i.connection === connection);

    if (!identity) {
      throw 'User does not have the required identity!';
    }

    return identity;
  }
}
