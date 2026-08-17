import { useState, useRef, useEffect } from 'react';

export default function VirtualizedTaskList({ items, rowHeight = 50, viewportHeight = 400, renderRow }) {
  const [scrollTop, setScrollTop] = useState(0);
  const containerRef = useRef(null);

  const totalItems = items.length;
  const totalHeight = totalItems * rowHeight;
  
  const startIndex = Math.max(0, Math.floor(scrollTop / rowHeight) - 2);
  const endIndex = Math.min(totalItems - 1, Math.floor((scrollTop + viewportHeight) / rowHeight) + 2);
  
  const visibleItems = items.slice(startIndex, endIndex + 1);
  const offsetY = startIndex * rowHeight;

  const handleScroll = (e) => {
    setScrollTop(e.target.scrollTop);
  };

  return (
    <div
      ref={containerRef}
      onScroll={handleScroll}
      style={{ height: viewportHeight, overflowY: 'auto', position: 'relative', border: '1px solid var(--theme-border)', borderRadius: '0.5rem' }}
    >
      <div style={{ height: totalHeight, width: '100%', position: 'relative' }}>
        <div style={{ transform: `translateY(${offsetY}px)`, position: 'absolute', top: 0, left: 0, right: 0 }}>
          {visibleItems.map((item, idx) => renderRow(item, startIndex + idx))}
        </div>
      </div>
    </div>
  );
}
