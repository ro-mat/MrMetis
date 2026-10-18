import React, {
  KeyboardEvent,
  PointerEvent,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import moment from "moment";
import { useTranslation } from "react-i18next";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faChevronDown,
  faChevronRight,
} from "@fortawesome/free-solid-svg-icons";
import { formatInLanguage } from "helpers/dateHelper";
import { range as rangeOf } from "helpers/arrayHelper";
import { cx } from "./cx";

// width of one month, px; fixed so a drag's distance maps to whole months
export const CELL_WIDTH = 56;

type Mode = "from" | "to" | "band";

interface IDrag {
  mode: Mode;
  startX: number;
  startScroll: number;
  from: number;
  to: number;
}

interface IMonthRangeProps {
  label: string;
  // months relative to the current one
  from: number;
  to: number;
  min?: number;
  max?: number;
  // only the label and the summary are shown
  collapsed?: boolean;
  onToggle?: () => void;
  // when a drag ends or on each key press, not while dragging
  onChange: (from: number, to: number) => void;
}

const clamp = (value: number, low: number, high: number) =>
  Math.min(Math.max(value, low), high);

const monthOf = (offset: number) => moment().startOf("M").add(offset, "M");

// A scrollable timeline of months with a selected range: its ends and the
// whole range can be dragged, clicking a month outside moves the nearer end.
const MonthRange = ({
  label,
  from,
  to,
  min = -6,
  max = 18,
  collapsed = false,
  onToggle,
  onChange,
}: IMonthRangeProps) => {
  const { t } = useTranslation();
  const scrollRef = useRef<HTMLDivElement>(null);
  const drag = useRef<IDrag>(undefined);
  // the range while dragging, shown instead of from/to
  const [draft, setDraft] = useState<[number, number]>();
  const [fade, setFade] = useState({ left: false, right: false });
  // the range scrolled into view when the months are shown
  const [initial, setInitial] = useState({ from, to });

  const [shownFrom, shownTo] = draft ?? [from, to];

  const moved = (
    mode: Mode,
    start: { from: number; to: number },
    delta: number
  ): [number, number] => {
    if (mode === "band") {
      const d = clamp(delta, min - start.from, max - start.to);
      return [start.from + d, start.to + d];
    }
    return mode === "from"
      ? [clamp(start.from + delta, min, start.to), start.to]
      : [start.from, clamp(start.to + delta, start.from, max)];
  };

  const updateFade = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    setFade({
      left: el.scrollLeft > 0,
      right: el.scrollLeft + el.clientWidth < el.scrollWidth - 1,
    });
  }, []);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const middle = ((initial.from + initial.to + 1) / 2 - min) * CELL_WIDTH;
    el.scrollLeft = middle - el.clientWidth / 2;
    updateFade();

    // a vertical wheel scrolls the months; passive: false to keep the page still
    const onWheel = (e: WheelEvent) => {
      if (
        Math.abs(e.deltaY) <= Math.abs(e.deltaX) ||
        el.scrollWidth <= el.clientWidth
      )
        return;
      el.scrollLeft += e.deltaY;
      e.preventDefault();
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    window.addEventListener("resize", updateFade);
    return () => {
      el.removeEventListener("wheel", onWheel);
      window.removeEventListener("resize", updateFade);
    };
  }, [initial, collapsed, min, updateFade]);

  const handleToggle = () => {
    if (collapsed) setInitial({ from, to });
    onToggle?.();
  };

  const handlePointerDown = (mode: Mode, e: PointerEvent) => {
    if (e.button !== 0) return;
    e.stopPropagation();
    e.preventDefault();
    e.currentTarget.setPointerCapture?.(e.pointerId);
    drag.current = {
      mode,
      startX: e.clientX,
      startScroll: scrollRef.current?.scrollLeft ?? 0,
      from,
      to,
    };
    setDraft([from, to]);
  };

  const handlePointerMove = (e: PointerEvent) => {
    const d = drag.current;
    const el = scrollRef.current;
    if (!d || !el) return;

    // near an edge the months scroll along
    const rect = el.getBoundingClientRect();
    if (rect.width > 0) {
      if (e.clientX < rect.left + CELL_WIDTH) el.scrollLeft -= CELL_WIDTH / 4;
      if (e.clientX > rect.right - CELL_WIDTH) el.scrollLeft += CELL_WIDTH / 4;
    }

    const distance = e.clientX - d.startX + el.scrollLeft - d.startScroll;
    setDraft(moved(d.mode, d, Math.round(distance / CELL_WIDTH)));
  };

  const handlePointerUp = () => {
    if (!drag.current) return;
    drag.current = undefined;
    if (draft && (draft[0] !== from || draft[1] !== to)) {
      onChange(draft[0], draft[1]);
    }
    setDraft(undefined);
  };

  const handlePointerCancel = () => {
    drag.current = undefined;
    setDraft(undefined);
  };

  const handleKeyDown = (mode: Mode, e: KeyboardEvent) => {
    const span = max - min;
    const delta = { ArrowLeft: -1, ArrowRight: 1, Home: -span, End: span }[
      e.key
    ];
    if (delta === undefined) return;
    e.preventDefault();
    e.stopPropagation();
    const [newFrom, newTo] = moved(mode, { from, to }, delta);
    if (newFrom !== from || newTo !== to) onChange(newFrom, newTo);
  };

  const handleCellClick = (offset: number) => {
    if (offset < from) onChange(offset, to);
    if (offset > to) onChange(from, offset);
  };

  const monthText = (offset: number) =>
    formatInLanguage(monthOf(offset), "MMMM YYYY");

  return (
    <div className="month-range">
      <div className="month-range-header">
        {onToggle ? (
          <button
            type="button"
            className="month-range-toggle"
            aria-expanded={!collapsed}
            onClick={handleToggle}
          >
            <FontAwesomeIcon
              icon={collapsed ? faChevronRight : faChevronDown}
              fixedWidth
            />
            {label}
          </button>
        ) : (
          <label>{label}</label>
        )}
        <span className="month-range-summary">
          {t("filter.summary", {
            from: formatInLanguage(monthOf(shownFrom), "MMM YYYY"),
            to: formatInLanguage(monthOf(shownTo), "MMM YYYY"),
            count: shownTo - shownFrom + 1,
          })}
        </span>
      </div>
      {!collapsed && (
        <div
          className={cx(
            "month-range-scroll",
            fade.left && "fade-left",
            fade.right && "fade-right"
          )}
          ref={scrollRef}
          onScroll={updateFade}
        >
          <div
            className={cx("month-range-track", draft && "dragging")}
            style={{ width: (max - min + 1) * CELL_WIDTH }}
          >
            {rangeOf(min, max).map((offset) => {
              const month = monthOf(offset);
              const yearStart = offset === min || month.month() === 0;
              return (
                <div
                  key={offset}
                  className={cx(
                    "month-cell",
                    offset >= shownFrom && offset <= shownTo && "selected",
                    offset === 0 && "today",
                    yearStart && offset !== min && "year-start"
                  )}
                  style={{ width: CELL_WIDTH }}
                  onClick={() => handleCellClick(offset)}
                >
                  <span className="year">{yearStart ? month.year() : ""}</span>
                  <span className="month">
                    {formatInLanguage(month, "MMM")}
                  </span>
                </div>
              );
            })}
            <div
              className="month-range-band"
              style={{
                left: (shownFrom - min) * CELL_WIDTH,
                width: (shownTo - shownFrom + 1) * CELL_WIDTH,
              }}
              tabIndex={0}
              role="group"
              aria-label={t("filter.moveRange")}
              onPointerDown={(e) => handlePointerDown("band", e)}
              onKeyDown={(e) => handleKeyDown("band", e)}
              // the handles' captured pointer events bubble up here too
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              onPointerCancel={handlePointerCancel}
            >
              {(["from", "to"] as const).map((mode) => {
                const value = mode === "from" ? shownFrom : shownTo;
                return (
                  <div
                    key={mode}
                    className={`month-range-handle ${mode}`}
                    tabIndex={0}
                    role="slider"
                    aria-label={t(`filter.${mode}`)}
                    aria-valuemin={min}
                    aria-valuemax={max}
                    aria-valuenow={value}
                    aria-valuetext={monthText(value)}
                    onPointerDown={(e) => handlePointerDown(mode, e)}
                    onKeyDown={(e) => handleKeyDown(mode, e)}
                  />
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MonthRange;
