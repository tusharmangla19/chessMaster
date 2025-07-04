declare module "@radix-ui/react-separator" {
  import * as React from "react";

  // Re-export everything from the actual package so that consumers still get
  // the right runtime code, while TypeScript is satisfied with these typings.
  // The package publishes its own types but for some older TS module
  // resolution settings they aren't picked up. We expose a minimalist facade
  // that forwards the important 'Root' component.
  export interface SeparatorProps extends React.ComponentPropsWithoutRef<"div"> {
    orientation?: "horizontal" | "vertical";
    decorative?: boolean;
  }

  export const Root: React.ForwardRefExoticComponent<
    SeparatorProps & React.RefAttributes<HTMLDivElement>
  >;

  // Allow &#x60;import * as SeparatorPrimitive&#x60;
  const moduleExports: {
    Root: typeof Root;
  };

  export default moduleExports;
} 