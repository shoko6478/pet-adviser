import type { DailyRecord } from "@/domain/models/daily-record";

interface DailyRecordListProps {
  records: DailyRecord[];
}

function renderMetric(label: string, value: number | null, unit: string, digits: number) {
  if (value === null) {
    return null;
  }

  return (
    <span>
      {label} {value.toFixed(digits)}
      {unit}
    </span>
  );
}

export function DailyRecordList({ records }: DailyRecordListProps) {
  return (
    <section className="card">
      <div className="section-header">
        <h2>履歴一覧</h2>
        <p>選択中ペットの記録を新しい順に表示します。</p>
      </div>

      {records.length === 0 ? (
        <p className="empty-text">まだ記録がありません。</p>
      ) : (
        <ul className="history-list">
          {records.map((record) => {
            const metrics = [
              renderMetric("体重", record.weight, "kg", 1),
              renderMetric("食事", record.food, "g", 0),
              renderMetric("トイレ", record.toilet, "回", 0),
            ].filter(Boolean);

            return (
              <li key={record.id} className="history-item">
                <div className="history-date">{record.date}</div>
                <div className="history-values">
                  {metrics.length > 0 ? metrics : <span>追加観察項目のみ記録</span>}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
