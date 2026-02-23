// Practice Management Tab Components - Index Export
// All tab components extracted for modular architecture

// Tab Components
export { ClientsTab, ClientFormModal } from './ClientsTab';
export { CasesTab } from './CasesTab';
export { DashboardTab } from './DashboardTab';
export { DocumentsTab } from './DocumentsTab';
export { CalendarTab } from './CalendarTab';
export { TasksTab } from './TasksTab';
export { InvoicesTab } from './InvoicesTab';
export { MessagesTab } from './MessagesTab';
export { TemplatesTab } from './TemplatesTab';
export { DocumentGeneratorTab } from './DocumentGeneratorTab';

// Shared utilities, charts and constants
export { 
  API,
  ConfirmDialog, 
  DateTimePicker, 
  DonutChart, 
  BarChart,
  statusColors,
  typeColors,
  formatFileSize,
  formatCurrency
} from './shared';
