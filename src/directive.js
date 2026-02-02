import Binding from "./binding";
import vouivre from "./vouivre";

export default class Directive {
	name;
	callbacks;
	bindings;

	constructor(name = "", callbacks = {}) {
		this.name = name.split("-");
		this.callbacks = callbacks;
		this.bindings = [];

		this.name.unshift(vouivre.prefix);
		if (this.name[this.name.length - 1] == "*") {
			this.name.pop();
			this.wildcard = true;
		}
	}

	bind(elements, model) {
		let bindings = this.createBindings(elements, model);

		for (let binding of bindings) {
			if ("bind" in this.callbacks) {
				this.callbacks.bind.call(binding, binding.element, binding.getValue());
			}
			this.update(binding);
		}
	}

	unbind(context) {
		for (let i = this.bindings.length - 1; i >= 0; i--) {
			let binding = this.bindings[i];
			if (context.contains(binding.element)) {
				binding.unbind();
				if (binding.element.__bindings) {
					binding.element.__bindings = undefined;
				}
				this.bindings.splice(i, 1);
			}
		}
	}

	createBindings(elements, model) {
		let newBindings = [];
		for (let element of elements) {
			let attributes = [...element.attributes]; // copy the array because sometimes services can add/remove attributes inbetween
			for (let attr of attributes) {
				if (attr.name == `${vouivre.prefix}-scope`) continue;
				let attrName = attr.name.split("-");
				let name = this.name.slice(); // clone array
				while (name.length > 0 && attrName[0] == name[0]) {
					attrName.shift();
					name.shift();
				}
				if (name.length > 0) continue;
				if (attrName.length > 0 && !this.wildcard) continue;

				let binding = new Binding(
					element,
					this,
					attr.value,
					attrName, // remaining args
					model,
				);
				element.removeAttribute(attr.name);
				this.bindings.push(binding);
				newBindings.push(binding);
			}
		}
		return newBindings;
	}

	update(binding) {
		if ("update" in this.callbacks) {
			this.callbacks.update.call(binding, binding.element, binding.getValue());
		}
	}
}
