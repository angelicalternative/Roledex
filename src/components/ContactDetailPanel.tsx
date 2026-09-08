import { useState } from "react";
import type { Contact } from "../types";
import { PLACE_TYPE_OPTIONS } from "../types";
import { colorForName, initials } from "../lib/colors";

interface Props {
  contact: Contact;
  onEdit: () => void;
  onToggleDinner: () => void;
  onPatch: (patch: Partial<Contact>) => void;
}

function Field({ label, value }: { label: string; value: string }) {
  if (!value) return null;
  return (
    <div className="id-field">
      <span className="id-field-value">{value}</span>
      <span className="id-field-label">{label}</span>
    </div>
  );
}

// The caller renders this with key={contact.id}, so a new contact means a fresh
// mount — draft state never needs to be resynced after the fact.
export default function ContactDetailPanel({ contact, onEdit, onToggleDinner, onPatch }: Props) {
  const [draftNotes, setDraftNotes] = useState(contact.notes);
  const [draftDining, setDraftDining] = useState(contact.diningNotes || "");

  const color = contact.color || colorForName(contact.firstName + contact.lastName);
  const fullName = [contact.firstName, contact.lastName].filter(Boolean).join(" ") || "Unnamed";
  const roleLine = [contact.title, contact.company].filter(Boolean).join(" · ");

  const togglePlaceType = (opt: string) => {
    const placeTypes = contact.placeTypes || [];
    onPatch({
      placeTypes: placeTypes.includes(opt) ? placeTypes.filter((p) => p !== opt) : [...placeTypes, opt],
    });
  };

  return (
    <div className="id-card">
      <p className="id-card-title">Contact Card</p>

      <div className="id-card-body">
        {contact.photoUrl ? (
          <img className="id-photo" src={contact.photoUrl} alt="" />
        ) : (
          <div className="id-photo-fallback" style={{ background: color }}>
            {initials(contact.firstName, contact.lastName)}
          </div>
        )}

        <div className="id-fields">
          <Field label="Full Name" value={fullName} />
          <Field label="Role" value={roleLine} />
          <Field label="Industry" value={contact.industry} />
          <Field label="Email" value={contact.email} />
          <Field label="Phone" value={contact.phone} />
        </div>
      </div>

      <label className="back-label">
        Notes
        <textarea
          value={draftNotes}
          onChange={(e) => setDraftNotes(e.target.value)}
          onBlur={() => onPatch({ notes: draftNotes })}
          placeholder="Notes to remember…"
          rows={3}
        />
      </label>

      <label className="back-label">
        Where they'd like to eat
        <textarea
          value={draftDining}
          onChange={(e) => setDraftDining(e.target.value)}
          onBlur={() => onPatch({ diningNotes: draftDining })}
          placeholder="A favorite spot, an allergy, a craving they mentioned…"
          rows={2}
        />
      </label>

      <div className="id-place-types">
        <span className="field-label">Kinds of places</span>
        <div className="place-type-grid">
          {PLACE_TYPE_OPTIONS.map((opt) => (
            <button
              type="button"
              key={opt}
              className={`chip-toggle ${(contact.placeTypes || []).includes(opt) ? "on" : ""}`}
              onClick={() => togglePlaceType(opt)}
            >
              {opt}
            </button>
          ))}
        </div>
      </div>

      <div className="detail-actions">
        <button type="button" className={`chip-toggle ${contact.isDinnerGuest ? "on" : ""}`} onClick={onToggleDinner}>
          {contact.isDinnerGuest ? "🍽 In Dinner Club" : "+ Add to Dinner Club"}
        </button>
        <button type="button" className="btn ghost" onClick={onEdit}>
          Edit
        </button>
      </div>
    </div>
  );
}
