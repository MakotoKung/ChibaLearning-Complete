import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import {
  createGeminiProvider,
  requireGeminiKey,
  TUTOR_STYLE,
} from "./ai-gateway.server";

const MODEL = "gemini-3.5-flash";

const ChatInput = z.object({
  messages: z
    .array(
      z.object({
        role: z.enum(["user", "assistant"]),
        content: z.string().min(1),
      }),
    )
    .min(1),
});

const ChatOutput = z.object({
  reply: z.string(),
  readyToBuild: z.boolean(),
  careerGoal: z.string(),
});

/** หน้าแรก: คุยกับ ChiChi เพื่อหาเป้าหมายอาชีพ */
export const advisorChat = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => ChatInput.parse(input))
  .handler(async ({ data }) => {
    const { generateObject } = await import("ai");
    const gateway = createGeminiProvider(requireGeminiKey());

    const result = await generateObject({
      model: gateway(MODEL),
      schema: ChatOutput,
      system:
        `คุณคือ "ChiChi" NPC แมวพิกเซลในเกม RPG ที่ช่วยผู้เรียนหาเส้นทางอาชีพสาย Coding และ Science. ${TUTOR_STYLE}\n` +
        "แนะนำตัวว่าชื่อ ChiChi เสมอถ้าผู้เรียนถาม ห้ามเรียกตัวเองว่า Guide\n" +
        "หน้าที่: ถามคำถามสั้น ๆ ทีละ 1-2 ข้อ (ความสนใจ, พื้นฐานที่มี, เวลาที่ว่างต่อสัปดาห์, เป้าหมายปลายทาง) " +
        "เมื่อข้อมูลพอที่จะสร้าง roadmap ให้ตั้ง readyToBuild = true และใส่ careerGoal เป็นชื่ออาชีพที่ชัดเจน เช่น 'Frontend Developer (React)' " +
        "ถ้ายังไม่พอ ให้ readyToBuild = false และ careerGoal = ''. reply ต้องไม่เกิน 4 ประโยค",
      messages: data.messages,
    });

    return result.object;
  });

const RoadmapNode = z.object({
  title: z.string(),
  subject: z.enum(["coding", "science", "math", "theory", "project"]),
  description: z.string(),
  skills: z.array(z.string()),
  estimatedHours: z.number(),
});

const RoadmapOutput = z.object({
  title: z.string(),
  summary: z.string(),
  nodes: z.array(RoadmapNode),
});


export const buildRoadmap = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => z.object({ goal: z.string().min(2) }).parse(input))
  .handler(async ({ data }) => {
    const { generateObject } = await import("ai");
    const gateway = createGeminiProvider(requireGeminiKey());

    const result = await generateObject({
      model: gateway(MODEL),
      schema: RoadmapOutput,
      system:
        `สร้างเส้นทางการเรียน (learning roadmap) แบบเรียงลำดับจากง่ายไปยาก. ${TUTOR_STYLE}\n` +
        "ให้ 8-10 node เท่านั้น แต่ละ node คือ 1 ระดับที่เรียนจบได้ใน 1-6 ชั่วโมง " +
        "ตัดทุกอย่างที่ไม่จำเป็นต่ออาชีพนี้ออก (no rabbit hole) title สั้น กระชับ",
      prompt: `เป้าหมายอาชีพ: ${data.goal}`,
    });

    return result.object;
  });

const CODE_LANGUAGES = [
  "javascript",
  "typescript",
  "python",
  "java",
  "cpp",
  "csharp",
  "go",
  "sql",
  "html",
  "none",
] as const;

const LessonOutput = z.object({
  intro: z.string(),
  sections: z.array(z.object({ heading: z.string(), body: z.string() })),
  keyPoints: z.array(z.string()),
  hasCodeLab: z.boolean(),
  language: z.enum(CODE_LANGUAGES),
  starterCode: z.string(),
  challenge: z.string(),
  solutionCode: z.string(),
  quiz: z.array(
    z.object({
      question: z.string(),
      choices: z.array(z.string()),
      answerIndex: z.number(),
      explanation: z.string(),
    }),
  ),
  openChallenge: z.object({
    kind: z.enum(["code", "calc"]),
    prompt: z.string(),
    starterCode: z.string(),
    expectedAnswer: z.string(),
    explanation: z.string(),
  }),
  bonusExercise: z.object({
    kind: z.enum(["code", "calc"]),
    prompt: z.string(),
    starterCode: z.string(),
    expectedAnswer: z.string(),
    explanation: z.string(),
  }),
});


