export function formatPrice(amount) {
  if (amount == null) return '';
  return '₹' + Number(amount).toLocaleString('en-IN');
}
