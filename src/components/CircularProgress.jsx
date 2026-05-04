import './CircularProgress.css';

export default function CircularProgress({ 
  value = 0, 
  max = 100, 
  label = '', 
  subLabel = '', 
  size = 140,
  strokeWidth = 12,
  color = 'var(--primary-color)'
}) {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  
  // Cap the percentage at 100% for the visual ring
  const safeMax = max <= 0 ? 1 : max;
  const percent = Math.min(100, Math.max(0, (value / safeMax) * 100));
  const offset = circumference - (percent / 100) * circumference;

  // Change color to danger if exceeding max
  const actualColor = value > max ? 'var(--danger-color)' : color;

  return (
    <div className="circular-progress-container" style={{ width: size, height: size }}>
      <svg className="circular-progress-svg" width={size} height={size}>
        {/* Background ring */}
        <circle
          className="circular-progress-bg"
          stroke="var(--border-color)"
          strokeWidth={strokeWidth}
          fill="transparent"
          r={radius}
          cx={size / 2}
          cy={size / 2}
        />
        {/* Progress ring */}
        <circle
          className="circular-progress-value"
          stroke={actualColor}
          strokeWidth={strokeWidth}
          fill="transparent"
          r={radius}
          cx={size / 2}
          cy={size / 2}
          style={{
            strokeDasharray: circumference,
            strokeDashoffset: offset,
            transition: 'stroke-dashoffset 0.5s ease-in-out'
          }}
          strokeLinecap="round"
        />
      </svg>
      <div className="circular-progress-content">
        <div className="value" style={{ color: actualColor }}>{value}</div>
        <div className="label">{label}</div>
        <div className="sub-label">{subLabel}: {max}</div>
      </div>
    </div>
  );
}
