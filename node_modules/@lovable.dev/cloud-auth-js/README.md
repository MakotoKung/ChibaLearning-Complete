# @lovable.dev/cloud-auth-js

OAuth authentication library for Lovable projects using Supabase.

## Installation

```bash
npm install @lovable.dev/cloud-auth-js
```

## Usage

```typescript
import { createLovableAuth } from "@lovable.dev/cloud-auth-js";
import { supabase } from "./supabase/client";

const lovableAuth = createLovableAuth();

// Sign in with OAuth
const result = await lovableAuth.signInWithOAuth("google");

if (result.redirected) {
  // Page is redirecting to OAuth provider
  return;
}

if (result.error) {
  console.error("Sign in failed:", result.error.message);
  return;
}

await supabase.auth.setSession(result.tokens);
```

## API

### `createLovableAuth(config?)`

Creates a Lovable auth instance.

**Config options:**

| Option                  | Type       | Default                         | Description                           |
| ----------------------- | ---------- | ------------------------------- | ------------------------------------- |
| `oauthBrokerUrl`        | `string`   | `"/~oauth/initiate"`            | OAuth broker initiate URL             |
| `supportedOAuthOrigins` | `string[]` | `["https://oauth.lovable.app"]` | Allowed origins for OAuth postMessage |

### `signInWithOAuth(provider, options?)`

Initiates OAuth sign-in flow.

**Parameters:**

| Parameter              | Type                     | Description                                                |
| ---------------------- | ------------------------ | ---------------------------------------------------------- |
| `provider`             | `"google" \| "apple"`    | OAuth provider                                             |
| `options.redirect_uri` | `string`                 | Custom redirect URI (defaults to `window.location.origin`) |
| `options.extraParams`  | `Record<string, string>` | Additional params to send to the OAuth broker              |

**Returns:** `Promise<SignInWithOAuthResult>`

## Types

```typescript
interface OAuthTokens {
  access_token: string;
  refresh_token: string;
}

interface LovableAuthConfig {
  oauthBrokerUrl?: string;
  supportedOAuthOrigins?: string[];
}

interface SignInWithOAuthOptions {
  redirect_uri?: string;
  extraParams?: Record<string, string>;
}

type SignInWithOAuthResult =
  | { tokens: OAuthTokens; error: null; redirected?: false }
  | { tokens?: undefined; error: Error; redirected?: false }
  | { tokens?: undefined; error: null; redirected: true };
```

## License

MIT
