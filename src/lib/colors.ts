const CARD_COLORS = [
  "#e0328e",
  "#0aa5b8",
  "#8b5cf6",
  "#f2a72e",
  "#12b886",
  "#ff7a45",
  "#5b8def",
  "#d6499b",
  "#2fb8a8",
  "#a05bd6",
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
