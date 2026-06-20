/**
 * DoehClient — the public entry point.
 *
 *     const client = new DoehClient({ apiKey: "sk_test_…", environment: "sandbox" });
 *     const { order } = await client.delivery.create({ currency: "MMK", amount_minor: 1500 });
 *
 * There is intentionally NO shop concept: scope is derived from the key. To act
 * as a different shop, construct a client with a different key. Cutover from
 * sandbox to production is `environment: "production"` + a `sk_live_` key — no
 * code change.
 */
import { BASE_URLS, DEFAULTS, SDK_VERSION, type Environment } from "./config.js";
import { Transport, type FetchLike } from "./transport.js";
import { DeliveryModule } from "./modules/delivery.js";
import { KitchenModule } from "./modules/kitchen.js";
import { LoyaltyModule } from "./modules/loyalty.js";
import { MarketplaceModule } from "./modules/experimental/marketplace.js";
import { RiderModule } from "./modules/experimental/rider.js";
import { OrdersModule } from "./modules/experimental/orders.js";

export interface DoehClientOptions {
  apiKey: string;
  /** "sandbox" (default) or "production". Ignored if baseUrl is given. */
  environment?: Environment;
  /** Override the base URL entirely (advanced / self-host / tests). */
  baseUrl?: string;
  /**
   * Override the (mandatory) User-Agent. The SDK always sends one; supplying
   * your own is encouraged so your app is identifiable in server logs, e.g.
   * "MyMerchantApp/2.1". The SDK token is appended automatically.
   */
  userAgent?: string;
  /** Inject a fetch implementation (RN / undici / mock). Defaults to global. */
  fetch?: FetchLike;
  timeoutMs?: number;
  maxRetries?: number;
  /** Test hook to make backoff instant. */
  sleep?: (ms: number) => Promise<void>;
}

export class DoehClient {
  readonly delivery: DeliveryModule;
  /** Stable since 0.2.0 (reference-app exercised). */
  readonly kitchen: KitchenModule;
  /** Stable since 0.2.0 (reference-app exercised). */
  readonly loyalty: LoyaltyModule;

  /** @experimental Not yet exercised by the reference app. */
  readonly marketplace: MarketplaceModule;
  /** @experimental Not yet exercised by the reference app. */
  readonly rider: RiderModule;
  /**
   * @experimental Server-priced sales submission (`POST /v1/orders`). Additive
   * to `delivery`; the edge façade over the POS sale aggregate is not yet built,
   * so this is not live. See openapi/orders.yaml.
   */
  readonly orders: OrdersModule;

  private readonly transport: Transport;

  constructor(opts: DoehClientOptions) {
    if (!opts.apiKey) throw new Error("DoehClient requires an apiKey");
    const env = opts.environment ?? "sandbox";
    const baseUrl = opts.baseUrl ?? BASE_URLS[env];
    const userAgent = opts.userAgent
      ? `${opts.userAgent} doeh-sdk/${SDK_VERSION}`
      : `doeh-sdk/${SDK_VERSION}`;

    const fetchImpl = opts.fetch ?? (globalThis.fetch as FetchLike | undefined);
    if (typeof fetchImpl !== "function") {
      throw new Error(
        "No fetch implementation available. Pass `fetch` in DoehClientOptions " +
          "(e.g. from undici on older Node, or the RN global).",
      );
    }

    this.transport = new Transport({
      baseUrl,
      apiKey: opts.apiKey,
      userAgent,
      fetch: fetchImpl,
      timeoutMs: opts.timeoutMs ?? DEFAULTS.timeoutMs,
      maxRetries: opts.maxRetries ?? DEFAULTS.maxRetries,
      backoffBaseMs: DEFAULTS.backoffBaseMs,
      sleep: opts.sleep,
    });

    this.delivery = new DeliveryModule(this.transport);
    this.kitchen = new KitchenModule(this.transport);
    this.loyalty = new LoyaltyModule(this.transport);
    this.marketplace = new MarketplaceModule(this.transport);
    this.rider = new RiderModule(this.transport);
    this.orders = new OrdersModule(this.transport);
  }

  /** Internal: the configured transport (used by OfflineQueue wiring/tests). */
  get _transport(): Transport {
    return this.transport;
  }
}
