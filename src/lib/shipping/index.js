// ── Delivery provider registry ────────────────────────────────────
// Looks up a provider implementation by its `delivery_providers.slug`.
// Adding a real courier later means adding one entry here — nothing
// else in the app needs to change (see README.md).
import { manualProvider } from './manualProvider';
import { shiprocketProvider } from './shiprocketProvider';

const PROVIDERS = {
  manual: manualProvider,
  shiprocket: shiprocketProvider,
  // delhivery: delhivericProvider,   // add when ready — see README.md
  // nimbuspost: nimbuspostProvider,
};

export function getProvider(slug) {
  return PROVIDERS[slug] || manualProvider;
}
