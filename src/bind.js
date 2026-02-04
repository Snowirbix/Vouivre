import Binding from "./binding";
import vouivre from "./vouivre";

const bindings = {};

export function bind(elements, model) {
	const directives = Object.entries(vouivre.directives)
		.map(([name, body]) => ({ name, ...body }))
		.toSorted((a, b) => (b.priority ?? 1) - (a.priority ?? 1));

	for (let { name, ...hooks } of directives) {
		if (!(name in bindings)) {
			bindings[name] = [];
		}
		let n = `${vouivre.prefix}-${name}`;
		const wildcard = n.endsWith("*");
		if (wildcard) n = n.slice(0, -1);

		const newBindings = [];
		for (let element of elements) {
			const attributes = [...element.attributes]; // copy the array because attributes are modified in the loop
			for (const attr of attributes) {
				if (attr.name == `${vouivre.prefix}-scope`) continue;
				let args = [];
				if (wildcard) {
					if (!attr.name.startsWith(n)) {
						continue;
					}
					args = attr.name.slice(n.length).split("-");
				} else if (attr.name != n) {
					continue;
				}

				const binding = new Binding(element, attr.value, model, hooks, args);

				element.removeAttribute(attr.name);
				bindings[name].push(binding);
				newBindings.push(binding);
			}
		}

		for (let binding of newBindings) {
			binding.bind();
			binding.update();
		}
	}
}

export function unbind(context) {
	for (const name in vouivre.directives) {
		if (!(name in bindings)) continue;
		for (let i = bindings[name].length - 1; i >= 0; i--) {
			let binding = bindings[name][i];
			if (context.contains(binding.element)) {
				binding.unbind();
				if (binding.element.__bindings) {
					binding.element.__bindings = undefined;
				}
				bindings[name].splice(i, 1);
			}
		}
	}
}
