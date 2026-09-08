import { useEffect, useMemo, useState, type FormEvent } from "react";
import type { Contact } from "../types";
import Avatar from "./Avatar";
import { useDinnerGoals } from "../lib/storage";
import { findMatches, getMonthKey, getMonthLabel, MONTHLY_GUEST_LIMIT, type Match } from "../lib/matching";

interface Props {
  contacts: Contact[];
  onEdit: (contact: Contact) => void;
  onToggleDinner: (id: string) => void;
  onPatch: (id: string, patch: Partial<Contact>) => void;
  notify: (message: string) => void;
}

const FIELD_LABELS: Record<string, string> = {
  industry: "industry",
  title: "title",
  company: "company",
  notes: "notes",
};

function GuestCard({
  guest,
  monthTag,
  onEdit,
  onToggleDinner,
  onPatch,
}: {
  guest: Contact;
  monthTag: string;
  onEdit: () => void;
  onToggleDinner: () => void;
  onPatch: (patch: Partial<Contact>) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(guest.dinnerNotes);
  const fullName = [guest.firstName, guest.lastName].filter(Boolean).join(" ") || "Unnamed";

  return (
    <div className="dinner-card">
      <div className="dinner-card-top">
        <Avatar contact={guest} />
        <div>
          <div className="dinner-card-name-row">
            <h3>{fullName}</h3>
            <span className="dinner-month-tag">{monthTag}</span>
          </div>
          {(guest.title || guest.company) && (
            <p className="card-role">
              {guest.title}
              {guest.title && guest.company ? " · " : ""}
              {guest.company}
            </p>
          )}
          {guest.industry && <span className="card-industry-tag">{guest.industry}</span>}
        </div>
      </div>

      <div className="dinner-notes-block">
        <span className="dinner-notes-label">Dinner club notes</span>
        {editing ? (
          <textarea
            autoFocus
            rows={2}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={() => {
              onPatch({ dinnerNotes: draft });
              setEditing(false);
            }}
          />
        ) : (
          <p
            className="dinner-notes-text"
            onClick={() => {
              setDraft(guest.dinnerNotes);
              setEditing(true);
            }}
          >
            {guest.dinnerNotes || "Click to add notes (allergies, favorite cuisine…)"}
          </p>
        )}
      </div>

      <div className="dinner-card-actions">
        <button type="button" className="btn ghost" onClick={onEdit}>
          Edit
        </button>
        <button type="button" className="chip-toggle on" onClick={onToggleDinner}>
          Remove
        </button>
      </div>
    </div>
  );
}

export default function DinnerClubView({ contacts, onEdit, onToggleDinner, onPatch, notify }: Props) {
  const monthKey = getMonthKey();
  const monthLabel = getMonthLabel(monthKey);
  const [goals, setGoals] = useDinnerGoals();
  const currentGoal = goals[monthKey] || "";
  const [draftGoal, setDraftGoal] = useState(currentGoal);
  const [browseAll, setBrowseAll] = useState(false);

  useEffect(() => {
    setDraftGoal(currentGoal);
    setBrowseAll(false);
    // Only reset the draft when the month itself changes, not on every keystroke persist.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [monthKey]);

  const currentGuests = useMemo(
    () =>
      contacts
        .filter((c) => c.isDinnerGuest && c.dinnerMonth === monthKey)
        .sort((a, b) => (a.lastName || a.firstName).localeCompare(b.lastName || b.firstName)),
    [contacts, monthKey],
  );

  const pastGuests = useMemo(
    () =>
      contacts
        .filter((c) => c.isDinnerGuest && c.dinnerMonth && c.dinnerMonth !== monthKey)
        .sort((a, b) => b.dinnerMonth.localeCompare(a.dinnerMonth) || a.lastName.localeCompare(b.lastName)),
    [contacts, monthKey],
  );

  const candidatePool = useMemo(
    () => contacts.filter((c) => !(c.isDinnerGuest && c.dinnerMonth === monthKey)),
    [contacts, monthKey],
  );

  const matches = useMemo(() => findMatches(candidatePool, currentGoal, 3), [candidatePool, currentGoal]);

  const browseList = useMemo(
    () =>
      [...candidatePool].sort((a, b) => (a.lastName || a.firstName).localeCompare(b.lastName || b.firstName)),
    [candidatePool],
  );

  const capReached = currentGuests.length >= MONTHLY_GUEST_LIMIT;
  const showingList: Match[] = browseAll ? browseList.map((c) => ({ contact: c, score: 0, matchedFields: [] })) : matches;

  const handleSaveGoal = (e: FormEvent) => {
    e.preventDefault();
    const trimmed = draftGoal.trim();
    setGoals((prev) => ({ ...prev, [monthKey]: trimmed }));
    if (trimmed) notify(`Looking for matches on: "${trimmed}"`);
  };

  const handleInvite = (id: string, name: string) => {
    onToggleDinner(id);
    notify(`Invited ${name} for ${monthLabel}.`);
  };

  return (
    <div className="dinner-view">
      <div className="dinner-header">
        <h2>The Dinner Guest Club</h2>
        <p className="dinner-sub">
          Each month, pick {MONTHLY_GUEST_LIMIT} people from your Rolodex to bring to dinner and grow the
          network. Say what you're networking for this month and we'll suggest who from your contacts fits.
        </p>
      </div>

      <section className="dinner-month-panel">
        <div className="dinner-month-heading">
          <h3>{monthLabel}</h3>
          <span className="dinner-month-count">
            {currentGuests.length} / {MONTHLY_GUEST_LIMIT} picked
          </span>
        </div>

        {currentGuests.length > 0 && (
          <div className="dinner-grid">
            {currentGuests.map((g) => (
              <GuestCard
                key={g.id}
                guest={g}
                monthTag="This month"
                onEdit={() => onEdit(g)}
                onToggleDinner={() => onToggleDinner(g.id)}
                onPatch={(patch) => onPatch(g.id, patch)}
              />
            ))}
          </div>
        )}

        {capReached ? (
          <p className="dinner-cap-note">
            Your {MONTHLY_GUEST_LIMIT} networking picks for {monthLabel} are locked in. Remove one above to
            free up a spot.
          </p>
        ) : (
          <div className="match-finder">
            <form onSubmit={handleSaveGoal} className="match-goal-form">
              <label className="full-width">
                What are you networking for this month?
                <textarea
                  rows={2}
                  value={draftGoal}
                  onChange={(e) => setDraftGoal(e.target.value)}
                  placeholder="e.g. Trying to break into fintech — want an intro to someone who's raised a seed round."
                />
              </label>
              <button type="submit" className="btn primary">
                Find a match
              </button>
            </form>

            {currentGoal && (
              <div className="match-results">
                <div className="match-results-head">
                  <span>
                    {browseAll
                      ? "All available contacts"
                      : matches.length > 0
                        ? "Best fits for this month"
                        : "No strong matches yet"}
                  </span>
                  <button type="button" className="link-btn" onClick={() => setBrowseAll((b) => !b)}>
                    {browseAll ? "Back to suggested matches" : "Browse everyone instead"}
                  </button>
                </div>

                {!browseAll && matches.length === 0 && (
                  <p className="empty-sub">
                    Nobody's industry, title, company, or notes mention that yet. Try different words, add
                    more detail to a contact's card, or browse everyone instead.
                  </p>
                )}

                {showingList.length > 0 && (
                  <ul className="match-list">
                    {showingList.map(({ contact, matchedFields }) => {
                      const fullName =
                        [contact.firstName, contact.lastName].filter(Boolean).join(" ") || "Unnamed";
                      return (
                        <li key={contact.id} className="match-row">
                          <Avatar contact={contact} small />
                          <div className="match-info">
                            <strong>{fullName}</strong>
                            <span className="match-meta">
                              {[contact.title, contact.company].filter(Boolean).join(" · ") || contact.industry || "—"}
                            </span>
                            {matchedFields.length > 0 && (
                              <span className="match-why">
                                Matches on {matchedFields.map((f) => FIELD_LABELS[f] || f).join(", ")}
                              </span>
                            )}
                          </div>
                          <button
                            type="button"
                            className="btn small primary"
                            onClick={() => handleInvite(contact.id, fullName)}
                          >
                            Invite
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            )}
          </div>
        )}
      </section>

      {pastGuests.length > 0 && (
        <section className="dinner-history">
          <h3>Past picks</h3>
          <div className="dinner-grid">
            {pastGuests.map((g) => (
              <GuestCard
                key={g.id}
                guest={g}
                monthTag={getMonthLabel(g.dinnerMonth)}
                onEdit={() => onEdit(g)}
                onToggleDinner={() => onToggleDinner(g.id)}
                onPatch={(patch) => onPatch(g.id, patch)}
              />
            ))}
          </div>
        </section>
      )}

      {contacts.length === 0 && (
        <div className="empty-state">
          <p className="empty-title">Your Rolodex is empty</p>
          <p className="empty-sub">Add a few contacts first — then we can suggest who to invite each month.</p>
        </div>
      )}
    </div>
  );
}
