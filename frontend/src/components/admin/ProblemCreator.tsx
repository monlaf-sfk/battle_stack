import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/Card';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { CodeEditor, LanguageSelector, ThemeToggle } from '../ui/CodeEditor';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Trash2, Eye, EyeOff, Save, FileText, Code, TestTube, Building, Tag, Lightbulb, Settings, BookOpen, Puzzle } from 'lucide-react';
import { ExampleProblems } from './ExampleProblems';
import type { ExampleProblem } from './ExampleProblems';

interface TestCase {
  id: string;
  input_data: string;
  expected_output: string;
  explanation: string;
  is_example: boolean;
  is_hidden: boolean;
  order_index: number;
}

interface CodeTemplate {
  id: string;
  language: string;
  template_code: string;
  default_code: string;
}

interface Tag {
  id: string;
  name: string;
  description?: string;
}

interface Company {
  id: string;
  name: string;
  logo_url?: string;
}

interface ProblemData {
  title: string;
  description: string;
  difficulty: 'easy' | 'medium' | 'hard';
  problem_type: 'algorithm' | 'database' | 'shell' | 'concurrency';
  time_limit_ms: number;
  memory_limit_mb: number;
  hints: string[];
  editorial: string;
  is_premium: boolean;
  tag_ids: string[];
  company_ids: string[];
  test_cases: TestCase[];
  code_templates: CodeTemplate[];
}

interface ProblemDataWithRelations extends Partial<ProblemData> {
  tags?: Tag[];
  companies?: Company[];
}

interface ProblemCreatorProps {
  onSave: (data: ProblemData) => Promise<void>;
  onCancel: () => void;
  initialData?: ProblemDataWithRelations;
  availableTags: Tag[];
  availableCompanies: Company[];
}

