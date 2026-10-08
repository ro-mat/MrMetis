import React from "react";
import { useSelector } from "react-redux";
import { AppState } from "store/store";
import StatementAddOrEdit from "components/statement/StatementAddOrEdit";
import StatementTable from "components/StatementTable";
import { NoData, PageHeader } from "components/ui";
import useStatement from "hooks/useStatement";
import useEditRoute from "hooks/useEditRoute";

const StatementsPage = () => {
  const { isFetching, loaded } = useSelector((state: AppState) => state.data);
  const { statements } = useSelector((state: AppState) => state.data.userdata);

  const { getById } = useStatement();
  const { selectedId, openNew, openEdit, close } = useEditRoute("/list");

  const showAddOrEdit = selectedId === 0 || !!getById(selectedId);

  return (
    <>
      <PageHeader
        title="statement.header"
        isOpen={showAddOrEdit}
        onToggle={showAddOrEdit ? close : openNew}
      />
      {!isFetching && (
        <>
          {showAddOrEdit && (
            <StatementAddOrEdit id={selectedId!} onClose={close} />
          )}
          {loaded && statements.length === 0 ? (
            <NoData message="noData.statements" />
          ) : (
            <div>
              <StatementTable
                statements={statements}
                editButtonHandler={openEdit}
                topRows={50}
              />
            </div>
          )}
        </>
      )}
    </>
  );
};

export default StatementsPage;
