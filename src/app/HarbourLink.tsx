// demant.app — minimal "back to index" link. Self-contained, no deps.
// Carries its own paired colors so it stays legible on any host background.
export default function HarbourLink() {
  const css = `
  #demant-index-link{position:fixed;left:14px;bottom:14px;z-index:2147483000;font:500 12.5px/1 ui-monospace,"SF Mono",Menlo,Consolas,monospace;letter-spacing:.01em;text-decoration:none;padding:6px 10px;border-radius:7px;color:#3a3a3e;background:rgba(251,251,250,.82);border:1px solid rgba(0,0,0,.1);-webkit-backdrop-filter:blur(6px);backdrop-filter:blur(6px);transition:color .12s ease,border-color .12s ease}
  #demant-index-link:hover{color:#000;border-color:rgba(0,0,0,.28)}
  #demant-index-link:focus-visible{outline:2px solid #1769ff;outline-offset:2px}
  @media (prefers-color-scheme:dark){#demant-index-link{color:#cfcfd3;background:rgba(20,20,23,.72);border-color:rgba(255,255,255,.14)}#demant-index-link:hover{color:#fff;border-color:rgba(255,255,255,.34)}}
  @media print{#demant-index-link{display:none}}
  @media (prefers-reduced-motion:reduce){#demant-index-link{transition:none}}`;
  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: css }} />
      <a id="demant-index-link" href="https://demant.app/">&larr; demant.app</a>
    </>
  );
}
