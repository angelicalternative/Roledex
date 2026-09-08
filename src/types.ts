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
  /** Freeform notes on where they'd like to eat — a favorite spot, an allergy, a craving. */
  diningNotes: string;
  /** Kinds of places they're into, picked from PLACE_TYPE_OPTIONS. */
  placeTypes: string[];
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

export const PLACE_TYPE_OPTIONS = [
  "Italian",
  "Japanese / Sushi",
  "Steakhouse",
  "Seafood",
  "Vegan / Vegetarian",
  "Mexican",
  "Brunch / Café",
  "Fine Dining",
  "Casual / Comfort Food",
  "Wine / Cocktail Bar",
] as const;

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
