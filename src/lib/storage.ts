import { useCallback, useEffect, useState } from "react";
import type { Contact } from "../types";

const STORAGE_KEY = "roledex.contacts.v1";

export function loadContacts(): Contact[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed;
  } catch {
    return [];
  }
}

function persist(contacts: Contact[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(contacts));
  } catch {
    // storage unavailable (private mode, quota) — fail silently, in-memory state still works
  }
}

export function useContacts() {
  const [contacts, setContactsState] = useState<Contact[]>(() => loadContacts());

  useEffect(() => {
    persist(contacts);
  }, [contacts]);

  const setContacts = useCallback((updater: Contact[] | ((prev: Contact[]) => Contact[])) => {
    setContactsState(updater);
  }, []);

  return [contacts, setContacts] as const;
}

const DINNER_GOALS_KEY = "roledex.dinnerGoals.v1";

function loadDinnerGoals(): Record<string, string> {
  try {
    const raw = localStorage.getItem(DINNER_GOALS_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function persistDinnerGoals(goals: Record<string, string>) {
  try {
    localStorage.setItem(DINNER_GOALS_KEY, JSON.stringify(goals));
  } catch {
    // ignore
  }
}

/** Per-month "what are we networking for" text, keyed by "YYYY-MM". */
export function useDinnerGoals() {
  const [goals, setGoalsState] = useState<Record<string, string>>(() => loadDinnerGoals());

  useEffect(() => {
    persistDinnerGoals(goals);
  }, [goals]);

  const setGoals = useCallback(
    (updater: Record<string, string> | ((prev: Record<string, string>) => Record<string, string>)) => {
      setGoalsState(updater);
    },
    [],
  );

  return [goals, setGoals] as const;
}

export function exportContactsJson(contacts: Contact[]): string {
  return JSON.stringify(contacts, null, 2);
}

export function downloadFile(filename: string, content: string, mime: string) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function contactsToCsv(contacts: Contact[]): string {
  const headers = [
    "firstName",
    "lastName",
    "company",
    "title",
    "industry",
    "email",
    "phone",
    "notes",
    "diningNotes",
    "placeTypes",
    "isDinnerGuest",
    "dinnerNotes",
    "dinnerMonth",
  ];
  const escape = (v: string) => `"${String(v).replace(/"/g, '""')}"`;
  const rows = contacts.map((c) =>
    headers
      .map((h) => {
        const raw = (c as unknown as Record<string, unknown>)[h];
        const value = Array.isArray(raw) ? raw.join("; ") : (raw ?? "");
        return escape(String(value));
      })
      .join(","),
  );
  return [headers.join(","), ...rows].join("\n");
}
