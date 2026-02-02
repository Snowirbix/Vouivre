import Directive from "./directive";
import Binding from "./binding";

class Interpolation {
	constructor(element, text, bindings) {
		this.element = element;
		this.text = text;
		this.bindings = bindings;
	}
}
export default class InterpolationDirective extends Directive {
	interpolations;
	regex;

	constructor() {
		super("interpolation");
		this.interpolations = new Map();
		this.xpath = ".//descendant-or-self::*[not(self::script or self::style)][contains(text(), '{')]";
		this.regex = /\{(.+?)\}/g;
	}

	bind(context, model) {
		const result = document.evaluate(this.xpath, context, null, XPathResult.ORDERED_NODE_SNAPSHOT_TYPE, null);

		let elements = [];
		for (let i = 0; i < result.snapshotLength; i++) {
			elements.push(result.snapshotItem(i));
		}

		let interpolations = this.createBindings(elements, model);

		for (let interp of interpolations) {
			for (let binding of interp.bindings) {
				this.update(binding);
			}
		}
	}

	unbind(context) {
		for (let [element, interp] of this.interpolations) {
			if (context.contains(element)) {
				for (let binding of interp.bindings) {
					binding.unbind();
				}
				if (element.__bindings) {
					element.__bindings = undefined;
				}
				this.interpolations.delete(element);
			}
		}
	}

	createBindings(elements, model) {
		for (let element of elements) {
			var text = element.textContent;
			let result;
			let bindings = [];
			while ((result = this.regex.exec(text))) {
				let binding = new Binding(element, this, result[1], [], model);
				bindings.push(binding);
			}
			if (bindings.length > 0) {
				this.interpolations.set(element, new Interpolation(element, text, bindings));
			}
		}
		return elements.map((e) => this.interpolations.get(e));
	}

	update(binding) {
		var interp = this.interpolations.get(binding.element);
		binding.element.textContent = interp.text.replace(this.regex, (match, $1) => {
			var _binding = interp.bindings.find((b) => b.expression === $1);
			return binding == _binding ? _binding.getValue() : _binding.cachedValue;
		});
	}
}
