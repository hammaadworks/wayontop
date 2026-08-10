export interface LarkResponse {
  code: number;
  msg: string;
  data?: unknown;
}

const retryDelays = [1000, 3000, 5000];

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function validateInputs(message: string, webhookUrl?: string): boolean {
  if (!webhookUrl) {
    console.error("LARK_WEBHOOK_URL is not set.");
    return false;
  }
  if (!message) {
    console.error("Message must be a non-empty string.");
    return false;
  }
  return true;
}

function buildLarkPayload(message: string, title: string = "New Feedback/Bug Report"): object {
  return {
    msg_type: "interactive", card: {
      header: {
        title: {
          content: title, tag: "plain_text"
        }
      }, elements: [{
        tag: "div", text: {
          content: message, tag: "lark_md"
        }
      }]
    }
  };
}

async function fetchWithTimeout(url: string, options: RequestInit, timeoutMs: number = 5000): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, {
      ...options, signal: controller.signal
    });
  } finally {
    clearTimeout(timeout);
  }
}

async function assertHttpSuccess(response: Response): Promise<void> {
  if (response.ok) return;
  const text = await response.text().catch(() => "Failed to read response");
  throw new Error(`HTTP ${response.status}: ${text}`);
}

function assertLarkSuccess(data: LarkResponse): void {
  if (data.code !== 0) {
    throw new Error(`Lark API error: ${data.msg}`);
  }
}

async function executeLarkRequest(webhookUrl: string, payload: unknown): Promise<void> {
  await fetchWithTimeout(webhookUrl, {
    method: "POST",
    mode: "no-cors", // By-pass CORS preflight
    headers: {
      "Content-Type": "text/plain" // Simple request header to avoid OPTIONS preflight
    },
    body: JSON.stringify(payload)
  });
  // Since mode is no-cors, the response is opaque and we cannot read JSON or status.
  // We assume success if the fetch promise resolves without throwing a network error.
}

async function retry<T>(fn: () => Promise<T>, retries: number): Promise<T> {
  let lastError: unknown;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      console.error({ attempt, retries, error: String(error) }, "Retry attempt failed.");
      if (attempt === retries) break;
      await sleep(retryDelays[attempt] ?? 5000);
    }
  }
  throw lastError;
}

export async function sendLarkMessage(message: string, title: string = "New Feedback/Bug Report", retryCount: number = 2): Promise<boolean> {
  // Use Vite env vars if available, otherwise process.env
  const webhookUrl = import.meta.env?.VITE_LARK_WEBHOOK_URL || (typeof (globalThis as any).process !== 'undefined' ? (globalThis as any).process.env?.LARK_WEBHOOK_URL : undefined);
  const prefix = import.meta.env?.VITE_LARK_MESSAGE_PREFIX || (typeof (globalThis as any).process !== 'undefined' ? (globalThis as any).process.env?.LARK_MESSAGE_PREFIX : undefined) || "";

  if (!validateInputs(message, webhookUrl)) {
    return false;
  }

  const finalMessage = prefix ? `${prefix}\n\n${message}` : message;
  const payload = buildLarkPayload(finalMessage, title);

  try {
    await retry(() => executeLarkRequest(webhookUrl!, payload), Math.max(0, retryCount));
    return true;
  } catch (error) {
    console.error({ message, error: String(error) }, "All Lark message attempts failed.");
    return false;
  }
}
