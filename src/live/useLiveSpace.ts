import { useSpaceData } from "./useSpaceData";

export function useLiveSpace(slug = "coven") {
  const data = useSpaceData(slug);
  return { ...data, widgets: data.widgets ?? [] };
}
