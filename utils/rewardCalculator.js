function calculateDonationReward(medicine) {
    const quantity = Number(medicine?.quantity);
    if (!Number.isFinite(quantity) || quantity <= 0) {
        throw new TypeError("A positive medicine quantity is required to calculate reward points.");
    }
    if (quantity <= 10) return 10;
    if (quantity <= 50) return 25;
    return 50;
}

module.exports = { calculateDonationReward };
