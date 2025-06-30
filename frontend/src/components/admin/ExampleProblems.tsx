
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Clipboard, FileCode, Hash, Database, Terminal } from 'lucide-react';

export interface ExampleProblem {
  title: string;
  description: string;
  difficulty: 'easy' | 'medium' | 'hard';
  problem_type: 'algorithm' | 'database' | 'shell' | 'concurrency';
  time_limit_ms: number;
  memory_limit_mb: number;
  hints: string[];
  editorial: string;
  test_cases: Array<{
    input_data: string;
    expected_output: string;
    explanation: string;
    is_example: boolean;
    is_hidden: boolean;
  }>;
  code_templates: Array<{
    language: string;
    template_code: string;
  }>;
  tags: string[];
  companies: string[];
}

const exampleProblems: ExampleProblem[] = [
  {
    title: "Two Sum",
    description: `Given an array of integers \`nums\` and an integer \`target\`, return indices of the two numbers such that they add up to target.

You may assume that each input would have exactly one solution, and you may not use the same element twice.

You can return the answer in any order.

**Example 1:**
\`\`\`
Input: nums = [2,7,11,15], target = 9
Output: [0,1]
Explanation: Because nums[0] + nums[1] == 9, we return [0, 1].
\`\`\`

**Example 2:**
\`\`\`
Input: nums = [3,2,4], target = 6
Output: [1,2]
\`\`\`

**Example 3:**
\`\`\`
Input: nums = [3,3], target = 6
Output: [0,1]
\`\`\`

**Constraints:**
- 2 <= nums.length <= 10^4
- -10^9 <= nums[i] <= 10^9
- -10^9 <= target <= 10^9
- Only one valid answer exists.`,
    difficulty: "easy",
    problem_type: "algorithm",
    time_limit_ms: 2000,
    memory_limit_mb: 128,
    hints: [
      "Use a hash map to store numbers you've seen",
      "For each number, check if target - number exists in the hash map",
      "Time complexity can be O(n)"
    ],
    editorial: `## Solution

The brute force approach is to check all pairs of numbers, which takes O(n²) time. We can optimize this using a hash map.

### Approach: One-Pass Hash Map

As we iterate through the array, we check if the complement (target - current number) exists in our hash map. If it does, we've found our pair.

\`\`\`python
def twoSum(nums, target):
    seen = {}
    for i, num in enumerate(nums):
        complement = target - num
        if complement in seen:
            return [seen[complement], i]
        seen[num] = i
    return []
\`\`\`

**Time Complexity:** O(n)
**Space Complexity:** O(n)`,
    test_cases: [
      {
        input_data: '{"nums": [2,7,11,15], "target": 9}',
        expected_output: '[0,1]',
        explanation: 'nums[0] + nums[1] = 2 + 7 = 9',
        is_example: true,
        is_hidden: false
      },
      {
        input_data: '{"nums": [3,2,4], "target": 6}',
        expected_output: '[1,2]',
        explanation: 'nums[1] + nums[2] = 2 + 4 = 6',
        is_example: true,
        is_hidden: false
      },
      {
        input_data: '{"nums": [3,3], "target": 6}',
        expected_output: '[0,1]',
        explanation: 'nums[0] + nums[1] = 3 + 3 = 6',
        is_example: true,
        is_hidden: false
      },
      {
        input_data: '{"nums": [1,2,3,4,5], "target": 9}',
        expected_output: '[3,4]',
        explanation: 'Hidden test case',
        is_example: false,
        is_hidden: true
      }
    ],
    code_templates: [
      {
        language: "python",
        template_code: `class Solution:
    def twoSum(self, nums: List[int], target: int) -> List[int]:
        # Write your solution here
        pass`
      },
      {
        language: "javascript",
        template_code: `/**
 * @param {number[]} nums
 * @param {number} target
 * @return {number[]}
 */
var twoSum = function(nums, target) {
    // Write your solution here
};`
      },
      {
        language: "java",
        template_code: `class Solution {
    public int[] twoSum(int[] nums, int target) {
        // Write your solution here
        return new int[]{};
    }
}`
      }
    ],
    tags: ["Array", "Hash Table"],
    companies: ["Amazon", "Google", "Microsoft"]
  },
  {
    title: "Valid Parentheses",
    description: `Given a string \`s\` containing just the characters '(', ')', '{', '}', '[' and ']', determine if the input string is valid.

An input string is valid if:
1. Open brackets must be closed by the same type of brackets.
2. Open brackets must be closed in the correct order.
3. Every close bracket has a corresponding open bracket of the same type.

**Example 1:**
\`\`\`
Input: s = "()"
Output: true
\`\`\`

**Example 2:**
\`\`\`
Input: s = "()[]{}"
Output: true
\`\`\`

**Example 3:**
\`\`\`
Input: s = "(]"
Output: false
\`\`\``,
    difficulty: "easy",
    problem_type: "algorithm",
    time_limit_ms: 1000,
    memory_limit_mb: 64,
    hints: [
      "Use a stack data structure",
      "When you see an opening bracket, push it to the stack",
      "When you see a closing bracket, check if it matches the top of the stack"
    ],
    editorial: `## Solution: Stack

Use a stack to keep track of opening brackets. When we encounter a closing bracket, we check if it matches the most recent opening bracket.

\`\`\`python
def isValid(s):
    stack = []
    mapping = {")": "(", "}": "{", "]": "["}
    
    for char in s:
        if char in mapping:
            if not stack or stack.pop() != mapping[char]:
                return False
        else:
            stack.append(char)
    
    return not stack
\`\`\``,
    test_cases: [
      {
        input_data: '{"s": "()"}',
        expected_output: 'true',
        explanation: 'Simple valid parentheses',
        is_example: true,
        is_hidden: false
      },
      {
        input_data: '{"s": "()[]{}"}',
        expected_output: 'true',
        explanation: 'Multiple types of brackets',
        is_example: true,
        is_hidden: false
      },
      {
        input_data: '{"s": "(]"}',
        expected_output: 'false',
        explanation: 'Mismatched brackets',
        is_example: true,
        is_hidden: false
      }
    ],
    code_templates: [
      {
        language: "python",
        template_code: `class Solution:
    def isValid(self, s: str) -> bool:
        # Write your solution here
        pass`
      }
    ],
    tags: ["Stack", "String"],
    companies: ["Facebook", "Apple", "Bloomberg"]
  },
  {
    title: "Database Query: Find Duplicate Emails",
    description: `Write a SQL query to find all duplicate emails in a table named \`Person\`.

**Table: Person**
\`\`\`
+----+---------+
| id | email   |
+----+---------+
| 1  | a@b.com |
| 2  | c@d.com |
| 3  | a@b.com |
+----+---------+
\`\`\`

**Result:**
\`\`\`
+---------+
| Email   |
+---------+
| a@b.com |
+---------+
\`\`\``,
    difficulty: "easy",
    problem_type: "database",
    time_limit_ms: 5000,
    memory_limit_mb: 256,
    hints: [
      "Use GROUP BY and HAVING clauses",
      "Count occurrences of each email"
    ],
    editorial: `## Solution

Use GROUP BY to group emails and HAVING to filter groups with count > 1.

\`\`\`sql
SELECT email
FROM Person
GROUP BY email
HAVING COUNT(email) > 1;
\`\`\``,
    test_cases: [
      {
        input_data: 'Table with duplicate emails',
        expected_output: 'Emails that appear more than once',
        explanation: 'Basic test case',
        is_example: true,
        is_hidden: false
      }
    ],
    code_templates: [
      {
        language: "sql",
        template_code: `-- Write your SQL query here
SELECT ...`
      }
    ],
    tags: ["Database", "SQL"],
    companies: ["Microsoft", "Oracle"]
  }
];

