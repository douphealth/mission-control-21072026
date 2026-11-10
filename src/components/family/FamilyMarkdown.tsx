import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

/** Renders an encrypted family note as formatted Markdown. Raw HTML is never rendered. */
export default function FamilyMarkdown({ text }: { text: string }) {
  return (
    <div className="family-md min-w-0 break-words text-sm leading-relaxed">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          a: ({ node: _n, ...props }) => <a {...props} target="_blank" rel="noopener noreferrer" className="text-primary underline underline-offset-2" />,
          table: ({ node: _n, ...props }) => <div className="my-2 overflow-x-auto"><table {...props} className="w-full border-collapse text-left text-sm" /></div>,
        }}
      >
        {text}
      </ReactMarkdown>
    </div>
  );
}