export const buildLesson = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) =>
    z
      .object({
        goal: z.string(),
        title: z.string(),
        subject: z.string(),
        description: z.string(),
      })
      .parse(input),
  )
  .handler(async ({ data }) => {
    const { generateObject } = await import("ai");
    const gateway = createGeminiProvider(requireGeminiKey());

    const result = await generateObject({
      model: gateway(MODEL),
      schema: LessonOutput,
      system:
        `เขียนบทเรียนหนึ่งระดับสำหรับผู้เรียนที่อยากเป็น ${data.goal}. ${TUTOR_STYLE}\n` +
        "sections ต้องมี 3-4 หัวข้อ (ห้ามน้อยกว่า 3) อธิบายเข้าใจง่าย มีตัวอย่างโค้ดใน markdown code block ได้ " +
        "keyPoints ต้องมี 3-5 ข้อ\n" +
        "ถ้าเป็นเนื้อหาสาย coding ให้ hasCodeLab = true และเลือก language ให้ตรงกับภาษาที่หัวข้อนี้สอนจริง " +
        "(เช่น Python ให้ 'python', Java ให้ 'java', C++ ให้ 'cpp', React/JS ให้ 'javascript', ฐานข้อมูลให้ 'sql') " +
        "starterCode ต้องเป็นโค้ดภาษานั้นที่รันได้และพิมพ์ output ออกทาง stdout. " +
        "ถ้าไม่ใช่ coding ให้ hasCodeLab = false, language = 'none', starterCode = ''\n" +
        "quiz ต้องมี 4 ข้อพอดี (ห้ามน้อยกว่า 4) แต่ละข้อมี choices 4 ตัวเลือกพอดี และ answerIndex เป็น index (0-3) ของคำตอบที่ถูก\n" +
        "openChallenge = ข้อเขียนตอบ 1 ข้อ: ถ้าเป็นสาย coding ให้ kind='code' " +
        "โจทย์ให้เขียนโค้ดที่พิมพ์ output ออกมา และ expectedAnswer = output ที่ถูกต้องแบบสั้น ๆ บรรทัดเดียว " +
        "ถ้าเป็นวิชาคำนวณ/วิทยาศาสตร์ ให้ kind='calc' โจทย์ให้คิดแล้วพิมพ์คำตอบ และ expectedAnswer = คำตอบสั้น ๆ (ตัวเลขหรือคำเดียว)\n" +
        "bonusExercise = แบบฝึกหัดพิเศษ (ยากกว่า openChallenge) รูปแบบเดียวกัน สำหรับผู้ที่อยากได้ XP เพิ่ม",
      prompt: `หัวข้อ: ${data.title}\nหมวด: ${data.subject}\nรายละเอียด: ${data.description}`,
    });

    const lesson = result.object;
    return {
      ...lesson,
      quiz: lesson.quiz.filter((q) => q.choices.length === 4).slice(0, 5),
    };
  });


export const askTutor = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) =>
    z
      .object({
        question: z.string().min(1),
        context: z.string().default(""),
      })
      .parse(input),
  )
  .handler(async ({ data }) => {
    const { generateText } = await import("ai");
    const gateway = createGeminiProvider(requireGeminiKey());

    const result = await generateText({
      model: gateway(MODEL),
      system:
        `คุณคือ "ChiChi" ติวเตอร์แมวพิกเซลในบทเรียน. ${TUTOR_STYLE} ตอบไม่เกิน 6 ประโยค ` +
        `ถ้ามีโค้ดให้ใส่ใน markdown code block\nบริบทบทเรียน: ${data.context}`,
      prompt: data.question,
    });

    return { answer: result.text };
  });

/** รันโค้ดภาษาอื่นที่ browser รันเองไม่ได้ (Java, C++, SQL, ...) ด้วย AI compiler */
export const runCodeRemote = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) =>
    z
      .object({
        language: z.string().min(1),
        code: z.string().min(1),
      })
      .parse(input),
  )
  .handler(async ({ data }) => {
    const { generateObject } = await import("ai");
    const gateway = createGeminiProvider(requireGeminiKey());

    const result = await generateObject({
      model: gateway(MODEL),
      schema: z.object({ stdout: z.string(), error: z.string() }),
      system:
        "คุณคือ compiler/interpreter จำลอง ทำหน้าที่รันโค้ดที่ได้รับแล้วส่งคืน stdout เท่านั้น " +
        "ห้ามอธิบาย ห้ามใส่ markdown ถ้าโค้ดมี syntax error หรือ runtime error ให้ใส่ข้อความ error สั้น ๆ ใน error " +
        "และ stdout = '' ถ้ารันสำเร็จให้ error = ''",
      prompt: `ภาษา: ${data.language}\n\nโค้ด:\n${data.code}`,
    });

    return result.object;
  });