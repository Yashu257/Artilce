import 'dotenv/config';

function required(name: string, fallback?: string): string {
  const v = process.env[name] ?? fallback;
  if (!v) throw new Error(`Missing required env var ${name} (see .env.example)`);
  return v;
}

export const env = {
  nodeEnv: process.env.NODE_ENV ?? 'development',
  isProd: process.env.NODE_ENV === 'production',
  port: Number(process.env.PORT ?? 4000),
  databaseUrl: process.env.DATABASE_URL ?? '',
  // In production a JWT_SECRET must be set. In dev a placeholder is used
  // and loudly warned about, so `npm run build` / a smoke start never
  // crashes on a missing secret — but login will refuse to issue tokens
  // until a real secret is configured (see auth routes).
  jwtSecret: process.env.JWT_SECRET ?? 'dev-only-insecure-secret-change-me',
  jwtSecretConfigured: Boolean(process.env.JWT_SECRET),
  frontendOrigin: process.env.FRONTEND_ORIGIN ?? 'http://localhost:3000',
  openaiApiKey: process.env.OPENAI_API_KEY ?? '',
  geminiApiKey: process.env.GEMINI_API_KEY ?? '',
  uploadsDir: process.env.UPLOADS_DIR ?? 'uploads',
  cookieName: 'mkp_session',
  jwtExpiresIn: '8h' as const,
};

export function assertJwtSecret(): void {
  if (!env.jwtSecretConfigured) {
    throw new Error('JWT_SECRET is not configured. Set it in backend/.env (see .env.example).');
  }
}

export { required };
