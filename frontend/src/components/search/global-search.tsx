"use client";

import {
  FormEvent,
  KeyboardEvent,
  useEffect,
  useId,
  useRef,
  useState,
} from "react";
import { useRouter } from "next/navigation";
import { browserApiRequest } from "@/lib/api/browser-client";
import { cn } from "@/lib/cn";
import {
  searchAutocompleteResponseSchema,
  type SearchAutocompleteResult,
} from "@/lib/search/search-contracts";
import { Input } from "@/components/ui/input";

export interface GlobalSearchProps {
  variant?: "hero" | "header";
  className?: string;
  placeholder?: string;
  autoFocus?: boolean;
}

type SearchState =
  | { status: "idle" }
  | { status: "below-min" }
  | { status: "loading" }
  | { status: "success"; items: SearchAutocompleteResult[] }
  | { status: "empty" }
  | { status: "error" };

function resolveResultPath(result: SearchAutocompleteResult): string {
  const routes: Record<Exclude<SearchAutocompleteResult["entityType"], "attraction">, string> = {
    place: "/dia-diem",
    business: "/co-so",
    article: "/cam-nang",
  };

  if (result.entityType === "attraction") {
    return `/tim-kiem?q=${encodeURIComponent(result.name)}`;
  }

  return `${routes[result.entityType]}/${encodeURIComponent(result.slug)}`;
}

