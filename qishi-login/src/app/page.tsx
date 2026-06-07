import { redirect } from "next/navigation";

/** 应用入口：先进入登录页；登录成功或左上角跳过后再进入 /map 等主界面 */
export default function Home() {
  redirect("/login");
}
