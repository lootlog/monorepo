import { AppState, Auth0Provider } from "@auth0/auth0-react";
import { AUTH0_AUDIENCE, AUTH0_CLIENT_ID, AUTH0_DOMAIN } from "../config/auth0";

type Props = {
  children: React.ReactNode;
};

export const Auth0ProviderWithConfig: React.FC<Props> = ({ children }) => {
  const onRedirectCallback = (appState: AppState) => {
    window.history.replaceState(
      {},
      document.title,
      appState?.returnTo || window.location.pathname
    );
  };

  return (
    <Auth0Provider
      domain={AUTH0_DOMAIN}
      clientId={AUTH0_CLIENT_ID}
      authorizationParams={{
        redirect_uri: window.location.origin,
        audience: AUTH0_AUDIENCE,
      }}
      // onRedirectCallback={onRedirectCallback}
    >
      {children}
    </Auth0Provider>
  );
};
