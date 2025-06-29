"""
🧪 REAL TEST CASES FOR PROBLEMS
Реальные тест-кейсы для наших задач в стиле LeetCode
"""

from typing import Dict, List, Any, Tuple
import json

# 🎯 Структура тест-кейса
class TestCase:
    def __init__(
        self,
        input_data: Any,
        expected_output: Any,
        is_example: bool = False,
        is_hidden: bool = False,
        explanation: str = "",
        time_limit_ms: int = 1000,
        memory_limit_mb: int = 256
    ):
        self.input_data = input_data
        self.expected_output = expected_output
        self.is_example = is_example
        self.is_hidden = is_hidden
        self.explanation = explanation
        self.time_limit_ms = time_limit_ms
        self.memory_limit_mb = memory_limit_mb

    def to_dict(self) -> Dict[str, Any]:
        return {
            "input_data": self.input_data,
            "expected_output": self.expected_output,
            "is_example": self.is_example,
            "is_hidden": self.is_hidden,
            "explanation": self.explanation,
            "time_limit_ms": self.time_limit_ms,
            "memory_limit_mb": self.memory_limit_mb,
        }

# 🚀 РЕАЛЬНЫЕ ТЕСТ-КЕЙСЫ ДЛЯ ЗАДАЧ

PROBLEM_TEST_CASES = {
    # 1. Two Sum
    "two-sum": [
        TestCase(
            input_data={"nums": [2, 7, 11, 15], "target": 9},
            expected_output=[0, 1],
            is_example=True,
            explanation="Because nums[0] + nums[1] == 9, we return [0, 1]."
        ),
        TestCase(
            input_data={"nums": [3, 2, 4], "target": 6},
            expected_output=[1, 2],
            is_example=True,
            explanation="Because nums[1] + nums[2] == 6, we return [1, 2]."
        ),
        TestCase(
            input_data={"nums": [3, 3], "target": 6},
            expected_output=[0, 1],
            is_example=True,
            explanation="Because nums[0] + nums[1] == 6, we return [0, 1]."
        ),
        # Hidden test cases
        TestCase(
            input_data={"nums": [1, 2, 3, 4, 5, 6, 7, 8, 9, 10], "target": 19},
            expected_output=[8, 9],
            is_hidden=True
        ),
        TestCase(
            input_data={"nums": [-3, 4, 3, 90], "target": 0},
            expected_output=[0, 2],
            is_hidden=True
        ),
        TestCase(
            input_data={"nums": [1, 1, 1, 1, 1, 4, 1, 1, 1, 1, 1, 7, 1, 1, 1, 1], "target": 11},
            expected_output=[5, 11],
            is_hidden=True
        ),
    ],

    # 2. Add Two Numbers (Linked List)
    "add-two-numbers": [
        TestCase(
            input_data={"l1": [2, 4, 3], "l2": [5, 6, 4]},
            expected_output=[7, 0, 8],
            is_example=True,
            explanation="342 + 465 = 807."
        ),
        TestCase(
            input_data={"l1": [0], "l2": [0]},
            expected_output=[0],
            is_example=True,
            explanation="0 + 0 = 0."
        ),
        TestCase(
            input_data={"l1": [9, 9, 9, 9, 9, 9, 9], "l2": [9, 9, 9, 9]},
            expected_output=[8, 9, 9, 9, 0, 0, 0, 1],
            is_example=True,
            explanation="9999999 + 9999 = 10009998."
        ),
        # Hidden test cases
        TestCase(
            input_data={"l1": [1], "l2": [9, 9]},
            expected_output=[0, 0, 1],
            is_hidden=True
        ),
        TestCase(
            input_data={"l1": [9, 9], "l2": [1]},
            expected_output=[0, 0, 1],
            is_hidden=True
        ),
    ],

    # 3. Longest Substring Without Repeating Characters
    "longest-substring-without-repeating-characters": [
        TestCase(
            input_data={"s": "abcabcbb"},
            expected_output=3,
            is_example=True,
            explanation='The answer is "abc", with the length of 3.'
        ),
        TestCase(
            input_data={"s": "bbbbb"},
            expected_output=1,
            is_example=True,
            explanation='The answer is "b", with the length of 1.'
        ),
        TestCase(
            input_data={"s": "pwwkew"},
            expected_output=3,
            is_example=True,
            explanation='The answer is "wke", with the length of 3.'
        ),
        # Hidden test cases
        TestCase(
            input_data={"s": ""},
            expected_output=0,
            is_hidden=True
        ),
        TestCase(
            input_data={"s": "au"},
            expected_output=2,
            is_hidden=True
        ),
        TestCase(
            input_data={"s": "dvdf"},
            expected_output=3,
            is_hidden=True
        ),
        TestCase(
            input_data={"s": "anviaj"},
            expected_output=5,
            is_hidden=True
        ),
    ],

    # 4. Longest Palindromic Substring
    "longest-palindromic-substring": [
        TestCase(
            input_data={"s": "babad"},
            expected_output="bab",  # Note: "aba" is also a valid answer
            is_example=True,
            explanation='Note: "aba" is also a valid answer.'
        ),
        TestCase(
            input_data={"s": "cbbd"},
            expected_output="bb",
            is_example=True,
            explanation='The longest palindromic substring is "bb".'
        ),
        # Hidden test cases
        TestCase(
            input_data={"s": "a"},
            expected_output="a",
            is_hidden=True
        ),
        TestCase(
            input_data={"s": "ac"},
            expected_output="a",  # or "c"
            is_hidden=True
        ),
        TestCase(
            input_data={"s": "racecar"},
            expected_output="racecar",
            is_hidden=True
        ),
    ],

    # 5. Zigzag Conversion
    "zigzag-conversion": [
        TestCase(
            input_data={"s": "PAYPALISHIRING", "numRows": 3},
            expected_output="PAHNAPLSIIGYIR",
            is_example=True,
            explanation="P   A   H   N\nA P L S I I G\nY   I   R"
        ),
        TestCase(
            input_data={"s": "PAYPALISHIRING", "numRows": 4},
            expected_output="PINALSIGYAHRPI",
            is_example=True,
            explanation="P     I    N\nA   L S  I G\nY A   H R\nP     I"
        ),
        TestCase(
            input_data={"s": "A", "numRows": 1},
            expected_output="A",
            is_example=True,
        ),
        # Hidden test cases
        TestCase(
            input_data={"s": "AB", "numRows": 1},
            expected_output="AB",
            is_hidden=True
        ),
        TestCase(
            input_data={"s": "ABCD", "numRows": 2},
            expected_output="ACBD",
            is_hidden=True
        ),
    ],

    # 6. Container With Most Water
    "container-with-most-water": [
        TestCase(
            input_data={"height": [1, 8, 6, 2, 5, 4, 8, 3, 7]},
            expected_output=49,
            is_example=True,
            explanation="The above vertical lines represent [1,8,6,2,5,4,8,3,7]. The max area is 49."
        ),
        TestCase(
            input_data={"height": [1, 1]},
            expected_output=1,
            is_example=True,
        ),
        # Hidden test cases
        TestCase(
            input_data={"height": [1, 2, 1]},
            expected_output=2,
            is_hidden=True
        ),
        TestCase(
            input_data={"height": [2, 3, 4, 5, 18, 17, 6]},
            expected_output=17,
            is_hidden=True
        ),
    ],

    # 7. Valid Parentheses
    "valid-parentheses": [
        TestCase(
            input_data={"s": "()"},
            expected_output=True,
            is_example=True,
        ),
        TestCase(
            input_data={"s": "()[]{}"},
            expected_output=True,
            is_example=True,
        ),
        TestCase(
            input_data={"s": "(]"},
            expected_output=False,
            is_example=True,
        ),
        TestCase(
            input_data={"s": "([)]"},
            expected_output=False,
            is_example=True,
        ),
        TestCase(
            input_data={"s": "{[]}"},
            expected_output=True,
            is_example=True,
        ),
        # Hidden test cases
        TestCase(
            input_data={"s": ""},
            expected_output=True,
            is_hidden=True
        ),
        TestCase(
            input_data={"s": "]"},
            expected_output=False,
            is_hidden=True
        ),
        TestCase(
            input_data={"s": "(("},
            expected_output=False,
            is_hidden=True
        ),
    ],

    # 8. Longest Subsequence Repeated K Times (наш пример)
    "longest-subsequence-repeated-k": [
        TestCase(
            input_data={"s": "letsleetcode", "k": 2},
            expected_output="let",
            is_example=True,
            explanation='The longest subsequence repeated 2 times is "let" -> "le[t]s[l][e][t]code".'
        ),
        TestCase(
            input_data={"s": "bb", "k": 2},
            expected_output="b",
            is_example=True,
            explanation='The longest subsequence repeated 2 times is "b".'
        ),
        TestCase(
            input_data={"s": "ab", "k": 2},
            expected_output="",
            is_example=True,
            explanation="No subsequence can be repeated 2 times."
        ),
        TestCase(
            input_data={"s": "bbabbabbbbabaababab", "k": 3},
            expected_output="ab",
            is_example=True,
            explanation='The longest subsequence repeated 3 times is "ab".'
        ),
        # Hidden test cases
        TestCase(
            input_data={"s": "aaabbbccc", "k": 3},
            expected_output="abc",
            is_hidden=True
        ),
        TestCase(
            input_data={"s": "abcabcabc", "k": 3},
            expected_output="abc",
            is_hidden=True
        ),
        TestCase(
            input_data={"s": "a", "k": 1},
            expected_output="a",
            is_hidden=True
        ),
    ],

    # 9. Merge Two Sorted Lists
    "merge-two-sorted-lists": [
        TestCase(
            input_data={"list1": [1, 2, 4], "list2": [1, 3, 4]},
            expected_output=[1, 1, 2, 3, 4, 4],
            is_example=True,
        ),
        TestCase(
            input_data={"list1": [], "list2": []},
            expected_output=[],
            is_example=True,
        ),
        TestCase(
            input_data={"list1": [], "list2": [0]},
            expected_output=[0],
            is_example=True,
        ),
        # Hidden test cases
        TestCase(
            input_data={"list1": [1], "list2": []},
            expected_output=[1],
            is_hidden=True
        ),
        TestCase(
            input_data={"list1": [1, 3, 5], "list2": [2, 4, 6]},
            expected_output=[1, 2, 3, 4, 5, 6],
            is_hidden=True
        ),
    ],

    # 10. Binary Tree Maximum Path Sum
    "binary-tree-maximum-path-sum": [
        TestCase(
            input_data={"root": [1, 2, 3]},
            expected_output=6,
            is_example=True,
            explanation="The optimal path is 2 -> 1 -> 3 with a path sum of 2 + 1 + 3 = 6."
        ),
        TestCase(
            input_data={"root": [-10, 9, 20, None, None, 15, 7]},
            expected_output=42,
            is_example=True,
            explanation="The optimal path is 15 -> 20 -> 7 with a path sum of 15 + 20 + 7 = 42."
        ),
        # Hidden test cases
        TestCase(
            input_data={"root": [1]},
            expected_output=1,
            is_hidden=True
        ),
        TestCase(
            input_data={"root": [-3]},
            expected_output=-3,
            is_hidden=True
        ),
    ],
}

