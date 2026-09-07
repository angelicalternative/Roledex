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
    "isDinnerGuest",
    "dinnerNotes",
  ];
  const escape = (v: string) => `"${String(v).replace(/"/g, '""')}"`;
  const rows = contacts.map((c) =>
    headers.map((h) => escape(String((c as unknown as Record<string, unknown>)[h] ?? ""))).join(","),
  );
  return [headers.join(","), ...rows].join("\n");
}
