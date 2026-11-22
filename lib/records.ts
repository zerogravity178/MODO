import { parseRecordData, type RecordRow } from "@/lib/types";

export type RecordWithData = {
  record: RecordRow;
  data: Record<string, unknown>;
};

/** Разворачивает jsonb-поле data у записей в обычный объект значений. */
export function withData(records: RecordRow[]): RecordWithData[] {
  return records.map((record) => ({
    record,
    data: parseRecordData(record.data),
  }));
}
