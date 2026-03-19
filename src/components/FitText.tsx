import { useEffect, useRef } from 'react';
import fitty from 'fitty';

const MIN_SIZE = 14;
const MAX_SIZE = 72;

export function FitText({ children }: { children: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    if (!ref.current) return;
    const instance = fitty(ref.current, { minSize: MIN_SIZE, maxSize: MAX_SIZE });
    const handleResize = () => instance.fit();
    window.addEventListener('resize', handleResize);
    return () => {
      instance.unsubscribe();
      window.removeEventListener('resize', handleResize);
    };
  }, [children]);
  return (
    <span
      ref={ref}
      className="font-mincho block pb-[0.2em] [font-feature-settings:'palt'] leading-none font-bold whitespace-nowrap text-zinc-900"
    >
      {children}
    </span>
  );
}
