"use client";

import Link from "next/link";
import { useMemo, useState, useSyncExternalStore } from "react";
import {
  formatCompanionMembers,
  formatCompanionSchedule,
  type CompanionRoom,
} from "@/lib/companion";
import { getMyCompanionState, readCompanionBoardMeta } from "@/lib/companion-board-meta";
import styles from "@/app/companion/mine/page.module.css";

type Props = {
  rooms: CompanionRoom[];
  currentUserId: string;
  latestMyCheckInByRoom: Record<string, string | null>;
};

type StatusFilter = "progress" | "resting" | "graduated";

function getStatusClassName(status: StatusFilter) {
  switch (status) {
    case "progress":
      return styles.statusRecruiting;
    case "resting":
      return styles.statusDone;
    case "graduated":
      return styles.statusProgress;
    default:
      return styles.statusProgress;
  }
}

function getTabTone(status: StatusFilter) {
  switch (status) {
    case "progress":
      return styles.tabRecruiting;
    case "resting":
      return styles.tabDone;
    case "graduated":
      return styles.tabProgress;
    default:
      return "";
  }
}

function getStatusLabel(status: StatusFilter) {
  if (status === "progress") return "진행";
  if (status === "resting") return "휴식";
  return "졸업";
}

export default function MyCompanionBoardClient({ rooms, currentUserId, latestMyCheckInByRoom }: Props) {
  const [selectedStatus, setSelectedStatus] = useState<StatusFilter>("progress");
  const isHydrated = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false
  );
  const roomStatuses = useMemo(
    () =>
      Object.fromEntries(
        rooms.map((room) => {
          const meta = isHydrated ? readCompanionBoardMeta(room.id)[currentUserId] : undefined;
          return [room.id, getMyCompanionState(meta, latestMyCheckInByRoom[room.id] ?? room.createdAt ?? null)];
        })
      ) as Record<string, StatusFilter>,
    [isHydrated, rooms, currentUserId, latestMyCheckInByRoom]
  );

  const filteredRooms = useMemo(() => {
    return rooms.filter((room) => (roomStatuses[room.id] ?? "progress") === selectedStatus);
  }, [rooms, roomStatuses, selectedStatus]);

  return (
    <>
      <div className={styles.toolbar}>
        <div className={styles.tabRow}>
          {(["progress", "resting", "graduated"] as const).map((status) => (
            <button
              key={status}
              type="button"
              onClick={() => setSelectedStatus(status)}
              className={[
                selectedStatus === status ? styles.tabButtonActive : styles.tabButton,
                getTabTone(status),
              ]
                .join(" ")
                .trim()}
            >
              {getStatusLabel(status)}
            </button>
          ))}
        </div>
      </div>

      {filteredRooms.length > 0 ? (
        <div className={styles.roomList}>
          {filteredRooms.map((room) => (
            <Link key={room.id} href={`/companion/${room.id}`} className={styles.roomCard}>
              <div className={`${styles.statusBubble} ${getStatusClassName(roomStatuses[room.id] ?? "progress")}`}>
                {getStatusLabel(roomStatuses[room.id] ?? "progress")}
              </div>

              <div className={styles.roomBody}>
                <span className={styles.patternPill}>{room.patternName}</span>
                <h3 className={styles.roomTitle}>{room.title}</h3>
                <p className={styles.roomSummary}>{room.summary}</p>
                <div className={styles.metaRow}>
                  <span className={styles.metaChip}>진행자 {room.hostName}</span>
                  <span className={styles.metaChip}>{formatCompanionSchedule(room)}</span>
                  <span className={styles.metaChip}>난이도 {room.level}</span>
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

              <div className={styles.roomMeta}>
                <div className={styles.metaText}>
                  <div>{room.hostName}</div>
                  <div>{formatCompanionSchedule(room)}</div>
                </div>
                <span className={styles.memberPill}>{formatCompanionMembers(room)}</span>
                <span className={styles.readMore}>동행 정보 보기</span>
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <div className={styles.feedbackCard}>
          <p className={styles.feedbackTitle}>아직 이 상태의 동행이 없어요.</p>
          <p className={styles.feedbackDescription}>
            다른 상태 탭을 눌러 내 동행 흐름을 확인해 보세요.
          </p>
          <div className={styles.emptyActions}>
            <button
              type="button"
              onClick={() => setSelectedStatus("progress")}
              className={styles.secondaryAction}
            >
              진행 보기
            </button>
            <Link href="/companion/new" className={styles.primaryAction}>
              동행방 만들기
            </Link>
          </div>
        </div>
      )}
    </>
  );
}
