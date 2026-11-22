import { formatFieldValue, type FieldDef } from "@/lib/types";
import { cn } from "@/lib/utils";

type RecordCardProps = {
  fields: FieldDef[];
  data: Record<string, unknown>;
  className?: string;
};

export function RecordCard({ fields, data, className }: RecordCardProps) {
  const preview = fields.slice(0, 3);

  return (
    <div
      className={cn(
        "space-y-3 rounded-xl border border-neutral-200 bg-white p-4 transition hover:border-[#f97316]/50 hover:shadow-sm",
        className
      )}
    >
      {preview.length === 0 ? (
        <p className="text-sm text-neutral-500">У модуля нет полей</p>
      ) : (
        preview.map((field) => {
          const raw = data[field.id];
          const isImage =
            field.type === "image" && typeof raw === "string" && raw.length > 0;

          return (
            <div key={field.id} className="space-y-1">
              <p className="text-xs uppercase tracking-wide text-neutral-400">
                {field.label}
              </p>

              {isImage ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={raw as string}
                  alt={field.label}
                  className="h-24 w-full rounded-md border border-neutral-200 object-cover"
                />
              ) : (
                <p className="truncate text-sm font-medium text-neutral-900">
                  {formatFieldValue(raw)}
                </p>
              )}
            </div>
          );
        })
      )}
    </div>
  );
}

export default RecordCard;
