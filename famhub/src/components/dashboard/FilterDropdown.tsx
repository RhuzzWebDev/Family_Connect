'use client';

import { LayoutGrid, List, Check } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";

export type ViewType = "card" | "list";

interface FilterDropdownProps {
  viewType: ViewType;
  setViewType: (type: ViewType) => void;
}

export default function FilterDropdown({
  viewType,
  setViewType,
}: FilterDropdownProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          className="bg-white border-gray-200 text-gray-700 hover:bg-gray-50 hover:text-gray-900"
        >
          {viewType === "card" ? (
            <LayoutGrid className="h-4 w-4 mr-2" />
          ) : (
            <List className="h-4 w-4 mr-2" />
          )}
          View
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-40 bg-white border-gray-200 text-gray-800">
        <DropdownMenuLabel>View Options</DropdownMenuLabel>
        <DropdownMenuSeparator className="bg-gray-200" />
        <DropdownMenuRadioGroup value={viewType} onValueChange={(value) => setViewType(value as ViewType)}>
          <DropdownMenuRadioItem value="card" className="focus:bg-gray-100 focus:text-gray-900 cursor-pointer">
            <LayoutGrid className="h-4 w-4 mr-2" />
            Card View
            {viewType === "card" && <Check className="h-4 w-4 ml-auto" />}
          </DropdownMenuRadioItem>
          <DropdownMenuRadioItem value="list" className="focus:bg-gray-100 focus:text-gray-900 cursor-pointer">
            <List className="h-4 w-4 mr-2" />
            List View
            {viewType === "list" && <Check className="h-4 w-4 ml-auto" />}
          </DropdownMenuRadioItem>
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
