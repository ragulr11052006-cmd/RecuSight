import React, { useState, useRef, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import { db } from '../../lib/supabase';
import { parseDocument, ParsedTransaction, convertCurrency, detectCategoryFromText } from '../../lib/ocrParser';
import { searchCatalog, findCatalogItem, CatalogSubscription } from '../../lib/subscriptionCatalog';
import { MerchantLogo } from '../../components/common/MerchantLogo';
import {
  Subscription,
  SubscriptionCategory,
  BillingIntervalUnit,
  PaymentSource,
  Currency,
  CURRENCY_SYMBOLS,
} from '../../types';
import {
  UploadCloud,
  FileText,
  AlertTriangle,
  RefreshCw,
  Info,
  Check,
  SlidersHorizontal,
  ChevronDown,
  ShieldCheck,
  ShieldAlert,
  Sparkles,
  Eye,
  X,
  CreditCard,
  Calendar,
  Search,
  CheckCircle2,
  Hourglass,
  Clock,
  Smartphone,
  Layers,
  Tv,
  CheckSquare,
  Cloud,
  Activity,
  MoreHorizontal,
  Mail,
  Bell,
  MessageSquare,
  HelpCircle,
  Plus,
  Building2,
} from 'lucide-react';

export const AddSubscriptionPage: React.FC = () => {
  const { user } = useAuth();
  const { theme } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Active Tab: 'upload' or 'manual'
  const [activeTab, setActiveTab] = useState<'upload' | 'manual'>(() => {
    return location.pathname.includes('/new') ? 'manual' : 'upload';
  });

  // ==========================================
  // STATE FOR UPLOAD INVOICE WORKFLOW
  // ==========================================
  const [dragActive, setDragActive] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isZoomModalOpen, setIsZoomModalOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string>('');
  const [extractionDone, setExtractionDone] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const userPreferredCurrency = user?.preferred_currency || 'USD';
  const [candidates, setCandidates] = useState<ParsedTransaction[]>([]);
  const [selectedCandidateIndex, setSelectedCandidateIndex] = useState<number>(0);
  const [existingSubscriptions, setExistingSubscriptions] = useState<Subscription[]>([]);

  // Load user's actual subscriptions for real deduplication (Never hardcoded)
  useEffect(() => {
    async function loadSubs() {
      try {
        const subs = await db.getSubscriptions(user?.id || 'default-user');
        setExistingSubscriptions(subs);
      } catch (err) {
        console.warn('Error loading subscriptions for duplicate check:', err);
      }
    }
    loadSubs();
  }, [user?.id]);

  // Editable Form fields on Right Column (synced with selected candidate)
  const [formMerchantName, setFormMerchantName] = useState('');
  const [formCategory, setFormCategory] = useState<SubscriptionCategory>('Software & Tools');
  const [formAmount, setFormAmount] = useState('');
  const [formCurrency, setFormCurrency] = useState<Currency>(userPreferredCurrency);
  const [formCadence, setFormCadence] = useState<'monthly' | 'yearly' | 'unknown'>('unknown');
  const [formCadencePrompt, setFormCadencePrompt] = useState(false);
  const [formRenewalDate, setFormRenewalDate] = useState('');
  const [formPaymentSourceId, setFormPaymentSourceId] = useState('');
  const [formUnconfirmedEstimate, setFormUnconfirmedEstimate] = useState(false);

  // ==========================================
  // STATE FOR MANUAL ENTRY WORKFLOW (Screenshot 2)
  // ==========================================
  const [manualMerchantName, setManualMerchantName] = useState('');
  const [manualCategory, setManualCategory] = useState<SubscriptionCategory>('Software & Dev');
  const [manualCurrency, setManualCurrency] = useState<Currency>(userPreferredCurrency);
  const [manualAmount, setManualAmount] = useState('');

  // React to user preferred currency changes in profile
  useEffect(() => {
    const cur = user?.preferred_currency || 'USD';
    setFormCurrency(cur);
    setManualCurrency(cur);
  }, [user?.preferred_currency]);

  const handleManualCurrencyChange = (newCurrency: Currency) => {
    const amt = parseFloat(manualAmount) || 0;
    if (amt > 0) {
      const converted = convertCurrency(amt, manualCurrency, newCurrency);
      setManualAmount(newCurrency === 'INR' ? Math.round(converted).toFixed(2) : converted.toFixed(2));
    }
    setManualCurrency(newCurrency);
  };

  const handleFormCurrencyChange = (newCurrency: Currency) => {
    const amt = parseFloat(formAmount) || 0;
    if (amt > 0) {
      const converted = convertCurrency(amt, formCurrency, newCurrency);
      setFormAmount(newCurrency === 'INR' ? Math.round(converted).toFixed(2) : converted.toFixed(2));
    }
    setFormCurrency(newCurrency);
  };

  const [manualCadence, setManualCadence] = useState<'monthly' | 'annually' | 'quarterly' | 'custom'>('monthly');
  const [manualNextDate, setManualNextDate] = useState('');
  const [manualPaymentInstrument, setManualPaymentInstrument] = useState<string>('upi_mandate');
  const [manualMandateRef, setManualMandateRef] = useState('');
  const [manualAlert7Days, setManualAlert7Days] = useState(true);
  const [manualAlert2Days, setManualAlert2Days] = useState(true);
  const [manualAlertConfirmation, setManualAlertConfirmation] = useState(false);
  const [manualTargetEmail, setManualTargetEmail] = useState(true);
  const [manualTargetInApp, setManualTargetInApp] = useState(false);
  const [manualTargetSMS, setManualTargetSMS] = useState(false);
  const [isTrial, setIsTrial] = useState(false);
  const [trialEndDate, setTrialEndDate] = useState('');

  // Modal State for Link New Payment Rail
  const [isAddRailModalOpen, setIsAddRailModalOpen] = useState(false);
  const [newRailType, setNewRailType] = useState<'upi' | 'card' | 'bank'>('upi');
  const [newRailName, setNewRailName] = useState('');
  const [newRailDetails, setNewRailDetails] = useState('');
  const [railSuccessMsg, setRailSuccessMsg] = useState<string | null>(null);
  const [customRails, setCustomRails] = useState<{ id: string; name: string; num: string; icon: any }[]>([]);

  // Autocomplete state for Merchant or Service Name
  const [isAutocompleteOpen, setIsAutocompleteOpen] = useState(false);
  const autocompleteContainerRef = useRef<HTMLDivElement | null>(null);

  // Close autocomplete on click outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        autocompleteContainerRef.current &&
        !autocompleteContainerRef.current.contains(e.target as Node)
      ) {
        setIsAutocompleteOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Quick Pick preset merchants
  const QUICK_PICKS = [
    'Netflix',
    'Disney+ Hotstar',
    'Spotify',
    'YouTube Premium',
    'Adobe Creative Cloud',
    'ChatGPT Plus',
    'Figma',
    'Canva Pro',
    'GitHub Copilot',
    'LinkedIn Premium',
  ];

  // Handler for selecting any app (from autocomplete or quick picks)
  const handleSelectApp = (app: CatalogSubscription | { name: string; category?: SubscriptionCategory; defaultCadence?: 'monthly' | 'annually'; defaultAmounts?: Record<Currency, number> }) => {
    setManualMerchantName(app.name);
    if (app.category) {
      setManualCategory(app.category);
    }
    if (app.defaultCadence) {
      setManualCadence(app.defaultCadence);
    }
    if (app.defaultAmounts) {
      const amt = app.defaultAmounts[manualCurrency] || app.defaultAmounts.USD || 0;
      if (amt > 0 && (!manualAmount || manualAmount === '0' || manualAmount === '0.00')) {
        setManualAmount(manualCurrency === 'INR' ? Math.round(amt).toFixed(2) : amt.toFixed(2));
      }
    }
    // Set default renewal date if empty
    if (!manualNextDate) {
      const d = new Date();
      if (app.defaultCadence === 'annually') {
        d.setFullYear(d.getFullYear() + 1);
      } else {
        d.setDate(d.getDate() + 30);
      }
      setManualNextDate(d.toISOString().split('T')[0]);
    }
    setIsAutocompleteOpen(false);
  };

  const handleCustomAdd = (customName: string) => {
    const clean = customName.trim();
    if (!clean) return;
    setManualMerchantName(clean);
    const inferred = detectCategoryFromText(clean);
    setManualCategory(inferred);
    if (!manualNextDate) {
      const d = new Date();
      d.setDate(d.getDate() + 30);
      setManualNextDate(d.toISOString().split('T')[0]);
    }
    setIsAutocompleteOpen(false);
  };

  // Expenditure Categories for Manual Entry
  const CATEGORIES = [
    { id: 'Software & Dev', label: 'Software & Dev', icon: Layers },
    { id: 'Streaming & Ent', label: 'Streaming & Ent', icon: Tv },
    { id: 'Productivity', label: 'Productivity', icon: CheckSquare },
    { id: 'Utilities & Cloud', label: 'Utilities & Cloud', icon: Cloud },
    { id: 'Fitness & Health', label: 'Fitness & Health', icon: Activity },
    { id: 'Other Misc', label: 'Other Misc', icon: MoreHorizontal },
  ];

  // Sync right column form whenever the active candidate changes
  const activeCandidate = candidates[selectedCandidateIndex] || null;

  useEffect(() => {
    if (activeCandidate) {
      setFormMerchantName(activeCandidate.merchantName);
      setFormCategory(activeCandidate.category);
      setFormAmount(
        activeCandidate.amount !== null && activeCandidate.amount !== undefined && activeCandidate.amount > 0
          ? activeCandidate.amount.toFixed(2)
          : ''
      );
      const candCurrency = (activeCandidate.currency as Currency) || 'USD';
      setFormCurrency(candCurrency);
      setFormCadence(activeCandidate.cadence || 'unknown');
      setFormRenewalDate(activeCandidate.renewalDate || '');
      setFormUnconfirmedEstimate(activeCandidate.confidence < 80 || activeCandidate.amount === null || !activeCandidate.merchantName);
      setFormPaymentSourceId(activeCandidate.paymentSource || '');
    }
  }, [selectedCandidateIndex, candidates]);

  // Clean up object URLs on unmount
  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  // DRAG & DROP HANDLERS
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
      handleProcessFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleProcessFile(e.target.files[0]);
    }
  };

  const handleProcessFile = async (uploadedFile: File) => {
    setFile(uploadedFile);
    setIsProcessing(true);
    setStatusMessage('Scanning invoice / statement for final total amount...');

    if (uploadedFile.type.startsWith('image/')) {
      const url = URL.createObjectURL(uploadedFile);
      setPreviewUrl(url);
    } else {
      setPreviewUrl(null);
    }

    try {
      const prefCur = user?.preferred_currency || 'USD';
      const extracted = await parseDocument(uploadedFile, (msg) => setStatusMessage(msg), prefCur);
      if (extracted.length > 0) {
        // Real duplicate detection against user's actual database subscriptions
        const mapped = extracted.map((tx) => {
          const clean = tx.merchantName.toLowerCase().trim();
          const match = existingSubscriptions.find((s) => {
            const sName = s.merchant_name.toLowerCase().trim();
            return sName.includes(clean) || clean.includes(sName);
          });
          return {
            ...tx,
            isDuplicate: Boolean(match),
            duplicateMerchant: match ? match.merchant_name : undefined,
          };
        });

        setCandidates(mapped);
        setSelectedCandidateIndex(0);
        setExtractionDone(true);

        const primaryCand = mapped[0];
        if (primaryCand) {
          setFormCurrency(primaryCand.currency);
          setFormAmount(
            primaryCand.amount !== null && primaryCand.amount !== undefined && primaryCand.amount > 0
              ? primaryCand.amount.toFixed(2)
              : ''
          );
          setFormMerchantName(primaryCand.merchantName);
          setFormCategory(primaryCand.category);
          setFormCadence(primaryCand.cadence || 'unknown');
          setFormRenewalDate(primaryCand.renewalDate || '');
          setFormPaymentSourceId(primaryCand.paymentSource || '');
          setFormUnconfirmedEstimate(primaryCand.confidence < 80 || primaryCand.amount === null || !primaryCand.merchantName);
        }
      } else {
        const cleanName = uploadedFile.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ');
        const customCand: ParsedTransaction = {
          merchantName: cleanName,
          rawString: uploadedFile.name,
          amount: null,
          amountStatus: 'not_found',
          currency: prefCur,
          date: null,
          renewalDate: null,
          cadence: 'unknown',
          category: 'Software & Tools',
          confidence: 45,
          isDuplicate: false,
          isRecurring: true,
          notes: 'No fields detected from document',
          detectedAmounts: [],
          ocrSnippet: `Uploaded file: ${uploadedFile.name}`,
        };
        setCandidates([customCand]);
        setSelectedCandidateIndex(0);
        setExtractionDone(true);
        setFormCurrency(prefCur);
        setFormAmount('');
        setFormMerchantName(cleanName);
        setFormCategory('Software & Tools');
        setFormCadence('unknown');
        setFormRenewalDate('');
        setFormPaymentSourceId('');
        setFormUnconfirmedEstimate(true);
      }
    } catch (err) {
      console.error('Extraction error:', err);
      const cleanName = uploadedFile.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ');
      const fallbackCand: ParsedTransaction = {
        merchantName: cleanName,
        rawString: uploadedFile.name,
        amount: null,
        amountStatus: 'not_found',
        currency: user?.preferred_currency || 'USD',
        date: null,
        renewalDate: null,
        cadence: 'unknown',
        category: 'Software & Tools',
        confidence: 30,
        isDuplicate: false,
        isRecurring: true,
        notes: 'File scan or OCR could not extract fields',
        detectedAmounts: [],
        ocrSnippet: uploadedFile.name,
      };
      setCandidates([fallbackCand]);
      setSelectedCandidateIndex(0);
      setExtractionDone(true);
      setFormMerchantName(cleanName);
      setFormAmount('');
      setFormCadence('unknown');
      setFormRenewalDate('');
      setFormPaymentSourceId('');
      setFormUnconfirmedEstimate(true);
      setSelectedCandidateIndex(0);
      setExtractionDone(true);
      setFormMerchantName(cleanName);
      setFormAmount('');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleResetFile = () => {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
    }
    setFile(null);
    setExtractionDone(false);
    const cur = user?.preferred_currency || 'USD';
    setCandidates([]);
    setFormCurrency(cur);
    setFormAmount('');
    setFormMerchantName('');
    setFormRenewalDate('');
    setFormPaymentSourceId('');
    setFormUnconfirmedEstimate(false);
  };

  const handleLinkNewRail = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRailName.trim()) return;
    const newId = `custom_rail_${Date.now()}`;
    const IconComp = newRailType === 'upi' ? Smartphone : newRailType === 'bank' ? Building2 : CreditCard;
    const newRail = {
      id: newId,
      name: newRailName.trim(),
      num: newRailDetails.trim() || (newRailType === 'upi' ? 'UPI AutoPay Mandate' : '•••• 9921 Active'),
      icon: IconComp,
    };
    setCustomRails((prev) => [...prev, newRail]);
    setManualPaymentInstrument(newId);
    setIsAddRailModalOpen(false);
    setNewRailName('');
    setNewRailDetails('');
    setRailSuccessMsg(`Payment rail "${newRail.name}" successfully linked!`);
    setTimeout(() => setRailSuccessMsg(null), 4000);
  };

  // CONFIRM & REGISTER SUBSCRIPTION FROM UPLOAD
  const handleConfirmExtracted = async () => {
    if (!formMerchantName.trim()) return;
    setIsSaving(true);

    const intervalUnit: BillingIntervalUnit = formCadence === 'yearly' ? 'years' : 'months';
    const numAmount = parseFloat(formAmount) || 0;

    const rawMode = formPaymentSourceId.trim();
    let modeLabel = rawMode;
    let modeBadge = 'Not available in invoice';

    if (rawMode) {
      const isUpi = rawMode.toLowerCase().includes('upi') || rawMode.toLowerCase().includes('phonepe') || rawMode.toLowerCase().includes('gpay');
      const isCard = rawMode.toLowerCase().includes('card') || rawMode.toLowerCase().includes('visa') || rawMode.toLowerCase().includes('mastercard') || rawMode.toLowerCase().includes('••••');
      modeLabel = rawMode;
      modeBadge = isUpi ? 'UPI AutoPay: Active' : isCard ? 'Card Auto-Debit: Active' : 'AutoPay: Active';
    } else {
      modeLabel = 'Not available in invoice';
      modeBadge = 'Not available in invoice';
    }

    const userId = user?.id || 'default-user';
    let documentId = 'doc-' + Date.now();

    // 1. Upload to Supabase Storage & Create Document Record
    if (file) {
      const uploadRes = await db.uploadInvoiceFile(file, userId);
      const docRecord = await db.createDocumentRecord({
        user_id: userId,
        storage_path: uploadRes.storagePath,
        original_filename: file.name,
        mime_type: file.type || 'application/pdf',
        file_size: file.size,
        processing_status: 'completed',
        raw_ocr_data: activeCandidate?.extractionResult || null,
      });
      documentId = docRecord.id;
    }

    // 2. Create Verified Subscription
    const created = await db.createSubscription({
      user_id: userId,
      merchant_name: formMerchantName,
      category: formCategory,
      amount: numAmount,
      currency: formCurrency,
      billing_interval: 1,
      billing_interval_unit: intervalUnit,
      next_billing_date: formRenewalDate,
      payment_mode_label: modeLabel,
      payment_mode_badge: modeBadge,
      status: formUnconfirmedEstimate ? 'needs_review' : 'active',
      confidence_status: formUnconfirmedEstimate ? 'unconfirmed_estimate' : 'verified',
      notes: activeCandidate ? `Extracted via: ${activeCandidate.rawString}` : 'Statement extraction',
    });

    // 3. Create Extracted Transaction Record linked to document and subscription
    if (file) {
      await db.createExtractedTransaction({
        user_id: userId,
        document_id: documentId,
        merchant_name: formMerchantName,
        transaction_description: activeCandidate?.rawString || `${formMerchantName} subscription`,
        amount: numAmount,
        currency: formCurrency,
        transaction_date: activeCandidate?.date || formRenewalDate || new Date().toISOString().split('T')[0],
        suggested_cadence: formCadence,
        suggested_category: formCategory,
        confidence_score: activeCandidate?.confidence ? activeCandidate.confidence / 100 : 0.85,
        possible_duplicate: Boolean(activeCandidate?.isDuplicate),
        matched_subscription_id: created.id,
        is_recurring_candidate: true,
        review_status: 'confirmed',
      });
    }

    // 4. Create Reminder
    if (created && formRenewalDate) {
      const reminderTime = new Date(formRenewalDate);
      reminderTime.setDate(reminderTime.getDate() - 2);
      await db.createReminder({
        user_id: userId,
        subscription_id: created.id,
        scheduled_at: reminderTime.toISOString(),
        reminder_type: 'renewal_notice',
        delivery_channel: 'in_app',
        status: 'scheduled',
        timezone: 'EST',
        notes: `Extracted reminder for ${formMerchantName}`,
      });
    }

    setIsSaving(false);
    navigate('/subscriptions');
  };

  const handleDiscardCandidate = () => {
    if (candidates.length <= 1) {
      handleResetFile();
      return;
    }
    const updated = candidates.filter((_, idx) => idx !== selectedCandidateIndex);
    setCandidates(updated);
    setSelectedCandidateIndex(0);
  };

  // SAVE MANUAL ENTRY SUBSCRIPTION (Screenshot 2)
  const handleSaveManual = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualMerchantName.trim()) return;

    setIsSaving(true);
    try {
      const intervalUnit: BillingIntervalUnit = manualCadence === 'annually' ? 'years' : 'months';
      const numAmount = parseFloat(manualAmount) || 0;

      // Ensure valid next billing date: default based on cadence if left empty
      let validNextDate = manualNextDate && manualNextDate.trim() ? manualNextDate.trim() : '';
      if (!validNextDate) {
        const d = new Date();
        if (manualCadence === 'annually') {
          d.setFullYear(d.getFullYear() + 1);
        } else if (manualCadence === 'quarterly') {
          d.setMonth(d.getMonth() + 3);
        } else {
          d.setDate(d.getDate() + 30);
        }
        validNextDate = d.toISOString().split('T')[0];
      }

      let modeLabel = manualCurrency === 'INR' || userPreferredCurrency === 'INR' ? 'UPI AutoPay (Google Pay / PhonePe)' : 'Corporate Card •••• 4092';
      let modeBadge = 'UPI AutoPay: Active';

      if (manualPaymentInstrument === 'upi_mandate') {
        modeLabel = manualCurrency === 'INR' || userPreferredCurrency === 'INR' ? 'UPI AutoPay (Google Pay / PhonePe)' : 'UPI AutoPay';
        modeBadge = 'UPI AutoPay: Active';
      } else {
        const customRail = customRails.find((r) => r.id === manualPaymentInstrument);
        if (customRail) {
          modeLabel = customRail.num ? `${customRail.name} • ${customRail.num}` : customRail.name;
          const isUpi = modeLabel.toLowerCase().includes('upi') || customRail.name.toLowerCase().includes('upi');
          const isCard = modeLabel.toLowerCase().includes('card') || modeLabel.toLowerCase().includes('visa') || modeLabel.toLowerCase().includes('mastercard') || modeLabel.toLowerCase().includes('••••');
          modeBadge = isUpi ? 'UPI AutoPay: Active' : isCard ? 'Card Auto-Debit: Active' : 'Bank Mandate: Active';
        }
      }

      const created = await db.createSubscription({
        user_id: user?.id || 'default-user',
        merchant_name: manualMerchantName.trim(),
        category: manualCategory,
        amount: numAmount,
        currency: manualCurrency,
        billing_interval: 1,
        billing_interval_unit: intervalUnit,
        next_billing_date: validNextDate,
        trial_end_date: isTrial && trialEndDate.trim() ? trialEndDate.trim() : undefined,
        payment_mode_label: modeLabel,
        payment_mode_badge: modeBadge,
        status: isTrial ? 'trial' : 'active',
        confidence_status: 'verified',
        notes: manualMandateRef.trim() ? `Mandate Ref: ${manualMandateRef.trim()}` : `Manual subscription entry`,
      });

      if (created && validNextDate) {
        const reminderTime = new Date(validNextDate);
        reminderTime.setDate(reminderTime.getDate() - 2);
        await db.createReminder({
          user_id: user?.id || 'default-user',
          subscription_id: created.id,
          scheduled_at: reminderTime.toISOString(),
          reminder_type: isTrial ? 'trial_expiry' : 'renewal_notice',
          delivery_channel: manualTargetEmail ? 'email' : 'in_app',
          status: 'scheduled',
          timezone: 'EST',
          notes: `Manual alert for ${manualMerchantName.trim()}`,
        });
      }

      setIsSaving(false);
      navigate('/subscriptions', { state: { justAdded: manualMerchantName.trim() } });
    } catch (err) {
      console.error('Error saving manual subscription:', err);
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      
      {/* ========================================================= */}
      {/* TOP HEADER / TITLE SECTION                                */}
      {/* ========================================================= */}
      <div>
        <div className="text-[10px] font-bold tracking-wider uppercase text-slate-400 mb-1">
          <span>INVESTIGATION INTAKE • </span>
          <span>INTELLIGENT DOCUMENT AUDIT</span>
        </div>

        <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
          Add Subscription
        </h1>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-3xl">
          Upload statements, invoice screenshots, or enter transaction details manually. All algorithmic extractions require explicit confirmation.
        </p>
      </div>

      {/* ========================================================= */}
      {/* SUB-NAVIGATION TABLIST                                    */}
      {/* ========================================================= */}
      <div className="flex items-center gap-2">
        <div className="inline-flex rounded-xl bg-[#F0F4FA] dark:bg-slate-800 p-1 border border-slate-200 dark:border-slate-700">
          <button
            type="button"
            onClick={() => setActiveTab('upload')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all ${
              activeTab === 'upload'
                ? 'bg-[#2446D8] text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Upload Invoice</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('manual')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all ${
              activeTab === 'manual'
                ? 'bg-[#2446D8] text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            <span>Manual Entry</span>
          </button>
        </div>
      </div>

      {/* ========================================================= */}
      {/* CONDITIONAL RENDERING: UPLOAD INVOICE VS MANUAL ENTRY     */}
      {/* ========================================================= */}
      {activeTab === 'upload' ? (
        
        /* ======================================================= */
        /* UPLOAD INVOICE WORKFLOW (Screenshots 3 & 4)             */
        /* ======================================================= */
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* LEFT COLUMN: Dropzone (State A) OR Entities (State B) */}
          <div className="lg:col-span-5 space-y-5">
            {!extractionDone ? (
              /* State A: Dropzone Container (Screenshot 3) */
              <>
                <div
                  onDragEnter={handleDrag}
                  onDragLeave={handleDrag}
                  onDragOver={handleDrag}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  className={`border-2 border-dashed rounded-3xl p-10 text-center transition-all cursor-pointer bg-white dark:bg-slate-900 min-h-[440px] flex flex-col items-center justify-center ${
                    dragActive
                      ? 'border-[#2446D8] ring-2 ring-[#2446D8]/20'
                      : 'border-slate-300 dark:border-slate-700 hover:border-[#2446D8]'
                  }`}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".pdf,.png,.jpg,.jpeg,.csv"
                    className="hidden"
                    onChange={handleFileChange}
                  />

                  <div className="w-14 h-14 rounded-full bg-blue-50 dark:bg-slate-800 text-[#2446D8] flex items-center justify-center mb-4">
                    <UploadCloud className="w-7 h-7" />
                  </div>

                  <h3 className="text-base font-bold text-slate-900 dark:text-white">
                    Drag and drop your invoice or statement here
                  </h3>
                  <p className="text-xs text-slate-400 mt-1 max-w-xs leading-relaxed">
                    Accepts vendor receipts, bank PDFs, or parsed statement snapshots
                  </p>

                  <div className="flex items-center gap-2 mt-4 text-[11px] text-slate-400">
                    <span className="px-2.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 font-semibold">
                      PDF, PNG, JPG, CSV
                    </span>
                    <span>•</span>
                    <span>Max 10MB</span>
                  </div>

                  {isProcessing ? (
                    <div className="mt-5 p-3 rounded-xl bg-blue-50 dark:bg-slate-800 border border-blue-100 flex items-center justify-center gap-2 text-xs font-semibold text-[#2446D8]">
                      <div className="w-4 h-4 border-2 border-[#2446D8] border-t-transparent rounded-full animate-spin" />
                      <span>{statusMessage}</span>
                    </div>
                  ) : (
                    <div className="mt-5 flex flex-col items-center gap-2">
                      <button
                        type="button"
                        className="py-2 px-5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-white text-xs font-bold shadow-xs hover:bg-slate-50 dark:hover:bg-slate-700"
                      >
                        Browse Files
                      </button>
                    </div>
                  )}
                </div>

                {/* How does document audit work? */}
                <div className="p-4 rounded-2xl bg-blue-50/70 dark:bg-slate-900 border border-blue-100 dark:border-slate-800 flex items-start gap-3">
                  <ShieldCheck className="w-5 h-5 text-[#2446D8] shrink-0 mt-0.5" />
                  <div>
                    <h4 className="text-xs font-bold text-slate-900 dark:text-white">
                      How does document audit work?
                    </h4>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                      RecurSight scans recurring vendor tokens without storing raw banking credentials or personal payment card numbers. Extracted values remain encrypted on your private ledger.
                    </p>
                  </div>
                </div>
              </>
            ) : (
              /* State B: Source File Attached & Deducted Entities (Screenshot 4) */
              <>
                {/* Source File Attached Card */}
                <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-slate-900 dark:text-white font-bold text-sm">
                      <FileText className="w-4 h-4 text-[#2446D8]" />
                      <span>Source File Attached</span>
                    </div>
                    <button
                      type="button"
                      onClick={handleResetFile}
                      className="text-xs font-semibold text-[#2446D8] hover:underline flex items-center gap-1"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      <span>Replace File</span>
                    </button>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-[#F8FAFC] dark:bg-slate-800/60 border border-slate-100 dark:border-slate-700 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 flex items-center justify-center font-bold text-slate-700 dark:text-slate-200 text-xs shadow-2xs">
                        <FileText className="w-4 h-4 text-[#2446D8] dark:text-blue-400" />
                      </div>
                      <div>
                        <span className="text-xs font-bold text-slate-900 dark:text-white block truncate max-w-[180px]">
                          {file?.name || 'HDFC_Statement_Oct2...'}
                        </span>
                        <span className="text-[11px] text-slate-400">
                          {((file?.size || 1800000) / (1024 * 1024)).toFixed(1)} MB • Extracted 4 mins ago
                        </span>
                      </div>
                    </div>

                    <div className="px-2.5 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 text-[11px] font-bold flex items-center gap-1.5 border border-emerald-200 dark:border-emerald-800">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 dark:bg-emerald-400" />
                      <span>{candidates.length} Detected</span>
                    </div>
                  </div>
                </div>

                {/* DEDUCTED ENTITIES LIST matching Screenshot 4 */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between px-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      DEDUCTED ENTITIES {candidates.length}
                    </span>
                    <span className="text-[11px] text-slate-400">Click item to verify</span>
                  </div>

                  {candidates.map((cand, idx) => {
                    const isSelected = selectedCandidateIndex === idx;
                    return (
                      <div
                        key={idx}
                        onClick={() => setSelectedCandidateIndex(idx)}
                        className={`rounded-2xl p-4 transition-all cursor-pointer bg-white dark:bg-slate-900 ${
                          isSelected
                            ? 'border-2 border-[#2446D8] shadow-sm'
                            : 'border border-slate-200 dark:border-slate-800 hover:border-slate-300'
                        } ${!cand.isRecurring ? 'opacity-70' : ''}`}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-3">
                            <MerchantLogo name={cand.merchantName} size="md" />
                            <div>
                              <h4 className="text-xs font-bold text-slate-900 dark:text-white">
                                {cand.merchantName || 'Unconfirmed Provider (Click to enter)'}
                              </h4>
                              <span className="text-[11px] text-slate-400 block mt-0.5">
                                Post Date: {cand.date || 'Not stated'}
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center gap-3">
                            <div className="text-right">
                              {cand.amount !== null && cand.amount !== undefined ? (
                                <>
                                  <span className="text-sm font-black text-slate-900 dark:text-white block">
                                    {CURRENCY_SYMBOLS[cand.currency || 'USD'] || '$'}{cand.amount.toFixed(2)}
                                  </span>
                                  <span className="text-[10px] text-slate-400 uppercase">
                                    {cand.currency}
                                  </span>
                                </>
                              ) : (
                                <span className="text-xs font-bold text-amber-600 dark:text-amber-400 block">
                                  Amount not detected
                                </span>
                              )}
                            </div>

                            <div
                              className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                                isSelected
                                  ? 'border-[#2446D8] bg-white'
                                  : 'border-slate-300'
                              }`}
                            >
                              {isSelected && (
                                <div className="w-2.5 h-2.5 rounded-full bg-[#2446D8]" />
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Status / Duplicate Banner */}
                        {cand.isDuplicate && (
                          <div className="mt-3 p-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-amber-900 dark:text-amber-200 text-[11px] leading-tight flex items-start gap-2">
                            <AlertTriangle className="w-4 h-4 shrink-0 text-amber-600 dark:text-amber-400 mt-0.5" />
                            <div>
                              <p className="font-bold">Matches Existing Subscription '{cand.duplicateMerchant}'</p>
                              <p className="text-slate-600 dark:text-slate-400 mt-0.5">Duplicate candidate detected! Review without overwriting confirmed data.</p>
                            </div>
                          </div>
                        )}

                        {!cand.isDuplicate && cand.isRecurring && (
                          <div className="mt-3 pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                            <span className={`text-[11px] font-semibold flex items-center gap-1.5 ${
                              cand.confidence >= 80 && cand.merchantName
                                ? 'text-emerald-700 dark:text-emerald-300'
                                : cand.confidence >= 65 && cand.merchantName
                                ? 'text-purple-700 dark:text-purple-300'
                                : 'text-amber-700 dark:text-amber-300'
                            }`}>
                              <span className={`w-1.5 h-1.5 rounded-full ${
                                cand.confidence >= 80 && cand.merchantName
                                  ? 'bg-emerald-600 dark:bg-emerald-400'
                                  : cand.confidence >= 65 && cand.merchantName
                                  ? 'bg-purple-600 dark:bg-purple-400'
                                  : 'bg-amber-600 dark:bg-amber-400'
                              }`} />
                              <span>
                                {cand.confidence >= 80 && cand.merchantName
                                  ? 'Verified Subscription'
                                  : cand.confidence >= 65 && cand.merchantName
                                  ? 'Possible Subscription (Needs Review)'
                                  : 'Review Required (Confirm Merchant)'}
                              </span>
                            </span>
                          </div>
                        )}

                        {!cand.isRecurring && (
                          <div className="mt-3 pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end">
                            <span className="px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 text-[10px] font-semibold">
                              One-off Excluded
                            </span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Why are items flagged as uncertain? */}
                <div className="p-4 rounded-2xl bg-[#F8FAFC] dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs">
                  <div className="flex items-center gap-2 text-teal-800 dark:text-teal-400 font-bold mb-1">
                    <Info className="w-4 h-4 text-teal-600" />
                    <span>Why are items flagged as uncertain?</span>
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                    Aggregators frequently use reseller names like FastSpring, Paddle, or Cleeng. RecurSight prevents ghost charges by validating merchant identity prior to recurring ledger registration.
                  </p>
                </div>
              </>
            )}
          </div>

          {/* RIGHT COLUMN: Review & Confirm Extracted Details (Screenshots 3 & 4) */}
          <div className="lg:col-span-7 bg-white dark:bg-slate-900 rounded-3xl p-6 lg:p-7 border border-slate-200 dark:border-slate-800 shadow-xs space-y-5">
            <div>
              <h2 className="text-base font-black text-slate-900 dark:text-white">
                Review & Confirm Extracted Details
              </h2>
            </div>

            {/* Advisory Callout */}
            <div className="p-3.5 rounded-2xl bg-purple-50/70 dark:bg-purple-950/30 border border-purple-100 dark:border-purple-900/50 flex items-start gap-2.5">
              <ShieldAlert className="w-4 h-4 text-purple-700 dark:text-purple-300 shrink-0 mt-0.5" />
              <p className="text-xs text-purple-900 dark:text-purple-300 leading-relaxed">
                {activeCandidate
                  ? 'Extracted values are suggestions. Review and confirm before saving. Unknown information is preserved rather than guessed.'
                  : 'Upload an invoice or statement on the left to extract recurring subscriptions automatically, or review and confirm details below.'}
              </p>
            </div>

            <div className="space-y-4 text-xs">
              
              {/* Service / Merchant Name */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="font-bold text-slate-800 dark:text-slate-200">
                    Service / Merchant Name *
                  </label>
                  {activeCandidate ? (
                    <span className={`text-[11px] font-semibold flex items-center gap-1 ${
                      activeCandidate.confidence >= 80 && activeCandidate.merchantName
                        ? 'text-emerald-700 dark:text-emerald-300'
                        : activeCandidate.confidence >= 65 && activeCandidate.merchantName
                        ? 'text-purple-700 dark:text-purple-300'
                        : 'text-amber-700 dark:text-amber-300'
                    }`}>
                      {activeCandidate.confidence >= 80 && activeCandidate.merchantName ? (
                        <ShieldCheck className="w-3.5 h-3.5" />
                      ) : activeCandidate.confidence >= 65 && activeCandidate.merchantName ? (
                        <ShieldAlert className="w-3.5 h-3.5" />
                      ) : (
                        <AlertTriangle className="w-3.5 h-3.5" />
                      )}
                      <span>
                        Confidence: {
                          activeCandidate.confidence >= 80 && activeCandidate.merchantName
                            ? 'High'
                            : activeCandidate.confidence >= 65 && activeCandidate.merchantName
                            ? 'Medium'
                            : 'Needs Review'
                        } ({activeCandidate.confidence}%)
                      </span>
                    </span>
                  ) : (
                    <span className="text-[11px] text-slate-400">
                      Required
                    </span>
                  )}
                </div>
                <div className="relative">
                  <input
                    type="text"
                    required
                    value={formMerchantName}
                    onChange={(e) => setFormMerchantName(e.target.value)}
                    placeholder="e.g. Netflix, Figma, Adobe"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-[#F8FAFC] dark:bg-slate-800 text-xs font-semibold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#2446D8]/20 focus:border-[#2446D8]"
                  />
                  <button type="button" aria-label="Edit merchant name" className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400">
                    ✎
                  </button>
                </div>
                <span className="text-[11px] italic text-slate-400 block mt-1">
                  {activeCandidate?.rawString
                    ? `Identified via transaction string '${activeCandidate.rawString}'`
                    : 'Enter the provider or service name'}
                </span>
              </div>

              {/* Category & Observed Charge Row */}
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-start">
                <div className="sm:col-span-6">
                  <label className="block font-bold text-slate-800 dark:text-slate-200 mb-1.5 text-xs h-4 flex items-center">
                    Category
                  </label>
                  <select
                    value={formCategory}
                    onChange={(e) => setFormCategory(e.target.value as SubscriptionCategory)}
                    className="h-11 w-full px-3.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-semibold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#2446D8]"
                  >
                    <option value="Software & Tools">Software & Tools</option>
                    <option value="Software & Dev">Software & Dev</option>
                    <option value="Streaming & Ent">Streaming & Ent</option>
                    <option value="Productivity">Productivity</option>
                    <option value="Utilities & Cloud">Utilities & Cloud</option>
                    <option value="Fitness & Health">Fitness & Health</option>
                    <option value="Other Misc">Other Misc</option>
                  </select>
                </div>

                <div className="sm:col-span-6">
                  <div className="flex items-center justify-between mb-1.5 h-4">
                    <label className="font-bold text-slate-800 dark:text-slate-200 text-xs">
                      Observed Charge *
                    </label>
                    {activeCandidate ? (
                      activeCandidate.amount !== null && activeCandidate.amount !== undefined ? (
                        <span className="text-[11px] font-bold text-emerald-700 dark:text-emerald-300 flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                          <span>Matched in document</span>
                        </span>
                      ) : (
                        <span className="text-[11px] font-bold text-amber-700 dark:text-amber-400 flex items-center gap-1">
                          <AlertTriangle className="w-3 h-3 text-amber-600 dark:text-amber-400" />
                          <span>Amount not detected</span>
                        </span>
                      )
                    ) : (
                      <span className="text-[11px] text-slate-400">
                        Recurring charge
                      </span>
                    )}
                  </div>
                  <div className="h-11 relative flex items-center rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 overflow-hidden focus-within:ring-2 focus-within:ring-[#2446D8]">
                    <span className="h-full px-3.5 flex items-center justify-center font-bold text-slate-500 dark:text-slate-300 text-xs bg-slate-50 dark:bg-slate-700/60 border-r border-slate-200 dark:border-slate-700 shrink-0">
                      {CURRENCY_SYMBOLS[formCurrency] || '$'}
                    </span>
                    <input
                      type="number"
                      step="0.01"
                      required
                      placeholder={activeCandidate && !formAmount ? 'Amount not detected — enter manually' : '0.00'}
                      value={formAmount}
                      onChange={(e) => setFormAmount(e.target.value)}
                      className="h-full flex-1 px-3 text-xs font-bold text-slate-900 dark:text-white bg-transparent focus:outline-none min-w-0"
                    />
                    <select
                      value={formCurrency}
                      onChange={(e) => handleFormCurrencyChange(e.target.value as Currency)}
                      className="h-full px-2.5 text-[11px] font-bold text-slate-700 dark:text-slate-200 bg-slate-50 dark:bg-slate-700 border-l border-slate-200 dark:border-slate-600 focus:outline-none shrink-0"
                    >
                      <option value="USD">USD</option>
                      <option value="INR">INR</option>
                      <option value="EUR">EUR</option>
                      <option value="GBP">GBP</option>
                    </select>
                  </div>
                  {activeCandidate?.amountEvidence ? (
                    <span className="text-[10px] text-slate-400 block mt-1 truncate">
                      Evidence: {activeCandidate.amountEvidence}
                    </span>
                  ) : activeCandidate && !formAmount ? (
                    <span className="text-[10px] text-amber-600 dark:text-amber-400 font-semibold block mt-1">
                      No monetary amount confirmed in document. Please enter before saving.
                    </span>
                  ) : null}
                </div>
              </div>

              {/* Billing Cadence / Frequency */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="font-bold text-slate-800 dark:text-slate-200">
                    Billing Cadence / Frequency
                  </label>
                  {activeCandidate ? (
                    activeCandidate.cadence === 'yearly' || activeCandidate.cadence === 'monthly' ? (
                      <span className="px-2 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 text-[10px] font-semibold border border-emerald-200 dark:border-emerald-800">
                        Detected in document
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-md bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 text-[10px] font-semibold border border-amber-200 dark:border-amber-800">
                        Not specified in document
                      </span>
                    )
                  ) : null}
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  {[
                    { id: 'monthly', title: 'Monthly', desc: '(Standard)' },
                    { id: 'yearly', title: 'Yearly', desc: 'Billed annually' },
                    { id: 'unknown', title: 'Unknown', desc: 'Requires history' },
                  ].map((cad) => {
                    const isSelected = formCadence === cad.id;
                    return (
                      <button
                        key={cad.id}
                        type="button"
                        onClick={() => setFormCadence(cad.id as any)}
                        className={`p-3 rounded-xl border text-left transition-all ${
                          isSelected
                            ? 'bg-blue-50 dark:bg-slate-800 border-2 border-[#2446D8] dark:border-blue-400 shadow-xs'
                            : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          <div
                            className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center shrink-0 ${
                              isSelected
                                ? 'border-[#2446D8] dark:border-blue-400 bg-white dark:bg-slate-900'
                                : 'border-slate-400 dark:border-slate-500 bg-white dark:bg-slate-800'
                            }`}
                          >
                            {isSelected && (
                              <div className="w-2 h-2 rounded-full bg-[#2446D8] dark:bg-blue-400" />
                            )}
                          </div>
                          <div className="min-w-0">
                            <span className={`block font-bold text-xs truncate ${isSelected ? 'text-[#2446D8] dark:text-blue-300' : 'text-slate-900 dark:text-slate-100'}`}>
                              {cad.title}
                            </span>
                            <span className="block text-[10px] text-slate-500 dark:text-slate-400 truncate">
                              {cad.desc}
                            </span>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>

                <label className="flex items-center gap-2 mt-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formCadencePrompt}
                    onChange={(e) => setFormCadencePrompt(e.target.checked)}
                    className="w-4 h-4 rounded text-[#2446D8]"
                  />
                  <span className="text-[11px] text-slate-500 dark:text-slate-400">
                    Prompt for 2–3 months statement history to mathematically verify cadence.
                  </span>
                </label>
              </div>

              {/* Projected Next Renewal */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="font-bold text-slate-800 dark:text-slate-200">
                    Projected Next Renewal
                  </label>
                  <span className="text-[11px] font-semibold text-purple-700 dark:text-purple-300 flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5" />
                    <span>
                      {formRenewalDate
                        ? `Estimated: ${new Date(formRenewalDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`
                        : 'Select renewal date'}
                    </span>
                  </span>
                </div>
                <input
                  type="date"
                  value={formRenewalDate}
                  onChange={(e) => setFormRenewalDate(e.target.value)}
                  style={{ colorScheme: theme === 'dark' ? 'dark' : 'light' }}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-semibold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#2446D8]"
                />

                {/* Mark as Unconfirmed Estimate Box */}
                <div className="p-3.5 rounded-2xl bg-blue-50/80 dark:bg-slate-800/90 border border-blue-100 dark:border-slate-700 mt-2.5">
                  <label className="flex items-start gap-2.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formUnconfirmedEstimate}
                      onChange={(e) => setFormUnconfirmedEstimate(e.target.checked)}
                      className="w-4 h-4 rounded text-[#2446D8] mt-0.5"
                    />
                    <div>
                      <span className="font-bold text-slate-900 dark:text-white text-xs block">
                        Mark as Unconfirmed Estimate
                      </span>
                      <span className="text-slate-500 dark:text-slate-400 text-[11px] block mt-0.5">
                        Automatic push reminders & calendar alerts stay muted until confirmed.
                      </span>
                    </div>
                  </label>
                </div>
              </div>

              {/* Payment Source Account */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block font-bold text-slate-800 dark:text-slate-200">
                    Payment Source Account
                  </label>
                  {formPaymentSourceId ? (
                    <span className="px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 text-[10px] font-bold border border-emerald-200 dark:border-emerald-800">
                      Matched in Document
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 text-[10px] font-bold border border-slate-200 dark:border-slate-700">
                      Not available in invoice
                    </span>
                  )}
                </div>
                <div className="relative">
                  <CreditCard className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-blue-600 dark:text-blue-400" />
                  <input
                    type="text"
                    value={formPaymentSourceId}
                    onChange={(e) => setFormPaymentSourceId(e.target.value)}
                    placeholder="Not available in invoice — you may optionally link one"
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-semibold text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-[#2446D8]"
                  />
                </div>
              </div>

              {/* Invoice Evidence & Metadata Breakdown (Step 7 & 8) */}
              {activeCandidate?.extractionResult && (
                <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-2 text-[11px]">
                  <div className="font-bold text-slate-800 dark:text-slate-200 flex items-center justify-between">
                    <span>Document Evidence & Traceability</span>
                    <span className="text-emerald-600 dark:text-emerald-400 font-bold">
                      {activeCandidate.extractionResult.merchantName.value} (Page {activeCandidate.extractionResult.merchantName.page})
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-slate-600 dark:text-slate-300">
                    <div>
                      <span className="text-slate-400 dark:text-slate-500 block">Invoice Number:</span>
                      <span className="font-semibold text-slate-800 dark:text-slate-200">
                        {activeCandidate.extractionResult.invoiceNumber.value || 'Not specified'}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 dark:text-slate-500 block">Subtotal:</span>
                      <span className="font-semibold text-slate-800 dark:text-slate-200">
                        {activeCandidate.extractionResult.subtotal.value
                          ? `${formCurrency} ${activeCandidate.extractionResult.subtotal.value}`
                          : 'Not separated'}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 dark:text-slate-500 block">Payment Rails:</span>
                      <span className="font-semibold text-slate-800 dark:text-slate-200">
                        {activeCandidate.extractionResult.paymentMethod.value || 'Not available in invoice'}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 dark:text-slate-500 block">Verified Grand Total:</span>
                      <span className="font-bold text-emerald-600 dark:text-emerald-400">
                        {formCurrency} {activeCandidate.extractionResult.totalAmount.value || formAmount}
                      </span>
                    </div>
                  </div>

                  {activeCandidate.extractionResult.warnings.length > 0 && (
                    <div className="mt-2 pt-2 border-t border-slate-200 dark:border-slate-700 space-y-1">
                      {activeCandidate.extractionResult.warnings.map((warn, wIdx) => (
                        <p key={wIdx} className="text-amber-700 dark:text-amber-400 text-[10px] flex items-center gap-1.5">
                          <span>⚠</span>
                          <span>{warn}</span>
                        </p>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Cancellation Protocol Status */}
              <div className="pt-2">
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-1.5 font-bold text-xs text-slate-800 dark:text-slate-200">
                    <HelpCircle className="w-3.5 h-3.5 text-slate-400" />
                    <span>Cancellation Protocol Status</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => navigate('/cancellation-guidance')}
                    className="text-[11px] font-bold text-[#2446D8] dark:text-blue-400 hover:underline"
                  >
                    Open Manual Checklist
                  </button>
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 pl-5 leading-normal">
                  No standard 1-click cancellation guidance available yet for {formMerchantName.trim() || 'this vendor'}.
                </p>
              </div>

            </div>

            {/* Bottom Actions */}
            <div className="border-t border-slate-100 dark:border-slate-800 pt-4 flex items-center justify-between">
              <button
                type="button"
                onClick={handleDiscardCandidate}
                className="text-xs font-bold text-red-600 hover:underline px-2 py-1"
              >
                {candidates.length > 0 ? 'Discard Item' : 'Clear Form'}
              </button>

              <button
                type="button"
                onClick={handleConfirmExtracted}
                disabled={isSaving || !formMerchantName.trim() || !formAmount.trim()}
                className="py-2.5 px-6 rounded-xl bg-[#2446D8] hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-bold shadow-md shadow-blue-600/20 flex items-center gap-2 transition-all cursor-pointer"
              >
                {isSaving ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <Check className="w-4 h-4" />
                    <span>Confirm & Save Subscription</span>
                  </>
                )}
              </button>
            </div>
          </div>

        </div>
      ) : (
        
        /* ======================================================= */
        /* MANUAL ENTRY WORKFLOW (Exact Match to Screenshot 2)     */
        /* ======================================================= */
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* ===================================================== */}
          {/* LEFT COLUMN: Essentials & Cadence (6 Cols)            */}
          {/* ===================================================== */}
          <div className="lg:col-span-6 space-y-6">
            
            {/* CARD 1: Subscription Essentials (Step 1 of 2) */}
            <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 shadow-xs space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-2.5">
                  <span className="w-6 h-6 rounded-lg bg-blue-50 dark:bg-blue-950/60 text-[#2446D8] dark:text-blue-400 font-bold text-xs flex items-center justify-center">
                    1
                  </span>
                  <h2 className="font-bold text-sm text-slate-900 dark:text-white">
                    Subscription Essentials
                  </h2>
                </div>
                <span className="text-xs text-slate-400 font-medium">Step 1 of 2</span>
              </div>

              {/* Merchant Name with Real Autocomplete Dropdown */}
              <div ref={autocompleteContainerRef} className="relative">
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-bold text-slate-800 dark:text-slate-200">
                    Merchant or Service Name *
                  </label>
                  <span className="text-[11px] text-[#2446D8] dark:text-blue-400 font-semibold flex items-center gap-1">
                    <Sparkles className="w-3 h-3 text-[#2446D8] dark:text-blue-400" />
                    <span>Search or choose from 40+ apps</span>
                  </span>
                </div>
                <div className="relative">
                  <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    required
                    value={manualMerchantName}
                    onFocus={() => setIsAutocompleteOpen(true)}
                    onChange={(e) => {
                      setManualMerchantName(e.target.value);
                      setIsAutocompleteOpen(true);
                    }}
                    placeholder="Search e.g. Disney+ Hotstar, Netflix, Prime, Canva, AWS..."
                    className="w-full pl-10 pr-24 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-semibold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#2446D8]"
                  />
                  <div className="absolute right-2.5 top-1/2 -translate-y-1/2 flex items-center gap-1.5">
                    {manualMerchantName.trim() && (
                      <button
                        type="button"
                        onClick={() => {
                          setManualMerchantName('');
                          setIsAutocompleteOpen(true);
                        }}
                        className="p-1 rounded-md text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700"
                        title="Clear"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                    {manualMerchantName.trim() && (
                      <span className="px-2 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 text-[10px] font-bold border border-emerald-200 dark:border-emerald-800 flex items-center gap-1">
                        <Check className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                        <span>Ready</span>
                      </span>
                    )}
                  </div>
                </div>

                {/* Autocomplete Suggestions Menu */}
                {isAutocompleteOpen && (
                  <div className="absolute left-0 right-0 top-full mt-1.5 bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 py-2 z-50 max-h-72 overflow-y-auto animate-in fade-in duration-150">
                    {/* Add as custom app button if query doesn't exactly match catalog */}
                    {manualMerchantName.trim() && !findCatalogItem(manualMerchantName) && (
                      <div
                        onClick={() => handleCustomAdd(manualMerchantName)}
                        className="px-3.5 py-2 mx-1.5 rounded-xl bg-blue-50/80 dark:bg-blue-950/50 hover:bg-blue-100 dark:hover:bg-blue-900/60 cursor-pointer flex items-center justify-between text-xs font-bold text-[#2446D8] dark:text-blue-400 mb-1.5 transition-colors"
                      >
                        <div className="flex items-center gap-2">
                          <Plus className="w-4 h-4 shrink-0" />
                          <span>Use &ldquo;{manualMerchantName.trim()}&rdquo; as custom subscription</span>
                        </div>
                        <span className="text-[10px] font-semibold text-blue-600 dark:text-blue-300 bg-blue-100 dark:bg-blue-900/80 px-2 py-0.5 rounded-md">
                          Custom
                        </span>
                      </div>
                    )}

                    <div className="px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      {manualMerchantName.trim() ? 'Matching Services' : 'Popular Subscriptions (Click to Auto-fill)'}
                    </div>

                    {searchCatalog(manualMerchantName).map((app) => {
                      const defPrice = app.defaultAmounts[manualCurrency] || app.defaultAmounts.USD;
                      return (
                        <div
                          key={app.id}
                          onClick={() => handleSelectApp(app)}
                          className="px-3.5 py-2 hover:bg-slate-50 dark:hover:bg-slate-800/80 cursor-pointer flex items-center justify-between transition-colors group"
                        >
                          <div className="flex items-center gap-3">
                            <MerchantLogo name={app.name} size="sm" />
                            <div>
                              <span className="font-bold text-xs text-slate-900 dark:text-white block group-hover:text-[#2446D8] dark:group-hover:text-blue-400 transition-colors">
                                {app.name}
                              </span>
                              <span className="text-[10px] text-slate-400">
                                {app.category} • {app.defaultCadence === 'annually' ? 'Billed yearly' : 'Billed monthly'}
                              </span>
                            </div>
                          </div>

                          {defPrice && (
                            <span className="text-[11px] font-bold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-md">
                              {CURRENCY_SYMBOLS[manualCurrency] || '$'}{manualCurrency === 'INR' ? Math.round(defPrice) : defPrice.toFixed(2)}
                              <span className="text-[9px] text-slate-400">/{app.defaultCadence === 'annually' ? 'yr' : 'mo'}</span>
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Quick Picks */}
              <div>
                <span className="text-xs text-slate-500 dark:text-slate-400 font-medium block mb-2">
                  Quick Picks (Click to Auto-fill):
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {QUICK_PICKS.map((item) => {
                    const catalogItem = findCatalogItem(item);
                    return (
                      <button
                        key={item}
                        type="button"
                        onClick={() => handleSelectApp(catalogItem || { name: item })}
                        className={`px-3 py-1 rounded-full text-xs font-semibold transition-all flex items-center gap-1.5 ${
                          manualMerchantName.toLowerCase() === item.toLowerCase()
                            ? 'bg-[#2446D8] text-white shadow-xs'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                        }`}
                      >
                        <MerchantLogo name={item} size="xs" />
                        <span>{item}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Expenditure Category Grid (3x2) */}
              <div>
                <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-2">
                  Expenditure Category *
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {CATEGORIES.map((cat) => {
                    const Icon = cat.icon;
                    const isSelected = manualCategory === cat.id;
                    return (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() => setManualCategory(cat.id as SubscriptionCategory)}
                        className={`p-3 rounded-2xl border text-left transition-all ${
                          isSelected
                            ? 'bg-[#EEF2FF] dark:bg-blue-950/50 border-[#2446D8] dark:border-blue-500 text-[#2446D8] dark:text-blue-400'
                            : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 text-slate-700 dark:text-slate-300'
                        }`}
                      >
                        <Icon className={`w-4 h-4 mb-1.5 ${isSelected ? 'text-[#2446D8] dark:text-blue-400' : 'text-slate-500 dark:text-slate-400'}`} />
                        <span className="text-[11px] font-bold block">{cat.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

            </div>

            {/* CARD 2: Cadence & Pricing */}
            <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 shadow-xs space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                <h2 className="font-bold text-sm text-slate-900 dark:text-white">
                  Cadence & Pricing
                </h2>
                <span className="text-xs font-bold text-[#6B46C1] dark:text-purple-400 hover:underline cursor-pointer flex items-center gap-1">
                  <HelpCircle className="w-3.5 h-3.5" />
                  <span>Auto-calculating FX</span>
                </span>
              </div>

              {/* Currency & Recurring Amount */}
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-start">
                <div className="sm:col-span-4">
                  <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1.5 h-4 flex items-center">
                    Currency
                  </label>
                  <select
                    value={manualCurrency}
                    onChange={(e) => handleManualCurrencyChange(e.target.value as Currency)}
                    className="h-11 w-full px-3.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#2446D8]"
                  >
                    <option value="USD">USD ($)</option>
                    <option value="INR">INR (₹)</option>
                    <option value="EUR">EUR (€)</option>
                    <option value="GBP">GBP (£)</option>
                  </select>
                </div>

                <div className="sm:col-span-8">
                  <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1.5 h-4 flex items-center">
                    Recurring Amount *
                  </label>
                  <div className="h-11 relative flex items-center rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 overflow-hidden focus-within:ring-2 focus-within:ring-[#2446D8]">
                    <span className="h-full px-3.5 flex items-center justify-center font-bold text-slate-500 dark:text-slate-300 text-xs bg-slate-50 dark:bg-slate-700/60 border-r border-slate-200 dark:border-slate-700 shrink-0">
                      {CURRENCY_SYMBOLS[manualCurrency] || '$'}
                    </span>
                    <input
                      type="number"
                      step="0.01"
                      required
                      placeholder="0.00"
                      value={manualAmount}
                      onChange={(e) => setManualAmount(e.target.value)}
                      className="h-full flex-1 px-3.5 text-xs font-bold text-slate-900 dark:text-white bg-transparent focus:outline-none min-w-0"
                    />
                    <span className="h-full px-3 flex items-center justify-center text-[11px] font-semibold text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-700/60 border-l border-slate-200 dark:border-slate-700 whitespace-nowrap shrink-0">
                      {manualCurrency} / interval
                    </span>
                  </div>
                </div>
              </div>

              {/* Billing Cadence 4 boxes */}
              <div>
                <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-2">
                  Billing Cadence
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {[
                    { id: 'monthly', title: 'Monthly', badge: '✓', sub: 'Every 30 days' },
                    { id: 'annually', title: 'Annually', badge: '-18%', sub: 'Billed yearly' },
                    { id: 'quarterly', title: 'Quarterly', badge: '', sub: 'Every 3 mos' },
                    { id: 'custom', title: 'Custom', badge: '', sub: 'Weekly / days' },
                  ].map((cad) => (
                    <button
                      key={cad.id}
                      type="button"
                      onClick={() => setManualCadence(cad.id as any)}
                      className={`p-3 rounded-2xl border text-center transition-all ${
                        manualCadence === cad.id
                          ? 'bg-[#2446D8] border-[#2446D8] text-white shadow-xs'
                          : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-slate-300 dark:hover:border-slate-600'
                      }`}
                    >
                      <div className="flex items-center justify-center gap-1 font-bold text-xs">
                        <span>{cad.title}</span>
                        {cad.badge && (
                          <span className={`text-[10px] ${manualCadence === cad.id ? 'text-white' : 'text-emerald-600 dark:text-emerald-400 font-bold'}`}>
                            {cad.badge}
                          </span>
                        )}
                      </div>
                      <span className={`text-[10px] block mt-0.5 ${manualCadence === cad.id ? 'text-blue-100' : 'text-slate-400 dark:text-slate-400'}`}>
                        {cad.sub}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Next Billing Date & Quick Presets */}
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 pt-1 items-start">
                <div className="sm:col-span-6">
                  <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1.5 h-4 flex items-center">
                    Next Billing Date
                  </label>
                  <div className="relative">
                    <input
                      type="date"
                      required
                      value={manualNextDate}
                      onChange={(e) => setManualNextDate(e.target.value)}
                      style={{ colorScheme: theme === 'dark' ? 'dark' : 'light' }}
                      className="h-11 w-full px-3.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-semibold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#2446D8]"
                    />
                  </div>
                </div>

                <div className="sm:col-span-6">
                  <span className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1.5 h-4 flex items-center">
                    Quick Timeline Presets
                  </span>
                  <div className="flex items-center gap-2 h-11">
                    <button
                      type="button"
                      onClick={() => {
                        const d = new Date();
                        d.setDate(d.getDate() + 3);
                        setManualNextDate(d.toISOString().split('T')[0]);
                      }}
                      className="h-full px-3 rounded-xl bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800 text-[11px] font-bold flex items-center gap-1.5 hover:bg-amber-100 dark:hover:bg-amber-900/60 transition-colors whitespace-nowrap"
                    >
                      <Clock className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
                      <span>Renews in 3 days</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        const d = new Date();
                        d.setDate(d.getDate() + 30);
                        setManualNextDate(d.toISOString().split('T')[0]);
                      }}
                      className="h-full px-3 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 text-[11px] font-bold flex items-center gap-1 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors whitespace-nowrap"
                    >
                      <span>+1 Month</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Free Trial Toggle Card */}
              <div className="p-4 rounded-2xl bg-blue-50/70 dark:bg-slate-800/80 border border-blue-100 dark:border-slate-700 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-start gap-2.5">
                    <Hourglass className="w-4 h-4 text-blue-600 dark:text-blue-400 mt-0.5" />
                    <div>
                      <h4 className="font-bold text-xs text-slate-900 dark:text-white">
                        Is this a free trial period?
                      </h4>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                        Keep track of automatic debit dates to prevent unintended conversions.
                      </p>
                    </div>
                  </div>

                  <label className="relative inline-flex items-center cursor-pointer shrink-0">
                    <input
                      type="checkbox"
                      checked={isTrial}
                      onChange={(e) => setIsTrial(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-10 h-5 bg-slate-300 dark:bg-slate-600 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#2446D8]" />
                  </label>
                </div>

                {isTrial && (
                  <div className="grid grid-cols-2 gap-3 pt-2 border-t border-blue-100 dark:border-slate-700">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                        Trial End Date
                      </label>
                      <input
                        type="date"
                        value={trialEndDate}
                        onChange={(e) => setTrialEndDate(e.target.value)}
                        style={{ colorScheme: theme === 'dark' ? 'dark' : 'light' }}
                        className="w-full px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-semibold text-slate-900 dark:text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                        Protection Notice
                      </label>
                      <div className="px-2.5 py-1.5 rounded-lg bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800 text-[11px] font-bold flex items-center gap-1.5">
                        <Bell className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                        <span>Reminder 48h before auto-convert</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>

            </div>

          </div>

          {/* ===================================================== */}
          {/* RIGHT COLUMN: Payment & Governance + Live Preview (6) */}
          {/* ===================================================== */}
          <div className="lg:col-span-6 space-y-6">
            
            {/* CARD 1: Payment & Governance */}
            <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 shadow-xs space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-2.5">
                  <span className="w-6 h-6 rounded-lg bg-blue-50 dark:bg-blue-950/60 text-[#2446D8] dark:text-blue-400 font-bold text-xs flex items-center justify-center">
                    2
                  </span>
                  <h2 className="font-bold text-sm text-slate-900 dark:text-white">
                    Payment & Governance
                  </h2>
                </div>
                <span className="px-2.5 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 text-[10px] font-bold border border-emerald-200 dark:border-emerald-800">
                  PCI Compliant
                </span>
              </div>

              {/* Payment Instrument Options */}
              <div>
                <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-2">
                  Payment Instrument
                </label>
                <div className="space-y-2">
                  {[
                    {
                      id: 'upi_mandate',
                      name: 'UPI AutoPay (Google Pay / PhonePe)',
                      num: manualCurrency === 'INR' ? 'upi@okaxis • Instant Auto-Debit' : 'Google Pay / PhonePe • AutoPay',
                      icon: Smartphone,
                    },
                    ...customRails,
                  ].map((inst) => {
                    const Icon = inst.icon;
                    const isSelected = manualPaymentInstrument === inst.id;
                    return (
                      <div
                        key={inst.id}
                        onClick={() => setManualPaymentInstrument(inst.id as any)}
                        className={`p-3 rounded-2xl border transition-all cursor-pointer flex items-center justify-between ${
                          isSelected
                            ? 'bg-[#EEF2FF] dark:bg-blue-950/50 border-[#2446D8] dark:border-blue-500'
                            : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div className={`p-2 rounded-xl ${isSelected ? 'bg-blue-100 dark:bg-blue-900/60 text-[#2446D8] dark:text-blue-300' : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300'}`}>
                            <Icon className="w-4 h-4" />
                          </div>
                          <div>
                            <span className="font-bold text-xs text-slate-900 dark:text-white block">
                              {inst.name}
                            </span>
                            <span className="text-[11px] text-slate-400 dark:text-slate-400 block">
                              {inst.num}
                            </span>
                          </div>
                        </div>

                        <div
                          className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                            isSelected
                              ? 'border-[#2446D8] dark:border-blue-500 bg-white dark:bg-slate-900'
                              : 'border-slate-300 dark:border-slate-600'
                          }`}
                        >
                          {isSelected && (
                            <div className="w-2.5 h-2.5 rounded-full bg-[#2446D8] dark:bg-blue-500" />
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {railSuccessMsg && (
                  <div className="mt-2.5 p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 text-xs font-semibold flex items-center gap-2 animate-in fade-in">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                    <span>{railSuccessMsg}</span>
                  </div>
                )}

                <button
                  type="button"
                  onClick={() => setIsAddRailModalOpen(true)}
                  className="w-full mt-2.5 py-2.5 rounded-xl border border-blue-200 dark:border-blue-900/60 text-[#2446D8] dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/40 text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Link New Payment</span>
                </button>
              </div>

              {/* Mandate Ref */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-bold text-slate-800 dark:text-slate-200">
                    Mandate / SI Reference (Optional)
                  </label>
                  <span className="text-[11px] text-slate-400 font-medium">Watchdog Token</span>
                </div>
                <input
                  type="text"
                  value={manualMandateRef}
                  onChange={(e) => setManualMandateRef(e.target.value)}
                  placeholder="e.g. UMN-99201-FGMA (Optional)"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-[#F8FAFC] dark:bg-slate-800 text-xs font-semibold text-slate-900 dark:text-white focus:outline-none"
                />
              </div>

              {/* Renewal Watchdog Triggers */}
              <div>
                <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1.5">
                  Renewal Watchdog Triggers
                </label>
                <div className="space-y-1.5">
                  <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-700 dark:text-slate-300">
                    <input
                      type="checkbox"
                      checked={manualAlert7Days}
                      onChange={(e) => setManualAlert7Days(e.target.checked)}
                      className="w-4 h-4 rounded text-[#2446D8]"
                    />
                    <span>Alert 7 days before renewal</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-700 dark:text-slate-300">
                    <input
                      type="checkbox"
                      checked={manualAlert2Days}
                      onChange={(e) => setManualAlert2Days(e.target.checked)}
                      className="w-4 h-4 rounded text-[#2446D8]"
                    />
                    <span>Alert 2 days before renewal</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-700 dark:text-slate-300">
                    <input
                      type="checkbox"
                      checked={manualAlertConfirmation}
                      onChange={(e) => setManualAlertConfirmation(e.target.checked)}
                      className="w-4 h-4 rounded text-[#2446D8]"
                    />
                    <span>Alert on renewal charge confirmation</span>
                  </label>
                </div>
              </div>

              {/* Target Channels */}
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-2">
                  TARGET CHANNELS
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setManualTargetEmail(!manualTargetEmail)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold border flex items-center gap-1.5 ${
                      manualTargetEmail
                        ? 'border-[#2446D8] text-[#2446D8] dark:border-blue-500 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/50'
                        : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-800'
                    }`}
                  >
                    <Mail className="w-3.5 h-3.5" />
                    <span>{user?.email || 'your-email@company.com'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setManualTargetInApp(!manualTargetInApp)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold border flex items-center gap-1.5 ${
                      manualTargetInApp
                        ? 'border-[#2446D8] text-[#2446D8] dark:border-blue-500 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/50'
                        : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-800'
                    }`}
                  >
                    <Bell className="w-3.5 h-3.5" />
                    <span>In-App</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setManualTargetSMS(!manualTargetSMS)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold border flex items-center gap-1.5 ${
                      manualTargetSMS
                        ? 'border-[#2446D8] text-[#2446D8] dark:border-blue-500 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/50'
                        : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-800'
                    }`}
                  >
                    <MessageSquare className="w-3.5 h-3.5" />
                    <span>SMS</span>
                  </button>
                </div>
              </div>

              {/* Contract & Cancellation Terms */}
              <div className="p-3.5 rounded-2xl bg-[#F8FAFC] dark:bg-slate-800/80 border border-slate-100 dark:border-slate-700 text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                <span className="font-bold text-slate-800 dark:text-white block mb-0.5">Contract & Cancellation Terms</span>
                {manualMerchantName.trim()
                  ? `Auto-renews periodically. RecurSight will track cancellation deadlines for ${manualMerchantName.trim()}.`
                  : 'Auto-renews periodically. RecurSight will track cancellation deadlines and alerts before billing.'}
              </div>

            </div>

            {/* CARD 2: LEDGER FEED PREVIEW (Dark navy container matching Screenshot 2) */}
            <div className="rounded-3xl bg-[#151B2D] text-white p-5 shadow-lg space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-white/10">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-cyan-400" />
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-300">
                    LEDGER FEED PREVIEW
                  </span>
                </div>
                <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                  manualMerchantName.trim() && manualAmount.trim()
                    ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                    : 'bg-slate-700/50 text-slate-400 border-slate-600'
                }`}>
                  {manualMerchantName.trim() && manualAmount.trim() ? '✓ Ready to Confirm' : 'Draft Preview'}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <MerchantLogo name={manualMerchantName || 'Subscription'} size="md" />
                  <div>
                    <h3 className="font-black text-sm text-white">
                      {manualMerchantName.trim() || 'New Subscription'}
                    </h3>
                    <span className="text-[11px] text-slate-400 block mt-0.5">
                      {manualCategory} • {manualCadence.charAt(0).toUpperCase() + manualCadence.slice(1)}
                    </span>
                  </div>
                </div>

                <div className="text-right">
                  <span className="text-xl font-black text-white block">
                    {CURRENCY_SYMBOLS[manualCurrency] || '$'}{manualAmount ? parseFloat(manualAmount || '0').toFixed(2) : '0.00'}
                  </span>
                  <span className="text-[10px] text-slate-400 uppercase">
                    / {manualCadence === 'annually' ? 'year' : 'month'}
                  </span>
                </div>
              </div>

              <div className="pt-3 border-t border-white/10 flex items-center justify-between text-xs text-slate-400">
                <div className="flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-slate-400" />
                  <span>Next charge: {manualNextDate || 'Not set'}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <CreditCard className="w-3.5 h-3.5 text-slate-400" />
                  <span>
                    {manualPaymentInstrument === 'upi_mandate'
                      ? 'UPI AutoPay Mandate'
                      : manualPaymentInstrument === 'hdfc_corp'
                      ? (manualCurrency === 'INR' ? 'Salary Account •••• 4092' : 'Corporate Card •••• 4092')
                      : manualPaymentInstrument === 'icici_master'
                      ? 'Credit Card •••• 9811'
                      : (customRails.find((r) => r.id === manualPaymentInstrument)?.name || 'Default Rail')}
                  </span>
                </div>
              </div>
            </div>

            {/* Footer Buttons */}
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => navigate('/subscriptions')}
                className="py-2.5 px-5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleSaveManual}
                disabled={isSaving || !manualMerchantName.trim() || !manualAmount.trim()}
                className="py-2.5 px-6 rounded-xl bg-[#2446D8] hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-bold shadow-md shadow-blue-600/20 flex items-center gap-2 cursor-pointer"
              >
                {isSaving ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <Plus className="w-4 h-4" />
                    <span>Save Subscription</span>
                  </>
                )}
              </button>
            </div>

          </div>

        </div>
      )}

      {/* Modal: Link New Payment Rail */}
      {isAddRailModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 max-w-md w-full shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-[#2446D8] flex items-center justify-center">
                  <CreditCard className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                    Link New Payment Rail
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    Connect UPI, Card, or NetBanking standing instructions
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsAddRailModalOpen(false)}
                aria-label="Close"
                className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleLinkNewRail} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  Payment Instrument Type
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {[
                    { id: 'upi', label: 'UPI AutoPay', icon: Smartphone },
                    { id: 'card', label: 'Debit/Credit', icon: CreditCard },
                    { id: 'bank', label: 'Bank Account', icon: Building2 },
                  ].map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => setNewRailType(t.id as any)}
                      className={`p-2.5 rounded-xl border text-center text-xs font-bold flex flex-col items-center gap-1.5 transition-all ${
                        newRailType === t.id
                          ? 'border-[#2446D8] dark:border-blue-500 bg-blue-50/60 dark:bg-blue-950/60 text-[#2446D8] dark:text-blue-300'
                          : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
                      }`}
                    >
                      <t.icon className="w-4 h-4" />
                      <span>{t.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Instrument / App Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder={
                    newRailType === 'upi'
                      ? 'e.g. Google Pay (Axis Bank UPI)'
                      : newRailType === 'card'
                      ? 'e.g. SBI SimplyCLICK Visa'
                      : 'e.g. HDFC Salary NetBanking'
                  }
                  value={newRailName}
                  onChange={(e) => setNewRailName(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-semibold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#2446D8]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  {newRailType === 'upi'
                    ? 'UPI ID / VPA'
                    : newRailType === 'card'
                    ? 'Card Number (Last 4 Digits)'
                    : 'Account / Mandate Identifier'}
                </label>
                <input
                  type="text"
                  placeholder={
                    newRailType === 'upi'
                      ? 'e.g. username@okaxis'
                      : newRailType === 'card'
                      ? '•••• 8821 (Exp 12/28)'
                      : 'A/c •••• 5512 • Standing Mandate'
                  }
                  value={newRailDetails}
                  onChange={(e) => setNewRailDetails(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-semibold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#2446D8]"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddRailModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-[#2446D8] hover:bg-blue-700 text-white text-xs font-bold shadow-md shadow-blue-600/20 transition-all cursor-pointer"
                >
                  Save & Link Rail
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
