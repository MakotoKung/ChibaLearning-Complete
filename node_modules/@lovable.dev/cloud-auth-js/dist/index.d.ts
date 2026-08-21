type OAuthProvider = "google" | "apple" | "microsoft" | "lovable";
interface LovableAuthConfig {
    oauthBrokerUrl?: string;
    supportedOAuthOrigins?: string[];
}
interface OAuthTokens {
    access_token: string;
    refresh_token: string;
}
interface SignInWithOAuthOptions {
    redirect_uri?: string;
    extraParams?: Record<string, string>;
}
type SignInWithOAuthResult = {
    tokens: OAuthTokens;
    error: null;
    redirected?: false;
} | {
    tokens?: undefined;
    error: Error;
    redirected?: false;
} | {
    tokens?: undefined;
    error: null;
    redirected: true;
};
interface LovableAuth {
    signInWithOAuth: (provider: OAuthProvider, opts?: SignInWithOAuthOptions) => Promise<SignInWithOAuthResult>;
}

declare function createLovableAuth(config?: LovableAuthConfig): LovableAuth;

export { LovableAuth, LovableAuthConfig, OAuthProvider, OAuthTokens, SignInWithOAuthOptions, SignInWithOAuthResult, createLovableAuth };
