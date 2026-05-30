import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { client } from "@/api/client";

interface TestConfig {
  title: string;
  description: string;
  instructions: string;
  subject: string;
  totalMarks: number;
  passingMarks: number;
  timeLimit: number;
  negativeMarking: {
    enabled: boolean;
    marksPerWrongAnswer: number;
    marksPerBlank: number;
  };
  randomizeQuestionOrder: boolean;
  randomizeOptions: boolean;
  sectionWiseTiming: {
    enabled: boolean;
    sections: Array<{ name: string; timeLimit: number }>;
  };
  status: "draft" | "published";
  startDateTime: string;
  endDateTime: string;
  autoSubmitOnTimeout: boolean;
  scheduledPublishing: {
    enabled: boolean;
    publishDateTime: string;
  };
  antiCheating: {
    enabled: boolean;
    fullscreenMode: boolean;
    tabSwitchDetection: boolean;
    windowBlurDetection: boolean;
    copyPasteDetection: boolean;
    rightClickDisabled: boolean;
    textSelectionDisabled: boolean;
    webcamMonitoring: {
      enabled: boolean;
      snapshotIntervalSeconds: number;
      faceDetectionRequired: boolean;
    };
    violationThresholds: {
      warningAt: number;
      autoSubmitAt: number;
    };
  };
  allowRetest: boolean;
  maxRetestAttempts: number;
  restestDaysGap: number;
  difficulty: "easy" | "medium" | "hard";
  tags: string[];
  assignedTo: {
    schools: string[];
    classes: string[];
    grades: string[];
    sections: string[];
    students: string[];
    courseTracks: string[];
  };
}

const defaultTestConfig: TestConfig = {
  title: "",
  description: "",
  instructions: "",
  subject: "",
  totalMarks: 100,
  passingMarks: 50,
  timeLimit: 60,
  negativeMarking: {
    enabled: false,
    marksPerWrongAnswer: 0,
    marksPerBlank: 0,
  },
  randomizeQuestionOrder: false,
  randomizeOptions: false,
  sectionWiseTiming: {
    enabled: false,
    sections: [],
  },
  status: "draft",
  startDateTime: "",
  endDateTime: "",
  autoSubmitOnTimeout: true,
  scheduledPublishing: {
    enabled: false,
    publishDateTime: "",
  },
  antiCheating: {
    enabled: true,
    fullscreenMode: true,
    tabSwitchDetection: true,
    windowBlurDetection: true,
    copyPasteDetection: true,
    rightClickDisabled: true,
    textSelectionDisabled: true,
    webcamMonitoring: {
      enabled: false,
      snapshotIntervalSeconds: 30,
      faceDetectionRequired: false,
    },
    violationThresholds: {
      warningAt: 1,
      autoSubmitAt: 3,
    },
  },
  allowRetest: false,
  maxRetestAttempts: 1,
  restestDaysGap: 7,
  difficulty: "medium",
  tags: [],
  assignedTo: {
    schools: [],
    classes: [],
    grades: [],
    sections: [],
    students: [],
    courseTracks: [],
  },
};

