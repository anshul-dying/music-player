'use client';

import { useState, useEffect, useRef, useCallback, useTransition } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';

export interface UseSearchNavigationOptions {
  debounceMs?: number;
}

export interface UseSearchNavigationReturn {
  searchQuery: string;
  handleSearchChange: (val: string) => void;
  handleClearSearch: () => void;
  handleSearchSubmit: () => void;
}

/**
 * Builds the target search URL while preserving query whitespace and any active track parameter.
 */
export function buildSearchUrl(pathname: string, query: string, currentV: string | null): string | null {
  if (!query.trim()) {
    return pathname === '/search' ? '/' : null;
  }
  const params = new URLSearchParams();
  params.set('q', query);
  if (currentV) {
    params.set('v', currentV);
  }
  return `/search?${params.toString()}`;
}

/**
 * Determines whether incoming URL search params should sync to local input state.
 * Decouples active typing and our own pushed URL echoes from clobbering local input.
 */
export function shouldSyncUrlQueryToLocalState({
  isTyping,
  urlQuery,
  lastPushedQuery,
  localQuery,
}: {
  isTyping: boolean;
  urlQuery: string | null;
  lastPushedQuery: string | null;
  localQuery: string;
}): boolean {
  if (isTyping) return false;
  if (urlQuery === null) return false;
  if (urlQuery === lastPushedQuery) return false;
  return urlQuery !== localQuery;
}

export function useSearchNavigation(options: UseSearchNavigationOptions = {}): UseSearchNavigationReturn {
  const { debounceMs = 300 } = options;
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();

  const initialQuery = searchParams.get('q') || '';
  const [searchQuery, setSearchQuery] = useState(initialQuery);

  const lastPushedQueryRef = useRef<string | null>(initialQuery || null);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isTypingRef = useRef(false);
  const searchQueryRef = useRef(searchQuery);
  searchQueryRef.current = searchQuery;

  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  const performNavigation = useCallback(
    (query: string) => {
      const targetUrl = buildSearchUrl(pathname, query, searchParams.get('v'));
      if (targetUrl === null) return;

      if (!query.trim()) {
        lastPushedQueryRef.current = '';
        startTransition(() => {
          router.push('/');
        });
        return;
      }

      if (lastPushedQueryRef.current === query && searchParams.get('q') === query) {
        return;
      }

      lastPushedQueryRef.current = query;
      startTransition(() => {
        router.push(targetUrl);
      });
    },
    [pathname, router, searchParams]
  );

  const handleSearchChange = useCallback(
    (val: string) => {
      setSearchQuery(val);
      isTypingRef.current = true;

      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }

      if (val === '') {
        debounceTimerRef.current = setTimeout(() => {
          isTypingRef.current = false;
          if (pathname === '/search') {
            lastPushedQueryRef.current = '';
            startTransition(() => {
              router.push('/');
            });
          }
        }, debounceMs);
        return;
      }

      debounceTimerRef.current = setTimeout(() => {
        isTypingRef.current = false;
        performNavigation(val);
      }, debounceMs);
    },
    [debounceMs, pathname, performNavigation, router]
  );

  const handleClearSearch = useCallback(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    isTypingRef.current = false;
    lastPushedQueryRef.current = '';
    setSearchQuery('');
    if (pathname === '/search') {
      startTransition(() => {
        router.push('/');
      });
    }
  }, [pathname, router]);

  const handleSearchSubmit = useCallback(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    isTypingRef.current = false;
    performNavigation(searchQueryRef.current);
  }, [performNavigation]);

  useEffect(() => {
    const urlQ = searchParams.get('q');

    const shouldSync = shouldSyncUrlQueryToLocalState({
      isTyping: isTypingRef.current,
      urlQuery: urlQ,
      lastPushedQuery: lastPushedQueryRef.current,
      localQuery: searchQueryRef.current,
    });

    if (shouldSync && urlQ !== null) {
      lastPushedQueryRef.current = urlQ;
      setSearchQuery(urlQ);
    } else if (urlQ === null && pathname !== '/search' && lastPushedQueryRef.current && !isTypingRef.current) {
      lastPushedQueryRef.current = null;
      setSearchQuery('');
    }
  }, [searchParams, pathname]);

  return {
    searchQuery,
    handleSearchChange,
    handleClearSearch,
    handleSearchSubmit,
  };
}
