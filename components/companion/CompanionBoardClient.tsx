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

type StatusFilter = "전체" | (typeof companionStatuses)[number];

const ROOMS_PER_PAGE = 5;

function getStatusClassName(room: CompanionRoom) {
  switch (room.status) {
    case "모집중":
      return styles.statusRecruiting;
    case "곧 시작":
      return styles.statusSoon;
    case "진행중":
      return styles.statusProgress;
    default:
      return styles.statusDone;
  }
}

function getStatusToneClass(status: StatusFilter) {
  switch (status) {
    case "모집중":
      return styles.filterToneRecruiting;
    case "곧 시작":
      return styles.filterToneSoon;
    case "진행중":
      return styles.filterToneProgress;
    case "완료":
      return styles.filterToneDone;
    default:
      return "";
  }
}

export default function CompanionBoardClient({ rooms }: CompanionBoardClientProps) {
  const [selectedStatus, setSelectedStatus] = useState<StatusFilter>("전체");
  const [currentPage, setCurrentPage] = useState(1);
  const paginationRef = useRef<HTMLElement | null>(null);

  const filteredRooms = useMemo(() => {
    if (selectedStatus === "전체") return rooms;
    return rooms.filter((room) => room.status === selectedStatus);
  }, [rooms, selectedStatus]);

  const totalPages = Math.max(1, Math.ceil(filteredRooms.length / ROOMS_PER_PAGE));
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const paginatedRooms = useMemo(() => {
    const startIndex = (safeCurrentPage - 1) * ROOMS_PER_PAGE;
    return filteredRooms.slice(startIndex, startIndex + ROOMS_PER_PAGE);
  }, [filteredRooms, safeCurrentPage]);

  const highlightStats = getCompanionSummaryStats(rooms);
  const soonestRooms = useMemo(() => {
    const recruitingRooms = rooms.filter((room) => room.status === "모집중");
    const sourceRooms = recruitingRooms.length > 0 ? recruitingRooms : rooms;

    return [...sourceRooms]
      .sort((left, right) => {
        if (recruitingRooms.length > 0) {
          const recruitGap =
            new Date(left.recruitUntil).getTime() - new Date(right.recruitUntil).getTime();

          if (recruitGap !== 0) return recruitGap;
        }

        return new Date(left.startDate).getTime() - new Date(right.startDate).getTime();
      })
      .slice(0, 3);
  }, [rooms]);

  const recruitingOpenCount = rooms.filter((room) => room.status === "모집중").length;
  const inProgressCount = rooms.filter((room) => room.status === "진행중").length;

  useEffect(() => {
    setCurrentPage((page) => Math.min(page, totalPages));
  }, [totalPages]);

  function moveToPage(nextPage: number) {
    const normalizedPage = Math.min(Math.max(nextPage, 1), totalPages);
    if (normalizedPage === safeCurrentPage) return;

    setCurrentPage(normalizedPage);

    requestAnimationFrame(() => {
      const node = paginationRef.current;
      if (!node) return;

      const { bottom } = node.getBoundingClientRect();
      const targetY = Math.max(0, window.scrollY + bottom - window.innerHeight + 24);
      window.scrollTo({ top: targetY, behavior: "smooth" });
    });
  }

  return (
    <div className={styles.shell}>
      <section className={styles.workspace}>
        <div className={styles.mainColumn}>
          <section className={styles.hero}>
            <div className={styles.heroContent}>
              <div className={styles.heroBadge}>Companion</div>
              <div className={styles.heroIntro}>
                <div>
                  <h1 className={styles.heroTitle}>동행</h1>
                </div>
              </div>
            </div>
            <div className={styles.heroActions}>
              <Link href="/companion/new" className={styles.primaryAction}>
                동행방 만들기
              </Link>
              <Link href="/companion/mine" className={styles.secondaryLinkAction}>
                나와의동행
              </Link>
            </div>
          </section>

          <section className={styles.listSection}>
            <div className={styles.sectionHeader}>
              <h2 className={styles.sectionTitle}>모두의 동행</h2>
            </div>

            <div className={styles.toolbar}>
              <div className={styles.filterRow}>
                {(["전체", ...companionStatuses] as const).map((status) => (
                  <button
                    key={status}
                    type="button"
                    onClick={() => {
                      setSelectedStatus(status);
                      setCurrentPage(1);
                    }}
                    className={[
                      selectedStatus === status ? styles.filterChipActive : styles.filterChip,
                      getStatusToneClass(status),
                    ]
                      .join(" ")
                      .trim()}
                  >
                    {status}
                  </button>
                ))}
              </div>

              <div className={styles.resultBar}>
                <span className={styles.resultText}>
                  {selectedStatus === "전체"
                    ? `전체 ${filteredRooms.length}개의 동행방`
                    : `${selectedStatus} 상태의 동행방 ${filteredRooms.length}개`}
                </span>
              </div>
            </div>

            {filteredRooms.length > 0 ? (
              <>
                <div className={styles.boardList}>

                  {paginatedRooms.map((room) => (
                    <article key={room.id} className={styles.boardRow}>
                      <Link href={`/companion/${room.id}`} className={styles.boardLink}>
                        <div className={styles.boardThumbCell}>
                          <div className={`${styles.boardFallback} ${getStatusClassName(room)}`}>
                            <span className={styles.boardFallbackLabel}>{room.status}</span>
                          </div>
                        </div>

                        <div className={styles.boardMain}>
                          <div className={styles.boardTitleRow}>
                            <span className={styles.patternPill}>{room.patternName}</span>
                          </div>

                          <h3 className={styles.cardTitle}>{room.title}</h3>
                          <p className={styles.cardPreview}>{room.summary}</p>

                          <div className={styles.infoChipRow}>
                            <span className={styles.infoChip}>진행자 {room.hostName}</span>
                            <span className={styles.infoChip}>{formatCompanionSchedule(room)}</span>
                            <span className={styles.infoChip}>난이도 {room.level}</span>
                            <span className={styles.infoChip}>{formatCompanionMembers(room)}</span>
                          </div>

                          {room.tags.length > 0 ? (
                            <div className={styles.tagList}>
                              {room.tags.map((tag) => (
                                <span key={`${room.id}-${tag}`} className={styles.tag}>
                                  #{tag}
                                </span>
                              ))}
                            </div>
                          ) : null}
                        </div>

                        <div className={styles.boardMeta}>
                          <div className={styles.boardMetaTop}>
                            <span>{room.hostName}</span>
                            <span>{formatCompanionSchedule(room)}</span>
                          </div>
                          <span className={styles.likesPill}>{formatCompanionMembers(room)}</span>
                          <span className={styles.readMore}>동행 정보 보기</span>
                        </div>
                      </Link>
                    </article>
                  ))}
                </div>

                {totalPages > 1 ? (
                  <nav ref={paginationRef} className={styles.pagination} aria-label="동행 페이지 이동">
                    <button
                      type="button"
                      onClick={() => moveToPage(safeCurrentPage - 1)}
                      disabled={safeCurrentPage === 1}
                      className={styles.pageNavButton}
                    >
                      이전
                    </button>

                    <div className={styles.pageNumberList}>
                      {Array.from({ length: totalPages }, (_, index) => {
                        const page = index + 1;

                        return (
                          <button
                            key={page}
                            type="button"
                            onClick={() => moveToPage(page)}
                            aria-current={safeCurrentPage === page ? "page" : undefined}
                            className={
                              safeCurrentPage === page
                                ? styles.pageNumberActive
                                : styles.pageNumber
                            }
                          >
                            {page}
                          </button>
                        );
                      })}
                    </div>

                    <button
                      type="button"
                      onClick={() => moveToPage(safeCurrentPage + 1)}
                      disabled={safeCurrentPage === totalPages}
                      className={styles.pageNavButton}
                    >
                      다음
                    </button>
                  </nav>
                ) : null}
              </>
            ) : (
              <div className={styles.feedbackCard}>
                <p className={styles.feedbackTitle}>아직 이 상태의 동행방이 없어요.</p>
                <p className={styles.feedbackDescription}>
                  다른 상태를 골라보거나, 첫 번째 동행방을 직접 열어 분위기를 만들어보세요.
                </p>
                <div className={styles.emptyActions}>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedStatus("전체");
                      setCurrentPage(1);
                    }}
                    className={styles.secondaryLinkAction}
                  >
                    전체 동행방 보기
                  </button>
                  <Link href="/companion/new" className={styles.primaryAction}>
                    동행방 만들기
                  </Link>
                </div>
              </div>
            )}
          </section>
        </div>

        <aside className={styles.sideColumn}>
          <section className={styles.sidePanel}>
            <div className={styles.sectionHeader}>
              <span className={styles.sectionEyebrow}>At A Glance</span>
              <h2 className={styles.sectionTitle}>지금의 흐름</h2>
            </div>

            <div className={styles.sideList}>
              {highlightStats.map((item) => (
                <div key={item.label} className={styles.sideRow}>
                  <span>{item.label}</span>
                  <strong>{item.value}</strong>
                </div>
              ))}
              <div className={styles.sideRow}>
                <span>전체 인원 흐름</span>
                <strong>{rooms.reduce((sum, room) => sum + room.participantCount, 0)}명</strong>
              </div>
            </div>
          </section>

          <section className={styles.sidePanel}>
            <div className={styles.sectionHeader}>
              <span className={styles.sectionEyebrow}>Starting Soon</span>
              <h2 className={styles.sectionTitle}>가까운 일정</h2>
            </div>

            <div className={styles.sideStack}>
              {soonestRooms.map((room) => (
                <Link key={room.id} href={`/companion/${room.id}`} className={styles.highlightCard}>
                  <span className={`${styles.highlightCategory} ${getStatusClassName(room)}`}>
                    {room.status}
                  </span>
                  <strong className={styles.highlightTitle}>{room.title}</strong>
                  <span className={styles.highlightMeta}>{formatCompanionSchedule(room)}</span>
                </Link>
              ))}
            </div>
          </section>
        </aside>
      </section>
    </div>
  );
}

















