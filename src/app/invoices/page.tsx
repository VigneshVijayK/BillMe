'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  FileText,
  Search,
  Plus,
  Trash2,
  Eye,
  FileCheck,
  ExternalLink
} from 'lucide-react';
import { db } from '../../lib/supabase';
import { Document, DocStatus } from '../../types';
import { getCurrencySymbol } from '../../lib/countries';
import ConfirmModal from '../../components/ConfirmModal';
import Pagination, { usePagination } from '../../components/Pagination';
import { useToast } from '../../lib/toast';

export default function DocumentsPage() {
  const { toast } = useToast();
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'invoice' | 'estimate'>('invoice');
  const [searchQuery, setSearchQuery] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [paidTarget, setPaidTarget] = useState<string | null>(null);
  const [updatingStatus, setUpdatingStatus] = useState(false);

  const loadDocuments = async () => {
    setLoading(true);
    try {
      const data = await db.getDocuments();
      setDocuments(data);
    } catch (e) {
      console.error(e);
      toast('Failed to load documents', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadDocuments();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const success = await db.deleteDocument(deleteTarget);
      if (success) {
        setDocuments(documents.filter(d => d.id !== deleteTarget));
        toast('Document deleted successfully', 'success');
      }
    } catch {
      toast('Failed to delete document', 'error');
    } finally {
      setDeleting(false);
      setDeleteTarget(null);
    }
  };

  const handleStatusChange = async (id: string, newStatus: DocStatus) => {
    setUpdatingStatus(true);
    try {
      const success = await db.updateDocumentStatus(id, newStatus);
      if (success) {
        setDocuments(documents.map(d => d.id === id ? { ...d, status: newStatus } : d));
        toast(`Document marked as ${newStatus}`, 'success');
      }
    } catch {
      toast('Failed to update document status', 'error');
    } finally {
      setUpdatingStatus(false);
      setPaidTarget(null);
    }
  };

  const convertToInvoice = async (estimate: Document) => {
    if (!estimate.items || estimate.items.length === 0) {
      toast('Cannot convert an estimate with no line items', 'warning');
      return;
    }
    // eslint-disable-next-line react-hooks/purity
    const invNumber = 'INV-' + new Date().getFullYear() + '-' + Date.now().toString(36).toUpperCase();
    
    const now = new Date();
    const issueDate = now.toISOString().split('T')[0];
    const futureDate = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    try {
      await db.saveDocument({
        client_id: estimate.client_id,
        doc_type: 'invoice',
        doc_number: invNumber,
        issue_date: issueDate,
        due_date: futureDate,
        status: 'unpaid',
        currency: estimate.currency,
        subtotal: estimate.subtotal,
        tax_rate: estimate.tax_rate,
        tax_amount: estimate.tax_amount,
        discount: estimate.discount,
        total: estimate.total,
        notes: estimate.notes,
        terms: estimate.terms,
        show_payment_info: false,
      }, estimate.items.map(item => ({
        description: item.description,
        quantity: item.quantity,
        unit_price: item.unit_price,
        amount: item.amount,
      })));

      await db.updateDocumentStatus(estimate.id, 'sent');
      
      toast('Estimate converted to invoice successfully', 'success');
      loadDocuments();
      setActiveTab('invoice');
    } catch (e) {
      console.error(e);
      toast('Failed to convert estimate to invoice', 'error');
    }
  };

  const PAGE_SIZE = 10;

  // Filter documents
  const filteredDocs = documents.filter(d => {
    const matchesTab = d.doc_type === activeTab;
    const matchesSearch =
      d.doc_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (d.client?.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (d.client?.email || '').toLowerCase().includes(searchQuery.toLowerCase());
    return matchesTab && matchesSearch;
  });

  const { page, totalPages, items: pagedDocs, setPage } = usePagination(filteredDocs, PAGE_SIZE);

  const getStatusStyle = (status: DocStatus) => {
    switch (status) {
      case 'paid':
        return 'bg-green-500/10 text-green-400 border border-green-500/20';
      case 'overdue':
        return 'bg-red-500/10 text-red-400 border border-red-500/20';
      case 'sent':
      case 'unpaid':
        return 'bg-blue-500/10 text-blue-400 border border-blue-500/20';
      case 'declined':
        return 'bg-gray-500/10 text-gray-400 border border-gray-500/20';
      default:
        return 'bg-zinc-500/10 text-zinc-400 border border-zinc-500/20';
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-300">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black tracking-tight">Billing Documents</h1>
          <p className="text-muted-foreground">Manage and track your client invoices and project estimates.</p>
        </div>
        <Link
          href="/invoices/new"
          className="flex items-center justify-center space-x-2 px-5 py-3 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-bold shadow-lg shadow-primary/20 transition-all self-start sm:self-center"
        >
          <Plus size={18} />
          <span>Create Document</span>
        </Link>
      </div>

      {/* Tabs & Search controls */}
      <div className="flex flex-col md:flex-row gap-4 justify-between items-center bg-card p-2.5 rounded-2xl border border-border">
        {/* Tabs */}
        <div className="flex w-full md:w-auto p-1 rounded-xl bg-secondary/50 border border-border">
          <button
            onClick={() => setActiveTab('invoice')}
            className={`flex-1 md:flex-none px-6 py-2 rounded-lg text-sm font-bold transition-all ${
              activeTab === 'invoice'
                ? 'bg-primary text-primary-foreground shadow-md'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Invoices
          </button>
          <button
            onClick={() => setActiveTab('estimate')}
            className={`flex-1 md:flex-none px-6 py-2 rounded-lg text-sm font-bold transition-all ${
              activeTab === 'estimate'
                ? 'bg-primary text-primary-foreground shadow-md'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Estimates
          </button>
        </div>

        {/* Search */}
        <div className="relative w-full md:w-80">
          <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder={`Search ${activeTab}s...`}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-secondary/40 border border-border rounded-xl pl-11 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
          />
        </div>
      </div>

      {/* Main Table view */}
      <div className="glass-panel rounded-2xl overflow-hidden">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 space-y-4">
            <div className="w-10 h-10 rounded-full border-4 border-primary border-t-transparent animate-spin" />
            <p className="text-muted-foreground text-sm font-medium">Fetching documents list...</p>
          </div>
        ) : filteredDocs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center space-y-4">
            <div className="w-16 h-16 rounded-2xl bg-secondary/50 flex items-center justify-center text-muted-foreground/40 border border-border">
              <FileText size={32} />
            </div>
            <div>
              <h3 className="font-bold text-lg text-foreground">No {activeTab}s found</h3>
              <p className="text-sm text-muted-foreground max-w-sm mt-1 mx-auto">
                {searchQuery
                  ? "No matching entries match your search criteria. Try a different query."
                  : `Create a professional ${activeTab} and dispatch it to your client.`}
              </p>
            </div>
            {!searchQuery && (
              <Link
                href="/invoices/new"
                className="inline-flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-secondary border border-border hover:bg-secondary/80 text-foreground font-bold text-sm transition-all"
              >
                <span>Draft New Document</span>
              </Link>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto -mx-6 sm:-mx-0">
            <div className="inline-block min-w-full align-middle px-6 sm:px-0">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-border text-xs text-muted-foreground font-bold uppercase bg-secondary/20">
                    <th className="py-4 px-6 whitespace-nowrap">Doc Number</th>
                    <th className="py-4 px-6 whitespace-nowrap">Client</th>
                    <th className="py-4 px-6 whitespace-nowrap">Date</th>
                    <th className="py-4 px-6 whitespace-nowrap">Due Date</th>
                    <th className="py-4 px-6 whitespace-nowrap">Total</th>
                    <th className="py-4 px-6 whitespace-nowrap">Status</th>
                    <th className="py-4 px-6 whitespace-nowrap text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                    {pagedDocs.map((doc) => (
                    <tr key={doc.id} className="hover:bg-secondary/10 transition-colors group">
                      <td className="py-4 px-6 font-bold text-foreground whitespace-nowrap">
                        <Link href={`/invoices/${doc.id}`} className="hover:text-primary transition-colors flex items-center gap-1.5">
                          {doc.doc_number}
                          <ExternalLink size={12} className="opacity-0 group-hover:opacity-100 transition-opacity text-primary shrink-0" />
                        </Link>
                      </td>
                      <td className="py-4 px-6 whitespace-nowrap">
                        <div className="font-medium text-foreground truncate max-w-[120px] sm:max-w-none">{doc.client?.name || 'Walk-in Client'}</div>
                        <div className="text-xs text-muted-foreground truncate max-w-[120px] sm:max-w-none">{doc.client?.email || 'No email'}</div>
                      </td>
                      <td className="py-4 px-6 text-muted-foreground text-sm whitespace-nowrap">{doc.issue_date}</td>
                      <td className="py-4 px-6 text-muted-foreground text-sm whitespace-nowrap">{doc.due_date || 'N/A'}</td>
                      <td className="py-4 px-6 font-extrabold text-foreground text-sm whitespace-nowrap">
                        {getCurrencySymbol(doc.currency)}{doc.total.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-4 px-6 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold capitalize ${getStatusStyle(doc.status)}`}>
                          {doc.status}
                        </span>
                      </td>
                      <td className="py-4 px-6 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end space-x-1">
                          {doc.doc_type === 'estimate' && (
                            <button
                              onClick={() => convertToInvoice(doc)}
                              className="p-2 rounded-lg hover:bg-green-500/10 text-muted-foreground hover:text-green-400 transition-all"
                              title="Convert to Invoice"
                            >
                              <FileCheck size={18} />
                            </button>
                          )}

                          {doc.doc_type === 'invoice' && doc.status !== 'paid' && (
                            <button
                              onClick={() => setPaidTarget(doc.id)}
                              disabled={updatingStatus}
                              className="p-2 rounded-lg hover:bg-emerald-500/10 text-muted-foreground hover:text-emerald-400 transition-all text-xs font-bold hidden sm:inline-flex disabled:opacity-50"
                              title="Mark as Paid"
                            >
                              Mark Paid
                            </button>
                          )}

                          <Link
                            href={`/invoices/${doc.id}`}
                            className="p-2 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground transition-all"
                            title="View Details"
                          >
                            <Eye size={18} />
                          </Link>
                          
                          <button
                            onClick={() => setDeleteTarget(doc.id)}
                            className="p-2 rounded-lg hover:bg-red-500/10 text-muted-foreground hover:text-red-400 transition-all"
                            title="Delete"
                          >
                            <Trash2 size={18} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
        <Pagination currentPage={page} totalPages={totalPages} onPageChange={setPage} />
      </div>

      <ConfirmModal
        open={!!paidTarget}
        title="Mark as Paid"
        message="Confirm that this invoice has been paid in full by the client."
        confirmLabel="Confirm Payment"
        variant="primary"
        loading={updatingStatus}
        onConfirm={() => paidTarget && handleStatusChange(paidTarget, 'paid')}
        onCancel={() => setPaidTarget(null)}
      />
      <ConfirmModal
        open={!!deleteTarget}
        title="Delete Document"
        message="Are you sure you want to delete this document? This action cannot be undone."
        confirmLabel="Delete"
        variant="danger"
        loading={deleting}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
