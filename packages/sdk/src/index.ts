/**
 * @beyondplusmm/doehpos-sdk — official TypeScript SDK for the Doeh POS public API.
 *
 * A typed port of the validated golden client. The stable surface is `delivery`;
 * kitchen/loyalty/marketplace/rider are @experimental until exercised by the
 * reference app.
 */
export { DoehClient } from "./client.js";
export type { DoehClientOptions } from "./client.js";

export { BASE_URLS, SDK_VERSION, type Environment } from "./config.js";

export { generateIdempotencyKey, type UuidFn } from "./idempotency.js";

export {
  OfflineQueue,
  MemoryStorage,
  type QueueStorage,
  type QueuedMutation,
  type DeadLetter,
  type FlushResult,
} from "./queue.js";

export type {
  Currency,
  OrderStatus,
  OrderCreate,
  Order,
  OrderResponse,
  ErrorBody,
  CallOptions,
} from "./types.js";

// Error ABI — consumers catch these classes, never parse `code` strings.
export {
  DoehError,
  DoehTransportError,
  DoehApiError,
  ApiKeyInvalidError,
  ApiKeyExpiredError,
  ApiKeyRevokedError,
  EnvMismatchError,
  ScopeDeniedError,
  TransportDisabledError,
  OrderNotFoundError,
  ReplayError,
  InvalidAmountError,
  UnsupportedCurrencyError,
  BadBodyError,
  RateLimitedError,
  isRetryable,
  mapApiError,
} from "./errors.js";

// Module classes + their types (handy for typing app code).
export { DeliveryModule } from "./modules/delivery.js";
export { KitchenModule, type TicketCreate, type TicketResponse } from "./modules/experimental/kitchen.js";
export { LoyaltyModule, type EarnInput, type AccountResponse } from "./modules/experimental/loyalty.js";
export {
  MarketplaceModule,
  type ListingCreate,
  type ListingResponse,
} from "./modules/experimental/marketplace.js";
export { RiderModule, type JobCreate, type JobResponse } from "./modules/experimental/rider.js";
