'use client';

import { useEffect, useRef } from 'react';

interface Interest {
  section: string;
  label: string;
  type: string;
}

interface SectionChipsProps {
  interests: Interest[];
  onRemove: (index: number) => void;
}

export function SectionChips({ interests, onRemove }: SectionChipsProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  // Group interests by section
  const grouped = interests.reduce<Record<string, { label: string; type: string; index: number }[]>>(
    (acc, interest, idx) => {
      if (!acc[interest.section]) {
        acc[interest.section] = [];
      }
      acc[interest.section].push({ label: interest.label, type: interest.type, index: idx });
      return acc;
    },
    {}
  );

  useEffect(() => {
    // Animate new chips on mount
    const animateChips = async () => {
      try {
        const { animate } = await import('animejs');
        const chips = containerRef.current?.querySelectorAll('.chip-new');
        if (chips && chips.length > 0) {
          animate(chips, {
            opacity: [0, 1],
            translateY: [10, 0],
            duration: 200,
            ease: 'outQuad',
          });
          chips.forEach((c) => c.classList.remove('chip-new'));
        }
      } catch {
        // anime.js not available, skip animation
      }
    };
    animateChips();
  }, [interests.length]);

  const handleRemove = async (index: number, element: HTMLElement) => {
    try {
      const { animate } = await import('animejs');
      const anim = animate(element, {
        opacity: [1, 0],
        scale: [1, 0.8],
        duration: 160,
        ease: 'outCubic',
      });
      await new Promise<void>((resolve) => {
        anim.onComplete = () => resolve();
        // Fallback timeout
        setTimeout(resolve, 200);
      });
    } catch {
      // Skip animation
    }
    onRemove(index);
  };

  if (Object.keys(grouped).length === 0) {
    return (
      <p className="text-tint-500 text-sm italic">
        No interests added yet. Add your first interest below.
      </p>
    );
  }

  return (
    <div ref={containerRef} className="space-y-4">
      {Object.entries(grouped).map(([section, items]) => (
        <div key={section}>
          <h4 className="text-sm font-bold text-crowe-indigo-dark mb-2 uppercase tracking-wide">
            {section}
          </h4>
          <div className="flex flex-wrap gap-2">
            {items.map((item) => (
              <span
                key={`${item.index}-${item.label}`}
                className="chip-new inline-flex items-center gap-1.5 px-3 py-1.5 bg-crowe-indigo-dark/5 text-crowe-indigo-dark text-sm rounded-full border border-crowe-indigo/10"
              >
                <span>{item.label}</span>
                <span className="text-xs text-tint-500">({item.type})</span>
                <button
                  type="button"
                  onClick={(e) => handleRemove(item.index, e.currentTarget.parentElement!)}
                  className="ml-0.5 text-tint-500 hover:text-crowe-coral transition-colors"
                  aria-label={`Remove ${item.label}`}
                >
                  &times;
                </button>
              </span>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
