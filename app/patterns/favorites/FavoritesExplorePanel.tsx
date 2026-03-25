"use client";

import { useMemo, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { type PatternItem } from "@/lib/patterns";
import styles from "./favorites-page.module.css";

const needleFilters = ["전체", "코바늘", "대바늘"] as const;

type FavoritePatternListItem = PatternItem & {
  saved_at: string | null;
};

type FavoritesExplorePanelProps = {
  initialItems: FavoritePatternListItem[];
};

export default function FavoritesExplorePanel({ initialItems }: FavoritesExplorePanelProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const searchInputRef = useRef<HTMLInputElement | null>(null);

  const keyword = searchParams.get("q") ?? "";
  const selectedNeedleFilter = (searchParams.get("needle") as (typeof needleFilters)[number]) ?? needleFilters[0];

  const filteredCount = useMemo(() => {
    const lowerKeyword = keyword.trim().toLowerCase();

    const filtered = initialItems.filter((item) => {
      const matchesNeedle =
        selectedNeedleFilter === needleFilters[0] || (item.needle ?? "").includes(selectedNeedleFilter);
      if (!matchesNeedle) return false;

      if (!lowerKeyword) return true;

      const target = [
        item.title,
        item.description,
        item.category,
        item.level,
        item.author_nickname ?? "",
        item.yarn,
      ]
        .join(" ")
        .toLowerCase();

      return target.includes(lowerKeyword);
    });

    return filtered.length;
  }, [initialItems, keyword, selectedNeedleFilter]);

  function updateParams(next: { q?: string; needle?: (typeof needleFilters)[number] }) {
    const params = new URLSearchParams(searchParams.toString());

    if (next.q !== undefined) {
      if (next.q.trim()) params.set("q", next.q);
      else params.delete("q");
    }

    if (next.needle !== undefined) {
      if (next.needle === needleFilters[0]) params.delete("needle");
      else params.set("needle", next.needle);
    }

    params.delete("page");
    const query = params.toString();
    router.replace(query ? `/patterns/favorites?${query}` : "/patterns/favorites", { scroll: false });
  }

  return (
    <section className={`${styles.sidePanel} ${styles.explorePanel}`}>
      <h2 className={styles.exploreTitle}>탐색</h2>

      <div className={styles.exploreSearchRow}>
        <input
          ref={searchInputRef}
          id="favorite-pattern-search"
          type="text"
          value={keyword}
          onChange={(event) => updateParams({ q: event.target.value })}
          placeholder="찜한 도안을 검색하세요"
          className={styles.exploreSearchInput}
        />
        <button
          type="button"
          onClick={keyword ? () => updateParams({ q: "" }) : () => searchInputRef.current?.focus()}
          className={styles.exploreSearchButton}
        >
          {keyword ? "지우기" : "검색"}
        </button>
      </div>

      <div className={styles.exploreChipRow}>
        {needleFilters.map((item) => (
          <button
            key={item}
            type="button"
            onClick={() => updateParams({ needle: item })}
            className={selectedNeedleFilter === item ? styles.exploreChipActive : styles.exploreChip}
          >
            {item}
          </button>
        ))}
      </div>

      <div className={styles.exploreMetaRow}>
        <span>총 {filteredCount.toLocaleString()}개의 결과</span>
      </div>
    </section>
  );
}
