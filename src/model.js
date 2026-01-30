import debounce from "lodash/debounce";

function proxify(obj, proxy, lookup) {
	var p = new Proxy(obj, proxy);

	for (let key in obj) {
		if (!obj.hasOwnProperty(key)) {
			continue;
		}
		if (obj[key] instanceof Object && typeof obj[key] !== "function" && obj[key].__isProxy == undefined) {
			obj[key] = proxify(obj[key], proxy, lookup);
			lookup.set(obj[key], p);
		}
	}

	return p;
}

const debouncers = new Map();

function getDebounced(target) {
	if (!debouncers.has(target)) {
		debouncers.set(
			target,
			debounce(
				(event, target, key) => {
					requestUpdate(event, target, key);
					debouncers.delete(target);
				},
				150,
				{ maxWait: 1000 },
			),
		);
	}
	return debouncers.get(target);
}

function getKeyByValue(object, value) {
	return Object.keys(object).find((key) => object[key] === value);
}

function requestUpdate(event, target, key) {
	event.dispatchEvent(
		new CustomEvent("requestUpdate", {
			detail: { target, key },
		}),
	);
}

const setAndMapReactiveFunctions = ["add", "clear", "delete", "set", "getOrInsert", "getOrInsertComputed"];

export function createModel(data) {
	let lookup = new Map(); // obj ref => parent obj ref
	let event = new EventTarget();

	var proxy = {
		get(target, key, receiver) {
			if (key == "__isProxy") return true;
			if (key == "__target") return target;

			// reactify Set and Map
			if (target instanceof Set || target instanceof Map) {
				if (typeof target[key] === "function") {
					return (...args) => {
						let result = target[key].call(target, ...args);
						if (setAndMapReactiveFunctions.includes(key)) {
							let parent = lookup.get(receiver);
							let keyInParent = getKeyByValue(parent, receiver);
							requestUpdate(event, parent, keyInParent);
						}
						return result;
					};
				}
			}

			return Reflect.get(...arguments);
		},
		set(target, key, value, receiver) {
			if (value instanceof Object && typeof value !== "function" && value.__isProxy == undefined) {
				target[key] = proxify(value, proxy, lookup);
				lookup.set(target[key], receiver);
			} else {
				Reflect.set(...arguments);
			}
			// array item moved
			if (target instanceof Array && target.indexOf(value) > -1) {
				getDebounced(receiver)(event, receiver, "length");
				return true;
			}

			requestUpdate(event, receiver, key);
			return true;
		},
		deleteProperty(target, key) {
			if (key in target) {
				Reflect.deleteProperty(...arguments);
				// no receiver in deleteProperty https://github.com/tc39/ecma262/issues/1198
				let receiver;
				for (let [proxy, parent] of lookup) if (proxy.__target == target) receiver = proxy;
				requestUpdate(event, receiver, key);
				return true;
			}
			return false;
		},
	};

	return {
		model: proxify(data, proxy, lookup),
		event,
		lookup,
	};
}
