"""
Language-specific templates and runners for multi-language support.
Based on LeetCode's approach to handling different programming languages.
"""

import json
import ast
from typing import Dict, Any, List

class LanguageTemplate:
    """Base class for language-specific templates and runners"""
    
    def __init__(self, language: str):
        self.language = language
    
    def create_template(self, function_name: str, function_signature: str) -> str:
        """Create starter template for the language"""
        raise NotImplementedError
    
    def create_runner(self, function_name: str, user_code: str) -> str:
        """Create test runner that executes user code with test cases"""
        raise NotImplementedError
    
    def format_input(self, test_input: Any) -> str:
        """Format test input for the specific language"""
        raise NotImplementedError
    
    def parse_output(self, output: str) -> Any:
        """Parse output from the language execution"""
        return output.strip()

class PythonTemplate(LanguageTemplate):
    def create_template(self, function_name: str, function_signature: str = None) -> str:
        if function_signature:
            return f"{function_signature}:\n    # TODO: Implement solution\n    pass"
        return f"def {function_name}(nums):\n    # TODO: Implement solution\n    pass"
    
    def create_runner(self, function_name: str, user_code: str) -> str:
        return f"""
import sys
import ast
import json

{user_code}

# Test runner
try:
    input_str = sys.stdin.read().strip()
    if input_str:
        test_data = ast.literal_eval(input_str)
        
        if isinstance(test_data, (list, tuple)) and len(test_data) > 1:
            result = {function_name}(*test_data)
        else:
            result = {function_name}(test_data)
        
        if result is not None:
            print(json.dumps(result) if isinstance(result, (list, dict)) else result)
except Exception as e:
    print(f"Error: {{e}}", file=sys.stderr)
"""
    
    def format_input(self, test_input: Any) -> str:
        if isinstance(test_input, dict):
            # Convert dict to tuple of values for function arguments
            return str(tuple(test_input.values()))
        return str(test_input)

class JavaScriptTemplate(LanguageTemplate):
    def create_template(self, function_name: str, function_signature: str = None) -> str:
        if function_signature:
            return f"{function_signature} {{\n    // TODO: Implement solution\n    return null;\n}}"
        return f"function {function_name}(nums) {{\n    // TODO: Implement solution\n    return null;\n}}"
    
    def create_runner(self, function_name: str, user_code: str) -> str:
        return f"""
{user_code}

// Test runner
let input = '';
process.stdin.on('data', chunk => input += chunk);
process.stdin.on('end', () => {{
    try {{
        const testData = JSON.parse(input.trim());
        let result;
        
        if (Array.isArray(testData) && testData.length > 1) {{
            result = {function_name}(...testData);
        }} else {{
            result = {function_name}(testData);
        }}
        
        if (result !== undefined && result !== null) {{
            console.log(typeof result === 'object' ? JSON.stringify(result) : result);
        }}
    }} catch (error) {{
        console.error('Error:', error.message);
    }}
}});
"""
    
    def format_input(self, test_input: Any) -> str:
        if isinstance(test_input, dict):
            return json.dumps(list(test_input.values()))
        return json.dumps(test_input)

class JavaTemplate(LanguageTemplate):
    def create_template(self, function_name: str, function_signature: str = None) -> str:
        if function_signature:
            return f"class Solution {{\n    {function_signature} {{\n        // TODO: Implement solution\n        return null;\n    }}\n}}"
        return f"class Solution {{\n    public int[] {function_name}(int[] nums) {{\n        // TODO: Implement solution\n        return new int[0];\n    }}\n}}"
    
    def create_runner(self, function_name: str, user_code: str) -> str:
        return f"""
import java.util.*;
import java.io.*;
import com.google.gson.*;

{user_code}

public class Main {{
    public static void main(String[] args) {{
        try {{
            Scanner scanner = new Scanner(System.in);
            String input = scanner.nextLine().trim();
            
            if (!input.isEmpty()) {{
                Gson gson = new Gson();
                Object[] testData = gson.fromJson(input, Object[].class);
                
                Solution solution = new Solution();
                // This would need to be dynamically generated based on method signature
                Object result = solution.{function_name}(testData);
                
                if (result != null) {{
                    System.out.println(gson.toJson(result));
                }}
            }}
        }} catch (Exception e) {{
            System.err.println("Error: " + e.getMessage());
        }}
    }}
}}
"""
    
    def format_input(self, test_input: Any) -> str:
        if isinstance(test_input, dict):
            return json.dumps(list(test_input.values()))
        return json.dumps(test_input)

class CppTemplate(LanguageTemplate):
    def create_template(self, function_name: str, function_signature: str = None) -> str:
        if function_signature:
            return f"class Solution {{\npublic:\n    {function_signature} {{\n        // TODO: Implement solution\n    }}\n}};"
        return f"class Solution {{\npublic:\n    vector<int> {function_name}(vector<int>& nums) {{\n        // TODO: Implement solution\n        return {{}};\n    }}\n}};"
    
    def create_runner(self, function_name: str, user_code: str) -> str:
        return f"""
#include <iostream>
#include <vector>
#include <string>
#include <sstream>
using namespace std;

{user_code}

int main() {{
    // C++ runner would need more complex JSON parsing
    // For now, simplified version
    Solution solution;
    // This would need dynamic generation based on function signature
    return 0;
}}
"""
    
    def format_input(self, test_input: Any) -> str:
        return json.dumps(test_input)

# Language template registry
LANGUAGE_TEMPLATES = {
    "python": PythonTemplate("python"),
    "javascript": JavaScriptTemplate("javascript"),
    "typescript": JavaScriptTemplate("typescript"),  # Same as JS for now
    "java": JavaTemplate("java"),
    "cpp": CppTemplate("cpp"),
    "c": CppTemplate("c"),  # Similar to C++
}

def get_language_template(language: str) -> LanguageTemplate:
    """Get language template for the specified language"""
    return LANGUAGE_TEMPLATES.get(language.lower(), PythonTemplate("python"))

def create_multi_language_problem(
    function_name: str,
    problem_description: str,
    test_cases: List[Dict[str, Any]],
    supported_languages: List[str] = None
) -> Dict[str, Any]:
    """
    Create a multi-language problem similar to LeetCode format
    """
    if supported_languages is None:
        supported_languages = ["python", "javascript", "java", "cpp"]
    
    templates = {}
    for lang in supported_languages:
        template = get_language_template(lang)
        templates[lang] = template.create_template(function_name)
    
    return {
        "function_name": function_name,
        "description": problem_description,
        "templates": templates,
        "test_cases": test_cases,
        "supported_languages": supported_languages
    }