import Modifier from "./modifier";

var modifiers = [];
modifiers.push(
	new Modifier("watch", {
		setup(...paths) {
			for (let path of paths) {
				this.watch(path);
			}
		},
		read(value) {
			return value;
		},
	}),
);

modifiers.push(
	new Modifier("get", {
		setup(prop) {
			this._path.push(prop);
		},
		read(value) {
			return value;
		},
	}),
);

modifiers.push(
	new Modifier("args", {
		read(value, ...args) {
			this.fnArgs = args;
			return value;
		},
	}),
);
modifiers.push(
	new Modifier("call", {
		read(value, ...args) {
			this.fnArgs = args;
			return value(...this.fnArgs);
		},
	}),
);

modifiers.push(
	new Modifier("not", {
		read(value) {
			return !value;
		},
	}),
);

modifiers.push(
	new Modifier("is", {
		read(a, b) {
			return a == b;
		},
	}),
);

export default modifiers;
