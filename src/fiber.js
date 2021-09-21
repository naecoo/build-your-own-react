import { FIBER_TYPE } from './constants';

export function createElement(type, props, ...children) {
	return {
		type,
		props: {
			...props,
			children: children.map((child) =>
				typeof child === 'object' ? child : createTextElement(child)
			)
		}
	};
}

function createTextElement(text) {
	return {
		type: FIBER_TYPE.TEXT,
		props: {
			nodeValue: text,
			children: []
		}
	};
}
