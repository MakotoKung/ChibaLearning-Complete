export const LANGUAGES: Record<
  string,
  { label: string; file: string; comment: string; native: "js" | "python" | "ai" }
> = {
  javascript: { label: "JavaScript", file: "main.js", comment: "//", native: "js" },
  typescript: { label: "TypeScript", file: "main.ts", comment: "//", native: "ai" },
  python: { label: "Python", file: "main.py", comment: "#", native: "python" },
  java: { label: "Java", file: "Main.java", comment: "//", native: "ai" },
  cpp: { label: "C++", file: "main.cpp", comment: "//", native: "ai" },
  csharp: { label: "C#", file: "Program.cs", comment: "//", native: "ai" },
  go: { label: "Go", file: "main.go", comment: "//", native: "ai" },
  sql: { label: "SQL", file: "query.sql", comment: "--", native: "ai" },
  html: { label: "HTML", file: "index.html", comment: "<!--", native: "ai" },
  none: { label: "Scratchpad", file: "notes.txt", comment: "//", native: "js" },
};

export function langMeta(language: string | undefined) {
  return LANGUAGES[language ?? "javascript"] ?? LANGUAGES["javascript"]!;
}

function stringify(value: unknown) {
  if (typeof value === "string") return value;
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

export function runJs(code: string): string[] {
  const logs: string[] = [];
  const push = (...args: unknown[]) => logs.push(args.map(stringify).join(" "));
  try {
    const fn = new Function("console", `"use strict";\n${code}`) as (c: {
      log: typeof push;
      error: typeof push;
      warn: typeof push;
    }) => void;
    fn({ log: push, error: push, warn: push });
    if (logs.length === 0) logs.push("(รันสำเร็จ แต่ไม่มี output — ลองใช้ console.log)");
  } catch (err) {
    logs.push(`✖ ${err instanceof Error ? `${err.name}: ${err.message}` : String(err)}`);
  }
  return logs;
}

type Pyodide = {
  runPythonAsync: (code: string) => Promise<unknown>;
  setStdout: (opts: { batched: (s: string) => void }) => void;
  setStderr: (opts: { batched: (s: string) => void }) => void;
};

let pyodidePromise: Promise<Pyodide> | null = null;

/** โหลด Pyodide (CPython ที่คอมไพล์เป็น WASM) แบบ lazy ในเบราว์เซอร์ */
async function loadPyodide(): Promise<Pyodide> {
  if (!pyodidePromise) {
    pyodidePromise = (async () => {
      const w = window as unknown as {
        loadPyodide?: (opts: { indexURL: string }) => Promise<Pyodide>;
      };
      if (!w.loadPyodide) {
        await new Promise<void>((resolve, reject) => {
          const script = document.createElement("script");
          script.src = "https://cdn.jsdelivr.net/pyodide/v0.26.4/full/pyodide.js";
          script.onload = () => resolve();
          script.onerror = () => reject(new Error("โหลด Python runtime ไม่สำเร็จ"));
          document.head.appendChild(script);
        });
      }
      return w.loadPyodide!({ indexURL: "https://cdn.jsdelivr.net/pyodide/v0.26.4/full/" });
    })();
  }
  return pyodidePromise;
}

export async function runPython(code: string): Promise<string[]> {
  const logs: string[] = [];
  try {
    const py = await loadPyodide();
    py.setStdout({ batched: (s) => logs.push(s) });
    py.setStderr({ batched: (s) => logs.push(s) });
    await py.runPythonAsync(code);
    if (logs.length === 0) logs.push("(รันสำเร็จ แต่ไม่มี output — ลองใช้ print())");
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    logs.push(`✖ ${message.split("\n").slice(-6).join("\n")}`);
  }
  return logs;
}
