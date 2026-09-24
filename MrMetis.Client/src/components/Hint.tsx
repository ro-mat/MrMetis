import { FC, ReactNode } from "react";

export interface IHintProps {
  children?: ReactNode;
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
