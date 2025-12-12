import { useMemo, memo, useCallback, useRef } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceDot,
} from 'recharts';
import { Eye, EyeOff } from 'lucide-react';
import { MONTHS, CHART_COLORS } from '../../utils/constants';
import { formatNumber } from '../../utils/formatters';

// Memoized tooltip
const CustomTooltip = memo(function CustomTooltip({ active, payload, label }) {
  if (!active || !payload || !payload.length) return null;

  return (
    <div className="glass-strong rounded-lg p-3 shadow-lg border border-surface-200/50">
      <p className="font-semibold text-daikin-dark mb-2">{label}</p>
      <div className="space-y-1">
        {payload.map((entry, index) => (
          <div key={index} className="flex items-center gap-2 text-sm">
            <div
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: entry.color }}
            />
            <span className="text-surface-600">{entry.name}:</span>
            <span className="font-medium text-daikin-dark">
              {formatNumber(entry.value, 2)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
});

// Memoized toggle button
const LineToggle = memo(function LineToggle({ 
  label, 
  color, 
  isActive, 
  onChange, 
  disabled = false,
  dashed = false,
}) {
  return (
    <button
      type="button"
      onClick={() => !disabled && onChange(!isActive)}
      disabled={disabled}
      className={`
        flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium
        transition-all duration-200 ease-out
        ${disabled ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer hover:scale-105'}
        ${isActive ? 'bg-white shadow-md border border-surface-200' : 'bg-surface-100/50 border border-transparent'}
      `}
    >
      <div className="relative flex items-center w-5">
        {dashed ? (
          <div className="flex gap-0.5">
            <div className="w-1.5 h-0.5 rounded-full" style={{ backgroundColor: isActive ? color : '#9CA3AF' }} />
            <div className="w-1.5 h-0.5 rounded-full" style={{ backgroundColor: isActive ? color : '#9CA3AF' }} />
          </div>
        ) : (
          <div className="w-5 h-0.5 rounded-full" style={{ backgroundColor: isActive ? color : '#9CA3AF' }} />
        )}
        <div 
          className="absolute left-1/2 -translate-x-1/2 w-2 h-2 rounded-full border-2"
          style={{ borderColor: isActive ? color : '#9CA3AF', backgroundColor: isActive ? color : 'transparent' }}
        />
      </div>
      <span className={isActive ? 'text-daikin-dark' : 'text-surface-400'}>{label}</span>
      {isActive ? <Eye className="w-3 h-3 text-surface-400" /> : <EyeOff className="w-3 h-3 text-surface-300" />}
    </button>
  );
});

// Memoized warning badge
const WarningBadge = memo(function WarningBadge({ month }) {
  return (
    <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-50 border border-amber-200 text-amber-700 text-xs font-medium">
      <span className="w-2 h-2 rounded-full bg-amber-400" />
      {month}: Review Recommended
    </div>
  );
});

// Calculate fixed Y-axis domain based on baseline data only
function calculateFixedDomain(baseline, delivered, actuals) {
  const allValues = [
    ...(baseline || []),
    ...(delivered || []),
    ...(actuals || []),
  ].filter(v => v != null && !isNaN(v));

  if (allValues.length === 0) return [0, 100];

  const min = Math.min(...allValues);
  const max = Math.max(...allValues);
  
  // Create wide bounds that won't need to change during simulation
  const range = max - min;
  const padding = range * 0.5; // 50% padding for simulation headroom
  
  return [
    Math.max(0, Math.floor((min - padding) / 10) * 10),
    Math.ceil((max + padding) / 10) * 10
  ];
}

// Main chart - NOT memoized to ensure updates, but with stable internals
function ForecastChart({
  baseline,
  simulated,
  delivered,
  actuals,
  exceededMonths = [],
  product,
  apsClass,
  year,
  showBaseline,
  showDelivered,
  showActuals,
  onToggleBaseline,
  onToggleDelivered,
  onToggleActuals,
}) {
  // Refs for stable values
  const fixedDomainRef = useRef(null);
  const lastKeyRef = useRef(null);

  // Create stable key for product/year/aps combination
  const dataKey = `${product}-${apsClass}-${year}`;

  // Check data availability
  const hasDelivered = delivered?.some(v => v != null && !isNaN(v)) ?? false;
  const hasActuals = actuals?.some(v => v != null && !isNaN(v)) ?? false;
  const hasBaseline = baseline?.some(v => v != null && !isNaN(v)) ?? false;

  // Calculate fixed Y-axis domain ONCE per product/year combination
  if (dataKey !== lastKeyRef.current) {
    lastKeyRef.current = dataKey;
    fixedDomainRef.current = calculateFixedDomain(baseline, delivered, actuals);
  }

  const yAxisDomain = fixedDomainRef.current || [0, 100];

  // Build chart data
  const chartData = useMemo(() => {
    return MONTHS.map((month, index) => {
      const data = { month };
      if (baseline?.[index] != null && !isNaN(baseline[index])) data.baseline = baseline[index];
      if (simulated?.[index] != null && !isNaN(simulated[index])) data.simulated = simulated[index];
      if (delivered?.[index] != null && !isNaN(delivered[index])) data.delivered = delivered[index];
      if (actuals?.[index] != null && !isNaN(actuals[index])) data.actuals = actuals[index];
      return data;
    });
  }, [baseline, simulated, delivered, actuals]);

  const validData = useMemo(() => {
    return chartData.filter(d => 
      d.baseline !== undefined || d.simulated !== undefined || 
      d.delivered !== undefined || d.actuals !== undefined
    );
  }, [chartData]);

  // Title
  const title = apsClass ? `${product} - ${apsClass} | Year: ${year}` : `${product} | Year: ${year}`;

  // Tick formatter
  const tickFormatter = useCallback((value) => formatNumber(value, 0), []);

  // Exceeded data points
  const exceededDataPoints = useMemo(() => {
    return exceededMonths
      .map(exceeded => {
        const dataPoint = validData.find(d => d.month === exceeded.month);
        if (!dataPoint?.simulated) return null;
        return { month: exceeded.month, value: dataPoint.simulated };
      })
      .filter(Boolean);
  }, [exceededMonths, validData]);

  return (
    <div className="flex flex-col" style={{ height: 420 }}>
      {/* Header */}
      <div className="h-10 mb-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">

        <div className="flex flex-wrap items-center gap-2">
          <LineToggle
            label="Baseline (new)"
            color={CHART_COLORS.baseline}
            isActive={showBaseline}
            onChange={onToggleBaseline}
            disabled={!hasBaseline}
          />
          <LineToggle
            label="Delivered"
            color={CHART_COLORS.delivered}
            isActive={showDelivered}
            onChange={onToggleDelivered}
            disabled={!hasDelivered}
            dashed
          />
          <LineToggle
            label="Actuals"
            color={CHART_COLORS.actuals}
            isActive={showActuals}
            onChange={onToggleActuals}
            disabled={!hasActuals}
            dashed
          />
        </div>
      </div>
      
      {/* Chart Container - Fixed size, no layout shift */}
      <div className="flex-1 min-h-0">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart 
            data={validData} 
            margin={{ top: 5, right: 30, left: 5, bottom: 5 }}
          >
            <defs>
              <style>
                {`
                  .recharts-line-curve {
                    transition: d 150ms ease-out;
                  }
                  .recharts-line-dots circle {
                    transition: cx 150ms ease-out, cy 150ms ease-out;
                  }
                `}
              </style>
            </defs>

            <CartesianGrid strokeDasharray="3 3" stroke="#9eb4e0ff" vertical={false} />
            
            <XAxis
              dataKey="month"
              tick={{ fill: '#525252', fontSize: 10 }}
              axisLine={{ stroke: '#E5E5E5' }}
              tickLine={{ stroke: '#E5E5E5' }}
            />
            
            <YAxis
              domain={yAxisDomain}
              tick={{ fill: '#525252', fontSize: 10 }}
              axisLine={{ stroke: '#E5E5E5' }}
              tickLine={{ stroke: '#E5E5E5' }}
              tickFormatter={tickFormatter}
              width={40}
            />
            
            <Tooltip content={<CustomTooltip />} />
            
            <Legend
              wrapperStyle={{ paddingTop: 8, fontSize: '11px' }}
              iconType="circle"
              iconSize={6}
            />

            {showBaseline && hasBaseline && (
              <Line
                type="monotone"
                dataKey="baseline"
                name="Daikin Baseline (new approach)"
                stroke={CHART_COLORS.baseline}
                strokeWidth={2.5}
                dot={{ r: 4, fill: CHART_COLORS.baseline }}
                activeDot={{ r: 6 }}
                isAnimationActive={false}
              />
            )}

            <Line
              type="monotone"
              dataKey="simulated"
              name="Simulated"
              stroke={CHART_COLORS.simulated}
              strokeWidth={3}
              dot={{ r: 5, fill: CHART_COLORS.simulated }}
              activeDot={{ r: 7 }}
              isAnimationActive={false}
            />

            {showDelivered && hasDelivered && (
              <Line
                type="monotone"
                dataKey="delivered"
                name="Daikin Baseline (current delivery)"
                stroke={CHART_COLORS.delivered}
                strokeWidth={2.5}
                strokeDasharray="5 5"
                dot={{ r: 4, fill: CHART_COLORS.delivered }}
                activeDot={{ r: 6 }}
                isAnimationActive={false}
              />
            )}

            {showActuals && hasActuals && (
              <Line
                type="monotone"
                dataKey="actuals"
                name="Actuals"
                stroke={CHART_COLORS.actuals}
                strokeWidth={2.5}
                strokeDasharray="8 4"
                dot={{ r: 4, fill: CHART_COLORS.actuals }}
                activeDot={{ r: 6 }}
                isAnimationActive={false}
              />
            )}

            {exceededDataPoints.map((point) => (
              <ReferenceDot
                key={point.month}
                x={point.month}
                y={point.value}
                r={8}
                fill="#FEF3C7"
                stroke="#F59E0B"
                strokeWidth={2}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Warnings - Fixed height */}
      <div className="h-10 flex items-center justify-center">
        {exceededMonths.length > 0 ? (
          <div className="flex flex-wrap justify-center gap-2">
            {exceededMonths.map((exceeded) => (
              <WarningBadge key={exceeded.month} month={exceeded.month} />
            ))}
          </div>
        ) : (
          <div className="h-6" /> 
        )}
      </div>
    </div>
  );
}

export default ForecastChart;