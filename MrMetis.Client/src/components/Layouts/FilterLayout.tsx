import Slider from "@mui/material/Slider";
import moment from "moment";
import React, { FC, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Outlet } from "react-router-dom";
import { AppState, TAppDispatch } from "store/store";
import { SET_FILTER } from "store/ui/ui.slice";

export interface ISideNavProps {}

const FilterLayout: FC<ISideNavProps> = ({ children }) => {
  const dispatch = useDispatch<TAppDispatch>();

  const minThreshHold = 0;
  const maxThreshHold = 1;

  const { filter } = useSelector((state: AppState) => state.ui.ui);
  const [filterValues, setFilterValues] = useState<number[]>([
    filter?.fromRelativeMonth ?? -1,
    filter?.toRelativeMonth ?? 5,
  ]);

  const handleChange = (
    _: Event,
    newValue: number | number[],
    activeThumb: number
  ) => {
    const val = newValue as number[];
    if (
      (activeThumb === 0 && val[activeThumb] <= minThreshHold) ||
      (activeThumb === 1 && val[activeThumb] >= maxThreshHold)
    ) {
      setFilterValues([val[0], val[1]]);
    }
  };

  const handleChangeCommitted = () => {
    dispatch(
      SET_FILTER({
        fromRelativeMonth: filterValues[0],
        toRelativeMonth: filterValues[1],
      })
    );
  };

  const valueText = (value: number) => {
    return moment().add(value, "M").format("YYYY - MM (MMM)");
  };

  return (
    <div className="flex column">
      <div>
        <label>Relative range</label>
        <Slider
          min={-3}
          max={12}
          value={[...filterValues]}
          step={1}
          marks={true}
          onChange={handleChange}
          onChangeCommitted={handleChangeCommitted}
          valueLabelDisplay="auto"
          valueLabelFormat={valueText}
          disableSwap
        />
      </div>
      <div className="sitewidth">
        <Outlet />
      </div>
    </div>
  );
};

export default FilterLayout;
