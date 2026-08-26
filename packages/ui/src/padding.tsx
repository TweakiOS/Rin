import type { ReactNode } from "react";

export function Padding({
  className = "mx-3",
  children,
}: {
  className?: string;
  children?: ReactNode;
}) {
  return (
    <div
      className={`${className} sm:mx-4 md:mx-8 lg:mx-12 xl:mx-16 2xl:mx-24 duration-300`}
    >
      {children}
    </div>
  );
}