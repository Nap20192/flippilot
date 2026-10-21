import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export type Option<T extends string = string> = { value: T; label: string };

/** shadcn Select with a flat options list. */
export function SimpleSelect<T extends string>({ value, onValueChange, options, id, className, label, disabled }: {
  value: T; onValueChange: (v: T) => void; options: readonly Option<T>[]; id?: string; className?: string; label?: string; disabled?: boolean;
}) {
  return (
    <Select value={value} onValueChange={(v) => { if (v != null) onValueChange(v as T); }} items={options as unknown as Option[]} disabled={disabled}>
      <SelectTrigger id={id} className={className} aria-label={label}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {options.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
      </SelectContent>
    </Select>
  );
}
