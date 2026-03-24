"use client";

import { useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import AuthStatus from "@/components/auth/AuthStatus";
import { subscribeToMediaQuery } from "@/lib/media-query";
import styles from "./header.module.css";

type MenuItem = {
  href: string;
  label: string;
  meta?: string;
  icon: ReactNode;
};

const menus: MenuItem[] = [
  {
    href: "/",
    label: "홈",
    meta: "Home",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M3 10.5 12 3l9 7.5" />
        <path d="M5.5 9.5V20h13V9.5" />
      </svg>
    ),
  },
  {
    href: "/patterns",
    label: "도안마루",
    meta: "Patterns",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <rect x="4" y="5" width="16" height="14" rx="3" />
        <path d="M8 9h8" />
        <path d="M8 13h5" />
      </svg>
    ),
  },
  {
    href: "/community",
    label: "뜨개마당",
    meta: "Forum",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M5 7.5A2.5 2.5 0 0 1 7.5 5h9A2.5 2.5 0 0 1 19 7.5v5A2.5 2.5 0 0 1 16.5 15H11l-4 4v-4.2A2.5 2.5 0 0 1 5 12.5z" />
      </svg>
    ),
  },
  {
    href: "/companion",
    label: "동행",
    meta: "Together",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M8.5 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z" />
        <path d="M16.5 12a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Z" />
        <path d="M4.5 19a4 4 0 0 1 8 0" />
        <path d="M13.5 19a3.5 3.5 0 0 1 7 0" />
      </svg>
    ),
  },
  {
    href: "/my-work",
    label: "작업기록",
    meta: "Journal",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M7 4.5h10A1.5 1.5 0 0 1 18.5 6v12A1.5 1.5 0 0 1 17 19.5H7A1.5 1.5 0 0 1 5.5 18V6A1.5 1.5 0 0 1 7 4.5Z" />
        <path d="M9 9h6" />
        <path d="M9 13h4" />
      </svg>
    ),
  },
  {
    href: "/dot-maker",
    label: "도트메이커",
    meta: "Tool",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <circle cx="7" cy="7" r="2" />
        <circle cx="17" cy="7" r="2" />
        <circle cx="7" cy="17" r="2" />
        <circle cx="17" cy="17" r="2" />
      </svg>
    ),
  },
];

export default function Header() {
  const pathname = usePathname();
  const [mobileMenuPath, setMobileMenuPath] = useState<string | null>(null);
  const [isCompactViewport, setIsCompactViewport] = useState(false);
  const isMobileMenuOpen = mobileMenuPath === pathname;

  useEffect(() => {
    if (typeof window === "undefined") return;

    const mediaQuery = window.matchMedia("(max-width: 1180px)");
    const syncViewport = () => {
      const matches = mediaQuery.matches;
      setIsCompactViewport(matches);

      if (!matches) {
        setMobileMenuPath(null);
      }
    };

    syncViewport();
    return subscribeToMediaQuery(mediaQuery, syncViewport);
  }, []);

  useEffect(() => {
    if (typeof document === "undefined") return;

    const previousOverflow = document.body.style.overflow;

    if (isMobileMenuOpen) {
      document.body.style.overflow = "hidden";
    }

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [isMobileMenuOpen]);

  return (
    <div className={styles.appFrame}>
      <button
        type="button"
        className={styles.mobileMenuButton}
        aria-label={isMobileMenuOpen ? "메뉴 닫기" : "메뉴 열기"}
        aria-expanded={isMobileMenuOpen}
        aria-controls="global-navigation"
        onClick={() => setMobileMenuPath((current) => (current === pathname ? null : pathname))}
      >
        <span className={styles.mobileMenuIcon} aria-hidden="true">
          <span />
          <span />
          <span />
        </span>
      </button>

      {isMobileMenuOpen ? (
        <button
          type="button"
          className={styles.mobileBackdrop}
          aria-label="메뉴 닫기"
          onClick={() => setMobileMenuPath(null)}
        />
      ) : null}

      <aside
        id="global-navigation"
        className={isMobileMenuOpen ? `${styles.sidebar} ${styles.sidebarOpen}` : styles.sidebar}
        data-sidebar-shell
        aria-label="주요 메뉴"
      >
        <div className={styles.topSection}>
          <Link href="/" className={styles.brand}>
            <span className={styles.brandMark}>K</span>
            <span className={styles.brandText}>
              <strong className={styles.brandName}>Knit.GUREE</strong>
            </span>
          </Link>

          <div className={styles.mobileProfile}>
            <AuthStatus profileCard />
          </div>

          <nav className={styles.nav}>
            {menus.map((menu) => {
              const isActive =
                menu.href === "/"
                  ? pathname === "/"
                  : pathname === menu.href || pathname.startsWith(`${menu.href}/`);

              return (
                <Link
                  key={menu.href}
                  href={menu.href}
                  className={isActive ? styles.navLinkActive : styles.navLink}
                  aria-label={menu.label}
                  onClick={() => setMobileMenuPath(null)}
                >
                  <span className={styles.iconWrap}>{menu.icon}</span>
                  <span className={styles.navLabel}>{menu.label}</span>
                  {menu.meta ? <span className={styles.navMeta}>{menu.meta}</span> : null}
                </Link>
              );
            })}
          </nav>
          </div>

        <div className={styles.bottomSection}>
          <AuthStatus showUserBadge={!isCompactViewport} />
        </div>
      </aside>
    </div>
  );
}
