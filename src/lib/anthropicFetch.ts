const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Wraps fetch to the Anthropic API with automatic retries on 529 (overloaded).
 * Retries up to 3 times with increasing delays: 5s, 10s, 20s.
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

  const delays = [5000, 10000, 20000];

  let res = await call();
  for (const delay of delays) {
    if (res.status !== 529) break;
    await sleep(delay);
    res = await call();
  }

  return res;
}
