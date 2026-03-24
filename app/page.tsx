import Image from "next/image";
import HomeMainCollectionsClient, {
  type MainPatternCard,
} from "@/components/home/HomeMainCollectionsClient";
import SideColumnClient, {
  type SideProgressItem,
} from "@/components/home/SideColumnClient";
import Header from "@/components/layout/Header";
import { workItems } from "@/data/my-work";
import { createClient as createServerClient } from "@/lib/supabase/server";
import styles from "./home-dashboard.module.css";
import heroHeaderImage from "../Image/headerlogo.png";

type PatternSummary = {
  id: string;
  title: string;
  category: string | null;
  level: string | null;
  like_count: number | null;
  image_path?: string | null;
  created_at?: string | null;
  author_nickname?: string | null;
};

function escapeFilterValue(value: string) {
  return value.replace(/"/g, '\\"');
}

export default async function HomePage() {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let nickname =
    (user?.user_metadata?.nickname as string | undefined) ??
    (user?.user_metadata?.name as string | undefined) ??
    null;

  let candidateNames = [] as string[];

  if (user && !nickname) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("nickname")
      .eq("id", user.id)
      .maybeSingle();

    nickname = profile?.nickname ?? null;
  }

  candidateNames = Array.from(
    new Set(
      [nickname, user?.user_metadata?.name as string | undefined, user?.email?.split("@")[0]].filter(Boolean)
    )
  ) as string[];

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

  const topPatterns: MainPatternCard[] = topPatternsRows.map((item) => ({
    id: item.id,
    title: item.title,
    category: item.category,
    level: item.level,
    like_count: item.like_count ?? 0,
    image_path: item.image_path ?? null,
    author_nickname: item.user_id ? nicknameMap.get(item.user_id) ?? null : null,
  }));

  const profileName = nickname ?? user?.email?.split("@")[0] ?? "게스트";
  const profileEmail = user?.email ?? "";
  const avatarSeed = profileName.trim().charAt(0).toUpperCase() || "G";
  const initialPatternCount = 0;
  const myWorkCount = user ? workItems.length : 0;

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
                className={styles.heroTitleImageAsset}
              />
            </div>
          </div>
        </section>

        <section className={styles.dashboard}>
          <div className={styles.mainColumn}>
            <HomeMainCollectionsClient
              topPatterns={topPatterns}
              progressItems={progressItems}
              isLoggedIn={Boolean(user)}
            />
          </div>

          <SideColumnClient
            userId={user?.id ?? null}
            candidateNames={candidateNames}
            profileName={profileName}
            profileEmail={profileEmail}
            avatarSeed={avatarSeed}
            initialPatternCount={initialPatternCount}
            myWorkCount={myWorkCount}
          />
        </section>
      </section>
    </main>
  );
}
