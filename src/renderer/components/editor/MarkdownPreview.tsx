import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import rehypeRaw from 'rehype-raw'
import { cn } from '@renderer/lib/utils'

interface MarkdownPreviewProps {
  content: string
  className?: string
}

export function MarkdownPreview({ content, className }: MarkdownPreviewProps) {
  return (
    <div className={cn('markdown-preview h-full overflow-auto bg-background', className)}>
      <article
        className={cn(
          'mx-auto max-w-3xl px-6 py-5 text-sm leading-7 text-foreground',
          '[&_details]:my-4 [&_details]:rounded-md [&_details]:border [&_details]:border-border [&_details]:p-3',
          '[&_summary]:cursor-pointer [&_summary]:font-medium',
          '[&_sup]:text-[0.75em] [&_sub]:text-[0.75em]',
          '[&_br]:block',
          '[&_div]:my-2'
        )}
      >
        <ReactMarkdown
          remarkPlugins={[remarkGfm]}
          rehypePlugins={[rehypeRaw]}
          components={{
            h1: ({ children }) => (
              <h1 className="mb-4 mt-6 border-b border-border pb-2 text-2xl font-semibold first:mt-0">
                {children}
              </h1>
            ),
            h2: ({ children }) => (
              <h2 className="mb-3 mt-6 border-b border-border/60 pb-1.5 text-xl font-semibold first:mt-0">
                {children}
              </h2>
            ),
            h3: ({ children }) => (
              <h3 className="mb-2 mt-5 text-lg font-semibold first:mt-0">{children}</h3>
            ),
            p: ({ children }) => <p className="my-3 whitespace-pre-wrap">{children}</p>,
            ul: ({ children }) => <ul className="my-3 list-disc space-y-1 pl-6">{children}</ul>,
            ol: ({ children }) => <ol className="my-3 list-decimal space-y-1 pl-6">{children}</ol>,
            li: ({ children }) => <li className="my-0.5">{children}</li>,
            blockquote: ({ children }) => (
              <blockquote className="my-4 border-l-4 border-accent/50 bg-hover/50 py-1 pl-4 text-muted">
                {children}
              </blockquote>
            ),
            code: ({ className: codeClassName, children }) => {
              const isBlock = codeClassName?.includes('language-')
              if (isBlock) {
                return (
                  <code className="block overflow-x-auto rounded-md bg-panel p-3 font-mono text-xs leading-6 text-foreground">
                    {children}
                  </code>
                )
              }
              return (
                <code className="rounded bg-panel px-1.5 py-0.5 font-mono text-[0.9em] text-accent">
                  {children}
                </code>
              )
            },
            pre: ({ children }) => (
              <pre className="my-4 overflow-hidden rounded-md border border-border bg-panel">
                {children}
              </pre>
            ),
            a: ({ href, children }) => (
              <a
                href={href}
                className="text-accent underline underline-offset-2 hover:opacity-80"
                target="_blank"
                rel="noreferrer"
              >
                {children}
              </a>
            ),
            table: ({ children }) => (
              <div className="my-4 overflow-x-auto">
                <table className="w-full border-collapse text-left text-sm">{children}</table>
              </div>
            ),
            th: ({ children }) => (
              <th className="border border-border bg-hover px-3 py-2 font-medium">{children}</th>
            ),
            td: ({ children }) => (
              <td className="border border-border px-3 py-2 align-top">{children}</td>
            ),
            hr: () => <hr className="my-6 border-border" />,
            img: ({ src, alt }) => (
              <img src={src} alt={alt ?? ''} className="my-4 max-w-full rounded-md border border-border" />
            )
          }}
        >
          {content}
        </ReactMarkdown>
      </article>
    </div>
  )
}
