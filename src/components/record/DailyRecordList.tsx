import type { DailyRecord } from "@/domain/models/daily-record";

interface DailyRecordListProps {
  records: DailyRecord[];
}

export function DailyRecordList({ records }: DailyRecordListProps) {
  return (
    <section className="card">
      <div className="section-header">
        <h2>履歴一覧</h2>
        <p>新しい順に表示します。</p>
      </div>

      {records.length === 0 ? (
        <p className="empty-text">まだ記録がありません。</p>
      ) : (
        <ul className="history-list">
          {records.map((record) => (
            <li key={record.id} className="history-item">
              <div className="history-date">{record.date}</div>
              <div className="history-values">
                <span>体重 {record.weight.toFixed(1)}kg</span>
                <span>食事 {record.food.toFixed(0)}g</span>
                <span>トイレ {record.toilet}回</span>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
