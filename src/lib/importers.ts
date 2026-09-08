import type { Contact, ContactInput } from "../types";

export interface ImportResult {
  contacts: ContactInput[];
  skipped: number;
  format: "csv" | "vcard" | "unknown";
}

function blankInput(): ContactInput {
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

/** Parses raw CSV text into a matrix of strings, handling quoted fields, escaped quotes, and CRLF/LF. */
function parseCsvMatrix(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;
  let i = 0;
  const len = text.length;

  const pushField = () => {
    row.push(field);
    field = "";
  };
  const pushRow = () => {
    pushField();
    rows.push(row);
    row = [];
  };

  while (i < len) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i += 2;
          continue;
        }
        inQuotes = false;
        i++;
        continue;
      }
      field += ch;
      i++;
      continue;
    }
    if (ch === '"') {
      inQuotes = true;
      i++;
      continue;
    }
    if (ch === ",") {
      pushField();
      i++;
      continue;
    }
    if (ch === "\r") {
      i++;
      continue;
    }
    if (ch === "\n") {
      pushRow();
      i++;
      continue;
    }
    field += ch;
    i++;
  }
  if (field.length > 0 || row.length > 0) {
    pushRow();
  }
  return rows.filter((r) => r.some((f) => f.trim().length > 0));
}

function findColumn(headers: string[], matchers: ((h: string) => boolean)[]): number {
  for (const matcher of matchers) {
    const idx = headers.findIndex(matcher);
    if (idx !== -1) return idx;
  }
  return -1;
}

export function parseCsv(text: string): ImportResult {
  const matrix = parseCsvMatrix(text);
  if (matrix.length === 0) return { contacts: [], skipped: 0, format: "csv" };

  const headers = matrix[0].map((h) => h.trim().toLowerCase());
  const dataRows = matrix.slice(1);

  const nameIdx = findColumn(headers, [
    (h) => h === "name" || h === "full name" || h === "display name",
  ]);
  const firstIdx = findColumn(headers, [
    (h) => h.includes("first name") || h === "given name" || h === "firstname",
  ]);
  const lastIdx = findColumn(headers, [
    (h) => h.includes("last name") || h === "family name" || h === "surname" || h === "lastname",
  ]);
  const companyIdx = findColumn(headers, [
    (h) => h.includes("company") || h.includes("organization name") || h === "organization" || h === "org",
  ]);
  const titleIdx = findColumn(headers, [(h) => h.includes("title") && !h.includes("prefix")]);
  const industryIdx = findColumn(headers, [(h) => h.includes("industry")]);
  const notesIdx = findColumn(headers, [(h) => h.includes("note")]);

  const emailIdxs = headers
    .map((h, i) => (h.includes("email") || h.includes("e-mail") ? i : -1))
    .filter((i) => i !== -1);
  const phoneIdxs = headers.map((h, i) => (h.includes("phone") ? i : -1)).filter((i) => i !== -1);

  const contacts: ContactInput[] = [];
  let skipped = 0;

  for (const row of dataRows) {
    const get = (idx: number) => (idx >= 0 && idx < row.length ? row[idx].trim() : "");
    const input = blankInput();

    if (firstIdx !== -1 || lastIdx !== -1) {
      input.firstName = get(firstIdx);
      input.lastName = get(lastIdx);
    }
    if (!input.firstName && !input.lastName && nameIdx !== -1) {
      const full = get(nameIdx);
      const parts = full.split(/\s+/).filter(Boolean);
      input.firstName = parts[0] ?? "";
      input.lastName = parts.slice(1).join(" ");
    }

    input.company = get(companyIdx);
    input.title = get(titleIdx);
    input.industry = get(industryIdx);
    input.notes = get(notesIdx);
    input.email = emailIdxs.map(get).find((v) => v) ?? "";
    input.phone = phoneIdxs.map(get).find((v) => v) ?? "";

    if (!input.firstName && !input.lastName && !input.email && !input.phone) {
      skipped++;
      continue;
    }
    contacts.push(input);
  }

  return { contacts, skipped, format: "csv" };
}

function unescapeVCardValue(v: string): string {
  return v
    .replace(/\\n/gi, "\n")
    .replace(/\\,/g, ",")
    .replace(/\\;/g, ";")
    .replace(/\\\\/g, "\\");
}

function unfoldVCardLines(text: string): string[] {
  const rawLines = text.split(/\r\n|\r|\n/);
  const lines: string[] = [];
  for (const line of rawLines) {
    if ((line.startsWith(" ") || line.startsWith("\t")) && lines.length > 0) {
      lines[lines.length - 1] += line.slice(1);
    } else {
      lines.push(line);
    }
  }
  return lines;
}

export function parseVCard(text: string): ImportResult {
  const lines = unfoldVCardLines(text);
  const contacts: ContactInput[] = [];
  let current: ContactInput | null = null;
  let skipped = 0;

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) continue;
    if (/^BEGIN:VCARD$/i.test(line)) {
      current = blankInput();
      continue;
    }
    if (/^END:VCARD$/i.test(line)) {
      if (current && (current.firstName || current.lastName || current.email || current.phone)) {
        contacts.push(current);
      } else {
        skipped++;
      }
      current = null;
      continue;
    }
    if (!current) continue;

    const colonIdx = line.indexOf(":");
    if (colonIdx === -1) continue;
    const keyPart = line.slice(0, colonIdx);
    const value = unescapeVCardValue(line.slice(colonIdx + 1));
    const baseKey = keyPart.split(";")[0].toUpperCase();

    switch (baseKey) {
      case "N": {
        const parts = value.split(";");
        if (!current.lastName) current.lastName = parts[0] ?? "";
        if (!current.firstName) current.firstName = parts[1] ?? "";
        break;
      }
      case "FN": {
        if (!current.firstName && !current.lastName) {
          const parts = value.split(/\s+/).filter(Boolean);
          current.firstName = parts[0] ?? "";
          current.lastName = parts.slice(1).join(" ");
        }
        break;
      }
      case "ORG": {
        current.company = value.split(";")[0] ?? "";
        break;
      }
      case "TITLE": {
        current.title = value;
        break;
      }
      case "EMAIL": {
        if (!current.email) current.email = value;
        break;
      }
      case "TEL": {
        if (!current.phone) current.phone = value;
        break;
      }
      case "NOTE": {
        current.notes = current.notes ? `${current.notes}\n${value}` : value;
        break;
      }
      default:
        break;
    }
  }

  return { contacts, skipped, format: "vcard" };
}

export function parseImportText(text: string): ImportResult {
  const trimmed = text.trim();
  if (/^BEGIN:VCARD/i.test(trimmed)) {
    return parseVCard(text);
  }
  if (trimmed.length === 0) {
    return { contacts: [], skipped: 0, format: "unknown" };
  }
  return parseCsv(text);
}

function normalize(v: string): string {
  return v.trim().toLowerCase().replace(/[^a-z0-9]/g, "");
}

/** Returns true if `candidate` looks like an existing contact (same email, phone, or full name). */
export function isLikelyDuplicate(existing: Contact[], candidate: ContactInput): boolean {
  const email = normalize(candidate.email);
  const phone = normalize(candidate.phone);
  const fullName = normalize(`${candidate.firstName}${candidate.lastName}`);

  return existing.some((c) => {
    if (email && normalize(c.email) === email) return true;
    if (phone && normalize(c.phone) === phone) return true;
    if (fullName && normalize(`${c.firstName}${c.lastName}`) === fullName) return true;
    return false;
  });
}
