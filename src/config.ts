/** Return a Client ID from the environment, or null when it has not been set. */
export function readClientId(value: string | null | undefined): string | null {
  const trimmed = (value ?? "").trim();
  return trimmed.length > 0 ? trimmed : null;
}

export function readOptionalEnv(value: string | null | undefined): string {
  return (value ?? "").trim();
}
