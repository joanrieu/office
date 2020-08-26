import React from "react";
import "./EmptyFolderPlaceholder.scss";

export const EmptyFolderPlaceholder = () => (
  <div className="EmptyFolderPlaceholder">
    <svg viewBox="50 50 80 150">
      <path
        d="M128.51 198.37C82.17 158.18 62.08 114.44 68.23 67.16"
        opacity="1"
        fill-opacity="0"
        stroke="#000000"
        stroke-width="1"
        stroke-opacity="1"
      ></path>
      <path
        d="M74.92 73.9L69.1 59.13L60.09 72.55"
        opacity="1"
        fill-opacity="0"
        stroke="#000000"
        stroke-width="1"
        stroke-opacity="1"
      ></path>
    </svg>
    <div>
      Sharpen your pencils
      <br />
      and get started!
    </div>
  </div>
);
