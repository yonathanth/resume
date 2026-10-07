"use client";

import { useEffect, useState } from "react";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { searchOccupations } from "@/lib/api";

const DEBOUNCE_MS = 200;

/** Catalog suggestions for what the user is typing, debounced; results for each query are cached. */
export function useOccupationSearch(query: string, enabled = true) {
  const [debounced, setDebounced] = useState(query.trim());

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(query.trim()), DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [query]);

  return useQuery({
    queryKey: ["occupations", debounced],
    queryFn: () => searchOccupations(debounced),
    enabled,
    staleTime: 10 * 60 * 1000,
    placeholderData: keepPreviousData,
  });
}
