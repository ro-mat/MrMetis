import React, { useMemo } from "react";
import { useDispatch, useSelector } from "react-redux";
import { AppState, TAppDispatch } from "store/store";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faPenToSquare } from "@fortawesome/free-regular-svg-icons";
import AccountAddOrEdit from "views/Account/AccountAddOrEdit";
import { SET_SELECTED_ACCOUNT } from "store/ui/ui.slice";
import { useTranslation } from "react-i18next";

const Accounts = () => {
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
      <div className="head-wrapper">
        <h2>{t("account.header")}</h2>
        <button
          onClick={() =>
            dispatch(SET_SELECTED_ACCOUNT(showAddOrEdit ? undefined : 0))
          }
        >
          {showAddOrEdit ? "-" : "+"}
        </button>
      </div>
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
                      <button
                        type="button"
                        className="small"
                        onClick={() => onEditAccountClick(a.id)}
                      >
                        <FontAwesomeIcon icon={faPenToSquare} />
                      </button>
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

export default Accounts;
