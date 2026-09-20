import Link from "next/link";

const links = [
  { href: "/campaigns", label: "Campaigns" },
  { href: "/ledger", label: "Ledger" },
  { href: "/organizers", label: "Organizers" },
];

export default function SiteHeader() {
  return (
    <header className="mx-auto max-w-5xl px-5 py-6 flex items-center justify-between gap-4 flex-wrap">
      <Link href="/" className="flex items-baseline gap-2">
        <span className="text-xl">🪔</span>
        <span className="font-display font-bold text-xl">Kootam</span>
        <span className="text-ink-dim text-sm hidden sm:inline">Admin</span>
      </Link>
      <nav className="flex gap-6 text-sm font-semibold">
        {links.map((l) => (
          <Link key={l.href} href={l.href} className="opacity-80 hover:opacity-100 hover:text-marigold">
            {l.label}
          </Link>
        ))}
      </nav>
    </header>
  );
}
