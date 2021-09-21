import { createDom, updateDom } from './dom';
import { FIBER_EFFECT_TAG } from './constants';

let currentRoot = null;
let wipRoot = null;
let nextUnitOfWork = null;
let deletions = null;

export function render(element, container) {
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
