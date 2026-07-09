/**
 * Reusable star-rating control used by rating flows.
 */
import React, { useState } from 'react';
import { Star } from 'lucide-react';
import { cn } from '@/lib/utils';

interface StarRatingProps {
  rating: number;
  onRatingChange: (rating: number) => void;
  max?: number;
  readonly?: boolean;
  precision?: 0.5 | 1;
}

const clampRating = (value: number, max: number) => {
  const safeValue = Number.isFinite(value) ? value : 0;
  return Math.min(max, Math.max(0, safeValue));
};

const StarRating: React.FC<StarRatingProps> = ({
  rating,
  onRatingChange,
  max = 5,
  readonly = false,
  precision = 0.5,
}) => {
  const [hover, setHover] = useState(0);
  const displayRating = clampRating(hover || rating, max);

  const getPointerRating = (event: React.PointerEvent<HTMLButtonElement>, starValue: number) => {
    if (precision === 1) return starValue;

    const rect = event.currentTarget.getBoundingClientRect();
    const pointerX = event.clientX - rect.left;
    const selectedValue = pointerX <= rect.width / 2 ? starValue - 0.5 : starValue;

    return clampRating(selectedValue, max);
  };

  const handlePointerMove = (event: React.PointerEvent<HTMLButtonElement>, starValue: number) => {
    if (readonly) return;
    setHover(getPointerRating(event, starValue));
  };

  const handlePointerDown = (event: React.PointerEvent<HTMLButtonElement>, starValue: number) => {
    if (readonly) return;
    onRatingChange(getPointerRating(event, starValue));
  };

  return (
    <div
      className="flex items-center gap-1"
      onPointerLeave={() => !readonly && setHover(0)}
      role={readonly ? 'img' : 'radiogroup'}
      aria-label={readonly ? `Avaliação ${rating.toFixed(1)} de ${max}` : 'Escolher avaliação'}
    >
      {Array.from({ length: max }).map((_, i) => {
        const starValue = i + 1;
        const isFull = displayRating >= starValue;
        const isHalf = !isFull && displayRating >= starValue - 0.5;

        return (
          <button
            key={starValue}
            type="button"
            disabled={readonly}
            className={cn(
              'relative p-0.5 transition-transform duration-200 hover:scale-110 disabled:scale-100 disabled:cursor-default',
              !readonly && 'cursor-pointer',
              (isFull || isHalf) && !readonly && 'motion-save-feedback rounded-full'
            )}
            onPointerMove={(event) => handlePointerMove(event, starValue)}
            onPointerDown={(event) => handlePointerDown(event, starValue)}
            onClick={(event) => event.preventDefault()}
            aria-label={`Avaliar com ${starValue - 0.5} ou ${starValue} estrelas`}
            aria-checked={rating === starValue || rating === starValue - 0.5}
            role={readonly ? undefined : 'radio'}
          >
            <Star
              className={cn(
                'h-8 w-8 text-muted-foreground/30 transition-colors',
                isFull && 'text-yellow-400 fill-yellow-400'
              )}
            />
            {isHalf && (
              <div className="pointer-events-none absolute inset-0 w-1/2 overflow-hidden p-0.5">
                <Star className="h-8 w-8 text-yellow-400 fill-yellow-400" />
              </div>
            )}
          </button>
        );
      })}
      <span className="ml-2 min-w-[2.5rem] text-center text-lg font-bold">
        {displayRating > 0 ? displayRating.toFixed(1) : '—'}
      </span>
    </div>
  );
};

export default StarRating;
