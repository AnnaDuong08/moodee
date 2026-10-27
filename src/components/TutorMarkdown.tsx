import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { ScrollArea } from './ScrollArea';
import styles from './TutorMarkdown.module.css';

export function TutorMarkdown({ text }: { text: string }) {
  return (
    <div className={styles.markdown}>
      <Markdown
        remarkPlugins={[remarkGfm]}
        skipHtml
        components={{
          a: ({ href, children }) => href
            ? <a href={href} target="_blank" rel="noopener noreferrer">{children}</a>
            : <span>{children}</span>,
          img: ({ alt }) => <span className={styles.imageLabel}>{alt || 'Image'}</span>,
          pre: ({ children }) => <ScrollArea axis="horizontal" className={styles.codeBlock} aria-label="Code block"><pre>{children}</pre></ScrollArea>,
          table: ({ children }) => <ScrollArea axis="horizontal" className={styles.table} aria-label="Table"><table>{children}</table></ScrollArea>,
        }}
      >{text}</Markdown>
    </div>
  );
}
