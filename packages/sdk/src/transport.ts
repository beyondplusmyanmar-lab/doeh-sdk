/**
 * The transport: one place that knows how to shape, send, and retry a request.
 *
 * Faithful to the validated golden client:
 *   - Authorization: Bearer <key>
 *   - User-Agent is MANDATORY (the edge/WAF rejects default library agents
 *     before they ever reach the API).
 *   - Trace-Id is sent and echoed; surfaced on errors for log correlation.
 *   - Idempotency-Key (NOT X-Idempotency-Key) enables safe create retries.
 *   - 429 and transport failures are retried with linear backoff; nothing else.
 */
import { DEFAULTS } from "./config.js";
import { DoehTransportError, mapApiError, isRetryable } from "./errors.js";
import { generateIdempotencyKey } from "./idempotency.js";

/** Pluggable fetch (defaults to global; inject for RN or tests). */
export type FetchLike = typeof fetch;

export interface TransportConfig {
  baseUrl: string;
  apiKey: string;
  userAgent: string;
  fetch: FetchLike;
  timeoutMs: number;
  maxRetries: number;
  backoffBaseMs: number;
  /** Hook for tests to make backoff instant. */
  sleep?: (ms: number) => Promise<void>;
}

export interface RequestSpec {
  method: "GET" | "POST";
  path: string;
  body?: unknown;
  idempotencyKey?: string;
  traceId?: string;
  signal?: AbortSignal;
  /** Send no Authorization header (used only to prove the auth gate). */
  anonymous?: boolean;
}

export interface RawResponse<T> {
  status: number;
  body: T;
  traceId: string;
}

const defaultSleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

function parseBody(text: string): unknown {
  if (!text) return {};
  try {
    return JSON.parse(text);
  } catch {
    // A non-JSON body (e.g. a WAF/proxy HTML error) — surface it structured.
    return { ok: false, code: "NON_JSON_RESPONSE", raw: text.slice(0, 200) };
  }
}

export class Transport {
  constructor(private readonly cfg: TransportConfig) {}

  /** Send one logical request, retrying transport errors and 429 only. */
  async request<T>(spec: RequestSpec): Promise<RawResponse<T>> {
    const sleep = this.cfg.sleep ?? defaultSleep;
    const traceId = spec.traceId ?? generateIdempotencyKey("trace");
    const max = this.cfg.maxRetries;

    let attempt = 0;
    // eslint-disable-next-line no-constant-condition
    while (true) {
      try {
        return await this.attempt<T>(spec, traceId);
      } catch (err) {
        if (isRetryable(err) && attempt < max) {
          attempt += 1;
          await sleep(this.cfg.backoffBaseMs * attempt);
          continue;
        }
        throw err;
      }
    }
  }

  private async attempt<T>(spec: RequestSpec, traceId: string): Promise<RawResponse<T>> {
    const url = this.cfg.baseUrl.replace(/\/$/, "") + spec.path;
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      "User-Agent": this.cfg.userAgent,
      "Trace-Id": traceId,
    };
    if (!spec.anonymous) headers["Authorization"] = `Bearer ${this.cfg.apiKey}`;
    if (spec.idempotencyKey) headers["Idempotency-Key"] = spec.idempotencyKey;

    // Compose the caller signal with our timeout.
    const timeout = new AbortController();
    const timer = setTimeout(() => timeout.abort(), this.cfg.timeoutMs);
    const signal = spec.signal
      ? anySignal([spec.signal, timeout.signal])
      : timeout.signal;

    let res: Response;
    try {
      res = await this.cfg.fetch(url, {
        method: spec.method,
        headers,
        body: spec.body !== undefined ? JSON.stringify(spec.body) : undefined,
        signal,
      });
    } catch (cause) {
      const aborted = (cause as { name?: string })?.name === "AbortError";
      throw new DoehTransportError(
        aborted ? `request timed out after ${this.cfg.timeoutMs}ms` : "network request failed",
        { cause, timeout: aborted },
      );
    } finally {
      clearTimeout(timer);
    }

    const text = await res.text();
    const body = parseBody(text);
    if (res.status >= 200 && res.status < 300) {
      return { status: res.status, body: body as T, traceId };
    }
    throw mapApiError(res.status, body, traceId);
  }
}

/** Minimal AbortSignal.any polyfill (not available on all RN runtimes). */
function anySignal(signals: AbortSignal[]): AbortSignal {
  const controller = new AbortController();
  for (const s of signals) {
    if (s.aborted) {
      controller.abort();
      break;
    }
    s.addEventListener("abort", () => controller.abort(), { once: true });
  }
  return controller.signal;
}
