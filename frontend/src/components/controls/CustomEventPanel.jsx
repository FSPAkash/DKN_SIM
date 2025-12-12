import { X } from 'lucide-react';
import { Button, Select, Slider, NumberInput } from '../common';
import { useForecast } from '../../contexts/ForecastContext';
import { MONTHS, EVENT_TYPES } from '../../utils/constants';
import { formatPercent, formatMultiplier } from '../../utils/formatters';

function CustomEventPanel({
  settings,
  lockedEvents,
  onChange,
}) {
  const { addLockedEvent, removeLockedEvent } = useForecast();
  
  const lockedMonths = lockedEvents.map(e => e.month);
  const availableMonths = MONTHS.filter(m => !lockedMonths.includes(m));
  const canAddMore = lockedEvents.length < 3;

  const handleLockEvent = () => {
    if (!settings.month) return;
    
    const baseWeight = settings.weight || 1.0;
    const pct = settings.pct || 0;
    const multiplier = baseWeight * (1 + pct / 100);
    
    addLockedEvent(EVENT_TYPES.CUSTOM, {
      month: settings.month,
      weight: baseWeight,
      pct,
      multiplier,
    });
    
    onChange({ ...settings, month: null, weight: 1.0, pct: 0 });
  };

  const currentMultiplier = (settings.weight || 1.0) * (1 + (settings.pct || 0) / 100);

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-semibold text-daikin-dark">
        Custom Event
      </h3>

      <Select
        label="Month"
        value={settings.month}
        onChange={(value) => onChange({ ...settings, month: value })}
        options={[
          { value: null, label: 'None' },
          ...availableMonths.map(m => ({ value: m, label: m })),
        ]}
        disabled={!canAddMore}
      />

      {settings.month && (
        <>
          <NumberInput
            label="Base Weight"
            value={settings.weight || 1.0}
            onChange={(value) => onChange({ ...settings, weight: value })}
            min={0.4}
            max={1.6}
            step={0.01}
          />

          <Slider
            label="Adjust"
            value={settings.pct || 0}
            onChange={(value) => onChange({ ...settings, pct: value })}
            min={-40}
            max={60}
            step={5}
            formatValue={(v) => `${v > 0 ? '+' : ''}${v}%`}
          />

          <p className="text-xs text-surface-500 text-center">
            Final: {formatMultiplier(currentMultiplier)}x
          </p>

          <Button
            variant="primary"
            size="sm"
            onClick={handleLockEvent}
            className="w-full"
          >
            Lock in {settings.month} Custom ({formatPercent((currentMultiplier - 1) * 100, 0, true)})
          </Button>
        </>
      )}

      {lockedEvents.length > 0 && (
        <div className="space-y-2 pt-3 border-t border-surface-200/50">
          <p className="text-xs font-medium text-surface-500">Locked Events:</p>
          {lockedEvents.map((event) => (
            <div 
              key={event.month}
              className="flex items-center justify-between p-2 rounded-lg bg-sky-50 border border-sky-200"
            >
              <span className="text-sm text-sky-700">
                {event.month}: {formatPercent((event.multiplier - 1) * 100, 0, true)}
              </span>
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={() => removeLockedEvent(EVENT_TYPES.CUSTOM, event.month)}
                className="text-sky-600 hover:text-red-500 hover:bg-red-50"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default CustomEventPanel;