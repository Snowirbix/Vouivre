import Modifier from "./modifier";

var modifiers = [];
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

modifiers.push(
	new Modifier("between", {
		read(value, a, b) {
			return value >= a && value <= b;
		},
	}),
);

modifiers.push(
	new Modifier("percent", {
		read(value, digits = 0) {
			return value.toLocaleString(navigator.language, {
				style: "percent",
				minimumFractionDigits: digits,
				maximumFractionDigits: digits,
			});
		},
	}),
);

modifiers.push(
	new Modifier("time", {
		read(value) {
			return new Date(value).toLocaleTimeString(navigator.language, {
				timeZone: "UTC",
				hour12: false,
				minute: "numeric",
				second: "numeric",
			});
		},
	}),
);

export default modifiers;
