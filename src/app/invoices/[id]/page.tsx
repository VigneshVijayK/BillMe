'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import html2pdf from 'html2pdf.js';
import {
  Printer,
  Trash2,
  CheckCircle,
  ArrowLeft,
  Layout
} from 'lucide-react';
import { db } from '../../../lib/supabase';
import { Document, Profile } from '../../../types';
import { getCurrencySymbol } from '../../../lib/countries';
import ConfirmModal from '../../../components/ConfirmModal';
import { useToast } from '../../../lib/toast';

export default function DocumentDetails() {
  const { toast } = useToast();
  const params = useParams();
  const router = useRouter();
  const docId = params.id as string;
  
  const [doc, setDoc] = useState<Document | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [template, setTemplate] = useState<'modern' | 'minimal' | 'classic'>('modern');
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (!docId) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setLoading(false);
      return;
    }
    async function loadData() {
      try {
        const [document, businessProfile] = await Promise.all([
          db.getDocumentById(docId),
          db.getProfile(),
        ]);
        setDoc(document);
        setProfile(businessProfile);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [docId]);

  const handlePrint = async () => {
    if (!doc || !profile) return;

    const element = document.getElementById('invoice-preview');
    if (!element) return;

      try {
        const opt = {
          margin: 0.5,
          filename: `${doc.doc_number}.pdf`,
          image: {
            type: 'jpeg' as const,
            quality: 0.98
          },
          html2canvas: {
            scale: 2
          },
          jsPDF: {
            unit: 'in' as const,
            format: 'letter' as const,
            orientation: 'portrait' as const
          }
        };

        // Wait a moment for any pending renders
        await new Promise(resolve => setTimeout(resolve, 100));

        // Generate PDF
        await html2pdf().set(opt).from(element).save();

        toast('Invoice saved as PDF', 'success');
      } catch (err) {
        console.error('PDF generation error:', err);
        toast('Failed to generate PDF. Please try printing instead.', 'error');
      }
  };

  const handleStatusChange = async (newStatus: Document['status']) => {
    if (!doc) return;
    try {
      const success = await db.updateDocumentStatus(doc.id, newStatus);
      if (success) {
        setDoc({ ...doc, status: newStatus });
        toast(`Document marked as ${newStatus}`, 'success');
      }
    } catch {
      toast('Failed to update document status', 'error');
    }
  };

  const handleDelete = async () => {
    if (!doc) return;
    setDeleting(true);
    try {
      const success = await db.deleteDocument(doc.id);
      if (success) {
        toast('Document deleted successfully', 'success');
        router.push('/invoices');
      }
    } catch {
      toast('Failed to delete document', 'error');
      setDeleting(false);
      setShowDeleteModal(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
        <div className="w-12 h-12 rounded-full border-4 border-primary border-t-transparent animate-spin" />
        <p className="text-muted-foreground font-medium">Loading document details...</p>
      </div>
    );
  }

  if (!doc) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] text-center space-y-4">
        <p className="text-xl font-bold text-muted-foreground">Document not found.</p>
        <button onClick={() => router.push('/invoices')} className="text-primary font-bold hover:underline">
          Go back to list
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-16 max-w-4xl mx-auto">
      {/* Action Header Panel (no-print) */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-card border border-border p-5 rounded-2xl no-print">
        <button
          onClick={() => router.push('/invoices')}
          className="flex items-center space-x-2 text-muted-foreground hover:text-foreground font-semibold transition-colors"
        >
          <ArrowLeft size={18} />
          <span>Documents</span>
        </button>

        {/* Dynamic Template Switcher */}
        <div className="flex items-center space-x-2">
          <span className="text-xs font-bold text-muted-foreground uppercase flex items-center gap-1">
            <Layout size={14} /> Style:
          </span>
          <select
            value={template}
            onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setTemplate(e.target.value as 'modern' | 'minimal' | 'classic')}
            className="bg-secondary/40 border border-border rounded-xl px-2.5 py-1.5 text-xs font-bold focus:outline-none focus:ring-1 focus:ring-primary"
          >
            <option value="modern">Modern Professional</option>
            <option value="minimal">Stark Minimalist</option>
            <option value="classic">Classic Corporate</option>
          </select>
        </div>

        {/* Buttons */}
        <div className="flex flex-wrap gap-2.5">
          {doc.status !== 'paid' && doc.doc_type === 'invoice' && (
            <button
              onClick={() => handleStatusChange('paid')}
              className="flex items-center space-x-1.5 px-4 py-2 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 font-bold text-xs border border-emerald-500/20 transition-all"
            >
              <CheckCircle size={14} />
              <span>Mark Paid</span>
            </button>
          )}

          <button
            onClick={handlePrint}
            className="flex items-center space-x-1.5 px-4 py-2 rounded-xl bg-primary text-primary-foreground font-bold text-xs shadow-lg shadow-primary/15 hover:shadow-primary/25 transition-all"
          >
            <Printer size={14} />
            <span>Print / PDF</span>
          </button>

          <button
            onClick={() => setShowDeleteModal(true)}
            className="flex items-center space-x-1.5 px-4 py-2 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 font-bold text-xs border border-red-500/20 transition-all"
          >
            <Trash2 size={14} />
            <span>Delete</span>
          </button>
        </div>
      </div>

      {/* Main Invoice Box */}
      <div className={`p-6 sm:p-12 rounded-3xl print-card border border-border shadow-xl bg-card transition-all duration-300 ${
        template === 'minimal' ? 'font-mono' : 'font-sans'
      }`}>

        {/* ----------------- TEMPLATE: MODERN ----------------- */}
        {template === 'modern' && (
          <div className="space-y-10">
            {/* Header top bar */}
            <div className="flex flex-col sm:flex-row justify-between gap-6 border-b border-border pb-8">
              <div className="space-y-4">
                {profile?.logo_url && (
                  <Image src={profile.logo_url} alt="Logo" width={64} height={64} className="max-h-16 w-auto max-w-full object-contain rounded-xl" />
                )}
                <div>
                  <h2 className="text-2xl font-black tracking-tight">{profile?.business_name || 'Acme Agency'}</h2>
                  <p className="text-sm text-muted-foreground mt-1 max-w-sm whitespace-pre-line">{profile?.address}</p>
                  <p className="text-xs text-muted-foreground mt-1">Tax No: {profile?.tax_number}</p>
                </div>
              </div>

              <div className="text-left sm:text-right space-y-2">
                <span className="inline-flex px-3 py-1 rounded-full text-xs font-extrabold capitalize bg-primary/10 text-primary uppercase tracking-widest border border-primary/20">
                  {doc.doc_type}
                </span>
                <h1 className="text-3xl font-black text-foreground">{doc.doc_number}</h1>
                <div className="text-xs text-muted-foreground space-y-1">
                  <div>Issue Date: <span className="font-semibold text-foreground">{doc.issue_date}</span></div>
                  {doc.due_date && (
                    <div>Due Date: <span className="font-semibold text-foreground">{doc.due_date}</span></div>
                  )}
                  <div>Status: <span className="font-bold uppercase text-foreground">{doc.status}</span></div>
                </div>
              </div>
            </div>

            {/* Bill to block */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
              <div className="space-y-2">
                <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest block">Billed To:</span>
                <div className="font-bold text-base text-foreground">{doc.client?.name || 'Walk-in Client'}</div>
                <div className="text-sm text-muted-foreground whitespace-pre-line leading-relaxed">{doc.client?.address}</div>
                {doc.client?.tax_number && (
                  <div className="text-xs text-muted-foreground font-semibold">Tax ID: {doc.client.tax_number}</div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ----------------- TEMPLATE: MINIMAL ----------------- */}
        {template === 'minimal' && (
          <div className="space-y-10">
            {/* Header top bar */}
            <div className="border-b-2 border-foreground pb-6 flex flex-col sm:flex-row justify-between items-start gap-4">
              <div>
                <h1 className="text-2xl font-bold tracking-tight uppercase">{doc.doc_type} / {doc.doc_number}</h1>
                <p className="text-xs uppercase text-muted-foreground">Status: [{doc.status}]</p>
              </div>
              <div className="text-xs space-y-1 text-left sm:text-right">
                <div>DATE: {doc.issue_date}</div>
                {doc.due_date && <div>DUE: {doc.due_date}</div>}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 text-sm">
              <div className="space-y-1">
                <span className="text-xs text-muted-foreground uppercase font-bold block">&gt; FROM:</span>
                <div className="font-bold">{profile?.business_name}</div>
                <div className="text-xs whitespace-pre-line text-muted-foreground">{profile?.address}</div>
                <div className="text-xs">TAX NO: {profile?.tax_number}</div>
              </div>
              <div className="space-y-1">
                <span className="text-xs text-muted-foreground uppercase font-bold block">&gt; TO:</span>
                <div className="font-bold">{doc.client?.name || 'Walk-in Client'}</div>
                <div className="text-xs whitespace-pre-line text-muted-foreground">{doc.client?.address}</div>
                <div className="text-xs">TAX NO: {doc.client?.tax_number}</div>
              </div>
            </div>
          </div>
        )}

        {/* ----------------- TEMPLATE: CLASSIC ----------------- */}
        {template === 'classic' && (
          <div className="space-y-8">
            <div className="text-center pb-6 border-b border-border">
              <h1 className="text-3xl font-extrabold tracking-tight uppercase text-foreground">{doc.doc_type === 'invoice' ? 'TAX INVOICE' : 'PROPOSALS & ESTIMATE'}</h1>
              <p className="text-sm text-muted-foreground mt-1">Invoice Reference: {doc.doc_number}</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 pb-6 border-b border-border">
              <div className="space-y-2">
                <div className="font-bold text-xs uppercase text-muted-foreground">Sender Details:</div>
                <div className="font-extrabold text-base">{profile?.business_name}</div>
                <div className="text-sm text-muted-foreground whitespace-pre-line leading-normal">{profile?.address}</div>
                <div className="text-xs text-muted-foreground">VAT/GST: {profile?.tax_number}</div>
              </div>
              <div className="space-y-2 text-left sm:text-right">
                <div className="font-bold text-xs uppercase text-muted-foreground">Client Details:</div>
                <div className="font-extrabold text-base">{doc.client?.name || 'Walk-in Client'}</div>
                <div className="text-sm text-muted-foreground whitespace-pre-line leading-normal">{doc.client?.address}</div>
                <div className="text-xs text-muted-foreground">VAT/GST: {doc.client?.tax_number}</div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 bg-secondary/20 p-4 rounded-xl text-center text-xs">
              <div>
                <div className="text-muted-foreground font-bold uppercase mb-1">Issue Date</div>
                <div className="font-bold text-sm">{doc.issue_date}</div>
              </div>
              <div>
                <div className="text-muted-foreground font-bold uppercase mb-1">Due Date</div>
                <div className="font-bold text-sm">{doc.due_date || 'N/A'}</div>
              </div>
              <div>
                <div className="text-muted-foreground font-bold uppercase mb-1">Status</div>
                <div className="font-bold text-sm capitalize">{doc.status}</div>
              </div>
            </div>
          </div>
        )}

        {/* Itemized Table (Shared across templates with styling variations) */}
        <div className="mt-10 overflow-x-auto -mx-6 sm:-mx-0">
          <div className="inline-block min-w-full align-middle px-6 sm:px-0">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className={`border-b text-xs font-bold uppercase ${
                  template === 'minimal' ? 'border-foreground text-foreground' : 'border-border text-muted-foreground'
                }`}>
                  <th className="py-3.5 px-4 whitespace-nowrap">Item Description</th>
                  <th className="py-3.5 px-4 whitespace-nowrap text-center">Qty</th>
                  <th className="py-3.5 px-4 whitespace-nowrap text-right">Rate</th>
                  <th className="py-3.5 px-4 whitespace-nowrap text-right">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {doc.items?.map((item) => (
                  <tr key={item.id} className="text-sm hover:bg-secondary/5">
                    <td className="py-4 px-4 font-semibold text-foreground">{item.description}</td>
                  <td className="py-4 px-4 text-center text-muted-foreground">{item.quantity}</td>
                  <td className="py-4 px-4 text-right text-muted-foreground">
{getCurrencySymbol(doc.currency)}{item.unit_price.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                          </td>
                          <td className="py-4 px-4 text-right font-bold text-foreground">
                    {getCurrencySymbol(doc.currency)}{(item.quantity * item.unit_price).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
            </div>
        </div>

        {/* Pricing calculations Summary */}
        <div className="mt-8 flex flex-col md:flex-row justify-between gap-8 pt-8 border-t border-border">
          {/* Notes */}
          <div className="flex-1 space-y-4 text-sm max-w-md">
            {doc.notes && (
              <div className="space-y-1">
                <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest block">Client Note:</span>
                <p className="text-muted-foreground italic leading-relaxed whitespace-pre-line">{doc.notes}</p>
              </div>
            )}
            {doc.terms && (
              <div className="space-y-1">
                <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest block">Terms:</span>
                <p className="text-muted-foreground leading-relaxed whitespace-pre-line">{doc.terms}</p>
              </div>
            )}
          </div>

          {/* Totals Summary */}
          <div className={`w-full md:w-80 rounded-2xl p-6 space-y-3.5 font-medium ${
            template === 'minimal' ? 'border border-foreground bg-transparent' : 'bg-secondary/15'
          }`}>
            <div className="flex justify-between items-center text-sm">
              <span className="text-muted-foreground">Subtotal</span>
              <span className="text-foreground font-semibold">
                {getCurrencySymbol(doc.currency)}{doc.subtotal.toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </span>
            </div>

            {doc.tax_rate > 0 && (
              <div className="flex justify-between items-center text-sm">
                <span className="text-muted-foreground">Tax ({doc.tax_rate}%)</span>
                <span className="text-foreground font-semibold">
                  {getCurrencySymbol(doc.currency)}{doc.tax_amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </span>
              </div>
            )}

            {doc.discount > 0 && (
              <div className="flex justify-between items-center text-sm">
                <span className="text-muted-foreground">Discount Applied</span>
                <span className="text-red-400 font-semibold">
                  -{getCurrencySymbol(doc.currency)}{doc.discount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </span>
              </div>
            )}

            <div className="h-px bg-border my-1" />

            <div className="flex justify-between items-center text-base font-black">
              <span>Grand Total</span>
              <span className="text-primary font-black">
                {getCurrencySymbol(doc.currency)}{doc.total.toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </span>
            </div>
          </div>
        </div>

      </div>
      <ConfirmModal
        open={showDeleteModal}
        title="Delete Document"
        message="Are you sure you want to delete this document permanently? This action cannot be undone."
        confirmLabel="Delete Forever"
        variant="danger"
        loading={deleting}
        onConfirm={handleDelete}
        onCancel={() => setShowDeleteModal(false)}
      />
    </div>
  );
}
