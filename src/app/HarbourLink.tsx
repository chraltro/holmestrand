// demant.app — "back to the harbour" button.
// Self-contained floating link back to the demant.app index. No deps.
export default function HarbourLink() {
  const css = `
  #demant-harbour-link{position:fixed;left:16px;bottom:16px;z-index:2147483000;display:inline-flex;align-items:center;gap:8px;padding:8px 14px 8px 12px;font:500 13px/1 ui-monospace,"SFMono-Regular",Menlo,monospace;letter-spacing:.02em;color:#0d3b40;text-decoration:none;background:rgba(250,249,245,.86);border:1px solid rgba(13,59,64,.16);border-radius:999px;box-shadow:0 1px 2px rgba(13,59,64,.08),0 14px 30px -18px rgba(13,59,64,.4);-webkit-backdrop-filter:blur(8px);backdrop-filter:blur(8px);transition:transform .3s cubic-bezier(.16,1,.3,1),border-color .3s ease,box-shadow .3s ease}
  #demant-harbour-link svg{transition:transform .3s cubic-bezier(.16,1,.3,1);flex:none}
  #demant-harbour-link:hover,#demant-harbour-link:focus-visible{transform:translateX(-2px) translateY(-1px);border-color:#f0ad4e;box-shadow:0 2px 6px rgba(13,59,64,.12),0 22px 40px -20px rgba(13,59,64,.5);outline:none}
  #demant-harbour-link:hover svg,#demant-harbour-link:focus-visible svg{transform:translateX(-3px)}
  @media (prefers-color-scheme:dark){#demant-harbour-link{color:#f3efe6;background:rgba(16,28,30,.7);border-color:rgba(243,239,230,.18)}}
  @media (max-width:560px){#demant-harbour-link span{display:none}#demant-harbour-link{padding:9px}}
  @media (prefers-reduced-motion:reduce){#demant-harbour-link,#demant-harbour-link svg{transition:none}}
  @media print{#demant-harbour-link{display:none}}`;
  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: css }} />
      <a id="demant-harbour-link" href="https://demant.app/" aria-label="Back to the demant.app harbour">
        <svg viewBox="0 0 24 24" width="15" height="15" aria-hidden="true" focusable="false">
          <path d="M20 6v9M20 15c0 0-5.5 0-5.5-4.4M20 15c0 0 5.5 0 5.5-4.4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          <circle cx="20" cy="5" r="2.2" fill="currentColor" />
          <path d="M11 12H4M7 8l-4 4 4 4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        <span>demant.app</span>
      </a>
    </>
  );
}
