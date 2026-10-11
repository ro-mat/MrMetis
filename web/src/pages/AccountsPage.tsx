import React from "react";
import { useSelector } from "react-redux";
import { AppState } from "store/store";
import { EditButton, NoData, PageHeader } from "components/ui";
import AccountAddOrEdit from "components/account/AccountAddOrEdit";
import { useTranslation } from "react-i18next";
import useAccount from "hooks/useAccount";
import useEditRoute from "hooks/useEditRoute";

const AccountsPage = () => {
  const { t } = useTranslation();

  const { isFetching, loaded } = useSelector((state: AppState) => state.data);
  const { accounts } = useSelector((state: AppState) => state.data.userdata);
  const { getById } = useAccount();
  const { selectedId, openNew, openEdit, close } = useEditRoute("/accounts");

  const showAddOrEdit = selectedId === 0 || !!getById(selectedId);

  return (
    <>
      <PageHeader
        title="account.header"
        isOpen={showAddOrEdit}
        onToggle={showAddOrEdit ? close : openNew}
      />
      {!isFetching && (
        <>
          {showAddOrEdit && (
            <AccountAddOrEdit id={selectedId!} onClose={close} />
          )}
          {loaded && accounts.length === 0 ? (
            <NoData message="noData.accounts" />
          ) : (
            <div>
              <table>
                <thead>
                  <tr>
                    <th>{t("account.id")}</th>
                    <th>{t("account.name")}</th>
                    <th>&nbsp;</th>
                  </tr>
                </thead>
                <tbody>
                  {accounts.map((a) => (
                    <tr key={a.id}>
                      <td>{a.id}</td>
                      <td>{a.name}</td>
                      <td>
                        <EditButton onClick={() => openEdit(a.id)} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </>
  );
};

export default AccountsPage;
