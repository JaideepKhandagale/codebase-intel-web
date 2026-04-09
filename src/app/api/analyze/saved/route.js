import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

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

  return NextResponse.json(analyses);
}

export async function POST(request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { repoUrl, repoName, summary, analysisJson } = body;

  if (!repoUrl || !repoName || !analysisJson) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }

  const existing = await prisma.savedAnalysis.findFirst({
    where: { userId: session.user.id, repoUrl },
  });

  if (existing) {
    const updated = await prisma.savedAnalysis.update({
      where: { id: existing.id },
      data: { summary, analysisJson, updatedAt: new Date() },
    });

    return NextResponse.json({ ...updated, updated: true });
  }

  const analysis = await prisma.savedAnalysis.create({
    data: {
      userId: session.user.id,
      repoUrl,
      repoName,
      summary,
      analysisJson,
    },
  });

  return NextResponse.json(analysis, { status: 201 });
}
