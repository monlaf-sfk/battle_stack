"""
Performance metrics and analytics for code execution.
Similar to LeetCode's performance tracking system.
"""

import time
import psutil
import asyncio
from typing import Dict, Any, List, Optional
from dataclasses import dataclass, field
from datetime import datetime, timezone

@dataclass
class PerformanceMetrics:
    """Performance metrics for code execution"""
    execution_time: float = 0.0  # in seconds
    memory_usage: int = 0  # in KB
    cpu_usage: float = 0.0  # percentage
    test_cases_passed: int = 0
    test_cases_total: int = 0
    language: str = ""
    timestamp: datetime = field(default_factory=lambda: datetime.now(timezone.utc))
    
    @property
    def success_rate(self) -> float:
        """Calculate success rate percentage"""
        if self.test_cases_total == 0:
            return 0.0
        return (self.test_cases_passed / self.test_cases_total) * 100
    
    @property
    def performance_score(self) -> float:
        """Calculate overall performance score (0-100)"""
        # Base score from success rate
        base_score = self.success_rate
        
        # Penalty for slow execution (>2 seconds)
        time_penalty = max(0, (self.execution_time - 2.0) * 10)
        
        # Penalty for high memory usage (>100MB)
        memory_penalty = max(0, (self.memory_usage - 100000) / 10000)
        
        final_score = max(0, base_score - time_penalty - memory_penalty)
        return min(100, final_score)

@dataclass
class LanguageStats:
    """Statistics for a specific programming language"""
    language: str
    total_submissions: int = 0
    successful_submissions: int = 0
    average_execution_time: float = 0.0
    average_memory_usage: int = 0
    fastest_execution: float = float('inf')
    slowest_execution: float = 0.0
    
    @property
    def success_rate(self) -> float:
        if self.total_submissions == 0:
            return 0.0
        return (self.successful_submissions / self.total_submissions) * 100

class PerformanceTracker:
    """
    Tracks and analyzes performance metrics across different languages and problems.
    Provides insights similar to LeetCode's performance analytics.
    """
    
    def __init__(self):
        self.metrics_history: List[PerformanceMetrics] = []
        self.language_stats: Dict[str, LanguageStats] = {}
    
    def record_execution(
        self,
        language: str,
        execution_time: float,
        memory_usage: int,
        test_cases_passed: int,
        test_cases_total: int,
        cpu_usage: float = 0.0
    ) -> PerformanceMetrics:
        """Record a new execution and update statistics"""
        
        metrics = PerformanceMetrics(
            execution_time=execution_time,
            memory_usage=memory_usage,
            cpu_usage=cpu_usage,
            test_cases_passed=test_cases_passed,
            test_cases_total=test_cases_total,
            language=language
        )
        
        self.metrics_history.append(metrics)
        self._update_language_stats(metrics)
        
        return metrics
    
    def _update_language_stats(self, metrics: PerformanceMetrics):
        """Update language-specific statistics"""
        lang = metrics.language.lower()
        
        if lang not in self.language_stats:
            self.language_stats[lang] = LanguageStats(language=lang)
        
        stats = self.language_stats[lang]
        stats.total_submissions += 1
        
        if metrics.test_cases_passed == metrics.test_cases_total:
            stats.successful_submissions += 1
        
        # Update execution time statistics
        stats.average_execution_time = (
            (stats.average_execution_time * (stats.total_submissions - 1) + metrics.execution_time)
            / stats.total_submissions
        )
        
        stats.fastest_execution = min(stats.fastest_execution, metrics.execution_time)
        stats.slowest_execution = max(stats.slowest_execution, metrics.execution_time)
        
        # Update memory statistics
        stats.average_memory_usage = (
            (stats.average_memory_usage * (stats.total_submissions - 1) + metrics.memory_usage)
            / stats.total_submissions
        )
    
    def get_language_ranking(self) -> List[Dict[str, Any]]:
        """Get languages ranked by performance"""
        ranking = []
        
        for lang, stats in self.language_stats.items():
            if stats.total_submissions > 0:
                ranking.append({
                    "language": lang,
                    "success_rate": stats.success_rate,
                    "avg_execution_time": stats.average_execution_time,
                    "avg_memory_usage": stats.average_memory_usage,
                    "total_submissions": stats.total_submissions,
                    "fastest_time": stats.fastest_execution if stats.fastest_execution != float('inf') else 0
                })
        
        # Sort by success rate, then by execution time
        ranking.sort(key=lambda x: (-x["success_rate"], x["avg_execution_time"]))
        return ranking
    
    def get_performance_insights(self, language: str = None) -> Dict[str, Any]:
        """Get performance insights and recommendations"""
        if language:
            metrics = [m for m in self.metrics_history if m.language.lower() == language.lower()]
        else:
            metrics = self.metrics_history
        
        if not metrics:
            return {"error": "No metrics available"}
        
        # Calculate insights
        avg_time = sum(m.execution_time for m in metrics) / len(metrics)
        avg_memory = sum(m.memory_usage for m in metrics) / len(metrics)
        success_rate = sum(1 for m in metrics if m.test_cases_passed == m.test_cases_total) / len(metrics) * 100
        
        # Performance categories
        time_category = "Fast" if avg_time < 1.0 else "Medium" if avg_time < 3.0 else "Slow"
        memory_category = "Efficient" if avg_memory < 50000 else "Moderate" if avg_memory < 100000 else "Heavy"
        
        # Recommendations
        recommendations = []
        if avg_time > 2.0:
            recommendations.append("Consider optimizing algorithm complexity")
        if avg_memory > 100000:
            recommendations.append("Consider reducing memory usage")
        if success_rate < 80:
            recommendations.append("Focus on correctness before optimization")
        
        return {
            "total_executions": len(metrics),
            "success_rate": round(success_rate, 2),
            "average_execution_time": round(avg_time, 3),
            "average_memory_usage": round(avg_memory),
            "time_performance": time_category,
            "memory_performance": memory_category,
            "recommendations": recommendations,
            "language_distribution": self._get_language_distribution(metrics)
        }
    
    def _get_language_distribution(self, metrics: List[PerformanceMetrics]) -> Dict[str, int]:
        """Get distribution of languages used"""
        distribution = {}
        for metric in metrics:
            lang = metric.language.lower()
            distribution[lang] = distribution.get(lang, 0) + 1
        return distribution
    
    def get_leaderboard_data(self, limit: int = 10) -> List[Dict[str, Any]]:
        """Get leaderboard data based on performance scores"""
        if not self.metrics_history:
            return []
        
        # Group by language and calculate best performance
        language_best = {}
        for metric in self.metrics_history:
            lang = metric.language.lower()
            score = metric.performance_score
            
            if lang not in language_best or score > language_best[lang]["score"]:
                language_best[lang] = {
                    "language": lang,
                    "score": score,
                    "execution_time": metric.execution_time,
                    "memory_usage": metric.memory_usage,
                    "success_rate": metric.success_rate,
                    "timestamp": metric.timestamp
                }
        
        # Sort by score and return top entries
        leaderboard = list(language_best.values())
        leaderboard.sort(key=lambda x: -x["score"])
        
        return leaderboard[:limit]

# Global performance tracker instance
performance_tracker = PerformanceTracker()