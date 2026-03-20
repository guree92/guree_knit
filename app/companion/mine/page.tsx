import Link from "next/link";
import Header from "@/components/layout/Header";
import { createClient as createServerClient } from "@/lib/supabase/server";
import {
  formatCompanionMembers,
  formatCompanionSchedule,
  getCompanionSummaryStats,
  mapCompanionRoom,
  type CompanionRoom,
  type CompanionRoomRow,
} from "@/lib/companion";
import styles from "../page.module.css";

function getStatusClassName(room: CompanionRoom) {
  if (room.status === "모집중") return styles.statusRecruiting;
  if (room.status === "곧 시작") return styles.statusSoon;
  if (room.status === "진행중") return styles.statusProgress;

  return styles.statusDone;
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
                <section className={styles.hero}>
                  <div className={styles.heroHeader}>
                    <div>
                      <span className={styles.eyebrow}>My Companion</span>
                      <h1 className={styles.title}>나와의동행</h1>
                    </div>
                    <div className={styles.heroActions}>
                      <Link
                        href="/login?returnTo=%2Fcompanion%2Fmine"
                        className={styles.primaryAction}
                      >
                        로그인하기
                      </Link>
                    </div>
                  </div>
                </section>

                <article className={styles.roomCard}>
                  <div className={styles.roomHeader}>
                    <div>
                      <div className={styles.roomMetaRow}>
                        <span className={styles.statusDone}>로그인 필요</span>
                      </div>
                      <h2 className={styles.roomTitle}>참여한 동행은 로그인 후 확인할 수 있어요</h2>
                    </div>
                    <Link href="/companion" className={styles.joinAction}>
                      동행 둘러보기
                    </Link>
                  </div>
                  <p className={styles.roomSummary}>
                    내가 참여한 동행방, 진행 중인 일정, 다시 들어가야 할 방을 한곳에서 모아볼 수 있어요.
                  </p>
                </article>
              </div>

              <aside className={styles.sideColumn}>
                <section className={styles.sidePanel}>
                  <span className={styles.sectionEyebrow}>Shortcut</span>
                  <h2 className={styles.sideTitle}>바로가기</h2>
                  <ul className={styles.feedList}>
                    <li>로그인하면 내가 참여한 동행만 모아 보여줘요.</li>
                    <li>진행 중인 방으로 바로 이동할 수 있어요.</li>
                    <li>모집 중인 새 동행도 다시 둘러볼 수 있어요.</li>
                  </ul>
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

    if (roomError) {
      throw new Error(roomError.message);
    }

    if (participantError) {
      throw new Error(participantError.message);
    }

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

      if (profileError) {
        throw new Error(profileError.message);
      }

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

  const highlights = getCompanionSummaryStats(rooms);

  return (
    <>
      <Header />
      <main className={styles.page}>
        <div className={styles.shell}>
          <section className={styles.workspace}>
            <div className={styles.mainColumn}>
              <section className={styles.hero}>
                <div className={styles.heroHeader}>
                  <div>
                    <span className={styles.eyebrow}>My Companion</span>
                    <h1 className={styles.title}>나와의동행</h1>
                  </div>
                  <div className={styles.heroActions}>
                    <Link href="/companion" className={styles.secondaryAction}>
                      전체 동행 보기
                    </Link>
                  </div>
                </div>

                <div className={styles.heroStats}>
                  {highlights.map((item) => (
                    <article key={item.label} className={styles.statCard}>
                      <span className={styles.statLabel}>{item.label}</span>
                      <strong className={styles.statValue}>{item.value}</strong>
                    </article>
                  ))}
                </div>
              </section>

              {rooms.length > 0 ? (
                rooms.map((room) => (
                  <article key={room.id} className={styles.roomCard}>
                    <div className={styles.roomHeader}>
                      <div>
                        <div className={styles.roomMetaRow}>
                          <span className={getStatusClassName(room)}>{room.status}</span>
                          <span className={styles.patternName}>{room.patternName}</span>
                        </div>
                        <h2 className={styles.roomTitle}>
                          <Link href={`/companion/${room.id}`} className={styles.roomLink}>
                            {room.title}
                          </Link>
                        </h2>
                      </div>
                      <Link href={`/companion/${room.id}`} className={styles.joinAction}>
                        동행 정보 보기
                      </Link>
                    </div>

                    <p className={styles.roomSummary}>{room.summary}</p>

                    <div className={styles.roomInfoGrid}>
                      <div className={styles.infoBox}>
                        <span className={styles.infoLabel}>진행자</span>
                        <strong>{room.hostName}</strong>
                      </div>
                      <div className={styles.infoBox}>
                        <span className={styles.infoLabel}>일정</span>
                        <strong>{formatCompanionSchedule(room)}</strong>
                      </div>
                      <div className={styles.infoBox}>
                        <span className={styles.infoLabel}>난이도</span>
                        <strong>{room.level}</strong>
                      </div>
                      <div className={styles.infoBox}>
                        <span className={styles.infoLabel}>참여 인원</span>
                        <strong>{formatCompanionMembers(room)}</strong>
                      </div>
                    </div>
                  </article>
                ))
              ) : (
                <article className={styles.roomCard}>
                  <div className={styles.roomHeader}>
                    <div>
                      <div className={styles.roomMetaRow}>
                        <span className={styles.statusDone}>비어 있음</span>
                      </div>
                      <h2 className={styles.roomTitle}>아직 참여한 동행이 없어요</h2>
                    </div>
                    <Link href="/companion" className={styles.joinAction}>
                      동행 둘러보기
                    </Link>
                  </div>
                  <p className={styles.roomSummary}>
                    마음에 드는 동행방에 참여하면 여기에서 진행 중인 방들을 한 번에 모아볼 수 있어요.
                  </p>
                </article>
              )}
            </div>

            <aside className={styles.sideColumn}>
              <section className={styles.sidePanel}>
                <span className={styles.sectionEyebrow}>My Status</span>
                <h2 className={styles.sideTitle}>나의 동행 현황</h2>
                <ul className={styles.feedList}>
                  <li>참여 중인 동행: {rooms.length}개</li>
                  <li>모집중 상태: {rooms.filter((room) => room.status === "모집중").length}개</li>
                  <li>진행중 상태: {rooms.filter((room) => room.status === "진행중").length}개</li>
                </ul>
              </section>
            </aside>
          </section>
        </div>
      </main>
    </>
  );
}
