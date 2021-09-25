import { render } from './render';
import { createElement } from './fiber';

export { render, createElement };

// debug: demo

window.onload = () => {
	const todos = ['Finish homeworks'];

	const Button = () => {
		return createElement(
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
		);
	};

	const rerender = () => {
		const node = createElement(
			'div',
			null,

			createElement('input', { id: 'input' }),

			// function component
			Button(),

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
