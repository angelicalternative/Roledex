import { useState, type CSSProperties } from "react";
import type { Contact } from "../types";
import { colorForName, initials } from "../lib/colors";

interface Props {
  contact: Contact;
  diff: number;
  stepDeg: number;
  radius: number;
  isFront: boolean;
  isFlipped: boolean;
  onFlip: () => void;
  onEdit: () => void;
  onToggleDinner: () => void;
  onNotesChange: (notes: string) => void;
}

export default function ContactCard({
  contact,
  diff,
  stepDeg,
  radius,
  isFront,
  isFlipped,
  onFlip,
  onEdit,
  onToggleDinner,
  onNotesChange,
}: Props) {
  const [draftNotes, setDraftNotes] = useState(contact.notes);
  const absDiff = Math.abs(diff);
  const color = contact.color || colorForName(contact.firstName + contact.lastName);
  const fullName = [contact.firstName, contact.lastName].filter(Boolean).join(" ") || "Unnamed";

  const outerStyle: CSSProperties = {
    transform: `rotateX(${diff * stepDeg}deg) translateZ(${radius}px)`,
    opacity: absDiff > 6 ? 0 : Math.max(0.06, 1 - absDiff * 0.32),
    zIndex: 1000 - absDiff,
    // Cards share a 3D (preserve-3d) rendering context, where Chromium paints by actual
    // rotated depth rather than honoring z-index — so a background card can visually cover
    // the front one. Only the front card may receive pointer events, or taps land ambiguously.
    pointerEvents: isFront ? "auto" : "none",
  };

  return (
    <div className="drum-card-outer" style={outerStyle}>
      <div
        className={`drum-card-flip ${isFlipped && isFront ? "flipped" : ""}`}
        onClick={onFlip}
        role="button"
        tabIndex={isFront ? 0 : -1}
      >
        <div className="card-face card-front" style={{ borderTopColor: color }}>
          <div className="card-avatar" style={{ background: color }}>
            {initials(contact.firstName, contact.lastName)}
          </div>
          <h3 className="card-name">{fullName}</h3>
          {(contact.title || contact.company) && (
            <p className="card-role">
              {contact.title}
              {contact.title && contact.company ? " · " : ""}
              {contact.company}
            </p>
          )}
          {contact.industry && <span className="card-industry-tag">{contact.industry}</span>}
          <div className="card-contact-lines">
            {contact.email && <p className="card-line">✉ {contact.email}</p>}
            {contact.phone && <p className="card-line">☎ {contact.phone}</p>}
          </div>
          {contact.isDinnerGuest && <div className="card-dinner-badge" title="Dinner club guest">🍽️</div>}
          {isFront && <p className="card-flip-hint">tap to flip →</p>}
        </div>

        <div className="card-face card-back" style={{ borderTopColor: color }} onClick={(e) => e.stopPropagation()}>
          <div className="card-back-header">
            <h4>{fullName}</h4>
            <button type="button" className="icon-btn small" onClick={onFlip} aria-label="Flip back">
              ↺
            </button>
          </div>

          <label className="back-label">
            Notes
            <textarea
              value={draftNotes}
              onChange={(e) => setDraftNotes(e.target.value)}
              onBlur={() => onNotesChange(draftNotes)}
              placeholder="Notes to remember…"
              rows={4}
            />
          </label>

          <div className="back-row">
            <span className="back-industry">{contact.industry || "No industry set"}</span>
            <button
              type="button"
              className={`chip-toggle ${contact.isDinnerGuest ? "on" : ""}`}
              onClick={onToggleDinner}
            >
              {contact.isDinnerGuest ? "🍽️ In Dinner Club" : "+ Add to Dinner Club"}
            </button>
          </div>

          <button type="button" className="btn ghost full-width" onClick={onEdit}>
            Edit full details
          </button>
        </div>
      </div>
    </div>
  );
}
