/**
 * Wraps fetch to the Anthropic API with a single automatic retry on 529
 * (overloaded). Waits 3 seconds before retrying so the user doesn't have to.
 */
export async function anthropicFetch(
  body: Record<string, unknown>,
  apiKey: string,
): Promise<Response> {
  const call = () =>
    fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify(body),
    });

  const res = await call();

  if (res.status === 529) {
    await new Promise((resolve) => setTimeout(resolve, 3000));
    return call();
  }

  return res;
}
