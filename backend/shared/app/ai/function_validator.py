"""
Function name validation system to ensure users don't change function signatures.
Similar to LeetCode's approach where function signatures are fixed.
"""

import re
import ast
from typing import Dict, List, Optional, Tuple

class FunctionSignatureValidator:
    """
    Validates that user code maintains the correct function signature
    and doesn't change function names.
    """
    
    def __init__(self):
        self.language_patterns = {
            "python": r"def\s+(\w+)\s*\(",
            "javascript": r"function\s+(\w+)\s*\(",
            "typescript": r"function\s+(\w+)\s*\(",
            "java": r"(?:public\s+)?(?:static\s+)?\w+\s+(\w+)\s*\(",
            "cpp": r"\w+\s+(\w+)\s*\(",
            "c": r"\w+\s+(\w+)\s*\(",
            "go": r"func\s+(\w+)\s*\(",
            "rust": r"fn\s+(\w+)\s*\(",
        }
    
    def extract_function_names(self, code: str, language: str) -> List[str]:
        """Extract all function names from the code"""
        pattern = self.language_patterns.get(language.lower())
        if not pattern:
            return []
        
        matches = re.findall(pattern, code)
        return matches
    
    def validate_function_signature(
        self, 
        user_code: str, 
        expected_function_name: str, 
        language: str
    ) -> Tuple[bool, str]:
        """
        Validate that user code contains the correct function signature
        Returns (is_valid, error_message)
        """
        
        function_names = self.extract_function_names(user_code, language)
        
        if not function_names:
            return False, f"No function definition found. Please implement the '{expected_function_name}' function."
        
        if expected_function_name not in function_names:
            found_names = ", ".join(function_names)
            return False, f"Function name mismatch. Expected '{expected_function_name}', but found: {found_names}. Please use the exact function name provided in the template."
        
        # Check for multiple function definitions
        if len(function_names) > 1:
            return False, f"Multiple function definitions found: {', '.join(function_names)}. Please implement only the '{expected_function_name}' function."
        
        return True, ""
    
    def get_function_signature_template(
        self, 
        function_name: str, 
        language: str, 
        parameters: str = "arr",
        return_type: str = "int"
    ) -> str:
        """Generate a function signature template for the given language"""
        
        templates = {
            "python": f"def {function_name}({parameters}):\n    # TODO: Implement your solution here\n    pass",
            
            "javascript": f"function {function_name}({parameters}) {{\n    // TODO: Implement your solution here\n    return null;\n}}",
            
            "typescript": f"function {function_name}({parameters}: any[]): {return_type} {{\n    // TODO: Implement your solution here\n    return null as any;\n}}",
            
            "java": f"public static {return_type} {function_name}({return_type}[] {parameters}) {{\n    // TODO: Implement your solution here\n    return null;\n}}",
            
            "cpp": f"{return_type} {function_name}(vector<{return_type}>& {parameters}) {{\n    // TODO: Implement your solution here\n    return {return_type}();\n}}",
            
            "c": f"{return_type} {function_name}({return_type}* {parameters}, int size) {{\n    // TODO: Implement your solution here\n    return 0;\n}}",
            
            "go": f"func {function_name}({parameters} []{return_type}) {return_type} {{\n    // TODO: Implement your solution here\n    return 0\n}}",
            
            "rust": f"fn {function_name}({parameters}: Vec<{return_type}>) -> {return_type} {{\n    // TODO: Implement your solution here\n    unimplemented!()\n}}",
        }
        
        return templates.get(language.lower(), templates["python"])
    
    def create_locked_template(
        self, 
        function_name: str, 
        language: str, 
        problem_description: str = "",
        parameters: str = "arr",
        return_type: str = "int"
    ) -> str:
        """
        Create a locked template that users cannot modify the signature of.
        Similar to LeetCode's approach.
        """
        
        template = self.get_function_signature_template(
            function_name, language, parameters, return_type
        )
        
        header_comment = self._get_header_comment(language, function_name, problem_description)
        
        return f"{header_comment}\n{template}"
    
    def _get_header_comment(self, language: str, function_name: str, description: str) -> str:
        """Generate header comment for the template"""
        
        if language.lower() == "python":
            return f'"""\n{description}\n\nDO NOT change the function name "{function_name}".\nOnly implement the function body.\n"""'
        
        elif language.lower() in ["javascript", "typescript"]:
            return f'/**\n * {description}\n * \n * DO NOT change the function name "{function_name}".\n * Only implement the function body.\n */'
        
        elif language.lower() in ["java", "cpp", "c"]:
            return f'/**\n * {description}\n * \n * DO NOT change the function name "{function_name}".\n * Only implement the function body.\n */'
        
        elif language.lower() == "go":
            return f'// {description}\n// \n// DO NOT change the function name "{function_name}".\n// Only implement the function body.'
        
        elif language.lower() == "rust":
            return f'/// {description}\n/// \n/// DO NOT change the function name "{function_name}".\n/// Only implement the function body.'
        
        else:
            return f'# {description}\n# DO NOT change the function name "{function_name}". Only implement the function body.'

# Global validator instance
function_validator = FunctionSignatureValidator()