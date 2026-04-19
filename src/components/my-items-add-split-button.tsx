"use client";

import Link from "next/link";
import {
  splitButtonPrimaryLeftSegmentClass,
  splitButtonPrimaryRightSegmentClass,
} from "@/components/split-button-classes";

export function MyItemsAddSplitButton({ showBulkAdd }: { showBulkAdd: boolean }) {
  if (!showBulkAdd) {
    return (
      <Link href="/my-items/new" className="btn btn-primary btn-sm h-9 min-h-9 rounded-xl">
        Add item
      </Link>
    );
  }

  return (
    <div className="join">
      <Link
        href="/my-items/new"
        className={`btn btn-primary btn-sm join-item h-9 min-h-9 ${splitButtonPrimaryLeftSegmentClass}`}
      >
        Add item
      </Link>
      <div className="dropdown dropdown-end join-item">
        <button
          type="button"
          tabIndex={0}
          className={`btn btn-primary btn-sm h-9 min-h-9 min-w-9 px-2 ${splitButtonPrimaryRightSegmentClass}`}
          aria-label="More ways to add items"
          aria-haspopup="true"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden
          >
            <path d="m6 9 6 6 6-6" />
          </svg>
        </button>
        <ul
          tabIndex={0}
          className="menu dropdown-content mt-1 min-w-[12.5rem] rounded-box border border-base-content/10 bg-base-100 p-2 shadow-lg"
        >
          <li>
            <Link href="/my-items/bulk-add" className="rounded-lg">
              Bulk add items
            </Link>
          </li>
        </ul>
      </div>
    </div>
  );
}
