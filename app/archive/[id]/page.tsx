"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState, type ChangeEvent } from "react";
import { useParams } from "next/navigation";
import Header from "@/components/layout/Header";
import {
  getEffectiveCompanionParticipantActivityStatus,
  type CompanionParticipantActivityStatus,
} from "@/lib/companion";
import { workItems, type WorkProgress } from "@/data/my-work";
import { createClient } from "@/lib/supabase/client";
import {
  normalizeStoredWorkItem,
  readStoredWorkItems,
  writeStoredWorkItems,
  type StoredWorkItem,
  type WorkLogEntry,
  type WorkMemoSections,
} from "@/lib/my-work-storage";
import styles from "./archive-detail-page.module.css";
import heroHeaderImage from "../../../Image/headerlogo.png";

const seedWorkItems: StoredWorkItem[] = workItems.map((item) =>
  normalizeStoredWorkItem({
    ...item,
    source: "seed",
  })
);

type GalleryPhoto = {
  id: string;
  src: string;
  name: string;
  source: "cover" | "log";
  logId?: string;
};

type DetailTabKey = "logs" | "photos" | "operations" | "notes";

function formatDate(value: string | null | undefined) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

function getTodayKey() {
  return new Date().toISOString().slice(0, 10);
}

function getRelativeText(value: string | null | undefined) {
  if (!value) return "-";
  const target = new Date(value);
  if (Number.isNaN(target.getTime())) return value;
  const diffDays = Math.round((Date.now() - target.getTime()) / 86400000);
  if (diffDays <= 0) return "오늘";
  if (diffDays === 1) return "어제";
  if (diffDays < 7) return `${diffDays}일 전`;
  return formatDate(value);
}

function getProgressPillClasses(status: WorkProgress | "졸업") {
  if (status === "완성" || status === "졸업") return "bg-[#5e79b0] text-white";
  if (status === "진행 중") return "bg-[#6e8a66] text-white";
  return "bg-[linear-gradient(135deg,#e7a29a,#d97b70)] text-white";
}

function getStatusHistoryLabel(status: WorkProgress | "졸업") {
  if (status === "졸업") return "동행 졸업";
  return status;
}

function createEmptyMemoSections(work: StoredWorkItem): WorkMemoSections {
  return {
    todayNote: work.memoSections?.todayNote ?? work.note,
    blockers: work.memoSections?.blockers ?? "",
    nextPlan: work.memoSections?.nextPlan ?? "",
    materials: work.memoSections?.materials ?? work.yarn,
    reflection: work.memoSections?.reflection ?? work.detail,
  };
}

