import React, { useMemo } from "react";
import { useDispatch, useSelector } from "react-redux";
import { AppState, TAppDispatch } from "store/store";
import StatementAddOrEdit from "components/statement/StatementAddOrEdit";
import { SET_SELECTED_STATEMENT } from "store/ui/ui.slice";
import StatementTable from "components/StatementTable";
import { PageHeader } from "components/ui";

const StatementsPage = () => {
  const dispatch = useDispatch<TAppDispatch>();

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
      <PageHeader
        title="statement.header"
        isOpen={showAddOrEdit}
        onToggle={() =>
          dispatch(SET_SELECTED_STATEMENT(showAddOrEdit ? undefined : 0))
        }
      />
      {!isFetching && (
        <>
          {showAddOrEdit && <StatementAddOrEdit />}
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

export default StatementsPage;
