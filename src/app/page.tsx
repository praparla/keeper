import { redirect } from "next/navigation";

export default async function Home() {
  // TODO: Check auth session and redirect to /login if not authenticated
  redirect("/dashboard");
}
