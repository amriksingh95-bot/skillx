import React, { useState, useMemo, useRef, useEffect } from 'react';
import { ChevronLeft, ChevronRight, ChevronsUpDown, ChevronUp, ChevronDown, Check } from 'lucide-react';
import SearchInput from './SearchInput';
import LoadingSpinner from './LoadingSpinner';
import EmptyState from './EmptyState';

export default function DataTable({
  columns,
  data = [],
  pagination,
  onPageChange,
  searchPlaceholder,
  onSearchChange,
  searchValue,
  isLoading = false,
  actions,
  selectable = false,
  selectedRows = [],
  onSelectionChange,
  stickyHeader = false,
  compact = false,
  onRowClick,
}) {
  const [sortColumn, setSortColumn] = useState(null);
  const [sortDirection, setSortDirection] = useState('asc');
  const scrollContainerRef = useRef(null);
  const [scrollThumbLeft, setScrollThumbLeft] = useState(0);
  const [scrollThumbWidth, setScrollThumbWidth] = useState(100);

  const handleSort = (colKey) => {
    if (!colKey) return;
    if (sortColumn === colKey) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(colKey);
      setSortDirection('asc');
    }
  };

  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;
    const updateThumb = () => {
      const { scrollLeft, scrollWidth, clientWidth } = container;
      if (scrollWidth <= clientWidth) {
        setScrollThumbWidth(0);
        return;
      }
      const trackWidth = clientWidth;
      const thumbW = Math.max(30, (clientWidth / scrollWidth) * trackWidth);
      const maxLeft = trackWidth - thumbW;
      const thumbL = (scrollLeft / (scrollWidth - clientWidth)) * maxLeft;
      setScrollThumbWidth(thumbW);
      setScrollThumbLeft(thumbL);
    };
    updateThumb();
    container.addEventListener('scroll', updateThumb, { passive: true });
    const ro = new ResizeObserver(updateThumb);
    ro.observe(container);
    return () => {
      container.removeEventListener('scroll', updateThumb);
      ro.disconnect();
    };
  }, [data, isLoading]);

  const draggingRef = useRef(false);
  const dragStartRef = useRef({ x: 0, scrollLeft: 0 });

  const handleScrollThumbMouseDown = (e) => {
    e.preventDefault();
    draggingRef.current = true;
    dragStartRef.current = { x: e.clientX, scrollLeft: scrollContainerRef.current?.scrollLeft || 0 };
    document.addEventListener('mousemove', handleScrollThumbMouseMove);
    document.addEventListener('mouseup', handleScrollThumbMouseUp);
  };

  const handleScrollThumbMouseMove = (e) => {
    if (!draggingRef.current || !scrollContainerRef.current) return;
    const container = scrollContainerRef.current;
    const { scrollWidth, clientWidth } = container;
    const trackWidth = clientWidth;
    const thumbW = Math.max(30, (clientWidth / scrollWidth) * trackWidth);
    const maxLeft = trackWidth - thumbW;
    const dx = e.clientX - dragStartRef.current.x;
    const scrollRatio = maxLeft > 0 ? dx / maxLeft : 0;
    container.scrollLeft = dragStartRef.current.scrollLeft + scrollRatio * (scrollWidth - clientWidth);
  };

  const handleScrollThumbMouseUp = () => {
    draggingRef.current = false;
    document.removeEventListener('mousemove', handleScrollThumbMouseMove);
    document.removeEventListener('mouseup', handleScrollThumbMouseUp);
  };

  const sortedData = useMemo(() => {
    if (!sortColumn) return data;
    return [...data].sort((a, b) => {
      const aVal = typeof sortColumn === 'function' ? sortColumn(a) : a[sortColumn];
      const bVal = typeof sortColumn === 'function' ? sortColumn(b) : b[sortColumn];
      if (aVal === null || aVal === undefined) return 1;
      if (bVal === null || bVal === undefined) return -1;
      if (typeof aVal === 'string') {
        const cmp = aVal.localeCompare(bVal);
        return sortDirection === 'asc' ? cmp : -cmp;
      }
      return sortDirection === 'asc' ? aVal - bVal : bVal - aVal;
    });
  }, [data, sortColumn, sortDirection]);

  const handlePrevPage = () => {
    if (pagination && pagination.page > 1 && onPageChange) {
      onPageChange(pagination.page - 1);
    }
  };

  const handleNextPage = () => {
    if (pagination && pagination.page < pagination.totalPages && onPageChange) {
      onPageChange(pagination.page + 1);
    }
  };

  const getCellValue = (row, col) => {
    return col.accessor
      ? typeof col.accessor === 'function'
        ? col.accessor(row)
        : row[col.accessor]
      : null;
  };

  const renderCellValue = (row, col, value) => {
    return col.render ? col.render(row, value) : value !== null && value !== undefined ? String(value) : '-';
  };

  const isAllSelected = data.length > 0 && selectedRows.length === data.length;
  const isIndeterminate = selectedRows.length > 0 && selectedRows.length < data.length;

  const handleSelectAll = () => {
    if (isAllSelected) {
      onSelectionChange?.([]);
    } else {
      onSelectionChange?.(data.map((row, idx) => row.id || idx));
    }
  };

  const handleSelectRow = (rowId) => {
    const newSelection = selectedRows.includes(rowId)
      ? selectedRows.filter((id) => id !== rowId)
      : [...selectedRows, rowId];
    onSelectionChange?.(newSelection);
  };

  const cellPadding = compact ? 'px-4 py-3' : 'px-6 py-4';
  const headerPadding = compact ? 'px-4 py-3' : 'px-6 py-4';

  return (
    <div className="ui-card overflow-hidden mb-8">
      {/* Top bar */}
      {(onSearchChange || searchPlaceholder || actions) && (
        <div className={`px-4 md:px-6 py-4 border-b border-border dark:border-dark-border flex items-center justify-between gap-3 md:gap-4 flex-wrap`}>
          {onSearchChange && (
            <SearchInput
              value={searchValue}
              onChange={onSearchChange}
              placeholder={searchPlaceholder || 'Search table...'}
            />
          )}
          {actions && <div className="flex items-center gap-2">{actions}</div>}
        </div>
      )}

      {/* Sticky horizontal scrollbar at top — outside scroll container so it doesn't scroll with content */}
      {stickyHeader && scrollThumbWidth > 0 && (
        <div
          className="w-full relative z-10"
          style={{ height: 16 }}
        >
          <div
            className="absolute inset-0 cursor-pointer"
            onMouseDown={(e) => {
              if (!scrollContainerRef.current || !e.target.dataset.thumb) return;
              e.preventDefault();
              draggingRef.current = true;
              dragStartRef.current = { x: e.clientX, scrollLeft: scrollContainerRef.current.scrollLeft };
              document.addEventListener('mousemove', handleScrollThumbMouseMove);
              document.addEventListener('mouseup', handleScrollThumbMouseUp);
            }}
          >
            <div
              data-thumb="true"
              className="absolute top-1/2 -translate-y-1/2 rounded-full bg-slate-300 dark:bg-slate-600 hover:bg-slate-400 dark:hover:bg-slate-500 transition-colors"
              style={{ left: scrollThumbLeft, width: scrollThumbWidth, height: 10, cursor: 'grab' }}
            />
          </div>
        </div>
      )}

      {/* Desktop Table */}
      <div ref={scrollContainerRef} className={`hidden md:block w-full overflow-x-auto relative scrollbar-none ${compact ? 'min-h-[100px]' : 'min-h-[150px]'}`}>
        {isLoading && (
          <div className="absolute inset-0 bg-white/70 dark:bg-dark-bg/60 backdrop-blur-[1px] flex items-center justify-center z-30">
            <LoadingSpinner size="medium" />
          </div>
        )}

        <table className="w-full text-left border-collapse">
          <thead className={stickyHeader ? 'sticky top-0 z-20' : ''}>
            <tr className="bg-surface-secondary dark:bg-slate-800/50 border-b border-border dark:border-dark-border">
              {selectable && (
                <th className={`${headerPadding} w-12`}>
                  <button
                    onClick={handleSelectAll}
                    className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
                      isAllSelected
                        ? 'bg-primary border-primary'
                        : isIndeterminate
                          ? 'bg-primary/50 border-primary'
                          : 'border-border-strong dark:border-slate-600 hover:border-primary'
                    } btn-press`}
                    aria-label="Select all rows"
                  >
                    {(isAllSelected || isIndeterminate) && <Check className="w-3 h-3 text-white" />}
                  </button>
                </th>
              )}
              {columns.map((col, idx) => (
                <th
                  key={idx}
                  className={`${headerPadding} text-xs font-semibold uppercase tracking-wider text-text-tertiary dark:text-slate-400 ${col.sortable ? 'cursor-pointer hover:text-text-secondary dark:hover:text-slate-300 select-none' : ''} ${col.className || ''} ${col.sticky ? 'sticky left-0 z-10 bg-white dark:bg-dark-card border-r border-slate-200 dark:border-slate-700' : ''}`}
                  style={col.width ? { width: col.width } : undefined}
                  onClick={() => col.sortable && handleSort(col.sortKey || col.accessor)}
                >
                  <div className="flex items-center gap-1.5">
                    {col.header}
                    {col.sortable && (
                      <span className="inline-flex flex-col -space-y-1">
                        {sortColumn === (col.sortKey || col.accessor) ? (
                          sortDirection === 'asc' ? (
                            <ChevronUp className="w-3.5 h-3.5 text-primary" />
                          ) : (
                            <ChevronDown className="w-3.5 h-3.5 text-primary" />
                          )
                        ) : (
                          <ChevronsUpDown className="w-3.5 h-3.5 opacity-40" />
                        )}
                      </span>
                    )}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border dark:divide-dark-border">
            {sortedData.length > 0 ? (
              sortedData.map((row, rowIdx) => {
                const rowId = row.id || rowIdx;
                const isSelected = selectedRows.includes(rowId);
                return (
                  <tr
                    key={rowId}
                    onClick={() => onRowClick?.(row)}
                    className={`transition-colors ${
                      onRowClick ? 'cursor-pointer' : ''
                    } ${
                      isSelected
                        ? 'bg-primary/5 dark:bg-primary/10'
                        : 'hover:bg-surface-secondary/50 dark:hover:bg-slate-800/30'
                    }`}
                  >
                    {selectable && (
                      <td className={`${cellPadding} w-12`}>
                        <button
                          onClick={(e) => { e.stopPropagation(); handleSelectRow(rowId); }}
                          className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
                            isSelected
                              ? 'bg-primary border-primary'
                              : 'border-border-strong dark:border-slate-600 hover:border-primary'
                          } btn-press`}
                          aria-label={`Select row ${rowIdx + 1}`}
                        >
                          {isSelected && <Check className="w-3 h-3 text-white" />}
                        </button>
                      </td>
                    )}
                    {columns.map((col, colIdx) => {
                      const value = getCellValue(row, col);
                      return (
                        <td
                          key={colIdx}
                          className={`${cellPadding} text-sm text-text-primary dark:text-slate-300 font-medium ${col.cellClassName || ''} ${col.sticky ? 'sticky left-0 z-10 bg-white dark:bg-dark-card border-r border-slate-200 dark:border-slate-700' : ''}`}
                        >
                          {renderCellValue(row, col, value)}
                        </td>
                      );
                    })}
                  </tr>
                );
              })
            ) : (
              !isLoading && (
                <tr>
                  <td colSpan={columns.length + (selectable ? 1 : 0)} className={`${cellPadding} text-center`}>
                    <EmptyState />
                  </td>
                </tr>
              )
            )}
          </tbody>
        </table>
      </div>

      {/* Mobile Card View */}
      <div className="md:hidden relative min-h-[100px]">
        {isLoading && (
          <div className="absolute inset-0 bg-white/70 dark:bg-dark-bg/60 backdrop-blur-[1px] flex items-center justify-center z-10">
            <LoadingSpinner size="medium" />
          </div>
        )}

        {sortedData.length > 0 ? (
          <div className="divide-y divide-border dark:divide-dark-border">
            {sortedData.map((row, rowIdx) => {
              const rowId = row.id || rowIdx;
              const isSelected = selectedRows.includes(rowId);
              return (
                <div
                  key={rowId}
                  onClick={() => onRowClick?.(row)}
                  className={`p-4 space-y-2.5 transition-colors ${
                    onRowClick ? 'cursor-pointer' : ''
                  } ${
                    isSelected
                      ? 'bg-primary/5 dark:bg-primary/10'
                      : 'hover:bg-surface-secondary/50 dark:hover:bg-slate-800/30'
                  }`}
                >
                  {selectable && (
                    <div className="flex items-center justify-between">
                      <button
                        onClick={(e) => { e.stopPropagation(); handleSelectRow(rowId); }}
                        className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
                          isSelected
                            ? 'bg-primary border-primary'
                            : 'border-border-strong dark:border-slate-600'
                        } btn-press`}
                        aria-label={`Select row ${rowIdx + 1}`}
                      >
                        {isSelected && <Check className="w-3 h-3 text-white" />}
                      </button>
                    </div>
                  )}
                  {columns.map((col, colIdx) => {
                    const value = getCellValue(row, col);
                    if (col.render) {
                      return (
                        <div key={colIdx} className="flex items-start justify-between gap-3">
                          <span className="text-2xs font-bold uppercase tracking-wider text-text-tertiary dark:text-slate-500 shrink-0 mt-0.5">
                            {col.header}
                          </span>
                          <span className="text-sm text-text-primary dark:text-slate-300 font-medium text-right min-w-0">
                            {renderCellValue(row, col, value)}
                          </span>
                        </div>
                      );
                    }
                    if (value === null || value === undefined || value === '' || value === '-') return null;
                    return (
                      <div key={colIdx} className="flex items-start justify-between gap-3">
                        <span className="text-2xs font-bold uppercase tracking-wider text-text-tertiary dark:text-slate-500 shrink-0 mt-0.5">
                          {col.header}
                        </span>
                        <span className="text-sm text-text-primary dark:text-slate-300 font-medium text-right min-w-0">
                          {renderCellValue(row, col, value)}
                        </span>
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        ) : (
          !isLoading && (
            <div className="px-6 py-12 text-center">
              <EmptyState />
            </div>
          )
        )}
      </div>

      {/* Pagination */}
      {pagination && pagination.totalPages > 1 && (
        <div className="px-4 md:px-6 py-4 border-t border-border dark:border-dark-border flex items-center justify-between text-sm text-text-secondary dark:text-slate-400">
          <div className="text-xs sm:text-sm">
            <span className="hidden sm:inline">Showing </span>
            <span className="font-semibold text-text-primary dark:text-slate-200">{(pagination.page - 1) * pagination.limit + 1}</span>
            <span className="hidden sm:inline"> to </span>
            <span className="font-semibold text-text-primary dark:text-slate-200 sm:hidden">-</span>
            <span className="hidden sm:inline">
              <span className="font-semibold text-text-primary dark:text-slate-200">
                {Math.min(pagination.page * pagination.limit, pagination.total)}
              </span>{' '}
              of{' '}
              <span className="font-semibold text-text-primary dark:text-slate-200">{pagination.total}</span> entries
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrevPage}
              disabled={pagination.page <= 1}
              className="p-2 border border-border dark:border-dark-border rounded-xl hover:bg-surface-secondary dark:hover:bg-slate-800 disabled:opacity-50 disabled:hover:bg-transparent transition-colors btn-press"
              aria-label="Previous page"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="px-1 sm:px-3 text-xs sm:text-sm">
              <span className="font-semibold text-text-primary dark:text-slate-200">{pagination.page}</span>
              <span className="text-text-tertiary dark:text-slate-500">/{pagination.totalPages}</span>
            </span>
            <button
              onClick={handleNextPage}
              disabled={pagination.page >= pagination.totalPages}
              className="p-2 border border-border dark:border-dark-border rounded-xl hover:bg-surface-secondary dark:hover:bg-slate-800 disabled:opacity-50 disabled:hover:bg-transparent transition-colors btn-press"
              aria-label="Next page"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
