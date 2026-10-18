import React, { FC, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useTranslation } from "react-i18next";
import { Outlet } from "react-router-dom";
import { AppState, TAppDispatch } from "store/store";
import { SET_FILTER } from "store/ui/ui.slice";
import { FilterName } from "store/ui/ui.types";
import { MonthRange } from "components/ui";

export interface ISideNavProps {
  // whose month range it shows and changes
  name: FilterName;
}

const MIN_MONTH = -6;
const MAX_MONTH = 18;

const clamp = (value: number) => Math.min(Math.max(value, MIN_MONTH), MAX_MONTH);

// per device (not in the user's settings), shared by every page with a range
const COLLAPSED_KEY = "monthRangeCollapsed";

const readCollapsed = () => {
  try {
    return localStorage.getItem(COLLAPSED_KEY) === "true";
  } catch {
    return false;
  }
};

const FilterLayout: FC<ISideNavProps> = ({ name }) => {
  const dispatch = useDispatch<TAppDispatch>();
  const { t } = useTranslation();
  const [collapsed, setCollapsed] = useState(readCollapsed);

  const filter = useSelector((state: AppState) => state.ui.ui.filters[name]);
  // a stored range may reach past the timeline
  const from = clamp(filter?.fromRelativeMonth ?? -1);
  const to = Math.max(clamp(filter?.toRelativeMonth ?? 5), from);

  const handleChange = (fromRelativeMonth: number, toRelativeMonth: number) =>
    dispatch(
      SET_FILTER({ name, filter: { fromRelativeMonth, toRelativeMonth } })
    );

  const handleToggle = () => {
    setCollapsed(!collapsed);
    try {
      localStorage.setItem(COLLAPSED_KEY, String(!collapsed));
    } catch {
      // not stored, e.g. in a private window
    }
  };

  return (
    <div className="flex column">
      <MonthRange
        label={t("filter.months")}
        from={from}
        to={to}
        min={MIN_MONTH}
        max={MAX_MONTH}
        collapsed={collapsed}
        onToggle={handleToggle}
        onChange={handleChange}
      />
      <div className="sitewidth">
        <Outlet />
      </div>
    </div>
  );
};

export default FilterLayout;
