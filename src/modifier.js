export default class Modifier {
	constructor(name, callbacks) {
		this.name = name;
		this.callbacks = callbacks;
	}

	setup(binding, ...args) {
		if ("setup" in this.callbacks) {
			this.callbacks.setup.call(binding, ...args);
		}
	}

	read(binding, value, ...args) {
		return this.callbacks.read.call(binding, value, ...args);
	}

	write(binding, value, ...args) {
		return this.callbacks.write.call(binding, value, ...args);
	}
}
