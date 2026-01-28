import Binding from "./binding";
import vouivre, { highlightRefresh } from "./vouivre";

export default class Service {
	name;
	callbacks;
	xpath;
	elements;
	bindings;

	constructor(name = "", callbacks = {}) {
		this.name = name.split("-");
		this.callbacks = callbacks;
		this.bindings = new Map();

		this.name.unshift(vouivre.prefix);
		if (this.name[this.name.length - 1] == "*") {
			this.name.pop();
			this.wildcard = true;
			this.xpath = `.//descendant-or-self::*[@*[starts-with(name(), '${this.name.join("-")}')]]`;
		} else {
			this.xpath = `.//descendant-or-self::*[@${this.name.join("-")}]`;
		}
	}

	search(context) {
		const result = document.evaluate(this.xpath, context, null, XPathResult.ORDERED_NODE_SNAPSHOT_TYPE, null);

		this.elements = [];
		for (let i = 0; i < result.snapshotLength; i++) {
			this.elements.push(result.snapshotItem(i));
		}
	}

	run(context, model, event, lookup) {
		this.search(context);
		let bindings = this.createBindings(model, event, lookup);
		for (let binding of bindings) {
			this.callback("bind", binding);
			this.callback("update", binding);
		}
	}

	clear(context) {
		this.search(context);
		for (let element of this.elements) {
			this.bindings.delete(element);
			if (element.__bindings) {
				element.__bindings = undefined;
			}
		}
	}

	createBindings(model, event, lookup) {
		for (let element of this.elements) {
			for (let attr of element.attributes) {
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
					event,
					lookup,
				);
				this.bindings.set(element, binding);
			}
		}
		return this.elements.map((e) => this.bindings.get(e));
	}

	callback(name, binding) {
		if (name in this.callbacks) {
			this.callbacks[name].call(binding, binding.element, binding.getValue());
			if (vouivre.debug) {
				highlightRefresh(binding.element);
			}
		}
	}
}
