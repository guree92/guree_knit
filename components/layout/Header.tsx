import Link from "next/link";

export default function Header() {
  return (
    <header className="flex flex-wrap items-center justify-between gap-4">
      <h1 className="text-2xl font-bold tracking-tight">
        <Link href="/">
          knit<span className="text-violet-500">.home</span>
        </Link>
      </h1>

      <nav className="flex flex-wrap items-center gap-3 text-sm">
        <Link
          href="/"
          className="rounded-full px-4 py-2 text-slate-700 hover:bg-white/70"
        >
          홈
        </Link>

        <Link
          href="/patterns"
          className="rounded-full px-4 py-2 text-slate-700 hover:bg-white/70"
        >
          도안
        </Link>

        <Link
          href="/community"
          className="rounded-full px-4 py-2 text-slate-700 hover:bg-white/70"
        >
          커뮤니티
        </Link>

        <Link
          href="/my-work"
          className="rounded-full px-4 py-2 text-slate-700 hover:bg-white/70"
        >
          작품기록
        </Link>

        <Link
          href="/dot-maker"
          className="rounded-full px-4 py-2 text-slate-700 hover:bg-white/70"
        >
          도트메이커
        </Link>
      </nav>
    </header>
  );
}