export const getCardDimensions = () => {
    if (typeof window === 'undefined') return { width: 96, height: 144 };

    if (window.innerWidth >= 768) {
      return { width: 96, height: 144 };
    }

    // Mobile Logic: 25vw but capped at 120px to prevent huge cards on tablets
    const rawWidth = window.innerWidth * 0.25;
    const width = Math.min(rawWidth, 120);
    return { width, height: width * 1.5 };
};
