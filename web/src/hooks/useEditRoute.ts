import { useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";

const NEW_ID = "new";

// Which item of a list page is open for add/edit, driven by the `:id?` url
// segment: undefined = closed, 0 = new, n = editing item n.
const useEditRoute = (basePath: string) => {
  const { id } = useParams();
  const navigate = useNavigate();

  const parsedId =
    id === undefined ? undefined : id === NEW_ID ? 0 : Number(id);
  const isInvalid = parsedId !== undefined && !Number.isInteger(parsedId);

  useEffect(() => {
    if (isInvalid) {
      navigate(basePath, { replace: true });
    }
  }, [isInvalid, basePath, navigate]);

  return {
    selectedId: isInvalid ? undefined : parsedId,
    openNew: () => navigate(`${basePath}/${NEW_ID}`),
    openEdit: (id: number) => navigate(`${basePath}/${id}`),
    close: () => navigate(basePath),
  };
};

export default useEditRoute;
