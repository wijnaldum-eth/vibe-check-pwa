"use client";

import { useState } from "react";
import {
  ColumnDef,
  ColumnFiltersState,
  SortingState,
  VisibilityState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { ArrowUpDown, ChevronDown, MoreHorizontal, Trophy, Flame, Calendar } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { trpc } from "@/lib/trpc";
import { cn } from "@/lib/utils";

interface LeaderboardEntry {
  userId: string;
  fid?: number | null;
  username: string;
  displayName?: string | null;
  pfp?: string | null;
  currentStreak: number;
  longestStreak: number;
  totalCheckIns: number;
  rank: number;
  score: number;
  category: string;
  snapshotDate: string;
}

type LeaderboardCategory = "current_streak" | "longest_streak" | "total_check_ins";

const categories = [
  { value: "current_streak", label: "Current Streak", icon: Flame, description: "Active daily check-ins" },
  { value: "longest_streak", label: "Longest Streak", icon: Trophy, description: "Best streak achieved" },
  { value: "total_check_ins", label: "Total Check-ins", icon: Calendar, description: "All-time participation" },
] as const;

const columns: ColumnDef<LeaderboardEntry>[] = [
  {
    accessorKey: "rank",
    header: ({ column }) => (
      <Button
        variant="ghost"
        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
      >
        Rank
        <ArrowUpDown className="ml-2 h-4 w-4" />
      </Button>
    ),
    cell: ({ row }) => {
      const rank = row.getValue("rank") as number;
      return (
        <div className="flex items-center gap-2">
          <Badge
            variant={rank === 1 ? "default" : rank <= 3 ? "secondary" : "outline"}
            className={cn(
              "font-mono",
              rank === 1 && "bg-yellow-500 text-white border-yellow-500",
              rank === 2 && "bg-gray-400 text-white border-gray-400",
              rank === 3 && "bg-orange-600 text-white border-orange-600"
            )}
          >
            #{rank}
          </Badge>
          {rank === 1 && <Trophy className="h-4 w-4 text-yellow-500" />}
          {rank === 2 && <Trophy className="h-4 w-4 text-gray-400" />}
          {rank === 3 && <Trophy className="h-4 w-4 text-orange-600" />}
        </div>
      );
    },
  },
  {
    accessorKey: "username",
    header: "User",
    cell: ({ row }) => {
      const displayName = row.getValue("displayName") as string | null;
      const username = row.getValue("username") as string;
      const pfp = row.original.pfp;
      const fid = row.original.fid;

      return (
        <div className="flex items-center gap-3">
          <Avatar className="h-8 w-8">
            <AvatarImage src={pfp || undefined} alt={displayName || username} />
            <AvatarFallback>
              {(displayName || username).charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div>
            <div className="font-medium">
              {displayName || username}
            </div>
            <div className="text-sm text-muted-foreground flex items-center gap-1">
              @{username}
              {fid && (
                <Badge variant="outline" className="text-xs">
                  FID: {fid}
                </Badge>
              )}
            </div>
          </div>
        </div>
      );
    },
  },
  {
    accessorKey: "currentStreak",
    header: ({ column }) => (
      <Button
        variant="ghost"
        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
      >
        Current Streak
        <ArrowUpDown className="ml-2 h-4 w-4" />
      </Button>
    ),
    cell: ({ row }) => {
      const streak = row.getValue("currentStreak") as number;
      return (
        <div className="flex items-center gap-2">
          <Flame className={cn("h-4 w-4", streak > 0 ? "text-orange-500" : "text-gray-400")} />
          <span className="font-mono font-medium">{streak}</span>
          <span className="text-sm text-muted-foreground">days</span>
        </div>
      );
    },
  },
  {
    accessorKey: "longestStreak",
    header: ({ column }) => (
      <Button
        variant="ghost"
        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
      >
        Longest Streak
        <ArrowUpDown className="ml-2 h-4 w-4" />
      </Button>
    ),
    cell: ({ row }) => {
      const streak = row.getValue("longestStreak") as number;
      return (
        <div className="flex items-center gap-2">
          <Trophy className={cn("h-4 w-4", streak > 7 ? "text-yellow-500" : "text-gray-400")} />
          <span className="font-mono font-medium">{streak}</span>
          <span className="text-sm text-muted-foreground">days</span>
        </div>
      );
    },
  },
  {
    accessorKey: "totalCheckIns",
    header: ({ column }) => (
      <Button
        variant="ghost"
        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
      >
        Total Check-ins
        <ArrowUpDown className="ml-2 h-4 w-4" />
      </Button>
    ),
    cell: ({ row }) => {
      const checkIns = row.getValue("totalCheckIns") as number;
      return (
        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4 text-blue-500" />
          <span className="font-mono font-medium">{checkIns}</span>
        </div>
      );
    },
  },
  {
    accessorKey: "score",
    header: ({ column }) => (
      <Button
        variant="ghost"
        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
      >
        Score
        <ArrowUpDown className="ml-2 h-4 w-4" />
      </Button>
    ),
    cell: ({ row }) => {
      const score = row.getValue("score") as number;
      return (
        <Badge variant="secondary" className="font-mono">
          {score.toLocaleString()}
        </Badge>
      );
    },
  },
  {
    id: "actions",
    enableHiding: false,
    cell: ({ row }) => {
      const entry = row.original;

      return (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="h-8 w-8 p-0">
              <span className="sr-only">Open menu</span>
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>Actions</DropdownMenuLabel>
            <DropdownMenuItem
              onClick={() => navigator.clipboard.writeText(entry.username)}
            >
              Copy username
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => window.open(`https://warpcast.com/${entry.username}`, "_blank")}
            >
              View on Farcaster
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      );
    },
  },
];

export function Leaderboard() {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});
  const [rowSelection, setRowSelection] = useState({});
  const [currentCategory, setCurrentCategory] = useState<LeaderboardCategory>("current_streak");

  const { data: leaderboardData, isLoading, error, refetch } = trpc.getLeaderboard.useQuery({
    category: currentCategory,
    limit: 50,
    offset: 0,
  });

  const { mutate: refreshLeaderboard } = trpc.refreshLeaderboard.useMutation({
    onSuccess: () => {
      refetch();
    },
  });

  const table = useReactTable({
    data: leaderboardData || [],
    columns,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    onColumnVisibilityChange: setColumnVisibility,
    onRowSelectionChange: setRowSelection,
    state: {
      sorting,
      columnFilters,
      columnVisibility,
      rowSelection,
    },
  });

  const currentCategoryInfo = categories.find(cat => cat.value === currentCategory);

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-red-500">Error loading leaderboard</CardTitle>
        </CardHeader>
        <CardContent>
          <p>Failed to load leaderboard data. Please try again.</p>
          <Button onClick={() => refetch()} className="mt-2">
            Retry
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
        <div>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="h-5 w-5" />
            Leaderboard
          </CardTitle>
          <CardDescription>
            Top performers by {currentCategoryInfo?.label.toLowerCase()}
          </CardDescription>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => refreshLeaderboard({ category: currentCategory })}
            disabled={isLoading}
          >
            Refresh
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="w-full">
          {/* Category Selection */}
          <Tabs value={currentCategory} onValueChange={(value) => setCurrentCategory(value as LeaderboardCategory)} className="mb-4">
            <TabsList className="grid w-full grid-cols-3">
              {categories.map((category) => {
                const Icon = category.icon;
                return (
                  <TabsTrigger key={category.value} value={category.value} className="flex items-center gap-2">
                    <Icon className="h-4 w-4" />
                    <span className="hidden sm:inline">{category.label}</span>
                    <span className="sm:hidden">{category.label.split(" ")[0]}</span>
                  </TabsTrigger>
                );
              })}
            </TabsList>
          </Tabs>

          {/* Category Description */}
          {currentCategoryInfo && (
            <div className="bg-muted/50 rounded-lg p-3 mb-4">
              <div className="flex items-center gap-2 mb-1">
                <currentCategoryInfo.icon className="h-4 w-4" />
                <span className="font-medium">{currentCategoryInfo.label}</span>
              </div>
              <p className="text-sm text-muted-foreground">{currentCategoryInfo.description}</p>
            </div>
          )}

          {/* Filters */}
          <div className="flex items-center py-4">
            <Input
              placeholder="Filter users..."
              value={(table.getColumn("username")?.getFilterValue() as string) ?? ""}
              onChange={(event) =>
                table.getColumn("username")?.setFilterValue(event.target.value)
              }
              className="max-w-sm"
            />
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="ml-auto">
                  Columns <ChevronDown className="ml-2 h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {table
                  .getAllColumns()
                  .filter((column) => column.getCanHide())
                  .map((column) => {
                    return (
                      <DropdownMenuCheckboxItem
                        key={column.id}
                        className="capitalize"
                        checked={column.getIsVisible()}
                        onCheckedChange={(value) =>
                          column.toggleVisibility(!!value)
                        }
                      >
                        {column.id === "currentStreak" && "Current Streak"}
                        {column.id === "longestStreak" && "Longest Streak"}
                        {column.id === "totalCheckIns" && "Total Check-ins"}
                        {column.id === "username" && "User"}
                        {column.id === "rank" && "Rank"}
                        {column.id === "score" && "Score"}
                        {column.id === "actions" && "Actions"}
                      </DropdownMenuCheckboxItem>
                    );
                  })}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Table */}
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                {table.getHeaderGroups().map((headerGroup) => (
                  <TableRow key={headerGroup.id}>
                    {headerGroup.headers.map((header) => {
                      return (
                        <TableHead key={header.id}>
                          {header.isPlaceholder
                            ? null
                            : flexRender(
                                header.column.columnDef.header,
                                header.getContext()
                              )}
                        </TableHead>
                      );
                    })}
                  </TableRow>
                ))}
              </TableHeader>
              <TableBody>
                {table.getRowModel().rows?.length ? (
                  table.getRowModel().rows.map((row) => (
                    <TableRow
                      key={row.id}
                      data-state={row.getIsSelected() && "selected"}
                    >
                      {row.getVisibleCells().map((cell) => (
                        <TableCell key={cell.id}>
                          {flexRender(
                            cell.column.columnDef.cell,
                            cell.getContext()
                          )}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell
                      colSpan={columns.length}
                      className="h-24 text-center"
                    >
                      {isLoading ? "Loading..." : "No results."}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-end space-x-2 py-4">
            <div className="flex-1 text-sm text-muted-foreground">
              {table.getFilteredSelectedRowModel().rows.length} of{" "}
              {table.getFilteredRowModel().rows.length} row(s) selected.
            </div>
            <div className="space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => table.previousPage()}
                disabled={!table.getCanPreviousPage()}
              >
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => table.nextPage()}
                disabled={!table.getCanNextPage()}
              >
                Next
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}