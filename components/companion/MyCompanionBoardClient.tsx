"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  companionStatuses,
  formatCompanionMembers,
  formatCompanionSchedule,
  type CompanionRoom,
} from "@/lib/companion";
import styles from "@/app/companion/mine/page.module.css";

type Props = {
  rooms: CompanionRoom[];
};

type StatusFilter = "전체" | (typeof companionStatuses)[number];

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

function getTabTone(status: StatusFilter) {
  switch (status) {
    case "모집중":
      return styles.tabRecruiting;
    case "진행중":
      return styles.tabProgress;
    default:
      return "";
  }
}

export default function MyCompanionBoardClient({ rooms }: Props) {
  const [selectedStatus, setSelectedStatus] = useState<StatusFilter>("전체");

  const filteredRooms = useMemo(() => {
    if (selectedStatus === "전체") return rooms;
    return rooms.filter((room) => room.status === selectedStatus);
  }, [rooms, selectedStatus]);

  return (
    <>
      <div className={styles.toolbar}>
        <div className={styles.tabRow}>
          {(["전체", ...companionStatuses] as const).map((status) => (
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
              {status}
            </button>
          ))}
        </div>
        <span className={styles.resultText}>
          {selectedStatus === "전체"
            ? `전체 ${filteredRooms.length}개의 동행`
            : `${selectedStatus} ${filteredRooms.length}개`}
        </span>
      </div>

      {filteredRooms.length > 0 ? (
        <div className={styles.roomList}>
          {filteredRooms.map((room) => (
            <Link key={room.id} href={`/companion/${room.id}`} className={styles.roomCard}>
              <div className={`${styles.statusBubble} ${getStatusClassName(room)}`}>{room.status}</div>

              <div className={styles.roomBody}>
                <span className={styles.patternPill}>{room.patternName}</span>
                <h3 className={styles.roomTitle}>{room.title}</h3>
                <p className={styles.roomSummary}>{room.summary}</p>
                <div className={styles.metaRow}>
                  <span className={styles.metaChip}>진행자 {room.hostName}</span>
                  <span className={styles.metaChip}>{formatCompanionSchedule(room)}</span>
                  <span className={styles.metaChip}>난이도 {room.level}</span>
                  <span className={styles.metaChip}>{formatCompanionMembers(room)}</span>
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
            다른 탭을 눌러 진행 흐름을 살펴보거나, 새 동행방을 만들어보세요.
          </p>
          <div className={styles.emptyActions}>
            <button
              type="button"
              onClick={() => setSelectedStatus("전체")}
              className={styles.secondaryAction}
            >
              전체 보기
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
