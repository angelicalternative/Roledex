import { useRef, useState, type ChangeEvent, type FormEvent } from "react";
import type { Contact, ContactInput } from "../types";
import { INDUSTRY_OPTIONS } from "../types";
import { colorForName, initials } from "../lib/colors";
import { resizeImageFile } from "../lib/photo";

interface Props {
  initial?: Contact | null;
  onSave: (input: ContactInput) => void;
  onDelete?: () => void;
  onClose: () => void;
}

function toInput(c?: Contact | null): ContactInput {
  if (!c) {
    return {
      firstName: "",
      lastName: "",
      company: "",
      title: "",
      industry: "",
      email: "",
      phone: "",
      notes: "",
      photoUrl: "",
    };
  }
  const {
    id: _id,
    createdAt: _c,
    updatedAt: _u,
    color: _col,
    isDinnerGuest: _idg,
    dinnerNotes: _dn,
    dinnerMonth: _dm,
    ...rest
  } = c;
  return rest;
}

export default function ContactFormModal({ initial, onSave, onDelete, onClose }: Props) {
  const [form, setForm] = useState<ContactInput>(() => toInput(initial));
  const [photoError, setPhotoError] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const isEdit = Boolean(initial);

  const set = <K extends keyof ContactInput>(key: K, value: ContactInput[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  const handlePhotoChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    try {
      const dataUrl = await resizeImageFile(file);
      setPhotoError("");
      set("photoUrl", dataUrl);
    } catch {
      setPhotoError("Couldn't load that photo — try a different file.");
    }
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!form.firstName.trim() && !form.lastName.trim()) return;
    onSave(form);
  };

  const avatarColor = colorForName(form.firstName + form.lastName);

  return (
    <div className="modal-backdrop" onMouseDown={onClose}>
      <div className="modal card-modal" onMouseDown={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{isEdit ? "Edit Contact" : "Add Contact"}</h2>
          <button type="button" className="icon-btn" onClick={onClose} aria-label="Close">
            ✕
          </button>
        </div>
        <form onSubmit={handleSubmit} className="contact-form">
          <div className="photo-field">
            <button
              type="button"
              className="photo-preview"
              onClick={() => fileInputRef.current?.click()}
              aria-label={form.photoUrl ? "Change photo" : "Add a photo"}
            >
              {form.photoUrl ? (
                <img src={form.photoUrl} alt="" />
              ) : (
                <span className="photo-placeholder" style={{ background: avatarColor }}>
                  {initials(form.firstName, form.lastName)}
                </span>
              )}
              <span className="photo-edit-badge">{form.photoUrl ? "Change" : "+ Add photo"}</span>
            </button>
            <input ref={fileInputRef} type="file" accept="image/*" hidden onChange={handlePhotoChange} />
            {form.photoUrl && (
              <button type="button" className="link-btn" onClick={() => set("photoUrl", "")}>
                Remove photo
              </button>
            )}
            {photoError && <p className="import-error">{photoError}</p>}
          </div>

          <div className="form-row">
            <label>
              First name
              <input
                autoFocus
                value={form.firstName}
                onChange={(e) => set("firstName", e.target.value)}
                placeholder="Ada"
              />
            </label>
            <label>
              Last name
              <input
                value={form.lastName}
                onChange={(e) => set("lastName", e.target.value)}
                placeholder="Lovelace"
              />
            </label>
          </div>

          <div className="form-row">
            <label>
              Company
              <input
                value={form.company}
                onChange={(e) => set("company", e.target.value)}
                placeholder="Analytical Engines Inc."
              />
            </label>
            <label>
              Job title
              <input
                value={form.title}
                onChange={(e) => set("title", e.target.value)}
                placeholder="Chief Mathematician"
              />
            </label>
          </div>

          <div className="form-row">
            <label>
              Email
              <input
                type="email"
                value={form.email}
                onChange={(e) => set("email", e.target.value)}
                placeholder="ada@example.com"
              />
            </label>
            <label>
              Phone
              <input
                type="tel"
                value={form.phone}
                onChange={(e) => set("phone", e.target.value)}
                placeholder="(555) 123-4567"
              />
            </label>
          </div>

          <label className="full-width">
            Industry
            <select value={form.industry} onChange={(e) => set("industry", e.target.value)}>
              <option value="">— Select industry —</option>
              {INDUSTRY_OPTIONS.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
          </label>

          <label className="full-width">
            Notes
            <textarea
              value={form.notes}
              onChange={(e) => set("notes", e.target.value)}
              placeholder="How you met, what they're into, anything worth remembering…"
              rows={3}
            />
          </label>

          <div className="modal-actions">
            {isEdit && onDelete && (
              <button type="button" className="btn danger" onClick={onDelete}>
                Delete
              </button>
            )}
            <div className="spacer" />
            <button type="button" className="btn ghost" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn primary">
              {isEdit ? "Save changes" : "Add contact"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
