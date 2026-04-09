import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import DashboardClient from "./DashboardClient";

export const metadata = { title: "Dashboard — Codebase.intel" };

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/auth");

  const analyses = await prisma.savedAnalysis.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      repoUrl: true,
      repoName: true,
      summary: true,
      createdAt: true,
    },
  });

  return (
    <DashboardClient
      user={{
        name: session.user.name ?? "User",
        email: session.user.email ?? "",
        image: session.user.image ?? null,
      }}
      analyses={analyses}
    />
  );
}