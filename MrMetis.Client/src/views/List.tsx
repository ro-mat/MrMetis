import React, { useMemo } from "react";
import { useDispatch, useSelector } from "react-redux";
import { AppState, TAppDispatch } from "store/store";
import ListAddOrEdit from "components/ListAddOrEdit";
import { SET_SELECTED_STATEMENT } from "store/ui/ui.slice";
import StatementTable from "components/StatementTable";
import { useTranslation } from "react-i18next";

const List = () => {
  const dispatch = useDispatch<TAppDispatch>();
  const { t } = useTranslation();

  const { isFetching } = useSelector((state: AppState) => state.data);
  const { statements } = useSelector((state: AppState) => state.data.userdata);

  const { selectedStatementId } = useSelector((state: AppState) => state.ui.ui);

  const showAddOrEdit = useMemo(
    () => selectedStatementId !== undefined,
    [selectedStatementId]
  );

  const onEditStatementClick = (id: number) => {
    dispatch(SET_SELECTED_STATEMENT(id));
  };

  return (
    <>
      <div className="head-wrapper">
        <h2>{t("statement.header")}</h2>
        <button
          onClick={() =>
            dispatch(SET_SELECTED_STATEMENT(showAddOrEdit ? undefined : 0))
          }
        >
          {showAddOrEdit ? "-" : "+"}
        </button>
      </div>
      {!isFetching && (
        <>
          {showAddOrEdit && <ListAddOrEdit />}
          <div>
            <StatementTable
              statements={statements}
              editButtonHandler={onEditStatementClick}
            />
          </div>
        </>
      )}
    </>
  );
};

export default List;
