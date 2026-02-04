import vouivre from "./vouivre";

export default class Modifier {
	name;
	hooks;
	args;
	binding;

	constructor(modifierName, args, binding) {
		this.name = modifierName;
		const { extra, bind, unbind, read, write } = vouivre.modifiers[modifierName];
		this.hooks = { bind, unbind, read, write };
		this.extra = extra;
		this.args = args.map((arg) => ({
			path: arg,
			type: binding.getPathType(arg),
		}));
		this.binding = binding;
	}

	watchArgs() {
		this.args.filter((arg) => arg.type != "primitive").forEach((arg) => this.binding.watch(arg.path));
	}

	#resolveArgs() {
		return this.args.map((arg) => this.binding.getPathValue(arg.type, arg.path));
	}

	bind() {
		if (this.hooks.bind) {
			this.hooks.bind.call(this, ...this.#resolveArgs());
		}
	}

	unbind() {
		if (this.hooks.unbind) {
			this.hooks.unbind.call(this, ...this.#resolveArgs());
		}
	}

	read(value) {
		if (this.hooks.read) {
			return this.hooks.read.call(this, value, ...this.#resolveArgs());
		}
		return value;
	}

	write(value) {
		if (this.hooks.write) {
			return this.hooks.write.call(this, value, ...this.#resolveArgs());
		}
		return value;
	}
}
