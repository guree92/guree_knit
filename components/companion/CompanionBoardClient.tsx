"use client";

import Link from "next/link";
import { companionFeedItems } from "@/data/companion";
import {
  formatCompanionMembers,
  formatCompanionSchedule,
  getCompanionSummaryStats,
  type CompanionRoom,
} from "@/lib/companion";
import styles from "@/app/companion/page.module.css";

type CompanionBoardClientProps = {
  rooms: CompanionRoom[];
};

function getStatusClassName(room: CompanionRoom) {
  if (room.status === "모집중") return styles.statusRecruiting;
  if (room.status === "곧 시작") return styles.statusSoon;
  if (room.status === "진행중") return styles.statusProgress;

  return styles.statusDone;
}

export default function CompanionBoardClient({ rooms }: CompanionBoardClientProps) {
  const highlights = getCompanionSummaryStats(rooms);

  return (
    <div className={styles.shell}>
      <section className={styles.hero}>
        <div className={styles.heroCopy}>
          <span className={styles.eyebrow}>Companion Community</span>
          <h1 className={styles.title}>동행</h1>
          <p className={styles.description}>
            같은 도안으로 함께 뜨는 사람들을 모으는 커뮤니티예요. 작품별로 방을 열고,
            일정에 맞춰 진행 상황을 공유하면서 끝까지 같이 완성할 수 있게 합니다.
          </p>
          <div className={styles.heroActions}>
            <Link href="/companion/new" className={styles.primaryAction}>
              동행 모집글 쓰기
            </Link>
            <Link href="/community" className={styles.secondaryAction}>
              뜨개마당 보기
            </Link>
          </div>
        </div>

        <div className={styles.heroStats}>
          {highlights.map((item) => (
            <article key={item.label} className={styles.statCard}>
              <span className={styles.statLabel}>{item.label}</span>
              <strong className={styles.statValue}>{item.value}</strong>
            </article>
          ))}
        </div>
      </section>

      <section className={styles.toolbar}>
        <div className={styles.filterRow}>
          <span className={styles.filterChipActive}>전체</span>
          <span className={styles.filterChip}>모집중</span>
          <span className={styles.filterChip}>곧 시작</span>
          <span className={styles.filterChip}>진행중</span>
        </div>
        <div className={styles.sortHint}>인기순 · 최신순 · 시작일순으로 확장 가능</div>
      </section>

      <section className={styles.workspace}>
        <div className={styles.mainColumn}>
          {rooms.length > 0 ? rooms.map((room) => (
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
                  참여하러 가기
                </Link>
              </div>

              <p className={styles.roomSummary}>{room.summary}</p>

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
                  <h2 className={styles.roomTitle}>아직 등록된 동행방이 없어요</h2>
                </div>
                <Link href="/companion/new" className={styles.joinAction}>
                  첫 동행방 만들기
                </Link>
              </div>
              <p className={styles.roomSummary}>
                이제부터는 DB에 저장된 동행방만 이 목록에 표시됩니다.
              </p>
            </article>
          )}
        </div>

        <aside className={styles.sideColumn}>
          <section className={styles.sidePanel}>
            <span className={styles.sectionEyebrow}>Live Feed</span>
            <h2 className={styles.sideTitle}>동행 소식</h2>
            <ul className={styles.feedList}>
              {companionFeedItems.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </section>

          <section className={styles.sidePanel}>
            <span className={styles.sectionEyebrow}>What Matters</span>
            <h2 className={styles.sideTitle}>이 페이지에 들어가야 할 기능</h2>
            <ul className={styles.featureList}>
              <li>도안별 동행방 생성</li>
              <li>참여 신청과 모집 마감</li>
              <li>체크인 일정과 인증 업로드</li>
              <li>공지, 준비물, 참고 링크 고정</li>
              <li>완성작 모아보기와 후기 연결</li>
            </ul>
          </section>
        </aside>
      </section>
    </div>
  );
}
