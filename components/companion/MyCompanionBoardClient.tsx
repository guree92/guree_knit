"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  formatCompanionMembers,
  formatCompanionSchedule,
  type CompanionParticipantActivityStatus,
  type CompanionRoom,
} from "@/lib/companion";
import styles from "@/app/companion/mine/page.module.css";

type Props = {
  rooms: CompanionRoom[];
  roomStatuses: Record<string, CompanionParticipantActivityStatus>;
};

type StatusFilter = "all" | "waiting" | "progress" | "resting" | "graduated";

function getStatusClassName(status: CompanionParticipantActivityStatus) {
  switch (status) {
    case "waiting":
      return styles.statusWaiting;
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
    case "waiting":
      return styles.tabWaiting;
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

function getStatusLabel(status: StatusFilter | CompanionParticipantActivityStatus) {
  if (status === "all") return "전체";
  if (status === "waiting") return "참여 대기";
  if (status === "progress") return "진행";
  if (status === "resting") return "휴식";
  return "졸업";
}

export default function MyCompanionBoardClient({ rooms, roomStatuses }: Props) {
  const [selectedStatus, setSelectedStatus] = useState<StatusFilter>("all");

  const filteredRooms = useMemo(() => {
    if (selectedStatus === "all") return rooms;
    return rooms.filter((room) => (roomStatuses[room.id] ?? "progress") === selectedStatus);
  }, [rooms, roomStatuses, selectedStatus]);

  return (
    <>
      <div className={styles.toolbar}>
        <div className={styles.tabRow}>
          {(["all", "waiting", "progress", "resting", "graduated"] as const).map((status) => (
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
          {filteredRooms.map((room) => {
            const status = roomStatuses[room.id] ?? "progress";
            return (
              <Link key={room.id} href={`/companion/${room.id}`} className={styles.roomCard}>
                <div className={`${styles.statusBubble} ${getStatusClassName(status)}`}>
                  {getStatusLabel(status)}
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
            );
          })}
        </div>
      ) : (
        <div className={styles.feedbackCard}>
          <p className={styles.feedbackTitle}>아직 해당 상태의 동행이 없어요.</p>
          <p className={styles.feedbackDescription}>
            다른 상태 탭을 눌러 현재 동행 흐름을 확인해 보세요.
          </p>
          <div className={styles.emptyActions}>
            <button
              type="button"
              onClick={() => setSelectedStatus("all")}
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
