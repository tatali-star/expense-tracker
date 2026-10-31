"use client";

type Props<T extends string> = {
  options: { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
  className?: string;
  /** Мелкий шрифт на телефоне — когда вариантов много. */
  compact?: boolean;
};

export default function Segmented<T extends string>({ options, value, onChange, className = "", compact = false }: Props<T>) {
  const index = Math.max(0, options.findIndex((o) => o.value === value));
  return (
    <div className={`relative grid rounded-xl bg-zinc-100 p-1 ${className}`} style={{ gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))` }}>
      <span
        aria-hidden
        className="absolute inset-y-1 left-1 rounded-lg bg-white shadow-sm transition-transform duration-300 ease-out"
        style={{
          width: `calc((100% - 0.5rem) / ${options.length})`,
          transform: `translateX(${index * 100}%)`,
        }}
      />
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          onClick={() => onChange(o.value)}
          aria-pressed={o.value === value}
          className={`relative z-10 truncate rounded-lg py-1.5 sm:px-3 ${compact ? "px-1 text-xs sm:text-sm" : "px-1.5 text-sm"} font-medium transition-colors ${
            o.value === value ? "text-zinc-900" : "text-zinc-500 hover:text-zinc-700"
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
