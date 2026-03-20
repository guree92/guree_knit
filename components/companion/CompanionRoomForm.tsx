"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChangeEvent, KeyboardEvent, useEffect, useMemo, useState } from "react";
import Header from "@/components/layout/Header";
import PatternDetailEditor from "@/components/patterns/PatternDetailEditor";
import patternStyles from "@/components/patterns/NewPatternForm.module.css";
import { patternCategories } from "@/data/patterns";
import {
  companionDraftStorageKey,
  companionLevels,
  companionPatternSourceTypes,
  type CompanionCustomPatternData,
  type CompanionLevel,
  type CompanionPatternSourceType,
} from "@/lib/companion";
import { type DetailRow, type NeedleType } from "@/lib/pattern-detail";
import type { PatternItem } from "@/lib/patterns";
import { createClient } from "@/lib/supabase/client";
import styles from "./CompanionRoomForm.module.css";

const maxTags = 5;
const needleTypeOptions = ["코바늘", "대바늘"] as const;
const levelOptions = ["초급", "중급", "고급"] as const;
const categoryOptions = patternCategories.slice(1) as Array<(typeof patternCategories)[number]>;
const copyrightSourceOptions = ["본인", "무료배포"] as const;
const copyrightRules = [
  { key: "hobbyOnly", label: "취미 제작" },
  { key: "colorVariation", label: "색상 변형" },
  { key: "sizeVariation", label: "사이즈 변형" },
  { key: "commercialUse", label: "상업적 사용" },
  { key: "redistribution", label: "도안 재배포" },
  { key: "modificationResale", label: "도안 수정 및 재판매" },
] as const;

type CopyrightChoice = "o" | "x";

type CopyrightSettings = {
  source: (typeof copyrightSourceOptions)[number];
  hobbyOnly: CopyrightChoice;
  colorVariation: CopyrightChoice;
  sizeVariation: CopyrightChoice;
  commercialUse: CopyrightChoice;
  redistribution: CopyrightChoice;
  modificationResale: CopyrightChoice;
};

type CompanionDraft = {
  title: string;
  patternSourceType: CompanionPatternSourceType;
  selectedPatternId: string;
  externalPatternName: string;
  externalPatternUrl: string;
  summary: string;
  startDate: string;
  endDate: string;
  recruitUntil: string;
  level: CompanionLevel;
  tags: string[];
  customPatternTitle: string;
  customPatternLevel: (typeof levelOptions)[number];
  customPatternCategory: (typeof categoryOptions)[number];
  customPatternDescription: string;
  customPatternTags: string[];
  customPatternYarn: string;
  customPatternNeedleType: (typeof needleTypeOptions)[number];
  customPatternNeedleSize: string;
  customPatternTotalYarnAmount: string;
  customPatternDuration: string;
  customPatternWidth: string;
  customPatternHeight: string;
  customPatternGaugeStitches: string;
  customPatternGaugeRows: string;
  customPatternCopyright: CopyrightSettings;
  customPatternDetailRows: DetailRow[];
  customPatternDetailContent: string;
};

const initialDraft: CompanionDraft = {
  title: "",
  patternSourceType: companionPatternSourceTypes[0],
  selectedPatternId: "",
  externalPatternName: "",
  externalPatternUrl: "",
  summary: "",
  startDate: "",
  endDate: "",
  recruitUntil: "",
  level: companionLevels[0],
  tags: [],
  customPatternTitle: "",
  customPatternLevel: levelOptions[0],
  customPatternCategory: categoryOptions[0],
  customPatternDescription: "",
  customPatternTags: [],
  customPatternYarn: "",
  customPatternNeedleType: needleTypeOptions[0],
  customPatternNeedleSize: "",
  customPatternTotalYarnAmount: "",
  customPatternDuration: "",
  customPatternWidth: "",
  customPatternHeight: "",
  customPatternGaugeStitches: "",
  customPatternGaugeRows: "",
  customPatternCopyright: {
    source: "본인",
    hobbyOnly: "o",
    colorVariation: "o",
    sizeVariation: "o",
    commercialUse: "x",
    redistribution: "x",
    modificationResale: "x",
  },
  customPatternDetailRows: [],
  customPatternDetailContent: "",
};

function normalizeTag(value: string) {
  return value.trim().replace(/^#+/, "").replace(/\s+/g, " ");
}

function createCompanionRoomId(title: string) {
  const base = title.trim().toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9_-]/g, "");
  return `${base || "companion-room"}-${Date.now()}`;
}

function buildNeedleValue(needleType: (typeof needleTypeOptions)[number], needleSize: string) {
  const trimmedSize = needleSize.trim();
  return trimmedSize ? `${needleType} ${trimmedSize}호` : needleType;
}

function formatFileSize(file: File) {
  const units = ["B", "KB", "MB", "GB"];
  let size = file.size;
  let unitIndex = 0;

  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex += 1;
  }

  return `${size.toFixed(unitIndex === 0 ? 0 : 1)} ${units[unitIndex]}`;
}

