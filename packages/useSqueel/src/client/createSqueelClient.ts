import { SqueelClient, SqueelClientConfig } from "./types";
import { SqueelClientImpl } from "./SqueelClient";

export function createSqueelClient(config: SqueelClientConfig): SqueelClient {
  return new SqueelClientImpl(config);
}
