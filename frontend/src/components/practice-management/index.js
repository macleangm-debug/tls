// Practice Management Tab Components - Index Export
// Components that have been extracted to separate files

// Extracted Components
export { ClientsTab, ClientFormModal } from './ClientsTab';
export { CasesTab } from './CasesTab';
export { DashboardTab } from './DashboardTab';

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

// Note: The following tabs are still in PracticeManagementPage.jsx
// and can be extracted incrementally:
// - DocumentsTab
// - CalendarTab
// - TasksTab
// - InvoicesTab
// - MessagesTab
// - TemplatesTab
// - DocumentGeneratorTab
