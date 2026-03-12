"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const menus = [
  { href: "/", label: "홈" },
  { href: "/patterns", label: "도안" },
  { href: "/community", label: "커뮤니티" },
  { href: "/my-work", label: "작품기록" },
  { href: "/dot-maker", label: "도트메이커" },
];

export default function Header() {
  const pathname = usePathname();

  return (
    <header className="flex flex-wrap items-center justify-between gap-4">
      <h1 className="text-2xl font-bold tracking-tight text-slate-800">
        <Link href="/" className="transition hover:opacity-80">
          knit<span className="text-violet-500">.home</span>
        </Link>
      </h1>

      <nav className="flex flex-wrap items-center gap-2 text-sm">
        {menus.map((menu) => {
          const isActive = pathname === menu.href;

          return (
            <Link
              key={menu.href}
              href={menu.href}
              className={[
                "rounded-full px-4 py-2 font-medium transition",
                isActive
                  ? "bg-violet-500 text-white shadow-md shadow-violet-200"
                  : "bg-white/70 text-slate-700 hover:bg-white hover:shadow-sm",
              ].join(" ")}
            >
              {menu.label}
            </Link>
          );
        })}
      </nav>
    </header>
  );
}