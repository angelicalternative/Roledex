const CARD_COLORS = [
  "#d9679a",
  "#c0693f",
  "#6f9179",
  "#c99a3e",
  "#a15f8a",
  "#4f8a8b",
  "#b5563f",
  "#7c8a4c",
  "#8f6b9e",
  "#3f7d6e",
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
