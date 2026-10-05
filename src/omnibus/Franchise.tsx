import { lazy, Suspense, useEffect } from "react";
import { useParams } from "react-router-dom";
import { firstSheetError, useLibrary } from "../app/library";
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
 */
const Franchise = () => {
  useEffect(() => {
    void loadPage().catch(() => {});
  }, []);
  const { name } = useParams();
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
