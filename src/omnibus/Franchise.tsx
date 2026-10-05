import { lazy, Suspense, useEffect } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { firstSheetError, useLibrary } from "../app/library";
import { inEditableField } from "../common/keyboard";
import { SheetErrorSnackbar } from "../common/SheetErrorSnackbar";

/**
 * The page's one `import()`, at module scope: the React Compiler cannot lower an import expression,
 * and one written inside a component takes that whole function out of compilation.
 */
const loadPage = () => import("./FranchisePage");

const FranchisePage = lazy(loadPage);

/**
 * A franchise's own page, at `#/omnibus/franchise/<name>`.
 *
 * The entry the router mounts eagerly, holding nothing but the wait for the library: the page
 * itself is a chunk of its own, fetched on mount, so the charts it draws stay off every other
 * page's first paint. Like the Omnibus it renders nothing until all four sheets have arrived — a
 * franchise met in three media and drawn from two is a wrong answer rather than a partial one.
 *
 * Escape leaves it, as it closes every layer the page opens: back to wherever the reader came from,
 * or to the Omnibus for a page opened straight from its address, where back would leave the app.
 * A layer open over the page — a card, a drill-down, the box — takes the press first and stops it
 * there, so one press closes the layer and a second leaves the page; a field keeps its own Escape.
 */
const Franchise = () => {
  useEffect(() => {
    void loadPage().catch(() => {});
  }, []);
  const { name } = useParams();
  const navigate = useNavigate();
  // The router's key for the entry the page was opened at, "default" for the first in this tab.
  const { key } = useLocation();

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape" || event.defaultPrevented || inEditableField(event.target)) return;
      if (key === "default") navigate("/omnibus");
      else navigate(-1);
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [key, navigate]);
  const { whole: library, items, error } = useLibrary();

  return (
    <>
      {library && items && name && (
        <Suspense>
          <FranchisePage
            franchise={name}
            library={library}
            items={items}
          />
        </Suspense>
      )}
      <SheetErrorSnackbar error={firstSheetError(error)} />
    </>
  );
};

export default Franchise;
