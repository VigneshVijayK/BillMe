export type DocType = 'invoice' | 'estimate';
export type DocStatus = 'draft' | 'sent' | 'paid' | 'unpaid' | 'overdue' | 'declined';

export interface Profile {
  id: string;
  business_name: string;
  logo_url: string;
  email: string;
  phone: string;
  address: string;
  tax_number: string;
  currency: string;
  country: string;
}

export interface Client {
  id: string;
  user_id: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  tax_number: string;
  created_at: string;
}

export interface DocumentItem {
  id: string;
  document_id: string;
  description: string;
  quantity: number;
  unit_price: number;
  tax_rate?: number; // percentage
  amount: number;
}

export interface Document {
  id: string;
  user_id: string;
  client_id: string | null;
  doc_type: DocType;
  doc_number: string;
  issue_date: string;
  due_date: string | null;
  status: DocStatus;
  currency: string;
  subtotal: number;
  tax_rate: number; // general tax rate
  tax_amount: number;
  discount: number;
  total: number;
  notes: string;
  terms: string;
  created_at: string;
  items?: DocumentItem[];
  client?: Client | null;
}

export interface Expense {
  id: string;
  user_id: string;
  category: string;
  amount: number;
  expense_date: string;
  description: string;
  created_at: string;
}
