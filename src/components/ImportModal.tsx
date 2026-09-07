import { useRef, useState, type ChangeEvent, type DragEvent } from "react";
import type { Contact, ContactInput } from "../types";
import { isLikelyDuplicate, parseImportText, type ImportResult } from "../lib/importers";

interface Props {
  existing: Contact[];
  onImport: (contacts: ContactInput[]) => void;
  onClose: () => void;
}

export default function ImportModal({ existing, onImport, onClose }: Props) {
  const [result, setResult] = useState<ImportResult | null>(null);
  const [skipDuplicates, setSkipDuplicates] = useState(true);
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleText = (text: string) => {
    const parsed = parseImportText(text);
    if (parsed.contacts.length === 0) {
      setError("Couldn't find any contacts in that file. Supported formats: CSV export (Google/Apple/Outlook) or vCard (.vcf).");
      setResult(null);
      return;
    }
    setError("");
    setResult(parsed);
  };

  const handleFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => handleText(String(reader.result ?? ""));
    reader.readAsText(file);
  };

  const onFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  };

  const onDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleFile(file);
  };

  const duplicateCount = result
    ? result.contacts.filter((c) => isLikelyDuplicate(existing, c)).length
    : 0;

  const finalContacts = result
    ? skipDuplicates
      ? result.contacts.filter((c) => !isLikelyDuplicate(existing, c))
      : result.contacts
    : [];

  const confirmImport = () => {
    if (finalContacts.length === 0) return;
    onImport(finalContacts);
  };

  return (
    <div className="modal-backdrop" onMouseDown={onClose}>
      <div className="modal import-modal" onMouseDown={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Import Contacts</h2>
          <button type="button" className="icon-btn" onClick={onClose} aria-label="Close">
            ✕
          </button>
        </div>

        {!result && (
          <>
            <div
              className={`dropzone ${dragOver ? "drag-over" : ""}`}
              onDragOver={(e) => {
                e.preventDefault();
                setDragOver(true);
              }}
              onDragLeave={() => setDragOver(false)}
              onDrop={onDrop}
              onClick={() => fileInputRef.current?.click()}
            >
              <p className="dropzone-title">Drop a .csv or .vcf file here, or click to browse</p>
              <p className="dropzone-sub">
                Exported from Google Contacts, Apple Contacts, Outlook, or any address book.
              </p>
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,.vcf,text/csv,text/vcard"
                hidden
                onChange={onFileChange}
              />
            </div>

            <div className="or-divider">or paste it below</div>

            <textarea
              className="paste-area"
              rows={6}
              placeholder="Paste CSV rows or vCard text here…"
              onChange={(e) => {
                if (e.target.value.trim()) handleText(e.target.value);
              }}
            />

            {error && <p className="import-error">{error}</p>}
          </>
        )}

        {result && (
          <div className="import-preview">
            <p className="preview-summary">
              Found <strong>{result.contacts.length}</strong> contact
              {result.contacts.length === 1 ? "" : "s"} in this {result.format === "vcard" ? "vCard" : "CSV"} file
              {result.skipped > 0 ? ` (${result.skipped} row${result.skipped === 1 ? "" : "s"} skipped, no name/contact info)` : ""}.
            </p>

            {duplicateCount > 0 && (
              <label className="checkbox-row">
                <input
                  type="checkbox"
                  checked={skipDuplicates}
                  onChange={(e) => setSkipDuplicates(e.target.checked)}
                />
                Skip {duplicateCount} that look like duplicates of contacts you already have
              </label>
            )}

            <div className="preview-table-wrap">
              <table className="preview-table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Company</th>
                    <th>Email</th>
                    <th>Phone</th>
                  </tr>
                </thead>
                <tbody>
                  {result.contacts.slice(0, 50).map((c, i) => {
                    const dup = isLikelyDuplicate(existing, c);
                    return (
                      <tr key={i} className={dup && skipDuplicates ? "row-skipped" : ""}>
                        <td>{[c.firstName, c.lastName].filter(Boolean).join(" ") || "—"}</td>
                        <td>{c.company || "—"}</td>
                        <td>{c.email || "—"}</td>
                        <td>{c.phone || "—"}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              {result.contacts.length > 50 && (
                <p className="preview-more">…and {result.contacts.length - 50} more</p>
              )}
            </div>

            <div className="modal-actions">
              <button
                type="button"
                className="btn ghost"
                onClick={() => {
                  setResult(null);
                  setError("");
                }}
              >
                Back
              </button>
              <div className="spacer" />
              <button type="button" className="btn ghost" onClick={onClose}>
                Cancel
              </button>
              <button
                type="button"
                className="btn primary"
                disabled={finalContacts.length === 0}
                onClick={confirmImport}
              >
                Import {finalContacts.length} contact{finalContacts.length === 1 ? "" : "s"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
