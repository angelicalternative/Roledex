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
  /** Optional data URL for a headshot. Empty string when the contact has no photo. */
  photoUrl: string;
  /** True while this person is one of the current (or a past) month's networking picks. */
  isDinnerGuest: boolean;
  dinnerNotes: string;
  /** "YYYY-MM" of the month they were picked for. Empty until they're ever picked. */
  dinnerMonth: string;
  color: string;
  createdAt: number;
  updatedAt: number;
}

export type ContactInput = Omit<
  Contact,
  "id" | "createdAt" | "updatedAt" | "color" | "isDinnerGuest" | "dinnerNotes" | "dinnerMonth"
>;

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
