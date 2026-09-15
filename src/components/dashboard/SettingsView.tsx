"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  Settings,
  User,
  Shield,
  CreditCard,
  Bell,
  CheckCircle2,
  ExternalLink,
  Sparkles,
  LogOut,
} from "lucide-react";

export function SettingsView() {
  const [fullName, setFullName] = useState("Alex Rivera");
  const [email, setEmail] = useState("alex.rivera@example.com");
  const [headline, setHeadline] = useState(
    "Senior Full Stack & Cloud Architect"
  );
  const [exportFormat, setExportFormat] = useState<"pdf" | "docx">("pdf");
  const [savedSuccess, setSavedSuccess] = useState(false);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2500);
  };

  return (
    <div className="px-8 py-10 sm:px-14 sm:py-14 lg:px-20 lg:py-16 max-w-5xl mx-auto w-full">
      {/* Top Header */}
      <div className="mb-10">
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-neutral-950">
          Account Settings
        </h1>
        <p className="mt-1.5 text-sm text-neutral-500">
          Manage your personal details, subscription tier, and export defaults.
        </p>
      </div>

      <div className="space-y-8">
        {/* Profile Card */}
        <div className="rounded-3xl bg-white border border-neutral-200/90 shadow-2xs p-6 sm:p-8">
          <div className="flex items-center gap-3 pb-5 border-b border-neutral-100 mb-6">
            <div className="w-9 h-9 rounded-xl bg-neutral-100 text-neutral-800 flex items-center justify-center">
              <User className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-neutral-950">
                Personal Information
              </h2>
              <p className="text-xs text-neutral-500">
                Update your contact details and default title
              </p>
            </div>
          </div>

          <form onSubmit={handleSave} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-neutral-700 mb-1">
                  Full Name
                </label>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-200 text-sm text-neutral-900 focus:outline-none focus:ring-2 focus:ring-neutral-900/10 focus:border-neutral-900"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-700 mb-1">
                  Email Address
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-200 text-sm text-neutral-900 focus:outline-none focus:ring-2 focus:ring-neutral-900/10 focus:border-neutral-900"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-neutral-700 mb-1">
                Professional Headline
              </label>
              <input
                type="text"
                value={headline}
                onChange={(e) => setHeadline(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-200 text-sm text-neutral-900 focus:outline-none focus:ring-2 focus:ring-neutral-900/10 focus:border-neutral-900"
              />
            </div>

            <div className="flex items-center justify-between pt-4">
              {savedSuccess && (
                <span className="text-xs font-semibold text-emerald-600 flex items-center gap-1.5 animate-in fade-in">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Changes saved successfully</span>
                </span>
              )}
              <button
                type="submit"
                className="ml-auto px-6 py-2.5 rounded-xl bg-neutral-950 text-white font-semibold text-xs hover:bg-neutral-800 transition-colors shadow-xs cursor-pointer"
              >
                Save Profile
              </button>
            </div>
          </form>
        </div>

        {/* Subscription Plan Card */}
        <div className="rounded-3xl bg-white border border-neutral-200/90 shadow-2xs p-6 sm:p-8">
          <div className="flex items-center gap-3 pb-5 border-b border-neutral-100 mb-6">
            <div className="w-9 h-9 rounded-xl bg-neutral-100 text-neutral-800 flex items-center justify-center">
              <CreditCard className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-neutral-950">
                Subscription &amp; Billing
              </h2>
              <p className="text-xs text-neutral-500">
                Manage your active plan and payment methods
              </p>
            </div>
          </div>

          <div className="p-5 rounded-2xl bg-neutral-50 border border-neutral-200/80 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-base font-bold text-neutral-950">
                  Resumate Pro Plan
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-neutral-950 text-white">
                  Active
                </span>
              </div>
              <p className="text-xs text-neutral-500 mt-1">
                $10 per month, billed yearly ($120/yr). Next renewal: Sep 14, 2027.
              </p>
            </div>

            <Link
              href="/pricing"
              className="px-4 py-2 rounded-xl bg-white border border-neutral-200 text-xs font-semibold text-neutral-800 hover:bg-neutral-100 transition-colors cursor-pointer"
            >
              Manage / Switch Plan
            </Link>
          </div>
        </div>

        {/* Export & Formatting Defaults */}
        <div className="rounded-3xl bg-white border border-neutral-200/90 shadow-2xs p-6 sm:p-8">
          <div className="flex items-center gap-3 pb-5 border-b border-neutral-100 mb-6">
            <div className="w-9 h-9 rounded-xl bg-neutral-100 text-neutral-800 flex items-center justify-center">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-neutral-950">
                Export &amp; Parser Defaults
              </h2>
              <p className="text-xs text-neutral-500">
                Configure default download formats and ATS standard rules
              </p>
            </div>
          </div>

          <div className="space-y-3">
            <label className="flex items-center justify-between p-4 rounded-xl border border-neutral-200 cursor-pointer hover:bg-neutral-50/70 transition-colors">
              <div>
                <div className="text-xs font-bold text-neutral-900">
                  Standard ATS Machine-Readable PDF
                </div>
                <div className="text-[11px] text-neutral-500">
                  Recommended. 100% compliant with Greenhouse, Lever, and Workday parsers.
                </div>
              </div>
              <input
                type="radio"
                name="exportFormat"
                checked={exportFormat === "pdf"}
                onChange={() => setExportFormat("pdf")}
                className="w-4 h-4 text-neutral-950 focus:ring-neutral-950"
              />
            </label>

            <label className="flex items-center justify-between p-4 rounded-xl border border-neutral-200 cursor-pointer hover:bg-neutral-50/70 transition-colors">
              <div>
                <div className="text-xs font-bold text-neutral-900">
                  Editable Microsoft Word (.docx)
                </div>
                <div className="text-[11px] text-neutral-500">
                  For headhunters or recruiters who request editable Word attachments.
                </div>
              </div>
              <input
                type="radio"
                name="exportFormat"
                checked={exportFormat === "docx"}
                onChange={() => setExportFormat("docx")}
                className="w-4 h-4 text-neutral-950 focus:ring-neutral-950"
              />
            </label>
          </div>
        </div>

        {/* Session & Sign Out Card */}
        <div className="rounded-3xl bg-white border border-neutral-200/90 shadow-2xs p-6 sm:p-8">
          <div className="flex items-center gap-3 pb-5 border-b border-neutral-100 mb-6">
            <div className="w-9 h-9 rounded-xl bg-red-50 text-red-600 flex items-center justify-center">
              <LogOut className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-neutral-950">
                Account Session
              </h2>
              <p className="text-xs text-neutral-500">
                Log out of your Resumate session on this device
              </p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl bg-neutral-50/80 border border-neutral-200/80">
            <div>
              <div className="text-xs font-bold text-neutral-900">
                Logged in as Alex Rivera
              </div>
              <div className="text-[11px] text-neutral-500 mt-0.5">
                alex.rivera@example.com • Active Pro workspace
              </div>
            </div>

            <Link
              href="/"
              className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl border border-red-200 bg-white hover:bg-red-50 text-red-600 font-semibold text-xs transition-colors shadow-2xs cursor-pointer shrink-0"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Log out of Resumate</span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
