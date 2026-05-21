export function isDbConfigured(): boolean {
  return Boolean(process.env.POSTGRES_URL?.trim());
}
