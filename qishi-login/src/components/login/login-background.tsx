import Image from "next/image";

export function LoginBackground() {
  return (
    <div
      className="pointer-events-none absolute inset-0 z-0 bg-gradient-to-b from-[#8fc7ff] via-[#dceeff] to-white"
      aria-hidden
    >
      <Image
        src="https://unsplash.com/photos/UdZ-QXiHP-A/download?force=true&w=1600"
        alt=""
        fill
        priority
        sizes="100vw"
        className="object-cover object-center"
      />
      <div className="absolute inset-x-0 top-0 h-[42%] bg-gradient-to-b from-[#9acbff]/75 via-[#d7eaff]/30 to-transparent" />
      <div className="absolute inset-0 bg-gradient-to-b from-white/5 via-white/10 to-white/35 backdrop-blur-[1px]" />
      <div className="absolute inset-x-0 bottom-0 h-[54%] bg-gradient-to-t from-white via-white/90 to-transparent" />
    </div>
  );
}
