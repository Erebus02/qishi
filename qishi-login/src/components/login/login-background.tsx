/**
 * Full-screen backdrop from Figma Make: gradient + vignette + soft blue blobs.
 * Light / dark tuned to mirror the reference while staying readable in light mode.
 */
export function LoginBackground() {
  return (
    <div className="pointer-events-none absolute inset-0 z-0" aria-hidden>
      <div className="h-full w-full bg-gradient-to-b from-slate-100 to-[#F2F4F7] dark:from-gray-800 dark:to-gray-900" />
      <div className="absolute inset-0 bg-black/10 dark:bg-black/30" />
      <div className="absolute left-10 top-20 h-32 w-32 rounded-full bg-blue-500/15 blur-3xl dark:bg-blue-500/10" />
      <div className="absolute bottom-40 right-10 h-40 w-40 rounded-full bg-blue-400/15 blur-3xl dark:bg-blue-400/10" />
    </div>
  );
}
