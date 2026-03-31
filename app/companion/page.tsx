import Image from "next/image";
import { createClient as createServerClient } from "@/lib/supabase/server";
import Header from "@/components/layout/Header";
import CompanionBoardClient from "@/components/companion/CompanionBoardClient";
import {
  isCompanionParticipantCounted,
  mapCompanionRoom,
  type CompanionParticipantActivityStatus,
  type CompanionRoom,
  type CompanionRoomRow,
} from "@/lib/companion";
import styles from "./page.module.css";
import heroHeaderImage from "../../Image/headerlogo.png";

export default async function CompanionPage() {
  const supabase = await createServerClient();
  const [{ data: roomRows }, { data: participantRows }] = await Promise.all([
    supabase.from("companion_rooms").select("*").order("created_at", { ascending: false }),
    supabase.from("companion_participants").select("room_id, user_id, role, activity_status, last_activity_at, joined_at"),
  ]);

  const companionRoomRows = ((roomRows ?? []) as CompanionRoomRow[]) ?? [];
  const participantCountMap = new Map<string, number>();

  (((participantRows ?? []) as Array<{ room_id: string; user_id: string; role: "host" | "participant" | "waiting"; activity_status: CompanionParticipantActivityStatus | null; last_activity_at: string | null; joined_at: string | null }>) ?? []).forEach((row) => {
    if (!isCompanionParticipantCounted(row)) return;
    participantCountMap.set(row.room_id, (participantCountMap.get(row.room_id) ?? 0) + 1);
  });

  const hostIds = Array.from(
    new Set(companionRoomRows.map((row) => row.host_user_id).filter(Boolean))
  ) as string[];

  let nicknameMap = new Map<string, string | null>();

  if (hostIds.length > 0) {
    const { data: profiles } = await supabase.from("profiles").select("id, nickname").in("id", hostIds);

    nicknameMap = new Map(
      ((profiles ?? []) as Array<{ id: string; nickname: string | null }>).map((profile) => [
        profile.id,
        profile.nickname,
      ])
    );
  }

  const rooms: CompanionRoom[] = companionRoomRows.map((row) => ({
    ...mapCompanionRoom(
      {
        ...row,
        participant_count: participantCountMap.get(row.id) ?? 0,
      },
      {
        hostName: row.host_user_id ? nicknameMap.get(row.host_user_id) ?? "진행자" : "진행자",
      }
    ),
    participantCount: participantCountMap.get(row.id) ?? 0,
  }));

  return (
    <>
      <Header />
      <main className={styles.page}>
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
        <CompanionBoardClient rooms={rooms} />
      </main>
    </>
  );
}
