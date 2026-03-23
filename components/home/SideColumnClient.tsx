"use client";

import Link from "next/link";
import HomeNotificationBell, {
  type HomeNotification,
  type LikeSource,
} from "@/components/home/HomeNotificationBell";
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
  communityLikeSources: LikeSource[];
  patternLikeSources: LikeSource[];
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
  communityLikeSources,
  patternLikeSources,
  calendarItems,
}: Props) {
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
            <HomeNotificationBell
              notifications={notifications}
              communityLikeSources={communityLikeSources}
              patternLikeSources={patternLikeSources}
            />
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

      <section className={`${styles.heroMakerCard} ${styles.sideMakerCard}`}>
        <div className={styles.heroMakerTopRow}>
          <div className={styles.heroMakerTextBlock}>
            <h2 className={styles.heroMakerTitle}>도트메이커</h2>
            <p className={styles.makerDescription}>
              격자 위에 도트를 직접 찍으면서 쉽고 빠르게 뜨개 도안 초안을 만들어보세요.
            </p>
          </div>

          <div className={styles.heroMakerPreviewStack}>
            <div className={styles.heroMakerPreviewCard}>
              <div className={styles.heroMakerToolbar}>
                <span className={styles.heroMakerToolPencil} />
                <span className={styles.heroMakerSwatchYellow} />
                <span className={styles.heroMakerSwatchGreen} />
                <span className={styles.heroMakerSwatchPeach} />
              </div>
              <div className={styles.heroMakerGridEditor}>
                <span className={styles.heroMakerPixelYellow} />
                <span className={styles.heroMakerPixelYellow} />
                <span className={styles.heroMakerPixelYellow} />
                <span className={styles.heroMakerPixelYellow} />
                <span className={styles.heroMakerPixelYellow} />
                <span className={styles.heroMakerPixelYellow} />
                <span className={styles.heroMakerPixelYellow} />
                <span className={styles.heroMakerPixelYellow} />
                <span className={styles.heroMakerPixelYellow} />
                <span className={styles.heroMakerPixelGreen} />
                <span className={styles.heroMakerPixelGreen} />
                <span className={styles.heroMakerPixelGreen} />
                <span className={styles.heroMakerPixelGreen} />
                <span className={styles.heroMakerPixelGreen} />
              </div>
            </div>
          </div>
        </div>
        <Link href="/dot-maker" className={styles.heroMakerAction}>
          도트메이커 시작하기
        </Link>
      </section>

      <section className={styles.calendarCard}>
        <div className={styles.calendarHeader}>
          <h2>MY CALENDAR</h2>
          <span>April</span>
        </div>

        <div className={styles.calendarDays}>
          <span>Sun</span>
          <span className={styles.dayActive}>Mon</span>
          <span>Tue</span>
          <span>Wed</span>
          <span>Thu</span>
          <span>Fri</span>
          <span>Sat</span>
        </div>

        <div className={styles.calendarNumbers}>
          <span>12</span>
          <span className={styles.numberActive}>13</span>
          <span>14</span>
          <span>15</span>
          <span>16</span>
          <span>17</span>
          <span>18</span>
        </div>

        <div className={styles.scheduleList}>
          {calendarItems.map((item) => (
            <div key={`${item.time}-${item.title}`} className={styles.scheduleItem}>
              <span className={styles.scheduleTime}>{item.time}</span>
              <span
                className={
                  item.color === "sage"
                    ? styles.dotSage
                    : item.color === "beige"
                      ? styles.dotBeige
                      : styles.dotLine
                }
              />
              <span className={styles.scheduleTitle}>{item.title}</span>
            </div>
          ))}
        </div>
      </section>
    </aside>
  );
}
