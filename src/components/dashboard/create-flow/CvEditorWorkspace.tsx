"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeft,
  Award,
  BadgeCheck,
  BookOpen,
  Briefcase,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  CloudAlert,
  CloudCheck,
  Compass,
  Download,
  Pencil,
  ListChecks,
  Eye,
  FileText,
  FlaskConical,
  FolderGit2,
  GraduationCap,
  Heart,
  HeartHandshake,
  IdCard,
  Languages,
  LayoutTemplate,
  Loader2,
  Mic,
  School,
  ShieldCheck,
  Target,
  Wand,
  Trash2,
  Upload,
  User,
  UserCheck,
  Users,
  Wrench,
  X,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import {
  CvData,
  CvAward,
  CvCertification,
  CvCourse,
  CvLanguage,
  CvLink,
  CvMembership,
  CvPersonalDetail,
  CvPosition,
  CvPresentation,
  CvProject,
  CvPublication,
  CvReference,
  CvVolunteering,
  Education,
  SkillGroup,
  WorkExperience,
} from "./types";
import { ApiError, createCvDocument, downloadCvPdf, cvUnlockFromError, finalizeCvDocument, updateCvContent, type CvPolishPatch, type CvReviewTip, isPaidPlan } from "@/lib/api";
import { useAnalyzeJobRequirements, usePolishCv, usePolishSummary, useReviewCv } from "@/hooks/use-cv-generation";
import { useProGate } from "@/hooks/use-pro-gate";
import { checkTarget, jobRequirementsState, scoreEditorCv, type PolishTarget, type ScoreCheck } from "@/lib/cv-score";
import { ProUpgradeModal, UnlockCvModal } from "../ProUpgradeModal";
import { CvScorePanel, type CvScorePanelProps, type SectionStatus } from "./CvScorePanel";
import { useCvPreview } from "@/hooks/use-cv-preview";
import { useCvTemplates } from "@/hooks/use-cv-templates";
import { useSubscriptionStatus } from "@/hooks/use-subscription";
import { useMe } from "@/hooks/use-auth";
import { bulletToText, flattenSkillGroups, newLocalId, toCVContentPatch } from "@/lib/cv-mapper";
import { getMissingDetails } from "@/lib/missing-details";
import { resolvePreviewPath, type EditorTarget } from "@/lib/preview-paths";
import { getCvFileName } from "@/lib/utils";
import { useToast } from "@/components/Toaster";
import { CvPreviewFrame } from "./CvPreviewFrame";
import { useRouter } from "next/navigation";
import { dashboardFlowHref } from "@/lib/flow-url";
import { TemplateThumbnail } from "./TemplateThumbnail";
import { ICON_TONES, OptionTone } from "./OptionCard";
import { QuickTour, type TourStep } from "../QuickTour";
import {
  AddButton,
  BulletEditor,
  CheckboxField,
  EmptyState,
  EntryCard,
  Field,
  SectionHeader,
  TagInput,
  inputClass,
  labelClass,
  secondaryButtonClass,
} from "./EditorFields";

interface CvEditorWorkspaceProps {
  initialData: CvData;
  onBack: () => void;
  onSave: (data: CvData) => void;
  /** After a PDF download succeeds, with the CV's document id. */
  onDownloaded?: (cvDocumentId: string) => void;
}

// "personal" (the contact form) plus any section key from the backend's
// catalog. Which sections get a form comes from the chosen template.
type EditorSection = string;

type IconType = React.ComponentType<{ className?: string }>;

// Each section's icon tile, in the dashboard's tones.
const SECTION_META: Record<string, { icon: IconType; tone: OptionTone }> = {
  personal: { icon: User, tone: "accent" },
  summary: { icon: FileText, tone: "accent" },
  experience: { icon: Briefcase, tone: "sky" },
  education: { icon: GraduationCap, tone: "violet" },
  projects: { icon: FolderGit2, tone: "emerald" },
  skills: { icon: Wrench, tone: "sky" },
  certifications: { icon: BadgeCheck, tone: "emerald" },
  languages: { icon: Languages, tone: "violet" },
  awards: { icon: Award, tone: "accent" },
  publications: { icon: BookOpen, tone: "violet" },
  volunteering: { icon: HeartHandshake, tone: "emerald" },
  courses: { icon: School, tone: "sky" },
  memberships: { icon: Users, tone: "neutral" },
  presentations: { icon: Mic, tone: "accent" },
  interests: { icon: Heart, tone: "violet" },
  references: { icon: UserCheck, tone: "sky" },
  personalDetails: { icon: IdCard, tone: "neutral" },
  research: { icon: FlaskConical, tone: "violet" },
  teaching: { icon: School, tone: "emerald" },
  activities: { icon: Users, tone: "sky" },
  consent: { icon: ShieldCheck, tone: "neutral" },
};
const metaFor = (section: string) => SECTION_META[section] ?? { icon: FileText, tone: "neutral" as OptionTone };

// Edits are saved this long after the last keystroke.
const AUTOSAVE_DELAY_MS = 1500;
const EMAIL_PATTERN = /^\S+@\S+\.\S+$/;

// Used before the template list has loaded (or if it fails).
const FALLBACK_SECTIONS = [
  { key: "summary", label: "Summary" },
  { key: "experience", label: "Experience" },
  { key: "education", label: "Education" },
  { key: "projects", label: "Projects" },
  { key: "skills", label: "Skills" },
];

const MAX_PHOTO_PX = 320;

/** Downscales an uploaded image to a small JPEG data URL (the backend caps photos at ~300KB). */
function resizePhoto(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Could not read that image"));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error("That file isn't a readable image"));
      img.onload = () => {
        const scale = Math.min(1, MAX_PHOTO_PX / Math.max(img.width, img.height));
        const canvas = document.createElement("canvas");
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);
        canvas.getContext("2d")?.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL("image/jpeg", 0.85));
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  });
}

// The editor tour starts by itself only the first time someone opens the
// editor (in this browser); after that it's only shown from the Tour button.
// The flag is written when the tour closes, so a reload mid-tour shows it again.
const EDITOR_TOUR_SEEN_KEY = "resumate:editor-tour-seen";

function hasSeenEditorTour(): boolean {
  try {
    return localStorage.getItem(EDITOR_TOUR_SEEN_KEY) === "1";
  } catch {
    return true; // storage blocked: don't keep showing it
  }
}

function markEditorTourSeen() {
  try {
    localStorage.setItem(EDITOR_TOUR_SEEN_KEY, "1");
  } catch {
    // storage blocked — nothing to remember
  }
}

type ListKey =
  | "experiences"
  | "education"
  | "projects"
  | "certifications"
  | "languages"
  | "awards"
  | "publications"
  | "volunteering"
  | "courses"
  | "memberships"
  | "presentations"
  | "references"
  | "personalDetails"
  | "research"
  | "teaching"
  | "activities";
type ItemOf<K extends ListKey> = CvData[K][number];

const blankExperience = (): WorkExperience => ({
  id: newLocalId("exp"),
  role: "",
  company: "",
  location: "",
  url: "",
  startDate: "",
  endDate: "",
  isCurrent: false,
  bullets: [],
});

const blankEducation = (): Education => ({
  id: newLocalId("edu"),
  degree: "",
  field: "",
  school: "",
  location: "",
  gpa: "",
  startDate: "",
  endDate: "",
  honors: "",
  bullets: [],
});

const blankProject = (): CvProject => ({
  id: newLocalId("proj"),
  name: "",
  subtitle: "",
  description: "",
  tech: [],
  url: "",
  bullets: [],
});

const blankCertification = (): CvCertification => ({
  id: newLocalId("cert"),
  name: "",
  issuer: "",
  date: "",
  expires: "",
  url: "",
});
const blankPosition = (prefix: string): CvPosition => ({
  id: newLocalId(prefix),
  title: "",
  organization: "",
  location: "",
  startDate: "",
  endDate: "",
  isCurrent: false,
  bullets: [],
});
const blankPersonalDetail = (): CvPersonalDetail => ({ id: newLocalId("pd"), label: "", value: "" });

// Research, teaching, and activities share one form.
const POSITION_SECTIONS: Record<
  "research" | "teaching" | "activities",
  { addLabel: string; noun: string; titleLabel: string; titlePlaceholder: string; orgLabel: string; empty: string; prefix: string }
> = {
  research: {
    addLabel: "Add research",
    noun: "Research",
    titleLabel: "Position or project",
    titlePlaceholder: "Undergraduate Research Assistant",
    orgLabel: "Lab, university, or organization",
    empty: "No research experience yet.",
    prefix: "res",
  },
  teaching: {
    addLabel: "Add teaching",
    noun: "Teaching",
    titleLabel: "Course or role",
    titlePlaceholder: "Teaching Assistant, Intro to Physics",
    orgLabel: "School or institution",
    empty: "No teaching experience yet.",
    prefix: "teach",
  },
  activities: {
    addLabel: "Add activity",
    noun: "Activity",
    titleLabel: "Role",
    titlePlaceholder: "Club President",
    orgLabel: "Club or organization",
    empty: "No activities yet.",
    prefix: "act",
  },
};
const blankLanguage = (): CvLanguage => ({ id: newLocalId("lang"), language: "", proficiency: "" });
const blankAward = (): CvAward => ({ id: newLocalId("award"), title: "", issuer: "", date: "", description: "" });
const blankPublication = (): CvPublication => ({
  id: newLocalId("pub"),
  title: "",
  authors: "",
  venue: "",
  date: "",
  url: "",
});
const blankVolunteering = (): CvVolunteering => ({
  id: newLocalId("vol"),
  organization: "",
  role: "",
  location: "",
  startDate: "",
  endDate: "",
  isCurrent: false,
  bullets: [],
});
const blankCourse = (): CvCourse => ({ id: newLocalId("course"), name: "", institution: "", date: "" });
const blankMembership = (): CvMembership => ({
  id: newLocalId("mem"),
  organization: "",
  role: "",
  startDate: "",
  endDate: "",
  isCurrent: false,
});
const blankPresentation = (): CvPresentation => ({ id: newLocalId("talk"), title: "", event: "", date: "", url: "" });
const blankReference = (): CvReference => ({
  id: newLocalId("ref"),
  name: "",
  title: "",
  organization: "",
  relationship: "",
  email: "",
  phone: "",
});

// The app's button styles (see SettingsView).
const ACCENT_BUTTON =
  "inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-lg border border-accent bg-accent hover:bg-accent-strong hover:border-accent-strong text-white text-sm font-semibold transition-colors cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed";
const CARD = "rounded-lg border border-neutral-300 bg-white p-5 space-y-4";

/** "Jan 2021 – Present" style line for an entry header. */
function dateLine(start: string, end: string, isCurrent = false): string {
  const to = isCurrent ? "Present" : end.trim();
  return [start.trim(), to].filter(Boolean).join(" – ");
}
const metaLine = (...parts: (string | undefined)[]) => parts.map((p) => p?.trim()).filter(Boolean).join(" · ");

/** Start / End fields plus the "still here" checkbox, as two grid cells. */
function DateRangeFields({
  start,
  end,
  isCurrent,
  currentLabel,
  onChange,
}: {
  start: string;
  end: string;
  isCurrent: boolean;
  currentLabel: string;
  onChange: (patch: { startDate?: string; endDate?: string; isCurrent?: boolean }) => void;
}) {
  return (
    <>
      <Field name="startDate" label="Start" value={start} placeholder="2023-01" onChange={(v) => onChange({ startDate: v })} />
      <div>
        <Field
          name="endDate"
          label="End"
          value={isCurrent ? "" : end}
          placeholder={isCurrent ? "Present" : "2024-06"}
          onChange={(v) => onChange({ endDate: v, isCurrent: false })}
        />
        <CheckboxField label={currentLabel} checked={isCurrent} onChange={(checked) => onChange({ isCurrent: checked })} />
      </div>
    </>
  );
}