def get_test_cases_for_problem(problem_slug: str) -> List[TestCase]:
    """Получить тест-кейсы для конкретной задачи"""
    return PROBLEM_TEST_CASES.get(problem_slug, [])

def get_example_test_cases(problem_slug: str) -> List[TestCase]:
    """Получить только видимые примеры для задачи"""
    test_cases = get_test_cases_for_problem(problem_slug)
    return [tc for tc in test_cases if tc.is_example]

def get_hidden_test_cases(problem_slug: str) -> List[TestCase]:
    """Получить только скрытые тест-кейсы для задачи"""
    test_cases = get_test_cases_for_problem(problem_slug)
    return [tc for tc in test_cases if tc.is_hidden]

def add_test_case_to_problem(problem_slug: str, test_case: TestCase):
    """Добавить новый тест-кейс к задаче"""
    if problem_slug not in PROBLEM_TEST_CASES:
        PROBLEM_TEST_CASES[problem_slug] = []
    PROBLEM_TEST_CASES[problem_slug].append(test_case)

def serialize_test_cases_to_json(problem_slug: str) -> str:
    """Сериализовать тест-кейсы в JSON для сохранения в БД"""
    test_cases = get_test_cases_for_problem(problem_slug)
    return json.dumps([tc.to_dict() for tc in test_cases], indent=2)

