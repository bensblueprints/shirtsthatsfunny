'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';

export default function Newsletter() {
  const [email, setEmail] = useState('');
  const [state, setState] = useState<'idle' | 'sending' | 'done' | 'error'>('idle');
  const [message, setMessage] = useState('');

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setState('sending');

    try {
      const res = await fetch('/api/newsletter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();

      if (!res.ok) {
        setState('error');
        setMessage(data.message ?? 'That did not go through. Try again.');
        return;
      }

      setState('done');
      setMessage(data.message);
    } catch {
      setState('error');
      setMessage('No connection. Try again in a moment.');
    }
  }

  return (
    <div>
      <p className="spec mb-3 opacity-55">New designs, roughly monthly</p>

      <AnimatePresence mode="wait" initial={false}>
        {state === 'done' ? (
          <motion.p
            key="done"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="font-[family-name:var(--font-display)] text-2xl uppercase leading-tight"
          >
            {message}
          </motion.p>
        ) : (
          <motion.form
            key="form"
            onSubmit={submit}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex max-w-sm items-stretch border"
          >
            <label htmlFor="newsletter-email" className="sr-only">
              Email address
            </label>
            <input
              id="newsletter-email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@email.com"
              autoComplete="email"
              className="min-w-0 flex-1 bg-transparent px-3 py-2.5 text-sm outline-none placeholder:opacity-40"
            />
            <button
              type="submit"
              disabled={state === 'sending'}
              className="spec shrink-0 border-l px-4 transition-colors hover:bg-[var(--on-surface)] hover:text-[var(--surface)] disabled:opacity-50"
            >
              {state === 'sending' ? 'Sending' : 'Sign up'}
            </button>
          </motion.form>
        )}
      </AnimatePresence>

      {state === 'error' && (
        <p role="alert" className="spec mt-2 text-[var(--color-magenta)]">
          {message}
        </p>
      )}
    </div>
  );
}
