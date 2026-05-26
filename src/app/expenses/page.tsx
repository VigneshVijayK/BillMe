'use client';

import React, { useState, useEffect } from 'react';
import {
  CreditCard,
  Plus,
  Trash2
} from 'lucide-react';
import { db } from '../../lib/supabase';
import { Expense } from '../../types';
import { getCurrencySymbol } from '../../lib/countries';
import ConfirmModal from '../../components/ConfirmModal';
import Pagination, { usePagination } from '../../components/Pagination';
import { useToast } from '../../lib/toast';

const CATEGORIES = [
  'Software & Subscriptions',
  'Advertising & Marketing',
  'Rent & Utilities',
  'Office Supplies',
  'Travel & Entertainment',
  'Salaries & Contractors',
  'Taxes & Legal Fees',
  'Other Expenses'
];

export default function ExpensesPage() {
  const { toast } = useToast();
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [currency, setCurrency] = useState('INR');
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Form states
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [amount, setAmount] = useState('');
  const [expenseDate, setExpenseDate] = useState('');
  const [description, setDescription] = useState('');
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    async function loadData() {
      try {
        const [data, profile] = await Promise.all([
          db.getExpenses(),
          db.getProfile().catch(() => null),
        ]);
        setExpenses(data);
        if (profile) setCurrency(profile.currency);
      } catch (err) {
        console.error(err);
        toast('Failed to load expenses', 'error');
      } finally {
        setLoading(false);
      }
    }
    loadData();
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setExpenseDate(new Date().toISOString().split('T')[0]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || Number(amount) <= 0) {
      toast('Please enter a valid amount', 'warning');
      return;
    }

    setAdding(true);
    try {
      const exp = await db.addExpense({
        category,
        amount: Number(amount),
        expense_date: expenseDate,
        description
      });
      setExpenses([exp, ...expenses]);
      setAmount('');
      setDescription('');
      setCategory(CATEGORIES[0]);
      toast('Expense logged successfully', 'success');
    } catch (err) {
      console.error(err);
      toast('Failed to log expense', 'error');
    } finally {
      setAdding(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const success = await db.deleteExpense(deleteTarget);
      if (success) {
        setExpenses(expenses.filter(e => e.id !== deleteTarget));
        toast('Expense deleted successfully', 'success');
      }
    } catch {
      toast('Failed to delete expense', 'error');
    } finally {
      setDeleting(false);
      setDeleteTarget(null);
    }
  };

  const PAGE_SIZE = 10;
  const { page, totalPages, items: pagedExpenses, setPage } = usePagination(expenses, PAGE_SIZE);

  const totalExpenses = expenses.reduce((acc, curr) => acc + curr.amount, 0);

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-300">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-black tracking-tight">Business Expenses</h1>
        <p className="text-muted-foreground">Log and categorize operational outlays to monitor accurate business margins.</p>
      </div>

      {/* KPI Total Expenses */}
      <div className="glass-panel rounded-2xl p-6 relative overflow-hidden max-w-sm">
        <div className="flex justify-between items-start">
          <span className="text-sm font-semibold text-muted-foreground">Total Operational Expense</span>
          <div className="p-2 rounded-xl bg-red-500/10 text-red-400">
            <CreditCard size={20} />
          </div>
        </div>
        <div className="mt-4">
          <h3 className="text-3xl font-black text-red-400">
            -{getCurrencySymbol(currency)}{totalExpenses.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </h3>
          <span className="text-xs text-muted-foreground mt-1 block">Based on logged transaction history</span>
        </div>
        <div className="absolute bottom-0 inset-x-0 h-1 bg-gradient-to-r from-red-500 to-rose-500" />
      </div>

      {/* Main Grid: Add & List */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Form panel */}
        <div className="glass-panel rounded-3xl p-6 border border-border h-fit space-y-6">
          <div className="space-y-1">
            <h2 className="text-xl font-bold tracking-tight flex items-center gap-1.5">
              <Plus size={20} className="text-red-400" /> Log Transaction
            </h2>
            <p className="text-xs text-muted-foreground">Submit expense item to auto-reconcile profit margins.</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Amount *</label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">{getCurrencySymbol(currency)}</span>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="w-full bg-secondary/30 border border-border rounded-xl pl-9 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 font-bold"
                  placeholder="0.00"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Expense Category *</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full bg-secondary/30 border border-border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
              >
                {CATEGORIES.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Expense Date *</label>
              <input
                type="date"
                required
                value={expenseDate}
                onChange={(e) => setExpenseDate(e.target.value)}
                className="w-full bg-secondary/30 border border-border rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Description</label>
              <textarea
                rows={2}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full bg-secondary/30 border border-border rounded-xl p-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                placeholder="Software licensing details, client lunch details, travel details..."
              />
            </div>

            <button
              type="submit"
              disabled={adding}
              className="w-full py-3 rounded-xl bg-red-500/10 border border-red-500/20 hover:bg-red-500/25 text-red-400 font-black transition-all text-sm flex items-center justify-center space-x-2"
            >
              {adding ? (
                <div className="w-5 h-5 rounded-full border-2 border-red-400 border-t-transparent animate-spin" />
              ) : (
                <>
                  <CreditCard size={16} />
                  <span>Log Expense</span>
                </>
              )}
            </button>
          </form>
        </div>

        {/* Expenses List */}
        <div className="lg:col-span-2 glass-panel rounded-3xl p-6 border border-border space-y-6">
          <h2 className="text-xl font-bold tracking-tight">Logged Operational Outflows</h2>

          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 space-y-4">
              <div className="w-10 h-10 rounded-full border-4 border-primary border-t-transparent animate-spin" />
              <p className="text-muted-foreground text-sm font-medium">Fetching expense entries...</p>
            </div>
          ) : expenses.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center space-y-4">
              <div className="w-16 h-16 rounded-2xl bg-secondary/50 flex items-center justify-center text-muted-foreground/30 border border-border">
                <CreditCard size={32} />
              </div>
              <div>
                <h3 className="font-bold text-lg text-foreground">No expenses logged</h3>
                <p className="text-sm text-muted-foreground max-w-xs mt-1">
                  Keep track of operational costs by logging business purchases on the left.
                </p>
              </div>
            </div>
          ) : (
            <div className="overflow-x-auto -mx-6 sm:-mx-0">
              <div className="inline-block min-w-full align-middle px-6 sm:px-0">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-border text-xs text-muted-foreground font-bold uppercase bg-secondary/20">
                      <th className="py-4 px-6 whitespace-nowrap">Category</th>
                      <th className="py-4 px-6 whitespace-nowrap">Description</th>
                      <th className="py-4 px-6 whitespace-nowrap">Date</th>
                      <th className="py-4 px-6 whitespace-nowrap">Amount</th>
                      <th className="py-4 px-6 whitespace-nowrap text-right">Delete</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {pagedExpenses.map((exp) => (
                      <tr key={exp.id} className="hover:bg-secondary/10 transition-colors">
                        <td className="py-4 px-6 font-bold text-foreground text-sm whitespace-nowrap">{exp.category}</td>
                        <td className="py-4 px-6 text-muted-foreground text-sm max-w-[150px] truncate">{exp.description || 'No notes'}</td>
                        <td className="py-4 px-6 text-muted-foreground text-sm whitespace-nowrap">{exp.expense_date}</td>
                        <td className="py-4 px-6 font-extrabold text-red-400 text-sm whitespace-nowrap">
                          -{getCurrencySymbol(currency)}{exp.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="py-4 px-6 text-right whitespace-nowrap">
                          <button
                            onClick={() => setDeleteTarget(exp.id)}
                            className="p-1.5 rounded-lg text-muted-foreground hover:text-red-400 hover:bg-red-500/10 transition-colors"
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
          )}
          <Pagination currentPage={page} totalPages={totalPages} onPageChange={setPage} />
        </div>

      </div>

      <ConfirmModal
        open={!!deleteTarget}
        title="Delete Expense"
        message="Are you sure you want to remove this expense record?"
        confirmLabel="Delete"
        variant="danger"
        loading={deleting}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
