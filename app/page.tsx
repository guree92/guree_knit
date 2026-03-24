import Image from "next/image";
import Link from "next/link";
import { unstable_cache } from "next/cache";
import HomeMainCollectionsClient, {
  type MainPatternCard,
} from "@/components/home/HomeMainCollectionsClient";
import SideColumnClient, {
  type SideProgressItem,
} from "@/components/home/SideColumnClient";
import Header from "@/components/layout/Header";
import { createPublicServerClient } from "@/lib/supabase/public-server";
import styles from "./home-dashboard.module.css";
import heroHeaderImage from "../Image/headerlogo.png";

export const dynamic = "force-static";

type PatternSummary = {
  id: string;
  title: string;
  category: string | null;
  level: string | null;
  like_count: number | null;
  image_path?: string | null;
};

const getCachedTopPatterns = unstable_cache(
  async () => {
    const supabase = createPublicServerClient();
    const topPatternsResult = await supabase
      .from("patterns")
      .select("id, title, category, level, like_count, image_path, user_id")
      .eq("is_hidden", false)
      .order("like_count", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(5);

    const topPatternsRows = (topPatternsResult.data ?? []) as Array<
      PatternSummary & { user_id?: string | null }
    >;
    const topPatternUserIds = Array.from(
      new Set(topPatternsRows.map((item) => item.user_id).filter(Boolean))
    ) as string[];

    let nicknameMap = new Map<string, string | null>();

    if (topPatternUserIds.length > 0) {
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, nickname")
        .in("id", topPatternUserIds);

      nicknameMap = new Map(
        ((profiles ?? []) as Array<{ id: string; nickname: string | null }>).map((profile) => [
          profile.id,
          profile.nickname,
        ])
      );
    }

    return topPatternsRows.map(
      (item): MainPatternCard => ({
        id: item.id,
        title: item.title,
        category: item.category,
        level: item.level,
        like_count: item.like_count ?? 0,
        image_path: item.image_path ?? null,
        author_nickname: item.user_id ? nicknameMap.get(item.user_id) ?? null : null,
      })
    );
  },
  ["home-top-patterns"],
  { revalidate: 300 }
);

export default async function HomePage() {
  const topPatterns = await getCachedTopPatterns();

  const progressItems: SideProgressItem[] = [
    { id: "net-bag-project", title: "네트백", percent: 68, note: "손잡이 길이와 마감 디테일 조정 중" },
    { id: "tulip-coaster-set", title: "튤립 코스터 세트", percent: 92, note: "마지막 정리와 촬영만 남았어요" },
    { id: "rabbit-doll-project", title: "토끼 인형", percent: 37, note: "귀 모양 수정 후 다시 이어뜨기 예정" },
  ];

  return (
    <main className={styles.page}>
      <Header />

      <section className={styles.pageShell}>
        <section className={styles.heroPanel}>
          <div className={styles.heroCopy}>
            <div className={styles.heroTitleImage}>
              <Image
                src={heroHeaderImage}
                alt="Hero header"
                priority
                unoptimized
                className={styles.heroTitleImageAsset}
              />
            </div>
          </div>
        </section>

        <section className={styles.dashboard}>
          <div className={styles.mainColumn}>
            <HomeMainCollectionsClient topPatterns={topPatterns} progressItems={progressItems} />
          </div>

          <SideColumnClient
            userId={null}
            candidateNames={[]}
            profileName="게스트"
            profileEmail=""
            avatarSeed="게"
            initialPatternCount={0}
            myWorkCount={0}
          />
        </section>

        <footer className={styles.footer}>
          <div className={styles.footerBrand}>
            <strong className={styles.footerTitle}>Knit.GUREE</strong>
            <p className={styles.footerDescription}>
              뜨개 패턴과 작업 기록, 커뮤니티를 한곳에서 연결하는 공간입니다.
            </p>
          </div>

          <div className={styles.footerNav}>
            <div className={styles.footerGroup}>
              <span className={styles.footerHeading}>Service</span>
              <Link href="#" className={styles.footerLink}>
                Home
              </Link>
              <Link href="#" className={styles.footerLink}>
                Patterns
              </Link>
              <Link href="#" className={styles.footerLink}>
                Community
              </Link>
            </div>

            <div className={styles.footerGroup}>
              <span className={styles.footerHeading}>Support</span>
              <Link href="#" className={styles.footerLink}>
                Help
              </Link>
              <Link href="#" className={styles.footerLink}>
                Terms
              </Link>
              <Link href="#" className={styles.footerLink}>
                Privacy
              </Link>
            </div>

            <div className={styles.footerGroup}>
              <span className={styles.footerHeading}>Contact</span>
              <Link href="#" className={styles.footerLink}>
                Instagram
              </Link>
              <Link href="#" className={styles.footerLink}>
                Email
              </Link>
              <Link href="#" className={styles.footerLink}>
                Newsletter
              </Link>
            </div>
          </div>
        </footer>
      </section>
    </main>
  );
}
