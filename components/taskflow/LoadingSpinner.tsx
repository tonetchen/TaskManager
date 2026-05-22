export function LoadingSpinner({ className }: { className?: string }) {
  return (
    <div
      className={`loading-state${className ? ` ${className}` : ""}`}
      role="status"
      aria-label="加载中"
    >
      <div className="loading-spinner" />
    </div>
  );
}
