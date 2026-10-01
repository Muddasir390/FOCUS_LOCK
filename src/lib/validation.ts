const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Supabase's own default minimum; keeping ours in sync avoids a round trip. */
const MIN_PASSWORD_LENGTH = 6;

export function validateEmail(email: string): string | null {
  const trimmed = email.trim();
  if (!trimmed) return 'Please enter your email.';
  if (!EMAIL_PATTERN.test(trimmed)) return 'Please enter a valid email address.';
  return null;
}

export function validateName(name: string): string | null {
  if (!name.trim()) return 'Please enter your name.';
  return null;
}

/** For login, where any non-empty password should be sent to the server to check. */
export function validateRequiredPassword(password: string): string | null {
  if (!password) return 'Please enter your password.';
  return null;
}

/** For signup and password reset, where the password must also meet the length policy. */
export function validateNewPassword(password: string): string | null {
  if (!password) return 'Please enter a password.';
  if (password.length < MIN_PASSWORD_LENGTH) {
    return `Password must be at least ${MIN_PASSWORD_LENGTH} characters.`;
  }
  return null;
}