export function GlobalSearch({
  variant = "hero",
  className,
  placeholder = "Tìm điểm đến, dịch vụ, bài viết...",
  autoFocus = false,
}: Readonly<GlobalSearchProps>) {
  const router = useRouter();
  const baseId = useId();
  const inputId = `${baseId}-input`;
  const listboxId = `${baseId}-listbox`;
  const containerRef = useRef<HTMLDivElement>(null);

  const [query, setQuery] = useState("");
  const [isComposing, setIsComposing] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [state, setState] = useState<SearchState>({ status: "idle" });

  useEffect(() => {
    const normalized = query.trim();

    if (normalized.length === 0) {
      setState({ status: "idle" });
      setIsOpen(false);
      setActiveIndex(-1);
      return;
    }

    if (normalized.length < 2) {
      setState({ status: "below-min" });
      setIsOpen(false);
      setActiveIndex(-1);
      return;
    }

    if (isComposing) {
      return;
    }

    const controller = new AbortController();
    setState({ status: "loading" });
    setIsOpen(true);
    setActiveIndex(-1);

    const timeoutId = window.setTimeout(() => {
      browserApiRequest("/api/search", {
        method: "GET",
        query: { q: normalized, limit: 8 },
        signal: controller.signal,
        cache: "no-store",
        timeoutMs: 3000,
        schema: searchAutocompleteResponseSchema,
      })
        .then((response) => {
          if (controller.signal.aborted) return;

          if (response.data.length === 0) {
            setState({ status: "empty" });
          } else {
            setState({ status: "success", items: response.data });
          }
          setIsOpen(true);
          setActiveIndex(-1);
        })
        .catch((error) => {
          if (controller.signal.aborted) return;
          if (error instanceof DOMException && error.name === "AbortError") return;

          setState({ status: "error" });
          setIsOpen(true);
          setActiveIndex(-1);
        });
    }, 300);

    return () => {
      window.clearTimeout(timeoutId);
      controller.abort();
    };
  }, [isComposing, query]);

  // Click outside handler
  useEffect(() => {
    const handlePointerDown = (event: PointerEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
        setActiveIndex(-1);
      }
    };

    document.addEventListener("pointerdown", handlePointerDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
    };
  }, []);

  const results = state.status === "success" ? state.items : [];

  const submitSearch = (value = query) => {
    const normalized = value.trim();
    if (!normalized) return;
    setIsOpen(false);
    setActiveIndex(-1);
    router.push(`/tim-kiem?q=${encodeURIComponent(normalized)}`);
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isComposing) return;

    if (activeIndex >= 0 && results[activeIndex]) {
      const selected = results[activeIndex];
      setIsOpen(false);
      setActiveIndex(-1);
      router.push(resolveResultPath(selected));
      return;
    }

    submitSearch();
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (isComposing) return;

    if (event.key === "ArrowDown") {
      if (results.length > 0) {
        event.preventDefault();
        setIsOpen(true);
        setActiveIndex((prev) => (prev + 1) % results.length);
      }
    } else if (event.key === "ArrowUp") {
      if (results.length > 0) {
        event.preventDefault();
        setIsOpen(true);
        setActiveIndex((prev) => (prev <= 0 ? results.length - 1 : prev - 1));
      }
    } else if (event.key === "Escape") {
      setIsOpen(false);
      setActiveIndex(-1);
    } else if (event.key === "Tab") {
      setIsOpen(false);
      setActiveIndex(-1);
    }
  };

  const isHero = variant === "hero";
  const activeOptionId =
    activeIndex >= 0 ? `${baseId}-option-${activeIndex}` : undefined;

  let liveMessage = "";
  if (state.status === "loading") {
    liveMessage = "Đang tìm kiếm...";
  } else if (state.status === "success") {
    liveMessage = `Tìm thấy ${state.items.length} gợi ý`;
  } else if (state.status === "empty") {
    liveMessage = "Không có gợi ý phù hợp";
  } else if (state.status === "error") {
    liveMessage = "Không thể tải gợi ý lúc này";
  }

  return (
    <div ref={containerRef} className={cn("relative w-full", className)}>
      <form role="search" onSubmit={handleSubmit}>
        <label htmlFor={inputId} className="sr-only">
          Tìm điểm đến, dịch vụ hoặc bài viết
        </label>
        <div
          className={cn(
            "flex gap-2 rounded-lg p-2 transition-shadow focus-within:ring-2 focus-within:ring-ring",
            isHero
              ? "bg-surface shadow-elevated border border-border"
              : "bg-surface border border-border shadow-soft"
          )}
        >
          <Input
            id={inputId}
            value={query}
            autoFocus={autoFocus}
            onChange={(e) => setQuery(e.target.value)}
            onCompositionStart={() => setIsComposing(true)}
            onCompositionEnd={() => setIsComposing(false)}
            onKeyDown={handleKeyDown}
            onFocus={() => {
              if (query.trim().length >= 2) setIsOpen(true);
            }}
            placeholder={placeholder}
            autoComplete="off"
            role="combobox"
            aria-autocomplete="list"
            aria-controls={isOpen ? listboxId : undefined}
            aria-expanded={isOpen}
            aria-activedescendant={activeOptionId}
            className="border-0 bg-transparent shadow-none focus-visible:ring-0 focus-visible:ring-offset-0"
          />
          <button
            type="submit"
            className="inline-flex min-h-11 shrink-0 items-center justify-center rounded-md bg-primary px-5 text-body-small font-semibold text-primary-foreground transition-colors hover:bg-primary-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            Tìm kiếm
          </button>
        </div>
      </form>

      {/* Screen Reader Live Region */}
      <div aria-live="polite" className="sr-only">
        {liveMessage}
      </div>

      {/* Dropdown Menu */}
      {isOpen && (
        <div
          id={listboxId}
          role="listbox"
          className="absolute left-0 right-0 top-full z-[var(--z-popover,30)] mt-2 max-h-80 overflow-y-auto rounded-lg border border-border bg-surface shadow-elevated"
        >
          {state.status === "loading" && (
            <div className="p-4 text-body-small text-muted-foreground">
              Đang tìm kiếm gợi ý...
            </div>
          )}

          {state.status === "error" && (
            <div className="p-4 text-body-small text-destructive">
              Không thể tải gợi ý lúc này. Bạn vẫn có thể tìm kiếm.
            </div>
          )}

          {state.status === "empty" && (
            <div className="p-4 text-body-small text-muted-foreground">
              Không tìm thấy gợi ý phù hợp. Bạn vẫn có thể tìm kiếm đầy đủ.
            </div>
          )}

          {state.status === "success" &&
            state.items.map((item, index) => {
              const optionId = `${baseId}-option-${index}`;
              const isSelected = activeIndex === index;
              return (
                <button
                  key={`${item.entityType}-${item.id}`}
                  id={optionId}
                  type="button"
                  role="option"
                  aria-selected={isSelected}
                  className={cn(
                    "flex w-full min-h-12 items-center justify-between px-4 py-3 text-left transition-colors hover:bg-muted focus-visible:bg-muted focus-visible:outline-none",
                    isSelected && "bg-muted text-primary"
                  )}
                  onPointerDown={(e) => e.preventDefault()}
                  onClick={() => {
                    setIsOpen(false);
                    setActiveIndex(-1);
                    router.push(resolveResultPath(item));
                  }}
                >
                  <div className="flex flex-col">
                    <span className="text-body font-medium text-foreground">
                      {item.name}
                    </span>
                    {item.region?.name && (
                      <span className="text-caption text-muted-foreground">
                        {item.region.name}
                      </span>
                    )}
                  </div>
                  <span className="text-caption font-semibold uppercase text-muted-foreground">
                    {item.entityType === "place"
                      ? "Địa điểm"
                      : item.entityType === "business"
                      ? "Cơ sở"
                      : item.entityType === "article"
                      ? "Cẩm nang"
                      : "Điểm đến"}
                  </span>
                </button>
              );
            })}
        </div>
      )}
    </div>
  );
}
