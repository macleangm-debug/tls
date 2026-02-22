// Shared utilities, constants, and components for Practice Management
import { useState } from "react";
import { Calendar as CalendarWidget } from "../ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "../ui/alert-dialog";
import { CalendarIcon, ClockIcon } from "lucide-react";
import { format } from "date-fns";

export const API = process.env.REACT_APP_BACKEND_URL;

// Reusable Confirmation Dialog Component
export const ConfirmDialog = ({ open, onOpenChange, title, description, confirmText = "Confirm", cancelText = "Cancel", variant = "default", onConfirm }) => {
  const variantStyles = {
    default: "bg-tls-blue-electric hover:bg-tls-blue-electric/90",
    danger: "bg-red-500 hover:bg-red-600 text-white",
    success: "bg-emerald-500 hover:bg-emerald-600 text-white"
  };
  
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="bg-[#0a0d14] border-white/10">
        <AlertDialogHeader>
          <AlertDialogTitle className="text-white">{title}</AlertDialogTitle>
          <AlertDialogDescription className="text-white/60">
            {description}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel className="bg-white/5 border-white/10 text-white hover:bg-white/10 hover:text-white">
            {cancelText}
          </AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm} className={variantStyles[variant]}>
            {confirmText}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

// Date Picker Component
export const DateTimePicker = ({ value, onChange, label, includeTime = true }) => {
  const [date, setDate] = useState(value ? new Date(value) : null);
  const [time, setTime] = useState(value ? format(new Date(value), "HH:mm") : "09:00");
  const [open, setOpen] = useState(false);

  const handleDateSelect = (selectedDate) => {
    setDate(selectedDate);
    if (selectedDate) {
      const [hours, minutes] = time.split(":");
      selectedDate.setHours(parseInt(hours), parseInt(minutes));
      onChange(selectedDate.toISOString());
    }
  };

  const handleTimeChange = (e) => {
    setTime(e.target.value);
    if (date) {
      const [hours, minutes] = e.target.value.split(":");
      const newDate = new Date(date);
      newDate.setHours(parseInt(hours), parseInt(minutes));
      onChange(newDate.toISOString());
    }
  };

  return (
    <div className="space-y-2">
      {label && <label className="text-sm text-white/60">{label}</label>}
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            className="w-full justify-start text-left font-normal bg-white/5 border-white/10 text-white hover:bg-white/10"
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {date ? format(date, "PPP") : "Select date"}
            {includeTime && date && (
              <span className="ml-2 text-white/60">at {time}</span>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0 bg-[#1a1f2e] border-white/10" align="start">
          <CalendarWidget
            mode="single"
            selected={date}
            onSelect={handleDateSelect}
            initialFocus
            className="bg-[#1a1f2e]"
          />
          {includeTime && (
            <div className="p-3 border-t border-white/10">
              <div className="flex items-center gap-2">
                <ClockIcon className="h-4 w-4 text-white/60" />
                <Input
                  type="time"
                  value={time}
                  onChange={handleTimeChange}
                  className="bg-white/5 border-white/10 text-white"
                />
              </div>
            </div>
          )}
        </PopoverContent>
      </Popover>
    </div>
  );
};

// Donut Chart Component
export const DonutChart = ({ data, colors, size = 120 }) => {
  const total = data.reduce((sum, item) => sum + item.value, 0);
  let cumulative = 0;
  
  const segments = data.map((item, index) => {
    const start = cumulative;
    cumulative += (item.value / total) * 100;
    return {
      ...item,
      start,
      end: cumulative,
      color: colors[index % colors.length]
    };
  });

  const createArc = (startPercent, endPercent) => {
    const start = (startPercent / 100) * Math.PI * 2 - Math.PI / 2;
    const end = (endPercent / 100) * Math.PI * 2 - Math.PI / 2;
    const largeArc = endPercent - startPercent > 50 ? 1 : 0;
    
    const x1 = 50 + 40 * Math.cos(start);
    const y1 = 50 + 40 * Math.sin(start);
    const x2 = 50 + 40 * Math.cos(end);
    const y2 = 50 + 40 * Math.sin(end);
    
    return `M 50 50 L ${x1} ${y1} A 40 40 0 ${largeArc} 1 ${x2} ${y2} Z`;
  };

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg viewBox="0 0 100 100" className="w-full h-full transform -rotate-90">
        {segments.map((segment, idx) => (
          <path
            key={idx}
            d={createArc(segment.start, segment.end)}
            fill={segment.color}
            className="transition-all duration-300 hover:opacity-80"
          />
        ))}
        <circle cx="50" cy="50" r="25" fill="#0a0d14" />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-lg font-bold text-white">{total}</span>
      </div>
    </div>
  );
};

// Bar Chart Component
export const BarChart = ({ data, color = "#3B82F6", height = 150 }) => {
  const maxValue = Math.max(...data.map(d => d.value), 1);
  
  return (
    <div className="flex items-end gap-1 h-full" style={{ height: `${height}px` }}>
      {data.map((item, idx) => (
        <div key={idx} className="flex-1 flex flex-col items-center gap-1 h-full">
          <div className="flex-1 w-full flex items-end">
            <div 
              className="w-full rounded-t-sm transition-all duration-300 hover:opacity-80"
              style={{ 
                height: `${(item.value / maxValue) * 100}%`,
                backgroundColor: color,
                minHeight: item.value > 0 ? '4px' : '0'
              }}
            />
          </div>
          <span className="text-[10px] text-white/40 truncate w-full text-center">{item.label}</span>
        </div>
      ))}
    </div>
  );
};

// Common color schemes
export const statusColors = ["#10B981", "#F59E0B", "#6B7280", "#8B5CF6"];
export const typeColors = ["#3B82F6", "#EC4899", "#F59E0B", "#10B981", "#8B5CF6"];

// Helper function to format file size
export const formatFileSize = (bytes) => {
  if (!bytes) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
};

// Helper function to format currency
export const formatCurrency = (amount, currency = "TZS") => {
  return new Intl.NumberFormat("en-TZ", { 
    style: "currency", 
    currency, 
    minimumFractionDigits: 0 
  }).format(amount || 0);
};
