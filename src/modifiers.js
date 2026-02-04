var modifiers = {
	watch: {
		bind(...paths) {
			for (let path of paths) {
				this.binding.watch(path);
			}
		},
		read(value) {
			return value;
		},
	},
	get: {
		bind(prop) {
			this.binding._path.push(prop);
		},
		read(value) {
			return value;
		},
	},
	args: {
		read(value, ...args) {
			this.binding.fnArgs = args;
			return value;
		},
	},
	call: {
		read(value, ...args) {
			this.binding.fnArgs = args;
			return value(...this.fnArgs);
		},
	},
	not: {
		read(value) {
			return !value;
		},
		write(value) {
			return !value;
		},
	},
	is: {
		read(a, b) {
			return a == b;
		},
		write(a, b) {
			return a == b;
		},
	},
};

export default modifiers;
