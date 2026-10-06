import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect } from "react";

/**
 * Opens the page's create form when the URL carries `?create=1` (the tab bar
 * "+" and the Inicio shortcuts), then drops the flag so Back and refresh
 * don't reopen it. Needs a Suspense boundary above (useSearchParams).
 */
export function useCreateParam(onCreate: () => void, ready: boolean) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const wantsCreate = searchParams.get("create") === "1";

  useEffect(() => {
    if (!wantsCreate || !ready) return;
    router.replace(pathname);
    onCreate();
  }, [wantsCreate, ready, onCreate, router, pathname]);
}
