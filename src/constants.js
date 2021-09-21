export const FIBER_TYPE = {
	NODE: 1 << 0,
	TEXT: 1 << 1,
	FUNCTION: 1 << 2
};

export const FIBER_EFFECT_TAG = {
	PLACEMENT: 1 << 0,
	UPDATE: 1 << 1,
	DELETION: 1 << 2
};
