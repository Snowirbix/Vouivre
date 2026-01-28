import get from "lodash/get";
import set from "lodash/set";
import toPath from "lodash/toPath";
import vouivre from "./vouivre";

Element.prototype.parents = function (selector) {
	var parents = [];
	var e = this;

	do {
		if (e.matches(selector)) {
			parents.push(e);
		}
	} while ((e = e.parentElement) !== null);

	return parents;
};

export default class Binding {
	element;
	service;
	expression;
	args;
	path;
	// _path (for 'lodash path') is an array of properties
	_path;
	cachedValue;

	modifier;
	modifierArgs;
	model;
	watchlist = [];

	constructor(element, service, expression, args, model, event, lookup) {
		this.element = element;
		this.service = service;
		this.expression = expression;
		this.args = args;
		this.model = model;

		let { path, modifierName, modifierArgs } = this.#processBindingExpression(expression);
		this.path = path;
		this.modifier = vouivre.modifiers.find(({ name }) => name === modifierName);
		this.modifierArgs = modifierArgs;

		this.#getScopeElements();
		this._path = toPath(path);
		let dependency = this.watch(this._path);
		this.context = dependency;

		event.addEventListener("requestUpdate", (event) => {
			const { target, key } = event.detail;
			const staleWatches = new Set();
			let accepted = false;

			for (const watch of this.watchlist) {
				const result = this.#isWatchAffected(watch, target, key, lookup);

				if (!result.affected) continue;

				accepted = true;
				if (result.stale) {
					staleWatches.add(watch);
				}
			}

			if (staleWatches.size > 0) {
				this.watchlist = this.watchlist.filter((w) => !staleWatches.has(w));
				for (const watch of staleWatches) {
					this.watch(watch.path);
				}
			}

			if (accepted) this.service.callback("update", this);
		});

		if (!this.element.__bindings) {
			this.element.__bindings = [];
		}
		this.element.__bindings.push(this);
	}

	#processBindingExpression(expr) {
		if (expr.includes(":")) {
			let [path, modifierExpr] = expr.split(":");
			path = path.trim();
			modifierExpr = modifierExpr.trim();
			let [modifierName, ...modifierArgs] = modifierExpr.split(/\s/);
			return { path, modifierName, modifierArgs };
		} else {
			return { path: expr.trim() };
		}
	}

	#isWatchAffected(watch, target, key, parentLookup) {
		if (watch.dependency === target && watch.path.at(-1) === key) {
			return { affected: true, stale: false };
		}

		// check parent object change
		let node = watch.dependency;
		let pathIndex = watch.path.length - 2;

		while ((node = parentLookup.get(node))) {
			if (node === target && watch.path[pathIndex] === key) {
				return { affected: true, stale: true };
			}
			pathIndex--;
		}

		return { affected: false };
	}

	#getScopeElements() {
		this.scopeElements = this.element.parents(`*[${vouivre.prefix}-scope]`);
	}

	getScopeValues() {
		var values = {};
		for (let e of this.scopeElements) {
			values[e.__scopeName] = e.__context;
		}
		if (this.scopeElements.length > 0) {
			this.#setParentDeep(0, values);
		}
		return values;
	}

	#setParentDeep(i, obj) {
		let e = this.scopeElements[i];
		obj.$index = e.__array.findIndex((v) => v == e.__context);
		if (++i >= this.scopeElements.length) return obj;
		obj.$parent = {};
		return this.#setParentDeep(i, obj.$parent);
	}

	#resolveFromModel(path) {
		path.pop();
		return path.length ? get(this.model, path) : this.model;
	}

	#resolveFromScopes(path) {
		path.pop();
		for (let scopeEl of this.scopeElements) {
			if (path[0] == scopeEl.__scopeName) {
				path.shift();
				return path.length ? get(scopeEl.__context, path) : scopeEl.__context;
			}
		}
	}

	watch(originalPath) {
		const path = [...originalPath];
		const root = path[0];

		if (root.startsWith("$")) {
			let depth = 0;
			while (path[0] == "$parent") {
				depth++;
				path.shift();
			}
			if (path[0] == "$index") {
				let scopeEl = this.scopeElements[depth];
				this.watchlist.push({
					dependency: scopeEl.__array,
					path: [...originalPath, "length"],
				});
				return undefined;
			}
		}
		let dependency;
		if (root in this.model) {
			dependency = this.#resolveFromModel(path);
		} else {
			// didn't resolve the fullpath from scopes for the watch path thing
			// but if the scope is stale this child element will be removed anyway
			dependency = this.#resolveFromScopes(path);
		}

		this.watchlist.push({ dependency, path: originalPath });
		return dependency;
	}

	getValue() {
		let value;
		if (this._path[this._path.length - 1].startsWith("$")) {
			value = get(this.getScopeValues(), this._path);
		} else {
			value = get(this.context, this._path[this._path.length - 1]);
			if (this.modifier) {
				value = this.modifier.read(value, ...this.modifierArgs);
			}
		}
		this.cachedValue = value;
		return value;
	}

	setValue(value) {
		set(this.context, this._path[this._path.length - 1], value);
	}
}
