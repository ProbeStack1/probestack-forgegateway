import "../kongTable.css";

export default function KongTableSkeletonRows({ columns = 4, rows = 5 }) {
  return (
    <>
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <tr key={`kong-table-skeleton-${rowIndex}`}>
          {Array.from({ length: columns }).map((__, columnIndex) => (
            <td key={columnIndex}>
              <div
                className="kong-skeleton"
                style={{
                  width: columnIndex === columns - 1 ? "70%" : `${92 - columnIndex * 10}%`,
                }}
              />
            </td>
          ))}
        </tr>
      ))}
    </>
  );
}
