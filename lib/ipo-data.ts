import "server-only";
import { cache } from "react";
import { ipoConfig, scraperBlockReason } from "./config";
import { IpoService } from "./ipo-service";
import type { IpoList } from "./ipo-service";
import { IpoGuruProvider } from "./providers/ipoguru-provider";
import { IpoWatchHttpClient } from "./providers/ipowatch/client";
import { IpoWatchProvider } from "./providers/ipowatch/provider";
import { ProviderError } from "./providers/types";
import type { IpoDataProvider } from "./providers/types";
import type { Ipo } from "./types";

/** Pick the provider from IPO_DATA_PROVIDER. Pages and components only ever see IpoService. */
export function createProvider(env = ipoConfig()): IpoDataProvider {
  switch (env.provider) {
    case "ipoguru":
      return new IpoGuruProvider();
    case "ipowatch": {
      const blocked = scraperBlockReason(env, process.env.NODE_ENV);
      if (blocked) throw new ProviderError("config", blocked);
      return new IpoWatchProvider(new IpoWatchHttpClient());
    }
    default:
      throw new ProviderError("config", `Unknown IPO_DATA_PROVIDER "${env.provider}" (expected ipoguru or ipowatch)`);
  }
}

// One service per server process, so provider state (rate-limit back-offs, request spacing) is shared.
let service: IpoService | null = null;
const getService = (): IpoService => (service ??= new IpoService(createProvider()));

/** Attribution for the active provider. No network access. */
export function getSource(): { name: string; url: string; enriched: boolean } {
  try {
    return getService().source;
  } catch {
    return { name: "our data provider", url: "/", enriched: false };
  }
}

export const getAllIpos = cache((): Promise<IpoList> => getService().list());
export const getIpo = cache((slug: string): Promise<{ ipo: Ipo; fetchedAt: string } | null> => getService().get(slug));
export const getIpoDetail = cache((slug: string): Promise<{ ipo: Ipo; fetchedAt: string } | null> => getService().getDetail(slug));
