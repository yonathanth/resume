import styles from "./HomePage.module.css";

type DetailKind = "resume" | "keywords" | "templates" | "ready";

/** Small background sketches, rather than UI controls or product claims. */
export function LandingDetail({ kind }: { kind: DetailKind }) {
  return (
    <div className={`${styles.detail} ${styles[kind]}`} aria-hidden="true">
      <svg viewBox="0 0 100 80" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round">
        {kind === "resume" && <>
          <path d="M27 12h29l13 13v43H27z" fill="white" fillOpacity=".7" />
          <path d="M56 12v13h13M36 37h23M36 44h18M36 56h23M36 61h15" />
          <path className={styles.detailAccent} d="M36 30h12M77 38v10m-5-5h10M17 57v6m-3-3h6" />
        </>}
        {kind === "keywords" && <>
          <rect x="13" y="16" width="65" height="14" rx="7" fill="white" fillOpacity=".6" />
          <rect x="22" y="38" width="65" height="14" rx="7" fill="white" fillOpacity=".6" />
          <path d="M23 23h29M32 45h23M32 64h25" />
          <path className={styles.detailAccent} d="m62 23 3 3 5-6m-1 25 3 3 5-6M66 64h12" />
        </>}
        {kind === "templates" && <>
          <rect x="22" y="12" width="39" height="51" rx="4" transform="rotate(-12 22 12)" />
          <rect x="38" y="17" width="39" height="51" rx="4" fill="white" fillOpacity=".85" />
          <path className={styles.detailAccent} d="M46 27h13M46 32h22" />
          <path d="M46 42h22M46 48h17M46 54h20M46 60h12" />
        </>}
        {kind === "ready" && <>
          <path d="m21 39 55-22-17 48-12-18-26-8Z" fill="white" fillOpacity=".7" />
          <path className={styles.detailAccent} d="m47 47 29-30M28 57l-7 7M37 63l-4 6M18 49l-5 2M84 39v8m-4-4h8" />
        </>}
      </svg>
    </div>
  );
}
