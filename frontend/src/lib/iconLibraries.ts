import type { IconLibrary } from "./api/iconLibraries";

const styleId = (library: IconLibrary) => `project-icon-library-${library.id}`;

export function installIconLibrary(library: IconLibrary) {
  if (document.getElementById(styleId(library))) {
    return;
  }

  if (library.sourceUrl) {
    const link = document.createElement("link");
    link.id = styleId(library);
    link.rel = "stylesheet";
    link.href = library.sourceUrl;
    document.head.append(link);
    return;
  }

  if (library.cssContent) {
    const style = document.createElement("style");
    style.id = styleId(library);
    style.textContent = library.cssContent;
    document.head.append(style);
  }
}

export function iconDisplayName(library: IconLibrary, iconClass: string) {
  const marker = library.prefix ? `${library.prefix}-` : "";
  return marker && iconClass.startsWith(marker) ? iconClass.slice(marker.length) : iconClass;
}

export function renderedIconClass(library: IconLibrary, iconClass: string) {
  return [library.styleClass, iconClass].filter(Boolean).join(" ");
}
