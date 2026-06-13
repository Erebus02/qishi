import { BottomNav } from "@/components/app/bottom-nav";
import { AuthGate } from "@/components/auth/auth-gate";
import { PageStayTracker } from "@/components/analytics/page-stay-tracker";

/**
 * 主 Tab 壳：内容区占满视口；底栏 fixed，地图等全屏层需自行用 --qishi-bottom-safe 避开遮挡。
 * mobile-first：小屏优先保证可滚动区域 min-h-0，避免 flex 子项高度塌陷。
 */
export default function MainTabLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthGate>
      <PageStayTracker />
      <div className="flex h-dvh min-h-0 flex-col bg-background">
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden overscroll-y-contain">
          {children}
        </div>
        <BottomNav />
      </div>
    </AuthGate>
  );
}
