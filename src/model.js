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

export function createModel(data) {
	let lookup = new Map(); // obj ref => parent obj ref
	let event = new EventTarget();

	var proxy = {
		get(target, key) {
			if (key == "__isProxy") return true;

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
				return true;
			}
			event.dispatchEvent(
				new CustomEvent("requestUpdate", {
					detail: {
						target: receiver,
						key,
					},
				}),
			);
			return true;
		},
		deleteProperty(target, key, receiver) {
			if (key in target) {
				Reflect.deleteProperty(...arguments);
				event.dispatchEvent(
					new CustomEvent("requestUpdate", {
						detail: { target: receiver, key },
					}),
				);
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
