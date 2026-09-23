'useclient';

import React, { useState } from 'react';

// Bảng màu hiện đại cho các model trên Donut Chart
const PALETTE = [
  '#8b5cf6', // Tím hoa cà
  '#3b82f6', // Xanh dương
  '#06b6d4', // Cyan / Xanh biển
  '#10b981', // Xanh ngọc lục bảo
  '#f59e0b', // Vàng hổ phách
  '#ec4899', // Hồng phấn
  '#6366f1', // Indigo tím
  '#14b8a6', // Teal ngọc lam
  '#f97316', // Cam rực rỡ
  '#a855f7', // Tím thạch anh
  '#64748b', // Xám lam
];

/**
 * Component hiển thị Donut Chart phân bổ theo Model
 * theo đúng phong cách thiết kế mẫu: Card bo tròn, tiêu đề kèm icon, dropdown filter góc trên,
 * donut chart ở tâm và legend chi tiết bên cạnh.
 */
export default function ModelDistributionChart({
  availableModels = [],
  selectedModel = 'all',
  onSelectModel = () => {},
  totalScans = 0,
  successScans = 0,
  errorScans = 0,
}) {
  const [hoveredIndex, setHoveredIndex] = useState(null);

  // Chuẩn bị dữ liệu hiển thị lát cắt
  let slices = [];
  const isFilteringSingleModel = selectedModel && selectedModel !== 'all';

  if (isFilteringSingleModel) {
    // Khi chọn 1 model cụ thể: Donut Chart biểu diễn phân bổ Thành công vs Thất bại của model đó
    const totalCurrent = successScans + errorScans;
    if (totalCurrent > 0) {
      slices = [
        {
          name: 'Thành công',
          count: successScans,
          percent: ((successScans / totalCurrent) * 100).toFixed(1),
          color: '#10b981', // Xanh lá
        },
        {
          name: 'Thất bại',
          count: errorScans,
          percent: ((errorScans / totalCurrent) * 100).toFixed(1),
          color: '#ef4444', // Đỏ cam
        },
      ].filter((s) => s.count > 0);
    }
  } else {
    // Khi chọn "Tất cả model": Donut Chart biểu diễn thị phần từng model
    const totalAll = availableModels.reduce((acc, m) => acc + m.total, 0);
    if (totalAll > 0) {
      slices = availableModels.map((item, idx) => ({
        id: item.modelId,
        name: item.modelName || item.modelId,
        count: item.total,
        percent: ((item.total / totalAll) * 100).toFixed(1),
        color: PALETTE[idx % PALETTE.length],
        success: item.success,
        error: item.error,
      }));
    }
  }

  // Tính toán các cung tròn SVG (C = 2 * PI * r)
  const radius = 58;
  const strokeWidth = 24;
  const circumference = 2 * Math.PI * radius;

  let cumulativePercent = 0;
  const renderedSlices = slices.map((slice, index) => {
    const strokeDasharray = `${(slice.percent / 100) * circumference} ${circumference}`;
    const strokeDashoffset = -((cumulativePercent / 100) * circumference);
    cumulativePercent += Number(slice.percent);
    return {
      ...slice,
      strokeDasharray,
      strokeDashoffset,
      index,
    };
  });

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 border border-gray-100 dark:border-gray-700 shadow-sm transition-all duration-200">
      {/* Header của Card */}
      <div className="flex items-center justify-between gap-3 mb-5">
        <div className="flex items-center gap-2.5">
          <div className="w-6 h-6 rounded-full bg-amber-100 dark:bg-amber-900/40 flex items-center justify-center text-amber-700 dark:text-amber-300 text-xs">
            🟤
          </div>
          <h3 className="font-bold text-gray-800 dark:text-gray-100 text-base md:text-lg">
            Phân bổ theo Model
          </h3>
        </div>

        {/* Dropdown Filter Model */}
        <div className="relative">
          <select
            value={selectedModel}
            onChange={(e) => onSelectModel(e.target.value)}
            className="appearance-none bg-gray-50 dark:bg-gray-700/60 hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200 text-xs md:text-sm font-medium py-1.5 pl-3 pr-8 rounded-xl border border-gray-200 dark:border-gray-600 focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer transition-colors shadow-2xs"
          >
            <option value="all">Tất cả model</option>
            {availableModels.map((m) => (
              <option key={m.modelId} value={m.modelId}>
                {m.modelName || m.modelId} ({m.total})
              </option>
            ))}
          </select>
          <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2.5 text-gray-400">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        </div>
      </div>

      {/* Thân Card: Donut Chart & Legend */}
      {slices.length === 0 ? (
        <div className="py-12 text-center text-gray-400 dark:text-gray-500 text-sm">
          Chưa có dữ liệu quét trong chu kỳ này
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
          {/* Biểu đồ tròn Donut ở giữa / bên trái */}
          <div className="md:col-span-6 flex flex-col items-center justify-center relative">
            <div className="relative w-48 h-48 sm:w-52 sm:h-52 flex items-center justify-center">
              <svg
                viewBox="0 0 160 160"
                className="w-full h-full -rotate-90 transform transition-transform"
              >
                {/* Vòng tròn nền mờ */}
                <circle
                  cx="80"
                  cy="80"
                  r={radius}
                  stroke="currentColor"
                  strokeWidth={strokeWidth}
                  fill="transparent"
                  className="text-gray-100 dark:text-gray-700/50"
                />

                {/* Các lát cắt Donut */}
                {renderedSlices.map((slice) => {
                  const isHovered = hoveredIndex === slice.index;
                  return (
                    <circle
                      key={slice.index}
                      cx="80"
                      cy="80"
                      r={radius}
                      stroke={slice.color}
                      strokeWidth={isHovered ? strokeWidth + 4 : strokeWidth}
                      strokeDasharray={slice.strokeDasharray}
                      strokeDashoffset={slice.strokeDashoffset}
                      strokeLinecap="round"
                      fill="transparent"
                      className="transition-all duration-300 cursor-pointer"
                      onMouseEnter={() => setHoveredIndex(slice.index)}
                      onMouseLeave={() => setHoveredIndex(null)}
                    />
                  );
                })}
              </svg>

              {/* Tâm của Donut: Hiển thị tổng số lượt hoặc chi tiết lát cắt đang hover */}
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center">
                {hoveredIndex !== null && renderedSlices[hoveredIndex] ? (
                  <>
                    <span className="text-xs text-gray-500 dark:text-gray-400 font-medium truncate max-w-[110px]">
                      {renderedSlices[hoveredIndex].name}
                    </span>
                    <span className="text-xl sm:text-2xl font-black text-gray-800 dark:text-gray-100 tracking-tight">
                      {renderedSlices[hoveredIndex].count}
                    </span>
                    <span className="text-2xs font-semibold text-indigo-600 dark:text-indigo-400">
                      {renderedSlices[hoveredIndex].percent}%
                    </span>
                  </>
                ) : (
                  <>
                    <span className="text-2xs font-medium text-gray-400 uppercase tracking-wider">
                      {isFilteringSingleModel ? 'Lượt model' : 'Tổng lượt'}
                    </span>
                    <span className="text-2xl sm:text-3xl font-black text-gray-800 dark:text-gray-100 tracking-tight">
                      {isFilteringSingleModel ? successScans + errorScans : totalScans}
                    </span>
                    <span className="text-2xs text-gray-500 dark:text-gray-400 font-medium">
                      lượt quét
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Legend bên phải */}
          <div className="md:col-span-6 flex flex-col gap-2 max-h-56 overflow-y-auto pr-1">
            {renderedSlices.map((slice) => {
              const isHovered = hoveredIndex === slice.index;
              return (
                <div
                  key={slice.index}
                  onMouseEnter={() => setHoveredIndex(slice.index)}
                  onMouseLeave={() => setHoveredIndex(null)}
                  className={`flex items-center justify-between p-2 rounded-xl text-xs sm:text-sm transition-all duration-150 cursor-pointer ${
                    isHovered
                      ? 'bg-gray-100/80 dark:bg-gray-700/80 scale-[1.02]'
                      : 'hover:bg-gray-50 dark:hover:bg-gray-700/40'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0 pr-2">
                    <span
                      className="w-3 h-3 rounded-md shrink-0 shadow-2xs"
                      style={{ backgroundColor: slice.color }}
                    />
                    <span className="text-gray-700 dark:text-gray-200 font-medium truncate">
                      {slice.name}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <span className="font-bold text-gray-900 dark:text-gray-100">
                      {slice.count}
                    </span>
                    <span className="text-gray-400 dark:text-gray-500 font-medium text-2xs w-11 text-right">
                      ({slice.percent}%)
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