export default function MyWorkDetailPage() {
  const params = useParams();
  const supabase = useMemo(() => createClient(), []);
  const id = String(params.id);

  const [work, setWork] = useState<StoredWorkItem | null>(null);
  const [companionActivity, setCompanionActivity] = useState<CompanionParticipantActivityStatus | null>(null);
  const [editingBasic, setEditingBasic] = useState(false);
  const [title, setTitle] = useState("");
  const [yarn, setYarn] = useState("");
  const [needle, setNeedle] = useState("");
  const [note, setNote] = useState("");
  const [detail, setDetail] = useState("");
  const [memoSections, setMemoSections] = useState<WorkMemoSections>({
    todayNote: "",
    blockers: "",
    nextPlan: "",
    materials: "",
    reflection: "",
  });
  const [checklistInput, setChecklistInput] = useState("");
  const [logSummary, setLogSummary] = useState("오늘도 한 단 전진");
  const [logMemo, setLogMemo] = useState("");
  const [logDuration, setLogDuration] = useState("30");
  const [logPhoto, setLogPhoto] = useState<{ name: string; dataUrl: string } | null>(null);
  const [selectedPhoto, setSelectedPhoto] = useState<GalleryPhoto | null>(null);
  const [notice, setNotice] = useState("");
  const [activeTab, setActiveTab] = useState<DetailTabKey>("logs");

  useEffect(() => {
    const seedMatch = seedWorkItems.find((item) => item.id === id) ?? null;
    const localMatch = readStoredWorkItems().find((item) => item.id === id) ?? null;
    const rawMatch = localMatch ?? seedMatch;
    const nextWork = rawMatch ? normalizeStoredWorkItem(rawMatch) : null;

    setWork(nextWork);

    if (nextWork) {
      setTitle(nextWork.title);
      setYarn(nextWork.yarn);
      setNeedle(nextWork.needle);
      setNote(nextWork.note);
      setDetail(nextWork.detail);
      setMemoSections(createEmptyMemoSections(nextWork));
    }
  }, [id]);

  useEffect(() => {
    if (!notice) return;
    const timeoutId = window.setTimeout(() => setNotice(""), 2400);
    return () => window.clearTimeout(timeoutId);
  }, [notice]);

  useEffect(() => {
    let isCancelled = false;

    async function fetchCompanionActivity() {
      if (!work?.sourceCompanionRoomId) {
        setCompanionActivity(null);
        return;
      }

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        if (!isCancelled) setCompanionActivity(null);
        return;
      }

      const { data, error } = await supabase
        .from("companion_participants")
        .select("role, activity_status, last_activity_at, joined_at")
        .eq("room_id", work.sourceCompanionRoomId)
        .eq("user_id", user.id)
        .maybeSingle();

      if (isCancelled) return;

      if (error || !data) {
        if (error) console.error(error);
        setCompanionActivity(null);
        return;
      }

      setCompanionActivity(
        getEffectiveCompanionParticipantActivityStatus({
          role: data.role,
          activity_status: data.activity_status,
          last_activity_at: data.last_activity_at,
          joined_at: data.joined_at,
        })
      );
    }

    void fetchCompanionActivity();

    return () => {
      isCancelled = true;
    };
  }, [supabase, work?.sourceCompanionRoomId]);

  function persistWork(nextWork: StoredWorkItem) {
    const normalized = normalizeStoredWorkItem({
      ...nextWork,
      source: "local",
    });
    const localItems = readStoredWorkItems();
    const nextLocalItems = localItems.filter((item) => item.id !== normalized.id);
    nextLocalItems.unshift({
      ...normalized,
      source: "local",
    });
    writeStoredWorkItems(nextLocalItems);
    setWork(normalized);
    return normalized;
  }

  const effectiveProgress = useMemo<WorkProgress | "졸업">(() => {
    if (!work) return "진행 중";
    if (work.sourceCompanionRoomId) {
      if (companionActivity === "graduated") return "졸업";
      if (companionActivity === "resting" || companionActivity === "waiting") return "중단";
    }
    return work.progress;
  }, [companionActivity, work]);

  const connectionTypeLabel = work?.sourceCompanionRoomId
    ? "동행 연결"
    : work?.sourcePatternId
      ? "도안 연결"
      : "개인 작품";

  const canManuallyChangeStatus = Boolean(work) && !work?.sourceCompanionRoomId;

  useEffect(() => {
    if (!work?.sourceCompanionRoomId || !companionActivity) return;

    const mappedStatus: WorkProgress | "졸업" =
      companionActivity === "graduated"
        ? "졸업"
        : companionActivity === "resting" || companionActivity === "waiting"
          ? "중단"
          : "진행 중";

    if (work.statusHistory?.[0]?.status === mappedStatus) return;

    const nextWork = persistWork({
      ...work,
      progress: mappedStatus === "졸업" ? "완성" : mappedStatus,
      note:
        companionActivity === "graduated"
          ? "동행을 졸업한 작품이에요."
          : companionActivity === "resting" || companionActivity === "waiting"
            ? "동행에서 잠시 쉬고 있는 작품이에요."
            : work.note,
      detail:
        companionActivity === "graduated"
          ? `${work.title} 동행을 잘 마무리하고 졸업한 작품이에요.`
          : companionActivity === "resting" || companionActivity === "waiting"
            ? `${work.title} 동행에서 잠시 쉬어가는 작품이에요.`
            : work.detail,
      statusHistory: [
        {
          id: `status-${work.id}-${Date.now()}`,
          status: mappedStatus,
          createdAt: getTodayKey(),
          source: "companion-auto",
          note:
            mappedStatus === "졸업"
              ? "동행 상태가 졸업으로 자동 반영되었어요."
              : mappedStatus === "중단"
                ? "동행 상태가 중단으로 자동 반영되었어요."
                : "동행 상태가 진행 중으로 자동 반영되었어요.",
        },
        ...(work.statusHistory ?? []),
      ],
    });

    setTitle(nextWork.title);
    setYarn(nextWork.yarn);
    setNeedle(nextWork.needle);
    setNote(nextWork.note);
    setDetail(nextWork.detail);
    setMemoSections(createEmptyMemoSections(nextWork));
  }, [companionActivity, work]);

  const galleryPhotos = useMemo<GalleryPhoto[]>(() => {
    if (!work) return [];
    const photos: GalleryPhoto[] = [];
    if (work.coverPhotoDataUrl) {
      photos.push({
        id: `cover-${work.id}`,
        src: work.coverPhotoDataUrl,
        name: work.coverPhotoName ?? `${work.title} 대표 사진`,
        source: "cover",
      });
    }
    (work.workLogs ?? []).forEach((log) => {
      if (!log.photoDataUrl) return;
      photos.push({
        id: `log-photo-${log.id}`,
        src: log.photoDataUrl,
        name: log.photoName ?? `${log.summary} 사진`,
        source: "log",
        logId: log.id,
      });
    });
    return photos;
  }, [work]);

  function updateMemoSection(key: keyof WorkMemoSections, value: string) {
    setMemoSections((current) => ({ ...current, [key]: value }));
  }

  function handleBasicSave() {
    if (!work) return;
    const trimmedTitle = title.trim();
    const trimmedYarn = yarn.trim();
    const trimmedNeedle = needle.trim();
    const trimmedNote = note.trim();
    const trimmedDetail = detail.trim();

    if (!trimmedTitle || !trimmedYarn || !trimmedNeedle || !trimmedNote || !trimmedDetail) {
      alert("작품명, 사용 실, 바늘, 한 줄 메모, 상세 메모를 모두 입력해 주세요.");
      return;
    }

    const nextWork = persistWork({
      ...work,
      title: trimmedTitle,
      yarn: trimmedYarn,
      needle: trimmedNeedle,
      note: trimmedNote,
      detail: trimmedDetail,
      updatedAt: getTodayKey(),
    });

    setEditingBasic(false);
    setMemoSections(createEmptyMemoSections(nextWork));
    setNotice("기본 정보를 저장했어요.");
  }

  function handleStatusChange(nextStatus: WorkProgress) {
    if (!work || !canManuallyChangeStatus || work.progress === nextStatus) return;

    persistWork({
      ...work,
      progress: nextStatus,
      updatedAt: getTodayKey(),
      statusHistory: [
        {
          id: `status-${work.id}-${Date.now()}`,
          status: nextStatus,
          createdAt: getTodayKey(),
          source: "manual",
          note: `${nextStatus} 상태로 변경했어요.`,
        },
        ...(work.statusHistory ?? []),
      ],
    });
    setNotice(`상태를 ${nextStatus}로 변경했어요.`);
  }

  function handleMemoSave() {
    if (!work) return;
    persistWork({
      ...work,
      memoSections,
      note: memoSections.todayNote.trim() || work.note,
      detail: memoSections.reflection.trim() || work.detail,
      updatedAt: getTodayKey(),
    });
    setNotice("확장 메모를 저장했어요.");
  }

  function handleChecklistAdd() {
    if (!work) return;
    const normalized = checklistInput.trim();
    if (!normalized) return;

    persistWork({
      ...work,
      checklist: [...work.checklist, normalized],
      updatedAt: getTodayKey(),
    });
    setChecklistInput("");
    setNotice("체크리스트 항목을 추가했어요.");
  }

  function handleChecklistMove(index: number, direction: -1 | 1) {
    if (!work) return;
    const nextIndex = index + direction;
    if (nextIndex < 0 || nextIndex >= work.checklist.length) return;
    const nextChecklist = [...work.checklist];
    const [moved] = nextChecklist.splice(index, 1);
    nextChecklist.splice(nextIndex, 0, moved);
    persistWork({ ...work, checklist: nextChecklist, updatedAt: getTodayKey() });
  }

  function handleChecklistDelete(index: number) {
    if (!work) return;
    const nextChecklist = work.checklist.filter((_, itemIndex) => itemIndex !== index);
    persistWork({ ...work, checklist: nextChecklist, updatedAt: getTodayKey() });
  }

  function handleLogPhotoChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result !== "string") return;
      setLogPhoto({ name: file.name, dataUrl: reader.result });
    };
    reader.readAsDataURL(file);
  }

  function handleCoverPhotoChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file || !work) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result !== "string") return;
      persistWork({
        ...work,
        coverPhotoDataUrl: reader.result,
        coverPhotoName: file.name,
        updatedAt: getTodayKey(),
      });
      setNotice("대표 사진을 업데이트했어요.");
    };
    reader.readAsDataURL(file);
  }

  function handleLogSave() {
    if (!work) return;
    const summary = logSummary.trim();
    const memo = logMemo.trim();
    const durationMinutes = Number.parseInt(logDuration, 10);

    if (!summary) {
      alert("로그 제목을 입력해 주세요.");
      return;
    }

    const nextLog: WorkLogEntry = {
      id: `log-${work.id}-${Date.now()}`,
      createdAt: getTodayKey(),
      summary,
      memo,
      durationMinutes: Number.isFinite(durationMinutes) ? durationMinutes : 0,
      status: effectiveProgress,
      photoDataUrl: logPhoto?.dataUrl ?? null,
      photoName: logPhoto?.name ?? null,
    };

    persistWork({
      ...work,
      workLogs: [nextLog, ...(work.workLogs ?? [])],
      lastQuickLogAt: nextLog.createdAt,
      lastQuickLogSummary: `${summary}${nextLog.durationMinutes > 0 ? ` · ${nextLog.durationMinutes}분` : ""}`,
      quickLogPhotoDataUrl: logPhoto?.dataUrl ?? work.quickLogPhotoDataUrl ?? undefined,
      quickLogPhotoName: logPhoto?.name ?? work.quickLogPhotoName ?? undefined,
      coverPhotoDataUrl: work.coverPhotoDataUrl ?? logPhoto?.dataUrl ?? null,
      coverPhotoName: work.coverPhotoName ?? logPhoto?.name ?? null,
      note: memo || work.note,
      updatedAt: getTodayKey(),
    });

    setLogSummary("오늘도 한 단 전진");
    setLogMemo("");
    setLogDuration("30");
    setLogPhoto(null);
    setNotice("작업 로그를 남겼어요.");
  }

  function handleSetCoverPhoto(photo: GalleryPhoto) {
    if (!work) return;
    persistWork({
      ...work,
      coverPhotoDataUrl: photo.src,
      coverPhotoName: photo.name,
      updatedAt: getTodayKey(),
    });
    setNotice("대표 사진으로 지정했어요.");
  }

  function handleRemovePhoto(photo: GalleryPhoto) {
    if (!work) return;

    const nextLogs =
      photo.source === "log" && photo.logId
        ? (work.workLogs ?? []).map((log) =>
            log.id === photo.logId
              ? { ...log, photoDataUrl: null, photoName: null }
              : log
          )
        : work.workLogs ?? [];

    persistWork({
      ...work,
      coverPhotoDataUrl: photo.source === "cover" ? null : work.coverPhotoDataUrl,
      coverPhotoName: photo.source === "cover" ? null : work.coverPhotoName,
      workLogs: nextLogs,
      updatedAt: getTodayKey(),
    });
    if (selectedPhoto?.id === photo.id) setSelectedPhoto(null);
    setNotice("사진을 정리했어요.");
  }

  if (!work) {
    return (
      <main className={styles.page}>
        <div className={styles.shell}>
          <Header />
          <section className={styles.heroPanel}>
            <div className={styles.heroCopy}>
              <div className={styles.heroTitleImage}>
                <Image src={heroHeaderImage} alt="Hero header" priority unoptimized className={styles.heroTitleImageAsset} />
              </div>
            </div>
          </section>
          <section className={styles.sectionCard}>
            <div className={styles.emptyState}>
              <p className={styles.emptyStateTitle}>작업을 찾을 수 없어요.</p>
              <p className={styles.emptyStateDescription}>요청한 작업기록 정보가 없거나 이미 삭제되었어요.</p>
              <div className={styles.buttonRow}>
                <Link href="/archive" className={styles.primaryAction}>
                  작업서랍으로 돌아가기
                </Link>
              </div>
            </div>
          </section>
        </div>
      </main>
    );
  }

  return (
    <main className={styles.page}>
      <div className={styles.shell}>
        <Header />
        <section className={styles.heroPanel}>
          <div className={styles.heroCopy}>
            <div className={styles.heroTitleImage}>
              <Image src={heroHeaderImage} alt="Hero header" priority unoptimized className={styles.heroTitleImageAsset} />
            </div>
          </div>
        </section>

        {notice ? <div className={styles.noticeToast}>{notice}</div> : null}

        <div className={styles.workspace}>
          <div className={styles.mainColumn}>
            <section className={styles.hero}>
              <div className={styles.heroTop}>
                <div>
                  <Link href="/archive" className={styles.backLink}>
                    작업서랍으로
                  </Link>
                  <div className={styles.heroMeta}>
                    <span className={`${styles.pill} ${styles.pillMuted}`}>{connectionTypeLabel}</span>
                    {work.sourcePatternTitle ? (
                      <span className={`${styles.pill} ${styles.pillMuted}`}>도안 연결</span>
                    ) : null}
                    <span className={[styles.pill, getProgressPillClasses(effectiveProgress)].join(" ")}>
                      {getStatusHistoryLabel(effectiveProgress)}
                    </span>
                  </div>
                  <h1 className={styles.heroTitle}>{work.title}</h1>
                  <p className={styles.heroDescription}>{work.detail}</p>
                </div>

                <div className={styles.actionRow}>
                  <button
                    type="button"
                    onClick={() => document.getElementById("work-log-panel")?.scrollIntoView({ behavior: "smooth", block: "start" })}
                    className={styles.secondaryAction}
                  >
                    작업 로그 남기기
                  </button>
                  <label className={styles.primaryAction}>
                    대표 사진 추가
                    <input type="file" accept="image/*" className="hidden" onChange={handleCoverPhotoChange} />
                  </label>
                </div>
              </div>

              <div className={styles.surfaceGrid}>
                <div className={styles.imageStage}>
                  <div className={styles.imageWrap}>
                    {work.coverPhotoDataUrl ? (
                      <button type="button" onClick={() => setSelectedPhoto(galleryPhotos[0] ?? null)} className="block h-full w-full">
                        <img src={work.coverPhotoDataUrl} alt={work.coverPhotoName ?? work.title} className="h-[340px] w-full object-cover" />
                      </button>
                    ) : (
                      <div className={styles.imageFallback}>
                        <strong>{work.title}</strong>
                      </div>
                    )}
                  </div>
                </div>

                <div className={styles.previewStack}>
                  <div className={styles.statCard}>
                    <span className={styles.statLabel}>현재 상태</span>
                    <strong className={styles.statValue}>{getStatusHistoryLabel(effectiveProgress)}</strong>
                  </div>
                  <div className={styles.statCard}>
                    <span className={styles.statLabel}>최근 기록</span>
                    <strong className={styles.statValue}>
                      {work.workLogs?.[0] ? getRelativeText(work.workLogs[0].createdAt) : "아직 없음"}
                    </strong>
                  </div>
                  <div className={styles.statCard}>
                    <span className={styles.statLabel}>체크리스트</span>
                    <strong className={styles.statValue}>{work.checklist.length}개</strong>
                  </div>
                  <div className={styles.statCard}>
                    <span className={styles.statLabel}>대표 재료</span>
                    <strong className={styles.statValue}>{work.yarn}</strong>
                  </div>
                </div>
              </div>
            </section>

            <section className={styles.sectionCard}>
              <div className={styles.tabBar}>
                {([
                  ["logs", "작업 로그"],
                  ["photos", "사진 관리"],
                  ["operations", "연결/상태"],
                  ["notes", "메모/정보"],
                ] as Array<[DetailTabKey, string]>).map(([tabKey, label]) => (
                  <button
                    key={tabKey}
                    type="button"
                    onClick={() => setActiveTab(tabKey)}
                    className={[styles.tabButton, activeTab === tabKey ? styles.tabButtonActive : ""].join(" ")}
                  >
                    {label}
                  </button>
                ))}
              </div>

              {activeTab === "logs" ? (
                <div id="work-log-panel" className={styles.tabPanel}>
                  <div className={styles.sectionHead}>
                    <h2 className={styles.sectionTitle}>작업 로그 타임라인</h2>
                    <p className={styles.sectionDescription}>기록, 사진, 작업 시간, 당시 상태를 한 번에 쌓아두는 영역이에요.</p>
                  </div>

                  <div className={styles.editorCard}>
                    <div className={styles.editorGrid}>
                      <div className="grid gap-4">
                        <div className={styles.field}>
                          <label className={styles.fieldLabel}>로그 제목</label>
                          <input value={logSummary} onChange={(event) => setLogSummary(event.target.value)} className={styles.input} />
                        </div>
                        <div className={styles.field}>
                          <label className={styles.fieldLabel}>메모</label>
                          <textarea rows={4} value={logMemo} onChange={(event) => setLogMemo(event.target.value)} className={styles.textarea} />
                        </div>
                      </div>
                      <div className={styles.editorActions}>
                        <div className={styles.field}>
                          <label className={styles.fieldLabel}>작업 시간(분)</label>
                          <input value={logDuration} onChange={(event) => setLogDuration(event.target.value.replace(/[^\d]/g, ""))} className={styles.input} />
                        </div>
                        <label className={styles.secondaryAction}>
                          {logPhoto ? `사진 변경: ${logPhoto.name}` : "사진 첨부"}
                          <input type="file" accept="image/*" className="hidden" onChange={handleLogPhotoChange} />
                        </label>
                        {logPhoto ? (
                          <button type="button" onClick={() => setLogPhoto(null)} className={styles.ghostButton}>
                            사진 제거
                          </button>
                        ) : null}
                        <button type="button" onClick={handleLogSave} className={styles.primaryAction}>
                          로그 저장
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className={styles.timelineList}>
                    {(work.workLogs ?? []).length > 0 ? (
                      (work.workLogs ?? []).map((log) => (
                        <article key={log.id} className={styles.timelineItem}>
                          <div className={styles.timelineDateCard}>
                            <span className="text-xs font-semibold text-slate-500">{getRelativeText(log.createdAt)}</span>
                            <span className="text-lg font-black text-slate-800">{log.durationMinutes > 0 ? `${log.durationMinutes}분` : "-"}</span>
                          </div>
                          <div className={styles.timelineBody}>
                            <div className={styles.timelineMeta}>
                              <strong className="text-lg font-black text-slate-900">{log.summary}</strong>
                              <span className={[styles.pill, getProgressPillClasses(log.status)].join(" ")}>
                                {getStatusHistoryLabel(log.status)}
                              </span>
                            </div>
                            <p className="text-sm leading-6 text-slate-600">{log.memo || "메모 없이 깔끔하게 기록했어요."}</p>
                            {log.photoDataUrl ? (
                              <button
                                type="button"
                                onClick={() =>
                                  setSelectedPhoto({
                                    id: `log-photo-${log.id}`,
                                    src: log.photoDataUrl ?? "",
                                    name: log.photoName ?? `${log.summary} 사진`,
                                    source: "log",
                                    logId: log.id,
                                  })
                                }
                                className="overflow-hidden rounded-2xl"
                              >
                                <img src={log.photoDataUrl} alt={log.photoName ?? log.summary} className="h-40 w-full object-cover md:w-56" />
                              </button>
                            ) : null}
                          </div>
                        </article>
                      ))
                    ) : (
                      <div className={styles.emptyState}>
                        <p className={styles.emptyStateTitle}>첫 작업 로그를 남겨보세요</p>
                        <p className={styles.emptyStateDescription}>첫 기록을 남기면 이 타임라인이 작업 흐름을 쌓아가기 시작해요.</p>
                      </div>
                    )}
                  </div>
                </div>
              ) : null}

              {activeTab === "photos" ? (
                <div className={styles.tabPanel}>
                  <div className={styles.sectionHead}>
                    <h2 className={styles.sectionTitle}>사진 관리</h2>
                    <p className={styles.sectionDescription}>대표 사진과 로그 사진을 함께 관리해요.</p>
                  </div>

                  <div className={styles.photoGrid}>
                    {galleryPhotos.length > 0 ? (
                      galleryPhotos.map((photo) => (
                        <article key={photo.id} className={styles.photoCard}>
                          <button type="button" onClick={() => setSelectedPhoto(photo)} className="block w-full">
                            <img src={photo.src} alt={photo.name} className={styles.photoThumb} />
                          </button>
                          <div className={styles.photoInfo}>
                            <div>
                              <strong className="block truncate text-sm font-bold text-slate-900">{photo.name}</strong>
                              <span className={`${styles.pill} ${styles.pillMuted} mt-2`}>
                                {photo.source === "cover" ? "대표 사진" : "로그 사진"}
                              </span>
                            </div>
                            <div className={styles.buttonRow}>
                              <button type="button" onClick={() => handleSetCoverPhoto(photo)} className={styles.secondaryAction}>
                                대표로 지정
                              </button>
                              <button type="button" onClick={() => handleRemovePhoto(photo)} className={styles.ghostButton}>
                                제거
                              </button>
                            </div>
                          </div>
                        </article>
                      ))
                    ) : (
                      <div className={styles.emptyState}>
                        <p className={styles.emptyStateTitle}>아직 저장된 사진이 없어요</p>
                        <p className={styles.emptyStateDescription}>대표 사진이나 로그 사진을 먼저 남겨보세요.</p>
                      </div>
                    )}
                  </div>
                </div>
              ) : null}

              {activeTab === "operations" ? (
                <div className={styles.tabPanel}>
                  <div className={styles.tabSplit}>
                    <section className={styles.innerCard}>
                      <div className={styles.sectionHead}>
                        <h2 className={styles.sectionTitle}>연결 정보</h2>
                      </div>
                      <div className={styles.metaList}>
                        <div className={styles.detailBlock}>
                          <div className={styles.metaRow}>
                            <span>연결 방식</span>
                            <span className={styles.metaValue}>{connectionTypeLabel}</span>
                          </div>
                        </div>
                        <div className={styles.detailBlock}>
                          <div className={styles.metaRow}>
                            <span>원본 도안</span>
                            <span className={styles.metaValue}>{work.sourcePatternTitle ?? "직접 시작한 작품"}</span>
                          </div>
                          {work.sourcePatternId ? (
                            <div className="mt-3">
                              <Link href={`/patterns/${work.sourcePatternId}`} className={styles.secondaryAction}>
                                원본 도안 보기
                              </Link>
                            </div>
                          ) : null}
                        </div>
                        <div className={styles.detailBlock}>
                          <div className={styles.metaRow}>
                            <span>연결 동행</span>
                            <span className={styles.metaValue}>{work.sourceCompanionTitle ?? "연결된 동행 없음"}</span>
                          </div>
                          {work.sourceCompanionRoomId ? (
                            <div className="mt-3">
                              <Link href={`/companion/${work.sourceCompanionRoomId}`} className={styles.secondaryAction}>
                                동행방으로 이동
                              </Link>
                            </div>
                          ) : null}
                        </div>
                      </div>
                    </section>

                    <section className={styles.innerCard}>
                      <div className={styles.sectionHead}>
                        <h2 className={styles.sectionTitle}>상태 히스토리</h2>
                      </div>
                      {canManuallyChangeStatus ? (
                        <div className={styles.chipRow}>
                          {(["진행 중", "중단", "완성"] as WorkProgress[]).map((status) => (
                            <button
                              key={status}
                              type="button"
                              onClick={() => handleStatusChange(status)}
                              className={[
                                styles.pill,
                                work.progress === status ? getProgressPillClasses(status) : styles.pillMuted,
                              ].join(" ")}
                            >
                              {status}
                            </button>
                          ))}
                        </div>
                      ) : (
                        <div className={styles.chipRow}>
                          <span className={`${styles.pill} ${styles.pillMuted}`}>동행 상태 자동 반영</span>
                        </div>
                      )}
                      <div className={styles.metaList}>
                        {(work.statusHistory ?? []).map((entry) => (
                          <div key={entry.id} className={styles.detailBlock}>
                            <div className={styles.metaRow}>
                              <span>{getStatusHistoryLabel(entry.status)}</span>
                              <span className={styles.metaValue}>{formatDate(entry.createdAt)}</span>
                            </div>
                            <p className="mt-3 text-sm leading-6 text-slate-600">{entry.note}</p>
                          </div>
                        ))}
                      </div>
                    </section>
                  </div>
                </div>
              ) : null}

              {activeTab === "notes" ? (
                <div className={styles.tabPanel}>
                  <div className={styles.tabSplit}>
                    <section className={styles.innerCard}>
                      <div className={styles.sectionHead}>
                        <h2 className={styles.sectionTitle}>체크리스트 편집</h2>
                      </div>
                      <div className={styles.buttonRow}>
                        <input value={checklistInput} onChange={(event) => setChecklistInput(event.target.value)} placeholder="새 체크리스트 추가" className={styles.input} />
                        <button type="button" onClick={handleChecklistAdd} className={styles.primaryAction}>
                          추가
                        </button>
                      </div>
                      <div className={styles.checkList}>
                        {work.checklist.map((item, index) => (
                          <div key={`${item}-${index}`} className={styles.checkItem}>
                            <p className="text-sm leading-6 text-slate-700">{item}</p>
                            <div className={`${styles.buttonRow} mt-3`}>
                              <button type="button" onClick={() => handleChecklistMove(index, -1)} className={styles.secondaryAction}>
                                위로
                              </button>
                              <button type="button" onClick={() => handleChecklistMove(index, 1)} className={styles.secondaryAction}>
                                아래로
                              </button>
                              <button type="button" onClick={() => handleChecklistDelete(index)} className={styles.ghostButton}>
                                삭제
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </section>

                    <section className={styles.innerCard}>
                      <div className={styles.sectionHead}>
                        <h2 className={styles.sectionTitle}>메모 확장</h2>
                      </div>
                      <div className={`${styles.buttonRow} mb-4`}>
                        <button type="button" onClick={handleMemoSave} className={styles.primaryAction}>
                          저장
                        </button>
                      </div>
                      <div className={styles.metaList}>
                        {([
                          ["todayNote", "오늘 한 일"],
                          ["blockers", "문제/막힌 점"],
                          ["nextPlan", "다음 할 일"],
                          ["materials", "재료/치수 메모"],
                          ["reflection", "회고/마무리 메모"],
                        ] as Array<[keyof WorkMemoSections, string]>).map(([key, label]) => (
                          <div key={key} className={styles.field}>
                            <label className={styles.fieldLabel}>{label}</label>
                            <textarea
                              rows={key === "reflection" ? 5 : 3}
                              value={memoSections[key]}
                              onChange={(event) => updateMemoSection(key, event.target.value)}
                              className={styles.textarea}
                            />
                          </div>
                        ))}
                      </div>
                    </section>

                    <section className={styles.innerCard}>
                      <div className={styles.sectionHead}>
                        <h2 className={styles.sectionTitle}>기본 정보</h2>
                      </div>
                      <div className={`${styles.buttonRow} mb-4`}>
                        <button
                          type="button"
                          onClick={() => {
                            if (editingBasic) {
                              setTitle(work.title);
                              setYarn(work.yarn);
                              setNeedle(work.needle);
                              setNote(work.note);
                              setDetail(work.detail);
                            }
                            setEditingBasic((current) => !current);
                          }}
                          className={styles.secondaryAction}
                        >
                          {editingBasic ? "취소" : "수정"}
                        </button>
                      </div>
                      {!editingBasic ? (
                        <div className={styles.metaList}>
                          <div className={styles.detailBlock}>
                            <div className={styles.metaRow}><span>상태</span><span className={styles.metaValue}>{getStatusHistoryLabel(effectiveProgress)}</span></div>
                          </div>
                          <div className={styles.detailBlock}>
                            <div className={styles.metaRow}><span>사용 실</span><span className={styles.metaValue}>{work.yarn}</span></div>
                          </div>
                          <div className={styles.detailBlock}>
                            <div className={styles.metaRow}><span>바늘</span><span className={styles.metaValue}>{work.needle}</span></div>
                          </div>
                          <div className={styles.detailBlock}>
                            <div className={styles.metaRow}><span>시작일</span><span className={styles.metaValue}>{formatDate(work.startedAt)}</span></div>
                          </div>
                          <div className={styles.detailBlock}>
                            <div className={styles.metaRow}><span>마지막 수정</span><span className={styles.metaValue}>{formatDate(work.updatedAt)}</span></div>
                          </div>
                        </div>
                      ) : (
                        <div className={styles.metaList}>
                          <div className={styles.field}>
                            <label className={styles.fieldLabel}>작품명</label>
                            <input value={title} onChange={(event) => setTitle(event.target.value)} className={styles.input} />
                          </div>
                          <div className={styles.field}>
                            <label className={styles.fieldLabel}>사용 실</label>
                            <input value={yarn} onChange={(event) => setYarn(event.target.value)} className={styles.input} />
                          </div>
                          <div className={styles.field}>
                            <label className={styles.fieldLabel}>바늘</label>
                            <input value={needle} onChange={(event) => setNeedle(event.target.value)} className={styles.input} />
                          </div>
                          <div className={styles.field}>
                            <label className={styles.fieldLabel}>한 줄 메모</label>
                            <textarea value={note} onChange={(event) => setNote(event.target.value)} rows={3} className={styles.textarea} />
                          </div>
                          <div className={styles.field}>
                            <label className={styles.fieldLabel}>상세 설명</label>
                            <textarea value={detail} onChange={(event) => setDetail(event.target.value)} rows={5} className={styles.textarea} />
                          </div>
                          <button type="button" onClick={handleBasicSave} className={styles.primaryAction}>
                            기본 정보 저장
                          </button>
                        </div>
                      )}
                    </section>
                  </div>
                </div>
              ) : null}
            </section>
          </div>

          <aside className={styles.sideColumn}>
            <section className={styles.sideCard}>
              <div className={styles.sectionHead}>
                <h2 className={styles.sectionTitle}>상세 인덱스</h2>
              </div>
              <div className={styles.metaList}>
                <div className={styles.detailBlock}>
                  <div className={styles.metaRow}>
                    <span>현재 탭</span>
                    <span className={styles.metaValue}>
                      {activeTab === "logs"
                        ? "작업 로그"
                        : activeTab === "photos"
                          ? "사진 관리"
                          : activeTab === "operations"
                            ? "연결/상태"
                            : "메모/정보"}
                    </span>
                  </div>
                </div>
                <div className={styles.detailBlock}>
                  <div className={styles.indexActions}>
                    {([
                      ["logs", "작업 로그"],
                      ["photos", "사진 관리"],
                      ["operations", "연결/상태"],
                      ["notes", "메모/정보"],
                    ] as Array<[DetailTabKey, string]>).map(([tabKey, label]) => (
                      <button
                        key={tabKey}
                        type="button"
                        onClick={() => setActiveTab(tabKey)}
                        className={[
                          styles.indexButton,
                          activeTab === tabKey ? styles.indexButtonActive : "",
                        ].join(" ")}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </section>

            <section className={styles.sideCard}>
              <div className={styles.sectionHead}>
                <h2 className={styles.sectionTitle}>한눈에 보기</h2>
              </div>
              <div className={styles.metaList}>
                  <div className={styles.detailBlock}>
                    <div className={styles.metaRow}><span>상태</span><span className={styles.metaValue}>{getStatusHistoryLabel(effectiveProgress)}</span></div>
                  </div>
                  <div className={styles.detailBlock}>
                    <div className={styles.metaRow}><span>최근 기록</span><span className={styles.metaValue}>{work.workLogs?.[0] ? getRelativeText(work.workLogs[0].createdAt) : "아직 없음"}</span></div>
                  </div>
                  <div className={styles.detailBlock}>
                    <div className={styles.metaRow}><span>사진</span><span className={styles.metaValue}>{galleryPhotos.length}장</span></div>
                  </div>
                  <div className={styles.detailBlock}>
                    <div className={styles.metaRow}><span>체크리스트</span><span className={styles.metaValue}>{work.checklist.length}개</span></div>
                  </div>
                </div>
            </section>
          </aside>
        </div>
      </div>

      {selectedPhoto ? (
        <button type="button" onClick={() => setSelectedPhoto(null)} className={styles.modalOverlay}>
          <div className={styles.modalDialog}>
            <div className={styles.modalImageFrame}>
              <img src={selectedPhoto.src} alt={selectedPhoto.name} className={styles.modalImage} />
            </div>
          </div>
        </button>
      ) : null}
    </main>
  );
}