interface ExampleProblemsProps {
  onSelectExample: (example: ExampleProblem) => void;
}

export const ExampleProblems: React.FC<ExampleProblemsProps> = ({ onSelectExample }) => {
  const getIcon = (type: string) => {
    switch (type) {
      case 'algorithm':
        return <FileCode className="w-5 h-5" />;
      case 'database':
        return <Database className="w-5 h-5" />;
      case 'shell':
        return <Terminal className="w-5 h-5" />;
      default:
        return <Hash className="w-5 h-5" />;
    }
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'easy':
        return 'text-green-400 bg-green-500/20 border border-green-500/30';
      case 'medium':
        return 'text-yellow-400 bg-yellow-500/20 border border-yellow-500/30';
      case 'hard':
        return 'text-red-400 bg-red-500/20 border border-red-500/30';
      default:
        return 'text-gray-400 bg-gray-500/20 border border-gray-500/30';
    }
  };

  return (
    <div className="space-y-4">
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-white mb-2">Example Problems</h3>
        <p className="text-sm text-arena-text-muted">
          Click on any example below to pre-fill the form with sample data. 
          You can then modify it as needed.
        </p>
      </div>
      
      {exampleProblems.map((example, index) => (
        <Card key={index} variant="default" hover="glow" className="transition-all cursor-pointer">
          <div 
            className="p-6"
            onClick={() => onSelectExample(example)}
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  {getIcon(example.problem_type)}
                  <h4 className="text-lg font-semibold text-white">
                    {example.title}
                  </h4>
                  <span className={`px-2 py-1 text-xs font-medium rounded-full ${getDifficultyColor(example.difficulty)}`}>
                    {example.difficulty}
                  </span>
                </div>
                
                <p className="text-sm text-arena-text-muted mb-3 line-clamp-2">
                  {example.description.split('\n')[0]}
                </p>
                
                <div className="flex flex-wrap gap-2 mb-3">
                  {example.tags.map((tag, tagIndex) => (
                    <span key={tagIndex} className="text-xs bg-arena-accent/20 text-arena-accent border border-arena-accent/30 px-2 py-1 rounded">
                      {tag}
                    </span>
                  ))}
                </div>
                
                <div className="flex items-center gap-4 text-xs text-arena-text-dim">
                  <span>{example.test_cases.length} test cases</span>
                  <span>{example.code_templates.length} templates</span>
                  <span>{example.hints.length} hints</span>
                </div>
              </div>
              
              <Button
                variant="ghost"
                size="sm"
                className="text-arena-accent hover:text-arena-accent-hover ml-4"
              >
                <Clipboard className="w-4 h-4 mr-1" />
                Use This
              </Button>
            </div>
          </div>
        </Card>
      ))}
      
      <div className="mt-6 p-4 bg-arena-accent/10 border border-arena-accent/30 rounded-lg">
        <p className="text-sm text-arena-accent">
          💡 <strong>Tip:</strong> After selecting an example, make sure to review and adjust:
        </p>
        <ul className="list-disc list-inside text-sm text-arena-accent/80 mt-2 space-y-1">
          <li>Test cases to ensure they cover edge cases</li>
          <li>Code templates for all supported languages</li>
          <li>Time and memory limits based on solution complexity</li>
          <li>Tags and companies for proper categorization</li>
        </ul>
      </div>
    </div>
  );
}; 