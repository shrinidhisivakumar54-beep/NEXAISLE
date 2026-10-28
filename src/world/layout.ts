import type { Product } from '../store';
export const aisleNames = ['Fresh & organic', 'Dairy & breakfast', 'Pantry essentials', 'Drinks & refreshments', 'Fruit & vegetables', 'Baking & ingredients', 'World kitchen', 'Home & wellbeing'];
export const aislePosition = (aisle: number): [number, number, number] => [-8.1 + ((aisle - 1) % 4) * 5.4, 0, aisle <= 4 ? -4 : 3];
export const rackPosition = (rack: number): [number, number, number] => [-6 + ((rack - 1) % 2) * 12, 0, rack <= 2 ? -3 : 4];
export function isBlocked(x: number, z: number, fashion: boolean, radius = .48) {
  if (Math.abs(x) > 12 - radius || Math.abs(z) > 12 - radius) return true;
  const positions = Array.from({length: fashion ? 4 : 8}, (_, i) => fashion ? rackPosition(i + 1) : aislePosition(i + 1));
  return positions.some(([sx,,sz]) => Math.abs(x - sx) < (fashion ? 2.15 : 1.95) + radius && Math.abs(z - sz) < (fashion ? .65 : .72) + radius) || (z < -9.2 && Math.abs(x) < 7);
}
export function productKind(p: Product): 'bottle'|'carton'|'jar'|'produce'|'bag'|'box' {
  if (/milk|juice/i.test(p.name)) return 'carton';
  if (/water|brew|oil|soap|soda|lemonade/i.test(p.name)) return 'bottle';
  if (/honey|butter|sauce|yogurt|jam|salt/i.test(p.name)) return 'jar';
  if (/avocado|strawberr|apple|banana|carrot|spinach|tomato|pepper|onion|lemon|broccoli|potato|garlic|mushroom|ginger/i.test(p.name)) return 'produce';
  if (/rice|flour|sugar|coffee|almond|lentil|quinoa|oat|granola/i.test(p.name)) return 'bag';
  return 'box';
}
