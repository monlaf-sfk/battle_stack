"""
🎨 PROFESSIONAL CODE TEMPLATES SYSTEM
Генерация шаблонов кода для разных языков программирования в стиле LeetCode
"""

from typing import Dict, List, Any, Optional
from enum import Enum


class LanguageType(str, Enum):
    PYTHON = "python"
    PYTHON3 = "python3"
    JAVA = "java"
    CPP = "cpp"
    C = "c"
    JAVASCRIPT = "javascript"
    TYPESCRIPT = "typescript"
    GO = "go"
    RUST = "rust"
    PHP = "php"
    CSHARP = "csharp"
    KOTLIN = "kotlin"
    SWIFT = "swift"


class CodeTemplateGenerator:
    """🎨 Генератор профессиональных шаблонов кода для всех популярных языков"""
    
    def __init__(self):
        self.language_configs = {
            LanguageType.PYTHON: {
                "extension": ".py",
                "comment": "#",
                "class_template": "class Solution:",
                "method_template": "def {function_name}(self, {params}) -> {return_type}:",
                "supports_classes": True,
                "main_wrapper": True
            },
            LanguageType.PYTHON3: {
                "extension": ".py",
                "comment": "#",
                "class_template": "class Solution:",
                "method_template": "def {function_name}(self, {params}) -> {return_type}:",
                "supports_classes": True,
                "main_wrapper": True
            },
            LanguageType.JAVA: {
                "extension": ".java",
                "comment": "//",
                "class_template": "class Solution {",
                "method_template": "public {return_type} {function_name}({params}) {",
                "supports_classes": True,
                "main_wrapper": True
            },
            LanguageType.CPP: {
                "extension": ".cpp",
                "comment": "//",
                "class_template": "class Solution {",
                "method_template": "public:\n    {return_type} {function_name}({params}) {",
                "supports_classes": True,
                "main_wrapper": True
            },
            LanguageType.C: {
                "extension": ".c",
                "comment": "//",
                "class_template": "",
                "method_template": "{return_type} {function_name}({params}) {",
                "supports_classes": False,
                "main_wrapper": True
            },
            LanguageType.JAVASCRIPT: {
                "extension": ".js",
                "comment": "//",
                "class_template": "",
                "method_template": "var {function_name} = function({params}) {",
                "supports_classes": False,
                "main_wrapper": True
            },
            LanguageType.TYPESCRIPT: {
                "extension": ".ts",
                "comment": "//",
                "class_template": "",
                "method_template": "function {function_name}({params}): {return_type} {",
                "supports_classes": False,
                "main_wrapper": True
            },
            LanguageType.GO: {
                "extension": ".go",
                "comment": "//",
                "class_template": "",
                "method_template": "func {function_name}({params}) {return_type} {",
                "supports_classes": False,
                "main_wrapper": True
            },
            LanguageType.RUST: {
                "extension": ".rs",
                "comment": "//",
                "class_template": "impl Solution {",
                "method_template": "pub fn {function_name}({params}) -> {return_type} {",
                "supports_classes": True,
                "main_wrapper": True
            }
        }

    def generate_templates(
        self,
        function_name: str,
        parameters: List[Dict[str, str]],
        return_type: str,
        problem_description: str = "",
        constraints: str = "",
        examples: List[Dict] = None
    ) -> Dict[str, str]:
        """🎨 Генерирует шаблоны кода для всех поддерживаемых языков"""
        templates = {}
        
        for language in LanguageType:
            try:
                template = self._generate_template_for_language(
                    language, function_name, parameters, return_type,
                    problem_description, constraints, examples
                )
                templates[language.value] = template
            except Exception as e:
                print(f"⚠️ Error generating template for {language}: {e}")
                templates[language.value] = f"// Error generating template for {language}"
        
        return templates

    def _generate_template_for_language(
        self,
        language: LanguageType,
        function_name: str,
        parameters: List[Dict[str, str]],
        return_type: str,
        problem_description: str,
        constraints: str,
        examples: List[Dict]
    ) -> str:
        """Генерирует шаблон для конкретного языка"""
        
        if language == LanguageType.PYTHON or language == LanguageType.PYTHON3:
            return self._generate_python_template(
                function_name, parameters, return_type, problem_description, constraints, examples
            )
        elif language == LanguageType.JAVA:
            return self._generate_java_template(
                function_name, parameters, return_type, problem_description, constraints, examples
            )
        elif language == LanguageType.CPP:
            return self._generate_cpp_template(
                function_name, parameters, return_type, problem_description, constraints, examples
            )
        elif language == LanguageType.C:
            return self._generate_c_template(
                function_name, parameters, return_type, problem_description, constraints, examples
            )
        elif language == LanguageType.JAVASCRIPT:
            return self._generate_javascript_template(
                function_name, parameters, return_type, problem_description, constraints, examples
            )
        elif language == LanguageType.TYPESCRIPT:
            return self._generate_typescript_template(
                function_name, parameters, return_type, problem_description, constraints, examples
            )
        elif language == LanguageType.GO:
            return self._generate_go_template(
                function_name, parameters, return_type, problem_description, constraints, examples
            )
        elif language == LanguageType.RUST:
            return self._generate_rust_template(
                function_name, parameters, return_type, problem_description, constraints, examples
            )
        else:
            return f"// Template for {language} not implemented yet"

    def _generate_python_template(self, function_name: str, parameters: List[Dict], return_type: str, 
                                description: str, constraints: str, examples: List[Dict]) -> str:
        """🐍 Python шаблон в стиле LeetCode"""
        
        # Конвертируем типы в Python-style
        python_return_type = self._convert_to_python_type(return_type)
        python_params = [f"{p['name']}: {self._convert_to_python_type(p['type'])}" 
                        for p in parameters]
        
        template = f'''class Solution:
    def {function_name}(self, {", ".join(python_params)}) -> {python_return_type}:
        """
        {description[:100] if description else ""}...
        
        Args:
            {chr(10).join([f"            {p['name']}: {p['type']} - " for p in parameters])}
        
        Returns:
            {python_return_type}: 
            
        Constraints:
            {constraints}
        """
        # TODO: Implement your solution here
        pass
'''
        
        if examples:
            template += "\n# Example usage:\n"
            for i, example in enumerate(examples[:3]):
                if 'input' in example and 'output' in example:
                    template += f"# Example {i+1}: {example['input']} -> {example['output']}\n"
        
        return template

    def _generate_java_template(self, function_name: str, parameters: List[Dict], return_type: str,
                               description: str, constraints: str, examples: List[Dict]) -> str:
        """☕ Java шаблон в стиле LeetCode"""
        
        java_return_type = self._convert_to_java_type(return_type)
        java_params = [f"{self._convert_to_java_type(p['type'])} {p['name']}" 
                      for p in parameters]
        
        template = f'''class Solution {{
    /**
     * {description[:100] if description else ""}...
     * 
     * @param {" @param ".join([f"{p['name']} {p['type']}" for p in parameters])}
     * @return {java_return_type}
     * 
     * Constraints:
     * {constraints}
     */
    public {java_return_type} {function_name}({", ".join(java_params)}) {{
        // TODO: Implement your solution here
        
    }}
}}'''
        
        return template

    def _generate_cpp_template(self, function_name: str, parameters: List[Dict], return_type: str,
                              description: str, constraints: str, examples: List[Dict]) -> str:
        """⚡ C++ шаблон в стиле LeetCode"""
        
        cpp_return_type = self._convert_to_cpp_type(return_type)
        cpp_params = [f"{self._convert_to_cpp_type(p['type'])} {p['name']}" 
                     for p in parameters]
        
        template = f'''class Solution {{
public:
    /**
     * {description[:100] if description else ""}...
     * 
     * @param {" @param ".join([f"{p['name']} {p['type']}" for p in parameters])}
     * @return {cpp_return_type}
     * 
     * Constraints: {constraints}
     */
    {cpp_return_type} {function_name}({", ".join(cpp_params)}) {{
        // TODO: Implement your solution here
        
    }}
}};'''
        
        return template

    def _generate_c_template(self, function_name: str, parameters: List[Dict], return_type: str,
                            description: str, constraints: str, examples: List[Dict]) -> str:
        """🔧 C шаблон в стиле LeetCode"""
        
        c_return_type = self._convert_to_c_type(return_type)
        c_params = [f"{self._convert_to_c_type(p['type'])} {p['name']}" 
                   for p in parameters]
        
        template = f'''/**
 * {description[:100] if description else ""}...
 * 
 * @param {" @param ".join([f"{p['name']} {p['type']}" for p in parameters])}
 * @return {c_return_type}
 * 
 * Constraints: {constraints}
 */
{c_return_type} {function_name}({", ".join(c_params)}) {{
    // TODO: Implement your solution here
    
}}'''
        
        return template

    def _generate_javascript_template(self, function_name: str, parameters: List[Dict], return_type: str,
                                    description: str, constraints: str, examples: List[Dict]) -> str:
        """🟨 JavaScript шаблон в стиле LeetCode"""
        
        js_params = [p['name'] for p in parameters]
        
        template = f'''/**
 * {description[:100] if description else ""}...
 * 
 * @param {{{", ".join([f"{{{self._convert_to_js_type(p['type'])}}} {p['name']}" for p in parameters])}}}
 * @return {{{self._convert_to_js_type(return_type)}}}
 * 
 * Constraints: {constraints}
 */
var {function_name} = function({", ".join(js_params)}) {{
    // TODO: Implement your solution here
    
}};'''
        
        return template

    def _generate_typescript_template(self, function_name: str, parameters: List[Dict], return_type: str,
                                    description: str, constraints: str, examples: List[Dict]) -> str:
        """🔷 TypeScript шаблон в стиле LeetCode"""
        
        ts_return_type = self._convert_to_ts_type(return_type)
        ts_params = [f"{p['name']}: {self._convert_to_ts_type(p['type'])}" 
                    for p in parameters]
        
        template = f'''/**
 * {description[:100] if description else ""}...
 * 
 * @param {" @param ".join([f"{p['name']} {p['type']}" for p in parameters])}
 * @return {ts_return_type}
 * 
 * Constraints: {constraints}
 */
function {function_name}({", ".join(ts_params)}): {ts_return_type} {{
    // TODO: Implement your solution here
    
}};'''
        
        return template

    def _generate_go_template(self, function_name: str, parameters: List[Dict], return_type: str,
                             description: str, constraints: str, examples: List[Dict]) -> str:
        """🐹 Go шаблон в стиле LeetCode"""
        
        go_return_type = self._convert_to_go_type(return_type)
        go_params = [f"{p['name']} {self._convert_to_go_type(p['type'])}" 
                    for p in parameters]
        
        template = f'''/**
 * {description[:100] if description else ""}...
 * 
 * @param {" @param ".join([f"{p['name']} {p['type']}" for p in parameters])}
 * @return {go_return_type}
 * 
 * Constraints: {constraints}
 */
func {function_name}({", ".join(go_params)}) {go_return_type} {{
    // TODO: Implement your solution here
    
}}'''
        
        return template

    def _generate_rust_template(self, function_name: str, parameters: List[Dict], return_type: str,
                               description: str, constraints: str, examples: List[Dict]) -> str:
        """🦀 Rust шаблон в стиле LeetCode"""
        
        rust_return_type = self._convert_to_rust_type(return_type)
        rust_params = [f"{p['name']}: {self._convert_to_rust_type(p['type'])}" 
                      for p in parameters]
        
        # Convert snake_case для Rust
        rust_function_name = self._to_snake_case(function_name)
        
        template = f'''impl Solution {{
    /**
     * {description[:100] if description else ""}...
     * 
     * @param {" @param ".join([f"{p['name']} {p['type']}" for p in parameters])}
     * @return {rust_return_type}
     * 
     * Constraints: {constraints}
     */
    pub fn {rust_function_name}({", ".join(rust_params)}) -> {rust_return_type} {{
        // TODO: Implement your solution here
        
    }}
}}'''
        
        return template

    # Конвертеры типов для разных языков
    def _convert_to_python_type(self, type_str: str) -> str:
        type_mapping = {
            "string": "str", "String": "str", "str": "str",
            "int": "int", "integer": "int", "Integer": "int",
            "long": "int", "Long": "int",
            "double": "float", "Double": "float", "float": "float",
            "boolean": "bool", "Boolean": "bool", "bool": "bool",
            "char": "str", "Character": "str",
            "list": "List", "List": "List", "array": "List",
            "vector": "List", "Vector": "List"
        }
        return type_mapping.get(type_str.lower(), type_str)

    def _convert_to_java_type(self, type_str: str) -> str:
        type_mapping = {
            "str": "String", "string": "String",
            "int": "int", "integer": "int",
            "float": "double", "double": "double",
            "bool": "boolean", "boolean": "boolean",
            "list": "List<Integer>", "array": "int[]"
        }
        return type_mapping.get(type_str.lower(), type_str)

    def _convert_to_cpp_type(self, type_str: str) -> str:
        type_mapping = {
            "str": "string", "string": "string", "String": "string",
            "int": "int", "integer": "int",
            "float": "double", "double": "double",
            "bool": "bool", "boolean": "bool",
            "list": "vector<int>", "array": "vector<int>", "List": "vector<int>"
        }
        return type_mapping.get(type_str.lower(), type_str)

    def _convert_to_c_type(self, type_str: str) -> str:
        type_mapping = {
            "str": "char*", "string": "char*", "String": "char*",
            "int": "int", "integer": "int",
            "float": "double", "double": "double",
            "bool": "int", "boolean": "int",
            "list": "int*", "array": "int*", "List": "int*"
        }
        return type_mapping.get(type_str.lower(), type_str)

    def _convert_to_js_type(self, type_str: str) -> str:
        type_mapping = {
            "str": "string", "string": "string", "String": "string",
            "int": "number", "integer": "number", "float": "number", "double": "number",
            "bool": "boolean", "boolean": "boolean", "Boolean": "boolean",
            "list": "number[]", "array": "number[]", "List": "number[]"
        }
        return type_mapping.get(type_str.lower(), type_str)

    def _convert_to_ts_type(self, type_str: str) -> str:
        return self._convert_to_js_type(type_str)

    def _convert_to_go_type(self, type_str: str) -> str:
        type_mapping = {
            "str": "string", "string": "string", "String": "string",
            "int": "int", "integer": "int",
            "float": "float64", "double": "float64",
            "bool": "bool", "boolean": "bool",
            "list": "[]int", "array": "[]int", "List": "[]int"
        }
        return type_mapping.get(type_str.lower(), type_str)

    def _convert_to_rust_type(self, type_str: str) -> str:
        type_mapping = {
            "str": "String", "string": "String", "String": "String",
            "int": "i32", "integer": "i32",
            "float": "f64", "double": "f64",
            "bool": "bool", "boolean": "bool",
            "list": "Vec<i32>", "array": "Vec<i32>", "List": "Vec<i32>"
        }
        return type_mapping.get(type_str.lower(), type_str)

    def _to_snake_case(self, camel_str: str) -> str:
        """Конвертирует camelCase в snake_case для Rust"""
        import re
        s1 = re.sub('(.)([A-Z][a-z]+)', r'\1_\2', camel_str)
        return re.sub('([a-z0-9])([A-Z])', r'\1_\2', s1).lower()

    def generate_example_templates(self) -> Dict[str, str]:
        """🎨 Генерирует примеры шаблонов для демонстрации"""
        
        # Пример функции из запроса пользователя
        function_name = "longestSubsequenceRepeatedK"
        parameters = [
            {"name": "s", "type": "str"},
            {"name": "k", "type": "int"}
        ]
        return_type = "str"
        description = "Find the longest subsequence of string s that appears at least k times."
        constraints = "1 <= s.length <= 2000, 1 <= k <= 2000"
        examples = [
            {"input": 's = "letsleetcode", k = 2', "output": '"let"'},
            {"input": 's = "bb", k = 2', "output": '"b"'}
        ]
        
        return self.generate_templates(
            function_name, parameters, return_type, description, constraints, examples
        )


# 🎨 Глобальный экземпляр генератора
code_template_generator = CodeTemplateGenerator() 