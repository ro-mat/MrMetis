import { FC } from "react";

export interface IHintProps {
  label: string;
  labelClass?: string;
}

const Hint: FC<IHintProps> = ({ label, labelClass, children }) => {
  return (
    <div className={`hint ${!!labelClass && labelClass}`}>
      <label>{label}</label>
      <div>{children}</div>
    </div>
  );
};

export default Hint;
