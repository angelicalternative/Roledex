import { useMemo, useState } from "react";
import type { Contact } from "../types";
import { colorForName, initials } from "../lib/colors";

interface Props {
  contacts: Contact[];
  onEdit: (contact: Contact) => void;
  onToggleDinner: (id: string) => void;
  onPatch: (id: string, patch: Partial<Contact>) => void;
}

export default function DinnerClubView({ contacts, onEdit, onToggleDinner, onPatch }: Props) {
  const guests = useMemo(
    () =>
      contacts
        .filter((c) => c.isDinnerGuest)
        .sort((a, b) => (a.lastName || a.firstName).localeCompare(b.lastName || b.firstName)),
    [contacts],
  );
  const [editingNotesId, setEditingNotesId] = useState<string | null>(null);
  const [draft, setDraft] = useState("");

  return (
    <div className="dinner-view">
      <div className="dinner-header">
        <h2>The Dinner Guest Club 🍽️</h2>
        <p className="dinner-sub">
          Everyone here has been pulled out of your Rolodex as someone who should join the next dinner club
          outing. Flip any contact card and hit "Add to Dinner Club" to invite them here.
        </p>
      </div>

      {guests.length === 0 ? (
        <div className="empty-state">
          <p className="empty-title">No dinner guests yet</p>
          <p className="empty-sub">
            Head back to the Rolodex, flip a contact's card, and tap "Add to Dinner Club" to build your guest
            list.
          </p>
        </div>
      ) : (
        <div className="dinner-grid">
          {guests.map((g) => {
            const color = g.color || colorForName(g.firstName + g.lastName);
            const fullName = [g.firstName, g.lastName].filter(Boolean).join(" ") || "Unnamed";
            const isEditing = editingNotesId === g.id;
            return (
              <div className="dinner-card" key={g.id} style={{ borderTopColor: color }}>
                <div className="dinner-card-top">
                  <div className="card-avatar" style={{ background: color }}>
                    {initials(g.firstName, g.lastName)}
                  </div>
                  <div>
                    <h3>{fullName}</h3>
                    {(g.title || g.company) && (
                      <p className="card-role">
                        {g.title}
                        {g.title && g.company ? " · " : ""}
                        {g.company}
                      </p>
                    )}
                    {g.industry && <span className="card-industry-tag">{g.industry}</span>}
                  </div>
                </div>

                <div className="dinner-notes-block">
                  <span className="dinner-notes-label">Dinner club notes</span>
                  {isEditing ? (
                    <textarea
                      autoFocus
                      rows={2}
                      value={draft}
                      onChange={(e) => setDraft(e.target.value)}
                      onBlur={() => {
                        onPatch(g.id, { dinnerNotes: draft });
                        setEditingNotesId(null);
                      }}
                    />
                  ) : (
                    <p
                      className="dinner-notes-text"
                      onClick={() => {
                        setDraft(g.dinnerNotes);
                        setEditingNotesId(g.id);
                      }}
                    >
                      {g.dinnerNotes || "Click to add notes (allergies, favorite cuisine…)"}
                    </p>
                  )}
                </div>

                <div className="dinner-card-actions">
                  <button type="button" className="btn ghost" onClick={() => onEdit(g)}>
                    Edit
                  </button>
                  <button type="button" className="chip-toggle on" onClick={() => onToggleDinner(g.id)}>
                    Remove from club
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
