import React, { useState, useCallback } from 'react';
import { Card, Button, Input, Textarea, Select, Switch, Tabs, Alert, Badge, Modal, Form } from '@/components/ui';
import { Plus, Trash2, Edit2, Copy, Eye, EyeOff } from 'lucide-react';

export default function TestCreator() {
  const [test, setTest] = useState({
    title: '',
    description: '',
    instructions: '',
    subject: '',
    totalMarks: 100,
    passingMarks: 40,
    timeLimit: 60,
    startDateTime: '',
    endDateTime: '',
    randomizeQuestions: false,
    randomizeOptions: false,
    autoSubmitOnTimeout: true,
    allowRetake: { enabled: false, maxAttempts: 1 },
    isDraft: true,
    antiCheatSettings: {
      fullscreenRequired: true,
      preventTabSwitch: true,
      preventRightClick: true,
      preventCopyPaste: true,
      detectMinimize: true,
      maxViolationsBeforeAutoSubmit: 3,
    },
    negativeMarking: { enabled: false, percentage: 25 },
    questions: [],
    tags: [],
  });

  const [currentQuestion, setCurrentQuestion] = useState(null);
  const [showQuestionModal, setShowQuestionModal] = useState(false);
  const [activeTab, setActiveTab] = useState('details');

  const handleTestChange = (field, value) => {
    setTest((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleNestedChange = (parent, field, value) => {
    setTest((prev) => ({
      ...prev,
      [parent]: {
        ...prev[parent],
        [field]: value,
      },
    }));
  };

  const addQuestion = () => {
    setCurrentQuestion({
      questionNumber: test.questions.length + 1,
      questionText: '',
      type: 'mcq',
      marks: 1,
      options: [
        { optionId: 'A', text: '' },
        { optionId: 'B', text: '' },
        { optionId: 'C', text: '' },
        { optionId: 'D', text: '' },
      ],
      difficulty: 'Medium',
      tags: [],
    });
    setShowQuestionModal(true);
  };

  const saveQuestion = () => {
    if (currentQuestion.questionId) {
      // Update existing
      setTest((prev) => ({
        ...prev,
        questions: prev.questions.map((q) =>
          q.questionId === currentQuestion.questionId ? currentQuestion : q
        ),
      }));
    } else {
      // Add new
      setTest((prev) => ({
        ...prev,
        questions: [...prev.questions, { ...currentQuestion, questionId: Date.now() }],
      }));
    }
    setShowQuestionModal(false);
    setCurrentQuestion(null);
  };

  const deleteQuestion = (questionId) => {
    setTest((prev) => ({
      ...prev,
      questions: prev.questions.filter((q) => q.questionId !== questionId),
    }));
  };

  const duplicateQuestion = (question) => {
    setTest((prev) => ({
      ...prev,
      questions: [
        ...prev.questions,
        {
          ...JSON.parse(JSON.stringify(question)),
          questionId: Date.now(),
          questionNumber: prev.questions.length + 1,
        },
      ],
    }));
  };

  const publishTest = async () => {
    try {
      // TODO: API call to save test
      console.log('Publishing test:', test);
    } catch (error) {
      console.error('Error publishing test:', error);
    }
  };

  return (
    <div className="space-y-6 p-6 bg-gray-50 min-h-screen">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Create Test</h1>
        <div className="flex gap-3">
          <Button variant="outline">Save as Draft</Button>
          <Button onClick={publishTest} className="bg-blue-600">
            Publish Test
          </Button>
        </div>
      </div>

      <Tabs activeTab={activeTab} onTabChange={setActiveTab}>
        {/* Test Details Tab */}
        <Tabs.Tab label="Test Details" value="details">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Basic Information */}
            <Card className="lg:col-span-2">
              <Card.Header>
                <h2 className="text-xl font-semibold">Basic Information</h2>
              </Card.Header>
              <Card.Content className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Test Title *</label>
                  <Input
                    placeholder="e.g., Python Fundamentals Quiz"
                    value={test.title}
                    onChange={(e) => handleTestChange('title', e.target.value)}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Description</label>
                  <Textarea
                    placeholder="Brief description of the test"
                    rows={3}
                    value={test.description}
                    onChange={(e) => handleTestChange('description', e.target.value)}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Instructions</label>
                  <Textarea
                    placeholder="Important instructions for students..."
                    rows={4}
                    value={test.instructions}
                    onChange={(e) => handleTestChange('instructions', e.target.value)}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Subject</label>
                    <Input
                      placeholder="e.g., Programming"
                      value={test.subject}
                      onChange={(e) => handleTestChange('subject', e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Tags</label>
                    <Input
                      placeholder="Add comma-separated tags"
                      value={test.tags.join(', ')}
                      onChange={(e) =>
                        handleTestChange(
                          'tags',
                          e.target.value.split(',').map((t) => t.trim())
                        )
                      }
                    />
                  </div>
                </div>
              </Card.Content>
            </Card>

            {/* Test Configuration */}
            <Card>
              <Card.Header>
                <h2 className="text-xl font-semibold">Marks & Timing</h2>
              </Card.Header>
              <Card.Content className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Total Marks</label>
                  <Input
                    type="number"
                    value={test.totalMarks}
                    onChange={(e) => handleTestChange('totalMarks', parseInt(e.target.value))}
                    min="1"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Passing Marks</label>
                  <Input
                    type="number"
                    value={test.passingMarks}
                    onChange={(e) => handleTestChange('passingMarks', parseInt(e.target.value))}
                    min="0"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Time Limit (Minutes)</label>
                  <Input
                    type="number"
                    value={test.timeLimit}
                    onChange={(e) => handleTestChange('timeLimit', parseInt(e.target.value))}
                    min="1"
                  />
                </div>
              </Card.Content>
            </Card>

            {/* Scheduling */}
            <Card>
              <Card.Header>
                <h2 className="text-xl font-semibold">Schedule</h2>
              </Card.Header>
              <Card.Content className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Start Date & Time</label>
                  <Input
                    type="datetime-local"
                    value={test.startDateTime}
                    onChange={(e) => handleTestChange('startDateTime', e.target.value)}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">End Date & Time</label>
                  <Input
                    type="datetime-local"
                    value={test.endDateTime}
                    onChange={(e) => handleTestChange('endDateTime', e.target.value)}
                  />
                </div>

                <div className="pt-2">
                  <label className="flex items-center gap-3">
                    <Switch
                      checked={test.allowRetake.enabled}
                      onChange={(checked) =>
                        handleNestedChange('allowRetake', 'enabled', checked)
                      }
                    />
                    <span className="text-sm font-medium">Allow Retake</span>
                  </label>
                  {test.allowRetake.enabled && (
                    <div className="mt-3 ml-8">
                      <label className="block text-sm font-medium mb-1">Max Attempts</label>
                      <Input
                        type="number"
                        value={test.allowRetake.maxAttempts}
                        onChange={(e) =>
                          handleNestedChange('allowRetake', 'maxAttempts', parseInt(e.target.value))
                        }
                        min="1"
                      />
                    </div>
                  )}
                </div>
              </Card.Content>
            </Card>

            {/* Question Settings */}
            <Card>
              <Card.Header>
                <h2 className="text-xl font-semibold">Question Settings</h2>
              </Card.Header>
              <Card.Content className="space-y-4">
                <label className="flex items-center gap-3">
                  <Switch
                    checked={test.randomizeQuestions}
                    onChange={(checked) => handleTestChange('randomizeQuestions', checked)}
                  />
                  <span className="text-sm font-medium">Randomize Question Order</span>
                </label>

                <label className="flex items-center gap-3">
                  <Switch
                    checked={test.randomizeOptions}
                    onChange={(checked) => handleTestChange('randomizeOptions', checked)}
                  />
                  <span className="text-sm font-medium">Randomize Options</span>
                </label>

                <label className="flex items-center gap-3">
                  <Switch
                    checked={test.autoSubmitOnTimeout}
                    onChange={(checked) => handleTestChange('autoSubmitOnTimeout', checked)}
                  />
                  <span className="text-sm font-medium">Auto Submit on Timeout</span>
                </label>
              </Card.Content>
            </Card>

            {/* Negative Marking */}
            <Card>
              <Card.Header>
                <h2 className="text-xl font-semibold">Negative Marking</h2>
              </Card.Header>
              <Card.Content className="space-y-4">
                <label className="flex items-center gap-3">
                  <Switch
                    checked={test.negativeMarking.enabled}
                    onChange={(checked) =>
                      handleNestedChange('negativeMarking', 'enabled', checked)
                    }
                  />
                  <span className="text-sm font-medium">Enable Negative Marking</span>
                </label>

                {test.negativeMarking.enabled && (
                  <div>
                    <label className="block text-sm font-medium mb-1">
                      Negative Marking Percentage (%)
                    </label>
                    <Input
                      type="number"
                      value={test.negativeMarking.percentage}
                      onChange={(e) =>
                        handleNestedChange('negativeMarking', 'percentage', parseInt(e.target.value))
                      }
                      min="0"
                      max="100"
                    />
                  </div>
                )}
              </Card.Content>
            </Card>
          </div>
        </Tabs.Tab>

        {/* Anti-Cheating Settings Tab */}
        <Tabs.Tab label="Anti-Cheating" value="antiCheating">
          <Card>
            <Card.Header>
              <h2 className="text-xl font-semibold">Anti-Cheating Protection</h2>
            </Card.Header>
            <Card.Content className="space-y-4">
              <Alert type="info" title="Security Note">
                These settings help maintain test integrity and prevent malpractices.
              </Alert>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <label className="flex items-center gap-3">
                  <Switch
                    checked={test.antiCheatSettings.fullscreenRequired}
                    onChange={(checked) =>
                      handleNestedChange('antiCheatSettings', 'fullscreenRequired', checked)
                    }
                  />
                  <span className="text-sm font-medium">Require Fullscreen Mode</span>
                </label>

                <label className="flex items-center gap-3">
                  <Switch
                    checked={test.antiCheatSettings.preventTabSwitch}
                    onChange={(checked) =>
                      handleNestedChange('antiCheatSettings', 'preventTabSwitch', checked)
                    }
                  />
                  <span className="text-sm font-medium">Detect Tab Switching</span>
                </label>

                <label className="flex items-center gap-3">
                  <Switch
                    checked={test.antiCheatSettings.preventRightClick}
                    onChange={(checked) =>
                      handleNestedChange('antiCheatSettings', 'preventRightClick', checked)
                    }
                  />
                  <span className="text-sm font-medium">Disable Right-Click</span>
                </label>

                <label className="flex items-center gap-3">
                  <Switch
                    checked={test.antiCheatSettings.preventCopyPaste}
                    onChange={(checked) =>
                      handleNestedChange('antiCheatSettings', 'preventCopyPaste', checked)
                    }
                  />
                  <span className="text-sm font-medium">Prevent Copy/Paste</span>
                </label>

                <label className="flex items-center gap-3">
                  <Switch
                    checked={test.antiCheatSettings.detectMinimize}
                    onChange={(checked) =>
                      handleNestedChange('antiCheatSettings', 'detectMinimize', checked)
                    }
                  />
                  <span className="text-sm font-medium">Detect Window Minimize</span>
                </label>

                <div>
                  <label className="block text-sm font-medium mb-2">
                    Max Violations Before Auto-Submit
                  </label>
                  <Input
                    type="number"
                    value={test.antiCheatSettings.maxViolationsBeforeAutoSubmit}
                    onChange={(e) =>
                      handleNestedChange(
                        'antiCheatSettings',
                        'maxViolationsBeforeAutoSubmit',
                        parseInt(e.target.value)
                      )
                    }
                    min="1"
                  />
                </div>
              </div>
            </Card.Content>
          </Card>
        </Tabs.Tab>

        {/* Questions Tab */}
        <Tabs.Tab label="Questions" value="questions">
          <div className="space-y-4">
            <Button onClick={addQuestion} className="bg-green-600">
              <Plus className="w-4 h-4 mr-2" />
              Add Question
            </Button>

            <div className="space-y-3">
              {test.questions.map((question, index) => (
                <Card key={question.questionId}>
                  <Card.Content className="py-4">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <Badge variant="secondary">Q{index + 1}</Badge>
                          <Badge variant="outline">{question.type.toUpperCase()}</Badge>
                          <Badge variant="outline">{question.marks} marks</Badge>
                          <span className="text-xs text-gray-500">
                            Difficulty: {question.difficulty}
                          </span>
                        </div>
                        <p className="text-sm font-medium line-clamp-2">{question.questionText}</p>
                        {question.tags.length > 0 && (
                          <div className="flex gap-1 mt-2">
                            {question.tags.map((tag) => (
                              <Badge key={tag} variant="ghost" className="text-xs">
                                {tag}
                              </Badge>
                            ))}
                          </div>
                        )}
                      </div>
                      <div className="flex gap-2 ml-4">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            setCurrentQuestion(question);
                            setShowQuestionModal(true);
                          }}
                        >
                          <Edit2 className="w-4 h-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => duplicateQuestion(question)}
                        >
                          <Copy className="w-4 h-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => deleteQuestion(question.questionId)}
                          className="text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </Card.Content>
                </Card>
              ))}
            </div>

            {test.questions.length === 0 && (
              <Alert type="info" title="No Questions">
                Start adding questions to your test by clicking "Add Question" button.
              </Alert>
            )}

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-sm">
                <span className="font-semibold">Total Questions:</span> {test.questions.length}
              </p>
              <p className="text-sm">
                <span className="font-semibold">Total Marks:</span>{' '}
                {test.questions.reduce((sum, q) => sum + q.marks, 0)}
              </p>
            </div>
          </div>
        </Tabs.Tab>
      </Tabs>

      {/* Question Modal */}
      <QuestionBuilder
        isOpen={showQuestionModal}
        question={currentQuestion}
        onSave={saveQuestion}
        onClose={() => {
          setShowQuestionModal(false);
          setCurrentQuestion(null);
        }}
        onChange={setCurrentQuestion}
      />
    </div>
  );
}

// Sub-component for question building
function QuestionBuilder({ isOpen, question, onSave, onClose, onChange }) {
  if (!isOpen || !question) return null;

  const handleFieldChange = (field, value) => {
    onChange((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Question Builder" size="lg">
      <div className="space-y-4 max-h-[80vh] overflow-y-auto">
        <div>
          <label className="block text-sm font-medium mb-1">Question Text *</label>
          <Textarea
            value={question.questionText}
            onChange={(e) => handleFieldChange('questionText', e.target.value)}
            rows={3}
            placeholder="Enter the question text..."
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Question Type</label>
            <Select
              value={question.type}
              onChange={(e) => handleFieldChange('type', e.target.value)}
            >
              <option value="mcq">Multiple Choice</option>
              <option value="true-false">True/False</option>
              <option value="multi-select">Multi-Select</option>
              <option value="fill-blank">Fill in the Blank</option>
              <option value="descriptive">Descriptive</option>
              <option value="coding">Coding</option>
              <option value="match-following">Match the Following</option>
              <option value="image-based">Image Based</option>
            </Select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Difficulty</label>
            <Select
              value={question.difficulty}
              onChange={(e) => handleFieldChange('difficulty', e.target.value)}
            >
              <option value="Easy">Easy</option>
              <option value="Medium">Medium</option>
              <option value="Hard">Hard</option>
            </Select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Marks</label>
            <Input
              type="number"
              value={question.marks}
              onChange={(e) => handleFieldChange('marks', parseInt(e.target.value))}
              min="0"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Tags</label>
            <Input
              placeholder="Comma-separated tags"
              value={question.tags?.join(', ') || ''}
              onChange={(e) =>
                handleFieldChange('tags', e.target.value.split(',').map((t) => t.trim()))
              }
            />
          </div>
        </div>

        {/* MCQ Options */}
        {(question.type === 'mcq' || question.type === 'multi-select' || question.type === 'true-false') && (
          <div>
            <label className="block text-sm font-medium mb-2">Options</label>
            <div className="space-y-2">
              {question.options?.map((option, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <Input
                    placeholder={`Option ${option.optionId}`}
                    value={option.text}
                    onChange={(e) => {
                      const newOptions = [...question.options];
                      newOptions[idx].text = e.target.value;
                      handleFieldChange('options', newOptions);
                    }}
                  />
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={option.isCorrect || false}
                      onChange={(e) => {
                        const newOptions = [...question.options];
                        if (question.type === 'mcq' || question.type === 'true-false') {
                          // Only one correct for MCQ
                          newOptions.forEach((opt) => (opt.isCorrect = false));
                          newOptions[idx].isCorrect = e.target.checked;
                        } else {
                          newOptions[idx].isCorrect = e.target.checked;
                        }
                        handleFieldChange('options', newOptions);
                      }}
                    />
                    <span className="text-sm">Correct</span>
                  </label>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="flex justify-end gap-3 mt-6 pt-4 border-t">
        <Button variant="outline" onClick={onClose}>
          Cancel
        </Button>
        <Button onClick={onSave} className="bg-blue-600">
          Save Question
        </Button>
      </div>
    </Modal>
  );
}
