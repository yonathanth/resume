"use client";

import React, { useState } from "react";
import {
  ArrowLeft,
  Download,
  FileText,
  Sparkles,
  Plus,
  Trash2,
  CheckCircle2,
  Eye,
  X,
  Share2,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Zap,
  Sliders,
  ChevronDown,
  ChevronUp,
  LayoutTemplate,
} from "lucide-react";
import { CvData, WorkExperience, Education, TEMPLATE_OPTIONS, TemplateId } from "./types";
import {
  updateCvContent,
  finalizeCvDocument,
  renderCvDocument,
  downloadCvPdf,
  initializePayment,
  getPaymentStatus,
  ApiError,
} from "@/lib/api";
import { toCVContentPatch } from "@/lib/cv-mapper";
import { savePendingPayment, readPendingPayment, clearPendingPayment, saveLastPaymentRedirect } from "@/lib/payment-session";

interface CvEditorWorkspaceProps {
  initialData: CvData;
  onBack: () => void;
  onSave: (data: CvData) => void;
  // Set when this page was opened right after returning from a successful
  // Chapa checkout for this exact CV — automatically resumes the download
  // instead of making the user click "Download PDF" a second time.
  autoDownload?: boolean;
}

export function CvEditorWorkspace({
  initialData,
  onBack,
  onSave,
  autoDownload = false,
}: CvEditorWorkspaceProps) {
  const [cv, setCv] = useState<CvData>(initialData);
  const [isSaving, setIsSaving] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState<string | null>(null);
  const [activeSection, setActiveSection] = useState<
    "personal" | "summary" | "experience" | "education" | "skills"
  >("personal");
  const [zoomLevel, setZoomLevel] = useState<number>(100);
  const [mobilePreviewOpen, setMobilePreviewOpen] = useState<boolean>(false);
  const [downloadSuccess, setDownloadSuccess] = useState<string | null>(null);
  const [templateGalleryOpen, setTemplateGalleryOpen] = useState<boolean>(false);

  const currentTemplate =
    TEMPLATE_OPTIONS.find((t) => t.id === cv.templateStyle) ||
    TEMPLATE_OPTIONS[0];

  const isExecutive = cv.templateStyle === "executive";
  const isFinance = cv.templateStyle === "finance";
  const isTech = cv.templateStyle === "tech";
  const isSwiss = cv.templateStyle === "swiss";
  const isAi = cv.templateStyle === "ai";
  const isCreative = cv.templateStyle === "creative";
  const isSerif = isExecutive || isFinance;
  const isCentered = isExecutive || isFinance;

  // Experience handlers
  const handleUpdateExperience = (
    id: string,
    field: keyof WorkExperience,
    value: any
  ) => {
    setCv((prev) => ({
      ...prev,
      experiences: prev.experiences.map((exp) =>
        exp.id === id ? { ...exp, [field]: value } : exp
      ),
    }));
  };

  const handleAddExperience = () => {
    const newExp: WorkExperience = {
      id: `exp-${Date.now()}`,
      role: "Senior Software Engineer",
      company: "Company Name",
      location: "San Francisco, CA",
      startDate: "2021",
      endDate: "Present",
      isCurrent: true,
      bullets: [
        "Architected and deployed distributed services resulting in 30% performance boost.",
      ],
    };
    setCv((prev) => ({
      ...prev,
      experiences: [newExp, ...prev.experiences],
    }));
  };

  const handleRemoveExperience = (id: string) => {
    setCv((prev) => ({
      ...prev,
      experiences: prev.experiences.filter((exp) => exp.id !== id),
    }));
  };

  const handleAddBullet = (expId: string) => {
    setCv((prev) => ({
      ...prev,
      experiences: prev.experiences.map((exp) =>
        exp.id === expId
          ? {
              ...exp,
              bullets: [
                ...exp.bullets,
                "Accomplished [goal] measured by [metric] by implementing [action].",
              ],
            }
          : exp
      ),
    }));
  };

  const handleUpdateBullet = (
    expId: string,
    bulletIndex: number,
    value: string
  ) => {
    setCv((prev) => ({
      ...prev,
      experiences: prev.experiences.map((exp) =>
        exp.id === expId
          ? {
              ...exp,
              bullets: exp.bullets.map((b, idx) =>
                idx === bulletIndex ? value : b
              ),
            }
          : exp
      ),
    }));
  };

  const handleRemoveBullet = (expId: string, bulletIndex: number) => {
    setCv((prev) => ({
      ...prev,
      experiences: prev.experiences.map((exp) =>
        exp.id === expId
          ? {
              ...exp,
              bullets: exp.bullets.filter((_, idx) => idx !== bulletIndex),
            }
          : exp
      ),
    }));
  };

  // Education handlers
  const handleUpdateEducation = (
    id: string,
    field: keyof Education,
    value: any
  ) => {
    setCv((prev) => ({
      ...prev,
      education: prev.education.map((edu) =>
        edu.id === id ? { ...edu, [field]: value } : edu
      ),
    }));
  };

  const handleAddEducation = () => {
    const newEdu: Education = {
      id: `edu-${Date.now()}`,
      degree: "B.S. in Computer Science",
      school: "University Name",
      location: "City, State",
      gradYear: "2020",
    };
    setCv((prev) => ({
      ...prev,
      education: [...prev.education, newEdu],
    }));
  };

  const handleRemoveEducation = (id: string) => {
    setCv((prev) => ({
      ...prev,
      education: prev.education.filter((edu) => edu.id !== id),
    }));
  };

  // Skills handlers
  const handleAddSkill = (skillText: string) => {
    if (!skillText.trim()) return;
    if (cv.skills.includes(skillText.trim())) return;
    setCv((prev) => ({
      ...prev,
      skills: [...prev.skills, skillText.trim()],
    }));
  };

  const handleRemoveSkill = (skillToRemove: string) => {
    setCv((prev) => ({
      ...prev,
      skills: prev.skills.filter((s) => s !== skillToRemove),
    }));
  };

  // Ensures a SUCCESS payment exists for this specific CV before it can be
  // downloaded. Resumes a payment started earlier in this tab (tracked via
  // sessionStorage, not the redirect's query string) by re-verifying it
  // server-side; otherwise starts a new one and sends the browser to Chapa's
  // checkout. Returns "PAID" only when the backend has actually confirmed
  // SUCCESS — never inferred from the frontend alone.
  const ensurePaidForDownload = async (cvId: string): Promise<"PAID" | "REDIRECTING"> => {
    const pendingPaymentId = readPendingPayment(cvId);
    if (pendingPaymentId) {
      const status = await getPaymentStatus(pendingPaymentId);
      if (status.status === "SUCCESS") {
        clearPendingPayment(cvId);
        return "PAID";
      }
      // Stale, failed, or still pending — drop the marker and re-initialize below.
      clearPendingPayment(cvId);
    }

    const init = await initializePayment({ productType: "CV_DOWNLOAD", resourceId: cvId });
    if (init.alreadyPaid) {
      return "PAID";
    }

    savePendingPayment(cvId, init.paymentId);
    saveLastPaymentRedirect(cvId);
    setDownloadSuccess("Redirecting you to secure payment...");
    window.location.href = init.checkoutUrl!;
    return "REDIRECTING";
  };

  // Real PDF pipeline: save the current edits (PATCH), finalize the document
  // (validates it's complete), render it server-side (Puppeteer), require
  // payment for this specific CV, then stream the actual PDF back and save
  // it. DOCX has no backend renderer, and an unbacked ("cv-new") CV has
  // nothing to render (or pay for), so both keep the original simulated
  // confirmation banner.
  const handleDownload = async (type: "pdf" | "docx") => {
    const isBackedByDocument = Boolean(cv.id) && cv.id !== "cv-new";

    if (type !== "pdf" || !isBackedByDocument) {
      setDownloadSuccess(`Your ATS-compliant ${type.toUpperCase()} was generated successfully!`);
      setTimeout(() => setDownloadSuccess(null), 3500);
      return;
    }

    setDownloadError(null);
    setIsDownloading(true);
    try {
      await updateCvContent(cv.id, {
        content: toCVContentPatch(cv),
        jobDescription: cv.jobDescription ?? null,
        title: cv.title,
      });
      await finalizeCvDocument(cv.id);
      await renderCvDocument(cv.id);

      const paymentOutcome = await ensurePaidForDownload(cv.id);
      if (paymentOutcome === "REDIRECTING") {
        return;
      }

      const blob = await downloadCvPdf(cv.id);

      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${cv.title || "resume"}.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);

      setDownloadSuccess("Your ATS-compliant PDF was generated successfully!");
      setTimeout(() => setDownloadSuccess(null), 3500);
    } catch (err) {
      // The backend rejects a direct download attempt with no successful
      // payment (PAYMENT_REQUIRED) even if this flow is somehow bypassed —
      // send the user through payment instead of just showing a dead end.
      if (err instanceof ApiError && err.code === "PAYMENT_REQUIRED") {
        try {
          await ensurePaidForDownload(cv.id);
        } catch {
          setDownloadError("Could not start the payment. Please try again.");
        }
        return;
      }
      setDownloadError(
        err instanceof ApiError ? err.message : "Could not generate the PDF. Please try again."
      );
    } finally {
      setIsDownloading(false);
    }
  };

  // Coming back from a completed Chapa checkout for this CV — finish the
  // download automatically instead of requiring a second manual click.
  React.useEffect(() => {
    if (autoDownload) {
      handleDownload("pdf");
    }
    // Only ever run once, right after mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // "Done" — persists edits to the backend CV document (when this CV is
  // backed by one and something actually changed) before closing the editor.
  const handleDone = async () => {
    const isBackedByDocument = Boolean(cv.id) && cv.id !== "cv-new";
    const hasChanges = JSON.stringify(cv) !== JSON.stringify(initialData);

    if (isBackedByDocument && hasChanges) {
      setIsSaving(true);
      try {
        await updateCvContent(cv.id, {
          content: toCVContentPatch(cv),
          jobDescription: cv.jobDescription ?? null,
          title: cv.title,
        });
      } catch (err) {
        console.error("Failed to save CV changes", err);
      } finally {
        setIsSaving(false);
      }
    }

    onSave(cv);
  };

  return (
    <div className="h-screen w-full flex flex-col bg-[#f5f5f7] text-neutral-900 font-sans overflow-hidden">
      {/* ================= TOP NAVIGATION BAR ================= */}
      <header className="h-16 bg-white border-b border-neutral-200/90 px-4 sm:px-6 flex items-center justify-between z-30 shrink-0 select-none">
        <div className="flex items-center gap-3 min-w-0">
          <button
            type="button"
            onClick={onBack}
            className="p-2 rounded-xl text-neutral-500 hover:text-neutral-950 hover:bg-neutral-100 transition-colors cursor-pointer"
            title="Return to Dashboard"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>

          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={cv.title}
                onChange={(e) =>
                  setCv((prev) => ({ ...prev, title: e.target.value }))
                }
                className="font-bold text-sm sm:text-base text-neutral-950 bg-transparent border-none focus:outline-none focus:ring-1 focus:ring-neutral-900 rounded px-1 -ml-1 truncate max-w-[200px] sm:max-w-[320px]"
              />
              <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                <CheckCircle2 className="w-3 h-3" />
                <span>Saved</span>
              </span>
            </div>
            <p className="text-[11px] text-neutral-400 truncate">
              {cv.targetRole} • Real-time ATS Preview
            </p>
          </div>
        </div>

        {/* Top Actions */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Change Template Button (Replaces static tabs with interactive browser modal) */}
          <button
            type="button"
            onClick={() => setTemplateGalleryOpen(true)}
            className="inline-flex items-center gap-2 px-3.5 py-1.5 sm:py-2 rounded-xl border border-neutral-200 bg-white hover:bg-neutral-50 text-xs font-semibold text-neutral-800 transition-all cursor-pointer shadow-2xs group"
            title="Browse and select CV template"
          >
            <LayoutTemplate className="w-3.5 h-3.5 text-neutral-500 group-hover:text-neutral-950 transition-colors" />
            <span className="hidden sm:inline text-neutral-500">Template:</span>
            <span className="font-bold text-neutral-950">
              {currentTemplate.name}
            </span>
            <ChevronDown className="w-3 h-3 text-neutral-400 group-hover:text-neutral-700 transition-colors" />
          </button>

          {/* Download PDF */}
          <button
            type="button"
            disabled={isDownloading}
            onClick={() => handleDownload("pdf")}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-neutral-200 bg-white hover:bg-neutral-50 text-neutral-800 text-xs font-semibold transition-all cursor-pointer shadow-2xs disabled:opacity-60 disabled:cursor-not-allowed"
          >
            <Download className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">{isDownloading ? "Generating..." : "Download PDF"}</span>
          </button>

          {/* Done / Save Action */}
          <button
            type="button"
            disabled={isSaving}
            onClick={handleDone}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-neutral-950 hover:bg-neutral-800 text-white text-xs font-semibold transition-all cursor-pointer shadow-xs disabled:opacity-60 disabled:cursor-not-allowed"
          >
            <span>{isSaving ? "Saving..." : "Done"}</span>
          </button>
        </div>
      </header>

      {/* Download Alert Banner */}
      {downloadSuccess && (
        <div className="bg-emerald-600 text-white text-xs font-semibold px-4 py-2 text-center flex items-center justify-center gap-2 animate-in fade-in">
          <CheckCircle2 className="w-4 h-4" />
          <span>{downloadSuccess}</span>
        </div>
      )}
      {downloadError && (
        <div className="bg-red-600 text-white text-xs font-semibold px-4 py-2 text-center flex items-center justify-center gap-2 animate-in fade-in">
          <span>{downloadError}</span>
        </div>
      )}

      {/* ================= MAIN SPLIT WORKSPACE ================= */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* LEFT COLUMN: THE EDITABLE GUIDED FORM */}
        <div className="w-full lg:w-[48%] h-full overflow-y-auto bg-white border-r border-neutral-200/90 p-6 sm:p-8 lg:p-10 space-y-8">
          {/* Section Navigation Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-2 scrollbar-none border-b border-neutral-100">
            {[
              { id: "personal", label: "Contact Info" },
              { id: "summary", label: "Summary" },
              { id: "experience", label: "Experience" },
              { id: "education", label: "Education" },
              { id: "skills", label: "Skills" },
            ].map((sec) => (
              <button
                key={sec.id}
                type="button"
                onClick={() => setActiveSection(sec.id as any)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                  activeSection === sec.id
                    ? "bg-neutral-950 text-white shadow-2xs"
                    : "text-neutral-500 hover:text-neutral-950 hover:bg-neutral-100"
                }`}
              >
                {sec.label}
              </button>
            ))}
          </div>

          {/* SECTION 1: PERSONAL INFO */}
          {activeSection === "personal" && (
            <div className="space-y-4 animate-in fade-in duration-150">
              <div className="flex items-center justify-between pb-2 border-b border-neutral-100">
                <h3 className="text-sm font-bold text-neutral-950">
                  Contact &amp; Header Details
                </h3>
                <span className="text-[11px] text-neutral-400">
                  Directly parsed by ATS
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-neutral-700 mb-1">
                    Full Name
                  </label>
                  <input
                    type="text"
                    value={cv.personalInfo.fullName}
                    onChange={(e) =>
                      setCv((prev) => ({
                        ...prev,
                        personalInfo: {
                          ...prev.personalInfo,
                          fullName: e.target.value,
                        },
                      }))
                    }
                    className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-200 text-xs sm:text-sm text-neutral-900 focus:outline-none focus:ring-2 focus:ring-neutral-900/10 focus:border-neutral-900"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-neutral-700 mb-1">
                    Professional Headline
                  </label>
                  <input
                    type="text"
                    value={cv.personalInfo.headline}
                    onChange={(e) =>
                      setCv((prev) => ({
                        ...prev,
                        personalInfo: {
                          ...prev.personalInfo,
                          headline: e.target.value,
                        },
                      }))
                    }
                    className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-200 text-xs sm:text-sm text-neutral-900 focus:outline-none focus:ring-2 focus:ring-neutral-900/10 focus:border-neutral-900"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-neutral-700 mb-1">
                    Email Address
                  </label>
                  <input
                    type="email"
                    value={cv.personalInfo.email}
                    onChange={(e) =>
                      setCv((prev) => ({
                        ...prev,
                        personalInfo: {
                          ...prev.personalInfo,
                          email: e.target.value,
                        },
                      }))
                    }
                    className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-200 text-xs sm:text-sm text-neutral-900 focus:outline-none focus:ring-2 focus:ring-neutral-900/10 focus:border-neutral-900"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-neutral-700 mb-1">
                    Phone Number
                  </label>
                  <input
                    type="text"
                    value={cv.personalInfo.phone}
                    onChange={(e) =>
                      setCv((prev) => ({
                        ...prev,
                        personalInfo: {
                          ...prev.personalInfo,
                          phone: e.target.value,
                        },
                      }))
                    }
                    className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-200 text-xs sm:text-sm text-neutral-900 focus:outline-none focus:ring-2 focus:ring-neutral-900/10 focus:border-neutral-900"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-neutral-700 mb-1">
                    Location (City, State / Remote)
                  </label>
                  <input
                    type="text"
                    value={cv.personalInfo.location}
                    onChange={(e) =>
                      setCv((prev) => ({
                        ...prev,
                        personalInfo: {
                          ...prev.personalInfo,
                          location: e.target.value,
                        },
                      }))
                    }
                    className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-200 text-xs sm:text-sm text-neutral-900 focus:outline-none focus:ring-2 focus:ring-neutral-900/10 focus:border-neutral-900"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-neutral-700 mb-1">
                    LinkedIn / Portfolio URL
                  </label>
                  <input
                    type="text"
                    value={cv.personalInfo.linkedin}
                    onChange={(e) =>
                      setCv((prev) => ({
                        ...prev,
                        personalInfo: {
                          ...prev.personalInfo,
                          linkedin: e.target.value,
                        },
                      }))
                    }
                    className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-200 text-xs sm:text-sm text-neutral-900 focus:outline-none focus:ring-2 focus:ring-neutral-900/10 focus:border-neutral-900"
                  />
                </div>
              </div>
            </div>
          )}

          {/* SECTION 2: SUMMARY */}
          {activeSection === "summary" && (
            <div className="space-y-4 animate-in fade-in duration-150">
              <div className="flex items-center justify-between pb-2 border-b border-neutral-100">
                <h3 className="text-sm font-bold text-neutral-950">
                  Professional Executive Summary
                </h3>
                <button
                  type="button"
                  onClick={() =>
                    setCv((prev) => ({
                      ...prev,
                      summary:
                        "Results-driven engineering leader with 7+ years of experience spearheading distributed systems and cloud platforms. Proven track record reducing infrastructure latency by 44% and driving $320K/yr in AWS efficiency gains across high-traffic fintech environments.",
                    }))
                  }
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-violet-700 hover:text-violet-900 cursor-pointer"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>AI Polish</span>
                </button>
              </div>

              <div>
                <textarea
                  rows={4}
                  value={cv.summary}
                  onChange={(e) =>
                    setCv((prev) => ({ ...prev, summary: e.target.value }))
                  }
                  className="w-full p-3.5 rounded-xl border border-neutral-200 text-xs sm:text-sm text-neutral-900 leading-relaxed focus:outline-none focus:ring-2 focus:ring-neutral-900/10 focus:border-neutral-900"
                />
                <p className="text-[11px] text-neutral-400 mt-1">
                  Keep it between 2-4 sentences highlighting career longevity, domain mastery, and major metrics.
                </p>
              </div>
            </div>
          )}

          {/* SECTION 3: WORK EXPERIENCE */}
          {activeSection === "experience" && (
            <div className="space-y-6 animate-in fade-in duration-150">
              <div className="flex items-center justify-between pb-2 border-b border-neutral-100">
                <div>
                  <h3 className="text-sm font-bold text-neutral-950">
                    Work Experience
                  </h3>
                  <p className="text-xs text-neutral-500">
                    Quantify impact with Google&apos;s XYZ formula
                  </p>
                </div>

                <button
                  type="button"
                  onClick={handleAddExperience}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-neutral-950 text-white text-xs font-semibold hover:bg-neutral-800 transition-colors cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Role</span>
                </button>
              </div>

              <div className="space-y-6">
                {cv.experiences.map((exp, expIdx) => (
                  <div
                    key={exp.id}
                    className="p-5 rounded-2xl bg-neutral-50/80 border border-neutral-200/90 space-y-4"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-neutral-950">
                        Position #{expIdx + 1}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleRemoveExperience(exp.id)}
                        className="p-1 text-neutral-400 hover:text-rose-600 transition-colors cursor-pointer"
                        title="Remove role"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[11px] font-semibold text-neutral-700 mb-1">
                          Role Title
                        </label>
                        <input
                          type="text"
                          value={exp.role}
                          onChange={(e) =>
                            handleUpdateExperience(exp.id, "role", e.target.value)
                          }
                          className="w-full px-3 py-2 rounded-xl bg-white border border-neutral-200 text-xs text-neutral-900"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-semibold text-neutral-700 mb-1">
                          Company Name
                        </label>
                        <input
                          type="text"
                          value={exp.company}
                          onChange={(e) =>
                            handleUpdateExperience(
                              exp.id,
                              "company",
                              e.target.value
                            )
                          }
                          className="w-full px-3 py-2 rounded-xl bg-white border border-neutral-200 text-xs text-neutral-900"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-semibold text-neutral-700 mb-1">
                          Start Year / Date
                        </label>
                        <input
                          type="text"
                          value={exp.startDate}
                          onChange={(e) =>
                            handleUpdateExperience(
                              exp.id,
                              "startDate",
                              e.target.value
                            )
                          }
                          className="w-full px-3 py-2 rounded-xl bg-white border border-neutral-200 text-xs text-neutral-900"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-semibold text-neutral-700 mb-1">
                          End Year / Date
                        </label>
                        <input
                          type="text"
                          value={exp.endDate}
                          onChange={(e) =>
                            handleUpdateExperience(
                              exp.id,
                              "endDate",
                              e.target.value
                            )
                          }
                          className="w-full px-3 py-2 rounded-xl bg-white border border-neutral-200 text-xs text-neutral-900"
                        />
                      </div>
                    </div>

                    {/* Bullet Points */}
                    <div className="space-y-2 pt-2 border-t border-neutral-200/60">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold text-neutral-700">
                          Accomplishment Bullets
                        </span>
                        <button
                          type="button"
                          onClick={() => handleAddBullet(exp.id)}
                          className="text-[11px] font-semibold text-neutral-900 hover:underline flex items-center gap-1 cursor-pointer"
                        >
                          <Plus className="w-3 h-3" />
                          <span>Add Bullet</span>
                        </button>
                      </div>

                      {exp.bullets.map((bullet, bIdx) => (
                        <div key={bIdx} className="flex items-start gap-2">
                          <span className="text-neutral-400 mt-2 text-xs">•</span>
                          <textarea
                            rows={2}
                            value={bullet}
                            onChange={(e) =>
                              handleUpdateBullet(exp.id, bIdx, e.target.value)
                            }
                            className="flex-1 p-2.5 rounded-xl bg-white border border-neutral-200 text-xs text-neutral-900 focus:outline-none focus:ring-1 focus:ring-neutral-900"
                          />
                          <button
                            type="button"
                            onClick={() => handleRemoveBullet(exp.id, bIdx)}
                            className="p-1.5 text-neutral-400 hover:text-rose-600 transition-colors mt-1"
                            title="Remove bullet"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* SECTION 4: EDUCATION */}
          {activeSection === "education" && (
            <div className="space-y-4 animate-in fade-in duration-150">
              <div className="flex items-center justify-between pb-2 border-b border-neutral-100">
                <h3 className="text-sm font-bold text-neutral-950">
                  Education &amp; Credentials
                </h3>
                <button
                  type="button"
                  onClick={handleAddEducation}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-neutral-950 text-white text-xs font-semibold hover:bg-neutral-800 transition-colors cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Degree</span>
                </button>
              </div>

              <div className="space-y-4">
                {cv.education.map((edu) => (
                  <div
                    key={edu.id}
                    className="p-4 rounded-2xl bg-neutral-50/80 border border-neutral-200/90 space-y-3"
                  >
                    <div className="flex items-center justify-between">
                      <input
                        type="text"
                        value={edu.degree}
                        onChange={(e) =>
                          handleUpdateEducation(edu.id, "degree", e.target.value)
                        }
                        placeholder="Degree name"
                        className="font-bold text-xs text-neutral-950 bg-transparent border-none p-0 focus:outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => handleRemoveEducation(edu.id)}
                        className="p-1 text-neutral-400 hover:text-rose-600 cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[10.5px] font-semibold text-neutral-600 mb-0.5">
                          School / University
                        </label>
                        <input
                          type="text"
                          value={edu.school}
                          onChange={(e) =>
                            handleUpdateEducation(edu.id, "school", e.target.value)
                          }
                          className="w-full px-3 py-1.5 rounded-xl bg-white border border-neutral-200 text-xs text-neutral-900"
                        />
                      </div>

                      <div>
                        <label className="block text-[10.5px] font-semibold text-neutral-600 mb-0.5">
                          Graduation Year
                        </label>
                        <input
                          type="text"
                          value={edu.gradYear}
                          onChange={(e) =>
                            handleUpdateEducation(
                              edu.id,
                              "gradYear",
                              e.target.value
                            )
                          }
                          className="w-full px-3 py-1.5 rounded-xl bg-white border border-neutral-200 text-xs text-neutral-900"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* SECTION 5: SKILLS */}
          {activeSection === "skills" && (
            <div className="space-y-4 animate-in fade-in duration-150">
              <div className="flex items-center justify-between pb-2 border-b border-neutral-100">
                <h3 className="text-sm font-bold text-neutral-950">
                  ATS Keywords &amp; Core Competencies
                </h3>
                <span className="text-[11px] text-neutral-400">
                  {cv.skills.length} keywords matched
                </span>
              </div>

              {/* Skills Tags */}
              <div className="flex flex-wrap gap-2">
                {cv.skills.map((skill) => (
                  <span
                    key={skill}
                    className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-neutral-100 text-neutral-800 border border-neutral-200"
                  >
                    <span>{skill}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveSkill(skill)}
                      className="text-neutral-400 hover:text-neutral-900"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>

              {/* Add Skill Input */}
              <div className="pt-2">
                <input
                  type="text"
                  placeholder="Type a skill and press Enter (e.g. GraphQL, PostgreSQL)"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleAddSkill(e.currentTarget.value);
                      e.currentTarget.value = "";
                    }
                  }}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-200 text-xs text-neutral-900 focus:outline-none focus:ring-2 focus:ring-neutral-900/10 focus:border-neutral-900"
                />
              </div>
            </div>
          )}
        </div>

        {/* RIGHT COLUMN: LIVE ATS PAPER PREVIEW (Desktop Split Screen) */}
        <div className="hidden lg:flex flex-1 h-full bg-[#ebebed] p-6 lg:p-8 flex-col items-center justify-start overflow-y-auto">
          {/* Zoom and ATS compliance bar */}
          <div className="w-full max-w-[640px] flex items-center justify-between mb-4 select-none">
            <div className="flex items-center gap-2">
              <span className="px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 text-xs font-bold flex items-center gap-1.5 shadow-2xs">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>ATS Score: {cv.atsScore}% (Greenhouse &amp; Lever Ready)</span>
              </span>
            </div>

            <div className="flex items-center gap-1 bg-white border border-neutral-200/90 rounded-xl p-1 shadow-2xs">
              <button
                type="button"
                onClick={() => setZoomLevel((z) => Math.max(z - 10, 70))}
                className="p-1 rounded text-neutral-600 hover:bg-neutral-100 cursor-pointer"
                title="Zoom Out"
              >
                <ZoomOut className="w-3.5 h-3.5" />
              </button>
              <span className="text-[11px] font-bold text-neutral-700 px-1">
                {zoomLevel}%
              </span>
              <button
                type="button"
                onClick={() => setZoomLevel((z) => Math.min(z + 10, 130))}
                className="p-1 rounded text-neutral-600 hover:bg-neutral-100 cursor-pointer"
                title="Zoom In"
              >
                <ZoomIn className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Paper Document Representation */}
          {/* Paper Document Representation */}
          <div
            className={`w-full max-w-[640px]  bg-white rounded-lg shadow-xl p-10 sm:p-12 text-neutral-900 ${
              isSerif ? "font-serif" : "font-sans"
            }`}
            // `zoom` (not `transform: scale`) so the box's actual layout size
            // changes with it — an `overflow-y-auto` ancestor can only size
            // its scrollable area off real layout dimensions, and a scaled
            // transform doesn't reliably contribute to that when content is
            // taller than one page.
            style={{ zoom: zoomLevel / 100 } as React.CSSProperties}
          >
            <div className="space-y-6">
              {/* Document Header */}
              <div
                className={`${
                  isExecutive
                    ? "text-center border-b-2 border-neutral-900 pb-5"
                    : isFinance
                    ? "text-center border-b border-neutral-950 pb-4"
                    : isTech
                    ? "text-left border-l-4 border-neutral-950 pl-4 py-0.5"
                    : isSwiss
                    ? "text-left"
                    : isAi
                    ? "text-left border-b border-dashed border-neutral-300 pb-4"
                    : "text-left border-b border-neutral-900 pb-4"
                }`}
              >
                <div className={isCentered ? "flex flex-col items-center" : "flex items-center gap-2.5"}>
                  <h1
                    className={`${
                      isExecutive
                        ? "text-2xl sm:text-3xl font-serif font-bold tracking-wide uppercase text-neutral-950"
                        : isFinance
                        ? "text-2xl sm:text-3xl font-serif font-bold uppercase tracking-wider text-neutral-950"
                        : isTech
                        ? "text-2xl sm:text-3xl font-sans font-extrabold tracking-tight text-neutral-950"
                        : isSwiss
                        ? "text-3xl font-sans font-black tracking-tighter text-neutral-950"
                        : isAi
                        ? "text-2xl sm:text-3xl font-sans font-bold tracking-tight text-neutral-950"
                        : "text-3xl font-serif font-bold italic tracking-tight text-neutral-950"
                    }`}
                  >
                    {cv.personalInfo.fullName}
                  </h1>
                  {isAi && (
                    <span className="text-[9.5px] font-mono px-2 py-0.5 bg-neutral-100 rounded text-neutral-700 border border-neutral-200">
                      R&amp;D
                    </span>
                  )}
                </div>
                <p
                  className={`text-xs mt-1 ${
                    isExecutive
                      ? "font-serif italic text-neutral-600"
                      : isAi
                      ? "font-mono text-neutral-600"
                      : isSwiss
                      ? "font-bold uppercase tracking-widest text-neutral-400"
                      : isCreative
                      ? "font-sans uppercase tracking-wider text-neutral-600 font-semibold"
                      : "font-semibold text-neutral-600"
                  }`}
                >
                  {cv.personalInfo.headline}
                </p>
                <div
                  className={`text-[11px] text-neutral-500 mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 ${
                    isCentered ? "justify-center" : "justify-start"
                  } ${isSwiss ? "border-t border-neutral-200 pt-2.5 mt-3" : ""} ${
                    isAi ? "font-mono text-[10.5px]" : ""
                  }`}
                >
                  <span>{cv.personalInfo.email}</span>
                  <span>•</span>
                  <span>{cv.personalInfo.phone}</span>
                  <span>•</span>
                  <span>{cv.personalInfo.location}</span>
                  {cv.personalInfo.linkedin && (
                    <>
                      <span>•</span>
                      <span>{cv.personalInfo.linkedin}</span>
                    </>
                  )}
                </div>
              </div>

              {/* Summary Section */}
              {cv.summary && (
                <div>
                  <h2
                    className={`${
                      isExecutive
                        ? "font-serif uppercase tracking-widest text-xs font-bold text-neutral-900 border-b border-neutral-300 pb-1 mb-2.5 text-center"
                        : isFinance
                        ? "font-serif uppercase tracking-wider text-xs font-bold text-neutral-950 border-b border-neutral-950 pb-0.5 mb-2.5 text-left"
                        : isTech
                        ? "font-sans uppercase text-[11.5px] tracking-wider font-extrabold text-neutral-950 border-b-2 border-neutral-900 pb-1 mb-2.5"
                        : isSwiss
                        ? "font-sans uppercase text-[11px] tracking-widest font-black text-neutral-950 border-t-2 border-neutral-950 pt-1.5 mb-2"
                        : isAi
                        ? "font-mono uppercase text-xs tracking-wide font-bold text-neutral-900 border-b border-neutral-200 pb-1 mb-2.5"
                        : "font-serif text-xs uppercase tracking-widest font-bold text-neutral-950 border-b border-neutral-900 pb-1 mb-2.5"
                    }`}
                  >
                    {isAi ? "// SUMMARY" : "Professional Summary"}
                  </h2>
                  <p className="text-xs leading-relaxed text-neutral-700">
                    {cv.summary}
                  </p>
                </div>
              )}

              {/* Experience Section */}
              <div>
                <h2
                  className={`${
                    isExecutive
                      ? "font-serif uppercase tracking-widest text-xs font-bold text-neutral-900 border-b border-neutral-300 pb-1 mb-3 text-center"
                      : isFinance
                      ? "font-serif uppercase tracking-wider text-xs font-bold text-neutral-950 border-b border-neutral-950 pb-0.5 mb-2.5 text-left"
                      : isTech
                      ? "font-sans uppercase text-[11.5px] tracking-wider font-extrabold text-neutral-950 border-b-2 border-neutral-900 pb-1 mb-2.5"
                      : isSwiss
                      ? "font-sans uppercase text-[11px] tracking-widest font-black text-neutral-950 border-t-2 border-neutral-950 pt-1.5 mb-2"
                      : isAi
                      ? "font-mono uppercase text-xs tracking-wide font-bold text-neutral-900 border-b border-neutral-200 pb-1 mb-2.5"
                      : "font-serif text-xs uppercase tracking-widest font-bold text-neutral-950 border-b border-neutral-900 pb-1 mb-3"
                  }`}
                >
                  {isAi ? "// WORK EXPERIENCE" : "Work Experience"}
                </h2>
                <div className="space-y-4">
                  {cv.experiences.map((exp) => (
                    <div key={exp.id} className="space-y-1.5">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-bold text-neutral-950">
                          {exp.role}
                        </span>
                        <span className={`font-medium ${isAi ? "font-mono text-[11px] text-neutral-500" : "text-neutral-500"}`}>
                          {exp.startDate} &mdash; {exp.endDate}
                        </span>
                      </div>
                      <div className="text-[11.5px] text-neutral-600 font-medium flex items-center justify-between">
                        <span>{exp.company}</span>
                        <span>{exp.location}</span>
                      </div>
                      <ul className="list-disc list-outside pl-4 text-xs text-neutral-700 space-y-1 pt-1 leading-relaxed">
                        {exp.bullets.map((b, idx) => (
                          <li key={idx}>{b}</li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              </div>

              {/* Skills Section */}
              <div>
                <h2
                  className={`${
                    isExecutive
                      ? "font-serif uppercase tracking-widest text-xs font-bold text-neutral-900 border-b border-neutral-300 pb-1 mb-2.5 text-center"
                      : isFinance
                      ? "font-serif uppercase tracking-wider text-xs font-bold text-neutral-950 border-b border-neutral-950 pb-0.5 mb-2.5 text-left"
                      : isTech
                      ? "font-sans uppercase text-[11.5px] tracking-wider font-extrabold text-neutral-950 border-b-2 border-neutral-900 pb-1 mb-2.5"
                      : isSwiss
                      ? "font-sans uppercase text-[11px] tracking-widest font-black text-neutral-950 border-t-2 border-neutral-950 pt-1.5 mb-2"
                      : isAi
                      ? "font-mono uppercase text-xs tracking-wide font-bold text-neutral-900 border-b border-neutral-200 pb-1 mb-2.5"
                      : "font-serif text-xs uppercase tracking-widest font-bold text-neutral-950 border-b border-neutral-900 pb-1 mb-2.5"
                  }`}
                >
                  {isAi ? "// CORE SKILLS & STACK" : "Technical Expertise & Skills"}
                </h2>
                <p className={`text-xs leading-relaxed text-neutral-700 ${isAi ? "font-mono text-[11px]" : ""}`}>
                  {cv.skills.join(" • ")}
                </p>
              </div>

              {/* Education Section */}
              <div>
                <h2
                  className={`${
                    isExecutive
                      ? "font-serif uppercase tracking-widest text-xs font-bold text-neutral-900 border-b border-neutral-300 pb-1 mb-2.5 text-center"
                      : isFinance
                      ? "font-serif uppercase tracking-wider text-xs font-bold text-neutral-950 border-b border-neutral-950 pb-0.5 mb-2.5 text-left"
                      : isTech
                      ? "font-sans uppercase text-[11.5px] tracking-wider font-extrabold text-neutral-950 border-b-2 border-neutral-900 pb-1 mb-2.5"
                      : isSwiss
                      ? "font-sans uppercase text-[11px] tracking-widest font-black text-neutral-950 border-t-2 border-neutral-950 pt-1.5 mb-2"
                      : isAi
                      ? "font-mono uppercase text-xs tracking-wide font-bold text-neutral-900 border-b border-neutral-200 pb-1 mb-2.5"
                      : "font-serif text-xs uppercase tracking-widest font-bold text-neutral-950 border-b border-neutral-900 pb-1 mb-2.5"
                  }`}
                >
                  {isAi ? "// EDUCATION" : "Education & Credentials"}
                </h2>
                <div className="space-y-2">
                  {cv.education.map((edu) => (
                    <div
                      key={edu.id}
                      className="flex items-center justify-between text-xs"
                    >
                      <div>
                        <div className="font-bold text-neutral-950">
                          {edu.degree}
                        </div>
                        <div className="text-neutral-600 text-[11px]">
                          {edu.school}, {edu.location}
                        </div>
                      </div>
                      <span className={`text-neutral-500 ${isAi ? "font-mono text-[11px]" : ""}`}>{edu.gradYear}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Bottom ATS Signature Line */}
            <div className="mt-8 pt-8 border-t border-neutral-100 text-[10px] text-neutral-400 text-center flex items-center justify-center gap-1.5">
              <span>Prepared with Resumate ATS Machine-Readable Specification</span>
              <span>•</span>
              <span className="font-semibold text-neutral-600">{currentTemplate.name} ({currentTemplate.category})</span>
            </div>
          </div>
        </div>
      </div>

      {/* ================= MOBILE FLOATING PREVIEW BUTTON ================= */}
      {/* Explicitly requested: "for mobile screens lets have a floting button preview that should preview the cv whilst filling the form" */}
      <div className="lg:hidden fixed bottom-6 left-1/2 -translate-x-1/2 z-40 pointer-events-auto">
        <button
          type="button"
          onClick={() => setMobilePreviewOpen(true)}
          className="inline-flex items-center gap-2 px-5 py-3 rounded-full bg-neutral-950 text-white font-bold text-xs shadow-2xl shadow-neutral-950/40 hover:bg-neutral-800 transition-all active:scale-95 cursor-pointer border border-neutral-800"
        >
          <Eye className="w-4 h-4 text-amber-400" />
          <span>Preview CV</span>
          <span className="px-1.5 py-0.5 rounded-full bg-emerald-500 text-white text-[10px] font-bold">
            {cv.atsScore}% ATS
          </span>
        </button>
      </div>

      {/* ================= MOBILE FULLSCREEN PREVIEW MODAL ================= */}
      {mobilePreviewOpen && (
        <div className="lg:hidden fixed inset-0 z-50 bg-neutral-950/80 backdrop-blur-sm flex flex-col p-3 sm:p-6 overflow-hidden animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl flex-1 flex flex-col overflow-hidden shadow-2xl">
            {/* Modal Header */}
            <div className="p-4 border-b border-neutral-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-neutral-950">
                  Live ATS Document Preview
                </span>
                <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-bold text-[10px]">
                  {cv.atsScore}% Match
                </span>
              </div>
              <button
                type="button"
                onClick={() => setMobilePreviewOpen(false)}
                className="p-1.5 rounded-full text-neutral-400 hover:text-neutral-900 hover:bg-neutral-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Mobile Document Sheet Scroll View */}
            <div className="flex-1 overflow-y-auto p-5 sm:p-8 bg-neutral-100/70 text-neutral-900">
              <div
                className={`bg-white p-6 sm:p-8 rounded-2xl shadow-sm border border-neutral-200/80 space-y-6 ${
                  isSerif ? "font-serif" : "font-sans"
                }`}
              >
                {/* Mobile Document Header */}
                <div
                  className={`${
                    isExecutive
                      ? "text-center border-b-2 border-neutral-900 pb-4"
                      : isFinance
                      ? "text-center border-b border-neutral-950 pb-3"
                      : isTech
                      ? "text-left border-l-4 border-neutral-950 pl-3.5 py-0.5"
                      : isSwiss
                      ? "text-left"
                      : isAi
                      ? "text-left border-b border-dashed border-neutral-300 pb-3"
                      : "text-left border-b border-neutral-900 pb-3"
                  }`}
                >
                  <div className={isCentered ? "flex flex-col items-center" : "flex items-center gap-2"}>
                    <h1
                      className={`${
                        isExecutive
                          ? "text-xl sm:text-2xl font-serif font-bold uppercase tracking-wide text-neutral-950"
                          : isFinance
                          ? "text-xl sm:text-2xl font-serif font-bold uppercase tracking-wider text-neutral-950"
                          : isTech
                          ? "text-xl sm:text-2xl font-sans font-extrabold tracking-tight text-neutral-950"
                          : isSwiss
                          ? "text-2xl font-sans font-black tracking-tighter text-neutral-950"
                          : isAi
                          ? "text-xl sm:text-2xl font-sans font-bold tracking-tight text-neutral-950"
                          : "text-2xl font-serif font-bold italic tracking-tight text-neutral-950"
                      }`}
                    >
                      {cv.personalInfo.fullName}
                    </h1>
                    {isAi && (
                      <span className="text-[9px] font-mono px-1.5 py-0.5 bg-neutral-100 rounded text-neutral-700 border border-neutral-200">
                        R&amp;D
                      </span>
                    )}
                  </div>
                  <p
                    className={`text-xs mt-1 ${
                      isExecutive
                        ? "font-serif italic text-neutral-600"
                        : isAi
                        ? "font-mono text-neutral-600"
                        : isSwiss
                        ? "font-bold uppercase tracking-widest text-neutral-400"
                        : isCreative
                        ? "font-sans uppercase tracking-wider text-neutral-600 font-semibold"
                        : "font-semibold text-neutral-600"
                    }`}
                  >
                    {cv.personalInfo.headline}
                  </p>
                  <div
                    className={`text-[11px] text-neutral-500 mt-2 flex flex-wrap items-center gap-x-2.5 gap-y-1 ${
                      isCentered ? "justify-center" : "justify-start"
                    } ${isSwiss ? "border-t border-neutral-200 pt-2 mt-2.5" : ""} ${
                      isAi ? "font-mono text-[10px]" : ""
                    }`}
                  >
                    <span>{cv.personalInfo.email}</span>
                    <span>•</span>
                    <span>{cv.personalInfo.phone}</span>
                    <span>•</span>
                    <span>{cv.personalInfo.location}</span>
                  </div>
                </div>

                {cv.summary && (
                  <div>
                    <h2
                      className={`${
                        isExecutive
                          ? "font-serif uppercase tracking-widest text-xs font-bold text-neutral-900 border-b border-neutral-300 pb-1 mb-2 text-center"
                          : isFinance
                          ? "font-serif uppercase tracking-wider text-xs font-bold text-neutral-950 border-b border-neutral-950 pb-0.5 mb-2 text-left"
                          : isTech
                          ? "font-sans uppercase text-[11px] tracking-wider font-extrabold text-neutral-950 border-b-2 border-neutral-900 pb-1 mb-2"
                          : isSwiss
                          ? "font-sans uppercase text-[10.5px] tracking-widest font-black text-neutral-950 border-t-2 border-neutral-950 pt-1.5 mb-1.5"
                          : isAi
                          ? "font-mono uppercase text-[11px] tracking-wide font-bold text-neutral-900 border-b border-neutral-200 pb-1 mb-2"
                          : "font-serif text-xs uppercase tracking-widest font-bold text-neutral-950 border-b border-neutral-900 pb-1 mb-2"
                      }`}
                    >
                      {isAi ? "// SUMMARY" : "Professional Summary"}
                    </h2>
                    <p className="text-xs leading-relaxed text-neutral-700">
                      {cv.summary}
                    </p>
                  </div>
                )}

                <div>
                  <h2
                    className={`${
                      isExecutive
                        ? "font-serif uppercase tracking-widest text-xs font-bold text-neutral-900 border-b border-neutral-300 pb-1 mb-2 text-center"
                        : isFinance
                        ? "font-serif uppercase tracking-wider text-xs font-bold text-neutral-950 border-b border-neutral-950 pb-0.5 mb-2 text-left"
                        : isTech
                        ? "font-sans uppercase text-[11px] tracking-wider font-extrabold text-neutral-950 border-b-2 border-neutral-900 pb-1 mb-2"
                        : isSwiss
                        ? "font-sans uppercase text-[10.5px] tracking-widest font-black text-neutral-950 border-t-2 border-neutral-950 pt-1.5 mb-1.5"
                        : isAi
                        ? "font-mono uppercase text-[11px] tracking-wide font-bold text-neutral-900 border-b border-neutral-200 pb-1 mb-2"
                        : "font-serif text-xs uppercase tracking-widest font-bold text-neutral-950 border-b border-neutral-900 pb-1 mb-2"
                    }`}
                  >
                    {isAi ? "// WORK EXPERIENCE" : "Work Experience"}
                  </h2>
                  <div className="space-y-3">
                    {cv.experiences.map((exp) => (
                      <div key={exp.id} className="text-xs space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-neutral-950">
                            {exp.role}
                          </span>
                          <span className={`text-neutral-500 text-[11px] ${isAi ? "font-mono" : ""}`}>
                            {exp.startDate} - {exp.endDate}
                          </span>
                        </div>
                        <div className="text-neutral-600 text-[11px]">
                          {exp.company} &mdash; {exp.location}
                        </div>
                        <ul className="list-disc pl-4 text-xs text-neutral-700 space-y-1 pt-1">
                          {exp.bullets.map((b, idx) => (
                            <li key={idx}>{b}</li>
                          ))}
                        </ul>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <h2
                    className={`${
                      isExecutive
                        ? "font-serif uppercase tracking-widest text-xs font-bold text-neutral-900 border-b border-neutral-300 pb-1 mb-2 text-center"
                        : isFinance
                        ? "font-serif uppercase tracking-wider text-xs font-bold text-neutral-950 border-b border-neutral-950 pb-0.5 mb-2 text-left"
                        : isTech
                        ? "font-sans uppercase text-[11px] tracking-wider font-extrabold text-neutral-950 border-b-2 border-neutral-900 pb-1 mb-2"
                        : isSwiss
                        ? "font-sans uppercase text-[10.5px] tracking-widest font-black text-neutral-950 border-t-2 border-neutral-950 pt-1.5 mb-1.5"
                        : isAi
                        ? "font-mono uppercase text-[11px] tracking-wide font-bold text-neutral-900 border-b border-neutral-200 pb-1 mb-2"
                        : "font-serif text-xs uppercase tracking-widest font-bold text-neutral-950 border-b border-neutral-900 pb-1 mb-2"
                    }`}
                  >
                    {isAi ? "// CORE SKILLS & STACK" : "Technical Expertise"}
                  </h2>
                  <p className={`text-xs text-neutral-700 leading-relaxed ${isAi ? "font-mono text-[11px]" : ""}`}>
                    {cv.skills.join(" • ")}
                  </p>
                </div>

                {cv.education.length > 0 && (
                  <div>
                    <h2
                      className={`${
                        isExecutive
                          ? "font-serif uppercase tracking-widest text-xs font-bold text-neutral-900 border-b border-neutral-300 pb-1 mb-2 text-center"
                        : isFinance
                        ? "font-serif uppercase tracking-wider text-xs font-bold text-neutral-950 border-b border-neutral-950 pb-0.5 mb-2 text-left"
                        : isTech
                        ? "font-sans uppercase text-[11px] tracking-wider font-extrabold text-neutral-950 border-b-2 border-neutral-900 pb-1 mb-2"
                        : isSwiss
                        ? "font-sans uppercase text-[10.5px] tracking-widest font-black text-neutral-950 border-t-2 border-neutral-950 pt-1.5 mb-1.5"
                        : isAi
                        ? "font-mono uppercase text-[11px] tracking-wide font-bold text-neutral-900 border-b border-neutral-200 pb-1 mb-2"
                        : "font-serif text-xs uppercase tracking-widest font-bold text-neutral-950 border-b border-neutral-900 pb-1 mb-2"
                      }`}
                    >
                      {isAi ? "// EDUCATION" : "Education"}
                    </h2>
                    <div className="space-y-1.5">
                      {cv.education.map((edu) => (
                        <div
                          key={edu.id}
                          className="flex items-center justify-between text-xs"
                        >
                          <div>
                            <span className="font-bold text-neutral-950">
                              {edu.degree}
                            </span>
                            <span className="text-neutral-600 text-[11px] block">
                              {edu.school}, {edu.location}
                            </span>
                          </div>
                          <span className={`text-neutral-500 text-[11px] ${isAi ? "font-mono" : ""}`}>{edu.gradYear}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Mobile Footer with Download Action */}
            <div className="p-4 border-t border-neutral-100 flex items-center justify-between gap-3 bg-white">
              <button
                type="button"
                onClick={() => setMobilePreviewOpen(false)}
                className="flex-1 py-2.5 rounded-xl border border-neutral-200 text-xs font-bold text-neutral-700 hover:bg-neutral-50 cursor-pointer"
              >
                Back to Editing Form
              </button>
              <button
                type="button"
                disabled={isDownloading}
                onClick={() => handleDownload("pdf")}
                className="flex-1 py-2.5 rounded-xl bg-neutral-950 text-white text-xs font-bold hover:bg-neutral-800 shadow-sm cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {isDownloading ? "Generating..." : "Download PDF"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= TEMPLATE GALLERY BROWSER MODAL ================= */}
      {templateGalleryOpen && (
        <div className="fixed inset-0 z-50 bg-neutral-950/70 backdrop-blur-sm flex items-center justify-center p-4 sm:p-6 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-4xl w-full max-h-[90vh] flex flex-col overflow-hidden shadow-2xl border border-neutral-200 animate-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="p-5 sm:p-6 border-b border-neutral-100 flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-lg sm:text-xl font-bold text-neutral-950">
                    Browse CV Templates
                  </h2>
                  <span className="px-2.5 py-0.5 rounded-full bg-neutral-100 text-neutral-700 text-[11px] font-semibold">
                    6 Verified Archetypes
                  </span>
                </div>
                <p className="text-xs text-neutral-500 mt-1">
                  Switch your design format in real time. Your content, metrics, and ATS compliance are instantly preserved.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setTemplateGalleryOpen(false)}
                className="p-2 rounded-full text-neutral-400 hover:text-neutral-900 hover:bg-neutral-100 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Grid of templates */}
            <div className="flex-1 overflow-y-auto p-5 sm:p-8 bg-neutral-50/50">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {TEMPLATE_OPTIONS.map((tmpl) => {
                  const isCurrent = cv.templateStyle === tmpl.id;
                  return (
                    <div
                      key={tmpl.id}
                      onClick={() => {
                        setCv((prev) => ({
                          ...prev,
                          templateStyle: tmpl.id,
                          atsScore: Math.max(prev.atsScore, tmpl.atsScore),
                        }));
                      }}
                      className={`relative rounded-2xl p-4 sm:p-5 border text-left transition-all cursor-pointer flex flex-col justify-between group ${
                        isCurrent
                          ? "bg-white border-neutral-950 shadow-md ring-2 ring-neutral-950"
                          : "bg-white border-neutral-200 hover:border-neutral-400 hover:shadow-md"
                      }`}
                    >
                      <div>
                        {/* Miniature Visual Mock of the layout */}
                        <div className="h-28 rounded-xl bg-neutral-50 border border-neutral-200/80 p-3 mb-4 flex flex-col justify-between overflow-hidden relative group-hover:bg-neutral-100/60 transition-colors">
                          {/* Visual representation based on archetype */}
                          {tmpl.id === "tech" && (
                            <div className="space-y-1.5">
                              <div className="flex items-center gap-1.5 border-l-2 border-neutral-900 pl-1.5">
                                <div className="h-2 w-16 bg-neutral-900 rounded-xs" />
                                <div className="h-1.5 w-10 bg-neutral-400 rounded-xs" />
                              </div>
                              <div className="h-1 w-full bg-neutral-200 rounded-xs" />
                              <div className="h-1.5 w-12 bg-neutral-900 rounded-xs mt-2" />
                              <div className="h-1 w-3/4 bg-neutral-300 rounded-xs" />
                              <div className="h-1 w-5/6 bg-neutral-300 rounded-xs" />
                            </div>
                          )}
                          {tmpl.id === "executive" && (
                            <div className="space-y-1.5 flex flex-col items-center text-center">
                              <div className="h-2 w-20 bg-neutral-900 rounded-xs" />
                              <div className="h-1.5 w-12 bg-neutral-400 rounded-xs" />
                              <div className="w-full h-px bg-neutral-900 my-1" />
                              <div className="h-1.5 w-14 bg-neutral-800 rounded-xs" />
                              <div className="w-full space-y-1">
                                <div className="h-1 w-full bg-neutral-300 rounded-xs" />
                                <div className="h-1 w-4/5 bg-neutral-300 rounded-xs mx-auto" />
                              </div>
                            </div>
                          )}
                          {tmpl.id === "swiss" && (
                            <div className="space-y-2">
                              <div className="h-3 w-16 bg-neutral-950 rounded-xs" />
                              <div className="h-1 w-10 bg-neutral-400 rounded-xs" />
                              <div className="w-full h-0.5 bg-neutral-950" />
                              <div className="space-y-1 pt-1">
                                <div className="h-1 w-full bg-neutral-300 rounded-xs" />
                                <div className="h-1 w-2/3 bg-neutral-300 rounded-xs" />
                              </div>
                            </div>
                          )}
                          {tmpl.id === "finance" && (
                            <div className="space-y-1.5 flex flex-col items-center">
                              <div className="h-2.5 w-24 bg-neutral-950 rounded-xs" />
                              <div className="h-1 w-16 bg-neutral-500 rounded-xs" />
                              <div className="w-full border-b border-neutral-900 my-0.5" />
                              <div className="w-full flex justify-between items-center">
                                <div className="h-1.5 w-12 bg-neutral-800 rounded-xs" />
                                <div className="h-1 w-8 bg-neutral-400 rounded-xs" />
                              </div>
                              <div className="w-full space-y-1">
                                <div className="h-1 w-full bg-neutral-300 rounded-xs" />
                                <div className="h-1 w-11/12 bg-neutral-300 rounded-xs" />
                              </div>
                            </div>
                          )}
                          {tmpl.id === "ai" && (
                            <div className="space-y-1.5">
                              <div className="flex items-center justify-between">
                                <div className="h-2 w-16 bg-neutral-950 rounded-xs" />
                                <div className="px-1 py-0.2 bg-neutral-200 rounded text-[6px] font-mono">CODE</div>
                              </div>
                              <div className="h-1 w-20 bg-neutral-400 rounded-xs" />
                              <div className="h-1 w-full bg-dashed border-b border-dashed border-neutral-300 my-1" />
                              <div className="h-1.5 w-14 bg-neutral-800 rounded-xs" />
                              <div className="h-1 w-full bg-neutral-300 rounded-xs" />
                            </div>
                          )}
                          {tmpl.id === "creative" && (
                            <div className="space-y-1.5">
                              <div className="h-3 w-20 bg-neutral-950 rounded-xs italic" />
                              <div className="h-1 w-12 bg-neutral-500 rounded-xs" />
                              <div className="w-8 h-0.5 bg-neutral-950" />
                              <div className="space-y-1 pt-1">
                                <div className="h-1 w-full bg-neutral-300 rounded-xs" />
                                <div className="h-1 w-3/4 bg-neutral-300 rounded-xs" />
                              </div>
                            </div>
                          )}

                          {/* ATS score pill inside preview */}
                          <div className="absolute top-2 right-2">
                            <span className="text-[9px] font-bold text-emerald-800 bg-emerald-100/90 px-1.5 py-0.5 rounded-full border border-emerald-300/60">
                              {tmpl.atsScore}% ATS
                            </span>
                          </div>
                        </div>

                        {/* Template Info */}
                        <div className="space-y-1">
                          <div className="flex items-center justify-between gap-1">
                            <span className="text-sm font-bold text-neutral-950">
                              {tmpl.name}
                            </span>
                            <span className="text-[9.5px] font-semibold px-2 py-0.5 rounded-md bg-neutral-100 text-neutral-700">
                              {tmpl.category}
                            </span>
                          </div>
                          <p className="text-[11px] font-medium text-neutral-500">
                            {tmpl.fontFamily}
                          </p>
                          <p className="text-xs text-neutral-600 line-clamp-2 leading-relaxed pt-1">
                            {tmpl.description}
                          </p>
                        </div>
                      </div>

                      {/* Bottom Card Action */}
                      <div className="pt-4 mt-3 border-t border-neutral-100 flex items-center justify-between">
                        {isCurrent ? (
                          <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-600">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            Active
                          </span>
                        ) : (
                          <span className="text-xs font-semibold text-neutral-400 group-hover:text-neutral-950 transition-colors">
                            Click to apply
                          </span>
                        )}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setCv((prev) => ({
                              ...prev,
                              templateStyle: tmpl.id,
                              atsScore: Math.max(prev.atsScore, tmpl.atsScore),
                            }));
                            setTemplateGalleryOpen(false);
                          }}
                          className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                            isCurrent
                              ? "bg-neutral-950 text-white"
                              : "bg-neutral-100 text-neutral-800 hover:bg-neutral-950 hover:text-white"
                          }`}
                        >
                          {isCurrent ? "Applied" : "Select"}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Footer */}
            <div className="p-4 sm:p-5 border-t border-neutral-100 bg-white flex items-center justify-between">
              <div className="text-xs text-neutral-500">
                Currently using: <strong className="text-neutral-900">{currentTemplate.name}</strong> ({currentTemplate.category})
              </div>
              <button
                type="button"
                onClick={() => setTemplateGalleryOpen(false)}
                className="px-5 py-2 rounded-xl bg-neutral-950 text-white text-xs font-bold hover:bg-neutral-800 transition-colors cursor-pointer shadow-xs"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
