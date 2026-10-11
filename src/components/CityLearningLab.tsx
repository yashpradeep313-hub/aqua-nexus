import React, { useState, useEffect } from 'react';
import {
  UploadCloud,
  FileText,
  CheckCircle,
  AlertTriangle,
  Play,
  RotateCcw,
  Trash2,
  Edit2,
  TrendingUp,
  Layers,
  Sparkles,
  BarChart3,
  Sliders,
  Check,
  ChevronRight,
  Shield,
  Clock,
  BookOpen,
  Info
} from 'lucide-react';
import {
  CityProfile,
  CityTable,
  CityPolicy,
  FittedModelResult
} from '../types';
import { fitRidgeRegressionModel } from '../engine/ridgeRegression';
import { Badge } from './Badge';
import {
  ResponsiveContainer,
  ComposedChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid
} from 'recharts';

interface CityLearningLabProps {
  cityProfiles: CityProfile[];
  activeProfileId: string;
  onSelectActiveProfile: (id: string) => void;
  onSaveProfile: (profile: CityProfile) => void;
  onDeleteProfile: (id: string) => void;
  onRenameProfile: (id: string, newName: string) => void;
  onLoadPresets: () => void;
  activeFittedModel: FittedModelResult | null;
  onToggleUseFittedModel: (model: FittedModelResult | null) => void;
}

interface PendingUpload {
  id: string;
  file: File;
  filename: string;
  cityName: string;
  status: 'idle' | 'reading' | 'extracting' | 'review' | 'error';
  errorMessage?: string;
  extractedProfile?: CityProfile;
}

