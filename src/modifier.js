export default class Modifier {
	constructor(name, callbacks) {
		this.name = name;
		this.callbacks = callbacks;
	}

	read(value, ...args) {
		return this.callbacks.read.call(this, value, ...args);
	}

	write(value, ...args) {
		return this.callbacks.write.call(this, value, ...args);
	}
}
