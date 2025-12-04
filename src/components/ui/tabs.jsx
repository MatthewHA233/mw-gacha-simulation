'use client'

import { useState } from "react";
import { motion } from "framer-motion";
import { cn } from "../../lib/utils";

export const Tabs = ({
  tabs: propTabs,
  containerClassName,
  activeTabClassName,
  tabClassName,
  contentClassName,
}) => {
  const [active, setActive] = useState(propTabs[0]);

  return (
    <>
      <div
        className={cn(
          "flex flex-row items-center justify-center gap-2 relative overflow-auto sm:overflow-visible w-full",
          containerClassName
        )}
      >
        {propTabs.map((tab) => (
          <button
            key={tab.value}
            onClick={() => setActive(tab)}
            className={cn("relative px-3 py-1.5 sm:px-4 sm:py-2 lg:px-6 lg:py-3 rounded-full font-medium transition-all", tabClassName)}
          >
            {active.value === tab.value && (
              <motion.div
                layoutId="activetab"
                transition={{ duration: 0.2, ease: "easeInOut" }}
                className={cn(
                  "absolute inset-0 rounded-full",
                  activeTabClassName
                )}
              />
            )}
            <span className="relative z-10">
              {tab.title}
            </span>
          </button>
        ))}
      </div>
      <div className={cn("w-full mt-2 sm:mt-3 lg:mt-4", contentClassName)}>
        {propTabs.map((tab) => (
          <div
            key={tab.value}
            className={cn(
              "w-full",
              active.value === tab.value ? "block" : "hidden"
            )}
          >
            {tab.content}
          </div>
        ))}
      </div>
    </>
  );
};
