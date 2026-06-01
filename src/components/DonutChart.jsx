// Lightweight SVG donut chart — no chart library needed.

export default function DonutChart({ data, size = 200, thickness = 26, centerLabel = 'Completion' }) {
  const radius = (size - thickness) / 2;
  const cx = size / 2;
  const cy = size / 2;
  const circumference = 2 * Math.PI * radius;
  const total = data.reduce((s, d) => s + d.value, 0);
  const safeTotal = total || 1;

  let offset = 0;
  const slices = data.map((d) => {
    const length = (d.value / safeTotal) * circumference;
    const node = {
      key: d.label,
      color: d.color,
      length,
      offset,
    };
    offset += length;
    return node;
  });

  const completed = data.find((d) => /complete/i.test(d.label));
  const completionPct = completed && total ? Math.round((completed.value / total) * 100) : 0;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle cx={cx} cy={cy} r={radius} fill="none" stroke="#f1f5f9" strokeWidth={thickness} />
        {total === 0 ? null : (
          <g transform={`rotate(-90 ${cx} ${cy})`}>
            {slices.map((s) => (
              <circle
                key={s.key}
                cx={cx}
                cy={cy}
                r={radius}
                fill="none"
                stroke={s.color}
                strokeWidth={thickness}
                strokeDasharray={`${s.length} ${circumference}`}
                strokeDashoffset={-s.offset}
                strokeLinecap="butt"
              />
            ))}
          </g>
        )}
        <text
          x={cx}
          y={cy - 6}
          textAnchor="middle"
          fontSize="34"
          fontWeight="700"
          fill="var(--ink)"
        >
          {completionPct}%
        </text>
        <text
          x={cx}
          y={cy + 18}
          textAnchor="middle"
          fontSize="10"
          letterSpacing="2"
          fontWeight="600"
          fill="var(--muted)"
        >
          {centerLabel.toUpperCase()}
        </text>
      </svg>

      <div style={{ width: '100%' }}>
        {data.map((d) => {
          const pct = total ? Math.round((d.value / total) * 100) : 0;
          return (
            <div
              key={d.label}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                fontSize: 13,
                padding: '8px 4px',
                borderBottom: '1px solid var(--line)',
              }}
            >
              <span style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span
                  style={{
                    width: 10,
                    height: 10,
                    borderRadius: 3,
                    background: d.color,
                    display: 'inline-block',
                  }}
                />
                <span style={{ fontWeight: 500 }}>{d.label}</span>
              </span>
              <span style={{ color: 'var(--muted)' }}>
                <strong style={{ color: 'var(--ink)', marginRight: 6 }}>{d.value}</strong>
                {pct}%
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
