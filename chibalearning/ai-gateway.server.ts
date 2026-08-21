import { createOpenAICompatible } from "@ai-sdk/openai-compatible";

/** Lovable AI Gateway provider. Server-only. Kept for rollback / reference. */
export function createLovableAiGatewayProvider(apiKey: string) {
  return createOpenAICompatible({
    name: "lovable-ai-gateway",
    baseURL: "https://ai.gateway.lovable.dev/v1",
    supportsStructuredOutputs: true,
    headers: {
      "Lovable-API-Key": apiKey,
      "X-Lovable-AIG-SDK": "vercel-ai-sdk",
    },
  });
}

export function requireGatewayKey() {
  const key = process.env["LOVABLE_API_KEY"];
  if (!key) throw new Error("Missing LOVABLE_API_KEY");
  return key;
}

/**
 * Google Gemini, called directly via its OpenAI-compatible endpoint.
 * Docs: https://ai.google.dev/gemini-api/docs/openai
 * Server-only — never import this from client code.
 */
export function createGeminiProvider(apiKey: string) {
  return createOpenAICompatible({
    name: "gemini",
    baseURL: "https://generativelanguage.googleapis.com/v1beta/openai",
    supportsStructuredOutputs: true,
    apiKey,
  });
}

export function requireGeminiKey() {
  const key = process.env["GEMINI_API_KEY"];
  if (!key) throw new Error("Missing GEMINI_API_KEY");
  return key;
}

export const TUTOR_STYLE =
  "ตอบเป็นภาษาไทยที่เป็นกันเองและกระชับ ใช้ศัพท์เทคนิคเป็นภาษาอังกฤษ (เช่น variable, function, loop) ห้ามแปลศัพท์เทคนิค " +
  "โฟกัสเฉพาะสิ่งที่จำเป็นต่อเป้าหมายอาชีพของผู้เรียน ไม่พาออกนอกเส้นทาง";