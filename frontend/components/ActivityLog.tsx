interface ActivityLogProps {
  logs: string[];
}

export function ActivityLog({ logs }: ActivityLogProps) {
  return (
    <div className="bg-white rounded-xl shadow-lg p-6">
      <h3 className="text-xl font-bold text-gray-800 mb-4">📝 Activity Log</h3>
      <div className="space-y-2 max-h-64 overflow-y-auto">
        {logs.length === 0 ? (
          <p className="text-gray-500 italic">No activity yet...</p>
        ) : (
          logs.slice(-10).reverse().map((log, index) => (
            <div key={index} className="text-sm text-gray-600 bg-gray-50 rounded px-3 py-2">
              {log}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
