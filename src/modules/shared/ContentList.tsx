import React, { useState, useCallback } from "react";
import { Search, Plus, Trash2, Edit2, Eye, EyeOff, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/components/ui/use-toast";

interface ContentListProps {
  title: string;
  description?: string;
  items: any[];
  columns: Array<{
    key: string;
    label: string;
    render?: (value: any, item: any) => React.ReactNode;
    width?: string;
  }>;
  onSearch: (query: string) => void;
  onEdit: (item: any) => void;
  onDelete: (item: any) => void;
  onAdd?: () => void;
  onPublish?: (item: any) => void;
  onDownload?: (item: any) => void;
  loading?: boolean;
  searchPlaceholder?: string;
  canAdd?: boolean;
  canDelete?: boolean;
  canPublish?: boolean;
  emptyMessage?: string;
}

/**
 * Shared Content List Component
 * Used for displaying lessons, materials, quizzes, assignments
 * Provides consistent UI/UX across admin and teacher portals
 */
export const ContentList: React.FC<ContentListProps> = ({
  title,
  description,
  items,
  columns,
  onSearch,
  onEdit,
  onDelete,
  onAdd,
  onPublish,
  onDownload,
  loading,
  searchPlaceholder,
  canAdd,
  canDelete,
  canPublish,
  emptyMessage = "No items found"
}) => {
  const [search, setSearch] = useState("");
  const [deleteItem, setDeleteItem] = useState<any | null>(null);
  const { toast } = useToast();

  const handleSearch = useCallback((value: string) => {
    setSearch(value);
    onSearch(value);
  }, [onSearch]);

  const handleDelete = async () => {
    if (!deleteItem) return;
    try {
      await onDelete(deleteItem);
      toast({ title: "Success", description: "Item deleted successfully" });
      setDeleteItem(null);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to delete item",
        variant: "destructive"
      });
    }
  };

  const handlePublish = async (item: any) => {
    if (!onPublish) return;
    try {
      await onPublish(item);
      toast({ title: "Success", description: "Item published successfully" });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to publish item",
        variant: "destructive"
      });
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-950">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.24em] text-slate-500">Content Management</p>
            <h2 className="mt-2 text-3xl font-semibold">{title}</h2>
            {description && <p className="mt-1 text-sm text-slate-500">{description}</p>}
          </div>
          {canAdd && onAdd && (
            <Button onClick={onAdd} className="gap-2">
              <Plus className="h-4 w-4" />
              Add New
            </Button>
          )}
        </div>
      </section>

      {/* Search */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center gap-2">
            <Search className="h-5 w-5 text-slate-400" />
            <Input
              placeholder={searchPlaceholder || "Search..."}
              value={search}
              onChange={(e) => handleSearch(e.target.value)}
              className="flex-1"
            />
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardContent className="pt-6">
          {loading ? (
            <div className="flex justify-center py-8">
              <div className="text-slate-500">Loading...</div>
            </div>
          ) : items.length === 0 ? (
            <div className="flex justify-center py-8">
              <div className="text-slate-500">{emptyMessage}</div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    {columns.map((col) => (
                      <TableHead key={col.key} style={{ width: col.width }}>
                        {col.label}
                      </TableHead>
                    ))}
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((item, idx) => (
                    <TableRow key={item._id || idx}>
                      {columns.map((col) => (
                        <TableCell key={col.key}>
                          {col.render ? col.render(item[col.key], item) : item[col.key]}
                        </TableCell>
                      ))}
                      <TableCell>
                        <div className="flex gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => onEdit(item)}
                            title="Edit"
                          >
                            <Edit2 className="h-4 w-4" />
                          </Button>

                          {canPublish && onPublish && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handlePublish(item)}
                              title={item.isPublished ? "Unpublish" : "Publish"}
                            >
                              {item.isPublished ? (
                                <Eye className="h-4 w-4 text-green-500" />
                              ) : (
                                <EyeOff className="h-4 w-4" />
                              )}
                            </Button>
                          )}

                          {onDownload && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => onDownload(item)}
                              title="Download"
                            >
                              <Download className="h-4 w-4" />
                            </Button>
                          )}

                          {canDelete && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setDeleteItem(item)}
                              title="Delete"
                            >
                              <Trash2 className="h-4 w-4 text-red-500" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteItem} onOpenChange={() => setDeleteItem(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Item</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{deleteItem?.title || deleteItem?.name}"?
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-red-600">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default ContentList;