export default function CompanionRoomForm() {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const [availablePatterns, setAvailablePatterns] = useState<PatternItem[]>([]);
  const [patternSearchQuery, setPatternSearchQuery] = useState("");
  const [title, setTitle] = useState(initialDraft.title);
  const [patternSourceType, setPatternSourceType] = useState<CompanionPatternSourceType>(
    initialDraft.patternSourceType
  );
  const [selectedPatternId, setSelectedPatternId] = useState(initialDraft.selectedPatternId);
  const [externalPatternName, setExternalPatternName] = useState(initialDraft.externalPatternName);
  const [externalPatternUrl, setExternalPatternUrl] = useState(initialDraft.externalPatternUrl);
  const [summary, setSummary] = useState(initialDraft.summary);
  const [startDate, setStartDate] = useState(initialDraft.startDate);
  const [endDate, setEndDate] = useState(initialDraft.endDate);
  const [recruitUntil, setRecruitUntil] = useState(initialDraft.recruitUntil);
  const [level, setLevel] = useState<CompanionLevel>(initialDraft.level);
  const [tags, setTags] = useState<string[]>(initialDraft.tags);
  const [tagInput, setTagInput] = useState("");
  const [hostName, setHostName] = useState("내 닉네임");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [customPatternTitle, setCustomPatternTitle] = useState(initialDraft.customPatternTitle);
  const [customPatternLevel, setCustomPatternLevel] = useState(initialDraft.customPatternLevel);
  const [customPatternCategory, setCustomPatternCategory] = useState(initialDraft.customPatternCategory);
  const [customPatternDescription, setCustomPatternDescription] = useState(
    initialDraft.customPatternDescription
  );
  const [customPatternTags, setCustomPatternTags] = useState<string[]>(initialDraft.customPatternTags);
  const [customPatternTagInput, setCustomPatternTagInput] = useState("");
  const [customPatternYarn, setCustomPatternYarn] = useState(initialDraft.customPatternYarn);
  const [customPatternNeedleType, setCustomPatternNeedleType] = useState(
    initialDraft.customPatternNeedleType
  );
  const [customPatternNeedleSize, setCustomPatternNeedleSize] = useState(
    initialDraft.customPatternNeedleSize
  );
  const [customPatternTotalYarnAmount, setCustomPatternTotalYarnAmount] = useState(
    initialDraft.customPatternTotalYarnAmount
  );
  const [customPatternDuration, setCustomPatternDuration] = useState(initialDraft.customPatternDuration);
  const [customPatternWidth, setCustomPatternWidth] = useState(initialDraft.customPatternWidth);
  const [customPatternHeight, setCustomPatternHeight] = useState(initialDraft.customPatternHeight);
  const [customPatternGaugeStitches, setCustomPatternGaugeStitches] = useState(
    initialDraft.customPatternGaugeStitches
  );
  const [customPatternGaugeRows, setCustomPatternGaugeRows] = useState(
    initialDraft.customPatternGaugeRows
  );
  const [customPatternCopyright, setCustomPatternCopyright] = useState<CopyrightSettings>(
    initialDraft.customPatternCopyright
  );
  const [customPatternDetailRows, setCustomPatternDetailRows] = useState<DetailRow[]>(
    initialDraft.customPatternDetailRows
  );
  const [customPatternDetailContent, setCustomPatternDetailContent] = useState(
    initialDraft.customPatternDetailContent
  );
  const [customPatternImageFile, setCustomPatternImageFile] = useState<File | null>(null);
  const [customPatternImagePreviewUrl, setCustomPatternImagePreviewUrl] = useState("");
  const [customPatternImagePreviewFailed, setCustomPatternImagePreviewFailed] = useState(false);

  const selectedPattern = useMemo(
    () => availablePatterns.find((pattern) => pattern.id === selectedPatternId) ?? null,
    [availablePatterns, selectedPatternId]
  );
  const filteredPatterns = useMemo(() => {
    const query = patternSearchQuery.trim().toLowerCase();

    if (!query) return availablePatterns;

    return availablePatterns.filter((pattern) =>
      [pattern.title, pattern.category, pattern.level, ...(pattern.tags ?? [])]
        .join(" ")
        .toLowerCase()
        .includes(query)
    );
  }, [availablePatterns, patternSearchQuery]);
  const customNeedleText = useMemo(
    () => buildNeedleValue(customPatternNeedleType, customPatternNeedleSize),
    [customPatternNeedleSize, customPatternNeedleType]
  );
  const customSizeText = useMemo(() => {
    if (!customPatternWidth.trim() && !customPatternHeight.trim()) return "";
    return `가로 ${customPatternWidth.trim() || "0"}cm x 세로 ${customPatternHeight.trim() || "0"}cm`;
  }, [customPatternHeight, customPatternWidth]);
  const customGaugeText = useMemo(() => {
    if (!customPatternGaugeStitches.trim() && !customPatternGaugeRows.trim()) return "";
    return `${customPatternGaugeStitches.trim() || "0"}코 x ${customPatternGaugeRows.trim() || "0"}단`;
  }, [customPatternGaugeRows, customPatternGaugeStitches]);
  const customFinalSizeText = useMemo(
    () => [customSizeText, customGaugeText].filter(Boolean).join("\n"),
    [customGaugeText, customSizeText]
  );
  const currentPatternDisplayName = useMemo(() => {
    if (patternSourceType === "site") return selectedPattern?.title ?? "";
    if (patternSourceType === "custom") return customPatternTitle;
    return externalPatternName;
  }, [customPatternTitle, externalPatternName, patternSourceType, selectedPattern]);
  const isHeicImage = useMemo(() => {
    if (!customPatternImageFile) return false;

    const normalizedName = customPatternImageFile.name.toLowerCase();
    const normalizedType = customPatternImageFile.type.toLowerCase();

    return (
      normalizedName.endsWith(".heic") ||
      normalizedName.endsWith(".heif") ||
      normalizedType.includes("heic") ||
      normalizedType.includes("heif")
    );
  }, [customPatternImageFile]);
  const todayDateString = useMemo(() => {
    const now = new Date();
    const offset = now.getTimezoneOffset() * 60000;
    return new Date(now.getTime() - offset).toISOString().slice(0, 10);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const raw = window.localStorage.getItem(companionDraftStorageKey);
    if (!raw) return;

    try {
      const parsed = JSON.parse(raw) as CompanionDraft;
      setTitle(parsed.title ?? initialDraft.title);
      setPatternSourceType(parsed.patternSourceType ?? initialDraft.patternSourceType);
      setSelectedPatternId(parsed.selectedPatternId ?? initialDraft.selectedPatternId);
      setExternalPatternName(parsed.externalPatternName ?? initialDraft.externalPatternName);
      setExternalPatternUrl(parsed.externalPatternUrl ?? initialDraft.externalPatternUrl);
      setSummary(parsed.summary ?? initialDraft.summary);
      setStartDate(parsed.startDate ?? initialDraft.startDate);
      setEndDate(parsed.endDate ?? initialDraft.endDate);
      setRecruitUntil(parsed.recruitUntil ?? initialDraft.recruitUntil);
      setLevel(parsed.level ?? initialDraft.level);
      setTags(parsed.tags ?? initialDraft.tags);
      setCustomPatternTitle(parsed.customPatternTitle ?? initialDraft.customPatternTitle);
      setCustomPatternLevel(parsed.customPatternLevel ?? initialDraft.customPatternLevel);
      setCustomPatternCategory(parsed.customPatternCategory ?? initialDraft.customPatternCategory);
      setCustomPatternDescription(parsed.customPatternDescription ?? initialDraft.customPatternDescription);
      setCustomPatternTags(parsed.customPatternTags ?? initialDraft.customPatternTags);
      setCustomPatternYarn(parsed.customPatternYarn ?? initialDraft.customPatternYarn);
      setCustomPatternNeedleType(parsed.customPatternNeedleType ?? initialDraft.customPatternNeedleType);
      setCustomPatternNeedleSize(parsed.customPatternNeedleSize ?? initialDraft.customPatternNeedleSize);
      setCustomPatternTotalYarnAmount(
        parsed.customPatternTotalYarnAmount ?? initialDraft.customPatternTotalYarnAmount
      );
      setCustomPatternDuration(parsed.customPatternDuration ?? initialDraft.customPatternDuration);
      setCustomPatternWidth(parsed.customPatternWidth ?? initialDraft.customPatternWidth);
      setCustomPatternHeight(parsed.customPatternHeight ?? initialDraft.customPatternHeight);
      setCustomPatternGaugeStitches(
        parsed.customPatternGaugeStitches ?? initialDraft.customPatternGaugeStitches
      );
      setCustomPatternGaugeRows(parsed.customPatternGaugeRows ?? initialDraft.customPatternGaugeRows);
      setCustomPatternCopyright(parsed.customPatternCopyright ?? initialDraft.customPatternCopyright);
      setCustomPatternDetailRows(parsed.customPatternDetailRows ?? initialDraft.customPatternDetailRows);
      setCustomPatternDetailContent(
        parsed.customPatternDetailContent ?? initialDraft.customPatternDetailContent
      );
    } catch {
      // Ignore malformed draft.
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const nextDraft: CompanionDraft = {
      title,
      patternSourceType,
      selectedPatternId,
      externalPatternName,
      externalPatternUrl,
      summary,
      startDate,
      endDate,
      recruitUntil,
      level,
      tags,
      customPatternTitle,
      customPatternLevel,
      customPatternCategory,
      customPatternDescription,
      customPatternTags,
      customPatternYarn,
      customPatternNeedleType,
      customPatternNeedleSize,
      customPatternTotalYarnAmount,
      customPatternDuration,
      customPatternWidth,
      customPatternHeight,
      customPatternGaugeStitches,
      customPatternGaugeRows,
      customPatternCopyright,
      customPatternDetailRows,
      customPatternDetailContent,
    };

    window.localStorage.setItem(companionDraftStorageKey, JSON.stringify(nextDraft));
  }, [
    customPatternCategory,
    customPatternCopyright,
    customPatternDescription,
    customPatternDetailContent,
    customPatternDetailRows,
    customPatternDuration,
    customPatternGaugeRows,
    customPatternGaugeStitches,
    customPatternHeight,
    customPatternLevel,
    customPatternNeedleSize,
    customPatternNeedleType,
    customPatternTags,
    customPatternTitle,
    customPatternTotalYarnAmount,
    customPatternWidth,
    customPatternYarn,
    endDate,
    externalPatternName,
    externalPatternUrl,
    level,
    patternSourceType,
    recruitUntil,
    selectedPatternId,
    startDate,
    summary,
    tags,
    title,
  ]);

  useEffect(() => {
    async function loadUser() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      const nextHostName =
        (user?.user_metadata?.nickname as string | undefined) ??
        (user?.user_metadata?.name as string | undefined) ??
        user?.email?.split("@")[0] ??
        "내 닉네임";

      setHostName(nextHostName);
    }

    void loadUser();
  }, [supabase]);

  useEffect(() => {
    async function loadPatterns() {
      const { data, error } = await supabase
        .from("patterns")
        .select("*")
        .eq("is_hidden", false)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("도안 목록을 불러오지 못했어요.", error);
        return;
      }

      setAvailablePatterns(((data ?? []) as PatternItem[]) ?? []);
    }

    void loadPatterns();
  }, [supabase]);

  useEffect(() => {
    if (!customPatternImageFile) {
      setCustomPatternImagePreviewUrl("");
      setCustomPatternImagePreviewFailed(false);
      return;
    }

    const objectUrl = URL.createObjectURL(customPatternImageFile);
    setCustomPatternImagePreviewUrl(objectUrl);
    setCustomPatternImagePreviewFailed(false);

    return () => URL.revokeObjectURL(objectUrl);
  }, [customPatternImageFile]);

  function addTag() {
    const normalized = normalizeTag(tagInput);
    if (!normalized || tags.includes(normalized) || tags.length >= maxTags) return;

    setTags((current) => [...current, normalized]);
    setTagInput("");
  }

  function removeTag(tag: string) {
    setTags((current) => current.filter((item) => item !== tag));
  }

  function handleTagKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key !== "Enter" && event.key !== ",") return;
    event.preventDefault();
    addTag();
  }

  function addCustomPatternTag() {
    const normalized = normalizeTag(customPatternTagInput);
    if (
      !normalized ||
      customPatternTags.includes(normalized) ||
      customPatternTags.length >= maxTags
    ) {
      return;
    }

    setCustomPatternTags((current) => [...current, normalized]);
    setCustomPatternTagInput("");
  }

  function removeCustomPatternTag(tag: string) {
    setCustomPatternTags((current) => current.filter((item) => item !== tag));
  }

  function handleCustomPatternTagKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key !== "Enter") return;
    event.preventDefault();
    addCustomPatternTag();
  }

  function updateCopyrightSetting(
    key: keyof Omit<CopyrightSettings, "source">,
    value: CopyrightChoice
  ) {
    setCustomPatternCopyright((current) => ({ ...current, [key]: value }));
  }

  function handleCustomPatternImageChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0] ?? null;
    setCustomPatternImagePreviewFailed(false);
    setCustomPatternImageFile(file);
  }

  function removeCustomPatternImage() {
    setCustomPatternImageFile(null);
    setCustomPatternImagePreviewUrl("");
    setCustomPatternImagePreviewFailed(false);
  }

  async function handleSubmit() {
    if (!title.trim() || !summary.trim()) {
      alert("동행 제목과 소개글을 모두 입력해 주세요.");
      return;
    }

    if (!startDate || !endDate || !recruitUntil) {
      alert("모집 마감일과 시작일, 종료일을 입력해 주세요.");
      return;
    }

    if (recruitUntil > startDate) {
      alert("모집 마감일은 시작일보다 늦을 수 없어요.");
      return;
    }

    if (startDate > endDate) {
      alert("종료일은 시작일보다 빠를 수 없어요.");
      return;
    }

    if (patternSourceType === "site" && !selectedPatternId) {
      alert("연결할 사이트 도안을 선택해 주세요.");
      return;
    }

    if (patternSourceType === "custom" && !customPatternTitle.trim()) {
      alert("내 도안 제목을 입력해 주세요.");
      return;
    }

    if (patternSourceType === "external" && (!externalPatternName.trim() || !externalPatternUrl.trim())) {
      alert("외부 도안 제목과 링크를 모두 입력해 주세요.");
      return;
    }

    setIsSubmitting(true);

    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError) {
        throw new Error(userError.message);
      }

      if (!user) {
        alert("로그인 후 동행방을 만들 수 있어요.");
        router.push("/login?returnTo=%2Fcompanion%2Fnew");
        return;
      }

      const roomId = createCompanionRoomId(title);
      let patternName = "";
      let patternId: string | null = null;
      let patternExternalUrl: string | null = null;
      let customPatternData: CompanionCustomPatternData | null = null;

      if (patternSourceType === "site") {
        patternName = selectedPattern?.title ?? "";
        patternId = selectedPatternId;
      } else if (patternSourceType === "external") {
        patternName = externalPatternName.trim();
        patternExternalUrl = externalPatternUrl.trim();
      } else {
        let customImagePath: string | null = null;

        if (customPatternImageFile) {
          const ext = customPatternImageFile.name.split(".").pop()?.toLowerCase() || "jpg";
          const fileName = `${Date.now()}.${ext}`;
          customImagePath = `companion-patterns/${user.id}/${roomId}/${fileName}`;

          const { error: uploadError } = await supabase.storage
            .from("pattern-images")
            .upload(customImagePath, customPatternImageFile, {
              cacheControl: "3600",
              upsert: false,
            });

          if (uploadError) {
            throw new Error(uploadError.message);
          }
        }

        patternName = customPatternTitle.trim();
        customPatternData = {
          title: customPatternTitle.trim(),
          level: customPatternLevel,
          category: customPatternCategory,
          description: customPatternDescription.trim(),
          tags: customPatternTags,
          duration: customPatternDuration.trim() || null,
          totalYarnAmount: customPatternTotalYarnAmount.trim() || null,
          yarn: customPatternYarn.trim(),
          needle: customNeedleText,
          size: customFinalSizeText,
          detailContent: customPatternDetailContent.trim() || null,
          detailRows: customPatternDetailRows,
          copyrightSource: customPatternCopyright.source,
          copyrightHobbyOnly: customPatternCopyright.hobbyOnly === "o",
          copyrightColorVariation: customPatternCopyright.colorVariation === "o",
          copyrightSizeVariation: customPatternCopyright.sizeVariation === "o",
          copyrightCommercialUse: customPatternCopyright.commercialUse === "o",
          copyrightRedistribution: customPatternCopyright.redistribution === "o",
          copyrightModificationResale: customPatternCopyright.modificationResale === "o",
          imagePath: customImagePath,
        };
      }

      const defaultNotices = [
        {
          room_id: roomId,
          author_user_id: user.id,
          title: "동행 시작 안내",
          content: `${hostName}님이 연 동행방이에요. ${startDate}부터 함께 시작합니다.`,
          is_pinned: true,
        },
      ];
      const defaultSupplies = [
        { room_id: roomId, label: `${patternName} 도안 확인`, sort_order: 0 },
        { room_id: roomId, label: "사용 실 준비", sort_order: 1 },
        { room_id: roomId, label: "바늘 호수 확인", sort_order: 2 },
        { room_id: roomId, label: "체크인 일정 확인", sort_order: 3 },
      ];

      const { error: roomError } = await supabase.from("companion_rooms").insert({
        id: roomId,
        host_user_id: user.id,
        pattern_id: patternId,
        pattern_source_type: patternSourceType,
        pattern_external_url: patternExternalUrl,
        custom_pattern_data: customPatternData,
        title: title.trim(),
        pattern_name: patternName,
        summary: summary.trim(),
        start_date: startDate,
        end_date: endDate,
        recruit_until: recruitUntil,
        level,
        capacity: 9999,
        status: "모집중",
        tags,
      });

      if (roomError) {
        throw new Error(roomError.message);
      }

      const { error: participantError } = await supabase.from("companion_participants").insert({
        room_id: roomId,
        user_id: user.id,
        role: "host",
      });

      if (participantError) {
        throw new Error(participantError.message);
      }

      const { error: noticesError } = await supabase.from("companion_notices").insert(defaultNotices);

      if (noticesError) {
        throw new Error(noticesError.message);
      }

      const { error: suppliesError } = await supabase.from("companion_supplies").insert(defaultSupplies);

      if (suppliesError) {
        throw new Error(suppliesError.message);
      }

      if (typeof window !== "undefined") {
        window.localStorage.removeItem(companionDraftStorageKey);
      }

      router.push(`/companion/${roomId}`);
      router.refresh();
    } catch (error) {
      console.error("동행방 생성 실패", error);
      alert(error instanceof Error ? error.message : "동행방 생성에 실패했어요.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <>
      <Header />
      <main className={styles.page}>
        <div className={styles.shell}>
          <section className={styles.workspace}>
            <div className={styles.mainColumn}>
              <section className={`${styles.hero} ${styles.heroCompact}`}>
                <div className={styles.heroHeader}>
                  <div className={styles.heroBody}>
                    <span className={styles.eyebrow}>New Companion Room</span>
                    <h1 className={styles.heroTitle}>동행방 만들기</h1>
                  </div>

                  <div className={styles.heroActions}>
                    <Link href="/companion" className={styles.secondaryButton}>
                      취소
                    </Link>
                    <button
                      type="button"
                      className={styles.primaryButton}
                      onClick={handleSubmit}
                      disabled={isSubmitting}
                    >
                      {isSubmitting ? "등록 중..." : "동행방 등록"}
                    </button>
                  </div>
                </div>
              </section>

              <section className={`${styles.sectionCard} ${styles.sectionSpanFull} ${styles.introCard}`}>
                <div className={styles.basicsHeader}>
                  <div className={styles.sectionHead}>
                    <span className={styles.eyebrow}>Basics</span>
                    <h2 className={styles.sectionTitle}>기본 정보</h2>
                  </div>
                  <div className={styles.inlineModeHead}>
                    <h3 className={styles.sectionTitle}>도안 연결 방식</h3>
                  </div>
                </div>

                <div className={styles.companionIntroGrid}>
                  <div className={styles.companionIntroMain}>
                    <label className={`${styles.field} ${styles.fieldWide}`}>
                      <span className={styles.fieldLabel}>동행 제목</span>
                      <input
                        className={styles.input}
                        value={title}
                        onChange={(event) => setTitle(event.target.value)}
                        placeholder="예: 봄 가디건 같이 뜰 사람 구해요"
                      />
                    </label>

                    <label className={`${styles.field} ${styles.fieldWide}`}>
                      <span className={styles.fieldLabel}>동행 소개글</span>
                      <textarea
                        className={`${styles.textarea} ${styles.introTextarea}`}
                        value={summary}
                        onChange={(event) => setSummary(event.target.value)}
                        placeholder="무엇을 함께 뜨는지, 어떤 흐름으로 진행할지 적어주세요."
                      />
                    </label>
                  </div>

                  <div className={styles.companionIntroSide}>
                    <section className={styles.innerCard}>
                      <div className={styles.sourceTypeStack}>
                        <button
                          type="button"
                          className={
                            patternSourceType === "site" ? styles.sourceTypeButtonActive : styles.sourceTypeButton
                          }
                          onClick={() => setPatternSourceType("site")}
                        >
                          사이트 도안 선택
                        </button>
                        <button
                          type="button"
                          className={
                            patternSourceType === "custom" ? styles.sourceTypeButtonActive : styles.sourceTypeButton
                          }
                          onClick={() => setPatternSourceType("custom")}
                        >
                          내 도안 직접 입력
                        </button>
                        <button
                          type="button"
                          className={
                            patternSourceType === "external" ? styles.sourceTypeButtonActive : styles.sourceTypeButton
                          }
                          onClick={() => setPatternSourceType("external")}
                        >
                          외부 링크 연결
                        </button>
                      </div>
                    </section>
                  </div>
                </div>
              </section>

              {patternSourceType === "site" ? (
                <section className={`${styles.sectionCard} ${styles.metaCard}`}>
                  <div className={styles.sectionHead}>
                    <span className={styles.eyebrow}>Library</span>
                    <h2 className={styles.sectionTitle}>사이트 도안 선택</h2>
                    <p className={styles.sectionDescription}>
                      공개된 도안 중에서 바로 연결하면 동행 상세 탭에 전체 정보가 함께 보여져요.
                    </p>
                  </div>
                  <label className={styles.field}>
                    <span className={styles.fieldLabel}>도안 검색</span>
                    <input
                      className={styles.input}
                      value={patternSearchQuery}
                      onChange={(event) => setPatternSearchQuery(event.target.value)}
                      placeholder="제목, 난이도, 카테고리, 태그로 검색"
                    />
                  </label>
                  <label className={styles.field}>
                    <span className={styles.fieldLabel}>연결 도안</span>
                    <select
                      className={styles.select}
                      value={selectedPatternId}
                      onChange={(event) => setSelectedPatternId(event.target.value)}
                    >
                      <option value="">도안을 선택해 주세요</option>
                      {filteredPatterns.map((pattern) => (
                        <option key={pattern.id} value={pattern.id}>
                          {pattern.title} · {pattern.level} · {pattern.category}
                        </option>
                      ))}
                    </select>
                  </label>
                  <p className={styles.helperText}>
                    {filteredPatterns.length}개의 도안이 검색되었어요.
                  </p>
                </section>
              ) : null}

              {patternSourceType === "external" ? (
                <section className={`${styles.sectionCard} ${styles.metaCard}`}>
                  <div className={styles.sectionHead}>
                    <span className={styles.eyebrow}>External</span>
                    <h2 className={styles.sectionTitle}>외부 도안 연결</h2>
                    <p className={styles.sectionDescription}>
                      블로그, PDF, 영상 등 외부에 있는 도안도 제목과 링크만으로 연결할 수 있어요.
                    </p>
                  </div>
                  <div className={styles.fieldGrid}>
                    <label className={styles.field}>
                      <span className={styles.fieldLabel}>도안 제목</span>
                      <input
                        className={styles.input}
                        value={externalPatternName}
                        onChange={(event) => setExternalPatternName(event.target.value)}
                        placeholder="예: My Private Sweater Pattern"
                      />
                    </label>
                    <label className={styles.field}>
                      <span className={styles.fieldLabel}>도안 링크</span>
                      <input
                        className={styles.input}
                        value={externalPatternUrl}
                        onChange={(event) => setExternalPatternUrl(event.target.value)}
                        placeholder="https://..."
                      />
                    </label>
                  </div>
                </section>
              ) : null}

              {patternSourceType === "custom" ? (
                <>
                  <section className={`${patternStyles.sectionCard} ${patternStyles.introCard}`}>
                    <div className={patternStyles.sectionHeader}>
                      <span className={patternStyles.eyebrow}>Story</span>
                      <h2 className={patternStyles.sectionTitle}>도안 소개</h2>
                    </div>

                    <div className={patternStyles.compactIntroGrid}>
                      <div className={patternStyles.introMain}>
                        <div className={`${patternStyles.field} ${patternStyles.fieldWide}`}>
                          <label className={patternStyles.fieldLabel}>도안 제목</label>
                          <input
                            className={patternStyles.input}
                            value={customPatternTitle}
                            onChange={(event) => setCustomPatternTitle(event.target.value)}
                            placeholder="예: 봄 네트백 도안"
                          />
                        </div>

                        <div className={patternStyles.inlineFields}>
                          <div className={patternStyles.field}>
                            <span className={patternStyles.fieldLabel}>난이도</span>
                            <div className={patternStyles.optionGrid}>
                              {levelOptions.map((item) => (
                                <button
                                  key={item}
                                  type="button"
                                  className={
                                    item === customPatternLevel
                                      ? patternStyles.optionButtonActive
                                      : patternStyles.optionButton
                                  }
                                  onClick={() => setCustomPatternLevel(item)}
                                >
                                  {item}
                                </button>
                              ))}
                            </div>
                          </div>

                          <div className={patternStyles.field}>
                            <label className={patternStyles.fieldLabel}>카테고리</label>
                            <select
                              className={patternStyles.select}
                              value={customPatternCategory}
                              onChange={(event) =>
                                setCustomPatternCategory(
                                  event.target.value as (typeof categoryOptions)[number]
                                )
                              }
                            >
                              {categoryOptions.map((item) => (
                                <option key={item} value={item}>
                                  {item}
                                </option>
                              ))}
                            </select>
                          </div>
                        </div>

                        <div className={`${patternStyles.field} ${patternStyles.fieldWide}`}>
                          <label className={patternStyles.fieldLabel}>도안 설명</label>
                          <textarea
                            className={patternStyles.textarea}
                            value={customPatternDescription}
                            onChange={(event) => setCustomPatternDescription(event.target.value)}
                            placeholder="작품 분위기, 추천 포인트, 준비 포인트를 간단히 적어 주세요."
                          />
                        </div>
                      </div>

                      <div className={patternStyles.introSide}>
                        <div className={patternStyles.field}>
                          <span className={patternStyles.fieldLabel}>태그</span>
                          <div className={patternStyles.tagComposer}>
                            <input
                              className={patternStyles.input}
                              value={customPatternTagInput}
                              onChange={(event) => setCustomPatternTagInput(event.target.value)}
                              onKeyDown={handleCustomPatternTagKeyDown}
                              placeholder="예: 사계절, 데일리"
                            />
                            <button
                              type="button"
                              className={patternStyles.tagAddButton}
                              onClick={addCustomPatternTag}
                              disabled={customPatternTags.length >= maxTags}
                            >
                              추가
                            </button>
                          </div>
                          <div className={patternStyles.tagList}>
                            {customPatternTags.map((tag) => (
                              <button
                                key={tag}
                                type="button"
                                className={patternStyles.tagChip}
                                onClick={() => removeCustomPatternTag(tag)}
                              >
                                #{tag}
                              </button>
                            ))}
                          </div>
                          <p className={patternStyles.helperText}>최대 5개</p>
                        </div>

                        <div className={patternStyles.miniStats}>
                          <div className={patternStyles.metricCard}>
                            <span className={patternStyles.metricCardLabel}>완성 크기</span>
                            <div className={patternStyles.miniMetricGrid}>
                              <label className={patternStyles.metricMiniField}>
                                <span>가로</span>
                                <div className={patternStyles.metricInputWrap}>
                                  <input
                                    className={patternStyles.metricInput}
                                    value={customPatternWidth}
                                    onChange={(event) => setCustomPatternWidth(event.target.value)}
                                    placeholder="0"
                                  />
                                  <span className={patternStyles.metricUnit}>cm</span>
                                </div>
                              </label>
                              <label className={patternStyles.metricMiniField}>
                                <span>세로</span>
                                <div className={patternStyles.metricInputWrap}>
                                  <input
                                    className={patternStyles.metricInput}
                                    value={customPatternHeight}
                                    onChange={(event) => setCustomPatternHeight(event.target.value)}
                                    placeholder="0"
                                  />
                                  <span className={patternStyles.metricUnit}>cm</span>
                                </div>
                              </label>
                            </div>
                          </div>

                          <div className={patternStyles.metricCard}>
                            <span className={patternStyles.metricCardLabel}>게이지</span>
                            <div className={patternStyles.miniMetricGrid}>
                              <label className={patternStyles.metricMiniField}>
                                <span>코 수</span>
                                <div className={patternStyles.metricInputWrap}>
                                  <input
                                    className={patternStyles.metricInput}
                                    value={customPatternGaugeStitches}
                                    onChange={(event) =>
                                      setCustomPatternGaugeStitches(event.target.value)
                                    }
                                    placeholder="0"
                                  />
                                  <span className={patternStyles.metricUnit}>코</span>
                                </div>
                              </label>
                              <label className={patternStyles.metricMiniField}>
                                <span>단 수</span>
                                <div className={patternStyles.metricInputWrap}>
                                  <input
                                    className={patternStyles.metricInput}
                                    value={customPatternGaugeRows}
                                    onChange={(event) => setCustomPatternGaugeRows(event.target.value)}
                                    placeholder="0"
                                  />
                                  <span className={patternStyles.metricUnit}>단</span>
                                </div>
                              </label>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </section>

                  <section className={`${patternStyles.sectionCard} ${patternStyles.prepCard}`}>
                    <div className={patternStyles.sectionHeader}>
                      <span className={patternStyles.eyebrow}>Material</span>
                      <h2 className={patternStyles.sectionTitle}>제작 준비</h2>
                    </div>

                    <div className={patternStyles.prepGrid}>
                      <div className={patternStyles.field}>
                        <label className={patternStyles.fieldLabel}>사용 실</label>
                        <input
                          className={patternStyles.input}
                          value={customPatternYarn}
                          onChange={(event) => setCustomPatternYarn(event.target.value)}
                          placeholder="예: 코튼사 2합"
                        />
                      </div>

                      <div className={patternStyles.field}>
                        <span className={patternStyles.fieldLabel}>바늘 종류</span>
                        <div className={`${patternStyles.optionGrid} ${patternStyles.optionGridNoWrap}`}>
                          {needleTypeOptions.map((item) => (
                            <button
                              key={item}
                              type="button"
                              className={
                                item === customPatternNeedleType
                                  ? patternStyles.optionButtonActive
                                  : patternStyles.optionButton
                              }
                              onClick={() => setCustomPatternNeedleType(item)}
                            >
                              {item}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className={patternStyles.field}>
                        <label className={patternStyles.fieldLabel}>호수</label>
                        <input
                          className={patternStyles.input}
                          value={customPatternNeedleSize}
                          onChange={(event) => setCustomPatternNeedleSize(event.target.value)}
                          placeholder="예: 5"
                        />
                      </div>

                      <div className={patternStyles.field}>
                        <label className={patternStyles.fieldLabel}>사용 실 총량</label>
                        <input
                          className={patternStyles.input}
                          value={customPatternTotalYarnAmount}
                          onChange={(event) => setCustomPatternTotalYarnAmount(event.target.value)}
                          placeholder="예: 220g / 4볼"
                        />
                      </div>

                      <div className={patternStyles.field}>
                        <label className={patternStyles.fieldLabel}>소요시간</label>
                        <input
                          className={patternStyles.input}
                          value={customPatternDuration}
                          onChange={(event) => setCustomPatternDuration(event.target.value)}
                          placeholder="예: 3일, 8시간"
                        />
                      </div>
                    </div>
                  </section>

                  <section className={`${patternStyles.sectionCard} ${patternStyles.policyCard}`}>
                    <div className={patternStyles.sectionHeader}>
                      <span className={patternStyles.eyebrow}>Policy</span>
                      <h2 className={patternStyles.sectionTitle}>이용 범위</h2>
                    </div>

                    <div className={patternStyles.policyGrid}>
                      <div className={patternStyles.policySourceRow}>
                        <span className={patternStyles.fieldLabel}>원작자</span>
                        <div className={patternStyles.optionGrid}>
                          {copyrightSourceOptions.map((item) => (
                            <button
                              key={item}
                              type="button"
                              className={
                                item === customPatternCopyright.source
                                  ? patternStyles.optionButtonActive
                                  : patternStyles.optionButton
                              }
                              onClick={() =>
                                setCustomPatternCopyright((current) => ({
                                  ...current,
                                  source: item,
                                }))
                              }
                            >
                              {item}
                            </button>
                          ))}
                        </div>
                      </div>

                      {copyrightRules.map((rule) => (
                        <div key={rule.key} className={patternStyles.policyRow}>
                          <span className={patternStyles.fieldLabel}>{rule.label}</span>
                          <div className={patternStyles.optionGrid}>
                            <button
                              type="button"
                              className={
                                customPatternCopyright[rule.key] === "o"
                                  ? patternStyles.optionButtonActive
                                  : patternStyles.optionButton
                              }
                              onClick={() => updateCopyrightSetting(rule.key, "o")}
                            >
                              O
                            </button>
                            <button
                              type="button"
                              className={
                                customPatternCopyright[rule.key] === "x"
                                  ? patternStyles.optionButtonActive
                                  : patternStyles.optionButton
                              }
                              onClick={() => updateCopyrightSetting(rule.key, "x")}
                            >
                              X
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </section>

                  <section className={`${patternStyles.sectionCard} ${patternStyles.sectionSpanFull}`}>
                    <div className={patternStyles.sectionHeader}>
                      <span className={patternStyles.eyebrow}>Media</span>
                      <h2 className={patternStyles.sectionTitle}>이미지와 세부 내용</h2>
                    </div>

                    <div className={patternStyles.mediaCompactGrid}>
                      <div className={patternStyles.uploadCard}>
                        <div className={patternStyles.uploadPreview}>
                          {customPatternImagePreviewUrl && !customPatternImagePreviewFailed ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={customPatternImagePreviewUrl}
                              alt="업로드한 도안 이미지 미리보기"
                              className={patternStyles.uploadPreviewImage}
                              onError={() => setCustomPatternImagePreviewFailed(true)}
                            />
                          ) : (
                            <div className={patternStyles.uploadPreviewEmpty}>
                              <div>
                                {customPatternImageFile && customPatternImagePreviewFailed
                                  ? isHeicImage
                                    ? "HEIC 미리보기를 이 환경에서 바로 보여주지 못하고 있어요."
                                    : "이미지 미리보기를 불러오지 못했어요."
                                  : "대표 이미지를 등록하면 카드 인상이 또렷해져요."}
                                <p>
                                  {customPatternImageFile && customPatternImagePreviewFailed
                                    ? isHeicImage
                                      ? "JPG, PNG, WEBP 형식으로 올리면 바로 미리보기가 보여요."
                                      : "다른 이미지 파일로 다시 시도해 주세요."
                                    : "정사각형 비율을 추천해요."}
                                </p>
                              </div>
                            </div>
                          )}
                        </div>

                        <div className={patternStyles.uploadActions}>
                          <label htmlFor="companion-pattern-image" className={patternStyles.uploadButton}>
                            이미지 선택
                          </label>
                          <input
                            id="companion-pattern-image"
                            type="file"
                            accept="image/*"
                            hidden
                            onChange={handleCustomPatternImageChange}
                          />

                          {customPatternImageFile ? (
                            <>
                              <div className={patternStyles.imageMeta}>
                                <p className={patternStyles.imageName}>{customPatternImageFile.name}</p>
                                <p className={patternStyles.imageSize}>{formatFileSize(customPatternImageFile)}</p>
                              </div>
                              <button
                                type="button"
                                className={patternStyles.imageRemoveButton}
                                onClick={removeCustomPatternImage}
                              >
                                제거
                              </button>
                            </>
                          ) : null}
                        </div>
                      </div>

                      <div className={patternStyles.tipsColumn}>
                        <PatternDetailEditor
                          needleType={customPatternNeedleType as NeedleType}
                          rows={customPatternDetailRows}
                          onChange={setCustomPatternDetailRows}
                          textValue={customPatternDetailContent}
                          onTextValueChange={setCustomPatternDetailContent}
                        />
                      </div>
                    </div>
                  </section>
                </>
              ) : null}

              <section className={`${styles.sectionCard} ${styles.scheduleCard}`}>
                <div className={styles.sectionHead}>
                  <span className={styles.eyebrow}>Schedule</span>
                  <h2 className={styles.sectionTitle}>일정과 모집</h2>
                </div>

                <div className={styles.fieldGridThree}>
                  <label className={styles.field}>
                    <span className={styles.fieldLabel}>모집 마감일</span>
                    <input
                      type="date"
                      className={styles.input}
                      value={recruitUntil}
                      min={todayDateString}
                      max={startDate || undefined}
                      onChange={(event) => setRecruitUntil(event.target.value)}
                    />
                  </label>

                  <label className={styles.field}>
                    <span className={styles.fieldLabel}>시작일</span>
                    <input
                      type="date"
                      className={styles.input}
                      value={startDate}
                      min={todayDateString}
                      max={endDate || undefined}
                      onChange={(event) => setStartDate(event.target.value)}
                    />
                  </label>

                  <label className={styles.field}>
                    <span className={styles.fieldLabel}>종료일</span>
                    <input
                      type="date"
                      className={styles.input}
                      value={endDate}
                      min={startDate || todayDateString}
                      onChange={(event) => setEndDate(event.target.value)}
                    />
                  </label>
                </div>

                <div className={styles.fieldGridThree}>
                  <label className={styles.field}>
                    <span className={styles.fieldLabel}>난이도</span>
                    <select
                      className={styles.select}
                      value={level}
                      onChange={(event) => setLevel(event.target.value as CompanionLevel)}
                    >
                      {companionLevels.map((item) => (
                        <option key={item} value={item}>
                          {item}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
              </section>

              <section className={`${styles.sectionCard} ${styles.tagsCard}`}>
                <div className={styles.sectionHead}>
                  <span className={styles.eyebrow}>Tags</span>
                  <h2 className={styles.sectionTitle}>동행 태그</h2>
                  <p className={styles.sectionDescription}>최대 5개까지 넣을 수 있어요.</p>
                </div>

                <div className={styles.tagComposer}>
                  <input
                    className={styles.input}
                    value={tagInput}
                    onChange={(event) => setTagInput(event.target.value)}
                    onKeyDown={handleTagKeyDown}
                    placeholder="예: 대바늘, 웨어, 주간체크인"
                  />
                  <button type="button" className={styles.tagButton} onClick={addTag}>
                    태그 추가
                  </button>
                </div>

                <div className={styles.tagList}>
                  {tags.length === 0 ? (
                    <span className={styles.emptyText}>아직 추가한 태그가 없어요.</span>
                  ) : (
                    tags.map((tag) => (
                      <button
                        key={tag}
                        type="button"
                        className={styles.tagChip}
                        onClick={() => removeTag(tag)}
                      >
                        #{tag} 닫기
                      </button>
                    ))
                  )}
                </div>
              </section>
            </div>

            <aside className={styles.sideColumn}>
              <section className={styles.sideCard}>
                <span className={styles.eyebrow}>Preview</span>
                <h2 className={styles.sideTitle}>{title.trim() || "동행 제목 미리보기"}</h2>
                <div className={styles.previewMeta}>
                  <span>{currentPatternDisplayName.trim() || "연결 도안 미선택"}</span>
                  <span>{hostName}</span>
                </div>
                <div className={styles.previewInfoGrid}>
                  <div className={styles.previewInfoBox}>
                    <span>모집</span>
                    <strong>{recruitUntil || "-"}</strong>
                  </div>
                  <div className={styles.previewInfoBox}>
                    <span>일정</span>
                    <strong>{startDate && endDate ? `${startDate} ~ ${endDate}` : "-"}</strong>
                  </div>
                  <div className={styles.previewInfoBox}>
                    <span>난이도</span>
                    <strong>{level}</strong>
                  </div>
                  <div className={styles.previewInfoBox}>
                    <span>도안 방식</span>
                    <strong>
                      {patternSourceType === "site"
                        ? "사이트 도안"
                        : patternSourceType === "custom"
                          ? "내 도안"
                          : "외부 링크"}
                    </strong>
                  </div>
                </div>
              </section>
            </aside>
          </section>
        </div>
      </main>
    </>
  );
}
