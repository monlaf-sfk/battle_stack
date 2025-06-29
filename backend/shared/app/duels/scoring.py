from datetime import datetime, timezone

class ScoringService:
    BASE_SCORE: int = 1000
    MAX_TIME_BONUS: int = 500
    DUEL_DURATION_SECONDS: int = 300  # 5 minutes
    SUBMISSION_PENALTY: int = 25
    FIRST_SOLVE_BONUS: int = 150

    def calculate_score(
        self,
        start_time: datetime,
        finish_time: datetime,
        submission_count: int,
        was_first_to_solve: bool,
    ) -> tuple[int, float]:
        """
        Calculates the final score for a player.

        Returns:
            A tuple containing the final score and the time taken in seconds.
        """
        if not start_time.tzinfo:
            start_time = start_time.replace(tzinfo=timezone.utc)
        if not finish_time.tzinfo:
            finish_time = finish_time.replace(tzinfo=timezone.utc)

        time_taken_seconds = (finish_time - start_time).total_seconds()

        # Time bonus decreases linearly from max to 0 over the duel duration
        time_bonus_ratio = max(0, (self.DUEL_DURATION_SECONDS - time_taken_seconds) / self.DUEL_DURATION_SECONDS)
        time_bonus = int(self.MAX_TIME_BONUS * time_bonus_ratio)

        # Penalty for each submission
        penalty = self.SUBMISSION_PENALTY * (submission_count - 1) if submission_count > 0 else 0

        # Bonus for being the first to solve
        first_bonus = self.FIRST_SOLVE_BONUS if was_first_to_solve else 0

        # Calculate final score
        final_score = self.BASE_SCORE + time_bonus - penalty + first_bonus
        
        return max(0, final_score), time_taken_seconds


# Create a singleton instance
scoring_service = ScoringService() 