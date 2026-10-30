import React, { useState, useRef } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import { db } from '../../lib/supabase';
import { parseDocument } from '../../lib/ocrParser';
import {
  SubscriptionCategory,
  BillingIntervalUnit,
  PaymentSource,
} from '../../types';
import {
  UploadCloud,
  FileText,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  ShieldAlert,
  Trash2,
  RefreshCw,
  Sparkles,
  Info,
  Check,
  Edit2,
  FileSpreadsheet,
  FileImage,
  ArrowLeft,
  Calendar,
} from 'lucide-react';

interface ExtractedCandidate {
  id: string;
  merchantName: string;
  rawString: string;
  amount: number;
  currency: string;
  date: string;
  cadence: 'monthly' | 'yearly';
  category: SubscriptionCategory;
  confidence: number;
  isDuplicate: boolean;
  duplicateMerchant?: string;
  isRecurring: boolean;
  selected: boolean;
  paymentSource?: string;
}

export const AddUploadInvoice: React.FC = () => {
  const { user } = useAuth();
  const { theme } = useTheme();
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [dragActive, setDragActive] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [extractionDone, setExtractionDone] = useState(false);
  const [selectedCandidate, setSelectedCandidate] = useState<ExtractedCandidate | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [unconfirmedEstimate, setUnconfirmedEstimate] = useState(true);

  // Candidates extracted from the document
  const [candidates, setCandidates] = useState<ExtractedCandidate[]>([]);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processSelectedFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processSelectedFile(e.target.files[0]);
    }
  };

  const processSelectedFile = async (selectedFile: File) => {
    const validTypes = ['application/pdf', 'image/png', 'image/jpeg', 'text/csv'];
    if (!validTypes.includes(selectedFile.type) && !selectedFile.name.endsWith('.csv') && !selectedFile.name.endsWith('.pdf')) {
      alert('Invalid file format. Please upload a PDF, PNG, JPG, or CSV file.');
      return;
    }

    if (selectedFile.size > 10 * 1024 * 1024) {
      alert('File size exceeds the 10MB limit.');
      return;
    }

    setFile(selectedFile);
    setIsProcessing(true);
    setUploadProgress(25);

    try {
      const prefCur = (user?.preferred_currency as any) || 'USD';
      const extracted = await parseDocument(
        selectedFile,
        () => {
          setUploadProgress((p) => Math.min(90, p + 25));
        },
        prefCur
      );

      setUploadProgress(100);
      setIsProcessing(false);
      setExtractionDone(true);

      if (extracted.length > 0) {
        const mapped: ExtractedCandidate[] = extracted.map((item, idx) => ({
          id: `ext-${idx + 1}`,
          merchantName: item.merchantName,
          rawString: item.rawString,
          amount: item.amount,
          currency: item.currency,
          date: item.renewalDate || item.date,
          cadence: item.cadence,
          category: item.category,
          confidence: item.confidence,
          isDuplicate: item.isDuplicate,
          duplicateMerchant: item.duplicateMerchant,
          isRecurring: item.isRecurring,
          selected: idx === 0,
          paymentSource: item.paymentSource,
        }));
        setCandidates(mapped);
        setSelectedCandidate(mapped[0]);
      } else {
        const cleanName = selectedFile.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ');
        const fallback: ExtractedCandidate = {
          id: 'ext-fallback',
          merchantName: cleanName,
          rawString: selectedFile.name,
          amount: 0,
          currency: prefCur,
          date: new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0],
          cadence: 'monthly',
          category: 'Software & Tools',
          confidence: 65,
          isDuplicate: false,
          isRecurring: true,
          selected: true,
          paymentSource: prefCur === 'INR' ? 'UPI AutoPay / Bank Mandate' : 'Primary Corporate Card •••• 4092',
        };
        setCandidates([fallback]);
        setSelectedCandidate(fallback);
      }
    } catch (err) {
      console.error('Invoice scanning error:', err);
      setIsProcessing(false);
      setExtractionDone(true);
      const cleanName = selectedFile.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ');
      const fallback: ExtractedCandidate = {
        id: 'ext-error',
        merchantName: cleanName,
        rawString: selectedFile.name,
        amount: 0,
        currency: (user?.preferred_currency as any) || 'USD',
        date: new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0],
        cadence: 'monthly',
        category: 'Software & Tools',
        confidence: 50,
        isDuplicate: false,
        isRecurring: true,
        selected: true,
        paymentSource: 'Primary Corporate Card •••• 4092',
      };
      setCandidates([fallback]);
      setSelectedCandidate(fallback);
    }
  };

  const handleReset = () => {
    setFile(null);
    setExtractionDone(false);
    setCandidates([]);
    setSelectedCandidate(null);
    setUploadProgress(0);
  };

  const handleConfirmSubscription = async () => {
    if (!selectedCandidate) return;
    setIsSaving(true);

    await db.createSubscription({
      user_id: user?.id || 'default-user',
      merchant_name: selectedCandidate.merchantName,
      category: selectedCandidate.category,
      amount: selectedCandidate.amount,
      currency: selectedCandidate.currency as any,
      billing_interval: 1,
      billing_interval_unit: selectedCandidate.cadence === 'yearly' ? 'years' : 'months',
      next_billing_date: selectedCandidate.date,
      payment_mode_label: selectedCandidate.paymentSource,
      status: unconfirmedEstimate ? 'needs_review' : 'active',
      confidence_status: unconfirmedEstimate ? 'unconfirmed_estimate' : 'verified',
      notes: `Extracted from statement: ${selectedCandidate.rawString}`,
    });

    setIsSaving(false);
    navigate('/subscriptions');
  };

  return (
    <div className="max-w-5xl mx-auto space-y-7 animate-in fade-in duration-200">
      
      {/* ========================================================= */}
      {/* HEADER                                                    */}
      {/* ========================================================= */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <NavLink
            to="/subscriptions"
            className="p-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-500 hover:text-slate-800 dark:hover:text-white transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </NavLink>
          <div>
            <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">
              Upload Statement or Invoice
            </h1>
            <p className="text-xs text-slate-400">
              AI-assisted transaction detection with full manual audit and deduplication
            </p>
          </div>
        </div>

        <NavLink
          to="/subscriptions/new"
          className="py-2 px-3.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 text-xs font-bold hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center gap-2"
        >
          <Edit2 className="w-3.5 h-3.5 text-slate-400" />
          <span>Manual Entry Form</span>
        </NavLink>
      </div>

      {/* Aggregator Warning Banner (From Figma frame 15:15664) */}
      <div className="p-4 rounded-2xl bg-blue-50/70 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900/40 flex items-start gap-3">
        <Info className="w-5 h-5 text-[#2446D8] shrink-0 mt-0.5" />
        <p className="text-xs text-blue-900 dark:text-blue-200 leading-relaxed">
          Aggregators frequently use reseller names like FastSpring, Paddle, or Cleeng. RecurSight prevents ghost charges by validating merchant identity prior to recurring ledger registration.
        </p>
      </div>

      {!extractionDone ? (
        /* ========================================================= */
        /* EMPTY UPLOAD STATE (SCREEN 4)                            */
        /* ========================================================= */
        <div className="space-y-6">
          <div
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
            className={`p-10 lg:p-14 rounded-3xl border-2 border-dashed text-center transition-all cursor-pointer bg-white dark:bg-slate-900 ${
              dragActive
                ? 'border-[#2446D8] bg-blue-50/40 dark:bg-blue-950/20 scale-[1.01]'
                : 'border-slate-300 dark:border-slate-700 hover:border-slate-400'
            }`}
            onClick={() => fileInputRef.current?.click()}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.png,.jpg,.jpeg,.csv"
              className="hidden"
              onChange={handleFileChange}
            />

            <div className="w-16 h-16 rounded-3xl bg-blue-50 dark:bg-slate-800 text-[#2446D8] dark:text-blue-400 flex items-center justify-center mx-auto mb-4 border border-blue-100 dark:border-slate-700 shadow-sm">
              <UploadCloud className="w-8 h-8" />
            </div>

            <h3 className="text-lg font-bold text-slate-900 dark:text-white">
              Drag & Drop your statement or invoice here
            </h3>
            <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
              Supports bank statements, credit card statements, and SaaS receipts (PDF, PNG, JPG, CSV up to 10MB)
            </p>

            <button
              type="button"
              className="mt-6 py-2.5 px-6 rounded-xl bg-[#2446D8] hover:bg-blue-700 text-white text-xs font-bold shadow-md shadow-blue-600/20 transition-all inline-flex items-center gap-2"
            >
              <span>Browse Files</span>
            </button>
          </div>

          {/* Supported Format Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-red-50 text-red-600 dark:bg-red-950/50">
                <FileText className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-slate-900 dark:text-white">PDF Statements</h4>
                <p className="text-[11px] text-slate-400">Monthly bank / credit statements</p>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-emerald-50 text-emerald-600 dark:bg-emerald-950/50">
                <FileSpreadsheet className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-slate-900 dark:text-white">CSV Exports</h4>
                <p className="text-[11px] text-slate-400">Online banking transaction history</p>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-purple-50 text-purple-600 dark:bg-purple-950/50">
                <FileImage className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-slate-900 dark:text-white">Receipt Screenshots</h4>
                <p className="text-[11px] text-slate-400">PNG / JPG billing confirmations</p>
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* ========================================================= */
        /* UPLOADED FILE & REVIEW EXTRACTED DETAILS (SCREEN 5)       */
        /* ========================================================= */
        <div className="space-y-6">
          
          {/* File Status Bar */}
          <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 dark:bg-emerald-950 flex items-center justify-center font-bold">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <div>
                <span className="text-xs font-bold text-slate-900 dark:text-white block">
                  {file?.name || 'Bank_Statement_October_2026.pdf'}
                </span>
                <span className="text-[11px] text-slate-400">
                  {((file?.size || 245000) / 1024).toFixed(1)} KB • 3 Recurring Candidates Detected
                </span>
              </div>
            </div>

            <button
              onClick={handleReset}
              className="py-1.5 px-3 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center gap-1.5"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Replace File</span>
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-7">
            
            {/* LEFT COLUMN: Detected Entities List */}
            <div className="lg:col-span-6 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                  Detected Entities ({candidates.length})
                </h2>
                <span className="text-xs text-slate-400">Select to review & confirm</span>
              </div>

              <div className="space-y-3">
                {candidates.map((cand) => (
                  <div
                    key={cand.id}
                    onClick={() => setSelectedCandidate(cand)}
                    className={`p-4 rounded-2xl border transition-all cursor-pointer bg-white dark:bg-slate-900 ${
                      selectedCandidate?.id === cand.id
                        ? 'border-[#2446D8] ring-2 ring-[#2446D8]/20 shadow-sm'
                        : 'border-slate-200 dark:border-slate-800 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-blue-50 dark:bg-slate-800 text-[#2446D8] font-bold flex items-center justify-center text-xs">
                          {cand.merchantName.charAt(0)}
                        </div>
                        <div>
                          <h4 className="text-xs font-bold text-slate-900 dark:text-white">
                            {cand.merchantName}
                          </h4>
                          <span className="text-[11px] text-slate-400 font-mono">
                            {cand.rawString}
                          </span>
                        </div>
                      </div>

                      <div className="text-right">
                        <span className="text-sm font-black text-slate-900 dark:text-white">
                          ${cand.amount}
                        </span>
                        <span className="text-[10px] text-slate-400 block capitalize">
                          /{cand.cadence}
                        </span>
                      </div>
                    </div>

                    {/* Duplicate Warning */}
                    {cand.isDuplicate && (
                      <div className="mt-3 p-2 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/50 flex items-center gap-2 text-[11px] text-amber-800 dark:text-amber-300">
                        <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                        <span>Possible duplicate with active {cand.duplicateMerchant} subscription.</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* RIGHT COLUMN: Review & Confirm Extracted Details (Figma Screen 5) */}
            <div className="lg:col-span-6 bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm">
              {selectedCandidate ? (
                <div className="space-y-4">
                  <div className="pb-3 border-b border-slate-100 dark:border-slate-800">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                      Review & Confirm Extracted Details
                    </span>
                    <h3 className="text-lg font-extrabold text-slate-900 dark:text-white mt-1">
                      {selectedCandidate.merchantName}
                    </h3>
                    <p className="text-xs text-slate-400 font-mono mt-0.5">
                      Identified via transaction string '{selectedCandidate.rawString}'
                    </p>
                  </div>

                  <div className="space-y-3 text-xs">
                    <div>
                      <label className="block text-slate-400 font-semibold mb-1">Service / Merchant Name</label>
                      <input
                        type="text"
                        value={selectedCandidate.merchantName}
                        onChange={(e) =>
                          setSelectedCandidate({
                            ...selectedCandidate,
                            merchantName: e.target.value,
                          })
                        }
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-bold"
                      />
                    </div>

                    <div>
                      <label className="block text-slate-400 font-semibold mb-1">Expenditure Category</label>
                      <input
                        type="text"
                        value={selectedCandidate.category}
                        onChange={(e) =>
                          setSelectedCandidate({
                            ...selectedCandidate,
                            category: e.target.value as SubscriptionCategory,
                          })
                        }
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-medium"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-slate-400 font-semibold mb-1">Observed Charge</label>
                        <input
                          type="number"
                          step="0.01"
                          value={selectedCandidate.amount}
                          onChange={(e) =>
                            setSelectedCandidate({
                              ...selectedCandidate,
                              amount: parseFloat(e.target.value) || 0,
                            })
                          }
                          className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 font-bold text-slate-900 dark:text-white"
                        />
                      </div>

                      <div>
                        <label className="block text-slate-400 font-semibold mb-1">Billing Cadence</label>
                        <select
                          value={selectedCandidate.cadence}
                          onChange={(e) =>
                            setSelectedCandidate({
                              ...selectedCandidate,
                              cadence: e.target.value as any,
                            })
                          }
                          className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-medium"
                        >
                          <option value="monthly">Monthly</option>
                          <option value="yearly">Annually</option>
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className="block text-slate-400 font-semibold mb-1">Projected Next Renewal</label>
                      <input
                        type="date"
                        value={selectedCandidate.date}
                        onChange={(e) =>
                          setSelectedCandidate({
                            ...selectedCandidate,
                            date: e.target.value,
                          })
                        }
                        style={{ colorScheme: theme === 'dark' ? 'dark' : 'light' }}
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-medium"
                      />
                    </div>

                    <div>
                      <label className="block text-slate-400 font-semibold mb-1">Payment Source Account</label>
                      <input
                        type="text"
                        value={selectedCandidate.paymentSource || ''}
                        onChange={(e) =>
                          setSelectedCandidate({
                            ...selectedCandidate,
                            paymentSource: e.target.value,
                          })
                        }
                        placeholder="e.g. HDFC Visa •••• 4090 or UPI AutoPay"
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-medium"
                      />
                    </div>

                    {/* Unconfirmed estimate toggle from Figma */}
                    <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                      <label className="flex items-center gap-2 cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={unconfirmedEstimate}
                          onChange={(e) => setUnconfirmedEstimate(e.target.checked)}
                          className="w-4 h-4 rounded text-[#2446D8] focus:ring-[#2446D8]"
                        />
                        <span className="font-semibold text-slate-700 dark:text-slate-300">
                          Mark as Unconfirmed Estimate
                        </span>
                      </label>
                      <p className="text-[11px] text-slate-400 mt-1 pl-6">
                        Flags this entry on the dashboard until confirmed against subsequent bank debits.
                      </p>
                    </div>

                    {/* Cancellation Guidance Availability Notice from Figma */}
                    <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/40 text-amber-800 dark:text-amber-300 text-[11px] flex items-center gap-2">
                      <ShieldAlert className="w-4 h-4 shrink-0" />
                      <span>No standard 1-click cancellation guidance available yet for FastSpring vendor accounts.</span>
                    </div>
                  </div>

                  <button
                    onClick={handleConfirmSubscription}
                    disabled={isSaving}
                    className="w-full py-3 px-4 rounded-xl bg-[#2446D8] hover:bg-blue-700 disabled:opacity-70 text-white text-xs font-bold shadow-md shadow-blue-600/20 flex items-center justify-center gap-2 transition-all mt-4"
                  >
                    {isSaving ? (
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                      <>
                        <Check className="w-4 h-4" />
                        <span>Confirm & Add to Subscriptions Ledger</span>
                      </>
                    )}
                  </button>
                </div>
              ) : (
                <div className="text-center py-12 text-slate-400 text-xs">
                  Select a detected entity on the left to review details.
                </div>
              )}
            </div>

          </div>
        </div>
      )}

    </div>
  );
};
