import { redirect } from "next/navigation";

interface HomeProps {
  searchParams: { code?: string; next?: string };
}

export default function Home({ searchParams }: HomeProps) {
  const { code, next } = searchParams;
  if (code) {
    redirect(`/auth/callback?code=${code}${next ? `&next=${next}` : ""}`);
  }
  redirect("/trips");
}
