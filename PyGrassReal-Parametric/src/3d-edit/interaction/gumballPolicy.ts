export interface GumballBehavior {
    consume: boolean;
    action: 'transform' | 'ignore';
}

interface PointerLikeEvent {
    button: number;
}

export const shouldHandleGumball = (
    event: PointerLikeEvent,
    activeGumball: boolean
): boolean => {
    return activeGumball && event.button === 0;
};

export const getGumballDragBehavior = (axis: string | null | undefined): GumballBehavior => {
    if (!axis) {
        return {
            consume: false,
            action: 'ignore',
        };
    }

    // TODO: map axis-specific constraints for gumball interactions in Phase 2.
    return {
        consume: true,
        action: 'transform',
    };
};
