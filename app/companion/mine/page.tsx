import Link from "next/link";
import Header from "@/components/layout/Header";
import MyCompanionBoardClient from "@/components/companion/MyCompanionBoardClient";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { mapCompanionRoom, type CompanionRoom, type CompanionRoomRow } from "@/lib/companion";
import styles from "./page.module.css";

function MineHero() {
  return (
    <section className={styles.mineHero}>
      <div className={styles.mineHeroBadge}>My Companion</div>
      <h1 className={styles.mineHeroTitle}>나와의 동행</h1>
    </section>
  );
}

function MineHeroWithActions() {
  return (
    <section className={styles.mineHeroWithActions}>
      <div className={styles.mineHeroContent}>
        <div className={styles.mineHeroBadge}>My Companion</div>
        <h1 className={styles.mineHeroTitle}>나와의 동행</h1>
      </div>
      <div className={styles.mineHeroActions}>
        <Link href="/companion/new" className={styles.primaryAction}>
          동행방 만들기
        </Link>
        <Link href="/companion" className={styles.secondaryAction}>
          모두의 동행
        </Link>
      </div>
    </section>
  );
}

export default async function MyCompanionPage() {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return (
      <>
        <Header />
        <main className={styles.page}>
          <div className={styles.shell}>
            <section className={styles.workspace}>
              <div className={styles.mainColumn}>
                <MineHero />

                <section className={styles.feedbackCard}>
                  <p className={styles.feedbackTitle}>참여한 동행은 로그인 후 확인할 수 있어요.</p>
                  <p className={styles.feedbackDescription}>
                    내가 함께 뜨고 있는 방과 진행 기록을 이곳에서 차분하게 모아볼 수 있어요.
                  </p>
                  <div className={styles.emptyActions}>
                    <Link
                      href="/login?returnTo=%2Fcompanion%2Fmine"
                      className={styles.primaryAction}
                    >
                      로그인하고 보기
                    </Link>
                    <Link href="/companion" className={styles.secondaryAction}>
                      모두의 동행
                    </Link>
                  </div>
                </section>
              </div>

              <aside className={styles.sideColumn}>
                <section className={styles.sidePanel}>
                  <div className={styles.sectionHeader}>
                    <span className={styles.sectionEyebrow}>Shortcut</span>
                    <h2 className={styles.sectionTitle}>바로가기</h2>
                  </div>
                  <div className={styles.noteList}>
                    <p>로그인하면 내가 참여한 동행만 모아서 보여줘요.</p>
                    <p>진행 중인 방으로 바로 이동해 흐름을 이어갈 수 있어요.</p>
                    <p>전체 동행 페이지로 돌아가 새 방도 편하게 둘러볼 수 있어요.</p>
                  </div>
                </section>
              </aside>
            </section>
          </div>
        </main>
      </>
    );
  }

  const { data: myParticipantRows, error: myParticipantError } = await supabase
    .from("companion_participants")
    .select("room_id")
    .eq("user_id", user.id);

  if (myParticipantError) {
    throw new Error(myParticipantError.message);
  }

  const joinedRoomIds = Array.from(
    new Set(
      (((myParticipantRows ?? []) as Array<{ room_id: string }>) ?? []).map((row) => row.room_id)
    )
  );

  let rooms: CompanionRoom[] = [];

  if (joinedRoomIds.length > 0) {
    const [{ data: roomRows, error: roomError }, { data: participantRows, error: participantError }] =
      await Promise.all([
        supabase
          .from("companion_rooms")
          .select("*")
          .in("id", joinedRoomIds)
          .order("created_at", { ascending: false }),
        supabase.from("companion_participants").select("room_id, user_id").in("room_id", joinedRoomIds),
      ]);

    if (roomError) throw new Error(roomError.message);
    if (participantError) throw new Error(participantError.message);

    const companionRoomRows = ((roomRows ?? []) as CompanionRoomRow[]) ?? [];
    const participantCountMap = new Map<string, number>();

    (((participantRows ?? []) as Array<{ room_id: string; user_id: string }>) ?? []).forEach((row) => {
      participantCountMap.set(row.room_id, (participantCountMap.get(row.room_id) ?? 0) + 1);
    });

    const hostIds = Array.from(
      new Set(companionRoomRows.map((row) => row.host_user_id).filter(Boolean))
    ) as string[];

    let nicknameMap = new Map<string, string | null>();

    if (hostIds.length > 0) {
      const { data: profiles, error: profileError } = await supabase
        .from("profiles")
        .select("id, nickname")
        .in("id", hostIds);

      if (profileError) throw new Error(profileError.message);

      nicknameMap = new Map(
        ((profiles ?? []) as Array<{ id: string; nickname: string | null }>).map((profile) => [
          profile.id,
          profile.nickname,
        ])
      );
    }

    rooms = companionRoomRows.map((row) => ({
      ...mapCompanionRoom(row, {
        hostName: row.host_user_id ? nicknameMap.get(row.host_user_id) ?? "진행자" : "진행자",
      }),
      participantCount: participantCountMap.get(row.id) ?? 0,
    }));
  }

  const startingSoonCount = rooms.filter((room) => room.status === "곧 시작").length;
  const inProgressCount = rooms.filter((room) => room.status === "진행중").length;
  const completedCount = rooms.filter((room) => room.status === "완료").length;

  return (
    <>
      <Header />
      <main className={styles.page}>
        <div className={styles.shell}>
          <section className={styles.workspace}>
            <div className={styles.mainColumn}>
              <MineHeroWithActions />

              <section className={styles.listSection}>
                <div className={styles.sectionHeader}>
                  <h2 className={styles.sectionTitle}>참여한 동행방</h2>
                </div>
                {rooms.length > 0 ? (
                  <MyCompanionBoardClient rooms={rooms} />
                ) : (
                  <div className={styles.feedbackCard}>
                    <p className={styles.feedbackTitle}>아직 참여한 동행방이 없어요.</p>
                    <p className={styles.feedbackDescription}>
                      마음이 가는 동행방에 참여하면 이곳에서 일정과 기록을 한 번에 모아볼 수 있어요.
                    </p>
                    <div className={styles.emptyActions}>
                      <Link href="/companion" className={styles.secondaryAction}>
                        모두의 동행
                      </Link>
                      <Link href="/companion/new" className={styles.primaryAction}>
                        첫 동행방 만들기
                      </Link>
                    </div>
                  </div>
                )}
              </section>
            </div>

            <aside className={styles.sideColumn}>
              <section className={styles.sidePanel}>
                <div className={styles.sectionHeader}>
                  <span className={styles.sectionEyebrow}>My Status</span>
                  <h2 className={styles.sectionTitle}>지금의 흐름</h2>
                </div>
                <div className={styles.sideList}>
                  <div className={styles.sideRow}>
                    <span>내가 참여한 동행</span>
                    <strong>{rooms.length}개</strong>
                  </div>
                  <div className={styles.sideRow}>
                    <span>곧 시작하는 동행</span>
                    <strong>{startingSoonCount}개</strong>
                  </div>
                  <div className={styles.sideRow}>
                    <span>진행중 동행</span>
                    <strong>{inProgressCount}개</strong>
                  </div>
                  <div className={styles.sideRow}>
                    <span>완료한 동행</span>
                    <strong>{completedCount}개</strong>
                  </div>
                </div>
              </section>

              <section className={styles.sidePanel}>
                <div className={styles.sectionHeader}>
                  <span className={styles.sectionEyebrow}>Keep Going</span>
                  <h2 className={styles.sectionTitle}>작은 메모</h2>
                </div>
                <div className={styles.noteList}>
                  <p>곧 시작하는 방은 준비물과 공지를 먼저 확인해두면 좋아요.</p>
                  <p>진행 중인 방에서는 질문과 체크인을 자주 남길수록 흐름이 좋아져요.</p>
                  <p>새로운 분위기를 만들고 싶다면 직접 동행방을 열어도 좋아요.</p>
                </div>
              </section>
            </aside>
          </section>
        </div>
      </main>
    </>
  );
}
