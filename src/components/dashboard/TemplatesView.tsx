"use client";

import React, { useState } from "react";
import {
  Sparkles,
  ArrowRight,
  CheckCircle2,
  Eye,
  FileText,
  SlidersHorizontal,
  X,
  Layers,
  Zap,
} from "lucide-react";
import { TEMPLATE_OPTIONS, TemplateId, TemplateOption } from "./create-flow/types";

interface TemplatesViewProps {
  onUseTemplate: (templateId: TemplateId) => void;
}

export function TemplatesView({ onUseTemplate }: TemplatesViewProps) {
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [previewTemplate, setPreviewTemplate] = useState<TemplateOption | null>(null);

  const categories = [
    { id: "all", label: "All Templates" },
    { id: "tech", label: "Software & Cloud" },
    { id: "executive", label: "Leadership & Executive" },
    { id: "swiss", label: "Minimalist & Product" },
    { id: "finance", label: "Finance & Quant" },
    { id: "ai", label: "AI & Research" },
    { id: "creative", label: "Brand & Creative" },
  ];

  const filteredTemplates = TEMPLATE_OPTIONS.filter((t) => {
    const matchesCategory =
      selectedCategory === "all" ||
      (selectedCategory === "tech" && t.id === "tech") ||
      (selectedCategory === "executive" && t.id === "executive") ||
      (selectedCategory === "swiss" && t.id === "swiss") ||
      (selectedCategory === "finance" && t.id === "finance") ||
      (selectedCategory === "ai" && t.id === "ai") ||
      (selectedCategory === "creative" && t.id === "creative");

    const matchesSearch =
      t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.category.toLowerCase().includes(searchQuery.toLowerCase());

    return matchesCategory && matchesSearch;
  });

  const getTemplatePrompt = (id: TemplateId) => {
    switch (id) {
      case "tech":
        return "Prompts AI to prioritize high-density technical stacks, system latency metrics, and GitHub/cloud infrastructure.";
      case "executive":
        return "Instructs AI to frame achievements around org scale, revenue growth, board presentations, and team leadership.";
      case "swiss":
        return "Focuses AI on product craftsmanship, design systems adoption, user retention lift, and cross-functional velocity.";
      case "finance":
        return "Directs AI to emphasize risk-adjusted alpha, quantitative financial models, deal volume, and strict tabular metrics.";
      case "ai":
        return "Highlights arXiv publication citations, LLM training cluster scale, CUDA efficiency, and algorithmic milestones.";
      case "creative":
        return "Accentuates campaign reach, brand awareness lift, global launch milestones, and creative direction impact.";
    }
  };

  const getTemplateRoles = (id: TemplateId) => {
    switch (id) {
      case "tech":
        return ["Senior Cloud Architect", "Staff Backend Engineer", "DevOps / SRE"];
      case "executive":
        return ["VP of Engineering", "Chief Technology Officer", "Head of Product"];
      case "swiss":
        return ["Staff Product Designer", "Principal PM", "Design Technologist"];
      case "finance":
        return ["Quantitative Analyst", "Investment Banker", "Private Equity Associate"];
      case "ai":
        return ["AI Research Scientist", "ML Infrastructure Lead", "LLM Systems Engineer"];
      case "creative":
        return ["Brand Creative Director", "VP of Brand & Growth", "Head of Marketing"];
    }
  };

  return (
    <div className="px-8 py-10 sm:px-14 sm:py-14 lg:px-20 lg:py-16 max-w-7xl mx-auto w-full">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <div className="flex items-center gap-2.5 mb-1.5">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-neutral-950">
              CV Templates Gallery
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-neutral-900 text-white shadow-2xs">
              ATS 98%+ Verified
            </span>
          </div>
          <p className="text-sm text-neutral-500 max-w-2xl">
            Recruiter-tested typographic architectures engineered for Silicon Valley, Wall Street, and top global enterprises. Hover to preview AI guidance prompts.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <span className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-white border border-neutral-200/90 text-neutral-700 shadow-2xs">
            {TEMPLATE_OPTIONS.length} Verified Archetypes
          </span>
        </div>
      </div>

      {/* Category Pills & Search */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-8 pb-4 border-b border-neutral-100">
        <div className="flex flex-wrap items-center gap-2">
          {categories.map((cat) => (
            <button
              key={cat.id}
              type="button"
              onClick={() => setSelectedCategory(cat.id)}
              className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                selectedCategory === cat.id
                  ? "bg-neutral-950 text-white shadow-xs"
                  : "bg-white text-neutral-600 hover:text-neutral-950 hover:bg-neutral-100 border border-neutral-200/80"
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        <div className="w-full md:w-64">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search templates or roles..."
            className="w-full px-3.5 py-2 rounded-xl bg-white border border-neutral-200 text-xs text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:border-neutral-950 transition-all shadow-2xs"
          />
        </div>
      </div>

      {/* Templates Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredTemplates.map((template) => {
          const promptDesc = getTemplatePrompt(template.id);
          const roles = getTemplateRoles(template.id);

          return (
            <div
              key={template.id}
              className="rounded-3xl bg-white border border-neutral-200/90 shadow-2xs hover:shadow-xl hover:border-neutral-400/80 transition-all duration-300 flex flex-col justify-between group relative overflow-hidden"
            >
              {/* Card Preview Visual Header */}
              <div className="p-6 pb-4">
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div>
                    <span className="text-[11px] font-bold uppercase tracking-wider text-neutral-400">
                      {template.category}
                    </span>
                    <h3 className="text-lg font-bold text-neutral-950 tracking-tight mt-0.5">
                      {template.name}
                    </h3>
                  </div>
                  <span className="px-2.5 py-1 rounded-full text-[10.5px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200/90 shrink-0">
                    {template.atsScore}% ATS
                  </span>
                </div>

                {/* Simulated Document Layout Canvas */}
                <div className="relative rounded-2xl bg-neutral-50/90 border border-neutral-100 p-4 h-48 overflow-hidden transition-all duration-300 group-hover:bg-neutral-100/60">
                  {/* Subtle watermarked typographic styling */}
                  <div className="space-y-2 select-none pointer-events-none">
                    <div className="flex items-center justify-between pb-2 border-b border-neutral-200/60">
                      <div className="w-24 h-2.5 bg-neutral-800 rounded-sm" />
                      <div className="w-16 h-1.5 bg-neutral-300 rounded-full" />
                    </div>
                    <div className="w-full h-1 bg-neutral-200 rounded-full" />
                    <div className="w-5/6 h-1 bg-neutral-200 rounded-full" />
                    
                    <div className="pt-2">
                      <div className="w-20 h-2 bg-neutral-700 rounded-sm mb-1.5" />
                      <div className="space-y-1">
                        <div className="w-full h-1 bg-neutral-200 rounded-full" />
                        <div className="w-11/12 h-1 bg-neutral-200 rounded-full" />
                        <div className="w-4/5 h-1 bg-neutral-200 rounded-full" />
                      </div>
                    </div>

                    <div className="pt-1.5">
                      <div className="w-16 h-2 bg-neutral-700 rounded-sm mb-1.5" />
                      <div className="flex gap-1">
                        <div className="w-8 h-2.5 bg-neutral-200 rounded-sm" />
                        <div className="w-10 h-2.5 bg-neutral-200 rounded-sm" />
                        <div className="w-7 h-2.5 bg-neutral-200 rounded-sm" />
                      </div>
                    </div>
                  </div>

                  {/* HOVER OVERLAY WITH PROMPT & USE THIS TEMPLATE BUTTON */}
                  <div className="absolute inset-0 bg-neutral-950/85 backdrop-blur-xs p-5 flex flex-col justify-between opacity-0 group-hover:opacity-100 transition-all duration-200">
                    <div>
                      <div className="flex items-center gap-1.5 text-amber-400 text-xs font-bold mb-2">
                        <Sparkles className="w-3.5 h-3.5 shrink-0" />
                        <span>AI Optimization Prompt</span>
                      </div>
                      <p className="text-xs text-neutral-200 leading-relaxed italic line-clamp-3">
                        &ldquo;{promptDesc}&rdquo;
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => onUseTemplate(template.id)}
                      className="w-full py-2.5 px-4 rounded-xl bg-white text-neutral-950 font-bold text-xs hover:bg-neutral-100 transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer transform active:scale-98"
                    >
                      <span>Use this template</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Description */}
                <p className="text-xs text-neutral-600 mt-3.5 leading-relaxed line-clamp-2">
                  {template.description}
                </p>

                {/* Recommended Roles Badges */}
                <div className="mt-3 pt-3 border-t border-neutral-100">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-neutral-400 mb-1.5">
                    Recommended For
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {roles.map((r, i) => (
                      <span
                        key={i}
                        className="px-2 py-0.5 rounded-md bg-neutral-100 text-[10px] font-medium text-neutral-700"
                      >
                        {r}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              {/* Bottom Action Footer */}
              <div className="px-6 py-3.5 bg-neutral-50/70 border-t border-neutral-100 flex items-center justify-between text-xs">
                <span className="text-[11px] font-medium text-neutral-500">
                  Font: {template.fontFamily.split("/")[0]}
                </span>
                <button
                  type="button"
                  onClick={() => onUseTemplate(template.id)}
                  className="font-bold text-neutral-950 hover:text-neutral-700 flex items-center gap-1 transition-colors cursor-pointer"
                >
                  <span>Use Template</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
