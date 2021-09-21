(function (global, factory) {
	typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports) :
	typeof define === 'function' && define.amd ? define(['exports'], factory) :
	(global = typeof globalThis !== 'undefined' ? globalThis : global || self, factory(global.Didact = {}));
}(this, (function (exports) { 'use strict';

	const FIBER_TYPE = {
		NODE: 1 << 0,
		TEXT: 1 << 1,
		FUNCTION: 1 << 2
	};

	const FIBER_EFFECT_TAG = {
		PLACEMENT: 1 << 0,
		UPDATE: 1 << 1,
		DELETION: 1 << 2
	};

	function createDom(fiber) {
		const dom =
			fiber.type == FIBER_TYPE.TEXT
				? document.createTextNode('')
				: document.createElement(fiber.type);

		updateDom(dom, {}, fiber.props);

		return dom;
	}

	const isEvent = (key) => key.startsWith('on');
	const isProperty = (key) => key !== 'children' && !isEvent(key);
	const isNew = (prev, next) => (key) => prev[key] !== next[key];
	const isGone = (prev, next) => (key) => !(key in next);

	function updateDom(dom, prevProps, nextProps) {
		//Remove old or changed event listeners
		Object.keys(prevProps)
			.filter(isEvent)
			.filter((key) => !(key in nextProps) || isNew(prevProps, nextProps)(key))
			.forEach((name) => {
				const eventType = name.toLowerCase().substring(2);
				dom.removeEventListener(eventType, prevProps[name]);
			});

		// Remove old properties
		Object.keys(prevProps)
			.filter(isProperty)
			.filter(isGone(prevProps, nextProps))
			.forEach((name) => {
				dom[name] = '';
			});

		// Set new or changed properties
		Object.keys(nextProps)
			.filter(isProperty)
			.filter(isNew(prevProps, nextProps))
			.forEach((name) => {
				dom[name] = nextProps[name];
			});

		// Add event listeners
		Object.keys(nextProps)
			.filter(isEvent)
			.filter(isNew(prevProps, nextProps))
			.forEach((name) => {
				const eventType = name.toLowerCase().substring(2);
				dom.addEventListener(eventType, nextProps[name]);
			});
	}

	let currentRoot = null;
	let wipRoot = null;
	let nextUnitOfWork = null;
	let deletions = null;

	function render(element, container) {
		wipRoot = {
			dom: container,
			props: {
				children: [element]
			},
			alternate: currentRoot
		};
		deletions = [];
		nextUnitOfWork = wipRoot;
	}

	requestIdleCallback(workLoop);
	function workLoop(deadline) {
		let shouldYield = false;

		while (nextUnitOfWork && !shouldYield) {
			nextUnitOfWork = performUnitOfWork(nextUnitOfWork);
			shouldYield = deadline.timeRemaining() < 1;
		}

		if (!nextUnitOfWork && wipRoot) {
			commitRoot();
		}

		requestIdleCallback(workLoop);
	}

	function performUnitOfWork(fiber) {
		if (!fiber.dom) {
			fiber.dom = createDom(fiber);
		}

		const elements = fiber.props.children;
		reconcileChildren(fiber, elements);

	  // 处理子节点
		if (fiber.child) {
			return fiber.child;
		}

	  // todo: 为什么需要这一步？ 
	  // 处理兄弟节点
		let nextFiber = fiber;
		while (nextFiber) {
			if (nextFiber.sibling) {
				return nextFiber.sibling;
			}
			nextFiber = nextFiber.parent;
		}

		return null;
	}

	function reconcileChildren(wipFiber, elements) {
		let index = 0;
		let oldFiber = wipFiber.alternate && wipFiber.alternate.child;
		let prevSibling = null;

		while (index < elements.length || oldFiber != null) {
			const element = elements[index];
			let newFiber = null;

			const sameType = oldFiber && element && element.type == oldFiber.type;

			if (sameType) {
				newFiber = {
					type: oldFiber.type,
					props: element.props,
					dom: oldFiber.dom,
					parent: wipFiber,
					alternate: oldFiber,
					effectTag: FIBER_EFFECT_TAG.UPDATE
				};
			}
			if (element && !sameType) {
				newFiber = {
					type: element.type,
					props: element.props,
					dom: null,
					parent: wipFiber,
					alternate: null,
					effectTag: FIBER_EFFECT_TAG.PLACEMENT
				};
			}
			if (oldFiber && !sameType) {
				oldFiber.effectTag = FIBER_EFFECT_TAG.DELETION;
				deletions.push(oldFiber);
			}

			if (oldFiber) {
				oldFiber = oldFiber.sibling;
			}

			if (index === 0) {
				wipFiber.child = newFiber;
			} else if (element) {
				prevSibling.sibling = newFiber;
			}

			prevSibling = newFiber;
			index++;
		}
	}

	function commitRoot() {
		deletions.forEach(commitWork);
		commitWork(wipRoot.child);
		currentRoot = wipRoot;
		wipRoot = null;
	}

	function commitWork(fiber) {
		if (!fiber) return;

		if (fiber.dom) {
			const domParent = fiber.parent.dom;
			switch (fiber.effectTag) {
				case FIBER_EFFECT_TAG.PLACEMENT:
					domParent.appendChild(fiber.dom);
					break;

				case FIBER_EFFECT_TAG.UPDATE:
					updateDom(fiber.dom, fiber.alternate.props, fiber.props);
					break;

				case FIBER_EFFECT_TAG.DELETION:
					domParent.removeChild(fiber.dom);
					break;
			}
		}

		// todo: delete optimize
		commitWork(fiber.child);
		commitWork(fiber.sibling);
	}

	function createElement(type, props, ...children) {
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

	// debug: demo
	window.onload = () => {
		const todos = ['Finish homeworks'];

		const rerender = () => {
			const node = createElement(
				'div',
				null,

				createElement('input', { id: 'input' }),

				createElement(
					'button',
					{
						style: 'margin-left: 4px;',
						onClick: () => {
							const input = document.querySelector('input');
							if (input && input.value) {
								todos.push(input.value);
								input.value = '';
								rerender();
							}
						}
					},
					'+'
				),

				createElement(
					'ol',
					null,
					...todos.map((todo, index) =>
						createElement(
							'li',
							null,
							todo,
							createElement(
								'span',
								{
									style: 'margin-left: 1em; color: red; cursor: pointer;',
									onClick: () => {
										todos.splice(index, 1);
										rerender();
									}
								},
								'x'
							)
						)
					)
				)
			);

			render(node, document.querySelector('#app'));
		};
		rerender();
	};

	exports.createElement = createElement;
	exports.render = render;

	Object.defineProperty(exports, '__esModule', { value: true });

})));
