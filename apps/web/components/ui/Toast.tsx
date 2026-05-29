'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { useLobby } from '@/lib/store';
import { useEffect } from 'react';
import { cn } from '@/lib/utils';

export function ToastViewport() {
  const toast = useLobby((s) => s.toast);
  const setToast = useLobby((s) => s.setToast);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 4000);
    return () => clearTimeout(t);
  }, [toast, setToast]);

  return (
    <div className="pointer-events-none fixed inset-x-0 top-4 z-50 flex justify-center px-4" aria-live="polite">
      <AnimatePresence>
        {toast && (
          <motion.div
            key={toast.id}
            initial={{ opacity: 0, y: -16, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.98 }}
            className={cn(
              'pointer-events-auto max-w-sm rounded-xl border px-4 py-3 text-sm shadow-lg backdrop-blur',
              toast.kind === 'error' && 'border-[color:var(--color-danger-500)]/40 bg-[color:var(--color-danger-500)]/15 text-rose-100',
              toast.kind === 'info' && 'border-white/15 bg-white/[0.05] text-white',
              toast.kind === 'success' && 'border-[color:var(--color-success-500)]/40 bg-[color:var(--color-success-500)]/15 text-emerald-100',
            )}
          >
            {toast.text}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
