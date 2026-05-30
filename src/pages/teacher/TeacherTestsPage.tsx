/**
 * TeacherTestsPage - Teachers can manage, create, and assign tests
 */

import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, MoreVertical, Edit2, Trash2, Share2, BarChart3, Eye } from "lucide-react";
import { examAPI } from "@/api/examAPI";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";

interface Test {
  _id: string;
  title: string;
  description: string;
  subject: string;
  totalMarks: number;
  timeLimit: number;
  status: "draft" | "published" | "archived";
  questions: any[];
  createdAt: string;
  totalAttempts?: number;
  averageScore?: number;
  passPercentage?: number;
}

export const TeacherTestsPage: React.FC = () => {
  const { token } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [tests, setTests] = useState<Test[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<"all" | "draft" | "published" | "archived">("all");
  const [sortBy, setSortBy] = useState<"recent" | "name" | "attempts">("recent");

  useEffect(() => {
    fetchTests();
  }, []);

  const fetchTests = async () => {
    try {
      setLoading(true);
      const data = await examAPI.getTests(token!);
      setTests(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load tests");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteTest = async (testId: string) => {
    if (!window.confirm("Are you sure? This action cannot be undone.")) return;

    try {
      await examAPI.deleteTest(testId, token!);
      setTests(tests.filter((t) => t._id !== testId));
      toast({ description: "Test deleted successfully" });
    } catch (err) {
      toast({
        title: "Error",
        description: err instanceof Error ? err.message : "Failed to delete test",
        variant: "destructive",
      });
    }
  };

  const handlePublishTest = async (testId: string) => {
    try {
      const updatedTest = await examAPI.publishTest(testId, token!);
      setTests(tests.map((t) => (t._id === testId ? updatedTest : t)));
      toast({ description: "Test published successfully" });
    } catch (err) {
      toast({
        title: "Error",
        description: err instanceof Error ? err.message : "Failed to publish test",
        variant: "destructive",
      });
    }
  };

  const filteredTests = tests.filter((t) => {
    if (filter === "all") return true;
    return t.status === filter;
  });

  const sortedTests = [...filteredTests].sort((a, b) => {
    switch (sortBy) {
      case "name":
        return a.title.localeCompare(b.title);
      case "attempts":
        return (b.totalAttempts || 0) - (a.totalAttempts || 0);
      case "recent":
      default:
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    }
  });

  const stats = {
    total: tests.length,
    published: tests.filter((t) => t.status === "published").length,
    draft: tests.filter((t) => t.status === "draft").length,
    totalAttempts: tests.reduce((sum, t) => sum + (t.totalAttempts || 0), 0),
  };

  if (loading) {
    return (
      <div className="space-y-4 p-6">
        <Skeleton className="h-12 w-full" />
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-24 w-full" />
        ))}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-start mb-8">
          <div>
            <h1 className="text-4xl font-bold text-gray-900 mb-2">Tests & Exams</h1>
            <p className="text-gray-600">Create and manage exams for your students</p>
          </div>
          <Button
            className="gap-2"
            onClick={() => navigate("/teacher/tests/create")}
          >
            <Plus className="w-4 h-4" />
            Create New Test
          </Button>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-800">
            {error}
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <Card>
            <CardContent className="pt-6">
              <div className="text-3xl font-bold text-blue-600">{stats.total}</div>
              <p className="text-sm text-gray-600 mt-1">Total Tests</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-3xl font-bold text-green-600">{stats.published}</div>
              <p className="text-sm text-gray-600 mt-1">Published</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-3xl font-bold text-yellow-600">{stats.draft}</div>
              <p className="text-sm text-gray-600 mt-1">Drafts</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-3xl font-bold text-purple-600">{stats.totalAttempts}</div>
              <p className="text-sm text-gray-600 mt-1">Total Attempts</p>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <div className="flex gap-2 mb-6 flex-wrap">
          {(["all", "draft", "published", "archived"] as const).map((status) => (
            <Button
              key={status}
              variant={filter === status ? "default" : "outline"}
              onClick={() => setFilter(status)}
              className="capitalize"
            >
              {status}
            </Button>
          ))}
        </div>

        {/* Sort Options */}
        <div className="mb-6 flex gap-2">
          <span className="text-sm text-gray-600">Sort by:</span>
          {(["recent", "name", "attempts"] as const).map((sort) => (
            <Button
              key={sort}
              variant={sortBy === sort ? "default" : "ghost"}
              size="sm"
              onClick={() => setSortBy(sort)}
              className="capitalize"
            >
              {sort}
            </Button>
          ))}
        </div>

        {/* Tests Table/List */}
        {sortedTests.length === 0 ? (
          <Card>
            <CardContent className="pt-12 pb-12 text-center">
              <p className="text-gray-500 mb-4">No tests found</p>
              <Button onClick={() => navigate("/teacher/tests/create")}>
                <Plus className="w-4 h-4 mr-2" />
                Create First Test
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {sortedTests.map((test) => (
              <Card key={test._id} className="hover:shadow-lg transition">
                <CardContent className="pt-6">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-lg font-semibold text-gray-900">{test.title}</h3>
                        <Badge
                          variant={
                            test.status === "published"
                              ? "default"
                              : test.status === "draft"
                              ? "secondary"
                              : "outline"
                          }
                          className="capitalize"
                        >
                          {test.status}
                        </Badge>
                      </div>
                      <p className="text-sm text-gray-600 mb-3">{test.description}</p>

                      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-sm">
                        <div>
                          <span className="text-gray-600">Subject:</span>
                          <p className="font-medium">{test.subject}</p>
                        </div>
                        <div>
                          <span className="text-gray-600">Questions:</span>
                          <p className="font-medium">{test.questions?.length || 0}</p>
                        </div>
                        <div>
                          <span className="text-gray-600">Marks:</span>
                          <p className="font-medium">{test.totalMarks}</p>
                        </div>
                        <div>
                          <span className="text-gray-600">Time:</span>
                          <p className="font-medium">{test.timeLimit} min</p>
                        </div>
                        <div>
                          <span className="text-gray-600">Attempts:</span>
                          <p className="font-medium">{test.totalAttempts || 0}</p>
                        </div>
                      </div>

                      {test.status === "published" && test.totalAttempts! > 0 && (
                        <div className="mt-3 grid grid-cols-2 gap-3 text-sm bg-blue-50 p-3 rounded">
                          <div>
                            <span className="text-gray-600">Avg Score:</span>
                            <p className="font-medium">
                              {test.averageScore?.toFixed(1)}%
                            </p>
                          </div>
                          <div>
                            <span className="text-gray-600">Pass Rate:</span>
                            <p className="font-medium">
                              {test.passPercentage?.toFixed(1)}%
                            </p>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Actions */}
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm">
                          <MoreVertical className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => navigate(`/teacher/tests/${test._id}/edit`)}>
                          <Edit2 className="w-4 h-4 mr-2" />
                          Edit
                        </DropdownMenuItem>

                        {test.status === "draft" && (
                          <DropdownMenuItem onClick={() => handlePublishTest(test._id)}>
                            <Share2 className="w-4 h-4 mr-2" />
                            Publish
                          </DropdownMenuItem>
                        )}

                        {test.status === "published" && test.totalAttempts! > 0 && (
                          <DropdownMenuItem onClick={() => navigate(`/teacher/tests/${test._id}/reports`)}>
                            <BarChart3 className="w-4 h-4 mr-2" />
                            View Reports
                          </DropdownMenuItem>
                        )}

                        {test.status === "published" && (
                          <DropdownMenuItem onClick={() => navigate(`/teacher/tests/${test._id}/assign`)}>
                            <Share2 className="w-4 h-4 mr-2" />
                            Assign
                          </DropdownMenuItem>
                        )}

                        <DropdownMenuItem onClick={() => handleDeleteTest(test._id)}>
                          <Trash2 className="w-4 h-4 mr-2 text-red-600" />
                          <span className="text-red-600">Delete</span>
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
