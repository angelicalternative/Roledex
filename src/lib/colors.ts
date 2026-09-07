const CARD_COLORS = [
  "#3d7ea6",
  "#2f9494",
  "#6f6bb0",
  "#4a8f6b",
  "#5b7fc7",
  "#8a63b8",
  "#3c9bb0",
  "#7a72d1",
  "#4f9c7c",
  "#5a86a4",
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