interface ListSectionProps<T extends { id: string }> {
  section: string;
  title: string;
  subtitle?: string;
  addLabel: string;
  emptyMessage: string;
  items: T[];
  onAdd: () => void;
  onRemove: (id: string) => void;
  onMove: (id: string, direction: -1 | 1) => void;
  itemTitle: (item: T, index: number) => string;
  itemMeta?: (item: T) => string;
  renderItem: (item: T) => React.ReactNode;
  /** The entry picked from the preview, if it's in this list. */
  focus?: { entryId?: string; signal: number } | null;
}

/** A list section: header, its entries as collapsible cards, and an add button. */
function ListSection<T extends { id: string }>({
  section,
  title,
  subtitle,
  addLabel,
  emptyMessage,
  items,
  onAdd,
  onRemove,
  onMove,
  itemTitle,
  itemMeta,
  renderItem,
  focus,
}: ListSectionProps<T>) {
  const { icon, tone } = metaFor(section);
  return (
    <div className="space-y-5">
      <SectionHeader title={title} subtitle={subtitle} icon={icon} tone={tone} />
      {items.length === 0 ? (
        <EmptyState message={emptyMessage} actionLabel={addLabel} onAction={onAdd} />
      ) : (
        <div className="space-y-3">
          {items.map((item, idx) => (
            <EntryCard
              key={item.id}
              title={itemTitle(item, idx)}
              meta={itemMeta?.(item)}
              entryId={item.id}
              focusSignal={focus?.entryId === item.id ? focus.signal : undefined}
              onRemove={() => onRemove(item.id)}
              onMoveUp={idx > 0 ? () => onMove(item.id, -1) : undefined}
              onMoveDown={idx < items.length - 1 ? () => onMove(item.id, 1) : undefined}
            >
              {renderItem(item)}
            </EntryCard>
          ))}
          <AddButton label={addLabel} onClick={onAdd} />
        </div>
      )}
    </div>
  );
}

/**
 * A horizontally scrolling row whose overflow is never silent: a fade and an
 * arrow button appear on whichever side has more tabs out of view.
 */
function OverflowRow({ children }: { children: React.ReactNode }) {
  const rowRef = useRef<HTMLDivElement>(null);
  const [overflow, setOverflow] = useState({ left: false, right: false });

  const measure = useCallback(() => {
    const el = rowRef.current;
    if (!el) return;
    setOverflow({ left: el.scrollLeft > 4, right: el.scrollLeft + el.clientWidth < el.scrollWidth - 4 });
  }, []);

  useEffect(() => {
    const el = rowRef.current;
    if (!el) return;
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    Array.from(el.children).forEach((child) => observer.observe(child));
    return () => observer.disconnect();
  }, [measure, children]);

  const scrollBy = (direction: -1 | 1) => rowRef.current?.scrollBy({ left: direction * 240, behavior: "smooth" });
  const arrow = (side: "left" | "right") => (
    <div
      className={`absolute inset-y-0 flex items-center ${side === "left" ? "left-0 pr-8 bg-gradient-to-r" : "right-0 pl-8 justify-end bg-gradient-to-l"} from-white via-white/90 to-transparent pointer-events-none`}
    >
      <button
        type="button"
        onClick={() => scrollBy(side === "left" ? -1 : 1)}
        className="pointer-events-auto inline-flex items-center px-2 py-1.5 rounded-lg border border-neutral-300 bg-white text-sm font-semibold text-neutral-700 hover:text-neutral-950 hover:border-neutral-400 shadow-[0_1px_2px_rgba(0,0,0,0.05)] transition-colors cursor-pointer"
        aria-label={side === "left" ? "Show earlier sections" : "Show more sections"}
      >
        <ChevronRight className={`w-4 h-4 ${side === "left" ? "rotate-180" : ""}`} />
      </button>
    </div>
  );

  return (
    <div className="relative">
      <div ref={rowRef} onScroll={measure} className="flex items-center gap-1 overflow-x-auto scrollbar-none">
        {children}
      </div>
      {overflow.left && arrow("left")}
      {overflow.right && arrow("right")}
    </div>
  );
}

/** A section's small icon tile. */
function SectionIcon({ section }: { section: string }) {
  const { icon: Icon, tone } = metaFor(section);
  return (
    <span className={`w-7 h-7 rounded-lg shrink-0 flex items-center justify-center bg-gradient-to-b border ${ICON_TONES[tone]}`}>
      <Icon className="w-3.5 h-3.5" />
    </span>
  );
}

function TemplateGalleryCard({
  id,
  name,
  description,
  isCurrent,
  onSelect,
}: {
  id: string;
  name: string;
  description: string;
  isCurrent: boolean;
  onSelect: () => void;
}) {
  return (
    <button type="button" onClick={onSelect} className="group text-left cursor-pointer">
      <TemplateThumbnail
        templateId={id}
        className={`aspect-[210/297] rounded-lg transition-all ${
          isCurrent ? "ring-2 ring-accent ring-offset-2" : "border border-neutral-300 group-hover:border-neutral-400 group-hover:shadow-md"
        }`}
        title={`${name} template`}
      />
      <div className="pt-3">
        <div className="flex items-center justify-between gap-2">
          <span className="text-sm font-semibold text-neutral-950">{name}</span>
          {isCurrent && <CheckCircle2 className="w-4 h-4 text-accent" />}
        </div>
        <p className="text-xs text-neutral-500 mt-1 line-clamp-3 leading-relaxed">{description}</p>
      </div>
    </button>
  );
}

