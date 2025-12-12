import { useState, useEffect, useRef, memo } from 'react';
import clsx from 'clsx';

const Slider = memo(function Slider({
  label,
  value,
  onChange,
  min = 0,
  max = 100,
  step = 1,
  formatValue,
  disabled = false,
  className,
}) {
  const [localValue, setLocalValue] = useState(value);
  const timeoutRef = useRef(null);
  const isSliding = useRef(false);

  // Sync from parent only when not actively sliding
  useEffect(() => {
    if (!isSliding.current) {
      setLocalValue(value);
    }
  }, [value]);

  const handleChange = (e) => {
    const newValue = parseFloat(e.target.value);
    setLocalValue(newValue);
    isSliding.current = true;

    // Clear existing timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // Debounce parent update
    timeoutRef.current = setTimeout(() => {
      onChange(newValue);
      isSliding.current = false;
    }, 200); // Increased debounce time
  };

  const handleMouseUp = () => {
    // Immediately update on mouse up
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    onChange(localValue);
    isSliding.current = false;
  };

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  const percentage = ((localValue - min) / (max - min)) * 100;
  const displayValue = formatValue ? formatValue(localValue) : localValue;

  return (
    <div className={clsx('space-y-2', className)}>
      {label && (
        <div className="flex items-center justify-between">
          <label className="text-sm font-medium text-daikin-dark">{label}</label>
          <span className="text-sm font-semibold text-daikin-blue tabular-nums">
            {displayValue}
          </span>
        </div>
      )}

      <div className="relative h-6 flex items-center">
        {/* Track background */}
        <div className="absolute inset-x-0 h-2 rounded-full bg-surface-200" />
        
        {/* Filled track */}
        <div
          className="absolute h-2 rounded-full bg-gradient-to-r from-daikin-blue to-daikin-light transition-[width] duration-75"
          style={{ width: `${percentage}%` }}
        />

        {/* Input */}
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={localValue}
          onChange={handleChange}
          onMouseUp={handleMouseUp}
          onTouchEnd={handleMouseUp}
          disabled={disabled}
          className={clsx(
            'relative w-full h-6 appearance-none bg-transparent cursor-pointer z-10',
            disabled && 'opacity-50 cursor-not-allowed'
          )}
        />
      </div>
    </div>
  );
});

export default Slider;