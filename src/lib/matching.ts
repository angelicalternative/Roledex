import type { Contact } from "../types";

export const MONTHLY_GUEST_LIMIT = 2;

export function getMonthKey(date: Date = new Date()): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

export function getMonthLabel(monthKey: string): string {
  const [year, month] = monthKey.split("-").map(Number);
  if (!year || !month) return monthKey;
  return new Date(year, month - 1, 1).toLocaleString("en-US", { month: "long", year: "numeric" });
}

const STOPWORDS = new Set([
  "the", "and", "for", "with", "who", "that", "this", "are", "was", "looking", "someone",
  "somebody", "find", "help", "need", "about", "into", "a", "an", "to", "of", "in", "on",
  "at", "our", "we", "us", "new", "some", "any", "like", "want", "would", "could", "should",
  "person", "people", "guy", "girl", "folks", "network", "networking", "month", "meet",
]);

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((w) => w.length > 2 && !STOPWORDS.has(w));
}

const FIELD_WEIGHTS: [keyof Contact, number][] = [
  ["industry", 3],
  ["title", 2],
  ["company", 2],
  ["notes", 1],
];

export interface Match {
  contact: Contact;
  score: number;
  matchedFields: string[];
}

export function scoreContact(contact: Contact, tokens: string[]): { score: number; matchedFields: string[] } {
  let score = 0;
  const matchedFields: string[] = [];
  for (const [field, weight] of FIELD_WEIGHTS) {
    const text = String(contact[field] ?? "").toLowerCase();
    if (!text) continue;
    let hit = false;
    for (const token of tokens) {
      if (text.includes(token)) {
        score += weight;
        hit = true;
      }
    }
    if (hit) matchedFields.push(field as string);
  }
  return { score, matchedFields };
}

/** Ranks candidates against a free-text networking goal. Empty goal yields no matches. */
export function findMatches(candidates: Contact[], goalText: string, limit = 3): Match[] {
  const tokens = tokenize(goalText);
  if (tokens.length === 0) return [];
  return candidates
    .map((contact) => {
      const { score, matchedFields } = scoreContact(contact, tokens);
      return { contact, score, matchedFields };
    })
    .filter((m) => m.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}
