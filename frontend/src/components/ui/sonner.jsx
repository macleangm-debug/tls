import { Toaster as Sonner, toast } from "sonner"

const Toaster = ({
  ...props
}) => {
  return (
    <Sonner
      theme="dark"
      position="top-right"
      className="toaster group"
      toastOptions={{
        classNames: {
          toast:
            "group toast bg-slate-800 text-white border border-slate-700 shadow-lg",
          description: "text-slate-300",
          success: "bg-emerald-900/90 border-emerald-700 text-emerald-100",
          error: "bg-red-900/90 border-red-700 text-red-100",
          actionButton:
            "bg-emerald-500 text-white",
          cancelButton:
            "bg-slate-600 text-white",
        },
      }}
      {...props} />
  );
}

export { Toaster, toast }
