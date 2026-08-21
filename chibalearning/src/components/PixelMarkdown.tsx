type Block = { type: "code" | "text"; content: string };

function toBlocks(source: string): Block[] {
  const parts = source.split(/```/);
  return parts.map((part, i) =>
    i % 2 === 1
      ? { type: "code" as const, content: part.replace(/^[a-zA-Z]*\n/, "").trimEnd() }
      : { type: "text" as const, content: part },
  );
}

function inline(text: string) {
  return text.split(/(`[^`]+`|\*\*[^*]+\*\*)/g).map((chunk, i) => {
    if (chunk.startsWith("`") && chunk.endsWith("`") && chunk.length > 1) {
      return (
        <code key={i} className="bg-surface-2 text-primary px-1 py-0.5 text-[0.9em]">
          {chunk.slice(1, -1)}
        </code>
      );
    }
    if (chunk.startsWith("**") && chunk.endsWith("**") && chunk.length > 3) {
      return (
        <strong key={i} className="text-gold">
          {chunk.slice(2, -2)}
        </strong>
      );
    }
    return <span key={i}>{chunk}</span>;
  });
}

export function PixelMarkdown({ source }: { source: string }) {
  return (
    <div className="space-y-3 text-[0.95rem] leading-relaxed">
      {toBlocks(source).map((block, i) =>
        block.type === "code" ? (
          <pre
            key={i}
            className="pixel-inset terminal-text text-terminal overflow-x-auto p-3 whitespace-pre-wrap"
          >
            {block.content}
          </pre>
        ) : (
          <div key={i} className="space-y-2">
            {block.content
              .split("\n")
              .filter((line) => line.trim().length > 0)
              .map((line, j) =>
                /^\s*[-*]\s+/.test(line) ? (
                  <div key={j} className="flex gap-2">
                    <span className="text-primary">▸</span>
                    <p className="flex-1">{inline(line.replace(/^\s*[-*]\s+/, ""))}</p>
                  </div>
                ) : /^#{1,6}\s/.test(line) ? (
                  <h3 key={j} className="pixel-text text-primary pt-1 text-xs">
                    {line.replace(/^#{1,6}\s/, "")}
                  </h3>
                ) : (
                  <p key={j}>{inline(line)}</p>
                ),
              )}
          </div>
        ),
      )}
    </div>
  );
}
