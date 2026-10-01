import { Linking } from 'react-native';
import { AUTH_REDIRECT_URL } from '../config/supabase';
import { supabase } from './supabase';

export type OAuthProvider = 'google' | 'facebook';

/** True for any link Supabase redirects back to us with (OAuth or password recovery). */
export function isAuthRedirect(url: string) {
  return url.startsWith(AUTH_REDIRECT_URL);
}

export function authRedirectParams(url: string) {
  // The link may carry params after `?` (PKCE code, error) or `#` (legacy
  // implicit-flow tokens) — check both.
  const [, query = ''] = url.split('?');
  const [, hash = ''] = url.split('#');
  return new URLSearchParams(query || hash);
}

/** Exchanges the `code` on a Supabase redirect link for a real session. */
export async function completeAuthRedirect(url: string) {
  const params = authRedirectParams(url);
  const errorDescription = params.get('error_description');
  if (errorDescription) throw new Error(errorDescription);

  const code = params.get('code');
  if (!code) return;

  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) throw error;
}

/** True when the redirect is a "reset your password" link rather than an OAuth sign-in. */
export function isPasswordRecovery(url: string) {
  return authRedirectParams(url).get('type') === 'recovery';
}

/**
 * Opens the provider's sign-in page and resolves once Supabase redirects back
 * to the app with a session, or rejects on error / user cancelling.
 */
export function signInWithProvider(provider: OAuthProvider) {
  return new Promise<void>((resolve, reject) => {
    let settled = false;
    const subscription = Linking.addEventListener('url', ({ url }) => {
      if (!isAuthRedirect(url)) return;
      subscription.remove();
      settled = true;
      completeAuthRedirect(url).then(resolve, reject);
    });

    supabase.auth
      .signInWithOAuth({
        provider,
        options: { redirectTo: AUTH_REDIRECT_URL, skipBrowserRedirect: true },
      })
      .then(({ data, error }) => {
        if (settled) return;
        if (error || !data?.url) {
          subscription.remove();
          reject(error ?? new Error('Supabase did not return a sign-in URL.'));
          return;
        }
        Linking.openURL(data.url);
      });
  });
}
