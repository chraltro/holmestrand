import Link from "next/link";

export default function NotFound() {
  return (
    <div className="min-h-[100dvh] flex items-center justify-center px-4" style={{ background: "var(--bg-primary)" }}>
      <div className="w-full max-w-sm text-center animate-slide-up">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl gradient-primary shadow-lg mb-4 text-3xl" style={{ boxShadow: "0 8px 24px rgba(232, 168, 124, 0.3)" }}>
          🏠
        </div>
        <h1 className="text-2xl font-display font-semibold mb-2" style={{ color: "var(--text-primary)" }}>
          Siden finnes ikke
        </h1>
        <p className="text-sm mb-6" style={{ color: "var(--text-secondary)" }}>
          Vi fant ikke det du lette etter.
        </p>
        <Link
          href="/"
          className="inline-block gradient-primary text-white px-4 py-2 rounded-xl text-sm font-medium hover:shadow-lg transition-shadow"
        >
          Til forsiden
        </Link>
      </div>
    </div>
  );
}
