import Image from "next/image";

export function LoginBackground() {
  return (
    <div
      className="pointer-events-none absolute inset-0 z-0 bg-gradient-to-b from-[#8fc7ff] via-[#dceeff] to-white"
      aria-hidden
    >
      <Image
        src="/login-bg.webp"
        alt=""
        fill
        priority
        sizes="100vw"
        quality={88}
        className="object-cover object-center"
      />
      <div className="absolute inset-x-0 top-0 h-[40%] bg-gradient-to-b from-[#8ec9ff]/38 via-white/10 to-transparent" />
      <div className="absolute inset-0 bg-gradient-to-b from-white/5 via-transparent to-white/18" />
      <div className="absolute inset-x-0 bottom-0 h-[48%] bg-gradient-to-t from-white/92 via-white/55 to-transparent" />
    </div>
  );
}
