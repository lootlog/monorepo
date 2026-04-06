export interface MatchSummary {
  shop_id: number;
  small_reward_tpl: number;
  big_reward_tpl: number;
  huge_reward_tpl: number;
  opponent_prof: string;
  opponent_icon: string;
  opponent_lvl: number;
  opponent_oplvl: number;
  opponent_rating: number;
  status: number;
  placement_cur: number;
  placement_max: number;
  rating: number;
  result: number;
  rating_delta: number;
  points_gained: number;
  difficulty_rank: number;
  daily_stage: {
    id: number;
    points_cur: number;
    points_max: number;
    points_step: number;
    rewards_last: number;
    rewards_cur: number;
    rewards_max: number;
  };
}
