"use client";
import { useState } from "react";

export type ContactData = {
  name: string;
  phone: string;
  email: string;
};

export function useContactPicker() {
  const [isSupported] = useState(
    typeof navigator !== 'undefined' &&
      'contacts' in navigator &&
      'ContactsManager' in window
  );

  const pickContact = async (): Promise<ContactData | null> => {
    if (!isSupported) return null;
    try {
      const props = ['name', 'tel', 'email'];
      const opts = { multiple: false };
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const contacts = await (navigator as any).contacts.select(props, opts);
      if (!contacts || contacts.length === 0) return null;
      const c = contacts[0];
      return {
        name:  c.name?.[0]  ?? '',
        phone: c.tel?.[0]   ?? '',
        email: c.email?.[0] ?? '',
      };
    } catch (e) {
      console.warn('Contact picker error:', e);
      return null;
    }
  };

  return { isSupported, pickContact };
}
