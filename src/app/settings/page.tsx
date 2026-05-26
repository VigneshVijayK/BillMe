'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import {
  Save,
  Image as ImageIcon
} from 'lucide-react';
import { db } from '../../lib/supabase';
import { Profile } from '../../types';
import { COUNTRIES, DEFAULT_COUNTRY, getCountryConfig } from '../../lib/countries';

export default function SettingsPage() {
  const [, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const [businessName, setBusinessName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [taxNumber, setTaxNumber] = useState('');
  const [currency, setCurrency] = useState('INR');
  const [country, setCountry] = useState(DEFAULT_COUNTRY);
  const [logoUrl, setLogoUrl] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    async function loadProfile() {
      try {
        const p = await db.getProfile();
        setProfile(p);
        setBusinessName(p.business_name || '');
        setEmail(p.email || '');
        setPhone(p.phone || '');
        setAddress(p.address || '');
        setTaxNumber(p.tax_number || '');
        setCurrency(p.currency || 'INR');
        setCountry(p.country || DEFAULT_COUNTRY);
        setLogoUrl(p.logo_url || '');
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    loadProfile();
  }, []);

  const handleCountryChange = (newCountry: string) => {
    setCountry(newCountry);
    const config = getCountryConfig(newCountry);
    setCurrency(config.currency);
    setPhone(config.phonePrefix + ' ');
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const updated = await db.updateProfile({
        business_name: businessName,
        email,
        phone,
        address,
        tax_number: taxNumber,
        currency,
        country,
        logo_url: logoUrl,
      });
      setProfile(updated);
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setLogoUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const config = getCountryConfig(country);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
        <div className="w-10 h-10 rounded-full border-4 border-primary border-t-transparent animate-spin" />
        <p className="text-muted-foreground text-sm font-medium">Fetching business details...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-3xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-300">
      <div>
        <h1 className="text-3xl font-black tracking-tight">Business Settings</h1>
        <p className="text-muted-foreground">Manage your business profile, tax info, and regional preferences.</p>
      </div>

      <div className="glass-panel rounded-3xl p-6 sm:p-10 border border-border shadow-lg">
        <form onSubmit={handleSave} className="space-y-8">
          
          {/* Logo Uploader */}
          <div className="flex flex-col sm:flex-row items-center gap-6 pb-6 border-b border-border">
            <div className="space-y-1 text-center sm:text-left">
              <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider block">Company Logo</span>
              <p className="text-xs text-muted-foreground">Displayed on invoices and estimates.</p>
            </div>
            
            <label className="group relative w-24 h-24 rounded-2xl border-2 border-dashed border-border hover:border-primary/50 flex flex-col items-center justify-center cursor-pointer overflow-hidden transition-all bg-secondary/20 shrink-0">
              {logoUrl ? (
                <>
                  <Image src={logoUrl} alt="Logo" fill className="object-cover" />
                  <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity text-white text-[10px] font-bold">
                    Change Logo
                  </div>
                </>
              ) : (
                <div className="flex flex-col items-center justify-center text-center p-2 text-muted-foreground group-hover:text-primary transition-colors">
                  <ImageIcon size={22} className="mb-1" />
                  <span className="text-[9px] font-bold">Upload</span>
                </div>
              )}
              <input type="file" accept="image/*" onChange={handleLogoUpload} className="hidden" />
            </label>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            
            <div className="space-y-1">
              <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Country</label>
              <select
                value={country}
                onChange={(e) => handleCountryChange(e.target.value)}
                className="w-full bg-secondary/30 border border-border rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
              >
                {Object.keys(COUNTRIES).map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Registered Business Name</label>
              <input
                type="text"
                required
                value={businessName}
                onChange={(e) => setBusinessName(e.target.value)}
                className="w-full bg-secondary/30 border border-border rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                placeholder="BillMe Demo Account"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Currency</label>
              <select
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                className="w-full bg-secondary/30 border border-border rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
              >
                {Object.values(COUNTRIES)
                  .filter((v, i, a) => a.findIndex(c => c.currency === v.currency) === i)
                  .map(c => (
                    <option key={c.currency} value={c.currency}>{c.currency} ({c.currencySymbol})</option>
                  ))
                }
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Business Email</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-secondary/30 border border-border rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                placeholder="billing@company.com"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Phone</label>
              <input
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full bg-secondary/30 border border-border rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                placeholder={`${config.phonePrefix} 9999999999`}
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">{config.taxLabel} / Tax ID</label>
              <input
                type="text"
                value={taxNumber}
                onChange={(e) => setTaxNumber(e.target.value)}
                className="w-full bg-secondary/30 border border-border rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                placeholder={config.taxPlaceholder}
              />
            </div>

            <div className="space-y-1 sm:col-span-2">
              <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Business Address</label>
              <textarea
                rows={3}
                required
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className="w-full bg-secondary/30 border border-border rounded-xl p-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                placeholder="Street, City, State, Country"
              />
            </div>

          </div>

          <div className="flex justify-end pt-4 border-t border-border">
            <button
              type="submit"
              disabled={saving}
              className="flex items-center space-x-2 px-8 py-3 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-black shadow-lg shadow-primary/20 hover:shadow-primary/30 transition-all text-sm"
            >
              {saving ? (
                <div className="w-5 h-5 rounded-full border-2 border-primary-foreground border-t-transparent animate-spin" />
              ) : (
                <>
                  <Save size={16} />
                  <span>Save Settings</span>
                </>
              )}
            </button>
          </div>

        </form>
      </div>
    </div>
  );
}
