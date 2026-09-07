export interface Contact {
  id: string;
  firstName: string;
  lastName: string;
  company: string;
  title: string;
  industry: string;
  email: string;
  phone: string;
  notes: string;
  isDinnerGuest: boolean;
  dinnerNotes: string;
  color: string;
  createdAt: number;
  updatedAt: number;
}

export type ContactInput = Omit<Contact, "id" | "createdAt" | "updatedAt" | "color">;

export const INDUSTRY_OPTIONS = [
  "Technology",
  "Finance",
  "Healthcare",
  "Education",
  "Legal",
  "Marketing & Media",
  "Design & Creative",
  "Real Estate",
  "Hospitality & Food",
  "Nonprofit",
  "Government",
  "Retail",
  "Manufacturing",
  "Consulting",
  "Arts & Entertainment",
  "Other",
] as const;
