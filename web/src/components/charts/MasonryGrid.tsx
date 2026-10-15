import React, { FC, ReactNode, useLayoutEffect, useRef } from "react";

// px of one grid row (grid-auto-rows) and the space under each item, both as
// in styles/charts.scss
const ROW = 4;
const GAP = 24;

interface IMasonryGridProps {
  className?: string;
  children: ReactNode;
}

// A grid whose items keep their own height: each spans as many small rows as
// it is tall, so the grid places them left to right and moves each one up
// into the space under a shorter item above it.
const MasonryGrid: FC<IMasonryGridProps> = ({ className, children }) => {
  const ref = useRef<HTMLDivElement>(null);

  // after every render: the items may have changed
  useLayoutEffect(() => {
    const grid = ref.current;
    if (!grid) return;
    const items = Array.from(grid.children) as HTMLElement[];

    const fit = (item: HTMLElement) => {
      const height = item.getBoundingClientRect().height;
      item.style.gridRowEnd = `span ${Math.ceil((height + GAP) / ROW)}`;
    };
    items.forEach(fit);

    // charts size themselves after mounting, and a budget opened in a chart
    // changes its height
    const observer = new ResizeObserver((entries) =>
      entries.forEach((e) => fit(e.target as HTMLElement)),
    );
    items.forEach((item) => observer.observe(item));
    return () => observer.disconnect();
  });

  return (
    <div ref={ref} className={className}>
      {children}
    </div>
  );
};

export default MasonryGrid;