export const ProblemCreator: React.FC<ProblemCreatorProps> = ({
  onSave,
  onCancel,
  initialData,
  availableTags = [],
  availableCompanies = []
}) => {
  const [activeTab, setActiveTab] = useState<'examples' | 'basic' | 'description' | 'testcases' | 'templates' | 'editorial'>('examples');
  const [editorTheme, setEditorTheme] = useState<'vs-dark' | 'vs-light'>('vs-dark');
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const [formData, setFormData] = useState<ProblemData>(() => {
    const defaultData: ProblemData = {
      title: '',
      description: '',
      difficulty: 'easy',
      problem_type: 'algorithm',
      time_limit_ms: 2000,
      memory_limit_mb: 128,
      hints: [''],
      editorial: '',
      is_premium: false,
      tag_ids: [],
      company_ids: [],
      test_cases: [{
        id: '1',
        input_data: '',
        expected_output: '',
        explanation: '',
        is_example: true,
        is_hidden: false,
        order_index: 0
      }],
      code_templates: [{
        id: '1',
        language: 'python',
        template_code: 'def solution():\n    # Your code here\n    pass',
        default_code: 'def solution():\n    \n    '
      }]
    };
    
    if (initialData) {
      return {
        ...defaultData,
        ...initialData,
        tag_ids: initialData.tags?.map(tag => tag.id) || [],
        company_ids: initialData.companies?.map(company => company.id) || [],
        test_cases: initialData.test_cases || defaultData.test_cases,
        code_templates: initialData.code_templates || defaultData.code_templates,
        hints: initialData.hints || defaultData.hints
      } as ProblemData;
    }
    
    return defaultData;
  });

  const handleSave = async () => {
    setFormError(null);

    // Validation logic
    for (const tc of formData.test_cases) {
      if (tc.is_example && !tc.expected_output.trim()) {
        const errorMsg = `Example test case (Input: "${tc.input_data}") is missing an expected output.`;
        setFormError(errorMsg);
        alert(errorMsg); // Simple alert for immediate feedback
        return; // Stop saving
      }
    }

    setSaving(true);
    try {
      await onSave(formData);
    } finally {
      setSaving(false);
    }
  };

  const addTestCase = () => {
    const newTestCase: TestCase = {
      id: Date.now().toString(),
      input_data: '',
      expected_output: '',
      explanation: '',
      is_example: true,
      is_hidden: false,
      order_index: formData.test_cases.length
    };
    setFormData(prev => ({
      ...prev,
      test_cases: [...prev.test_cases, newTestCase]
    }));
  };

  const updateTestCase = (id: string, updates: Partial<TestCase>) => {
    setFormData(prev => ({
      ...prev,
      test_cases: prev.test_cases.map(tc => 
        tc.id === id ? { ...tc, ...updates } : tc
      )
    }));
  };

  const removeTestCase = (id: string) => {
    setFormData(prev => ({
      ...prev,
      test_cases: prev.test_cases.filter(tc => tc.id !== id)
    }));
  };

  const addCodeTemplate = () => {
    const newTemplate: CodeTemplate = {
      id: Date.now().toString(),
      language: 'python',
      template_code: 'def solution():\n    # Your code here\n    pass',
      default_code: 'def solution():\n    \n    '
    };
    setFormData(prev => ({
      ...prev,
      code_templates: [...prev.code_templates, newTemplate]
    }));
  };

  const updateCodeTemplate = (id: string, updates: Partial<CodeTemplate>) => {
    setFormData(prev => ({
      ...prev,
      code_templates: prev.code_templates.map(ct => 
        ct.id === id ? { ...ct, ...updates } : ct
      )
    }));
  };

  const removeCodeTemplate = (id: string) => {
    setFormData(prev => ({
      ...prev,
      code_templates: prev.code_templates.filter(ct => ct.id !== id)
    }));
  };

  const addHint = () => {
    setFormData(prev => ({
      ...prev,
      hints: [...prev.hints, '']
    }));
  };

  const updateHint = (index: number, value: string) => {
    setFormData(prev => ({
      ...prev,
      hints: prev.hints.map((hint, i) => i === index ? value : hint)
    }));
  };

  const removeHint = (index: number) => {
    setFormData(prev => ({
      ...prev,
      hints: prev.hints.filter((_, i) => i !== index)
    }));
  };

  const tabs = [
    { id: 'examples', label: 'Examples', icon: Lightbulb, description: 'Browse example problems' },
    { id: 'basic', label: 'Basic Info', icon: FileText, description: 'Title, difficulty, type' },
    { id: 'description', label: 'Description', icon: BookOpen, description: 'Problem statement' },
    { id: 'testcases', label: 'Test Cases', icon: TestTube, description: 'Input/output validation' },
    { id: 'templates', label: 'Code Templates', icon: Code, description: 'Language templates' },
    { id: 'editorial', label: 'Editorial', icon: Puzzle, description: 'Solution explanation' }
  ];

  const handleSelectExample = (example: ExampleProblem) => {
    // Map example data to form data
    setFormData({
      title: example.title,
      description: example.description,
      difficulty: example.difficulty,
      problem_type: example.problem_type,
      time_limit_ms: example.time_limit_ms,
      memory_limit_mb: example.memory_limit_mb,
      hints: example.hints,
      editorial: example.editorial,
      is_premium: false,
      tag_ids: [], // These will need to be mapped from tag names to IDs
      company_ids: [], // These will need to be mapped from company names to IDs
      test_cases: example.test_cases.map((tc, index) => ({
        id: Date.now().toString() + index,
        input_data: tc.input_data,
        expected_output: tc.expected_output,
        explanation: tc.explanation,
        is_example: tc.is_example,
        is_hidden: tc.is_hidden,
        order_index: index
      })),
      code_templates: example.code_templates.map((ct, index) => ({
        id: Date.now().toString() + index,
        language: ct.language,
        template_code: ct.template_code,
        default_code: ct.template_code
      }))
    });
    
    // Switch to basic tab after selecting example
    setActiveTab('basic');
  };

  return (
    <div className="max-w-6xl mx-auto">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-6"
      >
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold gradient-text flex items-center gap-3">
              <Settings size={28} className="text-arena-accent" />
              {initialData ? 'Edit Problem' : 'Create New Problem'}
            </h2>
            <p className="text-arena-text-muted mt-2">
              {initialData ? 'Update problem details and settings' : 'Design and configure a new coding challenge'}
            </p>
          </div>
          
          <div className="flex gap-3">
            <Button
              onClick={onCancel}
              variant="ghost"
              className="border border-arena-border hover:border-arena-accent/40"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              variant="gradient"
              disabled={saving || !formData.title.trim()}
              loading={saving}
              className="font-semibold"
            >
              {saving ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-arena-dark border-t-transparent mr-2"></div>
                  Saving...
                </>
              ) : (
                <>
                  <Save size={16} className="mr-2" />
                  {initialData ? 'Update Problem' : 'Create Problem'}
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Progress Indicator */}
        <div className="flex items-center gap-2 mb-6">
          {tabs.map((tab, index) => (
            <div key={tab.id} className="flex items-center">
              <div 
                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-all duration-300 ${
                  tabs.findIndex(t => t.id === activeTab) >= index
                    ? 'bg-arena-accent text-arena-dark'
                    : 'bg-arena-surface border border-arena-border text-arena-text-muted'
                }`}
              >
                {index + 1}
              </div>
              {index < tabs.length - 1 && (
                <div 
                  className={`h-0.5 w-12 transition-all duration-300 ${
                    tabs.findIndex(t => t.id === activeTab) > index
                      ? 'bg-arena-accent'
                      : 'bg-arena-border'
                  }`}
                />
              )}
            </div>
          ))}
        </div>

        {/* Tab Navigation */}
        <Card variant="glass" className="border-arena-border">
          <CardContent className="p-2">
            <div className="flex flex-wrap gap-1">
              {tabs.map((tab) => (
                <motion.button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-300 relative overflow-hidden group ${
                    activeTab === tab.id
                      ? 'bg-arena-accent text-arena-dark font-semibold shadow-arena-glow'
                      : 'text-arena-text-muted hover:text-arena-text hover:bg-arena-surface/50'
                  }`}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <tab.icon size={18} />
                  <div className="text-left">
                    <div className="font-medium">{tab.label}</div>
                    <div className={`text-xs ${activeTab === tab.id ? 'text-arena-dark/70' : 'text-arena-text-muted'}`}>
                      {tab.description}
                    </div>
                  </div>
                  {activeTab === tab.id && (
                    <motion.div
                      layoutId="activeTabIndicator"
                      className="absolute inset-0 bg-arena-accent/10 rounded-lg -z-10"
                      transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                    />
                  )}
                </motion.button>
              ))}
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Tab Content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.3 }}
        >
          {activeTab === 'examples' && (
            <Card variant="glass" hover="glow">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Lightbulb size={20} className="text-arena-accent" />
                  Example Problems
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ExampleProblems onSelectExample={handleSelectExample} />
              </CardContent>
            </Card>
          )}

          {activeTab === 'basic' && (
            <div className="space-y-6">
              <Card variant="glass" hover="glow">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileText size={20} className="text-arena-accent" />
                    Basic Information
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-arena-text mb-2">
                        Problem Title
                      </label>
                      <Input
                        placeholder="Enter problem title..."
                        value={formData.title}
                        onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                        className="bg-arena-surface/50 border-arena-border focus:border-arena-accent"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-arena-text mb-2">
                        Difficulty
                      </label>
                      <select
                        value={formData.difficulty}
                        onChange={(e) => setFormData(prev => ({ ...prev, difficulty: e.target.value as any }))}
                        className="w-full bg-arena-surface/50 border border-arena-border text-arena-text rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-arena-accent focus:border-arena-accent transition-all duration-200"
                      >
                        <option value="easy">Easy</option>
                        <option value="medium">Medium</option>
                        <option value="hard">Hard</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-arena-text mb-2">
                        Problem Type
                      </label>
                      <select
                        value={formData.problem_type}
                        onChange={(e) => setFormData(prev => ({ ...prev, problem_type: e.target.value as any }))}
                        className="w-full bg-arena-surface/50 border border-arena-border text-arena-text rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-arena-accent focus:border-arena-accent transition-all duration-200"
                      >
                        <option value="algorithm">Algorithm</option>
                        <option value="database">Database</option>
                        <option value="shell">Shell</option>
                        <option value="concurrency">Concurrency</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-arena-text mb-2">
                        Time Limit (ms)
                      </label>
                      <Input
                        type="number"
                        value={formData.time_limit_ms}
                        onChange={(e) => setFormData(prev => ({ ...prev, time_limit_ms: parseInt(e.target.value) || 2000 }))}
                        className="bg-arena-surface/50 border-arena-border focus:border-arena-accent"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-arena-text mb-2">
                        Memory Limit (MB)
                      </label>
                      <Input
                        type="number"
                        value={formData.memory_limit_mb}
                        onChange={(e) => setFormData(prev => ({ ...prev, memory_limit_mb: parseInt(e.target.value) || 128 }))}
                        className="bg-arena-surface/50 border-arena-border focus:border-arena-accent"
                      />
                    </div>

                    <div className="md:col-span-2">
                      <label className="flex items-center gap-2 text-sm font-medium text-arena-text">
                        <input
                          type="checkbox"
                          checked={formData.is_premium}
                          onChange={(e) => setFormData(prev => ({ ...prev, is_premium: e.target.checked }))}
                          className="w-4 h-4 text-arena-accent bg-arena-surface border-arena-border rounded focus:ring-arena-accent"
                        />
                        Premium Problem
                      </label>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Tags and Companies */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card variant="glass" hover="glow">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Tag size={16} className="text-arena-accent" />
                      Tags
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="flex flex-wrap gap-2">
                        {availableTags.map((tag) => (
                          <motion.button
                            key={tag.id}
                            onClick={() => {
                              const isSelected = formData.tag_ids.includes(tag.id);
                              setFormData(prev => ({
                                ...prev,
                                tag_ids: isSelected
                                  ? prev.tag_ids.filter(id => id !== tag.id)
                                  : [...prev.tag_ids, tag.id]
                              }));
                            }}
                            className={`px-3 py-1 text-sm rounded-md border transition-all duration-200 ${
                              formData.tag_ids.includes(tag.id)
                                ? 'bg-arena-accent/20 border-arena-accent text-arena-accent'
                                : 'bg-arena-surface border-arena-border text-arena-text-muted hover:border-arena-accent/40'
                            }`}
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                          >
                            {tag.name}
                          </motion.button>
                        ))}
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card variant="glass" hover="glow">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Building size={16} className="text-arena-accent" />
                      Companies
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="flex flex-wrap gap-2">
                        {availableCompanies.map((company) => (
                          <motion.button
                            key={company.id}
                            onClick={() => {
                              const isSelected = formData.company_ids.includes(company.id);
                              setFormData(prev => ({
                                ...prev,
                                company_ids: isSelected
                                  ? prev.company_ids.filter(id => id !== company.id)
                                  : [...prev.company_ids, company.id]
                              }));
                            }}
                            className={`px-3 py-1 text-sm rounded-md border transition-all duration-200 ${
                              formData.company_ids.includes(company.id)
                                ? 'bg-arena-secondary/20 border-arena-secondary text-arena-secondary'
                                : 'bg-arena-surface border-arena-border text-arena-text-muted hover:border-arena-secondary/40'
                            }`}
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                          >
                            {company.name}
                          </motion.button>
                        ))}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          )}

          {activeTab === 'description' && (
            <Card variant="glass" hover="glow">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BookOpen size={20} className="text-arena-accent" />
                  Problem Description
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  <div>
                    <label className="block text-sm font-medium text-arena-text mb-2">
                      Problem Statement
                    </label>
                    <textarea
                      value={formData.description}
                      onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                      placeholder="Describe the problem in detail..."
                      className="w-full h-64 bg-arena-surface/50 border border-arena-border text-arena-text rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-arena-accent focus:border-arena-accent transition-all duration-200 resize-none"
                    />
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <label className="text-sm font-medium text-arena-text">
                        Hints
                      </label>
                      <Button
                        size="sm"
                        onClick={addHint}
                        variant="ghost"
                        className="text-arena-accent hover:bg-arena-accent/10"
                      >
                        <Plus size={16} className="mr-1" />
                        Add Hint
                      </Button>
                    </div>
                    <div className="space-y-3">
                      {formData.hints.map((hint, index) => (
                        <div key={index} className="flex gap-2">
                          <Input
                            placeholder={`Hint ${index + 1}...`}
                            value={hint}
                            onChange={(e) => updateHint(index, e.target.value)}
                            className="bg-arena-surface/50 border-arena-border focus:border-arena-accent"
                          />
                          {formData.hints.length > 1 && (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => removeHint(index)}
                              className="text-red-400 hover:bg-red-500/10"
                            >
                              <Trash2 size={16} />
                            </Button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {activeTab === 'testcases' && (
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <TestTube size={16} className="text-arena-accent" />
                  Test Cases
                </div>
                <Button onClick={addTestCase} variant="gradient">
                  <Plus size={16} className="mr-1" />
                  Add Test Case
                </Button>
              </div>

              {formData.test_cases.map((testCase, index) => {
                const isExampleAndEmpty = testCase.is_example && !testCase.expected_output.trim();
                return (
                  <Card key={testCase.id} className={`transition-all duration-300 ${isExampleAndEmpty ? 'border-red-500/50 ring-2 ring-red-500/20' : ''}`}>
                    <div className="p-6">
                      <div className="flex justify-between items-center mb-4">
                        <div className="flex items-center gap-3">
                          <h4 className="font-medium">Test Case {index + 1}</h4>
                          {isExampleAndEmpty && (
                            <span className="text-xs text-red-400 bg-red-500/10 px-2 py-1 rounded-md">
                              Output required for examples
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => updateTestCase(testCase.id, { is_example: !testCase.is_example })}
                            className={testCase.is_example ? 'text-green-400' : 'text-arena-text-dim'}
                          >
                            <Eye size={16} />
                            Example
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => updateTestCase(testCase.id, { is_hidden: !testCase.is_hidden })}
                            className={testCase.is_hidden ? 'text-red-400' : 'text-arena-text-dim'}
                          >
                            <EyeOff size={16} />
                            Hidden
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => removeTestCase(testCase.id)}
                            className="text-red-400 hover:text-red-500"
                          >
                            <Trash2 size={16} />
                          </Button>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-arena-text-muted mb-1">Input Data (JSON)</label>
                          <CodeEditor
                            value={testCase.input_data}
                            onChange={(value) => updateTestCase(testCase.id, { input_data: value })}
                            language="json"
                            height="150px"
                            theme={editorTheme}
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-arena-text-muted mb-1">Expected Output</label>
                          <CodeEditor
                            value={testCase.expected_output}
                            onChange={(value) => updateTestCase(testCase.id, { expected_output: value })}
                            language="text"
                            height="150px"
                            theme={editorTheme}
                          />
                        </div>
                      </div>

                      <div className="mt-4">
                        <label className="block text-sm font-medium text-arena-text-muted mb-1">Explanation</label>
                        <Input
                          value={testCase.explanation}
                          onChange={(e) => updateTestCase(testCase.id, { explanation: e.target.value })}
                          placeholder="Explain this test case..."
                        />
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}

          {activeTab === 'templates' && (
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold">Code Templates</h3>
                <Button onClick={addCodeTemplate} className="bg-arena-accent hover:bg-arena-accent-hover text-arena-dark">
                  <Plus size={16} className="mr-1" />
                  Add Template
                </Button>
              </div>

              {formData.code_templates.map((template, index) => (
                <Card key={template.id}>
                  <div className="p-6">
                    <div className="flex justify-between items-center mb-4">
                      <h4 className="font-medium">Template {index + 1}</h4>
                      <div className="flex items-center gap-2">
                        <LanguageSelector
                          value={template.language}
                          onChange={(lang) => updateCodeTemplate(template.id, { language: lang })}
                        />
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeCodeTemplate(template.id)}
                          className="text-red-400 hover:text-red-500"
                        >
                          <Trash2 size={16} />
                        </Button>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-arena-text-muted mb-1">Template Code</label>
                        <CodeEditor
                          value={template.template_code}
                          onChange={(value) => updateCodeTemplate(template.id, { template_code: value })}
                          language={template.language}
                          height="300px"
                          theme={editorTheme}
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-arena-text-muted mb-1">Default Code (for users)</label>
                        <CodeEditor
                          value={template.default_code}
                          onChange={(value) => updateCodeTemplate(template.id, { default_code: value })}
                          language={template.language}
                          height="300px"
                          theme={editorTheme}
                        />
                      </div>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}

          {activeTab === 'editorial' && (
            <Card variant="glass" hover="glow">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Puzzle size={20} className="text-arena-accent" />
                  Editorial & Solution Explanation
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  <div>
                    <label className="block text-sm font-medium text-arena-text mb-2">
                      Editorial
                    </label>
                    <textarea
                      value={formData.editorial}
                      onChange={(e) => setFormData(prev => ({ ...prev, editorial: e.target.value }))}
                      placeholder="Write the editorial for the problem..."
                      className="w-full h-64 bg-arena-surface/50 border border-arena-border text-arena-text rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-arena-accent focus:border-arena-accent transition-all duration-200 resize-none"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}; 