'use client';

import React, { useState, useEffect } from 'react';
import {
  Users,
  Plus,
  Trash2,
  Mail,
  Phone,
  MapPin,
  ShieldCheck
} from 'lucide-react';
import { db } from '../../lib/supabase';
import { Client } from '../../types';

export default function ClientsPage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);

  // Form states
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [taxNum, setTaxNum] = useState('');
  const [adding, setAdding] = useState(false);

  const loadClients = async () => {
    setLoading(true);
    try {
      const data = await db.getClients();
      setClients(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadClients();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setAdding(true);
    try {
      const client = await db.addClient({
        name,
        email,
        phone,
        address,
        tax_number: taxNum
      });
      setClients([client, ...clients]);
      setName('');
      setEmail('');
      setPhone('');
      setAddress('');
      setTaxNum('');
    } catch (e) {
      console.error(e);
    } finally {
      setAdding(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this client? This will remove them from the database.')) {
      const success = await db.deleteClient(id);
      if (success) {
        setClients(clients.filter(c => c.id !== id));
      }
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-300">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-black tracking-tight">Client CRM Directory</h1>
        <p className="text-muted-foreground">Manage your client relationships, billing details, and contract information.</p>
      </div>

      {/* Grid Layout: Form on left/right, list on other side */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Creation Form */}
        <div className="glass-panel rounded-3xl p-6 border border-border h-fit space-y-6">
          <div className="space-y-1">
            <h2 className="text-xl font-bold tracking-tight flex items-center gap-1.5">
              <Plus size={20} className="text-primary" /> Add New Client
            </h2>
            <p className="text-xs text-muted-foreground">Add business contact to send invoices/estimates directly.</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Client / Company Name *</label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-secondary/30 border border-border rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                placeholder="e.g. Vercel Inc."
              />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Email Address</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-secondary/30 border border-border rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                placeholder="e.g. billing@vercel.com"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Phone Number</label>
              <input
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full bg-secondary/30 border border-border rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                placeholder="e.g. +1 (555) 019-2834"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Tax Number / Reg ID</label>
              <input
                type="text"
                value={taxNum}
                onChange={(e) => setTaxNum(e.target.value)}
                className="w-full bg-secondary/30 border border-border rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                placeholder="e.g. GSTIN, VAT, EIN"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Address</label>
              <textarea
                rows={3}
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className="w-full bg-secondary/30 border border-border rounded-xl p-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                placeholder="e.g. 100 Vercel Way, Suite A, San Francisco, CA"
              />
            </div>

            <button
              type="submit"
              disabled={adding}
              className="w-full py-3 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-black shadow-lg shadow-primary/20 hover:shadow-primary/30 transition-all text-sm flex items-center justify-center space-x-2 disabled:opacity-50"
            >
              {adding ? (
                <div className="w-5 h-5 rounded-full border-2 border-primary-foreground border-t-transparent animate-spin" />
              ) : (
                <>
                  <Plus size={16} />
                  <span>Create Account</span>
                </>
              )}
            </button>
          </form>
        </div>

        {/* Clients Directory List */}
        <div className="lg:col-span-2 glass-panel rounded-3xl p-6 border border-border space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold tracking-tight">Saved Accounts</h2>
            <span className="text-xs bg-primary/10 text-primary font-bold px-3 py-1 rounded-full border border-primary/20">
              {clients.length} Total
            </span>
          </div>

          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 space-y-4">
              <div className="w-10 h-10 rounded-full border-4 border-primary border-t-transparent animate-spin" />
              <p className="text-muted-foreground text-sm font-medium">Fetching accounts database...</p>
            </div>
          ) : clients.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center space-y-4">
              <div className="w-16 h-16 rounded-2xl bg-secondary/50 flex items-center justify-center text-muted-foreground/30 border border-border">
                <Users size={32} />
              </div>
              <div>
                <h3 className="font-bold text-lg text-foreground">No accounts found</h3>
                <p className="text-sm text-muted-foreground max-w-xs mt-1">
                  Start adding clients on the left to streamline invoice creation.
                </p>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {clients.map((client) => (
                <div
                  key={client.id}
                  className="bg-secondary/20 hover:bg-secondary/35 rounded-2xl p-5 border border-border hover:border-primary/20 transition-all flex flex-col justify-between space-y-4 group"
                >
                  <div className="space-y-2">
                    <div className="flex justify-between items-start gap-4">
                      <div>
                        <h4 className="font-bold text-foreground group-hover:text-primary transition-colors text-base">
                          {client.name}
                        </h4>
                        {client.tax_number && (
                          <span className="inline-block text-[10px] bg-secondary border border-border text-muted-foreground font-bold px-2 py-0.5 rounded mt-1">
                            Tax ID: {client.tax_number}
                          </span>
                        )}
                      </div>
                      <button
                        onClick={() => handleDelete(client.id)}
                        className="p-1.5 rounded-lg text-muted-foreground hover:text-red-400 hover:bg-red-500/10 transition-colors"
                        title="Delete Client"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>

                    <div className="space-y-1.5 text-xs text-muted-foreground">
                      {client.email && (
                        <div className="flex items-center gap-2">
                          <Mail size={12} className="text-muted-foreground/60" />
                          <span>{client.email}</span>
                        </div>
                      )}
                      {client.phone && (
                        <div className="flex items-center gap-2">
                          <Phone size={12} className="text-muted-foreground/60" />
                          <span>{client.phone}</span>
                        </div>
                      )}
                      {client.address && (
                        <div className="flex items-start gap-2 mt-1">
                          <MapPin size={12} className="text-muted-foreground/60 shrink-0 mt-0.5" />
                          <span className="truncate-2-lines line-clamp-2">{client.address}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="pt-3 border-t border-border flex items-center justify-between text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <ShieldCheck size={12} className="text-green-400" /> Active Account
                    </span>
                    <span>Added {new Date(client.created_at).toLocaleDateString()}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
