"use client";
import React, { useState } from 'react';
import { Pencil, Trash2, Eye, Search } from 'lucide-react';

export interface Column {
  header: string;
  accessor: string | ((row: any) => React.ReactNode);
}

interface ReusableTableProps {
  title: string;
  columns: Column[];
  data: any[];
  onAdd?: () => void;
  onEdit?: (item: any) => void;
  onDelete?: (item: any) => void;
  onView?: (item: any) => void;
  actionLabel?: string;
}

const ReusableTable: React.FC<ReusableTableProps> = ({ 
  title, columns, data, onAdd, onEdit, onDelete, onView, actionLabel = "Add New" 
}) => {
  // 🔥 SEARCH FEATURE STATE
  const [searchQuery, setSearchQuery] = useState("");

  // 🔥 FILTER DATA LOGIC
  const filteredData = data.filter((row) => {
    if (!searchQuery.trim()) return true;
    
    return columns.some((col) => {
      // Sirf un columns me search karo jo string hain (taake function wale columns crash na hon)
      if (typeof col.accessor === 'string') {
        const cellValue = row[col.accessor];
        return String(cellValue).toLowerCase().includes(searchQuery.toLowerCase());
      }
      return false;
    });
  });

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 w-full overflow-hidden flex flex-col">
      {/* Header & Search Bar */}
      <div className="p-6 flex flex-col md:flex-row justify-between items-start md:items-center border-b border-slate-100 gap-4">
        <div>
          {title && <h2 className="text-xl font-bold text-slate-800">{title}</h2>}
          {title && <p className="text-sm text-slate-500 mt-1">Manage your records effectively</p>}
        </div>
        
        <div className="flex flex-col sm:flex-row w-full md:w-auto items-center gap-3">
          {/* SEARCH INPUT */}
          <div className="relative w-full sm:w-64">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search size={16} className="text-slate-400" />
            </div>
            <input
              type="text"
              placeholder="Search in table..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all text-slate-700"
            />
          </div>

          {/* ADD NEW BUTTON */}
          {onAdd && (
            <button 
              onClick={onAdd} 
              className="w-full sm:w-auto whitespace-nowrap bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white px-5 py-2.5 rounded-xl text-sm font-medium transition-all shadow-md shadow-indigo-100"
            >
              + {actionLabel}
            </button>
          )}
        </div>
      </div>

      {/* Responsive Table Container */}
      <div className="overflow-x-auto w-full">
        <table className="w-full text-left border-collapse min-w-[600px]"> 
          <thead className="bg-slate-50/50">
            <tr>
              {columns.map((col, index) => (
                <th key={index} className="py-4 px-6 text-xs font-bold text-slate-500 uppercase tracking-wider">
                  {col.header}
                </th>
              ))}
              <th className="py-4 px-6 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filteredData.length > 0 ? (
              filteredData.map((row, rowIndex) => (
                <tr key={rowIndex} className="hover:bg-slate-50/80 transition-colors duration-150 group">
                  {columns.map((col, colIndex) => (
                    <td key={colIndex} className="py-4 px-6 text-sm text-slate-700 font-medium whitespace-nowrap">
                      
                      {/* 🔥 TYPE SAFE RENDERING: Check if accessor is function or string */}
                      {typeof col.accessor === 'function' ? (
                        col.accessor(row)
                      ) : col.accessor === 'status' ? (
                        <span className={`px-3 py-1 rounded-full text-xs font-bold border ${
                          ['Active', 'Processed', 'Completed'].includes(row[col.accessor]) 
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-100' 
                            : ['Pending', 'Pending AI', 'Inactive'].includes(row[col.accessor])
                            ? 'bg-amber-50 text-amber-700 border-amber-100'
                            : 'bg-indigo-50 text-indigo-700 border-indigo-100'
                        }`}>
                          {row[col.accessor]}
                        </span>
                      ) : (
                        row[col.accessor]
                      )}

                    </td>
                  ))}
                  
                  {/* Actions */}
                  <td className="py-4 px-6 text-right whitespace-nowrap">
                    <div className="flex justify-end gap-2 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                      {onView && (
                        <button onClick={() => onView(row)} className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all" title="View Details">
                          <Eye size={18} />
                        </button>
                      )}
                      {onEdit && (
                        <button onClick={() => onEdit(row)} className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all" title="Edit">
                          <Pencil size={18} />
                        </button>
                      )}
                      {onDelete && (
                        <button onClick={() => onDelete(row)} className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all" title="Delete">
                          <Trash2 size={18} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={columns.length + 1} className="p-12 text-center text-slate-400 text-sm">
                  {searchQuery ? (
                    <span>No results found for "<b className="text-slate-600">{searchQuery}</b>"</span>
                  ) : (
                    "No records found in the database."
                  )}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default ReusableTable;