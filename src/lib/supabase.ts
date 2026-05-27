import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Client, Document, DocumentItem, Expense, Profile } from '../types';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

let client: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient {
  if (!client) {
    if (!supabaseUrl || !supabaseAnonKey) {
      throw new Error(
        'Missing Supabase environment variables. Please set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in your .env.local file.'
      );
    }
    client = createClient(supabaseUrl, supabaseAnonKey);
  }
  return client;
}

// ─── Simple In-Memory Cache ──────────────────────────────────────────────────
const cache = new Map<string, { data: unknown; expiry: number }>();
const CACHE_TTL = 30_000; // 30 seconds

function cacheGet<T>(key: string): T | null {
  const entry = cache.get(key);
  if (entry && Date.now() < entry.expiry) return entry.data as T;
  cache.delete(key);
  return null;
}

function cacheSet(key: string, data: unknown) {
  cache.set(key, { data, expiry: Date.now() + CACHE_TTL });
}

function cacheClear() {
  cache.clear();
}

// ─── Demo Mode ────────────────────────────────────────────────────────────────
let demoMode = false;

export function isDemoMode(): boolean {
  return demoMode;
}

export function setDemoMode(enabled: boolean) {
  demoMode = enabled;
}

export { cacheClear };

const DEMO_STORAGE_KEY = 'billme_demo_db';

interface DemoDB {
  profile: Profile;
  clients: Client[];
  documents: Document[];
  documentItems: DocumentItem[];
  expenses: Expense[];
}

const DEMO_PROFILE: Profile = {
  id: 'demo-user',
  business_name: 'BillMe Demo Account',
  logo_url: '',
  email: 'demo',
  phone: '9999999999',
  address: '123, Business Hub, MG Road, Mumbai - 400001, India',
  tax_number: 'GSTIN-27AAAAA0000A1Z1',
  currency: 'INR',
  country: 'India',
  bank_name: 'State Bank of India',
  bank_account: '123456789012',
  bank_ifsc: 'SBIN0001234',
  upi_id: 'demo@upi',
};

function genId(prefix = ''): string {
  const id = typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : Date.now().toString(36) + Math.random().toString(36).substring(2, 9);
  return prefix ? `${prefix}_${id}` : id;
}

function demoStorage() {
  if (typeof window === 'undefined') return null;
  return localStorage;
}

function getDemoDB(): DemoDB {
  const storage = demoStorage();
  if (!storage) {
    return { profile: DEMO_PROFILE, clients: [], documents: [], documentItems: [], expenses: [] };
  }
  const stored = storage.getItem(DEMO_STORAGE_KEY);
  if (stored) {
    try { return JSON.parse(stored); } catch {}
  }
  const db: DemoDB = { profile: DEMO_PROFILE, clients: [], documents: [], documentItems: [], expenses: [] };
  storage.setItem(DEMO_STORAGE_KEY, JSON.stringify(db));
  return db;
}

function saveDemoDB(db: DemoDB) {
  const storage = demoStorage();
  if (storage) {
    storage.setItem(DEMO_STORAGE_KEY, JSON.stringify(db));
  }
}

// ─── Storage (Logo / Photo upload) ─────────────────────────────────────────────

export async function uploadLogo(file: File): Promise<string> {
  if (demoMode) throw new Error('File upload not available in demo mode. Sign in to upload.');
  const s = getSupabase();
  const { data: { user } } = await s.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const ext = file.name.split('.').pop() || 'png';
  const fileName = `${user.id}/${Date.now()}-logo.${ext}`;

  const { error: uploadErr } = await s.storage.from('logos').upload(fileName, file, {
    cacheControl: '3600',
    upsert: true,
  });
  if (uploadErr) throw uploadErr;

  const { data: { publicUrl } } = s.storage.from('logos').getPublicUrl(fileName);
  return publicUrl;
}

export async function deleteLogo(logoUrl: string): Promise<void> {
  if (demoMode) return;
  if (!logoUrl || !logoUrl.includes('/logos/')) return;
  const s = getSupabase();
  const path = logoUrl.split('/logos/')[1];
  if (!path) return;
  await s.storage.from('logos').remove([path]);
}