export const CityLearningLab: React.FC<CityLearningLabProps> = ({
  cityProfiles,
  activeProfileId,
  onSelectActiveProfile,
  onSaveProfile,
  onDeleteProfile,
  onRenameProfile,
  onLoadPresets,
  activeFittedModel,
  onToggleUseFittedModel
}) => {
  // Upload and review state
  const [pendingUploads, setPendingUploads] = useState<PendingUpload[]>([]);
  const [reviewProfile, setReviewProfile] = useState<CityProfile | null>(null);
  const [reviewPendingId, setReviewPendingId] = useState<string | null>(null);

  // Model fitting state
  const [selectedProfileForFitting, setSelectedProfileForFitting] = useState<CityProfile>(
    cityProfiles.find(p => p.id === activeProfileId) || cityProfiles[0]
  );
  const [selectedTableIdx, setSelectedTableIdx] = useState<number>(0);
  const [targetCol, setTargetCol] = useState<string>('');
  const [selectedFeatureCols, setSelectedFeatureCols] = useState<string[]>([]);
  const [regularizationLambda, setRegularizationLambda] = useState<number>(1.0);
  const [fittingError, setFittingError] = useState<string | null>(null);

  // Keep selectedProfileForFitting synchronized when cityProfiles change or activeProfileId updates
  useEffect(() => {
    const matched = cityProfiles.find(p => p.id === activeProfileId) || cityProfiles.find(p => p.id === selectedProfileForFitting.id) || cityProfiles[0];
    if (matched) {
      setSelectedProfileForFitting(matched);
      setSelectedTableIdx(0);
    }
  }, [activeProfileId, cityProfiles]);

  // Model Fitting handlers
  const activeTable = selectedProfileForFitting.tables[selectedTableIdx] || selectedProfileForFitting.tables[0];
  const numericColumns = activeTable
    ? activeTable.columns.filter((_, colIdx) => {
        // Test if rows contain numeric data (handling missing strings like '-', 'N/A')
        let numCount = 0;
        const sampleRows = activeTable.rows.slice(0, 25);
        sampleRows.forEach(row => {
          const val = row[colIdx];
          if (typeof val === 'number') numCount++;
          else if (typeof val === 'string' && val.trim() !== '' && val !== '-' && val !== 'N/A' && !isNaN(parseFloat(val))) numCount++;
        });
        return numCount >= Math.min(3, sampleRows.length * 0.4);
      })
    : [];

  // Auto-select optimal target and predictor feature columns whenever table or profile changes
  useEffect(() => {
    if (!activeTable || numericColumns.length === 0) {
      setTargetCol('');
      setSelectedFeatureCols([]);
      return;
    }

    // Identify standard water consumption / demand / flow target column candidates
    const preferredTarget = numericColumns.find(col => {
      const lower = col.toLowerCase();
      return (
        lower.includes('consumption') ||
        lower.includes('demand') ||
        lower.includes('flow') ||
        lower.includes('mld') ||
        lower.includes('supply_ml') ||
        lower.includes('quota')
      );
    }) || numericColumns[numericColumns.length - 1];

    setTargetCol(preferredTarget);

    // Default features to all remaining numeric columns
    const remainingFeatures = numericColumns.filter(c => c !== preferredTarget);
    setSelectedFeatureCols(remainingFeatures);
  }, [selectedProfileForFitting.id, selectedTableIdx, activeTable?.name]);

  // Rename modal / inline
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState<string>('');

  // Drag and drop state
  const [isDragging, setIsDragging] = useState<boolean>(false);

  // Handle file selection
  const handleFilesAdded = (files: FileList | File[]) => {
    const validPdfs = Array.from(files).filter(
      f => f.type === 'application/pdf' || f.name.toLowerCase().endsWith('.pdf')
    );

    if (validPdfs.length === 0) {
      alert('Please upload PDF documents (.pdf) only.');
      return;
    }

    const availableSlots = 5 - pendingUploads.length;
    if (availableSlots <= 0) {
      alert('Maximum 5 files can be processed at once.');
      return;
    }

    const newItems: PendingUpload[] = validPdfs.slice(0, availableSlots).map(file => {
      // Clean suggested city name from filename
      const cleanName = file.name
        .replace(/\.pdf$/i, '')
        .replace(/[-_]/g, ' ')
        .replace(/\b\w/g, c => c.toUpperCase());

      return {
        id: `upload-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        file,
        filename: file.name,
        cityName: cleanName,
        status: 'idle'
      };
    });

    setPendingUploads(prev => [...prev, ...newItems]);
  };

  // Process PDF extraction via server API
  const handleExtractPdf = async (item: PendingUpload) => {
    // Update status to reading
    setPendingUploads(prev =>
      prev.map(p => (p.id === item.id ? { ...p, status: 'reading', errorMessage: undefined } : p))
    );

    try {
      if (item.file.size > 10 * 1024 * 1024) {
        throw new Error('File exceeds 10 MB limit.');
      }

      // Read file as Base64
      const base64Data = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = () => reject(new Error('Failed to read file from disk.'));
        reader.readAsDataURL(item.file);
      });

      // Update status to extracting
      setPendingUploads(prev =>
        prev.map(p => (p.id === item.id ? { ...p, status: 'extracting' } : p))
      );

      const res = await fetch('/api/gemini/extract-pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pdfBase64: base64Data,
          filename: item.filename,
          cityName: item.cityName
        })
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.error || `Server responded with status ${res.status}`);
      }

      const resData = await res.json();
      if (!resData.success || !resData.data) {
        throw new Error(resData.error || 'No structured data returned from model.');
      }

      const extracted = resData.data;

      // Construct unconfirmed CityProfile
      const tables: CityTable[] = Array.isArray(extracted.tables)
        ? extracted.tables.map((t: any, i: number) => ({
            name: t.name || `Extracted Table ${i + 1}`,
            columns: Array.isArray(t.columns) ? t.columns : [],
            rows: Array.isArray(t.rows) ? t.rows : [],
            unit: t.unit || 'Units as reported',
            page: typeof t.page === 'number' ? t.page : 1
          }))
        : [];

      const policy: CityPolicy = {
        priority_order: Array.isArray(extracted.policy?.priority_order)
          ? extracted.policy.priority_order
          : [],
        minimum_guarantee: Array.isArray(extracted.policy?.minimum_guarantee)
          ? extracted.policy.minimum_guarantee.map((mg: any) => ({
              sector: String(mg.sector || 'Sector'),
              value: Number(mg.value) || 0,
              unit: String(mg.unit || 'ML/day'),
              page: Number(mg.page) || 1
            }))
          : [],
        per_capita_norm_lpcd:
          typeof extracted.policy?.per_capita_norm_lpcd === 'number'
            ? extracted.policy.per_capita_norm_lpcd
            : null,
        network_loss_percent:
          typeof extracted.policy?.network_loss_percent === 'number'
            ? extracted.policy.network_loss_percent
            : null,
        rationing_rules: Array.isArray(extracted.policy?.rationing_rules)
          ? extracted.policy.rationing_rules
          : [],
        supply_hours: extracted.policy?.supply_hours || null
      };

      // Calculate completeness %
      let score = 0;
      if (tables.length > 0) score += 35;
      if (policy.priority_order.length > 0) score += 20;
      if (policy.minimum_guarantee.length > 0) score += 15;
      if (policy.network_loss_percent !== null) score += 10;
      if (policy.per_capita_norm_lpcd !== null) score += 10;
      if (policy.rationing_rules.length > 0) score += 10;

      const profile: CityProfile = {
        id: `profile-${Date.now()}`,
        cityName: extracted.city || item.cityName || 'Extracted City',
        sourceType: 'pdf',
        sourceFilename: item.filename,
        confirmed: false,
        uploadedAt: new Date().toISOString(),
        tables,
        policy,
        notes: Array.isArray(extracted.notes) ? extracted.notes : [],
        completenessPct: Math.min(100, score)
      };

      setPendingUploads(prev =>
        prev.map(p =>
          p.id === item.id
            ? { ...p, status: 'review', extractedProfile: profile }
            : p
        )
      );

      // Open review screen
      setReviewProfile(profile);
      setReviewPendingId(item.id);
    } catch (err: any) {
      console.error('PDF Extraction error:', err);
      setPendingUploads(prev =>
        prev.map(p =>
          p.id === item.id
            ? { ...p, status: 'error', errorMessage: err.message || 'Extraction failed' }
            : p
        )
      );
    }
  };

  // Confirm and save profile
  const handleConfirmProfile = () => {
    if (!reviewProfile) return;
    const confirmed: CityProfile = {
      ...reviewProfile,
      confirmed: true
    };
    onSaveProfile(confirmed);

    // Remove from pending uploads
    if (reviewPendingId) {
      setPendingUploads(prev => prev.filter(p => p.id !== reviewPendingId));
    }

    setReviewProfile(null);
    setReviewPendingId(null);
  };

  // Cancel review
  const handleCancelReview = () => {
    setReviewProfile(null);
    setReviewPendingId(null);
  };

  const handleFitModel = () => {
    setFittingError(null);
    if (!activeTable) {
      setFittingError('No valid table selected for model training.');
      return;
    }
    if (!targetCol) {
      setFittingError('Please select a target column to predict.');
      return;
    }
    if (selectedFeatureCols.length === 0) {
      setFittingError('Please select at least one predictor feature column.');
      return;
    }

    try {
      const fitted = fitRidgeRegressionModel(
        selectedProfileForFitting.cityName,
        activeTable.name,
        activeTable.columns,
        activeTable.rows,
        targetCol,
        selectedFeatureCols,
        regularizationLambda
      );

      // Update profile with fitted model
      const updatedProfile: CityProfile = {
        ...selectedProfileForFitting,
        fittedModel: fitted
      };
      onSaveProfile(updatedProfile);
      setSelectedProfileForFitting(updatedProfile);
    } catch (err: any) {
      setFittingError(err.message || 'Failed to fit ridge regression model.');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-850 to-indigo-950/70 p-6 rounded-2xl border border-indigo-500/30 shadow-xl space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="p-2 rounded-lg bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
                <BookOpen className="w-5 h-5" />
              </span>
              <h1 className="text-xl font-bold text-white tracking-wide flex items-center gap-2">
                City Learning Lab
                <span className="text-xs font-mono font-medium px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                  Policy Intelligence & Cross-City Transfer
                </span>
              </h1>
            </div>
            <p className="text-sm text-slate-300 max-w-3xl leading-relaxed">
              Upload municipal water master plans and consumption series from other smart cities. Extract structured rationing policies with Gemini Multimodal Vision, fit local Ridge Regression forecasting models in the browser, and dispatch the allocation engine under that city's operational doctrine.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={onLoadPresets}
              className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs tracking-wider flex items-center gap-2 shadow-lg hover:shadow-indigo-500/20 transition-all border border-indigo-400/30"
              title="Load the 4 Evaluation PDFs (Lakeview Hourly, Lakeview Policy, Riverton Profile, Edge Case Messy) + Benchmarks"
            >
              <Sparkles className="w-4 h-4" />
              Load 4 Evaluation PDFs & Benchmarks
            </button>
          </div>
        </div>

        {/* Honesty Rules Callout Strip */}
        <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800 flex flex-wrap items-center gap-3 text-xs text-slate-400">
          <div className="flex items-center gap-1.5 text-amber-300 font-semibold uppercase tracking-wider text-[10px]">
            <Shield className="w-3.5 h-3.5" />
            Strict Data Provenance:
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge type="EXTRACTED FROM PDF" />
            <span className="text-slate-500">→ Parsed with page citations</span>
            <Badge type="USER-FITTED" />
            <span className="text-slate-500">→ Trained live in browser</span>
            <Badge type="ENGINE COMPUTED" />
            <span className="text-slate-500">→ Hydraulic optimizer results</span>
            <Badge type="REAL (KAGGLE DM1718)" />
            <span className="text-slate-500">→ Competition benchmark only</span>
          </div>
        </div>
      </div>

      {/* Main Tabs / Flow Navigation */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Column 1: Multi-File PDF Upload */}
        <div className="lg:col-span-1 space-y-4">
          <div className="p-5 rounded-xl bg-slate-900 border border-slate-800 shadow-md space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                <UploadCloud className="w-4 h-4 text-cyan-400" />
                Upload Municipal PDF
              </h2>
              <span className="text-[11px] text-slate-400 font-mono">Max 5 files • 10 MB</span>
            </div>

            {/* Drag & Drop Area */}
            <div
              onDragOver={e => {
                e.preventDefault();
                setIsDragging(true);
              }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={e => {
                e.preventDefault();
                setIsDragging(false);
                if (e.dataTransfer.files) handleFilesAdded(e.dataTransfer.files);
              }}
              className={`p-6 rounded-xl border-2 border-dashed transition-all text-center flex flex-col items-center justify-center gap-3 cursor-pointer ${
                isDragging
                  ? 'border-cyan-400 bg-cyan-950/30'
                  : 'border-slate-700 bg-slate-950/60 hover:border-slate-500'
              }`}
              onClick={() => {
                const el = document.getElementById('pdf-upload-input');
                if (el) el.click();
              }}
            >
              <input
                id="pdf-upload-input"
                type="file"
                accept="application/pdf"
                multiple
                className="hidden"
                onChange={e => {
                  if (e.target.files) handleFilesAdded(e.target.files);
                }}
              />
              <div className="w-12 h-12 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center text-cyan-400 shadow-inner">
                <FileText className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <p className="text-xs font-semibold text-slate-200">
                  Drop City Water Plan PDF here or <span className="text-cyan-400 underline">browse</span>
                </p>
                <p className="text-[10px] text-slate-500">
                  Extracts tables, per capita norms, network loss targets, and sector priorities
                </p>
              </div>
            </div>

            {/* Pending Files List */}
            {pendingUploads.length > 0 && (
              <div className="space-y-3 pt-2">
                <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                  Pending Files ({pendingUploads.length})
                </div>
                {pendingUploads.map(item => (
                  <div
                    key={item.id}
                    className="p-3 rounded-lg bg-slate-950 border border-slate-800 space-y-2 text-xs"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-slate-300 truncate max-w-[180px] font-medium" title={item.filename}>
                        {item.filename}
                      </span>
                      <button
                        onClick={() => setPendingUploads(prev => prev.filter(p => p.id !== item.id))}
                        className="text-slate-500 hover:text-rose-400 transition-colors"
                        title="Remove file"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-slate-500 text-[11px]">City:</span>
                      <input
                        type="text"
                        value={item.cityName}
                        onChange={e =>
                          setPendingUploads(prev =>
                            prev.map(p =>
                              p.id === item.id ? { ...p, cityName: e.target.value } : p
                            )
                          )
                        }
                        className="flex-1 bg-slate-900 border border-slate-800 rounded px-2 py-0.5 text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
                        placeholder="Enter City Name"
                      />
                    </div>

                    {/* Status & Action */}
                    <div className="flex items-center justify-between pt-1">
                      <div>
                        {item.status === 'reading' && (
                          <span className="text-amber-400 font-mono text-[11px] flex items-center gap-1.5">
                            <Clock className="w-3 h-3 animate-spin" />
                            Reading file bytes...
                          </span>
                        )}
                        {item.status === 'extracting' && (
                          <span className="text-cyan-400 font-mono text-[11px] flex items-center gap-1.5">
                            <Sparkles className="w-3 h-3 animate-spin" />
                            Gemini Document Vision parsing...
                          </span>
                        )}
                        {item.status === 'review' && (
                          <span className="text-emerald-400 font-mono text-[11px] flex items-center gap-1">
                            <CheckCircle className="w-3 h-3" />
                            Ready for Review
                          </span>
                        )}
                        {item.status === 'error' && (
                          <span className="text-rose-400 font-mono text-[11px] flex items-center gap-1" title={item.errorMessage}>
                            <AlertTriangle className="w-3 h-3" />
                            Failed
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-2">
                        {item.status === 'error' && (
                          <button
                            onClick={() => handleExtractPdf(item)}
                            className="px-2 py-1 rounded bg-rose-900/40 text-rose-300 border border-rose-700/50 hover:bg-rose-800/40 text-[11px] flex items-center gap-1 font-semibold"
                          >
                            <RotateCcw className="w-3 h-3" />
                            Retry
                          </button>
                        )}
                        {item.status === 'idle' && (
                          <button
                            onClick={() => handleExtractPdf(item)}
                            className="px-2.5 py-1 rounded bg-cyan-600 hover:bg-cyan-500 text-white font-semibold text-[11px] flex items-center gap-1 shadow-sm transition-all"
                          >
                            <Sparkles className="w-3 h-3" />
                            Extract Structured Data
                          </button>
                        )}
                        {item.status === 'review' && item.extractedProfile && (
                          <button
                            onClick={() => {
                              setReviewProfile(item.extractedProfile!);
                              setReviewPendingId(item.id);
                            }}
                            className="px-2.5 py-1 rounded bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-[11px] flex items-center gap-1 shadow-sm transition-all"
                          >
                            Open Review
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* City Profiles Selector & Manager */}
          <div className="p-5 rounded-xl bg-slate-900 border border-slate-800 shadow-md space-y-3">
            <h2 className="text-sm font-bold text-slate-100 flex items-center justify-between">
              <span>Saved City Profiles ({cityProfiles.length})</span>
            </h2>

            <div className="space-y-2">
              {cityProfiles.map(p => {
                const isActive = p.id === activeProfileId;
                const isBuiltin = p.id === 'profile-kaggle-default';

                return (
                  <div
                    key={p.id}
                    className={`p-3.5 rounded-xl border transition-all text-xs space-y-2 ${
                      isActive
                        ? 'bg-slate-850 border-cyan-500/60 shadow-lg shadow-cyan-950/20'
                        : 'bg-slate-950/70 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="space-y-1">
                        {renamingId === p.id ? (
                          <div className="flex items-center gap-1">
                            <input
                              type="text"
                              value={renameValue}
                              onChange={e => setRenameValue(e.target.value)}
                              className="bg-slate-900 border border-cyan-500 rounded px-2 py-0.5 text-xs text-white"
                              autoFocus
                            />
                            <button
                              onClick={() => {
                                if (renameValue.trim()) onRenameProfile(p.id, renameValue.trim());
                                setRenamingId(null);
                              }}
                              className="p-1 rounded bg-emerald-700 text-white"
                            >
                              <Check className="w-3 h-3" />
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1.5">
                            <h3 className="font-bold text-slate-100 text-sm">{p.cityName}</h3>
                            {!isBuiltin && (
                              <button
                                onClick={() => {
                                  setRenamingId(p.id);
                                  setRenameValue(p.cityName);
                                }}
                                className="text-slate-500 hover:text-slate-300"
                                title="Rename city profile"
                              >
                                <Edit2 className="w-3 h-3" />
                              </button>
                            )}
                          </div>
                        )}

                        <div className="flex items-center gap-2">
                          {p.sourceType === 'default' && <Badge type="REAL (KAGGLE DM1718)" />}
                          {p.sourceType === 'preset' && <Badge type="PRESET SAMPLE (SYNTHETIC BENCHMARK)" />}
                          {p.sourceType === 'pdf' && <Badge type="EXTRACTED FROM PDF" />}
                        </div>
                      </div>

                      {isActive ? (
                        <span className="px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 text-[10px] font-bold font-mono">
                          ACTIVE POLICY
                        </span>
                      ) : (
                        <button
                          onClick={() => onSelectActiveProfile(p.id)}
                          className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-[11px] font-semibold border border-slate-700 transition-all"
                        >
                          Activate
                        </button>
                      )}
                    </div>

                    {/* Metrics row */}
                    <div className="grid grid-cols-3 gap-2 py-1 border-t border-slate-850 text-[11px]">
                      <div>
                        <span className="text-slate-500 block">Tables</span>
                        <span className="font-mono font-bold text-slate-300">{p.tables.length} tables</span>
                      </div>
                      <div>
                        <span className="text-slate-500 block">Loss Norm</span>
                        <span className="font-mono font-bold text-cyan-400">
                          {p.policy.network_loss_percent !== null ? `${p.policy.network_loss_percent}%` : 'N/A'}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-500 block">Completeness</span>
                        <span className="font-mono font-bold text-emerald-400">{p.completenessPct}%</span>
                      </div>
                    </div>

                    {/* Actions row */}
                    <div className="flex items-center justify-between pt-1 border-t border-slate-850">
                      <button
                        onClick={() => {
                          setSelectedProfileForFitting(p);
                          setSelectedTableIdx(0);
                        }}
                        className="text-cyan-400 hover:text-cyan-300 font-semibold text-[11px] flex items-center gap-1"
                      >
                        <TrendingUp className="w-3 h-3" />
                        Fit Model on Tables
                      </button>

                      {!isBuiltin && (
                        <button
                          onClick={() => onDeleteProfile(p.id)}
                          className="text-slate-500 hover:text-rose-400 transition-colors"
                          title="Delete profile"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Column 2 & 3: Extraction Review OR Model Fitting Studio */}
        <div className="lg:col-span-2 space-y-6">
          {/* EXTRACTION REVIEW MODAL / PANEL */}
          {reviewProfile && (
            <div className="p-6 rounded-2xl bg-slate-900 border-2 border-cyan-500/50 shadow-2xl space-y-5 animate-in fade-in duration-200">
              <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-800">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 text-xs font-mono font-bold">
                      EXTRACTION REVIEW
                    </span>
                    <Badge type="EXTRACTED FROM PDF" />
                  </div>
                  <h2 className="text-lg font-bold text-white flex items-center gap-2">
                    Review Extracted Policy & Tables for {reviewProfile.cityName}
                  </h2>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleCancelReview}
                    className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold"
                  >
                    Discard
                  </button>
                  <button
                    onClick={handleConfirmProfile}
                    className="px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-lg shadow-emerald-950/40 flex items-center gap-1.5"
                  >
                    <CheckCircle className="w-4 h-4" />
                    Confirm & Save Profile
                  </button>
                </div>
              </div>

              {/* Notice */}
              <div className="p-3 rounded-lg bg-amber-950/40 border border-amber-600/40 text-amber-200 text-xs flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <div>
                  <strong>Verification Required:</strong> Inspect the extracted fields below. Every value displays its cited PDF page number. Values marked <em>"not found"</em> default to standard system baselines. Unconfirmed data never affects dashboard dispatches.
                </div>
              </div>

              {/* Editable City Name */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-medium text-slate-400 block mb-1">City Name</label>
                  <input
                    type="text"
                    value={reviewProfile.cityName}
                    onChange={e =>
                      setReviewProfile(prev => (prev ? { ...prev, cityName: e.target.value } : null))
                    }
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-cyan-400"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-400 block mb-1">
                    Network Transmission Loss Target (%)
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      step="0.1"
                      value={reviewProfile.policy.network_loss_percent ?? ''}
                      onChange={e => {
                        const val = e.target.value === '' ? null : parseFloat(e.target.value);
                        setReviewProfile(prev =>
                          prev
                            ? {
                                ...prev,
                                policy: { ...prev.policy, network_loss_percent: val }
                              }
                            : null
                        );
                      }}
                      placeholder="Not found (defaults to 18.2%)"
                      className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-cyan-400"
                    />
                    <span className="text-[11px] text-slate-400 font-mono whitespace-nowrap">
                      {reviewProfile.policy.network_loss_percent !== null ? 'Found' : 'Not found'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Priority Order & Per Capita Norm */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-medium text-slate-400 block mb-1">
                    Redistribution Priority Order (comma separated)
                  </label>
                  <input
                    type="text"
                    value={reviewProfile.policy.priority_order.join(', ')}
                    onChange={e => {
                      const list = e.target.value.split(',').map(s => s.trim()).filter(Boolean);
                      setReviewProfile(prev =>
                        prev
                          ? { ...prev, policy: { ...prev.policy, priority_order: list } }
                          : null
                      );
                    }}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-cyan-400"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-400 block mb-1">
                    Per Capita Consumption Cap (LPCD)
                  </label>
                  <input
                    type="number"
                    value={reviewProfile.policy.per_capita_norm_lpcd ?? ''}
                    onChange={e => {
                      const val = e.target.value === '' ? null : parseFloat(e.target.value);
                      setReviewProfile(prev =>
                        prev
                          ? {
                              ...prev,
                              policy: { ...prev.policy, per_capita_norm_lpcd: val }
                            }
                          : null
                      );
                    }}
                    placeholder="Not found (defaults to 135 lpcd)"
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-cyan-400"
                  />
                </div>
              </div>

              {/* Minimum Guarantee Quotas */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-medium text-slate-300">
                    Minimum Sector Guarantees
                  </label>
                  <button
                    onClick={() => {
                      setReviewProfile(prev =>
                        prev
                          ? {
                              ...prev,
                              policy: {
                                ...prev.policy,
                                minimum_guarantee: [
                                  ...prev.policy.minimum_guarantee,
                                  { sector: 'New Sector', value: 2.0, unit: 'ML/day', page: 1 }
                                ]
                              }
                            }
                          : null
                      );
                    }}
                    className="text-cyan-400 hover:text-cyan-300 text-xs font-semibold"
                  >
                    + Add Guarantee
                  </button>
                </div>

                {reviewProfile.policy.minimum_guarantee.length === 0 ? (
                  <p className="text-xs text-slate-500 italic">No minimum sector guarantees detected in document.</p>
                ) : (
                  <div className="space-y-2">
                    {reviewProfile.policy.minimum_guarantee.map((mg, i) => (
                      <div key={i} className="flex items-center gap-2 bg-slate-950 p-2 rounded-lg border border-slate-800 text-xs">
                        <input
                          type="text"
                          value={mg.sector}
                          onChange={e => {
                            const val = e.target.value;
                            setReviewProfile(prev => {
                              if (!prev) return null;
                              const updated = [...prev.policy.minimum_guarantee];
                              updated[i].sector = val;
                              return { ...prev, policy: { ...prev.policy, minimum_guarantee: updated } };
                            });
                          }}
                          className="flex-1 bg-slate-900 border border-slate-800 rounded px-2 py-1 text-slate-200"
                        />
                        <input
                          type="number"
                          step="0.1"
                          value={mg.value}
                          onChange={e => {
                            const val = parseFloat(e.target.value) || 0;
                            setReviewProfile(prev => {
                              if (!prev) return null;
                              const updated = [...prev.policy.minimum_guarantee];
                              updated[i].value = val;
                              return { ...prev, policy: { ...prev.policy, minimum_guarantee: updated } };
                            });
                          }}
                          className="w-20 bg-slate-900 border border-slate-800 rounded px-2 py-1 text-slate-200"
                        />
                        <span className="text-slate-400 font-mono">{mg.unit}</span>
                        <span className="px-1.5 py-0.5 rounded bg-slate-900 text-slate-400 border border-slate-800 text-[10px] font-mono">
                          p. {mg.page}
                        </span>
                        <button
                          onClick={() => {
                            setReviewProfile(prev => {
                              if (!prev) return null;
                              const updated = prev.policy.minimum_guarantee.filter((_, idx) => idx !== i);
                              return { ...prev, policy: { ...prev.policy, minimum_guarantee: updated } };
                            });
                          }}
                          className="text-slate-500 hover:text-rose-400 ml-1"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Extracted Tables Preview */}
              <div className="space-y-3 pt-2">
                <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                  Extracted Data Tables ({reviewProfile.tables.length})
                </h3>
                {reviewProfile.tables.length === 0 ? (
                  <p className="text-xs text-slate-500 italic">No structured data tables parsed from this document.</p>
                ) : (
                  reviewProfile.tables.map((t, idx) => (
                    <div key={idx} className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-semibold text-slate-200">{t.name}</span>
                        <div className="flex items-center gap-2">
                          <span className="text-slate-400">{t.rows.length} rows</span>
                          <span className="px-1.5 py-0.5 rounded bg-slate-900 text-cyan-400 border border-slate-800 text-[10px] font-mono">
                            Page {t.page}
                          </span>
                        </div>
                      </div>
                      <div className="overflow-x-auto max-h-40 border border-slate-850 rounded">
                        <table className="w-full text-[11px] text-left">
                          <thead className="bg-slate-900 text-slate-400 sticky top-0">
                            <tr>
                              {t.columns.map((c, cIdx) => (
                                <th key={cIdx} className="px-2 py-1 font-mono font-medium">{c}</th>
                              ))}
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-850">
                            {t.rows.slice(0, 5).map((row, rIdx) => (
                              <tr key={rIdx} className="hover:bg-slate-900/50">
                                {row.map((val, cIdx) => (
                                  <td key={cIdx} className="px-2 py-1 text-slate-300 font-mono">{String(val)}</td>
                                ))}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* IN-BROWSER MODEL FITTING STUDIO */}
          <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-800">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="p-1.5 rounded-lg bg-cyan-500/20 text-cyan-400">
                    <Sliders className="w-4 h-4" />
                  </span>
                  <h2 className="text-base font-bold text-white tracking-wide">
                    In-Browser Model Fitting Studio
                  </h2>
                  <Badge type="USER-FITTED" />
                </div>
                <p className="text-xs text-slate-400">
                  Fit a pure JavaScript Ridge Regression model on {selectedProfileForFitting.cityName} telemetry series. Zero cloud training cost, full feature standardization, and strict validation.
                </p>
              </div>

              {/* Table Selector */}
              {selectedProfileForFitting.tables.length > 0 && (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-400 font-medium">Table:</span>
                  <select
                    value={selectedTableIdx}
                    onChange={e => {
                      setSelectedTableIdx(Number(e.target.value));
                      setTargetCol('');
                      setSelectedFeatureCols([]);
                    }}
                    className="bg-slate-950 border border-slate-700 rounded-lg px-3 py-1 text-xs text-cyan-300 focus:outline-none"
                  >
                    {selectedProfileForFitting.tables.map((t, idx) => (
                      <option key={idx} value={idx}>
                        {t.name} ({t.rows.length} rows)
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            {/* If no tables with numeric columns */}
            {selectedProfileForFitting.tables.length === 0 ? (
              <div className="p-8 rounded-xl bg-slate-950/60 border border-slate-800 text-center space-y-2">
                <p className="text-sm text-slate-400">
                  This profile does not contain tabular consumption data.
                </p>
                <p className="text-xs text-slate-500">
                  Select Singapore PUB or Cape Town Day Zero from the sidebar, or upload a plan with hourly consumption logs.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Column Selectors */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 rounded-xl bg-slate-950 border border-slate-800">
                  {/* Target Column */}
                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-slate-200 block">
                      Target Variable (y to predict):
                    </label>
                    <select
                      value={targetCol}
                      onChange={e => setTargetCol(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-400"
                    >
                      <option value="">-- Choose Target Column --</option>
                      {numericColumns.map(col => (
                        <option key={col} value={col}>
                          {col}
                        </option>
                      ))}
                    </select>
                    <span className="text-[11px] text-slate-500 block">
                      Expected hourly demand or consumption series in Megalitres.
                    </span>
                  </div>

                  {/* Regularization Lambda */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs font-semibold text-slate-200">
                      <span>Ridge Penalty L2 (λ):</span>
                      <span className="font-mono text-cyan-400">{regularizationLambda}</span>
                    </div>
                    <input
                      type="range"
                      min="0.01"
                      max="10.0"
                      step="0.1"
                      value={regularizationLambda}
                      onChange={e => setRegularizationLambda(parseFloat(e.target.value))}
                      className="w-full accent-cyan-400"
                    />
                    <div className="flex justify-between text-[10px] text-slate-500 font-mono">
                      <span>0.01 (OLS)</span>
                      <span>1.0 (Standard)</span>
                      <span>10.0 (High L2)</span>
                    </div>
                  </div>

                  {/* Feature Columns Checkboxes */}
                  <div className="md:col-span-2 space-y-2 pt-2 border-t border-slate-850">
                    <label className="text-xs font-semibold text-slate-200 block">
                      Predictor Features (X standardized matrix):
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {numericColumns
                        .filter(col => col !== targetCol)
                        .map(col => {
                          const isSelected = selectedFeatureCols.includes(col);
                          return (
                            <button
                              key={col}
                              type="button"
                              onClick={() => {
                                if (isSelected) {
                                  setSelectedFeatureCols(prev => prev.filter(c => c !== col));
                                } else {
                                  setSelectedFeatureCols(prev => [...prev, col]);
                                }
                              }}
                              className={`px-3 py-1.5 rounded-lg text-xs font-mono font-medium transition-all flex items-center gap-1.5 ${
                                isSelected
                                  ? 'bg-cyan-600 text-white shadow-md shadow-cyan-950/40 border border-cyan-400'
                                  : 'bg-slate-900 text-slate-400 border border-slate-800 hover:border-slate-700'
                              }`}
                            >
                              {isSelected ? <Check className="w-3 h-3" /> : '+'}
                              {col}
                            </button>
                          );
                        })}
                    </div>
                  </div>
                </div>

                {/* Warning if fewer than 50 rows */}
                {activeTable.rows.length < 50 && (
                  <div className="p-3 rounded-xl bg-amber-950/40 border border-amber-600/40 text-amber-200 text-xs flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
                    <span>
                      <strong>Warning:</strong> Too little data for a reliable model ({activeTable.rows.length} rows found; 50+ recommended).
                    </span>
                  </div>
                )}

                {/* Error Banner */}
                {fittingError && (
                  <div className="p-3 rounded-xl bg-rose-950/40 border border-rose-600/40 text-rose-200 text-xs flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
                    <span>{fittingError}</span>
                  </div>
                )}

                {/* Fit Button */}
                <div className="flex items-center justify-between pt-1">
                  <span className="text-xs text-slate-400 font-mono">
                    {activeTable.rows.length} data rows available
                  </span>
                  <button
                    onClick={handleFitModel}
                    className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-cyan-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 text-white font-bold text-xs tracking-wider uppercase flex items-center gap-2 shadow-lg shadow-cyan-950/30 transition-all"
                  >
                    <Play className="w-3.5 h-3.5 fill-current" />
                    Fit Model (Ridge Regression)
                  </button>
                </div>

                {/* FITTED MODEL RESULTS DISPLAY */}
                {selectedProfileForFitting.fittedModel && (
                  <div className="p-5 rounded-xl bg-slate-950 border border-indigo-500/40 shadow-xl space-y-4 pt-4 mt-4">
                    <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-800">
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                          <h3 className="font-bold text-white text-sm">
                            Fitted Model Results: {selectedProfileForFitting.fittedModel.targetColumn}
                          </h3>
                          <Badge type="USER-FITTED" />
                        </div>
                        <p className="text-[11px] text-slate-400 font-mono">
                          Validation: {selectedProfileForFitting.fittedModel.splitType} • Fitted at{' '}
                          {new Date(selectedProfileForFitting.fittedModel.fittedAt).toLocaleTimeString()}
                        </p>
                      </div>

                      {/* Toggle to use in Forecast tab */}
                      <div className="flex items-center gap-3 bg-slate-900 px-3 py-1.5 rounded-xl border border-slate-800">
                        <span className="text-xs font-semibold text-slate-200">
                          Use in Forecast tab:
                        </span>
                        <button
                          onClick={() => {
                            if (activeFittedModel?.fittedAt === selectedProfileForFitting.fittedModel?.fittedAt) {
                              onToggleUseFittedModel(null);
                            } else {
                              onToggleUseFittedModel(selectedProfileForFitting.fittedModel!);
                            }
                          }}
                          className={`w-11 h-6 rounded-full transition-colors p-0.5 flex items-center ${
                            activeFittedModel?.fittedAt === selectedProfileForFitting.fittedModel?.fittedAt
                              ? 'bg-cyan-500 justify-end'
                              : 'bg-slate-700 justify-start'
                          }`}
                        >
                          <div className="w-5 h-5 rounded-full bg-white shadow-md" />
                        </button>
                      </div>
                    </div>

                    {/* Metric KPIs */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                      <div className="p-3 rounded-lg bg-slate-900 border border-slate-850 space-y-1">
                        <span className="text-slate-400 block text-[11px]">Model MAE</span>
                        <div className="text-lg font-bold font-mono text-cyan-400">
                          {selectedProfileForFitting.fittedModel.mae.toFixed(3)}
                        </div>
                        <span className="text-[10px] text-slate-500">
                          vs Naive {selectedProfileForFitting.fittedModel.naiveBaselineMae.toFixed(3)}
                        </span>
                      </div>

                      <div className="p-3 rounded-lg bg-slate-900 border border-slate-850 space-y-1">
                        <span className="text-slate-400 block text-[11px]">Model WAPE</span>
                        <div className="text-lg font-bold font-mono text-teal-400">
                          {selectedProfileForFitting.fittedModel.wapePct.toFixed(1)}%
                        </div>
                        <span className="text-[10px] text-slate-500">
                          vs Naive {selectedProfileForFitting.fittedModel.naiveBaselineWapePct.toFixed(1)}%
                        </span>
                      </div>

                      <div className="p-3 rounded-lg bg-slate-900 border border-slate-850 space-y-1">
                        <span className="text-slate-400 block text-[11px]">Accuracy Gain</span>
                        <div className="text-lg font-bold font-mono text-emerald-400">
                          {selectedProfileForFitting.fittedModel.maeImprovementPct > 0
                            ? `+${selectedProfileForFitting.fittedModel.maeImprovementPct.toFixed(1)}%`
                            : `${selectedProfileForFitting.fittedModel.maeImprovementPct.toFixed(1)}%`}
                        </div>
                        <span className="text-[10px] text-slate-500">over baseline persistence</span>
                      </div>

                      <div className="p-3 rounded-lg bg-slate-900 border border-slate-850 space-y-1">
                        <span className="text-slate-400 block text-[11px]">Goodness of Fit R²</span>
                        <div className="text-lg font-bold font-mono text-indigo-400">
                          {selectedProfileForFitting.fittedModel.r2Score.toFixed(2)}
                        </div>
                        <span className="text-[10px] text-slate-500">explained variance</span>
                      </div>
                    </div>

                    {/* Feature Importance Weights */}
                    <div className="space-y-2 pt-2">
                      <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                        Feature Coefficients (Standardized Importance):
                      </h4>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                        {selectedProfileForFitting.fittedModel.weights.map((w, i) => (
                          <div
                            key={i}
                            className="p-2.5 rounded-lg bg-slate-900 border border-slate-850 flex items-center justify-between"
                          >
                            <span className="font-mono text-slate-200">{w.feature}</span>
                            <div className="flex items-center gap-2">
                              <span
                                className={`font-mono font-bold ${
                                  w.stdWeight >= 0 ? 'text-emerald-400' : 'text-rose-400'
                                }`}
                              >
                                {w.stdWeight > 0 ? `+${w.stdWeight}` : w.stdWeight}
                              </span>
                              <span className="text-[10px] text-slate-500 font-mono">
                                (raw: {w.coefficient})
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Predicted vs Actual Chart */}
                    <div className="space-y-2 pt-2">
                      <div className="flex items-center justify-between text-xs">
                        <h4 className="font-bold text-slate-300 uppercase tracking-wider">
                          Predicted vs Actual Consumption Series
                        </h4>
                        <div className="flex items-center gap-3 text-[11px]">
                          <span className="flex items-center gap-1.5 text-cyan-400">
                            <span className="w-2.5 h-0.5 bg-cyan-400 inline-block" />
                            Predicted
                          </span>
                          <span className="flex items-center gap-1.5 text-emerald-400">
                            <span className="w-2.5 h-0.5 bg-emerald-400 inline-block" />
                            Actual
                          </span>
                          <span className="flex items-center gap-1.5 text-slate-400">
                            <span className="w-2.5 h-0.5 bg-slate-400 inline-block border-dashed border-b" />
                            Naive Baseline
                          </span>
                        </div>
                      </div>

                      <div className="h-56 w-full pt-1">
                        <ResponsiveContainer width="100%" height="100%">
                          <ComposedChart data={selectedProfileForFitting.fittedModel.predictedVsActual}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                            <XAxis dataKey="label" stroke="#64748b" tick={{ fontSize: 10 }} />
                            <YAxis stroke="#64748b" tick={{ fontSize: 10 }} />
                            <Tooltip
                              contentStyle={{
                                backgroundColor: '#0f172a',
                                borderColor: '#334155',
                                borderRadius: '8px',
                                fontSize: '12px'
                              }}
                            />
                            <Line
                              type="monotone"
                              dataKey="actual"
                              stroke="#10b981"
                              strokeWidth={2}
                              dot={false}
                              name="Actual"
                            />
                            <Line
                              type="monotone"
                              dataKey="predicted"
                              stroke="#06b6d4"
                              strokeWidth={2}
                              dot={false}
                              name="Ridge Predicted"
                            />
                            <Line
                              type="monotone"
                              dataKey="naive"
                              stroke="#64748b"
                              strokeDasharray="4 4"
                              dot={false}
                              name="Naive Baseline"
                            />
                          </ComposedChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
