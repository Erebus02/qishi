"use client";

import {
  BookOpen,
  Calendar,
  Camera,
  Download,
  Fish,
  ImagePlus,
  Loader2,
  MapPin,
  Pencil,
  Plus,
  Scale,
  Share2,
  Sparkles,
  Star,
  Trash2,
  X,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import {
  PosterEditorModal,
  PosterOfferAfterSaveDialog,
} from "@/components/poster/poster-editor-modal";
import { nextRouteApi } from "@/lib/api-base";
import type { FishingSpot } from "@/lib/geo/fishing-spots";
import { fetchSpotsPayloadClient } from "@/lib/geo/spots-api";
import { reverseGeocodeLabel } from "@/lib/geo/reverse-geocode";
import {
  geolocationBlockedReason,
  hintForGeolocationError,
} from "@/lib/geo/secure-geolocation";
import {
  WATER_SPOT_CATEGORIES,
  isWaterSpotCategory,
} from "@/lib/geo/water-spot-category";
import {
  type CatchEntry,
  type FishingRecord,
  aggregateStats,
  formatCatchSpeciesDisplay,
  loadFishingRecords,
  newRecordId,
  saveFishingRecords,
} from "@/lib/records/fishing-record-storage";
import { blobsToJpegDataUrls } from "@/lib/poster/thumbnail-data-url";
import {
  downloadDataUrl,
  renderImageWithBottomSpeciesLabel,
  shrinkImageBlob,
} from "@/lib/records/photo-fish-label";
import {
  resolveLinkedSpotFeeNote,
  resolveLinkedSpotName,
} from "@/lib/spots/resolve-linked-spot";
import {
  USER_SPOT_DAILY_LIMIT,
  addUserMarkedSpot,
  canAddUserMarkedSpotToday,
  loadUserMarkedSpots,
  remainingUserSpotQuotaToday,
  type UserMarkedSpot,
} from "@/lib/spots/user-marked-spots";
import { loginFocusRing } from "@/lib/login-styles";
import { cn } from "@/lib/utils";

type PhotoCatchRow = {
  id: string;
  sourceBlob: Blob;
  previewUrl: string;
  species: string;
  quantity: number;
  weightKg: number;
  identifying: boolean;
  identifyError: string | null;
};

function newPhotoRowId(): string {
  return `ph-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

const SPECIES_QUICK = [
  "鲫鱼",
  "鲤鱼",
  "草鱼",
  "青鱼",
  "鲢鱼",
  "鳙鱼",
  "鲈鱼",
  "黑鱼",
  "翘嘴",
  "罗非鱼",
  "白条",
  "其它",
] as const;

function emptyCatch(): CatchEntry {
  return { species: "", quantity: 1, weightKg: 0 };
}

function formatDateTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString("zh-CN", {
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** 左滑露出的操作区总宽度（删除 + 分享） */
const SWIPE_ACTION_W = 144;

function buildRecordSharePayload(
  r: FishingRecord,
  qtySum: number,
  kgSum: number,
  userSpots: UserMarkedSpot[] = [],
  platformSpotNames?: Record<string, string>
): { title: string; text: string; url: string } {
  const lines = r.catches
    .map(
      (c) =>
        `${formatCatchSpeciesDisplay(c)} ${c.quantity} 尾 ${c.weightKg.toFixed(2)} kg`
    )
    .join("\n");
  const url =
    typeof window !== "undefined"
      ? `${window.location.origin}/records`
      : "/records";
  const title = `作钓记录 · ${r.location}`;
  const notePart = r.notes.trim() ? `\n心得：${r.notes.trim()}` : "";
  let spotPart = "";
  if (r.linkedSpotId) {
    const nm = resolveLinkedSpotName(
      r.linkedSpotId,
      userSpots,
      platformSpotNames
    );
    const fee = resolveLinkedSpotFeeNote(r.linkedSpotId);
    const feeLine = fee ? `\n收费：${fee}` : "";
    spotPart = r.spotRatingStars
      ? `\n关联钓点：${nm}${feeLine}\n本次评分：${r.spotRatingStars} / 5 星`
      : `\n关联钓点：${nm}${feeLine}`;
  }
  const text = `${title}\n时间：${formatDateTime(r.createdAt)}\n${lines}\n小计：${qtySum} 尾 · ${kgSum.toFixed(2)} kg${spotPart}${notePart}`;
  return { title, text, url };
}

export function RecordsView() {
  const [records, setRecords] = useState<FishingRecord[]>([]);
  const [hydrated, setHydrated] = useState(false);

  const [createOpen, setCreateOpen] = useState(false);
  const [formLocation, setFormLocation] = useState("");
  const [formWaterCategory, setFormWaterCategory] = useState<string>("");
  const [formCatches, setFormCatches] = useState<CatchEntry[]>([emptyCatch()]);
  const [formNotes, setFormNotes] = useState("");
  const [formLinkedSpotId, setFormLinkedSpotId] = useState("");
  const [formSpotStars, setFormSpotStars] = useState(5);
  const [formCreateNewSpot, setFormCreateNewSpot] = useState(false);
  const [newSpotName, setNewSpotName] = useState("");
  const [newSpotLat, setNewSpotLat] = useState(30.544);
  const [newSpotLng, setNewSpotLng] = useState(114.429);
  const [newSpotFee, setNewSpotFee] = useState("");
  const [newSpotLocating, setNewSpotLocating] = useState(false);
  const [platformSpots, setPlatformSpots] = useState<FishingSpot[]>([]);

  useEffect(() => {
    void fetchSpotsPayloadClient({ limit: 200 }).then((p) =>
      setPlatformSpots(p.spots)
    );
  }, []);

  const platformSpotNames = useMemo(
    () => Object.fromEntries(platformSpots.map((s) => [s.id, s.name])),
    [platformSpots]
  );

  const [userSpotsForPicker, setUserSpotsForPicker] = useState<UserMarkedSpot[]>(
    []
  );
  const [formError, setFormError] = useState<string | null>(null);
  const [formPhotoRows, setFormPhotoRows] = useState<PhotoCatchRow[]>([]);
  const [locatingPlace, setLocatingPlace] = useState(false);
  const [locateHint, setLocateHint] = useState<string | null>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);

  const [notesEditId, setNotesEditId] = useState<string | null>(null);
  const [notesDraft, setNotesDraft] = useState("");

  const [swipeShiftById, setSwipeShiftById] = useState<Record<string, number>>(
    {}
  );
  const swipeGestureRef = useRef<{
    rowId: string | null;
    startX: number;
    startShift: number;
    lastShift: number;
    pointerId: number | null;
  }>({ rowId: null, startX: 0, startShift: 0, lastShift: 0, pointerId: null });

  const [sharingRecord, setSharingRecord] = useState<FishingRecord | null>(
    null
  );
  const [shareToast, setShareToast] = useState<string | null>(null);
  const [posterOfferRecord, setPosterOfferRecord] =
    useState<FishingRecord | null>(null);
  const [posterEditorRecord, setPosterEditorRecord] =
    useState<FishingRecord | null>(null);

  useEffect(() => {
    setRecords(loadFishingRecords());
    setUserSpotsForPicker(loadUserMarkedSpots());
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (createOpen) {
      setUserSpotsForPicker(loadUserMarkedSpots());
    }
  }, [createOpen]);

  useEffect(() => {
    if (!shareToast) return;
    const t = window.setTimeout(() => setShareToast(null), 3200);
    return () => window.clearTimeout(t);
  }, [shareToast]);

  const persist = useCallback((next: FishingRecord[]) => {
    setRecords(next);
    saveFishingRecords(next);
  }, []);

  const stats = useMemo(() => aggregateStats(records), [records]);

  const clearPhotoRows = useCallback(() => {
    setFormPhotoRows((prev) => {
      for (const r of prev) {
        URL.revokeObjectURL(r.previewUrl);
      }
      return [];
    });
  }, []);

  const openCreate = useCallback(() => {
    clearPhotoRows();
    setSwipeShiftById({});
    setFormLocation("");
    setFormWaterCategory("");
    setFormLinkedSpotId("");
    setFormSpotStars(5);
    setFormCreateNewSpot(false);
    setNewSpotName("");
    setNewSpotLat(30.544);
    setNewSpotLng(114.429);
    setNewSpotFee("");
    setFormCatches([emptyCatch()]);
    setFormNotes("");
    setFormError(null);
    setLocateHint(null);
    setCreateOpen(true);
  }, [clearPhotoRows]);

  const closeCreate = useCallback(() => {
    clearPhotoRows();
    setCreateOpen(false);
    setFormError(null);
    setLocateHint(null);
    setNewSpotLocating(false);
  }, [clearPhotoRows]);

  const applyCoordsToLocationField = useCallback(
    async (latitude: number, longitude: number) => {
      try {
        const label = await reverseGeocodeLabel(latitude, longitude);
        setFormLocation(label);
        setLocateHint(null);
      } catch {
        setFormLocation(
          `${latitude.toFixed(5)}, ${longitude.toFixed(5)}（逆地理失败，可手动修改）`
        );
        setLocateHint("已填入坐标，建议手动改成钓点名称");
      }
    },
    []
  );

  const fillLocationByGps = useCallback(async () => {
    const blocked = geolocationBlockedReason();
    if (blocked) {
      setLocateHint(blocked);
      return;
    }

    const geoOptions = (highAccuracy: boolean): PositionOptions => ({
      enableHighAccuracy: highAccuracy,
      timeout: highAccuracy ? 26_000 : 16_000,
      maximumAge: highAccuracy ? 0 : 120_000,
    });

    const getPos = (opts: PositionOptions) =>
      new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, opts);
      });

    setLocatingPlace(true);
    setLocateHint(null);

    let lastCode: number | undefined;
    const run = async (high: boolean) => {
      try {
        const pos = await getPos(geoOptions(high));
        const { latitude, longitude } = pos.coords;
        await applyCoordsToLocationField(latitude, longitude);
        return true;
      } catch (err: unknown) {
        const code = (err as GeolocationPositionError)?.code;
        if (typeof code === "number") lastCode = code;
        return false;
      }
    };

    try {
      if (await run(false)) return;
      if (await run(true)) return;
      setLocateHint(hintForGeolocationError(lastCode));
    } finally {
      setLocatingPlace(false);
    }
  }, [applyCoordsToLocationField]);

  const fillNewSpotCoordsByGps = useCallback(() => {
    const blocked = geolocationBlockedReason();
    if (blocked) {
      setFormError(blocked);
      return;
    }
    setNewSpotLocating(true);
    setFormError(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setNewSpotLat(pos.coords.latitude);
        setNewSpotLng(pos.coords.longitude);
        setNewSpotLocating(false);
      },
      (err) => {
        setNewSpotLocating(false);
        setFormError(hintForGeolocationError(err.code));
      },
      { enableHighAccuracy: false, timeout: 16_000, maximumAge: 120_000 }
    );
  }, []);

  const identifyFishForRow = useCallback(async (rowId: string, blob: Blob) => {
    try {
      const small = await shrinkImageBlob(blob);
      const fd = new FormData();
      fd.append("image", small, "fish.jpg");
      const res = await fetch(nextRouteApi("/api/fish-identify"), {
        method: "POST",
        body: fd,
      });
      const data = (await res.json()) as {
        species?: string;
        error?: string;
        fallback?: { species: string };
      };
      let species = "未识别";
      if (!res.ok && data.fallback?.species) {
        species = data.fallback.species;
      } else if (res.ok && typeof data.species === "string" && data.species) {
        species = data.species;
      } else if (data.fallback?.species) {
        species = data.fallback.species;
      }
      setFormPhotoRows((rows) =>
        rows.map((r) =>
          r.id === rowId
            ? {
                ...r,
                identifying: false,
                species,
                identifyError:
                  !res.ok && data.error ? data.error : null,
              }
            : r
        )
      );
    } catch {
      setFormPhotoRows((rows) =>
        rows.map((r) =>
          r.id === rowId
            ? {
                ...r,
                identifying: false,
                species: "识别失败",
                identifyError: "网络异常",
              }
            : r
        )
      );
    }
  }, []);

  const addPhotoFromFile = useCallback(
    async (file: File | null) => {
      if (!file || !file.type.startsWith("image/")) return;
      setFormError(null);
      const blob = await shrinkImageBlob(file);
      const previewUrl = URL.createObjectURL(blob);
      const id = newPhotoRowId();
      const row: PhotoCatchRow = {
        id,
        sourceBlob: blob,
        previewUrl,
        species: "",
        quantity: 1,
        weightKg: 0,
        identifying: true,
        identifyError: null,
      };
      setFormPhotoRows((rows) => [...rows, row]);
      void identifyFishForRow(id, blob);
    },
    [identifyFishForRow]
  );

  const updatePhotoRow = useCallback(
    (id: string, patch: Partial<PhotoCatchRow>) => {
      setFormPhotoRows((rows) =>
        rows.map((r) => (r.id === id ? { ...r, ...patch } : r))
      );
    },
    []
  );

  const removePhotoRow = useCallback((id: string) => {
    setFormPhotoRows((rows) => {
      const hit = rows.find((r) => r.id === id);
      if (hit) URL.revokeObjectURL(hit.previewUrl);
      return rows.filter((r) => r.id !== id);
    });
  }, []);

  const downloadLabeledPhoto = useCallback(async (row: PhotoCatchRow) => {
    const label = row.species.trim() || "鱼种待确认";
    try {
      const dataUrl = await renderImageWithBottomSpeciesLabel(
        row.sourceBlob,
        label
      );
      const safe = label.slice(0, 12) || "fish";
      downloadDataUrl(
        dataUrl,
        `作钓记录_${safe}_${row.id.slice(-6)}.png`
      );
    } catch {
      setFormError("生成标注图片失败，请重试");
    }
  }, []);

  const updateCatchRow = useCallback(
    (index: number, patch: Partial<CatchEntry>) => {
      setFormCatches((rows) =>
        rows.map((row, i) => {
          if (i !== index) return row;
          const next: CatchEntry = { ...row, ...patch };
          if (patch.species != null && patch.species.trim() !== "其它") {
            next.speciesOtherNote = undefined;
          }
          return next;
        })
      );
    },
    []
  );

  const addCatchRow = useCallback(() => {
    setFormCatches((rows) => [...rows, emptyCatch()]);
  }, []);

  const removeCatchRow = useCallback((index: number) => {
    setFormCatches((rows) =>
      rows.length <= 1 ? rows : rows.filter((_, i) => i !== index)
    );
  }, []);

  const applySpeciesChip = useCallback((species: string) => {
    setFormCatches((rows) => {
      const emptyIdx = rows.findIndex((r) => !r.species.trim());
      const i = emptyIdx >= 0 ? emptyIdx : rows.length - 1;
      return rows.map((row, j) => {
        if (j !== i) return row;
        if (species === "其它") {
          return { ...row, species, speciesOtherNote: row.speciesOtherNote ?? "" };
        }
        return { ...row, species, speciesOtherNote: undefined };
      });
    });
  }, []);

  const submitNewRecord = useCallback(async () => {
    const loc = formLocation.trim();
    if (!loc) {
      setFormError("请先定位或填写作钓地点");
      return;
    }
    if (!formWaterCategory || !isWaterSpotCategory(formWaterCategory)) {
      setFormError("请选择水域类型：水库、湖泊、江河或黑坑");
      return;
    }
    if (formPhotoRows.some((r) => r.identifying)) {
      setFormError("照片仍在识鱼中，请稍候再保存");
      return;
    }

    const cleaned: CatchEntry[] = [];

    for (const row of formPhotoRows) {
      const sp = row.species.trim();
      if (!sp) {
        setFormError("请为每张照片填写或修正鱼种后再保存");
        return;
      }
      const qty = Math.floor(Number(row.quantity));
      const w = Number(row.weightKg);
      if (qty < 1) {
        setFormError(`「${sp}」数量至少为 1`);
        return;
      }
      if (Number.isNaN(w) || w < 0) {
        setFormError(`「${sp}」重量请填写有效数字（kg）`);
        return;
      }
      cleaned.push({ species: sp, quantity: qty, weightKg: w });
    }

    for (const row of formCatches) {
      const sp = row.species.trim();
      if (!sp) continue;
      if (sp === "其它" && !row.speciesOtherNote?.trim()) {
        setFormError("选择「其它」时请在「具体鱼种」中补充鱼种名称");
        return;
      }
      const qty = Math.floor(Number(row.quantity));
      const w = Number(row.weightKg);
      if (qty < 1) {
        setFormError(`「${formatCatchSpeciesDisplay(row)}」数量至少为 1`);
        return;
      }
      if (Number.isNaN(w) || w < 0) {
        setFormError(`「${formatCatchSpeciesDisplay(row)}」重量请填写有效数字（kg）`);
        return;
      }
      cleaned.push({
        species: sp,
        quantity: qty,
        weightKg: w,
        ...(sp === "其它" && row.speciesOtherNote?.trim()
          ? { speciesOtherNote: row.speciesOtherNote.trim() }
          : {}),
      });
    }

    if (cleaned.length === 0) {
      setFormError("请至少添加一张识鱼照片，或手动填写一行鱼获");
      return;
    }

    const linkId = formLinkedSpotId.trim();
    let resolvedLinkedId: string | undefined;
    let resolvedStars: number | undefined;

    if (linkId) {
      const stars = Math.round(Number(formSpotStars));
      if (stars < 1 || stars > 5 || Number.isNaN(stars)) {
        setFormError("关联钓点后请给出 1～5 星评分");
        return;
      }
      resolvedLinkedId = linkId;
      resolvedStars = stars;
    } else if (formCreateNewSpot) {
      if (!canAddUserMarkedSpotToday()) {
        setFormError(
          `今日新增标记钓点已达 ${USER_SPOT_DAILY_LIMIT} 个上限，请明日再试，或取消勾选「同时标记为新钓点」`
        );
        return;
      }
      const nm = newSpotName.trim();
      if (!nm) {
        setFormError("请填写新钓点名称，或取消勾选「同时标记为新钓点」");
        return;
      }
      const lat = Number(newSpotLat);
      const lng = Number(newSpotLng);
      if (Number.isNaN(lat) || Number.isNaN(lng)) {
        setFormError("新钓点纬度、经度请填写有效数字");
        return;
      }
      if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
        setFormError("新钓点经纬度超出有效范围");
        return;
      }
      const fee = newSpotFee.trim();
      if (!fee) {
        setFormError("请填写新钓点收费说明，如：免费、¥80/天");
        return;
      }
      const created = addUserMarkedSpot({
        name: nm,
        lat,
        lng,
        feeNote: fee,
        waterCategory: formWaterCategory,
      });
      resolvedLinkedId = created.id;
      resolvedStars = undefined;
      setUserSpotsForPicker(loadUserMarkedSpots());
    }

    let sharePhotos: string[] | undefined;
    try {
      if (formPhotoRows.length > 0) {
        const blobs = formPhotoRows.map((row) => row.sourceBlob);
        const urls = await blobsToJpegDataUrls(blobs, 3, 720, 0.78);
        if (urls.length > 0) sharePhotos = urls;
      }
    } catch {
      sharePhotos = undefined;
    }

    const rec: FishingRecord = {
      id: newRecordId(),
      createdAt: new Date().toISOString(),
      location: loc,
      waterCategory: formWaterCategory,
      catches: cleaned,
      notes: formNotes.trim(),
      ...(sharePhotos?.length ? { sharePhotos } : {}),
      ...(resolvedLinkedId != null
        ? resolvedStars != null
          ? {
              linkedSpotId: resolvedLinkedId,
              spotRatingStars: resolvedStars,
            }
          : { linkedSpotId: resolvedLinkedId }
        : {}),
    };
    persist([rec, ...records]);
    setFormError(null);
    closeCreate();
    setPosterOfferRecord(rec);
  }, [
    formCatches,
    formPhotoRows,
    formLocation,
    formWaterCategory,
    formNotes,
    formLinkedSpotId,
    formSpotStars,
    formCreateNewSpot,
    newSpotName,
    newSpotLat,
    newSpotLng,
    newSpotFee,
    records,
    persist,
    closeCreate,
  ]);

  const openNotesEditor = useCallback((r: FishingRecord) => {
    setSwipeShiftById({});
    setNotesEditId(r.id);
    setNotesDraft(r.notes);
  }, []);

  const saveNotes = useCallback(() => {
    if (!notesEditId) return;
    const next = records.map((r) =>
      r.id === notesEditId ? { ...r, notes: notesDraft.trim() } : r
    );
    persist(next);
    setNotesEditId(null);
  }, [notesEditId, notesDraft, records, persist]);

  const deleteRecord = useCallback(
    (id: string) => {
      if (!window.confirm("确定删除这条作钓记录？")) return;
      persist(records.filter((r) => r.id !== id));
      setSwipeShiftById((prev) => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
    },
    [records, persist]
  );

  const closeAllSwipes = useCallback(() => {
    setSwipeShiftById({});
  }, []);

  const onSwipePointerDown = useCallback(
    (e: React.PointerEvent, id: string) => {
      if ((e.target as HTMLElement).closest("button, a")) return;
      if (e.pointerType === "mouse" && e.button !== 0) return;
      const el = e.currentTarget as HTMLElement;
      el.setPointerCapture(e.pointerId);
      const startShift = swipeShiftById[id] ?? 0;
      swipeGestureRef.current = {
        rowId: id,
        startX: e.clientX,
        startShift,
        lastShift: startShift,
        pointerId: e.pointerId,
      };
    },
    [swipeShiftById]
  );

  const onSwipePointerMove = useCallback((e: React.PointerEvent, id: string) => {
    const g = swipeGestureRef.current;
    if (g.rowId !== id || g.pointerId !== e.pointerId) return;
    const dx = e.clientX - g.startX;
    let next = g.startShift + dx;
    next = Math.max(-SWIPE_ACTION_W, Math.min(0, next));
    g.lastShift = next;
    setSwipeShiftById((prev) => ({ ...prev, [id]: next }));
  }, []);

  const onSwipePointerUp = useCallback((e: React.PointerEvent, id: string) => {
    const g = swipeGestureRef.current;
    if (g.rowId !== id || g.pointerId !== e.pointerId) return;
    const el = e.currentTarget as HTMLElement;
    try {
      el.releasePointerCapture(e.pointerId);
    } catch {
      /* 可能已释放 */
    }
    g.rowId = null;
    g.pointerId = null;
    const s = g.lastShift;
    if (s < -SWIPE_ACTION_W / 2) {
      setSwipeShiftById({ [id]: -SWIPE_ACTION_W });
    } else {
      setSwipeShiftById((prev) => ({ ...prev, [id]: 0 }));
    }
  }, []);

  const showShareToast = useCallback((msg: string) => setShareToast(msg), []);

  const shareRecordToWeChatFriend = useCallback(
    async (r: FishingRecord, qtySum: number, kgSum: number) => {
      const { title, text, url } = buildRecordSharePayload(
        r,
        qtySum,
        kgSum,
        userSpotsForPicker,
        platformSpotNames
      );
      if (typeof navigator.share === "function") {
        try {
          await navigator.share({ title, text, url });
          setSharingRecord(null);
          return;
        } catch (err) {
          if (err instanceof Error && err.name === "AbortError") return;
        }
      }
      try {
        await navigator.clipboard.writeText(`${text}\n${url}`);
        showShareToast("已复制到剪贴板，打开微信粘贴发送给好友");
        setSharingRecord(null);
      } catch {
        showShareToast("无法复制，请长按手动复制");
      }
    },
    [showShareToast, userSpotsForPicker, platformSpotNames]
  );

  const shareRecordToMoments = useCallback(
    async (r: FishingRecord, qtySum: number, kgSum: number) => {
      const { text, url } = buildRecordSharePayload(
        r,
        qtySum,
        kgSum,
        userSpotsForPicker,
        platformSpotNames
      );
      const line = `${text}\n${url}`;
      try {
        await navigator.clipboard.writeText(line);
        showShareToast("已复制，打开微信 → 发现 → 朋友圈粘贴发布");
        setSharingRecord(null);
      } catch {
        showShareToast("复制失败，请重试");
      }
    },
    [showShareToast, userSpotsForPicker, platformSpotNames]
  );

  const copyRecordLink = useCallback(
    async (r: FishingRecord) => {
      const qtySum = r.catches.reduce((a, c) => a + c.quantity, 0);
      const kgSum = r.catches.reduce((a, c) => a + c.weightKg, 0);
      const { url } = buildRecordSharePayload(
        r,
        qtySum,
        kgSum,
        userSpotsForPicker,
        platformSpotNames
      );
      try {
        await navigator.clipboard.writeText(url);
        showShareToast("链接已复制");
        setSharingRecord(null);
      } catch {
        showShareToast("复制失败");
      }
    },
    [showShareToast, userSpotsForPicker, platformSpotNames]
  );

  const recordForNotes = useMemo(
    () => records.find((r) => r.id === notesEditId) ?? null,
    [records, notesEditId]
  );

  const sharingAgg = useMemo(() => {
    if (!sharingRecord) return null;
    const qtySum = sharingRecord.catches.reduce((a, c) => a + c.quantity, 0);
    const kgSum = sharingRecord.catches.reduce((a, c) => a + c.weightKg, 0);
    return { qtySum, kgSum };
  }, [sharingRecord]);

  const posterEditorAgg = useMemo(() => {
    if (!posterEditorRecord) return null;
    const qtySum = posterEditorRecord.catches.reduce(
      (a, c) => a + c.quantity,
      0
    );
    const kgSum = posterEditorRecord.catches.reduce(
      (a, c) => a + c.weightKg,
      0
    );
    return { qtySum, kgSum };
  }, [posterEditorRecord]);

  return (
    <div className="flex h-full min-h-0 flex-col bg-gray-50 dark:bg-zinc-950">
      <div className="shrink-0 bg-gradient-to-br from-[#1E90FF] to-[#00BFFF] px-4 pb-6 pt-4 text-white">
        <div className="mb-4 flex items-start justify-between gap-2">
          <div>
            <h1 className="text-xl font-bold">作钓记录</h1>
            <p className="mt-1 text-xs opacity-90">
              记录地点、鱼获与重量，随时补充心得
            </p>
          </div>
          <button
            type="button"
            onClick={openCreate}
            className={cn(
              "flex shrink-0 items-center gap-1 rounded-full bg-white/20 px-3 py-2 text-xs font-semibold backdrop-blur hover:bg-white/30",
              loginFocusRing()
            )}
          >
            <Plus className="h-4 w-4" aria-hidden />
            新增记录
          </button>
        </div>
        <div className="grid grid-cols-3 gap-2 rounded-2xl bg-white/15 p-3 backdrop-blur-sm">
          <div className="text-center">
            <p className="text-lg font-bold tabular-nums">{hydrated ? stats.trips : "—"}</p>
            <p className="text-[10px] opacity-90">累计出钓</p>
          </div>
          <div className="text-center">
            <p className="text-lg font-bold tabular-nums">{hydrated ? stats.totalQty : "—"}</p>
            <p className="text-[10px] opacity-90">总尾数</p>
          </div>
          <div className="text-center">
            <p className="text-lg font-bold tabular-nums">
              {hydrated ? stats.totalKg.toFixed(1) : "—"}
            </p>
            <p className="text-[10px] opacity-90">总重量 kg</p>
          </div>
        </div>
      </div>

      <div
        className={cn(
          "min-h-0 flex-1 overflow-y-auto px-4 pt-4",
          /* 有列表且出现底部「新增记录」FAB 时，预留 FAB 高度 + 间距，避免压住卡片「写心得」等操作 */
          hydrated && records.length > 0 && !createOpen
            ? "pb-[calc(var(--qishi-bottom-safe)+5rem)]"
            : "pb-28"
        )}
        onScroll={closeAllSwipes}
      >
        {!hydrated ? (
          <p className="py-8 text-center text-sm text-gray-400">加载中…</p>
        ) : records.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-gray-200 bg-white px-4 py-12 text-center dark:border-white/15 dark:bg-zinc-900">
            <Fish className="mx-auto mb-3 h-12 w-12 text-gray-300 dark:text-zinc-600" />
            <p className="mb-1 text-sm font-medium text-gray-700 dark:text-zinc-200">
              还没有记录
            </p>
            <p className="mb-4 text-xs text-gray-500 dark:text-zinc-500">
              点右上角「新增记录」，填写本次作钓地点与鱼获信息
            </p>
            <button
              type="button"
              onClick={openCreate}
              className={cn(
                "rounded-full bg-[#1E90FF] px-5 py-2.5 text-sm font-medium text-white hover:bg-[#1873CC]",
                loginFocusRing()
              )}
            >
              写第一条记录
            </button>
          </div>
        ) : (
          <ul className="space-y-3">
            {records.map((r) => {
              const qtySum = r.catches.reduce((a, c) => a + c.quantity, 0);
              const kgSum = r.catches.reduce((a, c) => a + c.weightKg, 0);
              const shift = swipeShiftById[r.id] ?? 0;
              const linkedSpotFee = r.linkedSpotId
                ? resolveLinkedSpotFeeNote(
                    r.linkedSpotId,
                    userSpotsForPicker
                  )
                : null;
              return (
                <li key={r.id} className="relative overflow-hidden rounded-2xl">
                  <div
                    className="absolute inset-y-0 right-0 z-0 flex"
                    style={{ width: SWIPE_ACTION_W }}
                    aria-hidden={shift === 0}
                  >
                    <button
                      type="button"
                      onClick={() => deleteRecord(r.id)}
                      className={cn(
                        "flex w-1/2 flex-col items-center justify-center gap-0.5 bg-red-500 text-xs font-semibold text-white hover:bg-red-600",
                        loginFocusRing()
                      )}
                    >
                      <Trash2 className="h-5 w-5" aria-hidden />
                      删除
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setSwipeShiftById((prev) => ({ ...prev, [r.id]: 0 }));
                        setSharingRecord(r);
                      }}
                      className={cn(
                        "flex w-1/2 flex-col items-center justify-center gap-0.5 bg-[#07C160] text-xs font-semibold text-white hover:bg-[#06ad56]",
                        loginFocusRing()
                      )}
                    >
                      <Share2 className="h-5 w-5" aria-hidden />
                      分享
                    </button>
                  </div>

                  <div
                    role="article"
                    className="relative z-10 cursor-grab touch-pan-y select-none rounded-2xl bg-white shadow-sm transition-transform duration-200 ease-out active:cursor-grabbing dark:bg-zinc-900"
                    style={{
                      transform: `translateX(${shift}px)`,
                    }}
                    onPointerDown={(e) => onSwipePointerDown(e, r.id)}
                    onPointerMove={(e) => onSwipePointerMove(e, r.id)}
                    onPointerUp={(e) => onSwipePointerUp(e, r.id)}
                    onPointerCancel={(e) => onSwipePointerUp(e, r.id)}
                  >
                    <div className="border-b border-gray-100 px-4 py-3 dark:border-white/10">
                      <div className="mb-2 flex items-center gap-2 text-sm text-gray-500 dark:text-zinc-400">
                        <Calendar className="h-4 w-4 shrink-0 text-[#1E90FF]" />
                        <span className="tabular-nums">
                          {formatDateTime(r.createdAt)}
                        </span>
                      </div>
                      <div className="flex flex-wrap items-start gap-2">
                        <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-[#1E90FF]" />
                        <span className="font-semibold text-gray-900 dark:text-zinc-50">
                          {r.location}
                        </span>
                        {r.waterCategory &&
                        isWaterSpotCategory(r.waterCategory) ? (
                          <span className="rounded-full bg-[#1E90FF]/12 px-2 py-0.5 text-[11px] font-medium text-[#1E90FF] dark:bg-[#1E90FF]/20 dark:text-[#4da3ff]">
                            {r.waterCategory}
                          </span>
                        ) : null}
                      </div>
                      {r.linkedSpotId ? (
                        <div className="mt-2 flex flex-col gap-1 rounded-lg bg-amber-50/80 px-2 py-1.5 text-xs dark:bg-amber-950/20">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="text-gray-600 dark:text-zinc-400">
                              关联钓点
                            </span>
                            <span className="font-medium text-gray-900 dark:text-zinc-100">
                              {resolveLinkedSpotName(
                                r.linkedSpotId,
                                userSpotsForPicker,
                                platformSpotNames
                              )}
                            </span>
                            {r.spotRatingStars ? (
                              <span className="flex items-center gap-0.5 text-yellow-600 dark:text-yellow-400">
                                {Array.from(
                                  { length: r.spotRatingStars },
                                  (_, i) => (
                                    <Star
                                      key={i}
                                      className="h-3.5 w-3.5 fill-current"
                                      aria-hidden
                                    />
                                  )
                                )}
                                <span className="sr-only">
                                  {r.spotRatingStars} 星
                                </span>
                              </span>
                            ) : (
                              <span className="text-gray-500 dark:text-zinc-500">
                                本记录未评分
                              </span>
                            )}
                          </div>
                          {linkedSpotFee ? (
                            <div className="text-[11px] text-gray-600 dark:text-zinc-400">
                              收费：
                              <span className="font-medium text-gray-800 dark:text-zinc-200">
                                {linkedSpotFee}
                              </span>
                            </div>
                          ) : null}
                        </div>
                      ) : null}
                      <p className="mt-2 text-[10px] text-gray-400 dark:text-zinc-500">
                        手机向左滑；电脑鼠标按住卡片向左拖，露出删除、分享
                      </p>
                    </div>

                    <div className="space-y-2 px-4 py-3">
                      <div className="flex items-center gap-2 text-xs font-medium text-gray-500 dark:text-zinc-400">
                        <Fish className="h-3.5 w-3.5" />
                        本次鱼获
                      </div>
                      <div className="rounded-xl bg-gray-50 dark:bg-zinc-950/60">
                        {r.catches.map((c, idx) => (
                          <div
                            key={`${r.id}-${idx}-${formatCatchSpeciesDisplay(c)}`}
                            className="flex items-center justify-between border-b border-gray-100 px-3 py-2.5 text-sm last:border-0 dark:border-white/10"
                          >
                            <span className="font-medium text-gray-800 dark:text-zinc-100">
                              {formatCatchSpeciesDisplay(c)}
                            </span>
                            <span className="tabular-nums text-gray-600 dark:text-zinc-300">
                              {c.quantity} 尾 · {c.weightKg.toFixed(2)} kg
                            </span>
                          </div>
                        ))}
                        <div className="flex items-center justify-between px-3 py-2 text-xs text-[#1E90FF] dark:text-[#4da3ff]">
                          <span>小计</span>
                          <span className="tabular-nums font-semibold">
                            {qtySum} 尾 · {kgSum.toFixed(2)} kg
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="border-t border-gray-100 px-4 py-3 dark:border-white/10">
                      <div className="mb-2 flex items-center gap-2 text-xs font-medium text-gray-500 dark:text-zinc-400">
                        <BookOpen className="h-3.5 w-3.5" />
                        心得体会
                      </div>
                      {r.notes ? (
                        <p className="mb-3 whitespace-pre-wrap text-sm leading-relaxed text-gray-700 dark:text-zinc-200">
                          {r.notes}
                        </p>
                      ) : (
                        <p className="mb-3 text-sm text-gray-400 dark:text-zinc-500">
                          暂无心得，可点击下方补充
                        </p>
                      )}
                      <button
                        type="button"
                        onClick={() => openNotesEditor(r)}
                        className={cn(
                          "flex w-full items-center justify-center gap-1.5 rounded-xl border border-gray-200 py-2.5 text-sm font-medium text-gray-800 hover:bg-gray-50 dark:border-white/15 dark:text-zinc-100 dark:hover:bg-zinc-800",
                          loginFocusRing()
                        )}
                      >
                        <Pencil className="h-4 w-4" aria-hidden />
                        {r.notes ? "编辑心得" : "写心得"}
                      </button>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {createOpen ? (
        <div
          className="fixed inset-0 z-[6600] flex flex-col justify-end bg-black/45"
          role="presentation"
          onClick={closeCreate}
        >
          <div
            role="dialog"
            aria-label="新增作钓记录"
            className="max-h-[88vh] overflow-hidden rounded-t-2xl bg-white shadow-2xl dark:bg-zinc-900"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3 dark:border-white/10">
              <h2 className="text-base font-semibold">新增作钓记录</h2>
              <button
                type="button"
                onClick={closeCreate}
                className={cn("rounded-lg p-2 text-gray-500", loginFocusRing())}
                aria-label="关闭"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="max-h-[calc(88vh-52px)] overflow-y-auto px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3">
              <div className="mb-1 flex items-center justify-between gap-2">
                <label className="text-xs font-medium text-gray-600 dark:text-zinc-400">
                  作钓地点 <span className="text-red-500">*</span>
                </label>
                <button
                  type="button"
                  onClick={fillLocationByGps}
                  disabled={locatingPlace}
                  className={cn(
                    "flex items-center gap-1 rounded-lg border border-[#1E90FF]/40 bg-blue-50 px-2.5 py-1 text-[11px] font-semibold text-[#1E90FF] hover:bg-blue-100 disabled:opacity-60 dark:bg-blue-950/40 dark:text-[#4da3ff]",
                    loginFocusRing()
                  )}
                >
                  {locatingPlace ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
                  ) : (
                    <MapPin className="h-3.5 w-3.5" aria-hidden />
                  )}
                  {locatingPlace ? "定位中" : "定位填入"}
                </button>
              </div>
              <p className="mb-1.5 text-[10px] text-gray-400 dark:text-zinc-500">
                点击「定位填入」由系统根据 GPS 逆地理生成地点，可再手动微调
              </p>
              <input
                type="text"
                value={formLocation}
                onChange={(e) => setFormLocation(e.target.value)}
                placeholder="定位后自动显示，也可手动作钓位置"
                className="mb-1 w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm outline-none ring-[#1E90FF]/30 focus:bg-white focus:ring-2 dark:border-white/15 dark:bg-zinc-950 dark:text-zinc-100 dark:focus:bg-zinc-900"
              />
              {locateHint ? (
                <p className="mb-3 text-[11px] text-amber-700 dark:text-amber-300">
                  {locateHint}
                </p>
              ) : (
                <div className="mb-3" />
              )}

              <div className="mb-4">
                <label className="mb-1.5 block text-xs font-medium text-gray-600 dark:text-zinc-400">
                  水域类型 <span className="text-red-500">*</span>
                </label>
                <p className="mb-2 text-[10px] leading-relaxed text-gray-500 dark:text-zinc-400">
                  与「钓点」页分类（水库、湖泊、江河、黑坑）一致；选择关联平台钓点时会自动带出，可改。
                </p>
                <div className="flex flex-wrap gap-2">
                  {WATER_SPOT_CATEGORIES.map((cat) => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setFormWaterCategory(cat)}
                      className={cn(
                        "rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
                        formWaterCategory === cat
                          ? "border-[#1E90FF] bg-[#1E90FF] text-white"
                          : "border-gray-200 bg-white text-gray-700 hover:border-[#1E90FF]/50 dark:border-white/15 dark:bg-zinc-950 dark:text-zinc-200",
                        loginFocusRing()
                      )}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>

              <div className="mb-4 rounded-xl border border-gray-100 bg-gray-50/80 p-3 dark:border-white/10 dark:bg-zinc-900/40">
                <label className="mb-1 block text-xs font-medium text-gray-600 dark:text-zinc-400">
                  关联钓点（可选）
                </label>
                <p className="mb-2 text-[10px] leading-relaxed text-gray-500 dark:text-zinc-400">
                  在列表中关联已有钓点时需打 1～5 星，分数会参与该钓点「钓友均分」。勾选「同时标记为新钓点」时只需名称与坐标，不在此打分；钓点均分由之后大家在记录里关联并打分后汇总。每日最多新增{" "}
                  {USER_SPOT_DAILY_LIMIT} 个标记钓点，今日还可{" "}
                  {remainingUserSpotQuotaToday()} 个。
                </p>
                <select
                  value={formLinkedSpotId}
                  onChange={(e) => {
                    const v = e.target.value;
                    setFormLinkedSpotId(v);
                    if (v) {
                      setFormSpotStars(5);
                      setFormCreateNewSpot(false);
                      const ps = platformSpots.find((p) => p.id === v);
                      if (ps) {
                        setFormLocation(ps.name);
                        if (ps.waterCategory) {
                          setFormWaterCategory(ps.waterCategory);
                        }
                      } else {
                        const u = userSpotsForPicker.find((x) => x.id === v);
                        if (u?.waterCategory) {
                          setFormWaterCategory(u.waterCategory);
                        }
                        if (u) {
                          setFormLocation(u.name);
                        }
                      }
                    } else {
                      setFormSpotStars(5);
                    }
                  }}
                  className="mb-2 w-full rounded-lg border border-gray-200 bg-white px-2 py-2 text-sm dark:border-white/15 dark:bg-zinc-950 dark:text-zinc-100"
                >
                  <option value="">不关联钓点</option>
                  <optgroup label="平台钓点">
                    {platformSpots.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </optgroup>
                  {userSpotsForPicker.length > 0 ? (
                    <optgroup label="钓友标记">
                      {userSpotsForPicker.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name}
                          {s.feeNote?.trim()
                            ? ` · ${s.feeNote.trim()}`
                            : ""}
                        </option>
                      ))}
                    </optgroup>
                  ) : null}
                </select>
                {!formLinkedSpotId ? (
                  <div className="mb-3 rounded-lg border border-dashed border-gray-200 bg-white/60 p-2.5 dark:border-white/15 dark:bg-zinc-950/40">
                    <label className="flex cursor-pointer items-start gap-2 text-[11px] leading-snug text-gray-700 dark:text-zinc-300">
                      <input
                        type="checkbox"
                        className="mt-0.5 shrink-0 rounded border-gray-300"
                        checked={formCreateNewSpot}
                        disabled={!canAddUserMarkedSpotToday()}
                        onChange={(e) => {
                          const on = e.target.checked;
                          setFormCreateNewSpot(on);
                          setFormError(null);
                        }}
                      />
                      <span>
                        同时标记为新钓点（保存作钓记录时一并写入「钓友标记」）
                        {!canAddUserMarkedSpotToday() ? (
                          <span className="mt-1 block text-amber-700 dark:text-amber-300">
                            今日已达 {USER_SPOT_DAILY_LIMIT} 个上限，请明日再试
                          </span>
                        ) : null}
                      </span>
                    </label>
                    {formCreateNewSpot ? (
                      <div className="mt-2 space-y-2 border-t border-gray-100 pt-2 dark:border-white/10">
                        <p className="text-[10px] leading-relaxed text-gray-500 dark:text-zinc-400">
                          新建钓点不在此打分；保存后可在下次作钓时从列表选择该点并评分，均分由多次评分自动计算。
                        </p>
                        <div>
                          <label className="mb-0.5 block text-[10px] font-medium text-gray-600 dark:text-zinc-400">
                            新钓点名称 <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="text"
                            value={newSpotName}
                            onChange={(e) => setNewSpotName(e.target.value)}
                            placeholder="如：村东野塘老位"
                            className="w-full rounded-lg border border-gray-200 px-2 py-2 text-sm dark:border-white/15 dark:bg-zinc-950 dark:text-zinc-100"
                          />
                        </div>
                        <div>
                          <label className="mb-0.5 block text-[10px] font-medium text-gray-600 dark:text-zinc-400">
                            收费 <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="text"
                            value={newSpotFee}
                            onChange={(e) => setNewSpotFee(e.target.value)}
                            placeholder="如：免费、¥80/天、黑坑抽号"
                            className="w-full rounded-lg border border-gray-200 px-2 py-2 text-sm dark:border-white/15 dark:bg-zinc-950 dark:text-zinc-100"
                          />
                        </div>
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-[10px] font-medium text-gray-600 dark:text-zinc-400">
                            坐标
                          </span>
                          <button
                            type="button"
                            onClick={fillNewSpotCoordsByGps}
                            disabled={newSpotLocating}
                            className={cn(
                              "flex items-center gap-1 rounded-lg border border-[#1E90FF]/40 px-2 py-1 text-[10px] font-semibold text-[#1E90FF] disabled:opacity-50",
                              loginFocusRing()
                            )}
                          >
                            {newSpotLocating ? (
                              <Loader2
                                className="h-3 w-3 animate-spin"
                                aria-hidden
                              />
                            ) : (
                              <MapPin className="h-3 w-3" aria-hidden />
                            )}
                            填入当前坐标
                          </button>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="mb-0.5 block text-[10px] text-gray-500">
                              纬度
                            </label>
                            <input
                              type="number"
                              step="0.00001"
                              value={newSpotLat}
                              onChange={(e) =>
                                setNewSpotLat(Number(e.target.value))
                              }
                              className="w-full rounded-lg border border-gray-200 px-2 py-2 text-sm tabular-nums dark:border-white/15 dark:bg-zinc-950 dark:text-zinc-100"
                            />
                          </div>
                          <div>
                            <label className="mb-0.5 block text-[10px] text-gray-500">
                              经度
                            </label>
                            <input
                              type="number"
                              step="0.00001"
                              value={newSpotLng}
                              onChange={(e) =>
                                setNewSpotLng(Number(e.target.value))
                              }
                              className="w-full rounded-lg border border-gray-200 px-2 py-2 text-sm tabular-nums dark:border-white/15 dark:bg-zinc-950 dark:text-zinc-100"
                            />
                          </div>
                        </div>
                      </div>
                    ) : null}
                  </div>
                ) : null}
                {formLinkedSpotId ? (
                  <div>
                    <span className="mb-1.5 block text-xs text-gray-600 dark:text-zinc-400">
                      本次钓点评分（最高 5 星，计入该钓点钓友均分）
                    </span>
                    <div className="flex gap-1">
                      {[1, 2, 3, 4, 5].map((n) => (
                        <button
                          key={n}
                          type="button"
                          onClick={() => setFormSpotStars(n)}
                          className={cn(
                            "rounded-lg p-1.5 transition-colors",
                            n <= formSpotStars
                              ? "text-yellow-500"
                              : "text-gray-300 dark:text-zinc-600",
                            loginFocusRing()
                          )}
                          aria-label={`${n} 星`}
                        >
                          <Star
                            className="h-7 w-7"
                            fill={n <= formSpotStars ? "currentColor" : "none"}
                            strokeWidth={1.5}
                          />
                        </button>
                      ))}
                    </div>
                  </div>
                ) : null}
              </div>

              <div className="mb-2 flex items-center gap-2">
                <Camera className="h-4 w-4 text-[#1E90FF]" aria-hidden />
                <span className="text-xs font-semibold text-gray-800 dark:text-zinc-100">
                  拍照记录
                </span>
              </div>
              <p className="mb-2 text-[10px] leading-relaxed text-gray-500 dark:text-zinc-400">
                可连续添加多张照片；自动识鱼后鱼种显示在图上，可改尾数、重量；「保存标注图」下载到本机。
              </p>
              <input
                ref={photoInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0] ?? null;
                  void addPhotoFromFile(f);
                  e.target.value = "";
                }}
              />
              <input
                ref={galleryInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0] ?? null;
                  void addPhotoFromFile(f);
                  e.target.value = "";
                }}
              />
              <div className="mb-3 flex gap-2">
                <button
                  type="button"
                  onClick={() => photoInputRef.current?.click()}
                  className={cn(
                    "flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-emerald-600 py-2.5 text-xs font-semibold text-white hover:bg-emerald-700",
                    loginFocusRing()
                  )}
                >
                  <Camera className="h-4 w-4" aria-hidden />
                  拍照
                </button>
                <button
                  type="button"
                  onClick={() => galleryInputRef.current?.click()}
                  className={cn(
                    "flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-gray-200 bg-white py-2.5 text-xs font-medium text-gray-800 hover:bg-gray-50 dark:border-white/15 dark:bg-zinc-900 dark:text-zinc-100",
                    loginFocusRing()
                  )}
                >
                  <ImagePlus className="h-4 w-4" aria-hidden />
                  相册
                </button>
              </div>

              {formPhotoRows.length > 0 ? (
                <ul className="mb-4 space-y-3">
                  {formPhotoRows.map((row) => (
                    <li
                      key={row.id}
                      className="overflow-hidden rounded-xl border border-gray-100 dark:border-white/10"
                    >
                      <div className="relative aspect-[4/3] w-full bg-black/5 dark:bg-black/30">
                        {/* blob 预览，不用 next/image */}
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={row.previewUrl}
                          alt="作钓照片"
                          className="h-full w-full object-contain"
                        />
                        <div className="absolute bottom-0 left-0 right-0 bg-black/55 px-2 py-2 text-center text-sm font-bold text-white">
                          {row.identifying ? (
                            <span className="inline-flex items-center gap-1 text-xs font-normal">
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                              AI 识鱼中…
                            </span>
                          ) : (
                            row.species || "待确认"
                          )}
                        </div>
                      </div>
                      <div className="space-y-2 p-3">
                        {row.identifyError ? (
                          <p className="text-[10px] text-amber-700 dark:text-amber-300">
                            {row.identifyError}
                          </p>
                        ) : null}
                        <label className="text-[10px] text-gray-500">鱼种（可改）</label>
                        <input
                          type="text"
                          value={row.species}
                          onChange={(e) =>
                            updatePhotoRow(row.id, { species: e.target.value })
                          }
                          className="w-full rounded-lg border border-gray-200 px-2 py-2 text-sm dark:border-white/15 dark:bg-zinc-950 dark:text-zinc-100"
                          placeholder="识别结果可手动修正"
                        />
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="mb-0.5 block text-[10px] text-gray-500">
                              尾数
                            </label>
                            <input
                              type="number"
                              min={1}
                              step={1}
                              value={row.quantity}
                              onChange={(e) =>
                                updatePhotoRow(row.id, {
                                  quantity: Number(e.target.value) || 0,
                                })
                              }
                              className="w-full rounded-lg border border-gray-200 px-2 py-2 text-sm tabular-nums dark:border-white/15 dark:bg-zinc-950 dark:text-zinc-100"
                            />
                          </div>
                          <div>
                            <label className="mb-0.5 flex items-center gap-0.5 text-[10px] text-gray-500">
                              <Scale className="h-3 w-3" />
                              重量 kg
                            </label>
                            <input
                              type="number"
                              min={0}
                              step={0.01}
                              value={row.weightKg || ""}
                              onChange={(e) =>
                                updatePhotoRow(row.id, {
                                  weightKg: Number(e.target.value) || 0,
                                })
                              }
                              className="w-full rounded-lg border border-gray-200 px-2 py-2 text-sm tabular-nums dark:border-white/15 dark:bg-zinc-950 dark:text-zinc-100"
                            />
                          </div>
                        </div>
                        <div className="flex gap-2 pt-1">
                          <button
                            type="button"
                            onClick={() => void downloadLabeledPhoto(row)}
                            disabled={row.identifying}
                            className={cn(
                              "flex flex-1 items-center justify-center gap-1 rounded-lg border border-[#1E90FF] py-2 text-xs font-medium text-[#1E90FF] hover:bg-blue-50 disabled:opacity-50 dark:hover:bg-blue-950/30",
                              loginFocusRing()
                            )}
                          >
                            <Download className="h-3.5 w-3.5" aria-hidden />
                            保存标注图
                          </button>
                          <button
                            type="button"
                            onClick={() => removePhotoRow(row.id)}
                            className={cn(
                              "rounded-lg border border-red-200 px-3 py-2 text-xs text-red-600 hover:bg-red-50 dark:border-red-900/50 dark:hover:bg-red-950/30",
                              loginFocusRing()
                            )}
                          >
                            删除
                          </button>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              ) : null}

              <div className="mb-2 flex items-center justify-between">
                <span className="text-xs font-medium text-gray-600 dark:text-zinc-400">
                  手动补充鱼获（可选）
                </span>
                <button
                  type="button"
                  onClick={addCatchRow}
                  className={cn(
                    "flex items-center gap-0.5 text-xs font-medium text-[#1E90FF]",
                    loginFocusRing()
                  )}
                >
                  <Plus className="h-3.5 w-3.5" />
                  再加一行
                </button>
              </div>

              <p className="mb-1.5 text-[10px] text-gray-400">
                快捷鱼种：优先填入首个空行，否则更新最后一行
              </p>
              <div className="mb-3 flex flex-wrap gap-1.5">
                {SPECIES_QUICK.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => applySpeciesChip(s)}
                    className={cn(
                      "rounded-full border border-gray-200 px-2.5 py-1 text-[11px] text-gray-700 hover:border-[#1E90FF] hover:text-[#1E90FF] dark:border-white/15 dark:text-zinc-300",
                      loginFocusRing()
                    )}
                  >
                    {s}
                  </button>
                ))}
              </div>

              <div className="space-y-3">
                {formCatches.map((row, index) => (
                  <div
                    key={index}
                    className="rounded-xl border border-gray-100 p-3 dark:border-white/10"
                  >
                    <div className="mb-2 flex items-center justify-between">
                      <span className="text-xs text-gray-500">
                        第 {index + 1} 种鱼
                      </span>
                      {formCatches.length > 1 ? (
                        <button
                          type="button"
                          onClick={() => removeCatchRow(index)}
                          className="text-xs text-red-500 hover:underline"
                        >
                          移除此行
                        </button>
                      ) : null}
                    </div>
                    <input
                      type="text"
                      value={row.species}
                      onChange={(e) =>
                        updateCatchRow(index, { species: e.target.value })
                      }
                      placeholder="鱼种"
                      className="mb-2 w-full rounded-lg border border-gray-200 px-2 py-2 text-sm dark:border-white/15 dark:bg-zinc-950 dark:text-zinc-100"
                    />
                    {row.species.trim() === "其它" ? (
                      <div className="mb-2">
                        <label className="mb-0.5 block text-[10px] font-medium text-gray-600 dark:text-zinc-400">
                          具体鱼种 <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          value={row.speciesOtherNote ?? ""}
                          onChange={(e) =>
                            updateCatchRow(index, {
                              speciesOtherNote: e.target.value,
                            })
                          }
                          placeholder="如：大口鲶、太阳鱼…"
                          className="w-full rounded-lg border border-gray-200 px-2 py-2 text-sm dark:border-white/15 dark:bg-zinc-950 dark:text-zinc-100"
                        />
                        <p className="mt-0.5 text-[10px] text-gray-400 dark:text-zinc-500">
                          选择「其它」时比固定鱼种多一栏，用于写明实际鱼种。
                        </p>
                      </div>
                    ) : null}
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="mb-0.5 block text-[10px] text-gray-500">
                          数量（尾）
                        </label>
                        <input
                          type="number"
                          min={1}
                          step={1}
                          value={row.quantity}
                          onChange={(e) =>
                            updateCatchRow(index, {
                              quantity: Number(e.target.value) || 0,
                            })
                          }
                          className="w-full rounded-lg border border-gray-200 px-2 py-2 text-sm tabular-nums dark:border-white/15 dark:bg-zinc-950 dark:text-zinc-100"
                        />
                      </div>
                      <div>
                        <label className="mb-0.5 flex items-center gap-0.5 text-[10px] text-gray-500">
                          <Scale className="h-3 w-3" />
                          重量（kg）
                        </label>
                        <input
                          type="number"
                          min={0}
                          step={0.01}
                          value={row.weightKg || ""}
                          onChange={(e) =>
                            updateCatchRow(index, {
                              weightKg: Number(e.target.value) || 0,
                            })
                          }
                          className="w-full rounded-lg border border-gray-200 px-2 py-2 text-sm tabular-nums dark:border-white/15 dark:bg-zinc-950 dark:text-zinc-100"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <label className="mb-1 mt-2 block text-xs font-medium text-gray-600 dark:text-zinc-400">
                心得体会（可选，保存后可继续编辑）
              </label>
              <textarea
                value={formNotes}
                onChange={(e) => setFormNotes(e.target.value)}
                rows={4}
                placeholder="天气、饵料、钓法、鱼情……"
                className="mb-3 w-full resize-none rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none ring-[#1E90FF]/30 focus:ring-2 dark:border-white/15 dark:bg-zinc-950 dark:text-zinc-100"
              />

              {formError ? (
                <p className="mb-3 text-xs text-red-600 dark:text-red-400">
                  {formError}
                </p>
              ) : null}

              <button
                type="button"
                onClick={() => void submitNewRecord()}
                className={cn(
                  "mb-2 w-full rounded-xl bg-[#1E90FF] py-3 text-sm font-semibold text-white hover:bg-[#1873CC]",
                  loginFocusRing()
                )}
              >
                保存为一条记录
              </button>
              <p className="pb-2 text-center text-[10px] text-gray-400">
                数据保存在本机浏览器，清除站点数据会丢失
              </p>
            </div>
          </div>
        </div>
      ) : null}

      {notesEditId && recordForNotes ? (
        <div
          className="fixed inset-0 z-[6610] flex items-end justify-center bg-black/45 sm:items-center"
          role="presentation"
          onClick={() => setNotesEditId(null)}
        >
          <div
            role="dialog"
            aria-label="编辑心得体会"
            className="w-full max-w-md rounded-t-2xl bg-white p-4 shadow-xl dark:bg-zinc-900 sm:rounded-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-base font-semibold">编辑心得</h2>
              <button
                type="button"
                onClick={() => setNotesEditId(null)}
                className={cn("rounded-lg p-1 text-gray-500", loginFocusRing())}
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <p className="mb-2 text-xs text-gray-500 dark:text-zinc-400">
              {recordForNotes.location} ·{" "}
              {formatDateTime(recordForNotes.createdAt)}
            </p>
            <textarea
              value={notesDraft}
              onChange={(e) => setNotesDraft(e.target.value)}
              rows={8}
              className="mb-4 w-full resize-none rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none ring-[#1E90FF]/30 focus:ring-2 dark:border-white/15 dark:bg-zinc-950 dark:text-zinc-100"
              placeholder="记录本次作钓心得…"
            />
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setNotesEditId(null)}
                className={cn(
                  "flex-1 rounded-xl border border-gray-200 py-2.5 text-sm font-medium dark:border-white/15",
                  loginFocusRing()
                )}
              >
                取消
              </button>
              <button
                type="button"
                onClick={saveNotes}
                className={cn(
                  "flex-1 rounded-xl bg-[#1E90FF] py-2.5 text-sm font-semibold text-white",
                  loginFocusRing()
                )}
              >
                保存
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <PosterOfferAfterSaveDialog
        open={!!posterOfferRecord}
        onLater={() => setPosterOfferRecord(null)}
        onGenerate={() => {
          if (posterOfferRecord) setPosterEditorRecord(posterOfferRecord);
          setPosterOfferRecord(null);
        }}
      />

      {posterEditorRecord && posterEditorAgg ? (
        <PosterEditorModal
          open
          record={posterEditorRecord}
          qtySum={posterEditorAgg.qtySum}
          kgSum={posterEditorAgg.kgSum}
          onClose={() => setPosterEditorRecord(null)}
          onToast={showShareToast}
        />
      ) : null}

      {sharingRecord && sharingAgg ? (
        <div
          className="fixed inset-0 z-[72] flex flex-col justify-end bg-black/45"
          role="presentation"
          onClick={() => setSharingRecord(null)}
        >
          <div
            role="dialog"
            aria-label="分享作钓记录"
            className="rounded-t-2xl bg-white px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3 shadow-2xl dark:bg-zinc-900"
            onClick={(e) => e.stopPropagation()}
          >
            <p className="mb-1 text-center text-sm font-semibold text-gray-900 dark:text-zinc-50">
              分享记录
            </p>
            <p className="mb-3 text-center text-xs text-gray-500 dark:text-zinc-400">
              {sharingRecord.location} ·{" "}
              {formatDateTime(sharingRecord.createdAt)}
            </p>
            <div className="flex flex-col gap-2 pb-2">
              <button
                type="button"
                onClick={() => {
                  const r = sharingRecord;
                  setSharingRecord(null);
                  setPosterEditorRecord(r);
                }}
                className={cn(
                  "flex items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-[#1E90FF] to-[#00BFFF] py-2.5 text-sm font-semibold text-white hover:opacity-95",
                  loginFocusRing()
                )}
              >
                <Sparkles className="h-4 w-4 shrink-0" aria-hidden />
                生成分享海报
              </button>
              <button
                type="button"
                onClick={() =>
                  void shareRecordToWeChatFriend(
                    sharingRecord,
                    sharingAgg.qtySum,
                    sharingAgg.kgSum
                  )
                }
                className={cn(
                  "rounded-lg bg-[#07C160] py-2.5 text-sm font-medium text-white hover:bg-[#06ad56]",
                  loginFocusRing()
                )}
              >
                微信好友
              </button>
              <button
                type="button"
                onClick={() =>
                  void shareRecordToMoments(
                    sharingRecord,
                    sharingAgg.qtySum,
                    sharingAgg.kgSum
                  )
                }
                className={cn(
                  "rounded-lg border border-[#07C160] bg-white py-2.5 text-sm font-medium text-[#07C160] hover:bg-green-50 dark:bg-zinc-900 dark:hover:bg-zinc-800",
                  loginFocusRing()
                )}
              >
                朋友圈
              </button>
              <button
                type="button"
                onClick={() => void copyRecordLink(sharingRecord)}
                className={cn(
                  "rounded-lg border border-gray-200 py-2.5 text-sm text-gray-700 hover:bg-gray-50 dark:border-white/15 dark:text-zinc-200 dark:hover:bg-zinc-800",
                  loginFocusRing()
                )}
              >
                仅复制链接
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {shareToast ? (
        <div
          role="status"
          className="pointer-events-none fixed bottom-24 left-1/2 z-[6690] max-w-[min(90vw,20rem)] -translate-x-1/2 rounded-lg bg-slate-900/92 px-4 py-2.5 text-center text-xs text-white shadow-lg dark:bg-zinc-100 dark:text-zinc-900"
        >
          {shareToast}
        </div>
      ) : null}

      {!createOpen && hydrated && records.length > 0 ? (
        <div
          className="pointer-events-none fixed left-0 right-0 z-40 flex justify-center px-4"
          style={{
            bottom: "calc(var(--qishi-bottom-safe) + 0.75rem)",
          }}
        >
          <button
            type="button"
            onClick={openCreate}
            className={cn(
              "pointer-events-auto flex items-center gap-2 rounded-full bg-[#1E90FF] px-5 py-3 text-sm font-semibold text-white shadow-lg hover:bg-[#1873CC]",
              loginFocusRing()
            )}
          >
            <Plus className="h-5 w-5" aria-hidden />
            新增记录
          </button>
        </div>
      ) : null}
    </div>
  );
}
