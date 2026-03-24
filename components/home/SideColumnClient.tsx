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
}: Props) {
  const isGuest = profileName === "게스트";

  return (
    <aside className={styles.sideColumn}>
      <section className={`${styles.profileCard} ${styles.desktopProfileCard}`}>
        <div className={styles.profileBody}>
          <div className={styles.profileAvatar}>{avatarSeed}</div>
          <div className={styles.profileIdentity}>
            <div
              className={`${styles.profileIdentityMain} ${isGuest ? styles.profileIdentityMainGuest : ""}`}
            >
              <div className={styles.profileNameRow}>
                <h2 className={styles.profileName}>{profileName}</h2>
                {!isGuest ? (
                  <HomeNotificationBell
                    notifications={notifications}
                    communityLikeSources={communityLikeSources}
                    patternLikeSources={patternLikeSources}
                    buttonClassName={styles.profileNotificationButton}
                  />
                ) : null}
              </div>
              <p className={styles.profileLocation}>{profileEmail}</p>
            </div>
          </div>
        </div>

        {isGuest ? (
          <Link href="/login?returnTo=%2F" className={styles.profileLoginBand}>
            로그인하기
          </Link>
        ) : (
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
        )}
      </section>
    </aside>
  );
}
