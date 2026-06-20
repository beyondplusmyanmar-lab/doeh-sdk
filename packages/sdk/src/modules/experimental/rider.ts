/**
 * Rider — EXPERIMENTAL.
 *
 * @experimental Schema/golden-client-derived; not yet exercised by the Expo
 * reference app.
 */
import type { Transport } from "../../transport.js";
import type { CallOptions } from "../../types.js";
import { generateIdempotencyKey } from "../../idempotency.js";

export interface JobCreate {
  pickup: string;
  dropoff: string;
}
export interface JobResponse {
  ok: boolean;
  idempotent?: boolean;
  job: { id: string; [k: string]: unknown };
}

const PATH_ID = /^[A-Za-z0-9_]+$/;

export class RiderModule {
  constructor(private readonly transport: Transport) {}

  /** @experimental */
  async createJob(input: JobCreate, opts: CallOptions = {}): Promise<JobResponse> {
    const { body } = await this.transport.request<JobResponse>({
      method: "POST",
      path: "/v1/rider/jobs",
      body: input,
      idempotencyKey: opts.idempotencyKey ?? generateIdempotencyKey("rider"),
      traceId: opts.traceId,
      signal: opts.signal,
    });
    return body;
  }

  /** @experimental */
  async getJob(id: string, opts: CallOptions = {}): Promise<JobResponse> {
    if (!PATH_ID.test(id)) throw new RangeError(`invalid job id ${JSON.stringify(id)}`);
    const { body } = await this.transport.request<JobResponse>({
      method: "GET",
      path: `/v1/rider/jobs/${id}`,
      traceId: opts.traceId,
      signal: opts.signal,
    });
    return body;
  }
}
