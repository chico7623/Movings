/**
 * Protects spoiler comments until the user explicitly reveals them.
 */
import { useState } from 'react';
interface Props {
  content: string;
}
const SpoilerContent = ({ content }: Props) => {
  const [revealed, setRevealed] = useState(false);
  if (revealed) return <p className="text-sm text-muted-foreground">{content}</p>;
  return (
    <button onClick={() => setRevealed(true)} className="w-full text-left px-3 py-2 rounded-lg bg-secondary text-sm text-muted-foreground hover:bg-muted transition-colors">
      Este conteúdo contém spoilers. Clica para revelar.
    </button>
  );
};
export default SpoilerContent;
