export const getCardDimensions = () => {
    if (typeof window === 'undefined') return { width: 96, height: 144 };

    const vw = window.innerWidth;
    const vh = window.innerHeight;

    // Logic matching CSS .card-size
    // Width is constrained by 22vw
    const widthByVw = vw * 0.22;

    // Height is constrained by 26vh
    const maxHeight = vh * 0.26;
    // Width derived from max height (Aspect Ratio 1.5)
    const widthByVh = maxHeight / 1.5;

    // The actual width is the smaller of the two constraints
    const width = Math.min(widthByVw, widthByVh);

    return { width, height: width * 1.5 };
};
