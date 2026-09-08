import { useCallback, useRef, useState } from "react";
import "./App.css";
import RolodexView from "./components/RolodexView";
import DinnerClubView from "./components/DinnerClubView";
import ContactFormModal from "./components/ContactFormModal";
import ImportModal from "./components/ImportModal";
import { useContacts, contactsToCsv, downloadFile, exportContactsJson } from "./lib/storage";
import { makeId } from "./lib/id";
import { colorForName } from "./lib/colors";
import { getMonthKey, getMonthLabel, MONTHLY_GUEST_LIMIT } from "./lib/matching";
import type { Contact, ContactInput } from "./types";

type Tab = "rolodex" | "dinner";

function App() {
  const [contacts, setContacts] = useContacts();
  const [tab, setTab] = useState<Tab>("rolodex");
  const [formTarget, setFormTarget] = useState<Contact | null | "new">(null);
  const [showImport, setShowImport] = useState(false);
  const [toast, setToast] = useState("");
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [spinResetToken, setSpinResetToken] = useState(0);

  const notify = useCallback((message: string) => {
    setToast(message);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(""), 3400);
  }, []);

  const addContact = (input: ContactInput) => {
    const now = Date.now();
    const contact: Contact = {
      ...input,
      id: makeId(),
      isDinnerGuest: false,
      dinnerNotes: "",
      dinnerMonth: "",
      color: colorForName(input.firstName + input.lastName),
      createdAt: now,
      updatedAt: now,
    };
    setContacts((prev) => [...prev, contact]);
    setFormTarget(null);
  };

  const updateContact = (id: string, input: ContactInput) => {
    setContacts((prev) =>
      prev.map((c) => (c.id === id ? { ...c, ...input, updatedAt: Date.now() } : c)),
    );
    setFormTarget(null);
  };

  const deleteContact = (id: string) => {
    setContacts((prev) => prev.filter((c) => c.id !== id));
    setFormTarget(null);
  };

  const patchContact = (id: string, patch: Partial<Contact>) => {
    setContacts((prev) =>
      prev.map((c) => (c.id === id ? { ...c, ...patch, updatedAt: Date.now() } : c)),
    );
  };

  /** Picks or un-picks someone as a networking guest for the current month, enforcing the monthly cap. */
  const toggleDinner = (id: string) => {
    const monthKey = getMonthKey();
    let blocked = false;
    let added = false;
    setContacts((prev) => {
      const target = prev.find((c) => c.id === id);
      if (!target) return prev;

      if (!target.isDinnerGuest) {
        const activeThisMonth = prev.filter((c) => c.isDinnerGuest && c.dinnerMonth === monthKey).length;
        if (activeThisMonth >= MONTHLY_GUEST_LIMIT) {
          blocked = true;
          return prev;
        }
        added = true;
        return prev.map((c) =>
          c.id === id ? { ...c, isDinnerGuest: true, dinnerMonth: monthKey, updatedAt: Date.now() } : c,
        );
      }
      return prev.map((c) => (c.id === id ? { ...c, isDinnerGuest: false, updatedAt: Date.now() } : c));
    });
    if (blocked) {
      notify(`Your ${MONTHLY_GUEST_LIMIT} networking picks for ${getMonthLabel(monthKey)} are already set — remove one first.`);
    }
    if (added) {
      setSpinResetToken((t) => t + 1);
    }
  };

  const importContacts = (inputs: ContactInput[]) => {
    const now = Date.now();
    const newContacts: Contact[] = inputs.map((input) => ({
      ...input,
      id: makeId(),
      isDinnerGuest: false,
      dinnerNotes: "",
      dinnerMonth: "",
      color: colorForName(input.firstName + input.lastName),
      createdAt: now,
      updatedAt: now,
    }));
    setContacts((prev) => [...prev, ...newContacts]);
    setShowImport(false);
  };

  const currentMonthKey = getMonthKey();
  const dinnerCount = contacts.filter((c) => c.isDinnerGuest && c.dinnerMonth === currentMonthKey).length;

  return (
    <div className="app-shell">
      <header className="app-header">
        <div className="brand">
          <span className="brand-mark">☎</span>
          <h1>Roledex</h1>
        </div>
        <nav className="tabs">
          <button
            type="button"
            className={`tab-btn ${tab === "rolodex" ? "active" : ""}`}
            onClick={() => setTab("rolodex")}
          >
            Rolodex
            <span className="tab-count">{contacts.length}</span>
          </button>
          <button
            type="button"
            className={`tab-btn ${tab === "dinner" ? "active" : ""}`}
            onClick={() => setTab("dinner")}
          >
            The Dinner Guest
            <span className="tab-count">{dinnerCount}/{MONTHLY_GUEST_LIMIT}</span>
          </button>
        </nav>
        <div className="header-actions">
          <button
            type="button"
            className="btn ghost small"
            title="Download a backup of all contacts"
            onClick={() => downloadFile("roledex-contacts.json", exportContactsJson(contacts), "application/json")}
          >
            JSON
          </button>
          <button
            type="button"
            className="btn ghost small"
            title="Download contacts as a spreadsheet"
            onClick={() => downloadFile("roledex-contacts.csv", contactsToCsv(contacts), "text/csv")}
          >
            CSV
          </button>
        </div>
      </header>

      <main className="app-main">
        {tab === "rolodex" ? (
          <RolodexView
            contacts={contacts}
            onAddNew={() => setFormTarget("new")}
            onImport={() => setShowImport(true)}
            onEdit={(c) => setFormTarget(c)}
            onToggleDinner={toggleDinner}
            onPatch={patchContact}
            spinResetToken={spinResetToken}
          />
        ) : (
          <DinnerClubView
            contacts={contacts}
            onEdit={(c) => setFormTarget(c)}
            onToggleDinner={toggleDinner}
            onPatch={patchContact}
            notify={notify}
          />
        )}
      </main>

      {formTarget !== null && (
        <ContactFormModal
          initial={formTarget === "new" ? null : formTarget}
          onSave={(input) => {
            if (formTarget === "new") addContact(input);
            else updateContact(formTarget.id, input);
          }}
          onDelete={formTarget !== "new" ? () => deleteContact(formTarget.id) : undefined}
          onClose={() => setFormTarget(null)}
        />
      )}

      {showImport && (
        <ImportModal existing={contacts} onImport={importContacts} onClose={() => setShowImport(false)} />
      )}

      {toast && <div className="toast">{toast}</div>}
    </div>
  );
}

export default App;
