import { useEffect, useMemo, useState } from "react";
import type { Contact } from "../types";
import RotaryDial from "./RotaryDial";
import ContactDetailPanel from "./ContactDetailPanel";

interface Props {
  contacts: Contact[];
  onAddNew: () => void;
  onImport: () => void;
  onEdit: (contact: Contact) => void;
  onToggleDinner: (id: string) => void;
  onPatch: (id: string, patch: Partial<Contact>) => void;
  spinResetToken: number;
}

const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");

function sortKey(c: Contact): string {
  return (c.lastName || c.firstName || "").toUpperCase();
}

export default function RolodexView({
  contacts,
  onAddNew,
  onImport,
  onEdit,
  onToggleDinner,
  onPatch,
  spinResetToken,
}: Props) {
  const [query, setQuery] = useState("");
  const [currentIndex, setCurrentIndex] = useState(0);

  const sorted = useMemo(
    () => [...contacts].sort((a, b) => sortKey(a).localeCompare(sortKey(b))),
    [contacts],
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return sorted;
    return sorted.filter((c) =>
      [c.firstName, c.lastName, c.company, c.title, c.industry, c.email, c.phone, c.notes]
        .join(" ")
        .toLowerCase()
        .includes(q),
    );
  }, [sorted, query]);

  const total = filtered.length;

  useEffect(() => {
    setCurrentIndex((i) => (total === 0 ? 0 : Math.min(i, total - 1)));
  }, [total]);

  // Reset to the first contact whenever a dinner-club pick lands, so the dial always
  // spins back to the start after you finish adding someone.
  useEffect(() => {
    if (spinResetToken > 0) setCurrentIndex(0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [spinResetToken]);

  function stepIndex(delta: number) {
    setCurrentIndex((i) => {
      if (total === 0) return 0;
      return ((i + delta) % total + total) % total;
    });
  }

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName)) return;
      if (e.key === "ArrowRight" || e.key === "ArrowDown") {
        e.preventDefault();
        stepIndex(1);
      } else if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
        e.preventDefault();
        stepIndex(-1);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [total]);

  const availableLetters = useMemo(() => {
    const set = new Set(filtered.map((c) => sortKey(c).charAt(0).toUpperCase()));
    return set;
  }, [filtered]);

  const jumpToLetter = (letter: string) => {
    const idx = filtered.findIndex((c) => sortKey(c).toUpperCase().startsWith(letter));
    if (idx !== -1) setCurrentIndex(idx);
  };

  const current = total > 0 ? filtered[currentIndex] : null;

  return (
    <div className="rolodex-view">
      <div className="toolbar">
        <input
          className="search-input"
          type="search"
          placeholder="Search contacts…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <div className="toolbar-actions">
          <button type="button" className="btn ghost" onClick={onImport}>
            Import
          </button>
          <button type="button" className="btn primary" onClick={onAddNew}>
            + Add Contact
          </button>
        </div>
      </div>

      {total === 0 ? (
        <div className="empty-state">
          <p className="empty-title">{contacts.length === 0 ? "Your Rolodex is empty" : "No matches"}</p>
          <p className="empty-sub">
            {contacts.length === 0
              ? "Add your first contact or import your address book to start dialing."
              : "Try a different search term."}
          </p>
          {contacts.length === 0 && (
            <div className="empty-actions">
              <button type="button" className="btn primary" onClick={onAddNew}>
                + Add Contact
              </button>
              <button type="button" className="btn ghost" onClick={onImport}>
                Import Contacts
              </button>
            </div>
          )}
        </div>
      ) : (
        <>
          <RotaryDial
            contacts={filtered}
            currentIndex={currentIndex}
            onSelect={(idx) => setCurrentIndex(idx)}
            onStep={(delta) => stepIndex(delta)}
          />

          <p className="rolodex-hint">Spin the dial or tap a hole · {currentIndex + 1} / {total}{" "}
            {query ? `(filtered from ${contacts.length})` : ""}
          </p>

          <div className="az-strip">
            {ALPHABET.map((letter) => (
              <button
                key={letter}
                type="button"
                className={`az-tab ${availableLetters.has(letter) ? "active" : "disabled"}`}
                disabled={!availableLetters.has(letter)}
                onClick={() => jumpToLetter(letter)}
              >
                {letter}
              </button>
            ))}
          </div>

          {current && (
            <ContactDetailPanel
              key={current.id}
              contact={current}
              onEdit={() => onEdit(current)}
              onToggleDinner={() => onToggleDinner(current.id)}
              onNotesChange={(notes) => onPatch(current.id, { notes })}
            />
          )}
        </>
      )}
    </div>
  );
}
