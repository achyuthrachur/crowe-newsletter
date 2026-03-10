'use client';

interface SchedulePickerProps {
  days: string[];
  hour: number;
  minute: number;
  timezone: string;
  onDaysChange: (days: string[]) => void;
  onHourChange: (hour: number) => void;
  onMinuteChange: (minute: number) => void;
  onTimezoneChange: (tz: string) => void;
}

const DAYS = [
  { value: 'MO', label: 'Mon' },
  { value: 'TU', label: 'Tue' },
  { value: 'WE', label: 'Wed' },
  { value: 'TH', label: 'Thu' },
  { value: 'FR', label: 'Fri' },
  { value: 'SA', label: 'Sat' },
  { value: 'SU', label: 'Sun' },
];

const TIMEZONES = [
  'America/Indiana/Indianapolis',
  'America/New_York',
  'America/Chicago',
  'America/Denver',
  'America/Los_Angeles',
  'America/Anchorage',
  'Pacific/Honolulu',
  'Europe/London',
  'Europe/Paris',
  'Asia/Tokyo',
  'Asia/Shanghai',
  'Australia/Sydney',
];

export function SchedulePicker({
  days,
  hour,
  minute,
  timezone,
  onDaysChange,
  onHourChange,
  onMinuteChange,
  onTimezoneChange,
}: SchedulePickerProps) {
  const toggleDay = (day: string) => {
    if (days.includes(day)) {
      if (days.length > 1) {
        onDaysChange(days.filter((d) => d !== day));
      }
    } else {
      onDaysChange([...days, day]);
    }
  };

  return (
    <div className="space-y-4">
      {/* Day selection */}
      <div>
        <label className="block text-sm font-medium text-tint-700 mb-2">
          Delivery Days
        </label>
        <div className="flex gap-2">
          {DAYS.map((day) => (
            <button
              key={day.value}
              type="button"
              onClick={() => toggleDay(day.value)}
              className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                days.includes(day.value)
                  ? 'bg-crowe-indigo-dark text-white'
                  : 'bg-tint-100/50 text-tint-700 hover:bg-tint-100'
              }`}
            >
              {day.label}
            </button>
          ))}
        </div>
      </div>

      {/* Time selection */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-tint-700 mb-1">
            Hour
          </label>
          <select
            value={hour}
            onChange={(e) => onHourChange(Number(e.target.value))}
            className="w-full px-3 py-2 border border-tint-100 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-crowe-indigo/20 focus:border-crowe-indigo bg-white"
          >
            {Array.from({ length: 24 }, (_, i) => (
              <option key={i} value={i}>
                {i === 0 ? '12 AM' : i < 12 ? `${i} AM` : i === 12 ? '12 PM' : `${i - 12} PM`}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-tint-700 mb-1">
            Minute
          </label>
          <select
            value={minute}
            onChange={(e) => onMinuteChange(Number(e.target.value))}
            className="w-full px-3 py-2 border border-tint-100 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-crowe-indigo/20 focus:border-crowe-indigo bg-white"
          >
            {[0, 15, 30, 45].map((m) => (
              <option key={m} value={m}>
                {m.toString().padStart(2, '0')}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Timezone */}
      <div>
        <label className="block text-sm font-medium text-tint-700 mb-1">
          Timezone
        </label>
        <select
          value={timezone}
          onChange={(e) => onTimezoneChange(e.target.value)}
          className="w-full px-3 py-2 border border-tint-100 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-crowe-indigo/20 focus:border-crowe-indigo bg-white"
        >
          {TIMEZONES.map((tz) => (
            <option key={tz} value={tz}>
              {tz.replace(/_/g, ' ')}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
