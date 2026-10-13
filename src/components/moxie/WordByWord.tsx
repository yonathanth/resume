import React from "react";

/** Each word of a line arrives this long after the one before it. */
const WORD_STAGGER_MS = 55;

/**
 * A line of text that arrives word by word: each word blurs in and rises a
 * beat after the one before (moxie-word-in in globals.css), starting
 * `delayMs` in — e.g. once the line it replaces has faded, so the two never
 * overlap.
 */
export function WordByWord({ text, delayMs = 0 }: { text: string; delayMs?: number }) {
  const words = text.split(" ");
  return (
    <>
      {words.map((word, i) => (
        <React.Fragment key={i}>
          <span className="moxie-word-in" style={{ animationDelay: `${delayMs + i * WORD_STAGGER_MS}ms` }}>
            {word}
          </span>
          {i < words.length - 1 && " "}
        </React.Fragment>
      ))}
    </>
  );
}
