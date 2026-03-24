"use client";

import Link from "next/link";
import { useState } from "react";
import type { HomeNotification } from "@/components/home/HomeNotificationBell";
import styles from "@/app/home-dashboard.module.css";

export type SideProgressItem = {
  id: string;
  title: string;
  percent: number;
  note: string;
};

type Props = {
  profileName: string;
  profileEmail: string;
  avatarSeed: string;
  myPatternCount: number;
  myWorkCount: number;
  myCommunityCount: number;
  notifications: HomeNotification[];
  communityLikeSources: unknown[];
  patternLikeSources: unknown[];
  calendarItems: Array<{ time: string; title: string; color: "sage" | "beige" | "line" }>;
};

export default function SideColumnClient({
  profileName,
  profileEmail,
  avatarSeed,
  myPatternCount,
  myWorkCount,
  myCommunityCount,
  notifications,
  calendarItems,
}: Props) {
  const [activeTab, setActiveTab] = useState<"alarm" | "schedule">("alarm");

  return (
    <aside className={styles.sideColumn}>
      <section className={`${styles.profileCard} ${styles.desktopProfileCard}`}>
        <div className={styles.profileHeader}>MY PROFILE</div>
        <div className={styles.profileBody}>
          <div className={styles.profileAvatar}>{avatarSeed}</div>
          <div className={styles.profileIdentity}>
            <div>
              <h2 className={styles.profileName}>{profileName}</h2>
              <p className={styles.profileLocation}>{profileEmail}</p>
            </div>
          </div>
        </div>

        <div className={styles.profileMetaGrid}>
          <div>
            <span className={styles.metaLabel}>도안</span>
            <strong className={styles.metaValue}>{myPatternCount}</strong>
          </div>
          <div>
            <span className={styles.metaLabel}>뜨개마당</span>
            <strong className={styles.metaValue}>{myCommunityCount}</strong>
          </div>
          <div>
            <span className={styles.metaLabel}>기록</span>
            <strong className={styles.metaValue}>{myWorkCount}</strong>
          </div>
        </div>
      </section>

      <section className={styles.inlinePanel}>
        <div className={styles.inlineTabs}>
          <button
            type="button"
            className={activeTab === "alarm" ? styles.inlineTabActive : styles.inlineTab}
            onClick={() => setActiveTab("alarm")}
          >
            알림
          </button>
          <button
            type="button"
            className={activeTab === "schedule" ? styles.inlineTabActive : styles.inlineTab}
            onClick={() => setActiveTab("schedule")}
          >
            일정
          </button>
        </div>

        <div className={styles.inlinePanelBody}>
          {activeTab === "alarm" ? (
            notifications.length > 0 ? (
              notifications.slice(0, 3).map((item) => (
                <Link key={item.id} href={item.href} className={styles.inlineNoticeItem}>
                  <div className={styles.inlineNoticeIcon}>
                    <span className={styles.inlineNoticeDot} />
                  </div>
                  <div className={styles.inlineNoticeText}>
                    <strong>{item.title}</strong>
                    <p>{item.description}</p>
                  </div>
                  <span className={styles.inlineNoticeTime}>{formatRelativeTime(item.createdAt)}</span>
                </Link>
              ))
            ) : (
              <div className={styles.inlineNoticeEmpty}>표시할 알림이 아직 없어요.</div>
            )
          ) : calendarItems.length > 0 ? (
            calendarItems.map((item) => (
              <div key={`${item.time}-${item.title}`} className={styles.inlineNoticeItem}>
                <div className={styles.inlineNoticeIcon}>
                  <span
                    className={
                      item.color === "sage"
                        ? styles.dotSage
                        : item.color === "beige"
                          ? styles.dotBeige
                          : styles.dotLine
                    }
                  />
                </div>
                <div className={styles.inlineNoticeText}>
                  <strong>{item.title}</strong>
                  <p>{item.time}</p>
                </div>
              </div>
            ))
          ) : (
            <div className={styles.inlineNoticeEmpty}>등록된 일정이 없어요.</div>
          )}
        </div>
      </section>
    </aside>
  );
}

function formatRelativeTime(value: string) {
  const createdAt = new Date(value).getTime();
  if (Number.isNaN(createdAt)) return "방금 전";

  const diffMinutes = Math.max(1, Math.round((Date.now() - createdAt) / 60000));
  if (diffMinutes < 60) return `${diffMinutes}분 전`;

  const diffHours = Math.round(diffMinutes / 60);
  if (diffHours < 24) return `약 ${diffHours}시간 전`;

  return `${Math.round(diffHours / 24)}일 전`;
}
