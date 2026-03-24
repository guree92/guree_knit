"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import styles from "@/app/home-dashboard.module.css";
import {
  NOTIFICATION_DISMISSED_STORAGE_KEY,
  NOTIFICATION_READ_STORAGE_KEY,
  readStoredStringList,
  subscribeStoredStringList,
  writeStoredStringList,
} from "@/lib/home-notifications";

export type HomeNotification = {
  id: string;
  kind: "community" | "pattern";
  title: string;
  description: string;
  href: string;
  createdAt: string;
};

export type LikeSource = {
  id: string;
  title: string;
  href: string;
  likeCount: number;
};

type Props = {
  notifications: HomeNotification[];
  communityLikeSources: LikeSource[];
  patternLikeSources: LikeSource[];
  buttonClassName?: string;
};

function BellIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path
        d="M12 4.75a4.25 4.25 0 0 0-4.25 4.25v2.1c0 .77-.24 1.52-.68 2.15l-1.07 1.54a1 1 0 0 0 .82 1.57h10.42a1 1 0 0 0 .82-1.57l-1.07-1.54a3.75 3.75 0 0 1-.68-2.15V9A4.25 4.25 0 0 0 12 4.75Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M10.25 18.25a1.75 1.75 0 0 0 3.5 0"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
      />
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path
        d="M9 5.5h6m-7.5 2h9l-.7 9.1a1.75 1.75 0 0 1-1.74 1.61h-4.12a1.75 1.75 0 0 1-1.74-1.61L7.5 7.5Zm2.2-2.2h4.6a.7.7 0 0 0 .7-.7.85.85 0 0 0-.85-.85h-5a.85.85 0 0 0-.85.85.7.7 0 0 0 .7.7Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function formatNotificationTime(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "방금 전";

  return new Intl.DateTimeFormat("ko-KR", {
    month: "numeric",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

function buildLikeNotifications(
  sources: LikeSource[],
  prefix: string,
  kind: "community" | "pattern",
  label: string
) {
  return sources
    .filter((item) => item.likeCount > 0)
    .map(
      (item): HomeNotification => ({
        id: `${prefix}-${item.id}-${item.likeCount}`,
        kind,
        title: item.title,
        description: `${label}에 좋아요 ${item.likeCount}개가 있어요.`,
        href: item.href,
        createdAt: new Date().toISOString(),
      })
    );
}

export default function HomeNotificationBell({
  notifications,
  communityLikeSources,
  patternLikeSources,
  buttonClassName,
}: Props) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activeFilter, setActiveFilter] = useState<"all" | "community" | "pattern">("all");
  const [selectedNotificationIds, setSelectedNotificationIds] = useState<string[]>([]);

  const likeNotifications = useMemo(() => {
    const communityNotifications = buildLikeNotifications(
      communityLikeSources,
      "community-like",
      "community",
      "내 뜨개마당 글"
    );
    const patternNotifications = buildLikeNotifications(
      patternLikeSources,
      "pattern-like",
      "pattern",
      "내 도안"
    );

    return [...communityNotifications, ...patternNotifications];
  }, [communityLikeSources, patternLikeSources]);

  useEffect(() => {
    if (typeof document === "undefined") return;

    const previousOverflow = document.body.style.overflow;

    if (isModalOpen) {
      document.body.style.overflow = "hidden";
    }

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [isModalOpen]);

  const allNotifications = useMemo(
    () =>
      [...notifications, ...likeNotifications].sort(
        (left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime()
      ),
    [notifications, likeNotifications]
  );

  const activeReadNotificationIds = useSyncExternalStore(
    (onChange) => subscribeStoredStringList(NOTIFICATION_READ_STORAGE_KEY, onChange),
    () => readStoredStringList(NOTIFICATION_READ_STORAGE_KEY),
    () => []
  );
  const activeDismissedNotificationIds = useSyncExternalStore(
    (onChange) => subscribeStoredStringList(NOTIFICATION_DISMISSED_STORAGE_KEY, onChange),
    () => readStoredStringList(NOTIFICATION_DISMISSED_STORAGE_KEY),
    () => []
  );
  const visibleNotifications = allNotifications.filter(
    (item) => !activeDismissedNotificationIds.includes(item.id)
  );
  const unreadCount = visibleNotifications.filter(
    (item) => !activeReadNotificationIds.includes(item.id)
  ).length;
  const filteredNotifications = visibleNotifications.filter((item) =>
    activeFilter === "all" ? true : item.kind === activeFilter
  );

  function markNotificationAsRead(notificationId: string) {
    const nextIds = Array.from(new Set([...activeReadNotificationIds, notificationId]));
    writeStoredStringList(NOTIFICATION_READ_STORAGE_KEY, nextIds);
  }

  function toggleNotificationSelection(notificationId: string) {
    setSelectedNotificationIds((current) =>
      current.includes(notificationId)
        ? current.filter((id) => id !== notificationId)
        : [...current, notificationId]
    );
  }

  function deleteSelectedNotifications() {
    if (selectedNotificationIds.length === 0) return;

    const nextDismissedIds = Array.from(
      new Set([...activeDismissedNotificationIds, ...selectedNotificationIds])
    );
    setSelectedNotificationIds([]);
    writeStoredStringList(NOTIFICATION_DISMISSED_STORAGE_KEY, nextDismissedIds);
  }

  return (
    <>
      <button
        type="button"
        className={buttonClassName ? `${styles.iconButton} ${buttonClassName}` : styles.iconButton}
        aria-label="알림"
        onClick={() => {
          setActiveFilter("all");
          setSelectedNotificationIds([]);
          setIsModalOpen(true);
        }}
      >
        <span className={styles.toolbarIconShell}>
          <BellIcon />
        </span>
        {unreadCount > 0 ? <span className={styles.topAlertBadge}>{unreadCount}</span> : null}
      </button>

      {isModalOpen ? (
        <div className={styles.notificationModalOverlay} role="presentation" onClick={() => setIsModalOpen(false)}>
          <div
            className={styles.notificationModal}
            role="dialog"
            aria-modal="true"
            aria-label="알림 목록"
            onClick={(event) => event.stopPropagation()}
          >
            <div className={styles.notificationModalHeader}>
              <div>
                <p className={styles.sideSectionEyebrow}>NOTIFICATIONS</p>
                <h2 className={styles.sideSectionTitle}>알림 모아보기</h2>
              </div>
              <button
                type="button"
                className={styles.notificationCloseButton}
                onClick={() => setIsModalOpen(false)}
              >
                닫기
              </button>
            </div>

            <div className={styles.notificationFilterRow}>
              <button
                type="button"
                className={activeFilter === "all" ? styles.filterButtonActive : styles.filterButton}
                onClick={() => setActiveFilter("all")}
              >
                전체
              </button>
              <button
                type="button"
                className={activeFilter === "community" ? styles.filterButtonActive : styles.filterButton}
                onClick={() => setActiveFilter("community")}
              >
                뜨개마당
              </button>
              <button
                type="button"
                className={activeFilter === "pattern" ? styles.filterButtonActive : styles.filterButton}
                onClick={() => setActiveFilter("pattern")}
              >
                도안
              </button>
              <button
                type="button"
                className={styles.notificationDeleteButton}
                onClick={deleteSelectedNotifications}
                disabled={selectedNotificationIds.length === 0}
                aria-label="선택한 알림 삭제"
              >
                <TrashIcon />
              </button>
            </div>

            <div className={styles.notificationList}>
              {filteredNotifications.length > 0 ? (
                filteredNotifications.map((item) => {
                  const isUnread = !activeReadNotificationIds.includes(item.id);
                  const isSelected = selectedNotificationIds.includes(item.id);

                  return (
                    <div
                      key={item.id}
                      className={isUnread ? styles.notificationItemUnread : styles.notificationItemRead}
                    >
                      <label className={styles.notificationSelect}>
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleNotificationSelection(item.id)}
                        />
                        <span className={styles.notificationSelectMark} />
                      </label>
                      <Link
                        href={item.href}
                        className={styles.notificationItemLink}
                        onClick={() => {
                          markNotificationAsRead(item.id);
                          setIsModalOpen(false);
                        }}
                      >
                        <div className={styles.notificationItemInner}>
                          <div className={styles.notificationContent}>
                            <div className={styles.notificationItemTop}>
                              <div className={styles.notificationMainLine}>
                                <span className={isUnread ? styles.notificationPillUnread : styles.notificationPillRead}>
                                  {item.kind === "community" ? "뜨당" : "도안"}
                                </span>
                                <strong>{item.title}</strong>
                                <p>{item.description}</p>
                              </div>
                              <span className={styles.notificationTime}>
                                {formatNotificationTime(item.createdAt)}
                              </span>
                            </div>
                          </div>
                        </div>
                      </Link>
                    </div>
                  );
                })
              ) : (
                <div className={styles.notificationEmpty}>
                  <p>표시할 알림이 아직 없어요.</p>
                  <span>댓글이나 좋아요 소식이 생기면 여기에서 바로 확인할 수 있어요.</span>
                </div>
              )}
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
