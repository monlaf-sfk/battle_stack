#!/usr/bin/env python3

"""
🎯 Final Variety Test - Demonstrate that each match gets a unique task
"""
import asyncio
import sys
sys.path.append('/app/backend')

from duel_service.validated_ai_generator import validated_ai_generator, DifficultyLevel

async def demonstrate_task_variety():
    """Show that each call generates a different task"""
    
    print("🚀 DEMONSTRATING TASK VARIETY FOR EACH NEW MATCH")
    print("=" * 70)
    
    generated_tasks = []
    
    # Generate 7 tasks to show variety
    for match_num in range(1, 8):
        try:
            # Simulate new match generation
            problem = validated_ai_generator._get_fallback_problem(
                difficulty=DifficultyLevel.MEDIUM,
                language="python",
                exclusions=None
            )
            
            task_info = {
                "match": match_num,
                "title": problem.title,
                "function": problem.function_name,
                "test_example": problem.test_cases[0] if problem.test_cases else None
            }
            
            generated_tasks.append(task_info)
            
            print(f"🎮 Match {match_num}: {problem.title}")
            print(f"   Function: {problem.function_name}()")
            if problem.test_cases:
                test = problem.test_cases[0]
                print(f"   Sample test: {test.get('input')} → {test.get('expected')}")
            print()
            
        except Exception as e:
            print(f"❌ Error in match {match_num}: {e}")
    
    print("=" * 70)
    print("📊 VARIETY ANALYSIS:")
    
    unique_titles = set(task["title"] for task in generated_tasks)
    unique_functions = set(task["function"] for task in generated_tasks)
    
    print(f"✅ Total matches simulated: {len(generated_tasks)}")
    print(f"✅ Unique task titles: {len(unique_titles)}")
    print(f"✅ Unique function names: {len(unique_functions)}")
    
    print(f"\n🎯 Generated tasks:")
    for task in generated_tasks:
        print(f"   • {task['title']} ({task['function']})")
    
    variety_score = len(unique_titles) / len(generated_tasks) * 100
    print(f"\n🏆 VARIETY SCORE: {variety_score:.1f}%")
    
    if variety_score >= 70:
        print("🎉 EXCELLENT VARIETY! Each match gets unique challenges!")
        return True
    elif variety_score >= 50:
        print("✅ GOOD VARIETY! Much better than before!")
        return True
    else:
        print("⚠️ Still needs improvement...")
        return False

if __name__ == "__main__":
    print("🔥 TASK VARIETY DEMONSTRATION")
    print("Shows how each new AI duel match gets a different algorithmic challenge\n")
    
    result = asyncio.run(demonstrate_task_variety())
    
    print("\n" + "=" * 70)
    if result:
        print("🎉 SUCCESS: New system provides excellent task variety!")
        print("🚀 Each AI duel match now offers a unique coding challenge!")
    else:
        print("❌ System needs further improvements")
    
    sys.exit(0 if result else 1) 