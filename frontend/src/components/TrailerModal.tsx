/**
 * Video modal responsible for showing trailers safely.
 */
import { PlayCircle } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

interface TrailerModalProps {
  title: string;
  embedUrl: string | null;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

const TrailerModal = ({ title, embedUrl, isOpen, onOpenChange }: TrailerModalProps) => {
  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl border-border bg-card p-0 shadow-2xl">
        <DialogHeader className="border-b border-border px-5 py-4">
          <DialogTitle className="flex items-center gap-2 text-left font-display text-xl">
            <PlayCircle className="h-5 w-5 text-primary" />
            {title} — Trailer
          </DialogTitle>
        </DialogHeader>

        <div className="p-4">
          {embedUrl ? (
            <div className="aspect-video overflow-hidden rounded-xl border border-border bg-black shadow-inner">
              <iframe
                key={embedUrl}
                src={embedUrl}
                title={`${title} — trailer`}
                className="h-full w-full"
                loading="lazy"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                referrerPolicy="strict-origin-when-cross-origin"
                allowFullScreen
              />
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-border p-8 text-center text-muted-foreground">
              Este título ainda não tem trailer configurado.
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default TrailerModal;