export const TestCreationForm: React.FC = () => {
  const navigate = useNavigate();
  const [config, setConfig] = useState<TestConfig>(defaultTestConfig);
  const [activeTab, setActiveTab] = useState<
    "basic" | "settings" | "anticheating" | "assignment"
  >("basic");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tagInput, setTagInput] = useState("");

  const handleBasicChange = (
    field: keyof Omit<TestConfig, "negativeMarking" | "antiCheating">,
    value: any
  ) => {
    setConfig((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleNegativeMarkingChange = (
    field: keyof TestConfig["negativeMarking"],
    value: any
  ) => {
    setConfig((prev) => ({
      ...prev,
      negativeMarking: {
        ...prev.negativeMarking,
        [field]: value,
      },
    }));
  };

  const handleAntiCheatingChange = (
    field: string,
    value: any
  ) => {
    setConfig((prev) => {
      const keys = field.split(".");
      const newConfig = { ...prev };
      let current: any = newConfig.antiCheating;

      for (let i = 0; i < keys.length - 1; i++) {
        current[keys[i]] = { ...current[keys[i]] };
        current = current[keys[i]];
      }

      current[keys[keys.length - 1]] = value;
      return newConfig;
    });
  };

  const handleAddTag = () => {
    if (tagInput.trim() && !config.tags.includes(tagInput.trim())) {
      setConfig((prev) => ({
        ...prev,
        tags: [...prev.tags, tagInput.trim()],
      }));
      setTagInput("");
    }
  };

  const handleRemoveTag = (tag: string) => {
    setConfig((prev) => ({
      ...prev,
      tags: prev.tags.filter((t) => t !== tag),
    }));
  };

  const handleCreateTest = async () => {
    if (!config.title.trim()) {
      setError("Test title is required");
      return;
    }

    if (config.totalMarks <= 0) {
      setError("Total marks must be greater than 0");
      return;
    }

    if (config.passingMarks > config.totalMarks) {
      setError("Passing marks cannot exceed total marks");
      return;
    }

    if (config.timeLimit <= 0) {
      setError("Time limit must be greater than 0");
      return;
    }

    setLoading(true);
    try {
      const response = await client.post("/tests/tests", config);
      navigate(`/teacher/tests/${response.data._id}/add-questions`);
    } catch (err: any) {
      setError(err.response?.data?.error || "Failed to create test");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-4xl mx-auto bg-white rounded-lg shadow-lg">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-800 text-white p-6">
          <h1 className="text-3xl font-bold">Create New Test</h1>
          <p className="text-blue-100 mt-2">
            Configure test settings and options
          </p>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200">
          <div className="flex">
            {(["basic", "settings", "anticheating", "assignment"] as const).map(
              (tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-6 py-4 font-medium text-center transition ${
                    activeTab === tab
                      ? "border-b-2 border-blue-600 text-blue-600"
                      : "text-gray-600 hover:text-gray-800"
                  }`}
                >
                  {tab === "anticheating"
                    ? "Anti-Cheating"
                    : tab.charAt(0).toUpperCase() + tab.slice(1)}
                </button>
              )
            )}
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border-l-4 border-red-400 p-4 m-6">
            <p className="text-red-700">{error}</p>
            <button
              onClick={() => setError(null)}
              className="text-red-600 text-sm mt-2 hover:underline"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Tab Content */}
        <div className="p-6">
          {/* BASIC TAB */}
          {activeTab === "basic" && (
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Test Title *
                </label>
                <input
                  type="text"
                  value={config.title}
                  onChange={(e) => handleBasicChange("title", e.target.value)}
                  placeholder="e.g., Python Basics Final Exam"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Description
                </label>
                <textarea
                  value={config.description}
                  onChange={(e) =>
                    handleBasicChange("description", e.target.value)
                  }
                  placeholder="Brief description of the test"
                  rows={3}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Instructions
                </label>
                <textarea
                  value={config.instructions}
                  onChange={(e) =>
                    handleBasicChange("instructions", e.target.value)
                  }
                  placeholder="Instructions for students taking the test"
                  rows={3}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Subject *
                  </label>
                  <input
                    type="text"
                    value={config.subject}
                    onChange={(e) =>
                      handleBasicChange("subject", e.target.value)
                    }
                    placeholder="e.g., Python Programming"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Difficulty Level
                  </label>
                  <select
                    value={config.difficulty}
                    onChange={(e) =>
                      handleBasicChange(
                        "difficulty",
                        e.target.value as "easy" | "medium" | "hard"
                      )
                    }
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="easy">Easy</option>
                    <option value="medium">Medium</option>
                    <option value="hard">Hard</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Total Marks *
                  </label>
                  <input
                    type="number"
                    value={config.totalMarks}
                    onChange={(e) =>
                      handleBasicChange("totalMarks", parseInt(e.target.value))
                    }
                    min="1"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Passing Marks *
                  </label>
                  <input
                    type="number"
                    value={config.passingMarks}
                    onChange={(e) =>
                      handleBasicChange("passingMarks", parseInt(e.target.value))
                    }
                    min="0"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Time Limit (minutes) *
                  </label>
                  <input
                    type="number"
                    value={config.timeLimit}
                    onChange={(e) =>
                      handleBasicChange("timeLimit", parseInt(e.target.value))
                    }
                    min="1"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Start Date & Time
                  </label>
                  <input
                    type="datetime-local"
                    value={config.startDateTime}
                    onChange={(e) =>
                      handleBasicChange("startDateTime", e.target.value)
                    }
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    End Date & Time
                  </label>
                  <input
                    type="datetime-local"
                    value={config.endDateTime}
                    onChange={(e) =>
                      handleBasicChange("endDateTime", e.target.value)
                    }
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              {/* Tags */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Tags
                </label>
                <div className="flex gap-2 mb-2">
                  <input
                    type="text"
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        handleAddTag();
                        e.preventDefault();
                      }
                    }}
                    placeholder="Add tags and press Enter"
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <button
                    onClick={handleAddTag}
                    className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300"
                  >
                    Add
                  </button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {config.tags.map((tag) => (
                    <div
                      key={tag}
                      className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm flex items-center gap-2"
                    >
                      {tag}
                      <button
                        onClick={() => handleRemoveTag(tag)}
                        className="hover:text-blue-600"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* SETTINGS TAB */}
          {activeTab === "settings" && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-bold mb-4">Question Settings</h3>

                <div className="space-y-4">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={config.randomizeQuestionOrder}
                      onChange={(e) =>
                        handleBasicChange(
                          "randomizeQuestionOrder",
                          e.target.checked
                        )
                      }
                      className="w-5 h-5"
                    />
                    <span className="font-medium">Randomize Question Order</span>
                    <span className="text-sm text-gray-600">(Each student sees questions in different order)</span>
                  </label>

                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={config.randomizeOptions}
                      onChange={(e) =>
                        handleBasicChange("randomizeOptions", e.target.checked)
                      }
                      className="w-5 h-5"
                    />
                    <span className="font-medium">Randomize Options</span>
                    <span className="text-sm text-gray-600">(MCQ options appear in different order)</span>
                  </label>

                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={config.autoSubmitOnTimeout}
                      onChange={(e) =>
                        handleBasicChange("autoSubmitOnTimeout", e.target.checked)
                      }
                      className="w-5 h-5"
                    />
                    <span className="font-medium">Auto-Submit on Timeout</span>
                    <span className="text-sm text-gray-600">(Test automatically submits when time is up)</span>
                  </label>
                </div>
              </div>

              <div className="border-t pt-6">
                <h3 className="text-lg font-bold mb-4">Negative Marking</h3>

                <label className="flex items-center gap-3 cursor-pointer mb-4">
                  <input
                    type="checkbox"
                    checked={config.negativeMarking.enabled}
                    onChange={(e) =>
                      handleNegativeMarkingChange("enabled", e.target.checked)
                    }
                    className="w-5 h-5"
                  />
                  <span className="font-medium">Enable Negative Marking</span>
                </label>

                {config.negativeMarking.enabled && (
                  <div className="grid grid-cols-2 gap-4 ml-8">
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Marks per Wrong Answer
                      </label>
                      <input
                        type="number"
                        value={config.negativeMarking.marksPerWrongAnswer}
                        onChange={(e) =>
                          handleNegativeMarkingChange(
                            "marksPerWrongAnswer",
                            parseFloat(e.target.value)
                          )
                        }
                        step="0.5"
                        min="0"
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Marks per Blank
                      </label>
                      <input
                        type="number"
                        value={config.negativeMarking.marksPerBlank}
                        onChange={(e) =>
                          handleNegativeMarkingChange(
                            "marksPerBlank",
                            parseFloat(e.target.value)
                          )
                        }
                        step="0.5"
                        min="0"
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>
                )}
              </div>

              <div className="border-t pt-6">
                <h3 className="text-lg font-bold mb-4">Retest Settings</h3>

                <label className="flex items-center gap-3 cursor-pointer mb-4">
                  <input
                    type="checkbox"
                    checked={config.allowRetest}
                    onChange={(e) =>
                      handleBasicChange("allowRetest", e.target.checked)
                    }
                    className="w-5 h-5"
                  />
                  <span className="font-medium">Allow Students to Retake Test</span>
                </label>

                {config.allowRetest && (
                  <div className="grid grid-cols-2 gap-4 ml-8">
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Max Retest Attempts
                      </label>
                      <input
                        type="number"
                        value={config.maxRetestAttempts}
                        onChange={(e) =>
                          handleBasicChange("maxRetestAttempts", parseInt(e.target.value))
                        }
                        min="1"
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Days Gap Between Retests
                      </label>
                      <input
                        type="number"
                        value={config.restestDaysGap}
                        onChange={(e) =>
                          handleBasicChange("restestDaysGap", parseInt(e.target.value))
                        }
                        min="1"
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ANTI-CHEATING TAB */}
          {activeTab === "anticheating" && (
            <div className="space-y-6">
              <div>
                <label className="flex items-center gap-3 cursor-pointer mb-6">
                  <input
                    type="checkbox"
                    checked={config.antiCheating.enabled}
                    onChange={(e) =>
                      handleAntiCheatingChange("enabled", e.target.checked)
                    }
                    className="w-5 h-5"
                  />
                  <span className="font-semibold text-lg">
                    Enable Anti-Cheating Protections
                  </span>
                </label>

                {config.antiCheating.enabled && (
                  <div className="space-y-4 ml-8 bg-blue-50 p-4 rounded-lg">
                    <label className="flex items-center gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={config.antiCheating.fullscreenMode}
                        onChange={(e) =>
                          handleAntiCheatingChange(
                            "fullscreenMode",
                            e.target.checked
                          )
                        }
                        className="w-5 h-5"
                      />
                      <span className="font-medium">Fullscreen Mode (Mandatory)</span>
                    </label>

                    <label className="flex items-center gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={config.antiCheating.tabSwitchDetection}
                        onChange={(e) =>
                          handleAntiCheatingChange(
                            "tabSwitchDetection",
                            e.target.checked
                          )
                        }
                        className="w-5 h-5"
                      />
                      <span className="font-medium">Detect Tab Switching</span>
                    </label>

                    <label className="flex items-center gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={config.antiCheating.windowBlurDetection}
                        onChange={(e) =>
                          handleAntiCheatingChange(
                            "windowBlurDetection",
                            e.target.checked
                          )
                        }
                        className="w-5 h-5"
                      />
                      <span className="font-medium">Detect Window Blur/Focus Loss</span>
                    </label>

                    <label className="flex items-center gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={config.antiCheating.copyPasteDetection}
                        onChange={(e) =>
                          handleAntiCheatingChange(
                            "copyPasteDetection",
                            e.target.checked
                          )
                        }
                        className="w-5 h-5"
                      />
                      <span className="font-medium">Block Copy/Paste</span>
                    </label>

                    <label className="flex items-center gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={config.antiCheating.rightClickDisabled}
                        onChange={(e) =>
                          handleAntiCheatingChange(
                            "rightClickDisabled",
                            e.target.checked
                          )
                        }
                        className="w-5 h-5"
                      />
                      <span className="font-medium">Disable Right-Click</span>
                    </label>

                    <label className="flex items-center gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={config.antiCheating.textSelectionDisabled}
                        onChange={(e) =>
                          handleAntiCheatingChange(
                            "textSelectionDisabled",
                            e.target.checked
                          )
                        }
                        className="w-5 h-5"
                      />
                      <span className="font-medium">Prevent Text Selection</span>
                    </label>

                    <div className="border-t pt-4 mt-4">
                      <h4 className="font-semibold mb-3">Violation Thresholds</h4>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Show Warning at Violation #
                          </label>
                          <input
                            type="number"
                            value={
                              config.antiCheating.violationThresholds.warningAt
                            }
                            onChange={(e) =>
                              handleAntiCheatingChange(
                                "violationThresholds.warningAt",
                                parseInt(e.target.value)
                              )
                            }
                            min="1"
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Auto-Submit at Violation #
                          </label>
                          <input
                            type="number"
                            value={
                              config.antiCheating.violationThresholds.autoSubmitAt
                            }
                            onChange={(e) =>
                              handleAntiCheatingChange(
                                "violationThresholds.autoSubmitAt",
                                parseInt(e.target.value)
                              )
                            }
                            min="2"
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ASSIGNMENT TAB */}
          {activeTab === "assignment" && (
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Assign Test To:
                </label>
                <div className="space-y-3">
                  <label className="flex items-center gap-3">
                    <input type="checkbox" className="w-5 h-5" />
                    <span>Entire School</span>
                  </label>
                  <label className="flex items-center gap-3">
                    <input type="checkbox" className="w-5 h-5" />
                    <span>Specific Classes</span>
                  </label>
                  <label className="flex items-center gap-3">
                    <input type="checkbox" className="w-5 h-5" />
                    <span>Specific Students</span>
                  </label>
                  <label className="flex items-center gap-3">
                    <input type="checkbox" className="w-5 h-5" />
                    <span>Course Tracks</span>
                  </label>
                </div>
              </div>

              <p className="text-sm text-gray-600 bg-blue-50 p-4 rounded-lg">
                💡 You can assign the test to specific students/classes after creating it.
              </p>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="border-t border-gray-200 bg-gray-50 p-6 flex justify-between">
          <button
            onClick={() => navigate("/teacher/tests")}
            className="px-6 py-2 border border-gray-300 text-gray-800 rounded-lg hover:bg-gray-100"
          >
            Cancel
          </button>

          <div className="flex gap-4">
            <button
              onClick={() => {
                handleBasicChange("status", "draft");
                handleCreateTest();
              }}
              disabled={loading}
              className="px-6 py-2 border border-blue-600 text-blue-600 rounded-lg hover:bg-blue-50 disabled:opacity-50"
            >
              {loading ? "Creating..." : "Save as Draft"}
            </button>

            <button
              onClick={() => {
                handleBasicChange("status", "published");
                handleCreateTest();
              }}
              disabled={loading}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? "Creating..." : "Create & Add Questions"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TestCreationForm;
