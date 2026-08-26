import { useEffect, useState } from "react";
import { client } from "../app/runtime";

export type PickedEntity = {
  id: number;
  slug: string;
  name: string;
  name_cn?: string | null;
  type: string;
  enabled?: number;
};

export function EntityPicker({
  excludeId,
  placeholder = "搜索实体名称 / slug",
  onSelect,
}: {
  excludeId?: number;
  placeholder?: string;
  onSelect: (entity: PickedEntity) => void;
}) {
  const [q, setQ] = useState("");
  const [items, setItems] = useState<PickedEntity[]>([]);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!q.trim()) {
      setItems([]);
      return;
    }
    const timer = window.setTimeout(async () => {
      if (!client.entity?.search) return;
      const { data } = await client.entity.search(q.trim());
      const list = (data || []).filter((x: PickedEntity) => x.id !== excludeId);
      setItems(list);
      setOpen(true);
    }, 200);
    return () => window.clearTimeout(timer);
  }, [q, excludeId]);

  return (
    <div className="relative">
      <input
        className="w-full rounded-lg border border-neutral-200 bg-transparent px-3 py-2 dark:border-neutral-700"
        value={q}
        placeholder={placeholder}
        onChange={(e) => setQ(e.target.value)}
        onFocus={() => items.length && setOpen(true)}
      />
      {open && items.length > 0 && (
        <div className="absolute z-20 mt-1 max-h-64 w-full overflow-auto rounded-lg border border-neutral-200 bg-white shadow-lg dark:border-neutral-700 dark:bg-neutral-900">
          {items.map((item) => (
            <button
              key={item.id}
              type="button"
              className="flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-neutral-100 dark:hover:bg-neutral-800"
              onClick={() => {
                onSelect(item);
                setQ("");
                setItems([]);
                setOpen(false);
              }}
            >
              <span>{item.name_cn || item.name}</span>
              <span className="text-xs text-neutral-400">{item.slug}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}