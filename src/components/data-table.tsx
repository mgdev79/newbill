import type { ReactNode } from "react";

export function DataTable({
  headers,
  rows,
}: {
  headers: ReactNode[];
  rows: ReactNode[][];
}) {
  return (
    <div className="overflow-x-auto">
      <table className="min-w-full border-collapse text-left text-[13px]">
        <thead>
          <tr className="bg-[#f9f9f9]">
            {headers.map((header, index) => (
              <th
                key={index}
                className="border-b border-[var(--lte-line)] px-3 py-2 font-semibold whitespace-nowrap text-[#333]"
              >
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td
                colSpan={headers.length}
                className="px-3 py-6 text-center text-[var(--lte-muted)]"
              >
                Tidak ada data
              </td>
            </tr>
          ) : (
            rows.map((row, index) => (
              <tr
                key={index}
                className={index % 2 === 0 ? "bg-white" : "bg-[#f9f9f9]"}
              >
                {row.map((cell, cellIndex) => (
                  <td
                    key={cellIndex}
                    className="border-b border-[#f4f4f4] px-3 py-2 whitespace-nowrap text-[#444]"
                  >
                    {cell}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
