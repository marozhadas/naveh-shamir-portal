/** Replaces every secret (when it is long enough to be one) in a text before the text can reach a log, an error or a database. */
export function redactSecrets(text: string, secrets: ReadonlyArray<string | null | undefined>): string {
  let output = text;
  for (const secret of secrets) {
    if (secret && secret.length >= 6) output = output.split(secret).join("[redacted]");
  }
  return output;
}
