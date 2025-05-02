"use client"

import { useState } from "react"
import { Check, ChevronDown, Filter, LayoutGrid, List } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

interface QuestionFiltersProps {
  view: "card" | "list"
  onViewChange: (view: "card" | "list") => void
  onFilterChange: (filters: any) => void
}

export default function QuestionFilters({ view, onViewChange, onFilterChange }: QuestionFiltersProps) {
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  const [selectedStatus, setSelectedStatus] = useState<string | null>(null)

  const handleCategoryChange = (category: string) => {
    const newCategory = selectedCategory === category ? null : category
    setSelectedCategory(newCategory)
    onFilterChange({ category: newCategory, status: selectedStatus })
  }

  const handleStatusChange = (status: string) => {
    const newStatus = selectedStatus === status ? null : status
    setSelectedStatus(newStatus)
    onFilterChange({ category: selectedCategory, status: newStatus })
  }

  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="bg-[#111318] border-gray-800 text-white hover:bg-[#1a1d24] hover:border-gray-700">
              <Filter className="h-4 w-4 mr-2" />
              Filter
              <ChevronDown className="h-4 w-4 ml-2" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-56 bg-[#111318] border-gray-800 text-white">
            <DropdownMenuLabel>Filter by Category</DropdownMenuLabel>
            <DropdownMenuSeparator className="bg-gray-800" />
            <DropdownMenuGroup>
              {["Support Group", "Terminal Care", "Family Leaders", "All"].map((category) => (
                <DropdownMenuItem
                  key={category}
                  className="flex items-center justify-between cursor-pointer hover:bg-[#1a1d24]"
                  onClick={() => handleCategoryChange(category)}
                >
                  {category}
                  {selectedCategory === category && <Check className="h-4 w-4 text-blue-500" />}
                </DropdownMenuItem>
              ))}
            </DropdownMenuGroup>
            <DropdownMenuSeparator className="bg-gray-800" />
            <DropdownMenuLabel>Filter by Status</DropdownMenuLabel>
            <DropdownMenuSeparator className="bg-gray-800" />
            <DropdownMenuGroup>
              {["Answered", "Pending", "Overdue"].map((status) => (
                <DropdownMenuItem
                  key={status}
                  className="flex items-center justify-between cursor-pointer hover:bg-[#1a1d24]"
                  onClick={() => handleStatusChange(status)}
                >
                  {status}
                  {selectedStatus === status && <Check className="h-4 w-4 text-blue-500" />}
                </DropdownMenuItem>
              ))}
            </DropdownMenuGroup>
          </DropdownMenuContent>
        </DropdownMenu>

        {selectedCategory && (
          <Button
            variant="outline"
            size="sm"
            className="bg-blue-600/10 text-blue-400 border-blue-900 hover:bg-blue-600/20"
            onClick={() => handleCategoryChange(selectedCategory)}
          >
            {selectedCategory} ×
          </Button>
        )}

        {selectedStatus && (
          <Button
            variant="outline"
            size="sm"
            className="bg-purple-600/10 text-purple-400 border-purple-900 hover:bg-purple-600/20"
            onClick={() => handleStatusChange(selectedStatus)}
          >
            {selectedStatus} ×
          </Button>
        )}
      </div>

      <div className="flex items-center bg-[#111318] border border-gray-800 rounded-md overflow-hidden">
        <Button
          variant="ghost"
          size="sm"
          className={`rounded-none h-9 px-3 ${view === "card" ? "bg-blue-600 text-white" : "text-gray-400 hover:text-white hover:bg-[#1a1d24]"}`}
          onClick={() => onViewChange("card")}
        >
          <LayoutGrid className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className={`rounded-none h-9 px-3 ${view === "list" ? "bg-blue-600 text-white" : "text-gray-400 hover:text-white hover:bg-[#1a1d24]"}`}
          onClick={() => onViewChange("list")}
        >
          <List className="h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}
