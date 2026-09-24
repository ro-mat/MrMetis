// Joins the truthy class names: cx("btn", isOn && "primary")
export const cx = (...classes: (string | false | null | undefined)[]) =>
  classes.filter(Boolean).join(" ");
