export type SafeExternalLinkProps = Readonly<{
  target: "_blank";
  rel: "noopener noreferrer";
  referrerPolicy: "strict-origin-when-cross-origin";
}>;

export const SAFE_EXTERNAL_LINK_PROPS: SafeExternalLinkProps = {
  target: "_blank",
  rel: "noopener noreferrer",
  referrerPolicy: "strict-origin-when-cross-origin",
};
