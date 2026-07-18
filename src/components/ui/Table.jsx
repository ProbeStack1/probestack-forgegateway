export default function Table({ columns }) {
  return (
    <div className="overflow-hidden rounded-lg border border-dark-700">
      <table className="w-full text-sm">
        
        <thead className="bg-dark-800/70">
          <tr>
            {columns.map(col => (
              <th key={col} className="text-left px-4 py-3 text-gray-400">
                {col}
              </th>
            ))}
          </tr>
        </thead>

        <tbody>
          <tr>
            <td colSpan={columns.length} className="text-center py-6 text-gray-400">
              No data found
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}