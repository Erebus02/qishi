"use client";

import { useMemo, useState } from "react";
import type { FormEvent } from "react";
import Link from "next/link";
import {
  Activity,
  BarChart3,
  ChevronRight,
  Database,
  Download,
  Fish,
  Home,
  MapPin,
  Pencil,
  Plus,
  RefreshCcw,
  Save,
  Search,
  ShieldCheck,
  Star,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

import type { FishingSpot, MapCenter } from "@/lib/geo/fishing-spots";
import {
  isWaterSpotCategory,
  WATER_SPOT_CATEGORIES,
} from "@/lib/geo/water-spot-category";

import styles from "./admin-dashboard.module.css";

type AdminDashboardProps = {
  initialSpots: FishingSpot[];
  defaultCenter: MapCenter;
};

type StatCard = {
  label: string;
  value: string | number;
  detail: string;
  Icon: LucideIcon;
  tone: "blue" | "green" | "amber" | "violet";
};

type SpotFormState = {
  id: string;
  name: string;
  waterCategory: string;
  fish: string;
  region: string;
  distanceLabel: string;
  lat: string;
  lng: string;
  rating: string;
};

const storageKey = "qishi:admin-spots:v1";
const allCategory = "全部水域";

const emptyForm: SpotFormState = {
  id: "",
  name: "",
  waterCategory: WATER_SPOT_CATEGORIES[0] ?? "",
  fish: "",
  region: "",
  distanceLabel: "",
  lat: "",
  lng: "",
  rating: "",
};

function spotToForm(spot: FishingSpot): SpotFormState {
  return {
    id: spot.id,
    name: spot.name,
    waterCategory: spot.waterCategory ?? WATER_SPOT_CATEGORIES[0] ?? "",
    fish: spot.fish ?? "",
    region: spot.region ?? "",
    distanceLabel: spot.distanceLabel ?? "",
    lat: String(spot.lat),
    lng: String(spot.lng),
    rating: typeof spot.rating === "number" ? String(spot.rating) : "",
  };
}

function createNextId(spots: FishingSpot[]) {
  const numericIds = spots
    .map((spot) => Number(spot.id))
    .filter((id) => Number.isFinite(id));
  const next = numericIds.length > 0 ? Math.max(...numericIds) + 1 : spots.length + 1;
  return String(next);
}

function safeRating(value: number | undefined) {
  return typeof value === "number" ? value.toFixed(1) : "-";
}

function parseSpots(raw: string): FishingSpot[] | null {
  try {
    const json = JSON.parse(raw) as unknown;
    const list = Array.isArray(json)
      ? json
      : json &&
          typeof json === "object" &&
          Array.isArray((json as { spots?: unknown }).spots)
        ? (json as { spots: unknown[] }).spots
        : null;

    if (!list) return null;

    return list
      .map<FishingSpot | null>((item) => {
        if (!item || typeof item !== "object") return null;
        const o = item as Record<string, unknown>;
        if (
          typeof o.id !== "string" ||
          typeof o.name !== "string" ||
          typeof o.lat !== "number" ||
          typeof o.lng !== "number"
        ) {
          return null;
        }

        return {
          id: o.id,
          name: o.name,
          lat: o.lat,
          lng: o.lng,
          waterCategory:
            typeof o.waterCategory === "string" &&
            isWaterSpotCategory(o.waterCategory)
              ? o.waterCategory
              : undefined,
          fish: typeof o.fish === "string" ? o.fish : undefined,
          region: typeof o.region === "string" ? o.region : undefined,
          distanceLabel:
            typeof o.distanceLabel === "string" ? o.distanceLabel : undefined,
          rating: typeof o.rating === "number" ? o.rating : undefined,
        } satisfies FishingSpot;
      })
      .filter((spot): spot is FishingSpot => spot != null);
  } catch {
    return null;
  }
}

function mergeDefaultSpots(saved: FishingSpot[], defaults: FishingSpot[]) {
  const savedIds = new Set(saved.map((spot) => spot.id));
  const missingDefaults = defaults.filter((spot) => !savedIds.has(spot.id));
  return missingDefaults.length > 0 ? [...saved, ...missingDefaults] : saved;
}

export function AdminDashboard({
  initialSpots,
  defaultCenter,
}: AdminDashboardProps) {
  const [spots, setSpots] = useState<FishingSpot[]>(() => {
    if (typeof window === "undefined") return initialSpots;
    const saved = window.localStorage.getItem(storageKey);
    const parsed = saved ? parseSpots(saved) : null;
    if (parsed && parsed.length > 0) {
      const merged = mergeDefaultSpots(parsed, initialSpots);
      if (merged.length !== parsed.length) {
        window.localStorage.setItem(
          storageKey,
          JSON.stringify({ defaultCenter, spots: merged }, null, 2)
        );
      }
      return merged;
    }
    return initialSpots;
  });
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState(allCategory);
  const [importText, setImportText] = useState("");
  const [notice, setNotice] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<SpotFormState>(() => ({
    ...emptyForm,
    id: createNextId(initialSpots),
    lat: String(defaultCenter.lat),
    lng: String(defaultCenter.lng),
  }));

  const isEditing = editingId != null;

  const categories = useMemo(() => {
    return [
      allCategory,
      ...Array.from(
        new Set([
          ...WATER_SPOT_CATEGORIES,
          ...spots.map((spot) => spot.waterCategory).filter(Boolean),
        ])
      ),
    ];
  }, [spots]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return spots.filter((spot) => {
      const matchesCategory =
        category === allCategory || spot.waterCategory === category;
      if (!matchesCategory) return false;
      if (!q) return true;
      return [
        spot.id,
        spot.name,
        spot.region,
        spot.fish,
        spot.waterCategory,
        spot.distanceLabel,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(q);
    });
  }, [category, query, spots]);

  const stats = useMemo(() => {
    const rated = spots.filter((spot) => typeof spot.rating === "number");
    const avg =
      rated.length > 0
        ? rated.reduce((sum, spot) => sum + (spot.rating ?? 0), 0) /
          rated.length
        : 0;
    const uniqueCategories = new Set(
      spots.map((spot) => spot.waterCategory).filter(Boolean)
    );
    const uniqueFish = new Set(
      spots
        .flatMap((spot) => (spot.fish ?? "").split(/[、,，\s]+/))
        .map((fish) => fish.trim())
        .filter(Boolean)
    );
    return {
      total: spots.length,
      rated: rated.length,
      avg,
      categories: uniqueCategories.size,
      fishKinds: uniqueFish.size,
    };
  }, [spots]);

  const categoryRows = useMemo(() => {
    const counts = new Map<string, number>();
    for (const spot of spots) {
      const key = spot.waterCategory ?? "未分类";
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
    return Array.from(counts.entries())
      .map(([name, count]) => ({
        name,
        count,
        percent: spots.length ? Math.round((count / spots.length) * 100) : 0,
      }))
      .sort((a, b) => b.count - a.count);
  }, [spots]);

  const statCards: StatCard[] = [
    {
      label: "钓点总数",
      value: stats.total,
      detail: `已收录 ${stats.fishKinds} 类鱼种`,
      Icon: Database,
      tone: "blue",
    },
    {
      label: "已评分钓点",
      value: stats.rated,
      detail: `${Math.round((stats.rated / Math.max(stats.total, 1)) * 100)}% 数据完整`,
      Icon: Star,
      tone: "amber",
    },
    {
      label: "平均评分",
      value: stats.avg ? stats.avg.toFixed(2) : "-",
      detail: "用于前台排序与推荐",
      Icon: BarChart3,
      tone: "green",
    },
    {
      label: "水域类型",
      value: stats.categories,
      detail: "湖泊 / 水库 / 黑坑等",
      Icon: Fish,
      tone: "violet",
    },
  ];

  const persist = (next: FishingSpot[], message: string) => {
    setSpots(next);
    window.localStorage.setItem(storageKey, JSON.stringify(next, null, 2));
    setNotice(message);
  };

  const updateForm = (key: keyof SpotFormState, value: string) => {
    setForm((current) => ({ ...current, [key]: value }));
  };

  const resetForm = () => {
    setEditingId(null);
    setForm({
      ...emptyForm,
      id: createNextId(spots),
      lat: String(defaultCenter.lat),
      lng: String(defaultCenter.lng),
    });
  };

  const editSpot = (spot: FishingSpot) => {
    setEditingId(spot.id);
    setForm(spotToForm(spot));
    setNotice(`正在编辑：${spot.name}`);
  };

  const saveSpot = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const id = form.id.trim();
    const name = form.name.trim();
    const lat = Number(form.lat);
    const lng = Number(form.lng);
    const rating = form.rating.trim() === "" ? undefined : Number(form.rating);

    if (!id || !name) {
      setNotice("保存失败：ID 和钓点名称不能为空。");
      return;
    }
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      setNotice("保存失败：纬度和经度必须是数字。");
      return;
    }
    if (rating !== undefined && (!Number.isFinite(rating) || rating < 0 || rating > 5)) {
      setNotice("保存失败：评分请输入 0 到 5 之间的数字。");
      return;
    }
    if (!isEditing && spots.some((spot) => spot.id === id)) {
      setNotice("保存失败：这个 ID 已存在，请换一个 ID。");
      return;
    }

    const nextSpot: FishingSpot = {
      id,
      name,
      lat,
      lng,
      waterCategory: isWaterSpotCategory(form.waterCategory)
        ? form.waterCategory
        : undefined,
      fish: form.fish.trim() || undefined,
      region: form.region.trim() || undefined,
      distanceLabel: form.distanceLabel.trim() || undefined,
      rating,
    };

    if (isEditing) {
      persist(
        spots.map((spot) => (spot.id === editingId ? nextSpot : spot)),
        `已更新钓点：${name}`
      );
    } else {
      persist([nextSpot, ...spots], `已新增钓点：${name}`);
    }
    setEditingId(null);
    setForm({
      ...emptyForm,
      id: createNextId(isEditing ? spots : [nextSpot, ...spots]),
      lat: String(defaultCenter.lat),
      lng: String(defaultCenter.lng),
    });
  };

  const deleteSpot = (spot: FishingSpot) => {
    const confirmed = window.confirm(`确认删除「${spot.name}」吗？`);
    if (!confirmed) return;
    const next = spots.filter((item) => item.id !== spot.id);
    persist(next, `已删除钓点：${spot.name}`);
    if (editingId === spot.id) {
      setEditingId(null);
      setForm({
        ...emptyForm,
        id: createNextId(next),
        lat: String(defaultCenter.lat),
        lng: String(defaultCenter.lng),
      });
    }
  };

  const exportJson = () => {
    const payload = JSON.stringify({ defaultCenter, spots }, null, 2);
    void navigator.clipboard?.writeText(payload);
    setImportText(payload);
    setNotice("已生成 JSON，并尝试复制到剪贴板。");
  };

  const importJson = () => {
    const parsed = parseSpots(importText);
    if (!parsed || parsed.length === 0) {
      setNotice("导入失败：请粘贴包含 spots 数组的 JSON。");
      return;
    }
    persist(parsed, `已导入 ${parsed.length} 个钓点。`);
    setEditingId(null);
    setForm({
      ...emptyForm,
      id: createNextId(parsed),
      lat: String(defaultCenter.lat),
      lng: String(defaultCenter.lng),
    });
  };

  const reset = () => {
    window.localStorage.removeItem(storageKey);
    setSpots(initialSpots);
    setCategory(allCategory);
    setQuery("");
    setImportText("");
    setEditingId(null);
    setForm({
      ...emptyForm,
      id: createNextId(initialSpots),
      lat: String(defaultCenter.lat),
      lng: String(defaultCenter.lng),
    });
    setNotice("已恢复为项目内置钓点数据。");
  };

  return (
    <main className={styles.shell}>
      <aside className={styles.sidebar}>
        <div className={styles.brand}>
          <div className={styles.logo}>起</div>
          <div>
            <p>起势 Admin</p>
            <span>Fishing Console</span>
          </div>
        </div>

        <nav className={styles.nav}>
          <a className={styles.navActive} href="#overview">
            <Activity size={18} />
            总览
          </a>
          <a href="#editor">
            <Plus size={18} />
            增改钓点
          </a>
          <a href="#spots">
            <MapPin size={18} />
            钓点数据
          </a>
          <a href="#tools">
            <Database size={18} />
            数据工具
          </a>
        </nav>

        <div className={styles.sidebarCard}>
          <ShieldCheck size={22} />
          <strong>CRUD 已启用</strong>
          <p>新增、查询、编辑、删除都会立即保存到浏览器本地数据。</p>
        </div>
      </aside>

      <section className={styles.content}>
        <header className={styles.topbar}>
          <div>
            <p className={styles.eyebrow}>钓点运营后台</p>
            <h1>钓点数据中心</h1>
            <span>统一维护前台钓点数据，支持增删查改和 JSON 批量导入导出。</span>
          </div>
          <div className={styles.topActions}>
            <Link href="/map" className={styles.secondaryButton}>
              <Home size={17} />
              返回前台
            </Link>
            <button className={styles.primaryButton} onClick={resetForm}>
              <Plus size={17} />
              新增钓点
            </button>
          </div>
        </header>

        <section id="overview" className={styles.statsGrid}>
          {statCards.map(({ label, value, detail, Icon, tone }) => (
            <article className={styles.statCard} key={label}>
              <div className={`${styles.statIcon} ${styles[tone]}`}>
                <Icon size={22} />
              </div>
              <div>
                <p>{label}</p>
                <strong>{value}</strong>
                <span>{detail}</span>
              </div>
            </article>
          ))}
        </section>

        <section className={styles.mainGrid}>
          <div>
            <section id="editor" className={`${styles.panel} ${styles.editorPanel}`}>
              <div className={styles.panelHeader}>
                <div>
                  <h2>{isEditing ? "编辑钓点" : "新增钓点"}</h2>
                  <p>{isEditing ? "修改后点击保存，前台数据会同步更新。" : "填写基础信息后即可添加新钓点。"}</p>
                </div>
                {isEditing ? (
                  <button className={styles.ghostButton} onClick={resetForm}>
                    <X size={16} />
                    取消编辑
                  </button>
                ) : null}
              </div>

              <form className={styles.formGrid} onSubmit={saveSpot}>
                <label className={styles.field}>
                  <span>钓点 ID</span>
                  <input
                    value={form.id}
                    onChange={(event) => updateForm("id", event.target.value)}
                    disabled={isEditing}
                    placeholder="例如 5"
                  />
                </label>
                <label className={styles.field}>
                  <span>钓点名称</span>
                  <input
                    value={form.name}
                    onChange={(event) => updateForm("name", event.target.value)}
                    placeholder="例如 东湖钓点"
                  />
                </label>
                <label className={styles.field}>
                  <span>水域类型</span>
                  <select
                    value={form.waterCategory}
                    onChange={(event) =>
                      updateForm("waterCategory", event.target.value)
                    }
                  >
                    {WATER_SPOT_CATEGORIES.map((item) => (
                      <option key={item} value={item}>
                        {item}
                      </option>
                    ))}
                  </select>
                </label>
                <label className={styles.field}>
                  <span>鱼种</span>
                  <input
                    value={form.fish}
                    onChange={(event) => updateForm("fish", event.target.value)}
                    placeholder="草鱼、鲫鱼、黑鱼"
                  />
                </label>
                <label className={styles.field}>
                  <span>区域</span>
                  <input
                    value={form.region}
                    onChange={(event) => updateForm("region", event.target.value)}
                    placeholder="武汉 东湖"
                  />
                </label>
                <label className={styles.field}>
                  <span>距离文案</span>
                  <input
                    value={form.distanceLabel}
                    onChange={(event) =>
                      updateForm("distanceLabel", event.target.value)
                    }
                    placeholder="2.3km"
                  />
                </label>
                <label className={styles.field}>
                  <span>纬度 lat</span>
                  <input
                    value={form.lat}
                    onChange={(event) => updateForm("lat", event.target.value)}
                    placeholder="30.5521"
                  />
                </label>
                <label className={styles.field}>
                  <span>经度 lng</span>
                  <input
                    value={form.lng}
                    onChange={(event) => updateForm("lng", event.target.value)}
                    placeholder="114.4382"
                  />
                </label>
                <label className={styles.field}>
                  <span>评分</span>
                  <input
                    value={form.rating}
                    onChange={(event) => updateForm("rating", event.target.value)}
                    placeholder="4.8"
                  />
                </label>

                <div className={styles.formActions}>
                  <button className={styles.primaryButton} type="submit">
                    <Save size={16} />
                    {isEditing ? "保存修改" : "新增钓点"}
                  </button>
                  <button
                    className={styles.secondaryButton}
                    type="button"
                    onClick={resetForm}
                  >
                    <RefreshCcw size={16} />
                    清空表单
                  </button>
                </div>
              </form>
            </section>

            <section id="spots" className={styles.panel}>
              <div className={styles.panelHeader}>
                <div>
                  <h2>钓点列表</h2>
                  <p>
                    当前显示 {filtered.length} / {spots.length} 条数据
                  </p>
                </div>
                <div className={styles.filters}>
                  <label className={styles.searchBox}>
                    <Search size={18} />
                    <input
                      value={query}
                      onChange={(event) => setQuery(event.target.value)}
                      placeholder="搜索名称、鱼种、地区"
                    />
                  </label>
                  <select
                    value={category}
                    onChange={(event) => setCategory(event.target.value)}
                  >
                    {categories.map((item) => (
                      <option key={item} value={item}>
                        {item}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className={styles.tableWrap}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>钓点</th>
                      <th>水域</th>
                      <th>鱼种</th>
                      <th>区域</th>
                      <th>坐标</th>
                      <th>评分</th>
                      <th>操作</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((spot) => (
                      <tr key={spot.id}>
                        <td>
                          <div className={styles.spotName}>{spot.name}</div>
                          <span className={styles.muted}>ID: {spot.id}</span>
                        </td>
                        <td>
                          <span className={styles.badge}>
                            {spot.waterCategory ?? "未分类"}
                          </span>
                        </td>
                        <td>{spot.fish ?? "-"}</td>
                        <td>{spot.region ?? "-"}</td>
                        <td>
                          <span className={styles.coord}>
                            <MapPin size={14} />
                            {spot.lat.toFixed(4)}, {spot.lng.toFixed(4)}
                          </span>
                        </td>
                        <td>
                          <span className={styles.rating}>
                            <Star size={14} />
                            {safeRating(spot.rating)}
                          </span>
                        </td>
                        <td>
                          <div className={styles.rowActions}>
                            <button
                              className={styles.iconButton}
                              onClick={() => editSpot(spot)}
                              type="button"
                              title="编辑"
                            >
                              <Pencil size={15} />
                            </button>
                            <button
                              className={`${styles.iconButton} ${styles.dangerIcon}`}
                              onClick={() => deleteSpot(spot)}
                              type="button"
                              title="删除"
                            >
                              <Trash2 size={15} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          </div>

          <aside id="tools" className={styles.sideStack}>
            <section className={styles.panel}>
              <div className={styles.panelHeaderCompact}>
                <h2>数据工具</h2>
                <span>JSON 管理</span>
              </div>
              <p className={styles.helper}>
                可导出当前钓点数据，也可粘贴 JSON 导入。支持数组格式或
                <code>{" { spots: [...] } "}</code>格式。
              </p>
              <div className={styles.toolButtons}>
                <button className={styles.primaryButton} onClick={exportJson}>
                  <Download size={16} />
                  导出 JSON
                </button>
                <button className={styles.secondaryButton} onClick={importJson}>
                  <Upload size={16} />
                  导入 JSON
                </button>
                <button className={styles.ghostButton} onClick={reset}>
                  <RefreshCcw size={16} />
                  恢复默认
                </button>
              </div>
              <textarea
                value={importText}
                onChange={(event) => setImportText(event.target.value)}
                placeholder='粘贴 {"spots":[...]} 或数组 JSON'
              />
              {notice ? <p className={styles.notice}>{notice}</p> : null}
            </section>

            <section className={styles.panel}>
              <div className={styles.panelHeaderCompact}>
                <h2>水域分布</h2>
                <span>{categoryRows.length} 类</span>
              </div>
              <div className={styles.categoryList}>
                {categoryRows.map((row) => (
                  <div className={styles.categoryRow} key={row.name}>
                    <div>
                      <strong>{row.name}</strong>
                      <span>{row.count} 个钓点</span>
                    </div>
                    <div className={styles.progress}>
                      <i style={{ width: `${row.percent}%` }} />
                    </div>
                    <b>{row.percent}%</b>
                  </div>
                ))}
              </div>
            </section>

            <Link href="/spots" className={styles.frontLink}>
              查看前台钓点页
              <ChevronRight size={18} />
            </Link>
          </aside>
        </section>
      </section>
    </main>
  );
}
