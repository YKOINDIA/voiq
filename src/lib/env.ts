function getRequiredEnv(name: string) {
  const value = process.env[name];

  if (!value) {
    throw new Error(`Missing environment variable: ${name}`);
  }

  return value;
}

export function getPublicEnv() {
  return {
    siteUrl: process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000",
    supabaseUrl: getRequiredEnv("NEXT_PUBLIC_SUPABASE_URL"),
    supabaseAnonKey: getRequiredEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY")
  };
}

export function getServiceEnv() {
  return {
    supabaseServiceRoleKey: getRequiredEnv("SUPABASE_SERVICE_ROLE_KEY"),
    stripeSecretKey: getRequiredEnv("STRIPE_SECRET_KEY"),
    resendApiKey: getRequiredEnv("RESEND_API_KEY"),
    sentryDsn: getRequiredEnv("SENTRY_DSN"),
    geminiApiKey: getRequiredEnv("GEMINI_API_KEY")
  };
}
