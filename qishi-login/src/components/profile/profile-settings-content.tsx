"use client";

import { useEffect, useState } from "react";

const NOTIFY_KEY = "qishi:settings:notify-digest:v1";

export function ProfileSettingsContent() {
  const [notify, setNotify] = useState(true);

  useEffect(() => {
    try {
      const v = window.localStorage.getItem(NOTIFY_KEY);
      if (v === "0") setNotify(false);
    } catch {
      /* ignore */
    }
  }, []);

  const onToggle = (on: boolean) => {
    setNotify(on);
    try {
      window.localStorage.setItem(NOTIFY_KEY, on ? "1" : "0");
    } catch {
      /* ignore */
    }
  };

  return (
    <div className="space-y-6">
      <section className="rounded-2xl bg-white p-4 shadow-sm dark:bg-zinc-900">
        <h2 className="mb-3 text-sm font-semibold text-gray-800 dark:text-zinc-200">
          通知（本地）
        </h2>
        <label className="flex cursor-pointer items-center justify-between gap-3">
          <div>
            <p className="text-sm text-gray-900 dark:text-zinc-100">作钓提醒</p>
            <p className="mt-0.5 text-xs text-gray-500 dark:text-zinc-400">
              仅保存在本机，用于后续功能扩展
            </p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={notify}
            onClick={() => onToggle(!notify)}
            className={`relative h-7 w-12 shrink-0 rounded-full transition-colors ${notify ? "bg-[#1E90FF]" : "bg-gray-300 dark:bg-zinc-600"}`}
          >
            <span
              className={`absolute top-0.5 block h-6 w-6 rounded-full bg-white shadow transition-transform ${notify ? "left-5" : "left-0.5"}`}
            />
          </button>
        </label>
      </section>

      <p className="text-xs leading-relaxed text-gray-500 dark:text-zinc-500">
        账号与云端同步、深色模式跟随系统等能力可在后续版本接入。
      </p>
    </div>
  );
}
