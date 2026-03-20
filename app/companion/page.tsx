import { createClient as createServerClient } from "@/lib/supabase/server";
import Header from "@/components/layout/Header";
import CompanionBoardClient from "@/components/companion/CompanionBoardClient";
import { mapCompanionRoom, type CompanionRoom, type CompanionRoomRow } from "@/lib/companion";
import styles from "./page.module.css";

export default async function CompanionPage() {
  const supabase = await createServerClient();
  const [{ data: roomRows }, { data: participantRows }] = await Promise.all([
    supabase.from("companion_rooms").select("*").order("created_at", { ascending: false }),
    supabase.from("companion_participants").select("room_id, user_id"),
  ]);

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
    const { data: profiles } = await supabase.from("profiles").select("id, nickname").in("id", hostIds);

    nicknameMap = new Map(
      ((profiles ?? []) as Array<{ id: string; nickname: string | null }>).map((profile) => [
        profile.id,
        profile.nickname,
      ])
    );
  }

  const rooms: CompanionRoom[] = companionRoomRows.map((row) => ({
    ...mapCompanionRoom(row, {
      hostName: row.host_user_id ? nicknameMap.get(row.host_user_id) ?? "진행자" : "진행자",
    }),
    participantCount: participantCountMap.get(row.id) ?? 0,
  }));

  return (
    <>
      <Header />
      <main className={styles.page}>
        <CompanionBoardClient rooms={rooms} />
      </main>
    </>
  );
}
