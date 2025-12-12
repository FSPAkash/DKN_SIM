import { Checkbox, GlassCard } from '../common';

function ChartControls({
  showBaseline,
  showDelivered,
  showActuals,
  hasDelivered,
  hasActuals,
  onToggleBaseline,
  onToggleDelivered,
  onToggleActuals,
}) {
  return (
    <GlassCard variant="panel" padding="sm" className="mb-4">
      <div className="flex flex-wrap items-center gap-6">
        <span className="text-sm font-medium text-daikin-dark">
          Chart Lines:
        </span>
        
        <Checkbox
          label="Daikin Baseline (new approach)"
          checked={showBaseline}
          onChange={onToggleBaseline}
        />
        
        <Checkbox
          label="Daikin Baseline (current delivery)"
          checked={showDelivered}
          onChange={onToggleDelivered}
          disabled={!hasDelivered}
        />
        
        <Checkbox
          label="Actuals"
          checked={showActuals}
          onChange={onToggleActuals}
          disabled={!hasActuals}
        />
      </div>
    </GlassCard>
  );
}

export default ChartControls;