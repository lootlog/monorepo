export type Auth0FetchManagementApiTokenResponse = {
  access_token: string;
  token_type: string;
};

export type Auth0UserProfileResponse = {
  email: string;
  email_verified: boolean;
  name: string;
  given_name: string;
  family_name: string;
  picture: string;
  gender: string;
  locale: string;
  updated_at: string;
  user_id: string;
  nickname: string;
  identities: Auth0Identity[];
  created_at: string;
  last_ip: string;
  last_login: string;
  logins_count: number;
};

export type Auth0Identity = {
  provider: string;
  access_token: string;
  expires_in: number;
  user_id: string;
  connection: Auth0Connection;
  isSocial: boolean;
};

export enum Auth0Connection {
  DISCORD = 'Discord',
}
