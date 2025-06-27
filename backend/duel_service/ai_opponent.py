import asyncio
import random
import time
import re
from typing import Dict, Any, Optional, List, Tuple
from uuid import UUID
import json

try:
    import openai
    from openai import AsyncOpenAI
except ImportError:
    openai = None
    AsyncOpenAI = None

from shared.app.config import get_settings
from .models import DuelDifficulty, ProblemType


class ProfessionalAIOpponent:
    """
    🤖 ПРОФЕССИОНАЛЬНЫЙ ИИ-оппонент с умными возможностями:
    - Генерация качественных решений с правильной логикой
    - Реалистичное поведение кодирования
    - Интеграция с универсальным runner
    - Адаптивная сложность и поведение
    """
    
    def __init__(self):
        settings = get_settings()
        self.api_key = getattr(settings, 'OPENAI_API_KEY', None)
        
        if self.api_key and AsyncOpenAI:
            self.client = AsyncOpenAI(api_key=self.api_key)
            print("✅ Professional AI Opponent with OpenAI initialized")
        else:
            self.client = None
            print("⚠️ Professional AI Opponent using template solutions")
        
        # 🏆 Professional behavior profiles
        self.professional_profiles = {
            DuelDifficulty.EASY: {
                'typing_speed_wpm': random.randint(45, 75),
                'thinking_time_base': random.uniform(3, 8),
                'thinking_time_variance': 3,
                'mistake_probability': 0.12,
                'solution_accuracy': 0.95,
                'code_iterations': random.randint(2, 3),
                'pause_frequency': 0.4,
                'skill_level': 'junior_developer',
                'ai_personality': 'careful_but_learning'
            },
            DuelDifficulty.MEDIUM: {
                'typing_speed_wpm': random.randint(65, 95),
                'thinking_time_base': random.uniform(5, 12),
                'thinking_time_variance': 5,
                'mistake_probability': 0.08,
                'solution_accuracy': 0.92,
                'code_iterations': random.randint(2, 4),
                'pause_frequency': 0.25,
                'skill_level': 'mid_developer',
                'ai_personality': 'confident_problem_solver'
            },
            DuelDifficulty.HARD: {
                'typing_speed_wpm': random.randint(75, 110),
                'thinking_time_base': random.uniform(8, 20),
                'thinking_time_variance': 8,
                'mistake_probability': 0.05,
                'solution_accuracy': 0.88,
                'code_iterations': random.randint(3, 5),
                'pause_frequency': 0.15,
                'skill_level': 'senior_developer',
                'ai_personality': 'strategic_optimizer'
            },
            DuelDifficulty.EXPERT: {
                'typing_speed_wpm': random.randint(85, 120),
                'thinking_time_base': random.uniform(10, 30),
                'thinking_time_variance': 12,
                'mistake_probability': 0.03,
                'solution_accuracy': 0.85,
                'code_iterations': random.randint(3, 6),
                'pause_frequency': 0.10,
                'skill_level': 'expert_architect',
                'ai_personality': 'algorithm_master'
            }
        }
        
        # 🧠 Advanced solution strategies database
        self.solution_strategies = {
            'array_operations': [
                'iterate_and_track', 'two_pointers', 'sliding_window', 'prefix_sum',
                'hash_map_lookup', 'sort_and_search', 'divide_and_conquer'
            ],
            'mathematical': [
                'formula_based', 'iterative_calculation', 'recursive_approach',
                'optimization_technique', 'number_theory', 'statistical_method'
            ],
            'string_processing': [
                'pattern_matching', 'sliding_window', 'two_pointers', 'dynamic_programming',
                'regex_approach', 'state_machine', 'character_frequency'
            ],
            'data_structures': [
                'hash_map', 'stack', 'queue', 'heap', 'set_operations',
                'tree_traversal', 'graph_algorithms', 'union_find'
            ]
        }
    
    async def solve_problem_professionally(
        self,
        problem_data: Dict[str, Any],
        difficulty: DuelDifficulty,
        language: str = "python",
        websocket_callback=None,
        user_id: Optional[UUID] = None,
        real_time_simulation: bool = True
    ) -> Dict[str, Any]:
        """
        🎯 Solve problem like a professional developer
        """
        profile = self.professional_profiles[difficulty]
        
        print(f"🤖 {profile['skill_level']} AI solving: {problem_data.get('title', 'Problem')}")
        
        # 🧠 Professional thinking phase
        thinking_start = time.time()
        solution_strategy = await self._analyze_problem_professionally(problem_data, difficulty)
        thinking_duration = random.uniform(
            profile['thinking_time_base'], 
            profile['thinking_time_base'] + profile['thinking_time_variance']
        )
        
        if real_time_simulation:
            await asyncio.sleep(thinking_duration)
        
        # 🚀 Generate professional solution
        solution_data = await self._generate_professional_solution(
            problem_data, language, difficulty, solution_strategy
        )
        
        # ⌨️ Simulate realistic coding process
        if real_time_simulation:
            # 🚀 Return empty code initially, AI will build solution gradually
            starter_code = problem_data.get('starter_code', {}).get(language, '')
            asyncio.create_task(self._simulate_professional_coding(
                solution_data['code'], profile, websocket_callback, user_id
            ))
            # Return starter code initially, final code will be sent via WebSocket
            final_code = starter_code
        else:
            final_code = solution_data['code']
        
        return {
            'code': final_code,
            'language': language,
            'strategy': solution_strategy,
            'thinking_time_seconds': thinking_duration,
            'typing_duration_seconds': getattr(self, '_last_typing_duration', 0),
            'iterations': profile['code_iterations'],
            'ai_skill_level': profile['skill_level'],
            'solution_approach': solution_data['approach'],
            'complexity': solution_data['complexity'],
            'professional_grade': True
        }
    
    async def _analyze_problem_professionally(
        self,
        problem_data: Dict[str, Any],
        difficulty: DuelDifficulty
    ) -> Dict[str, Any]:
        """🧠 Analyze problem like a professional developer"""
        
        title = problem_data.get('title', '').lower()
        description = problem_data.get('description', '').lower()
        
        # Identify problem category and strategy
        if any(word in title + description for word in ['array', 'list', 'maximum', 'minimum', 'sum']):
            category = 'array_operations'
        elif any(word in title + description for word in ['math', 'sqrt', 'calculation', 'formula']):
            category = 'mathematical'
        elif any(word in title + description for word in ['string', 'palindrome', 'character', 'text']):
            category = 'string_processing'
        elif any(word in title + description for word in ['tree', 'graph', 'node', 'path']):
            category = 'data_structures'
        else:
            category = 'array_operations'  # Default
        
        strategies = self.solution_strategies[category]
        chosen_strategy = random.choice(strategies)
        
        return {
            'category': category,
            'strategy': chosen_strategy,
            'confidence_level': random.uniform(0.7, 0.95),
            'estimated_complexity': self._estimate_solution_complexity(difficulty)
        }
    
    def _estimate_solution_complexity(self, difficulty: DuelDifficulty) -> Dict[str, str]:
        """⚡ Estimate solution complexity based on difficulty"""
        complexity_map = {
            DuelDifficulty.EASY: {"time": "O(n)", "space": "O(1)"},
            DuelDifficulty.MEDIUM: {"time": "O(n log n)", "space": "O(n)"},
            DuelDifficulty.HARD: {"time": "O(n²)", "space": "O(n)"},
            DuelDifficulty.EXPERT: {"time": "O(n²)", "space": "O(n)"}
        }
        return complexity_map[difficulty]
    
    async def _generate_professional_solution(
        self,
        problem_data: Dict[str, Any],
        language: str,
        difficulty: DuelDifficulty,
        strategy: Dict[str, Any]
    ) -> Dict[str, Any]:
        """🚀 Generate professional-quality solution"""
        
        # Try AI generation if available
        if self.client:
            try:
                ai_solution = await self._generate_ai_solution(problem_data, language, difficulty, strategy)
                if ai_solution:
                    return ai_solution
            except Exception as e:
                print(f"⚠️ AI solution failed: {e}, using professional templates")
        
        # Use professional template solutions
        return self._get_professional_template_solution(problem_data, language, difficulty, strategy)
    
    async def _generate_ai_solution(
        self,
        problem_data: Dict[str, Any],
        language: str,
        difficulty: DuelDifficulty,
        strategy: Dict[str, Any]
    ) -> Optional[Dict[str, Any]]:
        """🤖 Generate solution using AI with professional prompting"""
        
        # Extract problem details
        title = problem_data.get('title', 'Coding Problem')
        description = problem_data.get('description', '')
        constraints = problem_data.get('constraints', '')
        
        # Get function signature if available
        func_signature = problem_data.get('function_signature', {})
        func_name = func_signature.get('name', 'solution')
        
        # Format test cases
        test_cases = problem_data.get('test_cases', [])
        visible_tests = [tc for tc in test_cases if not tc.get('is_hidden', True)][:2]
        
        test_examples = ""
        for i, tc in enumerate(visible_tests):
            test_examples += f"Example {i+1}:\nInput: {tc.get('input')}\nOutput: {tc.get('expected')}\n\n"
        
        # 🎯 Professional AI prompt
        prompt = f"""You are a {self.professional_profiles[difficulty]['skill_level']} solving this {difficulty.value} problem:

**Problem:** {title}

**Description:**
{description}

**Constraints:**
{constraints}

**Examples:**
{test_examples}

**Strategy:** Use {strategy['strategy']} approach for {strategy['category']} problems.

Generate a COMPLETE, WORKING solution in {language}:
1. Use function name: {func_name}
2. Include proper error handling
3. Optimize for {strategy.get('estimated_complexity', {}).get('time', 'O(n)')} time complexity
4. Add concise comments explaining key logic
5. Handle edge cases properly

**CRITICAL:** Return ONLY the function code. No explanations, no markdown, no extra text.
Make sure the code works with ANY valid function name and integrates with universal test runner.
"""
        
        try:
            response = await self.client.chat.completions.create(
                model="gpt-4-turbo-preview",
                messages=[
                    {
                        "role": "system",
                        "content": f"You are an expert {language} developer. Generate clean, efficient, well-commented code that solves problems correctly. Always return only the function code without any markdown or explanations."
                    },
                    {
                        "role": "user",
                        "content": prompt
                    }
                ],
                max_tokens=1500,
                temperature=0.3  # Lower temperature for more consistent code
            )
            
            code = response.choices[0].message.content.strip()
            
            # Clean up the response
            code = self._clean_ai_generated_code(code, language)
            
            # Extract approach and complexity
            approach = f"Using {strategy['strategy']} strategy for {strategy['category']} problem"
            complexity = strategy.get('estimated_complexity', {"time": "O(n)", "space": "O(1)"})
            
            return {
                'code': code,
                'approach': approach,
                'complexity': complexity,
                'generation_method': 'professional_ai'
            }
            
        except Exception as e:
            print(f"❌ Professional AI generation error: {e}")
            return None
    
    def _clean_ai_generated_code(self, code: str, language: str) -> str:
        """🧹 Clean up AI-generated code"""
        
        # Remove markdown code blocks
        code = re.sub(r'```\w*\n?', '', code)
        code = re.sub(r'```', '', code)
        
        # Remove extra explanations
        lines = code.split('\n')
        cleaned_lines = []
        
        for line in lines:
            # Skip lines that look like explanations
            if not any(explanation_word in line.lower() for explanation_word in [
                'explanation:', 'this function', 'the algorithm', 'here\'s how'
            ]):
                cleaned_lines.append(line)
        
        code = '\n'.join(cleaned_lines).strip()
        
        # Ensure proper function structure
        if language == 'python' and not code.startswith('def ') and not code.startswith('import'):
            # If it doesn't start with def, try to extract function
            for line in code.split('\n'):
                if line.strip().startswith('def '):
                    start_idx = code.find(line)
                    code = code[start_idx:]
                    break
        
        return code
    
    def _get_professional_template_solution(
        self,
        problem_data: Dict[str, Any],
        language: str,
        difficulty: DuelDifficulty,
        strategy: Dict[str, Any]
    ) -> Dict[str, Any]:
        """🏗️ Get professional template solution"""
        
        title = problem_data.get('title', '').lower()
        
        # Extract function name from problem signature or derive from title
        func_signature = problem_data.get('function_signature', {})
        func_name = func_signature.get('name', self._derive_function_name(title))
        
        if language == 'python':
            solution_code = self._generate_python_solution(title, func_name, difficulty, strategy)
        elif language == 'javascript':
            solution_code = self._generate_javascript_solution(title, func_name, difficulty, strategy)
        else:
            solution_code = f"def {func_name}(*args):\n    # TODO: Implement solution\n    pass"
        
        approach = f"Professional {strategy['strategy']} implementation for {strategy['category']} problem"
        complexity = strategy.get('estimated_complexity', {"time": "O(n)", "space": "O(1)"})
        
        return {
            'code': solution_code,
            'approach': approach,
            'complexity': complexity,
            'generation_method': 'professional_template'
        }
    
    def _derive_function_name(self, title: str) -> str:
        """🏷️ Derive appropriate function name from problem title"""
        # Clean title and make snake_case
        clean_title = re.sub(r'[^a-zA-Z0-9\s]', '', title.lower())
        words = clean_title.split()
        
        # Map common patterns to function names
        if any(word in words for word in ['find', 'search']):
            return '_'.join(['find'] + [w for w in words if w not in ['find', 'search']][:2])
        elif any(word in words for word in ['count', 'number']):
            return '_'.join(['count'] + [w for w in words if w not in ['count', 'number']][:2])
        elif any(word in words for word in ['sum', 'total']):
            return '_'.join([w for w in words if w not in ['the', 'of', 'a', 'an']][:3])
        elif any(word in words for word in ['max', 'maximum']):
            return '_'.join(['find_max'] + [w for w in words if w not in ['find', 'max', 'maximum']][:1])
        else:
            # Take first 2-3 meaningful words
            meaningful_words = [w for w in words if w not in ['the', 'a', 'an', 'is', 'are', 'of']]
            return '_'.join(meaningful_words[:3]) if meaningful_words else 'solution'
    
    def _generate_python_solution(
        self,
        title: str,
        func_name: str,
        difficulty: DuelDifficulty,
        strategy: Dict[str, Any]
    ) -> str:
        """🐍 Generate Python solution based on problem patterns"""
        
        # 🚫 REMOVED ALL COMPLETE SOLUTIONS - AI SHOULD NOT GIVE READY ANSWERS!
        # ИИ должен показывать только подходы и частичные решения для честной игры
        
        if 'max' in title and ('element' in title or 'number' in title):
            return f"""def {func_name}(arr):
    \"\"\"Find maximum element in array\"\"\"
    if not arr:
        return None
    
    # TODO: Iterate through array and track maximum
    # Hint: Compare each element with current max
    pass"""
        
        elif 'square root sum' in title or ('sqrt' in title and 'sum' in title):
            return f"""import math

def {func_name}(n):
    \"\"\"Calculate sum of square roots from 1 to n\"\"\"
    if n <= 0:
        return 0
    
    # TODO: Loop from 1 to n and sum math.sqrt(i)
    # Hint: Use a running total
    pass"""
        
        elif 'merge' in title and ('array' in title or 'sorted' in title):
            return f"""def {func_name}(arr1, arr2):
    \"\"\"Merge two sorted arrays\"\"\"
    result = []
    i, j = 0, 0
    
    # TODO: Use two pointers to merge arrays
    # Hint: Compare arr1[i] and arr2[j], add smaller one
    # Don't forget remaining elements!
    
    return result"""
        
        elif 'intersection' in title and 'count' in title:
            return f"""def {func_name}(arr1, arr2):
    \"\"\"Count common elements between two arrays\"\"\"
    if not arr1 or not arr2:
        return 0
    
    # TODO: Convert to sets and find intersection
    # Hint: Use set operations or nested loops
    pass"""
        
        elif 'two sum' in title:
            return f"""def {func_name}(nums, target):
    \"\"\"Find two numbers that add up to target\"\"\"
    # TODO: Use hash map for O(n) solution
    # Hint: Store seen numbers and their indices
    # Check if (target - current_number) exists
    pass"""
        
        elif 'palindrome' in title:
            return f"""def {func_name}(s):
    \"\"\"Check if string is a palindrome\"\"\"
    # TODO: Clean string and compare with reverse
    # Hint: Use string slicing s[::-1]
    # Consider only alphanumeric characters
    pass"""
        
        else:
            # 🔧 Generic template - return partial/incomplete solution for fair competition
            print(f"🤖 Generating partial solution for: {title}")
            if difficulty == DuelDifficulty.EASY:
                return f"""def {func_name}(*args):
    \"\"\"Professional solution for {title}\"\"\"
    # TODO: Implement simple iteration approach
    pass"""
            else:
                return f"""def {func_name}(*args):
    \"\"\"Professional solution for {title}\"\"\"
    # TODO: Implement {strategy['strategy']} approach
    # Strategy: {strategy['category']} problem
    pass"""
    
    def _generate_javascript_solution(
        self,
        title: str,
        func_name: str,
        difficulty: DuelDifficulty,
        strategy: Dict[str, Any]
    ) -> str:
        """🟨 Generate JavaScript solution"""
        
        # Convert snake_case to camelCase for JS
        camel_func_name = self._to_camel_case(func_name)
        
        if 'max' in title and ('element' in title or 'number' in title):
            return f"""function {camel_func_name}(arr) {{
    // Find maximum element in array
    if (arr.length === 0) return null;
    
    let maxVal = arr[0];
    for (let i = 1; i < arr.length; i++) {{
        if (arr[i] > maxVal) {{
            maxVal = arr[i];
        }}
    }}
    
    return maxVal;
}}"""
        
        elif 'square root sum' in title:
            return f"""function {camel_func_name}(n) {{
    // Calculate sum of square roots from 1 to n
    if (n <= 0) return 0;
    
    let total = 0.0;
    for (let i = 1; i <= n; i++) {{
        total += Math.sqrt(i);
    }}
    
    return Math.round(total);
}}"""
        
        else:
            return f"""function {camel_func_name}(...args) {{
    // Professional solution for {title}
    // TODO: Implement solution
    return null;
}}"""
    
    def _to_camel_case(self, snake_str: str) -> str:
        """🐫 Convert snake_case to camelCase"""
        components = snake_str.split('_')
        return components[0] + ''.join(x.capitalize() for x in components[1:])
    
    async def _simulate_professional_coding(
        self,
        target_code: str,
        profile: Dict[str, Any],
        websocket_callback=None,
        user_id: Optional[UUID] = None
    ) -> str:
        """⌨️ Simulate professional coding behavior with realistic delays"""
        
        start_time = time.time()
        
        # 🎯 AI behavior profile based on difficulty 
        thinking_delays = {
            DuelDifficulty.EASY: (15, 45),      # 15-45 seconds thinking
            DuelDifficulty.MEDIUM: (30, 90),    # 30-90 seconds  
            DuelDifficulty.HARD: (60, 180),     # 1-3 minutes
            DuelDifficulty.EXPERT: (120, 300)   # 2-5 minutes
        }
        
        # Determine difficulty from profile
        difficulty_key = DuelDifficulty.MEDIUM  # Default
        for diff, prof in self.professional_profiles.items():
            if prof['skill_level'] == profile['skill_level']:
                difficulty_key = diff
                break
        
        thinking_min, thinking_max = thinking_delays[difficulty_key]
        total_thinking_time = random.uniform(thinking_min, thinking_max)
        
        print(f"🤖 AI will think for {total_thinking_time:.1f} seconds before solving")
        
        # Calculate realistic typing speed (slower for more realistic feel)
        chars_per_second = profile['typing_speed_wpm'] * 5 / 60 / 3  # Much slower
        base_delay = 1.0 / chars_per_second
        
        current_code = ""
        
        # Phase 1: Initial thinking and analysis
        print(f"🧠 AI analyzing problem...")
        await asyncio.sleep(total_thinking_time * 0.3)  # 30% of thinking time
        
        # Phase 2: Start typing gradually
        print(f"⌨️ AI starts coding...")
        target_length = len(target_code)
        
        # Break the solution into realistic chunks
        code_chunks = self._break_code_into_chunks(target_code)
        
        for i, chunk in enumerate(code_chunks):
            # Add chunk to current code
            current_code += chunk
            
            # Send update
            if websocket_callback:
                await websocket_callback('code_update', {
                    'user_id': str(user_id),
                    'code': current_code,
                    'language': 'python'
                })
            
            # Pause between chunks (realistic thinking time)
            if i < len(code_chunks) - 1:  # Don't pause after last chunk
                chunk_pause = random.uniform(2, 8)  # 2-8 seconds between chunks
                print(f"🤖 AI pausing to think ({chunk_pause:.1f}s)...")
                await asyncio.sleep(chunk_pause)
        
        # Phase 3: Final review and small adjustments
        print(f"🔍 AI reviewing solution...")
        await asyncio.sleep(random.uniform(5, 15))  # 5-15 seconds final review
        
        # Final update to ensure complete code
        if websocket_callback:
            await websocket_callback('code_update', {
                'user_id': str(user_id),
                'code': target_code,
                'language': 'python'
            })
        
        # Phase 4: Wait before testing (realistic behavior)
        test_delay = random.uniform(3, 8)
        print(f"🧪 AI will test solution in {test_delay:.1f} seconds...")
        await asyncio.sleep(test_delay)
        
        # Note: AI doesn't automatically submit - just shows the code
        # The player still has time to compete
        
        self._last_typing_duration = time.time() - start_time
        print(f"✅ AI simulation completed in {self._last_typing_duration:.2f}s (total: {self._last_typing_duration/60:.1f} minutes)")
        return target_code
    
    def _break_code_into_chunks(self, code: str) -> List[str]:
        """Break code into realistic typing chunks"""
        lines = code.split('\n')
        chunks = []
        current_chunk = ""
        
        for line in lines:
            current_chunk += line + '\n'
            
            # Create chunk break points at logical places
            if (line.strip().endswith(':') or       # After function def, if, for, etc.
                line.strip().endswith('"""') or     # After docstrings
                line.strip() == '' or               # After blank lines
                len(current_chunk) > 100):          # Every ~100 chars
                
                chunks.append(current_chunk)
                current_chunk = ""
        
        # Add any remaining code
        if current_chunk.strip():
            chunks.append(current_chunk)
            
        return [chunk for chunk in chunks if chunk.strip()]
    
    def get_professional_ai_username(self, difficulty: DuelDifficulty) -> str:
        """🎭 Generate professional AI username"""
        
        usernames_by_skill = {
            DuelDifficulty.EASY: [
                "CodeLearner_AI", "Junior_Bot", "DevCadet_AI", "Algorithm_Apprentice", "Code_Explorer"
            ],
            DuelDifficulty.MEDIUM: [
                "CodeCraft_AI", "Logic_Engineer", "Dev_Specialist", "Algorithm_Builder", "Code_Architect"
            ],
            DuelDifficulty.HARD: [
                "Senior_CodeBot", "Algorithm_Expert", "Dev_Veteran", "Code_Optimizer", "Logic_Master"
            ],
            DuelDifficulty.EXPERT: [
                "CodeGuru_AI", "Algorithm_Sage", "Dev_Legend", "Code_Virtuoso", "Logic_Grandmaster"
            ]
        }
        
        return random.choice(usernames_by_skill[difficulty])
    
    def calculate_professional_rating(self, difficulty: DuelDifficulty) -> int:
        """📊 Calculate professional AI rating"""
        
        # More realistic rating distribution
        rating_ranges = {
            DuelDifficulty.EASY: (750, 1200),      # Junior developer range
            DuelDifficulty.MEDIUM: (1100, 1500),   # Mid-level developer range
            DuelDifficulty.HARD: (1400, 1800),     # Senior developer range
            DuelDifficulty.EXPERT: (1700, 2200)    # Expert/architect range
        }
        
        min_rating, max_rating = rating_ranges[difficulty]
        
        # Use normal distribution for more realistic ratings
        mean = (min_rating + max_rating) / 2
        std_dev = (max_rating - min_rating) / 6
        
        rating = int(random.gauss(mean, std_dev))
        return max(min_rating, min(max_rating, rating))
    
    # Legacy compatibility methods
    async def solve_problem_and_simulate_typing(self, *args, **kwargs):
        """Legacy compatibility wrapper"""
        return await self.solve_problem_professionally(*args, **kwargs)
    
    async def solve_problem_async(self, *args, **kwargs):
        """Legacy compatibility wrapper"""
        return await self.solve_problem_professionally(*args, **kwargs)


# Create global professional AI opponent instance
ai_opponent = ProfessionalAIOpponent() 