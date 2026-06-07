import type { Metadata } from "next";

import { ProfileSubPageShell } from "@/components/profile/profile-sub-page-shell";

export const metadata: Metadata = {
  title: "帮助与反馈 · 起势",
};

const FAQ = [
  {
    q: "钓点数据从哪里来？",
    a: "平台钓点可由后台维护；未联网时使用本地演示数据。关联钓点后评分会参与「钓友均分」统计。",
  },
  {
    q: "为什么定位失败？",
    a: "浏览器在非 HTTPS 的局域网 IP 下可能禁止定位；本机开发请允许浏览器位置权限，或手写作钓地点。",
  },
  {
    q: "作钓记录存在哪里？",
    a: "默认保存在本机浏览器本地存储，清除站点数据会一并清空，重要内容请自行备份。",
  },
];

export default function ProfileHelpPage() {
  return (
    <ProfileSubPageShell title="帮助与反馈">
      <div className="space-y-5">
        <section>
          <h2 className="mb-2 text-sm font-semibold text-gray-800 dark:text-zinc-200">
            常见问题
          </h2>
          <ul className="space-y-3">
            {FAQ.map((item) => (
              <li
                key={item.q}
                className="rounded-xl border border-gray-100 bg-white px-3 py-3 dark:border-white/10 dark:bg-zinc-900"
              >
                <p className="mb-1 text-sm font-medium text-gray-900 dark:text-zinc-100">{item.q}</p>
                <p className="text-xs leading-relaxed text-gray-600 dark:text-zinc-400">{item.a}</p>
              </li>
            ))}
          </ul>
        </section>
        <section className="rounded-xl bg-gray-100 px-3 py-3 text-xs text-gray-600 dark:bg-zinc-800 dark:text-zinc-400">
          <p className="font-medium text-gray-800 dark:text-zinc-200">反馈渠道</p>
          <p className="mt-1">
            产品迭代中，如需反馈 Bug 或建议，可通过应用商店评论或官方渠道联系运营（此处为占位文案）。
          </p>
        </section>
      </div>
    </ProfileSubPageShell>
  );
}