def deserialize_test_cases_from_json(json_data: str) -> List[TestCase]:
    """Десериализовать тест-кейсы из JSON"""
    data = json.loads(json_data)
    return [TestCase(**tc_data) for tc_data in data]

# 🎯 Статистика тест-кейсов
def get_test_cases_stats():
    """Получить статистику по тест-кейсам"""
    stats = {}
    for problem_slug, test_cases in PROBLEM_TEST_CASES.items():
        stats[problem_slug] = {
            "total": len(test_cases),
            "examples": len([tc for tc in test_cases if tc.is_example]),
            "hidden": len([tc for tc in test_cases if tc.is_hidden]),
        }
    return stats

if __name__ == "__main__":
    # 📊 Вывод статистики тест-кейсов
    print("🧪 REAL TEST CASES STATISTICS")
    print("=" * 50)
    
    stats = get_test_cases_stats()
    total_problems = len(PROBLEM_TEST_CASES)
    total_test_cases = sum(s["total"] for s in stats.values())
    total_examples = sum(s["examples"] for s in stats.values())
    total_hidden = sum(s["hidden"] for s in stats.values())
    
    print(f"📝 Total Problems: {total_problems}")
    print(f"🧪 Total Test Cases: {total_test_cases}")
    print(f"👁️  Example Cases: {total_examples}")
    print(f"🔒 Hidden Cases: {total_hidden}")
    print()
    
    for problem_slug, stat in stats.items():
        print(f"📄 {problem_slug}:")
        print(f"   Total: {stat['total']}, Examples: {stat['examples']}, Hidden: {stat['hidden']}")
    
    print("\n✅ All test cases loaded successfully!") 