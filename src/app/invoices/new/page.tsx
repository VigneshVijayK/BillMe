'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Plus,
  Trash2,
  Save,
  Users,
  Image as ImageIcon,
  ArrowLeft,
  X,
  Sparkles
} from 'lucide-react';
import Image from 'next/image';
import { db, uploadLogo, deleteLogo } from '../../../lib/supabase';
import { useToast } from '../../../lib/toast';
import { Client, DocType } from '../../../types';
import { getCurrencySymbol } from '../../../lib/countries';
import confetti from 'canvas-confetti';

interface FormItem {
  description: string;
  quantity: number;
  unit_price: number;
}

export default function NewDocument() {
  const router = useRouter();
  const { toast } = useToast();
  const [docType, setDocType] = useState<DocType>('invoice');
  const [docNumber, setDocNumber] = useState('');
  const [issueDate, setIssueDate] = useState('');
  const [dueDate, setDueDate] = useState('');
  
  const [clients, setClients] = useState<Client[]>([]);
  const [selectedClientId, setSelectedClientId] = useState('');
  
  // Inline Client Modal
  const [showClientModal, setShowClientModal] = useState(false);
  const [newClientName, setNewClientName] = useState('');
  const [newClientEmail, setNewClientEmail] = useState('');
  const [newClientPhone, setNewClientPhone] = useState('');
  const [newClientAddress, setNewClientAddress] = useState('');
  const [newClientTaxNum, setNewClientTaxNum] = useState('');

  // Logo upload state
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [uploadingLogo, setUploadingLogo] = useState(false);

  // Line items
  const [items, setItems] = useState<FormItem[]>([
    { description: '', quantity: 1, unit_price: 0 }
  ]);

  // Adjustments
  const [currency, setCurrency] = useState('USD');
  const [taxRate, setTaxRate] = useState(0);
  const [discount, setDiscount] = useState(0);
  const [notes, setNotes] = useState('');
  const [terms, setTerms] = useState('');
  const [showPaymentInfo, setShowPaymentInfo] = useState(false);
  const [saving, setSaving] = useState(false);

  // Auto-generate invoice/estimate number & dates
  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect */
    const year = new Date().getFullYear();
    const prefix = docType === 'invoice' ? 'INV' : 'EST';
    const seq = Date.now().toString(36).toUpperCase();
    setDocNumber(`${prefix}-${year}-${seq}`);

    const today = new Date().toISOString().split('T')[0];
    setIssueDate(today);

    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 14);
    setDueDate(futureDate.toISOString().split('T')[0]);

    db.getClients().then(setClients);

    db.getProfile().then(p => {
      if (p.currency) setCurrency(p.currency);
      if (p.logo_url) setLogoPreview(p.logo_url);
    });
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [docType]);

  const handleAddItem = () => {
    setItems([...items, { description: '', quantity: 1, unit_price: 0 }]);
  };

  const handleRemoveItem = (index: number) => {
    if (items.length === 1) return;
    setItems(items.filter((_, idx) => idx !== index));
  };

  const handleItemChange = (index: number, field: keyof FormItem, value: string | number) => {
    const updated = [...items];
    if (field === 'quantity') {
      updated[index].quantity = Number(value);
    } else if (field === 'unit_price') {
      updated[index].unit_price = Number(value);
    } else {
      updated[index].description = String(value);
    }
    setItems(updated);
  };

  // Calculations
  const subtotal = items.reduce((acc, curr) => acc + (curr.quantity * curr.unit_price), 0);
  const taxAmount = (subtotal * taxRate) / 100;
  const total = subtotal + taxAmount - discount;

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      alert('Logo must be under 2 MB.');
      return;
    }

    setUploadingLogo(true);
    try {
      if (logoPreview) {
        await deleteLogo(logoPreview).catch(() => {});
      }
      const url = await uploadLogo(file);
      setLogoPreview(url);
    } catch {
      const reader = new FileReader();
      reader.onloadend = () => {
        setLogoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    } finally {
      setUploadingLogo(false);
    }
  };

  const handleAddClientSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newClientName.trim()) return;

    try {
      const added = await db.addClient({
        name: newClientName,
        email: newClientEmail,
        phone: newClientPhone,
        address: newClientAddress,
        tax_number: newClientTaxNum
      });
      setClients([added, ...clients]);
      setSelectedClientId(added.id);
      setShowClientModal(false);
      
      setNewClientName('');
      setNewClientEmail('');
      setNewClientPhone('');
      setNewClientAddress('');
      setNewClientTaxNum('');
    } catch (err) {
      console.error(err);
    }
  };

  const handleSave = async () => {
    if (!selectedClientId) {
      toast('Please select or create a client first.', 'warning');
      return;
    }

    if (items.some(item => !item.description.trim())) {
      toast('All line items must have a description.', 'warning');
      return;
    }

    setSaving(true);
    try {
      const docItems = items.map(i => ({
        description: i.description,
        quantity: i.quantity,
        unit_price: i.unit_price,
        amount: i.quantity * i.unit_price,
      }));

      const saved = await db.saveDocument({
        client_id: selectedClientId,
        doc_type: docType,
        doc_number: docNumber,
        issue_date: issueDate,
        due_date: dueDate || null,
        status: docType === 'invoice' ? 'unpaid' : 'draft',
        currency: currency,
        subtotal: subtotal,
        tax_rate: taxRate,
        tax_amount: taxAmount,
        discount: discount,
        total: total,
        notes: notes,
        terms: terms,
        show_payment_info: showPaymentInfo,
      }, docItems);
 
       // Trigger Confetti
       confetti({
         particleCount: 150,
         spread: 80,
         origin: { y: 0.6 },
         colors: ['#8b5cf6', '#a78bfa', '#f43f5e', '#10b981', '#3b82f6']
       });
 
       router.push(`/invoices/${saved.id}`);
     } catch (err) {
       console.error(err);
       toast('Failed to save invoice. Please try again.', 'error');
     } finally {
       setSaving(false);
     }
  };

  return (
    <div className="space-y-8 max-w-5xl mx-auto pb-16 animate-in fade-in duration-300">
      {/* Header / Back Action */}
      <div className="flex items-center justify-between no-print">
        <button
          onClick={() => router.back()}
          className="flex items-center space-x-2 text-muted-foreground hover:text-foreground font-semibold transition-colors"
        >
          <ArrowLeft size={18} />
          <span>Back</span>
        </button>

        <div className="flex items-center space-x-2 bg-secondary/50 p-1.5 rounded-xl border border-border">
          <button
            onClick={() => setDocType('invoice')}
            className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${
              docType === 'invoice'
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Invoice Mode
          </button>
          <button
            onClick={() => setDocType('estimate')}
            className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${
              docType === 'estimate'
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Estimate Mode
          </button>
        </div>
      </div>

      {/* Editor Body */}
      <div className="glass-panel rounded-3xl p-6 sm:p-10 space-y-10 border border-border shadow-xl shadow-black/10">
        
        {/* Row 1: Logo & Basic document ID info */}
        <div className="flex flex-col md:flex-row justify-between gap-8 border-b border-border pb-8">
          {/* Logo Uploader */}
          <div className="flex flex-col space-y-2">
            <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Business Logo</span>
            <label className="group relative w-32 h-32 rounded-2xl border-2 border-dashed border-border hover:border-primary/50 flex flex-col items-center justify-center cursor-pointer overflow-hidden transition-all bg-secondary/25">
              {uploadingLogo ? (
                <div className="flex items-center justify-center">
                  <div className="w-6 h-6 rounded-full border-2 border-primary border-t-transparent animate-spin" />
                </div>
              ) : logoPreview ? (
                <>
                  <Image src={logoPreview} alt="Logo" fill className="object-cover" />
                  <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity text-white text-xs font-bold">
                    Change
                  </div>
                </>
              ) : (
                <div className="flex flex-col items-center justify-center text-center p-2 text-muted-foreground group-hover:text-primary transition-colors">
                  <ImageIcon size={28} className="mb-1" />
                  <span className="text-[10px] font-bold">Upload Logo</span>
                </div>
              )}
              <input type="file" accept="image/png,image/jpeg,image/webp" onChange={handleLogoUpload} className="hidden" disabled={uploadingLogo} />
            </label>
          </div>

          {/* Document Properties */}
          <div className="grid grid-cols-2 gap-4 max-w-sm w-full">
            <div className="space-y-1">
              <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Doc Number</label>
              <input
                type="text"
                value={docNumber}
                onChange={(e) => setDocNumber(e.target.value)}
                className="w-full bg-secondary/35 border border-border rounded-xl px-3 py-2.5 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Currency</label>
              <select
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                className="w-full bg-secondary/35 border border-border rounded-xl px-3 py-2.5 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-primary/50"
              >
                <option value="USD">USD ($)</option>
                <option value="INR">INR (₹)</option>
                <option value="EUR">EUR (€)</option>
                <option value="GBP">GBP (£)</option>
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Issue Date</label>
              <input
                type="date"
                value={issueDate}
                onChange={(e) => setIssueDate(e.target.value)}
                className="w-full bg-secondary/35 border border-border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Due Date</label>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full bg-secondary/35 border border-border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
            </div>
          </div>
        </div>

        {/* Row 2: Client details (Who is this for) */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-6 bg-secondary/15 p-6 rounded-2xl border border-border">
          <div className="space-y-2 flex-1">
            <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider block">Billing To (Client)</span>
            <div className="flex gap-2">
              <select
                value={selectedClientId}
                onChange={(e) => setSelectedClientId(e.target.value)}
                className="flex-1 bg-secondary/40 border border-border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
              >
                <option value="">-- Select or Add Client --</option>
                {clients.map(c => (
                  <option key={c.id} value={c.id}>{c.name} ({c.email || 'No email'})</option>
                ))}
              </select>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setShowClientModal(true)}
            className="flex items-center justify-center space-x-2 px-4 py-2.5 rounded-xl border border-border hover:bg-secondary/80 text-sm font-bold transition-all bg-card shadow-sm shrink-0"
          >
            <Users size={16} />
            <span>Create New Client</span>
          </button>
        </div>

        {/* Row 3: Document Items details */}
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Line Items</span>
            <button
              type="button"
              onClick={handleAddItem}
              className="flex items-center space-x-1.5 text-xs text-primary font-bold hover:underline"
            >
              <Plus size={14} />
              <span>Add Item Row</span>
            </button>
          </div>

          <div className="overflow-x-auto rounded-2xl border border-border">
            <table className="w-full text-left border-collapse min-w-[650px]">
              <thead>
                <tr className="bg-secondary/35 text-xs font-bold text-muted-foreground uppercase border-b border-border">
                  <th className="py-3 px-4 w-[60%]">Item Description</th>
                  <th className="py-3 px-4 w-[15%]">Quantity</th>
                  <th className="py-3 px-4 w-[15%]">Unit Price</th>
                  <th className="py-3 px-4 w-[10%] text-right">Total</th>
                  <th className="py-3 px-4 w-8"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {items.map((item, index) => (
                  <tr key={index} className="hover:bg-secondary/5 transition-colors">
                    <td className="py-3 px-4">
                      <input
                        type="text"
                        placeholder="Service details, design package, item details..."
                        value={item.description}
                        onChange={(e) => handleItemChange(index, 'description', e.target.value)}
                        className="w-full bg-transparent border-0 focus:outline-none focus:ring-0 text-sm py-1.5"
                      />
                    </td>
                    <td className="py-3 px-4">
                      <input
                        type="number"
                        min="1"
                        step="any"
                        value={item.quantity}
                        onChange={(e) => handleItemChange(index, 'quantity', e.target.value)}
                        className="w-full bg-secondary/20 border border-border rounded-lg px-2 py-1.5 text-sm text-center focus:outline-none"
                      />
                    </td>
                    <td className="py-3 px-4">
                      <div className="relative">
                        <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">{getCurrencySymbol(currency)}</span>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={item.unit_price}
                          onChange={(e) => handleItemChange(index, 'unit_price', e.target.value)}
                          className="w-full bg-secondary/20 border border-border rounded-lg pl-6 pr-2 py-1.5 text-sm focus:outline-none"
                          placeholder="0.00"
                        />
                      </div>
                    </td>
                    <td className="py-3 px-4 text-right font-semibold text-sm">
                      {(item.quantity * item.unit_price).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <button
                        type="button"
                        onClick={() => handleRemoveItem(index)}
                        disabled={items.length === 1}
                        className={`text-muted-foreground hover:text-red-400 p-1.5 rounded-lg transition-colors ${
                          items.length === 1 ? 'opacity-30 cursor-not-allowed' : ''
                        }`}
                      >
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Row 4: Pricing totals and extras */}
        <div className="flex flex-col md:flex-row justify-between gap-8 pt-6 border-t border-border">
          {/* Notes & payment conditions */}
          <div className="flex-1 space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider block">Notes to Client</label>
              <textarea
                rows={3}
                placeholder="Write friendly details, thank you messages, etc."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full bg-secondary/25 border border-border rounded-xl p-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider block">Terms & Conditions</label>
              <textarea
                rows={2}
                placeholder="Payment is due within 14 days, wire transfer instructions, IBAN, bank account numbers..."
                value={terms}
                onChange={(e) => setTerms(e.target.value)}
                className="w-full bg-secondary/25 border border-border rounded-xl p-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
            </div>
            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowPaymentInfo(!showPaymentInfo)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  showPaymentInfo ? 'bg-primary' : 'bg-secondary'
                }`}
              >
                <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  showPaymentInfo ? 'translate-x-6' : 'translate-x-1'
                }`} />
              </button>
              <span className="text-sm font-medium text-foreground">Show Payment Info on Invoice</span>
            </div>
          </div>

          {/* Totals Box */}
          <div className="w-full md:w-80 bg-secondary/15 rounded-2xl p-6 border border-border space-y-4 font-medium">
            <div className="flex justify-between items-center text-sm">
              <span className="text-muted-foreground">Subtotal</span>
              <span className="text-foreground font-semibold">
                {getCurrencySymbol(currency)}{subtotal.toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </span>
            </div>

            {/* Tax field */}
            <div className="flex justify-between items-center gap-4 text-sm">
              <span className="text-muted-foreground">Tax Rate (%)</span>
              <input
                type="number"
                min="0"
                max="100"
                value={taxRate || ''}
                onChange={(e) => setTaxRate(Number(e.target.value))}
                placeholder="0"
                className="w-20 bg-secondary/35 border border-border rounded-lg px-2 py-1 text-right text-xs focus:outline-none focus:ring-1 focus:ring-primary/50"
              />
            </div>

            {/* Discount field */}
            <div className="flex justify-between items-center gap-4 text-sm">
              <span className="text-muted-foreground">Flat Discount ({getCurrencySymbol(currency)})</span>
              <input
                type="number"
                min="0"
                value={discount || ''}
                onChange={(e) => setDiscount(Number(e.target.value))}
                placeholder="0.00"
                className="w-24 bg-secondary/35 border border-border rounded-lg px-2 py-1 text-right text-xs focus:outline-none focus:ring-1 focus:ring-primary/50"
              />
            </div>

            <div className="h-px bg-border my-2" />

            <div className="flex justify-between items-center text-lg font-black">
              <span>Grand Total</span>
              <span className="text-primary font-black bg-primary/5 px-3 py-1 rounded-xl">
                {getCurrencySymbol(currency)}{total.toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </span>
            </div>
          </div>
        </div>

        {/* Submit Actions */}
        <div className="flex justify-end gap-3 pt-6 border-t border-border no-print">
          <button
            type="button"
            onClick={() => router.back()}
            className="px-6 py-3 rounded-xl border border-border hover:bg-secondary/80 font-bold transition-all text-sm"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="flex items-center space-x-2 px-8 py-3 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-black shadow-lg shadow-primary/25 hover:shadow-primary/35 transform hover:-translate-y-0.5 transition-all text-sm disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? (
              <div className="w-5 h-5 rounded-full border-2 border-primary-foreground border-t-transparent animate-spin" />
            ) : (
              <>
                <Save size={16} />
                <span>Save & Preview</span>
              </>
            )}
          </button>
        </div>

      </div>

      {/* Inline Add Client Modal Dialog */}
      {showClientModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="glass-panel bg-card border border-border rounded-3xl w-full max-w-md p-6 relative overflow-hidden animate-in zoom-in-95 duration-200">
            <button
              onClick={() => setShowClientModal(false)}
              className="absolute right-4 top-4 p-1.5 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"
            >
              <X size={18} />
            </button>

            <h3 className="text-xl font-bold tracking-tight mb-1 flex items-center gap-1.5">
              <Sparkles size={18} className="text-primary" /> Create Client Profile
            </h3>
            <p className="text-xs text-muted-foreground mb-5">Fill in contact details below to insert client in the database.</p>

            <form onSubmit={handleAddClientSubmit} className="space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Client Name *</label>
                <input
                  type="text"
                  required
                  value={newClientName}
                  onChange={(e) => setNewClientName(e.target.value)}
                  className="w-full bg-secondary/20 border border-border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                  placeholder="e.g. Acme Studio LLC"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Contact Email</label>
                <input
                  type="email"
                  value={newClientEmail}
                  onChange={(e) => setNewClientEmail(e.target.value)}
                  className="w-full bg-secondary/20 border border-border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                  placeholder="e.g. finance@acmestudio.com"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Phone Number</label>
                <input
                  type="text"
                  value={newClientPhone}
                  onChange={(e) => setNewClientPhone(e.target.value)}
                  className="w-full bg-secondary/20 border border-border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                  placeholder="e.g. +1 (555) 012-3456"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Tax Registration Number</label>
                <input
                  type="text"
                  value={newClientTaxNum}
                  onChange={(e) => setNewClientTaxNum(e.target.value)}
                  className="w-full bg-secondary/20 border border-border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                  placeholder="e.g. GSTIN, VAT ID, EIN"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Address</label>
                <textarea
                  rows={2}
                  value={newClientAddress}
                  onChange={(e) => setNewClientAddress(e.target.value)}
                  className="w-full bg-secondary/20 border border-border rounded-xl p-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                  placeholder="Street, City, Postal Code"
                />
              </div>

              <div className="flex gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setShowClientModal(false)}
                  className="flex-1 py-2.5 rounded-xl border border-border hover:bg-secondary text-sm font-semibold transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-sm shadow-md transition-all"
                >
                  Save Client
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
