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
    <header className="flex flex-wrap items-center justify-between gap-4 py-2">
      
      {/* Logo */}
      <h1 className="text-[1.6rem] font-bold tracking-[-0.02em] text-[#3f342c]">
        <Link href="/" className="transition hover:opacity-80">
          Knit<span className="text-[#8ca08b]"> . GUREE</span>
        </Link>
      </h1>

      {/* Menu */}
      <nav className="flex flex-wrap items-center gap-2 text-sm">
        {menus.map((menu) => {
          const isActive =
            menu.href === "/"
              ? pathname === "/"
              : pathname === menu.href || pathname.startsWith(`${menu.href}/`);

          return (
            <Link
              key={menu.href}
              href={menu.href}
              className={[
                "rounded-full px-4 py-2 font-medium transition hover:-translate-y-[1px]",
                isActive
                  ? "bg-[#8ca08b] text-white shadow-md shadow-[#e1ebe2]"
                  : "bg-white text-[#6f6258] border border-[#ebe1d6] hover:border-[#dce5dc] hover:bg-[#f7faf7] hover:text-[#5d7460]",
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