export class UserDTO {
  static toResponse(user) {
    if (!user) return null;
    return {
      userId: user.userId,
      name: user.name,
      createdAt: user.createdAt
    };
  }

  static toStatsResponse(stats) {
    if (!stats) return null;
    return {
      totalStrategies: stats.totalStrategies,
      totalBacktests: stats.totalBacktests,
      bestReturn: stats.bestReturn,
      avgReturn: stats.avgReturn,
      rank: stats.rank,
      recentBacktests: stats.recentBacktests
    };
  }
}
