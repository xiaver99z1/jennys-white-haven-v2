import React, { useState } from 'react'

export interface Column<T> {
  key: keyof T | string
  header: string
  sortable?: boolean
  filterable?: boolean
  filterType?: 'text' | 'select' | 'date'
  filterOptions?: { label: string; value: string }[]
  renderCell: (item: T) => React.ReactNode
  renderMobileCard?: (item: T) => React.ReactNode
}

interface AdminDataTableProps<T> {
  data: T[]
  columns: Column<T>[]
  keyField: keyof T
  sortField: string
  sortOrder: 'asc' | 'desc'
  onSort: (field: string) => void
  searchValues: Record<string, string>
  onSearchChange: (key: string, value: string) => void
  onResetFilters: () => void
  currentPage: number
  pageSize: number
  totalItems: number
  onPageChange: (page: number) => void
  onPageSizeChange: (size: number) => void
  addLabel?: string
  onAddClick?: () => void
  title: string
}

export function AdminDataTable<T>({
  data,
  columns,
  keyField,
  sortField,
  sortOrder,
  onSort,
  searchValues,
  onSearchChange,
  onResetFilters,
  currentPage,
  pageSize,
  totalItems,
  onPageChange,
  onPageSizeChange,
  addLabel,
  onAddClick,
  title,
}: AdminDataTableProps<T>) {
  const [activeFilters, setActiveFilters] = useState<Record<string, boolean>>(
    {},
  )
  const [isMobileDrawerOpen, setIsMobileDrawerOpen] = useState(false)

  const toggleFilterOpen = (key: string) => {
    setActiveFilters((prev) => ({ ...prev, [key]: !prev[key] }))
    if (activeFilters[key]) {
      onSearchChange(key, '')
    }
  }

  const totalPages = Math.ceil(totalItems / pageSize) || 1

  return (
    <div className="h-[calc(100vh-7.5rem)] flex flex-col space-y-2.5 overflow-hidden">
      {/* 1. Header Section */}
      <div className="shrink-0 flex items-center justify-between gap-4">
        <h1 className="text-xl md:text-2xl font-bold text-stone-900">
          {title}
        </h1>

        <div className="flex items-center gap-2">
          {/* Mobile Filter Toggle Button */}
          <button
            onClick={() => setIsMobileDrawerOpen(!isMobileDrawerOpen)}
            className="md:hidden p-2 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-xl transition flex items-center justify-center cursor-pointer border border-stone-200 shadow-xs"
            title="Toggle Filters"
          >
            {isMobileDrawerOpen ? (
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            ) : (
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z"
                />
              </svg>
            )}
          </button>

          {addLabel && onAddClick && (
            <button
              onClick={onAddClick}
              className="px-3.5 py-2 bg-amber-700 hover:bg-amber-800 text-white font-medium text-sm rounded-xl shadow-xs transition flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 4v16m8-8H4"
                />
              </svg>
              <span>{addLabel}</span>
            </button>
          )}
        </div>
      </div>

      {/* Mobile Filter & Sort Drawer */}
      <div
        className={`md:hidden shrink-0 transition-all duration-300 ${isMobileDrawerOpen ? 'block' : 'hidden'}`}
      >
        <div className="bg-white p-3.5 rounded-xl border border-stone-200 shadow-xs space-y-3">
          <div className="text-xs font-bold text-stone-700 uppercase tracking-wider">
            Filter & Sort Options
          </div>

          <div className="space-y-2.5">
            {columns.map((col) => {
              if (!col.filterable) return null
              const stringKey = String(col.key)
              return (
                <div key={stringKey}>
                  <label className="block text-[11px] font-medium text-stone-500 mb-1">
                    {col.header}
                  </label>
                  {col.filterType === 'select' ? (
                    <select
                      value={searchValues[stringKey] || 'ALL'}
                      onChange={(e) =>
                        onSearchChange(stringKey, e.target.value)
                      }
                      className="w-full px-2.5 py-1.5 text-xs bg-stone-50 border border-stone-300 rounded-lg focus:outline-none text-stone-700 cursor-pointer"
                    >
                      {col.filterOptions?.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  ) : col.filterType === 'date' ? (
                    <input
                      type="date"
                      value={searchValues[stringKey] || ''}
                      onChange={(e) =>
                        onSearchChange(stringKey, e.target.value)
                      }
                      className="w-full px-2.5 py-1.5 text-xs bg-stone-50 border border-stone-300 rounded-lg focus:outline-none text-stone-700 cursor-pointer"
                    />
                  ) : (
                    <input
                      type="text"
                      value={searchValues[stringKey] || ''}
                      onChange={(e) =>
                        onSearchChange(stringKey, e.target.value)
                      }
                      placeholder={`Search ${col.header.toLowerCase()}...`}
                      className="w-full px-2.5 py-1.5 text-xs bg-stone-50 border border-stone-300 rounded-lg focus:outline-none text-stone-800"
                    />
                  )}
                </div>
              )
            })}

            {/* Mobile Sorting */}
            <div className="grid grid-cols-2 gap-2 pt-2 border-t border-stone-100">
              <div>
                <label className="block text-[11px] font-medium text-stone-500 mb-1 flex items-center gap-1">
                  <svg
                    className="w-3.5 h-3.5 text-stone-600"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M3 4h13M3 8h9m-9 4h6m4 0l4-4m0 0l4 4m-4-4v12"
                    />
                  </svg>
                  Sort By
                </label>
                <select
                  value={sortField}
                  onChange={(e) => onSort(e.target.value)}
                  className="w-full px-2.5 py-1.5 text-xs bg-stone-50 border border-stone-300 rounded-lg focus:outline-none text-stone-700 cursor-pointer"
                >
                  {columns
                    .filter((c) => c.sortable)
                    .map((c) => (
                      <option key={String(c.key)} value={String(c.key)}>
                        {c.header}
                      </option>
                    ))}
                </select>
              </div>
              <div>
                <label className="block text-[11px] font-medium text-stone-500 mb-1">
                  Order
                </label>
                <div className="px-2.5 py-1.5 text-xs bg-stone-100 border border-stone-300 rounded-lg text-stone-700 font-medium uppercase">
                  {sortOrder}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-stone-100">
              <button
                onClick={onResetFilters}
                className="text-xs text-stone-500 hover:text-stone-800 underline cursor-pointer"
              >
                Reset All
              </button>
              <button
                onClick={() => setIsMobileDrawerOpen(false)}
                className="px-3 py-1 bg-amber-700 text-white text-xs font-medium rounded-lg shadow-xs cursor-pointer"
              >
                Apply
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Middle Scrollable Table Area */}
      <div className="flex-1 min-h-0 flex flex-col">
        {/* Desktop Table */}
        <div className="hidden md:flex flex-1 flex-col min-h-0 bg-white rounded-xl shadow-xs border border-stone-200 overflow-hidden">
          <div className="overflow-y-auto flex-1 min-h-0">
            <table className="w-full text-left border-collapse">
              <thead className="sticky top-0 bg-stone-50 z-10 border-b border-stone-200 text-xs font-semibold text-stone-500 uppercase tracking-wider">
                <tr>
                  {columns.map((col) => {
                    const stringKey = String(col.key)
                    const isFiltered = activeFilters[stringKey]
                    return (
                      <th key={stringKey} className="py-2.5 px-4">
                        <div className="flex items-center justify-between gap-1">
                          {isFiltered ? (
                            col.filterType === 'select' ? (
                              <select
                                value={searchValues[stringKey] || 'ALL'}
                                onChange={(e) =>
                                  onSearchChange(stringKey, e.target.value)
                                }
                                className="w-full px-2 py-1 text-xs bg-white border border-amber-500 rounded-md focus:outline-none text-stone-700 font-normal uppercase cursor-pointer"
                                autoFocus
                              >
                                {col.filterOptions?.map((opt) => (
                                  <option key={opt.value} value={opt.value}>
                                    {opt.label}
                                  </option>
                                ))}
                              </select>
                            ) : col.filterType === 'date' ? (
                              <input
                                type="date"
                                value={searchValues[stringKey] || ''}
                                onChange={(e) =>
                                  onSearchChange(stringKey, e.target.value)
                                }
                                className="w-full px-2 py-1 text-xs bg-white border border-amber-500 rounded-md focus:outline-none text-stone-700 font-normal uppercase cursor-pointer"
                                autoFocus
                              />
                            ) : (
                              <input
                                type="text"
                                value={searchValues[stringKey] || ''}
                                onChange={(e) =>
                                  onSearchChange(stringKey, e.target.value)
                                }
                                placeholder={`${col.header}...`}
                                className="w-full px-2 py-1 text-xs bg-white border border-amber-500 rounded-md focus:outline-none text-stone-800 font-normal uppercase"
                                autoFocus
                              />
                            )
                          ) : (
                            <span>{col.header}</span>
                          )}

                          <div className="flex items-center gap-0.5 shrink-0">
                            {col.filterable &&
                              (isFiltered ? (
                                <button
                                  onClick={() => toggleFilterOpen(stringKey)}
                                  className="p-1 hover:bg-stone-200 text-stone-500 rounded transition cursor-pointer"
                                  title="Clear & Close Filter"
                                >
                                  <svg
                                    className="w-4 h-4"
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                  >
                                    <path
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                      strokeWidth={2}
                                      d="M6 18L18 6M6 6l12 12"
                                    />
                                  </svg>
                                </button>
                              ) : (
                                <button
                                  onClick={() => toggleFilterOpen(stringKey)}
                                  className="p-1 rounded-md transition cursor-pointer hover:bg-stone-200 text-stone-400 hover:text-stone-700"
                                  title={`Filter ${col.header}`}
                                >
                                  <svg
                                    className="w-4 h-4"
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                  >
                                    <path
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                      strokeWidth={2}
                                      d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                                    />
                                  </svg>
                                </button>
                              ))}

                            {col.sortable && (
                              <button
                                onClick={() => onSort(stringKey)}
                                className={`p-1 rounded-md transition cursor-pointer ${sortField === stringKey ? 'bg-amber-100 text-amber-800' : 'hover:bg-stone-200 text-stone-400 hover:text-stone-700'}`}
                                title={`Sort by ${col.header}`}
                              >
                                <svg
                                  className="w-4 h-4"
                                  fill="none"
                                  stroke="currentColor"
                                  viewBox="0 0 24 24"
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d={
                                      sortField === stringKey &&
                                      sortOrder === 'desc'
                                        ? 'M19 9l-7 7-7-7'
                                        : 'M5 15l7-7 7 7'
                                    }
                                  />
                                </svg>
                              </button>
                            )}
                          </div>
                        </div>
                      </th>
                    )
                  })}
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100 text-sm">
                {data.length === 0 ? (
                  <tr>
                    <td
                      colSpan={columns.length}
                      className="py-12 text-center text-stone-400"
                    >
                      No records found matching your criteria.
                    </td>
                  </tr>
                ) : (
                  data.map((item) => (
                    <tr
                      key={String(item[keyField])}
                      className="hover:bg-amber-50/30 transition"
                    >
                      {columns.map((col) => (
                        <td key={String(col.key)} className="py-2.5 px-4">
                          {col.renderCell(item)}
                        </td>
                      ))}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Mobile Card List View */}
        <div className="md:hidden flex-1 overflow-y-auto min-h-0 space-y-2.5 pr-1">
          {data.length === 0 ? (
            <div className="bg-white p-6 rounded-xl text-center text-stone-400 text-sm border border-stone-200">
              No records found matching your search.
            </div>
          ) : (
            data.map((item) => (
              <div
                key={String(item[keyField])}
                className="bg-white p-3.5 rounded-xl border border-stone-200 shadow-xs space-y-2.5"
              >
                {columns.map((col) =>
                  col.renderMobileCard ? col.renderMobileCard(item) : null,
                )}
              </div>
            ))
          )}
        </div>
      </div>

      {/* 3. Footer Pagination Controls */}
      <div className="shrink-0 bg-white p-3 rounded-xl border border-stone-200 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-stone-600 shadow-xs">
        <div className="flex items-center justify-between sm:justify-start gap-3 w-full sm:w-auto">
          <div>
            Showing{' '}
            <span className="font-bold text-stone-900">
              {totalItems === 0 ? 0 : (currentPage - 1) * pageSize + 1}
            </span>{' '}
            to{' '}
            <span className="font-bold text-stone-900">
              {Math.min(currentPage * pageSize, totalItems)}
            </span>{' '}
            of <span className="font-bold text-stone-900">{totalItems}</span>{' '}
            records
          </div>
          <select
            value={pageSize}
            onChange={(e) => onPageSizeChange(Number(e.target.value))}
            className="px-2 py-1 text-xs bg-stone-50 border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-600/30 text-stone-700 cursor-pointer"
          >
            <option value={5}>5 / page</option>
            <option value={10}>10 / page</option>
            <option value={20}>20 / page</option>
          </select>
        </div>

        <div className="flex items-center gap-1 self-end sm:self-auto">
          <button
            onClick={() => onPageChange(Math.max(currentPage - 1, 1))}
            disabled={currentPage === 1}
            className="px-2.5 py-1 rounded-lg border border-stone-300 hover:bg-stone-50 disabled:opacity-40 disabled:cursor-not-allowed transition font-medium cursor-pointer"
          >
            Previous
          </button>
          <span className="px-2 font-semibold">
            {currentPage} / {totalPages}
          </span>
          <button
            onClick={() => onPageChange(Math.min(currentPage + 1, totalPages))}
            disabled={currentPage === totalPages || totalPages === 0}
            className="px-2.5 py-1 rounded-lg border border-stone-300 hover:bg-stone-50 disabled:opacity-40 disabled:cursor-not-allowed transition font-medium cursor-pointer"
          >
            Next
          </button>
        </div>
      </div>
    </div>
  )
}
