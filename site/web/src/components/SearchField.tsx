'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';

export default function SearchField() {
  const router = useRouter();
  const params = useSearchParams();
  const [value, setValue] = useState(params.get('q') ?? '');
  const input = useRef<HTMLInputElement>(null);

  useEffect(() => {
    input.current?.focus();
  }, []);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    router.push(value.trim() ? `/search?q=${encodeURIComponent(value.trim())}` : '/search');
  }

  return (
    <form onSubmit={submit} className="mt-8 flex max-w-xl items-stretch border-b-2">
      <label htmlFor="q" className="sr-only">
        Search shirts
      </label>
      <input
        ref={input}
        id="q"
        name="q"
        type="search"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="Type a word"
        className="min-w-0 flex-1 bg-transparent py-3 text-2xl outline-none placeholder:opacity-30"
      />
      <button type="submit" className="spec px-4 transition-opacity hover:opacity-55">
        Search
      </button>
    </form>
  );
}
