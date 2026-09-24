import React, { useMemo } from "react";
import { useDispatch, useSelector } from "react-redux";
import { AppState, TAppDispatch } from "store/store";
import { EditButton, PageHeader } from "components/ui";
import AccountAddOrEdit from "components/account/AccountAddOrEdit";
import { SET_SELECTED_ACCOUNT } from "store/ui/ui.slice";
import { useTranslation } from "react-i18next";

const AccountsPage = () => {
  const dispatch = useDispatch<TAppDispatch>();
  const { t } = useTranslation();

  const { isFetching } = useSelector((state: AppState) => state.data);
  const { accounts } = useSelector((state: AppState) => state.data.userdata);
  const { selectedAccountId } = useSelector((state: AppState) => state.ui.ui);

  const showAddOrEdit = useMemo(
    () => selectedAccountId !== undefined,
    [selectedAccountId]
  );

  const onEditAccountClick = (id: number) => {
    dispatch(SET_SELECTED_ACCOUNT(id));
  };

  return (
    <>
      <PageHeader
        title="account.header"
        isOpen={showAddOrEdit}
        onToggle={() =>
          dispatch(SET_SELECTED_ACCOUNT(showAddOrEdit ? undefined : 0))
        }
      />
      {!isFetching && (
        <>
          {showAddOrEdit && <AccountAddOrEdit />}
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
                      <EditButton onClick={() => onEditAccountClick(a.id)} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </>
  );
};

export default AccountsPage;
