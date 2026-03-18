import type { AnomalyResult } from "@/services/anomaly-service";

interface AnomalySummaryProps {
  result: AnomalyResult;
  targetDate: string;
}

export function AnomalySummary({ result, targetDate }: AnomalySummaryProps) {
  return (
    <section className={`card anomaly anomaly-${result.level}`}>
      <div className="section-header">
        <h2>異常判定</h2>
        <p>{targetDate} の記録と過去3日平均を比較しています。</p>
      </div>

      <div className="anomaly-badge">判定: {result.level}</div>
      <p className="anomaly-message">{result.message}</p>

      <dl className="average-grid">
        <div>
          <dt>体重平均</dt>
          <dd>
            {result.averages.weight !== null
              ? `${result.averages.weight.toFixed(2)} kg`
              : "-"}
          </dd>
        </div>
        <div>
          <dt>食事平均</dt>
          <dd>
            {result.averages.food !== null
              ? `${result.averages.food.toFixed(1)} g`
              : "-"}
          </dd>
        </div>
        <div>
          <dt>トイレ平均</dt>
          <dd>
            {result.averages.toilet !== null
              ? `${result.averages.toilet.toFixed(1)} 回`
              : "-"}
          </dd>
        </div>
      </dl>
    </section>
  );
}
