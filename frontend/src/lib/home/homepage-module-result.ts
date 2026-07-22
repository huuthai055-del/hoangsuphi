export type HomepageModuleResult<T> =
  | {
      status: "success";
      data: T;
    }
  | {
      status: "empty";
    }
  | {
      status: "error";
    };

export async function loadHomepageModule<T>(
  loader: () => Promise<T | null | undefined>,
  isEmpty?: (value: T | null | undefined) => boolean,
): Promise<HomepageModuleResult<T>> {
  try {
    const data = await loader();
    if (
      isEmpty
        ? isEmpty(data)
        : data === null ||
          data === undefined ||
          (Array.isArray(data) && data.length === 0)
    ) {
      return { status: "empty" };
    }
    return { status: "success", data: data as T };
  } catch {
    // Return typed error without throwing raw exceptions out to UI
    return { status: "error" };
  }
}
