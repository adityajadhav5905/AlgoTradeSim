export class StrategyDTO {
  static toResponse(strategy) {
    if (!strategy) return null;
    return {
      strategyId: strategy.strategyId,
      userId: strategy.userId,
      userName: strategy.userName,
      strategyName: strategy.strategyName,
      code: strategy.code,
      createdAt: strategy.createdAt,
      updatedAt: strategy.updatedAt
    };
  }

  static toListResponse(strategies) {
    if (!strategies) return [];
    return strategies.map(s => StrategyDTO.toResponse(s));
  }
}
