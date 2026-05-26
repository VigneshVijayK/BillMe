'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  TrendingUp,
  FileText,
  Users,
  CreditCard,
  Plus,
  ArrowUpRight,
  Clock,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { db } from '../../lib/supabase';
import { Document, Expense } from '../../types';
import { getCurrencySymbol } from '../../lib/countries';

export default function Dashboard() {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [clientsCount, setClientsCount] = useState(0);
  const [currency, setCurrency] = useState('INR');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadDashboardData() {
      try {
        const [docs, exps, cls, profile] = await Promise.all([
          db.getDocuments(),
          db.getExpenses(),
          db.getClients(),
          db.getProfile().catch(() => null),
        ]);

        setDocuments(docs);
        setExpenses(exps);
        setClientsCount(cls.length);
        if (profile) setCurrency(profile.currency);
      } catch (error) {
        console.error('Failed to load dashboard data:', error);
      } finally {
        setLoading(false);
      }
    }

    loadDashboardData();
  }, []);

  // Compute metrics
  const invoices = documents.filter(d => d.doc_type === 'invoice');
  const totalInvoiced = invoices.reduce((acc, curr) => acc + curr.total, 0);
  const totalPaid = invoices.filter(d => d.status === 'paid').reduce((acc, curr) => acc + curr.total, 0);
  const totalPending = invoices.filter(d => d.status !== 'paid' && d.status !== 'declined').reduce((acc, curr) => acc + curr.total, 0);
  const totalExpenses = expenses.reduce((acc, curr) => acc + curr.amount, 0);
  const netProfit = totalPaid - totalExpenses;
  const profitMargin = totalPaid > 0 ? (netProfit / totalPaid) * 100 : 0;

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
        <div className="w-12 h-12 rounded-full border-4 border-primary border-t-transparent animate-spin" />
        <p className="text-muted-foreground font-medium">Loading your analytics dashboard...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-300">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black tracking-tight bg-gradient-to-r from-foreground to-muted-foreground bg-clip-text text-transparent">
            Financial Dashboard
          </h1>
          <p className="text-muted-foreground">Keep track of your invoices, clients, and business expenses.</p>
        </div>

        {/* Quick Actions */}
        <div className="flex flex-wrap gap-3">
          <Link
            href="/invoices/new"
            className="flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-bold shadow-lg shadow-primary/10 transition-all"
          >
            <Plus size={16} />
            <span>New Invoice</span>
          </Link>
          <Link
            href="/expenses"
            className="flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-secondary hover:bg-secondary/80 text-foreground font-bold border border-border transition-all"
          >
            <Plus size={16} />
            <span>Log Expense</span>
          </Link>
        </div>
      </div>

      {/* KPI Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Total Invoiced */}
        <div className="glass-panel rounded-2xl p-5 sm:p-6 relative overflow-hidden transition-all duration-300 hover:md:scale-[1.02] hover:border-primary/20">
          <div className="flex justify-between items-start gap-2">
            <span className="text-xs sm:text-sm font-semibold text-muted-foreground">Total Invoiced</span>
            <div className="p-2 rounded-xl bg-blue-500/10 text-blue-400 shrink-0">
              <FileText size={20} />
            </div>
          </div>
          <div className="mt-3 sm:mt-4">
            <h3 className="text-2xl sm:text-3xl font-black break-all">{getCurrencySymbol(currency)}{totalInvoiced.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</h3>
            <span className="text-xs text-muted-foreground mt-1 block">Accumulated gross invoice volume</span>
          </div>
          <div className="absolute bottom-0 inset-x-0 h-1 bg-gradient-to-r from-blue-500 to-indigo-500" />
        </div>

        {/* Total Collected */}
        <div className="glass-panel rounded-2xl p-5 sm:p-6 relative overflow-hidden transition-all duration-300 hover:md:scale-[1.02] hover:border-primary/20">
          <div className="flex justify-between items-start gap-2">
            <span className="text-xs sm:text-sm font-semibold text-muted-foreground">Payments Collected</span>
            <div className="p-2 rounded-xl bg-green-500/10 text-green-400 shrink-0">
              <CheckCircle2 size={20} />
            </div>
          </div>
          <div className="mt-3 sm:mt-4">
            <h3 className="text-2xl sm:text-3xl font-black break-all">{getCurrencySymbol(currency)}{totalPaid.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</h3>
            <span className="text-xs text-green-400 mt-1 flex items-center gap-1 font-semibold">
              <TrendingUp size={12} /> Live Cash Flow
            </span>
          </div>
          <div className="absolute bottom-0 inset-x-0 h-1 bg-gradient-to-r from-green-500 to-emerald-500" />
        </div>

        {/* Pending Payments */}
        <div className="glass-panel rounded-2xl p-5 sm:p-6 relative overflow-hidden transition-all duration-300 hover:md:scale-[1.02] hover:border-primary/20">
          <div className="flex justify-between items-start gap-2">
            <span className="text-xs sm:text-sm font-semibold text-muted-foreground">Outstanding Balances</span>
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400 shrink-0">
              <Clock size={20} />
            </div>
          </div>
          <div className="mt-3 sm:mt-4">
            <h3 className="text-2xl sm:text-3xl font-black break-all">{getCurrencySymbol(currency)}{totalPending.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</h3>
            <span className="text-xs text-amber-400 mt-1 block">Awaiting client payment</span>
          </div>
          <div className="absolute bottom-0 inset-x-0 h-1 bg-gradient-to-r from-amber-500 to-orange-500" />
        </div>

        {/* Profit Margin */}
        <div className="glass-panel rounded-2xl p-5 sm:p-6 relative overflow-hidden transition-all duration-300 hover:md:scale-[1.02] hover:border-primary/20">
          <div className="flex justify-between items-start gap-2">
            <span className="text-xs sm:text-sm font-semibold text-muted-foreground">Profit & Margin</span>
            <div className="p-2 rounded-xl bg-purple-500/10 text-purple-400 shrink-0">
              <TrendingUp size={20} />
            </div>
          </div>
          <div className="mt-3 sm:mt-4">
            <h3 className="text-2xl sm:text-3xl font-black">{profitMargin.toFixed(1)}%</h3>
            <span className="text-xs text-muted-foreground mt-1 block">
              Net Profit: {getCurrencySymbol(currency)}{netProfit.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>
          <div className="absolute bottom-0 inset-x-0 h-1 bg-gradient-to-r from-purple-500 to-pink-500" />
        </div>
      </div>

      {/* Main Content Split: Recent Invoices & Quick Summaries */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Recent Invoices list */}
        <div className="lg:col-span-2 glass-panel rounded-2xl p-6 space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold tracking-tight">Recent Invoices</h2>
            <Link href="/invoices" className="text-primary text-sm font-bold hover:underline flex items-center">
              View All <ArrowUpRight size={14} className="ml-0.5" />
            </Link>
          </div>

          {invoices.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center space-y-3">
              <FileText size={48} className="text-muted-foreground/30" />
              <p className="text-muted-foreground">No invoices generated yet.</p>
              <Link href="/invoices/new" className="text-primary font-bold hover:underline text-sm">
                Generate your first invoice now &rarr;
              </Link>
            </div>
          ) : (
            <div className="overflow-x-auto -mx-6 sm:-mx-0">
              <div className="inline-block min-w-full align-middle px-6 sm:px-0">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-border text-xs text-muted-foreground font-bold uppercase">
                      <th className="pb-3 whitespace-nowrap pr-3">Invoice ID</th>
                      <th className="pb-3 whitespace-nowrap pr-3">Client</th>
                      <th className="pb-3 whitespace-nowrap pr-3">Due Date</th>
                      <th className="pb-3 whitespace-nowrap pr-3">Amount</th>
                      <th className="pb-3 whitespace-nowrap">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {invoices.slice(0, 5).map((doc) => (
                      <tr key={doc.id} className="text-sm hover:bg-secondary/20 transition-colors">
                        <td className="py-4 font-bold text-foreground whitespace-nowrap pr-3">
                          <Link href={`/invoices/${doc.id}`} className="hover:text-primary">
                            {doc.doc_number}
                          </Link>
                        </td>
                        <td className="py-4 text-muted-foreground whitespace-nowrap pr-3">{doc.client?.name || 'Walk-in Client'}</td>
                        <td className="py-4 text-muted-foreground whitespace-nowrap pr-3">{doc.due_date || 'N/A'}</td>
                        <td className="py-4 font-bold text-foreground whitespace-nowrap pr-3">
                           {getCurrencySymbol(doc.currency)}{doc.total.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="py-4 whitespace-nowrap">
                          <span
                            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold capitalize ${
                              doc.status === 'paid'
                                ? 'bg-green-500/10 text-green-400'
                                : doc.status === 'overdue'
                                ? 'bg-red-500/10 text-red-400'
                                : 'bg-amber-500/10 text-amber-400'
                            }`}
                          >
                            {doc.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Side Panel: Business health details */}
        <div className="space-y-6">
          {/* Business Summary info */}
          <div className="glass-panel rounded-2xl p-6 space-y-6">
            <h2 className="text-xl font-bold tracking-tight">Overview</h2>
            <div className="space-y-4">
              <div className="flex justify-between items-center text-sm">
                <span className="text-muted-foreground flex items-center gap-2">
                  <Users size={16} /> Total Clients
                </span>
                <span className="font-bold text-foreground">{clientsCount}</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-muted-foreground flex items-center gap-2">
                  <CreditCard size={16} /> Tracked Expenses
                </span>
                <span className="font-bold text-red-400">
                  -{getCurrencySymbol(currency)}{totalExpenses.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-muted-foreground flex items-center gap-2">
                  <FileText size={16} /> Estimates Drafted
                </span>
                <span className="font-bold text-foreground">
                  {documents.filter(d => d.doc_type === 'estimate').length}
                </span>
              </div>
            </div>
            <div className="pt-4 border-t border-border flex justify-between items-center">
              <span className="text-sm font-semibold">Net Liquid Profit</span>
              <span className={`text-lg font-black ${netProfit >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                {getCurrencySymbol(currency)}{netProfit.toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </span>
            </div>
          </div>

          {/* Quick instructions / Info block */}
          <div className="glass-panel rounded-2xl p-6 bg-gradient-to-br from-primary/10 to-purple-500/10 border border-primary/20 space-y-3">
            <h3 className="font-bold text-foreground flex items-center gap-2">
              <AlertCircle size={18} className="text-primary" /> Setup Supabase Integration
            </h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              This application is currently running in local offline-first demo mode. Data is persisted securely to your browser storage.
            </p>
            <p className="text-xs text-muted-foreground leading-relaxed">
              To connect a live cloud database, supply the supabase environment variables to your <code className="px-1 py-0.5 rounded bg-secondary text-primary">.env.local</code>.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
