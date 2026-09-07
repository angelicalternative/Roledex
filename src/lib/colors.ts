const CARD_COLORS = [
  "#e8b84b",
  "#e07a5f",
  "#81b29a",
  "#5e81ac",
  "#c96f8f",
  "#9d8df1",
  "#4fa39a",
  "#d4a373",
  "#7fa6d0",
  "#c1666b",
];

export function colorForName(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = (hash * 31 + name.charCodeAt(i)) >>> 0;
  }
  return CARD_COLORS[hash % CARD_COLORS.length];
}

export function initials(firstName: string, lastName: string): string {
  const a = firstName.trim().charAt(0).toUpperCase();
  const b = lastName.trim().charAt(0).toUpperCase();
  return `${a}${b}` || "?";
}
