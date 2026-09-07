import {
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type MouseEvent as ReactMouseEvent,
  type PointerEvent as ReactPointerEvent,
} from "react";
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

const STEP_DEG = 22;
const FALLBACK_RADIUS = 460;
const WINDOW = 6;
const DRAG_PX_PER_STEP = 64;
const DRAG_TAP_THRESHOLD = 6;
const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");

function sortKey(c: Contact): string {
  return (c.lastName || c.firstName || "").toUpperCase();
}

export default function RolodexView({ contacts, onAddNew, onImport, onEdit, onToggleDinner, onPatch }: Props) {
  const [query, setQuery] = useState("");
  const [currentIndex, setCurrentIndex] = useState(0);
  const [flippedId, setFlippedId] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const perspectiveRef = useRef<HTMLDivElement>(null);
  const [radius, setRadius] = useState(FALLBACK_RADIUS);
  const dragRef = useRef({ active: false, startY: 0, lastY: 0, moved: false, pointerId: -1 });
  const suppressClickRef = useRef(false);

  // Measure the card's actual rendered height so the 3D cylinder radius always matches
  // whatever size the CSS gives the card at the current breakpoint.
  useLayoutEffect(() => {
    const el = perspectiveRef.current;
    if (!el) return;
    const update = () => {
      const h = el.clientHeight;
      if (h > 0) setRadius(Math.round(h / 2 / Math.tan((STEP_DEG / 2) * (Math.PI / 180))));
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

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

  function setTotalSafe(updater: (i: number) => number) {
    setCurrentIndex((i) => {
      if (total === 0) return 0;
      const next = updater(i);
      return ((next % total) + total) % total;
    });
  }

  const goNext = () => setTotalSafe((i) => i + 1);
  const goPrev = () => setTotalSafe((i) => i - 1);

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

  const displayIndex = currentIndex + dragOffset;

  const visibleCards = useMemo(() => {
    if (total === 0) return [];
    const items: { contact: Contact; diff: number }[] = [];
    for (let i = 0; i < total; i++) {
      let diff = i - displayIndex;
      if (diff > total / 2) diff -= total;
      if (diff < -total / 2) diff += total;
      if (Math.abs(diff) <= WINDOW) {
        items.push({ contact: filtered[i], diff });
      }
    }
    return items;
  }, [filtered, displayIndex, total]);

  // --- Drag-to-spin (pointer events cover touch, mouse, and pen in one gesture) ---

  const handlePointerDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (total === 0) return;
    dragRef.current = { active: true, startY: e.clientY, lastY: e.clientY, moved: false, pointerId: e.pointerId };
    // Pointer capture is deferred to the first real move — capturing eagerly on every
    // pointerdown (even a plain tap) redirects the eventual click's target to this
    // container instead of the card underneath it, so tap-to-flip stops firing.
  };

  const handlePointerMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    const st = dragRef.current;
    if (!st.active) return;
    const deltaY = e.clientY - st.startY;
    if (!st.moved && Math.abs(deltaY) > DRAG_TAP_THRESHOLD) {
      st.moved = true;
      setIsDragging(true);
      e.currentTarget.setPointerCapture(e.pointerId);
    }
    st.lastY = e.clientY;
    if (st.moved) {
      setDragOffset((st.startY - e.clientY) / DRAG_PX_PER_STEP);
      e.preventDefault();
    }
  };

  const endDrag = () => {
    const st = dragRef.current;
    if (!st.active) return;
    st.active = false;
    setIsDragging(false);
    const finalFraction = (st.startY - st.lastY) / DRAG_PX_PER_STEP;
    if (st.moved) {
      suppressClickRef.current = true;
      // Safety net: some browsers never fire a click after a touch/pointer drag at all,
      // so don't let a stuck flag silently eat the user's next real tap.
      setTimeout(() => {
        suppressClickRef.current = false;
      }, 300);
      setTotalSafe((i) => i + Math.round(finalFraction));
    }
    setDragOffset(0);
  };

  const handlePointerUp = () => endDrag();
  const handlePointerCancel = () => endDrag();

  const handleClickCapture = (e: ReactMouseEvent) => {
    if (suppressClickRef.current) {
      e.stopPropagation();
      e.preventDefault();
      suppressClickRef.current = false;
    }
  };

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
        <div className="rolodex-drum-wrap">
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
              <div
                className="rolodex-perspective"
                ref={perspectiveRef}
                onPointerDown={handlePointerDown}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerUp}
                onPointerCancel={handlePointerCancel}
                onClickCapture={handleClickCapture}
              >
                <div
                  className={`rolodex-drum ${isDragging ? "dragging" : ""}`}
                  style={{ transform: `translateZ(${-radius}px)` }}
                >
                  {visibleCards.map(({ contact, diff }) => (
                    <ContactCard
                      key={contact.id}
                      contact={contact}
                      diff={diff}
                      stepDeg={STEP_DEG}
                      radius={radius}
                      isFront={diff === 0}
                      isFlipped={flippedId === contact.id}
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

        {total > 0 && (
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
        )}
      </div>

      {total > 0 && (
        <p className="rolodex-counter">
          <span className="rolodex-hint">Drag to spin · Tap a card to flip</span>
          <span className="rolodex-count-sep">·</span>
          {currentIndex + 1} / {total} {query ? `(filtered from ${contacts.length})` : "contacts"}
        </p>
      )}
    </div>
  );
}
