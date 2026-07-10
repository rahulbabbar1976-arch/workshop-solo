"use client";

export type ContactToSave = {
  name: string;
  phone: string;
  email?: string;
  company?: string;
};

export function useSaveContact() {
  const saveContact = async (contact: ContactToSave): Promise<boolean> => {
    try {
      const vcard = [
        'BEGIN:VCARD',
        'VERSION:3.0',
        `FN:${contact.name}`,
        `N:${contact.name};;;`,
        contact.phone   ? `TEL;TYPE=CELL:${contact.phone}` : '',
        contact.email   ? `EMAIL:${contact.email}` : '',
        contact.company ? `ORG:${contact.company}` : '',
        'END:VCARD',
      ].filter(Boolean).join('\r\n');

      const blob = new Blob([vcard], { type: 'text/vcard' });
      const url  = URL.createObjectURL(blob);

      // Try Web Share API first (shows native share sheet on mobile)
      if (navigator.share) {
        await navigator.share({
          files: [new File([blob], `${contact.name}.vcf`, { type: 'text/vcard' })],
        });
      } else {
        // Fallback: trigger a .vcf file download
        const a = document.createElement('a');
        a.href = url;
        a.download = `${contact.name}.vcf`;
        a.click();
      }

      URL.revokeObjectURL(url);
      return true;
    } catch (e) {
      console.warn('Save contact error:', e);
      return false;
    }
  };

  return { saveContact };
}
