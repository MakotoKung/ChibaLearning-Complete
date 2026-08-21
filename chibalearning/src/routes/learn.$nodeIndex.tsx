import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useCallback, useEffect, useState } from "react";
import {
  ArrowLeft,
  Check,
  Loader2,
  Play,
  RotateCcw,
  Sparkles,
  Terminal,
  Trophy,
} from "lucide-react";
import { toast } from "sonner";

import { GameHeader } from "@/components/GameHeader";
import { AskAiFab } from "@/components/AskAiFab";
import { PixelMarkdown } from "@/components/PixelMarkdown";
import { buildLesson, runCodeRemote } from "@/lib/ai.functions";
import { useAuth } from "@/hooks/useAuth";
import {
  addXp,
  completeNode,
  fetchActiveRoadmap,
  fetchCachedLesson,
  saveLesson,
  type LessonContent,
  type OpenTask,
} from "@/lib/game-data";
import { langMeta, runJs, runPython } from "@/lib/code-run";
import { markBonusDone } from "@/lib/cards";

export const Route = createFileRoute("/learn/$nodeIndex")({
  head: () => ({
    meta: [
      { title: "ห้องเรียน Code Lab | PixelPath" },
      {
        name: "description",
        content:
          "เรียนเนื้อหาด้านซ้าย ลองเขียนโค้ดใน editor ด้านขวา รันได้หลายภาษา ดูผลใน terminal และทำ quiz ท้ายบท",
      },
      { property: "og:title", content: "ห้องเรียน Code Lab | PixelPath" },
      {
        property: "og:description",
        content: "เรียนไปลองไปแบบ interactive พร้อม ChiChi ติวเตอร์ AI ข้างตัว",
      },
    ],
  }),
  component: LearnPage,
});

function normalize(value: string) {
  return value.trim().toLowerCase().replace(/\s+/g, " ").replace(/[.,;]+$/, "");
}

