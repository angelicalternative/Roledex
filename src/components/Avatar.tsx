import type { Contact } from "../types";
import { colorForName, initials } from "../lib/colors";

interface Props {
  contact: Pick<Contact, "firstName" | "lastName" | "color" | "photoUrl">;
  small?: boolean;
}

/** A contact's photo when they have one, otherwise their initials on a hashed color. */
export default function Avatar({ contact, small }: Props) {
  if (contact.photoUrl) {
    return <img className={`avatar-photo ${small ? "small" : ""}`} src={contact.photoUrl} alt="" />;
  }
  const color = contact.color || colorForName(contact.firstName + contact.lastName);
  return (
    <div className={`card-avatar ${small ? "small" : ""}`} style={{ background: color }}>
      {initials(contact.firstName, contact.lastName)}
    </div>
  );
}