export function CvEditorWorkspace({ initialData, onBack, onSave, onDownloaded }: CvEditorWorkspaceProps) {
  const toast = useToast();
  const subscriptionStatus = useSubscriptionStatus().data;
  // AI polish comes with any paid plan (or a grant of just that feature).
  const isPro = subscriptionStatus?.features?.aiPolish ?? isPaidPlan(subscriptionStatus);
  // The full score breakdown comes with a paid plan; what's missing is shown to everyone.
  const isSubscribed = isPaidPlan(subscriptionStatus) || isPro;
  const [cv, setCv] = useState<CvData>(initialData);

  // The name, email, phone and occupation given at sign-up fill any of those
  // the CV leaves empty, so nobody is asked twice. Runs once per editor visit
  // and never overwrites what the CV already has; autosave then stores it.
  const { data: me } = useMe();
  const filledFromAccountRef = useRef(false);
  useEffect(() => {
    if (!me || filledFromAccountRef.current) return;
    filledFromAccountRef.current = true;
    const accountName = [me.firstName, me.lastName].filter(Boolean).join(" ") || me.fullName || "";
    setCv((prev) => {
      const p = prev.personalInfo;
      const filled = {
        fullName: p.fullName.trim() ? p.fullName : accountName,
        email: p.email.trim() ? p.email : me.email || "",
        phone: p.phone.trim() ? p.phone : me.phone || "",
        // The saved headline falls back to the target role (see toCVContentPatch), so only fill when both are empty.
        headline: p.headline.trim() || prev.targetRole.trim() ? p.headline : me.occupationTitle || "",
      };
      const changed = (Object.keys(filled) as (keyof typeof filled)[]).some((k) => filled[k] !== p[k]);
      return changed ? { ...prev, personalInfo: { ...p, ...filled } } : prev;
    });
  }, [me]);
  const [isSaving, setIsSaving] = useState(false);
  const [showExportChecklist, setShowExportChecklist] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const polishSummaryMutation = usePolishSummary();
  // Snapshots from the most recent "AI Polish" run, so the user can bounce
  // between the pre-polish and polished wording without re-running the AI.
  const [prePolishSummary, setPrePolishSummary] = useState<string | null>(null);
  const [polishedSummary, setPolishedSummary] = useState<string | null>(null);
  const [activeSection, setActiveSection] = useState<EditorSection>("personal");
  // The tour starts by itself on the first visit to the editor; the top bar's
  // Tour button runs it any time.
  const [showWalkthrough, setShowWalkthrough] = useState(() => typeof window !== "undefined" && !hasSeenEditorTour());
  const [zoomLevel, setZoomLevel] = useState<number>(100);
  // On phones a CV that already has content (opened from the list, or just
  // made by a flow) opens on its preview; a blank one opens on the form.
  const [mobilePreviewOpen, setMobilePreviewOpen] = useState<boolean>(
    () =>
      typeof window !== "undefined" &&
      window.matchMedia("(max-width: 1023px)").matches &&
      (initialData.experiences.length > 0 || initialData.education.length > 0 || initialData.summary.trim() !== "")
  );
  const [templateGalleryOpen, setTemplateGalleryOpen] = useState<boolean>(false);
  const formScrollRef = useRef<HTMLDivElement>(null);
  // The phone's floating Preview button: out of the way while scrolling down the form.
  const [previewButtonHidden, setPreviewButtonHidden] = useState(false);
  const lastFormScrollRef = useRef(0);
  const handleFormScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const top = e.currentTarget.scrollTop;
    const delta = top - lastFormScrollRef.current;
    lastFormScrollRef.current = top;
    if (top < 48) setPreviewButtonHidden(false);
    else if (delta > 6) setPreviewButtonHidden(true);
    else if (delta < -6) setPreviewButtonHidden(false);
  };

  // The switcher offers only the listed templates; the CV's own template is looked up among all of them, so one
  // using a hidden (photo) template still renders as it was made.
  const { data: templates } = useCvTemplates();
  const { data: allTemplates } = useCvTemplates({ includeHidden: true });
  const currentTemplate = allTemplates?.find((t) => t.id === cv.templateStyle) ?? allTemplates?.find((t) => t.isDefault);

  // The editor shows the forms for exactly the sections this template
  // renders. Content in other sections is kept (switching templates never
  // deletes anything) — it just isn't on this layout.
  const templateSections = (currentTemplate?.sections ?? FALLBACK_SECTIONS).filter((s) => s.key !== "photo");
  const templateSectionKeys = templateSections.map((s) => s.key);
  const templateShowsPhoto = currentTemplate?.sections.some((s) => s.key === "photo") ?? false;
  const visibleSections: { id: EditorSection; label: string }[] = [
    { id: "personal", label: "Contact" },
    ...templateSections.map((s) => ({ id: s.key, label: s.label })),
  ];
  const sectionLabel = (id: string) => visibleSections.find((s) => s.id === id)?.label ?? id;
  // After a template switch the open section may no longer exist.
  const shownSection = visibleSections.some((s) => s.id === activeSection) ? activeSection : "personal";

  // ---- picking a spot on the preview opens that place in the form ----
  const [focusTarget, setFocusTarget] = useState<(EditorTarget & { signal: number }) | null>(null);
  const handlePick = (path: string) => {
    const target = resolvePreviewPath(cv, path);
    if (!target) return;
    setActiveSection(target.section);
    setFocusTarget({ ...target, signal: Date.now() });
  };
  useEffect(() => {
    if (!focusTarget?.field) return;
    // After the section renders and the card opens: bring the field into view, focus it, flash it.
    const timer = setTimeout(() => {
      const scope = focusTarget.entryId
        ? document.querySelector(`[data-entry-id="${focusTarget.entryId}"]`)
        : formScrollRef.current;
      const field = scope?.querySelector<HTMLElement>(`[data-field="${focusTarget.field}"]`);
      if (!field) return;
      field.scrollIntoView({ behavior: "smooth", block: "center" });
      field.querySelector<HTMLElement>("textarea, input:not([type=checkbox]):not([type=file])")?.focus({ preventScroll: true });
      field.classList.remove("field-flash");
      void field.offsetWidth; // restart the animation on a repeat pick
      field.classList.add("field-flash");
    }, 250);
    return () => clearTimeout(timer);
  }, [focusTarget]);

  const openSection = useCallback((section: EditorSection) => {
    setActiveSection(section);
    formScrollRef.current?.scrollTo({ top: 0, behavior: "smooth" });
  }, []);
  // The spotlight tour: starts by itself on the first visit, or from the Tour button.
  // Below lg the preview column (and its Show gaps switch) is hidden, so the
  // tour points at the floating "Preview CV" button instead.
  const narrowScreen = typeof window !== "undefined" && window.matchMedia("(max-width: 1023px)").matches;
  const previewSteps: TourStep[] = narrowScreen
    ? [
        {
          target: "editor-mobile-preview",
          title: "See your CV",
          body: "Tap Preview CV to see your pages exactly as they'll download, with your score and the download button.",
        },
      ]
    : [
        {
          target: "editor-preview",
          title: "Click the preview to edit",
          body: "This is your PDF, page by page. Click any line and its field opens in the form.",
        },
        {
          target: "editor-gaps",
          title: "PDF view or show gaps",
          body: "PDF view is the page as it downloads. Show gaps adds placeholders for what's still missing. Click one to fill it in.",
        },
      ];
  const editorTour: TourStep[] = [
    {
      target: "editor-tabs",
      title: "Fill it in section by section",
      body: "Each tab opens one part of your CV. Start with your contact details, then work along. A red dot means it's needed before you can download; orange means it has gaps.",
      onShow: () => openSection("personal"),
    },
    {
      target: "editor-form",
      title: "Type here",
      body: "The form for the open tab. Everything you type goes straight onto your CV and saves as you go.",
    },
    ...previewSteps,
    {
      target: "editor-polish",
      title: "Let AI polish your summary",
      body: "Write a rough summary in your own words, then press AI Polish to tighten it up.",
      onShow: () => openSection("summary"),
    },
    {
      target: "editor-score",
      title: "Watch your score",
      body: "Click your score to see what to add for a better one, and how much each adds. Add a job description to see how well you match it too.",
    },
    {
      target: "editor-download",
      title: "Download when it looks right",
      body: "Get your PDF here. If anything required is missing, it tells you what.",
      onShow: () => openSection("personal"),
    },
  ];

  // Opening a section from the preview or a list scrolls its tab into view.
  useEffect(() => {
    document.querySelector(`[data-tab="${shownSection}"]`)?.scrollIntoView({ behavior: "smooth", inline: "nearest", block: "nearest" });
  }, [shownSection]);

  // What the preview highlights as placeholders, listed so it can be filled in.
  // All of the template's sections, photo included (the photo slot is flagged with the contact details).
  const missingDetails = getMissingDetails(cv, currentTemplate?.sections.map((s) => s.key) ?? templateSectionKeys);
  const sectionsWithGaps = new Set(missingDetails.map((m) => m.section));
  // The chips in the score panel: each section, done / missing details / not added.
  const sectionStatuses: SectionStatus[] = visibleSections.map((sec) => {
    const gap = missingDetails.find((m) => m.section === sec.id);
    return { key: sec.id, label: sec.label, state: !gap ? "done" : gap.empty ? "empty" : "partial", detail: gap?.detail };
  });

  // The preview is the real template rendered by the backend — the same HTML
  // the PDF download is printed from (plus the missing-detail placeholders).
  const content = useMemo(() => toCVContentPatch(cv), [cv]);
  // "PDF view" (the clean, as-downloaded page) by default; "Show gaps" adds clickable placeholders for what's missing.
  const [showGaps, setShowGaps] = useState(false);
  const preview = useCvPreview(cv.templateStyle, content, showGaps);

  useEffect(() => {
    if (preview.error) {
      toast.error("The preview couldn't update", { id: "preview-error", description: preview.error, duration: 6000 });
    } else {
      toast.dismiss("preview-error");
    }
  }, [preview.error, toast]);

  // ---- generic list helpers ----
  const updateItem = <K extends ListKey>(key: K, id: string, patch: Partial<ItemOf<K>>) =>
    setCv((prev) => ({
      ...prev,
      [key]: (prev[key] as ItemOf<K>[]).map((item) => (item.id === id ? { ...item, ...patch } : item)),
    }));
  const addItem = <K extends ListKey>(key: K, item: ItemOf<K>) =>
    setCv((prev) => ({ ...prev, [key]: [...(prev[key] as ItemOf<K>[]), item] }));
  const removeItem = <K extends ListKey>(key: K, id: string) =>
    setCv((prev) => ({ ...prev, [key]: (prev[key] as ItemOf<K>[]).filter((item) => item.id !== id) }));
  const moveItem = <K extends ListKey>(key: K, id: string, direction: -1 | 1) =>
    setCv((prev) => {
      const items = [...(prev[key] as ItemOf<K>[])];
      const from = items.findIndex((item) => item.id === id);
      const to = from + direction;
      if (from < 0 || to < 0 || to >= items.length) return prev;
      [items[from], items[to]] = [items[to], items[from]];
      return { ...prev, [key]: items };
    });
  /** The add/remove/move handlers ListSection needs for one list. */
  const listHandlers = <K extends ListKey>(key: K) => ({
    onRemove: (id: string) => removeItem(key, id),
    onMove: (id: string, direction: -1 | 1) => moveItem(key, id, direction),
  });

  const setPersonal = (patch: Partial<CvData["personalInfo"]>) =>
    setCv((prev) => ({ ...prev, personalInfo: { ...prev.personalInfo, ...patch } }));
  const setLinks = (links: CvLink[]) => setPersonal({ links });

  // The flat skills list always mirrors the groups.
  const setSkillGroups = (skillGroups: SkillGroup[]) =>
    setCv((prev) => ({ ...prev, skillGroups, skills: flattenSkillGroups(skillGroups) }));
  const moveSkillGroup = (id: string, direction: -1 | 1) => {
    const groups = [...cv.skillGroups];
    const from = groups.findIndex((g) => g.id === id);
    const to = from + direction;
    if (from < 0 || to < 0 || to >= groups.length) return;
    [groups[from], groups[to]] = [groups[to], groups[from]];
    setSkillGroups(groups);
  };

  // ---- saving ----
  // Everything that gets saved, as one comparable string. The document id
  // isn't part of it, so assigning a new id doesn't count as an edit.
  const saveKey = useMemo(
    () =>
      JSON.stringify({
        content,
        title: cv.title,
        templateId: cv.templateStyle,
        jobDescription: cv.jobDescription ?? null,
      }),
    [content, cv.title, cv.templateStyle, cv.jobDescription]
  );
  const [lastSavedKey, setLastSavedKey] = useState(saveKey);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "error">("idle");
  const [saveError, setSaveError] = useState<string | null>(null);
  const [hasSaved, setHasSaved] = useState(false);
  // The header says "Saved" for a moment after each save.
  const [showSavedLabel, setShowSavedLabel] = useState(false);
  const savedLabelTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => clearTimeout(savedLabelTimerRef.current ?? undefined), []);
  const isDirty = saveKey !== lastSavedKey;

  const latestRef = useRef({ cv, saveKey });
  useEffect(() => {
    latestRef.current = { cv, saveKey };
  }, [cv, saveKey]);
  const lastSavedKeyRef = useRef(saveKey);
  const failedKeyRef = useRef<string | null>(null);
  const inFlightRef = useRef<Promise<string> | null>(null);
  // A CV started from a blank guided flow has no backend document yet — one
  // is created the first time it needs saving, so nothing typed is lost.
  const docIdRef = useRef<string | null>(initialData.id && initialData.id !== "cv-new" ? initialData.id : null);

  // Saves the latest edits, waiting for any save already running first.
  // Resolves with the document id; skips the request when nothing changed.
  const saveNow = useCallback(async (): Promise<string> => {
    if (inFlightRef.current) {
      await inFlightRef.current.catch(() => undefined);
    }
    const { cv: snapshot, saveKey: key } = latestRef.current;
    if (docIdRef.current && key === lastSavedKeyRef.current) return docIdRef.current;

    const run = (async () => {
      let id = docIdRef.current;
      if (!id) {
        const doc = await createCvDocument(undefined, snapshot.templateStyle);
        id = doc.id;
        docIdRef.current = id;
        const newId = id;
        setCv((prev) => ({ ...prev, id: newId }));
      }
      await updateCvContent(id, {
        content: toCVContentPatch(snapshot),
        jobDescription: snapshot.jobDescription ?? null,
        title: snapshot.title,
        templateId: snapshot.templateStyle,
      });
      return id;
    })();

    inFlightRef.current = run;
    setSaveStatus("saving");
    try {
      const id = await run;
      lastSavedKeyRef.current = key;
      failedKeyRef.current = null;
      setLastSavedKey(key);
      setHasSaved(true);
      setShowSavedLabel(true);
      clearTimeout(savedLabelTimerRef.current ?? undefined);
      savedLabelTimerRef.current = setTimeout(() => setShowSavedLabel(false), 2500);
      setSaveStatus("idle");
      setSaveError(null);
      return id;
    } catch (err) {
      failedKeyRef.current = key;
      setSaveStatus("error");
      setSaveError(err instanceof ApiError ? err.message : "Couldn't save your changes.");
      throw err;
    } finally {
      if (inFlightRef.current === run) inFlightRef.current = null;
    }
  }, []);

  // A failed save is announced once, with a way to retry; it clears itself
  // as soon as a save goes through.
  useEffect(() => {
    if (saveStatus === "error") {
      toast.error("Couldn't save your changes", {
        id: "save-error",
        description: `${saveError ?? ""} Your edits are still here.`.trim(),
        action: { label: "Try again", onClick: () => saveNow().catch(() => undefined) },
      });
    } else if (saveStatus === "idle") {
      toast.dismiss("save-error");
    }
  }, [saveStatus, saveError, saveNow, toast]);

  // Autosave shortly after edits stop. A failed save isn't retried in a loop —
  // the next edit (or Try again / Ctrl+S) tries again.
  useEffect(() => {
    if (!isDirty || saveStatus === "saving") return;
    if (saveStatus === "error" && failedKeyRef.current === saveKey) return;
    const timer = setTimeout(() => {
      saveNow().catch(() => undefined);
    }, AUTOSAVE_DELAY_MS);
    return () => clearTimeout(timer);
  }, [saveKey, isDirty, saveStatus, saveNow]);

  // Warn before closing the tab with edits that haven't reached the server.
  useEffect(() => {
    if (!isDirty && saveStatus !== "saving") return;
    const handler = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [isDirty, saveStatus]);

  // Ctrl/Cmd+S saves right away instead of opening the browser's save dialog.
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "s") {
        e.preventDefault();
        saveNow()
          .then(() => toast.success("Saved", { id: "manual-save", duration: 2000 }))
          .catch(() => undefined);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [saveNow, toast]);

  // ---- CV score (lib/cv-score) ----
  // The same rules the backend stores the score with, run live on every edit.
  // Only the sections this template shows count for half-filled entries. (The React Compiler memoizes this.)
  const cvScore = scoreEditorCv(cv, content, currentTemplate?.sections.map((s) => s.key) ?? templateSectionKeys);
  const jobState = jobRequirementsState(cv);
  const { isPaywallOpen, openPaywall, closePaywall, isProRequired } = useProGate();
  const analyzeJobMutation = useAnalyzeJobRequirements();
  const reviewMutation = useReviewCv();
  const polishCvMutation = usePolishCv();
  const [jobError, setJobError] = useState<string | null>(null);
  const [reviewTips, setReviewTips] = useState<CvReviewTip[] | null>(null);
  const [polishingKey, setPolishingKey] = useState<string | null>(null);
  // The job description an analysis failed for — not retried automatically until it changes.
  const failedJdRef = useRef<string | null>(null);

  // Reads the job description once (the backend caches it per job description),
  // so the job-match part of the score always uses the same requirements.
  const runJobAnalysis = useCallback(async () => {
    const jobDescription = latestRef.current.cv.jobDescription ?? "";
    if (!jobDescription.trim()) return;
    setJobError(null);
    try {
      const id = await saveNow();
      const res = await analyzeJobMutation.mutateAsync({ cvId: id, jobDescription });
      failedJdRef.current = null;
      setCv((prev) => ({ ...prev, jobRequirements: { forJobDescription: jobDescription, data: res.jobRequirements.data } }));
    } catch (err) {
      failedJdRef.current = jobDescription;
      setJobError(err instanceof ApiError ? err.message : "Couldn't read the job description.");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- mutateAsync is stable; the mutation object isn't
  }, [saveNow]);

  const jobPending = jobState.status === "pending";
  const analyzingJob = analyzeJobMutation.isPending;
  useEffect(() => {
    if (!jobPending || analyzingJob || failedJdRef.current === (cv.jobDescription ?? "")) return;
    // Wait until the user stops typing the job description.
    const timer = setTimeout(() => void runJobAnalysis(), AUTOSAVE_DELAY_MS);
    return () => clearTimeout(timer);
  }, [jobPending, analyzingJob, cv.jobDescription, runJobAnalysis]);

  const focusSignalRef = useRef(0);
  const focusOn = (target: EditorTarget) => {
    setActiveSection(target.section);
    if (target.field) setFocusTarget({ ...target, signal: ++focusSignalRef.current });
    else formScrollRef.current?.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleReview = async () => {
    try {
      const id = await saveNow();
      const { tips } = await reviewMutation.mutateAsync({ cvId: id, content: toCVContentPatch(latestRef.current.cv) });
      setReviewTips(tips);
    } catch (err) {
      toast.error("Couldn't check your CV", { description: err instanceof ApiError ? err.message : "Please try again in a moment." });
    }
  };

  // Applies an AI polish to the editor. Entries are matched by id, captured
  // when the request was sent, so a reorder in the meantime can't misplace them.
  const applyPolish = (prev: CvData, patch: CvPolishPatch, experienceIds: string[]): CvData => {
    const next = { ...prev };
    if (patch.summary !== undefined) next.summary = patch.summary;
    if (patch.headline !== undefined) next.personalInfo = { ...prev.personalInfo, headline: patch.headline };
    if (patch.experience) {
      const byId = new Map(patch.experience.map((e) => [experienceIds[e.index], e.bullets]));
      next.experiences = prev.experiences.map((exp) => {
        const bullets = byId.get(exp.id);
        return bullets ? { ...exp, bullets: bullets.map((text) => ({ id: newLocalId("b"), label: "", text })) } : exp;
      });
    }
    if (patch.skillGroups) {
      next.skillGroups = patch.skillGroups.map((g) => ({ id: newLocalId("sg"), category: g.category, items: g.items }));
      next.skills = flattenSkillGroups(next.skillGroups);
    }
    return next;
  };

  // Undo puts back only what the polish replaced, keeping any edits made since.
  const revertPolish = (current: CvData, before: CvData, patch: CvPolishPatch, experienceIds: string[]): CvData => {
    const next = { ...current };
    if (patch.summary !== undefined) next.summary = before.summary;
    if (patch.headline !== undefined) next.personalInfo = { ...current.personalInfo, headline: before.personalInfo.headline };
    if (patch.experience) {
      const touched = new Set(patch.experience.map((e) => experienceIds[e.index]));
      const original = new Map(before.experiences.map((exp) => [exp.id, exp.bullets]));
      next.experiences = current.experiences.map((exp) =>
        touched.has(exp.id) && original.has(exp.id) ? { ...exp, bullets: original.get(exp.id)! } : exp
      );
    }
    if (patch.skillGroups) {
      next.skillGroups = before.skillGroups;
      next.skills = before.skills;
    }
    return next;
  };

  const handleScorePolish = async (targets: PolishTarget[] | "all", key: string) => {
    if (!isPro) {
      openPaywall();
      return;
    }
    setPolishingKey(key);
    try {
      const id = await saveNow();
      const before = latestRef.current.cv;
      const experienceIds = before.experiences.map((exp) => exp.id);
      const res = await polishCvMutation.mutateAsync({ cvId: id, content: toCVContentPatch(before), targets });
      const { patch } = res;
      const changed = [
        patch.summary !== undefined && "summary",
        patch.headline !== undefined && "headline",
        patch.experience?.length && `${patch.experience.length} role${patch.experience.length === 1 ? "" : "s"}`,
        patch.skillGroups && "skills",
      ].filter(Boolean) as string[];
      if (changed.length === 0) {
        toast.info("Nothing to change", { description: "AI couldn't improve this without inventing details. Try editing it yourself." });
        return;
      }
      setCv((prev) => applyPolish(prev, patch, experienceIds));
      toast.success(`Score ${res.score} → ${res.projectedScore}`, {
        description: `Polished your ${changed.join(", ")}. Check the wording is still true to you.`,
        action: { label: "Undo", onClick: () => setCv((prev) => revertPolish(prev, before, patch, experienceIds)) },
        duration: 8000,
      });
    } catch (err) {
      if (isProRequired(err)) return;
      toast.error("Couldn't polish your CV", { description: err instanceof ApiError ? err.message : "Please try again in a moment." });
    } finally {
      setPolishingKey(null);
    }
  };

  // What the backend requires before it will export (see POST /cv/:id/finalize).
  const missingForExport = [
    !cv.personalInfo.fullName.trim() && { label: "Your full name", section: "personal" },
    !EMAIL_PATTERN.test(cv.personalInfo.email.trim()) && { label: "A valid email address", section: "personal" },
    cv.experiences.length === 0 && { label: "At least one experience entry", section: "experience" },
    cv.skills.length === 0 && { label: "At least one skill", section: "skills" },
  ].filter(Boolean) as { label: string; section: EditorSection }[];
  const sectionsMissingForExport = new Set(missingForExport.map((m) => m.section));

  // A CV that must be paid for before it downloads (see UnlockCvModal).
  const [unlockCv, setUnlockCv] = useState<ReturnType<typeof cvUnlockFromError>>(null);

  // Save → finalize (validates it's complete) → render server-side → save file.
  const handleDownload = async () => {
    if (missingForExport.length > 0) {
      setShowExportChecklist(true);
      return;
    }
    setIsDownloading(true);
    try {
      const id = await saveNow();
      await finalizeCvDocument(id);
      const blob = await downloadCvPdf(id);

      const fileName = getCvFileName(cv.personalInfo.fullName, cv.title);
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);

      toast.success("Your PDF is ready", { description: `Saved as ${fileName}`, moxie: "downloaded", placement: "top" });
      onDownloaded?.(id);
    } catch (err) {
      // Made past the free CV: pay for it (or get a plan), then download.
      const unlock = cvUnlockFromError(err);
      if (unlock) {
        setUnlockCv(unlock);
        return;
      }
      // One message at a time — retrying replaces it instead of stacking another.
      toast.error("Couldn't create the PDF", {
        id: "pdf-error",
        description: err instanceof ApiError ? err.message : "Please try again.",
        action: { label: "Try again", onClick: () => void handleDownload() },
      });
    } finally {
      setIsDownloading(false);
    }
  };

  // "Tailor to a job": saves, then opens the Tailor flow on this CV (same template).
  // Tailoring makes a new CV from it, so this one stays as it is.
  const router = useRouter();
  const [openingTailor, setOpeningTailor] = useState(false);
  const handleTailorToJob = async () => {
    setOpeningTailor(true);
    try {
      const id = await saveNow();
      router.push(dashboardFlowHref("tailor", { cv: id, template: cv.templateStyle }));
    } catch {
      setOpeningTailor(false);
      toast.error("Couldn't save your changes", { description: "Try again in a moment." });
    }
  };

  // Leaving the editor (Back or Done) flushes pending edits first, so nothing
  // typed is lost. If a save fails the user stays here, with the choice to leave anyway.
  const handleDone = async () => {
    if (isDirty || saveStatus === "saving") {
      setIsSaving(true);
      try {
        await saveNow();
      } catch {
        setIsSaving(false);
        toast.error("Your latest changes aren't saved yet", {
          id: "save-error",
          description: "Stay to try again, or leave and lose them.",
          action: { label: "Leave without saving", onClick: onBack },
        });
        return;
      }
      setIsSaving(false);
    }
    if (hasSaved || isDirty) {
      onSave({ ...latestRef.current.cv, id: docIdRef.current ?? latestRef.current.cv.id, atsScore: cvScore.total });
    } else {
      onBack();
    }
  };

  const handlePolish = async () => {
    const beforePolish = cv.summary;
    try {
      const { summary } = await polishSummaryMutation.mutateAsync({
        summary: cv.summary,
        title: cv.personalInfo.headline || cv.targetRole,
        skills: cv.skills,
        experienceBullets: cv.experiences.flatMap((exp) => exp.bullets.map(bulletToText)).slice(0, 20),
      });
      setCv((prev) => ({ ...prev, summary }));
      setPrePolishSummary(beforePolish);
      setPolishedSummary(summary);
      toast.success("Summary polished", {
        action: { label: "Undo", onClick: () => setCv((prev) => ({ ...prev, summary: beforePolish })) },
      });
    } catch (err) {
      toast.error("Couldn't polish your summary", {
        description: err instanceof ApiError ? err.message : "Please try again in a moment.",
      });
    }
  };

  const handlePhotoUpload = async (file: File) => {
    try {
      const photo = await resizePhoto(file);
      if (photo.length > 300_000) throw new Error("That image is too large even after resizing. Try a smaller one.");
      setPersonal({ photo });
    } catch (err) {
      toast.error("Couldn't use that photo", { description: err instanceof Error ? err.message : undefined });
    }
  };

  // Header save state: a cloud icon, with a word beside it while saving, just
  // after a save, and when a save failed. The tooltip always says what it means.
  const saveIndicator =
    saveStatus === "saving"
      ? { icon: <Loader2 className="w-4 h-4 animate-spin text-neutral-400" />, label: "Saving your changes…", text: "Saving…", tone: "text-neutral-500" }
      : saveStatus === "error"
        ? { icon: <CloudAlert className="w-4 h-4 text-red-600" />, label: "Couldn't save. Click to try again", text: "Not saved", tone: "text-red-600" }
        : isDirty
          ? { icon: <CloudCheck className="w-4 h-4 text-neutral-300" />, label: "Saving shortly…", text: null, tone: "" }
          : hasSaved || cv.id !== "cv-new"
            ? {
                icon: <CloudCheck className="w-4 h-4 text-emerald-600" />,
                label: "All changes saved",
                text: showSavedLabel ? "Saved" : null,
                tone: "text-emerald-700",
              }
            : null;



  // The same score panel sits in the top bar and on the phone preview.
  const scorePanelProps: CvScorePanelProps = {
    score: cvScore,
    isPro,
    isSubscribed,
    sections: sectionStatuses,
    onOpenSection: (section) => {
      setMobilePreviewOpen(false);
      openSection(section);
    },
    job: jobState,
    jobDescription: cv.jobDescription ?? "",
    onJobDescriptionChange: (jobDescription) => {
      failedJdRef.current = null;
      setJobError(null);
      setCv((prev) => ({ ...prev, jobDescription }));
    },
    analyzingJob,
    jobError,
    onRetryJob: () => void runJobAnalysis(),
    onGoTo: (check: ScoreCheck) => {
      setMobilePreviewOpen(false);
      focusOn(checkTarget(cv, check));
    },
    onPolish: (targets, key) => void handleScorePolish(targets, key),
    polishingKey,
    onReview: () => void handleReview(),
    reviewing: reviewMutation.isPending,
    tips: reviewTips,
    onUpgrade: openPaywall,
  };

  const positionKey = shownSection === "research" || shownSection === "teaching" || shownSection === "activities" ? shownSection : null;

  // The preview's view toggle, above the desktop preview.
  const renderPreviewControls = () => (
    <div className="flex flex-wrap items-center gap-2 min-w-0">
      {/* What the preview shows: the CV exactly as it will download, or with its gaps highlighted. */}
      <div data-tour="editor-gaps" className="inline-flex p-1 rounded-lg bg-white border border-neutral-300 shadow-[0_1px_2px_rgba(0,0,0,0.05)]" role="group" aria-label="Preview view">
        {(
          [
            { gaps: false, label: "PDF view", icon: Eye, hint: "Exactly what your downloaded PDF will look like" },
            { gaps: true, label: "Show gaps", icon: ListChecks, hint: "Highlight what's missing, then click a highlight to fill it in" },
          ] as const
        ).map(({ gaps, label, icon: Icon, hint }) => {
          const selected = showGaps === gaps;
          return (
            <button
              key={label}
              type="button"
              aria-pressed={selected}
              onClick={() => setShowGaps(gaps)}
              title={hint}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm transition-colors cursor-pointer ${
                selected
                  ? "bg-accent-soft text-neutral-700 font-semibold ring-1 ring-accent-border"
                  : "text-neutral-400 font-medium hover:text-neutral-800 hover:bg-neutral-100"
              }`}
            >
              <Icon className="w-4 h-4" />
              {label}
              {gaps && !selected && missingDetails.length > 0 && (
                <span className="ml-0.5 min-w-5 h-5 px-1 rounded-full text-xs font-bold flex items-center justify-center bg-accent text-white">
                  {missingDetails.length}
                </span>
              )}
            </button>
          );
        })}
      </div>

    </div>
  );

  return (
    <div className="h-screen w-full flex flex-col bg-[#fdfdfd] text-neutral-900 font-sans overflow-hidden">
      {/* ================= TOP BAR ================= */}
      <header className="h-16 bg-white border-b border-neutral-200 px-4 sm:px-6 flex items-center justify-between gap-3 z-30 shrink-0 select-none">
        <div className="flex items-center gap-2 min-w-0">
          <button
            type="button"
            onClick={handleDone}
            disabled={isSaving}
            className="p-2 rounded-lg border border-transparent text-neutral-500 hover:text-neutral-950 hover:bg-neutral-50 hover:border-neutral-200 transition-colors cursor-pointer disabled:opacity-50"
            aria-label="Back to the dashboard"
            title="Back to the dashboard (your changes are saved automatically)"
          >
            {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowLeft className="w-4 h-4" />}
          </button>
          <input
            type="text"
            value={cv.title}
            onChange={(e) => setCv((prev) => ({ ...prev, title: e.target.value }))}
            placeholder="Untitled resume"
            aria-label="Resume name"
            className="min-w-0 font-semibold text-sm sm:text-base text-neutral-950 bg-transparent border border-transparent hover:border-neutral-200 focus:border-accent focus:ring-4 focus:ring-accent/10 focus:outline-none rounded-lg px-2 py-1 truncate max-w-[160px] sm:max-w-[300px] transition"
          />
          {saveIndicator && (
            <button
              type="button"
              onClick={saveStatus === "error" ? () => saveNow().catch(() => undefined) : undefined}
              className={`shrink-0 inline-flex items-center gap-1.5 px-1.5 py-1 rounded-md ${saveStatus === "error" ? "hover:bg-red-50 cursor-pointer" : "cursor-default"}`}
              aria-label={saveIndicator.label}
              title={saveIndicator.label}
            >
              {saveIndicator.icon}
              {saveIndicator.text && (
                <span className={`toast-enter text-sm font-medium whitespace-nowrap ${saveIndicator.tone}`}>{saveIndicator.text}</span>
              )}
            </button>
          )}
        </div>

        <div className="flex items-center gap-2">
          {/* From lg the score sits on the preview's toolbar instead. */}
          <div className="lg:hidden">
            <CvScorePanel {...scorePanelProps} tour={narrowScreen} />
          </div>

          {/* Tailor this CV to a job: the Tailor flow, starting from this CV. */}
          <button
            type="button"
            onClick={() => void handleTailorToJob()}
            disabled={openingTailor}
            className={secondaryButtonClass}
            title="Make a copy of this CV tailored to a job description"
          >
            {openingTailor ? <Loader2 className="w-4 h-4 animate-spin" /> : <Target className="w-4 h-4 text-accent-strong" />}
            <span className="hidden md:inline">Tailor to a job</span>
          </button>

          {/* Below lg the preview column is hidden — this opens it full screen. */}
          <button
            type="button"
            onClick={() => setMobilePreviewOpen(true)}
            className={`${secondaryButtonClass} max-sm:hidden lg:hidden`}
            title="See your CV"
          >
            <Eye className="w-4 h-4 text-neutral-500" />
            <span className="hidden sm:inline">Preview</span>
          </button>

          <button
            type="button"
            onClick={() => setShowWalkthrough(true)}
            className={`${secondaryButtonClass} max-sm:hidden`}
            title="Take a quick tour of the editor"
          >
            <Compass className="w-4 h-4 text-neutral-500" />
            <span className="hidden lg:inline">Tour</span>
          </button>

          <button
            type="button"
            onClick={() => setTemplateGalleryOpen(true)}
            className={secondaryButtonClass}
            title={currentTemplate ? `Change template (now: ${currentTemplate.name})` : "Change template"}
          >
            <LayoutTemplate className="w-4 h-4 text-neutral-500" />
            <span className="hidden sm:inline">Templates</span>
            <ChevronDown className="w-3.5 h-3.5 text-neutral-400" />
          </button>

          <div className="relative">
            <button
              type="button"
              disabled={isDownloading}
              onClick={handleDownload}
              data-tour="editor-download"
              className={ACCENT_BUTTON}
              title={missingForExport.length > 0 ? "A few details are needed before downloading" : "Download PDF"}
            >
              {isDownloading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
              <span className="hidden sm:inline">{isDownloading ? "Preparing…" : "Download PDF"}</span>
              {missingForExport.length > 0 && (
                <span className="ml-0.5 min-w-5 h-5 px-1 rounded-full bg-white text-accent-strong text-xs font-bold flex items-center justify-center">
                  {missingForExport.length}
                </span>
              )}
            </button>

            {showExportChecklist && missingForExport.length > 0 && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setShowExportChecklist(false)} />
                <div className="absolute right-0 mt-2 z-50 w-80 rounded-lg border border-neutral-300 bg-white shadow-xl p-4">
                  <div className="text-sm font-semibold text-neutral-950">Almost ready to download</div>
                  <p className="mt-0.5 text-sm text-neutral-500">Add these, then download again:</p>
                  <ul className="mt-3 space-y-1">
                    {missingForExport.map((item) => (
                      <li key={item.label}>
                        <button
                          type="button"
                          onClick={() => {
                            openSection(item.section);
                            setShowExportChecklist(false);
                          }}
                          className="w-full flex items-center gap-3 px-2.5 py-2 rounded-lg text-left text-sm font-medium text-neutral-800 hover:bg-neutral-50 border border-transparent hover:border-neutral-200 transition-colors cursor-pointer"
                        >
                          <SectionIcon section={item.section} />
                          <span className="flex-1">{item.label}</span>
                          <span className="text-accent-strong font-semibold">Fix</span>
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              </>
            )}
          </div>

        </div>
      </header>

      {/* Section tabs span the form and the preview, so fewer hide. */}
          <nav data-tour="editor-tabs" aria-label="CV sections" className="shrink-0 bg-white border-b border-neutral-200 px-4 sm:px-6 py-2.5 z-20">
            <OverflowRow>
              {visibleSections.map((sec) => {
                const active = shownSection === sec.id;
                const required = sectionsMissingForExport.has(sec.id);
                const hasGaps = sectionsWithGaps.has(sec.id);
                return (
                  <button
                    key={sec.id}
                    data-tab={sec.id}
                    type="button"
                    aria-current={active ? "page" : undefined}
                    onClick={() => openSection(sec.id)}
                    title={required ? "Needed before you can download" : hasGaps ? "Has missing details. Click to fill them in" : undefined}
                    className={`relative inline-flex items-center gap-2 px-3 py-2 rounded-lg border text-sm whitespace-nowrap transition-colors cursor-pointer ${
                      active
                        ? "bg-neutral-50 border-neutral-300 font-semibold text-neutral-950"
                        : "border-transparent font-medium text-neutral-600 hover:bg-neutral-50 hover:border-neutral-200 hover:text-neutral-950"
                    }`}
                  >
                    {sec.label}
                    {required ? (
                      <span className="w-2 h-2 rounded-full bg-red-500" />
                    ) : hasGaps ? (
                      <span className="w-2 h-2 rounded-full bg-accent" />
                    ) : null}
                  </button>
                );
              })}
            </OverflowRow>
          </nav>
      {/* ================= MAIN SPLIT WORKSPACE ================= */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* LEFT COLUMN: THE FORM */}
        <div ref={formScrollRef} onScroll={handleFormScroll} data-tour="editor-form" className="w-full lg:w-[48%] h-full overflow-y-auto bg-[#fafafa] border-r border-neutral-200">

          <div className="p-6 sm:p-8 space-y-6">
            {/* ---- CONTACT ---- */}
            {shownSection === "personal" && (
              <div className="space-y-5">
                <SectionHeader
                  title="Contact & header"
                  subtitle="Who you are and how to reach you"
                  icon={SECTION_META.personal.icon}
                  tone={SECTION_META.personal.tone}
                />
                <div className={CARD}>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Field name="fullName" label="Full name" value={cv.personalInfo.fullName} onChange={(v) => setPersonal({ fullName: v })} />
                    <Field name="headline"
                      label="Headline"
                      value={cv.personalInfo.headline}
                      placeholder="Frontend Engineer"
                      onChange={(v) => setPersonal({ headline: v })}
                    />
                    <Field name="email" label="Email" type="email" value={cv.personalInfo.email} onChange={(v) => setPersonal({ email: v })} />
                    <Field name="phone" label="Phone" value={cv.personalInfo.phone} onChange={(v) => setPersonal({ phone: v })} />
                    <Field name="location" label="Location" value={cv.personalInfo.location} placeholder="City, Country" onChange={(v) => setPersonal({ location: v })} />
                  </div>
                </div>

                {templateShowsPhoto && (
                  <div className={`${CARD} flex items-center gap-4 space-y-0`} data-field="photo">
                    {cv.personalInfo.photo ? (
                      // eslint-disable-next-line @next/next/no-img-element -- a local data URL, not an optimizable remote image
                      <img src={cv.personalInfo.photo} alt="Your photo" className="w-16 h-16 rounded-lg object-cover border border-neutral-300" />
                    ) : (
                      <div className="w-16 h-16 rounded-lg bg-neutral-50 border border-dashed border-neutral-300 flex items-center justify-center text-neutral-300">
                        <User className="w-6 h-6" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-semibold text-neutral-900">Photo</div>
                      <p className="text-xs text-neutral-500">This template has room for one. PNG, JPEG, or WebP.</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <label className={secondaryButtonClass}>
                        <Upload className="w-4 h-4" />
                        <span>{cv.personalInfo.photo ? "Change" : "Upload"}</span>
                        <input
                          type="file"
                          accept="image/png,image/jpeg,image/webp"
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            e.target.value = "";
                            if (file) handlePhotoUpload(file);
                          }}
                        />
                      </label>
                      {cv.personalInfo.photo && (
                        <button
                          type="button"
                          onClick={() => setPersonal({ photo: "" })}
                          className="p-2 rounded-lg text-neutral-400 hover:text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
                          aria-label="Remove photo"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                )}

                <div className={CARD} data-field="links">
                  <span className={labelClass}>Links</span>
                  {cv.personalInfo.links.map((link) => (
                    <div key={link.id} className="flex items-center gap-2">
                      <input
                        type="text"
                        value={link.label}
                        placeholder="Label, e.g. GitHub"
                        aria-label="Link label"
                        onChange={(e) =>
                          setLinks(cv.personalInfo.links.map((l) => (l.id === link.id ? { ...l, label: e.target.value } : l)))
                        }
                        className={`${inputClass} w-1/3`}
                      />
                      <input
                        type="text"
                        value={link.url}
                        placeholder="github.com/you"
                        aria-label="Link address"
                        onChange={(e) =>
                          setLinks(cv.personalInfo.links.map((l) => (l.id === link.id ? { ...l, url: e.target.value } : l)))
                        }
                        className={inputClass}
                      />
                      <button
                        type="button"
                        onClick={() => setLinks(cv.personalInfo.links.filter((l) => l.id !== link.id))}
                        className="p-2 rounded-lg text-neutral-400 hover:text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
                        aria-label="Remove link"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                  <AddButton
                    label="Add link"
                    onClick={() => setLinks([...cv.personalInfo.links, { id: newLocalId("link"), label: "", url: "" }])}
                  />
                </div>
              </div>
            )}

            {/* ---- SUMMARY ---- */}
            {shownSection === "summary" && (
              <div className="space-y-5">
                <SectionHeader
                  title={sectionLabel("summary")}
                  subtitle="2-4 sentences on who you are and what you do best"
                  icon={SECTION_META.summary.icon}
                  tone={SECTION_META.summary.tone}
                >
                  <button
                    type="button"
                    disabled={polishSummaryMutation.isPending || !cv.summary.trim()}
                    onClick={handlePolish}
                    data-tour="editor-polish"
                    className={`${secondaryButtonClass} text-accent-strong`}
                    title={cv.summary.trim() ? "Rewrite it with AI" : "Write a draft first"}
                  >
                    {polishSummaryMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wand className="w-4 h-4" />}
                    {polishSummaryMutation.isPending ? "Polishing…" : "AI Polish"}
                  </button>
                </SectionHeader>
                <div className={CARD} data-field="summary">
                  <textarea
                    rows={6}
                    value={cv.summary}
                    aria-label="Summary"
                    placeholder="Product designer with 6 years of experience in…"
                    onChange={(e) => setCv((prev) => ({ ...prev, summary: e.target.value }))}
                    className={`${inputClass} leading-relaxed resize-y`}
                  />
                  {prePolishSummary !== null && polishedSummary !== null && (
                    <div className="inline-flex p-1 rounded-lg bg-neutral-100 border border-neutral-200">
                      {(
                        [
                          ["Previous", prePolishSummary],
                          ["AI polished", polishedSummary],
                        ] as const
                      ).map(([label, text]) => (
                        <button
                          key={label}
                          type="button"
                          onClick={() => setCv((prev) => ({ ...prev, summary: text }))}
                          className={`px-3 py-1.5 rounded-md text-sm font-semibold transition-colors cursor-pointer ${
                            cv.summary === text ? "bg-white text-neutral-950 shadow-[0_1px_2px_rgba(0,0,0,0.06)]" : "text-neutral-500 hover:text-neutral-900"
                          }`}
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ---- EXPERIENCE ---- */}
            {shownSection === "experience" && (
              <ListSection
                focus={focusTarget}
                section="experience"
                title={sectionLabel("experience")}
                subtitle="Most recent first"
                addLabel="Add role"
                emptyMessage="No roles yet. Add your first one."
                items={cv.experiences}
                onAdd={() => addItem("experiences", blankExperience())}
                {...listHandlers("experiences")}
                itemTitle={(exp, idx) => exp.role || exp.company || `Role ${idx + 1}`}
                itemMeta={(exp) => metaLine(exp.role ? exp.company : "", dateLine(exp.startDate, exp.endDate, exp.isCurrent))}
                renderItem={(exp) => (
                  <>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <Field name="role" label="Role" value={exp.role} onChange={(v) => updateItem("experiences", exp.id, { role: v })} />
                      <Field name="company" label="Company" value={exp.company} onChange={(v) => updateItem("experiences", exp.id, { company: v })} />
                      <Field name="location" label="Location" value={exp.location} onChange={(v) => updateItem("experiences", exp.id, { location: v })} />
                      <Field name="url"
                        label="Company website"
                        value={exp.url}
                        placeholder="company.com"
                        onChange={(v) => updateItem("experiences", exp.id, { url: v })}
                      />
                      <DateRangeFields
                        start={exp.startDate}
                        end={exp.endDate}
                        isCurrent={exp.isCurrent}
                        currentLabel="I currently work here"
                        onChange={(patch) => updateItem("experiences", exp.id, patch)}
                      />
                    </div>
                    <BulletEditor bullets={exp.bullets} onChange={(bullets) => updateItem("experiences", exp.id, { bullets })} />
                  </>
                )}
              />
            )}

            {/* ---- EDUCATION ---- */}
            {shownSection === "education" && (
              <ListSection
                focus={focusTarget}
                section="education"
                title={sectionLabel("education")}
                addLabel="Add degree"
                emptyMessage="No education added yet."
                items={cv.education}
                onAdd={() => addItem("education", blankEducation())}
                {...listHandlers("education")}
                itemTitle={(edu, idx) => edu.school || edu.degree || `Education ${idx + 1}`}
                itemMeta={(edu) => metaLine([edu.degree, edu.field].filter(Boolean).join(" in "), dateLine(edu.startDate, edu.endDate))}
                renderItem={(edu) => (
                  <>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <Field name="school" label="School or university" value={edu.school} onChange={(v) => updateItem("education", edu.id, { school: v })} />
                      <Field name="location" label="Location" value={edu.location} onChange={(v) => updateItem("education", edu.id, { location: v })} />
                      <Field name="degree" label="Degree" value={edu.degree} placeholder="B.Sc." onChange={(v) => updateItem("education", edu.id, { degree: v })} />
                      <Field name="field"
                        label="Field of study"
                        value={edu.field}
                        placeholder="Computer Engineering"
                        onChange={(v) => updateItem("education", edu.id, { field: v })}
                      />
                      <Field name="gpa" label="GPA" value={edu.gpa} placeholder="3.6/4.0" onChange={(v) => updateItem("education", edu.id, { gpa: v })} />
                      <Field name="honors" label="Honors" value={edu.honors} onChange={(v) => updateItem("education", edu.id, { honors: v })} />
                      <Field name="startDate" label="Start" value={edu.startDate} placeholder="2019-09" onChange={(v) => updateItem("education", edu.id, { startDate: v })} />
                      <Field name="endDate"
                        label="End or graduation"
                        value={edu.endDate}
                        placeholder="2023-06 or Expected 2026"
                        onChange={(v) => updateItem("education", edu.id, { endDate: v })}
                      />
                    </div>
                    <BulletEditor bullets={edu.bullets} onChange={(bullets) => updateItem("education", edu.id, { bullets })} />
                  </>
                )}
              />
            )}

            {/* ---- PROJECTS ---- */}
            {shownSection === "projects" && (
              <ListSection
                focus={focusTarget}
                section="projects"
                title={sectionLabel("projects")}
                addLabel="Add project"
                emptyMessage="No projects added yet."
                items={cv.projects}
                onAdd={() => addItem("projects", blankProject())}
                {...listHandlers("projects")}
                itemTitle={(proj, idx) => proj.name || `Project ${idx + 1}`}
                itemMeta={(proj) => metaLine(proj.subtitle, proj.tech.join(", "))}
                renderItem={(proj) => (
                  <>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <Field name="name" label="Name" value={proj.name} onChange={(v) => updateItem("projects", proj.id, { name: v })} />
                      <Field name="url"
                        label="Link"
                        value={proj.url}
                        placeholder="github.com/you/project"
                        onChange={(v) => updateItem("projects", proj.id, { url: v })}
                      />
                    </div>
                    <Field name="subtitle"
                      label="One-line description"
                      value={proj.subtitle}
                      placeholder="Offline-first inventory platform"
                      onChange={(v) => updateItem("projects", proj.id, { subtitle: v })}
                    />
                    <div data-field="tech">
                      <span className={labelClass}>Tech stack</span>
                      <TagInput
                        items={proj.tech}
                        onChange={(tech) => updateItem("projects", proj.id, { tech })}
                        placeholder="Type a technology and press Enter"
                      />
                    </div>
                    <BulletEditor bullets={proj.bullets} onChange={(bullets) => updateItem("projects", proj.id, { bullets })} />
                  </>
                )}
              />
            )}

            {/* ---- SKILLS ---- */}
            {shownSection === "skills" && (
              <ListSection
                focus={focusTarget}
                section="skills"
                title={sectionLabel("skills")}
                subtitle={
                  cv.skills.length
                    ? `${cv.skills.length} skills in ${cv.skillGroups.length} group${cv.skillGroups.length === 1 ? "" : "s"}`
                    : "Group them, e.g. Languages, Frontend, Tools"
                }
                addLabel="Add skill group"
                emptyMessage="No skills yet. Add a group such as Languages or Frontend."
                items={cv.skillGroups}
                onAdd={() => setSkillGroups([...cv.skillGroups, { id: newLocalId("sg"), category: "", items: [] }])}
                onRemove={(id) => setSkillGroups(cv.skillGroups.filter((g) => g.id !== id))}
                onMove={moveSkillGroup}
                itemTitle={(group, idx) => group.category || `Group ${idx + 1}`}
                itemMeta={(group) => (group.items.length ? `${group.items.length} skill${group.items.length === 1 ? "" : "s"}` : "")}
                renderItem={(group) => (
                  <>
                    <Field name="category"
                      label="Category"
                      value={group.category}
                      placeholder="e.g. Frontend (leave empty for an unlabeled list)"
                      onChange={(v) => setSkillGroups(cv.skillGroups.map((g) => (g.id === group.id ? { ...g, category: v } : g)))}
                    />
                    <div data-field="items">
                      <span className={labelClass}>Skills</span>
                      <TagInput
                        items={group.items}
                        onChange={(items) => setSkillGroups(cv.skillGroups.map((g) => (g.id === group.id ? { ...g, items } : g)))}
                        placeholder="Type a skill and press Enter"
                      />
                    </div>
                  </>
                )}
              />
            )}

            {/* ---- CERTIFICATIONS ---- */}
            {shownSection === "certifications" && (
              <ListSection
                focus={focusTarget}
                section="certifications"
                title={sectionLabel("certifications")}
                addLabel="Add certification"
                emptyMessage="No certifications added yet."
                items={cv.certifications}
                onAdd={() => addItem("certifications", blankCertification())}
                {...listHandlers("certifications")}
                itemTitle={(cert, idx) => cert.name || `Certification ${idx + 1}`}
                itemMeta={(cert) => metaLine(cert.issuer, cert.date)}
                renderItem={(cert) => (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Field name="name" label="Name" value={cert.name} onChange={(v) => updateItem("certifications", cert.id, { name: v })} />
                    <Field name="issuer" label="Issuer" value={cert.issuer} onChange={(v) => updateItem("certifications", cert.id, { issuer: v })} />
                    <Field name="date" label="Date" value={cert.date} placeholder="2024-05" onChange={(v) => updateItem("certifications", cert.id, { date: v })} />
                    <Field name="expires" label="Expires" value={cert.expires} placeholder="2027-05" onChange={(v) => updateItem("certifications", cert.id, { expires: v })} />
                    <Field name="url" label="Link" value={cert.url} onChange={(v) => updateItem("certifications", cert.id, { url: v })} />
                  </div>
                )}
              />
            )}

            {/* ---- LANGUAGES ---- */}
            {shownSection === "languages" && (
              <ListSection
                focus={focusTarget}
                section="languages"
                title={sectionLabel("languages")}
                addLabel="Add language"
                emptyMessage="No languages added yet."
                items={cv.languages}
                onAdd={() => addItem("languages", blankLanguage())}
                {...listHandlers("languages")}
                itemTitle={(lang, idx) => lang.language || `Language ${idx + 1}`}
                itemMeta={(lang) => lang.proficiency}
                renderItem={(lang) => (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Field name="language" label="Language" value={lang.language} onChange={(v) => updateItem("languages", lang.id, { language: v })} />
                    <Field name="proficiency"
                      label="Proficiency"
                      value={lang.proficiency}
                      placeholder="Native, Fluent, B2…"
                      onChange={(v) => updateItem("languages", lang.id, { proficiency: v })}
                    />
                  </div>
                )}
              />
            )}

            {/* ---- AWARDS ---- */}
            {shownSection === "awards" && (
              <ListSection
                focus={focusTarget}
                section="awards"
                title={sectionLabel("awards")}
                addLabel="Add award"
                emptyMessage="No awards added yet."
                items={cv.awards}
                onAdd={() => addItem("awards", blankAward())}
                {...listHandlers("awards")}
                itemTitle={(award, idx) => award.title || `Award ${idx + 1}`}
                itemMeta={(award) => metaLine(award.issuer, award.date)}
                renderItem={(award) => (
                  <>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <Field name="title" label="Title" value={award.title} onChange={(v) => updateItem("awards", award.id, { title: v })} />
                      <Field name="issuer" label="Issuer" value={award.issuer} onChange={(v) => updateItem("awards", award.id, { issuer: v })} />
                      <Field name="date" label="Date" value={award.date} placeholder="2023-05" onChange={(v) => updateItem("awards", award.id, { date: v })} />
                    </div>
                    <Field name="description"
                      label="Description (optional)"
                      value={award.description}
                      onChange={(v) => updateItem("awards", award.id, { description: v })}
                    />
                  </>
                )}
              />
            )}

            {/* ---- PUBLICATIONS ---- */}
            {shownSection === "publications" && (
              <ListSection
                focus={focusTarget}
                section="publications"
                title={sectionLabel("publications")}
                addLabel="Add publication"
                emptyMessage="No publications added yet."
                items={cv.publications}
                onAdd={() => addItem("publications", blankPublication())}
                {...listHandlers("publications")}
                itemTitle={(pub, idx) => pub.title || `Publication ${idx + 1}`}
                itemMeta={(pub) => metaLine(pub.venue, pub.date)}
                renderItem={(pub) => (
                  <>
                    <Field name="title" label="Title" value={pub.title} onChange={(v) => updateItem("publications", pub.id, { title: v })} />
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <Field name="authors" label="Authors" value={pub.authors} placeholder="J. Doe, A. Smith" onChange={(v) => updateItem("publications", pub.id, { authors: v })} />
                      <Field name="venue"
                        label="Venue"
                        value={pub.venue}
                        placeholder="Journal, conference, or publisher"
                        onChange={(v) => updateItem("publications", pub.id, { venue: v })}
                      />
                      <Field name="date" label="Date" value={pub.date} placeholder="2024" onChange={(v) => updateItem("publications", pub.id, { date: v })} />
                      <Field name="url" label="Link" value={pub.url} onChange={(v) => updateItem("publications", pub.id, { url: v })} />
                    </div>
                  </>
                )}
              />
            )}

            {/* ---- VOLUNTEERING ---- */}
            {shownSection === "volunteering" && (
              <ListSection
                focus={focusTarget}
                section="volunteering"
                title={sectionLabel("volunteering")}
                addLabel="Add volunteering"
                emptyMessage="No volunteer work added yet."
                items={cv.volunteering}
                onAdd={() => addItem("volunteering", blankVolunteering())}
                {...listHandlers("volunteering")}
                itemTitle={(vol, idx) => vol.organization || `Volunteering ${idx + 1}`}
                itemMeta={(vol) => metaLine(vol.role, dateLine(vol.startDate, vol.endDate, vol.isCurrent))}
                renderItem={(vol) => (
                  <>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <Field name="organization" label="Organization" value={vol.organization} onChange={(v) => updateItem("volunteering", vol.id, { organization: v })} />
                      <Field name="role" label="Role" value={vol.role} onChange={(v) => updateItem("volunteering", vol.id, { role: v })} />
                      <Field name="location" label="Location" value={vol.location} onChange={(v) => updateItem("volunteering", vol.id, { location: v })} />
                      <div className="hidden sm:block" />
                      <DateRangeFields
                        start={vol.startDate}
                        end={vol.endDate}
                        isCurrent={vol.isCurrent}
                        currentLabel="Ongoing"
                        onChange={(patch) => updateItem("volunteering", vol.id, patch)}
                      />
                    </div>
                    <BulletEditor bullets={vol.bullets} onChange={(bullets) => updateItem("volunteering", vol.id, { bullets })} />
                  </>
                )}
              />
            )}

            {/* ---- COURSES ---- */}
            {shownSection === "courses" && (
              <ListSection
                focus={focusTarget}
                section="courses"
                title={sectionLabel("courses")}
                addLabel="Add course"
                emptyMessage="No courses added yet."
                items={cv.courses}
                onAdd={() => addItem("courses", blankCourse())}
                {...listHandlers("courses")}
                itemTitle={(course, idx) => course.name || `Course ${idx + 1}`}
                itemMeta={(course) => metaLine(course.institution, course.date)}
                renderItem={(course) => (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Field name="name" label="Course" value={course.name} onChange={(v) => updateItem("courses", course.id, { name: v })} />
                    <Field name="institution" label="Institution" value={course.institution} onChange={(v) => updateItem("courses", course.id, { institution: v })} />
                    <Field name="date" label="Date" value={course.date} placeholder="2023-03" onChange={(v) => updateItem("courses", course.id, { date: v })} />
                  </div>
                )}
              />
            )}

            {/* ---- MEMBERSHIPS ---- */}
            {shownSection === "memberships" && (
              <ListSection
                focus={focusTarget}
                section="memberships"
                title={sectionLabel("memberships")}
                addLabel="Add membership"
                emptyMessage="No memberships added yet."
                items={cv.memberships}
                onAdd={() => addItem("memberships", blankMembership())}
                {...listHandlers("memberships")}
                itemTitle={(mem, idx) => mem.organization || `Membership ${idx + 1}`}
                itemMeta={(mem) => metaLine(mem.role, dateLine(mem.startDate, mem.endDate, mem.isCurrent))}
                renderItem={(mem) => (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Field name="organization" label="Organization" value={mem.organization} onChange={(v) => updateItem("memberships", mem.id, { organization: v })} />
                    <Field name="role" label="Role" value={mem.role} onChange={(v) => updateItem("memberships", mem.id, { role: v })} />
                    <DateRangeFields
                      start={mem.startDate}
                      end={mem.endDate}
                      isCurrent={mem.isCurrent}
                      currentLabel="Current member"
                      onChange={(patch) => updateItem("memberships", mem.id, patch)}
                    />
                  </div>
                )}
              />
            )}

            {/* ---- TALKS & PRESENTATIONS ---- */}
            {shownSection === "presentations" && (
              <ListSection
                focus={focusTarget}
                section="presentations"
                title={sectionLabel("presentations")}
                addLabel="Add talk"
                emptyMessage="No talks added yet."
                items={cv.presentations}
                onAdd={() => addItem("presentations", blankPresentation())}
                {...listHandlers("presentations")}
                itemTitle={(talk, idx) => talk.title || `Talk ${idx + 1}`}
                itemMeta={(talk) => metaLine(talk.event, talk.date)}
                renderItem={(talk) => (
                  <>
                    <Field name="title" label="Title" value={talk.title} onChange={(v) => updateItem("presentations", talk.id, { title: v })} />
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <Field name="event"
                        label="Event"
                        value={talk.event}
                        placeholder="Conference, meetup, or workshop"
                        onChange={(v) => updateItem("presentations", talk.id, { event: v })}
                      />
                      <Field name="date" label="Date" value={talk.date} placeholder="2024-10" onChange={(v) => updateItem("presentations", talk.id, { date: v })} />
                      <Field name="url" label="Link" value={talk.url} onChange={(v) => updateItem("presentations", talk.id, { url: v })} />
                    </div>
                  </>
                )}
              />
            )}

            {/* ---- INTERESTS ---- */}
            {shownSection === "interests" && (
              <div className="space-y-5">
                <SectionHeader
                  title={sectionLabel("interests")}
                  subtitle="Keep these short"
                  icon={SECTION_META.interests.icon}
                  tone={SECTION_META.interests.tone}
                />
                <div className={CARD} data-field="interests">
                  <TagInput
                    items={cv.interests}
                    onChange={(interests) => setCv((prev) => ({ ...prev, interests }))}
                    placeholder="Type an interest and press Enter"
                  />
                </div>
              </div>
            )}

            {/* ---- REFERENCES ---- */}
            {shownSection === "references" && (
              <ListSection
                focus={focusTarget}
                section="references"
                title={sectionLabel("references")}
                subtitle="Only list people who agreed to be contacted"
                addLabel="Add reference"
                emptyMessage="No references added yet."
                items={cv.references}
                onAdd={() => addItem("references", blankReference())}
                {...listHandlers("references")}
                itemTitle={(ref, idx) => ref.name || `Reference ${idx + 1}`}
                itemMeta={(ref) => metaLine(ref.title, ref.organization)}
                renderItem={(ref) => (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Field name="name" label="Name" value={ref.name} onChange={(v) => updateItem("references", ref.id, { name: v })} />
                    <Field name="relationship"
                      label="Relationship"
                      value={ref.relationship}
                      placeholder="Former manager"
                      onChange={(v) => updateItem("references", ref.id, { relationship: v })}
                    />
                    <Field name="title" label="Job title" value={ref.title} onChange={(v) => updateItem("references", ref.id, { title: v })} />
                    <Field name="organization" label="Organization" value={ref.organization} onChange={(v) => updateItem("references", ref.id, { organization: v })} />
                    <Field name="email" label="Email" type="email" value={ref.email} onChange={(v) => updateItem("references", ref.id, { email: v })} />
                    <Field name="phone" label="Phone" value={ref.phone} onChange={(v) => updateItem("references", ref.id, { phone: v })} />
                  </div>
                )}
              />
            )}

            {/* ---- RESEARCH / TEACHING / ACTIVITIES ---- */}
            {positionKey &&
              (() => {
                const key = positionKey;
                const config = POSITION_SECTIONS[key];
                return (
                  <ListSection
                    focus={focusTarget}
                    section={key}
                    title={sectionLabel(key)}
                    addLabel={config.addLabel}
                    emptyMessage={config.empty}
                    items={cv[key]}
                    onAdd={() => addItem(key, blankPosition(config.prefix))}
                    {...listHandlers(key)}
                    itemTitle={(item, idx) => item.title || `${config.noun} ${idx + 1}`}
                    itemMeta={(item) => metaLine(item.organization, dateLine(item.startDate, item.endDate, item.isCurrent))}
                    renderItem={(item) => (
                      <>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <Field name="title"
                            label={config.titleLabel}
                            value={item.title}
                            placeholder={config.titlePlaceholder}
                            onChange={(v) => updateItem(key, item.id, { title: v })}
                          />
                          <Field name="organization" label={config.orgLabel} value={item.organization} onChange={(v) => updateItem(key, item.id, { organization: v })} />
                          <Field name="location" label="Location" value={item.location} onChange={(v) => updateItem(key, item.id, { location: v })} />
                          <div className="hidden sm:block" />
                          <DateRangeFields
                            start={item.startDate}
                            end={item.endDate}
                            isCurrent={item.isCurrent}
                            currentLabel="Ongoing"
                            onChange={(patch) => updateItem(key, item.id, patch)}
                          />
                        </div>
                        <BulletEditor bullets={item.bullets} onChange={(bullets) => updateItem(key, item.id, { bullets })} />
                      </>
                    )}
                  />
                );
              })()}

            {/* ---- PERSONAL DETAILS ---- */}
            {shownSection === "personalDetails" && (
              <div className="space-y-5">
                <SectionHeader
                  title={sectionLabel("personalDetails")}
                  subtitle="Only what you want on your CV, e.g. nationality or driving licence"
                  icon={SECTION_META.personalDetails.icon}
                  tone={SECTION_META.personalDetails.tone}
                />
                <div className={CARD}>
                  {cv.personalDetails.map((detail) => (
                    <div key={detail.id} className="flex items-center gap-2">
                      <input
                        type="text"
                        value={detail.label}
                        placeholder="Label, e.g. Nationality"
                        aria-label="Detail label"
                        onChange={(e) => updateItem("personalDetails", detail.id, { label: e.target.value })}
                        className={`${inputClass} w-2/5`}
                      />
                      <input
                        type="text"
                        value={detail.value}
                        placeholder="Value"
                        aria-label="Detail value"
                        onChange={(e) => updateItem("personalDetails", detail.id, { value: e.target.value })}
                        className={inputClass}
                      />
                      <button
                        type="button"
                        onClick={() => removeItem("personalDetails", detail.id)}
                        className="p-2 rounded-lg text-neutral-400 hover:text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
                        aria-label="Remove detail"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                  <AddButton label="Add detail" onClick={() => addItem("personalDetails", blankPersonalDetail())} />
                </div>
              </div>
            )}

            {/* ---- DATA CONSENT ---- */}
            {shownSection === "consent" && (
              <div className="space-y-5">
                <SectionHeader
                  title={sectionLabel("consent")}
                  subtitle="Printed as small text at the end of your CV"
                  icon={SECTION_META.consent.icon}
                  tone={SECTION_META.consent.tone}
                />
                <div className={CARD} data-field="consent">
                  <textarea
                    rows={5}
                    value={cv.consent}
                    maxLength={2000}
                    aria-label="Data consent clause"
                    onChange={(e) => setCv((prev) => ({ ...prev, consent: e.target.value }))}
                    placeholder="I agree to the processing of my personal data for the purposes of the recruitment process…"
                    className={`${inputClass} leading-relaxed resize-y`}
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* RIGHT COLUMN: LIVE PREVIEW (the real template) */}
        <div data-tour="editor-preview" className="hidden lg:block flex-1 h-full relative">
        <div className="h-full bg-[#ebebed] flex flex-col overflow-y-auto">
          <div className="sticky top-0 z-10 w-full px-6 lg:px-8 py-3 bg-[#ebebed]/90 backdrop-blur flex items-center justify-between gap-3 select-none">
            {renderPreviewControls()}
            <CvScorePanel {...scorePanelProps} tour={!narrowScreen} />
          </div>
          <div className="px-6 lg:px-8 pb-8 flex flex-col items-center">
            <div className="relative w-full max-w-[720px]">
              {/* A thin bar while the preview re-renders — no status text needed. */}
              <div
                className={`absolute top-6 left-6 right-6 h-0.5 overflow-hidden rounded-full z-10 transition-opacity ${
                  preview.isRendering ? "opacity-100" : "opacity-0"
                }`}
                aria-hidden
              >
                <div className="progress-slide h-full w-1/3 rounded-full bg-accent" />
              </div>
              <CvPreviewFrame html={preview.html} zoom={zoomLevel / 100} onPick={handlePick} title="Live preview of your CV" />
            </div>
          </div>
        </div>

          {/* Zoom floats in the corner, out of the toolbar and off the page itself. */}
          <div className="absolute bottom-5 right-5 z-20 flex items-center gap-0.5 p-1 rounded-lg border border-neutral-300 bg-white/90 backdrop-blur shadow-[0_6px_20px_-8px_rgba(0,0,0,0.25)] opacity-80 hover:opacity-100 transition-opacity select-none">
            <button
              type="button"
              onClick={() => setZoomLevel((z) => Math.max(z - 10, 60))}
              disabled={zoomLevel <= 60}
              className="p-1.5 rounded-md text-neutral-600 hover:bg-neutral-100 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
              aria-label="Zoom out"
            >
              <ZoomOut className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => setZoomLevel(100)}
              className="px-1 py-1 rounded-md text-sm font-semibold text-neutral-700 w-12 text-center tabular-nums hover:bg-neutral-100 cursor-pointer"
              title="Reset to 100%"
            >
              {zoomLevel}%
            </button>
            <button
              type="button"
              onClick={() => setZoomLevel((z) => Math.min(z + 10, 150))}
              disabled={zoomLevel >= 150}
              className="p-1.5 rounded-md text-neutral-600 hover:bg-neutral-100 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
              aria-label="Zoom in"
            >
              <ZoomIn className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* ================= MOBILE PREVIEW ================= */}
      {/* Hidden while scrolling down the form, back on the way up or at the top. */}
      <div
        className={`lg:hidden fixed bottom-10 left-1/2 -translate-x-1/2 z-40 transition-all duration-300 ${
          previewButtonHidden ? "opacity-0 translate-y-6 pointer-events-none" : "opacity-100 translate-y-0"
        }`}
      >
        <button
          type="button"
          data-tour="editor-mobile-preview"
          onClick={() => setMobilePreviewOpen(true)}
          className="inline-flex items-center gap-2 pl-4 pr-5 py-2.5 rounded-full bg-neutral-950 hover:bg-neutral-800 text-sm font-semibold text-white shadow-[0_10px_28px_-10px_rgba(0,0,0,0.5)] active:scale-[0.98] transition cursor-pointer"
        >
          <Eye className="w-4 h-4 text-accent-light" />
          Preview CV
        </button>
      </div>

      {/* Full screen on phones: score and Download on top, the pages, Edit at the bottom. */}
      {mobilePreviewOpen && (
        <div className="lg:hidden fixed inset-0 z-50 bg-[#ebebed] flex flex-col" role="dialog" aria-modal="true" aria-label="Your CV">
          <div className="shrink-0 h-12 pl-1.5 pr-4 bg-white border-b border-neutral-200 flex items-center gap-1.5">
            <button
              type="button"
              onClick={handleDone}
              disabled={isSaving}
              className="p-2 rounded-lg text-neutral-500 hover:text-neutral-950 hover:bg-neutral-50 transition-colors cursor-pointer disabled:opacity-50"
              aria-label="Back to the dashboard"
            >
              {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowLeft className="w-4 h-4" />}
            </button>
            <span className="min-w-0 truncate text-sm font-semibold text-neutral-950">{cv.title || "Untitled resume"}</span>
          </div>
          <div className="shrink-0 p-3 bg-white border-b border-neutral-200 grid grid-cols-2 gap-2">
            <CvScorePanel {...scorePanelProps} labelOnPhones fill tour={false} phoneDropdownTop="top-[8rem]" />
            <button
              type="button"
              disabled={isDownloading}
              onClick={() => {
                if (missingForExport.length > 0) setMobilePreviewOpen(false);
                handleDownload();
              }}
              className={`${ACCENT_BUTTON} h-full`}
            >
              {isDownloading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
              {isDownloading ? "Preparing…" : "Download"}
            </button>
          </div>
          <div className="relative flex-1 overflow-y-auto">
            <div
              className={`absolute top-0 inset-x-0 h-0.5 overflow-hidden z-10 transition-opacity ${preview.isRendering ? "opacity-100" : "opacity-0"}`}
              aria-hidden
            >
              <div className="progress-slide h-full w-1/3 rounded-full bg-accent" />
            </div>
            <CvPreviewFrame
              html={preview.html}
              title="Your CV"
              onPick={(path) => {
                setMobilePreviewOpen(false);
                handlePick(path);
              }}
            />
          </div>
          <div className="shrink-0 p-3 bg-white border-t border-neutral-200">
            <button
              type="button"
              onClick={() => setMobilePreviewOpen(false)}
              className="w-full inline-flex items-center justify-center gap-2 px-4 py-3 rounded-lg bg-neutral-950 hover:bg-neutral-800 text-white text-sm font-semibold transition-colors cursor-pointer"
            >
              <Pencil className="w-4 h-4" />
              Edit
            </button>
          </div>
        </div>
      )}

      {/* ================= TEMPLATE GALLERY ================= */}
      {templateGalleryOpen && (
        <div className="fixed inset-0 z-50 bg-neutral-950/60 backdrop-blur-sm flex items-center justify-center p-4 sm:p-6">
          <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] flex flex-col overflow-hidden shadow-2xl border border-neutral-200">
            <div className="px-6 py-5 border-b border-neutral-200 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <span className={`w-9 h-9 rounded-lg shrink-0 flex items-center justify-center bg-gradient-to-b border ${ICON_TONES.emerald}`}>
                  <LayoutTemplate className="w-4 h-4" />
                </span>
                <div>
                  <h2 className="text-base font-bold text-neutral-950 tracking-tight">Templates</h2>
                  <p className="text-xs text-neutral-500">Switching keeps all your content. Only the layout changes.</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setTemplateGalleryOpen(false)}
                className="p-2 rounded-lg text-neutral-400 hover:text-neutral-900 hover:bg-neutral-100 transition-colors cursor-pointer"
                aria-label="Close templates"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-6 sm:p-8 bg-[#fafafa]">
              <div className="grid grid-cols-2 md:grid-cols-3 gap-5">
                {templates?.map((tmpl) => (
                  <TemplateGalleryCard
                    key={tmpl.id}
                    id={tmpl.id}
                    name={tmpl.name}
                    description={tmpl.description}
                    isCurrent={tmpl.id === currentTemplate?.id}
                    onSelect={() => {
                      setCv((prev) => ({ ...prev, templateStyle: tmpl.id }));
                      setTemplateGalleryOpen(false);
                    }}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      <ProUpgradeModal
        isOpen={isPaywallOpen}
        onClose={closePaywall}
        title="Your full score comes with Plus and Pro"
        reason="See every check behind your score, and let AI polish rewrite your summary, bullets and skills to fix what's costing points."
      />
      <UnlockCvModal unlock={unlockCv} onClose={() => setUnlockCv(null)} />

      {/* Spotlight tour over the real editor — shown before editing a CV that opened incomplete. */}
      {showWalkthrough && (
        <QuickTour
          steps={editorTour}
          onClose={() => {
            markEditorTourSeen();
            setShowWalkthrough(false);
          }}
        />
      )}
    </div>
  );
}
