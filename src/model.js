import debounce from "lodash/debounce";

function proxify(obj, proxy, lookup, proxies) {
	var p = new Proxy(obj, proxy);

	for (let key in obj) {
		if (!obj.hasOwnProperty(key)) {
			continue;
		}
		if (obj[key] instanceof Object && typeof obj[key] !== "function" && obj[key].__isProxy == undefined) {
			const target = obj[key];
			obj[key] = proxify(obj[key], proxy, lookup, proxies);
			lookup.set(obj[key], p);
			proxies.set(target, obj[key]);
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
				(events, target, key) => {
					requestUpdate(events, target, key);
					debouncers.delete(target);
				},
				150,
				{ maxWait: 1000 },
			),
		);
	}
	return debouncers.get(target);
}

function requestUpdate(events, target, key) {
	events.dispatchEvent(
		new CustomEvent("requestUpdate", {
			detail: { target, key },
		}),
	);
}

function getKeyByValue(object, value) {
	return Object.keys(object).find((key) => object[key] === value);
}

const setAndMapReactiveFunctions = ["add", "clear", "delete", "set", "getOrInsert", "getOrInsertComputed"];

export function createModel(data) {
	let events = new EventTarget();
	let lookup = new WeakMap(); // proxy ref => parent proxy ref
	let proxies = new WeakMap(); // obj ref => proxy ref because https://github.com/tc39/ecma262/issues/1198

	var proxy = {
		get(target, key, receiver) {
			if (key == "__isProxy") return true;
			if (key == "__target") return target;
			if (key == "__events") return events;
			if (key == "__lookup") return lookup;

			// reactify Set and Map
			if (target instanceof Set || target instanceof Map) {
				if (typeof target[key] === "function") {
					return (...args) => {
						let result = target[key].call(target, ...args);
						if (setAndMapReactiveFunctions.includes(key)) {
							let parent = lookup.get(receiver);
							let keyInParent = getKeyByValue(parent, receiver);
							requestUpdate(events, parent, keyInParent);
						}
						return result;
					};
				}
			}

			return Reflect.get(...arguments);
		},
		set(target, key, value, receiver) {
			if (value instanceof Object && typeof value !== "function" && value.__isProxy == undefined) {
				target[key] = proxify(value, proxy, lookup, proxies);
				lookup.set(target[key], receiver);
				proxies.set(value, target[key]);
			} else {
				Reflect.set(...arguments);
			}
			// array item moved
			if (target instanceof Array && target.indexOf(value) > -1) {
				getDebounced(receiver)(events, receiver, "length");
				return true;
			}

			requestUpdate(events, receiver, key);
			return true;
		},
		deleteProperty(target, key) {
			if (key in target) {
				Reflect.deleteProperty(...arguments);
				let receiver = proxies.get(target);
				requestUpdate(events, receiver, key);
				return true;
			}
			return false;
		},
	};

	return proxify(data, proxy, lookup, proxies);
}
