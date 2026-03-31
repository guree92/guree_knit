"use client";

import Link from "next/link";
import { useMemo, useRef, useState } from "react";
import {
  companionStatuses,
  formatCompanionSchedule,
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
    case "진행중":
      return styles.statusProgress;
    default:
      return styles.statusProgress;
  }
}

function getStatusToneClass(status: StatusFilter) {
  switch (status) {
    case "모집중":
      return styles.filterToneRecruiting;
    case "진행중":
      return styles.filterToneProgress;
    default:
      return "";
  }
}

function formatParticipantRatio(room: Pick<CompanionRoom, "participantCount" | "capacity">) {
  return `${room.participantCount}/${room.capacity}`;
}

export default function CompanionBoardClient({ rooms }: CompanionBoardClientProps) {
  const [selectedStatus, setSelectedStatus] = useState<StatusFilter>("전체");
  const [searchText, setSearchText] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const paginationRef = useRef<HTMLElement | null>(null);

  const filteredRooms = useMemo(() => {
    const keyword = searchText.trim().toLowerCase();

    return rooms.filter((room) => {
      if (selectedStatus !== "전체" && room.status !== selectedStatus) return false;
      if (!keyword) return true;

      const targetText = [
        room.title,
        room.summary,
        room.hostName,
        room.patternName,
        room.level,
        ...room.tags,
      ]
        .join(" ")
        .toLowerCase();

      return targetText.includes(keyword);
    });
  }, [rooms, selectedStatus, searchText]);

  const totalPages = Math.max(1, Math.ceil(filteredRooms.length / ROOMS_PER_PAGE));
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const paginatedRooms = useMemo(() => {
    const startIndex = (safeCurrentPage - 1) * ROOMS_PER_PAGE;
    return filteredRooms.slice(startIndex, startIndex + ROOMS_PER_PAGE);
  }, [filteredRooms, safeCurrentPage]);
  const soonestRooms = useMemo(() => {
    const recruitingRooms = rooms.filter((room) => room.status === "\uBAA8\uC9D1\uC911");
    const sourceRooms = recruitingRooms.length > 0 ? recruitingRooms : rooms;

    return [...sourceRooms]
      .sort((left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime())
      .slice(0, 4);
  }, [rooms]);

  const recruitingOpenCount = rooms.filter((room) => room.status === "모집중").length;
  const inProgressCount = rooms.filter((room) => room.status === "진행중").length;

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
            <div className={styles.heroTop}>
              <div className={styles.heroIntro}>
                <h1 className={styles.heroTitle}>동행</h1>
                <p className={styles.heroDescription}>
                  함께 뜨고 싶은 사람들과 일정에 맞춰 동행방을 열어보세요
                </p>

              </div>
              <div className={`${styles.heroActions} ${styles.heroActionsInline}`}>
                <Link href="/companion/mine" className={styles.secondaryLinkAction}>
                  나와의동행
                </Link>
                <Link href="/companion/new" className={styles.primaryAction}>
                  동행방 만들기
                </Link>
              </div>
            </div>
          </section>

          <section className={styles.filterPanel}>
            <div className={styles.searchRow}>
              <div className={styles.searchBox}>
                <input
                  id="companion-search"
                  type="text"
                  aria-label="동행방 검색"
                  value={searchText}
                  onChange={(event) => {
                    setSearchText(event.target.value);
                    setCurrentPage(1);
                  }}
                  placeholder="제목, 내용, 작성자, 태그로 검색해 보세요"
                  className={styles.searchInput}
                />
              </div>
            </div>
            <div className={styles.toolbar}>
              <div className={styles.filterRow}>
                {(["\uC804\uCCB4", ...companionStatuses] as const).map(
                  (status) => (
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
                  )
                )}
              </div>
            </div>
          </section>

          <section className={styles.listSection}>
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
                            <h3 className={styles.cardTitle}>{room.title}</h3>
                          </div>

                          <p className={styles.cardPreview}>{room.summary}</p>

                          <div className={styles.infoChipRow}>
                            <span className={styles.infoChip}>진행자 {room.hostName}</span>
                            <span className={styles.infoChip}>난이도 {room.level}</span>
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
                          <div className={styles.boardMetaInline}>
                            <span className={styles.boardMetaText}>{formatCompanionSchedule(room)}</span>
                            <span className={styles.boardMetaText}>@{room.hostName}</span>
                            <span className={styles.likesPill}>{formatParticipantRatio(room)}</span>
                          </div>
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
                            className={safeCurrentPage === page ? styles.pageNumberActive : styles.pageNumber}
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
            <div className={styles.sideStatsGrid}>
              <article className={styles.statCard}>
                <span className={styles.statLabel}>전체 동행방</span>
                <strong className={styles.statValue}>{rooms.length}</strong>
              </article>
              <article className={styles.statCard}>
                <span className={styles.statLabel}>모집중</span>
                <strong className={styles.statValue}>{recruitingOpenCount}</strong>
              </article>
              <article className={styles.statCard}>
                <span className={styles.statLabel}>진행중</span>
                <strong className={styles.statValue}>{inProgressCount}</strong>
              </article>
            </div>
          </section>

          <section className={styles.sidePanel}>
            <div className={styles.sectionHeader}>
              <h2 className={styles.sectionTitle}>{"\uBAA8\uC9D1\uC911 \uB3D9\uD589"}</h2>
            </div>

            <div className={styles.sideStack}>
              {soonestRooms.map((room) => (
                <Link key={room.id} href={`/companion/${room.id}`} className={styles.highlightCard}>
                  <div className={styles.highlightTopRow}>
                    <div className={styles.highlightTitleRow}>
                      <span className={`${styles.highlightCategory} ${getStatusClassName(room)}`}>
                        {room.status}
                      </span>
                      <strong className={styles.highlightTitle}>{room.title}</strong>
                    </div>
                    <div className={styles.highlightMetaRow}>
                      <span className={styles.likesPill}>{formatParticipantRatio(room)}</span>
                    </div>
                  </div>
                  <div className={styles.highlightBottomRow}>

                    <span className={styles.readMore}>동행 정보 보기</span>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        </aside>
      </section>
    </div>
  );
}


