// ── Delivery provider registry ────────────────────────────────────
// Looks up a provider implementation by its `delivery_providers.slug`.
// Adding a real courier later means adding one entry here — nothing
// else in the app needs to change (see README.md).
import { manualProvider } from './manualProvider';

const PROVIDERS = {
  manual: manualProvider,
  // shiprocket: shiprocketProvider,   // add when ready — see README.md
  // delhivery: delhivericProvider,
  // nimbuspost: nimbuspostProvider,
};

export function getProvider(slug) {
  return PROVIDERS[slug] || manualProvider;
}
