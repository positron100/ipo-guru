import "server-only";
import { getCache } from "@vercel/functions";
import { asIpoListResult, IPO_GURU_SNAPSHOT_KEY } from "./ipoguru-snapshot";
import { ProviderError } from "./types";
import type { GmpData, IpoDataProvider, IpoListResult, ProviderCapabilities } from "./types";
import type { Ipo } from "../types";

export async function readIpoGuruSnapshot(): Promise<IpoListResult | null> {
  return asIpoListResult(await getCache().get(IPO_GURU_SNAPSHOT_KEY));
}

/** Production page provider: deliberately cache-only, with no fallback to live API calls. */
export class IpoGuruCachedProvider implements IpoDataProvider {
  readonly name = "IPO Guru";
  readonly url = "https://www.ipoguru.in";
  readonly capabilities: ProviderCapabilities = { details: false, gmpHistory: false, subscription: false };

  async fetchUpcomingIpos(): Promise<IpoListResult> {
    const snapshot = await readIpoGuruSnapshot();
    if (!snapshot) throw new ProviderError("unavailable", "IPO Guru snapshot is not available yet");
    return snapshot;
  }

  async fetchIpoDetails(): Promise<Ipo | null> { return null; }
  async fetchGmp(): Promise<GmpData | null> { return null; }
  async fetchSubscription(): Promise<null> { return null; }
}
