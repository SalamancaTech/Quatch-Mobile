export const getCardDimensions = () => {
    if (typeof window === 'undefined') return { width: 96, height: 144 };

    if (window.innerWidth >= 768) {
      return { width: 96, height: 144 };
    }

    // Mobile Logic: 23vw to allow 4 columns (Hand + 3 Table Slots)
    const rawWidth = window.innerWidth * 0.23;
    const width = Math.min(rawWidth, 96); // Cap at desktop size
    return { width, height: width * 1.5 };
};
