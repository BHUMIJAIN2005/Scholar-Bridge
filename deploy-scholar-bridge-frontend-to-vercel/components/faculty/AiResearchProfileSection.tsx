'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import {
  Sparkles,
  UploadCloud,
  FileText,
  X,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Plus,
  Trash2,
  Check,
  Brain,
  BookOpen,
  Users,
  ChevronRight,
  RefreshCw,
  Lightbulb,
  Award,
  Layers,
  HelpCircle,
  ArrowRight,
} from 'lucide-react';
import {
  facultyResearchProfileApi,
  AnalysisResult,
  ResearchProfile,
  StatedRequirements,
  LaymanSummary,
  ProfileStatusResponse,
  StudentMatch,
} from '@/api/facultyResearchProfileApi';

interface UploadItem {
  id: string;
  file: File;
  docType: 'cv' | 'paper';
}

interface AiResearchProfileSectionProps {
  professorId?: string | number;
}

type ProcessingStage =
  | 'idle'
  | 'uploaded'
  | 'extracting'
  | 'analyzing'
  | 'generating'
  | 'completed';

export const AiResearchProfileSection: React.FC<AiResearchProfileSectionProps> = ({
  professorId = 'me',
}) => {
  // Upload state
  const [files, setFiles] = useState<UploadItem[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Processing & Stages
  const [stage, setStage] = useState<ProcessingStage>('idle');
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [warningMessages, setWarningMessages] = useState<string[]>([]);

  // Draft profile for editing
  const [draftId, setDraftId] = useState<string | null>(null);
  const [draftProfile, setDraftProfile] = useState<ResearchProfile | null>(null);
  const [draftRequirements, setDraftRequirements] = useState<StatedRequirements | null>(null);
  const [draftLayman, setDraftLayman] = useState<LaymanSummary | null>(null);

  // Confirmed Profile & Matching Students
  const [confirmedStatus, setConfirmedStatus] = useState<ProfileStatusResponse | null>(null);
  const [matches, setMatches] = useState<StudentMatch[]>([]);
  const [isLoadingStatus, setIsLoadingStatus] = useState(true);
  const [isConfirming, setIsConfirming] = useState(false);
  const [confirmSuccess, setConfirmSuccess] = useState(false);

  // Interactive tag inputs
  const [newInterest, setNewInterest] = useState('');
  const [newDomain, setNewDomain] = useState('');
  const [newMethod, setNewMethod] = useState('');
  const [newSkill, setNewSkill] = useState('');
  const [newYear, setNewYear] = useState('');
  const [newPub, setNewPub] = useState('');
  const [newContrib, setNewContrib] = useState('');

  // Initial load: check if professor already has a confirmed profile
  useEffect(() => {
    void loadProfileStatus();
  }, [professorId]);

  const loadProfileStatus = async () => {
    setIsLoadingStatus(true);
    try {
      const status = await facultyResearchProfileApi.getConfirmedProfile(professorId);
      setConfirmedStatus(status);
      if (status.is_confirmed) {
        // Load matching students
        try {
          const matchRes = await facultyResearchProfileApi.getStudentMatches(professorId, 10);
          setMatches(matchRes.matches || []);
        } catch (e) {
          console.warn('Could not load student matches:', e);
        }
      }
    } catch (err) {
      console.warn('Error loading confirmed profile status:', err);
    } finally {
      setIsLoadingStatus(false);
    }
  };

  // File Handling
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    const selected = Array.from(e.target.files);
    addFiles(selected);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const addFiles = (selectedFiles: File[]) => {
    const validPdfs = selectedFiles.filter(
      (f) => f.type === 'application/pdf' || f.name.toLowerCase().endsWith('.pdf')
    );
    if (validPdfs.length < selectedFiles.length) {
      setErrorMessage('Some selected files were ignored. Only PDF documents are supported.');
    }
    const newItems: UploadItem[] = validPdfs.map((f, i) => {
      const isCv = f.name.toLowerCase().includes('cv') || f.name.toLowerCase().includes('resume');
      return {
        id: `${Date.now()}_${i}_${f.name}`,
        file: f,
        docType: isCv ? 'cv' : 'paper',
      };
    });
    setFiles((prev) => [...prev, ...newItems]);
  };

  const removeFile = (id: string) => {
    setFiles((prev) => prev.filter((item) => item.id !== id));
  };

  const toggleDocType = (id: string) => {
    setFiles((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, docType: item.docType === 'cv' ? 'paper' : 'cv' } : item
      )
    );
  };

  // AI Document Processing
  const handleProcessWithAi = async () => {
    if (files.length === 0) {
      setErrorMessage('Please add at least one CV or research paper PDF.');
      return;
    }

    setIsProcessing(true);
    setErrorMessage(null);
    setWarningMessages([]);

    // Multi-stage indicator
    setStage('uploaded');

    const timer1 = setTimeout(() => setStage('extracting'), 1000);
    const timer2 = setTimeout(() => setStage('analyzing'), 3000);
    const timer3 = setTimeout(() => setStage('generating'), 6000);

    try {
      const fileObjs = files.map((f) => f.file);
      const docTypes = files.map((f) => f.docType);

      const result: AnalysisResult = await facultyResearchProfileApi.analyzeDocuments(
        fileObjs,
        docTypes
      );

      clearTimeout(timer1);
      clearTimeout(timer2);
      clearTimeout(timer3);
      setStage('completed');

      if (result.no_research_content) {
        setErrorMessage(
          result.reason ||
            'The uploaded documents did not contain readable research content. Please upload valid academic CVs or research papers.'
        );
        setDraftProfile(null);
        return;
      }

      setDraftId(result.draft_id);
      setDraftProfile(result.research_profile);
      setDraftRequirements(result.stated_requirements);
      setDraftLayman(result.layman_summary);

      if (result.warnings && result.warnings.length > 0) {
        setWarningMessages(result.warnings);
      }
    } catch (err: any) {
      clearTimeout(timer1);
      clearTimeout(timer2);
      clearTimeout(timer3);
      setStage('idle');

      const status = err.response?.status;
      const detail = err.response?.data?.detail || err.response?.data?.message || err.message;

      if (status === 429) {
        setErrorMessage('Groq API rate limit reached. Please wait a few moments and retry.');
      } else if (status === 413) {
        setErrorMessage('One of the uploaded files exceeds the 25MB size limit.');
      } else {
        setErrorMessage(
          detail || 'Failed to analyze documents. Please check the files and try again.'
        );
      }
    } finally {
      setIsProcessing(false);
    }
  };

  // Confirmation Action
  const handleConfirmProfile = async () => {
    if (!draftProfile) return;

    setIsConfirming(true);
    setErrorMessage(null);

    try {
      await facultyResearchProfileApi.confirmProfile(
        {
          research_profile: draftProfile,
          stated_requirements: draftRequirements,
          layman_summary: draftLayman,
          draft_id: draftId,
        },
        professorId
      );

      setConfirmSuccess(true);
      // Refresh status & student matches
      await loadProfileStatus();
      setTimeout(() => setConfirmSuccess(false), 4000);
    } catch (err: any) {
      const detail = err.response?.data?.detail || err.response?.data?.message || err.message;
      setErrorMessage(detail || 'Failed to confirm research profile.');
    } finally {
      setIsConfirming(false);
    }
  };

  // Helper Tag Adders
  const addTag = (
    field: 'interests' | 'domains' | 'methods' | 'skills' | 'years' | 'pubs' | 'contribs',
    value: string
  ) => {
    const trimmed = value.trim();
    if (!trimmed || !draftProfile) return;

    if (field === 'interests') {
      if (!draftProfile.research_interests.includes(trimmed)) {
        setDraftProfile({
          ...draftProfile,
          research_interests: [...draftProfile.research_interests, trimmed],
        });
      }
      setNewInterest('');
    } else if (field === 'domains') {
      if (!draftProfile.research_domains.includes(trimmed)) {
        setDraftProfile({
          ...draftProfile,
          research_domains: [...draftProfile.research_domains, trimmed],
        });
      }
      setNewDomain('');
    } else if (field === 'methods') {
      if (!draftProfile.methods.includes(trimmed)) {
        setDraftProfile({
          ...draftProfile,
          methods: [...draftProfile.methods, trimmed],
        });
      }
      setNewMethod('');
    } else if (field === 'pubs') {
      setDraftProfile({
        ...draftProfile,
        publications: [...draftProfile.publications, trimmed],
      });
      setNewPub('');
    } else if (field === 'contribs') {
      setDraftProfile({
        ...draftProfile,
        contributions: [...draftProfile.contributions, trimmed],
      });
      setNewContrib('');
    } else if (field === 'skills' && draftRequirements) {
      if (!draftRequirements.preferred_skills.includes(trimmed)) {
        setDraftRequirements({
          ...draftRequirements,
          preferred_skills: [...draftRequirements.preferred_skills, trimmed],
        });
      }
      setNewSkill('');
    } else if (field === 'years' && draftRequirements) {
      if (!draftRequirements.preferred_years.includes(trimmed)) {
        setDraftRequirements({
          ...draftRequirements,
          preferred_years: [...draftRequirements.preferred_years, trimmed],
        });
      }
      setNewYear('');
    }
  };

  const removeTag = (
    field: 'interests' | 'domains' | 'methods' | 'skills' | 'years' | 'pubs' | 'contribs',
    index: number
  ) => {
    if (!draftProfile) return;
    if (field === 'interests') {
      setDraftProfile({
        ...draftProfile,
        research_interests: draftProfile.research_interests.filter((_, i) => i !== index),
      });
    } else if (field === 'domains') {
      setDraftProfile({
        ...draftProfile,
        research_domains: draftProfile.research_domains.filter((_, i) => i !== index),
      });
    } else if (field === 'methods') {
      setDraftProfile({
        ...draftProfile,
        methods: draftProfile.methods.filter((_, i) => i !== index),
      });
    } else if (field === 'pubs') {
      setDraftProfile({
        ...draftProfile,
        publications: draftProfile.publications.filter((_, i) => i !== index),
      });
    } else if (field === 'contribs') {
      setDraftProfile({
        ...draftProfile,
        contributions: draftProfile.contributions.filter((_, i) => i !== index),
      });
    } else if (field === 'skills' && draftRequirements) {
      setDraftRequirements({
        ...draftRequirements,
        preferred_skills: draftRequirements.preferred_skills.filter((_, i) => i !== index),
      });
    } else if (field === 'years' && draftRequirements) {
      setDraftRequirements({
        ...draftRequirements,
        preferred_years: draftRequirements.preferred_years.filter((_, i) => i !== index),
      });
    }
  };

  return (
    <div className="space-y-8">
      {/* SECTION HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-sage/20 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-leaf text-white flex items-center justify-center shadow-xs">
              <Brain size={18} />
            </div>
            <h2 className="text-xl font-bold text-ink">AI Research Profile & Matching</h2>
            {confirmedStatus?.is_confirmed && (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[#C2E8FF] text-[#042558] border border-[#7C9DC6]">
                <Check size={12} />
                Profile Active
              </span>
            )}
          </div>
          <p className="text-sm text-ink/70 mt-1">
            Upload your academic CV and research papers. Our Groq-powered AI pipeline extracts your research
            identity, generates an undergraduate-friendly summary, and matches eligible student collaborators.
          </p>
        </div>

        {confirmedStatus?.is_confirmed && (
          <button
            onClick={() => {
              setDraftProfile(confirmedStatus.research_profile || null);
              setDraftRequirements(confirmedStatus.stated_requirements || null);
              setDraftLayman(confirmedStatus.layman_summary || null);
            }}
            className="btn-secondary px-3.5 py-2 text-xs font-semibold inline-flex items-center gap-1.5 shrink-0 self-start sm:self-auto"
          >
            <RefreshCw size={14} />
            Re-edit Profile
          </button>
        )}
      </div>

      {/* CONFIRMATION SUCCESS BANNER */}
      {confirmSuccess && (
        <div className="flex items-center gap-3 p-4 rounded-xl border border-[#7C9DC6] bg-[#C2E8FF]/40 text-[#042558] text-sm animate-fadeIn">
          <CheckCircle2 size={20} className="text-[#507CA9] shrink-0" />
          <div>
            <p className="font-semibold">Research Profile Confirmed Successfully!</p>
            <p className="text-xs text-[#042558]">
              Your 384-dimensional normalized MiniLM research embedding has been generated and stored.
              Student collaborator recommendations are now active.
            </p>
          </div>
        </div>
      )}

      {/* ERROR BANNER */}
      {errorMessage && (
        <div className="flex items-start justify-between gap-3 p-4 rounded-xl border border-rose-200 bg-rose-50 text-rose-900 text-sm">
          <div className="flex items-start gap-2.5">
            <AlertCircle size={18} className="text-rose-600 shrink-0 mt-0.5" />
            <span>{errorMessage}</span>
          </div>
          <button
            onClick={() => setErrorMessage(null)}
            className="text-rose-600 hover:text-rose-800"
          >
            <X size={16} />
          </button>
        </div>
      )}

      {/* WARNINGS BANNER */}
      {warningMessages.length > 0 && (
        <div className="p-4 rounded-xl border border-amber-200 bg-amber-50 text-amber-900 text-xs space-y-1">
          <p className="font-semibold flex items-center gap-1.5">
            <AlertCircle size={15} className="text-amber-600" /> Extraction Notices:
          </p>
          <ul className="list-disc pl-5 space-y-0.5">
            {warningMessages.map((w, idx) => (
              <li key={idx}>{w}</li>
            ))}
          </ul>
        </div>
      )}

      {/* 1. DOCUMENT UPLOAD CARD */}
      <div className="solid-card p-6 space-y-5">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-ink flex items-center gap-2">
              <UploadCloud size={18} className="text-leaf" />
              Upload Research Documents
            </h3>
            <p className="text-xs text-ink/70 mt-0.5">
              Upload your CV and recent publication PDFs. You can label each file as a CV or Research Paper.
            </p>
          </div>
          <span className="text-xs font-semibold text-leaf bg-mint/50 px-2.5 py-1 rounded-full">
            PDF only (Max 25MB)
          </span>
        </div>

        {/* Dropzone Area */}
        <div
          onClick={() => fileInputRef.current?.click()}
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            if (e.dataTransfer.files) {
              addFiles(Array.from(e.dataTransfer.files));
            }
          }}
          className="border-2 border-dashed border-sage/40 hover:border-leaf rounded-xl p-8 text-center cursor-pointer transition bg-mist/50 hover:bg-mint/20"
        >
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept=".pdf,application/pdf"
            className="hidden"
            onChange={handleFileSelect}
          />
          <div className="flex flex-col items-center justify-center gap-2">
            <div className="h-12 w-12 rounded-full bg-white shadow-xs border border-sage/30 flex items-center justify-center text-leaf">
              <UploadCloud size={24} />
            </div>
            <p className="text-sm font-semibold text-ink">
              Drag and drop your academic PDFs here, or{' '}
              <span className="text-forest underline">browse files</span>
            </p>
            <p className="text-xs text-ink/60">
              Supports Professor CVs, IEEE/ACM papers, conference preprints, and journals.
            </p>
          </div>
        </div>

        {/* Selected Files List */}
        {files.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs font-semibold text-ink/70 px-1">
              <span>{files.length} Document{files.length > 1 ? 's' : ''} Selected</span>
              <button
                onClick={() => setFiles([])}
                className="text-rose-600 hover:text-rose-800 text-xs"
              >
                Clear all
              </button>
            </div>
            <div className="divide-y divide-sage/20 border border-sage/30 rounded-xl overflow-hidden bg-white">
              {files.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between gap-3 p-3.5 hover:bg-mist/40 transition text-sm"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <FileText size={18} className="text-leaf shrink-0" />
                    <div className="min-w-0">
                      <p className="font-semibold text-ink truncate text-xs sm:text-sm">
                        {item.file.name}
                      </p>
                      <p className="text-[11px] text-ink/60">
                        {(item.file.size / (1024 * 1024)).toFixed(2)} MB
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {/* Toggle Document Type */}
                    <button
                      type="button"
                      onClick={() => toggleDocType(item.id)}
                      className={`text-xs px-2.5 py-1 rounded-full font-semibold border transition ${
                        item.docType === 'cv'
                          ? 'bg-purple-100 text-purple-800 border-purple-300'
                          : 'bg-blue-100 text-blue-800 border-blue-300'
                      }`}
                      title="Click to toggle document type"
                    >
                      {item.docType === 'cv' ? '📄 CV / Resume' : '📑 Research Paper'}
                    </button>

                    <button
                      type="button"
                      onClick={() => removeFile(item.id)}
                      className="p-1 rounded-lg text-ink/40 hover:text-rose-600 hover:bg-rose-50 transition"
                      title="Remove file"
                    >
                      <X size={16} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Process with AI Action */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-2">
          <div className="text-xs text-ink/70">
            {isProcessing ? (
              <span className="flex items-center gap-2 text-forest font-semibold">
                <Loader2 size={15} className="animate-spin text-leaf" />
                {stage === 'uploaded' && '1/4: Files uploaded to analysis pipeline...'}
                {stage === 'extracting' && '2/4: Extracting PDF text & checking OCR fallback...'}
                {stage === 'analyzing' && '3/4: Analyzing methodologies & research domains with Groq...'}
                {stage === 'generating' && '4/4: Formatting research profile and layman summary...'}
                {stage === 'completed' && 'Analysis complete!'}
              </span>
            ) : (
              <span>Click to extract research domains, methods, contributions and student requirements.</span>
            )}
          </div>

          <button
            onClick={handleProcessWithAi}
            disabled={isProcessing || files.length === 0}
            className="btn-primary px-6 py-2.5 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 shadow-sm disabled:opacity-50 shrink-0"
          >
            {isProcessing ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                <span>Processing with AI...</span>
              </>
            ) : (
              <>
                <Sparkles size={16} />
                <span>Process with AI</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* 2. DRAFT RESEARCH PROFILE PREVIEW & EDITOR */}
      {draftProfile && (
        <div className="solid-card p-6 space-y-6 border-leaf/40 bg-white">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-sage/20 pb-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 border border-amber-300">
                  Draft — Review & Edit Before Confirming
                </span>
                {draftId && (
                  <span className="text-[11px] text-ink/50 font-mono">ID: {draftId}</span>
                )}
              </div>
              <h3 className="text-lg font-bold text-ink mt-1">Review AI-Generated Research Profile</h3>
              <p className="text-xs text-ink/70">
                You can add or remove tags, edit the summaries, and verify publications before confirming.
              </p>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={handleConfirmProfile}
                disabled={isConfirming}
                className="btn-primary bg-forest hover:bg-night-green text-white px-5 py-2 rounded-xl text-sm font-semibold flex items-center gap-2 shadow-xs"
              >
                {isConfirming ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    <span>Confirming...</span>
                  </>
                ) : (
                  <>
                    <Check size={16} />
                    <span>Confirm Research Profile</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* RESEARCH INTERESTS */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-ink uppercase tracking-wider flex items-center gap-1.5">
              <Sparkles size={14} className="text-leaf" /> Research Interests (Specific Topics)
            </label>
            <div className="flex flex-wrap items-center gap-2">
              {draftProfile.research_interests.map((interest, idx) => (
                <span
                  key={idx}
                  className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-mint text-forest border border-sage/30"
                >
                  {interest}
                  <button
                    type="button"
                    onClick={() => removeTag('interests', idx)}
                    className="hover:text-rose-600 transition"
                  >
                    <X size={12} />
                  </button>
                </span>
              ))}
              <div className="inline-flex items-center gap-1">
                <input
                  type="text"
                  placeholder="+ Add interest"
                  value={newInterest}
                  onChange={(e) => setNewInterest(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      addTag('interests', newInterest);
                    }
                  }}
                  className="text-xs px-3 py-1 rounded-full border border-sage/40 bg-white focus:outline-leaf text-ink w-36"
                />
                {newInterest.trim() && (
                  <button
                    onClick={() => addTag('interests', newInterest)}
                    className="p-1 rounded-full bg-mint text-forest hover:bg-sage/40"
                  >
                    <Plus size={12} />
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* RESEARCH DOMAINS */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-ink uppercase tracking-wider flex items-center gap-1.5">
              <Layers size={14} className="text-leaf" /> Research Domains (Broad Fields)
            </label>
            <div className="flex flex-wrap items-center gap-2">
              {draftProfile.research_domains.map((domain, idx) => (
                <span
                  key={idx}
                  className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-800 border border-blue-200"
                >
                  {domain}
                  <button
                    type="button"
                    onClick={() => removeTag('domains', idx)}
                    className="hover:text-rose-600 transition"
                  >
                    <X size={12} />
                  </button>
                </span>
              ))}
              <div className="inline-flex items-center gap-1">
                <input
                  type="text"
                  placeholder="+ Add domain"
                  value={newDomain}
                  onChange={(e) => setNewDomain(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      addTag('domains', newDomain);
                    }
                  }}
                  className="text-xs px-3 py-1 rounded-full border border-sage/40 bg-white focus:outline-leaf text-ink w-36"
                />
                {newDomain.trim() && (
                  <button
                    onClick={() => addTag('domains', newDomain)}
                    className="p-1 rounded-full bg-blue-100 text-blue-800 hover:bg-blue-200"
                  >
                    <Plus size={12} />
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* METHODS & TOOLS */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-ink uppercase tracking-wider flex items-center gap-1.5">
              <Brain size={14} className="text-leaf" /> Methodologies, Algorithms & Tools
            </label>
            <div className="flex flex-wrap items-center gap-2">
              {draftProfile.methods.map((method, idx) => (
                <span
                  key={idx}
                  className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-purple-50 text-purple-800 border border-purple-200"
                >
                  {method}
                  <button
                    type="button"
                    onClick={() => removeTag('methods', idx)}
                    className="hover:text-rose-600 transition"
                  >
                    <X size={12} />
                  </button>
                </span>
              ))}
              <div className="inline-flex items-center gap-1">
                <input
                  type="text"
                  placeholder="+ Add method"
                  value={newMethod}
                  onChange={(e) => setNewMethod(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      addTag('methods', newMethod);
                    }
                  }}
                  className="text-xs px-3 py-1 rounded-full border border-sage/40 bg-white focus:outline-leaf text-ink w-36"
                />
                {newMethod.trim() && (
                  <button
                    onClick={() => addTag('methods', newMethod)}
                    className="p-1 rounded-full bg-purple-100 text-purple-800 hover:bg-purple-200"
                  >
                    <Plus size={12} />
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* EMBEDDING TEXT / SUMMARY */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-ink uppercase tracking-wider">
              Research Narrative (Used to generate 384-dim semantic embedding)
            </label>
            <textarea
              rows={4}
              value={draftProfile.embedding_text}
              onChange={(e) =>
                setDraftProfile({ ...draftProfile, embedding_text: e.target.value })
              }
              className="w-full text-xs sm:text-sm p-3 border border-sage/30 rounded-xl bg-mist/30 focus:outline-leaf text-ink"
            />
          </div>

          {/* LAYMAN SUMMARY FOR STUDENTS */}
          {draftLayman && (
            <div className="p-4 rounded-xl border border-sage/30 bg-mint/15 space-y-3">
              <div className="flex items-center gap-2">
                <Lightbulb size={16} className="text-forest" />
                <h4 className="text-sm font-bold text-ink">Undergraduate Layman Summary</h4>
              </div>

              <div className="space-y-2 text-xs">
                <div>
                  <span className="font-semibold text-forest">TL;DR:</span>
                  <input
                    type="text"
                    value={draftLayman.tldr}
                    onChange={(e) =>
                      setDraftLayman({ ...draftLayman, tldr: e.target.value })
                    }
                    className="mt-0.5 w-full p-2 rounded-lg border border-sage/30 bg-white focus:outline-leaf"
                  />
                </div>

                <div>
                  <span className="font-semibold text-forest">Why It Matters:</span>
                  <textarea
                    rows={2}
                    value={draftLayman.why_it_matters}
                    onChange={(e) =>
                      setDraftLayman({ ...draftLayman, why_it_matters: e.target.value })
                    }
                    className="mt-0.5 w-full p-2 rounded-lg border border-sage/30 bg-white focus:outline-leaf"
                  />
                </div>

                {draftLayman.analogy && (
                  <div>
                    <span className="font-semibold text-forest">Analogy:</span>
                    <p className="italic text-ink/80 bg-white/70 p-2 rounded-lg border border-sage/20 mt-0.5">
                      "{draftLayman.analogy}"
                    </p>
                  </div>
                )}

                {draftLayman.glossary && draftLayman.glossary.length > 0 && (
                  <div>
                    <span className="font-semibold text-forest">Key Concepts Glossary:</span>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-1">
                      {draftLayman.glossary.map((item, i) => (
                        <div key={i} className="p-2 rounded-lg bg-white border border-sage/20">
                          <span className="font-bold text-forest">{item.term}:</span>{' '}
                          <span className="text-ink/75">{item.definition}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* PUBLICATIONS & CONTRIBUTIONS */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Publications */}
            <div className="space-y-2 border border-sage/20 p-3.5 rounded-xl bg-mist/20">
              <label className="text-xs font-bold text-ink uppercase tracking-wider flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <BookOpen size={14} className="text-leaf" /> Publications ({draftProfile.publications.length})
                </span>
              </label>
              <ul className="space-y-1.5 max-h-48 overflow-y-auto">
                {draftProfile.publications.map((pub, idx) => (
                  <li
                    key={idx}
                    className="flex items-start justify-between gap-2 text-xs bg-white p-2 rounded-lg border border-sage/20"
                  >
                    <span className="text-ink/85">{pub}</span>
                    <button
                      onClick={() => removeTag('pubs', idx)}
                      className="text-ink/40 hover:text-rose-600 shrink-0"
                    >
                      <X size={13} />
                    </button>
                  </li>
                ))}
              </ul>
              <div className="flex items-center gap-1 pt-1">
                <input
                  type="text"
                  placeholder="+ Add publication title"
                  value={newPub}
                  onChange={(e) => setNewPub(e.target.value)}
                  className="text-xs p-1.5 flex-1 rounded-lg border border-sage/30 bg-white focus:outline-leaf"
                />
                <button
                  onClick={() => addTag('pubs', newPub)}
                  className="px-2.5 py-1.5 rounded-lg bg-mint text-forest font-semibold text-xs"
                >
                  Add
                </button>
              </div>
            </div>

            {/* Contributions */}
            <div className="space-y-2 border border-sage/20 p-3.5 rounded-xl bg-mist/20">
              <label className="text-xs font-bold text-ink uppercase tracking-wider flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <Award size={14} className="text-leaf" /> Research Contributions ({draftProfile.contributions.length})
                </span>
              </label>
              <ul className="space-y-1.5 max-h-48 overflow-y-auto">
                {draftProfile.contributions.map((c, idx) => (
                  <li
                    key={idx}
                    className="flex items-start justify-between gap-2 text-xs bg-white p-2 rounded-lg border border-sage/20"
                  >
                    <span className="text-ink/85">{c}</span>
                    <button
                      onClick={() => removeTag('contribs', idx)}
                      className="text-ink/40 hover:text-rose-600 shrink-0"
                    >
                      <X size={13} />
                    </button>
                  </li>
                ))}
              </ul>
              <div className="flex items-center gap-1 pt-1">
                <input
                  type="text"
                  placeholder="+ Add key contribution"
                  value={newContrib}
                  onChange={(e) => setNewContrib(e.target.value)}
                  className="text-xs p-1.5 flex-1 rounded-lg border border-sage/30 bg-white focus:outline-leaf"
                />
                <button
                  onClick={() => addTag('contribs', newContrib)}
                  className="px-2.5 py-1.5 rounded-lg bg-mint text-forest font-semibold text-xs"
                >
                  Add
                </button>
              </div>
            </div>
          </div>

          {/* STATED PREFERENCES */}
          {draftRequirements && (
            <div className="p-4 rounded-xl border border-sage/20 bg-mist/20 space-y-3">
              <h4 className="text-xs font-bold text-ink uppercase tracking-wider">
                Stated Student Collaborator Preferences
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div>
                  <span className="font-semibold text-ink/70">Preferred Technical Skills:</span>
                  <div className="flex flex-wrap gap-1.5 mt-1">
                    {draftRequirements.preferred_skills.map((skill, idx) => (
                      <span
                        key={idx}
                        className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-[#C2E8FF]/40 text-[#042558] border border-[#7C9DC6] text-xs font-semibold"
                      >
                        {skill}
                        <button onClick={() => removeTag('skills', idx)}>
                          <X size={11} />
                        </button>
                      </span>
                    ))}
                  </div>
                </div>

                <div>
                  <span className="font-semibold text-ink/70">Preferred Academic Years:</span>
                  <div className="flex flex-wrap gap-1.5 mt-1">
                    {draftRequirements.preferred_years.map((year, idx) => (
                      <span
                        key={idx}
                        className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-800 border border-blue-200 text-xs font-semibold"
                      >
                        {year}
                        <button onClick={() => removeTag('years', idx)}>
                          <X size={11} />
                        </button>
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ACTION BUTTONS */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-sage/20">
            <button
              onClick={() => {
                setDraftProfile(null);
                setDraftId(null);
              }}
              className="btn-secondary px-4 py-2 text-xs font-semibold"
            >
              Cancel Draft
            </button>
            <button
              onClick={handleConfirmProfile}
              disabled={isConfirming}
              className="btn-primary bg-forest hover:bg-night-green text-white px-6 py-2.5 rounded-xl text-sm font-semibold flex items-center gap-2 shadow-xs"
            >
              {isConfirming ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  <span>Confirming Profile...</span>
                </>
              ) : (
                <>
                  <Check size={16} />
                  <span>Confirm Research Profile</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* 3. CONFIRMED RESEARCH PROFILE & AI STUDENT COLLABORATORS */}
      {confirmedStatus?.is_confirmed && confirmedStatus.research_profile && (
        <div className="space-y-6">
          {/* Confirmed Profile Overview Card */}
          <div className="solid-card p-6 bg-gradient-to-br from-mint/20 via-white to-mint/10 border-leaf/30 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className="h-10 w-10 rounded-xl bg-forest text-white flex items-center justify-center shadow-xs">
                  <Brain size={22} />
                </div>
                <div>
                  <h3 className="text-base font-bold text-ink">Active Confirmed Research Profile</h3>
                  <p className="text-xs text-ink/60">
                    Confirmed on {confirmedStatus.confirmed_at ? new Date(confirmedStatus.confirmed_at).toLocaleDateString() : 'Active'} • 384-dimensional embedding generated
                  </p>
                </div>
              </div>
              <span className="px-3 py-1 rounded-full text-xs font-bold bg-[#C2E8FF] text-[#042558] border border-[#7C9DC6] self-start sm:self-auto flex items-center gap-1.5">
                <CheckCircle2 size={14} /> Matching Enabled
              </span>
            </div>

            <p className="text-xs sm:text-sm text-ink/80 leading-relaxed bg-white/70 p-3.5 rounded-xl border border-sage/20">
              {confirmedStatus.research_profile.embedding_text}
            </p>

            <div className="flex flex-wrap gap-2 pt-1">
              {confirmedStatus.research_profile.research_interests.map((interest, i) => (
                <span
                  key={i}
                  className="px-2.5 py-1 rounded-full text-xs font-semibold bg-white text-forest border border-sage/30 shadow-2xs"
                >
                  #{interest}
                </span>
              ))}
              {confirmedStatus.research_profile.methods.slice(0, 5).map((method, i) => (
                <span
                  key={i}
                  className="px-2.5 py-1 rounded-full text-xs font-medium bg-purple-50 text-purple-800 border border-purple-200"
                >
                  {method}
                </span>
              ))}
            </div>
          </div>

          {/* AI MATCHED STUDENT COLLABORATORS */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-ink flex items-center gap-2">
                  <Users size={18} className="text-leaf" />
                  AI-Recommended Student Collaborators ({matches.length})
                </h3>
                <p className="text-xs text-ink/70">
                  Ranked by research similarity (55%), skill match (20%), and project experience (15%) with explainable alignment.
                </p>
              </div>

              <Link
                href="/students"
                className="text-xs font-semibold text-forest hover:text-mid-green flex items-center gap-1"
              >
                <span>Browse Student Directory</span>
                <ChevronRight size={14} />
              </Link>
            </div>

            {matches.length === 0 ? (
              <div className="solid-card p-8 text-center text-sm text-ink/70">
                <Users size={28} className="mx-auto text-sage/60 mb-2" />
                No student candidates matched yet. Student candidates will appear as students register or build their research profiles.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {matches.map((student) => (
                  <div
                    key={student.student_id}
                    className="solid-card p-5 flex flex-col justify-between hover:shadow-md transition space-y-4"
                  >
                    <div>
                      {/* Top Header */}
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div>
                          <h4 className="font-bold text-ink text-sm sm:text-base">
                            {student.student_name}
                          </h4>
                          <p className="text-xs text-ink/60">
                            {student.department} • {student.academic_year}
                          </p>
                        </div>

                        {/* Match Score Badge */}
                        <div className="shrink-0 flex flex-col items-end">
                          <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-mint text-forest border border-sage/30 shadow-2xs">
                            {Math.round(student.match_score)}% Match
                          </span>
                        </div>
                      </div>

                      {/* Factor Breakdown */}
                      <div className="grid grid-cols-3 gap-1.5 py-2 my-2 bg-mist/60 rounded-lg p-2 text-center text-[10px]">
                        <div>
                          <p className="text-ink/50 uppercase font-semibold">Research</p>
                          <p className="font-bold text-forest">{Math.round(student.research_similarity_score)}%</p>
                        </div>
                        <div>
                          <p className="text-ink/50 uppercase font-semibold">Skills</p>
                          <p className="font-bold text-forest">
                            {student.skill_match_score != null ? `${Math.round(student.skill_match_score)}%` : 'N/A'}
                          </p>
                        </div>
                        <div>
                          <p className="text-ink/50 uppercase font-semibold">Experience</p>
                          <p className="font-bold text-forest">
                            {student.experience_match_score != null ? `${Math.round(student.experience_match_score)}%` : 'N/A'}
                          </p>
                        </div>
                      </div>

                      {/* Why Matched Explanation */}
                      <div className="text-xs text-ink/80 bg-white p-2.5 rounded-lg border border-sage/20 mb-3">
                        <span className="font-semibold text-leaf block mb-0.5">Why this student matches:</span>
                        <p className="text-[11px] leading-relaxed">{student.why_matched}</p>
                      </div>

                      {/* Relevant Skills */}
                      {student.relevant_technical_skills && student.relevant_technical_skills.length > 0 && (
                        <div className="flex flex-wrap gap-1 mb-2">
                          {student.relevant_technical_skills.slice(0, 3).map((s, idx) => (
                            <span
                              key={idx}
                              className="px-2 py-0.5 rounded text-[10px] font-medium bg-sage/20 text-ink"
                            >
                              {s}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    <Link
                      href={`/students/${student.student_id}`}
                      className="btn-secondary w-full py-1.5 text-xs font-semibold flex items-center justify-center gap-1 hover:bg-mint/40"
                    >
                      <span>View Student Profile</span>
                      <ArrowRight size={13} />
                    </Link>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default AiResearchProfileSection;
