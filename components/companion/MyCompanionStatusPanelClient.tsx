"use client";

import { useMemo, useSyncExternalStore } from "react";
import type { CompanionRoom } from "@/lib/companion";
import { getMyCompanionState, readCompanionBoardMeta, type MyCompanionState } from "@/lib/companion-board-meta";
import styles from "@/app/companion/mine/page.module.css";

type Props = {
  rooms: CompanionRoom[];
  currentUserId: string;
  latestMyCheckInByRoom: Record<string, string | null>;
};

export default function MyCompanionStatusPanelClient({ rooms, currentUserId, latestMyCheckInByRoom }: Props) {
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
      ) as Record<string, MyCompanionState>,
    [isHydrated, rooms, currentUserId, latestMyCheckInByRoom]
  );

  const counts = useMemo(() => {
    return rooms.reduce(
      (acc, room) => {
        const status = roomStatuses[room.id] ?? "progress";
        if (status === "progress") acc.progress += 1;
        if (status === "resting") acc.resting += 1;
        if (status === "graduated") acc.graduated += 1;
        return acc;
      },
      { total: rooms.length, progress: 0, resting: 0, graduated: 0 }
    );
  }, [rooms, roomStatuses]);

  return (
    <section className={styles.sidePanel}>
      <div className={styles.sectionHeader}>
        <span className={styles.sectionEyebrow}>My Status</span>
        <h2 className={styles.sectionTitle}>지금의 흐름</h2>
      </div>
      <div className={styles.sideList}>
        <div className={styles.sideRow}>
          <span>내가 참여한 동행</span>
          <strong>{counts.total}개</strong>
        </div>
        <div className={styles.sideRow}>
          <span>진행 동행</span>
          <strong>{counts.progress}개</strong>
        </div>
        <div className={styles.sideRow}>
          <span>휴식 동행</span>
          <strong>{counts.resting}개</strong>
        </div>
        <div className={styles.sideRow}>
          <span>졸업한 동행</span>
          <strong>{counts.graduated}개</strong>
        </div>
      </div>
    </section>
  );
}
