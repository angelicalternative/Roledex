import { useState } from "react";
import "./App.css";
import RolodexView from "./components/RolodexView";
import DinnerClubView from "./components/DinnerClubView";
import ContactFormModal from "./components/ContactFormModal";
import ImportModal from "./components/ImportModal";
import { useContacts, contactsToCsv, downloadFile, exportContactsJson } from "./lib/storage";
import { makeId } from "./lib/id";
import { colorForName } from "./lib/colors";
import type { Contact, ContactInput } from "./types";

type Tab = "rolodex" | "dinner";

function App() {
  const [contacts, setContacts] = useContacts();
  const [tab, setTab] = useState<Tab>("rolodex");
  const [formTarget, setFormTarget] = useState<Contact | null | "new">(null);
  const [showImport, setShowImport] = useState(false);

  const addContact = (input: ContactInput) => {
    const now = Date.now();
    const contact: Contact = {
      ...input,
      id: makeId(),
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

  const toggleDinner = (id: string) => {
    setContacts((prev) =>
      prev.map((c) => (c.id === id ? { ...c, isDinnerGuest: !c.isDinnerGuest, updatedAt: Date.now() } : c)),
    );
  };

  const importContacts = (inputs: ContactInput[]) => {
    const now = Date.now();
    const newContacts: Contact[] = inputs.map((input) => ({
      ...input,
      id: makeId(),
      color: colorForName(input.firstName + input.lastName),
      createdAt: now,
      updatedAt: now,
    }));
    setContacts((prev) => [...prev, ...newContacts]);
    setShowImport(false);
  };

  const dinnerCount = contacts.filter((c) => c.isDinnerGuest).length;

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
            <span className="tab-count">{dinnerCount}</span>
          </button>
        </nav>
        <div className="header-actions">
          <button
            type="button"
            className="btn ghost small"
            title="Download a backup of all contacts"
            onClick={() => downloadFile("roledex-contacts.json", exportContactsJson(contacts), "application/json")}
          >
            Export JSON
          </button>
          <button
            type="button"
            className="btn ghost small"
            title="Download contacts as a spreadsheet"
            onClick={() => downloadFile("roledex-contacts.csv", contactsToCsv(contacts), "text/csv")}
          >
            Export CSV
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
          />
        ) : (
          <DinnerClubView
            contacts={contacts}
            onEdit={(c) => setFormTarget(c)}
            onToggleDinner={toggleDinner}
            onPatch={patchContact}
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
    </div>
  );
}

export default App;
