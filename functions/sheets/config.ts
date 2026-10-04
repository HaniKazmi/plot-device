/**
 * Everything the function is told by its deployment, read once from the environment.
 *
 * Every value is required except the two with a stated default: a function missing its client id
 * or its allowlist would either refuse everyone, which reads as an auth bug in the app, or — for
 * an empty allowlist read as "no restriction" — admit anyone with a Google account. Failing at
 * start-up names the variable instead.
 */
export interface Config {
  /** The OAuth client the app signs in through. An access token issued to any other is refused. */
  clientId: string;
  /** Lowercased. Google answers an address in the case its owner registered it in. */
  allowedEmails: ReadonlySet<string>;
  /** Origins answered with CORS headers. No cookies are used, so this is courtesy and not a gate. */
  allowedOrigins: ReadonlySet<string>;
  /** HMAC key for the session tokens. Rotating it signs every device out. */
  sessionSecret: Buffer;
  sessionSeconds: number;
  /** A service-account key file for local runs. Unset, tokens come from the metadata server. */
  credentialsPath: string | undefined;
}

const list = (value: string | undefined) =>
  (value ?? "")
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);

const required = (env: NodeJS.ProcessEnv, name: string) => {
  const value = env[name]?.trim();
  if (!value) throw new Error(`${name} is not set`);
  return value;
};

const requiredList = (env: NodeJS.ProcessEnv, name: string) => {
  const values = list(env[name]);
  if (values.length === 0) throw new Error(`${name} is not set`);
  return values;
};

/**
 * 32 bytes is the HMAC-SHA256 block's worth of key; anything shorter is a secret someone typed. A
 * hex string from `openssl rand -hex 32` is 64 characters and clears it.
 */
const MIN_SECRET_LENGTH = 32;

const DEFAULT_SESSION_DAYS = 30;

export const loadConfig = (env: NodeJS.ProcessEnv): Config => {
  const secret = required(env, "SESSION_SECRET");
  if (secret.length < MIN_SECRET_LENGTH)
    throw new Error(`SESSION_SECRET is ${secret.length} characters; use at least ${MIN_SECRET_LENGTH}`);

  const days = env.SESSION_DAYS ? Number(env.SESSION_DAYS) : DEFAULT_SESSION_DAYS;
  if (!Number.isFinite(days) || days <= 0)
    throw new Error(`SESSION_DAYS is not a positive number: ${env.SESSION_DAYS}`);

  return {
    clientId: required(env, "GOOGLE_CLIENT_ID"),
    allowedEmails: new Set(requiredList(env, "ALLOWED_EMAILS").map((email) => email.toLowerCase())),
    allowedOrigins: new Set(requiredList(env, "ALLOWED_ORIGINS")),
    sessionSecret: Buffer.from(secret),
    sessionSeconds: Math.round(days * 24 * 60 * 60),
    credentialsPath: env.GOOGLE_APPLICATION_CREDENTIALS?.trim() || undefined,
  };
};
