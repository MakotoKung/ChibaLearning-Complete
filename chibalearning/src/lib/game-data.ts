import { supabase } from "@/integrations/supabase/client";

export type RoadmapNode = {
  title: string;
  subject: string;
  description: string;
  skills: string[];
  estimatedHours: number;
};

export type Roadmap = {
  id: string;
  goal: string;
  title: string;
  summary: string | null;
  nodes: RoadmapNode[];
  created_at: string;
};

export type OpenTask = {
  kind: "code" | "calc";
  prompt: string;
  starterCode: string;
  expectedAnswer: string;
  explanation: string;
};

export type LessonContent = {
  intro: string;
  sections: { heading: string; body: string }[];
  keyPoints: string[];
  hasCodeLab: boolean;
  language: string;
  starterCode: string;
  challenge: string;
  solutionCode: string;
  quiz: {
    question: string;
    choices: string[];
    answerIndex: number;
    explanation: string;
  }[];
  openChallenge?: OpenTask;
  bonusExercise?: OpenTask;
};

export async function fetchActiveRoadmap(): Promise<Roadmap | null> {
  const { data, error } = await supabase
    .from("roadmaps")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  return { ...data, nodes: (data.nodes ?? []) as RoadmapNode[] } as Roadmap;
}

export async function fetchProgress(roadmapId: string) {
  const { data, error } = await supabase
    .from("node_progress")
    .select("node_index, quiz_score, quiz_total")
    .eq("roadmap_id", roadmapId);
  if (error) throw error;
  return data ?? [];
}

export async function fetchProfile(userId: string) {
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function fetchCachedLesson(roadmapId: string, nodeIndex: number) {
  const { data, error } = await supabase
    .from("lessons")
    .select("content")
    .eq("roadmap_id", roadmapId)
    .eq("node_index", nodeIndex)
    .maybeSingle();
  if (error) throw error;
  return (data?.content as LessonContent | undefined) ?? null;
}

export async function saveLesson(
  userId: string,
  roadmapId: string,
  nodeIndex: number,
  content: LessonContent,
) {
  await supabase
    .from("lessons")
    .upsert(
      { user_id: userId, roadmap_id: roadmapId, node_index: nodeIndex, content },
      { onConflict: "roadmap_id,node_index" },
    );
}

export async function completeNode(params: {
  userId: string;
  roadmapId: string;
  nodeIndex: number;
  score: number;
  total: number;
  xpGain: number;
}) {
  const { error } = await supabase.from("node_progress").upsert(
    {
      user_id: params.userId,
      roadmap_id: params.roadmapId,
      node_index: params.nodeIndex,
      quiz_score: params.score,
      quiz_total: params.total,
      completed_at: new Date().toISOString(),
    },
    { onConflict: "roadmap_id,node_index" },
  );
  if (error) throw error;

  const profile = await fetchProfile(params.userId);
  await supabase
    .from("profiles")
    .update({ xp: (profile?.xp ?? 0) + params.xpGain })
    .eq("id", params.userId);
}

export type LearnerStats = {
  nodesCleared: number;
  roadmapsCompleted: number;
  perfectQuizzes: number;
  xp: number;
};

/** สรุปสถิติผู้เรียนทั้งหมด สำหรับ Ranking board */
export async function fetchLearnerStats(userId: string): Promise<LearnerStats> {
  const [{ data: roadmaps, error: rErr }, { data: progress, error: pErr }, profile] =
    await Promise.all([
      supabase.from("roadmaps").select("id, nodes"),
      supabase.from("node_progress").select("roadmap_id, node_index, quiz_score, quiz_total"),
      fetchProfile(userId),
    ]);
  if (rErr) throw rErr;
  if (pErr) throw pErr;

  const rows = progress ?? [];
  const perRoadmap = new Map<string, number>();
  for (const row of rows) {
    perRoadmap.set(row.roadmap_id, (perRoadmap.get(row.roadmap_id) ?? 0) + 1);
  }

  const roadmapsCompleted = (roadmaps ?? []).filter((r) => {
    const nodeCount = ((r.nodes ?? []) as RoadmapNode[]).length;
    return nodeCount > 0 && (perRoadmap.get(r.id) ?? 0) >= nodeCount;
  }).length;

  return {
    nodesCleared: rows.length,
    roadmapsCompleted,
    perfectQuizzes: rows.filter((r) => r.quiz_total > 0 && r.quiz_score >= r.quiz_total).length,
    xp: profile?.xp ?? 0,
  };
}

export async function addXp(userId: string, amount: number) {
  const profile = await fetchProfile(userId);
  await supabase
    .from("profiles")
    .update({ xp: (profile?.xp ?? 0) + amount })
    .eq("id", userId);
}
