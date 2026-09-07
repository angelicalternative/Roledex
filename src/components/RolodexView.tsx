import { useEffect, useMemo, useRef, useState } from "react";
import type { Contact } from "../types";
import ContactCard from "./ContactCard";

interface Props {
  contacts: Contact[];
  onAddNew: () => void;
  onImport: () => void;
  onEdit: (contact: Contact) => void;
  onToggleDinner: (id: string) => void;
  onPatch: (id: string, patch: Partial<Contact>) => void;
}

const STEP_DEG = 15;
const CARD_HEIGHT = 190;
const RADIUS = Math.round(CARD_HEIGHT / 2 / Math.tan((STEP_DEG / 2) * (Math.PI / 180)));
const WINDOW = 6;
const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");

function sortKey(c: Contact): string {
  return (c.lastName || c.firstName || "").toUpperCase();
}

export default function RolodexView({ contacts, onAddNew, onImport, onEdit, onToggleDinner, onPatch }: Props) {
  const [query, setQuery] = useState("");
  const [currentIndex, setCurrentIndex] = useState(0);
  const [flippedId, setFlippedId] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

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

  useEffect(() => {
    setFlippedId(null);
  }, [currentIndex]);

  const goNext = () => setTotalSafe((i) => i + 1);
  const goPrev = () => setTotalSafe((i) => i - 1);

  function setTotalSafe(updater: (i: number) => number) {
    setCurrentIndex((i) => {
      if (total === 0) return 0;
      const next = updater(i);
      return ((next % total) + total) % total;
    });
  }

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName)) return;
      if (e.key === "ArrowRight" || e.key === "ArrowDown") {
        e.preventDefault();
        goNext();
      } else if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
        e.preventDefault();
        goPrev();
      } else if (e.key === "Enter" && filtered[currentIndex]) {
        setFlippedId((id) => (id === filtered[currentIndex].id ? null : filtered[currentIndex].id));
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [total, currentIndex, filtered]);

  const availableLetters = useMemo(() => {
    const set = new Set(filtered.map((c) => sortKey(c).charAt(0).toUpperCase()));
    return set;
  }, [filtered]);

  const jumpToLetter = (letter: string) => {
    const idx = filtered.findIndex((c) => sortKey(c).toUpperCase().startsWith(letter));
    if (idx !== -1) setCurrentIndex(idx);
  };

  const visibleCards = useMemo(() => {
    if (total === 0) return [];
    const items: { contact: Contact; diff: number }[] = [];
    for (let i = 0; i < total; i++) {
      let diff = i - currentIndex;
      if (diff > total / 2) diff -= total;
      if (diff < -total / 2) diff += total;
      if (Math.abs(diff) <= WINDOW) {
        items.push({ contact: filtered[i], diff });
      }
    }
    return items;
  }, [filtered, currentIndex, total]);

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

      <div className="rolodex-stage">
        <div className="rolodex-drum-wrap" ref={containerRef}>
          {total === 0 ? (
            <div className="empty-state">
              <p className="empty-title">{contacts.length === 0 ? "Your Rolodex is empty" : "No matches"}</p>
              <p className="empty-sub">
                {contacts.length === 0
                  ? "Add your first contact or import your address book to get spinning."
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
              <button type="button" className="drum-nav prev" onClick={goPrev} aria-label="Previous contact">
                ▲
              </button>
              <div className="rolodex-perspective">
                <div className="rolodex-drum" style={{ transform: `translateZ(${-RADIUS}px)` }}>
                  {visibleCards.map(({ contact, diff }) => (
                    <ContactCard
                      key={contact.id}
                      contact={contact}
                      diff={diff}
                      stepDeg={STEP_DEG}
                      radius={RADIUS}
                      isFront={diff === 0}
                      isFlipped={flippedId === contact.id}
                      onSelect={() => setCurrentIndex(filtered.findIndex((c) => c.id === contact.id))}
                      onFlip={() => setFlippedId((id) => (id === contact.id ? null : contact.id))}
                      onEdit={() => onEdit(contact)}
                      onToggleDinner={() => onToggleDinner(contact.id)}
                      onNotesChange={(notes) => onPatch(contact.id, { notes })}
                    />
                  ))}
                </div>
              </div>
              <button type="button" className="drum-nav next" onClick={goNext} aria-label="Next contact">
                ▼
              </button>
            </>
          )}
        </div>

        <div className="az-index">
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
      </div>

      {total > 0 && (
        <p className="rolodex-counter">
          {currentIndex + 1} / {total} {query ? `(filtered from ${contacts.length})` : "contacts"}
        </p>
      )}
    </div>
  );
}