export async function getProfileHistory(): Promise<{
  id: number;
  changed_at: string;
  changed_fields: Record<string, boolean>;
  previous_values: Record<string, string>;
  new_values: Record<string, string>;
}[]> {
  if (demoMode) return [];
  const s = getSupabase();
  const { data: { user } } = await s.auth.getUser();
  if (!user) return [];
  const { data, error } = await s.rpc('get_profile_history', { p_profile_id: user.id });
  if (error) throw error;
  return data || [];
}

// ─── Database API ─────────────────────────────────────────────────────────────
export const db = {
  async getProfile(forceRefresh = false): Promise<Profile> {
    if (demoMode) return getDemoDB().profile;
    const cacheKey = 'profile';
    if (!forceRefresh) {
      const cached = cacheGet<Profile>(cacheKey);
      if (cached) return cached;
    }
    const s = getSupabase();
    const { data: { user } } = await s.auth.getUser();
    const { data, error } = await s.from('profiles').select('*').eq('id', user?.id).single();
    if (error) {
      if (error.code === 'PGRST116') {
        throw new Error('Profile not found. Please complete your business settings.');
      }
      throw error;
    }
    cacheSet(cacheKey, data);
    return data;
  },

  async updateProfile(profile: Partial<Profile>): Promise<Profile> {
    if (demoMode) {
      const d = getDemoDB();
      d.profile = { ...d.profile, ...profile };
      saveDemoDB(d);
      return d.profile;
    }
    const s = getSupabase();
    const { data: { user } } = await s.auth.getUser();
    if (!user) throw new Error('Not authenticated');
    const { data, error } = await s.from('profiles').upsert({ ...profile, id: user.id }).select().single();
    if (error) throw error;
    cacheClear();
    return data;
  },

  async getClients(): Promise<Client[]> {
    if (demoMode) return getDemoDB().clients;
    const s = getSupabase();
    const { data, error } = await s.from('clients').select('*').order('created_at', { ascending: false });
    if (error) throw error;
    return data || [];
  },

  async addClient(client: Omit<Client, 'id' | 'user_id' | 'created_at'>): Promise<Client> {
    const newClient: Client = { ...client, id: genId(), user_id: 'demo-user', created_at: new Date().toISOString() };
    if (demoMode) {
      const d = getDemoDB();
      d.clients.unshift(newClient);
      saveDemoDB(d);
      return newClient;
    }
    const s = getSupabase();
    const { data: { user } } = await s.auth.getUser();
    const { data, error } = await s.from('clients').insert({ ...client, user_id: user?.id }).select().single();
    if (error) throw error;
    return data;
  },

  async deleteClient(id: string): Promise<boolean> {
    if (demoMode) {
      const d = getDemoDB();
      d.clients = d.clients.filter(c => c.id !== id);
      d.documents = d.documents.map(doc => doc.client_id === id ? { ...doc, client_id: null } : doc);
      saveDemoDB(d);
      return true;
    }
    const s = getSupabase();
    const { error } = await s.from('clients').delete().eq('id', id);
    if (error) throw error;
    return true;
  },

  async getDocuments(type?: 'invoice' | 'estimate'): Promise<Document[]> {
    if (demoMode) {
      const d = getDemoDB();
      let docs = d.documents.map(doc => ({ ...doc, client: d.clients.find(c => c.id === doc.client_id) || null, items: d.documentItems.filter(item => item.document_id === doc.id) }));
      if (type) docs = docs.filter(doc => doc.doc_type === type);
      return docs;
    }
    const s = getSupabase();
    let query = s.from('documents').select('*, clients(*)').order('created_at', { ascending: false });
    if (type) query = query.eq('doc_type', type);
    const { data, error } = await query;
    if (error) throw error;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (data || []).map((d: any) => ({ ...d, client: d.clients }));
  },

  async getDocumentById(id: string): Promise<Document | null> {
    if (demoMode) {
      const d = getDemoDB();
      const doc = d.documents.find(doc => doc.id === id);
      if (!doc) return null;
      return { ...doc, client: d.clients.find(c => c.id === doc.client_id) || null, items: d.documentItems.filter(item => item.document_id === doc.id) };
    }
    const s = getSupabase();
    const { data, error } = await s.from('documents').select('*, clients(*), document_items(*)').eq('id', id).limit(1);
    if (error) throw error;
    if (!data || data.length === 0) return null;
    const row = data[0];
    return { ...row, client: row.clients, items: row.document_items };
  },

  async saveDocument(doc: Omit<Document, 'id' | 'user_id' | 'created_at' | 'items' | 'client'>, items: Omit<DocumentItem, 'id' | 'document_id'>[]): Promise<Document> {
    const docId = genId();
    const newDoc: Document = { ...doc, id: docId, user_id: 'demo-user', created_at: new Date().toISOString() };
    const newItems: DocumentItem[] = items.map((item) => ({ ...item, id: genId('item'), document_id: docId }));

    if (demoMode) {
      const d = getDemoDB();
      d.documents.unshift(newDoc);
      d.documentItems.push(...newItems);
      saveDemoDB(d);
      return { ...newDoc, items: newItems, client: d.clients.find(c => c.id === newDoc.client_id) || null };
    }

    const s = getSupabase();
    const { data: { user } } = await s.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { show_payment_info, ...dbDoc } = doc;

    let { data: docResult, error: docErr } = await s.from('documents').insert({ ...dbDoc, user_id: user.id, show_payment_info: show_payment_info ?? false }).select('*, clients(*)').limit(1);
    if (docErr && docErr.message?.includes('show_payment_info')) {
      const result = await s.from('documents').insert({ ...dbDoc, user_id: user.id }).select('*, clients(*)').limit(1);
      docResult = result.data;
      docErr = result.error;
    }
    if (docErr || !docResult || docResult.length === 0) {
      throw docErr || new Error('Failed to create document');
    }

    const savedDoc = docResult[0];
    const itemsToInsert = items.map(i => ({ ...i, document_id: savedDoc.id }));
    const { data: itemsResult, error: itemsErr } = await s.from('document_items').insert(itemsToInsert).select();
    if (itemsErr) throw itemsErr;

    return { ...savedDoc, client: savedDoc.clients, items: itemsResult || [] };
  },

  async updateDocumentStatus(id: string, status: Document['status']): Promise<boolean> {
    if (demoMode) {
      const d = getDemoDB();
      d.documents = d.documents.map(doc => doc.id === id ? { ...doc, status } : doc);
      saveDemoDB(d);
      return true;
    }
    const s = getSupabase();
    const { error } = await s.from('documents').update({ status }).eq('id', id);
    if (error) throw error;
    return true;
  },

  async deleteDocument(id: string): Promise<boolean> {
    if (demoMode) {
      const d = getDemoDB();
      d.documents = d.documents.filter(doc => doc.id !== id);
      d.documentItems = d.documentItems.filter(item => item.document_id !== id);
      saveDemoDB(d);
      return true;
    }
    const s = getSupabase();
    const { error } = await s.from('documents').delete().eq('id', id);
    if (error) throw error;
    return true;
  },

  async getExpenses(): Promise<Expense[]> {
    if (demoMode) return getDemoDB().expenses;
    const s = getSupabase();
    const { data, error } = await s.from('expenses').select('*').order('expense_date', { ascending: false });
    if (error) throw error;
    return data || [];
  },

  async addExpense(expense: Omit<Expense, 'id' | 'user_id' | 'created_at'>): Promise<Expense> {
    const newExpense: Expense = { ...expense, id: genId('exp'), user_id: 'demo-user', created_at: new Date().toISOString() };
    if (demoMode) {
      const d = getDemoDB();
      d.expenses.unshift(newExpense);
      saveDemoDB(d);
      return newExpense;
    }
    const s = getSupabase();
    const { data: { user } } = await s.auth.getUser();
    const { data, error } = await s.from('expenses').insert({ ...expense, user_id: user?.id }).select().single();
    if (error) throw error;
    return data;
  },

  async deleteExpense(id: string): Promise<boolean> {
    if (demoMode) {
      const d = getDemoDB();
      d.expenses = d.expenses.filter(e => e.id !== id);
      saveDemoDB(d);
      return true;
    }
    const s = getSupabase();
    const { error } = await s.from('expenses').delete().eq('id', id);
    if (error) throw error;
    return true;
  },
};
