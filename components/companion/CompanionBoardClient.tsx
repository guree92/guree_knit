"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  companionStatuses,
  formatCompanionMembers,
  formatCompanionSchedule,
  getCompanionSummaryStats,
  type CompanionRoom,
} from "@/lib/companion";
import styles from "@/app/companion/page.module.css";

type CompanionBoardClientProps = {
  rooms: CompanionRoom[];
};

const ROOMS_PER_PAGE = 4;

function getStatusClassName(room: CompanionRoom) {
  if (room.status === "모집중") return styles.statusRecruiting;
  if (room.status === "곧 시작") return styles.statusSoon;
  if (room.status === "진행중") return styles.statusProgress;

  return styles.statusDone;
}

export default function CompanionBoardClient({ rooms }: CompanionBoardClientProps) {
  const [selectedStatus, setSelectedStatus] = useState<"전체" | (typeof companionStatuses)[number]>("전체");
  const [currentPage, setCurrentPage] = useState(1);
  const shouldScrollToBottomRef = useRef(false);
  const filteredRooms = useMemo(() => {
    if (selectedStatus === "전체") return rooms;

    return rooms.filter((room) => room.status === selectedStatus);
  }, [rooms, selectedStatus]);
  const totalPages = Math.max(1, Math.ceil(filteredRooms.length / ROOMS_PER_PAGE));
  const visiblePage = Math.min(currentPage, totalPages);
  const paginatedRooms = useMemo(() => {
    const startIndex = (visiblePage - 1) * ROOMS_PER_PAGE;
    return filteredRooms.slice(startIndex, startIndex + ROOMS_PER_PAGE);
  }, [filteredRooms, visiblePage]);
  const highlights = getCompanionSummaryStats(rooms);

  useEffect(() => {
    if (!shouldScrollToBottomRef.current) {
      return;
    }

    shouldScrollToBottomRef.current = false;
    requestAnimationFrame(() => {
      window.scrollTo({
        top: document.documentElement.scrollHeight,
        behavior: "smooth",
      });
    });
  }, [visiblePage]);

  return (
    <div className={styles.shell}>
      <section className={styles.workspace}>
        <div className={styles.mainColumn}>
          <section className={styles.hero}>
            <div className={styles.heroHeader}>
              <div>
                <span className={styles.eyebrow}>Companion Community</span>
                <h1 className={styles.title}>동행</h1>
              </div>
              <div className={styles.heroActions}>
                <Link href="/companion/new" className={styles.primaryAction}>
                  동행 모집글 쓰기
                </Link>
                <Link href="/companion/mine" className={styles.secondaryAction}>
                  나와의동행
                </Link>
              </div>
            </div>
          </section>

          <section className={styles.toolbar}>
            <div className={styles.filterRow}>
              {(["전체", ...companionStatuses] as const).map((status) => (
                <button
                  key={status}
                  type="button"
                  className={selectedStatus === status ? styles.filterChipActive : styles.filterChip}
                  onClick={() => {
                    setSelectedStatus(status);
                    setCurrentPage(1);
                  }}
                >
                  {status}
                </button>
              ))}
            </div>
          </section>

          <div className={styles.roomList}>
            {filteredRooms.length > 0 ? paginatedRooms.map((room) => (
              <article key={room.id} className={styles.roomCard}>
                <div className={styles.roomHeader}>
                  <div>
                    <div className={styles.roomMetaRow}>
                      <span className={getStatusClassName(room)}>{room.status}</span>
                      <span className={styles.patternName}>{room.patternName}</span>
                    </div>
                    <h2 className={styles.roomTitle}>
                      <Link href={`/companion/${room.id}`} className={styles.roomLink}>
                        {room.title}
                      </Link>
                    </h2>
                  </div>
                  <Link href={`/companion/${room.id}`} className={styles.joinAction}>
                    동행 정보 보기
                  </Link>
                </div>

              <div className={styles.roomInfoGrid}>
                <div className={styles.infoBox}>
                  <span className={styles.infoLabel}>진행자</span>
                  <strong>{room.hostName}</strong>
                  </div>
                  <div className={styles.infoBox}>
                    <span className={styles.infoLabel}>일정</span>
                    <strong>{formatCompanionSchedule(room)}</strong>
                  </div>
                  <div className={styles.infoBox}>
                    <span className={styles.infoLabel}>난이도</span>
                    <strong>{room.level}</strong>
                  </div>
                  <div className={styles.infoBox}>
                    <span className={styles.infoLabel}>참여 인원</span>
                    <strong>{formatCompanionMembers(room)}</strong>
                  </div>
                </div>

                <div className={styles.tagList}>
                  {room.tags.map((tag) => (
                    <span key={tag} className={styles.tag}>
                      #{tag}
                    </span>
                  ))}
                </div>
              </article>
            )) : (
              <article className={styles.roomCard}>
                <div className={styles.roomHeader}>
                  <div>
                    <div className={styles.roomMetaRow}>
                      <span className={styles.statusDone}>비어 있음</span>
                    </div>
                    <h2 className={styles.roomTitle}>
                      {selectedStatus === "전체"
                        ? "아직 등록된 동행방이 없어요"
                        : `${selectedStatus} 상태의 동행방이 아직 없어요`}
                    </h2>
                  </div>
                  <Link href="/companion/new" className={styles.joinAction}>
                    첫 동행방 만들기
                  </Link>
                </div>
            </article>
          )}
          </div>

          {filteredRooms.length > ROOMS_PER_PAGE ? (
            <nav className={styles.pagination} aria-label="동행 목록 페이지">
              {Array.from({ length: totalPages }, (_, index) => {
                const page = index + 1;
                const isActive = page === visiblePage;

                return (
                  <button
                    key={page}
                    type="button"
                    className={isActive ? styles.pageButtonActive : styles.pageButton}
                    onClick={() => {
                      shouldScrollToBottomRef.current = true;
                      setCurrentPage(page);
                    }}
                    aria-current={isActive ? "page" : undefined}
                  >
                    {page}
                  </button>
                );
              })}
            </nav>
          ) : null}
        </div>

        <aside className={styles.sideColumn}>
          <section className={styles.sidePanel}>
            <span className={styles.sectionEyebrow}>Status</span>
            <h2 className={styles.sideTitle}>동행 현황</h2>
            <div className={styles.heroStats}>
              {highlights.map((item) => (
                <article key={item.label} className={styles.statCard}>
                  <span className={styles.statLabel}>{item.label}</span>
                  <strong className={styles.statValue}>{item.value}</strong>
                </article>
              ))}
            </div>
          </section>
        </aside>
      </section>
    </div>
  );
}
