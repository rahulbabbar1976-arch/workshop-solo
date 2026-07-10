// Zoho Books API Integration Library

export interface ZohoConfig {
  organizationId: string;
  clientId?: string;
  clientSecret?: string;
  refreshToken?: string;
  accessToken?: string; // If we use short-lived token generated elsewhere
}

export interface ZohoContact {
  contact_name: string;
  company_name?: string;
  contact_type?: 'customer' | 'vendor';
  billing_address?: {
    address?: string;
    city?: string;
    state?: string;
    zip?: string;
    country?: string;
  };
  custom_fields?: any[];
}

export interface ZohoItem {
  name: string;
  rate: number;
  description?: string;
  sku?: string;
  product_type?: 'goods' | 'service';
  hsn_or_sac?: string;
}

export interface ZohoInvoice {
  customer_id: string; // The ID of the contact in Zoho
  date: string; // YYYY-MM-DD
  invoice_number?: string;
  line_items: {
    item_id?: string; // If linking to existing item
    name: string;
    description?: string;
    rate: number;
    quantity: number;
    hsn_or_sac?: string;
  }[];
  notes?: string;
  terms?: string;
}

/**
 * Creates or updates a contact in Zoho Books
 */
export async function syncCustomerToZoho(config: ZohoConfig, contact: ZohoContact): Promise<string> {
  // In a real implementation, we would handle OAuth token refresh here.
  // For demonstration, we assume config.accessToken is valid.
  if (!config.accessToken || !config.organizationId) {
    throw new Error('Missing Zoho credentials');
  }

  const url = `https://books.zoho.in/api/v3/contacts?organization_id=${config.organizationId}`;
  
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Zoho-oauthtoken ${config.accessToken}`
    },
    body: JSON.stringify(contact)
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Zoho API Error: ${response.status} - ${errorText}`);
  }

  const data = await response.json();
  if (data.code !== 0) {
    throw new Error(`Zoho Error: ${data.message}`);
  }

  return data.contact.contact_id;
}

/**
 * Syncs an item (Part/Labour) to Zoho Books
 */
export async function syncItemToZoho(config: ZohoConfig, item: ZohoItem): Promise<string> {
  const url = `https://books.zoho.in/api/v3/items?organization_id=${config.organizationId}`;
  
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Zoho-oauthtoken ${config.accessToken}`
    },
    body: JSON.stringify(item)
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Zoho API Error: ${response.status} - ${errorText}`);
  }

  const data = await response.json();
  return data.item.item_id;
}

/**
 * Creates a Sales Invoice in Zoho Books for a closed JobCard
 */
export async function syncInvoiceToZoho(config: ZohoConfig, invoice: ZohoInvoice): Promise<string> {
  const url = `https://books.zoho.in/api/v3/invoices?organization_id=${config.organizationId}`;
  
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Zoho-oauthtoken ${config.accessToken}`
    },
    body: JSON.stringify(invoice)
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Zoho API Error: ${response.status} - ${errorText}`);
  }

  const data = await response.json();
  return data.invoice.invoice_id;
}
