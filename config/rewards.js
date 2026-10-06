const configuredUnit = Number.parseInt(process.env.REWARD_POINTS_PER_REDEMPTION_UNIT, 10);

module.exports = {
    pointsPerRedemptionUnit: Number.isSafeInteger(configuredUnit) && configuredUnit > 0
        ? configuredUnit
        : 100,
    maxPointsPerOperation: 1000000
};
