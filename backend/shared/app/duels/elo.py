K_FACTOR = 32

def get_expected_score(player_rating: int, opponent_rating: int) -> float:
    """
    Calculate the expected score of a player against an opponent.
    """
    return 1 / (1 + 10 ** ((opponent_rating - player_rating) / 400))

def update_elo_ratings(winner_rating: int, loser_rating: int) -> tuple[int, int]:
    """
    Update ELO ratings for a winner and a loser.
    """
    expected_winner_score = get_expected_score(winner_rating, loser_rating)
    expected_loser_score = get_expected_score(loser_rating, winner_rating)

    new_winner_rating = round(winner_rating + K_FACTOR * (1 - expected_winner_score))
    new_loser_rating = round(loser_rating + K_FACTOR * (0 - expected_loser_score))
    
    return new_winner_rating, new_loser_rating 