function LearnPage() {
  const { nodeIndex } = Route.useParams();
  const index = Number(nodeIndex);
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const makeLesson = useServerFn(buildLesson);
  const remoteRun = useServerFn(runCodeRemote);

  const [code, setCode] = useState("");
  const [output, setOutput] = useState<string[]>([]);
  const [running, setRunning] = useState(false);
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [checked, setChecked] = useState(false);
  const [saving, setSaving] = useState(false);

  const [openAnswer, setOpenAnswer] = useState("");
  const [openState, setOpenState] = useState<"idle" | "checking" | "correct" | "wrong">("idle");
  const [bonusOpen, setBonusOpen] = useState(false);
  const [bonusAnswer, setBonusAnswer] = useState("");
  const [bonusState, setBonusState] = useState<"idle" | "checking" | "correct" | "wrong">("idle");

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/auth" });
  }, [loading, user, navigate]);

  const { data: roadmap } = useQuery({
    queryKey: ["roadmap", user?.id],
    queryFn: fetchActiveRoadmap,
    enabled: !!user,
  });

  const node = roadmap?.nodes[index];

  const { data: lesson, isLoading: lessonLoading } = useQuery<LessonContent>({
    queryKey: ["lesson", roadmap?.id, index],
    enabled: !!roadmap && !!node && !!user,
    staleTime: Infinity,
    queryFn: async () => {
      const cached = await fetchCachedLesson(roadmap!.id, index);
      if (cached) return cached;
      const generated = (await makeLesson({
        data: {
          goal: roadmap!.goal,
          title: node!.title,
          subject: node!.subject,
          description: node!.description,
        },
      })) as LessonContent;
      await saveLesson(user!.id, roadmap!.id, index, generated);
      return generated;
    },
  });

  const language = lesson?.language ?? "javascript";
  const meta = langMeta(language);

  useEffect(() => {
    if (lesson?.starterCode) setCode(lesson.starterCode);
  }, [lesson?.starterCode]);

  useEffect(() => {
    if (lesson?.openChallenge?.starterCode) setOpenAnswer(lesson.openChallenge.starterCode);
  }, [lesson?.openChallenge?.starterCode]);

  useEffect(() => {
    if (lesson?.bonusExercise?.starterCode) setBonusAnswer(lesson.bonusExercise.starterCode);
  }, [lesson?.bonusExercise?.starterCode]);

  /** รันโค้ดตามภาษาของบทเรียน: JS ในเบราว์เซอร์, Python ด้วย Pyodide, ภาษาอื่นด้วย AI compiler */
  const execute = useCallback(
    async (source: string): Promise<string[]> => {
      if (!source.trim()) return ["(ยังไม่มีโค้ด)"];
      if (meta.native === "js") return runJs(source);
      if (meta.native === "python") return runPython(source);
      const result = await remoteRun({ data: { language, code: source } });
      if (result.error) return [`✖ ${result.error}`];
      return result.stdout.split("\n");
    },
    [meta.native, language, remoteRun],
  );

  async function run() {
    setRunning(true);
    setOutput([`$ running ${meta.file} (${meta.label})...`]);
    try {
      setOutput(await execute(code));
    } catch {
      setOutput(["✖ รันโค้ดไม่สำเร็จ ลองอีกครั้ง"]);
    } finally {
      setRunning(false);
    }
  }

  async function checkOpen(
    task: OpenTask,
    value: string,
    setState: (s: "idle" | "checking" | "correct" | "wrong") => void,
  ) {
    setState("checking");
    try {
      let actual = value;
      if (task.kind === "code") {
        const lines = await execute(value);
        actual = lines.filter((l) => l.trim()).pop() ?? "";
        setOutput(lines);
      }
      const ok = normalize(actual).includes(normalize(task.expectedAnswer));
      setState(ok ? "correct" : "wrong");
      return ok;
    } catch {
      setState("wrong");
      return false;
    }
  }

  const quiz = lesson?.quiz ?? [];
  const mcScore = quiz.reduce((acc, q, i) => acc + (answers[i] === q.answerIndex ? 1 : 0), 0);
  const hasOpen = !!lesson?.openChallenge?.prompt;
  const score = mcScore + (openState === "correct" ? 1 : 0);
  const total = quiz.length + (hasOpen ? 1 : 0);
  const passed = total > 0 && score >= Math.ceil(total * 0.6);

  async function finish() {
    if (!user || !roadmap) return;
    setSaving(true);
    const xpGain = 50 + score * 10;
    try {
      await completeNode({
        userId: user.id,
        roadmapId: roadmap.id,
        nodeIndex: index,
        score,
        total,
        xpGain,
      });
      await queryClient.invalidateQueries({ queryKey: ["progress", roadmap.id] });
      await queryClient.invalidateQueries({ queryKey: ["profile", user.id] });
      await queryClient.invalidateQueries({ queryKey: ["learner-stats", user.id] });
      toast.success(`ผ่านระดับ ${index + 1}! +${xpGain} XP`);
      navigate({ to: "/path" });
    } catch {
      toast.error("บันทึกความคืบหน้าไม่สำเร็จ");
    } finally {
      setSaving(false);
    }
  }

  async function submitBonus() {
    const task = lesson?.bonusExercise;
    if (!task || !user) return;
    const ok = await checkOpen(task, bonusAnswer, setBonusState);
    if (ok) {
      markBonusDone();
      await addXp(user.id, 120);
      await queryClient.invalidateQueries({ queryKey: ["profile", user.id] });
      toast.success("แบบฝึกหัดพิเศษผ่าน! +120 XP");
    } else {
      toast.error("ยังไม่ถูก ลองอีกครั้งได้ไม่จำกัด");
    }
  }

  return (
    <>
      <GameHeader />
      <main className="mx-auto max-w-7xl px-4 py-6">
        <div className="mb-4 flex flex-wrap items-center gap-3">
          <Link
            to="/path"
            className="text-muted-foreground hover:text-primary flex items-center gap-2 text-sm"
          >
            <ArrowLeft className="h-4 w-4" /> กลับแผนที่
          </Link>
          <h1 className="text-primary text-[0.65rem] sm:text-xs">
            LV.{index + 1} {node?.title ?? ""}
          </h1>
        </div>

        {lessonLoading && (
          <div className="pixel-panel flex items-center gap-3 p-6">
            <Loader2 className="text-primary h-5 w-5 animate-spin" />
            <p className="text-sm">ChiChi กำลังเตรียมบทเรียนของระดับนี้...</p>
          </div>
        )}

        {lesson && (
          <div className="grid gap-4 lg:grid-cols-2">
            {/* ซ้าย: เนื้อหา + quiz */}
            <section className="pixel-panel max-h-[80vh] space-y-5 overflow-y-auto p-5">
              <PixelMarkdown source={lesson.intro} />
              {lesson.sections.map((s, i) => (
                <div key={i} className="space-y-2">
                  <h2 className="text-gold text-[0.6rem]">{s.heading}</h2>
                  <PixelMarkdown source={s.body} />
                </div>
              ))}

              {lesson.keyPoints.length > 0 && (
                <div className="pixel-inset p-3">
                  <h3 className="pixel-text text-primary mb-2 text-[0.55rem]">KEY POINTS</h3>
                  {lesson.keyPoints.map((k, i) => (
                    <p key={i} className="text-sm">
                      ▸ {k}
                    </p>
                  ))}
                </div>
              )}

              <div className="border-border space-y-4 border-t-3 pt-4">
                <h2 className="text-accent flex items-center gap-2 text-[0.6rem]">
                  <Trophy className="h-4 w-4" /> QUIZ ท้ายบท
                </h2>
                {quiz.map((q, qi) => (
                  <div key={qi} className="space-y-2">
                    <p className="text-sm">
                      {qi + 1}. {q.question}
                    </p>
                    <div className="grid gap-2">
                      {q.choices.map((c, ci) => {
                        const selected = answers[qi] === ci;
                        const correct = checked && ci === q.answerIndex;
                        const wrong = checked && selected && ci !== q.answerIndex;
                        return (
                          <button
                            key={ci}
                            onClick={() => !checked && setAnswers((a) => ({ ...a, [qi]: ci }))}
                            className={`border-border border-3 px-3 py-2 text-left text-sm ${
                              correct
                                ? "bg-terminal text-background"
                                : wrong
                                  ? "bg-destructive text-destructive-foreground"
                                  : selected
                                    ? "bg-surface-2 text-primary"
                                    : "bg-background"
                            }`}
                          >
                            {c}
                          </button>
                        );
                      })}
                    </div>
                    {checked && <p className="text-muted-foreground text-sm">💡 {q.explanation}</p>}
                  </div>
                ))}

                {/* ข้อเขียนตอบ: เขียนโค้ดแล้วเช็ค output หรือคิดเลขแล้วพิมพ์คำตอบ */}
                {lesson.openChallenge && hasOpen && (
                  <div className="pixel-inset space-y-3 p-3">
                    <p className="pixel-text text-gold text-[0.5rem]">
                      {quiz.length + 1}. ข้อเขียนตอบ (
                      {lesson.openChallenge.kind === "code" ? "เขียนโค้ด" : "คิดแล้วพิมพ์คำตอบ"})
                    </p>
                    <p className="text-sm">{lesson.openChallenge.prompt}</p>
                    {lesson.openChallenge.kind === "code" ? (
                      <textarea
                        spellCheck={false}
                        value={openAnswer}
                        onChange={(e) => setOpenAnswer(e.target.value)}
                        rows={6}
                        className="terminal-text bg-background text-foreground w-full resize-y p-2 text-sm outline-none"
                        placeholder={`${meta.comment} เขียนโค้ด ${meta.label} ที่พิมพ์คำตอบออกมา`}
                      />
                    ) : (
                      <input
                        value={openAnswer}
                        onChange={(e) => setOpenAnswer(e.target.value)}
                        className="pixel-inset w-full px-3 py-2 text-sm outline-none"
                        placeholder="พิมพ์คำตอบ..."
                      />
                    )}
                    <button
                      onClick={() => checkOpen(lesson.openChallenge!, openAnswer, setOpenState)}
                      disabled={openState === "checking"}
                      className="pixel-btn bg-primary text-primary-foreground flex w-full items-center justify-center gap-2"
                    >
                      {openState === "checking" ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Check className="h-4 w-4" />
                      )}
                      ตรวจคำตอบข้อนี้
                    </button>
                    {openState === "correct" && (
                      <p className="text-terminal text-sm">
                        ✔ ถูกต้อง! {lesson.openChallenge.explanation}
                      </p>
                    )}
                    {openState === "wrong" && (
                      <p className="text-destructive text-sm">✖ ยังไม่ถูก ลองแก้แล้วตรวจอีกครั้ง</p>
                    )}
                  </div>
                )}

                {!checked ? (
                  <button
                    onClick={() => setChecked(true)}
                    disabled={Object.keys(answers).length < quiz.length}
                    className="pixel-btn bg-accent text-accent-foreground w-full"
                  >
                    ตรวจคำตอบทั้งหมด
                  </button>
                ) : (
                  <div className="space-y-2">
                    <p className="pixel-text text-gold text-[0.55rem]">
                      SCORE {score}/{total}
                    </p>
                    {passed ? (
                      <button
                        onClick={finish}
                        disabled={saving}
                        className="pixel-btn bg-terminal text-background flex w-full items-center justify-center gap-2"
                      >
                        {saving ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Check className="h-4 w-4" />
                        )}
                        ผ่านระดับนี้
                      </button>
                    ) : (
                      <button
                        onClick={() => {
                          setChecked(false);
                          setAnswers({});
                        }}
                        className="pixel-btn bg-surface-2 text-foreground flex w-full items-center justify-center gap-2"
                      >
                        <RotateCcw className="h-4 w-4" /> ลองอีกครั้ง (ต้องได้ 60%)
                      </button>
                    )}
                  </div>
                )}
              </div>

              {/* แบบฝึกหัดพิเศษ (ไม่บังคับ) XP มากกว่าปกติ */}
              {lesson.bonusExercise?.prompt && (
                <div className="border-gold space-y-3 border-3 p-3">
                  <button
                    onClick={() => setBonusOpen((v) => !v)}
                    className="text-gold flex w-full items-center justify-between gap-2 text-[0.55rem]"
                  >
                    <span className="flex items-center gap-2">
                      <Sparkles className="h-4 w-4" /> SPECIAL EXERCISE · +120 XP
                    </span>
                    <span className="pixel-text text-[0.45rem]">
                      {bonusOpen ? "ซ่อน" : "ทำก็ได้ ไม่ทำก็ได้"}
                    </span>
                  </button>
                  {bonusOpen && (
                    <>
                      <p className="text-sm">{lesson.bonusExercise.prompt}</p>
                      {lesson.bonusExercise.kind === "code" ? (
                        <textarea
                          spellCheck={false}
                          value={bonusAnswer}
                          onChange={(e) => setBonusAnswer(e.target.value)}
                          rows={6}
                          className="terminal-text bg-background text-foreground w-full resize-y p-2 text-sm outline-none"
                        />
                      ) : (
                        <input
                          value={bonusAnswer}
                          onChange={(e) => setBonusAnswer(e.target.value)}
                          className="pixel-inset w-full px-3 py-2 text-sm outline-none"
                          placeholder="พิมพ์คำตอบ..."
                        />
                      )}
                      <button
                        onClick={submitBonus}
                        disabled={bonusState === "checking" || bonusState === "correct"}
                        className="pixel-btn bg-gold text-gold-foreground flex w-full items-center justify-center gap-2"
                      >
                        {bonusState === "checking" ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Sparkles className="h-4 w-4" />
                        )}
                        {bonusState === "correct" ? "ผ่านแล้ว!" : "ส่งคำตอบพิเศษ"}
                      </button>
                      {bonusState === "correct" && (
                        <p className="text-terminal text-sm">
                          ✔ {lesson.bonusExercise.explanation}
                        </p>
                      )}
                      {bonusState === "wrong" && (
                        <p className="text-destructive text-sm">✖ ยังไม่ถูก ลองอีกครั้ง</p>
                      )}
                    </>
                  )}
                </div>
              )}
            </section>

            {/* ขวา: editor บน / terminal ล่าง */}
            <section className="flex max-h-[80vh] flex-col gap-4">
              <div className="pixel-panel flex min-h-0 flex-1 flex-col">
                <div className="border-border bg-surface-2 flex items-center justify-between border-b-3 px-3 py-2">
                  <span className="pixel-text text-primary text-[0.55rem]">
                    {lesson.hasCodeLab ? `EDITOR · ${meta.file}` : "SCRATCHPAD"}
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="pixel-text text-muted-foreground text-[0.45rem]">
                      {meta.label}
                    </span>
                    <button
                      onClick={run}
                      disabled={running}
                      className="pixel-text bg-primary text-primary-foreground flex items-center gap-1 px-2 py-1 text-[0.5rem]"
                    >
                      {running ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        <Play className="h-3 w-3" />
                      )}
                      RUN
                    </button>
                  </div>
                </div>
                {lesson.challenge && (
                  <p className="border-border text-gold border-b-3 px-3 py-2 text-sm">
                    🎯 {lesson.challenge}
                  </p>
                )}
                <textarea
                  spellCheck={false}
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  className="terminal-text text-foreground bg-background min-h-48 flex-1 resize-none p-3 outline-none"
                  placeholder={`${meta.comment} เขียนโค้ด ${meta.label} แล้วกด RUN`}
                />
              </div>

              <div className="pixel-panel scanlines flex h-56 flex-col">
                <div className="border-border bg-surface-2 flex items-center gap-2 border-b-3 px-3 py-2">
                  <Terminal className="text-terminal h-3 w-3" />
                  <span className="pixel-text text-terminal text-[0.55rem]">
                    TERMINAL · {meta.label}
                  </span>
                </div>
                <div className="terminal-text text-terminal bg-background flex-1 overflow-y-auto p-3">
                  {output.length === 0 ? (
                    <p className="opacity-60">$ กด RUN เพื่อรันโค้ด...</p>
                  ) : (
                    output.map((line, i) => (
                      <p key={i} className="whitespace-pre-wrap">
                        {"> "}
                        {line}
                      </p>
                    ))
                  )}
                  <span className="blink-cursor">▮</span>
                </div>
              </div>
            </section>
          </div>
        )}
      </main>

      <AskAiFab
        context={`บทเรียน "${node?.title ?? ""}" (${node?.subject ?? ""}) ภาษา ${meta.label} สำหรับผู้ที่อยากเป็น ${
          roadmap?.goal ?? ""
        }. เนื้อหา: ${lesson?.intro ?? ""}`}
      />
    </>
  );
}
