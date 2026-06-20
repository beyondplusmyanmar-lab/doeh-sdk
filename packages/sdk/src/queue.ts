/**
 * OfflineQueue — durable, idempotency-owning mutation queue.
 *
 * This is the heart of the mobile design. The rule it enforces:
 *
 *   The idempotency key is minted ONCE at enqueue() time, persisted with the
 *   payload, and reused on EVERY flush attempt — forever, until the server
 *   accepts it. This is what makes "press create in airplane mode, reconnect,
 *   sync" produce exactly one order rather than one-per-retry.
 *
 * Retry policy mirrors the SDK transport:
 *   - transport failure / 429  -> keep the item, try again next flush
 *   - any other non-2xx (4xx validation, etc.) -> the item can NEVER succeed,
 *     so it is removed and surfaced as a dead letter (do not loop forever)
 *
 * Storage is pluggable (AsyncStorage on RN, a file/Map in Node/tests) so the
 * SDK core stays runtime-agnostic.
 */
import type { DeliveryModule } from "./modules/delivery.js";
import type { OrderCreate, OrderResponse } from "./types.js";
import { DoehApiError, isRetryable } from "./errors.js";
import { generateIdempotencyKey } from "./idempotency.js";

export interface QueueStorage {
  load(): Promise<string | null>;
  save(serialized: string): Promise<void>;
}

/** An in-memory storage — handy for tests and as a reference implementation. */
export class MemoryStorage implements QueueStorage {
  private value: string | null = null;
  async load(): Promise<string | null> {
    return this.value;
  }
  async save(serialized: string): Promise<void> {
    this.value = serialized;
  }
}

export interface QueuedMutation {
  /** Local id (also the user-visible "pending order" handle). */
  id: string;
  /** Minted once at enqueue; reused on every attempt. */
  idempotencyKey: string;
  module: "delivery";
  payload: OrderCreate;
  createdAt: string;
  attempts: number;
  lastError?: string;
}

export interface DeadLetter {
  mutation: QueuedMutation;
  error: DoehApiError;
}

export interface FlushResult {
  /** Mutations the server accepted this flush. */
  succeeded: { mutation: QueuedMutation; response: OrderResponse }[];
  /** Mutations that can never succeed — removed from the queue. */
  deadLettered: DeadLetter[];
  /** Mutations still pending (transport/429) — remain queued. */
  remaining: QueuedMutation[];
}

export class OfflineQueue {
  constructor(
    private readonly delivery: DeliveryModule,
    private readonly storage: QueueStorage,
  ) {}

  private async read(): Promise<QueuedMutation[]> {
    const raw = await this.storage.load();
    if (!raw) return [];
    try {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? (parsed as QueuedMutation[]) : [];
    } catch {
      return [];
    }
  }

  private async write(items: QueuedMutation[]): Promise<void> {
    await this.storage.save(JSON.stringify(items));
  }

  /** Current pending items (read-only snapshot). */
  async pending(): Promise<QueuedMutation[]> {
    return this.read();
  }

  /**
   * Enqueue a delivery create. Mints and persists the idempotency key now;
   * that key is never regenerated. Returns the local handle.
   */
  async enqueue(payload: OrderCreate): Promise<QueuedMutation> {
    const mutation: QueuedMutation = {
      id: generateIdempotencyKey("local"),
      idempotencyKey: generateIdempotencyKey("delivery"),
      module: "delivery",
      payload,
      createdAt: new Date().toISOString(),
      attempts: 0,
    };
    const items = await this.read();
    items.push(mutation);
    await this.write(items);
    return mutation;
  }

  /**
   * Attempt every pending mutation in FIFO order, reusing each stored key.
   * Stops draining on the first retryable failure (likely still offline) so we
   * don't hammer a dead network, but always persists progress.
   */
  async flush(): Promise<FlushResult> {
    const items = await this.read();
    const result: FlushResult = { succeeded: [], deadLettered: [], remaining: [] };
    const keep: QueuedMutation[] = [];
    let networkDown = false;

    for (const m of items) {
      if (networkDown) {
        keep.push(m);
        continue;
      }
      m.attempts += 1;
      try {
        const response = await this.delivery.create(m.payload, {
          idempotencyKey: m.idempotencyKey, // SAME key, every attempt
        });
        result.succeeded.push({ mutation: m, response });
      } catch (err) {
        if (isRetryable(err)) {
          // Still offline / rate-limited — keep it and stop draining.
          m.lastError = (err as Error).message;
          keep.push(m);
          networkDown = true;
        } else if (err instanceof DoehApiError) {
          // Terminal: this payload will never be accepted. Dead-letter it.
          result.deadLettered.push({ mutation: m, error: err });
        } else {
          // A client-side guard (e.g. bad amount) — also terminal.
          m.lastError = (err as Error).message;
          result.deadLettered.push({
            mutation: m,
            error: new DoehApiError(0, "CLIENT_VALIDATION", { body: m.lastError }),
          });
        }
      }
    }

    result.remaining = keep;
    await this.write(keep);
    return result;
  }
}
