interface DateRangeFilterProps {
  label?: string;
  startDate: string;
  endDate: string;
  onStartDateChange: (date: string) => void;
  onEndDateChange: (date: string) => void;
  className?: string;
}

export function DateRangeFilter({
  label = "일자",
  startDate,
  endDate,
  onStartDateChange,
  onEndDateChange,
  className = "",
}: DateRangeFilterProps) {
  const handleStartChange = (newStart: string) => {
    if (newStart && endDate && newStart > endDate) {
      onStartDateChange(endDate);
      onEndDateChange(newStart);
    } else {
      onStartDateChange(newStart);
    }
  };

  const handleEndChange = (newEnd: string) => {
    if (newEnd && startDate && startDate > newEnd) {
      onStartDateChange(newEnd);
      onEndDateChange(startDate);
    } else {
      onEndDateChange(newEnd);
    }
  };

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      {label && <span className="text-sm text-gray-700 whitespace-nowrap">{label}</span>}
      <div className="flex items-center gap-2">
        <input
          type="date"
          value={startDate}
          onChange={(e) => handleStartChange(e.target.value)}
          className="h-10 px-3 bg-white border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-[#5B6FD8]"
        />
        <span className="text-gray-500">~</span>
        <input
          type="date"
          value={endDate}
          onChange={(e) => handleEndChange(e.target.value)}
          className="h-10 px-3 bg-white border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-[#5B6FD8]"
        />
      </div>
    </div>
  );
}
