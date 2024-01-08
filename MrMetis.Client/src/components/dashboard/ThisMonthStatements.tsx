import StatementTable from "components/StatementTable";
import moment from "moment";
import { FC, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useSelector } from "react-redux";
import { AppState } from "store/store";

export interface IThisMonthStatementsProps {
  relativeMonthNr: number;
}

const ThisMonthStatements: FC<IThisMonthStatementsProps> = ({
  relativeMonthNr,
}) => {
  const { t } = useTranslation();
  const relativeMonth = useMemo(
    () => moment().add(relativeMonthNr, "M"),
    [relativeMonthNr]
  );

  const { statements } = useSelector((state: AppState) => state.data.userdata);

  const monthStatements = useMemo(
    () => statements.filter((s) => moment(s.date).isSame(relativeMonth, "M")),
    [statements, relativeMonth]
  );
  return (
    <div>
      <h3>{t("dashboard.thisMonthStatements")}</h3>
      <StatementTable statements={monthStatements} />
    </div>
  );
};

export default ThisMonthStatements;
