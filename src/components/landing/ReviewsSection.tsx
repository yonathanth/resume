"use client";

import React from "react";
import Link from "next/link";
import { ArrowRight, Star } from "lucide-react";
import { Reveal } from "@/components/Reveal";
import { REVIEWS, REVIEW_STATS, type Review } from "@/lib/social-proof";

/** Light tints for the initials avatars, cycled through the reviews. */
const AVATAR_TINTS = [
  "bg-orange-100 text-orange-700",
  "bg-violet-100 text-violet-700",
  "bg-sky-100 text-sky-700",
  "bg-emerald-100 text-emerald-700",
  "bg-amber-100 text-amber-700",
];
const tintFor = (i: number) => AVATAR_TINTS[i % AVATAR_TINTS.length];

const initials = (name: string) =>
  name
    .split(" ")
    .map((part) => part[0])
    .slice(0, 2)
    .join("");

function Avatar({ name, index, ring }: { name: string; index: number; ring?: boolean }) {
  return (
    <span
      className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-[13px] font-bold ${tintFor(index)} ${ring ? "ring-[3px] ring-[#fdfdfd]" : ""}`}
      aria-hidden="true"
    >
      {initials(name)}
    </span>
  );
}

function ReviewCard({ review, index, featured }: { review: Review; index: number; featured?: boolean }) {
  return (
    <figure className="flex h-full flex-col rounded-2xl border border-neutral-200/70 bg-white/80 p-6 shadow-[0_12px_32px_-28px_rgba(15,17,21,0.35)] backdrop-blur-sm sm:p-7">
      <div className="flex items-center justify-between gap-3 text-[12px] text-neutral-400">
        <span className="flex items-center gap-1.5">
          <span className="flex items-center gap-0.5" role="img" aria-label={`${review.stars} out of 5 stars`}>
            {[1, 2, 3, 4, 5].map((n) => (
              <Star key={n} className={`h-4 w-4 ${n <= review.stars ? "fill-accent text-accent" : "fill-neutral-200 text-neutral-200"}`} strokeWidth={0} />
            ))}
          </span>
          ({review.stars}/5)
        </span>
        <time dateTime={review.date}>{review.date}</time>
      </div>

      <blockquote
        className={`mt-5 flex-1 font-serif leading-relaxed text-neutral-800 ${featured ? "text-[18px] sm:text-[19px]" : "text-[16.5px]"}`}
      >
        &ldquo;{review.quote}&rdquo;
      </blockquote>

      <figcaption className="mt-6 flex items-center gap-3">
        <Avatar name={review.name} index={index} />
        <span className="min-w-0">
          <span className="block text-[15px] font-semibold text-neutral-950">{review.name}</span>
          <span className="block truncate text-[12.5px] text-neutral-500">{review.role}</span>
        </span>
      </figcaption>
    </figure>
  );
}

/**
 * What users say, in place of the before & after carousel: the numbers and a
 * way in on top, then the reviews — the first one large, beside a 2×2 grid.
 */
export function ReviewsSection() {
  const [featured, ...rest] = REVIEWS;
  return (
    <section id="reviews" aria-label="What our users say" className="mx-auto w-full max-w-page px-4 py-12 sm:px-6 sm:py-20 lg:px-8">
      {/* The numbers, and a way in */}
      <Reveal className="grid grid-cols-1 items-center gap-10 md:grid-cols-2">
        <div className="text-center md:text-left">
          <p className="text-6xl font-bold tracking-tight text-accent sm:text-7xl">{REVIEW_STATS.reviews}</p>
          <h2 className="mt-2 text-xl font-semibold tracking-tight text-neutral-950 sm:text-2xl">Reviews from job seekers</h2>
        </div>

        <div className="flex flex-col items-center md:items-start">
          <div className="flex -space-x-2.5">
            {REVIEWS.map((r, i) => (
              <Avatar key={r.name} name={r.name} index={i} ring />
            ))}
          </div>
          <p className="mt-4 max-w-xs text-center text-lg font-medium leading-snug text-neutral-900 md:text-left sm:text-xl">
            {REVIEW_STATS.users} people already build their CVs with gomoxie.
          </p>
          <div className="mt-6 flex flex-col gap-2.5 sm:flex-row">
            <Link
              href="/signup"
              className="group inline-flex items-center justify-center gap-2 rounded-lg bg-neutral-950 px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-neutral-800"
            >
              Try for free
              <ArrowRight className="h-4 w-4 text-accent transition-transform group-hover:translate-x-0.5" />
            </Link>
            <Link
              href="/how-it-works"
              className="group inline-flex items-center justify-center gap-2 rounded-lg border border-neutral-300 bg-white px-6 py-3 text-sm font-semibold text-neutral-800 transition-colors hover:border-neutral-400"
            >
              See how it works
              <ArrowRight className="h-4 w-4 text-accent transition-transform group-hover:translate-x-0.5" />
            </Link>
          </div>
        </div>
      </Reveal>

      {/* The reviews: the first one large, the rest in a 2×2 grid beside it */}
      <ul className="mt-12 grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
        <li className="md:row-span-2">
          <Reveal className="h-full">
            <ReviewCard review={featured} index={0} featured />
          </Reveal>
        </li>
        {rest.map((review, i) => (
          <li key={review.name}>
            <Reveal delay={(i % 2) * 80 + 80} className="h-full">
              <ReviewCard review={review} index={i + 1} />
            </Reveal>
          </li>
        ))}
      </ul>
    </section>
  );
}
